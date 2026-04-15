"""Competitor event → SENTRY vendor/project correlation helpers.

Design goals:
- Deterministic and explainable matching (no opaque fuzzy certainty)
- On-demand enrichment (no stale hidden persisted state)
- Small, composable API for route serializers
"""
from __future__ import annotations

import re
import sqlite3
from dataclasses import dataclass
from typing import Iterable


def _normalize_name(value: str) -> str:
    """Normalize vendor/event text to lowercase alnum-only for safe comparison."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def _contains_phrase(haystack: str, needle: str) -> bool:
    """Case-insensitive whole phrase check with boundary guards."""
    if not haystack or not needle:
        return False
    pattern = rf"(?<![a-z0-9]){re.escape(needle.lower())}(?![a-z0-9])"
    return re.search(pattern, haystack.lower()) is not None


@dataclass
class VendorCandidate:
    vendor_id: str
    company_name: str
    norm_name: str


def _load_vendor_candidates(conn: sqlite3.Connection) -> list[VendorCandidate]:
    rows = conn.execute(
        "SELECT id, company_name FROM vendors WHERE COALESCE(company_name, '') != ''"
    ).fetchall()
    return [
        VendorCandidate(
            vendor_id=r["id"],
            company_name=r["company_name"],
            norm_name=_normalize_name(r["company_name"]),
        )
        for r in rows
        if r["id"] and r["company_name"]
    ]


def _build_walmart_actionability_context(correlation: dict) -> str:
    """Generate concise, explainable context for why this event matters to Walmart."""
    if correlation.get("correlation_status") == "MATCHED":
        vendor = correlation.get("matched_vendor_name") or "tracked vendor"
        count = int(correlation.get("linked_active_projects_count") or 0)
        confidence = (correlation.get("match_label") or "").replace("_", " ").title()
        if count > 0:
            return (
                f"Matched to tracked vendor {vendor} ({confidence}) with {count} active project link(s); "
                "review project owners for immediate exposure and mitigation planning."
            )
        return (
            f"Matched to tracked vendor {vendor} ({confidence}); no active project links found yet, "
            "but vendor watchlist and sourcing teams should validate current dependency posture."
        )

    if correlation.get("correlation_status") == "AMBIGUOUS":
        cands = correlation.get("candidate_vendor_names") or []
        if cands:
            return (
                "Potential tracked-vendor relevance detected, but ambiguous candidate matches "
                f"({', '.join(cands[:3])}); analyst verification is required before actioning."
            )
        return "Potential tracked-vendor relevance detected, but ambiguity requires analyst verification."

    return (
        "No deterministic tracked-vendor/project linkage identified yet; treat as market signal and "
        "monitor for emerging dependency overlap."
    )


def _load_active_project_map(conn: sqlite3.Connection) -> dict[str, list[dict]]:
    """Map vendor_id OR normalized vendor name → linked active projects."""
    rows = conn.execute(
        """
        SELECT
            pv.vendor_id,
            LOWER(COALESCE(pv.vendor_name, '')) AS vendor_name_key,
            pv.project_id,
            p.project_name,
            p.lifecycle_state,
            p.current_phase,
            p.est_phase_index,
            pv.status,
            pv.role
        FROM project_vendors pv
        JOIN projects p ON p.project_id = pv.project_id
        WHERE p.lifecycle_state NOT IN ('rejected', 'discontinued', 'completed', 'ended')
          AND COALESCE(pv.status, 'active') IN ('active', 'evaluating')
        """
    ).fetchall()

    by_key: dict[str, list[dict]] = {}
    for r in rows:
        item = {
            "project_id": r["project_id"],
            "project_name": r["project_name"],
            "lifecycle_state": r["lifecycle_state"],
            "current_phase": r["current_phase"],
            "est_phase_index": r["est_phase_index"],
            "vendor_link_status": r["status"],
            "vendor_role": r["role"] or "",
        }
        vid = (r["vendor_id"] or "").strip()
        if vid:
            by_key.setdefault(f"id:{vid}", []).append(item)

        vname = (r["vendor_name_key"] or "").strip()
        if vname:
            by_key.setdefault(f"name:{_normalize_name(vname)}", []).append(item)

    return by_key


def _correlate_event_to_vendor(
    row: dict,
    candidates: list[VendorCandidate],
    active_projects: dict[str, list[dict]],
) -> dict:
    """Return explainable correlation payload for one competitor event."""
    text_parts = [
        row.get("event_title") or "",
        row.get("detailed_description") or "",
        row.get("analyst_notes") or "",
        row.get("security_implication") or "",
        row.get("operational_impact") or "",
    ]
    corpus = " | ".join(text_parts)
    corpus_norm = _normalize_name(corpus)

    exact_hits = [c for c in candidates if _contains_phrase(corpus, c.company_name)]
    normalized_hits = [
        c for c in candidates
        if c not in exact_hits and len(c.norm_name) >= 4 and c.norm_name in corpus_norm
    ]

    if len(exact_hits) == 1:
        hit = exact_hits[0]
        linked = active_projects.get(f"id:{hit.vendor_id}") or active_projects.get(
            f"name:{hit.norm_name}",
            [],
        )
        return {
            "matched_vendor_id": hit.vendor_id,
            "matched_vendor_name": hit.company_name,
            "match_method": "exact_phrase",
            "match_label": "HIGH_CONFIDENCE",
            "match_confidence": 1.0,
            "match_explanation": f"Exact vendor name '{hit.company_name}' found in event text.",
            "linked_active_projects_count": len(linked),
            "linked_projects": linked[:5],
            "correlation_status": "MATCHED",
            "candidate_vendor_names": [],
        }

    if len(exact_hits) > 1:
        return {
            "matched_vendor_id": "",
            "matched_vendor_name": "",
            "match_method": "ambiguous_exact",
            "match_label": "REVIEW_REQUIRED",
            "match_confidence": 0.25,
            "match_explanation": "Multiple exact vendor-name hits found; analyst review required.",
            "linked_active_projects_count": 0,
            "linked_projects": [],
            "correlation_status": "AMBIGUOUS",
            "candidate_vendor_names": sorted({h.company_name for h in exact_hits})[:5],
        }

    if len(normalized_hits) == 1:
        hit = normalized_hits[0]
        linked = active_projects.get(f"id:{hit.vendor_id}") or active_projects.get(
            f"name:{hit.norm_name}",
            [],
        )
        return {
            "matched_vendor_id": hit.vendor_id,
            "matched_vendor_name": hit.company_name,
            "match_method": "normalized_contains",
            "match_label": "MEDIUM_CONFIDENCE",
            "match_confidence": 0.78,
            "match_explanation": (
                f"Normalized vendor token '{hit.norm_name}' matched event text; verify context before asserting ownership."
            ),
            "linked_active_projects_count": len(linked),
            "linked_projects": linked[:5],
            "correlation_status": "MATCHED",
            "candidate_vendor_names": [],
        }

    if len(normalized_hits) > 1:
        return {
            "matched_vendor_id": "",
            "matched_vendor_name": "",
            "match_method": "ambiguous_normalized",
            "match_label": "LOW_CONFIDENCE",
            "match_confidence": 0.2,
            "match_explanation": "Multiple normalized vendor matches detected; no automatic vendor assignment.",
            "linked_active_projects_count": 0,
            "linked_projects": [],
            "correlation_status": "AMBIGUOUS",
            "candidate_vendor_names": sorted({h.company_name for h in normalized_hits})[:5],
        }

    return {
        "matched_vendor_id": "",
        "matched_vendor_name": "",
        "match_method": "none",
        "match_label": "NO_MATCH",
        "match_confidence": 0.0,
        "match_explanation": "No deterministic tracked-vendor match found in event text.",
        "linked_active_projects_count": 0,
        "linked_projects": [],
        "correlation_status": "NO_MATCH",
        "candidate_vendor_names": [],
    }


def correlate_event_to_vendor(
    conn: sqlite3.Connection,
    event_row: sqlite3.Row | dict,
) -> dict:
    """Compatibility wrapper for one-off correlation calls."""
    row = dict(event_row)
    candidates = _load_vendor_candidates(conn)
    active_projects = _load_active_project_map(conn)
    correlation = _correlate_event_to_vendor(row, candidates, active_projects)
    correlation["walmart_actionability_context"] = _build_walmart_actionability_context(correlation)
    return correlation


def enrich_competitor_event_row(conn: sqlite3.Connection, row: sqlite3.Row | dict) -> dict:
    """Merge correlation payload into competitor event row dict."""
    base = dict(row)
    base.update(correlate_event_to_vendor(conn, row))
    return base


def enrich_competitor_event_rows(
    conn: sqlite3.Connection,
    rows: Iterable[sqlite3.Row | dict],
) -> list[dict]:
    """Batch-enrich rows efficiently with one vendor/project cache load."""
    candidates = _load_vendor_candidates(conn)
    active_projects = _load_active_project_map(conn)
    out: list[dict] = []
    for row in rows:
        base = dict(row)
        correlation = _correlate_event_to_vendor(base, candidates, active_projects)
        correlation["walmart_actionability_context"] = _build_walmart_actionability_context(correlation)
        base.update(correlation)
        out.append(base)
    return out
