"""Verify the vendor insights were added successfully."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

cursor.execute(
    "SELECT company_name, vendor_highlight, pros, cons, concerns "
    "FROM vendors WHERE pros != '' LIMIT 5"
)

print("\n🔍 Sample of enriched vendors:\n")
for row in cursor.fetchall():
    print(f"🏭 Vendor: {row[0]}")
    if row[1]:
        print(f"  🌟 Highlight: {row[1][:100]}...")
    print(f"  ✅ Pros: {row[2][:100]}...")
    print(f"  ⚠ Cons: {row[3][:100]}...")
    print(f"  🔒 Concerns: {row[4][:100]}...")
    print()

conn.close()
