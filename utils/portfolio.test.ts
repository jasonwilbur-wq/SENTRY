import { describe, it, expect } from 'vitest';
import {
  summarizePosture,
  riskRanked,
  vendorScore,
  type ScorableVendor,
} from './portfolio';

const v = (over: Partial<ScorableVendor>): ScorableVendor => ({ ...over });

describe('vendorScore()', () => {
  it('prefers VAR weight score over overall rating', () => {
    expect(vendorScore(v({ var_weight_score: 4.2, overall_rating: 1 }))).toBe(4.2);
  });
  it('falls back to overall rating', () => {
    expect(vendorScore(v({ overall_rating: 3.3 }))).toBe(3.3);
  });
  it('returns null when nothing usable', () => {
    expect(vendorScore(v({}))).toBeNull();
    expect(vendorScore(v({ var_weight_score: null }))).toBeNull();
  });
});

describe('summarizePosture()', () => {
  it('handles an empty portfolio with sane defaults', () => {
    const p = summarizePosture([]);
    expect(p.total).toBe(0);
    expect(p.scored).toBe(0);
    expect(p.coveragePct).toBe(0);
    expect(p.meanScore).toBeNull();
    expect(p.elevatedRisk).toBe(0);
    expect(p.gradeBands).toEqual({ A: 0, B: 0, C: 0, D: 0, F: 0 });
  });

  it('computes coverage, mean, and portfolio grade', () => {
    const p = summarizePosture([
      v({ overall_rating: 5 }),     // A
      v({ overall_rating: 3 }),     // C
      v({}),                        // unscored
    ]);
    expect(p.total).toBe(3);
    expect(p.scored).toBe(2);
    expect(p.coveragePct).toBe(67); // 2/3 rounded
    expect(p.meanScore).toBe(4);    // (5+3)/2
    expect(p.portfolioGrade).toBe('B'); // 4.0 -> B
    expect(p.gradeBands.A).toBe(1);
    expect(p.gradeBands.C).toBe(1);
  });

  it('counts risk levels and flags elevated risk', () => {
    const p = summarizePosture([
      v({ risk_level: 'High' }),
      v({ risk_level: 'Critical' }),
      v({ risk_level: 'Low' }),
      v({}),  // -> Unknown
    ]);
    expect(p.riskLevels.High).toBe(1);
    expect(p.riskLevels.Critical).toBe(1);
    expect(p.riskLevels.Low).toBe(1);
    expect(p.riskLevels.Unknown).toBe(1);
    expect(p.elevatedRisk).toBe(2);
  });

  it('tallies decision bands, ignoring blanks', () => {
    const p = summarizePosture([
      v({ var_decision_band: 'Advance' }),
      v({ var_decision_band: 'Advance' }),
      v({ var_decision_band: 'Reject' }),
      v({ var_decision_band: '' }),
    ]);
    expect(p.decisionBands.Advance).toBe(2);
    expect(p.decisionBands.Reject).toBe(1);
    expect(p.decisionBands['']).toBeUndefined();
  });
});

describe('riskRanked()', () => {
  it('orders lowest score first, unscored last, stable on ties', () => {
    const list = [
      v({ company_name: 'a', overall_rating: 4 } as ScorableVendor),
      v({ company_name: 'b', overall_rating: 1 } as ScorableVendor),
      v({ company_name: 'c' } as ScorableVendor),       // unscored
      v({ company_name: 'd', overall_rating: 1 } as ScorableVendor),
    ];
    const ranked = riskRanked(list, 3) as Array<ScorableVendor & { company_name: string }>;
    expect(ranked.map((x) => x.company_name)).toEqual(['b', 'd', 'a']);
  });

  it('respects the limit', () => {
    const list = [v({ overall_rating: 1 }), v({ overall_rating: 2 }), v({ overall_rating: 3 })];
    expect(riskRanked(list, 2).length).toBe(2);
  });
});
