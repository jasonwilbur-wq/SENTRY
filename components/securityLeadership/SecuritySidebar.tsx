import React, { useEffect, useMemo, useState } from 'react';
import type { ExecutiveProfile } from '../../data/csoProfiles';
import { Badge, ExecutiveAvatar } from '../executiveIntel/ui';
import { byThreatThenName, threatTone, topFinding } from './securityLogic';

// ---------------------------------------------------------------------------
// Master-list picker for the competitor Chief Security Officer watchlist.
// Searchable, sorted most-threatening first, with an inline top-finding hint.
// Mirrors the Executive Intel sidebar UX for a consistent feel.
// ---------------------------------------------------------------------------

export function SecuritySidebar({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: ExecutiveProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [threatFilter, setThreatFilter] = useState<'ALL' | ExecutiveProfile['threatLevel']>('ALL');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = profiles.filter(p => {
      const matchesQuery = q
        ? (p.name + ' ' + p.company + ' ' + p.title).toLowerCase().includes(q)
        : true;
      const matchesThreat = threatFilter === 'ALL' || p.threatLevel === threatFilter;
      return matchesQuery && matchesThreat;
    });
    return [...filtered].sort(byThreatThenName);
  }, [profiles, query, threatFilter]);

  useEffect(() => {
    if (shown.length > 0 && !shown.some(item => item.id === selectedId)) {
      onSelect(shown[0].id);
    }
  }, [shown, selectedId, onSelect]);

  return (
    <aside
      className="rounded-2xl border p-4 lg:sticky lg:top-4"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}
      aria-label="Competitor CSO watchlist"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Watchlist</h3>
        <span aria-live="polite"><Badge tone="gray">{shown.length}</Badge></span>
      </div>

      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search security leaders…"
        aria-label="Search competitor security leaders"
        className="sentry-input mt-3 w-full text-sm"
      />

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Filter watchlist by threat level">
        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map(level => {
          const selected = threatFilter === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => setThreatFilter(level)}
              className="rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition"
              style={{
                borderColor: selected ? '#0053E2' : 'var(--s-border-light)',
                background: selected ? 'rgba(0,83,226,0.16)' : 'var(--s-input-bg)',
                color: selected ? '#D9E3F0' : 'var(--s-text-dim)',
              }}
            >
              {level === 'ALL' ? 'All' : level.toLowerCase()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5 max-h-[45vh] overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
        {shown.map(item => {
          const selected = item.id === selectedId;
          const top = topFinding(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex w-full items-center gap-3 rounded-xl border p-2 text-left transition"
              style={{
                borderColor: selected ? '#0053E2' : 'var(--s-border-light)',
                background: selected ? 'rgba(0,83,226,0.06)' : 'var(--s-input-bg)',
              }}
              aria-pressed={selected}
            >
              <ExecutiveAvatar name={item.name} photoUrl={item.profileImage} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold" style={{ color: 'var(--s-text)' }} title={item.name + ' · ' + item.title}>
                    {item.name}
                  </span>
                  <Badge tone={threatTone(item.threatLevel)}>{item.threatLevel}</Badge>
                </div>
                <div className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--s-text-dim)' }} title={item.company}>
                  {item.company}
                </div>
                {top && (
                  <div className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--s-text-dim)' }} title={top.headline}>
                    {top.headline}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {shown.length === 0 && (
          <p className="px-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>No security leaders match your search.</p>
        )}
      </div>
    </aside>
  );
}

export default SecuritySidebar;
