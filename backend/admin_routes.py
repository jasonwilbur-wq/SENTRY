"""SENTRY Admin API — Phase 3.

Endpoints for VAR management, score extraction, and manual linking.
All routes live under /api/admin/.

NOTE: These routes are admin-only via the router-level require_admin dependency.
"""
from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from admin_competitor_routes import router as competitor_router
from admin_var_routes import ExtractResult, _download_and_extract, get_token_diagnostics
from admin_var_routes import router as var_router
from auth import require_admin
from database import get_connection
from var_score_extractor import extract_scores


router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


# ── Pydantic models ───────────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total_vendors: int
    total_vars: int
    scored_vars: int
    unscored_vars: int
    vendors_with_var: int
    vendors_without_var: int
    decision_band_counts: dict[str, int]
    extraction_coverage_pct: float


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
def get_admin_stats() -> AdminStats:
    """Dashboard-level stats for the admin panel."""
    conn = get_connection()
    total_vendors = conn.execute("SELECT COUNT(*) FROM vendors").fetchone()[0]
    total_vars = conn.execute("SELECT COUNT(*) FROM var_reports").fetchone()[0]
    scored = conn.execute(
        "SELECT COUNT(*) FROM var_reports WHERE overall_score IS NOT NULL"
    ).fetchone()[0]
    vendors_with_var = conn.execute(
        "SELECT COUNT(DISTINCT vendor_id) FROM var_reports"
    ).fetchone()[0]
    band_rows = conn.execute(
        "SELECT decision_band, COUNT(*) FROM var_reports "
        "WHERE decision_band != '' AND decision_band IS NOT NULL "
        "GROUP BY decision_band ORDER BY COUNT(*) DESC"
    ).fetchall()
    conn.close()

    band_counts = {r[0]: r[1] for r in band_rows}
    unscored = total_vars - scored
    pct = round(scored / total_vars * 100, 1) if total_vars else 0.0

    return AdminStats(
        total_vendors=total_vendors,
        total_vars=total_vars,
        scored_vars=scored,
        unscored_vars=unscored,
        vendors_with_var=vendors_with_var,
        vendors_without_var=total_vendors - vendors_with_var,
        decision_band_counts=band_counts,
        extraction_coverage_pct=pct,
    )

# VAR administration routes are kept in a focused sub-router.
router.include_router(var_router)

# Competitor intelligence admin routes are kept in a focused sub-router.
router.include_router(competitor_router)
