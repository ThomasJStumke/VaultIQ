import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import MainApp from './components/MainApp';
import { ShieldAlert } from 'lucide-react';

const Root: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Initializing AegisEDU...</p>
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

  return <MainApp />;
};

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
