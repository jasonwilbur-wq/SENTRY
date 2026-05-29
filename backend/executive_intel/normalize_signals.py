"""Normalize exec-signal-scout signal artifacts to the ExecutiveSignal schema.

The scout writes rich, well-cited signals but uses a few human-friendly field
names/values that the strict Pydantic models reject:

* signal ``confidence_level`` as ``HIGH``/``MEDIUM``/``LOW`` instead of the
  ``SourceQuality`` enum values.
* citations carrying ``key_quote`` instead of the required ``evidence_excerpt``
  and missing a per-citation ``source_quality``.

This module maps those onto the contract WITHOUT touching the intelligence
content. It is idempotent: re-running on already-normalized files is a no-op.
Run-only on signal artifacts; it never mutates profiles, sources, or briefs.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from executive_intel.models import ExecutiveSignal

_QUALITY_MAP = {
    "HIGH": "HIGH_PRIMARY_SOURCE",
    "HIGH_PRIMARY_SOURCE": "HIGH_PRIMARY_SOURCE",
    "MEDIUM": "MEDIUM_REPUTABLE_SECONDARY",
    "MEDIUM_REPUTABLE_SECONDARY": "MEDIUM_REPUTABLE_SECONDARY",
    "MEDIUM-HIGH": "MEDIUM_REPUTABLE_SECONDARY",
    "LOW": "LOW_SINGLE_SOURCE",
    "LOW_SINGLE_SOURCE": "LOW_SINGLE_SOURCE",
    "REVIEW_REQUIRED": "REVIEW_REQUIRED",
}


def _map_quality(value: Any) -> str:
    key = str(value or "").strip().upper()
    return _QUALITY_MAP.get(key, "REVIEW_REQUIRED")


def normalize_signal(signal: dict[str, Any]) -> dict[str, Any]:
    """Return a schema-valid copy of one signal dict."""
    out = dict(signal)
    out["confidence_level"] = _map_quality(out.get("confidence_level"))

    # Strict models require string dates/locations; coerce nulls/blanks.
    if not str(out.get("event_date") or "").strip():
        out["event_date"] = "UNKNOWN"
    if not str(out.get("event_location") or "").strip():
        out["event_location"] = "UNKNOWN"

    citations = []
    for citation in out.get("citations", []) or []:
        cit = dict(citation)
        excerpt = (
            cit.get("evidence_excerpt")
            or cit.get("key_quote")
            or cit.get("citation_note")
            or ""
        )
        if len(str(excerpt)) < 8:
            excerpt = f"{excerpt} (see source)".strip()
        cit["evidence_excerpt"] = excerpt
        cit["source_quality"] = _map_quality(
            cit.get("source_quality") or out["confidence_level"]
        )
        citations.append(cit)
    out["citations"] = citations
    return out


def normalize_file(path: Path) -> dict[str, Any]:
    """Normalize one signals artifact in place. Returns a small report."""
    doc = json.loads(path.read_text(encoding="utf-8"))
    signals = doc.get("signals") or doc.get("new_signals") or []
    normalized = [normalize_signal(sig) for sig in signals]

    valid = 0
    errors: list[str] = []
    for sig in normalized:
        try:
            ExecutiveSignal.model_validate(sig)
            valid += 1
        except Exception as exc:  # noqa: BLE001 - report, don't crash batch
            errors.append(f"{sig.get('signal_id')}: {exc}")

    key = "signals" if "signals" in doc else "new_signals"
    doc[key] = normalized
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    return {
        "file": path.name,
        "total": len(normalized),
        "valid": valid,
        "invalid": len(normalized) - valid,
        "errors": errors,
    }


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: python -m executive_intel.normalize_signals <signals.json> ...")
        return 2
    rc = 0
    for arg in argv:
        report = normalize_file(Path(arg))
        print(json.dumps(report, indent=2))
        if report["invalid"]:
            rc = 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
