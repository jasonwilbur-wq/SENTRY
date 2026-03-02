/**
 * RegulatoryGlobe3D — Three.js rotating globe for Regulatory Intelligence.
 *
 * Jurisdiction nodes on globe surface, coloured Red/Amber/Yellow/Green
 * by risk level. Pulsing critical nodes. Arcs between high-risk regions.
 * Raw Three.js, consistent with SENTRY 3D patterns.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface RegGlobeProps {
  red?: number; amber?: number; yellow?: number; green?: number;
}

/** Key jurisdictions mapped to lat/lon + approximate risk */
const JURISDICTIONS = [
  // USA / Federal
  { lat: 38, lon: -97,  label: 'USA Federal',    rag: 'Red',    size: 1.4 },
  { lat: 37, lon: -120, label: 'California',      rag: 'Red',    size: 1.2 },
  { lat: 41, lon: -74,  label: 'New York',        rag: 'Red',    size: 1.1 },
  { lat: 33, lon: -84,  label: 'Georgia',         rag: 'Amber',  size: 0.8 },
  { lat: 47, lon: -122, label: 'Washington',      rag: 'Amber',  size: 0.8 },
  { lat: 30, lon: -98,  label: 'Texas',           rag: 'Amber',  size: 0.8 },
  { lat: 42, lon: -83,  label: 'Michigan',        rag: 'Yellow', size: 0.7 },
  // Europe
  { lat: 50, lon: 4,    label: 'EU (GDPR)',       rag: 'Red',    size: 1.5 },
  { lat: 51, lon: -0.1, label: 'UK',              rag: 'Amber',  size: 1.0 },
  { lat: 52, lon: 5,    label: 'Netherlands',     rag: 'Amber',  size: 0.7 },
  { lat: 48, lon: 2,    label: 'France',          rag: 'Red',    size: 0.9 },
  { lat: 52, lon: 13,   label: 'Germany',         rag: 'Red',    size: 0.9 },
  { lat: 59, lon: 18,   label: 'Sweden',          rag: 'Yellow', size: 0.6 },
  // Asia-Pacific
  { lat: 35, lon: 139,  label: 'Japan',           rag: 'Amber',  size: 0.9 },
  { lat: 39, lon: 116,  label: 'China',           rag: 'Red',    size: 1.3 },
  { lat: 22, lon: 114,  label: 'Hong Kong',       rag: 'Amber',  size: 0.7 },
  { lat: -33, lon: 151, label: 'Australia',       rag: 'Amber',  size: 0.8 },
  { lat: 1,  lon: 104,  label: 'Singapore',       rag: 'Yellow', size: 0.7 },
  { lat: 37, lon: 127,  label: 'South Korea',     rag: 'Yellow', size: 0.7 },
  // Americas
  { lat: 45, lon: -75,  label: 'Canada',          rag: 'Yellow', size: 0.8 },
  { lat: -23, lon: -46, label: 'Brazil',          rag: 'Amber',  size: 0.8 },
  // Other
  { lat: -33, lon: 18,  label: 'South Africa',    rag: 'Green',  size: 0.6 },
  { lat: 55, lon: 37,   label: 'Russia',          rag: 'Red',    size: 0.9 },
  { lat: 31, lon: 35,   label: 'Israel',          rag: 'Yellow', size: 0.6 },
  { lat: 25, lon: 55,   label: 'UAE',             rag: 'Green',  size: 0.6 },
];

const RAG_HEX: Record<string, number> = {
  Red: 0xea1100, Amber: 0xf97316, Yellow: 0xffc220, Green: 0x22c55e,
};
const RAG_CSS: Record<string, string> = {
  Red: '#ff6b6b', Amber: '#fb923c', Yellow: '#FFC220', Green: '#4ade80',
};

function latLonToVec3(lat: number, lon: number, R: number): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -R * Math.sin(phi) * Math.cos(theta),
     R * Math.cos(phi),
     R * Math.sin(phi) * Math.sin(theta),
  );
}

function makeArc(a: THREE.Vector3, b: THREE.Vector3, color: number): THREE.Line {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const h   = a.distanceTo(b) * 0.5;
  mid.normalize().multiplyScalar(mid.length() + h);
  const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(48);
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending,
    }),
  );
}

export const RegulatoryGlobe3D: React.FC<RegGlobeProps> = ({ red = 0, amber = 0, yellow = 0, green = 0 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const tipRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 900;
    const H = el.clientHeight || 380;
    const R = Math.min(W, H) * 0.3;
    const RS = R / 160; // scale factor for node sizes

    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
    camera.position.set(0, R * 0.4, R * 2.0);
    camera.lookAt(0, 0, 0);

    // Starfield
    const sPos = new Float32Array(4000 * 3);
    for (let i = 0; i < sPos.length; i++) sPos[i] = (Math.random() - 0.5) * R * 14;
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({
      color: 0x60a5fa, size: R * 0.003, transparent: true, opacity: 0.4,
    })));

    // Lighting
    scene.add(new THREE.AmbientLight(0x0a0f20, 3.0));
    const kl = new THREE.PointLight(0x3060ff, 4, R * 10);
    kl.position.set(R * 1.5, R * 1.2, R * 1.8);
    scene.add(kl);
    const fl = new THREE.PointLight(0x002288, 2, R * 8);
    fl.position.set(-R * 1.2, -R * 0.8, -R);
    scene.add(fl);

    // Globe pivot group (for auto-rotation)
    const globeG = new THREE.Group();
    scene.add(globeG);

    // Inner solid sphere
    globeG.add(new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshStandardMaterial({
        color: 0x020c28, emissive: 0x000820,
        emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.7,
        transparent: true, opacity: 0.92,
      }),
    ));

    // Outer wireframe
    globeG.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.005, 32, 20),
      new THREE.MeshBasicMaterial({
        color: 0x1a3a8f, wireframe: true, transparent: true, opacity: 0.08,
      }),
    ));

    // Atmosphere glow
    globeG.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.08, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x0053e2, transparent: true, opacity: 0.05,
        side: THREE.BackSide, blending: THREE.AdditiveBlending,
      }),
    ));

    // Equatorial ring
    globeG.add(new THREE.Mesh(
      new THREE.TorusGeometry(R * 1.15, R * 0.004, 8, 120),
      new THREE.MeshBasicMaterial({
        color: 0xffc220, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending,
      }),
    ));

    // Jurisdiction nodes
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeData: (typeof JURISDICTIONS)[0][] = [];
    const glows: THREE.Mesh[] = [];

    JURISDICTIONS.forEach(jur => {
      const pos  = latLonToVec3(jur.lat, jur.lon, R * 1.012);
      const col  = RAG_HEX[jur.rag];
      const sz   = jur.size * RS * 5.5;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(sz, 16, 16),
        new THREE.MeshStandardMaterial({
          color: col, emissive: col,
          emissiveIntensity: jur.rag === 'Red' ? 0.9 : 0.5,
          metalness: 0.2, roughness: 0.4,
        }),
      );
      mesh.position.copy(pos);
      globeG.add(mesh);
      nodeMeshes.push(mesh);
      nodeData.push(jur);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(sz * 2.8, 12, 12),
        new THREE.MeshBasicMaterial({
          color: col, transparent: true,
          opacity: jur.rag === 'Red' ? 0.22 : 0.1,
          side: THREE.BackSide, blending: THREE.AdditiveBlending,
        }),
      );
      glow.position.copy(pos);
      globeG.add(glow);
      glows.push(glow);
    });

    // Arcs between high-risk hubs
    const redNodes = JURISDICTIONS.filter(j => j.rag === 'Red').slice(0, 6);
    for (let i = 0; i < redNodes.length - 1; i++) {
      const a = latLonToVec3(redNodes[i].lat,     redNodes[i].lon,     R * 1.01);
      const b = latLonToVec3(redNodes[i+1].lat,   redNodes[i+1].lon,   R * 1.01);
      globeG.add(makeArc(a, b, RAG_HEX.Red));
    }
    const amberNodes = JURISDICTIONS.filter(j => j.rag === 'Amber').slice(0, 4);
    for (let i = 0; i < amberNodes.length - 1; i++) {
      const a = latLonToVec3(amberNodes[i].lat,   amberNodes[i].lon,   R * 1.01);
      const b = latLonToVec3(amberNodes[i+1].lat, amberNodes[i+1].lon, R * 1.01);
      globeG.add(makeArc(a, b, RAG_HEX.Amber));
    }

    // Hover raycaster
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2(-9, -9);
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
      globeG.rotation.y += 0.0028;

      // Pulse red nodes
      glows.forEach((g, i) => {
        const jur = nodeData[i];
        if (jur.rag === 'Red') {
          g.scale.setScalar(1.0 + Math.sin(t * 2.2 + i * 0.8) * 0.35);
          (g.material as THREE.MeshBasicMaterial).opacity =
            0.18 + Math.sin(t * 2.2 + i * 0.8) * 0.1;
        } else if (jur.rag === 'Amber') {
          g.scale.setScalar(1.0 + Math.sin(t * 1.5 + i) * 0.15);
        }
      });

      // Hover tooltip
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(nodeMeshes);
      if (hits.length && tipRef.current && wrapRef.current) {
        const idx = nodeMeshes.indexOf(hits[0].object as THREE.Mesh);
        if (idx >= 0) {
          const jur = nodeData[idx];
          const p   = hits[0].point.clone().project(camera);
          const wr  = wrapRef.current.getBoundingClientRect();
          tipRef.current.style.display = 'block';
          tipRef.current.style.left    = `${(p.x * 0.5 + 0.5) * wr.width}px`;
          tipRef.current.style.top     = `${(-p.y * 0.5 + 0.5) * wr.height - 60}px`;
          tipRef.current.innerHTML =
            `<div style="font-weight:700;font-size:12px">${jur.label}</div>` +
            `<div style="margin-top:3px;font-size:10px;color:${RAG_CSS[jur.rag]}">${jur.rag} RISK</div>`;
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
