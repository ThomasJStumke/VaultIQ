import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import { Shield, ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ROLES: { role: UserRole; label: string; access: string }[] = [
  { role: 'FACULTY_ADMIN', label: 'Faculty Admin', access: 'Assign & View' },
  { role: 'LECTURER', label: 'Lecturer', access: 'Upload & View' },
  { role: 'PROGRAMME_COORDINATOR', label: 'Prog. Coordinator', access: 'Assign & View' },
  { role: 'HOD', label: 'HoD', access: 'Assign & View' },
  { role: 'EXAMS', label: 'Exams Office', access: 'Retrieve & Print Papers' },
  { role: 'DEPUTY_DEAN', label: 'Deputy Dean', access: 'View Only' },
  { role: 'EXECUTIVE_DEAN', label: 'Executive Dean', access: 'View Only' },
  { role: 'DVC_TL', label: 'DVC: T&L', access: 'View Only' },
  { role: 'CQPA', label: 'CQPA', access: 'View Only' },
  { role: 'QPO', label: 'QPO', access: 'View Only' },
  { role: 'AUDITOR', label: 'Auditor', access: 'View Only' },
];

export default function RoleSwitcher() {
  const { profile, isSuperAdmin, addRole } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const activeRoles = profile?.roles || [];
  const currentLabel = isSuperAdmin
    ? 'Super Admin'
    : ROLES.filter((r) => activeRoles.includes(r.role)).map((r) => r.label).join(', ') || 'No Role';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-surface-tint border border-border px-4 py-2 rounded-xl hover:bg-surface-tint-strong transition-all group"
      >
        <div className="p-1.5 bg-indigo-500/20 rounded-lg group-hover:scale-110 transition-transform">
          <Shield className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest leading-none mb-1">Active Role</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-foreground uppercase tracking-tight">{currentLabel}</span>
            <ChevronDown className={cn("w-3 h-3 text-subtle-foreground transition-transform", isOpen && "rotate-180")} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 bg-surface-tint border-b border-border-subtle">
                <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Add A Role</p>
                <p className="text-[9px] text-subtle-foreground font-medium mt-0.5">Roles are additive — this grants an extra role on top of what you already have.</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {ROLES.map((r) => {
                  const active = activeRoles.includes(r.role);
                  return (
                    <button
                      key={r.role}
                      onClick={() => {
                        if (!active) addRole(r.role);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 hover:bg-surface-tint transition-colors text-left border-b border-border-subtle last:border-0",
                        active ? "bg-indigo-500/10" : ""
                      )}
                    >
                      <div>
                        <p className="text-[11px] font-black text-foreground uppercase tracking-wider">{r.label}</p>
                        <p className="text-[9px] font-bold text-subtle-foreground uppercase tracking-widest">{r.access}</p>
                      </div>
                      {active ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-subtle-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
