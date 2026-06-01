import { describe, it, expect } from 'vitest';
import { grade, gradeLetter, isScored } from './grade';

describe('grade()', () => {
  it('maps the top of the scale to A', () => {
    expect(grade(5).letter).toBe('A');
    expect(grade(4.5).letter).toBe('A');
  });

  it('maps each band by its inclusive lower bound', () => {
    expect(grade(4.49).letter).toBe('B');
    expect(grade(3.5).letter).toBe('B');
    expect(grade(3.49).letter).toBe('C');
    expect(grade(2.5).letter).toBe('C');
    expect(grade(2.49).letter).toBe('D');
    expect(grade(1.5).letter).toBe('D');
    expect(grade(1.49).letter).toBe('F');
    expect(grade(0).letter).toBe('F');
  });

  it('clamps out-of-range scores', () => {
    expect(grade(9).letter).toBe('A');
    expect(grade(-3).letter).toBe('F');
  });

  it('returns a neutral sentinel for null/undefined/NaN', () => {
    const expected = { letter: 'F', colorHex: '#9E9E9E', label: 'Not scored' };
    expect(grade(null)).toEqual(expected);
    expect(grade(undefined)).toEqual(expected);
    expect(grade(NaN)).toEqual(expected);
  });

  it('carries a color + label for real scores', () => {
    const a = grade(5);
    expect(a.colorHex).toBe('#2A8703');
    expect(a.label).toBe('Excellent');
    expect(grade(0).label).toBe('Critical');
  });
});

describe('gradeLetter()', () => {
  it('is a shorthand for grade().letter', () => {
    expect(gradeLetter(4.8)).toBe('A');
    expect(gradeLetter(2.6)).toBe('C');
    expect(gradeLetter(null)).toBe('F');
  });
});

describe('isScored()', () => {
  it('distinguishes real numbers from gaps', () => {
    expect(isScored(0)).toBe(true);
    expect(isScored(3.2)).toBe(true);
    expect(isScored(null)).toBe(false);
    expect(isScored(undefined)).toBe(false);
    expect(isScored(NaN)).toBe(false);
  });
});
