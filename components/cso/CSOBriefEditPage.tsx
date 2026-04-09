import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchCSOBrief,
  patchCSOBrief,
  patchCSOBriefItem,
  transitionCSOBrief,
  validateCSOBrief,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type {
  CSOBrief,
  CSOBriefItem,
  CSOBriefStatus,
  ValidationResult,
} from './csoBriefTypes';
import {
  extractViolations,
  formatApiError,
  isReadOnlyBrief,
  statusChipStyles,
} from './csoBriefUiHelpers';
import { ValidationResultsPanel } from './ValidationResultsPanel';
import { CSOTransitionControls } from './CSOTransitionControls';
import { CSOAuditPanel } from './CSOAuditPanel';

export const CSOBriefEditPage: React.FC<{ briefId: string }> = ({ briefId }) => {
  const { user } = useAuth();
  const [brief, setBrief] = useState<CSOBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const [executiveSummary, setExecutiveSummary] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const [itemDrafts, setItemDrafts] = useState<Record<string, Partial<CSOBriefItem>>>({});

  const readOnly = useMemo(() => brief ? isReadOnlyBrief(brief.status) : false, [brief]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await fetchCSOBrief(briefId);
      setBrief(b);
      setExecutiveSummary(b.executive_summary || '');
      setReviewNotes(b.review_notes || '');
      setItemDrafts({});
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [briefId]);

  const onSaveMeta = async () => {
    if (!brief) return;
    setError(null);
    setMessage(null);
    try {
      const updated = await patchCSOBrief(brief.id, {
        executive_summary: executiveSummary,
        review_notes: reviewNotes,
      });
      setBrief(updated);
      setMessage('Brief metadata saved.');
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const onSaveItem = async (itemId: string) => {
    if (!brief) return;
    const draft = itemDrafts[itemId] || {};
    setError(null);
    setMessage(null);
    try {
      await patchCSOBriefItem(brief.id, itemId, {
        rank: draft.rank,
        owner_assignment: draft.owner_assignment,
        analyst_commentary: draft.analyst_commentary,
        uncertainty_note: draft.uncertainty_note,
        include_in_summary: draft.include_in_summary,
      });
      await load();
      setMessage(`Saved item ${itemId}.`);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const onValidate = async () => {
    if (!brief) return;
    setError(null);
    setMessage(null);
    try {
      const result = await validateCSOBrief(brief.id);
      setValidation(result);
      setMessage(result.passed ? 'Validation passed.' : 'Validation failed. Fix violations below.');
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const onTransition = async (toStatus: CSOBriefStatus, note: string) => {
    if (!brief) return;
    setError(null);
    setMessage(null);
    try {
      const res = await transitionCSOBrief(brief.id, { to_status: toStatus, note });
      setBrief(res.brief);
      if (res.validation) {
        setValidation(res.validation);
      }
      setMessage(`Transitioned ${res.from_status} → ${res.to_status}.`);
    } catch (err) {
      const violations = extractViolations(err);
      if (violations.length) {
        setValidation({
          passed: false,
          checked_at: new Date().toISOString(),
          included_item_count: brief.items.filter(i => i.include_in_summary === 1).length,
          violations,
        });
      }
      setError(formatApiError(err));
      throw err;
    }
  };

  if (loading) return <div className="p-6 text-sm" style={{ color: 'var(--s-text-muted)' }}>Loading CSO brief…</div>;
  if (error && !brief) return <div className="p-6 text-sm text-red-300">{error}</div>;
  if (!brief) return <div className="p-6 text-sm text-red-300">Brief not found.</div>;

  return (
    <div className="p-6 space-y-4">
      <header className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--s-text)' }}>{brief.title}</h1>
            <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>
              {brief.period_start} → {brief.period_end}
            </p>
          </div>
          <span className={`px-3 py-1 rounded border text-xs font-bold ${statusChipStyles(brief.status)}`}>
            {brief.status}
          </span>
        </div>

        <div className="rounded-md border px-3 py-2 text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">
          Draft only — Human Review Required
        </div>
      </header>

      {message && <div className="rounded-md border px-3 py-2 text-xs bg-green-500/10 border-green-500/30 text-green-300">{message}</div>}
      {error && <div className="rounded-md border px-3 py-2 text-xs bg-red-500/10 border-red-500/30 text-red-300">{error}</div>}

      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--s-text)' }}>Brief Metadata</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Executive summary</label>
            <textarea
              className="sentry-input w-full min-h-24 text-sm"
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Review notes</label>
            <textarea
              className="sentry-input w-full min-h-20 text-sm"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              disabled={readOnly}
            />
          </div>

          <button
            onClick={onSaveMeta}
            disabled={readOnly}
            className="px-3 py-2 rounded text-xs font-bold border disabled:opacity-40"
            style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
          >
            Save brief metadata
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Items</h2>
          <button
            onClick={onValidate}
            className="px-3 py-2 rounded text-xs font-bold border"
            style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
          >
            Validate
          </button>
        </div>

        <div className="space-y-3">
          {brief.items.map(item => {
            const fp = item.frozen_payload || {};
            const draft = itemDrafts[item.id] || {};
            const merged = {
              rank: draft.rank ?? item.rank,
              owner_assignment: draft.owner_assignment ?? item.owner_assignment,
              analyst_commentary: draft.analyst_commentary ?? item.analyst_commentary,
              uncertainty_note: draft.uncertainty_note ?? item.uncertainty_note,
              include_in_summary: draft.include_in_summary ?? item.include_in_summary,
            };

            return (
              <article key={item.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--s-border)' }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Competitor</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--s-text)' }}>{fp.competitor || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Event title</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--s-text)' }}>{fp.event_title || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Event date</p>
                    <p className="text-sm" style={{ color: 'var(--s-text)' }}>{fp.event_date || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Score / priority tier</p>
                    <p className="text-sm" style={{ color: 'var(--s-text)' }}>{String(fp.walmart_relevance_score ?? '—')} · {fp.priority_tier || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Triage status</p>
                    <p className="text-sm" style={{ color: 'var(--s-text)' }}>{fp.triage_status || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Correlation summary</p>
                    <p className="text-sm" style={{ color: 'var(--s-text)' }}>{fp.correlation_summary || fp.walmart_actionability_context || '—'}</p>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Source link</p>
                    {fp.source_link ? (
                      <a href={fp.source_link} target="_blank" rel="noreferrer" className="text-xs text-blue-300 underline break-all">
                        {fp.source_link}
                      </a>
                    ) : <p className="text-sm">—</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Rank</label>
                    <input
                      type="number"
                      className="sentry-input w-full text-sm"
                      value={merged.rank}
                      disabled={readOnly}
                      onChange={(e) => setItemDrafts(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], rank: Number(e.target.value) },
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Owner assignment</label>
                    <input
                      className="sentry-input w-full text-sm"
                      value={merged.owner_assignment}
                      disabled={readOnly}
                      onChange={(e) => setItemDrafts(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], owner_assignment: e.target.value },
                      }))}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Analyst commentary</label>
                    <textarea
                      className="sentry-input w-full min-h-20 text-sm"
                      value={merged.analyst_commentary}
                      disabled={readOnly}
                      onChange={(e) => setItemDrafts(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], analyst_commentary: e.target.value },
                      }))}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Uncertainty note</label>
                    <textarea
                      className="sentry-input w-full min-h-16 text-sm"
                      value={merged.uncertainty_note}
                      disabled={readOnly}
                      onChange={(e) => setItemDrafts(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], uncertainty_note: e.target.value },
                      }))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id={`include-${item.id}`}
                      type="checkbox"
                      checked={merged.include_in_summary === 1}
                      disabled={readOnly}
                      onChange={(e) => setItemDrafts(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], include_in_summary: e.target.checked ? 1 : 0 },
                      }))}
                    />
                    <label htmlFor={`include-${item.id}`} className="text-xs" style={{ color: 'var(--s-text-muted)' }}>
                      Include in summary
                    </label>
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      onClick={() => onSaveItem(item.id)}
                      disabled={readOnly}
                      className="px-3 py-2 rounded text-xs font-bold border disabled:opacity-40"
                      style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
                    >
                      Save item edits
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <ValidationResultsPanel result={validation} />

      <CSOTransitionControls status={brief.status} user={user} onTransition={onTransition} />

      <CSOAuditPanel briefId={brief.id} />
    </div>
  );
};
