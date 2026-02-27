/**
 * CompetitorAnalysis — Q1 2026 Security Technology Forecast Market Analysis.
 *
 * Data source: WMT_ES_Q1 Security Technology Forecast_v1.1.docx (Jason Wilbur, Feb 2026)
 * 3D globe: MarketGlobe (Three.js)
 * Charts: Recharts scatter + bar
 */
import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import { MarketGlobe } from './MarketGlobe';
import { ChatAssistant } from './ChatAssistant';
import {
  TECH_CATEGORIES, PILOTS, EXEC_INSIGHTS, KPIS, TIMELINE_ACTIONS,
} from '../data/forecastData';
import { useVendors } from '../context/VendorContext';

// ── Sub-components ───────────────────────────────────────────────────────────────────────

const DEPLOY_NUM: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
const SENSE_NUM:  Record<string, number> = { Low: 1, Medium: 2, 'Medium-High': 3, High: 4 };

const PHASE_LABELS = ['0–6 months', '6–12 months', '6–24 months'];
const PHASE_COLORS = ['#0053e2', '#FFC220', '#22c55e'];

const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e', Medium: '#FFC220', High: '#f87171', Critical: '#ef4444',
};

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-black text-white tracking-wide">{title}</h3>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div
      className="bg-sentry-card border border-slate-700 rounded-xl p-4 flex flex-col
                 hover:border-slate-500 transition-colors"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{unit}</p>
    </div>
  );
}

function InsightCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 hover:border-wmt-blue/50
                    transition-colors backdrop-blur-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="text-white font-bold text-sm mb-2">{title}</h4>
      <p className="text-slate-400 text-xs leading-relaxed">{text}</p>
    </div>
  );
}

function CostBar({ min, max, color, label }: { min: number; max: number; color: string; label: string }) {
  const maxBar = 2000;
  const leftPct  = (min / maxBar) * 100;
  const widthPct = ((max - min) / maxBar) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0">
        <p className="text-xs text-slate-300 font-medium truncate" title={label}>{label}</p>
      </div>
      <div className="flex-1 h-5 bg-slate-800 rounded relative overflow-hidden">
        <div
          className="absolute top-0 h-full rounded opacity-40"
          style={{ left: 0, width: `${(min / maxBar) * 100}%`, backgroundColor: color }}
        />
        <div
          className="absolute top-0 h-full rounded"
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color, opacity: 0.85 }}
        />
      </div>
      <div className="w-28 shrink-0 text-right">
        <span className="text-xs font-mono text-slate-300">
          ${min}k – ${max >= 1000 ? `${(max / 1000).toFixed(1)}M` : `${max}k`}
        </span>
      </div>
    </div>
  );
}

function ScatterTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs shadow-xl max-w-xs">
      <p className="text-white font-bold mb-1">{d.name}</p>
      <p className="text-slate-400">Deployability: <span className="text-white">{d.deployLabel}</span></p>
      <p className="text-slate-400">Sensitivity: <span className="text-white">{d.sensitivityLabel}</span></p>
      <p className="text-slate-400">Time-to-value: <span className="text-wmt-yellow">{d.timeToValue}</span></p>
      <p className="text-slate-400">
        Investment: <span className="text-green-400">
          ${d.minCostK}k – ${d.maxCostK >= 1000 ? (d.maxCostK / 1000).toFixed(1) + 'M' : d.maxCostK + 'k'}
        </span>
      </p>
      <p className="text-orange-400 text-[10px] mt-1 leading-tight">Risk: {d.primaryRisk}</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────────────

export const CompetitorAnalysis: React.FC = () => {
  const { vendors } = useVendors();
  const [activeTab, setActiveTab] = useState<'forecast' | 'vendors' | 'chat'>('forecast');

  const scatterData = useMemo(() =>
    TECH_CATEGORIES.map(tc => ({
      x: DEPLOY_NUM[tc.deployability] + (Math.random() * 0.14 - 0.07),
      y: SENSE_NUM[tc.sensitivity]   + (Math.random() * 0.14 - 0.07),
      z: (tc.minCostK + tc.maxCostK) / 2,
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

  const tabs = [
    { key: 'forecast', label: '📊 Q1 Forecast' },
    { key: 'vendors',  label: '🏢 Vendor Data' },
    { key: 'chat',     label: '🤖 AI Analyst' },
  ] as const;

  return (
    <div className="space-y-0">

      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden mb-8 border border-slate-700"
        style={{ background: 'linear-gradient(135deg, #001E60 0%, #000b2e 55%, #001430 100%)', minHeight: '380px' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,83,226,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,83,226,0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 flex h-full" style={{ minHeight: '380px' }}>
          <div className="flex-1 p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-wmt-yellow tracking-widest uppercase">Q1 2026</span>
              <span className="w-1 h-1 rounded-full bg-slate-500" />
              <span className="text-xs text-slate-400">EST Forecast Report v1.1</span>
            </div>
            <h2 className="text-3xl font-black text-white leading-tight mb-2">
              Security Technology<br />
              <span style={{ color: '#FFC220' }}>Forecast</span> Landscape
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mb-6">
              12–24 month prioritized assessment of emerging security capabilities
              for Walmart’s enterprise security function. Prepared for GSAI Leadership.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { v: '12', l: 'Tech Categories' },
                { v: '8',  l: 'Pilot MVPs' },
                { v: '$7M+', l: 'Total Portfolio' },
              ].map(s => (
                <div key={s.l} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-xl font-black text-wmt-yellow">{s.v}</p>
                  <p className="text-xs text-slate-400">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              {PHASE_LABELS.map((pl, i) => (
                <div key={pl} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PHASE_COLORS[i] }} />
                  <span className="text-xs text-slate-400">{pl}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-96 shrink-0" style={{ minHeight: '380px' }}>
            <MarketGlobe />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-wmt-blue via-wmt-yellow to-transparent" />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-8">
        {KPIS.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-2 mb-6 border-b border-slate-700 pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              activeTab === t.key
                ? 'bg-sentry-card text-sentry-accent border border-b-transparent border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* FORECAST TAB */}
      {activeTab === 'forecast' && (
        <div className="space-y-10">

          <section>
            <SectionHeading title="Executive Intelligence" subtitle="Key strategic themes from the Q1 2026 Security Technology Forecast" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {EXEC_INSIGHTS.map(i => <InsightCard key={i.title} {...i} />)}
            </div>
          </section>

          <section>
            <SectionHeading title="Technology Category Matrix" subtitle="Deployability vs. Sensitivity — bubble size = midpoint investment. Hover for details." />
            <div className="bg-sentry-card border border-slate-700 rounded-xl p-6">
              <div className="flex justify-between text-xs text-slate-500 mb-2 px-8">
                <span>← Low Deployability</span>
                <span>High Deployability →</span>
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      type="number" dataKey="x" domain={[0.5, 3.5]} ticks={[1, 2, 3]}
                      tickFormatter={v => ['', 'Low', 'Medium', 'High'][Math.round(v)] ?? ''}
                      stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      type="number" dataKey="y" domain={[0.5, 4.5]} ticks={[1, 2, 3, 4]}
                      tickFormatter={v => ['', 'Low', 'Med', 'Med-Hi', 'High'][Math.round(v)] ?? ''}
                      stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }}
                      label={{ value: 'Sensitivity →', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 800]} />
                    <Tooltip content={<ScatterTooltipContent />} />
                    {[0, 1, 2].map(phase => (
                      <Scatter
                        key={phase}
                        name={PHASE_LABELS[phase]}
                        data={scatterData.filter(d => d.phase === phase)}
                        fill={PHASE_COLORS[phase]}
                        opacity={0.82}
                      />
                    ))}
                    <Legend />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-slate-500 mt-1">
                Upper-left = highest governance burden. Lower-right = fastest ROI.
              </p>
            </div>
          </section>

          <section>
            <SectionHeading title="Pilot Portfolio Investment Ranges" subtitle="8 MVPs · 8–12 weeks each · $50k – $2.0M per pilot (medium confidence)" />
            <div className="bg-sentry-card border border-slate-700 rounded-xl p-6 space-y-4">
              {PILOTS.map(p => (
                <div key={p.shortName}>
                  <CostBar min={p.minCostK} max={p.maxCostK} color={p.color} label={p.shortName} />
                  <p className="text-[10px] text-slate-500 mt-0.5 ml-36 truncate">{p.objective}</p>
                </div>
              ))}
              <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                <span>$0</span><span>$500k</span><span>$1M</span><span>$1.5M</span><span>$2M+</span>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading title="Leadership Action Timeline" subtitle="Next 30 / 60–90 / 12 months — prioritized decisions for GSAI leadership" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TIMELINE_ACTIONS.map(t => (
                <div key={t.horizon} className="bg-sentry-card border border-slate-700 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: t.color }} />
                  <h4 className="font-bold mb-4 pt-1" style={{ color: t.color }}>{t.horizon}</h4>
                  <ul className="space-y-3">
                    {t.actions.map((a, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                        <span className="shrink-0 mt-0.5" style={{ color: t.color }}>▸</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Avg Investment by Category" subtitle="Midpoint of pilot cost range across all 12 technology domains" />
            <div className="bg-sentry-card border border-slate-700 rounded-xl p-6">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={TECH_CATEGORIES.map(tc => ({ name: tc.shortName, investment: (tc.minCostK + tc.maxCostK) / 2, color: tc.color }))}
                    margin={{ top: 5, right: 20, bottom: 60, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={0} angle={-40} textAnchor="end" />
                    <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `$${v/1000}M` : `$${v}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                      formatter={(v: number) => [`$${v >= 1000 ? (v/1000).toFixed(1)+'M' : v+'k'}`, 'Avg Investment']}
                    />
                    <Bar dataKey="investment" radius={[4, 4, 0, 0]}>
                      {TECH_CATEGORIES.map((tc, i) => <Cell key={i} fill={tc.color} opacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <div className="text-center py-4 border-t border-slate-800">
            <p className="text-xs text-slate-600">
              Source: WMT_ES_Q1 Security Technology Forecast_v1.1 · Jason Wilbur, Sr. Security Manager – EST ·
              Prepared for Richard Ivy, Group Director · Feb 15, 2026 · Internal Use Only
            </p>
          </div>
        </div>
      )}

      {/* VENDOR TAB */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <SectionHeading title="Vendor Registry Analytics" subtitle={`${vendors.length.toLocaleString()} assessed vendors across all categories`} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-sentry-card border border-slate-700 rounded-xl p-5">
              <h4 className="text-white font-bold mb-4">Risk Distribution</h4>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8' }} />
                    <YAxis stroke="#475569" tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {riskCounts.map((r, i) => <Cell key={i} fill={RISK_COLORS[r.name] ?? '#64748b'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-sentry-card border border-slate-700 rounded-xl p-5">
              <h4 className="text-white font-bold mb-4">Avg Rating by Category (top 6)</h4>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} />
                    <Radar name="Avg Rating" dataKey="avg" stroke="#FFC220" fill="#0053E2" fillOpacity={0.35} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAT TAB */}
      {activeTab === 'chat' && (
        <div>
          <SectionHeading title="AI Market Analyst" subtitle="Ask SENTRY-AI to compare vendors, analyse forecast trends, or explain security domains." />
          <ChatAssistant />
        </div>
      )}
    </div>
  );
};
