import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import MainApp from './components/MainApp';
import { ShieldAlert } from 'lucide-react';

const Root: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Initializing AegisEDU...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
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
