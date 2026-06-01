import { describe, it, expect } from 'vitest';
import { PROJECTS, summarizePortfolio, normalizeHealth, mapApiProject, type Project } from './projectsData';

// ── Helper: build a minimal project with overridable fields ──────────────
const mk = (over: Partial<Project>): Project => ({
  project_id: 'PRJ-TEST',
  project_name: 'Test',
  summary: 'Test summary',
  managing_unit: 'Global Security',
  lifecycle_state: 'active',
  health: 'green',
  current_phase: 'Intake',
  risk_score: 1,
  sensitivity: 'internal',
  tags: '',
  progress_pct: 0,
  next_milestone: '',
  next_due_date: '',
  blockers_count: 0,
  last_update_at: '',
  last_update_by: '',
  est_cost: '',
  ...over,
});

describe('summarizePortfolio', () => {
  it('counts an empty portfolio as all zeros', () => {
    expect(summarizePortfolio([])).toEqual({
      total: 0,
      green: 0,
      yellow: 0,
      red: 0,
      active: 0,
      blockers: 0,
    });
  });

  it('counts health buckets correctly', () => {
    const s = summarizePortfolio([
      mk({ health: 'green' }),
      mk({ health: 'green' }),
      mk({ health: 'yellow' }),
      mk({ health: 'red' }),
    ]);
    expect(s.total).toBe(4);
    expect(s.green).toBe(2);
    expect(s.yellow).toBe(1);
    expect(s.red).toBe(1);
  });

  it('counts only active lifecycle states as active', () => {
    const s = summarizePortfolio([
      mk({ lifecycle_state: 'active' }),
      mk({ lifecycle_state: 'ended' }),
      mk({ lifecycle_state: 'blocked' }),
      mk({ lifecycle_state: 'active' }),
    ]);
    expect(s.active).toBe(2);
  });

  it('sums blockers across all projects', () => {
    const s = summarizePortfolio([
      mk({ blockers_count: 1 }),
      mk({ blockers_count: 0 }),
      mk({ blockers_count: 3 }),
    ]);
    expect(s.blockers).toBe(4);
  });

  it('health bucket counts always sum to total', () => {
    const s = summarizePortfolio();
    expect(s.green + s.yellow + s.red).toBe(s.total);
  });
});

describe('PROJECTS canonical data', () => {
  it('has a stable count and unique ids', () => {
    expect(PROJECTS.length).toBe(13);
    const ids = new Set(PROJECTS.map((p) => p.project_id));
    expect(ids.size).toBe(PROJECTS.length);
  });

  it('uses only normalized lowercase health values', () => {
    const valid = new Set(['green', 'yellow', 'red']);
    for (const p of PROJECTS) {
      expect(valid.has(p.health)).toBe(true);
    }
  });

  it('keeps progress_pct within 0..100', () => {
    for (const p of PROJECTS) {
      expect(p.progress_pct).toBeGreaterThanOrEqual(0);
      expect(p.progress_pct).toBeLessThanOrEqual(100);
    }
  });
});

describe('normalizeHealth', () => {
  it('passes through valid values', () => {
    expect(normalizeHealth('green')).toBe('green');
    expect(normalizeHealth('yellow')).toBe('yellow');
    expect(normalizeHealth('red')).toBe('red');
  });

  it('trims and lowercases messy backend casing', () => {
    expect(normalizeHealth('Green ')).toBe('green');
    expect(normalizeHealth('  RED')).toBe('red');
  });

  it('maps known synonyms', () => {
    expect(normalizeHealth('healthy')).toBe('green');
    expect(normalizeHealth('at-risk')).toBe('yellow');
    expect(normalizeHealth('critical')).toBe('red');
  });

  it('defaults unknown/empty values to yellow (needs attention)', () => {
    expect(normalizeHealth('')).toBe('yellow');
    expect(normalizeHealth(null)).toBe('yellow');
    expect(normalizeHealth(undefined)).toBe('yellow');
    expect(normalizeHealth('purple')).toBe('yellow');
  });
});

describe('mapApiProject', () => {
  it('maps a full backend record into the strict Project shape', () => {
    const p = mapApiProject({
      project_id: 'PRJ-X',
      project_name: 'Example',
      summary: 'Sum',
      managing_unit: 'GS',
      lifecycle_state: 'Active',
      health: 'Green ',
      current_phase: 'ROM',
      risk_score: 4,
      progress_pct: 55,
      blockers_count: 2,
    });
    expect(p.project_id).toBe('PRJ-X');
    expect(p.lifecycle_state).toBe('active');
    expect(p.health).toBe('green');
    expect(p.risk_score).toBe(4);
    expect(p.progress_pct).toBe(55);
    expect(p.blockers_count).toBe(2);
  });

  it('applies safe defaults for missing fields', () => {
    const p = mapApiProject({ project_id: 'PRJ-Y', project_name: 'Y' });
    expect(p.lifecycle_state).toBe('active');
    expect(p.health).toBe('yellow');
    expect(p.current_phase).toBe('Intake');
    expect(p.sensitivity).toBe('internal');
    expect(p.risk_score).toBe(0);
    expect(p.summary).toBe('');
  });

  it('clamps progress_pct into 0..100', () => {
    expect(mapApiProject({ progress_pct: 250 }).progress_pct).toBe(100);
    expect(mapApiProject({ progress_pct: -10 }).progress_pct).toBe(0);
    expect(mapApiProject({ progress_pct: 'not-a-number' }).progress_pct).toBe(0);
  });
});
