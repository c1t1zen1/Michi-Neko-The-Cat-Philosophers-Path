// The clearing's stones: the perch-side seat stone, the five half-buried path
// stones that lead to it (both `meditation-stone`, layout index 0 and 1) and the
// weathered ensō beside it (`summit-enso`). Rocks reuse the rocks family's
// chisel (rockGeometry fitted to a box), so the classic stone's volume and
// footprint carry over. Everything seeded from ctx.rng.
import * as THREE from 'three';
import { variantRock, weatherOpts, placed, bake, DETAIL } from '../rocks/stone.js?v=20261113a';
import { castMesh } from '../shrine/util.js?v=20261113a';

const seedOf = (r) => 1 + Math.floor(r() * 9000);

/** The warm summit rock: sun-bleached, a little moss on the shade side. One kit material for the family's stones. */
export const warmRock = (km, moss) => km.rock({ a: 0x8c7c64, b: 0xcbbf9f, moss, lichen: 0.3, rough: 0.93 });

export function buildMeditationStone(ctx, layout, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const det = DETAIL[tier] || DETAIL.mid;
  const opts = weatherOpts(p.weathering, 6);
  const mat = warmRock(km, p.moss);
  const group = new THREE.Group(), parts = {};
  if (Array.isArray(layout.stones)) {
    // five path stones, one merged mesh; the classic scale gives each stone's half extents
    const geo = variantRock(seedOf(rng), det[1], opts);
    const list = layout.stones.map(([x, z, sx, sz, rot], i) => {
      const hy = 0.055 + i * 0.004;
      // buried a hand deep (same visible top as classic): the stone reaches below the meadow plane
      return placed(geo, [x, 0.08 + 0.018 - 0.04, z], [0, rot, 0], [sx * p.size, ((hy + 0.04) * p.size) / 0.85, sz * p.size]);
    });
    geo.dispose();
    const mesh = castMesh(bake(list), mat, { cast: false });
    group.add(mesh); parts.stones = mesh;
    return { group, parts, sockets: {}, live: [] };
  }
  // the seat stone: half extents of the classic scaled lump (0.52 x 0.14 x 0.46), seated a hand deep
  const geo = variantRock(seedOf(rng), det[0], opts);
  const stone = castMesh(placed(geo, [0, 0, 0], [0, 0, 0], [0.52 * p.size, 0.14 / 0.85 * p.size, 0.46 * p.size]), mat);
  geo.dispose();
  group.add(stone); parts.stone = stone;
  if (tier !== 'far') {
    // two pebbles at its foot, so it reads as set into the meadow
    const pebbleGeo = variantRock(seedOf(rng), Math.max(0, det[1] - 1), opts);
    const pebbles = bake([
      placed(pebbleGeo, [0.5 * p.size, -0.04, 0.34 * p.size], [0, 0.6, 0], [0.12, 0.06, 0.1]),
      placed(pebbleGeo, [-0.42 * p.size, -0.05, -0.38 * p.size], [0, 2.1, 0], [0.09, 0.05, 0.08])
    ]);
    pebbleGeo.dispose();
    const m = castMesh(pebbles, mat, { cast: false });
    group.add(m); parts.pebbles = m;
  }
  return { group, parts, sockets: {}, live: [] };
}

/** An ink brush ring lying on the grass: a flat ribbon whose width swells, thins and breaks (ensō), fading at the dry end. */
export function buildEnso(ctx, layout, p) {
  const { tier, rng } = ctx;
  const n = tier === 'hero' ? 72 : tier === 'mid' ? 36 : 18;
  const arc = Math.PI * 2 * p.arc, start = rng() * 0.4 + 0.2;
  const R = p.radius, ry = 0.76;
  const pos = new Float32Array((n + 1) * 2 * 3), col = new Float32Array((n + 1) * 2 * 4), idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = start + t * arc;
    // thick where the brush lands, thin and dry where it lifts
    const w = 0.006 + 0.03 * Math.pow(Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.62 + 0.25), 1.4) * (1 - t * 0.7);
    const cx = Math.cos(a), cz = Math.sin(a);
    for (const s of [-1, 1]) {
      const k = (i * 2 + (s < 0 ? 0 : 1)) * 3;
      pos[k] = cx * (R + s * w); pos[k + 1] = 0; pos[k + 2] = cz * (R + s * w) * ry;
      const c = (i * 2 + (s < 0 ? 0 : 1)) * 4;
      col[c] = 0.4; col[c + 1] = 0.37; col[c + 2] = 0.3; col[c + 3] = Math.min(1, 0.4 + (1 - t) * 0.8);
    }
    if (i < n) { const a0 = i * 2; idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo, mat);
  // the classic ring sits inside the seat stone (centred on it, 0.06 m under its top); lift it onto the stone's face so it reads
  ring.renderOrder = 1; ring.rotation.y = 0.36; ring.position.y = 0.075;
  const group = new THREE.Group(); group.add(ring);
  return { group, parts: { ring }, sockets: {}, live: [], dispose() { mat.dispose(); } };
}
