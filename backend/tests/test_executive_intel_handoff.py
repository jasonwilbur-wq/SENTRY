from __future__ import annotations

import json
from pathlib import Path

from executive_intel.handoff import build_handoff_bundle
from executive_intel.repository import ExecutiveIntelRepository


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _signal(signal_id: str, review_status: str) -> dict:
    return {
        "signal_id": signal_id,
        "profile_id": "exec_example_leader",
        "category": "INITIATIVE",
        "event_date": "2026-05-01",
        "event_location": "Public announcement",
        "title": "Security initiative announcement",
        "summary": "The executive publicly described a security initiative.",
        "business_relevance": "Shows public security program direction.",
        "walmart_cso_relevance": "Useful benchmark for Walmart CSO awareness.",
        "confidence_level": "HIGH_PRIMARY_SOURCE",
        "verification_status": "VERIFIED",
        "sensitivity_level": "PUBLIC_BUSINESS",
        "analyst_review_status": review_status,
        "citations": [
            {
                "citation_id": f"cite_{signal_id}",
                "source_id": "src_001",
                "url": "https://example.com/security-initiative",
                "source_title": "Security Initiative",
                "publisher": "Example Publisher",
                "published_date": "2026-05-01",
                "evidence_excerpt": "The executive publicly described a security initiative.",
                "source_quality": "HIGH_PRIMARY_SOURCE",
            }
        ],
    }


def _seed_workspace(root: Path) -> ExecutiveIntelRepository:
    profile = {
        "profile_id": "exec_example_leader",
        "full_name": "Example Leader",
        "organization": "Example Retailer",
        "title": "Chief Security Officer",
        "status": "ACTIVE",
    }
    sources = {
        "profile_id": "exec_example_leader",
        "sources": [
            {
                "source_id": "src_001",
                "url": "https://example.com/security-initiative",
                "source_title": "Security Initiative",
                "publisher": "Example Publisher",
                "published_date": "2026-05-01",
                "source_quality": "HIGH_PRIMARY_SOURCE",
            }
        ],
    }
    signals = {
        "profile_id": "exec_example_leader",
        "signals": [
            _signal("sig_approved", "APPROVED_FOR_SENTRY"),
            _signal("sig_ready", "READY_FOR_REVIEW"),
        ],
    }

    _write_json(root / "profiles" / "example-leader.json", profile)
    _write_json(root / "sources" / "20260501-example-leader-sources.json", sources)
    _write_json(root / "signals" / "20260501-example-leader-signals.json", signals)
    _write_json(root / "runs" / "20260501-example-leader-run.json", {"profile_id": "exec_example_leader"})
    (root / "briefs" / "20260501-example-leader-brief.md").parent.mkdir(parents=True, exist_ok=True)
    (root / "briefs" / "20260501-example-leader-brief.md").write_text("# Draft brief\n", encoding="utf-8")
    return ExecutiveIntelRepository(root)


def test_handoff_bundle_defaults_to_approved_signals_only(tmp_path):
    repo = _seed_workspace(tmp_path / "executive-intel")

    bundle = build_handoff_bundle("exec_example_leader", repository=repo, finalized_by="analyst_1")

    assert bundle["source_system"] == "exec-signal-scout"
    assert bundle["destination"] == "SENTRY_PROGRAM_OPTIONAL_IMPORT"
    assert bundle["handoff_status"] == "FINALIZED_FOR_SENTRY_PROGRAM_HANDOFF"
    assert bundle["summary"]["all_signal_count"] == 2
    assert bundle["summary"]["handoff_signal_count"] == 1
    assert [signal["signal_id"] for signal in bundle["signals"]] == ["sig_approved"]
    assert "NO_SQLITE_WRITES" in bundle["review_only_controls_enforced"]


def test_handoff_bundle_can_make_draft_review_ready_bundle(tmp_path):
    repo = _seed_workspace(tmp_path / "executive-intel")

    bundle = build_handoff_bundle("exec_example_leader", repository=repo, include_review_ready=True)

    assert bundle["handoff_status"] == "DRAFT_HANDOFF_REVIEW_ONLY"
    assert bundle["summary"]["handoff_signal_count"] == 2
    assert "No SQLite writes" in " ".join(bundle["import_notes"])
