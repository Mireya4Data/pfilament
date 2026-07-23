'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary } from '@/app/actions/upload';
import { Upload, Mail, User, BookOpen, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function SignupPage() {
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  useEffect(() => {
    async function fetchDepts() {
      try {
        const { data } = await supabase.from('departments').select('id, name').order('name');
        if (data) { setDepartments(data); if (data.length > 0) setDepartmentId(data[0].id); }
      } catch {}
    }
    fetchDepts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { const f = e.target.files[0]; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg('');
    try {
      if (password.length < 6) throw new Error('Password must be at least 6 characters long');
      let profilePictureUrl = '';
      if (avatarFile) {
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => { reader.onloadend = () => res(reader.result as string); reader.onerror = rej; reader.readAsDataURL(avatarFile); });
        profilePictureUrl = await uploadToCloudinary(b64);
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, registration_number: registrationNumber, username } } });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup succeeded but no user returned.');

      let finalDeptId: string | null = null;
      if (customDepartmentName.trim()) {
        try {
          const { data: nd } = await supabase.from('departments').insert({ name: customDepartmentName.trim() }).select().single();
          if (nd) finalDeptId = nd.id;
        } catch {}
      }
      await supabase.from('profiles').update({ department_id: finalDeptId ?? null, level: role === 'student' ? level : null, academic_session: academicSession, phone: phone || null, linkedin_url: linkedinUrl || null, github_url: githubUrl || null, role, profile_picture_url: profilePictureUrl || null }).eq('id', authData.user.id);
      setRegisteredEmail(email); setEmailSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during signup');
    } finally { setLoading(false); }
  };

  /* ── Email Verification Screen ─────────────────────────────────── */
  if (emailSent) {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4">
        <div
          className="w-full max-w-md rounded-[24px] p-10 text-center animate-scale-in relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 24px 60px rgba(15,23,42,0.10)' }}
        >
          <div className="hero-blob-blue" style={{ width: '200px', height: '200px', top: '-80px', right: '-60px', opacity: 0.6 }} />
          <div className="hero-blob-green" style={{ width: '160px', height: '160px', bottom: '-60px', left: '-40px', opacity: 0.5 }} />

          <div className="relative z-10 flex flex-col items-center space-y-6">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center animate-float"
              style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(22,163,74,0.1))', border: '1px solid rgba(37,99,235,0.2)' }}
            >
              <Mail className="h-10 w-10" style={{ color: 'var(--blue-primary)' }} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Check Your Email</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>We sent a verification link to</p>
              <p className="text-sm font-bold break-all" style={{ color: 'var(--blue-primary)' }}>{registeredEmail}</p>
            </div>

            <div className="w-full p-5 rounded-2xl text-left space-y-3" style={{ background: 'var(--bg-section)', border: '1px solid var(--border-soft)' }}>
              <p className="form-label">Next Steps</p>
              {[
                'Open your email inbox and look for a message from SENFUTOPROJECTS',
                'Click the Verify Email link inside the email',
                "You'll be redirected and logged in automatically",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center mt-0.5 text-white"
                    style={{ background: i === 2 ? 'var(--green-primary)' : 'var(--blue-primary)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{step}</span>
                </div>
              ))}
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Didn&apos;t receive it? Check spam or{' '}
              <button onClick={() => setEmailSent(false)} className="font-bold" style={{ color: 'var(--blue-primary)' }}>try again</button>.
            </p>

            <Link href="/login" className="glass-button w-full justify-center py-3 text-sm font-bold">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Signup Form ─────────────────────────────────────────────── */
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div
          className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 animate-scale-in"
          style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 24px 60px rgba(15,23,42,0.10)' }}
        >
          <div className="hero-blob-blue" style={{ width: '240px', height: '240px', top: '-100px', right: '-80px', opacity: 0.6 }} />
          <div className="hero-blob-purple" style={{ width: '200px', height: '200px', bottom: '-80px', left: '-60px', opacity: 0.4 }} />

          {/* Header */}
          <div className="text-center mb-8 relative z-10 space-y-3">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Create Your Account</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Join <span style={{ color: 'var(--blue-primary)', fontWeight: 700 }}>SENFUTOPROJECTS</span> — portfolio &amp; collaboration platform
            </p>
          </div>

          {errorMsg && <div className="alert-error mb-6 animate-fade-in">{errorMsg}</div>}

          <form onSubmit={handleSignup} className="space-y-6 relative z-10">

            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-2 pb-6" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div className="relative group cursor-pointer">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300"
                  style={{ border: '3px solid rgba(37,99,235,0.2)', background: 'var(--bg-section)' }}
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    : <User className="h-10 w-10" style={{ color: 'var(--text-placeholder)' }} />
                  }
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(37,99,235,0.6)' }}
                >
                  <Upload className="h-5 w-5 text-white" />
                </label>
                <input id="avatar-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Profile Photo (optional)</span>
            </div>

            {/* Role toggle */}
            <div>
              <label className="form-label">Account Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['student', 'lecturer', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="py-2.5 text-xs font-semibold rounded-xl border transition-all duration-200 capitalize"
                    style={role === r
                      ? { background: 'rgba(37,99,235,0.08)', borderColor: 'var(--blue-primary)', color: 'var(--blue-primary)', boxShadow: '0 2px 8px rgba(37,99,235,0.12)' }
                      : { background: '#ffffff', borderColor: 'var(--border-soft)', color: 'var(--text-muted)' }
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: 'Full Name *', id: 'su-name', type: 'text', placeholder: 'John Doe', value: fullName, onChange: setFullName, required: true },
                { label: 'Email Address *', id: 'su-email', type: 'email', placeholder: 'user@university.edu', value: email, onChange: setEmail, required: true },
                { label: 'Username *', id: 'su-username', type: 'text', placeholder: 'johndoe', value: username, onChange: setUsername, required: true },
                { label: 'Password *', id: 'su-password', type: 'password', placeholder: '••••••••', value: password, onChange: setPassword, required: true },
                { label: 'Registration / ID Number *', id: 'su-regno', type: 'text', placeholder: 'e.g. 2021/102938', value: registrationNumber, onChange: setRegistrationNumber, required: true },
                { label: 'Academic Session', id: 'su-session', type: 'text', placeholder: '2025/2026', value: academicSession, onChange: setAcademicSession, required: false },
                { label: 'GitHub Profile URL', id: 'su-github', type: 'url', placeholder: 'https://github.com/username', value: githubUrl, onChange: setGithubUrl, required: false },
              ].map(({ label, id, type, placeholder, value, onChange, required }) => (
                <div key={id}>
                  <label className="form-label">{label}</label>
                  <input id={id} type={type} required={required} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="glass-input text-sm" />
                </div>
              ))}

              <div>
                <label className="form-label">Department (type to add new)</label>
                <input
                  id="su-dept"
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={customDepartmentName}
                  onChange={(e) => setCustomDepartmentName(e.target.value)}
                  className="glass-input text-sm"
                />
              </div>

              {role === 'student' && (
                <div>
                  <label className="form-label">Academic Level</label>
                  <select id="su-level" value={level} onChange={(e) => setLevel(e.target.value)} className="glass-input cursor-pointer text-sm">
                    {['100', '200', '300', '400', '500', 'MSc', 'PhD'].map((l) => (
                      <option key={l} value={l}>{l} {parseInt(l) ? 'Level' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full glass-button py-3 text-sm font-bold justify-center"
              style={{ borderRadius: '14px' }}
            >
              {loading
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Registering Account...</span>
                : <span className="flex items-center gap-2"><Check className="h-4 w-4" />Create Account</span>
              }
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-bold" style={{ color: 'var(--blue-primary)' }}>Log In</Link>
            </p>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--text-placeholder)' }} />
          <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>Premium Engineering Portfolio Platform</span>
        </div>
      </div>
    </div>
  );
}
