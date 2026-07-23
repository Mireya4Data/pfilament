'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  Plus, 
  Shield, 
  Search, 
  UserPlus, 
  Trash, 
  Check, 
  X, 
  ShieldAlert, 
  Copy, 
  Sparkles,
  KeyRound,
  CheckCircle2,
  Share2,
  LogOut
} from 'lucide-react';
import Link from 'next/link';

interface Team {
  id: string;
  team_code: string;
  name: string;
  description: string | null;
  department_id: string | null;
  leader_id: string;
  departments?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface TeamMember {
  id: string;
  team_id: string;
  student_id: string;
  team_role: 'team_leader' | 'backend_developer' | 'frontend_developer' | 'ui_ux_designer' | 'database_engineer' | 'tester' | 'documentation_lead';
  status: 'invited' | 'requested' | 'accepted' | 'rejected' | 'removed';
  profiles: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
}

interface Invitation {
  id: string;
  team_id: string;
  status: string;
  teams: {
    name: string;
    team_code: string;
    profiles: {
      full_name: string;
    } | null;
  };
}

function generateRandomTeamCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'TM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function TeamsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  
  // Teams lists
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [joinedTeams, setJoinedTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([]);

  // Active Action Modal / Panel ('none' | 'create' | 'join')
  const [activeModal, setActiveModal] = useState<'none' | 'create' | 'join'>('none');

  // Creation form states
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  
  // Newly Created Team Banner Info
  const [createdTeamInfo, setCreatedTeamInfo] = useState<{ name: string; code: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Manual Join Form State
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Search/Invitation states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; email: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);

  // General loading & feedback
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isLeaderOfSelected = selectedTeam && profile && selectedTeam.leader_id === profile.id;

  // Handle URL query parameters e.g., ?join=TM-8X39F2 or ?action=create
  useEffect(() => {
    const urlJoinCode = searchParams.get('join');
    const urlAction = searchParams.get('action');

    if (urlJoinCode) {
      setJoinCodeInput(urlJoinCode.toUpperCase());
      setActiveModal('join');
    } else if (urlAction === 'create') {
      setActiveModal('create');
    } else if (urlAction === 'join') {
      setActiveModal('join');
    }
  }, [searchParams]);

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.push('/login');
      return;
    }
    
    if (profile.role !== 'student') {
      setLoading(false);
      return;
    }

    loadDepartments();
    loadTeamsAndInvitations();
  }, [profile, authLoading]);

  // Load selected team members
  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id);
    } else {
      setSelectedTeamMembers([]);
    }
  }, [selectedTeam]);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      if (data) {
        setDepartments(data);
        if (data.length > 0) setDepartmentId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error loading departments:', err.message);
    }
  };

  const loadTeamsAndInvitations = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Teams led by me
      const { data: led, error: ledErr } = await supabase
        .from('teams')
        .select('*, departments:department_id(name), profiles:leader_id(full_name, email)')
        .eq('leader_id', profile.id);
      if (ledErr) throw ledErr;
      setMyTeams(led || []);

      if (led && led.length > 0 && !selectedTeam) {
        setSelectedTeam(led[0]);
      }

      // 2. Teams joined by me (accepted membership, not leader)
      const { data: members, error: memErr } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('student_id', profile.id)
        .eq('status', 'accepted');
      if (memErr) throw memErr;

      const joinedIds = (members || []).map((m) => m.team_id);
      
      if (joinedIds.length > 0) {
        const { data: joined, error: joinedErr } = await supabase
          .from('teams')
          .select('*, departments:department_id(name), profiles:leader_id(full_name, email)')
          .in('id', joinedIds)
          .neq('leader_id', profile.id);
        if (joinedErr) throw joinedErr;
        setJoinedTeams(joined || []);
      } else {
        setJoinedTeams([]);
      }

      // 3. Incoming invitations
      const { data: invites, error: inviteErr } = await supabase
        .from('team_members')
        .select(`
          id, team_id, status,
          teams:team_id (
            name, team_code,
            profiles:leader_id (
              full_name
            )
          )
        `)
        .eq('student_id', profile.id)
        .eq('status', 'invited');
      if (inviteErr) throw inviteErr;
      setInvitations((invites as any) || []);

    } catch (err: any) {
      setActionError(err.message || 'Failed to load teams data');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id, team_id, student_id, team_role, status,
          profiles:student_id (
            id, full_name, email, username
          )
        `)
        .eq('team_id', teamId);
      if (error) throw error;
      setSelectedTeamMembers((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching members:', err.message);
    }
  };

  // 1. Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const generatedCode = generateRandomTeamCode();

      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          team_code: generatedCode,
          description: description || null,
          department_id: departmentId || null,
          leader_id: profile.id
        })
        .select();

      if (teamErr) throw teamErr;
      if (!teamData || teamData.length === 0) throw new Error('Team creation failed');

      const newTeam = teamData[0];

      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          student_id: profile.id,
          team_role: 'team_leader',
          status: 'accepted',
          invited_by: profile.id
        });

      if (memberErr) throw memberErr;

      setCreatedTeamInfo({
        name: newTeam.name,
        code: generatedCode
      });

      setActionSuccess(`Team "${newTeam.name}" created successfully! Unique Team ID: ${generatedCode}`);
      setActiveModal('none');
      setTeamName('');
      setDescription('');
      
      await loadTeamsAndInvitations();
      setSelectedTeam(newTeam);
    } catch (err: any) {
      setActionError(err.message || 'Could not create team');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Join Team Manually by Inputting Team ID / Code
  const handleJoinTeamByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !joinCodeInput.trim()) return;

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    const formattedCode = joinCodeInput.trim().toUpperCase();

    try {
      const { data: teamData, error: findErr } = await supabase
        .from('teams')
        .select('id, name, leader_id')
        .eq('team_code', formattedCode)
        .single();

      if (findErr || !teamData) {
        throw new Error(`No team found matching Team ID "${formattedCode}". Please check the ID and try again.`);
      }

      if (teamData.leader_id === profile.id) {
        throw new Error('You are already the creator and leader of this team!');
      }

      const { error: joinErr } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          student_id: profile.id,
          team_role: 'backend_developer',
          status: 'accepted',
          invited_by: teamData.leader_id
        });

      if (joinErr) {
        if (joinErr.code === '23505') {
          throw new Error('You are already a member or have a pending request/invite for this team.');
        }
        throw joinErr;
      }

      setActionSuccess(`Successfully joined team "${teamData.name}"!`);
      setActiveModal('none');
      setJoinCodeInput('');
      await loadTeamsAndInvitations();
      setSelectedTeam(teamData as any);

    } catch (err: any) {
      if (err.message && err.message.includes('Student already belongs to another team with an active project')) {
        setActionError('Constraint Error: You already belong to another active team project.');
      } else {
        setActionError(err.message || 'Could not join team');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Copy helpers
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyInviteLink = (code: string) => {
    const link = `${window.location.origin}/teams?join=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleInviteAction = async (inviteeId: string) => {
    if (!selectedTeam || !profile) return;
    setActionError('');
    setActionSuccess('');

    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: selectedTeam.id,
          student_id: inviteeId,
          team_role: 'backend_developer',
          status: 'invited',
          invited_by: profile.id
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This student is already a member or has a pending invite for this team.');
        }
        throw error;
      }

      setActionSuccess('Invitation sent successfully!');
      loadTeamMembers(selectedTeam.id);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      setActionError(err.message || 'Failed to send invitation');
    }
  };

  const handleRespondToInvite = async (inviteId: string, status: 'accepted' | 'rejected') => {
    setActionError('');
    setActionSuccess('');

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          status,
          responded_at: new Date().toISOString()
        })
        .eq('id', inviteId);

      if (error) throw error;

      setActionSuccess(`Invitation ${status === 'accepted' ? 'accepted' : 'declined'}!`);
      await loadTeamsAndInvitations();
    } catch (err: any) {
      setActionError(err.message || 'Failed to process invitation action');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: typeof selectedTeamMembers[0]['team_role']) => {
    setActionError('');
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ team_role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      if (selectedTeam) loadTeamMembers(selectedTeam.id);
      setActionSuccess('Member role updated!');
    } catch (err: any) {
      setActionError(err.message || 'Failed to update role');
    }
  };

  // Requirement 2: Leader Removing a Team Member & Cascading member's team projects
  const handleRemoveMember = async (memberRecordId: string, studentId: string, memberName: string) => {
    if (!selectedTeam) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from "${selectedTeam.name}"? Any team projects created by this member for this team will be cascaded.`)) return;

    setActionError('');
    setActionSuccess('');

    try {
      // 1. Delete team_members record
      const { error: delMemberErr } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberRecordId);

      if (delMemberErr) throw delMemberErr;

      // 2. Requirement 3 Cascade: Delete team projects created by this student for this team
      const { error: cascadeErr } = await supabase
        .from('projects')
        .delete()
        .eq('team_id', selectedTeam.id)
        .eq('owner_id', studentId);

      if (cascadeErr) {
        console.warn('Note on cascading member projects:', cascadeErr.message);
      }

      loadTeamMembers(selectedTeam.id);
      setActionSuccess(`Member ${memberName} removed from team. Their associated team projects have been cascaded.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove member');
    }
  };

  // Requirement 3: Member Exiting/Leaving a Team & Cascading their team project details
  const handleLeaveTeam = async () => {
    if (!selectedTeam || !profile) return;
    if (!confirm(`Are you sure you want to exit team "${selectedTeam.name}"? Any project details you created linked to this team will be cascaded.`)) return;

    setActionError('');
    setActionSuccess('');
    setActionLoading(true);

    try {
      // 1. Delete user's team_members record
      const { error: leaveErr } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', selectedTeam.id)
        .eq('student_id', profile.id);

      if (leaveErr) throw leaveErr;

      // 2. Requirement 3 Cascade: Delete any project details created by this user linked to this team
      const { error: cascadeErr } = await supabase
        .from('projects')
        .delete()
        .eq('team_id', selectedTeam.id)
        .eq('owner_id', profile.id);

      if (cascadeErr) {
        console.warn('Note on project cascade deletion on leave:', cascadeErr.message);
      }

      const teamNameLeft = selectedTeam.name;
      setSelectedTeam(null);
      await loadTeamsAndInvitations();

      setActionSuccess(`You have successfully exited team "${teamNameLeft}". Your linked team project details have been cascaded.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to leave team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setActionError('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .eq('role', 'student')
        .neq('id', profile?.id)
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(6);

      if (error) throw error;
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        setActionError('No students found matching that query');
      }
    } catch (err: any) {
      setActionError(err.message || 'Search execution failed');
    } finally {
      setSearching(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-4 text-xs text-[#8b949e] font-semibold uppercase tracking-wider">Loading Teams Directory...</span>
      </div>
    );
  }

  if (profile && profile.role !== 'student') {
    return (
      <div className="max-w-xl mx-auto glass-panel p-8 text-center my-12 rounded-xl">
        <ShieldAlert className="h-10 w-10 text-[#8b949e] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Lecturer View</h3>
        <p className="text-[#8b949e] text-xs mb-6 leading-relaxed">
          Faculty members do not create or join student teams. You can review all project workspaces directly on the Explore showcase feed.
        </p>
        <Link href="/" className="glass-button text-xs font-semibold">
          Explore Showcase Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header Bar with SEPARATE Create Team and Join Team Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#58a6ff] mb-1">
            <Users className="h-3.5 w-3.5" />
            <span>Organization Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Teams Directory</h1>
          <p className="text-[#8b949e] text-xs mt-1">
            Create your engineering team, generate unique Team IDs, or join existing team workspaces.
          </p>
        </div>

        {/* Separate Create & Join Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setActiveModal(activeModal === 'join' ? 'none' : 'join')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg border transition cursor-pointer flex items-center space-x-1.5 ${
              activeModal === 'join' 
                ? 'bg-[#a371f7]/20 border-[#a371f7] text-[#a371f7]' 
                : 'glass-button-secondary'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5 text-[#a371f7]" />
            <span>Join Team</span>
          </button>

          <button
            onClick={() => setActiveModal(activeModal === 'create' ? 'none' : 'create')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg border transition cursor-pointer flex items-center space-x-1.5 ${
              activeModal === 'create' 
                ? 'bg-[#238636]/30 border-[#3fb950] text-[#3fb950]' 
                : 'glass-button'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="p-4 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-[#f85149] hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="text-[#3fb950] hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Generated Team ID Card Banner */}
      {createdTeamInfo && (
        <div className="glass-panel p-6 rounded-xl border-[#58a6ff]/40 bg-[#58a6ff]/5 animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-[#58a6ff]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Team Created: <span className="text-[#58a6ff]">{createdTeamInfo.name}</span>
              </h2>
            </div>
            <button 
              onClick={() => setCreatedTeamInfo(null)}
              className="text-[#8b949e] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-[#8b949e]">
            Your team has been initialized! Below is your system-generated <strong className="text-white">Unique Team ID</strong>. Share this code or the invite link with teammates so they can join.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="flex items-center space-x-3 px-4 py-2.5 rounded-lg bg-[#0d1117] border border-[#58a6ff]/30 w-full sm:w-auto">
              <KeyRound className="h-4 w-4 text-[#58a6ff]" />
              <span className="font-mono text-base font-extrabold tracking-widest text-[#58a6ff]">
                {createdTeamInfo.code}
              </span>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => handleCopyCode(createdTeamInfo.code)}
                className="glass-button-accent text-xs py-2 px-3 flex-1 sm:flex-initial"
              >
                {copiedCode ? <CheckCircle2 className="h-3.5 w-3.5 text-[#3fb950]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Team ID'}</span>
              </button>

              <button
                onClick={() => handleCopyInviteLink(createdTeamInfo.code)}
                className="glass-button-secondary text-xs py-2 px-3 flex-1 sm:flex-initial"
              >
                {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5 text-[#3fb950]" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {activeModal === 'create' && (
        <div className="glass-panel p-6 sm:p-8 rounded-xl animate-fade-in border-[#3fb950]/30">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Plus className="h-4 w-4 text-[#3fb950]" />
              <span>Create New Engineering Team</span>
            </h2>
            <button 
              onClick={() => setActiveModal('none')}
              className="text-[#8b949e] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreateTeam} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen AI Labs"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">
                  Academic Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full glass-input bg-[#0d1117] cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">
                  Team Overview / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of team domain, research focus, or target project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#161b22] border border-white/5 text-[11px] text-[#8b949e] flex items-center space-x-2">
              <KeyRound className="h-4 w-4 text-[#58a6ff] shrink-0" />
              <span>
                <strong>System Note:</strong> Your Team ID will be randomly and uniquely generated by the system upon creation. You will be able to copy and share it with your teammates immediately.
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="glass-button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="glass-button text-xs"
              >
                {actionLoading ? 'Creating Team...' : 'Create Team & Generate ID'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* JOIN TEAM MODAL */}
      {activeModal === 'join' && (
        <div className="glass-panel p-6 sm:p-8 rounded-xl animate-fade-in border-[#a371f7]/30">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <KeyRound className="h-4 w-4 text-[#a371f7]" />
              <span>Join Existing Team by Team ID</span>
            </h2>
            <button 
              onClick={() => setActiveModal('none')}
              className="text-[#8b949e] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleJoinTeamByCode} className="space-y-6 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">
                Enter Team ID / Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TM-8X39F2"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full glass-input font-mono uppercase tracking-widest text-base"
              />
              <p className="text-[11px] text-[#8b949e] mt-1.5">
                Ask your team leader for the 8-character Team ID sent when they created the workspace.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="glass-button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !joinCodeInput.trim()}
                className="glass-button-accent text-xs"
              >
                {actionLoading ? 'Verifying Code...' : 'Join Team'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
            Team Invitations ({invitations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitations.map((invite) => (
              <div key={invite.id} className="github-card flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-sm">{invite.teams?.name}</h3>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Team ID: <span className="font-mono text-white">{invite.teams?.team_code}</span> &bull; By {invite.teams?.profiles?.full_name || 'Leader'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRespondToInvite(invite.id, 'accepted')}
                    className="p-2 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white transition cursor-pointer"
                    title="Accept Invitation"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRespondToInvite(invite.id, 'rejected')}
                    className="p-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition cursor-pointer"
                    title="Decline Invitation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Teams Sidebar & Selected Team Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Teams Navigation */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Teams I Lead */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center justify-between">
              <span>Teams I Lead</span>
              <span className="badge-github">{myTeams.length}</span>
            </h2>

            {myTeams.length === 0 ? (
              <div className="glass-panel p-4 text-center text-xs text-[#8b949e]">
                No teams created yet.
              </div>
            ) : (
              <div className="space-y-2">
                {myTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-3.5 rounded-lg transition duration-200 cursor-pointer border ${
                      selectedTeam?.id === team.id
                        ? 'bg-[#161b22] border-[#58a6ff] text-white shadow-md'
                        : 'glass-panel hover:border-white/20 text-[#c9d1d9]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm line-clamp-1">{team.name}</span>
                      <Shield className={`h-3.5 w-3.5 ${selectedTeam?.id === team.id ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`} />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-[#8b949e]">
                      <span>{team.team_code}</span>
                      <span className="uppercase">{team.departments?.name || 'General'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Joined Teams */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center justify-between">
              <span>Joined Teams</span>
              <span className="badge-purple">{joinedTeams.length}</span>
            </h2>

            {joinedTeams.length === 0 ? (
              <div className="glass-panel p-4 text-center text-xs text-[#8b949e]">
                Not a member of other teams.
              </div>
            ) : (
              <div className="space-y-2">
                {joinedTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-3.5 rounded-lg transition duration-200 cursor-pointer border ${
                      selectedTeam?.id === team.id
                        ? 'bg-[#161b22] border-[#a371f7] text-white shadow-md'
                        : 'glass-panel hover:border-white/20 text-[#c9d1d9]'
                    }`}
                  >
                    <span className="font-bold text-sm block line-clamp-1">{team.name}</span>
                    <span className="text-[10px] text-[#8b949e] block mt-1">
                      Leader: {team.profiles?.full_name} &bull; <span className="font-mono text-white">{team.team_code}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Team Details & Roster */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="glass-panel p-6 sm:p-8 rounded-xl space-y-6">
              
              {/* Team Header */}
              <div className="border-b border-white/10 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="badge-github font-mono text-xs px-2.5 py-1">
                    Team ID: {selectedTeam.team_code}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyCode(selectedTeam.team_code)}
                      className="glass-button-secondary text-[11px] py-1 px-2.5"
                      title="Copy Team ID"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                    </button>

                    <button
                      onClick={() => handleCopyInviteLink(selectedTeam.team_code)}
                      className="glass-button-secondary text-[11px] py-1 px-2.5"
                      title="Copy Invite Link"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>{copiedLink ? 'Copied' : 'Invite Link'}</span>
                    </button>

                    {/* Requirement 3: Exit / Leave Team Button for non-leaders */}
                    {!isLeaderOfSelected && profile && (
                      <button
                        onClick={handleLeaveTeam}
                        disabled={actionLoading}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#f85149]/15 border border-[#f85149]/30 text-[#f85149] hover:bg-[#f85149]/30 transition cursor-pointer flex items-center space-x-1"
                        title="Exit / Leave Team"
                      >
                        <LogOut className="h-3 w-3" />
                        <span>Exit Team</span>
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-extrabold text-white mt-3">{selectedTeam.name}</h2>
                <p className="text-[#8b949e] text-xs mt-1">{selectedTeam.description || 'No description provided for this team workspace.'}</p>
                
                <div className="text-[11px] text-[#8b949e] mt-3 flex items-center space-x-4">
                  <span>Department: <strong className="text-white">{selectedTeam.departments?.name || 'General'}</strong></span>
                  <span>Created By: <strong className="text-[#58a6ff]">{selectedTeam.profiles?.full_name}</strong></span>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Team Roster ({selectedTeamMembers.length})</span>
                </h3>

                <div className="divide-y divide-white/5">
                  {selectedTeamMembers.map((member) => {
                    const isSelf = profile && member.student_id === profile.id;
                    const isMemLeader = member.team_role === 'team_leader';

                    return (
                      <div key={member.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">
                              {member.profiles.full_name} {isSelf && '(You)'}
                            </span>
                            <span className="text-[10px] text-[#8b949e]">
                              @{member.profiles.username}
                            </span>
                          </div>
                          <span className="text-[11px] block text-[#8b949e]">{member.profiles.email}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Requirement 2: Leader Removing Team Members */}
                          {isLeaderOfSelected && !isMemLeader ? (
                            <>
                              {member.status === 'requested' ? (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleRespondToInvite(member.id, 'accepted')}
                                    className="p-1 rounded bg-[#238636] text-white transition cursor-pointer"
                                    title="Accept Request"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleRespondToInvite(member.id, 'rejected')}
                                    className="p-1 rounded bg-[#21262d] text-[#8b949e] hover:text-white transition cursor-pointer"
                                    title="Reject Request"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={member.team_role}
                                    onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                                    className="py-1 px-2 text-[10px] font-semibold border border-white/10 rounded bg-[#0d1117] text-[#c9d1d9] focus:outline-none cursor-pointer"
                                  >
                                    <option value="backend_developer">Backend Developer</option>
                                    <option value="frontend_developer">Frontend Developer</option>
                                    <option value="ui_ux_designer">UI/UX Designer</option>
                                    <option value="database_engineer">Database Engineer</option>
                                    <option value="tester">Tester</option>
                                    <option value="documentation_lead">Documentation Lead</option>
                                  </select>
                                  
                                  {/* Remove member button for leader */}
                                  <button
                                    onClick={() => handleRemoveMember(member.id, member.student_id, member.profiles.full_name)}
                                    className="p-1.5 rounded bg-[#21262d] border border-white/5 hover:border-[#f85149] hover:text-[#f85149] transition text-[#8b949e] cursor-pointer flex items-center space-x-1"
                                    title="Remove from Team & Cascade Projects"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#161b22] border border-white/10 text-[#8b949e]">
                              {member.team_role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leader Inviting Other Students */}
              {isLeaderOfSelected && (
                <div className="border-t border-white/10 pt-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
                    <UserPlus className="h-4 w-4 text-[#58a6ff]" />
                    <span>Invite Teammates by Name or Email</span>
                  </h3>
                  
                  <form onSubmit={handleSearchStudents} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search student full name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-grow glass-input text-xs"
                    />
                    <button
                      type="submit"
                      disabled={searching}
                      className="glass-button text-xs flex items-center space-x-1.5 px-4 cursor-pointer shrink-0"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>{searching ? 'Searching...' : 'Search'}</span>
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="glass-panel p-2 rounded-lg divide-y divide-white/5 animate-fade-in">
                      {searchResults.map((userResult) => (
                        <div key={userResult.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white">{userResult.full_name}</div>
                            <div className="text-[10px] text-[#8b949e]">@{userResult.username} &bull; {userResult.email}</div>
                          </div>
                          <button
                            onClick={() => handleInviteAction(userResult.id)}
                            className="glass-button-accent text-[10px] py-1 px-3"
                          >
                            Send Invite
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center rounded-xl flex flex-col items-center justify-center min-h-[300px]">
              <Users className="h-10 w-10 text-[#8b949e] mb-3" />
              <h3 className="text-white font-bold text-sm">No Team Selected</h3>
              <p className="text-[#8b949e] text-xs mt-1 max-w-sm">
                Select a team workspace from the left list to view members, copy Team IDs, and assign developer roles.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <TeamsContent />
    </Suspense>
  );
}
