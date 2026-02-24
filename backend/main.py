"""SENTRY Backend — FastAPI application.

Serves vendor data from SQLite for the React frontend.
Runs on port 8082 (8080 is reserved for Teams, 8081 reserved for legacy).

Usage:
  cd backend
  .venv/Scripts/activate   (Windows)
  uvicorn main:app --port 8082 --reload

WARNING: Route order matters in FastAPI! Static paths like
  /api/vendors/categories MUST be registered before /{vendor_id}.
"""
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, init_db
from models import (
    CategoriesResponse,
    ChatRequest,
    ChatResponse,
    FormResponse,
    HighlightsResponse,
    HighlightOut,
    VarReportOut,
    VarReportsResponse,
    VendorOut,
    VendorProduct,
    VendorsResponse,
)


@asynccontextmanager
async def lifespan(application: FastAPI):  # noqa: ARG001
    """Ensure DB tables exist on startup."""
    init_db()
    yield


app = FastAPI(
    title="SENTRY API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Vendors ────────────────────────────────────────────────────────────

def _group_products(rows: list[dict], var_vendor_ids: set[str] | None = None) -> list[VendorOut]:
    """Group multiple product rows for the same company into one VendorOut."""
    var_ids = var_vendor_ids or set()
    companies: dict[str, VendorOut] = {}
    for row in rows:
        name = row["company_name"]
        product = VendorProduct(
            report_url=row["report_url"],
            technology_product=row["technology_product"],
            overall_rating=row["overall_rating"],
            vendor_status=row["vendor_status"],
            last_assessed=row["last_assessed"],
        )
        if name in companies:
            companies[name].all_products.append(product)
        else:
            companies[name] = VendorOut(
                id=row["id"],
                company_name=name,
                company_url=row["company_url"],
                category=row["category"],
                technology_product=row["technology_product"],
                report_url=row["report_url"],
                overall_rating=row["overall_rating"],
                vendor_status=row["vendor_status"],
                risk_level=row["risk_level"],
                last_assessed=row["last_assessed"],
                has_var=row["id"] in var_ids,
                all_products=[product],
            )
    return list(companies.values())


@app.get("/api/vendors", response_model=VendorsResponse)
def list_vendors(
    category: str | None = Query(None),
    search: str | None = Query(None),
):
    """Return all vendors, optionally filtered by category or search term."""
    conn = get_connection()
    query = "SELECT * FROM vendors ORDER BY overall_rating DESC"
    params: list[str] = []
    clauses: list[str] = []

    if category and category != "All":
        clauses.append("category = ?")
        params.append(category)
    if search:
        clauses.append(
            "(LOWER(company_name) LIKE ? OR LOWER(technology_product) LIKE ?)"
        )
        term = f"%{search.lower()}%"
        params.extend([term, term])

    if clauses:
        query = f"SELECT * FROM vendors WHERE {' AND '.join(clauses)} ORDER BY overall_rating DESC"

    rows = [dict(r) for r in conn.execute(query, params).fetchall()]

    # Fetch vendor IDs that have VAR reports
    var_ids = {
        r[0] for r in conn.execute("SELECT DISTINCT vendor_id FROM var_reports").fetchall()
    }
    conn.close()

    vendors = _group_products(rows, var_ids)
    return VendorsResponse(total=len(vendors), vendors=vendors)


# NOTE: /categories MUST be registered before /{vendor_id} to avoid shadowing
@app.get("/api/vendors/categories", response_model=CategoriesResponse)
def list_categories():
    """Return distinct vendor categories."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT DISTINCT category FROM vendors ORDER BY category"
    ).fetchall()
    conn.close()
    return CategoriesResponse(categories=[r["category"] for r in rows])


@app.get("/api/vendors/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: str):
    """Return a single vendor by ID."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM vendors WHERE id = ?", (vendor_id,)
    ).fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vendor not found")
    var_ids = {
        r[0] for r in conn.execute(
            "SELECT DISTINCT vendor_id FROM var_reports WHERE vendor_id = ?",
            (vendor_id,)
        ).fetchall()
    }
    conn.close()
    vendor = _group_products([dict(row)], var_ids)
    return vendor[0]


@app.get("/api/vendors/{vendor_id}/highlights", response_model=HighlightsResponse)
def get_vendor_highlights(vendor_id: str):
    """Return all monthly assessment highlights for a vendor."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM vendor_highlights WHERE vendor_id = ? "
        "ORDER BY assessment_date DESC",
        (vendor_id,)
    ).fetchall()
    conn.close()
    highlights = [HighlightOut(**dict(r)) for r in rows]
    return HighlightsResponse(total=len(highlights), highlights=highlights)


@app.get("/api/vendors/{vendor_id}/var-reports", response_model=VarReportsResponse)
def get_vendor_var_reports(vendor_id: str):
    """Return all VAR reports linked to a vendor."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM var_reports WHERE vendor_id = ? ORDER BY report_date DESC",
        (vendor_id,)
    ).fetchall()
    conn.close()
    reports = [VarReportOut(**dict(r)) for r in rows]
    return VarReportsResponse(total=len(reports), reports=reports)


@app.get("/api/var-reports", response_model=VarReportsResponse)
def list_all_var_reports():
    """Return all VAR reports across all vendors."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT vr.*, v.company_name FROM var_reports vr "
        "JOIN vendors v ON vr.vendor_id = v.id "
        "ORDER BY vr.report_date DESC"
    ).fetchall()
    conn.close()
    reports = [
        VarReportOut(**{k: v for k, v in dict(r).items() if k != 'company_name'})
        for r in rows
    ]
    return VarReportsResponse(total=len(reports), reports=reports)


# ── Chat (stub — returns helpful message when no LLM key configured) ─────

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Chat endpoint stub. Wire up to Element LLM Gateway for full AI."""
    return ChatResponse(
        response=(
            f"Thanks for your question: *\"{req.message}\"*\n\n"
            "SENTRY-AI is not yet configured. To enable AI chat, "
            "get an Element LLM Gateway key from **#element-genai-support** "
            "on Slack and set ELEMENT_API_KEY in your environment."
        )
    )


# ── Forms (local stubs — generate ref IDs) ──────────────────────────

@app.post("/api/assessment", response_model=FormResponse)
def submit_assessment(data: dict):
    """Accept a security assessment request."""
    ref = f"SENTRY-ASM-{uuid.uuid4().hex[:8].upper()}"
    return FormResponse(success=True, ref_id=ref, message="Assessment queued.")


@app.post("/api/lab-visit", response_model=FormResponse)
def submit_lab_visit(data: dict):
    """Accept a lab visit request."""
    ref = f"SENTRY-LAB-{uuid.uuid4().hex[:8].upper()}"
    return FormResponse(success=True, ref_id=ref, message="Lab visit requested.")
