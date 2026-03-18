/**
 * PageTransition — Wraps any view and animates it in/out
 * when the `viewKey` prop changes.
 *
 * Uses a two-phase approach:
 *  1. "exit": fade + slide-down the old content
 *  2. "enter": fade + slide-up the new content
 *
 * Pure CSS transitions, zero heavy libraries.
 * Respects reducedMotion from ThemeContext — swaps instantly when enabled.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface PageTransitionProps {
  viewKey: string;
  children: React.ReactNode;
}

type Phase = 'entering' | 'visible' | 'exiting';

/** Duration must match the CSS transition: opacity 0.16s */
const EXIT_DURATION_MS = 160;

/** Per-phase opacity + transform values — single lookup, no nested ternaries */
const PHASE_STYLES: Record<Phase, { opacity: number; transform: string }> = {
  exiting:  { opacity: 0, transform: 'translateY(-12px) scale(0.99)' },
  entering: { opacity: 0, transform: 'translateY(16px)  scale(0.99)' },
  visible:  { opacity: 1, transform: 'none' },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ viewKey, children }) => {
  const { reducedMotion } = useTheme();
  const [displayKey,      setDisplayKey]      = useState(viewKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase,           setPhase]           = useState<Phase>('visible');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    if (viewKey === displayKey) return;

    // Cancel any in-flight timers / rAFs
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);

    if (reducedMotion) {
      // Instant swap — no animation, no delay
      setDisplayKey(viewKey);
      setDisplayChildren(children);
      setPhase('visible');
      return;
    }

    // Phase 1: exit old content
    setPhase('exiting');

    timerRef.current = setTimeout(() => {
      // Phase 2: swap content and begin enter
      setDisplayKey(viewKey);
      setDisplayChildren(children);
      setPhase('entering');

      // One rAF tick lets the browser paint the entering state
      // before we transition to visible
      rafRef.current = requestAnimationFrame(() => setPhase('visible'));
    }, EXIT_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, reducedMotion]);

  // Keep children in sync when already visible (no transition needed)
  useEffect(() => {
    if (phase === 'visible' && viewKey === displayKey) {
      setDisplayChildren(children);
    }
  }, [children, phase, viewKey, displayKey]);

  const styles: React.CSSProperties = {
    // height: 100% is critical — without it, children that use h-full
    // (like the 3D Risk Map canvas) have nothing to inherit and collapse.
    height: '100%',
    transition: reducedMotion
      ? 'none'
      : 'opacity 0.16s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
    // Only promote to compositor layer while animating — not permanently
    willChange: phase !== 'visible' ? 'opacity, transform' : 'auto',
    ...PHASE_STYLES[phase],
  };

  // No aria-live here — focus management in AppShell handles SR announcements
  return <div style={styles}>{displayChildren}</div>;
};