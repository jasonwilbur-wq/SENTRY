"""Command-line utilities for the Executive Signal Scout workflow.

These commands make the agent-first workflow usable without turning SENTRY into
the collection workbench. Defaults are read-only/stdout. File output requires an
explicit --output path and never overwrites unless --force is provided.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from executive_intel.handoff import build_handoff_bundle
from executive_intel.models import ExecutiveProfile
from executive_intel.repository import ExecutiveIntelRepository


def run(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args) or 0)
    except (FileExistsError, FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m executive_intel.cli",
        description="Executive Signal Scout local workflow utilities.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    target = subparsers.add_parser("target-template", help="Generate a normalized executive profile template.")
    target.add_argument("--name", required=True, help="Executive full name, e.g. Stephen Schmidt")
    target.add_argument("--organization", required=True, help="Organization, e.g. Amazon")
    target.add_argument("--title", default="", help="Known or claimed title")
    target.add_argument("--alias", action="append", default=[], help="Known alias; repeatable")
    target.add_argument("--focus-topic", action="append", default=[], help="Focus topic; repeatable")
    target.add_argument("--output", help="Optional local JSON output path")
    target.add_argument("--force", action="store_true", help="Allow overwriting --output")
    target.set_defaults(func=command_target_template)

    portfolio = subparsers.add_parser("portfolio", help="Inspect one local target portfolio.")
    portfolio.add_argument("profile_id", help="Executive profile_id")
    portfolio.add_argument("--root", help="Executive intel artifact root; defaults to data/executive-intel")
    portfolio.add_argument("--full", action="store_true", help="Print full portfolio JSON instead of summary")
    portfolio.set_defaults(func=command_portfolio)

    handoff = subparsers.add_parser("handoff", help="Build a SENTRY handoff bundle from local artifacts.")
    handoff.add_argument("profile_id", help="Executive profile_id")
    handoff.add_argument("--root", help="Executive intel artifact root; defaults to data/executive-intel")
    handoff.add_argument("--draft", action="store_true", help="Include READY_FOR_REVIEW signals and mark draft-only")
    handoff.add_argument("--finalized-by", help="Analyst/user finalizer for finalized bundles")
    handoff.add_argument("--json", action="store_true", help="Print full bundle JSON to stdout")
    handoff.add_argument("--output", help="Optional local JSON output path")
    handoff.add_argument("--force", action="store_true", help="Allow overwriting --output")
    handoff.set_defaults(func=command_handoff)

    return parser


def command_target_template(args: argparse.Namespace) -> int:
    now = datetime.now(timezone.utc).isoformat()
    profile_id = _profile_id(args.organization, args.name)
    profile = ExecutiveProfile(
        profile_id=profile_id,
        full_name=args.name.strip(),
        organization=args.organization.strip(),
        title=args.title.strip(),
        aliases=[item.strip() for item in args.alias if item.strip()],
        focus_topics=[item.strip() for item in args.focus_topic if item.strip()],
        created_at=now,
        updated_at=now,
    ).model_dump(mode="json")

    _emit_json(profile, output=args.output, force=args.force)
    return 0


def command_portfolio(args: argparse.Namespace) -> int:
    repo = _repository(args.root)
    portfolio = repo.get_portfolio(args.profile_id)
    if args.full:
        print(_to_pretty_json(portfolio))
        return 0

    stats = portfolio["stats"]
    payload = {
        "profile_id": args.profile_id,
        "root": str(repo.root),
        "full_name": portfolio["profile"].get("full_name"),
        "organization": portfolio["profile"].get("organization"),
        "title": portfolio["profile"].get("title"),
        "source_count": stats["source_count"],
        "signal_count": stats["signal_count"],
        "valid_signal_count": stats["valid_signal_count"],
        "invalid_signal_count": stats["invalid_signal_count"],
        "cso_ready_signal_count": stats["cso_ready_signal_count"],
        "portfolio_ready_for_review": stats["portfolio_ready_for_review"],
        "latest_brief": portfolio.get("latest_brief"),
    }
    print(_to_pretty_json(payload))
    return 0


def command_handoff(args: argparse.Namespace) -> int:
    repo = _repository(args.root)
    bundle = build_handoff_bundle(
        args.profile_id,
        repository=repo,
        finalized_by=args.finalized_by,
        include_review_ready=args.draft,
    )

    if args.output:
        _write_json(Path(args.output), bundle, force=args.force)

    if args.json:
        print(_to_pretty_json(bundle))
        return 0

    summary = bundle["summary"]
    payload = {
        "bundle_id": bundle["bundle_id"],
        "profile_id": bundle["profile_id"],
        "handoff_status": bundle["handoff_status"],
        "destination": bundle["destination"],
        "all_signal_count": summary["all_signal_count"],
        "handoff_signal_count": summary["handoff_signal_count"],
        "invalid_signal_count": summary["invalid_signal_count"],
        "output": str(Path(args.output).resolve()) if args.output else None,
        "next_step": _next_step(bundle["handoff_status"]),
    }
    print(_to_pretty_json(payload))
    return 0


def _repository(root: str | None) -> ExecutiveIntelRepository:
    return ExecutiveIntelRepository(Path(root) if root else None)


def _profile_id(organization: str, name: str) -> str:
    return f"exec_{_slug(organization)}_{_slug(name)}"


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    if not cleaned:
        raise ValueError("name and organization must contain at least one alphanumeric character")
    return cleaned


def _emit_json(payload: dict[str, Any], *, output: str | None, force: bool) -> None:
    if output:
        _write_json(Path(output), payload, force=force)
    else:
        print(_to_pretty_json(payload))


def _write_json(path: Path, payload: dict[str, Any], *, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"Refusing to overwrite existing file without --force: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_to_pretty_json(payload) + "\n", encoding="utf-8")


def _to_pretty_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, indent=2, sort_keys=True)


def _next_step(status: str) -> str:
    if status == "FINALIZED_FOR_SENTRY_PROGRAM_HANDOFF":
        return "Ready for separate approved SENTRY import/consumption step."
    if status == "APPROVED_SIGNALS_PRESENT_FINALIZER_REQUIRED":
        return "Re-run with --finalized-by after analyst finalization, or use --draft for review-only output."
    if status == "DRAFT_HANDOFF_REVIEW_ONLY":
        return "Analyst review required before finalized SENTRY handoff."
    return "No approved signals yet; complete source review and signal approval first."


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(run())
