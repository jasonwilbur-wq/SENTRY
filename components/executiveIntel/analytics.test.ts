import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildComparison,
  buildMoveRows,
  classifyMove,
  computeMomentum,
  trendArrow,
} from './analytics';
import { ExecutivePortfolioSummary } from '../../services/executiveIntelApi';
import { makeSignal, daysAgoIso } from './testFactory';

const NOW = Date.parse('2026-05-29T00:00:00Z');

describe('analytics — momentum', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('counts rolling windows and computes up trend', () => {
    const signals = [
      makeSignal({ event_date: daysAgoIso(5, NOW) }),
      makeSignal({ event_date: daysAgoIso(10, NOW) }),
      makeSignal({ event_date: daysAgoIso(45, NOW) }),
    ];
    const m = computeMomentum(signals);
    expect(m.last30).toBe(2);
    expect(m.prev30).toBe(1);
    expect(m.last90).toBe(3);
    expect(m.trend).toBe('up');
    expect(m.delta).toBe(1);
    expect(m.mostRecentDays).toBe(5);
  });

  it('flags flat trend when no recent activity', () => {
    const m = computeMomentum([makeSignal({ event_date: daysAgoIso(200, NOW) })]);
    expect(m.last30).toBe(0);
    expect(m.prev30).toBe(0);
    expect(m.trend).toBe('flat');
  });

  it('handles undated signals gracefully', () => {
    const m = computeMomentum([makeSignal({ event_date: undefined })]);
    expect(m.mostRecentDays).toBeNull();
    expect(m.last90).toBe(0);
  });

  it('trendArrow maps direction to glyph', () => {
    expect(trendArrow('up')).toBe('\u2191');
    expect(trendArrow('down')).toBe('\u2193');
    expect(trendArrow('flat')).toBe('\u2192');
  });
});

describe('analytics — moves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('classifyMove maps categories to move types', () => {
    expect(classifyMove(makeSignal({ category: 'PARTNERSHIP' }))).toBe('PARTNER');
    expect(classifyMove(makeSignal({ category: 'ORG_CHANGE' }))).toBe('REORGANIZE');
    expect(classifyMove(makeSignal({ category: 'MAJOR_DECISION' }))).toBe('DECIDE');
    expect(classifyMove(makeSignal({ category: 'INITIATIVE' }))).toBe('INVEST');
    expect(classifyMove(makeSignal({ category: 'RISK_OR_INCIDENT_CONTEXT' }))).toBe('RESPOND');
    expect(classifyMove(makeSignal({ category: 'PUBLIC_QUOTE' }))).toBe('SIGNAL');
  });

  it('buildMoveRows keeps only verified strategic moves, newest first', () => {
    const rows = buildMoveRows([
      makeSignal({ signal_id: 'old', category: 'INITIATIVE', verification_status: 'VERIFIED', event_date: daysAgoIso(100, NOW) }),
      makeSignal({ signal_id: 'new', category: 'PARTNERSHIP', verification_status: 'VERIFIED', event_date: daysAgoIso(5, NOW) }),
      makeSignal({ signal_id: 'lead', category: 'INITIATIVE', verification_status: 'LEAD_ONLY', event_date: daysAgoIso(1, NOW) }),
      makeSignal({ signal_id: 'quote', category: 'PUBLIC_QUOTE', verification_status: 'VERIFIED', event_date: daysAgoIso(1, NOW) }),
    ]);
    const ids = rows.map(r => r.signal.signal_id);
    expect(ids).toEqual(['new', 'old']); // lead-only + non-strategic excluded
  });

  it('buildMoveRows derives a watch line from relevance', () => {
    const rows = buildMoveRows([
      makeSignal({ category: 'INITIATIVE', verification_status: 'VERIFIED', event_date: daysAgoIso(1, NOW), walmart_cso_relevance: 'Direct vendor evaluation trigger. Secondary detail follows here.' }),
    ]);
    expect(rows[0].watch).toBe('Direct vendor evaluation trigger.');
  });
});

describe('analytics — comparison', () => {
  const isArchived = (s?: string) => (s ?? 'ACTIVE').toUpperCase() === 'ARCHIVED';

  const summary = (over: Partial<ExecutivePortfolioSummary> & { signal: number; valid: number; cso: number }): ExecutivePortfolioSummary => ({
    profile_id: over.profile_id ?? 'p',
    artifact_slug: 'slug',
    full_name: over.full_name ?? 'Name',
    organization: over.organization ?? 'Org',
    title: 'Title',
    status: over.status,
    stats: {
      source_count: 0,
      signal_count: over.signal,
      brief_count: 0,
      valid_signal_count: over.valid,
      invalid_signal_count: 0,
      cso_ready_signal_count: over.cso,
      verification_counts: {},
      analyst_review_counts: {},
      category_counts: {},
      source_quality_counts: {},
      portfolio_ready_for_review: true,
    },
  });

  it('sorts active before archived, then by signal volume', () => {
    const rows = buildComparison([
      summary({ profile_id: 'arch', status: 'ARCHIVED', signal: 99, valid: 99, cso: 1 }),
      summary({ profile_id: 'small', signal: 2, valid: 1, cso: 0 }),
      summary({ profile_id: 'big', signal: 10, valid: 10, cso: 5 }),
    ], isArchived);
    expect(rows.map(r => r.profile_id)).toEqual(['big', 'small', 'arch']);
  });

  it('computes verifiedPct safely with zero signals', () => {
    const rows = buildComparison([summary({ profile_id: 'z', signal: 0, valid: 0, cso: 0 })], isArchived);
    expect(rows[0].verifiedPct).toBe(0);
  });
});
