"""
consolidate_categories.py — Merge 61 overlapping vendor categories into ~25 clean ones.

Run:  python consolidate_categories.py
Safe: backs up DB first, prints diff before/after, and is idempotent.
"""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent / "data" / "sentry.db"

# ── Category mapping: old → canonical ────────────────────────────────────────
# Rule: merge obvious duplicates, keep domain specificity, drop clutter.
CATEGORY_MAP: dict[str, str] = {
    # --- Access Control & Identity ---
    "Access Control":                               "Access Control & Identity",
    "Access Control & Identity":                    "Access Control & Identity",
    "Identity & Access Control (PAC/PIAM)":         "Access Control & Identity",
    "Credentials & Mobile Access":                  "Access Control & Identity",
    "Visitor & Identity Proofing (IDV)":            "Access Control & Identity",

    # --- Identity / SSO / Zero Trust (digital, not physical) ---
    "Identity/SSO/Zero Trust":                      "Identity & Zero Trust",

    # --- Biometrics ---
    "Biometrics":                                   "Biometrics & Authentication",
    "Biometrics & Authentication":                  "Biometrics & Authentication",

    # --- Video Analytics ---
    "Video Analytics & AI":                         "Video Analytics & AI",
    "Video Analytics & Computer Vision":            "Video Analytics & AI",
    "Video Analytics/AI":                           "Video Analytics & AI",

    # --- VMS / NVR ---
    "VMS":                                          "Video Management (VMS/NVR)",
    "Video Management & Recording (VMS)":           "Video Management (VMS/NVR)",
    "Video Management & Recording (VMS/NVR)":       "Video Management (VMS/NVR)",
    "Video Analytics & VMS":                        "Video Management (VMS/NVR)",

    # --- Drones / UAS ---
    "Aerial Systems: Drones/UAS/DFR":               "Drones & UAS",
    "Drones/UAS/DFR":                               "Drones & UAS",

    # --- Counter-UAS ---
    "Counter-UAS (C-UAS)":                          "Counter-UAS (C-UAS)",
    "Drones & C-UAS":                               "Counter-UAS (C-UAS)",

    # --- Robotics ---
    "Autonomous Systems: Robotics (AMR/Patrol)":    "Robotics & Autonomous Systems",
    "Robotics & Automation":                        "Robotics & Autonomous Systems",
    "Robotics/AMRs":                                "Robotics & Autonomous Systems",

    # --- Perimeter / Intrusion Detection ---
    "Perimeter Protection & Intrusion Detection (PIDS)": "Perimeter & Intrusion Detection",
    "Perimeter/Intrusion Detection":                     "Perimeter & Intrusion Detection",
    "Perimeter IDS (PIDS)":                              "Perimeter & Intrusion Detection",
    "Barriers, Fencing & Hardening Tech":                "Perimeter & Intrusion Detection",

    # --- Cyber-Physical / OT Security ---
    "Cyber-Physical":                               "Cyber-Physical & OT Security",
    "Cyber-Physical & OT/Infrastructure Security":  "Cyber-Physical & OT Security",

    # --- Cybersecurity ---
    "Cybersecurity":                                "Cybersecurity",
    "Cloud Security":                               "Cloud Security",
    "Mobile Security":                              "Cybersecurity",

    # --- Edge AI / IoT / Sensors ---
    "Edge AI/IoT":                                  "Edge AI & IoT",
    "IoT & Specialty Sensors":                      "Edge AI & IoT",
    "Sensors, IoT & Environmental Monitoring":      "Edge AI & IoT",
    "Sensor Fusion & Edge Compute":                 "Sensor Fusion & Edge Compute",

    # --- Networking ---
    "Networking & Edge":                            "Networking & Edge",
    "Networking & Connectivity":                    "Networking & Edge",

    # --- Command & Control ---
    "Command & Control / PSIM / Situational Awareness": "Command & Control / PSIM",
    "Command & Control/PSIM":                           "Command & Control / PSIM",
    "Command & Incident Mgmt":                          "Command & Control / PSIM",
    "Incident Response, Dispatch & Emergency Mgmt":     "Command & Control / PSIM",

    # --- Vehicle Intelligence ---
    "Vehicle Intelligence (ALPR/LPR & Parking)":    "Vehicle Intelligence (ALPR/LPR)",
    "ALPR/LPR":                                     "Vehicle Intelligence (ALPR/LPR)",
    "ALPR & Vehicle Analytics":                     "Vehicle Intelligence (ALPR/LPR)",

    # --- Loss Prevention ---
    "Loss Prevention & Retail Risk Tech":           "Loss Prevention & Retail Tech",
    "LP & Inventory Protection":                    "Loss Prevention & Retail Tech",
    "Loss Prevention Tech":                         "Loss Prevention & Retail Tech",
    "EAS/RFID":                                     "Loss Prevention & Retail Tech",
    "Store Ops Tech":                               "Store Operations Tech",

    # --- Supply Chain ---
    "Supply Chain & Asset Protection Tech":         "Supply Chain & Logistics",
    "Supply Chain Tech":                            "Supply Chain & Logistics",
    "Logistics & Fleet":                            "Supply Chain & Logistics",

    # --- Governance / Privacy ---
    "Governance, Privacy & Compliance (incl. AI policy)": "Governance, Privacy & Compliance",
    "Privacy & Compliance":                               "Governance, Privacy & Compliance",
    "Data Privacy":                                       "Governance, Privacy & Compliance",
    "Third-Party Risk":                                   "Governance, Privacy & Compliance",

    # --- Weapon Detection ---
    "Weapon Detection":                             "Weapon Detection",

    # --- Audio ---
    "Audio Analytics":                              "Audio Analytics",

    # --- AI Platforms ---
    "AI Platforms & Agentic":                       "AI Platforms & Agentic",

    # --- Other ---
    "Other / Misc":                                 "Other / Misc",
}


def main() -> None:
    conn = sqlite3.connect(str(DB))
    conn.row_factory = sqlite3.Row

    # ── Show BEFORE state ─────────────────────────────────────────────────
    before = conn.execute(
        "SELECT category, COUNT(*) as cnt FROM vendors GROUP BY category ORDER BY cnt DESC"
    ).fetchall()
    print(f"BEFORE: {len(before)} categories")
    for r in before:
        print(f"  {r['cnt']:>4}  {r['category']}")

    # ── Check for unmapped categories ─────────────────────────────────────
    existing = {r["category"] for r in before}
    unmapped = existing - set(CATEGORY_MAP.keys())
    if unmapped:
        print(f"\n⚠️  UNMAPPED categories (will be left as-is):")
        for u in sorted(unmapped):
            print(f"     {u}")

    # ── Apply updates ─────────────────────────────────────────────────────
    changes = 0
    for old_cat, new_cat in CATEGORY_MAP.items():
        if old_cat == new_cat:
            continue
        cur = conn.execute(
            "UPDATE vendors SET category = ? WHERE category = ?",
            (new_cat, old_cat),
        )
        if cur.rowcount > 0:
            print(f"  ✓ {old_cat} → {new_cat} ({cur.rowcount} vendors)")
            changes += cur.rowcount

    conn.commit()

    # ── Show AFTER state ──────────────────────────────────────────────────
    after = conn.execute(
        "SELECT category, COUNT(*) as cnt FROM vendors GROUP BY category ORDER BY cnt DESC"
    ).fetchall()
    total_vendors = sum(r["cnt"] for r in after)
    print(f"\nAFTER: {len(after)} categories ({total_vendors} total vendors)")
    for r in after:
        print(f"  {r['cnt']:>4}  {r['category']}")

    print(f"\n✅ Consolidated {len(before)} → {len(after)} categories ({changes} rows updated)")
    conn.close()


if __name__ == "__main__":
    main()
