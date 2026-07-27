import React, { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'LECTURER', label: 'Lecturer' },
  { value: 'HOD', label: 'HOD' },
  { value: 'PROGRAMME_COORDINATOR', label: 'Programme Coordinator' },
  { value: 'FACULTY_ADMIN', label: 'Faculty Admin' },
  { value: 'DEPUTY_DEAN', label: 'Deputy Dean' },
  { value: 'EXECUTIVE_DEAN', label: 'Executive Dean' },
  { value: 'DVC_TL', label: 'DVC: T&L' },
  { value: 'CQPA', label: 'CQPA' },
  { value: 'QPO', label: 'QPO' },
  { value: 'INTERNAL_MODERATOR', label: 'Internal Moderator' },
  { value: 'EXTERNAL_MODERATOR', label: 'External Moderator' },
  { value: 'AUDITOR', label: 'Auditor' },
  { value: 'EXAMS', label: 'Exams' },
];

interface SignupPageProps {
  onBackToLogin: () => void;
}

export default function SignupPage({ onBackToLogin }: SignupPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('LECTURER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      // The chosen role travels in auth user_metadata; a DB trigger
      // (handle_new_vaultiq_user) reads it and inserts the actual
      // user_type row server-side — the very first account ever created
      // is made SUPER_ADMIN there regardless of what's selected here.
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role } },
      });

      if (signUpError) throw signUpError;

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans relative overflow-hidden p-8">
      <div className="glow-indigo top-[-10%] left-[-10%] opacity-40" />
      <div className="glow-blue bottom-[-10%] right-[-10%] opacity-30" />

      <div className="w-full max-w-md glass-card p-10 shadow-2xl relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter">VaultIQ</h1>
        </div>

        {success ? (
          <div className="space-y-6 text-center py-8">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-xl font-black text-white mb-2">Check your email</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                We sent a confirmation link to <span className="text-white">{email}</span>. Confirm it, then sign in.
              </p>
            </div>
            <button
              onClick={onBackToLogin}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 transition-all"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                Institutional Access
              </div>
              <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Create Account</h3>
              <p className="text-slate-400 font-medium tracking-wide text-sm">
                Register with your institutional email to request access.
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
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
                Create Account
              </button>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-3 text-slate-400 font-bold text-sm hover:text-white transition-colors"
              >
                Already have an account? Sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
