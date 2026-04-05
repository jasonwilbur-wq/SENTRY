/**
 * VendorDashboard — enhanced vendor directory with seamless filtering.
 *
 * Architecture:
 *  - VendorStatsPanel: live analytics dashboard (KPIs + charts)
 *  - Unified filter bar: search | category combobox | risk | VAR | sort
 *  - Searchable category dropdown shows ALL categories with vendor counts
 *  - Ctrl+K keyboard shortcut focuses search
 *  - VendorCard3D grid with 3D glass cards
 *  - Pagination (server-side for everything except phase filter)
 */
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useVendors } from '../context/VendorContext';
import { Vendor, DirectoryStats, fetchStats } from '../services/api';
import { VendorDetailModal } from './VendorDetailModal';
import { Pagination } from './Pagination';
import { VendorCard3D } from './VendorCard3D';
import { VendorStatsPanel } from './VendorStatsPanel';

const PAGE_SIZE = 18;

// ── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'rating',        label: '⭐ Top Rated' },
  { value: 'name',          label: 'A→Z Name' },
  { value: 'risk',          label: '⚠️ Risk Level' },
  { value: 'last_assessed', label: '📅 Recently Assessed' },
];

// ── Risk quick-filter pills ──────────────────────────────────────────────────
const RISK_PILLS = [
  { label: 'All',       value: '',         color: '#64748b' },
  { label: 'Critical',  value: 'Critical', color: '#ef4444' },
  { label: 'High',      value: 'High',     color: '#f97316' },
  { label: 'Medium',    value: 'Medium',   color: '#eab308' },
  { label: 'Low',       value: 'Low',      color: '#22c55e' },
];

// ── Phase pills ──────────────────────────────────────────────────────────────
const PHASE_PILLS = [
  { label: 'All',          value: 0  },
  { label: '1 Intake',     value: 1  },
  { label: '2 Engage',     value: 2  },
  { label: '3 NDA',        value: 3  },
  { label: '4 Assess',     value: 4  },
  { label: '5 Lab/PoC',    value: 5  },
  { label: '6 APM/SSP',    value: 6  },
  { label: '7 Pilot',      value: 7  },
  { label: '8 BAU',        value: 8  },
];

// ── Searchable Category Combobox ─────────────────────────────────────────────
function CategoryCombobox({
  categories,
  categoryCounts,
  selected,
  onSelect,
}: {
  categories: string[];
  categoryCounts: Record<string, number>;
  selected: string;
  onSelect: (cat: string) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const ref                   = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter categories by query
  const filtered = categories.filter(
    c => c.toLowerCase().includes(query.toLowerCase())
  );

  const displayLabel = selected === 'All'
    ? `All Categories (${Object.values(categoryCounts).reduce((a, b) => a + b, 0)})`
    : `${selected} (${categoryCounts[selected] ?? '?'})`;

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                   transition-all duration-150 min-w-[180px] max-w-[320px]"
        style={{
          background: selected !== 'All' ? 'rgba(0,83,226,0.15)' : 'var(--s-input-bg)',
          border: selected !== 'All' ? '1px solid rgba(0,83,226,0.5)' : '1px solid var(--s-border-mid)',
          color: selected !== 'All' ? '#60a5fa' : 'var(--s-text-dim)',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg className="w-3.5 h-3.5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        <span className="truncate">{displayLabel}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-[360px] max-h-[420px] rounded-xl shadow-2xl
                     overflow-hidden flex flex-col animate-fadeIn"
          style={{
            background: 'var(--s-modal-card)',
            border: '1px solid var(--s-border-mid)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Search input inside dropdown */}
          <div className="p-2 shrink-0" style={{ borderBottom: '1px solid var(--s-border)' }}>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                   style={{ color: 'var(--s-text-dim)' }}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Filter categories…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full rounded-lg pl-8 pr-3 py-2 text-xs placeholder-slate-600"
                style={{
                  background: 'var(--s-input-bg)',
                  border: '1px solid var(--s-border)',
                  color: 'var(--s-text)',
                  outline: 'none',
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                }}
              />
            </div>
          </div>

          {/* Category list */}
          <div className="overflow-y-auto flex-1 py-1 custom-scrollbar" role="listbox">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-600">
                No categories match "{query}"
              </p>
            )}
            {filtered.map(cat => {
              const isActive = selected === cat;
              const count = cat === 'All'
                ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
                : (categoryCounts[cat] ?? 0);
              return (
                <button
                  key={cat}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => { onSelect(cat); setOpen(false); setQuery(''); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left
                             text-xs transition-colors hover:bg-white/5"
                  style={{
                    color: isActive ? '#60a5fa' : 'var(--s-text-muted)',
                    background: isActive ? 'rgba(0,83,226,0.1)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isActive && (
                      <svg className="w-3 h-3 shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className={`truncate ${isActive ? 'font-bold' : ''}`}>{cat}</span>
                  </div>
                  <span
                    className="shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      background: isActive ? 'rgba(0,83,226,0.2)' : 'rgba(255,255,255,0.04)',
                      color: isActive ? '#60a5fa' : '#475569',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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

function StatsSkeleton() {
  return (
    <div className="h-56 rounded-2xl bg-slate-800/60 animate-pulse border border-slate-700/40 mb-6" />
  );
}

// ── Active filter chip ───────────────────────────────────────────────────────
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                 border transition-all"
      style={{
        background: 'rgba(0,83,226,0.12)',
        borderColor: 'rgba(0,83,226,0.3)',
        color: '#60a5fa',
      }}
    >
      {label}
      <button onClick={onClear} className="hover:text-white ml-0.5" aria-label={`Remove ${label} filter`}>×</button>
    </span>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export const VendorDashboard: React.FC = () => {
  const {
    vendors, categories, categoryCounts, loading, backendOffline,
    total, totalPages, search, category, riskLevel, hasVar, sort, page,
    setSearch, setCategory, setRiskLevel, setHasVar, setSort, setPage,
  } = useVendors();

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [phaseFilter,    setPhaseFilter]    = useState(0);
  const [stats,          setStats]          = useState<DirectoryStats | null>(null);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Fetch stats once on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Ctrl+K keyboard shortcut ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('');
        searchRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setSearch]);

  const handleOpenVendor  = useCallback((v: Vendor) => setSelectedVendor(v), []);
  const handleCloseModal  = useCallback(() => setSelectedVendor(null), []);
  const handleClearAll    = useCallback(() => {
    setSearch(''); setCategory('All'); setRiskLevel(''); setHasVar('');
    setSort('rating'); setPhaseFilter(0);
  }, [setSearch, setCategory, setRiskLevel, setHasVar, setSort]);

  // Phase filter is still client-side (project associations are nested)
  const displayed = vendors.filter(v =>
    !phaseFilter || (v.linked_projects ?? []).some(lp => lp.est_phase_index === phaseFilter)
  );

  const activeFilterCount = [
    search, category !== 'All' ? category : '', riskLevel, hasVar,
    sort !== 'rating' ? sort : '', phaseFilter ? String(phaseFilter) : '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-0 animate-fadeIn">
      {/* ── Modal ── */}
      {selectedVendor && (
        <VendorDetailModal vendor={selectedVendor} onClose={handleCloseModal} />
      )}

      {/* ── Stats Panel ── */}
      {statsLoading && <StatsSkeleton />}
      {!statsLoading && stats && <VendorStatsPanel stats={stats} />}

      {/* ── Search + Filter Header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-sentry-bg/90 backdrop-blur-md pt-2 pb-3 space-y-2.5">

        {/* Row 1: Title + Search + Sort */}
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search input */}
            <div className="relative flex-1 md:w-80">
              <label htmlFor="vd-search" className="sr-only">Search vendors, products, categories…</label>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                   style={{ color: 'var(--s-text-dim)' }}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                ref={searchRef}
                id="vd-search"
                type="search"
                placeholder="Search vendors, products, categories, risk levels…"
                className="w-full rounded-xl pl-9 pr-16 py-2.5 text-sm placeholder-slate-600"
                style={{
                  background: 'var(--s-input-bg)',
                  border: '1px solid var(--s-border-mid)',
                  color: 'var(--s-text)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#475569' }}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : (
                <kbd
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded
                             text-[10px] font-mono pointer-events-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#475569',
                  }}
                >
                  Ctrl+K
                </kbd>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <label htmlFor="vd-sort" className="sr-only">Sort vendors</label>
              <select
                id="vd-sort"
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="appearance-none rounded-xl px-3 py-2.5 pr-8 text-xs font-semibold cursor-pointer"
                style={{
                  background: 'var(--s-input-bg)',
                  border: '1px solid var(--s-border-mid)',
                  color: 'var(--s-text)',
                  outline: 'none',
                }}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                   style={{ color: 'var(--s-text-dim)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Row 2: Filter controls — Category | Risk | VAR | Phase */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category combobox */}
          <CategoryCombobox
            categories={categories}
            categoryCounts={categoryCounts}
            selected={category}
            onSelect={setCategory}
          />

          {/* Divider */}
          <div className="w-px h-6 mx-0.5" style={{ background: 'var(--s-border-mid)' }} />

          {/* Risk pills */}
          <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Risk:</span>
          {RISK_PILLS.map(p => (
            <button
              key={p.value}
              onClick={() => setRiskLevel(riskLevel === p.value ? '' : p.value)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={riskLevel === p.value ? {
                backgroundColor: p.color + '33',
                borderColor: p.color,
                boxShadow: `0 0 8px ${p.color}44`,
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

          {/* Divider */}
          <div className="w-px h-6 mx-0.5" style={{ background: 'var(--s-border-mid)' }} />

          {/* VAR toggle */}
          <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">VAR:</span>
          {[
            { label: 'All',       value: '' },
            { label: '✓ Has',    value: 'yes' },
            { label: '✕ None',   value: 'no' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setHasVar(hasVar === p.value ? '' : p.value)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={hasVar === p.value ? {
                background: p.value === 'yes' ? 'rgba(34,197,94,0.18)' : p.value === 'no' ? 'rgba(239,68,68,0.18)' : 'rgba(0,83,226,0.15)',
                borderColor: p.value === 'yes' ? 'rgba(34,197,94,0.6)' : p.value === 'no' ? 'rgba(239,68,68,0.5)' : 'rgba(0,83,226,0.5)',
                color: p.value === 'yes' ? '#22c55e' : p.value === 'no' ? '#ef4444' : '#60a5fa',
              } : {
                background: 'var(--s-input-bg)',
                color: 'var(--s-text-dim)',
                borderColor: 'var(--s-border)',
              }}
            >
              {p.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 mx-0.5" style={{ background: 'var(--s-border-mid)' }} />

          {/* Phase pills — compact */}
          <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Phase:</span>
          {PHASE_PILLS.map(p => (
            <button
              key={p.value}
              onClick={() => setPhaseFilter(phaseFilter === p.value ? 0 : p.value)}
              className="px-2 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={phaseFilter === p.value ? {
                background: 'rgba(168,85,247,0.18)',
                borderColor: 'rgba(168,85,247,0.6)',
                color: '#c084fc',
              } : {
                background: 'var(--s-input-bg)',
                color: 'var(--s-text-dim)',
                borderColor: 'var(--s-border)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Row 3: Active filter chips + clear all */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-600 mr-1">Active:</span>
            {search && <FilterChip label={`Search: "${search}"`} onClear={() => setSearch('')} />}
            {category !== 'All' && <FilterChip label={category} onClear={() => setCategory('All')} />}
            {riskLevel && <FilterChip label={`${riskLevel} Risk`} onClear={() => setRiskLevel('')} />}
            {hasVar && <FilterChip label={hasVar === 'yes' ? 'Has VAR' : 'No VAR'} onClear={() => setHasVar('')} />}
            {sort !== 'rating' && (
              <FilterChip
                label={`Sort: ${SORT_OPTIONS.find(o => o.value === sort)?.label ?? sort}`}
                onClear={() => setSort('rating')}
              />
            )}
            {phaseFilter > 0 && (
              <FilterChip label={`Phase ${phaseFilter}`} onClear={() => setPhaseFilter(0)} />
            )}
            <button
              onClick={handleClearAll}
              className="ml-auto px-2.5 py-1 text-[10px] text-slate-500 hover:text-white
                         border border-slate-700 rounded-full transition font-semibold"
            >
              Clear All ({activeFilterCount})
            </button>
          </div>
        )}

        {/* Pagination hint */}
        {!loading && totalPages > 1 && (
          <p className="text-[10px] text-slate-600">
            Page {page} of {totalPages} — {total.toLocaleString()} total
          </p>
        )}
      </div>

      {/* ── Vendor Grid ── */}
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

      {/* ── Empty state ── */}
      {!loading && displayed.length === 0 && (
        <div className="py-20 text-center rounded-2xl"
             style={{ border: '1px solid var(--s-border-mid)', background: 'var(--s-card)' }}>
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-400 mb-2 font-semibold">No vendors match your filters</p>
          <p className="text-slate-600 text-sm mb-4">
            {search
              ? `No results for "${search}" — try a broader search or different filters`
              : 'Try broadening your filters or clearing them all'}
          </p>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-lg bg-wmt-blue text-white text-sm font-semibold
                       hover:bg-blue-600 transition"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* ── Pagination ── */}
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
