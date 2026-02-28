import sqlite3
c = sqlite3.connect('sentry.db')
print('Total VARs:', c.execute('SELECT COUNT(*) FROM var_reports').fetchone())
print('With SP URL:', c.execute("SELECT COUNT(*) FROM var_reports WHERE sharepoint_url != ''").fetchone())
print('Vendors with VARs:', c.execute('SELECT COUNT(DISTINCT vendor_id) FROM var_reports').fetchone())
rows = c.execute('SELECT vendor_id, filename, report_date FROM var_reports ORDER BY report_date DESC LIMIT 5').fetchall()
for r in rows:
    print(' ', r)
