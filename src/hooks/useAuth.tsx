import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
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

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  visiblePages: VisiblePage[];
  pageActions: Record<string, string[]>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [visiblePages, setVisiblePages] = useState<VisiblePage[]>([]);
  const [pageActions, setPageActions] = useState<Record<string, string[]>>({});

  const loadAccess = async (sessionUser: User) => {
    const assignments = await getUserRoleAssignments(sessionUser.id);
    const roles: UserRole[] = assignments.length > 0
      ? assignments.map((a) => a.name)
      : [(sessionUser.user_metadata?.role as UserRole) || 'LECTURER'];

    const superAdmin = roles.includes('SUPER_ADMIN');
    setIsSuperAdmin(superAdmin);

    setProfile({
      uid: sessionUser.id,
      email: sessionUser.email || '',
      displayName: sessionUser.email?.split('@')[0] || 'User',
      roles,
    });

    if (superAdmin) {
      const allPages = await getAllPages();
      setVisiblePages(allPages);
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
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) await loadAccess(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadAccess(session.user);
      } else {
        setProfile(null);
        setVisiblePages([]);
        setPageActions({});
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const addRole = async (role: UserRole) => {
    if (!user) return;
    const assignments = await getUserRoleAssignments(user.id);
    if (assignments.some((a) => a.name === role)) return;
    // Look up the role's id via the roles the app already knows about.
    const { data } = await supabase.from('roles').select('id').eq('name', role).single();
    if (data?.id) {
      await addRoleToUser(user.id, data.id);
      await loadAccess(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isSuperAdmin, visiblePages, pageActions, login, logout, addRole }}
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
