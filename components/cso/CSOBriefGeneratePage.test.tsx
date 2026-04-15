import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CSOBriefGeneratePage } from './CSOBriefGeneratePage';

const mockGenerate = vi.fn();
const mockAssign = vi.fn();

vi.mock('../../services/api', () => ({
  generateCSOBrief: (...args: any[]) => mockGenerate(...args),
}));

describe('CSOBriefGeneratePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { assign: mockAssign },
      writable: true,
    });
  });

  it('renders preflight readiness/exclusion summary after generate', async () => {
    const user = userEvent.setup();

    mockGenerate.mockResolvedValue({
      brief: { id: 'brief-123' },
      candidate_count: 6,
      included_count: 3,
      excluded_count: 3,
      exclusion_reason_counts: {
        MISSING_SOURCE_LINK: 2,
        MISSING_RATIONALE: 1,
      },
      excluded_items: [],
      preflight: {
        candidate_count: 6,
        included_count: 3,
        excluded_count: 3,
        exclusion_reason_counts: {
          MISSING_SOURCE_LINK: 2,
          MISSING_RATIONALE: 1,
        },
        excluded_items: [],
      },
    });

    render(<CSOBriefGeneratePage />);

    await user.click(screen.getByRole('button', { name: /generate draft brief/i }));

    await waitFor(() => {
      expect(screen.getByText(/generation preflight summary/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/candidates:/i)).toBeInTheDocument();
    expect(screen.getByText(/included:/i)).toBeInTheDocument();
    expect(screen.getByText(/excluded:/i)).toBeInTheDocument();
    expect(screen.getByText(/MISSING_SOURCE_LINK: 2/)).toBeInTheDocument();
    expect(screen.getByText(/MISSING_RATIONALE: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Actionable now:/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocked by readiness:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open draft brief editor/i })).toBeInTheDocument();
  });
});
