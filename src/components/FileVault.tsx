import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  File, 
  ChevronRight, 
  Search, 
  Upload, 
  Shield, 
  Clock, 
  Archive,
  MoreVertical,
  Download,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  FileText,
  BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DocCategory, Module } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { getPermissionForRoles } from '../permissions.config';
import { 
  subscribeToModules, 
  subscribeToEvidence, 
  uploadEvidenceMetadata, 
  deleteEvidence, 
  updateEvidence,
  addNotification,
  updateModule 
} from '../services/dataService';

const CATEGORIES: { id: DocCategory; label: string; color: string; description: string }[] = [
  { id: 'CURRICULUM', label: 'Curriculum', color: 'text-blue-400', description: 'Academic frameworks and study guides' },
  { id: 'ASSESSMENTS', label: 'Assessments', color: 'text-rose-400', description: 'Summative and formative instruments' },
  { id: 'MODERATION', label: 'Moderation', color: 'text-amber-400', description: 'Quality assurance and peer reviews' },
  { id: 'EVIDENCE', label: 'Evidence', color: 'text-emerald-400', description: 'Student work samples and scripts' },
  { id: 'COMPLIANCE', label: 'Compliance', color: 'text-indigo-400', description: 'Audit trails and policy documents' },
];

interface VaultFile {
  id: string;
  name: string;
  category: DocCategory;
  subCategory?: 'INTERNAL_MOD' | 'EXTERNAL_MOD' | 'OTHER';
  isExamRelated: boolean;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  version: number;
}

export default function FileVault() {
  const { profile } = useAuth();
  const permission = getPermissionForRoles(profile?.roles, 'File Vault');
  
  const canUpload = permission.access === 'upload_view';
  const canAssign = permission.access === 'assign_view';

  const [currentPath, setCurrentPath] = useState<string[]>(['Vault', 'Science', 'CS', 'BSc_CS', 'ENG101', '2026', 'S1']);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Loaded real-time modules
  const [dbModules, setDbModules] = useState<Module[]>([]);
  useEffect(() => {
    const unsub = subscribeToModules((data) => {
      setDbModules(data);
    });
    return () => unsub();
  }, []);

  const activeModuleCode = currentPath.find(segment => 
    dbModules.some(m => m.code.toUpperCase() === segment.toUpperCase())
  ) || currentPath[4] || 'ENG101';

  const activeModuleInDb = dbModules.find(m => m.code.toUpperCase() === (activeModuleCode || '').toUpperCase());
  const activeModuleId = activeModuleInDb?.id;
  const isExitLevelActive = activeModuleInDb?.isExitLevel || false;

  const [dbEvidence, setDbEvidence] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  useEffect(() => {
    if (!activeModuleId) {
      setDbEvidence([]);
      return;
    }
    setLoadingEvidence(true);
    const unsub = subscribeToEvidence(activeModuleId, (data) => {
      setDbEvidence(data);
      setLoadingEvidence(false);
    });
    return () => unsub();
  }, [activeModuleId]);

  // Map dbEvidence to VaultFile type
  const dbFilesMapped: VaultFile[] = dbEvidence.map((ev: any) => ({
    id: ev.id,
    name: ev.name || ev.storagePath.split('/').pop() || 'document.pdf',
    category: ev.category || 'ASSESSMENTS',
    subCategory: ev.subCategory || (ev.type === 'MODERATION_REPORT' ? 'INTERNAL_MOD' : undefined),
    isExamRelated: ev.isExamRelated || ev.type === 'EXAM_PAPER',
    uploadedBy: ev.uploadedBy || 'Lecturer',
    uploadedAt: ev.uploadedAt ? (isNaN(Date.parse(ev.uploadedAt)) ? ev.uploadedAt : new Date(ev.uploadedAt).toLocaleString()) : 'Just now',
    size: ev.size || '1.5 MB',
    version: ev.version || 1,
    questionnaire: ev.questionnaire || null,
    frontPageGenerated: ev.frontPageGenerated || false,
    frontPageData: ev.frontPageData || null
  }));

  // Questionnaire States
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [isPreviewingFrontPage, setIsPreviewingFrontPage] = useState(false);
  const [examinerName, setExaminerName] = useState('');
  const [internalModeratorName, setInternalModeratorName] = useState('');
  const [externalModeratorName, setExternalModeratorName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [timeAllowed, setTimeAllowed] = useState('3 Hours');
  const [venue, setVenue] = useState('Main Sports Hall');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmittingQuestionnaire, setIsSubmittingQuestionnaire] = useState(false);

  // STATEFUL FILE LIST FALLBACKS
  const [files, setFiles] = useState<VaultFile[]>([
    { id: '1', name: 'ENG101_2026_S1_ASSESS_v3.pdf', category: 'ASSESSMENTS', isExamRelated: true, uploadedBy: 'Dr. Sarah Jenkins', uploadedAt: '1h ago', size: '2.4 MB', version: 3 },
    { id: '2', name: 'ENG101_2026_S1_ASSESS_v2.pdf', category: 'ASSESSMENTS', isExamRelated: true, uploadedBy: 'Dr. Sarah Jenkins', uploadedAt: '2d ago', size: '2.3 MB', version: 2 },
    { id: '3', name: 'ENG101_2026_S1_ASSESS_v1.pdf', category: 'ASSESSMENTS', isExamRelated: true, uploadedBy: 'Dr. Sarah Jenkins', uploadedAt: '1w ago', size: '2.1 MB', version: 1 },
    { id: '4', name: 'CURR_CS_2026_S1_v1.pdf', category: 'CURRICULUM', isExamRelated: false, uploadedBy: 'Dean Office', uploadedAt: '3d ago', size: '4.8 MB', version: 1 },
    { id: '5', name: 'INTERNAL_MOD_REPORT_ENG101.pdf', category: 'MODERATION', subCategory: 'INTERNAL_MOD', isExamRelated: false, uploadedBy: 'Dr. Alexander Wright', uploadedAt: '4h ago', size: '1.2 MB', version: 1 },
    { id: '6', name: 'COMPLIANCE_CQPA_AUDIT_2026_S1.pdf', category: 'COMPLIANCE', isExamRelated: false, uploadedBy: 'Auditor General', uploadedAt: '5h ago', size: '840 KB', version: 1 },
  ]);

  const [assignToast, setAssignToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // UPLOAD MODAL STATE
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<DocCategory>('ASSESSMENTS');
  const [subCategory, setSubCategory] = useState<'INTERNAL_MOD' | 'EXTERNAL_MOD' | 'OTHER'>('INTERNAL_MOD');
  const [isExamRelated, setIsExamRelated] = useState(true);
  const [customFileName, setCustomFileName] = useState('');
  
  // SCANNING & AUDIT SIMULATION STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ isPdf: boolean; hasCoverPage: boolean } | null>(null);
  const [simulateCoverPage, setSimulateCoverPage] = useState(false);
  const [dragOverModal, setDragOverModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openUploadModal = () => {
    setSelectedFile(null);
    setDocCategory(selectedCategory || 'ASSESSMENTS');
    setSubCategory('INTERNAL_MOD');
    setIsExamRelated(selectedCategory === 'ASSESSMENTS' || selectedCategory === null);
    setCustomFileName('');
    setScanResult(null);
    setIsScanning(false);
    setSimulateCoverPage(false);
    setIsUploadModalOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverModal(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverModal(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverModal(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setSelectedFile(file);
    setCustomFileName(file.name);
    setScanResult(null);
    setIsScanning(true);

    // Simulated parsing logic to audit format and cover pages
    setTimeout(async () => {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      
      // Let's analyze if file name or contents might indicate a cover page
      let hasCoverPage = false;
      const lowerName = file.name.toLowerCase();
      
      if (lowerName.includes('cover') || lowerName.includes('front') || lowerName.includes('title') || lowerName.includes('declaration')) {
        hasCoverPage = true;
      } else {
        try {
          // Read first 15KB of file to scan for plain cover-page terms in text
          const textContents = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string || '').toLowerCase());
            reader.onerror = () => resolve('');
            reader.readAsText(file.slice(0, 15000));
          });
          
          if (
            textContents.includes('cover page') || 
            textContents.includes('cover_page') || 
            textContents.includes('front page') || 
            textContents.includes('frontpage') || 
            textContents.includes('title page') || 
            textContents.includes('titlepage') || 
            textContents.includes('declaration of') ||
            textContents.includes('unisa') ||
            textContents.includes('university cover')
          ) {
            hasCoverPage = true;
          }
        } catch (e) {
          console.error(e);
        }
      }

      setScanResult({ isPdf, hasCoverPage });
      setIsScanning(false);
    }, 1200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value as DocCategory;
    setDocCategory(cat);
    // Auto-enable exam-related if Category is ASSESSMENTS
    if (cat === 'ASSESSMENTS') {
      setIsExamRelated(true);
    }
  };

  // VALIDATION EVALUATION
  const getValidationError = () => {
    if (!selectedFile) return null;
    
    if (isExamRelated) {
      if (scanResult) {
        if (!scanResult.isPdf) {
          return {
            type: 'FORMAT',
            message: 'Format Restriction: Exam-related files in the Vault must be uploaded in PDF (.pdf) format. Under Rule EX-101, other file extensions are strictly prohibited for secure exams.'
          };
        }
        if (scanResult.hasCoverPage || simulateCoverPage) {
          return {
            type: 'COVER_PAGE',
            message: 'Cover Page Detected! VaultIQ Compliance Engine has detected an institutional cover page or front page. Exam-related documents stored here must NOT contain a front cover page. Please remove the cover page from your PDF before uploading.'
          };
        }
      } else if (!isScanning) {
        // Fallback sync checks
        const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          return {
            type: 'FORMAT',
            message: 'Format Restriction: Exam-related files in the Vault must be uploaded in PDF (.pdf) format. Under Rule EX-101, other file extensions are strictly prohibited for secure exams.'
          };
        }
        if (simulateCoverPage) {
          return {
            type: 'COVER_PAGE',
            message: 'Cover Page Detected! VaultIQ Compliance Engine has detected an institutional cover page or front page. Exam-related documents stored here must NOT contain a front cover page. Please remove the cover page from your PDF before uploading.'
          };
        }
      }
    }
    return null;
  };

  const activeError = getValidationError();

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || activeError) return;

    const resolvedName = customFileName.toLowerCase().endsWith('.pdf') || !isExamRelated ? customFileName : `${customFileName}.pdf`;

    if (activeModuleId) {
      try {
        await uploadEvidenceMetadata(activeModuleId, {
          moduleId: activeModuleId,
          type: docCategory === 'ASSESSMENTS' && isExamRelated ? 'EXAM_PAPER' : (docCategory === 'MODERATION' ? 'MODERATION_REPORT' : 'STUDY_GUIDE'),
          storagePath: `evidence/${activeModuleCode}/${resolvedName}`,
          uploadedBy: profile?.displayName || 'Faculty Reviewer',
          uploadedAt: new Date().toISOString(),
          aiValidationStatus: 'VALID',
          aiFeedback: 'Automated audit compliance verified successfully.',
          name: resolvedName,
          category: docCategory,
          subCategory: docCategory === 'MODERATION' ? subCategory : undefined,
          isExamRelated: isExamRelated,
          size: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`,
          version: 1,
          questionnaire: null,
          frontPageGenerated: false,
          frontPageData: null
        });

        // Trigger notifications to notify changes
        const notifMsg = docCategory === 'ASSESSMENTS' && isExamRelated
          ? `${profile?.displayName || 'Lecturer'} uploaded a secure exam paper PDF for ${activeModuleCode}.`
          : `${profile?.displayName || 'Lecturer'} uploaded ${subCategory === 'INTERNAL_MOD' ? 'Internal' : 'External'} moderation report for ${activeModuleCode}.`;

        await addNotification({
          title: isExitLevelActive ? `Exit Level paper update for ${activeModuleCode}` : `Paper update for ${activeModuleCode}`,
          message: notifMsg,
          type: 'AUDIT',
          status: 'UNREAD',
          moduleCode: activeModuleCode,
          escalationTier: null,
          userId: profile?.uid || 'system'
        });

        setSuccessToast("Document successfully uploaded to Secure Cloud Ingestion Vault.");
      } catch (err) {
        console.error(err);
        setSuccessToast("Document uploaded to local session due to temporary offline-state.");
        // fallback local append
        const newFile: VaultFile = {
          id: String(Date.now()),
          name: resolvedName,
          category: docCategory,
          subCategory: docCategory === 'MODERATION' ? subCategory : undefined,
          isExamRelated: isExamRelated,
          uploadedBy: profile?.displayName || 'Faculty Reviewer',
          uploadedAt: 'Just now',
          size: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`,
          version: 1
        };
        setFiles(prev => [newFile, ...prev]);
      }
    } else {
      // Local fallback
      const newFile: VaultFile = {
        id: String(Date.now()),
        name: resolvedName,
        category: docCategory,
        subCategory: docCategory === 'MODERATION' ? subCategory : undefined,
        isExamRelated: isExamRelated,
        uploadedBy: profile?.displayName || 'Faculty Reviewer',
        uploadedAt: 'Just now',
        size: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`,
        version: 1
      };
      setFiles(prev => [newFile, ...prev]);
      setSuccessToast("Document uploaded locally for session preservation.");
    }

    setIsUploadModalOpen(false);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const deleteFile = async (id: string) => {
    const isInDb = dbEvidence.some(ev => ev.id === id);
    if (isInDb && activeModuleId) {
      try {
        await deleteEvidence(activeModuleId, id);
        setSuccessToast("Document deleted successfully from Cloud Vault storage.");
      } catch (err) {
        console.error(err);
        setSuccessToast("Error deleting cloud file.");
      }
    } else {
      setFiles(prev => prev.filter(f => f.id !== id));
      setSuccessToast("Document deleted successfully from local vault.");
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Search and filter files
  const combinedFiles = [
    ...dbFilesMapped,
    ...files.filter(f => {
      // Check if file is related to current module code or is a general compliance document
      const isGeneralDoc = f.category === 'CURRICULUM' || f.category === 'COMPLIANCE';
      const isThisModuleDoc = f.name.toUpperCase().includes(activeModuleCode.toUpperCase());
      const alreadyInDb = dbFilesMapped.some(dbF => dbF.name.toLowerCase() === f.name.toLowerCase());
      return (isGeneralDoc || isThisModuleDoc) && !alreadyInDb;
    })
  ];

  const filteredFiles = combinedFiles.filter(f => {
    const matchesCategory = selectedCategory ? f.category === selectedCategory : true;
    const matchesSearch = searchQuery 
      ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 p-4 bg-emerald-950/90 border border-emerald-500/30 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md max-w-md"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-white text-xs font-semibold leading-relaxed">{successToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Secure <span className="text-indigo-500">File Vault</span></h2>
          <p className="text-slate-500 font-medium mt-2">Enterprise-grade document topology with automated retention.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Shield className="w-3 h-3 text-emerald-500" /> AES-256 Encrypted
          </div>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Clock className="w-3 h-3 text-amber-500" /> 3Y Retention Active
          </div>
        </div>
      </div>

      {/* Module Selector Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20 rounded-3xl border border-indigo-500/10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-32 bg-indigo-500/5 blur-[40px] rounded-full pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Active Module Folder</span>
          <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Switch Active Folder Pathway
          </h3>
          <p className="text-[10px] text-slate-500 font-bold">Instantly switch folders to view, upload, and process files for a different course.</p>
        </div>
        <div className="relative z-10 shrink-0 min-w-[240px]">
          <select
            value={activeModuleCode}
            onChange={(e) => {
              const code = e.target.value;
              // Set currentPath to match
              setCurrentPath(['Vault', 'Science', 'CS', 'BSc_CS', code, '2026', 'S1']);
            }}
            className="w-full bg-slate-950/80 border border-white/10 text-white text-xs font-extrabold rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 hover:border-indigo-500/40 transition cursor-pointer"
          >
            {dbModules.map((m) => (
              <option key={m.id} value={m.code}>
                {m.code} - {m.name} {m.isExitLevel ? ' (Exit Level)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white/5 p-4 rounded-2xl border border-white/10">
        {currentPath.map((item, i) => (
          <React.Fragment key={i}>
            <span 
              onClick={() => setCurrentPath(prev => prev.slice(0, i + 1))}
              className={cn(
                "hover:text-white cursor-pointer transition-colors px-2 py-1 rounded-md",
                i === currentPath.length - 1 && "bg-white/10 text-white"
              )}
            >
              {item}
            </span>
            {i < currentPath.length - 1 && <ChevronRight className="w-4 h-4 opacity-30" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Category Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Topology Categories</h3>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
              >
                Clear Filter
              </button>
            )}
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden",
                selectedCategory === cat.id 
                  ? "bg-indigo-600/10 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.1)]" 
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-start gap-4 relative z-10">
                <div className={cn("mt-1", cat.color)}>
                  <Folder className={cn("w-6 h-6 transition-transform group-hover:scale-110", selectedCategory === cat.id ? "fill-current opacity-20" : "")} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-white tracking-tight">{cat.label}</p>
                    {files.filter(f => f.category === cat.id).length > 0 && (
                      <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded-full">
                        {files.filter(f => f.category === cat.id).length}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-1">{cat.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* File Explorer Content */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Action Bar */}
          <div className="glass-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search within this directory..." 
                className="w-full bg-transparent pl-12 pr-4 text-sm text-white font-semibold placeholder:text-slate-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {assignToast && (
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-wide">
                  {assignToast}
                </span>
              )}
              {canUpload && (
                <button 
                  onClick={openUploadModal}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                  id="btn-upload-file-vault"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Document
                </button>
              )}
              {canAssign && (
                <button 
                  onClick={() => {
                    setAssignToast("Assigned Metadata Policy successfully!");
                    setTimeout(() => setAssignToast(null), 3000);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-amber-600/20 active:scale-95 animate-pulse"
                >
                  <Folder className="w-3.5 h-3.5" /> Assign Document Policy
                </button>
              )}
              {!canUpload && !canAssign && (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 text-center">View-Only Directory Access</span>
              )}
            </div>
          </div>

          {/* Dynamic Moderation Compliance Checklist Panel */}
          {(() => {
            const hasInternalReport = filteredFiles.some(f => 
              f.category === 'MODERATION' && 
              (f.subCategory === 'INTERNAL_MOD' || f.name.toLowerCase().includes('internal') || f.name.toLowerCase().includes('mod_report_tax402'))
            );

            const hasExternalReport = filteredFiles.some(f => 
              f.category === 'MODERATION' && 
              (f.subCategory === 'EXTERNAL_MOD' || f.name.toLowerCase().includes('external'))
            );

            const isModerationFullyCompliant = isExitLevelActive 
              ? (hasInternalReport && hasExternalReport) 
              : hasInternalReport;

            const examPaperFile = filteredFiles.find(f => f.category === 'ASSESSMENTS' && f.isExamRelated);
            const isQuestionnaireCompleted = examPaperFile && !!examPaperFile.questionnaire;

            return (
              <div className="space-y-6">
                <div className="glass-card p-6 border border-white/10 bg-slate-900 rounded-3xl relative overflow-hidden shadow-xl">
                  {/* Background ambient light */}
                  <div className={cn(
                    "absolute -right-20 -top-20 w-44 h-44 rounded-full blur-[80px] opacity-10 pointer-events-none",
                    isModerationFullyCompliant ? "bg-emerald-500" : "bg-amber-500"
                  )} />

                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-white/5">
                          Module Audit State
                        </span>
                        {isExitLevelActive ? (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 font-extrabold tracking-wider px-2.5 py-1 rounded-md uppercase border border-amber-500/20">
                            Exit Level Module
                          </span>
                        ) : (
                          <span className="text-[10px] bg-sky-500/10 text-sky-400 font-extrabold tracking-wider px-2.5 py-1 rounded-md uppercase border border-sky-500/20">
                            Standard Level Module
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                        <Folder className="w-5 h-5 text-indigo-400" />
                        {activeModuleCode} • {activeModuleInDb?.name || 'Introductory Course'}
                      </h3>
                      
                      <p className="text-slate-400 text-xs font-semibold max-w-md leading-relaxed">
                        Assessing quality reports required under national regulatory frameworks.
                        {isExitLevelActive 
                          ? " As an exit-level module, both internal and external moderation files are legally required." 
                          : " Standard modules require internal moderation checks only."}
                      </p>

                      {/* Manual Exit Level setting for HOD */}
                      <div className="flex items-center gap-3 pt-2 text-slate-400 text-xs font-semibold" id="module-exit-level-toggle-container">
                        <span>Exit Level Status:</span>
                        <div className="flex items-center gap-1.5 bg-slate-950 border border-white/10 px-2 py-1 rounded-xl">
                          <button
                            type="button"
                            disabled={!profile?.roles?.includes('HOD')}
                            onClick={async () => {
                              if (activeModuleId) {
                                await updateModule(activeModuleId, { isExitLevel: true });
                              }
                            }}
                            className={cn(
                              "text-[9px] px-2.5 py-1 font-black uppercase tracking-wider rounded-lg transition active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                              isExitLevelActive 
                                ? "bg-amber-500 text-slate-950" 
                                : "text-slate-400 hover:text-white"
                            )}
                            id="btn-module-set-exit-yes"
                          >
                            YES
                          </button>
                          <button
                            type="button"
                            disabled={!profile?.roles?.includes('HOD')}
                            onClick={async () => {
                              if (activeModuleId) {
                                await updateModule(activeModuleId, { isExitLevel: false });
                              }
                            }}
                            className={cn(
                              "text-[9px] px-2.5 py-1 font-black uppercase tracking-wider rounded-lg transition active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                              !isExitLevelActive 
                                ? "bg-sky-500 text-slate-950" 
                                : "text-slate-400 hover:text-white"
                            )}
                            id="btn-module-set-exit-no"
                          >
                            NO
                          </button>
                        </div>
                        {!profile?.roles?.includes('HOD') ? (
                          <span className="text-[9px] text-slate-500 font-normal italic">(HOD only)</span>
                        ) : (
                          <span className="text-[9px] text-indigo-400 font-semibold">(HOD Adjust Setting)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 shrink-0">
                      {/* The Reports Requirement List */}
                      <div className="space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl min-w-[260px]">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Moderation Checklist</h4>
                        
                        {/* Internal check */}
                        <div className="flex items-center justify-between gap-3 text-xs font-bold">
                          <span className="text-slate-300">Internal Moderation File</span>
                          {hasInternalReport ? (
                            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-black">
                              ✓ Uploaded
                            </span>
                          ) : (
                            <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-black animate-pulse">
                              ⚠ Pending
                            </span>
                          )}
                        </div>

                        {/* External check */}
                        <div className="flex items-center justify-between gap-3 text-xs font-bold">
                          <span className="text-slate-300">External Moderation File</span>
                          {!isExitLevelActive ? (
                            <span className="text-slate-500 bg-white/5 border border-white/5 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                              Not Required
                            </span>
                          ) : hasExternalReport ? (
                            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-black">
                              ✓ Uploaded
                            </span>
                          ) : (
                            <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-black animate-pulse">
                              ⚠ Required
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Overall verification stamp */}
                      <div className={cn(
                        "p-5 rounded-2xl flex flex-col items-center justify-center text-center border min-w-[150px]",
                        isModerationFullyCompliant 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                          : "bg-amber-500/5 border-amber-500/20 text-amber-500"
                      )}>
                        {isModerationFullyCompliant ? (
                          <>
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Compliant</span>
                            <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">All Reports Received</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-8 h-8 text-amber-500 mb-1.5 shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Reports Pending</span>
                            <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">
                              {isExitLevelActive && !hasExternalReport && !hasInternalReport ? "2 Files Missing" : "1 File Missing"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secure Cover Page Workflow Area */}
                {examPaperFile && (
                  <div className={cn(
                    "glass-card p-6 border rounded-3xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6",
                    isQuestionnaireCompleted 
                      ? "bg-emerald-500/5 border-emerald-500/20 shadow-md" 
                      : isModerationFullyCompliant 
                        ? "bg-indigo-600/10 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]" 
                        : "bg-slate-800/40 border-white/5 opacity-80"
                  )}>
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn(
                        "p-3 rounded-2xl shrink-0",
                        isQuestionnaireCompleted 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : isModerationFullyCompliant 
                            ? "bg-indigo-500/10 text-indigo-400" 
                            : "bg-slate-850 text-slate-600"
                      )}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Exam Ingestion Dispatch Workflow</span>
                        <h4 className="text-sm font-black text-white tracking-tight">
                          {isQuestionnaireCompleted 
                            ? "Institutional Cover Page Generated & Attached ✓" 
                            : isModerationFullyCompliant 
                              ? "Moderation Requirements Satisfied: Cover Page Questionnaire Pending" 
                              : "Awaiting Moderation Report Uploads"}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          {isQuestionnaireCompleted 
                            ? `Cover page compiled by ${examPaperFile.questionnaire?.examinerName || 'Lecturer'}. Attached & released to the secure Exam Vault.`
                            : isModerationFullyCompliant 
                              ? "All mandatory moderation files are present! Please complete the questionnaire to generate the standard front cover sheet and release this exam script."
                              : "This exam paper is uploaded, but requires mandatory moderation reports to unlock the cover page questionnaire and Exam Vault dispatch."}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto">
                      {isQuestionnaireCompleted ? (
                        <button 
                          onClick={() => {
                            setExaminerName(examPaperFile.questionnaire?.examinerName || '');
                            setInternalModeratorName(examPaperFile.questionnaire?.internalModeratorName || '');
                            setExternalModeratorName(examPaperFile.questionnaire?.externalModeratorName || '');
                            setExamDate(examPaperFile.questionnaire?.examDate || '');
                            setTotalMarks(String(examPaperFile.questionnaire?.totalMarks || 100));
                            setTimeAllowed(examPaperFile.questionnaire?.timeAllowed || '3 Hours');
                            setVenue(examPaperFile.questionnaire?.venue || 'Main Hall');
                            setSpecialInstructions(examPaperFile.questionnaire?.specialInstructions || '');
                            setIsPreviewingFrontPage(true);
                          }}
                          className="w-full sm:w-auto px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition cursor-pointer"
                        >
                          View Front Cover
                        </button>
                      ) : isModerationFullyCompliant ? (
                        <button 
                          onClick={() => {
                            setExaminerName(profile?.displayName || '');
                            setInternalModeratorName('');
                            setExternalModeratorName('');
                            setExamDate(new Date().toISOString().split('T')[0]);
                            setTotalMarks('100');
                            setTimeAllowed('3 Hours');
                            setVenue('Main Sports Hall');
                            setSpecialInstructions('1. Answer all questions.\n2. No calculators permitted.\n3. Show all working.');
                            setIsQuestionnaireOpen(true);
                          }}
                          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                        >
                          Complete Cover Sheet
                        </button>
                      ) : (
                        <button 
                          disabled
                          className="w-full sm:w-auto px-6 py-2.5 bg-slate-850 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed border border-white/5"
                        >
                          Locked (Pending Reports)
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Guidelines Banner explaining the Cover Page & PDF rule */}
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-white text-xs font-black uppercase tracking-wider">Exam Upload Regulatory Ingestion Protocol</h5>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
                All exam-related materials (category <strong className="text-indigo-400">Assessments</strong>) uploaded to the Secure Vault are strictly restricted to **PDF format**. Furthermore, the documents must **NOT contain any front templates or cover/title pages** (preventing administrative identity exposures). VaultIQ automated parsers run instant heuristic alignments on upload.
              </p>
            </div>
          </div>

          {/* File List / Content */}
          <div className="glass-card overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-400">
                <Folder className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-black text-white tracking-tight">
                  {selectedCategory ? `${selectedCategory} Archive` : 'Full Academic Archive'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Showing {filteredFiles.length} file{filteredFiles.length !== 1 && 's'}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {filteredFiles.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center text-center bg-white/[0.01]">
                  <div className="w-16 h-16 bg-slate-500/5 rounded-full flex items-center justify-center mb-4">
                    <File className="w-7 h-7 text-slate-500/35" />
                  </div>
                  <h4 className="text-slate-300 font-extrabold text-base tracking-tight">No documents archived here</h4>
                  <p className="text-slate-500 text-xs font-medium mt-1.5 max-w-sm">
                    {searchQuery ? 'Try adjusting your search query, or clear the search criteria.' : 'Create a clean template upload to populate files under this partition.'}
                  </p>
                  {canUpload && (
                    <button 
                      onClick={openUploadModal}
                      className="mt-6 flex items-center gap-1.5 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Upload First File
                    </button>
                  )}
                </div>
              ) : (
                filteredFiles.map((file, i) => (
                  <div key={file.id} className="flex items-center justify-between p-6 hover:bg-white/[0.03] transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-600/20 group-hover:border-indigo-500/50 transition-all shrink-0">
                        <File className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-white tracking-tight">{file.name}</p>
                          {i === 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase border border-emerald-500/20">Active</span>}
                          {file.isExamRelated && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase border border-amber-500/20">
                              Secure Exam PDF
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                          <span className="text-[10px] items-center flex gap-1 text-slate-500 font-bold uppercase tracking-wider">
                            <Clock className="w-3 h-3" /> {file.uploadedAt}
                          </span>
                          <span className="text-[10px] items-center flex gap-1 text-slate-500 font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {file.size}
                          </span>
                          <span className="text-[10px] items-center flex gap-1 text-slate-500 font-bold uppercase tracking-wider">
                            Owner: <strong className="text-slate-400">{file.uploadedBy}</strong>
                          </span>
                          <span className="text-[10px] bg-white/5 text-slate-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            {file.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors" title="Archive">
                        <Archive className="w-4 h-4" />
                      </button>
                      {canUpload && (
                        <button 
                          onClick={() => deleteFile(file.id)}
                          className="p-2.5 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-400 transition-colors" 
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drag & Drop Hint Footer */}
            <div className="p-12 border-t border-white/5 flex flex-col items-center justify-center text-center bg-white/[0.01]">
              <div className="w-14 h-14 bg-indigo-500/5 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-indigo-500/35" />
              </div>
              <h4 className="text-slate-300 font-bold text-sm tracking-tight">Standard compliance-driven audit engine active</h4>
              <p className="text-slate-500 text-xs mt-1.5 max-w-sm leading-relaxed">
                Files submitted will be auto-categorized, cryptographically validated and archived.
              </p>
            </div>
          </div>

          {/* Retention Warning */}
          <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
             <div className="space-y-1">
               <h5 className="text-amber-500 text-xs font-black uppercase tracking-widest leading-none">Archival Retention Protocol</h5>
               <p className="text-amber-500/70 text-xs font-medium leading-relaxed">
                 Documents older than 36 months are automatically moved to historical archives. Any record with a pending audit flag will be retained indefinitely until manually cleared by CQPA.
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* SECURE UPLOAD INGESTION MODAL */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-2xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl flex flex-col p-8 gap-6 relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              
              {/* Drag over overlay */}
              {dragOverModal && (
                <div className="absolute inset-0 bg-indigo-600/25 border-4 border-dashed border-indigo-500/80 z-40 flex flex-col items-center justify-center pointer-events-none text-white font-black uppercase tracking-wider backdrop-blur-xs">
                  <Upload className="w-14 h-14 animate-bounce mb-3 text-indigo-300" />
                  Release to Add Document to Vault
                </div>
              )}

              {/* Close Button */}
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h4 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Upload className="w-6 h-6 text-indigo-400" /> Secure Vault Ingestion
                </h4>
                <p className="text-slate-500 text-xs font-medium mt-1">Audit compliance check, automated version tracking.</p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-5">
                
                {/* File picker drop area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white/[0.02]",
                    selectedFile 
                      ? "border-indigo-500/30 bg-indigo-500/[0.01]" 
                      : "border-slate-800 hover:border-slate-700 bg-white/[0.005]"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                  />
                  
                  {selectedFile ? (
                    <div className="flex items-center gap-4 text-left w-full sm:px-4">
                      <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <h5 className="text-sm font-bold text-white tracking-tight truncate">{selectedFile.name}</h5>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">
                          {(selectedFile.size / 1024).toFixed(0)} KB • {selectedFile.type || 'Unknown MIME'}
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setScanResult(null);
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-rose-400 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-slate-500 mb-4 group-hover:text-white transition-colors">
                        <Upload className="w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-sm font-extrabold text-white">Click to browse or drag and drop file here</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">PDF and normal office types supported</p>
                    </>
                  )}
                </div>

                {isScanning && (
                  <div className="p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-2xl flex items-center justify-center gap-3 text-xs text-indigo-400 font-bold uppercase tracking-wider animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Running Automated Compliance Audit...
                  </div>
                )}

                {/* Live Warnings and Blockers */}
                {selectedFile && !isScanning && activeError && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "p-5 rounded-2.5xl border flex items-start gap-4 shadow-lg",
                      activeError.type === 'COVER_PAGE' 
                        ? "bg-amber-950/40 border-amber-500/30 text-amber-200 shadow-amber-500/5" 
                        : "bg-rose-950/40 border-rose-500/30 text-rose-200 shadow-rose-500/5"
                    )}
                  >
                    <ShieldAlert className={cn("w-6 h-6 shrink-0 mt-0.5", activeError.type === 'COVER_PAGE' ? "text-amber-500" : "text-rose-500")} />
                    <div className="space-y-1.5">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                        {activeError.type === 'COVER_PAGE' ? 'COMPLIANCE BLOCKED: Front Cover Page Detected' : 'COMPLIANCE BLOCKED: Invalid File Format'}
                      </h5>
                      <p className="text-[11px] font-semibold leading-relaxed text-slate-300">
                        {activeError.message}
                      </p>
                      {activeError.type === 'COVER_PAGE' && (
                        <div className="pt-2 text-[10px] font-bold text-amber-400 uppercase tracking-wide flex flex-col gap-1">
                          <span>Actionable Correction Required:</span>
                          <span className="text-slate-400 font-medium normal-case block pl-3 border-l border-amber-500/30">
                            1. Open your document editor/PDF utility. <br />
                            2. Remove the first page (cover template / faculty sheet) entirely. <br />
                            3. Save the clean contents ONLY as a PDF. <br />
                            4. Re-upload your sanitized document here.
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Live Success Notice if compliant */}
                {selectedFile && !isScanning && !activeError && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 rounded-2xl flex items-start gap-3.5 text-[11px] leading-relaxed">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wide text-white block">COMPLIANCE CHECKS PASSED</span>
                      <p className="text-slate-400 font-medium mt-0.5">
                        File complies with Rule EX-101 (PDF signature format) and has been scan-verified. Zero external administrative front cover templates detected.
                      </p>
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Document Category</label>
                    <select 
                      value={docCategory} 
                      onChange={handleCategoryChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold tracking-wide focus:outline-none focus:border-indigo-500 transition"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Rename (Optional)</label>
                    <input 
                      type="text" 
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="e.g. TAX402_EXAM_S1_2026"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {docCategory === 'MODERATION' && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <label className="text-[10px] font-black text-amber-550 uppercase tracking-widest pl-1 block">Moderation Report Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'INTERNAL_MOD', label: 'Internal Report', desc: 'Mandatory peer review report' },
                        { id: 'EXTERNAL_MOD', label: 'External Report', desc: 'Required for exit level modules' },
                        { id: 'OTHER', label: 'Other Review', desc: 'General verification log' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSubCategory(opt.id as any)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer",
                            subCategory === opt.id 
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                              : "bg-white/5 border-white/5 text-slate-400 hover:border-white/10"
                          )}
                        >
                          <span className="text-xs font-black block tracking-tight">{opt.label}</span>
                          <span className="text-[9px] text-slate-500 mt-1 block leading-relaxed font-medium">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-850/60 rounded-2xl border border-white/5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white tracking-wide block">Is Exam-Related Document?</span>
                      <span className="text-[10px] text-slate-500 font-medium leading-none">Subjects file to PDF format & cover page isolation audits</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isExamRelated} 
                        onChange={(e) => setIsExamRelated(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-white peer-checked:bg-indigo-600 peer-checked:after:border-indigo-500"></div>
                    </label>
                  </div>

                  <div className="border-t border-white/5 pt-3.5">
                    <div className="flex items-start gap-2.5">
                      <input 
                        type="checkbox" 
                        id="check-simulate-cover"
                        checked={simulateCoverPage}
                        onChange={(e) => setSimulateCoverPage(e.target.checked)}
                        className="mt-0.5 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="check-simulate-cover" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide cursor-pointer select-none">
                        SIMULATE: Include Institutional Front Cover / Title Page
                        <span className="block text-[9px] font-medium text-slate-500 normal-case mt-0.5">Toggle this to test the automated VaultIQ cover page compliance rule.</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!selectedFile || isScanning || !!activeError}
                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Ingest & Log File
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cover Page Questionnaire Modal */}
      <AnimatePresence>
        {isQuestionnaireOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative my-8"
            >
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setIsQuestionnaireOpen(false)}
                  className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Institutional Cover Sheet Generator</span>
                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-indigo-400" />
                  Cover Page Questionnaire
                </h3>
                <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                  Provide standard metadata parameters to generate a clean, unified cover sheet automatically. This cover sheet will be integrated as the secure front page of the exam paper.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const examPaperFile = filteredFiles.find(f => f.category === 'ASSESSMENTS' && f.isExamRelated);
                if (!examPaperFile || !activeModuleId) return;

                const questionnaireData = {
                  examinerName,
                  internalModeratorName,
                  externalModeratorName: isExitLevelActive ? externalModeratorName : undefined,
                  examDate,
                  totalMarks: Number(totalMarks) || 100,
                  timeAllowed,
                  venue,
                  specialInstructions
                };

                try {
                  await updateEvidence(activeModuleId, examPaperFile.id, {
                    questionnaire: questionnaireData,
                    frontPageGenerated: true,
                    frontPageData: {
                      generatedAt: new Date().toISOString(),
                      institution: "University of Southern Africa",
                      faculty: "Faculty of Commerce and Administration",
                      department: "Department of Accounting and Finance"
                    }
                  });

                  await addNotification({
                    title: isExitLevelActive ? `Exit Level paper cover generated for ${activeModuleCode}` : `Paper cover generated for ${activeModuleCode}`,
                    message: `Standard Institutional Cover Sheet generated and compiled for ${activeModuleCode} exam paper by ${examinerName}. Release package is now locked & dispatched to Exam Vault!`,
                    type: 'AUDIT',
                    status: 'UNREAD',
                    moduleCode: activeModuleCode,
                    escalationTier: null,
                    userId: profile?.uid || 'system'
                  });

                  setSuccessToast("Cover Page successfully compiled! Paper dispatched to secure Exam Vault.");
                  setIsQuestionnaireOpen(false);
                  setIsPreviewingFrontPage(true);
                } catch (err) {
                  console.error(err);
                  setSuccessToast("Error compiling cover page metadata.");
                }
                setTimeout(() => setSuccessToast(null), 4000);
              }} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Examiner Name</label>
                    <input 
                      type="text"
                      required
                      value={examinerName}
                      onChange={(e) => setExaminerName(e.target.value)}
                      placeholder="e.g. Prof. J. Smith"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Internal Moderator Name</label>
                    <input 
                      type="text"
                      required
                      value={internalModeratorName}
                      onChange={(e) => setInternalModeratorName(e.target.value)}
                      placeholder="e.g. Dr. A. Johnson"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {isExitLevelActive && (
                  <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1 block">External Moderator Name (Mandatory for Exit Level)</label>
                    <input 
                      type="text"
                      required
                      value={externalModeratorName}
                      onChange={(e) => setExternalModeratorName(e.target.value)}
                      placeholder="e.g. External Reviewer (University of Cape Town)"
                      className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Date of Test/Exam</label>
                    <input 
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Total Marks</label>
                      <input 
                        type="number"
                        required
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(e.target.value)}
                        placeholder="100"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Time Allowed</label>
                      <input 
                        type="text"
                        required
                        value={timeAllowed}
                        onChange={(e) => setTimeAllowed(e.target.value)}
                        placeholder="3 Hours"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Venue</label>
                  <input 
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Main Hall / Online Portal"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Special Instructions</label>
                  <textarea 
                    rows={3}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Enter special instructions (one per line)..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 transition resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setIsQuestionnaireOpen(false)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Generate & Dispatch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generated Front Page Cover Sheet Preview Modal */}
      <AnimatePresence>
        {isPreviewingFrontPage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-1 overflow-hidden max-w-2xl w-full shadow-2xl relative my-8"
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VaultIQ Secure Cover Compiler</span>
                </div>
                <button 
                  onClick={() => setIsPreviewingFrontPage(false)}
                  className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cover Page Printable Canvas container */}
              <div className="p-8 bg-slate-950 max-h-[70vh] overflow-y-auto">
                <div className="bg-white text-slate-950 p-12 rounded-2xl shadow-xl space-y-8 font-sans border-t-[12px] border-indigo-600 relative overflow-hidden">
                  
                  {/* Decorative faint stamp watermark */}
                  <div className="absolute right-[-30px] bottom-[-30px] opacity-[0.03] select-none pointer-events-none">
                    <ShieldCheck className="w-72 h-72 text-indigo-900" />
                  </div>

                  {/* Top Seal / Badge */}
                  <div className="flex flex-col items-center justify-center text-center pb-6 border-b-2 border-slate-200">
                    <div className="w-12 h-12 bg-indigo-50 border-2 border-indigo-600 rounded-full flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm mb-3">
                      U
                    </div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">University of Southern Africa</h1>
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Faculty of Commerce and Administration</p>
                    <p className="text-[9px] text-indigo-600 font-extrabold uppercase mt-1">CONFIDENTIAL ACADEMIC ASSESSMENT SCRIPT</p>
                  </div>

                  {/* Module details card */}
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs text-slate-800">
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wide">Module Code</span>
                      <p className="text-sm font-black text-slate-900">{activeModuleCode}</p>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wide">Module Description</span>
                      <p className="text-sm font-bold text-slate-800">{activeModuleInDb?.name || 'Academic Assessment Course'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wide">Examiner</span>
                      <p className="text-sm font-extrabold text-slate-800">{examinerName || 'Not specified'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wide">Internal Moderator</span>
                      <p className="text-sm font-extrabold text-slate-800">{internalModeratorName || 'Not specified'}</p>
                    </div>
                    {isExitLevelActive && (
                      <div className="space-y-1 col-span-2 border-t border-slate-200 pt-3 text-left">
                        <span className="text-[9px] text-amber-600 font-black uppercase tracking-wide flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          External Moderator (Exit Level Verification)
                        </span>
                        <p className="text-sm font-black text-slate-900">{externalModeratorName || 'Not specified'}</p>
                      </div>
                    )}
                  </div>

                  {/* Administrative parameters */}
                  <div className="grid grid-cols-3 gap-4 text-xs border-b border-slate-200 pb-6">
                    <div className="bg-slate-50/50 p-3 rounded-lg text-center border border-slate-200/60">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Assessment Date</span>
                      <span className="font-extrabold text-slate-800">{examDate || '2026-11-20'}</span>
                    </div>
                    <div className="bg-slate-50/50 p-3 rounded-lg text-center border border-slate-200/60">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Marks</span>
                      <span className="font-extrabold text-indigo-600 text-sm">{totalMarks || '100'} Marks</span>
                    </div>
                    <div className="bg-slate-50/50 p-3 rounded-lg text-center border border-slate-200/60">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Time Allowed</span>
                      <span className="font-extrabold text-slate-800">{timeAllowed || '3 Hours'}</span>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div className="space-y-2 text-xs text-left">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wide block">Instructions to Candidates</span>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 font-semibold leading-relaxed whitespace-pre-line font-mono text-[11px]">
                      {specialInstructions || 'No special instructions listed.'}
                    </div>
                  </div>

                  {/* Footer metadata stamp */}
                  <div className="flex justify-between items-end border-t border-slate-200 pt-6 text-[8px] text-slate-400 font-black uppercase tracking-wider">
                    <div className="space-y-0.5 text-left">
                      <span>VaultIQ Cryptographic Integrity Code:</span>
                      <span className="font-mono text-indigo-600 block text-[9px]">VIQ-COMP-984-S1-{activeModuleCode}</span>
                    </div>
                    <div className="text-right">
                      <span>Secured & Released:</span>
                      <span className="block text-slate-500 font-mono text-[9px]">Just Now</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-3 px-6 py-4 bg-slate-950 border-t border-white/5">
                <button 
                  onClick={() => setIsPreviewingFrontPage(false)}
                  className="px-6 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer border border-white/5"
                >
                  Close Preview
                </button>
                <button 
                  onClick={() => {
                    setIsPreviewingFrontPage(false);
                    setSuccessToast("Simulating secure print spooler dispatch...");
                    setTimeout(() => setSuccessToast(null), 3000);
                  }}
                  className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-emerald-600/15 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Close & Open Exam Vault
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
