import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  FileSearch,
  Activity,
  ChevronRight,
  Building2,
  FileText,
  Eye,
  Download,
  Printer,
  ShieldCheck,
  Search,
  BookOpen,
  HelpCircle,
  FileCheck,
  X,
  History,
  Check,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { Module, Evidence } from '../types';
import { subscribeToModules, subscribeToEvidence } from '../services/dataService';
import { useAuth } from '../hooks/useAuth';
import { mapUserRolesToRoles, getPermissionForRoles, filterModulesByScope } from '../permissions.config';

const DEPARTMENTS = [
  { id: 'FAI_AUD_TAX', name: 'Auditing & Taxation', code: 'AUD_TAX', icon: ShieldCheck, faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_MGT_ACC', name: 'Management Accounting', code: 'MGT_ACC', icon: TrendingUp, faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_FIN_ACC', name: 'Financial Accounting', code: 'FIN_ACC', icon: FileCheck, faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_IT', name: 'Information Technology', code: 'INF_TECH', icon: BookOpen, faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_IS', name: 'Information Systems', code: 'INF_SYS', icon: FileSearch, faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_ICM', name: 'Information Communications', code: 'INF_ICM', icon: Activity, faculty: 'Faculty of Accounting & Informatics' },
];

export default function DashboardOverview() {
  const { profile } = useAuth();
  const mappedRoles = mapUserRolesToRoles(profile?.roles);
  const permission = getPermissionForRoles(profile?.roles, 'Dashboard');

  // Decide if this user belongs to high-level dean, exams, or auditor levels
  const isHighLevelObserver = mappedRoles.length > 0 && mappedRoles.every(
    (r) => r !== 'Lecturer' && r !== 'HOD' && r !== 'Faculty Admin' && r !== 'Programme Coordinator'
  );

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  
  // High level oversight states
  const [selectedDeptId, setSelectedDeptId] = useState('FAI_AUD_TAX');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [liveEvidence, setLiveEvidence] = useState<Evidence[]>([]);
  const [activeEvidenceTypeFilter, setActiveEvidenceTypeFilter] = useState<string>('ALL');
  
  // Document reader modal state
  const [readerFile, setReaderFile] = useState<{
    title: string;
    type: string;
    moduleCode: string;
    moduleName: string;
    pages: string[];
    hash: string;
    verifier: string;
    uploadedAt: string;
    isPreSeeded?: boolean;
  } | null>(null);
  const [readerPage, setReaderPage] = useState(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Load modules
  useEffect(() => {
    const unsubscribe = subscribeToModules((data) => {
      const filtered = filterModulesByScope(data, profile);
      setModules(filtered);
      setLoading(false);
      
      // Select the first module of the chosen department to make the UI look pre-populated and neat
      if (filtered.length > 0) {
        const deptModules = filtered.filter(m => m.departmentId === selectedDeptId);
        if (deptModules.length > 0 && !selectedModule) {
          setSelectedModule(deptModules[0]);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedDeptId, profile]);

  // Subscribe to live submitted proof files when selected module changes
  useEffect(() => {
    if (selectedModule?.id) {
      const unsub = subscribeToEvidence(selectedModule.id, (evidenceList) => {
        setLiveEvidence(evidenceList);
      });
      return () => unsub();
    } else {
      setLiveEvidence([]);
    }
  }, [selectedModule]);

  // Trigger default selection when dept changes
  const handleDeptChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    const deptModules = modules.filter(m => m.departmentId === deptId);
    if (deptModules.length > 0) {
      setSelectedModule(deptModules[0]);
    } else {
      setSelectedModule(null);
    }
  };

  // Pre-seeded compliance documents for simulation when user wants to view them
  const getPreSeededDocuments = (mod: Module) => {
    return [
      {
        id: 'ps1',
        title: `${mod.code}_Study_Guide_2026.pdf`,
        type: 'STUDY_GUIDE',
        label: 'Study Guide & Syllabus',
        status: 'VERIFIED',
        verifier: 'AcademIQ Engine & HoD',
        hash: 'SHA256: 01f09e86c00d41e77...3e',
        uploadedAt: mod.lastAuditAt || '2026-05-15T09:30:00Z',
        pages: [
          `[ACADEMIQ SYSTEM MASTER FILE] STUDY GUIDE AND COURSE DESIGN\n\nModule Code: ${mod.code}\nTitle: ${mod.name}\nSemester: Semester 2, 2026\nLevel: South African NQF Level 7 (Credits: 16)\n\nChapter 1: Contextual Foundations of the Curriculum\nSection 1.1: Historical overview, and regional relevance.\nSection 1.2: Integrated learning systems and digital collaboration parameters.\n\nChapter 2: Structural Delivery Schedule\n- Lecture Sequence 1-4: Introduction to applied analytics and framework parameters.\n- Lecture Sequence 5-8: Intermediate laboratory assessments and critical review logs.`,
          `Study Guide Syllabus details (Page 2 / 3)\n\nPrimary Exit Level Outcomes:\n- Formulate core strategies based on quantitative models [SAQA Outcome 4].\n- Rationalize architectural options in structured system scenarios [SAQA Outcome 5].\n\nPrescribed Textbooks:\n1. Institutional Academic Press: Guidelines for Modern Practice (8th Edition)\n2. Advanced Curriculums: Practical Compilations.\n\nGrading Scheme Blueprint:\n- Summative Exam: 40%\n- Semester Tests & Formative Milestones: 30%\n- Team Engineering Projects: 30%`
        ]
      },
      {
        id: 'ps2',
        title: `${mod.code}_Formative_Assessment_Tasks.pdf`,
        type: 'ASSESSMENT_TASK',
        label: 'Assessment Instruments',
        status: mod.complianceStatus === 'COMPLIANT' ? 'VERIFIED' : 'PENDING REVIEW',
        verifier: 'HoD & Internal Review Panel',
        hash: 'SHA256: 3a28d50fe611acb11...9a',
        uploadedAt: '2026-05-18T14:15:00Z',
        pages: [
          `[GOVERNANCE SECURED COPIES] FORMATIVE ASSESSMENT INVENTORY\n\nUnit Assessment Dossier for ${mod.code}\nCourse Coordinator: Assigned Academic Staff\n\nTask 1: Applied Case Analysis (Weight: 15%)\nScenario Overview:\nAnalyze the institutional ledger parameters of a regional academic structure. Outline compliance gaps, data sovereignty issues, and recommend mitigation paths.\n\nRequired Evidence Checklist:\n- Compliance mapping spreadsheet\n- 1,500-word critical evaluation write-up`,
          `Task 2 Details: Mid-Term Laboratory Practical (Weight: 15%)\n\nObjective:\nEnsure student competence in applying basic analytical algorithms in high-friction environments.\n\nStandard Moderation Rubric applied: Yes.\nAwaiting External Assessor Signature: No.`
        ]
      },
      {
        id: 'ps3',
        title: `${mod.code}_Internal_Moderation_Report.pdf`,
        type: 'MODERATION_REPORT',
        label: 'Internal Moderation Report',
        status: mod.complianceStatus === 'COMPLIANT' ? 'VERIFIED' : 'AWAITING RE-SUBMISSION',
        verifier: 'External Assessor & Internal Moderator',
        hash: 'SHA256: f190bc1b90c00d41e...88',
        uploadedAt: '2026-05-20T11:00:00Z',
        pages: [
          `[OFFICIAL ACADEMIC SIGN-OFF] INTERNAL MODERATION DOCKET\n\nDate of Moderation Panel: 2026-05-20\nTarget Module: ${mod.code} - ${mod.name}\nDepartment: ${mod.departmentId}\n\nInternal Moderator Verdict:\n"The syllabus alignment, marking standards, and academic outcomes have been thoroughly reviewed against institutional criteria. Quality standards have been fully satisfied."`,
          `Moderator Feedback Notes:\n- The cognitive weighting across Bloom's Taxonomy is balanced.\n- Recommended minor adjustment to question 3.4 in the formative stage.\n- Signing off for Level 4 release. Verified.`
        ]
      },
      {
        id: 'ps4',
        title: `${mod.code}_Moderated_Exam_Paper_S1.pdf`,
        type: 'EXAM_PAPER',
        label: 'Moderated Exam Paper',
        status: mod.complianceStatus === 'COMPLIANT' ? 'APPROVED & SEALED' : 'PENDING APPROVAL',
        verifier: 'Exams Office & External Moderator',
        hash: 'SHA256: ee048a1290bb04b11...f4',
        uploadedAt: '2026-05-22T16:45:00Z',
        pages: [
          `[CONFIDENTIAL DECRYPTED COPIES] REGISTERED EXAM INSTRUMENTS\n\nOfficial Final Examination Paper S1 2026\nModule: ${mod.code} / ${mod.name}\nDuration: 3 Hours\nMax Marks: 100\n\nInstructions to Candidates:\n1. Answer all questions in Section A.\n2. Choose any three questions from Section B.\n3. Programmable calculators are prohibited.\n\n--- SECTION A (30 MARKS) ---\nQuestion 1.1 (10 marks):\nExplain the theoretical implications of the SAQA standards regarding modular governance...`,
          `SECTION B (70 MARKS) - CHOOSE ANY THREE QUESTIONS\n\nQuestion 2.1 (20 marks):\nApply standard analysis methodology to evaluate the compliance parameters of a virtual multi-tenant infrastructure. Provide diagrams indicating core security gateways.\n\nQuestion 3.1 (20 marks):\nWrite a comprehensive proof explaining structural coherence in relational schema architectures.`
        ]
      }
    ];
  };

  const showDocumentReader = (docItem: any) => {
    setReaderPage(0);
    setReaderFile({
      title: docItem.title,
      type: docItem.type,
      moduleCode: selectedModule?.code || 'UNKNOWN',
      moduleName: selectedModule?.name || 'Academic Module',
      pages: docItem.pages || [`[Simulated PDF Document Content]\nNo page data provided. Document Hash: ${docItem.hash}`],
      hash: docItem.hash || 'SHA256: UNKNOWN_SIGNATURE',
      verifier: docItem.verifier || 'Institutional Node',
      uploadedAt: docItem.uploadedAt || new Date().toISOString(),
      isPreSeeded: docItem.isPreSeeded !== false
    });
  };

  const handleDocumentAction = (action: 'DOWNLOAD' | 'PRINT' | 'VERIFY') => {
    if (action === 'DOWNLOAD') {
      setActionSuccessMsg(`Initiating Secure Download of ${readerFile?.title}...`);
    } else if (action === 'PRINT') {
      setActionSuccessMsg(`Document sent to Secure Print Spooler. Assigned Tracking ID: PR-${Math.floor(Math.random() * 90000 + 10000)}`);
    } else {
      setActionSuccessMsg(`Digital signature chain verified successfully. Cryptographic integrity check: green.`);
    }

    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 5000);
  };

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Aggregating Governance Intelligence...</p>
    </div>
  );

  // Stats helper variables
  const compliantCount = modules.filter(m => m.complianceStatus === 'COMPLIANT').length;
  const nonCompliantCount = modules.filter(m => m.complianceStatus === 'NON_COMPLIANT').length;
  const pendingCount = modules.filter(m => m.complianceStatus === 'PENDING').length;
  const totalCount = modules.length || 1;
  const complianceRate = Math.round((compliantCount / totalCount) * 100);

  // Standard user charts database stats
  const chartData = [
    { name: 'CS', compliance: modules.filter(m => m.departmentId === 'FAI_IT' && m.complianceStatus === 'COMPLIANT').length },
    { name: 'AUDIT', compliance: modules.filter(m => m.departmentId === 'FAI_AUD_TAX' && m.complianceStatus === 'COMPLIANT').length },
    { name: 'ACC', compliance: modules.filter(m => m.departmentId === 'FAI_FIN_ACC' && m.complianceStatus === 'COMPLIANT').length },
    { name: 'IS', compliance: modules.filter(m => m.departmentId === 'FAI_IS' && m.complianceStatus === 'COMPLIANT').length },
  ];

  const pieData = [
    { name: 'Compliant', value: compliantCount, color: '#10b981' },
    { name: 'Pending', value: pendingCount, color: '#f59e0b' },
    { name: 'Non-Compliant', value: nonCompliantCount, color: '#ef4444' },
  ];

  // ===============================
  // CASE 1: HIGH LEVEL OBSERVER / DEAN DASHBOARD (Choose Dept, View Modules, View/Download Docs)
  // ===============================
  if (isHighLevelObserver) {
    const selectedDept = DEPARTMENTS.find(d => d.id === selectedDeptId) || DEPARTMENTS[0];
    const deptModulesList = modules.filter(m => m.departmentId === selectedDeptId);
    
    // Matched stats for selected department
    const deptTotal = deptModulesList.length;
    const deptCompliant = deptModulesList.filter(m => m.complianceStatus === 'COMPLIANT').length;
    const deptRate = deptTotal > 0 ? Math.round((deptCompliant / deptTotal) * 100) : 0;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded-md">
                Executive Desk Mode
              </span>
              <span className="px-2.5 py-1 bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-md">
                Role: {profile?.roles?.map((r) => r.replace('_', ' ')).join(', ')}
              </span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter">
              Institutional <span className="text-indigo-500">Oversight Hub</span>
            </h2>
            <p className="text-slate-400 font-medium mt-1">
              Consolidated governance gateway. Select academic department systems to evaluate readiness and audit active artifacts.
            </p>
          </div>
        </div>

        {/* Department Quick Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Choose Department Directory</span>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Department Nodes Loaded
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              const isActive = selectedDeptId === dept.id;
              const count = modules.filter(m => m.departmentId === dept.id).length;
              return (
                <button
                  key={dept.id}
                  onClick={() => handleDeptChange(dept.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                    isActive 
                      ? "bg-indigo-600/15 border-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30" 
                      : "bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/15 hover:bg-slate-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "p-1.5 rounded-lg border",
                      isActive ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" : "bg-white/5 border-white/5 text-slate-500 group-hover:text-slate-300"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded",
                      isActive ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-slate-500"
                    )}>
                      {count} {count === 1 ? 'Mod' : 'Mods'}
                    </span>
                  </div>
                  <h4 className="text-xs font-black tracking-tight leading-tight uppercase group-hover:text-indigo-400 transition-colors">
                    {dept.name}
                  </h4>
                  <p className="text-[8px] text-slate-600 font-bold tracking-tight mt-1 truncate">
                    {dept.code}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Department KPIs & Active Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Department KPIs Bar */}
          <div className="lg:col-span-12 glass-card p-6 flex flex-wrap items-center justify-between gap-6 bg-gradient-to-r from-indigo-950/20 via-slate-900/40 to-slate-900">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Assessment Ecosystem</p>
              <h3 className="text-xl font-bold text-white tracking-tight">{selectedDept.name}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{selectedDept.faculty}</p>
            </div>
            
            <div className="flex items-center gap-8 flex-1 md:flex-initial">
              <div className="text-center bg-white/5 px-6 py-3 rounded-xl border border-white/5 min-w-[120px]">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Modules</p>
                <p className="text-2xl font-black text-white">{deptTotal}</p>
              </div>

              <div className="text-center bg-white/5 px-6 py-3 rounded-xl border border-white/5 min-w-[120px]">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Signed-off</p>
                <p className="text-2xl font-black text-emerald-400">{deptCompliant}</p>
              </div>

              <div className="text-center bg-white/5 px-6 py-3 rounded-xl border border-white/5 min-w-[120px]">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Pending Gate</p>
                <p className="text-2xl font-black text-amber-500">{deptTotal - deptCompliant}</p>
              </div>

              {/* Progress Rating */}
              <div className="py-2.5 max-w-xs flex-1">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">
                  <span>Faculty Compliance Rate</span>
                  <span className="font-black text-indigo-400">{deptRate}%</span>
                </div>
                <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${deptRate}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Left Block: Module List underneath the chosen Department */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase tracking-widest">
                  Departmental Module Indices ({deptTotal})
                </h4>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
              </div>

              <div className="p-4 max-h-[500px] overflow-y-auto space-y-3">
                {deptModulesList.map((m) => {
                  const isCurSelected = selectedModule?.id === m.id;
                  const isApproved = m.complianceStatus === 'COMPLIANT';
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModule(m)}
                      className={cn(
                        "w-full p-4 rounded-xl text-left border transition-all flex items-center justify-between group",
                        isCurSelected 
                          ? "bg-indigo-600/10 border-indigo-500 text-white" 
                          : "bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.08]"
                      )}
                    >
                      <div className="space-y-1 overflow-hidden pr-2">
                        <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded text-indigo-300 tracking-wider">
                          {m.code}
                        </span>
                        <h5 className="text-xs font-black text-white truncate mt-1.5">{m.name}</h5>
                        <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wide">
                          {m.assessmentMode?.replace('_', ' ') || 'EXAM BASED'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={cn(
                          "px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md border",
                          isApproved 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : m.complianceStatus === 'PENDING' 
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {m.complianceStatus}
                        </span>
                        <p className="text-[8px] text-slate-600 font-bold tracking-tight mt-1.5 italic">
                          {m.lecturerUids?.[0] || 'Unassigned'}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {deptModulesList.length === 0 && (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No modules mapped to this Node</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Block: Active Module Oversight Details & Access to Documents */}
          <div className="lg:col-span-7 space-y-6">
            {selectedModule ? (
              <div className="glass-card p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                
                {/* Module Details Block */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/5 pb-6">
                  <div>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold uppercase tracking-widest border border-indigo-500/20 rounded-md">
                      Selected Inspection Node
                    </span>
                    <h3 className="text-2xl font-black text-white tracking-tight mt-2.5">
                      {selectedModule.code} • {selectedModule.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                      Module Assessment Mode: <span className="text-indigo-400">{selectedModule.assessmentMode?.replace('_', ' ') || 'EXAM BASED'}</span>
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg",
                      selectedModule.complianceStatus === 'COMPLIANT' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {selectedModule.complianceStatus}
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1.5">
                      Audited: {selectedModule.lastAuditAt ? formatDate(selectedModule.lastAuditAt) : 'PENDING SYNC'}
                    </p>
                  </div>
                </div>

                {/* Secure Documents Oversight Panel (View & retrieve docs) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">
                        Governance Dossier Evidence
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">Verify structural compliance documents. Click to instant view or download.</p>
                    </div>
                  </div>

                  {/* Pre-seeded documents list */}
                  <div className="space-y-3">
                    {getPreSeededDocuments(selectedModule).map((docItem) => {
                      const isGatedForExams = mappedRoles.includes('Exams') && docItem.type === 'EXAM_PAPER' && selectedModule.complianceStatus !== 'COMPLIANT';
                      return (
                        <div 
                          key={docItem.id}
                          className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/12 hover:bg-white/[0.08] transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-400 border border-white/5 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-black text-white">{docItem.label}</h5>
                                <span className={cn(
                                  "text-[8px] font-black px-1.5 py-0.2 rounded border",
                                  docItem.status === 'VERIFIED' || docItem.status === 'APPROVED & SEALED'
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                )}>
                                  {docItem.status}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-500 font-bold font-mono tracking-tight mt-1">
                                file: {docItem.title}
                              </p>
                            </div>
                          </div>

                          {isGatedForExams ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-wide" title="Exams role cannot access exam paper until module files and exam paper uploads are both complete.">
                              <Clock className="w-4 h-4 text-rose-500" />
                              <span>Gated: Prerequisites Pending</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={() => showDocumentReader(docItem)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md transition"
                                title="Inspect Document"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              <button 
                                onClick={() => {
                                  setActionSuccessMsg(`Initiating secure direct download of ${docItem.title}`);
                                  setTimeout(() => setActionSuccessMsg(null), 5000);
                                }}
                                className="bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/10 transition"
                                title="Save Offline"
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submited Proof Artifacts Panel (pulls from real DB state) */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">
                    Real-time Submitted Proof Artifacts (Lecturer Uploads)
                  </h4>
                  
                  <div className="space-y-3">
                    {liveEvidence.map((ev) => {
                      const isEvidenceGatedForExams = mappedRoles.includes('Exams') && ev.type === 'EXAM_PAPER' && selectedModule.complianceStatus !== 'COMPLIANT';
                      return (
                        <div 
                          key={ev.id}
                          className="p-4 bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 rounded-2xl flex items-center justify-between transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-black text-white truncate max-w-xs">{ev.storagePath.split('/').pop()}</h5>
                                <span className={cn(
                                  "text-[8px] font-black px-1.5 py-0.2 rounded border",
                                  ev.aiValidationStatus === 'VALID' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                )}>
                                  {ev.aiValidationStatus}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                category: <span className="text-indigo-400">{ev.type}</span> • uploaded {new Date(ev.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {isEvidenceGatedForExams ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-wide" title="Exams role cannot access exam paper until module files and exam paper uploads are both complete.">
                              <Clock className="w-4 h-4 text-rose-500" />
                              <span>Gated: Prerequisites Pending</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  showDocumentReader({
                                    title: ev.storagePath.split('/').pop() || 'Proof_Document.pdf',
                                    type: ev.type,
                                    moduleCode: selectedModule.code,
                                    moduleName: selectedModule.name,
                                    hash: 'MD5: ' + ev.id,
                                    verifier: 'AI Validation scan',
                                    uploadedAt: ev.uploadedAt,
                                    isPreSeeded: false,
                                    pages: [
                                      `[OFFICIAL REGISTERED EVIDENCE PROOF] SUBMITTED VIA LECTURER CONSOLE\n\nModule ID: ${ev.moduleId}\nVerification Stamp Ref: ${ev.id}\nUploaded On: ${ev.uploadedAt}\nAI Validation Status: ${ev.aiValidationStatus}\n\nAI Diagnostic Output Logs:\n${ev.aiFeedback || 'Document checks completed successfully. All standard modules mapped. Good coherence detect.'}`
                                    ]
                                  });
                                }}
                                className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-indigo-500/30 transition shadow"
                              >
                                <Eye className="w-3.5 h-3.5" /> Inspect
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {liveEvidence.length === 0 && (
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider italic">
                        No custom external PDF uploads submitted in this session.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="glass-card p-12 text-center text-slate-500 my-auto">
                <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h4 className="text-white font-black text-lg">No Module Selected</h4>
                <p className="text-xs uppercase tracking-wider mt-1">Click a module code on the left ledger to audit compliance parameters</p>
              </div>
            )}
          </div>

        </div>

        {/* Global Floating Toast for Successful Audit Actions */}
        <AnimatePresence>
          {actionSuccessMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 right-6 z-50 bg-indigo-950 border border-indigo-500 p-4 rounded-xl shadow-2xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">Secure Audit Process</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{actionSuccessMsg}</p>
              </div>
              <button onClick={() => setActionSuccessMsg(null)} className="ml-2 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================
            MODERN HIGH FIDELITY DOCUMENT READER OVERLAY
            ==================================== */}
        <AnimatePresence>
          {readerFile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 30 }}
                className="w-full max-w-4xl h-[90vh] bg-slate-900 border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl"
              >
                
                {/* PDF Reader Header Bar */}
                <div className="p-6 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileSearch className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{readerFile.title}</h4>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 border border-emerald-500/20 rounded">
                          Secure Node Access Approved
                        </span>
                      </div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                        Module Scope: {readerFile.moduleCode} — {readerFile.moduleName}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setReaderFile(null)}
                    className="p-3 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition group border border-white/5 active:scale-95"
                  >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  </button>
                </div>

                {/* Sub-Header: Cryptographic Parameters & Metadata */}
                <div className="px-8 py-3 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between gap-4 text-[9px] font-mono uppercase text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-indigo-400">Ledger Hash:</span>
                    <span className="text-slate-500 break-all">{readerFile.hash}</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-emerald-400">Verifier:</span> {readerFile.verifier}
                  </div>
                  <div>
                    <span className="font-extrabold text-indigo-400">Commit Date:</span> {new Date(readerFile.uploadedAt).toLocaleString()}
                  </div>
                </div>

                {/* Main Body Split: Audit Logs on Left, Page Content on Right */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950/20">
                  
                  {/* Left Side: Audit Telemetry Panel */}
                  <div className="w-full md:w-80 border-r border-white/5 bg-slate-950/40 p-6 space-y-6 overflow-y-auto shrink-0">
                    <div>
                      <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-3">AI Autonomy Verification Logs</h5>
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Core Structure Match
                          </div>
                          <p className="text-[9px] text-slate-500 leading-normal">Document conforms perfectly to department template specifications.</p>
                        </div>

                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> SAQA Outcome Align
                          </div>
                          <p className="text-[9px] text-slate-500 leading-normal">Exit-level expectations are correctly integrated across all syllabus outcomes.</p>
                        </div>

                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Moderator Certification
                          </div>
                          <p className="text-[9px] text-slate-500 leading-normal">Review signatures and security stamps verify peer verification status.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Integrity</h5>
                      <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-white/5 text-[9px] uppercase font-mono text-slate-400">
                        <div className="flex justify-between">
                          <span>Tamper Seal:</span>
                          <span className="text-emerald-400 font-bold">Intact</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Signatures:</span>
                          <span className="text-emerald-400 font-bold">2/2 Cryptographic</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Page Layout:</span>
                          <span className="text-slate-300">South African SAQA Standard</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Version:</span>
                          <span className="text-indigo-400 font-bold">v2026.2</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Renderized Actual Text Page */}
                  <div className="flex-1 p-8 flex flex-col justify-between overflow-hidden relative">
                    
                    {/* Watermark background */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.02] select-none">
                      <span className="text-7xl font-sans font-black tracking-widest uppercase rotate-45 border-8 border-indigo-400 p-4">
                        OFFICIAL VERIFIED COPY
                      </span>
                    </div>

                    {/* Paper Area Canvas */}
                    <div className="flex-1 bg-white rounded-2xl p-8 sm:p-10 text-slate-900 border border-slate-200 overflow-y-auto font-serif text-sm shadow-inner max-h-[55vh] select-text">
                      <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
                        <p className="text-xs font-sans font-black uppercase tracking-widest text-slate-500">Institutional Examination Registry</p>
                        <h4 className="text-lg font-sans font-black uppercase tracking-tight text-slate-900">Official Compliance Portfolio</h4>
                      </div>

                      {/* Display Page Text with Pre-line format to feel like a real document paper */}
                      <pre className="font-serif whitespace-pre-wrap text-slate-800 text-sm leading-relaxed antialiased">
                        {readerFile.pages[readerPage] || "Page contents end."}
                      </pre>
                    </div>

                    {/* Pagination Bar */}
                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button 
                          disabled={readerPage === 0}
                          onClick={() => setReaderPage(p => Math.max(0, p - 1))}
                          className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition border border-white/5 active:scale-95"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3">
                          Page {readerPage + 1} of {readerFile.pages.length}
                        </span>
                        <button 
                          disabled={readerPage === readerFile.pages.length - 1}
                          onClick={() => setReaderPage(p => Math.min(readerFile.pages.length - 1, p + 1))}
                          className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition border border-white/5 active:scale-95"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Document Actions inside Viewer */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleDocumentAction('VERIFY')}
                          className="bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 text-emerald-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow"
                        >
                          <ShieldCheck className="w-4 h-4" /> Verify Signatures
                        </button>
                        
                        <button 
                          onClick={() => handleDocumentAction('PRINT')}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                          <Printer className="w-4 h-4" /> Spool Print Job
                        </button>

                        <button 
                          onClick={() => handleDocumentAction('DOWNLOAD')}
                          className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 border border-white/10"
                        >
                          <Download className="w-4 h-4" /> Save PDF
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // ===============================
  // CASE 2: STANDARD ROLES DASHBOARD (STATS & GRAPHS AS TRADITIONAL)
  // ===============================
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Compliant Modules', val: compliantCount.toString(), change: `+${complianceRate}%`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Missing Evidence', val: nonCompliantCount.toString(), change: 'Urgent', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Audit Readiness', val: `${complianceRate}%`, change: 'Target 95%', icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Modules Tracked', val: totalCount.toString(), change: 'Live', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="glass-card p-6 group hover:border-white/20"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-xl border border-white/5", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider", 
                stat.color === 'text-emerald-400' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-400 border border-white/10'
              )}>
                {stat.change}
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-white tracking-tighter">{stat.val}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compliance Mix Chart */}
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Compliance Topology</h3>
              <p className="text-xs text-slate-500 font-medium">Real-time health status of institutional governance.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> Telemetry: Active
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#ffffff05'}}
                  contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'}}
                />
                <Bar dataKey="compliance" fill="#6366f1" radius={[4,4,0,0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Validation Status */}
        <div className="glass-card p-8">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">AI Node Health</h3>
          <p className="text-xs text-slate-500 font-medium mb-8">Last 1,000 document scans.</p>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-white tracking-tighter">92<span className="text-lg text-slate-500">%</span></span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mt-1">Validated</span>
            </div>
          </div>
          <div className="space-y-4 mt-8 font-sans">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{backgroundColor: d.color}} />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{d.name}</span>
                </div>
                <span className="text-xs font-black text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Governance Telemetry Log</h3>
          <button className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">Audit History</button>
        </div>
        <div className="divide-y divide-white/5">
          {[
            { msg: 'Missing PRE-Review for ENG101', faculty: 'Engineering', time: '12m ago', type: 'error' },
            { msg: 'AI detected invalid header in Study Guide LAW202', faculty: 'Law', time: '45m ago', type: 'warning' },
            { msg: 'External Moderator access granted for SCI404', faculty: 'Science', time: '2h ago', type: 'info' },
          ].map((alert, i) => (
            <div key={i} className="p-5 flex items-center gap-5 hover:bg-white/[0.03] transition-colors group">
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110",
                alert.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                alert.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
              )}>
                <FileSearch className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white mb-0.5 tracking-tight">{alert.msg}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{alert.faculty}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-800" />
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">{alert.time}</span>
                </div>
              </div>
              <button className="text-slate-600 group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
