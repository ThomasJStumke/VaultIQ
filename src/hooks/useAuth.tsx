import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import {
  getUserRoleAssignments,
  getAllPages,
  getVisiblePagesForRoles,
  getPageActionsForRoles,
  addRoleToUser,
  VisiblePage,
} from '../services/rbacService';

// Compat shim: several components read `user.uid` (a holdover from the old
// Firebase User shape). Supabase's auth user only has `.id`, so `uid` is
// stamped onto the session user client-side and kept equal to `profile.uid`.
type AuthUser = SupabaseUser & { uid: string };

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loginError: string | null;
  isSuperAdmin: boolean;
  visiblePages: VisiblePage[];
  pageActions: Record<string, string[]>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addRole: (role: UserRole) => Promise<void>;
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

function mapProfileRow(row: ProfileRow, roles: UserRole[]): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role as UserRole,
    roles,
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [visiblePages, setVisiblePages] = useState<VisiblePage[]>([]);
  const [pageActions, setPageActions] = useState<Record<string, string[]>>({});

  const clearError = () => setLoginError(null);

  const loadAccess = async (profileId: string, fallbackRole: UserRole = 'LECTURER') => {
    const assignments = await getUserRoleAssignments(profileId);
    const roles: UserRole[] = assignments.length > 0 ? assignments.map((a) => a.name) : [fallbackRole];
    const superAdmin = roles.includes('SUPER_ADMIN');
    setIsSuperAdmin(superAdmin);

    if (superAdmin) {
      setVisiblePages(await getAllPages());
      setPageActions({}); // super admin bypasses action checks entirely, see hasAction below
    } else {
      const roleIds = assignments.map((a) => a.roleId);
      const [pages, actions] = await Promise.all([
        getVisiblePagesForRoles(roleIds),
        getPageActionsForRoles(roleIds),
      ]);
      setVisiblePages(pages);
      setPageActions(actions);
    }
    return roles;
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;

      if (sessionUser) {
        try {
          const { data, error } = await supabase.rpc('bootstrap_profile', {
            p_role: sessionUser.user_metadata?.role ?? null,
          });
          if (error) throw error;

          const row = data as ProfileRow;
          const roles = await loadAccess(row.id, row.role as UserRole);
          const mappedProfile = mapProfileRow(row, roles);
          setProfile(mappedProfile);
          setUser({ ...sessionUser, uid: mappedProfile.uid });
        } catch (err: any) {
          console.error('Auth bootstrap error:', err);
          setLoginError(err?.message || 'An authentication error occurred.');
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setVisiblePages([]);
        setPageActions({});
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const addRole = async (role: UserRole) => {
    if (!profile) return;
    const assignments = await getUserRoleAssignments(profile.uid);
    if (assignments.some((a) => a.name === role)) return;
    const { data } = await supabase.from('roles').select('id').eq('name', role).single();
    if (data?.id) {
      await addRoleToUser(profile.uid, data.id);
      const roles = await loadAccess(profile.uid);
      setProfile({ ...profile, roles });
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, loginError, isSuperAdmin, visiblePages, pageActions, login, logout, addRole, clearError }}
    >
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

export function hasPage(visiblePages: VisiblePage[], isSuperAdmin: boolean, pageKey: string): boolean {
  return isSuperAdmin || visiblePages.some((p) => p.key === pageKey);
}

export function hasAction(
  pageActions: Record<string, string[]>,
  isSuperAdmin: boolean,
  pageKey: string,
  actionKey: string
): boolean {
  return isSuperAdmin || (pageActions[pageKey]?.includes(actionKey) ?? false);
}
