/**
 * Centralized API client for all SENTRY backend calls.
 *
 * Dev  : Vite dev-server proxies /api/* → FastAPI on :8082 (see vite.config.ts).
 *        VITE_API_URL is empty string — all calls are relative.
 * Prod : VITE_API_URL is set to the Cloud Run backend base URL at build time.
 *        e.g.  https://sentry-api-abc123-uc.a.run.app
 *
 * NEVER hardcode localhost anywhere else in the codebase — use getDownloadUrl().
 */

// Vite types provided by vite/client reference in vite-env.d.ts
const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

/** Default request timeout in ms. Override per-call for slow endpoints (LLM). */
const DEFAULT_TIMEOUT_MS = 30_000;

// ── Auth identity (module-level, set by AuthContext) ────────────────────────
// When auth_mode is "header", every request includes X-Sentry-User.
// setSentryUser() is called once by AuthContext on mount.

let _sentryUser: string | null = null;

/** Set the current user identity for all subsequent API requests. */
export function setSentryUser(userId: string | null): void {
  _sentryUser = userId?.trim().toLowerCase() || null;
}

/** Get the current user identity (for display in UI). */
export function getSentryUser(): string | null {
  return _sentryUser;
}

/** Build auth headers based on configured identity. */
function _authHeaders(): Record<string, string> {
  if (_sentryUser) return { 'X-Sentry-User': _sentryUser };
  return {};
}

/**
 * Returns the full URL for a VAR report download via the backend proxy.
 * Works in dev (relative) and production (absolute Cloud Run URL).
 */
export function getDownloadUrl(varId: string): string {
  return `${API_BASE}/api/vars/download/${varId}`;
}

// ── CSO Briefs ───────────────────────────────────────────────────────────────

export type CSOBriefStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED_DRAFT';

export type AnalystStatus = 'unreviewed' | 'in_review' | 'decided' | 'blocked';
export type AnalystDecision =
  | 'accept_recommendation'
  | 'include_in_brief'
  | 'escalate_for_review'
  | 'request_additional_evidence'
  | 'monitor_only'
  | 'hold'
  | 'dismiss';

export interface CSOBriefItem {
  id: string;
  brief_id: string;
  competitor_event_id: number;
  rank: number;
  analyst_commentary: string;
  uncertainty_note: string;
  owner_assignment: string;
  include_in_summary: number;
  analyst_status: AnalystStatus;
  analyst_decision: string;
  analyst_note: string;
  analyst_decided_at: string | null;
  analyst_decision_source: string;
  frozen_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CSOBrief {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: CSOBriefStatus;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_notes: string;
  reviewer_attestation: string;
  changes_requested_at: string | null;
  changes_requested_by: string | null;
  changes_requested_reason: string;
  approved_at: string | null;
  approved_by: string | null;
  published_draft_at: string | null;
  published_draft_by: string | null;
  executive_summary: string;
  review_notes: string;
  quality_gate_result: string;
  snapshot_version: number;
  items: CSOBriefItem[];
}

export interface ValidationViolation {
  code: string;
  message: string;
  item_id: string | null;
  field: string | null;
}

export interface ValidationResult {
  passed: boolean;
  violations: ValidationViolation[];
  checked_at: string;
  included_item_count: number;
}

export interface CSOBriefTransitionResponse {
  brief: CSOBrief;
  from_status: CSOBriefStatus;
  to_status: CSOBriefStatus;
  transitioned_by: string;
  validation: ValidationResult | null;
  decision_action: string | null;
}

export interface CSOBriefSnapshotItem {
  rank: number;
  competitor: string;
  event_title: string;
  event_date: string | null;
  category: string | null;
  source_link: string | null;
  priority_tier: string | null;
  triage_status: string | null;
  walmart_relevance_score: number | null;
  confidence_level: string | null;
  why_walmart_cares: string | null;
  walmart_actionability_context: string | null;
  correlation_summary: string | null;
  detailed_description: string | null;
  security_implication: string | null;
  analyst_commentary: string;
  uncertainty_note: string;
  owner_assignment: string;
  include_in_summary: number;

  // Actionable-intelligence decision model
  decision_title?: string | null;
  decision_summary?: string | null;
  evidence_reference?: string | null;
  rationale?: string | null;
  confidence?: string | null;
  severity?: string | null;
  likelihood?: string | null;
  impact_score?: number | null;
  likelihood_score?: number | null;
  priority_score?: number | null;
  recommended_action?: string | null;
  reason_codes?: string[];
  explanation?: string | null;
  actionable_now?: number;
  readiness_blocked?: number;
  scoring_version?: string | null;
  decision_model_version?: string | null;
  analyst_status?: AnalystStatus;
  analyst_decision?: string;
  analyst_note?: string;
  analyst_decided_at?: string | null;
  analyst_decision_source?: string;
}

export interface CSOBriefSnapshot {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: CSOBriefStatus;
  executive_summary: string;
  review_notes: string;
  banner: string;
  footer: string;
  items: CSOBriefSnapshotItem[];
  snapshot_version: number;
  generated_at: string;
}

export interface CSOBriefAuditEntry {
  id: number;
  brief_id: string;
  action: string;
  actor_id: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface CSOBriefAuditResponse {
  entries: CSOBriefAuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface CSOBriefGenerateFilters {
  date_from?: string;
  date_to?: string;
  competitor?: string[];
  max_items?: number;
}

export interface CSOBriefGenerateRequest {
  title: string;
  period_start: string;
  period_end: string;
  filters?: CSOBriefGenerateFilters;
}

export interface CSOBriefExcludedItemSummary {
  competitor_event_id: number;
  competitor: string | null;
  event_title: string | null;
  readiness_issues: string[];
}

export interface CSOBriefGeneratePreflightSummary {
  candidate_count: number;
  included_count: number;
  excluded_count: number;
  exclusion_reason_counts: Record<string, number>;
  excluded_items: CSOBriefExcludedItemSummary[];
}

export interface CSOBriefGenerateResponse {
  brief: CSOBrief;
  included_count: number;
  candidate_count: number;
  excluded_count: number;
  exclusion_reason_counts: Record<string, number>;
  excluded_items: CSOBriefExcludedItemSummary[];
  preflight: CSOBriefGeneratePreflightSummary;
}

export async function generateCSOBrief(
  payload: CSOBriefGenerateRequest,
): Promise<CSOBriefGenerateResponse> {
  return request('/api/cso-briefs/generate', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      filters: payload.filters ?? {},
    }),
  });
}

export async function fetchCSOBrief(briefId: string): Promise<CSOBrief> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}`);
}

export async function patchCSOBrief(
  briefId: string,
  payload: { executive_summary?: string; review_notes?: string },
): Promise<CSOBrief> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function patchCSOBriefItem(
  briefId: string,
  itemId: string,
  payload: {
    rank?: number;
    owner_assignment?: string;
    analyst_commentary?: string;
    uncertainty_note?: string;
    include_in_summary?: number;
    analyst_status?: AnalystStatus;
    analyst_decision?: AnalystDecision;
    analyst_note?: string;
    analyst_decision_source?: string;
  },
): Promise<CSOBriefItem> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function validateCSOBrief(briefId: string): Promise<ValidationResult> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/validate`, {
    method: 'POST',
  });
}

export async function transitionCSOBrief(
  briefId: string,
  payload: {
    to_status: CSOBriefStatus;
    note?: string;
    reviewer_notes?: string;
    reviewer_attest_ready?: boolean;
  },
): Promise<CSOBriefTransitionResponse> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/transition`, {
    method: 'POST',
    body: JSON.stringify({
      to_status: payload.to_status,
      note: payload.note ?? '',
      reviewer_notes: payload.reviewer_notes ?? '',
      reviewer_attest_ready: payload.reviewer_attest_ready ?? false,
    }),
  });
}

export async function fetchCSOBriefSnapshot(briefId: string): Promise<CSOBriefSnapshot> {
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/snapshot`);
}

export async function fetchCSOBriefAudit(
  briefId: string,
  params?: { limit?: number; offset?: number },
): Promise<CSOBriefAuditResponse> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.offset != null) qs.set('offset', String(params.offset));
  const q = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/api/cso-briefs/${encodeURIComponent(briefId)}/audit${q}`);
}

// ── Health & Auth verification ──────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  auth_mode: string;
  auth_enabled: boolean;
  auth_warning: string | null;
}

export interface AuthMeResponse {
  id: string;
  role: string;
  is_admin: boolean;
}

/** Fetch backend health + auth posture (public, no auth required). */
export async function fetchHealth(): Promise<HealthResponse> {
  return request('/api/health');
}

/** Verify the current user identity against the backend. */
export async function fetchAuthMe(): Promise<AuthMeResponse> {
  return request('/api/auth/me');
}

async function request<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: HeadersInit = {
      ..._authHeaders(),
      ...(fetchOptions.method && fetchOptions.method !== 'GET'
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...fetchOptions.headers,
    };
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers: { ...headers, ...fetchOptions.headers },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timerId);
  }
}

// ── Vendors ────────────────────────────────────────────────────────────────────

export interface VendorProduct {
  report_url: string;
  technology_product: string;
  overall_rating: number;
  vendor_status: string;
  last_assessed: string;
}

export interface VarScores {
  Overall?: number;
  Compliance?: number;
  Risk?: number;
  Maturity?: number;
  Integration?: number;
  ROI?: number;
  Viability?: number;
  Differentiation?: number;
  "Cloud Dep"?: number;
}

export interface LinkedProject {
  project_id: string;
  project_name: string;
  current_phase: string;
  est_phase_index: number;
  role: string;
  status: string;
}

export interface Vendor {
  id: string;
  company_name: string;
  company_url: string;
  category: string;
  technology_product: string;
  report_url: string;
  overall_rating: number;
  vendor_status: string;
  last_assessed: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  has_var: boolean;
  var_count: number;              // Total VAR reports linked to this vendor
  latest_var_id: string | null;   // Phase 2 — null when vendor has no VARs yet
  all_products: VendorProduct[];
  
  // Extended Insights
  description?: string;
  founded_year?: string;
  hq_location?: string;
  business_owner?: string;
  sourcing_manager?: string;
  deployment_status?: string;
  hosting_type?: string;
  data_classification?: string;
  var_scores?: VarScores;
  
  // Enhanced Vendor Details (Phase 2.5 — 202601/202602 import)
  vendor_highlight?: string;
  pros?: string;
  cons?: string;
  concerns?: string;
  use_cases?: string;
  value_to_walmart?: string;
  maturity_level?: string;

  // Project associations
  linked_projects?: LinkedProject[];
}

export interface VendorsParams {
  category?: string;
  search?: string;
  risk_level?: string;
  has_var?: 'yes' | 'no' | '';
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface VendorsResponse {
  total: number;       // total matched vendors (across all pages)
  page: number;        // current page (1-based)
  page_size: number;   // vendors per page
  total_pages: number; // ceil(total / page_size)
  vendors: Vendor[];
}

export async function fetchVendors(params?: VendorsParams): Promise<VendorsResponse> {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== 'All') qs.set('category', params.category);
  if (params?.search)     qs.set('search',     params.search);
  if (params?.risk_level) qs.set('risk_level', params.risk_level);
  if (params?.has_var)    qs.set('has_var',    params.has_var);
  if (params?.sort)       qs.set('sort',       params.sort);
  if (params?.page)       qs.set('page',       String(params.page));
  if (params?.page_size)  qs.set('page_size',  String(params.page_size));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/vendors${query}`);
}

export async function fetchCategories(): Promise<{ categories: string[]; category_counts: Record<string, number> }> {
  return request('/api/vendors/categories');
}

export async function fetchVendorById(vendorId: string): Promise<Vendor> {
  return request(`/api/vendors/${vendorId}`);
}

// ── VAR Reports ────────────────────────────────────────────────────────────────

export interface VarReport {
  id: string;
  vendor_id: string;
  filename: string;
  sharepoint_url: string;
  report_date: string;
  report_version: string;
  report_type: string;
  overall_score: number | null;
  decision_band: string;
  compliance_score: number | null;
  risk_score: number | null;
  maturity_score: number | null;
  integration_score: number | null;
  roi_score: number | null;
  viability_score: number | null;
  differentiation_score: number | null;
  cloud_dep_score: number | null;
  match_method: string;
  created_at: string;
}

export async function fetchVendorVarReports(
  vendorId: string,
): Promise<{ total: number; reports: VarReport[] }> {
  return request(`/api/vendors/${vendorId}/var-reports`);
}

// ── Assessment Highlights ───────────────────────────────────────────────────

export interface Highlight {
  id: string;
  vendor_id: string;
  source_file: string;
  assessment_date: string;
  product_name: string;
  pre_assessment_score: number | null;
  pre_assessment_decision: string;
  maturity_level: string;
  initial_assessment: string;
  technical_assessment: string;
}

export async function fetchVendorHighlights(
  vendorId: string,
): Promise<{ total: number; highlights: Highlight[] }> {
  return request(`/api/vendors/${vendorId}/highlights`);
}

// ── Tech Pipeline ─────────────────────────────────────────────────────

export interface TechProduct {
  product_name: string;
  assessment_date: string;
  source_file: string;
  pre_assessment_score: number | null;
  pre_assessment_decision: string;
  maturity_level: string;
  initial_assessment: string;
  technical_assessment: string;
  has_var: boolean;
  pipeline_stage: 0 | 1 | 2 | 3 | 4;
}

export interface TechPipelineSummary {
  total_products: number;
  technically_assessed: number;
  initial_pass: number;
  initial_fail: number;
  initial_pending: number;
  max_pipeline_stage: number;
}

export interface TechPipeline {
  vendor_id: string;
  has_pipeline_data: boolean;
  has_var: boolean;
  summary: TechPipelineSummary;
  products: TechProduct[];
}

export async function fetchVendorTechPipeline(
  vendorId: string,
): Promise<TechPipeline> {
  return request(`/api/vendors/${vendorId}/tech-pipeline`);
}

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
    timeoutMs: 60_000, // LLM responses can be slow
  });
}

// ── Incident Intelligence ───────────────────────────────────────────────

import type {
  IncidentStats, IncidentListResponse, IncidentFilters, MorningBrief
} from '../types';

export async function fetchIncidentStats(): Promise<IncidentStats> {
  return request('/api/incidents/stats');
}

export interface IncidentQuery {
  severity?: string;
  type?: string;
  region?: string;
  q?: string;
  date_from?: string;
  date_to?: string;
  sort?: 'date' | 'severity' | 'type';
  page?: number;
  page_size?: number;
}

export async function fetchIncidents(query: IncidentQuery = {}): Promise<IncidentListResponse> {
  const params = new URLSearchParams();
  if (query.severity)  params.set('severity', query.severity);
  if (query.type)      params.set('type', query.type);
  if (query.region)    params.set('region', query.region);
  if (query.q)         params.set('q', query.q);
  if (query.date_from) params.set('date_from', query.date_from);
  if (query.date_to)   params.set('date_to', query.date_to);
  if (query.sort)      params.set('sort', query.sort);
  if (query.page)      params.set('page', String(query.page));
  if (query.page_size) params.set('page_size', String(query.page_size));
  const qs = params.toString();
  return request(`/api/incidents${qs ? '?' + qs : ''}`);
}

export async function fetchIncidentFilters(): Promise<IncidentFilters> {
  return request('/api/incidents/filters');
}

// ── Morning Brief ───────────────────────────────────────────────────────

export async function fetchMorningBrief(): Promise<MorningBrief> {
  return request('/api/morning-brief');
}

// ── Forms ────────────────────────────────────────────────────────────────────

export async function submitAssessment(
  data: object,
): Promise<{ success: boolean; ref_id: string; message: string }> {
  return request('/api/assessment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitLabVisit(
  data: object,
): Promise<{ success: boolean; ref_id: string; message: string }> {
  return request('/api/lab-visit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Admin Request Queue ──────────────────────────────────────────────────────

export interface ServiceRequestSummary {
  ref_id: string;
  request_type: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  contact_name: string;
  urgency: string | null;
  vendor_name: string | null;
}

export interface ServiceRequestListResponse {
  total: number;
  requests: ServiceRequestSummary[];
}

export interface ServiceRequestDetail {
  id: string;
  ref_id: string;
  request_type: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  status_note: string;
  contact_name: string;
  contact_email: string;
  notes: string;
  vendor_name: string | null;
  assessment_type: string | null;
  category: string | null;
  urgency: string | null;
  preferred_date: string | null;
  preferred_slot: string | null;
  equipment: string | null;
  attendees: number | null;
}

export interface StatusUpdateResponse {
  ref_id: string;
  old_status: string;
  new_status: string;
  updated_by: string;
  updated_at: string;
}

/** Fetch admin request queue with optional filters. */
export async function fetchAdminRequests(
  filters?: { status?: string; request_type?: string },
): Promise<ServiceRequestListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.request_type) params.set('request_type', filters.request_type);
  const qs = params.toString();
  return request(`/api/admin/requests${qs ? '?' + qs : ''}`);
}

/** Fetch a single request by ref_id (requires auth — admin or owner). */
export async function fetchRequestByRef(
  refId: string,
): Promise<ServiceRequestDetail> {
  return request(`/api/requests/${encodeURIComponent(refId)}`);
}

/** Admin: update request status. */
export async function updateRequestStatus(
  refId: string,
  status: string,
  note?: string,
): Promise<StatusUpdateResponse> {
  return request(`/api/admin/requests/${encodeURIComponent(refId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note: note ?? '' }),
  });
}

// ── Public Stats ─────────────────────────────────────────────────────────────────────────

export interface CategoryStat {
  category: string;
  count: number;
  avg_rating: number;
}

export interface DirectoryStats {
  total_vendors: number;
  total_vars: number;
  vendors_with_var: number;
  var_coverage_pct: number;
  avg_rating: number;
  recently_assessed: number;
  risk_distribution: Record<string, number>;
  top_categories: CategoryStat[];
  decision_bands: Record<string, number>;
}

export async function fetchStats(): Promise<DirectoryStats> {
  return request('/api/stats');
}

// ── Admin ────────────────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_vendors: number;
  total_vars: number;
  scored_vars: number;
  unscored_vars: number;
  vendors_with_var: number;
  vendors_without_var: number;
  decision_band_counts: Record<string, number>;
  extraction_coverage_pct: number;
}

export type ExtractionReviewStatus =
  | 'NOT_EXTRACTED'
  | 'EXTRACTED_PENDING_REVIEW'
  | 'REVIEWED_ACCEPTED'
  | 'REVIEWED_REJECTED';

export interface VarAdminRow {
  id: string;
  vendor_id: string;
  company_name: string;
  filename: string;
  sharepoint_url: string;
  report_date: string;
  match_method: string;
  overall_score: number | null;
  decision_band: string;
  compliance_score: number | null;
  risk_score: number | null;
  maturity_score: number | null;
  integration_score: number | null;
  roi_score: number | null;
  viability_score: number | null;
  differentiation_score: number | null;
  cloud_dep_score: number | null;
  extraction_review_status: ExtractionReviewStatus;
  extraction_reviewed_by: string;
  extraction_reviewed_at: string;
  extraction_review_note: string;
  extraction_last_run_at: string;
  extraction_last_status: string;
  has_scores: boolean;
  item_id: string;
}

export interface VarListResponse {
  total: number;
  scored: number;
  unscored: number;
  page: number;
  page_size: number;
  total_pages: number;
  vars: VarAdminRow[];
}

export type ExtractionStatus =
  | 'SUCCESS'
  | 'MISSING_ITEM_ID'
  | 'AUTH_UNAVAILABLE'
  | 'DOWNLOAD_FAILED'
  | 'PARSE_FAILED'
  | 'WRITE_BLOCKED'
  | 'WRITE_FAILED'
  | 'NOT_FOUND';

export interface ExtractResult {
  var_id: string;
  filename: string;
  success: boolean;
  status: ExtractionStatus;
  overall_score: number | null;
  decision_band: string;
  confidence: number | null;
  requires_review: boolean;
  extracted_dimensions: number;
  error: string;
}

export interface BatchExtractResponse {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  status_counts: Record<string, number>;
  results: ExtractResult[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return request('/api/admin/stats');
}

export async function fetchAdminVars(
  params?: { page?: number; page_size?: number; search?: string; scored?: 'yes' | 'no' | '' }
): Promise<VarListResponse> {
  const qs = new URLSearchParams();
  if (params?.page)      qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  if (params?.search)    qs.set('search', params.search);
  if (params?.scored)    qs.set('scored', params.scored);
  const q = qs.toString() ? `?${qs}` : '';
  return request(`/api/admin/vars${q}`);
}

export async function extractVarScores(varId: string): Promise<ExtractResult> {
  return request(`/api/admin/vars/${varId}/extract-scores`, { method: 'POST' });
}

export async function extractBatch(
  limit?: number,
  overwrite?: boolean,
): Promise<BatchExtractResponse> {
  const qs = new URLSearchParams();
  if (limit !== undefined) qs.set('limit', String(limit));
  if (overwrite)            qs.set('overwrite', 'true');
  const q = qs.toString() ? `?${qs}` : '';
  return request(`/api/admin/vars/extract-batch${q}`, { method: 'POST' });
}

export async function linkVarToVendor(
  varId: string,
  vendorId: string,
): Promise<{ success: boolean; company_name: string }> {
  return request(`/api/admin/vars/${varId}/link`, {
    method: 'PATCH',
    body: JSON.stringify({ vendor_id: vendorId }),
  });
}

export interface VarReviewQueueRow {
  id: string;
  vendor_id: string;
  company_name: string;
  filename: string;
  overall_score: number | null;
  decision_band: string;
  extraction_review_status: ExtractionReviewStatus;
  extraction_last_status: string;
  extraction_last_run_at: string;
  extraction_reviewed_by: string;
  extraction_reviewed_at: string;
  extraction_review_note: string;
}

export interface VarReviewQueueResponse {
  total: number;
  items: VarReviewQueueRow[];
}

export async function fetchVarReviewQueue(limit = 100): Promise<VarReviewQueueResponse> {
  return request(`/api/admin/vars/review-queue?limit=${limit}`);
}

export async function reviewVarExtraction(
  varId: string,
  action: 'ACCEPT' | 'REJECT',
  note = '',
): Promise<VarReviewQueueRow> {
  return request(`/api/admin/vars/${varId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ action, note }),
  });
}

export async function searchVendorsForLinking(
  q: string,
): Promise<{ results: { id: string; company_name: string; category: string }[] }> {
  return request(`/api/admin/vendors/search?q=${encodeURIComponent(q)}`);
}

// ── Competitor Intelligence ───────────────────────────────────────────────────

export interface CompetitorStats {
  total: number;
  cyber: number;
  orc: number;
  recall: number;
  legal: number;
  strategic: number;
  competitor_count: number;
}

export interface CompetitorEntity {
  name: string;
  event_count: number;
  cyber_count: number;
  orc_count: number;
  recall_count: number;
  legal_count: number;
  strategic_count: number;
  threat_level: 'High' | 'Medium' | 'Low';
  top_category: string | null;
  categories_json: string;
  monthly_json: string;
}

export type CompetitorTriageStatus = 'UNREVIEWED' | 'REVIEWED' | 'DISMISSED' | 'ESCALATED';

export interface CompetitorEvent {
  id: number;
  event_date: string | null;
  competitor: string;
  event_title: string | null;
  event_type: string | null;
  category: string;
  location: string | null;
  security_implication: string | null;
  operational_impact: string | null;
  financial_impact: string | null;
  reputational_impact: string | null;
  detailed_description: string | null;
  analyst_notes: string | null;
  source_link: string | null;
  source_month: string | null;
  confidence_level?: string | null;
  walmart_relevance_score?: number | null;
  priority_tier?: string | null;
  signal_type?: string | null;
  recommended_owner?: string | null;
  why_walmart_cares?: string | null;
  strategic_score?: number | null;
  security_score?: number | null;
  operational_score?: number | null;
  customer_trust_score?: number | null;
  novelty_score?: number | null;
  urgency_score?: number | null;
  confidence_score?: number | null;
  escalate_to_cso?: number | null;
  score_reason?: string | null;
  confidence_effect?: string | null;
  source_effect?: string | null;
  cso_candidate_reason?: string | null;
  scoring_version?: string | null;
  scored_at?: string | null;
  triage_status?: CompetitorTriageStatus | null;
  triaged_by?: string | null;
  triaged_at?: string | null;
  triage_note?: string | null;
  matched_vendor_id?: string | null;
  matched_vendor_name?: string | null;
  match_method?: string | null;
  match_label?: string | null;
  match_confidence?: number | null;
  match_explanation?: string | null;
  linked_active_projects_count?: number;
  linked_projects?: Array<{
    project_id: string;
    project_name: string;
    lifecycle_state: string;
    current_phase: string;
    est_phase_index: number;
    vendor_link_status: string;
    vendor_role: string;
  }>;
  correlation_status?: 'MATCHED' | 'AMBIGUOUS' | 'NO_MATCH' | null;
  candidate_vendor_names?: string[];
  walmart_actionability_context?: string | null;
  correlation_summary?: string | null;
  is_brief_ready?: boolean;
  readiness_issues?: string[];
  readiness_warnings?: string[];
  readiness_required_fields?: string[];
}

export interface CompetitorScoreDistribution {
  unscored: number;
  archive_low_signal: number;
  analyst_follow_up: number;
  leadership_watch: number;
  cso_brief: number;
}

export interface CompetitorScoringSummary {
  total: number;
  cso_candidates: number;
  avg_score: number;
  distribution: CompetitorScoreDistribution;
}

export interface CompetitorEventCreate {
  event_date: string;
  competitor: string;
  event_title: string;
  event_type?: string;
  category: string;
  location?: string;
  security_implication?: string;
  operational_impact?: string;
  financial_impact?: string;
  reputational_impact?: string;
  detailed_description?: string;
  analyst_notes?: string;
  source_link?: string;
  source_month?: string;
  confidence_level?: string;
}

export interface CompetitorEventUpdate {
  event_date?: string;
  competitor?: string;
  event_title?: string;
  event_type?: string;
  category?: string;
  location?: string;
  security_implication?: string;
  operational_impact?: string;
  financial_impact?: string;
  reputational_impact?: string;
  detailed_description?: string;
  analyst_notes?: string;
  source_link?: string;
  source_month?: string;
  confidence_level?: string;
}

export interface CompetitorEventsResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  events: CompetitorEvent[];
}

export interface CompetitorTriageQueueResponse {
  total: number;
  items: CompetitorEvent[];
}

/** @deprecated Use CompetitorEventsResponse — identical shape. */
export type CompetitorEventsListResponse = CompetitorEventsResponse;

export interface CompetitorMonthly {
  months: string[];
  series: Record<string, number[]>;
}

export interface CompetitorHeatmap {
  competitors: string[];
  categories: string[];
  matrix: number[][];
}

export async function fetchCompetitorStats(): Promise<CompetitorStats> {
  return request('/api/competitors/stats');
}

export async function fetchCompetitorEntities(
  limit = 20,
): Promise<{ entities: CompetitorEntity[] }> {
  return request(`/api/competitors/entities?limit=${limit}`);
}

export async function fetchCompetitorMonthly(
  top = 5,
): Promise<CompetitorMonthly> {
  return request(`/api/competitors/monthly?top=${top}`);
}

export async function fetchCompetitorHeatmap(
  top = 10,
): Promise<CompetitorHeatmap> {
  return request(`/api/competitors/heatmap?top=${top}`);
}

export async function fetchCompetitorEvents(params?: {
  competitor?: string;
  category?: string;
  month?: string;
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<CompetitorEventsResponse> {
  const qs = new URLSearchParams();
  if (params?.competitor) qs.set('competitor', params.competitor);
  if (params?.category)   qs.set('category',   params.category);
  if (params?.month)      qs.set('month',       params.month);
  if (params?.q)          qs.set('q',           params.q);
  if (params?.page)       qs.set('page',        String(params.page));
  if (params?.page_size)  qs.set('page_size',   String(params.page_size));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/competitors/events${query}`);
}

export async function fetchCompetitorCategories(): Promise<{ categories: string[] }> {
  return request('/api/competitors/categories');
}

export async function fetchCompetitorCSOCandidates(
  limit = 25,
): Promise<{ count: number; events: CompetitorEvent[] }> {
  return request(`/api/competitors/cso-candidates?limit=${limit}`);
}

export async function fetchAdminCompetitorScoringSummary(): Promise<CompetitorScoringSummary> {
  return request('/api/admin/competitor-events/scoring-summary');
}

export async function fetchAdminCompetitorTriageQueue(params?: {
  triage_status?: CompetitorTriageStatus;
  priority_tier?: string;
  limit?: number;
}): Promise<CompetitorTriageQueueResponse> {
  const qs = new URLSearchParams();
  if (params?.triage_status) qs.set('triage_status', params.triage_status);
  if (params?.priority_tier) qs.set('priority_tier', params.priority_tier);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/admin/competitor-events/triage-queue${query}`);
}

export async function triageAdminCompetitorEvent(
  eventId: number,
  triage_status: CompetitorTriageStatus,
  triage_note = '',
): Promise<CompetitorEvent> {
  return request(`/api/admin/competitor-events/${eventId}/triage`, {
    method: 'PATCH',
    body: JSON.stringify({ triage_status, triage_note }),
  });
}

export async function rescoreCompetitorEvents(params?: {
  limit?: number;
  only_unscored?: boolean;
  preserve_manual?: boolean;
}): Promise<{
  success: boolean;
  updated: number;
  skipped_manual: number;
  enrichment_field_updates: number;
  cso_escalation_candidates: number;
  before: CompetitorScoreDistribution;
  after: CompetitorScoreDistribution;
  promoted: Array<{
    id: number;
    competitor: string;
    event_title: string;
    from_tier: string;
    to_tier: string;
    score: number;
  }>;
}> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.only_unscored !== undefined) qs.set('only_unscored', String(params.only_unscored));
  if (params?.preserve_manual !== undefined) qs.set('preserve_manual', String(params.preserve_manual));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/admin/competitor-events/rescore${query}`, { method: 'POST' });
}

export async function backfillCompetitorBriefReadiness(params?: {
  limit?: number;
  only_missing?: boolean;
}): Promise<{
  success: boolean;
  processed_rows: number;
  updated_rows: number;
  field_updates: number;
  warnings_total: number;
  brief_ready_before: number;
  brief_ready_after: number;
  brief_ready_delta: number;
  field_coverage_before: Record<string, number>;
  field_coverage_after: Record<string, number>;
  skipped_rows: number;
  skipped_reasons: Record<string, number>;
  updated_ids: number[];
}> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.only_missing !== undefined) qs.set('only_missing', String(params.only_missing));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/admin/competitor-events/backfill-brief-readiness${query}`, { method: 'POST' });
}

// ── Regulatory Intelligence ──────────────────────────────────────────────────

export interface RegulatorySummary {
  stats: {
    total_obligations: number;
    red: number;
    amber: number;
    yellow: number;
    green: number;
    enacted: number;
    proposed: number;
    tech_breakdown: Record<string, number>;
  };
  [key: string]: unknown;
}

export async function fetchRegulatorySummary(): Promise<RegulatorySummary> {
  return request('/api/regulatory/summary');
}

export interface RegulatoryGeoJurisdiction {
  jurisdiction: string;
  total: number;
  red: number;
  amber: number;
  yellow: number;
  green: number;
  worst_rag: string;
  techs: string[];
}

export async function fetchRegulatoryGeo(): Promise<{ jurisdictions: RegulatoryGeoJurisdiction[]; total: number }> {
  return request('/api/regulatory/geo');
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectListItem {
  project_id: string;
  project_name: string;
  lifecycle_state: string;
  health: string;
  est_phase_index: number;
}

export async function fetchProjects(): Promise<{ projects: ProjectListItem[]; total: number }> {
  return request('/api/projects');
}