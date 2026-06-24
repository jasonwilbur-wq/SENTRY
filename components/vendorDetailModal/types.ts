import { Vendor, VendorAssessmentEvidence } from '../../services/api';

export type Tab = 'overview' | 'insights' | 'risk' | 'tech' | 'docs';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'insights', label: 'Insights' },
  { id: 'risk', label: 'Security Posture' },
  { id: 'tech', label: 'Technology' },
  { id: 'docs', label: 'Documents' },
];

export type ConcernSource = 'DB' | 'VAR';

export interface ConcernItem {
  text: string;
  source: ConcernSource;
}

export interface InsightTakeaway {
  label: string;
  value: string;
  helper: string;
}

export interface RiskSummaryCard {
  label: string;
  value: string;
  accent: string;
}

export interface ScoreProfileDatum {
  subject: string;
  A: number;
  fullMark: number;
}

export interface VendorOverviewTabProps {
  modalBaseId: string;
  vendor: Vendor;
  assessmentEvidence: VendorAssessmentEvidence | null;
  isLoadingEvidence: boolean;
  semanticTags: string[];
  stakeholderTags: string[];
  secondaryDomains: string[];
  reportCount: number;
  companyUrl: string;
  lastReviewedLabel: string;
  formatSignalLabel: (value: string) => string;
}

export interface VendorInsightsTabProps {
  modalBaseId: string;
  vendor: Vendor;
  hasInsights: boolean;
  insightTakeaways: InsightTakeaway[];
  uniqueConcernItems: ConcernItem[];
}

export interface VendorRiskTabProps {
  modalBaseId: string;
  vendor: Vendor;
  isHydratingVar: boolean;
  hasVarScoreData: boolean;
  hasResolvedVarScore: boolean;
  scoreSourceLabel: string;
  scoreProfileData: ScoreProfileDatum[];
  hasScoreProfileData: boolean;
  varStatusMeta: { label: string; helper: string; style: React.CSSProperties } | null;
  primaryPostureScore: number | null;
  riskSummaryCards: RiskSummaryCard[];
  decisionBand: string;
  decisionPath: string;
  detailedPostureMetrics: Array<[string, number | null | undefined]>;
  uniqueConcernItems: ConcernItem[];
}

export interface VendorTechnologyTabProps {
  modalBaseId: string;
  vendor: Vendor;
  sourceReportCount: number;
  dominantDomainLabel: string;
  useCaseItems: string[];
  semanticTags: string[];
  secondaryDomains: string[];
  formatSignalValue: (value?: string) => string;
  formatSignalLabel: (value: string) => string;
}

export interface VendorDocumentsTabProps {
  modalBaseId: string;
  vendor: Vendor;
  trackedDocumentCount: number;
  sampleReportPath: string;
  copiedPath: string | null;
  assessmentEvidence: VendorAssessmentEvidence | null;
  isLoadingEvidence: boolean;
  copyPath: (path: string) => void;
  getDownloadUrl: (reportId: string) => string;
  formatSignalLabel: (value: string) => string;
  formatBytes: (value?: number) => string;
}
