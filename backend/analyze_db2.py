import sqlite3
con = sqlite3.connect('C:/Users/j0w16ja/SENTRY_v2-main/backend/data/sentry.db')
cur = con.cursor()

# vendor_highlights schema
cur.execute("PRAGMA table_info(vendor_highlights)")
for r in cur.fetchall():
    print(f'  hl_col: {r}')

cur.execute("SELECT COUNT(*) FROM vendor_highlights")
print('Total highlights:', cur.fetchone()[0])

cur.execute("SELECT COUNT(DISTINCT vendor_id) FROM vendor_highlights")
print('Vendors with highlights:', cur.fetchone()[0])

# Sample highlights
cur.execute("SELECT * FROM vendor_highlights LIMIT 3")
for r in cur.fetchall():
    print(f'  hl: {r}')

# How many VARs have scores we could still extract?
cur.execute("SELECT COUNT(*) FROM var_reports WHERE overall_score IS NULL")
print('Unscored VARs:', cur.fetchone()[0])

# Sample unscored VARs
cur.execute("SELECT vendor_id, filename, match_method FROM var_reports WHERE overall_score IS NULL LIMIT 10")
for r in cur.fetchall():
    print(f'  unscored: {r}')

# Vendors table schema
cur.execute("PRAGMA table_info(vendors)")
for r in cur.fetchall():
    print(f'  v_col: {r}')

# Sample full vendor record
cur.execute("SELECT * FROM vendors LIMIT 2")
for r in cur.fetchall():
    print(f'  vendor_row: {r}')

con.close()
