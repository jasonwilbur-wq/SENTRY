"""Cross-domain intelligence digest for the Home Dashboard.

Answers the CSO's morning question -- "what do I need to know?" -- by merging
the four intelligence domains (incidents, competitor events, regulatory,
executive signals) into:
  1. since-window deltas per domain (counts + headlines)
  2. a single ranked "needs your attention" feed across all domains

Read-only. Safe to call often.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Query

from database import get_connection

ROUTER = APIRouter(prefix="/api/intel", tags=["intel"])

# Severity weighting so cross-domain items can be ranked on one scale.
_SEV_WEIGHT = {"critical": 100, "high": 70, "medium": 40, "low": 15, "": 25}
_PRIORITY_WEIGHT = {"cso": 100, "leadership": 70, "analyst": 40, "": 25}


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def _iso_cutoff(days: int) -> str:
    return (datetime.utcnow() - timedelta(days=days)).date().isoformat()


@ROUTER.get("/digest")
def intel_digest(window_days: int = Query(7, ge=1, le=90), top: int = Query(8, ge=1, le=25)):
    """Cross-domain digest: per-domain deltas + one ranked attention feed."""
    conn = get_connection()
    cutoff = _iso_cutoff(window_days)
    attention: list[dict] = []

    # ---- Incidents -------------------------------------------------------
    inc_total = conn.execute(
        "SELECT COUNT(*) FROM incidents WHERE incident_date >= ?", (cutoff,),
    ).fetchone()[0]
    inc_rows = conn.execute(
        """
        SELECT id, incident_date, incident_type, severity, location, summary,
               recommended_action
        FROM incidents
        WHERE incident_date >= ?
        ORDER BY incident_date DESC LIMIT 50
        """,
        (cutoff,),
    ).fetchall()
    inc_headlines = [
        {"title": r["summary"] or r["incident_type"] or "Incident",
         "date": r["incident_date"], "severity": r["severity"] or "Medium"}
        for r in inc_rows[:3]
    ]
    for r in inc_rows:
        attention.append({
            "domain": "Incident",
            "title": r["summary"] or r["incident_type"] or "Incident",
            "date": r["incident_date"],
            "severity": r["severity"] or "Medium",
            "why": r["recommended_action"] or "Review incident impact and exposure.",
            "context": r["location"] or "",
            "view": "INCIDENT_INTELLIGENCE",
            "rank_score": _SEV_WEIGHT.get(_norm(r["severity"]), 25),
        })

    # ---- Competitor events ----------------------------------------------
    comp_total = conn.execute(
        "SELECT COUNT(*) FROM competitor_events WHERE event_date >= ? AND deleted_at IS NULL",
        (cutoff,),
    ).fetchone()[0]
    comp_rows = conn.execute(
        """
        SELECT id, event_date, competitor, event_title, event_type, category,
               security_implication, priority_tier
        FROM competitor_events
        WHERE event_date >= ? AND deleted_at IS NULL
        ORDER BY event_date DESC LIMIT 50
        """,
        (cutoff,),
    ).fetchall()
    comp_headlines = [
        {"title": f"{r['competitor']}: {r['event_title']}",
         "date": r["event_date"], "type": r["event_type"]}
        for r in comp_rows[:3]
    ]
    for r in comp_rows:
        attention.append({
            "domain": "Competitor",
            "title": f"{r['competitor']}: {r['event_title']}",
            "date": r["event_date"],
            "severity": (r["priority_tier"] or "").upper(),
            "why": r["security_implication"] or "Assess competitive/security implication for Walmart.",
            "context": r["category"] or r["event_type"] or "",
            "view": "COMPETITOR_INTEL",
            "rank_score": _PRIORITY_WEIGHT.get(_norm(r["priority_tier"]), 25),
        })
    # DOMAINS_BELOW
    conn.close()

    # ---- Regulatory (summary only; no per-row dates available here) -------
    reg_red = reg_amber = 0
    try:
        from regulatory_routes import get_regulatory_summary
        stats = get_regulatory_summary().get("stats", {})
        reg_red = int(stats.get("red", 0))
        reg_amber = int(stats.get("amber", 0))
    except Exception:
        pass

    attention.sort(key=lambda x: x["rank_score"], reverse=True)
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "window_days": window_days,
        "deltas": {
            "incidents": {"count": inc_total, "headlines": inc_headlines},
            "competitor": {"count": comp_total, "headlines": comp_headlines},
            "regulatory": {"red": reg_red, "amber": reg_amber},
        },
        "attention": attention[:top],
    }
