import { describe, expect, it } from 'vitest';
import {
  canTransition,
  decisionAlignmentStatus,
  isReadOnlyBrief,
  prettyAnalystDecision,
  prettyRecommendation,
} from './csoBriefUiHelpers';

describe('csoBriefUiHelpers', () => {
  it('marks APPROVED and PUBLISHED_DRAFT as read-only', () => {
    expect(isReadOnlyBrief('APPROVED')).toBe(true);
    expect(isReadOnlyBrief('PUBLISHED_DRAFT')).toBe(true);
    expect(isReadOnlyBrief('DRAFT')).toBe(false);
  });

  it('renders allowed transitions by status/role', () => {
    expect(canTransition('DRAFT', 'IN_REVIEW', false)).toBe(true);
    expect(canTransition('IN_REVIEW', 'DRAFT', false)).toBe(false);
    expect(canTransition('IN_REVIEW', 'APPROVED', false)).toBe(false);
    expect(canTransition('IN_REVIEW', 'APPROVED', true)).toBe(true);
    expect(canTransition('APPROVED', 'PUBLISHED_DRAFT', false)).toBe(false);
    expect(canTransition('APPROVED', 'PUBLISHED_DRAFT', true)).toBe(true);
  });

  it('formats recommendation and analyst decisions for readable UI', () => {
    expect(prettyRecommendation('escalate_for_review')).toBe('Escalate for review');
    expect(prettyRecommendation('custom_action')).toBe('custom_action');
    expect(prettyAnalystDecision('request_additional_evidence')).toBe('Request additional evidence');
    expect(prettyAnalystDecision('')).toBe('none');
  });

  it('computes deterministic decision alignment status', () => {
    expect(decisionAlignmentStatus({ recommendation: 'escalate_for_review', analystDecision: '', decisionSource: '' })).toBe('NO_DECISION');
    expect(decisionAlignmentStatus({ recommendation: 'escalate_for_review', analystDecision: 'escalate_for_review', decisionSource: 'analyst_accept_recommendation' })).toBe('ALIGNED');
    expect(decisionAlignmentStatus({ recommendation: 'escalate_for_review', analystDecision: 'monitor_only', decisionSource: 'analyst_override_recommendation' })).toBe('OVERRIDDEN');
    expect(decisionAlignmentStatus({ recommendation: 'hold_due_to_readiness_issue', analystDecision: 'hold', decisionSource: 'analyst_manual' })).toBe('ALIGNED');
  });
});
