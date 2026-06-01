/**
 * Maps a project's free-text `current_phase` to the canonical EST 8-gate
 * roadmap index (1..8) used by <ESTLifecycleTimeline>.
 *
 * The EST gates are: 1 VAR · 2 Engage · 3 NDA · 4 ROM/Tech · 5 Lab Test
 * · 6 Compliance (APM/ERPA/SSP) · 7 Pilot · 8 BAU.
 *
 * Project data uses looser labels (e.g. "Intake", "Technical Assessment",
 * "Completed"), so we normalize defensively and fall back to gate 1.
 */

export const EST_PHASE_COUNT = 8;

/** Canonical lower-cased label fragments → gate index. Order matters: most
 *  specific / longest matches are checked first. */
const PHASE_PATTERNS: Array<[RegExp, number]> = [
  [/\bbau\b|business as usual|full program|operational|completed?|closeout|closed/, 8],
  [/pilot|limited auth|lao/, 7],
  [/apm|erpa|ssp|compliance|risk acceptance/, 6],
  [/lab|pot\b|poc\b|proof of (concept|technology)|testing/, 5],
  [/rom|technical assessment|architecture|nist|iso/, 4],
  [/nda|legal/, 3],
  [/engage|engagement|feasibility/, 2],
  [/var\b|intake|triage|assessment report|scoping|new/, 1],
];

/**
 * Resolve a project phase label to an EST gate index (1..8).
 * Unknown/empty → 1 (start of the roadmap), never throws.
 */
export function estPhaseIndex(currentPhase: string | null | undefined): number {
  const label = (currentPhase ?? '').trim().toLowerCase();
  if (!label) return 1;
  for (const [pattern, index] of PHASE_PATTERNS) {
    if (pattern.test(label)) return index;
  }
  return 1;
}

/** Human label for a gate index (for headers / aria text). */
export function estPhaseName(index: number): string {
  const names = [
    'VAR', 'Vendor Engagement', 'NDA & Legal', 'ROM & Technical',
    'Lab Testing', 'APM / ERPA / SSP', 'Pilot', 'BAU / Full Program',
  ];
  const i = Math.max(1, Math.min(EST_PHASE_COUNT, index));
  return names[i - 1];
}
