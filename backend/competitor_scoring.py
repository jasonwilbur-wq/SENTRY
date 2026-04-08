"""Competitor relevance scoring utilities.

Deterministic first-pass scoring (rules-based) so results are explainable,
testable, and safe for executive workflows.
"""

from __future__ import annotations

from typing import Any


PRIORITY_TIERS = [
    (85, "CSO Brief"),
    (70, "Leadership Watch"),
    (50, "Analyst Follow-up"),
    (0, "Archive / Low Signal"),
]


DOMAIN_HINTS: dict[str, list[str]] = {
    "security": [
        "cyber", "breach", "ransom", "malware", "vulnerability", "zero-day",
        "attack", "security", "phishing",
    ],
    "fraud": [
        "fraud", "scam", "chargeback", "account takeover", "identity theft", "orc",
        "shoplifting", "theft", "shrink",
    ],
    "privacy": [
        "privacy", "biometric", "face", "facial", "gdpr", "ccpa", "consent",
        "surveillance", "alpr", "lpr",
    ],
    "operations": [
        "supply chain", "logistics", "outage", "disruption", "warehouse", "store ops",
        "fulfillment", "labor", "strike",
    ],
    "customer_trust": [
        "lawsuit", "recall", "boycott", "brand", "reputation", "safety",
        "consumer", "trust",
    ],
}


TEAM_MAP: dict[str, str] = {
    "security": "Global Security",
    "fraud": "Fraud Strategy",
    "privacy": "Privacy & Legal",
    "operations": "Operations / Supply Chain",
    "customer_trust": "Corporate Affairs / Trust",
}


def _to_text(*vals: Any) -> str:
    return " ".join(str(v or "") for v in vals).lower()


def _hit_count(text: str, words: list[str]) -> int:
    return sum(1 for w in words if w in text)


def _score_confidence(confidence_level: str | None, source_link: str | None) -> int:
    base = 45
    conf = (confidence_level or "").strip().lower()
    if conf in {"high", "h"}:
        base = 85
    elif conf in {"medium", "med", "m"}:
        base = 65
    elif conf in {"low", "l"}:
        base = 40
    if source_link:
        base += 10
    return max(0, min(100, base))


def _score_novelty(event_type: str | None, title: str | None) -> int:
    text = _to_text(event_type, title)
    high = ["new", "launch", "pilot", "acquire", "partnership", "first", "expands"]
    urgent = ["breach", "lawsuit", "recall", "fine", "incident"]
    score = 45 + 6 * _hit_count(text, high) + 4 * _hit_count(text, urgent)
    return max(0, min(100, score))


def _score_urgency(category: str | None, title: str | None, description: str | None) -> int:
    text = _to_text(category, title, description)
    urgent = ["breach", "recall", "lawsuit", "fine", "outage", "attack", "critical"]
    moderate = ["expansion", "pilot", "roadmap", "investment"]
    score = 35 + 10 * _hit_count(text, urgent) + 4 * _hit_count(text, moderate)
    return max(0, min(100, score))


def score_event(event: dict[str, Any]) -> dict[str, Any]:
    """Score a competitor event and return normalized fields.

    Returns only additive fields suitable for DB update.
    """
    title = event.get("event_title")
    desc = event.get("detailed_description")
    category = event.get("category")
    event_type = event.get("event_type")
    source_link = event.get("source_link")
    confidence_level = event.get("confidence_level")

    text = _to_text(title, desc, category, event_type)

    domain_hits = {
        domain: _hit_count(text, hints) for domain, hints in DOMAIN_HINTS.items()
    }

    strategic = min(100, 40 + 12 * (1 if "strateg" in text else 0) + 8 * domain_hits["operations"])
    security = min(100, 35 + 14 * domain_hits["security"])
    operational = min(100, 35 + 10 * domain_hits["operations"])
    customer_trust = min(100, 30 + 12 * domain_hits["customer_trust"] + 8 * domain_hits["privacy"])
    novelty = _score_novelty(event_type, title)
    urgency = _score_urgency(category, title, desc)
    confidence = _score_confidence(confidence_level, source_link)

    relevance = round(
        strategic * 0.20
        + security * 0.20
        + customer_trust * 0.15
        + operational * 0.15
        + novelty * 0.10
        + urgency * 0.10
        + confidence * 0.10,
        1,
    )

    priority = next(label for floor, label in PRIORITY_TIERS if relevance >= floor)

    top_domain = max(domain_hits, key=domain_hits.get)
    signal_type = "Watch"
    if security >= 70 or customer_trust >= 70:
        signal_type = "Threat"
    elif strategic >= 70 and urgency < 60:
        signal_type = "Opportunity"

    team = TEAM_MAP[top_domain]
    why = (
        f"{signal_type} signal for Walmart: {event.get('competitor','Competitor')} "
        f"activity may impact {top_domain.replace('_', ' ')}. "
        f"Priority {priority} (score {relevance})."
    )

    escalate = 1 if (priority == "CSO Brief" and confidence >= 65) else 0

    return {
        "walmart_relevance_score": relevance,
        "priority_tier": priority,
        "signal_type": signal_type,
        "recommended_owner": team,
        "why_walmart_cares": why,
        "strategic_score": strategic,
        "security_score": security,
        "operational_score": operational,
        "customer_trust_score": customer_trust,
        "novelty_score": novelty,
        "urgency_score": urgency,
        "confidence_score": confidence,
        "escalate_to_cso": escalate,
        "scoring_version": "v1_rules_2026_04",
    }
