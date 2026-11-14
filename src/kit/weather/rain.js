// Rain streaks and the raindrop ring pool.
// Streaks: the game's LineSegments (1,100 of them, one draw), each fading from
// a bright head to a clear tail by vertex alpha and varying in strength, so
// the rain has depth instead of 1,100 equal hairs. Rings: 28 soft double rings.
// Nothing here reads Math.random or Date.now.
import * as THREE from 'three';
import { canvas2d, canvasTexture } from '../craft.js?v=20261113a';
import { sharedTexture } from './sprites.js?v=20261113a';

/**
 * Rain streaks. `layout.positions` holds two vertices per streak (lower then
 * upper); the game's update moves both. A 4-component colour attribute gives
 * every vertex its own alpha (r160 reads it as USE_COLOR_ALPHA).
 */
export function buildRain(ctx, layout, p) {
  const r = ctx.rng;
  const pos = layout.positions;
  const verts = pos.length / 3;
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const col = new Float32Array(verts * 4);
  const tail = ctx.tier === 'far' ? 0.7 : 0;     // the far tier keeps a faint tail (no alpha ramp to read at range)
  for (let s = 0; s < verts / 2; s++) {
    const a = (0.4 + 0.6 * r()) * p.strength;       // how near / heavy this streak is
    col.set([0.86, 0.93, 1, a], s * 8);            // head (the lower vertex)
    col.set([0.78, 0.88, 1, a * tail], s * 8 + 4);  // tail fades to nothing
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const mat = new THREE.LineBasicMaterial({ color: 0xaac8e8, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  const group = new THREE.Group();
  group.add(lines);
  return { group, parts: { lines }, live: [lines], dispose() { geo.dispose(); mat.dispose(); } };
}

/** Two thin rings, the outer bright and the inner a fainter rebound, on a transparent plane. */
export function ringTexture(km) {
  return sharedTexture(km, 'raindrop-ring', () => {
    const [c, x] = canvas2d(64, 64);
    const ring = (r0, r1, a) => {
      const g = x.createRadialGradient(32, 32, r0, 32, 32, r1);
      g.addColorStop(0, `rgba(255,255,255,0)`); g.addColorStop(0.35, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(32, 32, r1, 0, Math.PI * 2); x.arc(32, 32, r0, 0, Math.PI * 2, true); x.fill('evenodd');
    };
    ring(21, 31, 1);
    ring(9, 17, 0.55);
    return canvasTexture(c);
  });
}

/**
 * 28 raindrop rings (parts ring_1 … ring_N). Countryside.updateRainRipples()
 * sets each ring's position, scale, opacity and visibility, so every ring has
 * its own material (the texture is shared). Each plane is laid flat.
 */
export function buildRainRipples(ctx, layout, p) {
  const n = layout.count || 28;
  const tex = ringTexture(ctx.kitMaterials);
  const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const base = new THREE.MeshBasicMaterial({ map: tex, color: p.tint, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const parts = {};
  const mats = [];
  for (let i = 0; i < n; i++) {
    const m = base.clone();
    const ring = new THREE.Mesh(geo, m);
    ring.visible = false;
    ring.renderOrder = 2;
    group.add(ring);
    parts[`ring_${i + 1}`] = ring;
    mats.push(m);
  }
  base.dispose();
  return { group, parts, live: Object.values(parts), dispose() { geo.dispose(); for (const m of mats) m.dispose(); } };
}
