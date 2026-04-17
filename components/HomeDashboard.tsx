/**
 * HomeDashboard — the default landing view inside the app.
 *
 * Designed to feel like a Mission Control screen for the SENTRY platform:
 *   • Welcome hero with live radar scope + portfolio KPIs
 *   • Quick-launch workflow cards that navigate to key views
 *   • Snapshot charts: risk distribution + top categories
 *   • Activity ticker (recent assessments)
 *   • Call-to-action to Sentinel AI
 *
 * The goal is that a new user lands here and instantly understands the
 * scope of the platform and can jump into any workflow with one click.
 */
import React, { useMemo } from 'react';
import { ViewState } from '../types';
import { useVendors } from '../context/VendorContext';
import { RadarScope3D } from './RadarScope3D';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface HomeDashboardProps {
  onNavigate: (view: ViewState) => void;
}

// ── Palette ─────────────────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e', Medium: '#eab308', High: '#f97316', Critical: '#ef4444',
};

const SHORT_CAT: Record<string, string> = {
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
};

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--s-card)',
  border: '1px solid var(--s-border-mid)',
  borderRadius: 8,
  color: 'var(--s-text)',
  fontSize: 12,
};

// ── Animated count-up ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400): number {
  const [val, setVal] = React.useState(0);
  const rafRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const pct  = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 4);
      setVal(Math.round(ease * target));
      if (pct < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return val;
}

// ── Hero KPI ─────────────────────────────────────────────────────────────
function HeroStat({
  label, value, color, suffix = '',
}: { label: string; value: number; color: string; suffix?: string }) {
  const count = useCountUp(value);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--s-text-faint)' }}>
        {label}
      </p>
      <p className="text-3xl font-black leading-none" style={{ color, textShadow: `0 0 24px ${color}55` }}>
        {count.toLocaleString()}{suffix}
      </p>
    </div>
  );
}

// ── Quick action card ──────────────────────────────────────────────────────
interface QuickActionProps {
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAction({ title, description, accent, icon, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl p-5 transition-all duration-200
                 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-wmt-blue focus-visible:outline-none"
      style={{
        background: 'var(--s-card)',
        border: '1px solid var(--s-border)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${accent}22 0%, transparent 60%)`,
          boxShadow: `inset 0 0 0 1px ${accent}44, 0 0 24px ${accent}33`,
        }}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}33 0%, ${accent}11 100%)`,
            border: `1px solid ${accent}44`,
            color: accent,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
          <p className="text-[11px] leading-snug" style={{ color: 'var(--s-text-dim)' }}>
            {description}
          </p>
        </div>
        <svg
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
          style={{ color: accent }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
  const { stats, statsLoading, total, vendors, loading } = useVendors();

  // Derived risk data
  const riskData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.risk_distribution)
      .filter(([k]) => k && k !== 'Unknown')
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  // Derived category data
  const catData = useMemo(() => {
    if (!stats) return [];
    return stats.top_categories.slice(0, 6).map(c => ({
      name:  SHORT_CAT[c.category] ?? c.category.slice(0, 14),
      count: c.count,
      full:  c.category,
    }));
  }, [stats]);

  // Most recently-assessed vendors for the activity feed
  const recent = useMemo(() => {
    return [...(vendors ?? [])]
      .filter(v => v.last_assessed)
      .sort((a, b) => (b.last_assessed || '').localeCompare(a.last_assessed || ''))
      .slice(0, 5);
  }, [vendors]);

  const totalVendors = stats?.total_vendors ?? total ?? 0;
  const totalVars    = stats?.total_vars ?? 0;
  const coverage     = Math.round(stats?.var_coverage_pct ?? 0);
  const avgScore     = Math.round((stats?.avg_rating ?? 0) * 10) / 10;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,83,226,0.14) 0%, rgba(8,14,30,0.86) 55%, rgba(255,194,32,0.06) 100%)',
          border: '1px solid var(--s-border)',
          boxShadow: '0 8px 40px rgba(0,11,40,0.45)',
        }}
      >
        {/* Ambient light */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(0,83,226,0.22)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(255,194,32,0.10)' }}
          aria-hidden
        />

        <div className="relative px-6 md:px-8 py-7 flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Radar + greeting */}
          <div className="flex items-center gap-5 flex-1">
            <div className="shrink-0">
              <RadarScope3D size={120} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative w-1.5 h-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-ring" />
                </div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.25em]">
                  Monitoring Active
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                Welcome back to SENTRY
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--s-text-muted)' }}>
                {statsLoading
                  ? 'Calibrating sensors…'
                  : `Tracking ${totalVendors.toLocaleString()} vendors across ${(stats?.top_categories.length ?? 0)} technology categories.`}
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:items-center gap-6 md:gap-8 pt-2 md:pt-0">
            <HeroStat label="Vendors"   value={totalVendors} color="#0053e2" />
            <HeroStat label="VAR Reports" value={totalVars}  color="#22c55e" />
            <HeroStat label="Coverage"  value={coverage}     color="#FFC220" suffix="%" />
            <HeroStat label="Avg Score" value={avgScore}     color="#a78bfa" />
          </div>
        </div>
      </section>

      {/* ── Quick actions ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--s-text-dim)' }}>
            Quick Actions
          </h3>
          <div className="h-px flex-1 ml-4" style={{ background: 'var(--s-border)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="Ask Sentinel AI"
            description="Query the vendor intelligence assistant for instant insights."
            accent="#a78bfa"
            onClick={() => onNavigate(ViewState.SENTINEL)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>}
          />
          <QuickAction
            title="Browse Vendors"
            description="Search, filter, and open the full vendor directory."
            accent="#0053e2"
            onClick={() => onNavigate(ViewState.DIRECTORY)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>}
          />
          <QuickAction
            title="Request Assessment"
            description="Kick off a GRC workflow for a new technology review."
            accent="#22c55e"
            onClick={() => onNavigate(ViewState.REQUEST_ASSESSMENT)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>}
          />
          <QuickAction
            title="Competitor Intel"
            description="Live threat tracking across peer retailers."
            accent="#f97316"
            onClick={() => onNavigate(ViewState.COMPETITOR_INTEL)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>}
          />
        </div>
      </section>

      {/* ── Insight panels ───────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk donut */}
        <div
          className="rounded-2xl p-5 lg:col-span-1"
          style={{ background: 'var(--s-card)', border: '1px solid var(--s-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
              Risk Distribution
            </h4>
            <button
              onClick={() => onNavigate(ViewState.DIRECTORY)}
              className="text-[10px] uppercase tracking-widest font-bold text-wmt-blue hover:text-blue-300"
            >
              View →
            </button>
          </div>
          {riskData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%" cy="50%"
                    innerRadius={46} outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90} endAngle={-270}
                  >
                    {riskData.map(entry => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? '#64748b'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
                {riskData.map(d => (
                  <div key={d.name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[d.name] ?? '#64748b' }} />
                    <span className="text-[10px]" style={{ color: 'var(--s-text-muted)' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-slate-600">Loading…</div>
          )}
        </div>

        {/* Top categories */}
        <div
          className="rounded-2xl p-5 lg:col-span-2"
          style={{ background: 'var(--s-card)', border: '1px solid var(--s-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
              Top Technology Categories
            </h4>
            <button
              onClick={() => onNavigate(ViewState.COMPETITOR_ANALYSIS)}
              className="text-[10px] uppercase tracking-widest font-bold text-wmt-blue hover:text-blue-300"
            >
              Market Analysis →
            </button>
          </div>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(v: number, _n, p: any) => [v, p?.payload?.full ?? 'Vendors']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 22}, 78%, ${58 - i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-slate-600">Loading…</div>
          )}
        </div>
      </section>

      {/* ── Recent activity + Sentinel CTA ───────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-5 lg:col-span-2"
          style={{ background: 'var(--s-card)', border: '1px solid var(--s-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
              Recent Assessments
            </h4>
            <button
              onClick={() => onNavigate(ViewState.ADMIN)}
              className="text-[10px] uppercase tracking-widest font-bold text-wmt-blue hover:text-blue-300"
            >
              VAR Admin →
            </button>
          </div>
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-slate-800/40 animate-pulse" />
              ))}
            </div>
          )}
          {!loading && recent.length === 0 && (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--s-text-dim)' }}>
              No recent assessments to show.
            </p>
          )}
          {!loading && recent.length > 0 && (
            <ul className="divide-y" style={{ borderColor: 'var(--s-border)' }}>
              {recent.map(v => (
                <li key={v.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-1.5 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: RISK_COLORS[v.risk_level] ?? '#64748b' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{v.company_name}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--s-text-dim)' }}>
                        {SHORT_CAT[v.category] ?? v.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold" style={{ color: RISK_COLORS[v.risk_level] ?? '#94a3b8' }}>
                      {v.risk_level}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--s-text-faint)' }}>
                      {v.last_assessed || '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sentinel CTA */}
        <button
          onClick={() => onNavigate(ViewState.SENTINEL)}
          className="group relative rounded-2xl p-5 text-left overflow-hidden transition-all duration-200 hover:-translate-y-0.5
                     focus-visible:ring-2 focus-visible:ring-wmt-blue focus-visible:outline-none"
          style={{
            background: 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(0,83,226,0.12) 100%)',
            border: '1px solid rgba(167,139,250,0.35)',
            boxShadow: '0 0 32px rgba(167,139,250,0.10) inset',
          }}
        >
          <div
            className="absolute -top-12 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none
                       opacity-70 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(167,139,250,0.35)' }}
            aria-hidden
          />
          <div className="relative">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #0053e2 100%)',
                boxShadow: '0 4px 16px rgba(167,139,250,0.35)',
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-white mb-1">Meet Sentinel</h4>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--s-text-muted)' }}>
              Your AI analyst. Ask it anything about vendors, risks, categories, or maturity.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Top risks', 'AI vendors', 'Maturity', 'Gap analysis'].map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--s-text-muted)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white">
              Open Sentinel
              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </button>
      </section>
    </div>
  );
};

export default HomeDashboard;
