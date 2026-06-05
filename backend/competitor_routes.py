"""Public Competitor Intelligence API routes.

This module owns read-only /api/competitors/* endpoints. Keeping these routes
out of main.py reduces route ownership drift while preserving public endpoint
paths and response shapes for the frontend.
"""
from __future__ import annotations

import math
from typing import Any

from fastapi import APIRouter, Query

from cache import ttl_cache
from competitor_correlation import enrich_competitor_event_rows
from competitor_locations import build_competitor_location_summary
from database import get_connection


ROUTER = APIRouter(prefix="/api/competitors", tags=["competitors"])

MONTH_LABELS = {
    month: index
    for index, month in enumerate(
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        start=1,
    )
}

HEAT_CATS = [
    "Cyber", "ORC/Theft", "Recall", "Legal", "Strategic",
    "Operational", "Compliance", "Fraud", "Technology", "Other",
]


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
    return sorted([row[0] for row in rows], key=_competitor_month_sort_key)


@ROUTER.get("/stats")
def competitor_stats():
    """KPI totals across all competitor events (cached 2 min)."""
    return _cached_competitor_stats()


@ttl_cache(ttl_seconds=120, key_prefix="competitor_stats")
def _cached_competitor_stats():
    conn = get_connection()
    try:
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
        competitor_count = conn.execute(
            "SELECT COUNT(*) FROM competitor_entities WHERE event_count >= 3"
        ).fetchone()[0]
    finally:
        conn.close()

    payload = dict(row)
    payload["competitor_count"] = competitor_count
    return payload


@ROUTER.get("/entities")
def competitor_entities(
    limit: int = Query(20, ge=1, le=135),
    min_events: int = Query(3, ge=0),
):
    """Return ranked competitor entities for card grid + orbital scene."""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT name, event_count, cyber_count, orc_count, recall_count,
                   legal_count, strategic_count, threat_level, top_category,
                   categories_json, monthly_json
            FROM competitor_entities
            WHERE event_count >= ?
            ORDER BY event_count DESC
            LIMIT ?
        """, (min_events, limit)).fetchall()
    finally:
        conn.close()
    return {"entities": [dict(row) for row in rows]}


@ROUTER.get("/monthly")
def competitor_monthly(top: int = Query(5, ge=1, le=10)):
    """Monthly event counts for the top-N competitors."""
    conn = get_connection()
    try:
        top_names = [
            row[0] for row in conn.execute(
                "SELECT name FROM competitor_entities "
                "WHERE event_count >= 3 ORDER BY event_count DESC LIMIT ?",
                (top,),
            ).fetchall()
        ]
        months = _competitor_months(conn)
        result: dict[str, list[int]] = {}
        for name in top_names:
            monthly = []
            for month in months:
                count = conn.execute(
                    "SELECT COUNT(*) FROM competitor_events "
                    "WHERE competitor=? AND source_month LIKE ?",
                    (name, f"%{month}%"),
                ).fetchone()[0]
                monthly.append(count)
            result[name] = monthly
    finally:
        conn.close()
    return {"months": months, "series": result}


@ROUTER.get("/heatmap")
def competitor_heatmap(top: int = Query(10, ge=1, le=20)):
    """Competitor × category event-count matrix (cached 2 min)."""
    return _cached_heatmap(top)


@ttl_cache(ttl_seconds=120, key_prefix="competitor_heatmap")
def _cached_heatmap(top: int):
    conn = get_connection()
    try:
        top_names = [
            row[0] for row in conn.execute(
                "SELECT name FROM competitor_entities "
                "WHERE event_count >= 3 ORDER BY event_count DESC LIMIT ?",
                (top,),
            ).fetchall()
        ]
        matrix = []
        for name in top_names:
            row_counts = []
            for category in HEAT_CATS:
                count = conn.execute(
                    "SELECT COUNT(*) FROM competitor_events "
                    "WHERE competitor=? AND category=?",
                    (name, category),
                ).fetchone()[0]
                row_counts.append(count)
            matrix.append(row_counts)
    finally:
        conn.close()
    return {"competitors": top_names, "categories": HEAT_CATS, "matrix": matrix}


@ROUTER.get("/locations")
def competitor_locations():
    """Return competitor location counts from workspace CSV files."""
    return build_competitor_location_summary()


@ROUTER.get("/events")
def competitor_events(
    competitor: str | None = Query(None),
    category: str | None = Query(None),
    month: str | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    """Paginated, filterable competitor events feed."""
    conn = get_connection()
    try:
        clauses: list[str] = []
        params: list[Any] = []
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
            f"SELECT * FROM competitor_events {where} "
            f"ORDER BY event_date DESC LIMIT ? OFFSET ?",
            params + [page_size, offset],
        ).fetchall()
        events = enrich_competitor_event_rows(conn, rows)
    finally:
        conn.close()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
        "events": events,
    }


@ROUTER.get("/cso-candidates")
def competitor_cso_candidates(limit: int = Query(20, ge=1, le=100)):
    """Return high-priority competitor events with vendor/project correlation."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM competitor_events
             WHERE deleted_at IS NULL
               AND (
                 priority_tier = 'CSO Brief'
                 OR COALESCE(escalate_to_cso, 0) = 1
                 OR priority_tier = 'Analyst Follow-up'
                 OR COALESCE(walmart_relevance_score, 0) >= 55
               )
             ORDER BY
               COALESCE(escalate_to_cso, 0) DESC,
               CASE priority_tier
                 WHEN 'CSO Brief' THEN 0
                 WHEN 'Analyst Follow-up' THEN 1
                 ELSE 2
               END,
               COALESCE(walmart_relevance_score, 0) DESC,
               event_date DESC
             LIMIT ?
            """,
            (limit,),
        ).fetchall()
        events = enrich_competitor_event_rows(conn, rows)
    finally:
        conn.close()
    return {"count": len(events), "events": events}


@ROUTER.get("/categories")
def competitor_categories():
    """Distinct categories used across all events."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT DISTINCT category FROM competitor_events "
            "WHERE category IS NOT NULL ORDER BY category"
        ).fetchall()
    finally:
        conn.close()
    return {"categories": [row[0] for row in rows]}
