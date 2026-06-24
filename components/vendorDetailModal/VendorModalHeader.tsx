import React from 'react';
import { Vendor } from '../../services/api';

export function VendorModalHeader({
  vendor,
  headingId,
  riskColor,
  reportCount,
  lastReviewedLabel,
  hasResolvedVarScore,
  varStatusMeta,
  onClose,
}: {
  vendor: Vendor;
  headingId: string;
  riskColor: string;
  reportCount: number;
  lastReviewedLabel: string;
  hasResolvedVarScore: boolean;
  varStatusMeta: { label: string; helper: string; style: React.CSSProperties } | null;
  onClose: () => void;
}) {
  return (
    <div
      className="shrink-0 px-8 py-6 flex items-start justify-between relative overflow-hidden"
      style={{
        borderBottom: '1px solid var(--s-border-light)',
        background: `linear-gradient(135deg, ${riskColor}10 0%, rgba(0,83,226,0.06) 50%, transparent 100%)`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${riskColor}12, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      <div className="flex items-start gap-4 relative z-10">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, ${riskColor}33, ${riskColor}18)`,
            border: `1px solid ${riskColor}44`,
            boxShadow: `0 0 24px ${riskColor}33`,
          }}
        >
          {vendor.company_name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 id={headingId} className="text-2xl font-bold text-white">
            {vendor.company_name}
          </h2>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {vendor.category}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{ borderColor: riskColor, color: riskColor, backgroundColor: `${riskColor}14`, border: `1px solid ${riskColor}44` }}
            >
              {vendor.risk_level} Risk
            </span>
            {varStatusMeta && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={varStatusMeta.style} title={varStatusMeta.helper}>
                {varStatusMeta.label}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {reportCount} source {reportCount === 1 ? 'report' : 'reports'} • Last review {lastReviewedLabel} • Status {vendor.deployment_status || 'Prospect'}
          </p>
          {varStatusMeta && !hasResolvedVarScore && (
            <p className="mt-2 text-xs font-medium text-amber-300">Score extraction pending — {varStatusMeta.helper}</p>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        className="relative z-10 p-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        aria-label="Close"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = 'rgba(255,255,255,0.12)';
          event.currentTarget.style.color = '#f1f5f9';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          event.currentTarget.style.color = '#64748b';
        }}
      >
        ✕
      </button>
    </div>
  );
}
