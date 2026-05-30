import React, { useState } from 'react';
import { Badge, Card, StatCard } from './ui';

// ---------------------------------------------------------------------------
// Collapsible "command deck": program-level ESG overview + key findings.
// Collapsed by default so the selected-exec detail gets the spotlight;
// the analyst can expand it for the portfolio-wide context when needed.
// ---------------------------------------------------------------------------

export interface OverviewStats {
  active: number;
  archived: number;
  totalSignals: number;
  totalSources: number;
  totalCsoReady: number;
  totalInvalid: number;
}

export function OverviewDeck({ stats, keyFindings }: { stats: OverviewStats; keyFindings: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div>
          <Badge tone="blue">ESG / Sustainability benchmark</Badge>
          <h2 className="mt-2 text-lg font-black" style={{ color: 'var(--s-text)' }}>Competitor &amp; Supplier CSO Watchlist</h2>
        </div>
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]" style={{ color: 'var(--s-text-dim)' }}>
          {open ? 'Hide' : 'Program overview'}
          <span aria-hidden="true">{open ? '\u25b4' : '\u25be'}</span>
        </span>
      </button>

      {/* Compact always-visible summary line */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--s-text-dim)' }}>
        <span><strong style={{ color: 'var(--s-text)' }}>{stats.active}</strong> active</span>
        <span><strong style={{ color: 'var(--s-text)' }}>{stats.archived}</strong> archived</span>
        <span><strong style={{ color: 'var(--s-text)' }}>{stats.totalSignals}</strong> signals</span>
        <span><strong style={{ color: '#2A8703' }}>{stats.totalCsoReady}</strong> CSO-ready</span>
      </div>

      {open && (
        <div className="mt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard label="Active execs" value={stats.active} />
            <StatCard label="Archived/stale" value={stats.archived} />
            <StatCard label="Total signals" value={stats.totalSignals} />
            <StatCard label="Total sources" value={stats.totalSources} />
            <StatCard label="CSO-ready" value={stats.totalCsoReady} tone="green" />
            <StatCard label="Invalid signals" value={stats.totalInvalid} helper="Schema validation" />
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Key findings</h3>
            <ul className="mt-3 space-y-2">
              {keyFindings.map((finding, idx) => (
                <li key={idx} className="flex gap-2 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
                  <span aria-hidden="true" style={{ color: '#0053E2' }}>▸</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs" style={{ color: 'var(--s-text-dim)' }}>
              Review-only. No DB writes, scheduling, or publication. Signals require analyst approval before CSO distribution.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default OverviewDeck;
