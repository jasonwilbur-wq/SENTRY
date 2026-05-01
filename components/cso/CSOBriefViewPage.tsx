import React, { useEffect, useMemo, useState } from 'react';
import { fetchCSOBriefSnapshot } from '../../services/api';
import type { CSOBriefSnapshot } from './csoBriefTypes';
import {
  decisionAlignmentStatus,
  formatApiError,
  prettyAnalystDecision,
  prettyRecommendation,
  statusChipStyles,
} from './csoBriefUiHelpers';

export const CSOBriefViewPage: React.FC<{ briefId: string }> = ({ briefId }) => {
  const [snapshot, setSnapshot] = useState<CSOBriefSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'confidence' | 'rank'>('priority');
  const [filterReadiness, setFilterReadiness] = useState<'all' | 'actionable' | 'blocked'>('all');
  const [filterRecommendation, setFilterRecommendation] = useState<'all' | string>('all');
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium' | 'low' | 'unknown'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCSOBriefSnapshot(briefId)
      .then((data) => { if (!cancelled) setSnapshot(data); })
      .catch((err) => { if (!cancelled) setError(formatApiError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [briefId]);

  const visibleItems = useMemo(() => {
    if (!snapshot) return [];

    const enriched = snapshot.items.map((item) => {
      const confidence = String(item.confidence || item.confidence_level || '').toLowerCase();
      const priority = Number(item.priority_score ?? item.walmart_relevance_score ?? 0);
      const recommendation = String(item.recommended_action || 'monitor_only');
      const blocked = Number(item.readiness_blocked ?? 0) === 1;
      const actionableNow = Number(item.actionable_now ?? 0) === 1;
      const alignment = decisionAlignmentStatus({
        recommendation,
        analystDecision: item.analyst_decision,
        decisionSource: item.analyst_decision_source,
      });
      return { item, confidence, priority, recommendation, blocked, actionableNow, alignment };
    });

    const filtered = enriched.filter(({ blocked, actionableNow, recommendation, confidence }) => {
      if (filterReadiness === 'blocked' && !blocked) return false;
      if (filterReadiness === 'actionable' && !actionableNow) return false;
      if (filterRecommendation !== 'all' && recommendation !== filterRecommendation) return false;
      if (filterConfidence !== 'all') {
        if (filterConfidence === 'unknown' && confidence) return false;
        if (filterConfidence !== 'unknown' && confidence !== filterConfidence) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'confidence') return a.confidence.localeCompare(b.confidence);
      return a.item.rank - b.item.rank;
    });

    return filtered;
  }, [filterConfidence, filterReadiness, filterRecommendation, snapshot, sortBy]);

  const summaryCounts = useMemo(() => {
    const counts = {
      total: visibleItems.length,
      actionableNow: 0,
      blocked: 0,
      missingEvidence: 0,
      overridden: 0,
      aligned: 0,
    };
    for (const row of visibleItems) {
      if (row.actionableNow) counts.actionableNow += 1;
      if (row.blocked) counts.blocked += 1;
      const reasonCodes = Array.isArray(row.item.reason_codes) ? row.item.reason_codes.map((c) => String(c)) : [];
      if (reasonCodes.includes('MISSING_EVIDENCE')) counts.missingEvidence += 1;
      if (row.alignment === 'OVERRIDDEN') counts.overridden += 1;
      if (row.alignment === 'ALIGNED') counts.aligned += 1;
    }
    return counts;
  }, [visibleItems]);

  if (loading) return <div className="p-6 text-sm" style={{ color: 'var(--s-text-muted)' }}>Loading snapshot…</div>;
  if (error) return <div className="p-6 text-sm text-red-300">{error}</div>;
  if (!snapshot) return <div className="p-6 text-sm text-red-300">Snapshot not found.</div>;

  return (
    <div className="p-6 space-y-4">
      <header className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--s-text)' }}>{snapshot.title}</h1>
            <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>{snapshot.period_start} → {snapshot.period_end}</p>
          </div>
          <span className={`px-3 py-1 rounded border text-xs font-bold ${statusChipStyles(snapshot.status)}`}>{snapshot.status}</span>
        </div>
        <div className="rounded-md border px-3 py-2 text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">{snapshot.banner}</div>
      </header>

      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Executive summary</h2>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--s-text-muted)' }}>{snapshot.executive_summary || '—'}</p>
      </section>

      {snapshot.review_notes && (
        <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Review context</h2>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--s-text-muted)' }}>{snapshot.review_notes}</p>
        </section>
      )}

      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Top priorities</h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 text-xs mb-3">
          <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Visible: <span className="font-bold">{summaryCounts.total}</span></div>
          <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Actionable: <span className="font-bold text-green-300">{summaryCounts.actionableNow}</span></div>
          <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Blocked: <span className="font-bold text-amber-300">{summaryCounts.blocked}</span></div>
          <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Missing evidence: <span className="font-bold text-red-300">{summaryCounts.missingEvidence}</span></div>
          <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Overrides: <span className="font-bold">{summaryCounts.overridden}</span></div>
          <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>Aligned: <span className="font-bold">{summaryCounts.aligned}</span></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 text-xs mb-3">
          <select className="sentry-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'priority' | 'confidence' | 'rank')}>
            <option value="priority">Sort: Priority</option><option value="confidence">Sort: Confidence</option><option value="rank">Sort: Rank</option>
          </select>
          <select className="sentry-input" value={filterReadiness} onChange={(e) => setFilterReadiness(e.target.value as 'all' | 'actionable' | 'blocked')}>
            <option value="all">Readiness: All</option><option value="actionable">Readiness: Actionable now</option><option value="blocked">Readiness: Blocked</option>
          </select>
          <select className="sentry-input" value={filterRecommendation} onChange={(e) => setFilterRecommendation(e.target.value)}>
            <option value="all">Recommendation: All</option><option value="escalate_for_review">Escalate for review</option><option value="request_additional_evidence">Request evidence</option><option value="include_in_brief">Include in brief</option><option value="hold_due_to_readiness_issue">Hold (readiness)</option><option value="monitor_only">Monitor only</option>
          </select>
          <select className="sentry-input" value={filterConfidence} onChange={(e) => setFilterConfidence(e.target.value as 'all' | 'high' | 'medium' | 'low' | 'unknown')}>
            <option value="all">Confidence: All</option><option value="high">Confidence: High</option><option value="medium">Confidence: Medium</option><option value="low">Confidence: Low</option><option value="unknown">Confidence: Unknown</option>
          </select>
        </div>

        <div className="space-y-3">
          {visibleItems.map(({ item, recommendation, blocked, actionableNow, alignment }, idx) => (
            <article key={`${item.rank}-${idx}`} className="rounded-lg border p-3" style={{ borderColor: 'var(--s-border)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>#{item.rank} · {item.competitor} — {item.event_title}</p>
                <span className="text-xs" style={{ color: 'var(--s-text-muted)' }}>{item.confidence || item.confidence_level || 'unknown'} confidence</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--s-text-muted)' }}>
                <p><span className="font-bold">Rationale:</span> {item.why_walmart_cares || '—'}</p>
                <p><span className="font-bold">Actionability:</span> {item.walmart_actionability_context || '—'}</p>
                <p><span className="font-bold">Correlation:</span> {item.correlation_summary || '—'}</p>
                <p><span className="font-bold">Priority:</span> {item.priority_score ?? item.walmart_relevance_score ?? '—'}</p>
                <p><span className="font-bold">Severity/Likelihood:</span> {item.severity || '—'} · {item.likelihood || '—'}</p>
                <p><span className="font-bold">Recommended action:</span> {prettyRecommendation(recommendation)}</p>
                <p><span className="font-bold">Readiness:</span> {blocked ? 'blocked' : (actionableNow ? 'actionable_now' : 'defer')}</p>
                <p><span className="font-bold">Owner:</span> {item.owner_assignment || '—'}</p>
                <p><span className="font-bold">Uncertainty:</span> {item.uncertainty_note || '—'}</p>
                <p><span className="font-bold">Source:</span> {item.source_link ? <a href={item.source_link} className="text-blue-300 underline break-all" target="_blank" rel="noreferrer">{item.source_link}</a> : '—'}</p>
                <p><span className="font-bold">Reason codes:</span> {(item.reason_codes || []).join(', ') || '—'}</p>
                <p><span className="font-bold">Analyst decision:</span> {prettyAnalystDecision(item.analyst_decision)} ({item.analyst_decision_source || 'none'})</p>
                <p><span className="font-bold">Decision alignment:</span> {alignment === 'NO_DECISION' ? 'No decision' : alignment === 'ALIGNED' ? 'Aligned with recommendation' : 'Overridden recommendation'}</p>
                <p className="md:col-span-2"><span className="font-bold">Why ranked this way:</span> {item.explanation || '—'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="rounded-md border px-3 py-2 text-xs font-bold bg-slate-500/10 border-slate-500/30" style={{ color: 'var(--s-text-muted)' }}>
        {snapshot.footer}
      </footer>
    </div>
  );
};
