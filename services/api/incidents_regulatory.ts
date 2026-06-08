import { request } from './core';

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

