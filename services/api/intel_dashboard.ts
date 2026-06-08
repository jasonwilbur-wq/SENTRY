import { request } from './core';

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

