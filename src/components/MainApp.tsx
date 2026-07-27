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
  Award,
  ClipboardList,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, hasPage } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import {
  getPermissionForRoles,
  mapUserRolesToRoles,
  Screen,
  Role
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
import ThemeToggle from './ThemeToggle';
import ModuleMapping from './ModuleMapping';
import StudentEvaluations from './StudentEvaluations';
import SurveyManagement from './SurveyManagement';
import ComplianceReport from './ComplianceReport';
import AutomatedReportingEngine from './AutomatedReportingEngine';
import PlatformSetup from './PlatformSetup';

const ROLE_NAV_ITEMS: Record<Role, { id: string; label: string; icon: React.ComponentType<any>; screen: Screen; initialTab?: any; initialQpoSubTab?: any }[]> = {
  'Lecturer': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'modules', label: 'My Modules', icon: BookOpen, screen: 'My Modules' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams', label: 'Exam Vault', icon: ShieldCheck, screen: 'Exam Vault', initialTab: 'dashboard' },
    { id: 'evaluations', label: 'Student Evaluations', icon: Award, screen: 'Student Evaluations', initialTab: 'kpi' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'Programme Coordinator': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'modules', label: 'My Modules', icon: BookOpen, screen: 'My Modules' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams', label: 'Exam Vault', icon: ShieldCheck, screen: 'Exam Vault', initialTab: 'dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'mapping', label: 'Module Mapping', icon: Layers, screen: 'Module Mapping' },
    { id: 'staff', label: 'Staff & Roles Management', icon: Users, screen: 'Staff & Roles Management' },
    { id: 'evaluations', label: 'Student Evaluations', icon: Award, screen: 'Student Evaluations', initialTab: 'kpi' },
    { id: 'stats', label: 'Executive Analytics', icon: BarChart3, screen: 'Executive Analytics' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'HOD': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'modules', label: 'My Modules', icon: BookOpen, screen: 'My Modules' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams', label: 'Exam Vault', icon: ShieldCheck, screen: 'Exam Vault', initialTab: 'dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'mapping', label: 'Module Mapping', icon: Layers, screen: 'Module Mapping' },
    { id: 'staff', label: 'Staff & Roles Management', icon: Users, screen: 'Staff & Roles Management' },
    { id: 'evaluations', label: 'Student Evaluations', icon: Award, screen: 'Student Evaluations', initialTab: 'kpi' },
    { id: 'evaluations_aggregate', label: 'Student Evaluations (Aggregate)', icon: Award, screen: 'Student Evaluations (Aggregate)', initialTab: 'plans' },
    { id: 'stats', label: 'Executive Analytics', icon: BarChart3, screen: 'Executive Analytics' },
    { id: 'compliance_portfolios', label: 'Compliance Portfolios', icon: Activity, screen: 'Compliance Portfolios' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'Faculty Admin': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'mapping', label: 'Module Mapping', icon: Layers, screen: 'Module Mapping' },
    { id: 'staff', label: 'Staff & Roles Management', icon: Users, screen: 'Staff & Roles Management' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' }
  ],
  'Deputy Dean': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams_control', label: 'Exam Vault Control', icon: ShieldCheck, screen: 'Exam Vault Control', initialTab: 'control' },
    { id: 'strategic_dashboard', label: 'Strategic Dashboard', icon: BarChart3, screen: 'Strategic Dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'compliance_portfolios', label: 'Compliance Portfolios', icon: Activity, screen: 'Compliance Portfolios' },
    { id: 'evaluations_aggregate', label: 'Student Evaluations (Aggregate)', icon: Award, screen: 'Student Evaluations (Aggregate)', initialTab: 'plans' },
    { id: 'survey_reviews', label: 'Student Survey Reviews', icon: ClipboardList, screen: 'Student Survey Reviews' },
    { id: 'stats', label: 'Executive Analytics', icon: BarChart3, screen: 'Executive Analytics' },
    { id: 'status_management', label: 'Status Management', icon: ShieldCheck, screen: 'Status Management', initialTab: 'status' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'Executive Dean': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams_control', label: 'Exam Vault Control', icon: ShieldCheck, screen: 'Exam Vault Control', initialTab: 'control' },
    { id: 'strategic_dashboard', label: 'Strategic Dashboard', icon: BarChart3, screen: 'Strategic Dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'compliance_portfolios', label: 'Compliance Portfolios', icon: Activity, screen: 'Compliance Portfolios' },
    { id: 'evaluations_aggregate', label: 'Student Evaluations (Aggregate)', icon: Award, screen: 'Student Evaluations (Aggregate)', initialTab: 'plans' },
    { id: 'survey_reviews', label: 'Student Survey Reviews', icon: ClipboardList, screen: 'Student Survey Reviews' },
    { id: 'stats', label: 'Executive Analytics', icon: BarChart3, screen: 'Executive Analytics' },
    { id: 'status_management', label: 'Status Management', icon: ShieldCheck, screen: 'Status Management', initialTab: 'status' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'DVC: T&L': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams_control', label: 'Exam Vault Control', icon: ShieldCheck, screen: 'Exam Vault Control', initialTab: 'control' },
    { id: 'strategic_dashboard', label: 'Strategic Dashboard', icon: BarChart3, screen: 'Strategic Dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'compliance_portfolios', label: 'Compliance Portfolios', icon: Activity, screen: 'Compliance Portfolios' },
    { id: 'evaluations_aggregate', label: 'Student Evaluations (Aggregate)', icon: Award, screen: 'Student Evaluations (Aggregate)', initialTab: 'plans' },
    { id: 'survey_reviews', label: 'Student Survey Reviews', icon: ClipboardList, screen: 'Student Survey Reviews' },
    { id: 'stats', label: 'Executive Analytics', icon: BarChart3, screen: 'Executive Analytics' },
    { id: 'status_management', label: 'Status Management', icon: ShieldCheck, screen: 'Status Management', initialTab: 'status' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'CQPA': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams_control', label: 'Exam Vault Control', icon: ShieldCheck, screen: 'Exam Vault Control', initialTab: 'control' },
    { id: 'strategic_dashboard', label: 'Strategic Dashboard', icon: BarChart3, screen: 'Strategic Dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'compliance_portfolios', label: 'Compliance Portfolios', icon: Activity, screen: 'Compliance Portfolios' },
    { id: 'evaluations_aggregate', label: 'Student Evaluations (Aggregate)', icon: Award, screen: 'Student Evaluations (Aggregate)', initialTab: 'plans' },
    { id: 'survey_reviews', label: 'Student Survey Reviews', icon: ClipboardList, screen: 'Student Survey Reviews' },
    { id: 'stats', label: 'Executive Analytics', icon: BarChart3, screen: 'Executive Analytics' },
    { id: 'status_management', label: 'Status Management', icon: ShieldCheck, screen: 'Status Management', initialTab: 'status' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'Auditor': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'exams_control', label: 'Exam Vault Control', icon: ShieldCheck, screen: 'Exam Vault Control', initialTab: 'control' },
    { id: 'strategic_dashboard', label: 'Strategic Dashboard', icon: BarChart3, screen: 'Strategic Dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'compliance_portfolios', label: 'Compliance Portfolios', icon: Activity, screen: 'Compliance Portfolios' },
    { id: 'evaluations_aggregate', label: 'Student Evaluations (Aggregate)', icon: Award, screen: 'Student Evaluations (Aggregate)', initialTab: 'plans' },
    { id: 'survey_reviews', label: 'Student Survey Reviews', icon: ClipboardList, screen: 'Student Survey Reviews' },
    { id: 'stats', label: 'Executive Analytics', icon: BarChart3, screen: 'Executive Analytics' },
    { id: 'status_management', label: 'Status Management', icon: ShieldCheck, screen: 'Status Management', initialTab: 'status' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'QPO': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'vault_explorer', label: 'File Vault', icon: ShieldCheck, screen: 'File Vault', initialTab: 'explorer' },
    { id: 'strategic_dashboard', label: 'Strategic Dashboard', icon: BarChart3, screen: 'Strategic Dashboard' },
    { id: 'compliance', label: 'Compliance Engine', icon: Activity, screen: 'Compliance Engine' },
    { id: 'compliance_portfolios', label: 'Compliance Portfolios', icon: Activity, screen: 'Compliance Portfolios' },
    { id: 'surveys_campaigns', label: 'Survey Management (Campaigns)', icon: ClipboardList, screen: 'Survey Management', initialQpoSubTab: 'campaigns' },
    { id: 'surveys_qbank', label: 'Survey Management (Question Bank)', icon: ClipboardList, screen: 'Survey Management', initialQpoSubTab: 'question_bank' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ],
  'Exams': [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'exams_status', label: 'Status Verification', icon: ShieldCheck, screen: 'Status Management', initialTab: 'status' },
    { id: 'exams_location', label: 'Location Association', icon: ShieldCheck, screen: 'Location Association', initialTab: 'location' },
    { id: 'exams_print', label: 'Core Print Queue', icon: ShieldCheck, screen: 'Exam Vault', initialTab: 'control' },
    { id: 'reporting_engine', label: 'Reporting Engine', icon: BarChart3, screen: 'Automated Reporting Engine' },
    { id: 'notifications', label: 'System Alerts', icon: Bell, screen: 'System Alerts' }
  ]
};

const PLATFORM_SETUP_ITEM = { id: 'platform_setup', label: 'Platform Setup', icon: Settings };

// Maps each nav item's id to the `pages.key` Platform Setup's Page Setup
// screen actually edits (role_pages). Most ids match 1:1; a few nav-item
// variants (e.g. the three Exams-role print/status/location shortcuts, or
// QPO's two Survey Management sub-tabs) share one underlying page.
const ITEM_ID_TO_PAGE_KEY: Record<string, string> = {
  exams_status: 'status_management',
  exams_location: 'location_association',
  exams_print: 'exams_control',
  surveys_campaigns: 'surveys',
  surveys_qbank: 'surveys',
};

export default function MainApp() {
  const { profile, logout, isSuperAdmin, visiblePages } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  // Dummy module for the uploader demo
  const dummyModule: any = { id: 'demo', code: 'ENG101', name: 'Software Engineering Fundamentals' };

  // A user can hold multiple roles now — the nav is the union of every
  // mapped role's items (deduped by id), further filtered by whether
  // Platform Setup's Page Setup screen (role_pages) actually grants that
  // page to any of the user's roles, plus Platform Setup for super admins.
  const mappedRoles = mapUserRolesToRoles(profile?.roles);
  const currentNavItems = React.useMemo(() => {
    const seen = new Map<string, (typeof ROLE_NAV_ITEMS)['Lecturer'][number]>();
    for (const role of mappedRoles) {
      for (const item of ROLE_NAV_ITEMS[role] || []) {
        if (!seen.has(item.id)) seen.set(item.id, item);
      }
    }
    const items = Array.from(seen.values()).filter((item) =>
      hasPage(visiblePages, isSuperAdmin, ITEM_ID_TO_PAGE_KEY[item.id] || item.id)
    );
    return isSuperAdmin ? [...items, PLATFORM_SETUP_ITEM as any] : items;
  }, [mappedRoles, isSuperAdmin, visiblePages]);

  // Automatically reset to the first allowed tab if the selected tab is unauthorized for the current role(s)
  React.useEffect(() => {
    if (currentNavItems.length > 0 && !currentNavItems.some((item) => item.id === activeTab)) {
      setActiveTab(currentNavItems[0].id);
    }
  }, [currentNavItems, activeTab]);

  return (
    <div className="flex h-screen bg-background font-sans relative overflow-hidden">
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
      <aside className="w-64 bg-surface-tint backdrop-blur-xl border-r border-border flex flex-col z-20">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 ring-1 ring-white/10">
              <ShieldCheck className="text-foreground w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-foreground tracking-tight text-xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">VaultIQ</h1>
              <p className="text-[10px] text-subtle-foreground font-bold uppercase tracking-widest">Governance V2.1</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {currentNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group relative overflow-hidden",
                activeTab === item.id
                  ? "bg-surface-tint-strong text-foreground shadow-xl ring-1 ring-white/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-tint"
              )}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-full"
                />
              )}
              <item.icon className={cn(
                "w-5 h-5 transition-colors shrink-0",
                activeTab === item.id ? "text-indigo-400" : "text-subtle-foreground group-hover:text-foreground/80"
              )} />
              <span className="flex-1 text-left">{item.label}</span>
              {activeTab === item.id && <ChevronRight className="ml-auto w-4 h-4 opacity-50 shrink-0" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-surface-tint rounded-2xl p-4 mb-4 border border-border-subtle">
            <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-3 italic">Active Session</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-foreground font-bold text-xs border border-border group">
                {profile?.displayName?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-foreground truncate">{profile?.displayName}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <p className="text-[10px] text-subtle-foreground font-black uppercase tracking-wider">
                    {isSuperAdmin ? 'Super Admin' : profile?.roles?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <ThemeToggle />
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
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
            <span className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Institutional Oversight</span>
            <span className="text-slate-800">/</span>
            <h2 className="text-sm font-black text-foreground uppercase tracking-tight">
              {currentNavItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <RoleSwitcher />

            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              AI Engine: Active
            </div>

            {(() => {
              const canUploadHere = isSuperAdmin || (
                getPermissionForRoles(profile?.roles, 'My Modules').access === 'upload_view' ||
                getPermissionForRoles(profile?.roles, 'File Vault').access === 'upload_view'
              );
              return (
                <button
                  onClick={() => canUploadHere && setIsUploaderOpen(true)}
                  disabled={!canUploadHere}
                  title={canUploadHere ? undefined : 'Upload is not available for your current role'}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition border border-border",
                    canUploadHere
                      ? "bg-indigo-600 text-foreground hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                      : "bg-surface-tint text-subtle-foreground cursor-not-allowed"
                  )}
                >
                  <Plus className="w-4 h-4" /> Upload
                </button>
              );
            })()}

            <div className="flex flex-col items-end">
               <p className="text-[10px] font-black text-foreground tracking-widest">{new Date().toLocaleDateString('en-GB')}</p>
               <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Academic Day 42</p>
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
            {activeTab.startsWith('vault_') && <FileVault initialTab={currentNavItems.find(n => n.id === activeTab)?.initialTab} />}
            {activeTab === 'exams' && <ExamVault />}
            {activeTab === 'exams_control' && <ExamVault initialTab="control" />}
            {activeTab === 'exams_status' && <ExamVault initialTab="status" />}
            {activeTab === 'exams_location' && <ExamVault initialTab="location" />}
            {activeTab === 'exams_print' && <ExamVault initialTab="control" />}
            {activeTab === 'notifications' && <NotificationCenter />}
            {activeTab === 'compliance' && <ComplianceEngine />}
            {activeTab === 'compliance_portfolios' && <ComplianceReport />}
            {activeTab === 'mapping' && <ModuleMapping />}
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'evaluations' && <StudentEvaluations initialTab="kpi" />}
            {activeTab === 'evaluations_aggregate' && <StudentEvaluations initialTab="plans" />}
            {activeTab === 'survey_reviews' && <StudentEvaluations initialTab="kpi" />}
            {activeTab === 'strategic_dashboard' && <ExecutiveAnalytics />}
            {activeTab === 'surveys' && <SurveyManagement />}
            {activeTab === 'surveys_campaigns' && <SurveyManagement initialQpoSubTab="campaigns" />}
            {activeTab === 'surveys_qbank' && <SurveyManagement initialQpoSubTab="question_bank" />}
            {activeTab === 'stats' && <ExecutiveAnalytics />}
            {activeTab === 'status_management' && <ExamVault initialTab="status" />}
            {activeTab === 'reporting_engine' && <AutomatedReportingEngine />}
            {activeTab === 'platform_setup' && <PlatformSetup />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
