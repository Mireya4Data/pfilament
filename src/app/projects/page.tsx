'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { uploadToCloudinary } from '@/app/actions/upload';
import { 
  BookOpen, 
  FolderGit2, 
  Plus, 
  Upload, 
  Link2, 
  ExternalLink, 
  ShieldAlert, 
  Users, 
  User,
  X,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string | null;
  project_link: string;
  thumbnail_url: string | null;
  academic_session: string | null;
  status: string;
  created_at: string;
  team_id: string | null;
  owner_id: string | null;
  teams?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  // Project List State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [academicSession, setAcademicSession] = useState('2025/2026');
  const [status, setStatus] = useState<'draft' | 'active' | 'completed' | 'archived'>('active');
  const [ownerType, setOwnerType] = useState<'individual' | 'team'>('individual');
  
  // Teams where user is an accepted member (led or joined)
  const [memberTeams, setMemberTeams] = useState<{ id: string; name: string }[]>([]);
  const [assignedTeamId, setAssignedTeamId] = useState('');

  // Thumbnail State
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Status message states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.push('/login');
      return;
    }

    loadUserTeamsAndProjects();
  }, [profile, authLoading]);

  const loadUserTeamsAndProjects = async () => {
    if (!profile) return;
    setLoading(true);
    setActionError('');
    try {
      // 1. Find all accepted team memberships for current user (teams led OR joined)
      const { data: memberships, error: memErr } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('student_id', profile.id)
        .eq('status', 'accepted');

      if (memErr) throw memErr;
      const teamIds = (memberships || []).map((m) => m.team_id);

      // 2. Fetch projects matching owner_id OR team_id in teamIds
      let projectsQuery = supabase
        .from('projects')
        .select('*, teams:team_id(name), profiles:owner_id(full_name)')
        .order('created_at', { ascending: false });

      if (teamIds.length > 0) {
        projectsQuery = projectsQuery.or(`owner_id.eq.${profile.id},team_id.in.(${teamIds.join(',')})`);
      } else {
        projectsQuery = projectsQuery.eq('owner_id', profile.id);
      }

      const { data: projectsData, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;
      setProjects(projectsData as Project[]);

      // 3. Fetch ALL teams user belongs to (accepted status) so even non-leaders can associate projects
      if (teamIds.length > 0) {
        const { data: teamsData, error: teamsErr } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);
        if (teamsErr) throw teamsErr;
        
        setMemberTeams(teamsData || []);
        if (teamsData && teamsData.length > 0) {
          setAssignedTeamId(teamsData[0].id);
        }
      } else {
        setMemberTeams([]);
      }

    } catch (err: any) {
      setActionError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      if (!projectLink.startsWith('http://') && !projectLink.startsWith('https://')) {
        throw new Error('Project Link must begin with http:// or https://');
      }

      let thumbnailUrl = '';
      if (thumbnailFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(thumbnailFile);
        const base64Data = await base64Promise;
        thumbnailUrl = await uploadToCloudinary(base64Data);
      }

      const payload: any = {
        title,
        description: description || null,
        project_link: projectLink,
        thumbnail_url: thumbnailUrl || null,
        academic_session: academicSession,
        status,
        owner_id: profile.id // Always store creator ID to support cascading on team exit/removal
      };

      if (ownerType === 'team') {
        if (!assignedTeamId) {
          throw new Error('You must select a team workspace from your joined teams');
        }
        payload.team_id = assignedTeamId;
      } else {
        payload.team_id = null;
      }

      const { error } = await supabase
        .from('projects')
        .insert(payload)
        .select();

      if (error) throw error;

      setActionSuccess('Project workspace initialized successfully!');
      setShowCreateForm(false);
      setTitle('');
      setDescription('');
      setProjectLink('');
      setThumbnailFile(null);
      setThumbnailPreview(null);
      
      await loadUserTeamsAndProjects();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit project');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-4 text-xs text-[#8b949e] font-semibold uppercase tracking-wider">Loading Workspaces...</span>
      </div>
    );
  }

  if (profile && profile.role !== 'student') {
    return (
      <div className="max-w-xl mx-auto glass-panel p-8 text-center my-12 rounded-xl">
        <ShieldAlert className="h-10 w-10 text-[#8b949e] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Lecturer Access</h3>
        <p className="text-[#8b949e] text-xs mb-6 leading-relaxed">
          Faculty accounts do not author project workspaces. Please browse and evaluate projects on the showcase feed.
        </p>
        <Link href="/" className="glass-button text-xs font-semibold">
          Browse Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#58a6ff] mb-1">
            <FolderGit2 className="h-3.5 w-3.5" />
            <span>Developer Workspaces</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Project Workspaces</h1>
          <p className="text-[#8b949e] text-xs mt-1">
            Manage your project repositories, connect live deployment links, and publish to showcase.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="glass-button text-xs font-semibold flex items-center space-x-2 shrink-0 py-2.5 px-4 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{showCreateForm ? 'Close Form' : 'New Project'}</span>
        </button>
      </div>

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

      {/* Creation form */}
      {showCreateForm && (
        <div className="glass-panel p-6 sm:p-8 rounded-xl animate-fade-in border-[#58a6ff]/30 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Plus className="h-4 w-4 text-[#58a6ff]" />
              <span>Create New Project Workspace</span>
            </h2>
            <button onClick={() => setShowCreateForm(false)} className="text-[#8b949e] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-6">
            {/* Banner upload preview */}
            <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 bg-[#0d1117] space-y-3">
              {thumbnailPreview ? (
                <div className="relative w-48 aspect-video rounded-lg overflow-hidden border border-white/10">
                  <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                    className="absolute top-2 right-2 p-1 rounded bg-black/80 text-[#8b949e] hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-7 w-7 text-[#8b949e] mx-auto mb-2" />
                  <label htmlFor="thumbnail-upload" className="cursor-pointer text-xs font-bold text-[#58a6ff] hover:underline">
                    Upload Banner Image (Cloudinary)
                  </label>
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-[10px] text-[#8b949e] mt-1">Recommended: 16:9 aspect ratio</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Live Deployment / Repo Link *</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-3 h-4 w-4 text-[#8b949e]" />
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/my-repo or https://my-app.vercel.app"
                    value={projectLink}
                    onChange={(e) => setProjectLink(e.target.value)}
                    className="w-full pl-10 glass-input"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Project Description</label>
                <textarea
                  rows={3}
                  placeholder="Overview of technical stack, architecture highlights, and features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Ownership Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOwnerType('individual')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      ownerType === 'individual'
                        ? 'bg-[#58a6ff]/20 border-[#58a6ff] text-[#58a6ff]'
                        : 'bg-transparent text-[#8b949e] border-white/10 hover:border-white/20'
                    }`}
                  >
                    Individual Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerType('team')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      ownerType === 'team'
                        ? 'bg-[#a371f7]/20 border-[#a371f7] text-[#a371f7]'
                        : 'bg-transparent text-[#8b949e] border-white/10 hover:border-white/20'
                    }`}
                  >
                    Team Project
                  </button>
                </div>
              </div>

              {/* Requirement 1: Allow any member of a team to select their team workspace */}
              {ownerType === 'team' && (
                <div>
                  <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">
                    Select Associated Team
                  </label>
                  <select
                    value={assignedTeamId}
                    onChange={(e) => setAssignedTeamId(e.target.value)}
                    className="w-full glass-input bg-[#0d1117] cursor-pointer"
                  >
                    {memberTeams.length === 0 ? (
                      <option value="">No joined teams available (Join or create a team first)</option>
                    ) : (
                      memberTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Academic Session</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2025/2026"
                  value={academicSession}
                  onChange={(e) => setAcademicSession(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Lifecycle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full glass-input bg-[#0d1117] cursor-pointer"
                >
                  <option value="active">Active Development</option>
                  <option value="completed">Completed & Verified</option>
                  <option value="draft">Draft Workspace</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="glass-button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="glass-button text-xs"
              >
                {actionLoading ? 'Saving...' : 'Submit Workspace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
          Workspaces ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-xl flex flex-col items-center justify-center min-h-[250px]">
            <FolderGit2 className="h-10 w-10 text-[#8b949e] mb-3" />
            <h3 className="text-white font-bold text-sm">No Workspaces Found</h3>
            <p className="text-[#8b949e] text-xs mt-1">Submit your first project workspace to display it on the platform.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="github-card flex flex-col justify-between cursor-pointer group space-y-4"
              >
                {/* Banner */}
                {project.thumbnail_url ? (
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 bg-[#0d1117]">
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-lg border border-white/10 bg-[#161b22] flex items-center justify-center">
                    <FolderGit2 className="h-10 w-10 text-[#8b949e]" />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`badge-github ${project.team_id ? 'badge-purple' : ''}`}>
                      {project.team_id ? 'Team' : 'Individual'}
                    </span>
                    <span className="badge-green capitalize text-[10px]">{project.status}</span>
                  </div>

                  <h3 className="font-extrabold text-white text-base group-hover:text-[#58a6ff] transition line-clamp-1">
                    {project.title}
                  </h3>

                  <p className="text-xs text-[#8b949e] line-clamp-2">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                  <span className="text-[10px] text-[#8b949e]">
                    {project.team_id ? `Team: ${project.teams?.name}` : `By: ${project.profiles?.full_name}`}
                  </span>
                  
                  <span className="text-xs font-semibold text-[#58a6ff] flex items-center space-x-1 group-hover:translate-x-0.5 transition">
                    <span>Manage</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
