/**
 * Shared UI primitives for the Vendor Detail panel.
 * Kept small so each tab file stays under 200 lines.
 */
import React from 'react';

// ── Score / decision-band helpers ──────────────────────────────────────────

export const BAND_STYLES: Record<string, string> = {
  Advance:            'bg-green-900/30 text-green-400 border border-green-700',
  'Research Further':  'bg-blue-900/30 text-blue-400 border border-blue-700',
  Defer:              'bg-yellow-900/30 text-yellow-400 border border-yellow-700',
  Reject:             'bg-red-900/30 text-red-400 border border-red-700',
  Pass:               'bg-green-900/30 text-green-400 border border-green-700',
};

export function bandStyle(band: string): string {
  return BAND_STYLES[band] ?? 'bg-slate-700 text-slate-300 border border-slate-600';
}

export function scoreColorHex(band: string): string {
  const map: Record<string, string> = {
    Advance:            '#2A8703',
    'Research Further':  '#0053E2',
    Defer:              '#F59E0B',
    Reject:             '#EA1100',
    Pass:               '#2A8703',
  };
  return map[band] ?? '#9E9E9E';
}

export function scoreColorCss(score: number | null): string {
  if (score === null) return '#9E9E9E';
  if (score >= 4) return '#2A8703';
  if (score >= 3) return '#0053E2';
  if (score >= 2) return '#F59E0B';
  return '#EA1100';
}

export const VAR_DIMENSIONS = [
  { key: 'compliance_score'      as const, label: 'Compliance',      weight: '25%' },
  { key: 'risk_score'            as const, label: 'Risk',            weight: '25%' },
  { key: 'maturity_score'        as const, label: 'Maturity',        weight: '15%' },
  { key: 'integration_score'     as const, label: 'Integration',     weight: '10%' },
  { key: 'roi_score'             as const, label: 'ROI',             weight: '10%' },
  { key: 'viability_score'       as const, label: 'Viability',       weight: '5%'  },
  { key: 'differentiation_score' as const, label: 'Differentiation', weight: '5%'  },
  { key: 'cloud_dep_score'       as const, label: 'Cloud Dep',       weight: '5%'  },
];

// ── Reusable primitives ────────────────────────────────────────────────────

export type Tab = 'overview' | 'history' | 'tech' | 'var';

export function TabButton({
  id, label, active, count, onClick,
}: {
  id: Tab; label: string; active: boolean; count?: number;
  onClick: (t: Tab) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
        active
          ? 'bg-wmt-blue text-white shadow-[0_0_12px_rgba(0,83,226,0.4)]'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
        }`}>{count}</span>
      )}
    </button>
  );
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</dt>
      <dd className="text-sm text-slate-200">{value || '\u2014'}</dd>
    </div>
  );
}

export function RatingBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct   = Math.min((score / max) * 100, 100);
  const color = scoreColorCss(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}
