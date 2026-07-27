import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Building2, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  BookOpen, 
  Users, 
  Search, 
  FolderPlus, 
  Compass, 
  Activity, 
  Calendar,
  Layers,
  ChevronDown,
  Edit2,
  Download,
  FileSpreadsheet,
  Upload,
  Trash2,
  Clock,
  File,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Module } from '../types';
import { filterModulesByScope } from '../permissions.config';
import { 
  subscribeToModules, 
  addModule, 
  updateModule, 
  subscribeToUsers, 
  addStaffMember,
  subscribeToDepartmentGuidelines,
  uploadDepartmentGuidelines,
  deleteDepartmentGuidelines,
  addNotification
} from '../services/supabaseService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Static mappings for lookup
const FACULTIES = [
  { id: 'FAI', name: 'Faculty of Accounting and Informatics', short: 'Accounting & Info' },
  { id: 'EBE', name: 'Engineering & Built Environment', short: 'Engineering' },
  { id: 'FID', name: 'Informatics & Design', short: 'Informatics' },
  { id: 'BMS', name: 'Business & Management Sciences', short: 'Business' },
  { id: 'FAS', name: 'Applied Sciences', short: 'Applied Sciences' },
];

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

const ASSESSMENT_MODES = [
  { value: 'EXAM_BASED', label: 'Exam Based' },
  { value: 'CONTINUOUS_ASSESSMENT', label: 'Continuous Assessment' },
  { value: 'PROJECT_BASED', label: 'Project Based' },
];

// Master Catalog of pre-assigned modules grouped by departmental ID
const PREASSIGNED_MODULES: Record<string, { code: string; name: string; assessmentMode: string }[]> = {
  'FAI_AUD_TAX': [
    { code: 'AUD111', name: 'Internal Audit 1', assessmentMode: 'EXAM_BASED' },
    { code: 'AUD201', name: 'Internal Audit 2', assessmentMode: 'EXAM_BASED' },
    { code: 'AUD302', name: 'External Auditing & Assurance', assessmentMode: 'PROJECT_BASED' },
    { code: 'TAX201', name: 'Principles of Taxation', assessmentMode: 'EXAM_BASED' },
    { code: 'TAX301', name: 'Advanced Taxation', assessmentMode: 'PROJECT_BASED' }
  ],
  'FAI_MGT_ACC': [
    { code: 'MAC211', name: 'Management Accounting 1', assessmentMode: 'EXAM_BASED' },
    { code: 'MAC312', name: 'Advanced Management Accounting', assessmentMode: 'PROJECT_BASED' },
    { code: 'FMA301', name: 'Financial Decision Making', assessmentMode: 'EXAM_BASED' }
  ],
  'FAI_FIN_ACC': [
    { code: 'FAC111', name: 'Financial Accounting 1', assessmentMode: 'EXAM_BASED' },
    { code: 'FAC212', name: 'Financial Corporate Reporting', assessmentMode: 'EXAM_BASED' },
    { code: 'FAC313', name: 'Advanced Financial Accounting', assessmentMode: 'PROJECT_BASED' }
  ],
  'FAI_IT': [
    { code: 'ITS101', name: 'Information Technology Skills 1', assessmentMode: 'CONTINUOUS_ASSESSMENT' },
    { code: 'PRG201', name: 'Technical Programming 2', assessmentMode: 'CONTINUOUS_ASSESSMENT' },
    { code: 'PRG302', name: 'Advanced Software Programming', assessmentMode: 'PROJECT_BASED' }
  ],
  'FAI_IS': [
    { code: 'SYS111', name: 'Systems Analysis 1', assessmentMode: 'CONTINUOUS_ASSESSMENT' },
    { code: 'SYS212', name: 'Database Management Systems 2', assessmentMode: 'CONTINUOUS_ASSESSMENT' },
    { code: 'SYS313', name: 'Enterprise Architecture Systems', assessmentMode: 'PROJECT_BASED' }
  ],
  'FAI_ICM': [
    { code: 'ICM111', name: 'Information Communications 1', assessmentMode: 'EXAM_BASED' },
    { code: 'ICM212', name: 'Digital Content Operations', assessmentMode: 'CONTINUOUS_ASSESSMENT' },
    { code: 'ICM313', name: 'Advanced Information Management', assessmentMode: 'PROJECT_BASED' }
  ],
};

export default function ModuleMapping() {
  const { profile } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('FAI');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('FAI_AUD_TAX');
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [loading, setLoading] = useState(true);

  // Departmental Guidelines states
  const [departmentGuidelines, setDepartmentGuidelines] = useState<any[]>([]);
  const [uploadingDeptId, setUploadingDeptId] = useState<string | null>(null);
  const deptFileInputRef = useRef<HTMLInputElement>(null);
  const [deptGuidelinesToast, setDeptGuidelinesToast] = useState<string | null>(null);

  // Faculty Admin syllabus module creator states
  const [isAddingNewSyllabusModule, setIsAddingNewSyllabusModule] = useState(false);
  const [syllabusCode, setSyllabusCode] = useState('');
  const [syllabusName, setSyllabusName] = useState('');
  const [syllabusFacultyId, setSyllabusFacultyId] = useState('FAI');
  const [syllabusDeptId, setSyllabusDeptId] = useState('FAI_AUD_TAX');
  const [syllabusAssessMode, setSyllabusAssessMode] = useState('EXAM_BASED');

  // Bulk Syllabus Module Import states
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkCSVText, setBulkCSVText] = useState('');
  const [bulkFacultyId, setBulkFacultyId] = useState('FAI');
  const [bulkDeptId, setBulkDeptId] = useState('FAI_AUD_TAX');
  const [parsedModules, setParsedModules] = useState<{ 
    code: string; 
    name: string; 
    assessmentMode: string; 
    departmentId?: string; 
    lecturerName?: string; 
    isExitLevel?: boolean;
    status: 'VALID' | 'INVALID'; 
    reason?: string;
    onboardingStatus?: 'LINKED' | 'NEW_ACCOUNT' | 'SKIPPED_MISSING_EMAIL' | 'SKIPPED_MISSING_NAME' | 'NONE';
    parsedLecturerName?: string;
    parsedLecturerEmail?: string;
    onboardingReason?: string;
  }[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'xlsx' || fileType === 'xls') {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          setBulkCSVText(csv);
          setBulkError('');
        } catch (err: any) {
          setBulkError(`Error reading Excel file: ${err.message || err}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileType === 'csv') {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setBulkCSVText(text);
        setBulkError('');
      };
      reader.readAsText(file);
    } else {
      setBulkError('Unsupported file type. Please upload a .csv or .xlsx template.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadModuleTemplateCSV = () => {
    const headers = "Code,Name,AssessmentMode,DepartmentCode,LecturerEmailOrName,ExitLevel\n";
    const exampleRow = "EXAMPLE - TAX402,EXAMPLE - Advanced Corporate Taxation,EXAMPLE - PROJECT_BASED,EXAMPLE - AUD_TAX,EXAMPLE - Dr. Alexander Wright,YES\n";
    const blankRows = Array(10).fill(",,,,,").join("\n");
    const content = headers + exampleRow + blankRows;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Academic_Module_Syllabus_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadModuleTemplateXLSX = () => {
    const headers = ["Code", "Name", "AssessmentMode", "DepartmentCode", "LecturerEmailOrName", "ExitLevel"];
    const exampleRow = [
      "EXAMPLE - TAX402",
      "EXAMPLE - Advanced Corporate Taxation",
      "EXAMPLE - PROJECT_BASED",
      "EXAMPLE - AUD_TAX",
      "EXAMPLE - Dr. Alexander Wright",
      "YES"
    ];
    const data = [headers, exampleRow];
    for (let i = 0; i < 10; i++) {
      data.push(["", "", "", "", "", ""]);
    }
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Syllabus Template");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Academic_Module_Syllabus_Template.xlsx");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form states
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDeptId, setNewDeptId] = useState('FAI_AUD_TAX');
  const [newAssessMode, setNewAssessMode] = useState<any>('EXAM_BASED');
  const [newLecturerName, setNewLecturerName] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [newIsExitLevel, setNewIsExitLevel] = useState(false);

  // Load modules in real time
  useEffect(() => {
    const unsubscribeModules = subscribeToModules((data) => {
      const filtered = filterModulesByScope(data, profile);
      setModules(filtered);
      setLoading(false);
    });

    const unsubscribeUsers = subscribeToUsers((data) => {
      setStaffList(data);
    });

    const unsubscribeDeptGuidelines = subscribeToDepartmentGuidelines((data) => {
      setDepartmentGuidelines(data || []);
    });

    return () => {
      unsubscribeModules();
      unsubscribeUsers();
      unsubscribeDeptGuidelines();
    };
  }, [profile]);

  // Sync state with selected simulated role values
  useEffect(() => {
    if (profile?.role === 'HOD') {
      const hodDept = DEPARTMENTS.find(d => d.facultyId === 'FAI') || DEPARTMENTS[0];
      setSelectedDeptId(hodDept.id);
      setSelectedFacultyId(hodDept.facultyId);
      setNewDeptId(hodDept.id);
    } else if (profile?.role === 'DEPUTY_DEAN' || profile?.role === 'EXECUTIVE_DEAN') {
      const deanFac = FACULTIES.find(f => f.id === 'FAI') || FACULTIES[0];
      setSelectedFacultyId(deanFac.id);
      const firstDept = DEPARTMENTS.find(d => d.facultyId === deanFac.id);
      if (firstDept) {
        setSelectedDeptId(firstDept.id);
        setNewDeptId(firstDept.id);
      }
    }
  }, [profile?.role]);

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

      setDeptGuidelinesToast(`Successfully uploaded guidelines for ${deptItem.name}!`);
    } catch (err) {
      console.error(err);
      setDeptGuidelinesToast("Error uploading department guidelines.");
    }
    setTimeout(() => setDeptGuidelinesToast(null), 3000);
  };

  const handleDeptGuidelinesDelete = async (deptId: string) => {
    try {
      const deptItem = DEPARTMENTS.find(d => d.id === deptId);
      await deleteDepartmentGuidelines(deptId);
      setDeptGuidelinesToast(`Successfully removed guidelines for ${deptItem?.name || deptId}`);
    } catch (err) {
      console.error(err);
      setDeptGuidelinesToast("Error deleting guidelines.");
    }
    setTimeout(() => setDeptGuidelinesToast(null), 3000);
  };

  // Read pre-assigned lists
  const currentDeptPresets = PREASSIGNED_MODULES[newDeptId] || [];

  const handleCreateOrUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    // Ensure authorization
    if (profile?.role !== 'HOD') {
      setFormError('Only the Head of Department (HOD) is authorized to assign lecturers to module codes.');
      return;
    }

    if (!newCode.trim() || !newName.trim()) {
      setFormError('Please select a pre-assigned module code from the dropdown.');
      return;
    }

    const lecturerList = newLecturerName.trim() ? [newLecturerName.trim()] : [];

    try {
      if (editingModuleId) {
        await updateModule(editingModuleId, {
          code: newCode,
          name: newName,
          departmentId: newDeptId,
          assessmentMode: newAssessMode,
          lecturerUids: lecturerList,
          isExitLevel: newIsExitLevel
        });
        setSuccessMsg(`Module ${newCode} updating assignment to ${newLecturerName || 'Unassigned'} successfully.`);
      } else {
        // Prevent duplicate link in the active list
        const exists = modules.find(m => m.code.toUpperCase() === newCode.toUpperCase());
        if (exists) {
          setFormError(`Module with code ${newCode} has already been linked.`);
          return;
        }

        await addModule({
          code: newCode,
          name: newName,
          departmentId: newDeptId,
          lecturerUids: lecturerList,
          complianceStatus: 'PENDING',
          assessmentMode: newAssessMode,
          isExitLevel: newIsExitLevel
        });
        setSuccessMsg(`Module ${newCode} registered & successfully linked to ${newLecturerName || 'Unassigned'}.`);
      }

      // Reset form
      setNewCode('');
      setNewName('');
      setNewLecturerName('');
      setNewIsExitLevel(false);
      setEditingModuleId(null);
      setIsAddingModule(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(`Failed to save: ${err.message || err}`);
    }
  };

  const handleCreateSyllabusModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!syllabusCode.trim() || !syllabusName.trim()) {
      setFormError('Please specify both Module Code and Module Name.');
      return;
    }

    try {
      const codeUpper = syllabusCode.trim().toUpperCase();
      const exists = modules.find(m => m.code.toUpperCase() === codeUpper);
      if (exists) {
        setFormError(`A module with code ${codeUpper} has already been configured in curriculum records.`);
        return;
      }

      await addModule({
        code: codeUpper,
        name: syllabusName.trim(),
        departmentId: syllabusDeptId,
        lecturerUids: [],
        complianceStatus: 'PENDING',
        assessmentMode: syllabusAssessMode as any
      });

      setSuccessMsg(`New module "${codeUpper}" was successfully created & added under department.`);
      setSyllabusCode('');
      setSyllabusName('');
      setIsAddingNewSyllabusModule(false);
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      setFormError(`Syllabus creation failed: ${err.message || err}`);
    }
  };

  const handleCSVParse = () => {
    setBulkError('');
    if (!bulkCSVText.trim()) {
      setBulkError('Please enter some CSV list text first.');
      return;
    }

    const lines = bulkCSVText.split('\n');
    const records: typeof parsedModules = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.toLowerCase().startsWith('code,') || line.toLowerCase().startsWith('modulecode,')) {
        continue;
      }

      const parts = line.split(',');
      const code = parts[0]?.trim().toUpperCase();
      const name = parts[1]?.trim();
      let mode = parts[2]?.trim().toUpperCase() || 'EXAM_BASED';
      const deptCodeInput = parts[3]?.trim();
      const lecturerInput = parts[4]?.trim() || '';
      const exitLevelInput = parts[5]?.trim().toUpperCase() || 'NO';

      if (!['EXAM_BASED', 'CONTINUOUS_ASSESSMENT', 'PROJECT_BASED'].includes(mode)) {
        mode = 'EXAM_BASED';
      }

      // Resolve department ID from code or name if provided
      let resolvedDeptId = '';
      if (deptCodeInput) {
        const foundDept = DEPARTMENTS.find(d => 
          d.code.toUpperCase() === deptCodeInput.toUpperCase() || 
          d.id.toUpperCase() === deptCodeInput.toUpperCase()
        );
        if (foundDept) {
          resolvedDeptId = foundDept.id;
        }
      }

      const isExitLevel = exitLevelInput === 'YES';

      // Parse lecturer name and email
      let onboardingStatus: 'LINKED' | 'NEW_ACCOUNT' | 'SKIPPED_MISSING_EMAIL' | 'SKIPPED_MISSING_NAME' | 'NONE' = 'NONE';
      let parsedLecturerName = '';
      let parsedLecturerEmail = '';
      let onboardingReason = '';

      if (lecturerInput) {
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        const emailMatch = lecturerInput.match(emailRegex);
        const email = emailMatch ? emailMatch[1].trim() : '';

        let staffName = lecturerInput;
        if (email) {
          staffName = lecturerInput.replace(email, '');
        }
        staffName = staffName.replace(/[<>()|[\]:;]/g, ' ').replace(/\s+/g, ' ').trim();

        if (email && staffName) {
          parsedLecturerName = staffName;
          parsedLecturerEmail = email;
          const alreadyExists = staffList.some(s => s.email?.toLowerCase() === email.toLowerCase());
          if (alreadyExists) {
            onboardingStatus = 'LINKED';
            onboardingReason = 'Account exists (will link, no duplicate created)';
          } else {
            onboardingStatus = 'NEW_ACCOUNT';
            onboardingReason = 'New account (will create and dispatch welcome email)';
          }
        } else if (email && !staffName) {
          onboardingStatus = 'SKIPPED_MISSING_NAME';
          onboardingReason = 'Skipped onboarding: Missing staff full name';
        } else {
          onboardingStatus = 'SKIPPED_MISSING_EMAIL';
          onboardingReason = 'Skipped onboarding: Missing staff email address';
        }
      }

      if (!code || !name) {
        records.push({
          code: code || 'UNKNOWN',
          name: name || 'Malformed descriptor',
          assessmentMode: mode,
          status: 'INVALID',
          reason: 'Missing Code or Name'
        });
      } else if (code.length < 3) {
        records.push({
          code,
          name,
          assessmentMode: mode,
          status: 'INVALID',
          reason: 'Code is too short (min 3 chars)'
        });
      } else {
        records.push({
          code,
          name,
          assessmentMode: mode,
          departmentId: resolvedDeptId || undefined,
          lecturerName: lecturerInput || undefined,
          isExitLevel,
          status: 'VALID',
          onboardingStatus,
          parsedLecturerName: parsedLecturerName || undefined,
          parsedLecturerEmail: parsedLecturerEmail || undefined,
          onboardingReason
        });
      }
    }

    setParsedModules(records);
  };

  const handleExecuteBulkInjection = async () => {
    setFormError('');
    setSuccessMsg('');
    setBulkError('');
    const validRecords = parsedModules.filter(r => r.status === 'VALID');
    if (validRecords.length === 0) {
      setBulkError('No valid module records found to inject.');
      return;
    }

    try {
      let insertedCount = 0;
      let newAccountsCount = 0;
      let duplicateAccountsCount = 0;
      const skippedOnboardingRows: string[] = [];

      for (const rec of validRecords) {
        const alreadyExists = modules.some(m => m.code.toUpperCase() === rec.code);
        if (alreadyExists) continue;

        let lecturerVal: string[] = [];

        if (rec.onboardingStatus === 'NEW_ACCOUNT' && rec.parsedLecturerName && rec.parsedLecturerEmail) {
          const alreadyHasAccount = staffList.some(s => s.email?.toLowerCase() === rec.parsedLecturerEmail!.toLowerCase());
          if (!alreadyHasAccount) {
            await addStaffMember({
              displayName: rec.parsedLecturerName,
              email: rec.parsedLecturerEmail,
              role: 'LECTURER',
              departmentId: rec.departmentId || bulkDeptId
            });
            newAccountsCount++;
          } else {
            duplicateAccountsCount++;
          }
          lecturerVal = [rec.parsedLecturerName];
        } else if (rec.onboardingStatus === 'LINKED' && rec.parsedLecturerName) {
          duplicateAccountsCount++;
          lecturerVal = [rec.parsedLecturerName];
        } else if (rec.onboardingStatus === 'SKIPPED_MISSING_EMAIL' && rec.lecturerName) {
          skippedOnboardingRows.push(`Module ${rec.code}: "${rec.lecturerName}" missing email`);
          lecturerVal = [rec.lecturerName];
        } else if (rec.onboardingStatus === 'SKIPPED_MISSING_NAME' && rec.lecturerName) {
          skippedOnboardingRows.push(`Module ${rec.code}: "${rec.lecturerName}" missing name`);
          lecturerVal = [rec.lecturerName];
        } else if (rec.lecturerName) {
          lecturerVal = [rec.lecturerName];
        }

        await addModule({
          code: rec.code,
          name: rec.name,
          departmentId: rec.departmentId || bulkDeptId,
          lecturerUids: lecturerVal,
          complianceStatus: 'PENDING',
          assessmentMode: rec.assessmentMode as any,
          isExitLevel: !!rec.isExitLevel
        });
        insertedCount++;
      }

      let completeSuccessMsg = `Bulk uploaded and registered ${insertedCount} new academic modules with allocations!`;
      if (newAccountsCount > 0) {
        completeSuccessMsg += ` Registered & sent welcome emails to ${newAccountsCount} new staff accounts.`;
      }
      if (duplicateAccountsCount > 0) {
        completeSuccessMsg += ` Skipped creating duplicate accounts for ${duplicateAccountsCount} lecturer(s) who already exist.`;
      }
      if (skippedOnboardingRows.length > 0) {
        completeSuccessMsg += ` Skipped creating accounts for ${skippedOnboardingRows.length} lecturer(s) due to missing name/email: ${skippedOnboardingRows.join(', ')}.`;
      }

      setSuccessMsg(completeSuccessMsg);
      setBulkCSVText('');
      setParsedModules([]);
      setIsBulkImporting(false);
      setTimeout(() => setSuccessMsg(''), skippedOnboardingRows.length > 0 ? 15000 : 8000);
    } catch (err: any) {
      setBulkError(`Bulk insertion failed mid-process: ${err.message || err}`);
    }
  };

  const startEdit = (m: Module) => {
    setEditingModuleId(m.id);
    setNewCode(m.code);
    setNewName(m.name);
    setNewDeptId(m.departmentId);
    setNewAssessMode(m.assessmentMode || 'EXAM_BASED');
    setNewLecturerName(m.lecturerUids[0] || '');
    setNewIsExitLevel(m.isExitLevel || false);
    setIsAddingModule(true);
    setFormError('');
  };

  // Helper groupings
  const filteredDepts = DEPARTMENTS.filter(d => d.facultyId === selectedFacultyId);
  const selectedFaculty = FACULTIES.find(f => f.id === selectedFacultyId);
  const selectedDept = DEPARTMENTS.find(d => d.id === selectedDeptId);

  // Group modules by department or filter depending on perspective
  const displayedModules = modules.filter(m => {
    const matchesSearch = m.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (profile?.role === 'HOD') {
      // HoD sees all modules in their specific department
      return m.departmentId === selectedDeptId && matchesSearch;
    } else {
      // Deans, DVC, Quality officers see global scope or filtered by selected department
      return m.departmentId === selectedDeptId && matchesSearch;
    }
  });

  // Find users assigned to this specific department
  const departmentStaff = staffList.filter(user => 
    user.departmentId === newDeptId || 
    user.departmentId === selectedDeptId || 
    user.role === 'LECTURER'
  );

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-subtle-foreground font-bold uppercase tracking-widest text-[10px]">Loading topology maps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Governance Level Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded-md flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Departmental Mapping Control
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight">
            Academic <span className="text-indigo-500">Topology & Links</span>
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            Link and allocate pre-assigned modules and course components to departmental lecturers.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {profile?.role === 'FACULTY_ADMIN' && (
            <>
              <button 
                onClick={() => {
                  setIsAddingNewSyllabusModule(!isAddingNewSyllabusModule);
                  setIsBulkImporting(false);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/15 active:scale-95 border border-border-subtle"
              >
                <Plus className="w-4 h-4" /> Create Custom Module
              </button>
              <button 
                onClick={() => {
                  setIsBulkImporting(!isBulkImporting);
                  setIsAddingNewSyllabusModule(false);
                }}
                className="flex items-center gap-2 bg-surface-2 text-foreground/90 hover:text-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-surface-2 transition border border-border active:scale-95"
              >
                <FolderPlus className="w-4 h-4" /> Bulk Import
              </button>
            </>
          )}

          {/* Action button based on rules: only HOD can assign lecturers to modules */}
          {profile?.role === 'HOD' ? (
            <button 
              onClick={() => {
                setEditingModuleId(null);
                setNewCode('');
                setNewName('');
                setNewLecturerName('');
                setNewIsExitLevel(false);
                setNewDeptId(selectedDeptId);
                setIsAddingModule(!isAddingModule);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/15 active:scale-95 border border-border-subtle"
            >
              <Plus className="w-4 h-4" /> Link Module Code
            </button>
          ) : !['FACULTY_ADMIN', 'HOD'].includes(profile?.role || '') && (
            <div className="text-right">
              <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Access Mode</p>
              <span className="text-xs font-extrabold text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/20 px-3 py-1.5 rounded-lg inline-block mt-1">
                {profile?.role || 'VIEWER'} VIEW
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info card if Faculty Admin accesses module links */}
      {profile?.role === 'FACULTY_ADMIN' && (
        <div className="p-5 bg-gradient-to-r from-indigo-950/40 to-surface border border-indigo-500/20 text-foreground/80 rounded-2xl text-xs font-medium leading-relaxed space-y-2">
          <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" /> Faculty Administrator Curriculum Controls Active
          </h4>
          <p>
            As a **Faculty Administrator**, you have permission to upload and create custom modules within different faculties and departments. Once created, the respective **Head of Department (HOD)** can allocate academic lecturers to those modules.
          </p>
        </div>
      )}

      {/* Faculty Administrator: Custom Syllabus Module Creator Form */}
      <AnimatePresence>
        {isAddingNewSyllabusModule && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8 animate-in slide-in-from-top-4 duration-300"
          >
            <div className="glass-card p-6 md:p-8 bg-surface border border-indigo-500/20 rounded-2xl relative">
              <h3 className="text-lg font-black text-foreground tracking-tight mb-4 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" /> Create Custom Syllabus Module
              </h3>
              
              <form onSubmit={handleCreateSyllabusModule} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Module Code *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PRG311"
                    className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={syllabusCode}
                    onChange={(e) => setSyllabusCode(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Module Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Advanced Technical Programming"
                    className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={syllabusName}
                    onChange={(e) => setSyllabusName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Assessment Scheme</label>
                  <select 
                    className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-950"
                    value={syllabusAssessMode}
                    onChange={(e) => setSyllabusAssessMode(e.target.value)}
                  >
                    {ASSESSMENT_MODES.map(item => (
                      <option key={item.value} value={item.value} className="text-slate-900 font-semibold">{item.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Target Faculty</label>
                  <select 
                    className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-950"
                    value={syllabusFacultyId}
                    onChange={(e) => {
                      setSyllabusFacultyId(e.target.value);
                      const fDepts = DEPARTMENTS.filter(d => d.facultyId === e.target.value);
                      if (fDepts.length > 0) setSyllabusDeptId(fDepts[0].id);
                    }}
                  >
                    {FACULTIES.map(f => (
                      <option key={f.id} value={f.id} className="text-slate-900 font-semibold">{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Target Department</label>
                  <select 
                    className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-950"
                    value={syllabusDeptId}
                    onChange={(e) => setSyllabusDeptId(e.target.value)}
                  >
                    {DEPARTMENTS.filter(d => d.facultyId === syllabusFacultyId).map(dept => (
                      <option key={dept.id} value={dept.id} className="text-slate-900 font-semibold">{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-3 md:col-span-1">
                  <button 
                    type="submit"
                    className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-foreground font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer"
                  >
                    Create Module Record
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingNewSyllabusModule(false)}
                    className="py-3 px-4 bg-surface-tint hover:bg-surface-tint-strong text-muted-foreground hover:text-foreground font-black text-[10px] uppercase tracking-widest rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {formError && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 animate-pulse">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Faculty Administrator: Bulk Syllabus Importer Form */}
      <AnimatePresence>
        {isBulkImporting && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8 animate-in slide-in-from-top-4 duration-300"
          >
            <div className="glass-card p-6 md:p-8 bg-surface border border-indigo-500/20 rounded-2xl" id="bulk-module-importer-panel">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-indigo-500/10">
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" /> Offline Syllabus & Allocation Template Handler
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Download custom templates, populate academic allocations offline in Excel/CSV, and re-upload here.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadModuleTemplateCSV}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl transition active:scale-95 cursor-pointer"
                    id="btn-download-module-template-csv"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Template (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadModuleTemplateXLSX}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl transition active:scale-95 cursor-pointer"
                    id="btn-download-module-template-xlsx"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Download Template (.xlsx)
                  </button>
                </div>
              </div>

              {/* Instructions Box */}
              <div className="p-4 bg-surface-2 border border-indigo-500/10 rounded-xl mb-6 text-xs text-foreground/80 space-y-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-start gap-2.5">
                  <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-black text-[10px] uppercase tracking-widest text-amber-300">CRITICAL REQUIREMENT: DELETE EXAMPLE ROW BEFORE UPLOAD</span>
                    <p className="font-semibold text-[10px] normal-case text-foreground/80 mt-1 leading-relaxed">
                      Both templates (.csv & .xlsx) contain exactly ONE header-labeled instruction row prefixed with <code className="text-amber-400 font-mono font-bold">"EXAMPLE - "</code> to guide your data entry. You <span className="text-amber-300 font-black underline">MUST</span> completely delete this example row from your file before saving and importing your real module records.
                    </p>
                  </div>
                </div>

                 <span className="font-extrabold uppercase text-[10px] text-indigo-400 tracking-wider block">Template Column Guidelines:</span>
                <p>
                  1. <strong className="text-foreground">Code</strong>: Unique Module Code (e.g. TAX402, SYS313).
                  <br />
                  2. <strong className="text-foreground">Name</strong>: Dynamic syllabus title.
                  <br />
                  3. <strong className="text-foreground">AssessmentMode</strong>: Choose from <code className="text-indigo-300 font-mono text-[10px]">EXAM_BASED</code>, <code className="text-indigo-300 font-mono text-[10px]">CONTINUOUS_ASSESSMENT</code>, or <code className="text-indigo-300 font-mono text-[10px]">PROJECT_BASED</code>.
                  <br />
                  4. <strong className="text-foreground">DepartmentCode</strong> (Optional): Target registry (e.g. <code className="font-mono text-emerald-400">AUD_TAX</code>, <code className="font-mono text-emerald-400">MGT_ACC</code>, <code className="font-mono text-emerald-400">FIN_ACC</code>, <code className="font-mono text-emerald-400">INF_TECH</code>, <code className="font-mono text-emerald-400">INF_SYS</code>, <code className="font-mono text-emerald-400">INF_ICM</code>). If empty, the dropdown below will apply.
                  <br />
                  5. <strong className="text-foreground">LecturerEmailOrName</strong> (Optional): Email or custom name of the staff member allocated to the module. If matches our registry email, profile link will be automated.
                  <br />
                  6. <strong className="text-foreground">ExitLevel</strong> (Optional): Enter <code className="font-mono text-amber-400">YES</code> or <code className="font-mono text-amber-400">NO</code>. Denotes if module is exit-level (requires both internal & external moderation). Defaults to NO.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Fallback Faculty (When empty in CSV)</label>
                  <select 
                    className="w-full bg-surface-2 p-3 text-xs font-black text-foreground border border-border rounded-xl text-slate-950"
                    value={bulkFacultyId}
                    onChange={(e) => {
                      setBulkFacultyId(e.target.value);
                      const fDepts = DEPARTMENTS.filter(d => d.facultyId === e.target.value);
                      if (fDepts.length > 0) setBulkDeptId(fDepts[0].id);
                    }}
                  >
                    {FACULTIES.map(f => (
                      <option key={f.id} value={f.id} className="text-slate-900 font-semibold">{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Fallback Department (When empty in CSV)</label>
                  <select 
                    className="w-full bg-surface-2 p-3 text-xs font-black text-foreground border border-border rounded-xl text-slate-950"
                    value={bulkDeptId}
                    onChange={(e) => setBulkDeptId(e.target.value)}
                  >
                    {DEPARTMENTS.filter(d => d.facultyId === bulkFacultyId).map(dept => (
                      <option key={dept.id} value={dept.id} className="text-slate-900 font-semibold">{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2",
                    isDragging 
                      ? "border-indigo-500 bg-indigo-500/10 text-foreground" 
                      : "border-border hover:border-indigo-500/50 bg-foreground/[0.02] hover:bg-foreground/[0.04] text-muted-foreground hover:text-foreground/90"
                  )}
                  id="bulk-module-file-dropzone"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-indigo-400" />
                  <p className="text-xs font-black uppercase tracking-wider">Drag & Drop .csv or .xlsx template here</p>
                  <p className="text-[10px] text-subtle-foreground">or click to browse your local computer files</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Syllabus Import Data list (Paste Offline CSV Content below)</label>
                  <textarea 
                    className="w-full bg-surface-tint border border-border rounded-xl p-4 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[140px]"
                    placeholder="Code,Name,AssessmentMode,DepartmentCode,LecturerEmailOrName,ExitLevel&#10;TAX402,Advanced Corporate Taxation,PROJECT_BASED,AUD_TAX,Dr. Alexander Wright,YES&#10;PRG201,Technical Programming 2,CONTINUOUS_ASSESSMENT,INF_TECH,john.doe@university.ac.za,NO"
                    value={bulkCSVText}
                    onChange={(e) => setBulkCSVText(e.target.value)}
                    id="csv-module-import-input-field"
                  />
                  <p className="text-[10px] text-subtle-foreground">
                    Allows direct re-upload and allocation of code, assessment modes, department categories, and faculty personnel.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button 
                  type="button" 
                  onClick={handleCSVParse}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                  id="btn-analyze-module-csv"
                >
                  Analyze & Parse List
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsBulkImporting(false); setParsedModules([]); }}
                  className="px-5 py-3 bg-surface-tint text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                  id="btn-cancel-module-csv"
                >
                  Cancel
                </button>
              </div>

              {bulkError && (
                <p className="text-rose-400 font-bold text-xs mt-3 uppercase tracking-wider">{bulkError}</p>
              )}

              {parsedModules.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Ready to Inject ({parsedModules.filter(r => r.status === 'VALID').length} Valid records)</h4>
                  <div className="border border-border-subtle rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-tint font-black uppercase text-[10px] text-subtle-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left">Code</th>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Ass. Scheme</th>
                          <th className="px-3 py-2 text-left">Department</th>
                          <th className="px-3 py-2 text-left">Lecturer Assigned</th>
                          <th className="px-3 py-2 text-left">Exit Level</th>
                          <th className="px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedModules.map((rec, idx) => {
                          const resolvedDeptDetails = DEPARTMENTS.find(d => d.id === rec.departmentId);
                          return (
                            <tr key={idx} className={rec.status === 'VALID' ? 'hover:bg-foreground/[0.01]' : 'bg-rose-500/5'}>
                              <td className="px-4 py-2 font-mono text-foreground font-bold">{rec.code}</td>
                              <td className="px-4 py-2 text-foreground/80">{rec.name}</td>
                              <td className="px-4 py-2 text-subtle-foreground">{rec.assessmentMode}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {resolvedDeptDetails ? (
                                  <span className="text-emerald-400 font-semibold">{resolvedDeptDetails.code}</span>
                                ) : (
                                  <span className="text-subtle-foreground italic">Fallback Dept</span>
                                )}
                              </td>
                              <td className="px-3 py-2 space-y-1">
                                <div className="text-indigo-300 font-medium italic">{rec.lecturerName || 'None'}</div>
                                {rec.onboardingStatus === 'LINKED' && (
                                  <span className="inline-flex items-center text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                                    ✓ Linked (Registry Match)
                                  </span>
                                )}
                                {rec.onboardingStatus === 'NEW_ACCOUNT' && (
                                  <span className="inline-flex items-center text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                                    ✦ Will Auto-Register & Email
                                  </span>
                                )}
                                {rec.onboardingStatus === 'SKIPPED_MISSING_EMAIL' && (
                                  <span className="inline-flex items-center text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                                    ⚠ Registry Skipped: Missing Email
                                  </span>
                                )}
                                {rec.onboardingStatus === 'SKIPPED_MISSING_NAME' && (
                                  <span className="inline-flex items-center text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                                    ⚠ Registry Skipped: Missing Name
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {rec.isExitLevel ? (
                                  <span className="text-[9px] bg-amber-500/15 text-amber-400 font-extrabold tracking-wider px-2 py-0.5 rounded border border-amber-500/20">YES</span>
                                ) : (
                                  <span className="text-[9px] text-subtle-foreground font-medium">NO</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {rec.status === 'VALID' ? (
                                  <span className="text-emerald-400 font-bold">✓ READY</span>
                                ) : (
                                  <span className="text-rose-400 font-bold">✗ {rec.reason}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={handleExecuteBulkInjection}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition active:scale-95"
                    >
                      Execute Inject into Database
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification Bar */}
      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Add / edit module card container */}
      <AnimatePresence>
        {isAddingModule && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 md:p-8 bg-surface border border-indigo-500/20 rounded-2xl relative mb-8">
              <h3 className="text-lg font-black text-foreground tracking-tight mb-4 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                {editingModuleId ? 'Modify Lecturer Assignment' : 'Assign Lecturer to Pre-assigned Module'}
              </h3>
              
              <form onSubmit={handleCreateOrUpdateModule} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Pre-assigned Module <span className="text-indigo-400">*</span></label>
                  {editingModuleId ? (
                    <div className="w-full px-4 py-3 bg-surface-tint border border-border rounded-xl text-foreground/80 font-extrabold text-sm uppercase">
                      {newCode} - {newName}
                    </div>
                  ) : (
                    <select 
                      className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={`${newCode}|${newName}|${newAssessMode}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const [code, name, mode] = val.split('|');
                          setNewCode(code);
                          setNewName(name);
                          setNewAssessMode(mode);
                        } else {
                          setNewCode('');
                          setNewName('');
                        }
                      }}
                    >
                      <option value="" className="text-slate-900">Choose Academic Module...</option>
                      {currentDeptPresets.map((p) => (
                        <option 
                          key={p.code} 
                          value={`${p.code}|${p.name}|${p.assessmentMode}`}
                          className="text-slate-900 font-semibold"
                        >
                          {p.code} - {p.name}
                        </option>
                      ))}
                      {currentDeptPresets.length === 0 && (
                        <option value="" disabled className="text-muted-foreground">No master templates configured for this dept</option>
                      )}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Department Assignment</label>
                  <div className="w-full px-4 py-3 bg-surface-tint border border-border rounded-xl text-muted-foreground font-bold text-xs uppercase select-none">
                    {selectedDept?.name || 'Selected Node'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Assessment Scheme</label>
                  <div className="w-full px-4 py-3 bg-surface-tint border border-border rounded-xl text-muted-foreground font-bold text-xs uppercase select-none">
                    {ASSESSMENT_MODES.find(m => m.value === newAssessMode)?.label || 'Exam Based'}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Assigned Lecturer <span className="text-indigo-400">*</span></label>
                  <select 
                    className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={newLecturerName}
                    onChange={(e) => setNewLecturerName(e.target.value)}
                  >
                    <option value="" className="text-slate-900">Select Lecturer to Associate...</option>
                    {departmentStaff.map(st => (
                      <option key={st.uid || st.email} value={st.displayName || st.name} className="text-slate-900 font-semibold">
                        {st.displayName || st.name} ({st.email})
                      </option>
                    ))}
                    {/* Seamless safe fallbacks */}
                    <option value="Mr. A" className="text-slate-900">Mr. A</option>
                    <option value="Prof. B" className="text-slate-900">Prof. B</option>
                    <option value="Dr. Sarah Jenkins" className="text-slate-900">Dr. Sarah Jenkins</option>
                  </select>
                  <p className="text-[10px] text-subtle-foreground mt-1.5 leading-relaxed">
                    * The directory above lists the lecturers currently assigned to this department by the Faculty Administrator.
                  </p>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Exit Level Flag</label>
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-tint border border-border rounded-xl h-[46px] select-none">
                    <span className="text-xs font-bold text-foreground/80">Exit Level Module?</span>
                    <label className={cn(
                      "relative inline-flex items-center",
                      profile?.role === 'HOD' ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                    )}>
                      <input 
                        type="checkbox"
                        checked={newIsExitLevel}
                        onChange={(e) => setNewIsExitLevel(e.target.checked)}
                        disabled={profile?.role !== 'HOD'}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-white peer-checked:bg-indigo-600 peer-checked:after:border-indigo-500"></div>
                    </label>
                  </div>
                  <p className="text-[10px] text-subtle-foreground mt-1.5 leading-relaxed">
                    {profile?.role === 'HOD'
                      ? "Set this flag to require both internal and external moderation reports."
                      : "Requires both internal and external moderation reports (Only HOD can toggle this)."}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 md:col-span-3 border-t border-border-subtle pt-4 mt-2">
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-foreground font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors duration-150 active:scale-95 border border-border-subtle cursor-pointer"
                  >
                    {editingModuleId ? 'Save Changes' : 'Confirm & Allocate'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingModule(false);
                      setEditingModuleId(null);
                    }}
                    className="px-6 py-2.5 bg-surface-tint hover:bg-surface-tint-strong text-muted-foreground hover:text-foreground font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {formError && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" />
                  {formError}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Faculty & Department Directory Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-border-subtle pb-3">
              <Compass className="w-4 h-4 text-indigo-400" /> Academic Boundaries
            </h4>

            {/* Faculty List (Disabled/Locked if role is HoD to prevent boundary confusion) */}
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Selected Faculty</label>
                {profile?.role === 'HOD' ? (
                  <div className="px-4 py-3 bg-surface-tint border border-border rounded-xl text-xs font-bold text-foreground uppercase tracking-wider">
                    {selectedFaculty?.name || 'Informatics & Design'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {FACULTIES.map(fac => (
                      <button
                        key={fac.id}
                        onClick={() => {
                          setSelectedFacultyId(fac.id);
                          const deptsInFac = DEPARTMENTS.filter(d => d.facultyId === fac.id);
                          if (deptsInFac.length > 0) {
                            setSelectedDeptId(deptsInFac[0].id);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all border text-xs font-black uppercase tracking-wider flex items-center justify-between",
                          selectedFacultyId === fac.id
                            ? "bg-indigo-600/15 border-indigo-500/40 text-foreground"
                            : "bg-surface-tint border-border-subtle hover:border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>{fac.short}</span>
                        {selectedFacultyId === fac.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Department Selector */}
              <div>
                <label className="block text-[9px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Selected Department</label>
                {profile?.role === 'HOD' ? (
                  <div className="px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{selectedDept?.name}</span>
                    <span className="text-[9px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">HoD Room</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredDepts.map(dept => (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDeptId(dept.id)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-xl transition text-[11px] font-bold uppercase tracking-wider flex items-center justify-between border",
                          selectedDeptId === dept.id
                            ? "bg-surface-tint-strong border-foreground/20 text-foreground"
                            : "bg-transparent border-transparent text-subtle-foreground hover:text-foreground/80"
                        )}
                      >
                        <span>{dept.name}</span>
                        <span className="text-[9px] opacity-60">({dept.code})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Perspective Summary Panel */}
          <div className="glass-card p-5 border border-border-subtle bg-gradient-to-br from-background to-surface">
            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Authority Scope</h5>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-subtle-foreground font-bold uppercase tracking-wide">Role</span>
                <span className="text-foreground font-black uppercase tracking-wider">{profile?.role}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-subtle-foreground font-bold uppercase tracking-wide">Faculty</span>
                <span className="text-foreground/80 font-bold">{selectedFaculty?.short}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-subtle-foreground font-bold uppercase tracking-wide">Dept.</span>
                <span className="text-foreground/80 font-bold">{selectedDept?.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-subtle-foreground font-bold uppercase tracking-wide">Access Action</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                  ['LECTURER', 'HOD'].includes(profile?.role || '') 
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                    : "bg-surface-2 text-muted-foreground border border-border-subtle"
                )}>
                  {['LECTURER', 'HOD'].includes(profile?.role || '') ? 'Upload & View' : 'View Only'}
                </span>
              </div>
            </div>
          </div>

          {/* Department Guidelines Integration Card */}
          <div className="glass-card p-5 border border-border-subtle bg-gradient-to-br from-background to-surface space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Dept Guidelines
              </h5>
              {(() => {
                const currentDeptGuideline = departmentGuidelines.find(g => g.id === selectedDeptId);
                return currentDeptGuideline ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">
                    Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-black uppercase">
                    Missing
                  </span>
                );
              })()}
            </div>

            <div className="bg-surface-tint border border-border-subtle rounded-2xl p-4 space-y-3">
              {(() => {
                const currentDeptGuideline = departmentGuidelines.find(g => g.id === selectedDeptId);
                return currentDeptGuideline ? (
                  <div className="space-y-2 text-left">
                    <div className="flex items-start gap-2 text-xs">
                      <File className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-left">
                        <p className="text-foreground font-bold truncate max-w-[150px]" title={currentDeptGuideline.fileName}>
                          {currentDeptGuideline.fileName}
                        </p>
                        <p className="text-subtle-foreground text-[9px]">
                          Size: {currentDeptGuideline.fileSize}
                        </p>
                      </div>
                    </div>
                    <div className="text-[9px] text-muted-foreground font-bold uppercase space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-subtle-foreground" />
                        <span>Updated: {currentDeptGuideline.updatedAt ? (currentDeptGuideline.updatedAt.toDate ? new Date(currentDeptGuideline.updatedAt.toDate()).toLocaleDateString('en-GB') : new Date(currentDeptGuideline.updatedAt).toLocaleDateString('en-GB')) : 'Recently'}</span>
                      </div>
                      <div>By: <span className="text-foreground/80">{currentDeptGuideline.updatedBy}</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-subtle-foreground text-[10px] font-bold italic text-center py-2">
                    No Guidelines uploaded for this department.
                  </p>
                );
              })()}
            </div>

            {/* Ingestion Hidden Input */}
            <input 
              type="file" 
              ref={deptFileInputRef} 
              className="hidden" 
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && selectedDeptId) {
                  handleDeptGuidelinesUpload(selectedDeptId, e.target.files[0]);
                }
              }}
            />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {(() => {
                const currentDeptGuideline = departmentGuidelines.find(g => g.id === selectedDeptId);
                return (
                  <>
                    {currentDeptGuideline && (
                      <button
                        onClick={() => {
                          setDeptGuidelinesToast(`Downloading guidelines for ${selectedDept?.name || 'Department'}...`);
                          setTimeout(() => setDeptGuidelinesToast(null), 3000);
                        }}
                        className="w-full py-2 bg-surface-tint hover:bg-surface-tint-strong text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest border border-border transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Guidelines
                      </button>
                    )}

                    {profile?.role === 'HOD' && profile?.departmentId === selectedDeptId ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => deptFileInputRef.current?.click()}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            currentDeptGuideline
                              ? "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                              : "bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-lg shadow-indigo-600/15"
                          )}
                        >
                          {currentDeptGuideline ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" /> Replace
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" /> Upload
                            </>
                          )}
                        </button>

                        {currentDeptGuideline && (
                          <button
                            onClick={() => handleDeptGuidelinesDelete(selectedDeptId)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors cursor-pointer"
                            title="Remove guidelines"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>

            {/* Guidelines Toast Notification */}
            {deptGuidelinesToast && (
              <div className="p-2.5 bg-indigo-950/80 border border-indigo-500/20 rounded-xl text-[#a5b4fc] text-[10px] font-bold uppercase tracking-wider text-center animate-pulse">
                {deptGuidelinesToast}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Diagram + Allocation Management Inventory */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Visual Topology Diagram */}
          <div className="glass-card p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-background via-surface to-background">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Layers className="w-56 h-56 text-indigo-500" />
            </div>

            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-1.5 pb-3 border-b border-border-subtle">
              <Activity className="w-4 h-4 text-emerald-400" /> Linked Boundary Topology
            </h4>

            {/* Hierarchical Connections Diagram */}
            <div className="flex flex-col md:flex-row items-center justify-around gap-4 md:gap-2">
              
              {/* Faculty Node */}
              <div className="w-full md:w-1/4 p-4 rounded-2xl bg-surface-tint border border-border flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest leading-none mb-1">FACULTY BOUNDARY</p>
                <p className="text-xs font-black text-foreground tracking-tight uppercase">{selectedFaculty?.name || 'FID'}</p>
              </div>

              <ArrowRight className="w-5 h-5 text-indigo-500/30 hidden md:block" />

              {/* Department Node */}
              <div className="w-full md:w-1/4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">DEPARTMENT NODE</p>
                <p className="text-xs font-black text-foreground tracking-tight uppercase">{selectedDept?.name || 'CS'}</p>
              </div>

              <ArrowRight className="w-5 h-5 text-indigo-500/30 hidden md:block" />

              {/* Connected Modules Badge Node */}
              <div className="w-full md:w-1/4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">MODULE LINKS</p>
                <p className="text-xs font-black text-foreground tracking-tight uppercase">
                  {displayedModules.length} Codes Active
                </p>
              </div>
            </div>
          </div>

          {/* Module allocation registry list */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-xl font-extrabold text-foreground tracking-tight">
                  {selectedDept?.name} Module Codes
                </h4>
                <p className="text-subtle-foreground text-xs font-bold uppercase tracking-widest mt-1">
                  Active allocation codes inside this organizational node
                </p>
              </div>

              {/* Searching nested */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-foreground" />
                <input 
                  type="text" 
                  placeholder="Filter by code or name..." 
                  className="w-full pl-9 pr-4 py-2 bg-surface-tint border border-border rounded-xl text-xs text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-subtle-foreground"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {displayedModules.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-border-subtle rounded-2xl text-center space-y-3">
                <Compass className="w-12 h-12 text-subtle-foreground mx-auto" />
                <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">No allocated modules found</p>
                <p className="text-subtle-foreground text-xs font-medium">
                  There are no modules linked to the {selectedDept?.name} department matching your criteria.
                </p>
                {['HOD', 'DEPUTY_DEAN', 'EXECUTIVE_DEAN'].includes(profile?.role || '') && (
                  <button 
                    onClick={() => {
                      setIsAddingModule(true);
                      setEditingModuleId(null);
                    }}
                    className="mt-4 px-4 py-2 bg-surface-tint border border-border hover:border-foreground/20 hover:bg-surface-tint-strong text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition"
                  >
                    Allocate first code
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedModules.map((m) => (
                  <motion.div 
                    layout
                    key={m.id}
                    className="p-5 bg-foreground/[0.02] border border-border-subtle rounded-2xl flex flex-col justify-between hover:bg-foreground/[0.04] transition group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-tint flex items-center justify-center text-xs font-black text-indigo-400 tracking-wider">
                            {m.code.substring(0, 3)}
                          </div>
                          <div>
                            <span className="text-xs font-black text-foreground tracking-tight">{m.code}</span>
                            <h5 className="text-sm font-bold text-foreground/80 mt-0.5 line-clamp-1">{m.name}</h5>
                          </div>
                        </div>

                        {/* Edit Action */}
                        {['HOD', 'DEPUTY_DEAN', 'EXECUTIVE_DEAN'].includes(profile?.role || '') && (
                          <button 
                            onClick={() => startEdit(m)}
                            className="p-2 bg-surface-tint rounded-lg opacity-0 group-hover:opacity-100 hover:bg-indigo-600/20 text-muted-foreground hover:text-indigo-400 transition"
                            title="Edit allocation links"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border-subtle">
                        <div className="text-left">
                          <p className="text-[8px] font-black text-subtle-foreground uppercase tracking-widest">Compliance Status</p>
                          <span className={cn(
                            "inline-block text-[9px] font-black uppercase tracking-wider mt-1",
                            m.complianceStatus === 'COMPLIANT' ? "text-emerald-400" : 
                            m.complianceStatus === 'PENDING' ? "text-amber-400" : "text-rose-400"
                          )}>
                            ● {m.complianceStatus}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="text-[8px] font-black text-subtle-foreground uppercase tracking-widest">Assigned Staff</p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-foreground/80">
                            <Users className="w-3.5 h-3.5 text-subtle-foreground" />
                            <span className="text-[10px] uppercase font-black tracking-tight truncate max-w-[100px]">
                              {m.lecturerUids[0] || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border-subtle flex justify-between items-center text-[10px] text-subtle-foreground font-bold uppercase tracking-widest">
                      <span>Method: {m.assessmentMode?.replace('_', ' ') || 'EXAM BASED'}</span>
                      <div className="flex items-center gap-2">
                        {m.isExitLevel && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 text-amber-400 font-black tracking-wider uppercase">
                            Exit Level
                          </span>
                        )}
                        <span className="text-[9px] px-2 py-0.5 bg-surface-tint rounded border border-border-subtle text-muted-foreground font-bold">
                          NQF Level 8
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
