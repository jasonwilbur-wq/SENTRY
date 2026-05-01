/**
 * VendorDashboard — enhanced vendor directory.
 *
 * Architecture:
 *  - VendorStatsPanel: live analytics dashboard (KPIs + charts)
 *  - Pill category filter + risk filter bar
 *  - VendorCard3D grid with 3D glass cards
 *  - Pagination
 *
 * All data comes from VendorContext (server-side filtering).
 */
import React, { useCallback, useState } from 'react';
import { VENDOR_PAGE_SIZE, useVendors } from '../context/VendorContext';
import { Vendor } from '../services/api';
import { VendorDetailModal } from './VendorDetailModal';
import { Pagination } from './Pagination';
import { VendorCard3D } from './VendorCard3D';
import { VendorStatsPanel } from './VendorStatsPanel';
import { useLazyRender } from '../hooks/useLazyRender';

const PAGE_SIZE = VENDOR_PAGE_SIZE;

// ── Lazy-rendered vendor card (defers 3D/SVG until near viewport) ───────────
function LazyVendorCard({ vendor, onClick, immediate }: {
  vendor: Vendor;
  onClick: (v: Vendor) => void;
  immediate: boolean;
}) {
  const { ref, isVisible } = useLazyRender({ rootMargin: '300px', immediate });
  return (
    <div ref={ref}>
      {isVisible ? (
        <VendorCard3D vendor={vendor} onClick={onClick} />
      ) : (
        <div className="h-56 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-700/30" />
      )}
    </div>
  );
}

// ── Risk quick-filter pills ──────────────────────────────────────────────────
const RISK_PILLS = [
  { label: 'All Risks',  value: '',         color: '#64748b' },
  { label: 'Critical',   value: 'Critical',  color: '#ef4444' },
  { label: 'High',       value: 'High',      color: '#f97316' },
  { label: 'Medium',     value: 'Medium',    color: '#eab308' },
  { label: 'Low',        value: 'Low',       color: '#22c55e' },
];

// ── Category pill bar (shorter labels to keep UI clean) ──────────────────────
const PINNED_CATS: Record<string, string> = {
  'All':                                                      'All',
  'Video Management & Recording (VMS/NVR)':                   'VMS/NVR',
  'Cyber-Physical & OT/Infrastructure Security':              'OT/ICS',
  'Counter-UAS (C-UAS)':                                      'C-UAS',
  'Autonomous Systems: Robotics (AMR/Patrol)':                'Robotics',
  'Identity & Access Control (PAC/PIAM)':                     'IAC/PAM',
  'Command & Control / PSIM / Situational Awareness':         'C2/PSIM',
  'Video Analytics & Computer Vision':                        'Video AI',
  'Biometrics & Authentication':                              'Biometrics',
};

// ── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="h-56 rounded-2xl bg-slate-800/60 animate-pulse border border-slate-700/40" />
      ))}
    </div>
  );
}

// ── Stats panel skeleton ─────────────────────────────────────────────────────
function StatsSkeleton() {
  return (
    <div className="h-56 rounded-2xl bg-slate-800/60 animate-pulse border border-slate-700/40 mb-6" />
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export const VendorDashboard: React.FC = () => {
  const {
    vendors, categories, loading, backendOffline,
    total, totalPages, search, category, risk, page,
    setSearch, setCategory, setRisk, setPage,
    stats, statsLoading,
  } = useVendors();

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const handleOpenVendor  = useCallback((v: Vendor) => setSelectedVendor(v), []);
  const handleCloseModal  = useCallback(() => setSelectedVendor(null), []);
  const handleClearFilter = useCallback(() => {
    setSearch('');
    setCategory('All');
    setRisk('');
  }, [setSearch, setCategory, setRisk]);

  const displayed  = vendors;
  const hasFilters = !!(search || category !== 'All' || risk);
  const activeFilterPills = [
    search ? `Search: ${search}` : null,
    category !== 'All' ? `Category: ${PINNED_CATS[category] ?? category}` : null,
    risk ? `Risk: ${risk}` : null,
  ].filter(Boolean) as string[];

  // Categories: only show the pinned ones that exist in the DB
  const pinnedCategories = ['All', ...categories.filter(c => c !== 'All' && PINNED_CATS[c])];

  return (
    <div className="space-y-0 animate-fadeIn">
      {/* ── Modal ───────────────────────────────────────────────── */}
      {selectedVendor && (
        <VendorDetailModal vendor={selectedVendor} onClose={handleCloseModal} />
      )}

      {/* ── Stats Panel ─────────────────────────────────────────── */}
      {statsLoading && <StatsSkeleton />}
      {!statsLoading && stats && (
        <VendorStatsPanel
          stats={stats}
          onRiskSelect={(selectedRisk) => setRisk(selectedRisk === risk ? '' : selectedRisk)}
          onCategorySelect={(selectedCategory) => setCategory(selectedCategory)}
          activeRisk={risk}
          activeCategory={category}
        />
      )}

      {/* ── Search + Filter Header ───────────────────────────────── */}
      <div
        className="sticky top-0 z-20 bg-sentry-bg/90 backdrop-blur-md pt-2 pb-4 space-y-3"
      >
        {/* Title row + search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">
              Vendor Directory
              <span className="ml-2 text-sm font-normal text-slate-500">
                {loading ? '…' : `${total.toLocaleString()} vendors`}
              </span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Search by company or product, then narrow by category and risk to compare vendors quickly.
            </p>
            {backendOffline && (
              <p className="text-xs text-yellow-400 mt-1.5">
                ⚠ Backend offline — live directory data may be incomplete until backend/start_backend.bat is running.
              </p>
            )}
          </div>

          {/* Search input */}
          <div className="relative w-full md:w-80">
            <label htmlFor="vd-search" className="sr-only">Search vendors or products</label>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                 style={{ color: 'var(--s-text-dim)' }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              id="vd-search"
              type="search"
              placeholder="Search vendors, products…"
              className="w-full rounded-xl pl-9 pr-10 py-2.5 text-sm placeholder-slate-600"
              style={{
                background: 'var(--s-input-bg)',
                border: '1px solid var(--s-border-mid)',
                color: 'var(--s-text)',
                outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(0,83,226,0.5)';
                (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,83,226,0.15)';
              }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.borderColor = 'var(--s-border-mid)';
                (e.target as HTMLInputElement).style.boxShadow = 'none';
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                style={{ color: '#475569' }}
                aria-label="Clear search"
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--s-text)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {pinnedCategories.map(cat => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(cat)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                style={active ? {
                  background: 'rgba(0,83,226,0.2)',
                  color: '#0053e2',
                  border: '1px solid rgba(0,83,226,0.6)',
                  boxShadow: '0 0 12px rgba(0,83,226,0.35)',
                  transform: 'scale(1.04)',
                } : {
                  background: 'var(--s-input-bg)',
                  color: 'var(--s-text-dim)',
                  border: '1px solid var(--s-border-mid)',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--s-text)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--s-border)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--s-text-dim)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--s-border-mid)'; } }}
              >
                {PINNED_CATS[cat] ?? cat}
              </button>
            );
          })}
        </div>

        {/* Risk pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold mr-1">Risk:</span>
          {RISK_PILLS.map(p => (
            <button
              key={p.value}
              type="button"
              aria-pressed={risk === p.value}
              onClick={() => setRisk((p.value as '' | 'Low' | 'Medium' | 'High' | 'Critical'))}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                risk === p.value ? 'text-white' : ''
              }`}
              style={risk === p.value ? {
                backgroundColor: p.color + '33',
                borderColor: p.color,
                boxShadow: `0 0 10px ${p.color}55`,
                color: p.color,
              } : {
                background: 'var(--s-input-bg)',
                color: 'var(--s-text-dim)',
                borderColor: 'var(--s-border)',
              }}
            >
              {p.label}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="ml-auto px-3 py-1 text-xs text-slate-500 hover:text-white
                         border border-slate-700 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Clear All
            </button>
          )}
        </div>

        {activeFilterPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Active</span>
            {activeFilterPills.map(pill => (
              <span
                key={pill}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-700 bg-slate-900/70 text-slate-300"
              >
                {pill}
              </span>
            ))}
          </div>
        )}

        {/* Pagination header hint */}
        {!loading && totalPages > 1 && (
          <p className="text-[10px] text-slate-600">
            Page {page} of {totalPages} — {total.toLocaleString()} total
          </p>
        )}
      </div>

      {/* ── Vendor Grid ─────────────────────────────────────────── */}
      {loading && <Skeleton />}

      {!loading && displayed.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 grid-stagger">
          {displayed.map((v, i) => (
            <LazyVendorCard
              key={v.id}
              vendor={v}
              onClick={handleOpenVendor}
              immediate={i < 6}  /* first 2 rows render immediately */
            />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!loading && displayed.length === 0 && (
        <div className="py-20 text-center rounded-2xl border border-slate-700/50 bg-slate-900/40">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-400 mb-2 font-semibold">No vendors match the current view</p>
          <p className="text-slate-600 text-sm mb-4">
            {hasFilters
              ? 'Broaden the search or clear one of the active filters to bring vendors back into view.'
              : 'No vendor records are available in the current dataset.'}
          </p>
          <button
            type="button"
            onClick={handleClearFilter}
            className="px-4 py-2 rounded-lg bg-wmt-blue text-white text-sm font-semibold
                       hover:bg-blue-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="mt-6 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
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