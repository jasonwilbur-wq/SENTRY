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
  AnalystDecision,
  AnalystStatus,
  CSOBrief,
  CSOBriefItem,
  CSOBriefStatus,
  ValidationResult,
} from './csoBriefTypes';
import {
  decisionAlignmentStatus,
  extractViolations,
  formatApiError,
  isReadOnlyBrief,
  prettyAnalystDecision,
  prettyRecommendation,
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
  const [sortBy, setSortBy] = useState<'priority' | 'confidence' | 'rank'>('priority');
  const [filterReadiness, setFilterReadiness] = useState<'all' | 'actionable' | 'blocked'>('all');
  const [filterRecommendation, setFilterRecommendation] = useState<'all' | string>('all');
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium' | 'low' | 'unknown'>('all');
  const [filterAnalystStatus, setFilterAnalystStatus] = useState<'all' | AnalystStatus>('all');

  const readOnly = useMemo(() => (brief ? isReadOnlyBrief(brief.status) : false), [brief]);

  const visibleItems = useMemo(() => {
    if (!brief) return [];

    const withDecision = brief.items.map((item) => {
      const fp = item.frozen_payload || {};
      const confidence = String(fp.confidence || fp.confidence_level || '').toLowerCase();
      const priority = Number(fp.priority_score ?? fp.walmart_relevance_score ?? 0);
      const actionableNow = Number(fp.actionable_now ?? 0) === 1;
      const blocked = Number(fp.readiness_blocked ?? 0) === 1;
      const recommendation = String(fp.recommended_action || 'monitor_only');
      const analystStatus = String(item.analyst_status || 'unreviewed') as AnalystStatus;
      const alignment = decisionAlignmentStatus({
        recommendation,
        analystDecision: item.analyst_decision,
        decisionSource: item.analyst_decision_source,
      });
      return { item, fp, confidence, priority, actionableNow, blocked, recommendation, analystStatus, alignment };
    });

    const filtered = withDecision.filter(({ confidence, actionableNow, blocked, recommendation, analystStatus }) => {
      if (filterReadiness === 'actionable' && !actionableNow) return false;
      if (filterReadiness === 'blocked' && !blocked) return false;
      if (filterRecommendation !== 'all' && recommendation !== filterRecommendation) return false;
      if (filterConfidence !== 'all') {
        if (filterConfidence === 'unknown' && confidence) return false;
        if (filterConfidence !== 'unknown' && confidence !== filterConfidence) return false;
      }
      if (filterAnalystStatus !== 'all' && analystStatus !== filterAnalystStatus) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'confidence') return a.confidence.localeCompare(b.confidence);
      return a.item.rank - b.item.rank;
    });

    return filtered;
  }, [brief, filterAnalystStatus, filterConfidence, filterReadiness, filterRecommendation, sortBy]);

  const summaryCounts = useMemo(() => {
    const counts = {
      total: visibleItems.length,
      actionableNow: 0,
      blocked: 0,
      missingEvidence: 0,
      overridden: 0,
      aligned: 0,
      noDecision: 0,
    };
    for (const row of visibleItems) {
      if (row.actionableNow) counts.actionableNow += 1;
      if (row.blocked) counts.blocked += 1;
      const reasonCodes = Array.isArray(row.fp.reason_codes) ? row.fp.reason_codes.map((c: unknown) => String(c)) : [];
      if (reasonCodes.includes('MISSING_EVIDENCE')) counts.missingEvidence += 1;
      if (row.alignment === 'OVERRIDDEN') counts.overridden += 1;
      if (row.alignment === 'ALIGNED') counts.aligned += 1;
      if (row.alignment === 'NO_DECISION') counts.noDecision += 1;
    }
    return counts;
  }, [visibleItems]);

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
        analyst_status: draft.analyst_status,
        analyst_decision: draft.analyst_decision as AnalystDecision | undefined,
        analyst_note: draft.analyst_note,
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

  const onTransition = async ({
    toStatus,
    note,
    reviewerNotes,
    reviewerAttestReady,
  }: {
    toStatus: CSOBriefStatus;
    note: string;
    reviewerNotes?: string;
    reviewerAttestReady?: boolean;
  }) => {
    if (!brief) return;
    setError(null);
    setMessage(null);
    try {
      const res = await transitionCSOBrief(brief.id, {
        to_status: toStatus,
        note,
        reviewer_notes: reviewerNotes,
        reviewer_attest_ready: reviewerAttestReady,
      });
      setBrief(res.brief);
      if (res.validation) setValidation(res.validation);
      const actionSuffix = res.decision_action ? ` (${res.decision_action})` : '';
      setMessage(`Transitioned ${res.from_status} → ${res.to_status}${actionSuffix}.`);
    } catch (err) {
      const violations = extractViolations(err);
      if (violations.length) {
        setValidation({
          passed: false,
          checked_at: new Date().toISOString(),
          included_item_count: brief.items.filter((i) => i.include_in_summary === 1).length,
          violations,
        });
      }
      setError(formatApiError(err));
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
            <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>{brief.period_start} → {brief.period_end}</p>
          </div>
          <span className={`px-3 py-1 rounded border text-xs font-bold ${statusChipStyles(brief.status)}`}>{brief.status}</span>
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
            <textarea className="sentry-input w-full min-h-24 text-sm" value={executiveSummary} onChange={(e) => setExecutiveSummary(e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Review notes</label>
            <textarea className="sentry-input w-full min-h-20 text-sm" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} disabled={readOnly} />
          </div>
          <button onClick={onSaveMeta} disabled={readOnly} className="px-3 py-2 rounded text-xs font-bold border disabled:opacity-40" style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}>
            Save brief metadata
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Items</h2>
          <button onClick={onValidate} className="px-3 py-2 rounded text-xs font-bold border" style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}>
            Validate
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-2 text-xs">
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Visible: <span className="font-bold">{summaryCounts.total}</span></div>
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Actionable: <span className="font-bold text-green-300">{summaryCounts.actionableNow}</span></div>
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Blocked: <span className="font-bold text-amber-300">{summaryCounts.blocked}</span></div>
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Missing evidence: <span className="font-bold text-red-300">{summaryCounts.missingEvidence}</span></div>
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Overrides: <span className="font-bold">{summaryCounts.overridden}</span></div>
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Aligned: <span className="font-bold">{summaryCounts.aligned}</span></div>
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>No decision: <span className="font-bold">{summaryCounts.noDecision}</span></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 text-xs">
            <select className="sentry-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'priority' | 'confidence' | 'rank')}>
              <option value="priority">Sort: Priority</option><option value="confidence">Sort: Confidence</option><option value="rank">Sort: Rank</option>
            </select>
            <select className="sentry-input" value={filterReadiness} onChange={(e) => setFilterReadiness(e.target.value as 'all' | 'actionable' | 'blocked')}>
              <option value="all">Readiness: All</option><option value="actionable">Readiness: Actionable now</option><option value="blocked">Readiness: Blocked</option>
            </select>
            <select className="sentry-input" value={filterConfidence} onChange={(e) => setFilterConfidence(e.target.value as 'all' | 'high' | 'medium' | 'low' | 'unknown')}>
              <option value="all">Confidence: All</option><option value="high">Confidence: High</option><option value="medium">Confidence: Medium</option><option value="low">Confidence: Low</option><option value="unknown">Confidence: Unknown</option>
            </select>
            <select className="sentry-input" value={filterRecommendation} onChange={(e) => setFilterRecommendation(e.target.value)}>
              <option value="all">Recommendation: All</option><option value="escalate_for_review">Escalate for review</option><option value="request_additional_evidence">Request evidence</option><option value="include_in_brief">Include in brief</option><option value="hold_due_to_readiness_issue">Hold (readiness)</option><option value="monitor_only">Monitor only</option>
            </select>
            <select aria-label="Analyst status" className="sentry-input" value={filterAnalystStatus} onChange={(e) => setFilterAnalystStatus(e.target.value as 'all' | AnalystStatus)}>
              <option value="all">Analyst status: All</option><option value="unreviewed">Unreviewed</option><option value="in_review">In review</option><option value="decided">Decided</option><option value="blocked">Blocked</option>
            </select>
          </div>

          {visibleItems.map(({ item, fp, confidence, actionableNow, blocked, recommendation, alignment }) => {
            const draft = itemDrafts[item.id] || {};
            const merged = {
              rank: draft.rank ?? item.rank,
              owner_assignment: draft.owner_assignment ?? item.owner_assignment,
              analyst_commentary: draft.analyst_commentary ?? item.analyst_commentary,
              uncertainty_note: draft.uncertainty_note ?? item.uncertainty_note,
              include_in_summary: draft.include_in_summary ?? item.include_in_summary,
              analyst_status: draft.analyst_status ?? item.analyst_status ?? 'unreviewed',
              analyst_decision: draft.analyst_decision ?? item.analyst_decision ?? '',
              analyst_note: draft.analyst_note ?? item.analyst_note ?? '',
            };

            return (
              <article key={item.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--s-border)' }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Competitor</p><p className="text-sm font-semibold" style={{ color: 'var(--s-text)' }}>{fp.competitor || '—'}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Event title</p><p className="text-sm font-semibold" style={{ color: 'var(--s-text)' }}>{fp.event_title || '—'}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Event date</p><p className="text-sm" style={{ color: 'var(--s-text)' }}>{fp.event_date || '—'}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Score / priority tier</p><p className="text-sm" style={{ color: 'var(--s-text)' }}>{String(fp.priority_score ?? fp.walmart_relevance_score ?? '—')} · {fp.priority_tier || '—'}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Triage status</p><p className="text-sm" style={{ color: 'var(--s-text)' }}>{fp.triage_status || '—'}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Confidence / severity / likelihood</p><p className="text-sm" style={{ color: 'var(--s-text)' }}>{confidence || 'unknown'} · {fp.severity || '—'} · {fp.likelihood || '—'}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Recommendation / readiness</p><p className="text-sm" style={{ color: 'var(--s-text)' }}>{prettyRecommendation(recommendation)} · {blocked ? 'blocked' : (actionableNow ? 'actionable_now' : 'defer')}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Correlation summary</p><p className="text-sm" style={{ color: 'var(--s-text)' }}>{fp.correlation_summary || fp.walmart_actionability_context || '—'}</p></div>
                  <div className="lg:col-span-2">
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Source link</p>
                    {fp.source_link ? <a href={fp.source_link} target="_blank" rel="noreferrer" className="text-xs text-blue-300 underline break-all">{fp.source_link}</a> : <p className="text-sm">—</p>}
                  </div>
                  <div className="lg:col-span-2 rounded border p-2" style={{ borderColor: 'var(--s-border)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--s-text)' }}>Explainability</p>
                    <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>{(fp.reason_codes || []).join(', ') || '—'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--s-text-muted)' }}>{fp.explanation || 'No explanation available.'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--s-text-muted)' }}>analyst_status={String(merged.analyst_status || 'unreviewed')} · decision={prettyAnalystDecision(String(merged.analyst_decision || ''))} · source={item.analyst_decision_source || 'none'}</p>
                    <p className="text-xs mt-1" style={{ color: alignment === 'OVERRIDDEN' ? '#ffc220' : 'var(--s-text-muted)' }}>
                      Decision alignment: {alignment === 'NO_DECISION' ? 'No decision' : alignment === 'ALIGNED' ? 'Aligned with recommendation' : 'Overridden recommendation'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Rank</label>
                    <input type="number" className="sentry-input w-full text-sm" value={merged.rank} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], rank: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Owner assignment</label>
                    <input className="sentry-input w-full text-sm" value={merged.owner_assignment} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], owner_assignment: e.target.value } }))} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Analyst commentary</label>
                    <textarea className="sentry-input w-full min-h-20 text-sm" value={merged.analyst_commentary} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], analyst_commentary: e.target.value } }))} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Uncertainty note</label>
                    <textarea className="sentry-input w-full min-h-16 text-sm" value={merged.uncertainty_note} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], uncertainty_note: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Analyst status</label>
                    <select aria-label="Analyst status" className="sentry-input w-full text-sm" value={String(merged.analyst_status)} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], analyst_status: e.target.value as AnalystStatus } }))}>
                      <option value="unreviewed">unreviewed</option><option value="in_review">in_review</option><option value="decided">decided</option><option value="blocked">blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Analyst decision</label>
                    <select aria-label="Analyst decision" className="sentry-input w-full text-sm" value={String(merged.analyst_decision || '')} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], analyst_decision: e.target.value as AnalystDecision } }))}>
                      <option value="">(no decision)</option><option value="accept_recommendation">accept_recommendation</option><option value="include_in_brief">include_in_brief</option><option value="escalate_for_review">escalate_for_review</option><option value="request_additional_evidence">request_additional_evidence</option><option value="monitor_only">monitor_only</option><option value="hold">hold</option><option value="dismiss">dismiss</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Analyst decision note</label>
                    <textarea className="sentry-input w-full min-h-16 text-sm" value={String(merged.analyst_note || '')} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], analyst_note: e.target.value } }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id={`include-${item.id}`} type="checkbox" checked={merged.include_in_summary === 1} disabled={readOnly} onChange={(e) => setItemDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], include_in_summary: e.target.checked ? 1 : 0 } }))} />
                    <label htmlFor={`include-${item.id}`} className="text-xs" style={{ color: 'var(--s-text-muted)' }}>Include in summary</label>
                  </div>
                  <div className="lg:col-span-2">
                    <button onClick={() => onSaveItem(item.id)} disabled={readOnly} className="px-3 py-2 rounded text-xs font-bold border disabled:opacity-40" style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}>
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
