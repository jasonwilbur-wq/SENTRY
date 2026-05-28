from __future__ import annotations

import json
from pathlib import Path

from executive_intel.cli import run


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


def _seed_workspace(root: Path) -> Path:
    _write_json(root / "profiles" / "example-leader.json", {
        "profile_id": "exec_example_leader",
        "full_name": "Example Leader",
        "organization": "Example Retailer",
        "title": "Chief Security Officer",
        "status": "ACTIVE",
    })
    _write_json(root / "sources" / "20260501-example-leader-sources.json", {
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
    })
    _write_json(root / "signals" / "20260501-example-leader-signals.json", {
        "profile_id": "exec_example_leader",
        "signals": [
            _signal("sig_approved", "APPROVED_FOR_SENTRY"),
            _signal("sig_ready", "READY_FOR_REVIEW"),
        ],
    })
    (root / "briefs").mkdir(parents=True, exist_ok=True)
    (root / "briefs" / "20260501-example-leader-brief.md").write_text("# Draft brief\n", encoding="utf-8")
    return root


def test_target_template_prints_profile_json(capsys):
    exit_code = run([
        "target-template",
        "--name", "Stephen Schmidt",
        "--organization", "Amazon",
        "--title", "Chief Security Officer",
        "--alias", "Steve Schmidt",
        "--focus-topic", "global security",
    ])

    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["profile_id"] == "exec_amazon_stephen_schmidt"
    assert payload["aliases"] == ["Steve Schmidt"]
    assert payload["focus_topics"] == ["global security"]


def test_search_plan_prints_queries_from_profile_file(tmp_path, capsys):
    profile_path = tmp_path / "profile.json"
    _write_json(profile_path, {
        "profile_id": "exec_amazon_stephen_schmidt",
        "full_name": "Stephen Schmidt",
        "organization": "Amazon",
        "title": "Chief Security Officer",
        "aliases": ["Steve Schmidt"],
        "focus_topics": ["global security"],
    })

    exit_code = run(["search-plan", "--profile", str(profile_path)])

    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["mode"] == "public_read_only_search_plan"
    assert payload["query_groups"]["public_appearances"]
    assert "NO_COMPETITOR_PRICING_ASSORTMENT_OFFERING_SCRAPING" in payload["review_only_controls_enforced"]


def test_portfolio_prints_readiness_summary(tmp_path, capsys):
    root = _seed_workspace(tmp_path / "executive-intel")

    exit_code = run(["portfolio", "exec_example_leader", "--root", str(root)])

    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["signal_count"] == 2
    assert payload["source_count"] == 1
    assert payload["portfolio_ready_for_review"] is True


def test_handoff_can_write_local_bundle_without_overwriting(tmp_path, capsys):
    root = _seed_workspace(tmp_path / "executive-intel")
    output = tmp_path / "handoff.json"

    exit_code = run([
        "handoff",
        "exec_example_leader",
        "--root", str(root),
        "--finalized-by", "analyst_1",
        "--output", str(output),
    ])

    assert exit_code == 0
    summary = json.loads(capsys.readouterr().out)
    bundle = json.loads(output.read_text(encoding="utf-8"))
    assert summary["handoff_status"] == "FINALIZED_FOR_SENTRY_PROGRAM_HANDOFF"
    assert bundle["summary"]["handoff_signal_count"] == 1

    overwrite_exit_code = run([
        "handoff",
        "exec_example_leader",
        "--root", str(root),
        "--output", str(output),
    ])

    assert overwrite_exit_code == 2


def test_handoff_draft_json_includes_review_ready_signal(tmp_path, capsys):
    root = _seed_workspace(tmp_path / "executive-intel")

    exit_code = run(["handoff", "exec_example_leader", "--root", str(root), "--draft", "--json"])

    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["handoff_status"] == "DRAFT_HANDOFF_REVIEW_ONLY"
    assert payload["summary"]["handoff_signal_count"] == 2
