/**
 * Pagination — accessible page controls.
 *
 * Shows: Prev | 1 2 … 5 6 [7] 8 9 … 14 15 | Next
 * Collapses to a simpler strip when total pages is small.
 */
import React, { useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

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
  const { reducedMotion } = useTheme();
  const go = useCallback((p: number) => {
    if (p >= 1 && p <= totalPages && p !== page && !loading) {
      onChange(p);
      // Scroll back to top — respect user's motion preference
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [page, totalPages, loading, onChange, reducedMotion]);

  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem   = Math.min(page * pageSize, total);
  const pages     = pageWindow(page, totalPages);

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
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: '#64748b' }}
          onMouseEnter={e => { if (page > 1 && !loading) (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        {/* Page numbers */}
        {pages.map((item, idx) =>
          item === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2" style={{ color: '#334155' }} aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              onClick={() => go(item as number)}
              disabled={loading}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className="min-w-[2.25rem] h-9 rounded-lg text-sm font-semibold transition-all"
              style={item === page ? {
                background: '#0053E2',
                color: '#ffffff',
                boxShadow: '0 0 12px rgba(0,83,226,0.5), 0 0 0 2px rgba(0,83,226,0.3)',
                cursor: 'default',
              } : {
                color: '#64748b',
              }}
              onMouseEnter={e => { if (item !== page) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9'; } }}
              onMouseLeave={e => { if (item !== page) { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; } }}
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
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: '#64748b' }}
          onMouseEnter={e => { if (page < totalPages && !loading) (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
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
