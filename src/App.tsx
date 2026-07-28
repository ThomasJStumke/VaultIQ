import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { supabase, isImpersonationTab } from './lib/supabase';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import MainApp from './components/MainApp';
import PublicSurveyResponse from './components/PublicSurveyResponse';
import { ShieldAlert, Eye, X } from 'lucide-react';

// "View as user" bootstrap: a tab opened from Platform Setup > Users carries
// ?impersonate=<profileId> plus the admin's access token in the URL hash
// (fragment, never sent to the server, unlike a query param). This runs once
// before anything else renders: trade that token for a real session as the
// target user via /api/impersonate + verifyOtp, then strip the hash so the
// admin's token never lingers in the address bar or browser history.
function useImpersonationBootstrap() {
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>(
    isImpersonationTab ? 'pending' : 'idle'
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isImpersonationTab) return;

    (async () => {
      const targetUserId = new URLSearchParams(window.location.search).get('impersonate');
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const adminToken = hashParams.get('admin_token');
      history.replaceState(null, '', window.location.pathname + window.location.search);

      if (!targetUserId || !adminToken) {
        setError('Missing impersonation parameters.');
        setStatus('error');
        return;
      }

      try {
        const res = await fetch('/api/impersonate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ targetUserId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to start impersonation session');

        const { error: otpError } = await supabase.auth.verifyOtp({
          email: body.email,
          token: body.hashedToken,
          type: 'magiclink',
        });
        if (otpError) throw otpError;

        setStatus('done');
      } catch (err: any) {
        setError(err.message || 'Failed to start impersonation session');
        setStatus('error');
      }
    })();
  }, []);

  return { status, error };
}

const ImpersonationBanner: React.FC<{ displayName: string }> = ({ displayName }) => (
  <div className="sticky top-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest">
    <Eye className="w-4 h-4" />
    Viewing as {displayName} — this is a real session, actions are performed as them
    <button
      onClick={() => window.close()}
      className="ml-2 flex items-center gap-1 bg-amber-950/10 hover:bg-amber-950/20 px-2 py-1 rounded-md transition"
    >
      <X className="w-3 h-3" /> Close Preview
    </button>
  </div>
);

const Root: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const impersonation = useImpersonationBootstrap();

  // Parse URL query parameter for survey tokens
  const urlParams = new URLSearchParams(window.location.search);
  const surveyToken = urlParams.get('token') || urlParams.get('survey_token');

  if (surveyToken) {
    return <PublicSurveyResponse token={surveyToken} />;
  }

  if (isImpersonationTab && (impersonation.status === 'pending' || loading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-subtle-foreground font-bold uppercase tracking-widest text-sm">Starting impersonation session...</p>
      </div>
    );
  }

  if (isImpersonationTab && impersonation.status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-red-500" />
        <p className="text-white font-bold">Couldn't start impersonation session</p>
        <p className="text-subtle-foreground text-sm max-w-md">{impersonation.error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-subtle-foreground font-bold uppercase tracking-widest text-sm">Initializing AegisEDU...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return showSignup ? (
      <SignupPage onBackToLogin={() => setShowSignup(false)} />
    ) : (
      <LoginPage onShowSignup={() => setShowSignup(true)} />
    );
  }

  return (
    <>
      {isImpersonationTab && <ImpersonationBanner displayName={profile.displayName} />}
      <MainApp />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
}
