// The nest family's geometry: a twig cup laid in the order a bird would (coarse
// base, walls tangent to the rim, fine twigs at the top), a moss lining, speckled
// eggs and a cambered gold feather. Promoted from labs/nest (lab 10).
// Everything static is vertex-coloured geometry on ONE kit material (km.bag), so
// the valley's _mergeStatics folds every instance into a single draw.
import * as THREE from 'three';
import { Bag, tube, lerp, TAU, V3, paintVerts, merge, indexed, shadows, rng as seeded } from '../craft.js?v=20261113a';

export const NEST_R = 0.43; // twig-ring radius; outer rim ~0.52 like the classic torus (0.38 + 0.14)

const TWIG_TIER = { hero: { n: 280, radial: 5, seg: 4 }, mid: { n: 110, radial: 4, seg: 3 }, far: { n: 0, radial: 3, seg: 2 } };

/** A short bent twig of unit length along +Z, radius 1 (scaled at placement). */
function twigGeo(seed, radial, seg) {
  const r = seeded(seed), pts = [];
  for (let i = 0; i <= seg; i++) { const t = i / seg; pts.push(V3((r() - 0.5) * 0.09 * (0.3 + t), (r() - 0.5) * 0.09 * (0.3 + t), t - 0.5)); }
  return tube(pts, (t) => lerp(1, 0.8, t), { radial, caps: false, uScale: 0.4 });
}

const wallR = (h) => 0.27 + (0.21 * Math.min(1, Math.max(0, (h + 0.06) / 0.24)));
const BASE_Y = -0.09;

/** Where each twig goes, per phase. Local to the nest frame. */
function placement(phase, r) {
  const a = r() * TAU;
  if (phase === 'base') {
    const d = Math.sqrt(r()) * 0.3;
    return { x: Math.cos(a) * d, y: BASE_Y + 0.02 + r() * 0.03, z: Math.sin(a) * d, ry: r() * TAU, tilt: (r() - 0.5) * 0.25, len: 0.26 + r() * 0.12, thick: 0.018 };
  }
  if (phase === 'wall') {
    const h = -0.05 + r() * 0.2, d = wallR(h) * (0.94 + r() * 0.1);
    return { x: Math.cos(a) * d, y: h, z: Math.sin(a) * d, ry: -a + (r() - 0.5) * 0.9, tilt: (r() - 0.5) * 0.5, len: 0.22 + r() * 0.12, thick: 0.014 };
  }
  const h = 0.12 + r() * 0.06, d = wallR(h) * (0.98 + r() * 0.1);
  return { x: Math.cos(a) * d, y: h, z: Math.sin(a) * d, ry: -a + (r() - 0.5) * 0.5, tilt: (r() - 0.5) * 0.3, len: 0.17 + r() * 0.08, thick: 0.009 };
}

function lathe(prof, seg, color, jitter, r) {
  const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), seg);
  paintVerts(g, color);
  const c = g.attributes.color, p = g.attributes.position, k = new THREE.Color();
  for (let i = 0; i < c.count; i++) {
    const t = 1 + (r() - 0.5) * jitter;
    k.setRGB(c.getX(i) * t, c.getY(i) * t, c.getZ(i) * t);
    c.setXYZ(i, k.r, k.g, k.b);
  }
  return g;
}

/** The nest bowl: twigs (hero/mid) or one lathe cup (far), plus a moss lining. */
export function buildNestBowl(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const r = ctx.rng, T = TWIG_TIER[tier] || TWIG_TIER.mid;
  const mat = km.bag({ rough: 0.9, brush: 0.1 });
  const group = new THREE.Group(), parts = {};
  const bag = new Bag();
  if (T.n) {
    const geos = [1, 2, 3].map((s) => twigGeo(s * 17 + Math.floor(r() * 5), T.radial, T.seg));
    const n = Math.round(T.n * p.density);
    const nb = Math.round(n * 0.2), nw = Math.round(n * 0.55);
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const phase = i < nb ? 'base' : i < nb + nw ? 'wall' : 'rim';
      const q = placement(phase, r);
      const tone = phase === 'base' ? 0.55 + r() * 0.15 : phase === 'wall' ? 0.7 + r() * 0.15 : 0.85 + r() * 0.2;
      col.setRGB(0.42 * tone * 1.5, 0.3 * tone * 1.5, 0.19 * tone * 1.5).multiplyScalar(0.9);
      bag.add(geos[i % 3], { x: q.x, y: q.y, z: q.z, ry: q.ry, rx: q.tilt, order: 'YXZ', sx: q.thick * p.thickness, sy: q.thick * p.thickness, sz: q.len, color: col.getHex() });
    }
    for (const g of geos) g.dispose();
    // a floor disc the twigs lie on, so no daylight shows through the cup
    bag.add(new THREE.CylinderGeometry(0.3, 0.25, 0.06, T.radial * 2), { y: BASE_Y + 0.03, color: 0x3a2814 });
  } else {
    const prof = [[0.001, BASE_Y], [0.25, BASE_Y], [0.42, 0.0], [0.51, 0.1], [0.5, 0.17], [0.4, 0.14], [0.001, 0.0]];
    const geo = lathe(prof, 10, 0x6a4a2c, 0.3, r);
    bag.geos.push(indexed(geo.index ? geo : geo));
  }
  const twigs = bag.mesh(mat, 'twigs');
  group.add(twigs); parts.twigs = twigs;
  if (T.n) {
    const lc = (tier === 'hero' ? 0x3c4a22 : 0x3c4a22);
    const prof = [[0.001, -0.045], [0.14, -0.04], [0.28, 0.03], [0.35, 0.1], [0.38, 0.12], [0.34, 0.12], [0.3, 0.07], [0.15, -0.0], [0.001, 0.0]];
    const lining = new THREE.Mesh(indexed(lathe(prof, tier === 'hero' ? 24 : 10, lc, 0.35, r)), mat);
    lining.name = 'lining'; group.add(lining); parts.lining = lining;
  }
  shadows(group, true, true);
  return { group, parts, sockets: {}, live: [] };
}

/** Three speckled eggs; origin is the nest frame. layout.tilts are the classic tilts. */
export function buildEggs(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const r = ctx.rng;
  const mat = km.bag({ rough: 0.9, brush: 0.1 });
  const [ws, hs] = tier === 'hero' ? [14, 10] : tier === 'mid' ? [9, 6] : [6, 4];
  const bag = new Bag();
  const tilts = layout.tilts || [0, 0.1, -0.1];
  const base = new THREE.Color(0xa8dcd6), spec = new THREE.Color(0x5a4636), k = new THREE.Color();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const g = new THREE.SphereGeometry(0.065, ws, hs);
    g.scale(1, 1.35, 1);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const s = r() < 0.18 * p.speckle ? 0.4 + r() * 0.5 : 0; // flecks; a darker blue-green band at the blunt end
      k.copy(base).lerp(spec, s).multiplyScalar(0.8 + 0.25 * (pos.getY(v) / 0.09 + 1) / 2);
      col.set([k.r, k.g, k.b], v * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bag.add(g, { x: Math.cos(a) * 0.14, y: 0.04, z: Math.sin(a) * 0.14, rz: tilts[i], keep: true });
    g.dispose();
  }
  const eggs = bag.mesh(mat, 'eggs');
  const group = new THREE.Group(); group.add(eggs);
  shadows(group, true, true);
  return { group, parts: { eggs }, sockets: {}, live: [] };
}

/** The Guardian's Feather: a curved quill and a two-sided cambered vane; origin at the quill's middle, upright. */
export function buildFeather(ctx, layout, p) {
  const { tier, MAT } = ctx;
  const L = p.length, rows = tier === 'hero' ? 14 : tier === 'mid' ? 6 : 2;
  const shared = MAT && MAT.featherGold;
  const mat = shared || new THREE.MeshStandardMaterial({ color: 0xffd042, emissive: 0xb38600, emissiveIntensity: 0.8, roughness: 0.3 });
  const y0 = -0.175 * L, y1 = 0.19 * L, v0 = -0.06 * L;
  const spine = (t) => V3(0.012 * Math.sin(t * Math.PI) * L, lerp(y0, y1, t), 0);
  const group = new THREE.Group(), parts = {};
  const q = tube([0, 1, 2, 3, 4].map((i) => spine(i / 4)), (t) => lerp(0.009, 0.004, t), { radial: tier === 'far' ? 3 : 5, caps: false });
  const quill = new THREE.Mesh(q, mat); quill.name = 'quill'; group.add(quill); parts.quill = quill;
  // vane: width envelope fades to a point; slight camber so it catches light
  const pos = [], idx = [], n = rows + 1;
  const w = (t) => 0.065 * L * Math.sin(Math.min(1, t * 1.15 + 0.1) * Math.PI * 0.92) * (1 - 0.3 * t);
  for (const side of [1, -1]) for (let i = 0; i <= rows; i++) {
    const t = i / rows, c = spine(lerp(v0 / y0 === 0 ? 0 : (v0 - y0) / (y1 - y0), 1, t)), ww = w(t);
    const notch = tier === 'hero' && i % 2 ? 0.93 : 1;
    pos.push(c.x + side * ww * notch, c.y, -0.006 * (ww / (0.065 * L)));
    pos.push(c.x, c.y, 0.003);
  }
  const lat = (side, i) => (side === 0 ? 0 : n * 2) + i * 2;
  for (let s = 0; s < 2; s++) for (let i = 0; i < rows; i++) {
    const a = lat(s, i), b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
    idx.push(a, b, c, b, d, c); // both faces
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  const vane = new THREE.Mesh(geo, mat); vane.name = 'vane'; group.add(vane); parts.vane = vane;
  shadows(group, tier !== 'far', false);
  return { group, parts, sockets: {}, live: [], dispose() { if (!shared) mat.dispose(); } }; // featherGold is the game's shared one
}
