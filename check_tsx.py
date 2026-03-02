"""Fix emoji escape sequences in RegulatoryIntelligence.tsx."""
from pathlib import Path

path = Path(r'C:\Users\j0w16ja\SENTRY_v2-main\components\RegulatoryIntelligence.tsx')
src = path.read_text(encoding='utf-8')

print('File length before:', len(src))

# Show lines that have backslash-u escape sequences
for i, line in enumerate(src.splitlines(), 1):
    if '\\u{' in line or '\\u2' in line:
        print(f'  Line {i}: {repr(line[:100])}')
