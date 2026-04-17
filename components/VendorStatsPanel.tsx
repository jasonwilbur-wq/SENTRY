/**
 * VendorStatsPanel — live analytics dashboard for the Vendor Directory.
 *
 * Sections:
 *  1. KPI tiles (animated count-up): total vendors, VARs, coverage %, avg score
 *  2. Risk distribution (Recharts PieChart with Walmart colors)
 *  3. Top categories (horizontal bar chart)
 *  4. VAR decision band breakdown (radial progress bars)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { DirectoryStats } from '../services/api';
import { RadarScope3D } from './RadarScope3D';

// ── Animated count-up hook ─────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200): number {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!target) return;
    const start     = performance.now();
    const step = (now: number) => {
      const pct = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 4); // easeOutQuart
      setVal(Math.round(ease * target));
      if (pct < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return val;
}

// ── Palette constants ───────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e', Medium: '#eab308', High: '#f97316', Critical: '#ef4444',
};

const BAND_COLORS: Record<string, string> = {
  Advance: '#22c55e', 'Research Further': '#0053e2', Defer: '#f97316', Reject: '#ef4444',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--s-card)',
  border: '1px solid var(--s-border-mid)',
  borderRadius: 8,
  color: 'var(--s-text)',
  fontSize: 12,
};

// ── KPI Tile ────────────────────────────────────────────────────────────────
function KpiTile({
  label, value, sub, color, prefix = '', suffix = '',
}: {
  label: string; value: number; sub?: string;
  color: string; prefix?: string; suffix?: string;
}) {
  const count = useCountUp(value);
  return (
    <div
      className="flex flex-col gap-1 p-4 rounded-xl relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}12 0%, var(--s-card) 100%)`,
        border: `1px solid ${color}20`,
        boxShadow: `inset 0 1px 0 ${color}18`,
      }}
    >
      {/* Ambient glow orb */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
        style={{ backgroundColor: color, opacity: 0.18 }}
        aria-hidden
      />
      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--s-text-faint)' }}>{label}</p>
      <p
        className="text-2xl font-black"
        style={{ color, textShadow: `0 0 20px ${color}55` }}
      >
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: '#334155' }}>{sub}</p>}
    </div>
  );
}

// ── Risk Donut ──────────────────────────────────────────────────────────────
function RiskDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">
        Risk Distribution
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={46} outerRadius={68}
            paddingAngle={3}
            dataKey="value"
            startAngle={90} endAngle={-270}
          >
            {data.map(entry => (
              <Cell
                key={entry.name}
                fill={RISK_COLORS[entry.name] ?? '#64748b'}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number, n: string) => [`${v} (${Math.round(v/total*100)}%)`, n]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[d.name] ?? '#64748b' }} />
            <span className="text-[10px] text-slate-400">{d.name} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Category Bar ─────────────────────────────────────────────────────────────
const SHORT_NAMES: Record<string, string> = {
  'Video Management & Recording (VMS/NVR)':           'VMS/NVR',
  'Cyber-Physical & OT/Infrastructure Security':      'OT/ICS',
  'Counter-UAS (C-UAS)':                              'C-UAS',
  'Autonomous Systems: Robotics (AMR/Patrol)':        'Robotics',
  'Identity & Access Control (PAC/PIAM)':             'IAC/PAM',
  'Command & Control / PSIM / Situational Awareness': 'C2/PSIM',
  'Video Analytics & Computer Vision':                'Video AI',
  'Perimeter Protection & Intrusion Detection (PIDS)':'PIDS',
  'Sensor Fusion & Edge Compute':                     'Sensor/Edge',
  'Biometrics & Authentication':                      'Biometrics',
  'Supply Chain & Asset Protection Tech':             'Supply Chain',
  'Video Analytics/AI':                               'V-Analytics',
};

function CategoryBars({ cats }: { cats: { category: string; count: number; avg_rating: number }[] }) {
  const data = cats.slice(0, 8).map(c => ({
    name: SHORT_NAMES[c.category] ?? c.category.slice(0, 12),
    count: c.count,
  }));
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">
        Top Categories
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(v: number) => [v, 'Vendors']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={14}>
            {data.map((_, i) => (
              <Cell key={i} fill={`hsl(${210 + i * 18}, 80%, ${55 - i * 2}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Decision Bands ───────────────────────────────────────────────────────────
function DecisionBands({ bands, total }: { bands: Record<string, number>; total: number }) {
  const entries = Object.entries(bands).filter(([k]) => k).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">
        VAR Decision Bands
      </p>
      <div className="space-y-3">
        {entries.map(([band, count]) => {
          const pct  = total > 0 ? (count / total) * 100 : 0;
          const col  = BAND_COLORS[band] ?? '#64748b';
          return (
            <div key={band}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-300">{band}</span>
                <span className="text-xs font-bold" style={{ color: col }}>{count}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: col, boxShadow: `0 0 8px ${col}66` }}
                />
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-xs text-slate-600">No scored VARs yet. Run score extraction in Admin.</p>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800">
        <p className="text-[10px] text-slate-600">
          {total} total VAR reports in system
        </p>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────
interface VendorStatsPanelProps {
  stats: DirectoryStats;
}

export const VendorStatsPanel: React.FC<VendorStatsPanelProps> = ({ stats }) => {
  const riskData = Object.entries(stats.risk_distribution)
    .filter(([k]) => k && k !== 'Unknown')
    .map(([name, value]) => ({ name, value }));

  // Calculate category percentages
  const totalVendors = stats.total_vendors;
  const categoryPercentages = stats.top_categories.map(cat => ({
    ...cat,
    percentage: totalVendors > 0 ? Math.round((cat.count / totalVendors) * 100 * 10) / 10 : 0,
  }));

  return (
    <section
      className="rounded-2xl overflow-hidden mb-6 shadow-2xl"
      style={{
        background: 'var(--s-panel)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--s-border)',
      }}
      aria-label="Vendor directory analytics"
    >
      {/* Section header */}
      <div
        className="px-6 py-3 flex items-center justify-between gap-4"
        style={{ borderBottom: '1px solid var(--s-border)' }}
      >
        <div className="flex items-center gap-3">
          <div style={{ width: 72, height: 72, flexShrink: 0 }}>
            <RadarScope3D size={72} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Directory Intelligence</h2>
            <p className="text-[10px]" style={{ color: '#475569' }}>Live stats from the SENTRY vendor database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: '#334155' }}>Live</span>
          <div className="relative w-2 h-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping-ring" />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
        <KpiTile label="Total Vendors"      value={stats.total_vendors}  sub="across all categories" color="#0053e2" />
        <KpiTile label="VAR Reports"        value={stats.total_vars}     sub={`${stats.vendors_with_var} vendors covered`} color="#22c55e" />
        <KpiTile label="VAR Coverage"       value={Math.round(stats.var_coverage_pct)} sub="of vendors assessed" color="#FFC220" suffix="%" />
        <KpiTile label="Avg Security Score" value={Math.round(stats.avg_rating * 10) / 10} sub="overall portfolio" color="#a78bfa" />
      </div>

      {/* Charts row — gradient dividers + Category Percentages */}
      <div className="grid grid-cols-1 sm:grid-cols-4 p-4 pt-0">
        <div className="py-4 sm:pr-4" style={{ borderRight: '1px solid var(--s-border)' }}>
          <RiskDonut data={riskData} />
        </div>
        <div className="py-4 sm:px-4" style={{ borderRight: '1px solid var(--s-border)' }}>
          <CategoryBars cats={stats.top_categories} />
        </div>
        <div className="py-4 sm:px-4" style={{ borderRight: '1px solid var(--s-border)' }}>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">
              Category Distribution
            </p>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {categoryPercentages.slice(0, 8).map((cat, idx) => (
                <div key={cat.category} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: `hsl(${210 + idx * 18}, 80%, ${55 - idx * 2}%)` }}
                    />
                    <span className="text-[10px] text-slate-400 truncate">
                      {SHORT_NAMES[cat.category] ?? cat.category.slice(0, 12)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-wmt-blue shrink-0">
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="py-4 sm:pl-4">
          <DecisionBands bands={stats.decision_bands} total={stats.total_vars} />
        </div>
      </div>
    </section>
  );
};