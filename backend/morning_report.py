"""SENTRY Morning Report Generator."""
from database import get_connection

def report():
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) as c FROM vendors").fetchone()["c"]
    print(f"TOTAL VENDOR-PRODUCTS: {total}")

    print("\n=== CATEGORY BREAKDOWN ===")
    for r in conn.execute(
        "SELECT category, COUNT(*) as cnt, ROUND(AVG(overall_rating),2) as avg_r "
        "FROM vendors GROUP BY category ORDER BY cnt DESC"
    ):
        print(f"  {r['cnt']:>4}  avg={r['avg_r']:>5}  {r['category']}")

    print("\n=== RISK DISTRIBUTION ===")
    for r in conn.execute(
        "SELECT risk_level, COUNT(*) as cnt FROM vendors GROUP BY risk_level ORDER BY cnt DESC"
    ):
        print(f"  {r['risk_level']:>10}: {r['cnt']}")

    print("\n=== TOP 15 VENDORS (highest score) ===")
    for r in conn.execute(
        "SELECT company_name, technology_product, overall_rating, category, risk_level "
        "FROM vendors ORDER BY overall_rating DESC LIMIT 15"
    ):
        print(f"  {r['overall_rating']:>4.1f}  {r['company_name']:<28} {r['technology_product'][:38]:<40} [{r['category'][:28]}]")

    print("\n=== BOTTOM 10 VENDORS (highest risk) ===")
    for r in conn.execute(
        "SELECT company_name, technology_product, overall_rating, category, risk_level "
        "FROM vendors WHERE overall_rating > 0 ORDER BY overall_rating ASC LIMIT 10"
    ):
        print(f"  {r['overall_rating']:>4.1f}  {r['risk_level']:>10}  {r['company_name']:<28} {r['technology_product'][:38]}")

    print("\n=== VENDOR STATUS ===")
    for r in conn.execute(
        "SELECT vendor_status, COUNT(*) as cnt FROM vendors "
        "WHERE vendor_status != '' GROUP BY vendor_status ORDER BY cnt DESC"
    ):
        print(f"  {r['vendor_status']:>15}: {r['cnt']}")

    print("\n=== SENTRY DECISION BANDS (scored vendors Nov-Dec) ===")
    bands = [
        ("Advance / Pilot Ready (>4.0)", 4.01, 5.01),
        ("Research Further (3.0-4.0)", 3.0, 4.01),
        ("Defer / Remediate (2.0-2.9)", 2.0, 3.0),
        ("Reject (<2.0)", 0.01, 2.0),
    ]
    for label, lo, hi in bands:
        row = conn.execute(
            "SELECT COUNT(*) as c FROM vendors "
            "WHERE overall_rating >= ? AND overall_rating < ? "
            "AND (last_assessed LIKE '%/2025' OR last_assessed LIKE '%2025')",
            (lo, hi),
        ).fetchone()
        print(f"  {label}: {row['c']}")

    print("\n=== CATEGORIES WITH MOST HIGH/CRITICAL RISK ===")
    for r in conn.execute(
        "SELECT category, COUNT(*) as cnt FROM vendors "
        "WHERE risk_level IN ('High','Critical') "
        "GROUP BY category ORDER BY cnt DESC LIMIT 10"
    ):
        print(f"  {r['cnt']:>4}  {r['category']}")

    print("\n=== MONTHLY VOLUME ===")
    for r in conn.execute(
        "SELECT SUBSTR(last_assessed, -9, 2) as mo, COUNT(*) as cnt "
        "FROM vendors WHERE last_assessed != '' "
        "GROUP BY mo ORDER BY mo"
    ):
        print(f"  Month {r['mo']}: {r['cnt']} entries")

    conn.close()

if __name__ == "__main__":
    report()
