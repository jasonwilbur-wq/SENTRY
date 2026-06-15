"""SENTRY Unified Intel Timeline API (Backbone Feature #1).

Read-only. Serves the cross-source signal timeline from the additive
`intel_signals` table / `v_intel_timeline` view (populated by
apply_sentry_backbone.py from competitor_events + incidents, extensible to
changedetection alerts later).

All routes under /api/intel-timeline. Purely additive: this module reads only.
Rollback = remove its include from main.py and delete this file (the DB objects
roll back separately via DROP VIEW/TABLE).
"""
from __future__ import annotations

from fastapi import APIRouter, Query

from database import get_connection

ROUTER = APIRouter(prefix="/api/intel-timeline", tags=["intel-timeline"])


def _row_to_dict(row) -> dict:
    return dict(zip(row.keys(), tuple(row)))


def _table_exists(conn, name: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?",
        (name,),
    ).fetchone() is not None


# ── Stats ──────────────────────────────────────────────────────────────

@ROUTER.get("/stats")
def get_timeline_stats() -> dict:
    """KPI summary: totals, by source, by entity type, monthly trend."""
    conn = get_connection()
    if not _table_exists(conn, "intel_signals"):
        conn.close()
        return {"enabled": False, "total": 0, "by_source": {}, "by_entity_type": {}, "monthly_trend": []}

    total = conn.execute("SELECT COUNT(*) FROM intel_signals").fetchone()[0]
    by_source = {
        r["source_system"]: r["cnt"]
        for r in conn.execute(
            "SELECT source_system, COUNT(*) cnt FROM intel_signals GROUP BY source_system ORDER BY cnt DESC"
        )
    }
    by_entity_type = {
        (r["entity_type"] or "unknown"): r["cnt"]
        for r in conn.execute(
            "SELECT entity_type, COUNT(*) cnt FROM intel_signals GROUP BY entity_type ORDER BY cnt DESC"
        )
    }
    monthly_trend = [
        {"month": r["month"], "count": r["cnt"]}
        for r in conn.execute(
            """
            SELECT strftime('%Y-%m', signal_date) AS month, COUNT(*) cnt
            FROM   intel_signals
            WHERE  signal_date IS NOT NULL AND signal_date != ''
            GROUP  BY month ORDER BY month DESC LIMIT 12
            """
        )
    ]
    monthly_trend.reverse()
    conn.close()
    return {
        "enabled": True,
        "total": total,
        "by_source": by_source,
        "by_entity_type": by_entity_type,
        "monthly_trend": monthly_trend,
    }


# ── List ───────────────────────────────────────────────────────────────

@ROUTER.get("")
def list_signals(
    source_system: str | None = Query(None, description="competitor_events|incidents|changedetection|manual"),
    entity_type:   str | None = Query(None),
    vendor_id:     str | None = Query(None),
    q:             str | None = Query(None, description="Free-text search"),
    date_from:     str | None = Query(None),
    date_to:       str | None = Query(None),
    page:          int        = Query(1, ge=1),
    page_size:     int        = Query(25, ge=1, le=100),
) -> dict:
    """Paginated, filterable cross-source signal timeline (newest first)."""
    conn = get_connection()
    if not _table_exists(conn, "intel_signals"):
        conn.close()
        return {"enabled": False, "total": 0, "page": page, "page_size": page_size,
                "total_pages": 0, "signals": []}

    where: list[str] = ["1=1"]
    params: list = []
    if source_system:
        where.append("source_system = ?"); params.append(source_system)
    if entity_type:
        where.append("entity_type = ?"); params.append(entity_type)
    if vendor_id:
        where.append("matched_vendor_id = ?"); params.append(vendor_id)
    if date_from:
        where.append("signal_date >= ?"); params.append(date_from)
    if date_to:
        where.append("signal_date <= ?"); params.append(date_to)
    if q:
        where.append("(title LIKE ? OR summary LIKE ? OR entity_name LIKE ?)")
        params.extend([f"%{q}%"] * 3)

    src = "v_intel_timeline" if _table_exists(conn, "v_intel_timeline") else "intel_signals"
    base = f"FROM {src} WHERE {' AND '.join(where)}"
    total = conn.execute(f"SELECT COUNT(*) {base}", params).fetchone()[0]
    offset = (page - 1) * page_size
    rows = conn.execute(
        f"SELECT * {base} ORDER BY signal_date DESC, ingested_at DESC LIMIT ? OFFSET ?",
        params + [page_size, offset],
    ).fetchall()
    conn.close()
    return {
        "enabled": True,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": -(-total // page_size),
        "signals": [_row_to_dict(r) for r in rows],
    }


# ── Filter options ─────────────────────────────────────────────────────

@ROUTER.get("/filters")
def get_timeline_filters() -> dict:
    conn = get_connection()
    if not _table_exists(conn, "intel_signals"):
        conn.close()
        return {"enabled": False, "sources": [], "entity_types": []}
    sources = [r[0] for r in conn.execute(
        "SELECT DISTINCT source_system FROM intel_signals WHERE source_system IS NOT NULL ORDER BY 1")]
    entity_types = [r[0] for r in conn.execute(
        "SELECT DISTINCT entity_type FROM intel_signals WHERE entity_type IS NOT NULL ORDER BY 1")]
    conn.close()
    return {"enabled": True, "sources": sources, "entity_types": entity_types}
