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
  const mod = await import('../src/cat.js?v=20261107a');
  const { NPC } = await import('../src/npc.js?v=20261107a');
  const { Player } = await import('../src/player.js?v=20261107a');
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
  let character, rig;
  try {
    character = await import('../src/characters/character.js?v=20261107a');
    rig = await import('../src/characters/rig.js?v=20261107a');
  } catch (e) {
    return { skipped: 'src/characters/character.js is not present: ' + String(e.message || e).split('\n')[0] };
  }
  const { Cat } = mod;
  const C = character;
  const stats = rig.sculptStats;
  const results = [];
  const check = (name, fn) => {
    try {
      const r = fn();
      const pass = r === true || (r && r.pass === true);
      results.push([name, pass, r && r.detail !== undefined ? r.detail : (pass ? '' : JSON.stringify(r))]);
    } catch (e) {
      results.push([name, false, 'threw: ' + String(e && e.message || e)]);
    }
  };
  const ok = (pass, detail = '') => ({ pass: !!pass, detail });
  const throwsContract = (fn) => { try { fn(); return false; } catch (e) { return e instanceof C.CharacterContractError; } };

  // Two cats built from the same seed: identical down to the uuids, once
  // table references are resolved (the materials and geometry are separate
  // objects, described by value)
  const resolve = (x) => {
    if (Array.isArray(x)) return x.map(resolve);
    if (x && typeof x === 'object') {
      const keys = Object.keys(x);
      if (keys.length === 1) {
        if (keys[0] === 'mat') return { mat: resolve(T.materials[x.mat]) };
        if (keys[0] === 'geo') return { geo: T.geometries[x.geo] };
        if (keys[0] === 'tex') return { tex: T.textures[x.tex] };
        if (keys[0] === 'skel') return { skel: T.skeletons[x.skel] };
      }
      const table = { mat: 'materials', geo: 'geometries', tex: 'textures', skel: 'skeletons', map: 'textures', gradientMap: 'textures' };
      const o = {};
      for (const k of keys) {
        const v = x[k];
        if (table[k] && typeof v === 'number') o[k] = resolve(T[table[k]][v]);
        else if (k === 'mat' && Array.isArray(v)) o[k] = v.map((i) => resolve(T.materials[i]));
        else o[k] = resolve(v);
      }
      return o;
    }
    return x;
  };
  const twin = (a, b) => {
    const s0 = seed;
    const ca = new Cat(a);
    const da = describeCat(ca, 'a');
    seed = s0;
    const cb = new Cat(b);
    const db = describeCat(cb, 'b');
    delete da.fields.def; delete db.fields.def;
    delete da.label; delete db.label;
    const ja = JSON.stringify(resolve(da)), jb = JSON.stringify(resolve(db));
    if (ja === jb) return ok(true, `${da.nodes.length} nodes, uuids and fields equal`);
    let k = 0; while (k < ja.length && ja[k] === jb[k]) k++;
    return ok(false, 'first difference: …' + ja.slice(Math.max(0, k - 80), k + 60) + ' vs …' + jb.slice(Math.max(0, k - 80), k + 60));
  };
  const LUNA_OPTS = { stripeAmount: 0.3, idleProfile: { weights: { groom: 0.42, sit: 0.4, stretch: 0.1, yawn: 0.08 }, interval: [9, 16] },
    fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, eyeColor: 0xdec056, ribbonColor: 0x2b3d63, build: 'luna' };
  const LUNA_DEF = { id: 'luna', build: 'luna', palette: { fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, stripes: 0.3 },
    face: { eyes: 0xdec056, nose: null }, accessories: [{ slot: 'collar', part: 'kumihimo', color: 0x2b3d63 }, { slot: 'bell', part: 'suzu' }],
    scale: 1, personality: { idle: LUNA_OPTS.idleProfile } };

  // ---- CharacterDef contract (C1.3)
  check('MICHI is a valid, frozen CharacterDef with the classic collar and bell', () => {
    const v = C.validateCharacterDef({ ...C.MICHI });
    return ok(v.ok && Object.isFrozen(C.MICHI) && C.MICHI.accessories.map((a) => a.part).join() === 'kumihimo,suzu', v.errors.join('; '));
  });
  check('defineCharacter fills defaults; accessories omitted = classic, [] = none', () => {
    const d = C.defineCharacter({ id: 'plain' });
    const n = C.defineCharacter({ id: 'bare', accessories: [] });
    return ok(d.build === 'michi' && d.palette.fur === 0xae8450 && d.face.eyes === 0xebb02a && d.face.nose === null && d.scale === 1 &&
      d.personality === null && d.accessories.length === 2 && n.accessories.length === 0 && C.defineCharacter(d) === d);
  });
  const bad = {
    'bad id': { id: 'Luna Cat' },
    'unknown field': { id: 'x', colour: 1 },
    'unknown slot': { id: 'x', accessories: [{ slot: 'tail', part: 'suzu' }] },
    'slot twice': { id: 'x', accessories: [{ slot: 'collar', part: 'kumihimo' }, { slot: 'collar', part: 'kumihimo' }] },
    'unknown part': { id: 'x', accessories: [{ slot: 'collar', part: 'velvet' }] },
    'part in the wrong slot': { id: 'x', accessories: [{ slot: 'collar', part: 'suzu' }] },
    'bell before collar': { id: 'x', accessories: [{ slot: 'bell', part: 'suzu' }, { slot: 'collar', part: 'kumihimo' }] },
    'bad colour': { id: 'x', palette: { fur: 'brown' } },
    'stripes out of range': { id: 'x', palette: { stripes: 2 } },
    'scale out of range': { id: 'x', scale: 0 },
    'bad idle interval': { id: 'x', personality: { idle: { interval: [9] } } },
    'bad proportions': { id: 'x', build: { girth: 3 } }
  };
  for (const [name, def] of Object.entries(bad)) {
    check(`rejects a def with ${name}`, () => ok(!C.validateCharacterDef(def).ok && throwsContract(() => C.defineCharacter(def)),
      C.validateCharacterDef(def).errors.join('; ')));
  }
  check('registerCharacterPart rejects a part without a slot or build, and a clash of ids', () => ok(
    throwsContract(() => C.registerCharacterPart({ id: 'nope', slot: 'tail', build() {} })) &&
    throwsContract(() => C.registerCharacterPart({ id: 'nope', slot: 'head' })) &&
    throwsContract(() => C.registerCharacterPart({ id: 'suzu', slot: 'bell', build() {} }))));

  // ---- def ↔ legacy options: the same cat, call for call
  check('new Cat({ def: MICHI }) is the player cat of src/player.js (same seed → same uuids, graph, fields)',
    () => twin({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 }, { def: C.MICHI }));
  check('a Luna CharacterDef is the Luna src/npc.js builds from options', () => twin(LUNA_OPTS, { def: LUNA_DEF }));
  check('def.personality.idle drives the idle verbs, def.scale the group', () => {
    const cat = new Cat({ def: { ...LUNA_DEF, id: 'luna-big', scale: 1.05 } });
    return ok(cat.idleProfile === LUNA_OPTS.idleProfile && cat.group.scale.x === 1.05 && cat.def.id === 'luna-big');
  });

  // ---- sculpt cache and part swaps (C1.5)
  check('the sculpt is cached per body type: a second Mochi asks once and sculpts nothing', () => {
    const before = { ...stats };
    const a = new Cat({ build: 'mochi' });
    const b = new Cat({ build: 'mochi' });
    return ok(stats.sculpts === before.sculpts && stats.requests === before.requests + 2 && a.anatomy === b.anatomy &&
      a.coat.geometry === b.coat.geometry, `requests +${stats.requests - before.requests}, sculpts +${stats.sculpts - before.sculpts}`);
  });
  check('a new body type sculpts once, then hits the cache', () => {
    const s0 = stats.sculpts;
    const build = { girth: 1.07, leg: 0.97, head: 1.0, tail: 1.0, cheeks: 1.03 };
    new Cat({ build });
    const s1 = stats.sculpts;
    new Cat({ build: { ...build } });
    return ok(s1 === s0 + 1 && stats.sculpts === s1, `sculpts ${s0} → ${s1} → ${stats.sculpts}`);
  });

  const hat = C.registerCharacterPart({
    id: 'golden-test-hat', slot: 'head', label: 'test part (tools/cat_golden.js)',
    build(host, entry, mount) {
      const geo = new THREE.ConeGeometry(0.03, 0.05, 8);
      const mat = new THREE.MeshBasicMaterial({ color: entry.color ?? 0x335577 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'Test Hat';
      mesh.position.set(0, 0.07, 0.02);
      mount.add(mesh);
      host.testHat = mesh;
      return { objects: [mesh], fields: ['testHat'], owned: { geometries: [geo], materials: [mat] } };
    }
  });
  const pack = C.registerCharacterPart({
    id: 'golden-test-pack', slot: 'back', label: 'test part (tools/cat_golden.js)',
    build(host, entry, mount) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.08), new THREE.MeshBasicMaterial());
      mesh.position.set(0, 0.1, 0);
      mount.add(mesh);
      return { objects: [mesh], owned: { geometries: [mesh.geometry], materials: [mesh.material] } };
    },
    setTier(host, handle, tier) { handle.objects[0].visible = tier !== 'far'; }
  });

  check('setMasterCat is the bell slot swap: same bell mesh, gold, one twin, no sculpt', () => {
    const cat = new Cat({ build: 'kuro' });
    const before = { ...stats };
    const bell = cat.collarBell;
    const kids = cat.bellMount.children.length;
    cat.setMasterCat();
    cat.setMasterCat();
    const h = cat.slots.bell;
    return ok(h.part.id === 'suzu-master' && cat.collarBell === bell && bell.material === cat.matGoldBell &&
      cat.bellMount.children.length === kids + 1 && cat.collarBellTwin && cat.collarBellTwin.parent === cat.bellMount &&
      stats.sculpts === before.sculpts && stats.requests === before.requests,
      `part ${h.part.id}, bell mount children ${kids} → ${cat.bellMount.children.length}`);
  });
  check('suzu-master → suzu swaps back in place (brass, twin gone)', () => {
    const cat = new Cat({});
    cat.setAccessory('bell', 'suzu-master');
    const twinGeo = cat.collarBellTwin.geometry;
    cat.setAccessory('bell', 'suzu');
    return ok(cat.collarBell.material === cat.matBellBrass && !cat.collarBellTwin && cat.slots.bell.part.id === 'suzu' &&
      !cat.bellMount.children.some((c) => c.geometry === twinGeo));
  });
  check('emptying the collar slot takes the bell with it and frees what they owned; no sculpt', () => {
    const cat = new Cat({ build: 'luna' });
    const before = { ...stats };
    const collar = cat.collar;
    const outlines = cat.outlines.length;
    let disposed = 0;
    for (const g of [...cat.slots.collar.owned.geometries, ...cat.slots.bell.owned.geometries]) g.addEventListener('dispose', () => disposed++);
    cat.setAccessory('collar', null);
    return ok(!cat.slots.collar && !cat.slots.bell && !collar.parent && cat.collar === undefined && cat.collarBell === undefined &&
      cat.outlines.length === outlines - 1 && disposed === 6 && stats.sculpts === before.sculpts && stats.requests === before.requests,
      `outlines ${outlines} → ${cat.outlines.length}, geometries disposed ${disposed}`);
  });
  check('a collar and bell put back on a bare cat hang where the classic ones do', () => {
    const ref = new Cat({ build: 'luna' });
    const cat = new Cat({ build: 'luna' });
    cat.setAccessory('collar', null);
    cat.setAccessory('collar', { part: 'kumihimo', color: 0x2b3d63 });
    cat.setAccessory('bell', 'suzu');
    const p = (o) => o.getWorldPosition(new THREE.Vector3());
    ref.group.updateMatrixWorld(true); cat.group.updateMatrixWorld(true);
    return ok(cat.collar.parent === cat.neck && cat.collar.name === 'Collar' && cat.collarBell.parent === cat.bellMount &&
      p(cat.collarBell).distanceTo(p(ref.collarBell)) < 1e-9 && cat.slots.collar.entry.color === 0x2b3d63 && cat.outlines.length === ref.outlines.length);
  });
  check('head and back slots: mount on the head and chest bones, swap and empty without a sculpt', () => {
    const cat = new Cat({ build: 'mochi' });
    const before = { ...stats };
    const h1 = cat.setAccessory('head', 'golden-test-hat');
    const mesh = cat.testHat;
    const again = cat.setAccessory('head', 'golden-test-hat');
    const h2 = cat.setAccessory('head', { part: 'golden-test-hat', color: 0xff0000 });
    const recolored = cat.testHat !== mesh && !mesh.parent && cat.testHat.parent === cat.head;
    cat.setAccessory('back', 'golden-test-pack');
    const packOn = cat.slots.back.objects[0].parent === cat.chest;
    cat.setAccessory('head', null);
    cat.setAccessory('back', null);
    return ok(h1 && again === h1 && h2 !== h1 && recolored && packOn && !cat.slots.head && !cat.slots.back && cat.testHat === undefined &&
      stats.sculpts === before.sculpts && stats.requests === before.requests);
  });
  check('a bell with no collar to hang on is refused before anything is made', () => {
    const cat = new Cat({});
    cat.setAccessory('collar', null);
    const d0 = draws;
    return ok(throwsContract(() => cat.setAccessory('bell', 'suzu')) && !cat.slots.bell && cat.matBellBrass === undefined && draws === d0);
  });
  check('setAccessory rejects an unknown slot, an unknown part and a part for another slot', () => {
    const cat = new Cat({});
    return ok(throwsContract(() => cat.setAccessory('tail', 'suzu')) && throwsContract(() => cat.setAccessory('head', 'velvet')) &&
      throwsContract(() => cat.setAccessory('head', 'suzu')));
  });
  check('a swapped cat keeps animating (600 frames, finite bones)', () => {
    const cat = new Cat({ build: 'kuro' });
    cat.setAccessory('head', 'golden-test-hat');
    cat.setMasterCat();
    cat.setAccessory('collar', null);
    for (let i = 0; i < 600; i++) cat.update(STEP, i < 300 ? 4.5 : 0, true, false, false);
    return ok(cat.bones.every((b) => Number.isFinite(b.quaternion.x) && Number.isFinite(b.position.y)));
  });

  // ---- tiers
  check('tiers: hero by default; mid and far hide every outline hull and the whiskers; hero restores them', () => {
    const cat = new Cat({});
    const all = () => cat.outlines.every((o) => o.visible) && cat.whiskers.visible;
    const none = () => cat.outlines.every((o) => !o.visible) && !cat.whiskers.visible;
    const h0 = cat.tier === 'hero' && all() && cat.outlines.length === 6;   // coat, tail, head, two ears, collar
    const m = cat.setTier('mid') === 'mid' && none();
    const f = cat.setTier('far') === 'far' && none();
    const h = cat.setTier('hero') === 'hero' && all();
    return ok(h0 && m && f && h, `outline hulls ${cat.outlines.length}`);
  });
  check('tier hooks run on every change; part setTier hooks too', () => {
    const seen = [];
    const off = C.onCharacterTier((host, tier, prev) => seen.push(prev + '>' + tier));
    const cat = new Cat({});
    cat.setAccessory('back', 'golden-test-pack');
    cat.setTier('far');
    const packHidden = !cat.slots.back.objects[0].visible;
    cat.setTier('far');
    cat.setTier('hero');
    off();
    cat.setTier('mid');
    return ok(seen.join() === 'hero>far,far>hero' && packHidden && cat.slots.back.objects[0].visible, seen.join());
  });
  check('quality low keeps the classic character: setTier stays hero', () => {
    const cat = new Cat({ quality: 'low', tier: 'far' });
    return ok(cat.tier === 'hero' && cat.setTier('mid') === 'hero' && cat.outlines.every((o) => o.visible));
  });
  check('new Cat({ tier: "mid" }) is built at mid; a collar added at mid has no outline', () => {
    const cat = new Cat({ tier: 'mid' });
    cat.setAccessory('collar', null);
    cat.setAccessory('collar', 'kumihimo');
    return ok(cat.tier === 'mid' && cat.outlines.every((o) => !o.visible));
  });
  check('setTier rejects an unknown tier', () => ok(throwsContract(() => new Cat({}).setTier('ultra'))));
  check('characterTierFor: low and classic stay hero; modular steps down with distance', () => ok(
    C.characterTierFor({ quality: 'low', set: 'modular', distance: 100 }) === 'hero' &&
    C.characterTierFor({ quality: 'high', set: 'classic', distance: 100 }) === 'hero' &&
    C.characterTierFor({ quality: 'high', set: 'modular', distance: 2 }) === 'hero' &&
    C.characterTierFor({ quality: 'medium', set: 'modular', distance: C.TIER_DISTANCE.mid }) === 'mid' &&
    C.characterTierFor({ quality: 'medium', set: 'modular', distance: C.TIER_DISTANCE.far + 1 }) === 'far'));
  check('src/cat.js re-exports the def helpers', () => ok(mod.MICHI === C.MICHI && mod.defineCharacter === C.defineCharacter &&
    mod.CHARACTER_SLOTS === C.CHARACTER_SLOTS && mod.CHARACTER_TIERS === C.CHARACTER_TIERS));
  void hat; void pack;
  return { results, passed: results.filter((r) => r[1]).length, failed: results.filter((r) => !r[1]).length, sculptStats: { ...stats } };
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
