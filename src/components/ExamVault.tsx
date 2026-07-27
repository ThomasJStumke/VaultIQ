import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  History, 
  Download, 
  Eye, 
  AlertTriangle,
  Fingerprint,
  Calendar,
  Key,
  ShieldAlert,
  Printer,
  FileCheck,
  Check,
  RotateCcw,
  BookOpen,
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ExamMetadata, SecureAuditEntry, Evidence } from '../types';
import { useAuth } from '../hooks/useAuth';
import { subscribeToModules, subscribeToEvidence, addNotification } from '../services/supabaseService';
import { mapUserRoleToRole, getPermission, filterModulesByScope } from '../permissions.config';
import EvidenceUploader from './EvidenceUploader';

interface PrintJobState {
  copies: number;
  layout: 'DOUBLE_SIDED' | 'SINGLE_SIDED';
  binding: 'NONE' | 'LEFT_STAPLE' | 'BOOKLET';
  destination: string;
}

const MODULES_STUDENT_ENROLMENT: Record<string, number> = {
  'AUDB201': 148,
  'PRG201': 195,
  'SYS111': 82,
  'FAC111': 230,
  'PRG302': 65,
  'DEFAULT': 110
};

export default function ExamVault({ initialTab }: { initialTab?: 'dashboard' | 'control' | 'status' | 'location' } = {}) {
  const { profile } = useAuth();
  const mappedRole = profile?.role ? mapUserRoleToRole(profile.role) : null;
  const permission = mappedRole ? getPermission(mappedRole, 'Exam Vault') : { access: 'none' };
  
  const canUpload = permission.access === 'upload_view';
  const canAssign = permission.access === 'assign_view';
  const canPrint = permission.access === 'view_print';

  const isExamsOfficer = canPrint;
  
  const [examTab, setExamTab] = useState<'dashboard' | 'control' | 'status' | 'location'>(initialTab || 'dashboard');

  useEffect(() => {
    if (initialTab) {
      setExamTab(initialTab);
    }
  }, [initialTab]);

  const [modulesList, setModulesList] = useState<any[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, Evidence[]>>({});
  const [selectedModuleId, setSelectedModuleId] = useState('AUDB201');
  const [uploaderModule, setUploaderModule] = useState<any | null>(null);
  const [logs, setLogs] = useState<SecureAuditEntry[]>([
    { id: '1', userId: 'MrA', userEmail: 'mr.a@university.edu', action: 'UPLOAD', timestamp: '2026-05-10T08:30:00Z', ipAddress: '192.168.1.45', userAgent: 'Chrome/Mac' },
    { id: '2', userId: 'ProfB', userEmail: 'prof.b@university.edu', action: 'VIEW', timestamp: '2026-05-12T14:20:00Z', ipAddress: '10.0.4.12', userAgent: 'Safari/iPad' },
    { id: '3', userId: 'AdminSarah', userEmail: 's.jenkins@university.edu', action: 'DOWNLOAD', timestamp: '2026-05-14T11:00:00Z', ipAddress: '172.16.0.2', userAgent: 'Edge/Win11' },
  ]);

  const [showLogs, setShowLogs] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');

  // Print Desk specific state
  const [printConfig, setPrintConfig] = useState<PrintJobState>({
    copies: 148,
    layout: 'DOUBLE_SIDED',
    binding: 'LEFT_STAPLE',
    destination: 'CENTRAL_PRINT_ROOM_3'
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  // Subscribe to live modules to check compliance/prepared status
  useEffect(() => {
    const unsubscribe = subscribeToModules((data) => {
      const filtered = filterModulesByScope(data, profile);
      setModulesList(filtered);
    });
    return () => unsubscribe();
  }, [profile]);

  // Subscribe to evidence subcollection of each module in real-time
  useEffect(() => {
    if (modulesList.length === 0) return;
    const unsubscribes: (() => void)[] = [];
    modulesList.forEach((m) => {
      const unsub = subscribeToEvidence(m.id, (evList) => {
        setEvidenceMap(prev => ({
          ...prev,
          [m.code]: evList
        }));
      });
      unsubscribes.push(unsub);
    });
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [modulesList]);

  // Sync default student size when selected module changes
  useEffect(() => {
    const size = MODULES_STUDENT_ENROLMENT[selectedModuleId] || MODULES_STUDENT_ENROLMENT.DEFAULT;
    setPrintConfig(prev => ({ ...prev, copies: size }));
  }, [selectedModuleId]);

  // Auto-fill passwords or show helper for Exams Office to test seamlessly
  useEffect(() => {
    if (isExamsOfficer) {
      setIsUnlocked(true); // Auto-decrypt or let them toggle
    } else {
      setIsUnlocked(false);
    }
  }, [isExamsOfficer]);

  const handleUnlock = () => {
    if (password === 'VAULT2026') {
      setIsUnlocked(true);
      setPassError('');
      
      // Add secure log entry in memory
      const entry: SecureAuditEntry = {
        id: Date.now().toString(),
        userId: profile?.uid || 'guest_user',
        userEmail: profile?.email || 'unregistered@university.edu',
        action: 'DECRYPT',
        timestamp: new Date().toISOString(),
        ipAddress: '168.212.92.1',
        userAgent: `WebClient (${profile?.role || 'VIEWER'})`
      };
      setLogs(prev => [entry, ...prev]);
    } else {
      setPassError('Security Alert: Invalid decryp passphrase.');
    }
  };

  const dispatchPrintJob = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      
      // Append download and dispatch records to security ledger
      const dispatchLog: SecureAuditEntry = {
        id: Date.now().toString(),
        userId: profile?.uid || 'exams_agent',
        userEmail: profile?.email || 'exams.printroom@university.edu',
        action: 'DOWNLOAD',
        timestamp: new Date().toISOString(),
        ipAddress: '10.12.110.14',
        userAgent: `ExamsPrintSubsystem (Copies: ${printConfig.copies}, Dest: ${printConfig.destination})`
      };

      setLogs(prev => [dispatchLog, ...prev]);

      // Hide success notification after 5s
      setTimeout(() => {
        setPrintSuccess(false);
      }, 5000);
    }, 2000);
  };

  const isModuleReleasedToExamVault = (m: any) => {
    const evidenceList = evidenceMap[m.code] || [];
    
    // 1. Exam paper must be uploaded
    const examPaper = evidenceList.find(e => e.type === 'EXAM_PAPER' || (e.category === 'ASSESSMENTS' && e.isExamRelated));
    if (!examPaper) return false;

    // 2. Cover page questionnaire must be completed
    if (!examPaper.questionnaire) return false;

    // 3. Internal moderation report must be uploaded
    const hasInternalMod = evidenceList.some(e => 
      e.type === 'MODERATION_REPORT' && e.subCategory === 'INTERNAL_MOD'
    );
    if (!hasInternalMod) return false;

    // 4. External moderation report is required if exit level
    if (m.isExitLevel) {
      const hasExternalMod = evidenceList.some(e => 
        e.type === 'MODERATION_REPORT' && e.subCategory === 'EXTERNAL_MOD'
      );
      if (!hasExternalMod) return false;
    }

    return true;
  };

  const checkReleasedStatus = (m: any) => {
    const dbReleased = isModuleReleasedToExamVault(m);
    if (dbReleased) return true;

    // Seed/mock fallback for seamless walkthroughs (e.g. AUDB201 is Approved/Released by default)
    if (m.code === 'AUDB201') return true;

    return false;
  };

  const visibleModules = isExamsOfficer 
    ? modulesList.filter(m => checkReleasedStatus(m))
    : modulesList;

  // Find currently selected module in list
  const currentMod = modulesList.find(m => m.code === selectedModuleId) || {
    code: selectedModuleId,
    name: selectedModuleId === 'AUDB201' ? 'Auditing Fundamentals' : 'Academic Module',
    complianceStatus: 'COMPLIANT',
    departmentId: 'FAI_AUD_TAX',
    isExitLevel: selectedModuleId === 'AUDB201' ? true : false
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-500/20 rounded-md">
              Restricted Access Level 4
            </span>
            {isExamsOfficer && (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 rounded-md flex items-center gap-1 animate-pulse">
                <Printer className="w-3 h-3" /> Exams Print Room Active
              </span>
            )}
          </div>
          <h2 className="text-4xl font-black text-foreground tracking-tighter">
            Secure <span className="text-rose-500">Exam Vault</span>
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            End-to-end decrypted dispatch subsystem and assessment printing portal.
          </p>
        </div>
      </div>

      {/* Role Alert Explanation Box */}
      <div className="p-5 bg-gradient-to-br from-rose-950/20 to-surface border border-rose-500/20 rounded-2xl space-y-3">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4.5 h-4.5 text-rose-500" /> Decentralized Assessment Oversight Protocol
        </h3>
        <p className="text-xs text-foreground/80 leading-relaxed max-w-4xl">
          By security policy, examination papers are sealed inside this vault. Only the **Exams Office** role can decrypt audit parameters and securely retrieve linked modules' official exam papers for high-volume physical distribution and hardcopy printing.
        </p>
      </div>

      {/* Status Verification Panel for Exams ("see if certain things have been done") */}
      {(examTab === 'dashboard' || examTab === 'status') && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Live Modular Preparation Dashboard</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Verifying readiness of course module codes before dispatches can proceed. Ready status confirms internal and external moderation phases did not flag errors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {visibleModules.map((m) => {
              const isReady = checkReleasedStatus(m);
              return (
                <button 
                  key={m.code}
                  onClick={() => {
                    setSelectedModuleId(m.code);
                    if (isExamsOfficer) setIsUnlocked(true);
                  }}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all relative overflow-hidden group",
                    selectedModuleId === m.code 
                      ? "bg-indigo-600/10 border-indigo-500 text-foreground" 
                      : "bg-surface-sunken border-border-subtle text-muted-foreground hover:border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black tracking-wider uppercase">{m.code}</span>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 border rounded-sm",
                      isReady 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {isReady ? 'READY' : 'LOCKED'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate group-hover:text-indigo-400 transition-colors">{m.name}</h4>
                  <p className="text-[9px] text-subtle-foreground font-bold mt-1 uppercase tracking-tight">{m.departmentId}</p>
                  {m.isExitLevel && (
                    <span className="absolute bottom-1 right-2 text-[7px] font-black bg-amber-500/20 text-amber-400 px-1 rounded uppercase">Exit Level</span>
                  )}
                </button>
              );
            })}
            {visibleModules.length === 0 && (
              <div className="col-span-4 p-8 text-center text-xs text-subtle-foreground uppercase tracking-widest font-black bg-surface-sunken rounded-xl border border-border-subtle">
                No released academic modules in Exam Vault yet.
              </div>
            )}
          </div>
        </div>
      )}

      {(examTab === 'dashboard' || examTab === 'control') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Controller and Print Console */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 md:p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <ShieldAlert className="w-56 h-56 text-rose-500" />
             </div>

             <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                   <div>
                      <h3 className="text-2xl font-black text-foreground tracking-tight">
                        {currentMod.code} - {currentMod.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                         <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Dept: {currentMod.departmentId || 'GENERAL'}
                         </span>
                         <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <Fingerprint className="w-3.5 h-3.5 text-rose-400" /> Build v3.0-Locked
                         </span>
                      </div>
                   </div>
                   <div className={cn(
                     "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border text-center shadow-lg self-start",
                     checkReleasedStatus(currentMod) 
                       ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                       : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                   )}>
                      {checkReleasedStatus(currentMod) ? 'APPROVED FOR RETRIEVAL' : 'PENDING APPROVAL'}
                   </div>
                </div>

                <AnimatePresence>
                   {uploaderModule && (
                     <div className="z-50 relative">
                       <EvidenceUploader 
                         module={uploaderModule} 
                         onClose={() => setUploaderModule(null)} 
                       />
                     </div>
                   )}
                 </AnimatePresence>

                 {canUpload ? (
                   <div className="p-8 bg-surface border border-border-subtle rounded-3xl text-center space-y-4">
                     <FileCheck className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
                     <h4 className="text-foreground font-black text-lg">Exam Paper Deposit Desk</h4>
                     <p className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed">
                       As a Lecturer, you can upload official secure exam scripts or moderation forms directly.
                     </p>
                     <button 
                       onClick={() => setUploaderModule(currentMod)}
                       className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 active:scale-95"
                     >
                       Deposit Exam Paper PDF
                     </button>
                   </div>
                 ) : canAssign ? (
                   <div className="p-8 bg-surface border border-border-subtle rounded-3xl text-center space-y-4">
                     <Users className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
                     <h4 className="text-foreground font-black text-lg">Moderator Assignment Desk</h4>
                     <p className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed">
                       As an academic leader, you have view & assignment authorization. Securely assign external moderators to audit the exam paper.
                     </p>
                     <button 
                       onClick={() => {
                         const entry: SecureAuditEntry = {
                           id: Date.now().toString(),
                           userId: profile?.uid || 'coord',
                           userEmail: profile?.email || 'coord@uni.edu',
                           action: 'DECRYPT',
                           timestamp: new Date().toISOString(),
                           ipAddress: '127.0.0.1',
                           userAgent: 'Assign Moderator Action'
                         };
                         setLogs(prev => [entry, ...prev]);
                         setPassError(`External Moderator assigned for ${currentMod.code}`);
                         setTimeout(() => setPassError(''), 4000);
                       }}
                       className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-amber-600/20 active:scale-95"
                     >
                       Assign External Moderator
                     </button>
                     {passError && (
                       <p className="text-xs text-emerald-400 font-bold uppercase mt-2 tracking-wide text-center">{passError}</p>
                     )}
                   </div>
                 ) : !isUnlocked ? (
                  <div className="p-8 bg-surface-sunken rounded-3xl border border-border-subtle backdrop-blur-sm text-center">
                     <Lock className="w-12 h-12 text-subtle-foreground mx-auto mb-4 animate-bounce" />
                     <h4 className="text-foreground font-black text-lg">Decryption Authorization Required</h4>
                     <p className="text-subtle-foreground text-xs mt-1 mb-6 uppercase tracking-wider leading-relaxed">
                       This examination paper is locked under cryptographic hash controls. <br />
                       Enter secure passcode to permit printing.
                     </p>
                     
                     <div className="max-w-xs mx-auto space-y-3">
                        <div className="relative">
                           <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-foreground" />
                           <input 
                              type="password" 
                              placeholder="Passpharse (try VAULT2026)"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-surface-tint border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm font-bold"
                           />
                        </div>
                        {passError && (
                          <p className="text-[10px] text-rose-500 font-extrabold uppercase mt-1 tracking-wide">{passError}</p>
                        )}
                        <button 
                           onClick={handleUnlock}
                           className="w-full bg-rose-600 hover:bg-rose-500 text-foreground py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-rose-600/20 active:scale-95"
                        >
                           Authorize & Decrypt
                        </button>
                     </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SecurityProperty icon={ShieldCheck} label="At-Rest Encryption" val="AES-256-GCM Secure" />
                        <SecurityProperty icon={Unlock} label="Exams Session Privileges" val="Unlocked" />
                        <SecurityProperty icon={Printer} label="High Volume Print Ready" val="Watermarked" />
                        <SecurityProperty icon={History} label="Audit Path Registration" val="MANDATORY" />
                     </div>

                     {/* Exams Print Dispatch Desk Form */}
                     <div className="p-6 bg-surface border border-indigo-500/10 rounded-2xl space-y-4">
                        <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                          <Printer className="text-indigo-400 w-4 h-4" /> Secure Print Dispensation settings
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Printed Copy Count</label>
                            <input 
                              type="number" 
                              value={printConfig.copies}
                              onChange={(e) => setPrintConfig(prev => ({ ...prev, copies: Number(e.target.value) }))}
                              className="w-full bg-surface-tint border border-border rounded-xl px-4 py-2.5 text-xs text-foreground font-bold"
                            />
                            <p className="text-[8px] text-subtle-foreground font-black uppercase tracking-wider mt-1">Matched to department size</p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5 font-bold">Print Format Options</label>
                            <select 
                              value={printConfig.layout}
                              onChange={(e) => setPrintConfig(prev => ({ ...prev, layout: e.target.value as any }))}
                              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground/90 font-bold"
                            >
                              <option value="DOUBLE_SIDED" className="text-slate-900 font-semibold">Double-Sided (Duplex)</option>
                              <option value="SINGLE_SIDED" className="text-slate-900 font-semibold">Single-Sided Only</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Binding Config</label>
                            <select 
                              value={printConfig.binding}
                              onChange={(e) => setPrintConfig(prev => ({ ...prev, binding: e.target.value as any }))}
                              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground/90 font-bold"
                            >
                              <option value="LEFT_STAPLE" className="text-slate-900 font-semibold">Left Corner Staple</option>
                              <option value="BOOKLET" className="text-slate-900 font-semibold">A4 Folded Booklet</option>
                              <option value="NONE" className="text-slate-900 font-semibold">Loose Sheets (No Staples)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Physical Destination</label>
                            <select 
                              value={printConfig.destination}
                              onChange={(e) => setPrintConfig(prev => ({ ...prev, destination: e.target.value }))}
                              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground/90 font-bold"
                            >
                              <option value="CENTRAL_PRINT_ROOM_3" className="text-slate-900 font-semibold">Central Secure Print Hub Room 102</option>
                              <option value="DEPT_EXAM_VAULT_1" className="text-slate-900 font-semibold">Department Safe Printer Locker</option>
                              <option value="SATELLITE_DESK" className="text-slate-900 font-semibold">High-Security Office Console</option>
                            </select>
                          </div>
                        </div>

                        {/* Warnings based on moderation level */}
                        {!checkReleasedStatus(currentMod) && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[9px] text-amber-400 font-bold uppercase tracking-wide flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Warning: This module is marked incomplete or has not been fully moderated. Retrieve & Print with Head of Department express instruction only.</span>
                          </div>
                        )}
                     </div>

                     <div className="flex flex-col sm:flex-row gap-4">
                        <button className="flex-1 bg-foreground hover:bg-foreground/90 text-background py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-3">
                           <Eye className="w-4 h-4" /> Preview Moderation Draft
                        </button>
                        
                        <button 
                          disabled={isPrinting}
                          onClick={dispatchPrintJob}
                          className={cn(
                            "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-3 shadow-lg text-foreground",
                            isPrinting 
                              ? "bg-rose-800 cursor-not-allowed" 
                              : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20 active:scale-95"
                          )}
                        >
                           <Printer className="w-4 h-4 text-foreground" /> 
                           {isPrinting ? 'Sending Print Codes...' : 'Dispatch Secure Print Job'}
                        </button>
                     </div>

                     {printSuccess && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2"
                       >
                         <Check className="w-4 h-4 shrink-0" />
                         <span>Print job successfully dispatched! Copier Subsystem registered printing of {printConfig.copies} copies to physical printer destination. Ledger updated.</span>
                       </motion.div>
                     )}

                     {!isExamsOfficer && (
                       <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex items-start gap-4">
                          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                          <p className="text-[10px] font-bold text-rose-400/80 leading-relaxed uppercase tracking-wide">
                             Warning: Any retrieved document contains unique watermark indicators tied to user {profile?.displayName || 'anonymous'} ({profile?.email}). Unpermitted copying triggers disciplinary audits.
                          </p>
                       </div>
                     )}
                  </motion.div>
                )}
             </div>
          </div>

          {/* Audit Logs */}
          <div className="glass-card">
              <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                 <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" /> Secure Retrieval Ledger (Pre-dispatch & Print Log)
                 </h4>
                 <button 
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-400 transition"
                 >
                   {showLogs ? 'Hide Details' : 'Show Full Chain'}
                 </button>
              </div>
              
              <AnimatePresence>
                {showLogs && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                       {logs.map((log) => (
                         <div key={log.id} className="flex items-start justify-between p-4 bg-surface-tint rounded-xl border border-border-subtle group hover:border-border transition">
                            <div className="flex items-start gap-4">
                               <div className={cn(
                                 "p-2 rounded-lg",
                                 log.action === 'DOWNLOAD' ? 'bg-rose-500/10 text-rose-500' : 
                                 log.action === 'DECRYPT' ? 'bg-amber-500/10 text-amber-500' :
                                 'bg-slate-500/10 text-subtle-foreground'
                               )}>
                                  {log.action === 'DOWNLOAD' ? <Printer className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                               </div>
                               <div>
                                  <p className="text-xs font-black text-foreground">{log.action}: {log.userEmail}</p>
                                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[9px] font-bold text-subtle-foreground">
                                     <span>IP Address: {log.ipAddress}</span>
                                     <span>•</span>
                                     <span>Console: {log.userAgent}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest">
                                 {new Date(log.timestamp).toLocaleString()}
                               </p>
                               <div className="flex items-center gap-1 justify-end mt-1 text-emerald-500">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span className="text-[8px] font-black uppercase">Verified Access</span>
                                </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
        </div>

        {/* Security Summary Panel */}
        <div className="space-y-6">
           <div className="glass-card p-8">
              <h4 className="text-xs font-black text-foreground uppercase tracking-widest mb-6">Vault Health Status</h4>
              <div className="space-y-6">
                 <StatusIndicator label="Encryption Engine" status="ACTIVE" />
                 <StatusIndicator label="Audit Ledger Check" status="SYMMETRIC" />
                 <StatusIndicator label="Print Watermarkers" status="ACTIVE" />
                 <StatusIndicator label="Physical Log Sync" status="ONLINE" />
              </div>
           </div>

           <div className="glass-card p-8 bg-indigo-600/5 border-indigo-500/20">
              <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Fingerprint className="w-4 h-4" /> Hardcopy watermark trace
              </h4>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                 Physical examination sheets parsed by Exams Office systems contain randomized high-density back-channel metadata pixels. Any unpermitted copies will trace directly to this credential key.
              </p>
              <div className="mt-4 p-3 bg-surface-sunken rounded-xl font-mono text-[9px] text-indigo-400 break-all border border-border-subtle uppercase">
                 SHA256: 01e389b33a016b80156a5996057a6e1337b8056d68b6cf566...
              </div>
           </div>
        </div>
      </div>
      )}

      {/* Location Association View */}
      {examTab === 'location' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Physical Exam Venue Location Association</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Associate academic modules with physical venues, manage student capacity, set desk distances, and synchronize hardcopy distribution logs.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Venues List */}
              <div className="space-y-4">
                {[
                  { name: 'Main Sports Hall', capacity: 350, spacing: '1.5m Grid', supervisor: 'Dr. Sarah Peterson', status: 'READY', color: 'border-emerald-500/20 text-emerald-400' },
                  { name: 'Centenary Auditorium', capacity: 200, spacing: '1.8m Alternating', supervisor: 'Prof. Jacob Henderson', status: 'READY', color: 'border-emerald-500/20 text-emerald-400' },
                  { name: 'Exam Room B-12', capacity: 80, spacing: '1.5m Grid', supervisor: 'Mrs. Emily Collins', status: 'PENDING SYNC', color: 'border-amber-500/20 text-amber-400' },
                ].map((venue, i) => (
                  <div key={i} className="p-5 bg-surface-sunken border border-border-subtle rounded-2xl space-y-3 hover:border-border transition-all">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-foreground tracking-tight">{venue.name}</h4>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 border rounded ${venue.color}`}>
                        {venue.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground">
                      <div>Capacity: <span className="text-foreground">{venue.capacity} Seats</span></div>
                      <div>Spacing: <span className="text-foreground">{venue.spacing}</span></div>
                      <div className="col-span-2">Supervisor: <span className="text-foreground/80">{venue.supervisor}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Middle Column: Seating Grid Simulation */}
              <div className="lg:col-span-2 glass-card p-6 space-y-6">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-rose-500" /> Live Interactive Seating Map Mockup (Main Sports Hall)
                </h4>
                <div className="grid grid-cols-10 gap-2 p-4 bg-surface-sunken rounded-2xl border border-border-subtle">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const isAssigned = i % 3 === 0;
                    const isSelected = i === 14;
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "aspect-square rounded-md border flex items-center justify-center text-[8px] font-black transition-all cursor-pointer",
                          isSelected ? "bg-rose-500/20 border-rose-500 text-rose-300" :
                          isAssigned ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : 
                          "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                        )}
                        title={isSelected ? `Selected Seat S${i+1}` : isAssigned ? `Assigned Desk S${i+1}` : `Available Desk S${i+1}`}
                      >
                        S{i+1}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-6 justify-center text-[10px] font-black uppercase tracking-widest text-subtle-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500/10 border border-emerald-500/20" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-indigo-500/20 border-indigo-500/30" />
                    <span>Assigned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-rose-500/20 border-rose-500" />
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityProperty({ icon: Icon, label, val }: any) {
  return (
    <div className="p-4 bg-surface-tint border border-border rounded-2xl group hover:border-foreground/20 transition-all">
       <div className="flex items-center gap-3 mb-2">
          <Icon className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">{label}</span>
       </div>
       <div className="flex items-center justify-between">
          <span className="text-sm font-black text-foreground tracking-tight">{val}</span>
          <span className="text-[8px] font-black text-emerald-500 uppercase px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">Active</span>
       </div>
    </div>
  );
}

function StatusIndicator({ label, status }: any) {
  return (
    <div className="flex items-center justify-between">
       <span className="text-xs font-bold text-muted-foreground">{label}</span>
       <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{status}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
       </div>
    </div>
  );
}
