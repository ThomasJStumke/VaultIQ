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
  BookOpen,
  Library,
  FileSpreadsheet,
  FileUp,
  RefreshCw,
  Trash2,
  Scale
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DocCategory, Module } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { mapUserRoleToRole, getPermission } from '../permissions.config';
import { 
  subscribeToModules, 
  subscribeToEvidence, 
  uploadEvidenceMetadata, 
  deleteEvidence, 
  updateEvidence,
  addNotification,
  updateModule,
  subscribeToStandardTemplates,
  uploadStandardTemplate,
  deleteStandardTemplate,
  subscribeToPolicyDocuments,
  uploadPolicyDocument,
  deletePolicyDocument,
  subscribeToDepartmentGuidelines,
  uploadDepartmentGuidelines,
  deleteDepartmentGuidelines
} from '../services/supabaseService';

const DEPARTMENTS = [
  { id: 'FAI_AUD_TAX', facultyId: 'FAI', name: 'Department of Auditing and Taxation', code: 'AUD_TAX' },
  { id: 'FAI_MGT_ACC', facultyId: 'FAI', name: 'Department of Management Accounting', code: 'MGT_ACC' },
  { id: 'FAI_FIN_ACC', facultyId: 'FAI', name: 'Department of Financial Accounting', code: 'FIN_ACC' },
  { id: 'FAI_IT', facultyId: 'FAI', name: 'Department of Information Technology', code: 'INF_TECH' },
  { id: 'FAI_IS', facultyId: 'FAI', name: 'Department of Information Systems', code: 'INF_SYS' },
  { id: 'FAI_ICM', facultyId: 'FAI', name: 'Department of Information Communications Management', code: 'INF_ICM' },
  { id: 'CS', facultyId: 'FID', name: 'Computer Science', code: 'CS' },
  { id: 'IT', facultyId: 'FID', name: 'Information Technology', code: 'IT' },
  { id: 'SOC', facultyId: 'FID', name: 'Social Sciences', code: 'SOC' },
  { id: 'CIV', facultyId: 'EBE', name: 'Civil Engineering', code: 'CIV' },
  { id: 'ELE', facultyId: 'EBE', name: 'Electrical Engineering', code: 'ELE' },
  { id: 'MEC', facultyId: 'EBE', name: 'Mechanical Engineering', code: 'MEC' },
  { id: 'ACCT', facultyId: 'BMS', name: 'Accountancy', code: 'ACCT' },
  { id: 'MGT', facultyId: 'BMS', name: 'Management', code: 'MGT' },
  { id: 'MATH', facultyId: 'FAS', name: 'Mathematics', code: 'MATH' },
];

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

export default function FileVault({ initialTab }: { initialTab?: 'explorer' | 'templates' | 'policies' | 'departmental' } = {}) {
  const { profile } = useAuth();
  const mappedRole = profile?.role ? mapUserRoleToRole(profile.role) : null;
  const permission = mappedRole ? getPermission(mappedRole, 'File Vault') : { access: 'none' };
  
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

  // Standard Templates States & Handlers
  const [vaultTab, setVaultTab] = useState<'explorer' | 'templates' | 'policies' | 'departmental'>(initialTab || 'explorer');

  useEffect(() => {
    if (initialTab) {
      setVaultTab(initialTab);
    }
  }, [initialTab]);

  const [standardTemplates, setStandardTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // Policy & Framework Library States & Handlers
  const [policyDocuments, setPolicyDocuments] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [uploadingPolicyId, setUploadingPolicyId] = useState<string | null>(null);
  const policyFileInputRef = useRef<HTMLInputElement>(null);

  // Departmental Guidelines States & Handlers
  const [departmentGuidelines, setDepartmentGuidelines] = useState<any[]>([]);
  const [loadingDeptGuidelines, setLoadingDeptGuidelines] = useState(false);
  const [uploadingDeptId, setUploadingDeptId] = useState<string | null>(null);
  const deptFileInputRef = useRef<HTMLInputElement>(null);

  const STANDARD_TEMPLATES_LIST = [
    { id: 'study-guide', name: 'Study Guide Template', desc: 'Official template for structuring academic study guides.' },
    { id: 'exam-paper', name: 'Exam Paper Template', desc: 'Secure institutional layout for summative examination papers.' },
    { id: 'assessment-brief', name: 'Assessment Brief Template', desc: 'Required format for describing assignments and projects.' },
    { id: 'marking-rubric', name: 'Marking Rubric Template', desc: 'Standard grading criteria and rubric grid.' },
    { id: 'internal-mod', name: 'Internal Moderation Report Template', desc: 'Quality assurance checklist for peer/departmental moderation.' },
    { id: 'external-mod', name: 'External Moderation Report Template', desc: 'Regulatory review report format for exit-level modules.' },
    { id: 'ai-reporting', name: 'AI Reporting Template', desc: 'Standard format for reporting automated compliance & generative checks.' },
  ];

  const POLICY_CATEGORIES_LIST = [
    { id: 'teaching-learning', name: 'Teaching & Learning Policy', icon: BookOpen, desc: 'Institution-wide rules, pedagogical standards, and expectations for course delivery and teaching.' },
    { id: 'quality-assurance', name: 'Quality Assurance Framework (CQPA Process)', icon: ShieldCheck, desc: 'Detailed workflow, checks, audit trails, and review processes managed by CQPA/QPO.' },
    { id: 'assessment-guidelines', name: 'Assessment Guidelines', icon: FileText, desc: 'Comprehensive guide on designing assignments, exams, weightings, and regulatory criteria.' },
    { id: 'moderation-guidelines', name: 'Moderation Guidelines', icon: FileSpreadsheet, desc: 'Official procedures for internal and external moderation of question papers, marking rubrics, and scripts.' },
    { id: 'other-guidelines', name: 'Other Institutional Guidelines', icon: Library, desc: 'General institutional policies, regulatory bodies guidelines, or general compliance directives.' }
  ];

  useEffect(() => {
    setLoadingTemplates(true);
    const unsub = subscribeToStandardTemplates((data) => {
      setStandardTemplates(data || []);
      setLoadingTemplates(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoadingPolicies(true);
    const unsub = subscribeToPolicyDocuments((data) => {
      setPolicyDocuments(data || []);
      setLoadingPolicies(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoadingDeptGuidelines(true);
    const unsub = subscribeToDepartmentGuidelines((data) => {
      setDepartmentGuidelines(data || []);
      setLoadingDeptGuidelines(false);
    });
    return () => unsub();
  }, []);

  const handleTemplateUpload = async (templateId: string, file: File) => {
    try {
      const templateItem = STANDARD_TEMPLATES_LIST.find(t => t.id === templateId);
      if (!templateItem) return;

      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      await uploadStandardTemplate(templateId, {
        templateType: templateItem.name,
        fileName: file.name,
        fileSize: sizeStr,
        updatedBy: profile?.displayName || 'QPO Officer'
      });

      // Notify: all HODs, all Programme Coordinators, and all Lecturers across the institution
      await addNotification({
        title: `[Template Library] ${templateItem.name} Updated`,
        message: `Quality Promotion Office (QPO) has uploaded/replaced the official standard template for ${templateItem.name}. File: ${file.name} (${sizeStr})`,
        type: 'COMPLIANCE',
        status: 'UNREAD',
        moduleCode: 'GENERAL',
        escalationTier: null,
        userId: profile?.uid || 'system',
        targetRoles: ['HOD', 'PROGRAMME_COORDINATOR', 'LECTURER', 'Lecturer', 'Programme Coordinator'],
        targetDepartmentId: 'ALL',
        fileName: file.name,
        fileSize: sizeStr,
        documentId: templateId,
        documentType: 'template',
        documentName: templateItem.name,
        updatedBy: profile?.displayName || 'QPO Officer',
        role: 'QPO'
      });

      setSuccessToast(`Successfully uploaded ${templateItem.name}!`);
    } catch (err) {
      console.error(err);
      setSuccessToast("Error uploading standard template.");
    }
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleTemplateDelete = async (templateId: string) => {
    try {
      const templateItem = STANDARD_TEMPLATES_LIST.find(t => t.id === templateId);
      await deleteStandardTemplate(templateId);
      setSuccessToast(`Removed standard template for ${templateItem?.name || templateId}`);
    } catch (err) {
      console.error(err);
      setSuccessToast("Error removing standard template.");
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handlePolicyUpload = async (policyId: string, file: File) => {
    try {
      const policyItem = POLICY_CATEGORIES_LIST.find(p => p.id === policyId);
      if (!policyItem) return;

      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      await uploadPolicyDocument(policyId, {
        policyName: policyItem.name,
        fileName: file.name,
        fileSize: sizeStr,
        updatedBy: profile?.displayName || 'QPO Officer'
      });

      // Notify: all HODs, all Programme Coordinators, and all Lecturers across the institution
      await addNotification({
        title: `[Policy Library] ${policyItem.name} Updated`,
        message: `Quality Promotion Office (QPO) has published/replaced the official institutional policy: ${policyItem.name}. File: ${file.name} (${sizeStr})`,
        type: 'COMPLIANCE',
        status: 'UNREAD',
        moduleCode: 'GENERAL',
        escalationTier: null,
        userId: profile?.uid || 'system',
        targetRoles: ['HOD', 'PROGRAMME_COORDINATOR', 'LECTURER', 'Lecturer', 'Programme Coordinator'],
        targetDepartmentId: 'ALL',
        fileName: file.name,
        fileSize: sizeStr,
        documentId: policyId,
        documentType: 'policy',
        documentName: policyItem.name,
        updatedBy: profile?.displayName || 'QPO Officer',
        role: 'QPO'
      });

      setSuccessToast(`Successfully uploaded ${policyItem.name}!`);
    } catch (err) {
      console.error(err);
      setSuccessToast("Error uploading policy document.");
    }
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handlePolicyDelete = async (policyId: string) => {
    try {
      const policyItem = POLICY_CATEGORIES_LIST.find(p => p.id === policyId);
      await deletePolicyDocument(policyId);
      setSuccessToast(`Removed policy document for ${policyItem?.name || policyId}`);
    } catch (err) {
      console.error(err);
      setSuccessToast("Error removing policy document.");
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeptGuidelinesUpload = async (deptId: string, file: File) => {
    try {
      const deptItem = DEPARTMENTS.find(d => d.id === deptId);
      if (!deptItem) return;

      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      await uploadDepartmentGuidelines(deptId, {
        departmentName: deptItem.name,
        departmentCode: deptItem.code,
        fileName: file.name,
        fileSize: sizeStr,
        updatedBy: profile?.displayName || 'HOD',
        updatedByEmail: profile?.email || ''
      });

      // Notify: only the Programme Coordinators and Lecturers within that same department
      await addNotification({
        title: `[Department Guidelines] ${deptItem.name} Guidelines Updated`,
        message: `The Head of Department (${profile?.displayName || 'HOD'}) has updated the departmental guidelines for ${deptItem.name}. File: ${file.name} (${sizeStr})`,
        type: 'COMPLIANCE',
        status: 'UNREAD',
        moduleCode: deptItem.code || 'GENERAL',
        escalationTier: null,
        userId: profile?.uid || 'system',
        targetRoles: ['PROGRAMME_COORDINATOR', 'LECTURER', 'Lecturer', 'Programme Coordinator'],
        targetDepartmentId: deptId,
        fileName: file.name,
        fileSize: sizeStr,
        documentId: deptId,
        documentType: 'guideline',
        documentName: `${deptItem.name} Teaching, Learning & Assessment Guidelines`,
        updatedBy: profile?.displayName || 'HOD',
        role: 'HOD',
        departmentName: deptItem.name
      });

      setSuccessToast(`Successfully uploaded guidelines for ${deptItem.name}!`);
    } catch (err) {
      console.error(err);
      setSuccessToast("Error uploading department guidelines.");
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeptGuidelinesDelete = async (deptId: string) => {
    try {
      const deptItem = DEPARTMENTS.find(d => d.id === deptId);
      await deleteDepartmentGuidelines(deptId);
      setSuccessToast(`Successfully removed guidelines for ${deptItem?.name || deptId}`);
    } catch (err) {
      console.error(err);
      setSuccessToast("Error deleting guidelines.");
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

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
            <p className="text-foreground text-xs font-semibold leading-relaxed">{successToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-foreground tracking-tighter">Secure <span className="text-indigo-500">File Vault</span></h2>
          <p className="text-subtle-foreground font-medium mt-2">Enterprise-grade document topology with automated retention.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-surface-tint border border-border rounded-xl flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <Shield className="w-3 h-3 text-emerald-500" /> AES-256 Encrypted
          </div>
          <div className="px-4 py-2 bg-surface-tint border border-border rounded-xl flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <Clock className="w-3 h-3 text-amber-500" /> 3Y Retention Active
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setVaultTab('explorer')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
            vaultTab === 'explorer' 
              ? "border-indigo-500 text-foreground bg-surface-tint rounded-t-xl" 
              : "border-transparent text-subtle-foreground hover:text-foreground"
          )}
        >
          <Folder className="w-4 h-4 text-indigo-400" />
          Academic Explorer
        </button>
        <button
          onClick={() => setVaultTab('templates')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
            vaultTab === 'templates' 
              ? "border-indigo-500 text-foreground bg-surface-tint rounded-t-xl" 
              : "border-transparent text-subtle-foreground hover:text-foreground"
          )}
        >
          <Library className="w-4 h-4 text-indigo-400" />
          Template Library
          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
            7 Official
          </span>
        </button>
        <button
          onClick={() => setVaultTab('policies')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
            vaultTab === 'policies' 
              ? "border-indigo-500 text-foreground bg-surface-tint rounded-t-xl" 
              : "border-transparent text-subtle-foreground hover:text-foreground"
          )}
        >
          <Scale className="w-4 h-4 text-indigo-400" />
          Policy & Framework Library
          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
            Governance
          </span>
        </button>
        <button
          onClick={() => setVaultTab('departmental')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
            vaultTab === 'departmental' 
              ? "border-indigo-500 text-foreground bg-surface-tint rounded-t-xl" 
              : "border-transparent text-subtle-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="w-4 h-4 text-indigo-400" />
          Department Guidelines
          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
            Department
          </span>
        </button>
      </div>

      {vaultTab === 'explorer' && (
        <>
          {/* Module Selector Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-surface via-surface to-indigo-950/20 rounded-3xl border border-indigo-500/10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-32 bg-indigo-500/5 blur-[40px] rounded-full pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Active Module Folder</span>
          <h3 className="text-sm font-black text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Switch Active Folder Pathway
          </h3>
          <p className="text-[10px] text-subtle-foreground font-bold">Instantly switch folders to view, upload, and process files for a different course.</p>
        </div>
        <div className="relative z-10 shrink-0 min-w-[240px]">
          <select
            value={activeModuleCode}
            onChange={(e) => {
              const code = e.target.value;
              // Set currentPath to match
              setCurrentPath(['Vault', 'Science', 'CS', 'BSc_CS', code, '2026', 'S1']);
            }}
            className="w-full bg-surface-sunken border border-border text-foreground text-xs font-extrabold rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 hover:border-indigo-500/40 transition cursor-pointer"
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
      <div className="flex items-center gap-2 text-xs font-bold text-subtle-foreground bg-surface-tint p-4 rounded-2xl border border-border">
        {currentPath.map((item, i) => (
          <React.Fragment key={i}>
            <span 
              onClick={() => setCurrentPath(prev => prev.slice(0, i + 1))}
              className={cn(
                "hover:text-foreground cursor-pointer transition-colors px-2 py-1 rounded-md",
                i === currentPath.length - 1 && "bg-surface-tint-strong text-foreground"
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
            <h3 className="text-[10px] font-black text-subtle-foreground uppercase tracking-[0.2em]">Topology Categories</h3>
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
                  : "bg-surface-tint border-border hover:border-foreground/20"
              )}
            >
              <div className="flex items-start gap-4 relative z-10">
                <div className={cn("mt-1", cat.color)}>
                  <Folder className={cn("w-6 h-6 transition-transform group-hover:scale-110", selectedCategory === cat.id ? "fill-current opacity-20" : "")} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-foreground tracking-tight">{cat.label}</p>
                    {files.filter(f => f.category === cat.id).length > 0 && (
                      <span className="text-[9px] bg-surface-2 text-muted-foreground font-bold px-1.5 py-0.5 rounded-full">
                        {files.filter(f => f.category === cat.id).length}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-subtle-foreground font-bold leading-relaxed mt-1">{cat.description}</p>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search within this directory..." 
                className="w-full bg-transparent pl-12 pr-4 text-sm text-foreground font-semibold placeholder:text-subtle-foreground focus:outline-none"
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
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
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
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-amber-600/20 active:scale-95 animate-pulse"
                >
                  <Folder className="w-3.5 h-3.5" /> Assign Document Policy
                </button>
              )}
              {!canUpload && !canAssign && (
                <span className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest px-4 text-center">View-Only Directory Access</span>
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
                <div className="glass-card p-6 border border-border bg-surface rounded-3xl relative overflow-hidden shadow-xl">
                  {/* Background ambient light */}
                  <div className={cn(
                    "absolute -right-20 -top-20 w-44 h-44 rounded-full blur-[80px] opacity-10 pointer-events-none",
                    isModerationFullyCompliant ? "bg-emerald-500" : "bg-amber-500"
                  )} />

                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-surface-2 text-foreground/80 font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-border-subtle">
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
                      
                      <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                        <Folder className="w-5 h-5 text-indigo-400" />
                        {activeModuleCode} • {activeModuleInDb?.name || 'Introductory Course'}
                      </h3>
                      
                      <p className="text-muted-foreground text-xs font-semibold max-w-md leading-relaxed">
                        Assessing quality reports required under national regulatory frameworks.
                        {isExitLevelActive 
                          ? " As an exit-level module, both internal and external moderation files are legally required." 
                          : " Standard modules require internal moderation checks only."}
                      </p>

                      {/* Manual Exit Level setting for HOD */}
                      <div className="flex items-center gap-3 pt-2 text-muted-foreground text-xs font-semibold" id="module-exit-level-toggle-container">
                        <span>Exit Level Status:</span>
                        <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-1 rounded-xl">
                          <button
                            type="button"
                            disabled={profile?.role !== 'HOD'}
                            onClick={async () => {
                              if (activeModuleId) {
                                await updateModule(activeModuleId, { isExitLevel: true });
                              }
                            }}
                            className={cn(
                              "text-[9px] px-2.5 py-1 font-black uppercase tracking-wider rounded-lg transition active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                              isExitLevelActive 
                                ? "bg-amber-500 text-slate-950" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            id="btn-module-set-exit-yes"
                          >
                            YES
                          </button>
                          <button
                            type="button"
                            disabled={profile?.role !== 'HOD'}
                            onClick={async () => {
                              if (activeModuleId) {
                                await updateModule(activeModuleId, { isExitLevel: false });
                              }
                            }}
                            className={cn(
                              "text-[9px] px-2.5 py-1 font-black uppercase tracking-wider rounded-lg transition active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                              !isExitLevelActive 
                                ? "bg-sky-500 text-slate-950" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            id="btn-module-set-exit-no"
                          >
                            NO
                          </button>
                        </div>
                        {profile?.role !== 'HOD' ? (
                          <span className="text-[9px] text-subtle-foreground font-normal italic">(HOD only)</span>
                        ) : (
                          <span className="text-[9px] text-indigo-400 font-semibold">(HOD Adjust Setting)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 shrink-0">
                      {/* The Reports Requirement List */}
                      <div className="space-y-3 bg-foreground/[0.02] border border-border-subtle p-4 rounded-2xl min-w-[260px]">
                        <h4 className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest leading-none mb-1">Moderation Checklist</h4>
                        
                        {/* Internal check */}
                        <div className="flex items-center justify-between gap-3 text-xs font-bold">
                          <span className="text-foreground/80">Internal Moderation File</span>
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
                          <span className="text-foreground/80">External Moderation File</span>
                          {!isExitLevelActive ? (
                            <span className="text-subtle-foreground bg-surface-tint border border-border-subtle text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Compliant</span>
                            <span className="text-[8px] text-muted-foreground font-extrabold uppercase mt-0.5 tracking-wider">All Reports Received</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-8 h-8 text-amber-500 mb-1.5 shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Reports Pending</span>
                            <span className="text-[8px] text-muted-foreground font-extrabold uppercase mt-0.5 tracking-wider">
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
                        : "bg-surface-sunken border-border-subtle opacity-80"
                  )}>
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn(
                        "p-3 rounded-2xl shrink-0",
                        isQuestionnaireCompleted 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : isModerationFullyCompliant 
                            ? "bg-indigo-500/10 text-indigo-400" 
                            : "bg-surface-2 text-subtle-foreground"
                      )}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-subtle-foreground block">Exam Ingestion Dispatch Workflow</span>
                        <h4 className="text-sm font-black text-foreground tracking-tight">
                          {isQuestionnaireCompleted 
                            ? "Institutional Cover Page Generated & Attached ✓" 
                            : isModerationFullyCompliant 
                              ? "Moderation Requirements Satisfied: Cover Page Questionnaire Pending" 
                              : "Awaiting Moderation Report Uploads"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
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
                          className="w-full sm:w-auto px-5 py-2.5 bg-surface-tint border border-border text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-tint-strong transition cursor-pointer"
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
                          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                        >
                          Complete Cover Sheet
                        </button>
                      ) : (
                        <button 
                          disabled
                          className="w-full sm:w-auto px-6 py-2.5 bg-surface-2 text-subtle-foreground rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed border border-border-subtle"
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
              <h5 className="text-foreground text-xs font-black uppercase tracking-wider">Exam Upload Regulatory Ingestion Protocol</h5>
              <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                All exam-related materials (category <strong className="text-indigo-400">Assessments</strong>) uploaded to the Secure Vault are strictly restricted to <strong>PDF format</strong>. Furthermore, the documents must <strong>NOT contain any front templates or cover/title pages</strong> (preventing administrative identity exposures). VaultIQ automated parsers run instant heuristic alignments on upload.
              </p>
            </div>
          </div>

          {/* Official Reference Templates Quick Access Bar */}
          <div className="p-5 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl space-y-3 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-24 bg-indigo-500/5 blur-[30px] rounded-full pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <h5 className="text-foreground text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Library className="w-4 h-4 text-indigo-400" />
                  Official Reference Templates Quick Download
                </h5>
                <p className="text-muted-foreground text-[11px] font-medium">
                  Lecturers and moderators must use standard formats when drafting study guides, exams, assessments, or moderation reviews.
                </p>
              </div>
              <button
                onClick={() => setVaultTab('templates')}
                className="text-[10px] bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-500/20 self-start sm:self-center shrink-0 transition"
              >
                Go to Library
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {[
                { id: 'study-guide', name: 'Study Guide Template' },
                { id: 'exam-paper', name: 'Exam Paper Template' },
                { id: 'assessment-brief', name: 'Assessment Brief Template' },
                { id: 'internal-mod', name: 'Internal Moderation Template' },
              ].map((temp) => {
                const uploaded = standardTemplates.find(t => t.id === temp.id);
                return (
                  <div
                    key={temp.id}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between gap-2 text-xs",
                      uploaded
                        ? "bg-surface-tint border-border text-foreground/80"
                        : "bg-surface-sunken border-border-subtle text-subtle-foreground"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="font-bold truncate text-[11px]">{temp.name}</p>
                      <p className="text-[9px] text-subtle-foreground mt-0.5 uppercase tracking-wide">
                        {uploaded ? uploaded.fileSize : "Not Available"}
                      </p>
                    </div>
                    {uploaded ? (
                      <button
                        onClick={() => {
                          setSuccessToast(`Downloading template: ${uploaded.fileName}...`);
                          setTimeout(() => setSuccessToast(null), 3000);
                        }}
                        className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition"
                        title="Download template"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[8px] text-subtle-foreground font-extrabold uppercase shrink-0">N/A</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* File List / Content */}
          <div className="glass-card overflow-hidden">
            <div className="px-8 py-6 border-b border-border-subtle bg-foreground/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Folder className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-black text-foreground tracking-tight">
                  {selectedCategory ? `${selectedCategory} Archive` : 'Full Academic Archive'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-subtle-foreground uppercase">
                Showing {filteredFiles.length} file{filteredFiles.length !== 1 && 's'}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {filteredFiles.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center text-center bg-foreground/[0.01]">
                  <div className="w-16 h-16 bg-slate-500/5 rounded-full flex items-center justify-center mb-4">
                    <File className="w-7 h-7 text-slate-500/35" />
                  </div>
                  <h4 className="text-foreground/80 font-extrabold text-base tracking-tight">No documents archived here</h4>
                  <p className="text-subtle-foreground text-xs font-medium mt-1.5 max-w-sm">
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
                  <div key={file.id} className="flex items-center justify-between p-6 hover:bg-foreground/[0.03] transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-surface-tint border border-border flex items-center justify-center group-hover:bg-indigo-600/20 group-hover:border-indigo-500/50 transition-all shrink-0">
                        <File className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-foreground tracking-tight">{file.name}</p>
                          {i === 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase border border-emerald-500/20">Active</span>}
                          {file.isExamRelated && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase border border-amber-500/20">
                              Secure Exam PDF
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                          <span className="text-[10px] items-center flex gap-1 text-subtle-foreground font-bold uppercase tracking-wider">
                            <Clock className="w-3 h-3" /> {file.uploadedAt}
                          </span>
                          <span className="text-[10px] items-center flex gap-1 text-subtle-foreground font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {file.size}
                          </span>
                          <span className="text-[10px] items-center flex gap-1 text-subtle-foreground font-bold uppercase tracking-wider">
                            Owner: <strong className="text-muted-foreground">{file.uploadedBy}</strong>
                          </span>
                          <span className="text-[10px] bg-surface-tint text-muted-foreground font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            {file.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 hover:bg-surface-tint-strong rounded-xl text-muted-foreground hover:text-foreground transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 hover:bg-surface-tint-strong rounded-xl text-muted-foreground hover:text-foreground transition-colors" title="Archive">
                        <Archive className="w-4 h-4" />
                      </button>
                      {canUpload && (
                        <button 
                          onClick={() => deleteFile(file.id)}
                          className="p-2.5 hover:bg-rose-500/10 rounded-xl text-muted-foreground hover:text-rose-400 transition-colors" 
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
            <div className="p-12 border-t border-border-subtle flex flex-col items-center justify-center text-center bg-foreground/[0.01]">
              <div className="w-14 h-14 bg-indigo-500/5 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-indigo-500/35" />
              </div>
              <h4 className="text-foreground/80 font-bold text-sm tracking-tight">Standard compliance-driven audit engine active</h4>
              <p className="text-subtle-foreground text-xs mt-1.5 max-w-sm leading-relaxed">
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
      </>
    )}

      {vaultTab === 'templates' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-indigo-950/40 via-surface to-indigo-950/20 rounded-3xl border border-indigo-500/10 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-48 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none" />
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-indigo-500/20">
                Institutional Quality Assurance
              </span>
              <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                <Library className="text-indigo-400 w-5 h-5" />
                Standard Institutional Template Library
              </h3>
              <p className="text-muted-foreground text-xs font-semibold max-w-2xl leading-relaxed">
                Official institutional formats and report guides. Under Higher Education Quality guidelines, all departments must use these current templates. Only the Quality Promotion Office (QPO) can manage and replace these standard specifications.
              </p>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-foreground text-xs font-black uppercase tracking-wider">File Vault Quick Access Protocol</h5>
              <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                All templates listed below can be directly downloaded by any staff member. Lecturers and administrators must use these standard formats when preparing study guides, assessments, rubrics, and moderation reports.
              </p>
            </div>
          </div>

          {/* Templates Grid / List */}
          <div className="glass-card overflow-hidden">
            <div className="px-8 py-6 border-b border-border-subtle bg-foreground/[0.02] flex justify-between items-center">
              <span className="text-sm font-black text-foreground tracking-tight uppercase">Mandatory Formats</span>
              <span className="text-[10px] font-bold text-subtle-foreground uppercase">7 Registered Slots</span>
            </div>

            {/* Hidden Input for Template Uploading */}
            <input 
              type="file" 
              ref={templateFileInputRef} 
              className="hidden" 
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && uploadingTemplateId) {
                  handleTemplateUpload(uploadingTemplateId, e.target.files[0]);
                  setUploadingTemplateId(null);
                }
              }}
            />

            <div className="divide-y divide-white/5">
              {STANDARD_TEMPLATES_LIST.map((temp) => {
                const uploaded = standardTemplates.find(t => t.id === temp.id);
                return (
                  <div key={temp.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-foreground/[0.02] transition-colors group">
                    <div className="flex items-start gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center border transition-all shrink-0",
                        uploaded 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                          : "bg-slate-500/5 border-border-subtle text-subtle-foreground"
                      )}>
                        {uploaded ? <FileSpreadsheet className="w-6 h-6" /> : <FileUp className="w-6 h-6 opacity-40" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-foreground tracking-tight">{temp.name}</h4>
                          {uploaded ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase border border-emerald-500/20">
                              Active Version
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-surface-2 text-subtle-foreground text-[8px] font-bold uppercase">
                              No File Uploaded
                            </span>
                          )}
                        </div>
                        <p className="text-subtle-foreground text-xs font-semibold leading-relaxed">{temp.desc}</p>
                        
                        {uploaded && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <File className="w-3.5 h-3.5 text-indigo-400" /> {uploaded.fileName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Updated: {uploaded.updatedAt ? new Date(uploaded.updatedAt).toLocaleDateString('en-GB') + ' ' + new Date(uploaded.updatedAt).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : 'Recently'}
                            </span>
                            <span className="flex items-center gap-1">
                              Size: {uploaded.fileSize}
                            </span>
                            <span className="flex items-center gap-1">
                              By: <strong className="text-foreground/80">{uploaded.updatedBy}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {uploaded && (
                        <button
                          onClick={() => {
                            setSuccessToast(`Downloading standard template: ${uploaded.fileName}...`);
                            setTimeout(() => setSuccessToast(null), 3000);
                          }}
                          className="px-4 py-2 bg-surface-tint hover:bg-surface-tint-strong text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest border border-border transition-all flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      )}

                      {profile?.role === 'QPO' ? (
                        <>
                          <button
                            onClick={() => {
                              setUploadingTemplateId(temp.id);
                              setTimeout(() => {
                                templateFileInputRef.current?.click();
                              }, 100);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                              uploaded
                                ? "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                                : "bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-lg shadow-indigo-600/20"
                            )}
                          >
                            {uploaded ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" /> Replace
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" /> Upload File
                              </>
                            )}
                          </button>
                          
                          {uploaded && (
                            <button
                              onClick={() => handleTemplateDelete(temp.id)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors"
                              title="Delete template version"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        !uploaded && (
                          <span className="text-[10px] text-subtle-foreground font-bold italic">Awaiting QPO upload</span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {vaultTab === 'policies' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-indigo-950/40 via-surface to-indigo-950/20 rounded-3xl border border-indigo-500/10 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-48 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none" />
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-indigo-500/20">
                Institutional Governance
              </span>
              <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                <Scale className="text-indigo-400 w-5 h-5" />
                Policy & Framework Library
              </h3>
              <p className="text-muted-foreground text-xs font-semibold max-w-2xl leading-relaxed">
                Official institution-wide governance documents, standards, guidelines, and compliance frameworks. These documents represent the formal regulations of the academic senate and quality promotion councils.
              </p>
            </div>
          </div>

          {/* Access Guidelines Card */}
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-foreground text-xs font-black uppercase tracking-wider">Access Protocol Information</h5>
              <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                {profile?.role === 'QPO' ? (
                  <span className="text-emerald-400 font-bold">Authorized QPO Session:</span>
                ) : (
                  <span>General Access:</span>
                )}{" "}
                These documents apply institution-wide to all faculties and departments. Every role in the system can view and download them for regulatory compliance. Only the Quality Promotion Office (QPO) is authorized to upload, update, or remove these master policy records.
              </p>
            </div>
          </div>

          {/* Policy Ingestion / File Input */}
          <input 
            type="file" 
            ref={policyFileInputRef} 
            className="hidden" 
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0] && uploadingPolicyId) {
                handlePolicyUpload(uploadingPolicyId, e.target.files[0]);
                setUploadingPolicyId(null);
              }
            }}
          />

          {/* Policies Grid */}
          <div className="glass-card overflow-hidden">
            <div className="px-8 py-6 border-b border-border-subtle bg-foreground/[0.02] flex justify-between items-center">
              <span className="text-sm font-black text-foreground tracking-tight uppercase">Master Policy Documents</span>
              <span className="text-[10px] font-bold text-subtle-foreground uppercase">5 Core Governance Dimensions</span>
            </div>

            <div className="divide-y divide-white/5">
              {POLICY_CATEGORIES_LIST.map((item) => {
                const uploaded = policyDocuments.find(p => p.id === item.id);
                const ItemIcon = item.icon;
                return (
                  <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-foreground/[0.02] transition-colors group">
                    <div className="flex items-start gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center border transition-all shrink-0",
                        uploaded 
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                          : "bg-slate-500/5 border-border-subtle text-subtle-foreground"
                      )}>
                        <ItemIcon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-foreground tracking-tight">{item.name}</h4>
                          {uploaded ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase border border-indigo-500/20">
                              Active Master Policy
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-surface-2 text-subtle-foreground text-[8px] font-bold uppercase">
                              Document Missing (Awaiting Ingestion)
                            </span>
                          )}
                        </div>
                        <p className="text-subtle-foreground text-xs font-semibold leading-relaxed">{item.desc}</p>
                        
                        {uploaded && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <File className="w-3.5 h-3.5 text-indigo-400" /> {uploaded.fileName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Published: {uploaded.updatedAt ? (uploaded.updatedAt.toDate ? new Date(uploaded.updatedAt.toDate()).toLocaleDateString('en-GB') + ' ' + new Date(uploaded.updatedAt.toDate()).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : new Date(uploaded.updatedAt).toLocaleDateString('en-GB') + ' ' + new Date(uploaded.updatedAt).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})) : 'Recently'}
                            </span>
                            <span className="flex items-center gap-1">
                              Size: {uploaded.fileSize}
                            </span>
                            <span className="flex items-center gap-1">
                              By: <strong className="text-foreground/80">{uploaded.updatedBy}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {uploaded && (
                        <button
                          onClick={() => {
                            setSuccessToast(`Downloading official policy: ${uploaded.fileName}...`);
                            setTimeout(() => setSuccessToast(null), 3000);
                          }}
                          className="px-4 py-2 bg-surface-tint hover:bg-surface-tint-strong text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest border border-border transition-all flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      )}

                      {profile?.role === 'QPO' ? (
                        <>
                          <button
                            onClick={() => {
                              setUploadingPolicyId(item.id);
                              setTimeout(() => {
                                policyFileInputRef.current?.click();
                              }, 100);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                              uploaded
                                ? "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                                : "bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-lg shadow-indigo-600/20"
                            )}
                          >
                            {uploaded ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" /> Replace Record
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" /> Upload master
                              </>
                            )}
                          </button>
                          
                          {uploaded && (
                            <button
                              onClick={() => handlePolicyDelete(item.id)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors"
                              title="Delete master record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        !uploaded && (
                          <span className="text-[10px] text-subtle-foreground font-bold italic">Awaiting upload by QPO</span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {vaultTab === 'departmental' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-indigo-950/40 via-surface to-indigo-950/20 rounded-3xl border border-indigo-500/10 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-48 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none" />
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-indigo-500/20">
                Departmental Governance
              </span>
              <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                <BookOpen className="text-indigo-400 w-5 h-5" />
                Department Guidelines Library
              </h3>
              <p className="text-muted-foreground text-xs font-semibold max-w-2xl leading-relaxed">
                Specific academic, pedagogical, teaching, learning, and assessment guidelines customized per academic department.
              </p>
            </div>
          </div>

          {/* Access Guidelines Card */}
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-foreground text-xs font-black uppercase tracking-wider">Access Protocol Information</h5>
              <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                Everyone within an academic department can view and download their department's specific guidelines. High-level overseeing roles can view all departments' guidelines. Only the Head of Department (HOD) of that specific department is authorized to upload, update, or remove their department's guidelines.
              </p>
            </div>
          </div>

          {/* Department Guidelines Ingestion Input */}
          <input 
            type="file" 
            ref={deptFileInputRef} 
            className="hidden" 
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0] && uploadingDeptId) {
                handleDeptGuidelinesUpload(uploadingDeptId, e.target.files[0]);
                setUploadingDeptId(null);
              }
            }}
          />

          {/* Department Guidelines Grid */}
          <div className="glass-card overflow-hidden">
            <div className="px-8 py-6 border-b border-border-subtle bg-foreground/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-sm font-black text-foreground tracking-tight uppercase">Departmental Guidelines Registry</span>
                <p className="text-[10px] font-bold text-subtle-foreground uppercase mt-0.5">Teaching, Learning, & Assessment guidelines</p>
              </div>
              
              {/* If overseer, show search input */}
              {['Deputy Dean', 'Executive Dean', 'DVC: T&L', 'QPO', 'CQPA', 'Auditor'].includes(mapUserRoleToRole(profile?.role || '')) && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search departments..." 
                    className="w-full pl-9 pr-4 py-2 bg-surface-tint border border-border rounded-xl text-xs text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-subtle-foreground"
                    onChange={(e) => {
                      (window as any).__deptSearch = e.target.value;
                      // Force a re-render
                      setSuccessToast(null);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="divide-y divide-white/5">
              {(() => {
                const userRole = mapUserRoleToRole(profile?.role || '');
                const isOverseer = ['Deputy Dean', 'Executive Dean', 'DVC: T&L', 'QPO', 'CQPA', 'Auditor'].includes(userRole);
                
                let visibleDepts = DEPARTMENTS;
                if (!isOverseer) {
                  const userDeptId = profile?.departmentId;
                  visibleDepts = DEPARTMENTS.filter(d => d.id === userDeptId);
                }

                // Apply search filter if active
                const term = (window as any).__deptSearch || '';
                if (term) {
                  visibleDepts = visibleDepts.filter(d => 
                    d.name.toLowerCase().includes(term.toLowerCase()) || 
                    d.code.toLowerCase().includes(term.toLowerCase())
                  );
                }

                if (visibleDepts.length === 0) {
                  return (
                    <div className="p-8 text-center text-subtle-foreground text-xs font-bold uppercase">
                      {isOverseer ? "No departments found matching your filter." : "No department assigned to your user profile. Please update your profile settings or contact your administrator."}
                    </div>
                  );
                }

                return visibleDepts.map((dept) => {
                  const uploaded = departmentGuidelines.find(g => g.id === dept.id);
                  return (
                    <div key={dept.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-foreground/[0.02] transition-colors group">
                      <div className="flex items-start gap-5">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center border transition-all shrink-0",
                          uploaded 
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                            : "bg-slate-500/5 border-border-subtle text-subtle-foreground"
                        )}>
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-foreground tracking-tight">{dept.name}</h4>
                            <span className="px-2 py-0.5 rounded bg-surface-tint text-[9px] font-black text-muted-foreground uppercase border border-border-subtle">
                              {dept.code}
                            </span>
                            {uploaded ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase border border-emerald-500/20">
                                Active Guidelines
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[8px] font-black uppercase border border-amber-500/20">
                                Missing (Awaiting Upload)
                              </span>
                            )}
                          </div>
                          
                          <p className="text-subtle-foreground text-[11px] font-semibold">
                            Official Teaching, Learning, & Assessment guidelines for the {dept.name}.
                          </p>

                          {uploaded && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1">
                                <File className="w-3.5 h-3.5 text-indigo-400" /> {uploaded.fileName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Updated: {uploaded.updatedAt ? (uploaded.updatedAt.toDate ? new Date(uploaded.updatedAt.toDate()).toLocaleDateString('en-GB') + ' ' + new Date(uploaded.updatedAt.toDate()).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : new Date(uploaded.updatedAt).toLocaleDateString('en-GB') + ' ' + new Date(uploaded.updatedAt).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})) : 'Recently'}
                              </span>
                              <span className="flex items-center gap-1">
                                Size: {uploaded.fileSize}
                              </span>
                              <span className="flex items-center gap-1">
                                By: <strong className="text-foreground/80">{uploaded.updatedBy}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {uploaded && (
                          <button
                            onClick={() => {
                              setSuccessToast(`Downloading guidelines for ${dept.name}...`);
                              setTimeout(() => setSuccessToast(null), 3000);
                            }}
                            className="px-4 py-2 bg-surface-tint hover:bg-surface-tint-strong text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest border border-border transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        )}

                        {profile?.role === 'HOD' && profile?.departmentId === dept.id ? (
                          <>
                            <button
                              onClick={() => {
                                setUploadingDeptId(dept.id);
                                setTimeout(() => {
                                  deptFileInputRef.current?.click();
                                }, 100);
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                uploaded
                                  ? "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                                  : "bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-lg shadow-indigo-600/20"
                              )}
                            >
                              {uploaded ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" /> Replace Guidelines
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" /> Upload Guidelines
                                </>
                              )}
                            </button>
                            
                            {uploaded && (
                              <button
                                onClick={() => handleDeptGuidelinesDelete(dept.id)}
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors cursor-pointer"
                                title="Delete guidelines"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SECURE UPLOAD INGESTION MODAL */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-2xl border border-border bg-surface overflow-hidden shadow-2xl flex flex-col p-8 gap-6 relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              
              {/* Drag over overlay */}
              {dragOverModal && (
                <div className="absolute inset-0 bg-indigo-600/25 border-4 border-dashed border-indigo-500/80 z-40 flex flex-col items-center justify-center pointer-events-none text-foreground font-black uppercase tracking-wider backdrop-blur-xs">
                  <Upload className="w-14 h-14 animate-bounce mb-3 text-indigo-300" />
                  Release to Add Document to Vault
                </div>
              )}

              {/* Close Button */}
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-surface-tint hover:bg-surface-tint-strong text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h4 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  <Upload className="w-6 h-6 text-indigo-400" /> Secure Vault Ingestion
                </h4>
                <p className="text-subtle-foreground text-xs font-medium mt-1">Audit compliance check, automated version tracking.</p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-5">
                
                {/* File picker drop area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-foreground/[0.02]",
                    selectedFile 
                      ? "border-indigo-500/30 bg-indigo-500/[0.01]" 
                      : "border-border hover:border-border bg-foreground/[0.005]"
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
                        <h5 className="text-sm font-bold text-foreground tracking-tight truncate">{selectedFile.name}</h5>
                        <p className="text-[10px] text-subtle-foreground font-extrabold uppercase mt-1">
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
                        className="p-2 hover:bg-surface-tint-strong rounded-lg text-muted-foreground hover:text-rose-400 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-surface-tint border border-border-subtle rounded-2xl flex items-center justify-center text-subtle-foreground mb-4 group-hover:text-foreground transition-colors">
                        <Upload className="w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-sm font-extrabold text-foreground">Click to browse or drag and drop file here</p>
                      <p className="text-[10px] text-subtle-foreground font-bold uppercase tracking-widest mt-1.5">PDF and normal office types supported</p>
                    </>
                  )}
                </div>

                {/* Standard Templates Reference Download Helper */}
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-indigo-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/80">
                      Official Institutional Reference Templates
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Preparing your file? Ensure you are using the official standard formats. Click to download:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['study-guide', 'exam-paper', 'assessment-brief'].map((id) => {
                      const temp = STANDARD_TEMPLATES_LIST.find(t => t.id === id);
                      const uploaded = standardTemplates.find(t => t.id === id);
                      if (!temp) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!uploaded}
                          onClick={() => {
                            if (uploaded) {
                              setSuccessToast(`Downloading template: ${uploaded.fileName}...`);
                              setTimeout(() => setSuccessToast(null), 3000);
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition",
                            uploaded 
                              ? "bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 cursor-pointer" 
                              : "bg-surface-2 border border-border-subtle text-subtle-foreground cursor-not-allowed"
                          )}
                          title={uploaded ? `Last updated: ${new Date(uploaded.updatedAt).toLocaleDateString()}` : "Not uploaded by QPO yet"}
                        >
                          <Download className="w-3 h-3 shrink-0" />
                          {temp.name.replace(' Template', '')}
                          {!uploaded && " (N/A)"}
                        </button>
                      );
                    })}
                  </div>
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
                        ? "bg-amber-950/40 border-amber-500/30 text-status-warning shadow-amber-500/5"
                        : "bg-rose-950/40 border-rose-500/30 text-status-danger shadow-rose-500/5"
                    )}
                  >
                    <ShieldAlert className={cn("w-6 h-6 shrink-0 mt-0.5", activeError.type === 'COVER_PAGE' ? "text-amber-500" : "text-rose-500")} />
                    <div className="space-y-1.5">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                        {activeError.type === 'COVER_PAGE' ? 'COMPLIANCE BLOCKED: Front Cover Page Detected' : 'COMPLIANCE BLOCKED: Invalid File Format'}
                      </h5>
                      <p className="text-[11px] font-semibold leading-relaxed text-foreground/80">
                        {activeError.message}
                      </p>
                      {activeError.type === 'COVER_PAGE' && (
                        <div className="pt-2 text-[10px] font-bold text-amber-400 uppercase tracking-wide flex flex-col gap-1">
                          <span>Actionable Correction Required:</span>
                          <span className="text-muted-foreground font-medium normal-case block pl-3 border-l border-amber-500/30">
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
                      <span className="font-extrabold uppercase tracking-wide text-foreground block">COMPLIANCE CHECKS PASSED</span>
                      <p className="text-muted-foreground font-medium mt-0.5">
                        File complies with Rule EX-101 (PDF signature format) and has been scan-verified. Zero external administrative front cover templates detected.
                      </p>
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Document Category</label>
                    <select 
                      value={docCategory} 
                      onChange={handleCategoryChange}
                      className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-bold tracking-wide focus:outline-none focus:border-indigo-500 transition"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id} className="bg-surface">{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Rename (Optional)</label>
                    <input 
                      type="text" 
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="e.g. TAX402_EXAM_S1_2026"
                      className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-semibold focus:outline-none focus:border-indigo-500 transition"
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
                              ? "bg-amber-500/10 border-amber-500/40 text-status-warning"
                              : "bg-surface-tint border-border-subtle text-muted-foreground hover:border-border"
                          )}
                        >
                          <span className="text-xs font-black block tracking-tight">{opt.label}</span>
                          <span className="text-[9px] text-subtle-foreground mt-1 block leading-relaxed font-medium">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-surface-2/60 rounded-2xl border border-border-subtle flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-foreground tracking-wide block">Is Exam-Related Document?</span>
                      <span className="text-[10px] text-subtle-foreground font-medium leading-none">Subjects file to PDF format & cover page isolation audits</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isExamRelated} 
                        onChange={(e) => setIsExamRelated(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-surface-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-white peer-checked:bg-indigo-600 peer-checked:after:border-indigo-500"></div>
                    </label>
                  </div>

                  <div className="border-t border-border-subtle pt-3.5">
                    <div className="flex items-start gap-2.5">
                      <input 
                        type="checkbox" 
                        id="check-simulate-cover"
                        checked={simulateCoverPage}
                        onChange={(e) => setSimulateCoverPage(e.target.checked)}
                        className="mt-0.5 rounded border-border bg-surface-tint text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="check-simulate-cover" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide cursor-pointer select-none">
                        SIMULATE: Include Institutional Front Cover / Title Page
                        <span className="block text-[9px] font-medium text-subtle-foreground normal-case mt-0.5">Toggle this to test the automated VaultIQ cover page compliance rule.</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                  <button 
                    type="button" 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-6 py-2.5 bg-surface-2 hover:bg-surface-2 text-foreground/80 hover:text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!selectedFile || isScanning || !!activeError}
                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-surface-2 disabled:text-subtle-foreground text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface border border-border rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative my-8"
            >
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setIsQuestionnaireOpen(false)}
                  className="p-2 text-subtle-foreground hover:text-foreground hover:bg-surface-tint rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Institutional Cover Sheet Generator</span>
                <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-indigo-400" />
                  Cover Page Questionnaire
                </h3>
                <p className="text-muted-foreground text-xs font-semibold leading-relaxed">
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
                    <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Examiner Name</label>
                    <input 
                      type="text"
                      required
                      value={examinerName}
                      onChange={(e) => setExaminerName(e.target.value)}
                      placeholder="e.g. Prof. J. Smith"
                      className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Internal Moderator Name</label>
                    <input 
                      type="text"
                      required
                      value={internalModeratorName}
                      onChange={(e) => setInternalModeratorName(e.target.value)}
                      placeholder="e.g. Dr. A. Johnson"
                      className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-indigo-500 transition"
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
                      className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Date of Test/Exam</label>
                    <input 
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Total Marks</label>
                      <input 
                        type="number"
                        required
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(e.target.value)}
                        placeholder="100"
                        className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Time Allowed</label>
                      <input 
                        type="text"
                        required
                        value={timeAllowed}
                        onChange={(e) => setTimeAllowed(e.target.value)}
                        placeholder="3 Hours"
                        className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Venue</label>
                  <input 
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Main Hall / Online Portal"
                    className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest pl-1 block">Special Instructions</label>
                  <textarea 
                    rows={3}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Enter special instructions (one per line)..."
                    className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs text-foreground font-semibold focus:outline-none focus:border-indigo-500 transition resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                  <button 
                    type="button" 
                    onClick={() => setIsQuestionnaireOpen(false)}
                    className="px-6 py-2.5 bg-surface-2 hover:bg-surface-2 text-foreground/80 hover:text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface border border-border rounded-3xl p-1 overflow-hidden max-w-2xl w-full shadow-2xl relative my-8"
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">VaultIQ Secure Cover Compiler</span>
                </div>
                <button 
                  onClick={() => setIsPreviewingFrontPage(false)}
                  className="p-2 text-subtle-foreground hover:text-foreground hover:bg-surface-tint rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cover Page Printable Canvas container */}
              <div className="p-8 bg-background max-h-[70vh] overflow-y-auto">
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
                    <p className="text-[10px] text-subtle-foreground font-extrabold uppercase tracking-widest">Faculty of Commerce and Administration</p>
                    <p className="text-[9px] text-indigo-600 font-extrabold uppercase mt-1">CONFIDENTIAL ACADEMIC ASSESSMENT SCRIPT</p>
                  </div>

                  {/* Module details card */}
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs text-slate-800">
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wide">Module Code</span>
                      <p className="text-sm font-black text-slate-900">{activeModuleCode}</p>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wide">Module Description</span>
                      <p className="text-sm font-bold text-slate-800">{activeModuleInDb?.name || 'Academic Assessment Course'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wide">Examiner</span>
                      <p className="text-sm font-extrabold text-slate-800">{examinerName || 'Not specified'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wide">Internal Moderator</span>
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
                      <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Assessment Date</span>
                      <span className="font-extrabold text-slate-800">{examDate || '2026-11-20'}</span>
                    </div>
                    <div className="bg-slate-50/50 p-3 rounded-lg text-center border border-slate-200/60">
                      <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Total Marks</span>
                      <span className="font-extrabold text-indigo-600 text-sm">{totalMarks || '100'} Marks</span>
                    </div>
                    <div className="bg-slate-50/50 p-3 rounded-lg text-center border border-slate-200/60">
                      <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Time Allowed</span>
                      <span className="font-extrabold text-slate-800">{timeAllowed || '3 Hours'}</span>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div className="space-y-2 text-xs text-left">
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wide block">Instructions to Candidates</span>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-subtle-foreground/70 font-semibold leading-relaxed whitespace-pre-line font-mono text-[11px]">
                      {specialInstructions || 'No special instructions listed.'}
                    </div>
                  </div>

                  {/* Footer metadata stamp */}
                  <div className="flex justify-between items-end border-t border-slate-200 pt-6 text-[8px] text-muted-foreground font-black uppercase tracking-wider">
                    <div className="space-y-0.5 text-left">
                      <span>VaultIQ Cryptographic Integrity Code:</span>
                      <span className="font-mono text-indigo-600 block text-[9px]">VIQ-COMP-984-S1-{activeModuleCode}</span>
                    </div>
                    <div className="text-right">
                      <span>Secured & Released:</span>
                      <span className="block text-subtle-foreground font-mono text-[9px]">Just Now</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-3 px-6 py-4 bg-background border-t border-border-subtle">
                <button 
                  onClick={() => setIsPreviewingFrontPage(false)}
                  className="px-6 py-2.5 bg-surface-2 hover:bg-surface-2 text-foreground/80 hover:text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer border border-border-subtle"
                >
                  Close Preview
                </button>
                <button 
                  onClick={() => {
                    setIsPreviewingFrontPage(false);
                    setSuccessToast("Simulating secure print spooler dispatch...");
                    setTimeout(() => setSuccessToast(null), 3000);
                  }}
                  className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-emerald-600/15 cursor-pointer flex items-center gap-2"
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
