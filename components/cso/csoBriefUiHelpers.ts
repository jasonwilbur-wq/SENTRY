import type { CSOBriefStatus, ValidationViolation } from './csoBriefTypes';

const RECOMMENDATION_LABELS: Record<string, string> = {
  escalate_for_review: 'Escalate for review',
  include_in_brief: 'Include in brief',
  request_additional_evidence: 'Request additional evidence',
  hold_due_to_readiness_issue: 'Hold due to readiness issue',
  monitor_only: 'Monitor only',
};

const DECISION_LABELS: Record<string, string> = {
  include_in_brief: 'Include in brief',
  escalate_for_review: 'Escalate for review',
  request_additional_evidence: 'Request additional evidence',
  monitor_only: 'Monitor only',
  hold: 'Hold',
  dismiss: 'Dismiss',
};

export function isReadOnlyBrief(status: CSOBriefStatus): boolean {
  return status === 'APPROVED' || status === 'PUBLISHED_DRAFT';
}

export function statusChipStyles(status: CSOBriefStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/35';
    case 'IN_REVIEW':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
    case 'CHANGES_REQUESTED':
      return 'bg-red-500/15 text-red-300 border-red-500/35';
    case 'APPROVED':
      return 'bg-green-500/15 text-green-300 border-green-500/35';
    case 'PUBLISHED_DRAFT':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/35';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/35';
  }
}

export function canTransition(
  status: CSOBriefStatus,
  toStatus: CSOBriefStatus,
  isAdmin: boolean,
): boolean {
  if (status === 'DRAFT' && toStatus === 'IN_REVIEW') return true;
  if (status === 'IN_REVIEW' && toStatus === 'CHANGES_REQUESTED') return isAdmin;
  if (status === 'IN_REVIEW' && toStatus === 'APPROVED') return isAdmin;
  if (status === 'CHANGES_REQUESTED' && toStatus === 'IN_REVIEW') return true;
  if (status === 'APPROVED' && toStatus === 'PUBLISHED_DRAFT') return isAdmin;
  return false;
}

export function formatApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Unexpected error';
  const msg = err.message || 'Unexpected error';
  const parts = msg.split(': ');
  const payload = parts.length > 1 ? parts.slice(1).join(': ') : msg;

  try {
    const parsed = JSON.parse(payload);
    if (parsed?.detail?.message) return parsed.detail.message;
    if (typeof parsed?.detail === 'string') return parsed.detail;
    if (parsed?.message) return parsed.message;
    return msg;
  } catch {
    return payload;
  }
}

export function extractViolations(err: unknown): ValidationViolation[] {
  if (!(err instanceof Error)) return [];
  try {
    const payload = err.message.split(': ').slice(1).join(': ');
    const parsed = JSON.parse(payload);
    return parsed?.detail?.violations ?? [];
  } catch {
    return [];
  }
}

export function prettyRecommendation(val?: string | null): string {
  const key = String(val || '').trim();
  if (!key) return '—';
  return RECOMMENDATION_LABELS[key] || key;
}

export function prettyAnalystDecision(val?: string | null): string {
  const key = String(val || '').trim();
  if (!key) return 'none';
  return DECISION_LABELS[key] || key;
}

export function decisionAlignmentStatus(args: {
  recommendation?: string | null;
  analystDecision?: string | null;
  decisionSource?: string | null;
}): 'NO_DECISION' | 'ALIGNED' | 'OVERRIDDEN' {
  const source = String(args.decisionSource || '').trim();
  const analyst = String(args.analystDecision || '').trim();
  if (!analyst) return 'NO_DECISION';
  if (source === 'analyst_accept_recommendation') return 'ALIGNED';
  if (source === 'analyst_override_recommendation') return 'OVERRIDDEN';

  const rec = String(args.recommendation || '').trim();
  const recToDecision: Record<string, string> = {
    hold_due_to_readiness_issue: 'hold',
    request_additional_evidence: 'request_additional_evidence',
    monitor_only: 'monitor_only',
    escalate_for_review: 'escalate_for_review',
    include_in_brief: 'include_in_brief',
  };
  if (rec && recToDecision[rec] && recToDecision[rec] === analyst) return 'ALIGNED';
  return 'OVERRIDDEN';
}

export function summarizeAuditDiff(raw: string): string {
  if (!raw) return '—';
  try {
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data == null) return String(raw);

    if ('status' in data && 'note' in data) {
      const parts = [
        `status=${String(data.status)}`,
        `note=${String(data.note || '')}`,
      ];
      if ('reviewer_notes' in data) parts.push(`reviewer_notes=${String(data.reviewer_notes || '')}`);
      if ('reviewer_attest_ready' in data) parts.push(`reviewer_attest_ready=${String(data.reviewer_attest_ready)}`);
      return parts.join(' · ');
    }

    const pairs = Object.entries(data).slice(0, 3).map(([k, v]) => `${k}=${String(v)}`);
    return pairs.length ? pairs.join(' · ') : '—';
  } catch {
    return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw;
  }
}
