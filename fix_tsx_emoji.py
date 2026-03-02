"""Surgical fix for emoji escape sequences in RegulatoryIntelligence.tsx."""
from pathlib import Path

path = Path(r'C:\Users\j0w16ja\SENTRY_v2-main\components\RegulatoryIntelligence.tsx')
src = path.read_text(encoding='utf-8')

# 1. Add E_CAL / E_USER / E_DL constants right after the TECH_ICONS block
# The TECH_ICONS block ends with '};'
# We'll insert after the first '};' that follows 'const TECH_ICONS'
idx = src.find('const TECH_ICONS')
end_idx = src.find('};', idx) + 2  # include the '};'

old_tech_block = src[idx:end_idx]
new_tech_block = (
    'const TECH_ICONS: Record<string, string> = {\n'
    "  AI: String.fromCodePoint(0x1F9E0),\n"
    "  'Data Privacy': String.fromCodePoint(0x1F512),\n"
    "  Biometrics: String.fromCodePoint(0x1F4F7),\n"
    "  'ALPR/LPR': String.fromCodePoint(0x1F697),\n"
    "  'Drones/UAS': String.fromCodePoint(0x1F681),\n"
    "  Surveillance: String.fromCodePoint(0x1F4F9),\n"
    "  ORC: String.fromCodePoint(0x1F6D2),\n"
    "  'Weapons Detection': String.fromCodePoint(0x1F6A8),\n"
    "  Robotics: String.fromCodePoint(0x1F916),\n"
    "  Other: String.fromCodePoint(0x2696),\n"
    '};\n'
    '\n'
    '// Emoji constants for use in JSX expressions\n'
    'const E_CAL  = String.fromCodePoint(0x1F4C5);\n'
    'const E_USER = String.fromCodePoint(0x1F464);\n'
    'const E_DL   = String.fromCodePoint(0x1F4E5);\n'
)

print('Old TECH_ICONS block found:', repr(old_tech_block[:60]))
src = src[:idx] + new_tech_block + src[end_idx:]
print('TECH_ICONS block replaced.')

# 2. Fix JSX text spans — literal \u{...} in JSX text positions
# These are raw backslash-u sequences, not actual unicode chars
fixes = [
    (r'<span>\u{1F4C5} {action.eta}</span>', '<span>{E_CAL} {action.eta}</span>'),
    (r'<span>\u{1F464} {action.owner}</span>', '<span>{E_USER} {action.owner}</span>'),
    ('\\u{1F4E5} JSON', '{E_DL} JSON'),
    ('label="\\u{1F534} Red"',  'label="Red"'),
    ('label="\\u{1F7E0} Amber"', 'label="Amber"'),
    ('label="\\u{1F7E1} Yellow"', 'label="Yellow"'),
    ('label="\\u{1F7E2} Green"', 'label="Green"'),
    ('sub="Risk 19\u2013', 'sub="Risk 19-'),
    ('sub="Risk 13\u2013', 'sub="Risk 13-'),
    ('sub="Risk 7\u2013', 'sub="Risk 7-'),
    ('sub="Risk 1\u2013', 'sub="Risk 1-'),
]

for old, new in fixes:
    if old in src:
        src = src.replace(old, new)
        print(f'  Fixed: {repr(old[:40])} -> {repr(new[:40])}')
    else:
        print(f'  NOT FOUND: {repr(old[:50])}')

path.write_text(src, encoding='utf-8')
print(f'\nWrote {len(src)} chars.')

# Verify - check for remaining backslash-u escape sequences in JSX text nodes
problems = []
for i, line in enumerate(src.splitlines(), 1):
    if '\\u{' in line:
        stripped = line.strip()
        in_str = ("'" in stripped and stripped.count("'") >= 2) or ('"' in stripped and stripped.count('"') >= 2)
        in_comment = stripped.startswith('//')
        if not in_str and not in_comment:
            problems.append((i, line))

if problems:
    print('REMAINING ISSUES:')
    for ln, line in problems:
        print(f'  Line {ln}: {line[:100]}')
else:
    print('All JSX text escape issues cleared!')
