import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

export interface RoleRow {
  id: string;
  name: UserRole;
  label: string;
  is_system: boolean;
}

export interface PageRow {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_system: boolean;
}

export interface PageActionRow {
  id: string;
  page_id: string;
  key: string;
  label: string;
}

export interface VisiblePage {
  key: string;
  label: string;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Current-user role/page/action resolution (used by useAuth)
// ---------------------------------------------------------------------------

export async function getUserRoleAssignments(userId: string): Promise<{ roleId: string; name: UserRole }[]> {
  const { data, error } = await supabase
    .from('user_type')
    .select('role_id, roles(name)')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data
    .filter((row: any) => row.roles)
    .map((row: any) => ({ roleId: row.role_id as string, name: row.roles.name as UserRole }));
}

export async function getAllPages(): Promise<VisiblePage[]> {
  const { data } = await supabase.from('pages').select('key, label, sort_order').order('sort_order', { ascending: true });
  return (data ?? []).map((p) => ({ key: p.key, label: p.label, sortOrder: p.sort_order }));
}

export async function getVisiblePagesForRoles(roleIds: string[]): Promise<VisiblePage[]> {
  if (roleIds.length === 0) return [];
  const { data, error } = await supabase
    .from('role_pages')
    .select('pages(key, label, sort_order)')
    .in('role_id', roleIds);

  if (error || !data) return [];
  const byKey = new Map<string, VisiblePage>();
  for (const row of data as any[]) {
    if (row.pages) byKey.set(row.pages.key, { key: row.pages.key, label: row.pages.label, sortOrder: row.pages.sort_order });
  }
  return Array.from(byKey.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getPageActionsForRoles(roleIds: string[]): Promise<Record<string, string[]>> {
  if (roleIds.length === 0) return {};
  const { data, error } = await supabase
    .from('role_page_actions')
    .select('page_actions(key, pages(key))')
    .in('role_id', roleIds);

  if (error || !data) return {};
  const byPage: Record<string, Set<string>> = {};
  for (const row of data as any[]) {
    const pageKey = row.page_actions?.pages?.key;
    const actionKey = row.page_actions?.key;
    if (!pageKey || !actionKey) continue;
    (byPage[pageKey] ??= new Set()).add(actionKey);
  }
  const result: Record<string, string[]> = {};
  for (const key of Object.keys(byPage)) result[key] = Array.from(byPage[key]);
  return result;
}

export async function getAllPageActions(): Promise<Record<string, PageActionRow[]>> {
  const { data } = await supabase.from('page_actions').select('id, page_id, key, label, pages(key)');
  const byPage: Record<string, PageActionRow[]> = {};
  for (const row of (data ?? []) as any[]) {
    const pageKey = row.pages?.key;
    if (!pageKey) continue;
    (byPage[pageKey] ??= []).push({ id: row.id, page_id: row.page_id, key: row.key, label: row.label });
  }
  return byPage;
}

// ---------------------------------------------------------------------------
// Admin data (Platform Setup: Page Setup + Action Setup)
// ---------------------------------------------------------------------------

export async function getAllRoles(): Promise<RoleRow[]> {
  const { data } = await supabase.from('roles').select('*').order('label', { ascending: true });
  return (data ?? []) as RoleRow[];
}

export async function getAllPagesFull(): Promise<PageRow[]> {
  const { data } = await supabase.from('pages').select('*').order('sort_order', { ascending: true });
  return (data ?? []) as PageRow[];
}

export async function getRolePageMatrix(): Promise<Set<string>> {
  const { data } = await supabase.from('role_pages').select('role_id, page_id');
  return new Set((data ?? []).map((r: any) => `${r.role_id}:${r.page_id}`));
}

export async function setRolePage(roleId: string, pageId: string, allowed: boolean) {
  if (allowed) {
    await supabase.from('role_pages').insert({ role_id: roleId, page_id: pageId });
  } else {
    await supabase.from('role_pages').delete().eq('role_id', roleId).eq('page_id', pageId);
  }
}

export async function getRolePageActionMatrix(): Promise<Set<string>> {
  const { data } = await supabase.from('role_page_actions').select('role_id, page_action_id');
  return new Set((data ?? []).map((r: any) => `${r.role_id}:${r.page_action_id}`));
}

export async function setRolePageAction(roleId: string, pageActionId: string, allowed: boolean) {
  if (allowed) {
    await supabase.from('role_page_actions').insert({ role_id: roleId, page_action_id: pageActionId });
  } else {
    await supabase.from('role_page_actions').delete().eq('role_id', roleId).eq('page_action_id', pageActionId);
  }
}

export async function addRoleToUser(userId: string, roleId: string) {
  await supabase.from('user_type').insert({ user_id: userId, role_id: roleId });
}
