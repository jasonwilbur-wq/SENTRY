/**
 * VendorOrb3D — lightweight Three.js animated data orb for
 * the Vendor Directory stats panel header.
 *
 * Renders a glowing pulsing sphere + two orbital rings
 * that spin in opposite axes. ~60 lines of Three.js code.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const VendorOrb3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = 120, H = 120;

    // ── Setup ─────────────────────────────────────────────────────────
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Core sphere ───────────────────────────────────────────────────
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0x001e60,
        emissive: 0x0053e2,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.85,
        shininess: 80,
      }),
    );
    scene.add(sphere);

    // Wireframe shell
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.61, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x0a54e8, wireframe: true, transparent: true, opacity: 0.18 }),
    ));

    // ── Ring 1 (equatorial, Walmart blue) ─────────────────────────────
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.022, 6, 60),
      new THREE.MeshBasicMaterial({ color: 0x0053e2 }),
    );
    ring1.rotation.x = 0.35;
    scene.add(ring1);

    // ── Ring 2 (tilted, Spark yellow) ─────────────────────────────────
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.016, 6, 60),
      new THREE.MeshBasicMaterial({ color: 0xffc220, transparent: true, opacity: 0.7 }),
    );
    ring2.rotation.z = Math.PI / 3;
    ring2.rotation.x = 0.5;
    scene.add(ring2);

    // ── Lighting ──────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334455, 0.6));
    const point = new THREE.PointLight(0x0066ff, 1.8, 10);
    point.position.set(3, 3, 3);
    scene.add(point);

    // ── Animate ───────────────────────────────────────────────────────
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      sphere.rotation.y += 0.006;
      sphere.rotation.x += 0.001;
      ring1.rotation.y  += 0.014;
      ring2.rotation.z  += 0.009;
      // Pulse emissive
      const t = Date.now() * 0.001;
      (sphere.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.45 + Math.sin(t) * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: 120, height: 120 }}
      aria-hidden="true"
    />
  );
};