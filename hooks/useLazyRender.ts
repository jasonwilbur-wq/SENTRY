/**
 * useLazyRender — intersection-observer hook that defers rendering until
 * an element is near the viewport.
 *
 * Returns a ref to attach to a placeholder element, and a boolean indicating
 * whether the real content should be rendered. Once triggered, stays true
 * (no re-hiding on scroll away — avoids flicker and preserves state).
 *
 * Usage:
 *   const { ref, isVisible } = useLazyRender({ rootMargin: '200px' });
 *   return (
 *     <div ref={ref}>
 *       {isVisible ? <HeavyComponent /> : <Placeholder />}
 *     </div>
 *   );
 */
import { useEffect, useRef, useState } from 'react';

interface UseLazyRenderOptions {
  /** How far from the viewport to start rendering (CSS margin syntax). Default: '200px'. */
  rootMargin?: string;
  /** Start visible immediately (skip lazy rendering). Default: false. */
  immediate?: boolean;
}

export function useLazyRender(options?: UseLazyRenderOptions) {
  const { rootMargin = '200px', immediate = false } = options ?? {};
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(immediate);

  useEffect(() => {
    if (immediate || isVisible) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Once visible, stay visible
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, immediate, isVisible]);

  return { ref, isVisible };
}
