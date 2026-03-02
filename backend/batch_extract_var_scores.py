"""Batch extract scores from all VARs using local file access."""
import sqlite3
import sys
from pathlib import Path
from typing import Optional

try:
    from var_score_extractor import extract_scores
except ImportError:
    print("❌ Error: var_score_extractor not found")
    sys.exit(1)

DB_PATH = Path(__file__).parent / "data" / "sentry.db"
VAR_FOLDER = Path(r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Emerging Technology Security - Utilities\Solution and Report Data\Reports\Vendor Assessment Reports")

def decision_band_from_score(score: float) -> str:
    """Calculate decision band from overall score."""
    if score >= 4.0:
        return "Advance"
    elif score >= 3.0:
        return "Research Further"
    elif score >= 2.0:
        return "Defer"
    else:
        return "Reject"

def main():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("🔍 BATCH VAR SCORE EXTRACTION")
    print("="*80)
    
    # Get all VARs without scores
    vars_to_process = cursor.execute(
        "SELECT id, filename, sharepoint_url FROM var_reports "
        "WHERE overall_score IS NULL OR overall_score = 0 "
        "ORDER BY report_date DESC"
    ).fetchall()
    
    print(f"\n📊 Found {len(vars_to_process)} VARs to process")
    print(f"📁 VAR Folder: {VAR_FOLDER}\n")
    
    var_folder = VAR_FOLDER
    if not var_folder.exists():
        print(f"❌ Error: VAR folder not found at {var_folder}")
        print("\n💡 Trying alternate location...\n")
        # Try without OneDrive path
        alternate = Path(r"C:\Users\j0w16ja\Documents\VARs")
        if alternate.exists():
            print(f"✅ Found alternate folder: {alternate}")
            var_folder = alternate
        else:
            print("❌ Alternate folder not found either")
            print("\n⚠️  VARs need to be downloaded locally first")
            conn.close()
            return
    
    stats = {
        "processed": 0,
        "extracted": 0,
        "failed": 0,
        "not_found": 0,
    }
    
    print("🚀 Starting extraction...\n")
    
    for idx, var_row in enumerate(vars_to_process, 1):
        if idx % 100 == 0:
            print(f"  Progress: {idx}/{len(vars_to_process)} "
                  f"(Extracted: {stats['extracted']}, Failed: {stats['failed']}, Not Found: {stats['not_found']})")
        
        var_id = var_row["id"]
        filename = var_row["filename"]
        
        # Try to find the file locally
        file_path = var_folder / filename
        
        if not file_path.exists():
            stats["not_found"] += 1
            continue
        
        stats["processed"] += 1
        
        try:
            # Extract scores
            result = extract_scores(str(file_path))
            
            if result and result.get("overall_score"):
                overall = result["overall_score"]
                decision = decision_band_from_score(overall)
                
                # Update database
                cursor.execute(
                    """
                    UPDATE var_reports SET
                        compliance_score = ?,
                        risk_score = ?,
                        maturity_score = ?,
                        integration_score = ?,
                        roi_score = ?,
                        viability_score = ?,
                        differentiation_score = ?,
                        cloud_dep_score = ?,
                        overall_score = ?,
                        decision_band = ?
                    WHERE id = ?
                    """,
                    (
                        result.get("compliance_score"),
                        result.get("risk_score"),
                        result.get("maturity_score"),
                        result.get("integration_score"),
                        result.get("roi_score"),
                        result.get("viability_score"),
                        result.get("differentiation_score"),
                        result.get("cloud_dep_score"),
                        overall,
                        decision,
                        var_id,
                    )
                )
                
                stats["extracted"] += 1
                
                # Commit every 50 records
                if stats["extracted"] % 50 == 0:
                    conn.commit()
            else:
                stats["failed"] += 1
        
        except Exception as e:
            stats["failed"] += 1
            if idx <= 5:  # Show first few errors
                print(f"  ❌ Error extracting {filename}: {str(e)[:100]}")
    
    conn.commit()
    conn.close()
    
    print("\n" + "="*80)
    print("🎉 BATCH EXTRACTION COMPLETE!")
    print("="*80)
    print("\n📈 Extraction Statistics:\n")
    print(f"  📄 Files processed:     {stats['processed']:,}")
    print(f"  ✅ Scores extracted:    {stats['extracted']:,}")
    print(f"  ❌ Extraction failed:   {stats['failed']:,}")
    print(f"  🔍 Files not found:     {stats['not_found']:,}")
    print(f"\n💡 Success rate: {stats['extracted']/max(stats['processed'], 1)*100:.1f}%\n")
    
    if stats['not_found'] > 0:
        print(f"⚠️  {stats['not_found']} VAR files were not found locally")
        print("   These need to be downloaded from SharePoint first\n")

if __name__ == "__main__":
    main()
