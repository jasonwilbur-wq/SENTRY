import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CompetitorEntity,
  CompetitorEvent,
  CompetitorStats,
} from '../../services/api';
import { CompetitorOrbital3D } from '../CompetitorOrbital3D';
import { GlassCard3D } from '../GlassCard3D';

export const PALETTE = ['#0053E2', '#C62828', '#FFC220', '#2A8703', '#7893B8', '#D95F02', '#001E60', '#111827'];

const THREAT_BG: Record<string, string> = {
  High: 'bg-red-500/15 border-red-500/40 text-red-400',
  Medium: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
  Low: 'bg-green-500/15 border-green-500/40 text-green-400',
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

export const inferOwner = (ev: CompetitorEvent): string => (
  ev.recommended_owner || OWNER_BY_CATEGORY[ev.category] || 'Intel Triage'
);

export const briefReadinessLabel = (ev: CompetitorEvent): string => {
  if (ev.is_brief_ready) return 'CSO-ready';
  if ((ev.readiness_issues?.length ?? 0) > 0) return 'Needs evidence';
  if ((ev.readiness_warnings?.length ?? 0) > 0) return 'Needs review';
  return ev.triage_status || 'Triage';
};

export function genInsights(stats: CompetitorStats, entities: CompetitorEntity[]): string[] {
  const ins: string[] = [];
  if (entities[0]) {
    const pct = Math.round((entities[0].event_count * 100) / Math.max(stats.total, 1));
    ins.push(
      `${entities[0].name} generated ${entities[0].event_count} events (${pct}% of all tracked activity) — threat level: ${entities[0].threat_level}.`,
    );
  }

  const cyberPct = Math.round((stats.cyber * 100) / Math.max(stats.total, 1));
  const categoryCounts = [
    { label: 'Cyber', value: stats.cyber, context: 'security incident and breach monitoring' },
    { label: 'ORC/Theft', value: stats.orc, context: 'asset protection and shrink exposure' },
    { label: 'Recall', value: stats.recall, context: 'food-safety and product-risk monitoring' },
    { label: 'Legal', value: stats.legal, context: 'regulatory and litigation awareness' },
    { label: 'Strategic', value: stats.strategic, context: 'market positioning and executive moves' },
  ].sort((a, b) => b.value - a.value);

  const topCategory = categoryCounts[0];
  ins.push(
    `Cyber incidents account for ${cyberPct}% of all events (${stats.cyber} total); prioritize events with Walmart relevance, project overlap, or high-confidence sourcing.`,
  );

  if (topCategory) {
    ins.push(
      `${topCategory.label} is the largest tracked category in the indexed dataset (${topCategory.value} events), creating a primary lens for ${topCategory.context}.`,
    );
  }

  const highCount = entities.filter((e) => e.threat_level === 'High').length;
  if (highCount > 0) {
    const names = entities
      .filter((e) => e.threat_level === 'High')
      .slice(0, 4)
      .map((e) => e.name);
    ins.push(`${highCount} competitor(s) rated HIGH threat, including ${names.join(', ')}.`);
  }
  return ins;
}

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
      className="px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-white/5 backdrop-blur-sm whitespace-nowrap"
      style={{ color }}
    >
      <span className="opacity-50 mr-1">{label}</span>
      {value}
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

function HeatmapGrid({
  competitors,
  categories,
  matrix,
}: {
  competitors: string[];
  categories: string[];
  matrix: number[][];
}) {
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
  const cellFg = (v: number) => (v === 0 ? 'transparent' : v / maxVal >= 0.4 ? '#fff' : '#94a3b8');

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '3px', fontSize: '11px' }}>
        <thead>
          <tr>
            <th />
            {categories.map((c) => (
              <th key={c} className="text-slate-500 font-semibold px-1 py-1 text-center whitespace-nowrap">
                {c.length > 9 ? `${c.slice(0, 8)}…` : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {competitors.map((comp, ri) => (
            <tr key={comp}>
              <td className="text-slate-400 font-semibold text-right pr-2 whitespace-nowrap">
                {comp.length > 14 ? `${comp.slice(0, 13)}…` : comp}
              </td>
              {matrix[ri].map((v, ci) => (
                <td
                  key={ci}
                  className="text-center rounded font-bold cursor-default transition-transform hover:scale-125 hover:brightness-130"
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

export function CompetitorHeroSection({
  entities,
  stats,
}: {
  entities: CompetitorEntity[];
  stats: CompetitorStats | null;
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-8 border border-slate-700 competitor-hero-bg"
      style={{ height: '460px' }}
    >
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,83,226,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(0,83,226,0.5) 1px,transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />

      <div className="absolute inset-0 z-0">
        <CompetitorOrbital3D entities={entities.slice(0, 12)} />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <p className="text-[10px] font-bold text-wmt-yellow tracking-[0.2em] uppercase mb-3">
          Sep 2025 – Feb 2026 • Enterprise Security
        </p>
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
          Live threat tracking across {stats?.competitor_count ?? '—'} competitors — {stats?.total?.toLocaleString() ?? '—'} events indexed, deduplicated, and analyst-enriched. Orbit = event volume • Colour = threat level.
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          <KpiPill label="🏢" value={`${stats?.competitor_count ?? 0} Competitors`} color="#e2e8f0" />
          <KpiPill label="📋" value={`${stats?.total?.toLocaleString() ?? 0} Events`} color="#e2e8f0" />
          <KpiPill label="🔴" value={`${stats?.cyber ?? 0} Cyber`} color="#f87171" />
          <KpiPill label="🟡" value={`${stats?.orc ?? 0} ORC/Theft`} color="#fbbf24" />
          <KpiPill label="🟠" value={`${stats?.recall ?? 0} Recalls`} color="#D95F02" />
        </div>

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
  );
}

export function CompetitorActionCenterSection({
  csoCandidates,
  readiness,
  activitySpikes,
  ownerRoutes,
}: {
  csoCandidates: CompetitorEvent[];
  readiness: { briefReady: number; highRelevance: number; correlated: number; needsReview: number };
  activitySpikes: { name: string; latest: number; previous: number; delta: number; pct: number }[];
  ownerRoutes: { owner: string; count: number }[];
}) {
  return (
    <section id="competitor-action-center" className="mb-10 scroll-mt-6">
      <SectionHeading
        title="Competitor Intel Action Center"
        subtitle="Decision-ready queue: what matters, why it matters, who owns it, and what needs review next."
      />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <GlassCard3D glowColor="#FFC220" intensity={5} className="xl:col-span-7 bg-slate-900/70 border border-slate-700 rounded-2xl p-5" style={{ backdropFilter: 'blur(12px)' }}>
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
            {csoCandidates.slice(0, 4).map((ev) => (
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
          <GlassCard3D glowColor="#0053E2" intensity={4} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4" style={{ backdropFilter: 'blur(12px)' }}>
            <h4 className="text-white font-black text-sm mb-3">Signal readiness</h4>
            <div className="grid grid-cols-2 gap-2">
              <ActionMetric label="CSO-ready" value={readiness.briefReady} tone="text-green-300" />
              <ActionMetric label="Needs review" value={readiness.needsReview} tone="text-yellow-200" />
              <ActionMetric label="High relevance" value={readiness.highRelevance} tone="text-blue-200" />
              <ActionMetric label="Correlated" value={readiness.correlated} tone="text-wmt-yellow" />
            </div>
          </GlassCard3D>

          <GlassCard3D glowColor="#EA1100" intensity={4} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4" style={{ backdropFilter: 'blur(12px)' }}>
            <h4 className="text-white font-black text-sm mb-3">Activity spikes</h4>
            <div className="space-y-2">
              {activitySpikes.map((spike) => (
                <div key={spike.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-300 font-semibold truncate">{spike.name}</span>
                  <span className="text-slate-500">{spike.previous} → {spike.latest}</span>
                  <span className={`font-bold ${spike.delta >= 0 ? 'text-red-300' : 'text-green-300'}`}>
                    {spike.delta >= 0 ? '+' : ''}
                    {spike.delta}
                  </span>
                </div>
              ))}
              {activitySpikes.length === 0 && <p className="text-xs text-slate-500">Need at least two months of trend data to compare movement.</p>}
            </div>
          </GlassCard3D>

          <GlassCard3D glowColor="#2A8703" intensity={4} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4" style={{ backdropFilter: 'blur(12px)' }}>
            <h4 className="text-white font-black text-sm mb-3">Owner routing</h4>
            <div className="space-y-2">
              {ownerRoutes.map((route) => (
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
  );
}

export function CompetitorProfilesSection({
  entities,
  onOpenCompetitor,
}: {
  entities: CompetitorEntity[];
  onOpenCompetitor: (entity: CompetitorEntity) => void;
}) {
  const monthKeys = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026'];

  return (
    <section className="mb-10">
      <SectionHeading title="Competitor Profiles — Threat Overview" subtitle="Hover any card for 3D depth · click for detail" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadeIn">
        {entities.map((entity) => {
          const monthly = JSON.parse(entity.monthly_json || '{}');
          const maxM = Math.max(...monthKeys.map((k) => monthly[k] ?? 0), 1);

          return (
            <GlassCard3D
              key={entity.name}
              role="button"
              tabIndex={0}
              aria-label={`Open ${entity.name} competitor intelligence profile`}
              onClick={() => onOpenCompetitor(entity)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenCompetitor(entity);
                }
              }}
              glowColor={entity.threat_level === 'High' ? '#EA1100' : entity.threat_level === 'Medium' ? '#FFC220' : '#2A8703'}
              intensity={6}
              className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 relative overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-wmt-blue/60"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                  style={{
                    background: `${entity.threat_level === 'High' ? '#EA1100' : entity.threat_level === 'Medium' ? '#FFC220' : '#2A8703'}22`,
                    color: entity.threat_level === 'High' ? '#f87171' : entity.threat_level === 'Medium' ? '#fbbf24' : '#4ade80',
                  }}
                >
                  {entity.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">{entity.name}</h4>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border ${THREAT_BG[entity.threat_level]}`}>
                    {entity.threat_level} Threat
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div>
                  <p className="text-lg font-black text-white">{entity.event_count}</p>
                  <p className="text-[10px] text-slate-500">Events</p>
                </div>
                <div>
                  <p className="text-lg font-black text-red-400">{entity.cyber_count}</p>
                  <p className="text-[10px] text-slate-500">Cyber</p>
                </div>
                <div>
                  <p className="text-lg font-black text-orange-300">{entity.recall_count}</p>
                  <p className="text-[10px] text-slate-500">Recalls</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Top: <span className="text-slate-300 font-medium">{entity.top_category ?? '—'}</span>
                </span>
                <div className="flex items-end gap-[2px] h-5">
                  {monthKeys.map((monthKey) => {
                    const value = monthly[monthKey] ?? 0;
                    const height = Math.max(3, Math.round((value * 20) / maxM));
                    return (
                      <div
                        key={monthKey}
                        className="w-[4px] rounded-t-sm"
                        style={{
                          height: `${height}px`,
                          background: entity.threat_level === 'High' ? '#EA1100' : entity.threat_level === 'Medium' ? '#FFC220' : '#2A8703',
                          opacity: 0.7,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 border-t border-white/10 pt-2 text-[10px] font-bold text-blue-200">Open dossier →</div>
            </GlassCard3D>
          );
        })}
      </div>
    </section>
  );
}

export function CompetitorMonthlyTrendSection({
  trendData,
  topNames,
}: {
  trendData: Array<Record<string, string | number>>;
  topNames: string[];
}) {
  const tooltipStyle = {
    backgroundColor: 'var(--s-card)',
    borderColor: 'var(--s-border-mid)',
    borderRadius: '10px',
    color: 'var(--s-text)',
    fontSize: '12px',
  };

  return (
    <section className="mb-10">
      <SectionHeading title="Monthly Event Trends — Top 5 Competitors" subtitle="6-month incident velocity by competitor" />
      <GlassCard3D glowColor="#0053E2" intensity={4} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5" style={{ backdropFilter: 'blur(12px)', overflow: 'visible' }}>
        <div style={{ height: 320, overflow: 'visible', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
              <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ zIndex: 50 }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              {topNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={PALETTE[index]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: PALETTE[index] }}
                  activeDot={{ r: 7 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard3D>
    </section>
  );
}

export function CompetitorHeatmapSection({
  heatmap,
}: {
  heatmap: { competitors: string[]; categories: string[]; matrix: number[][] };
}) {
  return (
    <section className="mb-10">
      <SectionHeading
        title="Threat Category Heatmap — Top 10 Competitors"
        subtitle="Cell = event count · Red = high · Yellow = medium · Blue = low"
      />
      <GlassCard3D glowColor="#FFC220" intensity={4} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5" style={{ backdropFilter: 'blur(12px)' }}>
        <HeatmapGrid {...heatmap} />
      </GlassCard3D>
    </section>
  );
}

export function CompetitorStrategicReadout({ insights }: { insights: string[] }) {
  return (
    <section className="mb-10">
      <SectionHeading title="Strategic Readout" subtitle="Short-form analyst takeaways derived from indexed competitor activity." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {insights.map((insight, index) => (
          <GlassCard3D
            key={index}
            glowColor="#FFC220"
            intensity={4}
            className="bg-slate-900/60 border-l-[3px] border-l-yellow-400 border border-slate-700 rounded-r-xl p-4 text-xs text-slate-300 leading-relaxed"
            style={{ backdropFilter: 'blur(10px)' }}
          >
            {insight}
          </GlassCard3D>
        ))}
      </div>
    </section>
  );
}

export function CompetitorSectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <SectionHeading title={title} subtitle={subtitle} />;
}
