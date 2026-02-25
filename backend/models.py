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
    all_products: list[VendorProduct] = Field(default_factory=list)


class VendorsResponse(BaseModel):
    total: int
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
