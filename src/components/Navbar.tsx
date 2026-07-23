'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Users, 
  FolderKanban, 
  Plus, 
  Search, 
  ChevronDown, 
  Compass, 
  UserPlus, 
  FolderPlus 
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isStudent, signOut } = useAuth();
  
  const [globalSearch, setGlobalSearch] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      router.push(`/?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Brand & Global Search */}
          <div className="flex items-center space-x-6 shrink-0">
            <Link href="/" className="flex items-center space-x-2 text-white group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-purple-600 to-emerald-500 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-[#0d1117] rounded-[7px] flex items-center justify-center group-hover:bg-transparent transition-colors">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
              </div>
              <span className="font-extrabold tracking-tight text-base text-white flex items-center gap-1.5">
                Showcase <span className="text-[#58a6ff] font-semibold text-xs px-1.5 py-0.5 rounded bg-[#58a6ff]/10 border border-[#58a6ff]/20">HUB</span>
              </span>
            </Link>

            {/* Global Search Bar (GitHub Style) */}
            <form onSubmit={handleGlobalSearch} className="hidden lg:block relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8b949e]" />
              <input
                type="text"
                placeholder="Search projects or teams..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-[#161b22] border border-white/10 text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition"
              />
            </form>
          </div>

          {/* Middle: Navigation Links (GitHub Tab Style) */}
          <div className="hidden md:flex items-center space-x-1">
            <Link 
              href="/" 
              className={`github-tab ${pathname === '/' ? 'github-tab-active' : ''}`}
            >
              <Compass className="h-4 w-4" />
              <span>Explore</span>
            </Link>
            
            {user && (
              <>
                <Link 
                  href="/projects" 
                  className={`github-tab ${pathname.startsWith('/projects') ? 'github-tab-active' : ''}`}
                >
                  <FolderKanban className="h-4 w-4" />
                  <span>Workspaces</span>
                </Link>
                
                {isStudent && (
                  <Link 
                    href="/teams" 
                    className={`github-tab ${pathname.startsWith('/teams') ? 'github-tab-active' : ''}`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Teams</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right: Quick Actions & Profile */}
          <div className="flex items-center space-x-3">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-white/10 flex items-center space-x-1 cursor-pointer transition"
                  title="Create or Join"
                >
                  <Plus className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 text-[#8b949e]" />
                </button>

                {/* Quick Add Dropdown Menu */}
                {showQuickAdd && (
                  <div 
                    onClick={() => setShowQuickAdd(false)}
                    className="absolute right-0 mt-2 w-48 rounded-lg bg-[#161b22] border border-white/10 shadow-2xl py-1 z-50 animate-fade-in"
                  >
                    <Link 
                      href="/projects" 
                      className="px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] hover:text-white flex items-center space-x-2"
                    >
                      <FolderPlus className="h-3.5 w-3.5 text-[#58a6ff]" />
                      <span>New Project Workspace</span>
                    </Link>
                    {isStudent && (
                      <>
                        <Link 
                          href="/teams?action=create" 
                          className="px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] hover:text-white flex items-center space-x-2"
                        >
                          <Plus className="h-3.5 w-3.5 text-[#3fb950]" />
                          <span>Create New Team</span>
                        </Link>
                        <Link 
                          href="/teams?action=join" 
                          className="px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] hover:text-white flex items-center space-x-2 border-t border-white/5"
                        >
                          <UserPlus className="h-3.5 w-3.5 text-[#a371f7]" />
                          <span>Join Team via Code</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profile Menu */}
            {profile ? (
              <div className="flex items-center space-x-3">
                <Link href={`/profile/${profile.id}`} className="flex items-center space-x-2.5 group">
                  <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-[#161b22] flex items-center justify-center transition group-hover:border-[#58a6ff]">
                    {profile.profile_picture_url ? (
                      <img
                        src={profile.profile_picture_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-[#8b949e]" />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-white group-hover:text-[#58a6ff] transition line-clamp-1">
                      {profile.full_name}
                    </div>
                    <div className="text-[9px] text-[#8b949e] uppercase font-semibold">
                      {profile.role}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-2 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-white/10 text-[#8b949e] hover:text-white transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#c9d1d9] hover:text-white px-3 py-1.5 transition"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs font-semibold glass-button px-3.5 py-1.5"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Nav Links Bar */}
      {user && (
        <div className="md:hidden flex items-center justify-around py-2 bg-[#090d16] border-t border-white/10 text-xs">
          <Link 
            href="/" 
            className={`flex items-center space-x-1 ${pathname === '/' ? 'text-[#58a6ff] font-bold' : 'text-[#8b949e]'}`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Explore</span>
          </Link>
          <Link 
            href="/projects" 
            className={`flex items-center space-x-1 ${pathname.startsWith('/projects') ? 'text-[#58a6ff] font-bold' : 'text-[#8b949e]'}`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Workspaces</span>
          </Link>
          {isStudent && (
            <Link 
              href="/teams" 
              className={`flex items-center space-x-1 ${pathname.startsWith('/teams') ? 'text-[#58a6ff] font-bold' : 'text-[#8b949e]'}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Teams</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
