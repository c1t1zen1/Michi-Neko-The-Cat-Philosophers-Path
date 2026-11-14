// The valley ground (inventory `valley-ground`): the classic 260 m height
// field, vertex for vertex, worn by one GroundField and shaded by the one
// ground material.
//
// Heights are the valley's own: Countryside.prototype.terrainHeight and the
// river carve (riverBedSamples / riverBedDepth) run on a bare prototype
// object, the same code the classic builder runs, so every vertex lands
// exactly where the classic ground's does (walk heights come from
// Countryside.groundAt and never from this mesh; the footprint golden and the
// contract test keep both honest). The classic vertex colour becomes the
// `tint` attribute the shader lays over the meadow floor.
//
// The field covers the valley floor (128 m square, 4 texels per metre). The
// valley is painted here (meadow, the pebbled river banks, moss under the
// shrine's moss pillows); the road and its worn shoulders are painted by the
// `path` and `path-shoulders` kit assets into the same field when they are
// modular too (paint.js), so each id still swaps on its own.
//
// Live wear: an instance bound to the world (bindWorld({ grass, player,
// npcs }); the handoff carries the main.js line) lets the cat's and the
// villagers' paws wear the field, regrows it, and thins the grass BiomeMask
// where they wore it (lawns never). Unbound, nothing reads the player.
import * as THREE from 'three';
import { Countryside } from '../../countryside.js?v=20261113a';
import { worldNoise } from '../../textures.js?v=20261113a';
import { GroundField, cachedField, sstep } from './field.js?v=20261113a';
import { groundLayers } from './layers.js?v=20261113a';
import { createGroundMaterial, setGroundTier, sunDirAt, GroundWeather } from './material.js?v=20261113a';

export const VALLEY_FIELD = Object.freeze({ x0: -64, z0: -64, w: 128, d: 128, k: 4 });
const SIZE = 260;                                   // the classic plane
export const SEGMENTS = { hero: 150, mid: 150, far: 50 };   // far: every third classic vertex

// A bare Countryside: the valley's own terrain code, no valley built.
let _terrain = null;
const terrain = () => _terrain || (_terrain = Object.create(Countryside.prototype));

/* ------------------------------------------------------------ the mesh --- */

const _geoCache = new Map();
/** Positions, tint and normals of the classic ground at `seg` segments (computed once, then copied). */
function terrainArrays(seg) {
  if (_geoCache.has(seg)) return _geoCache.get(seg);
  const T = terrain();
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const tint = new Float32Array(pos.count * 3);
  // the classic palette (countryside.js meshGroundClassic), verbatim
  const colMeadow = new THREE.Color(0x5d8442), colMoss = new THREE.Color(0x3d6030), colGold = new THREE.Color(0x7a9448);
  const colEarth = new THREE.Color(0x8a7452), colBank = new THREE.Color(0x4f7440), colDark = new THREE.Color(0x2c4a26);
  const colForest = new THREE.Color(0x2f4f2a), colLowland = new THREE.Color(0x7d9a4e), colMud = new THREE.Color(0x4a4030);
  const c = new THREE.Color();
  const riverBed = T.riverBedSamples();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.sqrt(x * x + z * z);
    let y = T.terrainHeight(x, z);
    const bed = Math.abs(z - 29) < 9 ? T.riverBedDepth(x, z, riverBed) : 0;
    y -= bed;
    pos.setY(i, y);
    const noise1 = worldNoise(x, z, 0.05, 3, 3);
    const noise2 = worldNoise(x, z, 0.14, 2, 5);
    const noise3 = worldNoise(x, z, 0.028, 3, 7);
    c.copy(colMeadow).lerp(colGold, noise1 * 0.7).lerp(colMoss, noise2 * 0.45);
    if (noise3 > 0.58) c.lerp(colDark, (noise3 - 0.58) / 0.42 * 0.7);
    if (Math.abs(z - 29) < 8) c.lerp(colBank, (1.0 - THREE.MathUtils.clamp(Math.abs(z - 29) / 8, 0, 1)) * 0.7);
    if (d < 35 && (Math.abs(x) < 5 || (x > 8 && x < 24 && z > -18 && z < 14))) c.lerp(colEarth, 0.3 + noise2 * 0.25);
    if (d > 48) {
      const { opening } = T.terrainSector(x, z);
      c.lerp(colForest, Math.min(1, (d - 48) / 40) * (1 - opening * 0.85));
      c.lerp(colLowland, Math.min(1, (d - 48) / 30) * opening * 0.6);
    }
    if (bed > 0.02) c.lerp(colMud, Math.min(1, bed / 0.55));
    const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const k = 1 / Math.max(0.05, lum) * 0.5;
    tint[i * 3] = c.r * k; tint[i * 3 + 1] = c.g * k; tint[i * 3 + 2] = c.b * k;
  }
  geo.computeVertexNormals();
  const out = {
    position: pos.array.slice(), normal: geo.attributes.normal.array.slice(), uv: geo.attributes.uv.array.slice(),
    index: geo.index.array.slice(), tint
  };
  geo.dispose();
  _geoCache.set(seg, out);
  return out;
}

export function terrainGeometry(seg) {
  const a = terrainArrays(seg);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.position.slice(), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(a.normal.slice(), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(a.uv.slice(), 2));
  g.setAttribute('tint', new THREE.BufferAttribute(a.tint.slice(), 3));
  g.setIndex(new THREE.BufferAttribute(a.index.slice(), 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/* ----------------------------------------------------------- the field --- */

// The shrine's moss pillows (vegetation.js layoutMeadow: shrine flanks, the
// Moon Pool ring, the key rock) get sugigoke under them, so pillow and ground
// meet; positions mirror that layout (data, not draws).
const MOSS_BEDS = [[-2.9, -30.6, 1.5], [2.9, -30.6, 1.5], [-23.5, -20.5, 1.4]];
for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.3; MOSS_BEDS.push([-20 + Math.cos(a) * 4.1, -27 + Math.sin(a) * 4.1, 1.4]); }

/** The valley's own paint (meadow, river banks, moss beds). */
function paintValley() {
  const T = terrain();
  const f = new GroundField(VALLEY_FIELD);
  const bed = T.riverBedSamples();
  const S = f.S, n = f.n;
  for (let i = 0; i < n; i++) S[i * 8] = 1;                       // meadow floor
  // distance to the river's centreline, stamped from its dense samples (6 m reach)
  const dist = new Float32Array(n).fill(Infinity);
  const REACH = 6, k = f.k;
  for (const q of bed) {
    const i0 = Math.max(0, Math.floor((q.x - REACH - f.x0) * k)), i1 = Math.min(f.nx - 1, Math.ceil((q.x + REACH - f.x0) * k));
    const j0 = Math.max(0, Math.floor((q.z - REACH - f.z0) * k)), j1 = Math.min(f.nz - 1, Math.ceil((q.z + REACH - f.z0) * k));
    for (let j = j0; j <= j1; j++) {
      const dz = f.zOf(j) - q.z, row = j * f.nx;
      for (let i = i0; i <= i1; i++) { const dx = f.xOf(i) - q.x, d2 = dx * dx + dz * dz; if (d2 < dist[row + i]) dist[row + i] = d2; }
    }
  }
  for (let idx = 0; idx < n; idx++) {
    if (dist[idx] > REACH * REACH) continue;
    const d = Math.sqrt(dist[idx]), x = f.xOf(idx % f.nx), z = f.zOf(Math.floor(idx / f.nx)), o = idx * 8;
    // kawara: river cobbles at the waterline, damp, moss in the shade of the bank
    const nz = worldNoise(x, z, 0.9, 2, 61), n2 = worldNoise(x, z, 0.35, 2, 67);
    const pebble = (1 - sstep(2.6, 4.8 + nz * 0.9, d)) * 0.75;
    const mossy = sstep(3.0, 4.2, d) * (1 - sstep(4.6, 5.8, d)) * sstep(0.45, 0.7, n2) * 0.8;
    S[o] = sstep(3.3, 5.4 + nz * 0.6, d); S[o + 2] = pebble * (1 - mossy * 0.5); S[o + 1] = mossy;
    f.wet[idx] = (1 - sstep(2.8, 4.6, d)) * 0.7;
    f.snow[idx] = sstep(3.2, 4.2, d);                              // nothing settles at the waterline
  }
  for (const [x, z, r] of MOSS_BEDS) f.paint('moss', x, z, r, 0.85, 0.6);
  return f;
}

/** A fresh valley field, painted and uploaded (copied from the one-off paint). */
export const valleyField = () => cachedField('valley', paintValley);

/* ------------------------------------------------- the valley's ground --- */

// The ground a path or shoulder kit asset paints into, per kit set (the
// valley builds it before the road; the contract test builds each alone).
const _current = new WeakMap();
const _soloKey = {};
const keyOf = (km) => (km && typeof km === 'object' ? km : _soloKey);
export function currentValleyGround(km) { return _current.get(keyOf(km)) || null; }

/** Material params encoded in its name: the contract test hashes materials by name. */
const sig = (p) => `hex${p.hex_cell}-blend${p.blend}-macro${p.macro}-fringe${p.fringe}`;

export function buildValleyGround(ctx, layout, p) {
  const { THREE: T3, tier, kitMaterials: km } = ctx;
  const field = valleyField();
  field.T = Math.max(60, p.regrow_minutes * 60);
  const layers = groundLayers(km);
  const material = createGroundMaterial(field, layers, { tier, hexCell: p.hex_cell, blend: p.blend, macro: p.macro, fringe: p.fringe, name: `kit-ground:valley-ground:${sig(p)}` });
  const mesh = new T3.Mesh(terrainGeometry(SEGMENTS[tier] || SEGMENTS.mid), material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  // the road and shoulders paint into the field after this build: upload once before the first draw
  let fresh = true;
  mesh.onBeforeRender = () => { if (fresh) { fresh = false; field.upload(); } };
  const group = new T3.Group();
  group.add(mesh);

  const U = material.userData.u;
  const weather = new GroundWeather();
  const state = { field, material, U, time: 0, clocks: { upload: 0, regrow: 0, mask: 0 }, world: null, mask: null, maskBox: null, last: new Map() };

  const inst = {
    group, parts: { terrain: mesh }, sockets: {}, live: [],
    field, material,
    /** What is underfoot at (x, z): { mat, wear, wet, snow } (footsteps, the audio lane). */
    surfaceAt: (x, z) => field.surfaceAt(x, z),
    /**
     * Join the world: `grass` (the valley GrassSystem; its BiomeMask is thinned
     * where paws wear the field, lawns never), `player` (its mesh position and
     * isGrounded), `npcs` (villagers within 12 m wear it too). Call once.
     */
    bindWorld({ grass = null, player = null, npcs = null } = {}) {
      state.world = { player, npcs };
      const tex = grass && grass.U && grass.U.uMask && grass.U.uMask.value;
      const rect = grass && grass.U && grass.U.uMaskRect && grass.U.uMaskRect.value;
      if (tex && rect && tex.image && tex.image.data) {
        const res = tex.image.width, size = 1 / rect.z;
        state.mask = { texture: tex, res, x0: rect.x, z0: rect.y, k: res / size, baked: tex.image.data.slice() };
      }
      return !!state.mask;
    },
    update(dt, t, env = {}) {
      state.time += dt;
      U.uTime.value = state.time;
      const sun = sunDirAt(typeof env.hour === 'number' ? env.hour : 12, U.uSunDir.value);
      const up = Math.max(0, sun.y);
      U.uSunCol.value.setRGB(1, 0.94, 0.84).multiplyScalar(up > 0 ? Math.min(1, up * 4) : 0);
      weather.update(dt, { rain: env.wet || 0, snowFall: env.snow || 0, mist: typeof env.mist === 'number' ? env.mist : 0, sun: Math.min(1, up * 3) });
      weather.apply(U);
      if (state.world) wearUpdate(state, dt);
      const c = state.clocks;
      c.upload += dt;
      if (c.upload > 0.25 && (field.dirty.s || field.dirty.f || field.dirty.h)) { field.upload(); c.upload = 0; }
    },
    setTier(next) { if (next && next !== inst.tier) setGroundTier(material, next); },
    dispose() {
      if (_current.get(keyOf(km)) === state) _current.delete(keyOf(km));
      material.dispose();
      field.dispose();
    }
  };
  state.inst = inst;
  _current.set(keyOf(km), state);
  return inst;
}

/* ---------------------------------------------------------- live wear --- */

const _paw = new THREE.Vector3();
/** Paws wear the field (one step per 0.3 m travelled on the ground), regrow, and thin the grass mask. */
function wearUpdate(state, dt) {
  const { field } = state, W = state.world, c = state.clocks;
  const walkers = [];
  const pl = W.player;
  if (pl && pl.mesh && pl.isGrounded !== false) walkers.push(['cat', pl.mesh.position, 1]);
  if (Array.isArray(W.npcs) && pl && pl.mesh) {
    for (const n of W.npcs) {
      const q = n && n.mesh && n.mesh.position;
      if (q && Math.abs(q.x - pl.mesh.position.x) < 12 && Math.abs(q.z - pl.mesh.position.z) < 12) walkers.push([n, q, 0.8]);
    }
  }
  for (const [key, q, weight] of walkers) {
    if (q.y > 0.3) { state.last.delete(key); continue; }          // on a roof, a ledge, the bridge: not the ground
    const prev = state.last.get(key);
    if (!prev) { state.last.set(key, _paw.set(q.x, 0, q.z).clone()); continue; }
    const d = Math.hypot(q.x - prev.x, q.z - prev.z);
    if (d > 3) { prev.set(q.x, 0, q.z); continue; }                // a teleport, not a walk
    if (d < 0.3) continue;
    field.step(q.x, q.z, 0.14, weight * Math.min(2, d / 0.3));
    prev.set(q.x, 0, q.z);
  }
  c.regrow += dt;
  if (c.regrow > 1) { field.regrow(c.regrow); c.regrow = 0; }
  c.mask += dt;
  if (state.mask && c.mask > 0.5) {
    c.mask = 0;
    const r = field.maskRect(state.mask, 0.6);
    if (r) {
      const B = state.maskBox;
      state.maskBox = B ? [Math.min(B[0], r[0]), Math.min(B[1], r[1]), Math.max(B[2], r[2]), Math.max(B[3], r[3])] : r;
      field.wearGrassMask(state.mask, state.mask.baked, r);
    } else if (state.maskBox) {                                    // healed: put the baked meadow back once
      field.wearGrassMask(state.mask, state.mask.baked, state.maskBox);
      state.maskBox = null;
    }
  }
}
