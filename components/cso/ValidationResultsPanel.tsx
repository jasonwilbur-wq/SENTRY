import React from 'react';
import type { ValidationResult } from './csoBriefTypes';

export const ValidationResultsPanel: React.FC<{
  result: ValidationResult | null;
}> = ({ result }) => {
  if (!result) return null;

  const briefViolations = result.violations.filter(v => !v.item_id);
  const itemViolations = result.violations.filter(v => !!v.item_id);

  return (
    <section
      className="rounded-xl border p-4"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>
          Validation Result
        </h3>
        {result.passed ? (
          <span className="px-2 py-1 rounded border text-xs font-bold bg-green-500/15 text-green-300 border-green-500/35">
            PASS
          </span>
        ) : (
          <span className="px-2 py-1 rounded border text-xs font-bold bg-red-500/15 text-red-300 border-red-500/35">
            FAIL
          </span>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--s-text-muted)' }}>
        Checked {new Date(result.checked_at).toLocaleString()} · Included items: {result.included_item_count}
      </p>

      {result.passed ? (
        <p className="text-sm text-green-300">No violations detected.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-amber-300">
              Brief-level Violations
            </h4>
            {briefViolations.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>None</p>
            ) : (
              <ul className="space-y-2">
                {briefViolations.map((v, idx) => (
                  <li key={`${v.code}-${idx}`} className="text-xs rounded border p-2 bg-red-500/10 border-red-500/25 text-red-200">
                    <div className="font-bold">{v.code}</div>
                    <div>{v.message}</div>
                    {v.field && <div className="opacity-80">Field: {v.field}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-amber-300">
              Item-level Violations
            </h4>
            {itemViolations.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>None</p>
            ) : (
              <ul className="space-y-2">
                {itemViolations.map((v, idx) => (
                  <li key={`${v.code}-${v.item_id}-${idx}`} className="text-xs rounded border p-2 bg-red-500/10 border-red-500/25 text-red-200">
                    <div className="font-bold">{v.code}</div>
                    <div>{v.message}</div>
                    <div className="opacity-80">
                      Item: {v.item_id} {v.field ? `· Field: ${v.field}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
