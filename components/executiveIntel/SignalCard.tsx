import React, { useState } from 'react';
import { ExecutiveSignalRecord } from '../../services/executiveIntelApi';
import { Badge } from './ui';
import {
  ageLabel,
  confidenceLabel,
  confidenceTone,
  isStale,
  prettyLabel,
  verificationTone,
} from './signalLogic';
import { classifySentiment, sentimentTone } from './insights';

// ---------------------------------------------------------------------------
// One signal, presented for analyst decision value:
//  - verification + confidence + category + recency badges up top
//  - clear Walmart relevance callout
//  - citations collapsed by default (expand on demand) with corroboration count
//  - LEAD_ONLY / stale signals get distinct visual treatment
// ---------------------------------------------------------------------------

const sourceQualityTone = (q?: string) => {
  const v = (q || '').toUpperCase();
  if (v.includes('HIGH') || v.includes('PRIMARY')) return 'green' as const;
  if (v.includes('MEDIUM') || v.includes('REPUTABLE')) return 'blue' as const;
  if (v.includes('LOW') || v.includes('SINGLE')) return 'yellow' as const;
  return 'gray' as const;
};

export function SignalCard({ signal }: { signal: ExecutiveSignalRecord }) {
  const [open, setOpen] = useState(false);
  const lead = signal.verification_status === 'LEAD_ONLY';
  const conflicting = signal.verification_status === 'CONFLICTING';
  const stale = isStale(signal);
  const citationCount = signal.citations?.length ?? 0;
  const cat = (signal.category || '').toUpperCase();
  const showSentiment = cat === 'PUBLIC_QUOTE' || cat === 'PUBLIC_APPEARANCE';
  const sentiment = classifySentiment(signal);

  const borderColor = conflicting
    ? 'rgba(234,17,0,0.45)'
    : lead
      ? 'rgba(255,194,32,0.5)'
      : 'var(--s-border-light)';

  return (
    <article
      className="rounded-xl border p-4"
      style={{
        borderColor,
        borderStyle: lead ? 'dashed' : 'solid',
        background: 'var(--s-input-bg)',
        opacity: stale ? 0.85 : 1,
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={verificationTone(signal.verification_status)}>{signal.verification_status}</Badge>
        <Badge tone={confidenceTone(signal.confidence_level)} title={signal.confidence_level}>
          {confidenceLabel(signal.confidence_level)}
        </Badge>
        <Badge tone="gray">{prettyLabel(signal.category)}</Badge>
        {showSentiment && <Badge tone={sentimentTone(sentiment)} title="Heuristic sentiment (AI draft)">{sentiment}</Badge>}
        <span className="ml-auto text-xs" style={{ color: 'var(--s-text-dim)' }}>
          {signal.event_date ?? 'undated'} · {ageLabel(signal.event_date)}
        </span>
        {stale && <Badge tone="yellow" title="Older than 90 days without refresh">stale</Badge>}
      </div>

      <h4 className="mt-3 font-black" style={{ color: 'var(--s-text)' }}>{signal.title}</h4>
      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>{signal.summary}</p>

      {signal.walmart_cso_relevance && (
        <div
          className="mt-3 rounded-lg border-l-4 p-3 text-sm leading-6"
          style={{ borderColor: '#0053E2', background: 'rgba(0,83,226,0.05)', color: 'var(--s-text)' }}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: '#0053E2' }}>Walmart relevance</span>
          <p className="mt-1">{signal.walmart_cso_relevance}</p>
        </div>
      )}

      {citationCount > 0 && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--s-border-light)' }}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex min-h-[24px] items-center gap-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]"
            style={{ color: 'var(--s-text-dim)' }}
            aria-expanded={open}
            aria-label={(open ? 'Hide ' : 'Show ') + citationCount + ' ' + (citationCount === 1 ? 'source' : 'sources') + ' for ' + signal.title}
          >
            <span aria-hidden="true">{open ? '▾' : '▸'}</span>
            {citationCount} {citationCount === 1 ? 'source' : 'sources'}
            {citationCount === 1 && <span style={{ color: '#995213' }}>· single-source</span>}
          </button>
          {open && (
            <ul className="mt-2 space-y-2">
              {signal.citations.map(citation => (
                <li key={citation.citation_id} className="text-xs leading-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={citation.url} target="_blank" rel="noreferrer" className="underline" style={{ color: '#0053E2' }}>
                      {citation.source_title || citation.url}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    <Badge tone={sourceQualityTone(citation.source_quality)}>{prettyLabel(citation.source_quality)}</Badge>
                    {citation.published_date && <span style={{ color: 'var(--s-text-dim)' }}>{citation.published_date}</span>}
                  </div>
                  {citation.evidence_excerpt && (
                    <p className="mt-1 italic" style={{ color: 'var(--s-text-dim)' }}>&ldquo;{citation.evidence_excerpt}&rdquo;</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export default SignalCard;
