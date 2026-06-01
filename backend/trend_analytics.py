"""SENTRY shared trend-analytics engine (V1+V2+V3).

Domain-agnostic time-series analytics used by both the Incident and Regulatory
intelligence pipelines. Pure functions, no I/O, no DB — callers normalize their
rows into a flat list of ``TrendEvent``-shaped dicts and pass them in.

Capabilities:
  * Period bucketing (monthly / quarterly)
  * Raw + severity/RAG-WEIGHTED series                       (V2)
  * Period-over-period deltas + direction + pct change       (V1)
  * 3-period rolling average (momentum smoothing)            (V1)
  * Anomaly / spike flags (mean + N*sigma)                   (V3)
  * Top movers by category (last period vs previous)         (V1)

An *event* is a dict: ``{"date": str, "weight": float, "category": str}``.
``date`` may be any ISO-ish string; un-parseable dates are skipped.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from statistics import mean, pstdev

# Plausibility window for dates. Regulatory effective_dates contain noise
# (years like 1905 and 6946) — anything outside this band is dropped so it
# can't pollute trend buckets. Override per call via analyze(min_year=...).
DEFAULT_MIN_YEAR = 2018
DEFAULT_MAX_YEAR = datetime.now().year + 5

# ── Standard weighting tables (severity ≠ volume) ──────────────────────────

SEVERITY_WEIGHTS: dict[str, float] = {
    "Critical": 4.0, "High": 3.0, "Medium": 2.0, "Low": 1.0,
}
RAG_WEIGHTS: dict[str, float] = {
    "Red": 4.0, "Amber": 3.0, "Yellow": 2.0, "Green": 1.0,
}


# ── Date helpers ───────────────────────────────────────────────────────────

def parse_date(
    value: str | None,
    min_year: int = DEFAULT_MIN_YEAR,
    max_year: int = DEFAULT_MAX_YEAR,
) -> datetime | None:
    """Best-effort ISO date parse with a plausibility window.

    Returns None for empty/garbage dates AND dates outside [min_year, max_year]
    — this strips the 1905/6946 noise in regulatory effective_dates.
    """
    if not value:
        return None
    text = str(value).strip()
    # Try full ISO first, then date-only.
    for candidate in (text, text[:10]):
        try:
            dt = datetime.fromisoformat(candidate)
        except ValueError:
            continue
        if min_year <= dt.year <= max_year:
            return dt
        return None
    return None


def bucket_key(dt: datetime, frequency: str) -> str:
    """Map a datetime to a period bucket label."""
    if frequency == "quarterly":
        return f"{dt.year}-Q{((dt.month - 1) // 3) + 1}"
    if frequency == "daily":
        return dt.strftime("%Y-%m-%d")
    return dt.strftime("%Y-%m")  # monthly default


# ── Core series construction ───────────────────────────────────────────────

def build_series(
    events: list[dict],
    frequency: str = "monthly",
    recent: int | None = None,
) -> list[dict]:
    """Bucket events into a sorted [{period, count, weighted}] series.

    If ``recent`` is set, only the most recent N periods are returned.
    """
    counts: Counter[str] = Counter()
    weighted: defaultdict[str, float] = defaultdict(float)

    for ev in events:
        dt = parse_date(ev.get("date"))
        if not dt:
            continue
        key = bucket_key(dt, frequency)
        counts[key] += 1
        weighted[key] += float(ev.get("weight") or 0.0)

    periods = sorted(counts)
    if recent is not None and recent > 0:
        periods = periods[-recent:]
    return [
        {"period": period, "count": counts[period], "weighted": round(weighted[period], 2)}
        for period in periods
    ]


def _direction(delta: float) -> str:
    if delta > 0:
        return "up"
    if delta < 0:
        return "down"
    return "flat"


def with_deltas(series: list[dict], field: str = "count") -> list[dict]:
    """Add period-over-period delta, pct_change, and direction to each point."""
    out: list[dict] = []
    prev: float | None = None
    for point in series:
        cur = float(point.get(field, 0))
        delta = 0.0 if prev is None else cur - prev
        pct = None
        if prev not in (None, 0):
            pct = round((delta / prev) * 100, 1)
        enriched = dict(point)
        enriched["delta"] = round(delta, 2)
        enriched["pct_change"] = pct
        enriched["direction"] = _direction(delta) if prev is not None else "flat"
        out.append(enriched)
        prev = cur
    return out


def with_rolling(series: list[dict], window: int = 3, field: str = "count") -> list[dict]:
    """Add a trailing rolling average (momentum smoothing)."""
    out: list[dict] = []
    for i, point in enumerate(series):
        window_vals = [float(p.get(field, 0)) for p in series[max(0, i - window + 1): i + 1]]
        enriched = dict(point)
        enriched["rolling_avg"] = round(mean(window_vals), 2) if window_vals else 0.0
        out.append(enriched)
    return out


def with_anomalies(series: list[dict], sigma: float = 2.0, field: str = "count") -> list[dict]:
    """Flag points exceeding mean + sigma*stddev as spikes (V3)."""
    values = [float(p.get(field, 0)) for p in series]
    out: list[dict] = []
    if len(values) < 3:
        for point in series:
            enriched = dict(point)
            enriched["is_anomaly"] = False
            enriched["zscore"] = 0.0
            out.append(enriched)
        return out

    mu = mean(values)
    sd = pstdev(values) or 0.0
    threshold = mu + sigma * sd
    for point in series:
        val = float(point.get(field, 0))
        z = round((val - mu) / sd, 2) if sd else 0.0
        enriched = dict(point)
        enriched["is_anomaly"] = bool(sd and val > threshold)
        enriched["zscore"] = z
        out.append(enriched)
    return out


def top_movers(
    events: list[dict],
    frequency: str = "monthly",
    limit: int = 5,
) -> list[dict]:
    """Compare the latest period vs the previous period, by category.

    Returns categories sorted by absolute change — the biggest growers and
    shrinkers ("what changed since last month").
    """
    # Find the two most recent periods present in the data.
    periods: set[str] = set()
    for ev in events:
        dt = parse_date(ev.get("date"))
        if dt:
            periods.add(bucket_key(dt, frequency))
    ordered = sorted(periods)
    if len(ordered) < 2:
        return []
    latest, previous = ordered[-1], ordered[-2]
    cur: Counter[str] = Counter()
    prev: Counter[str] = Counter()
    for ev in events:
        dt = parse_date(ev.get("date"))
        if not dt:
            continue
        key = bucket_key(dt, frequency)
        cat = ev.get("category") or "Other"
        if key == latest:
            cur[cat] += 1
        elif key == previous:
            prev[cat] += 1

    movers: list[dict] = []
    for cat in set(cur) | set(prev):
        c, p = cur.get(cat, 0), prev.get(cat, 0)
        delta = c - p
        pct = round((delta / p) * 100, 1) if p else None
        movers.append({
            "category": cat,
            "current": c,
            "previous": p,
            "delta": delta,
            "pct_change": pct,
            "direction": _direction(delta),
        })

    movers.sort(key=lambda m: abs(m["delta"]), reverse=True)
    return movers[:limit]


def summarize(series: list[dict], field: str = "count") -> dict:
    """High-level momentum summary for the 'What Changed' strip (V1)."""
    if not series:
        return {
            "latest_period": None, "latest_value": 0, "previous_value": 0,
            "delta": 0, "pct_change": None, "direction": "flat",
            "anomaly_count": 0,
        }
    enriched = with_anomalies(with_deltas(series, field=field), field=field)
    last = enriched[-1]
    prev_val = float(enriched[-2][field]) if len(enriched) > 1 else 0.0
    return {
        "latest_period": last["period"],
        "latest_value": last.get(field, 0),
        "previous_value": prev_val,
        "delta": last.get("delta", 0),
        "pct_change": last.get("pct_change"),
        "direction": last.get("direction", "flat"),
        "anomaly_count": sum(1 for p in enriched if p.get("is_anomaly")),
    }


def analyze(
    events: list[dict],
    frequency: str = "monthly",
    sigma: float = 2.0,
    rolling_window: int = 3,
    movers_limit: int = 5,
    recent: int | None = None,
) -> dict:
    """Full trend payload: enriched count + weighted series, movers, summary.

    ``recent`` caps the series to the most recent N periods (e.g. 24 months)
    so sparse ancient data points don't stretch the timeline.
    """
    count_series = build_series(events, frequency=frequency, recent=recent)
    count_enriched = with_anomalies(
        with_rolling(with_deltas(count_series, field="count"), window=rolling_window, field="count"),
        sigma=sigma, field="count",
    )
    weighted_enriched = with_rolling(
        with_deltas(count_series, field="weighted"), window=rolling_window, field="weighted",
    )
    return {
        "frequency": frequency,
        "series": count_enriched,
        "weighted_series": weighted_enriched,
        "top_movers": top_movers(events, frequency=frequency, limit=movers_limit),
        "summary": summarize(count_series, field="count"),
        "weighted_summary": summarize(count_series, field="weighted"),
    }
