import React from 'react';
import { ShieldCheck, LogIn, Database, Cpu, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';

export default function LoginPage() {
  const { login, loginError } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="glow-indigo top-[-10%] left-[-10%] opacity-40" />
      <div className="glow-blue bottom-[-10%] right-[-10%] opacity-30" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[#00a4ef]/5 blur-[100px] rounded-full" />

      {/* Visual Side with Explicit Deep Space Dark Contrast */}
      <div className="hidden lg:flex lg:w-1/2 p-20 flex-col justify-between relative z-10 bg-[#090d16] border-r border-[#1e293b]">
        <div className="space-y-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 ring-1 ring-white/10 shrink-0">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tighter">VaultIQ</h1>
          </div>
          
          <div className="space-y-8 max-w-lg">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="text-6xl font-black text-white leading-[1.05] tracking-tight"
            >
              Academic <span className="text-[#818cf8]">Governance.</span> Secure.
            </motion.h2>
            <p className="text-slate-400 text-lg leading-relaxed font-medium">
              A comprehensive academic compliance ecosystem powered by secure institutional records and Gemini AI document validation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {[
            { icon: Database, title: 'Institutional Records', desc: 'Secure preservation of academic evidence.' },
            { icon: Cpu, title: 'AI Validation', desc: 'Automated compliance checking for all uploads.' },
            { icon: Lock, title: 'Exam Security', desc: 'Bank-grade protection for assessment workflows.' },
            { icon: ShieldCheck, title: 'Audit Readiness', desc: 'Instant reporting for external moderators.' },
          ].map((feature, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 + 0.5 }}
              key={i}
              className="flex gap-4 p-4 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl"
            >
              <feature.icon className="w-6 h-6 text-[#818cf8] mt-1 shrink-0" />
              <div>
                <h4 className="text-white font-bold text-sm">{feature.title}</h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10">
        <div className="w-full max-w-md glass-card p-10 shadow-2xl space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-foreground w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tighter">VaultIQ</h1>
          </div>

          <div>
            <div className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
              DUT Institutional Access
            </div>
            <h3 className="text-3xl font-black text-foreground mb-3 tracking-tight">Portal Entry</h3>
            <p className="text-muted-foreground font-medium tracking-wide text-sm leading-relaxed">
              Please sign in with your official **DUT Microsoft** email credentials. Access is restricted to registered academic staff.
            </p>
          </div>

          <div className="space-y-6">
            {loginError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold leading-relaxed space-y-1">
                <p className="uppercase tracking-widest text-[10px] text-rose-300 font-black">Access Blocked</p>
                <p>{loginError}</p>
              </div>
            )}

            <button 
              onClick={login}
              className="w-full flex items-center justify-center gap-3.5 py-4 bg-surface-tint border border-border rounded-2xl text-foreground font-bold hover:bg-surface-tint-strong hover:border-foreground/20 transition-all group shadow-xl active:scale-95 cursor-pointer"
            >
              {/* CSS-Only Microsoft Quad Logo */}
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0">
                <div className="bg-[#f25022] w-1.5 h-1.5" />
                <div className="bg-[#7fba00] w-1.5 h-1.5" />
                <div className="bg-[#00a4ef] w-1.5 h-1.5" />
                <div className="bg-[#ffb900] w-1.5 h-1.5" />
              </div>
              Sign in with DUT Microsoft Account
            </button>

            <div className="relative py-2 flex items-center gap-4">
              <div className="flex-1 h-px bg-surface-tint" />
              <span className="text-[10px] font-bold text-subtle-foreground uppercase tracking-widest">Enterprise SSO</span>
              <div className="flex-1 h-px bg-surface-tint" />
            </div>

            <div className="p-4 bg-surface-sunken rounded-2xl border border-border-subtle">
              <p className="text-[10px] text-subtle-foreground font-bold italic leading-relaxed uppercase tracking-widest">
                All sessions are monitored and recorded for institutional audit readiness and compliance.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-12 flex items-center gap-4 text-[10px] font-bold text-subtle-foreground uppercase tracking-widest">
          <span>v1.0.4 Enterprise</span>
          <div className="w-1.5 h-1.5 rounded-full bg-surface-2" />
          <span>Status: <span className="text-emerald-500">All Systems Operational</span></span>
        </footer>
      </div>
    </div>
  );
}
