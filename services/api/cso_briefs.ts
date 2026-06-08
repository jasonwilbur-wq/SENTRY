import { request } from './core';

// ── CSO Briefs ───────────────────────────────────────────────────────────────

export type CSOBriefStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED_DRAFT';

export interface CSOBriefGenerateResponse {
  brief: any;
  included_count: number;
  candidate_count: number;
  excluded_count: number;
  exclusion_reason_counts: Record<string, number>;
  excluded_items: Array<{ competitor_event_id: number; competitor?: string | null; event_title?: string | null; readiness_issues: string[] }>;
  preflight: {
    candidate_count: number;
    included_count: number;
    excluded_count: number;
    exclusion_reason_counts: Record<string, number>;
    excluded_items: Array<{ competitor_event_id: number; competitor?: string | null; event_title?: string | null; readiness_issues: string[] }>;
  };
}

export async function generateCSOBrief(body: {
  title: string;
  period_start: string;
  period_end: string;
  filters?: { date_from?: string; date_to?: string; competitor?: string[]; max_items?: number };
}): Promise<CSOBriefGenerateResponse> {
  return request('/api/cso-briefs/generate', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchCSOBrief<T = any>(briefId: string): Promise<T> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}`);
}

export async function patchCSOBrief<T = any>(briefId: string, body: { executive_summary?: string; review_notes?: string }): Promise<T> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function patchCSOBriefItem<T = any>(briefId: string, itemId: string, body: Record<string, unknown>): Promise<T> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function validateCSOBrief<T = any>(briefId: string): Promise<T> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/validate`, { method: 'POST' });
}

export async function transitionCSOBrief<T = any>(briefId: string, body: {
  to_status: CSOBriefStatus;
  note?: string;
  reviewer_notes?: string;
  reviewer_attest_ready?: boolean;
}): Promise<T> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/transition`, { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchCSOBriefSnapshot<T = any>(briefId: string): Promise<T> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/snapshot`);
}

export async function fetchCSOBriefAudit<T = any>(briefId: string, params?: { limit?: number; offset?: number }): Promise<T> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/audit${query}`);
}

