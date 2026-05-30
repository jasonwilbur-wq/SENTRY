import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { buildSwot, classifySentiment, findCollectionGaps, sentimentTone } from './insights';
import { makeSignal, daysAgoIso } from './testFactory';

const NOW = Date.parse('2026-05-29T00:00:00Z');

const cite = (id: string, quality: string) => ({
  citation_id: id,
  url: 'https://example.com/' + id,
  source_title: 'Source ' + id,
  evidence_excerpt: 'excerpt ' + id,
  source_quality: quality,
});

describe('insights — sentiment', () => {
  it('classifies by keyword precedence', () => {
    expect(classifySentiment(makeSignal({ title: 'Company to launch and expand new fund' }))).toBe('EXPANSIONARY');
    expect(classifySentiment(makeSignal({ title: 'Exec flags risk and headwind concerns' }))).toBe('CAUTIONARY');
    expect(classifySentiment(makeSignal({ title: 'Firm responds to data breach incident' }))).toBe('REACTIVE');
    expect(classifySentiment(makeSignal({ title: 'Routine title corroboration', summary: 'No charged language.' }))).toBe('NEUTRAL');
  });

  it('reactive wins over cautionary and expansionary', () => {
    expect(classifySentiment(makeSignal({ title: 'Launch delayed as firm responds to incident' }))).toBe('REACTIVE');
  });

  it('sentimentTone maps to palette tones', () => {
    expect(sentimentTone('EXPANSIONARY')).toBe('green');
    expect(sentimentTone('CAUTIONARY')).toBe('yellow');
    expect(sentimentTone('REACTIVE')).toBe('red');
    expect(sentimentTone('NEUTRAL')).toBe('gray');
  });
});

describe('insights — SWOT', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => vi.useRealTimers());

  it('buckets verified signals into quadrants', () => {
    const swot = buildSwot([
      makeSignal({ signal_id: 'threat', category: 'RISK_OR_INCIDENT_CONTEXT', verification_status: 'VERIFIED' }),
      makeSignal({ signal_id: 'strength', category: 'INITIATIVE', verification_status: 'VERIFIED', event_date: daysAgoIso(5, NOW) }),
      makeSignal({ signal_id: 'opp', category: 'PARTNERSHIP', verification_status: 'VERIFIED' }),
    ]);
    expect(swot.threats.map(s => s.signal_id)).toContain('threat');
    expect(swot.strengths.map(s => s.signal_id)).toContain('strength');
    expect(swot.opportunities.map(s => s.signal_id)).toContain('opp');
  });

  it('excludes unverified signals', () => {
    const swot = buildSwot([makeSignal({ category: 'INITIATIVE', verification_status: 'LEAD_ONLY' })]);
    const total = swot.strengths.length + swot.weaknesses.length + swot.opportunities.length + swot.threats.length;
    expect(total).toBe(0);
  });

  it('treats stale initiatives as opportunities', () => {
    const swot = buildSwot([
      makeSignal({ signal_id: 'stale', category: 'INITIATIVE', verification_status: 'VERIFIED', event_date: daysAgoIso(200, NOW) }),
    ]);
    expect(swot.opportunities.map(s => s.signal_id)).toContain('stale');
    expect(swot.strengths.map(s => s.signal_id)).not.toContain('stale');
  });

  it('caps each quadrant at 4 items', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      makeSignal({ signal_id: 'i' + i, category: 'INITIATIVE', verification_status: 'VERIFIED', event_date: daysAgoIso(5, NOW) }));
    expect(buildSwot(many).strengths.length).toBe(4);
  });
});

describe('insights — collection gaps', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => vi.useRealTimers());

  it('warns when no signals in last 90 days', () => {
    const gaps = findCollectionGaps([
      makeSignal({ event_date: daysAgoIso(200, NOW), citations: [cite('c', 'HIGH_PRIMARY_SOURCE'), cite('c2', 'HIGH_PRIMARY_SOURCE')] }),
    ]);
    expect(gaps.some(g => g.level === 'warn' && /stale/i.test(g.message))).toBe(true);
  });

  it('notes single-source signals', () => {
    const gaps = findCollectionGaps([
      makeSignal({ event_date: daysAgoIso(5, NOW), citations: [cite('c', 'LOW_SINGLE_SOURCE')] }),
    ]);
    expect(gaps.some(g => /single source/i.test(g.message))).toBe(true);
  });

  it('flags uncovered focus topics', () => {
    const gaps = findCollectionGaps(
      [makeSignal({ event_date: daysAgoIso(5, NOW), title: 'Carbon', summary: 'carbon work', citations: [cite('c', 'HIGH_PRIMARY_SOURCE'), cite('c2', 'HIGH_PRIMARY_SOURCE')] })],
      ['Quantum Computing'],
    );
    expect(gaps.some(g => /quantum/i.test(g.message))).toBe(true);
  });

  it('returns a clean note when nothing is wrong', () => {
    const gaps = findCollectionGaps([
      makeSignal({ event_date: daysAgoIso(5, NOW), verification_status: 'VERIFIED', citations: [cite('c', 'HIGH_PRIMARY_SOURCE'), cite('c2', 'HIGH_PRIMARY_SOURCE')] }),
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].message).toMatch(/no obvious collection gaps/i);
  });
});
