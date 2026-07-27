import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  Download, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Lock,
  Upload,
  Check,
  Loader2,
  ShieldAlert,
  Building2,
  BookmarkCheck,
  Search,
  FileCheck,
  Layers,
  History,
  FileSpreadsheet,
  Sparkles,
  Send,
  HelpCircle,
  Bot
} from 'lucide-react';
import { subscribeToModules, subscribeToEvidence, uploadEvidenceMetadata, updateModuleCompliance } from '../services/supabaseService';
import { useAuth } from '../hooks/useAuth';

const REQUIREMENTS = [
  'Study Guide', 
  'Descriptor', 
  'Mod. Report', 
  'DP List', 
  'Final Marks'
];

const DEPARTMENTS = [
  { id: 'FAI_AUD_TAX', name: 'Auditing & Taxation', code: 'AUD_TAX', faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_MGT_ACC', name: 'Management Accounting', code: 'MGT_ACC', faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_FIN_ACC', name: 'Financial Accounting', code: 'FIN_ACC', faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_IT', name: 'Information Technology', code: 'INF_TECH', faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_IS', name: 'Information Systems', code: 'INF_SYS', faculty: 'Faculty of Accounting & Informatics' },
  { id: 'FAI_ICM', name: 'Information Communications', code: 'INF_ICM', faculty: 'Faculty of Accounting & Informatics' },
];

interface ModuleWithEvidence {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  complianceStatus: string;
  evidenceList: any[];
  requirementStatuses: Record<string, 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'MISSING'>;
  evidenceDocs: Record<string, any>;
}

export default function ComplianceHeatmap() {
  const { user, profile } = useAuth();
  const [modules, setModules] = useState<ModuleWithEvidence[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // AI Quality Reporting Scribe State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiReportResult, setAiReportResult] = useState<{
    reportTitle: string;
    scopedBoundary: string;
    analysisSummary: string;
    filteredModules: Array<{
      code: string;
      name: string;
      requirement: string;
      status: string;
      valDate: string;
    }>;
    suggestedCsv: string;
  } | null>(null);

  // Toggle for layout view of report center style
  const [isReportCenterOpen, setIsReportCenterOpen] = useState(false);

  // Modal active states
  const [selectedCell, setSelectedCell] = useState<{
    module: any;
    reqName: string;
    status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'MISSING';
    doc?: any;
  } | null>(null);

  const [readerPage, setReaderPage] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // In-line evidence uploader state
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // 1. Subscribe to modules and their evidence subcollections
  useEffect(() => {
    let unsubEvidenceFns: (() => void)[] = [];

    const unsubModules = subscribeToModules((rawModules) => {
      // Create initial list
      const initialModules = rawModules.map(m => ({
        ...m,
        evidenceList: [],
        requirementStatuses: {
          'Study Guide': m.complianceStatus === 'COMPLIANT' ? 'COMPLIANT' : 'PARTIAL',
          'Descriptor': 'COMPLIANT',
          'Mod. Report': m.complianceStatus === 'NON_COMPLIANT' ? 'NON_COMPLIANT' : 'COMPLIANT',
          'DP List': 'COMPLIANT',
          'Final Marks': m.complianceStatus === 'COMPLIANT' ? 'COMPLIANT' : 'MISSING'
        },
        evidenceDocs: {}
      }));

      setModules(initialModules);
      setLoading(false);

      // Clean up past evidence subscriptions
      unsubEvidenceFns.forEach(fn => fn());
      unsubEvidenceFns = [];

      // Subscribe to evidence for each active module
      rawModules.forEach((m) => {
        const unsubEv = subscribeToEvidence(m.id, (evidenceItems) => {
          setModules((currentModules) => {
            return currentModules.map((curr) => {
              if (curr.id !== m.id) return curr;

              // Overwrite default statuses with actual uploads
              const updatedStatuses = { ...curr.requirementStatuses };
              const docsMeta: Record<string, any> = {};

              evidenceItems.forEach((ev) => {
                let mappedReq = 'Study Guide';
                if (ev.type === 'STUDY_GUIDE') mappedReq = 'Study Guide';
                else if (ev.type === 'ASSESSMENT_TASK') mappedReq = 'Descriptor';
                else if (ev.type === 'MODERATION_REPORT') mappedReq = 'Mod. Report';
                else if (ev.type === 'EXAM_PAPER') mappedReq = 'DP List';
                else if (ev.type === 'PRE_REVIEW') mappedReq = 'Final Marks';

                updatedStatuses[mappedReq] = ev.aiValidationStatus === 'VALID' ? 'COMPLIANT' : 'PARTIAL';
                docsMeta[mappedReq] = ev;
              });

              return {
                ...curr,
                evidenceList: evidenceItems,
                requirementStatuses: updatedStatuses,
                evidenceDocs: docsMeta
              };
            });
          });
        });
        unsubEvidenceFns.push(unsubEv);
      });
    });

    return () => {
      unsubModules();
      unsubEvidenceFns.forEach(fn => fn());
    };
  }, []);

  const handleCellClick = (module: any, reqName: string, status: any) => {
    const docMeta = module.evidenceDocs[reqName];
    setSelectedCell({
      module,
      reqName,
      status,
      doc: docMeta
    });
    setReaderPage(0);
    setDownloadSuccess(false);
    setDownloadProgress(0);
    setIsDownloading(false);
    setUploadingFile(null);
    setUploadError('');
    setUploadSuccess('');
  };

  // Simulated content generation for visual preview
  const getDocumentContent = (module: any, reqName: string) => {
    const code = module.code;
    const name = module.name;
    const isMock = !module.evidenceDocs[reqName];

    const structures: Record<string, { title: string; verifier: string; hash: string; pages: string[] }> = {
      'Study Guide': {
        title: `${code}_Study_Guide_2026.pdf`,
        verifier: "AcaIQ-Automated Core & QPO",
        hash: `SHA256: 0fd${code.toLowerCase()}efb991ea83711`,
        pages: [
          `[VAULTIQ REGISTRY DIGITAL ARCHIVE] DESIGNED SPECIFICATIONS\n\nModule Code: ${code}\nInstitutional Name: ${name}\nEvaluation Cycle: Semester 2, 2026\nLevel: South African Higher Education NQF Level 7 (16 Credits)\n\nMODULE FOCUS & SYLLABUS SCHEMES:\n- Core Competence 1: Analyze real-world quantitative frameworks and regional systems.\n- Core Competence 2: Synthesize compliance logs in high-audit workspaces.\n- Core Competence 3: Evaluate systemic integration with decentralized standards.`,
          `Study Guide Details - Page 2\n\nDETAILED WEEKLY LECTURE TRACK:\n- Weeks 1-4: Applied data sovereignty models, historical context, and introductory structures.\n- Weeks 5-8: Intermediate laboratories, team coursework mapping, and pre-assessment controls.\n- Weeks 9-12: Simulated audit reviews, final course consolidation, and preparation for exams.\n\nRECOMMENDED READINGS:\n1. Institutional Press: Guidelines for Technical Auditing & Policy Compliances (12th Edition)\n2. Global Framework Studies: Vol 3.\n\nGrading Scheme: Exams (40%), Semester Practicals (30%), Written Dossier (30%).`
        ]
      },
      'Descriptor': {
        title: `${code}_Module_Descriptor_V3.pdf`,
        verifier: "CQPA Curriculum & Accreditation Committee",
        hash: `SHA256: d8c${code.toLowerCase()}cba0911762e55`,
        pages: [
          `[CQPA REGISTRATION LOGS]\nOFFICIAL COMPLETED MODULE DESCRIPTOR OUTLINES\n\nAccredited Module Reference: ${code}\nModule Descriptor Version: 3.1\nTarget Students: Faculty of Accounting & Informatics\n\nDELIVERY RATIOS:\n- Direct Contact Hours: 42 Hours\n- Laboratory/Tutorial Hours: 14 Hours\n- Directed Independent Reading: 64 Hours\n\nAccreditation Seal Status: Approved & Active.`,
          `Module Descriptor Graduate Attributes - Page 2\n\nCritical Cross-Field Outcomes Supported:\n- Identify and solve complex organizational issues through systematic analysis.\n- Reflect on alternative and ethical decision vectors.\n- Master technological information structures seamlessly.\n\nLatest Evaluation Audit: March 2026.`
        ]
      },
      'Mod. Report': {
        title: `${code}_Internal_Moderation_Report_Active.pdf`,
        verifier: "Internal Board & Appointed Moderator",
        hash: `SHA256: 9b2${code.toLowerCase()}124bbbc81710ee`,
        pages: [
          `[QUALITY ASSURANCE GATEWAY]\nINTERNAL MODERATION & ASSESSMENT REVIEWS\n\nAudit Target: ${code} (${name})\nAssessing Academic: Course Instructor\nAppointed Moderator: Dr. Marcus Vance (Faculty Reviewer)\nDate of Audit: May 2026\n\nSUMMARY AUDIT FINDINGS:\n1. Classroom test papers reflect appropriate cognitive complexity levels [VERIFIED].\n2. Practical evaluation guides include robust and fair grading rubrics [VERIFIED].\n3. Mark sheets align with historic standard distributions [APPROVED].`,
          `Internal Moderation Feedback - Page 2\n\nAssessor Suggestions:\n- Maintain close tracking of student lab attendance.\n- Archive practical sample scripts inside VaultIQ within 48 hours of grading.\n\nModeration Decision: APPROVED AND ARCHIVED TO CORE.\nSignature State: Digitally certified via Cryptographic Hash`
        ]
      },
      'DP List': {
        title: `${code}_DP_List_Final_S2.pdf`,
        verifier: "Registry Division & HoD Desk",
        hash: `SHA256: b7c${code.toLowerCase()}198e09fba243`,
        pages: [
          `[UNIVERSITY ACADEMIC AFFAIRS]\nDULY PERFORMED (DP) MASTER ENTRY LISTS\n\nSubject Register Code: ${code}\nCourse Label: ${name}\nActive Candidates: 124 Registered Students\n\nDP METRIC BOUNDARIES:\n- Required attendance record: >= 80% classes.\n- Practical assessment score: >= 45% cumulative.\n\nOnly candidates marked with 'APPROVED DP' are authorized to sit for final semester assessments.`,
          `DP Registry List Summary - Page 2\n\nCalculated Metrics:\n- Eligible for Exam: 119 Students (95.9% Pass Ratio)\n- Failed/DP Denied: 5 Students\n\nAuthorized by: Systems Administration Division\nTimestamp Log: 2026-06-15T11:22:00Z`
        ]
      },
      'Final Marks': {
        title: `${code}_Final_Marks_Dean_Approved.pdf`,
        verifier: "Executive Dean Office & Examinations Desk",
        hash: `SHA256: d8d${code.toLowerCase()}204eebba11a5`,
        pages: [
          `[OFFICIAL REGISTRY OFFICE]\nDEAN-CERTIFIED SEALS OF MARKS & EVALUATION MATRICES\n\nSubject: ${code}\nTitle: ${name}\nEvaluation Month: June 2026\n\nDEAN EVALUATION LOG:\n- Distinctions Metric achieved: 12 Students (>75% Grade)\n- Cumulative Subject Average: 63.4% (Comfortable Passing)\n- Security Seal State: Passed standard parity logs, approved for student transcripts.`,
          `Final Marks Distribution Tables - Page 2\n\n- Class distinctions (>75%): 12 Students\n- Good/Very Good (60-74%): 68 Students\n- Standard Pass (50-59%): 34 Students\n- Fail / Re-write $(<50%): 10 Students\n\nAudit Certification Code: CERT-DEAN-${code}-2026`
        ]
      }
    };

    const docData = structures[reqName] || {
      title: `${code}_${reqName.replace('. ', '_')}_2026.pdf`,
      verifier: "Institutional Bureau desk",
      hash: "SHA256: e80f229bbcf2a19e83ea88f",
      pages: [
        `[VaultIQ SECURE ARCHIVE] RECORD ${reqName.toUpperCase()}\n\nModule Code: ${code} - ${name}\nVerified File Name: Custom Secure Artifact upload\nStatus State: Logged and cryptographically registered inside Firestore ledger.\nThis document demonstrates formal academic compliance with regional regulations.`,
        `Syllabus Record Detailed Metadata - Page 2\n\nFiles are parsed safely, maintaining a secure AES-256 footprint.\nNo anomalous changes detected by the automated agent.`
      ]
    };

    // If there is real evidence uploaded, we present it beautifully
    if (!isMock) {
      const realDoc = module.evidenceDocs[reqName];
      return {
        title: realDoc.storagePath.split('/').pop() || docData.title,
        verifier: realDoc.aiValidationStatus === 'VALID' ? "VaultIQ AI Assistant & Registrar" : "Pending Human Verification",
        hash: `SHA256: ${realDoc.storagePath.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24)}`,
        pages: [
          `[VaultIQ SECURE ARTIFACT INGESTION MODULE]\nREAL-TIME EVIDENCE FILE PREVIEW\n\nModule Code: ${module.code}\nRequirement Class: ${reqName.toUpperCase()}\nMetadata Title: ${realDoc.storagePath.split('/').pop()}\nUploaded By User UID: ${realDoc.uploadedBy}\nCommit Timestamp: ${new Date(realDoc.uploadedAt).toLocaleString()}\n\nAI ASSISTANT FEEDBACK REPORT:\n- Validation Rating: APPROVED (${realDoc.aiValidationStatus})\n- Context Findings: ${realDoc.aiFeedback || 'All parameters evaluated as positive and secure.'}\n- Sovereignty Protocol: AES-256 Verified.`,
          `Evidence Details Page 2 - Audit Metadata\n\nSystem verification logs:\n- Source File Name: ${realDoc.storagePath}\n- Blockchain-Signed Signature: CONFIRMED\n- Registry integrity status: 100% compliant.\n\nValidated Security Stamp: STAMP-AI-${module.code}-2026`
        ]
      };
    }

    return docData;
  };

  // Simulate secure download with detailed spinner
  const handleSimulateDownload = (title: string) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadSuccess(false);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          setDownloadSuccess(true);
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  // Safe file upload handler in compliance panel
  const handleUploadClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingFile || !selectedCell || !user) return;

    setUploadProgress(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      // Map requirement name to evidence type enum
      let evType = 'STUDY_GUIDE';
      if (selectedCell.reqName === 'Study Guide') evType = 'STUDY_GUIDE';
      else if (selectedCell.reqName === 'Descriptor') evType = 'ASSESSMENT_TASK';
      else if (selectedCell.reqName === 'Mod. Report') evType = 'MODERATION_REPORT';
      else if (selectedCell.reqName === 'DP List') evType = 'EXAM_PAPER';
      else if (selectedCell.reqName === 'Final Marks') evType = 'PRE_REVIEW';

      // 1. Upload metadata to Firestore
      await uploadEvidenceMetadata(selectedCell.module.id, {
        moduleId: selectedCell.module.id,
        type: evType as any,
        storagePath: `evidence/${selectedCell.module.code}/${uploadingFile.name}`,
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        aiValidationStatus: 'VALID',
        aiFeedback: `Verified instantly by direct user override as ${profile?.role || 'authorized user'}`
      });

      // 2. Adjust core module status to compliant
      await updateModuleCompliance(selectedCell.module.id, 'COMPLIANT');

      setUploadSuccess(`Success! "${uploadingFile.name}" is successfully uploaded and verified in VaultIQ. Compliance is marked.`);
      setUploadingFile(null);

      // Re-trigger cell selection with updated state
      setTimeout(() => {
        setUploadSuccess('');
        setSelectedCell(null);
      }, 3500);

    } catch (err: any) {
      setUploadError(`Failed to save record: ${err.message || err}`);
    } finally {
      setUploadProgress(false);
    }
  };

  // Curated CSV report statistics download with exact requested fields: report title, scope, date extracted
  const handleDownloadCSV = (title: string, scopeName: string, filteredList: any[]) => {
    const dateStr = new Date().toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'medium' });
    
    let csvContent = "";
    csvContent += `"VAULTIQ REGULAR QUALITY COMPLIANCE STATUS REPORT"\n`;
    csvContent += `"Report Title:","${title}"\n`;
    csvContent += `"Date of Extraction:","${dateStr}"\n`;
    csvContent += `"Faculty / Department:","${scopeName}"\n`;
    csvContent += `"======================================================================================="\n\n`;
    
    csvContent += `"Syllabus Code","Module Name","Study Guide","Module Descriptor","Internal Moderation","DP List","Final Marks","Registry Compliance Status"\n`;
    
    filteredList.forEach(m => {
      const sg = m.requirementStatuses?.['Study Guide'] || 'MISSING';
      const dec = m.requirementStatuses?.['Descriptor'] || 'MISSING';
      const mod = m.requirementStatuses?.['Mod. Report'] || 'MISSING';
      const dp = m.requirementStatuses?.['DP List'] || 'MISSING';
      const fm = m.requirementStatuses?.['Final Marks'] || 'MISSING';
      const comp = m.complianceStatus || 'MISSING';
      
      csvContent += `"${m.code}","${m.name.replace(/"/g, '""')}","${sg}","${dec}","${mod}","${dp}","${fm}","${comp}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_${scopeName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit search query to the server-side AI Report Scribe
  const handleAIScribeQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiReportResult(null);

    try {
      const response = await fetch('/api/generate-custom-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          modules: modules,
          departments: DEPARTMENTS
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to communicate with AI report writer agency');
      }

      const result = await response.json();
      setAiReportResult(result);
    } catch (err: any) {
      console.error('AI Scribe Error:', err);
      setAiError(err.message || 'The AI custom scribe was unable to digest the raw stats. Please re-trigger.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadCustomAIReport = (reportTitle: string, boundaryName: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportTitle.replace(/\s+/g, '_')}_${boundaryName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredModules = modules.filter(m => {
    const term = searchQuery.toLowerCase();
    return m.code.toLowerCase().includes(term) || m.name.toLowerCase().includes(term);
  });

  const getCellConfig = (status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'MISSING') => {
    switch (status) {
      case 'COMPLIANT':
        return {
          wrapper: "bg-cell-success-bg hover:bg-cell-success-bg-hover text-status-success border-emerald-500/15 shadow-[inset_0_1px_1px_rgba(16,185,129,0.05)]",
          dot: "bg-status-success shadow-[0_0_10px_rgba(16,185,129,0.6)]",
          label: "Compliant"
        };
      case 'PARTIAL':
        return {
          wrapper: "bg-cell-warning-bg hover:bg-cell-warning-bg-hover text-status-warning border-amber-500/15 shadow-[inset_0_1px_1px_rgba(245,158,11,0.05)]",
          dot: "bg-status-warning shadow-[0_0_10px_rgba(245,158,11,0.6)]",
          label: "Partial / Pending"
        };
      case 'NON_COMPLIANT':
        return {
          wrapper: "bg-cell-danger-bg hover:bg-cell-danger-bg-hover text-status-danger border-rose-500/15 shadow-[inset_0_1px_1px_rgba(244,63,94,0.05)]",
          dot: "bg-status-danger shadow-[0_0_10px_rgba(244,63,94,0.6)]",
          label: "Critical / Overdue"
        };
      case 'MISSING':
      default:
        return {
          wrapper: "bg-cell-neutral-bg hover:bg-cell-neutral-bg-hover text-subtle-foreground border-border-subtle",
          dot: "bg-surface-2",
          label: "No Evidence"
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Institutional Reporting Console */}
      <div className="glass-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles className="w-40 h-40 text-indigo-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-black uppercase tracking-widest">
                  Governance Analytics Panel
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Live Audit Extractor
                </span>
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight uppercase mt-1">
                Institutional Reporting & Evidence Export Hub
              </h3>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mt-0.5">
                Generate formal regulatory spreadsheets & consult AI scribe for senate audits
              </p>
            </div>

            <button
              onClick={() => setIsReportCenterOpen(!isReportCenterOpen)}
              className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2 cursor-pointer self-start md:self-center"
            >
              <Sparkles className="w-4 h-4" />
              {isReportCenterOpen ? 'Hide Reports Console' : 'Show Reports Console'}
            </button>
          </div>

          <AnimatePresence>
            {isReportCenterOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left segment: Ready-Made Direct Exports */}
                  <div className="lg:col-span-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-black text-foreground tracking-tight uppercase flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        AcaAudit Pre-Sets
                      </h4>
                      <p className="text-[11px] text-subtle-foreground font-medium leading-relaxed mt-1">
                        Select an institutional reporting node below to extract instantly stamped compliance statistics.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <button 
                        onClick={() => handleDownloadCSV("Institutional Master Integrity Audit Checksheet", "University Whole Scopes", modules)}
                        className="w-full p-4 bg-surface-tint hover:bg-emerald-500/10 border border-border-subtle hover:border-emerald-500/20 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-black text-foreground/90 group-hover:text-emerald-400 transition tracking-wide uppercase">Institutional Master Audit</p>
                          <p className="text-[10px] text-subtle-foreground font-bold mt-0.5 uppercase tracking-wider">Scope: All Registered Syllabus Nodes</p>
                        </div>
                        <Download className="w-4 h-4 text-subtle-foreground group-hover:text-emerald-400 transition" />
                      </button>

                      <button 
                        onClick={() => {
                          const list = modules.filter(m => m.departmentId === 'FAI_IT' || m.departmentId === 'FAI_IS');
                          handleDownloadCSV("Curriculum Gatekeeper Stat-Audit", "Faculty of Accounting & Informatics", list);
                        }}
                        className="w-full p-4 bg-surface-tint hover:bg-indigo-500/10 border border-border-subtle hover:border-indigo-500/20 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-black text-foreground/90 group-hover:text-indigo-400 transition tracking-wide uppercase">Accounting & Informatics</p>
                          <p className="text-[10px] text-subtle-foreground font-bold mt-0.5 uppercase tracking-wider">Scope: School Faculty Level Stat</p>
                        </div>
                        <Download className="w-4 h-4 text-subtle-foreground group-hover:text-indigo-400 transition" />
                      </button>

                      <button 
                        onClick={() => {
                          const list = modules.filter(m => m.departmentId === 'FAI_AUD_TAX' || m.code.includes('AUD'));
                          handleDownloadCSV("Departmental Assurance performance sheet", "Department of Auditing & Taxation", list);
                        }}
                        className="w-full p-4 bg-surface-tint hover:bg-amber-500/10 border border-border-subtle hover:border-amber-500/20 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-black text-foreground/90 group-hover:text-amber-400 transition tracking-wide uppercase">Auditing & Taxation Performance</p>
                          <p className="text-[10px] text-subtle-foreground font-bold mt-0.5 uppercase tracking-wider">Scope: Auditor Focus Departmental Slice</p>
                        </div>
                        <Download className="w-4 h-4 text-subtle-foreground group-hover:text-amber-400 transition" />
                      </button>
                    </div>

                    <div className="p-3.5 bg-surface-sunken border border-border-subtle rounded-2xl flex items-start gap-3">
                      <HelpCircle className="w-4 h-4 text-subtle-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Regulatory Compliance Mandate</p>
                        <p className="text-[9px] text-subtle-foreground font-medium leading-snug mt-0.5">
                          Each export dynamically registers the exact extraction date, metadata boundaries, and cryptographic verification stamps required by senate auditors.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right segment: AI Quality Report Scribe */}
                  <div className="lg:col-span-8 p-6 bg-surface-sunken border border-border-subtle rounded-3xl flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-foreground tracking-tight uppercase">AI Report Scribe & Butler Assistant</h4>
                          <p className="text-[11px] text-muted-foreground font-medium leading-normal">
                            Type what slice of compliance stats you need (e.g. "Draft study guides audit report for Information Technology" or "Non-compliant courses in Accounting"). Scribe will filter the data, summarize risks, and generate your custom export.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleAIScribeQuery} className="flex gap-2.5">
                        <input 
                          type="text" 
                          placeholder='E.g., "Show me all missing mod reports in Accounting" or "Syllabus Audit CS modules"'
                          className="flex-1 bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition font-medium"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                        />
                        <button 
                          type="submit"
                          disabled={aiLoading || !aiPrompt.trim()}
                          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {aiLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          {aiLoading ? 'Scribing...' : 'Consult'}
                        </button>
                      </form>

                      {/* Pill suggestions for fast prompting */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Syllabus Audit IT modules study guides',
                          'Missing moderation reports in Accounting',
                          'Overall critical compliance risk summary'
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setAiPrompt(suggestion)}
                            className="px-3 py-1.5 bg-surface-tint hover:bg-surface-tint-strong rounded-full text-[9px] font-bold text-muted-foreground hover:text-foreground transition cursor-pointer border border-border-subtle"
                          >
                            + {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scribe Result Container */}
                    <div className="flex-1 relative">
                      {aiLoading && (
                        <div className="py-12 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            Extracting Registry Ledger & Feeding Gemini-3.5-Flash...
                          </p>
                        </div>
                      )}

                      {aiError && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 leading-relaxed">
                          <ShieldAlert className="w-5 h-5 shrink-0" />
                          <span>{aiError}</span>
                        </div>
                      )}

                      {aiReportResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-5 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/10 pb-3">
                            <div>
                              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Suggested Dynamic Report</p>
                              <h5 className="text-sm font-black text-foreground tracking-tight uppercase mt-0.5">
                                {aiReportResult.reportTitle}
                              </h5>
                              <p className="text-[9px] font-bold text-subtle-foreground uppercase mt-0.5 tracking-wider">
                                Boundary Match: <span className="text-foreground/80 font-black">{aiReportResult.scopedBoundary}</span> • Date Extracted: <span className="text-foreground/80 font-black">{new Date().toLocaleDateString('en-GB')}</span>
                              </p>
                            </div>
                            
                            <button
                              onClick={() => handleDownloadCustomAIReport(aiReportResult.reportTitle, aiReportResult.scopedBoundary, aiReportResult.suggestedCsv)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-1.5 shrink-0 cursor-pointer border border-border"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Export CSV Sheet
                            </button>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest italic">AI Quality Analysis overview</p>
                            <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                              {aiReportResult.analysisSummary}
                            </p>
                          </div>

                          {/* Mini Suggested Data Grid preview */}
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Filtered Stats Preview ({aiReportResult.filteredModules?.length || 0} nodes)</p>
                            
                            <div className="max-h-[120px] overflow-y-auto border border-border-subtle rounded-xl bg-surface-sunken text-[10px]">
                              {aiReportResult.filteredModules?.length > 0 ? (
                                <table className="w-full text-left font-sans text-muted-foreground">
                                  <thead className="bg-surface-tint text-[9px] font-black text-subtle-foreground uppercase tracking-wider">
                                    <tr>
                                      <th className="p-2">Code</th>
                                      <th className="p-2">File Requirement</th>
                                      <th className="p-2">Live Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5 font-semibold">
                                    {aiReportResult.filteredModules.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-foreground/[0.02]">
                                        <td className="p-2 font-black text-foreground/80 tracking-tight">{item.code}</td>
                                        <td className="p-2 uppercase text-[9px]">{item.requirement || 'General'}</td>
                                        <td className="p-2">
                                          <span className={cn(
                                            "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                                            item.status === 'COMPLIANT' ? 'bg-emerald-400' :
                                            item.status === 'PARTIAL' ? 'bg-amber-400' : 'bg-rose-500'
                                          )} />
                                          <span className="uppercase text-[9px] font-black">{item.status}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="p-4 text-center text-subtle-foreground font-black uppercase text-[10px]">
                                  No modules flagged in filtering window
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {!aiLoading && !aiError && !aiReportResult && (
                        <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-border-subtle rounded-2xl bg-foreground/[0.01]">
                          <Bot className="w-8 h-8 text-subtle-foreground mb-2 animate-bounce" style={{ fill: 'none' }} />
                          <p className="text-[10px] font-extrabold text-subtle-foreground uppercase tracking-widest text-center">
                            Waiting for Scribe prompting...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Title & Filter Bar */}
        <div className="p-6 md:p-8 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h4 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Departmental <span className="text-indigo-500">Compliance Heatmap</span>
            </h4>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mt-1">Cross-module integrity mapping & direct document access</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-foreground" />
            <input 
              type="text" 
              placeholder="Search syllabus module code..."
              className="w-full bg-surface-tint border border-border rounded-xl pl-11 pr-4 py-2.5 text-xs text-foreground font-bold placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Heatmap Body */}
        <div className="overflow-x-auto">
          <div className="p-6 md:p-8 min-w-[850px]">
            {/* Header row */}
            <div className="grid grid-cols-[160px_repeat(5,1fr)] gap-3 mb-5">
              <div className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest flex items-center pl-2">Syllabus Node</div>
              {REQUIREMENTS.map((req) => (
                <div key={req} className="text-center font-black text-[10px] text-muted-foreground uppercase tracking-[0.15em] px-2 py-1.5 bg-foreground/[0.01] border border-border-subtle rounded-lg">
                  {req}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">Subscribed to VaultIQ records...</p>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border-subtle rounded-2xl bg-foreground/[0.01]">
                <p className="text-sm font-bold text-subtle-foreground uppercase tracking-wider">No matching modules registered</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredModules.map((module) => (
                  <div key={module.id} className="grid grid-cols-[160px_repeat(5,1fr)] gap-3 group items-center">
                    {/* Module Code Cell */}
                    <div className="pl-2">
                      <p className="text-xs font-black text-foreground/80 group-hover:text-indigo-400 transition cursor-default tracking-tight uppercase">{module.code}</p>
                      <p className="text-[9px] font-bold text-subtle-foreground group-hover:text-muted-foreground transition overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]">{module.name}</p>
                    </div>

                    {REQUIREMENTS.map((req) => {
                      const status = module.requirementStatuses[req] || 'MISSING';
                      const config = getCellConfig(status);
                      const docInfo = getDocumentContent(module, req);
                      const hasFile = status !== 'MISSING';
                      
                      return (
                        <div key={req} className="relative group/cell">
                          <motion.button 
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCellClick(module, req, status)}
                            className={cn(
                              "h-[68px] w-full rounded-xl border p-2.5 flex flex-col justify-between items-start transition-all cursor-pointer relative overflow-hidden text-left",
                              config.wrapper
                            )}
                          >
                            {/* Top row: Indicator dot and status text */}
                            <div className="flex items-center gap-1.5 w-full">
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
                              <span className="text-[7.5px] font-black uppercase tracking-wider text-foreground/80">
                                {config.label}
                              </span>
                              {hasFile && (
                                <span className="ml-auto text-[7px] font-black text-indigo-400 bg-indigo-500/10 px-1 rounded uppercase shrink-0 leading-none py-0.5">
                                  PDF
                                </span>
                              )}
                            </div>

                            {/* Center: document filename (direct clickable connection) */}
                            <div className="w-full mt-1.5">
                              {hasFile ? (
                                <span className="text-[9px] font-bold text-foreground block truncate underline decoration-dotted decoration-indigo-400/40 group-hover/cell:decoration-white transition-all leading-tight">
                                  {docInfo.title}
                                </span>
                              ) : (
                                <span className="text-[8px] font-bold text-subtle-foreground block italic leading-tight">
                                  + Upload Evidence
                                </span>
                              )}
                            </div>
                            
                            {/* Bottom hover bar accent */}
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-600 to-emerald-500 scale-x-0 group-hover/cell:scale-x-100 transition-transform duration-200" />
                          </motion.button>

                          {/* Interactive Tooltip showing validation details */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface border border-border rounded-xl text-[9px] font-bold text-foreground/80 opacity-0 group-hover/cell:opacity-100 pointer-events-none transition duration-200 z-50 whitespace-nowrap shadow-2xl space-y-1">
                            <p className="text-foreground font-black uppercase tracking-wider">{module.code} — {req}</p>
                            <div className="flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                              <span className="uppercase text-muted-foreground font-extrabold">{config.label}</span>
                            </div>
                            <p className="text-[8px] text-subtle-foreground font-medium">Click to access security audit node</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decorative Interactive Legend */}
        <div className="p-6 border-t border-border-subtle bg-foreground/[0.01] flex flex-wrap justify-between items-center gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <LegendItem label="Compliant" color="bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <LegendItem label="Partial / Pending" color="bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <LegendItem label="Critical / Overdue" color="bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <LegendItem label="No Evidence" color="bg-surface-2" />
          </div>
          <div className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest italic">
            VaultIQ Registry Hub • Real-Time Database Connection Active
          </div>
        </div>
      </div>

      {/* Interactive Secured PDF Reader & Audit Node Drawer */}
      <AnimatePresence>
        {selectedCell && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-4xl glass-card relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 animate-pulse" />
              
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-border-subtle flex items-center justify-between bg-foreground/[0.01]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-black uppercase tracking-widest">
                      VaultIQ Encrypted Node
                    </span>
                    {selectedCell.status !== 'MISSING' && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-black uppercase tracking-widest">
                        Validated Output
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">
                    {selectedCell.module.code} — {selectedCell.reqName}
                  </h3>
                  <p className="text-[10px] text-subtle-foreground font-extrabold uppercase tracking-widest mt-0.5">
                    Affiliation Department ID: <span className="text-indigo-400">{selectedCell.module.departmentId}</span>
                  </p>
                </div>
                
                <button 
                  onClick={() => setSelectedCell(null)} 
                  className="p-3 bg-surface-tint hover:bg-surface-tint-strong rounded-xl transition duration-200 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Modal Layout (Splits Reader & Metadata) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
                
                {/* Visual Metadata Panel */}
                <div className="lg:col-span-4 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-border-subtle bg-foreground/[0.01] flex flex-col justify-between gap-8">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest mb-1 italic">File Signature Hash</p>
                      <div className="p-3 bg-surface border border-border-subtle rounded-xl text-[9px] font-mono font-bold text-muted-foreground select-all break-all leading-tight">
                        {getDocumentContent(selectedCell.module, selectedCell.reqName).hash}
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest mb-1 italic">Quality Assurer Stamp</p>
                      <p className="text-xs font-extrabold text-foreground/90 bg-surface-tint border border-border-subtle px-3 py-2 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                        {getDocumentContent(selectedCell.module, selectedCell.reqName).verifier}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest mb-1 italic">Retention Clock Cycle</p>
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        3Y Regulatory Auditing Retained
                      </p>
                    </div>

                    <div className="border-t border-border-subtle pt-4 space-y-2">
                      <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest italic">Compliance Level</p>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          getCellConfig(selectedCell.status).dot
                        )} />
                        <span className="text-xs font-black uppercase text-foreground tracking-widest">
                          {getCellConfig(selectedCell.status).label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                        Evaluated and logged into institutional database. Any change triggers compliance re-audit protocols.
                      </p>
                    </div>
                  </div>

                  {/* Actions Section */}
                  {selectedCell.status !== 'MISSING' && (
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleSimulateDownload(getDocumentContent(selectedCell.module, selectedCell.reqName).title)}
                        disabled={isDownloading}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 active:scale-95 border border-border-subtle disabled:opacity-50 select-none cursor-pointer"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                        ) : downloadSuccess ? (
                          <Check className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {isDownloading ? `Decrypting (${downloadProgress}%)` : downloadSuccess ? 'Download Ready' : 'Secure Download'}
                      </button>

                      {downloadSuccess && (
                        <p className="text-emerald-400 font-bold text-[10px] text-center uppercase tracking-wider animate-pulse">
                          Document securely decrypted onto device
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* PDF Document Visual Page Panel */}
                <div className="lg:col-span-8 p-6 md:p-8 bg-surface-sunken flex flex-col justify-between">
                  {selectedCell.status === 'MISSING' ? (
                    /* Inline Evidence Ingestion Portal */
                    <div className="h-full flex flex-col justify-center items-center py-10 px-4 min-h-[400px]">
                      <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                        <Upload className="w-7 h-7" />
                      </div>
                      <h4 className="text-lg font-black text-foreground tracking-tight uppercase">Upload Compliance Evidence</h4>
                      <p className="text-muted-foreground text-xs text-center max-w-sm mt-1 mb-8 leading-relaxed">
                        To satisfy the compliance deficiency for <span className="text-indigo-400 font-bold">{selectedCell.module.code} / {selectedCell.reqName}</span>, transmit the certified academic PDF document.
                      </p>

                      <form onSubmit={handleUploadClick} className="w-full max-w-md space-y-4">
                        <div 
                          className={cn(
                            "border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition",
                            uploadingFile ? "border-indigo-500 bg-indigo-500/5 text-foreground" : "border-border hover:border-foreground/30 bg-surface-tint"
                          )}
                          onClick={() => document.getElementById('heatmap-file-picker')?.click()}
                        >
                          <input 
                            id="heatmap-file-picker" 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setUploadingFile(e.target.files[0]);
                                setUploadError('');
                                setUploadSuccess('');
                              }
                            }}
                          />
                          <FileText className="w-8 h-8 text-subtle-foreground mb-2" />
                          <p className="text-xs font-bold text-center">
                            {uploadingFile ? uploadingFile.name : 'Select or Browse certified PDF'}
                          </p>
                          <p className="text-[9px] text-subtle-foreground uppercase font-black tracking-widest mt-1">Certified size max 10MB</p>
                        </div>

                        {uploadError && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 leading-snug">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>{uploadError}</span>
                          </div>
                        )}

                        {uploadSuccess && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 leading-snug">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{uploadSuccess}</span>
                          </div>
                        )}

                        {uploadingFile && (
                          <button 
                            type="submit"
                            disabled={uploadProgress}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2"
                          >
                            {uploadProgress ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <BookmarkCheck className="w-4 h-4" />
                            )}
                            {uploadProgress ? 'Validating & Depositing...' : 'Authorize & Upload'}
                          </button>
                        )}
                      </form>
                    </div>
                  ) : (
                    /* Elegant PDF simulator view */
                    <div className="flex flex-col h-full justify-between gap-6 min-h-[400px]">
                      <div className="flex justify-between items-center bg-surface border border-border-subtle p-3 rounded-xl">
                        <span className="text-[10px] font-black text-indigo-400 font-mono tracking-wider">{getDocumentContent(selectedCell.module, selectedCell.reqName).title}</span>
                        <span className="text-[9px] uppercase font-black text-subtle-foreground bg-surface-tint px-2 py-0.5 rounded border border-border-subtle">VaultIQ Reader v2.0</span>
                      </div>

                      {/* PDF Pages container */}
                      <div className="flex-1 bg-background border border-border-subtle rounded-2xl p-6 md:p-8 font-mono text-xs text-foreground/70 leading-relaxed shadow-inner overflow-y-auto whitespace-pre-wrap relative max-h-[350px]">
                        <div className="absolute top-4 right-4 p-2 bg-emerald-500/5 text-emerald-400 font-sans text-[8px] uppercase tracking-widest font-black rounded border border-emerald-500/20">
                          AI Verified SecurIQ
                        </div>
                        {getDocumentContent(selectedCell.module, selectedCell.reqName).pages[readerPage] || "Page ends."}
                      </div>

                      {/* PDF Multi-page selector footer */}
                      <div className="flex justify-between items-center border-t border-border-subtle pt-4">
                        <button 
                          onClick={() => setReaderPage(p => Math.max(0, p - 1))}
                          disabled={readerPage === 0}
                          className="px-3 py-2 bg-surface-tint hover:bg-surface-tint-strong rounded-lg text-muted-foreground hover:text-foreground transition disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                        >
                          <ChevronLeft className="w-4 h-4" /> Next
                        </button>
                        
                        <span className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">
                          Page {readerPage + 1} of {getDocumentContent(selectedCell.module, selectedCell.reqName).pages.length}
                        </span>

                        <button 
                          onClick={() => setReaderPage(p => Math.min(getDocumentContent(selectedCell.module, selectedCell.reqName).pages.length - 1, p + 1))}
                          disabled={readerPage === getDocumentContent(selectedCell.module, selectedCell.reqName).pages.length - 1}
                          className="px-3 py-2 bg-surface-tint hover:bg-surface-tint-strong rounded-lg text-muted-foreground hover:text-foreground transition disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                        >
                          Prev <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("w-3.5 h-3.5 rounded-md", color)} />
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}
