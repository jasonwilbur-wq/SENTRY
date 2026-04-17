/**
 * RadarScope3D — A Three.js radar scope display themed for the SENTRY
 * security intelligence platform.
 *
 * Replaces the generic orbital-sphere motif with something directly
 * relevant to surveillance, threat detection, and continuous vendor
 * monitoring:
 *
 *   • concentric range rings (polar grid)
 *   • crosshair bearing lines (N/S/E/W)
 *   • rotating sweep beam (radial gradient wedge)
 *   • pulsing target blips that decay after the sweep passes
 *
 * Fully self-contained, ~120 lines, lightweight, and adjustable via props.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface RadarScope3DProps {
  /** Pixel size of the canvas (square). Default 96. */
  size?: number;
  /** Accent color for the sweep and grid (default Walmart blue). */
  color?: number;
  /** Target blip color (default Walmart yellow). */
  blipColor?: number;
  /** Number of targets to paint each rotation. Default 7. */
  targetCount?: number;
}

export const RadarScope3D: React.FC<RadarScope3DProps> = ({
  size = 96,
  color = 0x0053e2,
  blipColor = 0xffc220,
  targetCount = 7,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── Scene + orthographic top-down camera for that clean radar look ──
    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.25, 1.25, 1.25, -1.25, 0.1, 10);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Concentric range rings ─────────────────────────────────────────
    const ringGroup = new THREE.Group();
    [0.35, 0.65, 0.95].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.006, r, 96),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.18 + i * 0.04,
          side: THREE.DoubleSide,
        }),
      );
      ringGroup.add(ring);
    });
    scene.add(ringGroup);

    // ── Crosshair bearing lines ────────────────────────────────────────
    const axisMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 });
    const mkAxis = (a: [number, number], b: [number, number]) => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(a[0], a[1], 0),
        new THREE.Vector3(b[0], b[1], 0),
      ]),
      axisMat,
    );
    scene.add(mkAxis([-0.95, 0], [0.95, 0]));
    scene.add(mkAxis([0, -0.95], [0, 0.95]));
    // 45° diagonals, dimmer
    const diagMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.08 });
    const mkDiag = (a: [number, number], b: [number, number]) => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(a[0], a[1], 0),
        new THREE.Vector3(b[0], b[1], 0),
      ]),
      diagMat,
    );
    scene.add(mkDiag([-0.67, -0.67], [0.67, 0.67]));
    scene.add(mkDiag([-0.67,  0.67], [0.67, -0.67]));

    // ── Sweep beam: a thin triangular wedge with alpha falloff ─────────
    // Built as a semi-circular mesh with vertex colors that fade around
    // the arc so the leading edge is bright and the trailing edge fades.
    const sweepAngle = Math.PI / 3.2; // 56° wedge
    const segments   = 32;
    const sweepGeo   = new THREE.BufferGeometry();
    const positions: number[] = [0, 0, 0];
    const colors:    number[] = [1, 1, 1];
    const c = new THREE.Color(color);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * sweepAngle;
      positions.push(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
      const alpha = 1 - i / segments;
      colors.push(c.r * alpha, c.g * alpha, c.b * alpha);
    }
    const indices: number[] = [];
    for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1);
    sweepGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    sweepGeo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    sweepGeo.setIndex(indices);
    const sweep = new THREE.Mesh(sweepGeo, new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    scene.add(sweep);

    // ── Target blips: randomly placed, pulse brighter when swept ───────
    type Blip = { mesh: THREE.Mesh; angle: number; radius: number; lit: number };
    const blips: Blip[] = [];
    for (let i = 0; i < targetCount; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = 0.25 + Math.random() * 0.65;
      const mesh   = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 16),
        new THREE.MeshBasicMaterial({
          color: blipColor,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.01);
      scene.add(mesh);
      blips.push({ mesh, angle, radius, lit: 0 });
    }

    // ── Centre dot ─────────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    ));

    // ── Animate sweep + blip pulse decay ───────────────────────────────
    let rafId = 0;
    let sweepAngleCur = 0;
    const sweepSpeed  = 0.018; // rad/frame (~60fps)
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      sweepAngleCur = (sweepAngleCur + sweepSpeed) % (Math.PI * 2);
      sweep.rotation.z = sweepAngleCur;

      // Blips: light up when the leading edge of the sweep crosses them,
      // then decay back to dim.
      blips.forEach(b => {
        const delta = ((b.angle - sweepAngleCur) + Math.PI * 2) % (Math.PI * 2);
        if (delta < 0.08) b.lit = 1;
        b.lit *= 0.97;
        const mat = b.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 + b.lit * 0.75;
        b.mesh.scale.setScalar(1 + b.lit * 1.5);
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [size, color, blipColor, targetCount]);

  return <div ref={mountRef} style={{ width: size, height: size }} aria-hidden="true" />;
};
