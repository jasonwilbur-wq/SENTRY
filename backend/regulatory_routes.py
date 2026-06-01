"""SENTRY Regulatory Intelligence API.

Serves the pre-built regulatory-briefing.json and exposes
filterable endpoints for the frontend.

All routes under /api/regulatory.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

import trend_analytics as ta

ROUTER = APIRouter(prefix="/api/regulatory", tags=["regulatory"])
JSON_PATH = Path(__file__).parent / "data" / "json_reports" / "regulatory-briefing.json"


def _load() -> dict:
    if not JSON_PATH.exists():
        raise HTTPException(status_code=503, detail="Regulatory report not built yet. Run build_regulatory_report.py")
    return json.loads(JSON_PATH.read_text(encoding="utf-8"))


def _matches_scope(obligation: dict, scope: str) -> bool:
    geo_scope = obligation.get("geo_scope", "")
    if scope == "us":
        return geo_scope in {"US_STATE", "US_FEDERAL"}
    if scope == "global":
        return geo_scope in {"COUNTRY", "GLOBAL"}
    return True


def _aggregate_geo(obligations: list[dict], scope: str = "all") -> list[dict]:
    buckets: dict[str, dict] = {}
    for obligation in obligations:
        if not _matches_scope(obligation, scope):
            continue

        jurisdiction = obligation["jurisdiction"]
        bucket = buckets.setdefault(
            jurisdiction,
            {
                "jurisdiction": jurisdiction,
                "total": 0,
                "red": 0,
                "amber": 0,
                "yellow": 0,
                "green": 0,
                "techs": set(),
                "geo_scope": obligation.get("geo_scope", ""),
                "state": obligation.get("state"),
                "state_code": obligation.get("state_code"),
                "country": obligation.get("country"),
            },
        )

        bucket["total"] += 1
        rag_lower = obligation["risk"]["rag"].lower()
        if rag_lower in bucket:
            bucket[rag_lower] += 1
        bucket["techs"].add(obligation.get("tech_category", "Other"))

    rag_order = {"red": 0, "amber": 1, "yellow": 2, "green": 3}
    result: list[dict] = []

    for bucket in buckets.values():
        worst = "green"
        for rag in ("red", "amber", "yellow", "green"):
            if bucket[rag] > 0:
                worst = rag
                break

        result.append({
            "jurisdiction": bucket["jurisdiction"],
            "total": bucket["total"],
            "red": bucket["red"],
            "amber": bucket["amber"],
            "yellow": bucket["yellow"],
            "green": bucket["green"],
            "worst_rag": worst.capitalize(),
            "techs": sorted(bucket["techs"]),
            "geo_scope": bucket["geo_scope"],
            "state": bucket["state"],
            "state_code": bucket["state_code"],
            "country": bucket["country"],
        })

    result.sort(key=lambda x: (rag_order.get(x["worst_rag"].lower(), 9), -x["total"]))
    return result


def _parse_effective_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _period_counts(obligations: list[dict], frequency: str) -> list[dict]:
    counts: Counter[str] = Counter()
    for obligation in obligations:
        dt = _parse_effective_date(obligation.get("effective_date"))
        if not dt:
            continue
        if frequency == "monthly":
            key = dt.strftime("%Y-%m")
        elif frequency == "quarterly":
            key = f"{dt.year}-Q{((dt.month - 1) // 3) + 1}"
        else:
            key = dt.strftime("%Y-%m-%d")
        counts[key] += 1

    return [{"period": period, "count": count} for period, count in sorted(counts.items())]


@ROUTER.get("/summary")
def get_regulatory_summary() -> dict:
    """Top-level KPIs, stats, top actions, assumptions."""
    data = _load()
    return {
        "id":           data["id"],
        "title":        data["title"],
        "summary":      data["summary"],
        "created_at":   data["created_at"],
        "data_through": data.get("data_through", ""),
        "stats":        data["stats"],
        "top_actions":  data["top_actions"],
        "jurisdictions":data["jurisdictions"],
        "assumptions":  data["assumptions"],
        "confidence":   data["confidence"],
        "ingestion_notes": data.get("ingestion_notes", {}),
    }


@ROUTER.get("/obligations")
def get_obligations(
    rag:        str | None = Query(None, description="Filter by RAG band: Red|Amber|Yellow|Green"),
    tech:       str | None = Query(None, description="Filter by tech category"),
    status:     str | None = Query(None, description="Filter by status: Enacted|Proposed|Failed"),
    jurisdiction: str | None = Query(None),
    scope:      str = Query("all", pattern="^(all|us|global)$", description="Geo scope: all|us|global"),
    q:          str | None = Query(None, description="Free-text search in title/summary"),
    sort:       str = Query("risk", description="Sort by: risk|title|jurisdiction|deadline"),
    page:       int = Query(1, ge=1),
    page_size:  int = Query(25, ge=1, le=100),
) -> dict:
    """Paginated, filterable obligations list."""
    data  = _load()
    items = [o for o in data["obligations"] if _matches_scope(o, scope)]

    # filters
    if rag:
        items = [o for o in items if o["risk"]["rag"].lower() == rag.lower()]
    if tech:
        items = [o for o in items if o.get("tech_category", "").lower() == tech.lower()]
    if status:
        items = [o for o in items if o.get("status", "").lower() == status.lower()]
    if jurisdiction:
        items = [o for o in items if jurisdiction.lower() in o["jurisdiction"].lower()]
    if q:
        ql = q.lower()
        items = [o for o in items if ql in o["title"].lower() or ql in o.get("summary", "").lower()]

    # sort
    if sort == "risk":
        items = sorted(items, key=lambda o: o["risk"]["score"], reverse=True)
    elif sort == "title":
        items = sorted(items, key=lambda o: o["title"].lower())
    elif sort == "jurisdiction":
        items = sorted(items, key=lambda o: o["jurisdiction"].lower())
    elif sort == "deadline":
        items = sorted(items, key=lambda o: o.get("deadline") or "9999")

    total  = len(items)
    offset = (page - 1) * page_size
    page_items = items[offset: offset + page_size]

    return {
        "total":      total,
        "page":       page,
        "page_size":  page_size,
        "total_pages": -(-total // page_size),
        "obligations": page_items,
    }


@ROUTER.get("/obligations/{obligation_id}")
def get_obligation(obligation_id: str) -> dict:
    """Single obligation detail."""
    data  = _load()
    for o in data["obligations"]:
        if o["id"] == obligation_id:
            return o
    raise HTTPException(status_code=404, detail=f"Obligation {obligation_id!r} not found")


@ROUTER.get("/filters")
def get_filter_options() -> dict:
    """All distinct filter values (for dropdowns)."""
    data = _load()
    obs  = data["obligations"]
    return {
        "tech_categories":  sorted(set(o.get("tech_category", "Other") for o in obs)),
        "jurisdictions":    sorted(set(o["jurisdiction"] for o in obs)),
        "rag_bands":        ["Red", "Amber", "Yellow", "Green"],
        "statuses":         sorted(set(o.get("status", "") for o in obs if o.get("status"))),
        "evidence_statuses": sorted(set(o.get("evidence_status", "") for o in obs)),
    }


@ROUTER.get("/geo")
def get_geo_aggregation(
    scope: str = Query("all", pattern="^(all|us|global)$", description="Geo scope: all|us|global"),
) -> dict:
    """Jurisdiction-level aggregation for map markers.

    Supports scope filtering so frontend can cleanly toggle US/global views
    without performing client-side aggregation gymnastics.
    """
    data = _load()
    result = _aggregate_geo(data["obligations"], scope=scope)
    return {"jurisdictions": result, "total": len(result), "scope": scope}


@ROUTER.get("/insights")
def get_regulatory_insights(
    scope: str = Query("all", pattern="^(all|us|global)$", description="Geo scope: all|us|global"),
) -> dict:
    """Executive insights payload for top and bottom dashboard callouts."""
    data = _load()
    obligations = [o for o in data["obligations"] if _matches_scope(o, scope)]

    if not obligations:
        return {
            "scope": scope,
            "summary": "No obligations available for selected scope.",
            "total_obligations": 0,
            "red_amber_total": 0,
            "top_hotspots": [],
            "top_tech": [],
            "status_breakdown": {},
            "daily_breakdown": [],
            "monthly_breakdown": [],
            "quarterly_breakdown": [],
            "executive_top": [],
            "executive_bottom": [],
        }

    geo_rollup = _aggregate_geo(obligations, scope="all")
    top_hotspots = geo_rollup[:5]

    tech_counts = Counter(o.get("tech_category", "Other") for o in obligations)
    top_tech = [{"tech": tech, "count": count} for tech, count in tech_counts.most_common(6)]

    status_counts = Counter(o.get("status", "Unknown") for o in obligations)
    rag_counts = Counter(o["risk"]["rag"] for o in obligations)
    red_amber_total = rag_counts.get("Red", 0) + rag_counts.get("Amber", 0)

    hotspot_label = top_hotspots[0]["jurisdiction"] if top_hotspots else "N/A"
    hotspot_share = round((top_hotspots[0]["total"] / len(obligations)) * 100, 1) if top_hotspots else 0

    executive_top = [
        f"{len(obligations)} obligations in scope with {red_amber_total} Red/Amber items requiring immediate review.",
        f"Top hotspot: {hotspot_label} represents {hotspot_share}% of in-scope obligations.",
        f"Highest-volume technology area: {top_tech[0]['tech']} ({top_tech[0]['count']} obligations)." if top_tech else "No technology concentration detected.",
    ]

    executive_bottom = [
        "Prioritize Red and Amber obligations for legal + security control validation this sprint.",
        "Focus evidence collection on enacted obligations first, then proposed obligations with high risk scores.",
        "Use monthly and quarterly trend lines to plan staffing and control-audit cadence.",
    ]

    scope_label = "US + Federal" if scope == "us" else "Global/International" if scope == "global" else "All jurisdictions"

    return {
        "scope": scope,
        "summary": f"{scope_label}: {len(obligations)} obligations analyzed across geographies and technologies.",
        "total_obligations": len(obligations),
        "red_amber_total": red_amber_total,
        "top_hotspots": top_hotspots,
        "top_tech": top_tech,
        "status_breakdown": dict(status_counts),
        "daily_breakdown": _period_counts(obligations, frequency="daily"),
        "monthly_breakdown": _period_counts(obligations, frequency="monthly"),
        "quarterly_breakdown": _period_counts(obligations, frequency="quarterly"),
        "executive_top": executive_top,
        "executive_bottom": executive_bottom,
    }


@ROUTER.get("/download")
def download_full_report() -> dict:
    """Return the full report JSON (for client-side download)."""
    return _load()


@ROUTER.get("/trends")
def get_regulatory_trends(
    scope: str = Query("all", pattern="^(all|us|global)$"),
    frequency: str = Query("monthly", pattern="^(monthly|quarterly|daily)$"),
) -> dict:
    """RAG-weighted regulatory trend analytics: deltas, momentum, anomalies, movers.

    Weighting: Red=4, Amber=3, Yellow=2, Green=1 (volume != risk).
    Category for top-movers = tech_category. Dated by effective_date.
    """
    data = _load()
    obligations = [o for o in data["obligations"] if _matches_scope(o, scope)]

    events = [
        {
            "date": o.get("effective_date"),
            "weight": ta.RAG_WEIGHTS.get(o["risk"]["rag"], 1.0),
            "category": o.get("tech_category", "Other"),
        }
        for o in obligations
    ]
    payload = ta.analyze(events, frequency=frequency, recent=24 if frequency == "monthly" else 8)
    payload["domain"] = "regulatory"
    payload["scope"] = scope
    payload["weighting"] = "RAG (Red=4, Amber=3, Yellow=2, Green=1)"
    return payload
