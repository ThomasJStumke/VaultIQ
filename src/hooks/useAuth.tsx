import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

// Compat shim: several components read `user.uid` (a holdover from the old
// Firebase User shape). Supabase's auth user only has `.id`, so `uid` is
// stamped onto the session user client-side and kept equal to `profile.uid`.
type AuthUser = SupabaseUser & { uid: string };

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loginError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ProfileRow {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role: string;
  faculty_id: string | null;
  department_id: string | null;
  assigned_modules: string[];
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role as UserRole,
    facultyId: row.faculty_id ?? undefined,
    departmentId: row.department_id ?? undefined,
    assignedModules: row.assigned_modules ?? [],
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const clearError = () => setLoginError(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;

      if (sessionUser) {
        try {
          const { data, error } = await supabase.rpc('bootstrap_profile');
          if (error) throw error;

          const mappedProfile = mapProfileRow(data as ProfileRow);
          setProfile(mappedProfile);
          setUser({ ...sessionUser, uid: mappedProfile.uid });
        } catch (err: any) {
          if (String(err?.message ?? err).includes('NOT_PROVISIONED')) {
            setLoginError('Your account has not been set up on this platform yet. Please contact your Faculty Admin or Head of Department.');
          } else {
            console.error('Auth bootstrap error:', err);
            setLoginError(err?.message || 'An authentication error occurred.');
          }
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async () => {
    // Local dev bypass: skip Microsoft OAuth and sign in anonymously so
    // Supabase's RLS policies (which require auth.uid() != null) still pass.
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // onAuthStateChange picks up the new session, bootstraps the profile, and clears loading.
    } catch (err: any) {
      console.error('Anonymous sign-in failed:', err);
      setLoginError(err.message || 'An authentication error occurred.');
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const setRole = async (role: UserRole) => {
    if (profile && user) {
      const updatedProfile = { ...profile, role };
      setProfile(updatedProfile);
      try {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', profile.uid);
        if (error) throw error;
      } catch (err) {
        console.error('Error updating role in database', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginError, login, logout, setRole, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
