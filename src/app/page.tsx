'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Filter,
  Star,
  Layers,
  BookOpen,
  User,
  RefreshCw,
  FolderKanban,
  TrendingUp,
  Award,
  ArrowUpRight,
  Users,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string | null;
  project_link: string;
  thumbnail_url: string | null;
  status: string;
  academic_session: string | null;
  created_at: string;
  team_id: string | null;
  owner_id: string | null;
  teams?: { name: string; department_id: string | null } | null;
  profiles?: { full_name: string; level: string | null; department_id: string | null } | null;
  avg_score?: string;
  ratings_count?: number;
}

function ShowcaseFeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'trending' | 'top_rated'>('all');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => { loadShowcaseData(); }, []);

  const loadShowcaseData = async () => {
    setLoading(true);
    try {
      const { data: depts } = await supabase.from('departments').select('id, name').order('name');
      if (depts) setDepartments(depts);

      const { data: projs, error } = await supabase
        .from('projects')
        .select('*, teams:team_id(name, department_id), profiles:owner_id(full_name, level, department_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const enriched: Project[] = [];
      if (projs) {
        for (const p of projs) {
          const { data: rates } = await supabase.from('project_ratings').select('score').eq('project_id', p.id);
          const count = rates?.length || 0;
          const avg = count > 0 ? (rates!.reduce((s, r) => s + r.score, 0) / count).toFixed(1) : '0.0';
          enriched.push({ ...p, avg_score: avg, ratings_count: count });
        }
      }
      setProjects(enriched);
    } catch (err: any) {
      console.error('Error loading showcase:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch(''); setSelectedDept(''); setSelectedStatus(''); setSelectedSession(''); setActiveTab('all');
  };

  const filteredProjects = projects
    .filter((proj) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!proj.title.toLowerCase().includes(q) &&
            !proj.description?.toLowerCase().includes(q) &&
            !proj.teams?.name.toLowerCase().includes(q) &&
            !proj.profiles?.full_name.toLowerCase().includes(q)) return false;
      }
      if (selectedDept) {
        const deptId = proj.team_id ? proj.teams?.department_id : proj.profiles?.department_id;
        if (deptId !== selectedDept) return false;
      }
      if (selectedStatus && proj.status !== selectedStatus) return false;
      if (selectedSession && proj.academic_session !== selectedSession) return false;
      return true;
    })
    .sort((a, b) => {
      if (activeTab === 'top_rated') return parseFloat(b.avg_score || '0') - parseFloat(a.avg_score || '0');
      if (activeTab === 'trending') return (b.ratings_count || 0) - (a.ratings_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const topProjects = [...projects]
    .sort((a, b) => parseFloat(b.avg_score || '0') - parseFloat(a.avg_score || '0'))
    .slice(0, 3);

  const statusColor: Record<string, { bg: string; text: string; border: string }> = {
    active:    { bg: '#DCFCE7', text: '#15803D', border: 'rgba(22,163,74,0.2)' },
    completed: { bg: '#DBEAFE', text: '#1D4ED8', border: 'rgba(37,99,235,0.2)' },
    draft:     { bg: '#FEF3C7', text: '#B45309', border: 'rgba(217,119,6,0.2)' },
    archived:  { bg: '#F1F5F9', text: '#64748B', border: 'rgba(100,116,139,0.2)' },
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto animate-fade-in">

      {/* ── Hero Banner ── */}
      <div
        className="relative rounded-[24px] overflow-hidden p-8 sm:p-10"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fcfdfe 55%, #f4f8fc 100%)',
          border: '1px solid rgba(226,232,240,0.5)',
          boxShadow: '0 8px 32px rgba(15,23,42,0.04)',
        }}
      >
        {/* Glow blobs */}
        <div className="hero-blob-blue" style={{ top: '-80px', right: '-60px' }} />
        <div className="hero-blob-purple" style={{ bottom: '-60px', left: '-40px' }} />
        <div className="hero-blob-green" style={{ top: '30%', right: '30%' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Discover &amp; Showcase{' '}
              <span style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Engineering Work
              </span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Explore academic portfolio projects, test live web deployments, and review student engineering creations from across departments.
            </p>
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                {projects.length} Projects Live
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--blue-primary)' }} />
                {departments.length} Departments
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link href="/projects" className="glass-button-green text-xs font-semibold px-5 py-2.5 animate-float">
              <FolderKanban className="h-4 w-4" />
              <span>My Workspaces</span>
            </Link>
            <Link href="/teams" className="glass-button-secondary text-xs font-semibold px-5 py-2.5">
              <Users className="h-4 w-4" style={{ color: 'var(--purple-primary)' }} />
              <span>Teams Directory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3-column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Filters */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-panel p-5 rounded-[18px] space-y-5 sticky top-20">
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center space-x-2" style={{ color: 'var(--text-muted)' }}>
                <Filter className="h-3.5 w-3.5" />
                <span>Filter Projects</span>
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[10px] flex items-center gap-1 transition-colors duration-200 font-semibold"
                style={{ color: 'var(--text-placeholder)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--blue-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-placeholder)'; }}
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </button>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label className="form-label">Keyword Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--text-placeholder)' }} />
                <input
                  type="text"
                  placeholder=" Title, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="glass-input pl-9 text-xs"
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="form-label">Department</label>
              <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="glass-input text-xs cursor-pointer">
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="form-label">Lifecycle Status</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="glass-input text-xs cursor-pointer">
                <option value="">All Statuses</option>
                <option value="active">Active (In Development)</option>
                <option value="completed">Completed (Final Release)</option>
                <option value="draft">Draft / Prototype</option>
              </select>
            </div>

            {/* Session */}
            <div className="space-y-1.5">
              <label className="form-label">Academic Session</label>
              <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="glass-input text-xs cursor-pointer">
                <option value="">All Sessions</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
                <option value="2023/2024">2023/2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Center: Feed */}
        <div className="lg:col-span-6 space-y-6">

          {/* Tab Bar */}
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar pb-1" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            {([
              { key: 'all', label: 'Latest Projects', icon: null },
              { key: 'trending', label: 'Most Discussed', icon: TrendingUp },
              { key: 'top_rated', label: 'Top Rated', icon: Star },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`github-tab ${activeTab === key ? 'github-tab-active' : ''}`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" style={{ color: activeTab === key ? 'var(--blue-primary)' : 'inherit' }} />}
                <span>{label}</span>
                {key === 'all' && (
                  <span className="badge-github text-[10px] ml-0.5">{filteredProjects.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Project Cards */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-panel p-6 rounded-[18px] space-y-3" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="glass-panel rounded-[18px] animate-fade-in">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>No Projects Found</h3>
                <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  No projects match your filter criteria. Try adjusting your filters.
                </p>
                <button onClick={handleResetFilters} className="glass-button-secondary text-xs py-2 px-5 mt-2">
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project, idx) => {
                const ownerName = project.team_id
                  ? (project.teams?.name || 'Engineering Team')
                  : (project.profiles?.full_name || 'Student Creator');
                const isTeamProject = !!project.team_id;
                const sc = statusColor[project.status] || statusColor.archived;

                return (
                  <div
                    key={project.id}
                    className="github-card space-y-4 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.06}s` }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: isTeamProject ? 'var(--purple-light)' : 'var(--blue-xlight)',
                            border: `1px solid ${isTeamProject ? 'rgba(124,58,237,0.15)' : 'rgba(37,99,235,0.15)'}`,
                          }}
                        >
                          {isTeamProject
                            ? <Users className="h-4 w-4" style={{ color: 'var(--purple-primary)' }} />
                            : <User className="h-4 w-4" style={{ color: 'var(--blue-primary)' }} />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            {ownerName} /
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-extrabold text-base line-clamp-1 transition-colors duration-200"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--blue-primary)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                          >
                            {project.title}
                          </Link>
                        </div>
                      </div>

                      {/* Rating */}
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                        style={{
                          background: 'var(--amber-light)',
                          border: '1px solid rgba(217,119,6,0.2)',
                        }}
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold" style={{ color: 'var(--amber-primary)' }}>{project.avg_score}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({project.ratings_count})</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {project.description || 'No description provided for this showcase workspace.'}
                    </p>

                    {/* Thumbnail */}
                    {project.thumbnail_url && (
                      <div className="relative rounded-xl overflow-hidden h-44 group" style={{ border: '1px solid var(--border-soft)' }}>
                        <img
                          src={project.thumbnail_url}
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="thumbnail-glass-overlay" />
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={isTeamProject ? 'badge-purple' : 'badge-github'}>
                          {isTeamProject ? 'Team Workspace' : 'Individual'}
                        </span>
                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                        >
                          {project.status}
                        </span>
                        {project.academic_session && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-placeholder)' }}>
                            {project.academic_session}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={project.project_link}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-button-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <span>Live Demo</span>
                          <ExternalLink className="h-3 w-3" style={{ color: 'var(--blue-primary)' }} />
                        </a>
                        <Link href={`/projects/${project.id}`} className="glass-button-accent text-xs py-1.5 px-3">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-5">

          {/* Top Rated */}
          <div className="glass-panel p-5 rounded-[18px] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Award className="h-4 w-4 text-amber-500" />
              Top Rated
            </h3>
            <div className="space-y-2">
              {topProjects.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-placeholder)' }}>No ratings yet.</p>
              ) : topProjects.map((tp, idx) => (
                <Link
                  key={tp.id}
                  href={`/projects/${tp.id}`}
                  className="block p-3 rounded-xl transition-all duration-200"
                  style={{ background: 'var(--bg-section)', border: '1px solid var(--border-soft)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.2)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-section)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-soft)';
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="truncate pr-2" style={{ color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--text-placeholder)' }}>{idx + 1}.</span> {tp.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0" style={{ color: '#B45309' }}>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{tp.avg_score}</span>
                    </div>
                  </div>
                  <p className="text-[10px] line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                    {tp.description || 'Top rated project'}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Guidelines */}
          <div
            className="glass-panel p-5 rounded-[18px] space-y-3"
            style={{ borderColor: 'rgba(22,163,74,0.2)', background: 'rgba(255,255,255,0.8)' }}
          >
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--green-primary)' }}>
              <BookOpen className="h-4 w-4" />
              <span>Platform Guidelines</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Every project workspace must include a valid live deployment link. Faculty members evaluate projects based on engineering architecture and documentation quality.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--blue-primary)' }}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Learn more about submission</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LandingShowcasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4">
        <div className="spinner" />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Loading Showcase...
        </span>
      </div>
    }>
      <ShowcaseFeedContent />
    </Suspense>
  );
}
