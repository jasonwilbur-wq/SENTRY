"""Import March 2026 data into SENTRY.

Domains:
  1. Vendor tracker  — 202603.csv (new/updated vendors + enrichment)
  2. Incidents        — 7 CSVs from Migrated Files/Downloads
  3. Regulatory       — 7 CSVs → rebuild regulatory-briefing.json
  4. Competitor       — Walmart_Competitor_202603.xlsx (255 events)

Idempotent — uses OR IGNORE / upsert patterns. Safe to re-run.

Usage:
  cd backend
  .venv/Scripts/python import_march_2026.py
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
import sys
from collections import Counter
from datetime import datetime, date
from difflib import SequenceMatcher
from pathlib import Path

# Ensure we can import sibling modules
sys.path.insert(0, str(Path(__file__).parent))
from database import get_connection, init_db

try:
    import openpyxl
except ImportError:
    import subprocess
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", "openpyxl",
        "--index-url", "https://pypi.ci.artifacts.walmart.com/artifactory/api/pypi/external-pypi/simple",
        "--allow-insecure-host", "pypi.ci.artifacts.walmart.com", "-q",
    ])
    import openpyxl

# ═══════════════════════════════════════════════════════════════════════════════
# Paths
# ═══════════════════════════════════════════════════════════════════════════════

OD = Path(r"C:\Users\j0w16ja\OneDrive - Walmart Inc")
DB_PATH = Path(__file__).parent / "data" / "sentry.db"

VENDOR_TRACKER = OD / "Emerging Technology Security - Utilities" / "SpreadSheets" / "ET Trackers" / "Simplified Trackers" / "202603.csv"

INCIDENT_DIR = OD / "Migrated Files" / "Downloads"
INCIDENT_PATTERNS = [
    "incident_intel_analyzed_2026-03*.csv",
    "incident_tracker_2026-03*.csv",
    "retail_incidents_triage_2026-03*.csv",
    "retail_security_incidents_2026-03*.csv",
    "retail_intel_events_2026-03*.csv",
]

REGULATORY_DIR = OD / "Migrated Files" / "Downloads"
REGULATORY_PATTERNS = [
    "regulatory_intel_analyzed_2026-03*.csv",
    "regulatory_tech_tracker_2026-03*.csv",
    "policy_tracker_2026-03*.csv",
    "laws_regulations_tracker_2026-03*.csv",
]

COMPETITOR_XLSX = OD / "Emerging Technology Security - Utilities" / "SpreadSheets" / "Competitor Trackers" / "Walmart_Competitor_202603.xlsx"


# ═══════════════════════════════════════════════════════════════════════════════
# 1. VENDOR TRACKER — upsert from 202603.csv
# ═══════════════════════════════════════════════════════════════════════════════

def _normalize_name(name: str) -> str:
    if not name:
        return ""
    name = name.lower().strip()
    name = re.sub(r"\b(inc|llc|ltd|corp|corporation|technologies|technology|systems|solutions)\b\.?", "", name)
    return re.sub(r"[^a-z0-9]+", "", name)


def _fuzzy(a: str, b: str, threshold: float = 0.8) -> bool:
    na, nb = _normalize_name(a), _normalize_name(b)
    if not na or not nb:
        return False
    return SequenceMatcher(None, na, nb).ratio() >= threshold


def import_vendor_tracker() -> dict:
    """Import 202603 vendor tracker CSV — upsert existing, insert new."""
    print("\n" + "=" * 70)
    print("1️⃣  VENDOR TRACKER — 202603")
    print("=" * 70)

    if not VENDOR_TRACKER.exists():
        print(f"  ⚠ File not found: {VENDOR_TRACKER}")
        return {"updated": 0, "inserted": 0, "skipped": 0}

    with open(VENDOR_TRACKER, encoding="utf-8-sig", errors="replace") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)
    print(f"  📄 Loaded {len(rows)} rows from 202603.csv")

    conn = get_connection()
    existing = {
        row["company_name"].lower(): dict(row)
        for row in conn.execute("SELECT * FROM vendors").fetchall()
    }
    print(f"  📊 {len(existing)} vendors already in DB")

    updated, inserted, skipped = 0, 0, 0

    for row in rows:
        company = (row.get("Company") or "").strip()
        if not company:
            skipped += 1
            continue

        category = (row.get("Category") or "Other").strip()
        product = (row.get("Technology_Product") or "").strip()
        url = (row.get("CompanyUrl") or "").strip()
        try:
            rating = float(row.get("Overall Rating") or 0)
        except (ValueError, TypeError):
            rating = 0.0
        status = (row.get("Vendor Status") or "Active").strip()
        assessed = (row.get("Last Assessed") or "").strip()

        # Determine risk level from rating
        if rating >= 4.0:
            risk = "Low"
        elif rating >= 3.0:
            risk = "Medium"
        elif rating >= 2.0:
            risk = "High"
        else:
            risk = "Critical"

        # Check for existing vendor by name
        key = company.lower()
        match_id = None
        if key in existing:
            match_id = existing[key]["id"]
        else:
            # Fuzzy match
            for ename, edata in existing.items():
                if _fuzzy(company, edata["company_name"], 0.75):
                    match_id = edata["id"]
                    break

        if match_id:
            conn.execute("""
                UPDATE vendors SET
                    category = ?, technology_product = ?, company_url = ?,
                    overall_rating = ?, vendor_status = ?, risk_level = ?,
                    last_assessed = ?
                WHERE id = ?
            """, (category, product, url, rating, status, risk, assessed, match_id))
            updated += 1
        else:
            vid = hashlib.md5(f"vendor-{company}".encode()).hexdigest()[:16]
            conn.execute("""
                INSERT OR IGNORE INTO vendors
                    (id, company_name, company_url, category, technology_product,
                     overall_rating, vendor_status, risk_level, last_assessed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (vid, company, url, category, product, rating, status, risk, assessed))
            inserted += 1

    conn.commit()
    conn.close()
    stats = {"updated": updated, "inserted": inserted, "skipped": skipped}
    print(f"  ✅ Updated: {updated} | Inserted: {inserted} | Skipped: {skipped}")
    return stats


# ═══════════════════════════════════════════════════════════════════════════════
# 2. INCIDENTS — import CSVs using same logic as import_incidents.py
# ═══════════════════════════════════════════════════════════════════════════════

_CRITICAL_KW = ["cyber", "ransomware", "data breach", "shooting", "terrorism",
                "bomb", "attack", "violence", "murder", "fatal"]
_HIGH_KW = ["cargo theft", "robbery", "armed", "arson", "trafficking",
            "smash", "organized retail crime", "orc"]
_LOW_KW = ["arrest", "court", "fine", "regulatory", "policy", "settlement"]


def _infer_severity(inc_type: str, summary: str, tags: str) -> str:
    text = f"{inc_type} {summary} {tags}".lower()
    if any(k in text for k in _CRITICAL_KW):
        return "Critical"
    if any(k in text for k in _HIGH_KW):
        return "High"
    if any(k in text for k in _LOW_KW):
        return "Low"
    return "Medium"


_US_INDICATORS = [
    "usa", "u.s.", "united states", "alaska", "hawaii",
    ", al", ", ak", ", az", ", ar", ", ca", ", co", ", ct",
    ", de", ", fl", ", ga", ", hi", ", id", ", il", ", in",
    ", ia", ", ks", ", ky", ", la", ", me", ", md", ", ma",
    ", mi", ", mn", ", ms", ", mo", ", mt", ", ne", ", nv",
    ", nh", ", nj", ", nm", ", ny", ", nc", ", nd", ", oh",
    ", ok", ", or", ", pa", ", ri", ", sc", ", sd", ", tn",
    ", tx", ", ut", ", vt", ", va", ", wa", ", wv", ", wi",
    ", wy", ", dc",
]
_REGION_MAP = {
    "northeast": ["maine", "new hampshire", "vermont", "massachusetts",
                  "rhode island", "connecticut", "new york", "new jersey",
                  "pennsylvania", ", me", ", nh", ", vt", ", ma",
                  ", ri", ", ct", ", ny", ", nj", ", pa"],
    "southeast": ["alabama", "arkansas", "florida", "georgia", "kentucky",
                  "louisiana", "mississippi", "north carolina", "south carolina",
                  "tennessee", "virginia", "west virginia", ", al", ", ar",
                  ", fl", ", ga", ", ky", ", la", ", ms", ", nc",
                  ", sc", ", tn", ", va", ", wv"],
    "midwest":   ["illinois", "indiana", "iowa", "kansas", "michigan",
                  "minnesota", "missouri", "nebraska", "north dakota",
                  "ohio", "south dakota", "wisconsin", ", il", ", in",
                  ", ia", ", ks", ", mi", ", mn", ", mo", ", ne",
                  ", nd", ", oh", ", sd", ", wi"],
    "southwest": ["arizona", "new mexico", "oklahoma", "texas",
                  ", az", ", nm", ", ok", ", tx"],
    "west":      ["alaska", "california", "colorado", "hawaii", "idaho",
                  "montana", "nevada", "oregon", "utah", "washington",
                  "wyoming", ", ak", ", ca", ", co", ", hi", ", id",
                  ", mt", ", nv", ", or", ", ut", ", wa", ", wy"],
}
_INTL_COUNTRY_KW = {
    "Canada": ["canada", "toronto", "vancouver", "montreal", "ontario"],
    "UK": ["united kingdom", "england", "london", ", uk", "britain"],
    "Australia": ["australia", "sydney", "melbourne"],
    "Mexico": ["mexico", "cdmx", "tijuana"],
    "Europe": ["europe", "germany", "france", "spain", "italy", "netherlands"],
}


def _infer_location_meta(location: str) -> tuple[str, str]:
    loc = location.lower()
    if not loc:
        return "Unknown", "Unknown"
    for country, kws in _INTL_COUNTRY_KW.items():
        if any(k in loc for k in kws):
            return "International", country
    for region, kws in _REGION_MAP.items():
        if any(k in loc for k in kws):
            return region.title(), "USA"
    if any(k in loc for k in _US_INDICATORS):
        return "USA", "USA"
    return "International", "International"


def _normalise_date(raw: str) -> str:
    if not raw or not raw.strip():
        return ""
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y",
                "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    m = re.search(r"\b(20\d{2})\b", raw)
    return f"{m.group(1)}-01-01" if m else ""


_COL_DATE = ["date", "incident date", "inferred date (from url)"]
_COL_TYPE = ["incident type", "type", "category"]
_COL_LOC = ["location", "city", "state", "region"]
_COL_SUM = ["summary", "description", "details"]
_COL_IMP = ["impact to walmart or retail sector", "impact", "walmart impact"]
_COL_ACT = ["recommended action/tracking note", "action", "recommended action"]
_COL_SRC = ["source url/publisher", "source url (parsed)", "source url", "url", "source_url"]
_COL_TAGS = ["tag", "tags", "tags_normalized"]


def _pick(row: dict, candidates: list[str]) -> str:
    for c in candidates:
        for k, v in row.items():
            if k and k.lower().strip() == c:
                val = (v or "").strip()
                if val:
                    return val
    return ""


def _row_id(source_file: str, inc_type: str, dt: str, summary: str) -> str:
    key = f"{source_file}|{inc_type}|{dt}|{summary[:80]}"
    return hashlib.sha1(key.encode()).hexdigest()[:16]


def import_incidents() -> dict:
    """Import March 2026 incident CSVs."""
    print("\n" + "=" * 70)
    print("2️⃣  INCIDENTS — March 2026")
    print("=" * 70)

    files = []
    for pattern in INCIDENT_PATTERNS:
        files.extend(sorted(INCIDENT_DIR.glob(pattern)))
    files = list(dict.fromkeys(files))  # dedupe, preserve order

    if not files:
        print("  ⚠ No incident CSVs found for March 2026")
        return {"inserted": 0, "skipped": 0, "files": 0}

    print(f"  📄 Found {len(files)} incident files")
    conn = get_connection()
    inserted, skipped = 0, 0

    for path in files:
        fname = path.name
        try:
            with open(path, encoding="utf-8-sig", errors="replace") as fh:
                reader = csv.DictReader(fh)
                rows = list(reader)
        except Exception as exc:
            print(f"  ❌ {fname}: {exc}")
            continue

        file_ins = 0
        for row in rows:
            raw_date = _pick(row, _COL_DATE)
            inc_type = _pick(row, _COL_TYPE) or "Other"
            location = _pick(row, _COL_LOC)
            summary = _pick(row, _COL_SUM)
            impact = _pick(row, _COL_IMP)
            action = _pick(row, _COL_ACT)
            source = _pick(row, _COL_SRC)
            tags = _pick(row, _COL_TAGS)

            if not summary and not inc_type:
                skipped += 1
                continue

            dt = _normalise_date(raw_date)
            severity = _infer_severity(inc_type, summary, tags)
            region, country = _infer_location_meta(location)
            rid = _row_id(fname, inc_type, dt, summary)

            try:
                conn.execute("""
                    INSERT OR IGNORE INTO incidents
                        (id, incident_date, incident_type, severity,
                         location, region, country,
                         summary, impact, recommended_action,
                         source_url, tags, source_file)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (rid, dt, inc_type, severity, location, region, country,
                      summary, impact, action, source, tags, fname))
                file_ins += 1
            except Exception as exc:
                print(f"  ❌ insert {fname}: {exc}")

        inserted += file_ins
        print(f"    ✓ {fname}: {file_ins} rows")

    conn.commit()
    conn.close()
    stats = {"inserted": inserted, "skipped": skipped, "files": len(files)}
    print(f"  ✅ Inserted: {inserted} | Skipped: {skipped}")
    return stats


# ═══════════════════════════════════════════════════════════════════════════════
# 3. REGULATORY — merge March CSVs into regulatory-briefing.json
# ═══════════════════════════════════════════════════════════════════════════════

# Reuse the scoring & normalisation logic from build_regulatory_report.py
TECH_PRIORITY = {
    "AI": 5, "Biometrics": 5, "ALPR/LPR": 4, "Drones/UAS": 4,
    "Data Privacy": 4, "Surveillance": 3, "ORC": 3,
    "Weapons Detection": 3, "Robotics": 2, "Other": 1,
}

NIST_MAP = {
    "AI": ("NIST AI RMF GOVERN-1.1", "GS-AI-01"),
    "Biometrics": ("NIST CSF PR.AC-1", "GS-BIO-01"),
    "ALPR/LPR": ("NIST CSF PR.AC-3", "GS-ALPR-01"),
    "Drones/UAS": ("NIST CSF PR.IP-1", "GS-UAS-01"),
    "Data Privacy": ("ISO 27001 A.18.1.4", "GS-PRIV-01"),
    "Surveillance": ("NIST CSF DE.CM-1", "GS-CAM-01"),
    "ORC": ("NIST CSF DE.CM-3", "GS-ORC-01"),
    "Weapons Detection": ("NIST CSF PR.PT-1", "GS-WEAP-01"),
    "Robotics": ("NIST CSF PR.IP-2", "GS-ROBOT-01"),
    "Other": ("NIST CSF ID.GV-1", "GS-GOV-01"),
}


def _norm_tech(raw: str) -> str:
    if not raw:
        return "Other"
    lo = raw.lower()
    if "ai" in lo or "artificial" in lo:
        return "AI"
    if "biometric" in lo or "facial" in lo:
        return "Biometrics"
    if "alpr" in lo or "license plate" in lo or "lpr" in lo:
        return "ALPR/LPR"
    if "drone" in lo or "uas" in lo:
        return "Drones/UAS"
    if "privacy" in lo or "data protection" in lo:
        return "Data Privacy"
    if "surveillance" in lo or "cctv" in lo:
        return "Surveillance"
    if "orc" in lo or "retail crime" in lo:
        return "ORC"
    if "weapon" in lo or "firearm" in lo:
        return "Weapons Detection"
    if "robot" in lo:
        return "Robotics"
    return raw.strip()[:40]


def _norm_status(raw: str) -> str:
    lo = raw.lower().strip()
    for k, v in {
        "enacted": "Enacted", "enforced": "Enacted", "active": "Enacted",
        "in effect": "Enacted", "passed": "Enacted", "signed": "Enacted",
        "proposed": "Proposed", "pending": "Proposed", "introduced": "Proposed",
        "failed": "Failed", "withdrawn": "Failed", "expired": "Failed",
    }.items():
        if k in lo:
            return v
    return "Proposed"


JURIS_MAP = {
    "united states (federal)": "United States (Federal)",
    "united states": "United States (Federal)",
    "us": "United States (Federal)",
    "eu": "European Union",
    "european union": "European Union",
    "uk": "United Kingdom",
    "united kingdom": "United Kingdom",
}
US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming", "Washington D.C.",
]


def _norm_juris(raw: str) -> str:
    if not raw:
        return "Unknown"
    lo = raw.lower().strip()
    if lo in JURIS_MAP:
        return JURIS_MAP[lo]
    for st in US_STATES:
        if st.lower() in lo:
            return f"{st}, USA"
    for k, v in JURIS_MAP.items():
        if k in lo:
            return v
    return raw.strip().title()


def _score_risk(tech: str, status: str, juris: str, desc: str) -> dict:
    impact = TECH_PRIORITY.get(tech, 2)
    if any(w in desc.lower() for w in ["penalty", "fine", "enforcement", "prohibition"]):
        impact = min(5, impact + 1)
    if any(x in juris for x in ["Federal", "European Union", "United Kingdom"]):
        impact = min(5, impact + 1)
    impact = max(1, min(5, impact))

    likelihood = 4 if status == "Enacted" else 3 if status == "Proposed" else 1
    score = impact * likelihood
    rag = "Green" if score <= 6 else "Yellow" if score <= 12 else "Amber" if score <= 18 else "Red"
    return {"impact": impact, "likelihood": likelihood, "score": score, "rag": rag,
            "reason": f"Tech={tech}, Status={status}, Juris={juris}: I={impact}/5 L={likelihood}/5 S={score}"}


# Column mappings for regulatory CSVs
_REG_LOC = ["location", "jurisdiction", "state"]
_REG_TECH = ["type of technology", "technology", "tech_category"]
_REG_NAME = ["name of law / regulation / ordinance / bill",
             "name of law, regulation, ordinance, or bill", "law_name", "title"]
_REG_STATUS = ["status", "legislative_status"]
_REG_DESC = ["detailed description of scope and key provisions",
             "description", "detailed description", "scope"]
_REG_DATE = ["date enacted or proposed", "date", "effective_date"]
_REG_SRC = ["source link(s)", "source_link", "source url", "url"]


def import_regulatory() -> dict:
    """Import March regulatory CSVs → merge into regulatory-briefing.json."""
    print("\n" + "=" * 70)
    print("3️⃣  REGULATORY — March 2026")
    print("=" * 70)

    json_path = Path(__file__).parent / "data" / "json_reports" / "regulatory-briefing.json"

    # Load existing obligations
    existing_obs = []
    existing_keys: set[str] = set()
    if json_path.exists():
        report = json.loads(json_path.read_text(encoding="utf-8"))
        existing_obs = report.get("obligations", [])
        for o in existing_obs:
            key = re.sub(r"[^a-z0-9]+", "-", f"{o['jurisdiction']}|{o['title']}".lower()).strip("-")[:60]
            existing_keys.add(key)
        print(f"  📊 Existing report: {len(existing_obs)} obligations")

    # Collect March CSVs
    files = []
    for pattern in REGULATORY_PATTERNS:
        files.extend(sorted(REGULATORY_DIR.glob(pattern)))
    files = list(dict.fromkeys(files))

    if not files:
        print("  ⚠ No regulatory CSVs found for March 2026")
        return {"new_obligations": 0, "files": 0}

    print(f"  📄 Found {len(files)} regulatory files")

    new_obs = []
    for path in files:
        fname = path.name
        try:
            with open(path, encoding="utf-8-sig", errors="replace") as fh:
                reader = csv.DictReader(fh)
                rows = list(reader)
        except Exception as exc:
            print(f"  ❌ {fname}: {exc}")
            continue

        for row in rows:
            loc = _pick(row, _REG_LOC)
            tech_raw = _pick(row, _REG_TECH)
            name = _pick(row, _REG_NAME)
            status_raw = _pick(row, _REG_STATUS)
            desc = _pick(row, _REG_DESC)
            date_raw = _pick(row, _REG_DATE)
            source = _pick(row, _REG_SRC)

            if not name:
                continue

            juris = _norm_juris(loc)
            tech = _norm_tech(tech_raw)
            status = _norm_status(status_raw)
            key = re.sub(r"[^a-z0-9]+", "-", f"{juris}|{name}".lower()).strip("-")[:60]

            if key in existing_keys:
                continue
            existing_keys.add(key)

            oid = "REG-" + hashlib.md5(key.encode()).hexdigest()[:8].upper()
            risk = _score_risk(tech, status, juris, desc)

            words = desc.split()
            summary_30 = " ".join(words[:30]) + ("..." if len(words) > 30 else "")

            links = [l.strip() for l in re.split(r"[,;\n]+", source) if l.strip().startswith("http")]
            nist_ctrl, gs_tag = NIST_MAP.get(tech, ("NIST CSF ID.GV-1", "GS-GOV-01"))

            enacted_date = _normalise_date(date_raw) or None

            obligation = {
                "id": oid,
                "jurisdiction": juris,
                "title": name,
                "summary": summary_30,
                "tech_category": tech,
                "effective_date": enacted_date,
                "deadline": None,
                "criticality": 1 if risk["score"] <= 4 else 2 if risk["score"] <= 8 else 3 if risk["score"] <= 12 else 4 if risk["score"] <= 18 else 5,
                "evidence_status": "Partially" if status == "Enacted" else "Unknown",
                "evidence_links": links,
                "risk": risk,
                "controls": [
                    {"control_id": nist_ctrl, "description": f"{tech} compliance review",
                     "owner": "Global Security & Emerging Technology", "status": "Partial",
                     "last_reviewed": "2026-03-31", "evidence_link": links[0] if links else ""},
                    {"control_id": gs_tag, "description": f"Internal {tech} governance control",
                     "owner": "Global Security & Emerging Technology", "status": "Partial",
                     "last_reviewed": "2026-03-31", "evidence_link": ""},
                ],
                "full_description": desc,
                "status": status,
                "provenance": [fname],
            }
            new_obs.append(obligation)

        print(f"    ✓ {fname}: {len(rows)} rows processed")

    # Merge into existing report
    all_obs = existing_obs + new_obs
    all_obs.sort(key=lambda o: o["risk"]["score"], reverse=True)

    jurisdictions = sorted(set(o["jurisdiction"] for o in all_obs))
    tech_counts = Counter(o["tech_category"] for o in all_obs)

    report = {
        "id": "regulatory-briefing",
        "title": "SENTRY Regulatory Intelligence Briefing — Global Security & Emerging Technology",
        "summary": (
            f"As of March 2026, SENTRY's regulatory tracker covers "
            f"{len(all_obs)} unique obligations across {len(jurisdictions)} jurisdictions. "
            f"{sum(1 for o in all_obs if o['risk']['rag'] == 'Red')} Red and "
            f"{sum(1 for o in all_obs if o['risk']['rag'] == 'Amber')} Amber obligations require immediate attention."
        ),
        "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data_through": "2026-03-31",
        "jurisdictions": jurisdictions,
        "stats": {
            "total_obligations": len(all_obs),
            "red": sum(1 for o in all_obs if o["risk"]["rag"] == "Red"),
            "amber": sum(1 for o in all_obs if o["risk"]["rag"] == "Amber"),
            "yellow": sum(1 for o in all_obs if o["risk"]["rag"] == "Yellow"),
            "green": sum(1 for o in all_obs if o["risk"]["rag"] == "Green"),
            "enacted": sum(1 for o in all_obs if o["status"] == "Enacted"),
            "proposed": sum(1 for o in all_obs if o["status"] == "Proposed"),
            "tech_breakdown": dict(tech_counts.most_common()),
        },
        "obligations": all_obs,
        "top_actions": [
            {"title": "AI Governance Review", "description": "Review AI use cases against EU AI Act, NY RAISE Act, Colorado AI Act.", "owner": "GS&ET / Legal", "priority": "High", "eta": "2026-04-30"},
            {"title": "Biometric Consent Audit", "description": "Audit biometric data at all US locations for BIPA, TX CUBI, WA compliance.", "owner": "Privacy / Legal / Store Ops", "priority": "High", "eta": "2026-04-15"},
            {"title": "ALPR Data Retention Update", "description": "Update ALPR retention schedules for enacted state laws.", "owner": "GS / Legal", "priority": "High", "eta": "2026-05-01"},
        ],
        "assumptions": [
            "March 2026 data merged from 7 CSV files in Migrated Files/Downloads.",
            "Deduplication by jurisdiction + law name composite key.",
            "Risk scores are heuristic — validate Red/Amber items with Legal.",
        ],
        "confidence": "Med",
        "schema_version": "1.0",
        "ingestion_notes": {
            "march_files": len(files),
            "new_obligations_added": len(new_obs),
            "total_obligations": len(all_obs),
        },
    }

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    stats = {"new_obligations": len(new_obs), "total": len(all_obs), "files": len(files)}
    print(f"  ✅ Added {len(new_obs)} new obligations (total now: {len(all_obs)})")
    return stats


# ═══════════════════════════════════════════════════════════════════════════════
# 4. COMPETITOR — Walmart_Competitor_202603.xlsx
# ═══════════════════════════════════════════════════════════════════════════════

EXCLUDE_ENTITIES = {
    "Walmart", "Walmart (Vicinity)", "Sam's Club", "Industry",
    "Retail Industry", "CISA", "Cyber Threat", "Competitor",
    "Federal Govt", "NIST", "Global (General)", "Retail (General)",
}

CATEGORY_PATTERNS_RE = [
    (r"cyber|breach|hack|malware|ransomware", "Cyber"),
    (r"orc|theft|robbery|shoplifting|cargo", "ORC/Theft"),
    (r"recall|contamination|food.?safety", "Recall"),
    (r"legal|lawsuit|settlement|litigation", "Legal"),
    (r"regulatory|compliance|fine|violation|gdpr|privacy.?law", "Regulatory"),
    (r"strategic|acquisition|partnership|expansion", "Strategic"),
    (r"operational|store.?operations|supply.?chain", "Operational"),
    (r"technology|tech|ai|automation|robot|drone", "Technology"),
    (r"fraud|scam|identity.?theft", "Fraud"),
]


def _normalize_competitor(name: str) -> str | None:
    if not name or name.strip() in EXCLUDE_ENTITIES or "Walmart" in name:
        return None
    name = name.strip()
    if name.startswith("Amazon"):
        return "Amazon"
    if name == "AWS":
        return "Amazon"
    if name.lower() == "aldi":
        return "ALDI"
    if name.startswith("Lidl"):
        return "Lidl"
    return name


def _normalize_category(cat: str, title: str, desc: str) -> str:
    combined = f"{cat} {title} {desc}".lower()
    for pattern, category in CATEGORY_PATTERNS_RE:
        if re.search(pattern, combined, re.IGNORECASE):
            return category
    return "Other"


def import_competitors() -> dict:
    """Import March competitor events from XLSX."""
    print("\n" + "=" * 70)
    print("4️⃣  COMPETITOR INTEL — March 2026")
    print("=" * 70)

    if not COMPETITOR_XLSX.exists():
        print(f"  ⚠ File not found: {COMPETITOR_XLSX}")
        return {"inserted": 0}

    wb = openpyxl.load_workbook(str(COMPETITOR_XLSX), data_only=True)
    # Use the first sheet (Incident_log)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        print("  ⚠ Empty worksheet")
        return {"inserted": 0}

    headers = [str(c or f"col_{i}").strip() for i, c in enumerate(rows[0])]
    data = []
    for row in rows[1:]:
        if all(c is None for c in row):
            continue
        data.append(dict(zip(headers, row)))

    print(f"  📄 Read {len(data)} rows from {COMPETITOR_XLSX.name}")

    col_map = {
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

    conn = get_connection()

    # Check for existing March data to avoid duplicates
    existing_march = conn.execute(
        "SELECT COUNT(*) FROM competitor_events WHERE source_month = 'Mar 2026'"
    ).fetchone()[0]
    if existing_march > 0:
        print(f"  ⚠ {existing_march} March 2026 events already exist — skipping insert, only adding new")

    inserted = 0
    for row in data:
        mapped = {}
        for orig, target in col_map.items():
            val = row.get(orig)
            if val is None:
                mapped[target] = ""
            elif isinstance(val, (datetime, date)):
                mapped[target] = val.strftime("%Y-%m-%d")
            else:
                mapped[target] = str(val).strip()

        comp = _normalize_competitor(mapped.get("competitor", ""))
        if not comp:
            continue

        cat = _normalize_category(
            mapped.get("category", ""),
            mapped.get("event_title", ""),
            mapped.get("detailed_description", ""),
        )

        # Dedupe by competitor + title + date (id is INTEGER AUTOINCREMENT)
        exists = conn.execute(
            "SELECT 1 FROM competitor_events WHERE competitor = ? AND event_title = ? AND event_date = ?",
            (comp, mapped.get("event_title", ""), mapped.get("event_date", "")),
        ).fetchone()
        if exists:
            continue

        try:
            conn.execute("""
                INSERT INTO competitor_events
                    (event_date, competitor, event_title, event_type, category,
                     location, detailed_description, security_implication,
                     operational_impact, financial_impact, reputational_impact,
                     source_link, analyst_notes, source_month)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                mapped.get("event_date", ""),
                comp,
                mapped.get("event_title", ""),
                mapped.get("event_type", ""),
                cat,
                mapped.get("location", ""),
                mapped.get("detailed_description", ""),
                mapped.get("security_implication", ""),
                mapped.get("operational_impact", ""),
                mapped.get("financial_impact", ""),
                mapped.get("reputational_impact", ""),
                mapped.get("source_link", ""),
                mapped.get("analyst_notes", ""),
                "Mar 2026",
            ))
            inserted += 1
        except Exception as exc:
            print(f"  ❌ insert error: {exc}")

    conn.commit()

    # Refresh competitor_entities aggregated table
    _refresh_competitor_entities(conn)

    conn.close()
    stats = {"inserted": inserted, "total_rows": len(data)}
    print(f"  ✅ Inserted: {inserted} new competitor events")
    return stats


def _refresh_competitor_entities(conn: sqlite3.Connection) -> None:
    """Refresh the competitor_entities aggregated table."""
    print("  🔄 Refreshing competitor_entities...")
    conn.execute("DELETE FROM competitor_entities")

    MONTHS = ["Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025",
              "Jan 2026", "Feb 2026", "Mar 2026"]

    competitors = conn.execute(
        "SELECT DISTINCT competitor FROM competitor_events ORDER BY competitor"
    ).fetchall()

    for (comp_name,) in competitors:
        stats = conn.execute("""
            SELECT COUNT(*) as total,
                SUM(CASE WHEN category='Cyber' THEN 1 ELSE 0 END),
                SUM(CASE WHEN category='ORC/Theft' THEN 1 ELSE 0 END),
                SUM(CASE WHEN category='Recall' THEN 1 ELSE 0 END),
                SUM(CASE WHEN category='Legal' THEN 1 ELSE 0 END),
                SUM(CASE WHEN category='Strategic' THEN 1 ELSE 0 END)
            FROM competitor_events WHERE competitor = ?
        """, (comp_name,)).fetchone()

        total = stats[0]
        threat = "High" if total >= 30 else "Medium" if total >= 10 else "Low"

        top_cat = conn.execute(
            "SELECT category FROM competitor_events WHERE competitor = ? GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1",
            (comp_name,),
        ).fetchone()

        cats = conn.execute(
            "SELECT category, COUNT(*) FROM competitor_events WHERE competitor = ? GROUP BY category ORDER BY COUNT(*) DESC",
            (comp_name,),
        ).fetchall()

        monthly = {}
        for month in MONTHS:
            cnt = conn.execute(
                "SELECT COUNT(*) FROM competitor_events WHERE competitor = ? AND source_month = ?",
                (comp_name, month),
            ).fetchone()[0]
            monthly[month] = cnt

        conn.execute("""
            INSERT INTO competitor_entities
                (name, event_count, cyber_count, orc_count, recall_count,
                 legal_count, strategic_count, threat_level,
                 top_category, categories_json, monthly_json)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (comp_name, total, stats[1], stats[2], stats[3], stats[4],
              stats[5], threat, top_cat[0] if top_cat else "Other",
              json.dumps({c: n for c, n in cats}),
              json.dumps(monthly)))

    conn.commit()
    entity_count = conn.execute("SELECT COUNT(*) FROM competitor_entities").fetchone()[0]
    print(f"  ✅ Refreshed {entity_count} competitor entities")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    print("\n" + "🛡️ " * 20)
    print("SENTRY — March 2026 Data Import")
    print("🛡️ " * 20)

    init_db()

    results = {}
    results["vendors"] = import_vendor_tracker()
    results["incidents"] = import_incidents()
    results["regulatory"] = import_regulatory()
    results["competitors"] = import_competitors()

    # Final summary
    conn = get_connection()
    print("\n" + "=" * 70)
    print("📊 FINAL DATABASE STATE")
    print("=" * 70)
    for table in ["vendors", "var_reports", "incidents", "competitor_events", "competitor_entities"]:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count}")
    conn.close()

    print("\n" + "=" * 70)
    print("✅ IMPORT SUMMARY")
    print("=" * 70)
    print(json.dumps(results, indent=2))
    print("\n🎉 March 2026 import complete!")


if __name__ == "__main__":
    main()
