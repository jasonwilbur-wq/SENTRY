import { describe, it, expect } from 'vitest';
import {
  eventSeverity,
  eventSoWhat,
  interpretEvent,
  competitorTrends,
  type InsightEvent,
} from './competitorInsight';

function ev(partial: Partial<InsightEvent>): InsightEvent {
  return {
    id: 1,
    competitor: 'Amazon',
    event_date: '2026-02-01',
    event_title: 'Test',
    event_type: 'Cyber',
    ...partial,
  };
}

describe('eventSeverity', () => {
  it('maps CSO priority tier to Critical', () => {
    expect(eventSeverity(ev({ priority_tier: 'CSO' }))).toBe('Critical');
  });
  it('maps leadership tier to High', () => {
    expect(eventSeverity(ev({ priority_tier: 'Leadership' }))).toBe('High');
  });
  it('falls back to relevance score when no tier', () => {
    expect(eventSeverity(ev({ walmart_relevance_score: 9 }))).toBe('Critical');
    expect(eventSeverity(ev({ walmart_relevance_score: 6 }))).toBe('High');
    expect(eventSeverity(ev({ walmart_relevance_score: 1 }))).toBe('Low');
  });
  it('defaults to Medium with no signals', () => {
    expect(eventSeverity(ev({}))).toBe('Medium');
  });
});

describe('eventSoWhat', () => {
  it('prefers why_walmart_cares', () => {
    const r = eventSoWhat(ev({ why_walmart_cares: 'Direct threat to checkout.' }));
    expect(r.text).toBe('Direct threat to checkout.');
    expect(r.fromAnalyst).toBe(true);
  });
  it('falls back to security_implication', () => {
    const r = eventSoWhat(ev({ why_walmart_cares: '', security_implication: 'Supply chain exposure.' }));
    expect(r.text).toBe('Supply chain exposure.');
    expect(r.fromAnalyst).toBe(true);
  });
  it('generates a generic prompt when nothing provided', () => {
    const r = eventSoWhat(ev({ event_type: 'Fraud' }));
    expect(r.fromAnalyst).toBe(false);
    expect(r.text).toContain('Amazon');
    expect(r.text).toContain('fraud');
  });
});

describe('interpretEvent', () => {
  it('combines severity + soWhat', () => {
    const insight = interpretEvent(ev({ priority_tier: 'CSO', why_walmart_cares: 'Big deal.' }));
    expect(insight.severity).toBe('Critical');
    expect(insight.soWhat).toBe('Big deal.');
    expect(insight.hasAnalystTake).toBe(true);
  });
});

describe('competitorTrends', () => {
  it('detects an upward trend', () => {
    const events = [
      ev({ competitor: 'Target', event_date: '2026-01-01' }),
      ev({ competitor: 'Target', event_date: '2026-03-01' }),
      ev({ competitor: 'Target', event_date: '2026-03-15' }),
    ];
    const trends = competitorTrends(events);
    const t = trends.find((x) => x.competitor === 'Target')!;
    expect(t.total).toBe(3);
    expect(t.direction).toBe('up');
  });

  it('handles bad/missing dates without throwing', () => {
    const events = [
      ev({ competitor: 'Costco', event_date: null }),
      ev({ competitor: 'Costco', event_date: 'not-a-date' }),
    ];
    expect(() => competitorTrends(events)).not.toThrow();
    const t = competitorTrends(events).find((x) => x.competitor === 'Costco')!;
    expect(t.total).toBe(2);
  });

  it('sorts competitors by total volume desc', () => {
    const events = [
      ev({ competitor: 'A', event_date: '2026-01-01' }),
      ev({ competitor: 'B', event_date: '2026-01-01' }),
      ev({ competitor: 'B', event_date: '2026-02-01' }),
    ];
    const trends = competitorTrends(events);
    expect(trends[0].competitor).toBe('B');
  });

  it('reports topType per competitor', () => {
    const events = [
      ev({ competitor: 'Kroger', event_type: 'ORC', event_date: '2026-01-01' }),
      ev({ competitor: 'Kroger', event_type: 'ORC', event_date: '2026-02-01' }),
      ev({ competitor: 'Kroger', event_type: 'Cyber', event_date: '2026-02-15' }),
    ];
    const t = competitorTrends(events).find((x) => x.competitor === 'Kroger')!;
    expect(t.topType).toBe('ORC');
  });
});
