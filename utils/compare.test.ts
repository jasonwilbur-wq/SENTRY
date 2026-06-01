import { describe, it, expect } from 'vitest';
import {
  compareVendors,
  weightedComposite,
  dimScore,
  type ComparableVendor,
} from './compare';

const mk = (id: string, name: string, scores: Record<string, number>, extra: Partial<ComparableVendor> = {}): ComparableVendor => ({
  id,
  company_name: name,
  var_scores: scores,
  ...extra,
});

describe('dimScore()', () => {
  it('reads a dimension or returns null', () => {
    const v = mk('1', 'A', { Compliance: 4.2 });
    expect(dimScore(v, 'Compliance')).toBe(4.2);
    expect(dimScore(v, 'Risk')).toBeNull();
  });
});

describe('weightedComposite()', () => {
  it('weights available dimensions and renormalizes', () => {
    // Only Compliance (0.25) and Risk (0.25) present, both 4 -> composite 4.
    const v = mk('1', 'A', { Compliance: 4, Risk: 4 });
    expect(weightedComposite(v)).toBeCloseTo(4, 5);
  });

  it('falls back to overall score when no dimensions present', () => {
    const v: ComparableVendor = { id: '1', company_name: 'A', var_weight_score: 3.1 };
    expect(weightedComposite(v)).toBe(3.1);
  });

  it('returns null when nothing is scored', () => {
    expect(weightedComposite({ id: '1', company_name: 'A' })).toBeNull();
  });
});

describe('compareVendors()', () => {
  it('builds rows with per-dimension leaders', () => {
    const a = mk('a', 'Alpha', { Compliance: 5, Risk: 2 });
    const b = mk('b', 'Beta', { Compliance: 3, Risk: 4 });
    const res = compareVendors([a, b]);

    const compliance = res.rows.find((r) => r.dimension === 'Compliance')!;
    expect(compliance.scores.a).toBe(5);
    expect(compliance.scores.b).toBe(3);
    expect(compliance.leaderId).toBe('a');

    const risk = res.rows.find((r) => r.dimension === 'Risk')!;
    expect(risk.leaderId).toBe('b');
  });

  it('marks a tie as no leader', () => {
    const a = mk('a', 'Alpha', { Compliance: 4 });
    const b = mk('b', 'Beta', { Compliance: 4 });
    const res = compareVendors([a, b]);
    const compliance = res.rows.find((r) => r.dimension === 'Compliance')!;
    expect(compliance.leaderId).toBeNull();
  });

  it('ranks vendors by composite and picks a winner', () => {
    const a = mk('a', 'Alpha', { Compliance: 5, Risk: 5 });
    const b = mk('b', 'Beta', { Compliance: 2, Risk: 2 });
    const res = compareVendors([a, b]);
    expect(res.winnerId).toBe('a');
    expect(res.ranking.find((r) => r.id === 'a')!.rank).toBe(1);
    expect(res.ranking.find((r) => r.id === 'b')!.rank).toBe(2);
  });

  it('sorts unscored vendors last and yields no winner when none scored', () => {
    const a: ComparableVendor = { id: 'a', company_name: 'Alpha' };
    const b: ComparableVendor = { id: 'b', company_name: 'Beta' };
    const res = compareVendors([a, b]);
    expect(res.winnerId).toBeNull();
    expect(res.ranking.every((r) => r.composite === null)).toBe(true);
  });

  it('handles an empty list', () => {
    const res = compareVendors([]);
    expect(res.vendorIds).toEqual([]);
    expect(res.winnerId).toBeNull();
    expect(res.rows.length).toBe(8); // dimensions still listed
  });
});

