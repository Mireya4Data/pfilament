'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Phone, BookOpen, Layers, Edit3, Calendar, FolderGit, ExternalLink, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface ProfileData {
  id: string; full_name: string; registration_number: string;
  department_id: string | null; level: string | null;
  email: string; username: string; profile_picture_url: string | null;
  academic_session: string | null; phone: string | null;
  linkedin_url: string | null; github_url: string | null;
  role: 'student' | 'lecturer' | 'admin';
  departments?: { name: string; } | null;
}

interface ProjectData {
  id: string; title: string; description: string;
  project_link: string; thumbnail_url: string | null;
  status: string; created_at: string;
  teams?: { name: string; } | null;
}

export default function ProfileDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { profile: currentUserProfile } = useAuth();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwner = currentUserProfile?.id === id;

  useEffect(() => {
    if (!id) return;
    async function loadData() {
      setLoading(true); setError('');
      try {
        const { data: profileData, error: profileErr } = await supabase.from('profiles').select('*, departments:department_id(name)').eq('id', id).single();
        if (profileErr) throw profileErr;
        setProfile(profileData as any);

        const { data: memberships, error: memErr } = await supabase.from('team_members').select('team_id').eq('student_id', id).eq('status', 'accepted');
        if (memErr) throw memErr;
        const teamIds = memberships?.map((m) => m.team_id) || [];

        let projectsQuery = supabase.from('projects').select('*, teams:team_id(name)').order('created_at', { ascending: false });
        if (teamIds.length > 0) projectsQuery = projectsQuery.or(`owner_id.eq.${id},team_id.in.(${teamIds.join(',')})`);
        else projectsQuery = projectsQuery.eq('owner_id', id);

        const { data: projectsData, error: projErr } = await projectsQuery;
        if (projErr) throw projErr;
        setProjects(projectsData as ProjectData[]);
      } catch (err: any) {
        setError(err.message || 'Could not load portfolio data');
      } finally { setLoading(false); }
    }
    loadData();
  }, [id]);

  if (loading) return (
    <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4">
      <div className="spinner" />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading Portfolio...</span>
    </div>
  );

  if (error || !profile) return (
    <div className="max-w-xl mx-auto glass-panel p-10 text-center rounded-[24px] my-12">
      <h3 className="text-lg font-bold text-red-500 mb-2">Error Loading Profile</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{error || 'User profile not found'}</p>
      <Link href="/" className="glass-button text-sm">Return to Showcase</Link>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16 animate-fade-in">
      
      {/* GitHub Style Profile Header */}
      <div className="glass-panel p-8 sm:p-10 rounded-[24px] flex flex-col md:flex-row items-center md:items-start gap-8 shadow-sm">
        
        {/* Avatar */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shrink-0 border-[3px]" style={{ borderColor: 'var(--blue-primary)', background: 'var(--bg-section)', boxShadow: '0 8px 24px rgba(37,99,235,0.15)' }}>
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-full h-full p-8" style={{ color: 'var(--text-placeholder)' }} />
          )}
        </div>

        {/* Details */}
        <div className="space-y-4 flex-grow text-center md:text-left pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{profile.full_name}</h1>
              <p className="text-sm font-mono mt-1 font-bold" style={{ color: 'var(--blue-primary)' }}>@{profile.username}</p>
            </div>

            {isOwner && (
              <Link href="/profile/edit" className="glass-button-secondary text-sm px-5 py-2.5 flex items-center gap-2 self-center md:self-auto">
                <Edit3 className="h-4 w-4" /> <span>Edit Profile</span>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs mt-2">
            <span className="badge-premium uppercase tracking-widest">{profile.role}</span>
            {profile.departments?.name && (
              <span className="px-3 py-1.5 rounded-full font-semibold" style={{ background: 'var(--purple-light)', color: 'var(--purple-primary)' }}>
                {profile.departments.name}
              </span>
            )}
            {profile.level && (
              <span className="badge-green">{profile.level} Level</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 pt-3 border-t mt-4" style={{ borderColor: 'var(--border-soft)' }}>
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors font-medium hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                <Github className="h-4 w-4" /> <span>GitHub</span>
              </a>
            )}
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors font-medium hover:opacity-80" style={{ color: '#0A66C2' }}>
                <Linkedin className="h-4 w-4" /> <span>LinkedIn</span>
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 transition-colors font-medium hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                <Mail className="h-4 w-4" /> <span>{profile.email}</span>
              </a>
            )}
          </div>
        </div>

      </div>

      {/* Projects Showcase Grid */}
      <div className="space-y-6 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <FolderGit className="h-4 w-4" style={{ color: 'var(--blue-primary)' }} />
          <span>Workspaces & Repositories ({projects.length})</span>
        </h2>

        {projects.length === 0 ? (
          <div className="glass-panel p-16 text-center rounded-[24px] flex flex-col items-center gap-3">
            <FolderGit className="h-12 w-12" style={{ color: 'var(--text-placeholder)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No public projects submitted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div key={proj.id} onClick={() => router.push(`/projects/${proj.id}`)} className="github-card flex flex-col justify-between cursor-pointer group space-y-4">
                <div className="space-y-3">
                  <span className={`badge-${proj.status === 'active' ? 'green' : proj.status === 'completed' ? 'purple' : 'github'} capitalize`}>{proj.status}</span>
                  <h3 className="font-extrabold text-lg line-clamp-1 group-hover:text-blue-600 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    {proj.title}
                  </h3>
                  <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {proj.description || <span className="italic">No description provided.</span>}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t text-xs font-medium" style={{ borderColor: 'var(--border-soft)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {proj.teams?.name ? <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" style={{ color: 'var(--purple-primary)' }}/> {proj.teams.name}</span> : 'Individual Project'}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors group-hover:bg-blue-50">
                     <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--blue-primary)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
