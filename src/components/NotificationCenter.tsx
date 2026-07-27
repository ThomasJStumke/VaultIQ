import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  Mail, 
  MessageSquare, 
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types';
import { subscribeToNotifications } from '../services/supabaseService';
import { useAuth } from '../hooks/useAuth';
import { mapUserRoleToRole } from '../permissions.config';

const DUMMY_NOTIFICATIONS: Notification[] = [
  { id: '1', userId: 'MrA', title: 'Overdue: Study Guide', message: 'ENG101 Study Guide is 2 days past due. Tier 1 Escalation active.', type: 'WARNING', status: 'UNREAD', createdAt: '2026-05-15T10:00:00Z', moduleCode: 'ENG101', escalationTier: 1 },
  { id: '2', userId: 'HoD-Chen', title: 'HoD Escalation: MAT202', message: 'Lecturer Prof. White has missed the Exam Moderation deadline for 3 days.', type: 'ESCALATION', status: 'UNREAD', createdAt: '2026-05-14T09:30:00Z', moduleCode: 'MAT202', escalationTier: 2 },
  { id: '3', userId: 'Dean-Jenkins', title: 'Critical Risk: Law Faculty', message: '60% of 4th year modules in Law have no external moderation metadata.', type: 'AUDIT', status: 'UNREAD', createdAt: '2026-05-13T14:20:00Z', escalationTier: 3 },
  { id: '4', userId: 'MrA', title: 'AI Validation Success', message: 'Artifact for AUDB201 was successfully verified by Gemini.', type: 'REMINDER', status: 'READ', createdAt: '2026-05-15T08:00:00Z', moduleCode: 'AUDB201' },
];

export default function NotificationCenter() {
  const { profile } = useAuth();
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const unsub = subscribeToNotifications((data) => {
      setDbNotifications(data);
    });
    return () => unsub();
  }, []);

  const handleDownloadSimulate = (fileName: string, fileSize: string) => {
    setToastMessage(`Downloading document: ${fileName} (${fileSize})`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter and merge
  const filteredDbNotifications = dbNotifications.filter((n: any) => {
    // If there is no target restriction, everyone can see it
    if (!n.targetRoles || n.targetRoles.length === 0) return true;

    // Check role match
    const userRole = profile?.role; // e.g. LECTURER, HOD, PROGRAMME_COORDINATOR
    const displayRole = userRole ? mapUserRoleToRole(userRole) : null; // e.g. Lecturer, HOD, Programme Coordinator
    
    const roleMatches = n.targetRoles.some((r: string) => 
      r === userRole || r === displayRole
    );

    if (!roleMatches) return false;

    // Check department match if targetDepartmentId is specified and not 'ALL'
    if (n.targetDepartmentId && n.targetDepartmentId !== 'ALL') {
      return profile?.departmentId === n.targetDepartmentId;
    }

    return true;
  });

  // Merge and sort
  const notifications = [
    ...filteredDbNotifications.map((n: any) => ({
      id: n.id,
      userId: n.userId || 'system',
      title: n.title || 'System Notification',
      message: n.message || '',
      type: n.type || 'REMINDER',
      status: n.status || 'UNREAD',
      createdAt: n.createdAt || new Date().toISOString(),
      moduleCode: n.moduleCode,
      escalationTier: n.escalationTier,
      fileName: n.fileName,
      fileSize: n.fileSize,
      documentId: n.documentId,
      documentType: n.documentType
    })),
    ...DUMMY_NOTIFICATIONS.filter(d => !dbNotifications.some((dbN: any) => dbN.title === d.title))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <div className="relative">
                <Bell className="w-5 h-5 text-indigo-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-background rounded-full" />
                )}
             </div>
             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Comms Pulse</span>
           </div>
          <h2 className="text-4xl font-black text-foreground tracking-tighter">Unified <span className="text-indigo-500">Alert Center</span></h2>
          <p className="text-subtle-foreground font-medium mt-2">Automated escalation engine tracking over 1,200 concurrent tasks.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-surface-tint border border-border rounded-xl text-[10px] font-black text-foreground uppercase tracking-widest hover:bg-surface-tint-strong transition">Mark All Read</button>
          <button className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-600/20 transition">Workflow Settings</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
           {notifications.map((notif) => (
             <NotificationItem 
               key={notif.id} 
               notification={notif} 
               onDownloadSimulate={handleDownloadSimulate}
             />
           ))}
        </div>

        <div className="space-y-6">
           <div className="glass-card p-8">
              <h4 className="text-xs font-black text-foreground uppercase tracking-widest mb-6">Escalation Velocity</h4>
              <div className="space-y-6">
                 <EscalationStat label="Tier 1 (Lecturer)" count={42} color="blue" />
                 <EscalationStat label="Tier 2 (HoD)" count={12} color="amber" />
                 <EscalationStat label="Tier 3 (Dean)" count={4} color="rose" />
                 <EscalationStat label="Tier 4 (DVC)" count={0} color="emerald" />
              </div>
           </div>

           <div className="glass-card p-8 relative overflow-hidden bg-rose-600/5 border-rose-500/20">
              <AlertTriangle className="absolute -bottom-8 -right-8 w-24 h-24 text-rose-500/10 -rotate-12" />
              <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <ShieldAlert className="w-4 h-4" /> Systemic Warning
              </h4>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-tight">
                 3 Departments show high delay correlation in "Exam Rubric" uploads. Automated HoD intervention triggered for the School of Accountancy.
              </p>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 px-6 py-4 bg-indigo-950/90 border border-indigo-500/30 text-white rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-black uppercase tracking-widest">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NotificationItemProps {
  notification: any;
  onDownloadSimulate?: (fileName: string, fileSize: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDownloadSimulate }) => {
  const configs = {
    REMINDER: { icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    WARNING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    ESCALATION: { icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    AUDIT: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    COMPLIANCE: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  };

  const config = configs[notification.type as keyof typeof configs] || configs.REMINDER;
  const Icon = config.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "glass-card p-6 flex flex-col md:flex-row items-start gap-6 group cursor-pointer hover:border-foreground/20 transition-all",
        notification.status === 'UNREAD' ? "border-l-4 border-l-indigo-500" : ""
      )}
    >
      <div className={cn("p-4 rounded-3xl shrink-0 transition-transform group-hover:scale-110", config.bg, config.color)}>
        <Icon className="w-6 h-6" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-lg font-black text-foreground tracking-tight">{notification.title}</h4>
          <span className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest">{new Date(notification.createdAt).toLocaleTimeString()}</span>
        </div>
        <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-4">{notification.message}</p>
        
        {notification.fileName && (
          <div className="mt-4 mb-4 p-3.5 bg-foreground/[0.02] border border-border-subtle rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{notification.fileName}</p>
                <p className="text-[10px] text-subtle-foreground font-bold">{notification.fileSize}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onDownloadSimulate) {
                  onDownloadSimulate(notification.fileName, notification.fileSize || '142 KB');
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Download Document
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
           {notification.moduleCode && (
             <div className="flex items-center gap-2 text-[10px] font-black text-foreground/40 uppercase tracking-widest">
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {notification.moduleCode}
             </div>
           )}
           {notification.escalationTier && (
             <div className={cn(
               "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
               notification.escalationTier > 1 ? "text-rose-500" : "text-amber-500"
             )}>
               <AlertCircle className="w-3 h-3" /> Tier {notification.escalationTier} Escalation
             </div>
           )}
        </div>
      </div>

      <div className="flex md:flex-col gap-2">
         <button className="p-2 b-white/5 border border-border-subtle rounded-lg text-subtle-foreground hover:text-foreground transition">
           <Mail className="w-4 h-4" />
         </button>
         <button className="p-2 b-white/5 border border-border-subtle rounded-lg text-subtle-foreground hover:text-foreground transition">
           <ChevronRight className="w-4 h-4" />
         </button>
      </div>
    </motion.div>
  );
}

function EscalationStat({ label, count, color }: any) {
  const colors: any = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500'
  };

  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground">{count}</span>
       </div>
       <div className="h-1 bg-surface-tint rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(count / 60) * 100}%` }}
            className={cn("h-full", colors[color])}
          />
       </div>
    </div>
  );
}
