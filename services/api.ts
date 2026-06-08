/**
 * Centralized API client for all SENTRY backend calls.
 *
 * Dev  : If VITE_API_URL is set, requests go directly to that backend URL.
 *        Otherwise calls stay relative and Vite proxy handles /api/*.
 * Prod : VITE_API_URL can point at Cloud Run, or remain empty when Firebase
 *        hosting rewrites /api/* to the backend service.
 *
 * NEVER hardcode localhost anywhere else in the codebase — use getDownloadUrl().
 */

import { trackEvent } from './analytics';

const VITE_ENV = (import.meta as any).env ?? {};

/**
 * API base resolution (single source of truth):
 * 1) If VITE_API_URL is set, always use it (dev + prod).
 * 2) Otherwise fall back to relative paths so Vite/Firebase proxy can handle /api.
 */
const RAW_API_BASE = String(VITE_ENV.VITE_API_URL ?? '').trim();
const IS_LOCAL_DEV_ORIGIN = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE: string = IS_LOCAL_DEV_ORIGIN ? '' : (RAW_API_BASE || '');

let sentryUserHeader: string | null = null;

export function setSentryUser(userId: string | null): void {
  const trimmed = userId?.trim();
  sentryUserHeader = trimmed ? trimmed : null;
}

function buildHeaders(extraHeaders?: HeadersInit): Headers {
  const headers = new Headers(extraHeaders ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (sentryUserHeader) {
    headers.set('X-Sentry-User', sentryUserHeader);
  }
  return headers;
}

/**
 * Returns the full URL for a VAR report download via the backend proxy.
 * Works in dev (relative) and production (absolute Cloud Run URL).
 */
export function getDownloadUrl(varId: string): string {
  return `${API_BASE}/api/vars/download/${varId}`;
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options?.headers),
  });
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  const startedAt = performance.now();

  const doFetch = async (base: string): Promise<T> => {
    const controller = new AbortController();
    const timeoutMs = 12000;
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: buildHeaders(options?.headers),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`API ${res.status}: ${text}`);
      }

      return res.json() as Promise<T>;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  try {
    const data = await doFetch(API_BASE);
    const durationMs = Math.round(performance.now() - startedAt);
    trackEvent('api_request_succeeded', {
      path,
      method,
      status: 200,
      duration_ms: durationMs,
      api_base: API_BASE || 'relative',
    });
    return data;
  } catch (error) {
    const isHttpError = error instanceof Error && error.message.startsWith('API ');

    // Fallback: if VITE_API_URL is set but unreachable, try relative /api path
    // so Vite/Firebase proxy can still serve data.
    if (!isHttpError && API_BASE) {
      try {
        const fallbackData = await doFetch('');
        const durationMs = Math.round(performance.now() - startedAt);
        trackEvent('api_request_fallback_succeeded', {
          path,
          method,
          duration_ms: durationMs,
          failed_api_base: API_BASE,
        });
        return fallbackData;
      } catch {
        // Continue to canonical error tracking below.
      }
    }

    const durationMs = Math.round(performance.now() - startedAt);
    trackEvent(isHttpError ? 'api_request_failed' : 'api_request_exception', {
      path,
      method,
      duration_ms: durationMs,
      message: error instanceof Error ? error.message : 'Unknown error',
      api_base: API_BASE || 'relative',
    });

    throw error;
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
  latest_var_id: string;   // Phase 2 — used for /api/vars/download/{id}
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
  var_weight_score?: number | null;
  var_decision_band?: string;
  var_decision_path?: string;
  
  // Enhanced Vendor Details (Phase 2.5 — 202601/202602 import)
  vendor_highlight?: string;
  pros?: string;
  cons?: string;
  concerns?: string;
  use_cases?: string;
  value_to_walmart?: string;
  maturity_level?: string;

  // Source-backed vendor assessment profile fields from Desktop SENTRY 00_System
  report_count?: number;
  dominant_domain?: string;
  secondary_domains?: string;
  top_semantic_tags?: string;
  top_stakeholder_tags?: string;
  sample_report_path?: string;
}

export interface VendorsParams {
  category?: string;
  search?: string;
  risk?: 'Low' | 'Medium' | 'High' | 'Critical';
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
  if (params?.search)    qs.set('search',    params.search);
  if (params?.risk)      qs.set('risk',      params.risk);
  if (params?.page)      qs.set('page',      String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/vendors${query}`);
}

export async function fetchCategories(): Promise<{ categories: string[] }> {
  return request('/api/vendors/categories');
}

export async function fetchVendorById(vendorId: string): Promise<Vendor> {
  return request(`/api/vendors/${vendorId}`);
}

export interface VendorAssessmentOpsItem {
  vendor_folder: string;
  dominant_domain: string;
  latest_modified_utc?: string;
  report_count: number;
  top_semantic_tags?: string;
  secondary_domains?: string;
  top_stakeholder_tags?: string;
  sample_report_path?: string;
}

export interface VendorAssessmentOverview {
  source: {
    operational_mode: string;
    operational_source: string;
    vendor_assessments_root: string;
    intake_root: string;
    sqlite_memory: string;
    vendor_profiles_csv: string;
    executive_views_root: string;
    available: Record<string, boolean>;
  };
  stats: {
    vendor_profiles_total: number;
    domain_counts: Record<string, number>;
    unknown_domain_profiles: number;
    active_intake_items: number;
    ready_for_approval: number;
    review_then_approval: number;
    hold_in_intake: number;
    recent_additions_count: number;
    multi_domain_watchlist_count: number;
  };
  process: {
    intake_rule: string;
    routing_rule: string;
    persistence_rule: string;
    safety_rule: string;
  };
  recent_additions: VendorAssessmentOpsItem[];
  multi_domain_watchlist: VendorAssessmentOpsItem[];
  domain_leaders: Record<string, VendorAssessmentOpsItem[]>;
  raw_counts: {
    intake_recommendations: number;
    intake_action_plan_rows: number;
  };
}

export interface VendorAssessmentArtifact {
  filename: string;
  current_path: string;
  subfolder?: string;
  extension?: string;
  artifact_role?: string;
  primary_domain?: string;
  technology_tags?: string;
  human_browse_group?: string;
  ai_access_priority?: string;
  enrichment_confidence?: string;
  status_label?: string;
  size_bytes?: number;
  modified_utc?: string;
  sha256?: string;
}

export interface VendorAssessmentEvidence {
  vendor_id: string;
  vendor_folder: string;
  vendor_normalized_key: string;
  source: {
    operational_mode: string;
    vendor_assessments_root: string;
    vendor_profiles_csv: string;
    enriched_inventory_csv: string;
    system_root: string;
    source_run_label?: string;
    source_run_timestamp_utc?: string;
    source_actor_id?: string;
  };
  profile: {
    report_count: number;
    dominant_domain: string;
    dominant_domain_label: string;
    secondary_domains?: string;
    top_semantic_tags?: string;
    top_stakeholder_tags?: string;
    latest_modified_utc?: string;
    sample_report_path?: string;
  };
  summary: {
    artifact_count: number;
    total_size_bytes: number;
    artifact_role_counts: Record<string, number>;
    extension_counts: Record<string, number>;
    priority_counts: Record<string, number>;
  };
  artifacts: VendorAssessmentArtifact[];
}

export async function fetchVendorAssessmentEvidence(
  vendorId: string,
  artifactLimit = 25,
): Promise<VendorAssessmentEvidence> {
  return request(`/api/vendor-assessment/vendors/${encodeURIComponent(vendorId)}/evidence?artifact_limit=${artifactLimit}`);
}

export async function fetchVendorAssessmentOverview(params?: {
  recent_limit?: number;
  watchlist_limit?: number;
  leaders_limit?: number;
}): Promise<VendorAssessmentOverview> {
  const qs = new URLSearchParams();
  if (params?.recent_limit) qs.set('recent_limit', String(params.recent_limit));
  if (params?.watchlist_limit) qs.set('watchlist_limit', String(params.watchlist_limit));
  if (params?.leaders_limit) qs.set('leaders_limit', String(params.leaders_limit));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/vendor-assessment/overview${query}`);
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
  has_var_scored: boolean;
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
  has_var_scored: boolean;
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
  });
}

// ── Auth & Health ───────────────────────────────────────────────────────────

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

// ── Portfolio posture (CSO Executive Risk Posture) ──────────────────

export interface PortfolioTopRisk {
  id: string;
  company_name: string;
  category: string;
  risk_level: string;
  score: number | null;
}

export interface PortfolioPostureResponse {
  total: number;
  scored: number;
  coverage_pct: number;
  mean_score: number | null;
  portfolio_grade: string;
  grade_bands: Record<string, number>;
  risk_levels: Record<string, number>;
  elevated_risk: number;
  decision_bands: Record<string, number>;
  top_risks: PortfolioTopRisk[];
}

/** Full-portfolio posture across ALL vendors (not just the current page). */
export async function fetchPortfolioPosture(): Promise<PortfolioPostureResponse> {
  return request('/api/portfolio/posture');
}

// ── Cross-domain intelligence digest (dashboard brief) ──────────────

export interface IntelAttentionItem {
  domain: 'Incident' | 'Competitor' | 'Regulatory';
  title: string;
  date: string;
  severity: string;
  why: string;
  context: string;
  view: string;
  rank_score: number;
}

export interface IntelHeadline {
  title: string;
  date: string;
  severity?: string;
  type?: string;
}

export interface IntelDigestResponse {
  generated_at: string;
  window_days: number;
  deltas: {
    incidents: { count: number; headlines: IntelHeadline[] };
    competitor: { count: number; headlines: IntelHeadline[] };
    regulatory: { red: number; amber: number };
  };
  attention: IntelAttentionItem[];
}

/** Cross-domain digest: per-domain deltas + ranked attention feed. */
export async function fetchIntelDigest(windowDays = 7, top = 8): Promise<IntelDigestResponse> {
  return request(`/api/intel/digest?window_days=${windowDays}&top=${top}`);
}

// ── Executive Intel — CSO profiles (SQLite-backed, governed scout feed) ──────

export interface ExecProfilesMeta {
  total: number;
  by_source: Record<string, number>;
  last_updated: string | null;
}

/** Live CSO executive profiles + provenance. Payloads match the frontend
 *  ExecutiveProfile shape (data/csoProfiles.ts). Callers should fall back to
 *  the static snapshot if this throws so the page degrades gracefully. */
export async function fetchExecProfiles<T = unknown>(): Promise<{ meta: ExecProfilesMeta; profiles: T[] }> {
  return request('/api/exec-intel/profiles');
}

// ── Projects ────────────────────────────────────────────────────

export interface ProjectListItem {
  project_id: string;
  project_name: string;
  summary: string;
  lifecycle_state: string;
  health: string;
  current_phase: string;
  est_phase_index: number;
  risk_score: number;
  blockers_count: number;
  next_milestone: string;
  next_due_date: string;
  vendors: Array<{
    id: string;
    vendor_name: string;
    role: string;
    status: string;
  }>;
}

export async function fetchProjects(): Promise<{ total: number; projects: ProjectListItem[] }> {
  return request('/api/projects');
}

// ── Incidents & Morning Brief ───────────────────────────────────────────────

export interface IncidentQuery {
  severity?: string;
  type?: string;
  region?: string;
  q?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface Incident {
  id: string | number;
  incident_date: string;
  incident_type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  location: string;
  region: string;
  summary: string;
  impact?: string;
  recommended_action?: string;
  source_url?: string;
  created_at?: string;
}

export interface IncidentStats {
  total: number;
  by_severity: Record<string, number>;
  by_type: Array<{ type: string; count: number }>;
  by_region: Record<string, number>;
  monthly_trend: Array<{ month: string; count: number }>;
  recent: Incident[];
}

export interface MorningBrief {
  generated_at: string;
  incidents: {
    critical: number;
    total: number;
    recent: Incident[];
  };
  regulatory: {
    red: number;
    amber: number;
  };
  competitors: {
    total_events: number;
  };
  vendors: {
    stale_assessments: Array<{ vendor_id?: string; company_name?: string }>;
  };
}

export async function fetchIncidentStats(): Promise<IncidentStats> {
  return request('/api/incidents/stats');
}

export async function fetchIncidents(query?: IncidentQuery): Promise<{
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  incidents: Incident[];
}> {
  const qs = new URLSearchParams();
  if (query?.severity) qs.set('severity', query.severity);
  if (query?.type) qs.set('type', query.type);
  if (query?.region) qs.set('region', query.region);
  if (query?.q) qs.set('q', query.q);
  if (query?.date_from) qs.set('date_from', query.date_from);
  if (query?.date_to) qs.set('date_to', query.date_to);
  if (query?.sort) qs.set('sort', query.sort);
  if (query?.page) qs.set('page', String(query.page));
  if (query?.page_size) qs.set('page_size', String(query.page_size));
  const queryString = qs.toString() ? `?${qs}` : '';
  return request(`/api/incidents${queryString}`);
}

export async function fetchIncidentFilters(): Promise<{
  severities: string[];
  types: string[];
  regions: string[];
}> {
  return request('/api/incidents/filters');
}

export async function fetchMorningBrief(): Promise<MorningBrief> {
  return request('/api/morning-brief');
}

// ── Trend Analytics (shared: incidents + regulatory) ──────────────────

export interface TrendPoint {
  period: string;
  count: number;
  weighted: number;
  delta?: number;
  pct_change?: number | null;
  direction?: 'up' | 'down' | 'flat';
  rolling_avg?: number;
  is_anomaly?: boolean;
  zscore?: number;
}

export interface TrendMover {
  category: string;
  current: number;
  previous: number;
  delta: number;
  pct_change: number | null;
  direction: 'up' | 'down' | 'flat';
}

export interface TrendSummary {
  latest_period: string | null;
  latest_value: number;
  previous_value: number;
  delta: number;
  pct_change: number | null;
  direction: 'up' | 'down' | 'flat';
  anomaly_count: number;
}

export interface TrendPayload {
  frequency: string;
  domain: string;
  weighting: string;
  scope?: string;
  series: TrendPoint[];
  weighted_series: TrendPoint[];
  top_movers: TrendMover[];
  summary: TrendSummary;
  weighted_summary: TrendSummary;
}

export async function fetchIncidentTrends(
  frequency: 'monthly' | 'quarterly' = 'monthly',
): Promise<TrendPayload> {
  return request(`/api/incidents/trends?frequency=${frequency}`);
}

export async function fetchRegulatoryTrends(
  scope: 'all' | 'us' | 'global' = 'all',
  frequency: 'monthly' | 'quarterly' = 'monthly',
): Promise<TrendPayload> {
  return request(`/api/regulatory/trends?scope=${scope}&frequency=${frequency}`);
}

// ── Regulatory Intelligence ─────────────────────────────────────────────────────────────

export interface RegulatorySummary {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  data_through: string;
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
  top_actions: Array<{
    title: string;
    description: string;
    owner: string;
    priority: 'High' | 'Med' | 'Low';
    eta: string;
  }>;
  jurisdictions: string[];
  assumptions: string[];
  confidence: string;
  ingestion_notes?: Record<string, string | number>;
}

export interface RegulatoryGeoJurisdiction {
  jurisdiction: string;
  total: number;
  red: number;
  amber: number;
  yellow: number;
  green: number;
  worst_rag: 'Red' | 'Amber' | 'Yellow' | 'Green';
  techs: string[];
  geo_scope?: 'US_STATE' | 'US_FEDERAL' | 'COUNTRY' | 'GLOBAL';
  state?: string | null;
  state_code?: string | null;
  country?: string | null;
}

export interface RegulatoryInsights {
  scope: 'all' | 'us' | 'global';
  summary: string;
  total_obligations: number;
  red_amber_total: number;
  top_hotspots: RegulatoryGeoJurisdiction[];
  top_tech: Array<{ tech: string; count: number }>;
  status_breakdown: Record<string, number>;
  daily_breakdown: Array<{ period: string; count: number }>;
  monthly_breakdown: Array<{ period: string; count: number }>;
  quarterly_breakdown: Array<{ period: string; count: number }>;
  executive_top: string[];
  executive_bottom: string[];
}

export interface RegulatoryObligationsResponse<T = unknown> {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  obligations: T[];
}

export async function fetchRegulatorySummary(): Promise<RegulatorySummary> {
  return request('/api/regulatory/summary');
}

export async function fetchRegulatoryGeo(scope: 'all' | 'us' | 'global' = 'all'): Promise<{ jurisdictions: RegulatoryGeoJurisdiction[]; total: number; scope: 'all' | 'us' | 'global' }> {
  return request(`/api/regulatory/geo?scope=${scope}`);
}

export async function fetchRegulatoryInsights(scope: 'all' | 'us' | 'global' = 'all'): Promise<RegulatoryInsights> {
  return request(`/api/regulatory/insights?scope=${scope}`);
}

export async function fetchRegulatoryObligations<T = unknown>(params?: {
  rag?: string;
  tech?: string;
  status?: string;
  jurisdiction?: string;
  scope?: 'all' | 'us' | 'global';
  q?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<RegulatoryObligationsResponse<T>> {
  const qs = new URLSearchParams();
  if (params?.rag) qs.set('rag', params.rag);
  if (params?.tech) qs.set('tech', params.tech);
  if (params?.status) qs.set('status', params.status);
  if (params?.jurisdiction) qs.set('jurisdiction', params.jurisdiction);
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.q) qs.set('q', params.q);
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/regulatory/obligations${query}`);
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

export interface ExtractResult {
  var_id: string;
  filename: string;
  success: boolean;
  overall_score: number | null;
  decision_band: string;
  error: string;
}

export interface BatchExtractResponse {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: ExtractResult[];
}

export interface VendorSyncResponse {
  apply: boolean;
  root_path: string;
  db_vendors_total: number;
  canonical_vendor_keys: number;
  vendors_out_of_sync: number;
  sample_removals: string[];
  backup_path: string;
  deleted_vendors: number;
  deleted_var_reports: number;
  deleted_highlights: number;
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
  if (limit)    qs.set('limit', String(limit));
  if (overwrite) qs.set('overwrite', 'true');
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

export async function searchVendorsForLinking(
  q: string,
): Promise<{ results: { id: string; company_name: string; category: string }[] }> {
  return request(`/api/admin/vendors/search?q=${encodeURIComponent(q)}`);
}

export async function runVendorDirectorySync(params?: {
  apply?: boolean;
  backup?: boolean;
  sample_limit?: number;
  root_path?: string;
}): Promise<VendorSyncResponse> {
  return request('/api/admin/vendor-sync', {
    method: 'POST',
    body: JSON.stringify({
      apply: params?.apply ?? false,
      backup: params?.backup ?? true,
      sample_limit: params?.sample_limit ?? 30,
      root_path: params?.root_path,
    }),
  });
}

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

export interface LinkedProject {
  project_id: string;
  project_name: string;
  lifecycle_state?: string;
  current_phase?: string;
  est_phase_index?: number;
  vendor_link_status?: string;
  vendor_role?: string;
}

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
  walmart_actionability_context?: string | null;
  correlation_summary?: string | null;
  correlation_status?: 'MATCHED' | 'AMBIGUOUS' | 'NO_MATCH' | string;
  matched_vendor_id?: string | null;
  matched_vendor_name?: string | null;
  match_method?: string | null;
  match_label?: string | null;
  match_confidence?: number | null;
  match_explanation?: string | null;
  linked_active_projects_count?: number;
  linked_projects?: LinkedProject[];
  candidate_vendor_names?: string[];
  triage_status?: string | null;
  triaged_by?: string | null;
  triaged_at?: string | null;
  triage_note?: string | null;
  is_brief_ready?: boolean;
  readiness_issues?: string[];
  readiness_warnings?: string[];
  readiness_required_fields?: string[];
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
  why_walmart_cares?: string;
  recommended_owner?: string;
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
}

export interface CompetitorEventsResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  events: CompetitorEvent[];
}

export interface CompetitorEventsListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  events: CompetitorEvent[];
}

export interface CompetitorMonthly {
  months: string[];
  series: Record<string, number[]>;
}

export interface CompetitorHeatmap {
  competitors: string[];
  categories: string[];
  matrix: number[][];
}

export interface CompetitorLocationSample {
  name: string;
  type: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number | null;
  lng?: number | null;
  coordinate_source?: 'source' | 'state-estimated' | 'unmapped' | string;
  url: string;
  source_file: string;
}

export interface CompetitorLocationSummary {
  name: string;
  total_locations: number;
  files: string[];
  facility_types: Record<string, number>;
  by_state: Record<string, number>;
  geocoded_locations: number;
  estimated_locations?: number;
  mappable_locations?: number;
  unmapped_locations?: number;
  sample_locations: CompetitorLocationSample[];
  map_points?: CompetitorLocationSample[];
}

export interface CompetitorStateLocationSummary {
  state: string;
  state_name: string;
  total_locations: number;
  competitors: Record<string, number>;
}

export interface CompetitorLocationsResponse {
  source_available: boolean;
  source_root: string;
  generated_at: string;
  total_locations: number;
  competitors: CompetitorLocationSummary[];
  states: CompetitorStateLocationSummary[];
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

export async function fetchCompetitorLocations(): Promise<CompetitorLocationsResponse> {
  return request('/api/competitors/locations');
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

export async function fetchCompetitorCSOCandidates(limit = 20): Promise<{ count: number; events: CompetitorEvent[] }> {
  return request(`/api/competitors/cso-candidates?limit=${limit}`);
}

export interface AdminCompetitorScoringSummary {
  total: number;
  distribution: Record<string, number>;
}

export interface AdminCompetitorTriageQueueResponse {
  total: number;
  items: CompetitorEvent[];
}

export async function fetchAdminCompetitorScoringSummary(): Promise<AdminCompetitorScoringSummary> {
  return request('/api/admin/competitor-events/scoring-summary');
}

export async function fetchAdminCompetitorTriageQueue(params?: {
  triage_status?: string;
  priority_tier?: string;
  limit?: number;
}): Promise<AdminCompetitorTriageQueueResponse> {
  const qs = new URLSearchParams();
  if (params?.triage_status) qs.set('triage_status', params.triage_status);
  if (params?.priority_tier) qs.set('priority_tier', params.priority_tier);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs}` : '';
  return request(`/api/admin/competitor-events/triage-queue${query}`);
}
