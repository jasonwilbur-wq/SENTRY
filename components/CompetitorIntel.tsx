/**
 * CompetitorIntel — Competitor Intelligence hub page.
 *
 * Sections:
 *  1. 3D Orbital hero + KPI strip
 *  2. Executive insights
 *  3. Competitor profile cards (GlassCard3D)
 *  4. Monthly trend (Recharts LineChart)
 *  5. Threat heatmap
 *  6. Live event feed (CompetitorEventTable)
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  fetchCompetitorStats, fetchCompetitorEntities,
  fetchCompetitorMonthly, fetchCompetitorHeatmap,
  CompetitorStats, CompetitorEntity,
} from '../services/api';
import { GlassCard3D } from './GlassCard3D';
import { CompetitorOrbital3D } from './CompetitorOrbital3D';
import { CompetitorEventTable } from './CompetitorEventTable';

// ── Palette ──────────────────────────────────────────────────────────────
const PALETTE = ['#0053E2','#EA1100','#FFC220','#22c55e','#7C3AED',
                 '#0891B2','#D97706','#BE185D'];
const THREAT_BG: Record<string, string> = {
  High:   'bg-red-500/15 border-red-500/40 text-red-400',
  Medium: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
  Low:    'bg-green-500/15 border-green-500/40 text-green-400',
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
  ins.push(
    `Cyber incidents account for ${cyberPct}% of all events (${stats.cyber} total). ` +
    `Kroger and Amazon drive the majority of cyber-category entries.`,
  );
  ins.push(
    `Recall events (${stats.recall}) remain the single largest event type — ` +
    `primarily food-safety driven across Costco, Kroger, Whole Foods, and Amazon.`,
  );
  const highCount = entities.filter(e => e.threat_level === 'High').length;
  if (highCount > 0) {
    const names = entities.filter(e => e.threat_level === 'High').slice(0, 4).map(e => e.name);
    ins.push(`${highCount} competitor(s) rated HIGH threat: ${names.join(', ')}.`);
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
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCompetitorStats(),
      fetchCompetitorEntities(20),
      fetchCompetitorMonthly(5),
      fetchCompetitorHeatmap(10),
    ]).then(([s, e, m, h]) => {
      setStats(s);
      setEntities(e.entities);
      setMonthly(m);
      setHeatmap(h);
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

  const tooltipStyle = {
    backgroundColor: 'var(--s-card)',
    borderColor: 'var(--s-border-mid)',
    borderRadius: '10px',
    color: 'var(--s-text)',
    fontSize: '12px',
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
        className="relative rounded-2xl overflow-hidden mb-8 border border-slate-700"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #0c1a3a 0%, #000B28 70%)',
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
              background: 'linear-gradient(135deg, #60a5fa 0%, #0053E2 50%, #FFC220 100%)',
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
            <KpiPill label="🟣" value={`${stats?.recall ?? 0} Recalls`} color="#a78bfa" />
          </div>

          {/* Action Row */}
          <div className="mt-8 flex gap-3">
            <button className="px-5 py-2 rounded-lg bg-wmt-blue text-white text-xs font-bold shadow-[0_0_15px_rgba(0,83,226,0.4)] hover:bg-blue-600 transition-all">
              Generate Report
            </button>
            <button className="px-5 py-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-600 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all">
              Configure Sources
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-yellow-300 to-transparent" />
      </div>

      {/* ═══ 2. EXECUTIVE INSIGHTS ═════════════════════════════════════ */}
      <section className="mb-10">
        <SectionHeading title="Executive Intelligence" />
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

      {/* ═══ 3. COMPETITOR CARDS ═══════════════════════════════════════ */}
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
                glowColor={
                  e.threat_level === 'High' ? '#EA1100' :
                  e.threat_level === 'Medium' ? '#FFC220' : '#2A8703'
                }
                intensity={6}
                className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4
                           relative overflow-hidden cursor-pointer"
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
                    <p className="text-lg font-black text-purple-400">{e.recall_count}</p>
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
              </GlassCard3D>
            );
          })}
        </div>
      </section>

      {/* ═══ 4. MONTHLY TREND ══════════════════════════════════════════ */}
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

      {/* ═══ 5. THREAT HEATMAP ═════════════════════════════════════════ */}
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

      {/* ═══ 6. LIVE EVENT FEED ════════════════════════════════════════ */}
      <section>
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
    </div>
  );
};