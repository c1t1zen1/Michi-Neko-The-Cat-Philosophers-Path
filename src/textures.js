import * as THREE from 'three';

/**
 * Procedural material library.
 *
 * Every surface in the valley is painted at load time onto small canvases:
 * albedo maps plus tangent-space normal maps derived from the same height
 * field, so plaster, timber, roof tiles, stone, tatami and shoji all catch
 * light with real relief instead of reading as flat coloured boxes. All
 * generators are deterministic (seeded hash noise) so the world looks the
 * same on every load.
 */

// ---------------------------------------------------------------------------
// Noise helpers
// ---------------------------------------------------------------------------

function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

/** Tileable value noise on a `period` lattice. */
function valueNoise(x, y, period, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const p = period;
  const a = hash2(((xi % p) + p) % p, ((yi % p) + p) % p, seed);
  const b = hash2((((xi + 1) % p) + p) % p, ((yi % p) + p) % p, seed);
  const c = hash2(((xi % p) + p) % p, (((yi + 1) % p) + p) % p, seed);
  const d = hash2((((xi + 1) % p) + p) % p, (((yi + 1) % p) + p) % p, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Tileable fractal noise in [0,1]. `scale` = lattice cells across the tile. */
export function fbm(u, v, scale, octaves = 4, seed = 0, gain = 0.5) {
  let amp = 1, sum = 0, norm = 0, freq = scale;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(u * freq, v * freq, freq, seed + o * 17) * amp;
    norm += amp;
    amp *= gain;
    freq *= 2;
  }
  return sum / norm;
}

/** Non-tiling 2D fractal noise for world-space placement (terrain, clumping). */
export function worldNoise(x, z, scale = 0.05, octaves = 4, seed = 0) {
  let amp = 1, sum = 0, norm = 0, f = scale;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * f + 1000, z * f + 1000, 1 << 20, seed + o * 31) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------
// Canvas / texture plumbing
// ---------------------------------------------------------------------------

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function finishTexture(canvas, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  return tex;
}

/** Write an RGB float field (0..1) into a canvas. */
function fieldToCanvas(size, rgbFn) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const out = [0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rgbFn(x, y, out);
      const i = (y * size + x) * 4;
      d[i] = Math.max(0, Math.min(255, out[0] * 255)) | 0;
      d[i + 1] = Math.max(0, Math.min(255, out[1] * 255)) | 0;
      d[i + 2] = Math.max(0, Math.min(255, out[2] * 255)) | 0;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Tangent-space normal map from a tiling height field (Float32Array, size²).
 * Uses three.js' +Y-up convention with canvas flipY, so bumps read as bumps.
 */
function heightToNormal(height, size, strength = 2.0, repeat = [1, 1]) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const yp = (y + 1) % size, ym = (y - 1 + size) % size;
    for (let x = 0; x < size; x++) {
      const xp = (x + 1) % size, xm = (x - 1 + size) % size;
      const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
      const dy = (height[yp * size + x] - height[ym * size + x]) * strength;
      let nx = -dx, ny = dy, nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finishTexture(canvas, { repeat, srgb: false });
}

function hexToRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

function mix3(a, b, t, out) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

// ---------------------------------------------------------------------------
// Surface generators. Each returns { map, normalMap, [roughnessMap], [emissiveMap] }
// ---------------------------------------------------------------------------

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

/** Lime plaster: soft mottling, hairline cracks, a grime band along the sill. */
export function plasterTextures(tint = 0xefe6d2, seed = 1) {
  return cached('plaster' + tint + seed, () => {
    const size = 256;
    const base = hexToRgb(tint);
    const height = new Float32Array(size * size);
    const cracks = new Float32Array(size * size);
    // Hairline cracks drawn as thin strokes on a helper canvas
    const cc = makeCanvas(size);
    const cctx = cc.getContext('2d');
    cctx.fillStyle = '#000';
    cctx.fillRect(0, 0, size, size);
    cctx.strokeStyle = '#fff';
    cctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x = hash2(i, 3, seed) * size, y = hash2(i, 7, seed) * size;
      cctx.beginPath();
      cctx.moveTo(x, y);
      cctx.bezierCurveTo(x + 20 - hash2(i, 9, seed) * 40, y + 30, x - 10 + hash2(i, 11, seed) * 30, y + 60, x + (hash2(i, 13, seed) - 0.5) * 50, y + 90 + hash2(i, 15, seed) * 40);
      cctx.stroke();
    }
    const cd = cctx.getImageData(0, 0, size, size).data;
    for (let i = 0; i < size * size; i++) cracks[i] = cd[i * 4] / 255;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const n = fbm(u, v, 6, 5, seed);
        const fine = fbm(u, v, 48, 2, seed + 5);
        height[y * size + x] = n * 0.7 + fine * 0.3 - cracks[y * size + x] * 0.25;
      }
    }
    const out = [0, 0, 0];
    const dark = [base[0] * 0.8, base[1] * 0.76, base[2] * 0.7];
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const i = y * size + x;
      const u = x / size, v = 1 - y / size; // v up
      const n = fbm(u, 1 - v, 6, 5, seed);
      const fine = fbm(u, 1 - v, 48, 2, seed + 5);
      const shade = 0.9 + n * 0.16 + (fine - 0.5) * 0.08;
      mix3(base, dark, Math.max(0, 0.22 - v) * 2.2, out); // grime near the sill
      o[0] = out[0] * shade; o[1] = out[1] * shade; o[2] = out[2] * shade;
      const crack = cracks[i] * 0.12;
      o[0] *= 1 - crack; o[1] *= 1 - crack; o[2] *= 1 - crack * 1.1;
    });
    return {
      map: finishTexture(canvas, { repeat: [1, 1] }),
      normalMap: heightToNormal(height, size, 1.4)
    };
  });
}

/** Timber with grain running along V (tall posts read correctly). */
export function woodTextures(base = 0x6b4a2e, dark = 0x3a2416, seed = 2) {
  return cached('wood' + base + dark + seed, () => {
    const size = 256;
    const b = hexToRgb(base), d = hexToRgb(dark);
    const height = new Float32Array(size * size);
    const out = [0, 0, 0];
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const warp = fbm(u, v, 3, 3, seed) * 2.2 + fbm(u, v, 12, 2, seed + 3) * 0.35;
      const grain = Math.sin((u * 26 + warp) * Math.PI * 2);
      const g = Math.pow(grain * 0.5 + 0.5, 1.6);
      const knots = fbm(u, v, 5, 3, seed + 9);
      const knot = Math.max(0, knots - 0.62) * 3.5;
      const t = Math.min(1, g * 0.75 + knot * 0.6 + fbm(u, v, 64, 2, seed + 4) * 0.18);
      height[y * size + x] = 1 - t;
      mix3(b, d, t, out);
      const sheen = 0.96 + fbm(u, v, 2, 2, seed + 12) * 0.1;
      o[0] = out[0] * sheen; o[1] = out[1] * sheen; o[2] = out[2] * sheen;
    });
    return {
      map: finishTexture(canvas, { repeat: [1, 1] }),
      normalMap: heightToNormal(height, size, 1.2)
    };
  });
}

/** Kawara clay roof tiles: staggered rows of overlapping pan tiles with lipped ends. */
export function kawaraTextures(color = 0x5e6872, seed = 3) {
  return cached('kawara' + color + seed, () => {
    const size = 256;
    const base = hexToRgb(color);
    const rows = 4, cols = 4;
    const tileW = size / cols, tileH = size / rows;
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const row = Math.floor(y / tileH);
        const off = (row & 1) ? tileW / 2 : 0;
        const lx = (((x + off) % tileW) + tileW) % tileW;
        const ly = y - row * tileH;
        // Each tile: a shallow half-cylinder across X, sloping down toward its
        // bottom edge, with a rounded lip (nose) at the bottom.
        const cx = lx / tileW - 0.5;
        const dome = Math.sqrt(Math.max(0, 1 - (cx * 2.15) * (cx * 2.15)));
        const slope = 1 - ly / tileH;
        const lip = smooth(Math.max(0, Math.min(1, (ly / tileH - 0.86) / 0.14)));
        const seam = Math.pow(Math.abs(cx) * 2, 8);
        let h = dome * 0.38 + slope * 0.3 - seam * 0.16 + lip * 0.14;
        h += (fbm(x / size, y / size, 40, 2, seed) - 0.5) * 0.08;
        height[y * size + x] = h;
      }
    }
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const h = height[y * size + x];
      const row = Math.floor(y / tileH);
      const off = (row & 1) ? tileW / 2 : 0;
      const lx = (((x + off) % tileW) + tileW) % tileW;
      const ly = y - row * tileH;
      const cx = lx / tileW - 0.5;
      const edge = Math.pow(Math.abs(cx) * 2, 6);
      const lip = ly / tileH > 0.86 ? 1 : 0;
      const wear = fbm(x / size, y / size, 8, 3, seed + 2);
      let shade = 0.84 + h * 0.26 - edge * 0.16 + (wear - 0.5) * 0.18 + lip * 0.05;
      // Occasional lighter, weathered tiles and a faint moss tint
      const tileId = hash2(Math.floor((x + off) / tileW), row, seed + 5);
      shade *= 0.92 + tileId * 0.2;
      const moss = Math.max(0, fbm(x / size, y / size, 3, 3, seed + 9) - 0.6) * 0.5;
      o[0] = base[0] * shade * (1 - moss * 0.3); o[1] = base[1] * shade * (1 + moss * 0.15); o[2] = base[2] * (shade + 0.03) * (1 - moss * 0.35);
    });
    return {
      map: finishTexture(canvas, { repeat: [3, 3] }),
      normalMap: heightToNormal(height, size, 2.4, [3, 3])
    };
  });
}

/** Shoji screen: rice paper glowing through a dark timber lattice. */
export function shojiTextures(cols = 4, rows = 6) {
  return cached('shoji' + cols + 'x' + rows, () => {
    const size = 256;
    const bar = 0.045;
    const paper = [1.0, 0.94, 0.82];
    const wood = [0.16, 0.1, 0.06];
    const height = new Float32Array(size * size);
    const isBar = (x, y) => {
      const u = x / size, v = y / size;
      const cu = (u * cols) % 1, cv = (v * rows) % 1;
      const onBar = cu < bar || cu > 1 - bar || cv < bar * 1.4 || cv > 1 - bar * 1.4;
      const frame = u < 0.03 || u > 0.97 || v < 0.03 || v > 0.97;
      return onBar || frame;
    };
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const fibre = 0.94 + fbm(u, v, 30, 3, 21) * 0.1;
      if (isBar(x, y)) {
        o[0] = wood[0]; o[1] = wood[1]; o[2] = wood[2];
        height[y * size + x] = 1;
      } else {
        o[0] = paper[0] * fibre; o[1] = paper[1] * fibre; o[2] = paper[2] * fibre;
        height[y * size + x] = 0.2 + fbm(u, v, 30, 2, 22) * 0.1;
      }
    });
    const emissive = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const glow = isBar(x, y) ? 0 : 0.85 + fbm(u, v, 6, 2, 23) * 0.15;
      o[0] = glow; o[1] = glow * 0.86; o[2] = glow * 0.6;
    });
    return {
      map: finishTexture(canvas),
      normalMap: heightToNormal(height, size, 1.6),
      emissiveMap: finishTexture(emissive)
    };
  });
}

/** Woven igusa tatami with a fine horizontal rush weave. */
export function tatamiTextures(color = 0xa9b476) {
  return cached('tatami' + color, () => {
    const size = 256;
    const base = hexToRgb(color);
    const height = new Float32Array(size * size);
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const weave = Math.sin(v * Math.PI * 2 * 64) * 0.5 + 0.5;
      const across = Math.sin(u * Math.PI * 2 * 160 + Math.sin(v * 60) * 0.6) * 0.5 + 0.5;
      const fade = fbm(u, v, 4, 3, 31);
      height[y * size + x] = weave * 0.6 + across * 0.25;
      const shade = 0.82 + weave * 0.16 + across * 0.06 + (fade - 0.5) * 0.14;
      o[0] = base[0] * shade; o[1] = base[1] * shade; o[2] = base[2] * shade;
    });
    return {
      map: finishTexture(canvas, { repeat: [1, 1] }),
      normalMap: heightToNormal(height, size, 0.9)
    };
  });
}

/** River-stone cobbles: a Voronoi pavement with domed, individually tinted stones. */
export function cobbleTextures(seed = 4) {
  return cached('cobble' + seed, () => {
    const size = 256;
    const n = 42;
    const pts = [];
    for (let i = 0; i < n; i++) pts.push([hash2(i, 1, seed), hash2(i, 2, seed)]);
    const height = new Float32Array(size * size);
    const cellId = new Int16Array(size * size);
    const edge = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        let d1 = 9, d2 = 9, id = 0;
        for (let i = 0; i < n; i++) {
          // Toroidal distance for seamless tiling
          let dx = Math.abs(u - pts[i][0]); if (dx > 0.5) dx = 1 - dx;
          let dy = Math.abs(v - pts[i][1]); if (dy > 0.5) dy = 1 - dy;
          const d = Math.sqrt(dx * dx + dy * dy * 1.15);
          if (d < d1) { d2 = d1; d1 = d; id = i; }
          else if (d < d2) d2 = d;
        }
        const gap = d2 - d1; // 0 at the mortar line
        const stone = smooth(Math.max(0, Math.min(1, (gap - 0.005) / 0.028)));
        const dome = stone * (1 - Math.min(1, d1 / 0.15)) * 0.6 + stone * 0.4;
        height[y * size + x] = dome + (fbm(u, v, 40, 2, seed + 8) - 0.5) * 0.08;
        cellId[y * size + x] = id;
        edge[y * size + x] = stone;
      }
    }
    const tones = [[0.80, 0.76, 0.68], [0.73, 0.69, 0.62], [0.84, 0.80, 0.72], [0.68, 0.65, 0.60], [0.88, 0.83, 0.74], [0.76, 0.72, 0.66], [0.70, 0.68, 0.66]];
    const mortar = [0.55, 0.50, 0.42];
    const out = [0, 0, 0];
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const i = y * size + x;
      const id = cellId[i];
      const tone = tones[id % tones.length];
      const stone = edge[i];
      const h = height[i];
      const grit = fbm(x / size, y / size, 32, 3, seed + 11);
      mix3(mortar, tone, stone, out);
      const shade = 0.78 + h * 0.34 + (grit - 0.5) * 0.14;
      o[0] = out[0] * shade; o[1] = out[1] * shade; o[2] = out[2] * shade;
    });
    return {
      map: finishTexture(canvas, { repeat: [1, 1] }),
      normalMap: heightToNormal(height, size, 2.2)
    };
  });
}

/** Weathered granite for lanterns, plinths and boulders. */
export function stoneTextures(color = 0x8d8d86, seed = 5) {
  return cached('stone' + color + seed, () => {
    const size = 256;
    const base = hexToRgb(color);
    const height = new Float32Array(size * size);
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const broad = fbm(u, v, 3, 4, seed);
      const fine = fbm(u, v, 24, 3, seed + 3);
      const speck = hash2(x, y, seed) > 0.93 ? 0.12 : 0;
      const lichen = Math.max(0, fbm(u, v, 5, 3, seed + 7) - 0.58) * 2.2;
      height[y * size + x] = broad * 0.5 + fine * 0.5;
      const shade = 0.8 + (broad - 0.5) * 0.3 + (fine - 0.5) * 0.24 + speck;
      o[0] = base[0] * shade * (1 - lichen * 0.25);
      o[1] = base[1] * shade * (1 - lichen * 0.05);
      o[2] = base[2] * shade * (1 - lichen * 0.35);
    });
    return {
      map: finishTexture(canvas),
      normalMap: heightToNormal(height, size, 1.8)
    };
  });
}

/** Meadow floor: layered moss and grass detail that tiles under the blade instances. */
export function groundTextures(seed = 6) {
  return cached('ground' + seed, () => {
    const size = 512;
    const height = new Float32Array(size * size);
    const moss = [0.30, 0.45, 0.21];
    const grass = [0.45, 0.60, 0.29];
    const light = [0.60, 0.72, 0.36];
    const earth = [0.46, 0.37, 0.24];
    const out = [0, 0, 0];
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const macro = fbm(u, v, 3, 4, seed);
      const clump = fbm(u, v, 12, 3, seed + 2);
      const blades = fbm(u + macro * 0.05, v, 90, 2, seed + 4);
      const bare = Math.max(0, fbm(u, v, 5, 3, seed + 9) - 0.7) * 3;
      height[y * size + x] = clump * 0.5 + blades * 0.5;
      mix3(moss, grass, smooth(clump), out);
      mix3(out, light, Math.max(0, blades - 0.55) * 1.6, out);
      mix3(out, earth, Math.min(1, bare), out);
      const shade = 0.92 + (macro - 0.5) * 0.22;
      o[0] = out[0] * shade; o[1] = out[1] * shade; o[2] = out[2] * shade;
    });
    return {
      map: finishTexture(canvas, { repeat: [40, 40], aniso: 16 }),
      normalMap: heightToNormal(height, size, 1.5, [40, 40])
    };
  });
}

/** Packed earth for path shoulders and paddy bunds. */
export function dirtTextures(seed = 7) {
  return cached('dirt' + seed, () => {
    const size = 256;
    const base = [0.46, 0.36, 0.24];
    const dark = [0.28, 0.21, 0.13];
    const height = new Float32Array(size * size);
    const out = [0, 0, 0];
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const n = fbm(u, v, 6, 4, seed);
      const pebble = Math.max(0, fbm(u, v, 30, 2, seed + 3) - 0.6) * 2.5;
      height[y * size + x] = n * 0.6 + pebble * 0.4;
      mix3(base, dark, n * 0.6, out);
      const shade = 0.9 + pebble * 0.3;
      o[0] = out[0] * shade; o[1] = out[1] * shade; o[2] = out[2] * shade;
    });
    return {
      map: finishTexture(canvas, { repeat: [1, 1] }),
      normalMap: heightToNormal(height, size, 1.6)
    };
  });
}

/** Tree bark: deep vertical fissures, fine cross-grain plating and lichen/moss flecks. */
export function barkTextures(base = 0x6a4b35, dark = 0x2c1b12, seed = 8) {
  return cached('bark' + base + dark + seed, () => {
    const size = 320;
    const b = hexToRgb(base), d = hexToRgb(dark);
    const height = new Float32Array(size * size);
    const out = [0, 0, 0];
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      // Stretch the noise vertically for long fissures
      const fissure = fbm(u, v * 0.18, 10, 4, seed);
      const ridge = Math.pow(Math.abs(Math.sin((u * 18 + fissure * 3.0) * Math.PI)), 0.6);
      // Fine cross-grain plating breaks the ridges into short overlapping
      // plates instead of unbroken vertical lines
      const plate = Math.pow(Math.abs(Math.sin((v * 22 + fbm(u, v, 14, 2, seed + 12) * 2.5) * Math.PI)), 1.4);
      const flake = fbm(u, v, 28, 2, seed + 4);
      const grain = fbm(u, v, 60, 2, seed + 19);
      const h = ridge * 0.58 + plate * ridge * 0.16 + flake * 0.18 + grain * 0.08;
      height[y * size + x] = h;
      mix3(d, b, h, out);
      const lichen = Math.max(0, fbm(u, v, 6, 3, seed + 7) - 0.6) * 2;
      const moss = Math.max(0, fbm(u, v, 4, 3, seed + 31) - 0.68) * 2.4;
      o[0] = out[0] * (1 - lichen * 0.2 - moss * 0.22); o[1] = out[1] * (1 + lichen * 0.15 + moss * 0.28); o[2] = out[2] * (1 - lichen * 0.3 - moss * 0.18);
    });
    return {
      map: finishTexture(canvas, { repeat: [2, 3] }),
      normalMap: heightToNormal(height, size, 2.6, [2, 3])
    };
  });
}

/** Sun-bleached straw for shimenawa rope and thatch. */
export function strawTextures(color = 0xc8a96a) {
  return cached('straw' + color, () => {
    const size = 128;
    const base = hexToRgb(color);
    const height = new Float32Array(size * size);
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const strands = Math.sin((u * 40 + fbm(u, v, 3, 2, 41) * 4) * Math.PI) * 0.5 + 0.5;
      height[y * size + x] = strands;
      const shade = 0.75 + strands * 0.3;
      o[0] = base[0] * shade; o[1] = base[1] * shade; o[2] = base[2] * shade;
    });
    return { map: finishTexture(canvas), normalMap: heightToNormal(height, size, 1.2) };
  });
}

/** Lacquered bronze / gold for bells, keys and finials. */
export function metalTextures(color = 0xc9a24a) {
  return cached('metal' + color, () => {
    const size = 128;
    const base = hexToRgb(color);
    const canvas = fieldToCanvas(size, (x, y, o) => {
      const u = x / size, v = y / size;
      const patina = fbm(u, v, 5, 3, 51);
      const scratch = Math.max(0, fbm(u, v * 0.1, 30, 2, 52) - 0.6) * 1.5;
      const shade = 0.85 + (patina - 0.5) * 0.3 + scratch * 0.2;
      o[0] = base[0] * shade; o[1] = base[1] * shade; o[2] = base[2] * (shade - patina * 0.1);
    });
    const rough = fieldToCanvas(size, (x, y, o) => {
      const r = 0.25 + fbm(x / size, y / size, 6, 3, 53) * 0.35;
      o[0] = r; o[1] = r; o[2] = r;
    });
    return { map: finishTexture(canvas), roughnessMap: finishTexture(rough, { srgb: false }) };
  });
}

/** Soft radial glow sprite (lantern halos, fireflies, sun glare). */
export function glowTexture(r = 255, g = 214, b = 150, size = 64) {
  return cached('glow' + r + '_' + g + '_' + b + '_' + size, () => {
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    grad.addColorStop(0.3, 'rgba(' + r + ',' + g + ',' + b + ',0.55)');
    grad.addColorStop(0.7, 'rgba(' + r + ',' + g + ',' + b + ',0.12)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

// ---------------------------------------------------------------------------
// Material helpers
// ---------------------------------------------------------------------------

/**
 * Build a MeshStandardMaterial from a texture set. `repeat` clones the maps
 * so different meshes can tile the same canvas at different scales.
 */
export function texturedMaterial(set, opts = {}) {
  const {
    color = 0xffffff, roughness = 0.9, metalness = 0, normalScale = 1, repeat = null,
    emissive = 0x000000, emissiveIntensity = 0, side = THREE.FrontSide,
    transparent = false, opacity = 1, envMapIntensity = 1
  } = opts;
  const params = { color, roughness, metalness, side, transparent, opacity, emissive, emissiveIntensity, envMapIntensity };
  const pick = (tex) => {
    if (!tex) return null;
    if (!repeat) return tex;
    const t = tex.clone();
    t.repeat.set(repeat[0], repeat[1]);
    t.needsUpdate = true;
    return t;
  };
  if (set.map) params.map = pick(set.map);
  if (set.normalMap) {
    params.normalMap = pick(set.normalMap);
    params.normalScale = new THREE.Vector2(normalScale, normalScale);
  }
  if (set.roughnessMap) params.roughnessMap = pick(set.roughnessMap);
  if (set.emissiveMap) params.emissiveMap = pick(set.emissiveMap);
  return new THREE.MeshStandardMaterial(params);
}

/**
 * Rescale a BoxGeometry's UVs to world units so tiling textures keep a
 * consistent texel density regardless of box dimensions (BoxGeometry maps
 * each face to 0..1 by default, which stretches textures on long beams).
 */
export function worldScaleBoxUVs(geometry, texelsPerMeter = 1) {
  const p = geometry.parameters;
  if (!p || p.width === undefined) return geometry;
  const uv = geometry.attributes.uv;
  const w = p.width, h = p.height, d = p.depth;
  const ws = (p.widthSegments || 1), hs = (p.heightSegments || 1), ds = (p.depthSegments || 1);
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z. Each face is a grid whose
  // vertex count depends on the segment counts along its two axes.
  const faces = [
    [d, h, (ds + 1) * (hs + 1)], [d, h, (ds + 1) * (hs + 1)],
    [w, d, (ws + 1) * (ds + 1)], [w, d, (ws + 1) * (ds + 1)],
    [w, h, (ws + 1) * (hs + 1)], [w, h, (ws + 1) * (hs + 1)]
  ];
  let idx = 0;
  for (let f = 0; f < 6; f++) {
    const [su, sv, count] = faces[f];
    for (let i = 0; i < count; i++, idx++) {
      uv.setXY(idx, uv.getX(idx) * su * texelsPerMeter, uv.getY(idx) * sv * texelsPerMeter);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}
