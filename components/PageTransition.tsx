/**
 * PageTransition — Wraps any view and animates it in/out
 * when the `viewKey` prop changes.
 *
 * Uses a two-phase approach:
 *  1. "exit": fade + slide-down the old content
 *  2. "enter": fade + slide-up the new content
 *
 * Pure CSS transitions, zero heavy libraries.
 */
import React, { useEffect, useRef, useState } from 'react';

interface PageTransitionProps {
  viewKey: string;
  children: React.ReactNode;
}

type Phase = 'entering' | 'visible' | 'exiting';

export const PageTransition: React.FC<PageTransitionProps> = ({ viewKey, children }) => {
  const [displayKey,    setDisplayKey]    = useState(viewKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<Phase>('visible');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (viewKey === displayKey) return;

    // Clear any in-flight timers
    if (timerRef.current) clearTimeout(timerRef.current);

    // Phase 1: exit old content
    setPhase('exiting');

    timerRef.current = setTimeout(() => {
      // Phase 2: swap content and enter
      setDisplayKey(viewKey);
      setDisplayChildren(children);
      setPhase('entering');

      timerRef.current = setTimeout(() => {
        setPhase('visible');
      }, 20); // one rAF tick to let the entering class render
    }, 160); // match exit animation duration

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  // Keep children in sync when visible (no transition needed)
  useEffect(() => {
    if (phase === 'visible' && viewKey === displayKey) {
      setDisplayChildren(children);
    }
  }, [children, phase, viewKey, displayKey]);

  const styles: React.CSSProperties = {
    // height: 100% is critical — without it, children that use h-full (like the
    // 3D Risk Map canvas) have nothing to inherit from and collapse to zero.
    height: '100%',
    transition: 'opacity 0.16s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
    opacity:
      phase === 'exiting'  ? 0 :
      phase === 'entering' ? 0 : 1,
    transform:
      phase === 'exiting'  ? 'translateY(-12px) scale(0.99)' :
      phase === 'entering' ? 'translateY(16px) scale(0.99)'  : 'none',
    willChange: 'opacity, transform',
  };

  return (
    <div style={styles} aria-live="polite">
      {displayChildren}
    </div>
  );
};
