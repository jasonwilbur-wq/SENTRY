"""SENTRY Admin API — Phase 3.

Endpoints for VAR management, score extraction, and manual linking.
All routes live under /api/admin/.

All admin write endpoints require admin privileges (see auth.py).
All mutations are recorded in the audit_log (see audit.py).
"""
from __future__ import annotations

import asyncio
import io
import math
import sqlite3
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from fastapi import Depends

from auth import SentryUser, require_admin, get_current_user
from audit import log_mutation, snapshot_row
from database import get_connection
from competitor_scoring import score_event
from competitor_correlation import enrich_competitor_event_row, enrich_competitor_event_rows
from competitor_enrichment import (
    BRIEF_READY_FIELD_NAMES,
    build_brief_readiness_enrichment,
    enrich_for_brief_readiness,
    evaluate_competitor_event_readiness,
    normalize_confidence_level,
    normalize_source_link,
)

try:
    from sharepoint_auth import get_token, get_token_diagnostics, download_url_for_item
except ImportError:
    get_token = lambda: None  # noqa: E731
    get_token_diagnostics = lambda: {  # noqa: E731
        "available": False,
        "token": None,
        "reason_code": "AUTH_MODULE_MISSING",
        "reason": "sharepoint_auth module unavailable",
    }
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
    extraction_review_status: str
    extraction_reviewed_by: str
    extraction_reviewed_at: str
    extraction_review_note: str
    extraction_last_run_at: str
    extraction_last_status: str
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
    status: str = ""
    overall_score: float | None = None
    decision_band: str = ""
    confidence: float | None = None
    requires_review: bool = True
    extracted_dimensions: int = 0
    error: str = ""


class BatchExtractResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    skipped: int
    status_counts: dict[str, int]
    results: list[ExtractResult]


class VarReviewQueueRow(BaseModel):
    id: str
    vendor_id: str
    company_name: str
    filename: str
    overall_score: float | None
    decision_band: str
    extraction_review_status: str
    extraction_last_status: str
    extraction_last_run_at: str
    extraction_reviewed_by: str
    extraction_reviewed_at: str
    extraction_review_note: str


class VarReviewQueueResponse(BaseModel):
    total: int
    items: list[VarReviewQueueRow]


class VarReviewUpdateRequest(BaseModel):
    action: str
    note: str = ""


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
def get_admin_stats(
    user: SentryUser = Depends(require_admin),
) -> AdminStats:
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
    user: SentryUser = Depends(require_admin),
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
        "COALESCE(vr.extraction_review_status, 'NOT_EXTRACTED') AS extraction_review_status, "
        "COALESCE(vr.extraction_reviewed_by, '') AS extraction_reviewed_by, "
        "COALESCE(vr.extraction_reviewed_at, '') AS extraction_reviewed_at, "
        "COALESCE(vr.extraction_review_note, '') AS extraction_review_note, "
        "COALESCE(vr.extraction_last_run_at, '') AS extraction_last_run_at, "
        "COALESCE(vr.extraction_last_status, 'NOT_EXTRACTED') AS extraction_last_status, "
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
            extraction_review_status=r["extraction_review_status"],
            extraction_reviewed_by=r["extraction_reviewed_by"],
            extraction_reviewed_at=r["extraction_reviewed_at"],
            extraction_review_note=r["extraction_review_note"],
            extraction_last_run_at=r["extraction_last_run_at"],
            extraction_last_status=r["extraction_last_status"],
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

def _count_extracted_dimensions(scores: dict[str, Any]) -> int:
    """Count how many canonical dimension fields were extracted."""
    fields = (
        "compliance_score", "risk_score", "maturity_score", "integration_score",
        "roi_score", "viability_score", "differentiation_score", "cloud_dep_score",
    )
    return sum(1 for f in fields if scores.get(f) is not None)


def _estimate_extraction_confidence(scores: dict[str, Any], overall: float | None) -> float:
    """Heuristic confidence for operator triage (not approval)."""
    dims = _count_extracted_dimensions(scores)
    base = dims / 8.0
    if overall is not None:
        base += 0.1
    return round(min(1.0, base), 2)


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _persist_extraction_failure(var_id: str, status: str) -> None:
    """Persist the last extraction attempt status. Best-effort, no throw."""
    try:
        conn = get_connection()
        conn.execute(
            """UPDATE var_reports
               SET extraction_last_run_at=?, extraction_last_status=?
               WHERE id=?""",
            (_utcnow_iso(), status, var_id),
        )
        conn.commit()
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


async def _download_and_extract(var_id: str) -> ExtractResult:
    """Download a VAR from SharePoint and extract scores. Returns result."""
    if extract_scores is None:
        _persist_extraction_failure(var_id, "PARSE_FAILED")
        return ExtractResult(
            var_id=var_id,
            filename="",
            success=False,
            status="PARSE_FAILED",
            error="python-docx extractor unavailable",
        )

    conn = get_connection()
    row = conn.execute(
        "SELECT id, filename, item_id, sharepoint_url FROM var_reports WHERE id = ?",
        (var_id,),
    ).fetchone()
    conn.close()

    if not row:
        return ExtractResult(
            var_id=var_id,
            filename="",
            success=False,
            status="NOT_FOUND",
            error="VAR not found",
        )

    filename = row["filename"]
    item_id = row["item_id"] or ""

    if not item_id:
        _persist_extraction_failure(var_id, "MISSING_ITEM_ID")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="MISSING_ITEM_ID",
            error="No SharePoint item_id — cannot download",
        )

    token_diag = get_token_diagnostics()
    token = token_diag.get("token") if token_diag.get("available") else None
    if not token:
        reason = token_diag.get("reason", "MSAL token unavailable")
        reason_code = token_diag.get("reason_code", "AUTH_UNAVAILABLE")
        _persist_extraction_failure(var_id, "AUTH_UNAVAILABLE")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="AUTH_UNAVAILABLE",
            error=f"{reason_code}: {reason}",
        )

    graph_url = download_url_for_item(item_id)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
            resp = await client.get(
                graph_url,
                headers={"Authorization": f"Bearer {token}"},
            )
        if resp.status_code != 200:
            _persist_extraction_failure(var_id, "DOWNLOAD_FAILED")
            return ExtractResult(
                var_id=var_id,
                filename=filename,
                success=False,
                status="DOWNLOAD_FAILED",
                error=f"Download failed: HTTP {resp.status_code}",
            )
        docx_bytes = resp.content
    except Exception as exc:
        _persist_extraction_failure(var_id, "DOWNLOAD_FAILED")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="DOWNLOAD_FAILED",
            error=f"Download error: {exc}",
        )

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(docx_bytes)
        tmp_path = tmp.name

    try:
        scores = extract_scores(tmp_path)
    except Exception as exc:
        _persist_extraction_failure(var_id, "PARSE_FAILED")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="PARSE_FAILED",
            error=f"Extraction error: {exc}",
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if "_error" in scores:
        _persist_extraction_failure(var_id, "PARSE_FAILED")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="PARSE_FAILED",
            error=str(scores["_error"]),
        )

    overall = scores.get("overall_score")
    band = scores.get("decision_band", "")
    dims = _count_extracted_dimensions(scores)
    confidence = _estimate_extraction_confidence(scores, overall)

    if overall is None:
        _persist_extraction_failure(var_id, "PARSE_FAILED")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="PARSE_FAILED",
            extracted_dimensions=dims,
            confidence=confidence,
            requires_review=True,
            error="No scores found in document",
        )

    try:
        conn = get_connection()
        conn.execute(
            """UPDATE var_reports SET
                overall_score=?, decision_band=?,
                compliance_score=?, risk_score=?, maturity_score=?,
                integration_score=?, roi_score=?, viability_score=?,
                differentiation_score=?, cloud_dep_score=?,
                extraction_review_status='EXTRACTED_PENDING_REVIEW',
                extraction_reviewed_by='',
                extraction_reviewed_at='',
                extraction_review_note='',
                extraction_last_run_at=?,
                extraction_last_status='SUCCESS'
               WHERE id=?""",
            (
                overall,
                band,
                scores.get("compliance_score"),
                scores.get("risk_score"),
                scores.get("maturity_score"),
                scores.get("integration_score"),
                scores.get("roi_score"),
                scores.get("viability_score"),
                scores.get("differentiation_score"),
                scores.get("cloud_dep_score"),
                _utcnow_iso(),
                var_id,
            ),
        )
        conn.commit()
    except Exception as exc:  # noqa: BLE001
        _persist_extraction_failure(var_id, "WRITE_FAILED")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="WRITE_FAILED",
            extracted_dimensions=dims,
            confidence=confidence,
            requires_review=True,
            error=f"Failed to persist extracted scores: {exc}",
        )
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return ExtractResult(
        var_id=var_id,
        filename=filename,
        success=True,
        status="SUCCESS",
        overall_score=overall,
        decision_band=band,
        confidence=confidence,
        extracted_dimensions=dims,
        requires_review=True,
    )


@router.post("/vars/{var_id}/extract-scores", response_model=ExtractResult)
async def extract_var_scores(
    var_id: str,
    user: SentryUser = Depends(require_admin),
) -> ExtractResult:
    """Download and extract scores from a single VAR DOCX."""
    result = await _download_and_extract(var_id)
    conn = get_connection()
    try:
        if result.success:
            log_mutation(
                conn, user, "extract_scores", "var_report", var_id,
                new_value={
                    "overall_score": result.overall_score,
                    "decision_band": result.decision_band,
                    "extraction_review_status": "EXTRACTED_PENDING_REVIEW",
                    "extraction_last_status": "SUCCESS",
                },
            )
        else:
            log_mutation(
                conn, user, "extract_scores_failed", "var_report", var_id,
                new_value={"status": result.status, "error": result.error},
            )
        conn.commit()
    finally:
        conn.close()
    return result


@router.post("/vars/extract-batch", response_model=BatchExtractResponse)
async def extract_batch_scores(
    user: SentryUser = Depends(require_admin),
    limit: int = Query(50, ge=1, le=200, description="Max VARs to process"),
    overwrite: bool = Query(False, description="Re-extract even if already scored"),
    confirm: bool = Query(False, description="Must be true to execute when overwrite=true"),
) -> BatchExtractResponse:
    """Bulk-extract scores for unscored VARs (up to `limit`).

    When overwrite=true, requires confirm=true to proceed. Without confirm,
    returns a dry-run preview of which VARs would be affected.

    Processes concurrently in batches of 5 to avoid hammering SharePoint.
    """
    # Approval gate: overwrite requires explicit confirmation
    if overwrite and not confirm:
        conn = get_connection()
        try:
            rows = conn.execute(
                "SELECT id, filename, overall_score, decision_band "
                "FROM var_reports WHERE overall_score IS NOT NULL LIMIT ?",
                (limit,),
            ).fetchall()
        finally:
            conn.close()
        return BatchExtractResponse(
            total=len(rows),
            succeeded=0,
            failed=0,
            skipped=len(rows),
            status_counts={"WRITE_BLOCKED": len(rows)},
            results=[
                ExtractResult(
                    var_id=r["id"],
                    filename=r["filename"],
                    success=False,
                    status="WRITE_BLOCKED",
                    overall_score=r["overall_score"],
                    decision_band=r["decision_band"] or "",
                    requires_review=True,
                    error="DRY RUN — add confirm=true to overwrite these scores",
                )
                for r in rows
            ],
        )

    conn = get_connection()
    try:
        where = "" if overwrite else "WHERE overall_score IS NULL"
        rows = conn.execute(
            f"SELECT id, filename FROM var_reports {where} "
            f"ORDER BY filename LIMIT ?", (limit,)
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        return BatchExtractResponse(
            total=0,
            succeeded=0,
            failed=0,
            skipped=0,
            status_counts={},
            results=[],
        )

    results: list[ExtractResult] = []
    succeeded = failed = skipped = 0
    status_counts: dict[str, int] = {}
    batch_size = 5

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        tasks = [_download_and_extract(r["id"]) for r in batch]
        batch_results = await asyncio.gather(*tasks)
        for res in batch_results:
            results.append(res)
            status_counts[res.status] = status_counts.get(res.status, 0) + 1
            if res.success:
                succeeded += 1
            elif res.status in {"MISSING_ITEM_ID", "AUTH_UNAVAILABLE", "WRITE_BLOCKED"}:
                skipped += 1
            else:
                failed += 1

    # Audit log for the batch operation
    conn = get_connection()
    try:
        log_mutation(
            conn, user, "batch_extract", "var_report", "batch",
            new_value={
                "succeeded": succeeded,
                "failed": failed,
                "skipped": skipped,
                "status_counts": status_counts,
            },
            metadata={"overwrite": overwrite, "limit": limit, "confirm": confirm},
        )
        conn.commit()
    finally:
        conn.close()

    return BatchExtractResponse(
        total=len(rows),
        succeeded=succeeded,
        failed=failed,
        skipped=skipped,
        status_counts=status_counts,
        results=results,
    )


@router.get("/vars/review-queue", response_model=VarReviewQueueResponse)
def list_var_review_queue(
    user: SentryUser = Depends(require_admin),
    limit: int = Query(100, ge=1, le=500),
) -> VarReviewQueueResponse:
    """List VARs with extracted scores pending human review."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT vr.id, vr.vendor_id, COALESCE(v.company_name, 'Unknown') AS company_name,
                   vr.filename, vr.overall_score, COALESCE(vr.decision_band, '') AS decision_band,
                   COALESCE(vr.extraction_review_status, 'NOT_EXTRACTED') AS extraction_review_status,
                   COALESCE(vr.extraction_last_status, 'NOT_EXTRACTED') AS extraction_last_status,
                   COALESCE(vr.extraction_last_run_at, '') AS extraction_last_run_at,
                   COALESCE(vr.extraction_reviewed_by, '') AS extraction_reviewed_by,
                   COALESCE(vr.extraction_reviewed_at, '') AS extraction_reviewed_at,
                   COALESCE(vr.extraction_review_note, '') AS extraction_review_note
            FROM var_reports vr
            LEFT JOIN vendors v ON v.id = vr.vendor_id
            WHERE vr.extraction_review_status = 'EXTRACTED_PENDING_REVIEW'
            ORDER BY vr.extraction_last_run_at DESC, vr.filename
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    finally:
        conn.close()

    return VarReviewQueueResponse(
        total=len(rows),
        items=[VarReviewQueueRow(**dict(r)) for r in rows],
    )


@router.patch("/vars/{var_id}/review", response_model=VarReviewQueueRow)
def review_var_extraction(
    var_id: str,
    body: VarReviewUpdateRequest,
    user: SentryUser = Depends(require_admin),
) -> VarReviewQueueRow:
    """Accept or reject extracted VAR scores; does not imply final VAR decision approval."""
    action = body.action.strip().upper()
    if action not in {"ACCEPT", "REJECT"}:
        raise HTTPException(status_code=400, detail="action must be ACCEPT or REJECT")

    next_status = "REVIEWED_ACCEPTED" if action == "ACCEPT" else "REVIEWED_REJECTED"
    reviewed_at = _utcnow_iso()

    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT vr.id, vr.vendor_id, COALESCE(v.company_name, 'Unknown') AS company_name,
                   vr.filename, vr.overall_score, COALESCE(vr.decision_band, '') AS decision_band,
                   COALESCE(vr.extraction_review_status, 'NOT_EXTRACTED') AS extraction_review_status,
                   COALESCE(vr.extraction_last_status, 'NOT_EXTRACTED') AS extraction_last_status,
                   COALESCE(vr.extraction_last_run_at, '') AS extraction_last_run_at,
                   COALESCE(vr.extraction_reviewed_by, '') AS extraction_reviewed_by,
                   COALESCE(vr.extraction_reviewed_at, '') AS extraction_reviewed_at,
                   COALESCE(vr.extraction_review_note, '') AS extraction_review_note
            FROM var_reports vr
            LEFT JOIN vendors v ON v.id = vr.vendor_id
            WHERE vr.id = ?
            """,
            (var_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="VAR not found")

        old_snapshot = {
            "extraction_review_status": row["extraction_review_status"],
            "extraction_reviewed_by": row["extraction_reviewed_by"],
            "extraction_reviewed_at": row["extraction_reviewed_at"],
            "extraction_review_note": row["extraction_review_note"],
        }

        conn.execute(
            """
            UPDATE var_reports
            SET extraction_review_status=?,
                extraction_reviewed_by=?,
                extraction_reviewed_at=?,
                extraction_review_note=?
            WHERE id=?
            """,
            (next_status, user.id, reviewed_at, body.note.strip(), var_id),
        )

        log_mutation(
            conn, user, "review_extraction", "var_report", var_id,
            old_value=old_snapshot,
            new_value={
                "extraction_review_status": next_status,
                "extraction_reviewed_by": user.id,
                "extraction_reviewed_at": reviewed_at,
                "extraction_review_note": body.note.strip(),
                "review_action": action,
            },
        )
        conn.commit()

        updated = conn.execute(
            """
            SELECT vr.id, vr.vendor_id, COALESCE(v.company_name, 'Unknown') AS company_name,
                   vr.filename, vr.overall_score, COALESCE(vr.decision_band, '') AS decision_band,
                   COALESCE(vr.extraction_review_status, 'NOT_EXTRACTED') AS extraction_review_status,
                   COALESCE(vr.extraction_last_status, 'NOT_EXTRACTED') AS extraction_last_status,
                   COALESCE(vr.extraction_last_run_at, '') AS extraction_last_run_at,
                   COALESCE(vr.extraction_reviewed_by, '') AS extraction_reviewed_by,
                   COALESCE(vr.extraction_reviewed_at, '') AS extraction_reviewed_at,
                   COALESCE(vr.extraction_review_note, '') AS extraction_review_note
            FROM var_reports vr
            LEFT JOIN vendors v ON v.id = vr.vendor_id
            WHERE vr.id = ?
            """,
            (var_id,),
        ).fetchone()
    finally:
        conn.close()

    return VarReviewQueueRow(**dict(updated))


# ── Manual VAR Linking ────────────────────────────────────────────────────────

@router.patch("/vars/{var_id}/link")
def link_var_to_vendor(
    var_id: str,
    body: LinkVarRequest,
    user: SentryUser = Depends(require_admin),
) -> dict:
    """Manually link a VAR report to a vendor."""
    conn = get_connection()
    try:
        var_row = conn.execute(
            "SELECT id, vendor_id FROM var_reports WHERE id = ?", (var_id,)
        ).fetchone()
        if not var_row:
            raise HTTPException(status_code=404, detail="VAR not found")

        vendor_row = conn.execute(
            "SELECT id, company_name FROM vendors WHERE id = ?", (body.vendor_id,)
        ).fetchone()
        if not vendor_row:
            raise HTTPException(status_code=404, detail="Vendor not found")

        old_vendor_id = var_row["vendor_id"]
        conn.execute(
            "UPDATE var_reports SET vendor_id=?, match_method='manual' WHERE id=?",
            (body.vendor_id, var_id)
        )
        log_mutation(
            conn, user, "link", "var_report", var_id,
            old_value={"vendor_id": old_vendor_id},
            new_value={"vendor_id": body.vendor_id, "company_name": vendor_row["company_name"]},
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "success": True,
        "var_id": var_id,
        "vendor_id": body.vendor_id,
        "company_name": vendor_row["company_name"],
    }


@router.delete("/vars/{var_id}/link")
def unlink_var(
    var_id: str,
    confirm: bool = Query(False, description="Must be true to unlink"),
    user: SentryUser = Depends(require_admin),
) -> dict:
    """Unlink a VAR from its vendor (sets vendor_id to empty).

    Requires confirm=true. Without it, returns a preview of what would be unlinked.
    """
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT vr.id, vr.vendor_id, vr.filename, COALESCE(v.company_name, 'Unknown') AS company_name "
            "FROM var_reports vr LEFT JOIN vendors v ON vr.vendor_id = v.id "
            "WHERE vr.id = ?",
            (var_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="VAR not found")

        if not confirm:
            return {
                "dry_run": True,
                "var_id": var_id,
                "filename": row["filename"],
                "current_vendor_id": row["vendor_id"],
                "current_vendor_name": row["company_name"],
                "message": "Add confirm=true to unlink this VAR from its vendor.",
            }

        log_mutation(
            conn, user, "unlink", "var_report", var_id,
            old_value={"vendor_id": row["vendor_id"], "company_name": row["company_name"]},
            new_value={"vendor_id": "", "match_method": "unlinked"},
        )
        conn.execute(
            "UPDATE var_reports SET vendor_id='', match_method='unlinked' WHERE id=?",
            (var_id,)
        )
        conn.commit()
    finally:
        conn.close()
    return {"success": True, "var_id": var_id}


# ── Vendor search (for re-linking UI) ─────────────────────────────────────────

@router.get("/vendors/search")
def search_vendors_for_linking(
    q: str = Query(..., min_length=2),
    limit: int = Query(10, ge=1, le=50),
    user: SentryUser = Depends(require_admin),
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


# ══════════════════════════════════════════════════════════════════════════════
# COMPETITOR INTEL MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

class CompetitorEventCreate(BaseModel):
    event_date: str
    competitor: str
    event_title: str
    event_type: str = ""
    detailed_description: str = ""
    category: str
    location: str = ""
    security_implication: str = ""
    operational_impact: str = ""
    financial_impact: str = ""
    reputational_impact: str = ""
    source_link: str = ""
    analyst_notes: str = ""
    source_month: str = ""
    confidence_level: str = ""


class CompetitorEventUpdate(BaseModel):
    event_date: str | None = None
    competitor: str | None = None
    event_title: str | None = None
    event_type: str | None = None
    detailed_description: str | None = None
    category: str | None = None
    location: str | None = None
    security_implication: str | None = None
    operational_impact: str | None = None
    financial_impact: str | None = None
    reputational_impact: str | None = None
    source_link: str | None = None
    analyst_notes: str | None = None
    source_month: str | None = None
    confidence_level: str | None = None


def _serialize_competitor_event(conn, row: sqlite3.Row | dict) -> CompetitorEventOut:
    enriched = enrich_competitor_event_row(conn, row)
    patch, _warnings = build_brief_readiness_enrichment(enriched)
    enriched.update(patch)
    enriched.update(evaluate_competitor_event_readiness(enriched))
    return CompetitorEventOut(**{k: enriched.get(k) for k in CompetitorEventOut.model_fields})


def _serialize_competitor_events(conn, rows: list[sqlite3.Row | dict]) -> list[CompetitorEventOut]:
    enriched_rows = enrich_competitor_event_rows(conn, rows)
    out: list[CompetitorEventOut] = []
    for r in enriched_rows:
        patch, _warnings = build_brief_readiness_enrichment(r)
        r.update(patch)
        r.update(evaluate_competitor_event_readiness(r))
        out.append(CompetitorEventOut(**{k: r.get(k) for k in CompetitorEventOut.model_fields}))
    return out


class CompetitorEventOut(BaseModel):
    id: int
    event_date: str | None
    competitor: str
    event_title: str | None
    event_type: str | None
    detailed_description: str | None
    category: str
    location: str | None
    security_implication: str | None
    operational_impact: str | None
    financial_impact: str | None
    reputational_impact: str | None
    source_link: str | None
    analyst_notes: str | None
    source_month: str | None
    confidence_level: str | None = None
    walmart_relevance_score: float | None = None
    priority_tier: str | None = None
    signal_type: str | None = None
    recommended_owner: str | None = None
    why_walmart_cares: str | None = None
    strategic_score: float | None = None
    security_score: float | None = None
    operational_score: float | None = None
    customer_trust_score: float | None = None
    novelty_score: float | None = None
    urgency_score: float | None = None
    confidence_score: float | None = None
    escalate_to_cso: int | None = None
    score_reason: str | None = None
    confidence_effect: str | None = None
    source_effect: str | None = None
    cso_candidate_reason: str | None = None
    scoring_version: str | None = None
    scored_at: str | None = None
    triage_status: str | None = None
    triaged_by: str | None = None
    triaged_at: str | None = None
    triage_note: str | None = None
    matched_vendor_id: str | None = None
    matched_vendor_name: str | None = None
    match_method: str | None = None
    match_label: str | None = None
    match_confidence: float | None = None
    match_explanation: str | None = None
    linked_active_projects_count: int = 0
    linked_projects: list[dict[str, Any]] = []
    correlation_status: str | None = None
    candidate_vendor_names: list[str] = []
    walmart_actionability_context: str | None = None
    correlation_summary: str | None = None
    is_brief_ready: bool = False
    readiness_issues: list[str] = []
    readiness_warnings: list[str] = []
    readiness_required_fields: list[str] = []


class CompetitorEventsListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    events: list[CompetitorEventOut]


class CompetitorScoreDistribution(BaseModel):
    unscored: int
    archive_low_signal: int
    analyst_follow_up: int
    leadership_watch: int
    cso_brief: int


class CompetitorScoringSummary(BaseModel):
    total: int
    cso_candidates: int
    avg_score: float
    distribution: CompetitorScoreDistribution


class CompetitorTriageQueueResponse(BaseModel):
    total: int
    items: list[CompetitorEventOut]


class CompetitorTriageUpdateRequest(BaseModel):
    triage_status: str
    triage_note: str = ""


TRIAGE_STATUSES = {"UNREVIEWED", "REVIEWED", "DISMISSED", "ESCALATED"}


def _event_columns(conn) -> set[str]:
    return {r[1] for r in conn.execute("PRAGMA table_info(competitor_events)").fetchall()}


def _apply_scored_fields(conn, event_id: int, scored: dict[str, Any]) -> None:
    allowed = _event_columns(conn)
    scored_pairs = [
        ("confidence_level", normalize_confidence_level(scored.get("confidence_level"))),
        ("walmart_relevance_score", scored.get("walmart_relevance_score")),
        ("priority_tier", scored.get("priority_tier")),
        ("signal_type", scored.get("signal_type")),
        ("recommended_owner", scored.get("recommended_owner")),
        ("why_walmart_cares", scored.get("why_walmart_cares")),
        ("strategic_score", scored.get("strategic_score")),
        ("security_score", scored.get("security_score")),
        ("operational_score", scored.get("operational_score")),
        ("customer_trust_score", scored.get("customer_trust_score")),
        ("novelty_score", scored.get("novelty_score")),
        ("urgency_score", scored.get("urgency_score")),
        ("confidence_score", scored.get("confidence_score")),
        ("escalate_to_cso", scored.get("escalate_to_cso")),
        ("score_reason", scored.get("score_reason")),
        ("confidence_effect", scored.get("confidence_effect")),
        ("source_effect", scored.get("source_effect")),
        ("cso_candidate_reason", scored.get("cso_candidate_reason")),
        ("scoring_version", scored.get("scoring_version")),
        ("scored_at", datetime.now(timezone.utc).isoformat()),
    ]
    usable = [(k, v) for k, v in scored_pairs if k in allowed]
    if not usable:
        return

    set_sql = ", ".join(f"{k} = ?" for k, _ in usable)
    params = [v for _, v in usable] + [event_id]
    conn.execute(f"UPDATE competitor_events SET {set_sql} WHERE id = ?", params)


def _apply_enrichment_fields(conn, event_id: int, patch: dict[str, Any]) -> int:
    if not patch:
        return 0
    allowed = _event_columns(conn)
    usable = [(k, v) for k, v in patch.items() if k in allowed]
    if not usable:
        return 0

    set_sql = ", ".join(f"{k} = ?" for k, _ in usable)
    params = [v for _, v in usable] + [event_id]
    conn.execute(f"UPDATE competitor_events SET {set_sql} WHERE id = ?", params)
    return len(usable)


def _readiness_snapshot(conn) -> dict[str, Any]:
    rows = conn.execute(
        """
        SELECT *
        FROM competitor_events
        WHERE deleted_at IS NULL
          AND (COALESCE(priority_tier, '') IN ('CSO Brief', 'Leadership Watch') OR COALESCE(escalate_to_cso, 0) = 1)
        """
    ).fetchall()

    serialized = _serialize_competitor_events(conn, rows)
    valid_source_link = 0
    usable_confidence = 0
    brief_ready = 0
    blocked_by_reason: dict[str, int] = {}

    for row in serialized:
        normalized_source, source_warning = normalize_source_link(row.source_link)
        if normalized_source and source_warning is None:
            valid_source_link += 1
        if normalize_confidence_level(row.confidence_level) or row.confidence_score is not None:
            usable_confidence += 1
        if row.is_brief_ready:
            brief_ready += 1
        else:
            for reason in row.readiness_issues:
                blocked_by_reason[reason] = blocked_by_reason.get(reason, 0) + 1

    return {
        "candidate_rows": len(serialized),
        "valid_source_link": valid_source_link,
        "usable_confidence": usable_confidence,
        "brief_ready": brief_ready,
        "blocked_by_reason": blocked_by_reason,
    }


def _count_brief_ready(conn) -> int:
    return int(_readiness_snapshot(conn)["brief_ready"])


@router.get("/competitor-events", response_model=CompetitorEventsListResponse)
def list_competitor_events(
    user: SentryUser = Depends(require_admin),
    competitor: str | None = Query(None),
    category: str | None = Query(None),
    month: str | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CompetitorEventsListResponse:
    """Admin: List competitor events with filters and pagination."""
    conn = get_connection()
    params: list[Any] = []
    clauses: list[str] = ["deleted_at IS NULL"]

    if competitor:
        clauses.append("competitor = ?")
        params.append(competitor)
    if category:
        clauses.append("category = ?")
        params.append(category)
    if month:
        clauses.append("source_month = ?")
        params.append(month)
    if q:
        clauses.append(
            "(LOWER(event_title) LIKE ? OR LOWER(detailed_description) LIKE ? "
            "OR LOWER(competitor) LIKE ?)"
        )
        term = f"%{q.lower()}%"
        params.extend([term, term, term])

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    total = conn.execute(
        f"SELECT COUNT(*) FROM competitor_events {where}", params
    ).fetchone()[0]

    total_pages = max(1, math.ceil(total / page_size))
    page = min(page, total_pages)
    offset = (page - 1) * page_size

    rows = conn.execute(
        f"SELECT * FROM competitor_events {where} "
        f"ORDER BY event_date DESC, id DESC LIMIT ? OFFSET ?",
        params + [page_size, offset],
    ).fetchall()

    events = _serialize_competitor_events(conn, rows)
    conn.close()

    return CompetitorEventsListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        events=events,
    )


@router.get("/competitor-events/{event_id:int}", response_model=CompetitorEventOut)
def get_competitor_event(
    event_id: int,
    user: SentryUser = Depends(require_admin),
) -> CompetitorEventOut:
    """Admin: Get single competitor event by ID."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ? AND deleted_at IS NULL",
            (event_id,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Event not found")

    with get_connection() as enrich_conn:
        return _serialize_competitor_event(enrich_conn, row)


@router.post("/competitor-events", response_model=CompetitorEventOut)
def create_competitor_event(
    event: CompetitorEventCreate,
    user: SentryUser = Depends(require_admin),
) -> CompetitorEventOut:
    """Admin: Create a new competitor event."""
    conn = get_connection()
    try:
        cursor = conn.cursor()

        payload = event.model_dump()
        pre_patch, _enrichment_warnings = enrich_for_brief_readiness(payload)
        payload_for_score = {**payload, **pre_patch}
        scored = score_event(payload_for_score)
        persisted_confidence_level = (
            normalize_confidence_level(payload_for_score.get("confidence_level"))
            or pre_patch.get("confidence_level", "")
        )

        cursor.execute(
            """
            INSERT INTO competitor_events (
                event_date, competitor, event_title, event_type, detailed_description,
                category, location, security_implication, operational_impact,
                financial_impact, reputational_impact, source_link,
                analyst_notes, source_month, confidence_level,
                walmart_relevance_score, priority_tier, signal_type,
                recommended_owner, why_walmart_cares,
                strategic_score, security_score, operational_score,
                customer_trust_score, novelty_score, urgency_score,
                confidence_score, escalate_to_cso,
                score_reason, confidence_effect, source_effect, cso_candidate_reason,
                scoring_version, scored_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event.event_date,
                event.competitor,
                event.event_title,
                event.event_type,
                event.detailed_description,
                event.category,
                event.location,
                event.security_implication,
                event.operational_impact,
                event.financial_impact,
                event.reputational_impact,
                payload_for_score.get("source_link", event.source_link),
                event.analyst_notes,
                event.source_month,
                persisted_confidence_level,
                scored["walmart_relevance_score"],
                scored["priority_tier"],
                scored["signal_type"],
                scored["recommended_owner"],
                scored["why_walmart_cares"],
                scored["strategic_score"],
                scored["security_score"],
                scored["operational_score"],
                scored["customer_trust_score"],
                scored["novelty_score"],
                scored["urgency_score"],
                scored["confidence_score"],
                scored["escalate_to_cso"],
                scored["score_reason"],
                scored["confidence_effect"],
                scored["source_effect"],
                scored["cso_candidate_reason"],
                scored["scoring_version"],
              datetime.now(timezone.utc).isoformat(),
            ),
        )
        event_id = cursor.lastrowid

        row_for_enrichment = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ?",
            (event_id,),
        ).fetchone()
        enriched = enrich_competitor_event_row(conn, row_for_enrichment)
        enrich_patch, enrichment_warnings = enrich_for_brief_readiness(enriched)
        if enrich_patch:
            _apply_enrichment_fields(conn, event_id, enrich_patch)

        log_mutation(
            conn, user, "create", "competitor_event", str(event_id),
            new_value={
                **event.model_dump(),
                "enrichment_applied": sorted(enrich_patch.keys()),
                "enrichment_warnings": enrichment_warnings,
            },
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ?", (event_id,)
        ).fetchone()
    finally:
        conn.close()

    with get_connection() as enrich_conn:
        return _serialize_competitor_event(enrich_conn, row)


@router.patch("/competitor-events/{event_id:int}", response_model=CompetitorEventOut)
def update_competitor_event(
    event_id: int,
    update: CompetitorEventUpdate,
    user: SentryUser = Depends(require_admin),
) -> CompetitorEventOut:
    """Admin: Update competitor event fields."""
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ? AND deleted_at IS NULL",
            (event_id,),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Event not found")

        change_data = update.model_dump(exclude_unset=True)
        updates = []
        params = []
        for field, value in change_data.items():
            if value is not None:
                updates.append(f"{field} = ?")
                params.append(value)

        if not updates:
            return _serialize_competitor_event(conn, existing)

        old_snapshot = {k: existing[k] for k in change_data if existing[k] is not None}

        params.append(event_id)
        conn.execute(
            f"UPDATE competitor_events SET {', '.join(updates)} WHERE id = ?", params
        )

        rescored_row = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ?", (event_id,)
        ).fetchone()
        rescored = score_event(dict(rescored_row))
        _apply_scored_fields(conn, event_id, rescored)

        correlation_enriched = enrich_competitor_event_row(conn, rescored_row)
        enrich_patch, enrichment_warnings = enrich_for_brief_readiness({**correlation_enriched, **rescored})
        updated_enrichment_fields = _apply_enrichment_fields(conn, event_id, enrich_patch)

        log_mutation(
            conn, user, "update", "competitor_event", str(event_id),
            old_value=old_snapshot,
            new_value={
                **change_data,
                **rescored,
                "enrichment_applied": sorted(enrich_patch.keys()),
                "updated_enrichment_fields": updated_enrichment_fields,
                "enrichment_warnings": enrichment_warnings,
            },
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ?", (event_id,)
        ).fetchone()
    finally:
        conn.close()

    with get_connection() as enrich_conn:
        return _serialize_competitor_event(enrich_conn, row)


@router.delete("/competitor-events/{event_id:int}")
def delete_competitor_event(
    event_id: int,
    confirm: bool = Query(False, description="Must be true to delete"),
    permanent: bool = Query(False, description="Hard-delete instead of soft-delete (admin only)"),
    user: SentryUser = Depends(require_admin),
) -> dict:
    """Admin: Soft-delete a competitor event.

    Sets deleted_at timestamp. Use permanent=true for hard-delete (irreversible).
    Both modes require confirm=true.
    """
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, competitor, event_title FROM competitor_events "
            "WHERE id = ? AND deleted_at IS NULL",
            (event_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found")

        if not confirm:
            return {
                "dry_run": True,
                "event_id": event_id,
                "competitor": row["competitor"],
                "event_title": row["event_title"],
                "message": "Add confirm=true to delete this event.",
            }

        if permanent:
            conn.execute("DELETE FROM competitor_events WHERE id = ?", (event_id,))
            action = "hard_delete"
        else:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE competitor_events SET deleted_at = ? WHERE id = ?",
                (now, event_id),
            )
            action = "soft_delete"

        log_mutation(
            conn, user, action, "competitor_event", str(event_id),
            old_value={"competitor": row["competitor"], "event_title": row["event_title"]},
            metadata={"permanent": permanent},
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "success": True,
        "action": action,
        "deleted_id": event_id,
        "competitor": row["competitor"],
        "event_title": row["event_title"],
    }


# ══════════════════════════════════════════════════════════════════════════════
# COMPETITOR PUBLIC API (for frontend intelligence hub)
# ══════════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter

competitor_router = APIRouter(prefix="/api/competitors", tags=["competitors"])


class CompetitorStats(BaseModel):
    total: int
    cyber: int
    orc: int
    recall: int
    legal: int
    strategic: int
    competitor_count: int


class CompetitorEntity(BaseModel):
    name: str
    event_count: int
    cyber_count: int
    orc_count: int
    recall_count: int
    legal_count: int
    strategic_count: int
    threat_level: str
    top_category: str | None
    categories_json: str
    monthly_json: str


class CompetitorMonthly(BaseModel):
    months: list[str]
    series: dict[str, list[int]]


class CompetitorHeatmap(BaseModel):
    competitors: list[str]
    categories: list[str]
    matrix: list[list[int]]


@competitor_router.get("/stats", response_model=CompetitorStats)
def get_competitor_stats() -> CompetitorStats:
    """Public: Get competitor intelligence KPIs."""
    conn = get_connection()
    row = conn.execute("""
        SELECT COUNT(*) as total,
               SUM(CASE WHEN category='Cyber'    THEN 1 ELSE 0 END) as cyber,
               SUM(CASE WHEN category='ORC/Theft'THEN 1 ELSE 0 END) as orc,
               SUM(CASE WHEN category='Recall'   THEN 1 ELSE 0 END) as recall,
               SUM(CASE WHEN category='Legal'    THEN 1 ELSE 0 END) as legal,
               SUM(CASE WHEN category='Strategic'THEN 1 ELSE 0 END) as strategic
        FROM competitor_events
    """).fetchone()
    comp_count = conn.execute("""
        SELECT COUNT(*) FROM competitor_entities WHERE event_count >= 3
    """).fetchone()[0]
    conn.close()
    return CompetitorStats(
        total=row["total"] or 0,
        cyber=row["cyber"] or 0,
        orc=row["orc"] or 0,
        recall=row["recall"] or 0,
        legal=row["legal"] or 0,
        strategic=row["strategic"] or 0,
        competitor_count=comp_count or 0,
    )


@competitor_router.get("/entities", response_model=dict)
def get_competitor_entities(
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, list[CompetitorEntity]]:
    """Public: Get competitor entity profiles."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT name, event_count, cyber_count, orc_count, recall_count,
               legal_count, strategic_count, threat_level, top_category,
               categories_json, monthly_json
        FROM competitor_entities
        WHERE event_count >= 3
        ORDER BY event_count DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    entities = [
        CompetitorEntity(
            name=r["name"],
            event_count=r["event_count"],
            cyber_count=r["cyber_count"],
            orc_count=r["orc_count"],
            recall_count=r["recall_count"],
            legal_count=r["legal_count"],
            strategic_count=r["strategic_count"],
            threat_level=r["threat_level"],
            top_category=r["top_category"],
            categories_json=r["categories_json"] or "{}",
            monthly_json=r["monthly_json"] or "{}",
        )
        for r in rows
    ]
    return {"entities": entities}


@competitor_router.get("/monthly", response_model=CompetitorMonthly)
def get_competitor_monthly(
    top: int = Query(5, ge=1, le=20),
) -> CompetitorMonthly:
    """Public: Get monthly trend data for top N competitors."""
    MONTHS = ["Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026"]
    conn = get_connection()
    top_names = [
        r["name"]
        for r in conn.execute("""
            SELECT name FROM competitor_entities
            WHERE event_count >= 3
            ORDER BY event_count DESC
            LIMIT ?
        """, (top,)).fetchall()
    ]
    series: dict[str, list[int]] = {}
    for name in top_names:
        counts = []
        for month in MONTHS:
            cnt = conn.execute("""
                SELECT COUNT(*) FROM competitor_events
                WHERE competitor = ? AND source_month LIKE ?
            """, (name, f"%{month}%")).fetchone()[0]
            counts.append(cnt or 0)
        series[name] = counts
    conn.close()
    return CompetitorMonthly(months=MONTHS, series=series)


@competitor_router.get("/heatmap", response_model=CompetitorHeatmap)
def get_competitor_heatmap(
    top: int = Query(10, ge=1, le=20),
) -> CompetitorHeatmap:
    """Public: Get category heatmap for top N competitors."""
    HEAT_CATS = [
        "Cyber", "ORC/Theft", "Recall", "Legal", "Strategic",
        "Operational", "Compliance", "Fraud", "Technology",
        "Disruption", "Expansion", "Financial", "Labor", "Major Incident", "Other",
    ]
    conn = get_connection()
    top_names = [
        r["name"]
        for r in conn.execute("""
            SELECT name FROM competitor_entities
            WHERE event_count >= 3
            ORDER BY event_count DESC
            LIMIT ?
        """, (top,)).fetchall()
    ]
    matrix: list[list[int]] = []
    for name in top_names:
        row_counts = []
        for cat in HEAT_CATS:
            cnt = conn.execute("""
                SELECT COUNT(*) FROM competitor_events
                WHERE competitor = ? AND category = ?
            """, (name, cat)).fetchone()[0]
            row_counts.append(cnt or 0)
        matrix.append(row_counts)
    conn.close()
    return CompetitorHeatmap(
        competitors=top_names,
        categories=HEAT_CATS,
        matrix=matrix,
    )


@competitor_router.get("/events", response_model=CompetitorEventsListResponse)
def get_competitor_events(
    competitor: str | None = Query(None),
    category: str | None = Query(None),
    month: str | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CompetitorEventsListResponse:
    """Public: List competitor events with filters and pagination."""
    conn = get_connection()
    params: list[Any] = []
    clauses: list[str] = []

    if competitor:
        clauses.append("competitor = ?")
        params.append(competitor)
    if category:
        clauses.append("category = ?")
        params.append(category)
    if month:
        clauses.append("source_month = ?")
        params.append(month)
    if q:
        clauses.append(
            "(LOWER(event_title) LIKE ? OR LOWER(detailed_description) LIKE ? "
            "OR LOWER(competitor) LIKE ?)"
        )
        term = f"%{q.lower()}%"
        params.extend([term, term, term])

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    total = conn.execute(
        f"SELECT COUNT(*) FROM competitor_events {where}", params
    ).fetchone()[0]

    offset = (page - 1) * page_size
    rows = conn.execute(
        f"""
        SELECT * FROM competitor_events {where}
        ORDER BY event_date DESC
        LIMIT ? OFFSET ?
        """,
        params + [page_size, offset],
    ).fetchall()
    events = _serialize_competitor_events(conn, rows)
    conn.close()

    return CompetitorEventsListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
        events=events,
    )


@competitor_router.get("/categories", response_model=dict)
def get_competitor_categories() -> dict[str, list[str]]:
    """Public: Get distinct event categories."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT DISTINCT category FROM competitor_events
        WHERE category IS NOT NULL
        ORDER BY category
    """).fetchall()
    conn.close()
    return {"categories": [r["category"] for r in rows]}


def _tier_distribution(conn) -> dict[str, int]:
    rows = conn.execute(
        """
        SELECT
          SUM(CASE WHEN walmart_relevance_score IS NULL THEN 1 ELSE 0 END) AS unscored,
          SUM(CASE WHEN COALESCE(priority_tier, '') = 'Archive / Low Signal' THEN 1 ELSE 0 END) AS archive_low_signal,
          SUM(CASE WHEN priority_tier = 'Analyst Follow-up' THEN 1 ELSE 0 END) AS analyst_follow_up,
          SUM(CASE WHEN priority_tier = 'Leadership Watch' THEN 1 ELSE 0 END) AS leadership_watch,
          SUM(CASE WHEN priority_tier = 'CSO Brief' THEN 1 ELSE 0 END) AS cso_brief
        FROM competitor_events
        WHERE deleted_at IS NULL
        """
    ).fetchone()
    return {
        "unscored": int(rows["unscored"] or 0),
        "archive_low_signal": int(rows["archive_low_signal"] or 0),
        "analyst_follow_up": int(rows["analyst_follow_up"] or 0),
        "leadership_watch": int(rows["leadership_watch"] or 0),
        "cso_brief": int(rows["cso_brief"] or 0),
    }


@router.get("/competitor-events/scoring-summary", response_model=CompetitorScoringSummary)
def competitor_scoring_summary(
    user: SentryUser = Depends(require_admin),
) -> CompetitorScoringSummary:
    conn = get_connection()
    try:
        total_row = conn.execute(
            "SELECT COUNT(*) AS total FROM competitor_events WHERE deleted_at IS NULL"
        ).fetchone()
        score_row = conn.execute(
            "SELECT AVG(walmart_relevance_score) AS avg_score FROM competitor_events "
            "WHERE deleted_at IS NULL AND walmart_relevance_score IS NOT NULL"
        ).fetchone()
        cso_row = conn.execute(
            "SELECT COUNT(*) AS cso_candidates FROM competitor_events WHERE deleted_at IS NULL "
            "AND (escalate_to_cso = 1 OR priority_tier='CSO Brief' OR COALESCE(walmart_relevance_score,0) >= 82)"
        ).fetchone()
        dist = _tier_distribution(conn)
    finally:
        conn.close()

    return CompetitorScoringSummary(
        total=int(total_row["total"] or 0),
        cso_candidates=int(cso_row["cso_candidates"] or 0),
        avg_score=round(float(score_row["avg_score"] or 0.0), 2),
        distribution=CompetitorScoreDistribution(**dist),
    )


@router.get("/competitor-events/triage-queue", response_model=CompetitorTriageQueueResponse)
def list_competitor_triage_queue(
    user: SentryUser = Depends(require_admin),
    triage_status: str | None = Query(None, description="UNREVIEWED|REVIEWED|DISMISSED|ESCALATED"),
    priority_tier: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
) -> CompetitorTriageQueueResponse:
    """Admin: queue for analyst triage of scored competitor events."""
    conn = get_connection()
    try:
        clauses = ["deleted_at IS NULL"]
        params: list[Any] = []

        if triage_status:
            normalized = triage_status.strip().upper()
            if normalized not in TRIAGE_STATUSES:
                raise HTTPException(status_code=400, detail="Invalid triage_status")
            clauses.append("COALESCE(triage_status, 'UNREVIEWED') = ?")
            params.append(normalized)

        if priority_tier:
            clauses.append("COALESCE(priority_tier, '') = ?")
            params.append(priority_tier)
        else:
            clauses.append("(COALESCE(priority_tier, '') IN ('Leadership Watch', 'CSO Brief') OR COALESCE(escalate_to_cso, 0) = 1)")

        where = f"WHERE {' AND '.join(clauses)}"
        rows = conn.execute(
            f"""
            SELECT * FROM competitor_events
            {where}
            ORDER BY
                CASE COALESCE(priority_tier, '')
                    WHEN 'CSO Brief' THEN 1
                    WHEN 'Leadership Watch' THEN 2
                    WHEN 'Analyst Follow-up' THEN 3
                    ELSE 4
                END,
                COALESCE(walmart_relevance_score, 0) DESC,
                event_date DESC,
                id DESC
            LIMIT ?
            """,
            params + [limit],
        ).fetchall()

        items = _serialize_competitor_events(conn, rows)
        return CompetitorTriageQueueResponse(total=len(items), items=items)
    finally:
        conn.close()


@router.patch("/competitor-events/{event_id:int}/triage", response_model=CompetitorEventOut)
def triage_competitor_event(
    event_id: int,
    body: CompetitorTriageUpdateRequest,
    user: SentryUser = Depends(require_admin),
) -> CompetitorEventOut:
    """Admin: set analyst triage state for a competitor event."""
    next_status = body.triage_status.strip().upper()
    if next_status not in TRIAGE_STATUSES:
        raise HTTPException(status_code=400, detail="triage_status must be one of UNREVIEWED|REVIEWED|DISMISSED|ESCALATED")

    triaged_at = datetime.now(timezone.utc).isoformat()
    triage_note = body.triage_note.strip()

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ? AND deleted_at IS NULL",
            (event_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found")

        old_snapshot = {
            "triage_status": row["triage_status"] or "UNREVIEWED",
            "triaged_by": row["triaged_by"] or "",
            "triaged_at": row["triaged_at"] or "",
            "triage_note": row["triage_note"] or "",
        }

        conn.execute(
            """
            UPDATE competitor_events
            SET triage_status=?, triaged_by=?, triaged_at=?, triage_note=?
            WHERE id=?
            """,
            (next_status, user.id, triaged_at, triage_note, event_id),
        )

        log_mutation(
            conn,
            user,
            "triage",
            "competitor_event",
            str(event_id),
            old_value=old_snapshot,
            new_value={
                "triage_status": next_status,
                "triaged_by": user.id,
                "triaged_at": triaged_at,
                "triage_note": triage_note,
            },
            metadata={"workflow": "competitor_triage"},
        )
        conn.commit()

        updated = conn.execute(
            "SELECT * FROM competitor_events WHERE id = ?",
            (event_id,),
        ).fetchone()
    finally:
        conn.close()

    with get_connection() as enrich_conn:
        return _serialize_competitor_event(enrich_conn, updated)


@router.post("/competitor-events/rescore")
def rescore_competitor_events(
    user: SentryUser = Depends(require_admin),
    limit: int = Query(500, ge=1, le=5000),
    only_unscored: bool = Query(False),
    preserve_manual: bool = Query(True, description="Skip rows with analyst notes/manual override markers"),
) -> dict:
    """Admin: recompute Walmart relevance scoring for competitor events.

    Safe defaults:
    - only_unscored=False (full recalibration allowed)
    - preserve_manual=True (skip rows with analyst note containing '#manual-score')
    """
    conn = get_connection()
    try:
        before = _tier_distribution(conn)

        where = "WHERE deleted_at IS NULL"
        if only_unscored:
            where += " AND walmart_relevance_score IS NULL"

        rows = conn.execute(
            f"SELECT * FROM competitor_events {where} ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()

        updated = 0
        escalated = 0
        skipped_manual = 0
        promoted: list[dict[str, Any]] = []

        enriched_rows = enrich_competitor_event_rows(conn, rows)
        enrichment_updates = 0

        for row in enriched_rows:
            existing_tier = row["priority_tier"] or ""
            analyst_notes = (row["analyst_notes"] or "").lower()
            if preserve_manual and "#manual-score" in analyst_notes:
                skipped_manual += 1
                continue

            scored = score_event(dict(row))
            _apply_scored_fields(conn, row["id"], scored)

            enrich_patch, _warnings = enrich_for_brief_readiness({**dict(row), **scored})
            enrichment_updates += _apply_enrichment_fields(conn, row["id"], enrich_patch)

            updated += 1
            escalated += int(scored["escalate_to_cso"])

            if existing_tier != scored["priority_tier"] and scored["priority_tier"] in {"Leadership Watch", "CSO Brief"}:
                promoted.append({
                    "id": row["id"],
                    "competitor": row["competitor"],
                    "event_title": row["event_title"],
                    "from_tier": existing_tier or "Unscored",
                    "to_tier": scored["priority_tier"],
                    "score": scored["walmart_relevance_score"],
                })

        after = _tier_distribution(conn)

        log_mutation(
            conn, user, "rescore", "competitor_event", "batch",
            new_value={
                "updated": updated,
                "escalated": escalated,
                "skipped_manual": skipped_manual,
                "enrichment_field_updates": enrichment_updates,
                "before": before,
                "after": after,
            },
            metadata={
                "limit": limit,
                "only_unscored": only_unscored,
                "preserve_manual": preserve_manual,
            },
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "success": True,
        "updated": updated,
        "skipped_manual": skipped_manual,
        "enrichment_field_updates": enrichment_updates,
        "cso_escalation_candidates": escalated,
        "before": before,
        "after": after,
        "promoted": promoted[:25],
    }


@router.post("/competitor-events/backfill-brief-readiness")
def backfill_competitor_brief_readiness(
    user: SentryUser = Depends(require_admin),
    limit: int = Query(2000, ge=1, le=10000),
    only_missing: bool = Query(True, description="Only process rows missing source/rationale/owner/actionability/correlation summary"),
) -> dict:
    """Admin: enrich competitor events for brief-readiness without altering triage state."""
    conn = get_connection()
    try:
        before_snapshot = _readiness_snapshot(conn)
        before_ready = before_snapshot["brief_ready"]

        where = "WHERE deleted_at IS NULL"
        if only_missing:
            cols = _event_columns(conn)
            missing_checks = [
                "TRIM(COALESCE(source_link,'')) = ''",
                "LOWER(TRIM(COALESCE(source_link,''))) LIKE 'www.%'",
                "TRIM(COALESCE(why_walmart_cares,'')) = ''",
                "TRIM(COALESCE(recommended_owner,'')) = ''",
                "TRIM(COALESCE(confidence_level,'')) = ''",
                "confidence_score IS NULL",
            ]
            if "walmart_actionability_context" in cols:
                missing_checks.append("TRIM(COALESCE(walmart_actionability_context,'')) = ''")
            if "correlation_summary" in cols:
                missing_checks.append("TRIM(COALESCE(correlation_summary,'')) = ''")
            where += f" AND ({' OR '.join(missing_checks)})"

        rows = conn.execute(
            f"SELECT * FROM competitor_events {where} ORDER BY id DESC LIMIT ?",
  (limit,),
        ).fetchall()

        enriched_rows = enrich_competitor_event_rows(conn, rows)

        updated_rows = 0
        field_updates = 0
        warnings_total = 0
        changed_ids: list[int] = []
        field_coverage_before = {name: 0 for name in BRIEF_READY_FIELD_NAMES}
        field_coverage_after = {name: 0 for name in BRIEF_READY_FIELD_NAMES}
        skipped_rows = 0
        skipped_reasons: dict[str, int] = {}

        for row in enriched_rows:
            row_dict = dict(row)
            for field_name in BRIEF_READY_FIELD_NAMES:
                if str(row_dict.get(field_name) or "").strip():
                    field_coverage_before[field_name] += 1

            scored = score_event(row_dict)
            _apply_scored_fields(conn, row_dict["id"], scored)

            merged_for_enrichment = {**row_dict, **scored}
            patch, warnings = build_brief_readiness_enrichment(merged_for_enrichment)
            warnings_total += len(warnings)

            changed = 0
            merged = {**row_dict, **scored}
            if patch:
                changed = _apply_enrichment_fields(conn, row_dict["id"], patch)
                merged = {**merged, **patch}

            rescored_after_enrichment = score_event(merged)
            _apply_scored_fields(conn, row_dict["id"], rescored_after_enrichment)
            merged = {**merged, **rescored_after_enrichment}

            for field_name in BRIEF_READY_FIELD_NAMES:
                if str(merged.get(field_name) or "").strip():
                    field_coverage_after[field_name] += 1

            scored_field_changes = 1 if rescored_after_enrichment != scored else 0
            if changed > 0 or scored_field_changes > 0:
                updated_rows += 1
                field_updates += changed + scored_field_changes
                changed_ids.append(int(row_dict["id"]))
            else:
                skipped_rows += 1
                skipped_reasons["NO_ENRICHABLE_GAPS"] = skipped_reasons.get("NO_ENRICHABLE_GAPS", 0) + 1

        after_snapshot = _readiness_snapshot(conn)
        after_ready = after_snapshot["brief_ready"]

        log_mutation(
            conn,
            user,
            "backfill_brief_readiness",
            "competitor_event",
            "batch",
            new_value={
                "limit": limit,
                "only_missing": only_missing,
                "processed_rows": len(enriched_rows),
                "updated_rows": updated_rows,
                "field_updates": field_updates,
                "warnings_total": warnings_total,
                "brief_ready_before": before_ready,
                "brief_ready_after": after_ready,
                "brief_ready_delta": after_ready - before_ready,
                "field_coverage_before": field_coverage_before,
                "field_coverage_after": field_coverage_after,
                "coverage_before": before_snapshot,
                "coverage_after": after_snapshot,
                "skipped_rows": skipped_rows,
                "skipped_reasons": skipped_reasons,
            },
            metadata={"changed_ids_sample": changed_ids[:50]},
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "success": True,
        "processed_rows": len(enriched_rows),
        "updated_rows": updated_rows,
        "field_updates": field_updates,
        "warnings_total": warnings_total,
        "brief_ready_before": before_ready,
        "brief_ready_after": after_ready,
        "brief_ready_delta": after_ready - before_ready,
        "field_coverage_before": field_coverage_before,
        "field_coverage_after": field_coverage_after,
        "coverage_before": before_snapshot,
        "coverage_after": after_snapshot,
        "skipped_rows": skipped_rows,
        "skipped_reasons": skipped_reasons,
        "updated_ids": changed_ids[:100],
    }


@competitor_router.get("/cso-candidates", response_model=dict)
def get_cso_candidates(
    limit: int = Query(25, ge=1, le=100),
) -> dict:
    """Public: high-priority competitor events for executive brief workflows."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT *
        FROM competitor_events
        WHERE (deleted_at IS NULL OR deleted_at = '')
          AND (
                escalate_to_cso = 1
                OR priority_tier = 'CSO Brief'
                OR walmart_relevance_score >= 82
          )
        ORDER BY walmart_relevance_score DESC, event_date DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    events = _serialize_competitor_events(conn, rows)
    conn.close()
    return {
        "count": len(rows),
        "events": [e.model_dump() for e in events],
    }

