"""Deterministic competitor-event enrichment for CSO brief readiness.

This module keeps enrichment rules explicit and reusable across:
- create/update scoring paths
- batch rescore/backfill workflows
- serialization/readiness visibility
"""
from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from competitor_correlation import _build_walmart_actionability_context


CONFIDENCE_LABEL_MAP = {
    "h": "high",
    "high": "high",
    "m": "medium",
    "med": "medium",
    "medium": "medium",
    "l": "low",
    "low": "low",
}


READINESS_BLOCKING_ISSUES = {
    "MISSING_SOURCE_LINK",
    "INVALID_SOURCE_LINK",
    "MISSING_RATIONALE",
    "MISSING_CONFIDENCE",
}

READINESS_REQUIRED_FIELDS = [
    "source_link",
    "why_walmart_cares_or_actionability",
    "confidence_level_or_score",
]

BRIEF_READY_FIELD_NAMES = [
    "source_link",
    "why_walmart_cares",
    "walmart_actionability_context",
    "recommended_owner",
    "correlation_summary",
]

DOMAIN_OWNER_MAP = {
    "security": "Global Security",
    "fraud": "Fraud Strategy",
    "operations": "Operations / Supply Chain",
    "customer_trust": "Corporate Affairs / Trust",
    "privacy": "Privacy & Legal",
}


def _clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def normalize_confidence_level(value: Any) -> str:
    """Normalize analyst confidence labels to canonical high/medium/low buckets."""
    raw = _clean_text(value).lower()
    return CONFIDENCE_LABEL_MAP.get(raw, "")


def normalize_source_link(value: str | None) -> tuple[str, str | None]:
    """Normalize source_link and return (normalized_value, warning_or_none)."""
    raw = _clean_text(value)
    if not raw:
        return "", None

    lowered = raw.lower()
    if lowered.startswith("www."):
        raw = f"https://{raw}"

    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return raw, None

    return raw, "UNUSABLE_SOURCE_LINK"


def confidence_from_score(confidence_score: Any) -> str:
    """Map numeric confidence score to standard level labels."""
    try:
        score = float(confidence_score)
    except (TypeError, ValueError):
        return ""

    if score >= 76:
        return "high"
    if score >= 61:
        return "medium"
    if score > 0:
        return "low"
    return ""


def _event_focus_text(event: dict[str, Any]) -> str:
    return _clean_text(
        " | ".join(
            [
                str(event.get("event_title") or ""),
                str(event.get("event_type") or ""),
                str(event.get("detailed_description") or ""),
                str(event.get("security_implication") or ""),
                str(event.get("operational_impact") or ""),
                str(event.get("financial_impact") or ""),
                str(event.get("reputational_impact") or ""),
            ]
        )
    )


def _derive_owner(event: dict[str, Any]) -> str:
    top_domain = _clean_text(event.get("top_domain")).lower().replace(" ", "_")
    if top_domain in DOMAIN_OWNER_MAP:
        return DOMAIN_OWNER_MAP[top_domain]

    signal_type = _clean_text(event.get("signal_type")).lower()
    category = _clean_text(event.get("category")).lower()
    focus = _event_focus_text(event).lower()

    if signal_type == "threat" or any(token in focus for token in ["breach", "ransom", "cyber", "attack", "security"]):
        return "Global Security"
    if any(token in category for token in ["orc", "theft", "fraud"]):
        return "Fraud Strategy"
    if any(token in focus for token in ["outage", "supply chain", "distribution", "warehouse", "fulfillment", "labor", "store ops"]):
        return "Operations / Supply Chain"
    if any(token in category for token in ["legal", "recall"]):
        return "Corporate Affairs / Trust"
    return ""


def _derive_why_walmart_cares(event: dict[str, Any]) -> str:
    competitor = _clean_text(event.get("competitor")) or "Competitor"
    category = _clean_text(event.get("category")) or "market"
    priority = _clean_text(event.get("priority_tier")) or "signal"
    owner = _clean_text(event.get("recommended_owner")) or _derive_owner(event)
    score = event.get("walmart_relevance_score")
    score_text = f"{score}" if score is not None else "unscored"
    corr_status = _clean_text(event.get("correlation_status")).upper()
    vendor = _clean_text(event.get("matched_vendor_name"))
    projects = int(event.get("linked_active_projects_count") or 0)

    if corr_status == "MATCHED" and vendor:
        if projects > 0:
            return (
                f"{competitor} {category} event intersects with tracked vendor {vendor} and {projects} active Walmart project(s); "
                f"{owner or 'assigned teams'} should review dependency exposure before CSO brief drafting."
            )
        return (
            f"{competitor} {category} event maps to tracked vendor {vendor}; validate whether current Walmart dependency or sourcing activity warrants executive attention."
        )

    if priority in {"CSO Brief", "Leadership Watch"}:
        return (
            f"{competitor} {category} event is already prioritized as {priority} (relevance {score_text}); "
            f"use it to confirm Walmart exposure, required owner actions, and briefing posture."
        )

    return (
        f"{competitor} {category} event currently classified as {priority} (relevance {score_text}); "
        "evaluate whether it changes Walmart exposure, response posture, or vendor monitoring priorities."
    )


def _summarize_correlation_context(event: dict[str, Any]) -> str:
    status = _clean_text(event.get("correlation_status")).upper()
    vendor = _clean_text(event.get("matched_vendor_name"))
    projects = int(event.get("linked_active_projects_count") or 0)
    label = _clean_text(event.get("match_label")).replace("_", " ").lower()

    if status == "MATCHED":
        confidence = label or "matched"
        if projects > 0:
            return (
                f"Tracked vendor correlation: {vendor or 'vendor matched'} ({confidence}) with "
                f"{projects} active linked project(s)."
            )
        return f"Tracked vendor correlation: {vendor or 'vendor matched'} ({confidence}); project links not yet active."

    if status == "AMBIGUOUS":
        candidates = event.get("candidate_vendor_names") or []
        top = ", ".join([str(c) for c in candidates[:3]])
        if top:
            return f"Vendor correlation ambiguous across candidate vendors: {top}."
        return "Vendor correlation ambiguous; analyst confirmation required."

    competitor = _clean_text(event.get("competitor")) or "Competitor"
    return f"No deterministic tracked-vendor/project correlation found yet for {competitor}; treat as broader market signal."


def build_brief_readiness_enrichment(event: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Return deterministic enrichment patch and non-blocking enrichment warnings."""
    patch: dict[str, Any] = {}
    warnings: list[str] = []

    norm_source, source_warning = normalize_source_link(event.get("source_link"))
    current_source = _clean_text(event.get("source_link"))
    if norm_source != current_source:
        patch["source_link"] = norm_source
    if source_warning:
        warnings.append(source_warning)

    owner = _clean_text(event.get("recommended_owner"))
    if not owner:
        derived_owner = _derive_owner(event)
        if derived_owner:
            patch["recommended_owner"] = derived_owner

    normalized_confidence = normalize_confidence_level(event.get("confidence_level"))
    current_confidence = _clean_text(event.get("confidence_level")).lower()
    if normalized_confidence and normalized_confidence != current_confidence:
        patch["confidence_level"] = normalized_confidence
    elif not current_confidence:
        derived_confidence = confidence_from_score(event.get("confidence_score"))
        if derived_confidence:
            patch["confidence_level"] = derived_confidence

    rationale = _clean_text(event.get("why_walmart_cares"))
    if not rationale:
        patch["why_walmart_cares"] = _derive_why_walmart_cares({**event, **patch})

    actionability = _clean_text(event.get("walmart_actionability_context"))
    if not actionability:
        patch["walmart_actionability_context"] = _build_walmart_actionability_context({**event, **patch})

    correlation_summary = _clean_text(event.get("correlation_summary"))
    if not correlation_summary:
        patch["correlation_summary"] = _summarize_correlation_context({**event, **patch})

    return patch, warnings


def enrich_for_brief_readiness(event: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Backward-compatible wrapper for deterministic brief-readiness enrichment."""
    return build_brief_readiness_enrichment(event)


def evaluate_competitor_event_readiness(event: dict[str, Any]) -> dict[str, Any]:
    """Evaluate briefing readiness at competitor-event level."""
    issues: list[str] = []
    warnings: list[str] = []

    source_link = _clean_text(event.get("source_link"))
    if not source_link:
        issues.append("MISSING_SOURCE_LINK")
    else:
        parsed = urlparse(source_link)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            issues.append("INVALID_SOURCE_LINK")

    why = _clean_text(event.get("why_walmart_cares"))
    actionability = _clean_text(event.get("walmart_actionability_context"))
    if not why and not actionability:
        issues.append("MISSING_RATIONALE")

    confidence = normalize_confidence_level(event.get("confidence_level"))
    if not confidence:
        confidence = confidence_from_score(event.get("confidence_score"))
    if not confidence:
        issues.append("MISSING_CONFIDENCE")

    owner = _clean_text(event.get("recommended_owner"))
    if not owner:
        warnings.append("MISSING_OWNER_SUGGESTION")

    correlation_summary = _clean_text(event.get("correlation_summary"))
    if not correlation_summary:
        warnings.append("MISSING_CORRELATION_SUMMARY")

    corr_status = _clean_text(event.get("correlation_status")).upper()
    if corr_status in {"AMBIGUOUS", "NO_MATCH", ""}:
        warnings.append("WEAK_VENDOR_PROJECT_CORRELATION")

    if _clean_text(event.get("source_effect")) == "source_link_missing":
        warnings.append("SOURCE_EVIDENCE_WEAK")

    is_ready = not any(code in READINESS_BLOCKING_ISSUES for code in issues)
    return {
        "is_brief_ready": is_ready,
        "readiness_issues": issues,
        "readiness_warnings": warnings,
        "readiness_required_fields": READINESS_REQUIRED_FIELDS,
    }
