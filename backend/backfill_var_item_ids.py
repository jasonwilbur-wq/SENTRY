"""Backfill missing var_reports.item_id values from report_catalog filename map."""

from __future__ import annotations

from database import get_connection
from report_catalog import ALL_ENTRIES


def main() -> None:
    filename_to_item = {filename: item_id for (filename, item_id, *_rest) in ALL_ENTRIES if item_id}

    conn = get_connection()
    rows = conn.execute(
        "SELECT id, filename FROM var_reports WHERE (item_id IS NULL OR item_id = '')"
    ).fetchall()

    updated = 0
    for row in rows:
        item_id = filename_to_item.get(row["filename"])
        if not item_id:
            continue
        conn.execute("UPDATE var_reports SET item_id = ? WHERE id = ?", (item_id, row["id"]))
        updated += 1

    conn.commit()
    conn.close()

    print(f"Missing rows scanned: {len(rows)}")
    print(f"item_id backfilled: {updated}")


if __name__ == "__main__":
    main()
