"""Quick DB status check."""
import sqlite3
conn = sqlite3.connect('data/sentry.db')

types = conn.execute('SELECT report_type, COUNT(*) as c FROM var_reports GROUP BY report_type ORDER BY c DESC').fetchall()
print('Report types in DB:')
for t in types: print(f'  {t[0]}: {t[1]}')

print()
print('Most recent 10 reports:')
rows = conn.execute('SELECT filename, report_date, report_type FROM var_reports ORDER BY report_date DESC LIMIT 10').fetchall()
for r in rows: print(f'  [{r[2]}] {r[1]}  {r[0][:70]}')

print()
print('Oldest 5 reports:')
rows = conn.execute('SELECT filename, report_date FROM var_reports ORDER BY report_date ASC LIMIT 5').fetchall()
for r in rows: print(f'  {r[1]}  {r[0][:70]}')

print()
date_range = conn.execute('SELECT MIN(report_date), MAX(report_date) FROM var_reports').fetchone()
print(f'Date range: {date_range[0]} to {date_range[1]}')

folder = conn.execute('SELECT folder_label, COUNT(*) FROM var_reports GROUP BY folder_label ORDER BY COUNT(*) DESC LIMIT 10').fetchall()
print('\nBy folder_label:')
for f in folder: print(f'  {f[0] or "(none)"}: {f[1]}')
conn.close()
