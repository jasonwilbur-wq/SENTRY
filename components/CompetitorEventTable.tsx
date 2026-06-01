/**
 * CompetitorEventTable — filterable, paginated event feed.
 * Fetches from /api/competitors/events with HTMX-style filter params.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchCompetitorEvents, fetchCompetitorCategories,
  CompetitorEvent, CompetitorEventsResponse,
} from '../services/api';

const CAT_STYLE: Record<string, string> = {
  Cyber:          'bg-red-500/20 text-red-400 border border-red-500/40',
  'ORC/Theft':    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  Recall:         'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  Legal:          'bg-slate-500/20 text-slate-300 border border-slate-500/40',
  Strategic:      'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  Operational:    'bg-green-500/20 text-green-300 border border-green-500/40',
  Compliance:     'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  Fraud:          'bg-red-600/20 text-red-300 border border-red-600/40',
  Technology:     'bg-blue-600/20 text-blue-200 border border-blue-600/40',
};
const MONTHS = ['Sep 2025','Oct 2025','Nov 2025','Dec 2025','Jan 2026','Feb 2026'];

interface Props {
  lockedCompetitor?: string;   // lock filter to one competitor
  competitors?: string[];      // for dropdown
}

export const CompetitorEventTable: React.FC<Props> = ({
  lockedCompetitor, competitors = [],
}) => {
  const [events, setEvents]       = useState<CompetitorEvent[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setPages]    = useState(1);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<number | null>(null);

  // Filters
  const [competitor, setCompetitor] = useState(lockedCompetitor ?? '');
  const [category, setCategory]     = useState('');
  const [month, setMonth]           = useState('');
  const [search, setSearch]         = useState('');
  const [cats, setCats]             = useState<string[]>([]);

  // Debounce search
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load categories
  useEffect(() => {
    fetchCompetitorCategories().then(r => setCats(r.categories)).catch(() => {});
  }, []);

  // Fetch events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const r: CompetitorEventsResponse = await fetchCompetitorEvents({
        competitor: competitor || undefined,
        category:   category  || undefined,
        month:      month     || undefined,
        q:          debouncedQ || undefined,
        page,
        page_size: 25,
      });
      setEvents(r.events);
      setTotal(r.total);
      setPages(r.total_pages);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [competitor, category, month, debouncedQ, page]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [competitor, category, month, debouncedQ]);

  return (
    <div className="space-y-4">
      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search events…"
          className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-lg
                     px-3 py-2 text-sm text-white placeholder-slate-500
                     focus:border-wmt-blue focus:outline-none focus:ring-2 focus:ring-wmt-blue/30"
        />
        {!lockedCompetitor && (
          <select
            value={competitor}
            onChange={e => setCompetitor(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm
                       text-white focus:border-wmt-blue focus:outline-none"
          >
            <option value="">All Competitors</option>
            {competitors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm
                     text-white focus:border-wmt-blue focus:outline-none"
        >
          <option value="">All Categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm
                     text-white focus:border-wmt-blue focus:outline-none"
        >
          <option value="">All Months</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* ── Count + pagination ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing <span className="text-slate-300 font-semibold">{events.length}</span> of{' '}
          <span className="text-slate-300 font-semibold">{total}</span> events
        </p>
        {totalPages > 1 && (
          <div className="flex gap-1 items-center">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded-md text-xs font-semibold border border-white/10
                         bg-white/5 text-slate-400 hover:bg-wmt-blue hover:text-white
                         disabled:opacity-30 transition"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500">Page {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded-md text-xs font-semibold border border-white/10
                         bg-white/5 text-slate-400 hover:bg-wmt-blue hover:text-white
                         disabled:opacity-30 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm animate-pulse-slow">
          Loading events…
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-slate-400 text-sm">No events match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/8">
                {['Date','Competitor','Event','Category','Location','Source'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] text-slate-500 font-bold
                                         uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <React.Fragment key={ev.id}>
                  <tr
                    onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                    className={`cursor-pointer transition hover:bg-wmt-blue/5 ${
                      expanded === ev.id ? 'bg-wmt-blue/8' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                      {(ev.event_date ?? '').slice(0, 10)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-white font-semibold">
                      {ev.competitor}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-300 max-w-[280px]">
                      {ev.event_title ?? '—'}
                      <span className="text-slate-600 ml-1">
                        ({ev.event_type ?? ''})
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px]
                                       font-bold ${CAT_STYLE[ev.category] ?? 'bg-slate-500/20 text-slate-400'}`}>
                        {ev.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[140px] truncate">
                      {(ev.location ?? '—').slice(0, 40)}
                    </td>
                    <td className="px-3 py-2.5">
                      {ev.source_link?.startsWith('http') ? (
                        <a
                          href={ev.source_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-blue-400 hover:text-blue-300 text-xs underline"
                        >View ↗</a>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                  {/* Expandable detail row */}
                  {expanded === ev.id && (
                    <tr>
                      <td colSpan={6} className="px-3 pb-3">
                        <div className="bg-black/30 rounded-lg p-4 text-xs text-slate-400
                                        leading-relaxed space-y-2 animate-fadeIn">
                          {ev.detailed_description && (
                            <p><strong className="text-slate-300">Description:</strong> {ev.detailed_description}</p>
                          )}
                          {ev.security_implication && (
                            <p><strong className="text-slate-300">Security Implication:</strong> {ev.security_implication}</p>
                          )}
                          {ev.analyst_notes && (
                            <p><strong className="text-slate-300">Analyst Notes:</strong> {ev.analyst_notes}</p>
                          )}
                          <p className="text-slate-600">Source month: {ev.source_month}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};