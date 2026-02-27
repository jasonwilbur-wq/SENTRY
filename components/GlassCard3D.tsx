/**
 * GlassCard3D — Reusable 3D perspective-tilt glass card.
 *
 * Mouse tracking applies rotateX/Y to give each card a tactile depth
 * effect. On leave, smoothly snaps back. Pass `glowColor` to add
 * a matching drop-shadow glow on hover.
 */
import React, { useRef, useCallback } from 'react';

interface GlassCard3DProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;   // e.g. '#0053e2'
  intensity?: number;   // tilt degrees, default 8
  style?: React.CSSProperties;
}

export const GlassCard3D: React.FC<GlassCard3DProps> = ({
  children,
  className = '',
  glowColor = '#0053e2',
  intensity = 8,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5; // −0.5 → 0.5
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform =
      `perspective(900px) rotateY(${x * intensity * 1.5}deg) rotateX(${-y * intensity}deg) translateZ(6px) scale(1.015)`;
    el.style.boxShadow =
      `${x * -12}px ${y * -10}px 40px ${glowColor}44,
       0 4px 24px rgba(0,0,0,0.55),
       inset 0 1px 0 rgba(255,255,255,0.08)`;
  }, [intensity, glowColor]);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0) scale(1)';
    el.style.boxShadow = '';
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: 'transform 0.18s ease-out, box-shadow 0.18s ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};