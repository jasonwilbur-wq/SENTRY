/**
 * LandingBackground3D — A subtle, dark starfield background for the landing page.
 * Uses Three.js for performant particle rendering.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const LandingBackground3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el || fallbackMode) return;

    if (typeof window === 'undefined' || typeof window.WebGLRenderingContext === 'undefined') {
      setFallbackMode(true);
      return;
    }

    const W = el.clientWidth;
    const H = el.clientHeight;
    if (!W || !H) {
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let starGeo: THREE.BufferGeometry | null = null;
    let starMat: THREE.PointsMaterial | null = null;
    let rafId = 0;

    try {
      // Scene setup
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000b28, 0.002);

      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
      camera.position.z = 1;
      camera.rotation.x = Math.PI / 2;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
      });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);

      // Starfield
      starGeo = new THREE.BufferGeometry();
      const starCount = 6000;
      const posArray = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 600;
      }

      starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      starMat = new THREE.PointsMaterial({
        color: 0x60a5fa,
        size: 0.7,
        transparent: true,
        opacity: 0.8,
      });

      const starMesh = new THREE.Points(starGeo, starMat);
      scene.add(starMesh);

      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const positions = starGeo!.attributes.position.array as Float32Array;

        for (let i = 1; i < starCount * 3; i += 3) {
          positions[i] -= 0.8;
          if (positions[i] < -200) {
            positions[i] = 200;
          }
        }

        starGeo!.attributes.position.needsUpdate = true;
        starMesh.rotation.z += 0.0002;
        renderer!.render(scene, camera);
      };

      animate();

      const onResize = () => {
        if (!renderer || !mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };

      window.addEventListener('resize', onResize);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        if (renderer?.domElement && el.contains(renderer.domElement)) {
          el.removeChild(renderer.domElement);
        }
        starGeo?.dispose();
        starMat?.dispose();
        renderer?.dispose();
      };
    } catch (error) {
      console.warn('[LandingBackground3D] Falling back to static background.', error);
      if (renderer?.domElement && el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
      starGeo?.dispose();
      starMat?.dispose();
      renderer?.dispose();
      setFallbackMode(true);
      return;
    }
  }, [fallbackMode]);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 z-0 opacity-40 pointer-events-none"
      style={{ background: 'radial-gradient(circle at center, #000b28 0%, #000000 100%)' }}
    />
  );
};