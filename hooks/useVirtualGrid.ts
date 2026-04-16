/**
 * useVirtualGrid — lightweight virtual scrolling for grid layouts.
 *
 * Only renders items that are visible in the viewport (plus an overscan buffer).
 * Dramatically reduces DOM nodes when rendering large vendor lists.
 *
 * Usage:
 *   const { containerProps, items, totalHeight } = useVirtualGrid({
 *     itemCount: vendors.length,
 *     columns: 3,
 *     rowHeight: 240,
 *     gap: 20,
 *     overscan: 2,
 *     containerRef,
 *   });
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseVirtualGridOptions {
  /** Total number of items to render. */
  itemCount: number;
  /** Number of columns in the grid. */
  columns: number;
  /** Height of each row in pixels. */
  rowHeight: number;
  /** Gap between items in pixels. */
  gap: number;
  /** Extra rows to render above/below viewport. Default: 2. */
  overscan?: number;
  /** Ref to the scrollable container element. */
  containerRef: React.RefObject<HTMLElement | null>;
}

interface VirtualItem {
  /** Index in the original data array. */
  index: number;
  /** Row position (0-based). */
  row: number;
  /** Column position (0-based). */
  col: number;
  /** CSS top offset in pixels. */
  top: number;
}

interface UseVirtualGridResult {
  /** Visible items to render (with positioning info). */
  items: VirtualItem[];
  /** Total height of the virtual container in pixels. */
  totalHeight: number;
  /** Call this when the scroll container scrolls. */
  onScroll: () => void;
}

export function useVirtualGrid({
  itemCount,
  columns,
  rowHeight,
  gap,
  overscan = 2,
  containerRef,
}: UseVirtualGridOptions): UseVirtualGridResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const rafRef = useRef(0);

  const totalRows = Math.ceil(itemCount / columns);
  const totalHeight = totalRows * (rowHeight + gap) - gap;

  // Throttled scroll handler using requestAnimationFrame
  const onScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (el) {
        setScrollTop(el.scrollTop);
        setViewportHeight(el.clientHeight);
      }
    });
  }, [containerRef]);

  // Observe container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Calculate visible items
  const items = useMemo(() => {
    const effectiveRowHeight = rowHeight + gap;
    const startRow = Math.max(0, Math.floor(scrollTop / effectiveRowHeight) - overscan);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + viewportHeight) / effectiveRowHeight) + overscan,
    );

    const visible: VirtualItem[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= itemCount) break;
        visible.push({
          index,
          row,
          col,
          top: row * effectiveRowHeight,
        });
      }
    }
    return visible;
  }, [scrollTop, viewportHeight, itemCount, columns, rowHeight, gap, overscan, totalRows]);

  return { items, totalHeight, onScroll };
}
