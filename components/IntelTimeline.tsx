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
  source_rating: string | null;
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

interface Filters {
  enabled: boolean;
  sources: string[];
  entity_types: string[];
  classifications: string[];
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

// Classification → badge color (cp_walmart_colors palette)
const CLASS_STYLE: Record<string, React.CSSProperties> = {
  FACT:       { background: 'rgba(42,135,3,0.16)',  color: '#2a8703', border: '1px solid rgba(42,135,3,0.4)' },
  ALLEGATION: { background: 'rgba(153,82,19,0.16)',  color: '#995213', border: '1px solid rgba(153,82,19,0.4)' },
  INFERENCE:  { background: 'rgba(0,83,226,0.16)',   color: '#0053e2', border: '1px solid rgba(0,83,226,0.4)' },
  UNKNOWN:    { background: 'var(--s-hover-over)',   color: 'var(--s-text-dim)', border: '1px solid var(--s-border)' },
};

const card: React.CSSProperties = { background: 'var(--s-card)', border: '1px solid var(--s-border)', borderRadius: 14 };
const selectStyle: React.CSSProperties = {
  background: 'var(--s-input-bg)', color: 'var(--s-text)', border: '1px solid var(--s-border-mid)',
  borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600,
};

const Badge: React.FC<{ text: string; style: React.CSSProperties }> = ({ text, style }) => (
  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={style}>{text}</span>
);

// ── Component ────────────────────────────────────────────────────────────────
const IntelTimeline: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);

  const [source, setSource] = useState('');
  const [entityType, setEntityType] = useState('');
  const [classification, setClassification] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { const t = window.setTimeout(() => setDebounced(query.trim()), 350); return () => window.clearTimeout(t); }, [query]);
  useEffect(() => { setPage(1); }, [source, entityType, classification, dateFrom, dateTo, debounced]);

  useEffect(() => { fetch('/api/intel-timeline/stats').then(r => r.json()).then(setStats).catch(() => setStats(null)); }, []);
  useEffect(() => { fetch('/api/intel-timeline/filters').then(r => r.json()).then(setFilters).catch(() => setFilters(null)); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: '25' });
    if (source) params.set('source_system', source);
    if (entityType) params.set('entity_type', entityType);
    if (classification) params.set('classification', classification);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (debounced) params.set('q', debounced);
    fetch(`/api/intel-timeline?${params.toString()}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: ListResponse) => { if (!cancelled) { setData(d); setError(''); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, entityType, classification, dateFrom, dateTo, debounced, page]);

  const sources = useMemo(() => Object.keys(stats?.by_source ?? {}), [stats]);
  const resetFilters = () => { setSource(''); setEntityType(''); setClassification(''); setDateFrom(''); setDateTo(''); setQuery(''); };
  const tagList = (t: string | null) => (t ? t.split(/[,;|]/).map(s => s.trim()).filter(Boolean).slice(0, 4) : []);

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div style={card} className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--s-text-dim)' }}>Total Signals</p>
          <p className="text-2xl font-black mt-1" style={{ color: 'var(--s-text)' }}>{stats?.total ?? '—'}</p>
        </div>
        {sources.map(s => (
          <div key={s} style={card} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--s-text-dim)' }}>{SOURCE_LABEL[s] ?? s}</p>
            <p className="text-2xl font-black mt-1" style={{ color: 'var(--s-text)' }}>{stats?.by_source[s] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Source chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setSource('')} className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={source === '' ? { background: '#0053E2', color: '#fff' } : { background: 'var(--s-input-bg)', color: 'var(--s-text-muted)', border: '1px solid var(--s-border-mid)' }}>All Sources</button>
        {sources.map(s => (
          <button key={s} onClick={() => setSource(s)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={source === s ? { background: '#0053E2', color: '#fff' } : { background: 'var(--s-input-bg)', color: 'var(--s-text-muted)', border: '1px solid var(--s-border-mid)' }}>{SOURCE_LABEL[s] ?? s}</button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-faint)' }}>Classification</span>
          <select value={classification} onChange={e => setClassification(e.target.value)} style={selectStyle} aria-label="Filter by classification">
            <option value="">Any</option>
            {(filters?.classifications ?? []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-faint)' }}>Entity Type</span>
          <select value={entityType} onChange={e => setEntityType(e.target.value)} style={selectStyle} aria-label="Filter by entity type">
            <option value="">Any</option>
            {(filters?.entity_types ?? []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-faint)' }}>From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={selectStyle} aria-label="Date from" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-faint)' }}>To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={selectStyle} aria-label="Date to" />
        </label>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search signals…" aria-label="Search signals"
          className="sentry-input flex-1 min-w-[180px] text-sm" />
        <button onClick={resetFilters} className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: 'var(--s-input-bg)', color: 'var(--s-text-muted)', border: '1px solid var(--s-border-mid)' }}>Reset</button>
      </div>

      {/* Results */}
      <div style={card} className="overflow-hidden">
        {error && <div className="p-4 text-sm" style={{ color: '#ea1100' }}>Could not load timeline: {error}</div>}
        {loading && !data ? (
          <div className="p-8 text-center text-xs uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--s-text)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                  {['Date', 'Source', 'Class', 'Signal', 'Entity', 'Conf.'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.signals ?? []).map(sig => {
                  const cls = (sig.classification || 'UNKNOWN').toUpperCase();
                  const tags = tagList(sig.tags);
                  return (
                    <tr key={sig.id} style={{ borderBottom: '1px solid var(--s-border-light)' }}>
                      <td className="px-4 py-2 whitespace-nowrap text-xs align-top" style={{ color: 'var(--s-text-dim)' }}>{sig.signal_date || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap align-top">
                        <Badge text={SOURCE_LABEL[sig.source_system] ?? sig.source_system}
                          style={{ background: 'var(--s-hover-over)', color: 'var(--s-text-muted)', border: '1px solid var(--s-border)' }} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap align-top">
                        <Badge text={cls} style={CLASS_STYLE[cls] ?? CLASS_STYLE.UNKNOWN} />
                        {sig.source_rating && (
                          <div className="mt-1 text-[10px] font-mono" style={{ color: 'var(--s-text-faint)' }} title="Source reliability rating">{sig.source_rating}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 max-w-[560px] align-top">
                        {sig.source_url ? (
                          <a href={sig.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--s-text)' }}>{sig.title || '(untitled)'}</a>
                        ) : (<span>{sig.title || '(untitled)'}</span>)}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map((t, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                                style={{ background: 'rgba(0,83,226,0.10)', color: '#0053e2', border: '1px solid rgba(0,83,226,0.25)' }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs align-top" style={{ color: 'var(--s-text-dim)' }}>{sig.vendor_company_name || sig.entity_name || sig.entity_type || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs align-top" style={{ color: 'var(--s-text-dim)' }}>{sig.confidence || '—'}</td>
                    </tr>
                  );
                })}
                {(data?.signals?.length ?? 0) === 0 && !loading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-xs uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>No signals match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Page {data.page} of {data.total_pages} · {data.total} signals</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: 'var(--s-input-bg)', color: 'var(--s-text)', border: '1px solid var(--s-border-mid)' }}>Prev</button>
            <button disabled={page >= data.total_pages} onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: 'var(--s-input-bg)', color: 'var(--s-text)', border: '1px solid var(--s-border-mid)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelTimeline;
