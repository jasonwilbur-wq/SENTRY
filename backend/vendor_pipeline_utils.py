"""Helpers for vendor assessment pipeline-stage derivation."""

from __future__ import annotations

import math


def _pipeline_stage(
    pre_decision: str | None,
    initial: str | None,
    technical: str | None,
    has_var_scored: bool,
) -> int:
    """Return 0-4 representing how far in the pipeline this product is.

    0 = not started
    1 = pre-assessment captured
    2 = initial assessment captured
    3 = technical assessment captured
    4 = VAR score extraction complete
    """
    if has_var_scored:
        return 4

    technical_value = str(technical or "").strip().lower()
    if technical_value in {"yes", "documented", "complete", "completed", "assessed"}:
        return 3

    initial_value = str(initial or "").strip().lower()
    if initial_value in {"pass", "yes", "tracked", "complete", "completed", "assessed"}:
        return 2

    if str(pre_decision or "").strip():
        return 1

    return 0


def _has_structured_var_score(weight_score: float | None, var_scores: dict | None) -> bool:
    """True when a structured VAR score exists for a vendor payload."""
    if isinstance(weight_score, (int, float)) and math.isfinite(float(weight_score)):
        return True

    if not isinstance(var_scores, dict):
        return False

    overall = var_scores.get("Overall")
    return isinstance(overall, (int, float)) and math.isfinite(float(overall))
