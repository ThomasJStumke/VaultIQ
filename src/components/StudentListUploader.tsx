import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Users, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Mail, 
  User, 
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Module } from '../types';
import { saveStudentList, subscribeToStudentList } from '../services/supabaseService';
import { useAuth } from '../hooks/useAuth';
import * as XLSX from 'xlsx';

interface StudentListUploaderProps {
  module: Module;
  onClose: () => void;
}

interface StudentRecord {
  name: string;
  email: string;
}

export default function StudentListUploader({ module, onClose }: StudentListUploaderProps) {
  const { profile } = useAuth();
  
  // Real-time loaded student list
  const [existingList, setExistingList] = useState<StudentRecord[]>([]);
  const [listMetadata, setListMetadata] = useState<{ uploadedBy: string; uploadedAt: string } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Upload/Parsing States
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<StudentRecord[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Subscribe to existing list
  useEffect(() => {
    setLoadingExisting(true);
    const unsub = subscribeToStudentList(module.id, (data) => {
      if (data) {
        setExistingList(data.students || []);
        setListMetadata({
          uploadedBy: data.uploadedBy || 'Unknown',
          uploadedAt: data.uploadedAt ? new Date(data.uploadedAt).toLocaleString() : 'N/A'
        });
      } else {
        setExistingList([]);
        setListMetadata(null);
      }
      setLoadingExisting(false);
    });
    return () => unsub();
  }, [module.id]);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Helper to parse Excel file
  const processFile = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setParseError('Unsupported format. Please select an Excel (.xlsx) spreadsheet.');
      setSelectedFile(null);
      setParsedStudents([]);
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setParsedStudents([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Could not read file data.');

        const workbook = XLSX.read(data, { type: 'array' });
        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel workbook contains no sheets.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length === 0) {
          throw new Error('Spreadsheet is empty.');
        }

        // Search first few rows to find columns for Name and Email
        let nameColIdx = -1;
        let emailColIdx = -1;

        // Inspect row 0 (or row 1 if row 0 is empty) for headers
        const headerRowIndex = rows.findIndex(row => row && row.length > 0);
        if (headerRowIndex !== -1) {
          const headers = rows[headerRowIndex].map((h: any) => String(h || '').trim().toLowerCase());
          nameColIdx = headers.findIndex(h => h.includes('name') || h.includes('student'));
          emailColIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('address'));
        }

        // Fallback to columns 0 and 1 if no headers match
        if (nameColIdx === -1) nameColIdx = 0;
        if (emailColIdx === -1) emailColIdx = 1;

        const students: StudentRecord[] = [];
        const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const nameVal = row[nameColIdx];
          const emailVal = row[emailColIdx];

          const name = nameVal ? String(nameVal).trim() : '';
          const email = emailVal ? String(emailVal).trim() : '';

          // Basic validation to filter empty rows
          if (name || email) {
            if (!email.includes('@')) {
              // Ignore header row mismatches or purely invalid emails gracefully
              continue;
            }
            students.push({ name: name || 'Unnamed Student', email });
          }
        }

        if (students.length === 0) {
          throw new Error('No valid student records found. Ensure sheet has Student Name and Student Email columns.');
        }

        setParsedStudents(students);
      } catch (err: any) {
        setParseError(err.message || 'Failed to parse Excel sheet.');
        setSelectedFile(null);
        setParsedStudents([]);
      }
    };

    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Drop Event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Manual File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Save parsed list to Firestore
  const handleSave = async () => {
    if (parsedStudents.length === 0 || !profile) return;
    setIsSaving(true);
    try {
      await saveStudentList(
        module.id,
        module.code,
        parsedStudents,
        profile.displayName || profile.email || 'Assigned Lecturer'
      );
      setSaveSuccess(true);
      setSelectedFile(null);
      setParsedStudents([]);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setParseError('Failed to save student list. Please check network permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        {/* Top visual glow bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        
        {/* Modal Header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-foreground/[0.01]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 rounded">
                EVALUATION RECIPIENTS LEDGER
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">
              Manage Student Registry <span className="text-indigo-400">({module.code})</span>
            </h3>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-1">
              {module.name}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-surface-tint-strong rounded-xl transition-all group cursor-pointer"
          >
            <X className="w-5 h-5 text-subtle-foreground group-hover:text-foreground" />
          </button>
        </div>

        {/* Modal Body Scroll Container */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
          
          {/* Informational Guidelines Alert Box */}
          <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-black text-foreground uppercase tracking-wider">Operational Isolation Directives</p>
              <p className="text-foreground/80 leading-relaxed font-semibold">
                Uploaded students are stored double-blind strictly to distribute evaluation survey schedules via email. No user accounts, credentials, or profile roles are provisioned. Uploading a new list completely replaces any pre-existing records for this module.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Side: Upload Spreadsheet & Preview */}
            <div className="lg:col-span-7 space-y-6">
              
              <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Ingestion & Validation Node
              </h4>

              {/* Drag-and-drop Area */}
              <div 
                className={cn(
                  "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden h-48",
                  dragActive ? "border-indigo-500 bg-indigo-500/5 text-foreground" : "border-border-subtle bg-foreground/[0.01] hover:border-border hover:bg-foreground/[0.02]"
                )}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('excel-upload')?.click()}
              >
                <input 
                  id="excel-upload" 
                  type="file" 
                  accept=".xlsx"
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <div className="w-12 h-12 bg-surface-tint border border-border rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">Drag & drop student roster</p>
                    <p className="text-[10px] text-subtle-foreground font-bold uppercase tracking-widest mt-1">Accepts only Excel (.xlsx) spreadsheets</p>
                  </div>
                </div>
              </div>

              {/* Error messages */}
              {parseError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Save Success Alerts */}
              {saveSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center gap-2 animate-pulse">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                  <span>Roster saved! Survey invitation channels have been updated successfully.</span>
                </div>
              )}

              {/* Parsed spreadsheet preview */}
              {parsedStudents.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✓ File Parsed Successfully</p>
                      <h5 className="text-xs font-black text-foreground uppercase tracking-wider mt-1">Pending validation queue ({parsedStudents.length} students)</h5>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedFile(null);
                        setParsedStudents([]);
                      }}
                      className="text-xs text-subtle-foreground hover:text-rose-400 font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                  </div>

                  <div className="border border-border-subtle rounded-2xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-foreground/[0.02] border-b border-border-subtle sticky top-0">
                        <tr className="text-subtle-foreground uppercase text-[9px] font-black tracking-widest">
                          <th className="py-2.5 px-4">Student Name</th>
                          <th className="py-2.5 px-4">Student Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium text-foreground/80">
                        {parsedStudents.map((stud, idx) => (
                          <tr key={idx} className="hover:bg-foreground/[0.01]">
                            <td className="py-2 px-4 text-foreground font-bold">{stud.name}</td>
                            <td className="py-2 px-4 font-mono text-muted-foreground text-[10px]">{stud.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commit upload action button */}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2 border border-border"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                        Transmitting to Secure Registry...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-foreground" />
                        Authorize and Commit Roster
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>

            {/* Right Side: Existing Student List Ledger */}
            <div className="lg:col-span-5 space-y-6 bg-surface-sunken border border-border-subtle p-6 rounded-3xl">
              
              <div>
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" /> Current Module Recipients
                </h4>
                {listMetadata && (
                  <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest mt-1">
                    Last modified by: <span className="text-foreground/80">{listMetadata.uploadedBy}</span> on {listMetadata.uploadedAt}
                  </p>
                )}
              </div>

              {loadingExisting ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                  <p className="text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Querying database registry...</p>
                </div>
              ) : existingList.length > 0 ? (
                <div className="space-y-4">
                  
                  {/* Summary Metric Card */}
                  <div className="p-4 bg-surface-tint border border-border-subtle rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-subtle-foreground uppercase font-black tracking-widest">Recipients Pool</p>
                      <p className="text-2xl font-black text-foreground mt-0.5">{existingList.length} Active</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-indigo-400" />
                    </div>
                  </div>

                  {/* Roster list */}
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {existingList.map((stud, idx) => (
                      <div 
                        key={idx}
                        className="p-3 bg-foreground/[0.02] border border-border-subtle rounded-xl flex items-start gap-3 transition hover:border-border"
                      >
                        <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-muted-foreground shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-foreground truncate uppercase">{stud.name}</p>
                          <p className="text-[10px] text-subtle-foreground font-mono truncate mt-0.5">{stud.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 bg-surface-tint border border-border-subtle rounded-2xl flex items-center justify-center mx-auto text-subtle-foreground">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">No Recipients Configured</p>
                    <p className="text-[9px] text-subtle-foreground font-bold uppercase tracking-widest max-w-[200px] mx-auto mt-1 leading-relaxed">
                      Upload an Excel spreadsheet with student details to schedule survey campaign invitations.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-border-subtle bg-foreground/[0.01] flex items-center justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-surface-tint hover:bg-surface-tint-strong text-foreground/80 rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer"
          >
            Close Portal
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}
