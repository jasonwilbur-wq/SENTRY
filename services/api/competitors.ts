import { request } from './core';

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
