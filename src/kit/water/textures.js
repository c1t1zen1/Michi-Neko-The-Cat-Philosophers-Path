// Water family textures, painted at load time (128 px, tileable, no
// downloads), promoted from labs/water/js/textures.js: ripple normals for the
// flow maps, a foam mask (bubbly cells + soft streaks) and the ripple-ring
// sprite. One set per KitMaterials (the kit's shared state), built on first
// use and never disposed by an instance, like the lantern washi textures.
//
// The periodic height field is a sum of sines with integer wave numbers, so it
// tiles exactly; sin(A + B) is expanded into per-row and per-column tables,
// which makes a 128 px map a few milliseconds instead of tens.
import * as THREE from 'three';
import { rng } from '../craft.js?v=20261113a';

const cache = new WeakMap();
const noOwner = {};
function once(km, key, make) {
  const owner = km && typeof km === 'object' ? km : noOwner;
  let bag = cache.get(owner);
  if (!bag) { bag = new Map(); cache.set(owner, bag); }
  if (!bag.has(key)) { const t = make(); t.userData.kit = true; bag.set(key, t); }
  return bag.get(key);
}

/** Periodic height (size × size): integer-wavenumber sines; `stretch` elongates crests along x. */
function waveField(size, seed, waves, stretch) {
  const r = rng(seed);
  const W = [];
  for (let i = 0; i < waves; i++) {
    const ang = (r() - 0.5) * Math.PI * (stretch ? 0.9 : 2);
    const k = 2 + Math.floor(Math.pow(r(), 1.6) * 16);
    const kx = Math.round(Math.cos(ang) * k * (stretch ? 0.55 : 1)), ky = Math.round(Math.sin(ang) * k);
    if (!kx && !ky) continue;
    W.push({ kx, ky, a: 1 / Math.pow(Math.hypot(kx, ky), 1.25), p: r() * Math.PI * 2 });
  }
  const h = new Float32Array(size * size);
  const sa = new Float32Array(size), ca = new Float32Array(size), sb = new Float32Array(size), cb = new Float32Array(size);
  const TAU = Math.PI * 2;
  for (const w of W) {
    for (let x = 0; x < size; x++) { const A = w.kx * (x / size) * TAU + w.p; sa[x] = Math.sin(A); ca[x] = Math.cos(A); }
    for (let y = 0; y < size; y++) { const B = w.ky * (y / size) * TAU; sb[y] = Math.sin(B); cb[y] = Math.cos(B); }
    for (let y = 0; y < size; y++) {
      const o = y * size, s = sb[y] * w.a, c = cb[y] * w.a;
      for (let x = 0; x < size; x++) h[o + x] += sa[x] * c + ca[x] * s;
    }
  }
  return h;
}

function dataTexture(data, size, { mips = true, repeat = true } = {}) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.generateMipmaps = mips;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Tileable ripple normals (RGB = xyz * 0.5 + 0.5): the two layers of every flow map. */
export function rippleNormals(km, size = 128, seed = 7) {
  return once(km, 'ripple' + size + ':' + seed, () => {
    const h = waveField(size, seed, 46, true);
    const d = new Uint8Array(size * size * 4);
    const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
    const k = 2.2 * (size / 256); // the lab's slope at 256 px: a pixel here spans two of those
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      d[o] = (-dx / l * 0.5 + 0.5) * 255;
      d[o + 1] = (-dy / l * 0.5 + 0.5) * 255;
      d[o + 2] = (1 / l * 0.5 + 0.5) * 255;
      d[o + 3] = 255;
    }
    return dataTexture(d, size);
  });
}

/** Tileable foam: R = bubbly cells (periodic Worley edges), G = soft streaky noise, B = cell distance. */
export function foamTexture(km, size = 128, seed = 3) {
  return once(km, 'foam' + size + ':' + seed, () => {
    const r = rng(seed), cells = 10;
    const pts = [];
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push([(i + r()) / cells, (j + r()) / cells]);
    const soft = waveField(size, seed + 5, 30, true);
    let lo = Infinity, hi = -Infinity;
    for (const v of soft) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const d = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const ci = Math.floor(u * cells), cj = Math.floor(v * cells);
      let d1 = 9, d2 = 9;
      for (let jj = -1; jj <= 1; jj++) for (let ii = -1; ii <= 1; ii++) {
        const p = pts[((cj + jj + cells) % cells) * cells + ((ci + ii + cells) % cells)];
        let dx = p[0] - u, dy = p[1] - v;
        dx -= Math.round(dx); dy -= Math.round(dy);
        const dd = Math.hypot(dx, dy) * cells;
        if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
      }
      const o = (y * size + x) * 4;
      d[o] = Math.min(255, Math.max(0, (1 - Math.min(1, (d2 - d1) * 2.6)) * 255));
      d[o + 1] = ((soft[y * size + x] - lo) / (hi - lo)) * 255;
      d[o + 2] = Math.min(255, d1 * 180);
      d[o + 3] = 255;
    }
    return dataTexture(d, size);
  });
}

/**
 * The ripple-ring sprite (white, alpha profile): a sharp crest at the rim, a
 * softer echo inside it and a faint dimple at the centre, so one ring reads as
 * a travelling wave train rather than a flat annulus. Outer radius = 1 in the
 * mesh's units, as the classic RingGeometry(0.68, 1).
 */
export function ringTexture(km, size = 64) {
  return once(km, 'ring' + size, () => {
    const d = new Uint8Array(size * size * 4);
    const g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
      const r = Math.hypot(u, v);
      let a = g(r, 0.9, 0.055) * 0.95 + g(r, 0.76, 0.05) * 0.38 + g(r, 0.6, 0.06) * 0.16;
      a *= r < 1 ? 1 - Math.pow(Math.max(0, r - 0.94) / 0.06, 2) : 0;
      const o = (y * size + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = 255;
      d[o + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
    }
    return dataTexture(d, size, { repeat: false });
  });
}
