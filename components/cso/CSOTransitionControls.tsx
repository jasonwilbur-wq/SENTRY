import React, { useState } from 'react';
import type { AuthUser } from '../../context/AuthContext';
import type { CSOBriefStatus } from './csoBriefTypes';
import { canTransition } from './csoBriefUiHelpers';

export const CSOTransitionControls: React.FC<{
  status: CSOBriefStatus;
  user: AuthUser | null;
  onTransition: (toStatus: CSOBriefStatus, note: string) => Promise<void>;
}> = ({ status, user, onTransition }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<CSOBriefStatus | null>(null);

  const isAdmin = !!user?.is_admin;

  const actions: Array<{ to: CSOBriefStatus; label: string; key: string }> = [
    { to: 'IN_REVIEW', label: 'Submit for review', key: 'submit' },
    { to: 'DRAFT', label: 'Revert to draft', key: 'revert' },
    { to: 'APPROVED', label: 'Approve', key: 'approve' },
    { to: 'PUBLISHED_DRAFT', label: 'Publish draft', key: 'publish' },
  ];

  const visible = actions.filter(a => canTransition(status, a.to, isAdmin));

  if (visible.length === 0) {
    return (
      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Transitions</h3>
        <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>No transitions available for this status and role.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Transitions</h3>
      <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Transition note</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="sentry-input w-full text-sm mb-3"
        placeholder="Optional note"
      />
      <div className="flex flex-wrap gap-2">
        {visible.map(action => (
          <button
            key={action.key}
            onClick={async () => {
              setBusy(action.to);
              try {
                await onTransition(action.to, note);
                setNote('');
              } finally {
                setBusy(null);
              }
            }}
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
