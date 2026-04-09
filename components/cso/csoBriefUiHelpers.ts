import type { CSOBriefStatus, ValidationViolation } from './csoBriefTypes';

export function isReadOnlyBrief(status: CSOBriefStatus): boolean {
  return status === 'APPROVED' || status === 'PUBLISHED_DRAFT';
}

export function statusChipStyles(status: CSOBriefStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/35';
    case 'IN_REVIEW':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
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
  if (status === 'IN_REVIEW' && toStatus === 'DRAFT') return true;
  if (status === 'IN_REVIEW' && toStatus === 'APPROVED') return isAdmin;
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

export function summarizeAuditDiff(raw: string): string {
  if (!raw) return '—';
  try {
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data == null) return String(raw);

    if ('status' in data && 'note' in data) {
      return `status=${String(data.status)} · note=${String(data.note || '')}`;
    }

    const pairs = Object.entries(data).slice(0, 3).map(([k, v]) => `${k}=${String(v)}`);
    return pairs.length ? pairs.join(' · ') : '—';
  } catch {
    return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw;
  }
}
