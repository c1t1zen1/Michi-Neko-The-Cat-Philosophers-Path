// Summit golden: the safety net for splitting src/mountaintop.js
// (BUILD_GUIDE_FABLE.md §11 S1.1, modelled on tools/footprint_golden.js).
// It changes no game file.
//
//   node tools/summit_golden.mjs            headless; exit 0 equal, 1 different
//   node tools/summit_golden.mjs --write    regenerate tools/golden/summit_classic.json
//   python3 -m http.server 8000  →  http://localhost:8000/tools/summit_golden.html
//
// It builds SummitManager the way tools/summit_preview.js and
// tools/summit_test.mjs do: `new SummitManager(game)` on a stub game that has
// a scene, a sky (the objects markSkyKeepers() flags) and a player mesh, with
// no renderer. Two configurations are built: the game's (`summitPreview`
// unset, what src/main.js builds) and the review page's (`summitPreview:
// true`, what tools/summit_preview.html and the Summit Lab build). The
// optional Blender roofscape (assets/models/summit_kyoto_landmarks.glb) is
// awaited before anything is read. Then it writes a JSON digest:
//
//   rng          draws from the summit stream (this.rng, seed 20261004),
//                counted through an accessor on SummitManager.prototype
//                (buildCanopy(this.rng) included), with a probe proving the
//                count is the stream position; game Math.random() draws
//   builders     per top-level builder in build order: stream draws,
//                colliders, platforms and scene objects it added; `calls`:
//                every build* / load* / make* / mark* / _tree call count with
//                inclusive totals (advisory: a faithful split may move a draw
//                between methods)
//   api          the method names on SummitManager.prototype (a removed name
//                is a difference; an added one is advisory)
//   colliders    this.colliders and this.platforms in order (world Box3s)
//   samples      terrainHeightAt on a near (1.5 m) and a far (20 m) lattice,
//                perchSightlineAt over the perch's view window (the protected
//                view), approachSupportAt along the approach, groundAt across
//                the corridor, constrain() on a ring of probes, vistaRiverX
//   quality      what setQuality('low' | 'medium' | 'high') leaves behind
//   state        every own field of the instance (sorted): numbers, typed
//                arrays (count, sum, sum of squares, min, max), materials,
//                textures (size and pixel hash), and references to scene
//                objects by their key in `objects`
//   objects      every named Object3D (summit group, shrine rays): world
//                p, q, s, geometry stats (position, colour and uv means),
//                material, shadow flags, userData, instance stats
//   aggregates   unnamed renderables per nearest named ancestor (in its
//                frame): count, vertices, bbox, centroid, covariance, colours
//   preview      the same for the review-page build, written as the entries
//                that differ from the game build (counts and rng in full)
//
// Numbers are rounded to 1e-4; key order is build order (state is sorted);
// one entry per line so git diffs stay readable.
//
// Determinism: Math.random, performance.now and Date.now are replaced before
// any game module loads (a seeded Math.random with three.js's generateUUID on
// its own stream, and a clock that steps on each read). Each configuration is
// built twice with different ambient seeds and clocks; a value that differs
// between the two builds is written as "~" (none today: the summit draws no
// Math.random while it builds).
//
// Page flags: ?golden=<path> (default golden/summit_classic.json, relative to
// this page), ?max=<n> changes listed.

const FORMAT = 'michi-neko-summit-golden';
const VERSION = 1;
const SUMMIT_SEED = 20261004; // `this.rng = mulberry32(20261004)` in the SummitManager constructor
const params = new URLSearchParams(location.search);
const GOLDEN_URL = params.get('golden') || 'golden/summit_classic.json';
const MAX_SHOWN = Math.max(1, Number(params.get('max')) || 40);
const MAX_STORED = 2000; // change items kept in the result; counts are always complete

// ---------------------------------------------------------------- shims ---
// Installed before any game module is evaluated: the game modules are loaded
// with import() further down, after this has run.

function mulberry32(a) { // same algorithm as src/mountaintop.js
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

// Canvas textures are identified by their drawing commands, not their pixels:
// 2D rasterisation differs between GPU backends (Metal and SwiftShader give
// different antialiasing), while the command stream (methods, arguments,
// style changes, gradient stops, CPU-made ImageData) is the same everywhere
// and changes whenever the drawing code or its seed does. Pixels read back
// with getImageData() are backend-dependent, so data derived from them is
// recorded by size only.
const canvasLog = new WeakMap();   // canvas → running FNV-1a state
const gradientSig = new WeakMap(); // CanvasGradient → its definition
const readback = new WeakSet();    // ImageData that came from getImageData()

function fnvFeed(h, str) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h ^= c & 0xff; h = Math.imul(h, 0x01000193);
    h ^= c >>> 8; h = Math.imul(h, 0x01000193);
  }
  return h;
}

function logCanvas(canvas, entry) {
  if (!canvas) return;
  canvasLog.set(canvas, fnvFeed(canvasLog.has(canvas) ? canvasLog.get(canvas) : 0x811c9dc5, entry + ';'));
}

function argSig(v) {
  if (v === null || v === undefined) return String(v);
  const t = typeof v;
  if (t === 'number' || t === 'boolean') return String(v);
  if (t === 'string') return v;
  if (gradientSig.has(v)) return gradientSig.get(v);
  if (typeof ImageData !== 'undefined' && v instanceof ImageData) {
    if (readback.has(v)) return `readback(${v.width}x${v.height})`;
    let h = 0x811c9dc5;
    const d = v.data;
    for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); }
    return `data(${v.width}x${v.height}:${(h >>> 0).toString(16)})`;
  }
  if (canvasLog.has(v)) return `canvas(${v.width}x${v.height}:${(canvasLog.get(v) >>> 0).toString(16)})`;
  if (Array.isArray(v)) return '[' + v.map(argSig).join(',') + ']';
  if (v && v.width !== undefined) return `${v.constructor && v.constructor.name}(${v.width}x${v.height})`;
  return t;
}

(function instrumentCanvas() {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  const P = CanvasRenderingContext2D.prototype;
  const READS = new Set(['measureText', 'isPointInPath', 'isPointInStroke', 'getLineDash', 'getTransform', 'getContextAttributes']);
  for (const name of Object.getOwnPropertyNames(P)) {
    const d = Object.getOwnPropertyDescriptor(P, name);
    if (!d || name === 'constructor' || name === 'canvas') continue;
    if (typeof d.value === 'function') {
      const orig = d.value;
      P[name] = function (...args) {
        const out = orig.apply(this, args);
        if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createConicGradient') {
          gradientSig.set(out, `${name}(${args.map(argSig).join(',')})`);
        } else if (name === 'getImageData') {
          readback.add(out);
        } else if (!READS.has(name)) {
          logCanvas(this.canvas, `${name}(${args.map(argSig).join(',')})`);
        }
        return out;
      };
    } else if (d.set) {
      const set = d.set;
      Object.defineProperty(P, name, {
        configurable: true, enumerable: d.enumerable, get: d.get,
        set(v) { logCanvas(this.canvas, `${name}=${argSig(v)}`); set.call(this, v); }
      });
    }
  }
  if (typeof CanvasGradient !== 'undefined') {
    const add = CanvasGradient.prototype.addColorStop;
    CanvasGradient.prototype.addColorStop = function (offset, color) {
      gradientSig.set(this, (gradientSig.get(this) || 'gradient') + `+${offset}:${color}`);
      return add.call(this, offset, color);
    };
  }
})();

// Build A is the digest; build B only reveals which values are ambient.
const BUILDS = [
  { label: 'A', seed: 0x0a11ce5, t0: 1e6, step: 0.5 },
  { label: 'B', seed: 0x5eed0b, t0: 2.5e6 + 0.123, step: 0.37 }
];

let THREE, SummitManager, GLTFLoader;
let REC = null; // recorder of the build in progress
const pendingLoads = [];

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

/** FNV-1a over bytes, as 8 hex digits. */
function fnv(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** n, sum, sum of squares, min, max of a numeric array. */
function arrayStats(a) {
  let s = 0, q = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    s += v; q += v * v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return a.length ? { n: a.length, sum: r4(s), sq: r4(q), lo: r4(lo), hi: r4(hi) } : { n: 0 };
}

// -------------------------------------------------------- instrumentation ---

/**
 * Count every draw from the seeded generator held in `proto[prop]`. The
 * constructor's `this[prop] = generator` assignment lands on a setter on the
 * prototype, which keeps a counting wrapper on the instance instead. Game code
 * reads and calls `this[prop]` exactly as before (buildCanopy receives the
 * wrapper) and gets the same values.
 */
function countDraws(proto, prop) {
  const wrap = (f) => (typeof f !== 'function' ? f : function () {
    if (REC) REC.draws++;
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
        set(next) { current = wrap(next); if (REC) REC.reassigned++; }
      });
    }
  });
}

function countObjects(root) {
  let n = 0;
  root.traverse(() => { n++; });
  return n - 1;
}

function counters(summit, withObjects) {
  const c = {
    draws: REC.draws,
    random: ambient.draws,
    colliders: (summit.colliders || []).length,
    platforms: (summit.platforms || []).length
  };
  if (withObjects) c.objects = summit.scene ? countObjects(summit.scene) : 0;
  return c;
}

const PHASE = /^(build|load|make|mark)[A-Z]|^_tree$/;

/**
 * Record what every build* / load* / make* / mark* / _tree call adds: each
 * top-level call (with the scene objects it added) in order, and per method
 * the number of calls and their inclusive totals.
 */
function trackPhases(proto) {
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (!PHASE.test(name)) continue;
    const desc = Object.getOwnPropertyDescriptor(proto, name);
    if (!desc || typeof desc.value !== 'function') continue;
    const original = desc.value;
    proto[name] = function (...args) {
      if (!REC) return original.apply(this, args);
      const top = REC.depth === 0;
      const before = counters(this, top);
      let sum = REC.calls.get(name); // created on the first call, so parents list before children
      if (!sum) REC.calls.set(name, sum = { calls: 0 });
      REC.depth++;
      try { return original.apply(this, args); } finally {
        REC.depth--;
        const after = counters(this, top);
        if (top) REC.phases.push([name, before, after]);
        sum.calls++;
        for (const k of Object.keys(before)) if (k !== 'objects') sum[k] = (sum[k] || 0) + after[k] - before[k];
      }
    };
  }
}

/** Every GLTFLoader.load() settles a promise the build waits for. */
function trackLoads() {
  const load = GLTFLoader.prototype.load;
  GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    let settle;
    // Recorded without the cache tag, so a tag bump never reads as a change.
    const file = String(url).replace(/^.*\/assets\//, 'assets/').replace(/\?v=[^&#]*/, '');
    pendingLoads.push(new Promise((resolve) => { settle = resolve; }));
    return load.call(this, url, (gltf) => {
      try { if (onLoad) onLoad(gltf); } finally { settle({ url: file, ok: true }); }
    }, onProgress, (error) => {
      try { if (onError) onError(error); } finally { settle({ url: file, ok: false, error: String(error && error.message || error) }); }
    });
  };
}

async function settleLoads(limitMs = 30000) {
  const list = pendingLoads.splice(0);
  if (!list.length) return [];
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), limitMs); });
  const all = Promise.all(list);
  const out = await Promise.race([all, timeout]);
  clearTimeout(timer);
  return out === 'timeout' ? [{ ok: false, error: `GLTF load did not settle within ${limitMs} ms` }] : out;
}

let ROUTE = null; // placeAsset() calls of the routed build in progress

/** Record every placeAsset(id, layout, classicFn) call (S1.3 routing). */
function trackRouting(proto) {
  const place = proto.placeAsset;
  if (typeof place !== 'function') return;
  proto.placeAsset = function (id, layout, classicFn) {
    const out = place.call(this, id, layout, classicFn);
    if (ROUTE) ROUTE.push({ id, layout, out, self: this });
    return out;
  };
}

function instrument() {
  countDraws(SummitManager.prototype, 'rng');
  trackPhases(SummitManager.prototype);
  trackLoads();
  trackRouting(SummitManager.prototype);
}

// -------------------------------------------------------------- routing ---
// S1.3 proof, kept out of the digest (the golden is the unchanged classic
// summit): the summit built through the real AssetRuntime with a stand-in
// kit asset for every summit inventory id must advance the summit stream
// exactly as the classic build does and register the same colliders and
// platforms, in the same order, through placeAsset(); each stand-in must sit
// under its layout's parent with its layout.bind parts set on the manager.
// Run all-modular (game configuration) and with each id alone swapped in
// (?swap=<id>:modular, preview configuration).
//
// Then the per-frame code (review fix round 1): driveSummit() runs the
// unlock, the valley beacon and the portal, every weather at three sun
// heights with the wildlife forced, the fūrin spot, the perch, setQuality()
// and leaving on three game-configuration builds with real three.js: classic
// (the control), all modular with every bound part a plain Object3D, and all
// modular with stand-ins that bring no bound part at all. Nothing may throw,
// the portal must open in all three, the fūrin must ring once where a bell
// exists (a kit bell inside its instance group included) and never without
// one, and each unresolved bind must be warned once through the runtime.

/** A game stub complete enough for update(), the transitions and the perch. */
function driveSummit(summit, game) {
  const failures = [];
  const run = (label, fn) => {
    try { fn(); } catch (error) { failures.push(`${label}: ${String(error && error.message || error)}`); }
  };
  let chimes = 0;
  const day = summit.skyPalette.phases.day;
  Object.assign(game.sky, {
    sunDir: new THREE.Vector3(0.3, 1, 0.2), weather: 'clear', targetWeather: 'clear', weatherBlend: 1,
    weatherDurations: {}, weatherPool: null, currentPalette: day, resolvePalette: () => day
  });
  Object.assign(game, {
    camera: new THREE.PerspectiveCamera(50, 1.6, 0.1, 4000),
    ui: { showToast() {}, hideAllGuidance() {}, setSummitMode() {}, setScenicView() {} },
    audio: {
      playMonkChoir() {}, playDreamChime() { chimes++; }, playSingingBowl() {}, setSummitWind() {}, playPurr() {}
    },
    progression: { addXP() {} }, music: { swell() {} }, city: { setShrineThicketOpen() {} },
    waypoints: { setTargets() {} }
  });
  Object.assign(game.player, {
    velocity: new THREE.Vector3(), heading: 0, yaw: 0, yawPrev: 0, pitch: 0, fovCurrent: 50,
    actionLocked: false, isGrounded: true, currentSpeed: 0, moveInput: new THREE.Vector2(),
    cat: {
      idleAction: null, idleActionTimer: 0, idleActionDuration: 0, idleTimer: 0, state: 'idle',
      endIdleAction() { this.idleAction = null; }, setMood() {}
    }
  });
  const pos = game.player.mesh.position;
  const local = (x, z) => pos.set(summit.origin.x + x, summit.origin.y + summit.perchLocal.y, summit.origin.z + z);
  run('setQuality', () => { for (const q of ['low', 'medium', 'high']) summit.setQuality(q); });
  run('unlock', () => summit.setUnlocked(true));
  run('valley beacon', () => { pos.set(0, 0, -20); for (let i = 0; i < 4; i++) summit.update(0.25, true); });
  run('portal', () => { pos.set(0, 0, -40); summit.update(0.016, true); });
  const portal = summit.active === true;
  // The veil's finish() timer is not awaited: hand the controls back now.
  summit.transitioning = false;
  game.player.actionLocked = false;
  game.controls.enabled = true;
  // The return crossing, the fūrin's shade (the classic bell's spot, where a
  // kit bell's instance group is placed), the perch.
  const spots = [[0, 9.5], [4.55, 5.1], [summit.perchLocal.x, summit.perchLocal.z]];
  for (const weather of ['clear', 'cloudy', 'mist', 'rain', 'snow']) {
    game.sky.weather = game.sky.targetWeather = weather;
    for (const sunY of [1, 0.1, -0.4]) {
      game.sky.sunDir.set(0.3, sunY, 0.2);
      run(`update (${weather}, sun ${sunY})`, () => {
        summit._birdFlybyTimer = 0;
        summit._butterflyVisitTimer = 0;
        for (const [x, z] of spots) { local(x, z); summit.update(0.5, true); }
      });
    }
  }
  run('perch', () => {
    game.player.cat.idleAction = 'sit';
    for (let i = 0; i < 12; i++) { local(summit.perchLocal.x, summit.perchLocal.z); summit.update(0.5, true); }
  });
  const scenic = summit.cameraActive === true;
  run('direct calls', () => {
    summit.startBirdFlyby(); summit.reseedSnow(); summit.reseedRain(); summit.resetAmbientWildlife();
    summit.updateAmbientWildlife(0.1, 1, game.sky); summit.updateSakuraPetals(0.1, 1, game.sky);
    summit.updateVistaEnvironment(0.1, 1, game.sky); summit.updateMeditationAtmosphere(0.1, 1, true, game.sky);
  });
  run('leave', () => { summit.setActive(false); summit.update(0.016, true); });
  return { failures, portal, scenic, chimes };
}

async function routingTest(classicGame, classicPreview) {
  const t0 = realNow();
  const { AssetRuntime, isAssetInstance } = await import('../src/kit/runtime.js?v=20261113a');
  const { defineAsset } = await import('../src/kit/contract.js?v=20261113a');
  if (typeof SummitManager.prototype.placeAsset !== 'function') {
    return { ok: false, ran: false, problems: ['SummitManager has no placeAsset(): nothing is routed'] };
  }
  const inv = await (await fetch('../labs/asset_inventory.json', { cache: 'no-store' })).json();
  const ids = inv.assets.filter((a) => a.group === 'Summit').map((a) => a.id);
  // withParts false: a bare stand-in, no part any layout.bind names.
  const standIn = (id, withParts = true) => defineAsset({
    id, family: 'summit-standin', tiers: ['hero', 'mid', 'far'],
    build(ctx, layout) {
      const group = new ctx.THREE.Group();
      const parts = {};
      if (withParts) for (const part of Object.values(layout.bind || {})) parts[part] = new ctx.THREE.Object3D();
      if (!Object.keys(parts).length) parts.body = new ctx.THREE.Object3D();
      for (const obj of Object.values(parts)) group.add(obj);
      return { group, parts, sockets: {}, live: [], footprint: layout.footprint };
    }
  });
  // Warnings are collected, not printed: the bare build is expected to warn.
  const runtimeFor = (assetSet, search, withParts = true) => {
    const rt = new AssetRuntime({
      THREE, assetSet, search, quality: 'high', logger: { warn() {} },
      loadFamilies: async () => ({}), createMaterials: async () => null, fetchOverrides: async () => null
    });
    for (const id of ids) rt.register(standIn(id, withParts), 'summit-standin');
    return rt;
  };
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  async function routedBuild(preview, assets, label, classic, { binds = true } = {}) {
    setAmbient(BUILDS[0]);
    const scene = new THREE.Scene();
    const game = stubGame(scene, preview);
    game.assets = assets;
    const rec = REC = newRecorder();
    const calls = ROUTE = [];
    const problems = [];
    let summit = null;
    try {
      summit = new SummitManager(game);
    } catch (error) {
      problems.push(`${label}: the build threw: ${String(error && error.message || error)}`);
    } finally {
      REC = null;
      ROUTE = null;
    }
    await settleLoads();
    if (!summit) return { problems, calls, game };
    const fresh = mulberry32(SUMMIT_SEED);
    for (let i = 0; i < rec.draws; i++) fresh();
    const probe = summit.rng() === fresh();
    if (rec.draws !== classic.rng.summit.draws || !probe) {
      problems.push(`${label}: summit stream ${rec.draws} draws (probe ${probe ? 'ok' : 'FAILED'}), classic ${classic.rng.summit.draws}`);
    }
    if (!sameList(summit.colliders.map(box6), classic.colliders)) problems.push(`${label}: colliders differ from the classic build`);
    if (!sameList(summit.platforms.map(box6), classic.platforms)) problems.push(`${label}: platforms differ from the classic build`);
    for (const c of calls) {
      if (!isAssetInstance(c.out)) continue;
      const parent = c.out.group.parent;
      const want = c.layout.space === 'valley' ? scene : c.layout.parent ? c.layout.parent : summit.group;
      const okParent = typeof want === 'string' ? parent && parent.name === want : parent === want;
      if (!okParent) problems.push(`${label}: ${c.id} placed under ${parent ? parent.name || parent.type : 'nothing'}`);
      for (const [field, part] of Object.entries(binds ? c.layout.bind || {} : {})) {
        if (summit[field] !== c.out.parts[part]) problems.push(`${label}: ${c.id} did not bind ${field} to part ${part}`);
      }
    }
    return { problems, calls, draws: rec.draws, probe, summit, game };
  }

  const problems = [];
  // Every id routed once or more by the classic build (the digest build A).
  const classicCalls = new Map();
  for (const c of classicGame.routes || []) classicCalls.set(c, (classicCalls.get(c) || 0) + 1);
  for (const id of ids) if (!classicCalls.has(id)) problems.push(`classic: ${id} is never routed through placeAsset()`);
  for (const id of classicCalls.keys()) if (!ids.includes(id)) problems.push(`classic: ${id} is routed but is not a summit inventory id`);

  const all = await routedBuild(false, runtimeFor('modular', ''), 'all modular', classicGame);
  problems.push(...all.problems);
  const kitCalls = all.calls.filter((c) => isAssetInstance(c.out)).length;
  if (all.calls.length && kitCalls !== all.calls.length) problems.push(`all modular: ${all.calls.length - kitCalls} call(s) built classic`);

  // The per-frame code on kit instances (fix round 1); see driveSummit().
  const drive = {};
  const control = await routedBuild(false, runtimeFor('classic', ''), 'classic control', classicGame);
  problems.push(...control.problems);
  const bareRuntime = runtimeFor('modular', '', false);
  const bare = await routedBuild(false, bareRuntime, 'bare stand-ins', classicGame, { binds: false });
  problems.push(...bare.problems);
  for (const [key, label, build, rings] of [
    ['classic', 'classic control', control, 1], ['modular', 'all modular', all, 1], ['bare', 'bare stand-ins', bare, 0]
  ]) {
    if (!build.summit) { drive[key] = { ran: false }; continue; }
    const d = driveSummit(build.summit, build.game);
    drive[key] = { ran: true, throws: d.failures.length, portal: d.portal, scenic: d.scenic, chimes: d.chimes };
    for (const f of d.failures.slice(0, 4)) problems.push(`drive ${label}: ${f}`);
    if (!d.portal) problems.push(`drive ${label}: the portal behind the shrine did not open`);
    if (!d.scenic) problems.push(`drive ${label}: the perch did not engage the scenic camera`);
    if (d.chimes !== rings) problems.push(`drive ${label}: the fūrin rang ${d.chimes} time(s), expected ${rings}`);
  }
  // Each layout.bind of the bare build is unresolved: one warning per id and field.
  const boundFields = new Set(bare.calls.filter((c) => isAssetInstance(c.out))
    .flatMap((c) => Object.keys(c.layout.bind || {}).map((field) => `${c.id}:${field}`)));
  const bindWarnings = bareRuntime.problems.filter((p) => /has no part '.*' that layout\.bind\./.test(p));
  drive.bindWarnings = bindWarnings.length;
  drive.boundFields = boundFields.size;
  if (bindWarnings.length !== boundFields.size || new Set(bindWarnings).size !== bindWarnings.length) {
    problems.push(`bare stand-ins: ${bindWarnings.length} bind warnings for ${boundFields.size} unresolved bound fields`);
  }

  let singlesOk = 0;
  for (const id of ids) {
    const one = await routedBuild(true, runtimeFor('classic', `?swap=${id}:modular`), `swap ${id}`, classicPreview);
    const kits = one.calls.filter((c) => isAssetInstance(c.out));
    if (!kits.length) one.problems.push(`swap ${id}: no stand-in was built`);
    if (kits.some((c) => c.id !== id)) one.problems.push(`swap ${id}: other ids built from the kit`);
    problems.push(...one.problems);
    if (!one.problems.length) singlesOk++;
  }
  return {
    ok: !problems.length, ran: true, ids: ids.length,
    classicCalls: [...classicCalls.values()].reduce((s, n) => s + n, 0),
    allModular: { calls: all.calls.length, kit: kitCalls, draws: all.draws, probe: all.probe },
    singles: { ok: singlesOk, of: ids.length },
    drive,
    problems: problems.slice(0, 40), problemCount: problems.length,
    ms: Math.round(realNow() - t0)
  };
}

// ------------------------------------------------------- materials, maps ---

const texHashes = new WeakMap();

/**
 * A texture's identity (cached): the hash of a canvas's drawing commands
 * (`cmd…`), or of a data texture's bytes (`data…`); '' for images loaded
 * from files (the GLB's), which never change with the code.
 */
function texHash(t) {
  if (texHashes.has(t)) return texHashes.get(t);
  let h = '';
  const img = t.image;
  if (img && img.data && ArrayBuffer.isView(img.data)) {
    h = 'data' + fnv(new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength));
  } else if (img && canvasLog.has(img)) {
    h = 'cmd' + (canvasLog.get(img) >>> 0).toString(16).padStart(8, '0');
  }
  texHashes.set(t, h);
  return h;
}

function texSig(t) {
  if (!t) return 'none';
  const img = t.image;
  let s = t.isDataTexture ? 'data' : t.isCanvasTexture ? 'canvas' : 'tex';
  if (img && img.width) s += ` ${img.width}x${img.height}`;
  const h = texHash(t);
  if (h) s += ' ' + h;
  if (t.repeat && (t.repeat.x !== 1 || t.repeat.y !== 1)) s += ` rep${r4(t.repeat.x)},${r4(t.repeat.y)}`;
  if (t.wrapS === THREE.RepeatWrapping || t.wrapT === THREE.RepeatWrapping) s += ' wrap';
  if (t.colorSpace === THREE.SRGBColorSpace) s += ' srgb';
  if (t.anisotropy && t.anisotropy !== 1) s += ` an${t.anisotropy}`;
  return s;
}

function matSig(m) {
  if (Array.isArray(m)) return m.map(matSig).join(' + ');
  if (!m) return 'none';
  let s = String(m.type || 'Material').replace(/^Mesh/, '').replace(/Material$/, '') || 'Material';
  if (m.name) s += ` "${m.name}"`;
  if (m.color) s += ' #' + m.color.getHexString();
  if (m.emissive && m.emissive.getHex()) s += ' e#' + m.emissive.getHexString() + '*' + r4(m.emissiveIntensity);
  if (typeof m.roughness === 'number') s += ' r' + r4(m.roughness);
  if (m.metalness) s += ' m' + r4(m.metalness);
  if (m.map) s += ` map(${texSig(m.map)})`;
  if (m.normalMap) s += ` nrm(${texSig(m.normalMap)})` + (m.normalScale ? `*${r4(m.normalScale.x)}` : '');
  if (m.bumpMap) s += ` bump${r4(m.bumpScale)}(${texSig(m.bumpMap)})`;
  if (m.vertexColors) s += ' vc';
  if (m.transparent) s += ' t' + r4(m.opacity);
  if (m.alphaTest) s += ' at' + r4(m.alphaTest);
  if (m.side === THREE.DoubleSide) s += ' 2s';
  else if (m.side === THREE.BackSide) s += ' back';
  if (m.blending === THREE.AdditiveBlending) s += ' add';
  if (m.flatShading) s += ' flat';
  if (m.fog === false) s += ' nofog';
  if (m.depthWrite === false) s += ' nodw';
  if (m.polygonOffset) s += ` po${m.polygonOffsetFactor},${m.polygonOffsetUnits}`;
  if (m.isPointsMaterial) s += ' sz' + r4(m.size) + (m.sizeAttenuation ? '' : ' noatt');
  if (typeof m.envMapIntensity === 'number' && m.envMapIntensity !== 1) s += ' env' + r4(m.envMapIntensity);
  if (m.userData && Object.keys(m.userData).length) s += ' u' + JSON.stringify(describe(m.userData, null, 2, new Set()));
  return s;
}

// ------------------------------------------------------------- the walk ---

const ROOT = '(root)';
const renderable = (o) => !!(o.isMesh || o.isPoints || o.isLine || o.isSprite);
const flags = (o) => (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');

function newAcc() {
  return {
    n: 0, sx: 0, sy: 0, sz: 0, xx: 0, yy: 0, zz: 0, xy: 0, xz: 0, yz: 0,
    x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity,
    cn: 0, cr: 0, cg: 0, cb: 0
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
  const col = geometry.attributes.color;
  if (col && col.itemSize >= 3) {
    for (let i = 0, n = col.count; i < n; i++) {
      acc.cn++;
      acc.cr += col.getX(i); acc.cg += col.getY(i); acc.cb += col.getZ(i);
    }
  }
  return acc;
}

function mergeAcc(into, a) {
  into.n += a.n;
  for (const k of ['sx', 'sy', 'sz', 'xx', 'yy', 'zz', 'xy', 'xz', 'yz', 'cn', 'cr', 'cg', 'cb']) into[k] += a[k];
  into.x0 = Math.min(into.x0, a.x0); into.y0 = Math.min(into.y0, a.y0); into.z0 = Math.min(into.z0, a.z0);
  into.x1 = Math.max(into.x1, a.x1); into.y1 = Math.max(into.y1, a.y1); into.z1 = Math.max(into.z1, a.z1);
  return into;
}

/** { v, box, c, cov, col }: count, bounds, centroid, covariance (xx yy zz xy xz yz), mean vertex colour. */
function accStats(acc) {
  if (!acc.n) return { v: 0 };
  const n = acc.n, cx = acc.sx / n, cy = acc.sy / n, cz = acc.sz / n;
  const out = {
    v: n,
    box: [acc.x0, acc.y0, acc.z0, acc.x1, acc.y1, acc.z1].map(r4),
    c: [cx, cy, cz].map(r4),
    cov: [acc.xx / n - cx * cx, acc.yy / n - cy * cy, acc.zz / n - cz * cz,
      acc.xy / n - cx * cy, acc.xz / n - cx * cz, acc.yz / n - cy * cz].map(r4)
  };
  if (acc.cn) out.col = [acc.cr / acc.cn, acc.cg / acc.cn, acc.cb / acc.cn].map(r4);
  return out;
}

function geometryRecord(geometry) {
  const g = accStats(accumulate(newAcc(), geometry, null));
  if (geometry.index) g.i = geometry.index.count;
  const uv = geometry.attributes.uv;
  if (uv && uv.count) {
    let su = 0, sv = 0;
    for (let i = 0; i < uv.count; i++) { su += uv.getX(i); sv += uv.getY(i); }
    g.uv = [r4(su / uv.count), r4(sv / uv.count)];
  }
  if (geometry.isInstancedBufferGeometry) g.ic = geometry.instanceCount;
  if (geometry.drawRange && (geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity)) {
    g.dr = [geometry.drawRange.start, geometry.drawRange.count];
  }
  const extra = Object.keys(geometry.attributes).filter((k) => !['position', 'normal', 'uv', 'color'].includes(k)).sort();
  if (extra.length) g.attrs = extra;
  return g;
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
    out.hash = fnv(new Uint8Array(a.buffer, a.byteOffset, n * 16 * 4));
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

function userDataOf(o) {
  return o.userData && Object.keys(o.userData).length ? describe(o.userData, null, 2, new Set()) : null;
}

function namedRecord(o) {
  const P = _p(), Q = _q(), S = _p();
  o.matrixWorld.decompose(P, Q, S);
  const rec = { p: v3(P), q: quat(Q), s: v3(S), t: o.type };
  if (!o.visible) rec.hidden = 1;
  if (o.renderOrder) rec.ro = o.renderOrder;
  if (o.frustumCulled === false) rec.nofc = 1;
  const u = userDataOf(o);
  if (u) rec.u = u;
  if (renderable(o)) {
    rec.mat = matSig(o.material);
    rec.f = flags(o);
    if (o.customDepthMaterial) rec.depth = matSig(o.customDepthMaterial);
    if (!o.isSprite && o.geometry) rec.g = geometryRecord(o.geometry);
    if (o.isInstancedMesh) rec.inst = instStats(o);
  } else if (o.isLight) {
    rec.light = [o.color.getHexString(), r4(o.intensity), o.castShadow ? 'c' : '-'];
    if (o.groundColor) rec.light.push(o.groundColor.getHexString());
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
  } else if (o.isSprite) {
    const P = _p(), Q = _q(), S = _p();
    rel.decompose(P, Q, S);
    acc.n = 1; acc.sx = P.x; acc.sy = P.y; acc.sz = P.z;
    acc.x0 = acc.x1 = P.x; acc.y0 = acc.y1 = P.y; acc.z0 = acc.z1 = P.z;
  } else {
    accumulate(acc, o.geometry, rel);
  }
  const mat = matSig(o.material);
  const u = userDataOf(o);
  return {
    agg, acc, mat, cast: !!o.castShadow, recv: !!o.receiveShadow, hidden: !o.visible,
    sig: JSON.stringify(accStats(acc)) + '|' + mat + '|' + flags(o) + (o.visible ? '' : '|h') + (u ? '|' + JSON.stringify(u) : '')
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
  for (const child of o.children) visit(W, child, key, anc);
}

// ---------------------------------------------------------------- state ---

const STATE_SKIP = new Set(['game', 'scene', 'colliders', 'platforms', 'rng']);

/** A reference to a scene object: its key, or (unnamed) its type, place and nearest named ancestor. */
function objRef(o, W) {
  const key = W && W.keyOf.get(o);
  if (key) return '@' + key;
  let a = o.parent;
  while (a && !(W && W.keyOf.has(a))) a = a.parent;
  const out = { t: o.type, under: a ? '@' + W.keyOf.get(a) : null, p: v3(o.getWorldPosition(new THREE.Vector3())) };
  const u = userDataOf(o);
  if (u) out.u = u;
  return out;
}

function describe(v, W, depth, seen) {
  if (v === undefined) return 'undef';
  if (v === null) return null;
  const t = typeof v;
  if (t === 'number') return r4(v);
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'function') return 'fn';
  if (t !== 'object') return String(v);
  if (ArrayBuffer.isView(v)) return arrayStats(v);
  if (v.isObject3D) return objRef(v, W);
  if (v.isMaterial) return matSig(v);
  if (v.isTexture) return texSig(v);
  if (v.isBufferGeometry) return { geo: (v.attributes.position || { count: 0 }).count };
  if (v.isColor) return '#' + v.getHexString();
  if (v.isVector2) return [r4(v.x), r4(v.y)];
  if (v.isVector3) return v3(v);
  if (v.isVector4 || v.isQuaternion) return [r4(v.x), r4(v.y), r4(v.z), r4(v.w)];
  if (v.isBox3) return box6(v);
  if (v.isMatrix4 || v.isMatrix3) return v.elements.map(r4);
  if (v instanceof Set) return { set: v.size };
  if (v instanceof Map) return { map: v.size };
  if (depth >= 4) return Array.isArray(v) ? `[${v.length}]` : '{…}';
  if (seen.has(v)) return '(cycle)';
  seen.add(v);
  try {
    if (Array.isArray(v)) return v.map((x) => describe(x, W, depth + 1, seen));
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = describe(v[k], W, depth + 1, seen);
    return out;
  } finally {
    seen.delete(v);
  }
}

function stateOf(summit, W) {
  const out = {};
  for (const k of Object.keys(summit).sort()) {
    if (STATE_SKIP.has(k)) continue;
    out[k] = describe(summit[k], W, 0, new Set());
  }
  return out;
}

/** The method names SummitManager.prototype carries (the facade's public API; `rng` is this page's counter). */
function apiOf(proto) {
  return Object.getOwnPropertyNames(proto).filter((k) => k !== 'constructor' && k !== 'rng').sort()
    .map((k) => {
      const d = Object.getOwnPropertyDescriptor(proto, k);
      return typeof d.value === 'function' ? k : `${k} (${d.get || d.set ? 'accessor' : typeof d.value})`;
    });
}

// -------------------------------------------------------------- samples ---

function lattice(fn, x0, x1, z0, z1, step) {
  const rows = [];
  for (let z = z0; z <= z1 + 1e-9; z += step) {
    const row = [];
    for (let x = x0; x <= x1 + 1e-9; x += step) row.push(r4(fn(x, z)));
    rows.push(row);
  }
  return { x: [x0, x1], z: [z0, z1], step, rows };
}

function samplesOf(s) {
  const o = s.origin;
  const support = [];
  for (let z = 7; z <= 52 + 1e-9; z += 0.5) {
    const a = s.approachSupportAt(0, z);
    support.push([r4(z), r4(a.y), r4(a.halfWidth), r4(a.fan)]);
  }
  const ground = {};
  for (const x of [-3.5, -3.36, -3.3, -2.9, -1, 0, 1, 2.9, 3.3, 3.36, 3.5]) {
    const row = [];
    for (let z = -12; z <= 22 + 1e-9; z += 0.5) row.push(r4(s.groundAt(o.x + x, o.z + z) - o.y));
    ground[String(x)] = row;
  }
  const constrain = [];
  for (const r of [5, 10.5, 10.9, 12, 20, 300]) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const p = { x: o.x + Math.sin(a) * r, y: o.y, z: o.z + Math.cos(a) * r };
      s.constrain(p);
      constrain.push([r, i, r4(p.x - o.x), r4(p.z - o.z)]);
    }
  }
  for (const [x, z] of [[0, 9], [2.5, 12], [3.2, 12], [3.6, 14], [-3.6, 18], [0, 21], [0, 30], [1, 7.6]]) {
    const p = { x: o.x + x, y: o.y, z: o.z + z };
    s.constrain(p);
    constrain.push(['lane', x, z, r4(p.x - o.x), r4(p.z - o.z)]);
  }
  const river = [];
  for (let z = 0; z <= 240; z += 4) river.push(r4(s.vistaRiverX(z)));
  return {
    terrainNear: lattice((x, z) => s.terrainHeightAt(x, z), -30, 30, -30, 30, 1.5),
    terrainFar: lattice((x, z) => s.terrainHeightAt(x, z), -440, 440, -440, 440, 20),
    // The protected view: nothing planted below this surface can cover the city or the sea.
    sightline: lattice((x, z) => s.perchSightlineAt(x, z), -80, 80, 0, 160, 5),
    support,
    ground,
    constrain,
    river
  };
}

function qualityOf(s) {
  const dr = (pts) => (pts && pts.geometry ? [pts.geometry.drawRange.start, pts.geometry.drawRange.count] : null);
  const out = {};
  for (const tier of ['low', 'medium', 'high']) {
    s.setQuality(tier);
    out[tier] = {
      city: s.cityWalls ? [s.cityWalls.count, s.cityRoofs.count, s.cityEaves ? s.cityEaves.count : null] : null,
      gardens: s.cityGardens ? s.cityGardens.count : null,
      skyline: s.harbourSkyline ? s.harbourSkyline.count : null,
      forest: (s.slopeForest || []).map((m) => m.count),
      clouds: (s.summitClouds || []).map((c) => c.mesh.count),
      points: {
        cityLights: dr(s.cityLights), harbourLights: dr(s.harbourLights), bayGlints: dr(s.bayGlints),
        rain: dr(s.rain), snow: dr(s.snow)
      },
      active: [s._rainActive, s._snowActive],
      boats: (s.vistaBoats || []).map((b) => (b.visible ? 1 : 0)).join(''),
      grass: s.grass ? [r4(s.grass.density), s.grass.quality] : null,
      grassVisible: s.grass ? (s.grass.meshes || []).map((m) => (m.visible ? 1 : 0)).join('') : null
    };
  }
  return out;
}

// ---------------------------------------------------------------- a build ---

function stubGame(scene, preview) {
  const node = () => new THREE.Object3D();
  const sun = node(); sun.target = node();
  const bounce = node(); bounce.target = node();
  return {
    scene,
    summitPreview: preview,
    sky: { dome: node(), stars: node(), moon: node(), sun, hemi: node(), fill: node(), bounce, clouds: [] },
    player: { mesh: node() },
    controls: { enabled: true },
    ui: null, audio: null, city: null, waypoints: null, progression: null,
    discover() {}, saveGame() {}, refreshCompassPois() {}
  };
}

function newRecorder() {
  return { draws: 0, reassigned: 0, depth: 0, phases: [], calls: new Map() };
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

/** Build the summit once and reduce it to plain data. */
async function buildOnce(spec, preview) {
  setAmbient(spec);
  const rec = REC = newRecorder();
  const routes = ROUTE = [];
  const scene = new THREE.Scene();
  const game = stubGame(scene, preview);
  const t0 = realNow();
  let summit;
  try {
    summit = new SummitManager(game);
  } finally {
    REC = null;
    ROUTE = null;
  }
  const buildMs = realNow() - t0;
  const ambientDraws = ambient.draws;
  const loads = await settleLoads();
  const warnings = [];
  for (const l of loads) if (!l.ok) warnings.push(`GLTF load failed: ${l.url || ''} ${l.error || ''}`.trim());

  scene.updateMatrixWorld(true);
  const W = newWalk();
  for (const child of scene.children) visit(W, child, '', null);

  // The stream position: one probe draw must equal draw N+1 of a fresh stream.
  const fresh = mulberry32(SUMMIT_SEED);
  for (let i = 0; i < rec.draws; i++) fresh();
  const probe = typeof summit.rng === 'function' && summit.rng() === fresh();

  const state = stateOf(summit, W);
  const samples = samplesOf(summit);
  const quality = qualityOf(summit);
  return {
    label: spec.label, preview, buildMs, warnings,
    rng: {
      summit: { seed: SUMMIT_SEED, draws: rec.draws, probe, ...(rec.reassigned ? { reassigned: rec.reassigned } : {}) },
      ambient: { draws: ambientDraws }
    },
    builders: { order: phaseTable(rec.phases), calls: Object.fromEntries(rec.calls) },
    api: apiOf(SummitManager.prototype),
    colliders: summit.colliders.map(box6),
    platforms: summit.platforms.map(box6),
    loads: loads.map((l) => (l.ok ? l.url : `failed: ${l.url || ''}`)),
    samples, quality, state,
    objects: W.objects, members: W.members,
    routes: routes.map((c) => c.id) // not in the digest: placeAsset() ids, for the routing test
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

function countsOf(build, aggs) {
  return {
    objects: build.objects.length,
    aggregates: Object.keys(aggs).length,
    members: build.members.length,
    colliders: build.colliders.length,
    platforms: build.platforms.length,
    draws: build.rng.summit.draws,
    state: Object.keys(build.state).length,
    api: build.api.length
  };
}

function assemble(build, volatile) {
  const aggs = aggregates(build.members, volatile);
  return {
    counts: countsOf(build, aggs),
    rng: build.rng,
    builders: build.builders,
    api: build.api,
    loads: build.loads,
    colliders: build.colliders,
    platforms: build.platforms,
    samples: build.samples,
    quality: build.quality,
    state: build.state,
    objects: Object.fromEntries(build.objects),
    aggregates: aggs
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

/** One configuration: build A masked by build B. */
function finalize(A, B) {
  const volatile = new Set();
  const unstable = [];
  const n = Math.min(A.members.length, B.members.length);
  if (A.members.length !== B.members.length) unstable.push(['members', `${A.members.length} vs ${B.members.length}`]);
  for (let i = 0; i < n; i++) {
    if (A.members[i].agg !== B.members[i].agg) { unstable.push(['members', i]); volatile.add(i); continue; }
    if (A.members[i].sig !== B.members[i].sig) volatile.add(i);
  }
  const DA = assemble(A, volatile), DB = assemble(B, volatile);
  const report = { leaves: [], unstable };
  // buildMs-like timing never enters the digest; builders.random counts Math.random per phase.
  const digest = mask(DA, DB, [], report);
  return { digest, leaves: report.leaves.map(fmtPath), members: volatile.size, unstable: report.unstable.map(fmtPath) };
}

/** The preview build as the entries that differ from the game build (counts and rng in full). */
function previewDelta(game, prev) {
  const out = { counts: prev.counts, rng: prev.rng, quality: prev.quality };
  for (const section of ['builders', 'loads', 'colliders', 'platforms', 'samples', 'state', 'objects', 'aggregates']) {
    const a = game[section], b = prev[section];
    if (deepEqual(a, b)) continue;
    if (isPlainObj(a) && isPlainObj(b) && section !== 'builders') {
      const d = {};
      for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) {
        if (!deepEqual(a[k], b[k])) d[k] = k in b ? b[k] : '(absent)';
      }
      out[section] = d;
    } else {
      out[section] = b;
    }
  }
  return out;
}

// -------------------------------------------------------------- the text ---

const ENTRY_SECTIONS = new Set(['objects', 'aggregates', 'colliders', 'platforms', 'state']);

// One entry per line: the document and its sections always open up; below
// that, a list or map of records opens up and every record stays on one line.
// Lattice rows are records too (one row per line).
function expandAt(path, v) {
  if (v === null || typeof v !== 'object') return false;
  const children = Array.isArray(v) ? v : Object.values(v);
  if (!children.length) return false;
  if (path.length <= 1) return true;
  if (path[0] === 'preview' && path.length === 2) return true;
  const p = path[0] === 'preview' ? path.slice(1) : path;
  if (ENTRY_SECTIONS.has(p[0]) || p.length > 3) return false;
  if (p[0] === 'samples' && p.length === 2) return !Array.isArray(v) || children.every((c) => Array.isArray(c));
  if (p[0] === 'samples' && p.length === 3 && p[2] === 'rows') return true;
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

const ENTRY_MAPS = /^(preview\.)?(objects|aggregates|state|builders\.order|builders\.calls)$/;
// Changes are listed causes first: the stream and the builders, then what
// they produced; the counts (already in the summary) last.
const DIFF_ORDER = ['format', 'version', 'scene', 'seed', 'rng', 'builders', 'api', 'loads', 'colliders', 'platforms',
  'samples', 'quality', 'state', 'objects', 'aggregates', 'preview', 'counts', 'volatile'];

/** Where a change starts: the first builder (in build order) and the methods whose totals moved. */
function whereNote(gold, fresh) {
  const b0 = (gold && gold.builders) || {}, b1 = (fresh && fresh.builders) || {};
  const changed = (a, b) => (isPlainObj(a) && isPlainObj(b) ? [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => !deepEqual(a[k], b[k]))
    .map((k) => `${k} (${!(k in a) ? 'new' : !(k in b) ? 'gone' : fieldNote(a[k], b[k])})`) : []);
  const where = [];
  const first = changed(b0.order, b1.order)[0];
  if (first) where.push(`first summit builder to change: ${first}`);
  const calls = changed(b0.calls, b1.calls);
  if (calls.length) where.push(`methods whose totals changed: ${calls.slice(0, 8).join(', ')}${calls.length > 8 ? `, … ${calls.length - 8} more` : ''}`);
  return where;
}

// Which method a draw or a collider is attributed to is not output: a
// faithful split may move a draw into a layout step and keep the stream
// order. `builders` is shown to explain a difference but is not part of the
// verdict; the stream position (rng) is. A method added to the prototype is
// advisory too (the facade may grow, e.g. placeAsset); a removed one is not.
const ADVISORY = new Set(['builders']);

function isAdvisory(op, path) {
  const p = path[0] === 'preview' ? path.slice(1) : path;
  if (ADVISORY.has(String(p[0]))) return true;
  if (p[0] === 'api' && op === '+') return true;
  if (p[0] === 'counts' && p[1] === 'api') return true;
  // A new instance field is advisory (e.g. the asset runtime handle); a removed or changed one is not.
  if (p[0] === 'state' && op === '+' && p.length === 2) return true;
  if (p[0] === 'counts' && p[1] === 'state') return true;
  return false;
}

/** Lists that hold the same entries in another order. */
function reordered(gold, fresh) {
  const notes = [];
  for (const k of ['colliders', 'platforms']) {
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
    if (isAdvisory(op, path)) {
      out.advisory.count++;
      if (out.advisory.items.length < 200) out.advisory.items.push({ op, path: fmtPath(path), ...extra });
      return;
    }
    const section = String(path[0]) + (path[0] === 'preview' && path.length > 1 ? '.' + String(path[1]) : '');
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
    const names = (v) => Array.isArray(v) && v.length && v.every((c) => typeof c === 'string');
    if (Array.isArray(a) && Array.isArray(b) && (entries(a) || entries(b) || (path.at(-1) === 'api' && names(a) && names(b)))) {
      for (const [op, i, j] of align(a.map(stable), b.map(stable))) {
        if (op === '=') continue;
        if (op === '+') note('+', path.concat(j), { to: short(b[j]) });
        else if (op === '-') note('-', path.concat(i), { from: short(a[i]) });
        else if (path.at(-1) === 'api') { note('-', path.concat(i), { from: short(a[i]) }); note('+', path.concat(j), { to: short(b[j]) }); }
        else note('~', path.concat(i === j ? i : `${i}→${j}`), { note: fieldNote(a[i], b[j]), from: short(a[i]), to: short(b[j]) });
      }
      return;
    }
    note('~', path, { from: short(a), to: short(b), note: deltaNote(a, b) });
  };
  walk([], gold, fresh);
  out.equal = out.counts.added + out.counts.removed + out.counts.changed === 0;
  out.added = out.items.filter((it) => it.op === '+').slice(0, 200).map((it) => it.path);
  out.removed = out.items.filter((it) => it.op === '-').slice(0, 200).map((it) => it.path);
  out.changed = out.items.filter((it) => it.op === '~').slice(0, 200).map((it) => (it.note ? `${it.path}: ${it.note}` : it.path));
  return out;
}

// ------------------------------------------------------------------- run ---

const $ = (id) => document.getElementById(id);

function summaryLines(r) {
  const c = r.counts, p = r.previewCounts;
  const lines = [
    `scene     ${r.scene}`,
    `seed      ${r.seed}   summit draws ${c.draws} (preview ${p.draws})   probe ${r.probe ? 'ok' : 'FAILED'}   Math.random ${r.ambient.draws}`,
    `counts    objects ${c.objects} · aggregates ${c.aggregates} (${c.members} members) · colliders ${c.colliders} · platforms ${c.platforms}`,
    `          state fields ${c.state} · api ${c.api} · preview objects ${p.objects}, members ${p.members}`,
    `loads     ${r.loads.join(', ') || 'none'}`,
    `routing   ${routingLine(r.routing)}`,
    `volatile  ${r.volatile.leaves} leaves as "~", ${r.volatile.members} members left out of aggregates` +
      `${r.ambient.uuidSeparated ? '' : ' (UUIDs NOT separated)'}`,
    `digest    ${r.digestBytes} bytes · golden ${r.golden.found ? r.golden.bytes + ' bytes' : 'missing'} (${r.golden.url})`,
    `time      import ${r.timing.importMs} ms · build ${r.timing.buildMs.join(' + ')} ms · digest ${r.timing.digestMs} ms · total ${r.timing.totalMs} ms`
  ];
  if (r.warnings.length) lines.push('', 'warnings:', ...r.warnings.map((w) => '  ' + w));
  return lines;
}

/** The per-frame drive of the routing test, one line (also printed by summit_golden.mjs). */
function driveLine(d) {
  if (!d) return 'update drive not run';
  const one = (k) => (d[k] && d[k].ran ? `${k} ${d[k].throws} throws, fūrin ${d[k].chimes}` : `${k} not run`);
  return `update drive: ${['classic', 'modular', 'bare'].map(one).join(', ')}; bind warnings ${d.bindWarnings}/${d.boundFields}`;
}

function routingLine(g) {
  if (!g || !g.ran) return g && g.problems ? g.problems.join('; ') : 'not run';
  return `${g.ok ? 'ok' : 'FAILED'}: ${g.ids} summit ids, ${g.classicCalls} classic placeAsset() calls; all modular ` +
    `${g.allModular.kit}/${g.allModular.calls} stand-ins, ${g.allModular.draws} draws (probe ${g.allModular.probe ? 'ok' : 'FAILED'}); ` +
    `single swaps ${g.singles.ok}/${g.singles.of} ok; ${driveLine(g.drive)}; ${g.ms} ms` +
    (g.problemCount ? ` — ${g.problemCount} problem(s): ${g.problems.slice(0, 3).join('; ')}` : '');
}

function changeLines(diff, max) {
  if (!diff) return [];
  if (diff.equal) {
    return diff.advisory.count
      ? [`advisory differences in ${diff.advisory.count} ${diff.advisory.count === 1 ? 'entry' : 'entries'} (not part of the verdict; --write refreshes them):`,
        ...diff.where, ...diff.advisory.items.slice(0, 12).map((it) => `  ${it.op} ${it.path}`)]
      : [];
  }
  const lines = diff.where.length ? [...diff.where, ''] : [];
  const sections = Object.entries(diff.sections);
  if (sections.length) {
    lines.push('section'.padEnd(22) + 'added'.padStart(8) + 'removed'.padStart(9) + 'changed'.padStart(9));
    for (const [s, n] of sections) lines.push(s.padEnd(22) + String(n.added).padStart(8) + String(n.removed).padStart(9) + String(n.changed).padStart(9));
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
  ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
  ({ SummitManager } = await import('../src/mountaintop.js?v=20261113a'));
  const tImport = realNow();
  instrument();
  // The UUID stream must stay apart from the game's Math.random() stream.
  const before = ambient.draws;
  THREE.MathUtils.generateUUID();
  new THREE.Object3D();
  const uuidSeparated = ambient.draws === before;

  const sceneNote = 'SummitManager on a stub game (scene, sky, player mesh), as src/main.js builds it; preview = summitPreview: true; no renderer';
  const builds = [];
  for (const preview of [false, true]) {
    for (const spec of BUILDS) builds.push(await buildOnce(spec, preview));
  }
  const tBuilt = realNow();
  const game = finalize(builds[0], builds[1]);
  const prev = finalize(builds[2], builds[3]);
  const digest = {
    format: FORMAT,
    version: VERSION,
    scene: sceneNote,
    seed: SUMMIT_SEED,
    ...game.digest,
    preview: previewDelta(game.digest, prev.digest),
    volatile: {
      note: 'values that differ between two builds with different Math.random seeds and clocks: written as "~"; unnamed members left out of their aggregate (vol)',
      leaves: game.leaves.length + prev.leaves.length,
      members: game.members + prev.members,
      paths: game.leaves.concat(prev.leaves.map((p) => 'preview:' + p)).slice(0, 80)
    }
  };
  const text = toText(digest);
  const routing = await routingTest(builds[0], builds[2]);
  const warnings = [...new Set(builds.flatMap((b) => b.warnings))];
  for (const [label, f] of [['game', game], ['preview', prev]]) {
    if (f.unstable.length) warnings.push(`${label}: the two builds differ in shape at ${f.unstable.length} place(s): ${f.unstable.slice(0, 5).join(', ')}`);
  }
  if (!digest.rng.summit.probe) warnings.push('rng probe failed: the counted draws do not match the summit stream position');
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
    counts: digest.counts, previewCounts: digest.preview.counts,
    probe: digest.rng.summit.probe && digest.preview.rng.summit.probe,
    loads: digest.loads,
    volatile: { leaves: digest.volatile.leaves, members: digest.volatile.members },
    ambient: { draws: digest.rng.ambient.draws, uuidSeparated },
    golden, equal: !!(diff && diff.equal), diff, warnings, routing,
    digestBytes: new TextEncoder().encode(text).length,
    builds: builds.map((b) => ({ label: b.label, preview: b.preview, draws: b.rng.summit.draws, objects: b.objects.length })),
    timing: {
      importMs: Math.round(tImport - tStart),
      buildMs: builds.map((b) => Math.round(b.buildMs)),
      digestMs: Math.round(tEnd - tBuilt),
      totalMs: Math.round(tEnd - tStart)
    },
    digestText: text
  };
  window.__summitGolden = result;

  const statusEl = $('status');
  $('golden').textContent = GOLDEN_URL.startsWith('/') ? GOLDEN_URL.slice(1) : 'tools/' + GOLDEN_URL.replace(/^\.\//, '');
  if (!golden.found) {
    statusEl.textContent = `no usable golden at ${GOLDEN_URL} (${golden.error}): write it with node tools/summit_golden.mjs --write`;
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
  window.__summitGolden = { done: true, ok: false, error: message };
  $('status').textContent = 'failed: ' + message;
  $('status').className = 'failed';
});
