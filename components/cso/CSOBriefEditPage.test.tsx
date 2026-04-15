import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CSOBriefEditPage } from './CSOBriefEditPage';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../services/api', () => ({
  fetchCSOBrief: vi.fn(),
  patchCSOBrief: vi.fn(),
  patchCSOBriefItem: vi.fn(),
  transitionCSOBrief: vi.fn(),
  validateCSOBrief: vi.fn(),
  fetchCSOBriefAudit: vi.fn(),
}));

const {
  fetchCSOBrief,
  fetchCSOBriefAudit,
  transitionCSOBrief,
} = await import('../../services/api');

function makeBrief(status: 'DRAFT' | 'APPROVED' | 'PUBLISHED_DRAFT' = 'DRAFT') {
  return {
    id: 'brief-1',
    title: 'CSO Weekly',
    period_start: '2026-04-01',
    period_end: '2026-04-08',
    status,
    created_by: 'analyst',
    created_at: '2026-04-09T00:00:00Z',
    updated_by: 'analyst',
    updated_at: '2026-04-09T00:00:00Z',
    submitted_at: null,
    submitted_by: null,
    approved_at: null,
    approved_by: null,
    published_draft_at: null,
    published_draft_by: null,
    executive_summary: 'Executive summary text',
    review_notes: 'Review notes',
    quality_gate_result: '',
    snapshot_version: 1,
    items: [
      {
        id: 'item-1',
        brief_id: 'brief-1',
        competitor_event_id: 123,
        rank: 1,
        analyst_commentary: 'commentary',
        uncertainty_note: 'uncertainty',
        owner_assignment: 'CISO',
        include_in_summary: 1,
        analyst_status: 'unreviewed',
        analyst_decision: '',
        analyst_note: '',
        analyst_decided_at: null,
        analyst_decision_source: '',
        frozen_payload: {
          competitor: 'Amazon',
          event_title: 'Launch event',
          event_date: '2026-04-07',
          walmart_relevance_score: 91,
          priority_score: 93.4,
          priority_tier: 'CSO Brief',
          triage_status: 'REVIEWED',
          source_link: 'https://example.com/a',
          correlation_summary: 'Matched to project x',
          confidence: 'high',
          severity: 'CRITICAL',
          likelihood: 'HIGHLY_LIKELY',
          recommended_action: 'escalate_for_review',
          reason_codes: ['HIGH_IMPACT', 'HIGH_LIKELIHOOD'],
          explanation: 'Priority 93.4 based on impact/likelihood.',
          actionable_now: 1,
          readiness_blocked: 0,
        },
        created_at: '2026-04-09T00:00:00Z',
        updated_at: '2026-04-09T00:00:00Z',
      },
    ],
  };
}

describe('CSOBriefEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'analyst', role: 'user', is_admin: false },
    });

    vi.mocked(fetchCSOBriefAudit).mockResolvedValue({
      entries: [],
      total: 0,
      limit: 10,
      offset: 0,
    } as any);
  });

  it('loads brief + items and renders required fields', async () => {
    vi.mocked(fetchCSOBrief).mockResolvedValue(makeBrief('DRAFT') as any);

    render(<CSOBriefEditPage briefId="brief-1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CSO Weekly' })).toBeInTheDocument();
    });

    expect(screen.getByText(/draft only — human review required/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Executive summary text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Review notes')).toBeInTheDocument();
    expect(screen.getByText(/Visible:/i)).toBeInTheDocument();
    expect(screen.getByText(/Actionable:/i)).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('Launch event')).toBeInTheDocument();
    expect(screen.getAllByText(/escalate_for_review/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/HIGH_IMPACT, HIGH_LIKELIHOOD/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('CISO')).toBeInTheDocument();
    expect(screen.getByDisplayValue('commentary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('uncertainty')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: /validate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Analyst status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Analyst decision/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Decision alignment: No decision/i)).toBeInTheDocument();
  });

  it('keeps IN_REVIEW editable but disables APPROVED and PUBLISHED_DRAFT', async () => {
    vi.mocked(fetchCSOBrief).mockResolvedValue({ ...makeBrief('DRAFT'), status: 'IN_REVIEW' } as any);

    const { rerender } = render(<CSOBriefEditPage briefId="brief-1" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Executive summary text')).not.toBeDisabled();
    });

    vi.mocked(fetchCSOBrief).mockResolvedValue(makeBrief('APPROVED') as any);
    rerender(<CSOBriefEditPage briefId="brief-2" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Executive summary text')).toBeDisabled();
    });

    expect(screen.getByRole('button', { name: /save brief metadata/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save item edits/i })).toBeDisabled();

    vi.mocked(fetchCSOBrief).mockResolvedValue(makeBrief('PUBLISHED_DRAFT') as any);
    rerender(<CSOBriefEditPage briefId="brief-2" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Executive summary text')).toBeDisabled();
    });

    expect(screen.getByRole('button', { name: /save brief metadata/i })).toBeDisabled();
  });

  it('renders API error state clearly', async () => {
    vi.mocked(fetchCSOBrief).mockRejectedValue(new Error('API 404: {"detail":"Brief not found"}'));

    render(<CSOBriefEditPage briefId="missing" />);

    await waitFor(() => {
      expect(screen.getByText(/brief not found/i)).toBeInTheDocument();
    });
  });

  it('shows precise transition errors (403/409) and inline 422 violations', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchCSOBrief).mockResolvedValue(makeBrief('DRAFT') as any);
    vi.mocked(transitionCSOBrief)
      .mockRejectedValueOnce(new Error('API 403: {"detail":"Admin privileges required for IN_REVIEW → APPROVED"}'))
      .mockRejectedValueOnce(new Error('API 409: {"detail":"Brief is in PUBLISHED_DRAFT state and cannot be edited"}'))
      .mockRejectedValueOnce(new Error('API 422: {"detail":{"message":"Validation failed — approval blocked","violations":[{"code":"MISSING_OWNER_ASSIGNMENT","message":"owner_assignment is required for included items","item_id":"item-1","field":"owner_assignment"}]}}'));

    render(<CSOBriefEditPage briefId="brief-1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CSO Weekly' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /submit for review/i }));
    await waitFor(() => {
      expect(screen.getByText(/admin privileges required/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /submit for review/i }));
    await waitFor(() => {
      expect(screen.getByText(/cannot be edited/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /submit for review/i }));
    await waitFor(() => {
      expect(screen.getByText(/validation failed — approval blocked/i)).toBeInTheDocument();
      expect(screen.getByText('MISSING_OWNER_ASSIGNMENT')).toBeInTheDocument();
      expect(screen.getByText(/item: item-1/i)).toBeInTheDocument();
    });
  });
});
