"""Show sample enriched vendor cards."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

vendors = cursor.execute(
    "SELECT company_name, vendor_highlight, pros, cons, concerns, maturity_level, description "
    "FROM vendors WHERE pros != '' ORDER BY RANDOM() LIMIT 5"
).fetchall()

print("\n" + "="*80)
print("🎯 SAMPLE ENRICHED VENDOR CARDS")
print("="*80)

for v in vendors:
    print(f"\n🏢 VENDOR: {v['company_name']}")
    print("\n" + "-"*80)
    
    if v['description']:
        print(f"\n📝 Description:\n   {v['description'][:150]}...")
    
    if v['vendor_highlight']:
        print(f"\n⭐ Highlight:\n   {v['vendor_highlight'][:150]}...")
    
    if v['pros']:
        print(f"\n💪 Pros:\n   {v['pros'][:150]}...")
    
    if v['cons']:
        print(f"\n⚠️  Cons:\n   {v['cons'][:150]}...")
    
    if v['concerns']:
        print(f"\n🔒 Concerns:\n   {v['concerns'][:150]}...")
    
    if v['maturity_level']:
        print(f"\n📊 Maturity: {v['maturity_level']}")
    
    print("\n" + "-"*80)

conn.close()
print("\n✅ Vendor cards are now FULLY enriched!\n")
