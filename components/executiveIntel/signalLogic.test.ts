import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ageLabel,
  confidenceLabel,
  countBy,
  daysSince,
  isPendingReview,
  isStale,
  prettyLabel,
  priorityScore,
  sortByPriority,
} from './signalLogic';
import { makeSignal, daysAgoIso } from './testFactory';

const NOW = Date.parse('2026-05-29T00:00:00Z');

describe('signalLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('daysSince handles undated and parses ISO', () => {
    expect(daysSince(undefined)).toBeNull();
    expect(daysSince('not-a-date')).toBeNull();
    expect(daysSince(daysAgoIso(10, NOW))).toBe(10);
  });

  it('ageLabel renders human strings', () => {
    expect(ageLabel(undefined)).toBe('undated');
    expect(ageLabel(daysAgoIso(0, NOW))).toBe('today');
    expect(ageLabel(daysAgoIso(1, NOW))).toBe('1d ago');
    expect(ageLabel(daysAgoIso(45, NOW))).toBe('2mo ago');
    expect(ageLabel(daysAgoIso(400, NOW))).toBe('1y ago');
  });

  it('confidenceLabel collapses verbose enums', () => {
    expect(confidenceLabel('HIGH_PRIMARY_SOURCE')).toBe('HIGH');
    expect(confidenceLabel('MEDIUM_REPUTABLE_SECONDARY')).toBe('MED');
    expect(confidenceLabel('LOW_SINGLE_SOURCE')).toBe('LOW');
  });

  it('priorityScore ranks recent+verified+high above old+lead+low', () => {
    const strong = makeSignal({
      event_date: daysAgoIso(2, NOW),
      confidence_level: 'HIGH_PRIMARY_SOURCE',
      verification_status: 'VERIFIED',
      walmart_cso_relevance: 'Gold-standard benchmark; engage directly for partnership discussions on Scope 3 methodology and carbon accounting tooling at length.',
    });
    const weak = makeSignal({
      event_date: daysAgoIso(800, NOW),
      confidence_level: 'LOW_SINGLE_SOURCE',
      verification_status: 'LEAD_ONLY',
      walmart_cso_relevance: '',
    });
    expect(priorityScore(strong)).toBeGreaterThan(priorityScore(weak));
  });

  it('sortByPriority is stable-ish and does not mutate input', () => {
    const a = makeSignal({ signal_id: 'a', event_date: daysAgoIso(400, NOW), verification_status: 'LEAD_ONLY', confidence_level: 'LOW_SINGLE_SOURCE' });
    const b = makeSignal({ signal_id: 'b', event_date: daysAgoIso(1, NOW), verification_status: 'VERIFIED', confidence_level: 'HIGH_PRIMARY_SOURCE' });
    const input = [a, b];
    const sorted = sortByPriority(input);
    expect(sorted[0].signal_id).toBe('b');
    expect(input[0].signal_id).toBe('a'); // original order preserved
  });

  it('isPendingReview catches review statuses and conflicting', () => {
    expect(isPendingReview(makeSignal({ analyst_review_status: 'READY_FOR_REVIEW' }))).toBe(true);
    expect(isPendingReview(makeSignal({ analyst_review_status: 'NEEDS_MORE_EVIDENCE' }))).toBe(true);
    expect(isPendingReview(makeSignal({ analyst_review_status: 'APPROVED', verification_status: 'CONFLICTING' }))).toBe(true);
    expect(isPendingReview(makeSignal({ analyst_review_status: 'APPROVED', verification_status: 'VERIFIED' }))).toBe(false);
  });

  it('isStale flags signals older than 90 days', () => {
    expect(isStale(makeSignal({ event_date: daysAgoIso(30, NOW) }))).toBe(false);
    expect(isStale(makeSignal({ event_date: daysAgoIso(120, NOW) }))).toBe(true);
    expect(isStale(makeSignal({ event_date: undefined }))).toBe(false);
  });

  it('countBy aggregates and sorts descending', () => {
    const signals = [
      makeSignal({ category: 'INITIATIVE' }),
      makeSignal({ category: 'INITIATIVE' }),
      makeSignal({ category: 'ORG_CHANGE' }),
    ];
    expect(countBy(signals, s => s.category)).toEqual([['INITIATIVE', 2], ['ORG_CHANGE', 1]]);
  });

  it('prettyLabel humanizes enum strings', () => {
    expect(prettyLabel('ORG_CHANGE')).toBe('Org Change');
    expect(prettyLabel('RISK_OR_INCIDENT_CONTEXT')).toBe('Risk Or Incident Context');
    expect(prettyLabel(undefined)).toBe('Unknown');
  });
});
