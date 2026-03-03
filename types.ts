export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

// Legacy vendor shape (used by local dataProcessor fallback)
export interface Vendor {
  id: string;
  companyName: string;
  category: string;
  technologyProduct: string;
  reportUrl: string;
  overallRating: number;
  vendorStatus: string;
  riskLevel: RiskLevel;
  lastAudited: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface PhaseNode {
  name: string;
  description?: string;
  children?: PhaseNode[];
}

export enum ViewState {
  HOME = 'HOME',
  DIRECTORY = 'DIRECTORY',
  PROJECTS = 'PROJECTS',
  REQUEST_ASSESSMENT = 'REQUEST_ASSESSMENT',
  COMPETITOR_ANALYSIS = 'COMPETITOR_ANALYSIS',
  COMPETITOR_INTEL = 'COMPETITOR_INTEL',
  CSO_INTELLIGENCE = 'CSO_INTELLIGENCE',
  REGULATORY_INTEL = 'REGULATORY_INTEL',
  REQUEST_LAB_VISIT = 'REQUEST_LAB_VISIT',
  ARCHITECTURE = 'ARCHITECTURE',
  ADMIN = 'ADMIN',
}

// ── Regulatory Intelligence types ─────────────────────────────────────────

export interface RegControl {
  control_id: string;
  description: string;
  owner: string;
  status: 'Compliant' | 'Partial' | 'None';
  last_reviewed: string;
  evidence_link: string;
}

export interface RegRisk {
  impact: number;
  likelihood: number;
  score: number;
  rag: 'Red' | 'Amber' | 'Yellow' | 'Green';
  reason: string;
}

export interface RegObligation {
  id: string;
  jurisdiction: string;
  title: string;
  summary: string;
  tech_category: string;
  effective_date: string | null;
  deadline: string | null;
  criticality: number;
  evidence_status: 'Compliant' | 'Partially' | 'Non-Compliant' | 'Unknown';
  evidence_links: string[];
  risk: RegRisk;
  controls: RegControl[];
  full_description: string;
  status: 'Enacted' | 'Proposed' | 'Failed';
  provenance: string[];
}

export interface RegTopAction {
  title: string;
  description: string;
  owner: string;
  priority: 'High' | 'Med' | 'Low';
  eta: string;
}

export interface RegStats {
  total_obligations: number;
  red: number;
  amber: number;
  yellow: number;
  green: number;
  enacted: number;
  proposed: number;
  tech_breakdown: Record<string, number>;
}

export interface RegSummary {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  data_through: string;
  stats: RegStats;
  top_actions: RegTopAction[];
  jurisdictions: string[];
  assumptions: string[];
  confidence: 'Low' | 'Med' | 'High';
  ingestion_notes: Record<string, unknown>;
}