/**
 * VendorCard3D — immersive 3D vendor card with:
 *  • SVG animated score ring (stroke-dashoffset on mount)
 *  • Risk-level glowing accent border
 *  • VAR badge + download link
 *  • GlassCard3D perspective tilt on hover
 *  • Category color dot + multi-product badge
 */
import React, { useEffect, useRef } from 'react';
import { GlassCard3D } from './GlassCard3D';
import { Vendor, getDownloadUrl } from '../services/api';

// ── Risk palette ─────────────────────────────────────────────────────────────
const RISK: Record<string, { glow: string; label: string; text: string; bg: string }> = {
  Low:      { glow: '#22c55e', label: 'LOW',      text: 'text-green-400',  bg: 'bg-green-900/30 border-green-700' },
  Medium:   { glow: '#eab308', label: 'MEDIUM',   text: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700' },
  High:     { glow: '#f97316', label: 'HIGH',     text: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-700' },
  Critical: { glow: '#ef4444', label: 'CRITICAL', text: 'text-red-400',    bg: 'bg-red-900/30 border-red-700' },
};

// ── Category color map (first 12 categories from the DB) ─────────────────────
const CAT_COLORS: Record<string, string> = {
  'Video Management & Recording (VMS/NVR)':          '#0053e2',
  'Cyber-Physical & OT/Infrastructure Security':     '#f97316',
  'Counter-UAS (C-UAS)':                             '#a78bfa',
  'Autonomous Systems: Robotics (AMR/Patrol)':       '#06b6d4',
  'Identity & Access Control (PAC/PIAM)':            '#22c55e',
  'Command & Control / PSIM / Situational Awareness':'#FFC220',
  'Video Analytics & Computer Vision':               '#f43f5e',
  'Perimeter Protection & Intrusion Detection (PIDS)':'#0891b2',
  'Sensor Fusion & Edge Compute':                    '#8b5cf6',
  'Biometrics & Authentication':                     '#10b981',
  'Supply Chain & Asset Protection Tech':            '#f59e0b',
  'Video Analytics/AI':                              '#e11d48',
};

function catColor(cat: string): string {
  return CAT_COLORS[cat] ?? '#64748b';
}

// ── SVG Score Ring ────────────────────────────────────────────────────────────
const RING_R  = 30;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 188.5

function ScoreRing({ rating, color }: { rating: number; color: string }) {
  const fillRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    const pct    = Math.min(Math.max(rating / 5, 0), 1);
    const offset = RING_CIRC * (1 - pct);
    // Animate from full offset (empty) → target
    el.style.strokeDashoffset = String(RING_CIRC);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)';
        el.style.strokeDashoffset = String(offset);
      });
    });
    return () => cancelAnimationFrame(t);
  }, [rating]);

  return (
    <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
      <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
        {/* Track */}
        <circle
          cx={36} cy={36} r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={5}
        />
        {/* Fill — starts at 12 o'clock */}
        <circle
          ref={fillRef}
          cx={36} cy={36} r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={RING_CIRC}
          transform="rotate(-90 36 36)"
          style={{ filter: `drop-shadow(0 0 5px ${color}99)` }}
        />
      </svg>
      {/* Centre text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black leading-none" style={{ color }}>
          {rating.toFixed(1)}
        </span>
        <span className="text-[9px] text-slate-500 leading-none">/5.0</span>
      </div>
    </div>
  );
}

const hasResolvedVarScore = (vendor: Vendor): boolean => (
  typeof (vendor.var_weight_score ?? vendor.var_scores?.Overall) === 'number'
);

const getVarBadgeMeta = (vendor: Vendor) => {
  if (!vendor.has_var) return null;
  if (hasResolvedVarScore(vendor)) {
    return {
      label: 'VAR Scored',
      className: 'bg-green-900/30 text-green-300 border-green-700',
    };
  }
  return {
    label: 'VAR Linked',
    className: 'bg-amber-900/30 text-amber-300 border-amber-700',
  };
};

// ── Decision band label ───────────────────────────────────────────────────────
const BAND_STYLE: Record<string, string> = {
  'Advance':         'bg-green-900/40 text-green-300 border-green-700',
  'Research Further':'bg-blue-900/40  text-blue-300  border-blue-700',
  'Defer':           'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  'Reject':          'bg-red-900/40   text-red-300   border-red-700',
};

// ── Main card ─────────────────────────────────────────────────────────────────
export interface VendorCard3DProps {
  vendor: Vendor;
  onClick: (v: Vendor) => void;
  decisionBand?: string;  // optional — set if VAR score is known
}

export const VendorCard3D: React.FC<VendorCard3DProps> = React.memo(({ vendor, onClick, decisionBand }) => {
  const risk   = RISK[vendor.risk_level] ?? RISK.Medium;
  const color  = catColor(vendor.category);
  const hasReport = vendor.report_url && !vendor.report_url.includes('google.com/search') && vendor.report_url !== '#';
  const resolvedDecisionBand = (decisionBand || vendor.var_decision_band || '').trim();
  const bandCls = resolvedDecisionBand ? BAND_STYLE[resolvedDecisionBand] : null;
  const displayScore = vendor.var_weight_score ?? vendor.overall_rating;
  const scoreSourceLabel = vendor.var_weight_score != null ? 'VAR score' : `assessed ${vendor.last_assessed}`;
  const varBadgeMeta = getVarBadgeMeta(vendor);

  return (
    <GlassCard3D
      data-testid="vendor-card"
      glowColor={risk.glow}
      intensity={7}
      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer
                 border border-white/5 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md"
      style={{
        backdropFilter: 'blur(14px)',
        borderTopColor: risk.glow,
        borderTopWidth: '2px',
      }}
    >
      {/* Click overlay — whole card is clickable */}
      <div
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        role="button"
        tabIndex={0}
        aria-label={`Open details for ${vendor.company_name}`}
        onClick={() => onClick(vendor)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(vendor);
          }
        }}
      />

      {/* ── Top glow stripe (inset shadow = no layout impact) ── */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${risk.glow}cc, transparent)` }}
        aria-hidden="true"
      />

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        {/* Brand initial badge + name */}
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Monogram badge */}
          <div
            className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-xs font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${color}33, ${color}18)`,
              border: `1px solid ${color}44`,
              boxShadow: `0 0 12px ${color}22`,
            }}
          >
            {vendor.company_name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3
              className="font-bold text-white text-sm leading-snug line-clamp-2
                         group-hover:text-wmt-yellow transition-colors duration-200"
              title={vendor.company_name}
            >
              {vendor.company_name}
            </h3>
            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
              {vendor.category}
            </p>
          </div>
        </div>

        {/* Score ring */}
        <div className="relative z-20" onClick={e => e.stopPropagation()}>
          <ScoreRing rating={displayScore} color={color} />
        </div>
      </div>

      {/* ── Badges row ───────────────────────────────────────────── */}
      <div className="px-4 flex flex-wrap gap-1.5 mb-3">
        {/* Risk badge */}
        <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border ${risk.bg} ${risk.text}`}>
          {risk.label}
        </span>
        {/* VAR badge */}
        {varBadgeMeta && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${varBadgeMeta.className}`}>
            {varBadgeMeta.label}
          </span>
        )}
        {/* Decision band */}
        {resolvedDecisionBand && bandCls && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${bandCls}`}>
            {resolvedDecisionBand}
          </span>
        )}
        {/* Multi-product badge */}
        {(vendor.all_products?.length ?? 0) > 1 && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border
                          bg-sky-900/30 text-sky-300 border-sky-700">
            {vendor.all_products.length} products
          </span>
        )}
      </div>

      {/* ── Top product ──────────────────────────────────────────── */}
      <div className="px-4 mb-3">
        <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#334155' }}>Top Product</p>
        <p className="text-xs text-slate-300 line-clamp-2">{vendor.technology_product}</p>
      </div>

      {/* ── Score progress bar ───────────────────────────────────── */}
      <div className="px-4 mb-3">
        <div className="h-[3px] w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${(displayScore / 5) * 100}%`,
              background: `linear-gradient(90deg, ${color}66, ${color})`,
              boxShadow: `0 0 6px ${color}44`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px]" style={{ color: '#1e293b' }}>0</span>
          <span className="text-[9px]" style={{ color: '#475569' }}>{scoreSourceLabel}</span>
          <span className="text-[9px]" style={{ color: '#1e293b' }}>5.0</span>
        </div>
      </div>

      {/* ── Action buttons — z-20 so they're clickable above the overlay ── */}
      <div className="px-3 pb-3 pt-1 flex gap-1.5 relative z-20">
        {vendor.has_var && vendor.latest_var_id && (
          <a
            href={getDownloadUrl(vendor.latest_var_id)}
            download
            onClick={e => e.stopPropagation()}
            className="btn-ghost"
            aria-label={`Download VAR for ${vendor.company_name}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            VAR
          </a>
        )}
        {hasReport && (
          <a
            href={vendor.report_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn-ghost"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Report
          </a>
        )}
        <button
          onClick={e => { e.stopPropagation(); onClick(vendor); }}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px]
                     font-semibold transition-all duration-150
                     hover:text-white"
          style={{
            background: `rgba(0,83,226,0.14)`,
            border: `1px solid rgba(0,83,226,0.3)`,
            color: '#4d9fff',
          }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Details
        </button>
      </div>
    </GlassCard3D>
  );
});