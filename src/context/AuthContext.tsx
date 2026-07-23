'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  registration_number: string;
  department_id: string | null;
  level: string | null;
  email: string;
  username: string;
  profile_picture_url: string | null;
  academic_session: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  role: 'student' | 'lecturer' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isStudent: boolean;
  isLecturer: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isStudent: false,
  isLecturer: false,
  isAdmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }
      if (data) {
        setProfile(data as Profile);

        // Check if database needs department seeding
        // We attempt to seed for any authenticated user session if empty to prevent empty database dropdowns
        const { data: depts, error: deptsErr } = await supabase
          .from('departments')
          .select('id')
          .limit(1);

        if (!deptsErr && (!depts || depts.length === 0)) {
          // Auto seed typical departments
          const typicalDepts = [
            { name: 'Computer Science' },
            { name: 'Software Engineering' },
            { name: 'Information Technology' },
            { name: 'Cyber Security' },
            { name: 'Electrical & Electronic Engineering' },
            { name: 'Mechanical Engineering' },
          ];
          await supabase.from('departments').insert(typicalDepts);
          console.log('Seeded typical departments successfully.');
        }
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err.message);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        setLoading(true);
        await fetchProfile(currentUser.id);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const isStudent = profile?.role === 'student';
  const isLecturer = profile?.role === 'lecturer';
  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isStudent,
        isLecturer,
        isAdmin,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
