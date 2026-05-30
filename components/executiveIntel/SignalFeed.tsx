import React, { useMemo, useState } from 'react';
import { ExecutiveSignalRecord } from '../../services/executiveIntelApi';
import { Badge, Card, MiniBar } from './ui';
import { SignalCard } from './SignalCard';
import { countBy, prettyLabel, sortByPriority } from './signalLogic';

// ---------------------------------------------------------------------------
// Filterable, priority-sortable signal feed with a category breakdown.
// Defaults to "smart" priority order (recency x confidence x relevance) so the
// analyst sees the most actionable items first instead of a raw dump.
// ---------------------------------------------------------------------------

type SortMode = 'priority' | 'newest' | 'oldest';

export function SignalFeed({ signals }: { signals: ExecutiveSignalRecord[] }) {
  const [category, setCategory] = useState('ALL');
  const [verification, setVerification] = useState('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('priority');

  const categories = useMemo(() => countBy(signals, s => s.category), [signals]);
  const verifications = useMemo(() => countBy(signals, s => s.verification_status), [signals]);
  const maxCat = categories[0]?.[1] ?? 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = signals.filter(s => {
      if (category !== 'ALL' && s.category !== category) return false;
      if (verification !== 'ALL' && s.verification_status !== verification) return false;
      if (q) {
        const hay = (s.title + ' ' + s.summary + ' ' + s.walmart_cso_relevance).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'priority') out = sortByPriority(out);
    else out = [...out].sort((a, b) => {
      const da = Date.parse(a.event_date || '') || 0;
      const db = Date.parse(b.event_date || '') || 0;
      return sort === 'newest' ? db - da : da - db;
    });
    return out;
  }, [signals, category, verification, query, sort]);

  if (signals.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>Signals</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--s-text-dim)' }}>No signals collected for this target yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>Signal feed</h3>
        <span aria-live="polite">
          <Badge tone="gray">{filtered.length} of {signals.length}</Badge>
        </span>
      </div>

      {/* Category breakdown */}
      <div className="mt-4 space-y-1.5">
        {categories.map(([cat, count]) => (
          <MiniBar key={cat} label={prettyLabel(cat)} count={count} max={maxCat} />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search signals…"
          aria-label="Search signals"
          className="sentry-input flex-1 min-w-[160px]"
        />
        <select className="sentry-input" value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="ALL">All categories</option>
          {categories.map(([cat, count]) => <option key={cat} value={cat}>{prettyLabel(cat)} ({count})</option>)}
        </select>
        <select className="sentry-input" value={verification} onChange={e => setVerification(e.target.value)} aria-label="Filter by verification">
          <option value="ALL">All verification</option>
          {verifications.map(([v, count]) => <option key={v} value={v}>{prettyLabel(v)} ({count})</option>)}
        </select>
        <select className="sentry-input" value={sort} onChange={e => setSort(e.target.value as SortMode)} aria-label="Sort signals">
          <option value="priority">Smart priority</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Feed */}
      <div className="mt-4 space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>No signals match the current filters.</p>
        )}
        {filtered.map(signal => (
          <SignalCard key={(signal._artifact_file || '') + '-' + signal.signal_id} signal={signal} />
        ))}
      </div>
    </Card>
  );
}

export default SignalFeed;
