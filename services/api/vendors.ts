import { request } from './core';

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

