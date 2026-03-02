#!/usr/bin/env python3
"""
Merge Axiomtek entries - keep most recent data
"""
import sqlite3
from datetime import datetime

DB_PATH = 'data/sentry.db'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("\n" + "="*80)
print("Axiomtek Duplicate Check")
print("="*80 + "\n")

# Get both Axiomtek entries
cursor.execute("""
    SELECT id, company_name, overall_rating, category, last_assessed, 
           use_cases, value_to_walmart, maturity_level, technology_product,
           risk_level, vendor_status, has_var
    FROM vendors 
    WHERE company_name LIKE '%Axiomtek%'
    ORDER BY last_assessed DESC
""")

rows = cursor.fetchall()

print(f"Found {len(rows)} Axiomtek entries:\n")

for i, row in enumerate(rows, 1):
    print(f"Entry #{i}:")
    print(f"  ID: {row['id']}")
    print(f"  Company: {row['company_name']}")
    print(f"  Overall Rating: {row['overall_rating']}")
    print(f"  Category: {row['category']}")
    print(f"  Last Assessed: {row['last_assessed']}")
    print(f"  Maturity Level: {row['maturity_level']}")
    print(f"  Use Cases: {row['use_cases'][:100] if row['use_cases'] else 'None'}...")
    print(f"  Value to Walmart: {row['value_to_walmart'][:100] if row['value_to_walmart'] else 'None'}...")
    print(f"  Technology/Product: {row['technology_product'][:100] if row['technology_product'] else 'None'}...")
    print(f"  Risk Level: {row['risk_level']}")
    print(f"  Status: {row['vendor_status']}")
    print(f"  Has VAR: {row['has_var']}")
    print()

if len(rows) >= 2:
    most_recent = rows[0]
    older = rows[1]
    
    print("\n" + "="*80)
    print("RECOMMENDATION:")
    print("="*80)
    print(f"\nMost Recent Entry: {most_recent['id']} (Last Assessed: {most_recent['last_assessed']})")
    print(f"Older Entry: {older['id']} (Last Assessed: {older['last_assessed']})")
    print("\nAction: Delete older entry and keep the most recent one")
    
    # Delete the older entry
    print(f"\nDeleting older entry: {older['id']}...")
    cursor.execute("DELETE FROM vendors WHERE id = ?", (older['id'],))
    conn.commit()
    print(f"✅ Deleted! Removed {cursor.rowcount} record(s)")
    
    # Verify
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE company_name LIKE '%Axiomtek%'")
    count = cursor.fetchone()[0]
    print(f"\n✅ Now {count} Axiomtek entry remains in database")
    
    # Show final entry
    cursor.execute("""
        SELECT id, company_name, overall_rating, last_assessed
        FROM vendors 
        WHERE company_name LIKE '%Axiomtek%'
    """)
    final = cursor.fetchone()
    print(f"\nFinal Axiomtek Entry:")
    print(f"  ID: {final['id']}")
    print(f"  Company: {final['company_name']}")
    print(f"  Overall Rating: {final['overall_rating']}")
    print(f"  Last Assessed: {final['last_assessed']}")

conn.close()
print("\n" + "="*80)
print("Complete!")
print("="*80 + "\n")
