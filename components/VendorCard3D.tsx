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
const RISK: Record<string, { glow: string; label: string; badgeStyle: React.CSSProperties }> = {
  Low:      { glow: '#22c55e', label: 'LOW',      badgeStyle: { background: 'rgba(34,197,94,0.15)',   color: '#22c55e', borderColor: 'rgba(34,197,94,0.5)'   } },
  Medium:   { glow: '#eab308', label: 'MEDIUM',   badgeStyle: { background: 'rgba(234,179,8,0.15)',   color: '#eab308', borderColor: 'rgba(234,179,8,0.5)'   } },
  High:     { glow: '#f97316', label: 'HIGH',     badgeStyle: { background: 'rgba(249,115,22,0.15)',  color: '#f97316', borderColor: 'rgba(249,115,22,0.5)'  } },
  Critical: { glow: '#ef4444', label: 'CRITICAL', badgeStyle: { background: 'rgba(239,68,68,0.15)',   color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)'   } },
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
          stroke="var(--s-border-mid)"
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
        <span className="text-[9px] leading-none" style={{ color: 'var(--s-text-dim)' }}>/5.0</span>
      </div>
    </div>
  );
}

// ── Decision band label ───────────────────────────────────────────────────────
const BAND_STYLE: Record<string, React.CSSProperties> = {
  'Advance':         { background: 'rgba(34,197,94,0.15)',  color: '#22c55e', borderColor: 'rgba(34,197,94,0.5)'  },
  'Research Further':{ background: 'rgba(0,83,226,0.15)',   color: '#60a5fa', borderColor: 'rgba(0,83,226,0.5)'   },
  'Defer':           { background: 'rgba(234,179,8,0.15)',  color: '#eab308', borderColor: 'rgba(234,179,8,0.5)'  },
  'Reject':          { background: 'rgba(239,68,68,0.15)',  color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)'  },
};

// ── Main card ─────────────────────────────────────────────────────────────────
export interface VendorCard3DProps {
  vendor: Vendor;
  onClick: (v: Vendor) => void;
  decisionBand?: string;  // optional — set if VAR score is known
}

export const VendorCard3D: React.FC<VendorCard3DProps> = ({ vendor, onClick, decisionBand }) => {
  const risk   = RISK[vendor.risk_level] ?? RISK.Medium;
  const color  = catColor(vendor.category);
  const hasReport = vendor.report_url && !vendor.report_url.includes('google.com/search') && vendor.report_url !== '#';
  const bandStyle = decisionBand ? BAND_STYLE[decisionBand] : null;

  return (
    <GlassCard3D
      glowColor={risk.glow}
      intensity={7}
      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer backdrop-blur-md"
      style={{
        background: 'var(--s-card)',
        border: '1px solid var(--s-border)',
        borderTopColor: risk.glow,
        borderTopWidth: '2px',
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* Click overlay — whole card is clickable */}
      <div
        className="absolute inset-0 z-10"
        role="button"
        tabIndex={0}
        aria-label={`Open details for ${vendor.company_name}`}
        onClick={() => onClick(vendor)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(vendor); }}
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
              className="font-bold text-sm leading-snug line-clamp-2
                         group-hover:text-wmt-yellow transition-colors duration-200"
              style={{ color: 'var(--s-text)' }}
              title={vendor.company_name}
            >
              {vendor.company_name}
            </h3>
            <p className="text-[10px] line-clamp-1 mt-0.5" style={{ color: 'var(--s-text-dim)' }}>
              {vendor.category}
            </p>
          </div>
        </div>

        {/* Score ring */}
        <div className="relative z-20" onClick={e => e.stopPropagation()}>
          <ScoreRing rating={vendor.overall_rating} color={color} />
        </div>
      </div>

      {/* ── Badges row ───────────────────────────────────────────── */}
      <div className="px-4 flex flex-wrap gap-1.5 mb-3">
        {/* Risk badge */}
        <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border" style={risk.badgeStyle}>
          {risk.label}
        </span>
        {/* VAR badge */}
        {vendor.has_var && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.5)' }}>
            ✓ VAR
          </span>
        )}
        {/* Decision band */}
        {decisionBand && bandStyle && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={bandStyle}>
            {decisionBand}
          </span>
        )}
        {/* Multi-product badge */}
        {(vendor.all_products?.length ?? 0) > 1 && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
            style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', borderColor: 'rgba(6,182,212,0.5)' }}>
            {vendor.all_products.length} products
          </span>
        )}
      </div>

      {/* ── Top product ──────────────────────────────────────────── */}
      <div className="px-4 mb-3">
        <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--s-text-dim)' }}>Top Product</p>
        <p className="text-xs line-clamp-2" style={{ color: 'var(--s-text-muted)' }}>{vendor.technology_product}</p>
      </div>

      {/* ── Score progress bar ───────────────────────────────────── */}
      <div className="px-4 mb-3">
        <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'var(--s-border-mid)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${(vendor.overall_rating / 5) * 100}%`,
              background: `linear-gradient(90deg, ${color}66, ${color})`,
              boxShadow: `0 0 6px ${color}44`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px]" style={{ color: 'var(--s-text-dim)' }}>0</span>
          <span className="text-[9px]" style={{ color: 'var(--s-text-dim)' }}>assessed {vendor.last_assessed}</span>
          <span className="text-[9px]" style={{ color: 'var(--s-text-dim)' }}>5.0</span>
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
};