#!/usr/bin/env python3
"""
SENTRY Document Organizer - SAFE MODE

Safely organizes VAR documents and data files from Downloads into OneDrive structure.
NON-DESTRUCTIVE: Only copies files, never deletes originals.

Author: Atlas (Code Puppy)
Date: 2026-02-28
"""

import os
import re
import shutil
from pathlib import Path
from datetime import datetime
import csv

# Paths
DOWNLOADS = Path(r"C:\Users\j0w16ja\Downloads")
ONEDRIVE_BASE = Path(r"C:\Users\j0w16ja\OneDrive - Walmart Inc\ET")
VARS_BASE = ONEDRIVE_BASE / "VARs"
SENTRY_DATA = ONEDRIVE_BASE / "SENTRY_Data"

# Report tracking
organized_files = []
errors = []

def extract_date_from_filename(filename: str) -> str:
    """Extract YYYYMMDD date from VAR filename.
    
    Examples:
        WMT-SEC-VAR-20260228-vendor-Detailed-v1.docx -> 202602
        WMT-SEC-VAR-20251215-vendor-v1.docx -> 202512
    """
    # Pattern: YYYYMMDD in filename
    match = re.search(r'(\d{8})', filename)
    if match:
        date_str = match.group(1)
        # Convert YYYYMMDD to YYYYMM
        return date_str[:6]  # First 6 chars = YYYYMM
    return None

def organize_vars():
    """Organize VAR documents into month folders."""
    print("\n🔍 Scanning for VAR documents in Downloads...")
    
    var_pattern = re.compile(r'^WMT-SEC-VAR-\d{8}-.*\.docx$', re.IGNORECASE)
    var_files = [f for f in DOWNLOADS.glob('*.docx') if var_pattern.match(f.name)]
    
    print(f"   Found {len(var_files)} VAR documents")
    
    for var_file in var_files:
        month = extract_date_from_filename(var_file.name)
        if not month:
            errors.append(f"Could not extract date from: {var_file.name}")
            continue
        
        # Create month folder if it doesn't exist
        month_folder = VARS_BASE / month
        month_folder.mkdir(exist_ok=True)
        
        # Copy file
        dest = month_folder / var_file.name
        if not dest.exists():
            try:
                shutil.copy2(var_file, dest)
                organized_files.append({
                    'type': 'VAR',
                    'source': str(var_file),
                    'dest': str(dest),
                    'month': month
                })
                print(f"   ✅ Copied {var_file.name} -> {month}/")
            except Exception as e:
                errors.append(f"Error copying {var_file.name}: {e}")
        else:
            print(f"   ⏭️  Skipped {var_file.name} (already exists)")

def organize_competitor_data():
    """Organize competitor analysis CSVs."""
    print("\n🔍 Organizing Competitor Analysis data...")
    
    competitor_pattern = re.compile(r'^competitor.*\.csv$', re.IGNORECASE)
    competitor_files = [f for f in DOWNLOADS.glob('*.csv') if competitor_pattern.match(f.name)]
    
    print(f"   Found {len(competitor_files)} competitor CSV files")
    
    dest_folder = SENTRY_DATA / "Competitor_Analysis"
    dest_folder.mkdir(exist_ok=True)
    
    for csv_file in competitor_files[:50]:  # Limit to 50 most relevant
        dest = dest_folder / csv_file.name
        if not dest.exists():
            try:
                shutil.copy2(csv_file, dest)
                organized_files.append({
                    'type': 'Competitor CSV',
                    'source': str(csv_file),
                    'dest': str(dest),
                    'month': 'N/A'
                })
                print(f"   ✅ Copied {csv_file.name}")
            except Exception as e:
                errors.append(f"Error copying {csv_file.name}: {e}")

def organize_regulatory_data():
    """Organize regulatory tracking CSVs."""
    print("\n🔍 Organizing Regulatory data...")
    
    regulatory_pattern = re.compile(r'^(regulatory|policy).*\.csv$', re.IGNORECASE)
    regulatory_files = [f for f in DOWNLOADS.glob('*.csv') if regulatory_pattern.match(f.name)]
    
    print(f"   Found {len(regulatory_files)} regulatory CSV files")
    
    dest_folder = SENTRY_DATA / "Regulatory"
    dest_folder.mkdir(exist_ok=True)
    
    for csv_file in regulatory_files[:30]:  # Limit to 30 most relevant
        dest = dest_folder / csv_file.name
        if not dest.exists():
            try:
                shutil.copy2(csv_file, dest)
                organized_files.append({
                    'type': 'Regulatory CSV',
                    'source': str(csv_file),
                    'dest': str(dest),
                    'month': 'N/A'
                })
                print(f"   ✅ Copied {csv_file.name}")
            except Exception as e:
                errors.append(f"Error copying {csv_file.name}: {e}")

def organize_incident_data():
    """Organize retail incident CSVs."""
    print("\n🔍 Organizing Incident data...")
    
    incident_pattern = re.compile(r'^(retail_incident|incident).*\.csv$', re.IGNORECASE)
    incident_files = [f for f in DOWNLOADS.glob('*.csv') if incident_pattern.match(f.name)]
    
    print(f"   Found {len(incident_files)} incident CSV files")
    
    dest_folder = SENTRY_DATA / "Incidents"
    dest_folder.mkdir(exist_ok=True)
    
    for csv_file in incident_files[:30]:  # Limit to 30 most relevant
        dest = dest_folder / csv_file.name
        if not dest.exists():
            try:
                shutil.copy2(csv_file, dest)
                organized_files.append({
                    'type': 'Incident CSV',
                    'source': str(csv_file),
                    'dest': str(dest),
                    'month': 'N/A'
                })
                print(f"   ✅ Copied {csv_file.name}")
            except Exception as e:
                errors.append(f"Error copying {csv_file.name}: {e}")

def organize_uas_documents():
    """Organize UAS/Drone documentation."""
    print("\n🔍 Organizing UAS/Drone documents...")
    
    uas_pattern = re.compile(r'^(walmart.*uas|drone|skydio|sunflower).*\.(docx|pdf)$', re.IGNORECASE)
    uas_files = [f for f in DOWNLOADS.glob('*.*') if uas_pattern.match(f.name) and f.suffix.lower() in ['.docx', '.pdf']]
    
    print(f"   Found {len(uas_files)} UAS documents")
    
    dest_folder = SENTRY_DATA / "UAS_Drones"
    dest_folder.mkdir(exist_ok=True)
    
    for doc_file in uas_files[:20]:  # Limit to 20 most relevant
        dest = dest_folder / doc_file.name
        if not dest.exists():
            try:
                shutil.copy2(doc_file, dest)
                organized_files.append({
                    'type': 'UAS Document',
                    'source': str(doc_file),
                    'dest': str(dest),
                    'month': 'N/A'
                })
                print(f"   ✅ Copied {doc_file.name}")
            except Exception as e:
                errors.append(f"Error copying {doc_file.name}: {e}")

def generate_report():
    """Generate organization summary report."""
    report_path = ONEDRIVE_BASE / "SENTRY_Organization_Report.csv"
    
    with open(report_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['type', 'source', 'dest', 'month'])
        writer.writeheader()
        writer.writerows(organized_files)
    
    print(f"\n📊 Report saved to: {report_path}")
    print(f"\n✅ Successfully organized {len(organized_files)} files")
    if errors:
        print(f"⚠️  {len(errors)} errors encountered")
        for error in errors[:10]:  # Show first 10 errors
            print(f"   - {error}")

def main():
    """
    Main execution - organize all SENTRY-related documents.
    
    This is a SAFE operation:
    - Only COPIES files (never deletes)
    - Creates organized folder structure
    - Generates detailed report
    """
    print("="*60)
    print("🐶 SENTRY Document Organizer (SAFE MODE)")
    print("="*60)
    print("\nThis script will COPY files from Downloads to OneDrive.")
    print("Original files will NOT be deleted or modified.\n")
    
    # Run organization steps
    organize_vars()
    organize_competitor_data()
    organize_regulatory_data()
    organize_incident_data()
    organize_uas_documents()
    
    # Generate report
    generate_report()
    
    print("\n" + "="*60)
    print("✅ ORGANIZATION COMPLETE!")
    print("="*60)
    print("\nNext steps:")
    print("1. Review the organization report")
    print("2. Update SENTRY backend configuration")
    print("3. Test loading documents in SENTRY")
    print("4. (Optional) Clean up Downloads folder later")
    print("\n🐕 Your SENTRY data is now organized!\n")

if __name__ == "__main__":
    main()
