import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sentry-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    // Manual override takes precedence, then OS preference
    const saved = localStorage.getItem('sentry-reduced-motion');
    if (saved === 'true')  return true;
    if (saved === 'false') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('sentry-theme', theme);
    if (theme === 'dark') root.classList.add('dark');
    else                  root.classList.remove('dark');
  }, [theme]);

  // Apply reduced-motion flag to <html> + persist
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) root.setAttribute('data-reduced-motion', 'true');
    else               root.removeAttribute('data-reduced-motion');
    localStorage.setItem('sentry-reduced-motion', String(reducedMotion));
  }, [reducedMotion]);

  // Sync with OS prefers-reduced-motion changes (only if no manual override)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('sentry-reduced-motion')) {
        setReducedMotion(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark');
  const toggleReducedMotion = () => setReducedMotion(p => !p);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, reducedMotion, toggleReducedMotion }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};