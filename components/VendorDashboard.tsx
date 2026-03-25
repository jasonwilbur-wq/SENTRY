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
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useVendors } from '../context/VendorContext';
import { Vendor, DirectoryStats, fetchStats } from '../services/api';
import { VendorDetailModal } from './VendorDetailModal';
import { Pagination } from './Pagination';
import { VendorCard3D } from './VendorCard3D';
import { VendorStatsPanel } from './VendorStatsPanel';

const PAGE_SIZE = 18; // divisible by 2 and 3 for clean grids

// ── Risk quick-filter pills ──────────────────────────────────────────────────
const RISK_PILLS = [
  { label: 'All Risks',  value: '',         color: '#64748b' },
  { label: 'Critical',   value: 'Critical',  color: '#ef4444' },
  { label: 'High',       value: 'High',      color: '#f97316' },
  { label: 'Medium',     value: 'Medium',    color: '#eab308' },
  { label: 'Low',        value: 'Low',       color: '#22c55e' },
];

const PHASE_PILLS = [
  { label: 'All Phases',    value: 0  },
  { label: 'Ph.1 Intake',   value: 1  },
  { label: 'Ph.2 Engage',   value: 2  },
  { label: 'Ph.3 NDA',      value: 3  },
  { label: 'Ph.4 Assess',   value: 4  },
  { label: 'Ph.5 Lab/PoC',  value: 5  },
  { label: 'Ph.6 APM/SSP',  value: 6  },
  { label: 'Ph.7 Pilot',    value: 7  },
  { label: 'Ph.8 BAU',      value: 8  },
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
  'Video Analytics/AI':                                       'V-Analytics',
  'Biometrics & Authentication':                              'Biometrics',
  'Cloud Security':                                           'Cloud Sec',
  'Edge AI/IoT':                                              'Edge AI/IoT',
};

// ── Helper: client-side risk filter on top of server results ─────────────────
function applyRiskFilter(vendors: Vendor[], risk: string): Vendor[] {
  if (!risk) return vendors;
  return vendors.filter(v => v.risk_level === risk);
}

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
    total, totalPages, search, category, page,
    setSearch, setCategory, setPage,
  } = useVendors();

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [riskFilter,     setRiskFilter]     = useState('');
  const [phaseFilter,    setPhaseFilter]    = useState(0);
  const [stats,          setStats]          = useState<DirectoryStats | null>(null);
  const [statsLoading,   setStatsLoading]   = useState(true);

  // ── Fetch stats once on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => { /* non-critical — just hide the panel */ })
      .finally(() => setStatsLoading(false));
  }, []);

  const handleOpenVendor  = useCallback((v: Vendor) => setSelectedVendor(v), []);
  const handleCloseModal  = useCallback(() => setSelectedVendor(null), []);
  const handleClearFilter = useCallback(() => {
    setSearch(''); setCategory('All'); setRiskFilter(''); setPhaseFilter(0);
  }, [setSearch, setCategory]);

  // Apply client-side risk + phase filters on top of server-paginated results
  const displayed = vendors
    .filter(v => !riskFilter  || v.risk_level === riskFilter)
    .filter(v => !phaseFilter || (v.linked_projects ?? []).some(
      lp => lp.est_phase_index === phaseFilter
    ));
  const hasFilters = !!(search || category !== 'All' || riskFilter || phaseFilter);

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
      {!statsLoading && stats && <VendorStatsPanel stats={stats} />}

      {/* ── Search + Filter Header ───────────────────────────────── */}
      <div
        className="sticky top-0 z-20 bg-sentry-bg/90 backdrop-blur-md pt-2 pb-4 space-y-3"
      >
        {/* Title row + search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black" style={{ color: 'var(--s-text)' }}>
              Vendor Directory
              <span className="ml-2 text-sm font-normal text-slate-500">
                {loading ? '…' : `${total.toLocaleString()} vendors`}
              </span>
            </h2>
            {backendOffline && (
              <p className="text-xs text-yellow-400 mt-0.5">
                ⚠ Backend offline — run backend/start_backend.bat
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
              // Focus ring handled via #vd-search:focus-visible in styles.css
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#475569' }}
                aria-label="Clear search"
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
                onClick={() => setCategory(cat)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
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
              onClick={() => setRiskFilter(p.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                riskFilter === p.value ? 'text-white' : ''
              }`}
              style={riskFilter === p.value ? {
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
              onClick={handleClearFilter}
              className="ml-auto px-3 py-1 text-xs text-slate-500 hover:text-white
                         border border-slate-700 rounded-full transition"
            >
              Clear All
            </button>
          )}
        </div>

        {/* EST Phase pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold mr-1">EST Phase:</span>
          {PHASE_PILLS.map(p => {
            const active = phaseFilter === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setPhaseFilter(p.value)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={active ? {
                  background: 'rgba(168,85,247,0.18)',
                  borderColor: 'rgba(168,85,247,0.6)',
                  boxShadow: '0 0 10px rgba(168,85,247,0.35)',
                  color: '#c084fc',
                } : {
                  background: 'var(--s-input-bg)',
                  color: 'var(--s-text-dim)',
                  borderColor: 'var(--s-border)',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

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
          {displayed.map(v => (
            <Fragment key={v.id}>
              <VendorCard3D vendor={v} onClick={handleOpenVendor} />
            </Fragment>
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!loading && displayed.length === 0 && (
        <div className="py-20 text-center rounded-2xl" style={{ border: '1px solid var(--s-border-mid)', background: 'var(--s-card)' }}>
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-400 mb-2 font-semibold">No vendors match your filters</p>
          <p className="text-slate-600 text-sm mb-4">Try broadening your search or clearing the filters</p>
          <button
            onClick={handleClearFilter}
            className="px-4 py-2 rounded-lg bg-wmt-blue text-white text-sm font-semibold
                       hover:bg-blue-600 transition"
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