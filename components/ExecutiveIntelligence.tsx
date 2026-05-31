import React, { useState } from 'react';
import { Badge, Card } from './executiveIntel/ui';
import { SecurityLeadership } from './securityLeadership/SecurityLeadership';
import ExecutiveIntelPortfolio from './ExecutiveIntelPortfolio';

// ---------------------------------------------------------------------------
// Unified Executive Intelligence page.
// One nav entry, two clearly-labelled lenses on competitor C-suite activity:
//   - Security: competitor CSO / CISO benchmarking (static OSINT dataset)
//   - Sustainability: Chief Sustainability Officer portfolios (live backend)
// Defaults to Security because that is the primary CSO-facing concern.
// ---------------------------------------------------------------------------

type Lens = 'security' | 'sustainability';

const LENSES: Array<{ id: Lens; label: string; blurb: string }> = [
  { id: 'security', label: 'Security Leadership', blurb: 'Competitor CSO / CISO posture, initiatives, and leadership transitions.' },
  { id: 'sustainability', label: 'Sustainability Leadership', blurb: 'Competitor Chief Sustainability Officer portfolios and ESG signals.' },
];

export function ExecutiveIntelligence() {
  const [lens, setLens] = useState<Lens>('security');
  const active = LENSES.find(l => l.id === lens) ?? LENSES[0];

  return (
    <div className="space-y-6">
      <Card>
        <Badge tone="blue">Competitive intelligence</Badge>
        <h2 className="mt-3 text-2xl font-black" style={{ color: 'var(--s-text)' }}>Executive Intelligence</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
          One view of competitor C-suite activity. Switch lenses to focus on the leadership
          function you care about. Security is shown first for CSO awareness.
        </p>

        {/* Segmented lens toggle */}
        <div
          role="tablist"
          aria-label="Executive intelligence lens"
          className="mt-4 inline-flex rounded-xl border p-1"
          style={{ borderColor: 'var(--s-border-mid)', background: 'var(--s-input-bg)' }}
        >
          {LENSES.map(item => {
            const selected = item.id === lens;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setLens(item.id)}
                className="rounded-lg px-4 py-2 text-sm font-bold transition"
                style={{
                  background: selected ? '#0053E2' : 'transparent',
                  color: selected ? '#ffffff' : 'var(--s-text-dim)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--s-text-dim)' }}>{active.blurb}</p>
      </Card>

      {/* Active lens body */}
      {lens === 'security' ? <SecurityLeadership embedded /> : <ExecutiveIntelPortfolio />}
    </div>
  );
}

export default ExecutiveIntelligence;
