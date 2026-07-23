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
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-white/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Brand & Global Search */}
          <div className="flex items-center space-x-6 shrink-0">
            <Link href="/" className="flex items-center space-x-2 text-white group shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-purple-600 to-emerald-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[7px] flex items-center justify-center group-hover:bg-transparent transition-colors">
                  <BookOpen className="h-4 w-4 text-[#1a7fe0]" />
                </div>
              </div>
              <span className="font-extrabold tracking-tight text-base text-[#0d1117]">
                SENF<span className="text-[#1a7fe0]">U</span>TOPROJECTS
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
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-white border border-black/10 text-[#0d1117] placeholder-[#57606a] focus:outline-none focus:border-[#1a7fe0] focus:ring-1 focus:ring-[#1a7fe0] transition"
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
                  className="p-1.5 rounded-md bg-[#f0f3f8] hover:bg-[#e4e8f0] text-[#57606a] border border-black/10 flex items-center space-x-1 cursor-pointer transition"
                  title="Create or Join"
                >
                  <Plus className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 text-[#8b949e]" />
                </button>

                {/* Quick Add Dropdown Menu */}
                {showQuickAdd && (
                  <div 
                    onClick={() => setShowQuickAdd(false)}
                    className="absolute right-0 mt-2 w-48 rounded-lg bg-white border border-black/10 shadow-xl py-1 z-50 animate-fade-in"
                  >
                    <Link 
                      href="/projects" 
                      className="px-3 py-2 text-xs text-[#57606a] hover:bg-[#f0f3f8] hover:text-[#0d1117] flex items-center space-x-2"
                    >
                      <FolderPlus className="h-3.5 w-3.5 text-[#58a6ff]" />
                      <span>New Project Workspace</span>
                    </Link>
                    {isStudent && (
                      <>
                        <Link 
                          href="/teams?action=create" 
                          className="px-3 py-2 text-xs text-[#57606a] hover:bg-[#f0f3f8] hover:text-[#0d1117] flex items-center space-x-2"
                        >
                          <Plus className="h-3.5 w-3.5 text-[#3fb950]" />
                          <span>Create New Team</span>
                        </Link>
                        <Link 
                          href="/teams?action=join" 
                          className="px-3 py-2 text-xs text-[#57606a] hover:bg-[#f0f3f8] hover:text-[#0d1117] flex items-center space-x-2 border-t border-black/5"
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
                  <div className="w-8 h-8 rounded-full border border-black/15 overflow-hidden bg-[#f0f3f8] flex items-center justify-center transition group-hover:border-[#1a7fe0]">
                    {profile.profile_picture_url ? (
                      <img
                        src={profile.profile_picture_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-[#57606a]" />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-[#0d1117] group-hover:text-[#1a7fe0] transition line-clamp-1">
                      {profile.full_name}
                    </div>
                      <div className="text-[9px] text-[#57606a] uppercase font-semibold">
                      {profile.role}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-2 rounded-md bg-[#f0f3f8] hover:bg-[#e4e8f0] border border-black/10 text-[#57606a] hover:text-[#0d1117] transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#57606a] hover:text-[#0d1117] px-3 py-1.5 rounded-md border border-black/10 hover:border-black/20 transition whitespace-nowrap"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs font-semibold glass-button px-3 py-1.5 whitespace-nowrap"
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
        <div className="md:hidden flex items-center justify-around py-2 bg-[#f4f6fb] border-t border-black/10 text-xs">
          <Link 
            href="/" 
            className={`flex items-center space-x-1 ${pathname === '/' ? 'text-[#1a7fe0] font-bold' : 'text-[#57606a]'}`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Explore</span>
          </Link>
          <Link 
            href="/projects" 
            className={`flex items-center space-x-1 ${pathname.startsWith('/projects') ? 'text-[#1a7fe0] font-bold' : 'text-[#57606a]'}`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Workspaces</span>
          </Link>
          {isStudent && (
            <Link 
              href="/teams" 
              className={`flex items-center space-x-1 ${pathname.startsWith('/teams') ? 'text-[#1a7fe0] font-bold' : 'text-[#57606a]'}`}
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
