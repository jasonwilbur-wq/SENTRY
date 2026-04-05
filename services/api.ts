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

/**
 * Returns the full URL for a VAR report download via the backend proxy.
 * Works in dev (relative) and production (absolute Cloud Run URL).
 */
export function getDownloadUrl(varId: string): string {
  return `${API_BASE}/api/vars/download/${varId}`;
}

async function request<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: HeadersInit = fetchOptions.method && fetchOptions.method !== 'GET'
      ? { 'Content-Type': 'application/json' }
      : {};
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