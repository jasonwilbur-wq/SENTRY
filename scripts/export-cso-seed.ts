/**
 * Seed exporter: serialize the static CSO_PROFILES into JSON for the backend
 * to load on first boot. This keeps the existing curated data as the seed of
 * record while migrating the source of truth to SQLite — no hand-transcription.
 *
 * Run: npx vite-node scripts/export-cso-seed.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CSO_PROFILES } from '../data/csoProfiles';

const OUT = resolve(import.meta.dirname, '../backend/data/cso_profiles_seed.json');
mkdirSync(dirname(OUT), { recursive: true });

const payload = {
  generated_at: new Date().toISOString(),
  schema: 'sentry-exec-profile@1',
  count: CSO_PROFILES.length,
  profiles: CSO_PROFILES,
};

writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote ${CSO_PROFILES.length} profiles -> ${OUT}`);
