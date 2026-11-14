// Aze (畦): the earth banks round a paddy, studied on their own for the game's
// `paddy-bunds` (lane v-water, step L4; promoted into src/kit/water/paddies.js).
// The game's ridges are 0.5 m boxes, 0.28 m high. Here the same footprint is
// an earth bank with a rounded crest: the paddy side is plastered smooth and
// dark with wet mud (aze-nuri, the coat that stops leaks), the crest is grass,
// the outer slope earth and grass; the line wanders a few centimetres, and one
// bank has a mizuguchi notch with the seki-ita board that sets the water
// level. One vertex-coloured mesh for every bank; the board is timber.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// value noise (deterministic), enough to make a bank wander
function hash(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const u = f(x - i), v = f(y - j), w = f(z - k);
  const L = (a, b, t) => a + (b - a) * t;
  const a = L(L(hash(i, j, k), hash(i + 1, j, k), u), L(hash(i, j + 1, k), hash(i + 1, j + 1, k), u), v);
  const b = L(L(hash(i, j, k + 1), hash(i + 1, j, k + 1), u), L(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), u), v);
  return L(a, b, w);
}

// cross-section, paddy side first: base 0.5 m, crest 0.28 m (the game ridge's size)
export const AZE_PROFILE = [[-0.25, -0.02], [-0.205, 0.16], [-0.14, 0.25], [-0.06, 0.28], [0.06, 0.28], [0.14, 0.25], [0.205, 0.16], [0.25, -0.02]];
const COL_HEX = { mud: 0x5a4a34, mudWet: 0x3e3226, grass: 0x5b7434, grass2: 0x7a8c42, earth: 0x6e6444 };

/** One bank from A to B ([x, z]) at height y, `out` the unit direction away from the paddy, a notch at `notch` (0..1) or -1. */
export function azeGeometry(A, B, out, { y = 0, seed = 1, step = 0.4, notch = -1, profile = AZE_PROFILE } = {}) {
  const COL = {};
  for (const [k, hex] of Object.entries(COL_HEX)) { const c = new THREE.Color(hex); COL[k] = [c.r, c.g, c.b]; }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const segs = Math.max(1, Math.round(len / step));
  const ax = (B[0] - A[0]) / len, az = (B[1] - A[1]) / len;
  const K = profile.length, pos = [], col = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, d = t * len;
    const wob = (noise(d * 0.6, seed, 0.5) - 0.5) * 0.05;
    const dip = notch >= 0 ? Math.exp(-((((t - notch) * len) / 0.22) ** 2)) * 0.08 : 0;
    for (let j = 0; j < K; j++) {
      const [c, y0] = profile[j];
      const top = y0 > 0.2;
      const lift = (noise(d * 1.7, seed + j * 0.37, 2.1) - 0.5) * 0.035 * Math.max(0, y0) / 0.28;
      const yy = Math.max(-0.02, y0 + lift - (top ? dip : dip * 0.5 * Math.max(0, y0) / 0.28));
      pos.push(A[0] + ax * d + out[0] * (c + wob), y + yy, A[1] + az * d + out[1] * (c + wob));
      uv.push(d, c + 0.25);
      const n = noise(d * 2.3, seed + 7, j * 0.9);
      const rgb = top ? mix(COL.grass, COL.grass2, n)
        : c < 0 ? mix(COL.mudWet, COL.mud, Math.min(1, Math.max(0, y0 / 0.2)) * 0.6 + n * 0.3)
          : mix(COL.earth, COL.grass, n * 0.7);
      col.push(...rgb);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < K - 1; j++) {
    const a = i * K + j, b = a + 1, c = a + K, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  for (const [i, flip] of [[0, true], [segs, false]]) {
    const base = i * K;
    for (let j = 1; j < K - 1; j++) flip ? idx.push(base, base + j, base + j + 1) : idx.push(base, base + j + 1, base + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The banks of every plot ({ x0, z0, x1, z1, floor }, the bank's outer edge),
 * as the game lays them: north and south over the corners, west and east
 * tucked under them. Returns { group, boards: [{ x, z }] }.
 */
export function buildAze(plots, { rw = 0.5, seed = 5, woodMat } = {}) {
  const group = new THREE.Group();
  group.name = 'aze';
  const geos = [], boards = [];
  plots.forEach((p, k) => {
    const h = rw / 2, y = p.floor;
    const sides = [
      [[p.x0, p.z0 + h], [p.x1, p.z0 + h], [0, -1]],
      [[p.x1, p.z1 - h], [p.x0, p.z1 - h], [0, 1]],
      [[p.x0 + h, p.z1 - rw + 0.15], [p.x0 + h, p.z0 + rw - 0.15], [-1, 0]],
      [[p.x1 - h, p.z0 + rw - 0.15], [p.x1 - h, p.z1 - rw + 0.15], [1, 0]]
    ];
    const notchSide = (seed + k) % 4, notchAt = 0.35 + ((seed * 7 + k * 3) % 5) * 0.06;
    sides.forEach(([A, B, out], s) => {
      const notch = s === notchSide ? notchAt : -1;
      geos.push(azeGeometry(A, B, out, { y, seed: seed + k * 31 + s * 13, notch }));
      if (notch >= 0) {
        const len = Math.hypot(B[0] - A[0], B[1] - A[1]), ax = (B[0] - A[0]) / len, az = (B[1] - A[1]) / len;
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.035), woodMat);
        board.position.set(A[0] + ax * notch * len, y + 0.2, A[1] + az * notch * len);
        board.rotation.y = Math.atan2(-az, ax);
        board.castShadow = true;
        group.add(board);
        boards.push({ x: board.position.x, z: board.position.z });
      }
    });
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  for (const g of geos) g.dispose();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'aze banks';
  group.add(mesh);
  return { group, boards };
}
