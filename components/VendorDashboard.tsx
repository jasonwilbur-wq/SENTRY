/**
 * VendorDashboard — grid of vendor cards with server-side search, filter, and pagination.
 *
 * All filter/pagination state lives in VendorContext and hits the backend;
 * no client-side filtering. This dashboard is a pure display component.
 */
import React, { Fragment, useCallback } from 'react';
import { useVendors } from '../context/VendorContext';
import { Vendor, getDownloadUrl } from '../services/api';
import { VendorDetailModal } from './VendorDetailModal';
import { Pagination } from './Pagination';

const PAGE_SIZE = 20;

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
        <span key={i} className={rating >= i + 1 ? 'text-yellow-400' : 'text-slate-600'}>&#9733;</span>
      ))}
    </div>
  );
}

function VendorCard({ vendor, onClick }: { vendor: Vendor; onClick: (v: Vendor) => void }) {
  const risk    = (vendor.risk_level ?? 'Medium') as RiskLabel;
  const styles  = RISK_STYLES[risk] ?? RISK_STYLES.Medium;
  const hasReport =
    vendor.report_url &&
    !vendor.report_url.includes('google.com/search') &&
    vendor.report_url !== '#';
  const productCount = vendor.all_products?.length ?? 1;

  return (
    <article
      className="bg-sentry-card rounded-lg border border-slate-700 shadow-lg hover:shadow-2xl
                 hover:border-slate-500 transition-all duration-300 flex flex-col overflow-hidden
                 group cursor-pointer"
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
                title={`${productCount} products assessed`}
              >
                {productCount} products
              </span>
            )}
            {vendor.has_var && (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-green-900/30 text-green-400 border border-green-700 font-bold">
                &#10003; VAR
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
      <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex gap-2 flex-wrap">
        {hasReport ? (
          <a
            href={vendor.report_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded font-semibold
                       text-xs transition-all bg-slate-700 text-slate-300 hover:bg-wmt-blue hover:text-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Report
          </a>
        ) : null}

        {vendor.has_var && vendor.latest_var_id ? (
          <a
            href={getDownloadUrl(vendor.latest_var_id)}
            download
            onClick={e => e.stopPropagation()}
            aria-label={`Download VAR report for ${vendor.company_name}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded font-semibold
                       text-xs transition-all bg-green-700 text-white hover:bg-green-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            VAR
          </a>
        ) : null}

        <button
          onClick={e => { e.stopPropagation(); onClick(vendor); }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded font-semibold
                     text-xs transition-all bg-wmt-blue text-white
                     hover:bg-wmt-yellow hover:text-wmt-void hover:shadow-[0_0_16px_rgba(255,194,32,0.4)]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Details
        </button>
      </div>
    </article>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────

export const VendorDashboard: React.FC = () => {
  const {
    vendors, categories, loading, backendOffline,
    total, totalPages, search, category, page,
    setSearch, setCategory, setPage,
  } = useVendors();

  const [selectedVendor, setSelectedVendor] = React.useState<Vendor | null>(null);

  const handleOpenVendor  = useCallback((v: Vendor) => setSelectedVendor(v), []);
  const handleCloseModal  = useCallback(() => setSelectedVendor(null), []);
  const handleClearFilter = useCallback(() => { setSearch(''); setCategory('All'); }, [setSearch, setCategory]);

  const showEmpty = !loading && vendors.length === 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {selectedVendor && (
        <VendorDetailModal vendor={selectedVendor} onClose={handleCloseModal} />
      )}

      {/* ── Sticky header + filters ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4
                      bg-sentry-card p-6 rounded-lg border border-slate-700 shadow-lg
                      sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Vendor Directory</h2>
          <p className="text-slate-400 text-sm">
            {loading
              ? 'Loading…'
              : `${total.toLocaleString()} vendor${total !== 1 ? 's' : ''} — page ${page} of ${totalPages}`
            }
            {backendOffline && (
              <span className="ml-2 text-yellow-400 text-xs">
                ⚠ Backend offline — run backend/start_backend.bat
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-grow md:flex-grow-0">
            <label htmlFor="vendor-search" className="sr-only">Search vendors or products</label>
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              id="vendor-search"
              type="search"
              placeholder="Search vendors or products…"
              className="w-full md:w-72 bg-slate-900 border border-slate-600 rounded pl-9 pr-4 py-2
                         text-white focus:border-sentry-accent focus:outline-none placeholder-slate-500
                         transition"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search vendors or products"
            />
          </div>

          {/* Category filter */}
          <label htmlFor="category-filter" className="sr-only">Filter by category</label>
          <select
            id="category-filter"
            className="bg-slate-900 text-white border border-slate-600 rounded px-4 py-2
                       focus:outline-none focus:border-sentry-accent transition"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          {/* Clear button — only shown when a filter is active */}
          {(search || category !== 'All') && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 rounded text-sm font-semibold text-slate-400
                         hover:text-white hover:bg-slate-700 border border-slate-600 transition"
              aria-label="Clear all filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Skeletons while loading ───────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="bg-sentry-card rounded-lg border border-slate-700 h-64 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Vendor grid ───────────────────────────────────────────────── */}
      {!loading && vendors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(v => (
            <Fragment key={v.id}>
              <VendorCard vendor={v} onClick={handleOpenVendor} />
            </Fragment>
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {showEmpty && (
        <div className="p-12 text-center bg-sentry-card rounded-lg border border-slate-700">
          <p className="text-slate-500 mb-3 text-lg">No vendors found matching your criteria.</p>
          <button
            onClick={handleClearFilter}
            className="text-wmt-blue hover:underline text-sm"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="bg-sentry-card border border-slate-700 rounded-lg p-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
};
