"""CSO executive-profile store (SQLite-backed source of truth).

Promotes the formerly-static frontend `csoProfiles.ts` data into the database so
it can be updated without a code deploy. Profiles are stored as JSON payloads
(the rich nested ExecutiveProfile shape) plus provenance columns.

Write path is governed: only `import_from_handoff_bundle` mutates rows, and it
accepts only analyst-approved, verified signals from the Executive Signal Scout
handoff bundle. First boot seeds from the exported curated snapshot.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

from database import get_connection

SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "cso_profiles_seed.json")

CREATE_CSO_PROFILES = """
CREATE TABLE IF NOT EXISTS cso_profiles (
    id          TEXT PRIMARY KEY,
    payload     TEXT NOT NULL,
    source      TEXT DEFAULT 'seed',
    updated_at  TEXT DEFAULT (datetime('now')),
    updated_by  TEXT DEFAULT 'system'
);
"""


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_store() -> None:
    """Create the table and seed it once from the curated snapshot."""
    with get_connection() as conn:
        conn.execute(CREATE_CSO_PROFILES)
        conn.commit()
        existing = conn.execute("SELECT COUNT(*) AS n FROM cso_profiles").fetchone()["n"]
        if existing == 0:
            _seed(conn)


def _seed(conn) -> None:
    if not os.path.exists(SEED_PATH):
        return
    with open(SEED_PATH, encoding="utf-8") as fh:
        data = json.load(fh)
    rows = [
        (p["id"], json.dumps(p, ensure_ascii=False), "seed", _utc_now(), "seed")
        for p in data.get("profiles", [])
    ]
    conn.executemany(
        "INSERT OR REPLACE INTO cso_profiles (id, payload, source, updated_at, updated_by) "
        "VALUES (?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()


def get_all_profiles() -> list[dict[str, Any]]:
    """Return all stored profiles (parsed payloads), newest-updated first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT payload FROM cso_profiles ORDER BY updated_at DESC"
        ).fetchall()
    return [json.loads(r["payload"]) for r in rows]


def get_profile(profile_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT payload FROM cso_profiles WHERE id = ?", (profile_id,)
        ).fetchone()
    return json.loads(row["payload"]) if row else None


def store_meta() -> dict[str, Any]:
    """Counts + provenance for the read API + UI freshness."""
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) AS n FROM cso_profiles").fetchone()["n"]
        by_source = {
            r["source"]: r["n"]
            for r in conn.execute(
                "SELECT source, COUNT(*) AS n FROM cso_profiles GROUP BY source"
            ).fetchall()
        }
        latest = conn.execute(
            "SELECT MAX(updated_at) AS m FROM cso_profiles"
        ).fetchone()["m"]
    return {"total": total, "by_source": by_source, "last_updated": latest}


def upsert_profile(profile: dict[str, Any], *, source: str, updated_by: str) -> None:
    """Insert/replace a single profile payload. Governed write path only."""
    if not profile.get("id"):
        raise ValueError("profile payload requires an 'id'")
    with get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO cso_profiles (id, payload, source, updated_at, updated_by) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                profile["id"],
                json.dumps(profile, ensure_ascii=False),
                source,
                _utc_now(),
                updated_by,
            ),
        )
        conn.commit()
