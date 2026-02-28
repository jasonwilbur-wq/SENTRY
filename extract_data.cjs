// One-shot script: pull RAW_CSV_DATA and SENTRY_FRAMEWORK_TEXT out of constants.ts
const fs = require('fs');
const raw = fs.readFileSync('./constants.ts', 'utf8');

// ── Extract CSV ─────────────────────────────────────────────────────────────
const csvStart = raw.indexOf('RAW_CSV_DATA = `') + 'RAW_CSV_DATA = `'.length;
const csvEnd   = raw.indexOf('`;\n', csvStart);
const csvData  = raw.slice(csvStart, csvEnd);
fs.writeFileSync('./backend/data/vendors.csv', csvData, 'utf8');
console.log('vendors.csv written:', csvData.split('\n').length, 'lines');

// ── Extract framework text ───────────────────────────────────────────────────
const fwStart = raw.indexOf('SENTRY_FRAMEWORK_TEXT = `') + 'SENTRY_FRAMEWORK_TEXT = `'.length;
const fwEnd   = raw.indexOf('`;\n\nexport const ARCHITECTURE_TREE_DATA');
const fwData  = raw.slice(fwStart, fwEnd);
fs.writeFileSync('./backend/data/framework.md', fwData, 'utf8');
console.log('framework.md written:', fwData.length, 'chars');