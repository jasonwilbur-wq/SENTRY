import sqlite3

conn = sqlite3.connect('data/sentry.db')
cursor = conn.cursor()

row = cursor.execute(
    'SELECT '
    '  COUNT(*) as total, '
    '  SUM(CASE WHEN description != "" AND LENGTH(description) > 50 THEN 1 ELSE 0 END) as with_desc, '
    '  SUM(CASE WHEN vendor_highlight != "" THEN 1 ELSE 0 END) as with_highlight, '
    '  SUM(CASE WHEN pros != "" THEN 1 ELSE 0 END) as with_pros, '
    '  SUM(CASE WHEN cons != "" THEN 1 ELSE 0 END) as with_cons, '
    '  SUM(CASE WHEN concerns != "" THEN 1 ELSE 0 END) as with_concerns, '
    '  SUM(CASE WHEN maturity_level != "" THEN 1 ELSE 0 END) as with_maturity, '
    '  SUM(CASE WHEN use_cases != "" THEN 1 ELSE 0 END) as with_use_cases, '
    '  SUM(CASE WHEN value_to_walmart != "" THEN 1 ELSE 0 END) as with_value '
    'FROM vendors'
).fetchone()

print('\n' + '='*80)
print('FINAL VENDOR CARD COMPLETION REPORT')
print('='*80)
print(f'\nTotal Vendors: {row[0]:,}\n')
print(f'Rich Descriptions:    {row[1]:,} ({row[1]/row[0]*100:.1f}%)')
print(f'Highlights:           {row[2]:,} ({row[2]/row[0]*100:.1f}%)')
print(f'Pros:                 {row[3]:,} ({row[3]/row[0]*100:.1f}%)')
print(f'Cons:                 {row[4]:,} ({row[4]/row[0]*100:.1f}%)')
print(f'Concerns:             {row[5]:,} ({row[5]/row[0]*100:.1f}%)')
print(f'Maturity:             {row[6]:,} ({row[6]/row[0]*100:.1f}%)')
print(f'Use Cases:            {row[7]:,} ({row[7]/row[0]*100:.1f}%)')
print(f'Value Propositions:   {row[8]:,} ({row[8]/row[0]*100:.1f}%)')
print('\n' + '='*80 + '\n')

# Get sample of enhanced vendors
print('SAMPLE ENHANCED VENDORS:\n')
samples = cursor.execute(
    'SELECT company_name, category, description, pros, cons FROM vendors '
    'WHERE LENGTH(description) > 100 '
    'ORDER BY RANDOM() LIMIT 3'
).fetchall()

for i, vendor in enumerate(samples, 1):
    print(f'{i}. {vendor[0]} ({vendor[1]})')
    print(f'   Description: {vendor[2][:120]}...')
    print(f'   Pros: {vendor[3][:100]}...')
    print(f'   Cons: {vendor[4][:100]}...\n')

conn.close()
