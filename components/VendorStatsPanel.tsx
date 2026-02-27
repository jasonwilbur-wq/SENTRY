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
import { VendorOrb3D } from './VendorOrb3D';

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
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
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
      className="flex flex-col gap-1 p-4 rounded-xl border border-slate-700/60 bg-slate-900/60
                 backdrop-blur-sm relative overflow-hidden"
      style={{ boxShadow: `inset 0 0 40px ${color}09` }}
    >
      {/* Glow orb */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
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

// ── Main Panel ───────────────────────────────────────────────────────────────
interface VendorStatsPanelProps {
  stats: DirectoryStats;
}

export const VendorStatsPanel: React.FC<VendorStatsPanelProps> = ({ stats }) => {
  const riskData = Object.entries(stats.risk_distribution)
    .filter(([k]) => k && k !== 'Unknown')
    .map(([name, value]) => ({ name, value }));

  return (
    <section
      className="rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-md
                 overflow-hidden mb-6"
      aria-label="Vendor directory analytics"
    >
      {/* Section header */}
      <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <VendorOrb3D />
          <div>
            <h2 className="text-base font-bold text-white">Directory Intelligence</h2>
            <p className="text-xs text-slate-500">Live stats from the SENTRY vendor database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Live</span>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-label="Live" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <KpiTile
          label="Total Vendors"     value={stats.total_vendors}
          sub="across all categories"
          color="#0053e2"
        />
        <KpiTile
          label="VAR Reports"       value={stats.total_vars}
          sub={`${stats.vendors_with_var} vendors covered`}
          color="#22c55e"
        />
        <KpiTile
          label="VAR Coverage"      value={Math.round(stats.var_coverage_pct)}
          sub="of vendors assessed"
          color="#FFC220"
          suffix="%"
        />
        <KpiTile
          label="Avg Security Score" value={Math.round(stats.avg_rating * 10) / 10}
          sub="overall portfolio"
          color="#a78bfa"
          prefix=""
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 px-4 pb-4">
        <div className="py-4 sm:py-0 sm:pr-4">
          <RiskDonut data={riskData} />
        </div>
        <div className="py-4 sm:py-0 sm:px-4">
          <CategoryBars cats={stats.top_categories} />
        </div>
        <div className="py-4 sm:py-0 sm:pl-4">
          <DecisionBands bands={stats.decision_bands} total={stats.total_vars} />
        </div>
      </div>
    </section>
  );
};