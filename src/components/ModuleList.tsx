import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  FileCheck, 
  FileWarning, 
  Clock,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Plus,
  UserPlus,
  Users,
  Printer,
  FileText,
  Download
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { Module } from '../types';
import { subscribeToModules } from '../services/supabaseService';
import EvidenceUploader from './EvidenceUploader';
import StudentListUploader from './StudentListUploader';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { mapUserRoleToRole, getPermission, filterModulesByScope } from '../permissions.config';
import { 
  exportModuleReportToPDF,
  exportModuleReportToWord,
  exportModuleReportToExcel
} from '../lib/reportGenerators';


export default function ModuleList() {
  const { profile } = useAuth();
  const mappedRole = profile?.role ? mapUserRoleToRole(profile.role) : null;
  const permission = mappedRole ? getPermission(mappedRole, 'My Modules') : { access: 'none' };
  
  const canUpload = permission.access === 'upload_view';
  const canAssign = permission.access === 'assign_view';

  const [searchTerm, setSearchTerm] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedStudentListModule, setSelectedStudentListModule] = useState<Module | null>(null);
  
  // Custom interactive assignment modal state
  const [assigningModule, setAssigningModule] = useState<Module | null>(null);
  const [selectedLecturer, setSelectedLecturer] = useState('MrA');
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Seeding now happens once via supabase/migrations/0005_seed.sql, not at runtime.
    const unsubscribe = subscribeToModules((data) => {
      const filtered = filterModulesByScope(data, profile);
      setModules(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-subtle-foreground font-bold uppercase tracking-widest text-[10px]">Syncing Module Registry...</p>
      </div>
    );
  }

  const filteredModules = modules.filter(m => 
    m.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence>
        {selectedModule && (
          <EvidenceUploader 
            module={selectedModule} 
            onClose={() => setSelectedModule(null)} 
          />
        )}
        {selectedStudentListModule && (
          <StudentListUploader
            module={selectedStudentListModule}
            onClose={() => setSelectedStudentListModule(null)}
          />
        )}
        {assigningModule && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-border p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-black text-foreground tracking-tight">Assign Academic Lead</h3>
              <p className="text-xs text-muted-foreground">Assign the primary teaching staff or module coordinator for <span className="text-foreground font-bold">{assigningModule.code} ({assigningModule.name})</span>.</p>
              
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Select Educator</label>
                  <select 
                    value={selectedLecturer} 
                    onChange={(e) => setSelectedLecturer(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground/90 font-bold"
                  >
                    <option value="MrA">Mr. A (Computer Science)</option>
                    <option value="ProfB">Prof. B (Information Systems)</option>
                    <option value="DrChen">Dr. Chen (Artificial Intelligence)</option>
                  </select>
                </div>
              </div>

              {assignmentSuccess && (
                <p className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 uppercase tracking-wider text-center">{assignmentSuccess}</p>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setAssigningModule(null)}
                  className="flex-1 py-3 bg-surface-tint hover:bg-surface-tint-strong text-foreground/80 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setAssignmentSuccess(`Successfully assigned ${selectedLecturer} to teach ${assigningModule.code}!`);
                    setTimeout(() => {
                      setAssignmentSuccess(null);
                      setAssigningModule(null);
                    }, 2000);
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                >
                  Confirm Assignment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Controls */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tighter">Academic Inventory</h2>
          <p className="text-subtle-foreground font-medium mt-1">Management of modular governance and compliance nodes.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-foreground" />
            <input 
              type="text" 
              placeholder="Search by code or name..." 
              className="w-full pl-12 pr-4 py-3 bg-surface-tint border border-border rounded-2xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-subtle-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3 bg-surface-tint border border-border rounded-2xl text-muted-foreground hover:text-foreground transition-all group">
            <Filter className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Module Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-foreground/[0.02] border-b border-border-subtle">
              <th className="px-8 py-5 text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Module Topology</th>
              <th className="px-8 py-5 text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Assessment</th>
              <th className="px-8 py-5 text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Last Audit</th>
              <th className="px-8 py-5 text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Assignees</th>
              <th className="px-8 py-5 text-[10px] font-black text-subtle-foreground uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredModules.map((module) => (
              <tr 
                key={module.id} 
                className="hover:bg-foreground/[0.03] transition-colors group cursor-pointer"
                onClick={() => {
                  if (canUpload) setSelectedModule(module);
                  else if (canAssign) setAssigningModule(module);
                }}
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-tint border border-border flex items-center justify-center transition-all group-hover:bg-indigo-600/20 group-hover:border-indigo-500/50">
                      <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground tracking-tight">{module.code}</p>
                      <p className="text-xs text-subtle-foreground font-bold uppercase tracking-wide mt-1">{module.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-surface-tint px-2 py-1 rounded border border-border-subtle">
                      {module.assessmentMode?.replace('_', ' ') || 'STANDARD'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    module.complianceStatus === 'COMPLIANT' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : 
                    module.complianceStatus === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                    "bg-red-500/10 text-red-500 border-red-500/20"
                  )}>
                    {module.complianceStatus === 'COMPLIANT' ? <FileCheck className="w-3.5 h-3.5" /> : 
                     module.complianceStatus === 'NON_COMPLIANT' ? <FileWarning className="w-3.5 h-3.5" /> : 
                     <Clock className="w-3.5 h-3.5" />}
                    {module.complianceStatus.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-8 py-6 text-sm font-bold text-muted-foreground">
                  {module.lastAuditAt ? formatDate(module.lastAuditAt) : <span className="italic text-subtle-foreground">Pending Sync</span>}
                </td>
                <td className="px-8 py-6">
                  <div className="flex -space-x-3">
                    {module.lecturerUids.length > 0 ? module.lecturerUids.map((uid, i) => {
                      const nameMap: Record<string, string> = { 'MrA': 'Mr. A', 'ProfB': 'Prof. B' };
                      return (
                        <div key={i} className="w-9 h-9 rounded-full border-2 border-background bg-surface-2 flex items-center justify-center text-[8px] font-black text-foreground group-hover:-translate-y-1 transition-transform overflow-hidden px-1 text-center" title={nameMap[uid] || uid}>
                          {nameMap[uid] || uid}
                        </div>
                      );
                    }) : (
                      <div className="w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center text-[10px] font-black text-subtle-foreground">
                        ?
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-3">
                    {/* Quick dossier reporting triggers */}
                    <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-xl border border-border-subtle mr-2" title="Generate compliance dossier">
                      <button
                        onClick={() => {
                          const approvedMap: Record<string, boolean> = {};
                          if (module.complianceStatus === 'COMPLIANT') {
                            approvedMap[module.code] = true;
                          }
                          exportModuleReportToPDF(module, [], approvedMap, profile?.displayName || profile?.email || 'Lecturer');
                        }}
                        className="p-1.5 hover:bg-surface-tint text-muted-foreground hover:text-foreground rounded-lg transition"
                        title="Export PDF Report"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const approvedMap: Record<string, boolean> = {};
                          if (module.complianceStatus === 'COMPLIANT') {
                            approvedMap[module.code] = true;
                          }
                          exportModuleReportToWord(module, [], approvedMap, profile?.displayName || profile?.email || 'Lecturer');
                        }}
                        className="p-1.5 hover:bg-surface-tint text-muted-foreground hover:text-foreground rounded-lg transition"
                        title="Export Word Report"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const approvedMap: Record<string, boolean> = {};
                          if (module.complianceStatus === 'COMPLIANT') {
                            approvedMap[module.code] = true;
                          }
                          exportModuleReportToExcel(module, [], approvedMap, profile?.displayName || profile?.email || 'Lecturer');
                        }}
                        className="p-1.5 hover:bg-surface-tint text-muted-foreground hover:text-foreground rounded-lg transition"
                        title="Export Excel Worksheet"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {canUpload && (
                      <>
                        <button 
                          onClick={() => setSelectedStudentListModule(module)}
                          className="px-4 py-2 bg-surface-2 hover:bg-surface-2 text-indigo-400 hover:text-foreground border border-indigo-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow active:scale-95 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" /> Students
                        </button>
                        <button 
                          onClick={() => setSelectedModule(module)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow shadow-indigo-600/20 active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Upload File
                        </button>
                      </>
                    )}
                    {canAssign && (
                      <button 
                        onClick={() => setAssigningModule(module)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow shadow-amber-600/20 active:scale-95"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Assign Staff
                      </button>
                    )}
                    {!canUpload && !canAssign && (
                      <span className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest italic py-2">View Only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Readiness Banner */}
      <div className="glass-card p-10 relative overflow-hidden group">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
              Institutional Event
            </div>
            <h4 className="text-4xl font-black text-foreground mb-4 tracking-tighter leading-tight">Governance Audit <span className="text-indigo-500">Readiness Pulse</span></h4>
            <p className="text-muted-foreground text-lg leading-relaxed font-medium mb-8">
              Your next external audit is scheduled for <span className="text-foreground font-bold italic underline decoration-indigo-500/50">June 15th, 2026</span>. 
              Run the AI validation agent now to detect gaps in your records.
            </p>
            <button className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-foreground rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 border border-border">
              Run Pre-Audit Check <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="relative h-64 flex items-center justify-center">
             <div className="absolute inset-0 bg-indigo-500/5 blur-[80px] rounded-full animate-pulse" />
             <BookOpen className="w-48 h-48 text-indigo-500/20 rotate-12 group-hover:rotate-6 transition-transform duration-[1.5s]" />
          </div>
        </div>
      </div>
    </div>
  );
}
