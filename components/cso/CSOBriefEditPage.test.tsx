import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
        frozen_payload: {
          competitor: 'Amazon',
          event_title: 'Launch event',
          event_date: '2026-04-07',
          walmart_relevance_score: 91,
          priority_tier: 'CSO Brief',
          triage_status: 'REVIEWED',
          source_link: 'https://example.com/a',
          correlation_summary: 'Matched to project x',
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
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('Launch event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CISO')).toBeInTheDocument();
    expect(screen.getByDisplayValue('commentary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('uncertainty')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: /validate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
  });

  it('disables editing for APPROVED and PUBLISHED_DRAFT', async () => {
    vi.mocked(fetchCSOBrief).mockResolvedValue(makeBrief('APPROVED') as any);

    const { rerender } = render(<CSOBriefEditPage briefId="brief-1" />);

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
});
