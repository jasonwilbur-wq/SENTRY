"""SENTRY Backend — Pydantic models for request/response validation."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ── Vendor ───────────────────────────────────────────────────────────────

class VendorProduct(BaseModel):
    report_url: str = ""
    technology_product: str = ""
    overall_rating: float = 0.0
    vendor_status: str = "Active"
    last_assessed: str = ""


class VendorOut(BaseModel):
    """Shape the frontend expects from GET /api/vendors."""
    id: str
    company_name: str
    company_url: str = ""
    category: str = "Other"
    technology_product: str = ""
    report_url: str = ""
    overall_rating: float = 0.0
    vendor_status: str = "Active"
    last_assessed: str = ""
    risk_level: str = "Medium"
    has_var: bool = False
    latest_var_id: str = ""
    description: str = ""
    founded_year: str = ""
    hq_location: str = ""
    business_owner: str = ""
    sourcing_manager: str = ""
    deployment_status: str = "Prospect"
    hosting_type: str = ""
    data_classification: str = "Internal"
    all_products: list[VendorProduct] = Field(default_factory=list)
    var_scores: dict | None = None
    var_weight_score: float | None = None
    var_decision_band: str = ""
    var_decision_path: str = ""
    vendor_highlight: str = ""
    pros: str = ""
    cons: str = ""
    concerns: str = ""
    use_cases: str = ""
    value_to_walmart: str = ""
    maturity_level: str = ""
    report_count: int = 0
    dominant_domain: str = ""
    secondary_domains: str = ""
    top_semantic_tags: str = ""
    top_stakeholder_tags: str = ""
    sample_report_path: str = ""


class VendorsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    vendors: list[VendorOut]


class CategoriesResponse(BaseModel):
    categories: list[str]


# ── VAR Reports ─────────────────────────────────────────────────────────

class VarReportOut(BaseModel):
    id: str
    vendor_id: str
    filename: str
    sharepoint_url: str = ""
    report_date: str = ""
    report_version: str = "v1"
    report_type: str = "Detailed"
    overall_score: float | None = None
    decision_band: str = ""
    compliance_score: float | None = None
    risk_score: float | None = None
    maturity_score: float | None = None
    integration_score: float | None = None
    roi_score: float | None = None
    viability_score: float | None = None
    differentiation_score: float | None = None
    cloud_dep_score: float | None = None
    match_method: str = "manual"
    created_at: str = ""


class VarReportsResponse(BaseModel):
    total: int
    reports: list[VarReportOut]


# ── Assessment Highlights ────────────────────────────────────────────────

class HighlightOut(BaseModel):
    id: str
    vendor_id: str
    source_file: str
    assessment_date: str = ""
    product_name: str = ""
    pre_assessment_score: float | None = None
    pre_assessment_decision: str = ""
    maturity_level: str = ""
    initial_assessment: str = ""
    technical_assessment: str = ""


class HighlightsResponse(BaseModel):
    total: int
    highlights: list[HighlightOut]


# ── Chat ────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    history: list[ChatMessage] = Field(default_factory=list)
    message: str


class ChatResponse(BaseModel):
    response: str


# ── Request workflows ───────────────────────────────────────────────────

RequestType = Literal['assessment', 'lab_visit']
RequestStatus = Literal['SUBMITTED', 'TRIAGE_PENDING', 'IN_REVIEW', 'CLOSED']


class FormResponse(BaseModel):
    success: bool
    ref_id: str
    message: str
    status: str = 'SUBMITTED'


class AssessmentRequest(BaseModel):
    vendor_name: str = Field(min_length=1)
    assessment_type: str = Field(min_length=1)
    contact_name: str = Field(min_length=1)
    contact_email: str = Field(min_length=3)
    category: str = ''
    urgency: str = 'normal'
    notes: str = ''


class LabVisitRequest(BaseModel):
    contact_name: str = Field(min_length=1)
    contact_email: str = Field(min_length=3)
    preferred_date: str = Field(min_length=1)
    preferred_slot: str = Field(min_length=1)
    equipment: str = ''
    attendees: int | str = 1
    notes: str = ''


class ServiceRequestSummary(BaseModel):
    ref_id: str
    request_type: RequestType
    status: RequestStatus
    created_by: str
    created_at: str
    updated_at: str | None = None
    contact_name: str
    vendor_name: str | None = None
    urgency: str | None = None


class ServiceRequestOut(ServiceRequestSummary):
    contact_email: str
    assessment_type: str | None = None
    category: str | None = None
    preferred_date: str | None = None
    preferred_slot: str | None = None
    equipment: str | None = None
    attendees: int | None = None
    notes: str | None = None
    status_note: str | None = None
    updated_by: str | None = None


class ServiceRequestListResponse(BaseModel):
    total: int
    requests: list[ServiceRequestSummary]


class RequestLookupResponse(ServiceRequestOut):
    pass


class AdminQueueItem(ServiceRequestSummary):
    pass


class AdminQueueResponse(BaseModel):
    total: int
    requests: list[AdminQueueItem]


class StatusUpdateRequest(BaseModel):
    status: RequestStatus
    note: str | None = None


class StatusUpdateResponse(BaseModel):
    success: bool
    ref_id: str
    old_status: RequestStatus
    new_status: RequestStatus
    updated_by: str
    updated_at: str


# ── Projects ────────────────────────────────────────────────────────────

class NdaEntry(BaseModel):
    nda_number: str
    vendor: str = ''
    status: str = 'executed'
    note: str = ''


class ComplianceEntry(BaseModel):
    vendor: str = ''
    number: str = ''
    status: str = 'not_started'
    note: str = ''


class ProjectVendor(BaseModel):
    id: str
    project_id: str | None = None
    vendor_id: str | None = None
    vendor_name: str
    role: str = 'Vendor'
    status: str = 'active'
    notes: str = ''
    added_at: str | None = None
    updated_at: str | None = None


class ProjectVendorCreate(BaseModel):
    vendor_id: str | None = None
    vendor_name: str = Field(min_length=1)
    role: str = 'Vendor'
    status: str = 'active'
    notes: str = ''


class ProjectVendorUpdate(BaseModel):
    vendor_id: str | None = None
    vendor_name: str | None = None
    role: str | None = None
    status: str | None = None
    notes: str | None = None


class ProjectOut(BaseModel):
    project_id: str
    project_name: str
    summary: str = ''
    managing_unit: str = ''
    lifecycle_state: str = 'active'
    health: str = 'green'
    current_phase: str = 'Intake'
    est_phase_index: int = 1
    risk_score: int = 0
    sensitivity: str = 'internal'
    tags: str = ''
    progress_pct: int = 0
    next_milestone: str = ''
    next_due_date: str = ''
    blockers_count: int = 0
    last_update_at: str = ''
    last_update_by: str = ''
    est_cost: str = ''
    business_owner: str = ''
    nda_numbers: list[NdaEntry] = Field(default_factory=list)
    apm_entries: list[ComplianceEntry] = Field(default_factory=list)
    erpa_entries: list[ComplianceEntry] = Field(default_factory=list)
    ssp_entries: list[ComplianceEntry] = Field(default_factory=list)
    compliance_notes: str = ''
    exit_reason: str = ''
    phase_history: list[dict] = Field(default_factory=list)
    created_at: str = ''
    updated_at: str = ''
    vendors: list[ProjectVendor] = Field(default_factory=list)


class ProjectsResponse(BaseModel):
    total: int
    projects: list[ProjectOut]


class ProjectUpdate(BaseModel):
    project_name: str | None = None
    compliance_notes: str | None = None
    exit_reason: str | None = None
    health: str | None = None
    lifecycle_state: str | None = None
    current_phase: str | None = None
    est_phase_index: int | None = None
    progress_pct: int | None = None
    next_milestone: str | None = None
    next_due_date: str | None = None
    blockers_count: int | None = None
    last_update_by: str | None = None
    nda_numbers: list[NdaEntry] | None = None
    apm_entries: list[ComplianceEntry] | None = None
    erpa_entries: list[ComplianceEntry] | None = None
    ssp_entries: list[ComplianceEntry] | None = None


# Back-compat aliases for older imports
ProjectListResponse = ProjectsResponse
ProjectUpdateIn = ProjectUpdate
