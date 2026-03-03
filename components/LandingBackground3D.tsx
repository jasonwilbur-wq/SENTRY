/**
 * LandingBackground3D — A subtle, dark starfield background for the landing page.
 * Uses Three.js for performant particle rendering.
 *
 * Accessibility: Declares role="img" with aria-label for screen readers.
 * Performance:   Animation pauses automatically when `prefers-reduced-motion` is
 *                active OR when the user has toggled the manual reduce-motion
 *                control in the sidebar (via ThemeContext).
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

export const LandingBackground3D: React.FC = () => {
  const mountRef          = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useTheme();

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog   = new THREE.FogExp2(0x000b28, 0.002);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 1;
    camera.rotation.x = Math.PI / 2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Starfield geometry
    const starGeo   = new THREE.BufferGeometry();
    const starCount = 6000;
    const posArray  = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 600;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const starMat  = new THREE.PointsMaterial({
      color: 0x60a5fa, size: 0.7, transparent: true, opacity: 0.8,
    });
    const starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    // Render one static frame (visible even in reduced-motion mode)
    renderer.render(scene, camera);

    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const positions = starGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < starCount * 3; i += 3) {
        positions[i] -= 0.8;
        if (positions[i] < -200) positions[i] = 200;
      }
      starGeo.attributes.position.needsUpdate = true;
      starMesh.rotation.z += 0.0002;
      renderer.render(scene, camera);
    };

    // Only animate when motion is permitted
    if (!reducedMotion) animate();

    const onResize = () => {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      renderer.dispose();
    };
  // Re-mount when reducedMotion toggles so the RAF loop starts/stops cleanly
  }, [reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label="Animated starfield background — decorative"
      className="absolute inset-0 z-0 opacity-40 pointer-events-none"
      style={{ background: 'radial-gradient(circle at center, #000b28 0%, #000000 100%)' }}
    />
  );
};