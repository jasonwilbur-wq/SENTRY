import type { ExecutiveProfile } from '../../data/csoProfiles';

// ---------------------------------------------------------------------------
// Executive-signal aggregation across all tracked security leaders.
//
// Powers the "what changed since you last looked" strip on the Security lens
// and the executive slice of the dashboard Intelligence Brief. Pure + tested.
// Keeps the page from making a CSO read nine profiles to find the one new thing.
// ---------------------------------------------------------------------------

export interface ExecutiveSignal {
  profileId: string;
  execName: string;
  company: string;
  date: string;
  headline: string;
  /** 'finding' carries analyst "why it matters"; 'activity' is timeline-only. */
  kind: 'finding' | 'activity';
  whyItMatters?: string;
  riskColor?: string;
}

/** Flatten every dated finding + activity into a single signal stream. */
export function collectSignals(profiles: ExecutiveProfile[]): ExecutiveSignal[] {
  const signals: ExecutiveSignal[] = [];
  for (const p of profiles) {
    for (const f of p.keyFindings) {
      if (!f.date) continue;
      signals.push({
        profileId: p.id,
        execName: p.name,
        company: p.company,
        date: f.date,
        headline: f.headline,
        kind: 'finding',
        whyItMatters: f.whyItMatters,
        riskColor: f.riskColor,
      });
    }
    for (const a of p.recentActivity) {
      if (!a.date) continue;
      signals.push({
        profileId: p.id,
        execName: p.name,
        company: p.company,
        date: a.date,
        headline: a.title,
        kind: 'activity',
      });
    }
  }
  return signals;
}

/** Most recent signals first; ties broken by exec name for stability. */
export function recentSignals(profiles: ExecutiveProfile[], limit = 5): ExecutiveSignal[] {
  return collectSignals(profiles)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.execName.localeCompare(b.execName)))
    .slice(0, limit);
}

/** Freshest signal date across the whole watchlist, or null. Drives the
 *  dynamic "Updated" label so it can never go stale by hand. */
export function latestSignalDate(profiles: ExecutiveProfile[]): string | null {
  const dates = collectSignals(profiles).map((s) => s.date);
  if (dates.length === 0) return null;
  return dates.reduce((max, d) => (d > max ? d : max));
}

/** Count of signals on/after a cutoff date (inclusive). */
export function signalsSince(profiles: ExecutiveProfile[], cutoffIso: string): number {
  return collectSignals(profiles).filter((s) => s.date >= cutoffIso).length;
}
