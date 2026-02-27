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

const API_BASE: string = (import.meta as any).env?.VITE_API_URL ?? '';

/**
 * Returns the full URL for a VAR report download via the backend proxy.
 * Works in dev (relative) and production (absolute Cloud Run URL).
 */
export function getDownloadUrl(varId: string): string {
  return `${API_BASE}/api/vars/download/${varId}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Vendors ────────────────────────────────────────────────────────────────────

export interface VendorProduct {
  report_url: string;
  technology_product: string;
  overall_rating: number;
  vendor_status: string;
  last_assessed: string;
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
}

export interface VendorsParams {
  category?: string;
  search?: string;
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
  });
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