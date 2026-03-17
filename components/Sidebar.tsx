import React from 'react';
import { ViewState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenPalette: () => void;
}

// ── Nav group structure ──────────────────────────────────────────────────────

interface NavItem {
  view: ViewState;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const makeIcon = (d: string | string[]) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {(Array.isArray(d) ? d : [d]).map((path, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    ))}
  </svg>
);

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Intelligence',
    items: [
      {
        view: ViewState.COMPETITOR_INTEL,
        label: 'Competitor Intel',
        icon: makeIcon(['M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z']),
      },
      {
        view: ViewState.CSO_INTELLIGENCE,
        label: 'CSO Intelligence',
        icon: makeIcon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
      },
      {
        view: ViewState.REGULATORY_INTEL,
        label: 'Regulatory Intel',
        icon: makeIcon('M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'),
      },
      {
        view: ViewState.INCIDENT_INTEL,
        label: 'Incident Intel',
        icon: makeIcon(['M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z']),
      },
      {
        view: ViewState.COMPETITOR_ANALYSIS,
        label: 'Market Analysis',
        icon: makeIcon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'),
      },
      {
        view: ViewState.RISK_MAP,
        label: 'Risk Map 3D',
        icon: makeIcon(['M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z']),
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        view: ViewState.HOME,
        label: 'Command Center',
        icon: makeIcon(['M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6']),
      },
      {
        view: ViewState.DIRECTORY,
        label: 'Vendor Directory',
        icon: makeIcon('M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'),
      },
      {
        view: ViewState.PROJECTS,
        label: 'Project Portfolio',
        icon: makeIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'),
      },
      {
        view: ViewState.REQUEST_ASSESSMENT,
        label: 'Security Assessment',
        icon: makeIcon('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'),
      },
      {
        view: ViewState.REQUEST_LAB_VISIT,
        label: 'Emerging Tech Lab',
        icon: makeIcon('M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'),
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        view: ViewState.ARCHITECTURE,
        label: 'Architecture',
        icon: makeIcon('M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'),
      },
      {
        view: ViewState.ADMIN,
        label: 'VAR Admin',
        icon: makeIcon(['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z']),
      },
    ],
  },
];

// ── Icon helpers ─────────────────────────────────────────────────────────────

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

/** Animated-wave icon = motion ON.  Static parallel lines = motion OFF. */
const MotionOnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 12h2M20 12h2M6.34 6.34l1.42 1.42M16.24 16.24l1.42 1.42M6.34 17.66l1.42-1.42M16.24 7.76l1.42-1.42"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

const MotionOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="8" x2="19" y2="8"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <line x1="5" y1="16" x2="19" y2="16"/>
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onOpenPalette }) => {
  const { theme, toggleTheme, reducedMotion, toggleReducedMotion } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside
      className="w-60 shrink-0 flex flex-col overflow-y-auto relative scan-lines"
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

      {/* ── Brand block ─────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--s-border-light)' }}>
        <div className="flex items-center justify-between mb-3">
          {/* Walmart spark + wordmark */}
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="w-5 h-5 shrink-0" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="#FFC220"/>
              <g fill="#001E60">
                <rect x="14.5" y="2"  width="3" height="12" rx="1.5"/>
                <rect x="14.5" y="18" width="3" height="12" rx="1.5"/>
                <rect x="2"  y="14.5" width="12" height="3" rx="1.5"/>
                <rect x="18" y="14.5" width="12" height="3" rx="1.5"/>
                <rect x="5.5" y="5.5"   width="3" height="10" rx="1.5" transform="rotate(45 7 10.5)"/>
                <rect x="18.5" y="18.5" width="3" height="10" rx="1.5" transform="rotate(45 20 23.5)"/>
              </g>
            </svg>
            <span className="text-[10px] font-bold text-wmt-yellow tracking-[0.2em] uppercase">Walmart</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200"
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
        <h1 className="text-xl font-black tracking-[0.18em] leading-none" style={{ color: 'var(--s-text)' }}>
          SENTRY
        </h1>
        <div className="mt-1.5 space-y-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#4DBDF5' }}>
            Global Security, Aviation &amp; Investigations
          </p>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--s-text-dim)' }}>
            Enterprise Security
          </p>
        </div>
      </div>

      {/* ── Cmd+K Search pill ───────────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onOpenPalette}
          aria-label="Open command palette (Ctrl+K)"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150"
          style={{
            background: 'var(--s-modal-inner)',
            border: '1px solid var(--s-border)',
            color: 'var(--s-text-dim)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,83,226,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--s-border)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="text-[11px] flex-1">Quick jump…</span>
          <kbd
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--s-border)', color: 'var(--s-text-dim)', border: '1px solid var(--s-border-mid)' }}
            aria-label="Keyboard shortcut Ctrl K"
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Grouped Navigation ──────────────────────────────── */}
      <nav className="flex flex-col gap-0 px-2 pt-1 pb-2 flex-grow" aria-label="Site sections">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-2">
            {/* Section header */}
            <p
              className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--s-text-dim)' }}
              aria-hidden="true"
            >
              {group.label}
            </p>

            {/* Items */}
            {group.items.map(item => {
              const active = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold
                              transition-all duration-200 group overflow-hidden
                              focus-visible:ring-2 focus-visible:ring-wmt-blue focus-visible:outline-none ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={active ? {
                    background: 'linear-gradient(90deg, rgba(0,83,226,0.22) 0%, rgba(0,83,226,0.06) 100%)',
                    boxShadow: 'inset 0 0 0 1px rgba(0,83,226,0.35), 0 0 16px rgba(0,83,226,0.12)',
                  } : { background: 'transparent' }}
                >
                  {/* Active left accent */}
                  {active && (
                    <div
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
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
                  <span className="truncate z-10 text-[11px]">{item.label}</span>
                  {/* New badge for Risk Map */}
                  {item.view === ViewState.RISK_MAP && (
                    <span
                      className="z-10 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
                      style={{ background: 'rgba(255,194,32,0.18)', color: '#FFC220', border: '1px solid rgba(255,194,32,0.3)' }}
                    >
                      3D
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--s-border-light)' }}>
        <div className="flex items-center justify-between">
          {/* Version */}
          <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
            SENTRY v2.1
          </p>

          <div className="flex items-center gap-2">
            {/* Motion toggle */}
            <button
              onClick={toggleReducedMotion}
              aria-label={reducedMotion ? 'Enable animations' : 'Reduce motion'}
              title={reducedMotion ? 'Enable animations' : 'Reduce motion (accessibility)'}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200"
              style={{
                background: reducedMotion ? 'rgba(34,197,94,0.12)' : 'var(--s-hover-over)',
                border: reducedMotion ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--s-border)',
                color: reducedMotion ? '#22c55e' : 'var(--s-text-dim)',
              }}
            >
              {reducedMotion ? <MotionOffIcon /> : <MotionOnIcon />}
            </button>

            {/* Backend status */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-ring" />
              </div>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: '#22c55e' }}>Online</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};