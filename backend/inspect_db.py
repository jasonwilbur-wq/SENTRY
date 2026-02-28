"""Dump DB schema + vendor sample to understand the data model."""
import sqlite3

DB = r"C:\Users\j0w16ja\SENTRY_v2-main\backend\data\sentry.db"
c = sqlite3.connect(DB)
c.row_factory = sqlite3.Row

print("=== SCHEMA ===")
for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
    print(f"\n-- {t[0]} --")
    for col in c.execute(f"PRAGMA table_info({t[0]})").fetchall():
        print(f"  {col['name']:<30} {col['type']}")

print()
print("=== VENDOR SAMPLE (first 15) ===")
for r in c.execute(
    "SELECT id, company_name, category, vendor_status FROM vendors LIMIT 15"
).fetchall():
    print(f"  {r['id']}  {r['company_name']:<40} {r['category']:<35} {r['vendor_status']}")

print()
total_v = c.execute("SELECT COUNT(*) FROM vendors").fetchone()[0]
print(f"Total vendors: {total_v}")

print()
print("=== CATEGORIES ===")
for r in c.execute(
    "SELECT category, COUNT(*) as cnt FROM vendors GROUP BY category ORDER BY cnt DESC LIMIT 20"
).fetchall():
    print(f"  {r['cnt']:3d}  {r['category']}")

c.close()
