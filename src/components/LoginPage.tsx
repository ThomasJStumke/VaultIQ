import React, { useState } from 'react';
import { ShieldCheck, Database, Cpu, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';

interface LoginPageProps {
  onShowSignup: () => void;
}

export default function LoginPage({ onShowSignup }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="glow-indigo top-[-10%] left-[-10%] opacity-40" />
      <div className="glow-blue bottom-[-10%] right-[-10%] opacity-30" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-500/10 blur-[100px] rounded-full" />

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
              The Next Frontier in <span className="text-indigo-400">Governance.</span>
            </motion.h2>
            <p className="text-slate-400 text-lg leading-relaxed font-medium">
              A comprehensive academic compliance ecosystem powered by secure institutional records.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {[
            { icon: Database, title: 'Institutional Records', desc: 'Secure preservation of academic evidence.' },
            { icon: Cpu, title: 'Compliance Tracking', desc: 'Automated compliance checking for all uploads.' },
            { icon: Lock, title: 'Exam Security', desc: 'Bank-grade protection for assessment workflows.' },
            { icon: ShieldCheck, title: 'Audit Readiness', desc: 'Instant reporting for external moderators.' },
          ].map((feature, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 + 0.5 }}
              key={i} 
              className="flex gap-4 p-4 glass-card"
            >
              <feature.icon className="w-6 h-6 text-indigo-400 mt-1 shrink-0" />
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
        <div className="w-full max-w-md glass-card p-10 shadow-2xl">
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter">VaultIQ</h1>
          </div>

          <div className="mb-12">
            <div className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
              Institutional Access
            </div>
            <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Portal Entry</h3>
            <p className="text-slate-400 font-medium tracking-wide text-sm">
              Please sign in with your official university credentials to access the academic governance system.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.ac.za"
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 rounded-2xl text-white font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>

            <button
              type="button"
              onClick={onShowSignup}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-bold hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
            >
              Create an account
            </button>
          </form>
        </div>

        <footer className="mt-12 flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <span>v1.0.4 Enterprise</span>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          <span>Status: <span className="text-emerald-500">All Systems Operational</span></span>
        </footer>
      </div>
    </div>
  );
}
