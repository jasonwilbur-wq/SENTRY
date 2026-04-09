import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CSOBriefViewPage } from './CSOBriefViewPage';

vi.mock('../../services/api', () => ({
  fetchCSOBriefSnapshot: vi.fn(),
}));

const { fetchCSOBriefSnapshot } = await import('../../services/api');

describe('CSOBriefViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders read-only snapshot content and draft labels', async () => {
    vi.mocked(fetchCSOBriefSnapshot).mockResolvedValue({
      id: 'b1',
      title: 'Weekly CSO Brief',
      period_start: '2026-04-01',
      period_end: '2026-04-08',
      status: 'DRAFT',
      executive_summary: 'Summary text',
      review_notes: 'Note',
      banner: 'Draft only — Human Review Required',
      footer: 'Draft artifact. Not final leadership directive.',
      snapshot_version: 1,
      generated_at: '2026-04-09T00:00:00Z',
      items: [
        {
          rank: 1,
          competitor: 'Amazon',
          event_title: 'Event A',
          event_date: '2026-04-07',
          category: 'Cyber',
          source_link: 'https://example.com',
          priority_tier: 'CSO Brief',
          triage_status: 'REVIEWED',
          walmart_relevance_score: 88,
          confidence_level: 'high',
          why_walmart_cares: 'Because',
          walmart_actionability_context: 'Action context',
          correlation_summary: 'Matched to Project X',
          detailed_description: null,
          security_implication: null,
          analyst_commentary: '',
          uncertainty_note: 'Some uncertainty',
          owner_assignment: 'CISO',
          include_in_summary: 1,
        },
      ],
    } as any);

    render(<CSOBriefViewPage briefId="b1" />);

    await waitFor(() => {
      expect(screen.getByText('Weekly CSO Brief')).toBeInTheDocument();
    });

    expect(screen.getByText(/draft only — human review required/i)).toBeInTheDocument();
    expect(screen.getByText(/draft artifact. not final leadership directive./i)).toBeInTheDocument();
    expect(screen.getByText(/amazon — event a/i)).toBeInTheDocument();
    expect(screen.getByText(/matched to project x/i)).toBeInTheDocument();
  });

  it('shows useful api errors', async () => {
    vi.mocked(fetchCSOBriefSnapshot).mockRejectedValue(new Error('API 404: {"detail":"Brief not found"}'));
    render(<CSOBriefViewPage briefId="missing" />);

    await waitFor(() => {
      expect(screen.getByText(/brief not found/i)).toBeInTheDocument();
    });
  });
});
