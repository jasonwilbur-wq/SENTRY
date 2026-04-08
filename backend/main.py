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
from admin_routes import router as admin_router
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
    version="2.1.0",
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
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Sentry-User"],
)

# ── Admin router (Phase 3) ────────────────────────────────────
app.include_router(admin_router)
from admin_routes import competitor_router
app.include_router(competitor_router)


# ── Health / auth status ──────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    """Health check — includes auth posture so frontend can show warnings."""
    from auth import get_auth_status
    auth_status = get_auth_status()
    return {
        "status": "ok",
        "version": "2.1.0",
        **auth_status,
    }
from regulatory_routes import ROUTER as regulatory_router
app.include_router(regulatory_router)
from incident_routes import ROUTER as incident_router
app.include_router(incident_router)
from project_routes import ROUTER as project_router
app.include_router(project_router)


# ── Vendors ────────────────────────────────────────────────────────────

def _group_products(
    rows: list[dict],
    var_vendor_ids: set[str] | None = None,
    latest_var_ids: dict[str, str] | None = None,
    linked_map: dict[str, list[dict]] | None = None,
    var_count_map: dict[str, int] | None = None,
) -> list[VendorOut]:
    """Group multiple product rows for the same company into one VendorOut."""
    var_ids     = var_vendor_ids or set()
    var_id_map  = latest_var_ids or {}   # vendor_id -> latest var_report.id
    prj_map     = linked_map or {}       # lowercase company_name -> [{project...}]
    vc_map      = var_count_map or {}    # vendor_id -> count of VAR reports
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
                company_url=row.get("company_url", ""),
                category=row["category"],
                technology_product=row["technology_product"],
                report_url=row["report_url"],
                overall_rating=row["overall_rating"],
                vendor_status=row["vendor_status"],
                risk_level=row["risk_level"],
                last_assessed=row["last_assessed"],
                has_var=has_v,
                var_count=vc_map.get(row["id"], 0),
                latest_var_id=var_id_map.get(row["id"], ""),
                all_products=[product],
                # Extended fields
                description=row.get("description", ""),
                founded_year=row.get("founded_year", ""),
                hq_location=row.get("hq_location", ""),
                business_owner=row.get("business_owner", ""),
                sourcing_manager=row.get("sourcing_manager", ""),
                deployment_status=row.get("deployment_status", "Prospect"),
                hosting_type=row.get("hosting_type", ""),
                data_classification=row.get("data_classification", "Internal"),
                # Enhanced vendor details (202601/202602 import)
                vendor_highlight=row.get("vendor_highlight", ""),
                pros=row.get("pros", ""),
                cons=row.get("cons", ""),
                concerns=row.get("concerns", ""),
                use_cases=row.get("use_cases", ""),
                value_to_walmart=row.get("value_to_walmart", ""),
                maturity_level=row.get("maturity_level", ""),
                # Project associations
                linked_projects=prj_map.get(name.lower(), []),
            )
    return list(companies.values())


@app.get("/api/vendors", response_model=VendorsResponse)
def list_vendors(
    category:   str | None = Query(None),
    search:     str | None = Query(None),
    risk_level: str | None = Query(None),
    has_var:    str | None = Query(None),    # 'yes' or 'no'
    sort:       str | None = Query(None),    # name, rating, risk, last_assessed
    page:       int = Query(1,  ge=1),
    page_size:  int = Query(20, ge=1, le=500),
):
    """Return vendors paginated, optionally filtered by category, search term,
    risk level, or VAR status. Supports sort parameter.

    Search covers: company_name, technology_product, category, description,
    risk_level, and vendor_status.
    """
    conn = get_connection()
    params: list[str] = []
    clauses: list[str] = []

    if category and category != "All":
        clauses.append("category = ?")
        params.append(category)
    if risk_level:
        clauses.append("risk_level = ?")
        params.append(risk_level)
    if search:
        clauses.append(
            "(LOWER(company_name) LIKE ? OR LOWER(technology_product) LIKE ?"
            " OR LOWER(category) LIKE ? OR LOWER(description) LIKE ?"
            " OR LOWER(risk_level) LIKE ? OR LOWER(vendor_status) LIKE ?)"
        )
        term = f"%{search.lower()}%"
        params.extend([term, term, term, term, term, term])

    # Sort mapping — default is rating DESC
    SORT_MAP = {
        "name":          "company_name ASC",
        "rating":        "overall_rating DESC",
        "risk":          "CASE risk_level WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END ASC",
        "last_assessed":  "last_assessed DESC",
    }
    order_clause = SORT_MAP.get(sort or "", "overall_rating DESC")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"SELECT * FROM vendors {where} ORDER BY {order_clause}"

    rows = [dict(r) for r in conn.execute(query, params).fetchall()]

    # Fetch vendor IDs that have VAR reports
    var_ids = {
        r[0] for r in conn.execute("SELECT DISTINCT vendor_id FROM var_reports").fetchall()
    }
    # VAR count per vendor
    var_count_map = {
        r[0]: r[1]
        for r in conn.execute(
            "SELECT vendor_id, COUNT(*) FROM var_reports GROUP BY vendor_id"
        ).fetchall()
    }
    # Latest VAR id per vendor (for download proxy)
    latest_var_ids = {
        r[0]: r[1]
        for r in conn.execute(
            "SELECT vendor_id, id FROM var_reports "
            "GROUP BY vendor_id HAVING report_date = MAX(report_date)"
        ).fetchall()
    }
    # Linked projects: join project_vendors → projects on vendor_name ≈ company_name
    # Case-insensitive match covers minor name differences
    linked_rows = conn.execute("""
        SELECT
            LOWER(pv.vendor_name)  AS vname,
            pv.project_id,
            p.project_name,
            p.current_phase,
            p.est_phase_index,
            pv.role,
            pv.status
        FROM project_vendors pv
        JOIN projects p ON pv.project_id = p.project_id
        WHERE p.lifecycle_state NOT IN ('rejected', 'discontinued')
    """).fetchall()
    # Build a map: lowercase vendor name → list of linked project dicts
    linked_map: dict[str, list[dict]] = {}
    for lr in linked_rows:
        key = dict(lr)["vname"]
        linked_map.setdefault(key, []).append({
            "project_id":     dict(lr)["project_id"],
            "project_name":   dict(lr)["project_name"],
            "current_phase":  dict(lr)["current_phase"],
            "est_phase_index":dict(lr)["est_phase_index"],
            "role":           dict(lr)["role"] or "",
            "status":         dict(lr)["status"] or "",
        })
    conn.close()

    # Group multiple-product rows into logical vendors
    all_vendors = _group_products(rows, var_ids, latest_var_ids, linked_map, var_count_map)

    # Apply has_var filter after grouping (needs computed has_var field)
    if has_var == "yes":
        all_vendors = [v for v in all_vendors if v.has_var]
    elif has_var == "no":
        all_vendors = [v for v in all_vendors if not v.has_var]

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
@app.get("/api/vendors/categories")
def list_categories():
    """Return vendor categories with counts, sorted by count descending."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT category, COUNT(*) as cnt FROM vendors "
        "GROUP BY category HAVING cnt > 0 ORDER BY cnt DESC"
    ).fetchall()
    conn.close()
    return {
        "categories": [r["category"] for r in rows],
        "category_counts": {r["category"]: r["cnt"] for r in rows},
    }


@app.get("/api/vendors/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: str):
    """Return a single vendor by ID, enriched with latest VAR scores.

    All queries run inside a single connection that is closed once — the
    previous version closed the connection mid-function and then tried to
    execute a second query on the dead handle, causing ProgrammingError 500s
    for any vendor that had VAR reports.
    """
    from fastapi import HTTPException

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM vendors WHERE id = ?", (vendor_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vendor not found")

        row_dict = dict(row)

        var_ids = {
            r[0] for r in conn.execute(
                "SELECT DISTINCT vendor_id FROM var_reports WHERE vendor_id = ?",
                (vendor_id,)
            ).fetchall()
        }

        # Latest VAR scores for the detail panel — keep connection open!
        var_row = conn.execute("""
            SELECT
                overall_score, compliance_score, risk_score, maturity_score,
                integration_score, roi_score, viability_score,
                differentiation_score, cloud_dep_score
            FROM var_reports
            WHERE vendor_id = ?
            ORDER BY report_date DESC LIMIT 1
        """, (vendor_id,)).fetchone()
    finally:
        conn.close()

    var_scores = None
    if var_row:
        var_scores = {
            "Overall":         var_row[0],
            "Compliance":      var_row[1],
            "Risk":            var_row[2],
            "Maturity":        var_row[3],
            "Integration":     var_row[4],
            "ROI":             var_row[5],
            "Viability":       var_row[6],
            "Differentiation": var_row[7],
            "Cloud Dep":       var_row[8],
        }

    base_vendor = _group_products([row_dict], var_ids)[0]
    enriched    = base_vendor.dict()
    enriched.update({
        "var_scores":         var_scores,
        "description":        str(row_dict.get("description")        or ""),
        "founded_year":       str(row_dict.get("founded_year")       or ""),
        "hq_location":        str(row_dict.get("hq_location")        or ""),
        "business_owner":     str(row_dict.get("business_owner")     or ""),
        "sourcing_manager":   str(row_dict.get("sourcing_manager")   or ""),
        "deployment_status":  str(row_dict.get("deployment_status")  or "Prospect"),
        "hosting_type":       str(row_dict.get("hosting_type")       or ""),
        "data_classification": str(row_dict.get("data_classification") or "Internal"),
    })
    return VendorOut(**enriched)


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


# ── Public stats (used by Vendor Directory dashboard) ────────────────────

@app.get("/api/stats")
def public_stats():
    """Aggregate stats for the Vendor Directory dashboard panel."""
    conn = get_connection()

    total_vendors = conn.execute("SELECT COUNT(*) FROM vendors").fetchone()[0]
    total_vars = conn.execute("SELECT COUNT(*) FROM var_reports").fetchone()[0]
    vendors_with_var = conn.execute(
        "SELECT COUNT(DISTINCT vendor_id) FROM var_reports"
    ).fetchone()[0]
    avg_rating = conn.execute("SELECT AVG(overall_rating) FROM vendors").fetchone()[0] or 0

    risk_rows = conn.execute(
        "SELECT risk_level, COUNT(*) as cnt FROM vendors "
        "WHERE risk_level IS NOT NULL AND risk_level != '' "
        "GROUP BY risk_level"
    ).fetchall()

    category_rows = conn.execute(
        "SELECT category, COUNT(*) as cnt, ROUND(AVG(overall_rating), 2) as avg_rating "
        "FROM vendors GROUP BY category ORDER BY cnt DESC LIMIT 12"
    ).fetchall()

    band_rows = conn.execute(
        "SELECT decision_band, COUNT(*) as cnt FROM var_reports "
        "WHERE decision_band IS NOT NULL AND decision_band != '' "
        "GROUP BY decision_band ORDER BY cnt DESC"
    ).fetchall()

    # Vendors assessed in the last 90 days (rough recency proxy)
    recent_rows = conn.execute(
        "SELECT COUNT(DISTINCT company_name) FROM vendors "
        "WHERE last_assessed >= date('now', '-90 days')"
    ).fetchone()[0]

    conn.close()

    return {
        "total_vendors": total_vendors,
        "total_vars": total_vars,
        "vendors_with_var": vendors_with_var,
        "var_coverage_pct": round(vendors_with_var / total_vendors * 100, 1) if total_vendors else 0,
        "avg_rating": round(avg_rating, 2),
        "recently_assessed": recent_rows or 0,
        "risk_distribution": {r["risk_level"]: r["cnt"] for r in risk_rows},
        "top_categories": [
            {"category": r["category"], "count": r["cnt"], "avg_rating": r["avg_rating"]}
            for r in category_rows
        ],
        "decision_bands": {r["decision_band"]: r["cnt"] for r in band_rows},
    }


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
async def chat(req: ChatRequest):
    """Chat endpoint — powered by Element LLM Gateway with live SENTRY context."""
    api_key  = os.environ.get("ELEMENT_API_KEY", "")
    base_url = os.environ.get("ELEMENT_BASE_URL", "https://api.llm.walmart.com")

    if not api_key:
        return ChatResponse(
            response=(
                f'Thanks for your question: **"{req.message}"**\n\n'
                "SENTRY-AI needs an Element LLM Gateway key to answer. "
                "Ask **#element-genai-support** on Slack for a key, then set "
                "`ELEMENT_API_KEY=<your-key>` in your environment and restart the backend."
            )
        )

    # ── Pull live context snapshot from the SENTRY database ────────────────
    ctx: dict = {}
    try:
        _conn = get_connection()
        ctx["total_vendors"] = _conn.execute("SELECT COUNT(*) FROM vendors").fetchone()[0]
        ctx["total_vars"]    = _conn.execute("SELECT COUNT(*) FROM var_reports").fetchone()[0]

        risk_rows  = _conn.execute(
            "SELECT risk_level, COUNT(*) AS cnt FROM vendors "
            "WHERE risk_level IS NOT NULL AND risk_level != '' GROUP BY risk_level"
        ).fetchall()
        ctx["risk_summary"] = ", ".join(f"{r['risk_level']}: {r['cnt']}" for r in risk_rows)

        cat_rows = _conn.execute(
            "SELECT category, COUNT(*) AS cnt FROM vendors "
            "GROUP BY category ORDER BY cnt DESC LIMIT 8"
        ).fetchall()
        ctx["top_cats"] = ", ".join(f"{r['category']} ({r['cnt']})" for r in cat_rows)

        hr_rows = _conn.execute(
            "SELECT company_name FROM vendors "
            "WHERE risk_level IN ('High','Critical') "
            "ORDER BY overall_rating ASC LIMIT 8"
        ).fetchall()
        ctx["high_risk"] = ", ".join(r["company_name"] for r in hr_rows) or "None"

        try:
            ctx["competitor_events"] = _conn.execute(
                "SELECT COUNT(*) FROM competitor_events"
            ).fetchone()[0]
        except Exception:
            ctx["competitor_events"] = "N/A"

        # Incident data for richer AI context
        try:
            ctx["total_incidents"] = _conn.execute(
                "SELECT COUNT(*) FROM incidents"
            ).fetchone()[0]
            inc_rows = _conn.execute(
                "SELECT incident_type, COUNT(*) AS cnt FROM incidents "
                "GROUP BY incident_type ORDER BY cnt DESC LIMIT 5"
            ).fetchall()
            ctx["top_incident_types"] = ", ".join(
                f"{r['incident_type']} ({r['cnt']})" for r in inc_rows
            ) or "N/A"
            crit_rows = _conn.execute(
                "SELECT incident_date, incident_type, location, summary "
                "FROM incidents WHERE severity='Critical' "
                "ORDER BY incident_date DESC LIMIT 3"
            ).fetchall()
            ctx["critical_incidents"] = "; ".join(
                f"{r['incident_date']} — {r['incident_type']} ({r['location']})"
                for r in crit_rows
            ) or "None"
        except Exception:
            ctx["total_incidents"]     = "N/A"
            ctx["top_incident_types"]  = "N/A"
            ctx["critical_incidents"]  = "N/A"

        _conn.close()
    except Exception:
        ctx = {
            "total_vendors": "N/A", "total_vars": "N/A",
            "risk_summary": "N/A", "top_cats": "N/A",
            "high_risk": "N/A", "competitor_events": "N/A",
        }

    system_prompt = f"""You are SENTRY-AI, the embedded intelligence assistant for \nWalmart\'s Enterprise Security Emerging Technology (EST) team. \nYou are knowledgeable, direct, and security-minded.

## Live SENTRY Data Snapshot
- Vendors tracked: {ctx['total_vendors']}
- VAR reports completed: {ctx['total_vars']}
- Risk distribution: {ctx['risk_summary']}
- Top technology categories: {ctx['top_cats']}
- High/Critical risk vendors: {ctx['high_risk']}
- Competitor events indexed: {ctx['competitor_events']}
- Retail incidents tracked: {ctx.get('total_incidents', 'N/A')}
- Top incident types: {ctx.get('top_incident_types', 'N/A')}
- Recent critical incidents: {ctx.get('critical_incidents', 'N/A')}

## Your Role
- Answer questions about vendor security assessments, VAR reports, and risk ratings
- Explain SENTRY\'s four-phase GCP architecture
- Help interpret regulatory obligations (RAG: Red=19-25, Amber=13-18, Yellow=7-12, Green=1-6)
- Discuss competitor intelligence trends (ORC/Theft, Cyber, Legal, Recall, Strategic)
- Analyze retail incident patterns, severity, and regional distribution
- Clarify VAR decision bands: Advance (>4.0), Research Further (3.0-4.0), Defer (2.0-2.9), Reject (<2.0)
- Support the EST team at Walmart — owner is Jason Wilbur, CSO is Jerrad Crabtree
- Know that incident severity levels are: Critical (cyber/violence), High (cargo theft/robbery), Medium (ORC/fraud), Low (arrests/policy)

Be concise and professional. Use markdown **bold** and bullet lists where helpful."""

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for m in req.history:
        messages.append({
            "role": "user" if m.role == "user" else "assistant",
            "content": m.text,
        })
    messages.append({"role": "user", "content": req.message})

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "temperature": 0.4,
                    "max_tokens": 1000,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return ChatResponse(response=content)
    except Exception as exc:
        return ChatResponse(
            response=(
                f"⚠️ **SENTRY-AI error:** {exc}\n\n"
                "Please verify `ELEMENT_API_KEY` is valid and the backend can "
                "reach the Element LLM Gateway (`https://api.llm.walmart.com`). "
                "You must be on Walmart VPN or Eagle WiFi."
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


# ── Morning Brief ─────────────────────────────────────────────────────────

@app.get("/api/morning-brief")
def morning_brief() -> dict:
    """Aggregate live snapshot for the Home Dashboard morning brief card."""
    conn = get_connection()

    # Incident highlights
    try:
        recent_incidents = [
            dict(zip(r.keys(), tuple(r)))
            for r in conn.execute(
                "SELECT id, incident_date, incident_type, severity, location, summary "
                "FROM incidents WHERE incident_date != '' "
                "ORDER BY incident_date DESC LIMIT 5"
            )
        ]
        total_incidents = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
        critical_count  = conn.execute(
            "SELECT COUNT(*) FROM incidents WHERE severity='Critical'"
        ).fetchone()[0]
    except Exception:
        recent_incidents = []
        total_incidents  = 0
        critical_count   = 0

    # Vendors without recent assessment (>180 days)
    try:
        stale_vendors = [
            dict(zip(r.keys(), tuple(r)))
            for r in conn.execute(
                """
                SELECT company_name, category, last_assessed, overall_rating
                FROM   vendors
                WHERE  last_assessed != ''
                  AND  last_assessed < date('now', '-180 days')
                  AND  has_var = 1
                ORDER  BY last_assessed ASC
                LIMIT  5
                """
            )
        ]
    except Exception:
        stale_vendors = []

    # Competitor events count last 30 days (approximate: newest 30 records)
    try:
        comp_recent = conn.execute(
            "SELECT COUNT(*) FROM competitor_events"
        ).fetchone()[0]
    except Exception:
        comp_recent = 0

    # Regulatory — Red count
    reg_red   = 0
    reg_amber = 0
    try:
        import json
        from pathlib import Path as _P
        reg_path = _P(__file__).parent / "data" / "json_reports" / "regulatory-briefing.json"
        if reg_path.exists():
            reg_data  = json.loads(reg_path.read_text(encoding="utf-8"))
            stats     = reg_data.get("stats", {})
            reg_red   = stats.get("red", 0)
            reg_amber = stats.get("amber", 0)
    except Exception:
        pass

    conn.close()
    return {
        "generated_at":    __import__("datetime").datetime.utcnow().isoformat(),
        "incidents": {
            "total":    total_incidents,
            "critical": critical_count,
            "recent":   recent_incidents,
        },
        "regulatory": {
            "red":   reg_red,
            "amber": reg_amber,
        },
        "competitors": {
            "total_events": comp_recent,
        },
        "vendors": {
            "stale_assessments": stale_vendors,
        },
    }


# ── Competitor Intelligence API ─────────────────────────────────────────────
# NOTE: all /api/competitors/* routes must be registered before the generic
#       /{vendor_id} route if that ever becomes a concern.

MONTHS_ORDERED = [
    "Sep 2025", "Oct 2025", "Nov 2025",
    "Dec 2025", "Jan 2026", "Feb 2026",
]


@app.get("/api/competitors/stats")
def competitor_stats():
    """KPI totals across all competitor events."""
    conn = get_connection()
    row = conn.execute("""
        SELECT
          COUNT(*)  AS total,
          SUM(CASE WHEN category='Cyber'     THEN 1 ELSE 0 END) AS cyber,
          SUM(CASE WHEN category='ORC/Theft' THEN 1 ELSE 0 END) AS orc,
          SUM(CASE WHEN category='Recall'    THEN 1 ELSE 0 END) AS recall,
          SUM(CASE WHEN category='Legal'     THEN 1 ELSE 0 END) AS legal,
          SUM(CASE WHEN category='Strategic' THEN 1 ELSE 0 END) AS strategic
        FROM competitor_events
    """).fetchone()
    comp_count = conn.execute(
        "SELECT COUNT(*) FROM competitor_entities WHERE event_count >= 3"
    ).fetchone()[0]
    conn.close()
    d = dict(row)
    d["competitor_count"] = comp_count
    return d


@app.get("/api/competitors/entities")
def competitor_entities(
    limit: int = Query(20, ge=1, le=135),
    min_events: int = Query(3, ge=0),
):
    """Return ranked competitor entities for card grid + orbital scene."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT name, event_count, cyber_count, orc_count, recall_count,
               legal_count, strategic_count, threat_level, top_category,
               categories_json, monthly_json
        FROM competitor_entities
        WHERE event_count >= ?
        ORDER BY event_count DESC
        LIMIT ?
    """, (min_events, limit)).fetchall()
    conn.close()
    return {"entities": [dict(r) for r in rows]}


@app.get("/api/competitors/monthly")
def competitor_monthly(top: int = Query(5, ge=1, le=10)):
    """Monthly event counts for the top-N competitors."""
    conn = get_connection()
    top_names = [
        r[0] for r in conn.execute(
            "SELECT name FROM competitor_entities "
            "WHERE event_count >= 3 ORDER BY event_count DESC LIMIT ?",
            (top,)
        ).fetchall()
    ]
    result = {}
    for name in top_names:
        monthly = []
        for month in MONTHS_ORDERED:
            cnt = conn.execute(
                "SELECT COUNT(*) FROM competitor_events "
                "WHERE competitor=? AND source_month LIKE ?",
                (name, f"%{month}%")
            ).fetchone()[0]
            monthly.append(cnt)
        result[name] = monthly
    conn.close()
    return {"months": MONTHS_ORDERED, "series": result}


@app.get("/api/competitors/heatmap")
def competitor_heatmap(top: int = Query(10, ge=1, le=20)):
    """Competitor × category event-count matrix."""
    HEAT_CATS = [
        "Cyber", "ORC/Theft", "Recall", "Legal", "Strategic",
        "Operational", "Compliance", "Fraud", "Technology", "Other",
    ]
    conn = get_connection()
    top_names = [
        r[0] for r in conn.execute(
            "SELECT name FROM competitor_entities "
            "WHERE event_count >= 3 ORDER BY event_count DESC LIMIT ?",
            (top,)
        ).fetchall()
    ]
    matrix = []
    for name in top_names:
        row_counts = []
        for cat in HEAT_CATS:
            cnt = conn.execute(
                "SELECT COUNT(*) FROM competitor_events "
                "WHERE competitor=? AND category=?",
                (name, cat)
            ).fetchone()[0]
            row_counts.append(cnt)
        matrix.append(row_counts)
    conn.close()
    return {"competitors": top_names, "categories": HEAT_CATS, "matrix": matrix}


@app.get("/api/competitors/events")
def competitor_events(
    competitor: str | None = Query(None),
    category:   str | None = Query(None),
    month:      str | None = Query(None),
    q:          str | None = Query(None),
    page:       int = Query(1,  ge=1),
    page_size:  int = Query(25, ge=1, le=100),
):
    """Paginated, filterable competitor events feed."""
    conn = get_connection()
    clauses, params = [], []
    if competitor:
        clauses.append("competitor = ?")
        params.append(competitor)
    if category:
        clauses.append("category = ?")
        params.append(category)
    if month:
        clauses.append("source_month LIKE ?")
        params.append(f"%{month}%")
    if q:
        clauses.append("(event_title LIKE ? OR detailed_description LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    total = conn.execute(
        f"SELECT COUNT(*) FROM competitor_events {where}", params
    ).fetchone()[0]
    offset = (page - 1) * page_size
    rows = conn.execute(
        f"SELECT id, event_date, competitor, event_title, event_type, "
        f"category, location, security_implication, detailed_description, "
        f"analyst_notes, source_link, source_month "
        f"FROM competitor_events {where} "
        f"ORDER BY event_date DESC LIMIT ? OFFSET ?",
        params + [page_size, offset]
    ).fetchall()
    conn.close()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
        "events": [dict(r) for r in rows],
    }


@app.get("/api/competitors/categories")
def competitor_categories():
    """Distinct categories used across all events."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT DISTINCT category FROM competitor_events "
        "WHERE category IS NOT NULL ORDER BY category"
    ).fetchall()
    conn.close()
    return {"categories": [r[0] for r in rows]}


@app.get("/api/competitors/cso-candidates")
def competitor_cso_candidates(limit: int = Query(25, ge=1, le=100)):
    """High-priority competitor events for executive brief workflows."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, event_date, competitor, event_title, event_type,
               category, location, security_implication, detailed_description,
               analyst_notes, source_link, source_month,
               walmart_relevance_score, priority_tier, signal_type,
               recommended_owner, why_walmart_cares,
               strategic_score, security_score, operational_score,
               customer_trust_score, novelty_score, urgency_score,
               confidence_score, escalate_to_cso, scoring_version
        FROM competitor_events
        WHERE (deleted_at IS NULL OR deleted_at = '')
          AND (
                escalate_to_cso = 1
                OR priority_tier = 'CSO Brief'
                OR walmart_relevance_score >= 85
          )
        ORDER BY walmart_relevance_score DESC, event_date DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    conn.close()
    return {
        "count": len(rows),
        "events": [dict(r) for r in rows],
    }
