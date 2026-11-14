// Cat numeric golden (BUILD_GUIDE_FABLE.md §10, lane c1-rig-split: C1.4, C1.5).
//
// Builds real cats through src/cat.js (and src/npc.js, src/player.js) with
// Math.random seeded and counted and performance.now on a stepping clock,
// then records everything a refactor of the Cat could change:
//
//  - construction order: three.js draws four Math.random values for every
//    uuid, so the uuid sequence is the order in which each object, geometry,
//    material, texture and skeleton was made (the review sheets seed
//    Math.random too, so this order is what keeps them byte-identical)
//  - the scene graph (types, names, parents, transforms, flags, userData)
//  - geometry (attribute hashes), materials, textures (canvas hashes),
//    skeletons, the cached sculpt per body type
//  - each Cat's own fields, the class surface (methods + arity) and the
//    module's exports
//  - every pose of tools/cat_preview.js and scripted behaviour runs (gait,
//    jumps, moods, idle verbs, look-at, drinking, sounds, villagers, the
//    Master Cat bells), sampled frame by frame
//
// tools/cat_golden.mjs runs this page headlessly and compares the digest
// with tools/golden/cat_classic.json. When src/characters/ exists the page
// also runs the CharacterDef contract checks; they run after the digest is
// taken, so they cannot move it.
import * as THREE from 'three';

const TAG = '20261107a';
const STEP = 1 / 60;
const startedAt = performance.now();

// ---------------------------------------------------------------- determinism

let seed = 20261022;
let draws = 0;
Math.random = () => { draws++; seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
let clockMs = 0;
const realNow = performance.now.bind(performance);
performance.now = () => clockMs;

// -------------------------------------------------------------------- hashing

function fnv(bytes, h = 0x811c9dc5) {
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const hex = (h) => h.toString(16).padStart(8, '0');
function hashArray(arr) {
  const ta = ArrayBuffer.isView(arr) ? arr : new Float64Array(arr);
  return hex(fnv(new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength)));
}
const hashString = (s) => hex(fnv(new TextEncoder().encode(s)));
const r6 = (x) => Math.round(x * 1e6) / 1e6;

// --------------------------------------------------------------------- tables

const T = { geometries: [], materials: [], textures: [], skeletons: [], anatomies: [] };
const ids = { geo: new Map(), mat: new Map(), tex: new Map(), skel: new Map(), anat: new Map() };

function ref(kind, table, x, describe) {
  if (!x) return null;
  if (!ids[kind].has(x)) {
    const i = T[table].length;
    ids[kind].set(x, i);
    T[table].push(null);
    T[table][i] = describe(x);
  }
  return ids[kind].get(x);
}
const texRef = (t) => ref('tex', 'textures', t, describeTexture);
const matRef = (m) => ref('mat', 'materials', m, describeMaterial);
const geoRef = (g) => ref('geo', 'geometries', g, describeGeometry);
const skelRef = (s) => ref('skel', 'skeletons', s, describeSkeleton);
const anatRef = (a) => ref('anat', 'anatomies', a, describeAnatomy);

function describeTexture(t) {
  const img = t.image;
  let data = null;
  if (img && typeof img.toDataURL === 'function') data = hashString(img.toDataURL());
  else if (img && img.data) data = hashArray(img.data);
  return {
    uuid: t.uuid, cls: t.constructor.name, w: img ? img.width : null, h: img ? img.height : null,
    colorSpace: t.colorSpace, anisotropy: t.anisotropy, wrap: [t.wrapS, t.wrapT], filter: [t.minFilter, t.magFilter],
    mips: t.generateMipmaps, flipY: t.flipY, data
  };
}

function uniformValue(v) {
  if (v && (v.isColor || v.isVector2 || v.isVector3 || v.isVector4)) return v.toArray();
  return v;
}

function describeMaterial(m) {
  const out = {
    uuid: m.uuid, type: m.type, name: m.name, side: m.side, transparent: m.transparent, opacity: m.opacity,
    depthWrite: m.depthWrite, depthTest: m.depthTest, visible: m.visible
  };
  if (m.color) out.color = m.color.toArray();
  for (const k of ['metalness', 'roughness', 'envMapIntensity', 'emissiveIntensity', 'linewidth']) if (m[k] !== undefined) out[k] = m[k];
  if (m.emissive) out.emissive = m.emissive.toArray();
  for (const k of ['map', 'gradientMap', 'envMap', 'normalMap', 'alphaMap']) if (m[k]) out[k] = texRef(m[k]);
  out.defines = m.defines ? JSON.stringify(m.defines) : null;
  out.cacheKey = m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ? m.customProgramCacheKey() : null;
  out.compile = m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ? hashString(m.onBeforeCompile.toString()) : null;
  if (m.userData && m.userData.uniforms) {
    const u = {};
    for (const k of Object.keys(m.userData.uniforms).sort()) u[k] = uniformValue(m.userData.uniforms[k].value);
    out.uniforms = u;
  }
  return out;
}

function describeGeometry(g) {
  const attrs = {};
  for (const name of Object.keys(g.attributes).sort()) {
    const a = g.attributes[name];
    attrs[name] = [a.itemSize, a.count, a.normalized, hashArray(a.array)];
  }
  const morph = {};
  for (const name of Object.keys(g.morphAttributes).sort()) {
    morph[name] = g.morphAttributes[name].map((a) => [a.itemSize, a.count, hashArray(a.array)]);
  }
  const bs = g.boundingSphere ? [...g.boundingSphere.center.toArray(), g.boundingSphere.radius] : null;
  const bb = g.boundingBox ? [...g.boundingBox.min.toArray(), ...g.boundingBox.max.toArray()] : null;
  return {
    uuid: g.uuid, type: g.type, params: g.parameters ? JSON.stringify(g.parameters) : null, attrs,
    index: g.index ? [g.index.count, hashArray(g.index.array)] : null, morph, morphRelative: g.morphTargetsRelative,
    groups: g.groups.length ? JSON.stringify(g.groups) : null, drawRange: [g.drawRange.start, String(g.drawRange.count)], bs, bb,
    userData: Object.keys(g.userData).length ? Object.keys(g.userData).sort() : null
  };
}

function describeSkeleton(s) {
  return { uuid: s.uuid, bones: s.bones.map((b) => b.name), inverses: hashArray(s.boneInverses.flatMap((m) => m.elements)) };
}

function describeAnatomy(a) {
  const { buildMs, timings, ...rest } = a;
  return ser(rest, { index: new Map(), anatomy: null });
}

// ------------------------------------------------------------- serialisation

/** Any value reachable from a Cat, with three.js objects as table references. */
function ser(v, ctx, depth = 0) {
  if (v === undefined) return '<undefined>';
  if (v === null) return null;
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v) ? v : String(v);
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'function') return '<fn>';
  if (v.isObject3D) return { node: ctx.index.has(v) ? ctx.index.get(v) : 'outside:' + v.type + ':' + v.name };
  if (v.isMaterial) return { mat: matRef(v) };
  if (v.isBufferGeometry) return { geo: geoRef(v) };
  if (v.isTexture) return { tex: texRef(v) };
  if (v instanceof THREE.Skeleton) return { skel: skelRef(v) };
  if (ctx.anatomy && v === ctx.anatomy) return { anatomy: anatRef(v) };
  if (v.isVector2 || v.isVector3 || v.isVector4 || v.isQuaternion || v.isColor || v.isMatrix3 || v.isMatrix4) {
    return { [v.constructor.name]: v.toArray() };
  }
  if (v.isEuler) return { Euler: v.toArray() };
  if (v instanceof THREE.Sphere) return { Sphere: [...v.center.toArray(), v.radius] };
  if (ArrayBuffer.isView(v)) return { typed: v.constructor.name, n: v.length, hash: hashArray(v) };
  if (depth > 7) return '<deep>';
  if (Array.isArray(v)) return v.map((x) => ser(x, ctx, depth + 1));
  if (v instanceof Map) return { Map: [...v.entries()].map(([k, x]) => [k, ser(x, ctx, depth + 1)]) };
  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = ser(v[k], ctx, depth + 1);
  return out;
}

function describeNode(o, index) {
  const n = {
    type: o.type, name: o.name, uuid: o.uuid,
    parent: o.parent ? (index.has(o.parent) ? index.get(o.parent) : 'outside') : null,
    p: o.position.toArray(), q: o.quaternion.toArray()
  };
  // Flags only where they differ from three.js defaults
  if (o.scale.x !== 1 || o.scale.y !== 1 || o.scale.z !== 1) n.s = o.scale.toArray();
  if (o.rotation.order !== 'XYZ') n.order = o.rotation.order;
  if (!o.visible) n.vis = false;
  if (o.castShadow) n.cast = true;
  if (o.receiveShadow) n.recv = true;
  if (o.renderOrder) n.ro = o.renderOrder;
  if (!o.frustumCulled) n.fc = false;
  if (!o.matrixAutoUpdate) n.mau = false;
  if (o.layers.mask !== 1) n.layers = o.layers.mask;
  if (o.geometry) n.geo = geoRef(o.geometry);
  if (o.material) n.mat = Array.isArray(o.material) ? o.material.map(matRef) : matRef(o.material);
  if (o.isSkinnedMesh) { n.skel = skelRef(o.skeleton); n.bindMode = o.bindMode; n.bind = hashArray(o.bindMatrix.elements); }
  if (o.morphTargetInfluences) n.morph = [...o.morphTargetInfluences];
  if (o.boundingSphere) n.bs = [...o.boundingSphere.center.toArray(), o.boundingSphere.radius];
  const ud = {};
  for (const k of Object.keys(o.userData).sort()) {
    const v = o.userData[k];
    ud[k] = v && v.isObject3D ? { node: index.has(v) ? index.get(v) : 'outside' } : v;
  }
  if (Object.keys(ud).length) n.ud = ud;
  return n;
}

function graphOf(root) {
  const nodes = [];
  const index = new Map();
  root.traverse((o) => { index.set(o, nodes.length); nodes.push(o); });
  return { index, nodes: nodes.map((o) => describeNode(o, index)) };
}

/** The whole Cat: graph, fields, how its uniforms are wired to its state. */
function describeCat(cat, label, extra = {}) {
  const { index, nodes } = graphOf(cat.group);
  const ctx = { index, anatomy: cat.anatomy };
  const fields = {};
  for (const k of Object.keys(cat).sort()) fields[k] = ser(cat[k], ctx);
  const u = cat.matHead && cat.matHead.userData.uniforms;
  const links = u ? {
    face: u.uEyeState.value === cat.face.state && u.uLook.value === cat.face.look && u.uMouth === cat.face.mouth && u.uEyeC.value === cat.face.eyeC,
    palette: u.uFur.value === cat.palette.fur && u.uBelly.value === cat.palette.belly && u.uStripe.value === cat.palette.stripe &&
      u.uStripeZ.value === cat.palette.stripeZ && u.uTrunk.value === cat.palette.trunk,
    bodyShares: cat.matBody.userData.uniforms.uFur.value === cat.palette.fur && cat.matTail.userData.uniforms.uFur.value === cat.palette.fur
  } : null;
  return { label, ...extra, anatomy: anatRef(cat.anatomy), nodes, fields, links };
}

// ------------------------------------------------------------------ snapshots

const SCALARS = [
  'time', 'phase', 'speedBlend', 'speed', 'trotMix', 'gallopMix', 'gaitAmp', 'airBlend', 'landBlend',
  'blinkTimer', 'blink', 'slowBlink', 'slowBlinkTimer', 'earTwitch', 'earTwitchTimer', 'earTwitchSide', 'purr',
  'lookYaw', 'lookPitch', 'gazeTimer', 'squint', 'mouthOpen', 'tailPuff', 'mood', 'moodTimer', 'moodPriority', 'state',
  'idleTimer', 'idleAction', 'idleActionTimer', 'idleActionDuration', 'nextIdleTime', 'jumpTime', 'landTime', 'yawnOpen',
  'isSprinting', 'isTurning', 'inWater', 'isProwling', 'isDrinking', 'isMeowing', 'meowTimer', 'actionName', 'actionWeight'
];
const POSES = ['neutral', 'locoPose', 'airPose', 'actionPose', 'actionTarget', 'pose'];

function flatPose(P) {
  const out = [];
  for (const k of Object.keys(P).sort()) {
    if (k === 'paws') for (const p of P.paws) out.push(p.x, p.y, p.z, p.flex, p.toe);
    else out.push(P[k]);
  }
  return out;
}

function snapshot(cat, full = true) {
  cat.group.updateMatrixWorld(true);
  cat.skeleton.update();
  const bt = [];
  for (const b of cat.bones) bt.push(...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray());
  const ears = cat.ears.flatMap((e) => [e.rotation.x, e.rotation.y, e.rotation.z]);
  const state = {};
  for (const k of SCALARS) state[k] = ser(cat[k], { index: new Map() });
  state.gaze = [...cat.gaze.toArray(), ...cat.gazeTarget.toArray()];
  state.earPose = [cat.earPose.x, cat.earPose.z];
  state.lookTarget = cat.lookTarget ? cat.lookTarget.toArray() : null;
  const face = [...cat.face.state.toArray(), ...cat.face.look.toArray(), cat.face.mouth.value];
  const tail = [cat.tailMesh.morphTargetInfluences[0], cat.tailMesh.userData.outline.morphTargetInfluences[0]];
  const blob = [cat.blob.position.y, cat.blob.scale.x, cat.blob.scale.y, cat.blob.material.opacity];
  const s = {
    draws,
    bones: hashArray(bt), skin: hashArray(cat.skeleton.boneMatrices),
    poses: hashArray(POSES.flatMap((k) => flatPose(cat[k]))),
    ears: hashArray(ears)
  };
  if (!full) {
    // Frame samples: hashes, plus the few values that say where the cat is in its day
    s.face = hashArray(face);
    s.rest = hashArray([...tail, ...blob]);
    s.state = hashString(JSON.stringify(state));
    s.key = [cat.state, cat.mood, cat.idleAction, cat.actionName, r6(cat.actionWeight), r6(cat.phase)];
    return s;
  }
  Object.assign(s, { face, tail, blob, state });
  // Rounded world positions, for reading a difference (the hashes above decide)
  const at = (o) => o.getWorldPosition(new THREE.Vector3()).toArray().map(r6);
  s.read = {
    body: [...cat.body.position.toArray(), cat.body.rotation.x, cat.body.rotation.y, cat.body.rotation.z].map(r6),
    head: cat.head.quaternion.toArray().map(r6),
    paws: cat.legs.map((l) => at(l.paw)),
    tailTip: at(cat.tailSegs[5])
  };
  return s;
}

// ------------------------------------------------------------------- drivers

function step(cat, args) {
  clockMs += STEP * 1000;
  cat.update(STEP, ...args);
}
function frames(cat, n, args, every = 0, out = null, tag = '') {
  for (let i = 1; i <= n; i++) {
    step(cat, args);
    if (out && every && i % every === 0) out.push({ at: tag + '@' + i, ...snapshot(cat, false) });
  }
}

/** tools/cat_preview.js pose(), verbatim: drive a fresh cat into a named pose. */
function run(cat, seconds, args) {
  for (let t = 0; t < seconds; t += STEP) cat.update(STEP, ...args);
}
function pose(cat, name, phase) {
  switch (name) {
    case 'walk':
      run(cat, 1.5, [4.5, true, false, false]);
      cat.phase = phase;
      cat.update(1e-5, 4.5, true, false, false);
      break;
    case 'slow':
      run(cat, 1.5, [1.15, true, false, false]);
      cat.phase = phase;
      cat.update(1e-5, 1.15, true, false, false);
      break;
    case 'run':
      run(cat, 1.5, [7.6, true, true, false]);
      cat.phase = phase;
      cat.update(1e-5, 7.6, true, true, false);
      break;
    case 'prowl':
      cat.setProwling(true);
      run(cat, 1.5, [2.2, true, false, false]);
      cat.phase = phase;
      cat.update(1e-5, 2.2, true, false, false);
      break;
    case 'jump':
      cat.onJump();
      run(cat, 0.2, [0, false, false, false]);
      break;
    case 'drink':
      cat.setDrinking(true);
      run(cat, 0.5, [0, true, false, false]);
      break;
    case 'startled':
      cat.setMood('startled', 10, 3);
      run(cat, 1.0, [0, true, false, false]);
      break;
    case 'sit': case 'groom': case 'stretch': case 'yawn': case 'sleep':
      cat.idleAction = name;
      cat.idleActionTimer = 0;
      cat.idleActionDuration = name === 'sleep' ? Infinity : 10;
      run(cat, name === 'sleep' ? 5 : 4, [0, true, false, false]);
      break;
    default:
      run(cat, 1.0, [0, true, false, false]);
  }
}

// Coats of tools/cat_preview.js (which mirrors src/npc.js)
const PALETTES = {
  michi: { fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 },
  luna: { fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, stripeAmount: 0.3, eyeColor: 0xdec056, ribbonColor: 0x2b3d63 },
  mochi: { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, stripeAmount: 1.0, eyeColor: 0xa2ba6e, ribbonColor: 0xc8402a },
  kuro: { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, stripeAmount: 0.0, eyeColor: 0xd8b04a, ribbonColor: 0xc8402a }
};
// Every distinct cell of the review sheets (anatomy, face, gait, poses, coat, stride, sleep, closeup, npcs)
const CELLS = [
  ['michi', 'stand', 0],
  ...[0, 0.125, 0.25, 0.375].map((p) => ['michi', 'walk', p]),
  ['michi', 'run', 0], ['michi', 'run', 0.25], ['michi', 'prowl', 0.25], ['michi', 'walk', 0.3],
  ...['sit', 'sleep', 'groom', 'stretch', 'jump', 'drink', 'yawn', 'startled'].map((p) => ['michi', p, 0]),
  ...[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((p) => ['michi', 'slow', p]),
  ['luna', 'stand', 0], ['mochi', 'stand', 0], ['kuro', 'stand', 0], ['mochi', 'slow', 0.2]
];

function fakeAudio(log) {
  const rec = (name) => (...a) => log.push([clockMs, name, ...a]);
  return { playMeow: rec('meow'), playTrill: rec('trill'), playHiss: rec('hiss'), playChirp: rec('chirp'), playPurr: rec('purr') };
}

// ----------------------------------------------------------------- the digest

async function buildDigest() {
  const mod = await import(`../src/cat.js?v=${TAG}`);
  const { NPC } = await import(`../src/npc.js?v=${TAG}`);
  const { Player } = await import(`../src/player.js?v=${TAG}`);
  const { Cat } = mod;
  const digest = { format: 'michi-neko-cat-golden', version: 1, three: THREE.REVISION };

  // The class surface every caller relies on
  const proto = {};
  for (const k of Object.getOwnPropertyNames(Cat.prototype).sort()) {
    const d = Object.getOwnPropertyDescriptor(Cat.prototype, k);
    proto[k] = typeof d.value === 'function' ? d.value.length : (d.get ? 'get' : typeof d.value);
  }
  const statics = {};
  for (const k of Object.getOwnPropertyNames(Cat).sort()) statics[k] = typeof Cat[k];
  digest.api = { exports: Object.keys(mod).sort(), prototype: proto, statics, ctorLength: Cat.length };

  // 1. Cats as each caller builds them
  const cats = [];
  const make = (label, opts, after) => {
    const d0 = draws;
    const cat = new Cat(opts);
    const constructDraws = draws - d0;
    if (after) after(cat);
    cats.push(describeCat(cat, label, { constructDraws, drawsAfter: draws }));
    return cat;
  };
  const audioLog = [];
  const audio = fakeAudio(audioLog);
  make('player (src/player.js)', { fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26, audio });
  make('luna (src/npc.js)', { stripeAmount: 0.3, idleProfile: { weights: { groom: 0.42, sit: 0.4, stretch: 0.1, yawn: 0.08 }, interval: [9, 16] },
    fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, eyeColor: 0xdec056, ribbonColor: 0x2b3d63, build: 'luna', audio: null });
  make('mochi (src/npc.js)', { stripeAmount: 1.0, idleProfile: { weights: { stretch: 0.4, yawn: 0.3, groom: 0.15, sit: 0.15 }, interval: [8, 15] },
    fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, eyeColor: 0xa2ba6e, ribbonColor: 0xc8402a, build: 'mochi', audio: null });
  make('kuro (src/npc.js)', { stripeAmount: 0.0, idleProfile: { weights: { sit: 0.65, groom: 0.15, stretch: 0.1, yawn: 0.1 }, interval: [14, 24] },
    fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, eyeColor: 0xd8b04a, ribbonColor: 0xc8402a, build: 'kuro', audio: null });
  make('chidori (rooftops/js/game.js)', { fur: 0x8f9095, belly: 0xf3f1ec, accent: 0x55575e, eyeColor: 0x9fd0a8, stripeAmount: 0.55, ribbonColor: 0x3a6fa8 });
  make('cadJS (cadJS/src/app.mjs)', { fur: 0xc99c63, belly: 0xf3e7d0, accent: 0x6b4429, eyeColor: 0xebb02a, ribbonColor: 0x315d80 });
  make('catalog luna (catalog/js/asset-loader.mjs)', { fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, eyeColor: 0xdec056, ribbonColor: 0x2b3d63, stripes: 0.3, build: 'luna' },
    (cat) => { cat.group.scale.setScalar(1); cat.update(0.016, 0, true, false, false, false, null); });
  make('defaults (new Cat())', undefined);
  make('nose colour + unknown build', { noseColor: 0x333333, build: 'larry' });
  make('build object', { build: { girth: 1.04, leg: 1.0, head: 1.0, tail: 0.95, cheeks: 1.0 }, fur: 0x9a7a5a });
  make('master (setMasterCat twice)', { fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 }, (cat) => {
    cat.setMasterCat();
    cat.setMasterCat();
  });
  digest.cats = cats;

  // 2. Every review-sheet pose, built the way tools/cat_preview.js builds it
  const poses = [];
  for (const [name, p, phase] of CELLS) {
    const d0 = draws;
    const cat = new Cat({ ...PALETTES[name], build: name });
    pose(cat, p, phase);
    poses.push({ cell: `${name} ${p} ${phase}`, used: draws - d0, ...snapshot(cat) });
  }
  digest.poses = poses;

  // 3. Scripted behaviour: the player's day, frame by frame
  const scen = [];
  {
    const samples = [];
    const cat = new Cat({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26, audio });
    const holder = new THREE.Group();
    holder.position.set(4, 0.3, -2);
    holder.rotation.y = 0.8;
    holder.add(cat.group);
    cat.group.position.y = 0.035;
    const S = (tag) => samples.push({ at: tag, ...snapshot(cat, false) });
    frames(cat, 60, [0, true, false, false, false, false, null], 20, samples, 'idle');
    frames(cat, 90, [4.5, true, false, false, false, false, null], 15, samples, 'walk');
    cat.onSprint(true);
    frames(cat, 90, [7.6, true, true, false, false, false, null], 15, samples, 'sprint');
    cat.onSprint(false);
    cat.onJump();
    frames(cat, 24, [3, false, false, false, false, false, null], 4, samples, 'air');
    cat.onLand();
    frames(cat, 18, [3, true, false, false, false, false, null], 3, samples, 'land');
    frames(cat, 40, [0, true, false, true, false, false, null], 10, samples, 'turn');
    frames(cat, 40, [1.0, true, false, false, false, true, null], 10, samples, 'water');
    frames(cat, 30, [0.5, true, false, false, false, false, 'yarn'], 10, samples, 'yarn');
    frames(cat, 30, [0, true, false, false, false, false, 'npc'], 10, samples, 'npc');
    cat.setProwling(true);
    frames(cat, 60, [2.2, true, false, false, false, false, null], 15, samples, 'prowl');
    cat.setProwling(false);
    frames(cat, 20, [0, true, false, false, false, false, null], 10, samples, 'unprowl');
    cat.setLookTarget(new THREE.Vector3(5.5, 0.9, -0.5));
    frames(cat, 60, [0, true, false, false, false, false, null], 15, samples, 'look');
    cat.setLookTarget(new THREE.Vector3(1, 2, 3));
    frames(cat, 30, [0, true, false, false, false, false, null], 10, samples, 'look2');
    cat.setLookTarget(null);
    frames(cat, 30, [0, true, false, false, false, false, null], 10, samples, 'unlook');
    cat.setDrinking(true);
    frames(cat, 90, [0, true, false, false, false, false, null], 15, samples, 'drink');
    cat.setDrinking(false);
    frames(cat, 30, [0, true, false, false, false, false, null], 10, samples, 'undrink');
    cat.triggerMeow();
    frames(cat, 40, [0, true, false, false, false, false, null], 5, samples, 'meow');
    cat.setMood('startled', 2, 3);
    frames(cat, 60, [0, true, false, false, false, false, null], 10, samples, 'startled');
    cat.setMood('curious', 1, 0);   // lower priority while startled: ignored
    cat.setMood('sleepy', 3, 3);
    frames(cat, 60, [0, true, false, false, false, false, null], 15, samples, 'sleepy');
    for (const [verb, dur, n] of [['sit', 3, 200], ['groom', 4, 260], ['stretch', 3, 200], ['yawn', 2, 140], ['sleep', 9999, 300]]) {
      cat.startIdleAction(verb, dur);
      frames(cat, n, [0, true, false, false, false, false, null], 20, samples, verb);
    }
    cat.endIdleAction();
    frames(cat, 60, [0, true, false, false, false, false, null], 20, samples, 'woke');
    // src/context_actions.js and src/mountaintop.js write the idle fields directly
    cat.setMood('sleepy', 4.0, 3);
    cat.idleAction = 'sit'; cat.idleActionTimer = 0; cat.idleActionDuration = 4.0;
    frames(cat, 300, [0, true, false, false, false, false, null], 30, samples, 'rest');
    if (cat.idleAction) cat.endIdleAction();
    cat.idleAction = 'groom'; cat.idleActionTimer = 0; cat.idleActionDuration = 4.5; cat.idleTimer = 0; cat.yawnOpen = 0;
    frames(cat, 300, [0, true, false, false, false, false, null], 30, samples, 'groomverb');
    cat.setMood('calm', 2.5, 2); cat.blink = 0.16; cat.blinkTimer = 3.5;
    frames(cat, 60, [0, true, false, false, false, false, null], 20, samples, 'calm');
    // Long stillness: idle verbs chosen by Math.random, purrs, saccades
    frames(cat, 60 * 70, [0, true, false, false, false, false, null], 120, samples, 'still');
    for (const h of [0, 0.4, 0.8, 3]) { cat.updateShadow(h); S('shadow ' + h); }
    cat.setMasterCat();
    S('master');
    const { index, nodes } = graphOf(cat.group);
    scen.push({ name: 'player day', samples, audio: audioLog.slice(), endNodes: nodes.length, collar: nodes.slice(index.get(cat.collar)).length });
  }

  // Villagers through src/npc.js: notice, greet, startle, wander, sleep at night
  {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
    camera.position.set(0, 3, 8);
    camera.updateMatrixWorld();
    const mk = (name, color, pos, opts) => new NPC(scene, name, color, pos, ['…'], opts);
    const npcs = [
      mk('Luna', 0x3a3a3f, new THREE.Vector3(3, 0, 3), { wanderRadius: 3 }),
      mk('Mochi', 0xe8b06a, new THREE.Vector3(8, 0, -6), { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, wanderRadius: 5, schedule: { playInWind: true } }),
      mk('Kuro', 0x1c1c22, new THREE.Vector3(-6, 0, 4), { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, eyeColor: 0xd8b04a, wanderRadius: 6, wanderSpeed: 0.9, schedule: { sleepAtNight: true } })
    ];
    const playerCat = { isSprinting: false, mood: 'calm', setMood() {} };
    const player = new THREE.Vector3(20, 0, 20);
    const sky = { dayTime: 12, weather: 'cloudy', targetWeather: 'cloudy' };
    const samples = [];
    const tick = (n, every, tag, move) => {
      for (let i = 1; i <= n; i++) {
        clockMs += STEP * 1000;
        if (move) move(i);
        for (const n2 of npcs) n2.update(STEP, player, camera, sky, playerCat);
        if (i % every === 0) {
          for (const n2 of npcs) samples.push({ at: `${tag}@${i} ${n2.name}`, pos: n2.mesh.position.toArray(), rotY: n2.mesh.rotation.y, ...snapshot(n2.cat, false) });
        }
      }
    };
    tick(240, 60, 'far');
    tick(300, 50, 'approach', (i) => player.set(20 - i * 0.06, 0, 20 - i * 0.06));
    playerCat.isSprinting = true;
    tick(60, 20, 'sprint', (i) => player.x -= 0.02);
    playerCat.isSprinting = false;
    tick(120, 40, 'linger');
    player.set(-30, 0, -30);
    sky.dayTime = 22;
    tick(600, 100, 'night');
    player.set(-6.5, 0, 4.5);
    tick(120, 40, 'wake');
    scen.push({ name: 'villagers', samples, persona: npcs.map((n) => [n.name, n.persona ? JSON.stringify(n.persona) : null]),
      scale: npcs.map((n) => n.cat.group.scale.toArray()) });
    for (const n of npcs) n.nameTag.remove();
  }

  // Through src/player.js: the cat it builds and how it is mounted
  {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
    const d0 = draws;
    const p = new Player(scene, camera, null);
    const { index, nodes } = graphOf(p.mesh);
    scen.push({ name: 'player.js', used: draws - d0, mesh: nodes.slice(0, 2), catRoot: index.get(p.cat.group), nodes: nodes.length });
  }
  digest.scenarios = scen;

  // 4. Shared resources: the cached sculpt and the tables
  digest.tables = T;
  digest.counts = {
    cats: cats.length, poses: poses.length, geometries: T.geometries.length, materials: T.materials.length,
    textures: T.textures.length, skeletons: T.skeletons.length, anatomies: T.anatomies.length,
    samples: scen.reduce((n, s) => n + (s.samples ? s.samples.length : 0), 0), draws
  };
  return { digest, mod };
}

// Pretty JSON with arrays of plain values on one line: readable diffs, a third of the bytes.
function pretty(v, pad = '') {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  const inner = pad + ' ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every((x) => x === null || typeof x !== 'object')) return JSON.stringify(v);
    return '[\n' + v.map((x) => inner + pretty(x, inner)).join(',\n') + '\n' + pad + ']';
  }
  const keys = Object.keys(v).filter((k) => v[k] !== undefined);
  if (!keys.length) return '{}';
  const flat = keys.every((k) => v[k] === null || typeof v[k] !== 'object' ||
    (Array.isArray(v[k]) && v[k].every((x) => x === null || typeof x !== 'object')));
  if (flat) {
    const line = JSON.stringify(v);
    if (line.length <= 260) return line;
  }
  return '{\n' + keys.map((k) => inner + JSON.stringify(k) + ': ' + pretty(v[k], inner)).join(',\n') + '\n' + pad + '}';
}

// ------------------------------------------------------------------ the checks

/**
 * CharacterDef contract and part-swap checks (src/characters/, after the
 * split). Each returns [name, pass, detail]. Absent on the unsplit code.
 */
async function runChecks(mod) {
  let character;
  try {
    character = await import(`../src/characters/character.js?v=${TAG}`);
  } catch (e) {
    return { skipped: 'src/characters/character.js is not present: ' + String(e.message || e).split('\n')[0] };
  }
  const results = [];
  const check = (name, fn) => {
    try {
      const r = fn();
      results.push([name, r === true || (r && r.pass === true), r && r.detail !== undefined ? r.detail : (r === true ? '' : String(r))]);
    } catch (e) {
      results.push([name, false, 'threw: ' + String(e && e.message || e)]);
    }
  };
  if (typeof character.contractChecks === 'function') {
    for (const [name, fn] of character.contractChecks(mod, THREE)) check(name, fn);
  }
  return { results, passed: results.filter((r) => r[1]).length, failed: results.filter((r) => !r[1]).length };
}

// ------------------------------------------------------------------- the page

const status = document.getElementById('status');
try {
  const { digest, mod } = await buildDigest();
  const digestText = pretty(digest) + '\n';
  const checks = await runChecks(mod);
  const c = digest.counts;
  const summary = [
    `cats ${c.cats} · poses ${c.poses} · samples ${c.samples} · geometries ${c.geometries} · materials ${c.materials} · ` +
      `textures ${c.textures} · skeletons ${c.skeletons} · sculpts ${c.anatomies} · Math.random ${c.draws}`,
    `digest ${digestText.length.toLocaleString('en-US')} bytes · ${(realNow() - startedAt).toFixed(0)} ms`
  ].join('\n');
  document.getElementById('summary').textContent = summary;
  document.getElementById('checks').textContent = checks.skipped ? 'checks skipped: ' + checks.skipped
    : checks.results.map(([n, ok, d]) => `${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`).join('\n');
  status.textContent = 'done';
  status.className = 'ok';
  window.__catGolden = { done: true, ok: true, counts: c, digestText, checks, ms: Math.round(realNow() - startedAt) };
} catch (e) {
  window.__catGolden = { done: true, ok: false, error: String((e && e.stack) || e) };
  status.textContent = 'failed: ' + window.__catGolden.error;
  status.className = 'failed';
}
document.title = 'ready';
