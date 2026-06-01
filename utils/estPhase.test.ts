import { describe, it, expect } from 'vitest';
import { estPhaseIndex, estPhaseName, EST_PHASE_COUNT } from './estPhase';

describe('estPhaseIndex()', () => {
  it('maps known project labels to the right EST gate', () => {
    expect(estPhaseIndex('Intake')).toBe(1);
    expect(estPhaseIndex('VAR / Validation')).toBe(1);
    expect(estPhaseIndex('Vendor Engagement')).toBe(2);
    expect(estPhaseIndex('NDA & Legal Gating')).toBe(3);
    expect(estPhaseIndex('ROM')).toBe(4);
    expect(estPhaseIndex('Technical Assessment')).toBe(4);
    expect(estPhaseIndex('Lab Testing')).toBe(5);
    expect(estPhaseIndex('APM / ERPA / SSP')).toBe(6);
    expect(estPhaseIndex('Pilot')).toBe(7);
    expect(estPhaseIndex('BAU')).toBe(8);
    expect(estPhaseIndex('Completed')).toBe(8);
  });

  it('is case-insensitive and trims', () => {
    expect(estPhaseIndex('  pilot  ')).toBe(7);
    expect(estPhaseIndex('LAB TESTING')).toBe(5);
  });

  it('falls back to gate 1 for unknown/empty', () => {
    expect(estPhaseIndex('')).toBe(1);
    expect(estPhaseIndex(null)).toBe(1);
    expect(estPhaseIndex(undefined)).toBe(1);
    expect(estPhaseIndex('something random')).toBe(1);
  });
});

describe('estPhaseName()', () => {
  it('returns a label for each gate', () => {
    expect(estPhaseName(1)).toBe('VAR');
    expect(estPhaseName(8)).toBe('BAU / Full Program');
  });

  it('clamps out-of-range indices', () => {
    expect(estPhaseName(0)).toBe('VAR');
    expect(estPhaseName(99)).toBe('BAU / Full Program');
  });

  it('exposes the gate count', () => {
    expect(EST_PHASE_COUNT).toBe(8);
  });
});
