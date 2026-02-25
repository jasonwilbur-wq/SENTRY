/**
 * OverviewTab — core vendor profile panel inside VendorDetailModal.
 */
import React from 'react';
import { Vendor } from '../../services/api';
import { DetailRow } from './shared';

interface Props { vendor: Vendor; }

export function OverviewTab({ vendor }: Props) {
  const stars = Math.round(vendor.overall_rating);
  return (
    <div className="space-y-6">
      {/* Rating / status hero strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall Rating', value: `${vendor.overall_rating.toFixed(2)} / 5.0` },
          { label: 'Decision',       value: vendor.vendor_status },
          { label: 'Risk Level',     value: vendor.risk_level },
          { label: 'Last Assessed',  value: vendor.last_assessed || '\u2014' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</p>
            <p className="text-sm font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Star row */}
      <div className="flex items-center gap-2">
        <div className="flex">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`text-xl ${i < stars ? 'text-wmt-yellow' : 'text-slate-700'}`}>&#9733;</span>
          ))}
        </div>
        <span className="text-slate-400 text-sm">{vendor.overall_rating.toFixed(1)} out of 5</span>
      </div>

      {/* Details grid */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailRow label="Company"       value={vendor.company_name} />
        <DetailRow label="Category"      value={vendor.category} />
        <DetailRow label="Top Product"   value={vendor.technology_product} />
        <DetailRow label="Vendor Status" value={vendor.vendor_status} />
        <DetailRow
          label="Website"
          value={
            vendor.company_url
              ? (
                <a href={vendor.company_url} target="_blank" rel="noopener"
                   className="text-wmt-blue hover:underline break-all">
                  {vendor.company_url}
                </a>
              )
              : null
          }
        />
        <DetailRow
          label="VAR Report"
          value={vendor.has_var ? '\u2705 Available — see VAR Reports tab' : '\u23f3 Not yet assessed'}
        />
      </dl>

      {/* Multi-product table */}
      {vendor.all_products.length > 1 && (
        <div>
          <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-semibold">
            All Assessed Products ({vendor.all_products.length})
          </h4>
          <div className="space-y-2">
            {vendor.all_products.map((p, i) => (
              <div
                key={i}
                className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 flex justify-between items-center gap-3"
              >
                <span className="text-sm text-slate-300 flex-1">{p.technology_product || '\u2014'}</span>
                <span className="text-xs font-mono text-wmt-yellow shrink-0">
                  {p.overall_rating.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 shrink-0">{p.last_assessed}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
