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
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, init_db
from database_reliability import database_status, write_surface_summary
from admin_routes import router as admin_router
from vendor_assessment_routes import router as vendor_assessment_router
from request_routes import router as request_router
from project_routes import ROUTER as project_router
from portfolio_routes import ROUTER as portfolio_router
from intel_digest_routes import ROUTER as intel_digest_router
from incident_routes import ROUTER as incident_router
from regulatory_routes import ROUTER as regulatory_router, get_regulatory_summary
from analytics_routes import ROUTER as analytics_router
from competitor_routes import ROUTER as competitor_router
from vendor_routes import ROUTER as vendor_router
from var_report_routes import ROUTER as var_report_router
from vendor_sync_routes import router as vendor_sync_router
from cso_brief_routes import ROUTER as cso_brief_router
from executive_intel_routes import ROUTER as executive_intel_router
from cso_profile_routes import ROUTER as cso_profile_router
import cso_profile_store
from auth import SentryUser, get_current_user, get_auth_status, require_admin
from cache import clear_all
from models import ChatRequest, ChatResponse, FormResponse
from path_config import (
    SENTRY_DATA_ROOT,
    VENDOR_ASSESSMENTS_ROOT,
    VENDOR_PROFILES_CSV,
    VENDOR_CANONICAL_DIRECTORY_CSV,
    PROJECTS_ROOT,
    COMPETITORS_ROOT,
    REGULATORY_ROOT,
    INCIDENTS_ROOT,
    workspace_snapshot,
)

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
    cso_profile_store.init_store()
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
    """Return one canonical health payload for frontend readiness checks.

    Detailed local workspace paths are intentionally omitted by default because
    health checks are commonly exposed more broadly than admin APIs. Set
    SENTRY_HEALTH_DETAILS=1 in a trusted local/dev environment when operators
    need mounted-workspace diagnostics.
    """
    db_status = database_status()
    payload: dict[str, object] = {
        "status": "ok" if db_status["database_ready"] else "degraded",
        "version": app.version,
        **get_auth_status(),
        "database_ready": db_status["database_ready"],
        "database_warnings": db_status["database_warnings"],
    }

    if os.environ.get("SENTRY_HEALTH_DETAILS") == "1":
        payload.update({
            "allowed_origins": ALLOWED_ORIGINS,
            "database": {**db_status, **write_surface_summary()},
            "workspace": workspace_snapshot(),
            "workspace_available": {
                "sentry_data_root": SENTRY_DATA_ROOT.exists(),
                "vendor_assessments_root": VENDOR_ASSESSMENTS_ROOT.exists(),
                "regulatory_root": REGULATORY_ROOT.exists(),
                "incidents_root": INCIDENTS_ROOT.exists(),
                "projects_root": PROJECTS_ROOT.exists(),
                "competitors_root": COMPETITORS_ROOT.exists(),
                "vendor_profiles_csv": VENDOR_PROFILES_CSV.exists(),
                "vendor_canonical_directory_csv": VENDOR_CANONICAL_DIRECTORY_CSV.exists(),
            },
        })

    return payload


app.include_router(project_router)
app.include_router(portfolio_router)
app.include_router(intel_digest_router)
app.include_router(incident_router)
app.include_router(regulatory_router)
app.include_router(analytics_router)
app.include_router(competitor_router)
app.include_router(vendor_router)
app.include_router(var_report_router)
app.include_router(vendor_sync_router)
app.include_router(cso_brief_router)
app.include_router(executive_intel_router)
app.include_router(cso_profile_router)


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


# ── Cache management ──────────────────────────────────────────────────────
@app.post("/api/admin/cache/clear")
def clear_cache(user: SentryUser = Depends(require_admin)):  # noqa: ARG001
    """Clear all in-memory caches. Useful after bulk data imports."""
    from cache import clear_all
    clear_all()
    return {"success": True, "message": "All caches cleared."}
