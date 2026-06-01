import { describe, it, expect } from 'vitest';
import { PROJECTS, summarizePortfolio, type Project } from './projectsData';

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
