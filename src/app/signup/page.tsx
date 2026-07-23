'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary } from '@/app/actions/upload';
import { Upload, Lock, Mail, User, Phone, BookOpen, Layers, Calendar, UserCheck } from 'lucide-react';
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

export default function SignupPage() {
  const router = useRouter();
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState('100');
  const [departmentId, setDepartmentId] = useState('');
  const [customDepartmentName, setCustomDepartmentName] = useState('');
  const [academicSession, setAcademicSession] = useState('2025/2026');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer' | 'admin'>('student');
  
  // File upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Status states
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch departments
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (error) throw error;
        if (data) {
          setDepartments(data);
          if (data.length > 0) {
            setDepartmentId(data[0].id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching departments:', err.message);
      }
    }
    fetchDepartments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      let profilePictureUrl = '';
      if (avatarFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(avatarFile);
        const base64Data = await base64Promise;
        profilePictureUrl = await uploadToCloudinary(base64Data);
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            registration_number: registrationNumber,
            username,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Signup succeeded but no user details returned.');
      }

      let finalDeptId = departmentId;
      if ((departments.length === 0 || departmentId === 'other') && customDepartmentName.trim()) {
        try {
          const { data: newDept } = await supabase
            .from('departments')
            .insert({ name: customDepartmentName.trim() })
            .select()
            .single();
          if (newDept) {
            finalDeptId = newDept.id;
          }
        } catch (err) {
          console.error('Error inserting custom department:', err);
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          department_id: finalDeptId && finalDeptId !== 'other' ? finalDeptId : null,
          level: role === 'student' ? level : null,
          academic_session: academicSession,
          phone: phone || null,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          role,
          profile_picture_url: profilePictureUrl || null,
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.warn('Profile updates will complete upon login context:', updateError.message);
      }

      setSuccessMsg('Registration successful! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl glass-panel p-8 sm:p-10 rounded-2xl relative overflow-hidden border-white/10">
        
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#58a6ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#a371f7]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 p-0.5 mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-[#0d1117] rounded-[10px] flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-[#58a6ff]" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Create Developer Account
          </h2>
          <p className="text-xs text-[#8b949e]">
            Join the Showcase & Collaboration Platform
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-lg bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] text-xs font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center space-y-2 pb-4 border-b border-white/10">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border border-white/15 bg-[#161b22] flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-[#8b949e]" />
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition"
              >
                <Upload className="h-4 w-4 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <span className="text-[11px] text-[#8b949e]">Profile Avatar (Cloudinary)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="user@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Username *
              </label>
              <input
                type="text"
                required
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Password *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Account Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full glass-input bg-[#0d1117] cursor-pointer"
              >
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Registration / ID Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2021/102938"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full glass-input bg-[#0d1117] cursor-pointer"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Academic Session
              </label>
              <input
                type="text"
                placeholder="e.g. 2025/2026"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            {role === 'student' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                  Academic Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full glass-input bg-[#0d1117] cursor-pointer"
                >
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                  <option value="MSc">MSc</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                GitHub Profile URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full glass-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-button mt-4 justify-center py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            {loading ? 'Registering Account...' : 'Create Account'}
          </button>

          <p className="text-center text-xs text-[#8b949e] mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-[#58a6ff] hover:underline font-semibold">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
