import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CSOTransitionControls } from './CSOTransitionControls';

// NOTE: onTransition uses the object payload contract that the real
// CSOBriefEditPage wires up: { toStatus, note, reviewerNotes, reviewerAttestReady }.
// The valid admin send-back from IN_REVIEW is CHANGES_REQUESTED (see backend
// ALLOWED_TRANSITIONS in cso_brief_models.py) - there is no IN_REVIEW -> DRAFT.

describe('CSOTransitionControls', () => {
  it('shows analyst-safe actions in DRAFT and hides admin actions', () => {
    render(
      <CSOTransitionControls
        status="DRAFT"
        user={{ id: 'analyst', role: 'user', is_admin: false }}
        onTransition={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publish draft/i })).not.toBeInTheDocument();
  });

  it('shows admin approval and send-back actions in IN_REVIEW', () => {
    render(
      <CSOTransitionControls
        status="IN_REVIEW"
        user={{ id: 'admin', role: 'admin', is_admin: true }}
        onTransition={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request changes/i })).toBeInTheDocument();
  });

  it('passes the object payload with note and target status on click', async () => {
    const user = userEvent.setup();
    const onTransition = vi.fn().mockResolvedValue(undefined);

    render(
      <CSOTransitionControls
        status="DRAFT"
        user={{ id: 'analyst', role: 'user', is_admin: false }}
        onTransition={onTransition}
      />,
    );

    await user.type(screen.getByPlaceholderText(/workflow note/i), 'Ready for admin review');
    await user.click(screen.getByRole('button', { name: /submit for review/i }));

    expect(onTransition).toHaveBeenCalledWith(
      expect.objectContaining({ toStatus: 'IN_REVIEW', note: 'Ready for admin review' }),
    );
  });
});
