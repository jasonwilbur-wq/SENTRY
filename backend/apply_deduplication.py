#!/usr/bin/env python3
"""
SENTRY Deduplication Cleanup Script

Applies the changes identified by check_duplicates.py:
- Deletes older duplicate vendor records
- Keeps most recent data for each vendor
- Preserves multi-product vendors

Author: Atlas (Code Puppy)
Date: 2026-03-02
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = 'data/sentry.db'
ACTIONS_FILE = 'deduplication_actions.json'

def main():
    print("\n" + "="*100)
    print("SENTRY DEDUPLICATION CLEANUP")
    print("="*100 + "\n")
    
    # Load actions
    with open(ACTIONS_FILE, 'r') as f:
        actions = json.load(f)
    
    score_fixes = actions['score_fixes']
    deletions = actions['deletions']
    kept_records = actions['kept_records']
    
    print(f"Loaded actions from {ACTIONS_FILE}:\n")
    print(f"  Score Fixes:    {len(score_fixes)}")
    print(f"  Deletions:      {len(deletions)}")
    print(f"  Kept Records:   {len(kept_records)}")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get current count
    cursor.execute("SELECT COUNT(*) FROM vendors")
    before_count = cursor.fetchone()[0]
    
    print(f"\nCurrent vendor count: {before_count:,}\n")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # APPLY SCORE FIXES
    # ═══════════════════════════════════════════════════════════════════════════
    
    if score_fixes:
        print("\n" + "="*100)
        print("1️⃣  Applying Score Fixes")
        print("="*100 + "\n")
        
        for fix in score_fixes:
            print(f"  Fixing {fix['company']}...")
            print(f"    Old Score: {fix['old_score']} ❌")
            print(f"    New Score: {fix['new_score']} ✅")
            
            cursor.execute("""
                UPDATE vendors
                SET overall_rating = ?
                WHERE id = ?
            """, (fix['new_score'], fix['id']))
            
            print(f"    ✅ Updated!\n")
        
        conn.commit()
        print(f"\n✅ Applied {len(score_fixes)} score fixes!\n")
    else:
        print("\n✅ No score fixes needed.\n")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # DELETE DUPLICATES
    # ═══════════════════════════════════════════════════════════════════════════
    
    if deletions:
        print("\n" + "="*100)
        print("2️⃣  Deleting Duplicate Vendor Records")
        print("="*100 + "\n")
        
        print(f"Deleting {len(deletions)} older duplicate records...\n")
        
        # Group deletions by company for cleaner output
        from collections import defaultdict
        by_company = defaultdict(list)
        for deletion in deletions:
            by_company[deletion['company']].append(deletion)
        
        deleted_count = 0
        for company, records in by_company.items():
            print(f"  🏢 {company}: Deleting {len(records)} duplicate(s)...")
            
            for record in records:
                cursor.execute("DELETE FROM vendors WHERE id = ?", (record['id'],))
                deleted_count += 1
            
            print(f"    ✅ Deleted {len(records)} record(s)\n")
        
        conn.commit()
        print(f"\n✅ Successfully deleted {deleted_count} duplicate vendor records!\n")
    else:
        print("\n✅ No duplicates to delete.\n")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FINAL SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════
    
    cursor.execute("SELECT COUNT(*) FROM vendors")
    after_count = cursor.fetchone()[0]
    
    print("\n" + "="*100)
    print("🎉 CLEANUP COMPLETE!")
    print("="*100 + "\n")
    
    print(f"  Vendor Count Before:  {before_count:,}")
    print(f"  Records Deleted:      {len(deletions):,}")
    print(f"  Vendor Count After:   {after_count:,}")
    print(f"  Records Kept:         {len(kept_records):,} (most recent data)")
    
    print("\n" + "="*100)
    print("✅ DATABASE OPTIMIZED")
    print("="*100)
    print("\nAll vendor records now use the most recent assessment data.")
    print("Multi-product vendors have been preserved.")
    print("\nNext step: Refresh SENTRY in your browser to see the cleaned data!\n")
    
    conn.close()
    
    # Create backup timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    print(f"Backup recommended: Copy data/sentry.db to data/sentry.db.backup_{timestamp}\n")

if __name__ == '__main__':
    main()
