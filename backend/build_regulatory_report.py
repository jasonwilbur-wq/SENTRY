"""
build_regulatory_report.py
==========================
Ingests both CLEAN sheets from 202601 + 202602 XLSX files,
merges, deduplicates, scores each obligation, and writes:
  - data/json_reports/regulatory-briefing.json  (Sentry schema)
  - data/regulatory_rows.json                   (raw merged rows, for debug)
Run from backend/ directory.
"""
import json, re, hashlib, sys
from datetime import datetime, date
from pathlib import Path

try:
    import openpyxl
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl',
        '--index-url', 'https://pypi.ci.artifacts.walmart.com/artifactory/api/pypi/external-pypi/simple',
        '--allow-insecure-host', 'pypi.ci.artifacts.walmart.com', '-q'])
    import openpyxl

SRC = Path(r'C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\OSINT\Regulatory Data')
OUT_JSON   = Path('data/json_reports/regulatory-briefing.json')
OUT_RAW    = Path('data/regulatory_rows.json')
NOW_ISO    = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

# ── helpers ────────────────────────────────────────────────────────────────────
def slug(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]

def cell_str(v) -> str:
    if v is None:
        return ''
    if isinstance(v, (datetime, date)):
        return v.strftime('%Y-%m-%d')
    return str(v).strip()

def read_clean_sheet(path: Path, sheet_keyword: str) -> list[dict]:
    """Read the *_CLEAN sheet from an xlsx workbook."""
    wb = openpyxl.load_workbook(path, data_only=True)
    # prefer sheet whose name ends with _CLEAN
    sheet = next((ws for ws in wb.worksheets if 'CLEAN' in ws.title.upper()), wb.worksheets[0])
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [cell_str(c) or f'col_{i}' for i, c in enumerate(rows[0])]
    out = []
    for ri, row in enumerate(rows[1:], start=2):
        if all(c is None for c in row):
            continue
        d = {h: cell_str(v) for h, v in zip(headers, row)}
        d['_source'] = f'{path.name}:row{ri}'
        out.append(d)
    return out

# ── canonical jurisdiction normaliser ──────────────────────────────────────────
JURIS_MAP = {
    'united states (federal)': 'United States (Federal)',
    'united states': 'United States (Federal)',
    'us': 'United States (Federal)',
    'usa': 'United States (Federal)',
    'eu': 'European Union',
    'european union': 'European Union',
    'uk': 'United Kingdom',
    'united kingdom': 'United Kingdom',
}
US_STATES = [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
    'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
    'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
    'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
    'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
    'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
    'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
    'Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington D.C.',
]

def norm_juris(raw: str) -> str:
    if not raw:
        return 'Unknown'
    lo = raw.lower().strip()
    if lo in JURIS_MAP:
        return JURIS_MAP[lo]
    for st in US_STATES:
        if st.lower() in lo:
            return f'{st}, USA'
    for k, v in JURIS_MAP.items():
        if k in lo:
            return v
    return raw.strip().title()

# ── tech category normaliser ────────────────────────────────────────────────────
TECH_PRIORITY = {
    'AI': 5, 'Biometrics': 5, 'ALPR/LPR': 4, 'Drones/UAS': 4,
    'Data Privacy': 4, 'Surveillance': 3, 'ORC': 3,
    'Weapons Detection': 3, 'Robotics': 2, 'Other': 1,
}

def norm_tech(raw: str) -> str:
    if not raw:
        return 'Other'
    lo = raw.lower()
    if 'ai' in lo or 'artificial' in lo or 'machine learning' in lo:
        return 'AI'
    if 'biometric' in lo or 'facial' in lo or 'fingerprint' in lo:
        return 'Biometrics'
    if 'alpr' in lo or 'license plate' in lo or 'lpr' in lo:
        return 'ALPR/LPR'
    if 'drone' in lo or 'uas' in lo or 'uav' in lo:
        return 'Drones/UAS'
    if 'privacy' in lo or 'data protection' in lo or 'gdpr' in lo:
        return 'Data Privacy'
    if 'surveillance' in lo or 'cctv' in lo or 'camera' in lo:
        return 'Surveillance'
    if 'orc' in lo or 'retail crime' in lo:
        return 'ORC'
    if 'weapon' in lo or 'firearm' in lo:
        return 'Weapons Detection'
    if 'robot' in lo or 'amr' in lo:
        return 'Robotics'
    return raw.strip()[:40]

# ── status normaliser ──────────────────────────────────────────────────────────
STATUS_MAP = {
    'enacted': 'Enacted',
    'enforced': 'Enacted',
    'enforcement': 'Enacted',
    'active': 'Enacted',
    'in effect': 'Enacted',
    'approved': 'Enacted',
    'signed': 'Enacted',
    'proposed': 'Proposed',
    'pending': 'Proposed',
    'introduced': 'Proposed',
    'approved by committee': 'Proposed',
    'released': 'Proposed',
    'passed': 'Enacted',
    'failed': 'Failed',
    'withdrawn': 'Failed',
    'expired': 'Failed',
}

def norm_status(raw: str) -> str:
    lo = raw.lower().strip()
    for k, v in STATUS_MAP.items():
        if k in lo:
            return v
    return 'Proposed'

# ── risk scoring engine ────────────────────────────────────────────────────────
def score_risk(row: dict) -> dict:
    """Heuristic risk scoring based on tech category, status, and jurisdiction."""
    tech    = row.get('_tech', 'Other')
    status  = row.get('_status', 'Proposed')
    juris   = row.get('_jurisdiction', '')
    desc    = (row.get('Detailed Description of Scope and Key Provisions', '') or '').lower()

    # Impact: based on tech sensitivity and operational breadth
    impact_base = TECH_PRIORITY.get(tech, 2)
    # Boost if description mentions penalties, fines, enforcement
    if any(w in desc for w in ['penalty', 'fine', 'civil', 'criminal', 'enforcement', 'prohibition']):
        impact_base = min(5, impact_base + 1)
    # Federal / EU / UK = higher enterprise impact
    if any(x in juris for x in ['Federal', 'European Union', 'United Kingdom']):
        impact_base = min(5, impact_base + 1)
    impact = max(1, min(5, impact_base))

    # Likelihood: enacted laws are almost certain; proposed are possible-likely
    if status == 'Enacted':
        likelihood = 4
    elif status == 'Proposed':
        likelihood = 3
    else:
        likelihood = 1
    # Reduce for non-Walmart-relevant jurisdictions (international with no ops)
    if juris in ('European Union', 'United Kingdom') and 'United States' not in juris:
        likelihood = max(1, likelihood - 1)

    score = impact * likelihood
    if score <= 6:   rag = 'Green'
    elif score <= 12: rag = 'Yellow'
    elif score <= 18: rag = 'Amber'
    else:            rag = 'Red'

    reason = (
        f"Tech={tech}, Status={status}, Jurisdiction={juris}: "
        f"Impact={impact}/5 (operational breadth + enforcement provisions), "
        f"Likelihood={likelihood}/5 (enacted={status=='Enacted'}). "
        f"Score={score}."
    )
    return {'impact': impact, 'likelihood': likelihood, 'score': score, 'rag': rag, 'reason': reason}

# ── NIST CSF framework mapper ──────────────────────────────────────────────────
NIST_MAP = {
    'AI':               ('NIST AI RMF GOVERN-1.1', 'GS-AI-01'),
    'Biometrics':       ('NIST CSF PR.AC-1',        'GS-BIO-01'),
    'ALPR/LPR':         ('NIST CSF PR.AC-3',        'GS-ALPR-01'),
    'Drones/UAS':       ('NIST CSF PR.IP-1',        'GS-UAS-01'),
    'Data Privacy':     ('ISO 27001 A.18.1.4',       'GS-PRIV-01'),
    'Surveillance':     ('NIST CSF DE.CM-1',        'GS-CAM-01'),
    'ORC':              ('NIST CSF DE.CM-3',        'GS-ORC-01'),
    'Weapons Detection':('NIST CSF PR.PT-1',        'GS-WEAP-01'),
    'Robotics':         ('NIST CSF PR.IP-2',        'GS-ROBOT-01'),
    'Other':            ('NIST CSF ID.GV-1',        'GS-GOV-01'),
}

# ── evidence status (heuristic from status+description) ───────────────────────
def evidence_status(status: str, desc: str) -> str:
    if status == 'Enacted':
        return 'Partially'   # assumed until full VAR/compliance review
    return 'Unknown'

# ── ingest both files ──────────────────────────────────────────────────────────
print('Ingesting 202601_CLEAN ...')
rows_01 = read_clean_sheet(SRC / 'Regulatory Data - 202601_CLEAN.xlsx', '202601')
print(f'  {len(rows_01)} rows')

print('Ingesting 202602_CLEAN ...')
rows_02 = read_clean_sheet(SRC / 'Regulatory Data - 202602_CLEAN.xlsx', '202602')
print(f'  {len(rows_02)} rows')

all_rows = rows_01 + rows_02
print(f'  Combined: {len(all_rows)} rows before dedup')

# ── deduplicate by (jurisdiction + law name) ───────────────────────────────────
seen_keys: set[str] = set()
deduped: list[dict] = []
for row in all_rows:
    loc  = cell_str(row.get('Location', ''))
    name = cell_str(row.get('Name of Law, Regulation, Ordinance, or Bill', ''))
    key  = slug(f'{loc}|{name}')
    if key in seen_keys:
        continue
    seen_keys.add(key)
    row['_jurisdiction'] = norm_juris(loc)
    row['_tech']         = norm_tech(cell_str(row.get('Type of Technology', '')))
    row['_status']       = norm_status(cell_str(row.get('Status', '')))
    row['_id']           = 'REG-' + hashlib.md5(key.encode()).hexdigest()[:8].upper()
    row['_key']          = key
    deduped.append(row)

print(f'  After dedup: {len(deduped)} unique obligations')

# ── sort by risk descending ────────────────────────────────────────────────────
for row in deduped:
    row['_risk'] = score_risk(row)

deduped.sort(key=lambda r: r['_risk']['score'], reverse=True)

# ── build jurisdiction list ────────────────────────────────────────────────────
jurisdictions = sorted(set(r['_jurisdiction'] for r in deduped))

# ── build obligations list for JSON ───────────────────────────────────────────
def build_obligation(row: dict) -> dict:
    tech  = row['_tech']
    nist_ctrl, gs_tag = NIST_MAP.get(tech, ('NIST CSF ID.GV-1', 'GS-GOV-01'))
    desc  = row.get('Detailed Description of Scope and Key Provisions', '') or ''
    # truncate summary to ~30 words
    words = desc.split()
    summary_30 = ' '.join(words[:30]) + ('...' if len(words) > 30 else '')

    raw_link = row.get('Source Link(s)', '') or ''
    links = [l.strip() for l in re.split(r'[,;\n]+', raw_link) if l.strip().startswith('http')]
    if not links:
        links = []

    ev_status = evidence_status(row['_status'], desc.lower())

    # date parsing
    raw_date = row.get('Date Enacted or Proposed', '') or ''
    enacted_date = None
    if isinstance(raw_date, (datetime, date)):
        enacted_date = raw_date.strftime('%Y-%m-%d') if hasattr(raw_date, 'strftime') else str(raw_date)
    elif raw_date:
        # Try to parse YYYY-MM-DD
        m = re.search(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', raw_date)
        if m:
            enacted_date = f'{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'
        else:
            # Try YYYY
            m2 = re.search(r'(\d{4})', raw_date)
            enacted_date = f'{m2.group(1)}-01-01' if m2 else None

    # criticality based on risk score
    risk_score = row['_risk']['score']
    criticality = 1 if risk_score <= 4 else 2 if risk_score <= 8 else 3 if risk_score <= 12 else 4 if risk_score <= 18 else 5

    controls = [{
        'control_id':   nist_ctrl,
        'description':  f'{tech} compliance review and evidence collection',
        'owner':        'Global Security & Emerging Technology',
        'status':       'Partial' if ev_status == 'Partially' else 'None',
        'last_reviewed': '2026-02-28',
        'evidence_link': links[0] if links else ''
    }, {
        'control_id':   gs_tag,
        'description':  f'Internal {tech} governance control',
        'owner':        'Global Security & Emerging Technology',
        'status':       'Partial',
        'last_reviewed': '2026-02-28',
        'evidence_link': links[1] if len(links) > 1 else ''
    }]

    return {
        'id':             row['_id'],
        'jurisdiction':   row['_jurisdiction'],
        'title':          row.get('Name of Law, Regulation, Ordinance, or Bill', 'Unknown'),
        'summary':        summary_30,
        'tech_category':  tech,
        'effective_date': enacted_date,
        'deadline':       None,
        'criticality':    criticality,
        'evidence_status': ev_status,
        'evidence_links': links,
        'risk':           row['_risk'],
        'controls':       controls,
        'full_description': desc,
        'status':         row['_status'],
        'provenance':     [row['_source']],
    }

obligations = [build_obligation(r) for r in deduped]

# ── executive summary (top 3 actions) ─────────────────────────────────────────
top3_red_amber = [o for o in obligations if o['risk']['rag'] in ('Red', 'Amber')][:3]
exec_summary = (
    f"As of {datetime.utcnow().strftime('%B %Y')}, SENTRY's regulatory tracker covers "
    f"{len(obligations)} unique obligations across {len(jurisdictions)} jurisdictions, spanning "
    f"AI, Biometrics, ALPR/LPR, Drones/UAS, and Data Privacy technologies. "
    f"{sum(1 for o in obligations if o['risk']['rag'] == 'Red')} Red and "
    f"{sum(1 for o in obligations if o['risk']['rag'] == 'Amber')} Amber obligations require immediate attention. "
    f"Top 3 actions: (1) Validate AI governance controls against EU AI Act and state-level RAISE Act requirements; "
    f"(2) Review ALPR/LPR data retention compliance for enacted state laws; "
    f"(3) Confirm biometric consent and disclosure posture across all US store deployments."
)

# ── top actions ───────────────────────────────────────────────────────────────
top_actions = [
    {
        'title': 'AI Governance Review',
        'description': 'Conduct cross-functional review of AI use cases against EU AI Act, NY RAISE Act, and Colorado AI Act requirements. Map controls to NIST AI RMF.',
        'owner': 'Global Security & Emerging Technology / Legal',
        'priority': 'High',
        'eta': '2026-04-30'
    },
    {
        'title': 'Biometric Consent Audit',
        'description': 'Audit biometric data collection at all US store locations for BIPA (IL), TX CUBI, WA MY Health MY Data, and NYC Admin Code compliance.',
        'owner': 'Privacy / Legal / Store Ops',
        'priority': 'High',
        'eta': '2026-04-15'
    },
    {
        'title': 'ALPR Data Retention Policy Update',
        'description': 'Update ALPR data retention schedules to comply with enacted state laws (VA, MN, NM, WA). Document evidence of policy enforcement.',
        'owner': 'Global Security / Legal',
        'priority': 'High',
        'eta': '2026-05-01'
    },
    {
        'title': 'UAS / Drone Vendor Compliance Review',
        'description': 'Verify all drone vendors are not on FCC prohibited list and comply with FAA Part 107 requirements.',
        'owner': 'Global Security / Procurement',
        'priority': 'Med',
        'eta': '2026-05-15'
    },
    {
        'title': 'State-Level ORC Compliance Mapping',
        'description': 'Map CORCA (H.R. 2853) and state ORC laws to existing loss prevention programs and identify reporting obligation gaps.',
        'owner': 'Asset Protection / Legal',
        'priority': 'Med',
        'eta': '2026-06-01'
    },
]

# ── assemble JSON ──────────────────────────────────────────────────────────────
report = {
    'id':            'regulatory-briefing',
    'title':         'SENTRY Regulatory Intelligence Briefing — Global Security & Emerging Technology',
    'summary':       exec_summary,
    'created_at':    NOW_ISO,
    'data_through':  '2026-02-28',
    'jurisdictions': jurisdictions,
    'stats': {
        'total_obligations': len(obligations),
        'red':     sum(1 for o in obligations if o['risk']['rag'] == 'Red'),
        'amber':   sum(1 for o in obligations if o['risk']['rag'] == 'Amber'),
        'yellow':  sum(1 for o in obligations if o['risk']['rag'] == 'Yellow'),
        'green':   sum(1 for o in obligations if o['risk']['rag'] == 'Green'),
        'enacted': sum(1 for o in obligations if o['status'] == 'Enacted'),
        'proposed':sum(1 for o in obligations if o['status'] == 'Proposed'),
        'tech_breakdown': {}
    },
    'obligations':   obligations,
    'top_actions':   top_actions,
    'assumptions': [
        'INFERENCE: Both input files are Excel (.xlsx), not CSV. The CLEAN sheets (202601_CLEAN, 202602_CLEAN) were used as Dataset A (regulatory obligations). No compliance_evidence.csv was found; evidence_status is heuristically assigned as Partially for Enacted laws and Unknown for Proposed.',
        'SCHEMA MAPPING: Location -> jurisdiction, Type of Technology -> tech_category, Name of Law... -> title, Status -> evidence_status (after normalisation), Detailed Description -> summary/full_description, Date Enacted or Proposed -> effective_date, Source Link(s) -> evidence_links.',
        'No compliance_evidence.csv was provided. Control mappings are generated from NIST CSF/AI RMF and internal GS tag templates. All evidence_status values should be validated by compliance team.',
        'Deadline dates are not present in the source data; deadline fields are set to null. Legal team should populate these.',
        'Risk scores are heuristic: Impact derived from tech sensitivity + jurisdiction scope + penalty language detection. Likelihood derived from enactment status. All top-12 assessments should be validated by Legal and Security.',
        'Duplicate detection uses Location + Law Name as composite key. Cross-file duplicates with slightly different location strings may not have been caught.',
    ],
    'confidence':    'Med',
    'schema_version': '1.0',
    'ingestion_notes': {
        '202601_CLEAN.xlsx': f'{len(rows_01)} rows ingested from 202601_CLEAN sheet',
        '202602_CLEAN.xlsx': f'{len(rows_02)} rows ingested from 202602_CLEAN sheet',
        'dedup_removed': len(all_rows) - len(deduped),
        'final_obligations': len(obligations),
    }
}

# tech breakdown stats
from collections import Counter
tech_counts = Counter(o['tech_category'] for o in obligations)
report['stats']['tech_breakdown'] = dict(tech_counts.most_common())

# ── write outputs ──────────────────────────────────────────────────────────────
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUT_JSON.write_text(json.dumps(report, indent=2, default=str), encoding='utf-8')
OUT_RAW.write_text(json.dumps(deduped, indent=2, default=str), encoding='utf-8')

print(f'\nJSON report: {OUT_JSON}  ({OUT_JSON.stat().st_size // 1024} KB)')
print(f'Raw rows:    {OUT_RAW}')
print(f'\nStats:')
for k, v in report['stats'].items():
    if k != 'tech_breakdown':
        print(f'  {k}: {v}')
print('  Tech breakdown:', dict(tech_counts.most_common(8)))
print('\nDone.')
