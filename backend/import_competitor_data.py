#!/usr/bin/env python3
"""
Competitor Data Import & Cleanup Script

Imports Walmart Competitor monthly Excel files (202601, 202602) into SENTRY,
filters out:
 - Walmart entries
 - Non-competitor entities (Industry, CISA, Regulatory without specific competitor)
 - Normalizes messy category fields

Outputs clean competitor intelligence data for the dashboard.
"""

import sqlite3
import pandas as pd
from pathlib import Path
import re
from datetime import datetime

# File paths
CLEAN_202602 = r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Data Entries\Datasets\Walmart_Competitor_202602 (Clean).xlsx"
CLEAN_202601 = r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Emerging Technology Security - Utilities\SpreadSheets\Competitor Trackers\Walmart_Competitor_202601.xlsx"
DB_PATH = "data/sentry.db"

# Non-competitor entities to filter out
EXCLUDE_ENTITIES = [
    "Walmart",
    "Walmart (Vicinity)",
    "Industry",
    "Retail Industry",
    "CISA",
    "Cyber Threat",
    "Organized Retail Crime (Multiple)",
    "Competitor",  # Generic placeholder
]

# Legitimate competitors (whitelist for clarity)
LEGIT_COMPETITORS = [
    "Amazon", "Amazon (AWS)", "Amazon (Corp)", "Amazon (Retail)", "Amazon (Ring)", "Amazon Fresh", "AWS",
    "Target",
    "Costco",
    "Kroger",
    "Home Depot",
    "Lowe's",
    "ALDI", "Aldi",
    "Whole Foods",
    "Albertsons",
    "Walgreens",
    "CVS/Walgreens",
    "7-Eleven",
    "Dollar General",
    "Schwarz Group",
    "Lidl", "Lidl (GB)",
    "Tesco",
    "Ahold Delhaize / Carrefour",
    "Save Mart Companies",
    "Coupang",
    "Alibaba",
    "Temu",
    "Shein",
    "TikTok",
    "Hot Topic",
]

# Technology vendors (include if they're competing in retail tech space)
TECH_VENDORS = [
    "Axon",
    "Zebra Technologies", "Zebra/Balea", "Evri (Zebra)", "Evri/Zebra",
    "Simbe",
    "Gather AI",
    "Gatekeeper",
    "Alpha Modus",
]

# Category normalization mapping (common patterns in messy data)
CATEGORY_PATTERNS = [
    (r"cyber|breach|hack|malware|ransomware", "Cyber"),
    (r"orc|theft|robbery|shoplifting|cargo", "ORC/Theft"),
    (r"recall|contamination|food.?safety", "Recall"),
    (r"legal|lawsuit|settlement|litigation", "Legal"),
    (r"regulatory|compliance|fine|violation|gdpr|privacy.?law", "Regulatory"),
    (r"strategic|acquisition|partnership|expansion", "Strategic"),
    (r"operational|store.?operations|supply.?chain", "Operational"),
    (r"technology|tech|ai|automation|robot|drone", "Technology"),
    (r"fraud|scam|identity.?theft", "Fraud"),
    (r"data.?breach|privacy.?incident", "Cyber"),
]

def normalize_competitor(name: str) -> str:
    """Normalize competitor names (Amazon variants → Amazon, etc.)"""
    if pd.isna(name):
        return None
    name = name.strip()
    # Consolidate Amazon variants
    if name.startswith("Amazon"):
        return "Amazon"
    if name in ["AWS"]:
        return "Amazon"
    # Consolidate ALDI variants
    if name.lower() == "aldi":
        return "ALDI"
    # Consolidate Zebra variants
    if "Zebra" in name or "Evri" in name:
        return "Zebra Technologies"
    # Consolidate Lidl variants
    if name.startswith("Lidl"):
        return "Lidl"
    return name

def normalize_category(cat: str, title: str, desc: str) -> str:
    """Normalize category field by checking patterns in cat, title, and description."""
    if pd.isna(cat):
        cat = ""
    if pd.isna(title):
        title = ""
    if pd.isna(desc):
        desc = ""
    
    combined = f"{cat} {title} {desc}".lower()
    
    # Check patterns
    for pattern, category in CATEGORY_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return category
    
    # If original category is short and clean, keep it
    if cat and len(cat) < 30 and cat in ["Legal", "Strategy", "Regulatory", "Cyber", "Recall", "ORC/Theft"]:
        return cat
    
    # Default
    return "Other"

def is_valid_competitor(name: str) -> bool:
    """Check if entity is a legitimate competitor (not Walmart, not generic 'Industry', etc.)"""
    if pd.isna(name):
        return False
    name = name.strip()
    
    # Exclude list
    if name in EXCLUDE_ENTITIES:
        return False
    if "Walmart" in name:
        return False
    
    # Whitelist check
    if name in LEGIT_COMPETITORS or name in TECH_VENDORS:
        return True
    
    # Heuristic: if it's a specific company name (not generic), include it
    generic_terms = ["industry", "cisa", "threat", "organized retail crime", "competitor"]
    if any(term in name.lower() for term in generic_terms):
        return False
    
    return True

def import_month(file_path: str, source_month: str) -> pd.DataFrame:
    """Import one month of competitor data and clean it."""
    print(f"\nImporting {source_month} from {file_path}...")
    
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"  ❌ Error reading {file_path}: {e}")
        return pd.DataFrame()
    
    print(f"  Read {len(df)} rows")
    
    # Rename columns to standardized names
    col_mapping = {
        "Competitor/Entity": "competitor",
        "Date": "event_date",
        "Event Title": "event_title",
        "Event Type": "event_type",
        "Detailed Description": "detailed_description",
        "Category": "category",
        "Location/Geographic Scope": "location",
        "Security Implication": "security_implication",
        "Operational Impact": "operational_impact",
        "Financial Impact": "financial_impact",
        "Reputational Impact": "reputational_impact",
        "Source/Link": "source_link",
        "Analyst Notes": "analyst_notes",
    }
    df = df.rename(columns=col_mapping)
    
    # Filter valid competitors
    df = df[df["competitor"].apply(is_valid_competitor)]
    print(f"  ✓ {len(df)} rows after filtering non-competitors")
    
    # Normalize competitor names
    df["competitor"] = df["competitor"].apply(normalize_competitor)
    
    # Normalize categories
    df["category"] = df.apply(
        lambda row: normalize_category(
            row.get("category"),
            row.get("event_title"),
            row.get("detailed_description")
        ),
        axis=1
    )
    
    # Add source month
    df["source_month"] = source_month
    
    # Convert date
    df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce")
    
    # Select final columns
    final_cols = [
        "event_date", "competitor", "event_title", "event_type", "category",
        "location", "detailed_description", "security_implication",
        "operational_impact", "financial_impact", "reputational_impact",
        "source_link", "analyst_notes", "source_month"
    ]
    df = df[final_cols]
    
    print(f"  ✅ Final: {len(df)} clean events")
    print(f"     Competitors: {df['competitor'].nunique()}")
    print(f"     Categories: {df['category'].value_counts().to_dict()}")
    
    return df

def create_tables(conn):
    """Create competitor tables if they don't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS competitor_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_date TEXT,
            competitor TEXT,
            event_title TEXT,
            event_type TEXT,
            category TEXT,
            location TEXT,
            detailed_description TEXT,
            security_implication TEXT,
            operational_impact TEXT,
            financial_impact TEXT,
            reputational_impact TEXT,
            source_link TEXT,
            analyst_notes TEXT,
            source_month TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_competitor ON competitor_events(competitor)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_category ON competitor_events(category)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_source_month ON competitor_events(source_month)
    """)
    conn.commit()

def main():
    print("\n" + "="*70)
    print("SENTRY Competitor Data Import & Cleanup")
    print("="*70)
    
    # Import both months
    df_202602 = import_month(CLEAN_202602, "Feb 2026")
    df_202601 = import_month(CLEAN_202601, "Jan 2026") if Path(CLEAN_202601).exists() else pd.DataFrame()
    
    # Combine
    df_all = pd.concat([df_202601, df_202602], ignore_index=True)
    print(f"\n📊 Combined: {len(df_all)} total events")
    
    # Write to database
    print(f"\n💾 Writing to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)
    
    # Clear existing data
    conn.execute("DELETE FROM competitor_events")
    conn.commit()
    print("  ✓ Cleared existing data")
    
    # Insert new data
    df_all.to_sql("competitor_events", conn, if_exists="append", index=False)
    conn.commit()
    print(f"  ✅ Inserted {len(df_all)} events")
    
    # Summary stats
    print("\n" + "="*70)
    print("📈 Summary Statistics")
    print("="*70)
    
    stats = conn.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(DISTINCT competitor) as competitors,
            COUNT(CASE WHEN category = 'Cyber' THEN 1 END) as cyber,
            COUNT(CASE WHEN category = 'ORC/Theft' THEN 1 END) as orc,
            COUNT(CASE WHEN category = 'Recall' THEN 1 END) as recall,
            COUNT(CASE WHEN category = 'Legal' THEN 1 END) as legal,
            COUNT(CASE WHEN category = 'Regulatory' THEN 1 END) as regulatory
        FROM competitor_events
    """).fetchone()
    
    print(f"  Total Events: {stats[0]}")
    print(f"  Unique Competitors: {stats[1]}")
    print(f"  Cyber Events: {stats[2]}")
    print(f"  ORC/Theft Events: {stats[3]}")
    print(f"  Recall Events: {stats[4]}")
    print(f"  Legal Events: {stats[5]}")
    print(f"  Regulatory Events: {stats[6]}")
    
    print("\n  Top 10 Competitors by Event Count:")
    for row in conn.execute("""
        SELECT competitor, COUNT(*) as cnt
        FROM competitor_events
        GROUP BY competitor
        ORDER BY cnt DESC
        LIMIT 10
    """).fetchall():
        print(f"    {row[0]}: {row[1]} events")
    
    conn.close()
    print("\n✅ Import complete!\n")

if __name__ == "__main__":
    main()
