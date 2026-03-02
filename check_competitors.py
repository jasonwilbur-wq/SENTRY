import sqlite3

conn = sqlite3.connect('data/sentry.db')

print('\n=== ALL TABLES IN DATABASE ===')
for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
    count = conn.execute(f'SELECT COUNT(*) FROM {row[0]}').fetchone()[0]
    print(f'  {row[0]}: {count} rows')

conn.close()
