/**
 * AdminPanel — Phase 3 VAR Management UI.
 *
 * Features:
 *  - Stats overview (coverage, decision bands)
 *  - Paginated VAR table with score status
 *  - Per-row score extraction trigger
 *  - Bulk batch extraction with live progress
 *  - Manual vendor re-linking modal
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdminStats,
  BatchExtractResponse,
  ExtractResult,
  VarAdminRow,
  VarListResponse,
  extractBatch,
  extractVarScores,
  fetchAdminStats,
  fetchAdminVars,
  linkVarToVendor,
  searchVendorsForLinking,
  runVendorDirectorySync,
  VendorSyncResponse,
} from '../services/api';
import { CompetitorIntelAdmin } from './CompetitorIntelAdmin';

// ── Helpers ───────────────────────────────────────────────────────────────────────

const BAND_COLORS: Record<string, string> = {
  Advance:          'bg-green-900/30 text-green-400 border-green-700',
  'Research Further':'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  Defer:            'bg-orange-900/30 text-orange-400 border-orange-700',
  Reject:           'bg-red-900/30 text-red-400 border-red-700',
};

function BandBadge({ band }: { band: string }) {
  const cls = BAND_COLORS[band] ?? 'bg-slate-700 text-slate-400 border-slate-600';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap ${cls}`}>
      {band || '—'}
    </span>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-500 text-sm">—</span>;
  const color =
    score >= 4.0 ? 'text-green-400' :
    score >= 3.0 ? 'text-yellow-400' :
    score >= 2.0 ? 'text-orange-400' : 'text-red-400';
  return <span className={`font-mono font-bold text-sm ${color}`}>{score.toFixed(2)}</span>;
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-sentry-card border border-slate-700 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-black ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Link Modal ───────────────────────────────────────────────────────────────────

interface LinkModalProps {
  varRow: VarAdminRow;
  onClose: () => void;
  onLinked: (varId: string, vendorId: string, vendorName: string) => void;
}

function LinkModal({ varRow, onClose, onLinked }: LinkModalProps) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<{ id: string; company_name: string; category: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback((q: string) => {
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchVendorsForLinking(q);
        setResults(data.results);
      } catch { setError('Search failed'); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  const handleLink = async (vendorId: string) => {
    try {
      const res = await linkVarToVendor(varRow.id, vendorId);
      onLinked(varRow.id, vendorId, res.company_name);
      onClose();
    } catch { setError('Link failed'); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Link VAR to vendor"
    >
      <div className="bg-sentry-card border border-slate-600 rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-white font-bold text-lg">Link VAR to Vendor</h3>
            <p className="text-slate-400 text-sm mt-1 truncate max-w-sm" title={varRow.filename}>
              {varRow.filename}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="search"
          placeholder="Search vendor name..."
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white
                     placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wmt-blue text-sm mb-3"
          autoFocus
        />

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading && <p className="text-slate-400 text-sm text-center py-4">Searching...</p>}
          {!loading && results.map(r => (
            <button
              key={r.id}
              onClick={() => handleLink(r.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <p className="text-white text-sm font-medium">{r.company_name}</p>
              <p className="text-slate-400 text-xs">{r.category}</p>
            </button>
          ))}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No vendors found</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Batch progress drawer ───────────────────────────────────────────────

function BatchResultDrawer({ res, onClose }: { res: BatchExtractResponse; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 w-96 bg-sentry-card border border-slate-600 rounded-xl shadow-2xl z-40 p-5">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-white font-bold">Batch Extraction Complete</h4>
        <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-black text-green-400">{res.succeeded}</p>
          <p className="text-xs text-slate-400">Extracted</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-red-400">{res.failed}</p>
          <p className="text-xs text-slate-400">Failed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-slate-400">{res.skipped}</p>
          <p className="text-xs text-slate-400">Skipped</p>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {res.results.filter(r => !r.success).map(r => (
          <div key={r.var_id} className="text-xs text-red-400 truncate" title={r.error}>
            ❌ {r.filename.slice(0, 40)}: {r.error}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main AdminPanel ──────────────────────────────────────────────────────────────────

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vars' | 'competitor'>('vars');
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [varList, setVarList]     = useState<VarListResponse | null>(null);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [scoredFilter, setScoredFilter] = useState<'yes' | 'no' | ''>('');
  const [extracting, setExtracting]     = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult]   = useState<BatchExtractResponse | null>(null);
  const [linkTarget, setLinkTarget]     = useState<VarAdminRow | null>(null);
  const [syncPreview, setSyncPreview]   = useState<VendorSyncResponse | null>(null);
  const [syncRunning, setSyncRunning]   = useState(false);
  const [syncApplying, setSyncApplying] = useState(false);
  const [syncError, setSyncError]       = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const PAGE_SIZE = 25;

  const loadStats = useCallback(async () => {
    try { setStats(await fetchAdminStats()); } catch {}
  }, []);

  const loadVars = useCallback(async (p: number, s: string, f: '' | 'yes' | 'no') => {
    try {
      const data = await fetchAdminVars({
        page: p, page_size: PAGE_SIZE,
        search: s || undefined,
        scored: f || undefined,
      });
      setVarList(data);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadVars(page, search, scoredFilter), 300);
  }, [page, search, scoredFilter, loadVars]);

  const handleExtractOne = async (varId: string) => {
    setExtracting(prev => new Set(prev).add(varId));
    try {
      const res = await extractVarScores(varId);
      if (res.success) {
        // Optimistically update the row
        setVarList(prev => prev ? {
          ...prev,
          vars: prev.vars.map(v =>
            v.id === varId
              ? { ...v, overall_score: res.overall_score, decision_band: res.decision_band, has_scores: true }
              : v
          ),
        } : prev);
        loadStats();
      }
    } finally {
      setExtracting(prev => { const s = new Set(prev); s.delete(varId); return s; });
    }
  };

  const handleBatchExtract = async () => {
    setBatchRunning(true);
    try {
      const res = await extractBatch(50);
      setBatchResult(res);
      await loadStats();
      await loadVars(page, search, scoredFilter);
    } finally {
      setBatchRunning(false);
    }
  };

  const handleLinked = (varId: string, _vendorId: string, vendorName: string) => {
    setVarList(prev => prev ? {
      ...prev,
      vars: prev.vars.map(v =>
        v.id === varId ? { ...v, company_name: vendorName, match_method: 'manual' } : v
      ),
    } : prev);
  };

  const handleVendorSyncPreview = async () => {
    setSyncRunning(true);
    setSyncError('');
    try {
      const res = await runVendorDirectorySync({ apply: false, sample_limit: 20 });
      setSyncPreview(res);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Preview failed');
    } finally {
      setSyncRunning(false);
    }
  };

  const handleVendorSyncApply = async () => {
    const confirmApply = window.confirm(
      'Apply vendor directory sync? This will delete vendors not present in the canonical Vendor Assessments library.'
    );
    if (!confirmApply) return;

    setSyncApplying(true);
    setSyncError('');
    try {
      const res = await runVendorDirectorySync({ apply: true, backup: true, sample_limit: 20 });
      setSyncPreview(res);
      await loadStats();
      await loadVars(1, search, scoredFilter);
      setPage(1);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync apply failed');
    } finally {
      setSyncApplying(false);
    }
  };

  const coveragePct = stats?.extraction_coverage_pct ?? 0;
  const progressWidth = `${Math.min(100, coveragePct)}%`;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700 pb-1">
        <button
          onClick={() => setActiveTab('vars')}
          className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
            activeTab === 'vars'
              ? 'bg-slate-800 text-yellow-300 border border-b-slate-800 border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          📊 VAR Management
        </button>
        <button
          onClick={() => setActiveTab('competitor')}
          className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
            activeTab === 'competitor'
              ? 'bg-slate-800 text-yellow-300 border border-b-slate-800 border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          📡 Competitor Intel
        </button>
      </div>

      {/* VAR Management Tab */}
      {activeTab === 'vars' && (
        <>
      {/* Stats cards */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total VARs" value={stats.total_vars} />
            <StatCard
              label="Scored"
              value={stats.scored_vars}
              sub={`${coveragePct}% coverage`}
              color="text-green-400"
            />
            <StatCard
              label="Unscored"
              value={stats.unscored_vars}
              color={stats.unscored_vars > 0 ? 'text-yellow-400' : 'text-green-400'}
            />
            <StatCard label="Total Vendors" value={stats.total_vendors} />
          </div>

          {/* Coverage bar */}
          <div className="bg-sentry-card border border-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400 font-medium">Score Extraction Coverage</span>
              <span className="text-sm text-white font-bold">{coveragePct}%</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-wmt-blue to-green-500 rounded-full transition-all duration-700"
                style={{ width: progressWidth }}
                role="progressbar"
                aria-valuenow={coveragePct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {/* Decision band breakdown */}
            {Object.keys(stats.decision_band_counts).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(stats.decision_band_counts).map(([band, count]) => (
                  <span key={band} className="flex items-center gap-1.5">
                    <BandBadge band={band} />
                    <span className="text-slate-400 text-xs">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Vendor Directory Sync */}
      <div className="bg-sentry-card border border-slate-700 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Vendor Directory Sync (Canonical Library)</p>
            <p className="text-xs text-slate-400">
              Operational source: Vendor Assessments/00_System/vendor_assessment_vendor_profiles.csv
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleVendorSyncPreview}
              disabled={syncRunning || syncApplying}
              className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold"
            >
              {syncRunning ? 'Checking…' : 'Preview Sync'}
            </button>
            <button
              onClick={handleVendorSyncApply}
              disabled={syncApplying || syncRunning}
              className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 text-xs font-semibold"
            >
              {syncApplying ? 'Applying…' : 'Apply Sync'}
            </button>
          </div>
        </div>

        {syncError && <p className="text-xs text-red-400">{syncError}</p>}

        {syncPreview && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <p className="text-slate-300">DB vendors: <span className="font-bold text-white">{syncPreview.db_vendors_total}</span></p>
              <p className="text-slate-300">Canonical keys: <span className="font-bold text-white">{syncPreview.canonical_vendor_keys}</span></p>
              <p className="text-slate-300">Out of sync: <span className="font-bold text-yellow-300">{syncPreview.vendors_out_of_sync}</span></p>
              <p className="text-slate-300">Deleted: <span className="font-bold text-red-300">{syncPreview.deleted_vendors}</span></p>
            </div>

            {syncPreview.backup_path && (
              <p className="text-[11px] text-slate-500 break-all">Backup: {syncPreview.backup_path}</p>
            )}

            {syncPreview.sample_removals.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-400 mb-1">Sample removals</p>
                <div className="max-h-24 overflow-y-auto text-[11px] text-slate-300 space-y-0.5">
                  {syncPreview.sample_removals.map((name, idx) => (
                    <p key={`${name}-${idx}`}>• {name}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search filename or vendor..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5
                     text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wmt-blue text-sm"
        />

        <select
          value={scoredFilter}
          onChange={e => { setScoredFilter(e.target.value as '' | 'yes' | 'no'); setPage(1); }}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white
                     focus:outline-none focus:ring-2 focus:ring-wmt-blue"
          aria-label="Filter by score status"
        >
          <option value="">All VARs</option>
          <option value="yes">Scored only</option>
          <option value="no">Unscored only</option>
        </select>

        <button
          onClick={handleBatchExtract}
          disabled={batchRunning}
          className="flex items-center gap-2 px-4 py-2.5 bg-wmt-blue hover:bg-blue-700 disabled:opacity-50
                     text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {batchRunning ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          {batchRunning ? 'Extracting...' : 'Batch Extract (50)'}
        </button>
      </div>

      {/* VAR table */}
      <div className="bg-sentry-card border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--s-text-dim)' }}>Filename</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--s-text-dim)' }}>Vendor</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--s-text-dim)' }}>Score</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--s-text-dim)' }}>Band</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--s-text-dim)' }}>Method</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--s-text-dim)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {varList?.vars.map(v => (
                <tr
                  key={v.id}
                  className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-white text-xs font-mono truncate" title={v.filename}>
                      {v.filename}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">{v.report_date || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-300 text-sm truncate max-w-[180px]" title={v.company_name}>
                      {v.company_name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <ScorePill score={v.overall_score} />
                  </td>
                  <td className="px-4 py-3">
                    <BandBadge band={v.decision_band} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-500 text-xs font-mono">{v.match_method || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {/* Link button */}
                      <button
                        onClick={() => setLinkTarget(v)}
                        title="Re-link to vendor"
                        className="p-1.5 text-slate-400 hover:text-wmt-blue transition-colors rounded"
                        aria-label="Re-link VAR to vendor"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>

                      {/* Extract scores button */}
                      <button
                        onClick={() => handleExtractOne(v.id)}
                        disabled={extracting.has(v.id) || !v.item_id}
                        title={!v.item_id ? 'No SharePoint item_id' : v.has_scores ? 'Re-extract scores' : 'Extract scores'}
                        className={`p-1.5 rounded transition-colors ${
                          !v.item_id
                            ? 'text-slate-700 cursor-not-allowed'
                            : v.has_scores
                              ? 'text-green-500 hover:text-green-400'
                              : 'text-yellow-400 hover:text-yellow-300'
                        }`}
                        aria-label="Extract VAR scores"
                      >
                        {extracting.has(v.id) ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {varList && varList.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
            <p className="text-slate-400 text-sm">
              {varList.total} VARs · {varList.scored} scored · {varList.unscored} remaining
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-sm disabled:opacity-40
                           hover:bg-slate-600 transition-colors"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-slate-400 text-sm">
                {page} / {varList.total_pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(varList.total_pages, p + 1))}
                disabled={page >= varList.total_pages}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-sm disabled:opacity-40
                           hover:bg-slate-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link modal */}
      {linkTarget && (
        <LinkModal
          varRow={linkTarget}
          onClose={() => setLinkTarget(null)}
          onLinked={handleLinked}
        />
      )}

      {/* Batch result drawer */}
      {batchResult && (
        <BatchResultDrawer
          res={batchResult}
          onClose={() => setBatchResult(null)}
        />
      )}
        </>
      )}

      {/* Competitor Intel Tab */}
      {activeTab === 'competitor' && <CompetitorIntelAdmin />}
    </div>
  );
};