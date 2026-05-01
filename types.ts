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
  REGULATORY_INTELLIGENCE = 'REGULATORY_INTELLIGENCE',
  REGULATORY_INTEL = 'REGULATORY_INTELLIGENCE',
  INCIDENT_INTELLIGENCE = 'INCIDENT_INTELLIGENCE',
  INCIDENT_INTEL = 'INCIDENT_INTELLIGENCE',
  REQUEST_LAB_VISIT = 'REQUEST_LAB_VISIT',
  REQUEST_QUEUE = 'REQUEST_QUEUE',
  ARCHITECTURE = 'ARCHITECTURE',
  ADMIN = 'ADMIN',
  RISK_MAP = 'RISK_MAP',
  WALMART_SPARK = 'WALMART_SPARK',
}

export interface RegRisk {
  impact: number;
  likelihood: number;
  score: number;
  rag: 'Red' | 'Amber' | 'Yellow' | 'Green';
  reason: string;
}

export interface RegControl {
  control_id: string;
  description: string;
  owner: string;
  status: string;
  last_reviewed: string;
  evidence_link: string;
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
  evidence_status: string;
  evidence_links: string[];
  risk: RegRisk;
  controls: RegControl[];
  full_description: string;
  status: string;
  provenance: string[];
  geo_scope?: 'US_STATE' | 'US_FEDERAL' | 'COUNTRY' | 'GLOBAL';
  country?: string | null;
  state?: string | null;
  state_code?: string | null;
}

export interface RegTopAction {
  title: string;
  description: string;
  owner: string;
  priority: 'High' | 'Med' | 'Low';
  eta: string;
}

export interface RegSummaryStats {
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
  jurisdictions: string[];
  stats: RegSummaryStats;
  top_actions: RegTopAction[];
  assumptions: string[];
  confidence: string;
  ingestion_notes?: Record<string, string | number>;
}

export type IncidentSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Incident {
  id: string | number;
  incident_date: string;
  incident_type: string;
  severity: IncidentSeverity;
  location: string;
  region: string;
  summary: string;
  impact?: string;
  source?: string;
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