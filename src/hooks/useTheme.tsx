import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'vaultiq-theme';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// SVG chart libraries (recharts, d3, ...) generally can't resolve CSS custom
// properties through their `fill`/`stroke`/style-object props reliably, so
// chart color constants are computed here in JS, keyed off the same theme
// state, rather than trying to reuse the CSS tokens directly. Any future
// chart component should pull its palette from here instead of hard-coding
// hex values.
export function useChartColors() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  return {
    grid: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)',
    tick: isLight ? '#475569' : '#94a3b8',
    cursor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)',
    tooltipBg: isLight ? '#ffffff' : '#0f172a',
    tooltipBorder: isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)',
    tooltipShadow: isLight ? '0 25px 50px -12px rgba(15,23,42,0.15)' : '0 25px 50px -12px rgba(0,0,0,0.5)',
  };
}
