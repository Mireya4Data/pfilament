'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, ArrowRight, BookOpen } from 'lucide-react';
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-2xl relative overflow-hidden border-white/10">
        
        {/* Glow accent */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#58a6ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#a371f7]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative animate-fade-in space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 p-0.5 mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-[#0d1117] rounded-[10px] flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-[#58a6ff]" />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-white">
            Welcome Back
          </h2>
          <p className="text-xs text-[#8b949e]">
            Sign in to your Fillamanet workspace
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b949e] pointer-events-none" />
              <input
                type="email"
                required
                placeholder="email@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b949e] pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-button mt-4 justify-center py-2.5 text-xs uppercase font-semibold tracking-wider cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-[#8b949e] mt-4">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#58a6ff] hover:underline font-semibold">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
