"""Analytics routes for frontend telemetry ingestion and lightweight summaries."""
from __future__ import annotations

import json
import uuid
from collections import defaultdict

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from database import get_connection

ROUTER = APIRouter(prefix="/api/analytics", tags=["analytics"])


class AnalyticsEventIn(BaseModel):
    event_name: str = Field(min_length=1, max_length=80)
    session_id: str = Field(min_length=8, max_length=80)
    occurred_at: str = Field(min_length=10, max_length=40)
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class AnalyticsBatchIn(BaseModel):
    events: list[AnalyticsEventIn] = Field(min_length=1, max_length=100)


@ROUTER.post("/events/batch")
def ingest_events(payload: AnalyticsBatchIn):
    """Ingest a batch of frontend analytics events."""
    rows = [
        (
            str(uuid.uuid4()),
            event.session_id,
            event.event_name,
            event.occurred_at,
            json.dumps(event.metadata, separators=(",", ":")),
        )
        for event in payload.events
    ]

    conn = get_connection()
    conn.executemany(
        """
        INSERT INTO ui_events (id, session_id, event_name, occurred_at, metadata_json)
        VALUES (?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()
    conn.close()

    return {"inserted": len(rows)}


@ROUTER.get("/summary")
def get_summary(days: int = Query(30, ge=1, le=365)):
    """Return dashboard-friendly telemetry summary for the requested day window."""
    conn = get_connection()

    total_events = conn.execute(
        """
        SELECT COUNT(*)
        FROM ui_events
        WHERE created_at >= datetime('now', ?)
        """,
        (f"-{days} days",),
    ).fetchone()[0]

    unique_sessions = conn.execute(
        """
        SELECT COUNT(DISTINCT session_id)
        FROM ui_events
        WHERE created_at >= datetime('now', ?)
        """,
        (f"-{days} days",),
    ).fetchone()[0]

    by_event_rows = conn.execute(
        """
        SELECT event_name, COUNT(*) AS cnt
        FROM ui_events
        WHERE created_at >= datetime('now', ?)
        GROUP BY event_name
        ORDER BY cnt DESC
        """,
        (f"-{days} days",),
    ).fetchall()

    daily_rows = conn.execute(
        """
        SELECT date(created_at) AS day, COUNT(*) AS cnt
        FROM ui_events
        WHERE created_at >= datetime('now', ?)
        GROUP BY date(created_at)
        ORDER BY day
        """,
        (f"-{days} days",),
    ).fetchall()

    view_rows = conn.execute(
        """
        SELECT metadata_json
        FROM ui_events
        WHERE created_at >= datetime('now', ?)
          AND event_name = 'view_changed'
        """,
        (f"-{days} days",),
    ).fetchall()

    conn.close()

    views_by_name: dict[str, int] = defaultdict(int)
    for row in view_rows:
        try:
            payload = json.loads(row["metadata_json"] or "{}")
            view = str(payload.get("view") or "unknown")
        except json.JSONDecodeError:
            view = "unknown"
        views_by_name[view] += 1

    return {
        "window_days": days,
        "kpis": {
            "total_events": total_events,
            "unique_sessions": unique_sessions,
            "avg_events_per_session": round(total_events / unique_sessions, 2) if unique_sessions else 0,
        },
        "event_breakdown": [{"event_name": r["event_name"], "count": r["cnt"]} for r in by_event_rows],
        "daily_activity": [{"day": r["day"], "count": r["cnt"]} for r in daily_rows],
        "top_views": [
            {"view": view, "count": count}
            for view, count in sorted(views_by_name.items(), key=lambda item: item[1], reverse=True)
        ],
    }
