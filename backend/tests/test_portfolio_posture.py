"""Tests for the portfolio posture grade helper (pure, DB-free)."""
from __future__ import annotations

from portfolio_routes import _grade


def test_grade_bands_by_lower_bound():
    assert _grade(5.0) == "A"
    assert _grade(4.5) == "A"
    assert _grade(4.49) == "B"
    assert _grade(3.5) == "B"
    assert _grade(3.49) == "C"
    assert _grade(2.5) == "C"
    assert _grade(2.49) == "D"
    assert _grade(1.5) == "D"
    assert _grade(1.49) == "F"
    assert _grade(0.0) == "F"


def test_grade_clamps_out_of_range():
    assert _grade(9.0) == "A"
    assert _grade(-2.0) == "F"


def test_grade_none_is_f():
    assert _grade(None) == "F"
