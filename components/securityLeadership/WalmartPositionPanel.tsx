import React from 'react';
import { Badge, Card } from '../executiveIntel/ui';
import { RECOMMENDED_ACTIONS, WALMART_POSITION } from './walmartPosition';

// ---------------------------------------------------------------------------
// Walmart self-positioning panel + recommended-actions matrix.
// Security-specific strategic content with no equivalent in the live
// (sustainability) Executive Intel data; preserved from the legacy view.
// ---------------------------------------------------------------------------

const HORIZON_COLOR: Record<string, string> = {
  red: '#EA1100',
  yellow: '#995213',
  green: '#2A8703',
};

export function WalmartPositionPanel() {
  const wm = WALMART_POSITION;
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>{wm.name}</h3>
            <p className="mt-1 text-sm font-bold" style={{ color: '#0053E2' }}>{wm.title}</p>
          </div>
          <Badge tone="blue">Incumbent</Badge>
        </div>

        <div className="mt-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text-dim)' }}>Your scope</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {wm.scope.map(item => (
              <span key={item} className="rounded-md px-2 py-0.5 text-xs" style={{ background: 'rgba(0,83,226,0.10)', color: '#0053E2' }}>{item}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: '#2A8703' }}>Competitive strengths</div>
            <ul className="mt-2 space-y-1.5">
              {wm.strengths.map(s => (
                <li key={s.label} className="text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
                  <strong style={{ color: 'var(--s-text)' }}>{s.label}</strong>: {s.detail}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: '#995213' }}>Gaps to close</div>
            <ul className="mt-2 space-y-1.5">
              {wm.gaps.map(g => (
                <li key={g.label} className="text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
                  <strong style={{ color: 'var(--s-text)' }}>{g.label}</strong>: {g.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold" style={{ color: '#0053E2' }}>Opportunity: {wm.opportunity}</p>
      </Card>

      <Card>
        <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Recommended actions for {wm.name}</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {RECOMMENDED_ACTIONS.map(col => (
            <div
              key={col.horizon}
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)', borderLeft: '4px solid ' + HORIZON_COLOR[col.tone] }}
            >
              <div className="text-xs font-black" style={{ color: HORIZON_COLOR[col.tone] }}>{col.horizon}</div>
              <ol className="mt-2 space-y-2 text-xs" style={{ color: 'var(--s-text-dim)' }}>
                {col.items.map(item => (
                  <li key={item.label}>
                    <strong style={{ color: 'var(--s-text)' }}>{item.label}:</strong> {item.detail}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default WalmartPositionPanel;
