import React from 'react';
import { 
  ShieldCheck, 
  Download, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function ComplianceReport() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-card p-8">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tighter">Governance Node</h2>
          <p className="text-subtle-foreground font-medium mt-1">Official institutional readiness and telemetry logs.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
            Node: Secure
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-tint border border-border rounded-2xl text-xs font-black uppercase tracking-widest text-foreground/80 hover:text-foreground hover:bg-surface-tint-strong transition-all">
            <Calendar className="w-4 h-4" /> Schedule Audit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Readiness Score */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-8 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 blur-[40px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
            <p className="relative z-10 text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-6 italic text-gradient">Readiness Pulse</p>
            <div className="relative z-10 inline-flex items-center justify-center w-36 h-36 rounded-full border-8 border-border-subtle relative mb-6">
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="72" cy="72" r="64" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="402.12" strokeDashoffset={402.12 * (1 - 0.88)} strokeLinecap="round" className="text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
               </svg>
               <span className="text-4xl font-black text-foreground tracking-tighter">88<span className="text-lg text-subtle-foreground">%</span></span>
            </div>
            <p className="relative z-10 text-sm font-black text-foreground uppercase tracking-tight">Institutional Health</p>
            <p className="relative z-10 text-[10px] font-bold text-subtle-foreground mt-2 uppercase tracking-widest">Target: 95% Node sync</p>
          </div>

          <div className="glass-card p-8 bg-indigo-600 shadow-lg shadow-indigo-600/20 border-indigo-500 relative overflow-hidden group hover:scale-[1.02]">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-surface-tint-strong blur-3xl rounded-full" />
            <Lock className="w-8 h-8 mb-6 text-foreground/50 group-hover:text-foreground transition-colors" />
            <h4 className="font-black text-foreground text-lg tracking-tight mb-3">Secure Exam Workflows</h4>
            <p className="text-xs text-indigo-100 mb-8 font-medium leading-relaxed italic opacity-80">
              "Ensuring full custody of assessment material through encrypted institutional records."
            </p>
            <button className="w-full py-3 bg-surface-tint-strong hover:bg-foreground/20 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-foreground/20">
              Verify Exam Vault
            </button>
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="lg:col-span-3 glass-card p-10">
          <h3 className="font-black text-foreground text-xl uppercase tracking-tighter mb-10 flex items-center gap-4">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
            Compliance Telemetry Log
          </h3>
          <div className="space-y-10 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-surface-tint">
            {[
              { type: 'success', title: 'External Moderation Completed', desc: 'Faculty of Engineering (Civil & Mech) passed with no findings.', time: 'Today, 10:45 AM', user: 'External Auditor' },
              { type: 'warning', title: 'Missing Evidence Flagged', desc: 'CS Dept has 12 modules missing Study Guides for 2026S2.', time: 'Yesterday, 4:20 PM', user: 'AI Compliance Guard' },
              { type: 'success', title: 'DVC Governance Review', desc: 'Institutional audit readiness approved for Council submission.', time: 'May 12, 2026', user: 'DVC Office' },
              { type: 'error', title: 'Security Breach Blocked', desc: 'Unauthorized access attempt to Exam Vault for module MAT301.', time: 'May 10, 2026', user: 'Platform Security' },
            ].map((log, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="flex items-start gap-8 relative group"
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 border transition-all duration-500 group-hover:scale-110 shadow-lg",
                  log.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                  log.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                )}>
                  {log.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-1">
                    <h4 className="text-sm font-black text-foreground tracking-tight">{log.title}</h4>
                    <span className="text-[10px] text-subtle-foreground font-black uppercase tracking-widest bg-surface-tint px-2 py-0.5 rounded border border-border-subtle">{log.user}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-2xl">{log.desc}</p>
                  <p className="text-[10px] font-black text-subtle-foreground mt-3 uppercase tracking-widest italic">{log.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
