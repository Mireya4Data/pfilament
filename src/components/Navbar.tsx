'use client';

import React, { useState, useEffect } from 'react';
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
  FolderPlus,
  X,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isStudent, signOut } = useAuth();

  const [globalSearch, setGlobalSearch] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      router.push(`/?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const navLinks = [
    { href: '/', label: 'Explore', icon: Compass, active: pathname === '/' },
    ...(user
      ? [
          { href: '/projects', label: 'Workspaces', icon: FolderKanban, active: pathname.startsWith('/projects') },
          ...(isStudent
            ? [{ href: '/teams', label: 'Teams', icon: Users, active: pathname.startsWith('/teams') }]
            : []),
        ]
      : []),
  ];

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
        boxShadow: scrolled ? '0 4px 24px rgba(15,23,42,0.06)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* ── Left: Brand & Search ── */}
          <div className="flex items-center space-x-5 shrink-0">
            <Link href="/" className="flex items-center space-x-2.5 group shrink-0">
              {/* Logo Mark */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
              >
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span
                className="font-extrabold tracking-tight text-base hidden sm:inline"
                style={{ color: 'var(--text-primary)' }}
              >
                SENF<span style={{ color: 'var(--blue-primary)' }}>U</span>TOPROJECTS
              </span>
            </Link>

            {/* Global Search */}
            <form onSubmit={handleGlobalSearch} className="hidden lg:block relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                style={{ color: 'var(--text-placeholder)' }}
              />
              <input
                type="text"
                placeholder="Search projects or teams..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '240px',
                  paddingLeft: '2.25rem',
                  paddingRight: globalSearch ? '2.25rem' : '12px',
                  paddingTop: '7px',
                  paddingBottom: '7px',
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--blue-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-soft)';
                  e.target.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
                }}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-placeholder)' }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </form>
          </div>

          {/* ── Middle: Nav Links ── */}
          <div className="hidden md:flex items-center space-x-0.5">
            {navLinks.map(({ href, label, icon: Icon, active }) => (
              <Link
                key={href}
                href={href}
                className="github-tab"
                style={active ? { color: 'var(--text-primary)', borderBottomColor: 'var(--blue-primary)', background: 'rgba(37,99,235,0.04)' } : {}}
              >
                <Icon className="h-4 w-4" style={{ color: active ? 'var(--blue-primary)' : 'inherit' }} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* ── Right: Actions & Profile ── */}
          <div className="flex items-center space-x-2.5">
            {/* Quick Add Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer"
                  style={{
                    background: showQuickAdd ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.8)',
                    borderColor: showQuickAdd ? 'rgba(37,99,235,0.3)' : 'var(--border-soft)',
                    color: showQuickAdd ? 'var(--blue-primary)' : 'var(--text-secondary)',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" style={{ transition: 'transform 0.2s', transform: showQuickAdd ? 'rotate(180deg)' : 'none' }} />
                </button>

                {showQuickAdd && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl py-1.5 z-50 animate-scale-in"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(226,232,240,0.8)',
                      boxShadow: '0 20px 50px rgba(15,23,42,0.12), 0 0 0 1px rgba(255,255,255,0.5)',
                    }}
                    onClick={() => setShowQuickAdd(false)}
                  >
                    <p
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-placeholder)' }}
                    >
                      Quick Create
                    </p>
                    <Link
                      href="/projects"
                      className="flex items-center space-x-2.5 px-3 py-2.5 mx-1 rounded-xl transition-all duration-150"
                      style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-xlight)' }}>
                        <FolderPlus className="h-3.5 w-3.5" style={{ color: 'var(--blue-primary)' }} />
                      </div>
                      <span>New Project Workspace</span>
                    </Link>
                    {isStudent && (
                      <>
                        <Link
                          href="/teams?action=create"
                          className="flex items-center space-x-2.5 px-3 py-2.5 mx-1 rounded-xl transition-all duration-150"
                          style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-light)' }}>
                            <Plus className="h-3.5 w-3.5" style={{ color: 'var(--green-primary)' }} />
                          </div>
                          <span>Create New Team</span>
                        </Link>
                        <div style={{ borderTop: '1px solid var(--border-soft)', margin: '4px 12px' }} />
                        <Link
                          href="/teams?action=join"
                          className="flex items-center space-x-2.5 px-3 py-2.5 mx-1 rounded-xl transition-all duration-150"
                          style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--purple-light)' }}>
                            <UserPlus className="h-3.5 w-3.5" style={{ color: 'var(--purple-primary)' }} />
                          </div>
                          <span>Join Team via Code</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profile or Auth Buttons */}
            {profile ? (
              <div className="flex items-center space-x-2">
                <Link
                  href={`/profile/${profile.id}`}
                  className="flex items-center space-x-2.5 group px-2 py-1.5 rounded-xl transition-all duration-200"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200"
                    style={{
                      border: '2px solid var(--border-soft)',
                      background: 'var(--bg-section)',
                    }}
                  >
                    {profile.profile_picture_url ? (
                      <img src={profile.profile_picture_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold line-clamp-1 transition-colors duration-200"
                      style={{ color: 'var(--text-primary)' }}>
                      {profile.full_name}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-placeholder)' }}>
                      {profile.role}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="icon-btn"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all duration-200"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-soft)',
                    background: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-section)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#ffffff';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  Log In
                </Link>
                <Link href="/signup" className="glass-button text-xs px-4 py-2">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      {user && (
        <div
          className="md:hidden flex items-center justify-around py-2.5"
          style={{
            borderTop: '1px solid var(--border-soft)',
            background: 'rgba(248,250,252,0.9)',
          }}
        >
          {navLinks.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center space-y-0.5 px-4 py-1 rounded-xl transition-all duration-200"
              style={{ color: active ? 'var(--blue-primary)' : 'var(--text-muted)' }}
            >
              <Icon className="h-4 w-4" />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
