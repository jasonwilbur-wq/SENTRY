/**
 * CompetitorThreat3D — Deep-space threat constellation for Competitor Intelligence.
 *
 * Competitor nodes float in 3D space — size \u221d event count, colour = threat
 * level. Glowing arcs connect the top rivals. Slow orbital rotation.
 * Raw Three.js, consistent with SENTRY 3D patterns.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface ThreatNode {
  name: string;
  eventCount: number;
  threatLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Props { nodes: ThreatNode[] }

const THREAT_HEX: Record<string, number> = {
  HIGH: 0xea1100, MEDIUM: 0xffc220, LOW: 0x22c55e,
};
const THREAT_CSS: Record<string, string> = {
  HIGH: '#ff6b6b', MEDIUM: '#FFC220', LOW: '#4ade80',
};

// Fibonacci sphere for even distribution
function fibonacciPoints(n: number, R: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y   = 1 - (i / (n - 1)) * 2;
    const r   = Math.sqrt(1 - y * y) * R;
    const th  = golden * i;
    pts.push(new THREE.Vector3(Math.cos(th) * r, y * R, Math.sin(th) * r));
  }
  return pts;
}

export const CompetitorThreat3D: React.FC<Props> = ({ nodes }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const tipRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nodes.length) return;
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 900;
    const H = el.clientHeight || 380;

    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 1000);
    camera.position.set(0, 10, 55);
    camera.lookAt(0, 0, 0);

    // Starfield
    const sPos = new Float32Array(4000 * 3);
    for (let i = 0; i < sPos.length; i++) sPos[i] = (Math.random() - 0.5) * 500;
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({
      color: 0x60a5fa, size: 0.4, transparent: true, opacity: 0.5,
    })));

    // Lighting
    scene.add(new THREE.AmbientLight(0x050c20, 4));
    const kl = new THREE.PointLight(0x0053e2, 6, 200);
    kl.position.set(30, 40, 30);
    scene.add(kl);
    const fl = new THREE.PointLight(0x800020, 3, 120);
    fl.position.set(-30, -20, -20);
    scene.add(fl);

    // Central SENTRY orb
    const coreOrb = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0053e2, emissive: 0x001a5e,
        emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.2,
      }),
    );
    scene.add(coreOrb);
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(3.8, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x0053e2, transparent: true, opacity: 0.06,
        side: THREE.BackSide, blending: THREE.AdditiveBlending,
      }),
    ));
    scene.add(new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.07, 8, 100),
      new THREE.MeshBasicMaterial({
        color: 0xffc220, transparent: true, opacity: 0.45,
        blending: THREE.AdditiveBlending,
      }),
    ));

    // Competitor nodes
    const slice = nodes.slice(0, Math.min(nodes.length, 20));
    const maxEv = Math.max(...slice.map(n => n.eventCount), 1);
    const positions = fibonacciPoints(slice.length, 22);

    const meshList: THREE.Mesh[]  = [];
    const glows:    THREE.Mesh[]  = [];
    const constellationG = new THREE.Group();
    scene.add(constellationG);

    slice.forEach((nd, i) => {
      const pos   = positions[i];
      const col   = THREAT_HEX[nd.threatLevel];
      const t     = nd.eventCount / maxEv;
      const sz    = 0.45 + t * 1.6; // 0.45 – 2.05

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(sz, 24, 24),
        new THREE.MeshStandardMaterial({
          color: col, emissive: col,
          emissiveIntensity: nd.threatLevel === 'HIGH' ? 0.8 : 0.4,
          metalness: 0.3, roughness: 0.35,
        }),
      );
      mesh.position.copy(pos);
      constellationG.add(mesh);
      meshList.push(mesh);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(sz * 2.5, 12, 12),
        new THREE.MeshBasicMaterial({
          color: col, transparent: true,
          opacity: nd.threatLevel === 'HIGH' ? 0.18 : 0.09,
          side: THREE.BackSide, blending: THREE.AdditiveBlending,
        }),
      );
      glow.position.copy(pos);
      constellationG.add(glow);
      glows.push(glow);
    });

    // Connecting arcs between top 6 HIGH threats and center
    const highNodes = slice.filter(n => n.threatLevel === 'HIGH').slice(0, 6);
    highNodes.forEach((_, i) => {
      const idx = slice.indexOf(highNodes[i]);
      const a   = new THREE.Vector3(0, 0, 0);
      const b   = positions[idx];
      const mid = b.clone().multiplyScalar(0.55);
      mid.y += 4;
      const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(40);
      constellationG.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: 0xea1100, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending,
        }),
      ));
    });

    // Raycaster for hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9, -9);
    const onMM = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    };
    renderer.domElement.addEventListener('mousemove', onMM);

    // Animate
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;

      constellationG.rotation.y += 0.0025;
      constellationG.rotation.x  = Math.sin(t * 0.12) * 0.06;
      coreOrb.rotation.y        += 0.005;
      (coreOrb.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.7 + Math.sin(t * 1.6) * 0.2;

      glows.forEach((g, i) => {
        g.scale.setScalar(1.0 + Math.sin(t * 1.8 + i * 0.7) * 0.18);
      });

      // Hover tooltip
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshList);
      if (hits.length && tipRef.current && wrapRef.current) {
        const idx = meshList.indexOf(hits[0].object as THREE.Mesh);
        if (idx >= 0) {
          const nd  = slice[idx];
          const p   = hits[0].point.clone().project(camera);
          const wr  = wrapRef.current.getBoundingClientRect();
          tipRef.current.style.display = 'block';
          tipRef.current.style.left    = `${(p.x * 0.5 + 0.5) * wr.width}px`;
          tipRef.current.style.top     = `${(-p.y * 0.5 + 0.5) * wr.height - 66}px`;
          tipRef.current.textContent = `${nd.name} — ${nd.eventCount.toLocaleString()} events — ${nd.threatLevel} THREAT`;
        }
      } else if (tipRef.current) {
        tipRef.current.style.display = 'none';
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth; const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMM);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [nodes]);

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative' }} aria-hidden="true">
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div
        ref={tipRef}
        style={{
          display: 'none', position: 'absolute', pointerEvents: 'none',
          padding: '8px 12px', borderRadius: '8px',
          color: '#fff', background: 'rgba(0,0,0,0.88)',
          border: '1px solid rgba(0,83,226,0.5)',
          transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 20,
        }}
      />
    </div>
  );
};
