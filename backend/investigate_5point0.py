#!/usr/bin/env python3
"""
Investigate vendors with 5.0 scores and recommend corrections
"""
import sqlite3

DB_PATH = 'data/sentry.db'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("\n" + "="*100)
print("INVESTIGATING VENDORS WITH 5.0 SCORES")
print("="*100 + "\n")

# Get vendors with 5.0 rating
cursor.execute("""
    SELECT id, company_name, overall_rating, category, last_assessed,
           technology_product, use_cases, value_to_walmart,
           maturity_level, risk_level, vendor_status, pros, cons, concerns
    FROM vendors
    WHERE overall_rating >= 5.0
    ORDER BY company_name
""")

vendors = cursor.fetchall()

print(f"Found {len(vendors)} vendors with 5.0 rating:\n")

for vendor in vendors:
    print("="*100)
    print(f"\n🏢 {vendor['company_name']}")
    print("="*100)
    print(f"  ID: {vendor['id']}")
    print(f"  Overall Rating: {vendor['overall_rating']}")
    print(f"  Category: {vendor['category']}")
    print(f"  Last Assessed: {vendor['last_assessed']}")
    print(f"  Maturity: {vendor['maturity_level']}")
    print(f"  Risk Level: {vendor['risk_level']}")
    print(f"  Status: {vendor['vendor_status']}")
    print()
    print(f"  Technology:")
    print(f"    {vendor['technology_product'] if vendor['technology_product'] else 'None'}")
    print()
    print(f"  Use Cases:")
    print(f"    {vendor['use_cases'] if vendor['use_cases'] else 'None'}")
    print()
    print(f"  Value to Walmart:")
    print(f"    {vendor['value_to_walmart'] if vendor['value_to_walmart'] else 'None'}")
    print()
    print(f"  Pros:")
    print(f"    {vendor['pros'] if vendor['pros'] else 'None'}")
    print()
    print(f"  Cons:")
    print(f"    {vendor['cons'] if vendor['cons'] else 'None'}")
    print()
    print(f"  Concerns:")
    print(f"    {vendor['concerns'] if vendor['concerns'] else 'None'}")
    print()
    
    # Analysis
    print("  📊 Analysis:")
    
    # A 5.0 score is PERFECT - extremely rare
    # Most vendors should be in the 2.0-4.0 range
    # Check risk level and maturity for clues
    
    issues = []
    
    if vendor['risk_level'] and vendor['risk_level'] not in ['Low', 'Very Low']:
        issues.append(f"Risk level is '{vendor['risk_level']}' (not Low) - unlikely to be 5.0")
    
    if vendor['maturity_level'] and vendor['maturity_level'] not in ['Mature', 'Market-Ready']:
        issues.append(f"Maturity is '{vendor['maturity_level']}' - unlikely to be perfect 5.0")
    
    if vendor['cons'] and len(vendor['cons']) > 10:
        issues.append(f"Has documented cons - unlikely to be perfect 5.0")
    
    if vendor['concerns'] and len(vendor['concerns']) > 10:
        issues.append(f"Has documented concerns - unlikely to be perfect 5.0")
    
    # If assessed in Sept 2025, likely from old data
    if vendor['last_assessed'] == '9/17/2025':
        issues.append("Assessed 9/17/2025 - may be placeholder or import artifact")
    
    if issues:
        print(f"    ❌ Issues found ({len(issues)}):")
        for issue in issues:
            print(f"      - {issue}")
        print()
        print(f"    ✅ RECOMMENDATION: Review source data and recalculate score")
        print(f"    🛠️  Suggested range based on profile: 3.0-4.0")
    else:
        print(f"    ❓ No obvious issues, but 5.0 is still extremely rare")
        print(f"    🔍 Recommend manual review of assessment data")
    
    print()

print("\n" + "="*100)
print("SUMMARY")
print("="*100)
print(f"\nTotal vendors with 5.0 score: {len(vendors)}")
print("\nA perfect 5.0 score is extremely rare and indicates:")
print("  - Perfect compliance")
print("  - Zero risk")
print("  - Mature product")
print("  - Seamless integration")
print("  - Perfect ROI")
print("  - No concerns or cons")
print("\nMost enterprise vendors score between 2.5-4.0.")
print("\nRecommendation: Review source assessment data (202601/202602 Excel files)")
print("and recalculate scores based on actual assessment criteria.\n")

conn.close()
