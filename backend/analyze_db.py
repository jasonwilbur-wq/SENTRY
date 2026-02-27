import sqlite3
con = sqlite3.connect('C:/Users/j0w16ja/SENTRY_v2-main/backend/data/sentry.db')
cur = con.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print('TABLES:', tables)

cur.execute("SELECT COUNT(*) FROM var_reports vr LEFT JOIN vendors v ON vr.vendor_id = v.id WHERE v.id IS NULL")
print('Unlinked VARs:', cur.fetchone()[0])

cur.execute("SELECT vr.vendor_id, vr.filename FROM var_reports vr LEFT JOIN vendors v ON vr.vendor_id = v.id WHERE v.id IS NULL LIMIT 15")
for r in cur.fetchall():
    print(f'  orphan: vid={r[0]}  file={r[1]}')

cur.execute("SELECT COUNT(*) FROM vendors v LEFT JOIN var_reports vr ON v.id = vr.vendor_id WHERE vr.id IS NULL")
print('Vendors without VARs:', cur.fetchone()[0])

cur.execute("SELECT vendor_id, filename, overall_score, decision_band FROM var_reports WHERE overall_score IS NOT NULL LIMIT 8")
for r in cur.fetchall():
    print(f'  scored: {r}')

# Sample vendor IDs
cur.execute("SELECT id, company_name FROM vendors LIMIT 10")
for r in cur.fetchall():
    print(f'  vendor: id={r[0]}  name={r[1]}')

# Sample VAR vendor_ids that ARE linked
cur.execute("SELECT DISTINCT vr.vendor_id, v.company_name FROM var_reports vr JOIN vendors v ON vr.vendor_id = v.id LIMIT 10")
for r in cur.fetchall():
    print(f'  linked: vid={r[0]}  name={r[1]}')

# Check match_method distribution
cur.execute("SELECT match_method, COUNT(*) FROM var_reports GROUP BY match_method")
for r in cur.fetchall():
    print(f'  match_method: {r[0]} = {r[1]}')

# PRAGMA for var_reports
cur.execute("PRAGMA table_info(var_reports)")
for r in cur.fetchall():
    print(f'  var_col: {r}')

con.close()
