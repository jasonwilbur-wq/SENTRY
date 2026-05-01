import React, { useEffect, useState } from 'react';
import { fetchCSOBriefAudit } from '../../services/api';
import type { CSOBriefAuditResponse } from './csoBriefTypes';
import { formatApiError, summarizeAuditDiff } from './csoBriefUiHelpers';

const PAGE_SIZE = 10;

export const CSOAuditPanel: React.FC<{ briefId: string }> = ({ briefId }) => {
  const [data, setData] = useState<CSOBriefAuditResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCSOBriefAudit(briefId, { limit: PAGE_SIZE, offset })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(formatApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [briefId, offset]);

  const canPrev = offset > 0;
  const total = data?.total ?? 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Audit History</h3>
        <span className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Newest first</span>
      </div>

      {loading && <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Loading audit trail…</p>}
      {error && <p className="text-xs text-red-300">{error}</p>}

      {!loading && !error && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: 'var(--s-text-muted)' }}>
                  <th className="pb-2 pr-3">Created</th>
                  <th className="pb-2 pr-3">Actor</th>
                  <th className="pb-2 pr-3">Action</th>
                  <th className="pb-2 pr-3">Old</th>
                  <th className="pb-2">New</th>
                </tr>
              </thead>
              <tbody>
                {(data?.entries ?? []).map((entry) => (
                  <tr key={entry.id} className="align-top border-t" style={{ borderColor: 'var(--s-border)' }}>
                    <td className="py-2 pr-3" style={{ color: 'var(--s-text-muted)' }}>{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3" style={{ color: 'var(--s-text)' }}>{entry.actor_id}</td>
                    <td className="py-2 pr-3" style={{ color: 'var(--s-text)' }}>{entry.action}</td>
                    <td className="py-2 pr-3" style={{ color: 'var(--s-text-muted)' }}>{summarizeAuditDiff(entry.old_value)}</td>
                    <td className="py-2" style={{ color: 'var(--s-text-muted)' }}>{summarizeAuditDiff(entry.new_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.entries.length === 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--s-text-muted)' }}>No audit entries yet.</p>
          )}

          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              className="px-3 py-1.5 text-xs rounded border disabled:opacity-40"
              style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
              disabled={!canPrev}
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
            >
              Prev
            </button>
            <button
              className="px-3 py-1.5 text-xs rounded border disabled:opacity-40"
              style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
              disabled={!canNext}
              onClick={() => setOffset(o => o + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
};
