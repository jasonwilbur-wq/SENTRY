/**
 * Competitor intelligence interpretation layer.
 *
 * Turns raw competitor events into CSO-ready insight: a single "So what for
 * Walmart" takeaway, a normalized severity, and (across a set of events)
 * trend direction per competitor. Pure + unit-tested. No React, no fetch.
 *
 * The backend already carries strong fields (why_walmart_cares,
 * security_implication, priority_tier, walmart_relevance_score) -- this layer
 * makes them legible instead of leaving the user to assemble meaning from a grid.
 */

export interface InsightEvent {
  id: number;
  competitor: string;
  event_date: string | null;
  event_title: string | null;
  event_type: string | null;
  category?: string;
  security_implication?: string | null;
  why_walmart_cares?: string | null;
  operational_impact?: string | null;
  priority_tier?: string | null;
  walmart_relevance_score?: number | null;
}

export type InsightSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface EventInsight {
  severity: InsightSeverity;
  /** One-line CSO takeaway: the best available "so what for Walmart". */
  soWhat: string;
  /** True when the source data actually carried an analyst interpretation
   *  (vs. us falling back to a generic prompt). */
  hasAnalystTake: boolean;
}

/** Normalize priority_tier / relevance score into a single severity band. */
export function eventSeverity(ev: InsightEvent): InsightSeverity {
  const tier = (ev.priority_tier || '').toLowerCase();
  if (tier.includes('cso') || tier.includes('crit')) return 'Critical';
  if (tier.includes('leader') || tier.includes('high')) return 'High';
  if (tier.includes('analyst') || tier.includes('med')) return 'Medium';

  const score = ev.walmart_relevance_score;
  if (typeof score === 'number') {
    if (score >= 8) return 'Critical';
    if (score >= 6) return 'High';
    if (score >= 3) return 'Medium';
    return 'Low';
  }
  return 'Medium';
}

/** Best available "so what for Walmart" line, with graceful fallback. */
export function eventSoWhat(ev: InsightEvent): { text: string; fromAnalyst: boolean } {
  const candidates = [ev.why_walmart_cares, ev.security_implication, ev.operational_impact];
  for (const c of candidates) {
    if (c && c.trim().length > 0) return { text: c.trim(), fromAnalyst: true };
  }
  const what = ev.event_type ? `${ev.event_type.toLowerCase()} activity` : 'this development';
  return {
    text: `Review whether ${ev.competitor}'s ${what} shifts Walmart's competitive or security posture.`,
    fromAnalyst: false,
  };
}

/** Combine severity + so-what into one insight object. */
export function interpretEvent(ev: InsightEvent): EventInsight {
  const { text, fromAnalyst } = eventSoWhat(ev);
  return { severity: eventSeverity(ev), soWhat: text, hasAnalystTake: fromAnalyst };
}

export type TrendDirection = 'up' | 'down' | 'flat';

export interface CompetitorTrend {
  competitor: string;
  total: number;
  recent: number;   // events in the recent half of the data range
  prior: number;    // events in the older half
  direction: TrendDirection;
  /** percent change recent vs prior, rounded; null when prior is 0. */
  changePct: number | null;
  topType: string | null;
}

function midpoint(dates: string[]): number {
  // Returns a time value splitting the date range in half.
  const times = dates.map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t));
  if (times.length === 0) return 0;
  return (Math.min(...times) + Math.max(...times)) / 2;
}

/**
 * Per-competitor trend: compares event volume in the recent vs prior half of
 * the data's own date range. Never throws; bad dates are ignored.
 */
export function competitorTrends(events: InsightEvent[]): CompetitorTrend[] {
  const byComp = new Map<string, InsightEvent[]>();
  for (const ev of events) {
    if (!byComp.has(ev.competitor)) byComp.set(ev.competitor, []);
    byComp.get(ev.competitor)!.push(ev);
  }

  const out: CompetitorTrend[] = [];
  for (const [competitor, evs] of byComp) {
    const dated = evs.filter((e) => e.event_date);
    const split = midpoint(dated.map((e) => e.event_date as string));
    let recent = 0;
    let prior = 0;
    const typeCounts = new Map<string, number>();
    for (const e of evs) {
      const t = e.event_date ? new Date(e.event_date).getTime() : NaN;
      if (!Number.isNaN(t)) {
        if (t >= split) recent += 1; else prior += 1;
      }
      const ty = e.event_type || 'Other';
      typeCounts.set(ty, (typeCounts.get(ty) || 0) + 1);
    }
    let topType: string | null = null; let topN = 0;
    for (const [ty, n] of typeCounts) {
      if (n > topN) { topN = n; topType = ty; }
    }
    const direction: TrendDirection = recent > prior ? 'up' : recent < prior ? 'down' : 'flat';
    const changePct = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : null;
    out.push({ competitor, total: evs.length, recent, prior, direction, changePct, topType });
  }

  out.sort((a, b) => b.total - a.total);
  return out;
}
