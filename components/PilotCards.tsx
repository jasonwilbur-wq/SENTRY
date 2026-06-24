/**
 * PilotCards — 3D glass grid of the Q2 MVP pilot portfolio.
 * Each card tilts on mouse movement (via GlassCard3D) and shows
 * an animated cost-range bar on mount.
 */
import React, { useEffect, useRef } from 'react';
import { GlassCard3D } from './GlassCard3D';
import { PILOTS } from '../data/forecastData';

const MAX_COST = 2000; // $2M ceiling for bar scaling

const TIER_LABEL: Record<number, { label: string; cls: string }> = {
  0: { label: '0–6 mo',   cls: 'bg-blue-900/60 text-blue-300 border border-blue-700' },
  1: { label: '6–12 mo',  cls: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700' },
  2: { label: '6–24 mo',  cls: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' },
};

/** Animated cost bar — transitions width from 0 → target on mount */
function CostBarAnimated({
  min, max, color,
}: { min: number; max: number; color: string }) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    // Slight delay so CSS transition is visible
    const t = setTimeout(() => {
      const pct = ((max / MAX_COST) * 100).toFixed(1);
      el.style.width = `${pct}%`;
    }, 120);
    return () => clearTimeout(t);
  }, [max]);

  const minPct = ((min / MAX_COST) * 100).toFixed(1);

  return (
    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative mt-2 mb-3">
      {/* baseline glow for min */}
      <div
        className="absolute top-0 left-0 h-full rounded-full opacity-30"
        style={{ width: `${minPct}%`, background: color }}
      />
      {/* animated fill for max */}
      <div
        ref={fillRef}
        className="absolute top-0 left-0 h-full rounded-full"
        style={{
          width: '0%',
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          transition: 'width 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `0 0 8px ${color}88`,
        }}
      />
    </div>
  );
}

export const PilotCards: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    {PILOTS.map((pilot, idx) => {
      const phase = pilot.phase ?? (idx < 4 ? 0 : idx < 7 ? 1 : 2);
      const tier  = TIER_LABEL[phase];
      const costStr =
        `$${pilot.minCostK}k – ${
          pilot.maxCostK >= 1000
            ? `${(pilot.maxCostK / 1000).toFixed(1)}M`
            : `${pilot.maxCostK}k`
        }`;

      return (
        <GlassCard3D
          key={pilot.shortName}
          glowColor={pilot.color}
          intensity={7}
          className={
            'bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 flex flex-col'
          }
          style={{
            borderTopColor: pilot.color,
            borderTopWidth: '2px',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tier.cls}`}
            >
              {tier.label}
            </span>
            <span
              className="text-xs font-mono font-semibold shrink-0"
              style={{ color: pilot.color }}
            >
              {costStr}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-white font-bold text-sm leading-snug mb-1 line-clamp-2">
            {pilot.shortName}
          </h4>

          {/* Objective */}
          <p className="text-slate-400 text-xs leading-relaxed mb-auto line-clamp-3">
            {pilot.objective}
          </p>

          {/* Cost bar */}
          <CostBarAnimated min={pilot.minCostK} max={pilot.maxCostK} color={pilot.color} />

          {(pilot.posture || pilot.costConfidence) && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-700/60 pt-3 mt-1 mb-2">
              {pilot.posture && (
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Posture: <span className="font-bold text-slate-200">{pilot.posture}</span>
                </span>
              )}
              {pilot.costConfidence && (
                <span className="text-[9px] text-slate-500 text-right">{pilot.costConfidence}</span>
              )}
            </div>
          )}

          {/* KPIs */}
          <ul className="space-y-1 border-t border-slate-700/60 pt-3 mt-1">
            {pilot.kpis.map(kpi => (
              <li key={kpi} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                <span className="mt-0.5 shrink-0" style={{ color: pilot.color }}>▸</span>
                <span>{kpi}</span>
              </li>
            ))}
          </ul>
        </GlassCard3D>
      );
    })}
  </div>
);