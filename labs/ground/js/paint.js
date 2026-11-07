// The painted layers: seven 256 px tiles painted at load time with ragged
// Canvas2D dabs, big shapes first and grit last (Kazuo Oga's order), each with
// its height in alpha. Packed into two DataArrayTextures: albedo + height, and
// slope (RG) + cavity (B) for the normals. Every dab wraps, so tiles repeat.
import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { groundTextures } from '../../shared/game.js';

const N = 256;

// world metres per tile, and how hard the height reads as relief
export const LAYERS = [
  { id: 'earth', jp: '真砂土', name: 'Masa-do earth', tile: 1.7, relief: 1.6, rough: 0.92, porosity: 0.85 },
  { id: 'meadow', jp: '草の根', name: 'Meadow floor (the game’s)', tile: 3.2, relief: 1.2, rough: 0.95, porosity: 0.7 },
  { id: 'moss', jp: '杉苔', name: 'Sugigoke moss', tile: 1.1, relief: 0.9, rough: 0.97, porosity: 0.95 },
  { id: 'gravel', jp: '玉砂利', name: 'Tamajari gravel', tile: 0.75, relief: 2.6, rough: 0.8, porosity: 0.3 },
  { id: 'sand', jp: '白川砂', name: 'Shirakawa sand', tile: 0.9, relief: 1.1, rough: 0.9, porosity: 0.6 },
  { id: 'tataki', jp: '三和土', name: 'Tataki rammed earth', tile: 2.2, relief: 0.9, rough: 0.7, porosity: 0.35 },
  { id: 'needles', jp: '敷松葉', name: 'Shikimatsuba pine needles', tile: 0.85, relief: 2.0, rough: 0.9, porosity: 0.5 }
];
export const LAYER = Object.fromEntries(LAYERS.map((l, i) => [l.id, i]));

/* ---------------- a tiny wrapping painter ---------------- */

class Tile {
  constructor(seed, base, hBase) {
    this.rnd = mulberry32(seed);
    this.c = document.createElement('canvas');
    this.c.width = this.c.height = N;
    this.x = this.c.getContext('2d', { willReadFrequently: true });
    this.hc = document.createElement('canvas');
    this.hc.width = this.hc.height = N;
    this.h = this.hc.getContext('2d', { willReadFrequently: true });
    this.x.fillStyle = base; this.x.fillRect(0, 0, N, N);
    const g = Math.round(hBase * 255);
    this.h.fillStyle = `rgb(${g},${g},${g})`; this.h.fillRect(0, 0, N, N);
  }
  r(a = 0, b = 1) { return a + (b - a) * this.rnd(); }
  pick(list) { return list[Math.floor(this.rnd() * list.length)]; }
  // a ragged blob: a jittered polygon, drawn at every wrap offset it touches
  blob(ctx, x, y, rx, ry, rot, fill, alpha, rag = 0.22, verts = 11) {
    const pts = [];
    for (let i = 0; i < verts; i++) {
      const a = (i / verts) * Math.PI * 2, k = 1 + (this.rnd() - 0.5) * 2 * rag;
      const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
      pts.push([px * Math.cos(rot) - py * Math.sin(rot), px * Math.sin(rot) + py * Math.cos(rot)]);
    }
    const R = Math.max(rx, ry) * (1 + rag);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      if (x + ox + R < 0 || x + ox - R > N || y + oy + R < 0 || y + oy - R > N) continue;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + ox + px, y + oy + py) : ctx.moveTo(x + ox + px, y + oy + py)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // a radial-gradient dome (pebbles, moss cushions): colour on the albedo,
  // height on the height canvas
  dome(x, y, rx, ry, rot, c0, c1, h0, h1, rag = 0.12) {
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const cx = x + ox, cy = y + oy, R = Math.max(rx, ry) * 1.3;
      if (cx + R < 0 || cx - R > N || cy + R < 0 || cy - R > N) continue;
      for (const [ctx, a, b] of [[this.x, c0, c1], [this.h, h0, h1]]) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(-rx * 0.28, -rx * 0.3, rx * 0.05, 0, 0, rx);
        g.addColorStop(0, b); g.addColorStop(1, a);
        ctx.fillStyle = g;
        ctx.beginPath();
        const v = 12;
        for (let i = 0; i < v; i++) {
          const an = (i / v) * Math.PI * 2, k = 1 + (Math.sin(an * 3 + x) * 0.5) * rag;
          const px = Math.cos(an) * rx * k, py = Math.sin(an) * rx * k;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
  stroke(x, y, len, w, ang, col, hcol, alpha = 1) {
    const dx = Math.cos(ang) * len * 0.5, dy = Math.sin(ang) * len * 0.5;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      if (x + ox + len < 0 || x + ox - len > N || y + oy + len < 0 || y + oy - len > N) continue;
      for (const [ctx, c] of [[this.x, col], [this.h, hcol]]) {
        if (!c) continue;
        ctx.globalAlpha = alpha; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + ox - dx, y + oy - dy);
        ctx.quadraticCurveTo(x + ox + dy * 0.12, y + oy - dx * 0.12, x + ox + dx, y + oy + dy);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }
  speck(n, cols, hv, size = [0.6, 1.6], alpha = [0.5, 1]) {
    for (let i = 0; i < n; i++) {
      const x = this.r(0, N), y = this.r(0, N), s = this.r(size[0], size[1]);
      this.blob(this.x, x, y, s, s * this.r(0.6, 1), this.r(0, 6.3), this.pick(cols), this.r(alpha[0], alpha[1]), 0.3, 6);
      if (hv !== null) this.blob(this.h, x, y, s, s, 0, hv, 0.7, 0.3, 6);
    }
  }
  wash(n, cols, rad, alpha, hcols = null) {
    for (let i = 0; i < n; i++) {
      const x = this.r(0, N), y = this.r(0, N), rx = this.r(rad[0], rad[1]), ry = rx * this.r(0.5, 1), rot = this.r(0, 6.3);
      this.blob(this.x, x, y, rx, ry, rot, this.pick(cols), this.r(alpha[0], alpha[1]), 0.3, 13);
      if (hcols) this.blob(this.h, x, y, rx, ry, rot, this.pick(hcols), this.r(alpha[0], alpha[1]) * 0.8, 0.3, 13);
    }
  }
  grey(v) { const g = Math.round(v * 255); return `rgb(${g},${g},${g})`; }
}

/* ---------------- the seven recipes ---------------- */

function earth() {
  // decomposed granite: warm ochre crust, quartz and feldspar grit, biotite flecks
  const t = new Tile(11, '#ae9878', 0.42);
  t.wash(26, ['#a48f70', '#c8b797', '#ad9675', '#b9a07c'], [26, 64], [0.18, 0.4], [t.grey(0.34), t.grey(0.5)]);
  t.wash(90, ['#97826a', '#cbbb9c', '#a89072', '#d3c3a2'], [5, 14], [0.18, 0.42], [t.grey(0.36), t.grey(0.48)]);
  for (let i = 0; i < 70; i++) { // small stones bedded in the crust
    const x = t.r(0, N), y = t.r(0, N), r = t.r(1.6, 4.2);
    const c = t.pick([['#7d766c', '#c9c2b4'], ['#8c7b66', '#d8cdb8'], ['#6b6560', '#b4aea4']]);
    t.dome(x, y, r, r * t.r(0.6, 0.9), t.r(0, 6), c[0], c[1], t.grey(0.55), t.grey(0.82));
  }
  t.speck(2600, ['#e9e3d4', '#d9cdb5', '#efe7d6', '#c9b89a'], t.grey(0.56), [0.5, 1.2], [0.45, 0.9]);
  t.speck(700, ['#3f362e', '#5a4b3c'], t.grey(0.38), [0.4, 0.9], [0.4, 0.8]);
  t.speck(220, ['#f6f0dc'], null, [0.3, 0.6], [0.8, 1]); // mica glints
  return t;
}

function meadow() {
  // the game's own meadow floor (groundTextures(6)), so the lab's ground under
  // the grass is the valley's; height from luminance
  const t = new Tile(13, '#55703c', 0.45);
  const img = groundTextures(6).map.image;
  t.x.drawImage(img, 0, 0, N, N);
  // under the blades the floor is thatch and shade, darker and less green than the blades
  t.x.globalCompositeOperation = 'multiply'; t.x.fillStyle = '#a3a585'; t.x.fillRect(0, 0, N, N); t.x.globalCompositeOperation = 'source-over';
  const d = t.x.getImageData(0, 0, N, N), hd = t.h.createImageData(N, N);
  for (let i = 0; i < N * N * 4; i += 4) {
    const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255;
    const v = Math.max(0, Math.min(255, Math.round(((l - 0.42) * 0.9 + 0.3) * 255)));   // thatch sits low
    hd.data[i] = hd.data[i + 1] = hd.data[i + 2] = v; hd.data[i + 3] = 255;
  }
  t.h.putImageData(hd, 0, 0);
  t.wash(30, ['#4a5f30', '#6a7a3c', '#7a6a44'], [8, 24], [0.08, 0.2]);
  return t;
}

function moss() {
  // sugigoke cushions: dark gaps, rounded crowns, yellow-green sunlit tips
  const t = new Tile(17, '#2f4a1f', 0.25);
  t.wash(16, ['#3d5a25', '#2a4019', '#46622a'], [30, 70], [0.3, 0.6]);
  for (let i = 0; i < 900; i++) {
    const x = t.r(0, N), y = t.r(0, N), r = t.r(3, 7.5);
    const c = t.pick([['#34522a', '#5f8634'], ['#3a5a26', '#6f963a'], ['#30491f', '#557d2e'], ['#405e2a', '#7e9c40']]);
    t.dome(x, y, r, r * t.r(0.75, 1), t.r(0, 6), c[0], c[1], t.grey(0.45), t.grey(t.r(0.6, 0.75)), 0.3);
  }
  for (let i = 0; i < 1800; i++) t.stroke(t.r(0, N), t.r(0, N), t.r(2, 5), t.r(0.6, 1.1), t.r(0, 6.3), t.pick(['#6f9a3a', '#8cab48', '#4f7a2c', '#a4b85a']), t.grey(t.r(0.6, 0.8)), t.r(0.4, 0.8));
  t.speck(2400, ['#a9bc52', '#c3cc66', '#8fae42', '#d2d27a'], t.grey(0.72), [0.4, 1.0], [0.3, 0.7]);
  t.speck(500, ['#1d3214', '#263c18'], t.grey(0.2), [0.5, 1.2], [0.5, 0.9]);
  return t;
}

function gravel() {
  // tamajari: rounded pebbles 1–3 cm, greys with a few warm and white ones
  const t = new Tile(19, '#4e4943', 0.12);
  const pal = [['#7e7a74', '#c6c1b8'], ['#8a857c', '#d4cfc4'], ['#6c6863', '#b2ada4'], ['#8e7f6c', '#d0c2ac'], ['#9c9a96', '#ecebe6'], ['#5b5856', '#9e9a96']];
  for (let pass = 0; pass < 2; pass++) {
    const step = pass ? 9 : 12;
    for (let gy = 0; gy < N; gy += step) for (let gx = 0; gx < N; gx += step) {
      const x = gx + t.r(-step, step) * 0.5, y = gy + t.r(-step, step) * 0.5, r = t.r(3.2, 6.4) * (pass ? 0.85 : 1);
      const c = t.pick(pal);
      t.dome(x, y, r, r * t.r(0.62, 0.95), t.r(0, 6.3), c[0], c[1], t.grey(0.3), t.grey(t.r(0.8, 1)), 0.1);
    }
  }
  t.speck(500, ['#3b3632', '#2e2a27'], null, [0.6, 1.4], [0.4, 0.8]);
  return t;
}

function sand() {
  // Shirakawa-suna: weathered granite grit, white-grey with black biotite and
  // a blush of pink feldspar; mica makes it darken when wet (see the shader)
  const t = new Tile(23, '#d5d0c4', 0.5);
  t.wash(30, ['#cbc5b8', '#ddd8cd', '#d2c8bb'], [12, 40], [0.25, 0.5], [t.grey(0.46), t.grey(0.54)]);
  t.speck(5200, ['#efece4', '#f6f3ec', '#e2dccf'], t.grey(0.6), [0.4, 1.0], [0.5, 1]);
  t.speck(2200, ['#a7a198', '#b9b2a6', '#9c958c'], t.grey(0.45), [0.4, 0.9], [0.5, 1]);
  t.speck(900, ['#d9c3b4', '#cfb3a3', '#e0cbbd'], t.grey(0.55), [0.5, 1.1], [0.5, 0.9]);
  t.speck(1300, ['#3e3a37', '#2f2c2a', '#57514b'], t.grey(0.42), [0.3, 0.8], [0.6, 1]);
  return t;
}

function tataki() {
  // red earth + slaked lime + nigari, rammed smooth: trowel arcs, lime flecks,
  // a fine crazing of cracks
  const t = new Tile(29, '#8e6a4f', 0.55);
  t.wash(24, ['#97735a', '#83624a', '#a07e63', '#8a6c55'], [30, 80], [0.25, 0.5], [t.grey(0.52), t.grey(0.58)]);
  for (let i = 0; i < 70; i++) {
    const x = t.r(0, N), y = t.r(0, N), len = t.r(30, 90), a = t.r(0, 6.3);
    t.stroke(x, y, len, t.r(2, 6), a, t.pick(['#b6957a', '#8f6b4d', '#c2a385']), t.grey(t.r(0.5, 0.62)), t.r(0.1, 0.25));
  }
  t.speck(900, ['#d8ccb6', '#e4dac6', '#cbbba0'], t.grey(0.58), [0.4, 1.3], [0.35, 0.8]);
  // cracks: random walks
  for (let i = 0; i < 26; i++) {
    let x = t.r(0, N), y = t.r(0, N), a = t.r(0, 6.3);
    for (let k = 0; k < 14; k++) {
      const l = t.r(4, 11);
      t.stroke(x, y, l, 0.7, a, '#5b4232', t.grey(0.3), 0.55);
      x += Math.cos(a) * l; y += Math.sin(a) * l; a += t.r(-0.7, 0.7);
    }
  }
  return t;
}

function needles() {
  // shikimatsuba: dry pine needles laid neatly over the moss for winter,
  // combed roughly one way
  const t = new Tile(31, '#4f3c29', 0.2);
  t.wash(20, ['#5a4530', '#3f2f20', '#6a5236'], [20, 50], [0.3, 0.6]);
  for (let i = 0; i < 2600; i++) {
    const x = t.r(0, N), y = t.r(0, N), a = 0.5 + t.r(-0.45, 0.45) + (t.rnd() < 0.12 ? 1.57 : 0);
    t.stroke(x, y, t.r(9, 20), t.r(0.7, 1.4), a, t.pick(['#a47b48', '#c49a5c', '#8a6538', '#d6b27a', '#b88a52', '#7a5a34']), t.grey(t.r(0.45, 0.95)), t.r(0.7, 1));
  }
  return t;
}

/* ---------------- pack ---------------- */

export function paintLayers() {
  const t0 = performance.now();
  const tiles = [earth(), meadow(), moss(), gravel(), sand(), tataki(), needles()];
  const L = tiles.length, S = N * N;
  const alb = new Uint8Array(S * 4 * L), nor = new Uint8Array(S * 4 * L);
  const previews = [];
  tiles.forEach((t, li) => {
    const a = t.x.getImageData(0, 0, N, N).data, h = t.h.getImageData(0, 0, N, N).data;
    const hf = new Float32Array(S);
    for (let i = 0; i < S; i++) hf[i] = h[i * 4] / 255;
    // a soft copy for cavity (height minus its neighbourhood)
    const blur = new Float32Array(S);
    const R = 3;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let k = -R; k <= R; k++) s += hf[y * N + ((x + k + N) % N)] + hf[((y + k + N) % N) * N + x];
      blur[y * N + x] = s / (4 * R + 2);
    }
    const relief = LAYERS[li].relief;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, o = li * S * 4 + i * 4;
      alb[o] = a[i * 4]; alb[o + 1] = a[i * 4 + 1]; alb[o + 2] = a[i * 4 + 2];
      alb[o + 3] = h[i * 4];
      const dx = (hf[y * N + ((x + 1) % N)] - hf[y * N + ((x - 1 + N) % N)]) * relief * 4;
      const dy = (hf[((y + 1) % N) * N + x] - hf[((y - 1 + N) % N) * N + x]) * relief * 4;
      nor[o] = Math.max(0, Math.min(255, Math.round((0.5 - dx * 0.5) * 255)));
      nor[o + 1] = Math.max(0, Math.min(255, Math.round((0.5 - dy * 0.5) * 255)));
      nor[o + 2] = Math.max(0, Math.min(255, Math.round((0.5 + (hf[i] - blur[i]) * 3) * 255)));
      nor[o + 3] = 255;
    }
    previews.push(t.c);
  });
  const mk = (data, srgb) => {
    const tex = new THREE.DataArrayTexture(data, N, N, L);
    tex.format = THREE.RGBAFormat;
    tex.type = THREE.UnsignedByteType;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  return { alb: mk(alb, true), nor: mk(nor, false), previews, ms: performance.now() - t0 };
}

/** A soft paper tooth for the painted finish (repeating 256 px). */
export function paperTexture() {
  const t = new Tile(41, '#808080', 0.5);
  t.wash(300, ['#7a7a7a', '#868686', '#747474', '#8c8c8c'], [2, 9], [0.2, 0.5]);
  for (let i = 0; i < 900; i++) t.stroke(t.r(0, N), t.r(0, N), t.r(4, 14), 0.6, t.r(0, 6.3), t.pick(['#6c6c6c', '#949494']), null, 0.35);
  const tex = new THREE.CanvasTexture(t.c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
