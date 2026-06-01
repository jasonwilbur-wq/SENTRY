/**
 * GlassCard3D — Reusable 3D perspective-tilt glass card.
 *
 * Mouse tracking applies rotateX/Y to give each card a tactile depth
 * effect. On leave, smoothly snaps back. Pass `glowColor` to add
 * a matching drop-shadow glow on hover.
 */
import React, { useRef, useCallback } from 'react';
import { ATLAS_COLORS } from '../utils/designTokens';

interface GlassCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: string;   // e.g. '#0053e2'
  intensity?: number;   // tilt degrees, default 8
}

export const GlassCard3D: React.FC<GlassCard3DProps> = ({
  children,
  className = '',
  glowColor = ATLAS_COLORS.walmartBlue,
  intensity = 6,
  style,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5; // −0.5 → 0.5
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform =
      `perspective(900px) rotateY(${x * intensity * 1.2}deg) rotateX(${-y * intensity}deg) translateZ(3px) scale(1.008)`;
    el.style.boxShadow =
      `${x * -8}px ${y * -7}px 28px ${glowColor}2e,
       0 8px 24px rgba(0,0,0,0.36),
       inset 0 1px 0 rgba(255,255,255,0.06)`;
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
      className={`atlas-card ${className}`}
      {...rest}
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