import React, { useEffect, useRef, useState } from 'react';
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
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
  }, [lens]);

  return (
    <div ref={topRef} className="space-y-6">
      <Card className="overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{ background: 'radial-gradient(circle at 10% 0%, rgba(0,83,226,0.24), transparent 34%), radial-gradient(circle at 92% 12%, rgba(255,194,32,0.14), transparent 26%)' }}
        />
        <div className="relative grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5 items-start">
          <div>
            <Badge tone="blue">Executive briefing workspace</Badge>
            <h2 className="mt-3 text-3xl font-black" style={{ color: 'var(--s-text)' }}>Executive Intelligence</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
              What changed in competitor executive posture, why Walmart should care,
              and what should be reviewed for CSO awareness. Choose a lens, then start with the brief queue.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--s-text-dim)' }}>
              <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}>Signals → implications</span>
              <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}>Dossiers → evidence</span>
              <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}>Review-only until analyst approved</span>
            </div>
          </div>

          <div>
            <div
              role="tablist"
              aria-label="Executive intelligence lens"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
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
                    className="rounded-2xl border p-4 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2"
                    style={{
                      borderColor: selected ? '#0053E2' : 'var(--s-border-light)',
                      background: selected ? 'rgba(0,83,226,0.14)' : 'var(--s-input-bg)',
                    }}
                  >
                    <div className="text-sm font-black" style={{ color: selected ? '#D9E3F0' : 'var(--s-text)' }}>{item.label}</div>
                    <p className="mt-1 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{item.blurb}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs" style={{ color: 'var(--s-text-dim)' }}>
              Current lens: <strong style={{ color: 'var(--s-text)' }}>{active.label}</strong> — {active.blurb}
            </p>
          </div>
        </div>
      </Card>

      {/* Active lens body */}
      {lens === 'security' ? <SecurityLeadership embedded /> : <ExecutiveIntelPortfolio />}
    </div>
  );
}

export default ExecutiveIntelligence;
