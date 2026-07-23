'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4">
      {/* Outer glow wrapper */}
      <div className="w-full max-w-md">

        {/* Card */}
        <div
          className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 animate-scale-in"
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(226,232,240,0.9)',
            boxShadow: '0 24px 60px rgba(15,23,42,0.10), 0 0 0 1px rgba(255,255,255,0.6)',
          }}
        >
          {/* Decorative blobs */}
          <div className="hero-blob-blue" style={{ width: '220px', height: '220px', top: '-100px', right: '-80px', opacity: 0.7 }} />
          <div className="hero-blob-purple" style={{ width: '180px', height: '180px', bottom: '-80px', left: '-60px', opacity: 0.5 }} />

          {/* Header */}
          <div className="text-center mb-8 relative z-10 space-y-3 animate-fade-in">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              }}
            >
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                Welcome Back
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Sign in to your <span style={{ color: 'var(--blue-primary)', fontWeight: 700 }}>SENFUTOPROJECTS</span> workspace
              </p>
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="alert-error mb-6 animate-fade-in">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-placeholder)' }} />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="email@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input pl-11"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-placeholder)' }} />
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input pl-11"
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full glass-button py-3 text-sm font-bold mt-2 justify-center"
              style={{ borderRadius: '14px', fontSize: '0.9rem', letterSpacing: '0.02em' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing In...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-bold transition-colors duration-200" style={{ color: 'var(--blue-primary)' }}>
                Create one free
              </Link>
            </p>
          </form>
        </div>

        {/* Below-card badge */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--text-placeholder)' }} />
          <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>
            Premium Engineering Portfolio Platform
          </span>
        </div>
      </div>
    </div>
  );
}
