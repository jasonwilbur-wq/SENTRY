import React, { useState } from 'react';
import { ViewState } from './types';
import { VendorProvider } from './context/VendorContext';
import { VendorDashboard } from './components/VendorDashboard';
import { LandingPage } from './components/LandingPage';
import { RequestAssessment } from './components/RequestAssessment';
import { RequestLabVisit } from './components/RequestLabVisit';
import { CompetitorAnalysis } from './components/CompetitorAnalysis';
import { ArchitectureGraph } from './components/ArchitectureGraph';
import { AdminPanel } from './components/AdminPanel';

// ── Nav button helper ────────────────────────────────────────────────────────

interface NavButtonProps {
  view: ViewState;
  label: string;
  icon: React.ReactNode;
  currentView: ViewState;
  onClick: (v: ViewState) => void;
}

const NavButton: React.FC<NavButtonProps> = ({ view, label, icon, currentView, onClick }) => {
  const active = currentView === view;
  return (
    <button
      onClick={() => onClick(view)}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 group ${
        active
          ? 'bg-wmt-blue/20 text-sentry-accent border border-wmt-blue/60 shadow-[0_0_16px_rgba(0,83,226,0.25)]'
          : 'text-slate-400 hover:bg-slate-700/40 hover:text-white border border-transparent'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-sentry-accent' : 'text-slate-500 group-hover:text-slate-300'}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sentry-accent" aria-hidden="true" />}
    </button>
  );
};

// ── View metadata ────────────────────────────────────────────────────────────

const VIEW_META: Record<ViewState, { title: string; subtitle: string }> = {
  [ViewState.DIRECTORY]: {
    title: 'Vendor Directory',
    subtitle: 'Centralized record of all assessed Emerging Technology vendors.',
  },
  [ViewState.REQUEST_ASSESSMENT]: {
    title: 'Security Assessment',
    subtitle: 'Initiate a GRC workflow for a new technology review.',
  },
  [ViewState.COMPETITOR_ANALYSIS]: {
    title: 'Market Analysis',
    subtitle: 'Visualise risk metrics and compare vendor performance.',
  },
  [ViewState.REQUEST_LAB_VISIT]: {
    title: 'Emerging Tech Lab',
    subtitle: 'Schedule hands-on evaluation time in the secure lab.',
  },
  [ViewState.ARCHITECTURE]: {
    title: 'SENTRY Architecture',
    subtitle: 'GCP four-phase framework hierarchy.',
  },
  [ViewState.ADMIN]: {
    title: 'VAR Administration',
    subtitle: 'Manage VAR reports, extract scores, and fix vendor linkage.',
  },
};

// ── Main app ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DIRECTORY);

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  const meta = VIEW_META[currentView];

  const navItems: Array<{ view: ViewState; label: string; icon: React.ReactNode }> = [
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
      view: ViewState.COMPETITOR_ANALYSIS,
      label: 'Market Analysis',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <VendorProvider>
      <div className="flex h-screen bg-sentry-dark text-slate-300 overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className="w-72 shrink-0 bg-sentry-card border-r border-slate-700 flex flex-col overflow-y-auto"
          aria-label="Main navigation"
        >
          {/* Spark Yellow top accent bar */}
          <div className="h-1 bg-wmt-yellow shrink-0" aria-hidden="true" />

          {/* Brand block */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-700">
            {/* Walmart wordmark row */}
            <div className="flex items-center gap-2 mb-3">
              {/* Walmart spark (★ badge) */}
              <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" aria-hidden="true">
                <circle cx="16" cy="16" r="16" fill="#FFC220"/>
                <g fill="#001E60">
                  {/* 6-point spark icon — simplified */}
                  <rect x="14.5" y="2" width="3" height="12" rx="1.5"/>
                  <rect x="14.5" y="18" width="3" height="12" rx="1.5"/>
                  <rect x="2" y="14.5" width="12" height="3" rx="1.5"/>
                  <rect x="18" y="14.5" width="12" height="3" rx="1.5"/>
                  <rect x="5.5" y="5.5" width="3" height="10" rx="1.5" transform="rotate(45 7 10.5)"/>
                  <rect x="18.5" y="18.5" width="3" height="10" rx="1.5" transform="rotate(45 20 23.5)"/>
                </g>
              </svg>
              <span className="text-xs font-bold text-wmt-yellow tracking-widest uppercase">Walmart</span>
            </div>

            {/* Product name */}
            <h1 className="text-2xl font-black tracking-[0.15em] text-white leading-none">SENTRY</h1>

            {/* Org hierarchy */}
            <div className="mt-2 space-y-0.5">
              <p className="text-[10px] text-wmt-everyday font-semibold uppercase tracking-wider">
                Global Security, Aviation &amp; Investigations
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Enterprise Security</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 p-3 flex-grow">
            {navItems.map(item => (
              <NavButton
                key={item.view}
                view={item.view}
                label={item.label}
                icon={item.icon}
                currentView={currentView}
                onClick={setCurrentView}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-700">
            <p className="text-[10px] text-slate-600 text-center tracking-wider">
              SENTRY v2.0 · Emerging Technology Security
            </p>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Page header — True Blue left accent + yellow badge */}
          <header className="bg-sentry-card border-b border-slate-700 px-8 py-5 shrink-0 flex items-center gap-4">
            <div className="w-1 h-10 rounded-full bg-wmt-yellow shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{meta.subtitle}</p>
            </div>
          </header>

          {/* Page body */}
          <div className="flex-1 overflow-y-auto p-8">
            {currentView === ViewState.DIRECTORY         && <VendorDashboard />}
            {currentView === ViewState.REQUEST_ASSESSMENT && <RequestAssessment />}
            {currentView === ViewState.COMPETITOR_ANALYSIS && <CompetitorAnalysis />}
            {currentView === ViewState.REQUEST_LAB_VISIT  && <RequestLabVisit />}
            {currentView === ViewState.ARCHITECTURE       && <ArchitectureGraph />}
            {currentView === ViewState.ADMIN               && <AdminPanel />}
          </div>
        </main>
      </div>
    </VendorProvider>
  );
};

export default App;