// Unit tests for the b1-build-budget changes (ruling R66: the modular world build).
//
//   node --test tools/b1_build_budget_test.mjs
//
// Node has no `three` package, so `three` is a stand-in here: a Proxy that
// answers every member (as tools/a1_village_test.mjs does), plus small real
// classes for what these tests look inside (Texture, DataArrayTexture,
// MeshStandardMaterial, Vector2). There is no DOM either, which the tests use:
// a texture painter (textures.js, the ground tiles) throws without one, so a
// build that succeeds in Node painted nothing, and a read that throws painted.
//   - deferredTextured (src/kit/materials.js): nothing is painted when the
//     material is made; the first read (or write) of a map paints once and
//     leaves exactly what texturedMaterial(set, opts) holds; a failing paint
//     throws to the reader and the next read tries again;
//   - KitMaterials' textured factories (stone, wood, bark, lacquer, bronze,
//     straw, plaster, tile) make their material without painting;
//   - packLayers (src/kit/ground/layers.js): byte for byte the pack loop it
//     was cut from (the oracle below, verbatim from ef6adad);
//   - groundLayers: the two layer textures are made without painting; the
//     first read of image.data paints.
// The pixels are proven in the browser: game_shot pairs on ?assets=modular
// (docs/fable/status/b1-build-budget.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { currentTag } from './kit_index.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TAG = currentTag(ROOT);

const threeStub = `class S { constructor() { return new Proxy(this, { get: (t, k) => k in t ? t[k] : k === 'then' ? undefined : () => t }); } }
const P = new Proxy({}, { get: (t, k) => k === 'then' ? undefined : k === 'REVISION' ? '160' : S });
export default P;
export class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } set(x, y) { this.x = x; this.y = y; return this; } copy(v) { this.x = v.x; this.y = v.y; return this; } }
export class Texture { constructor(image = null) { this.isTexture = true; this.image = image; this.userData = {}; this.version = 0; this.repeat = new Vector2(1, 1); }
  set needsUpdate(v) { if (v) this.version++; } clone() { const t = new Texture(this.image); t.cloned = true; return t; } }
export class DataArrayTexture extends Texture { constructor(data = null, width = 1, height = 1, depth = 1) { super(null); this.isDataArrayTexture = true; this.image = { data, width, height, depth }; } }
export class MeshStandardMaterial { constructor(p = {}) { this.isMaterial = true; this.userData = {}; this.normalScale = new Vector2(1, 1);
  this.map = null; this.normalMap = null; this.roughnessMap = null; this.emissiveMap = null; this.envMapIntensity = 1; Object.assign(this, p); } }
export const CanvasTexture = S, Vector3 = S, Vector4 = S, Color = S, Matrix3 = S, Matrix4 = S, Quaternion = S, Euler = S,
  Object3D = S, Group = S, Mesh = S, BufferGeometry = S, BufferAttribute = S, Float32BufferAttribute = S, CatmullRomCurve3 = S,
  MeshBasicMaterial = S, ShaderMaterial = S, Box3 = S, PlaneGeometry = S, BoxGeometry = S, CylinderGeometry = S, SphereGeometry = S,
  ShaderChunk = {}, MathUtils = { clamp: (v, a, b) => Math.min(b, Math.max(a, v)), lerp: (a, b, t) => a + (b - a) * t };
export const RGBAFormat = 1023, UnsignedByteType = 1009, RepeatWrapping = 1000, ClampToEdgeWrapping = 1001,
  LinearFilter = 1006, LinearMipmapLinearFilter = 1008, NoColorSpace = '', SRGBColorSpace = 'srgb', FrontSide = 0, BackSide = 1, DoubleSide = 2;`;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') return { url: 'data:text/javascript,' + encodeURIComponent(threeStub), shortCircuit: true };
    if (specifier.startsWith('three/addons/')) return { url: 'data:text/javascript,' + encodeURIComponent('export const mergeGeometries = () => null, mergeVertices = () => null; export class RoundedBoxGeometry {}'), shortCircuit: true };
    return next(specifier, context);
  }
});
const kit = (path) => import(`../src/kit/${path}.js?v=${TAG}`);
const THREE = await import('three');
const { deferredTextured, DEFERRED_MAP_KEYS, KitMaterials } = await kit('materials');
const { packLayers, groundLayers, LAYERS } = await kit('ground/layers');

/* ------------------------------------------------------- deferredTextured --- */

// texturedMaterial's own logic (src/textures.js), on the stand-in classes
function makeLike(set, opts = {}) {
  const { roughness = 0.9, normalScale = 1, repeat = null } = opts;
  const params = { roughness };
  const pick = (tex) => (!tex ? null : !repeat ? tex : tex.clone());
  if (set.map) params.map = pick(set.map);
  if (set.normalMap) { params.normalMap = pick(set.normalMap); params.normalScale = new THREE.Vector2(normalScale, normalScale); }
  if (set.roughnessMap) params.roughnessMap = pick(set.roughnessMap);
  if (set.emissiveMap) params.emissiveMap = pick(set.emissiveMap);
  return new THREE.MeshStandardMaterial(params);
}
const realSet = () => ({ map: new THREE.Texture('albedo'), normalMap: new THREE.Texture('normal') });

test('deferredTextured: making the material paints nothing', () => {
  let paints = 0;
  const mat = deferredTextured(() => { paints++; return realSet(); }, { roughness: 0.8, normalScale: 0.9 }, makeLike);
  assert.equal(paints, 0);
  assert.equal(mat.roughness, 0.8);
  assert.ok(mat.isMaterial);
});

test('deferredTextured: the first map read paints once and leaves exactly what the eager material holds', () => {
  let paints = 0;
  const set = realSet();
  const opts = { roughness: 0.8, normalScale: 0.9 };
  const mat = deferredTextured(() => { paints++; return set; }, opts, makeLike);
  const eager = makeLike(set, opts);
  assert.equal(mat.map, set.map);
  assert.equal(paints, 1);
  for (const key of DEFERRED_MAP_KEYS) assert.equal(mat[key], eager[key], key);
  assert.deepEqual([mat.normalScale.x, mat.normalScale.y], [eager.normalScale.x, eager.normalScale.y]);
  assert.equal(mat.normalMap, set.normalMap);
  assert.equal(paints, 1);
  for (const key of DEFERRED_MAP_KEYS) {
    const d = Object.getOwnPropertyDescriptor(mat, key);
    assert.ok('value' in d && d.writable, `${key} is a plain property after the first read`);
  }
});

test('deferredTextured: any map key resolves all of them; a set without a normal map leaves none (and the default normalScale)', () => {
  let paints = 0;
  const only = { map: new THREE.Texture('albedo') };
  const mat = deferredTextured(() => { paints++; return only; }, { normalScale: 0.4 }, makeLike);
  assert.equal(mat.emissiveMap, null);
  assert.equal(paints, 1);
  assert.equal(mat.map, only.map);
  assert.equal(mat.normalMap, null);
  const eager = makeLike(only, { normalScale: 0.4 });
  assert.deepEqual([mat.normalScale.x, mat.normalScale.y], [eager.normalScale.x, eager.normalScale.y]);
});

test('deferredTextured: a write before any read paints first, then keeps the written value', () => {
  let paints = 0;
  const set = realSet();
  const mat = deferredTextured(() => { paints++; return set; }, {}, makeLike);
  const mine = new THREE.Texture('mine');
  mat.map = mine;
  assert.equal(paints, 1);
  assert.equal(mat.map, mine);
  assert.equal(mat.normalMap, set.normalMap);
});

test('deferredTextured: a failing paint throws to the reader, and the next read tries again', () => {
  let paints = 0;
  const set = realSet();
  const mat = deferredTextured(() => { paints++; if (paints === 1) throw new Error('no canvas'); return set; }, {}, makeLike);
  assert.throws(() => mat.map, /no canvas/);
  assert.equal(mat.map, set.map);
  assert.equal(paints, 2);
});

test('KitMaterials: the textured factories make their material without painting; a map read paints (no DOM here, so it throws)', () => {
  const km = new KitMaterials();
  const made = [km.stone(), km.stone({ tint: 0x77736a }), km.wood(), km.bark(), km.lacquer(), km.bronze(), km.straw(), km.plaster(), km.tile()];
  assert.equal(new Set(made).size, made.length);
  for (const m of made) assert.ok(m.isMaterial);
  assert.equal(km.stone(), made[0], 'memoised as before');
  assert.equal(km.shared('stone'), made[0], 'KIT_SHARED.stone is the same material');
  // textures.js paints on a canvas: under Node the read reaches it and throws
  assert.throws(() => made[0].map, /document|canvas/i);
});

/* ------------------------------------------------------------ packLayers --- */

// The pack loop as it was in paintLayers() at ef6adad (src/kit/ground/layers.js), kept here as the oracle.
function packOracle(tiles) {
  const N = 256;
  const L = tiles.length, S = N * N, R = 3;
  const alb = new Uint8Array(S * 4 * L), nor = new Uint8Array(S * 4 * L);
  const nxt = new Int32Array(N), prv = new Int32Array(N);
  for (let i = 0; i < N; i++) { nxt[i] = (i + 1) % N; prv[i] = (i - 1 + N) % N; }
  const hf = new Float32Array(S), rows = new Float32Array(S), cols = new Float32Array(S);
  const to8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  tiles.forEach((t, li) => {
    if (t.flat) {
      const [r, g, b] = t.flat, base = li * S * 4;
      for (let i = 0; i < S; i++) {
        const q = base + i * 4;
        alb[q] = r; alb[q + 1] = g; alb[q + 2] = b; alb[q + 3] = 102;
        nor[q] = 128; nor[q + 1] = 128; nor[q + 2] = 128; nor[q + 3] = 255;
      }
      return;
    }
    const a = t.a, h = t.h;
    for (let i = 0; i < S; i++) hf[i] = h[i * 4] / 255;
    for (let y = 0; y < N; y++) {
      const o = y * N;
      let s = 0;
      for (let k = -R; k <= R; k++) s += hf[o + ((k + N) % N)];
      for (let x = 0; x < N; x++) { rows[o + x] = s; s += hf[o + (x + R + 1) % N] - hf[o + (x - R + N) % N]; }
    }
    for (let x = 0; x < N; x++) {
      let s = 0;
      for (let k = -R; k <= R; k++) s += hf[((k + N) % N) * N + x];
      for (let y = 0; y < N; y++) { cols[y * N + x] = s; s += hf[((y + R + 1) % N) * N + x] - hf[((y - R + N) % N) * N + x]; }
    }
    const relief = LAYERS[li].relief * 4, base = li * S * 4, inv = 1 / (4 * R + 2);
    for (let y = 0; y < N; y++) {
      const o = y * N, on = nxt[y] * N, op = prv[y] * N;
      for (let x = 0; x < N; x++) {
        const i = o + x, q = base + i * 4, p = i * 4;
        alb[q] = a[p]; alb[q + 1] = a[p + 1]; alb[q + 2] = a[p + 2]; alb[q + 3] = h[p];
        const dx = (hf[o + nxt[x]] - hf[o + prv[x]]) * relief;
        const dy = (hf[on + x] - hf[op + x]) * relief;
        nor[q] = to8((0.5 - dx * 0.5) * 255);
        nor[q + 1] = to8((0.5 - dy * 0.5) * 255);
        nor[q + 2] = to8((0.5 + (hf[i] - (rows[i] + cols[i]) * inv) * 3) * 255);
        nor[q + 3] = 255;
      }
    }
  });
  return { alb, nor };
}

function lcg(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
function tile(seed, smooth) {
  const r = lcg(seed), S = 256 * 256, a = new Uint8ClampedArray(S * 4), h = new Uint8ClampedArray(S * 4);
  for (let i = 0; i < S * 4; i++) a[i] = r() * 256;
  // a smooth height (blobs) or noise, so slopes and cavities take every value
  for (let i = 0; i < S; i++) {
    const x = i & 255, y = i >> 8;
    const v = smooth ? 128 + 100 * Math.sin(x * 0.09 + seed) * Math.cos(y * 0.07 - seed) : r() * 256;
    h[i * 4] = h[i * 4 + 1] = h[i * 4 + 2] = v; h[i * 4 + 3] = 255;
  }
  return { a, h };
}

test('packLayers: byte for byte the former pack loop (painted and flat layers, every relief)', () => {
  for (const seed of [1, 7, 42]) {
    const tiles = LAYERS.map((layer, li) => (li % 3 === 2 ? { flat: [(seed * 37 + li) & 255, (seed * 11 + li * 3) & 255, (li * 29) & 255] } : tile(seed * 10 + li, li % 2 === 0)));
    const got = packLayers(tiles), want = packOracle(tiles);
    assert.equal(Buffer.compare(Buffer.from(got.alb), Buffer.from(want.alb)), 0, `albedo, seed ${seed}`);
    assert.equal(Buffer.compare(Buffer.from(got.nor), Buffer.from(want.nor)), 0, `normals, seed ${seed}`);
  }
});

test('groundLayers: the two textures are made without painting; the first image.data read paints (no DOM here, so it throws)', () => {
  const km = {};
  const layers = groundLayers(km);
  for (const tex of [layers.alb, layers.nor]) {
    assert.ok(tex.isDataArrayTexture);
    assert.deepEqual([tex.image.width, tex.image.height, tex.image.depth], [256, 256, LAYERS.length]);
    assert.equal(tex.version, 1, 'needsUpdate was set, as before');
    assert.equal(tex.userData.kit, true);
  }
  assert.equal(layers.alb.colorSpace, 'srgb');
  assert.notEqual(layers.nor.colorSpace, 'srgb');
  assert.equal(groundLayers(km), layers, 'one pair per kit set, as before');
  assert.throws(() => layers.alb.image.data, /document|canvas/i);
});
