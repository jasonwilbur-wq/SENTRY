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
import math
import os
import uuid
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse

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

try:
    from sharepoint_auth import get_token, download_url_for_item
except ImportError:
    get_token = lambda: None
    download_url_for_item = lambda x: ""


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

# ── CORS origins ─────────────────────────────────────────────────────────
# Set ALLOWED_ORIGINS env var to a comma-separated list of origins.
# Defaults to localhost:3000 for local development.
# Production: set on Cloud Run to your Firebase Hosting URL.
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Vendors ────────────────────────────────────────────────────────────

def _group_products(
    rows: list[dict],
    var_vendor_ids: set[str] | None = None,
    latest_var_ids: dict[str, str] | None = None,
) -> list[VendorOut]:
    """Group multiple product rows for the same company into one VendorOut."""
    var_ids     = var_vendor_ids or set()
    var_id_map  = latest_var_ids or {}   # vendor_id -> latest var_report.id
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
            if not companies[name].has_var and row["id"] in var_ids:
                companies[name].has_var = True
        else:
            has_v = row["id"] in var_ids
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
                has_var=has_v,
                latest_var_id=var_id_map.get(row["id"], ""),
                all_products=[product],
            )
    return list(companies.values())


@app.get("/api/vendors", response_model=VendorsResponse)
def list_vendors(
    category: str | None = Query(None),
    search:   str | None = Query(None),
    page:      int = Query(1,  ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Return vendors paginated, optionally filtered by category or search term.

    Grouping (multiple products per company) happens in Python after the DB
    fetch — SQLite has ~1,931 rows so this is sub-millisecond.
    """
    conn = get_connection()
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

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"SELECT * FROM vendors {where} ORDER BY overall_rating DESC"

    rows = [dict(r) for r in conn.execute(query, params).fetchall()]

    # Fetch vendor IDs that have VAR reports
    var_ids = {
        r[0] for r in conn.execute("SELECT DISTINCT vendor_id FROM var_reports").fetchall()
    }
    # Latest VAR id per vendor (for download proxy)
    latest_var_ids = {
        r[0]: r[1]
        for r in conn.execute(
            "SELECT vendor_id, id FROM var_reports "
            "GROUP BY vendor_id HAVING report_date = MAX(report_date)"
        ).fetchall()
    }
    conn.close()

    # Group multiple-product rows into logical vendors
    all_vendors = _group_products(rows, var_ids, latest_var_ids)

    total       = len(all_vendors)
    total_pages = max(1, math.ceil(total / page_size))
    page        = min(page, total_pages)          # clamp to valid range
    offset      = (page - 1) * page_size
    page_vendors = all_vendors[offset : offset + page_size]

    return VendorsResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        vendors=page_vendors,
    )


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


# ── VAR Report Download Proxy ─────────────────────────────────────────

@app.get("/api/vars/download/{var_id}")
async def download_var_report(var_id: str):
    """Proxy-download a VAR .docx from SharePoint via Graph API.

    Flow:
      1. Look up item_id + sharepoint_url from var_reports.
      2. Try Graph API with cached MSAL token.
      3. Fall back to SharePoint web redirect if Graph fails.
    """
    conn = get_connection()
    row = conn.execute(
        "SELECT filename, sharepoint_url, item_id FROM var_reports WHERE id = ?",
        (var_id,),
    ).fetchone()
    conn.close()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="VAR report not found")

    filename  = row["filename"] or "VAR_Report.docx"
    sp_url    = row["sharepoint_url"] or ""
    item_id   = row["item_id"] or ""

    # Try Graph API first (direct .docx byte stream)
    token = get_token()
    if token and item_id:
        graph_url = download_url_for_item(item_id)
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
                resp = await client.get(
                    graph_url,
                    headers={"Authorization": f"Bearer {token}"},
                )
            if resp.status_code == 200:
                content = resp.content
                return StreamingResponse(
                    iter([content]),
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )
        except Exception:
            pass  # Fall through to SharePoint redirect

    # Fallback: redirect to SharePoint web URL
    if sp_url:
        return RedirectResponse(url=sp_url)

    from fastapi import HTTPException
    raise HTTPException(status_code=503, detail="Download unavailable — token expired")


# ── Chat (stub — returns helpful message when no LLM key configured) ─────


@app.get("/api/vendors/{vendor_id}/tech-pipeline")
def vendor_tech_pipeline(vendor_id: str):
    """Return assessment pipeline summary for a vendor.

    Returns per-product pipeline stage progress:
    pre_assessment -> initial_assessment -> technical_assessment -> var_report
    """
    conn = get_connection()

    # All highlight rows for this vendor
    rows = conn.execute(
        "SELECT product_name, assessment_date, source_file, "
        "pre_assessment_decision, pre_assessment_score, maturity_level, "
        "initial_assessment, technical_assessment "
        "FROM vendor_highlights WHERE vendor_id = ? "
        "ORDER BY source_file DESC",
        (vendor_id,),
    ).fetchall()

    has_var = conn.execute(
        "SELECT COUNT(*) FROM var_reports WHERE vendor_id = ?",
        (vendor_id,),
    ).fetchone()[0] > 0

    conn.close()

    if not rows:
        return {"vendor_id": vendor_id, "has_pipeline_data": False, "products": []}

    # Aggregate per product (take latest record per product)
    products: dict[str, dict] = {}
    for row in rows:
        name = (row["product_name"] or "Unknown").strip() or "Unknown"
        if name not in products:
            products[name] = {
                "product_name": name,
                "assessment_date": row["assessment_date"],
                "source_file": row["source_file"],
                "pre_assessment_score": row["pre_assessment_score"],
                "pre_assessment_decision": row["pre_assessment_decision"] or "",
                "maturity_level": row["maturity_level"] or "",
                "initial_assessment": row["initial_assessment"] or "",
                "technical_assessment": row["technical_assessment"] or "",
                "has_var": has_var,
                # Computed pipeline stage (0-4)
                "pipeline_stage": _pipeline_stage(
                    row["pre_assessment_decision"],
                    row["initial_assessment"],
                    row["technical_assessment"],
                    has_var,
                ),
            }

    # Summary stats
    stages = [p["pipeline_stage"] for p in products.values()]
    ia_vals = [p["initial_assessment"] for p in products.values() if p["initial_assessment"]]
    ta_vals = [p["technical_assessment"] for p in products.values() if p["technical_assessment"]]

    ia_pass  = sum(1 for v in ia_vals if v.lower() in ("pass", "yes"))
    ia_fail  = sum(1 for v in ia_vals if v.lower() in ("fail", "no"))
    ia_pend  = len(ia_vals) - ia_pass - ia_fail

    return {
        "vendor_id": vendor_id,
        "has_pipeline_data": True,
        "has_var": has_var,
        "summary": {
            "total_products": len(products),
            "technically_assessed": len(ta_vals),
            "initial_pass": ia_pass,
            "initial_fail": ia_fail,
            "initial_pending": ia_pend,
            "max_pipeline_stage": max(stages) if stages else 0,
        },
        "products": list(products.values()),
    }


def _pipeline_stage(
    pre_decision: str | None,
    initial: str | None,
    technical: str | None,
    has_var: bool,
) -> int:
    """Return 0-4 representing how far in the pipeline this product is.

    0 = not started
    1 = pre-assessment done
    2 = initial assessment done (Pass/Yes)
    3 = technical assessment done
    4 = VAR complete
    """
    if has_var:
        return 4
    if technical and technical.lower() == "yes":
        return 3
    if initial and initial.lower() in ("pass", "yes"):
        return 2
    if pre_decision:
        return 1
    return 0


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
