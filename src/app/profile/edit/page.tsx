'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { uploadToCloudinary } from '@/app/actions/upload';
import { User, Phone, Layers, Calendar, Upload, Save, ArrowLeft } from 'lucide-react';
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

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile, loading: authLoading } = useAuth();

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState('100');
  const [departmentId, setDepartmentId] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');

  // Dropdowns and UI states
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .order('name', { ascending: true });
        if (error) throw error;
        if (data) setDepartments(data);
      } catch (err: any) {
        console.error('Error fetching departments:', err.message);
      } finally {
        setLoadingDepts(false);
      }
    }
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setLevel(profile.level || '100');
      setDepartmentId(profile.department_id || '');
      setAcademicSession(profile.academic_session || '2025/2026');
      setPhone(profile.phone || '');
      setLinkedinUrl(profile.linkedin_url || '');
      setGithubUrl(profile.github_url || '');
      setProfilePictureUrl(profile.profile_picture_url || '');
      setAvatarPreview(profile.profile_picture_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
    }
  }, [profile, authLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let finalAvatarUrl = profilePictureUrl;

      if (avatarFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(avatarFile);
        const base64Data = await base64Promise;
        finalAvatarUrl = await uploadToCloudinary(base64Data);
      }

      const updateData: any = {
        full_name: fullName,
        username,
        department_id: departmentId || null,
        phone: phone || null,
        linkedin_url: linkedinUrl || null,
        github_url: githubUrl || null,
        profile_picture_url: finalAvatarUrl || null,
      };

      if (profile.role === 'student') {
        updateData.level = level;
        updateData.academic_session = academicSession;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        router.push(`/profile/${profile.id}`);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile details');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-4 text-xs text-[#8b949e] font-semibold uppercase tracking-wider">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <Link
          href={`/profile/${profile.id}`}
          className="inline-flex items-center space-x-2 text-[#8b949e] hover:text-white transition text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Profile</span>
        </Link>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-xl border-white/10 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h1 className="text-xl font-bold text-white">Edit Profile Settings</h1>
          <p className="text-[#8b949e] text-xs mt-1">Configure your developer profile and social links</p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-lg bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] text-xs font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-2 pb-5 border-b border-white/10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border border-white/15 bg-[#161b22] flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-[#8b949e]" />
                )}
              </div>
              <label
                htmlFor="avatar-edit-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition"
              >
                <Upload className="h-4 w-4 text-white" />
              </label>
              <input
                id="avatar-edit-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <span className="text-[11px] text-[#8b949e]">Change Profile Avatar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                disabled={loadingDepts}
              >
                <option value="">No Department selected</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            {profile.role === 'student' && (
              <>
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    className="w-full glass-input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full glass-input"
              />
            </div>

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

          <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
            <Link
              href={`/profile/${profile.id}`}
              className="glass-button-secondary text-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="glass-button text-xs cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
