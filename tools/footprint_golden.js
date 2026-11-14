// Footprint golden: the layout and collider safety net for the modular asset
// swap (BUILD_GUIDE_FABLE.md §8 F1.6, AAA-6). It changes no game file.
//
//   node tools/footprint_golden.mjs            headless; exit 0 equal, 1 different
//   node tools/footprint_golden.mjs --write    regenerate tools/golden/valley_classic.json
//   python3 -m http.server 8000  →  http://localhost:8000/tools/footprint_golden.html
//
// It builds the valley the way tools/town_preview.js and hidden_preview.js do
// (`new Countryside(scene)` with its default seed, then `new HiddenPlaces(scene,
// city)`, the order of src/main.js), with no renderer, Vegetation or Interior.
// A ContextActionManager on a stub player supplies the rest spots, and
// `hidden.attach()` adds the two hidden ones, as the game does. Then it writes
// a JSON digest:
//
//   rng          valley stream draws (all of them: this.random() and the
//                buildCanopy(this.rng) path) with a probe proving the count;
//                hidden-places draws; game Math.random() draws
//   builders     per top-level builder, in build order: stream draws,
//                Math.random() draws, colliders, platforms, exclusions, water
//                rects and scene objects it added; `calls`: every build* /
//                create* method's call count and inclusive totals
//                (advisory: shown to explain a difference, not part of the
//                verdict, since a faithful split may move a draw between methods)
//   colliders    city.colliders in order; houseColliders (left/right)
//   platforms    Box3 platforms as boxes; function platforms as their gating,
//                the exact rect from addOrientedPlatform /
//                addSlopedRoofPlatforms, and a probe of getHeightAt on a
//                0.1 m lattice (the only record of the bridge ramps)
//   waterRects, water (bridge clearance), exclusions, samples (path, river)
//   anchors      every this.*Pos / this.*Mesh handle, collectibles, lanterns,
//                toro spots, Larry, fences, thicket, hidden lanterns, rest spots
//   objects      every named Object3D before _mergeStatics(): world p, q, s,
//                geometry stats, material, shadow flags, instance stats
//   aggregates   unnamed renderables per nearest named ancestor (in its frame):
//                count, vertices, bbox, centroid, covariance, materials
//   baked        the merged "Baked Statics" meshes, keyed by parent + material
//
// Numbers are rounded to 1e-4; key order is build order; the text layout puts
// one entry per line so git diffs stay readable.
//
// Determinism: Math.random, performance.now and Date.now are replaced before
// any game module loads: a seeded Math.random (three.js's generateUUID draws
// from a stream of its own, so a builder's Math.random() values never depend
// on how many three.js objects came before it) and a clock that steps on each
// read. The valley is then built twice with different ambient seeds and
// clocks; every value that differs between the two builds comes from
// Math.random or the clock (the nest eggs' tilt, the offering bells' yaw and
// the dawn mist sprites today) and is written as "~", and unnamed members
// that differ are left out of their aggregate (counted in `vol`). The seeded
// valley stream is the same in both builds.
//
// Page flags: ?golden=<path> (default golden/valley_classic.json, relative to
// this page), ?max=<n> changes listed. Any other flag (?assets=, ?swap=, …) is
// left to countrysideOptions() below and is otherwise ignored.

const FORMAT = 'michi-neko-footprint-golden';
const VERSION = 1;
const params = new URLSearchParams(location.search);
const GOLDEN_URL = params.get('golden') || 'golden/valley_classic.json';
const MAX_SHOWN = Math.max(1, Number(params.get('max')) || 40);
const MAX_STORED = 2000; // change items kept in the result; counts are always complete

// The Countryside build options (Integrator ruling R11): the kit runtime,
// resolved from ?assets= / ?swap= exactly as src/main.js does, so the golden
// can be run on the modular set (`--query "?assets=modular&swap=torii:modular"`).
// `assets` is constructed and preloaded in main(), after the shims and the
// game imports; with no flag the set is classic and nothing is downloaded.
let assets = null;
function countrysideOptions(/* params */) {
  return assets ? { assets } : {};
}

// ---------------------------------------------------------------- shims ---
// Installed before any game module is evaluated: the game modules are loaded
// with import() further down, after this has run.

function mulberry32(a) { // same algorithm as src/countryside.js
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const realNow = performance.now.bind(performance);
const EPOCH = Date.UTC(2026, 0, 1);
const ambient = { game: mulberry32(1), uuid: mulberry32(2), t: 0, step: 1, draws: 0 };

// three.js's generateUUID() also draws from Math.random (four per object,
// geometry, material and texture), so on a single stream the value a builder's
// Math.random() gets would depend on how many three.js objects were created
// before it, and one extra Group in a refactored builder would reshuffle
// them. UUID draws get their own stream; the game's draws see only each other.
function calledFromUUID() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 3;
  const stack = String(new Error().stack);
  Error.stackTraceLimit = limit;
  return stack.indexOf('generateUUID') !== -1;
}
Math.random = function random() {
  if (calledFromUUID()) return ambient.uuid();
  ambient.draws++;
  return ambient.game();
};
performance.now = () => (ambient.t += ambient.step);
Date.now = () => EPOCH + Math.floor(ambient.t += ambient.step);

function setAmbient(spec) {
  ambient.game = mulberry32(spec.seed);
  ambient.uuid = mulberry32(spec.seed ^ 0x3c6ef372);
  ambient.t = spec.t0;
  ambient.step = spec.step;
  ambient.draws = 0;
}

// Build A is the digest; build B only reveals which values are ambient.
const BUILDS = [
  { label: 'A', seed: 0x0a11ce5, t0: 1e6, step: 0.5 },
  { label: 'B', seed: 0x5eed0b, t0: 2.5e6 + 0.123, step: 0.37 }
];

let THREE, Countryside, HiddenPlaces, ContextActionManager;
let REC = null; // recorder of the build in progress

// --------------------------------------------------------------- numbers ---

function r4(x) {
  if (typeof x !== 'number') return x;
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'NaN' : x > 0 ? 'Inf' : '-Inf';
  const v = Math.round(x * 1e4) / 1e4;
  return Object.is(v, -0) ? 0 : v;
}
const v3 = (v) => (v ? [r4(v.x), r4(v.y), r4(v.z)] : null);
const box6 = (b) => (b ? [r4(b.min.x), r4(b.min.y), r4(b.min.z), r4(b.max.x), r4(b.max.y), r4(b.max.z)] : null);

function quat(q) {
  // q and -q are the same turn: make the first clearly non-zero of w, x, y, z positive
  let { x, y, z, w } = q;
  const lead = [w, x, y, z].find((c) => Math.abs(c) > 1e-9) || 0;
  if (lead < 0) { x = -x; y = -y; z = -z; w = -w; }
  return [r4(x), r4(y), r4(z), r4(w)];
}

/** Deep copy of plain data with every number rounded. */
function plain(v) {
  if (typeof v === 'number') return r4(v);
  if (v === null || typeof v !== 'object') return v;
  if (v.isVector3) return v3(v);
  if (v.isBox3) return box6(v);
  if (Array.isArray(v)) return v.map(plain);
  const out = {};
  for (const k of Object.keys(v)) if (typeof v[k] !== 'function') out[k] = plain(v[k]);
  return out;
}

// -------------------------------------------------------- instrumentation ---

/**
 * Count every draw from a seeded generator held in `proto[prop]`. The
 * constructor's `this[prop] = generator` assignment lands on a setter on the
 * prototype, which keeps a counting wrapper on the instance instead. Game code
 * reads and calls `this[prop]` exactly as before and gets the same values.
 */
function countDraws(proto, prop, slot) {
  const wrap = (f) => (typeof f !== 'function' ? f : function () {
    if (REC) REC.draws[slot]++;
    return f.apply(this, arguments);
  });
  Object.defineProperty(proto, prop, {
    configurable: true,
    get() { return undefined; },
    set(fn) {
      let current = wrap(fn);
      Object.defineProperty(this, prop, {
        configurable: true,
        enumerable: true,
        get() { return current; },
        set(next) { current = wrap(next); if (REC) REC.reassigned[slot]++; }
      });
    }
  });
}

function countObjects(root) {
  let n = 0;
  root.traverse(() => { n++; });
  return n - 1;
}

function counters(world, slot, withObjects) {
  const c = {
    draws: REC.draws[slot],
    random: ambient.draws,
    colliders: (world.colliders || []).length,
    platforms: (world.platforms || []).length,
    exclusions: (world.vegetationExclusions || []).length,
    water: (world.waterRects || []).length
  };
  if (withObjects) c.objects = world.scene ? countObjects(world.scene) : 0;
  return c;
}

/**
 * Record what every build* / create* call adds: each top-level call (with
 * the scene objects it added) in order, and per method the number of calls
 * and their inclusive totals, so a split of a nested builder (F2.4) shows
 * under its own name.
 */
function trackPhases(proto, group, slot, worldOf) {
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (!/^(build|create)[A-Z]/.test(name)) continue;
    const desc = Object.getOwnPropertyDescriptor(proto, name);
    if (!desc || typeof desc.value !== 'function') continue;
    const original = desc.value;
    const key = `${group}.${name}`;
    proto[name] = function (...args) {
      if (!REC) return original.apply(this, args);
      const world = worldOf(this);
      const top = REC.depth === 0;
      const before = counters(world, slot, top);
      let sum = REC.calls.get(key); // created on the first call, so parents list before children
      if (!sum) REC.calls.set(key, sum = { calls: 0 });
      REC.depth++;
      try { return original.apply(this, args); } finally {
        REC.depth--;
        const after = counters(world, slot, top);
        if (top) REC.phases[group].push([name, before, after]);
        sum.calls++;
        for (const k of Object.keys(before)) if (k !== 'objects') sum[k] = (sum[k] || 0) + after[k] - before[k];
      }
    };
  }
}

/** Remember the exact rect of each function platform the helpers create. */
function trackPlatformHelpers(proto) {
  const corners = (parent, x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => {
    const p = new THREE.Vector3(x, 0, z).applyMatrix4(parent.matrixWorld);
    return [r4(p.x), r4(p.z)];
  });
  const oriented = proto.addOrientedPlatform;
  if (typeof oriented === 'function') {
    proto.addOrientedPlatform = function (parent, bounds, topY, options) {
      const result = oriented.apply(this, arguments);
      if (REC && result) {
        REC.platformInfo.set(result, {
          via: 'oriented', top: r4(topY),
          rect: corners(parent, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ)
        });
      }
      return result;
    };
  }
  const sloped = proto.addSlopedRoofPlatforms;
  if (typeof sloped === 'function') {
    proto.addSlopedRoofPlatforms = function (parent, roofY, w, d, ridgeH, overhang) {
      const start = this.platforms.length;
      const result = sloped.apply(this, arguments);
      if (REC) {
        const halfW = w / 2 + overhang, halfD = d / 2 + overhang;
        this.platforms.slice(start).forEach((pf, i, added) => {
          const side = added.length === 2 ? (i === 0 ? -1 : 1) : 0;
          REC.platformInfo.set(pf, {
            via: 'sloped', side, eave: r4(roofY + 0.08), ridge: r4(roofY + ridgeH + 0.08),
            rect: corners(parent, -halfW, halfW, side > 0 ? 0 : -halfD, side < 0 ? 0 : halfD)
          });
        });
      }
      return result;
    };
  }
}

/** Snapshot the scene just before the static architecture is merged away. */
function trackMerge(proto) {
  const merge = proto._mergeStatics;
  if (typeof merge !== 'function') return;
  proto._mergeStatics = function () {
    if (REC && !REC.premerge) {
      const t0 = realNow();
      this.scene.updateMatrixWorld(true);
      REC.premerge = true;
      walkChildren(REC.walk, this.scene, '', null);
      REC.walkMs += realNow() - t0;
    }
    return merge.apply(this, arguments);
  };
}

function instrument() {
  countDraws(Countryside.prototype, 'rng', 'valley');
  countDraws(HiddenPlaces.prototype, 'rand', 'hidden');
  trackPhases(Countryside.prototype, 'countryside', 'valley', (self) => self);
  trackPhases(HiddenPlaces.prototype, 'hidden', 'hidden', (self) => self.city || self);
  trackPlatformHelpers(Countryside.prototype);
  trackMerge(Countryside.prototype);
}

// ------------------------------------------------------------- the walk ---

const ROOT = '(root)';
const renderable = (o) => !!(o.isMesh || o.isPoints || o.isLine || o.isSprite);
const flags = (o) => (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');

function matSig(m) {
  if (Array.isArray(m)) return m.map(matSig).join(' + ');
  if (!m) return 'none';
  let s = String(m.type || 'Material').replace(/^Mesh/, '').replace(/Material$/, '') || 'Material';
  if (m.color) s += ' #' + m.color.getHexString();
  if (m.emissive && m.emissive.getHex()) s += ' e#' + m.emissive.getHexString() + '*' + r4(m.emissiveIntensity);
  if (typeof m.roughness === 'number') s += ' r' + r4(m.roughness);
  if (m.metalness) s += ' m' + r4(m.metalness);
  if (m.map) s += ' map';
  if (m.normalMap) s += ' nrm';
  if (m.vertexColors) s += ' vc';
  if (m.transparent) s += ' t' + r4(m.opacity);
  if (m.side === THREE.DoubleSide) s += ' 2s';
  else if (m.side === THREE.BackSide) s += ' back';
  if (m.blending === THREE.AdditiveBlending) s += ' add';
  if (m.flatShading) s += ' flat';
  return s;
}

function newAcc() {
  return {
    n: 0, sx: 0, sy: 0, sz: 0, xx: 0, yy: 0, zz: 0, xy: 0, xz: 0, yz: 0,
    x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity
  };
}

/** Add every vertex of `geometry`, transformed by `matrix` (or not), to `acc`. */
function accumulate(acc, geometry, matrix) {
  const pos = geometry && geometry.attributes && geometry.attributes.position;
  if (!pos) return acc;
  const e = matrix ? matrix.elements : null;
  for (let i = 0, n = pos.count; i < n; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (e) {
      const tx = e[0] * x + e[4] * y + e[8] * z + e[12];
      const ty = e[1] * x + e[5] * y + e[9] * z + e[13];
      const tz = e[2] * x + e[6] * y + e[10] * z + e[14];
      x = tx; y = ty; z = tz;
    }
    acc.n++;
    acc.sx += x; acc.sy += y; acc.sz += z;
    acc.xx += x * x; acc.yy += y * y; acc.zz += z * z;
    acc.xy += x * y; acc.xz += x * z; acc.yz += y * z;
    if (x < acc.x0) acc.x0 = x; if (x > acc.x1) acc.x1 = x;
    if (y < acc.y0) acc.y0 = y; if (y > acc.y1) acc.y1 = y;
    if (z < acc.z0) acc.z0 = z; if (z > acc.z1) acc.z1 = z;
  }
  return acc;
}

function mergeAcc(into, a) {
  into.n += a.n;
  for (const k of ['sx', 'sy', 'sz', 'xx', 'yy', 'zz', 'xy', 'xz', 'yz']) into[k] += a[k];
  into.x0 = Math.min(into.x0, a.x0); into.y0 = Math.min(into.y0, a.y0); into.z0 = Math.min(into.z0, a.z0);
  into.x1 = Math.max(into.x1, a.x1); into.y1 = Math.max(into.y1, a.y1); into.z1 = Math.max(into.z1, a.z1);
  return into;
}

/** { v, box, c, cov }: count, bounds, centroid, covariance (xx yy zz xy xz yz). */
function accStats(acc) {
  if (!acc.n) return { v: 0 };
  const n = acc.n, cx = acc.sx / n, cy = acc.sy / n, cz = acc.sz / n;
  return {
    v: n,
    box: [acc.x0, acc.y0, acc.z0, acc.x1, acc.y1, acc.z1].map(r4),
    c: [cx, cy, cz].map(r4),
    cov: [acc.xx / n - cx * cx, acc.yy / n - cy * cy, acc.zz / n - cz * cz,
      acc.xy / n - cx * cy, acc.xz / n - cx * cz, acc.yz / n - cy * cz].map(r4)
  };
}

function instStats(mesh) {
  const a = mesh.instanceMatrix.array, n = mesh.count;
  const lin = new Array(9).fill(0), t = [0, 0, 0];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const L = [0, 1, 2, 4, 5, 6, 8, 9, 10];
  for (let k = 0; k < n; k++) {
    const o = k * 16;
    for (let j = 0; j < 9; j++) lin[j] += a[o + L[j]];
    for (let j = 0; j < 3; j++) {
      const v = a[o + 12 + j];
      t[j] += v;
      if (v < lo[j]) lo[j] = v;
      if (v > hi[j]) hi[j] = v;
    }
  }
  const out = { n };
  if (mesh.instanceMatrix.count !== n) out.cap = mesh.instanceMatrix.count;
  if (n) {
    out.box = [...lo, ...hi].map(r4);
    out.c = t.map((v) => r4(v / n));
    out.lin = lin.map((v) => r4(v / n));
    if (mesh.instanceColor) {
      const c = mesh.instanceColor.array, col = [0, 0, 0];
      for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) col[j] += c[k * 3 + j];
      out.col = col.map((v) => r4(v / n));
    }
  }
  return out;
}

const _p = () => new THREE.Vector3();
const _q = () => new THREE.Quaternion();

function namedRecord(o) {
  const P = _p(), Q = _q(), S = _p();
  o.matrixWorld.decompose(P, Q, S);
  const rec = { p: v3(P), q: quat(Q), s: v3(S) };
  if (!o.visible) rec.hidden = 1;
  if (renderable(o)) {
    rec.mat = matSig(o.material);
    rec.f = flags(o);
    if (!o.isSprite && o.geometry) {
      const g = accStats(accumulate(newAcc(), o.geometry, null));
      if (o.geometry.index) g.i = o.geometry.index.count;
      rec.g = g;
    }
    if (o.isInstancedMesh) rec.inst = instStats(o);
  }
  return rec;
}

function memberRecord(o, agg, anchor) {
  const rel = new THREE.Matrix4();
  if (anchor) rel.copy(anchor.matrixWorld).invert().multiply(o.matrixWorld);
  else rel.copy(o.matrixWorld);
  const acc = newAcc();
  if (o.isInstancedMesh) {
    const im = new THREE.Matrix4(), m = new THREE.Matrix4();
    for (let k = 0; k < o.count; k++) {
      o.getMatrixAt(k, im);
      accumulate(acc, o.geometry, m.multiplyMatrices(rel, im));
    }
  } else {
    accumulate(acc, o.geometry, rel);
  }
  const mat = matSig(o.material);
  return {
    agg, acc, mat, cast: !!o.castShadow, recv: !!o.receiveShadow, hidden: !o.visible,
    sig: JSON.stringify(accStats(acc)) + '|' + mat + '|' + flags(o) + (o.visible ? '' : '|h')
  };
}

function newWalk() {
  return { seen: new Map(), keyOf: new WeakMap(), visited: new WeakSet(), objects: [], members: [] };
}

function visit(W, o, parentKey, anchor) {
  W.visited.add(o);
  let key = parentKey, anc = anchor;
  if (o.name) {
    const base = parentKey ? parentKey + '/' + o.name : o.name;
    const n = (W.seen.get(base) || 0) + 1;
    W.seen.set(base, n);
    key = n === 1 ? base : base + '#' + n;
    W.keyOf.set(o, key);
    W.objects.push([key, namedRecord(o)]);
    anc = o;
  } else if (renderable(o)) {
    W.members.push(memberRecord(o, parentKey || ROOT, anchor));
  }
  walkChildren(W, o, key, anc);
}

function walkChildren(W, parent, parentKey, anchor) {
  for (const child of parent.children) visit(W, child, parentKey, anchor);
}

function bakedRecords(scene, W) {
  const out = [], seen = new Map();
  scene.traverse((o) => {
    if (!o.isMesh || !/^Baked Statics \d+$/.test(o.name) || W.visited.has(o)) return;
    W.visited.add(o);
    const parentKey = o.parent === scene ? ROOT : (W.keyOf.get(o.parent) || '(unnamed parent)');
    const attrs = Object.keys(o.geometry.attributes).sort().join(',');
    const base = `${parentKey} | ${matSig(o.material)} | ${flags(o) || '-'} | ${attrs}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const g = accStats(accumulate(newAcc(), o.geometry, null));
    if (o.geometry.index) g.i = o.geometry.index.count;
    const uv = o.geometry.attributes.uv;
    if (uv) {
      let su = 0, sv = 0;
      for (let i = 0; i < uv.count; i++) { su += uv.getX(i); sv += uv.getY(i); }
      g.uv = [r4(su / uv.count), r4(sv / uv.count)];
    }
    out.push([n === 1 ? base : base + ' #' + n, g]);
  });
  return out;
}

// -------------------------------------------------------------- platforms ---

function probePlatform(pf, info) {
  const at = (x, z, m) => {
    let v;
    try { v = pf.getHeightAt(x, z, m); } catch { return null; }
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const grow = (x, z) => {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  };
  if (info && info.rect) {
    for (const [x, z] of info.rect) grow(x, z);
  } else {
    // A 0.5 m lattice with a 0.4 m margin hits any rectangle, however thin.
    for (let i = -128; i <= 128; i++) {
      for (let j = -128; j <= 128; j++) if (at(i / 2, j / 2, 0.4) !== null) grow(i / 2, j / 2);
    }
  }
  if (x0 === Infinity) return { n: 0 };
  const I0 = Math.floor((x0 - 0.6) * 10), I1 = Math.ceil((x1 + 0.6) * 10);
  const J0 = Math.floor((z0 - 0.6) * 10), J1 = Math.ceil((z1 + 0.6) * 10);
  let n = 0, hmin = Infinity, hmax = -Infinity, hsum = 0, cx = 0, cz = 0;
  let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
  for (let i = I0; i <= I1; i++) {
    const x = i / 10;
    for (let j = J0; j <= J1; j++) {
      const z = j / 10;
      const h = at(x, z, 0);
      if (h === null) continue;
      n++; hsum += h; cx += x; cz += z;
      if (h < hmin) hmin = h; if (h > hmax) hmax = h;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
      if (z < bz0) bz0 = z; if (z > bz1) bz1 = z;
    }
  }
  if (!n) return { n: 0 };
  const out = { n, box: [bx0, bz0, bx1, bz1].map(r4), h: [hmin, hmax, hsum / n].map(r4) };
  if (typeof pf.getNormalAt === 'function') {
    try { out.nrm = v3(pf.getNormalAt(cx / n, cz / n)); } catch { out.nrm = 'throws'; }
  }
  return out;
}

function platformRecord(pf, infos) {
  if (pf && pf.isBox3) return { box: box6(pf) };
  const rec = {};
  if (!pf || typeof pf !== 'object') return { odd: String(pf) };
  if (pf.requiredAbility != null) rec.ability = pf.requiredAbility;
  if (pf.requiredRank != null) rec.rank = pf.requiredRank;
  if (typeof pf.enabled === 'function') rec.gated = 1;
  const info = infos.get(pf);
  if (info) Object.assign(rec, info);
  if (typeof pf.getHeightAt === 'function') rec.probe = probePlatform(pf, info);
  else if (pf.min && pf.max) rec.box = box6(pf);
  return rec;
}

// ---------------------------------------------------------------- anchors ---

function anchorsOf(city, hidden, ca, W) {
  const wpos = (o) => (o && o.isObject3D ? v3(o.getWorldPosition(new THREE.Vector3())) : null);
  const keyOf = (o) => (o ? W.keyOf.get(o) || '(unnamed)' : null);
  const handle = (o) => (o ? { key: keyOf(o), p: wpos(o), ...(o.visible ? {} : { hidden: 1 }) } : null);
  const colliderIndex = (b) => (b ? city.colliders.indexOf(b) : null);
  const houses = city.villageHouseColliders || { left: [], right: [] };
  const houseLabel = (b) => {
    for (const side of ['left', 'right']) {
      const i = (houses[side] || []).indexOf(b);
      if (i >= 0) return `${side}[${i}]`;
    }
    return box6(b);
  };
  const kind = (u) => ['isCharm', 'isCorralReward', 'isOfferingBell', 'isCollectible'].filter((k) => u && u[k]).join(',');
  const g = city.corralGuardian;
  return {
    napSpotPos: v3(city.napSpotPos),
    nestPos: v3(city.nestPos),
    secretKeyPos: v3(city.secretKeyPos),
    mistAltarPos: v3(city.mistAltarPos),
    chimePos: v3(city.chimePos),
    toriiTopPos: v3(city.toriiTopPos),
    secretDoorWorldPos: v3(city.secretDoorWorldPos),
    secretDoorSpawnPos: v3(city.secretDoorSpawnPos),
    secretDoorOutHeading: r4(city.secretDoorOutHeading),
    doorCollider: city.doorCollider ? { i: colliderIndex(city.doorCollider), box: box6(city.doorCollider) } : null,
    boundaryRadius: r4(city.boundaryRadius),
    lanternLightCount: city.lanternLightCount,
    handles: {
      secretKeyMesh: handle(city.secretKeyMesh),
      secretDoorMesh: handle(city.secretDoorMesh),
      lockPlate: handle(city.lockPlate),
      fishMesh: handle(city.fishMesh),
      nestMesh: handle(city.nestMesh),
      nestFeatherMesh: handle(city.nestFeatherMesh),
      corralRewardMesh: handle(city.corralRewardMesh),
      shishiRocker: handle(city.shishiRocker),
      mistAltar: handle(city.mistAltar),
      windChime: handle(city.windChime),
      groundMesh: handle(city.groundMesh),
      edgeForestTrunks: handle(city.edgeForestTrunks)
    },
    collectibles: (city.collectibles || []).map((o) => ({
      key: keyOf(o), p: wpos(o), id: o.userData ? o.userData.id : null, kind: kind(o.userData), ...(o.visible ? {} : { hidden: 1 })
    })),
    offeringBells: (city.offeringBells || []).map(keyOf),
    lanterns: (city.lanterns || []).map((l) => ({ key: keyOf(l.group), p: wpos(l.group), baseY: r4(l.baseY), phase: r4(l.phase) })),
    toroSpots: (city.toroSpots || []).map(v3),
    corralGuardian: g ? {
      name: g.name, key: keyOf(g.mesh), p: wpos(g.mesh), home: v3(g.home),
      bounds: g.bounds ? [g.bounds.minX, g.bounds.maxX, g.bounds.minZ, g.bounds.maxZ].map(r4) : null,
      radius: r4(g.radius), speed: r4(g.speed)
    } : null,
    bambooFences: (city.bambooFences || []).map((f) => ({
      key: keyOf(f.mesh), role: f.role, collider: colliderIndex(f.collider), connects: (f.connects || []).map(houseLabel)
    })),
    bushColliderSpots: (city.bushColliderSpots || []).map((s) => s.map(r4)),
    shrineThicketTrees: (city.shrineThicketTrees || []).map((t) => ({
      x: r4(t.x), z: r4(t.z), s: r4(t.s), sy: r4(t.sy), side: t.side, idx: t.idx, trunkIdx: t.trunkIdx, collider: colliderIndex(t.box)
    })),
    shrineThicketBushes: (city.shrineThicketBushes || []).map((b) => ({
      x: r4(b.x), z: r4(b.z), y: r4(b.y), sx: r4(b.sx), sy: r4(b.sy), sz: r4(b.sz), side: b.side, i: b.i, collider: colliderIndex(b.box)
    })),
    hidden: {
      pool: handle(hidden.poolGroup),
      glade: handle(hidden.gladeGroup),
      lanterns: (hidden.lanterns || []).map((l) => ({
        p: wpos(l.lamp), base: r4(l.base), onset: r4(l.onset), phase: r4(l.phase), ix: r4(l.ix), iz: r4(l.iz)
      })),
      stalkTops: (hidden.stalkTops || []).map((s) => [s.x, s.y, s.z, s.a].map(r4))
    },
    restSpots: (ca.restSpots || []).map((s) => ({
      id: s.id, name: s.name, p: v3(s.pos), ...(s.requiredRank != null ? { rank: s.requiredRank } : {}), ...(s.hidden ? { hidden: 1 } : {})
    })),
    shrinePoint: v3(ca.shrinePoint)
  };
}

// ---------------------------------------------------------------- a build ---

function newRecorder() {
  return {
    draws: { valley: 0, hidden: 0 }, reassigned: { valley: 0, hidden: 0 },
    depth: 0, phases: { countryside: [], hidden: [] }, calls: new Map(), platformInfo: new WeakMap(),
    premerge: false, walk: newWalk(), walkMs: 0
  };
}

function phaseTable(list) {
  const out = {}, seen = new Map();
  for (const [name, a, b] of list) {
    const n = (seen.get(name) || 0) + 1;
    seen.set(name, n);
    const d = {};
    for (const k of Object.keys(a)) d[k] = b[k] - a[k];
    out[n === 1 ? name : name + '#' + n] = d;
  }
  return out;
}

/** Build the valley once and reduce it to plain data. */
function buildOnce(spec) {
  setAmbient(spec);
  const rec = REC = newRecorder();
  const t0 = realNow();
  let city, hidden, ca, scene;
  try {
    scene = new THREE.Scene();
    city = new Countryside(scene, countrysideOptions(params));
    // Hidden places register their clearings before Vegetation would read them (main.js)
    hidden = new HiddenPlaces(scene, city, countrysideOptions(params));
    // The rest spots: ContextActionManager's own, then the two hidden ones
    ca = new ContextActionManager({ scene: new THREE.Scene() }, city, null, null, null);
    hidden.attach({ audio: null, contextActions: ca, ui: null, progression: null, discover: () => false });
  } finally {
    REC = null;
  }
  const ambientDraws = ambient.draws;
  const buildMs = realNow() - t0 - rec.walkMs; // the valley alone, without the pre-merge walk
  const W = rec.walk;
  const warnings = [];
  scene.updateMatrixWorld(true);
  if (!rec.premerge) {
    warnings.push('Countryside._mergeStatics() never ran: objects were read after the build instead');
    walkChildren(W, scene, '', null);
  }
  // Hidden places (built after the merge), then the merge's own meshes, then
  // anything else that appeared after the merge.
  if (hidden.group && !W.visited.has(hidden.group)) visit(W, hidden.group, '', null);
  const baked = bakedRecords(scene, W);
  scene.traverse((o) => {
    if (o === scene || W.visited.has(o)) return;
    if (o.parent !== scene && !W.visited.has(o.parent)) return; // inside a subtree visited below
    let anchor = o.parent;
    while (anchor && anchor !== scene && !W.keyOf.has(anchor)) anchor = anchor.parent;
    const named = anchor && anchor !== scene ? anchor : null;
    warnings.push(`object added after the merge: ${o.name || o.type} under ${named ? W.keyOf.get(named) : ROOT}`);
    visit(W, o, named ? W.keyOf.get(named) : '', named);
  });

  // The stream position: one probe draw must equal draw N+1 of a fresh stream.
  const fresh = mulberry32(city.seed);
  for (let i = 0; i < rec.draws.valley; i++) fresh();
  const probeOk = typeof city.rng === 'function' && city.rng() === fresh();

  const footprint = {
    colliders: city.colliders.map(box6),
    houseColliders: {
      left: ((city.villageHouseColliders || {}).left || []).map(box6),
      right: ((city.villageHouseColliders || {}).right || []).map(box6)
    },
    platforms: city.platforms.map((pf) => platformRecord(pf, rec.platformInfo)),
    waterRects: city.waterRects.map((r) => plain(r)),
    water: {
      bridgeDeck: plain(city.bridgeDeckWaterClearance || null),
      bridgeRamps: plain(city.bridgeRampWaterExclusions || [])
    },
    exclusions: city.vegetationExclusions.map((e) => [e.x, e.z, e.width, e.depth].map(r4)),
    samples: { path: (city.pathSamples || []).map(v3), river: (city.riverSamples || []).map(v3) },
    anchors: anchorsOf(city, hidden, ca, W)
  };
  const rng = {
    valley: {
      seed: city.seed, draws: rec.draws.valley, probe: probeOk,
      ...(rec.reassigned.valley ? { reassigned: rec.reassigned.valley } : {})
    },
    hidden: { draws: rec.draws.hidden },
    // Math.random() calls made by game code during the build (not three.js UUIDs)
    ambient: { draws: ambientDraws }
  };
  const builders = {
    countryside: phaseTable(rec.phases.countryside),
    hidden: phaseTable(rec.phases.hidden),
    calls: Object.fromEntries(rec.calls)
  };
  return {
    label: spec.label, buildMs, warnings, rng, builders, footprint, baked,
    objects: W.objects, members: W.members,
    collectibles: (city.collectibles || []).length, lanterns: (city.lanterns || []).length
  };
}

// ---------------------------------------------------------- the digest ---

function aggregates(members, volatile) {
  const groups = new Map();
  members.forEach((m, i) => {
    let g = groups.get(m.agg);
    if (!g) groups.set(m.agg, g = { acc: newAcc(), n: 0, mats: new Map(), cast: 0, recv: 0, hidden: 0, vol: 0 });
    if (volatile.has(i)) { g.vol++; return; }
    g.n++;
    mergeAcc(g.acc, m.acc);
    g.mats.set(m.mat, (g.mats.get(m.mat) || 0) + 1);
    if (m.cast) g.cast++;
    if (m.recv) g.recv++;
    if (m.hidden) g.hidden++;
  });
  const out = {};
  for (const [key, g] of groups) {
    const s = accStats(g.acc);
    out[key] = {
      n: g.n, ...s,
      mats: [...g.mats].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([m, k]) => `${m} x${k}`),
      shadow: [g.cast, g.recv],
      ...(g.hidden ? { hidden: g.hidden } : {}),
      ...(g.vol ? { vol: g.vol } : {})
    };
  }
  return out;
}

function assemble(build, volatile, sceneNote) {
  const aggs = aggregates(build.members, volatile);
  const fp = build.footprint;
  return {
    format: FORMAT,
    version: VERSION,
    scene: sceneNote,
    seed: build.rng.valley.seed,
    counts: {
      objects: build.objects.length,
      aggregates: Object.keys(aggs).length,
      members: build.members.length,
      baked: build.baked.length,
      colliders: fp.colliders.length,
      platforms: fp.platforms.length,
      waterRects: fp.waterRects.length,
      exclusions: fp.exclusions.length,
      collectibles: build.collectibles,
      lanterns: build.lanterns,
      draws: build.rng.valley.draws
    },
    rng: build.rng,
    builders: build.builders,
    colliders: fp.colliders,
    houseColliders: fp.houseColliders,
    platforms: fp.platforms,
    waterRects: fp.waterRects,
    water: fp.water,
    exclusions: fp.exclusions,
    samples: fp.samples,
    anchors: fp.anchors,
    objects: Object.fromEntries(build.objects),
    aggregates: aggs,
    baked: Object.fromEntries(build.baked)
  };
}

/** `a` with every leaf that differs from `b` replaced by "~". */
function mask(a, b, path, report) {
  if (a === b) return a;
  const isObj = (v) => v !== null && typeof v === 'object';
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mask(v, b[i], path.concat(i), report));
  if (isObj(a) && isObj(b) && !Array.isArray(a) && !Array.isArray(b)) {
    const out = {};
    for (const k of Object.keys(a)) {
      if (k in b) out[k] = mask(a[k], b[k], path.concat(k), report);
      else { out[k] = a[k]; report.unstable.push(path.concat(k)); }
    }
    for (const k of Object.keys(b)) if (!(k in a)) report.unstable.push(path.concat(k));
    return out;
  }
  if (isObj(a) || isObj(b)) { report.unstable.push(path); return a; }
  report.leaves.push(path);
  return '~';
}

function finalize(A, B, sceneNote) {
  const volatile = new Set();
  const unstable = [];
  const n = Math.min(A.members.length, B.members.length);
  if (A.members.length !== B.members.length) unstable.push(['members', `${A.members.length} vs ${B.members.length}`]);
  for (let i = 0; i < n; i++) {
    if (A.members[i].agg !== B.members[i].agg) { unstable.push(['members', i]); volatile.add(i); continue; }
    if (A.members[i].sig !== B.members[i].sig) volatile.add(i);
  }
  const DA = assemble(A, volatile, sceneNote), DB = assemble(B, volatile, sceneNote);
  const report = { leaves: [], unstable };
  const digest = mask(DA, DB, [], report);
  const local = new Map(), memberPaths = [];
  A.members.forEach((m, i) => {
    const k = local.get(m.agg) || 0;
    local.set(m.agg, k + 1);
    if (volatile.has(i)) memberPaths.push(`aggregates[${JSON.stringify(m.agg)}] member ${k}`);
  });
  digest.volatile = {
    note: 'values that differ between two builds with different Math.random seeds and clocks: written as "~"; unnamed members left out of their aggregate (vol)',
    leaves: report.leaves.length,
    members: volatile.size,
    paths: report.leaves.map(fmtPath).concat(memberPaths).slice(0, 80)
  };
  return { digest, unstable: report.unstable.map(fmtPath) };
}

// -------------------------------------------------------------- the text ---

const ENTRY_SECTIONS = new Set(['objects', 'aggregates', 'baked', 'colliders', 'platforms', 'waterRects', 'exclusions']);

// One entry per line: the document and its sections always open up; below
// that, a list or map of records (builders.countryside, anchors.collectibles,
// samples.path …) opens up and every record stays on one line.
function expandAt(path, v) {
  if (v === null || typeof v !== 'object') return false;
  const children = Array.isArray(v) ? v : Object.values(v);
  if (!children.length) return false;
  if (path.length <= 1) return true;
  if (ENTRY_SECTIONS.has(path[0]) || path.length > 3) return false;
  return children.every((c) => c === null || typeof c === 'object') && children.some((c) => c !== null);
}

function format(v, path, indent) {
  if (!expandAt(path, v)) return JSON.stringify(v === undefined ? null : v);
  const pad = ' '.repeat(indent + 1);
  if (Array.isArray(v)) {
    return '[\n' + v.map((c, i) => pad + format(c, path.concat(i), indent + 1)).join(',\n') + '\n' + ' '.repeat(indent) + ']';
  }
  const keys = Object.keys(v).filter((k) => v[k] !== undefined);
  return '{\n' + keys.map((k) => pad + JSON.stringify(k) + ': ' + format(v[k], path.concat(k), indent + 1)).join(',\n') +
    '\n' + ' '.repeat(indent) + '}';
}

const toText = (digest) => format(digest, [], 0) + '\n';

// -------------------------------------------------------------- the diff ---

function fmtPath(path) {
  let s = '';
  for (const seg of path) {
    if (typeof seg === 'number') s += `[${seg}]`;
    else if (/^\d+→\d+$/.test(seg)) s += `[${seg}]`;
    else if (/^[A-Za-z_$][\w$]*$/.test(seg)) s += (s ? '.' : '') + seg;
    else s += `[${JSON.stringify(seg)}]`;
  }
  return s;
}

const isPlainObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k]));
}

function stable(v) {
  if (!isPlainObj(v)) return Array.isArray(v) ? '[' + v.map(stable).join(',') + ']' : JSON.stringify(v);
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}

function short(v, max = 110) {
  const s = JSON.stringify(v);
  return s === undefined ? 'undefined' : s.length > max ? s.slice(0, max - 1) + '…' : s;
}

const num = (v) => typeof v === 'number';
function deltaNote(a, b) {
  if (num(a) && num(b)) return `Δ ${r4(b - a)}`;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(num) && b.every(num)) {
    let worst = 0, at = 0;
    a.forEach((v, i) => { const d = Math.abs(b[i] - v); if (d > worst) { worst = d; at = i; } });
    return `max |Δ| ${r4(worst)} at [${at}]`;
  }
  return '';
}

function fieldNote(a, b) {
  if (!isPlainObj(a) || !isPlainObj(b)) return deltaNote(a, b);
  const parts = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (deepEqual(a[k], b[k])) continue;
    if (!(k in a)) { parts.push(`+${k}`); continue; }
    if (!(k in b)) { parts.push(`-${k}`); continue; }
    const x = a[k], y = b[k];
    const vec = (v, n) => Array.isArray(v) && v.length === n && v.every(num);
    if (k === 'p' && vec(x, 3) && vec(y, 3)) parts.push(`p moved ${r4(Math.hypot(y[0] - x[0], y[1] - x[1], y[2] - x[2]))} m`);
    else if (k === 'q' && vec(x, 4) && vec(y, 4)) {
      const dot = Math.min(1, Math.abs(x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3]));
      parts.push(`q turned ${r4((2 * Math.acos(dot) * 180) / Math.PI)}°`);
    } else if (!isPlainObj(x) && short(x, 40).length < 40 && short(y, 40).length < 40) parts.push(`${k} ${short(x)} → ${short(y)}`);
    else {
      const sub = isPlainObj(x) && isPlainObj(y)
        ? Object.keys({ ...x, ...y }).filter((s) => !deepEqual(x[s], y[s])) : [];
      parts.push(sub.length ? `${k}.{${sub.join(',')}}` : k);
    }
  }
  return parts.join('; ');
}

/** Longest common subsequence alignment of two string lists → ops. */
function align(A, B) {
  const ops = [];
  let s = 0;
  while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let e = 0;
  while (e < A.length - s && e < B.length - s && A[A.length - 1 - e] === B[B.length - 1 - e]) e++;
  for (let i = 0; i < s; i++) ops.push(['=', i, i]);
  const N = A.length - s - e, M = B.length - s - e;
  if (N * M > 4e6) {
    for (let k = 0; k < Math.max(N, M); k++) {
      if (k < N && k < M) ops.push(A[s + k] === B[s + k] ? ['=', s + k, s + k] : ['~', s + k, s + k]);
      else if (k < N) ops.push(['-', s + k, null]);
      else ops.push(['+', null, s + k]);
    }
  } else if (N || M) {
    const L = new Uint32Array((N + 1) * (M + 1));
    const W = M + 1;
    for (let i = N - 1; i >= 0; i--) {
      for (let j = M - 1; j >= 0; j--) {
        L[i * W + j] = A[s + i] === B[s + j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
      }
    }
    let i = 0, j = 0;
    const run = { del: [], ins: [] };
    const flush = () => {
      const k = Math.min(run.del.length, run.ins.length);
      for (let t = 0; t < k; t++) ops.push(['~', run.del[t], run.ins[t]]);
      for (let t = k; t < run.del.length; t++) ops.push(['-', run.del[t], null]);
      for (let t = k; t < run.ins.length; t++) ops.push(['+', null, run.ins[t]]);
      run.del = []; run.ins = [];
    };
    while (i < N || j < M) {
      if (i < N && j < M && A[s + i] === B[s + j]) { flush(); ops.push(['=', s + i, s + j]); i++; j++; }
      else if (j >= M || (i < N && L[(i + 1) * W + j] >= L[i * W + j + 1])) { run.del.push(s + i); i++; }
      else { run.ins.push(s + j); j++; }
    }
    flush();
  }
  for (let k = 0; k < e; k++) ops.push(['=', A.length - e + k, B.length - e + k]);
  return ops;
}

const ENTRY_MAPS = /^(objects|aggregates|baked|anchors\.handles|builders\.\w+)$/;
// Changes are listed causes first: the stream and the builders, then what
// they produced; the counts (already in the summary) last.
const DIFF_ORDER = ['format', 'version', 'scene', 'seed', 'rng', 'builders', 'colliders', 'houseColliders', 'platforms',
  'waterRects', 'water', 'exclusions', 'samples', 'anchors', 'objects', 'aggregates', 'baked', 'counts', 'volatile'];

/** Where a change starts: the first builder (in build order) and the methods whose totals moved. */
function whereNote(gold, fresh) {
  const b0 = (gold && gold.builders) || {}, b1 = (fresh && fresh.builders) || {};
  const changed = (a, b) => (isPlainObj(a) && isPlainObj(b) ? [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => !deepEqual(a[k], b[k]))
    .map((k) => `${k} (${!(k in a) ? 'new' : !(k in b) ? 'gone' : fieldNote(a[k], b[k])})`) : []);
  const where = [];
  for (const group of ['countryside', 'hidden']) {
    const first = changed(b0[group], b1[group])[0];
    if (first) where.push(`first ${group} builder to change: ${first}`);
  }
  const calls = changed(b0.calls, b1.calls);
  if (calls.length) where.push(`methods whose totals changed: ${calls.slice(0, 8).join(', ')}${calls.length > 8 ? `, … ${calls.length - 8} more` : ''}`);
  return where;
}

// Which method a draw or a collider is attributed to is not output: a
// faithful split may move a draw from createChochinLantern into a layout step
// and keep the stream order. `builders` is shown to explain a difference but
// is not part of the verdict; the stream position (rng) is.
const ADVISORY = new Set(['builders']);

/** Lists that hold the same entries in another order. */
function reordered(gold, fresh) {
  const notes = [];
  for (const k of ['colliders', 'platforms', 'exclusions', 'waterRects']) {
    const a = gold && gold[k], b = fresh && fresh[k];
    if (!Array.isArray(a) || !Array.isArray(b) || deepEqual(a, b) || a.length !== b.length) continue;
    const sa = a.map(stable).sort(), sb = b.map(stable).sort();
    if (sa.every((s, i) => s === sb[i])) notes.push(`${k}: the same ${a.length} entries in another order`);
  }
  return notes;
}

function diffDigests(gold, fresh) {
  const out = {
    counts: { added: 0, removed: 0, changed: 0 }, sections: {}, items: [], truncated: false,
    where: whereNote(gold, fresh).concat(reordered(gold, fresh)), advisory: { count: 0, items: [] }
  };
  const note = (op, path, extra = {}) => {
    const section = String(path[0]);
    if (ADVISORY.has(section)) {
      out.advisory.count++;
      if (out.advisory.items.length < 200) out.advisory.items.push({ op, path: fmtPath(path), ...extra });
      return;
    }
    const s = out.sections[section] || (out.sections[section] = { added: 0, removed: 0, changed: 0 });
    const k = op === '+' ? 'added' : op === '-' ? 'removed' : 'changed';
    s[k]++;
    out.counts[k]++;
    if (out.items.length < MAX_STORED) out.items.push({ op, path: fmtPath(path), ...extra });
    else out.truncated = true;
  };
  const walk = (path, a, b) => {
    if (deepEqual(a, b)) return;
    if (a === undefined) return note('+', path, { to: short(b) });
    if (b === undefined) return note('-', path, { from: short(a) });
    if (isPlainObj(a) && isPlainObj(b)) {
      let keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
      if (!path.length) keys = [...DIFF_ORDER.filter((k) => keys.includes(k)), ...keys.filter((k) => !DIFF_ORDER.includes(k))];
      if (ENTRY_MAPS.test(path.join('.'))) {
        for (const k of keys) {
          if (deepEqual(a[k], b[k])) continue;
          if (!(k in a)) note('+', path.concat(k), { to: short(b[k]) });
          else if (!(k in b)) note('-', path.concat(k), { from: short(a[k]) });
          else note('~', path.concat(k), { note: fieldNote(a[k], b[k]), from: short(a[k]), to: short(b[k]) });
        }
        return;
      }
      for (const k of keys) walk(path.concat(k), a[k], b[k]);
      return;
    }
    const entries = (v) => Array.isArray(v) && v.some((c) => c !== null && typeof c === 'object');
    if (Array.isArray(a) && Array.isArray(b) && (entries(a) || entries(b))) {
      for (const [op, i, j] of align(a.map(stable), b.map(stable))) {
        if (op === '=') continue;
        if (op === '+') note('+', path.concat(j), { to: short(b[j]) });
        else if (op === '-') note('-', path.concat(i), { from: short(a[i]) });
        else note('~', path.concat(i === j ? i : `${i}→${j}`), { note: fieldNote(a[i], b[j]), from: short(a[i]), to: short(b[j]) });
      }
      return;
    }
    note('~', path, { from: short(a), to: short(b), note: deltaNote(a, b) });
  };
  walk([], gold, fresh);
  out.equal = out.counts.added + out.counts.removed + out.counts.changed === 0;
  // The same changes by kind (paths only, first 200 of each; `counts` has the totals)
  out.added = out.items.filter((it) => it.op === '+').slice(0, 200).map((it) => it.path);
  out.removed = out.items.filter((it) => it.op === '-').slice(0, 200).map((it) => it.path);
  out.changed = out.items.filter((it) => it.op === '~').slice(0, 200).map((it) => (it.note ? `${it.path}: ${it.note}` : it.path));
  return out;
}

// ------------------------------------------------------------------- run ---

const $ = (id) => document.getElementById(id);

function summaryLines(r) {
  const c = r.counts;
  const lines = [
    `scene     ${r.scene}`,
    `seed      ${r.seed}   valley draws ${c.draws}   probe ${r.probe ? 'ok' : 'FAILED'}   hidden draws ${r.hiddenDraws}`,
    `counts    objects ${c.objects} · aggregates ${c.aggregates} (${c.members} members) · baked ${c.baked}`,
    `          colliders ${c.colliders} · platforms ${c.platforms} · water rects ${c.waterRects} · exclusions ${c.exclusions}`,
    `          collectibles ${c.collectibles} · lanterns ${c.lanterns} · anchors ${r.anchors}`,
    `volatile  ${r.volatile.leaves} leaves as "~", ${r.volatile.members} members left out of aggregates` +
      ` · Math.random() draws ${r.ambient.draws}${r.ambient.uuidSeparated ? '' : ' (UUIDs NOT separated)'}`,
    `digest    ${r.digestBytes} bytes · golden ${r.golden.found ? r.golden.bytes + ' bytes' : 'missing'} (${r.golden.url})`,
    `time      import ${r.timing.importMs} ms · build ${r.timing.buildMs.join(' + ')} ms · digest ${r.timing.digestMs} ms · total ${r.timing.totalMs} ms`
  ];
  if (r.warnings.length) lines.push('', 'warnings:', ...r.warnings.map((w) => '  ' + w));
  return lines;
}

function changeLines(diff, max) {
  if (!diff) return [];
  if (diff.equal) {
    return diff.advisory.count
      ? [`builder attribution differs in ${diff.advisory.count} ${diff.advisory.count === 1 ? 'entry' : 'entries'} (not part of the verdict; --write refreshes it):`, ...diff.where]
      : [];
  }
  const lines = diff.where.length ? [...diff.where, ''] : [];
  const sections = Object.entries(diff.sections);
  if (sections.length) {
    lines.push('section'.padEnd(16) + 'added'.padStart(8) + 'removed'.padStart(9) + 'changed'.padStart(9));
    for (const [s, n] of sections) lines.push(s.padEnd(16) + String(n.added).padStart(8) + String(n.removed).padStart(9) + String(n.changed).padStart(9));
    lines.push('');
  }
  for (const it of diff.items.slice(0, max)) {
    if (it.op === '~') lines.push(`~ ${it.path}  ${it.note || ''}`.trimEnd(), `    ${it.from} → ${it.to}`);
    else lines.push(`${it.op} ${it.path}  ${it.op === '+' ? it.to : it.from}`);
  }
  const total = diff.counts.added + diff.counts.removed + diff.counts.changed;
  if (total > max) lines.push(`… ${total - max} more (${diff.truncated ? `first ${MAX_STORED} kept; ` : ''}?max=N to list more)`);
  return lines;
}

async function main() {
  const tStart = realNow();
  THREE = await import('three');
  ({ Countryside } = await import('../src/countryside.js?v=20261107a'));
  ({ HiddenPlaces } = await import('../src/hidden_places.js?v=20261107a'));
  ({ ContextActionManager } = await import('../src/context_actions.js?v=20261107a'));
  // The kit runtime (src/main.js constructs it the same way); families and
  // kit-overrides.json load only when ?assets= / ?swap= ask for the kit.
  const { AssetRuntime } = await import('../src/kit/runtime.js?v=20261107a');
  assets = new AssetRuntime({ THREE, assetSet: 'classic', search: location.search, quality: 'high' });
  await assets.preload();
  const tImport = realNow();
  instrument();
  // The UUID stream must stay apart from the game's Math.random() stream.
  const before = ambient.draws;
  THREE.MathUtils.generateUUID();
  new THREE.Object3D();
  const uuidSeparated = ambient.draws === before;

  const sceneNote = 'Countryside + HiddenPlaces (src/main.js order) + rest spots; default seed; no renderer, Vegetation or Interior';
  const builds = BUILDS.map(buildOnce);
  const tBuilt = realNow();
  const { digest, unstable } = finalize(builds[0], builds[1], sceneNote);
  const text = toText(digest);
  const warnings = [...new Set(builds.flatMap((b) => b.warnings))];
  if (unstable.length) warnings.push(`the two builds differ in shape at ${unstable.length} place(s): ${unstable.slice(0, 5).join(', ')}`);
  if (!digest.rng.valley.probe) warnings.push('rng probe failed: the counted draws do not match the stream position');
  if (!uuidSeparated) warnings.push('three.js UUID draws are not routed apart from Math.random(): ambient values may shift with object counts');

  const golden = { url: GOLDEN_URL, found: false, bytes: 0 };
  let diff = null;
  try {
    const res = await fetch(GOLDEN_URL, { cache: 'no-store' });
    if (res.ok) {
      const goldText = await res.text();
      let gold;
      try { gold = JSON.parse(goldText); } catch (error) {
        throw new Error(`the golden is not valid JSON (${error.message})`);
      }
      golden.found = true;
      golden.bytes = new TextEncoder().encode(goldText).length;
      golden.textEqual = goldText === text;
      diff = diffDigests(gold, JSON.parse(text));
    } else {
      golden.status = res.status;
      golden.error = `HTTP ${res.status}`;
    }
  } catch (error) {
    golden.error = String(error && error.message || error);
  }
  const tEnd = realNow();

  const result = {
    done: true, ok: true, format: FORMAT, version: VERSION,
    query: location.search, scene: sceneNote, seed: digest.seed,
    counts: digest.counts, probe: digest.rng.valley.probe, hiddenDraws: digest.rng.hidden.draws,
    anchors: Object.keys(digest.anchors).length,
    volatile: { leaves: digest.volatile.leaves, members: digest.volatile.members },
    ambient: { draws: digest.rng.ambient.draws, uuidSeparated },
    kit: assets ? assets.summary() : null,   // which asset set the valley was built on (not part of the digest)
    golden, equal: !!(diff && diff.equal), diff, warnings,
    digestBytes: new TextEncoder().encode(text).length,
    timing: {
      importMs: Math.round(tImport - tStart),
      buildMs: builds.map((b) => Math.round(b.buildMs)),
      digestMs: Math.round(tBuilt - tImport - builds.reduce((s, b) => s + b.buildMs, 0)),
      totalMs: Math.round(tEnd - tStart)
    },
    digestText: text
  };
  window.__footprint = result;

  const statusEl = $('status');
  $('golden').textContent = GOLDEN_URL.startsWith('/') ? GOLDEN_URL.slice(1) : 'tools/' + GOLDEN_URL.replace(/^\.\//, '');
  if (!golden.found) {
    statusEl.textContent = `no usable golden at ${GOLDEN_URL} (${golden.error}): write it with node tools/footprint_golden.mjs --write`;
    statusEl.className = 'failed';
  } else if (diff.equal) {
    statusEl.textContent = `EQUAL: the build matches the golden${golden.textEqual ? ' byte for byte' : ''}`;
    statusEl.className = 'equal';
  } else {
    const c = diff.counts;
    statusEl.textContent = `DIFFERENT: ${c.changed} changed, ${c.added} added, ${c.removed} removed`;
    statusEl.className = 'different';
  }
  $('summary').textContent = summaryLines(result).join('\n');
  $('changes').textContent = changeLines(diff, MAX_SHOWN).join('\n');
  const link = $('download');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.hidden = false;
}

main().catch((error) => {
  const message = String((error && error.stack) || error);
  window.__footprint = { done: true, ok: false, error: message };
  $('status').textContent = 'failed: ' + message;
  $('status').className = 'failed';
});
