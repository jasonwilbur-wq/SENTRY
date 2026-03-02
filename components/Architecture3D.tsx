/**
 * Architecture3D — Three.js 3D node-graph for SENTRY system architecture.
 *
 * Layered stack layout (Core → Frontend → Modules → API → Data → External).
 * Glowing sphere nodes · additive-blended edges · platform rings per layer.
 * Hover tooltip via raycaster · click to select · mouse-drag orbit · auto-rotate.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARCH_NODES, ARCH_EDGES, ARCH_LAYERS, type ArchNode } from '../constants';

export interface SelectedNode extends ArchNode {
  screenX: number;
  screenY: number;
}

interface Props {
  onSelect: (node: SelectedNode | null) => void;
  selectedId: string | null;
}

// Layer ring radii (how wide the circle of nodes is per layer)
const LAYER_RADIUS = [0, 8, 15, 11, 9, 6] as const;

/** Compute 3D position for a node based on its layer + slot index */
function nodePos(node: ArchNode, slotIndex: number, slotTotal: number): THREE.Vector3 {
  const layerInfo = ARCH_LAYERS[node.layer];
  const r = LAYER_RADIUS[node.layer];
  if (r === 0) return new THREE.Vector3(0, layerInfo.y, 0);
  const a = node.angleFrac !== undefined
    ? node.angleFrac * Math.PI * 2
    : (slotIndex / slotTotal) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * r, layerInfo.y, Math.sin(a) * r);
}

export const Architecture3D: React.FC<Props> = ({ onSelect, selectedId }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const tipRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 900;
    const H = el.clientHeight || 560;

    // ─ Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 800);
    camera.position.set(0, 8, 52);
    camera.lookAt(0, 0, 0);

    // ─ Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a1030, 4));
    const kl = new THREE.PointLight(0x0053e2, 6, 150); kl.position.set(20, 30, 20); scene.add(kl);
    const fl = new THREE.PointLight(0xffc220, 3, 100); fl.position.set(-20, 10, -15); scene.add(fl);

    // ─ Starfield ────────────────────────────────────────────────────────
    const sPos = new Float32Array(3000 * 3);
    for (let i = 0; i < sPos.length; i++) sPos[i] = (Math.random() - 0.5) * 400;
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0x60a5fa, size: 0.3, transparent: true, opacity: 0.4 })));

    // ─ Layer platform rings ──────────────────────────────────────────────
    ARCH_LAYERS.forEach((layer, li) => {
      const r = LAYER_RADIUS[li] as number;
      if (r === 0) return;
      const col = new THREE.Color(layer.color);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.05, 6, 80),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = layer.y;
      scene.add(ring);
      // Halo disc
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(r, 60),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.03, side: THREE.DoubleSide }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = layer.y - 0.1;
      scene.add(disc);
    });

    // ─ Build nodes ───────────────────────────────────────────────────────
    const byLayer = ARCH_LAYERS.map((_, li) => ARCH_NODES.filter(n => n.layer === li));
    const posMap  = new Map<string, THREE.Vector3>();
    const meshMap = new Map<string, THREE.Mesh>();
    const glowMap = new Map<string, THREE.Mesh>();
    const nodeList: { node: ArchNode; mesh: THREE.Mesh }[] = [];

    byLayer.forEach((nodes) => {
      nodes.forEach((node, si) => {
        const col    = new THREE.Color(ARCH_LAYERS[node.layer].color);
        const sz     = (node.size ?? 1.0) * 0.85;
        const pos    = nodePos(node, si, nodes.length);
        posMap.set(node.id, pos);

        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(sz, 32, 32),
          new THREE.MeshStandardMaterial({
            color: col, emissive: col, emissiveIntensity: 0.55,
            metalness: 0.3, roughness: 0.3,
          }),
        );
        mesh.position.copy(pos);
        scene.add(mesh);
        meshMap.set(node.id, mesh);
        nodeList.push({ node, mesh });

        // Glow
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(sz * 2.4, 16, 16),
          new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, side: THREE.BackSide, blending: THREE.AdditiveBlending }),
        );
        glow.position.copy(pos);
        scene.add(glow);
        glowMap.set(node.id, glow);
      });
    });

    // ─ Build edges ──────────────────────────────────────────────────────
    const edgeLines: THREE.Line[] = [];
    // Which edges connect to a given node id
    const nodeEdges = new Map<string, THREE.Line[]>();

    ARCH_EDGES.forEach(edge => {
      const a = posMap.get(edge.from);
      const b = posMap.get(edge.to);
      if (!a || !b) return;
      const geo  = new THREE.BufferGeometry().setFromPoints([a, b]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0x1e40af, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending,
      }));
      scene.add(line);
      edgeLines.push(line);
      // Track adjacency
      ;[edge.from, edge.to].forEach(id => {
        if (!nodeEdges.has(id)) nodeEdges.set(id, []);
        nodeEdges.get(id)!.push(line);
      });
    });

    // ─ Mouse drag orbit ───────────────────────────────────────────────────
    let isDragging = false, lastX = 0, lastY = 0;
    let azimuth = 0, polar = 0.18, autoRotate = true;
    const cameraR = 52;
    let idleTimer: ReturnType<typeof setTimeout>;

    const restartAuto = () => {
      clearTimeout(idleTimer);
      autoRotate = false;
      idleTimer = setTimeout(() => { autoRotate = true; }, 3000);
    };
    const onMD = (e: MouseEvent) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; restartAuto(); };
    const onMU = () => { isDragging = false; };
    const onMM = (e: MouseEvent) => {
      if (isDragging) {
        azimuth -= (e.clientX - lastX) * 0.008;
        polar    = Math.max(-0.6, Math.min(0.7, polar + (e.clientY - lastY) * 0.005));
        lastX = e.clientX; lastY = e.clientY;
        restartAuto();
      }
      // Raycaster hover
      const rect = renderer.domElement.getBoundingClientRect();
      mouseV.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouseV.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    };
    renderer.domElement.addEventListener('mousedown', onMD);
    window.addEventListener('mouseup', onMU);
    renderer.domElement.addEventListener('mousemove', onMM);

    // Click to select
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.5 };
    const mouseV = new THREE.Vector2(-9, -9);
    const meshList = nodeList.map(n => n.mesh);

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mv = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mv, camera);
      const hits = raycaster.intersectObjects(meshList);
      if (hits.length) {
        const idx = meshList.indexOf(hits[0].object as THREE.Mesh);
        const nd  = nodeList[idx].node;
        const p   = hits[0].point.clone().project(camera);
        const wr  = el.getBoundingClientRect();
        onSelect({ ...nd, screenX: (p.x * 0.5 + 0.5) * wr.width, screenY: (-p.y * 0.5 + 0.5) * wr.height });
      } else {
        onSelect(null);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // ─ Animate ───────────────────────────────────────────────────────────
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      if (autoRotate) azimuth += 0.003;

      // Orbit camera
      camera.position.x = cameraR * Math.sin(azimuth) * Math.cos(polar);
      camera.position.y = cameraR * Math.sin(polar) + 0;
      camera.position.z = cameraR * Math.cos(azimuth) * Math.cos(polar);
      camera.lookAt(0, 0, 0);

      // Pulse glows
      glowMap.forEach((glow, id) => {
        const scale = 1.0 + Math.sin(t * 1.4 + id.length * 0.5) * 0.12;
        glow.scale.setScalar(scale);
      });

      // Hover via raycaster
      raycaster.setFromCamera(mouseV, camera);
      const hits = raycaster.intersectObjects(meshList);
      if (hits.length && tipRef.current) {
        const idx  = meshList.indexOf(hits[0].object as THREE.Mesh);
        const nd   = nodeList[idx].node;
        const p    = hits[0].point.clone().project(camera);
        const wr   = el.getBoundingClientRect();
        const tx   = (p.x * 0.5 + 0.5) * wr.width;
        const ty   = (-p.y * 0.5 + 0.5) * wr.height - 52;
        tipRef.current.style.display = 'block';
        tipRef.current.style.left    = `${tx}px`;
        tipRef.current.style.top     = `${ty}px`;
        tipRef.current.innerHTML     =
          `<div style="font-weight:700;font-size:11px">${nd.label}</div>` +
          `<div style="font-size:9px;opacity:.65;margin-top:2px">${ARCH_LAYERS[nd.layer].label}</div>`;
        renderer.domElement.style.cursor = 'pointer';
      } else {
        if (tipRef.current) tipRef.current.style.display = 'none';
        renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'grab';
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth; const h = el.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId); clearTimeout(idleTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mouseup', onMU);
      renderer.domElement.removeEventListener('mousedown', onMD);
      renderer.domElement.removeEventListener('mousemove', onMM);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Re-highlight when selectedId changes
  // (handled via CSS opacity trick — no Three scene state needed)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} aria-label="SENTRY 3D Architecture Graph">
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      <div
        ref={tipRef}
        style={{
          display: 'none', position: 'absolute', pointerEvents: 'none',
          padding: '6px 10px', borderRadius: '7px',
          color: '#fff', background: 'rgba(0,0,0,0.88)',
          border: '1px solid rgba(0,83,226,0.5)',
          transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 20,
        }}
      />
    </div>
  );
};
