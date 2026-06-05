import React, { useState } from 'react';

const DEFINITIONS = [
  {
    metric: 'Active vendors',
    definition: 'Canonical vendor records visible in the SENTRY directory. This is the executive-facing denominator for directory views.',
    source: 'Vendor directory API / canonical vendor profile set',
  },
  {
    metric: 'VAR reports',
    definition: 'Completed or linked Vendor Assessment Reports associated with vendor records. Coverage is VAR-linked vendors divided by canonical active vendors.',
    source: 'VAR report index and vendor linkage tables',
  },
  {
    metric: 'Average score',
    definition: 'Current vendor assessment score on the SENTRY 0–5 scale. A–F grades normalize this scale for leadership views.',
    source: 'Latest vendor/VAR score fields',
  },
  {
    metric: 'Portfolio posture',
    definition: 'Full backend posture can include raw/scored records beyond the canonical directory. Treat this as analytical posture, not always the same as visible directory count.',
    source: '/api/portfolio/posture',
  },
  {
    metric: 'Executive Intel',
    definition: 'Review-only local artifacts from Executive Signal Scout. Draft intelligence is not published or CSO-final until analyst approval.',
    source: 'data/executive-intel read-only artifacts',
  },
];

export const DataTrustPanel: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}
      aria-label="SENTRY metric methodology"
    >
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-5 py-4 text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wmt-blue"
        aria-expanded={open}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#FFC220' }}>
              Data trust
            </span>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)' }}>
              Methodology
            </span>
          </div>
          <h3 className="mt-1 text-sm font-black" style={{ color: 'var(--s-text)' }}>
            How SENTRY calculates the numbers on this page
          </h3>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
            Use these labels to separate canonical directory counts, VAR coverage, analytical posture, and review-only intelligence surfaces.
          </p>
        </div>
        <span className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ color: '#4d9fff', borderColor: 'rgba(77,159,255,0.4)', background: 'var(--s-input-bg)' }}>
          {open ? 'Hide definitions' : 'Show definitions'}
        </span>
      </button>

      {open && (
        <div className="border-t px-5 py-4" style={{ borderColor: 'var(--s-border)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {DEFINITIONS.map(item => (
              <article
                key={item.metric}
                className="rounded-xl border p-3"
                style={{ background: 'rgba(0,0,0,0.14)', borderColor: 'var(--s-border-mid)' }}
              >
                <h4 className="text-xs font-black" style={{ color: 'var(--s-text)' }}>{item.metric}</h4>
                <p className="mt-2 text-[11px] leading-5" style={{ color: 'var(--s-text-dim)' }}>{item.definition}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--s-text-faint)' }}>
                  Source: {item.source}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-5" style={{ color: 'var(--s-text-dim)' }}>
            Next data-quality milestone: formalize score history and last-refreshed timestamps so SENTRY can show trend movement and freshness next to every executive metric.
          </p>
        </div>
      )}
    </section>
  );
};

export default DataTrustPanel;
