import React, { useState } from 'react';
import type { AuthUser } from '../../context/AuthContext';
import type { CSOBriefStatus } from './csoBriefTypes';
import { canTransition } from './csoBriefUiHelpers';

export const CSOTransitionControls: React.FC<{
  status: CSOBriefStatus;
  user: AuthUser | null;
  onTransition: (payload: {
    toStatus: CSOBriefStatus;
    note: string;
    reviewerNotes?: string;
    reviewerAttestReady?: boolean;
  }) => Promise<void>;
}> = ({ status, user, onTransition }) => {
  const [note, setNote] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [reviewerAttestReady, setReviewerAttestReady] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [busy, setBusy] = useState<CSOBriefStatus | null>(null);

  const isAdmin = !!user?.is_admin;

  const actions: Array<{ to: CSOBriefStatus; label: string; key: string }> = [
    { to: 'IN_REVIEW', label: status === 'CHANGES_REQUESTED' ? 'Resubmit for review' : 'Submit for review', key: 'submit' },
    { to: 'CHANGES_REQUESTED', label: 'Request changes', key: 'request_changes' },
    { to: 'APPROVED', label: 'Approve', key: 'approve' },
    { to: 'PUBLISHED_DRAFT', label: 'Publish draft', key: 'publish' },
  ];

  const visible = actions.filter(a => canTransition(status, a.to, isAdmin));

  const submitAction = async (toStatus: CSOBriefStatus) => {
    const trimmedNote = note.trim();
    const trimmedReviewerNotes = reviewerNotes.trim();

    if (toStatus === 'CHANGES_REQUESTED' && !trimmedReviewerNotes) {
      setClientError('Reviewer rationale is required to request changes.');
      return;
    }
    if (toStatus === 'APPROVED') {
      if (!trimmedReviewerNotes) {
        setClientError('Reviewer notes are required for approval.');
        return;
      }
      if (!reviewerAttestReady) {
        setClientError('Reviewer attestation is required for approval.');
        return;
      }
    }

    setClientError(null);
    setBusy(toStatus);
    try {
      await onTransition({
        toStatus,
        note: trimmedNote,
        reviewerNotes: trimmedReviewerNotes,
        reviewerAttestReady,
      });
      setNote('');
      setReviewerNotes('');
      setReviewerAttestReady(false);
    } finally {
      setBusy(null);
    }
  };

  if (visible.length === 0) {
    return (
      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Reviewer Actions</h3>
        <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>No transitions available for this status and role.</p>
      </section>
    );
  }

  const needsReviewerFields = visible.some(action => action.to === 'CHANGES_REQUESTED' || action.to === 'APPROVED');

  return (
    <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Reviewer Actions</h3>
      <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Workflow note</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="sentry-input w-full text-sm mb-3"
        placeholder="Optional workflow note"
      />

      {needsReviewerFields && (
        <>
          <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Reviewer decision notes</label>
          <textarea
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            className="sentry-input w-full min-h-20 text-sm mb-3"
            placeholder="Required for approve/request changes"
          />

          {visible.some(action => action.to === 'APPROVED') && (
            <label className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--s-text-muted)' }}>
              <input
                type="checkbox"
                checked={reviewerAttestReady}
                onChange={(e) => setReviewerAttestReady(e.target.checked)}
              />
              Reviewer attests the brief is ready for approval.
            </label>
          )}
        </>
      )}

      {clientError && <p className="text-xs text-red-300 mb-3">{clientError}</p>}

      <div className="flex flex-wrap gap-2">
        {visible.map(action => (
          <button
            key={action.key}
            onClick={() => submitAction(action.to)}
            disabled={busy !== null}
            className="px-3 py-2 rounded text-xs font-bold border disabled:opacity-40"
            style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
          >
            {busy === action.to ? 'Working…' : action.label}
          </button>
        ))}
      </div>
    </section>
  );
};
