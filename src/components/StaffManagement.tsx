import React, { useState, useEffect } from 'react';
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
} from '../services/dataService';

interface StaffMember {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  status?: 'ACTIVE' | 'PENDING' | 'LOCKED';
  lastActive?: string;
  name?: string; // Fallback
}

const DEPARTMENTS = [
  { id: 'FAI_AUD_TAX', name: 'Auditing and Taxation', code: 'AUD_TAX' },
  { id: 'FAI_MGT_ACC', name: 'Management Accounting', code: 'MGT_ACC' },
  { id: 'FAI_FIN_ACC', name: 'Financial Accounting', code: 'FIN_ACC' },
  { id: 'FAI_IT', name: 'Information Technology', code: 'INF_TECH' },
  { id: 'FAI_IS', name: 'Information Systems', code: 'INF_SYS' },
  { id: 'FAI_ICM', name: 'Information Communications Management', code: 'INF_ICM' },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'LECTURER', label: 'Lecturer' },
  { value: 'HOD', label: 'Head of Department' },
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

  // Bulk Staff Allocation States
  const [isBulkStaffImporting, setIsBulkStaffImporting] = useState(false);
  const [bulkStaffCSVText, setBulkStaffCSVText] = useState('');
  const [parsedStaff, setParsedStaff] = useState<{
    displayName: string;
    email: string;
    role: UserRole;
    departmentId: string;
    status: 'VALID' | 'INVALID';
    reason?: string;
  }[]>([]);
  const [bulkStaffError, setBulkStaffError] = useState('');
  const [bulkStaffSuccess, setBulkStaffSuccess] = useState('');

  const handleDownloadStaffTemplate = () => {
    const headers = "DisplayName,Email,Role,DepartmentCode\n";
    const rows = [
      "Dr. Alexander Wright,alex.wright@university.ac.za,LECTURER,INF_TECH",
      "Sarah Jenkins,sarah.j@university.ac.za,HOD,FIN_ACC",
      "Prof Robert,robert@university.ac.za,DEPUTY_DEAN,AUD_TAX",
      "Thabo Nxumalo,thabo.n@university.ac.za,LECTURER,INF_SYS"
    ].join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Academic_Staff_Import_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStaffCSVParse = () => {
    setBulkStaffError('');
    if (!bulkStaffCSVText.trim()) {
      setBulkStaffError('Please enter some staff CSV rows first.');
      return;
    }

    const lines = bulkStaffCSVText.split('\n');
    const records: typeof parsedStaff = [];

    const allowedRoles: UserRole[] = [
      'LECTURER', 'HOD', 'FACULTY_ADMIN', 'DEPUTY_DEAN', 'EXECUTIVE_DEAN', 'DVC_TL', 'EXAMS', 'CQPA', 'QPO', 'AUDITOR'
    ];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.toLowerCase().startsWith('displayname,') || line.toLowerCase().startsWith('name,')) {
        continue;
      }

      const parts = line.split(',');
      const displayName = parts[0]?.trim();
      const email = parts[1]?.trim();
      let roleInput = parts[2]?.trim().toUpperCase() as UserRole;
      const deptCodeInput = parts[3]?.trim().toUpperCase();

      if (!allowedRoles.includes(roleInput)) {
        roleInput = 'LECTURER';
      }

      // Resolve department ID
      let resolvedDeptId = '';
      if (deptCodeInput) {
        const foundDept = DEPARTMENTS.find(d => 
          d.code.toUpperCase() === deptCodeInput || 
          d.id.toUpperCase() === deptCodeInput
        );
        if (foundDept) {
          resolvedDeptId = foundDept.id;
        }
      }

      if (!displayName || !email) {
        records.push({
          displayName: displayName || 'UNKNOWN',
          email: email || 'Missing Email address',
          role: roleInput,
          departmentId: resolvedDeptId,
          status: 'INVALID',
          reason: 'Missing Name or Email'
        });
      } else if (!email.includes('@')) {
        records.push({
          displayName,
          email,
          role: roleInput,
          departmentId: resolvedDeptId,
          status: 'INVALID',
          reason: 'Invalid email format'
        });
      } else {
        records.push({
          displayName,
          email,
          role: roleInput,
          departmentId: resolvedDeptId,
          status: 'VALID'
        });
      }
    }

    setParsedStaff(records);
  };

  const handleExecuteBulkStaffInjection = async () => {
    setStaffFormError('');
    setStaffFormSuccess('');
    setBulkStaffError('');
    setBulkStaffSuccess('');

    const validRecords = parsedStaff.filter(s => s.status === 'VALID');
    if (validRecords.length === 0) {
      setBulkStaffError('No valid staff records found to import.');
      return;
    }

    try {
      let insertedCount = 0;
      for (const rec of validRecords) {
        // Prevent creating duplicate email records if possible
        const alreadyExists = users.some(u => u.email.toLowerCase() === rec.email.toLowerCase());
        if (alreadyExists) continue;

        await addStaffMember({
          displayName: rec.displayName,
          email: rec.email,
          role: rec.role,
          departmentId: rec.departmentId
        });
        insertedCount++;
      }

      setBulkStaffSuccess(`Successfully imported and directory-registered ${insertedCount} staff profiles!`);
      setBulkStaffCSVText('');
      setParsedStaff([]);
      setIsBulkStaffImporting(false);
      setTimeout(() => setBulkStaffSuccess(''), 4500);
    } catch (err: any) {
      setBulkStaffError(`Bulk staff registry insertion failed: ${err.message || err}`);
    }
  };

  // HOD Assignment modal/inline form state
  const [activeAppointDeptId, setActiveAppointDeptId] = useState<string | null>(null);
  const [selectedStaffToPromote, setSelectedStaffToPromote] = useState('');

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

    try {
      await addStaffMember({
        displayName: newStaffName,
        email: newStaffEmail,
        role: newStaffRole,
        departmentId: newStaffDept
      });

      setStaffFormSuccess(`Staff member "${newStaffName}" has been successfully added to the directory & role-configured.`);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffRole('LECTURER');
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
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Academic <span className="text-indigo-500">Staff Registry</span>
          </h2>
          <p className="text-slate-400 font-medium mt-1">
            Faculty Administrators govern staff assignments, assign Heads of Departments, and allocate lecturers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {profile?.roles?.includes('FACULTY_ADMIN') && (
            <>
              <button 
                onClick={() => {
                  setIsAddingNewStaff(!isAddingNewStaff);
                  setIsBulkStaffImporting(false);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/25 active:scale-95 border border-white/10 cursor-pointer"
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
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition active:scale-95 border border-white/10 cursor-pointer"
                id="btn-toggle-bulk-staff"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> 
                {isBulkStaffImporting ? 'Hide Bulk Importer' : 'Bulk Offline Upload'}
              </button>
            </>
          )}

          {profile?.roles?.includes('FACULTY_ADMIN') ? (
            <span className="px-4 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 animate-pulse" /> Faculty Admin Active
            </span>
          ) : (
            <div className="text-right">
              <span className="px-3 py-1.5 bg-slate-800 text-slate-400 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Read Only Access ({profile?.roles?.join(', ') || 'LECTURER'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Role Alert Explanation Box */}
      <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl space-y-3">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" /> Organizational Allocation Workflow Rule
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          1. **Faculty Administrators** can assign **Staff members to their Departmental Affiliation**, register new staff records, and select their governing structural **Roles**.
          <br />
          2. **Heads of Departments (HOD)** are appointed to departments. Once assigned, they manage their department's pre-assigned course catalog and **allocate lecturers to module codes** inside the **Module Links** tab.
        </p>
      </div>

      {/* Staff Register Form */}
      {isAddingNewStaff && (
        <div className="p-6 bg-slate-900 border border-indigo-500/30 rounded-2xl space-y-4 max-w-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" /> Add Academic Staff Record
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Invite and register a new academic staff member to the system directory, choosing their role access and department right away.
          </p>

          <form onSubmit={handleAddStaffMember} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
              <input 
                type="text" 
                placeholder="Dr. Alexander Wright"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
              <input 
                type="email" 
                placeholder="a.wright@university.edu"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Staff Space Role</label>
              <select 
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value} className="text-slate-900 font-semibold">{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Primary Department</label>
              <select 
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
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
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition active:scale-95 border border-white/5"
              >
                Create Staff Record
              </button>
              <button 
                type="button" 
                onClick={() => setIsAddingNewStaff(false)}
                className="px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition"
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
        <div className="p-6 bg-slate-900 border border-indigo-500/30 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300 animate-pulse-none" id="bulk-staff-uploader-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-500/10">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" /> Offline Staff Registry Importer
              </h3>
              <p className="text-xs text-slate-400">
                Register large cohorts of academic staff with preconfigured roles and department affiliations offline.
              </p>
            </div>
            <button
              onClick={handleDownloadStaffTemplate}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition active:scale-95 cursor-pointer border border-white/5"
              id="btn-download-staff-template"
            >
              <Download className="w-3.5 h-3.5" /> Download Staff Template (.csv)
            </button>
          </div>

          <div className="p-4 bg-slate-850 border border-indigo-500/10 rounded-xl text-xs text-slate-300 space-y-2">
            <span className="font-extrabold uppercase text-[10px] text-indigo-400 tracking-wider block">Staff CSV Offline Columns:</span>
            <p>
              1. <strong className="text-white">DisplayName</strong>: Full Name (e.g. Dr. Alexander Wright)
              <br />
              2. <strong className="text-white">Email</strong>: Valid institutional email address
              <br />
              3. <strong className="text-white">Role</strong>: Access levels (such as <code className="text-indigo-300">LECTURER</code>, <code className="text-indigo-300">HOD</code>, <code className="text-indigo-300">DEPUTY_DEAN</code>, <code className="text-indigo-300">EXECUTIVE_DEAN</code>, <code className="text-indigo-300">QPO</code>, <code className="text-indigo-300">CQPA</code>)
              <br />
              4. <strong className="text-white">DepartmentCode</strong> (Optional): Code matches (e.g. <code className="font-mono text-emerald-400 text-[10px]">AUD_TAX</code>, <code className="font-mono text-emerald-400 text-[10px]">MGT_ACC</code>, <code className="font-mono text-emerald-400 text-[10px]">FIN_ACC</code>, <code className="font-mono text-emerald-400 text-[10px]">INF_TECH</code>, <code className="font-mono text-emerald-400 text-[10px]">INF_SYS</code>, <code className="font-mono text-emerald-400 text-[10px]">INF_ICM</code>)
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Paste Data (Format: DisplayName,Email,Role,DepartmentCode)</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[140px]"
              placeholder="DisplayName,Email,Role,DepartmentCode&#10;Dr. Alexander Wright,alex.wright@university.ac.za,LECTURER,INF_TECH&#10;Sarah Jenkins,sarah.j@university.ac.za,HOD,FIN_ACC"
              value={bulkStaffCSVText}
              onChange={(e) => setBulkStaffCSVText(e.target.value)}
              id="csv-staff-import-input-field"
            />
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <button
              onClick={handleStaffCSVParse}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              id="btn-analyze-staff-csv"
            >
              Analyze & Parse Staff
            </button>
            <button
              onClick={() => { setIsBulkStaffImporting(false); setParsedStaff([]); }}
              className="px-5 py-3 bg-white/5 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
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
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-emerald-400">
                Ready to Import ({parsedStaff.filter(s => s.status === 'VALID').length} Valid records)
              </h4>
              <div className="border border-white/5 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 font-black uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Display Name</th>
                      <th className="px-4 py-2 text-left">Email Address</th>
                      <th className="px-4 py-2 text-left">Role Access</th>
                      <th className="px-4 py-2 text-left">Resolved Dept</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedStaff.map((rec, idx) => {
                      const dept = DEPARTMENTS.find(d => d.id === rec.departmentId);
                      return (
                        <tr key={idx} className={rec.status === 'VALID' ? 'hover:bg-white/[0.01]' : 'bg-rose-500/5'}>
                          <td className="px-4 py-2 font-bold text-white uppercase">{rec.displayName}</td>
                          <td className="px-4 py-2 text-slate-300 font-mono">{rec.email}</td>
                          <td className="px-4 py-2 text-indigo-400 font-mono text-[11px]">{rec.role}</td>
                          <td className="px-4 py-2 text-emerald-400 font-semibold">{dept ? dept.code : 'None'}</td>
                          <td className="px-4 py-2 font-bold">
                            {rec.status === 'VALID' ? (
                              <span className="text-emerald-400">✓ READY</span>
                            ) : (
                              <span className="text-rose-400">✗ {rec.reason}</span>
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
                  onClick={handleExecuteBulkStaffInjection}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition active:scale-95 cursor-pointer"
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
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Departmental HOD Assignment Center</h3>
        </div>
        <p className="text-xs text-slate-400">
          Monitor which Head of Department governed roles are assigned. Assigned HODs obtain exclusive authority to map local syllabus schedules inside Faculty boundaries.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map(dept => {
            const deptHod = users.find(u => u.role === 'HOD' && u.departmentId === dept.id);
            const isAppointingThis = activeAppointDeptId === dept.id;
            return (
              <div key={dept.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:border-indigo-500/35 transition duration-200">
                <div>
                  <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{dept.code}</span>
                  <h4 className="text-sm font-black text-white mt-2 leading-snug h-10 line-clamp-2">{dept.name}</h4>
                  
                  <div className="mt-4 p-3.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3">
                    {deptHod ? (
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black">
                        <Crown className="w-4 h-4 text-indigo-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center font-black">
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Assigned HOD</p>
                      <p className="text-xs font-bold text-slate-200 truncate">{deptHod ? deptHod.displayName : 'No HOD Assigned'}</p>
                      {deptHod && <p className="text-[9px] font-medium text-slate-400 truncate">{deptHod.email}</p>}
                    </div>
                  </div>
                </div>

                {profile?.roles?.includes('FACULTY_ADMIN') && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    {isAppointingThis ? (
                      <form onSubmit={handleAppointsHodSubmit} className="space-y-3">
                        <select 
                          className="w-full bg-slate-800 p-2.5 text-xs font-bold text-white border border-white/10 rounded-lg text-slate-950"
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
                          <button type="submit" className="flex-1 py-2 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest text-white rounded-lg transition">Save</button>
                          <button type="button" onClick={() => { setActiveAppointDeptId(null); setSelectedStaffToPromote(''); }} className="py-2 px-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-lg transition">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <button 
                        onClick={() => { setActiveAppointDeptId(dept.id); setSelectedStaffToPromote(''); }}
                        className="w-full py-2 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white transition duration-200 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl"
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
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email or assigned department..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-xs text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
            Loading academic staff maps...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Staff Information</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Role</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Departmental Affiliation</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status / Indicators</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">KPI Oversight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((staff) => (
                  <tr key={staff.uid} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Identity Info */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-white text-xs">
                          {staff.displayName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-white tracking-tight">{staff.displayName}</p>
                            {successId === staff.uid && (
                              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Allocated
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 font-bold text-[10px]">
                            <Mail className="w-3 h-3" /> {staff.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role allocation */}
                    <td className="px-6 py-4">
                      {profile?.roles?.includes('FACULTY_ADMIN') ? (
                        <select 
                           className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-slate-250 font-bold text-xs focus:ring-1 focus:ring-indigo-500"
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
                      {profile?.roles?.includes('FACULTY_ADMIN') ? (
                        <select 
                          className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-slate-200 font-bold text-xs focus:ring-1 focus:ring-indigo-500"
                          value={staff.departmentId || ''}
                          onChange={(e) => handleDepartmentChange(staff.uid, e.target.value)}
                          disabled={updatingId === staff.uid}
                        >
                          <option value="" className="text-slate-400">Unassigned (General Pool)</option>
                          {DEPARTMENTS.map(d => (
                            <option key={d.id} value={d.id} className="text-slate-900 font-semibold">{d.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">
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
                          className="px-4 py-2 bg-indigo-650 text-white bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/30 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center gap-1.5 ml-auto"
                        >
                          <Award className="w-3.5 h-3.5" /> KPI Assessment
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pr-4">Oversight Role</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
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
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25 }}
                className="max-w-2xl w-full bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans"
              >
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white uppercase tracking-wider">Staff Activity & KPI Score Card</h4>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">Section 42 Legislative Standards assessment</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedKpiStaff(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* Brief identity card */}
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h5 className="text-sm font-black text-white uppercase tracking-tight">{staff.displayName}</h5>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">{staff.email}</p>
                      <p className="text-[10px] text-slate-550 font-black tracking-widest uppercase mt-1">
                        {DEPARTMENTS.find(d => d.id === staff.departmentId)?.name || 'General Academics Pool'}
                      </p>
                    </div>

                    <button 
                      onClick={handleDownloadKpiCsv}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-650 to-indigo-650 hover:from-emerald-600 hover:to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0 shadow-lg shadow-emerald-500/10 border border-white/10"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Download KPI CSV
                    </button>
                  </div>

                   {/* Calculated KPI score banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/25 rounded-2xl text-center flex flex-col justify-center">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">Total KPI rating</span>
                      <p className="text-4xl font-extrabold text-white tracking-tighter mt-1">{totalKpiIndex}%</p>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Weighted average</span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Student Survey score</span>
                      <p className="text-3xl font-extrabold text-amber-400 tracking-tighter mt-1">{avgStars}</p>
                      <div className="flex gap-0.5 justify-center mt-1 text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Module Compliance</span>
                      <p className="text-3xl font-extrabold text-white tracking-tighter mt-1">{complianceRate}%</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">
                        {compliantCount} / {staffModules.length || 1} compliant
                      </p>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Development Action</span>
                      <p className="text-3xl font-extrabold text-violet-400 tracking-tighter mt-1">{developmentRate}%</p>
                      <p className="text-[9px] text-slate-200 font-bold uppercase mt-2">
                        {completedPlansCount} / {activePlansCount} completed
                      </p>
                    </div>
                  </div>

                  {/* Modules Compliance List */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned syllabus & files state</h5>
                    {staffModules.length > 0 ? (
                      <div className="space-y-2">
                        {staffModules.map((m) => (
                          <div key={m.id} className="p-3 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-4 transition">
                            <div>
                              <span className="text-[9px] text-indigo-400 uppercase font-black">{m.code}</span>
                              <p className="text-xs font-bold text-white uppercase tracking-tight mt-0.5">{m.name}</p>
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
                      <div className="p-4 border border-dashed border-white/5 rounded-2xl text-center text-xs font-bold uppercase tracking-widest text-slate-550">
                        No assigned modules mapped in active catalog.
                      </div>
                    )}
                  </div>

                  {/* Student Survey Comments highlights */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Student Narrative Highlights</h5>
                    {staffEvals.length > 0 ? (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {staffEvals.map((e) => (
                          <div key={e.id} className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-xs space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              <span className="bg-white/5 px-2 py-0.5 rounded text-slate-300">{e.evaluatorType} RESPONSE ({e.moduleCode})</span>
                              <span>{e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : 'Just now'}</span>
                            </div>
                            <p className="text-slate-200 font-medium italic">"{e.comments || 'No narrative cataloged'}"</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-white/5 rounded-2xl text-center text-xs font-bold uppercase tracking-widest text-slate-550">
                        No student ratings comments captured inside evaluators stream.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-slate-900 flex justify-end">
                  <button 
                    onClick={() => setSelectedKpiStaff(null)}
                    className="px-5 py-2 px-6 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer"
                  >
                    Close Oversight
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
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
    <div className="glass-card p-6 flex items-start justify-between group cursor-pointer hover:border-white/20 transition-all">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{role}</p>
        <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{count}</p>
      </div>
      <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}
