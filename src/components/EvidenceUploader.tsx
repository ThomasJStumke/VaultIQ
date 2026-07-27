import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Module, AIValidationResult } from '../types';
import { uploadEvidenceMetadata, updateModuleCompliance } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import AIValidator from './AIValidator';
import { validateDocumentWithAI } from '../services/aiValidationService';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB, matches Supabase free-tier default

interface EvidenceUploaderProps {
  module: Module;
  onClose: () => void;
}

export default function EvidenceUploader({ module, onClose }: EvidenceUploaderProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('STUDY_GUIDE');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIValidationResult | null>(null);
  const [committed, setCommitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setAnalysis(null);
      setCommitted(false);
    }
  };

  const uploadAndValidate = async () => {
    if (!file || !user) return;
    setLoading(true);

    try {
      const result = await validateDocumentWithAI(file, module, evidenceType);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      alert("AI Analysis failed. Please check server logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!analysis || !file || !user) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB upload limit.`);
      return;
    }

    setLoading(true);

    const evidenceId = crypto.randomUUID();
    const storagePath = `${module.id}/${evidenceId}/${file.name}`;

    try {
      // 1. Upload the real file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('evidence-vault')
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      // 2. Write the evidence row, referencing the uploaded object's path
      try {
        await uploadEvidenceMetadata(module.id, {
          id: evidenceId,
          moduleId: module.id,
          type: evidenceType as any,
          storagePath,
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString(),
          aiValidationStatus: analysis.status === 'APPROVED' ? 'VALID' : 'INVALID',
          aiFeedback: analysis.feedback.join(' ')
        });
      } catch (metadataErr) {
        // Roll back the orphaned storage object if the row write failed
        await supabase.storage.from('evidence-vault').remove([storagePath]);
        throw metadataErr;
      }

      // 3. Update Module Compliance if valid
      if (analysis.status === 'APPROVED' || analysis.status === 'PARTIAL') {
        await updateModuleCompliance(module.id, 'COMPLIANT');
      } else {
        await updateModuleCompliance(module.id, 'NON_COMPLIANT');
      }

      setCommitted(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to store artifact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (committed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
        <div className="glass-card p-12 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-foreground" />
          </div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">Artifact Transmitted</h3>
          <p className="text-muted-foreground font-medium">Record successfully written to institutional ledger.</p>
        </div>
      </div>
    );
  }

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
        className="w-full max-w-3xl glass-card relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        
        <div className="p-8 border-b border-border-subtle flex items-center justify-between bg-foreground/[0.02]">
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">Artifact Ingestion Node</h3>
            <p className="text-[10px] text-subtle-foreground font-black uppercase tracking-widest mt-1">
              Module Repository: <span className="text-indigo-400">{module.code} - {module.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-surface-tint-strong rounded-xl transition-all group">
            <X className="w-6 h-6 text-subtle-foreground group-hover:text-foreground" />
          </button>
        </div>

        <div className="p-10 space-y-10">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest italic ml-1 text-gradient">Audit Type Classification</label>
              <select 
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full bg-surface-tint border border-border rounded-2xl p-4 text-foreground font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none appearance-none"
              >
                <option value="STUDY_GUIDE" className="bg-surface">Study Guide</option>
                <option value="ASSESSMENT_TASK" className="bg-surface">Assessment Task</option>
                <option value="MODERATION_REPORT" className="bg-surface">Moderation Report</option>
                <option value="EXAM_PAPER" className="bg-surface">Exam Paper</option>
                <option value="PRE_REVIEW" className="bg-surface">PRE Review</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest italic ml-1 text-gradient">Semester / Year Node</label>
              <div className="p-4 bg-surface-tint border border-border rounded-2xl text-sm font-black text-foreground/80 tracking-tight">
                Semester 2, 2026
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div 
              className={cn(
                "border-2 border-dashed rounded-3xl p-14 flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden",
                file ? "border-indigo-500 bg-indigo-500/5 text-foreground" : "border-border-subtle bg-foreground/[0.02] hover:border-foreground/20 hover:bg-foreground/[0.04]"
              )}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept=".pdf"
                onChange={handleFileChange}
              />
              <div className="relative z-10 w-20 h-20 bg-surface-sunken rounded-2xl border border-border-subtle flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                {file ? <FileText className="w-10 h-10 text-indigo-400" /> : <Upload className="w-10 h-10 text-subtle-foreground" />}
              </div>
              <p className="relative z-10 text-lg font-black text-foreground mb-2 tracking-tight">
                {file ? file.name : "Drop artifact node or click to browse"}
              </p>
              <p className="relative z-10 text-[10px] text-subtle-foreground font-extrabold uppercase tracking-[0.2em]">Institutional PDF Standard • Max 10MB</p>
            </div>

            {file && !analysis && (
              <button 
                onClick={uploadAndValidate}
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-foreground rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98] border border-border"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                {loading ? "Decrypting & Analyzing..." : "Initiate AI Verification"}
              </button>
            )}
          </div>

          <AnimatePresence>
            {(loading || analysis) && (
              <div className="space-y-6">
                <AIValidator result={analysis} isProcessing={loading && !analysis} />
                
                {analysis && (
                  <div className="flex gap-4">
                    <button 
                      onClick={handleCommit}
                      disabled={loading}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border flex items-center justify-center gap-2",
                        analysis.status !== 'REJECTED' 
                          ? "bg-indigo-600 text-foreground border-indigo-400/50 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20" 
                          : "bg-rose-600 text-foreground border-rose-400/50 hover:bg-rose-500 shadow-xl shadow-rose-600/20"
                      )}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (analysis.status !== 'REJECTED' ? "Confirm & Store Artifact" : "Discard Artifact")}
                    </button>
                    <button 
                      onClick={() => { setFile(null); setAnalysis(null); }}
                      className="px-8 py-4 bg-surface-tint border border-border rounded-2xl text-muted-foreground hover:text-foreground hover:bg-surface-tint-strong text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
