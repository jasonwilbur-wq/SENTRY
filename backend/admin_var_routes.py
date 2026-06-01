"""Admin VAR management routes.

This module owns VAR listing, SharePoint score extraction, human review,
manual linking, and vendor-link search endpoints. It is included by
admin_routes.py under /api/admin to keep admin route concerns modular.
"""
from __future__ import annotations

import asyncio
import math
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from audit import log_mutation
from auth import SentryUser, require_admin
from database import get_connection

try:
    from sharepoint_auth import get_token, download_url_for_item
except ImportError:
    get_token = lambda: None  # noqa: E731
    download_url_for_item = lambda x: ""  # noqa: E731

from var_score_extractor import extract_scores


router = APIRouter(tags=["admin-vars"])


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


class ReviewExtractionRequest(BaseModel):
    action: str
    note: str = ""


class ExtractResult(BaseModel):
    var_id: str
    filename: str
    success: bool
    status: str = ""
    overall_score: float | None = None
    decision_band: str = ""
    error: str = ""
    requires_review: bool = False
    confidence: float | None = None


class BatchExtractResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    skipped: int
    status_counts: dict[str, int]
    results: list[ExtractResult]


def _admin_routes_override(name: str) -> Any | None:
    """Return a legacy admin_routes monkeypatch override when tests provide one.

    VAR implementation moved into this module, but existing tests and extension
    code may still patch admin_routes symbols. Keeping this bridge avoids a
    breaking change while callers migrate to admin_var_routes.
    """
    module = sys.modules.get("admin_routes")
    if module is None:
        return None
    override = getattr(module, name, None)
    return override if override is not globals().get(name) else None


def _download_and_extract_callable():
    return _admin_routes_override("_download_and_extract") or _download_and_extract


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

def get_token_diagnostics() -> dict[str, Any]:
    """Return SharePoint token readiness in a testable, non-secret shape.

    Keep this payload safe for logs and future diagnostics endpoints. The
    bearer token itself must stay on the private download path and must never
    be included in a diagnostics-shaped response.
    """
    token = get_token()
    return {
        "available": bool(token),
        "reason_code": "OK" if token else "TOKEN_UNAVAILABLE",
        "reason": "SharePoint token available" if token else "MSAL token unavailable — run SharePoint auth first",
    }


def _confidence_from_scores(scores: dict[str, Any]) -> float | None:
    """Simple extraction confidence proxy based on score field coverage."""
    score_keys = (
        "overall_score", "compliance_score", "risk_score", "maturity_score",
        "integration_score", "roi_score", "viability_score",
        "differentiation_score", "cloud_dep_score",
    )
    present = sum(1 for key in score_keys if scores.get(key) is not None)
    return round(present / len(score_keys), 2) if present else None


def _record_extraction_status(
    var_id: str,
    status: str,
    *,
    review_status: str | None = None,
    confidence: float | None = None,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE var_reports
               SET extraction_last_status = ?,
                   extraction_review_status = COALESCE(?, extraction_review_status),
                   extraction_confidence = COALESCE(?, extraction_confidence)
             WHERE id = ?
            """,
            (status, review_status, confidence, var_id),
        )
        conn.commit()


async def _download_and_extract(var_id: str) -> ExtractResult:
    """Download a VAR from SharePoint and extract scores. Returns result."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, filename, item_id, sharepoint_url, download_url FROM var_reports WHERE id = ?",
        (var_id,)
    ).fetchone()
    conn.close()

    if not row:
        return ExtractResult(var_id=var_id, filename="", success=False, status="NOT_FOUND", error="VAR not found")

    filename = row["filename"]
    item_id = (row["item_id"] or "").strip()
    sharepoint_url = (row["sharepoint_url"] or "").strip()
    download_url = (row["download_url"] or "").strip()

    if not item_id and not download_url and not sharepoint_url:
        _record_extraction_status(var_id, "MISSING_ITEM_ID")
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status="MISSING_ITEM_ID",
            error="No SharePoint item_id or alternate download source",
        )

    if item_id:
        doc_url = download_url_for_item(item_id)
    elif download_url:
        doc_url = download_url
    else:
        doc_url = sharepoint_url

    headers: dict[str, str] = {}
    token_diagnostics = _admin_routes_override("get_token_diagnostics") or get_token_diagnostics
    token_info = token_diagnostics()
    # Backward compatibility: existing tests/extensions may monkeypatch the
    # legacy diagnostics hook with a token-bearing dict. The real diagnostics
    # function intentionally does not expose tokens.
    token = token_info.get("token") or get_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif item_id or "graph.microsoft.com" in doc_url:
        status = "AUTH_UNAVAILABLE"
        reason = f"{token_info.get('reason_code', 'TOKEN_UNAVAILABLE')}: {token_info.get('reason', 'No SharePoint token')}"
        _record_extraction_status(var_id, status)
        return ExtractResult(
            var_id=var_id,
            filename=filename,
            success=False,
            status=status,
            error=reason,
        )

    try:
        http_client = _admin_routes_override("httpx") or httpx
        async with http_client.AsyncClient(follow_redirects=True, timeout=60) as client:
            resp = await client.get(doc_url, headers=headers)
        if resp.status_code != 200:
            status = "DOWNLOAD_FAILED"
            _record_extraction_status(var_id, status)
            return ExtractResult(
                var_id=var_id, filename=filename, success=False, status=status,
                error=f"Download failed: HTTP {resp.status_code}"
            )

        content_type = (getattr(resp, "headers", {}) or {}).get("content-type", "").lower()
        if "wordprocessingml.document" not in content_type and not filename.lower().endswith(".docx"):
            status = "DOWNLOAD_FAILED"
            _record_extraction_status(var_id, status)
            return ExtractResult(
                var_id=var_id,
                filename=filename,
                success=False,
                status=status,
                error="Downloaded content is not a DOCX file",
            )

        docx_bytes = resp.content
    except Exception as exc:
        status = "DOWNLOAD_FAILED"
        _record_extraction_status(var_id, status)
        return ExtractResult(
            var_id=var_id, filename=filename, success=False, status=status,
            error=f"Download error: {exc}"
        )

    # Write to temp file and extract
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(docx_bytes)
        tmp_path = tmp.name

    try:
        score_extractor = _admin_routes_override("extract_scores") or extract_scores
        scores = score_extractor(tmp_path)
    except Exception as exc:
        status = "PARSE_FAILED"
        _record_extraction_status(var_id, status)
        return ExtractResult(
            var_id=var_id, filename=filename, success=False, status=status,
            error=f"Extraction error: {exc}"
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if "_error" in scores:
        status = "PARSE_FAILED"
        _record_extraction_status(var_id, status)
        return ExtractResult(
            var_id=var_id, filename=filename, success=False, status=status,
            error=scores["_error"]
        )

    overall = scores.get("overall_score")
    band = scores.get("decision_band", "")

    if overall is None:
        status = "PARSE_FAILED"
        _record_extraction_status(var_id, status)
        return ExtractResult(
            var_id=var_id, filename=filename, success=False, status=status,
            error="No scores found in document"
        )

    confidence = _confidence_from_scores(scores)

    # Persist to DB, pending human review before scores are considered final.
    conn = get_connection()
    conn.execute(
        """UPDATE var_reports SET
            overall_score=?, decision_band=?,
            compliance_score=?, risk_score=?, maturity_score=?,
            integration_score=?, roi_score=?, viability_score=?,
            differentiation_score=?, cloud_dep_score=?,
            extraction_last_status='SUCCESS',
            extraction_review_status='EXTRACTED_PENDING_REVIEW',
            extraction_confidence=?
           WHERE id=?""",
        (
            overall, band,
            scores.get("compliance_score"), scores.get("risk_score"),
            scores.get("maturity_score"), scores.get("integration_score"),
            scores.get("roi_score"), scores.get("viability_score"),
            scores.get("differentiation_score"), scores.get("cloud_dep_score"),
            confidence,
            var_id,
        ),
    )
    conn.commit()
    conn.close()

    return ExtractResult(
        var_id=var_id,
        filename=filename,
        success=True,
        status="SUCCESS",
        overall_score=overall,
        decision_band=band,
        requires_review=True,
        confidence=confidence,
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
        f"SELECT id, filename, overall_score FROM var_reports {where} "
        f"ORDER BY filename LIMIT ?", (limit,)
    ).fetchall()
    conn.close()

    if not rows:
        return BatchExtractResponse(
            total=0, succeeded=0, failed=0, skipped=0, status_counts={}, results=[]
        )

    results: list[ExtractResult] = []
    succeeded = failed = skipped = 0
    batch_size = 5

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        write_blocked = [r for r in batch if overwrite and r["overall_score"] is not None]
        for row in write_blocked:
            results.append(ExtractResult(
                var_id=row["id"],
                filename=row["filename"],
                success=False,
                status="WRITE_BLOCKED",
                error="DRY RUN: overwrite requests are blocked by default to protect reviewed scores.",
            ))
        runnable = [r for r in batch if r not in write_blocked]
        download_and_extract = _download_and_extract_callable()
        tasks = [download_and_extract(r["id"]) for r in runnable]
        batch_results = await asyncio.gather(*tasks) if tasks else []
        for res in batch_results:
            results.append(res)

    status_counts: dict[str, int] = {}
    for res in results:
        status = res.status or ("SUCCESS" if res.success else "FAILED")
        status_counts[status] = status_counts.get(status, 0) + 1
        if res.success:
            succeeded += 1
        elif status in {"MISSING_ITEM_ID", "AUTH_UNAVAILABLE", "WRITE_BLOCKED"}:
            skipped += 1
        else:
            failed += 1

    return BatchExtractResponse(
        total=len(rows),
        succeeded=succeeded,
        failed=failed,
        skipped=skipped,
        status_counts=status_counts,
        results=results,
    )


@router.get("/vars/review-queue")
def list_var_review_queue(
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Return VAR extractions pending human review."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, vendor_id, filename, overall_score, decision_band,
                   extraction_review_status, extraction_last_status,
                   extraction_confidence, extraction_reviewed_by,
                   extraction_reviewed_at, extraction_review_note
              FROM var_reports
             WHERE extraction_review_status = 'EXTRACTED_PENDING_REVIEW'
             ORDER BY created_at DESC, filename
             LIMIT ?
            """,
            (limit,),
        ).fetchall()
    items = [dict(row) for row in rows]
    return {"total": len(items), "items": items}


@router.patch("/vars/{var_id}/review")
def review_var_extraction(
    var_id: str,
    body: ReviewExtractionRequest,
    user: SentryUser = Depends(require_admin),
) -> dict[str, Any]:
    """Accept or reject extracted VAR scores with an auditable decision."""
    action = body.action.strip().upper()
    status_by_action = {
        "ACCEPT": "REVIEWED_ACCEPTED",
        "REJECT": "REVIEWED_REJECTED",
    }
    if action not in status_by_action:
        raise HTTPException(status_code=400, detail="action must be ACCEPT or REJECT")

    reviewed_at = datetime.now(timezone.utc).isoformat()
    review_status = status_by_action[action]
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM var_reports WHERE id = ?",
            (var_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="VAR not found")

        conn.execute(
            """
            UPDATE var_reports
               SET extraction_review_status = ?,
                   extraction_reviewed_by = ?,
                   extraction_reviewed_at = ?,
                   extraction_review_note = ?
             WHERE id = ?
            """,
            (review_status, user.id, reviewed_at, body.note, var_id),
        )
        new_value = {
            "extraction_review_status": review_status,
            "extraction_reviewed_by": user.id,
            "extraction_reviewed_at": reviewed_at,
            "extraction_review_note": body.note,
        }
        log_mutation(
            conn=conn,
            user=user,
            action="review_extraction",
            entity_type="var_report",
            entity_id=var_id,
            old_value={
                "extraction_review_status": row["extraction_review_status"],
                "extraction_reviewed_by": row["extraction_reviewed_by"],
                "extraction_reviewed_at": row["extraction_reviewed_at"],
                "extraction_review_note": row["extraction_review_note"],
            },
            new_value=new_value,
            metadata={"action": action},
        )
        conn.commit()

    return {"id": var_id, **new_value}


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
def unlink_var(
    var_id: str,
    confirm: bool = Query(False, description="Must be true to unlink"),
    user: SentryUser = Depends(require_admin),
) -> dict:
    """Unlink a VAR from its vendor after an explicit confirmation gate."""
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT vr.id, vr.vendor_id, vr.filename, v.company_name
            FROM var_reports vr
            LEFT JOIN vendors v ON v.id = vr.vendor_id
            WHERE vr.id = ?
            """,
            (var_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="VAR not found")

        if not confirm:
            return {
                "dry_run": True,
                "var_id": var_id,
                "filename": row["filename"],
                "current_vendor_id": row["vendor_id"] or "",
                "current_vendor_name": row["company_name"] or "",
                "message": "Add confirm=true to unlink this VAR from its vendor.",
            }

        old_value = {
            "vendor_id": row["vendor_id"] or "",
            "company_name": row["company_name"] or "",
            "filename": row["filename"] or "",
        }
        conn.execute(
            "UPDATE var_reports SET vendor_id='', match_method='unlinked' WHERE id=?",
            (var_id,),
        )
        log_mutation(
            conn=conn,
            user=user,
            action="unlink",
            entity_type="var_report",
            entity_id=var_id,
            old_value=old_value,
            new_value={"vendor_id": "", "match_method": "unlinked"},
            metadata={"confirm": True},
        )
        conn.commit()

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
