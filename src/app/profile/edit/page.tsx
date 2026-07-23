'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { uploadToCloudinary } from '@/app/actions/upload';
import { User, Phone, Layers, Calendar, Upload, Save, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState('100');
  const [departmentId, setDepartmentId] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');

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
        const { data, error } = await supabase.from('departments').select('id, name').order('name', { ascending: true });
        if (error) throw error;
        if (data) setDepartments(data);
      } catch (err: any) { console.error('Error fetching departments:', err.message); } finally { setLoadingDepts(false); }
    }
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || ''); setUsername(profile.username || ''); setLevel(profile.level || '100');
      setDepartmentId(profile.department_id || ''); setAcademicSession(profile.academic_session || '2025/2026');
      setPhone(profile.phone || ''); setLinkedinUrl(profile.linkedin_url || ''); setGithubUrl(profile.github_url || '');
      setProfilePictureUrl(profile.profile_picture_url || ''); setAvatarPreview(profile.profile_picture_url || null);
    }
  }, [profile]);

  useEffect(() => { if (!authLoading && !profile) router.push('/login'); }, [profile, authLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setErrorMsg(''); setSuccessMsg('');
    try {
      let finalAvatarUrl = profilePictureUrl;
      if (avatarFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => { reader.onloadend = () => resolve(reader.result as string); reader.onerror = reject; });
        reader.readAsDataURL(avatarFile);
        const base64Data = await base64Promise;
        finalAvatarUrl = await uploadToCloudinary(base64Data);
      }
      const updateData: any = { full_name: fullName, username, department_id: departmentId || null, phone: phone || null, linkedin_url: linkedinUrl || null, github_url: githubUrl || null, profile_picture_url: finalAvatarUrl || null };
      if (profile.role === 'student') { updateData.level = level; updateData.academic_session = academicSession; }
      
      const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => router.push(`/profile/${profile.id}`), 1000);
    } catch (err: any) { setErrorMsg(err.message || 'Failed to update profile details'); } finally { setSaving(false); }
  };

  if (authLoading || !profile) return (
    <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4">
      <div className="spinner" />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading...</span>
    </div>
  );

  return (
    <div className="max-w-[800px] mx-auto space-y-6 pb-16 animate-fade-in">
      <div>
        <Link href={`/profile/${profile.id}`} className="inline-flex items-center gap-2 font-semibold hover:opacity-70 transition text-sm" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="h-4 w-4" /> <span>Back to Profile</span>
        </Link>
      </div>

      <div className="glass-panel p-8 sm:p-10 rounded-[24px] space-y-8 shadow-sm">
        <div className="border-b pb-6" style={{ borderColor: 'var(--border-soft)' }}>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Edit Profile Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Configure your developer portfolio and social links.</p>
        </div>

        {errorMsg && <div className="alert-error"><span>{errorMsg}</span><button onClick={() => setErrorMsg('')}><X className="h-4 w-4" /></button></div>}
        {successMsg && <div className="alert-success"><span>{successMsg}</span><button onClick={() => setSuccessMsg('')}><X className="h-4 w-4" /></button></div>}

        <form onSubmit={handleSave} className="space-y-8">
          
          <div className="flex flex-col items-center justify-center gap-3 pb-8 border-b" style={{ borderColor: 'var(--border-soft)' }}>
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-[3px] flex items-center justify-center overflow-hidden transition-all duration-300 shadow-sm" style={{ borderColor: 'var(--blue-primary)', background: 'var(--bg-section)' }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10" style={{ color: 'var(--text-placeholder)' }} />
                )}
              </div>
              <label htmlFor="avatar-edit-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition duration-300">
                <Upload className="h-6 w-6 text-white drop-shadow-md" />
              </label>
              <input id="avatar-edit-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Change Avatar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="form-label">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="glass-input" />
            </div>
            <div>
              <label className="form-label">Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="glass-input" />
            </div>

            <div>
              <label className="form-label">Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="glass-input cursor-pointer" disabled={loadingDepts}>
                <option value="">Select Department</option>
                {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="glass-input" />
            </div>

            {profile.role === 'student' && (
              <>
                <div>
                  <label className="form-label">Academic Level</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className="glass-input cursor-pointer">
                    <option value="100">100 Level</option> <option value="200">200 Level</option> <option value="300">300 Level</option>
                    <option value="400">400 Level</option> <option value="500">500 Level</option> <option value="MSc">MSc</option> <option value="PhD">PhD</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Academic Session</label>
                  <input type="text" value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} className="glass-input" />
                </div>
              </>
            )}

            <div>
              <label className="form-label">LinkedIn Profile URL</label>
              <input type="url" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="glass-input" />
            </div>
            <div>
              <label className="form-label">GitHub Profile URL</label>
              <input type="url" placeholder="https://github.com/..." value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="glass-input" />
            </div>
          </div>

          <div className="pt-8 border-t flex items-center justify-end gap-4" style={{ borderColor: 'var(--border-soft)' }}>
            <Link href={`/profile/${profile.id}`} className="glass-button-secondary text-sm px-6 py-2.5">Cancel</Link>
            <button type="submit" disabled={saving} className="glass-button text-sm px-8 py-2.5">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
