// placeAsset test (lane f2-countryside-split; Integrator rulings R12 and R18).
//
//   node tools/headless.mjs /tools/place_asset_test.html --wait "window.__placeTest.done" --eval "__placeTest.lines"
//   (add ?per=1 to the page for one run per id; about a minute)
//
// Part A, footprint = classic: every placeAsset() call of the classic valley
//   is wrapped. What its classicFn registered itself (colliders, platforms,
//   exclusions, water rects, the Countryside lists, and every field it set),
//   leaving out what nested placeAsset calls registered, must equal
//   layout.footprint, with the mesh handles it set named in layout.bind.
// Part B, the modular path: the valley is built again with a runtime that
//   returns a fake AssetInstance for every id (an empty group, parts made on
//   demand, footprint = layout.footprint, as the runtime defaults it). Its
//   registrations must equal the classic valley's, and the seeded stream must
//   stop at the same draw. ?per=1 repeats Part B one id at a time, so classic
//   parents hold kit children and kit parents hold classic children.
// No real kit asset is registered; the page changes no game file.

const params = new URLSearchParams(location.search);
let THREE, Countryside;

// Math.random is seeded per build (the dawn mist, nest eggs and offering bells
// draw from it); three.js UUIDs draw from a stream of their own, so a fake
// build that makes fewer objects still hands the builders the same values.
function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ambient = { game: mulberry32(1), uuid: mulberry32(2) };
Math.random = function random() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 3;
  const fromUUID = String(new Error().stack).indexOf('generateUUID') !== -1;
  Error.stackTraceLimit = limit;
  return fromUUID ? ambient.uuid() : ambient.game();
};
function build(options) {
  ambient.game = mulberry32(0x0a11ce5);
  return new Countryside(new THREE.Scene(), options);
}

const LISTS = ['lanterns', 'collectibles', 'toroSpots', 'lanternHalos', 'bambooFences', 'villageHouseColliders.left',
  'villageHouseColliders.right', 'offeringBells', 'paddyWaterMaterials', 'ripples', 'rainRipples', 'mists', 'dawnMists',
  'shrineThicketTrees', 'shrineThicketBushes', 'bushColliderSpots'];
const REGISTRIES = { colliders: 'colliders', platforms: 'platforms', vegetationExclusions: 'exclusions', waterRects: 'waterRects' };
// Caches and counters a builder may set that are not registrations
const INTERNAL = new Set(['_layoutCounts', '_villageHouseCount', '_toroCount', '_bakedCount', '_cobbleMat', '_cobbleWorldMat',
  'riverUniforms', '_riverBed', 'pathSamplesPreview', 'assetInstances']);
const SKIP_FIELD = (k) => k in REGISTRIES || LISTS.some((p) => p.split('.')[0] === k);
// Fields the classic builders set that Part B compares (the golden's anchors plus the update-time handles)
const FIELDS = ['napSpotPos', 'nestPos', 'secretKeyPos', 'mistAltarPos', 'chimePos', 'toriiTopPos', 'secretDoorWorldPos',
  'secretDoorSpawnPos', 'secretDoorOutHeading', 'boundaryRadius', 'secretKeyMesh', 'secretDoorMesh', 'lockPlate', 'fishMesh',
  'nestMesh', 'nestFeatherMesh', 'corralRewardMesh', 'shishiRocker', 'mistAltar', 'windChime', 'groundMesh', 'edgeForestTrunks',
  'corralGuardian', 'pathSamples', 'riverSamples', 'riverCurve', 'riverMat', 'bridgeDeckWaterClearance',
  'bridgeRampWaterExclusions', 'matHazeFar', 'matHazeMid', 'villageWindowMat', 'bushMat', 'chimeClapperMat', '_altarFadeMats',
  'mistAltarTouched', 'chimeSway', 'rainDropAccum'];

const getPath = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);

function sig(v) {
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  if (typeof v === 'function') return 'fn';
  if (v === null || v === undefined || typeof v !== 'object') return v;
  if (v.isVector3) return ['v', sig(v.x), sig(v.y), sig(v.z)];
  if (v.isBox3) return ['b', ...[v.min.x, v.min.y, v.min.z, v.max.x, v.max.y, v.max.z].map(sig)];
  if (v.isObject3D) return 'obj' + (v.userData && v.userData.id !== undefined ? '#' + v.userData.id : '');
  if (v.isMaterial) return 'mat';
  if (typeof v.$part === 'string') {
    if (/\.material$/.test(v.$part)) return 'mat';
    return 'obj' + (v.userData && v.userData.id !== undefined ? '#' + v.userData.id : '');
  }
  if (Array.isArray(v)) return v.map(sig);
  if (Object.getPrototypeOf(v) !== Object.prototype) return 'inst:' + (v.constructor && v.constructor.name);
  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = sig(v[k]);
  return out;
}
const same = (a, b) => JSON.stringify(sig(a)) === JSON.stringify(sig(b));

// ---------------------------------------------------------------- platforms

const platformInfo = new WeakMap();
function trackPlatformHelpers(proto) {
  const oriented = proto.addOrientedPlatform, sloped = proto.addSlopedRoofPlatforms;
  proto.addOrientedPlatform = function (parent, bounds, topY, options) {
    const out = oriented.apply(this, arguments);
    if (out) platformInfo.set(out, { kind: 'oriented', args: [bounds, topY, options], frame: parent.matrixWorld.elements.map(sig) });
    return out;
  };
  proto.addSlopedRoofPlatforms = function (parent, roofY, w, d, ridgeH, overhang, options) {
    const start = this.platforms.length;
    const out = sloped.apply(this, arguments);
    const info = { kind: 'sloped', args: [roofY, w, d, ridgeH, overhang, options], frame: parent.matrixWorld.elements.map(sig) };
    for (const p of this.platforms.slice(start)) platformInfo.set(p, info);
    return out;
  };
}
function probe(pf) {
  const hits = [];
  for (let x = -60; x <= 60; x += 0.5) {
    for (let z = -60; z <= 60; z += 0.5) {
      const h = pf.getHeightAt(x, z, 0);
      if (h !== null && h !== undefined) hits.push([x, z, sig(h)]);
    }
  }
  return ['probe', hits.length, JSON.stringify(hits).length, hits[0], hits[hits.length - 1]];
}
/** The platforms a classic registry holds, one entry per helper call (a sloped roof is one call, two platforms). */
function platformSigs(list) {
  const out = [];
  let last = null;
  for (const p of list) {
    if (p && p.isBox3) { out.push(sig(p)); last = null; continue; }
    const info = platformInfo.get(p);
    if (info) {
      if (info !== last) out.push([info.kind, sig(normalArgs(info.args)), info.frame]);
      last = info;
      continue;
    }
    out.push(probe(p));
    last = null;
  }
  return out;
}
const normalArgs = (args) => { const a = args.slice(); while (a.length && a[a.length - 1] === undefined) a.pop(); return a; };
function layoutFrame(layout) {
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(layout.x || 0, layout.y || 0, layout.z || 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(layout.rx || 0, layout.ry || 0, layout.rz || 0)),
    new THREE.Vector3(1, 1, 1).multiplyScalar(layout.scale || 1));
  const parent = layout.parent;
  if (parent) { parent.updateWorldMatrix(true, false); return new THREE.Matrix4().multiplyMatrices(parent.matrixWorld, local); }
  return local;
}
function footprintPlatformSigs(fp, layout) {
  return (fp.platforms || []).map((p) => {
    if (p && p.isBox3) return sig(p);
    if (p && (p.oriented || p.sloped)) {
      return [p.oriented ? 'oriented' : 'sloped', sig(normalArgs(p.oriented || p.sloped)), layoutFrame(layout).elements.map(sig)];
    }
    return probe(p);
  });
}

// ----------------------------------------------------------------- Part A

const claimed = new WeakSet();
const stack = [];
const A = { active: false, placements: 0, ids: [], problems: [], exactColliders: 0, colliders: 0 };

function snapshot(city) {
  const regs = {}, lists = {}, fields = new Map();
  for (const k of Object.keys(REGISTRIES)) regs[k] = { arr: city[k], len: (city[k] || []).length };
  for (const p of LISTS) { const a = getPath(city, p); lists[p] = { arr: a, len: a ? a.length : 0 }; }
  for (const k of Object.keys(city)) if (!SKIP_FIELD(k)) fields.set(k, snapVal(city[k]));
  return { regs, lists, fields };
}
const snapVal = (v) => (v && v.isVector3 ? 'v' + v.x + ',' + v.y + ',' + v.z : v);
function added(cur, before) {
  if (!cur) return [];
  return (cur === before.arr ? cur.slice(before.len) : cur.slice()).filter((x) => !(x && typeof x === 'object' && claimed.has(x)));
}

function checkPlacement(city, id, layout, before, frame) {
  const where = `${id}${layout && layout.name ? ` "${layout.name}"` : ''}`;
  const problem = (msg) => A.problems.push(`${where}: ${msg}`);
  const own = { regs: {}, lists: {}, fields: [] };
  for (const k of Object.keys(REGISTRIES)) own.regs[k] = added(city[k], before.regs[k]);
  for (const p of LISTS) own.lists[p] = added(getPath(city, p), before.lists[p]);
  for (const k of Object.keys(city)) {
    if (SKIP_FIELD(k) || frame.nestedFields.has(k)) continue;
    if (!before.fields.has(k) || before.fields.get(k) !== snapVal(city[k])) own.fields.push(k);
  }
  for (const k of Object.keys(own.regs)) for (const x of own.regs[k]) if (x && typeof x === 'object') claimed.add(x);
  for (const p of LISTS) for (const x of own.lists[p]) if (x && typeof x === 'object') claimed.add(x);
  if (stack.length) {
    const up = stack[stack.length - 1].nestedFields;
    for (const f of own.fields.concat([...frame.nestedFields])) up.add(f);
  }
  const fp = layout && layout.footprint;
  if (!fp) { problem('layout has no footprint'); return; }
  // colliders, with exactness
  if (!same(own.regs.colliders, fp.colliders || [])) {
    problem(`colliders differ: classic ${own.regs.colliders.length}, footprint ${(fp.colliders || []).length}` +
      firstDiff(own.regs.colliders.map(sig), (fp.colliders || []).map(sig)));
  } else {
    own.regs.colliders.forEach((b, i) => {
      const f = fp.colliders[i];
      A.colliders++;
      if (b.min.equals(f.min) && b.max.equals(f.max)) A.exactColliders++;
    });
  }
  const pc = platformSigs(own.regs.platforms), pf = footprintPlatformSigs(fp, layout);
  if (JSON.stringify(pc) !== JSON.stringify(pf)) problem(`platforms differ: classic ${pc.length}, footprint ${pf.length}` + firstDiff(pc, pf));
  if (!same(own.regs.vegetationExclusions, fp.exclusions || [])) problem('exclusions differ');
  if (!same(own.regs.waterRects, fp.waterRects || [])) problem('water rects differ');
  const fpLists = fp.lists || {};
  for (const p of new Set([...LISTS, ...Object.keys(fpLists)])) {
    const mine = own.lists[p] || (getPath(city, p) || []);
    if (!LISTS.includes(p)) { problem(`footprint list ${p} is not one the test tracks`); continue; }
    if (!same(mine, fpLists[p] || [])) problem(`list ${p} differs: classic ${mine.length}, footprint ${(fpLists[p] || []).length}` + firstDiff(sig(mine), sig(fpLists[p] || [])));
  }
  const anchors = fp.anchors || {}, bind = (layout && layout.bind) || {};
  for (const f of own.fields) {
    if (INTERNAL.has(f)) continue;
    if (f in anchors) {
      if (!same(city[f], anchors[f])) problem(`anchor ${f} differs: ${JSON.stringify(sig(city[f])).slice(0, 120)} vs ${JSON.stringify(sig(anchors[f])).slice(0, 120)}`);
    } else if (f in bind) {
      const v = city[f];
      if (!(v && (v.isObject3D || v.isMaterial))) problem(`bound field ${f} is not an object in classic`);
    } else problem(`classic sets ${f}, which the footprint does not declare`);
  }
  for (const f of Object.keys(anchors)) if (!own.fields.includes(f) && !INTERNAL.has(f)) problem(`footprint anchor ${f} is not set by the classic builder`);
  for (const f of Object.keys(bind)) if (!own.fields.includes(f)) problem(`bind ${f} is not set by the classic builder`);
}

function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = JSON.stringify(a[i]), y = JSON.stringify(b[i]);
    if (x !== y) return ` — first at [${i}]: ${String(x).slice(0, 160)} vs ${String(y).slice(0, 160)}`;
  }
  return '';
}

function wrapPlaceAsset(proto) {
  const place = proto.placeAsset;
  proto.placeAsset = function (id, layout, classicFn) {
    if (!A.active) return place.call(this, id, layout, classicFn);
    A.placements++;
    if (!A.ids.includes(id)) A.ids.push(id);
    const before = snapshot(this);
    const frame = { nestedFields: new Set() };
    stack.push(frame);
    let out;
    try { out = place.call(this, id, layout, classicFn); } finally { stack.pop(); }
    checkPlacement(this, id, layout, before, frame);
    return out;
  };
}

// ----------------------------------------------------------------- Part B

function fakeInstance(layout) {
  const group = new THREE.Group();
  group.material = new THREE.MeshBasicMaterial();
  const made = {};
  const parts = new Proxy(made, {
    get(t, k) {
      if (typeof k !== 'string') return undefined;
      if (!t[k]) {
        const o = new THREE.Group();
        o.name = 'fake:' + k;
        o.material = new THREE.MeshBasicMaterial();
        group.add(o);
        t[k] = o;
      }
      return t[k];
    }
  });
  return { group, parts, sockets: {}, footprint: layout.footprint, live: [], dispose() {} };
}
function fakeRuntime(want) {
  return { build: (id, layout, classicFn) => (want(id) ? fakeInstance(layout) : classicFn()), update() {}, instances: [] };
}

function digest(city) {
  const field = (f) => (f === 'doorCollider' ? city.colliders.indexOf(city.doorCollider) : sig(city[f]));
  return {
    colliders: city.colliders.map(sig),
    platforms: platformSigs(city.platforms),
    exclusions: sig(city.vegetationExclusions),
    water: sig(city.waterRects),
    lists: Object.fromEntries(LISTS.map((p) => [p, sig(getPath(city, p) || [])])),
    fields: Object.fromEntries(FIELDS.concat('doorCollider').map((f) => [f, field(f)])),
    stream: sig(city.rng())
  };
}
function compareDigests(a, b) {
  const out = [];
  for (const k of Object.keys(a)) {
    const x = a[k], y = b[k];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    if (Array.isArray(x)) out.push(`${k}: ${x.length} vs ${y.length}${firstDiff(x, y)}`);
    else if (x && typeof x === 'object') {
      for (const s of Object.keys(x)) {
        if (JSON.stringify(x[s]) !== JSON.stringify(y[s])) out.push(`${k}.${s}: ${JSON.stringify(x[s]).slice(0, 140)} vs ${JSON.stringify(y[s]).slice(0, 140)}`);
      }
    } else out.push(`${k}: ${x} vs ${y}`);
  }
  return out;
}

// -------------------------------------------------------------------- run

async function main() {
  const t0 = performance.now();
  THREE = await import('three');
  ({ Countryside } = await import('../src/countryside.js?v=20261107a'));
  trackPlatformHelpers(Countryside.prototype);
  wrapPlaceAsset(Countryside.prototype);

  A.active = true;
  const classic = build();
  A.active = false;
  const base = digest(classic);

  const B = { all: [], per: {} };
  const kit = build({ assets: fakeRuntime(() => true) });
  B.all = compareDigests(base, digest(kit));
  B.kitInstances = kit.assetInstances.length;
  if (params.get('per') === '1') {
    for (const id of A.ids) {
      const one = build({ assets: fakeRuntime((x) => x === id) });
      const d = compareDigests(base, digest(one));
      if (d.length) B.per[id] = d;
    }
  }

  const ok = !A.problems.length && !B.all.length && !Object.keys(B.per).length;
  const lines = [
    `placeAsset test: ${ok ? 'PASS' : 'FAIL'}`,
    `A  ${A.placements} placements of ${A.ids.length} ids; ${A.problems.length} footprint problems; colliders ${A.exactColliders}/${A.colliders} bit-exact`,
    ...A.problems.slice(0, 40).map((p) => '   ' + p),
    `B  all ids fake: ${B.kitInstances} kit instances; ${B.all.length ? B.all.length + ' differences' : 'registrations equal the classic valley'}`,
    ...B.all.slice(0, 20).map((p) => '   ' + p)
  ];
  if (params.get('per') === '1') {
    const bad = Object.keys(B.per);
    lines.push(`B  one id at a time: ${A.ids.length - bad.length}/${A.ids.length} equal`);
    for (const id of bad) lines.push(`   ${id}: ${B.per[id].slice(0, 3).join(' | ')}`);
  }
  lines.push(`time ${Math.round(performance.now() - t0)} ms`);
  window.__placeTest = { done: true, ok, ids: A.ids, problems: A.problems, modular: B, lines };
  document.getElementById('status').textContent = ok ? 'PASS' : 'FAIL';
  document.getElementById('status').className = ok ? 'pass' : 'fail';
  document.getElementById('out').textContent = lines.join('\n');
}

main().catch((error) => {
  const message = String((error && error.stack) || error);
  window.__placeTest = { done: true, ok: false, error: message, lines: ['placeAsset test: ERROR', message] };
  document.getElementById('status').textContent = 'failed: ' + message;
  document.getElementById('status').className = 'fail';
});
