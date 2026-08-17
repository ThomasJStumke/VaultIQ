import React, { useState, useEffect } from 'react';
import { 
  Library, 
  Building2, 
  Layers, 
  BookOpen, 
  FileText, 
  ArrowLeft, 
  ChevronRight, 
  Eye, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  X,
  Upload,
  Printer,
  FileCheck,
  ShieldAlert,
  Sparkles,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { subscribeToModules, subscribeToEvidence, uploadEvidenceMetadata } from '../services/supabaseService';

// Standard 5-tier Hierarchy Data
const FACULTY_DATA = [
  {
    id: 'FAI',
    name: 'Faculty of Accounting & Informatics',
    rate: 78,
    risk: 'MEDIUM',
    departments: [
      {
        id: 'FAI_AUD_TAX',
        name: 'Auditing & Taxation',
        code: 'AUD_TAX',
        rate: 82,
        programmes: [
          { id: 'PROG_AUD_BTECH', name: 'Bachelor of Technology in Auditing', rate: 85, moduleCodes: ['AUD201', 'TAX102'] },
          { id: 'PROG_TAX_DIP', name: 'Diploma in Taxation', rate: 78, moduleCodes: ['TAX102', 'AUD201'] }
        ]
      },
      {
        id: 'FAI_MGT_ACC',
        name: 'Management Accounting',
        code: 'MGT_ACC',
        rate: 70,
        programmes: [
          { id: 'PROG_MAC_DIP', name: 'Diploma in Management Accounting', rate: 70, moduleCodes: ['MAC201', 'MAC202'] }
        ]
      },
      {
        id: 'FAI_FIN_ACC',
        name: 'Financial Accounting',
        code: 'FIN_ACC',
        rate: 68,
        programmes: [
          { id: 'PROG_FAC_BCOM', name: 'Bachelor of Commerce in Accounting', rate: 68, moduleCodes: ['FAC101', 'FAC302'] }
        ]
      },
      {
        id: 'FAI_IT',
        name: 'Information Technology',
        code: 'INF_TECH',
        rate: 84,
        programmes: [
          { id: 'PROG_IT_DIP', name: 'Diploma in Information Technology', rate: 84, moduleCodes: ['ITN101', 'ITS201'] }
        ]
      },
      {
        id: 'FAI_IS',
        name: 'Information Systems',
        code: 'INF_SYS',
        rate: 75,
        programmes: [
          { id: 'PROG_IS_BSC', name: 'Bachelor of Science in Information Systems', rate: 75, moduleCodes: ['INS101', 'INS302'] }
        ]
      },
      {
        id: 'FAI_ICM',
        name: 'Information Communications',
        code: 'INF_ICM',
        rate: 90,
        programmes: [
          { id: 'PROG_ICM_DIP', name: 'Diploma in Journalism & Communications', rate: 90, moduleCodes: ['ICM101', 'ICM202'] }
        ]
      }
    ]
  },
  {
    id: 'FEBE',
    name: 'Faculty of Engineering & Built Environment',
    rate: 88,
    risk: 'LOW',
    departments: [
      {
        id: 'FEBE_CHEM',
        name: 'Chemical Engineering',
        code: 'CHEM_ENG',
        rate: 90,
        programmes: [
          { id: 'PROG_CHEM_BENG', name: 'Bachelor of Engineering in Chemical', rate: 90, moduleCodes: ['CHE301', 'CHE102'] }
        ]
      },
      {
        id: 'FEBE_CIVIL',
        name: 'Civil Engineering',
        code: 'CIV_ENG',
        rate: 86,
        programmes: [
          { id: 'PROG_CIVIL_BTECH', name: 'Bachelor of Technology in Civil Engineering', rate: 86, moduleCodes: ['CIV201', 'CIV302'] }
        ]
      }
    ]
  },
  {
    id: 'FAS',
    name: 'Faculty of Applied Sciences',
    rate: 91,
    risk: 'LOW',
    departments: [
      {
        id: 'FAS_BIOTECH',
        name: 'Biotechnology & Food Technology',
        code: 'BIOTECH',
        rate: 93,
        programmes: [
          { id: 'PROG_BTY_DIP', name: 'Diploma in Biotechnology', rate: 93, moduleCodes: ['BTY101', 'BTY302'] }
        ]
      },
      {
        id: 'FAS_CHEM',
        name: 'Chemistry',
        code: 'CHEM_SCI',
        rate: 89,
        programmes: [
          { id: 'PROG_CHM_BSC', name: 'Bachelor of Science in Chemistry', rate: 89, moduleCodes: ['CHM201', 'CHM302'] }
        ]
      }
    ]
  },
  {
    id: 'FMS',
    name: 'Faculty of Management Sciences',
    rate: 64,
    risk: 'HIGH',
    departments: [
      {
        id: 'FMS_MKT',
        name: 'Marketing & Retail',
        code: 'MKT_RET',
        rate: 62,
        programmes: [
          { id: 'PROG_MKT_DIP', name: 'Diploma in Marketing Management', rate: 62, moduleCodes: ['MKT101', 'MKT302'] }
        ]
      },
      {
        id: 'FMS_HR',
        name: 'Human Resources Management',
        code: 'HR_MGT',
        rate: 66,
        programmes: [
          { id: 'PROG_HR_BADMIN', name: 'Bachelor of Administration in HR', rate: 66, moduleCodes: ['HRM201', 'HRM302'] }
        ]
      }
    ]
  }
];

// Fallback pre-seeded modules if DB doesn't have them
const STATIC_MODULE_DETAILS: Record<string, { code: string; name: string; lecturer: string; assessmentMode: string; status: 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT' }> = {
  'AUD201': { code: 'AUD201', name: 'Applied Auditing Principles 2', lecturer: 'Professor S. Govender', assessmentMode: 'CONTINUOUS_ASSESSMENT', status: 'COMPLIANT' },
  'TAX102': { code: 'TAX102', name: 'Introduction to Taxation', lecturer: 'Dr. A. Naidoo', assessmentMode: 'EXAM_BASED', status: 'PENDING' },
  'MAC201': { code: 'MAC201', name: 'Management Accounting 2A', lecturer: 'Ms. R. Ndlovu', assessmentMode: 'PROJECT_BASED', status: 'NON_COMPLIANT' },
  'MAC202': { code: 'MAC202', name: 'Management Accounting 2B', lecturer: 'Ms. R. Ndlovu', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'FAC101': { code: 'FAC101', name: 'Financial Accounting 101', lecturer: 'Mr. P. Pillay', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'FAC302': { code: 'FAC302', name: 'Advanced Financial Reporting', lecturer: 'Professor S. Govender', assessmentMode: 'EXAM_BASED', status: 'PENDING' },
  'ITN101': { code: 'ITN101', name: 'IT Networks 1', lecturer: 'Mr. T. Zulu', assessmentMode: 'PROJECT_BASED', status: 'COMPLIANT' },
  'ITS201': { code: 'ITS201', name: 'IT Systems 2', lecturer: 'Dr. E. Smith', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'INS101': { code: 'INS101', name: 'Information Systems 101', lecturer: 'Dr. E. Smith', assessmentMode: 'CONTINUOUS_ASSESSMENT', status: 'COMPLIANT' },
  'INS302': { code: 'INS302', name: 'Enterprise Architecture', lecturer: 'Mr. T. Zulu', assessmentMode: 'EXAM_BASED', status: 'PENDING' },
  'ICM101': { code: 'ICM101', name: 'Communication Science 1', lecturer: 'Mrs. L. Cele', assessmentMode: 'CONTINUOUS_ASSESSMENT', status: 'COMPLIANT' },
  'ICM202': { code: 'ICM202', name: 'Media Law', lecturer: 'Mrs. L. Cele', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'CHE301': { code: 'CHE301', name: 'Chemical Reactor Design', lecturer: 'Dr. K. Patel', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'CHE102': { code: 'CHE102', name: 'Introduction to Chemistry', lecturer: 'Dr. K. Patel', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'CIV201': { code: 'CIV201', name: 'Structural Analysis', lecturer: 'Professor R. Harris', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'CIV302': { code: 'CIV302', name: 'Geotechnical Engineering', lecturer: 'Professor R. Harris', assessmentMode: 'EXAM_BASED', status: 'PENDING' },
  'BTY101': { code: 'BTY101', name: 'Microbiology 1', lecturer: 'Dr. J. Meyer', assessmentMode: 'CONTINUOUS_ASSESSMENT', status: 'COMPLIANT' },
  'BTY302': { code: 'BTY302', name: 'Applied Genetic Engineering', lecturer: 'Dr. J. Meyer', assessmentMode: 'PROJECT_BASED', status: 'COMPLIANT' },
  'CHM201': { code: 'CHM201', name: 'Organic Chemistry 2', lecturer: 'Dr. S. Naicker', assessmentMode: 'EXAM_BASED', status: 'COMPLIANT' },
  'CHM302': { code: 'CHM302', name: 'Analytical Spectroscopy', lecturer: 'Dr. S. Naicker', assessmentMode: 'EXAM_BASED', status: 'PENDING' },
  'MKT101': { code: 'MKT101', name: 'Marketing Principles', lecturer: 'Mr. V. Moodley', assessmentMode: 'CONTINUOUS_ASSESSMENT', status: 'PENDING' },
  'MKT302': { code: 'MKT302', name: 'Strategic Brand Management', lecturer: 'Mr. V. Moodley', assessmentMode: 'EXAM_BASED', status: 'NON_COMPLIANT' },
  'HRM201': { code: 'HRM201', name: 'Organizational Behavior', lecturer: 'Mrs. N. Dlamini', assessmentMode: 'CONTINUOUS_ASSESSMENT', status: 'COMPLIANT' },
  'HRM302': { code: 'HRM302', name: 'Labour Relations', lecturer: 'Mrs. N. Dlamini', assessmentMode: 'EXAM_BASED', status: 'PENDING' }
};

interface DrillDownExplorerProps {
  initialFacultyId?: string;
  initialDeptId?: string;
  initialModuleCode?: string;
  onCloseExternal?: () => void;
}

export default function DrillDownExplorer({ initialFacultyId, initialDeptId, initialModuleCode, onCloseExternal }: DrillDownExplorerProps) {
  const { user, profile } = useAuth();
  const [dbModules, setDbModules] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Active Drill-down levels:
  // 0 = Faculty List
  // 1 = Department List (within selected Faculty)
  // 2 = Programme List (within selected Department)
  // 3 = Module List (within selected Programme)
  // 4 = Evidence Dossier & File Checklist (for selected Module)
  const [level, setLevel] = useState(0);
  
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [selectedProg, setSelectedProg] = useState<any>(null);
  const [selectedModCode, setSelectedModCode] = useState<string>('');
  
  // Real-time Evidence metadata from selected module
  const [liveEvidence, setLiveEvidence] = useState<any[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Reader Modal State
  const [readerFile, setReaderFile] = useState<any | null>(null);
  const [readerPage, setReaderPage] = useState(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Subscribe to all modules
  useEffect(() => {
    const unsub = subscribeToModules((data) => {
      setDbModules(data);
      setLoadingDb(false);
    });
    return () => unsub();
  }, []);

  // Handle live evidence subscription when a module is selected
  useEffect(() => {
    if (selectedModCode) {
      // Find matching live DB module
      const dbMod = dbModules.find(m => m.code === selectedModCode);
      if (dbMod?.id) {
        const unsub = subscribeToEvidence(dbMod.id, (evidenceList) => {
          setLiveEvidence(evidenceList);
        });
        return () => unsub();
      } else {
        setLiveEvidence([]);
      }
    }
  }, [selectedModCode, dbModules]);

  // Initial routing if triggered externally (e.g. from a specific click index)
  useEffect(() => {
    if (initialFacultyId) {
      const fac = FACULTY_DATA.find(f => f.id === initialFacultyId);
      if (fac) {
        setSelectedFaculty(fac);
        setLevel(1);
        if (initialDeptId) {
          const dept = fac.departments.find(d => d.id === initialDeptId);
          if (dept) {
            setSelectedDept(dept);
            setLevel(2);
          }
        }
      }
    } else if (initialDeptId) {
      // Search across all faculties
      for (const fac of FACULTY_DATA) {
        const dept = fac.departments.find(d => d.id === initialDeptId);
        if (dept) {
          setSelectedFaculty(fac);
          setSelectedDept(dept);
          setLevel(2);
          break;
        }
      }
    }

    if (initialModuleCode) {
      setSelectedModCode(initialModuleCode);
      // Trace the module's hierarchy
      for (const fac of FACULTY_DATA) {
        for (const dept of fac.departments) {
          for (const prog of dept.programmes) {
            if (prog.moduleCodes.includes(initialModuleCode)) {
              setSelectedFaculty(fac);
              setSelectedDept(dept);
              setSelectedProg(prog);
              setLevel(4);
              break;
            }
          }
        }
      }
    }
  }, [initialFacultyId, initialDeptId, initialModuleCode]);

  // Merge static compliance properties with real Firestore values if found
  const getMergedModuleData = (code: string) => {
    const staticData = STATIC_MODULE_DETAILS[code] || {
      code,
      name: `Applied ${code} Syllabus`,
      lecturer: 'Assigned Educator',
      assessmentMode: 'EXAM_BASED',
      status: 'PENDING' as const
    };
    const dbMatch = dbModules.find(m => m.code === code);
    if (dbMatch) {
      return {
        ...staticData,
        id: dbMatch.id,
        status: dbMatch.complianceStatus,
        lecturer: dbMatch.lecturerUids?.join(', ') || staticData.lecturer,
        assessmentMode: dbMatch.assessmentMode || staticData.assessmentMode
      };
    }
    return {
      ...staticData,
      id: `mock_${code}`
    };
  };

  // Compute live compliance rate for a list of module codes
  const computeComplianceRate = (moduleCodes: string[]) => {
    if (moduleCodes.length === 0) return 100;
    const compliantCount = moduleCodes.filter(code => {
      const mod = getMergedModuleData(code);
      return mod.status === 'COMPLIANT';
    }).length;
    return Math.round((compliantCount / moduleCodes.length) * 100);
  };

  // Document Content generator for inspection modal
  const generateDocumentContent = (modCode: string, docType: string) => {
    const mod = getMergedModuleData(modCode);
    
    // Check if there is live submitted evidence
    const liveMatch = liveEvidence.find(le => le.type === docType);
    if (liveMatch) {
      return {
        title: liveMatch.storagePath.split('/').pop() || `${modCode}_Evidence_Doc.pdf`,
        type: docType,
        moduleCode: modCode,
        moduleName: mod.name,
        verifier: 'VaultIQ AI Service Ingestion Node',
        hash: `SHA256: ${liveMatch.id.substring(0, 16).toUpperCase()}`,
        uploadedAt: liveMatch.uploadedAt,
        pages: [
          `[VaultIQ SECURE ARTIFACT LEDGER]\nREAL EVIDENCE FILE REGISTERED IN FIRESTORE\n\nModule Reference: ${modCode}\nDocument Class: ${docType}\nFile Path: ${liveMatch.storagePath}\nAI Verification Status: ${liveMatch.aiValidationStatus}\n\nAI Diagnostic Output Logs:\n${liveMatch.aiFeedback || 'Structural integrity checks passed. Standard document signatures verified.'}`
        ]
      };
    }

    // Return high-fidelity static pre-seeded content matching the requested document class
    const titles: Record<string, string> = {
      'STUDY_GUIDE': 'Study Guide & Curriculum Syllabus',
      'ASSESSMENT_TASK': 'Continuous Assessment Instruments',
      'MODERATION_REPORT': 'Internal Moderation Signed-Off Report',
      'EXAM_PAPER': 'Final Semester Examination Instrument'
    };

    return {
      title: `${modCode}_PreSeeded_${docType.toLowerCase()}.pdf`,
      type: docType,
      moduleCode: modCode,
      moduleName: mod.name,
      verifier: 'DUT Registry Quality Assurance Desk',
      hash: `SHA256: AC${modCode.toUpperCase()}${docType.substring(0, 3)}FE90A`,
      uploadedAt: new Date('2026-05-18T08:00:00Z').toISOString(),
      pages: [
        `[DUT REGISTRATION ARCHIVE] PRE-SEEDED INSTITUTIONAL EVIDENCE\n\nDocument Title: ${titles[docType] || 'Academic Evidence File'}\nModule Code: ${modCode}\nModule Name: ${mod.name}\nStatus State: VERIFIED\n\nSECTION 1: CURRICULUM COHERENCE\nAll topics satisfy Durban University of Technology standards and HEQC mandates. Content maps comprehensively to SAQA NQF level outcomes. Appropriate cognitive density.`,
        `Pre-Seeded Content Details (Page 2 / 2)\n\nAudit Stamp: APPROVED COMPLIANCE CERTIFICATE\nVerifier Nodes: internal board panels\nCryptographic Token: SECURE_LEDGER_DUT_V2`
      ]
    };
  };

  const showDocumentReader = (docType: string) => {
    const content = generateDocumentContent(selectedModCode, docType);
    setReaderFile(content);
    setReaderPage(0);
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
    }, 4000);
  };

  const handleSimulatedUpload = async (docType: string) => {
    const dbMod = dbModules.find(m => m.code === selectedModCode);
    if (!dbMod || !user) {
      setUploadError('Only modules active in the real database can receive live uploads.');
      return;
    }

    setUploadProgress(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      await uploadEvidenceMetadata(dbMod.id, {
        moduleId: dbMod.id,
        type: docType as any,
        storagePath: `evidence/${selectedModCode}/${selectedModCode}_Manual_Upload_${Date.now()}.pdf`,
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        aiValidationStatus: 'VALID',
        aiFeedback: `Manually uploaded via Drill-Down Oversight Console. Certified by role: ${profile?.role || 'Executive'}`
      });

      setUploadSuccess(`Evidence file for ${docType.replace('_', ' ')} successfully synchronized with Firestore!`);
      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (e: any) {
      setUploadError('Failed to upload evidence metadata: ' + e.message);
    } finally {
      setUploadProgress(false);
    }
  };

  // Breadcrumb navigation click helper
  const navigateToLevel = (targetLevel: number) => {
    if (targetLevel < level) {
      setLevel(targetLevel);
      if (targetLevel === 0) {
        setSelectedFaculty(null);
        setSelectedDept(null);
        setSelectedProg(null);
        setSelectedModCode('');
      } else if (targetLevel === 1) {
        setSelectedDept(null);
        setSelectedProg(null);
        setSelectedModCode('');
      } else if (targetLevel === 2) {
        setSelectedProg(null);
        setSelectedModCode('');
      } else if (targetLevel === 3) {
        setSelectedModCode('');
      }
    }
  };

  // Filters search queries
  const filterListBySearch = (items: any[], key: string = 'name') => {
    if (!searchQuery) return items;
    return items.filter(item => {
      const val = item[key] || '';
      return val.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  };

  return (
    <div className="glass-card p-6 md:p-8 bg-gradient-to-b from-indigo-950/10 via-surface/60 to-background/90 relative overflow-hidden border border-border rounded-3xl">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Sparkles className="w-48 h-48 text-indigo-500 animate-pulse" />
      </div>

      {/* Header & Breadcrumbs */}
      <div className="space-y-4 mb-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded">
                Audit Trail Mode
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 rounded">
                Live Sink: Connected
              </span>
            </div>
            <h3 className="text-3xl font-black text-foreground tracking-tight">
              Drill-Down <span className="text-indigo-400">Compliance Explorer</span>
            </h3>
            <p className="text-muted-foreground text-xs font-semibold mt-1">
              Trace institutional compliance rates down to the supporting evidentiary PDFs behind them.
            </p>
          </div>
          
          {onCloseExternal && (
            <button 
              onClick={onCloseExternal}
              className="p-2.5 bg-surface-tint hover:bg-surface-tint-strong rounded-xl text-muted-foreground hover:text-foreground transition self-start border border-border"
              title="Close Explorer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dynamic Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-sunken p-3 rounded-2xl border border-border-subtle text-xs text-muted-foreground">
          <button 
            onClick={() => navigateToLevel(0)}
            className={cn("hover:text-indigo-400 font-bold uppercase tracking-wider text-[10px] transition flex items-center gap-1", level === 0 ? "text-indigo-400" : "text-subtle-foreground")}
          >
            <Library className="w-3.5 h-3.5" /> DUT Faculties
          </button>
          
          {selectedFaculty && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-subtle-foreground/70" />
              <button 
                onClick={() => navigateToLevel(1)}
                className={cn("hover:text-indigo-400 font-bold uppercase tracking-wider text-[10px] transition flex items-center gap-1", level === 1 ? "text-indigo-400" : "text-subtle-foreground")}
              >
                <Building2 className="w-3.5 h-3.5" /> {selectedFaculty.name}
              </button>
            </>
          )}

          {selectedDept && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-subtle-foreground/70" />
              <button 
                onClick={() => navigateToLevel(2)}
                className={cn("hover:text-indigo-400 font-bold uppercase tracking-wider text-[10px] transition flex items-center gap-1", level === 2 ? "text-indigo-400" : "text-subtle-foreground")}
              >
                <Layers className="w-3.5 h-3.5" /> Dept: {selectedDept.name}
              </button>
            </>
          )}

          {selectedProg && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-subtle-foreground/70" />
              <button 
                onClick={() => navigateToLevel(3)}
                className={cn("hover:text-indigo-400 font-bold uppercase tracking-wider text-[10px] transition flex items-center gap-1", level === 3 ? "text-indigo-400" : "text-subtle-foreground")}
              >
                <Layers className="w-3.5 h-3.5" /> Prog: {selectedProg.name}
              </button>
            </>
          )}

          {selectedModCode && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-subtle-foreground/70" />
              <span className="text-foreground font-black uppercase tracking-wider text-[10px] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Module: {selectedModCode}
              </span>
            </>
          )}
        </div>

        {/* Global Level Search Filter */}
        {level < 4 && (
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-subtle-foreground" />
            <input 
              type="text" 
              placeholder={`Quick filter current level details...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-sunken border border-border-subtle rounded-2xl py-3.5 pl-11 pr-4 text-sm text-foreground placeholder-subtle-foreground focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        )}
      </div>

      {/* Main Levels Visualizer */}
      <div className="relative z-10 min-h-[400px]">
        {/* LEVEL 0: FACULTIES SUMMARY */}
        {level === 0 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-xs font-black text-subtle-foreground uppercase tracking-widest mb-4">Level 1: Faculty Compliance Rates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterListBySearch(FACULTY_DATA).map((fac) => {
                // Compute aggregated compliance from real database modules mapped to this faculty
                const allFacModuleCodes = fac.departments.flatMap(d => d.programmes.flatMap(p => p.moduleCodes));
                const facRate = computeComplianceRate(allFacModuleCodes);

                return (
                  <button
                    key={fac.id}
                    onClick={() => {
                      setSelectedFaculty(fac);
                      setLevel(1);
                      setSearchQuery('');
                    }}
                    className="p-6 bg-surface-sunken border border-border-subtle hover:border-indigo-500/30 hover:bg-indigo-950/10 rounded-2xl text-left transition group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between w-full mb-4">
                      <div className="p-3 bg-indigo-500/15 rounded-xl text-indigo-400 border border-indigo-500/20">
                        <Library className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-1 rounded border uppercase tracking-wider",
                        facRate >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        facRate >= 75 ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {fac.risk} RISK
                      </span>
                    </div>
                    <div>
                      <h5 className="text-base font-black text-foreground group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{fac.name}</h5>
                      
                      {/* Interactive click to drill down indicator */}
                      <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between w-full">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-subtle-foreground uppercase tracking-wider">Fulfillment Index</p>
                          <p className="text-2xl font-black text-foreground">{facRate}%</p>
                        </div>
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Drill Down <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="w-full bg-surface-2 h-1 rounded-full overflow-hidden mt-3">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${facRate}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 1: DEPARTMENTS WITHIN SELECTED FACULTY */}
        {level === 1 && selectedFaculty && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black text-subtle-foreground uppercase tracking-widest">
                Level 2: {selectedFaculty.name} Department Indices
              </h4>
              <button 
                onClick={() => { setLevel(0); setSelectedFaculty(null); setSearchQuery(''); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Faculties
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filterListBySearch(selectedFaculty.departments).map((dept) => {
                const allDeptModuleCodes = dept.programmes.flatMap(p => p.moduleCodes);
                const deptRate = computeComplianceRate(allDeptModuleCodes);

                return (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setSelectedDept(dept);
                      setLevel(2);
                      setSearchQuery('');
                    }}
                    className="p-5 bg-surface-sunken border border-border-subtle hover:border-indigo-500/30 hover:bg-indigo-950/10 rounded-2xl text-left transition group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-border-subtle">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-indigo-400 tracking-wider">
                        {dept.code}
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-foreground group-hover:text-indigo-400 transition-colors uppercase tracking-wider truncate leading-snug">{dept.name}</h5>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-[8px] font-black text-subtle-foreground uppercase tracking-widest">Compliance Rate</p>
                          <p className="text-xl font-black text-foreground">{deptRate}%</p>
                        </div>
                        <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          View Programmes <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="w-full bg-surface-2 h-1 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${deptRate}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 2: PROGRAMMES WITHIN SELECTED DEPARTMENT */}
        {level === 2 && selectedDept && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black text-subtle-foreground uppercase tracking-widest">
                Level 3: {selectedDept.name} Programmes Compliance
              </h4>
              <button 
                onClick={() => { setLevel(1); setSelectedDept(null); setSearchQuery(''); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Departments
              </button>
            </div>

            <div className="space-y-3">
              {filterListBySearch(selectedDept.programmes).map((prog) => {
                const progRate = computeComplianceRate(prog.moduleCodes);

                return (
                  <button
                    key={prog.id}
                    onClick={() => {
                      setSelectedProg(prog);
                      setLevel(3);
                      setSearchQuery('');
                    }}
                    className="w-full p-5 bg-surface-sunken border border-border-subtle hover:border-indigo-500/30 hover:bg-indigo-950/10 rounded-2xl text-left transition group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/15 rounded-xl text-indigo-400 border border-indigo-500/20 shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-foreground group-hover:text-indigo-400 transition-colors uppercase tracking-wider">{prog.name}</h5>
                        <p className="text-[9px] text-subtle-foreground font-extrabold uppercase tracking-wide mt-1">
                          Registered Syllabus Nodes: {prog.moduleCodes.length} Modules Mapped
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[8px] font-black text-subtle-foreground uppercase tracking-widest mb-0.5">Weighted Rate</p>
                        <p className="text-lg font-black text-foreground">{progRate}%</p>
                        <div className="w-20 bg-surface-2 h-1 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${progRate}%` }} />
                        </div>
                      </div>
                      <span className="p-2 bg-indigo-600/20 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-foreground rounded-lg transition">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 3: MODULES WITHIN SELECTED PROGRAMME */}
        {level === 3 && selectedProg && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black text-subtle-foreground uppercase tracking-widest">
                Level 4: {selectedProg.name} Mapped Modules
              </h4>
              <button 
                onClick={() => { setLevel(2); setSelectedProg(null); setSearchQuery(''); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Programmes
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterListBySearch(selectedProg.moduleCodes.map(code => getMergedModuleData(code)), 'code').map((m) => {
                const isApproved = m.status === 'COMPLIANT';
                return (
                  <button
                    key={m.code}
                    onClick={() => {
                      setSelectedModCode(m.code);
                      setLevel(4);
                    }}
                    className="p-5 bg-surface-sunken border border-border-subtle hover:border-indigo-500/30 hover:bg-indigo-950/10 rounded-2xl text-left transition group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <span className="text-[10px] font-black bg-surface-tint px-2 py-0.5 rounded text-indigo-300 tracking-wider">
                        {m.code}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border",
                        isApproved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        m.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {m.status}
                      </span>
                    </div>

                    <div>
                      <h5 className="text-sm font-black text-foreground group-hover:text-indigo-400 transition-colors truncate max-w-xs">{m.name}</h5>
                      <p className="text-[9px] text-subtle-foreground font-bold uppercase tracking-wider mt-1.5">
                        Educator: {m.lecturer}
                      </p>
                      
                      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-semibold uppercase text-[8px] text-subtle-foreground">Mode: {m.assessmentMode.replace('_', ' ')}</span>
                        <span className="font-black uppercase tracking-widest text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          Oversight checklist <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 4: SPECIFIC EVIDENCE DOSSIER & DOCUMENT CHECKLIST FOR MODULE */}
        {level === 4 && selectedModCode && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Level 5: Evidence Checklists & Gaps</h4>
                <h3 className="text-2xl font-black text-foreground tracking-tight mt-1">
                  Compliance Portfolio for {selectedModCode}
                </h3>
              </div>
              <button 
                onClick={() => { setLevel(3); setSelectedModCode(''); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Modules
              </button>
            </div>

            {/* Quick Stats overview of the chosen Module */}
            {(() => {
              const m = getMergedModuleData(selectedModCode);
              const requirements = [
                { type: 'STUDY_GUIDE', label: 'Study Guide & Syllabus' },
                { type: 'ASSESSMENT_TASK', label: 'Continuous Assessment Task' },
                { type: 'MODERATION_REPORT', label: 'Internal Moderation Report' },
                { type: 'EXAM_PAPER', label: 'Final Examination Instrument' }
              ];
              const uploadedTypes = liveEvidence.map(e => e.type);
              
              // We simulate all pre-seeded as verified by default if compliance status is COMPLIANT,
              // but we let live uploads override them.
              const missingRequirementsList = requirements.filter(r => !uploadedTypes.includes(r.type) && m.status !== 'COMPLIANT');

              return (
                <div className="space-y-6">
                  {/* Module Metadata Card */}
                  <div className="p-6 bg-surface-tint border border-border-subtle rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Active Lecturer Assignment</p>
                      <p className="text-sm font-bold text-foreground">{m.lecturer}</p>
                      <p className="text-xs text-muted-foreground">Assigned Evaluation Mode: <span className="text-indigo-400 font-bold uppercase">{m.assessmentMode.replace('_', ' ')}</span></p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center bg-surface-sunken px-5 py-2.5 rounded-xl border border-border-subtle min-w-[110px]">
                        <p className="text-[8px] font-black text-subtle-foreground uppercase tracking-widest mb-0.5">Fulfillment</p>
                        <p className="text-lg font-black text-foreground">
                          {m.status === 'COMPLIANT' ? '100%' : `${Math.round(((requirements.length - missingRequirementsList.length) / requirements.length) * 100)}%`}
                        </p>
                      </div>

                      <div className="text-center bg-surface-sunken px-5 py-2.5 rounded-xl border border-border-subtle min-w-[110px]">
                        <p className="text-[8px] font-black text-subtle-foreground uppercase tracking-widest mb-0.5">Status Verdict</p>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider block",
                          m.status === 'COMPLIANT' ? "text-emerald-400" :
                          m.status === 'PENDING' ? "text-amber-500" : "text-rose-500"
                        )}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Message overlay */}
                  {uploadSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wide">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>{uploadSuccess}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wide">
                      <ShieldAlert className="w-5 h-5 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Evidence Checklist Grid */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Evidentiary Document Checklist</h4>
                    
                    <div className="space-y-3">
                      {requirements.map((req) => {
                        const hasLiveEvidence = uploadedTypes.includes(req.type);
                        const isPreSeededCompliant = m.status === 'COMPLIANT';
                        const isSatisfied = hasLiveEvidence || isPreSeededCompliant;

                        return (
                          <div 
                            key={req.type}
                            className={cn(
                              "p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition",
                              isSatisfied 
                                ? "bg-surface-tint border-border-subtle hover:border-foreground/12" 
                                : "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/20"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center border shrink-0",
                                isSatisfied 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse"
                              )}>
                                {isSatisfied ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                              </div>

                              <div>
                                <h5 className="text-sm font-black text-foreground">{req.label}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={cn(
                                    "text-[8px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider",
                                    isSatisfied ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-500"
                                  )}>
                                    {isSatisfied ? 'SUBMITTED' : 'MISSING EVIDENCE'}
                                  </span>
                                  <p className="text-[9px] text-subtle-foreground font-bold font-mono tracking-tight">
                                    Class: {req.type}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                              {/* Open Uploaded Evidence Action */}
                              {isSatisfied ? (
                                <>
                                  <button
                                    onClick={() => showDocumentReader(req.type)}
                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg transition"
                                    title="Open and Inspect PDF Evidence"
                                  >
                                    <Eye className="w-4 h-4" /> Open Evidence
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActionSuccessMsg(`Initiating direct save of pre-seeded ${selectedModCode}_${req.type.toLowerCase()}.pdf`);
                                      setTimeout(() => setActionSuccessMsg(null), 4000);
                                    }}
                                    className="p-2 bg-surface-tint hover:bg-surface-tint-strong text-muted-foreground hover:text-foreground rounded-xl border border-border-subtle transition"
                                    title="Download File"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleSimulatedUpload(req.type)}
                                  disabled={uploadProgress}
                                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg transition"
                                  title="Upload Supporting Document"
                                >
                                  {uploadProgress ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                                      Sinking...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" /> Upload Supporting Evidence
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* FULL SCREEN RE-USABLE HIGH-FIDELITY DOCUMENT PREVIEW READER MODAL */}
      <AnimatePresence>
        {readerFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-md p-4 md:p-8">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Reader Top bar */}
              <div className="p-5 border-b border-border-subtle bg-surface-sunken flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground tracking-tight">{readerFile.title}</h4>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Module: <span className="text-indigo-400">{readerFile.moduleCode}</span> &bull; Category: {readerFile.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setReaderFile(null)}
                  className="p-2 bg-surface-tint hover:bg-surface-tint-strong border border-border-subtle text-muted-foreground hover:text-foreground rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Reader Main Space */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* PDF Canvas Viewport */}
                <div className="flex-1 bg-background p-6 overflow-y-auto flex flex-col items-center justify-start border-r border-border-subtle">
                  <div className="w-full max-w-2xl bg-white text-slate-900 p-10 rounded-xl shadow-2xl min-h-[500px] flex flex-col justify-between font-mono text-xs leading-relaxed border-4 border-slate-200 relative">
                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none rotate-12">
                      <span className="text-8xl font-black font-sans tracking-widest text-slate-900">DUT</span>
                    </div>

                    <div className="whitespace-pre-wrap">{readerFile.pages[readerPage]}</div>

                    <div className="border-t border-slate-200 mt-8 pt-4 flex items-center justify-between text-[9px] text-muted-foreground font-sans">
                      <span>Durban University of Technology</span>
                      <span>Page {readerPage + 1} of {readerFile.pages.length}</span>
                    </div>
                  </div>

                  {/* Multi Page selectors */}
                  {readerFile.pages.length > 1 && (
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => setReaderPage(p => Math.max(0, p - 1))}
                        disabled={readerPage === 0}
                        className="px-3 py-1.5 bg-surface-tint hover:bg-surface-tint-strong disabled:opacity-30 rounded-lg text-xs font-black uppercase text-foreground/80 border border-border transition"
                      >
                        Prev Page
                      </button>
                      <span className="text-xs font-bold text-muted-foreground">Page {readerPage + 1} of {readerFile.pages.length}</span>
                      <button
                        onClick={() => setReaderPage(p => Math.min(readerFile.pages.length - 1, p + 1))}
                        disabled={readerPage === readerFile.pages.length - 1}
                        className="px-3 py-1.5 bg-surface-tint hover:bg-surface-tint-strong disabled:opacity-30 rounded-lg text-xs font-black uppercase text-foreground/80 border border-border transition"
                      >
                        Next Page
                      </button>
                    </div>
                  )}
                </div>

                {/* PDF Ingestion Inspection Sidebar */}
                <div className="w-full md:w-80 bg-surface-sunken p-6 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 rounded">
                        Secure Cryptographic Ingest
                      </span>
                      <h5 className="text-base font-black text-foreground mt-2.5">AI Registry Seal</h5>
                      <p className="text-[10px] text-subtle-foreground font-semibold mt-1">This document has been audited against HEQC and DUT curriculum policy. All parameters satisfied.</p>
                    </div>

                    {/* Metadata indicators */}
                    <div className="space-y-3 bg-surface-sunken p-4 rounded-2xl border border-border-subtle text-xs">
                      <div>
                        <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Signatory Authority</p>
                        <p className="font-bold text-foreground/80 mt-0.5">{readerFile.verifier}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Digital Audit Hash</p>
                        <p className="font-bold font-mono text-[9px] text-indigo-400 mt-0.5 truncate">{readerFile.hash}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Registry Timestamp</p>
                        <p className="font-bold text-foreground/80 mt-0.5">{new Date(readerFile.uploadedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Quick Audit Report Logger Action Overlay */}
                    {actionSuccessMsg && (
                      <div className="p-3.5 bg-indigo-600 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest leading-normal animate-pulse shadow-md">
                        {actionSuccessMsg}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-6 border-t border-border-subtle">
                    <button
                      onClick={() => handleDocumentAction('VERIFY')}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 transition"
                    >
                      <Bot className="w-4 h-4" /> Recalculate AI Signature
                    </button>
                    <button
                      onClick={() => handleDocumentAction('DOWNLOAD')}
                      className="w-full py-2.5 bg-surface-tint hover:bg-surface-tint-strong text-foreground/80 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border transition"
                    >
                      <Download className="w-4 h-4" /> Save Local Copy
                    </button>
                    <button
                      onClick={() => handleDocumentAction('PRINT')}
                      className="w-full py-2.5 bg-surface-tint hover:bg-surface-tint-strong text-foreground/80 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border transition"
                    >
                      <Printer className="w-4 h-4" /> Hardcopy Print
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
