"""Read-only artifact repository for Executive Signal Scout portfolios.

This module turns the git-ignored JSON workspace under data/executive-intel
into stable portfolio/report payloads for SENTRY. It deliberately does not
write, schedule, collect, publish, or mutate source artifacts.
"""
from __future__ import annotations

import json
import os
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from executive_intel.models import ExecutiveProfile, ExecutiveSignal, SourceQuality
from executive_intel.policy import evaluate_source_url

SAFE_PROFILE_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{1,120}$")


def default_executive_intel_root() -> Path:
    """Return the local Executive Signal Scout data root.

    Env var wins for tests/deployments; otherwise resolve relative to repo root.
    """
    configured = os.environ.get("SENTRY_EXECUTIVE_INTEL_ROOT")
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[2] / "data" / "executive-intel"


@dataclass(frozen=True)
class ArtifactFile:
    path: Path
    name: str
    size_bytes: int
    modified_at: str

    @classmethod
    def from_path(cls, path: Path) -> "ArtifactFile":
        stat = path.stat()
        modified = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        return cls(path=path, name=path.name, size_bytes=stat.st_size, modified_at=modified)

    def to_public_dict(self, root: Path) -> dict[str, Any]:
        return {
            "name": self.name,
            "relative_path": str(self.path.relative_to(root)).replace("\\", "/"),
            "size_bytes": self.size_bytes,
            "modified_at": self.modified_at,
        }


class ExecutiveIntelRepository:
    """Read-only loader for target portfolios and draft reports."""

    def __init__(self, root: Path | None = None):
        self.root = (root or default_executive_intel_root()).resolve()

    @property
    def profiles_dir(self) -> Path:
        return self.root / "profiles"

    @property
    def sources_dir(self) -> Path:
        return self.root / "sources"

    @property
    def signals_dir(self) -> Path:
        return self.root / "signals"

    @property
    def runs_dir(self) -> Path:
        return self.root / "runs"

    @property
    def briefs_dir(self) -> Path:
        return self.root / "briefs"

    def list_portfolios(self) -> dict[str, Any]:
        profiles = [self._portfolio_summary(path) for path in self._json_files(self.profiles_dir)]
        profiles.sort(key=lambda item: item.get("updated_at") or item.get("profile_id") or "")
        return {
            "root_available": self.root.exists(),
            "root": str(self.root),
            "total": len(profiles),
            "portfolios": profiles,
        }

    def get_portfolio(self, profile_id: str) -> dict[str, Any]:
        self._assert_safe_profile_id(profile_id)
        profile_path, profile = self._load_profile_by_id(profile_id)
        slug = profile_path.stem
        sources = self._load_matching_records(self.sources_dir, profile_id, "sources")
        signals = self._load_matching_signals(profile_id)
        runs = self._matching_files(self.runs_dir, slug, "*.json")
        briefs = self._matching_files(self.briefs_dir, slug, "*.md")
        latest_brief = self._latest_file(briefs)

        validation = self._validate_profile_and_signals(profile, signals)
        source_policy = self._source_policy_summary(sources)
        stats = self._portfolio_stats(signals, sources, briefs, validation)

        return {
            "profile": profile,
            "artifact_slug": slug,
            "stats": stats,
            "validation": validation,
            "source_policy": source_policy,
            "sources": sources,
            "signals": signals,
            "runs": [file.to_public_dict(self.root) for file in runs],
            "briefs": [file.to_public_dict(self.root) for file in briefs],
            "latest_brief": latest_brief.to_public_dict(self.root) if latest_brief else None,
            "mode": "read_only_local_artifacts",
        }

    def get_report(self, profile_id: str) -> dict[str, Any]:
        portfolio = self.get_portfolio(profile_id)
        latest = portfolio.get("latest_brief")
        markdown = ""
        if latest:
            brief_path = self.root / latest["relative_path"]
            markdown = brief_path.read_text(encoding="utf-8")
        return {
            "profile_id": profile_id,
            "profile": portfolio["profile"],
            "stats": portfolio["stats"],
            "validation": portfolio["validation"],
            "latest_brief": latest,
            "markdown": markdown,
            "mode": "read_only_draft_report",
            "publication_status": "NOT_PUBLISHED_REVIEW_REQUIRED",
        }

    def _portfolio_summary(self, profile_path: Path) -> dict[str, Any]:
        profile = self._read_json(profile_path)
        profile_id = str(profile.get("profile_id") or profile_path.stem)
        slug = profile_path.stem
        sources = self._load_matching_records(self.sources_dir, profile_id, "sources")
        signals = self._load_matching_signals(profile_id)
        briefs = self._matching_files(self.briefs_dir, slug, "*.md")
        validation = self._validate_profile_and_signals(profile, signals)
        stats = self._portfolio_stats(signals, sources, briefs, validation)
        return {
            "profile_id": profile_id,
            "artifact_slug": slug,
            "full_name": profile.get("full_name", "UNKNOWN"),
            "organization": profile.get("organization", "UNKNOWN"),
            "title": profile.get("title") or profile.get("title_normalized") or "UNKNOWN",
            "title_svp_conclusion": profile.get("title_svp_conclusion"),
            "status": str(profile.get("status") or "ACTIVE").upper(),
            "officer_type": profile.get("officer_type"),
            "relevance_framing": profile.get("relevance_framing"),
            "superseded_by": (profile.get("stale_reason") or {}).get("superseded_by"),
            "updated_at": profile.get("updated_at") or profile_path.stat().st_mtime,
            "stats": stats,
            "latest_brief": self._latest_file(briefs).to_public_dict(self.root) if briefs else None,
        }

    def _load_profile_by_id(self, profile_id: str) -> tuple[Path, dict[str, Any]]:
        for path in self._json_files(self.profiles_dir):
            profile = self._read_json(path)
            if profile.get("profile_id") == profile_id:
                return path, profile
        raise FileNotFoundError(f"Executive profile not found: {profile_id}")

    def _load_matching_records(self, directory: Path, profile_id: str, key: str) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        for path in self._json_files(directory):
            doc = self._read_json(path)
            if doc.get("profile_id") != profile_id:
                continue
            for record in doc.get(key, []):
                if isinstance(record, dict):
                    records.append({**record, "_artifact_file": path.name})
        return records

    def _load_matching_signals(self, profile_id: str) -> list[dict[str, Any]]:
        signals: list[dict[str, Any]] = []
        seen: set[str] = set()
        for path in self._json_files(self.signals_dir):
            doc = self._read_json(path)
            if doc.get("profile_id") != profile_id:
                continue
            candidates = doc.get("signals") or doc.get("new_signals") or []
            for signal in candidates:
                if not isinstance(signal, dict):
                    continue
                signal_id = str(signal.get("signal_id") or "")
                unique_key = f"{path.name}:{signal_id}"
                if unique_key in seen:
                    continue
                seen.add(unique_key)
                signals.append({**signal, "_artifact_file": path.name})
        return signals

    def _portfolio_stats(
        self,
        signals: list[dict[str, Any]],
        sources: list[dict[str, Any]],
        briefs: list[ArtifactFile],
        validation: dict[str, Any],
    ) -> dict[str, Any]:
        verification_counts = Counter(str(s.get("verification_status") or "UNKNOWN") for s in signals)
        review_counts = Counter(str(s.get("analyst_review_status") or "UNKNOWN") for s in signals)
        category_counts = Counter(str(s.get("category") or "OTHER") for s in signals)
        source_quality_counts = Counter(str(s.get("source_quality") or "UNKNOWN") for s in sources)
        cso_ready = sum(1 for signal in signals if self._is_cso_ready(signal))
        return {
            "source_count": len(sources),
            "signal_count": len(signals),
            "brief_count": len(briefs),
            "valid_signal_count": validation["valid_signal_count"],
            "invalid_signal_count": validation["invalid_signal_count"],
            "cso_ready_signal_count": cso_ready,
            "verification_counts": dict(verification_counts),
            "analyst_review_counts": dict(review_counts),
            "category_counts": dict(category_counts),
            "source_quality_counts": dict(source_quality_counts),
            "portfolio_ready_for_review": bool(signals) and validation["invalid_signal_count"] == 0,
        }

    def _validate_profile_and_signals(
        self,
        profile: dict[str, Any],
        signals: list[dict[str, Any]],
    ) -> dict[str, Any]:
        errors: list[dict[str, Any]] = []
        try:
            ExecutiveProfile.model_validate(profile)
            profile_valid = True
        except ValidationError as exc:
            profile_valid = False
            errors.append({"artifact": "profile", "errors": exc.errors()[:6]})

        valid_signal_count = 0
        for signal in signals:
            signal_id = str(signal.get("signal_id") or "UNKNOWN")
            try:
                ExecutiveSignal.model_validate(signal)
                valid_signal_count += 1
            except ValidationError as exc:
                errors.append({"artifact": signal_id, "errors": exc.errors()[:6]})

        return {
            "profile_valid": profile_valid,
            "valid_signal_count": valid_signal_count,
            "invalid_signal_count": len(signals) - valid_signal_count,
            "errors": errors,
        }

    def _source_policy_summary(self, sources: list[dict[str, Any]]) -> dict[str, Any]:
        decisions = Counter()
        reviewed: list[dict[str, str]] = []
        competitor_domains = {"amazon.com", "aws.amazon.com", "aboutamazon.com"}
        for source in sources:
            url = str(source.get("url") or "")
            decision = evaluate_source_url(url, competitor_domains=competitor_domains)
            label = "ALLOWED" if decision.allowed else "BLOCKED"
            if decision.review_required:
                label += "_REVIEW"
            decisions[label] += 1
            reviewed.append({
                "source_id": str(source.get("source_id") or "UNKNOWN"),
                "url": url,
                "decision": label,
                "primary_reason": decision.primary_reason,
            })
        return {"counts": dict(decisions), "reviewed": reviewed}

    @staticmethod
    def _is_cso_ready(signal: dict[str, Any]) -> bool:
        try:
            parsed = ExecutiveSignal.model_validate(signal)
        except ValidationError:
            return False
        if parsed.verification_status != "VERIFIED":
            return False
        return any(citation.source_quality == SourceQuality.HIGH_PRIMARY_SOURCE for citation in parsed.citations)

    @staticmethod
    def _assert_safe_profile_id(profile_id: str) -> None:
        if not SAFE_PROFILE_ID.fullmatch(profile_id):
            raise ValueError("Invalid executive profile id")

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if not isinstance(payload, dict):
            raise ValueError(f"Expected JSON object: {path}")
        return payload

    @staticmethod
    def _json_files(directory: Path) -> list[Path]:
        if not directory.exists():
            return []
        return sorted(path for path in directory.glob("*.json") if path.is_file())

    def _matching_files(self, directory: Path, slug: str, pattern: str) -> list[ArtifactFile]:
        if not directory.exists():
            return []
        files = [ArtifactFile.from_path(path) for path in directory.glob(pattern) if slug in path.name]
        return sorted(files, key=lambda item: item.modified_at, reverse=True)

    @staticmethod
    def _latest_file(files: list[ArtifactFile]) -> ArtifactFile | None:
        return files[0] if files else None
