import React, { useEffect, useState } from 'react';
import { Settings, LayoutGrid, ToggleLeft, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getAllRoles,
  getAllPagesFull,
  getRolePageMatrix,
  setRolePage,
  getAllPageActions,
  getRolePageActionMatrix,
  setRolePageAction,
  RoleRow,
  PageRow,
  PageActionRow,
} from '../services/rbacService';

type Tab = 'pages' | 'actions';

export default function PlatformSetup() {
  const [tab, setTab] = useState<Tab>('pages');
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [pageActionsByPage, setPageActionsByPage] = useState<Record<string, PageActionRow[]>>({});
  const [pageMatrix, setPageMatrix] = useState<Set<string>>(new Set());
  const [actionMatrix, setActionMatrix] = useState<Set<string>>(new Set());
  const [selectedPageKey, setSelectedPageKey] = useState<string>('');

  useEffect(() => {
    (async () => {
      const [r, p, pa, pm, am] = await Promise.all([
        getAllRoles(),
        getAllPagesFull(),
        getAllPageActions(),
        getRolePageMatrix(),
        getRolePageActionMatrix(),
      ]);
      setRoles(r.filter((role) => role.name !== 'SUPER_ADMIN'));
      setPages(p);
      setPageActionsByPage(pa);
      setPageMatrix(pm);
      setActionMatrix(am);
      setSelectedPageKey(p.find((page) => page.key !== 'platform_setup')?.key || '');
      setLoading(false);
    })();
  }, []);

  const togglePage = async (roleId: string, pageId: string) => {
    const key = `${roleId}:${pageId}`;
    const allowed = !pageMatrix.has(key);
    setPageMatrix((prev) => {
      const next = new Set(prev);
      if (allowed) next.add(key);
      else next.delete(key);
      return next;
    });
    await setRolePage(roleId, pageId, allowed);
  };

  const toggleAction = async (roleId: string, pageActionId: string) => {
    const key = `${roleId}:${pageActionId}`;
    const allowed = !actionMatrix.has(key);
    setActionMatrix((prev) => {
      const next = new Set(prev);
      if (allowed) next.add(key);
      else next.delete(key);
      return next;
    });
    await setRolePageAction(roleId, pageActionId, allowed);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading platform configuration...</p>
      </div>
    );
  }

  const configurablePages = pages.filter((p) => !p.is_system);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Platform Setup</h3>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-0.5">
              Super Admin — Role, Page & Action Configuration
            </p>
          </div>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 mt-6">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/80 font-medium leading-relaxed">
            Super Admin always has full access to every page and action regardless of what's configured below —
            this matrix only governs everyone else.
          </p>
        </div>

        <div className="flex gap-2 mt-6 border-b border-white/5 pb-0">
          <button
            onClick={() => setTab('pages')}
            className={cn(
              'px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-t-xl transition flex items-center gap-2',
              tab === 'pages' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Page Setup
          </button>
          <button
            onClick={() => setTab('actions')}
            className={cn(
              'px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-t-xl transition flex items-center gap-2',
              tab === 'actions' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
            )}
          >
            <ToggleLeft className="w-3.5 h-3.5" /> Action Setup
          </button>
        </div>
      </div>

      {tab === 'pages' && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h4 className="text-sm font-black text-white uppercase tracking-tight">Which roles can view which pages</h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Toggle a cell to grant or revoke page visibility for a role.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-950">Page</th>
                  {roles.map((r) => (
                    <th key={r.id} className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {configurablePages.map((page) => (
                  <tr key={page.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4 text-xs font-bold text-white sticky left-0 bg-slate-950">{page.label}</td>
                    {roles.map((r) => {
                      const checked = pageMatrix.has(`${r.id}:${page.id}`);
                      return (
                        <td key={r.id} className="p-4 text-center">
                          <button
                            onClick={() => togglePage(r.id, page.id)}
                            className={cn(
                              'w-5 h-5 rounded-md border transition mx-auto flex items-center justify-center cursor-pointer',
                              checked
                                ? 'bg-indigo-600 border-indigo-500'
                                : 'bg-white/5 border-white/10 hover:border-white/30'
                            )}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight">Which roles can perform which actions</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Pick a page, then toggle the buttons/actions each role can use on it.</p>
            </div>
            <select
              value={selectedPageKey}
              onChange={(e) => setSelectedPageKey(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500/50"
            >
              {configurablePages.map((page) => (
                <option key={page.key} value={page.key} className="bg-slate-900">
                  {page.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-950">Action</th>
                  {roles.map((r) => (
                    <th key={r.id} className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(pageActionsByPage[selectedPageKey] || []).map((action) => (
                  <tr key={action.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4 text-xs font-bold text-white sticky left-0 bg-slate-950">{action.label}</td>
                    {roles.map((r) => {
                      const checked = actionMatrix.has(`${r.id}:${action.id}`);
                      return (
                        <td key={r.id} className="p-4 text-center">
                          <button
                            onClick={() => toggleAction(r.id, action.id)}
                            className={cn(
                              'w-5 h-5 rounded-md border transition mx-auto flex items-center justify-center cursor-pointer',
                              checked
                                ? 'bg-emerald-600 border-emerald-500'
                                : 'bg-white/5 border-white/10 hover:border-white/30'
                            )}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {(pageActionsByPage[selectedPageKey] || []).length === 0 && (
                  <tr>
                    <td colSpan={roles.length + 1} className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                      No actions defined for this page yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
