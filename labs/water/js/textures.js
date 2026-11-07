// Lab 02 textures, all painted at load time (256 px or smaller, tileable):
// ripple normals for the flow maps, a foam mask, sakura petals, maple leaves
// and a paper grain for the painterly pass.
import * as THREE from 'three';

function rng(seed) {
  return () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();
const once = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

/** Periodic height: a sum of sines with integer wave numbers, so it tiles exactly. */
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
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let s = 0;
    const u = x / size, v = y / size;
    for (const w of W) s += w.a * Math.sin((w.kx * u + w.ky * v) * Math.PI * 2 + w.p);
    h[y * size + x] = s;
  }
  return h;
}

/** Tileable ripple normals (RGB = xyz * 0.5 + 0.5). Two of these drive every flow map. */
export function rippleNormals(size = 256, seed = 7) {
  return once('ripple' + size + seed, () => {
    const h = waveField(size, seed, 46, true);
    const d = new Uint8Array(size * size * 4);
    const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      d[o] = (-dx / l * 0.5 + 0.5) * 255;
      d[o + 1] = (-dy / l * 0.5 + 0.5) * 255;
      d[o + 2] = (1 / l * 0.5 + 0.5) * 255;
      d[o + 3] = 255;
    }
    const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  });
}

/** Tileable foam: R = bubbly cells (periodic Worley), G = soft streaky noise. */
export function foamTexture(size = 256, seed = 3) {
  return once('foam' + size + seed, () => {
    const r = rng(seed), cells = 14;
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
        const I = (ci + ii + cells) % cells, J = (cj + jj + cells) % cells;
        const p = pts[J * cells + I];
        // wrapped distance, so the cells tile across the edges
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
    const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  });
}

function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A five-notched sakura petal: one petal, pale at the base, pink at the notch. */
export function petalTexture() {
  return once('petal', () => canvasTex(64, (g, s) => {
    const grd = g.createLinearGradient(0, s, 0, 0);
    grd.addColorStop(0, '#fff7f8');
    grd.addColorStop(0.6, '#ffd9e2');
    grd.addColorStop(1, '#f6a9bd');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(s * 0.5, s * 0.98);
    g.bezierCurveTo(s * 0.06, s * 0.7, s * 0.08, s * 0.16, s * 0.4, s * 0.06);
    g.lineTo(s * 0.5, s * 0.17);
    g.lineTo(s * 0.6, s * 0.06);
    g.bezierCurveTo(s * 0.92, s * 0.16, s * 0.94, s * 0.7, s * 0.5, s * 0.98);
    g.fill();
    g.strokeStyle = 'rgba(214,120,150,0.35)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(s * 0.5, s * 0.92); g.lineTo(s * 0.5, s * 0.3); g.stroke();
  }));
}

/** A small momiji (seven lobes), red to orange. */
export function mapleTexture() {
  return once('maple', () => canvasTex(64, (g, s) => {
    const c = s / 2;
    g.translate(c, c * 1.08);
    const grd = g.createRadialGradient(0, 0, 2, 0, 0, c);
    grd.addColorStop(0, '#f2a03a');
    grd.addColorStop(1, '#c8321e');
    g.fillStyle = grd;
    g.beginPath();
    const lobes = 7;
    for (let i = 0; i <= lobes * 2; i++) {
      const a = -Math.PI / 2 + (i / (lobes * 2)) * Math.PI * 1.7 - Math.PI * 0.85 + Math.PI / 2;
      const r = i % 2 ? c * 0.38 : c * (0.92 - Math.abs(i - lobes) * 0.06);
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(110,20,10,0.5)';
    g.beginPath(); g.moveTo(0, c * 0.5); g.lineTo(0, 0); g.stroke();
  }));
}

/** Watercolour paper grain for the painterly pass: R = tooth, G = fibre. */
export function paperTexture(size = 256) {
  return once('paper' + size, () => {
    const a = waveField(size, 41, 60, false), b = waveField(size, 77, 24, true);
    const r = rng(9);
    const d = new Uint8Array(size * size * 4);
    let lo = Infinity, hi = -Infinity, lo2 = Infinity, hi2 = -Infinity;
    for (let i = 0; i < a.length; i++) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); lo2 = Math.min(lo2, b[i]); hi2 = Math.max(hi2, b[i]); }
    for (let i = 0; i < size * size; i++) {
      d[i * 4] = ((a[i] - lo) / (hi - lo) * 0.8 + r() * 0.2) * 255;
      d[i * 4 + 1] = ((b[i] - lo2) / (hi2 - lo2)) * 255;
      d[i * 4 + 2] = 128;
      d[i * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  });
}

/** One hanging willow strand: a thin stem with narrow leaves alternating down it. */
export function willowTexture() {
  return once('willow', () => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    const r = rng(23);
    g.strokeStyle = 'rgba(70,86,40,0.9)';
    g.lineWidth = 1.4;
    g.beginPath();
    for (let y = 0; y <= 256; y += 8) g.lineTo(32 + Math.sin(y * 0.05) * 3, y);
    g.stroke();
    for (let y = 6; y < 250; y += 7) {
      const side = (y / 7) % 2 < 1 ? -1 : 1, x = 32 + Math.sin(y * 0.05) * 3;
      const len = 14 + r() * 10 - y * 0.02, ang = side * (0.35 + r() * 0.25) + Math.PI / 2;
      const l = 42 + r() * 18;
      g.fillStyle = `hsl(${78 + r() * 18}, ${40 + r() * 18}%, ${l}%)`;
      g.save();
      g.translate(x, y);
      g.rotate(ang - Math.PI / 2 + side * 0.2);
      g.beginPath();
      g.ellipse(side * len * 0.5, len * 0.35, 2.6, len * 0.55, side * 0.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}
