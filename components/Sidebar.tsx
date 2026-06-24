import React from 'react';
import { ViewState } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../services/analytics';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isOpen?: boolean;
  onClose?: () => void;
  backendState?: 'checking' | 'online' | 'offline';
  backendDetail?: string;
}

// ── Nav items grouped into sections — easier to scan than a flat list ───────
type NavItem = {
  view: ViewState;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const ICON = (path: React.ReactNode, twoPath?: React.ReactNode) => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    {path}
    {twoPath}
  </svg>
);

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operate',
    items: [
      {
        view: ViewState.HOME,
        label: 'Mission Control',
        hint: 'Today',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        ),
      },
      {
        view: ViewState.DIRECTORY,
        label: 'Vendor Directory',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        ),
      },
      {
        view: ViewState.PROJECTS,
        label: 'Project Portfolio',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        ),
      },
      {
        view: ViewState.REQUEST_ASSESSMENT,
        label: 'New Assessment',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        ),
      },
      {
        view: ViewState.REQUEST_LAB_VISIT,
        label: 'Lab Visit',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        ),
      },
      {
        view: ViewState.REQUEST_QUEUE,
        label: 'Request Queue',
        adminOnly: true,
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
        ),
      },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        view: ViewState.COMPETITOR_ANALYSIS,
        label: 'Market Analysis',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        ),
      },
      {
        view: ViewState.COMPETITOR_INTEL,
        label: 'Competitor Intel',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        ),
      },
      {
        view: ViewState.EXECUTIVE_INTEL,
        label: 'Executive Intel',
        hint: 'CSO',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
        ),
      },
      {
        view: ViewState.REGULATORY_INTELLIGENCE,
        label: 'Regulatory',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        ),
      },
      {
        view: ViewState.INCIDENT_INTELLIGENCE,
        label: 'Incidents',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2l9 16H3l9-16z" />
        ),
      },
      {
        view: ViewState.INTEL_TIMELINE,
        label: 'Intel Timeline',
        hint: 'New',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        ),
      },
    ],
  },
  {
    title: 'Platform',
    items: [
      {
        view: ViewState.ARCHITECTURE,
        label: 'Architecture',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        ),
      },
      {
        view: ViewState.ADMIN,
        label: 'VAR Admin',
        adminOnly: true,
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        ),
      },
      {
        view: ViewState.SENTINEL,
        label: 'Ask Sentinel',
        hint: 'AI',
        icon: ICON(
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        ),
      },
    ],
  },
];

// ── Sun / Moon icons ────────────────────────────────────────────────────────
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// Walmart spark — used as sidebar brand mark.
const Spark = ({ size = 26 }: { size?: number }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="#FFC220" />
    <g fill="#001E60">
      <rect x="14.5" y="2"  width="3" height="12" rx="1.5" />
      <rect x="14.5" y="18" width="3" height="12" rx="1.5" />
      <rect x="2"    y="14.5" width="12" height="3" rx="1.5" />
      <rect x="18"   y="14.5" width="12" height="3" rx="1.5" />
      <rect x="5.5"  y="5.5"  width="3" height="10" rx="1.5" transform="rotate(45 7 10.5)" />
      <rect x="18.5" y="18.5" width="3" height="10" rx="1.5" transform="rotate(45 20 23.5)" />
    </g>
  </svg>
);

// ── Component ───────────────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen = false,
  onClose,
  backendState = 'checking',
  backendDetail = 'Checking SENTRY data connection',
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, authMode, authProvider, logout } = useAuth();
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

  const statusLabel = backendState === 'offline' ? 'Offline' : backendState === 'checking' ? 'Sync' : 'Live';
  const statusColor = backendState === 'offline' ? '#f87171' : backendState === 'checking' ? '#93c5fd' : '#4ade80';
  const authLabel = authProvider ?? authMode ?? 'auth';

  return (
    <aside
      className={`w-64 shrink-0 flex flex-col overflow-hidden fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:z-auto md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{
        background: 'var(--s-sidebar)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderRight: '1px solid var(--s-border)',
      }}
      aria-label="Main navigation"
    >
      {/* Top accent bar */}
      <div
        className="h-[3px] shrink-0"
        style={{ background: 'linear-gradient(90deg, #001E60 0%, #0053E2 35%, #FFC220 100%)' }}
        aria-hidden
      />

      {/* Brand block */}
      <div className="px-5 pt-5 pb-5" style={{ borderBottom: '1px solid var(--s-border-light)' }}>
        <div className="flex items-center gap-3">
          <Spark size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.32em]" style={{ color: '#FFC220' }}>
              Walmart
            </p>
            <h1
              className="text-[22px] font-black tracking-[0.18em] leading-none mt-1"
              style={{ color: 'var(--s-text)' }}
            >
              SENTRY
            </h1>
          </div>
          <button
            onClick={handleThemeToggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-110"
            style={{
              background: isDark ? 'rgba(255,194,32,0.12)' : 'rgba(0,83,226,0.12)',
              border: isDark ? '1px solid rgba(255,194,32,0.25)' : '1px solid rgba(0,83,226,0.25)',
              color: isDark ? '#FFC220' : '#0053E2',
            }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--s-text)', border: '1px solid var(--s-border)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="text-xs uppercase tracking-[0.14em] mt-3" style={{ color: 'var(--s-text-dim)' }}>
          Global Security, Strategy &amp; Innovation
        </p>
      </div>

      {/* Nav — grouped, scroll-isolated */}
      <nav className="flex flex-col gap-4 p-3 flex-grow overflow-y-auto" aria-label="Site sections">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => !item.adminOnly || user?.is_admin);
          if (visibleItems.length === 0) return null;

          return (
          <div key={group.title} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 px-3 mb-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: 'var(--s-text-faint)' }}>
                {group.title}
              </p>
              <div className="h-px flex-1" style={{ background: 'var(--s-border-light)' }} />
            </div>
            {visibleItems.map(item => {
              const active = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavigate(item.view, item.label)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold
                              transition-[background,color,transform] duration-200 group overflow-hidden
                              focus-visible:ring-2 focus-visible:ring-wmt-blue focus-visible:outline-none
                              ${active ? '' : 'hover:translate-x-0.5'}`}
                  style={
                    active
                      ? {
                          background: 'linear-gradient(90deg, rgba(0,83,226,0.28) 0%, rgba(0,83,226,0.04) 100%)',
                          boxShadow: 'inset 0 0 0 1px rgba(0,83,226,0.40), 0 4px 22px rgba(0,83,226,0.18)',
                          color: '#ffffff',
                        }
                      : { background: 'transparent', color: 'var(--s-text-muted)' }
                  }
                >
                  {/* Active accent bar */}
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                      style={{
                        background: 'linear-gradient(to bottom, #FFC220, #0053E2)',
                        animation: 'tab-slide 0.22s ease-out both',
                      }}
                      aria-hidden
                    />
                  )}
                  {/* Hover glow */}
                  {!active && (
                    <span
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'var(--s-hover-over)' }}
                      aria-hidden
                    />
                  )}
                  <span
                    className="shrink-0 z-10 transition-colors"
                    style={{ color: active ? '#FFC220' : 'var(--s-text-faint)' }}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate z-10 flex-1 text-left">{item.label}</span>
                  {item.hint && (
                    <span
                      className="shrink-0 z-10 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest"
                      style={
                        active
                          ? { background: 'rgba(255,194,32,0.18)', color: '#FFC220', border: '1px solid rgba(255,194,32,0.35)' }
                          : { background: 'var(--s-hover-over)', color: 'var(--s-text-dim)', border: '1px solid var(--s-border)' }
                      }
                    >
                      {item.hint}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3.5 shrink-0" style={{ borderTop: '1px solid var(--s-border-light)' }}>
        {user && (
          <div className="mb-3 rounded-xl px-3 py-2" style={{ background: 'var(--s-input-bg)', border: '1px solid var(--s-border-mid)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold" style={{ color: 'var(--s-text)' }}>{user.id}</p>
                <p className="truncate text-[9px] uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
                  {user.role} via {authLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(234,17,0,0.12)', border: '1px solid rgba(234,17,0,0.28)', color: '#fca5a5' }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-[0.16em]" style={{ color: 'var(--s-text-dim)' }}>
            v2.1 · build 1126
          </p>
          <div className="flex items-center gap-1.5" title={backendDetail} role="status" aria-live="polite">
            <span className="relative flex h-1.5 w-1.5">
              {backendState !== 'offline' && <span className="absolute inset-0 rounded-full animate-ping-ring opacity-60" style={{ background: statusColor }} />}
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
