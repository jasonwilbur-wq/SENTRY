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

export type { Incident, IncidentStats, MorningBrief } from './services/api';
export type IncidentSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface RegTopAction {
  title: string;
  description: string;
  owner: string;
  priority: 'High' | 'Med' | 'Low';
  eta: string;
}

export interface RegSummary {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  data_through: string;
  jurisdictions: string[];
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
  top_actions: RegTopAction[];
  assumptions: string[];
  confidence: string;
}

export interface RegControl {
  control_id: string;
  description: string;
  status: 'Compliant' | 'Partial' | 'Gap' | string;
  owner: string;
  last_reviewed: string;
  evidence_link?: string;
}

export interface RegObligation {
  id: string;
  title: string;
  jurisdiction: string;
  tech_category: string;
  status: string;
  evidence_status: string;
  full_description: string;
  effective_date?: string | null;
  deadline?: string | null;
  evidence_links: string[];
  controls: RegControl[];
  provenance: string[];
  risk: {
    rag: 'Red' | 'Amber' | 'Yellow' | 'Green' | string;
    score: number;
    impact: number;
    likelihood: number;
    reason: string;
  };
}

export enum ViewState {
  HOME = 'HOME',
  DIRECTORY = 'DIRECTORY',
  PROJECTS = 'PROJECTS',
  REQUEST_ASSESSMENT = 'REQUEST_ASSESSMENT',
  COMPETITOR_ANALYSIS = 'COMPETITOR_ANALYSIS',
  COMPETITOR_INTEL = 'COMPETITOR_INTEL',
  CSO_INTELLIGENCE = 'CSO_INTELLIGENCE',
  EXECUTIVE_INTEL = 'EXECUTIVE_INTEL',
  REGULATORY_INTELLIGENCE = 'REGULATORY_INTELLIGENCE',
  INCIDENT_INTELLIGENCE = 'INCIDENT_INTELLIGENCE',
  REQUEST_LAB_VISIT = 'REQUEST_LAB_VISIT',
  REQUEST_QUEUE = 'REQUEST_QUEUE',
  ARCHITECTURE = 'ARCHITECTURE',
  ADMIN = 'ADMIN',
  SENTINEL = 'SENTINEL',
  RISK_MAP = 'RISK_MAP',
}