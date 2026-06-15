import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ViewState } from './types';
import { VendorProvider } from './context/VendorContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, SENTRY_USER_SESSION_KEY, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { PageTransition } from './components/PageTransition';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { trackEvent, trackView } from './services/analytics';

// ── Eager-loaded (always needed) ────────────────────────────────────────────
import { LandingPage } from './components/LandingPage';

// ── Lazy-loaded route components ────────────────────────────────────────────
const VendorDashboard        = lazy(() => import('./components/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const ProjectDashboard3D     = lazy(() => import('./components/ProjectDashboard3D'));
const HomeDashboard          = lazy(() => import('./components/HomeDashboard').then(m => ({ default: m.HomeDashboard })));
const RequestAssessment      = lazy(() => import('./components/RequestAssessment').then(m => ({ default: m.RequestAssessment })));
const RequestLabVisit        = lazy(() => import('./components/RequestLabVisit').then(m => ({ default: m.RequestLabVisit })));
const RequestQueue           = lazy(() => import('./components/RequestQueue').then(m => ({ default: m.RequestQueue })));
const CompetitorAnalysis     = lazy(() => import('./components/CompetitorAnalysis').then(m => ({ default: m.CompetitorAnalysis })));
const ArchitectureGraph      = lazy(() => import('./components/ArchitectureGraph').then(m => ({ default: m.ArchitectureGraph })));
const AdminPanel             = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const CompetitorIntel        = lazy(() => import('./components/CompetitorIntel').then(m => ({ default: m.CompetitorIntel })));
const ExecutiveIntelligence  = lazy(() => import('./components/ExecutiveIntelligence').then(m => ({ default: m.ExecutiveIntelligence })));
const IncidentIntelligence   = lazy(() => import('./components/IncidentIntelligence').then(m => ({ default: m.IncidentIntelligence })));
const IntelTimeline          = lazy(() => import('./components/IntelTimeline'));
const RegulatoryIntelligence = lazy(() => import('./components/RegulatoryIntelligence').then(m => ({ default: m.RegulatoryIntelligence })));
const VendorRiskMap3D        = lazy(() => import('./components/VendorRiskMap3D'));
const Sentinel               = lazy(() => import('./components/Sentinel').then(m => ({ default: m.Sentinel })));
const CommandPalette         = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));

const PLATFORM_ENTERED_KEY = 'sentry.platform.entered';
const PLATFORM_VIEW_KEY    = 'sentry.platform.view';

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
const VIEW_META: Record<ViewState, { title: string; subtitle: string; eyebrow: string }> = {
  [ViewState.HOME]: {
    eyebrow:  'Today',
    title:    'Mission Control',
    subtitle: 'Your live pulse on every vendor, project, and signal moving through SENTRY.',
  },
  [ViewState.DIRECTORY]: {
    eyebrow:  'Vendors',
    title:    'Vendor Directory',
    subtitle: 'Every assessed Emerging Technology vendor — searchable, sortable, exportable.',
  },
  [ViewState.PROJECTS]: {
    eyebrow:  'Projects',
    title:    'Project Portfolio',
    subtitle: '3D portfolio view — 13 emerging-technology security projects across the lifecycle.',
  },
  [ViewState.REQUEST_ASSESSMENT]: {
    eyebrow:  'Workflows',
    title:    'Security Assessment',
    subtitle: 'Kick off a GRC workflow for a new technology review.',
  },
  [ViewState.COMPETITOR_ANALYSIS]: {
    eyebrow:  'Markets',
    title:    'Market Analysis',
    subtitle: 'Risk metrics, vendor performance, peer benchmarking.',
  },
  [ViewState.REQUEST_LAB_VISIT]: {
    eyebrow:  'Workflows',
    title:    'Emerging Tech Lab',
    subtitle: 'Schedule hands-on evaluation time inside the secure lab.',
  },
  [ViewState.COMPETITOR_INTEL]: {
    eyebrow:  'Intelligence',
    title:    'Competitor Intelligence',
    subtitle: 'Decision-ready competitor signals, CSO brief candidates, activity spikes, and evidence-backed context.',
  },
  [ViewState.EXECUTIVE_INTEL]: {
    eyebrow:  'Intelligence',
    title:    'Executive Intelligence',
    subtitle: 'Competitor C-suite benchmarking - Security (CSO/CISO) and Sustainability lenses.',
  },
  // Deprecated: merged into EXECUTIVE_INTEL. Kept for type completeness only.
  [ViewState.CSO_INTELLIGENCE]: {
    eyebrow:  'Intelligence',
    title:    'Executive Intelligence',
    subtitle: 'Competitor C-suite benchmarking - Security (CSO/CISO) and Sustainability lenses.',
  },
  [ViewState.REGULATORY_INTELLIGENCE]: {
    eyebrow:  'Intelligence',
    title:    'Regulatory Intelligence',
    subtitle: 'Global obligations across AI, biometrics, ALPR, UAS, privacy.',
  },
  [ViewState.INCIDENT_INTELLIGENCE]: {
    eyebrow:  'Intelligence',
    title:    'Incident Intelligence',
    subtitle: 'Retail incident tracking by severity, region, type, and operational signal.',
  },
  [ViewState.INTEL_TIMELINE]: {
    eyebrow:  'Intelligence',
    title:    'Intel Timeline',
    subtitle: 'Unified cross-source signal feed - competitor events, incidents, and web-change alerts in one chronological view.',
  },
  [ViewState.REQUEST_QUEUE]: {
    eyebrow:  'Operations',
    title:    'Request Queue',
    subtitle: 'Triage queue for assessments and emerging tech lab requests.',
  },
  [ViewState.ARCHITECTURE]: {
    eyebrow:  'Platform',
    title:    'SENTRY Architecture',
    subtitle: 'GCP four-phase framework hierarchy.',
  },
  [ViewState.ADMIN]: {
    eyebrow:  'Operations',
    title:    'VAR Administration',
    subtitle: 'Manage VAR reports, extract scores, and fix vendor linkage.',
  },
  [ViewState.SENTINEL]: {
    eyebrow:  'Sentinel',
    title:    'Ask Sentinel',
    subtitle: 'Your AI analyst for vendors, risks, categories, and maturity.',
  },
  [ViewState.RISK_MAP]: {
    eyebrow:  'Intelligence',
    title:    'Risk Map 3D',
    subtitle: 'Vendors plotted in 3D space by risk and category.',
  },
};

const isViewState = (value: string): value is ViewState => value in VIEW_META;

function readPlatformEntered(): boolean {
  try { return window.sessionStorage.getItem(PLATFORM_ENTERED_KEY) === 'true'; }
  catch { return false; }
}

function readStoredView(): ViewState {
  try {
    const stored = window.sessionStorage.getItem(PLATFORM_VIEW_KEY);
    if (!stored || !isViewState(stored)) return ViewState.HOME;
    // CSO_INTELLIGENCE was merged into the unified Executive Intelligence view.
    if (stored === ViewState.CSO_INTELLIGENCE) return ViewState.EXECUTIVE_INTEL;
    return stored;
  } catch { return ViewState.HOME; }
}

// ── Greeting helper — gives the header a human moment ──────────────────────
function useGreeting() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const hour = now.getHours();
  const greeting =
    hour < 5  ? 'Working late' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' :
                'Working late';
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { greeting, dateLabel, timeLabel };
}

function useBackendHealth(enabled: boolean) {
  const [state, setState] = useState<'checking' | 'online' | 'offline'>('checking');
  const [detail, setDetail] = useState('Checking SENTRY data connection');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch('/api/health', { headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const workspace = payload.workspace_available ?? {};
        const missing = Object.entries(workspace)
          .filter(([, value]) => value === false)
          .map(([key]) => key.replaceAll('_', ' '));
        if (cancelled) return;
        setState('online');
        setDetail(missing.length ? `Online · missing ${missing.slice(0, 2).join(', ')}` : 'Online · data workspace mounted');
      } catch (error) {
        if (cancelled) return;
        setState('offline');
        setDetail(error instanceof Error ? `Backend offline · ${error.message}` : 'Backend offline');
      }
    };

    check();
    const interval = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled]);

  return { state, detail };
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isReady, authError, authWarning } = useAuth();
  const [identity, setIdentity] = useState('');

  const submitIdentity = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = identity.trim();
    if (!trimmed) return;
    try { window.sessionStorage.setItem(SENTRY_USER_SESSION_KEY, trimmed); } catch { /* noop */ }
    window.location.reload();
  };

  const resetIdentity = () => {
    try { window.sessionStorage.removeItem(SENTRY_USER_SESSION_KEY); } catch { /* noop */ }
    window.location.reload();
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-wmt-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Verifying access</span>
        </div>
      </div>
    );
  }

  if (authError) {
    const canEnterIdentity = authError.includes('no user identity is configured');

    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--s-bg)' }}>
        <div className="max-w-xl w-full rounded-2xl border p-6 text-center" style={{ background: 'var(--s-card)', borderColor: 'rgba(234,17,0,0.35)' }}>
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-black mb-2" style={{ color: 'var(--s-text)' }}>SENTRY access required</h1>
          <p className="text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>{authError}</p>
          {canEnterIdentity ? (
            <form onSubmit={submitIdentity} className="mt-5 flex flex-col sm:flex-row gap-2">
              <input
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                placeholder="your_userid"
                aria-label="SENTRY user ID"
                className="sentry-input flex-1 text-sm"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{ background: '#0053E2', color: '#fff' }}
              >
                Continue
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={resetIdentity}
              className="mt-5 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--s-input-bg)', color: 'var(--s-text)', border: '1px solid var(--s-border-mid)' }}
            >
              Use a different user ID
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {authWarning && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] rounded-full px-4 py-2 text-[11px] font-bold shadow-lg"
          style={{ background: 'rgba(255,194,32,0.14)', border: '1px solid rgba(255,194,32,0.45)', color: '#FFC220' }}
          role="status"
        >
          {authWarning}
        </div>
      )}
      {children}
    </>
  );
}

function RequireAdmin({ children, viewName = 'this workspace' }: { children: React.ReactNode; viewName?: string }) {
  const { user } = useAuth();

  if (!user?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-fadeIn">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--s-text)' }}>Admin Access Required</h2>
        <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>
          You need SENTRY administrator privileges to access {viewName}.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Main app ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(() => !readPlatformEntered());
  const [currentView, setCurrentView] = useState<ViewState>(() => readStoredView());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hamburgerStyle = { color: 'var(--s-text)', borderColor: 'var(--s-border)' } as React.CSSProperties;
  const { greeting, dateLabel, timeLabel } = useGreeting();
  const backendHealth = useBackendHealth(!showLanding);

  const handleEnterPlatform = useCallback((initialView?: ViewState) => {
    setShowLanding(false);
    if (initialView) {
      setCurrentView(initialView);
      try { window.sessionStorage.setItem(PLATFORM_VIEW_KEY, initialView); } catch { /* noop */ }
      trackView(initialView);
    }
    try { window.sessionStorage.setItem(PLATFORM_ENTERED_KEY, 'true'); } catch { /* noop */ }
    trackEvent('platform_entered', { initial_view: initialView ?? ViewState.HOME });
  }, []);

  const handleNavigate = useCallback((view: ViewState) => {
    setCurrentView(view);
    setSidebarOpen(false); // auto-close mobile drawer after picking a view
    try { window.sessionStorage.setItem(PLATFORM_VIEW_KEY, view); } catch { /* noop */ }
    trackView(view);
  }, []);

  // Cmd/Ctrl-K opens palette anywhere
  useEffect(() => {
    if (showLanding) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLanding]);

  if (showLanding) {
    return (
      <ThemeProvider>
        <ViewErrorBoundary viewName="Landing Page">
          <LandingPage onEnter={(initialView) => handleEnterPlatform(initialView as ViewState | undefined)} />
        </ViewErrorBoundary>
      </ThemeProvider>
    );
  }

  const meta = VIEW_META[currentView];

  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <VendorProvider>
            <div className="flex h-screen text-slate-300 overflow-hidden" style={{ background: 'var(--s-bg)' }}>
              {/* Mobile drawer backdrop */}
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-40 bg-black/50 md:hidden"
                  onClick={() => setSidebarOpen(false)}
                  aria-hidden
                />
              )}
              <Sidebar currentView={currentView} onNavigate={handleNavigate} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col overflow-hidden relative">
              {/* Header */}
              <header
                className="shrink-0 px-8 py-4 flex items-center justify-between gap-4 border-b relative"
                style={{
                  background: 'var(--s-header)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                  borderColor: 'var(--s-border)',
                }}
              >
                {/* Platform brand bar + title */}
                <div className="flex items-center gap-4 min-w-0">
                  <button type="button" onClick={() => setSidebarOpen(true)} className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg shrink-0 border" style={hamburgerStyle} aria-label="Open navigation menu">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                  </button>
                  <div
                    className="w-1 h-11 rounded-full shrink-0"
                    style={{ background: 'linear-gradient(to bottom, #FFC220 0%, #FFC220 35%, #0053E2 70%, #001E60 100%)' }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.32em] mb-0.5"
                      style={{ color: '#FFC220' }}
                    >
                      {meta.eyebrow}
                    </p>
                    <h2 className="text-xl font-extrabold leading-tight tracking-tight truncate" style={{ color: 'var(--s-text)' }}>
                      {meta.title}
                    </h2>
                    <p className="text-xs mt-0.5 leading-snug truncate" style={{ color: 'var(--s-text-dim)' }}>
                      {meta.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right cluster */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Greeting block */}
                  <div className="hidden md:flex flex-col items-end pr-3 mr-1 border-r" style={{ borderColor: 'var(--s-border)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--s-text)' }}>{greeting}</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
                      {dateLabel} · {timeLabel}
                    </span>
                  </div>

                  {/* Command palette button */}
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:-translate-y-px"
                    style={{
                      background: 'var(--s-input-bg)',
                      border: '1px solid var(--s-border-mid)',
                      color: 'var(--s-text-muted)',
                    }}
                    aria-label="Open command palette"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                    </svg>
                    Jump to…
                    <kbd
                      className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                      style={{ background: 'var(--s-hover-over)', border: '1px solid var(--s-border)' }}
                    >
                      ⌘K
                    </kbd>
                  </button>

                  {/* Live status pill */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
                    style={{
                      background: backendHealth.state === 'offline' ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
                      border: backendHealth.state === 'offline' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(34,197,94,0.25)',
                    }}
                    title={backendHealth.detail}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      {backendHealth.state !== 'offline' && <span className="absolute inset-0 rounded-full bg-green-400 animate-ping-ring opacity-60" />}
                      <span className={`relative w-1.5 h-1.5 rounded-full ${backendHealth.state === 'offline' ? 'bg-red-400' : 'bg-green-400'}`} />
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${backendHealth.state === 'offline' ? 'text-red-400' : 'text-green-400'}`}>
                      {backendHealth.state === 'checking' ? 'Sync' : backendHealth.state === 'offline' ? 'Offline' : 'Live'}
                    </span>
                  </div>
                </div>

                {/* Hairline accent */}
                <div
                  className="absolute left-0 right-0 -bottom-px h-px pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,83,226,0.5) 30%, rgba(255,194,32,0.5) 70%, transparent 100%)' }}
                  aria-hidden
                />
              </header>

              {/* Page body */}
              <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 lg:py-8 relative">
                {/* Subtle grid backdrop — gives the workspace a futuristic floor */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(0,83,226,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,83,226,0.6) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 90%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 90%)',
                  }}
                />
                <div className="relative">
                  <PageTransition viewKey={currentView}>
                    <Suspense fallback={<ViewLoader />}>
                      {currentView === ViewState.HOME && (
                        <ViewErrorBoundary viewName="Mission Control">
                          <HomeDashboard onNavigate={handleNavigate} />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.DIRECTORY && (
                        <ViewErrorBoundary viewName="Vendor Directory">
                          <VendorDashboard />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.PROJECTS && (
                        <ViewErrorBoundary viewName="Project Portfolio">
                          <ProjectDashboard3D />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.REQUEST_ASSESSMENT && (
                        <ViewErrorBoundary viewName="Security Assessment">
                          <RequestAssessment />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.REQUEST_QUEUE && (
                        <ViewErrorBoundary viewName="Request Queue">
                          <RequireAdmin viewName="the request triage queue">
                            <RequestQueue />
                          </RequireAdmin>
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.COMPETITOR_ANALYSIS && (
                        <ViewErrorBoundary viewName="Market Analysis">
                          <CompetitorAnalysis onNavigate={handleNavigate} />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.COMPETITOR_INTEL && (
                        <ViewErrorBoundary viewName="Competitor Intelligence">
                          <CompetitorIntel />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.EXECUTIVE_INTEL && (
                        <ViewErrorBoundary viewName="Executive Intelligence">
                          <ExecutiveIntelligence />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.INCIDENT_INTELLIGENCE && (
                        <ViewErrorBoundary viewName="Incident Intelligence">
                          <IncidentIntelligence />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.INTEL_TIMELINE && (
                        <ViewErrorBoundary viewName="Intel Timeline">
                          <IntelTimeline />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.REGULATORY_INTELLIGENCE && (
                        <ViewErrorBoundary viewName="Regulatory Intelligence">
                          <RegulatoryIntelligence />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.REQUEST_LAB_VISIT && (
                        <ViewErrorBoundary viewName="Emerging Tech Lab">
                          <RequestLabVisit />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.ARCHITECTURE && (
                        <ViewErrorBoundary viewName="SENTRY Architecture">
                          <ArchitectureGraph />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.ADMIN && (
                        <ViewErrorBoundary viewName="VAR Administration">
                          <RequireAdmin viewName="VAR administration">
                            <AdminPanel />
                          </RequireAdmin>
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.SENTINEL && (
                        <ViewErrorBoundary viewName="Ask Sentinel">
                          <Sentinel />
                        </ViewErrorBoundary>
                      )}
                      {currentView === ViewState.RISK_MAP && (
                        <ViewErrorBoundary viewName="Risk Map 3D">
                          <VendorRiskMap3D />
                        </ViewErrorBoundary>
                      )}
                    </Suspense>
                  </PageTransition>
                </div>
              </div>

              <Suspense fallback={null}>
                <CommandPalette
                  open={paletteOpen}
                  onClose={() => setPaletteOpen(false)}
                  onNavigate={handleNavigate}
                />
              </Suspense>
            </main>
            </div>
          </VendorProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
