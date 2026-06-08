import { request } from './core';

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

