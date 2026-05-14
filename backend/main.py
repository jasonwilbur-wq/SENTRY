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
import csv
import hashlib
import math
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse

from database import get_connection, init_db
from admin_routes import router as admin_router
from vendor_assessment_routes import router as vendor_assessment_router
from request_routes import router as request_router
from project_routes import ROUTER as project_router
from incident_routes import ROUTER as incident_router
from regulatory_routes import ROUTER as regulatory_router, get_regulatory_summary
from analytics_routes import ROUTER as analytics_router
from vendor_sync_routes import router as vendor_sync_router
from auth import SentryUser, get_current_user, get_auth_status
from cache import ttl_cache, clear_all
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
from path_config import (
    SENTRY_DATA_ROOT,
    VENDOR_ASSESSMENTS_ROOT,
    VENDOR_PROFILES_CSV,
    PROJECTS_ROOT,
    REGULATORY_ROOT,
    INCIDENTS_ROOT,
    workspace_snapshot,
)

try:
    from sharepoint_auth import get_token, download_url_for_item
except ImportError:
    get_token = lambda: None
    download_url_for_item = lambda x: ""

try:
    from import_vendor_data import import_all as import_vendor_directory_data
except ImportError:
    import_vendor_directory_data = None


def _startup_vendor_profiles_csv() -> Path:
    return VENDOR_PROFILES_CSV


def _startup_canonical_vendor_keys(profile_csv: Path) -> set[str]:
    if not profile_csv.exists():
        return set()

    keys: set[str] = set()
    with profile_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            key = str(row.get("vendor_normalized_key") or "").strip().lower()
            if key:
                keys.add(key)
    return keys


def _startup_visible_vendor_count(conn) -> int:
    profile_csv = _startup_vendor_profiles_csv()
    canonical_keys = _startup_canonical_vendor_keys(profile_csv)
    if not canonical_keys:
        return int(conn.execute("SELECT COUNT(*) FROM vendors").fetchone()[0])

    rows = conn.execute("SELECT company_name FROM vendors").fetchall()
    return sum(
        1
        for row in rows
        if re.sub(r"[^a-z0-9]+", "", str(row["company_name"] or "").lower()) in canonical_keys
    )


def _ensure_vendor_directory_seeded() -> None:
    if import_vendor_directory_data is None:
        return

    conn = get_connection()
    try:
        total_vendors = int(conn.execute("SELECT COUNT(*) FROM vendors").fetchone()[0])
        visible_vendors = _startup_visible_vendor_count(conn)
    finally:
        conn.close()

    if total_vendors > 0 and visible_vendors > 0:
        return

    print(
        f"[startup] Vendor directory bootstrap triggered "
        f"(db_total={total_vendors}, visible_in_directory={visible_vendors})."
    )
    import_vendor_directory_data()
    clear_all()


@asynccontextmanager
async def lifespan(application: FastAPI):  # noqa: ARG001
    """Ensure DB tables exist on startup and bootstrap vendor data if needed."""
    init_db()
    _ensure_vendor_directory_seeded()
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
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Sentry-User"],
)

# ── Router wiring ──────────────────────────────────────────────────────
app.include_router(admin_router)
app.include_router(vendor_assessment_router)
app.include_router(request_router)


@app.get("/api/health")
def api_health() -> dict[str, object]:
    return {
        "status": "ok",
        "version": app.version,
        "allowed_origins": ALLOWED_ORIGINS,
        "workspace": workspace_snapshot(),
        "workspace_available": {
            "sentry_data_root": SENTRY_DATA_ROOT.exists(),
            "vendor_assessments_root": VENDOR_ASSESSMENTS_ROOT.exists(),
            "regulatory_root": REGULATORY_ROOT.exists(),
            "incidents_root": INCIDENTS_ROOT.exists(),
            "projects_root": PROJECTS_ROOT.exists(),
            "vendor_profiles_csv": VENDOR_PROFILES_CSV.exists(),
        },
    }
app.include_router(project_router)
app.include_router(incident_router)
app.include_router(regulatory_router)
app.include_router(analytics_router)
app.include_router(vendor_sync_router)


@app.get("/api/health")
def health() -> dict:
    auth_status = get_auth_status()
    return {
        "status": "ok",
        "version": app.version,
        **auth_status,
    }


@app.get("/api/auth/me")
def auth_me(user: SentryUser = Depends(get_current_user)) -> dict:
    return {
        "id": user.id,
        "role": user.role,
        "is_admin": user.is_admin,
    }


@app.get("/api/morning-brief")
def morning_brief() -> dict:
    now = datetime.utcnow().isoformat()
    conn = get_connection()

    critical_incidents = conn.execute(
        "SELECT COUNT(*) FROM incidents WHERE severity = 'Critical'"
    ).fetchone()[0]
    total_incidents = conn.execute(
        "SELECT COUNT(*) FROM incidents"
    ).fetchone()[0]
    recent_incidents = [
        dict(r)
        for r in conn.execute(
            """
            SELECT id, incident_date, incident_type, severity, location, summary, impact
            FROM incidents
            WHERE incident_date != ''
            ORDER BY incident_date DESC
            LIMIT 5
            """
        ).fetchall()
    ]

    competitor_total = conn.execute(
        "SELECT COUNT(*) FROM competitor_events"
    ).fetchone()[0]

    stale_assessments: list[dict] = []
    cutoff = datetime.utcnow() - timedelta(days=180)
    for row in conn.execute(
        "SELECT id, company_name, last_assessed FROM vendors WHERE last_assessed IS NOT NULL AND TRIM(last_assessed) != ''"
    ).fetchall():
        assessed = str(row["last_assessed"] or "").strip()
        try:
            assessed_dt = datetime.fromisoformat(assessed[:10])
        except ValueError:
            continue
        if assessed_dt < cutoff:
            stale_assessments.append({
                "vendor_id": row["id"],
                "company_name": row["company_name"],
            })

    conn.close()

    try:
        regulatory = get_regulatory_summary()
        stats = regulatory.get("stats", {})
        regulatory_red = int(stats.get("red", 0))
        regulatory_amber = int(stats.get("amber", 0))
    except Exception:
        regulatory_red = 0
        regulatory_amber = 0

    return {
        "generated_at": now,
        "incidents": {
            "critical": critical_incidents,
            "total": total_incidents,
            "recent": recent_incidents,
        },
        "regulatory": {
            "red": regulatory_red,
            "amber": regulatory_amber,
        },
        "competitors": {
            "total_events": competitor_total,
        },
        "vendors": {
            "stale_assessments": stale_assessments,
        },
    }


# ── Vendor directory authority + scoring helpers ───────────────────────

def _normalize_vendor_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _fallback_vendor_id(company_name: str, technology_product: str) -> str:
    slug = f"{company_name}::{technology_product}".lower().strip()
    return hashlib.sha256(slug.encode()).hexdigest()[:12]


def _fallback_category_from_domain(domain: str) -> str:
    clean_domain = str(domain or "").strip()
    if not clean_domain or clean_domain.upper() == "UNKNOWN":
        return "Other"
    return clean_domain.replace("_", " ")


def _fallback_risk_from_rating(rating: float) -> str:
    if rating >= 4.0:
        return "Low"
    if rating >= 3.0:
        return "Medium"
    if rating >= 2.0:
        return "High"
    return "Critical"


@ttl_cache(ttl_seconds=300, key_prefix="vendor_profile_keys")
def _canonical_vendor_keys() -> set[str]:
    if not VENDOR_PROFILES_CSV.exists():
        return set()

    keys: set[str] = set()
    with VENDOR_PROFILES_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            key = str(row.get("vendor_normalized_key") or "").strip().lower()
            if key:
                keys.add(key)
    return keys


def _is_vendor_in_directory(company_name: str, canonical_keys: set[str]) -> bool:
    if not canonical_keys:
        # Fail-open: if source file is unavailable, avoid blanking the directory.
        return True
    return _normalize_vendor_key(company_name) in canonical_keys


@ttl_cache(ttl_seconds=300, key_prefix="vendor_profile_rows")
def _fallback_vendor_rows_from_profiles() -> list[dict]:
    if not VENDOR_PROFILES_CSV.exists():
        return []

    rows: list[dict] = []
    with VENDOR_PROFILES_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            company_name = str(row.get("vendor_folder") or "").strip()
            if not company_name:
                continue

            top_tags = str(row.get("top_semantic_tags") or "").strip()
            technology_product = top_tags.split(";")[0].strip() if top_tags else ""
            try:
                report_count = int(float(str(row.get("report_count") or "0").strip() or "0"))
            except ValueError:
                report_count = 0

            overall_rating = round(2.5 + min(report_count, 6) * 0.4, 2)
            latest_modified = str(row.get("latest_modified_utc") or "").strip()
            last_assessed = latest_modified.split("T")[0] if "T" in latest_modified else latest_modified

            rows.append({
                "id": _fallback_vendor_id(company_name, technology_product),
                "company_name": company_name,
                "company_url": "",
                "category": _fallback_category_from_domain(str(row.get("dominant_domain") or "")),
                "technology_product": technology_product,
                "report_url": str(row.get("sample_report_path") or "").strip(),
                "overall_rating": overall_rating,
                "vendor_status": "Assessed",
                "risk_level": _fallback_risk_from_rating(overall_rating),
                "last_assessed": last_assessed,
                "description": "",
                "founded_year": "",
                "hq_location": "",
                "business_owner": "",
                "sourcing_manager": "",
                "deployment_status": "Prospect",
                "hosting_type": "",
                "data_classification": "Internal",
                "vendor_highlight": "",
                "pros": "",
                "cons": "",
                "concerns": "",
                "use_cases": "",
                "value_to_walmart": "",
                "maturity_level": "",
            })
    return rows


def _fallback_vendor_directory(
    category: str | None = None,
    search: str | None = None,
    risk: str | None = None,
) -> list[VendorOut]:
    rows = _fallback_vendor_rows_from_profiles()
    if category and category != "All":
        rows = [row for row in rows if str(row.get("category") or "") == category]
    if search:
        term = search.lower()
        rows = [
            row for row in rows
            if term in str(row.get("company_name") or "").lower()
            or term in str(row.get("technology_product") or "").lower()
        ]
    if risk:
        rows = [row for row in rows if str(row.get("risk_level") or "") == risk]
    rows.sort(key=lambda row: float(row.get("overall_rating") or 0), reverse=True)
    return _group_products(rows)


def _decision_band_from_score(score: float | None) -> str:
    if score is None:
        return ""
    if score >= 4.0:
        return "Advance"
    if score >= 3.0:
        return "Research Further"
    if score >= 2.0:
        return "Defer"
    return "Reject"


def _decision_path_from_metrics(
    weight_score: float | None,
    decision_band: str,
    risk_score: float | None,
    compliance_score: float | None,
) -> str:
    if weight_score is None:
        return "No VAR weighted score has been extracted yet."

    lower_bound = {
        "Advance": "4.0 - 5.0",
        "Research Further": "3.0 - 3.9",
        "Defer": "2.0 - 2.9",
        "Reject": "0.0 - 1.9",
    }.get(decision_band, "band unavailable")

    notes: list[str] = [f"Weight score {weight_score:.1f}/5 maps to {decision_band} ({lower_bound})."]
    if (risk_score or 0) < 3:
        notes.append("Risk score < 3.0 added mitigation gating.")
    if (compliance_score or 0) < 3.5:
        notes.append("Compliance score < 3.5 added remediation requirements.")

    return " ".join(notes)


def _prefer_var_meta(candidate: dict | None, current: dict | None) -> bool:
    if not candidate:
        return False
    if not current:
        return True

    candidate_has_score = candidate.get("var_weight_score") is not None
    current_has_score = current.get("var_weight_score") is not None
    if candidate_has_score != current_has_score:
        return candidate_has_score

    candidate_date = str(candidate.get("_report_date") or "")
    current_date = str(current.get("_report_date") or "")
    if candidate_date != current_date:
        return candidate_date > current_date

    candidate_created = str(candidate.get("_created_at") or "")
    current_created = str(current.get("_created_at") or "")
    return candidate_created > current_created


def _latest_var_meta_by_vendor(conn, vendor_ids: list[str]) -> dict[str, dict]:
    if not vendor_ids:
        return {}

    placeholders = ",".join(["?"] * len(vendor_ids))
    rows = conn.execute(
        f"""
        SELECT
            vendor_id, id, report_date, created_at, decision_band,
            overall_score, compliance_score, risk_score, maturity_score,
            integration_score, roi_score, viability_score,
            differentiation_score, cloud_dep_score
        FROM var_reports
        WHERE vendor_id IN ({placeholders})
        ORDER BY
            vendor_id,
            CASE WHEN overall_score IS NOT NULL THEN 0 ELSE 1 END,
            report_date DESC,
            created_at DESC
        """,
        vendor_ids,
    ).fetchall()

    meta: dict[str, dict] = {}
    for report in rows:
        vendor_id = str(report["vendor_id"])
        if vendor_id in meta:
            continue

        weight_score = report["overall_score"]
        decision_band = str(report["decision_band"] or "").strip()
        if not decision_band:
            decision_band = _decision_band_from_score(weight_score)

        risk_score = report["risk_score"]
        compliance_score = report["compliance_score"]
        meta[vendor_id] = {
            "latest_var_id": str(report["id"] or ""),
            "var_scores": {
                "Overall": weight_score,
                "Compliance": compliance_score,
                "Risk": risk_score,
                "Maturity": report["maturity_score"],
                "Integration": report["integration_score"],
                "ROI": report["roi_score"],
                "Viability": report["viability_score"],
                "Differentiation": report["differentiation_score"],
                "Cloud Dep": report["cloud_dep_score"],
            },
            "var_weight_score": weight_score,
            "var_decision_band": decision_band,
            "var_decision_path": _decision_path_from_metrics(
                weight_score,
                decision_band,
                risk_score,
                compliance_score,
            ),
            "_report_date": str(report["report_date"] or ""),
            "_created_at": str(report["created_at"] or ""),
        }

    return meta


# ── Vendors ────────────────────────────────────────────────────────────

def _group_products(
    rows: list[dict],
    var_vendor_ids: set[str] | None = None,
    latest_var_ids: dict[str, str] | None = None,
    latest_var_meta: dict[str, dict] | None = None,
) -> list[VendorOut]:
    """Group multiple product rows for the same company into one VendorOut."""
    var_ids = var_vendor_ids or set()
    var_id_map = latest_var_ids or {}
    var_meta_map = latest_var_meta or {}
    companies: dict[str, VendorOut] = {}
    company_var_meta: dict[str, dict] = {}
    for row in rows:
        name = row["company_name"]
        candidate_var_meta = var_meta_map.get(str(row["id"]))
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
            if _prefer_var_meta(candidate_var_meta, company_var_meta.get(name)):
                company_var_meta[name] = candidate_var_meta
                companies[name].latest_var_id = str(candidate_var_meta.get("latest_var_id") or companies[name].latest_var_id)
                companies[name].var_scores = candidate_var_meta.get("var_scores")
                companies[name].var_weight_score = candidate_var_meta.get("var_weight_score")
                companies[name].var_decision_band = str(candidate_var_meta.get("var_decision_band") or "")
                companies[name].var_decision_path = str(candidate_var_meta.get("var_decision_path") or "")
        else:
            has_v = row["id"] in var_ids
            if candidate_var_meta:
                company_var_meta[name] = candidate_var_meta
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
                latest_var_id=str(candidate_var_meta.get("latest_var_id") or var_id_map.get(row["id"], "")) if candidate_var_meta else var_id_map.get(row["id"], ""),
                all_products=[product],
                var_scores=candidate_var_meta.get("var_scores") if candidate_var_meta else None,
                var_weight_score=candidate_var_meta.get("var_weight_score") if candidate_var_meta else None,
                var_decision_band=str(candidate_var_meta.get("var_decision_band") or "") if candidate_var_meta else "",
                var_decision_path=str(candidate_var_meta.get("var_decision_path") or "") if candidate_var_meta else "",
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
            )
    return list(companies.values())


def _company_vendor_scope(conn, vendor_id: str) -> tuple[dict, list[str]]:
    row = conn.execute(
        "SELECT * FROM vendors WHERE id = ?",
        (vendor_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor not found")

    row_dict = dict(row)
    canonical_keys = _canonical_vendor_keys()
    if not _is_vendor_in_directory(str(row_dict.get("company_name") or ""), canonical_keys):
        raise HTTPException(status_code=404, detail="Vendor not found in assessment library")

    company_rows = conn.execute(
        "SELECT id FROM vendors WHERE company_name = ? ORDER BY overall_rating DESC",
        (row_dict["company_name"],),
    ).fetchall()
    company_vendor_ids = [str(company_row["id"]) for company_row in company_rows]
    return row_dict, company_vendor_ids


@app.get("/api/vendors", response_model=VendorsResponse)
def list_vendors(
    category: str | None = Query(None),
    search:   str | None = Query(None),
    risk:     str | None = Query(None),
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
    if risk:
        clauses.append("risk_level = ?")
        params.append(risk)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"SELECT * FROM vendors {where} ORDER BY overall_rating DESC"

    rows = [dict(r) for r in conn.execute(query, params).fetchall()]
    canonical_keys = _canonical_vendor_keys()
    rows = [r for r in rows if _is_vendor_in_directory(r.get("company_name", ""), canonical_keys)]

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
    latest_var_meta = _latest_var_meta_by_vendor(conn, [str(r["id"]) for r in rows])
    conn.close()

    # Group multiple-product rows into logical vendors
    db_vendors = _group_products(rows, var_ids, latest_var_ids, latest_var_meta)
    source_vendors = _fallback_vendor_directory(category=category, search=search, risk=risk)
    all_vendors = source_vendors or db_vendors

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
    """Return distinct vendor categories (cached 5 min)."""
    return CategoriesResponse(categories=_cached_categories())


@ttl_cache(ttl_seconds=300, key_prefix="categories")
def _cached_categories() -> list[str]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT category, company_name FROM vendors"
    ).fetchall()
    conn.close()
    categories = [str(r["category"] or "").strip() for r in rows if str(r["category"] or "").strip()]
    source_categories = [vendor.category for vendor in _fallback_vendor_directory() if vendor.category]
    preferred = source_categories or categories
    return list(dict.fromkeys(preferred))


@app.get("/api/vendors/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: str):
    """Return a vendor by ID, grouped at company level with latest VAR context."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM vendors WHERE id = ?", (vendor_id,)
    ).fetchone()
    if not row:
        conn.close()
        fallback_vendor = next((vendor for vendor in _fallback_vendor_directory() if vendor.id == vendor_id), None)
        if fallback_vendor:
            return fallback_vendor
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vendor not found")

    canonical_keys = _canonical_vendor_keys()
    if not _is_vendor_in_directory(str(row["company_name"]), canonical_keys):
        conn.close()
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vendor not found in assessment library")

    company_name = row["company_name"]
    company_rows = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM vendors WHERE company_name = ? ORDER BY overall_rating DESC",
            (company_name,),
        ).fetchall()
    ]

    company_vendor_ids = [r["id"] for r in company_rows]
    placeholders = ",".join(["?"] * len(company_vendor_ids))

    var_ids: set[str] = set()
    latest_var_id_map: dict[str, str] = {}
    latest_var_row = None

    if company_vendor_ids:
        var_rows = conn.execute(
            f"SELECT DISTINCT vendor_id FROM var_reports WHERE vendor_id IN ({placeholders})",
            company_vendor_ids,
        ).fetchall()
        var_ids = {r[0] for r in var_rows}

        latest_rows = conn.execute(
            f"""
            SELECT vr.vendor_id, vr.id
            FROM var_reports vr
            JOIN (
                SELECT vendor_id, MAX(report_date) AS max_date
                FROM var_reports
                WHERE vendor_id IN ({placeholders})
                GROUP BY vendor_id
            ) latest
              ON latest.vendor_id = vr.vendor_id
             AND latest.max_date = vr.report_date
            """,
            company_vendor_ids,
        ).fetchall()
        latest_var_id_map = {r[0]: r[1] for r in latest_rows}

        latest_var_row = conn.execute(
            f"""
            SELECT
                id, vendor_id, decision_band,
                overall_score, compliance_score, risk_score, maturity_score,
                integration_score, roi_score, viability_score,
                differentiation_score, cloud_dep_score
            FROM var_reports
            WHERE vendor_id IN ({placeholders})
            ORDER BY
                CASE WHEN overall_score IS NOT NULL THEN 0 ELSE 1 END,
                report_date DESC,
                created_at DESC
            LIMIT 1
            """,
            company_vendor_ids,
        ).fetchone()

    conn.close()

    base_vendor = _group_products(company_rows, var_ids, latest_var_id_map)[0]
    primary_row = company_rows[0] if company_rows else dict(row)

    var_scores = None
    var_weight_score: float | None = None
    var_decision_band = ""
    var_decision_path = ""
    var_concern_notes: list[str] = []
    if latest_var_row:
        var_scores = {
            "Overall": latest_var_row[3],
            "Compliance": latest_var_row[4],
            "Risk": latest_var_row[5],
            "Maturity": latest_var_row[6],
            "Integration": latest_var_row[7],
            "ROI": latest_var_row[8],
            "Viability": latest_var_row[9],
            "Differentiation": latest_var_row[10],
            "Cloud Dep": latest_var_row[11],
        }

        var_weight_score = latest_var_row[3]
        var_decision_band = str(latest_var_row[2] or "").strip()
        if not var_decision_band:
            var_decision_band = _decision_band_from_score(var_weight_score)

        risk_score = latest_var_row[5]
        compliance_score = latest_var_row[4]

        var_decision_path = _decision_path_from_metrics(
            var_weight_score,
            var_decision_band,
            risk_score,
            compliance_score,
        )

        if var_decision_band:
            var_concern_notes.append(f"VAR decision band: {var_decision_band}.")
        if (risk_score or 0) < 3:
            var_concern_notes.append("VAR risk score is below 3.0; enhanced controls recommended.")
        if (compliance_score or 0) < 3.5:
            var_concern_notes.append("VAR compliance score is below 3.5; remediation plan should be tracked.")

    concerns_base = str(primary_row.get("concerns") or "").strip()
    concern_parts = [c.strip() for c in concerns_base.split("|") if c.strip()]
    for note in var_concern_notes:
        if note not in concern_parts:
            concern_parts.append(note)
    concerns_annotated = " | ".join(concern_parts)

    enriched_data = base_vendor.dict()
    enriched_data.update({
        "var_scores": var_scores,
        "var_weight_score": var_weight_score,
        "var_decision_band": var_decision_band,
        "var_decision_path": var_decision_path,
        "description": str(primary_row.get("description") or ""),
        "founded_year": str(primary_row.get("founded_year") or ""),
        "hq_location": str(primary_row.get("hq_location") or ""),
        "business_owner": str(primary_row.get("business_owner") or ""),
        "sourcing_manager": str(primary_row.get("sourcing_manager") or ""),
        "deployment_status": str(primary_row.get("deployment_status") or "Prospect"),
        "hosting_type": str(primary_row.get("hosting_type") or ""),
        "data_classification": str(primary_row.get("data_classification") or "Internal"),
        "concerns": concerns_annotated,
    })

    return VendorOut(**enriched_data)


@app.get("/api/vendors/{vendor_id}/highlights", response_model=HighlightsResponse)
def get_vendor_highlights(vendor_id: str):
    """Return monthly assessment highlights across all rows for the grouped vendor company."""
    conn = get_connection()
    try:
        _, company_vendor_ids = _company_vendor_scope(conn, vendor_id)
        placeholders = ",".join(["?"] * len(company_vendor_ids))
        rows = conn.execute(
            f"SELECT * FROM vendor_highlights WHERE vendor_id IN ({placeholders}) "
            "ORDER BY assessment_date DESC, source_file DESC",
            company_vendor_ids,
        ).fetchall()
    finally:
        conn.close()
    highlights = [HighlightOut(**dict(r)) for r in rows]
    return HighlightsResponse(total=len(highlights), highlights=highlights)


@app.get("/api/vendors/{vendor_id}/var-reports", response_model=VarReportsResponse)
def get_vendor_var_reports(vendor_id: str):
    """Return VAR reports across all rows for the grouped vendor company."""
    conn = get_connection()
    try:
        _, company_vendor_ids = _company_vendor_scope(conn, vendor_id)
        placeholders = ",".join(["?"] * len(company_vendor_ids))
        rows = conn.execute(
            f"SELECT * FROM var_reports WHERE vendor_id IN ({placeholders}) ORDER BY report_date DESC, created_at DESC",
            company_vendor_ids,
        ).fetchall()
    finally:
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
    """Aggregate stats — delegates to cached computation."""
    return _compute_public_stats()


@ttl_cache(ttl_seconds=60, key_prefix="public_stats")
def _compute_public_stats():
    """Cached: aggregate stats computation (expensive — multiple GROUP BY queries)."""
    conn = get_connection()


@ttl_cache(ttl_seconds=60, key_prefix="public_stats")
def _compute_public_stats():
    """Cached: aggregate stats computation (expensive — multiple GROUP BY queries)."""
    conn = get_connection()
    vendor_rows = [
        dict(r)
        for r in conn.execute(
            "SELECT id, company_name, overall_rating, risk_level, category, last_assessed FROM vendors"
        ).fetchall()
    ]

    canonical_keys = _canonical_vendor_keys()
    allowed_rows = [
        r for r in vendor_rows if _is_vendor_in_directory(str(r.get("company_name") or ""), canonical_keys)
    ]
    allowed_ids = {str(r["id"]) for r in allowed_rows}

    var_rows = [
        dict(r)
        for r in conn.execute(
            "SELECT vendor_id, decision_band FROM var_reports"
        ).fetchall()
        if str(r["vendor_id"]) in allowed_ids
    ]
    conn.close()

    source_vendors = _fallback_vendor_directory()
    if source_vendors:
        allowed_rows = [
            {
                "id": vendor.id,
                "company_name": vendor.company_name,
                "overall_rating": vendor.overall_rating,
                "risk_level": vendor.risk_level,
                "category": vendor.category,
                "last_assessed": vendor.last_assessed,
            }
            for vendor in source_vendors
        ]
        allowed_ids = {str(vendor.id) for vendor in source_vendors}
        var_rows = [row for row in var_rows if str(row.get("vendor_id") or "") in allowed_ids]

    total_vendors = len(allowed_rows)
    total_vars = len(var_rows)
    vendors_with_var = len({str(r["vendor_id"]) for r in var_rows})

    avg_rating_raw = [float(r["overall_rating"] or 0) for r in allowed_rows]
    avg_rating = (sum(avg_rating_raw) / len(avg_rating_raw)) if avg_rating_raw else 0

    risk_distribution: dict[str, int] = {}
    for row in allowed_rows:
        risk = str(row.get("risk_level") or "").strip()
        if risk:
            risk_distribution[risk] = risk_distribution.get(risk, 0) + 1

    cat_counts: dict[str, int] = {}
    cat_scores: dict[str, list[float]] = {}
    for row in allowed_rows:
        category = str(row.get("category") or "Other")
        cat_counts[category] = cat_counts.get(category, 0) + 1
        cat_scores.setdefault(category, []).append(float(row.get("overall_rating") or 0))

    top_categories = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:12]
    top_category_rows = [
        {
            "category": category,
            "count": count,
            "avg_rating": round(sum(cat_scores[category]) / len(cat_scores[category]), 2),
        }
        for category, count in top_categories
    ]

    band_counts: dict[str, int] = {}
    for row in var_rows:
        band = str(row.get("decision_band") or "").strip()
        if band:
            band_counts[band] = band_counts.get(band, 0) + 1

    cutoff = datetime.utcnow() - timedelta(days=90)
    recent_company_names: set[str] = set()
    for row in allowed_rows:
        assessed = str(row.get("last_assessed") or "").strip()
        if not assessed:
            continue
        try:
            assessed_dt = datetime.fromisoformat(assessed[:10])
        except ValueError:
            continue
        if assessed_dt >= cutoff:
            recent_company_names.add(str(row.get("company_name") or ""))
    recent_rows = len(recent_company_names)

    return {
        "total_vendors": total_vendors,
        "total_vars": total_vars,
        "vendors_with_var": vendors_with_var,
        "var_coverage_pct": round(vendors_with_var / total_vendors * 100, 1) if total_vendors else 0,
        "avg_rating": round(avg_rating, 2),
        "recently_assessed": recent_rows,
        "risk_distribution": risk_distribution,
        "top_categories": top_category_rows,
        "decision_bands": band_counts,
    }


# ── Chat (stub — returns helpful message when no LLM key configured) ─────


@app.get("/api/vendors/{vendor_id}/tech-pipeline")
def vendor_tech_pipeline(vendor_id: str):
    """Return assessment pipeline summary across all product rows for the grouped vendor company.

    Returns per-product pipeline stage progress:
    pre_assessment -> initial_assessment -> technical_assessment -> var_report
    """
    conn = get_connection()
    try:
        _, company_vendor_ids = _company_vendor_scope(conn, vendor_id)
        placeholders = ",".join(["?"] * len(company_vendor_ids))

        rows = conn.execute(
            f"SELECT product_name, assessment_date, source_file, "
            "pre_assessment_decision, pre_assessment_score, maturity_level, "
            f"initial_assessment, technical_assessment FROM vendor_highlights WHERE vendor_id IN ({placeholders}) "
            "ORDER BY source_file DESC, assessment_date DESC",
            company_vendor_ids,
        ).fetchall()

        has_var = conn.execute(
            f"SELECT COUNT(*) FROM var_reports WHERE vendor_id IN ({placeholders})",
            company_vendor_ids,
        ).fetchone()[0] > 0
    finally:
        conn.close()

    if not rows:
        return {"vendor_id": vendor_id, "has_pipeline_data": False, "has_var": has_var, "products": []}

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


# ── Cache management ──────────────────────────────────────────────────────
@app.post("/api/admin/cache/clear")
def clear_cache():
    """Clear all in-memory caches. Useful after bulk data imports."""
    from cache import clear_all
    clear_all()
    return {"success": True, "message": "All caches cleared."}


# ── Competitor Intelligence API ─────────────────────────────────────────────
# NOTE: all /api/competitors/* routes must be registered before the generic
#       /{vendor_id} route if that ever becomes a concern.

MONTH_LABELS = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}


def _competitor_month_sort_key(label: str) -> tuple[int, int, str]:
    parts = (label or "").split()
    if len(parts) >= 2 and parts[0] in MONTH_LABELS:
        try:
            return (int(parts[1]), MONTH_LABELS[parts[0]], label)
        except ValueError:
            pass
    return (9999, 99, label or "")


def _competitor_months(conn) -> list[str]:
    rows = conn.execute(
        "SELECT DISTINCT source_month FROM competitor_events WHERE source_month IS NOT NULL AND source_month != ''"
    ).fetchall()
    return sorted([r[0] for r in rows], key=_competitor_month_sort_key)


@app.get("/api/competitors/stats")
def competitor_stats():
    """KPI totals across all competitor events (cached 2 min)."""
    return _cached_competitor_stats()


@ttl_cache(ttl_seconds=120, key_prefix="competitor_stats")
def _cached_competitor_stats():
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
    months = _competitor_months(conn)
    result = {}
    for name in top_names:
        monthly = []
        for month in months:
            cnt = conn.execute(
                "SELECT COUNT(*) FROM competitor_events "
                "WHERE competitor=? AND source_month LIKE ?",
                (name, f"%{month}%")
            ).fetchone()[0]
            monthly.append(cnt)
        result[name] = monthly
    conn.close()
    return {"months": months, "series": result}


@app.get("/api/competitors/heatmap")
def competitor_heatmap(top: int = Query(10, ge=1, le=20)):
    """Competitor × category event-count matrix (cached 2 min)."""
    return _cached_heatmap(top)


@ttl_cache(ttl_seconds=120, key_prefix="competitor_heatmap")
def _cached_heatmap(top: int):
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
