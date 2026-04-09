import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationResultsPanel } from './ValidationResultsPanel';

describe('ValidationResultsPanel', () => {
  it('renders structured brief/item validation failures', () => {
    render(
      <ValidationResultsPanel
        result={{
          passed: false,
          checked_at: '2026-04-09T00:00:00Z',
          included_item_count: 2,
          violations: [
            {
              code: 'MISSING_EXECUTIVE_SUMMARY',
              message: 'Brief executive_summary is required',
              field: 'executive_summary',
              item_id: null,
            },
            {
              code: 'MISSING_OWNER_ASSIGNMENT',
              message: 'owner_assignment is required for included items',
              field: 'owner_assignment',
              item_id: 'item-1',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/validation result/i)).toBeInTheDocument();
    expect(screen.getByText('MISSING_EXECUTIVE_SUMMARY')).toBeInTheDocument();
    expect(screen.getByText('MISSING_OWNER_ASSIGNMENT')).toBeInTheDocument();
    expect(screen.getByText(/item: item-1/i)).toBeInTheDocument();
  });

  it('renders pass status clearly', () => {
    render(
      <ValidationResultsPanel
        result={{
          passed: true,
          checked_at: '2026-04-09T00:00:00Z',
          included_item_count: 1,
          violations: [],
        }}
      />,
    );

    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.getByText(/no violations detected/i)).toBeInTheDocument();
  });
});
