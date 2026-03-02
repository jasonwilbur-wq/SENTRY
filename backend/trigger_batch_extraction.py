"""Trigger batch VAR score extraction via API."""
import httpx
import time
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"
API_BASE = "http://localhost:8082"
BATCH_SIZE = 50  # Process 50 at a time

def main():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("🔍 BATCH VAR SCORE EXTRACTION VIA API")
    print("="*80)
    
    # Get count of VARs without scores
    count_row = cursor.execute(
        "SELECT COUNT(*) as cnt FROM var_reports "
        "WHERE overall_score IS NULL OR overall_score = 0"
    ).fetchone()
    
    total = count_row["cnt"]
    conn.close()
    
    print(f"\n📊 Found {total} VARs needing score extraction")
    print(f"📦 Batch size: {BATCH_SIZE}")
    print(f"📋 Estimated batches: {(total + BATCH_SIZE - 1) // BATCH_SIZE}\n")
    
    total_extracted = 0
    total_failed = 0
    batch_num = 0
    
    print("🚀 Starting batch extraction...\n")
    
    while True:
        batch_num += 1
        
        try:
            # Trigger batch extraction
            print(f"📦 Batch {batch_num}: Triggering extraction of up to {BATCH_SIZE} VARs...")
            
            response = httpx.post(
                f"{API_BASE}/api/admin/vars/extract-batch",
                params={"batch_size": BATCH_SIZE},
                timeout=300.0,  # 5 minutes per batch
            )
            
            if response.status_code == 200:
                result = response.json()
                extracted = result.get("extracted", 0)
                failed = result.get("failed", 0)
                skipped = result.get("skipped", 0)
                
                total_extracted += extracted
                total_failed += failed
                
                print(f"   ✅ Extracted: {extracted}")
                print(f"   ❌ Failed: {failed}")
                print(f"   ⏭️  Skipped: {skipped}")
                print(f"   📈 Total so far: {total_extracted} extracted, {total_failed} failed\n")
                
                # If no more to process, stop
                if extracted == 0 and failed == 0:
                    print("✅ No more VARs to process!")
                    break
                
                # Small delay between batches
                if extracted > 0:
                    time.sleep(2)
            else:
                print(f"   ❌ API Error: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                break
        
        except httpx.TimeoutException:
            print(f"   ⏱️  Batch {batch_num} timed out (SharePoint may be slow)")
            print("   Continuing to next batch...\n")
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:150]}")
            break
        
        # Safety limit: max 50 batches
        if batch_num >= 50:
            print("\n⚠️  Reached maximum batch limit (50)")
            print("   Run script again to continue if needed\n")
            break
    
    print("\n" + "="*80)
    print("🎉 BATCH EXTRACTION SESSION COMPLETE!")
    print("="*80)
    print("\n📈 Session Statistics:\n")
    print(f"  📦 Batches processed:   {batch_num}")
    print(f"  ✅ Scores extracted:    {total_extracted}")
    print(f"  ❌ Extraction failed:   {total_failed}")
    print(f"\n💡 Success rate: {total_extracted/max(total_extracted+total_failed, 1)*100:.1f}%\n")
    
    # Check how many remain
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    remaining = cursor.execute(
        "SELECT COUNT(*) FROM var_reports "
        "WHERE overall_score IS NULL OR overall_score = 0"
    ).fetchone()[0]
    conn.close()
    
    print(f"📊 VARs remaining: {remaining}")
    
    if remaining > 0:
        print(f"\n🔁 Run this script again to process remaining {remaining} VARs\n")
    else:
        print("\n🎉 All VARs have been processed!\n")

if __name__ == "__main__":
    main()
