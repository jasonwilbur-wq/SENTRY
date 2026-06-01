import type { ExecutiveProfile } from '../../data/csoProfiles';

// ---------------------------------------------------------------------------
// Verification status for executive profiles.
//
// The Security Leadership data is OSINT-sourced and ages: incumbents change
// roles, some profiles were only ever provisional. Presenting every profile as
// equally-trusted fact is the real risk for a CSO-facing tool. This module
// derives a transparent verification status so the UI can show confidence
// instead of implying certainty. Pure + side-effect-free for unit testing.
// ---------------------------------------------------------------------------

export type VerificationLevel = 'verified' | 'review' | 'provisional';

export interface VerificationStatus {
  level: VerificationLevel;
  label: string;
  /** Short reason a user can act on. */
  reason: string;
  /** Hex for the badge, Walmart palette. */
  color: string;
}

const STALE_AFTER_DAYS = 120;

/** Signals in bio/title that a profile is explicitly unconfirmed. */
function looksProvisional(p: ExecutiveProfile): boolean {
  const haystack = `${p.title} ${p.bio}`.toLowerCase();
  return (
    haystack.includes('unverified') ||
    haystack.includes('provisional') ||
    haystack.includes('unconfirmed') ||
    haystack.includes('not confirm')
  );
}

/** Most recent dated signal across findings + activity, or null. */
export function latestSignalDate(p: ExecutiveProfile): string | null {
  const dates: string[] = [
    ...p.keyFindings.map((f) => f.date),
    ...p.recentActivity.map((a) => a.date),
  ].filter(Boolean);
  if (dates.length === 0) return null;
  return dates.reduce((max, d) => (d > max ? d : max));
}

/** Days between the latest signal and `now` (default: today). Null if no date. */
export function daysSinceLatestSignal(p: ExecutiveProfile, now: Date = new Date()): number | null {
  const latest = latestSignalDate(p);
  if (!latest) return null;
  const t = new Date(latest).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / (1000 * 60 * 60 * 24));
}

/**
 * Derive verification status. Order of precedence:
 *  1. Explicit "unverified/provisional" wording -> provisional.
 *  2. No sources on any finding -> provisional.
 *  3. Stale (latest signal older than threshold) -> review.
 *  4. Otherwise -> verified.
 */
export function deriveVerification(p: ExecutiveProfile, now: Date = new Date()): VerificationStatus {
  if (looksProvisional(p)) {
    return {
      level: 'provisional',
      label: 'Provisional',
      reason: 'Incumbency or role not confirmed via primary sources.',
      color: '#ea1100',
    };
  }

  const totalSources = p.keyFindings.reduce((sum, f) => sum + f.sources.length, 0);
  if (totalSources === 0) {
    return {
      level: 'provisional',
      label: 'Provisional',
      reason: 'No public source citations attached to findings.',
      color: '#ea1100',
    };
  }

  const age = daysSinceLatestSignal(p, now);
  if (age === null || age > STALE_AFTER_DAYS) {
    return {
      level: 'review',
      label: 'Needs review',
      reason: age === null
        ? 'No dated signals to confirm currency.'
        : `Latest signal is ${age} days old (> ${STALE_AFTER_DAYS}d).`,
      color: '#995213',
    };
  }

  return {
    level: 'verified',
    label: 'Verified',
    reason: `Sourced and current (latest signal ${age}d ago).`,
    color: '#2a8703',
  };
}

export interface VerificationSummary {
  verified: number;
  review: number;
  provisional: number;
  total: number;
}

/** Portfolio-level rollup for the overview deck. */
export function summarizeVerification(
  profiles: ExecutiveProfile[],
  now: Date = new Date(),
): VerificationSummary {
  const out: VerificationSummary = { verified: 0, review: 0, provisional: 0, total: profiles.length };
  for (const p of profiles) {
    out[deriveVerification(p, now).level] += 1;
  }
  return out;
}
