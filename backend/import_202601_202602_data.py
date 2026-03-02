"""Import 202601 & 202602 tracker data into SENTRY vendors table.

Extracts:
  - Use Case
  - Add Value to Walmart
  - Maturity Level
  - Analysis Completed (for vendor_highlight)

Matches vendors by company name (fuzzy matching).
"""
import pandas as pd
import sqlite3
import re
from pathlib import Path
from difflib import SequenceMatcher

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

# Data files
FILES = [
    r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Emerging Technology Security - Utilities\SpreadSheets\ET Trackers\Simplified Trackers\202601.csv",
    r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Emerging Technology Security - Utilities\SpreadSheets\ET Trackers\Simplified Trackers\202602.csv",
]

def normalize_name(name: str) -> str:
    """Normalize company name for matching."""
    if pd.isna(name):
        return ""
    name = str(name).lower().strip()
    name = re.sub(r'\b(inc|llc|ltd|corp|corporation|technologies|technology|systems|solutions)\b\.?', '', name)
    name = re.sub(r'[^a-z0-9]+', '', name)
    return name

def fuzzy_match(name1: str, name2: str, threshold: float = 0.8) -> bool:
    """Check if two names are similar enough."""
    n1 = normalize_name(name1)
    n2 = normalize_name(name2)
    if not n1 or not n2:
        return False
    ratio = SequenceMatcher(None, n1, n2).ratio()
    return ratio >= threshold

def main():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Load all vendors from DB
    vendors_db = cursor.execute("SELECT id, company_name FROM vendors").fetchall()
    vendor_map = {row['id']: row['company_name'] for row in vendors_db}
    
    print(f"📊 Loaded {len(vendor_map)} vendors from database\n")
    
    all_data = []
    for fpath in FILES:
        if not Path(fpath).exists():
            print(f"⚠ File not found: {fpath}")
            continue
        
        df = pd.read_csv(fpath)
        print(f"✓ Loaded {len(df)} rows from {Path(fpath).name}")
        all_data.append(df)
    
    if not all_data:
        print("❌ No data files found!")
        return
    
    combined = pd.concat(all_data, ignore_index=True)
    print(f"\n🔗 Combined dataset: {len(combined)} rows\n")
    
    # Expected columns
    required = ['Company', 'Use Case', 'Add Value to Walmart', 'Maturity Level']
    for col in required:
        if col not in combined.columns:
            print(f"❌ Missing column: {col}")
            return
    
    updates = 0
    no_match = 0
    
    # Group by company to consolidate multiple entries
    for company_name, group in combined.groupby('Company', dropna=False):
        if pd.isna(company_name) or str(company_name).strip() == "":
            continue
        
        company_name = str(company_name).strip()
        
        # Try to find matching vendor in DB
        matched_id = None
        for vid, vname in vendor_map.items():
            if fuzzy_match(company_name, vname, threshold=0.75):
                matched_id = vid
                break
        
        if not matched_id:
            no_match += 1
            continue
        
        # Aggregate data from all rows for this company
        use_cases = []
        values = []
        maturity_levels = []
        
        for _, row in group.iterrows():
            if pd.notna(row.get('Use Case')):
                use_case_text = str(row['Use Case']).strip()
                if use_case_text and use_case_text not in use_cases:
                    use_cases.append(use_case_text)
            
            if pd.notna(row.get('Add Value to Walmart')):
                val_text = str(row['Add Value to Walmart']).strip()
                if val_text and val_text not in values:
                    values.append(val_text)
            
            if pd.notna(row.get('Maturity Level')):
                mat_text = str(row['Maturity Level']).strip()
                if mat_text and mat_text not in maturity_levels:
                    maturity_levels.append(mat_text)
        
        # Build combined strings
        use_cases_str = " | ".join(use_cases[:3])  # Limit to top 3 use cases
        values_str = " | ".join(values[:3])
        maturity_str = maturity_levels[0] if maturity_levels else ""
        
        # Generate a vendor highlight from the data
        highlight = ""
        if use_cases_str:
            highlight = f"Primary use case: {use_cases_str[:200]}..."
        
        # Update the vendor
        cursor.execute("""
            UPDATE vendors
            SET use_cases = ?,
                value_to_walmart = ?,
                maturity_level = ?,
                vendor_highlight = ?
            WHERE id = ?
        """, (use_cases_str, values_str, maturity_str, highlight, matched_id))
        
        updates += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n🎉 Import complete!")
    print(f"  ✅ Updated: {updates} vendors")
    print(f"  ⚠ No match: {no_match} companies from CSV")

if __name__ == "__main__":
    main()
