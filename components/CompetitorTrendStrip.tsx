/**
 * CompetitorTrendStrip - "what's the direction" layer for Competitor Intel.
 *
 * Consumes raw events through the tested competitorInsight helper and shows
 * trend direction per competitor (up/down/flat + %), so the page leads with
 * "is this getting worse for us?" instead of a flat event count.
 */
import React, { useMemo } from 'react';
import { competitorTrends, type InsightEvent } from '../utils/competitorInsight';

interface Props {
  events: InsightEvent[];
  limit?: number;
}

const DIR_STYLE: Record<string, { glyph: string; color: string; label: string }> = {
  up:   { glyph: '▲', color: '#ea1100', label: 'rising' },
  down: { glyph: '▼', color: '#2a8703', label: 'cooling' },
  flat: { glyph: '=', color: '#7893b8', label: 'steady' },
};

export function CompetitorTrendStrip({ events, limit = 6 }: Props) {
  const trends = useMemo(() => competitorTrends(events).slice(0, limit), [events, limit]);

  if (trends.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto mb-8">
      <h2 className="text-2xl font-bold mb-1">📈 Trend Direction</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--s-text-dim)' }}>
        Event momentum per competitor — recent vs. prior half of the tracked window.
        Rising volume is the signal to watch, not the raw total.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {trends.map((t) => {
          const d = DIR_STYLE[t.direction];
          return (
            <div
              key={t.competitor}
              className="rounded-lg border p-3"
              style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}
            >
              <p className="text-xs font-bold truncate" style={{ color: 'var(--s-text)' }} title={t.competitor}>
                {t.competitor}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-black" style={{ color: d.color }} aria-hidden>{d.glyph}</span>
                <span className="text-lg font-black" style={{ color: 'var(--s-text)' }}>{t.total}</span>
                <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>events</span>
              </div>
              <p className="text-[11px] font-semibold" style={{ color: d.color }}>
                {d.label}{t.changePct !== null ? ` ${t.changePct >= 0 ? '+' : ''}${t.changePct}%` : ''}
              </p>
              {t.topType && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--s-text-dim)' }}>
                  mostly {t.topType}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CompetitorTrendStrip;
