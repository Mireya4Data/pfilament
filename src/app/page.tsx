'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  Search, 
  Filter, 
  Star, 
  ExternalLink, 
  Layers, 
  BookOpen, 
  User, 
  RefreshCw, 
  FolderKanban, 
  Sparkles,
  TrendingUp,
  Award,
  ArrowUpRight,
  Users
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
  teams?: {
    name: string;
    department_id: string | null;
  } | null;
  profiles?: {
    full_name: string;
    level: string | null;
    department_id: string | null;
  } | null;
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

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'trending' | 'top_rated'>('all');

  // Read URL search param if present (from navbar search bar)
  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch) {
      setSearch(querySearch);
    }
  }, [searchParams]);

  useEffect(() => {
    loadShowcaseData();
  }, []);

  const loadShowcaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch departments
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true });
      if (depts) setDepartments(depts);

      // 2. Fetch projects with teams and profiles
      const { data: projs, error } = await supabase
        .from('projects')
        .select(`
          *,
          teams:team_id(name, department_id),
          profiles:owner_id(full_name, level, department_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 3. Fetch ratings for each project
      const enrichedProjects: Project[] = [];
      if (projs) {
        for (const p of projs) {
          const { data: rates } = await supabase
            .from('project_ratings')
            .select('score')
            .eq('project_id', p.id);

          let avg = '0.0';
          let count = 0;
          if (rates && rates.length > 0) {
            count = rates.length;
            avg = (rates.reduce((sum, r) => sum + r.score, 0) / count).toFixed(1);
          }
          
          enrichedProjects.push({
            ...p,
            avg_score: avg,
            ratings_count: count
          });
        }
      }

      setProjects(enrichedProjects);
    } catch (err: any) {
      console.error('Error loading showcase:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDept('');
    setSelectedStatus('');
    setSelectedSession('');
    setActiveTab('all');
  };

  // Filter and sort projects
  const filteredProjects = projects
    .filter((proj) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = proj.title.toLowerCase().includes(q);
        const descMatch = proj.description?.toLowerCase().includes(q) || false;
        const ownerMatch = proj.teams?.name.toLowerCase().includes(q) || proj.profiles?.full_name.toLowerCase().includes(q) || false;
        if (!titleMatch && !descMatch && !ownerMatch) return false;
      }

      // Department
      if (selectedDept) {
        const projectDeptId = proj.team_id ? proj.teams?.department_id : proj.profiles?.department_id;
        if (projectDeptId !== selectedDept) return false;
      }

      // Status
      if (selectedStatus) {
        if (proj.status !== selectedStatus) return false;
      }

      // Session
      if (selectedSession) {
        if (proj.academic_session !== selectedSession) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (activeTab === 'top_rated') {
        return parseFloat(b.avg_score || '0') - parseFloat(a.avg_score || '0');
      }
      if (activeTab === 'trending') {
        return (b.ratings_count || 0) - (a.ratings_count || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Top 3 rated projects for right sidebar
  const topProjects = [...projects]
    .sort((a, b) => parseFloat(b.avg_score || '0') - parseFloat(a.avg_score || '0'))
    .slice(0, 3);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      
      {/* GitHub/Reddit Style Jumbotron Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 text-[10px] uppercase font-mono font-bold tracking-widest text-[#58a6ff] bg-[#58a6ff]/10 px-3 py-1 rounded-full border border-[#58a6ff]/20">
              <Sparkles className="h-3 w-3" />
              <span>GitHub-Style Project & Portfolio Hub</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Discover & Showcase Engineering Work
            </h1>
            
            <p className="text-xs sm:text-sm text-[#8b949e] font-normal leading-relaxed">
              Explore academic portfolio projects, view team repositories, direct-test web deployments, and review student creations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/projects" className="glass-button text-xs font-semibold px-4 py-2.5">
              <FolderKanban className="h-4 w-4" />
              <span>My Workspaces</span>
            </Link>
            <Link href="/teams" className="glass-button-secondary text-xs font-semibold px-4 py-2.5">
              <Users className="h-4 w-4 text-[#a371f7]" />
              <span>Teams Directory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Filters Sidebar, Center Feed, Right Trending Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Filters & Navigation (Col 3) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-5 rounded-xl space-y-5 sticky top-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter Projects</span>
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-[#8b949e] hover:text-white transition flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8b949e]">Keyword Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-[#8b949e]" />
                <input
                  type="text"
                  placeholder="Filter by title, desc..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="glass-input pl-9 text-xs"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8b949e]">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="glass-input bg-[#0d1117] text-xs cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8b949e]">Lifecycle Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="glass-input bg-[#0d1117] text-xs cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="active">Active (In Development)</option>
                <option value="completed">Completed (Final Release)</option>
                <option value="draft">Draft / Prototype</option>
              </select>
            </div>

            {/* Academic Session Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8b949e]">Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="glass-input bg-[#0d1117] text-xs cursor-pointer"
              >
                <option value="">All Sessions</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
                <option value="2023/2024">2023/2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Center Main Column: GitHub Feed Tabs & Project Repository Cards (Col 6) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Feed Navigation Tabs (GitHub Tab Bar) */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`github-tab ${activeTab === 'all' ? 'github-tab-active' : ''}`}
              >
                <span>Latest Projects</span>
                <span className="badge-github text-[10px]">{filteredProjects.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`github-tab ${activeTab === 'trending' ? 'github-tab-active' : ''}`}
              >
                <TrendingUp className="h-3.5 w-3.5 text-[#58a6ff]" />
                <span>Most Discussed</span>
              </button>
              <button
                onClick={() => setActiveTab('top_rated')}
                className={`github-tab ${activeTab === 'top_rated' ? 'github-tab-active' : ''}`}
              >
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>Top Rated</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-[#8b949e]">Fetching repository feed...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-xl space-y-3">
              <Layers className="h-10 w-10 text-[#8b949e] mx-auto" />
              <h3 className="text-white font-bold text-sm">No Projects Found</h3>
              <p className="text-[#8b949e] text-xs max-w-sm mx-auto">
                No showcase projects match your filter criteria. Try resetting filters or creating a new workspace.
              </p>
              <button onClick={handleResetFilters} className="glass-button-secondary text-xs py-1.5 px-4">
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => {
                const ownerName = project.team_id 
                  ? (project.teams?.name || 'Engineering Team') 
                  : (project.profiles?.full_name || 'Student Creator');
                
                const isTeamProject = !!project.team_id;

                return (
                  <div key={project.id} className="github-card space-y-4">
                    
                    {/* Header: Owner Avatar / Repo Title / Rating Pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#161b22] border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {isTeamProject ? (
                            <Users className="h-4 w-4 text-[#a371f7]" />
                          ) : (
                            <User className="h-4 w-4 text-[#58a6ff]" />
                          )}
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 text-xs font-mono text-[#8b949e]">
                            <span className="truncate hover:underline cursor-pointer">{ownerName}</span>
                            <span>/</span>
                          </div>
                          
                          <Link 
                            href={`/projects/${project.id}`} 
                            className="font-extrabold text-base text-white hover:text-[#58a6ff] transition line-clamp-1 flex items-center gap-1.5"
                          >
                            <span>{project.title}</span>
                          </Link>
                        </div>
                      </div>

                      {/* Rating Badge */}
                      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold shrink-0">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{project.avg_score}</span>
                        <span className="text-[10px] text-[#8b949e] font-normal">({project.ratings_count})</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#c9d1d9] leading-relaxed line-clamp-2">
                      {project.description || 'No description provided for this showcase workspace.'}
                    </p>

                    {/* Optional Thumbnail preview */}
                    {project.thumbnail_url && (
                      <div className="relative rounded-lg overflow-hidden border border-white/10 h-44 bg-[#0d1117] group">
                        <img 
                          src={project.thumbnail_url} 
                          alt={project.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="thumbnail-glass-overlay" />
                      </div>
                    )}

                    {/* Badges & Actions Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge-github ${isTeamProject ? 'badge-purple' : ''}`}>
                          {isTeamProject ? 'Team Workspace' : 'Individual'}
                        </span>
                        
                        <span className="badge-green capitalize">
                          {project.status}
                        </span>

                        {project.academic_session && (
                          <span className="text-[10px] font-mono text-[#8b949e]">
                            Session: {project.academic_session}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <a
                          href={project.project_link}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-button-secondary text-xs py-1 px-2.5 flex items-center space-x-1"
                        >
                          <span>Live Demo</span>
                          <ArrowUpRight className="h-3 w-3 text-[#58a6ff]" />
                        </a>

                        <Link
                          href={`/projects/${project.id}`}
                          className="glass-button-accent text-xs py-1 px-3"
                        >
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

        {/* Right Sidebar: Top Featured Showcase & Stats (Col 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Top Rated Standouts */}
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center space-x-2">
              <Award className="h-4 w-4 text-amber-400" />
              <span>Top Rated Standouts</span>
            </h3>

            <div className="space-y-3">
              {topProjects.map((tp, idx) => (
                <Link 
                  key={tp.id} 
                  href={`/projects/${tp.id}`}
                  className="block p-3 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-white/5 transition"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="truncate pr-2">{idx + 1}. {tp.title}</span>
                    <div className="flex items-center space-x-1 text-amber-300 shrink-0">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{tp.avg_score}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#8b949e] line-clamp-1">
                    {tp.description || 'Top rated student project'}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Platform Guidelines Card */}
          <div className="glass-panel p-5 rounded-xl space-y-3 border-emerald-500/20">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#3fb950]">
              <BookOpen className="h-4 w-4" />
              <span>Platform Guidelines</span>
            </div>
            <p className="text-[11px] text-[#8b949e] leading-relaxed">
              Every project workspace must include a valid live deployment link. Faculty members evaluate projects based on engineering architecture and documentation.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function LandingShowcasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ShowcaseFeedContent />
    </Suspense>
  );
}
