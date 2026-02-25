/**
 * Pagination — accessible page controls.
 *
 * Shows: Prev | 1 2 … 5 6 [7] 8 9 … 14 15 | Next
 * Collapses to a simpler strip when total pages is small.
 */
import React, { useCallback } from 'react';

interface Props {
  page:       number;   // current page (1-based)
  totalPages: number;
  total:      number;   // total matching records
  pageSize:   number;
  onChange:   (page: number) => void;
  loading?:   boolean;
}

function pageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3)                   pages.push('...');
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2)           pages.push('...');
  pages.push(total);
  return pages;
}

export const Pagination: React.FC<Props> = ({
  page, totalPages, total, pageSize, onChange, loading = false,
}) => {
  const go = useCallback((p: number) => {
    if (p >= 1 && p <= totalPages && p !== page && !loading) onChange(p);
  }, [page, totalPages, loading, onChange]);

  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem   = Math.min(page * pageSize, total);
  const window    = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Vendor list pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2"
    >
      {/* Count summary */}
      <p className="text-sm text-slate-400 shrink-0">
        Showing{' '}
        <span className="font-semibold text-white">{startItem}–{endItem}</span>
        {' '}of{' '}
        <span className="font-semibold text-white">{total}</span>
        {' '}vendors
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => go(page - 1)}
          disabled={page === 1 || loading}
          aria-label="Previous page"
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
                     text-slate-400 hover:text-white hover:bg-slate-700 transition
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        {/* Page numbers */}
        {window.map((item, idx) =>
          item === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-slate-600" aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              onClick={() => go(item as number)}
              disabled={loading}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={`min-w-[2.25rem] h-9 rounded-lg text-sm font-semibold transition ${
                item === page
                  ? 'bg-wmt-blue text-white shadow-[0_0_12px_rgba(0,83,226,0.5)] cursor-default'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-40'
              }`}
            >
              {item}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => go(page + 1)}
          disabled={page === totalPages || loading}
          aria-label="Next page"
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
                     text-slate-400 hover:text-white hover:bg-slate-700 transition
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
};
