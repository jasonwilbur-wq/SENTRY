import { ExecutivePortfolio, ExecutivePortfolioSummary, ExecutiveSignalRecord } from '../../services/executiveIntelApi';
import { daysSince, prettyLabel } from './signalLogic';

// ---------------------------------------------------------------------------
// Higher-order competitive-intelligence analytics:
//   1. Momentum  — signal velocity over rolling windows (is this exec heating up?)
//   2. Move/counter-move — actionable INITIATIVE / MAJOR_DECISION / PARTNERSHIP
//      signals framed against a Walmart posture for analyst decisioning.
//   3. Comparison — cross-portfolio benchmarking metrics for the "who's most
//      active / most verified" rail.
// All pure functions; no JSX, no side effects (SRP + testability).
// ---------------------------------------------------------------------------

// --- 1. Momentum -----------------------------------------------------------

export interface Momentum {
  last30: number;
  prev30: number;     // days 30-60
  last90: number;
  trend: 'up' | 'down' | 'flat';
  delta: number;      // last30 - prev30
  mostRecentDays: number | null;
}

export function computeMomentum(signals: ExecutiveSignalRecord[]): Momentum {
  let last30 = 0;
  let prev30 = 0;
  let last90 = 0;
  let mostRecentDays: number | null = null;
  for (const s of signals) {
    const d = daysSince(s.event_date);
    if (d === null) continue;
    if (mostRecentDays === null || d < mostRecentDays) mostRecentDays = d;
    if (d <= 30) last30 += 1;
    else if (d <= 60) prev30 += 1;
    if (d <= 90) last90 += 1;
  }
  const delta = last30 - prev30;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return { last30, prev30, last90, trend, delta, mostRecentDays };
}

export const trendArrow = (trend: Momentum['trend']): string =>
  trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2192';

export const trendTone = (trend: Momentum['trend']): 'green' | 'red' | 'gray' =>
  trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray';

// --- 2. Move / counter-move ------------------------------------------------

export type MoveType = 'INVEST' | 'PARTNER' | 'REORGANIZE' | 'RESPOND' | 'DECIDE' | 'SIGNAL';

const MOVE_CATEGORIES = new Set(['INITIATIVE', 'MAJOR_DECISION', 'PARTNERSHIP', 'ORG_CHANGE']);

export function classifyMove(signal: ExecutiveSignalRecord): MoveType {
  const cat = (signal.category || '').toUpperCase();
  if (cat === 'PARTNERSHIP') return 'PARTNER';
  if (cat === 'ORG_CHANGE') return 'REORGANIZE';
  if (cat === 'MAJOR_DECISION') return 'DECIDE';
  if (cat === 'RISK_OR_INCIDENT_CONTEXT') return 'RESPOND';
  if (cat === 'INITIATIVE') return 'INVEST';
  return 'SIGNAL';
}

export interface MoveRow {
  signal: ExecutiveSignalRecord;
  move: MoveType;
  watch: string; // suggested Walmart watch derived from relevance text
}

// Derive a short "what to watch" line from the relevance text (first sentence).
function deriveWatch(signal: ExecutiveSignalRecord): string {
  const text = (signal.walmart_cso_relevance || signal.business_relevance || '').trim();
  if (!text) return 'Monitor for follow-on activity.';
  const firstSentence = text.split(/(?<=[.!?])\s/)[0];
  return firstSentence.length > 180 ? firstSentence.slice(0, 177) + '\u2026' : firstSentence;
}

export function buildMoveRows(signals: ExecutiveSignalRecord[], limit = 6): MoveRow[] {
  return signals
    .filter(s => MOVE_CATEGORIES.has((s.category || '').toUpperCase()))
    .filter(s => s.verification_status === 'VERIFIED' || s.verification_status === 'PARTIALLY_VERIFIED')
    .sort((a, b) => (daysSince(a.event_date) ?? 9e9) - (daysSince(b.event_date) ?? 9e9))
    .slice(0, limit)
    .map(s => ({ signal: s, move: classifyMove(s), watch: deriveWatch(s) }));
}

export const moveTone = (move: MoveType): 'blue' | 'green' | 'yellow' | 'red' | 'gray' => {
  switch (move) {
    case 'INVEST': return 'green';
    case 'PARTNER': return 'blue';
    case 'DECIDE': return 'blue';
    case 'REORGANIZE': return 'yellow';
    case 'RESPOND': return 'red';
    default: return 'gray';
  }
};

// --- 3. Cross-portfolio comparison -----------------------------------------

export interface ComparisonRow {
  profile_id: string;
  name: string;
  organization: string;
  archived: boolean;
  signals: number;
  csoReady: number;
  verifiedPct: number; // 0-100 (valid/total proxy)
}

export function buildComparison(
  portfolios: ExecutivePortfolioSummary[],
  isArchived: (s?: string) => boolean,
): ComparisonRow[] {
  return portfolios
    .map(p => {
      const total = p.stats.signal_count || 0;
      const valid = p.stats.valid_signal_count || 0;
      return {
        profile_id: p.profile_id,
        name: p.full_name,
        organization: p.organization,
        archived: isArchived(p.status),
        signals: total,
        csoReady: p.stats.cso_ready_signal_count || 0,
        verifiedPct: total > 0 ? Math.round((valid / total) * 100) : 0,
      };
    })
    .sort((a, b) => Number(a.archived) - Number(b.archived) || b.signals - a.signals);
}

export { prettyLabel };
