import React, { useMemo, useState } from 'react';
import { Vendor } from '../services/api';
import { VendorComparison } from './VendorComparison';
import { ComparableVendor } from '../utils/compare';

interface VendorComparisonTrayProps {
  selectedVendors: Vendor[];
  maxVendors?: number;
  onRemove: (vendorId: string) => void;
  onClear: () => void;
}

function toComparableVendor(vendor: Vendor): ComparableVendor {
  return {
    id: vendor.id,
    company_name: vendor.company_name,
    var_scores: vendor.var_scores ? { ...vendor.var_scores } : undefined,
    var_weight_score: vendor.var_weight_score,
    overall_rating: vendor.overall_rating,
  };
}

export const VendorComparisonTray: React.FC<VendorComparisonTrayProps> = ({
  selectedVendors,
  maxVendors = 4,
  onRemove,
  onClear,
}) => {
  const [expanded, setExpanded] = useState(true);
  const canCompare = selectedVendors.length >= 2;
  const comparableVendors = useMemo(
    () => selectedVendors.map(toComparableVendor),
    [selectedVendors],
  );

  if (selectedVendors.length === 0) return null;

  return (
    <section
      className="rounded-2xl border p-4 space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(0,83,226,0.12), rgba(0,11,40,0.70))',
        borderColor: 'rgba(0,83,226,0.32)',
        boxShadow: '0 14px 34px rgba(0,11,40,0.22)',
      }}
      aria-label="Vendor comparison tray"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#FFC220' }}>
              Compare vendors
            </span>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ color: 'var(--s-text-dim)', borderColor: 'var(--s-border-mid)' }}>
              {selectedVendors.length} of {maxVendors} selected
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>
            Select 2–4 vendors to compare VAR dimensions, weighted composite score, and A–F grade side by side.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-px"
            style={{
              color: canCompare ? '#4d9fff' : 'var(--s-text-faint)',
              borderColor: canCompare ? 'rgba(77,159,255,0.45)' : 'var(--s-border)',
              background: 'var(--s-input-bg)',
            }}
            disabled={!canCompare}
          >
            {expanded ? 'Hide comparison' : 'Show comparison'}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-px"
            style={{ color: 'var(--s-text-dim)', borderColor: 'var(--s-border)', background: 'var(--s-input-bg)' }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedVendors.map(vendor => (
          <span
            key={vendor.id}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
          >
            {vendor.company_name}
            <button
              type="button"
              onClick={() => onRemove(vendor.id)}
              className="rounded-full px-1 text-[10px] font-black transition hover:bg-red-500/20 hover:text-red-300"
              style={{ color: 'var(--s-text-dim)' }}
              aria-label={`Remove ${vendor.company_name} from comparison`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {!canCompare && (
        <div className="rounded-xl border px-3 py-2 text-xs" style={{ color: 'var(--s-text-dim)', borderColor: 'rgba(255,194,32,0.28)', background: 'rgba(255,194,32,0.07)' }}>
          Select one more vendor to activate the side-by-side comparison.
        </div>
      )}

      {canCompare && expanded && (
        <VendorComparison vendors={comparableVendors} onRemove={onRemove} />
      )}
    </section>
  );
};

export default VendorComparisonTray;
