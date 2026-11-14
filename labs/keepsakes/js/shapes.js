// Keepsake geometry (Lab 17 "keepsakes"): wound yarn, the antique key, the
// golden dango charm, the jade paw and the grilled fish. Pure geometry: every
// function returns a BufferGeometry (indexed, position/normal/uv/colour) so
// the family builders can merge it on the game's shared materials.
// Everything is seeded; nothing reads Math.random.
import * as THREE from 'three';
import { Bag, V3, TAU, rng, tube, merge } from '../../shared/craft.js';

/** Planar uv (xy) so a textured material can sample a merged mesh that had none. */
export function planarUv(geo, k = 2) {
  const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) * k; uv[i * 2 + 1] = pos.getY(i) * k; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/* ------------------------------------------------------------------ yarn --- */

export const YARN_PINKS = [0xf27a9f, 0xe04a7a, 0xd94a6a, 0xf79ab5, 0xe8628a];
export const YARN_WARM = [0xf2a65a, 0xe08a3a, 0xd49a3a, 0xf0c070, 0xe8905a];
/** Detail per tier: [bands, strands per band, segments per strand, radial, core width, core height]. */
export const YARN_DETAIL = Object.freeze({ hero: [5, 3, 72, 5, 18, 12], mid: [4, 2, 44, 4, 12, 9], far: [3, 1, 22, 3, 8, 6] });

/**
 * A ball of yarn: bands of thread, each band a few strands wound round its own
 * great circle (the lab's "wound thread"), vertex-coloured in nearby pinks.
 * radius R is the outer radius; `bands` caps the tier's band count.
 */
export function yarnThread(R = 0.2, det = YARN_DETAIL.mid, { bands = 99, warmth = 0, seed = 3 } = {}) {
  const [nb, ns, segs, radial] = det;
  const rand = rng(seed), bag = new Bag();
  const r = R * 0.075, palette = warmth > 0.5 ? YARN_WARM : YARN_PINKS;
  for (let b = 0; b < Math.min(nb, bands); b++) {
    const axis = V3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    const side = V3(1, 0, 0).cross(axis).normalize(), up = axis.clone().cross(side);
    const thick = 0.42 + rand() * 0.3;
    const color = palette[b % palette.length];
    for (let k = 0; k < ns; k++) {
      const pts = [], phase = rand() * TAU;
      for (let i = 0; i <= segs; i++) {
        const a = phase + i / segs * TAU;
        const lift = Math.sin(a * 2.3 + b) * thick * 0.12 + (k - (ns - 1) / 2) * 0.11;
        const p = side.clone().multiplyScalar(Math.cos(a)).add(up.clone().multiplyScalar(Math.sin(a))).add(axis.clone().multiplyScalar(lift * 0.9));
        p.normalize().multiplyScalar(R * 0.93 * (1 + 0.04 * Math.sin(a * 5 + k)));
        pts.push(p);
      }
      bag.add(tube(pts, r, { radial, caps: false }), { color });
    }
  }
  const geo = bag.geometry();
  return geo || new THREE.BufferGeometry();
}

/* ------------------------------------------------------------------- key --- */

/** Detail per tier: [torus radial, torus tubular, stem radial]. */
export const KEY_DETAIL = Object.freeze({ hero: [10, 28, 10], mid: [7, 18, 8], far: [4, 10, 5] });

/**
 * The antique secret-house key, standing on its stem with the bow up: a round
 * bow with an inner ring, a collar, a stem and a stepped three-tooth bit.
 * Same extent as the classic key (bow centre y 0.28, stem -0.13..0.29).
 */
export function keyGeometry(det = KEY_DETAIL.mid) {
  const [rad, tub, srad] = det;
  const parts = [];
  const add = (g, fn) => { if (fn) fn(g); parts.push(g.index ? g.toNonIndexed() : g); };
  add(new THREE.TorusGeometry(0.14, 0.032, rad, tub), (g) => g.translate(0, 0.28, 0));
  if (det !== KEY_DETAIL.far) {
    add(new THREE.TorusGeometry(0.062, 0.014, Math.max(4, rad - 2), Math.max(10, tub - 8)), (g) => g.translate(0, 0.28, 0));
    for (const a of [0, 1, 2, 3]) add(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 5), (g) => { g.rotateZ(Math.PI / 2); g.translate(0.099, 0, 0); g.rotateZ(a * Math.PI / 2 + Math.PI / 4); g.translate(0, 0.28, 0); });
    add(new THREE.TorusGeometry(0.052, 0.02, 6, 12), (g) => { g.rotateX(Math.PI / 2); g.translate(0, 0.125, 0); }); // collar
  }
  add(new THREE.CylinderGeometry(0.028, 0.034, 0.42, srad), (g) => g.translate(0, 0.08, 0));
  // bit: three stepped teeth
  add(new THREE.BoxGeometry(0.13, 0.04, 0.03), (g) => g.translate(0.075, -0.115, 0));
  add(new THREE.BoxGeometry(0.1, 0.035, 0.03), (g) => g.translate(0.06, -0.06, 0));
  add(new THREE.BoxGeometry(0.075, 0.035, 0.03), (g) => g.translate(0.048, -0.005, 0));
  return planarUv(merge(parts), 2);
}

/* ----------------------------------------------------------------- dango --- */

/** Detail per tier: [sphere width, sphere height]. */
export const DANGO_DETAIL = Object.freeze({ hero: [22, 16], mid: [14, 10], far: [8, 6] });

/** Three golden dumplings, slightly squashed, stacked so the charm reads as a skewer of dango. Centre of mass at the origin. */
export function dangoBalls(det = DANGO_DETAIL.mid) {
  const geos = [];
  [[-0.1, 0.066, 1.0], [0.0, 0.073, 0.96], [0.105, 0.066, 1.0]].forEach(([y, r, sq], i) => {
    const g = new THREE.SphereGeometry(r, det[0], det[1]);
    g.scale(1, sq, 1);
    g.translate(0, y, 0);
    geos.push(g);
  });
  return merge(geos);
}

/** The skewer, the red cord loop and a two-strand tassel: vertex-coloured. */
export function dangoTrim(det = DANGO_DETAIL.mid) {
  const bag = new Bag();
  const far = det === DANGO_DETAIL.far;
  bag.cyl(0.011, 0.42, { y: 0.02, color: 0xc9a36a });
  bag.add(new THREE.ConeGeometry(0.011, 0.04, 6), { y: 0.25, color: 0xc9a36a });
  if (!far) {
    bag.add(new THREE.TorusGeometry(0.045, 0.009, 6, 16), { y: 0.275, rx: 0, color: 0xb83a2e });
    for (const s of [-1, 1]) bag.cyl(0.006, 0.12, { x: s * 0.012, y: -0.28, color: 0xb83a2e });
    bag.sphere(0.017, { y: -0.215, color: 0xd9a441 });
  }
  return bag.geometry();
}

/* ------------------------------------------------------------------ jade --- */

/** Detail per tier: [disc segments, bean width, bean height]. */
export const JADE_DETAIL = Object.freeze({ hero: [40, 16, 12], mid: [24, 10, 8], far: [10, 6, 4] });

/**
 * The Jade Paw: a thick carved medallion with a raised cat's-paw (palm and
 * four toes) on both faces. The medallion faces +z; its rim ring is separate.
 */
export function jadePawGeometry(det = JADE_DETAIL.mid) {
  const [seg, bw, bh] = det;
  const parts = [];
  const disc = new THREE.CylinderGeometry(0.215, 0.23, 0.07, seg, 1);
  disc.rotateX(Math.PI / 2);
  parts.push(disc.toNonIndexed());
  const bean = (x, y, sx, sy, face) => {
    const g = new THREE.SphereGeometry(1, bw, bh);
    g.scale(sx, sy, 0.03);
    g.translate(x, y, face * 0.04);
    parts.push(g.toNonIndexed());
  };
  for (const f of [1, -1]) {
    bean(0, -0.045, 0.085, 0.07, f);
    bean(-0.105, 0.045, 0.034, 0.045, f);
    bean(-0.036, 0.095, 0.034, 0.048, f);
    bean(0.036, 0.095, 0.034, 0.048, f);
    bean(0.105, 0.045, 0.034, 0.045, f);
  }
  return merge(parts);
}

/* ------------------------------------------------------------------ fish --- */

/** Detail per tier: [body width, body height]. */
export const FISH_DETAIL = Object.freeze({ hero: [22, 16], mid: [14, 10], far: [8, 6] });

/**
 * A grilled fish lying on its side, head toward +x: a tapered body with a
 * pale belly, dark grill stripes along the back, a fan tail, fins and an eye.
 * `scale` is the classic body radius (0.12 secret house, 0.14 tea house).
 */
export function fishGeometry(det = FISH_DETAIL.mid, scale = 0.12, char = 0.5) {
  const bag = new Bag();
  const body = new THREE.SphereGeometry(scale, det[0], det[1]);
  body.scale(1.5, 0.5, 0.6);
  const pos = body.attributes.position, col = new Float32Array(pos.count * 3);
  const base = new THREE.Color(0xc87432), belly = new THREE.Color(0xe6b878), burn = new THREE.Color(0x3c1e0e), c = new THREE.Color();
  const len = scale * 1.5;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // taper toward the tail so the silhouette is a fish, not a lozenge
    const t = (x / len + 1) / 2;
    const k = 0.62 + 0.38 * Math.min(1, t * 1.6);
    pos.setY(i, y * k); pos.setZ(i, pos.getZ(i) * k);
    c.copy(base).lerp(belly, Math.max(0, -y / (scale * 0.5)) * 0.8);
    const stripe = Math.sin(x / scale * 9.5) > 0.6 && y > -scale * 0.05;
    if (stripe) c.lerp(burn, 0.35 + 0.5 * char);
    if (t > 0.92) c.lerp(burn, 0.3 * char); // charred head edge: x > 0.84 len
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3));
  body.computeVertexNormals();
  bag.add(body, { keep: true });
  const s = scale / 0.12;
  // fan tail (apex at the body, flat), dorsal and pectoral fins
  bag.add(new THREE.ConeGeometry(0.085 * s, 0.15 * s, 4), { x: -0.205 * s, rz: -Math.PI / 2, sz: 0.28, color: 0xa8582a });
  if (det !== FISH_DETAIL.far) {
    bag.add(new THREE.ConeGeometry(0.05 * s, 0.14 * s, 3), { x: -0.02 * s, y: 0.075 * s, rz: -Math.PI / 2, sz: 0.2, color: 0xa8582a });
    bag.add(new THREE.ConeGeometry(0.035 * s, 0.07 * s, 3), { x: 0.06 * s, y: -0.01 * s, z: 0.062 * s, rx: 0.5, rz: Math.PI / 2, sz: 0.25, color: 0xa8582a });
    bag.add(new THREE.ConeGeometry(0.035 * s, 0.07 * s, 3), { x: 0.06 * s, y: -0.01 * s, z: -0.062 * s, rx: -0.5, rz: Math.PI / 2, sz: 0.25, color: 0xa8582a });
    for (const sz of [-1, 1]) bag.sphere(0.011 * s, { x: 0.13 * s, y: 0.02 * s, z: sz * 0.044 * s, color: 0xfff2d8 }).sphere(0.0065 * s, { x: 0.137 * s, y: 0.021 * s, z: sz * 0.051 * s, color: 0x1a0e08 });
  }
  return bag.geometry();
}

/** Platter lathe for the tea house bream (profile: foot, floor, raised rim). */
export function platterGeometry(det = FISH_DETAIL.mid) {
  const seg = det === FISH_DETAIL.far ? 10 : det === FISH_DETAIL.mid ? 20 : 32;
  const pts = [[0, 0], [0.19, 0], [0.22, 0.004], [0.245, 0.026], [0.25, 0.034], [0.235, 0.03], [0.2, 0.012], [0, 0.012]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, seg);
  return g;
}

/** A sudachi wedge and a mound of grated daikon, vertex-coloured, resting on the platter. */
export function garnishGeometry(det = FISH_DETAIL.mid) {
  const bag = new Bag();
  bag.add(new THREE.SphereGeometry(0.045, det[0] > 10 ? 10 : 6, det[0] > 10 ? 6 : 4, 0, TAU, 0, Math.PI / 2), { x: -0.14, y: 0.014, z: 0.12, sy: 0.7, color: 0xf2f0ea });
  bag.add(new THREE.SphereGeometry(0.035, det[0] > 10 ? 10 : 6, det[0] > 10 ? 6 : 4, 0, Math.PI), { x: 0.12, y: 0.03, z: 0.13, rz: Math.PI / 2, ry: 0.4, color: 0x8fb04a });
  return bag.geometry();
}

