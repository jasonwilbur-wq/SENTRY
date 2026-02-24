import React, { Fragment, useState, useCallback } from 'react';
import { useVendors } from '../context/VendorContext';
import { Vendor } from '../services/api';
import { VendorDetailModal } from './VendorDetailModal';

type RiskLabel = 'Low' | 'Medium' | 'High' | 'Critical';

const RISK_STYLES: Record<RiskLabel, { bar: string; badge: string }> = {
  Low:      { bar: 'bg-green-500',  badge: 'bg-green-900/20 text-green-400 border border-green-800' },
  Medium:   { bar: 'bg-yellow-500', badge: 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' },
  High:     { bar: 'bg-orange-500', badge: 'bg-orange-900/20 text-orange-400 border border-orange-800' },
  Critical: { bar: 'bg-red-500',    badge: 'bg-red-900/20 text-red-400 border border-red-800' },
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex text-sm" aria-label={`Rating: ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={rating >= i + 1 ? 'text-yellow-400' : 'text-slate-600'}>★</span>
      ))}
    </div>
  );
}

function VendorCard({ vendor, onClick }: { vendor: Vendor; onClick: (v: Vendor) => void }) {
  const risk = (vendor.risk_level ?? 'Medium') as RiskLabel;
  const styles = RISK_STYLES[risk] ?? RISK_STYLES.Medium;
  const hasReport =
    vendor.report_url &&
    !vendor.report_url.includes('google.com/search') &&
    vendor.report_url !== '#';
  const productCount = vendor.all_products?.length ?? 1;

  return (
    <article
      className="bg-sentry-card rounded-lg border border-slate-700 shadow-lg hover:shadow-2xl hover:border-slate-500 transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer"
      onClick={() => onClick(vendor)}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${vendor.company_name}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(vendor); }}
    >
      {/* Header */}
      <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-start relative">
        <div className={`absolute top-0 left-0 w-1 h-full ${styles.bar}`} aria-hidden="true" />
        <div className="ml-2 min-w-0">
          <h3
            className="text-lg font-bold text-white group-hover:text-sentry-accent transition-colors line-clamp-1"
            title={vendor.company_name}
          >
            {vendor.company_name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 border border-slate-600">
              {vendor.category}
            </span>
            {productCount > 1 && (
              <span
                className="inline-block px-2 py-0.5 rounded text-[10px] bg-sky-900/40 text-sky-300 border border-sky-800"
                title={`${productCount} products assessed for this vendor`}
              >
                {productCount} products
              </span>
            )}
            {vendor.has_var && (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-green-900/30 text-green-400 border border-green-700 font-bold">
                ✓ VAR
              </span>
            )}
          </div>
        </div>
        <span className={`ml-2 shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${styles.badge}`}>
          {risk} Risk
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex-grow space-y-4">
        <div>
          <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Top Assessed Product</p>
          <p className="text-sm text-slate-200 line-clamp-2 min-h-[2.5em]">{vendor.technology_product}</p>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Security Rating</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{vendor.overall_rating.toFixed(1)}</span>
              <span className="text-xs text-slate-500">/ 5.0</span>
            </div>
            <RatingStars rating={vendor.overall_rating} />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Status</p>
            <span className="text-sm font-medium text-white">{vendor.vendor_status || 'Active'}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center">
          <span className="text-xs text-slate-500">Last Assessed:</span>
          <span className="text-xs font-mono text-sentry-accent">{vendor.last_assessed}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex gap-2">
        {hasReport ? (
          <a
            href={vendor.report_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded font-semibold text-xs transition-all bg-slate-700 text-slate-300 hover:bg-wmt-blue hover:text-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Report
          </a>
        ) : null}
        <button
          onClick={e => { e.stopPropagation(); onClick(vendor); }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded font-semibold text-xs transition-all bg-wmt-blue text-white hover:bg-wmt-yellow hover:text-wmt-void hover:shadow-[0_0_16px_rgba(255,194,32,0.4)]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Details
        </button>
      </div>
    </article>
  );
}

export const VendorDashboard: React.FC = () => {
  const { vendors, categories, loading, backendOffline, total } = useVendors();
  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const filtered = vendors.filter(v => {
    const term = localSearch.toLowerCase();
    const matchesSearch =
      !term ||
      v.company_name.toLowerCase().includes(term) ||
      v.technology_product.toLowerCase().includes(term);
    const matchesCategory = localCategory === 'All' || v.category === localCategory;
    return matchesSearch && matchesCategory;
  });

  const handleClear = useCallback(() => {
    setLocalSearch('');
    setLocalCategory('All');
  }, []);

  const handleOpenVendor = useCallback((v: Vendor) => setSelectedVendor(v), []);
  const handleCloseModal = useCallback(() => setSelectedVendor(null), []);

return (
    <div className="space-y-6 animate-fadeIn">
      {/* Detail modal */}
      {selectedVendor && (
        <VendorDetailModal vendor={selectedVendor} onClose={handleCloseModal} />
      )}
      {/* Header / Search */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-sentry-card p-6 rounded-lg border border-slate-700 shadow-lg sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Vendor Directory</h2>
          <p className="text-slate-400 text-sm">
            {loading
              ? 'Loading vendors…'
              : `${filtered.length} of ${total} vendors`}
            {backendOffline && (
              <span className="ml-2 text-yellow-400 text-xs">⚠ Backend offline — start FastAPI on :8082</span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <label htmlFor="vendor-search" className="sr-only">Search vendors or products</label>
            <input
              id="vendor-search"
              type="search"
              placeholder="Search vendors or products…"
              className="w-full md:w-72 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:border-sentry-accent focus:outline-none placeholder-slate-500"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
          </div>
          <label htmlFor="category-filter" className="sr-only">Filter by category</label>
          <select
            id="category-filter"
            className="bg-slate-900 text-white border border-slate-600 rounded px-4 py-2 focus:outline-none focus:border-sentry-accent"
            value={localCategory}
            onChange={e => setLocalCategory(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-sentry-card rounded-lg border border-slate-700 h-60 animate-pulse" />
          ))}
        </div>
      )}

      {/* Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Fragment wrapper avoids React 19 key-as-prop TS error */}
          {filtered.map(v => <Fragment key={v.id}><VendorCard vendor={v} onClick={handleOpenVendor} /></Fragment>)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="p-12 text-center bg-sentry-card rounded-lg border border-slate-700">
          <p className="text-slate-500 mb-2">No vendors found matching your criteria.</p>
          <button onClick={handleClear} className="text-sentry-accent hover:underline text-sm">
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};