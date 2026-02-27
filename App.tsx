import React, { useState } from 'react';
import { ViewState } from './types';
import { VendorProvider } from './context/VendorContext';
import { ThemeProvider } from './context/ThemeContext';
import { VendorDashboard } from './components/VendorDashboard';
import { LandingPage } from './components/LandingPage';
import { RequestAssessment } from './components/RequestAssessment';
import { RequestLabVisit } from './components/RequestLabVisit';
import { CompetitorAnalysis } from './components/CompetitorAnalysis';
import { ArchitectureGraph } from './components/ArchitectureGraph';
import { AdminPanel } from './components/AdminPanel';
import { CompetitorIntel } from './components/CompetitorIntel';
import { Sidebar } from './components/Sidebar';
import { PageTransition } from './components/PageTransition';

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
  [ViewState.COMPETITOR_INTEL]: {
    title: 'Competitor Intelligence',
    subtitle: 'Live threat tracking across retail competitors — 1,113 analyst-enriched events.',
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

  return (
    <ThemeProvider>
      <VendorProvider>
        <div className="flex h-screen bg-sentry-dark text-slate-300 overflow-hidden">

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <Sidebar currentView={currentView} onNavigate={setCurrentView} />

          {/* ── Main content ──────────────────────────────────────── */}
          <main className="flex-1 flex flex-col overflow-hidden">

            {/* Glassmorphic command bar header */}
            <header
              className="shrink-0 px-8 py-4 flex items-center justify-between gap-4 border-b"
              style={{
                background: 'rgba(0,11,40,0.72)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                borderColor: 'rgba(255,255,255,0.07)',
              }}
            >
              {/* Left: accent + title */}
              <div className="flex items-center gap-4">
                <div
                  className="w-0.5 h-9 rounded-full shrink-0"
                  style={{ background: 'linear-gradient(to bottom, #FFC220, #0053E2)' }}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight">
                    {meta.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-none">{meta.subtitle}</p>
                </div>
              </div>

              {/* Right: status pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-ring"
                    style={{ opacity: 0.5 }}
                  />
                </div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">System Online</span>
              </div>
            </header>

            {/* Page body with animated view transitions */}
            <div className="flex-1 overflow-y-auto p-8">
              <PageTransition viewKey={currentView}>
                {currentView === ViewState.DIRECTORY          && <VendorDashboard />}
                {currentView === ViewState.REQUEST_ASSESSMENT && <RequestAssessment />}
                {currentView === ViewState.COMPETITOR_ANALYSIS && <CompetitorAnalysis onNavigate={setCurrentView} />}
                {currentView === ViewState.COMPETITOR_INTEL   && <CompetitorIntel />}
                {currentView === ViewState.REQUEST_LAB_VISIT  && <RequestLabVisit />}
                {currentView === ViewState.ARCHITECTURE       && <ArchitectureGraph />}
                {currentView === ViewState.ADMIN              && <AdminPanel />}
              </PageTransition>
            </div>
          </main>
        </div>
      </VendorProvider>
    </ThemeProvider>
  );
};

export default App;