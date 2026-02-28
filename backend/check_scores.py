"""Quick score verification."""
import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
rows = conn.execute(
    'SELECT filename, overall_score, decision_band, compliance_score, risk_score '
    'FROM var_reports ORDER BY report_date DESC'
).fetchall()
print(f'Total: {len(rows)} VARs in database')
print()

have_scores = 0
for r in rows:
    score = f"{r['overall_score']:.2f}" if r['overall_score'] else 'NULL'
    band = r['decision_band'] or '---'
    have_scores += 1 if r['overall_score'] else 0
    print(f"{r['filename'][:52]:<52} {score:>6}  {band}")

print()
print(f'Scores populated: {have_scores}/{len(rows)}')
conn.close()
