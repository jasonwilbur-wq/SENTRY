"""Inspect current VAR linkage state in the SENTRY database."""
import sqlite3
import sys

DB = r"C:\Users\j0w16ja\SENTRY_v2-main\backend\data\sentry.db"

c = sqlite3.connect(DB)
c.row_factory = sqlite3.Row

print("=== VAR REPORTS IN DB ===")
rows = c.execute("""
    SELECT vr.id, vr.filename, vr.vendor_id, vr.overall_score,
           vr.decision_band, vr.match_method, v.company_name
    FROM var_reports vr
    LEFT JOIN vendors v ON vr.vendor_id = v.id
    ORDER BY vr.report_date DESC
""").fetchall()

for r in rows:
    score = f"{r['overall_score']:.2f}" if r["overall_score"] else "NULL"
    name  = r["company_name"] or "ORPHAN"
    print(f"{r['filename'][:52]:<52} | {score:>6} | {name:<32} | {r['match_method']}")

print()
print(f"Total VAR records : {len(rows)}")

# Vendors with VARs
v_with_var = c.execute("SELECT COUNT(DISTINCT vendor_id) FROM var_reports").fetchone()[0]
total_v    = c.execute("SELECT COUNT(*) FROM vendors").fetchone()[0]
print(f"Vendors with VARs  : {v_with_var} / {total_v}")

# Orphaned var_reports
orphans = c.execute("""
    SELECT vr.filename, vr.vendor_id
    FROM var_reports vr
    LEFT JOIN vendors v ON vr.vendor_id = v.id
    WHERE v.id IS NULL
""").fetchall()
print(f"Orphaned VARs      : {len(orphans)}")
for o in orphans:
    print(f"  - {o['filename']}  vendor_id={o['vendor_id']}")

# Duplicate vendor+tech combos
print()
print("=== MULTI-VAR VENDORS ===")
dupes = c.execute("""
    SELECT v.company_name, COUNT(*) as cnt, GROUP_CONCAT(vr.filename, ' | ') as files
    FROM var_reports vr
    JOIN vendors v ON vr.vendor_id = v.id
    GROUP BY vr.vendor_id
    HAVING cnt > 1
""").fetchall()
if dupes:
    for d in dupes:
        print(f"  {d['company_name']}: {d['cnt']} VARs")
        for f in d["files"].split(" | "):
            print(f"    - {f}")
else:
    print("  None (every vendor has exactly 1 VAR)")

c.close()
