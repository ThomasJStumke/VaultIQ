import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertOctagon, 
  Target, 
  Building2, 
  Library,
  ChevronRight,
  Download,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import ComplianceHeatmap from './ComplianceHeatmap';

export default function ExecutiveAnalytics() {
  const faculties = [
    { name: 'Engineering & Built Environment', rate: 88, risk: 'LOW', modules: 142 },
    { name: 'Informatics & Design', rate: 72, risk: 'MEDIUM', modules: 98 },
    { name: 'Business & Management Sciences', rate: 64, risk: 'HIGH', modules: 210 },
    { name: 'Applied Sciences', rate: 91, risk: 'LOW', modules: 86 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Strategic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded">Institutional Oversight</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Strategic <span className="text-indigo-500">Compliance Analytics</span></h2>
          <p className="text-slate-500 font-medium mt-2">Predictive risk modeling and cross-faculty audit readiness.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white/5 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition border border-white/10">
            <Download className="w-4 h-4" /> Global Audit Report
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-95">
            <Zap className="w-4 h-4" /> Generate PRE-Review Packs
          </button>
        </div>
      </div>

      {/* Institutional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Compliance Index" value="78.4%" icon={Target}趋势={+2.4} color="blue" />
        <KPICard title="Audit Overdue" value="14" icon={AlertOctagon}趋势={-3} color="rose" />
        <KPICard title="Retention Risk" value="High" icon={ShieldAlert}趋势={+12} color="amber" />
        <KPICard title="Moderation Yield" value="94%" icon={BarChart3}趋势={+0.5} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Faculty Rankings */}
        <div className="lg:col-span-1 glass-card p-8">
          <h4 className="text-xl font-black text-white tracking-tight mb-6 flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-500" /> Faculty Rankings
          </h4>
          <div className="space-y-6">
            {faculties.map((faculty, idx) => (
              <div key={idx} className="space-y-2 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 group-hover:text-white transition uppercase tracking-widest">{faculty.name}</p>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded",
                    faculty.risk === 'LOW' ? "text-emerald-500 bg-emerald-500/10" : 
                    faculty.risk === 'MEDIUM' ? "text-amber-500 bg-amber-500/10" : "text-rose-500 bg-rose-500/10"
                  )}>
                    {faculty.rate}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${faculty.rate}%` }}
                    className={cn(
                      "h-full rounded-full",
                      faculty.rate > 80 ? "bg-emerald-500" : 
                      faculty.rate > 70 ? "bg-amber-500" : "bg-rose-500"
                    )}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                   <span>{faculty.modules} Modules Tracked</span>
                   <span className="flex items-center gap-1">Risk: {faculty.risk} <ChevronRight className="w-2 h-2" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="lg:col-span-2">
           <ComplianceHeatmap />
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="glass-card p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <Zap className="w-32 h-32 text-indigo-500/5 -rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-3xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-white tracking-tighter">Predictive Audit Readiness</h4>
              <p className="text-slate-500 text-sm font-medium">AI analysis suggests a 15% increase in compliance failures next semester based on current staffing drifts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Immediate Risks</p>
              <RiskItem title="CS202 Exam Paper Missing" reason="Internal moderator has not signed off in 14 days." severity="CRITICAL" />
              <RiskItem title="ENG101 Stagnant Progress" reason="No uploads detected in last 21 days." severity="HIGH" />
            </div>
            <div className="space-y-4">
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Growth Indicators</p>
               <RiskItem title="Faculty of Applied Sciences" reason="Achieved 100% compliance 2 weeks early." severity="LOW" />
               <RiskItem title="AI Accuracy Increased" reason="False reject rate dropped below 2%." severity="LOW" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, 趋势, color }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10'
  };

  return (
    <div className="glass-card p-6 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn(
          "text-[10px] font-black flex items-center gap-1",
          趋势 > 0 ? "text-emerald-500" : "text-rose-500"
        )}>
          {趋势 > 0 ? '+' : ''}{趋势}%
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{value}</p>
    </div>
  );
}

function RiskItem({ title, reason, severity }: any) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer hover:bg-white/[0.08] transition">
      <div className={cn(
        "w-2 h-2 rounded-full mt-2 shrink-0",
        severity === 'CRITICAL' ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : 
        severity === 'HIGH' ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
      )} />
      <div>
        <h5 className="text-xs font-black text-white tracking-wide">{title}</h5>
        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{reason}</p>
      </div>
    </div>
  );
}
