import React from 'react';
import { ExecutiveSignalRecord } from '../../services/executiveIntelApi';
import { Badge, Card } from './ui';
import { ageLabel } from './signalLogic';
import { buildMoveRows, computeMomentum, moveTone, prettyLabel, trendArrow, trendTone } from './analytics';

// ---------------------------------------------------------------------------
// Momentum strip + Move/counter-move table for the selected executive.
// Momentum answers "is this exec heating up?"; the move table answers
// "what did they do and what should Walmart watch?".
// ---------------------------------------------------------------------------

export function MomentumPanel({ signals }: { signals: ExecutiveSignalRecord[] }) {
  const m = computeMomentum(signals);
  const arrow = trendArrow(m.trend);
  const tone = trendTone(m.trend);
  const lastActivity = m.mostRecentDays === null
    ? 'no dated signals'
    : ageLabel(new Date(Date.now() - m.mostRecentDays * 86_400_000).toISOString());
  const staleWatch = m.mostRecentDays !== null && m.mostRecentDays > 120;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Momentum</h3>
        <div className="flex items-center gap-2">
          {staleWatch && <Badge tone="yellow" title="No signals in the last 120 days">stale watch</Badge>}
          <Badge tone={tone}>{arrow} {m.trend}</Badge>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-black" style={{ color: 'var(--s-text)' }}>{m.last30}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--s-text-dim)' }}>Last 30d</div>
        </div>
        <div>
          <div className="text-2xl font-black" style={{ color: 'var(--s-text)' }}>{m.prev30}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--s-text-dim)' }}>Prev 30d</div>
        </div>
        <div>
          <div className="text-2xl font-black" style={{ color: 'var(--s-text)' }}>{m.last90}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--s-text-dim)' }}>Last 90d</div>
        </div>
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--s-text-dim)' }}>
        Most recent dated signal: {lastActivity}. Velocity compares the last 30 days vs the prior 30.
      </p>
    </Card>
  );
}

export function MoveTable({ signals }: { signals: ExecutiveSignalRecord[] }) {
  const rows = buildMoveRows(signals);
  if (rows.length === 0) return null;

  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Moves &amp; what to watch</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>
        Verified strategic moves (initiatives, decisions, partnerships, org changes), newest first.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map(({ signal, move, watch }) => (
          <div
            key={(signal._artifact_file || '') + '-' + signal.signal_id}
            className="rounded-xl border p-3"
            style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={moveTone(move)}>{move}</Badge>
              <Badge tone="gray">{prettyLabel(signal.category)}</Badge>
              <span className="ml-auto text-xs" style={{ color: 'var(--s-text-dim)' }}>{ageLabel(signal.event_date)}</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-5" style={{ color: 'var(--s-text)' }}>{signal.title}</p>
            <p className="mt-1.5 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
              <span className="font-black" style={{ color: '#0053E2' }}>Watch: </span>{watch}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
