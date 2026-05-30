import React from 'react';
import { ExecutiveSignalRecord } from '../../services/executiveIntelApi';
import { Badge, Card } from './ui';
import { ageLabel, isPendingReview, prettyLabel, sortByPriority, verificationTone } from './signalLogic';

// ---------------------------------------------------------------------------
// Queue-based analyst review widget (not notification-based — see CI research).
// Surfaces signals awaiting disposition, priority-sorted. Read-only: it shows
// what needs attention. Disposition actions require the governed write path,
// which is intentionally out of scope for this review-only dashboard.
// ---------------------------------------------------------------------------

export function ReviewQueue({ signals }: { signals: ExecutiveSignalRecord[] }) {
  const pending = sortByPriority(signals.filter(isPendingReview));

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Review queue</h3>
        <Badge tone={pending.length > 0 ? 'yellow' : 'green'}>{pending.length} pending</Badge>
      </div>
      {pending.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--s-text-dim)' }}>Nothing awaiting analyst disposition. 🎉</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.slice(0, 8).map(signal => (
            <li
              key={(signal._artifact_file || '') + '-' + signal.signal_id}
              className="rounded-lg border p-2.5"
              style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={verificationTone(signal.verification_status)}>{prettyLabel(signal.verification_status)}</Badge>
                <Badge tone="gray">{prettyLabel(signal.category)}</Badge>
                <span className="ml-auto text-xs" style={{ color: 'var(--s-text-dim)' }}>{ageLabel(signal.event_date)}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold leading-5" style={{ color: 'var(--s-text)' }}>{signal.title}</p>
            </li>
          ))}
          {pending.length > 8 && (
            <li className="text-xs" style={{ color: 'var(--s-text-dim)' }}>+ {pending.length - 8} more in the feed below.</li>
          )}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--s-text-dim)' }}>
        Review-only. Dispositions (approve / needs-evidence / reject) require the governed analyst write path.
      </p>
    </Card>
  );
}

export default ReviewQueue;
