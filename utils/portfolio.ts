/**
 * Portfolio analytics (Phase 1/CSO foundation).
 *
 * Pure, deterministic aggregations that power the "Executive Risk Posture,
 * one screen" CSO view. Given a list of vendors, compute the numbers a CSO
 * actually asks for: overall portfolio grade, distribution across A-F bands,
 * risk-level concentration, decision readiness, and assessment coverage.
 *
 * No React, no fetch, no side effects -- trivially unit-testable.
 */

import { grade, isScored, type LetterGrade } from './grade';

/** Minimal shape this module needs from a vendor (structural subset). */
export interface ScorableVendor {
  overall_rating?: number | null;
  var_weight_score?: number | null;
  risk_level?: string;
  var_decision_band?: string;
  has_var?: boolean;
}

export interface PortfolioPosture {
  /** Total vendors considered. */
  total: number;
  /** How many have a usable score. */
  scored: number;
  /** Assessment coverage 0-100 (scored / total). */
  coveragePct: number;
  /** Mean of available scores (0-5), or null if none scored. */
  meanScore: number | null;
  /** Portfolio-level letter derived from the mean score. */
  portfolioGrade: LetterGrade;
  /** Count of vendors in each A-F band (scored only). */
  gradeBands: Record<LetterGrade, number>;
  /** Count by risk level (raw strings, defaulting unknowns to "Unknown"). */
  riskLevels: Record<string, number>;
  /** Count of High + Critical risk vendors (the CSO's worry list). */
  elevatedRisk: number;
  /** Count by VAR decision band (Advance/Defer/Reject/...). */
  decisionBands: Record<string, number>;
}

/** Pick the best available score for a vendor (VAR score wins over rating). */
export function vendorScore(v: ScorableVendor): number | null {
  const s = v.var_weight_score ?? v.overall_rating;
  return isScored(s) ? (s as number) : null;
}

const EMPTY_BANDS = (): Record<LetterGrade, number> => ({ A: 0, B: 0, C: 0, D: 0, F: 0 });

/**
 * Aggregate a vendor list into a CSO-ready posture summary.
 * Never throws; an empty list yields zeroed, sensible defaults.
 */
export function summarizePosture(vendors: ScorableVendor[] = []): PortfolioPosture {
  const total = vendors.length;
  const gradeBands = EMPTY_BANDS();
  const riskLevels: Record<string, number> = {};
  const decisionBands: Record<string, number> = {};

  let scored = 0;
  let sum = 0;
  let elevatedRisk = 0;

  for (const v of vendors) {
    const score = vendorScore(v);
    if (score !== null) {
      scored += 1;
      sum += score;
      gradeBands[grade(score).letter] += 1;
    }

    const risk = (v.risk_level || 'Unknown').trim() || 'Unknown';
    riskLevels[risk] = (riskLevels[risk] || 0) + 1;
    if (risk === 'High' || risk === 'Critical') elevatedRisk += 1;

    const band = (v.var_decision_band || '').trim();
    if (band) decisionBands[band] = (decisionBands[band] || 0) + 1;
  }

  const meanScore = scored > 0 ? sum / scored : null;
  const coveragePct = total > 0 ? Math.round((scored / total) * 100) : 0;
  const portfolioGrade = grade(meanScore).letter;

  return {
    total,
    scored,
    coveragePct,
    meanScore,
    portfolioGrade,
    gradeBands,
    riskLevels,
    elevatedRisk,
    decisionBands,
  };
}

/**
 * Return the top-N highest-risk vendors (lowest score first; unscored last).
 * Stable and pure -- handy for the CSO "top worry list" widget.
 */
export function riskRanked<T extends ScorableVendor>(vendors: T[], limit = 5): T[] {
  return [...vendors]
    .map((v, i) => ({ v, i, s: vendorScore(v) }))
    .sort((a, b) => {
      if (a.s === null && b.s === null) return a.i - b.i;
      if (a.s === null) return 1;
      if (b.s === null) return -1;
      if (a.s !== b.s) return a.s - b.s;
      return a.i - b.i;
    })
    .slice(0, limit)
    .map((x) => x.v);
}
