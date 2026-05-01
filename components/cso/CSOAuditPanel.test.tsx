import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CSOAuditPanel } from './CSOAuditPanel';

vi.mock('../../services/api', () => ({
  fetchCSOBriefAudit: vi.fn(),
}));

const { fetchCSOBriefAudit } = await import('../../services/api');

describe('CSOAuditPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders paginated entries newest first', async () => {
    vi.mocked(fetchCSOBriefAudit)
      .mockResolvedValueOnce({
        total: 12,
        limit: 10,
        offset: 0,
        entries: [
          {
            id: 10,
            brief_id: 'b1',
            action: 'transition',
            actor_id: 'analyst',
            old_value: '{"status":"DRAFT"}',
            new_value: '{"status":"IN_REVIEW"}',
            created_at: '2026-04-09T10:00:00Z',
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        total: 12,
        limit: 10,
        offset: 10,
        entries: [],
      } as any);

    const user = userEvent.setup();
    render(<CSOAuditPanel briefId="b1" />);

    await waitFor(() => {
      expect(screen.getByText(/transition/i)).toBeInTheDocument();
      expect(screen.getByText(/analyst/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(fetchCSOBriefAudit).toHaveBeenCalledWith('b1', { limit: 10, offset: 10 });
    });
  });
});
