#!/usr/bin/env python3
"""
SENTRY Vendor Deduplication & Data Quality Check

Methodical approach:
1. Find duplicate company names
2. Distinguish between duplicates vs. multiple products
3. Keep most recent data for true duplicates
4. Fix score anomalies (scores > 5.0)
5. Generate detailed report for review

Author: Atlas (Code Puppy)
Date: 2026-03-02
"""

import sqlite3
import re
from collections import defaultdict
from datetime import datetime
import json

DB_PATH = 'data/sentry.db'

def normalize_company_name(name):
    """Normalize company name for matching"""
    if not name:
        return ""
    # Remove common suffixes, lowercase, strip
    name = name.lower().strip()
    name = re.sub(r'\s+(inc\.?|corp\.?|ltd\.?|llc|co\.?)$', '', name)
    name = re.sub(r'\s+', ' ', name)  # Normalize whitespace
    return name

def parse_date(date_str):
    """Parse various date formats to comparable value"""
    if not date_str:
        return datetime(1900, 1, 1)
    
    # Try YYYYMM format
    if isinstance(date_str, str) and len(date_str) == 6 and date_str.isdigit():
        try:
            year = int(date_str[:4])
            month = int(date_str[4:])
            return datetime(year, month, 1)
        except:
            pass
    
    # Try M/D/YYYY format
    if isinstance(date_str, str) and '/' in date_str:
        try:
            parts = date_str.split('/')
            if len(parts) == 3:
                month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
                return datetime(year, month, day)
        except:
            pass
    
    return datetime(1900, 1, 1)

def is_same_product(tech1, tech2):
    """Check if two technology/product descriptions are the same"""
    if not tech1 or not tech2:
        return False
    
    # Normalize and compare
    t1 = normalize_company_name(tech1)
    t2 = normalize_company_name(tech2)
    
    # If significantly different, they're different products
    if len(t1) > 10 and len(t2) > 10:
        # Check for substring match (80% overlap)
        shorter = min(t1, t2, key=len)
        longer = max(t1, t2, key=len)
        if shorter in longer or longer in shorter:
            return True
    
    return t1 == t2

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("\n" + "="*100)
    print("SENTRY VENDOR DEDUPLICATION & DATA QUALITY CHECK")
    print("="*100 + "\n")
    
    # Get all vendors
    cursor.execute("""
        SELECT id, company_name, overall_rating, category, last_assessed,
               technology_product, use_cases, value_to_walmart, maturity_level,
               risk_level, vendor_status, has_var
        FROM vendors
        ORDER BY company_name
    """)
    
    vendors = cursor.fetchall()
    print(f"Total Vendors in Database: {len(vendors):,}\n")
    
    # Group by normalized company name
    company_groups = defaultdict(list)
    for vendor in vendors:
        normalized = normalize_company_name(vendor['company_name'])
        company_groups[normalized].append(vendor)
    
    # Find duplicates and anomalies
    duplicates = []
    multi_product = []
    score_anomalies = []
    
    for company, group in company_groups.items():
        if len(group) > 1:
            # Check if same product (duplicate) or different products
            products = set()
            for v in group:
                if v['technology_product']:
                    products.add(normalize_company_name(v['technology_product']))
            
            # If all have same/similar product, it's a duplicate
            if len(products) <= 1:
                duplicates.append((company, group))
            else:
                # Check if truly different products
                unique_products = True
                for i, v1 in enumerate(group):
                    for v2 in group[i+1:]:
                        if is_same_product(v1['technology_product'], v2['technology_product']):
                            duplicates.append((company, group))
                            unique_products = False
                            break
                    if not unique_products:
                        break
                
                if unique_products:
                    multi_product.append((company, group))
    
    # Check for score anomalies (scores > 5.0)
    for vendor in vendors:
        if vendor['overall_rating'] and vendor['overall_rating'] > 5.0:
            score_anomalies.append(vendor)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # REPORT: SCORE ANOMALIES
    # ═══════════════════════════════════════════════════════════════════════════
    
    print("\n" + "="*100)
    print("1️⃣  SCORE ANOMALIES (Ratings > 5.0)")
    print("="*100)
    
    if score_anomalies:
        print(f"\nFound {len(score_anomalies)} vendors with invalid scores:\n")
        for vendor in score_anomalies:
            print(f"  ⚠️  {vendor['company_name']}")
            print(f"      ID: {vendor['id']}")
            print(f"      Current Score: {vendor['overall_rating']} ❌")
            print(f"      Suggested Fix: {vendor['overall_rating'] / 100:.2f} ✅")
            print(f"      Category: {vendor['category']}")
            print(f"      Last Assessed: {vendor['last_assessed']}")
            print()
    else:
        print("\n✅ No score anomalies found! All ratings are within valid range (0-5).\n")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # REPORT: DUPLICATES (Same company, same product)
    # ═══════════════════════════════════════════════════════════════════════════
    
    print("\n" + "="*100)
    print("2️⃣  DUPLICATE VENDORS (Same company, same product)")
    print("="*100)
    
    if duplicates:
        print(f"\nFound {len(duplicates)} companies with duplicate entries:\n")
        
        for company, group in duplicates:
            print("─" * 100)
            print(f"\n🏢 Company: {group[0]['company_name']} ({len(group)} entries)\n")
            
            # Sort by date, most recent first
            sorted_group = sorted(group, key=lambda x: parse_date(x['last_assessed']), reverse=True)
            
            for i, vendor in enumerate(sorted_group, 1):
                date_obj = parse_date(vendor['last_assessed'])
                is_most_recent = (i == 1)
                
                status = "✅ KEEP (Most Recent)" if is_most_recent else "❌ DELETE (Older)"
                
                print(f"  Entry #{i}: {status}")
                print(f"    ID: {vendor['id']}")
                print(f"    Overall Rating: {vendor['overall_rating']}")
                print(f"    Last Assessed: {vendor['last_assessed']} ({date_obj.strftime('%Y-%m-%d')})")
                print(f"    Category: {vendor['category']}")
                print(f"    Maturity: {vendor['maturity_level']}")
                print(f"    Technology: {vendor['technology_product'][:80] if vendor['technology_product'] else 'None'}...")
                print(f"    Has VAR: {vendor['has_var']}")
                print(f"    Status: {vendor['vendor_status']}")
                print()
            
            print()
    else:
        print("\n✅ No duplicate vendors found!\n")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # REPORT: MULTI-PRODUCT VENDORS (Same company, different products)
    # ═══════════════════════════════════════════════════════════════════════════
    
    print("\n" + "="*100)
    print("3️⃣  MULTI-PRODUCT VENDORS (Same company, different products - DO NOT MERGE)")
    print("="*100)
    
    if multi_product:
        print(f"\nFound {len(multi_product)} companies with multiple distinct products:\n")
        
        for company, group in multi_product:
            print("─" * 100)
            print(f"\n🏢 Company: {group[0]['company_name']} ({len(group)} products)\n")
            
            for i, vendor in enumerate(group, 1):
                print(f"  Product #{i}:")
                print(f"    ID: {vendor['id']}")
                print(f"    Technology: {vendor['technology_product'][:80] if vendor['technology_product'] else 'None'}...")
                print(f"    Overall Rating: {vendor['overall_rating']}")
                print(f"    Category: {vendor['category']}")
                print(f"    Last Assessed: {vendor['last_assessed']}")
                print()
            
            print("  ✅ Action: KEEP ALL (distinct products)\n")
    else:
        print("\n✅ No multi-product vendors found (or all already properly separated).\n")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════
    
    print("\n" + "="*100)
    print("📊 SUMMARY")
    print("="*100 + "\n")
    
    total_to_delete = sum(len(group) - 1 for _, group in duplicates)
    total_score_fixes = len(score_anomalies)
    
    print(f"  Total Vendors:              {len(vendors):,}")
    print(f"  Score Anomalies:            {total_score_fixes}")
    print(f"  Duplicate Groups:           {len(duplicates)}")
    print(f"  Vendors to Delete:          {total_to_delete}")
    print(f"  Multi-Product Vendors:      {len(multi_product)} (will keep all)")
    print(f"  Final Vendor Count:         {len(vendors) - total_to_delete:,}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # GENERATE ACTIONS JSON
    # ═══════════════════════════════════════════════════════════════════════════
    
    actions = {
        'score_fixes': [],
        'deletions': [],
        'kept_records': []
    }
    
    # Score fixes
    for vendor in score_anomalies:
        actions['score_fixes'].append({
            'id': vendor['id'],
            'company': vendor['company_name'],
            'old_score': vendor['overall_rating'],
            'new_score': round(vendor['overall_rating'] / 100, 2)
        })
    
    # Deletions and keeps
    for company, group in duplicates:
        sorted_group = sorted(group, key=lambda x: parse_date(x['last_assessed']), reverse=True)
        
        # Keep first (most recent)
        actions['kept_records'].append({
            'id': sorted_group[0]['id'],
            'company': sorted_group[0]['company_name'],
            'reason': 'Most recent data'
        })
        
        # Delete rest
        for vendor in sorted_group[1:]:
            actions['deletions'].append({
                'id': vendor['id'],
                'company': vendor['company_name'],
                'reason': f"Older duplicate (assessed: {vendor['last_assessed']})"
            })
    
    # Save actions to file
    with open('deduplication_actions.json', 'w') as f:
        json.dump(actions, f, indent=2)
    
    print("\n" + "="*100)
    print("✅ ANALYSIS COMPLETE")
    print("="*100)
    print(f"\nActions saved to: deduplication_actions.json")
    print("\nNext step: Review the report above, then run the cleanup script to apply changes.\n")
    
    conn.close()

if __name__ == '__main__':
    main()
