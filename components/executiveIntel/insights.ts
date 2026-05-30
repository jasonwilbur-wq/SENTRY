import { ExecutiveSignalRecord } from '../../services/executiveIntelApi';
import { daysSince, isStale } from './signalLogic';

// ---------------------------------------------------------------------------
// Heuristic, analyst-assist insights. ALL outputs are clearly labeled as
// AI-draft / heuristic in the UI and must not be treated as analyst-approved
// conclusions (per CI best-practice: never auto-promote machine inference).
//   1. Sentiment  — keyword heuristic over PUBLIC_QUOTE signals
//   2. SWOT       — heuristic bucketing of verified signals
//   3. Collection gaps — silence/staleness/thin-sourcing flags
// ---------------------------------------------------------------------------

// --- 1. Sentiment ----------------------------------------------------------

export type Sentiment = 'EXPANSIONARY' | 'CAUTIONARY' | 'REACTIVE' | 'NEUTRAL';

const EXPANSIONARY = /\b(launch|expand|invest|accelerat|grow|scal|commit|partner|innovat|lead|first|new fund|breakthrough)\b/i;
const CAUTIONARY = /\b(risk|concern|challeng|delay|caution|uncertain|pressure|headwind|slow|reconsider|pause)\b/i;
const REACTIVE = /\b(respond|address|incident|breach|defend|comply|mitigat|recall|apolog|investigat|settle)\b/i;

export function classifySentiment(signal: ExecutiveSignalRecord): Sentiment {
  const text = (signal.title + ' ' + signal.summary).toLowerCase();
  if (REACTIVE.test(text)) return 'REACTIVE';
  if (CAUTIONARY.test(text)) return 'CAUTIONARY';
  if (EXPANSIONARY.test(text)) return 'EXPANSIONARY';
  return 'NEUTRAL';
}

export const sentimentTone = (s: Sentiment): 'blue' | 'green' | 'yellow' | 'red' | 'gray' => {
  switch (s) {
    case 'EXPANSIONARY': return 'green';
    case 'CAUTIONARY': return 'yellow';
    case 'REACTIVE': return 'red';
    default: return 'gray';
  }
};

// --- 2. SWOT ---------------------------------------------------------------

export interface Swot {
  strengths: ExecutiveSignalRecord[];
  weaknesses: ExecutiveSignalRecord[];
  opportunities: ExecutiveSignalRecord[];
  threats: ExecutiveSignalRecord[];
}

export function buildSwot(signals: ExecutiveSignalRecord[]): Swot {
  const verified = signals.filter(s => s.verification_status === 'VERIFIED' || s.verification_status === 'PARTIALLY_VERIFIED');
  const swot: Swot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  for (const s of verified) {
    const cat = (s.category || '').toUpperCase();
    const sentiment = classifySentiment(s);
    if (cat === 'RISK_OR_INCIDENT_CONTEXT' || sentiment === 'REACTIVE') {
      swot.threats.push(s);
    } else if (cat === 'INITIATIVE' || cat === 'MAJOR_DECISION') {
      if (isStale(s)) swot.opportunities.push(s);
      else swot.strengths.push(s);
    } else if (cat === 'PARTNERSHIP' || cat === 'PUBLIC_APPEARANCE') {
      swot.opportunities.push(s);
    } else if (sentiment === 'CAUTIONARY') {
      swot.weaknesses.push(s);
    } else {
      swot.strengths.push(s);
    }
  }
  // Cap each bucket so the panel stays scannable.
  (Object.keys(swot) as Array<keyof Swot>).forEach(k => { swot[k] = swot[k].slice(0, 4); });
  return swot;
}

// --- 3. Collection gaps ----------------------------------------------------

export interface CollectionGap {
  level: 'info' | 'warn';
  message: string;
}

export function findCollectionGaps(
  signals: ExecutiveSignalRecord[],
  focusTopics: string[] = [],
): CollectionGap[] {
  const gaps: CollectionGap[] = [];

  // Silence: no signal in the last 90 days.
  const recent = signals.filter(s => { const d = daysSince(s.event_date); return d !== null && d <= 90; });
  if (signals.length > 0 && recent.length === 0) {
    gaps.push({ level: 'warn', message: 'No signals in the last 90 days — profile may be going stale.' });
  }

  // Thin sourcing: signals with only a single citation.
  const singleSource = signals.filter(s => (s.citations?.length ?? 0) <= 1).length;
  if (singleSource > 0) {
    gaps.push({ level: 'info', message: singleSource + ' signal(s) rest on a single source — corroboration recommended before CSO use.' });
  }

  // Unreviewed: signals still awaiting analyst disposition.
  const lead = signals.filter(s => s.verification_status === 'LEAD_ONLY').length;
  if (lead > 0) {
    gaps.push({ level: 'info', message: lead + ' lead-only signal(s) need a second source to verify.' });
  }

  // Focus-topic coverage: topics with zero matching signals.
  const haystack = signals.map(s => (s.title + ' ' + s.summary).toLowerCase()).join(' ');
  const uncovered = focusTopics.filter(t => t && !haystack.includes(t.toLowerCase().split(' ')[0]));
  if (uncovered.length > 0) {
    gaps.push({ level: 'info', message: 'Thin/zero coverage on focus topic(s): ' + uncovered.slice(0, 4).join(', ') + '.' });
  }

  if (gaps.length === 0) {
    gaps.push({ level: 'info', message: 'No obvious collection gaps detected.' });
  }
  return gaps;
}
