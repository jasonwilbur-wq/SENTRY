/**
 * CompetitorAnalysis — Q1 2026 Security Technology Forecast Market Analysis.
 *
 * Data: WMT_ES_Q1 Security Technology Forecast_v1.1 (Jason Wilbur, Feb 2026)
 * 3D globe: MarketGlobe · Charts: Recharts · Cards: GlassCard3D
 *
 * Fixes applied:
 *  • Tooltip clipping → chart wrapper uses overflow:visible
 *  • Bar labels bleeding → horizontal layout (no rotation)
 *  • KPI grid → max 4 cols, text never squashes
 *  • Interactive scatter → custom colored dots + crosshair cursor
 *  • 3D depth → GlassCard3D on every major card
 */
import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend, LabelList,
} from 'recharts';
import { MarketGlobe } from './MarketGlobe';
import { ChatAssistant } from './ChatAssistant';
import { GlassCard3D } from './GlassCard3D';
import { PilotCards } from './PilotCards';
import {
  TECH_CATEGORIES, EXEC_INSIGHTS, KPIS, TIMELINE_ACTIONS,
} from '../data/forecastData';
import { useVendors } from '../context/VendorContext';

// ── Constants ────────────────────────────────────────────────────────────────

const DEPLOY_NUM: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
const SENSE_NUM:  Record<string, number> = { Low: 1, Medium: 2, 'Medium-High': 3, High: 4 };
const PHASE_LABELS = ['0–6 months', '6–12 months', '6–24 months'];
const PHASE_COLORS = ['#0053e2', '#FFC220', '#22c55e'];
const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e', Medium: '#FFC220', High: '#f87171', Critical: '#ef4444',
};

// ── Small reusable sub-components ────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-black text-white tracking-wide">{title}</h3>
      {subtitle && <p className="text-slate-400 text-sm mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <GlassCard3D
      glowColor={color}
      intensity={5}
      className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 flex flex-col"
      style={{ borderLeftColor: color, borderLeftWidth: '3px', backdropFilter: 'blur(10px)' }}
    >
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 line-clamp-2">{label}</p>
      <p className="text-xl font-black leading-none truncate" style={{ color }}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">{unit}</p>
    </GlassCard3D>
  );
}

function InsightCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <GlassCard3D
      glowColor="#0053e2"
      intensity={6}
      className="bg-slate-900/70 border border-slate-700 rounded-xl p-5 flex flex-col"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="text-2xl mb-3 select-none" aria-hidden>{icon}</div>
      <h4 className="text-white font-bold text-sm mb-2">{title}</h4>
      <p className="text-slate-400 text-xs leading-relaxed">{text}</p>
    </GlassCard3D>
  );
}

/** Tooltip for the scatter / bubble chart */
function ScatterTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-2xl max-w-[220px] pointer-events-none"
      style={{
        background: 'rgba(2,8,23,0.95)',
        border: `1px solid ${d.color}66`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="font-bold mb-1.5" style={{ color: d.color }}>{d.name}</p>
      <p className="text-slate-300">Deployability: <span className="text-white">{d.deployLabel}</span></p>
      <p className="text-slate-300">Sensitivity: <span className="text-white">{d.sensitivityLabel}</span></p>
      <p className="text-slate-300">Timeline: <span style={{ color: '#FFC220' }}>{d.timeToValue}</span></p>
      <p className="text-slate-300">
        Investment: <span className="text-green-400">
          ${d.minCostK}k – ${d.maxCostK >= 1000 ? `${(d.maxCostK / 1000).toFixed(1)}M` : `${d.maxCostK}k`}
        </span>
      </p>
      <p className="text-orange-400 mt-1 leading-snug">⚠ {d.primaryRisk}</p>
    </div>
  );
}

/** Custom scatter dot — colored by category, crosshair cursor */
function ScatterDot(props: any) {
  const { cx, cy, payload, r } = props;
  return (
    <circle
      cx={cx} cy={cy} r={r ?? 8}
      fill={payload?.color ?? '#0053e2'}
      fillOpacity={0.82}
      stroke={payload?.color ?? '#0053e2'}
      strokeWidth={1.5}
      strokeOpacity={0.4}
      style={{ cursor: 'crosshair' }}
    />
  );
}

// ── Chart card wrapper — overflow:visible so tooltips escape ─────────────────

function ChartCard({
  title, subtitle, children, height = 300, glowColor = '#0053e2',
}: {
  title: string; subtitle?: string;
  children: React.ReactNode;
  height?: number;
  glowColor?: string;
}) {
  return (
    <GlassCard3D
      glowColor={glowColor}
      intensity={4}
      className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5 flex flex-col"
      style={{ backdropFilter: 'blur(12px)', overflow: 'visible' }}
    >
      <h4 className="text-white font-bold text-sm mb-0.5">{title}</h4>
      {subtitle && <p className="text-slate-400 text-xs mb-4 leading-relaxed">{subtitle}</p>}
      {/* overflow:visible lets Recharts tooltips escape the card boundary */}
      <div style={{ height, overflow: 'visible', position: 'relative' }}>
        {children}
      </div>
    </GlassCard3D>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const CompetitorAnalysis: React.FC = () => {
  const { vendors } = useVendors();
  const [activeTab, setActiveTab] = useState<'forecast' | 'vendors' | 'chat'>('forecast');

  /* Scatter data — one entry per category, sized by average cost */
  const scatterData = useMemo(() =>
    TECH_CATEGORIES.map(tc => ({
      x: DEPLOY_NUM[tc.deployability],
      y: SENSE_NUM[tc.sensitivity],
      z: Math.sqrt((tc.minCostK + tc.maxCostK) / 2) * 1.8,
      name: tc.shortName,
      color: tc.color,
      phase: tc.phase,
      deployLabel: tc.deployability,
      sensitivityLabel: tc.sensitivity,
      timeToValue: tc.timeToValue,
      minCostK: tc.minCostK,
      maxCostK: tc.maxCostK,
      primaryRisk: tc.primaryRisk,
    })),
  []);

  /* Horizontal investment bar data — sorted ascending */
  const investmentData = useMemo(() =>
    [...TECH_CATEGORIES]
      .sort((a, b) => (a.minCostK + a.maxCostK) - (b.minCostK + b.maxCostK))
      .map(tc => ({ name: tc.shortName, avg: Math.round((tc.minCostK + tc.maxCostK) / 2), color: tc.color })),
  []);

  const riskCounts = useMemo(() => {
    const c: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    vendors.forEach(v => { c[v.risk_level] = (c[v.risk_level] ?? 0) + 1; });
    return Object.entries(c).map(([k, v]) => ({ name: k, value: v }));
  }, [vendors]);

  const radarData = useMemo(() => {
    const cats: Record<string, { total: number; count: number }> = {};
    vendors.forEach(v => {
      if (!cats[v.category]) cats[v.category] = { total: 0, count: 0 };
      cats[v.category].total += v.overall_rating;
      cats[v.category].count += 1;
    });
    return Object.entries(cats)
      .map(([k, d]) => ({ subject: k.split(' ')[0], avg: +(d.total / d.count).toFixed(2) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [vendors]);

  const sharedTooltipStyle = {
    backgroundColor: 'rgba(2,8,23,0.95)',
    borderColor: '#334155',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '12px',
  };

  const tabs = [
    { key: 'forecast', label: '📊 Q1 Forecast' },
    { key: 'vendors',  label: '🏢 Vendor Data' },
    { key: 'chat',     label: '🤖 AI Analyst' },
  ] as const;

  return (
    <div className="space-y-0 pb-8">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden mb-8 border border-slate-700"
        style={{
          background: 'linear-gradient(135deg,#001040 0%,#000b28 55%,#001430 100%)',
          minHeight: '380px',
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,83,226,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(0,83,226,0.5) 1px,transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative z-10 flex h-full" style={{ minHeight: '380px' }}>
          {/* Left text */}
          <div className="flex-1 p-8 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-yellow-300 tracking-widest uppercase">Q1 2026</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-xs text-slate-400">EST Forecast Report v1.1</span>
            </div>
            <h2 className="text-3xl font-black text-white leading-tight mb-2">
              Security Technology<br />
              <span className="text-yellow-300">Forecast</span> Landscape
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
              12–24 month prioritized assessment of emerging security capabilities for
              Walmart's enterprise security function.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { v: '12',   l: 'Tech Categories' },
                { v: '8',    l: 'Pilot MVPs' },
                { v: '$7M+', l: 'Portfolio Budget' },
              ].map(s => (
                <div
                  key={s.l}
                  className="bg-white/5 rounded-xl p-3 border border-white/10 text-center"
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  <p className="text-xl font-black text-yellow-300">{s.v}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Phase legend */}
            <div className="flex flex-wrap gap-4">
              {PHASE_LABELS.map((pl, i) => (
                <div key={pl} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PHASE_COLORS[i] }} />
                  <span className="text-xs text-slate-400">{pl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Globe */}
          <div className="w-80 xl:w-96 shrink-0" style={{ minHeight: '380px' }}>
            <MarketGlobe />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-yellow-300 to-transparent" />
      </div>

      {/* ── KPI ROW ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {KPIS.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── TAB NAV ─────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 border-b border-slate-700/60 pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
              activeTab === t.key
                ? 'bg-slate-800 text-yellow-300 border border-b-slate-800 border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ FORECAST TAB ═══════════════════════════ */}
      {activeTab === 'forecast' && (
        <div className="space-y-10">

          {/* Executive Insights */}
          <section>
            <SectionHeading
              title="Executive Intelligence"
              subtitle="Key strategic themes from the Q1 2026 Security Technology Forecast"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {EXEC_INSIGHTS.map(i => <InsightCard key={i.title} {...i} />)}
            </div>
          </section>

          {/* Scatter + Horizontal Bar — side-by-side */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            <ChartCard
              title="Category Matrix — Deployability vs Sensitivity"
              subtitle="Bubble size = avg investment. Hover any bubble for details. Drag to zoom."
              height={320}
              glowColor="#0053e2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    type="number" dataKey="x" domain={[0.5, 3.5]} ticks={[1, 2, 3]}
                    tickFormatter={v => (['', 'Low', 'Med', 'High'] as const)[Math.round(v)] ?? ''}
                    stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 10 }}
                    label={{ value: 'Deployability →', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    type="number" dataKey="y" domain={[0.5, 4.5]} ticks={[1, 2, 3, 4]}
                    tickFormatter={v => (['', 'Low', 'Med', 'M-Hi', 'High'] as const)[Math.round(v)] ?? ''}
                    stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 10 }}
                    label={{ value: 'Sensitivity ↑', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                  />
                  <ZAxis type="number" dataKey="z" range={[40, 700]} />
                  <Tooltip
                    content={<ScatterTooltipContent />}
                    wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  />
                  {/* Single Scatter using custom dots so each point keeps its category color */}
                  <Scatter
                    data={scatterData}
                    shape={<ScatterDot />}
                    isAnimationActive
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Horizontal bar — no rotation needed, labels sit naturally left */}
            <ChartCard
              title="Avg Investment by Category"
              subtitle="Midpoint of pilot cost range · sorted ascending"
              height={320}
              glowColor="#FFC220"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={investmentData}
                  margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#334155"
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}M` : `$${v}k`}
                  />
                  <YAxis
                    type="category" dataKey="name" width={90}
                    stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={sharedTooltipStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    formatter={(v: number) => [
                      `$${v >= 1000 ? `${(v / 1000).toFixed(1)}M` : `${v}k`}`,
                      'Avg Investment',
                    ]}
                    wrapperStyle={{ zIndex: 50 }}
                  />
                  <Bar dataKey="avg" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {investmentData.map((d, i) => (
                      <Cell key={i} fill={d.color} opacity={0.85} />
                    ))}
                    <LabelList
                      dataKey="avg"
                      position="right"
                      style={{ fill: '#94a3b8', fontSize: 9 }}
                      formatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}M` : `$${v}k`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          {/* Pilot Portfolio */}
          <section>
            <SectionHeading
              title="Pilot Portfolio — 8 MVPs"
              subtitle="8–12 weeks each · $50k – $2.0M per pilot (medium confidence) · hover any card for 3D depth"
            />
            <PilotCards />
          </section>

          {/* Leadership Timeline */}
          <section>
            <SectionHeading
              title="Leadership Action Timeline"
              subtitle="Prioritized decisions for GSAI leadership — 30 / 60–90 days / 12 months"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TIMELINE_ACTIONS.map(t => (
                <GlassCard3D
                  key={t.horizon}
                  glowColor={t.color}
                  intensity={5}
                  className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5 relative overflow-hidden"
                  style={{ backdropFilter: 'blur(12px)' }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: t.color }} />
                  <h4 className="font-bold mb-4 pt-1 text-sm" style={{ color: t.color }}>{t.horizon}</h4>
                  <ul className="space-y-3">
                    {t.actions.map((a, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                        <span className="shrink-0 mt-0.5" style={{ color: t.color }}>▸</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard3D>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="text-center py-4 border-t border-slate-800">
            <p className="text-[10px] text-slate-600">
              Source: WMT_ES_Q1 Security Technology Forecast_v1.1 · Jason Wilbur, Sr. Security Manager – EST ·
              Richard Ivy, Group Director · 15 Feb 2026 · Internal Use Only
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════ VENDOR TAB ═════════════════════════════ */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <SectionHeading
            title="Vendor Registry Analytics"
            subtitle={`${vendors.length.toLocaleString()} assessed vendors across all categories`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <ChartCard title="Risk Distribution" height={260} glowColor="#f87171">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskCounts} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={sharedTooltipStyle} wrapperStyle={{ zIndex: 50 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {riskCounts.map((r, i) => <Cell key={i} fill={RISK_COLORS[r.name] ?? '#64748b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Avg Rating by Category (top 6)" height={260} glowColor="#FFC220">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} stroke="transparent" />
                  <Radar name="Avg Rating" dataKey="avg" stroke="#FFC220" fill="#0053E2" fillOpacity={0.35} />
                  <Tooltip contentStyle={sharedTooltipStyle} wrapperStyle={{ zIndex: 50 }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ═══════════════ CHAT TAB ════════════════════════════════ */}
      {activeTab === 'chat' && (
        <div>
          <SectionHeading
            title="AI Market Analyst"
            subtitle="Ask SENTRY-AI to compare vendors, analyse forecast trends, or explain security domains."
          />
          <ChatAssistant />
        </div>
      )}
    </div>
  );
};