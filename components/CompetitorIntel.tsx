/**
 * CompetitorIntel — Competitor Intelligence hub page.
 *
 * Sections:
 *  1. 3D Orbital hero + KPI strip
 *  2. Action center / CSO brief queue
 *  3. Strategic readout
 *  4. Competitor profile cards (GlassCard3D)
 *  5. Monthly trend (Recharts LineChart)
 *  6. Threat heatmap
 *  7. Live event feed (CompetitorEventTable)
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  fetchCompetitorStats, fetchCompetitorEntities,
  fetchCompetitorMonthly, fetchCompetitorHeatmap,
  fetchCompetitorCSOCandidates,
  CompetitorStats, CompetitorEntity, CompetitorEvent,
} from '../services/api';
import { GlassCard3D } from './GlassCard3D';
import { CompetitorOrbital3D } from './CompetitorOrbital3D';
import { CompetitorEventTable } from './CompetitorEventTable';
import { CompetitorLocationMap } from './CompetitorLocationMap';
import { CompetitorProfileModal } from './CompetitorProfileModal';

// ── Palette ──────────────────────────────────────────────────────────────
const PALETTE = ['#0053E2', '#C62828', '#FFC220', '#2A8703', '#7893B8',
                 '#D95F02', '#001E60', '#111827'];
const THREAT_BG: Record<string, string> = {
  High:   'bg-red-500/15 border-red-500/40 text-red-400',
  Medium: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
  Low:    'bg-green-500/15 border-green-500/40 text-green-400',
};

const PRIORITY_BG: Record<string, string> = {
  P1: 'bg-red-500/15 border-red-500/40 text-red-300',
  P2: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200',
  P3: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
  P4: 'bg-slate-500/15 border-slate-500/40 text-slate-300',
};

const OWNER_BY_CATEGORY: Record<string, string> = {
  Cyber: 'Cyber / InfoSec',
  Technology: 'EST Technology Owner',
  'ORC/Theft': 'Asset Protection',
  Recall: 'Food Safety / Compliance',
  Legal: 'Legal / Compliance',
  Compliance: 'Compliance',
  Fraud: 'Asset Protection',
  Operational: 'Operations Resilience',
  Strategic: 'EST Strategy',
};

// ── Helpers ──────────────────────────────────────────────────────────────
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-black text-white tracking-wide">{title}</h3>
      {subtitle && <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function KpiPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      className="px-3 py-1.5 rounded-full text-xs font-bold border border-white/10
                 bg-white/5 backdrop-blur-sm whitespace-nowrap"
      style={{ color }}
    >
      <span className="opacity-50 mr-1">{label}</span>{value}
    </div>
  );
}

function ActionMetric({ label, value, tone = 'text-white' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className={`text-lg font-black ${tone}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
    </div>
  );
}

function inferOwner(ev: CompetitorEvent): string {
  return ev.recommended_owner || OWNER_BY_CATEGORY[ev.category] || 'Intel Triage';
}

function briefReadinessLabel(ev: CompetitorEvent): string {
  if (ev.is_brief_ready) return 'CSO-ready';
  if ((ev.readiness_issues?.length ?? 0) > 0) return 'Needs evidence';
  if ((ev.readiness_warnings?.length ?? 0) > 0) return 'Needs review';
  return ev.triage_status || 'Triage';
}

function genInsights(stats: CompetitorStats, entities: CompetitorEntity[]): string[] {
  const ins: string[] = [];
  if (entities[0]) {
    const pct = Math.round(entities[0].event_count * 100 / Math.max(stats.total, 1));
    ins.push(
      `${entities[0].name} generated ${entities[0].event_count} events ` +
      `(${pct}% of all tracked activity) — threat level: ${entities[0].threat_level}.`,
    );
  }
  const cyberPct = Math.round(stats.cyber * 100 / Math.max(stats.total, 1));
  const categoryCounts = [
    { label: 'Cyber', value: stats.cyber, context: 'security incident and breach monitoring' },
    { label: 'ORC/Theft', value: stats.orc, context: 'asset protection and shrink exposure' },
    { label: 'Recall', value: stats.recall, context: 'food-safety and product-risk monitoring' },
    { label: 'Legal', value: stats.legal, context: 'regulatory and litigation awareness' },
    { label: 'Strategic', value: stats.strategic, context: 'market positioning and executive moves' },
  ].sort((a, b) => b.value - a.value);
  const topCategory = categoryCounts[0];
  ins.push(
    `Cyber incidents account for ${cyberPct}% of all events (${stats.cyber} total); ` +
    `prioritize events with Walmart relevance, project overlap, or high-confidence sourcing.`,
  );
  if (topCategory) {
    ins.push(
      `${topCategory.label} is the largest tracked category in the indexed dataset ` +
      `(${topCategory.value} events), creating a primary lens for ${topCategory.context}.`,
    );
  }
  const highCount = entities.filter(e => e.threat_level === 'High').length;
  if (highCount > 0) {
    const names = entities.filter(e => e.threat_level === 'High').slice(0, 4).map(e => e.name);
    ins.push(`${highCount} competitor(s) rated HIGH threat, including ${names.join(', ')}.`);
  }
  return ins;
}

// ── Heatmap component (pure CSS grid) ───────────────────────────────────
function HeatmapGrid({
  competitors, categories, matrix,
}: { competitors: string[]; categories: string[]; matrix: number[][] }) {
  const maxVal = Math.max(...matrix.flat(), 1);
  const cellBg = (v: number) => {
    if (v === 0) return 'rgba(255,255,255,0.03)';
    const r = v / maxVal;
    if (r >= 0.8) return 'rgba(234,17,0,0.75)';
    if (r >= 0.6) return 'rgba(234,17,0,0.50)';
    if (r >= 0.4) return 'rgba(255,194,32,0.55)';
    if (r >= 0.2) return 'rgba(0,83,226,0.50)';
    return 'rgba(0,83,226,0.22)';
  };
  const cellFg = (v: number) => {
    if (v === 0) return 'transparent';
    return v / maxVal >= 0.4 ? '#fff' : '#94a3b8';
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '3px', fontSize: '11px' }}>
        <thead>
          <tr>
            <th />
            {categories.map(c => (
              <th key={c} className="text-slate-500 font-semibold px-1 py-1 text-center whitespace-nowrap">
                {c.length > 9 ? c.slice(0, 8) + '…' : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {competitors.map((comp, ri) => (
            <tr key={comp}>
              <td className="text-slate-400 font-semibold text-right pr-2 whitespace-nowrap">
                {comp.length > 14 ? comp.slice(0, 13) + '…' : comp}
              </td>
              {matrix[ri].map((v, ci) => (
                <td
                  key={ci}
                  className="text-center rounded font-bold cursor-default
                             transition-transform hover:scale-125 hover:brightness-130"
                  style={{ background: cellBg(v), color: cellFg(v), padding: '5px 3px' }}
                  title={`${comp} — ${categories[ci]}: ${v} events`}
                >
                  {v > 0 ? v : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────
export const CompetitorIntel: React.FC = () => {
  const [stats, setStats]       = useState<CompetitorStats | null>(null);
  const [entities, setEntities] = useState<CompetitorEntity[]>([]);
  const [monthly, setMonthly]   = useState<{ months: string[]; series: Record<string, number[]> } | null>(null);
  const [heatmap, setHeatmap]   = useState<{ competitors: string[]; categories: string[]; matrix: number[][] } | null>(null);
  const [csoCandidates, setCsoCandidates] = useState<CompetitorEvent[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorEntity | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCompetitorStats(),
      fetchCompetitorEntities(20),
      fetchCompetitorMonthly(5),
      fetchCompetitorHeatmap(10),
      fetchCompetitorCSOCandidates(8),
    ]).then(([s, e, m, h, c]) => {
      setStats(s);
      setEntities(e.entities);
      setMonthly(m);
      setHeatmap(h);
      setCsoCandidates(c.events);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const insights = useMemo(() => {
    if (!stats || !entities.length) return [];
    return genInsights(stats, entities);
  }, [stats, entities]);

  // Build Recharts trend data
  const trendData = useMemo(() => {
    if (!monthly) return [];
    return monthly.months.map((m, i) => {
      const point: Record<string, string | number> = { month: m };
      Object.entries(monthly.series).forEach(([name, arr]) => {
        point[name] = arr[i] ?? 0;
      });
      return point;
    });
  }, [monthly]);

  const top5Names = useMemo(() => {
    if (!monthly) return [];
    return Object.keys(monthly.series);
  }, [monthly]);

  const activitySpikes = useMemo(() => {
    if (!monthly || monthly.months.length < 2) return [];
    const latestIndex = monthly.months.length - 1;
    const previousIndex = latestIndex - 1;
    return Object.entries(monthly.series)
      .map(([name, values]) => {
        const latest = values[latestIndex] ?? 0;
        const previous = values[previousIndex] ?? 0;
        const delta = latest - previous;
        const pct = previous > 0 ? Math.round((delta / previous) * 100) : latest > 0 ? 100 : 0;
        return { name, latest, previous, delta, pct };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.latest - a.latest)
      .slice(0, 4);
  }, [monthly]);

  const ownerRoutes = useMemo(() => {
    const counts = new Map<string, number>();
    csoCandidates.forEach(ev => {
      const owner = inferOwner(ev);
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [csoCandidates]);

  const readiness = useMemo(() => ({
    briefReady: csoCandidates.filter(ev => ev.is_brief_ready).length,
    highRelevance: csoCandidates.filter(ev => (ev.walmart_relevance_score ?? 0) >= 55).length,
    correlated: csoCandidates.filter(ev => ev.correlation_status === 'MATCHED' || (ev.linked_active_projects_count ?? 0) > 0).length,
    needsReview: csoCandidates.filter(ev => !ev.is_brief_ready).length,
  }), [csoCandidates]);

  const tooltipStyle = {
    backgroundColor: 'var(--s-card)',
    borderColor: 'var(--s-border-mid)',
    borderRadius: '10px',
    color: 'var(--s-text)',
    fontSize: '12px',
  };

  const openCompetitorProfile = (entity: CompetitorEntity) => {
    setSelectedCompetitor(entity);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500 animate-pulse-slow">Loading Competitor Intelligence…</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 pb-8">

      {/* ═══ 1. HERO — 3D Orbital + KPIs ═══════════════════════════════ */}
      <div
        className="relative rounded-2xl overflow-hidden mb-8 border border-slate-700 competitor-hero-bg"
        style={{
          height: '460px',
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,83,226,0.5) 1px,transparent 1px),'
              + 'linear-gradient(90deg,rgba(0,83,226,0.5) 1px,transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />

        {/* 3D scene (full area) */}
        <div className="absolute inset-0 z-0">
          <CompetitorOrbital3D entities={entities.slice(0, 12)} />
        </div>

        {/* Text overlay */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="flex items-center justify-center gap-4 mb-3">
            <p className="text-[10px] font-bold text-wmt-yellow tracking-[0.2em] uppercase">
              Sep 2025 – Feb 2026 &nbsp;•&nbsp; Enterprise Security
            </p>
          </div>
          <h2
            className="text-4xl lg:text-5xl font-black mb-3 leading-tight"
            style={{
              background: 'linear-gradient(135deg, #D9E3F0 0%, #0053E2 48%, #FFC220 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Competitor Intelligence
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mb-6">
            Live threat tracking across {stats?.competitor_count ?? '—'} competitors —{' '}
            {stats?.total?.toLocaleString() ?? '—'} events indexed, deduplicated, and analyst-enriched.
            Orbit = event volume • Colour = threat level.
          </p>

          {/* KPI pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            <KpiPill label="🏢" value={`${stats?.competitor_count ?? 0} Competitors`} color="#e2e8f0" />
            <KpiPill label="📋" value={`${stats?.total?.toLocaleString() ?? 0} Events`} color="#e2e8f0" />
            <KpiPill label="🔴" value={`${stats?.cyber ?? 0} Cyber`} color="#f87171" />
            <KpiPill label="🟡" value={`${stats?.orc ?? 0} ORC/Theft`} color="#fbbf24" />
            <KpiPill label="🟠" value={`${stats?.recall ?? 0} Recalls`} color="#D95F02" />
          </div>

          {/* Action Row */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => document.getElementById('competitor-action-center')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-5 py-2 rounded-lg bg-wmt-blue text-white text-xs font-bold shadow-[0_0_15px_rgba(0,83,226,0.4)] hover:bg-blue-600 transition-all"
            >
              Open Action Center
            </button>
            <button
              onClick={() => document.getElementById('competitor-signal-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-5 py-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-600 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all"
            >
              Review Signals
            </button>
            <button
              onClick={() => document.getElementById('competitor-location-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-5 py-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-600 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all"
            >
              Location Map
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-yellow-300 to-transparent" />
      </div>

      {/* ═══ 2. ACTION CENTER ══════════════════════════════════════════ */}
      <section id="competitor-action-center" className="mb-10 scroll-mt-6">
        <SectionHeading
          title="Competitor Intel Action Center"
          subtitle="Decision-ready queue: what matters, why it matters, who owns it, and what needs review next."
        />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <GlassCard3D
            glowColor="#FFC220"
            intensity={5}
            className="xl:col-span-7 bg-slate-900/70 border border-slate-700 rounded-2xl p-5"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-wmt-yellow font-black">CSO brief queue</p>
                <h4 className="text-white text-lg font-black mt-1">Top signals to review</h4>
              </div>
              <span className="px-3 py-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-200 text-[10px] font-bold">
                {csoCandidates.length} candidates
              </span>
            </div>

            <div className="space-y-3">
              {csoCandidates.slice(0, 4).map(ev => (
                <div key={ev.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-semibold">{ev.competitor} · {ev.category}</p>
                      <p className="text-sm text-white font-bold leading-snug mt-0.5">{ev.event_title || 'Untitled signal'}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${PRIORITY_BG[ev.priority_tier || ''] ?? 'bg-slate-500/15 border-slate-500/40 text-slate-300'}`}>
                        {ev.priority_tier || 'Triage'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-200 text-[10px] font-bold">
                        {briefReadinessLabel(ev)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                    <p className="text-slate-400 leading-relaxed">
                      <span className="text-slate-200 font-bold">Why Walmart cares: </span>
                      {ev.why_walmart_cares || ev.security_implication || 'Needs analyst rationale before escalation.'}
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      <span className="text-slate-200 font-bold">Recommended action: </span>
                      {ev.walmart_actionability_context || ev.analyst_notes || `Route to ${inferOwner(ev)} for review.`}
                    </p>
                  </div>
                </div>
              ))}
              {csoCandidates.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/25 p-6 text-center text-sm text-slate-400">
                  No CSO candidates returned by the local intelligence API.
                </div>
              )}
            </div>
          </GlassCard3D>

          <div className="xl:col-span-5 space-y-4">
            <GlassCard3D
              glowColor="#0053E2"
              intensity={4}
              className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <h4 className="text-white font-black text-sm mb-3">Signal readiness</h4>
              <div className="grid grid-cols-2 gap-2">
                <ActionMetric label="CSO-ready" value={readiness.briefReady} tone="text-green-300" />
                <ActionMetric label="Needs review" value={readiness.needsReview} tone="text-yellow-200" />
                <ActionMetric label="High relevance" value={readiness.highRelevance} tone="text-blue-200" />
                <ActionMetric label="Correlated" value={readiness.correlated} tone="text-wmt-yellow" />
              </div>
            </GlassCard3D>

            <GlassCard3D
              glowColor="#EA1100"
              intensity={4}
              className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <h4 className="text-white font-black text-sm mb-3">Activity spikes</h4>
              <div className="space-y-2">
                {activitySpikes.map(spike => (
                  <div key={spike.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300 font-semibold truncate">{spike.name}</span>
                    <span className="text-slate-500">{spike.previous} → {spike.latest}</span>
                    <span className={`font-bold ${spike.delta >= 0 ? 'text-red-300' : 'text-green-300'}`}>
                      {spike.delta >= 0 ? '+' : ''}{spike.delta}
                    </span>
                  </div>
                ))}
                {activitySpikes.length === 0 && <p className="text-xs text-slate-500">Need at least two months of trend data to compare movement.</p>}
              </div>
            </GlassCard3D>

            <GlassCard3D
              glowColor="#2A8703"
              intensity={4}
              className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <h4 className="text-white font-black text-sm mb-3">Owner routing</h4>
              <div className="space-y-2">
                {ownerRoutes.map(route => (
                  <div key={route.owner} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">{route.owner}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">{route.count}</span>
                  </div>
                ))}
                {ownerRoutes.length === 0 && <p className="text-xs text-slate-500">Owner routing will populate once brief candidates are available.</p>}
              </div>
            </GlassCard3D>
          </div>
        </div>
      </section>

      {/* ═══ 3. STRATEGIC READOUT ══════════════════════════════════════ */}
      <section className="mb-10">
        <SectionHeading title="Strategic Readout" subtitle="Short-form analyst takeaways derived from indexed competitor activity." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <GlassCard3D
              key={i}
              glowColor="#FFC220"
              intensity={4}
              className="bg-slate-900/60 border-l-[3px] border-l-yellow-400 border border-slate-700
                         rounded-r-xl p-4 text-xs text-slate-300 leading-relaxed"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              {ins}
            </GlassCard3D>
          ))}
        </div>
      </section>

      {/* ═══ 4. LOCATION MAP ═══════════════════════════════════════════ */}
      <section id="competitor-location-map" className="mb-10 scroll-mt-6">
        <SectionHeading
          title="Competitor Location Map"
          subtitle="Workspace-sourced store and facility footprint by state — filter by competitor"
        />
        <CompetitorLocationMap />
      </section>

      {/* ═══ 5. COMPETITOR CARDS ═══════════════════════════════════════ */}
      <section className="mb-10">
        <SectionHeading
          title="Competitor Profiles — Threat Overview"
          subtitle="Hover any card for 3D depth · click for detail"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadeIn">
          {entities.map(e => {
            const monthly = JSON.parse(e.monthly_json || '{}');
            const monthKeys = ['Sep 2025','Oct 2025','Nov 2025','Dec 2025','Jan 2026','Feb 2026'];
            const maxM = Math.max(...monthKeys.map(k => monthly[k] ?? 0), 1);
            return (
              <GlassCard3D
                key={e.name}
                role="button"
                tabIndex={0}
                aria-label={`Open ${e.name} competitor intelligence profile`}
                onClick={() => openCompetitorProfile(e)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openCompetitorProfile(e);
                  }
                }}
                glowColor={
                  e.threat_level === 'High' ? '#EA1100' :
                  e.threat_level === 'Medium' ? '#FFC220' : '#2A8703'
                }
                intensity={6}
                className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4
                           relative overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-wmt-blue/60"
                style={{ backdropFilter: 'blur(12px)' }}
              >
                {/* Shine overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center
                               text-sm font-black shrink-0"
                    style={{
                      background: `${
                        e.threat_level === 'High' ? '#EA1100' :
                        e.threat_level === 'Medium' ? '#FFC220' : '#2A8703'
                      }22`,
                      color: e.threat_level === 'High' ? '#f87171' :
                             e.threat_level === 'Medium' ? '#fbbf24' : '#4ade80',
                    }}
                  >
                    {e.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{e.name}</h4>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full
                                     font-bold border ${THREAT_BG[e.threat_level]}`}>
                      {e.threat_level} Threat
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div>
                    <p className="text-lg font-black text-white">{e.event_count}</p>
                    <p className="text-[10px] text-slate-500">Events</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-red-400">{e.cyber_count}</p>
                    <p className="text-[10px] text-slate-500">Cyber</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-orange-300">{e.recall_count}</p>
                    <p className="text-[10px] text-slate-500">Recalls</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Top: <span className="text-slate-300 font-medium">{e.top_category ?? '—'}</span>
                  </span>
                  {/* Sparkline */}
                  <div className="flex items-end gap-[2px] h-5">
                    {monthKeys.map(k => {
                      const v = monthly[k] ?? 0;
                      const h = Math.max(3, Math.round(v * 20 / maxM));
                      return (
                        <div
                          key={k}
                          className="w-[4px] rounded-t-sm"
                          style={{
                            height: `${h}px`,
                            background: e.threat_level === 'High' ? '#EA1100' :
                                        e.threat_level === 'Medium' ? '#FFC220' : '#2A8703',
                            opacity: 0.7,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3 border-t border-white/10 pt-2 text-[10px] font-bold text-blue-200">
                  Open dossier →
                </div>
              </GlassCard3D>
            );
          })}
        </div>
      </section>

      {/* ═══ 6. MONTHLY TREND ══════════════════════════════════════════ */}
      {monthly && (
        <section className="mb-10">
          <SectionHeading
            title="Monthly Event Trends — Top 5 Competitors"
            subtitle="6-month incident velocity by competitor"
          />
          <GlassCard3D
            glowColor="#0053E2"
            intensity={4}
            className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5"
            style={{ backdropFilter: 'blur(12px)', overflow: 'visible' }}
          >
            <div style={{ height: 320, overflow: 'visible', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ zIndex: 50 }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  {top5Names.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={PALETTE[i]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: PALETTE[i] }}
                      activeDot={{ r: 7 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard3D>
        </section>
      )}

      {/* ═══ 7. THREAT HEATMAP ═════════════════════════════════════════ */}
      {heatmap && (
        <section className="mb-10">
          <SectionHeading
            title="Threat Category Heatmap — Top 10 Competitors"
            subtitle="Cell = event count · Red = high · Yellow = medium · Blue = low"
          />
          <GlassCard3D
            glowColor="#FFC220"
            intensity={4}
            className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <HeatmapGrid {...heatmap} />
          </GlassCard3D>
        </section>
      )}

      {/* ═══ 8. LIVE EVENT FEED ════════════════════════════════════════ */}
      <section id="competitor-signal-feed" className="scroll-mt-6">
        <SectionHeading
          title="Live Event Intelligence Feed"
          subtitle="Filter by competitor, category, month, or keyword — click any row to expand"
        />
        <GlassCard3D
          glowColor="#0053E2"
          intensity={3}
          className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <CompetitorEventTable
            competitors={entities.map(e => e.name)}
          />
        </GlassCard3D>
      </section>

      {/* Footer */}
      <div className="text-center py-4 border-t border-slate-800 mt-10">
        <p className="text-[10px] text-slate-600">
          Source: Walmart Competitor Analysis Dataset · Jason Wilbur, Sr. Security Manager – EST ·
          Sep 2025 – Feb 2026 · {stats?.total?.toLocaleString()} events ·
          {stats?.competitor_count} competitors · Internal Use Only
        </p>
      </div>

      {selectedCompetitor && (
        <CompetitorProfileModal
          entity={selectedCompetitor}
          onClose={() => setSelectedCompetitor(null)}
        />
      )}
    </div>
  );
};