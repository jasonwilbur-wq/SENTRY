import sqlite3

conn = sqlite3.connect('data/sentry.db')

print('\n=== Competitor Events Schema ===')
for row in conn.execute('PRAGMA table_info(competitor_events)').fetchall():
    print(f'  {row[1]:30} {row[2]}')

print('\n=== Competitor Entities Schema ===')
try:
    for row in conn.execute('PRAGMA table_info(competitor_entities)').fetchall():
        print(f'  {row[1]:30} {row[2]}')
except:
    print('  Table does not exist - needs to be created/refreshed')

conn.close()
