/**
 * HomeDashboard — the workspace landing for SENTRY.
 *
 * The goal is for someone arriving in the morning to immediately see:
 *   • where the portfolio stands today (live KPIs)
 *   • what they probably want to do next (quick actions)
 *   • what changed since they were last here (recent assessments)
 * …without resorting to sci-fi cliches. Copy is plain English; the brand
 * heartbeat is carried by the Walmart spark, the blue→yellow gradients,
 * and small tactile micro-interactions instead of generic glow effects.
 */
import React, { useMemo } from 'react';
import { ViewState } from '../types';
import { useVendors } from '../context/VendorContext';
import { RadarScope3D } from './RadarScope3D';
import { VendorAssessmentOperationsPanel } from './VendorAssessmentOperationsPanel';
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
function useCountUp(target: number, duration = 1200): number {
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

// ── Time-of-day greeting ──────────────────────────────────────────────────
function useGreeting() {
  const [now] = React.useState(() => new Date());
  const hour = now.getHours();
  const greeting =
    hour < 5  ? 'Working late' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' :
                'Working late';
  return { greeting, dateLabel: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) };
}

// ── KPI tile ──────────────────────────────────────────────────────────────
function KPI({
  label, value, delta, color, suffix = '',
}: { label: string; value: number; delta?: string; color: string; suffix?: string }) {
  const count = useCountUp(value);
  return (
    <div
      className="relative px-4 py-3 rounded-xl flex flex-col gap-1 overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid var(--s-border)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
        aria-hidden
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--s-text-faint)' }}>
        {label}
      </p>
      <p className="text-2xl font-black leading-none" style={{ color }}>
        {count.toLocaleString()}{suffix}
      </p>
      {delta && (
        <p className="text-[10px] font-medium" style={{ color: 'var(--s-text-dim)' }}>{delta}</p>
      )}
    </div>
  );
}

// ── Quick action card ─────────────────────────────────────────────────────
interface QuickActionProps {
  title: string;
  description: string;
  accent: string;
  shortcut?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAction({ title, description, accent, icon, shortcut, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl p-4 transition-all duration-200
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
          background: `radial-gradient(circle at 30% 0%, ${accent}26 0%, transparent 65%)`,
          boxShadow: `inset 0 0 0 1px ${accent}55, 0 12px 32px ${accent}1f`,
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
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>{title}</h4>
            {shortcut && (
              <kbd
                className="hidden md:inline px-1 py-0.5 rounded text-[8px] font-mono font-bold"
                style={{ background: 'var(--s-hover-over)', color: 'var(--s-text-dim)', border: '1px solid var(--s-border)' }}
              >
                {shortcut}
              </kbd>
            )}
          </div>
          <p className="text-[11px] leading-snug" style={{ color: 'var(--s-text-dim)' }}>
            {description}
          </p>
        </div>
        <svg
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1 group-hover:translate-x-0.5"
          style={{ color: accent }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
  const { stats, statsLoading, total, vendors, loading } = useVendors();
  const { greeting, dateLabel } = useGreeting();

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
          background:
            'linear-gradient(135deg, rgba(0,30,96,0.55) 0%, rgba(0,11,40,0.85) 50%, rgba(255,194,32,0.06) 100%)',
          border: '1px solid var(--s-border)',
          boxShadow: '0 8px 40px rgba(0,11,40,0.45)',
        }}
      >
        {/* Walmart spark glow — top-right */}
        <div
          className="absolute -top-24 -right-12 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(255,194,32,0.18)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(0,83,226,0.22)' }}
          aria-hidden
        />

        {/* Diagonal gradient strip — Walmart accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,194,32,0.6) 30%, rgba(0,83,226,0.6) 70%, transparent 100%)' }}
          aria-hidden
        />

        <div className="relative px-6 md:px-8 py-7 grid grid-cols-1 lg:grid-cols-[auto,1fr,auto] gap-6 items-center">
          {/* Radar */}
          <div className="shrink-0 hidden lg:block">
            <RadarScope3D size={120} />
          </div>

          {/* Greeting */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping-ring opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-green-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: '#FFC220' }}>
                {dateLabel}
              </span>
            </div>
            <h2 className="text-2xl md:text-[28px] font-black leading-tight" style={{ color: 'var(--s-text)' }}>
              {greeting}.
            </h2>
            <p className="text-sm mt-1.5 max-w-xl" style={{ color: 'var(--s-text-muted)' }}>
              {statsLoading
                ? 'Pulling the latest from the SENTRY backbone…'
                : `You're tracking ${totalVendors.toLocaleString()} vendors across ${(stats?.top_categories.length ?? 0)} technology categories. Pick up where you left off.`}
            </p>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 min-w-[280px]">
            <KPI label="Vendors"    value={totalVendors} color="#4d9fff" delta="active records" />
            <KPI label="VAR Reports" value={totalVars}   color="#22c55e" delta="completed" />
            <KPI label="Coverage"   value={coverage}     color="#FFC220" suffix="%" delta="of portfolio" />
            <KPI label="Avg Score"  value={avgScore}     color="#a78bfa" delta="out of 10" />
          </div>
        </div>
      </section>

      {/* ── Quick actions ────────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--s-text)' }}>Pick up where you left off</h3>
            <p className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Common workflows · one click away</p>
          </div>
          <button
            onClick={() => onNavigate(ViewState.DIRECTORY)}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest hover:gap-2 transition-all"
            style={{ color: '#4d9fff' }}
          >
            View everything →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 grid-stagger">
          <QuickAction
            title="Ask Sentinel"
            description="Conversational answers about vendors, risks, and gaps."
            accent="#a78bfa"
            shortcut="S"
            onClick={() => onNavigate(ViewState.SENTINEL)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
          />
          <QuickAction
            title="Find a vendor"
            description="Search the directory by name, technology, or risk level."
            accent="#0053e2"
            shortcut="V"
            onClick={() => onNavigate(ViewState.DIRECTORY)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" /></svg>}
          />
          <QuickAction
            title="Start an assessment"
            description="Kick off the GRC review workflow for new tech."
            accent="#22c55e"
            shortcut="A"
            onClick={() => onNavigate(ViewState.REQUEST_ASSESSMENT)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          />
          <QuickAction
            title="What competitors did"
            description="Latest analyst-enriched events across peer retailers."
            accent="#f97316"
            shortcut="C"
            onClick={() => onNavigate(ViewState.COMPETITOR_INTEL)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
          />
        </div>
      </section>

      <VendorAssessmentOperationsPanel onNavigate={onNavigate} />

      {/* ── Insight panels ───────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk donut */}
        <div
          className="rounded-2xl p-5 lg:col-span-1 relative overflow-hidden"
          style={{ background: 'var(--s-card)', border: '1px solid var(--s-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Risk distribution</h4>
              <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Live snapshot of vendor portfolio</p>
            </div>
            <button
              onClick={() => onNavigate(ViewState.DIRECTORY)}
              className="text-[10px] uppercase tracking-widest font-bold hover:opacity-80"
              style={{ color: '#4d9fff' }}
            >
              Open →
            </button>
          </div>
          {riskData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72}
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
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[d.name] ?? '#64748b' }} />
                    <span className="text-[10px] font-medium" style={{ color: 'var(--s-text-muted)' }}>{d.name} · {d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs" style={{ color: 'var(--s-text-faint)' }}>
              {loading ? 'Loading…' : 'No data yet'}
            </div>
          )}
        </div>

        {/* Top categories */}
        <div
          className="rounded-2xl p-5 lg:col-span-2 relative overflow-hidden"
          style={{ background: 'var(--s-card)', border: '1px solid var(--s-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Where the portfolio sits</h4>
              <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Vendor count by technology category</p>
            </div>
            <button
              onClick={() => onNavigate(ViewState.COMPETITOR_ANALYSIS)}
              className="text-[10px] uppercase tracking-widest font-bold hover:opacity-80"
              style={{ color: '#4d9fff' }}
            >
              Market analysis →
            </button>
          </div>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={92} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(0,83,226,0.06)' }}
                  formatter={(v: number, _n, p: any) => [v, p?.payload?.full ?? 'Vendors']}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 18}, 80%, ${60 - i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs" style={{ color: 'var(--s-text-faint)' }}>
              {loading ? 'Loading…' : 'No data yet'}
            </div>
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
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>What changed since you were here</h4>
              <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Most recent vendor assessments</p>
            </div>
            <button
              onClick={() => onNavigate(ViewState.ADMIN)}
              className="text-[10px] uppercase tracking-widest font-bold hover:opacity-80"
              style={{ color: '#4d9fff' }}
            >
              VAR admin →
            </button>
          </div>
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 rounded-lg bg-slate-800/40 animate-pulse" />
              ))}
            </div>
          )}
          {!loading && recent.length === 0 && (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--s-text-dim)' }}>
              No recent assessments yet. Kick one off from the directory.
            </p>
          )}
          {!loading && recent.length > 0 && (
            <ul className="divide-y" style={{ borderColor: 'var(--s-border)' }}>
              {recent.map(v => (
                <li key={v.id} className="flex items-center justify-between py-2.5 gap-3 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-1 h-9 rounded-full shrink-0"
                      style={{ backgroundColor: RISK_COLORS[v.risk_level] ?? '#64748b' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--s-text)' }}>{v.company_name}</p>
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
            background: 'linear-gradient(140deg, rgba(167,139,250,0.20) 0%, rgba(0,83,226,0.14) 60%, rgba(255,194,32,0.06) 100%)',
            border: '1px solid rgba(167,139,250,0.35)',
            boxShadow: '0 0 32px rgba(167,139,250,0.10) inset',
          }}
        >
          <div
            className="absolute -top-12 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none
                       opacity-70 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(167,139,250,0.45)' }}
            aria-hidden
          />
          <div className="relative">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #0053e2 100%)',
                boxShadow: '0 6px 20px rgba(167,139,250,0.40)',
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-base font-bold mb-1" style={{ color: 'var(--s-text)' }}>Talk to Sentinel</h4>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--s-text-muted)' }}>
              Ask plain-English questions and get answers grounded in SENTRY's vendor and intel data.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Top risks this week', 'AI vendors', 'Coverage gaps', 'Compare two vendors'].map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'var(--s-text-muted)',
                  }}
                >
                  "{tag}"
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--s-text)' }}>
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
