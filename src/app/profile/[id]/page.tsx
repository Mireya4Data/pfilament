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
  id: string;
  full_name: string;
  registration_number: string;
  department_id: string | null;
  level: string | null;
  email: string;
  username: string;
  profile_picture_url: string | null;
  academic_session: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  role: 'student' | 'lecturer' | 'admin';
  departments?: {
    name: string;
  } | null;
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  project_link: string;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  teams?: {
    name: string;
  } | null;
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
      setLoading(true);
      setError('');
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*, departments:department_id(name)')
          .eq('id', id)
          .single();

        if (profileErr) throw profileErr;
        setProfile(profileData as any);

        const { data: memberships, error: memErr } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('student_id', id)
          .eq('status', 'accepted');

        if (memErr) throw memErr;
        const teamIds = memberships?.map((m) => m.team_id) || [];

        let projectsQuery = supabase
          .from('projects')
          .select('*, teams:team_id(name)')
          .order('created_at', { ascending: false });

        if (teamIds.length > 0) {
          projectsQuery = projectsQuery.or(`owner_id.eq.${id},team_id.in.(${teamIds.join(',')})`);
        } else {
          projectsQuery = projectsQuery.eq('owner_id', id);
        }

        const { data: projectsData, error: projErr } = await projectsQuery;
        if (projErr) throw projErr;
        setProjects(projectsData as ProjectData[]);

      } catch (err: any) {
        console.error('Error loading portfolio:', err.message);
        setError(err.message || 'Could not load portfolio data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-4 text-xs text-[#8b949e] font-semibold uppercase tracking-wider">Loading Portfolio...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-8 text-center rounded-xl my-12">
        <h3 className="text-lg font-bold text-[#f85149] mb-2">Error Loading Profile</h3>
        <p className="text-[#8b949e] text-xs mb-6">{error || 'User profile not found'}</p>
        <Link href="/" className="glass-button text-xs">Return to Showcase</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* GitHub Style Profile Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-xl border-white/10 flex flex-col md:flex-row items-center md:items-start gap-6">
        
        {/* Avatar */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#58a6ff] overflow-hidden bg-[#161b22] shrink-0">
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-full h-full p-6 text-[#8b949e]" />
          )}
        </div>

        {/* Details */}
        <div className="space-y-3 flex-grow text-center md:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-white">{profile.full_name}</h1>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5">@{profile.username}</p>
            </div>

            {isOwner && (
              <Link href="/profile/edit" className="glass-button-secondary text-xs py-1.5 px-3 self-center md:self-auto">
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
            <span className="badge-github uppercase">{profile.role}</span>
            {profile.departments?.name && (
              <span className="badge-purple">{profile.departments.name}</span>
            )}
            {profile.level && (
              <span className="badge-green">{profile.level} Level</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-[#8b949e] pt-1">
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noreferrer" className="hover:text-white flex items-center space-x-1">
                <Github className="h-3.5 w-3.5" />
                <span>GitHub</span>
              </a>
            )}
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-white flex items-center space-x-1">
                <Linkedin className="h-3.5 w-3.5" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>

      </div>

      {/* Projects Showcase Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
          Workspaces & Repositories ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-xl">
            <p className="text-xs text-[#8b949e]">No public projects submitted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => router.push(`/projects/${proj.id}`)}
                className="github-card flex flex-col justify-between cursor-pointer group space-y-3"
              >
                <div className="space-y-2">
                  <span className="badge-github text-[10px] capitalize">{proj.status}</span>
                  <h3 className="font-extrabold text-white text-base group-hover:text-[#58a6ff] transition line-clamp-1">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-[#8b949e] line-clamp-2">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                  <span className="text-[10px] text-[#8b949e]">
                    {proj.teams?.name ? `Team: ${proj.teams.name}` : 'Individual Project'}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#58a6ff]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
