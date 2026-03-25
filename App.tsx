import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { ViewState } from './types';
import { VendorProvider, useVendors } from './context/VendorContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { PageTransition } from './components/PageTransition';
import { ChatAssistant } from './components/ChatAssistant';
import { CommandPalette } from './components/CommandPalette';

// ── Lazy-loaded views — each is a separate bundle chunk ──────────────────────
// Named-export modules get mapped to default for React.lazy compatibility.
const HomeDashboard          = lazy(() => import('./components/HomeDashboard').then(m => ({ default: m.HomeDashboard })));
const VendorDashboard        = lazy(() => import('./components/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const ProjectDashboard3D     = lazy(() => import('./components/ProjectDashboard3D'));
const RequestAssessment      = lazy(() => import('./components/RequestAssessment').then(m => ({ default: m.RequestAssessment })));
const RequestLabVisit        = lazy(() => import('./components/RequestLabVisit').then(m => ({ default: m.RequestLabVisit })));
const CompetitorAnalysis     = lazy(() => import('./components/CompetitorAnalysis').then(m => ({ default: m.CompetitorAnalysis })));
const ArchitectureGraph      = lazy(() => import('./components/ArchitectureGraph').then(m => ({ default: m.ArchitectureGraph })));
const AdminPanel             = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const ProjectAdminPanel      = lazy(() => import('./components/ProjectAdminPanel').then(m => ({ default: m.ProjectAdminPanel })));
const CompetitorIntelligence = lazy(() => import('./components/CompetitorIntelligence').then(m => ({ default: m.CompetitorIntelligence })));
const CSOIntelligence        = lazy(() => import('./components/CSOIntelligence').then(m => ({ default: m.CSOIntelligence })));
const RegulatoryIntelligence = lazy(() => import('./components/RegulatoryIntelligence').then(m => ({ default: m.RegulatoryIntelligence })));
const IncidentIntelligence   = lazy(() => import('./components/IncidentIntelligence').then(m => ({ default: m.IncidentIntelligence })));
const VendorRiskMap3D        = lazy(() => import('./components/VendorRiskMap3D'));

// ── View metadata (title + subtitle for each route) ─────────────────────────
const VIEW_META: Record<ViewState, { title: string; subtitle: string }> = {
  [ViewState.HOME]:              { title: 'Command Center',          subtitle: 'SENTRY mission control — your starting point for all modules.' },
  [ViewState.DIRECTORY]:        { title: 'Vendor Directory',         subtitle: 'Centralized record of all assessed Emerging Technology vendors.' },
  [ViewState.PROJECTS]:         { title: 'Project Portfolio',        subtitle: '3D visualization — 14 active projects, $5.05M portfolio value.' },
  [ViewState.REQUEST_ASSESSMENT]:{ title: 'Security Assessment',     subtitle: 'Initiate a GRC workflow for a new technology review.' },
  [ViewState.COMPETITOR_ANALYSIS]:{ title: 'Market Analysis',        subtitle: 'Visualise risk metrics and compare vendor performance.' },
  [ViewState.REQUEST_LAB_VISIT]: { title: 'Emerging Tech Lab',       subtitle: 'Schedule hands-on evaluation time in the secure lab.' },
  [ViewState.COMPETITOR_INTEL]:  { title: 'Competitor Intelligence', subtitle: '1,113 analyst-enriched competitor events across retail.' },
  [ViewState.CSO_INTELLIGENCE]:  { title: 'CSO Intelligence',        subtitle: 'Executive security leadership — Amazon, Target, Costco competitive positioning.' },
  [ViewState.REGULATORY_INTEL]:  { title: 'Regulatory Intelligence', subtitle: '362 obligations across AI, Biometrics, ALPR, UAS & Data Privacy.' },
  [ViewState.INCIDENT_INTEL]:    { title: 'Incident Intelligence',   subtitle: 'Retail security incidents — ORC, cargo theft, cyber, violence & more.' },
  [ViewState.ARCHITECTURE]:      { title: 'SENTRY Architecture',     subtitle: 'GCP four-phase framework hierarchy.' },
  [ViewState.ADMIN]:             { title: 'VAR Administration',      subtitle: 'Manage VAR reports, extract scores, and fix vendor linkage.' },
  [ViewState.PROJECT_ADMIN]:     { title: 'Project Administration',  subtitle: 'Manually update project metadata, compliance IDs, and EST phase gates.' },
  [ViewState.RISK_MAP]:          { title: 'Vendor Risk Galaxy',      subtitle: 'All vendors plotted in 3D space by risk level and category.' },
};

// ── Suspense fallback — shown while lazy chunks are fetching ─────────────────
const ViewSkeleton: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4" style={{ opacity: 0.5 }}>
    <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>Loading module…</p>
  </div>
);

// ── Inner shell — rendered after user exits landing page ─────────────────────
const AppShell: React.FC<{
  currentView: ViewState;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
}> = ({ currentView, setCurrentView }) => {
  const { reducedMotion } = useTheme();
  const { backendOffline } = useVendors();
  const [chatOpen,      setChatOpen]      = useState(false);
  const [paletteOpen,   setPaletteOpen]   = useState(false);
  const [chatDismissed, setChatDismissed] = useState(
    () => localStorage.getItem('sentry-ai-dismissed') === '1'
  );

  const toggleChat   = useCallback(() => setChatOpen(o => !o), []);
  const openPalette  = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const dismissChat  = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setChatOpen(false);
    setChatDismissed(true);
    localStorage.setItem('sentry-ai-dismissed', '1');
  }, []);
  const restoreChat  = useCallback(() => {
    setChatDismissed(false);
    localStorage.removeItem('sentry-ai-dismissed');
  }, []);

  // Global Cmd+K / Ctrl+K → open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const meta = VIEW_META[currentView];

  return (
    <>
      <div className="flex h-screen bg-sentry-dark text-slate-300 overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          onOpenPalette={openPalette}
        />

        {/* ── Main content ────────────────────────────────────── */}
        <main
          id="main-content"
          className="flex-1 flex flex-col overflow-hidden"
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          {/* Glassmorphic command bar */}
          <header
            className="shrink-0 px-8 py-4 flex items-center justify-between gap-4 border-b"
            style={{
              background: 'var(--s-header)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              borderColor: 'var(--s-border)',
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-0.5 h-9 rounded-full shrink-0"
                style={{ background: 'linear-gradient(to bottom, #FFC220, #0053E2)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold leading-tight tracking-tight" style={{ color: 'var(--s-text)' }}>
                  {meta.title}
                </h2>
                {/* truncate prevents subtitle from blowing out the header layout */}
                <p className="text-xs mt-0.5 leading-none truncate max-w-[480px]" style={{ color: 'var(--s-text-dim)' }}>
                  {meta.subtitle}
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
              style={backendOffline
                ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: 'rgba(34,197,94,0.08)',  border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <div className="relative flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full ${backendOffline ? 'bg-red-400' : 'bg-green-400'}`} />
                {!backendOffline && (
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-ring" style={{ opacity: 0.5 }} />
                )}
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: backendOffline ? '#f87171' : '#4ade80' }}
              >
                {backendOffline ? 'Backend Offline' : 'System Online'}
              </span>
            </div>
          </header>

          {/* Page body — Project Admin gets zero padding so its panels fill edge-to-edge */}
          <div className={`flex-1 overflow-hidden ${
            currentView === ViewState.PROJECT_ADMIN ? '' : 'overflow-y-auto p-8'
          }`}>
            <PageTransition viewKey={currentView}>
              <Suspense fallback={<ViewSkeleton />}>
                {currentView === ViewState.HOME               && <HomeDashboard onNavigate={setCurrentView} />}
                {currentView === ViewState.DIRECTORY           && <VendorDashboard />}
                {currentView === ViewState.PROJECTS            && <ProjectDashboard3D />}
                {currentView === ViewState.REQUEST_ASSESSMENT  && <RequestAssessment />}
                {currentView === ViewState.COMPETITOR_ANALYSIS && <CompetitorAnalysis onNavigate={setCurrentView} />}
                {currentView === ViewState.COMPETITOR_INTEL    && <CompetitorIntelligence />}
                {currentView === ViewState.CSO_INTELLIGENCE    && <CSOIntelligence />}
                {currentView === ViewState.REGULATORY_INTEL    && <RegulatoryIntelligence />}
                {currentView === ViewState.INCIDENT_INTEL      && <IncidentIntelligence />}
                {currentView === ViewState.REQUEST_LAB_VISIT   && <RequestLabVisit />}
                {currentView === ViewState.ARCHITECTURE        && <ArchitectureGraph />}
                {currentView === ViewState.ADMIN               && <AdminPanel />}
                {currentView === ViewState.PROJECT_ADMIN        && <ProjectAdminPanel />}
                {currentView === ViewState.RISK_MAP            && <VendorRiskMap3D />}
              </Suspense>
            </PageTransition>
          </div>
        </main>
      </div>

      {/* ── Command palette overlay ─────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        onNavigate={v => { setCurrentView(v); closePalette(); }}
      />

      {/* ── Floating SENTRY-AI chat ───────────────────────────── */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={toggleChat}
          aria-hidden="true"
        />
      )}

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
          transition: reducedMotion ? 'none' : 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {chatOpen && <ChatAssistant />}
      </aside>

      {/* Restore pill — shown only when widget is dismissed */}
      {chatDismissed && (
        <button
          onClick={restoreChat}
          aria-label="Restore SENTRY-AI chat"
          title="Restore SENTRY-AI"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 51,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px 6px 10px',
            borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            color: 'rgba(148,163,184,0.7)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            transition: 'opacity 0.2s, background 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,83,226,0.3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.85)')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          SENTRY-AI
        </button>
      )}

      {/* Main toggle button — hidden when dismissed */}
      {!chatDismissed && (
        <div
          style={{
            position: 'fixed',
            bottom: chatOpen ? 'calc(min(640px, 88vh) + 12px)' : '24px',
            right: '24px',
            zIndex: 51,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: reducedMotion ? 'none' : 'bottom 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Dismiss × button — only shown when chat is closed */}
          {!chatOpen && (
            <button
              onClick={dismissChat}
              aria-label="Hide SENTRY-AI chat button"
              title="Hide SENTRY-AI (click the ghost pill in the corner to restore)"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(15,23,42,0.7)',
                backdropFilter: 'blur(6px)',
                color: 'rgba(148,163,184,0.8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                lineHeight: 1,
                flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(234,17,0,0.25)';
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.borderColor = 'rgba(234,17,0,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(15,23,42,0.7)';
                e.currentTarget.style.color = 'rgba(148,163,184,0.8)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
              }}
            >
              ×
            </button>
          )}

          {/* Main SENTRY-AI toggle */}
          <button
            onClick={toggleChat}
            aria-label={chatOpen ? 'Close SENTRY-AI chat' : 'Open SENTRY-AI chat'}
            aria-expanded={chatOpen}
            aria-controls="sentry-ai-chat"
            style={{
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
              color: 'white',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {chatOpen ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9"  cy="11" r="1" fill="white"/>
                  <circle cx="12" cy="11" r="1" fill="white"/>
                  <circle cx="15" cy="11" r="1" fill="white"/>
                </svg>
                <span>SENTRY-AI</span>
                <span className="relative flex items-center justify-center ml-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="absolute w-2 h-2 rounded-full bg-green-400 animate-ping-ring" style={{ opacity: 0.6 }} />
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
};

// ── Root component ───────────────────────────────────────────────────────────
const App: React.FC = () => {
  // Always start on the landing page — it's the intended entry experience.
  const [showLanding, setShowLanding] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);

  const handleEnter = useCallback(() => setShowLanding(false), []);

  return (
    // ThemeProvider wraps everything so LandingBackground3D can read reducedMotion
    <ThemeProvider>
      <VendorProvider>
        {/* Accessible skip link — first focusable element in the DOM */}
        <a href="#main-content" className="skip-nav">Skip to main content</a>

        {showLanding
          ? <LandingPage onEnter={handleEnter} />
          : <AppShell currentView={currentView} setCurrentView={setCurrentView} />
        }
      </VendorProvider>
    </ThemeProvider>
  );
};

export default App;