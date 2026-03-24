"""SENTRY Backend — Pydantic models for request/response validation."""
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
    latest_var_id: str = ""      # Phase 2 — used for download proxy
    
    # Extended fields
    description: str = ""
    founded_year: str = ""
    hq_location: str = ""
    business_owner: str = ""
    sourcing_manager: str = ""
    deployment_status: str = "Prospect"
    hosting_type: str = ""
    data_classification: str = "Internal"

    all_products: list[VendorProduct] = Field(default_factory=list)
    
    # VAR Data (attached if available)
    var_scores: dict | None = None
    
    # Enhanced vendor details (Phase 2.5 — 202601/202602 import)
    vendor_highlight: str = ""
    pros: str = ""
    cons: str = ""
    concerns: str = ""
    use_cases: str = ""
    value_to_walmart: str = ""
    maturity_level: str = ""


class VendorsResponse(BaseModel):
    total: int          # total matched vendors (after grouping)
    page: int           # current page (1-based)
    page_size: int      # vendors per page
    total_pages: int    # ceil(total / page_size)
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


# ── Forms ───────────────────────────────────────────────────────────────

class FormResponse(BaseModel):
    success: bool
    ref_id: str
    message: str


# ── Projects ─────────────────────────────────────────────────────────────

class NdaEntry(BaseModel):
    """One vendor NDA under a project (a project may have many)."""
    nda_number: str
    vendor: str
    status: str = "executed"          # executed | pending | via_msa | expired
    note: str = ""


class ComplianceEntry(BaseModel):
    """One vendor APM / ERPA / SSP entry (a project may have many per type)."""
    vendor: str = ""
    number: str
    status: str = "not_started"       # not_started | in_progress | under_review | complete
    note: str = ""


class ProjectOut(BaseModel):
    project_id: str
    project_name: str
    summary: str = ""
    managing_unit: str = ""
    lifecycle_state: str = "active"
    health: str = "green"
    current_phase: str = "Intake"
    est_phase_index: int = 1
    risk_score: int = 0
    sensitivity: str = "internal"
    tags: str = ""
    progress_pct: int = 0
    next_milestone: str = ""
    next_due_date: str = ""
    blockers_count: int = 0
    last_update_at: str = ""
    last_update_by: str = ""
    est_cost: str = ""
    business_owner: str = ""
    # Compliance fields — each type now supports multiple vendor entries
    nda_numbers:  list[NdaEntry]       = Field(default_factory=list)
    apm_entries:  list[ComplianceEntry] = Field(default_factory=list)
    erpa_entries: list[ComplianceEntry] = Field(default_factory=list)
    ssp_entries:  list[ComplianceEntry] = Field(default_factory=list)
    compliance_notes: str = ""
    phase_history: list[dict] = Field(default_factory=list)


class ProjectsResponse(BaseModel):
    total: int
    projects: list[ProjectOut]


class ProjectUpdate(BaseModel):
    """Partial update — all fields optional."""
    health: str | None = None
    lifecycle_state: str | None = None
    current_phase: str | None = None
    est_phase_index: int | None = None
    progress_pct: int | None = None
    next_milestone: str | None = None
    next_due_date: str | None = None
    blockers_count: int | None = None
    last_update_by: str | None = None
    nda_numbers:  list[NdaEntry]        | None = None
    apm_entries:  list[ComplianceEntry] | None = None
    erpa_entries: list[ComplianceEntry] | None = None
    ssp_entries:  list[ComplianceEntry] | None = None
    compliance_notes: str | None = None
