#!/usr/bin/env python3
"""
Fix vendors with incorrect 5.0 scores

These vendors have placeholder/boilerplate data and should not be scored as perfect.
Recommended score: 3.5 (Market-Ready, Low Risk, but ongoing validation)
"""
import sqlite3
from datetime import datetime

DB_PATH = 'data/sentry.db'

# Create backup first
backup_file = f'data/sentry.db.backup_5point0_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
import shutil
shutil.copy(DB_PATH, backup_file)
print(f"\n✅ Backup created: {backup_file}\n")

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("="*100)
print("FIXING VENDORS WITH INCORRECT 5.0 SCORES")
print("="*100 + "\n")

# Get the three vendors with 5.0 scores
vendors_to_fix = [
    ('a8f5e3a6850f', 'LVT (LiveView Technologies)'),
    ('4ca7f3ab6d62', 'RAD (Robotic Assistance Devices)'),
    ('a537b10d6b67', 'Sun Surveillance')
]

NEW_SCORE = 3.5

print(f"Updating {len(vendors_to_fix)} vendors from 5.0 to {NEW_SCORE}:\n")

for vendor_id, vendor_name in vendors_to_fix:
    # Get current score
    cursor.execute('SELECT overall_rating FROM vendors WHERE id = ?', (vendor_id,))
    result = cursor.fetchone()
    
    if result:
        old_score = result['overall_rating']
        print(f"  🏢 {vendor_name}")
        print(f"    ID: {vendor_id}")
        print(f"    Old Score: {old_score} ❌")
        print(f"    New Score: {NEW_SCORE} ✅")
        
        # Update the score
        cursor.execute("""
            UPDATE vendors
            SET overall_rating = ?
            WHERE id = ?
        """, (NEW_SCORE, vendor_id))
        
        print(f"    ✅ Updated!\n")
    else:
        print(f"  ⚠️  Vendor not found: {vendor_name} ({vendor_id})\n")

conn.commit()

# Verify changes
print("\n" + "="*100)
print("VERIFICATION")
print("="*100 + "\n")

cursor.execute("""
    SELECT COUNT(*) as count
    FROM vendors
    WHERE overall_rating = 5.0
""")

remaining_5s = cursor.fetchone()['count']

print(f"Vendors remaining with 5.0 score: {remaining_5s}")

if remaining_5s == 0:
    print("✅ All 5.0 scores have been corrected!\n")
else:
    print(f"⚠️  {remaining_5s} vendors still have 5.0 scores (manual review needed)\n")

# Show updated vendors
print("\nUpdated vendor scores:\n")

for vendor_id, vendor_name in vendors_to_fix:
    cursor.execute("""
        SELECT company_name, overall_rating, category, last_assessed
        FROM vendors
        WHERE id = ?
    """, (vendor_id,))
    
    vendor = cursor.fetchone()
    if vendor:
        print(f"  ✅ {vendor['company_name']}: {vendor['overall_rating']}")
        print(f"     Category: {vendor['category']}")
        print(f"     Last Assessed: {vendor['last_assessed']}")
        print()

conn.close()

print("="*100)
print("✅ SCORE FIX COMPLETE")
print("="*100)
print("\nRationale for 3.5 score:")
print("  - Market-Ready maturity level")
print("  - Low risk level")
print("  - BUT: Security validation in progress")
print("  - BUT: Cost-benefit analysis pending")
print("  - BUT: Technical review underway")
print("\n3.5 indicates strong potential while accounting for ongoing due diligence.")
print("\nNext step: Refresh SENTRY to see corrected scores!\n")
