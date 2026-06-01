import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RegObligation, RegSummary } from '../types';
import {
  apiFetch,
  fetchRegulatoryInsights,
  fetchRegulatoryObligations,
  fetchRegulatorySummary,
  fetchRegulatoryTrends,
  type RegulatoryInsights,
  type TrendPayload,
} from '../services/api';
import { RegulatoryObligationModal } from './RegulatoryObligationModal';
import { RegulatoryMapExplorer } from './RegulatoryMapExplorer';
import { TrendInsights } from './TrendInsights';
import { ViewErrorBoundary } from './ViewErrorBoundary';
import {
  ActionCard,
  HotspotChips,
  KpiCard,
  RagBadge,
  SparklineTrend,
  TECH_ICONS,
  TechPill,
} from './regulatoryUiBits';
const E_DL = '📥';
const REG_SCOPE_KEY = 'sentry.regulatory.scope';
const REG_JUR_KEY = 'sentry.regulatory.jurisdiction';
function readStoredScope(): 'all' | 'us' | 'global' {
  try {
    const stored = window.sessionStorage.getItem(REG_SCOPE_KEY);
    return stored === 'us' || stored === 'global' ? stored : 'all';
  } catch {
    return 'all';
  }
}
function readStoredJurisdiction(): string | null {
  try {
    return window.sessionStorage.getItem(REG_JUR_KEY);
  } catch {
    return null;
  }
}
// ── Main component ───────────────────────────────────────────────────
export const RegulatoryIntelligence: React.FC = () => {
  const [summary, setSummary]             = useState<RegSummary | null>(null);
  const [obligations, setObligations]     = useState<RegObligation[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [obLoading, setObLoading]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [selected, setSelected]           = useState<RegObligation | null>(null);
  const [geoScope, setGeoScope]           = useState<'all' | 'us' | 'global'>(() => readStoredScope());
  const [insights, setInsights]           = useState<RegulatoryInsights | null>(null);
  const [trends, setTrends]               = useState<TrendPayload | null>(null);
  const [mapOpenSignal, setMapOpenSignal] = useState(0);
  // Filters
  const [filterRag, setFilterRag]         = useState('');
  const [filterTech, setFilterTech]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterQ, setFilterQ]             = useState('');
  const [filterJur, setFilterJur]         = useState<string | null>(() => readStoredJurisdiction());
  const [sortBy, setSortBy]               = useState('risk');
  const obligationsSectionRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage]                   = useState(1);
  const PAGE_SIZE = 20;
  // Globe → table click handler
  const handleGlobeClick = useCallback((jurisdiction: string | null) => {
    setFilterJur(jurisdiction);
    setPage(1);
    if (jurisdiction && obligationsSectionRef.current) {
      obligationsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(REG_SCOPE_KEY, geoScope);
    } catch {
      // no-op
    }
  }, [geoScope]);
  useEffect(() => {
    try {
      if (filterJur) {
        window.sessionStorage.setItem(REG_JUR_KEY, filterJur);
      } else {
        window.sessionStorage.removeItem(REG_JUR_KEY);
      }
    } catch {
      // no-op
    }
  }, [filterJur]);
  // Fetch summary (non-fatal fallback keeps the page visible)
  useEffect(() => {
    fetchRegulatorySummary()
      .then((payload) => setSummary(payload as unknown as RegSummary))
      .catch(() => {
        setSummary((prev) => prev ?? {
          id: 'regulatory-fallback',
          title: 'Regulatory Intelligence',
          summary: 'Summary endpoint unavailable. Showing obligations feed only.',
          created_at: new Date().toISOString(),
          data_through: 'Unknown',
          jurisdictions: [],
          stats: { total_obligations: 0, red: 0, amber: 0, yellow: 0, green: 0, enacted: 0, proposed: 0, tech_breakdown: {} },
          top_actions: [],
          assumptions: [],
          confidence: 'Low',
        });
      })
      .finally(() => setLoading(false));
  }, []);
  // Fetch executive insights (scope-aware, non-fatal)
  useEffect(() => {
    fetchRegulatoryInsights(geoScope)
      .then(setInsights)
      .catch(() => setInsights({
        scope: geoScope,
        summary: 'Executive insights unavailable from backend.',
        total_obligations: summary?.stats?.total_obligations ?? 0,
        red_amber_total: (summary?.stats?.red ?? 0) + (summary?.stats?.amber ?? 0),
        top_hotspots: [], top_tech: [], status_breakdown: {},
        daily_breakdown: [], monthly_breakdown: [], quarterly_breakdown: [],
        executive_top: ['Insights temporarily unavailable.'],
        executive_bottom: ['Use table filters and RAG bands for triage.'],
      }));
  }, [geoScope, summary]);
  // Fetch scope-aware trend analytics (non-fatal)
  useEffect(() => {
    fetchRegulatoryTrends(geoScope, 'monthly')
      .then(setTrends)
      .catch(() => setTrends(null));
  }, [geoScope]);
  // Fetch obligations with filters
  const fetchObligations = useCallback(() => {
    setObLoading(true);
    fetchRegulatoryObligations<RegObligation>({
      page,
      page_size: PAGE_SIZE,
      sort: sortBy,
      rag: filterRag || undefined,
      tech: filterTech || undefined,
      status: filterStatus || undefined,
      q: filterQ || undefined,
      jurisdiction: filterJur || undefined,
      scope: geoScope,
    })
      .then((d) => {
        setObligations(d.obligations);
        setTotal(d.total);
      })
      .catch(e => setError(String(e)))
      .finally(() => setObLoading(false));
  }, [page, sortBy, filterRag, filterTech, filterStatus, filterQ, filterJur, geoScope]);
  useEffect(() => { setPage(1); }, [filterRag, filterTech, filterStatus, filterQ, filterJur, sortBy]);
  useEffect(() => { fetchObligations(); }, [fetchObligations]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const techBreakdown = useMemo(() => {
    return Object.entries(summary?.stats?.tech_breakdown ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [summary]);
  const maxTechCount = techBreakdown[0]?.[1] ?? 1;
  const latestMonthly = useMemo(() => (insights?.monthly_breakdown ?? []).slice(-6), [insights]);
  const latestQuarterly = useMemo(() => (insights?.quarterly_breakdown ?? []).slice(-4), [insights]);
  const downloadJSON = useCallback(async () => {
    const res = await apiFetch('/api/regulatory/download');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'sentry-regulatory-briefing.json'; a.click();
    URL.revokeObjectURL(url);
  }, []);
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>Loading regulatory intelligence…</p>
      </div>
    </div>
  );
  if (error && !summary) return (
    <div className="rounded-xl p-6 border" style={{ background: 'rgba(234,17,0,0.08)', borderColor: 'rgba(234,17,0,0.3)' }}>
      <p className="text-red-400 font-bold">Failed to load regulatory data</p>
      <p className="text-sm text-red-300 mt-1">{error}</p>
      <p className="text-xs mt-2" style={{ color: 'var(--s-text-dim)' }}>
        Ensure the backend is running and run <code>python build_regulatory_report.py</code>.
      </p>
    </div>
  );
  const stats = summary?.stats;
  const jurisdictions = summary?.jurisdictions ?? [];
  const hasActiveFilter = !!(filterRag || filterTech || filterStatus || filterQ || filterJur || geoScope !== 'all');
  const handleHotspotSelect = (jurisdiction: string) => {
    setFilterJur((prev) => (prev === jurisdiction ? null : jurisdiction));
    setPage(1);
  };
  return (
    <div className="space-y-5 max-w-full overflow-hidden">
      {/* ═══ 1. PAGE HEADER — separate from globe for full interactivity ═══ */}
      <div className="text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2"
          style={{ color: '#FFC220' }}>
          Enterprise Security &nbsp;·&nbsp; Global Regulatory Intelligence
        </p>
        <h1
          className="text-3xl lg:text-4xl font-black mb-2 leading-tight"
          style={{
            background: 'linear-gradient(135deg, #D9E3F0 0%, #0053E2 48%, #FFC220 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Regulatory Intelligence
        </h1>
        <p className="text-sm mx-auto max-w-xl mb-3" style={{ color: 'var(--s-text-muted)' }}>
          {stats?.total_obligations ?? '—'} obligations across {jurisdictions.length} jurisdictions — real-time RAG risk mapping
        </p>
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => setMapOpenSignal((v) => v + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: '#0053e2', color: '#fff', border: '1px solid #0053e2' }}
          >
            Open map explorer
          </button>
          {filterJur && (
            <button
              onClick={() => {
                setFilterJur(null);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', border: '1px solid rgba(255,194,32,0.35)' }}
            >
              Clear map selection
            </button>
          )}
        </div>
        {/* RAG summary pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {([
            ['Red',    stats?.red,      'rgba(234,17,0,0.15)',   '#ff6b6b', 'rgba(234,17,0,0.4)'],
            ['Amber',  stats?.amber,    'rgba(249,115,22,0.15)', '#fb923c', 'rgba(249,115,22,0.4)'],
            ['Yellow', stats?.yellow,   'rgba(255,194,32,0.15)', '#FFC220', 'rgba(255,194,32,0.4)'],
            ['Green',  stats?.green,    'rgba(42,135,3,0.15)',   '#4ade80', 'rgba(42,135,3,0.4)'],
            ['Enacted',stats?.enacted,  'rgba(0,83,226,0.15)',   '#D9E3F0', 'rgba(0,83,226,0.4)'],
          ] as const).map(([label, count, bg, color, border]) => (
            <span key={label} className="px-3 py-1.5 rounded-full text-xs font-bold border"
              style={{ background: bg, color, borderColor: border }}>
              {count ?? '—'} {label}
            </span>
          ))}
        </div>
      </div>
      {/* ═══ TOP EXEC INSIGHTS ═══════════════════════════════════════ */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Executive Insights (Top)</h2>
          <span className="text-[10px] px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,83,226,0.15)', color: '#D9E3F0', border: '1px solid rgba(0,83,226,0.3)' }}>
            Scope: {geoScope.toUpperCase()}
          </span>
        </div>
        <ul className="space-y-1.5">
          {(insights?.executive_top ?? []).map((item, idx) => (
            <li key={idx} className="text-xs leading-relaxed px-3 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--s-text-dim)', border: '1px solid var(--s-border-light)' }}>
              • {item}
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--s-text-dim)' }}>
            Top Hotspots (click to filter table)
          </div>
          <HotspotChips
            hotspots={insights?.top_hotspots ?? []}
            activeJurisdiction={filterJur}
            onSelect={handleHotspotSelect}
          />
        </div>
      </div>
      {/* ═══ 2. INTERACTIVE MAP ═══════════════════════════════════════ */}
      <ViewErrorBoundary viewName="Regulatory Map">
        <RegulatoryMapExplorer
          geoScope={geoScope}
          filterJur={filterJur}
          openSignal={mapOpenSignal}
          showInlineOpenButton={false}
          onJurisdictionSelect={handleGlobeClick}
          onScopeChange={(scope) => {
            setGeoScope(scope);
            setFilterJur(null);
            setPage(1);
          }}
        />
      </ViewErrorBoundary>
      {/* ═══ 3. KPI STRIP ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Total" value={stats?.total_obligations ?? 0} sub="obligations" />
        <KpiCard label="Red" value={stats?.red ?? 0} sub="Risk 19-25" rag="Red" />
        <KpiCard label="Amber" value={stats?.amber ?? 0} sub="Risk 13-18" rag="Amber" />
        <KpiCard label="Yellow" value={stats?.yellow ?? 0} sub="Risk 7-12" rag="Yellow" />
        <KpiCard label="Green" value={stats?.green ?? 0} sub="Risk 1-6" rag="Green" />
        <KpiCard label="Enacted" value={stats?.enacted ?? 0} sub="in force" />
        <KpiCard label="Proposed" value={stats?.proposed ?? 0} sub="pending" />
      </div>
      {/* ═══ 4. EXEC SUMMARY + TECH BREAKDOWN ═══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Exec summary — 2/3 width */}
        <div className="lg:col-span-2 rounded-xl p-5 border min-w-0"
          style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Executive Summary</h3>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[9px] px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', border: '1px solid rgba(255,194,32,0.3)' }}>
                Confidence: {summary?.confidence ?? '…'}
              </span>
              <span className="text-[9px] px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'rgba(0,83,226,0.15)', color: '#9BB7DF', border: '1px solid rgba(0,83,226,0.3)' }}>
                Through {summary?.data_through ?? '…'}
              </span>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--s-text-dim)' }}>{summary?.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {jurisdictions.slice(0, 12).map(j => (
              <button key={j}
                onClick={() => { setFilterJur(filterJur === j ? null : j); setPage(1); }}
                className="text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-all hover:opacity-80"
                style={{
                  background: filterJur === j ? 'rgba(255,194,32,0.2)' : 'var(--s-hover-over)',
                  color: filterJur === j ? '#FFC220' : 'var(--s-text-dim)',
                  border: filterJur === j ? '1px solid rgba(255,194,32,0.4)' : '1px solid var(--s-border)',
                }}>
                {j}
              </button>
            ))}
            {jurisdictions.length > 12 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--s-text-dim)' }}>
                +{jurisdictions.length - 12} more
              </span>
            )}
          </div>
        </div>
        {/* Tech breakdown — 1/3 width */}
        <div className="rounded-xl p-5 border min-w-0"
          style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--s-text)' }}>By Technology Category</h3>
          <div className="space-y-2">
            {techBreakdown.map(([tech, count]) => (
              <button key={tech} className="w-full text-left group" onClick={() => setFilterTech(filterTech === tech ? '' : tech)}>
                <div className="flex justify-between text-[11px] mb-0.5 gap-2">
                  <span className="truncate" style={{ color: filterTech === tech ? '#FFC220' : 'var(--s-text)' }}>
                    {TECH_ICONS[tech] ?? '⚖️'} {tech}
                  </span>
                  <span className="shrink-0" style={{ color: 'var(--s-text-dim)' }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s-border-mid)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(count / maxTechCount) * 100}%`, background: filterTech === tech ? '#FFC220' : 'rgba(0,83,226,0.7)' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* ═══ TREND BREAKDOWNS (Monthly / Quarterly) ═════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SparklineTrend title="Monthly Breakdown" points={latestMonthly} color="#0053e2" />
        <SparklineTrend title="Quarterly Breakdown" points={latestQuarterly} color="#FFC220" />
      </div>
      {/* ═══ RICH TREND ANALYTICS (momentum / weighted / anomalies) ═══ */}
      <TrendInsights data={trends} title={'\u{1F4C8} What Changed (Regulatory)'} />
      {/* ═══ 5. OBLIGATION TABLE + REMEDIATION ═══════════════════════════ */}
      <div ref={obligationsSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Obligation table — 2/3 */}
        <div className="xl:col-span-2 rounded-xl border overflow-hidden min-w-0 flex flex-col"
          style={{ borderColor: 'var(--s-border)' }}>
          {/* Toolbar */}
          <div className="p-3 flex flex-wrap gap-2 items-center shrink-0"
            style={{ background: 'var(--s-card)', borderBottom: '1px solid var(--s-border)' }}>
            <input
              type="search" placeholder="Search obligations…"
              value={filterQ} onChange={e => setFilterQ(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg text-sm bg-transparent border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
            />
            <select value={filterRag} onChange={e => setFilterRag(e.target.value)}
              className="sentry-select text-xs py-1.5 px-2">
              <option value="">All RAG</option>
              {['Red','Amber','Yellow','Green'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterTech} onChange={e => setFilterTech(e.target.value)}
              className="sentry-select text-xs py-1.5 px-2">
              <option value="">All Tech</option>
              {techBreakdown.map(([t]) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="sentry-select text-xs py-1.5 px-2">
              <option value="">All Status</option>
              <option value="Enacted">Enacted</option>
              <option value="Proposed">Proposed</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="sentry-select text-xs py-1.5 px-2">
              <option value="risk">Sort: Risk ↓</option>
              <option value="title">Sort: Title</option>
              <option value="jurisdiction">Sort: Jurisdiction</option>
            </select>
            {filterJur && (
              <button onClick={() => setFilterJur(null)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0"
                style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', border: '1px solid rgba(255,194,32,0.3)' }}>
                🌍 {filterJur} ✕
              </button>
            )}
            {hasActiveFilter && (
              <button
                onClick={() => {
                  setFilterRag('');
                  setFilterTech('');
                  setFilterStatus('');
                  setFilterQ('');
                  setFilterJur(null);
                  setGeoScope('all');
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0"
                style={{ background: 'rgba(234,17,0,0.12)', color: '#ff6b6b', border: '1px solid rgba(234,17,0,0.3)' }}>
                Clear all
              </button>
            )}
            <button onClick={downloadJSON}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 shrink-0"
              style={{ background: 'rgba(0,83,226,0.25)', color: '#60a5fa', border: '1px solid rgba(0,83,226,0.35)' }}>
              {E_DL} JSON
            </button>
          </div>
          {/* Table — scrollable */}
          <div className="flex-1 overflow-auto" style={{ maxHeight: '520px' }}>
            {obLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '140px' }} />
                  <col />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                </colgroup>
                <thead className="sticky top-0 z-[2]">
                  <tr style={{ background: 'var(--s-modal-inner)', borderBottom: '1px solid var(--s-border)' }}>
                    {['Risk', 'Jurisdiction', 'Title', 'Tech', 'Status', 'Evidence'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold"
                        style={{ color: 'var(--s-text-dim)', background: 'var(--s-modal-inner)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {obligations.map(ob => (
                    <tr key={ob.id}
                      onClick={() => setSelected(ob)}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      style={{ borderBottom: '1px solid var(--s-border-light)' }}
                    >
                      <td className="px-3 py-2.5"><RagBadge rag={ob.risk.rag} score={ob.risk.score} /></td>
                      <td className="px-3 py-2.5">
                        <button
                          className="block w-full text-left truncate hover:underline text-[11px]"
                          style={{ color: filterJur === ob.jurisdiction ? '#FFC220' : 'var(--s-text-dim)' }}
                          title={ob.jurisdiction}
                          onClick={e => {
                            e.stopPropagation();
                            setFilterJur(filterJur === ob.jurisdiction ? null : ob.jurisdiction);
                            setPage(1);
                          }}
                        >
                          {ob.jurisdiction}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium line-clamp-2 leading-tight text-[11px]"
                          style={{ color: 'var(--s-text)' }} title={ob.title}>
                          {ob.title}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><TechPill tech={ob.tech_category} /></td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          style={{
                            background: ob.status === 'Enacted' ? 'rgba(42,135,3,0.18)' : 'rgba(255,194,32,0.12)',
                            color: ob.status === 'Enacted' ? '#4ade80' : '#FFC220',
                          }}>
                          {ob.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: ob.evidence_status === 'Partially' ? 'rgba(251,146,60,0.12)' : 'rgba(255,255,255,0.06)',
                            color: ob.evidence_status === 'Partially' ? '#fb923c' : 'var(--s-text-dim)',
                          }}>
                          {ob.evidence_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {obligations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12" style={{ color: 'var(--s-text-dim)' }}>
                        No obligations match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderTop: '1px solid var(--s-border)', background: 'var(--s-modal-inner)' }}>
              <span className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>
                {total} obligations · page {page}/{totalPages}
                {filterJur && <span className="ml-2 text-[10px]" style={{ color: '#FFC220' }}>· {filterJur}</span>}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40 transition-opacity"
                  style={{ background: 'var(--s-hover-over)', color: 'var(--s-text)', border: '1px solid var(--s-border)' }}>
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40 transition-opacity"
                  style={{ background: 'var(--s-hover-over)', color: 'var(--s-text)', border: '1px solid var(--s-border)' }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Remediation Roadmap — 1/3 */}
        <div className="rounded-xl p-5 border flex flex-col gap-3 min-w-0"
          style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Remediation Roadmap</h3>
          <p className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>
            Top prioritised actions by risk and legal deadline.
          </p>
          <div className="space-y-2 flex-1 overflow-y-auto" style={{ maxHeight: '520px' }}>
            {(summary?.top_actions ?? []).map((a, i) => <ActionCard key={i} action={a} idx={i} />)}
          </div>
          <details className="mt-2">
            <summary className="text-[10px] cursor-pointer font-bold uppercase tracking-wider"
              style={{ color: 'var(--s-text-dim)' }}>
              Assumptions &amp; Confidence
            </summary>
            <ul className="mt-2 space-y-1.5">
              {(summary?.assumptions ?? []).map((a, i) => (
                <li key={i} className="text-[10px] leading-relaxed p-2 rounded"
                  style={{ background: 'var(--s-hover-over)', color: 'var(--s-text-dim)' }}>{a}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
      {/* ═══ BOTTOM EXEC INSIGHTS ═════════════════════════════════════ */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Executive Insights (Bottom)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--s-border-light)', background: 'rgba(0,83,226,0.08)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--s-text-dim)' }}>In Scope</div>
            <div className="text-xl font-black" style={{ color: '#60a5fa' }}>{insights?.total_obligations ?? 0}</div>
          </div>
          <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--s-border-light)', background: 'rgba(234,17,0,0.08)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--s-text-dim)' }}>Red + Amber</div>
            <div className="text-xl font-black" style={{ color: '#ff6b6b' }}>{insights?.red_amber_total ?? 0}</div>
          </div>
          <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--s-border-light)', background: 'rgba(255,194,32,0.1)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--s-text-dim)' }}>Top Hotspot</div>
            <div className="text-sm font-bold" style={{ color: '#FFC220' }}>{insights?.top_hotspots?.[0]?.jurisdiction ?? 'N/A'}</div>
          </div>
        </div>
        <ul className="space-y-1.5">
          {(insights?.executive_bottom ?? []).map((item, idx) => (
            <li key={idx} className="text-xs leading-relaxed px-3 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--s-text-dim)', border: '1px solid var(--s-border-light)' }}>
              • {item}
            </li>
          ))}
        </ul>
      </div>
      {/* Obligation detail modal */}
      {selected && <RegulatoryObligationModal obligation={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
