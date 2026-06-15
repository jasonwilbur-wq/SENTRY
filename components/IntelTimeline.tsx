import React, { useEffect, useMemo, useState } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────
interface Signal {
  id: string;
  source_system: string;
  source_ref_id: string | null;
  signal_date: string | null;
  title: string | null;
  summary: string | null;
  entity_type: string | null;
  entity_name: string | null;
  matched_vendor_id: string | null;
  vendor_company_name?: string | null;
  source_url: string | null;
  classification: string | null;
  confidence: string | null;
  tags: string | null;
}

interface Stats {
  enabled: boolean;
  total: number;
  by_source: Record<string, number>;
  by_entity_type: Record<string, number>;
  monthly_trend: { month: string; count: number }[];
}

interface ListResponse {
  enabled: boolean;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  signals: Signal[];
}

const SOURCE_LABEL: Record<string, string> = {
  competitor_events: 'Competitor',
  incidents: 'Incident',
  changedetection: 'Web Change',
  manual: 'Manual',
};

const card: React.CSSProperties = {
  background: 'var(--s-card)',
  border: '1px solid var(--s-border)',
  borderRadius: 14,
};

// ── Component ────────────────────────────────────────────────────────────────
const IntelTimeline: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [source, setSource] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [debounced, setDebounced] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Debounce search input
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [source, debounced]);

  useEffect(() => {
    fetch('/api/intel-timeline/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: '25' });
    if (source) params.set('source_system', source);
    if (debounced) params.set('q', debounced);
    fetch(`/api/intel-timeline?${params.toString()}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ListResponse) => { if (!cancelled) { setData(d); setError(''); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, debounced, page]);

  const sources = useMemo(
    () => Object.keys(stats?.by_source ?? {}),
    [stats],
  );

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div style={card} className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--s-text-dim)' }}>
            Total Signals
          </p>
          <p className="text-2xl font-black mt-1" style={{ color: 'var(--s-text)' }}>
            {stats?.total ?? '—'}
          </p>
        </div>
        {sources.map(s => (
          <div key={s} style={card} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--s-text-dim)' }}>
              {SOURCE_LABEL[s] ?? s}
            </p>
            <p className="text-2xl font-black mt-1" style={{ color: 'var(--s-text)' }}>
              {stats?.by_source[s] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSource('')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={source === ''
            ? { background: '#0053E2', color: '#fff' }
            : { background: 'var(--s-input-bg)', color: 'var(--s-text-muted)', border: '1px solid var(--s-border-mid)' }}
        >
          All
        </button>
        {sources.map(s => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={source === s
              ? { background: '#0053E2', color: '#fff' }
              : { background: 'var(--s-input-bg)', color: 'var(--s-text-muted)', border: '1px solid var(--s-border-mid)' }}
          >
            {SOURCE_LABEL[s] ?? s}
          </button>
        ))}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search signals…"
          aria-label="Search signals"
          className="sentry-input flex-1 min-w-[200px] text-sm"
        />
      </div>

      {/* Results */}
      <div style={card} className="overflow-hidden">
        {error && (
          <div className="p-4 text-sm" style={{ color: '#ea1100' }}>
            Could not load timeline: {error}
          </div>
        )}
        {loading && !data ? (
          <div className="p-8 text-center text-xs uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
            Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--s-text)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>Date</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>Source</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>Signal</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>Entity</th>
                </tr>
              </thead>
              <tbody>
                {(data?.signals ?? []).map(sig => (
                  <tr key={sig.id} style={{ borderBottom: '1px solid var(--s-border-light)' }}>
                    <td className="px-4 py-2 whitespace-nowrap text-xs" style={{ color: 'var(--s-text-dim)' }}>
                      {sig.signal_date || '—'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: 'var(--s-hover-over)', color: 'var(--s-text-muted)', border: '1px solid var(--s-border)' }}>
                        {SOURCE_LABEL[sig.source_system] ?? sig.source_system}
                      </span>
                    </td>
                    <td className="px-4 py-2 max-w-[640px]">
                      {sig.source_url ? (
                        <a href={sig.source_url} target="_blank" rel="noopener noreferrer"
                          className="hover:underline" style={{ color: 'var(--s-text)' }}>
                          {sig.title || '(untitled)'}
                        </a>
                      ) : (
                        <span>{sig.title || '(untitled)'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs" style={{ color: 'var(--s-text-dim)' }}>
                      {sig.vendor_company_name || sig.entity_name || sig.entity_type || '—'}
                    </td>
                  </tr>
                ))}
                {(data?.signals?.length ?? 0) === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
                      No signals match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--s-text-dim)' }}>
            Page {data.page} of {data.total_pages} · {data.total} signals
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: 'var(--s-input-bg)', color: 'var(--s-text)', border: '1px solid var(--s-border-mid)' }}
            >
              Prev
            </button>
            <button
              disabled={page >= data.total_pages}
              onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: 'var(--s-input-bg)', color: 'var(--s-text)', border: '1px solid var(--s-border-mid)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelTimeline;
