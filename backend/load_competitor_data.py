"""
load_competitor_data.py
=======================
One-time (re-runnable) loader that reads:
  C:/Users/j0w16ja/Documents/puppy_workspace/competitor_data/cleaned/competitor_analysis.json
and writes two tables into sentry.db:
  competitor_entities  — 135 rows, one per competitor
  competitor_events    — 1 113 rows, one per incident

Safe to re-run: uses DELETE + INSERT.
"""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

from database import init_db, get_connection

DB_PATH   = Path(__file__).parent / "data" / "sentry.db"
JSON_PATH = Path("C:/Users/j0w16ja/Documents/puppy_workspace/competitor_data/cleaned/competitor_analysis.json")

KEEP_CATS = {
    "Cyber", "ORC/Theft", "Recall", "Legal", "Strategic",
    "Operational", "Policy/Regulatory", "Compliance", "Fraud",
    "Labor", "Technology", "Major Incident", "Disruption",
    "Partnership", "Expansion", "Financial", "Other",
}


def threat_level(event_count: int, cyber_count: int) -> str:
    ratio = cyber_count / max(event_count, 1)
    if event_count >= 150 or ratio >= 0.20:
        return "High"
    if event_count >= 50 or ratio >= 0.10:
        return "Medium"
    return "Low"


def main() -> None:
    if not JSON_PATH.exists():
        raise FileNotFoundError(f"Source JSON not found: {JSON_PATH}")

    print(f"Reading {JSON_PATH}...")
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    incidents: list[dict]   = data["incidents"]
    competitors: list[dict] = data["competitors"]

    init_db()
    conn = get_connection()
    cur  = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS competitor_entities (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL UNIQUE,
            event_count     INTEGER DEFAULT 0,
            cyber_count     INTEGER DEFAULT 0,
            orc_count       INTEGER DEFAULT 0,
            recall_count    INTEGER DEFAULT 0,
            legal_count     INTEGER DEFAULT 0,
            strategic_count INTEGER DEFAULT 0,
            threat_level    TEXT DEFAULT 'Low',
            top_category    TEXT,
            categories_json TEXT,
            monthly_json    TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ce_competitor ON competitor_events(competitor);
        CREATE INDEX IF NOT EXISTS idx_ce_date       ON competitor_events(event_date);
        CREATE INDEX IF NOT EXISTS idx_ce_category   ON competitor_events(category);
    """)

    # ── Entities ─────────────────────────────────────────────────────
    cur.execute("DELETE FROM competitor_entities")
    entity_rows = []
    for comp in competitors:
        cats        = comp.get("categories", {})
        monthly     = comp.get("monthly", {})
        cyber_c     = int(cats.get("Cyber", 0))
        orc_c       = int(cats.get("ORC/Theft", 0))
        recall_c    = int(cats.get("Recall", 0))
        legal_c     = int(cats.get("Legal", 0))
        strategic_c = int(cats.get("Strategic", 0))
        ec          = int(comp.get("event_count", 0))
        top_cat     = max(cats, key=cats.get) if cats else None
        entity_rows.append((
            comp["name"], ec, cyber_c, orc_c, recall_c, legal_c, strategic_c,
            threat_level(ec, cyber_c), top_cat,
            json.dumps(cats), json.dumps(monthly),
        ))
    cur.executemany("""
        INSERT INTO competitor_entities
          (name,event_count,cyber_count,orc_count,recall_count,
           legal_count,strategic_count,threat_level,top_category,
           categories_json,monthly_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, entity_rows)
    print(f"  {len(entity_rows)} competitor entities loaded")

    # ── Events ───────────────────────────────────────────────────────
    cur.execute("DELETE FROM competitor_events")
    event_rows = []
    for inc in incidents:
        raw_cat  = (inc.get("Category") or "").strip()
        category = raw_cat if raw_cat in KEEP_CATS else "Other"
        event_rows.append((
            inc.get("Date"),
            inc.get("Competitor"),
            inc.get("Event_Title"),
            inc.get("Event_Type"),
            inc.get("Detailed_Description"),
            category,
            inc.get("Location"),
            inc.get("Security_Implication"),
            inc.get("Operational_Impact"),
            inc.get("Financial_Impact"),
            inc.get("Reputational_Impact"),
            inc.get("Source_Link"),
            inc.get("Analyst_Notes"),
            inc.get("Source_Month"),
        ))
    cur.executemany("""
        INSERT INTO competitor_events
          (event_date,competitor,event_title,event_type,detailed_description,
           category,location,security_implication,operational_impact,
           financial_impact,reputational_impact,source_link,
           analyst_notes,source_month)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, event_rows)
    print(f"  {len(event_rows)} competitor events loaded")

    conn.commit()
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()