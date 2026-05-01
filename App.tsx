import React, { lazy, Suspense, useState } from 'react';
import { ViewState } from './types';
import { VendorProvider } from './context/VendorContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { PageTransition } from './components/PageTransition';
import { trackEvent, trackView } from './services/analytics';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';

// ── Eager-loaded (always needed) ────────────────────────────────────────────
import { LandingPage } from './components/LandingPage';

// ── Lazy-loaded route components ────────────────────────────────────────────
// Each view is code-split into its own chunk. Only loaded when the user
// navigates to that view. Reduces initial bundle by ~200KB.
const VendorDashboard  = lazy(() => import('./components/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const ProjectDashboard3D = lazy(() => import('./components/ProjectDashboard3D'));
const HomeDashboard = lazy(() => import('./components/HomeDashboard').then(m => ({ default: m.HomeDashboard })));
const RequestAssessment = lazy(() => import('./components/RequestAssessment').then(m => ({ default: m.RequestAssessment })));
const RequestLabVisit   = lazy(() => import('./components/RequestLabVisit').then(m => ({ default: m.RequestLabVisit })));
const RequestQueue      = lazy(() => import('./components/RequestQueue').then(m => ({ default: m.RequestQueue })));
const CompetitorAnalysis = lazy(() => import('./components/CompetitorAnalysis').then(m => ({ default: m.CompetitorAnalysis })));
const ArchitectureGraph  = lazy(() => import('./components/ArchitectureGraph').then(m => ({ default: m.ArchitectureGraph })));
const AdminPanel         = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const CompetitorIntel    = lazy(() => import('./components/CompetitorIntel').then(m => ({ default: m.CompetitorIntel })));
const CSOIntelligence    = lazy(() => import('./components/CSOIntelligence').then(m => ({ default: m.CSOIntelligence })));
const IncidentIntelligence = lazy(() => import('./components/IncidentIntelligence').then(m => ({ default: m.IncidentIntelligence })));
const RegulatoryIntelligence = lazy(() => import('./components/RegulatoryIntelligence').then(m => ({ default: m.RegulatoryIntelligence })));
const VendorRiskMap3D   = lazy(() => import('./components/VendorRiskMap3D').then(m => ({ default: m.VendorRiskMap3D })));
const WalmartSpark       = lazy(() => import('./components/WalmartSpark').then(m => ({ default: m.WalmartSpark })));
const CommandPalette     = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));

const PLATFORM_ENTERED_KEY = 'sentry.platform.entered';
const PLATFORM_VIEW_KEY = 'sentry.platform.view';

// ── Suspense fallback ───────────────────────────────────────────────────────
function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-wmt-blue border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Loading</span>
      </div>
    </div>
  );
}

// ── Eager-loaded (always needed) ────────────────────────────────────────────
import { LandingPage } from './components/LandingPage';

// ── Lazy-loaded route components ────────────────────────────────────────────
// Each view is code-split into its own chunk. Only loaded when the user
// navigates to that view. Reduces initial bundle by ~200KB.
const VendorDashboard  = lazy(() => import('./components/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const ProjectDashboard3D = lazy(() => import('./components/ProjectDashboard3D'));
const RequestAssessment = lazy(() => import('./components/RequestAssessment').then(m => ({ default: m.RequestAssessment })));
const RequestLabVisit   = lazy(() => import('./components/RequestLabVisit').then(m => ({ default: m.RequestLabVisit })));
const CompetitorAnalysis = lazy(() => import('./components/CompetitorAnalysis').then(m => ({ default: m.CompetitorAnalysis })));
const ArchitectureGraph  = lazy(() => import('./components/ArchitectureGraph').then(m => ({ default: m.ArchitectureGraph })));
const AdminPanel         = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const CompetitorIntel    = lazy(() => import('./components/CompetitorIntel').then(m => ({ default: m.CompetitorIntel })));
const CSOIntelligence    = lazy(() => import('./components/CSOIntelligence').then(m => ({ default: m.CSOIntelligence })));
const Sentinel          = lazy(() => import('./components/Sentinel').then(m => ({ default: m.Sentinel })));
const HomeDashboard     = lazy(() => import('./components/HomeDashboard').then(m => ({ default: m.HomeDashboard })));

// ── Suspense fallback ───────────────────────────────────────────────────────
function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-wmt-blue border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Loading</span>
      </div>
    </div>
  );
}

// ── View metadata ────────────────────────────────────────────────────────────

const VIEW_META: Record<ViewState, { title: string; subtitle: string }> = {
  [ViewState.HOME]: {
    title: 'Mission Control',
    subtitle: 'Your real-time pulse on the SENTRY ecosystem — vendors, assessments, risks, and intelligence.',
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
  [ViewState.REGULATORY_INTELLIGENCE]: {
    title: 'Regulatory Intelligence',
    subtitle: 'Global regulatory obligations across AI, biometrics, ALPR, UAS, privacy, and surveillance domains.',
  },
  [ViewState.INCIDENT_INTELLIGENCE]: {
    title: 'Incident Intelligence',
    subtitle: 'Retail incident tracking across severity, region, type, and recent operational signals.',
  },
  [ViewState.REQUEST_QUEUE]: {
    title: 'Request Queue',
    subtitle: 'Admin triage queue for submitted assessments and emerging tech lab requests.',
  },
  [ViewState.ARCHITECTURE]: {
    title: 'SENTRY Architecture',
    subtitle: 'GCP four-phase framework hierarchy.',
  },
  [ViewState.ADMIN]: {
    title: 'VAR Administration',
    subtitle: 'Manage VAR reports, extract scores, and fix vendor linkage.',
  },
  [ViewState.SENTINEL]: {
    title: 'Sentinel',
    subtitle: 'AI-powered vendor intelligence assistant — ask questions, get insights.',
  },
};

const isViewState = (value: string): value is ViewState => value in VIEW_META;

function readPlatformEntered(): boolean {
  try {
    return window.sessionStorage.getItem(PLATFORM_ENTERED_KEY) === 'true';
  } catch {
    return false;
  }
}

function readStoredView(): ViewState {
  try {
    const stored = window.sessionStorage.getItem(PLATFORM_VIEW_KEY);
    return stored && isViewState(stored) ? stored : ViewState.HOME;
  } catch {
    return ViewState.HOME;
  }
}

// ── Main app ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);

  if (showLanding) {
    return <LandingPage onEnter={handleEnterPlatform} />;
  }

  const meta = VIEW_META[currentView];

  return (
    <ThemeProvider>
      <AuthProvider>
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

                {/* Right: status pill + command shortcut */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(0,83,226,0.10)', border: '1px solid rgba(0,83,226,0.25)', color: '#93c5fd' }}
                  >
                    Command Palette · Ctrl/Cmd+K
                  </button>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
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
                </div>
              </header>

              {/* Page body with animated view transitions + lazy loading */}
              <div className="flex-1 overflow-y-auto p-8">
                <PageTransition viewKey={currentView}>
                  <Suspense fallback={<ViewLoader />}>
                    {currentView === ViewState.HOME && <HomeDashboard onNavigate={setCurrentView} />}
                    {currentView === ViewState.DIRECTORY && <VendorDashboard />}
                    {currentView === ViewState.PROJECTS && <ProjectDashboard3D />}
                    {currentView === ViewState.REQUEST_ASSESSMENT && <RequestAssessment />}
                    {currentView === ViewState.REQUEST_QUEUE && <RequestQueue />}
                    {currentView === ViewState.COMPETITOR_ANALYSIS && <CompetitorAnalysis onNavigate={setCurrentView} />}
                    {currentView === ViewState.COMPETITOR_INTEL && <CompetitorIntel />}
                    {currentView === ViewState.CSO_INTELLIGENCE && <CSOIntelligence />}
                    {currentView === ViewState.INCIDENT_INTELLIGENCE && <IncidentIntelligence />}
                    {currentView === ViewState.REGULATORY_INTELLIGENCE && (
                      <ViewErrorBoundary viewName="Regulatory Intelligence">
                        <RegulatoryIntelligence />
                      </ViewErrorBoundary>
                    )}
                    {currentView === ViewState.REQUEST_LAB_VISIT && <RequestLabVisit />}
                    {currentView === ViewState.ARCHITECTURE && <ArchitectureGraph />}
                    {currentView === ViewState.ADMIN && <AdminPanel />}
                    {currentView === ViewState.RISK_MAP && <VendorRiskMap3D />}
                    {currentView === ViewState.WALMART_SPARK && <WalmartSpark />}
                    <CommandPalette
                      open={paletteOpen}
                      onClose={() => setPaletteOpen(false)}
                      onNavigate={setCurrentView}
                    />
                  </Suspense>
                </PageTransition>
              </div>
            </header>

            {/* Page body with animated view transitions + lazy loading */}
            <div className="flex-1 overflow-y-auto p-8">
              <PageTransition viewKey={currentView}>
                <Suspense fallback={<ViewLoader />}>
                  {currentView === ViewState.HOME               && <HomeDashboard onNavigate={setCurrentView} />}
                  {currentView === ViewState.DIRECTORY          && <VendorDashboard />}
                  {currentView === ViewState.PROJECTS           && <ProjectDashboard3D />}
                  {currentView === ViewState.REQUEST_ASSESSMENT && <RequestAssessment />}
                  {currentView === ViewState.COMPETITOR_ANALYSIS && <CompetitorAnalysis onNavigate={setCurrentView} />}
                  {currentView === ViewState.COMPETITOR_INTEL   && <CompetitorIntel />}
                  {currentView === ViewState.CSO_INTELLIGENCE   && <CSOIntelligence />}
                  {currentView === ViewState.REQUEST_LAB_VISIT  && <RequestLabVisit />}
                  {currentView === ViewState.ARCHITECTURE       && <ArchitectureGraph />}
                  {currentView === ViewState.ADMIN              && <AdminPanel />}
                  {currentView === ViewState.SENTINEL           && <Sentinel />}
                </Suspense>
              </PageTransition>
            </div>
          </main>
        </div>
      </VendorProvider>
    </ThemeProvider>
  );
};

export default App;