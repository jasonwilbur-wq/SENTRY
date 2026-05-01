import sqlite3
conn = sqlite3.connect('data/sentry.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(vendors)')
cols = cursor.fetchall()
print('Vendor table columns:')
for col in cols:
    print(f'  {col[1]} ({col[2]})')
conn.close()
