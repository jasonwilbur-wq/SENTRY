import React from 'react';
import { ExecutivePortfolio } from '../../services/executiveIntelApi';
import { Badge, Card } from './ui';
import { buildSwot, findCollectionGaps, Swot } from './insights';

// ---------------------------------------------------------------------------
// Analyst-assist panels: heuristic SWOT + collection-gap flags.
// Both are explicitly labeled AI-draft / heuristic — they orient the analyst,
// they do not replace analyst judgement or CSO-ready conclusions.
// ---------------------------------------------------------------------------

const QUADRANTS: Array<{ key: keyof Swot; label: string; tone: 'green' | 'red' | 'blue' | 'yellow' }> = [
  { key: 'strengths', label: 'Strengths', tone: 'green' },
  { key: 'weaknesses', label: 'Weaknesses', tone: 'yellow' },
  { key: 'opportunities', label: 'Opportunities', tone: 'blue' },
  { key: 'threats', label: 'Threats', tone: 'red' },
];

export function SwotPanel({ signals }: { signals: ExecutivePortfolio['signals'] }) {
  const swot = buildSwot(signals);
  const total = QUADRANTS.reduce((n, q) => n + swot[q.key].length, 0);
  if (total === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>SWOT (heuristic)</h3>
        <Badge tone="yellow" title="Auto-generated from verified signals; analyst review required">AI draft</Badge>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUADRANTS.map(q => (
          <div key={q.key} className="rounded-xl border p-3" style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}>
            <Badge tone={q.tone}>{q.label}</Badge>
            {swot[q.key].length === 0 ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--s-text-dim)' }}>None detected.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {swot[q.key].map(s => (
                  <li key={s.signal_id} className="text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
                    <span aria-hidden="true" style={{ color: 'var(--s-text-dim)' }}>• </span>{s.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--s-text-dim)' }}>
        Heuristic bucketing of verified signals. Not an analyst-approved conclusion — confirm before any CSO use.
      </p>
    </Card>
  );
}

export function CollectionGaps({ signals, focusTopics }: { signals: ExecutivePortfolio['signals']; focusTopics?: string[] }) {
  const gaps = findCollectionGaps(signals, focusTopics ?? []);
  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Collection gaps</h3>
      <ul className="mt-3 space-y-2">
        {gaps.map((gap, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm leading-5" style={{ color: 'var(--s-text-dim)' }}>
            <Badge tone={gap.level === 'warn' ? 'red' : 'gray'}>{gap.level === 'warn' ? 'gap' : 'note'}</Badge>
            <span>{gap.message}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
