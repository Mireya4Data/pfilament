'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, Plus, Shield, Search, UserPlus, Trash, Check, X, ShieldAlert, 
  Copy, Sparkles, KeyRound, CheckCircle2, Share2, LogOut
} from 'lucide-react';
import Link from 'next/link';

interface Team {
  id: string; team_code: string; name: string; description: string | null;
  department_id: string | null; leader_id: string;
  departments?: { name: string; } | null;
  profiles?: { full_name: string; email: string; } | null;
}

interface TeamMember {
  id: string; team_id: string; student_id: string;
  team_role: 'team_leader' | 'backend_developer' | 'frontend_developer' | 'ui_ux_designer' | 'database_engineer' | 'tester' | 'documentation_lead';
  status: 'invited' | 'requested' | 'accepted' | 'rejected' | 'removed';
  profiles: { id: string; full_name: string; email: string; username: string; };
}

interface Invitation {
  id: string; team_id: string; status: string;
  teams: { name: string; team_code: string; profiles: { full_name: string; } | null; };
}

function generateRandomTeamCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'TM-';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function TeamsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [joinedTeams, setJoinedTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([]);

  const [activeModal, setActiveModal] = useState<'none' | 'create' | 'join'>('none');
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  
  const [createdTeamInfo, setCreatedTeamInfo] = useState<{ name: string; code: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; email: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isLeaderOfSelected = selectedTeam && profile && selectedTeam.leader_id === profile.id;

  useEffect(() => {
    const urlJoinCode = searchParams.get('join');
    const urlAction = searchParams.get('action');
    if (urlJoinCode) { setJoinCodeInput(urlJoinCode.toUpperCase()); setActiveModal('join'); }
    else if (urlAction === 'create') setActiveModal('create');
    else if (urlAction === 'join') setActiveModal('join');
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { router.push('/login'); return; }
    if (profile.role !== 'student') { setLoading(false); return; }
    loadDepartments(); loadTeamsAndInvitations();
  }, [profile, authLoading]);

  useEffect(() => {
    if (selectedTeam) loadTeamMembers(selectedTeam.id);
    else setSelectedTeamMembers([]);
  }, [selectedTeam]);

  const loadDepartments = async () => {
    try {
      const { data } = await supabase.from('departments').select('id, name').order('name', { ascending: true });
      if (data) { setDepartments(data); if (data.length > 0) setDepartmentId(data[0].id); }
    } catch (err: any) { console.error('Error loading departments:', err.message); }
  };

  const loadTeamsAndInvitations = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: led, error: ledErr } = await supabase.from('teams').select('*, departments:department_id(name), profiles:leader_id(full_name, email)').eq('leader_id', profile.id);
      if (ledErr) throw ledErr;
      setMyTeams(led || []);
      if (led && led.length > 0 && !selectedTeam) setSelectedTeam(led[0]);

      const { data: members, error: memErr } = await supabase.from('team_members').select('team_id').eq('student_id', profile.id).eq('status', 'accepted');
      if (memErr) throw memErr;
      const joinedIds = (members || []).map((m) => m.team_id);
      
      if (joinedIds.length > 0) {
        const { data: joined, error: joinedErr } = await supabase.from('teams').select('*, departments:department_id(name), profiles:leader_id(full_name, email)').in('id', joinedIds).neq('leader_id', profile.id);
        if (joinedErr) throw joinedErr;
        setJoinedTeams(joined || []);
      } else { setJoinedTeams([]); }

      const { data: invites, error: inviteErr } = await supabase.from('team_members').select('id, team_id, status, teams:team_id (name, team_code, profiles:leader_id (full_name))').eq('student_id', profile.id).eq('status', 'invited');
      if (inviteErr) throw inviteErr;
      setInvitations((invites as any) || []);
    } catch (err: any) { setActionError(err.message || 'Failed to load teams data'); } finally { setLoading(false); }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data } = await supabase.from('team_members').select('id, team_id, student_id, team_role, status, profiles:student_id (id, full_name, email, username)').eq('team_id', teamId);
      if (data) setSelectedTeamMembers((data as any) || []);
    } catch (err: any) { console.error('Error fetching members:', err.message); }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setActionLoading(true); setActionError(''); setActionSuccess('');
    try {
      const generatedCode = generateRandomTeamCode();
      const { data: teamData, error: teamErr } = await supabase.from('teams').insert({ name: teamName, team_code: generatedCode, description: description || null, department_id: departmentId || null, leader_id: profile.id }).select();
      if (teamErr) throw teamErr;
      if (!teamData || teamData.length === 0) throw new Error('Team creation failed');
      const newTeam = teamData[0];
      const { error: memberErr } = await supabase.from('team_members').insert({ team_id: newTeam.id, student_id: profile.id, team_role: 'team_leader', status: 'accepted', invited_by: profile.id });
      if (memberErr) throw memberErr;
      
      setCreatedTeamInfo({ name: newTeam.name, code: generatedCode });
      setActionSuccess(`Team "${newTeam.name}" created successfully! Unique Team ID: ${generatedCode}`);
      setActiveModal('none'); setTeamName(''); setDescription('');
      await loadTeamsAndInvitations(); setSelectedTeam(newTeam);
    } catch (err: any) { setActionError(err.message || 'Could not create team'); } finally { setActionLoading(false); }
  };

  const handleJoinTeamByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !joinCodeInput.trim()) return;
    setActionLoading(true); setActionError(''); setActionSuccess('');
    const formattedCode = joinCodeInput.trim().toUpperCase();
    try {
      const { data: teamData, error: findErr } = await supabase.from('teams').select('id, name, leader_id').eq('team_code', formattedCode).single();
      if (findErr || !teamData) throw new Error(`No team found matching Team ID "${formattedCode}". Please check the ID and try again.`);
      if (teamData.leader_id === profile.id) throw new Error('You are already the creator and leader of this team!');
      const { error: joinErr } = await supabase.from('team_members').insert({ team_id: teamData.id, student_id: profile.id, team_role: 'backend_developer', status: 'accepted', invited_by: teamData.leader_id });
      if (joinErr) { if (joinErr.code === '23505') throw new Error('You are already a member or have a pending request/invite for this team.'); throw joinErr; }
      
      setActionSuccess(`Successfully joined team "${teamData.name}"!`);
      setActiveModal('none'); setJoinCodeInput('');
      await loadTeamsAndInvitations(); setSelectedTeam(teamData as any);
    } catch (err: any) {
      if (err.message && err.message.includes('Student already belongs to another team with an active project')) setActionError('Constraint Error: You already belong to another active team project.');
      else setActionError(err.message || 'Could not join team');
    } finally { setActionLoading(false); }
  };

  const handleCopyCode = (code: string) => { navigator.clipboard.writeText(code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2500); };
  const handleCopyInviteLink = (code: string) => { const link = `${window.location.origin}/teams?join=${encodeURIComponent(code)}`; navigator.clipboard.writeText(link); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2500); };

  const handleInviteAction = async (inviteeId: string) => {
    if (!selectedTeam || !profile) return;
    setActionError(''); setActionSuccess('');
    try {
      const { error } = await supabase.from('team_members').insert({ team_id: selectedTeam.id, student_id: inviteeId, team_role: 'backend_developer', status: 'invited', invited_by: profile.id });
      if (error) { if (error.code === '23505') throw new Error('This student is already a member or has a pending invite for this team.'); throw error; }
      setActionSuccess('Invitation sent successfully!');
      loadTeamMembers(selectedTeam.id); setSearchQuery(''); setSearchResults([]);
    } catch (err: any) { setActionError(err.message || 'Failed to send invitation'); }
  };

  const handleRespondToInvite = async (inviteId: string, status: 'accepted' | 'rejected') => {
    setActionError(''); setActionSuccess('');
    try {
      const { error } = await supabase.from('team_members').update({ status, responded_at: new Date().toISOString() }).eq('id', inviteId);
      if (error) throw error;
      setActionSuccess(`Invitation ${status === 'accepted' ? 'accepted' : 'declined'}!`);
      await loadTeamsAndInvitations();
    } catch (err: any) { setActionError(err.message || 'Failed to process invitation action'); }
  };

  const handleRoleChange = async (memberId: string, newRole: typeof selectedTeamMembers[0]['team_role']) => {
    setActionError('');
    try {
      const { error } = await supabase.from('team_members').update({ team_role: newRole }).eq('id', memberId);
      if (error) throw error;
      if (selectedTeam) loadTeamMembers(selectedTeam.id);
      setActionSuccess('Member role updated!');
    } catch (err: any) { setActionError(err.message || 'Failed to update role'); }
  };

  const handleRemoveMember = async (memberRecordId: string, studentId: string, memberName: string) => {
    if (!selectedTeam) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from "${selectedTeam.name}"? Any team projects created by this member for this team will be cascaded.`)) return;
    setActionError(''); setActionSuccess('');
    try {
      const { error: delMemberErr } = await supabase.from('team_members').delete().eq('id', memberRecordId);
      if (delMemberErr) throw delMemberErr;
      const { error: cascadeErr } = await supabase.from('projects').delete().eq('team_id', selectedTeam.id).eq('owner_id', studentId);
      if (cascadeErr) console.warn('Note on cascading member projects:', cascadeErr.message);
      loadTeamMembers(selectedTeam.id);
      setActionSuccess(`Member ${memberName} removed from team. Their associated team projects have been cascaded.`);
    } catch (err: any) { setActionError(err.message || 'Failed to remove member'); }
  };

  const handleLeaveTeam = async () => {
    if (!selectedTeam || !profile) return;
    if (!confirm(`Are you sure you want to exit team "${selectedTeam.name}"? Any project details you created linked to this team will be cascaded.`)) return;
    setActionError(''); setActionSuccess(''); setActionLoading(true);
    try {
      const { error: leaveErr } = await supabase.from('team_members').delete().eq('team_id', selectedTeam.id).eq('student_id', profile.id);
      if (leaveErr) throw leaveErr;
      const { error: cascadeErr } = await supabase.from('projects').delete().eq('team_id', selectedTeam.id).eq('owner_id', profile.id);
      if (cascadeErr) console.warn('Note on project cascade deletion on leave:', cascadeErr.message);
      const teamNameLeft = selectedTeam.name;
      setSelectedTeam(null);
      await loadTeamsAndInvitations();
      setActionSuccess(`You have successfully exited team "${teamNameLeft}". Your linked team project details have been cascaded.`);
    } catch (err: any) { setActionError(err.message || 'Failed to leave team'); } finally { setActionLoading(false); }
  };

  const handleSearchStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true); setActionError('');
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, username').eq('role', 'student').neq('id', profile?.id).or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`).limit(6);
      if (error) throw error;
      setSearchResults(data || []);
      if (!data || data.length === 0) setActionError('No students found matching that query');
    } catch (err: any) { setActionError(err.message || 'Search execution failed'); } finally { setSearching(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4">
        <div className="spinner" />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading Teams Directory...</span>
      </div>
    );
  }

  if (profile && profile.role !== 'student') {
    return (
      <div className="max-w-xl mx-auto glass-panel p-10 text-center my-12 rounded-[24px]">
        <div className="empty-state-icon mx-auto mb-4"><ShieldAlert className="h-6 w-6" /></div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Lecturer View</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Faculty members do not create or join student teams. You can review all project workspaces directly on the Explore showcase feed.</p>
        <Link href="/" className="glass-button text-sm font-semibold">Explore Showcase Projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in pb-16">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 gap-4" style={{ borderColor: 'var(--border-soft)' }}>
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: 'var(--purple-primary)' }}>
            <Users className="h-3.5 w-3.5" />
            <span>Organization Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Teams Directory</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Create your engineering team, generate unique Team IDs, or join existing team workspaces.</p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button onClick={() => setActiveModal(activeModal === 'join' ? 'none' : 'join')} className={activeModal === 'join' ? 'glass-button-secondary bg-[#EDE9FE] border-[#7C3AED] text-[#7C3AED] text-sm px-5 py-2.5 flex items-center space-x-2' : 'glass-button-secondary text-sm px-5 py-2.5 flex items-center space-x-2'} style={activeModal === 'join' ? { background: 'var(--purple-light)', borderColor: 'var(--purple-primary)', color: 'var(--purple-primary)', boxShadow: '0 4px 12px rgba(124,58,237,0.1)' } : {}}>
            <KeyRound className="h-4 w-4" style={{ color: activeModal === 'join' ? 'inherit' : 'var(--purple-primary)' }} />
            <span>{activeModal === 'join' ? 'Close Panel' : 'Join Team'}</span>
          </button>
          <button onClick={() => setActiveModal(activeModal === 'create' ? 'none' : 'create')} className={activeModal === 'create' ? 'glass-button-secondary bg-[#DCFCE7] border-[#16A34A] text-[#16A34A] text-sm px-5 py-2.5 flex items-center space-x-2' : 'glass-button text-sm px-5 py-2.5 flex items-center space-x-2'} style={activeModal === 'create' ? { background: 'var(--green-light)', borderColor: 'var(--green-primary)', color: 'var(--green-primary)', boxShadow: '0 4px 12px rgba(22,163,74,0.1)' } : {}}>
            <Plus className="h-4 w-4" />
            <span>{activeModal === 'create' ? 'Close Form' : 'Create Team'}</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="alert-error animate-fade-in">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')}><X className="h-4 w-4" /></button>
        </div>
      )}
      {actionSuccess && (
        <div className="alert-success animate-fade-in">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Generated Team ID Banner */}
      {createdTeamInfo && (
        <div className="glass-panel p-6 rounded-xl animate-fade-in space-y-4" style={{ borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.04)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" style={{ color: 'var(--blue-primary)' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Team Created: <span style={{ color: 'var(--blue-primary)' }}>{createdTeamInfo.name}</span></h2>
            </div>
            <button onClick={() => setCreatedTeamInfo(null)} className="icon-btn"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Your team has been initialized! Below is your system-generated <strong>Unique Team ID</strong>. Share this code with teammates so they can join.</p>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="flex items-center space-x-3 px-5 py-3 rounded-xl w-full sm:w-auto" style={{ background: 'var(--blue-xlight)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <KeyRound className="h-5 w-5" style={{ color: 'var(--blue-primary)' }} />
              <span className="font-mono text-lg font-extrabold tracking-widest" style={{ color: 'var(--blue-primary)' }}>{createdTeamInfo.code}</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={() => handleCopyCode(createdTeamInfo.code)} className="glass-button-accent text-xs py-2 px-4 flex-1 sm:flex-initial">
                {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Team ID'}</span>
              </button>
              <button onClick={() => handleCopyInviteLink(createdTeamInfo.code)} className="glass-button-secondary text-xs py-2 px-4 flex-1 sm:flex-initial">
                {copiedLink ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {activeModal === 'create' && (
        <div className="glass-panel p-6 sm:p-8 rounded-[20px] animate-scale-in" style={{ borderColor: 'rgba(22,163,74,0.3)' }}>
          <div className="flex items-center justify-between pb-4 border-b mb-6" style={{ borderColor: 'var(--border-soft)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-light)' }}>
                <Plus className="h-4 w-4" style={{ color: 'var(--green-primary)' }} />
              </div>
              Create New Engineering Team
            </h2>
            <button onClick={() => setActiveModal('none')} className="icon-btn"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleCreateTeam} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Team Name *</label>
                <input type="text" required placeholder="e.g. NextGen AI Labs" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="glass-input" />
              </div>
              <div>
                <label className="form-label">Academic Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="glass-input cursor-pointer">
                  {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Team Overview / Description</label>
                <textarea rows={2} placeholder="Brief summary of team domain..." value={description} onChange={(e) => setDescription(e.target.value)} className="glass-input" />
              </div>
            </div>
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--blue-xlight)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <KeyRound className="h-5 w-5 shrink-0" style={{ color: 'var(--blue-primary)' }} />
              <p className="text-xs" style={{ color: 'var(--blue-primary)' }}>
                <strong>System Note:</strong> Your Team ID will be randomly generated upon creation. You will be able to share it immediately.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
              <button type="button" onClick={() => setActiveModal('none')} className="glass-button-secondary text-sm">Cancel</button>
              <button type="submit" disabled={actionLoading} className="glass-button text-sm" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                {actionLoading ? 'Creating Team...' : 'Create Team & Generate ID'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* JOIN TEAM MODAL */}
      {activeModal === 'join' && (
        <div className="glass-panel p-6 sm:p-8 rounded-[20px] animate-scale-in" style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
          <div className="flex items-center justify-between pb-4 border-b mb-6" style={{ borderColor: 'var(--border-soft)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--purple-light)' }}>
                <KeyRound className="h-4 w-4" style={{ color: 'var(--purple-primary)' }} />
              </div>
              Join Existing Team by Team ID
            </h2>
            <button onClick={() => setActiveModal('none')} className="icon-btn"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleJoinTeamByCode} className="space-y-6 max-w-lg">
            <div>
              <label className="form-label">Enter Team ID / Code *</label>
              <input type="text" required placeholder="e.g. TM-8X39F2" value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())} className="glass-input font-mono uppercase tracking-widest text-base py-3" />
              <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>Ask your team leader for the 8-character Team ID sent when they created the workspace.</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
              <button type="button" onClick={() => setActiveModal('none')} className="glass-button-secondary text-sm">Cancel</button>
              <button type="submit" disabled={actionLoading || !joinCodeInput.trim()} className="glass-button text-sm" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                {actionLoading ? 'Verifying Code...' : 'Join Team'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Team Invitations ({invitations.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map((invite) => (
              <div key={invite.id} className="github-card flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>{invite.teams?.name}</h3>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Team ID: <span className="font-mono font-bold">{invite.teams?.team_code}</span> &bull; By {invite.teams?.profiles?.full_name || 'Leader'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRespondToInvite(invite.id, 'accepted')} className="icon-btn" style={{ color: 'var(--green-primary)', borderColor: 'rgba(22,163,74,0.3)', background: 'var(--green-light)' }}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleRespondToInvite(invite.id, 'rejected')} className="icon-btn danger">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Teams Sidebar & Selected Team Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Teams Navigation */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
              <span>Teams I Lead</span>
              <span className="badge-github">{myTeams.length}</span>
            </h2>
            {myTeams.length === 0 ? (
              <div className="glass-panel p-5 text-center rounded-xl text-xs" style={{ color: 'var(--text-placeholder)' }}>No teams created yet.</div>
            ) : (
              <div className="space-y-2">
                {myTeams.map((team) => (
                  <button key={team.id} onClick={() => setSelectedTeam(team)} className="w-full text-left p-4 rounded-xl transition duration-200 border cursor-pointer group"
                    style={{
                      background: selectedTeam?.id === team.id ? 'var(--blue-xlight)' : 'var(--bg-section)',
                      borderColor: selectedTeam?.id === team.id ? 'var(--blue-primary)' : 'var(--border-soft)',
                      boxShadow: selectedTeam?.id === team.id ? '0 4px 12px rgba(37,99,235,0.1)' : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm line-clamp-1" style={{ color: selectedTeam?.id === team.id ? 'var(--blue-primary)' : 'var(--text-primary)' }}>{team.name}</span>
                      <Shield className="h-4 w-4" style={{ color: selectedTeam?.id === team.id ? 'var(--blue-primary)' : 'var(--text-placeholder)' }} />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span>{team.team_code}</span>
                      <span className="uppercase font-sans font-semibold">{team.departments?.name || 'General'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
              <span>Joined Teams</span>
              <span className="badge-purple">{joinedTeams.length}</span>
            </h2>
            {joinedTeams.length === 0 ? (
              <div className="glass-panel p-5 text-center rounded-xl text-xs" style={{ color: 'var(--text-placeholder)' }}>Not a member of other teams.</div>
            ) : (
              <div className="space-y-2">
                {joinedTeams.map((team) => (
                  <button key={team.id} onClick={() => setSelectedTeam(team)} className="w-full text-left p-4 rounded-xl transition duration-200 border cursor-pointer group"
                    style={{
                      background: selectedTeam?.id === team.id ? 'var(--purple-light)' : 'var(--bg-section)',
                      borderColor: selectedTeam?.id === team.id ? 'var(--purple-primary)' : 'var(--border-soft)',
                      boxShadow: selectedTeam?.id === team.id ? '0 4px 12px rgba(124,58,237,0.1)' : 'none'
                    }}
                  >
                    <span className="font-bold text-sm block line-clamp-1" style={{ color: selectedTeam?.id === team.id ? 'var(--purple-primary)' : 'var(--text-primary)' }}>{team.name}</span>
                    <span className="text-[11px] block mt-2" style={{ color: 'var(--text-muted)' }}>
                      Leader: {team.profiles?.full_name} &bull; <span className="font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>{team.team_code}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Team Details & Roster */}
        <div className="lg:col-span-8">
          {selectedTeam ? (
            <div className="glass-panel p-6 sm:p-8 rounded-[20px] space-y-6">
              
              {/* Team Header */}
              <div className="border-b pb-5" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="badge-premium font-mono">Team ID: {selectedTeam.team_code}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCopyCode(selectedTeam.team_code)} className="glass-button-secondary text-[11px] py-1.5 px-3">
                      <Copy className="h-3.5 w-3.5" /> <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                    </button>
                    <button onClick={() => handleCopyInviteLink(selectedTeam.team_code)} className="glass-button-secondary text-[11px] py-1.5 px-3">
                      <Share2 className="h-3.5 w-3.5" /> <span>{copiedLink ? 'Copied' : 'Invite Link'}</span>
                    </button>
                    {!isLeaderOfSelected && profile && (
                      <button onClick={handleLeaveTeam} disabled={actionLoading} className="icon-btn danger px-3 w-auto text-[11px] font-semibold gap-1">
                        <LogOut className="h-3.5 w-3.5" /> <span>Exit Team</span>
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold mt-4" style={{ color: 'var(--text-primary)' }}>{selectedTeam.name}</h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedTeam.description || 'No description provided for this team workspace.'}</p>
                <div className="text-[11px] mt-4 flex flex-wrap items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                  <span className="px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-section)' }}>Department: <strong style={{ color: 'var(--text-primary)' }}>{selectedTeam.departments?.name || 'General'}</strong></span>
                  <span className="px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-section)' }}>Created By: <strong style={{ color: 'var(--blue-primary)' }}>{selectedTeam.profiles?.full_name}</strong></span>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Users className="h-4 w-4" /> <span>Team Roster ({selectedTeamMembers.length})</span>
                </h3>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                  {selectedTeamMembers.map((member, idx) => {
                    const isSelf = profile && member.student_id === profile.id;
                    const isMemLeader = member.team_role === 'team_leader';
                    return (
                      <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-section)', borderBottom: idx !== selectedTeamMembers.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{member.profiles.full_name} {isSelf && <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(You)</span>}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>@{member.profiles.username}</span>
                          </div>
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{member.profiles.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLeaderOfSelected && !isMemLeader ? (
                            <>
                              {member.status === 'requested' ? (
                                <div className="flex gap-1">
                                  <button onClick={() => handleRespondToInvite(member.id, 'accepted')} className="icon-btn" style={{ color: 'var(--green-primary)', borderColor: 'rgba(22,163,74,0.3)' }}><Check className="h-4 w-4" /></button>
                                  <button onClick={() => handleRespondToInvite(member.id, 'rejected')} className="icon-btn danger"><X className="h-4 w-4" /></button>
                                </div>
                              ) : (
                                <>
                                  <select value={member.team_role} onChange={(e) => handleRoleChange(member.id, e.target.value as any)} className="glass-input py-1.5 px-3 text-[11px] font-semibold w-auto">
                                    <option value="backend_developer">Backend Developer</option>
                                    <option value="frontend_developer">Frontend Developer</option>
                                    <option value="ui_ux_designer">UI/UX Designer</option>
                                    <option value="database_engineer">Database Engineer</option>
                                    <option value="tester">Tester</option>
                                    <option value="documentation_lead">Documentation Lead</option>
                                  </select>
                                  <button onClick={() => handleRemoveMember(member.id, member.student_id, member.profiles.full_name)} className="icon-btn danger" title="Remove Member"><Trash className="h-4 w-4" /></button>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold px-3 py-1.5 rounded-lg capitalize" style={{ background: 'var(--bg-section)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
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
                <div className="border-t pt-5 space-y-4" style={{ borderColor: 'var(--border-soft)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <UserPlus className="h-4 w-4" style={{ color: 'var(--blue-primary)' }} />
                    <span>Invite Teammates</span>
                  </h3>
                  <form onSubmit={handleSearchStudents} className="flex flex-col sm:flex-row gap-3">
                    <input type="text" placeholder="Search student name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-grow glass-input text-sm py-2.5" />
                    <button type="submit" disabled={searching} className="glass-button text-sm px-5 w-full sm:w-auto">
                      <Search className="h-4 w-4" /> <span>{searching ? 'Searching...' : 'Search'}</span>
                    </button>
                  </form>
                  {searchResults.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                      {searchResults.map((userResult, idx) => (
                        <div key={userResult.id} className="p-4 flex items-center justify-between" style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-section)', borderBottom: idx !== searchResults.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                          <div>
                            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{userResult.full_name}</div>
                            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>@{userResult.username} &bull; {userResult.email}</div>
                          </div>
                          <button onClick={() => handleInviteAction(userResult.id)} className="glass-button-accent text-xs py-1.5 px-4">Send Invite</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center rounded-[20px] flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-section)', border: '1px solid var(--border-soft)' }}>
                <Users className="h-8 w-8" style={{ color: 'var(--text-placeholder)' }} />
              </div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>No Team Selected</h3>
              <p className="text-sm mt-2 max-w-sm" style={{ color: 'var(--text-muted)' }}>Select a team workspace from the left list to view members, copy Team IDs, and assign developer roles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex flex-col justify-center items-center"><div className="spinner" /></div>}>
      <TeamsContent />
    </Suspense>
  );
}
