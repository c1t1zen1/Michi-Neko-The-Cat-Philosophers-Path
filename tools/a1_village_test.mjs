// Unit tests for the a1-village changes (Phase 7, BUILD_GUIDE_FABLE §14; rulings R66, R50).
//
//   node --test tools/a1_village_test.mjs        (run by tools/verify.mjs, step 5)
//
// Node has no `three` package, so `three` is a stand-in here: a Proxy that
// answers every member (as cadJS/tests/kit.test.mjs does). Everything tested
// below is plain arithmetic that only touches three to wrap its result.
//   - the cloud field (src/kit/sky/field.js): byte for byte the original
//     per-texel generator (its oracle is below) and a frozen hash on the
//     game's seeds;
//   - the pool caustics (src/kit/hidden/pool.js causticPixels): byte for
//     byte the original nine-copy search (oracle below);
//   - lampUpdate (src/kit/lanterns/light.js): 'lantern.kindle' only on the
//     rising edge, never on the first update, once per dusk;
//   - the runtime's side-by-side family imports (src/kit/runtime.js,
//     handoff §2a): registry order, first-registered rule and warnings as
//     before, whatever order the imports finish in.
// The fence bake (needs the real three) and the sound sink's gating and
// 0.15 s kindle throttle (needs the game) are in tools/a1_village_browser_test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { currentTag } from './kit_index.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TAG = currentTag(ROOT);

const threeStub = `class S { constructor() { return new Proxy(this, { get: (t, k) => k in t ? t[k] : k === 'then' ? undefined : () => t }); } }
const P = new Proxy({}, { get: (t, k) => k === 'then' ? undefined : k === 'REVISION' ? '160' : S });
export default P;
export const DataTexture = S, CanvasTexture = S, Vector2 = S, Vector3 = S, Vector4 = S, Color = S, Matrix3 = S, Matrix4 = S, Quaternion = S, Euler = S,
  Object3D = S, Group = S, Mesh = S, Sprite = S, BufferGeometry = S, BufferAttribute = S, Float32BufferAttribute = S, InstancedMesh = S,
  MeshStandardMaterial = S, MeshBasicMaterial = S, MeshPhysicalMaterial = S, MeshLambertMaterial = S, ShaderMaterial = S, SpriteMaterial = S, PointsMaterial = S,
  Points = S, PlaneGeometry = S, BoxGeometry = S, SphereGeometry = S, CylinderGeometry = S, ConeGeometry = S, TorusGeometry = S, LatheGeometry = S, CircleGeometry = S,
  RingGeometry = S, DataArrayTexture = S, Box3 = S, Sphere = S, Plane = S, Ray = S, Line3 = S, Triangle = S, Frustum = S, Clock = S,
  TubeGeometry = S, CatmullRomCurve3 = S, ExtrudeGeometry = S, Shape = S, Path = S, IcosahedronGeometry = S, OctahedronGeometry = S, DodecahedronGeometry = S,
  TetrahedronGeometry = S, EdgesGeometry = S, InstancedBufferAttribute = S, InstancedBufferGeometry = S, Float16BufferAttribute = S, Uint16BufferAttribute = S,
  Uint32BufferAttribute = S, Texture = S, Material = S, Scene = S, Camera = S, PerspectiveCamera = S, Light = S, PointLight = S, SpotLight = S, Raycaster = S,
  Spherical = S, Cylindrical = S, Matrix2 = S, Interpolant = S, Curve = S, CurvePath = S, LineSegments = S, Line = S, LineBasicMaterial = S, ShapeGeometry = S,
  WebGLRenderTarget = S, ShaderChunk = {}, DataUtils = { toHalfFloat: (v) => v }, MathUtils = { clamp: (v, a, b) => Math.min(b, Math.max(a, v)) };
export const RGBAFormat = 1023, RedFormat = 1028, UnsignedByteType = 1009, HalfFloatType = 1016, RepeatWrapping = 1000, ClampToEdgeWrapping = 1001,
  LinearFilter = 1006, LinearMipmapLinearFilter = 1008, NoColorSpace = '', SRGBColorSpace = 'srgb', FrontSide = 0, BackSide = 1, DoubleSide = 2,
  AdditiveBlending = 2, CustomBlending = 5, SrcAlphaFactor = 204, OneMinusSrcAlphaFactor = 205, ZeroFactor = 200, OneFactor = 201, REVISION = '160';`;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') return { url: 'data:text/javascript,' + encodeURIComponent(threeStub), shortCircuit: true };
    if (specifier.startsWith('three/addons/')) return { url: 'data:text/javascript,' + encodeURIComponent('export const mergeGeometries = () => null, mergeVertices = () => null; export class RoundedBoxGeometry {}'), shortCircuit: true };
    return next(specifier, context);
  }
});
const kit = (path) => import(`../src/kit/${path}.js?v=${TAG}`);

/* ----------------------------------------------------------- cloud field --- */

// The cloud field as it was before a1-village (src/kit/sky/field.js at 98c3a61),
// kept here as the oracle: per-texel hashing, modulo wraps, Math.hypot cells.
function cloudFieldOracle(seed) {
  const smooth = (x) => x * x * (3 - 2 * x);
  function hash3(x, y, z, s) {
    let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x1b873593) ^ s;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, y, cells, cellsY, s, z = 0) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = smooth(x - ix), fy = smooth(y - iy);
    const x0 = ((ix % cells) + cells) % cells, x1 = (x0 + 1) % cells;
    const y0 = ((iy % cellsY) + cellsY) % cellsY, y1 = (y0 + 1) % cellsY;
    const a = hash3(x0, y0, z, s), b = hash3(x1, y0, z, s);
    const c = hash3(x0, y1, z, s), d = hash3(x1, y1, z, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(u, v, s, octaves, base = 4) {
    let sum = 0, amp = 0.55, total = 0, cells = base;
    for (let o = 0; o < octaves; o++) { sum += amp * noise(u * cells, v * cells, cells, cells, s, o + 1); total += amp; amp *= 0.52; cells *= 2; }
    return sum / total;
  }
  function cells(u, v, n, s) {
    const x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y);
    let d = 4, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const a = ix + i, b = iy + j;
      const wa = ((a % n) + n) % n, wb = ((b % n) + n) % n;
      const px = a + 0.5 + (hash3(wa, wb, 7, s) - 0.5) * 0.7;
      const py = b + 0.5 + (hash3(wa, wb, 11, s) - 0.5) * 0.7;
      const dd = Math.hypot(px - x, py - y);
      if (dd < d) { d = dd; id = hash3(wa, wb, 13, s); }
    }
    return [d, id];
  }
  function equalize(raw) {
    const n = raw.length / 4, BINS = 4096, data = new Uint8Array(raw.length);
    for (let c = 0; c < 4; c++) {
      let lo = Infinity, hi = -Infinity;
      for (let i = c; i < raw.length; i += 4) { lo = Math.min(lo, raw[i]); hi = Math.max(hi, raw[i]); }
      const scale = (BINS - 1) / Math.max(hi - lo, 1e-9), hist = new Uint32Array(BINS);
      for (let i = c; i < raw.length; i += 4) hist[Math.round((raw[i] - lo) * scale)]++;
      const map = new Float32Array(BINS);
      let below = 0;
      for (let b = 0; b < BINS; b++) { map[b] = (below + hist[b] * 0.5) / n; below += hist[b]; }
      for (let i = c; i < raw.length; i += 4) data[i] = Math.round(map[Math.round((raw[i] - lo) * scale)] * 255);
    }
    return data;
  }
  const key = seed >>> 0, N = 256, raw = new Float32Array(N * N * 4);
  const s1 = key ^ 0x51ed27, s2 = key ^ 0x2c1b3c6d, s3 = key ^ 0x297a2d39, s4 = key ^ 0x6b43a9b5;
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N, k = (y * N + x) * 4;
      const wu = u + (noise(u * 4, v * 4, 4, 4, s1, 9) - 0.5) * 0.07;
      const wv = v + (noise(u * 4, v * 4, 4, 4, s1, 10) - 0.5) * 0.07;
      const [cd, cid] = cells(wu, wv, 6, s1);
      const [sd, sid] = cells(wu, wv, 14, s1 ^ 0x3a);
      const big = Math.sqrt(Math.max(0, 1 - cd / (0.2 + 0.42 * cid)));
      const small = Math.sqrt(Math.max(0, 1 - sd / (0.18 + 0.3 * sid))) * (0.45 + 0.55 * Math.min(1, big * 2.2));
      const body = Math.max(big, small * 0.82);
      const lobes = fbm(wu, wv, s1, 4, 8) - 0.5;
      const region = fbm(u, v, s1 ^ 0x77, 2, 2);
      raw[k] = body * (0.7 + 0.4 * region) + lobes * 0.75 * (0.35 + body) + region * 0.18;
      const bend = Math.sin(u * Math.PI * 4 + noise(u * 2, v * 2, 2, 2, s2, 3) * 3) * 1.2;
      raw[k + 1] = noise(u * 2, v * 32 + bend, 2, 32, s2, 1) * 0.68 + noise(u * 4, v * 64 + bend * 2, 4, 64, s2, 2) * 0.32;
      const [ad] = cells(u, v, 10, s3);
      raw[k + 2] = Math.sqrt(Math.max(0, 1 - ad * 1.85)) * (0.62 + 0.38 * fbm(u, v, s3, 3, 8)) + fbm(u, v, s3 ^ 0x5, 2, 4) * 0.12;
      raw[k + 3] = fbm(u, v, s4, 3, 2);
    }
  }
  return equalize(raw);
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 16);

// The seeds the clouds build draws from its own stream (buildClouds: Math.floor(ctx.rng() * 0x7fffffff))
// for the first four layout indices; frozen after the a1-village change was proven equal to the oracle.
const CLOUD_HASHES = {
  0: '413218c95e91e1a5', 1: '7550a87829e5c84b', 2: '9953c016979aed33', 3: 'd3d2d83e31226467'
};

test('cloud field: byte for byte the original generator, on the game seeds and others', async () => {
  const { cloudField } = await kit('sky/field');
  const { assetRng } = await kit('rng');
  const seeds = [0, 1, 0x7fffffff, 123456789, 2026111500];
  for (let i = 0; i < 4; i++) seeds.push(Math.floor(assetRng('clouds', i)() * 0x7fffffff));
  for (const seed of seeds) {
    const got = cloudField(seed).data, want = cloudFieldOracle(seed);
    assert.equal(got.length, want.length);
    let diff = 0; for (let i = 0; i < want.length; i++) if (got[i] !== want[i]) diff++;
    assert.equal(diff, 0, `seed ${seed}: ${diff} bytes differ from the original generator`);
  }
});

test('cloud field: frozen hash on the game seeds', async () => {
  const { cloudField } = await kit('sky/field');
  const { assetRng } = await kit('rng');
  const got = {};
  for (let i = 0; i < 4; i++) got[i] = sha(cloudField(Math.floor(assetRng('clouds', i)() * 0x7fffffff)).data);
  if (process.env.A1_PRINT) console.log(JSON.stringify(got));
  assert.deepEqual(got, CLOUD_HASHES);
});

/* --------------------------------------------------------- pool caustics --- */

// The caustic search as it was before a1-village (src/kit/hidden/pool.js at 98c3a61), the oracle.
function causticOracle(sites, N = 64) {
  const data = new Uint8ClampedArray(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, v = (j + 0.5) / N;
    let f1 = 9, f2 = 9;
    for (const [sx, sy] of sites) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const d = Math.hypot(sx + ox - u, sy + oy - v);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    const k = Math.max(0, 1 - (f2 - f1) * 46), a = k * k * k;
    const o = (j * N + i) * 4;
    data[o] = 170 * a; data[o + 1] = 255 * a; data[o + 2] = 232 * a; data[o + 3] = 255;
  }
  return data;
}

test('pool caustics: byte for byte the original nine-copy search', async () => {
  const { causticPixels, causticSites } = await kit('hidden/pool');
  const { mulberry32 } = await kit('rng');
  const r = mulberry32(7);
  for (let trial = 0; trial < 12; trial++) {
    const sites = Array.from({ length: 4 * (6 + trial) }, () => [r(), r()]);
    const got = causticPixels(sites), want = causticOracle(sites);
    let diff = 0; for (let i = 0; i < want.length; i++) if (got[i] !== want[i]) diff++;
    assert.equal(diff, 0, `trial ${trial}: ${diff} bytes differ`);
  }
  // the sites helper keeps the four-per-ring order
  const L = { rings: [{ cx: 0.2, cy: 0.3, copies: [[0.6, 1.4], [0.8, 1.6], [0.7, 1.5]] }] };
  assert.equal(causticSites(L).length, 4);
  assert.deepEqual(causticSites(L)[0], [0.2, 0.3]);
});

/* ---------------------------------------------------------- lamp kindle --- */

test('lampUpdate: one lantern.kindle on the rising edge, none on the first update or while lit', async () => {
  const { lampUpdate, KINDLE_SOUND_AT, onsetFor, kindle, nightnessAt } = await kit('lanterns/light');
  assert.equal(KINDLE_SOUND_AT, 0.08);
  const heard = [];
  const at = { getWorldPosition: (v) => v };
  const env = (hour) => ({ hour, lanternOn: true, audio: { play: (ev, o) => heard.push([ev, o && o.gain]) } });
  const step = lampUpdate({ index: 3, at });
  // dusk to night in 0.05 h steps
  const hours = [];
  for (let h = 16; h <= 22.001; h += 0.05) hours.push(+h.toFixed(2));
  for (const h of hours) step(1 / 60, 0, env(h));
  assert.equal(heard.length, 1, 'exactly one kindle over a dusk');
  assert.equal(heard[0][0], 'lantern.kindle');
  // where it fired: the first hour whose kindle level reached the threshold
  const onset = onsetFor(3);
  const first = hours.find((h) => kindle(nightnessAt(h), onset) >= KINDLE_SOUND_AT);
  assert.ok(first > 16 && first < 22, 'the edge falls inside the dusk');
  // staying lit: nothing more
  for (let i = 0; i < 120; i++) step(1 / 60, 0, env(22));
  assert.equal(heard.length, 1);
  // a lantern built at night is silent on its first update and after
  const heard2 = [];
  const step2 = lampUpdate({ index: 3, at });
  for (let i = 0; i < 30; i++) step2(1 / 60, 0, { hour: 23, lanternOn: true, audio: { play: (ev) => heard2.push(ev) } });
  assert.deepEqual(heard2, []);
  // no `at` (the owner did not give a position): silent
  const heard3 = [];
  const step3 = lampUpdate({ index: 3 });
  for (const h of hours) step3(1 / 60, 0, { hour: h, lanternOn: true, audio: { play: (ev) => heard3.push(ev) } });
  assert.deepEqual(heard3, []);
  // and a new dusk after a day kindles again
  for (let h = 8; h <= 22.001; h += 0.05) step(1 / 60, 0, env(+h.toFixed(2)));
  assert.equal(heard.length, 2);
});

/* ---------------------------------------------- runtime family imports --- */

test('runtime preload: families imported side by side, registered in the generated order', async () => {
  const { AssetRuntime } = await kit('runtime');
  const { defineAsset } = await kit('contract');
  const def = (id) => defineAsset({ id, family: 'x', params: {}, build: () => null });
  const later = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
  const started = [];
  const warnings = [];
  const dupC = def('dup');
  let seenByC = null;
  const rt = new AssetRuntime({
    assetSet: 'modular', search: '?assets=modular', quality: 'high', logger: { warn: (m) => warnings.push(m) },
    fetchOverrides: async () => null,
    createMaterials: async () => ({ bind() {} }),
    loadFamilies: async () => ({
      // the first family finishes last; the second throws; the third and fourth define the same id
      a: () => { started.push('a'); return later(30, { assets: [def('a1'), def('a2')] }); },
      b: () => { started.push('b'); return later(5).then(() => { throw new Error('boom'); }); },
      c: () => { started.push('c'); return later(1).then(() => { seenByC = [...started]; return { assets: [dupC] }; }); },
      d: () => { started.push('d'); return later(10, { assets: [def('dup'), def('d1')] }); }
    })
  });
  await rt.preload();
  assert.deepEqual(started, ['a', 'b', 'c', 'd']);
  // side by side: when the quickest import (c) finished, all four had started (one after another, d had not)
  assert.deepEqual(seenByC, ['a', 'b', 'c', 'd']);
  assert.deepEqual([...rt.defs.keys()], ['a1', 'a2', 'dup', 'd1']);
  assert.equal(rt.defs.get('dup'), dupC, 'the first-registered (family c, the generated order) wins');
  assert.deepEqual([...rt.families.keys()], ['a', 'c', 'd']);
  assert.ok(warnings.some((w) => /family 'b' failed to load/.test(w)));
  assert.ok(warnings.some((w) => /dup: registered twice \(x and d\); keeping the first/.test(w)));
  assert.equal(rt.loaded, true);
});

test('runtime preload: a failing kit materials import still fails the preload, as before', async () => {
  const { AssetRuntime } = await kit('runtime');
  const warnings = [];
  const rt = new AssetRuntime({
    assetSet: 'modular', search: '?assets=modular', quality: 'high', logger: { warn: (m) => warnings.push(m) },
    fetchOverrides: async () => null,
    createMaterials: async () => { throw new Error('no materials'); },
    loadFamilies: async () => ({})
  });
  await rt.preload();
  assert.equal(rt.loaded, false);
  assert.ok(warnings.some((w) => /kit preload failed, running classic: no materials/.test(w)));
});
