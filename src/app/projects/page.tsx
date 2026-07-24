'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { uploadToCloudinary } from '@/app/actions/upload';
import {
  BookOpen, FolderGit2, Plus, Upload, Link2, ExternalLink,
  ShieldAlert, Users, User, X, ArrowUpRight, FolderKanban, Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string; title: string; description: string | null; project_link: string;
  thumbnail_url: string | null; academic_session: string | null; status: string;
  created_at: string; team_id: string | null; owner_id: string | null;
  teams?: { name: string } | null; profiles?: { full_name: string } | null;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [academicSession, setAcademicSession] = useState('2025/2026');
  const [status, setStatus] = useState<'draft' | 'active' | 'completed' | 'archived'>('active');
  const [ownerType, setOwnerType] = useState<'individual' | 'team'>('individual');
  const [memberTeams, setMemberTeams] = useState<{ id: string; name: string }[]>([]);
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { router.push('/login'); return; }
    loadUserTeamsAndProjects();
  }, [profile, authLoading]);

  const loadUserTeamsAndProjects = async () => {
    if (!profile) return;
    setLoading(true); setActionError('');
    try {
      const { data: memberships } = await supabase.from('team_members').select('team_id').eq('student_id', profile.id).eq('status', 'accepted');
      const teamIds = (memberships || []).map((m) => m.team_id);

      let q = supabase.from('projects').select('*, teams:team_id(name), profiles:owner_id(full_name)').order('created_at', { ascending: false });
      q = teamIds.length > 0 ? q.or(`owner_id.eq.${profile.id},team_id.in.(${teamIds.join(',')})`) : q.eq('owner_id', profile.id);
      const { data: pd, error } = await q;
      if (error) throw error;
      setProjects(pd as Project[]);

      if (teamIds.length > 0) {
        const { data: td } = await supabase.from('teams').select('id, name').in('id', teamIds);
        setMemberTeams(td || []);
        if (td && td.length > 0) setAssignedTeamId(td[0].id);
      } else setMemberTeams([]);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load projects');
    } finally { setLoading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { const f = e.target.files[0]; setThumbnailFile(f); setThumbnailPreview(URL.createObjectURL(f)); }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setActionLoading(true); setActionError(''); setActionSuccess('');
    try {
      if (!projectLink.startsWith('http://') && !projectLink.startsWith('https://')) throw new Error('Project Link must begin with http:// or https://');
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => { reader.onloadend = () => res(reader.result as string); reader.onerror = rej; reader.readAsDataURL(thumbnailFile); });
        thumbnailUrl = await uploadToCloudinary(b64);
      }
      const payload: any = { title, description: description || null, project_link: projectLink, thumbnail_url: thumbnailUrl || null, academic_session: academicSession, status, owner_id: profile.id };
      if (ownerType === 'team') { if (!assignedTeamId) throw new Error('Select a team workspace'); payload.team_id = assignedTeamId; } else payload.team_id = null;
      const { error } = await supabase.from('projects').insert(payload).select();
      if (error) throw error;
      setActionSuccess('Project workspace created!');
      setShowCreateForm(false); setTitle(''); setDescription(''); setProjectLink(''); setThumbnailFile(null); setThumbnailPreview(null);
      await loadUserTeamsAndProjects();
    } catch (err: any) { setActionError(err.message || 'Failed to create project'); }
    finally { setActionLoading(false); }
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    active:    { bg: '#DCFCE7', text: '#15803D' },
    completed: { bg: '#DBEAFE', text: '#1D4ED8' },
    draft:     { bg: '#FEF3C7', text: '#B45309' },
    archived:  { bg: '#F1F5F9', text: '#64748B' },
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4">
        <div className="spinner" />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading Workspaces...</span>
      </div>
    );
  }

  if (profile && profile.role !== 'student') {
    return (
      <div className="max-w-xl mx-auto glass-panel p-10 text-center my-12 rounded-[24px]">
        <div className="empty-state-icon mx-auto mb-4"><ShieldAlert className="h-6 w-6" /></div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Lecturer Access</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Faculty accounts do not author project workspaces. Browse and evaluate projects on the showcase feed.</p>
        <Link href="/" className="glass-button text-sm font-semibold">Browse Projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 gap-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: 'var(--blue-primary)' }}>
            <FolderGit2 className="h-3.5 w-3.5" />
            Developer Workspaces
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Project Workspaces</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your projects, connect live deployment links, and publish to showcase.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={showCreateForm ? 'glass-button-secondary text-sm font-semibold flex items-center gap-2 px-5 py-2.5' : 'glass-button text-sm font-semibold flex items-center gap-2 px-5 py-2.5'}
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{showCreateForm ? 'Close Form' : 'New Project'}</span>
        </button>
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

      {/* Create Form */}
      {showCreateForm && (
        <div className="glass-panel p-6 sm:p-8 rounded-[20px] animate-scale-in" style={{ borderColor: 'rgba(37,99,235,0.2)' }}>
          <div className="flex items-center justify-between pb-4 mb-6" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-xlight)' }}>
                <Plus className="h-4 w-4" style={{ color: 'var(--blue-primary)' }} />
              </div>
              Create New Project Workspace
            </h2>
            <button onClick={() => setShowCreateForm(false)} className="icon-btn"><X className="h-4 w-4" /></button>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-6">
            {/* Banner Upload */}
            <div
              className="flex flex-col items-center justify-center rounded-2xl p-6 space-y-3 cursor-pointer transition-all duration-200"
              style={{ border: '2px dashed var(--border-soft)', background: 'var(--bg-section)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.3)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-soft)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-section)'; }}
            >
              {thumbnailPreview ? (
                <div className="relative w-48 aspect-video rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                  <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(15,23,42,0.7)' }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--blue-xlight)' }}>
                    <Upload className="h-5 w-5" style={{ color: 'var(--blue-primary)' }} />
                  </div>
                  <label htmlFor="thumbnail-upload" className="cursor-pointer text-sm font-bold" style={{ color: 'var(--blue-primary)' }}>
                    Upload Banner Image
                  </label>
                  <input id="thumbnail-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-placeholder)' }}>Recommended 16:9 — PNG, JPG, WebP</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Project Title *</label>
                <input type="text" required placeholder="e.g. Distributed Consensus Engine" value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input" />
              </div>
              <div>
                <label className="form-label">Live Deployment / Repo Link *</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-placeholder)' }} />
                  <input type="url" required placeholder=" https://my-app.vercel.app" value={projectLink} onChange={(e) => setProjectLink(e.target.value)} className="glass-input pl-10" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Project Description</label>
                <textarea rows={3} placeholder="Overview of technical stack, architecture highlights..." value={description} onChange={(e) => setDescription(e.target.value)} className="glass-input" />
              </div>

              {/* Ownership */}
              <div>
                <label className="form-label">Ownership Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setOwnerType('individual')}
                    className={`ownership-btn ${ownerType === 'individual' ? 'active-individual' : ''}`}>
                    Individual Project
                  </button>
                  <button type="button" onClick={() => setOwnerType('team')}
                    className={`ownership-btn ${ownerType === 'team' ? 'active-team' : ''}`}>
                    Team Project
                  </button>
                </div>
              </div>

              {ownerType === 'team' && (
                <div>
                  <label className="form-label">Select Associated Team</label>
                  <select value={assignedTeamId} onChange={(e) => setAssignedTeamId(e.target.value)} className="glass-input cursor-pointer">
                    {memberTeams.length === 0
                      ? <option value="">No joined teams available</option>
                      : memberTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
                    }
                  </select>
                </div>
              )}

              <div>
                <label className="form-label">Academic Session</label>
                <input type="text" required placeholder="e.g. 2025/2026" value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} className="glass-input" />
              </div>
              <div>
                <label className="form-label">Lifecycle Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="glass-input cursor-pointer">
                  <option value="active">Active Development</option>
                  <option value="completed">Completed &amp; Verified</option>
                  <option value="draft">Draft Workspace</option>
                </select>
              </div>
            </div>

            {/* Hint */}
            <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'var(--bg-section)', border: '1px solid var(--border-soft)' }}>
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--blue-primary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> Projects with live deployment links and detailed descriptions receive significantly more faculty engagement and higher ratings.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-soft)' }}>
              <button type="button" onClick={() => setShowCreateForm(false)} className="glass-button-secondary text-sm">Cancel</button>
              <button type="submit" disabled={actionLoading} className="glass-button text-sm">
                {actionLoading ? 'Saving...' : 'Submit Workspace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Workspaces ({projects.length})
          </h2>
        </div>

        {projects.length === 0 ? (
          <div className="glass-panel rounded-[20px]">
            <div className="empty-state">
              <div className="empty-state-icon"><FolderGit2 className="h-6 w-6" /></div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>No Workspaces Yet</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Submit your first project workspace to display it on the platform.</p>
              <button onClick={() => setShowCreateForm(true)} className="glass-button text-xs px-5 py-2 mt-2">
                <Plus className="h-3.5 w-3.5" /> Create First Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project, idx) => {
              const sc = statusColors[project.status] || statusColors.archived;
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="github-card flex flex-col cursor-pointer group animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  {/* Banner */}
                  {project.thumbnail_url ? (
                    <div className="aspect-video w-full rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border-soft)' }}>
                      <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-section)', border: '1px solid var(--border-soft)' }}>
                      <FolderGit2 className="h-10 w-10" style={{ color: 'var(--text-placeholder)' }} />
                    </div>
                  )}

                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={project.team_id ? 'badge-purple' : 'badge-github'}>
                        {project.team_id ? 'Team' : 'Individual'}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize"
                        style={{ background: sc.bg, color: sc.text }}>
                        {project.status}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base line-clamp-1 transition-colors duration-200"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--blue-primary)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                    >
                      {project.title}
                    </h3>
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {project.team_id ? `Team: ${project.teams?.name}` : `By: ${project.profiles?.full_name}`}
                    </span>
                    <span className="text-xs font-semibold flex items-center gap-1 transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: 'var(--blue-primary)' }}>
                      Manage <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
