// Systems golden (BUILD_GUIDE_FABLE.md §8 F3.3): the footprint golden carried
// past the valley into the five system modules that lane f3-systems-split
// splits — the tea-house interior, the hidden places (in more detail than the
// valley digest keeps), the vegetation, the particles and the ambient life.
// It changes no game file.
//
//   node tools/footprint_golden.mjs --systems            compare with tools/golden/systems_classic.json
//   node tools/footprint_golden.mjs --systems --write    regenerate it (say why in the commit)
//   python3 -m http.server 8000  →  http://localhost:8000/tools/footprint_golden.html?systems=1
//
// tools/footprint_golden.js calls systemsGolden(helpers) instead of its valley
// run when the page has ?systems=1. The helpers are that page's shims (seeded
// Math.random with three.js UUIDs on a stream of their own, a stepping clock)
// and its text and diff code, so both goldens are written, read and diffed
// the same way, and the same CLI drives both.
//
// The scene is built in src/main.js order: Countryside → HiddenPlaces →
// InteriorManager → Vegetation → Particles → AmbientLife, with the options
// footprint_golden.js's countrysideOptions() returns (its `assets`, once lane
// f1-runtime wires one, is handed to every system the way main.js does). No
// renderer, no chunking. The digest:
//
//   rng          the vegetation stream (seed 77) with a probe proving the
//                count, the hidden-places stream, Math.random() per system
//   builders     per system, each top-level build* / create* call and its
//                draws, colliders and objects; `calls`: every method's
//                inclusive totals (advisory, as in the valley digest)
//   objects      every named object under the five systems, the interior read
//                just before its _mergeStatics(): world p, q, s and a hash of
//                the exact world matrix, flags, render order, material (with
//                texture digests), and a hash of every geometry attribute,
//                index and instance buffer (the bytes, not a summary)
//   members      every unnamed renderable (and light), one entry each, keyed
//                by its nearest named ancestor and its order under it
//   baked        the interior's merged statics after _mergeStatics()
//   textures     canvas textures by the exact 2D drawing commands that painted
//                them (call names and arguments, hashed as they run), data
//                textures by their bytes. ImageData arguments count by size
//                only: textures.js computes some pixels from a getImageData()
//                read-back of rasterized strokes, which differs between GPU
//                backends, so fields painted through putImageData() are told
//                apart by their calls and their materials, and their pixels
//                are left to the review sheets
//   interior     origin, colliders, platforms, knockables, the fish, and the
//                anchors gameplay uses, probed through the real code: the
//                ContextActionManager's eatFish / cozyNap targets and its
//                exit zone, the enter / exit spawns of the transitions, and a
//                knock-off simulated through InteriorManager.update()
//   hidden       pool motes, glade flies, lanterns and stalk tops, rounded for
//                reading plus an exact hash
//   vegetation   tree placements (every canopyTree call), bamboo groves, the
//                vegetation colliders, the meadow's baked biome mask and its
//                grass layers
//   particles,   the spawn data each system keeps (seeds, god-ray phases,
//   ambient      bird / crow / koi / butterfly records), rounded plus exact
//
// Determinism: Math.random is re-seeded before each system, so what a system
// draws depends only on its own draw order — which is what a faithful
// layout / mesh split has to keep. The scene is built twice with the same
// seeds; anything that still differs is written as "~" and reported.

const FORMAT = 'michi-neko-systems-golden';
const VERSION = 1;
const TAG = '20261107a';
const DEFAULT_GOLDEN = 'golden/systems_classic.json';
const SYSTEMS = ['hidden', 'interior', 'vegetation', 'particles', 'ambient'];
// One Math.random seed per system (the page's seeded stream is reset before each).
const SEEDS = { countryside: 0x0a11ce5, hidden: 0x41d0, interior: 0x1e7e, vegetation: 0x7e9e, particles: 0x9a27, ambient: 0xa4b1, probe: 0x9b0e };

let THREE = null;
let H = null;            // helpers handed over by footprint_golden.js
let B = null;            // recorder of the build in progress

// ------------------------------------------------------------------ hashing ---

/** Two 32-bit lanes over 32-bit words (cyrb53-style); 16 hex digits. */
class Hash {
  constructor() { this.a = 0xdeadbeef; this.b = 0x41c6ce57; }
  word(k) {
    this.a = Math.imul(this.a ^ k, 2654435761);
    this.b = Math.imul(this.b ^ k, 1597334677);
    return this;
  }
  str(s) {
    s = String(s);
    for (let i = 0; i < s.length; i++) this.word(s.charCodeAt(i));
    return this.word(0x1f);
  }
  arr(t) {
    const view = ArrayBuffer.isView(t) ? t : Float64Array.from(t);
    this.str(view.constructor.name + ':' + view.length);
    const { buffer, byteOffset, byteLength } = view;
    if (byteOffset % 4 === 0 && byteLength % 4 === 0) {
      const w = new Uint32Array(buffer, byteOffset, byteLength / 4);
      for (let i = 0; i < w.length; i++) this.word(w[i]);
    } else {
      const u = new Uint8Array(buffer, byteOffset, byteLength);
      for (let i = 0; i < u.length; i++) this.word(u[i]);
    }
    return this;
  }
  hex() {
    let a = this.a, b = this.b;
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (b >>> 0).toString(16).padStart(8, '0') + (a >>> 0).toString(16).padStart(8, '0');
  }
}

const hashOf = (v) => new Hash().arr(v).hex();
/** Exact: a hash of the raw doubles (rounded copies sit beside it for reading). */
const exact = (values) => hashOf(Float64Array.from(values.map(Number)));

function attrHash(a) {
  if (a.isInterleavedBufferAttribute) {
    return new Hash().str(`il${a.data.stride}+${a.offset}`).arr(a.data.array).hex();
  }
  return hashOf(a.array);
}

// ----------------------------------------------------------- canvas record ---
// Every 2D drawing call is folded into a hash kept per canvas, so a canvas
// texture is identified by exactly what painted it (machine independent: no
// pixels are read, and ImageData arguments count by size). Installed before
// any game module is imported.

const CANVAS = new WeakMap();   // canvas → { hash, n }
const PAINT = new WeakMap();    // gradient / pattern → Hash

function argText(a) {
  if (typeof a === 'number') return String(a);
  if (typeof a === 'string') return JSON.stringify(a);
  if (typeof a === 'boolean' || a == null) return String(a);
  if (PAINT.has(a)) return 'paint:' + PAINT.get(a).hex();
  // ImageData by size only: its pixels may come from getImageData() of rasterized strokes
  // (textures.js plaster cracks), which differ between GPU backends; the calls that
  // painted them are already in the hash.
  if (typeof ImageData !== 'undefined' && a instanceof ImageData) return `img${a.width}x${a.height}`;
  if (typeof HTMLCanvasElement !== 'undefined' && a instanceof HTMLCanvasElement) {
    const r = CANVAS.get(a);
    return `canvas${a.width}x${a.height}:` + (r ? r.hash.hex() + '/' + r.n : 'blank');
  }
  if (Array.isArray(a)) return '[' + a.map(argText).join(',') + ']';
  if (a && a.src) return 'src:' + a.src;
  return typeof a;
}

let canvasHooked = false;
function installCanvasHooks() {
  if (canvasHooked || typeof CanvasRenderingContext2D === 'undefined') return;
  canvasHooked = true;
  const P = CanvasRenderingContext2D.prototype;
  const note = (ctx, text) => {
    const c = ctx.canvas;
    let r = CANVAS.get(c);
    if (!r) CANVAS.set(c, r = { hash: new Hash().str(`${c.width}x${c.height}`), n: 0 });
    r.hash.str(text);
    r.n++;
  };
  const makesPaint = new Set(['createLinearGradient', 'createRadialGradient', 'createConicGradient', 'createPattern']);
  for (const name of Object.getOwnPropertyNames(P)) {
    const d = Object.getOwnPropertyDescriptor(P, name);
    if (!d || name === 'constructor') continue;
    if (typeof d.value === 'function') {
      const f = d.value;
      P[name] = function (...args) {
        const text = name + '(' + args.map(argText).join(',') + ')';
        note(this, text);
        const out = f.apply(this, args);
        if (out && makesPaint.has(name)) PAINT.set(out, new Hash().str(text));
        return out;
      };
    } else if (d.set) {
      const { get, set } = d;
      Object.defineProperty(P, name, {
        configurable: true, enumerable: d.enumerable, get,
        set(v) { note(this, name + '=' + argText(v)); set.call(this, v); }
      });
    }
  }
  if (typeof CanvasGradient !== 'undefined') {
    const add = CanvasGradient.prototype.addColorStop;
    CanvasGradient.prototype.addColorStop = function (offset, color) {
      const r = PAINT.get(this);
      if (r) r.str(`stop(${offset},${JSON.stringify(color)})`);
      return add.call(this, offset, color);
    };
  }
}

// The canvas record must see every texture painted, including those painted
// when game modules are first imported (footprint_golden.js imports some
// before it calls systemsGolden), so it goes in as this module is evaluated.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('systems') === '1') installCanvasHooks();

// ---------------------------------------------------------------- records ---

const TEX_SLOTS = ['map', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap',
  'displacementMap', 'gradientMap', 'lightMap', 'specularMap', 'massMap'];

function texRecord(t, where) {
  const known = B.texOf.get(t);
  if (known) return known;
  const img = t.image;
  let kind, w = 0, h = 0, content = '', n;
  if (img && img.data && (t.isDataTexture || ArrayBuffer.isView(img.data))) {
    kind = 'data'; w = img.width; h = img.height; content = hashOf(img.data);
  } else if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) {
    const r = CANVAS.get(img);
    kind = 'canvas'; w = img.width; h = img.height; n = r ? r.n : 0; content = r ? r.hash.hex() : 'blank';
  } else {
    kind = img ? (img.src ? 'image' : img.constructor && img.constructor.name || typeof img) : 'none';
    content = img && img.src ? String(img.src).replace(location.origin, '') : '';
  }
  const props = [
    `w${t.wrapS},${t.wrapT}`, `r${H.r4(t.repeat.x)},${H.r4(t.repeat.y)}`, `o${H.r4(t.offset.x)},${H.r4(t.offset.y)}`,
    t.colorSpace || '-', `f${t.magFilter},${t.minFilter}`, t.flipY ? 'flipY' : 'noflip', t.generateMipmaps ? 'mip' : 'nomip',
    `fmt${t.format},${t.type}`, t.rotation ? 'rot' + H.r4(t.rotation) : ''
  ].filter(Boolean).join(' ');
  const id = new Hash().str(kind).str(w + 'x' + h).str(content).str(props).hex().slice(0, 12);
  B.texOf.set(t, id);
  if (!B.textures[id]) B.textures[id] = { kind, size: `${w}x${h}`, ...(n !== undefined ? { cmds: n } : {}), content, props, first: where };
  return id;
}

function matRecord(m, where) {
  if (Array.isArray(m)) return m.map((x) => matRecord(x, where)).join(' + ');
  if (!m) return 'none';
  let s = H.matSig(m);
  if (m.alphaTest) s += ' at' + H.r4(m.alphaTest);
  if (m.depthWrite === false) s += ' nodw';
  if (m.depthTest === false) s += ' nodt';
  if (m.fog === false && 'fog' in m) s += ' nofog';
  if (!m.transparent && m.opacity !== 1) s += ' op' + H.r4(m.opacity);
  if (m.isPointsMaterial) s += ' size' + H.r4(m.size) + (m.sizeAttenuation ? '' : ' flatsize');
  if (m.isLineBasicMaterial && m.linewidth !== 1) s += ' lw' + H.r4(m.linewidth);
  if (typeof m.envMapIntensity === 'number' && m.envMapIntensity !== 1) s += ' env' + H.r4(m.envMapIntensity);
  if (m.normalMap && m.normalScale) s += ` ns${H.r4(m.normalScale.x)},${H.r4(m.normalScale.y)}`;
  if (m.isMeshDepthMaterial) s += ' pack' + m.depthPacking;
  if (m.blending !== THREE.NormalBlending && m.blending !== THREE.AdditiveBlending) s += ' blend' + m.blending;
  if (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) s += ' obc';
  if (Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey')) {
    try { s += ' key:' + String(m.customProgramCacheKey()).slice(0, 80); } catch { s += ' key:throws'; }
  }
  if (m.uniforms) s += ' u:' + Object.keys(m.uniforms).sort().join(',');
  if (m.defines && Object.keys(m.defines).length) s += ' def:' + JSON.stringify(m.defines);
  for (const slot of TEX_SLOTS) if (m[slot] && m[slot].isTexture) s += ` ${slot}@${texRecord(m[slot], where)}`;
  const ud = m.userData ? Object.keys(m.userData).sort() : [];
  if (ud.length) s += ' ud:' + ud.join(',');
  return s;
}

function geoRecord(g) {
  const attrs = Object.keys(g.attributes).sort().map((name) => {
    const a = g.attributes[name];
    return `${name}:${a.itemSize}x${a.count}${a.normalized ? 'n' : ''}${a.isInstancedBufferAttribute ? 'i' + a.meshPerAttribute : ''}@${attrHash(a)}`;
  });
  const rec = { t: g.type, a: attrs.join(' ') };
  if (g.index) rec.i = `${g.index.count}@${hashOf(g.index.array)}`;
  if (g.groups && g.groups.length) rec.groups = g.groups.map((x) => `${x.start}+${x.count}:${x.materialIndex}`).join(' ');
  if (g.drawRange && (g.drawRange.start !== 0 || g.drawRange.count !== Infinity)) rec.range = [g.drawRange.start, g.drawRange.count];
  if (g.isInstancedBufferGeometry) rec.instances = g.instanceCount;
  if (g.boundingSphere) rec.sphere = [g.boundingSphere.center.x, g.boundingSphere.center.y, g.boundingSphere.center.z, g.boundingSphere.radius].map(H.r4);
  if (g.parameters) rec.par = JSON.stringify(roundAll(g.parameters));
  const morph = Object.keys(g.morphAttributes || {});
  if (morph.length) rec.morph = morph.join(',');
  return rec;
}

function roundAll(v) {
  if (typeof v === 'number') return H.r4(v);
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(roundAll);
  if (v.isVector2) return [H.r4(v.x), H.r4(v.y)];
  if (v.isVector3) return H.v3(v);
  if (typeof v.getPoint === 'function' && typeof v.toJSON === 'function') {
    // a Curve / Path / Shape; toJSON() carries a Shape's uuid, which follows
    // object creation order (module caches make it differ build to build)
    return v.type + ':' + new Hash().str(JSON.stringify(v.toJSON(), (k, x) => (k === 'uuid' ? undefined : x))).hex();
  }
  const out = {};
  for (const k of Object.keys(v)) if (typeof v[k] !== 'function' && k !== 'uuid') out[k] = roundAll(v[k]);
  return out;
}

const renderable = (o) => !!(o.isMesh || o.isPoints || o.isLine || o.isSprite);

function objRecord(o, where) {
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  o.matrixWorld.decompose(P, Q, S);
  const rec = { t: o.type, p: H.v3(P), q: H.quat(Q), s: H.v3(S), m: hashOf(Float64Array.from(o.matrixWorld.elements)) };
  if (!o.visible) rec.hidden = 1;
  if (o.renderOrder) rec.ro = o.renderOrder;
  if (o.frustumCulled === false) rec.nocull = 1;
  if (o.castShadow || o.receiveShadow) rec.f = (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
  if (o.material) rec.mat = matRecord(o.material, where);
  if (o.customDepthMaterial) rec.depth = matRecord(o.customDepthMaterial, where);
  if (o.geometry) rec.g = geoRecord(o.geometry);
  if (o.isInstancedMesh) {
    rec.inst = { n: o.count, m: attrHash(o.instanceMatrix) };
    if (o.instanceColor) rec.inst.c = attrHash(o.instanceColor);
  }
  if (o.isSprite) rec.center = [H.r4(o.center.x), H.r4(o.center.y)];
  if (o.isLight) {
    rec.light = `#${o.color.getHexString()} i${H.r4(o.intensity)}` +
      (o.distance !== undefined ? ` d${H.r4(o.distance)} k${H.r4(o.decay)}` : '') + (o.castShadow ? ' shadow' : '');
  }
  const ud = Object.keys(o.userData || {}).sort();
  if (ud.length) rec.ud = ud.join(',');
  return rec;
}

// ------------------------------------------------------------------- walk ---

function newWalk(system) {
  return { system, seen: new Map(), keyOf: new Map(), objects: [], members: [], memberIdx: new Map() };
}

function walkInto(W, o, parentKey, anchorKey) {
  let key = parentKey, anchor = anchorKey;
  if (o.name) {
    const base = parentKey ? parentKey + '/' + o.name : `${W.system}:${o.name}`;
    const n = (W.seen.get(base) || 0) + 1;
    W.seen.set(base, n);
    key = n === 1 ? base : base + '#' + n;
    W.keyOf.set(o, key);
    W.objects.push([key, objRecord(o, key)]);
    anchor = key;
  } else if (renderable(o) || o.isLight) {
    const i = W.memberIdx.get(anchor) || 0;
    W.memberIdx.set(anchor, i + 1);
    const k = `${anchor} · ${i}`;
    W.members.push([k, objRecord(o, k)]);
  }
  for (const child of o.children) walkInto(W, child, key, anchor);
}

function walkRoots(system, roots) {
  const W = newWalk(system);
  for (const o of roots) walkInto(W, o, '', `${system}:(root)`);
  return W;
}

// ---------------------------------------------------------- instrumentation ---

function countDraws(proto, prop, slot) {
  const wrap = (f) => (typeof f !== 'function' ? f : function () {
    if (B) B.draws[slot]++;
    return f.apply(this, arguments);
  });
  Object.defineProperty(proto, prop, {
    configurable: true,
    get() { return undefined; },
    set(fn) {
      let current = wrap(fn);
      Object.defineProperty(this, prop, {
        configurable: true, enumerable: true,
        get() { return current; },
        set(next) { current = wrap(next); }
      });
    }
  });
}

function countObjects(root) {
  let n = 0;
  root.traverse(() => { n++; });
  return n - 1;
}

/** `self`: the builder's owner; the interior keeps colliders of its own (the rest share the valley's). */
function counters(top, self) {
  const shared = B.city ? B.city.colliders : null;
  const own = self && Array.isArray(self.colliders) && self.colliders !== shared ? self.colliders.length : 0;
  const c = {
    veg: B.draws.vegetation, hidden: B.draws.hidden, random: H.ambient.draws,
    colliders: (shared ? shared.length : 0) + own
  };
  if (top) c.objects = countObjects(B.scene);
  return c;
}

function trackBuilders(proto, group) {
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (!/^(build|create)[A-Z]/.test(name)) continue;
    const d = Object.getOwnPropertyDescriptor(proto, name);
    if (!d || typeof d.value !== 'function') continue;
    const original = d.value;
    proto[name] = function (...args) {
      if (!B) return original.apply(this, args);
      const top = B.depth === 0;
      const before = counters(top, this);
      const key = `${group}.${name}`;
      let sum = B.calls.get(key);
      if (!sum) B.calls.set(key, sum = { calls: 0 });
      B.depth++;
      try { return original.apply(this, args); } finally {
        B.depth--;
        const after = counters(top, this);
        if (top) B.phases[group].push([name, before, after]);
        sum.calls++;
        for (const k of Object.keys(before)) if (k !== 'objects') sum[k] = (sum[k] || 0) + after[k] - before[k];
      }
    };
  }
}

function instrument(M) {
  countDraws(M.Vegetation.prototype, 'rng', 'vegetation');
  countDraws(M.HiddenPlaces.prototype, 'rand', 'hidden');
  trackBuilders(M.HiddenPlaces.prototype, 'hidden');
  trackBuilders(M.InteriorManager.prototype, 'interior');
  trackBuilders(M.Vegetation.prototype, 'vegetation');
  trackBuilders(M.Particles.prototype, 'particles');
  trackBuilders(M.AmbientLife.prototype, 'ambient');

  // Tree placements: every canopyTree() call (hero and rim, near and baked)
  const canopy = M.Vegetation.prototype.canopyTree;
  M.Vegetation.prototype.canopyTree = function (x, z, scale, opts) {
    const before = this.colliders.length;
    const tree = canopy.apply(this, arguments);
    if (B) {
      const style = this.treeStyle(x, z);
      const ry = tree && tree.rotation ? tree.rotation.y : NaN;
      B.trees.push({
        name: tree && tree.name, kind: opts && opts.kind, x: H.r4(x), z: H.r4(z), scale: H.r4(scale), ry: H.r4(ry),
        rim: !!style.rim, bake: !!style.bake, inScene: !!(tree && tree.parent),
        colliders: this.colliders.slice(before).map(H.box6), exact: exact([x, z, scale, ry])
      });
    }
    return tree;
  };
  const grove = M.Vegetation.prototype.buildBambooGrove;
  M.Vegetation.prototype.buildBambooGrove = function (cx, cz, radius, corridors = []) {
    const before = this.colliders.length, kids = this.scene.children.length;
    const out = grove.apply(this, arguments);
    if (B) {
      const added = this.colliders.slice(before);
      B.groves.push({
        cx: H.r4(cx), cz: H.r4(cz), radius: H.r4(radius), corridors: corridors.length, planted: added.length,
        meshes: this.scene.children.length - kids, colliders: hashOf(Float64Array.from(added.flatMap((b) => [b.min.x, b.min.z, b.max.x, b.max.z, b.max.y])))
      });
    }
    return out;
  };

  // The interior merges its statics inside its constructor: read it just before
  const merge = M.InteriorManager.prototype._mergeStatics;
  M.InteriorManager.prototype._mergeStatics = function () {
    let before = null;
    if (B && !B.interiorWalk && this.group) {
      this.group.updateMatrixWorld(true);
      B.interiorWalk = walkRoots('interior', [this.group]);
      before = new Set();
      this.group.traverse((o) => before.add(o));
    }
    const out = merge.apply(this, arguments);
    if (B && before) {
      const baked = [], seen = new Map();
      this.group.updateMatrixWorld(true);
      this.group.traverse((o) => {
        if (before.has(o) || !o.isMesh) return;
        const parent = o.parent === this.group ? 'interior:Tea House Interior' : (B.interiorWalk.keyOf.get(o.parent) || '(unnamed parent)');
        const base = `${parent} | ${H.matSig(o.material)} | ${(o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '') || '-'} | ${Object.keys(o.geometry.attributes).sort().join(',')}`;
        const n = (seen.get(base) || 0) + 1;
        seen.set(base, n);
        baked.push([n === 1 ? base : base + ' #' + n, objRecord(o, base)]);
      });
      B.interiorBaked = baked;
      // what the merge removed: the originals are gone from the group
      let left = 0;
      this.group.traverse((o) => { if (before.has(o) && o !== this.group) left++; });
      B.interiorKept = left;
    }
    return out;
  };
}

// ------------------------------------------------------------ the probes ---

const nameKey = (W, o) => (o ? W.keyOf.get(o) || '(unnamed)' : null);

/** Gameplay anchors of the interior, read through the code that uses them. */
function probeInterior(M, interior, game, city, W) {
  const o = interior.origin;
  const out = {};
  // The context-action targets: eatFish (the platter) and cozyNap (the zabuton)
  const player = { scene: new THREE.Scene(), mesh: { position: new THREE.Vector3() } };
  const ca = new M.ContextActionManager(player, city, null, null, null, null, null, null, null, null, interior);
  const wasInside = interior.isInside;
  interior.isInside = true;
  const hits = new Map();
  for (let i = -45; i <= 45; i++) {
    for (let j = -40; j <= 40; j++) {
      player.mesh.position.set(o.x + i / 10, o.y, o.z + j / 10);
      ca.cooldown = 0;
      const a = ca.findAction();
      if (!a) continue;
      let r = hits.get(a.type);
      if (!r) hits.set(a.type, r = { target: H.v3(a.target), n: 0, box: [Infinity, Infinity, -Infinity, -Infinity] });
      r.n++;
      r.box = [Math.min(r.box[0], i / 10), Math.min(r.box[1], j / 10), Math.max(r.box[2], i / 10), Math.max(r.box[3], j / 10)];
    }
  }
  out.actions = Object.fromEntries([...hits].map(([k, r]) => [k, { target: r.target, n: r.n, localBox: r.box.map(H.r4) }]));
  // The exit zone: where updateDoorProximity() sends the cat back out
  const leave = interior.transitionToExterior;
  let fired = false;
  interior.transitionToExterior = () => { fired = true; };
  let n = 0, box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = -45; i <= 45; i++) {
    for (let j = -40; j <= 40; j++) {
      player.mesh.position.set(o.x + i / 10, o.y, o.z + j / 10);
      ca._doorLatch = false;
      fired = false;
      ca.updateDoorProximity();
      if (!fired) continue;
      n++;
      box = [Math.min(box[0], i / 10), Math.min(box[1], j / 10), Math.max(box[2], i / 10), Math.max(box[3], j / 10)];
    }
  }
  if (leave === M.InteriorManager.prototype.transitionToExterior) delete interior.transitionToExterior;
  else interior.transitionToExterior = leave;
  out.exitZone = { n, localBox: box.map(H.r4) };
  interior.isInside = wasInside;
  for (const d of player.scene.children.slice()) player.scene.remove(d);

  // The enter / exit spawns, with the transition timers run at once
  const timer = window.setTimeout, frame = window.requestAnimationFrame;
  window.setTimeout = (fn) => { fn(); return 0; };
  window.requestAnimationFrame = (fn) => { fn(0); return 0; };
  try {
    const p = game.player;
    const spawn = () => ({ p: H.v3(p.mesh.position), heading: H.r4(p.heading), yaw: H.r4(p.yaw), rotY: H.r4(p.mesh.rotation.y), cam: H.v3(game.camera.position) });
    interior.isTransitioning = false;
    interior.transitionToInterior();
    out.enter = { ...spawn(), inside: interior.isInside, transitioning: interior.isTransitioning };
    interior.transitionToExterior();
    out.exit = { ...spawn(), inside: interior.isInside, transitioning: interior.isTransitioning };
  } finally {
    window.setTimeout = timer;
    window.requestAnimationFrame = frame;
  }
  interior.isInside = wasInside;

  // A knock-off: the cat on the table beside each knick-knack, then 3 s of
  // InteriorManager.update() at 60 Hz (seeded spin)
  H.setAmbient({ seed: SEEDS.probe, t0: 5e6, step: 0.25 });
  const before = interior.knockables.map((k) => ({ p: k.mesh.position.clone(), r: k.mesh.rotation.clone() }));
  const prevGame = window.game;
  const toasts = [];
  window.game = { player: game.player, audio: null, ui: { showToast: (t) => toasts.push(t) } };
  interior.isInside = true;
  const track = new Hash();
  try {
    for (const k of interior.knockables) {
      game.player.mesh.position.set(k.mesh.position.x - 0.12, o.y + 0.6, k.mesh.position.z);
      for (let s = 0; s < 180; s++) {
        interior.update(1 / 60);
        for (const q of interior.knockables) {
          track.arr(Float64Array.of(q.mesh.position.x, q.mesh.position.y, q.mesh.position.z, q.mesh.rotation.x, q.mesh.rotation.y, q.mesh.rotation.z));
        }
      }
    }
  } finally {
    window.game = prevGame;
    interior.isInside = wasInside;
  }
  out.knock = {
    random: H.ambient.draws, toasts: toasts.length, trajectory: track.hex(),
    end: interior.knockables.map((k) => ({
      key: nameKey(W, k.mesh), p: H.v3(k.mesh.position), knocked: k.knocked, settled: k.settled, floorY: H.r4(k.floorY)
    }))
  };
  // put the knick-knacks back (the digest is already taken; this keeps the scene tidy)
  interior.knockables.forEach((k, i) => {
    k.mesh.position.copy(before[i].p);
    k.mesh.rotation.copy(before[i].r);
  });
  return out;
}

// ------------------------------------------------------------- one build ---

function seedFor(system, spec) {
  return { seed: SEEDS[system] ^ spec.salt, t0: spec.t0, step: spec.step };
}

function makeGame(scene, city, opts) {
  const camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 500);
  const game = {
    scene, city, camera,
    player: { mesh: { position: new THREE.Vector3(), rotation: { y: 0 } }, heading: 0, yaw: 0, velocity: new THREE.Vector3() },
    ui: { showToast() {} }, audio: null
  };
  if (opts && opts.assets) game.assets = opts.assets;
  return game;
}

const newRoots = (scene, before) => scene.children.filter((c) => !before.has(c));

function buildOnce(M, spec, stub = null) {
  const rec = B = {
    draws: { vegetation: 0, hidden: 0 }, random: {}, depth: 0, calls: new Map(),
    phases: Object.fromEntries(SYSTEMS.map((s) => [s, []])),
    trees: [], groves: [], textures: {}, texOf: new Map(),
    interiorWalk: null, interiorBaked: null, interiorKept: 0, scene: null, city: null, interior: null
  };
  const t0 = H.realNow();
  let scene, city, hidden, interior, veg, particles, life, game, roots = {};
  // a seam run (stub) builds the valley classic and hands the five systems the stub kit
  const opts = stub ? {} : (H.countrysideOptions ? H.countrysideOptions() : {});
  const assets = stub ? { assets: stub } : (opts && opts.assets ? { assets: opts.assets } : {});
  try {
    H.setAmbient(seedFor('countryside', spec));
    scene = rec.scene = new THREE.Scene();
    city = rec.city = new M.Countryside(scene, opts);
    const valleyDraws = H.ambient.draws;

    H.setAmbient(seedFor('hidden', spec));
    let before = new Set(scene.children);
    hidden = new M.HiddenPlaces(scene, city, assets);
    roots.hidden = newRoots(scene, before);
    rec.random.hidden = H.ambient.draws;

    H.setAmbient(seedFor('interior', spec));
    game = makeGame(scene, city, stub ? { assets: stub } : opts);
    before = new Set(scene.children);
    interior = rec.interior = new M.InteriorManager(game);
    game.interior = interior;
    roots.interior = newRoots(scene, before);
    rec.random.interior = H.ambient.draws;

    H.setAmbient(seedFor('vegetation', spec));
    before = new Set(scene.children);
    const vegColliders0 = city.colliders.length;
    veg = new M.Vegetation(scene, city.colliders, {
      pathSamples: city.pathSamples, waterRects: city.waterRects, riverSamples: city.riverSamples,
      exclusionRects: city.vegetationExclusions, ...assets
    });
    roots.vegetation = newRoots(scene, before);
    rec.vegColliders = city.colliders.slice(vegColliders0);
    rec.random.vegetation = H.ambient.draws;

    H.setAmbient(seedFor('particles', spec));
    before = new Set(scene.children);
    particles = new M.Particles(scene, assets);
    roots.particles = newRoots(scene, before);
    rec.random.particles = H.ambient.draws;

    H.setAmbient(seedFor('ambient', spec));
    before = new Set(scene.children);
    life = new M.AmbientLife(scene, null, city.nestPos, assets);
    roots.ambient = newRoots(scene, before);
    rec.random.ambient = H.ambient.draws;
    rec.valleyDraws = valleyDraws;
  } finally {
    B = null;
  }
  const buildMs = H.realNow() - t0;
  const world = { scene, city, hidden, interior, veg, particles, life, game };
  rec.registry = registrySnapshot(world, rec);
  if (stub) return { rec, world };
  B = rec; // records below read B.texOf / B.textures
  try {
    scene.updateMatrixWorld(true);
    const walks = {
      hidden: walkRoots('hidden', roots.hidden),
      interior: rec.interiorWalk || walkRoots('interior', roots.interior),
      vegetation: walkRoots('vegetation', roots.vegetation),
      particles: walkRoots('particles', roots.particles),
      ambient: walkRoots('ambient', roots.ambient)
    };
    const warnings = [];
    if (!rec.interiorWalk) warnings.push('InteriorManager._mergeStatics() never ran: the interior was read after the build');
    if (roots.interior.length !== 1) warnings.push(`the interior added ${roots.interior.length} root objects (expected its group)`);

    // the vegetation stream position: one probe draw must equal draw N+1 of a fresh stream
    const fresh = H.mulberry32(77);
    for (let i = 0; i < rec.draws.vegetation; i++) fresh();
    const probe = typeof veg.rng === 'function' && veg.rng() === fresh();

    const sections = digestSections({ city, hidden, interior, veg, particles, life, game, walks, rec, M });
    return { buildMs, warnings, probe, walks, rec, sections, world };
  } finally {
    B = null;
  }
}

// --------------------------------------------------------------- the seam ---
// The modular path of every placeAsset() in the five modules, run with a stub
// kit runtime (no kit assets exist yet): once with every inventory id modular
// (the wholes replace their parts), once with every part modular inside the
// classic wholes, and once with every id modular but kit footprints that
// carry no anchors (the owners must fill them from the layout). The layout
// steps must advance the seeded streams and Math.random exactly as classic,
// every registry the classic builders fill (colliders, exclusions, water,
// platforms, anchors, knockables, creature and god-ray records, spawn seeds)
// must come out the same through the footprint registration path, and every
// system's update() must run without an error, on the classic world too,
// under the game's own Sky. Not part of the digest: reported beside it, and
// the CLI fails on it.

const WHOLES = new Set(['moon-pool', 'lantern-glade', 'tea-interior']);

/** Everything the classic builders register, in order, as comparable data. */
function registrySnapshot(w, rec) {
  const box = H.box6;
  const nums = (o, keys) => keys.map((k) => o[k]);
  const arr = (v) => (v ? Array.from(v) : null);
  return {
    streams: { vegetation: rec.draws.vegetation, hidden: rec.draws.hidden, random: { ...rec.random } },
    colliders: w.city.colliders.map(box),
    exclusions: w.city.vegetationExclusions.map((e) => [e.x, e.z, e.width, e.depth]),
    waterRects: w.city.waterRects.map((r) => [...r]),
    hiddenAnchors: [w.hidden.poolRestPos, w.hidden.gladeRestPos],
    stalkTops: (w.hidden.stalkTops || []).map((t) => [t.x, t.y, t.z, t.a]),
    interior: {
      colliders: w.interior.colliders.map(box), platforms: w.interior.platforms.map(box),
      anchors: [w.interior.eatFishAnchor, w.interior.napAnchor, w.interior.enterAnchor, w.interior.exitZone],
      knockables: w.interior.knockables.map((k) => [k.floorY, k.knocked, k.settled]),
      fish: !!w.interior.fishMesh
    },
    birds: (w.life.birds || []).map((b) => [b.center.x, b.center.y, b.center.z, ...nums(b, ['radius', 'speed', 'yAmp', 'yFreq', 'seed', 'wingSpeed']), b.wings.length]),
    crows: (w.life.guardianBirds || []).map((g) => [g.state, g.circleAngle, g.swoopTimer, g.wings.length]),
    koi: (w.life.koi || []).map((k) => [...nums(k, ['x', 'z', 'cruiseSpeed', 'speed', 'direction', 'lane', 'wobble', 'surfaceTimer', 'len']), !!k.tail, k.pectorals.length]),
    godRays: (w.particles.godRays || []).map((g) => [g.baseX, g.phase, g.w]),
    seeds: {
      petals: arr(w.particles.petalSeeds), fireflies: arr(w.particles.fireflySeeds), motes: arr(w.particles.moteSeeds),
      river: arr(w.particles.riverSeeds), snow: arr(w.particles.snowSeeds), rain: arr(w.particles.rainSeeds), butterflies: arr(w.life.bflySeeds)
    }
  };
}

/**
 * A stand-in kit runtime: every id `modular(id)` names gets an empty instance
 * with the parts its layout binds; `bare` hands back footprints without anchors.
 */
function stubRuntime(modular, { bare = false } = {}) {
  const footprintOf = (fp) => {
    if (!bare || !fp || !fp.anchors) return fp;
    const { anchors, ...rest } = fp;
    return rest;
  };
  const placed = [], layouts = [];
  const partsFor = (layout) => {
    const names = new Set(Object.values(layout.bind || {}));
    const fp = layout.footprint || {};
    for (const k of fp.knockables || []) names.add(k.part);
    for (const b of [...(fp.birds || []), ...(fp.guardianBirds || [])]) b.wings.forEach((n) => names.add(n));
    for (const k of fp.koi || []) { names.add(k.tail); k.pectorals.forEach((n) => names.add(n)); }
    const parts = {};
    for (const n of names) {
      if ((n === 'points' || n === 'lines') && layout.positions) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(layout.positions), 3));
        parts[n] = n === 'lines' ? new THREE.LineSegments(g, new THREE.LineBasicMaterial()) : new THREE.Points(g, new THREE.PointsMaterial());
      } else {
        parts[n] = new THREE.Object3D();
      }
    }
    return parts;
  };
  return {
    placed, layouts, instances: [], update() {},
    build(id, layout, classicFn) {
      if (!modular(id)) return classicFn();
      const group = new THREE.Group();
      group.name = (layout && layout.name) || `asset:${id}`;
      const parts = partsFor(layout || {});
      for (const p of Object.values(parts)) group.add(p);
      placed.push(id);
      layouts.push(layout);
      return { group, parts, sockets: {}, footprint: footprintOf(layout.footprint), live: [], dispose() {} };
    }
  };
}

/** Five frames of every system's update() under a real Sky; the errors by system, and which ran. */
function runUpdates(w, M) {
  const errors = {}, ran = [];
  // the game's own Sky (sunDir, resolvePalette(), weather …), dusk so the night paths run too
  const sky = new M.Sky(new THREE.Scene());
  sky.sunDir.set(-0.6, 0.12, -0.8).normalize();
  const at = new THREE.Vector3(-20, 0, -23);
  const steps = {
    hidden: () => w.hidden.update(1 / 30, at, sky),
    interior: () => { w.interior.isInside = true; w.interior.update(1 / 30); w.interior.isInside = false; },
    vegetation: () => w.veg.update(1 / 30, at, sky),
    particles: () => w.particles.update(1 / 30, at, sky),
    ambient: () => w.life.update(1 / 30, at, sky, null, null, w.city)
  };
  for (const [k, step] of Object.entries(steps)) {
    try { for (let i = 0; i < 5; i++) step(); ran.push(k); } catch (error) { errors[k] = String(error && error.message || error).slice(0, 160); }
  }
  return { errors, ran };
}

function seamCheck(M, spec, classic) {
  if (typeof M.HiddenPlaces.prototype.placeAsset !== 'function') return { ok: true, skipped: 'no placeAsset() in this checkout' };
  const base = classic.rec.registry;
  const classicUpdates = runUpdates(classic.world, M);
  const runs = {}, failures = [];
  for (const [k, e] of Object.entries(classicUpdates.errors)) failures.push(`classic: ${k}.update() threw — ${e}`);
  const RUNS = [
    ['wholes', () => true, {}],
    ['parts', (id) => !WHOLES.has(id), {}],
    ['bare', () => true, { bare: true }]   // kit footprints without anchors
  ];
  for (const [name, modular, how] of RUNS) {
    const stub = stubRuntime(modular, how);
    let out;
    try { out = buildOnce(M, spec, stub); } catch (error) {
      failures.push(`${name}: the build threw — ${String(error && error.stack || error).split('\n').slice(0, 2).join(' ')}`);
      runs[name] = { placed: stub.placed.length };
      continue;
    }
    const reg = out.rec.registry;
    const differs = Object.keys(base).filter((k) => JSON.stringify(base[k]) !== JSON.stringify(reg[k]));
    for (const k of differs) {
      const a = base[k], b = reg[k];
      const sub = a && b && typeof a === 'object' && !Array.isArray(a)
        ? Object.keys(a).filter((s) => JSON.stringify(a[s]) !== JSON.stringify(b[s])).map((s) => `${s} ${JSON.stringify(a[s]).slice(0, 60)} → ${JSON.stringify(b[s]).slice(0, 60)}`)
        : [];
      failures.push(`${name}: ${k} differs from classic${sub.length ? ' (' + sub.join('; ') + ')' : ''}`);
    }
    // a kit tree must not keep the classic canopy its layout step built
    const trees = stub.layouts.filter((l) => 'canopy' in l);
    const kept = trees.filter((l) => l.canopy).length;
    if (kept) failures.push(`${name}: ${kept} of ${trees.length} kit trees still hold the classic canopy`);
    const updates = runUpdates(out.world, M);
    for (const [k, e] of Object.entries(updates.errors)) failures.push(`${name}: ${k}.update() threw — ${e}`);
    const counts = {};
    for (const id of stub.placed) counts[id] = (counts[id] || 0) + 1;
    runs[name] = {
      placed: stub.placed.length, ids: counts,
      registries: Object.keys(base).length - differs.length + '/' + Object.keys(base).length,
      updates: `${updates.ran.length}/5`, canopiesFreed: `${trees.length - kept}/${trees.length}`
    };
  }
  const placedAll = new Set(Object.values(runs).flatMap((r) => Object.keys(r.ids || {})));
  return { ok: failures.length === 0, failures, runs, ids: placedAll.size, classicUpdates: `${classicUpdates.ran.length}/5 (${classicUpdates.ran.join(', ')})` };
}

// ------------------------------------------------------------ the digest ---

function digestSections({ city, hidden, interior, veg, particles, life, game, walks, rec, M }) {
  const r4 = H.r4, v3 = H.v3, box6 = H.box6;
  const W = walks.interior;
  const keyIn = (sys, o) => nameKey(walks[sys], o);

  // ---- interior
  const interiorSec = {
    origin: v3(interior.origin),
    group: { key: keyIn('interior', interior.group), p: v3(interior.group.position) },
    colliders: interior.colliders.map(box6),
    platforms: interior.platforms.map(box6),
    knockables: interior.knockables.map((k) => ({
      key: keyIn('interior', k.mesh), p: v3(k.mesh.position), floorY: r4(k.floorY),
      vel: v3(k.vel), spin: v3(k.spin), knocked: k.knocked, settled: k.settled
    })),
    fish: interior.fishMesh ? { key: keyIn('interior', interior.fishMesh), p: v3(interior.fishMesh.getWorldPosition(new THREE.Vector3())), visible: interior.fishMesh.visible } : null,
    fishEaten: interior.fishEaten,
    lights: (interior.roomLights || []).map((l) => keyIn('interior', l)),
    merge: { baked: (rec.interiorBaked || []).length, kept: rec.interiorKept }
  };
  // probes run on this build's interior after the walk (they move the knick-knacks, then put them back)
  interiorSec.anchors = probeInterior(M, interior, game, city, W);

  // ---- hidden places
  const motes = (list) => (list || []).map((m) => [m.a, m.rr, m.y, m.sp, m.ph].map(r4));
  const motesExact = (list) => exact((list || []).flatMap((m) => [m.a, m.rr, m.y, m.sp, m.ph]));
  const hiddenSec = {
    draws: rec.draws.hidden,
    pool: keyIn('hidden', hidden.poolGroup), glade: keyIn('hidden', hidden.gladeGroup),
    poolMotes: motes(hidden.poolMotes), poolMotesExact: motesExact(hidden.poolMotes),
    gladeFlies: motes(hidden.gladeFlies), gladeFliesExact: motesExact(hidden.gladeFlies),
    lanterns: (hidden.lanterns || []).map((l) => ({
      lamp: keyIn('hidden', l.lamp), base: r4(l.base), onset: r4(l.onset), phase: r4(l.phase), ix: r4(l.ix), iz: r4(l.iz),
      mat: matRecord(l.mat, 'hidden.lanterns'), halo: matRecord(l.haloMat, 'hidden.lanterns'),
      exact: exact([l.base, l.onset, l.phase, l.ix, l.iz])
    })),
    stalkTops: (hidden.stalkTops || []).map((s) => [s.x, s.y, s.z, s.a].map(r4)),
    stalkTopsExact: exact((hidden.stalkTops || []).flatMap((s) => [s.x, s.y, s.z, s.a])),
    handles: Object.fromEntries(['poolWaterMat', 'causticMat', 'moonMat', 'poolToroMat', 'poolToroHaloMat', 'poolMoteMat', 'gladeFlyMat']
      .map((k) => [k, hidden[k] ? matRecord(hidden[k], 'hidden.' + k) : null])),
    objects: Object.fromEntries(['moonGlow', 'poolMotePoints', 'gladeFlyPoints'].map((k) => [k, keyIn('hidden', hidden[k])])),
    causticTex: hidden.causticTex ? texRecord(hidden.causticTex, 'hidden.causticTex') : null,
    found: { ...hidden.found }, soundTimers: { ...hidden.soundTimers },
    footprint: {
      exclusions: city.vegetationExclusions.map((e) => [e.x, e.z, e.width, e.depth].map(r4)),
      waterRects: city.waterRects.map((w) => w.map(r4))
    }
  };

  // ---- vegetation
  const mask = veg.grass && veg.grass.U && veg.grass.U.uMask.value;
  const prim = (l) => Object.fromEntries(Object.entries(l).filter(([, v]) => v === null || ['number', 'string', 'boolean'].includes(typeof v)).map(([k, v]) => [k, typeof v === 'number' ? r4(v) : v]));
  const vegSec = {
    draws: rec.draws.vegetation,
    sakuraSpots: (veg.sakuraSpots || []).map((s) => s.map(r4)),
    mapleSpots: (veg.mapleSpots || []).map((s) => s.map(r4)),
    trees: rec.trees,
    groves: rec.groves,
    colliders: rec.vegColliders.map(box6),
    collidersExact: exact(rec.vegColliders.flatMap((b) => [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z])),
    dapple: {
      pools: (veg.dapplePools || []).map((p) => keyIn('vegetation', p)),
      materials: (veg.dappleMeshes || []).length,
      texture: veg.dappleTex ? texRecord(veg.dappleTex, 'vegetation.dappleTex') : null
    },
    mask: mask ? { texture: texRecord(mask, 'vegetation.mask'), rect: veg.grass.U.uMaskRect.value.toArray().map(r4) } : null,
    grass: veg.grass ? veg.grass.layers.map((l) => ({ ...prim(l), mesh: keyIn('vegetation', l.mesh) })) : null,
    grassMeshes: (veg.grassMeshes || []).length,
    swayables: (veg.swayables || []).length,
    counts: { trees: veg._treeCount, shrubs: veg._shrubCount }
  };

  // ---- particles
  const seeds = (arr) => (arr ? { n: arr.length, h: hashOf(arr) } : null);
  const sys = (o) => (o ? { key: keyIn('particles', o), vertices: o.geometry.attributes.position.count, range: [o.geometry.drawRange.start, o.geometry.drawRange.count] } : null);
  const particlesSec = {
    random: rec.random.particles,
    petals: { ...sys(particles.petals), seeds: seeds(particles.petalSeeds), active: particles.petalActive },
    fireflies: { ...sys(particles.fireflies), seeds: seeds(particles.fireflySeeds), active: particles.fireflyActive },
    motes: { ...sys(particles.motes), seeds: seeds(particles.moteSeeds), active: particles.moteActive },
    river: { ...sys(particles.riverPetals), seeds: seeds(particles.riverSeeds), active: particles.riverActive },
    snow: { ...sys(particles.snow), seeds: seeds(particles.snowSeeds), active: particles.snowActive },
    rain: { ...sys(particles.rain), seeds: seeds(particles.rainSeeds), active: particles.rainActive, count: particles.rainCount, visible: particles.rain && particles.rain.visible },
    godRays: (particles.godRays || []).map((g) => ({ key: keyIn('particles', g.mesh), baseX: r4(g.baseX), phase: r4(g.phase), w: r4(g.w), exact: exact([g.baseX, g.phase, g.w, g.mesh.rotation.y]) })),
    godRayActive: particles.godRayActive,
    budget: particles.budget,
    handles: Object.fromEntries(['rainMat', 'fireflyMat', 'snowMat'].map((k) => [k, particles[k] ? matRecord(particles[k], 'particles.' + k) : null]))
  };

  // ---- ambient life
  const ambientSec = {
    random: rec.random.ambient,
    nestPos: v3(life.nestPos),
    birds: (life.birds || []).map((b) => ({
      key: keyIn('ambient', b.mesh), wings: b.wings.length, center: v3(b.center), radius: r4(b.radius), speed: r4(b.speed),
      yAmp: r4(b.yAmp), yFreq: r4(b.yFreq), seed: r4(b.seed), wingSpeed: r4(b.wingSpeed),
      exact: exact([b.center.x, b.center.y, b.center.z, b.radius, b.speed, b.yAmp, b.yFreq, b.seed, b.wingSpeed, b.mesh.position.x, b.mesh.position.z])
    })),
    guardianBirds: (life.guardianBirds || []).map((g) => ({
      key: keyIn('ambient', g.mesh), wings: g.wings.length, state: g.state, circleAngle: r4(g.circleAngle), swoopTimer: r4(g.swoopTimer),
      swoopCount: g.swoopCount, isAggro: g.isAggro, didNudge: g.didNudge
    })),
    butterflies: { key: keyIn('ambient', life.butterflies), seeds: seeds(life.bflySeeds), mat: life.bflyMat ? matRecord(life.bflyMat, 'ambient.bflyMat') : null },
    koi: (life.koi || []).map((k) => ({
      key: keyIn('ambient', k.mesh), x: r4(k.x), z: r4(k.z), lane: r4(k.lane), len: r4(k.len), cruise: r4(k.cruiseSpeed), speed: r4(k.speed),
      direction: k.direction, wobble: r4(k.wobble), surfaceTimer: r4(k.surfaceTimer), tail: !!k.tail, pectorals: (k.pectorals || []).length,
      exact: exact([k.x, k.z, k.lane, k.len, k.cruiseSpeed, k.speed, k.direction, k.wobble, k.surfaceTimer])
    }))
  };

  return { interior: interiorSec, hidden: hiddenSec, vegetation: vegSec, particles: particlesSec, ambient: ambientSec };
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

function assemble(build, sceneNote) {
  const { walks, rec, sections } = build;
  const objects = [], members = [];
  for (const s of SYSTEMS) {
    objects.push(...walks[s].objects);
    members.push(...walks[s].members);
  }
  const anchors = new Set(members.map(([k]) => k.slice(0, k.lastIndexOf(' · '))));
  const colliders = sections.interior.colliders.length + sections.vegetation.colliders.length;
  return {
    format: FORMAT,
    version: VERSION,
    scene: sceneNote,
    seed: 77,
    counts: {
      objects: objects.length, aggregates: anchors.size, members: members.length, baked: (rec.interiorBaked || []).length,
      colliders, platforms: sections.interior.platforms.length,
      waterRects: sections.hidden.footprint.waterRects.length, exclusions: sections.hidden.footprint.exclusions.length,
      textures: Object.keys(rec.textures).length, trees: rec.trees.length, draws: rec.draws.vegetation
    },
    rng: {
      vegetation: { seed: 77, draws: rec.draws.vegetation, probe: build.probe },
      hidden: { draws: rec.draws.hidden },
      valley: { random: rec.valleyDraws },
      random: rec.random
    },
    builders: { ...Object.fromEntries(SYSTEMS.map((s) => [s, phaseTable(rec.phases[s])])), calls: Object.fromEntries(rec.calls) },
    interior: sections.interior,
    hidden: sections.hidden,
    vegetation: sections.vegetation,
    particles: sections.particles,
    ambient: sections.ambient,
    objects: Object.fromEntries(objects),
    members: Object.fromEntries(members),
    baked: Object.fromEntries(rec.interiorBaked || []),
    textures: rec.textures
  };
}

/** `a` with every leaf that differs from `b` replaced by "~". */
function mask(a, b, path, out) {
  if (a === b) return a;
  const isObj = (v) => v !== null && typeof v === 'object';
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mask(v, b[i], path.concat(i), out));
  if (isObj(a) && isObj(b) && !Array.isArray(a) && !Array.isArray(b)) {
    const r = {};
    for (const k of Object.keys(a)) {
      if (k in b) r[k] = mask(a[k], b[k], path.concat(k), out);
      else { r[k] = a[k]; out.shape.push(path.concat(k)); }
    }
    for (const k of Object.keys(b)) if (!(k in a)) out.shape.push(path.concat(k));
    return r;
  }
  if (isObj(a) || isObj(b)) { out.shape.push(path); return a; }
  out.leaves.push(path);
  return '~';
}

const fmt = (path) => path.map((p) => (typeof p === 'number' ? `[${p}]` : /^[A-Za-z_$][\w$]*$/.test(p) ? '.' + p : `[${JSON.stringify(p)}]`)).join('').replace(/^\./, '');

// ------------------------------------------------------------------- run ---

export async function systemsGolden(helpers) {
  H = helpers;
  const params = new URLSearchParams(location.search);
  const goldenUrl = params.get('golden') || DEFAULT_GOLDEN;
  const maxShown = Math.max(1, Number(params.get('max')) || 40);
  const tStart = H.realNow();
  installCanvasHooks();
  THREE = await import('three');
  const M = {};
  ({ Countryside: M.Countryside } = await import(`../../src/countryside.js?v=${TAG}`));
  ({ HiddenPlaces: M.HiddenPlaces } = await import(`../../src/hidden_places.js?v=${TAG}`));
  ({ InteriorManager: M.InteriorManager } = await import(`../../src/interior.js?v=${TAG}`));
  ({ Vegetation: M.Vegetation } = await import(`../../src/vegetation.js?v=${TAG}`));
  ({ Particles: M.Particles } = await import(`../../src/particles.js?v=${TAG}`));
  ({ AmbientLife: M.AmbientLife } = await import(`../../src/ambient_life.js?v=${TAG}`));
  ({ ContextActionManager: M.ContextActionManager } = await import(`../../src/context_actions.js?v=${TAG}`));
  ({ Sky: M.Sky } = await import(`../../src/sky.js?v=${TAG}`));
  const tImport = H.realNow();
  instrument(M);
  const before = H.ambient.draws;
  THREE.MathUtils.generateUUID();
  new THREE.Object3D();
  const uuidSeparated = H.ambient.draws === before;

  const sceneNote = 'Countryside → HiddenPlaces → InteriorManager → Vegetation → Particles → AmbientLife (src/main.js order); Math.random re-seeded per system; no renderer, no chunking';
  const spec = { salt: 0, t0: 1e6, step: 0.5 };
  const builds = [buildOnce(M, spec), buildOnce(M, spec)];
  const tBuilt = H.realNow();
  // the seam check runs on its own worlds (and on build B's for the classic updates)
  const seam = seamCheck(M, spec, builds[1]);
  const DA = assemble(builds[0], sceneNote), DB = assemble(builds[1], sceneNote);
  const vol = { leaves: [], shape: [] };
  const digest = mask(DA, DB, [], vol);
  digest.volatile = {
    note: 'values that differ between two builds with the same seeds (nondeterminism): written as "~"',
    leaves: vol.leaves.length,
    paths: vol.leaves.map(fmt).slice(0, 80)
  };
  const text = H.toText(digest);
  const warnings = [...new Set(builds.flatMap((b) => b.warnings))];
  if (vol.leaves.length) warnings.push(`${vol.leaves.length} value(s) differ between two same-seed builds: ${vol.leaves.slice(0, 5).map(fmt).join(', ')}`);
  if (vol.shape.length) warnings.push(`the two builds differ in shape at ${vol.shape.length} place(s): ${vol.shape.slice(0, 5).map(fmt).join(', ')}`);
  if (!builds[0].probe) warnings.push('vegetation rng probe failed: the counted draws do not match the stream position');
  if (!uuidSeparated) warnings.push('three.js UUID draws are not routed apart from Math.random()');

  const golden = { url: goldenUrl, found: false, bytes: 0 };
  let diff = null;
  try {
    const res = await fetch(goldenUrl, { cache: 'no-store' });
    if (res.ok) {
      const goldText = await res.text();
      let gold;
      try { gold = JSON.parse(goldText); } catch (error) {
        throw new Error(`the golden is not valid JSON (${error.message})`);
      }
      golden.found = true;
      golden.bytes = new TextEncoder().encode(goldText).length;
      golden.textEqual = goldText === text;
      diff = H.diffDigests(gold, JSON.parse(text));
    } else {
      golden.status = res.status;
      golden.error = `HTTP ${res.status}`;
    }
  } catch (error) {
    golden.error = String(error && error.message || error);
  }
  const tEnd = H.realNow();

  const c = digest.counts;
  const random = digest.rng.random;
  const result = {
    done: true, ok: true, format: FORMAT, version: VERSION, systems: true,
    query: location.search, scene: sceneNote, seed: digest.seed,
    counts: c, probe: digest.rng.vegetation.probe, hiddenDraws: digest.rng.hidden.draws,
    anchors: Object.keys(digest.interior.anchors).length,
    volatile: { leaves: digest.volatile.leaves, members: 0 },
    ambient: { draws: SYSTEMS.reduce((s, k) => s + (random[k] || 0), 0), uuidSeparated },
    rngLine: `vegetation ${c.draws} draws (probe ${digest.rng.vegetation.probe ? 'ok' : 'FAILED'}) · hidden ${digest.rng.hidden.draws}` +
      ` · Math.random ${SYSTEMS.map((k) => `${k} ${random[k]}`).join(', ')} · textures ${c.textures} · trees ${c.trees}` +
      ` · volatile ${digest.volatile.leaves} leaves`,
    seam,
    golden, equal: !!(diff && diff.equal), diff, warnings,
    digestBytes: new TextEncoder().encode(text).length,
    timing: {
      importMs: Math.round(tImport - tStart),
      buildMs: builds.map((b) => Math.round(b.buildMs)),
      digestMs: Math.round(tEnd - tBuilt),
      totalMs: Math.round(tEnd - tStart)
    },
    digestText: text
  };
  window.__footprint = result;

  const $ = (id) => document.getElementById(id);
  document.title = 'Systems Golden';
  $('golden').textContent = goldenUrl.startsWith('/') ? goldenUrl.slice(1) : 'tools/' + goldenUrl.replace(/^\.\//, '');
  const status = $('status');
  if (!golden.found) {
    status.textContent = `no usable golden at ${goldenUrl} (${golden.error}): write it with node tools/footprint_golden.mjs --systems --write`;
    status.className = 'failed';
  } else if (diff.equal) {
    status.textContent = `EQUAL: the systems match the golden${golden.textEqual ? ' byte for byte' : ''}`;
    status.className = 'equal';
  } else {
    status.textContent = `DIFFERENT: ${diff.counts.changed} changed, ${diff.counts.added} added, ${diff.counts.removed} removed`;
    status.className = 'different';
  }
  $('summary').textContent = [
    `scene     ${sceneNote}`,
    `rng       ${result.rngLine}`,
    `counts    objects ${c.objects} · members ${c.members} under ${c.aggregates} anchors · baked ${c.baked} · textures ${c.textures}`,
    `          colliders ${c.colliders} (interior + vegetation) · platforms ${c.platforms} · trees ${c.trees}`,
    `digest    ${result.digestBytes} bytes · golden ${golden.found ? golden.bytes + ' bytes' : 'missing'} (${goldenUrl})`,
    `time      import ${result.timing.importMs} ms · build ${result.timing.buildMs.join(' + ')} ms · digest ${result.timing.digestMs} ms · total ${result.timing.totalMs} ms`,
    `seam      ${seam.skipped ? 'skipped: ' + seam.skipped : (seam.ok ? 'ok' : 'FAILED') + ` · ${seam.ids} ids routed · classic updates ${seam.classicUpdates} · ` +
      Object.entries(seam.runs).map(([k, r]) => `${k} ${r.placed} instances, registries ${r.registries}, updates ${r.updates}, canopies freed ${r.canopiesFreed}`).join(' · ')}`,
    ...(seam.failures && seam.failures.length ? seam.failures.map((f) => '  seam: ' + f) : []),
    ...(warnings.length ? ['', 'warnings:', ...warnings.map((w) => '  ' + w)] : [])
  ].join('\n');
  $('changes').textContent = H.changeLines(diff, maxShown).join('\n');
  const link = $('download');
  link.download = 'systems_classic.json';
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.hidden = false;
}
