"""Safe public-source search plan builder for Executive Signal Scout."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from executive_intel.models import ExecutiveProfile
from executive_intel.review_controls import ReviewControlCode

DEFAULT_SOURCE_TARGETS = [
    "public leadership or biography pages",
    "public conference/event speaker pages",
    "public press releases and newsroom posts",
    "public interviews, podcasts, and video transcripts",
    "public government, court, or regulatory records when business-relevant",
    "reputable news coverage and analyst-provided public links",
]

BLOCKED_COLLECTION_PATTERNS = [
    "private or current location tracking",
    "home, family, residence, or personal-life details",
    "login, paywall, CAPTCHA, MFA, or bot-control bypass",
    "competitor pricing, assortment, product offering, or catalog scraping",
    "form submission, account creation, or remote state mutation",
    "broad competitor-owned site crawling without a specific public business page",
]

CATEGORY_TERMS = {
    "identity_corroboration": [
        "title",
        "chief security officer",
        "leadership",
        "bio",
    ],
    "public_appearances": [
        "conference",
        "speaker",
        "panel",
        "keynote",
        "fireside chat",
    ],
    "initiatives_and_decisions": [
        "initiative",
        "program",
        "strategy",
        "announced",
        "decision",
    ],
    "interviews_and_quotes": [
        "interview",
        "podcast",
        "transcript",
        "quote",
    ],
    "risk_or_incident_context": [
        "security",
        "investigation",
        "risk",
        "incident",
        "loss prevention",
    ],
}


def build_search_plan(profile: dict[str, Any]) -> dict[str, Any]:
    """Return deterministic public-source queries for one executive profile."""
    parsed = ExecutiveProfile.model_validate(profile)
    names = _dedupe([parsed.full_name, *parsed.aliases])
    org = parsed.organization
    title = parsed.title
    focus_topics = _dedupe(parsed.focus_topics)

    query_groups = {
        category: _queries_for_category(names, org, title, terms, focus_topics)
        for category, terms in CATEGORY_TERMS.items()
    }

    return {
        "profile_id": parsed.profile_id,
        "full_name": parsed.full_name,
        "organization": org,
        "title": title,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "public_read_only_search_plan",
        "source_targets": DEFAULT_SOURCE_TARGETS,
        "query_groups": query_groups,
        "blocked_collection_patterns": BLOCKED_COLLECTION_PATTERNS,
        "review_only_controls_enforced": [code.value for code in ReviewControlCode],
        "analyst_instructions": [
            "Use specific public pages first; do not run broad crawler behavior.",
            "Keep uncorroborated findings as LEAD_ONLY or NEEDS_MORE_EVIDENCE.",
            "Capture URL, publisher, publication date, evidence excerpt, and source quality for every usable signal.",
            "Drop private/prohibited content and retain only minimal rejection metadata if needed.",
        ],
    }


def _queries_for_category(
    names: list[str],
    organization: str,
    title: str,
    terms: list[str],
    focus_topics: list[str],
) -> list[str]:
    queries: list[str] = []
    useful_terms = _dedupe([*terms, *focus_topics])[:8]
    for name in names[:3]:
        queries.append(f'"{name}" "{organization}"')
        if title:
            queries.append(f'"{name}" "{organization}" "{title}"')
        for term in useful_terms:
            queries.append(f'"{name}" "{organization}" "{term}"')
    return _dedupe(queries)[:20]


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        cleaned = " ".join(str(value or "").split())
        key = cleaned.lower()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result
