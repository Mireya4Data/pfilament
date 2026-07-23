'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { uploadToCloudinary } from '@/app/actions/upload';
import { 
  FolderGit2, 
  Link2, 
  ExternalLink, 
  Calendar, 
  Star, 
  MessageSquare, 
  Trash2, 
  Plus, 
  Edit2, 
  Globe, 
  Send, 
  User, 
  Users, 
  Share2, 
  Upload,
  ArrowUpRight,
  ShieldCheck,
  X,
  CheckCircle2,
  Code
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string | null;
  project_link: string;
  thumbnail_url: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  academic_session: string | null;
  created_at: string;
  team_id: string | null;
  owner_id: string | null;
  teams?: {
    id: string;
    name: string;
    leader_id: string;
  } | null;
  profiles?: {
    id: string;
    full_name: string;
  } | null;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string;
    profile_picture_url: string | null;
    username: string;
    role: string;
  };
}

interface Rating {
  score: number;
}

export default function ProjectWorkspacePage() {
  const { id } = useParams() as { id: string };
  const { profile } = useAuth();
  const router = useRouter();

  // Root data states
  const [project, setProject] = useState<Project | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ full_name: string; team_role: string }[]>([]);

  // Page UI and action states
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing values
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editSession, setEditSession] = useState('');
  const [editStatus, setEditStatus] = useState<Project['status']>('draft');
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  // Social link creation values
  const [newPlatform, setNewPlatform] = useState('github');
  const [newUrl, setNewUrl] = useState('');
  
  // Comment submission values
  const [commentContent, setCommentContent] = useState('');

  // Access rights check
  const isOwner = project && profile && (
    project.owner_id === profile.id || 
    (project.teams && project.teams.leader_id === profile.id) ||
    profile.role === 'admin'
  );

  useEffect(() => {
    if (!id) return;
    loadWorkspaceDetails();
  }, [id, profile]);

  const loadWorkspaceDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*, teams:team_id(id, name, leader_id), profiles:owner_id(id, full_name)')
        .eq('id', id)
        .single();

      if (projErr) throw projErr;
      setProject(projData as Project);

      setEditTitle(projData.title);
      setEditDesc(projData.description || '');
      setEditLink(projData.project_link);
      setEditSession(projData.academic_session || '2025/2026');
      setEditStatus(projData.status);
      setEditThumbnailPreview(projData.thumbnail_url);

      if (projData.team_id) {
        const { data: members, error: memErr } = await supabase
          .from('team_members')
          .select(`
            team_role,
            profiles:student_id (
              full_name
            )
          `)
          .eq('team_id', projData.team_id)
          .eq('status', 'accepted');
        if (!memErr && members) {
          setTeamMembers((members as any).map((m: any) => ({
            full_name: m.profiles?.full_name || 'Student',
            team_role: m.team_role
          })));
        }
      }

      const { data: socials, error: socialErr } = await supabase
        .from('project_social_links')
        .select('*')
        .eq('project_id', id);
      if (!socialErr && socials) setSocialLinks(socials);

      const { data: comms, error: commsErr } = await supabase
        .from('project_comments')
        .select(`
          id, content, created_at, author_id,
          profiles:author_id (
            full_name, profile_picture_url, username, role
          )
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: true });
      if (!commsErr && comms) setComments(comms as any || []);

      const { data: rates, error: ratesErr } = await supabase
        .from('project_ratings')
        .select('score, rater_id')
        .eq('project_id', id);
      if (!ratesErr && rates) {
        setRatings(rates as any || []);
        if (profile) {
          const userRate = rates.find((r) => r.rater_id === profile.id);
          if (userRate) setMyRating(userRate.score);
        }
      }

    } catch (err: any) {
      console.error('Error fetching Workspace details:', err.message);
      setErrorMsg(err.message || 'Workspace load failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditThumbnailFile(file);
      setEditThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setSavingProject(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!editLink.startsWith('http://') && !editLink.startsWith('https://')) {
        throw new Error('Project Link must begin with http:// or https://');
      }

      let finalThumbnailUrl = project.thumbnail_url;
      if (editThumbnailFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(editThumbnailFile);
        const base64Data = await base64Promise;
        finalThumbnailUrl = await uploadToCloudinary(base64Data);
      }

      const { error } = await supabase
        .from('projects')
        .update({
          title: editTitle,
          description: editDesc || null,
          project_link: editLink,
          thumbnail_url: finalThumbnailUrl || null,
          academic_session: editSession,
          status: editStatus
        })
        .eq('id', id);

      if (error) throw error;

      setSuccessMsg('Workspace updated!');
      setIsEditMode(false);
      loadWorkspaceDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you absolutely sure you want to delete this project workspace?')) return;
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      router.push('/projects');
    } catch (err: any) {
      setErrorMsg(err.message || 'Deletion failed');
    }
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('project_social_links')
        .insert({
          project_id: id,
          platform: newPlatform,
          url: newUrl
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error(`A link for platform '${newPlatform}' is already defined.`);
        }
        throw error;
      }

      setNewUrl('');
      setSuccessMsg('Social connection added!');
      const { data: socials } = await supabase.from('project_social_links').select('*').eq('project_id', id);
      if (socials) setSocialLinks(socials);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save link');
    }
  };

  const handleDeleteSocialLink = async (linkId: string) => {
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('project_social_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
      setSocialLinks(socialLinks.filter((sl) => sl.id !== linkId));
    } catch (err: any) {
      setErrorMsg(err.message || 'Removal failed');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !profile) return;
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('project_comments')
        .insert({
          project_id: id,
          author_id: profile.id,
          content: commentContent
        });

      if (error) throw error;
      setCommentContent('');
      
      const { data: comms } = await supabase
        .from('project_comments')
        .select(`
          id, content, created_at, author_id,
          profiles:author_id (
            full_name, profile_picture_url, username, role
          )
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: true });
      if (comms) setComments(comms as any || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Comment submission failed');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete comment?')) return;
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err: any) {
      setErrorMsg(err.message || 'Deletion failed');
    }
  };

  const handleRateProject = async (score: number) => {
    if (!profile) {
      setErrorMsg('You must be logged in to rate projects.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('project_ratings')
        .upsert(
          {
            project_id: id,
            rater_id: profile.id,
            score
          },
          { onConflict: 'project_id,rater_id' }
        );

      if (error) throw error;

      setMyRating(score);
      setSuccessMsg('Rating submitted successfully!');
      
      const { data: rates } = await supabase
        .from('project_ratings')
        .select('score, rater_id')
        .eq('project_id', id);
      if (rates) setRatings(rates as any || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit score');
    }
  };

  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-4 text-xs text-[#8b949e] font-semibold uppercase tracking-wider">Loading Workspace Details...</span>
      </div>
    );
  }

  if (errorMsg && !project) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-8 text-center rounded-xl my-12">
        <h3 className="text-lg font-bold text-[#f85149] mb-2">Error Loading Project</h3>
        <p className="text-[#8b949e] text-xs mb-6">{errorMsg}</p>
        <Link href="/" className="glass-button text-xs">Return to Showcase</Link>
      </div>
    );
  }

  if (!project) return null;

  const ownerName = project.team_id ? (project.teams?.name || 'Team') : (project.profiles?.full_name || 'Creator');

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* Top Header Path Bar (GitHub Repo Header Style) */}
      <div className="border-b border-white/10 pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm font-mono text-[#58a6ff]">
              {project.team_id ? <Users className="h-4 w-4 text-[#a371f7]" /> : <User className="h-4 w-4 text-[#58a6ff]" />}
              <span>{ownerName}</span>
              <span className="text-[#8b949e]">/</span>
              <span className="font-extrabold text-white text-lg sm:text-xl">{project.title}</span>
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-[#8b949e]">
              <span className="badge-green capitalize">{project.status}</span>
              {project.academic_session && <span>Session: {project.academic_session}</span>}
              <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={project.project_link}
              target="_blank"
              rel="noreferrer"
              className="glass-button text-xs py-2 px-4 flex items-center space-x-1.5"
            >
              <span>Live Deployment</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>

            {isOwner && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="glass-button-secondary text-xs py-2 px-3"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>{isEditMode ? 'Cancel' : 'Edit'}</span>
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-2 rounded-md bg-[#21262d] border border-white/5 hover:border-[#f85149] text-[#8b949e] hover:text-[#f85149] transition cursor-pointer"
                  title="Delete Workspace"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-[#f85149] hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-[#3fb950] hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* EDITING FORM */}
      {isEditMode ? (
        <div className="glass-panel p-6 sm:p-8 rounded-xl animate-fade-in border-[#58a6ff]/30 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 pb-3 border-b border-white/10">
            <Edit2 className="h-4 w-4 text-[#58a6ff]" />
            <span>Edit Workspace Details</span>
          </h2>

          <form onSubmit={handleSaveProject} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Deployment Link URL</label>
                <input
                  type="url"
                  required
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full glass-input"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="glass-button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProject}
                className="glass-button text-xs"
              >
                {savingProject ? 'Saving...' : 'Save Workspace'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* MAIN WORKSPACE DISPLAY GRID */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Details (Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Banner Thumbnail */}
            {project.thumbnail_url && (
              <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-[#0d1117]">
                <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Readme / Description Box */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#8b949e] pb-3 border-b border-white/10">
                <Code className="h-4 w-4 text-[#58a6ff]" />
                <span>README.md / Workspace Overview</span>
              </div>
              <p className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-line">
                {project.description || 'No detailed overview provided for this workspace.'}
              </p>
            </div>

            {/* Discussion & Reviews Section (GitHub Discussions / Reddit Comments) */}
            <div className="glass-panel p-6 rounded-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-[#a371f7]" />
                  <span>Discussion & Reviews ({comments.length})</span>
                </h3>
              </div>

              {/* Comment Input */}
              {profile ? (
                <form onSubmit={handlePostComment} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Leave a comment or faculty review..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="flex-grow glass-input text-xs"
                  />
                  <button type="submit" className="glass-button text-xs px-4 cursor-pointer shrink-0">
                    <Send className="h-3.5 w-3.5" />
                    <span>Comment</span>
                  </button>
                </form>
              ) : (
                <p className="text-xs text-[#8b949e]">Please log in to join the discussion.</p>
              )}

              {/* Comments Stream */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#8b949e] italic">No comments yet. Start the conversation!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-3.5 rounded-lg bg-[#161b22] border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{comment.profiles.full_name}</span>
                          <span className="text-[10px] text-[#8b949e]">@{comment.profiles.username}</span>
                          <span className="badge-github text-[9px] uppercase">{comment.profiles.role}</span>
                        </div>
                        {profile && (comment.author_id === profile.id || isOwner) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-[#8b949e] hover:text-[#f85149]"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#c9d1d9] leading-relaxed">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar Details (Col 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Rating Box */}
            <div className="glass-panel p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
                <Star className="h-4 w-4 text-amber-400" />
                <span>Project Evaluation</span>
              </h3>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#161b22] border border-white/5">
                <div>
                  <div className="text-2xl font-extrabold text-white">{averageRating} / 5.0</div>
                  <div className="text-[10px] text-[#8b949e]">{ratings.length} user reviews</div>
                </div>
                <Star className="h-8 w-8 text-amber-400 fill-amber-400/20" />
              </div>

              {/* Rate buttons */}
              {profile && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="text-[11px] font-semibold text-[#8b949e]">Cast Score:</div>
                  <div className="flex items-center justify-between">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => handleRateProject(score)}
                        className={`w-9 h-9 rounded-lg font-bold text-xs transition cursor-pointer border ${
                          myRating === score
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border-white/10'
                        }`}
                      >
                        {score}⭐
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Team Roster */}
            {project.team_id && (
              <div className="glass-panel p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
                  <Users className="h-4 w-4 text-[#a371f7]" />
                  <span>Team Contributors</span>
                </h3>
                <div className="space-y-2">
                  {teamMembers.map((tm, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-none">
                      <span className="font-bold text-white">{tm.full_name}</span>
                      <span className="text-[10px] text-[#8b949e] uppercase font-mono">{tm.team_role.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social / Extra Links */}
            <div className="glass-panel p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
                <Globe className="h-4 w-4 text-[#58a6ff]" />
                <span>External Links</span>
              </h3>

              <div className="space-y-2">
                <a
                  href={project.project_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] text-xs text-[#58a6ff] transition"
                >
                  <span className="font-semibold truncate">Primary Deployment</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>

                {socialLinks.map((sl) => (
                  <div key={sl.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#161b22] text-xs">
                    <a href={sl.url} target="_blank" rel="noreferrer" className="text-[#c9d1d9] hover:underline capitalize truncate">
                      {sl.platform}: {sl.url}
                    </a>
                    {isOwner && (
                      <button onClick={() => handleDeleteSocialLink(sl.id)} className="text-[#8b949e] hover:text-[#f85149] ml-2">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isOwner && (
                <form onSubmit={handleAddSocialLink} className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex gap-2">
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      className="glass-input bg-[#0d1117] text-xs w-28 cursor-pointer"
                    >
                      <option value="github">GitHub</option>
                      <option value="figma">Figma</option>
                      <option value="demo">Demo Video</option>
                      <option value="paper">Paper PDF</option>
                    </select>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="glass-input text-xs flex-grow"
                    />
                  </div>
                  <button type="submit" className="glass-button-secondary text-xs w-full py-1.5">
                    Add Link
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
