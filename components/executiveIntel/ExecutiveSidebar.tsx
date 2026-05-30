import React, { useMemo, useState } from 'react';
import { ExecutivePortfolioSummary } from '../../services/executiveIntelApi';
import { Badge, ExecutiveAvatar } from './ui';
import { buildComparison } from './analytics';
import { groupByCompany, isArchived } from './profileLogic';

// ---------------------------------------------------------------------------
// Single master-list picker for the executive watchlist. Merges the old
// "Watchlist by company" + "Portfolio comparison" cards into one searchable,
// company-grouped sidebar with inline mini-stats. One picker, no redundancy.
// ---------------------------------------------------------------------------

export function ExecutiveSidebar({
  portfolios,
  selectedId,
  onSelect,
}: {
  portfolios: ExecutivePortfolioSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');

  // Pre-compute comparison stats once, keyed by profile_id for O(1) lookup.
  const statsById = useMemo(() => {
    const map = new Map<string, { signals: number; csoReady: number; verifiedPct: number }>();
    for (const row of buildComparison(portfolios, isArchived)) {
      map.set(row.profile_id, { signals: row.signals, csoReady: row.csoReady, verifiedPct: row.verifiedPct });
    }
    return map;
  }, [portfolios]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? portfolios.filter(p =>
          (p.full_name + ' ' + p.organization + ' ' + p.title).toLowerCase().includes(q))
      : portfolios;
    return groupByCompany(filtered);
  }, [portfolios, query]);

  const totalShown = groups.reduce((n, [, members]) => n + members.length, 0);

  return (
    <aside
      className="rounded-2xl border p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}
      aria-label="Executive watchlist"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Watchlist</h3>
        <span aria-live="polite"><Badge tone="gray">{totalShown}</Badge></span>
      </div>

      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search execs…"
        aria-label="Search executives"
        className="sentry-input mt-3 w-full text-sm"
      />

      <div className="mt-3 space-y-4">
        {groups.map(([org, members]) => (
          <div key={org}>
 <div className="px-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text-dim)' }}>{org}</div>
            <div className="mt-1.5 space-y-1.5">
              {members.map(item => {
                const archived = isArchived(item.status);
                const selected = item.profile_id === selectedId;
                const stats = statsById.get(item.profile_id);
              return (
                  <button
                    key={item.profile_id}
                    type="button"
                    onClick={() => onSelect(item.profile_id)}
                    className="flex w-full items-center gap-3 rounded-xl border p-2 text-left transition"
                    style={{
                 borderColor: selected ? '#0053E2' : 'var(--s-border-light)',
                      background: selected ? 'rgba(0,83,226,0.06)' : 'var(--s-input-bg)',
                      opacity: archived ? 0.65 : 1,
                    }}
                    aria-pressed={selected}
                  >
                    <ExecutiveAvatar name={item.full_name} photoUrl={item.photo_url} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold" style={{ color: 'var(--s-text)' }} title={item.full_name + ' · ' + item.title}>
                        {archived ? '\u26A0 ' : ''}{item.full_name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--s-text-dim)' }}>
                        <span>{stats?.signals ?? item.stats.signal_count} sig</span>
                        {(stats?.csoReady ?? 0) > 0 && <span style={{ color: '#2A8703' }}>{stats?.csoReady} ready</span>}
                        {stats && <span>{stats.verifiedPct}% valid</span>}
                      </div>
                    </div>
                  </button>
    );
              })}
            </div>
          </div>
        ))}
        {totalShown === 0 && (
          <p className="px-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>No execs match your search.</p>
        )}
      </div>
    </aside>
  );
}

export default ExecutiveSidebar;
