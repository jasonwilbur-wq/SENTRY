import sqlite3

conn = sqlite3.connect('data/sentry.db')

print('\n=== VERIFICATION: Removed Entities Check ===')
print('\nSearching for removed entities (should return 0 results):')

removed = ['Axon', 'CISA', 'California', 'Walmart', 'Federal Govt', 'NIST', 'General Retail']

for entity in removed:
    count = conn.execute('''
        SELECT COUNT(*) FROM competitor_events WHERE competitor LIKE ?
    ''', (f'%{entity}%',)).fetchone()[0]
    status = '✅ REMOVED' if count == 0 else f'❌ FOUND {count} events'
    print(f'  {entity:20} : {status}')

print('\n=== NEW COMPETITOR COUNT ===')
total = conn.execute('SELECT COUNT(DISTINCT competitor) FROM competitor_events').fetchone()[0]
print(f'  Total unique competitors: {total}')

print('\n=== TOP 10 COMPETITORS ===')
for row in conn.execute('''
    SELECT competitor, COUNT(*) as cnt
    FROM competitor_events
    GROUP BY competitor
    ORDER BY cnt DESC
    LIMIT 10
''').fetchall():
    print(f'  {row[0]:30} {row[1]:3} events')

print('\n=== EVENT TOTALS ===')
stats = conn.execute('''
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN category = 'Cyber' THEN 1 END) as cyber,
        COUNT(CASE WHEN category = 'ORC/Theft' THEN 1 END) as orc,
        COUNT(CASE WHEN category = 'Technology' THEN 1 END) as tech
    FROM competitor_events
''').fetchone()
print(f'  Total Events: {stats[0]}')
print(f'  Cyber Events: {stats[1]}')
print(f'  ORC/Theft Events: {stats[2]}')
print(f'  Technology Events: {stats[3]}')

conn.close()
print('\n✅ Verification complete!\n')
