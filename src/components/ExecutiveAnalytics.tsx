import React, { useState } from 'react';
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
  Zap,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ComplianceHeatmap from './ComplianceHeatmap';
import DrillDownExplorer from './DrillDownExplorer';

export default function ExecutiveAnalytics() {
  const [showExplorer, setShowExplorer] = useState(false);
  const [activeFacultyId, setActiveFacultyId] = useState<string | null>(null);
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);

  const faculties = [
    { id: 'FEBE', name: 'Faculty of Engineering & Built Environment', rate: 88, risk: 'LOW', modules: 142 },
    { id: 'FAI', name: 'Faculty of Accounting & Informatics', rate: 78, risk: 'MEDIUM', modules: 198 },
    { id: 'FMS', name: 'Faculty of Management Sciences', rate: 64, risk: 'HIGH', modules: 210 },
    { id: 'FAS', name: 'Faculty of Applied Sciences', rate: 91, risk: 'LOW', modules: 86 },
  ];

  const handleFacultyClick = (facultyId: string) => {
    setActiveFacultyId(facultyId);
    setActiveModuleCode(null);
    setShowExplorer(true);
  };

  const handleGlobalComplianceClick = () => {
    setActiveFacultyId(null);
    setActiveModuleCode(null);
    setShowExplorer(true);
  };

  const handleModuleDrillDown = (moduleCode: string) => {
    setActiveFacultyId(null);
    setActiveModuleCode(moduleCode);
    setShowExplorer(true);
  };

  if (showExplorer) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => { setShowExplorer(false); setActiveFacultyId(null); setActiveModuleCode(null); }}
          className="px-5 py-2.5 bg-surface hover:bg-surface-2 text-foreground/80 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-border transition"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Drill-Down Explorer
        </button>
        <DrillDownExplorer 
          initialFacultyId={activeFacultyId || undefined} 
          initialModuleCode={activeModuleCode || undefined}
          onCloseExternal={() => { setShowExplorer(false); setActiveFacultyId(null); setActiveModuleCode(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Strategic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded">Institutional Oversight</span>
          </div>
          <h2 className="text-4xl font-black text-foreground tracking-tighter">Strategic <span className="text-indigo-500">Compliance Analytics</span></h2>
          <p className="text-subtle-foreground font-medium mt-2">Predictive risk modeling and cross-faculty audit readiness.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleGlobalComplianceClick}
            className="flex items-center gap-2 bg-surface-tint text-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-tint-strong transition border border-border"
          >
            <Download className="w-4 h-4" /> Global Audit Report
          </button>
          <button 
            onClick={() => {
              setActiveFacultyId(null);
              setActiveModuleCode(null);
              setShowExplorer(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Zap className="w-4 h-4" /> Launch Drill-Down Desk
          </button>
        </div>
      </div>

      {/* Drill-down notification */}
      <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="text-xs text-indigo-300 font-semibold">
          <strong className="text-foreground">Interactive Drill-Down Enabled:</strong> Click on any compliance percentage or risk indicator below to navigate directly to original uploaded documents and check evidence logs.
        </p>
      </div>

      {/* Institutional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button 
          onClick={handleGlobalComplianceClick}
          className="text-left w-full transition-transform active:scale-98"
          title="Click to Drill Down"
        >
          <KPICard title="Compliance Index" value="78.4%" icon={Target} 趋势={+2.4} color="blue" isInteractive />
        </button>
        <KPICard title="Audit Overdue" value="14" icon={AlertOctagon} 趋势={-3} color="rose" />
        <KPICard title="Retention Risk" value="High" icon={ShieldAlert} 趋势={+12} color="amber" />
        <KPICard title="Moderation Yield" value="94%" icon={BarChart3} 趋势={+0.5} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Faculty Rankings */}
        <div className="lg:col-span-1 glass-card p-8">
          <h4 className="text-xl font-black text-foreground tracking-tight mb-6 flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-500" /> Faculty Rankings
          </h4>
          <div className="space-y-6">
            {faculties.map((faculty, idx) => (
              <div 
                key={idx} 
                onClick={() => handleFacultyClick(faculty.id)}
                className="space-y-2 group cursor-pointer p-2 -m-2 rounded-xl hover:bg-surface-tint transition"
                title={`Click to drill down to ${faculty.name}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-muted-foreground group-hover:text-indigo-400 transition uppercase tracking-widest">{faculty.name}</p>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded transition duration-300 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-foreground",
                    faculty.risk === 'LOW' ? "text-emerald-500 bg-emerald-500/10" : 
                    faculty.risk === 'MEDIUM' ? "text-amber-500 bg-amber-500/10" : "text-rose-500 bg-rose-500/10"
                  )}>
                    {faculty.rate}%
                  </span>
                </div>
                <div className="h-1.5 bg-surface-tint rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${faculty.rate}%` }}
                    className={cn(
                      "h-full rounded-full transition-colors duration-300 group-hover:bg-indigo-500",
                      faculty.rate > 80 ? "bg-emerald-500" : 
                      faculty.rate > 70 ? "bg-amber-500" : "bg-rose-500"
                    )}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-subtle-foreground">
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
              <h4 className="text-2xl font-black text-foreground tracking-tighter">Predictive Audit Readiness</h4>
              <p className="text-subtle-foreground text-sm font-medium">AI analysis suggests a 15% increase in compliance failures next semester based on current staffing drifts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Immediate Risks</p>
              <div onClick={() => handleModuleDrillDown('MAC201')} title="Click to drill down directly to MAC201">
                <RiskItem title="MAC201 Exam Paper Missing" reason="Internal moderator has not signed off in 14 days." severity="CRITICAL" />
              </div>
              <div onClick={() => handleModuleDrillDown('TAX102')} title="Click to drill down directly to TAX102">
                <RiskItem title="TAX102 Stagnant Progress" reason="No uploads detected in last 21 days." severity="HIGH" />
              </div>
            </div>
            <div className="space-y-4">
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Growth Indicators</p>
               <div onClick={() => handleModuleDrillDown('ITN101')} title="Click to drill down directly to ITN101">
                 <RiskItem title="Faculty of Applied Sciences (ITN101)" reason="Achieved 100% compliance 2 weeks early." severity="LOW" />
               </div>
               <RiskItem title="AI Accuracy Increased" reason="False reject rate dropped below 2%." severity="LOW" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom simple ArrowLeft icon backport
function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7"/>
      <path d="M19 12H5"/>
    </svg>
  );
}

function KPICard({ title, value, icon: Icon, 趋势, color, isInteractive }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10 border border-blue-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border border-rose-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border border-amber-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
  };

  return (
    <div className={cn(
      "glass-card p-6 border border-border-subtle transition duration-300 relative overflow-hidden group",
      isInteractive && "hover:border-indigo-500 hover:bg-indigo-950/5 cursor-pointer shadow-lg hover:shadow-indigo-500/5"
    )}>
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
      <p className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-black text-foreground tracking-tighter tabular-nums">{value}</p>
        {isInteractive && (
          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Drill Down &rarr;
          </span>
        )}
      </div>
    </div>
  );
}

function RiskItem({ title, reason, severity }: any) {
  return (
    <div className="flex items-start gap-4 p-4 bg-surface-tint rounded-2xl border border-border group cursor-pointer hover:bg-foreground/[0.08] transition hover:border-indigo-500/30">
      <div className={cn(
        "w-2 h-2 rounded-full mt-2 shrink-0",
        severity === 'CRITICAL' ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : 
        severity === 'HIGH' ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
      )} />
      <div className="flex-1">
        <h5 className="text-xs font-black text-foreground tracking-wide group-hover:text-indigo-400 transition-colors">{title}</h5>
        <p className="text-[10px] font-bold text-subtle-foreground mt-0.5">{reason}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-subtle-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
