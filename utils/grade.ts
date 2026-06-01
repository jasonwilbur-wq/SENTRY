/**
 * Vendor letter-grade helper (Phase 0 foundation).
 *
 * Maps SENTRY's internal 0-5 risk/quality scores onto a normalized A-F band
 * that anyone can understand in one second (the SecurityScorecard / BitSight
 * pattern). Pure, deterministic, no side effects -- trivially testable and
 * reused everywhere a score is displayed.
 *
 * Scale reference (matches VAR_DIMENSIONS in components/vendor/shared.tsx):
 *   5.0  best  ->  A
 *   0.0  worst ->  F
 */

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface GradeInfo {
  /** The letter band. */
  letter: LetterGrade;
  /** Tailwind-friendly hex for text/border accents. */
  colorHex: string;
  /** Short human label for tooltips / aria. */
  label: string;
}

// Thresholds are inclusive lower-bounds on the 0-5 scale.
// A: 4.5-5.0, B: 3.5-4.49, C: 2.5-3.49, D: 1.5-2.49, F: <1.5
const GRADE_TABLE: ReadonlyArray<{
  min: number;
  letter: LetterGrade;
  colorHex: string;
  label: string;
}> = [
  { min: 4.5, letter: 'A', colorHex: '#2A8703', label: 'Excellent' },
  { min: 3.5, letter: 'B', colorHex: '#5FA800', label: 'Good' },
  { min: 2.5, letter: 'C', colorHex: '#F59E0B', label: 'Fair' },
  { min: 1.5, letter: 'D', colorHex: '#E8730C', label: 'Poor' },
  { min: 0.0, letter: 'F', colorHex: '#EA1100', label: 'Critical' },
];

const UNKNOWN: GradeInfo = { letter: 'F', colorHex: '#9E9E9E', label: 'Not scored' };

/**
 * Convert a 0-5 numeric score into a letter grade.
 *
 * Out-of-range values are clamped to [0, 5]. `null`/`undefined`/`NaN` return a
 * neutral "Not scored" sentinel (still an F letter so sorting stays sane, but a
 * gray color and distinct label so the UI can show "—").
 */
export function grade(score: number | null | undefined): GradeInfo {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return UNKNOWN;
  }
  const clamped = Math.max(0, Math.min(5, score));
  for (const band of GRADE_TABLE) {
    if (clamped >= band.min) {
      return { letter: band.letter, colorHex: band.colorHex, label: band.label };
    }
  }
  // Unreachable (0.0 floor catches everything) but keeps TS exhaustive.
  return UNKNOWN;
}

/** Convenience: just the letter, for compact display. */
export function gradeLetter(score: number | null | undefined): LetterGrade {
  return grade(score).letter;
}

/** True when the score is a real, usable number (not null/NaN). */
export function isScored(score: number | null | undefined): boolean {
  return score !== null && score !== undefined && !Number.isNaN(score);
}
