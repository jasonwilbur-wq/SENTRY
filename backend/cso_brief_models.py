"""SENTRY CSO Briefing Pipeline — Pydantic models and constants.

Pure data layer — no DB imports, no side effects.
Shared by cso_brief_helpers.py and cso_brief_routes.py.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# ── Constants ─────────────────────────────────────────────────────────────────

MAX_ITEMS_DEFAULT = 20
MAX_ITEMS_CAP = 100

# Inclusion gates — only these values qualify for a CSO brief.
ALLOWED_PRIORITY_TIERS = {"Leadership Watch", "CSO Brief"}
ALLOWED_TRIAGE_STATUSES = {"REVIEWED", "ESCALATED"}

# States where brief/item edits are permitted.
EDITABLE_STATES = {"DRAFT", "IN_REVIEW"}

# Confidence score → label mapping (used when confidence_level is absent).
CONFIDENCE_BUCKETS: list[tuple[float, str]] = [
    (80.0, "high"),
    (50.0, "medium"),
    (0.0,  "low"),
]

# (from_status, to_status) → minimum required role ("user" or "admin").
ALLOWED_TRANSITIONS: dict[tuple[str, str], str] = {
    ("DRAFT", "IN_REVIEW"): "user",
    ("IN_REVIEW", "DRAFT"): "user",
    ("IN_REVIEW", "APPROVED"): "admin",
    ("APPROVED", "PUBLISHED_DRAFT"): "admin",
}

AUDIT_DEFAULT_LIMIT = 50
AUDIT_MAX_LIMIT = 200

# Fields captured in frozen_payload from the source competitor event row.
FROZEN_PAYLOAD_FIELDS: list[str] = [
    "id",
    "competitor",
    "event_title",
    "event_date",
    "source_link",
    "confidence_level",
    "walmart_relevance_score",
    "priority_tier",
    "triage_status",
    "escalate_to_cso",
    "why_walmart_cares",
    "walmart_actionability_context",
    "matched_vendor_id",
    "matched_vendor_name",
    "match_method",
    "match_label",
    "linked_active_projects_count",
    "linked_projects",
    "score_reason",
    "category",
    "detailed_description",
    "security_implication",
    "operational_impact",
    "financial_impact",
    "reputational_impact",
    "analyst_notes",
    "cso_candidate_reason",
    "signal_type",
    "recommended_owner",
    "strategic_score",
    "security_score",
    "operational_score",
    "customer_trust_score",
    "novelty_score",
    "urgency_score",
    "confidence_score",
    "confidence_effect",
    "source_effect",
    "location",
    "source_month",
]


# ── Pydantic models ──────────────────────────────────────────────────────────

class GenerateFilters(BaseModel):
    date_from: str | None = None
    date_to: str | None = None
    competitor: list[str] | None = None
    max_items: int = MAX_ITEMS_DEFAULT


class GenerateRequest(BaseModel):
    title: str
    period_start: str
    period_end: str
    filters: GenerateFilters = Field(default_factory=GenerateFilters)


class BriefItemOut(BaseModel):
    id: str
    brief_id: str
    competitor_event_id: int
    rank: int
    analyst_commentary: str
    uncertainty_note: str
    owner_assignment: str
    include_in_summary: int
    frozen_payload: dict[str, Any]
    created_at: str
    updated_at: str


class BriefOut(BaseModel):
    id: str
    title: str
    period_start: str
    period_end: str
    status: str
    created_by: str
    created_at: str
    updated_by: str
    updated_at: str
    submitted_at: str | None
    submitted_by: str | None
    approved_at: str | None
    approved_by: str | None
    published_draft_at: str | None
    published_draft_by: str | None
    executive_summary: str
    review_notes: str
    quality_gate_result: str
    snapshot_version: int
    items: list[BriefItemOut]


class GenerateResponse(BaseModel):
    brief: BriefOut
    included_count: int
    candidate_count: int


class PatchBriefRequest(BaseModel):
    executive_summary: str | None = None
    review_notes: str | None = None


class PatchItemRequest(BaseModel):
    rank: int | None = None
    analyst_commentary: str | None = None
    uncertainty_note: str | None = None
    owner_assignment: str | None = None
    include_in_summary: int | None = None


class Violation(BaseModel):
    code: str
    message: str
    item_id: str | None = None
    field: str | None = None


class ValidateResponse(BaseModel):
    passed: bool
    violations: list[Violation]
    checked_at: str
    included_item_count: int


class TransitionRequest(BaseModel):
    to_status: str
    note: str = ""


class TransitionResponse(BaseModel):
    brief: BriefOut
    from_status: str
    to_status: str
    transitioned_by: str
    validation: ValidateResponse | None = None


class SnapshotItemOut(BaseModel):
    """Read-only rendering payload per item — frozen_payload + analyst edits."""
    rank: int
    competitor: str
    event_title: str
    event_date: str | None
    category: str | None
    source_link: str | None
    priority_tier: str | None
    triage_status: str | None
    walmart_relevance_score: float | None
    confidence_level: str | None
    why_walmart_cares: str | None
    walmart_actionability_context: str | None
    detailed_description: str | None
    security_implication: str | None
    analyst_commentary: str
    uncertainty_note: str
    owner_assignment: str
    include_in_summary: int


class SnapshotResponse(BaseModel):
    """Read-only draft rendering payload for the CSO view."""
    id: str
    title: str
    period_start: str
    period_end: str
    status: str
    executive_summary: str
    review_notes: str
    banner: str = "Draft only \u2014 Human Review Required"
    footer: str = "Draft artifact. Not final leadership directive."
    items: list[SnapshotItemOut]
    snapshot_version: int
    generated_at: str


class AuditEntryOut(BaseModel):
    id: int
    brief_id: str
    action: str
    actor_id: str
    old_value: str
    new_value: str
    created_at: str


class AuditListResponse(BaseModel):
    entries: list[AuditEntryOut]
    total: int
    limit: int
    offset: int
