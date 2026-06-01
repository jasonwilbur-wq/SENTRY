/**
 * Vendor comparison (Phase 1 - IPVM / G2 side-by-side pattern).
 *
 * Pure logic to compare 2-4 vendors across the VAR scoring dimensions: builds a
 * per-dimension matrix, marks the per-dimension leader, and computes an overall
 * ranking. No React, no fetch -- fully unit-testable.
 */

import { grade, isScored, type LetterGrade } from './grade';

/** The eight VAR dimensions, matching components/vendor/shared.tsx weights. */
export const COMPARE_DIMENSIONS = [
  { key: 'Compliance', weight: 0.25 },
  { key: 'Risk', weight: 0.25 },
  { key: 'Maturity', weight: 0.15 },
  { key: 'Integration', weight: 0.1 },
  { key: 'ROI', weight: 0.1 },
  { key: 'Viability', weight: 0.05 },
  { key: 'Differentiation', weight: 0.05 },
  { key: 'Cloud Dep', weight: 0.05 },
] as const;

export type DimensionKey = (typeof COMPARE_DIMENSIONS)[number]['key'];

export interface ComparableVendor {
  id: string;
  company_name: string;
  var_scores?: Partial<Record<string, number>>;
  var_weight_score?: number | null;
  overall_rating?: number | null;
}

export interface DimensionRow {
  dimension: DimensionKey;
  weight: number;
  /** score per vendor id (null when unscored). */
  scores: Record<string, number | null>;
  /** vendor id with the highest score for this dimension (null on tie/none). */
  leaderId: string | null;
}

export interface VendorRanking {
  id: string;
  company_name: string;
  /** weighted composite across available dimensions (0-5), or null. */
  composite: number | null;
  grade: LetterGrade;
  rank: number; // 1 = best
}

export interface ComparisonResult {
  vendorIds: string[];
  rows: DimensionRow[];
  ranking: VendorRanking[];
  /** id of the overall winner (best composite), or null. */
  winnerId: string | null;
}
// LOGIC_BELOW

/** Read one dimension's score for a vendor (null when missing/invalid). */
export function dimScore(v: ComparableVendor, key: DimensionKey): number | null {
  const s = v.var_scores?.[key];
  return isScored(s) ? (s as number) : null;
}

/** Weighted composite across available dimensions; falls back to overall. */
export function weightedComposite(v: ComparableVendor): number | null {
  let sum = 0;
  let wsum = 0;
  for (const { key, weight } of COMPARE_DIMENSIONS) {
    const s = dimScore(v, key);
    if (s !== null) {
      sum += s * weight;
      wsum += weight;
    }
  }
  if (wsum > 0) return sum / wsum;
  const overall = v.var_weight_score ?? v.overall_rating;
  return isScored(overall) ? (overall as number) : null;
}

/**
 * Compare a set of vendors. Column order follows the input order.
 * Never throws; an empty/short list yields an empty-but-valid result.
 */
export function compareVendors(vendors: ComparableVendor[]): ComparisonResult {
  const vendorIds = vendors.map((v) => v.id);

  const rows: DimensionRow[] = COMPARE_DIMENSIONS.map(({ key, weight }) => {
    const scores: Record<string, number | null> = {};
    let leaderId: string | null = null;
    let leaderScore = -Infinity;
    let tie = false;
    for (const v of vendors) {
      const s = dimScore(v, key);
      scores[v.id] = s;
      if (s !== null) {
        if (s > leaderScore) {
          leaderScore = s;
          leaderId = v.id;
          tie = false;
        } else if (s === leaderScore) {
          tie = true;
        }
      }
    }
    return { dimension: key, weight, scores, leaderId: tie ? null : leaderId };
  });

  const composites = vendors.map((v) => ({
    id: v.id,
    company_name: v.company_name,
    composite: weightedComposite(v),
  }));

  const sorted = [...composites].sort((a, b) => {
    if (a.composite === null && b.composite === null) return 0;
    if (a.composite === null) return 1;
    if (b.composite === null) return -1;
    return b.composite - a.composite;
  });

  const rankById = new Map<string, number>();
  sorted.forEach((c, i) => rankById.set(c.id, i + 1));

  const ranking: VendorRanking[] = composites.map((c) => ({
    id: c.id,
    company_name: c.company_name,
    composite: c.composite,
    grade: grade(c.composite).letter,
    rank: rankById.get(c.id) ?? 0,
  }));

  const winnerId =
    sorted.length > 0 && sorted[0].composite !== null ? sorted[0].id : null;

  return { vendorIds, rows, ranking, winnerId };
}
