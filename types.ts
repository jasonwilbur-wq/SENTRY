export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface Vendor {
  id: string;
  companyName: string;
  category: string;
  technologyProduct: string;
  reportUrl: string;
  overallRating: number; // Scale 1-5
  vendorStatus: string;
  riskLevel: RiskLevel;
  lastAudited: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}

export interface PhaseNode {
  name: string;
  description?: string;
  children?: PhaseNode[];
}

export enum ViewState {
  DIRECTORY = 'DIRECTORY',
  REQUEST_ASSESSMENT = 'REQUEST_ASSESSMENT',
  COMPETITOR_ANALYSIS = 'COMPETITOR_ANALYSIS',
  REQUEST_LAB_VISIT = 'REQUEST_LAB_VISIT'
}