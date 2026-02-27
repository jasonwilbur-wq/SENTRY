import sqlite3
import re
import uuid
from datetime import datetime

# Database path
DB_PATH = 'C:/Users/j0w16ja/SENTRY_v2-main/backend/data/sentry.db'

# Manual Mappings (Filename snippet -> DB Vendor Name)
MANUAL_MAPPINGS = {
    'LVT': 'LiveView Technologies',
    'URBN': 'Urban Outfitters',
    'White Castle': 'Interface Systems',
    'Interface Virtual Perimeter Guard': 'Interface Systems',
    'Data Zoo': 'Veriff', # Assuming combined report
    'Veesion': 'SPAR International', # Assuming combined
    'Avery Dennison': 'Sleever International', # Assuming combined
}

# List of reports found in SharePoint
REPORTS = [
    {'filename': 'VAR_Interface_Virtual_Perimeter_Guard_White_Castle_2026-02-20.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BD4751A51-E3B8-4304-8E3A-EE295CD64200%7D&file=VAR_Interface_Virtual_Perimeter_Guard_White_Castle_2026-02-20.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Acre Security 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B83875FE8-F716-4B12-851E-BDB45B8E38D8%7D&file=WMT_ES_EST_VAR%20Acre%20Security%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Agentic AI Retail Reporting URBN 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B5CED6D98-5472-4ECD-8B57-A9981FCDE0D3%7D&file=WMT_ES_EST_VAR%20Agentic%20AI%20Retail%20Reporting%20URBN%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Cisco 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BB6F19256-2878-4C64-81D3-C21D7650E7FF%7D&file=WMT_ES_EST_VAR%20Cisco%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Google 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BD3658FAA-E5C1-4DD1-B418-CA98BEB8B4C8%7D&file=WMT_ES_EST_VAR%20Google%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Korea Heritage Service 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B71FC3D9D-251F-495F-9A40-AB6F2199BED0%7D&file=WMT_ES_EST_VAR%20Korea%20Heritage%20Service%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Raythink 20260219.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BE7BD47F3-9503-4BBC-AA5C-C52E4D665947%7D&file=WMT_ES_EST_VAR%20Raythink%2020260219.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR SatVu 20260219.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B8A67CAEB-FC3C-41E0-84A6-9C310BF0C734%7D&file=WMT_ES_EST_VAR%20SatVu%2020260219.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Sensormatic Solutions 20260219.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B85E27045-0479-42EA-AA48-3F4B5EAE8213%7D&file=WMT_ES_EST_VAR%20Sensormatic%20Solutions%2020260219.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Sentrycs 20260219.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BDDBC8E13-3302-4FEA-BA71-68ACE5296C6D%7D&file=WMT_ES_EST_VAR%20Sentrycs%2020260219.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Skye Air Mobility 20260219.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B131304A1-50F5-4B74-BE4D-AA910858951E%7D&file=WMT_ES_EST_VAR%20Skye%20Air%20Mobility%2020260219.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Sleever and Avery Dennison 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B91334259-AEC6-4CE2-9C57-ECA4FBCA3CDB%7D&file=WMT_ES_EST_VAR%20Sleever%20and%20Avery%20Dennison%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Solink 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B2CFA399C-0D3C-4BE9-8947-891E31F42672%7D&file=WMT_ES_EST_VAR%20Solink%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR SPAR International & Veesion 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BB2013F91-E8F4-4671-8114-683111A057F6%7D&file=WMT_ES_EST_VAR%20SPAR%20International%20%26%20Veesion%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Swann EliteX 6K NVR Security System 20260219.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BF9BBDFA4-E52B-4C19-87EE-FB7125EA2C5D%7D&file=WMT_ES_EST_VAR%20Swann%20EliteX%206K%20NVR%20Security%20System%2020260219.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Terra Industries 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BB833C2A7-BC24-4B32-B900-1EC8F7D7D65D%7D&file=WMT_ES_EST_VAR%20Terra%20Industries%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Tesco 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B0278603C-96BC-44B0-A9E3-39841817DEDD%7D&file=WMT_ES_EST_VAR%20Tesco%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Toss 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B2D07F563-B499-48DA-9BCB-9D7A637DA2C3%7D&file=WMT_ES_EST_VAR%20Toss%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Traxlo 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B0D086A8F-F402-47A2-827D-71A9F50D9684%7D&file=WMT_ES_EST_VAR%20Traxlo%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Trellix 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B1F4AADC4-8D7B-4B7E-8D34-BB097BAC7825%7D&file=WMT_ES_EST_VAR%20Trellix%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT_ES_EST_VAR Veriff and Data Zoo 20260220.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BD02A12FF-783A-486F-8B3D-E3FA98B623E5%7D&file=WMT_ES_EST_VAR%20Veriff%20and%20Data%20Zoo%2020260220.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT-SEC-VAR-20260116-LVT-Detailed-v1 (1).docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BFA33687B-9CD3-4ADC-A265-0671443F817F%7D&file=WMT-SEC-VAR-20260116-LVT-Detailed-v1%20(1).docx&action=default&mobileredirect=true'},
    {'filename': 'WMT-SEC-VAR-20260130-Exiger-Detailed-v1.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7BA3EA6B32-96FF-4097-A75A-C77670C6E91E%7D&file=WMT-SEC-VAR-20260130-Exiger-Detailed-v1.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT-SEC-VAR-20260130-Ionodes-Detailed-v1.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B2008158D-4EF7-4C1A-9762-44CF9A394A8E%7D&file=WMT-SEC-VAR-20260130-Ionodes-Detailed-v1.docx&action=default&mobileredirect=true'},
    {'filename': 'WMT-SEC-VAR-20260130-PwC-AI-SecOps-Detailed-v1.docx', 'url': 'https://teams.wal-mart.com/sites/EmergingTechnologySecurity/_layouts/15/Doc.aspx?sourcedoc=%7B05684DC5-C8C0-4305-8556-BB1D378F5BF8%7D&file=WMT-SEC-VAR-20260130-PwC-AI-SecOps-Detailed-v1.docx&action=default&mobileredirect=true'},
]

def normalize(s):
    return re.sub(r'[^a-zA-Z0-9]', '', s).lower()

def find_vendor_match(filename, vendors):
    clean_name = filename.replace('.docx', '').replace('.pdf', '')

    # Check Manual Mappings First
    for key, target in MANUAL_MAPPINGS.items():
        if normalize(key) in normalize(clean_name):
             for v_id, v_name in vendors:
                 if normalize(v_name) == normalize(target):
                     return v_id, v_name
    
    # Strategy 1: Look for exact vendor name INSIDE the filename
    # This is safer than regex extraction which can be brittle
    best_match = None
    max_len = 0
    
    for v_id, v_name in vendors:
        # Skip very short vendor names (e.g. 'AI', 'Inc') to avoid false positives
        if len(v_name) < 3:
            continue
            
        # Normalize both for comparison
        n_vname = normalize(v_name)
        n_fname = normalize(clean_name)
        
        if n_vname in n_fname:
            # Prefer longer matches (e.g. 'Cisco Systems' over 'Cisco')
            if len(v_name) > max_len:
                max_len = len(v_name)
                best_match = (v_id, v_name)
                
    return best_match

def main():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Fetch all vendors
    cur.execute("SELECT id, company_name FROM vendors")
    vendors = cur.fetchall()
    print(f"Loaded {len(vendors)} vendors from DB.")

    matches_found = 0
    updated_vendors = 0

    for report in REPORTS:
        filename = report['filename']
        url = report['url']
        
        # Find vendor
        match = find_vendor_match(filename, vendors)
        
        if match:
            v_id, v_name = match
            # We found a vendor for this report
            print(f"[MATCH] {filename} -> {v_name} ({v_id})")
            
            # 1. Update Vendor Record (Mark as having VAR, set status, link report)
            cur.execute("""
                UPDATE vendors 
                SET report_url = ?, has_var = 1, last_assessed = '2026-02-20', vendor_status = 'Active'
                WHERE id = ?
            """, (url, v_id))
            updated_vendors += 1

            # 2. Add/Update VAR Report Entry
            # Check if this filename already exists to avoid duplicates
            cur.execute("SELECT id FROM var_reports WHERE filename = ?", (filename,))
            existing = cur.fetchone()
            
            if not existing:
                report_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO var_reports (id, vendor_id, filename, sharepoint_url, report_date, report_type, download_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (report_id, v_id, filename, url, '2026-02-20', 'Detailed', url))
                matches_found += 1
            else:
                # Update existing report link just in case
                cur.execute("UPDATE var_reports SET sharepoint_url = ?, download_url = ? WHERE filename = ?", (url, url, filename))

        else:
            print(f"[NO MATCH] Could not link: {filename}")

    con.commit()
    con.close()
    print(f"\nSummary: Processed {len(REPORTS)} reports. Linked {matches_found} new reports. Updated {updated_vendors} vendor records.")

if __name__ == '__main__':
    main()