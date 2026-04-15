export type CSOBriefStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED_DRAFT';

export type AnalystStatus = 'unreviewed' | 'in_review' | 'decided' | 'blocked';
export type AnalystDecision =
  | 'accept_recommendation'
  | 'include_in_brief'
  | 'escalate_for_review'
  | 'request_additional_evidence'
  | 'monitor_only'
  | 'hold'
  | 'dismiss';

export interface CSOBriefItem {
  id: string;
  brief_id: string;
  competitor_event_id: number;
  rank: number;
  analyst_commentary: string;
  uncertainty_note: string;
  owner_assignment: string;
  include_in_summary: number;
  analyst_status: AnalystStatus;
  analyst_decision: string;
  analyst_note: string;
  analyst_decided_at: string | null;
  analyst_decision_source: string;
  frozen_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CSOBrief {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: CSOBriefStatus;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_notes: string;
  reviewer_attestation: string;
  changes_requested_at: string | null;
  changes_requested_by: string | null;
  changes_requested_reason: string;
  approved_at: string | null;
  approved_by: string | null;
  published_draft_at: string | null;
  published_draft_by: string | null;
  executive_summary: string;
  review_notes: string;
  quality_gate_result: string;
  snapshot_version: number;
  items: CSOBriefItem[];
}

export interface ValidationViolation {
  code: string;
  message: string;
  item_id: string | null;
  field: string | null;
}

export interface ValidationResult {
  passed: boolean;
  violations: ValidationViolation[];
  checked_at: string;
  included_item_count: number;
}

export interface CSOBriefTransitionResponse {
  brief: CSOBrief;
  from_status: CSOBriefStatus;
  to_status: CSOBriefStatus;
  transitioned_by: string;
  validation: ValidationResult | null;
  decision_action: string | null;
}

export interface CSOBriefSnapshotItem {
  rank: number;
  competitor: string;
  event_title: string;
  event_date: string | null;
  category: string | null;
  source_link: string | null;
  priority_tier: string | null;
  triage_status: string | null;
  walmart_relevance_score: number | null;
  confidence_level: string | null;
  why_walmart_cares: string | null;
  walmart_actionability_context: string | null;
  correlation_summary: string | null;
  detailed_description: string | null;
  security_implication: string | null;
  analyst_commentary: string;
  uncertainty_note: string;
  owner_assignment: string;
  include_in_summary: number;

  // Actionable-intelligence decision model
  decision_title?: string | null;
  decision_summary?: string | null;
  evidence_reference?: string | null;
  rationale?: string | null;
  confidence?: string | null;
  severity?: string | null;
  likelihood?: string | null;
  impact_score?: number | null;
  likelihood_score?: number | null;
  priority_score?: number | null;
  recommended_action?: string | null;
  reason_codes?: string[];
  explanation?: string | null;
  actionable_now?: number;
  readiness_blocked?: number;
  scoring_version?: string | null;
  decision_model_version?: string | null;
  analyst_status?: AnalystStatus;
  analyst_decision?: string;
  analyst_note?: string;
  analyst_decided_at?: string | null;
  analyst_decision_source?: string;
}

export interface CSOBriefSnapshot {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: CSOBriefStatus;
  executive_summary: string;
  review_notes: string;
  banner: string;
  footer: string;
  items: CSOBriefSnapshotItem[];
  snapshot_version: number;
  generated_at: string;
}

export interface CSOBriefAuditEntry {
  id: number;
  brief_id: string;
  action: string;
  actor_id: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface CSOBriefAuditResponse {
  entries: CSOBriefAuditEntry[];
  total: number;
  limit: number;
  offset: number;
}
