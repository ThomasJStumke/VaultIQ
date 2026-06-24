import React, { useState } from 'react';
import { 
  Bell,
  Activity, 
  LogOut, 
  ChevronRight, 
  Plus, 
  LayoutDashboard, 
  BookOpen, 
  ShieldCheck, 
  Users, 
  BarChart3,
  Layers,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { 
  getPermission, 
  mapUserRoleToRole, 
  Screen 
} from '../permissions.config';

// Views
import DashboardOverview from './DashboardOverview';
import ModuleList from './ModuleList';
import ComplianceEngine from './ComplianceEngine';
import FileVault from './FileVault';
import EvidenceUploader from './EvidenceUploader';
import StaffManagement from './StaffManagement';
import ExecutiveAnalytics from './ExecutiveAnalytics';
import ExamVault from './ExamVault';
import NotificationCenter from './NotificationCenter';
import RoleSwitcher from './RoleSwitcher';
import ModuleMapping from './ModuleMapping';
import StudentEvaluations from './StudentEvaluations';

export default function MainApp() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  // Dummy module for the uploader demo
  const dummyModule: any = { id: 'demo', code: 'ENG101', name: 'Software Engineering Fundamentals' };

  const mappedRole = profile?.role ? mapUserRoleToRole(profile.role) : null;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' as Screen },
    { id: 'modules', label: 'My Modules', icon: BookOpen, screen: 'My Modules' as Screen },
    { id: 'vault', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault' as Screen },
    { id: 'exams', label: 'Exam Vault', icon: ShieldCheck, screen: 'Exam Vault' as Screen },
    { id: 'notifications', label: 'Alerts', icon: Bell, screen: 'System Alerts' as Screen },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' as Screen },
    { id: 'mapping', label: 'Module Mapping', icon: Layers, screen: 'Module Mapping' as Screen },
    { id: 'staff', label: 'Staff & Roles', icon: Users, screen: 'Staff & Roles Management' as Screen },
    { id: 'evaluations', label: 'Student Evaluations', icon: Award, screen: 'Student Evaluations' as Screen },
    { id: 'stats', label: 'Architecture & Stats', icon: BarChart3, screen: 'Executive Analytics' as Screen },
  ];

  const filteredNav = navItems.filter(item => {
    if (!mappedRole) return false;
    return getPermission(mappedRole, item.screen).access !== 'none';
  });

  // Automatically reset to the first allowed tab if the selected tab is unauthorized for the current role
  React.useEffect(() => {
    if (mappedRole && filteredNav.length > 0) {
      const activeItem = navItems.find(item => item.id === activeTab);
      if (!activeItem || getPermission(mappedRole, activeItem.screen).access === 'none') {
        setActiveTab(filteredNav[0].id);
      }
    }
  }, [mappedRole, activeTab, filteredNav]);

  return (
    <div className="flex h-screen bg-slate-950 font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="glow-indigo top-[-10%] left-[-10%] opacity-20" />
      <div className="glow-blue bottom-[-10%] right-[-10%] opacity-20" />
      
      <AnimatePresence>
        {isUploaderOpen && (
          <EvidenceUploader 
            module={dummyModule} 
            onClose={() => setIsUploaderOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col z-20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 ring-1 ring-white/10">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight text-xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">VaultIQ</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Governance V2.1</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-white/10 text-white shadow-xl ring-1 ring-white/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-full"
                />
              )}
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                activeTab === item.id ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
              )} />
              {item.label}
              {activeTab === item.id && <ChevronRight className="ml-auto w-4 h-4 opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Active Session</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs border border-white/10 group">
                {profile?.displayName?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{profile?.displayName}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{profile?.role}</p>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Secure Exit
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        <header className="h-16 glass-header px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Institutional Oversight</span>
            <span className="text-slate-800">/</span>
            <h2 className="text-sm font-black text-white uppercase tracking-tight">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <RoleSwitcher />
            <div className="flex flex-col items-end mr-4">
               <p className="text-[10px] font-black text-white tracking-widest">{new Date().toLocaleDateString('en-GB')}</p>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Academic Day 42</p>
            </div>
            
            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              AI Engine: Active
            </div>

            {mappedRole && (
              getPermission(mappedRole, 'My Modules').access === 'upload_view' || 
              getPermission(mappedRole, 'File Vault').access === 'upload_view'
            ) && (
              <button 
                onClick={() => setIsUploaderOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-95 border border-white/10"
              >
                <Plus className="w-4 h-4" /> Upload
              </button>
            )}

            <div className="h-6 w-px bg-white/10 mx-2" />

            <div className="bg-white/5 p-2 rounded-lg border border-white/10" title="System Status: Operational">
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardOverview />}
            {activeTab === 'modules' && <ModuleList />}
            {activeTab === 'vault' && <FileVault />}
            {activeTab === 'exams' && <ExamVault />}
            {activeTab === 'notifications' && <NotificationCenter />}
            {activeTab === 'compliance' && <ComplianceEngine />}
            {activeTab === 'mapping' && <ModuleMapping />}
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'evaluations' && <StudentEvaluations />}
            {activeTab === 'stats' && <ExecutiveAnalytics />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
