import React from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import MainApp from './components/MainApp';
import PublicSurveyResponse from './components/PublicSurveyResponse';
import { ShieldAlert } from 'lucide-react';

const Root: React.FC = () => {
  const { user, profile, loading } = useAuth();

  // Parse URL query parameter for survey tokens
  const urlParams = new URLSearchParams(window.location.search);
  const surveyToken = urlParams.get('token') || urlParams.get('survey_token');

  if (surveyToken) {
    return <PublicSurveyResponse token={surveyToken} />;
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
    return <LoginPage />;
  }

  return <MainApp />;
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
