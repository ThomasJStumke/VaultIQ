import React from 'react';
import { 
  BrainCircuit, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  MessageSquare,
  PenTool,
  Fingerprint,
  Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AIValidationResult } from '../types';
import { motion } from 'motion/react';

interface AIValidatorProps {
  result: AIValidationResult | null;
  isProcessing: boolean;
}

export default function AIValidator({ result, isProcessing }: AIValidatorProps) {
  if (isProcessing) {
    return (
      <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-3xl flex flex-col items-center justify-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          <BrainCircuit className="w-12 h-12 text-indigo-500 relative z-10 animate-bounce" />
        </div>
        <h4 className="text-white font-black tracking-tight text-lg">AI Multi-Modal Analysis in Progress...</h4>
        <p className="text-slate-500 text-sm font-medium mt-2">Gemini is verifying signatures, module codes, and content integrity.</p>
        
        <div className="w-full max-w-xs mt-8 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  if (!result) return null;

  const statusConfig = {
    APPROVED: { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    PARTIAL: { icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    REJECTED: { icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("p-6 rounded-3xl border", config.bg, config.border)}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-2xl bg-white/10", config.color)}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h4 className={cn("font-black tracking-tight", config.color)}>AI Validation: {result.status}</h4>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Confidence Score: {result.confidence}%</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-xs font-black text-white/40 uppercase tracking-tighter">
            <Fingerprint className="w-3 h-3" /> Artifact Token: {Math.random().toString(36).substring(7).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AnalysisPill label="Module Matching" active={result.isCorrectType} icon={CheckCircle2} />
        <AnalysisPill label="Signature Detected" active={result.hasSignature} icon={PenTool} />
        <AnalysisPill label="Handwritten Notes" active={result.handwrittenNotesDetected} icon={MessageSquare} />
        <AnalysisPill label="Content Integrity" active={result.confidence > 50} icon={ShieldCheck} />
      </div>

      <div className="space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-3 h-3" /> Auditor Insights
        </h5>
        <ul className="space-y-2">
          {result.feedback.map((msg, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium leading-relaxed">
              <span className={cn("mt-1.5 w-1 h-1 rounded-full shrink-0", config.color)} />
              {msg}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function AnalysisPill({ label, active, icon: Icon }: any) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
      active ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : "bg-white/5 border-white/10 text-slate-500 grayscale opacity-50"
    )}>
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {active && <CheckCircle2 className="w-3 h-3 ml-auto" />}
    </div>
  );
}
