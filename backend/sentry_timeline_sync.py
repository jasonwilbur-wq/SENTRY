"""SENTRY Intel Timeline — scheduled idempotent sync.

Refreshes intel_signals from existing source tables (competitor_events,
incidents). Designed to run on a Windows Scheduled Task.

Safe by construction:
- Reads existing tables only; writes ONLY to intel_signals (additive).
- CREATE TABLE/VIEW IF NOT EXISTS makes it self-healing.
- UNIQUE(source_system, source_ref_id) + upsert => idempotent (no duplicates).
- NO per-run backup (the apply step already took one; this only upserts).
- Appends a timestamped line to sentry_timeline_sync.log (capped).

Run manually:  .venv\\Scripts\\python.exe sentry_timeline_sync.py
"""
import os
import sqlite3
import uuid
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(HERE, "data", "sentry.db")
LOG = os.path.join(HERE, "sentry_timeline_sync.log")
LOG_MAX_BYTES = 512 * 1024  # keep the log small

MIGRATION = """
CREATE TABLE IF NOT EXISTS intel_signals (
    id TEXT PRIMARY KEY,
    source_system TEXT NOT NULL,
    source_ref_id TEXT,
    signal_date TEXT,
    title TEXT,
    summary TEXT,
    entity_type TEXT,
    entity_name TEXT,
    matched_vendor_id TEXT,
    source_url TEXT,
    source_rating TEXT,
    classification TEXT,
    confidence TEXT,
    tags TEXT,
    ingested_at TEXT NOT NULL,
    UNIQUE(source_system, source_ref_id)
);
CREATE INDEX IF NOT EXISTS ix_intel_signals_date ON intel_signals(signal_date);
CREATE INDEX IF NOT EXISTS ix_intel_signals_vendor ON intel_signals(matched_vendor_id);
CREATE VIEW IF NOT EXISTS v_intel_timeline AS
SELECT s.*, v.company_name AS vendor_company_name
FROM intel_signals s
LEFT JOIN vendors v ON v.id = s.matched_vendor_id;
"""


def _cols(c, table):
    return {r[1] for r in c.execute(f"PRAGMA table_info({table})")}


def _tset(c):
    return {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type IN ('table','view')")}


def sync(c) -> int:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ex = _tset(c)
    n = 0
    if "competitor_events" in ex:
        cc = _cols(c, "competitor_events")
        g = lambda x: x if x in cc else "NULL"  # noqa: E731
        q = (f"SELECT id,{g('event_date')},{g('event_title')},{g('detailed_description')},"
             f"{g('matched_vendor_id')},{g('matched_vendor_name')},{g('source_link')},"
             f"{g('confidence_level')} FROM competitor_events")
        for rid, d, title, desc, vid, vname, url, conf in c.execute(q):
            c.execute("INSERT INTO intel_signals(id,source_system,source_ref_id,signal_date,title,summary,"
                      "entity_type,entity_name,matched_vendor_id,source_url,classification,confidence,ingested_at)"
                      " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_system,source_ref_id) DO UPDATE SET "
                      "title=excluded.title,summary=excluded.summary,confidence=excluded.confidence",
                      (str(uuid.uuid4()), "competitor_events", str(rid), d, title, desc, "competitor",
                       vname, vid, url, "ALLEGATION", conf, now))
            n += 1
    if "incidents" in ex:
        cc = _cols(c, "incidents")
        gi = lambda x: x if x in cc else "NULL"  # noqa: E731
        q = (f"SELECT id,{gi('incident_date')},{gi('summary')},{gi('impact')},{gi('source_url')},{gi('tags')} FROM incidents")
        for rid, d, summ, impact, url, tags in c.execute(q):
            c.execute("INSERT INTO intel_signals(id,source_system,source_ref_id,signal_date,title,summary,"
                      "entity_type,source_url,classification,tags,ingested_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
                      " ON CONFLICT(source_system,source_ref_id) DO UPDATE SET summary=excluded.summary,tags=excluded.tags",
                      (str(uuid.uuid4()), "incidents", str(rid), d, summ, impact, "incident", url, "FACT", tags, now))
            n += 1
    return n


def _log(line: str) -> None:
    try:
        if os.path.exists(LOG) and os.path.getsize(LOG) > LOG_MAX_BYTES:
            # keep the tail half
            with open(LOG, "rb") as fh:
                data = fh.read()[-LOG_MAX_BYTES // 2:]
            with open(LOG, "wb") as fh:
                fh.write(data)
        with open(LOG, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def main() -> int:
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    if not os.path.exists(LIVE):
        _log(f"{ts} ERROR db not found: {LIVE}")
        print("db not found:", LIVE)
        return 1
    c = sqlite3.connect(LIVE, timeout=30)
    try:
        c.executescript(MIGRATION)
        sync(c)
        c.commit()
        total = c.execute("SELECT COUNT(*) FROM intel_signals").fetchone()[0]
        by = dict(c.execute("SELECT source_system,COUNT(*) FROM intel_signals GROUP BY source_system"))
    finally:
        c.close()
    msg = f"{ts} OK total={total} by_source={by}"
    _log(msg)
    print(msg)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
