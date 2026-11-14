// Rooftop golden: the safety net for splitting rooftops/js/build.js
// (BUILD_GUIDE_FABLE.md §12 R1.4, modelled on tools/footprint_golden.js).
// It changes no Roof Road file.
//
//   node tools/rooftop_golden.mjs            headless; exit 0 equal, 1 different
//   node tools/rooftop_golden.mjs --write    regenerate tools/golden/rooftop_classic.json
//   python3 -m http.server 8000  →  http://localhost:8000/tools/rooftop_golden.html
//
// It builds the Roof Road the way rooftops/js/game.js does (buildLevel(), an
// AssetRuntime from the page's ?assets= / ?swap= flags, buildWorld()) with no
// renderer, and writes a JSON digest of the numbers that make the run:
//
//   level       the run's gameplay data from level.js: every platform, wall,
//               ceiling, pickup, perch, checkpoint, mouth and alley (unchanged
//               by build.js, recorded so a split can never drift from them)
//   pieces      one line per level piece, in build order: what that piece's
//               builder handed the world (ctx.add / addGlass / addDyn), each as
//               [container, type, meshes, vertices, triangles, world bounds,
//               geometry + transform + material hash]. Attribution: the piece
//               list is iterated through a wrapper that marks each piece, and
//               Object3D.prototype.add records adds onto the world's three
//               containers (objects made before the piece loop began)
//   lights      every lantern light position (ctx.light) in order
//   root        every child of world.root after assembly (merged batches,
//               moving pieces, ground, distant city, pagodas, Shōki, treats)
//   batches     each merged static/glass batch: material, vertices, bounds, hash
//   dynamic     boats, the float, people, Shōki and treats as registered
//   materials   every entry of world.M: type, colours, flags, maps (size and a
//               pixel hash of the canvas), shader hooks
//   update      world.update(t, night, platOffset, platforms, s) at five fixed
//               samples: boats, float, people, culled batches, lantern glow
//
// Routing self-test (R1.3, not part of the digest): the world is built a
// third time with stand-in kit assets registered for two piece ids
// (roof-kido on an x leg, roof-lantern-racks on x, −z and +z legs; both
// swapped modular) and an unregistered swap (roof-bridge). It checks that
// every kido and rack piece came from a stand-in, at the hero tier, placed in
// the classic piece's rail frame (its post stands where the frame puts it, its
// `light…` socket lands on the classic lantern light), that each `live` part
// was kept out of the merge, and that every other piece, the lights and the
// level are identical to the classic build. Exit 1 when it fails, 2 when it
// did not run.
//
// Numbers are rounded to 1e-4; one entry per line so git diffs stay readable.
// Math.random is seeded before any module loads (three.js draws it for UUIDs
// only; nothing in the Roof Road's geometry may). The world is built twice and
// any entry that differs between the two builds is reported as a warning
// (and --write is refused).
//
// Page flags: ?golden=<path> (default golden/rooftop_classic.json, relative
// to this page), ?max=<n> changes listed, ?assets= and ?swap= (passed to the
// Roof Road's AssetRuntime exactly as the game page passes them).

const FORMAT = 'michi-neko-rooftop-golden';
const VERSION = 1;
const params = new URLSearchParams(location.search);
const GOLDEN_URL = params.get('golden') || 'golden/rooftop_classic.json';
const MAX_SHOWN = Math.max(1, Number(params.get('max')) || 40);
const MAX_STORED = 2000;

// ---------------------------------------------------------------- shims ---
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ambient = { rng: mulberry32(20261114), draws: 0 };
Math.random = () => { ambient.draws++; return ambient.rng(); };

// --------------------------------------------------------------- numbers ---
const r4 = (x) => {
  if (typeof x !== 'number' || !Number.isFinite(x)) return x === undefined ? null : String(x);
  const v = Math.round(x * 1e4) / 1e4;
  return Object.is(v, -0) ? 0 : v;
};
const hex = (c) => (c && c.isColor ? '#' + c.getHexString() : null);

/** Two independent FNV-1a lanes → 16 hex digits. */
class Hash {
  constructor() { this.a = 0x811c9dc5; this.b = 0x01000193 ^ 0x5bd1e995; }
  int(n) {
    n |= 0;
    for (let k = 0; k < 4; k++) {
      const byte = (n >>> (k * 8)) & 0xff;
      this.a = Math.imul(this.a ^ byte, 0x01000193);
      this.b = Math.imul(this.b ^ byte, 0x01000193) ^ (this.b >>> 13);
    }
    return this;
  }
  num(x) { return this.int(Number.isFinite(x) ? Math.round(x * 1e4) : 0x7fffffff); }
  str(s) { s = String(s); this.int(s.length); for (let i = 0; i < s.length; i++) this.int(s.charCodeAt(i)); return this; }
  hex() { return (this.a >>> 0).toString(16).padStart(8, '0') + (this.b >>> 0).toString(16).padStart(8, '0'); }
}

/** A plain, rounded copy of level data (no functions, no cycles, depth ≤ 4). */
function plain(v, depth = 0) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return r4(v);
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'function') return undefined;
  if (depth > 4) return '…';
  if (Array.isArray(v)) return v.map((x) => plain(x, depth + 1));
  if (typeof v === 'object') {
    if (v.isVector3 || v.isVector2) return v.toArray().map(r4);
    const out = {};
    for (const k of Object.keys(v).sort()) {
      const p = plain(v[k], depth + 1);
      if (p !== undefined) out[k] = p;
    }
    return out;
  }
  return String(v);
}

// --------------------------------------------------------------- materials ---
let matNames = new Map();
function nameMaterials(M) {
  matNames = new Map();
  const walk = (v, path) => {
    if (!v) return;
    if (v.isMaterial) { if (!matNames.has(v)) matNames.set(v, path); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], path ? `${path}.${k}` : k);
  };
  walk(M, '');
}
function matKey(m) {
  if (Array.isArray(m)) return m.map(matKey).join('|');
  if (!m) return 'none';
  return matNames.get(m) || `anon:${m.type}:${hex(m.color) || ''}`;
}

const texHashes = new WeakMap();
function texInfo(t) {
  if (!t || !t.isTexture) return null;
  if (texHashes.has(t)) return texHashes.get(t);
  const img = t.image;
  let info;
  if (img && img.getContext) {
    const h = new Hash();
    try {
      const data = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
      for (let i = 0; i < data.length; i += 4) h.int(data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24));
    } catch (error) { h.str('unreadable ' + error.message); }
    info = [img.width, img.height, h.hex(), r4(t.repeat.x), r4(t.repeat.y), t.wrapS, t.colorSpace || ''];
  } else if (img && img.data) {
    const h = new Hash();
    for (let i = 0; i < img.data.length; i++) h.num(img.data[i]);
    info = [img.width, img.height, h.hex(), r4(t.repeat.x), r4(t.repeat.y), t.wrapS, t.colorSpace || ''];
  } else {
    info = [img ? img.width || 0 : 0, img ? img.height || 0 : 0, 'no-pixels', r4(t.repeat.x), r4(t.repeat.y), t.wrapS, t.colorSpace || ''];
  }
  texHashes.set(t, info);
  return info;
}

function materialEntry(m) {
  const e = { type: m.type };
  for (const k of ['color', 'emissive']) if (m[k] && m[k].isColor) e[k] = hex(m[k]);
  for (const k of ['emissiveIntensity', 'roughness', 'metalness', 'opacity', 'alphaTest', 'envMapIntensity', 'bumpScale']) if (typeof m[k] === 'number') e[k] = r4(m[k]);
  for (const k of ['transparent', 'depthWrite', 'flatShading', 'fog']) if (typeof m[k] === 'boolean') e[k] = m[k];
  e.side = m.side; e.blending = m.blending;
  if (m.normalScale) e.normalScale = [r4(m.normalScale.x), r4(m.normalScale.y)];
  for (const k of ['map', 'normalMap', 'roughnessMap', 'bumpMap', 'emissiveMap', 'alphaMap']) if (m[k]) e[k] = texInfo(m[k]);
  const ud = Object.keys(m.userData || {}).filter((k) => typeof m.userData[k] !== 'object').sort();
  if (ud.length) e.userData = ud;
  if (m.onBeforeCompile && m.onBeforeCompile.toString() !== 'onBeforeCompile() {}') e.onBeforeCompile = new Hash().str(m.onBeforeCompile.toString()).hex();
  if (m.customProgramCacheKey && Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey')) e.cacheKey = m.customProgramCacheKey();
  if (m.isShaderMaterial) {
    e.uniforms = Object.keys(m.uniforms || {}).sort();
    e.shader = new Hash().str(m.vertexShader).str(m.fragmentShader).hex();
  }
  return e;
}

// ---------------------------------------------------------------- geometry ---
const geoHashes = new WeakMap();
function geometryInfo(g) {
  if (geoHashes.has(g)) return geoHashes.get(g);
  const h = new Hash().str(g.type);
  for (const name of Object.keys(g.attributes).sort()) {
    const a = g.attributes[name];
    h.str(name).int(a.itemSize).int(a.count).int(a.normalized ? 1 : 0);
    const arr = a.array, n = a.count * a.itemSize;
    if (a.isInterleavedBufferAttribute) { for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) h.num(a.getComponent ? a.getComponent(i, c) : a.getX(i)); }
    else for (let i = 0; i < n; i++) h.num(arr[i]);
  }
  if (g.index) { h.str('index').int(g.index.count); const ix = g.index.array; for (let i = 0; i < g.index.count; i++) h.int(ix[i]); }
  for (const grp of g.groups || []) h.int(grp.start).int(grp.count).int(grp.materialIndex || 0);
  h.int(g.drawRange.start).int(Number.isFinite(g.drawRange.count) ? g.drawRange.count : -1);
  const pos = g.attributes.position;
  const verts = pos ? pos.count : 0;
  const tris = g.index ? g.index.count / 3 : verts / 3;
  if (!g.boundingBox) g.computeBoundingBox();
  const info = { hash: h.hex(), verts, tris };
  geoHashes.set(g, info);
  return info;
}

/** Digest a subtree in world space: [meshes, vertices, triangles, bounds, hash]. */
function subtree(THREE, root) {
  root.updateWorldMatrix(true, true);
  const h = new Hash();
  const box = new THREE.Box3(), tmp = new THREE.Box3(), m4 = new THREE.Matrix4();
  let meshes = 0, verts = 0, tris = 0;
  root.traverse((o) => {
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
    meshes++;
    h.str(o.type).str(matKey(o.material)).int(o.visible ? 1 : 0).int(o.castShadow ? 1 : 0).int(o.receiveShadow ? 1 : 0)
      .int(o.renderOrder | 0).int(o.frustumCulled ? 1 : 0);
    for (const e of o.matrixWorld.elements) h.num(e);
    if (!o.geometry) return;
    const gi = geometryInfo(o.geometry);
    h.str(gi.hash);
    if (o.isInstancedMesh) {
      h.int(o.count);
      const im = o.instanceMatrix.array;
      for (let i = 0; i < o.count * 16; i++) h.num(im[i]);
      if (o.instanceColor) { const ic = o.instanceColor.array; for (let i = 0; i < o.count * 3; i++) h.num(ic[i]); }
      verts += gi.verts * o.count; tris += gi.tris * o.count;
      for (let i = 0; i < o.count; i++) {
        m4.fromArray(im, i * 16).premultiply(o.matrixWorld);
        tmp.copy(o.geometry.boundingBox).applyMatrix4(m4); box.union(tmp);
      }
    } else {
      verts += gi.verts; tris += gi.tris;
      if (o.geometry.boundingBox && !o.geometry.boundingBox.isEmpty()) { tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp); }
    }
  });
  const b = box.isEmpty() ? null : [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].map(r4);
  return [meshes, verts, r4(tris), b, h.hex()];
}

// ------------------------------------------------------------------- build ---
async function loadModules() {
  const THREE = await import('three');
  const level = await import('../rooftops/js/level.js');
  const build = await import('../rooftops/js/build.js');
  const physics = await import('../rooftops/js/physics.js');
  const runtime = await import('../src/kit/runtime.js?v=20261113a');
  return { THREE, level, build, physics, runtime };
}

/** One instrumented buildWorld(), exactly as rooftops/js/game.js calls it. */
async function instrumentedBuild(mods, runtime = null) {
  const { THREE } = mods;
  const level = mods.level.buildLevel();
  // The Roof Road page: classic by default, ?assets= / ?swap= honoured, high
  // quality on a desktop (game.js resolves the same 'high' when lowPower is off).
  const assets = runtime || new mods.runtime.AssetRuntime({ THREE, assetSet: 'classic', search: location.search, quality: 'high' });
  await assets.preload();
  const per = [];
  const mark = { current: -1, start: Infinity };
  const origAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (...objs) {
    if (mark.current >= 0 && this.id < mark.start) {
      for (const o of objs) if (o && o.isObject3D && o !== this) per[mark.current].push({ parent: this, child: o });
    }
    return origAdd.apply(this, objs);
  };
  const pieces = level.pieces.slice();
  pieces[Symbol.iterator] = function* () {
    mark.start = new THREE.Object3D().id;   // the world's containers are older than this
    for (let i = 0; i < this.length; i++) { mark.current = i; per[i] = []; yield this[i]; }
    mark.current = -1;
  };
  const t0 = performance.now();
  let world;
  try { world = mods.build.buildWorld({ ...level, pieces }, { reduceMotion: false, lowPower: false, assets }); }
  finally { THREE.Object3D.prototype.add = origAdd; }
  const buildMs = Math.round(performance.now() - t0);
  return { level, world, per, assets, buildMs };
}

function digestBuild(mods, b) {
  const { THREE } = mods;
  const { level, world, per } = b;
  nameMaterials(world.M);
  const d = { format: [FORMAT, VERSION] };

  // level: gameplay data (level.js; never changed by this lane)
  d.counts = {
    pieces: level.pieces.length, platforms: level.platforms.length, walls: (level.walls || []).length,
    ceilings: (level.ceilings || []).length, pickups: level.pickups.length, perches: (level.perches || []).length,
    checkpoints: (level.checkpoints || []).length, alleys: (level.alleys || []).length, length: r4(level.length)
  };
  d.platforms = level.platforms.map((p) => plain(p));
  d.walls = (level.walls || []).map((p) => plain(p));
  d.ceilings = (level.ceilings || []).map((p) => plain(p));
  d.pickups = level.pickups.map((p) => plain(p));
  d.perches = (level.perches || []).map((p) => plain(p));
  d.checkpoints = (level.checkpoints || []).map((p) => plain(p));
  d.mouths = level.mouths.map((p) => plain(p));
  d.alleys = (level.alleys || []).map((p) => plain(p));

  // pieces: what each builder handed the world
  const root = world.root;
  const containers = new Map();
  const containerName = (parent) => {
    if (parent === root) return 'root';
    if (!containers.has(parent)) containers.set(parent, 'c' + containers.size);
    return containers.get(parent);
  };
  d.pieces = level.pieces.map((pc, i) => {
    const adds = (per[i] || []).map(({ parent, child }) => [containerName(parent), child.type, ...subtree(THREE, child)]);
    return [i, pc.type, r4(pc.s0 ?? pc.s ?? pc.cx ?? 0), adds];
  });
  d.containers = [...containers.values()];

  d.lights = world.lights.map((v) => [r4(v.x), r4(v.y), r4(v.z)]);

  // the assembled world
  d.root = root.children.map((c, i) => [i, c.type, c.name || '', c.visible, ...subtree(THREE, c)]);
  d.batches = [];
  root.traverse((o) => {
    if (o.isMesh && o.userData && o.userData.spatialBatch) {
      const s = subtree(THREE, o);
      d.batches.push([matKey(o.material), o.castShadow, o.receiveShadow, s[1], s[3], s[4]]);
    }
  });
  const rootIndex = (o) => { let x = o; while (x && x.parent !== root) x = x.parent; return x ? root.children.indexOf(x) : -1; };
  const dyn = world.dynamic;
  d.dynamic = {
    boats: (dyn.boats || []).map((bt) => [bt.plat, r4(bt.d), rootIndex(bt.group), !!bt.boatman, !!bt.pole, !!bt.wake, !!bt.bowRing]),
    boat: dyn.boat ? (dyn.boats || []).indexOf(dyn.boat) : null,
    float: dyn.float ? [rootIndex(dyn.float.group), dyn.float.tassels.length, dyn.float.musicians.length] : null,
    people: (dyn.people || []).map((p) => [r4(p.s), p.role, r4(p.y), r4(p.phase), p.fare || null, rootIndex(p.group), p.arms.length, !!p.towel]),
    shoki: (dyn.shoki || []).map((o) => [rootIndex(o), plain(o.userData.pickup)]),
    treats: (dyn.treats || []).map((o) => [rootIndex(o), plain(o.userData.pickup)])
  };
  d.world = { keys: Object.keys(world).sort(), setView: typeof world.setView, update: typeof world.update };

  d.materials = {};
  for (const [m, name] of matNames) d.materials[name] = materialEntry(m);

  // update(): five fixed samples, in order (boats carry state between calls)
  d.update = [];
  const samples = [[0.5, 0, 0], [12.25, 0.3, 300], [40.5, 0.6, 480], [77.75, 0.9, 1031], [140, 1, 760]];
  const batches = [];
  root.traverse((o) => { if (o.userData && o.userData.spatialBatch && o.parent && o.parent.parent === root) batches.push(o); });
  for (const [t, night, s] of samples) {
    world.update(t, night, mods.physics.platOffset, level.platforms, s);
    const vis = new Hash(); let shown = 0;
    for (const bt of batches) { vis.int(bt.visible ? 1 : 0); if (bt.visible) shown++; }
    const tf = (o) => [...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray()].map(r4);
    const M = world.M;
    d.update.push([t, night, s, 'batches', shown, vis.hex()]);
    for (const bt of dyn.boats || []) d.update.push([t, 'boat', bt.plat, bt.group.visible, tf(bt.group), bt.wake.visible, r4(bt.wake.scale.x), tf(bt.boatman), tf(bt.pole), r4(bt.dir)]);
    if (dyn.float) {
      const f = dyn.float;
      d.update.push([t, 'float', f.group.visible, f.tassels.map((p) => [r4(p.rotation.x), r4(p.rotation.z)]), f.musicians.map((p) => [r4(p.rotation.z), r4(p.position.y)])]);
    }
    const ph = new Hash(); let seen = 0;
    for (const p of dyn.people || []) {
      ph.int(p.group.visible ? 1 : 0);
      if (!p.group.visible) continue;
      seen++;
      for (const o of [p.body, p.head, ...p.arms]) for (const v of [o.rotation.x, o.rotation.y, o.rotation.z]) ph.num(v);
      if (p.towel) ph.num(p.towel.rotation.z).num(p.towel.scale.y);
    }
    d.update.push([t, 'people', seen, ph.hex()]);
    d.update.push([t, 'glow', r4(M.lanternRed.emissiveIntensity), r4(M.lanternWhite.emissiveIntensity), r4(M.shoji.emissiveIntensity),
      r4(M.koshi.emissiveIntensity), r4(M.blossom.emissiveIntensity), r4(M.wake.opacity),
      r4(M.water.uniforms.uTime.value), r4(M.water.uniforms.uNight.value), r4(M.kamoWater.uniforms.uTime.value)]);
    d.update.push([t, 'shoki', (dyn.shoki || []).map((o) => r4(o.children[0].rotation.y))]);
  }
  return d;
}

// ----------------------------------------------------------------- routing ---
async function routingTest(mods, classic) {
  const { THREE } = mods;
  const out = { ran: false, ok: false, checks: [], problems: [] };
  const check = (name, ok, detail = '') => { out.checks.push([name, !!ok, detail]); if (!ok) out.problems.push(name + (detail ? ': ' + detail : '')); };
  const { defineAsset } = await import('../src/kit/contract.js?v=20261113a');
  const warnings = [];
  const runtime = new mods.runtime.AssetRuntime({
    THREE, assetSet: 'classic', search: '?swap=roof-kido:modular,roof-lantern-racks:modular,roof-bridge:modular', quality: 'high',
    loadFamilies: async () => ({}), fetchOverrides: async () => null,
    createMaterials: async () => ({ bind() { return this; }, setEnv() {}, list: () => [] }),
    logger: { warn: (m) => warnings.push(m) }
  });
  // The classic kido lights its lantern at (sMid, 1.9, d + 0.5), the rack at (sMid, 1.6, d + 0.3).
  const STANDINS = [{ id: 'roof-kido', type: 'kido', light: [1.9, 0.5] }, { id: 'roof-lantern-racks', type: 'rack', light: [1.6, 0.3] }];
  const built = [];
  for (const sd of STANDINS) {
    runtime.register(defineAsset({
      id: sd.id, family: 'roof-routing-test', tiers: ['hero', 'mid'],
      build(ctx, layout) {
        const d = layout.piece.d;
        const g = new ctx.THREE.Group();
        const post = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(0.2, 2.2, 0.2), ctx.MAT.timber);
        post.position.set(0, 1.1, d);
        const lamp = new ctx.THREE.Object3D();
        lamp.position.set(0, sd.light[0], d + sd.light[1]);
        const flag = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(0.4, 0.3), ctx.MAT.noren.indigo);
        flag.position.set(0, 2.0, d + 0.3);
        g.add(post, lamp, flag);
        built.push({ sd, layout, tier: ctx.tier, post, flag, mat: ctx.MAT });
        return { group: g, parts: { post, flag }, sockets: { light_lamp: lamp }, live: [flag], footprint: layout.footprint };
      }
    }));
  }
  const B = await instrumentedBuild(mods, runtime);
  out.ran = true;
  const d = digestBuild(mods, B);
  const routed = B.level.pieces.map((pc, i) => [pc, i]).filter(([pc]) => STANDINS.some((sd) => sd.type === pc.type));
  const legs = new Set();
  check('every kido and rack piece came from a stand-in kit asset', built.length === routed.length && routed.length > 0 &&
    runtime.instances.length === routed.length, `${built.length} built, ${runtime.instances.length} instances, ${routed.length} kido and rack pieces`);
  check('the stand-ins got the Roof Road material set and the hero tier', built.every((b) => b.mat === B.world.M && b.tier === 'hero'),
    [...new Set(built.map((b) => b.tier))].join(','));
  const seen = {};
  for (const [k, { sd, layout, post, flag }] of built.entries()) {
    const [pc] = routed[k];
    const index = seen[pc.type] = (seen[pc.type] ?? -1) + 1;
    const sm = (pc.s0 + pc.s1) / 2, p = B.level.rail.place(sm, pc.d), t = B.level.rail.tangentAt(sm);
    legs.add(Math.abs(t.z) > 0.9 ? (t.z > 0 ? '+z' : '-z') : Math.abs(t.x) > 0.9 ? (t.x > 0 ? '+x' : '-x') : 'turn');
    post.updateWorldMatrix(true, false);
    const w = post.getWorldPosition(new THREE.Vector3());
    check(`${pc.type} ${index}: ${sd.id} layout ${layout.index}, post stands in the classic frame`, pc.type === sd.type && layout.index === index &&
      Math.abs(w.x - p.x) < 1e-6 && Math.abs(w.y - 1.1) < 1e-6 && Math.abs(w.z - p.z) < 1e-6,
      `post ${w.toArray().map(r4)}, frame ${[p.x, 1.1, p.z].map(r4)}`);
    check(`${pc.type} ${index}: the live part is a root child, out of the merge`, flag.parent === B.world.root && !flag.userData.spatialBatch);
  }
  check('the stand-ins were placed on three or more leg directions', legs.size >= 3, [...legs].join(' '));
  check('the light sockets land on the classic lantern lights (lights identical)', JSON.stringify(d.lights) === JSON.stringify(classic.lights),
    `${d.lights.length} vs ${classic.lights.length}`);
  const routedIdx = new Set(routed.map(([, i]) => i));
  const others = d.pieces.filter((row) => !routedIdx.has(row[0]));
  const othersClassic = classic.pieces.filter((row) => !routedIdx.has(row[0]));
  const differ = others.filter((row, i) => JSON.stringify(row) !== JSON.stringify(othersClassic[i])).map((row) => `#${row[0]} ${row[1]}`);
  check('every other piece is identical to the classic build', differ.length === 0, differ.slice(0, 5).join(', '));
  check('the routed pieces did change', routed.every(([, i]) => JSON.stringify(d.pieces[i]) !== JSON.stringify(classic.pieces[i])));
  for (const sec of ['platforms', 'walls', 'ceilings', 'pickups', 'materials']) {
    check(`${sec} identical to the classic build`, JSON.stringify(d[sec]) === JSON.stringify(classic[sec]));
  }
  check('an unregistered ?swap id builds classic (roof-bridge)', runtime.setFor('roof-bridge') === 'modular' && !runtime.has('roof-bridge') &&
    routed.length === runtime.instances.length && !built.some((b) => b.layout.type === 'bridge'));
  check('no kit warning while routing', warnings.length === 0, warnings.join('; '));
  out.ok = out.problems.length === 0;
  out.routed = routed.length;
  out.legs = [...legs];
  return out;
}

// ------------------------------------------------------------- text + diff ---
function digestText(d) {
  const out = ['{'];
  const keys = Object.keys(d);
  keys.forEach((k, ki) => {
    const v = d[k], comma = ki < keys.length - 1 ? ',' : '';
    if (Array.isArray(v) && k !== 'format') {
      out.push(`  ${JSON.stringify(k)}: [`);
      v.forEach((e, i) => out.push('    ' + JSON.stringify(e) + (i < v.length - 1 ? ',' : '')));
      out.push('  ]' + comma);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(`  ${JSON.stringify(k)}: {`);
      const ks = Object.keys(v);
      ks.forEach((kk, i) => out.push('    ' + JSON.stringify(kk) + ': ' + JSON.stringify(v[kk]) + (i < ks.length - 1 ? ',' : '')));
      out.push('  }' + comma);
    } else out.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${comma}`);
  });
  out.push('}');
  return out.join('\n') + '\n';
}

function compare(gold, fresh) {
  const items = [], sections = {};
  const counts = { added: 0, removed: 0, changed: 0 };
  const push = (section, it) => {
    const s = (sections[section] ||= { added: 0, removed: 0, changed: 0 });
    const k = it.op === '+' ? 'added' : it.op === '-' ? 'removed' : 'changed';
    s[k]++; counts[k]++;
    if (items.length < MAX_STORED) items.push(it);
  };
  const keys = [...new Set([...Object.keys(gold), ...Object.keys(fresh)])];
  for (const sec of keys) {
    const a = gold[sec], b = fresh[sec];
    if (Array.isArray(a) && Array.isArray(b) && sec !== 'format') {
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) {
        const x = i < a.length ? JSON.stringify(a[i]) : undefined, y = i < b.length ? JSON.stringify(b[i]) : undefined;
        if (x === y) continue;
        if (x === undefined) push(sec, { op: '+', path: `${sec}[${i}]`, to: y });
        else if (y === undefined) push(sec, { op: '-', path: `${sec}[${i}]`, from: x });
        else push(sec, { op: '~', path: `${sec}[${i}]`, from: x, to: y });
      }
    } else if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])]) {
        const x = k in a ? JSON.stringify(a[k]) : undefined, y = k in b ? JSON.stringify(b[k]) : undefined;
        if (x === y) continue;
        if (x === undefined) push(sec, { op: '+', path: `${sec}.${k}`, to: y });
        else if (y === undefined) push(sec, { op: '-', path: `${sec}.${k}`, from: x });
        else push(sec, { op: '~', path: `${sec}.${k}`, from: x, to: y });
      }
    } else {
      const x = JSON.stringify(a), y = JSON.stringify(b);
      if (x !== y) push(sec, { op: a === undefined ? '+' : b === undefined ? '-' : '~', path: sec, from: x, to: y });
    }
  }
  const where = [];
  const firstPiece = items.find((it) => it.path.startsWith('pieces['));
  if (firstPiece) {
    const i = Number(firstPiece.path.match(/\[(\d+)\]/)[1]);
    const row = (fresh.pieces && fresh.pieces[i]) || (gold.pieces && gold.pieces[i]);
    where.push(`first piece to change: #${i} ${row ? row[1] + ' at s=' + row[2] : ''}`);
  }
  return { equal: counts.added + counts.removed + counts.changed === 0, counts, sections, items, where, truncated: items.length >= MAX_STORED };
}

// -------------------------------------------------------------------- page ---
const $ = (id) => document.getElementById(id);
const shorten = (s, n = 220) => (s && s.length > n ? s.slice(0, n) + '…' : s);

async function main() {
  const T0 = performance.now();
  const result = { done: false, ok: false, warnings: [] };
  const mods = await loadModules();
  const A = await instrumentedBuild(mods);
  const dA = digestBuild(mods, A);
  const B = await instrumentedBuild(mods);
  const dB = digestBuild(mods, B);
  const textA = digestText(dA), textB = digestText(dB);
  if (textA !== textB) {
    const dd = compare(dA, dB);
    result.warnings.push(`nondeterministic: ${dd.counts.changed + dd.counts.added + dd.counts.removed} entries differ between two builds (first: ${dd.items[0] && dd.items[0].path})`);
  }
  const iterated = A.per.length;
  if (iterated !== A.level.pieces.length) result.warnings.push(`piece attribution saw ${iterated} of ${A.level.pieces.length} pieces (buildWorld must iterate level.pieces with for…of)`);
  const unattributed = A.per.filter((list) => !list || !list.length).length;

  result.digestText = textA;
  result.digestBytes = textA.length;
  result.counts = {
    pieces: dA.pieces.length, adds: dA.pieces.reduce((n, p) => n + p[3].length, 0), emptyPieces: unattributed,
    platforms: dA.platforms.length, walls: dA.walls.length, ceilings: dA.ceilings.length, lights: dA.lights.length,
    root: dA.root.length, batches: dA.batches.length, materials: Object.keys(dA.materials).length,
    vertices: dA.batches.reduce((n, b) => n + b[3], 0)
  };
  result.assets = A.assets.summary();
  try { result.routing = await routingTest(mods, dA); }
  catch (error) { result.routing = { ran: false, ok: false, checks: [], problems: ['routing test threw: ' + String(error && error.stack || error).split('\n').slice(0, 3).join(' | ')] }; }
  result.ambient = { draws: ambient.draws };
  result.timing = { buildMs: [A.buildMs, B.buildMs], totalMs: 0 };

  // golden
  result.golden = { url: GOLDEN_URL, found: false };
  try {
    const res = await fetch(new URL(GOLDEN_URL, location.href), { cache: 'no-store' });
    result.golden.status = res.status;
    if (res.ok) {
      const text = await res.text();
      result.golden.bytes = text.length;
      result.golden.textEqual = text === textA;
      const gold = JSON.parse(text);
      if (!Array.isArray(gold.format) || gold.format[0] !== FORMAT) throw new Error('not a ' + FORMAT + ' file');
      result.golden.found = true;
      result.diff = compare(gold, dA);
      result.equal = result.diff.equal;
    }
  } catch (error) { result.golden.error = String(error.message || error); }

  result.timing.totalMs = Math.round(performance.now() - T0);
  result.ok = true;
  result.done = true;
  window.__rooftopGolden = result;
  render(result);
}

function render(r) {
  const st = $('status');
  if (!r.golden.found) { st.textContent = `digest ready; golden ${r.golden.status === 404 ? 'missing' : 'unusable'} (${GOLDEN_URL})`; st.className = 'failed'; }
  else if (r.equal) { st.textContent = 'EQUAL'; st.className = 'equal'; }
  else { st.textContent = `DIFFERENT (${r.diff.counts.changed} changed, ${r.diff.counts.added} added, ${r.diff.counts.removed} removed)`; st.className = 'different'; }
  $('golden').textContent = GOLDEN_URL;
  const c = r.counts;
  $('summary').textContent = [
    `pieces    ${c.pieces} (${c.adds} adds, ${c.emptyPieces} added nothing)`,
    `level     ${c.platforms} platforms · ${c.walls} walls · ${c.ceilings} ceilings`,
    `world     ${c.root} root children · ${c.batches} merged batches (${c.vertices} vertices) · ${c.lights} lights · ${c.materials} materials`,
    `assets    set ${r.assets.set} (chosen ${r.assets.chosen}${r.assets.explicit ? ', from ?assets=' : ''}) · swaps ${JSON.stringify(r.assets.swaps)} · kit instances ${r.assets.instances}`,
    `routing   ${r.routing.ran ? (r.routing.ok ? 'ok' : 'FAILED') + ` · ${r.routing.checks.filter((c) => c[1]).length}/${r.routing.checks.length} checks` : 'not run'}${r.routing.problems.length ? ' · ' + r.routing.problems.join('; ') : ''}`,
    `time      build ${r.timing.buildMs.join(' + ')} ms · page ${r.timing.totalMs} ms`,
    ...r.warnings.map((w) => `warning   ${w}`)
  ].join('\n');
  if (r.diff && !r.diff.equal) {
    const lines = [...r.diff.where, ''];
    for (const it of r.diff.items.slice(0, MAX_SHOWN)) {
      lines.push(it.op === '~' ? `~ ${it.path}\n    ${shorten(it.from)}\n →  ${shorten(it.to)}` : `${it.op} ${it.path}   ${shorten(it.op === '+' ? it.to : it.from)}`);
    }
    $('changes').textContent = lines.join('\n');
  }
  const a = $('download');
  a.href = URL.createObjectURL(new Blob([r.digestText], { type: 'application/json' }));
  a.hidden = false;
}

main().catch((error) => {
  window.__rooftopGolden = { done: true, ok: false, error: String((error && error.stack) || error) };
  $('status').textContent = 'failed: ' + window.__rooftopGolden.error;
  $('status').className = 'failed';
});
