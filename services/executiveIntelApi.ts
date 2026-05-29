import { apiFetch } from './api';

export interface ExecutiveIntelStats {
  source_count: number;
  signal_count: number;
  brief_count: number;
  valid_signal_count: number;
  invalid_signal_count: number;
  cso_ready_signal_count: number;
  verification_counts: Record<string, number>;
  analyst_review_counts: Record<string, number>;
  category_counts: Record<string, number>;
  source_quality_counts: Record<string, number>;
  portfolio_ready_for_review: boolean;
}

export interface ExecutivePortfolioSummary {
  profile_id: string;
  artifact_slug: string;
  full_name: string;
  organization: string;
  title: string;
  title_svp_conclusion?: string;
  status?: string;
  officer_type?: string;
  relevance_framing?: string;
  superseded_by?: string | null;
  updated_at?: string | number;
  stats: ExecutiveIntelStats;
  latest_brief?: ArtifactRef | null;
}

export interface ArtifactRef {
  name: string;
  relative_path: string;
  size_bytes: number;
  modified_at: string;
}

export interface ExecutiveProfileRecord {
  profile_id: string;
  full_name: string;
  organization: string;
  title: string;
  title_normalized?: string;
  title_svp_conclusion?: string;
  title_source_note?: string;
  status?: string;
  officer_type?: string;
  relevance_framing?: string;
  stale_reason?: {
    finding?: string;
    superseded_by?: string;
    flagged_by_run?: string;
    flagged_at?: string;
  };
  discovery_result?: {
    status?: string;
    finding?: string;
  };
  aliases?: string[];
  focus_topics?: string[];
  collection_notes?: string;
}

export interface ExecutiveSourceRecord {
  source_id: string;
  url: string;
  source_title?: string;
  publisher?: string;
  published_date?: string;
  source_quality?: string;
  extraction_status?: string;
  policy_check?: string;
  _artifact_file?: string;
}

export interface ExecutiveSignalRecord {
  signal_id: string;
  category: string;
  event_date?: string;
  event_location?: string;
  title: string;
  summary: string;
  business_relevance: string;
  walmart_cso_relevance: string;
  confidence_level: string;
  verification_status: string;
  analyst_review_status: string;
  sensitivity_level: string;
  citations: Array<{
    citation_id: string;
    url: string;
    source_title: string;
    publisher?: string;
    published_date?: string;
    evidence_excerpt: string;
    source_quality: string;
  }>;
  _artifact_file?: string;
}

export interface ExecutivePortfolio {
  profile: ExecutiveProfileRecord;
  artifact_slug: string;
  stats: ExecutiveIntelStats;
  validation: {
    profile_valid: boolean;
    valid_signal_count: number;
    invalid_signal_count: number;
    errors: unknown[];
  };
  source_policy: {
    counts: Record<string, number>;
    reviewed: Array<{
      source_id: string;
      url: string;
      decision: string;
      primary_reason: string;
    }>;
  };
  sources: ExecutiveSourceRecord[];
  signals: ExecutiveSignalRecord[];
  runs: ArtifactRef[];
  briefs: ArtifactRef[];
  latest_brief?: ArtifactRef | null;
  mode: string;
}

export interface ExecutivePortfolioList {
  root_available: boolean;
  root: string;
  total: number;
  portfolios: ExecutivePortfolioSummary[];
}

export interface ExecutiveReport {
  profile_id: string;
  profile: ExecutiveProfileRecord;
  stats: ExecutiveIntelStats;
  validation: ExecutivePortfolio['validation'];
  latest_brief?: ArtifactRef | null;
  markdown: string;
  mode: string;
  publication_status: string;
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`API ${response.status}: ${text}`);
  }
  return response.json() as Promise<T>;
}

export function fetchExecutivePortfolios(): Promise<ExecutivePortfolioList> {
  return requestJson('/api/executive-intel/portfolios');
}

export function fetchExecutivePortfolio(profileId: string): Promise<ExecutivePortfolio> {
  return requestJson(`/api/executive-intel/portfolios/${encodeURIComponent(profileId)}`);
}

export function fetchExecutiveReport(profileId: string): Promise<ExecutiveReport> {
  return requestJson(`/api/executive-intel/portfolios/${encodeURIComponent(profileId)}/report`);
}
