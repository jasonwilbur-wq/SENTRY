"""Duplicate detection helpers for executive signals."""
from __future__ import annotations

from hashlib import sha256

from executive_intel.models import ExecutiveSignal
from executive_intel.normalization import normalize_url, slugify


def signal_fingerprint(signal: ExecutiveSignal) -> str:
    """Return a stable fingerprint for near-identical source-backed signals."""
    citation_urls = sorted(normalize_url(c.url) for c in signal.citations)
    base = "|".join([
        signal.profile_id,
        signal.category.value,
        signal.event_date or "UNKNOWN",
        slugify(signal.title),
        "|".join(citation_urls),
    ])
    return sha256(base.encode("utf-8")).hexdigest()[:16]


def dedupe_signals(signals: list[ExecutiveSignal]) -> list[ExecutiveSignal]:
    """Keep first occurrence of each fingerprint while preserving input order."""
    seen: set[str] = set()
    unique: list[ExecutiveSignal] = []
    for signal in signals:
        fingerprint = signal_fingerprint(signal)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        unique.append(signal)
    return unique
