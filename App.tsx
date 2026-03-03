import React, { useState, useCallback } from 'react';
import { ViewState } from './types';
import { VendorProvider } from './context/VendorContext';
import { ThemeProvider } from './context/ThemeContext';
import { HomeDashboard } from './components/HomeDashboard';
import { VendorDashboard } from './components/VendorDashboard';
import { LandingPage } from './components/LandingPage';
import { RequestAssessment } from './components/RequestAssessment';
import { RequestLabVisit } from './components/RequestLabVisit';
import { CompetitorAnalysis } from './components/CompetitorAnalysis';
import { ArchitectureGraph } from './components/ArchitectureGraph';
import { AdminPanel } from './components/AdminPanel';
import { CompetitorIntelligence } from './components/CompetitorIntelligence';
import { CSOIntelligence } from './components/CSOIntelligence';
import { RegulatoryIntelligence } from './components/RegulatoryIntelligence';
import ProjectDashboard3D from './components/ProjectDashboard3D';
import { Sidebar } from './components/Sidebar';
import { PageTransition } from './components/PageTransition';
import { ChatAssistant } from './components/ChatAssistant';

// ── View metadata ────────────────────────────────────────────────────────────

const VIEW_META: Record<ViewState, { title: string; subtitle: string }> = {
  [ViewState.HOME]: {
    title: 'Command Center',
    subtitle: 'SENTRY mission control — your starting point for all modules.',
  },
  [ViewState.DIRECTORY]: {
    title: 'Vendor Directory',
    subtitle: 'Centralized record of all assessed Emerging Technology vendors.',
  },
  [ViewState.PROJECTS]: {
    title: 'Project Portfolio',
    subtitle: '3D visualization of all EST projects — 14 active projects, $5.05M portfolio value.',
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
  [ViewState.CSO_INTELLIGENCE]: {
    title: 'CSO Intelligence',
    subtitle: 'Executive security leadership analysis — Amazon, Target, Costco, Kroger competitive positioning.',
  },
  [ViewState.REGULATORY_INTEL]: {
    title: 'Regulatory Intelligence',
    subtitle: '362 obligations across AI, Biometrics, ALPR, UAS & Data Privacy — 85 Red, 186 Amber.',
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
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [chatOpen, setChatOpen] = useState(false);
  const toggleChat = useCallback(() => setChatOpen(o => !o), []);

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
                background: 'var(--s-header)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                borderColor: 'var(--s-border)',
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
                {currentView === ViewState.HOME              && <HomeDashboard onNavigate={setCurrentView} />}
                {currentView === ViewState.DIRECTORY          && <VendorDashboard />}
                {currentView === ViewState.PROJECTS           && <ProjectDashboard3D />}
                {currentView === ViewState.REQUEST_ASSESSMENT && <RequestAssessment />}
                {currentView === ViewState.COMPETITOR_ANALYSIS && <CompetitorAnalysis onNavigate={setCurrentView} />}
                {currentView === ViewState.COMPETITOR_INTEL   && <CompetitorIntelligence />}
                {currentView === ViewState.CSO_INTELLIGENCE   && <CSOIntelligence />}
                {currentView === ViewState.REGULATORY_INTEL   && <RegulatoryIntelligence />}
                {currentView === ViewState.REQUEST_LAB_VISIT  && <RequestLabVisit />}
                {currentView === ViewState.ARCHITECTURE       && <ArchitectureGraph />}
                {currentView === ViewState.ADMIN              && <AdminPanel />}
              </PageTransition>
            </div>
          </main>
        </div>

        {/* ── Floating SENTRY-AI chat ────────────────────────────────────── */}

        {/* Dim backdrop when open */}
        {chatOpen && (
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
            onClick={toggleChat}
            aria-hidden="true"
          />
        )}

        {/* Slide-up drawer anchored bottom-right */}
        <aside
          id="sentry-ai-chat"
          role="dialog"
          aria-label="SENTRY-AI Chat"
          aria-modal={chatOpen}
          className="fixed bottom-0 right-6 z-50"
          style={{
            width: 'min(420px, 96vw)',
            height: chatOpen ? 'min(640px, 88vh)' : '0px',
            overflow: 'hidden',
            borderRadius: '16px 16px 0 0',
            transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {chatOpen && <ChatAssistant />}
        </aside>

        {/* Floating trigger pill */}
        <button
          onClick={toggleChat}
          aria-label={chatOpen ? 'Close SENTRY-AI' : 'Open SENTRY-AI'}
          aria-expanded={chatOpen}
          aria-controls="sentry-ai-chat"
          style={{
            position: 'fixed',
            bottom: chatOpen ? 'calc(min(640px, 88vh) + 12px)' : '24px',
            right: '24px',
            zIndex: 51,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: chatOpen ? '10px' : '10px 18px 10px 14px',
            borderRadius: '99px',
            border: '1.5px solid rgba(255,255,255,0.15)',
            background: chatOpen
              ? 'linear-gradient(135deg,#7f1d1d,#450a0a)'
              : 'linear-gradient(135deg,#0053e2,#002880)',
            boxShadow: '0 8px 28px rgba(0,83,226,0.5)',
            cursor: 'pointer',
            transition: 'bottom 0.3s cubic-bezier(0.4,0,0.2,1), background 0.2s, padding 0.2s',
            color: 'white',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          {chatOpen ? (
            /* X icon when open */
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <>
              {/* Chat bubble icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                <circle cx="9"  cy="11" r="1" fill="white"/>
                <circle cx="12" cy="11" r="1" fill="white"/>
                <circle cx="15" cy="11" r="1" fill="white"/>
              </svg>
              <span>SENTRY-AI</span>
              {/* Pulsing dot — indicates live */}
              <span className="relative flex items-center justify-center ml-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span
                  className="absolute w-2 h-2 rounded-full bg-green-400 animate-ping-ring"
                  style={{ opacity: 0.6 }}
                />
              </span>
            </>
          )}
        </button>

      </VendorProvider>
    </ThemeProvider>
  );
};

export default App;