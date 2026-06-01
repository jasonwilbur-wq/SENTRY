"""Public VAR report read/download API routes.

Separated from vendor_routes.py to keep route modules focused and below the
monolith threshold while preserving existing /api/var* endpoints.
"""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse, StreamingResponse

from database import get_connection
from models import VarReportOut, VarReportsResponse

try:
    from sharepoint_auth import get_token, download_url_for_item
except ImportError:
    get_token = lambda: None
    download_url_for_item = lambda x: ""


ROUTER = APIRouter(tags=["var-reports"])


@ROUTER.get("/api/var-reports", response_model=VarReportsResponse)
def list_all_var_reports():
    """Return all VAR reports across all vendors."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT vr.*, v.company_name FROM var_reports vr "
            "JOIN vendors v ON vr.vendor_id = v.id "
            "ORDER BY vr.report_date DESC"
        ).fetchall()
    finally:
        conn.close()
    reports = [
        VarReportOut(**{k: v for k, v in dict(r).items() if k != 'company_name'})
        for r in rows
    ]
    return VarReportsResponse(total=len(reports), reports=reports)


# ── VAR Report Download Proxy ─────────────────────────────────────────

@ROUTER.get("/api/vars/download/{var_id}")
async def download_var_report(var_id: str):
    """Proxy-download a VAR .docx from SharePoint via Graph API.

    Flow:
      1. Look up item_id + sharepoint_url from var_reports.
      2. Try Graph API with cached MSAL token.
      3. Fall back to SharePoint web redirect if Graph fails.
    """
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT filename, sharepoint_url, item_id FROM var_reports WHERE id = ?",
            (var_id,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
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

    raise HTTPException(status_code=503, detail="Download unavailable — token expired")
