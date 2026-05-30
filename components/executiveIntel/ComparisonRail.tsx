import React from 'react';
import { ExecutivePortfolioSummary } from '../../services/executiveIntelApi';
import { Badge, Card, MiniBar } from './ui';
import { buildComparison } from './analytics';
import { isArchived } from './profileLogic';

// ---------------------------------------------------------------------------
// Cross-portfolio comparison rail: "who's most active / most verified?".
// Lets an analyst scan the whole watchlist at once and jump to a target.
// ---------------------------------------------------------------------------

export function ComparisonRail({
  portfolios,
  selectedId,
  onSelect,
}: {
  portfolios: ExecutivePortfolioSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const rows = buildComparison(portfolios, isArchived);
  const maxSignals = rows.reduce((m, r) => Math.max(m, r.signals), 1);

  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Portfolio comparison</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>
        Signal volume, CSO-ready candidates, and verification rate across the watchlist. Click a row to open it.
      </p>
      <div className="mt-4 space-y-2">
        {rows.map(row => {
          const selected = row.profile_id === selectedId;
          return (
            <button
              key={row.profile_id}
              type="button"
              onClick={() => onSelect(row.profile_id)}
              className="w-full rounded-xl border p-3 text-left transition"
              style={{
                borderColor: selected ? '#0053E2' : 'var(--s-border-light)',
                background: selected ? 'rgba(0,83,226,0.06)' : 'var(--s-input-bg)',
                opacity: row.archived ? 0.65 : 1,
              }}
              aria-pressed={selected}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold" style={{ color: 'var(--s-text)' }}>
                  {row.archived ? '\u26A0 ' : ''}{row.name}
                </span>
                <span className="shrink-0 text-xs" style={{ color: 'var(--s-text-dim)' }}>{row.organization}</span>
              </div>
              <div className="mt-2">
                <MiniBar label="Signals" count={row.signals} max={maxSignals} tone="blue" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="green">{row.csoReady} CSO-ready</Badge>
                <Badge tone={row.verifiedPct >= 80 ? 'green' : row.verifiedPct >= 50 ? 'yellow' : 'red'}>
                  {row.verifiedPct}% valid
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export default ComparisonRail;
