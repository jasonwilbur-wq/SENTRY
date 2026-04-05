"""SENTRY Regulatory Intelligence API.

Serves the pre-built regulatory-briefing.json and exposes
filterable endpoints for the frontend.

All routes under /api/regulatory.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

ROUTER = APIRouter(prefix="/api/regulatory", tags=["regulatory"])
JSON_PATH = Path(__file__).parent / "data" / "json_reports" / "regulatory-briefing.json"


def _load() -> dict:
    if not JSON_PATH.exists():
        raise HTTPException(status_code=503, detail="Regulatory report not built yet. Run build_regulatory_report.py")
    return json.loads(JSON_PATH.read_text(encoding="utf-8"))


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
    q:          str | None = Query(None, description="Free-text search in title/summary"),
    sort:       str = Query("risk", description="Sort by: risk|title|jurisdiction|deadline"),
    page:       int = Query(1, ge=1),
    page_size:  int = Query(25, ge=1, le=100),
) -> dict:
    """Paginated, filterable obligations list."""
    data  = _load()
    items = data["obligations"]

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
def get_geo_aggregation() -> dict:
    """Jurisdiction-level aggregation for the 3D globe.

    Returns per-jurisdiction RAG breakdown, total count, and worst RAG.
    The frontend maps jurisdiction names to lat/lon coordinates.
    """
    data = _load()
    buckets: dict[str, dict] = {}
    for o in data["obligations"]:
        j = o["jurisdiction"]
        b = buckets.setdefault(j, {"jurisdiction": j, "total": 0,
                                    "red": 0, "amber": 0, "yellow": 0, "green": 0,
                                    "techs": set()})
        b["total"] += 1
        rag_lower = o["risk"]["rag"].lower()
        if rag_lower in b:
            b[rag_lower] += 1
        b["techs"].add(o.get("tech_category", "Other"))

    RAG_ORDER = {"red": 0, "amber": 1, "yellow": 2, "green": 3}

    result = []
    for b in buckets.values():
        # Determine worst RAG
        worst = "green"
        for rag in ("red", "amber", "yellow", "green"):
            if b[rag] > 0:
                worst = rag
                break
        result.append({
            "jurisdiction": b["jurisdiction"],
            "total": b["total"],
            "red": b["red"], "amber": b["amber"],
            "yellow": b["yellow"], "green": b["green"],
            "worst_rag": worst.capitalize(),
            "techs": sorted(b["techs"]),
        })

    result.sort(key=lambda x: (RAG_ORDER.get(x["worst_rag"].lower(), 9), -x["total"]))
    return {"jurisdictions": result, "total": len(result)}


@ROUTER.get("/download")
def download_full_report() -> dict:
    """Return the full report JSON (for client-side download)."""
    return _load()
