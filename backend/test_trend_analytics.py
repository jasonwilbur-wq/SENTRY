"""Tests for the shared trend-analytics engine."""
import trend_analytics as ta


def _events():
    # 3 months of data with growing critical share.
    return [
        {"date": "2026-01-05", "weight": 1.0, "category": "ORC"},
        {"date": "2026-01-15", "weight": 2.0, "category": "Cargo Theft"},
        {"date": "2026-02-10", "weight": 3.0, "category": "ORC"},
        {"date": "2026-02-12", "weight": 4.0, "category": "Cyber Incident"},
        {"date": "2026-03-01", "weight": 4.0, "category": "ORC"},
        {"date": "2026-03-02", "weight": 4.0, "category": "ORC"},
        {"date": "2026-03-03", "weight": 4.0, "category": "Cyber Incident"},
    ]


def test_parse_date_handles_garbage():
    assert ta.parse_date("") is None
    assert ta.parse_date("not-a-date") is None
    assert ta.parse_date("2026-03-01") is not None
    assert ta.parse_date("2026-03-01T12:00:00") is not None


def test_parse_date_plausibility_window():
    # Ancient + far-future dates (the 1905 / 6946 regulatory noise) are dropped.
    assert ta.parse_date("1905-06-01") is None
    assert ta.parse_date("6946-01-01") is None
    # Custom window still honoured.
    assert ta.parse_date("1905-06-01", min_year=1900) is not None


def test_build_series_recent_cap():
    events = [{"date": f"2024-{m:02d}-01", "weight": 1.0, "category": "X"} for m in range(1, 13)]
    series = ta.build_series(events, frequency="monthly", recent=3)
    assert len(series) == 3
    assert series[-1]["period"] == "2024-12"
    assert series[0]["period"] == "2024-10"


def test_bucket_key_frequencies():
    dt = ta.parse_date("2026-03-15")
    assert ta.bucket_key(dt, "monthly") == "2026-03"
    assert ta.bucket_key(dt, "quarterly") == "2026-Q1"
    assert ta.bucket_key(dt, "daily") == "2026-03-15"


def test_build_series_counts_and_weights():
    series = ta.build_series(_events(), frequency="monthly")
    assert [p["period"] for p in series] == ["2026-01", "2026-02", "2026-03"]
    assert series[0]["count"] == 2
    assert series[2]["count"] == 3
    assert series[2]["weighted"] == 12.0  # 4+4+4


def test_with_deltas():
    series = ta.build_series(_events(), frequency="monthly")
    enriched = ta.with_deltas(series, field="count")
    assert enriched[0]["delta"] == 0.0
    assert enriched[0]["direction"] == "flat"
    assert enriched[2]["delta"] == 1.0  # 3 vs 2
    assert enriched[2]["direction"] == "up"
    assert enriched[2]["pct_change"] == 50.0


def test_rolling_average():
    series = ta.build_series(_events(), frequency="monthly")
    rolled = ta.with_rolling(series, window=3, field="count")
    assert rolled[-1]["rolling_avg"] == round((2 + 2 + 3) / 3, 2)


def test_anomaly_flags():
    # Steady baseline of ~5/month, then a clear spike that doesn't dominate
    # its own mean/stddev (needs enough baseline periods).
    events = []
    for m in range(1, 10):  # Jan-Sep, 5 each
        events += [{"date": f"2026-{m:02d}-01", "weight": 1.0, "category": "X"} for _ in range(5)]
    events += [{"date": "2026-10-01", "weight": 1.0, "category": "X"} for _ in range(30)]
    series = ta.build_series(events, frequency="monthly")
    flagged = ta.with_anomalies(series, sigma=2.0, field="count")
    assert flagged[-1]["is_anomaly"] is True
    assert all(p["is_anomaly"] is False for p in flagged[:-1])


def test_top_movers():
    movers = ta.top_movers(_events(), frequency="monthly", limit=5)
    cats = {m["category"]: m for m in movers}
    assert cats["ORC"]["current"] == 2
    assert cats["ORC"]["previous"] == 1
    assert cats["ORC"]["delta"] == 1


def test_summarize():
    series = ta.build_series(_events(), frequency="monthly")
    summary = ta.summarize(series, field="count")
    assert summary["latest_period"] == "2026-03"
    assert summary["latest_value"] == 3
    assert summary["previous_value"] == 2
    assert summary["direction"] == "up"


def test_analyze_full_payload():
    payload = ta.analyze(_events(), frequency="monthly")
    assert set(payload) >= {
        "frequency", "series", "weighted_series",
        "top_movers", "summary", "weighted_summary",
    }
    assert payload["frequency"] == "monthly"
    assert len(payload["series"]) == 3


def test_empty_events_safe():
    payload = ta.analyze([], frequency="monthly")
    assert payload["series"] == []
    assert payload["top_movers"] == []
    assert payload["summary"]["latest_period"] is None
