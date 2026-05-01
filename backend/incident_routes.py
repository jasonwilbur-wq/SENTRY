"""SENTRY Incident Intelligence API.

Serves retail incident data from the incidents table.
All routes under /api/incidents.
"""
from __future__ import annotations

from fastapi import APIRouter, Query

from database import get_connection

ROUTER = APIRouter(prefix="/api/incidents", tags=["incidents"])


# ── Helpers ────────────────────────────────────────────────────────────

def _row_to_dict(row) -> dict:
    return dict(zip(row.keys(), tuple(row)))


# ── Stats endpoint ─────────────────────────────────────────────────────

@ROUTER.get("/stats")
def get_incident_stats() -> dict:
    """KPI summary: totals, by severity, by type, by region, monthly trend."""
    conn = get_connection()

    total = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    if total == 0:
        return {"total": 0, "by_severity": {}, "by_type": [], "by_region": {}, "monthly_trend": []}

    by_severity = {}
    for row in conn.execute(
        "SELECT severity, COUNT(*) as cnt FROM incidents GROUP BY severity ORDER BY cnt DESC"
    ):
        by_severity[row["severity"]] = row["cnt"]

    by_type = [
        {"type": r["incident_type"], "count": r["cnt"]}
        for r in conn.execute(
            "SELECT incident_type, COUNT(*) as cnt FROM incidents "
            "GROUP BY incident_type ORDER BY cnt DESC LIMIT 15"
        )
    ]

    by_region = {}
    for row in conn.execute(
        "SELECT region, COUNT(*) as cnt FROM incidents GROUP BY region ORDER BY cnt DESC"
    ):
        by_region[row["region"]] = row["cnt"]

    # Monthly trend — last 12 months
    monthly_trend = [
        {"month": r["month"], "count": r["cnt"]}
        for r in conn.execute(
            """
            SELECT strftime('%Y-%m', incident_date) as month,
                   COUNT(*) as cnt
            FROM   incidents
            WHERE  incident_date != ''
            GROUP  BY month
            ORDER  BY month DESC
            LIMIT  12
            """
        )
    ]
    monthly_trend.reverse()

    # Recent — last 7 days (approximate: last 10 records with dates)
    recent = [
        _row_to_dict(r)
        for r in conn.execute(
            """
            SELECT id, incident_date, incident_type, severity, location, summary
            FROM   incidents
            WHERE  incident_date != ''
            ORDER  BY incident_date DESC
            LIMIT  5
            """
        )
    ]

    conn.close()
    return {
        "total":         total,
        "by_severity":   by_severity,
        "by_type":        by_type,
        "by_region":     by_region,
        "monthly_trend": monthly_trend,
        "recent":        recent,
    }


# ── List endpoint ────────────────────────────────────────────────────────

@ROUTER.get("")
def list_incidents(
    severity:      str | None = Query(None),
    incident_type: str | None = Query(None, alias="type"),
    region:        str | None = Query(None),
    q:             str | None = Query(None, description="Free-text search"),
    date_from:     str | None = Query(None),
    date_to:       str | None = Query(None),
    sort:          str        = Query("date", description="date|severity|type"),
    page:          int        = Query(1, ge=1),
    page_size:     int        = Query(25, ge=1, le=100),
) -> dict:
    """Paginated, filterable incident list."""
    conn   = get_connection()
    where  = ["1=1"]
    params: list = []

    if severity:
        where.append("severity = ?")
        params.append(severity)
    if incident_type:
        where.append("incident_type = ?")
        params.append(incident_type)
    if region:
        where.append("region = ?")
        params.append(region)
    if date_from:
        where.append("incident_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("incident_date <= ?")
        params.append(date_to)
    if q:
        where.append("(summary LIKE ? OR incident_type LIKE ? OR location LIKE ?)")
        params.extend([f"%{q}%"] * 3)

    base_sql = f"FROM incidents WHERE {' AND '.join(where)}"
    total    = conn.execute(f"SELECT COUNT(*) {base_sql}", params).fetchone()[0]

    order = {
        "date":     "incident_date DESC, created_at DESC",
        "severity": "CASE severity WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END",
        "type":     "incident_type ASC",
    }.get(sort, "incident_date DESC")

    offset = (page - 1) * page_size
    rows   = conn.execute(
        f"SELECT * {base_sql} ORDER BY {order} LIMIT ? OFFSET ?",
        params + [page_size, offset],
    ).fetchall()

    conn.close()
    return {
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": -(-total // page_size),
        "incidents":   [_row_to_dict(r) for r in rows],
    }


# ── Filter options ───────────────────────────────────────────────────────

@ROUTER.get("/filters")
def get_incident_filters() -> dict:
    conn = get_connection()
    types   = [r[0] for r in conn.execute("SELECT DISTINCT incident_type FROM incidents ORDER BY incident_type")]
    regions = [r[0] for r in conn.execute("SELECT DISTINCT region FROM incidents ORDER BY region")]
    conn.close()
    return {
        "severities": ["Critical", "High", "Medium", "Low"],
        "types":      types,
        "regions":    regions,
    }


# ── Morning brief contribution ─────────────────────────────────────────────

@ROUTER.get("/recent")
def get_recent_incidents(limit: int = Query(5, ge=1, le=20)) -> dict:
    """Most recent incidents by date — used by the Morning Brief."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, incident_date, incident_type, severity, location, summary, impact
        FROM   incidents
        WHERE  incident_date != ''
        ORDER  BY incident_date DESC
        LIMIT  ?
        """,
        [limit],
    ).fetchall()
    conn.close()
    return {"incidents": [_row_to_dict(r) for r in rows]}
