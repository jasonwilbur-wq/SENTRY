import React from 'react';
import { ViewState } from '../types';
import { useTheme } from '../context/ThemeContext';
import { trackEvent } from '../services/analytics';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

// ── Nav Items Configuration ──────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    view: ViewState.HOME,
    label: 'Command Center',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h7V3H3v9zm0 9h7v-7H3v7zm11 0h7V12h-7v9zm0-18v7h7V3h-7z" />
      </svg>
    ),
  },
  {
    view: ViewState.DIRECTORY,
    label: 'Vendor Directory',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    view: ViewState.PROJECTS,
    label: 'Project Portfolio',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    view: ViewState.COMPETITOR_ANALYSIS,
    label: 'Market Analysis',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    view: ViewState.COMPETITOR_INTEL,
    label: 'Competitor Intel',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    view: ViewState.CSO_INTELLIGENCE,
    label: 'CSO Intelligence',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    view: ViewState.REGULATORY_INTELLIGENCE,
    label: 'Regulatory Intel',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    view: ViewState.INCIDENT_INTELLIGENCE,
    label: 'Incident Intel',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2l9 16H3l9-16z" />
      </svg>
    ),
  },
  {
    view: ViewState.REQUEST_ASSESSMENT,
    label: 'Security Assessment',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    view: ViewState.REQUEST_LAB_VISIT,
    label: 'Emerging Tech Lab',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    view: ViewState.REQUEST_QUEUE,
    label: 'Request Queue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    view: ViewState.ARCHITECTURE,
    label: 'Architecture',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
  },
  {
    view: ViewState.ADMIN,
    label: 'VAR Admin',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    view: ViewState.RISK_MAP,
    label: 'Risk Map 3D',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.553-.832L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    view: ViewState.WALMART_SPARK,
    label: 'Walmart Spark',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

// ── Sun / Moon SVG icons for theme toggle ────────────────────────────────────
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleNavigate = (view: ViewState, label: string) => {
    trackEvent('sidebar_navigation_clicked', { from: currentView, to: view, label });
    onNavigate(view);
  };

  const handleThemeToggle = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    trackEvent('theme_toggled', { from: theme, to: nextTheme });
    toggleTheme();
  };

  return (
    <aside
      className="w-64 shrink-0 flex flex-col overflow-y-auto relative scan-lines"
      style={{
        background: 'var(--s-sidebar)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderRight: '1px solid var(--s-border)',
      }}
      aria-label="Main navigation"
    >
      {/* Animated top gradient bar */}
      <div
        className="h-[2px] shrink-0 border-glow-yellow"
        style={{ background: 'linear-gradient(90deg, transparent, #FFC220 30%, #0053E2 70%, transparent)' }}
        aria-hidden="true"
      />

      {/* Brand block */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--s-border-light)' }}>
        {/* Walmart row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="w-6 h-6 shrink-0" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="#FFC220"/>
              <g fill="#001E60">
                <rect x="14.5" y="2" width="3" height="12" rx="1.5"/>
                <rect x="14.5" y="18" width="3" height="12" rx="1.5"/>
                <rect x="2" y="14.5" width="12" height="3" rx="1.5"/>
                <rect x="18" y="14.5" width="12" height="3" rx="1.5"/>
                <rect x="5.5" y="5.5" width="3" height="10" rx="1.5" transform="rotate(45 7 10.5)"/>
                <rect x="18.5" y="18.5" width="3" height="10" rx="1.5" transform="rotate(45 20 23.5)"/>
              </g>
            </svg>
            <span className="text-[10px] font-bold text-wmt-yellow tracking-[0.2em] uppercase">Walmart</span>
          </div>

          {/* Theme toggle — icon button with SVG sun/moon */}
          <button
            onClick={handleThemeToggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200"
            style={{
              background: isDark ? 'rgba(255,194,32,0.12)' : 'rgba(0,83,226,0.12)',
              border: isDark ? '1px solid rgba(255,194,32,0.25)' : '1px solid rgba(0,83,226,0.25)',
              color: isDark ? '#FFC220' : '#0053E2',
            }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        {/* Product name */}
        <h1
          className="text-2xl font-black tracking-[0.18em] leading-none"
          style={{ color: 'var(--s-text)', letterSpacing: '0.18em' }}
        >
          SENTRY
        </h1>

        {/* Org */}
        <div className="mt-2 space-y-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#4DBDF5' }}>
            Global Security, Aviation &amp; Investigations
          </p>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--s-text-dim)' }}>
            Enterprise Security
          </p>
        </div>
      </div>

      {/* Nav — relative container for the sliding active indicator */}
      <nav className="flex flex-col gap-0.5 p-3 flex-grow" aria-label="Site sections">
        {NAV_ITEMS.map(item => {
          const active = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view, item.label)}
              aria-current={active ? 'page' : undefined}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold
                          transition-all duration-200 group overflow-hidden
                          focus-visible:ring-2 focus-visible:ring-wmt-blue focus-visible:outline-none ${
                active
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={active ? {
                background: 'linear-gradient(90deg, rgba(0,83,226,0.22) 0%, rgba(0,83,226,0.06) 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(0,83,226,0.35), 0 0 16px rgba(0,83,226,0.12)',
              } : {
                background: 'transparent',
              }}
            >
              {/* Animated left accent bar */}
              {active && (
                <div
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                  style={{ background: 'linear-gradient(to bottom, #FFC220, #0053E2)', animation: 'tab-slide 0.2s ease-out both' }}
                  aria-hidden="true"
                />
              )}

              {/* Hover shimmer */}
              {!active && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"
                  style={{ background: 'var(--s-hover-over)' }}
                  aria-hidden="true"
                />
              )}

              <span className={`shrink-0 z-10 transition-colors ${
                active ? 'text-wmt-yellow' : 'text-slate-500 group-hover:text-slate-300'
              }`}>
                {item.icon}
              </span>
              <span className="truncate z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--s-border-light)' }}>
        <div className="flex items-center justify-between">
          <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
            SENTRY v2.0
          </p>
          {/* Backend status dot */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-ring" />
            </div>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#22c55e' }}>Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};