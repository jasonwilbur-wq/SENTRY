"""Normalization helpers for executive-intel prototype records."""
from __future__ import annotations

import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

_TRACKING_PREFIXES = ("utm_",)
_TRACKING_KEYS = {"fbclid", "gclid", "mc_cid", "mc_eid", "igshid"}


def normalize_person_name(value: str) -> str:
    """Collapse whitespace and title-case a person name without being fancy."""
    cleaned = " ".join(value.strip().split())
    return cleaned.title()


def slugify(value: str) -> str:
    """Return a stable slug for local IDs."""
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def normalize_url(url: str) -> str:
    """Normalize URLs for dedupe without changing source meaning."""
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower().removeprefix("www.")
    path = parsed.path.rstrip("/") or "/"
    query_items = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        lowered = key.lower()
        if lowered in _TRACKING_KEYS or any(lowered.startswith(prefix) for prefix in _TRACKING_PREFIXES):
            continue
        query_items.append((key, value))
    query = urlencode(sorted(query_items))
    return urlunparse((parsed.scheme.lower() or "https", host, path, "", query, ""))


def build_profile_id(organization: str, full_name: str) -> str:
    return f"exec_{slugify(organization)}_{slugify(full_name)}"
