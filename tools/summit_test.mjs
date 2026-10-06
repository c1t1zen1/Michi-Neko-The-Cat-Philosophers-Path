// Headless logic test for the 天上 summit state machine.
//
// The summit scene is pure WebGL and cannot run without a GPU. This harness
// loads the REAL src/mountaintop.js source and rewrites only its three import
// statements to local stubs, so the actual shipped logic — unlock counting,
// enter/exit transitions, containment, the meditation timer and the sleep
// beat — is what gets exercised.
//
//   node tools/summit_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};

/* ---------------- three stub (only what mountaintop touches) ---------------- */
const V3 = class {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  distanceToSquared(v) { const a = this.x - v.x, b = this.y - v.y, c = this.z - v.z; return a * a + b * b + c * c; }
  addScaledVector() { return this; }
};
const node3 = () => ({
  position: new V3(),
  rotation: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } },
  scale: {
    x: 1, y: 1, z: 1,
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
    setScalar(s) { this.x = this.y = this.z = s; return this; },
  },
  userData: {}, children: [], name: '', visible: true, frustumCulled: true, renderOrder: 0,
  add(c) { this.children.push(c); return this; },
  remove() {}, traverse() {}, lookAt() {},
  updateMatrix() {}, updateMatrixWorld() {}, matrix: {}, matrixWorld: {},
});
const geo3 = () => ({
  attributes: { position: { count: 0, setXYZ() {}, getX: () => 0, getY: () => 0, getZ: () => 0, needsUpdate: false } },
  setAttribute() {}, translate() {}, computeVertexNormals() {}, boundingSphere: null, dispose() {},
});
const mat = (o = {}) => ({ ...o, color: { setHex() {}, copy() {}, lerp() {}, multiplyScalar() {} } });

// Geometry/matrix helpers the scene builders chain onto merged buffers.
const NOOP_GEO = () => {};
class Geo {
  constructor() {
    // A tiny real position buffer so `.count` and setXYZ/getX read sensibly.
    this.attributes = {
      position: { count: 0, setXYZ() {}, getX: () => 0, getY: () => 0, getZ: () => 0, needsUpdate: false, array: [] },
      normal: { count: 0, array: [] },
      uv: { count: 0, array: [] },
    };
    this.boundingSphere = null;
    this.morphAttributes = {};
  }
  rotateX() { return this; }
  rotateY() { return this; }
  rotateZ() { return this; }
  scale() { return this; }
  translate() { return this; }
  setAttribute() { return this; }
  computeVertexNormals() { return this; }
  computeBoundingSphere() { return this; }
  setFromPoints() { return this; }
  clone() { return new Geo(); }
  dispose() {}
}
const THREE = {
  Vector2: class { constructor() { this.x = 0; this.y = 0; } },
  Vector3: V3,
  Color: class { constructor() {} setHex() { return this; } copy() { return this; } lerp() { return this; } multiplyScalar() { return this; } },
  Group: class { constructor() { Object.assign(this, node3()); } },
  Object3D: class { constructor() { Object.assign(this, node3()); } },
  Mesh: class { constructor(g, m) { Object.assign(this, node3()); this.geometry = g; this.material = m; } },
  Points: class { constructor(g, m) { Object.assign(this, node3()); this.geometry = g; this.material = m; } },
  Sprite: class { constructor(m) { Object.assign(this, node3()); this.material = m; } },
  InstancedMesh: class {
    constructor(g, m, n) {
      Object.assign(this, node3());
      this.geometry = g; this.material = m; this.count = n;
      this.instanceMatrix = { needsUpdate: false };
    }
    setMatrixAt() {}
    getMatrixAt(m) { return m; }
    setColorAt() {}
    computeBoundingSphere() {}
  },
  InstancedBufferGeometry: Geo, BufferGeometry: Geo,
  BoxGeometry: Geo, CylinderGeometry: Geo, SphereGeometry: Geo, CircleGeometry: Geo,
  ConeGeometry: Geo, PlaneGeometry: Geo, RingGeometry: Geo, TorusGeometry: Geo,
  LatheGeometry: Geo, TetrahedronGeometry: Geo, IcosahedronGeometry: Geo,
  CapsuleGeometry: Geo, ExtrudeGeometry: Geo, ShapeGeometry: Geo,
  BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } },
  InstancedBufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
  CanvasTexture: class { constructor() { this.colorSpace = ''; this.wrapS = 0; this.wrapT = 0; this.repeat = { set() {} }; } },
  PointsMaterial: class { constructor(o) { Object.assign(this, o); } },
  MeshBasicMaterial: class { constructor(o) { Object.assign(this, o); } },
  MeshLambertMaterial: class { constructor(o) { Object.assign(this, o); } },
  MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); } },
  MeshDepthMaterial: class { constructor(o) { Object.assign(this, o); } },
  SpriteMaterial: class { constructor(o) { Object.assign(this, o); } },
  DynamicDrawUsage: 35048, DoubleSide: 2, FrontSide: 0, AdditiveBlending: 2, SRGBColorSpace: 'srgb',
  MathUtils: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t },
  Sphere: class { constructor(c, r) { this.center = c; this.radius = r; } },
  Box3: class {
    constructor() { this.min = new V3(Infinity, Infinity, Infinity); this.max = new V3(-Infinity, -Infinity, -Infinity); }
    setFromObject() { return this; }
    expandByPoint() { return this; }
    getSize(v) { return v.set(0, 0, 0); }
  },
  Euler: class { constructor() { this.x = 0; this.y = 0; this.z = 0; } set() { return this; } },
  Matrix4: class { constructor() { this.elements = []; } makeRotationX() { return this; } identity() { return this; } },
  Quaternion: class { constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; } },
  Frustum: class { intersectsObject() { return true; } },
  Raycaster: class { constructor() { this.ray = { origin: new V3(), direction: new V3() }; } set() { return this; } },
};

const mergeGeometries = () => geo3();

const texturesStub = {
  dirtTextures: () => ({}), stoneTextures: () => ({}), woodTextures: () => ({}),
  metalTextures: () => ({}), barkTextures: () => ({}),
  texturedMaterial: (s, o) => mat({ map: s, ...o }),
  worldNoise: () => 0, glowTexture: () => ({}),
};
const foliageStub = {
  createFoliageMaterial: () => mat(), createFoliageDepthMaterial: () => mat(),
  leafCardTexture: () => ({}), leafCardGeometry: () => ({}),
  buildCanopy: () => ({ parts: [], extents: null }), updateFoliage: () => {},
  lumpyTuftGeometry: () => ({}),
};
/* ---------------- load the real module source ---------------- */
let src = readFileSync(join(ROOT, 'src', 'mountaintop.js'), 'utf8');
// Strip imports (some are multi-line, so match `from '...'` through the `;`).
src = src.replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*;?/gm, '');
if (/^\s*import\s/m.test(src)) {
  console.error('import strip failed');
  process.exit(1);
}

const canvasStub = () => ({
  width: 1024, height: 512,
  getContext: () => ctx2d,
  toDataURL: () => 'data:,',
});
// 2D context no-op: enough for the procedural vista texture pass.
const ctx2d = new Proxy({
  canvas: null,
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  measureText: () => ({ width: 0 }),
}, {
  get(t, k) {
    if (k in t) return t[k];
    return () => {};
  },
  set(t, k, v) { t[k] = v; return true; },
});

// Transition-veil element stub: classList + the video element's lazy src.
const makeOverlay = () => {
  const classes = new Set();
  return {
    classes,
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, on) => { if (on === undefined) classes.has(c) ? classes.delete(c) : classes.add(c); else if (on) classes.add(c); else classes.delete(c); },
    },
    style: {},
  };
};
const overlays = {
  'summit-transition': makeOverlay(),
  'summit-video': { src: '', muted: true, preload: 'none', onended: null, onerror: null,
    load() {}, play() { return Promise.reject(new Error('no codec in test')); } },
};

const sandbox = {
  THREE, mergeGeometries, console, Math, Date, JSON,
  Set, Map, Array, Object, String, Boolean, Number, Infinity, isFinite,
  Uint8ClampedArray, Uint8Array, Float32Array, parseInt, parseFloat, isNaN,
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: {
    createElement: (tag) => (tag === 'canvas' ? canvasStub() : { style: {} }),
    getElementById: (id) => overlays[id] || null,
  },
  window: {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

// Re-declare ONLY the names that came from the stripped imports. Everything
// else (ORIGIN, MEDITATE_SECONDS, mulberry32, clamp01, box, …) stays the real
// module-scope definition from src/mountaintop.js, so the constants under test
// are the shipped ones.
const pre = `
  const dirtTextures = () => ({}), stoneTextures = () => ({}), woodTextures = () => ({}),
        metalTextures = () => ({}), barkTextures = () => ({}),
        texturedMaterial = (s, o) => Object.assign({ map: s }, o || {}),
        worldNoise = () => 0, glowTexture = () => ({});
  const createFoliageMaterial = () => ({}), createFoliageDepthMaterial = () => ({}),
        leafCardTexture = () => ({}), leafCardGeometry = () => ({}),
        buildCanopy = () => ({ branches: new THREE.BufferGeometry(), tufts: new THREE.BufferGeometry(), cards: new THREE.BufferGeometry(), extents: null }),
        updateFoliage = () => {}, lumpyTuftGeometry = () => ({});
`;
vm.runInContext(pre + src.replace('export class SummitManager', 'class SummitManager') +
  '\nthis.SummitManager = SummitManager;', sandbox);

const toasts = [];
const audioCalls = [];
const sceneChildren = [];

function makeGame() {
  audioCalls.length = 0; toasts.length = 0; sceneChildren.length = 0;
  const guard = (name) => (...a) => { audioCalls.push(name); };
  const game = {
    audioCalls, toasts, thicketCalls: [],
    scene: { children: sceneChildren, add(o) { sceneChildren.push(o); } },
    player: {
      mesh: { position: new V3(0, 0, -20), rotation: { y: 0 }, userData: {} },
      velocity: new V3(), heading: 0, yaw: 0, yawPrev: 0, actionLocked: false,
      isGrounded: true, inWater: false, currentSpeed: 0,
      moveInput: { lengthSq: () => 0, set() {} },
      cat: {
        idleAction: null, idleActionTimer: 0, idleActionDuration: 0, idleTimer: 0,
        state: 'idle', mood: null,
        endIdleAction() { this.idleAction = null; this.idleTimer = 0; },
        setMood(m) { this.mood = m; },
      },
    },
    controls: { enabled: true },
    camera: { position: new V3(), lookAt() {} },
    ui: {
      showToast: (m) => toasts.push(m),
      hideAllGuidance() { this.guidanceHidden = true; },
      guidanceHidden: false,
    },
    audio: {
      playMonkChoir: guard('choir'), playDreamChime: guard('chime'),
      playSingingBowl: guard('bowl'), setSummitWind: (on) => audioCalls.push(on ? 'wind:on' : 'wind:off'),
      playPurr: guard('purr'),
    },
    sky: {
      dome: node3(), stars: node3(), moon: node3(), sun: { ...node3(), target: node3() },
      hemi: node3(), fill: node3(), bounce: { ...node3(), target: node3() },
      clouds: [],
      weather: 'clear', targetWeather: 'clear', weatherBlend: 1, weatherTimer: 0,
      weatherDurations: { clear: 100, rain: 100, mist: 100, cloudy: 100, snow: 100 },
      weatherPool: null, sunDir: new V3(0, 1, 0),
      setWeather(t) { this.targetWeather = t; },
      buildCloudTexture: () => ({}),
      resolvePalette: () => ({ sun: { copy() {}, lerp() {} } }),
      getWeatherTransition: () => ({ from: 'clear', to: 'clear', blend: 1 }),
    },
    vegetation: {
      bladeGeometry: () => new THREE.BufferGeometry(),
      grassMaterial: () => mat({
        uniforms: {
          uTime: { value: 0 }, uWind: { value: 0 }, uPlayerPos: { value: new V3() },
          uSunDir: { value: new V3() }, uSunColor: { value: new THREE.Color() },
          uRootColor: { value: new THREE.Color() }, uMidColor: { value: new THREE.Color() },
          uTipColor: { value: new THREE.Color() },
        },
      }),
    },
    waypoints: { setTargets() {} },
    quest: {}, progression: { addXP() {} },
    discover() {}, saveGame() {}, music: { swell() {} }, refreshCompassPois() {},
    city: {
      secretDoorSpawnPos: { x: 20, z: 14.5 }, colliders: [],
      setShrineThicketOpen: (t) => game.thicketCalls.push(t),
    },
  };
  return game;
}

const SummitManager = sandbox.SummitManager;

console.log('\n=== 天上 summit logic ===\n');

// --- construction ---
let g = makeGame();
let S;
try {
  S = new SummitManager(g);
  ok('constructs', !!S && !!S.group);
} catch (e) {
  ok('constructs', false, e.message + '\n' + String(e.stack || '').split('\n').slice(1, 5).join('\n'));
}
if (!S) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }

ok('starts locked', S.unlocked === false && S.bellRings === 0);
ok('group hidden at boot', S.group.visible === false);
ok('has torii', !!S.torii);
ok('has meadow + vista + rays in the group',
  !!S.vista && !!S.raysGroup && !!S.group.children.length);
ok('has dense grass field', !!S.grassMat && !!S.grassMat.uniforms);
ok('has vista backdrop', !!S.vista);
ok('has summit-local snow', !!S.snow && !!S.snowMat, 'buildSummitSnow missing');
ok('snow parks itself when clear', S.snow.visible === false);
ok('no collectibles on a respite scene', Array.isArray(S.collectibles) && S.collectibles.length === 0);

// --- ten-bell unlock ---
for (let i = 0; i < 9; i++) S.onBellRing();
ok('9 rings stay locked', S.unlocked === false && S.bellRings === 9);
ok('9th ring teases the player', toasts.some((t) => /listening/i.test(t)));

S.onBellRing();
ok('10th ring unlocks the summit', S.unlocked === true);
ok('monk choir plays on the tenth bell', audioCalls.includes('choir'));
ok('light rays switch on', S.raysGroup.visible === true);
ok('unlock announces the path', toasts.some((t) => /Light spills/i.test(t)));

const choirs = audioCalls.filter((c) => c === 'choir').length;
S.onBellRing();
ok('re-ringing never re-fires the unlock',
  audioCalls.filter((c) => c === 'choir').length === choirs);

// --- beacon tick while still in the valley ---
const t0 = S.time;
S.update(0.016, true);
ok('beacon pulses in the valley once unlocked', S.time > t0 && S.active === false);
ok('the thicket behind the shrine parts open',
  g.thicketCalls.length > 0 && g.thicketCalls[g.thicketCalls.length - 1] > 0,
  `calls=${g.thicketCalls.length}`);

// --- entry (skip the cinematic timers) ---
S.enterImmediate();
ok('summit becomes active', S.active === true);
ok('summit group becomes visible', S.group.visible === true);
ok('summit wind bed starts', audioCalls.includes('wind:on'));
ok('guidance UI is hidden', g.ui.guidanceHidden === true);
ok('weather pool drops rain and mist',
  !!g.sky.weatherPool && g.sky.weatherPool.includes('snow') &&
  !g.sky.weatherPool.includes('rain') && !g.sky.weatherPool.includes('mist'));
ok('weather durations swapped', g.sky.weatherDurations.clear === 300);

// ORIGIN is (0, -1200, 0), so world z == local z and world y == local y - 1200.
const pp = g.player.mesh.position;
ok('cat lands on the torii landing',
  Math.abs(pp.y - (-1201.6)) < 0.01 && Math.abs(pp.z - (-42.4)) < 0.01,
  `y=${pp.y} z=${pp.z}`);

// The player physics compares groundAt() against the cat's WORLD y — local
// heights here would snap the cat from the summit pocket to valley level.
ok('groundAt returns world heights',
  Math.abs(S.groundAt(0, -42.4) - (-1201.6)) < 0.01 &&
  Math.abs(S.groundAt(0, 0) - (-1200)) < 0.01,
  `corridor=${S.groundAt(0, -42.4)} meadow=${S.groundAt(0, 0)}`);

// --- containment: the cat can never wander off the summit ---
const runaway = { x: 300, y: 0, z: 0 };
S.constrain(runaway);
ok('runaway is pulled back inside', Math.abs(runaway.x) < 300, `x=${runaway.x}`);

// --- torii crossing exits (walking back under the gate) ---
// The trigger band is lz in (GATE_Z-1.6, GATE_Z-0.4) = (-45.6, -44.4).
g.player.mesh.position.set(0, -1201.6, -45.0);
S.update(0.016, true);
ok('crossing the torii starts the descent', S.transitioning === true,
  'torii exit trigger did not fire — the cat would be stranded');

// exit() teleports behind a 900 ms veil, then fades it over a further 900 ms.
await new Promise((r) => setTimeout(r, 2400));
ok('the summit closes behind the cat', S.active === false);
ok('summit wind bed stops', audioCalls.includes('wind:off'));
ok('exit places the cat under the valley torii',
  Math.abs(g.player.mesh.position.y) < 0.01 && Math.abs(g.player.mesh.position.z + 23.6) < 0.01,
  `y=${g.player.mesh.position.y} z=${g.player.mesh.position.z}`);
ok('exit leaves the veil fully cleared for the next ascent',
  !overlays['summit-transition'].classList.contains('show') &&
  !overlays['summit-transition'].classList.contains('quick') &&
  !overlays['summit-transition'].classList.contains('fallback'),
  [...overlays['summit-transition'].classes].join(','));

// --- meditation -> sleep ---
// The meditation beat lives inside update(), so drive it through that.
g = makeGame();
S = new SummitManager(g);
S.setUnlocked(true, true);
ok('restore-from-save opens the thicket instantly', g.thicketCalls.includes(1));
S.enterImmediate();

// Park the cat dead-centre in the meadow heart, sitting and perfectly still.
// `cat.idleTimer` must exceed 2.5s for update() to decide the sit for itself,
// which is exactly the "sit long enough" affordance the design asks for.
const park = () => {
  g.player.mesh.position.set(0, -1200, 0);
  g.player.cat.state = 'idle';
  g.player.isGrounded = true;
  g.player.currentSpeed = 0;
  g.player.actionLocked = false;
  // Don't stomp a sleep that update() has already earned.
  if (g.player.cat.idleAction !== 'sleep') g.player.cat.idleAction = 'sit';
};
park();
for (let i = 0; i < 40; i++) { park(); S.update(0.5, true); }
ok('the summit makes the cat sit down on its own',
  g.player.cat.idleAction === 'sit' || S.sleeping,
  `idleAction=${g.player.cat.idleAction}`);

const med0 = S.meditateT;
for (let i = 0; i < 40; i++) { park(); S.update(0.5, true); }
ok('stillness accumulates toward sleep', S.meditateT > med0 + 15,
  `t=${S.meditateT.toFixed(1)}`);
ok('not asleep before the threshold', S.sleeping === false);

for (let i = 0; i < 700; i++) { park(); S.update(0.5, true); }
ok('sleeps after the stillness threshold', S.sleeping === true,
  `t=${S.meditateT.toFixed(1)}`);
ok('sleep lands in the 2-3 minute window',
  S.meditateT >= 120 && S.meditateT <= 210, `t=${S.meditateT.toFixed(1)}s`);
ok('the cat curls into a ball', g.player.cat.idleAction === 'sleep');
ok('the sleep pose holds indefinitely', g.player.cat.idleActionDuration === Infinity);
ok('a singing bowl rings the moment of sleep', audioCalls.includes('bowl'));

// moving again breaks the meditation
g.player.moveInput.lengthSq = () => 4;
park();
S.update(0.5, true);
ok('walking away breaks the spell', S.sleeping === false);

// --- the sleep can be earned again after waking -----------------------------
// 400 × 0.5 s = 200 s, comfortably past the 165 s stillness threshold.
for (let i = 0; i < 400; i++) { g.player.moveInput.lengthSq = () => 0; park(); S.update(0.5, true); }
ok('the cat can fall asleep a second time', S.sleeping === true,
  `t=${S.meditateT.toFixed(1)}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);