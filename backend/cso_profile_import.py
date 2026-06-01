"""Governed importer: Executive Signal Scout handoff bundle -> CSO profile store.

This is the ONLY write path from the scout into the live executive-intel data.
It is deliberately strict:

  - Accepts only bundles whose handoff_status is FINALIZED_FOR_SENTRY_PROGRAM_HANDOFF.
  - Maps scout signals into the frontend ExecutiveProfile.keyFindings shape.
  - Every imported finding carries its citations as sources (provenance preserved).
  - New/updated profiles are tagged source='scout' so the UI verification badge
    and freshness logic treat them honestly.

The bundle builder (executive_intel/handoff.py) already filters to verified +
analyst-approved signals, so this importer trusts that gate but re-checks the
finalized status defensively.
"""
from __future__ import annotations

import copy
from typing import Any

from cso_profile_store import get_profile, upsert_profile

FINALIZED_STATUS = "FINALIZED_FOR_SENTRY_PROGRAM_HANDOFF"

# Map scout SignalCategory -> frontend Finding.type
_CATEGORY_TO_TYPE = {
    "PUBLIC_APPEARANCE": "thought_leadership",
    "PUBLIC_QUOTE": "thought_leadership",
    "INITIATIVE": "decision",
    "MAJOR_DECISION": "decision",
    "ORG_CHANGE": "org_change",
    "PARTNERSHIP": "partnership",
    "RISK_OR_INCIDENT_CONTEXT": "incident_response",
}

# Map scout confidence/source-quality -> finding riskColor (visual severity).
_QUALITY_TO_RISK = {
    "HIGH_PRIMARY_SOURCE": "ORANGE",
    "MEDIUM_REPUTABLE_SECONDARY": "YELLOW",
    "LOW_SINGLE_SOURCE": "YELLOW",
    "REVIEW_REQUIRED": "GREEN",
}


class ImportError_(ValueError):
    """Raised when a handoff bundle cannot be imported safely."""


def _signal_to_finding(sig: dict[str, Any]) -> dict[str, Any]:
    sources = [
        {
            "publisher": c.get("publisher") or c.get("source_title") or "Unknown",
            "url": c.get("url", ""),
            "date": c.get("published_date", ""),
        }
        for c in sig.get("citations", [])
    ]
    return {
        "id": sig["signal_id"],
        "type": _CATEGORY_TO_TYPE.get(sig.get("category", ""), "decision"),
        "headline": sig.get("title", ""),
        "date": sig.get("event_date", "") if sig.get("event_date") != "UNKNOWN" else "",
        "impactScore": 7,
        "riskColor": _QUALITY_TO_RISK.get(sig.get("confidence_level", ""), "GREEN"),
        "summary": sig.get("summary", ""),
        "whyItMatters": sig.get("walmart_cso_relevance", ""),
        "sources": sources,
    }


def _bundle_to_profile(bundle: dict[str, Any]) -> dict[str, Any]:
    """Build/merge an ExecutiveProfile payload from a finalized bundle."""
    prof = bundle.get("profile", {})
    profile_id = bundle.get("profile_id") or prof.get("profile_id")
    if not profile_id:
        raise ImportError_("bundle missing profile_id")

    new_findings = [_signal_to_finding(s) for s in bundle.get("signals", [])]

    existing = get_profile(profile_id)
    if existing:
        # Merge onto a COPY so callers can still read the pre-merge state for
        # accurate "findings added" accounting (no in-place mutation).
        merged_profile = copy.deepcopy(existing)
        seen = {f["id"] for f in merged_profile.get("keyFindings", [])}
        merged_profile["keyFindings"] = merged_profile.get("keyFindings", []) + [
            f for f in new_findings if f["id"] not in seen
        ]
        return merged_profile

    # Brand-new profile from the scout — provisional by construction.
    return {
        "id": profile_id,
        "name": prof.get("full_name", profile_id),
        "title": (prof.get("title") or "Security Leader") + " (Unverified)",
        "company": prof.get("organization", "Unknown"),
        "threatLevel": "MEDIUM",
        "profileImage": "",
        "bio": prof.get("collection_notes", "Imported from Executive Signal Scout handoff."),
        "keyFindings": new_findings,
        "recentActivity": [],
        "strategicThreats": [
            "\u26a0\ufe0f Imported from scout handoff \u2014 confirm incumbency before acting",
        ],
        "recommendations": [
            "\ud83d\udd25 Verify via first-party/official sources before elevating confidence",
        ],
    }


def import_handoff_bundle(
    bundle: dict[str, Any], *, updated_by: str, allow_unfinalized: bool = False
) -> dict[str, Any]:
    """Import a scout handoff bundle into the CSO profile store.

    Returns a summary dict. Raises ImportError_ on governance violations.
    """
    status = bundle.get("handoff_status")
    if not allow_unfinalized and status != FINALIZED_STATUS:
        raise ImportError_(
            f"refusing import: handoff_status is {status!r}, expected {FINALIZED_STATUS!r}"
        )

    signals = bundle.get("signals", [])
    if not signals:
        return {
            "imported": False,
            "reason": "no_signals_in_bundle",
            "profile_id": bundle.get("profile_id"),
            "findings_added": 0,
        }

    profile = _bundle_to_profile(bundle)
    before = get_profile(profile["id"])
    before_count = len(before.get("keyFindings", [])) if before else 0
    upsert_profile(profile, source="scout", updated_by=updated_by)
    after_count = len(profile.get("keyFindings", []))

    return {
        "imported": True,
        "profile_id": profile["id"],
        "is_new_profile": before is None,
        "findings_added": after_count - before_count,
        "total_findings": after_count,
        "source_bundle_id": bundle.get("bundle_id"),
    }
