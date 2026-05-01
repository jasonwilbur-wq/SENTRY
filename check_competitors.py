import sqlite3

conn = sqlite3.connect('data/sentry.db')

print('\n=== ALL COMPETITORS WITH EVENT COUNTS ===')
for row in conn.execute('''
    SELECT competitor, 
           COUNT(*) as total,
           COUNT(CASE WHEN category = 'Cyber' THEN 1 END) as cyber,
           COUNT(CASE WHEN category = 'ORC/Theft' THEN 1 END) as orc,
           COUNT(CASE WHEN category = 'Recall' THEN 1 END) as recall,
           COUNT(CASE WHEN category = 'Legal' THEN 1 END) as legal,
           COUNT(CASE WHEN category = 'Technology' THEN 1 END) as tech
    FROM competitor_events
    GROUP BY competitor
    ORDER BY total DESC
''').fetchall():
    print(f'{row[0]:30} | Total: {row[1]:3} | Cyber: {row[2]:2} | ORC: {row[3]:2} | Recall: {row[4]:2} | Legal: {row[5]:2} | Tech: {row[6]:2}')

print('\n=== SAMPLE EVENTS FOR TOP 3 COMPETITORS ===')
for comp in ['Amazon', 'Costco', 'Kroger']:
    print(f'\n--- {comp} ---')
    for row in conn.execute('''
        SELECT event_date, event_title, category
        FROM competitor_events
        WHERE competitor = ?
        ORDER BY event_date DESC
        LIMIT 3
    ''', (comp,)).fetchall():
        print(f'  {row[0]} | [{row[2]}] {row[1][:60]}')

conn.close()
