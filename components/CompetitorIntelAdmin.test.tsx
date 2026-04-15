import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CompetitorIntelAdmin } from './CompetitorIntelAdmin';

vi.mock('../services/api', () => ({
  fetchAdminCompetitorScoringSummary: vi.fn(),
  fetchAdminCompetitorTriageQueue: vi.fn(),
  rescoreCompetitorEvents: vi.fn(),
  backfillCompetitorBriefReadiness: vi.fn(),
  triageAdminCompetitorEvent: vi.fn(),
}));

const {
  fetchAdminCompetitorScoringSummary,
  fetchAdminCompetitorTriageQueue,
} = await import('../services/api');

describe('CompetitorIntelAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fetchAdminCompetitorScoringSummary).mockResolvedValue({
      total: 1,
      cso_candidates: 1,
      avg_score: 82,
      distribution: {
        unscored: 0,
        archive_low_signal: 0,
        analyst_follow_up: 0,
        leadership_watch: 0,
        cso_brief: 1,
      },
    } as any);

    vi.mocked(fetchAdminCompetitorTriageQueue).mockResolvedValue({
      total: 1,
      items: [
        {
          id: 99,
          competitor: 'Target',
          event_title: 'Cyber outage',
          category: 'Cyber',
          event_date: '2026-03-02',
          location: 'US',
          walmart_relevance_score: 88,
          priority_tier: 'CSO Brief',
          triage_status: 'UNREVIEWED',
          correlation_status: 'NO_MATCH',
          readiness_issues: ['MISSING_SOURCE_LINK', 'MISSING_RATIONALE'],
          readiness_warnings: ['MISSING_OWNER_SUGGESTION'],
          readiness_required_fields: ['source_link', 'why_walmart_cares_or_actionability', 'confidence_level_or_score'],
          is_brief_ready: false,
        },
      ],
    } as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
        events: [
          {
            id: 99,
            competitor: 'Target',
            event_title: 'Cyber outage',
            category: 'Cyber',
            event_date: '2026-03-02',
            location: 'US',
            walmart_relevance_score: 88,
            priority_tier: 'CSO Brief',
            triage_status: 'UNREVIEWED',
            correlation_status: 'NO_MATCH',
            readiness_issues: ['MISSING_SOURCE_LINK', 'MISSING_RATIONALE'],
            readiness_warnings: ['MISSING_OWNER_SUGGESTION'],
            readiness_required_fields: ['source_link', 'why_walmart_cares_or_actionability', 'confidence_level_or_score'],
            is_brief_ready: false,
            signal_type: 'Threat',
          },
        ],
      }),
    }) as any;
  });

  it('shows readiness status, missing fields, and required readiness fields', async () => {
    render(<CompetitorIntelAdmin />);

    await waitFor(() => {
      expect(screen.getAllByText(/brief readiness: not ready/i).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/missing: missing_source_link, missing_rationale/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/required for ready: source link, why walmart cares \/ actionability, confidence level \/ score/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/warnings: missing_owner_suggestion/i).length).toBeGreaterThan(0);
  });
});
