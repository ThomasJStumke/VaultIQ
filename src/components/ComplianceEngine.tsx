import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  FileWarning,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ComplianceLevel, ComplianceRequirement } from '../types';
import { motion } from 'motion/react';

const STATUS_CONFIG: Record<ComplianceLevel, { label: string; icon: any; color: string; bg: string }> = {
  COMPLIANT: { label: 'Compliant', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  PENDING: { label: 'Pending', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  AT_RISK: { label: 'At Risk', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  NON_COMPLIANT: { label: 'Non-Compliant', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

export default function ComplianceEngine() {
  const [activeTab, setActiveTab] = useState<'overall' | 'rules'>('overall');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-foreground tracking-tighter">Compliance <span className="text-indigo-500">Rules Engine</span></h2>
          <p className="text-subtle-foreground font-medium mt-2">Real-time academic governance and risk scoring.</p>
        </div>
        <div className="flex bg-surface-tint p-1 rounded-xl border border-border">
          <button 
            onClick={() => setActiveTab('overall')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
              activeTab === 'overall' ? "bg-indigo-600 text-foreground shadow-lg shadow-indigo-600/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Institutional Health
          </button>
          <button 
            onClick={() => setActiveTab('rules')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
              activeTab === 'rules' ? "bg-indigo-600 text-foreground shadow-lg shadow-indigo-600/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Dynamic Ruleset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <StatCard label="Overall Score" value={84} trend="+2%" icon={Activity} />
        <StatCard label="Compliant Modules" value={142} trend="+12" icon={CheckCircle2} color="emerald" />
        <StatCard label="Critical Risks" value={8} trend="-3" icon={ShieldAlert} color="rose" />
        <StatCard label="Pending Audits" value={24} trend="+5" icon={ShieldCheck} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-foreground font-black tracking-tight">Active Module Compliance</h3>
              <select className="bg-transparent text-xs font-bold text-subtle-foreground border-none focus:ring-0 cursor-pointer">
                <option>Filter by Faculty</option>
                <option>Science</option>
                <option>Business</option>
                <option>Law</option>
              </select>
            </div>
            
            <div className="divide-y divide-white/5">
              <ComplianceRow code="ENG101" name="Software Engineering" score={92} status="COMPLIANT" items={0} />
              <ComplianceRow code="MAT202" name="Advanced Calculus" score={68} status="AT_RISK" items={2} />
              <ComplianceRow code="LAW301" name="Corporate Governance" score={34} status="NON_COMPLIANT" items={4} />
              <ComplianceRow code="PHY101" name="Introductory Physics" score={85} status="PENDING" items={1} />
            </div>
          </div>
        </div>

        {/* Sidebar Intelligence */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6">
             <h3 className="text-foreground font-black tracking-tight mb-6 flex items-center gap-2">
               <TrendingDown className="w-4 h-4 text-rose-500" /> Escalation Alerts
             </h3>
             <div className="space-y-4">
                <NotificationItem 
                  role="HoD Approval Required" 
                  text="ENG101 Moderation report pending for 48h."
                  time="2h ago"
                  severity="medium"
                />
                <NotificationItem 
                  role="CQPA Systematic Risk" 
                  text="Faculty of Law showing 15% drop in primary compliance."
                  time="5h ago"
                  severity="high"
                />
                <NotificationItem 
                  role="Lecturer Reminder" 
                  text="MAT202 Exam Paper deadline approaching (T-7)."
                  time="1d ago"
                  severity="low"
                />
             </div>
             <button className="w-full mt-6 py-3 bg-surface-tint hover:bg-surface-tint-strong rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground transition">
               View All Governance Logs
             </button>
          </div>

          <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl relative overflow-hidden shadow-2xl shadow-indigo-600/20">
            <ShieldCheck className="absolute -right-8 -bottom-8 w-40 h-40 text-foreground/10" />
            <h3 className="text-foreground font-black text-xl tracking-tighter mb-2 relative z-10">AI Audit Ready</h3>
            <p className="text-indigo-100 text-sm font-medium mb-6 relative z-10">VaultIQ is currently validating artifacts against HEQC national standards.</p>
            <div className="bg-surface-tint-strong backdrop-blur-md rounded-2xl p-4 relative z-10 border border-foreground/20">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-black text-foreground/60 uppercase tracking-widest">Processing</span>
                 <span className="text-[10px] font-black text-foreground uppercase tabular-nums">74%</span>
               </div>
               <div className="h-1.5 bg-surface-tint-strong rounded-full overflow-hidden">
                 <div className="h-full bg-white w-[74%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, icon: Icon, color = 'indigo' }: any) {
  const colors: any = {
    indigo: 'text-indigo-500 bg-indigo-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
    blue: 'text-blue-500 bg-blue-500/10'
  };

  return (
    <div className="glass-card p-6 flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-foreground tabular-nums tracking-tighter">{value}</p>
        <div className="flex items-center gap-1 mt-2">
          <span className={cn("text-[10px] font-black", trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500')}>
            {trend}
          </span>
          <span className="text-[10px] font-bold text-subtle-foreground uppercase tracking-widest">vs last sem</span>
        </div>
      </div>
      <div className={cn("p-3 rounded-2xl shadow-inner", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function ComplianceRow({ code, name, score, status, items }: any) {
  const config = STATUS_CONFIG[status as ComplianceLevel];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between p-6 hover:bg-foreground/[0.02] transition-colors">
      <div className="flex items-center gap-6">
        <div className="w-16 h-12 bg-surface-tint border border-border rounded-xl flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-foreground tracking-tighter">{code}</p>
          <p className="text-[8px] font-bold text-subtle-foreground uppercase">2026</p>
        </div>
        <div>
          <p className="text-sm font-black text-foreground tracking-tight">{name}</p>
          <div className="flex items-center gap-4 mt-1">
             <div className="flex items-center gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
               <span className="text-[10px] font-bold text-subtle-foreground uppercase tracking-widest">Faculty of Science</span>
             </div>
             {items > 0 && (
               <div className="flex items-center gap-1">
                 <FileWarning className="w-3 h-3 text-amber-500" />
                 <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{items} Missing Artifacts</span>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-12">
        <div className="hidden lg:block w-32">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-subtle-foreground uppercase tracking-widest">Health</span>
            <span className="text-[10px] font-black text-foreground tabular-nums">{score}%</span>
          </div>
          <div className="h-1 bg-surface-tint rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-1000", score > 80 ? 'bg-emerald-500' : score > 50 ? 'bg-amber-500' : 'bg-rose-500')} 
              style={{ width: `${score}%` }} 
            />
          </div>
        </div>

        <div className={cn("px-4 py-2 rounded-xl flex items-center gap-2 border border-border min-w-[140px]", config.bg)}>
          <Icon className={cn("w-4 h-4", config.color)} />
          <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>
            {config.label}
          </span>
        </div>

        <button className="p-2.5 hover:bg-surface-tint-strong rounded-xl text-subtle-foreground hover:text-foreground transition-all">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function NotificationItem({ role, text, time, severity }: any) {
  return (
    <div className="p-4 bg-surface-tint border border-border rounded-2xl relative overflow-hidden group">
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        severity === 'high' ? 'bg-rose-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
      )} />
      <div className="flex justify-between items-start mb-1">
        <p className="text-[10px] font-black text-foreground tracking-tight uppercase">{role}</p>
        <span className="text-[9px] font-bold text-subtle-foreground uppercase">{time}</span>
      </div>
      <p className="text-xs text-muted-foreground font-medium leading-relaxed">{text}</p>
    </div>
  );
}
