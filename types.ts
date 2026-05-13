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
  SENTINEL = 'SENTINEL',
  RISK_MAP = 'RISK_MAP',
}