'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { uploadToCloudinary } from '@/app/actions/upload';
import { 
  FolderGit2, Link2, ExternalLink, Calendar, Star, MessageSquare, 
  Trash2, Plus, Edit2, Globe, Send, User, Users, Share2, Upload,
  ArrowUpRight, ShieldCheck, X, CheckCircle2, Code
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string; title: string; description: string | null;
  project_link: string; thumbnail_url: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  academic_session: string | null; created_at: string;
  team_id: string | null; owner_id: string | null;
  teams?: { id: string; name: string; leader_id: string; } | null;
  profiles?: { id: string; full_name: string; } | null;
}

interface SocialLink { id: string; platform: string; url: string; }
interface Comment {
  id: string; content: string; created_at: string; author_id: string;
  profiles: { full_name: string; profile_picture_url: string | null; username: string; role: string; };
}
interface Rating { score: number; }

export default function ProjectWorkspacePage() {
  const { id } = useParams() as { id: string };
  const { profile } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ full_name: string; team_role: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editSession, setEditSession] = useState('');
  const [editStatus, setEditStatus] = useState<Project['status']>('draft');
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  const [newPlatform, setNewPlatform] = useState('github');
  const [newUrl, setNewUrl] = useState('');
  const [commentContent, setCommentContent] = useState('');

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
    setLoading(true); setErrorMsg('');
    try {
      const { data: projData, error: projErr } = await supabase.from('projects').select('*, teams:team_id(id, name, leader_id), profiles:owner_id(id, full_name)').eq('id', id).single();
      if (projErr) throw projErr;
      setProject(projData as Project);

      setEditTitle(projData.title); setEditDesc(projData.description || ''); setEditLink(projData.project_link);
      setEditSession(projData.academic_session || '2025/2026'); setEditStatus(projData.status); setEditThumbnailPreview(projData.thumbnail_url);

      if (projData.team_id) {
        const { data: members, error: memErr } = await supabase.from('team_members').select('team_role, profiles:student_id (full_name)').eq('team_id', projData.team_id).eq('status', 'accepted');
        if (!memErr && members) setTeamMembers((members as any).map((m: any) => ({ full_name: m.profiles?.full_name || 'Student', team_role: m.team_role })));
      }

      const { data: socials } = await supabase.from('project_social_links').select('*').eq('project_id', id);
      if (socials) setSocialLinks(socials);

      const { data: comms } = await supabase.from('project_comments').select('id, content, created_at, author_id, profiles:author_id (full_name, profile_picture_url, username, role)').eq('project_id', id).order('created_at', { ascending: true });
      if (comms) setComments(comms as any || []);

      const { data: rates } = await supabase.from('project_ratings').select('score, rater_id').eq('project_id', id);
      if (rates) {
        setRatings(rates as any || []);
        if (profile) {
          const userRate = rates.find((r) => r.rater_id === profile.id);
          if (userRate) setMyRating(userRate.score);
        }
      }
    } catch (err: any) { setErrorMsg(err.message || 'Workspace load failed'); } finally { setLoading(false); }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditThumbnailFile(file); setEditThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setSavingProject(true); setErrorMsg(''); setSuccessMsg('');
    try {
      if (!editLink.startsWith('http://') && !editLink.startsWith('https://')) throw new Error('Project Link must begin with http:// or https://');
      let finalThumbnailUrl = project.thumbnail_url;
      if (editThumbnailFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => { reader.onloadend = () => resolve(reader.result as string); reader.onerror = reject; });
        reader.readAsDataURL(editThumbnailFile);
        const base64Data = await base64Promise;
        finalThumbnailUrl = await uploadToCloudinary(base64Data);
      }
      const { error } = await supabase.from('projects').update({ title: editTitle, description: editDesc || null, project_link: editLink, thumbnail_url: finalThumbnailUrl || null, academic_session: editSession, status: editStatus }).eq('id', id);
      if (error) throw error;
      setSuccessMsg('Workspace updated!'); setIsEditMode(false); loadWorkspaceDetails();
    } catch (err: any) { setErrorMsg(err.message || 'Failed to save changes'); } finally { setSavingProject(false); }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you absolutely sure you want to delete this project workspace?')) return;
    setErrorMsg('');
    try { const { error } = await supabase.from('projects').delete().eq('id', id); if (error) throw error; router.push('/projects'); } catch (err: any) { setErrorMsg(err.message || 'Deletion failed'); }
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setErrorMsg(''); setSuccessMsg('');
    try {
      const { error } = await supabase.from('project_social_links').insert({ project_id: id, platform: newPlatform, url: newUrl });
      if (error) { if (error.code === '23505') throw new Error(`A link for platform '${newPlatform}' is already defined.`); throw error; }
      setNewUrl(''); setSuccessMsg('Social connection added!');
      const { data: socials } = await supabase.from('project_social_links').select('*').eq('project_id', id);
      if (socials) setSocialLinks(socials);
    } catch (err: any) { setErrorMsg(err.message || 'Failed to save link'); }
  };

  const handleDeleteSocialLink = async (linkId: string) => {
    setErrorMsg('');
    try { const { error } = await supabase.from('project_social_links').delete().eq('id', linkId); if (error) throw error; setSocialLinks(socialLinks.filter((sl) => sl.id !== linkId)); } catch (err: any) { setErrorMsg(err.message || 'Removal failed'); }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !profile) return;
    setErrorMsg('');
    try {
      const { error } = await supabase.from('project_comments').insert({ project_id: id, author_id: profile.id, content: commentContent });
      if (error) throw error;
      setCommentContent('');
      const { data: comms } = await supabase.from('project_comments').select('id, content, created_at, author_id, profiles:author_id (full_name, profile_picture_url, username, role)').eq('project_id', id).order('created_at', { ascending: true });
      if (comms) setComments(comms as any || []);
    } catch (err: any) { setErrorMsg(err.message || 'Comment submission failed'); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete comment?')) return;
    setErrorMsg('');
    try { const { error } = await supabase.from('project_comments').delete().eq('id', commentId); if (error) throw error; setComments(comments.filter((c) => c.id !== commentId)); } catch (err: any) { setErrorMsg(err.message || 'Deletion failed'); }
  };

  const handleRateProject = async (score: number) => {
    if (!profile) { setErrorMsg('You must be logged in to rate projects.'); return; }
    setErrorMsg(''); setSuccessMsg('');
    try {
      const { error } = await supabase.from('project_ratings').upsert({ project_id: id, rater_id: profile.id, score }, { onConflict: 'project_id,rater_id' });
      if (error) throw error;
      setMyRating(score); setSuccessMsg('Rating submitted successfully!');
      const { data: rates } = await supabase.from('project_ratings').select('score, rater_id').eq('project_id', id);
      if (rates) setRatings(rates as any || []);
    } catch (err: any) { setErrorMsg(err.message || 'Failed to submit score'); }
  };

  const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1) : '0.0';

  if (loading) return (
    <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4">
      <div className="spinner" />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading Workspace...</span>
    </div>
  );

  if (errorMsg && !project) return (
    <div className="max-w-xl mx-auto glass-panel p-10 text-center rounded-[24px] my-12 animate-fade-in">
      <h3 className="text-lg font-bold text-red-500 mb-2">Error Loading Project</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{errorMsg}</p>
      <Link href="/" className="glass-button text-sm">Return to Showcase</Link>
    </div>
  );

  if (!project) return null;
  const ownerName = project.team_id ? (project.teams?.name || 'Team') : (project.profiles?.full_name || 'Creator');

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16 animate-fade-in">
      
      {/* Top Header */}
      <div className="border-b pb-6 space-y-4" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-mono font-bold" style={{ color: 'var(--blue-primary)' }}>
              {project.team_id ? <Users className="h-4 w-4" style={{ color: 'var(--purple-primary)' }} /> : <User className="h-4 w-4" />}
              <span style={{ color: project.team_id ? 'var(--purple-primary)' : 'var(--blue-primary)' }}>{ownerName}</span>
              <span style={{ color: 'var(--text-placeholder)' }}>/</span>
              <span className="font-extrabold text-xl sm:text-2xl font-sans tracking-tight" style={{ color: 'var(--text-primary)' }}>{project.title}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className={`badge-${project.status === 'active' ? 'green' : project.status === 'completed' ? 'purple' : 'github'} capitalize`}>{project.status}</span>
              {project.academic_session && <span>Session: {project.academic_session}</span>}
              <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href={project.project_link} target="_blank" rel="noreferrer" className="glass-button text-sm px-5 py-2.5 flex items-center gap-2" style={{ background: 'var(--blue-primary)', color: 'white', border: 'none' }}>
              <span>Live Deployment</span> <ArrowUpRight className="h-4 w-4" />
            </a>
            {isOwner && (
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditMode(!isEditMode)} className="glass-button-secondary text-sm px-4 py-2.5 flex items-center gap-2">
                  <Edit2 className="h-4 w-4" /> <span>{isEditMode ? 'Cancel' : 'Edit'}</span>
                </button>
                <button onClick={handleDeleteProject} className="icon-btn danger p-2.5 rounded-xl border bg-white" title="Delete Workspace">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMsg && <div className="alert-error"><span>{errorMsg}</span><button onClick={() => setErrorMsg('')}><X className="h-4 w-4" /></button></div>}
      {successMsg && <div className="alert-success"><span>{successMsg}</span><button onClick={() => setSuccessMsg('')}><X className="h-4 w-4" /></button></div>}

      {isEditMode ? (
        <div className="glass-panel p-8 rounded-[24px] space-y-6 border border-blue-500/20">
          <h2 className="text-base font-bold flex items-center gap-2 pb-4 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-soft)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10"><Edit2 className="h-4 w-4 text-blue-500" /></div>
            Edit Workspace Details
          </h2>
          <form onSubmit={handleSaveProject} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Title</label>
                <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="glass-input" />
              </div>
              <div>
                <label className="form-label">Deployment Link URL</label>
                <input type="url" required value={editLink} onChange={(e) => setEditLink(e.target.value)} className="glass-input" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Description / README</label>
                <textarea rows={4} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="glass-input" />
              </div>
            </div>
            
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
               <label className="form-label">Cover Image / Thumbnail</label>
               <div className="mt-2 flex items-center gap-6">
                 {editThumbnailPreview ? (
                    <div className="relative w-40 h-24 rounded-lg overflow-hidden border shadow-sm" style={{ borderColor: 'var(--border-soft)' }}>
                      <img src={editThumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                 ) : (
                    <div className="w-40 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-gray-50/50" style={{ borderColor: 'var(--border-soft)', color: 'var(--text-placeholder)' }}>
                      <span className="text-xs font-semibold">No Image</span>
                    </div>
                 )}
                 <label className="glass-button-secondary text-sm px-4 py-2 cursor-pointer inline-flex items-center gap-2">
                   <Upload className="h-4 w-4" />
                   <span>Upload New</span>
                   <input type="file" accept="image/*" onChange={handleEditFileChange} className="hidden" />
                 </label>
               </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: 'var(--border-soft)' }}>
              <button type="button" onClick={() => setIsEditMode(false)} className="glass-button-secondary text-sm px-5">Cancel</button>
              <button type="submit" disabled={savingProject} className="glass-button text-sm px-6">
                {savingProject ? 'Saving...' : 'Save Workspace'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-6">
            
            {project.thumbnail_url && (
              <div className="rounded-[20px] overflow-hidden border shadow-sm aspect-video bg-white/50" style={{ borderColor: 'var(--border-soft)' }}>
                <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover transition duration-500 hover:scale-[1.02]" />
              </div>
            )}

            <div className="glass-panel p-8 rounded-[24px] space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold pb-4 border-b tracking-widest uppercase" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-soft)' }}>
                <Code className="h-4 w-4" style={{ color: 'var(--blue-primary)' }} /> <span>README.md / Overview</span>
              </div>
              <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                {project.description || <span className="italic" style={{ color: 'var(--text-placeholder)' }}>No detailed overview provided for this workspace.</span>}
              </p>
            </div>

            <div className="glass-panel p-8 rounded-[24px] space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <MessageSquare className="h-4 w-4" style={{ color: 'var(--purple-primary)' }} /> <span>Discussion & Reviews ({comments.length})</span>
                </h3>
              </div>

              {profile ? (
                <form onSubmit={handlePostComment} className="flex flex-col sm:flex-row gap-3">
                  <input type="text" placeholder="Leave a comment, review, or feedback..." value={commentContent} onChange={(e) => setCommentContent(e.target.value)} className="flex-grow glass-input text-sm px-4 py-3" />
                  <button type="submit" className="glass-button text-sm px-6 shrink-0 shadow-sm w-full sm:w-auto" style={{ background: 'var(--text-primary)' }}>
                    <Send className="h-4 w-4" /> <span>Post</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--bg-section)', color: 'var(--text-secondary)' }}>Please log in to join the discussion.</div>
              )}

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm italic text-center py-4" style={{ color: 'var(--text-placeholder)' }}>No comments yet. Start the conversation!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-5 rounded-xl border hover:shadow-sm transition" style={{ background: 'var(--bg-section)', borderColor: 'var(--border-soft)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {comment.profiles.profile_picture_url ? (
                            <img src={comment.profiles.profile_picture_url} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-blue-500">
                              {comment.profiles.full_name.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{comment.profiles.full_name}</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-placeholder)' }}>@{comment.profiles.username}</span>
                          <span className="badge-github text-[9px] uppercase px-1.5 py-0.5">{comment.profiles.role}</span>
                        </div>
                        {profile && (comment.author_id === profile.id || isOwner) && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="icon-btn danger w-7 h-7"><Trash2 className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            
            <div className="glass-panel p-6 rounded-[20px] space-y-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Star className="h-4 w-4 text-amber-500" /> <span>Project Evaluation</span>
              </h3>
              <div className="flex items-center justify-between p-5 rounded-2xl border" style={{ background: 'var(--amber-light)', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div>
                  <div className="text-3xl font-extrabold text-amber-600 drop-shadow-sm">{averageRating} <span className="text-lg text-amber-600/60">/ 5</span></div>
                  <div className="text-xs font-medium text-amber-700/60 mt-1">{ratings.length} total reviews</div>
                </div>
                <Star className="h-10 w-10 text-amber-500 fill-amber-500/20" />
              </div>
              {profile && (
                <div className="pt-2">
                  <div className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cast Your Score:</div>
                  <div className="flex items-center justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button key={score} onClick={() => handleRateProject(score)} className="flex-1 aspect-square rounded-xl font-bold text-sm transition-all border flex items-center justify-center cursor-pointer hover:scale-105"
                        style={{
                          background: myRating === score ? 'var(--amber-primary)' : 'var(--bg-section)',
                          color: myRating === score ? 'white' : 'var(--text-secondary)',
                          borderColor: myRating === score ? 'transparent' : 'var(--border-soft)',
                          boxShadow: myRating === score ? '0 4px 12px rgba(245,158,11,0.3)' : 'none'
                        }}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {project.team_id && (
              <div className="glass-panel p-6 rounded-[20px] space-y-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Users className="h-4 w-4" style={{ color: 'var(--purple-primary)' }} /> <span>Contributors</span>
                </h3>
                <div className="space-y-3">
                  {teamMembers.map((tm, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--bg-section)', borderColor: 'var(--border-soft)' }}>
                      <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{tm.full_name}</span>
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-1 rounded-md" style={{ color: 'var(--purple-primary)', background: 'var(--purple-light)' }}>
                        {tm.team_role.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-panel p-6 rounded-[20px] space-y-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Globe className="h-4 w-4" style={{ color: 'var(--blue-primary)' }} /> <span>External Links</span>
              </h3>
              <div className="space-y-3">
                <a href={project.project_link} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-xl transition duration-300 group border" style={{ background: 'var(--bg-section)', borderColor: 'var(--border-soft)' }}>
                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Primary App</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition"><ExternalLink className="h-4 w-4 text-blue-500" /></div>
                </a>
                {socialLinks.map((sl) => (
                  <div key={sl.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--bg-section)', borderColor: 'var(--border-soft)' }}>
                    <a href={sl.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline capitalize truncate flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <Link2 className="h-3.5 w-3.5" style={{ color: 'var(--text-placeholder)' }} /> {sl.platform}
                    </a>
                    {isOwner && <button onClick={() => handleDeleteSocialLink(sl.id)} className="icon-btn danger w-7 h-7"><X className="h-3 w-3" /></button>}
                  </div>
                ))}
              </div>

              {isOwner && (
                <form onSubmit={handleAddSocialLink} className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="flex flex-col gap-2">
                    <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="glass-input text-sm cursor-pointer py-2.5">
                      <option value="github">GitHub</option>
                      <option value="figma">Figma</option>
                      <option value="demo">Demo Video</option>
                      <option value="paper">Paper PDF</option>
                    </select>
                    <input type="url" required placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="glass-input text-sm py-2.5" />
                  </div>
                  <button type="submit" className="glass-button-secondary text-sm w-full py-2.5 shadow-sm">Add Reference Link</button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
