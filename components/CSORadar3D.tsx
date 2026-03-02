/**
 * CSORadar3D — Three.js radar sweep for CSO Intelligence hero.
 *
 * Concentric threat rings (CRITICAL / HIGH / MEDIUM / LOW), rotating
 * sweep beam with blip flash as it crosses each CSO node.
 * Raw Three.js, consistent with other SENTRY 3D patterns.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const EXECS = [
  { name: 'Stephen Schmidt', company: 'Amazon CSO',   threat: 'CRITICAL', angleFrac: 0.12 },
  { name: 'Andy Jassy',      company: 'Amazon CEO',   threat: 'CRITICAL', angleFrac: 0.62 },
  { name: 'Amy Herzog',      company: 'AWS CISO',     threat: 'HIGH',     angleFrac: 0.25 },
  { name: 'Diego Souza',     company: 'Kroger CISO',  threat: 'HIGH',     angleFrac: 0.72 },
  { name: 'Rich Agostino',   company: 'Target CISO',  threat: 'HIGH',     angleFrac: 0.45 },
  { name: 'CISO',            company: 'Costco',       threat: 'MEDIUM',   angleFrac: 0.85 },
];

const RING_R: Record<string, number> = { CRITICAL: 5, HIGH: 8.5, MEDIUM: 12, LOW: 15.5 };
const THREAT_HEX: Record<string, number> = {
  CRITICAL: 0xea1100, HIGH: 0xf97316, MEDIUM: 0xffc220, LOW: 0x22c55e,
};
const THREAT_CSS: Record<string, string> = {
  CRITICAL: '#ff6b6b', HIGH: '#fb923c', MEDIUM: '#FFC220', LOW: '#4ade80',
};

function addRing(scene: THREE.Scene, radius: number, color: number, opacity: number) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.05, radius + 0.05, 128),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.5, radius + 0.5, 128),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: opacity * 0.25,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  scene.add(halo);
}

export const CSORadar3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const tipRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 900;
    const H = el.clientHeight || 380;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 500);
    camera.position.set(0, 26, 20);
    camera.lookAt(0, 0, 0);

    // Starfield
    const starPos = new Float32Array(3000 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 320;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x60a5fa, size: 0.35, transparent: true, opacity: 0.45,
    })));

    // Lighting
    scene.add(new THREE.AmbientLight(0x0a1a3a, 2.0));
    const kl = new THREE.PointLight(0x0053e2, 5, 80);
    kl.position.set(0, 25, 10);
    scene.add(kl);

    // Threat rings
    Object.entries(RING_R).forEach(([level, r]) => addRing(scene, r, THREAT_HEX[level], 0.28));

    // Radial spokes
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const mx = RING_R.LOW + 1;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(a) * mx, 0, Math.sin(a) * mx),
      ]);
      scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0x0053e2, transparent: true, opacity: 0.07,
      })));
    }

    // SENTRY core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0053e2, emissive: 0x001a60,
        emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.2,
      }),
    );
    scene.add(core);
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x0053e2, transparent: true, opacity: 0.07,
        side: THREE.BackSide, blending: THREE.AdditiveBlending,
      }),
    ));
    // Spark Yellow equatorial ring
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.05, 8, 80),
      new THREE.MeshStandardMaterial({
        color: 0xffc220, emissive: 0xffc220, emissiveIntensity: 0.6,
        metalness: 0.7, roughness: 0.2,
      }),
    );
    scene.add(coreRing);

    // Exec nodes
    const nodes: Array<{
      mesh: THREE.Mesh; glow: THREE.Mesh;
      angle: number; radius: number; exec: (typeof EXECS)[0];
    }> = [];

    EXECS.forEach(exec => {
      const angle  = exec.angleFrac * Math.PI * 2;
      const radius = RING_R[exec.threat];
      const col    = THREAT_HEX[exec.threat];
      const x      = Math.cos(angle) * radius;
      const z      = Math.sin(angle) * radius;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 32),
        new THREE.MeshStandardMaterial({
          color: col, emissive: col,
          emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.35,
        }),
      );
      mesh.position.set(x, 0.4, z);
      scene.add(mesh);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 16, 16),
        new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.16,
          side: THREE.BackSide, blending: THREE.AdditiveBlending,
        }),
      );
      glow.position.copy(mesh.position);
      scene.add(glow);

      nodes.push({ mesh, glow, angle, radius, exec });
    });

    // Sweep beam group
    const sweepG   = new THREE.Group();
    const sweepLen = RING_R.LOW + 1.5;
    const sweepSpan = Math.PI / 7;
    const numFans   = 32;

    for (let i = 0; i <= numFans; i++) {
      const t     = i / numFans;
      const a     = -sweepSpan * t;
      const geo   = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(a) * sweepLen, 0, Math.sin(a) * sweepLen),
      ]);
      sweepG.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0x00ff88, transparent: true,
        opacity: (1 - t) * 0.6, blending: THREE.AdditiveBlending,
      })));
    }
    // Leading edge
    const edgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(sweepLen, 0, 0),
    ]);
    sweepG.add(new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending,
    })));
    scene.add(sweepG);

    // Raycasting for hover
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2(-9, -9);
    const meshList  = nodes.map(n => n.mesh);

    const onMM = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    };
    renderer.domElement.addEventListener('mousemove', onMM);

    // Animate
    let rafId = 0;
    let sweepAngle = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;

      sweepAngle += 0.007;
      sweepG.rotation.y = sweepAngle;
      core.rotation.y  += 0.004;
      coreRing.rotation.z += 0.005;
      (core.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.7 + Math.sin(t * 1.8) * 0.2;

      // Blip when sweep crosses node
      nodes.forEach((n, idx) => {
        const nodeA  = Math.atan2(n.mesh.position.z, n.mesh.position.x);
        const sa     = ((sweepAngle % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2);
        const na     = (nodeA + Math.PI * 4) % (Math.PI * 2);
        const diff   = (sa - na + Math.PI * 4) % (Math.PI * 2);
        const isLit  = diff < 0.35;
        const mat    = n.mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isLit ? 1.8 : (0.4 + Math.sin(t * 2 + idx * 1.3) * 0.1);
        n.glow.scale.setScalar(isLit ? 2.2 : (1.0 + Math.sin(t + idx) * 0.08));
      });

      // Hover tooltip
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshList);
      if (hits.length && tipRef.current && wrapRef.current) {
        const idx = meshList.indexOf(hits[0].object as THREE.Mesh);
        if (idx >= 0) {
          const nd = nodes[idx];
          const p  = hits[0].point.clone().project(camera);
          const wr = wrapRef.current.getBoundingClientRect();
          const lx = (p.x * 0.5 + 0.5) * wr.width;
          const ly = (-p.y * 0.5 + 0.5) * wr.height - 70;
          tipRef.current.style.display  = 'block';
          tipRef.current.style.left     = `${lx}px`;
          tipRef.current.style.top      = `${ly}px`;
          tipRef.current.innerHTML =
            `<div style="font-weight:700;font-size:12px">${nd.exec.name}</div>` +
            `<div style="opacity:.7;font-size:10px">${nd.exec.company}</div>` +
            `<div style="font-size:10px;margin-top:3px;color:${THREAT_CSS[nd.exec.threat]}">${nd.exec.threat} THREAT</div>`;
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
  }, []);

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
