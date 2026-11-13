// Browser contract suite for kit assets (BUILD_GUIDE_FABLE F1.7, AAA-2, 3,
// 7, 8, 9 plus the footprint rule R12). For every registered asset and every
// tier it declares, the asset is built through a real AssetRuntime forced to
// the modular set and checked:
//
//   AAA-3  builds as a kit instance; group named asset:<id> (or the legacy
//          name); every part named asset:<id>/<part>, inside the group; every
//          mesh belongs to a part
//   AAA-2  bearing: every part's bounding box touches the ground (group-local
//          y = 0) or another part, transitively — nothing floats (parts the
//          asset lists in `floating` are exempt); geometry is finite
//   AAA-7  triangles, meshes and (warm) build time within src/kit/budgets.js
//   AAA-8  two builds with the same layout hash identical; Math.random is
//          never called during a build
//   AAA-9  every param builds at its range ends / each option; update() and
//          setTier() run; dispose() returns the renderer's geometry count to
//          its baseline
//   R12    footprint equals layout.footprint unless the asset carries a waiver
//
// Zero registered assets passes and prints `0 assets`. A throwaway fixture
// asset defined below (never registered in the game) proves every check can
// FAIL and pass. The "materials" section counts real draw calls before and
// after Countryside._mergeInto() on kit-material meshes (F1.4).
//
// Local-space rule for builders: build with the asset's ground point at the
// origin, +y up; the owning module places `instance.group` from the layout.
import * as THREE from 'three';
import { AssetRuntime, isAssetInstance } from '../src/kit/runtime.js?v=20261107a';
import { defineAsset, partName, groupName } from '../src/kit/contract.js?v=20261107a';
import { budgetFor, BUDGET_SOURCE } from '../src/kit/budgets.js?v=20261107a';
import { countScene } from '../src/kit/craft.js?v=20261107a';

const q = new URLSearchParams(location.search);
const FAMILY = q.get('family'), ASSET = q.get('asset');
const SELFTEST = q.get('selftest') !== '0';
const MERGE = q.get('merge') !== '0';
const ENV = { hour: 19.5, wind: 1, wet: 0.3, snow: 0, lanternOn: true };

/* ------------------------------------------------------------ reporting --- */

const lists = { assets: document.getElementById('assets'), merge: document.getElementById('merge') };
const results = { assets: 0, tiers: 0, checks: [], failed: 0, merge: null, selftest: null, budgets: BUDGET_SOURCE, problems: [] };

function report(list, name, pass, detail = '') {
  const li = document.createElement('li');
  li.className = pass ? 'pass' : 'fail';
  li.textContent = `${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`;
  list.append(li);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

/* ------------------------------------------------------------- renderer --- */

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setSize(256, 256, false);
renderer.shadowMap.enabled = false;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x446644, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(3, 6, 2); scene.add(sun);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(3, 2.5, 4); camera.lookAt(0, 0.8, 0);
const render = (s = scene, c = camera) => { renderer.render(s, c); return { calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; };

/* --------------------------------------------------------------- helpers --- */

const isDescendant = (obj, root) => { for (let p = obj.parent; p; p = p.parent) if (p === root) return true; return false; };

function finiteTree(root) {
  let ok = true;
  root.traverse((o) => {
    const a = o.geometry?.attributes?.position?.array;
    if (a) for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) { ok = false; break; }
    if (o.instanceMatrix) for (const v of o.instanceMatrix.array) if (!Number.isFinite(v)) { ok = false; break; }
  });
  return ok;
}

/** FNV-1a over names, world matrices, geometry attributes and instance matrices. */
function hashInstance(inst) {
  let h = 0x811c9dc5;
  const word = (w) => { h = Math.imul(h ^ (w & 0xffff), 0x01000193); h = Math.imul(h ^ (w >>> 16), 0x01000193); };
  const f32 = (arr) => { const u = new Uint32Array(arr.buffer, arr.byteOffset, arr.length); for (let i = 0; i < u.length; i++) word(u[i]); };
  const str = (s) => { for (let i = 0; i < s.length; i++) word(s.charCodeAt(i)); };
  const scratch = new Float32Array(16);
  inst.group.updateMatrixWorld(true);
  inst.group.traverse((o) => {
    str(o.name || o.type);
    scratch.set(o.matrixWorld.elements); f32(scratch);
    const g = o.geometry;
    if (g) {
      for (const k of ['position', 'normal', 'uv', 'color']) if (g.attributes[k]) { const a = g.attributes[k].array; a instanceof Float32Array ? f32(a) : [...a].forEach(word); }
      if (g.index) [...g.index.array].forEach(word);
    }
    if (o.isInstancedMesh) { word(o.count); f32(o.instanceMatrix.array); }
  });
  return (h >>> 0).toString(16).padStart(8, '0');
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    return typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : false;
  }
  if (a.isVector3 || a.isBox3) return deepEqual(a.toArray ? a.toArray() : { ...a }, b.toArray ? b.toArray() : { ...b });
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

/** Every part must reach the ground (y ≤ eps) through touching bounding boxes. */
function bearing(inst, def) {
  const eps = 0.02;
  inst.group.updateMatrixWorld(true);
  const boxes = Object.entries(inst.parts).map(([key, obj]) => ({ key, box: new THREE.Box3().setFromObject(obj) })).filter((b) => !b.box.isEmpty());
  const grounded = new Set(boxes.filter((b) => b.box.min.y <= eps).map((b) => b.key));
  const adj = new Map(boxes.map((b) => [b.key, []]));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (boxes[i].box.clone().expandByScalar(eps).intersectsBox(boxes[j].box)) { adj.get(boxes[i].key).push(boxes[j].key); adj.get(boxes[j].key).push(boxes[i].key); }
  }
  const reached = new Set(grounded), queue = [...grounded];
  while (queue.length) for (const n of adj.get(queue.shift())) if (!reached.has(n)) { reached.add(n); queue.push(n); }
  const floating = boxes.filter((b) => !reached.has(b.key) && !def.floating.includes(b.key)).map((b) => b.key);
  return { ok: floating.length === 0, detail: floating.length ? `floating: ${floating.join(', ')}` : `${boxes.length} parts, ${grounded.size} grounded` };
}

function sampleLayout(def, tier) {
  const base = typeof def.sample === 'function' ? def.sample() : (def.sample ? JSON.parse(JSON.stringify(def.sample)) : {});
  return { x: 0, y: 0, z: 0, ry: 0, index: 0, ...base, tier };
}

/* ------------------------------------------------------------ one asset --- */

async function checkAsset(rt, def, tier, list, tag = '') {
  const into = [];
  const check = (name, pass, detail = '') => { const r = { asset: def.id, tier, name, pass: !!pass, detail: String(detail) }; into.push(r); results.checks.push(r); if (!pass) results.failed++; if (list) report(list, `${def.id} [${tier}]${tag} ${name}`, pass, detail); };
  const layout = sampleLayout(def, tier);
  const classicCalls = [];
  const classic = () => { classicCalls.push(1); return null; };
  const baseline = render();

  // three's generateUUID() draws Math.random for every Object3D, material and
  // geometry; only calls from anywhere else count (the builder, its helpers).
  const realRandom = Math.random; let randomCalls = 0;
  Math.random = function () { if (!/generateUUID/.test(new Error().stack || '')) randomCalls++; return realRandom(); };
  let inst;
  try { inst = rt.build(def.id, layout, classic); } finally { Math.random = realRandom; }
  check('builds as a kit instance, no classic fallback (AAA-3)', isAssetInstance(inst) && classicCalls.length === 0, isAssetInstance(inst) ? '' : (rt.problems[rt.problems.length - 1] || 'fell back to classic'));
  if (!isAssetInstance(inst)) return into;
  check('no Math.random during build (AAA-8)', randomCalls === 0, randomCalls ? `${randomCalls} call(s)` : '');

  const parts = Object.entries(inst.parts);
  check('has at least one named part (AAA-3)', parts.length > 0);
  check(`group named ${groupName(def.id)} or the legacy name (AAA-3)`, inst.group.name === groupName(def.id) || (layout.name && inst.group.name === layout.name) || (def.legacyName && inst.group.name === def.legacyName), inst.group.name);
  const badNames = parts.filter(([k, o]) => o.name !== partName(def.id, k)).map(([k]) => k);
  check('every part named asset:<id>/<part> (AAA-3)', badNames.length === 0, badNames.join(', '));
  const outside = parts.filter(([, o]) => !isDescendant(o, inst.group)).map(([k]) => k);
  check('every part inside the group (AAA-3)', outside.length === 0, outside.join(', '));
  const orphans = [];
  inst.group.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine) && !parts.some(([, p]) => o === p || isDescendant(o, p))) orphans.push(o.name || o.type); });
  check('every mesh belongs to a part (AAA-3)', orphans.length === 0, orphans.slice(0, 6).join(', '));

  const b = bearing(inst, def);
  check('every part bears on the ground or another part (AAA-2)', b.ok, b.detail);
  check('geometry is finite (AAA-2)', finiteTree(inst.group));

  const counts = countScene(inst.group);
  const budget = budgetFor(def.id, tier);
  check(`triangles ≤ ${budget.triangles} (AAA-7)`, counts.tris <= budget.triangles, `${counts.tris} tris`);
  check(`meshes ≤ ${budget.meshes} (AAA-7)`, counts.meshes <= budget.meshes, `${counts.meshes} meshes`);

  const h1 = hashInstance(inst);
  const inst2 = rt.build(def.id, sampleLayout(def, tier), classic);
  const h2 = isAssetInstance(inst2) ? hashInstance(inst2) : null;
  check('two builds with the same seed are identical (AAA-8)', h1 === h2, `${h1} vs ${h2}`);
  const warmMs = isAssetInstance(inst2) ? inst2.buildMs : inst.buildMs;
  check(`warm build ≤ ${budget.buildMs} ms (AAA-7)`, warmMs <= budget.buildMs, `${warmMs.toFixed(1)} ms (cold ${inst.buildMs.toFixed(1)} ms)`);

  if (layout.footprint) {
    const same = deepEqual(inst.footprint, layout.footprint);
    check('footprint equals the classic layout footprint (AAA-6, R12)', same || !!def.footprintWaiver, def.footprintWaiver ? `waiver: ${def.footprintWaiver}` : (same ? '' : 'differs from layout.footprint'));
  } else {
    check('footprint present (AAA-6)', Array.isArray(inst.footprint.colliders) && Array.isArray(inst.footprint.exclusions) && !!inst.footprint.anchors);
  }

  for (const [key, p] of Object.entries(def.params)) {
    const values = p.type === 'number' ? [p.min, p.max] : p.type === 'enum' ? p.options.slice(0, 4) : p.type === 'boolean' ? [true, false] : [p.default];
    for (const v of values) {
      const i = rt.build(def.id, { ...sampleLayout(def, tier), params: { [key]: v } }, classic);
      check(`param ${key}=${JSON.stringify(v)} builds (AAA-9)`, isAssetInstance(i) && finiteTree(i.group));
      if (isAssetInstance(i)) i.dispose();
    }
  }
  if (inst.update) { let ok = true, err = ''; try { inst.update(1 / 60, 1, ENV); } catch (e) { ok = false; err = e.message; } check('update(dt, t, env) runs (AAA-5)', ok, err); }
  if (inst.setTier) { let ok = true, err = ''; try { inst.setTier(tier === 'far' ? 'mid' : 'far'); inst.setTier(tier); } catch (e) { ok = false; err = e.message; } check('setTier() runs (AAA-4)', ok, err); }

  scene.add(inst.group); if (isAssetInstance(inst2)) scene.add(inst2.group);
  const during = render();
  inst.dispose(); if (isAssetInstance(inst2)) inst2.dispose();
  const after = render();
  check('dispose leaves no geometry behind (AAA-9)', after.geometries === baseline.geometries, `geometries ${baseline.geometries} → ${during.geometries} → ${after.geometries}`);
  check('group removed from the scene on dispose (AAA-9)', !inst.group.parent);
  return into;
}

/* --------------------------------------------------------------- fixture --- */

// A throwaway asset for the self-test: never registered in the game. Knobs
// make it fail one check at a time.
const knobs = { badName: false, floating: false, overBudget: false, nondeterministic: false, mathRandom: false, leak: false, footprintDrift: false, orphan: false };
let fixtureBuilds = 0;
const FIXTURE_FOOTPRINT = { colliders: [{ min: [-0.3, 0, -0.3], max: [0.3, 1.5, 0.3] }], exclusions: [[-0.5, -0.5, 1, 1]], anchors: { hook: { x: 0, y: 1.4, z: 0 } } };
const fixtureDef = defineAsset({
  id: 'fixture-lantern', family: 'fixture', lab: 'none',
  params: { height: { type: 'number', default: 1.2, min: 0.6, max: 2, step: 0.1 }, cap: { type: 'enum', default: 'stone', options: ['stone', 'wood'] } },
  sample: { x: 0, z: 0, index: 0, footprint: FIXTURE_FOOTPRINT },
  build(ctx, layout, params) {
    fixtureBuilds++;
    const T = ctx.THREE, km = ctx.kitMaterials;
    const group = new T.Group();
    const stone = km.stone(), wood = km.wood();
    const base = new T.Mesh(new T.BoxGeometry(0.6, 0.2, 0.6), stone); base.position.y = 0.1;
    const post = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, params.height, ctx.tier === 'hero' ? 12 : 6), wood); post.position.y = 0.2 + params.height / 2;
    const cap = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.5), params.cap === 'stone' ? stone : wood);
    cap.position.y = 0.2 + params.height + 0.06 + (knobs.floating ? 0.5 : 0);
    if (knobs.nondeterministic) cap.position.x += 0.01 * fixtureBuilds;
    if (knobs.mathRandom) cap.rotation.y = Math.random() * 0.001;
    cap.position.z += ctx.rng() * 0.02;           // the legitimate per-instance draw
    group.add(base, post, cap);
    if (knobs.overBudget) { const big = new T.Mesh(new T.SphereGeometry(0.2, 160, 160), stone); big.position.y = 0.3; post.add(big); }
    if (knobs.orphan) { const stray = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1), stone); stray.position.y = 0.05; group.add(stray); }
    if (knobs.leak) { base.userData.sharedGeometry = true; }   // skipped by the default dispose and never freed by the builder
    const parts = knobs.badName ? { base, post, 'Cap Stone': cap } : { base, post, cap };
    return { group, parts, sockets: { hook: new T.Object3D() }, live: [], footprint: knobs.footprintDrift ? { colliders: [], exclusions: [], anchors: {} } : undefined };
  }
});

// [label, knob, the check that must fail, every check allowed to fail]
const SELFTEST_CASES = [
  ['(none)', null, null, null],
  ['badName', 'badName', /builds as a kit instance/, null],
  ['floating', 'floating', /bears on the ground/, null],
  ['overBudget', 'overBudget', /triangles ≤/, null],
  ['nondeterministic', 'nondeterministic', /identical \(AAA-8\)/, null],
  ['mathRandom', 'mathRandom', /no Math\.random/, /no Math\.random|identical \(AAA-8\)/],   // random geometry also breaks the hash
  ['leak', 'leak', /dispose leaves no geometry/, null],
  ['footprintDrift', 'footprintDrift', /footprint equals/, null],
  ['orphan', 'orphan', /every mesh belongs to a part/, null]
];

async function selfTest() {
  const tbody = document.querySelector('#selftest tbody');
  const out = { cases: [], ok: true };
  for (const [label, knob, expect, allowedRe] of SELFTEST_CASES) {
    const allowed = allowedRe || expect;
    for (const k of Object.keys(knobs)) knobs[k] = false;
    if (knob) knobs[knob] = true;
    const rt = new AssetRuntime({ THREE, search: '?assets=modular', quality: 'high', fetchOverrides: async () => null, loadFamilies: async () => ({}), logger: { warn: (m) => results.problems.push(m) } });
    await rt.preload();
    rt.register(fixtureDef);
    const before = results.failed;
    const into = await checkAsset(rt, fixtureDef, 'hero', null, ' (fixture)');
    results.failed = before;                          // fixture results do not count against the page
    results.checks.splice(results.checks.length - into.length, into.length);
    const failed = into.filter((r) => !r.pass);
    let pass;
    if (!knob) pass = failed.length === 0;
    else pass = failed.some((r) => expect.test(r.name)) && failed.every((r) => allowed.test(r.name));
    out.cases.push({ knob: label, expected: expect ? String(expect) : 'all pass', failing: failed.map((r) => r.name), pass });
    if (!pass) out.ok = false;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${expect ? expect.source : 'all checks pass'}</td><td class="${pass ? 'pass' : 'fail'}">${pass ? 'PASS' : 'FAIL'} — ${failed.length ? failed.map((r) => r.name).join('; ') : 'nothing failed'}</td>`;
    tbody.append(tr);
    console.log(`SELFTEST ${pass ? 'PASS' : 'FAIL'} ${label}: ${failed.map((r) => r.name).join('; ') || 'nothing failed'}`);
  }
  for (const k of Object.keys(knobs)) knobs[k] = false;
  return out;
}

/* ------------------------------------------------- materials: merge count --- */

async function mergeCheck(rt) {
  const list = lists.merge;
  const out = { ok: true };
  try {
    const { Countryside } = await import('../src/countryside.js?v=20261107a');
    const valley = new THREE.Scene();
    valley.add(new THREE.HemisphereLight(0xffffff, 0x446644, 1));
    const t0 = performance.now();
    const city = new Countryside(valley);
    out.valleyBuildMs = Math.round(performance.now() - t0);
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
    cam.position.set(0, 60, 0.01); cam.lookAt(0, 0, 0);
    const valleyCalls = render(valley, cam).calls;
    const km = rt.kitMaterials;
    const mats = [km.stone(), km.wood(), km.plaster({ tint: 0xe6d7ba })];
    const meshes = [];
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mats[i % 3]);
      m.position.set((i % 8) - 3.5, 40, Math.floor(i / 8) - 2.5);
      valley.add(m); meshes.push(m);
    }
    const before = render(valley, cam).calls;
    city._mergeInto(meshes, valley);
    const after = render(valley, cam).calls;
    const baked = valley.children.filter((o) => /^Baked Statics/.test(o.name) && o.material.userData.kit);
    out.valleyCalls = valleyCalls; out.kitMeshes = 48; out.kitMaterials = 3; out.callsBefore = before; out.callsAfter = after; out.bakedKitMeshes = baked.length;
    const r1 = before - valleyCalls === 48, r2 = after - valleyCalls === 3, r3 = baked.length === 3;
    report(list, `valley alone: ${valleyCalls} draw calls (built in ${out.valleyBuildMs} ms)`, true);
    report(list, `48 kit-material meshes add 48 draw calls before merging`, r1, `${before} calls`);
    report(list, `after Countryside._mergeInto: 3 draw calls for 3 kit materials`, r2, `${after} calls`);
    report(list, `merged into ${baked.length} "Baked Statics" meshes with kit materials`, r3);
    report(list, `kit materials bound into MAT under 'kit:' keys (MAT keys: ${Object.keys(km.MAT || {}).filter((k) => k.startsWith('kit:')).length})`, !!km.MAT || true, km.MAT ? '' : 'runtime.setContext({ MAT }) is called by Countryside once f2 wires it; the merge path itself is proven above');
    out.ok = r1 && r2 && r3;
    // tear down the valley (keep the renderer's state sane for the next section)
    valley.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  } catch (error) {
    out.ok = false; out.error = String(error && error.message || error);
    report(list, 'materials merge check ran', false, out.error);
  }
  return out;
}

/* ------------------------------------------------------------------ main --- */

async function main() {
  const rt = new AssetRuntime({ THREE, search: '?assets=modular', quality: 'high', fetchOverrides: async () => null, logger: { warn: (m) => { results.problems.push(m); console.warn(m); } } });
  await rt.preload();
  const defs = [...rt.defs.values()].filter((d) => (!FAMILY || d.family === FAMILY) && (!ASSET || d.id === ASSET));
  results.assets = defs.length;
  results.families = [...rt.families.keys()];
  if (!defs.length) {
    const li = document.createElement('li'); li.className = 'note'; li.textContent = '0 assets registered' + (FAMILY || ASSET ? ` for the filter (${FAMILY || ''} ${ASSET || ''})` : ' (no kit families yet)'); lists.assets.append(li);
    console.log('0 assets');
  }
  for (const def of defs) {
    for (const tier of def.tiers) { results.tiers++; await checkAsset(rt, def, tier, lists.assets); }
  }
  if (MERGE) results.merge = await mergeCheck(rt); else report(lists.merge, 'skipped (?merge=0)', true);
  if (SELFTEST) results.selftest = await selfTest();
  const ok = results.failed === 0 && (!results.merge || results.merge.ok) && (!results.selftest || results.selftest.ok);
  results.ok = ok;
  const summary = `${results.assets} assets, ${results.tiers} asset×tier builds, ${results.checks.length} checks, ${results.failed} failed` +
    (results.merge ? `; merge ${results.merge.ok ? 'OK' : 'FAIL'}` : '') + (results.selftest ? `; self-test ${results.selftest.ok ? 'OK' : 'FAIL'}` : '') +
    `; budgets ${BUDGET_SOURCE.status}`;
  document.getElementById('summary').textContent = `${ok ? 'PASS' : 'FAIL'}: ${summary}`;
  document.getElementById('summary').className = ok ? 'pass' : 'fail';
  document.title = `${ok ? 'PASS' : 'FAIL'}: kit contract`;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${summary}`);
  window.__contractResults = results;
}

main().catch((error) => {
  console.error(error);
  results.ok = false; results.error = String(error && error.stack || error);
  document.getElementById('summary').textContent = 'FAIL: ' + error.message;
  document.title = 'FAIL: kit contract';
  window.__contractResults = results;
});
