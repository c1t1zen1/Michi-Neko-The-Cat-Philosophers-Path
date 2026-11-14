// Small things: zabuton, bonsai, tea set, the knick-knacks and the grilled
// fish. All vertex-coloured on km.bag (one shared material), so the static
// ones merge into the room's single draw for that material; the knick-knacks
// and the fish stay separate meshes (gameplay moves / hides them).
import * as THREE from 'three';
import { Bag, UNIT, tube, catmull, V3 } from '../craft.js?v=20261113a';
import { roomMats, bagMesh, groupOf, tierFlags } from './common.js?v=20261113a';

const lathe = (pts, seg, scale = 1) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * scale, y * scale)), seg);
const LOW = new THREE.SphereGeometry(1, 8, 6);
const ell = (bag, sx, sy, sz, o, hi = true) => bag.add(hi ? UNIT.sphere : LOW, { ...o, sx, sy, sz });
const SEG = { hero: 28, mid: 12, far: 8 };

/** Nap cushion: a stuffed pillow with a tufted button, piping and four gold tassels. Local origin on the floor, centred. */
export const CUSHIONS = { crimson: 0xa8241e, indigo: 0x2f4a6a, moss: 0x4f6a3a };
export function buildZabuton(ctx, L = {}, tier = 'hero', o = {}) {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx), bag = new Bag();
  const n = far ? 2 : hi ? 10 : 6;
  const g = new THREE.BoxGeometry(0.9, 0.16, 0.9, n, 2, n);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = Math.max(0, 1 - (x / 0.45) ** 2) * Math.max(0, 1 - (z / 0.45) ** 2);
    p.setY(i, y > 0 ? y + 0.04 * k - 0.025 * Math.exp(-(x * x + z * z) / 0.012) : y);
    if (y > 0) { const e = 1 - 0.04 * Math.max(0, Math.abs(x) / 0.45 * Math.abs(z) / 0.45); p.setXYZ(i, x * e, p.getY(i), z * e); }
  }
  g.computeVertexNormals();
  p.needsUpdate = true;
  bag.add(g, { y: 0.08, color: CUSHIONS[o.cushion] || CUSHIONS.crimson });
  if (!far) {
    ell(bag, 0.022, 0.011, 0.022, { y: 0.145, color: 0x6e1612 });                                          // the button
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bag.sphere(0.026, { x: sx * 0.44, y: 0.08, z: sz * 0.44, color: 0xd9ad4c });
      bag.cyl(0.006, 0.07, { x: sx * 0.455, y: 0.04, z: sz * 0.455, color: 0xc29a3c });
    }
    bag.box(0.88, 0.012, 0.012, { y: 0.083, z: 0.449, color: 0xc08a30 });                              // piping
    bag.box(0.88, 0.012, 0.012, { y: 0.083, z: -0.449, color: 0xc08a30 });
  }
  return groupOf('Zabuton Nap Bed', bagMesh(bag, m.bag, 'cushion'));
}

/** Pine bonsai in a glazed pot. Local origin: the pot's foot, on the alcove floor. */
export const FOLIAGE = { green: [0x3f6a35, 0x4b7a3a, 0x365d30, 0x56853f], autumn: [0xa8552a, 0xc47a30, 0x8c4a26, 0xd09040] };
export function buildBonsai(ctx, L = {}, tier = 'hero', o = {}) {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx), rng = ctx.rng, bag = new Bag();
  const seg = SEG[tier] || 16;
  bag.add(lathe([[0.001, 0], [0.15, 0], [0.19, 0.012], [0.245, 0.06], [0.25, 0.128], [0.235, 0.14], [0.22, 0.132], [0.205, 0.112], [0.001, 0.112]], seg), { color: 0x56707c });   // pot
  bag.cyl(0.215, 0.012, { y: 0.116, color: 0x3a2d22 });                                                  // soil
  if (!far) {
    bag.cyl(0.19, 0.008, { y: 0.124, color: 0x5d7a38 });                                                 // moss
    for (const [x, z] of [[-0.14, 0.1], [0.14, 0.12], [0, -0.17]]) bag.box(0.06, 0.02, 0.05, { x, y: 0.01, z, color: 0x3c4c54 });
    for (let i = 0; i < (hi ? 5 : 2); i++) bag.add(new THREE.DodecahedronGeometry(0.02 + rng() * 0.015, 0), { x: -0.12 + rng() * 0.24, y: 0.13, z: 0.05 + rng() * 0.1, sy: 0.6, color: 0x8b8a80 });
  }
  const trunk = tube(catmull([[0, 0.11, 0], [-0.03, 0.22, 0.01], [0.04, 0.34, -0.01], [0.01, 0.48, 0.02], [0.08, 0.6, 0]].map((a) => V3(...a)), far ? 6 : 14), (t) => 0.05 * (1 - t) + 0.014, { radial: far ? 4 : hi ? 7 : 5 });
  bag.add(trunk, { color: 0x4a3524 });
  const limbs = far ? [] : [[[0.0, 0.3, 0], [-0.1, 0.36, 0.03], [-0.17, 0.42, 0.04]], [[0.03, 0.42, 0], [0.12, 0.46, -0.03], [0.2, 0.52, -0.02]], [[0.03, 0.54, 0.01], [-0.06, 0.6, 0.03], [-0.12, 0.66, 0.02]]];
  for (const l of limbs) bag.add(tube(catmull(l.map((a) => V3(...a)), 6), (t) => 0.02 * (1 - t) + 0.007, { radial: 5 }), { color: 0x4a3524 });
  const pads = [[-0.18, 0.47, 0, 0.24, 0.075, 0.18], [0.2, 0.55, 0.02, 0.22, 0.07, 0.17], [-0.04, 0.66, -0.02, 0.18, 0.065, 0.15], [0.14, 0.75, 0, 0.14, 0.06, 0.12]];
  const greens = FOLIAGE[o.foliage] || FOLIAGE.green;
  pads.forEach(([x, y, z, sx, sy, sz], i) => {
    const g = new THREE.IcosahedronGeometry(1, hi ? 2 : 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const f = 1 + (Math.sin(p.getX(k) * 9 + i) * Math.cos(p.getZ(k) * 8 - i) * 0.12) + (rng() - 0.5) * 0.04;
      p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * (p.getY(k) < 0 ? 0.55 : 1), p.getZ(k) * f);
    }
    g.computeVertexNormals();
    bag.add(g, { x, y, z, sx, sy, sz, color: greens[i % 4] });
  });
  return groupOf('Bonsai', bagMesh(bag, m.bag, 'tree'));
}

const KYUSU = [[0.001, 0], [0.045, 0], [0.07, 0.012], [0.088, 0.045], [0.09, 0.07], [0.075, 0.1], [0.05, 0.113], [0.034, 0.12], [0.001, 0.12]];
const YUNOMI = [[0.001, 0], [0.028, 0], [0.032, 0.007], [0.04, 0.05], [0.042, 0.075], [0.038, 0.077], [0.036, 0.05], [0.026, 0.012], [0.001, 0.01]];

/** Kyūsu and two yunomi. Local origin on the tabletop at the teapot; the cups sit 0.2 m along +x and +z (the classic offsets). */
export const GLAZES = { celadon: 0x5b6b62, indigo: 0x3a5068, ash: 0x8a8478 };
export function buildTeaware(ctx, L = {}, tier = 'hero', o = {}) {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx), bag = new Bag(), seg = SEG[tier] || 16;
  const glaze = GLAZES[o.glaze] || GLAZES.celadon;
  bag.add(lathe(KYUSU, seg), { color: glaze });
  ell(bag, 0.014, 0.011, 0.014, { y: 0.134, color: 0x3d4a43 });
  if (!far) {
    bag.add(new THREE.CylinderGeometry(0.012, 0.022, 0.1, 6), { x: 0.115, y: 0.075, rz: -0.85, color: glaze });
    bag.add(new THREE.TorusGeometry(0.045, 0.007, 5, hi ? 12 : 8, Math.PI), { x: -0.088, y: 0.065, rz: Math.PI / 2, color: 0x3d4a43 });
  }
  for (const [x, z, c] of [[0.2, 0, 0xf1ebdc], [0, 0.2, 0xe6e0d0]]) bag.add(lathe(YUNOMI, seg), { x, z, color: c });
  return groupOf('Tea Set', bagMesh(bag, m.bag, 'set'));
}

/** The grilled sea bream (a group the game hides when eaten) on its platter. Local origin: the platter's centre on the table. */
export function buildFishPlatter(ctx, tier = 'hero') {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx), seg = SEG[tier] || 16;
  const plate = new Bag();
  plate.add(lathe([[0.001, 0], [0.17, 0], [0.22, 0.012], [0.24, 0.03], [0.225, 0.03], [0.17, 0.016], [0.001, 0.016]], seg), { color: 0xede4d2 });
  if (!far) ell(plate, 0.04, 0.022, 0.04, { x: -0.1, y: 0.02, z: 0.1, color: 0xf4f1ea });               // grated daikon
  if (hi) ell(plate, 0.03, 0.016, 0.024, { x: -0.06, y: 0.025, z: 0.15, color: 0xc7c94a });     // a wedge of sudachi
  const fish = new Bag();
  ell(fish, 0.21, 0.056, 0.081, { y: 0.04, color: 0xcc7438 }, hi);
  ell(fish, 0.17, 0.022, 0.06, { x: 0.01, y: 0.08, color: 0x8f4a22 }, hi);                // the darker, grilled back
  fish.add(new THREE.ConeGeometry(0.075, 0.12, 4), { x: -0.27, y: 0.04, rz: -Math.PI / 2, sz: 0.3, color: 0xb25f2c });   // a tail fan: wide at the end, narrowing into the body
  if (!far) {
    fish.add(new THREE.ConeGeometry(0.05, 0.09, 3), { x: -0.02, y: 0.12, rz: 0, sz: 0.25, color: 0x8f4a22 });   // dorsal fin
    fish.sphere(0.014, { x: 0.19, y: 0.06, z: 0.06, color: 0x1c130c });
    fish.sphere(0.014, { x: 0.19, y: 0.06, z: -0.06, color: 0x1c130c });
  }
  if (hi) for (let i = 0; i < 4; i++) fish.box(0.012, 0.012, 0.18, { x: -0.1 + i * 0.07, y: 0.092, color: 0x40230f });   // grill marks
  const fg = groupOf('Grilled Sea Bream', bagMesh(fish, m.bag, 'body'));
  fg.position.y = 0.016;
  return { plate: groupOf('Platter', bagMesh(plate, m.bag, 'dish')), fish: fg };
}

/** The three knick-knacks, each its own mesh centred on its own middle (the game spins and bounces them). */
export function buildKnickKnacks(ctx, items, tier = 'hero') {
  const { far } = tierFlags(tier), km = ctx.kitMaterials, seg = SEG[tier] || 16, mat = km.bag({ rough: 0.4 });
  const make = (part) => {
    const g = new Bag();
    if (part === 'cup') g.add(lathe([[0.001, 0], [0.04, 0], [0.046, 0.01], [0.056, 0.07], [0.058, 0.09], [0.053, 0.092], [0.05, 0.07], [0.038, 0.016], [0.001, 0.014]], seg).translate(0, -0.045, 0), { color: 0xf3ede2 });
    else if (part === 'bowl') g.add(lathe([[0.001, 0], [0.04, 0], [0.05, 0.012], [0.082, 0.05], [0.085, 0.07], [0.08, 0.072], [0.076, 0.052], [0.045, 0.02], [0.001, 0.016]], seg).translate(0, -0.035, 0), { color: 0x3e6b8a });
    else {
      const s = new THREE.SphereGeometry(0.055, seg, Math.max(6, seg / 2)), p = s.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2(p.getZ(i), p.getX(i)), band = (Math.sin(a * 4) > 0.6 || Math.abs(p.getY(i)) < 0.008) ? 1 : 0;
        c.setHex(band ? 0xd04a3a : (p.getY(i) > 0 ? 0xf4efe4 : 0xe9e1cf)); col.set([c.r, c.g, c.b], i * 3);
      }
      s.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.add(s, { keep: true });
    }
    return g;
  };
  const parts = {}, group = new THREE.Group();
  for (const d of items) {
    const m = bagMesh(make(d.part), mat, '');
    m.position.set(...d.at);
    group.add(m); parts[d.part] = m;
  }
  void far;
  return { group, parts };
}
