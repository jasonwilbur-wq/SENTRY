import sys
path = r'C:\Users\j0w16ja\SENTRY_v2-main\components\RegulatoryObligationModal.tsx'
src = open(path, encoding='utf-8').read()
print('File size:', len(src))

bsu = chr(92) + 'u{'
hits = [(i+1, l) for i, l in enumerate(src.splitlines()) if bsu in l]
print('Hits:', len(hits))
for ln, l in hits:
    print(f'  L{ln}: {repr(l)[:100]}')

# Add emoji constants after RAG_COLORS block
insert_after = 'const RAG_COLORS'
idx = src.find(insert_after)
end_idx = src.find('};', idx) + 2
constants = (
    '\n\n'
    '// Emoji constants\n'
    'const E_USER = String.fromCodePoint(0x1F464);\n'
    'const E_CAL  = String.fromCodePoint(0x1F4C5);\n'
    'const E_LINK = String.fromCodePoint(0x1F517);\n'
)
src = src[:end_idx] + constants + src[end_idx:]

# Fix the 3 JSX text occurrences
fixes = [
    (chr(92) + 'u{1F464} {ctrl.owner}', '{E_USER} {ctrl.owner}'),
    (chr(92) + 'u{1F4C5} Reviewed:', '{E_CAL} Reviewed:'),
    (chr(92) + 'u{1F517} {ctrl.evidence_link}', '{E_LINK} {ctrl.evidence_link}'),
]
for old, new in fixes:
    if old in src:
        src = src.replace(old, new)
        print(f'  Fixed: {repr(old)[:50]}')
    else:
        print(f'  NOT FOUND: {repr(old)[:50]}')

open(path, 'w', encoding='utf-8').write(src)
remaining = [(i+1, l) for i, l in enumerate(src.splitlines()) if bsu in l]
print(f'Done. {len(remaining)} remaining issues.')
