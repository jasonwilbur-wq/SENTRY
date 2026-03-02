import sqlite3

conn = sqlite3.connect('data/sentry.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

rows = cursor.execute(
    'SELECT filename, sharepoint_url FROM var_reports WHERE overall_score IS NULL LIMIT 5'
).fetchall()

print('\nSample VARs without scores:\n')
for row in rows:
    print(f'Filename: {row["filename"]}')
    url = row["sharepoint_url"] or "(empty)"
    print(f'SharePoint URL: {url[:100]}...\n')

# Check how many have SharePoint URLs
total = cursor.execute('SELECT COUNT(*) FROM var_reports WHERE overall_score IS NULL').fetchone()[0]
with_urls = cursor.execute(
    'SELECT COUNT(*) FROM var_reports WHERE overall_score IS NULL AND sharepoint_url IS NOT NULL AND sharepoint_url != ""'
).fetchone()[0]

print(f'Total without scores: {total}')
print(f'With SharePoint URLs: {with_urls} ({with_urls/total*100:.1f}%)\n')

conn.close()
