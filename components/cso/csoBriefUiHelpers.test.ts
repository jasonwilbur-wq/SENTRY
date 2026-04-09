import { describe, expect, it } from 'vitest';
import { canTransition, isReadOnlyBrief } from './csoBriefUiHelpers';

describe('csoBriefUiHelpers', () => {
  it('marks APPROVED and PUBLISHED_DRAFT as read-only', () => {
    expect(isReadOnlyBrief('APPROVED')).toBe(true);
    expect(isReadOnlyBrief('PUBLISHED_DRAFT')).toBe(true);
    expect(isReadOnlyBrief('DRAFT')).toBe(false);
  });

  it('renders allowed transitions by status/role', () => {
    expect(canTransition('DRAFT', 'IN_REVIEW', false)).toBe(true);
    expect(canTransition('IN_REVIEW', 'DRAFT', false)).toBe(true);
    expect(canTransition('IN_REVIEW', 'APPROVED', false)).toBe(false);
    expect(canTransition('IN_REVIEW', 'APPROVED', true)).toBe(true);
    expect(canTransition('APPROVED', 'PUBLISHED_DRAFT', false)).toBe(false);
    expect(canTransition('APPROVED', 'PUBLISHED_DRAFT', true)).toBe(true);
  });
});
