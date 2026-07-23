-- ========================================================
-- SHOWCASE PLATFORM - SUPABASE DATABASE MIGRATION SCRIPT
-- ========================================================
-- Copy and run this script in the Supabase SQL Editor to update schema
-- constraints, team code uniqueness, and cascading constraints.

-- 1. Ensure team_code column exists on teams table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' AND column_name = 'team_code'
    ) THEN
        ALTER TABLE teams ADD COLUMN team_code TEXT;
    END IF;
END $$;

-- 2. Add Unique constraint on teams(team_code) if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'teams_team_code_key' 
        AND table_name = 'teams'
    ) THEN
        ALTER TABLE teams ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);
    END IF;
END $$;

-- 3. Create index on teams(team_code) for fast lookup when joining teams
CREATE INDEX IF NOT EXISTS idx_teams_team_code ON teams(team_code);

-- 4. Create helper trigger function to auto-generate team_code if omitted on insert
CREATE OR REPLACE FUNCTION generate_unique_team_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
        LOOP
            -- Generate code in format TM-XXXXXX (6 random uppercase alphanumeric characters)
            new_code := 'TM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
            SELECT EXISTS (SELECT 1 FROM teams WHERE team_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        NEW.team_code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach auto-generation trigger to teams table BEFORE INSERT
DROP TRIGGER IF EXISTS trigger_auto_team_code ON teams;
CREATE TRIGGER trigger_auto_team_code
BEFORE INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION generate_unique_team_code();

-- 6. Indexes for team membership and project lookups
CREATE INDEX IF NOT EXISTS idx_team_members_student_id ON team_members(student_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- 7. Helper function to cascade project details when a member exits or is removed from a team
CREATE OR REPLACE FUNCTION cascade_member_team_projects(p_team_id UUID, p_student_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete all projects linked to p_team_id created by p_student_id
    DELETE FROM projects 
    WHERE team_id = p_team_id 
      AND owner_id = p_student_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN teams.team_code IS 'Unique auto-generated system code used to invite and join teams';
