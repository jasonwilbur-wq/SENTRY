import { ExecutiveSignalRecord } from '../../services/executiveIntelApi';

// ---------------------------------------------------------------------------
// Pure analysis helpers for Executive Intelligence signals.
// No JSX here so it stays trivially testable and reusable (SRP).
// Implements the CI tradecraft priority model:
//   Priority = Recency x Confidence x Walmart-Relevance
// ---------------------------------------------------------------------------

export type Tone = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

export const verificationTone = (status?: string): Tone => {
  if (status === 'VERIFIED') return 'green';
  if (status === 'PARTIALLY_VERIFIED') return 'blue';
  if (status === 'LEAD_ONLY') return 'yellow';
  if (status === 'REJECTED' || status === 'CONFLICTING') return 'red';
  return 'gray';
};

export const confidenceTone = (level?: string): Tone => {
  const v = (level || '').toUpperCase();
  if (v.includes('HIGH')) return 'green';
  if (v.includes('MEDIUM')) return 'blue';
  if (v.includes('LOW')) return 'yellow';
  return 'gray';
};

// Short, human-friendly label for a verbose confidence enum.
export const confidenceLabel = (level?: string): string => {
  const v = (level || '').toUpperCase();
  if (v.includes('HIGH')) return 'HIGH';
  if (v.includes('MEDIUM')) return 'MED';
  if (v.includes('LOW')) return 'LOW';
  return level || 'UNKNOWN';
};

// Days since an ISO date (or null if unparseable).
export const daysSince = (iso?: string): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
};

// Human "2d ago" / "3mo ago" style label.
export const ageLabel = (iso?: string): string => {
  const d = daysSince(iso);
  if (d === null) return 'undated';
  if (d <= 0) return 'today';
  if (d === 1) return '1d ago';
  if (d < 30) return d + 'd ago';
  if (d < 365) return Math.round(d / 30) + 'mo ago';
  return Math.round(d / 365) + 'y ago';
};

// Recency / confidence / relevance weights (CI tradecraft model).
const recencyWeight = (iso?: string): number => {
  const d = daysSince(iso);
  if (d === null) return 0.3;
  if (d < 7) return 1.0;
  if (d < 30) return 0.8;
  if (d < 90) return 0.6;
  if (d < 365) return 0.45;
  return 0.3;
};

const confidenceWeight = (level?: string): number => {
  const v = (level || '').toUpperCase();
  if (v.includes('HIGH')) return 1.0;
  if (v.includes('MEDIUM')) return 0.7;
  if (v.includes('LOW')) return 0.3;
  return 0.4;
};

const verificationWeight = (status?: string): number => {
  if (status === 'VERIFIED') return 1.0;
  if (status === 'PARTIALLY_VERIFIED') return 0.7;
  if (status === 'LEAD_ONLY') return 0.4;
  if (status === 'CONFLICTING') return 0.5;
  if (status === 'REJECTED') return 0.1;
  return 0.4;
};

// Heuristic relevance from the free-text relevance field length/keywords.
const relevanceWeight = (signal: ExecutiveSignalRecord): number => {
  const text = (signal.walmart_cso_relevance || '').toLowerCase();
  if (!text) return 0.4;
  let w = 0.6;
  if (/gold-standard|benchmark|partner|directly|escalat|legal|compliance/.test(text)) w += 0.3;
  if (text.length > 220) w += 0.1;
  return Math.min(w, 1.0);
};

export const priorityScore = (signal: ExecutiveSignalRecord): number =>
  recencyWeight(signal.event_date) *
  confidenceWeight(signal.confidence_level) *
  verificationWeight(signal.verification_status) *
  relevanceWeight(signal);

export const sortByPriority = (signals: ExecutiveSignalRecord[]): ExecutiveSignalRecord[] =>
  [...signals].sort((a, b) => priorityScore(b) - priorityScore(a));

// Count helper: returns sorted [label, count] pairs descending.
export const countBy = (
  items: ExecutiveSignalRecord[],
  key: (s: ExecutiveSignalRecord) => string,
): Array<[string, number]> => {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it) || 'UNKNOWN';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};

// Signals awaiting analyst disposition (review queue).
export const REVIEW_PENDING = new Set([
  'READY_FOR_REVIEW',
  'NEEDS_MORE_EVIDENCE',
  'CONFLICTING',
  'NEW',
]);

export const isPendingReview = (signal: ExecutiveSignalRecord): boolean =>
  REVIEW_PENDING.has((signal.analyst_review_status || '').toUpperCase()) ||
  signal.verification_status === 'CONFLICTING';

// A signal is "stale" if older than 90 days and not freshly verified.
export const isStale = (signal: ExecutiveSignalRecord): boolean => {
  const d = daysSince(signal.event_date);
  return d !== null && d > 90;
};

// Pretty category label: ORG_CHANGE -> Org Change
export const prettyLabel = (raw?: string): string =>
  (raw || 'Unknown')
    .toLowerCase()
    .split(/[_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
