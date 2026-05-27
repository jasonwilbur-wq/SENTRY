"""Source and business-travel policy helpers for executive intelligence."""
from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import urlparse

PROHIBITED_CONTENT_TERMS = (
    "pricing",
    "price-match",
    "price match",
    "assortment",
    "add-to-cart",
    "add to cart",
    "checkout",
    "cart",
    "store-pickup",
    "store pickup",
    "product-availability",
    "product availability",
    "deals",
    "offers",
)

PROHIBITED_PRIVATE_TERMS = (
    "home address",
    "residence",
    "family home",
    "private vacation",
    "personal phone",
    "personal email",
    "current location",
    "live location",
    "where is",
)

BUSINESS_TRAVEL_TERMS = (
    "conference",
    "summit",
    "keynote",
    "panel",
    "speaker",
    "fireside chat",
    "hearing",
    "forum",
    "symposium",
    "expo",
    "official visit",
    "business visit",
    "interview at",
    "annual meeting",
)

COMPETITOR_CORPORATE_ALLOWED_PATH_TERMS = (
    "/about",
    "/news",
    "/press",
    "/investor",
    "/leadership",
    "/events",
    "/blog",
    "/company",
)

COMPETITOR_BLOCKED_PATH_TERMS = (
    "/product",
    "/products",
    "/shop",
    "/stores",
    "/cart",
    "/checkout",
    "/deals",
    "/offers",
    "/pricing",
)


@dataclass(frozen=True)
class SourcePolicyDecision:
    allowed: bool
    review_required: bool
    reason_codes: tuple[str, ...] = field(default_factory=tuple)

    @property
    def primary_reason(self) -> str:
        return self.reason_codes[0] if self.reason_codes else "OK"


def _contains_any(value: str, terms: tuple[str, ...]) -> bool:
    lowered = value.lower()
    return any(term in lowered for term in terms)


def evaluate_source_url(url: str, competitor_domains: set[str] | None = None) -> SourcePolicyDecision:
    """Evaluate a URL against the executive-intel source policy.

    `competitor_domains` should contain hostnames such as `amazon.com` when the
    caller wants competitor-owned domains treated with extra path scrutiny.
    """
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return SourcePolicyDecision(False, True, ("INVALID_URL",))

    combined = f"{parsed.netloc}{parsed.path}{parsed.query}".lower()
    if _contains_any(combined, PROHIBITED_CONTENT_TERMS):
        return SourcePolicyDecision(False, True, ("PROHIBITED_COMPETITOR_COMMERCE_CONTENT",))

    if _contains_any(combined, PROHIBITED_PRIVATE_TERMS):
        return SourcePolicyDecision(False, True, ("PROHIBITED_PRIVATE_PERSON_CONTENT",))

    host = parsed.netloc.lower().removeprefix("www.")
    competitor_domains = {d.lower().removeprefix("www.") for d in (competitor_domains or set())}
    if host in competitor_domains or any(host.endswith(f".{domain}") for domain in competitor_domains):
        if _contains_any(parsed.path.lower(), COMPETITOR_BLOCKED_PATH_TERMS):
            return SourcePolicyDecision(False, True, ("COMPETITOR_DOMAIN_BLOCKED_PATH",))
        if _contains_any(parsed.path.lower(), COMPETITOR_CORPORATE_ALLOWED_PATH_TERMS):
            return SourcePolicyDecision(True, False, ("COMPETITOR_CORPORATE_PUBLIC_PATH",))
        return SourcePolicyDecision(True, True, ("COMPETITOR_DOMAIN_MANUAL_REVIEW",))

    return SourcePolicyDecision(True, False, ("PUBLIC_SOURCE_ALLOWED",))


def validate_business_travel(summary: str, location: str = "") -> SourcePolicyDecision:
    """Validate that travel detail looks like public business travel.

    This does not prove truth. It only blocks obviously private/invasive detail
    and marks vague travel claims for analyst review.
    """
    combined = f"{summary} {location}".strip()
    if _contains_any(combined, PROHIBITED_PRIVATE_TERMS):
        return SourcePolicyDecision(False, True, ("PROHIBITED_PRIVATE_TRAVEL",))

    if _contains_any(combined, BUSINESS_TRAVEL_TERMS):
        return SourcePolicyDecision(True, False, ("PUBLIC_BUSINESS_TRAVEL",))

    return SourcePolicyDecision(True, True, ("TRAVEL_CONTEXT_REVIEW_REQUIRED",))
