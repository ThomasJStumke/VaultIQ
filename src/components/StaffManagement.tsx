import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Search, 
  Filter, 
  CheckCircle2, 
  ChevronDown,
  ShieldAlert,
  Building2,
  Check,
  Crown,
  Plus,
  AlertCircle,
  Award,
  Download,
  Star,
  FileSpreadsheet,
  Upload,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { filterModulesByScope } from '../permissions.config';
import { motion, AnimatePresence } from 'motion/react';
import { 
  subscribeToUsers, 
  updateUserProfile, 
  addStaffMember,
  subscribeToStudentEvaluations,
  subscribeToModules,
  subscribeToDevelopmentPlans
} from '../services/supabaseService';
import * as XLSX from 'xlsx';

interface StaffMember {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  programme?: string;
  highestQualification?: string;
  dateOfAppointment?: string;
  employmentType?: string;
  status?: 'ACTIVE' | 'PENDING' | 'LOCKED';
  lastActive?: string;
  name?: string; // Fallback
}

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

const OFFICIAL_PROGRAMMES = [
  { code: 'DIP_AUD', name: 'Diploma in Auditing', departmentId: 'FAI_AUD_TAX' },
  { code: 'DIP_TAX', name: 'Diploma in Taxation', departmentId: 'FAI_AUD_TAX' },
  { code: 'DIP_MACC', name: 'Diploma in Management Accounting', departmentId: 'FAI_MGT_ACC' },
  { code: 'DIP_FACC', name: 'Diploma in Financial Accounting', departmentId: 'FAI_FIN_ACC' },
  { code: 'DIP_IT', name: 'Diploma in Information Technology', departmentId: 'FAI_IT' },
  { code: 'DIP_IS', name: 'Diploma in Information Systems', departmentId: 'FAI_IS' },
  { code: 'DIP_ICM', name: 'Diploma in Information Communications Management', departmentId: 'FAI_ICM' },
  { code: 'BSC_CS', name: 'Bachelor of Science in Computer Science', departmentId: 'CS' },
  { code: 'DIP_CIV', name: 'Diploma in Civil Engineering', departmentId: 'CIV' },
  { code: 'DIP_ELE', name: 'Diploma in Electrical Engineering', departmentId: 'ELE' },
  { code: 'DIP_MEC', name: 'Diploma in Mechanical Engineering', departmentId: 'MEC' },
  { code: 'DIP_ACCT', name: 'Diploma in Accountancy', departmentId: 'ACCT' },
  { code: 'DIP_MGT', name: 'Diploma in Management', departmentId: 'MGT' },
  { code: 'DIP_MATH', name: 'Diploma in Mathematics', departmentId: 'MATH' },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'LECTURER', label: 'Lecturer' },
  { value: 'HOD', label: 'Head of Department' },
  { value: 'PROGRAMME_COORDINATOR', label: 'Programme Coordinator' },
  { value: 'FACULTY_ADMIN', label: 'Faculty Administrator' },
  { value: 'DEPUTY_DEAN', label: 'Deputy Dean' },
  { value: 'EXECUTIVE_DEAN', label: 'Executive Dean' },
  { value: 'DVC_TL', label: 'DVC: T&L' },
  { value: 'EXAMS', label: 'Exams Office' },
  { value: 'CQPA', label: 'CQPA' },
  { value: 'QPO', label: 'QPO' },
  { value: 'AUDITOR', label: 'Auditor' },
];

export default function StaffManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Evaluation & Modules States
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [developmentPlans, setDevelopmentPlans] = useState<any[]>([]);
  const [selectedKpiStaff, setSelectedKpiStaff] = useState<any | null>(null);

  // Invitation Form state
  const [isAddingNewStaff, setIsAddingNewStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('LECTURER');
  const [newStaffDept, setNewStaffDept] = useState('');
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormSuccess, setStaffFormSuccess] = useState('');

  // Welcome Email Preview / Test Mode
  const [simulatedEmailRecipient, setSimulatedEmailRecipient] = useState<{ displayName: string; email: string; role: string } | null>(null);

  // Bulk Staff Allocation States
  const [isBulkStaffImporting, setIsBulkStaffImporting] = useState(false);
  const [bulkStaffCSVText, setBulkStaffCSVText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedStaff, setParsedStaff] = useState<{
    displayName: string;
    email: string;
    role: UserRole;
    departmentId: string;
    programme?: string;
    highestQualification?: string;
    dateOfAppointment?: string;
    employmentType?: string;
    status: 'VALID' | 'INVALID';
    reason?: string;
  }[]>([]);
  const [bulkStaffError, setBulkStaffError] = useState('');
  const [bulkStaffSuccess, setBulkStaffSuccess] = useState('');

  const mapSpreadsheetRoleToDbRole = (roleStr: string): UserRole | null => {
    const clean = roleStr.trim().toLowerCase();
    if (clean === 'faculty admin' || clean === 'faculty administrator') return 'FACULTY_ADMIN';
    if (clean === 'lecturer') return 'LECTURER';
    if (clean === 'programme coordinator') return 'PROGRAMME_COORDINATOR';
    if (clean === 'hod' || clean === 'head of department') return 'HOD';
    if (clean === 'deputy dean') return 'DEPUTY_DEAN';
    if (clean === 'executive dean') return 'EXECUTIVE_DEAN';
    if (clean === 'dvc: t&l' || clean === 'dvc_tl' || clean === 'dvc_t&l' || clean === 'dvc: t & l') return 'DVC_TL';
    if (clean === 'qpo') return 'QPO';
    if (clean === 'cqpa') return 'CQPA';
    if (clean === 'auditor') return 'AUDITOR';
    if (clean === 'exams' || clean === 'exams office') return 'EXAMS';
    return null;
  };

  const handleDownloadStaffTemplate = () => {
    const headers = [
      "Name",
      "Email",
      "Role",
      "DepartmentCode",
      "ProgrammeCode",
      "Qualification",
      "AppointmentDate",
      "EmploymentType"
    ];
    
    const exampleRow = [
      "EXAMPLE - Dr. Alexander Wright",
      "EXAMPLE - alex.wright@dut.ac.za",
      "EXAMPLE - Lecturer",
      "EXAMPLE - INF_TECH",
      "EXAMPLE - DIP_IT",
      "EXAMPLE - PhD in Computer Science",
      "EXAMPLE - 2026-01-15",
      "EXAMPLE - Permanent"
    ];
    
    const data = [headers, exampleRow];
    for (let i = 0; i < 10; i++) {
      data.push(["", "", "", "", "", "", "", ""]);
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set explicit date formatting for "AppointmentDate" (column G, 0-indexed index 6)
    for (let r = 2; r < 12; r++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c: 6 });
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { t: 's', v: '' };
      }
      worksheet[cellAddress].z = 'yyyy-mm-dd';
    }
    
    // Filter departments and programmes based on role and faculty/department
    let filteredDepts = DEPARTMENTS;
    let filteredProgs = OFFICIAL_PROGRAMMES;

    if (profile?.role === 'HOD') {
      const deptIds = new Set<string>();
      if (profile.departmentId) {
        deptIds.add(profile.departmentId);
      }
      // Also grab from modules
      modules.forEach(m => {
        if (m.departmentId) {
          deptIds.add(m.departmentId);
        }
      });
      const allowedDeptIds = Array.from(deptIds);
      
      if (allowedDeptIds.length > 0) {
        filteredDepts = DEPARTMENTS.filter(d => allowedDeptIds.includes(d.id));
        filteredProgs = OFFICIAL_PROGRAMMES.filter(p => allowedDeptIds.includes(p.departmentId));
      }
    } else if (profile?.role === 'FACULTY_ADMIN') {
      let facultyId = profile.facultyId;
      if (!facultyId && profile.departmentId) {
        const userDept = DEPARTMENTS.find(d => d.id === profile.departmentId);
        if (userDept) {
          facultyId = userDept.facultyId;
        }
      }
      if (facultyId) {
        filteredDepts = DEPARTMENTS.filter(d => d.facultyId === facultyId);
        const allowedDeptIds = filteredDepts.map(d => d.id);
        filteredProgs = OFFICIAL_PROGRAMMES.filter(p => allowedDeptIds.includes(p.departmentId));
      }
    }

    const deptFormula = `"${filteredDepts.map(d => d.code).join(',')}"`;
    const progFormula = `"${filteredProgs.map(p => p.code).join(',')}"`;

    // Setup dropdown validations in Excel
    worksheet['!dataValidation'] = [
      {
        sqref: 'C3:C25',
        type: 'list',
        formula1: '"Faculty Admin,Lecturer,Programme Coordinator,HOD,Deputy Dean,Executive Dean,DVC: T&L,QPO,CQPA,Auditor,Exams"',
        allowBlank: true
      },
      {
        sqref: 'D3:D25',
        type: 'list',
        formula1: deptFormula,
        allowBlank: true
      },
      {
        sqref: 'E3:E25',
        type: 'list',
        formula1: progFormula,
        allowBlank: true
      },
      {
        sqref: 'H3:H25',
        type: 'list',
        formula1: '"Permanent,Contract"',
        allowBlank: true
      }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Onboarding Template");
    
    // Reference guide sheet
    const refHeaders = ["Category", "Valid Value Code", "Full Name / Description"];
    const refRows: string[][] = [];
    
    // Roles references
    const ROLES_LIST = [
      "Faculty Admin", "Lecturer", "Programme Coordinator", "HOD", "Deputy Dean", "Executive Dean", "DVC: T&L", "QPO", "CQPA", "Auditor", "Exams"
    ];
    ROLES_LIST.forEach(r => refRows.push(["ROLE ACCESS", r, `System permissions mapped to ${r}`]));
    
    // Department references
    filteredDepts.forEach(d => refRows.push(["DEPARTMENT CODE", d.code, d.name]));
    
    // Programme references
    filteredProgs.forEach(p => refRows.push(["ACADEMIC PROGRAMME CODE", p.code, p.name]));
    
    // Permanent/Contract references
    refRows.push(["EMPLOYMENT TYPE", "Permanent", "Permanent full-time staff appointment"]);
    refRows.push(["EMPLOYMENT TYPE", "Contract", "Contract staff appointment"]);
    
    const refWorksheet = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
    XLSX.utils.book_append_sheet(workbook, refWorksheet, "Reference Guide");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "DUT_Academic_Staff_Onboarding_Template.xlsx");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDeptReference = () => {
    const headers = ["Department Code", "Department Name", "Faculty Affiliation"];
    const rows = DEPARTMENTS.map(d => [
      d.code,
      d.name,
      FACULTIES.find(f => f.id === d.facultyId)?.name || 'General Faculty'
    ]);
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Department Codes");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "DUT_Valid_Department_Codes_Reference.xlsx");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseRawRows = (rows: any[][]) => {
    const records: typeof parsedStaff = [];
    
    let rowIndex = 0;
    for (const parts of rows) {
      rowIndex++;
      
      // Ignore empty rows
      if (parts.length === 0 || parts.every(p => p === null || String(p).trim() === '')) {
        continue;
      }
      
      // Detect header row and skip it
      const firstCol = String(parts[0] || '').trim().toLowerCase();
      if (firstCol === 'staff name' || firstCol === 'displayname' || firstCol === 'name') {
        continue;
      }
      
      // Detect and skip EXAMPLE rows
      if (parts.some(p => String(p || '').trim().toUpperCase().startsWith('EXAMPLE -'))) {
        continue;
      }
      
      const rawName = String(parts[0] || '').trim();
      const rawEmail = String(parts[1] || '').trim();
      const rawRole = String(parts[2] || '').trim();
      const rawDeptCode = String(parts[3] || '').trim();
      const rawProgrammeCode = String(parts[4] || '').trim();
      const rawHighestQual = String(parts[5] || '').trim();
      let rawDateOfAppt = String(parts[6] || '').trim();
      const rawEmploymentType = String(parts[7] || '').trim();
      
      // Format date properly if it is a JavaScript Date object (due to XLSX parsing with cellDates: true)
      if (parts[6] instanceof Date) {
        const d = parts[6] as Date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        rawDateOfAppt = `${year}-${month}-${day}`;
      } else if (rawDateOfAppt) {
        // Clean string representation of date if Excel serialized it differently
        const d = new Date(rawDateOfAppt);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          rawDateOfAppt = `${year}-${month}-${day}`;
        }
      }
      
      let isRowValid = true;
      let failReason = '';
      
      // 1. Validate name and email existence
      if (!rawName && !rawEmail) {
        isRowValid = false;
        failReason = `Row ${rowIndex}: Missing both Name and Email address.`;
      } else if (!rawName) {
        isRowValid = false;
        failReason = `Row ${rowIndex}: Missing staff member Full Name.`;
      } else if (!rawEmail) {
        isRowValid = false;
        failReason = `Row ${rowIndex}: Missing staff member Email address.`;
      } else if (!rawEmail.includes('@')) {
        isRowValid = false;
        failReason = `Row ${rowIndex}: Invalid email format ("${rawEmail}").`;
      }
      
      // 2. Map & validate Role
      let mappedRole: UserRole | null = null;
      if (isRowValid) {
        mappedRole = mapSpreadsheetRoleToDbRole(rawRole);
        if (!mappedRole) {
          isRowValid = false;
          failReason = `Row ${rowIndex}: Role "${rawRole}" is not recognized. Must select a valid system role from the dropdown list.`;
        }
      }
      
      // 3. Resolve & validate Department Code
      let resolvedDeptId = '';
      if (isRowValid) {
        const cleanDept = rawDeptCode.toUpperCase();
        const foundDept = DEPARTMENTS.find(d => d.code.toUpperCase() === cleanDept || d.id.toUpperCase() === cleanDept);
        if (!foundDept) {
          isRowValid = false;
          failReason = `Row ${rowIndex}: Department code "${rawDeptCode}" is not recognized. Please use valid codes like INF_TECH or FIN_ACC.`;
        } else {
          resolvedDeptId = foundDept.id;
          
          // Verify scope of department access for downloader
          let isDeptAllowed = true;
          if (profile?.role === 'HOD') {
            const deptIds = new Set<string>();
            if (profile.departmentId) {
              deptIds.add(profile.departmentId);
            }
            modules.forEach(m => {
              if (m.departmentId) {
                deptIds.add(m.departmentId);
              }
            });
            isDeptAllowed = deptIds.has(resolvedDeptId);
          } else if (profile?.role === 'FACULTY_ADMIN') {
            let facultyId = profile.facultyId;
            if (!facultyId && profile.departmentId) {
              const userDept = DEPARTMENTS.find(d => d.id === profile.departmentId);
              if (userDept) facultyId = userDept.facultyId;
            }
            if (facultyId) {
              const allowedDeptIds = DEPARTMENTS.filter(d => d.facultyId === facultyId).map(d => d.id);
              isDeptAllowed = allowedDeptIds.includes(resolvedDeptId);
            }
          }
          
          if (!isDeptAllowed) {
            isRowValid = false;
            failReason = `Row ${rowIndex}: Department code "${rawDeptCode}" is outside your managed scope.`;
          }
        }
      }
      
      // 4. Resolve & Validate ProgrammeCode
      let resolvedProgrammeName = '';
      if (isRowValid) {
        const cleanProg = rawProgrammeCode.toUpperCase();
        const foundProg = OFFICIAL_PROGRAMMES.find(p => p.code.toUpperCase() === cleanProg || p.name.toUpperCase() === cleanProg);
        
        if (mappedRole === 'PROGRAMME_COORDINATOR') {
          if (!rawProgrammeCode) {
            isRowValid = false;
            failReason = `Row ${rowIndex}: Academic ProgrammeCode is required for the Programme Coordinator role to manage module scopes.`;
          } else if (!foundProg) {
            isRowValid = false;
            failReason = `Row ${rowIndex}: ProgrammeCode "${rawProgrammeCode}" is not recognized. Must pick from official programmes.`;
          } else {
            resolvedProgrammeName = foundProg.name;
          }
        } else if (rawProgrammeCode) {
          if (!foundProg) {
            isRowValid = false;
            failReason = `Row ${rowIndex}: ProgrammeCode "${rawProgrammeCode}" is not recognized. Must pick from official programmes or leave blank.`;
          } else {
            resolvedProgrammeName = foundProg.name;
          }
        }
        
        // Also verify the programme belongs to the selected department
        if (isRowValid && foundProg && resolvedDeptId && foundProg.departmentId !== resolvedDeptId) {
          isRowValid = false;
          failReason = `Row ${rowIndex}: ProgrammeCode "${rawProgrammeCode}" belongs to a different department than "${rawDeptCode}".`;
        }
      }
      
      // 5. Validate Date of Appointment
      if (isRowValid && rawDateOfAppt) {
        const d = new Date(rawDateOfAppt);
        if (isNaN(d.getTime())) {
          isRowValid = false;
          failReason = `Row ${rowIndex}: Invalid appointment date "${rawDateOfAppt}". Format must be YYYY-MM-DD.`;
        }
      }
      
      // 6. Validate Employment Type (Permanent / Contract)
      if (isRowValid) {
        const cleanEmp = rawEmploymentType.toLowerCase();
        if (!rawEmploymentType) {
          isRowValid = false;
          failReason = `Row ${rowIndex}: Employment Type is required. Must be exactly 'Permanent' or 'Contract'.`;
        } else if (cleanEmp !== 'permanent' && cleanEmp !== 'contract') {
          isRowValid = false;
          failReason = `Row ${rowIndex}: Employment Type "${rawEmploymentType}" is invalid. Must be exactly 'Permanent' or 'Contract'.`;
        }
      }
      
      // 7. Check duplicates
      if (isRowValid) {
        const duplicateExists = users.some(u => u.email.toLowerCase() === rawEmail.toLowerCase());
        if (duplicateExists) {
          isRowValid = false;
          failReason = `Row ${rowIndex}: Account already exists for email "${rawEmail}" (duplicate registration blocked).`;
        }
      }
      
      records.push({
        displayName: rawName || 'UNKNOWN',
        email: rawEmail || 'Missing email',
        role: mappedRole || 'LECTURER',
        departmentId: resolvedDeptId,
        programme: resolvedProgrammeName,
        highestQualification: rawHighestQual,
        dateOfAppointment: rawDateOfAppt,
        employmentType: rawEmploymentType,
        status: isRowValid ? 'VALID' : 'INVALID',
        reason: failReason || undefined
      });
    }
    
    setParsedStaff(records);
  };

  const parseCSVText = (text: string) => {
    const lines = text.split('\n');
    const rows: any[][] = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => {
        let clean = p.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.slice(1, -1).trim();
        }
        return clean;
      });
      rows.push(parts);
    }
    parseRawRows(rows);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'xlsx' || fileType === 'xls') {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
          parseRawRows(sheetRows);
          setBulkStaffError('');
        } catch (err: any) {
          setBulkStaffError(`Error reading Excel file: ${err.message || err}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileType === 'csv') {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setBulkStaffCSVText(text);
        setBulkStaffError('');
        parseCSVText(text);
      };
      reader.readAsText(file);
    } else {
      setBulkStaffError('Unsupported file type. Please upload a .csv or .xlsx template.');
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

  const handleStaffCSVParse = () => {
    setBulkStaffError('');
    if (!bulkStaffCSVText.trim()) {
      setBulkStaffError('Please enter some staff CSV rows first.');
      return;
    }
    parseCSVText(bulkStaffCSVText);
  };

  const handleExecuteBulkStaffInjection = async () => {
    setStaffFormError('');
    setStaffFormSuccess('');
    setBulkStaffError('');
    setBulkStaffSuccess('');

    const validRecords = parsedStaff.filter(s => s.status === 'VALID');
    const invalidRecords = parsedStaff.filter(s => s.status === 'INVALID');
    if (validRecords.length === 0) {
      setBulkStaffError(`No valid staff records found to import. ${invalidRecords.length} row(s) were invalid/skipped.`);
      return;
    }

    try {
      let insertedCount = 0;
      let duplicateCount = 0;
      for (const rec of validRecords) {
        // Prevent creating duplicate email records if possible
        const alreadyExists = users.some(u => u.email.toLowerCase() === rec.email.toLowerCase());
        if (alreadyExists) {
          duplicateCount++;
          continue;
        }

        await addStaffMember({
          displayName: rec.displayName,
          email: rec.email,
          role: rec.role,
          departmentId: rec.departmentId,
          programme: rec.programme || '',
          highestQualification: rec.highestQualification || '',
          dateOfAppointment: rec.dateOfAppointment || '',
          employmentType: rec.employmentType || ''
        });
        insertedCount++;
      }

      let successMsg = `Successfully imported and directory-registered ${insertedCount} new staff profiles! Welcome emails have been prepared in Test Mode. You can click "Preview Onboarding Email" next to their names in the directory below to inspect them.`;
      if (duplicateCount > 0) {
        successMsg += ` ${duplicateCount} row(s) were skipped because their accounts already exist in the system.`;
      }
      if (invalidRecords.length > 0) {
        successMsg += ` ${invalidRecords.length} row(s) were skipped during validation because they failed role, department, programme, or appointment constraints. Details are listed in the preview table.`;
      }

      setBulkStaffSuccess(successMsg);
      setBulkStaffCSVText('');
      setParsedStaff([]);
      setIsBulkStaffImporting(false);
      setTimeout(() => setBulkStaffSuccess(''), 8000);
    } catch (err: any) {
      setBulkStaffError(`Bulk staff registry insertion failed: ${err.message || err}`);
    }
  };

  // HOD Assignment modal/inline form state
  const [activeAppointDeptId, setActiveAppointDeptId] = useState<string | null>(null);
  const [selectedStaffToPromote, setSelectedStaffToPromote] = useState('');

  // Auto-initialize default role for staff creation based on the logged-in user's role
  useEffect(() => {
    if (profile?.role === 'HOD') {
      setNewStaffRole('LECTURER');
    } else if (profile?.role === 'FACULTY_ADMIN') {
      setNewStaffRole('HOD');
    }
  }, [profile]);

  // Load real-time users, evaluations, and modules from Firestore
  useEffect(() => {
    const unsubUsers = subscribeToUsers((data) => {
      // Map to consistent format
      const formatted = data.map(usr => ({
        uid: usr.uid || usr.id,
        displayName: usr.displayName || usr.name || usr.email?.split('@')[0] || 'Unknown Staff',
        email: usr.email || '',
        role: usr.role || 'LECTURER',
        departmentId: usr.departmentId || '',
        status: usr.status || 'ACTIVE',
        lastActive: usr.lastActive || '1h ago'
      }));
      setUsers(formatted);
      setLoading(false);
    });

    const unsubEvals = subscribeToStudentEvaluations((data) => {
      setEvaluations(data);
    });

    const unsubModules = subscribeToModules((data) => {
      const filtered = filterModulesByScope(data, profile);
      setModules(filtered);
    });

    const unsubDevPlans = subscribeToDevelopmentPlans((data) => {
      setDevelopmentPlans(data);
    });

    return () => {
      unsubUsers();
      unsubEvals();
      unsubModules();
      unsubDevPlans();
    };
  }, [profile]);

  const handleDepartmentChange = async (userId: string, deptId: string) => {
    setUpdatingId(userId);
    try {
      await updateUserProfile(userId, { departmentId: deptId });
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error('Failed to assign department:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      await updateUserProfile(userId, { role: newRole });
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError('');
    setStaffFormSuccess('');

    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setStaffFormError('Please fill out all staff memory identification fields.');
      return;
    }

    if (profile?.role === 'HOD' && newStaffRole !== 'LECTURER') {
      setStaffFormError('As an HOD, you are only permitted to register Lecturer accounts.');
      return;
    }

    if (profile?.role === 'FACULTY_ADMIN' && newStaffRole === 'LECTURER') {
      setStaffFormError('As a Faculty Admin, you are only permitted to register non-Lecturer accounts (HODs must register Lecturers).');
      return;
    }

    try {
      await addStaffMember({
        displayName: newStaffName,
        email: newStaffEmail,
        role: newStaffRole,
        departmentId: newStaffDept
      });

      // Show welcome email preview modal in test mode so user can see it and test sign-in
      setSimulatedEmailRecipient({
        displayName: newStaffName,
        email: newStaffEmail,
        role: newStaffRole
      });

      setStaffFormSuccess(`Staff member "${newStaffName}" has been successfully added to the directory & role-configured.`);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffRole(profile?.role === 'HOD' ? 'LECTURER' : 'HOD');
      setNewStaffDept('');
      setIsAddingNewStaff(false);
      setTimeout(() => setStaffFormSuccess(''), 4000);
    } catch (error: any) {
      setStaffFormError(`Database record creation failed: ${error.message || error}`);
    }
  };

  const handleAppointsHodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointDeptId) return;

    if (!selectedStaffToPromote) {
      alert('Please select a staff member to appoint as HOD.');
      return;
    }

    try {
      // 1. Promote selected user to HOD for this department
      await updateUserProfile(selectedStaffToPromote, {
        role: 'HOD',
        departmentId: activeAppointDeptId
      });

      // 2. Locate other previous HODs of this department and demote them to LECTURER to keep single active head integrity
      const previousHod = users.find(u => u.role === 'HOD' && u.departmentId === activeAppointDeptId && u.uid !== selectedStaffToPromote);
      if (previousHod) {
        await updateUserProfile(previousHod.uid, {
          role: 'LECTURER'
        });
      }

      setStaffFormSuccess(`HOD assignment updated successfully for department.`);
      setActiveAppointDeptId(null);
      setSelectedStaffToPromote('');
      setTimeout(() => setStaffFormSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to deploy HOD:', err);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    const deptName = DEPARTMENTS.find(d => d.id === u.departmentId)?.name || 'unassigned';
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      deptName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans">
      
      {/* Directory Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded-md flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Departmental Roles Directory
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight">
            Academic <span className="text-indigo-500">Staff Registry</span>
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            Faculty Administrators govern staff assignments, assign Heads of Departments, and allocate lecturers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {profile?.role === 'FACULTY_ADMIN' && (
            <>
              <button 
                onClick={() => {
                  setIsAddingNewStaff(!isAddingNewStaff);
                  setIsBulkStaffImporting(false);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/25 active:scale-95 border border-border cursor-pointer"
                id="btn-toggle-manual-staff"
              >
                <UserPlus className="w-4 h-4" /> 
                {isAddingNewStaff ? 'Hide Manual Form' : 'Manual Register'}
              </button>
              <button 
                onClick={() => {
                  setIsBulkStaffImporting(!isBulkStaffImporting);
                  setIsAddingNewStaff(false);
                }}
                className="flex items-center gap-2 bg-surface-2 hover:bg-surface-2 text-foreground/90 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition active:scale-95 border border-border cursor-pointer"
                id="btn-toggle-bulk-staff"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> 
                {isBulkStaffImporting ? 'Hide Bulk Importer' : 'Bulk Offline Upload'}
              </button>
            </>
          )}

          {profile?.role === 'FACULTY_ADMIN' ? (
            <span className="px-4 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 animate-pulse" /> Faculty Admin Active
            </span>
          ) : (
            <div className="text-right">
              <span className="px-3 py-1.5 bg-surface-2 text-muted-foreground border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest">
                Read Only Access ({profile?.role || 'LECTURER'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Role Alert Explanation Box */}
      <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-surface border border-indigo-500/20 rounded-2xl space-y-3">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" /> Organizational Allocation Workflow Rule
        </h3>
        <p className="text-xs text-foreground/80 leading-relaxed max-w-4xl">
          1. **Faculty Administrators** can assign **Staff members to their Departmental Affiliation**, register new staff records, and select their governing structural **Roles**.
          <br />
          2. **Heads of Departments (HOD)** are appointed to departments. Once assigned, they manage their department's pre-assigned course catalog and **allocate lecturers to module codes** inside the **Module Links** tab.
        </p>
      </div>

      {/* Staff Register Form */}
      {isAddingNewStaff && (
        <div className="p-6 bg-surface border border-indigo-500/30 rounded-2xl space-y-4 max-w-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" /> Add Academic Staff Record
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Invite and register a new academic staff member to the system directory, choosing their role access and department right away.
          </p>

          <form onSubmit={handleAddStaffMember} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Full Name</label>
              <input 
                type="text" 
                placeholder="Dr. Alexander Wright"
                className="w-full bg-surface-tint border border-border rounded-xl px-4 py-2.5 text-xs text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Email Address</label>
              <input 
                type="email" 
                placeholder="a.wright@university.edu"
                className="w-full bg-surface-tint border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Staff Space Role</label>
              <select 
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground font-bold"
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
              >
                {ROLES.filter(r => {
                  if (profile?.role === 'HOD') return r.value === 'LECTURER';
                  if (profile?.role === 'FACULTY_ADMIN') return r.value !== 'LECTURER';
                  return true;
                }).map(r => (
                  <option key={r.value} value={r.value} className="text-slate-900 font-semibold">{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Primary Department</label>
              <select 
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground font-bold"
                value={newStaffDept}
                onChange={(e) => setNewStaffDept(e.target.value)}
              >
                <option value="" className="text-slate-900">Unassigned (General Pool)</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id} className="text-slate-900 font-semibold">{d.name}</option>
                ))}
              </select>
            </div>

            {staffFormError && (
              <p className="col-span-1 sm:col-span-2 text-rose-400 text-xs font-bold uppercase tracking-wider">{staffFormError}</p>
            )}

            <div className="col-span-1 sm:col-span-2 flex gap-3 mt-2">
              <button 
                type="submit" 
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition active:scale-95 border border-border-subtle"
              >
                Create Staff Record
              </button>
              <button 
                type="button" 
                onClick={() => setIsAddingNewStaff(false)}
                className="px-5 py-3 bg-surface-tint hover:bg-surface-tint-strong text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {staffFormSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{staffFormSuccess}</span>
        </div>
      )}

      {/* Staff Bulk CSV Importer Form */}
      {isBulkStaffImporting && (
        <div className="p-6 bg-surface border border-indigo-500/30 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300 animate-pulse-none" id="bulk-staff-uploader-panel">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-500/10">
            <div>
              <h3 className="text-lg font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" /> Offline Staff Registry Importer
              </h3>
              <p className="text-xs text-muted-foreground">
                Register large cohorts of academic staff with preconfigured roles, department affiliations, dates of appointment, qualifications and employment types.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownloadStaffTemplate}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl transition active:scale-95 cursor-pointer border border-border-subtle"
                id="btn-download-staff-template"
              >
                <Download className="w-3.5 h-3.5" /> Download Excel Template (.xlsx)
              </button>
              <button
                onClick={handleDownloadDeptReference}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface-2 hover:bg-surface-2 text-foreground/80 hover:text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl transition active:scale-95 cursor-pointer border border-border-subtle"
                id="btn-download-dept-reference"
              >
                <Download className="w-3.5 h-3.5" /> Dept Codes Reference List
              </button>
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2",
              isDragging 
                ? "border-emerald-500 bg-emerald-500/10" 
                : "border-border bg-surface-sunken hover:border-indigo-500/50 hover:bg-surface-sunken"
            )}
            id="staff-drag-drop-zone"
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
            <Upload className={cn("w-8 h-8", isDragging ? "text-emerald-400 animate-bounce" : "text-indigo-400")} />
            <p className="text-xs font-black uppercase tracking-wider text-foreground/90">
              {isDragging ? "Drop your Excel or CSV file here!" : "Drag & Drop .xlsx or .csv staff template here"}
            </p>
            <p className="text-[10px] text-subtle-foreground">or click to browse your local computer files</p>
          </div>

          <div className="p-4 bg-surface-2 border border-indigo-500/10 rounded-xl text-xs text-foreground/80 space-y-2">
            <span className="font-extrabold uppercase text-[10px] text-indigo-400 tracking-wider block">Staff Excel/CSV Offline Columns:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div>1. <strong>Name</strong>: Full Name</div>
              <div>2. <strong>Email</strong>: Institutional email</div>
              <div>3. <strong>Role</strong>: Dropdown Pick role</div>
              <div>4. <strong>DepartmentCode</strong>: e.g. <code className="text-emerald-400">INF_TECH</code></div>
              <div>5. <strong>ProgrammeCode</strong>: Required for coordinators</div>
              <div>6. <strong>Qualification</strong>: Optional free text</div>
              <div>7. <strong>AppointmentDate</strong>: YYYY-MM-DD</div>
              <div>8. <strong>EmploymentType</strong>: Employment Type</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Or Paste Offline CSV content raw rows:</label>
            <textarea
              className="w-full bg-surface-tint border border-border rounded-xl p-4 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[120px]"
              placeholder="Name,Email,Role,DepartmentCode,ProgrammeCode,Qualification,AppointmentDate,EmploymentType&#10;Dr. Alexander Wright,alex.wright@dut.ac.za,Lecturer,INF_TECH,DIP_IT,PhD,2026-01-15,Permanent&#10;Sarah Jenkins,sarah.j@dut.ac.za,HOD,FIN_ACC,,Master of Accounting,2024-03-01,Permanent"
              value={bulkStaffCSVText}
              onChange={(e) => setBulkStaffCSVText(e.target.value)}
              id="csv-staff-import-input-field"
            />
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <button
              onClick={handleStaffCSVParse}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              id="btn-analyze-staff-csv"
            >
              Analyze & Parse Staff
            </button>
            <button
              onClick={() => { setIsBulkStaffImporting(false); setParsedStaff([]); }}
              className="px-5 py-3 bg-surface-tint text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              id="btn-cancel-staff-csv"
            >
              Cancel
            </button>
          </div>

          {bulkStaffError && (
            <p className="text-rose-400 font-bold text-xs mt-3 uppercase tracking-wider">{bulkStaffError}</p>
          )}

          {parsedStaff.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest text-emerald-400">
                Ready to Import ({parsedStaff.filter(s => s.status === 'VALID').length} Valid records, {parsedStaff.filter(s => s.status === 'INVALID').length} Invalid/Skipped rows)
              </h4>
              <div className="border border-border-subtle rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-surface-tint font-black uppercase text-[10px] text-subtle-foreground sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">DepartmentCode</th>
                      <th className="px-3 py-2">ProgrammeCode</th>
                      <th className="px-3 py-2">Qualification</th>
                      <th className="px-3 py-2">AppointmentDate</th>
                      <th className="px-3 py-2">EmploymentType</th>
                      <th className="px-3 py-2">Status / Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedStaff.map((rec, idx) => {
                      const dept = DEPARTMENTS.find(d => d.id === rec.departmentId || d.code === rec.departmentId);
                      return (
                        <tr key={idx} className={rec.status === 'VALID' ? 'hover:bg-foreground/[0.01]' : 'bg-rose-500/5'}>
                          <td className="px-3 py-2 font-bold text-foreground uppercase">{rec.displayName}</td>
                          <td className="px-3 py-2 text-foreground/80 font-mono text-[10px]">{rec.email}</td>
                          <td className="px-3 py-2 text-indigo-400 font-mono text-[10px]">{rec.role}</td>
                          <td className="px-3 py-2 text-emerald-400 font-semibold">{dept ? dept.code : 'None'}</td>
                          <td className="px-3 py-2 text-foreground/80 text-[10px] truncate max-w-[120px]">{rec.programme || '-'}</td>
                          <td className="px-3 py-2 text-foreground/80 text-[10px] truncate max-w-[100px]">{rec.highestQualification || '-'}</td>
                          <td className="px-3 py-2 text-foreground/80 font-mono text-[10px]">{rec.dateOfAppointment || '-'}</td>
                          <td className="px-3 py-2 text-foreground/80 text-[10px]">{rec.employmentType || '-'}</td>
                          <td className="px-3 py-2 font-bold">
                            {rec.status === 'VALID' ? (
                              <span className="text-emerald-400">✓ READY</span>
                            ) : (
                              <span className="text-rose-400 text-[10px] font-medium block whitespace-normal leading-tight">{rec.reason}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleExecuteBulkStaffInjection}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-foreground text-xs font-black uppercase tracking-widest rounded-xl transition active:scale-95 cursor-pointer"
                  id="btn-execute-staff-bulk"
                >
                  Confirm & Write to Registry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success/Error Banner Inside Panel */}
      {bulkStaffSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wide animate-pulse mb-6">
          {bulkStaffSuccess}
        </div>
      )}

      {/* Departmental HOD Assignment Board */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Departmental HOD Assignment Center</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Monitor which Head of Department governed roles are assigned. Assigned HODs obtain exclusive authority to map local syllabus schedules inside Faculty boundaries.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map(dept => {
            const deptHod = users.find(u => u.role === 'HOD' && u.departmentId === dept.id);
            const isAppointingThis = activeAppointDeptId === dept.id;
            return (
              <div key={dept.id} className="p-5 rounded-2xl bg-foreground/[0.02] border border-border-subtle flex flex-col justify-between hover:border-indigo-500/35 transition duration-200">
                <div>
                  <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{dept.code}</span>
                  <h4 className="text-sm font-black text-foreground mt-2 leading-snug h-10 line-clamp-2">{dept.name}</h4>
                  
                  <div className="mt-4 p-3.5 bg-foreground/[0.02] border border-border-subtle rounded-xl flex items-center gap-3">
                    {deptHod ? (
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black">
                        <Crown className="w-4 h-4 text-indigo-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface-2 text-subtle-foreground flex items-center justify-center font-black">
                        <AlertCircle className="w-4 h-4 text-subtle-foreground" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-[9px] uppercase font-black text-subtle-foreground tracking-wider">Assigned HOD</p>
                      <p className="text-xs font-bold text-foreground/90 truncate">{deptHod ? deptHod.displayName : 'No HOD Assigned'}</p>
                      {deptHod && <p className="text-[9px] font-medium text-muted-foreground truncate">{deptHod.email}</p>}
                    </div>
                  </div>
                </div>

                {profile?.role === 'FACULTY_ADMIN' && (
                  <div className="mt-4 pt-4 border-t border-border-subtle">
                    {isAppointingThis ? (
                      <form onSubmit={handleAppointsHodSubmit} className="space-y-3">
                        <select 
                          className="w-full bg-surface-2 p-2.5 text-xs font-bold text-foreground border border-border rounded-lg text-slate-950"
                          value={selectedStaffToPromote}
                          onChange={(e) => setSelectedStaffToPromote(e.target.value)}
                        >
                          <option value="" className="text-slate-900 font-semibold text-slate-800">Select candidate staff...</option>
                          {users
                            .filter(u => u.uid)
                            .map(u => (
                              <option key={u.uid} value={u.uid} className="text-slate-900 font-semibold">
                                {u.displayName} ({u.role})
                              </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-2 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest text-foreground rounded-lg transition">Save</button>
                          <button type="button" onClick={() => { setActiveAppointDeptId(null); setSelectedStaffToPromote(''); }} className="py-2 px-2.5 bg-surface-tint hover:bg-surface-tint-strong text-[10px] font-black uppercase tracking-widest text-muted-foreground rounded-lg transition">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <button 
                        onClick={() => { setActiveAppointDeptId(dept.id); setSelectedStaffToPromote(''); }}
                        className="w-full py-2 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-foreground transition duration-200 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl"
                      >
                        Assign HOD
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoleStatsCard role="Active Lecturers" count={users.filter(u => u.role === 'LECTURER').length} icon={Users} color="blue" />
        <RoleStatsCard role="Department Heads (HOD)" count={users.filter(u => u.role === 'HOD').length} icon={Shield} color="indigo" />
        <RoleStatsCard role="Faculty Administrators" count={users.filter(u => u.role === 'FACULTY_ADMIN').length} icon={CheckCircle2} color="emerald" />
      </div>

      <div className="glass-card">
        <div className="p-6 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-foreground" />
            <input 
              type="text" 
              placeholder="Search by name, email or assigned department..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-tint border border-border rounded-xl pl-12 pr-4 py-2.5 text-xs text-foreground font-bold placeholder:text-subtle-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-subtle-foreground font-bold uppercase tracking-widest text-xs">
            Loading academic staff maps...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-foreground/[0.02] border-b border-border-subtle">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Staff Information</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Access Role</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Departmental Affiliation</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Status / Indicators</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-subtle-foreground uppercase tracking-widest">KPI Oversight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((staff) => (
                  <tr key={staff.uid} className="hover:bg-foreground/[0.02] transition-colors group">
                    {/* Identity Info */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center font-black text-foreground text-xs">
                          {staff.displayName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-foreground tracking-tight">{staff.displayName}</p>
                            {successId === staff.uid && (
                              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Allocated
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-subtle-foreground font-bold text-[10px]">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {staff.email}
                            </span>
                            <span className="text-subtle-foreground/70 hidden sm:inline">•</span>
                            <button 
                              onClick={() => setSimulatedEmailRecipient({ displayName: staff.displayName, email: staff.email, role: staff.role })}
                              className="text-indigo-400 hover:text-indigo-300 font-extrabold hover:underline uppercase tracking-wider text-[9px] cursor-pointer flex items-center gap-1"
                              title="Simulate the welcome onboarding email that is dispatched in test mode"
                            >
                              <span>Preview Onboarding Email</span>
                            </button>
                          </div>
                          {(staff.highestQualification || staff.dateOfAppointment || staff.employmentType || staff.programme) && (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {staff.highestQualification && (
                                <span className="bg-surface-2 text-foreground/80 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-border-subtle" title="Highest qualification">
                                  {staff.highestQualification}
                                </span>
                              )}
                              {staff.dateOfAppointment && (
                                <span className="bg-surface-2 text-foreground/80 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-border-subtle" title="Date of appointment">
                                  Appointed: {staff.dateOfAppointment}
                                </span>
                              )}
                              {staff.employmentType && (
                                <span className="bg-surface-2 text-foreground/80 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-border-subtle" title="Employment Type">
                                  {staff.employmentType}
                                </span>
                              )}
                              {staff.programme && (
                                <span className="bg-indigo-950/40 text-indigo-300 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-indigo-500/10" title="Assigned Academic Programme">
                                  Prog: {staff.programme}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role allocation */}
                    <td className="px-6 py-4">
                      {profile?.role === 'FACULTY_ADMIN' ? (
                        <select 
                           className="px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-slate-250 font-bold text-xs focus:ring-1 focus:ring-indigo-500"
                          value={staff.role}
                          onChange={(e) => handleRoleChange(staff.uid, e.target.value as UserRole)}
                          disabled={updatingId === staff.uid}
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value} className="text-slate-900 font-semibold">{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                          {ROLES.find(r => r.value === staff.role)?.label || staff.role}
                        </span>
                      )}
                    </td>

                    {/* Department Allocation */}
                    <td className="px-6 py-4">
                      {profile?.role === 'FACULTY_ADMIN' ? (
                        <select 
                          className="px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-foreground/90 font-bold text-xs focus:ring-1 focus:ring-indigo-500"
                          value={staff.departmentId || ''}
                          onChange={(e) => handleDepartmentChange(staff.uid, e.target.value)}
                          disabled={updatingId === staff.uid}
                        >
                          <option value="" className="text-muted-foreground">Unassigned (General Pool)</option>
                          {DEPARTMENTS.map(d => (
                            <option key={d.id} value={d.id} className="text-slate-900 font-semibold">{d.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-extrabold text-foreground/80 uppercase tracking-widest">
                          {DEPARTMENTS.find(d => d.id === staff.departmentId)?.name || 'General / Unassigned'}
                        </span>
                      )}
                    </td>

                    {/* Indicators */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] text-emerald-500 bg-current" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                          Active
                        </span>
                      </div>
                    </td>

                    {/* Actions / KPI column */}
                    <td className="px-6 py-4 text-right">
                      {['LECTURER', 'HOD'].includes(staff.role) ? (
                        <button
                          onClick={() => setSelectedKpiStaff(staff)}
                          className="px-4 py-2 bg-indigo-650 text-foreground bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/30 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center gap-1.5 ml-auto"
                        >
                          <Award className="w-3.5 h-3.5" /> KPI Assessment
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-subtle-foreground uppercase tracking-widest pr-4">Oversight Role</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-subtle-foreground font-bold uppercase tracking-widest text-xs">
                      No matching academic staff found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STAFF KPI HIGHLIGHTS OVERLAY MODAL */}
      <AnimatePresence>
        {selectedKpiStaff && (() => {
          const staff = selectedKpiStaff;
          
          // Filter modules assigned to this lecturer
          const staffModules = modules.filter(m => m.lecturerUids?.includes(staff.displayName) || m.lecturerUids?.includes(staff.uid) || m.lecturerUids?.includes(staff.email));
          const staffEvals = evaluations.filter(e => e.lecturerUid === staff.uid || e.lecturerName === staff.displayName);
          const staffPlans = developmentPlans.filter(p => p.lecturerUid === staff.uid || p.lecturerName === staff.displayName);
          
          // Calculate KPI metrics
          let totalStars = 0;
          let totalQuestions = 0;
          staffEvals.forEach(e => {
            Object.values(e.ratings).forEach(v => {
              totalStars += Number(v);
              totalQuestions += 1;
            });
          });
          const avgStars = totalQuestions > 0 ? (totalStars / totalQuestions).toFixed(2) : '4.40';
          const compliantCount = staffModules.filter(m => m.complianceStatus === 'COMPLIANT').length;
          const complianceRate = staffModules.length > 0 ? ((compliantCount / staffModules.length) * 100).toFixed(0) : '80';
          
          // Development index
          let completedPlansCount = 0;
          let activePlansCount = staffPlans.length;
          staffPlans.forEach(p => {
            if (p.status === 'COMPLETED') completedPlansCount += 1;
            else if (p.status === 'UPDATED') completedPlansCount += 0.5;
            else if (p.status === 'COMMITTED') completedPlansCount += 0.25;
          });
          const developmentRate = activePlansCount > 0 ? Math.round((completedPlansCount / activePlansCount) * 100) : 100;

          // 35% Compliance + 35% Survey star ratios + 30% Development log success
          const totalKpiIndex = Math.round(
            (Number(complianceRate) * 0.35) + 
            ((Number(avgStars) / 5) * 100 * 0.35) + 
            (developmentRate * 0.30)
          );

          const handleDownloadKpiCsv = () => {
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "VAULTIQ INTELLECTUAL WORKSPACE,STAFF AUDIT & KPI REPORT CARD\n";
            csvContent += `Extraction Date,${new Date().toLocaleDateString('en-GB')}\n`;
            csvContent += `Staff Name,${staff.displayName.toUpperCase()}\n`;
            csvContent += `Staff Email,${staff.email}\n`;
            csvContent += `Staff Space Role,${staff.role}\n`;
            csvContent += `Department Affiliation,${DEPARTMENTS.find(d => d.id === staff.departmentId)?.name || 'General Pool'}\n\n`;
            
            csvContent += "PERFORMANCE INDEX SCOREBOARD\n";
            csvContent += `Module Compliance Rate,${complianceRate}%\n`;
            csvContent += `Student Survey Rating average,${avgStars} stars / 5.0\n`;
            csvContent += `Corrective Development Index,${developmentRate}%\n`;
            csvContent += `Calculated Composite KPI Index,${totalKpiIndex}%\n\n`;
            
            csvContent += "ASSIGNED SYLLABUS MODULES GRID\n";
            csvContent += "Syllabus Code,Module Name,Syllabus Compliance State\n";
            
            if (staffModules.length > 0) {
              staffModules.forEach(m => {
                csvContent += `${m.code},${m.name},${m.complianceStatus}\n`;
              });
            } else {
              csvContent += "No assigned modules,N/A,Pending allocation\n";
            }
            
            csvContent += "\nSTUDENT FEEDBACK NARRATIVE STATEMENTS\n";
            csvContent += "Evaluator Role,Comments\n";
            if (staffEvals.length > 0) {
              staffEvals.forEach(e => {
                const cleanComment = e.comments ? e.comments.replace(/"/g, '""') : 'No narrative logs';
                csvContent += `${e.evaluatorType},"${cleanComment}"\n`;
              });
            } else {
              csvContent += "STUDENT,No qualitative evaluation response recorded.\n";
            }
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `KPI_Report_${staff.displayName.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };

          return (
            <div className="fixed inset-0 bg-overlay backdrop-blur-xl z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25 }}
                className="max-w-2xl w-full bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans"
              >
                {/* Header */}
                <div className="p-6 border-b border-border-subtle bg-foreground/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                      <Award className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-foreground uppercase tracking-wider">Staff Activity & KPI Score Card</h4>
                      <p className="text-[10px] text-subtle-foreground font-extrabold uppercase tracking-widest mt-0.5">Section 42 Legislative Standards assessment</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedKpiStaff(null)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-tint rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* Brief identity card */}
                  <div className="p-4 bg-foreground/[0.01] border border-border-subtle rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h5 className="text-sm font-black text-foreground uppercase tracking-tight">{staff.displayName}</h5>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">{staff.email}</p>
                      <p className="text-[10px] text-subtle-foreground font-black tracking-widest uppercase mt-1">
                        {DEPARTMENTS.find(d => d.id === staff.departmentId)?.name || 'General Academics Pool'}
                      </p>
                    </div>

                    <button 
                      onClick={handleDownloadKpiCsv}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-650 to-indigo-650 hover:from-emerald-600 hover:to-indigo-600 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0 shadow-lg shadow-emerald-500/10 border border-border"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Download KPI CSV
                    </button>
                  </div>

                   {/* Calculated KPI score banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-surface border border-indigo-500/25 rounded-2xl text-center flex flex-col justify-center">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">Total KPI rating</span>
                      <p className="text-4xl font-extrabold text-foreground tracking-tighter mt-1">{totalKpiIndex}%</p>
                      <span className="text-[9px] text-subtle-foreground font-bold uppercase tracking-widest mt-1">Weighted average</span>
                    </div>

                    <div className="p-4 bg-foreground/[0.01] border border-border-subtle rounded-2xl text-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-subtle-foreground">Student Survey score</span>
                      <p className="text-3xl font-extrabold text-amber-400 tracking-tighter mt-1">{avgStars}</p>
                      <div className="flex gap-0.5 justify-center mt-1 text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>

                    <div className="p-4 bg-foreground/[0.01] border border-border-subtle rounded-2xl text-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-subtle-foreground">Module Compliance</span>
                      <p className="text-3xl font-extrabold text-foreground tracking-tighter mt-1">{complianceRate}%</p>
                      <p className="text-[9px] text-subtle-foreground font-bold uppercase mt-2">
                        {compliantCount} / {staffModules.length || 1} compliant
                      </p>
                    </div>

                    <div className="p-4 bg-foreground/[0.01] border border-border-subtle rounded-2xl text-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-subtle-foreground">Development Action</span>
                      <p className="text-3xl font-extrabold text-violet-400 tracking-tighter mt-1">{developmentRate}%</p>
                      <p className="text-[9px] text-foreground/90 font-bold uppercase mt-2">
                        {completedPlansCount} / {activePlansCount} completed
                      </p>
                    </div>
                  </div>

                  {/* Modules Compliance List */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Assigned syllabus & files state</h5>
                    {staffModules.length > 0 ? (
                      <div className="space-y-2">
                        {staffModules.map((m) => (
                          <div key={m.id} className="p-3 bg-foreground/[0.01] hover:bg-foreground/[0.02] border border-border-subtle rounded-xl flex items-center justify-between gap-4 transition">
                            <div>
                              <span className="text-[9px] text-indigo-400 uppercase font-black">{m.code}</span>
                              <p className="text-xs font-bold text-foreground uppercase tracking-tight mt-0.5">{m.name}</p>
                            </div>
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                              m.complianceStatus === 'COMPLIANT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              m.complianceStatus === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            )}>
                              {m.complianceStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-border-subtle rounded-2xl text-center text-xs font-bold uppercase tracking-widest text-subtle-foreground">
                        No assigned modules mapped in active catalog.
                      </div>
                    )}
                  </div>

                  {/* Student Survey Comments highlights */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Student Narrative Highlights</h5>
                    {staffEvals.length > 0 ? (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {staffEvals.map((e) => (
                          <div key={e.id} className="p-3 bg-surface border border-border-subtle rounded-2xl text-xs space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold text-subtle-foreground uppercase tracking-wider">
                              <span className="bg-surface-tint px-2 py-0.5 rounded text-foreground/80">{e.evaluatorType} RESPONSE ({e.moduleCode})</span>
                              <span>{e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : 'Just now'}</span>
                            </div>
                            <p className="text-foreground/90 font-medium italic">"{e.comments || 'No narrative cataloged'}"</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-border-subtle rounded-2xl text-center text-xs font-bold uppercase tracking-widest text-subtle-foreground">
                        No student ratings comments captured inside evaluators stream.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-border-subtle bg-surface flex justify-end">
                  <button 
                    onClick={() => setSelectedKpiStaff(null)}
                    className="px-5 py-2 px-6 bg-surface-2 hover:bg-surface-2 text-foreground/80 hover:text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer"
                  >
                    Close Oversight
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Simulated Welcome Onboarding Email (Test Mode / IT Pending Approval) */}
      <AnimatePresence>
        {simulatedEmailRecipient && (
          <div className="fixed inset-0 bg-overlay backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-indigo-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-8"
            >
              
              {/* Test Mode Banner */}
              <div className="bg-amber-500 text-slate-950 px-6 py-3.5 flex items-center justify-between gap-3 font-bold text-xs select-none">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-slate-950 animate-pulse" />
                  <div>
                    <span className="font-black uppercase tracking-wider block">SYSTEM EMAIL TRANSMITTER: SIMULATION INTERCEPT</span>
                    <span className="font-semibold text-[11px] text-slate-900 leading-tight">
                      No real email dispatched yet. SMTP configuration is pending approval by DUT IT.
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSimulatedEmailRecipient(null)}
                  className="p-1.5 hover:bg-surface-sunken rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-950" />
                </button>
              </div>

              {/* Header Context */}
              <div className="p-6 border-b border-border-subtle bg-surface-sunken flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Simulated Onboarding Dispatch</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    System intercepted welcome mail for: <strong className="text-foreground/90">{simulatedEmailRecipient.email}</strong>
                  </p>
                </div>
                <div className="self-start sm:self-auto px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Test Mode Live
                </div>
              </div>

              {/* Simulated Email Box */}
              <div className="p-8 bg-background max-h-[50vh] overflow-y-auto border-b border-border-subtle flex flex-col items-center">
                <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-800 font-sans border border-slate-200 text-left">
                  
                  {/* Mock Mail App Banner */}
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-[10px] text-subtle-foreground font-bold flex justify-between items-center">
                    <span>To: {simulatedEmailRecipient.displayName} &lt;{simulatedEmailRecipient.email}&gt;</span>
                    <span>Subject: Welcome to VaultIQ</span>
                  </div>

                  {/* Mail Header */}
                  <div className="bg-[#4f46e5] px-6 py-5 text-center">
                    <h1 className="text-foreground text-xl font-black tracking-tight m-0">VaultIQ</h1>
                    <p className="text-[#e0e7ff] text-[9px] font-black uppercase tracking-widest m-0 mt-1">Academic Governance & Compliance</p>
                  </div>

                  {/* Mail Body */}
                  <div className="p-6 space-y-4 text-xs text-subtle-foreground/70 leading-relaxed">
                    <h2 className="text-base font-extrabold text-slate-900 leading-tight m-0">
                      Welcome to the Platform, {simulatedEmailRecipient.displayName}!
                    </h2>
                    <p className="m-0">
                      Your official academic staff account has been successfully provisioned on the VaultIQ Portal.
                    </p>

                    {/* Metadata Box */}
                    <div className="bg-slate-50 border-l-4 border-[#4f46e5] p-4 rounded-r-xl space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest m-0 mb-1">Account Profile Details</p>
                      <p className="m-0"><strong>Registered DUT Email:</strong> {simulatedEmailRecipient.email}</p>
                      <p className="m-0"><strong>Assigned Role:</strong> {ROLES.find(r => r.value === simulatedEmailRecipient.role)?.label || simulatedEmailRecipient.role}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 m-0">How to sign in:</p>
                      <p className="text-subtle-foreground m-0">
                        Please use your standard DUT email address and your normal Microsoft password (the same credentials you use for your DUT Microsoft/Office 365 account). Since we utilize secure Microsoft sign-in integration, no separate portal password or registration is needed.
                      </p>
                    </div>

                    {/* Active CTA Button */}
                    <div className="text-center py-2">
                      <a 
                        href={`${window.location.origin}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setSimulatedEmailRecipient(null);
                          alert(`To test signing in as this user, please sign out of your current session first. Then click "Sign in with DUT Microsoft Account" on the login screen and enter/authenticate using the email: ${simulatedEmailRecipient.email}`);
                        }}
                        className="inline-block bg-[#4f46e5] text-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-[#4338ca] transition-colors text-xs text-center no-underline shadow-md shadow-indigo-500/10"
                      >
                        Access VaultIQ Portal
                      </a>
                    </div>

                    <p className="text-[9px] text-muted-foreground border-t border-slate-100 pt-3 m-0 leading-relaxed">
                      This is an automated system notification. Please do not reply directly to this email. For any issues, please contact your Faculty Admin or Head of Department.
                    </p>
                  </div>

                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-6 bg-surface flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <p className="text-xs text-muted-foreground leading-relaxed m-0">
                  Click the button inside the simulated email to understand how this user would log in and access the portal.
                </p>
                <button 
                  onClick={() => setSimulatedEmailRecipient(null)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-black uppercase tracking-widest text-foreground rounded-xl transition cursor-pointer self-end sm:self-auto"
                >
                  Close Preview
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleStatsCard({ role, count, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10'
  };

  return (
    <div className="glass-card p-6 flex items-start justify-between group cursor-pointer hover:border-foreground/20 transition-all">
      <div>
        <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-[0.2em] mb-2">{role}</p>
        <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">{count}</p>
      </div>
      <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}
