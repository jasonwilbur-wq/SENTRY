"""SENTRY Admin API — Phase 3.

Endpoints for VAR management, score extraction, and manual linking.
All routes live under /api/admin/.

NOTE: These are internal-only; add auth middleware before exposing externally.
"""
from __future__ import annotations

import asyncio
import io
import math
import tempfile
import uuid
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from database import get_connection

try:
    from sharepoint_auth import get_token, download_url_for_item
except ImportError:
    get_token = lambda: None  # noqa: E731
    download_url_for_item = lambda x: ""  # noqa: E731

try:
    from var_score_extractor import extract_scores
except ImportError:
    extract_scores = None  # type: ignore


router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class VarAdminRow(BaseModel):
    id: str
    vendor_id: str
    company_name: str
    filename: str
    sharepoint_url: str
    report_date: str
    match_method: str
    overall_score: float | None
    decision_band: str
    compliance_score: float | None
    risk_score: float | None
    maturity_score: float | None
    integration_score: float | None
    roi_score: float | None
    viability_score: float | None
    differentiation_score: float | None
    cloud_dep_score: float | None
    has_scores: bool
    item_id: str


class VarListResponse(BaseModel):
    total: int
    scored: int
    unscored: int
    page: int
    page_size: int
    total_pages: int
    vars: list[VarAdminRow]


class LinkVarRequest(BaseModel):
    vendor_id: str


class ExtractResult(BaseModel):
    var_id: str
    filename: str
    success: bool
    overall_score: float | None = None
    decision_band: str = ""
    error: str = ""


class BatchExtractResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    skipped: int
    results: list[ExtractResult]


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


# ── VAR List ─────────────────────────────────────────────────────────────────

@router.get("/vars", response_model=VarListResponse)
def list_admin_vars(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: str | None = Query(None),
    scored: str | None = Query(None, description="'yes' | 'no' | None for all"),
) -> VarListResponse:
    """Paginated VAR list with vendor name + score status."""
    conn = get_connection()

    clauses: list[str] = []
    params: list[Any] = []

    if search:
        clauses.append(
            "(LOWER(vr.filename) LIKE ? OR LOWER(v.company_name) LIKE ?)"
        )
        term = f"%{search.lower()}%"
        params.extend([term, term])

    if scored == "yes":
        clauses.append("vr.overall_score IS NOT NULL")
    elif scored == "no":
        clauses.append("vr.overall_score IS NULL")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    count_sql = (
        "SELECT COUNT(*) FROM var_reports vr "
        "LEFT JOIN vendors v ON vr.vendor_id = v.id "
        f"{where}"
    )
    total = conn.execute(count_sql, params).fetchone()[0]

    scored_count = conn.execute(
        "SELECT COUNT(*) FROM var_reports WHERE overall_score IS NOT NULL"
    ).fetchone()[0]

    data_sql = (
        "SELECT vr.id, vr.vendor_id, COALESCE(v.company_name, 'Unknown') AS company_name, "
        "vr.filename, COALESCE(vr.sharepoint_url, '') AS sharepoint_url, "
        "COALESCE(vr.report_date, '') AS report_date, "
        "COALESCE(vr.match_method, '') AS match_method, "
        "vr.overall_score, COALESCE(vr.decision_band, '') AS decision_band, "
        "vr.compliance_score, vr.risk_score, vr.maturity_score, "
        "vr.integration_score, vr.roi_score, vr.viability_score, "
        "vr.differentiation_score, vr.cloud_dep_score, "
        "COALESCE(vr.item_id, '') AS item_id "
        "FROM var_reports vr "
        "LEFT JOIN vendors v ON vr.vendor_id = v.id "
        f"{where} ORDER BY vr.overall_score DESC NULLS LAST, vr.filename "
        f"LIMIT ? OFFSET ?"
    )
    offset = (page - 1) * page_size
    rows = conn.execute(data_sql, params + [page_size, offset]).fetchall()
    conn.close()

    var_rows = [
        VarAdminRow(
            id=r["id"],
            vendor_id=r["vendor_id"] or "",
            company_name=r["company_name"],
            filename=r["filename"],
            sharepoint_url=r["sharepoint_url"],
            report_date=r["report_date"],
            match_method=r["match_method"],
            overall_score=r["overall_score"],
            decision_band=r["decision_band"],
            compliance_score=r["compliance_score"],
            risk_score=r["risk_score"],
            maturity_score=r["maturity_score"],
            integration_score=r["integration_score"],
            roi_score=r["roi_score"],
            viability_score=r["viability_score"],
            differentiation_score=r["differentiation_score"],
            cloud_dep_score=r["cloud_dep_score"],
            has_scores=r["overall_score"] is not None,
            item_id=r["item_id"],
        )
        for r in rows
    ]

    total_pages = max(1, math.ceil(total / page_size))
    return VarListResponse(
        total=total,
        scored=scored_count,
        unscored=total - scored_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        vars=var_rows,
    )


# ── Score Extraction ───────────────────────────────────────────────────────────

async def _download_and_extract(var_id: str) -> ExtractResult:
    """Download a VAR from SharePoint and extract scores. Returns result."""
    if extract_scores is None:
        return ExtractResult(
            var_id=var_id, filename="", success=False,
            error="python-docx not installed"
        )

    conn = get_connection()
    row = conn.execute(
        "SELECT id, filename, item_id, sharepoint_url FROM var_reports WHERE id = ?",
        (var_id,)
    ).fetchone()
    conn.close()

    if not row:
        return ExtractResult(var_id=var_id, filename="", success=False, error="VAR not found")

    filename = row["filename"]
    item_id = row["item_id"] or ""

    if not item_id:
        return ExtractResult(
            var_id=var_id, filename=filename, success=False,
            error="No SharePoint item_id — cannot download"
        )

    token = get_token()
    if not token:
        return ExtractResult(
            var_id=var_id, filename=filename, success=False,
            error="MSAL token unavailable — check SharePoint auth"
        )

    graph_url = download_url_for_item(item_id)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
            resp = await client.get(
                graph_url,
                headers={"Authorization": f"Bearer {token}"},
            )
        if resp.status_code != 200:
            return ExtractResult(
                var_id=var_id, filename=filename, success=False,
                error=f"Download failed: HTTP {resp.status_code}"
            )
        docx_bytes = resp.content
    except Exception as exc:
        return ExtractResult(
            var_id=var_id, filename=filename, success=False,
            error=f"Download error: {exc}"
        )

    # Write to temp file and extract
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(docx_bytes)
        tmp_path = tmp.name

    try:
        scores = extract_scores(tmp_path)
    except Exception as exc:
        return ExtractResult(
            var_id=var_id, filename=filename, success=False,
            error=f"Extraction error: {exc}"
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if "_error" in scores:
        return ExtractResult(
            var_id=var_id, filename=filename, success=False,
            error=scores["_error"]
        )

    overall = scores.get("overall_score")
    band = scores.get("decision_band", "")

    if overall is None:
        return ExtractResult(
            var_id=var_id, filename=filename, success=False,
            error="No scores found in document"
        )

    # Persist to DB
    conn = get_connection()
    conn.execute(
        """UPDATE var_reports SET
            overall_score=?, decision_band=?,
            compliance_score=?, risk_score=?, maturity_score=?,
            integration_score=?, roi_score=?, viability_score=?,
            differentiation_score=?, cloud_dep_score=?
           WHERE id=?""",
        (
            overall, band,
            scores.get("compliance_score"), scores.get("risk_score"),
            scores.get("maturity_score"), scores.get("integration_score"),
            scores.get("roi_score"), scores.get("viability_score"),
            scores.get("differentiation_score"), scores.get("cloud_dep_score"),
            var_id,
        ),
    )
    conn.commit()
    conn.close()

    return ExtractResult(
        var_id=var_id, filename=filename, success=True,
        overall_score=overall, decision_band=band
    )


@router.post("/vars/{var_id}/extract-scores", response_model=ExtractResult)
async def extract_var_scores(var_id: str) -> ExtractResult:
    """Download and extract scores from a single VAR DOCX."""
    return await _download_and_extract(var_id)


@router.post("/vars/extract-batch", response_model=BatchExtractResponse)
async def extract_batch_scores(
    limit: int = Query(50, ge=1, le=200, description="Max VARs to process"),
    overwrite: bool = Query(False, description="Re-extract even if already scored"),
) -> BatchExtractResponse:
    """Bulk-extract scores for unscored VARs (up to `limit`).

    Processes concurrently in batches of 5 to avoid hammering SharePoint.
    """
    conn = get_connection()
    where = "" if overwrite else "WHERE overall_score IS NULL"
    rows = conn.execute(
        f"SELECT id, filename FROM var_reports {where} "
        f"ORDER BY filename LIMIT ?", (limit,)
    ).fetchall()
    conn.close()

    if not rows:
        return BatchExtractResponse(
            total=0, succeeded=0, failed=0, skipped=0, results=[]
        )

    results: list[ExtractResult] = []
    succeeded = failed = skipped = 0
    batch_size = 5

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        tasks = [_download_and_extract(r["id"]) for r in batch]
        batch_results = await asyncio.gather(*tasks)
        for res in batch_results:
            results.append(res)
            if res.success:
                succeeded += 1
            elif "No SharePoint item_id" in res.error or "token" in res.error.lower():
                skipped += 1
            else:
                failed += 1

    return BatchExtractResponse(
        total=len(rows),
        succeeded=succeeded,
        failed=failed,
        skipped=skipped,
        results=results,
    )


# ── Manual VAR Linking ────────────────────────────────────────────────────────

@router.patch("/vars/{var_id}/link")
def link_var_to_vendor(var_id: str, body: LinkVarRequest) -> dict:
    """Manually link a VAR report to a vendor."""
    conn = get_connection()

    var_row = conn.execute(
        "SELECT id FROM var_reports WHERE id = ?", (var_id,)
    ).fetchone()
    if not var_row:
        conn.close()
        raise HTTPException(status_code=404, detail="VAR not found")

    vendor_row = conn.execute(
        "SELECT id, company_name FROM vendors WHERE id = ?", (body.vendor_id,)
    ).fetchone()
    if not vendor_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vendor not found")

    conn.execute(
        "UPDATE var_reports SET vendor_id=?, match_method='manual' WHERE id=?",
        (body.vendor_id, var_id)
    )
    conn.commit()
    conn.close()

    return {
        "success": True,
        "var_id": var_id,
        "vendor_id": body.vendor_id,
        "company_name": vendor_row["company_name"],
    }


@router.delete("/vars/{var_id}/link")
def unlink_var(var_id: str) -> dict:
    """Unlink a VAR from its vendor (sets vendor_id to empty)."""
    conn = get_connection()
    row = conn.execute("SELECT id FROM var_reports WHERE id = ?", (var_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="VAR not found")
    conn.execute(
        "UPDATE var_reports SET vendor_id='', match_method='unlinked' WHERE id=?",
        (var_id,)
    )
    conn.commit()
    conn.close()
    return {"success": True, "var_id": var_id}


# ── Vendor search (for re-linking UI) ─────────────────────────────────────────

@router.get("/vendors/search")
def search_vendors_for_linking(
    q: str = Query(..., min_length=2),
    limit: int = Query(10, ge=1, le=50),
) -> dict:
    """Quick vendor name search for the linking modal."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, company_name, category FROM vendors "
        "WHERE LOWER(company_name) LIKE ? ORDER BY company_name LIMIT ?",
        (f"%{q.lower()}%", limit),
    ).fetchall()
    conn.close()
    return {
        "results": [
            {"id": r["id"], "company_name": r["company_name"], "category": r["category"]}
            for r in rows
        ]
    }