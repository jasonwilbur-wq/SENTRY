"""Ingest and profile the two regulatory Excel files."""
import sys, json
from pathlib import Path

try:
    import openpyxl
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl',
                           '--index-url', 'https://pypi.ci.artifacts.walmart.com/artifactory/api/pypi/external-pypi/simple',
                           '--allow-insecure-host', 'pypi.ci.artifacts.walmart.com', '-q'])
    import openpyxl

BASE = Path(r'C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\OSINT\Regulatory Data')

def read_xl(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    results = {}
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue
        headers = [str(c).strip() if c is not None else f'col_{i}' for i, c in enumerate(rows[0])]
        data = []
        for row in rows[1:]:
            if all(c is None for c in row):
                continue
            data.append(dict(zip(headers, row)))
        results[ws.title] = {'headers': headers, 'rows': data}
    return results

for fname in [
    'Regulatory Data - 202601_CLEAN.xlsx',
    'Regulatory Data - 202602_CLEAN.xlsx',
]:
    path = BASE / fname
    print(f'\n{"=" * 70}')
    print(f'FILE: {fname}')
    xl = read_xl(path)
    for sheet, content in xl.items():
        h = content['headers']
        rows = content['rows']
        print(f'  SHEET: {sheet!r}  ({len(rows)} data rows)')
        print(f'  COLUMNS ({len(h)}): {h}')
        print(f'  SAMPLE ROWS (first 3):')
        for r in rows[:3]:
            # Truncate long values for readability
            trunc = {k: (str(v)[:80] if v is not None else None) for k, v in r.items()}
            print(f'    {json.dumps(trunc, default=str)}')
