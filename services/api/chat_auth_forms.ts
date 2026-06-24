import { request } from './core';

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function sendChat(
  history: ChatMessage[],
  message: string,
): Promise<{ response: string }> {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ history, message }),
  });
}

// ── Auth & Health ───────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  auth_mode: string;
  auth_enabled: boolean;
  auth_warning: string | null;
  auth_provider?: string;
  auth_user_header?: string | null;
}

export interface AuthMeResponse {
  id: string;
  role: string;
  is_admin: boolean;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request('/api/health');
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  return request('/api/auth/me');
}

// ── Forms ────────────────────────────────────────────────────────────────────

export async function submitAssessment(
  data: object,
): Promise<{ success: boolean; ref_id: string; message: string; status: string }> {
  return request('/api/assessment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitLabVisit(
  data: object,
): Promise<{ success: boolean; ref_id: string; message: string; status: string }> {
  return request('/api/lab-visit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ServiceRequestSummary {
  ref_id: string;
  request_type: 'assessment' | 'lab_visit';
  status: string;
  created_by: string;
  contact_name: string;
  vendor_name?: string | null;
  urgency?: string | null;
  created_at: string;
}

export interface ServiceRequestDetail extends ServiceRequestSummary {
  contact_email: string;
  notes?: string | null;
  assessment_type?: string | null;
  category?: string | null;
  preferred_date?: string | null;
  preferred_slot?: string | null;
  equipment?: string | null;
  attendees?: number | null;
  status_note?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export interface StatusUpdateResponse {
  success: boolean;
  ref_id: string;
  old_status: string;
  new_status: string;
  updated_by: string;
  updated_at: string;
}

export async function fetchAdminRequests(params?: {
  status?: string;
  request_type?: string;
}): Promise<{ total: number; requests: ServiceRequestSummary[] }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.request_type) qs.set('request_type', params.request_type);
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/admin/requests${query}`);
}

export async function fetchRequestByRef(refId: string): Promise<ServiceRequestDetail> {
  return request(`/api/requests/${encodeURIComponent(refId)}`);
}

export async function updateRequestStatus(
  refId: string,
  status: string,
  note?: string,
): Promise<StatusUpdateResponse> {
  return request(`/api/admin/requests/${encodeURIComponent(refId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

