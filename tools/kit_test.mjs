// Unit tests for the kit runtime, contract and rng (no browser, no three.js).
//
//   node --test tools/kit_test.mjs
//
// Covers: mulberry32 parity with the valley's generator, hashId stability,
// the param schema, part naming, the tier policy, set resolution (setting,
// URL, quality), ?swap= parsing, kit-overrides.json handling, the build
// fallback (missing builder, throwing builder, malformed instance), instance
// normalisation (names, footprint default per R12), update/setTier/dispose
// bookkeeping and the generated family index.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { generateIndex, indexInSync, renderIndex, currentTag } from './kit_index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The kit modules import each other WITH the cache tag (`./contract.js?v=…`),
// and a module URL with a different query is a second instance of the file —
// so the tests import with the same tag, read from src/main.js, or classes
// like AssetContractError would not match across the two copies.
const TAG = currentTag(ROOT);
const kit = (name) => import(`../src/kit/${name}.js?v=${TAG}`);
const { mulberry32, hashId, assetSeed, assetRng, draw } = await kit('rng');
const {
  TIERS, TIER_POLICY, defineAsset, validateParamSchema, resolveParams, coerceParam, defaultParams,
  groupName, partName, parsePartName, bandFor, tierFor, clampTier, validateInstance, isAssetInstance,
  AssetContractError, emptyFootprint
} = await kit('contract');
const {
  AssetRuntime, CLASSIC_ASSETS, parseSwap, parseAssetsFlag, resolveSet, parseOverridesDoc,
  KIT_OVERRIDES_FORMAT, CONTEXT_FIELDS
} = await kit('runtime');
const { BUDGETS, budgetFor, BUDGET_SOURCE } = await kit('budgets');

/* ------------------------------------------------------------ fixtures --- */

// Minimal Object3D stand-ins (duck-typed like three's).
class Obj {
  constructor(name = '') { this.isObject3D = true; this.name = name; this.children = []; this.parent = null; this.userData = {}; }
  add(child) { child.parent = this; this.children.push(child); return this; }
  remove(child) { const i = this.children.indexOf(child); if (i >= 0) { this.children.splice(i, 1); child.parent = null; } return this; }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
}
class Mesh extends Obj {
  constructor(name) { super(name); this.isMesh = true; this.disposed = 0; this.geometry = { dispose: () => { this.disposed++; } }; }
}

function goodDef(overrides = {}) {
  return defineAsset({
    id: 'torii', family: 'shrine', lab: 'shrine/myojin',
    params: {
      span: { type: 'number', default: 3.2, min: 2.4, max: 4.5, step: 0.05 },
      finish: { type: 'enum', default: 'vermilion', options: ['vermilion', 'weathered', 'stone'] },
      moss: { type: 'boolean', default: false },
      tint: { type: 'color', default: 0xd8482c }
    },
    build(ctx, layout, params) {
      const group = new Obj();
      const post_l = new Mesh(), kasagi = new Mesh();
      group.add(post_l).add(kasagi);
      return { group, parts: { post_l, kasagi }, sockets: { hook: new Obj() }, live: [], ctx, params, layout };
    },
    ...overrides
  });
}

const quiet = () => { const log = { warnings: [], warn: (m) => log.warnings.push(m) }; return log; };

/* ----------------------------------------------------------------- rng --- */

// The valley's own generator (src/countryside.js), copied as the oracle.
function valleyMulberry(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('mulberry32 matches the valley generator for the valley seed and for hashed seeds', () => {
  for (const seed of [20260729, 77, 0x4d43, 1, 0xffffffff, hashId('torii')]) {
    const a = mulberry32(seed), b = valleyMulberry(seed);
    for (let i = 0; i < 2000; i++) assert.equal(a(), b(), `seed ${seed} draw ${i}`);
  }
});

test('hashId is stable, 32-bit and spreads ids', () => {
  assert.equal(hashId('torii'), hashId('torii'));
  assert.equal(hashId('torii'), 2840367656);          // pinned: a change here breaks every seeded asset
  assert.equal(hashId(''), 0x811c9dc5);               // FNV-1a offset basis
  assert.notEqual(hashId('torii'), hashId('toro'));
  assert.ok(Number.isInteger(hashId('x')) && hashId('x') >= 0 && hashId('x') <= 0xffffffff);
  assert.equal(assetSeed('torii', 3), (hashId('torii') ^ 3) >>> 0);
  assert.notEqual(assetRng('torii', 0)(), assetRng('torii', 1)());
  assert.equal(assetRng('torii', 2)(), assetRng('torii', 2)());
});

test('draw helpers stay inside their ranges', () => {
  const r = assetRng('toro');
  for (let i = 0; i < 500; i++) {
    const v = draw.range(r, -2, 2); assert.ok(v >= -2 && v < 2);
    const n = draw.int(r, 3, 6); assert.ok([3, 4, 5, 6].includes(n));
    assert.ok(['a', 'b'].includes(draw.pick(r, ['a', 'b'])));
    assert.ok(Math.abs(draw.jitter(r, 0.5)) <= 0.5);
  }
});

/* ------------------------------------------------------------ contract --- */

test('part naming helpers round-trip', () => {
  assert.equal(groupName('torii'), 'asset:torii');
  assert.equal(partName('torii', 'post_l'), 'asset:torii/post_l');
  assert.deepEqual(parsePartName('asset:torii/post_l'), { id: 'torii', part: 'post_l' });
  assert.deepEqual(parsePartName('asset:torii'), { id: 'torii', part: null });
  assert.equal(parsePartName('Torii Gate'), null);
  assert.equal(parsePartName('asset:torii/Post L'), null);
});

test('param schema validation accepts the §3.3 example and rejects bad defaults', () => {
  assert.ok(validateParamSchema({
    span: { type: 'number', default: 3.2, min: 2.4, max: 4.5, step: 0.05 },
    finish: { type: 'enum', default: 'vermilion', options: ['vermilion', 'weathered', 'stone'] }
  }).ok);
  const bad = validateParamSchema({
    span: { type: 'number', default: 9, min: 2.4, max: 4.5 },
    finish: { type: 'enum', default: 'gold', options: ['vermilion'] },
    lit: { type: 'boolean', default: 'yes' },
    tint: { type: 'color', default: 'red' },
    'Bad Key': { type: 'number', default: 1, min: 0, max: 2 },
    weird: { type: 'vector', default: 1 }
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 6, bad.errors.join('\n'));
});

test('resolveParams clamps, snaps and reports without throwing', () => {
  const def = goodDef();
  const { values, problems } = resolveParams(def.params, { span: 99, finish: 'gold', moss: 'true', tint: '#ff8800', nope: 1 }, { span: 3.33 });
  assert.equal(values.span, 3.35);                 // 3.33 snapped to the 0.05 step
  assert.equal(values.finish, 'vermilion');        // unusable enum keeps the default
  assert.equal(values.moss, true);
  assert.equal(values.tint, 0xff8800);
  assert.deepEqual(problems, ["param 'finish': unusable value \"gold\"", "unknown param 'nope'"]);
  assert.equal(coerceParam({ type: 'number', min: 0, max: 1 }, 'abc'), undefined);
  assert.deepEqual(defaultParams(def.params), { span: 3.2, finish: 'vermilion', moss: false, tint: 0xd8482c });
});

test('defineAsset validates and freezes the record', () => {
  const def = goodDef();
  assert.equal(def.kind, 'asset');
  assert.ok(Object.isFrozen(def) && Object.isFrozen(def.params) && Object.isFrozen(def.tiers));
  assert.deepEqual([...def.tiers], ['hero', 'mid', 'far']);
  assert.throws(() => defineAsset({ id: 'Torii', family: 'shrine', build() {} }), AssetContractError);
  assert.throws(() => defineAsset({ id: 'torii', family: 'shrine' }), /build/);
  assert.throws(() => defineAsset({ id: 'torii', family: 'shrine', build() {}, tiers: ['hero', 'ultra'] }), /tiers/);
  assert.throws(() => defineAsset({ id: 'torii', family: 'shrine', build() {}, params: { span: { type: 'number', default: 5, min: 0, max: 1 } } }), /outside/);
  assert.throws(() => defineAsset({ id: 'torii', family: 'shrine', build() {}, floating: ['Bad Part'] }), /floating/);
  const sub = defineAsset({ id: 'toro', family: 'lanterns', build() {}, tiers: ['far', 'hero'] });
  assert.deepEqual([...sub.tiers], ['hero', 'far']);
});

test('tier policy: band from radius, policy by quality, clamped to declared tiers', () => {
  assert.equal(bandFor({ x: 3, z: 4 }), 'near');
  assert.equal(bandFor({ position: { x: 50, z: 0 } }), 'rim');
  assert.equal(bandFor({ x: 0, z: 120 }), 'far');
  assert.equal(bandFor({ band: 'far', x: 0, z: 0 }), 'far');
  assert.equal(bandFor(null), 'near');
  assert.equal(tierFor('high', 'near'), 'hero');
  assert.equal(tierFor('high', 'rim'), 'mid');
  assert.equal(tierFor('medium', 'near'), 'mid');
  assert.equal(tierFor('medium', 'rim'), 'far');
  assert.equal(tierFor('low', 'near'), 'far');
  assert.equal(tierFor('high', 'near', ['mid', 'far']), 'mid');   // next less detailed
  assert.equal(tierFor('medium', 'rim', ['hero']), 'hero');       // only one declared
  assert.equal(clampTier('mid', ['hero']), 'hero');
  assert.deepEqual(Object.keys(TIER_POLICY), ['high', 'medium', 'low']);
  assert.deepEqual([...TIERS], ['hero', 'mid', 'far']);
});

test('validateInstance and isAssetInstance check the §3.3 shape', () => {
  const def = goodDef();
  const inst = def.build({}, {}, {});
  assert.ok(validateInstance(inst, 'torii').ok);
  assert.equal(isAssetInstance(inst), false);          // no footprint yet (the runtime adds it)
  inst.footprint = emptyFootprint();
  assert.ok(isAssetInstance(inst));
  assert.equal(isAssetInstance({ group: {}, parts: {} }), false);
  assert.equal(validateInstance(null, 'x').ok, false);
  const bad = validateInstance({ group: new Obj(), parts: { 'Bad Key': new Mesh(), ok: {} }, live: 'no', update: 1 }, 'torii');
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 4, bad.errors.join('\n'));
});

/* ----------------------------------------------------------- resolution --- */

test('parseSwap accepts id[:set] lists and reports the rest', () => {
  assert.deepEqual(parseSwap('torii:modular,toro:classic, bridge ').swaps, { torii: 'modular', toro: 'classic', bridge: 'modular' });
  const r = parseSwap('torii:gold,:modular,a:b:c');
  assert.deepEqual(r.swaps, {});
  assert.equal(r.problems.length, 3);
  assert.deepEqual(parseSwap('').swaps, {});
  assert.deepEqual(parseSwap(null).swaps, {});
});

test('parseAssetsFlag and resolveSet (setting, URL, quality)', () => {
  assert.equal(parseAssetsFlag('?assets=modular'), 'modular');
  assert.equal(parseAssetsFlag('?assets=purple'), null);
  assert.equal(parseAssetsFlag(''), null);
  assert.equal(resolveSet({ chosen: 'classic', quality: 'high' }), 'classic');
  assert.equal(resolveSet({ chosen: 'modular', quality: 'high' }), 'modular');
  assert.equal(resolveSet({ chosen: 'modular', quality: 'low' }), 'classic');                   // the setting never leaves classic on low
  assert.equal(resolveSet({ chosen: 'modular', quality: 'low', explicit: true }), 'modular');   // ?assets= is a developer override
  assert.equal(resolveSet({ chosen: 'auto', quality: 'low', explicit: true }), 'classic');
  assert.equal(resolveSet({ chosen: 'auto', quality: 'medium' }), 'modular');
  assert.equal(resolveSet({ chosen: 'nonsense', quality: 'high' }), 'classic');
});

test('runtime resolves the set per id: swap > low-quality rule > override > global', async () => {
  const rt = new AssetRuntime({ assetSet: 'classic', search: '?swap=torii:modular,toro:classic', quality: 'high', logger: quiet() });
  assert.equal(rt.set, 'classic');
  assert.equal(rt.setFor('torii'), 'modular');
  assert.equal(rt.setFor('toro'), 'classic');
  assert.equal(rt.setFor('bridge'), 'classic');
  assert.ok(rt.needsKit());

  const url = new AssetRuntime({ assetSet: 'classic', search: '?assets=modular', quality: 'high' });
  assert.equal(url.set, 'modular');
  assert.ok(url.explicit);
  assert.equal(url.setFor('anything'), 'modular');

  const low = new AssetRuntime({ assetSet: 'modular', quality: 'low' });
  assert.equal(low.set, 'classic');
  assert.equal(low.setFor('torii'), 'classic');
  assert.equal(low.needsKit(), false);

  const auto = new AssetRuntime({ assetSet: 'auto', quality: 'medium' });
  assert.equal(auto.set, 'modular');
  auto.setQuality('low');
  assert.equal(auto.set, 'classic');
  auto.setQuality('high');
  assert.equal(auto.set, 'modular');
});

test('preload: classic default imports nothing and fetches nothing', async () => {
  let families = 0, materials = 0, fetched = 0;
  const rt = new AssetRuntime({
    assetSet: 'classic', quality: 'high',
    loadFamilies: async () => { families++; return {}; },
    createMaterials: async () => { materials++; return {}; },
    fetchOverrides: async () => { fetched++; return null; }
  });
  await rt.preload();
  await rt.preload();   // idempotent
  assert.deepEqual([families, materials, fetched], [0, 0, 0]);
  assert.equal(rt.loaded, false);
});

test('preload: modular imports every family once, registers assets, binds materials', async () => {
  let families = 0, materials = 0;
  const log = quiet();
  const bound = [];
  const rt = new AssetRuntime({
    assetSet: 'modular', quality: 'high', logger: log,
    loadFamilies: async () => { families++; return {
      shrine: async () => ({ assets: [goodDef()] }),
      broken: async () => { throw new Error('boom'); },
      noexport: async () => ({})
    }; },
    createMaterials: async () => { materials++; return { bind: (MAT) => bound.push(MAT), list: () => [] }; },
    fetchOverrides: async () => null
  });
  await Promise.all([rt.preload(), rt.preload()]);
  assert.deepEqual([families, materials], [1, 1]);
  assert.ok(rt.loaded);
  assert.ok(rt.has('torii'));
  assert.deepEqual(rt.summary().families, { shrine: ['torii'] });
  assert.equal(log.warnings.length, 2, log.warnings.join('\n'));
  assert.match(log.warnings[0], /family 'broken' failed to load/);
  assert.match(log.warnings[1], /family 'noexport'.*export `assets`/);
  const MAT = { stone: {} };
  rt.setContext({ MAT, THREE: { name: 'three' } });
  assert.equal(bound[bound.length - 1], MAT);
});

test('preload failure never throws: the runtime falls back to classic with one warning', async () => {
  const log = quiet();
  const rt = new AssetRuntime({ assetSet: 'modular', quality: 'high', logger: log, loadFamilies: async () => { throw new Error('offline'); }, fetchOverrides: async () => null });
  await rt.preload();
  assert.equal(rt.loaded, false);
  assert.equal(log.warnings.length, 1);
  assert.match(log.warnings[0], /kit preload failed, running classic/);
  const calls = [];
  assert.equal(rt.build('torii', {}, () => calls.push('classic')), 1);
  assert.deepEqual(calls, ['classic']);
});

test('kit-overrides.json: parsed, applied per id, fetched only when the kit can be active', async () => {
  const doc = { format: KIT_OVERRIDES_FORMAT, assets: {
    torii: { variant: 'modular', params: { span: 3.4, finish: 'stone' } },
    toro: { variant: 'classic' },
    junk: 'nope',
    weird: { variant: 'gold', params: [1] }
  } };
  const parsed = parseOverridesDoc(doc);
  assert.deepEqual(parsed, { assets: { torii: { variant: 'modular', params: { span: 3.4, finish: 'stone' } }, toro: { variant: 'classic' }, weird: {} } });
  assert.equal(parseOverridesDoc({ format: 'other', assets: {} }), null);
  assert.equal(parseOverridesDoc({ format: KIT_OVERRIDES_FORMAT, assets: [] }), null);

  // setting classic, no swap: not even fetched
  let fetched = 0;
  const classic = new AssetRuntime({ assetSet: 'classic', quality: 'high', fetchOverrides: async () => { fetched++; return doc; }, loadFamilies: async () => ({}), createMaterials: async () => ({}) });
  await classic.preload();
  assert.equal(fetched, 0);
  assert.equal(classic.overrides, null);

  // setting modular: fetched; per-id variants apply; params reach the builder
  const log = quiet();
  const rt = new AssetRuntime({
    assetSet: 'modular', quality: 'high', logger: log,
    fetchOverrides: async () => { fetched++; return doc; },
    loadFamilies: async () => ({ shrine: async () => ({ assets: [goodDef()] }) }),
    createMaterials: async () => ({})
  });
  await rt.preload();
  assert.equal(fetched, 1);
  assert.equal(rt.setFor('torii'), 'modular');
  assert.equal(rt.setFor('toro'), 'classic');
  assert.equal(rt.setFor('weird'), 'modular');       // junk variant ignored → global set
  const inst = rt.build('torii', { x: 1, z: 2, index: 0 }, () => 'classic');
  assert.ok(isAssetInstance(inst));
  assert.equal(inst.params.span, 3.4);
  assert.equal(inst.params.finish, 'stone');

  // an override can switch a single id on while the setting is auto on a good machine
  const auto = new AssetRuntime({ assetSet: 'auto', quality: 'high', fetchOverrides: async () => ({ format: KIT_OVERRIDES_FORMAT, assets: { torii: { variant: 'classic' } } }), loadFamilies: async () => ({}), createMaterials: async () => ({}) });
  await auto.preload();
  assert.equal(auto.setFor('torii'), 'classic');
  assert.equal(auto.setFor('toro'), 'modular');

  // a malformed file warns once and is ignored
  const warnLog = quiet();
  const malformed = new AssetRuntime({ assetSet: 'modular', quality: 'high', logger: warnLog, fetchOverrides: async () => ({ format: 'wrong' }), loadFamilies: async () => ({}), createMaterials: async () => ({}) });
  await malformed.preload();
  assert.equal(malformed.overrides, null);
  assert.equal(warnLog.warnings.length, 1);
  assert.match(warnLog.warnings[0], /kit-overrides\.json ignored/);
});

/* ---------------------------------------------------------------- build --- */

function modularRuntime(defs, extra = {}) {
  const log = quiet();
  const rt = new AssetRuntime({ assetSet: 'modular', quality: 'high', logger: log, THREE: { isThree: true }, ...extra });
  for (const d of defs) rt.register(d);
  rt.setContext({ MAT: { stone: 'stone-mat' }, textures: { wood: 'wood-tex' } });
  return { rt, log };
}

test('build: classic path when no builder is registered; classicFn result is returned as is', () => {
  const { rt, log } = modularRuntime([]);
  const out = rt.build('bridge', { x: 0 }, () => ({ mesh: 'classic bridge' }));
  assert.deepEqual(out, { mesh: 'classic bridge' });
  assert.equal(rt.instances.length, 0);
  assert.equal(log.warnings.length, 0);
  assert.throws(() => rt.build('bridge', {}, null), TypeError);
});

test('build: the kit instance is normalised — names, userData, footprint from the layout (R12 §3), defaults', () => {
  const { rt } = modularRuntime([goodDef()]);
  const footprint = { colliders: [{ min: [0, 0, 0], max: [1, 1, 1] }], exclusions: [[0, 0, 2, 2]], anchors: { bell: { x: 0, y: 2, z: 0 } } };
  const layout = { x: 10, z: -4, ry: 0.3, index: 2, name: 'Torii Gate', footprint };
  const inst = rt.build('torii', layout, () => { throw new Error('classic must not run'); });
  assert.ok(isAssetInstance(inst));
  assert.equal(inst.group.name, 'Torii Gate');                  // the legacy name gameplay looks up
  assert.deepEqual(inst.group.userData.asset, { id: 'torii', family: 'shrine', tier: 'hero', index: 2 });
  assert.equal(inst.parts.post_l.name, 'asset:torii/post_l');
  assert.equal(inst.parts.kasagi.name, 'asset:torii/kasagi');
  assert.equal(inst.parts.kasagi.userData.part, 'kasagi');
  assert.equal(inst.sockets.hook.name, 'socket:torii/hook');
  assert.equal(inst.footprint, footprint);                       // copied from the classic layout
  assert.deepEqual(inst.live, []);
  assert.equal(inst.id, 'torii');
  assert.equal(inst.tier, 'hero');
  assert.equal(inst.layout, layout);
  assert.ok(typeof inst.buildMs === 'number');
  assert.equal(rt.instances.length, 1);
  // ctx carried exactly the seven frozen fields
  assert.deepEqual(Object.keys(inst.ctx).sort(), [...CONTEXT_FIELDS].sort());
  assert.equal(inst.ctx.THREE.isThree, true);
  assert.equal(inst.ctx.MAT.stone, 'stone-mat');
  assert.equal(inst.ctx.textures.wood, 'wood-tex');
  assert.equal(inst.ctx.quality, 'high');
  assert.equal(inst.ctx.tier, 'hero');
  assert.equal(inst.ctx.rng(), assetRng('torii', 2)());        // seeded by hashId(id) ^ layout.index
  // a second instance without a footprint in its layout gets an empty one and the asset:<id> name
  const bare = rt.build('torii', { x: 60, z: 0, index: 0 }, () => null);
  assert.equal(bare.group.name, 'asset:torii');
  assert.deepEqual(bare.footprint, { colliders: [], exclusions: [], anchors: {} });
  assert.equal(bare.tier, 'mid');                                // rim band on high
});

test('build: layout.params override published params; layout.tier forces a tier (clamped)', () => {
  const { rt } = modularRuntime([goodDef({ tiers: ['hero', 'far'] })]);
  const a = rt.build('torii', { params: { span: 2.5 }, tier: 'mid' }, () => null);
  assert.equal(a.params.span, 2.5);
  assert.equal(a.tier, 'far');     // mid not declared → next less detailed
  const b = rt.build('torii', { tier: 'hero' }, () => null);
  assert.equal(b.tier, 'hero');
});

test('build: a throwing builder falls back to classic with ONE warning per id and disposes the half-built tree', () => {
  let built = 0;
  const leaked = new Mesh();
  const def = defineAsset({ id: 'toro', family: 'lanterns', build() { built++; const group = new Obj(); group.add(leaked); throw new Error('no geometry'); } });
  const { rt, log } = modularRuntime([def]);
  const results = [];
  for (let i = 0; i < 3; i++) results.push(rt.build('toro', { index: i }, () => 'classic toro'));
  assert.deepEqual(results, ['classic toro', 'classic toro', 'classic toro']);
  assert.equal(built, 3);
  assert.equal(log.warnings.length, 1);
  assert.match(log.warnings[0], /toro: kit build failed, using the classic asset — no geometry/);
  assert.equal(rt.instances.length, 0);
});

test('build: a malformed instance (not an AssetInstance) falls back to classic', () => {
  const def = defineAsset({ id: 'toro', family: 'lanterns', build() { return { group: new Obj(), parts: { 'Bad Key': new Mesh() } }; } });
  const { rt, log } = modularRuntime([def]);
  assert.equal(rt.build('toro', {}, () => 'classic'), 'classic');
  assert.equal(log.warnings.length, 1);
  assert.match(log.warnings[0], /part key 'Bad Key' must be snake_case/);
  const def2 = defineAsset({ id: 'yarn', family: 'keepsakes', build() { return 42; } });
  const { rt: rt2, log: log2 } = modularRuntime([def2]);
  assert.equal(rt2.build('yarn', {}, () => 'classic'), 'classic');
  assert.match(log2.warnings[0], /must return an AssetInstance object \(got number\)/);
});

test('register rejects non-definitions and duplicate ids (first wins)', () => {
  const { rt, log } = modularRuntime([goodDef()]);
  assert.throws(() => rt.register({ id: 'x' }), AssetContractError);
  assert.equal(rt.register(goodDef({ family: 'other' }), 'other'), false);
  assert.equal(rt.defs.get('torii').family, 'shrine');
  assert.match(log.warnings[0], /registered twice/);
});

test('update: forwards env to instances and materials, switches off a throwing update once', () => {
  const seen = [];
  const good = defineAsset({ id: 'torii', family: 'shrine', build() { const group = new Obj(); return { group, parts: {}, update: (dt, t, env) => seen.push([dt, t, env.hour]) }; } });
  const bad = defineAsset({ id: 'toro', family: 'lanterns', build() { const group = new Obj(); return { group, parts: {}, update: () => { throw new Error('tick'); } }; } });
  const envs = [];
  const { rt, log } = modularRuntime([good, bad], { createMaterials: null });
  rt.kitMaterials = { setEnv: (e) => envs.push(e), bind() {} };
  rt.build('torii', {}, () => null);
  rt.build('toro', {}, () => null);
  const env = { hour: 19.5, wind: 1, wet: 0, snow: 0, lanternOn: true };
  rt.update(1 / 60, 10, env);
  rt.update(1 / 60, 10.016, env);
  assert.deepEqual(seen, [[1 / 60, 10, 19.5], [1 / 60, 10.016, 19.5]]);
  assert.equal(envs.length, 2);
  assert.equal(log.warnings.length, 1);
  assert.match(log.warnings[0], /toro: update\(\) threw and was switched off/);
  assert.equal(rt.instances[1].update, null);
});

test('setQuality re-tiers only instances that implement setTier', () => {
  const tiers = [];
  const live = defineAsset({ id: 'toro', family: 'lanterns', build() { return { group: new Obj(), parts: {}, setTier: (t) => tiers.push(t) }; } });
  const merged = goodDef();
  const { rt } = modularRuntime([live, merged]);
  const a = rt.build('toro', { x: 0, z: 0 }, () => null);
  const b = rt.build('torii', { x: 0, z: 0 }, () => null);
  assert.deepEqual([a.tier, b.tier], ['hero', 'hero']);
  rt.setQuality('medium');
  assert.deepEqual(tiers, ['mid']);
  assert.deepEqual([a.tier, b.tier], ['mid', 'hero']);   // merged statics keep their build-time tier
  rt.setQuality('medium');                                // no change, no call
  assert.deepEqual(tiers, ['mid']);
});

test('dispose: runs the builder dispose once, disposes geometry, removes from parent and registry', () => {
  let own = 0;
  const def = defineAsset({ id: 'torii', family: 'shrine', build() {
    const group = new Obj(); const m = new Mesh(); const shared = new Mesh(); shared.userData.sharedGeometry = true;
    group.add(m).add(shared);
    return { group, parts: { post: m, shared }, dispose() { own++; } };
  } });
  const { rt } = modularRuntime([def]);
  const scene = new Obj('scene');
  const inst = rt.build('torii', {}, () => null);
  scene.add(inst.group);
  inst.dispose();
  inst.dispose();
  assert.equal(own, 1);
  assert.equal(inst.parts.post.disposed, 1);
  assert.equal(inst.parts.shared.disposed, 0);
  assert.equal(inst.group.parent, null);
  assert.equal(rt.instances.length, 0);
  rt.build('torii', {}, () => null);
  rt.build('torii', {}, () => null);
  rt.dispose();
  assert.equal(rt.instances.length, 0);
});

test('CLASSIC_ASSETS is a frozen pass-through', async () => {
  assert.ok(Object.isFrozen(CLASSIC_ASSETS));
  assert.equal(CLASSIC_ASSETS.build('torii', {}, () => 'classic'), 'classic');
  assert.deepEqual([...CLASSIC_ASSETS.instances], []);
  assert.equal(CLASSIC_ASSETS.setFor('torii'), 'classic');
  assert.equal(CLASSIC_ASSETS.has('torii'), false);
  assert.equal(CLASSIC_ASSETS.isClassic, true);
  await CLASSIC_ASSETS.preload();
  CLASSIC_ASSETS.update(0.016, 1, {});
  CLASSIC_ASSETS.setQuality('low');
  CLASSIC_ASSETS.setContext({ MAT: {} });
});

/* --------------------------------------------------------- index + budgets --- */

test('generated src/kit/index.js is in sync and exports FAMILIES', async () => {
  const { families, tag, text } = generateIndex(ROOT);
  assert.ok(indexInSync(ROOT), 'run: node tools/kit_index.mjs');
  assert.match(text, /GENERATED by tools\/kit_index\.mjs/);
  assert.match(tag, /^[0-9a-z]+$/);
  const mod = await kit('index');
  assert.deepEqual(Object.keys(mod.FAMILIES), families);
  assert.deepEqual([...mod.FAMILY_NAMES], families);
  assert.equal(mod.KIT_TAG, tag);
  assert.ok(Object.isFrozen(mod.FAMILIES));
  const two = renderIndex(['lanterns', 'shrine'], 'tagx');
  assert.match(two, /'shrine': \(\) => import\('\.\/shrine\/index\.js\?v=tagx'\)/);
  assert.match(two, /FAMILY_NAMES = Object\.freeze\(\['lanterns', 'shrine'\]\)/);
});

test('runtime default loaders read the generated index (zero families today)', async () => {
  const rt = new AssetRuntime({ assetSet: 'modular', quality: 'high', fetchOverrides: async () => null, createMaterials: async () => ({ bind() {} }) });
  await rt.preload();
  assert.ok(rt.loaded);
  assert.deepEqual(rt.summary().assets, []);
});

test('budgets are per tier, exceptions apply, source is cited', () => {
  assert.deepEqual(Object.keys(BUDGETS), ['hero', 'mid', 'far']);
  for (const tier of TIERS) assert.ok(BUDGETS[tier].triangles > 0 && BUDGETS[tier].meshes > 0 && BUDGETS[tier].buildMs > 0);
  assert.ok(BUDGETS.hero.triangles > BUDGETS.mid.triangles && BUDGETS.mid.triangles > BUDGETS.far.triangles);
  assert.deepEqual(budgetFor('torii', 'mid'), BUDGETS.mid);
  assert.equal(BUDGET_SOURCE.file, 'docs/fable/baseline/budgets.md');
  assert.match(readFileSync(join(ROOT, 'src/kit/budgets.js'), 'utf8'), /docs\/fable\/baseline\/budgets\.md/);
});

/* ------------------------------------------------------ kit_check fixtures --- */

import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// A throwaway repo tree: the real src/kit, src/main.js (for the tag) and the inventory.
function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'kit-check-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'labs'), { recursive: true });
  cpSync(join(ROOT, 'src', 'kit'), join(root, 'src', 'kit'), { recursive: true });
  writeFileSync(join(root, 'src', 'main.js'), `import { x } from './kit/runtime.js?v=${TAG}';\n`);
  writeFileSync(join(root, 'labs', 'asset_inventory.json'), JSON.stringify({ assets: [{ id: 'torii', lifecycle: 'active' }, { id: 'old-gate', lifecycle: 'inactive' }] }));
  return root;
}
const runCheck = (root) => spawnSync(process.execPath, [join(ROOT, 'tools', 'kit_check.mjs'), '--root', root], { encoding: 'utf8' });

test('kit_check passes on a clean fixture family and reports its id', () => {
  const root = fixtureRoot();
  try {
    mkdirSync(join(root, 'src', 'kit', 'shrine'));
    writeFileSync(join(root, 'src', 'kit', 'shrine', 'index.js'), `import { defineAsset } from '../contract.js?v=${TAG}';
import { tube } from '../craft.js?v=${TAG}';
export const assets = [defineAsset({
  id: 'torii', family: 'shrine',
  params: {
    span: { type: 'number', default: 3.2, min: 2.4, max: 4.5, step: 0.05 },
    finish: { type: 'enum', default: 'vermilion', options: ['vermilion', 'weathered'] }
  },
  build(ctx) { return { group: null, parts: {} }; }
})];
`);
    // regenerate the index for the fixture tree
    const { text } = generateIndex(root);
    writeFileSync(join(root, 'src', 'kit', 'index.js'), text);
    const r = runCheck(root);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /OK   src\/kit\/shrine\/index\.js: id 'torii' is an active inventory id/);
    assert.match(r.stdout, /1 kit asset id\(s\) across 1 family folder\(s\)/);
    assert.match(r.stdout, /2 one-line param schema entries checked/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('kit_check fails on every rule: index drift, missing assets export, bad id, inactive id, duplicate id, labs import, Math.random, Date.now, bad defaults, stale tag', () => {
  const root = fixtureRoot();
  try {
    mkdirSync(join(root, 'src', 'kit', 'bad'));
    mkdirSync(join(root, 'src', 'kit', 'noindex'));
    writeFileSync(join(root, 'src', 'kit', 'bad', 'index.js'), `import { defineAsset } from '../contract.js?v=stale0';
import { M } from '../../../labs/shared/painted.js';
export const things = [
  defineAsset({ id: 'torii', family: 'bad', params: {
    span: { type: 'number', default: 9, min: 2.4, max: 4.5 },
    finish: { type: 'enum', default: 'gold', options: ['vermilion', 'weathered'] }
  }, build() { return Math.random(); } }),
  defineAsset({ id: 'torii', family: 'bad', build() { return Date.now(); } }),
  defineAsset({ id: 'old-gate', family: 'bad', build() { return this.random(); } }),
  defineAsset({ id: 'not-in-inventory', family: 'bad', build() {} })
];
`);
    // index.js left as the zero-family version → out of date
    const r = runCheck(root);
    assert.equal(r.status, 1);
    const out = r.stdout;
    for (const expect of [
      /FAIL src\/kit\/index\.js out of date/,
      /FAIL src\/kit\/noindex\/ has no index\.js/,
      /FAIL family bad: index\.js must export `assets`/,
      /FAIL .*id 'not-in-inventory' is not in labs\/asset_inventory\.json/,
      /FAIL .*id 'old-gate' is inactive in the inventory/,
      /FAIL id 'torii' defined twice/,
      /FAIL .*imports from labs\//,
      /FAIL .*uses Math\.random/,
      /FAIL .*uses Date\.now/,
      /FAIL .*uses this\.random/,
      /FAIL .*param 'span' default 9 outside \[2\.4, 4\.5\]/,
      /FAIL .*enum param 'finish' default 'gold' is not in options/,
      /FAIL .*\.\.\/contract\.js\?v=stale0 must carry \?v=/
    ]) assert.match(out, expect, out);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ------------------------------------------------- kit-overrides.json paths --- */

test('kit-overrides.json: a missing file (404 / network error / null) is normal — no warning, modular still loads', async () => {
  for (const fetchOverrides of [async () => null, async () => { throw new TypeError('Failed to fetch'); }, async () => undefined]) {
    const log = quiet();
    const rt = new AssetRuntime({
      assetSet: 'modular', quality: 'high', logger: log, fetchOverrides,
      loadFamilies: async () => ({ shrine: async () => ({ assets: [goodDef()] }) }),
      createMaterials: async () => ({ bind() {} })
    });
    await rt.preload();
    assert.equal(rt.overrides, null);
    assert.deepEqual(log.warnings, []);
    assert.ok(rt.loaded && rt.has('torii'));
    assert.equal(rt.setFor('torii'), 'modular');
    assert.ok(isAssetInstance(rt.build('torii', { index: 0 }, () => null)));
  }
});

test('the committed root kit-overrides.json is valid, empty, and changes nothing', async () => {
  const doc = JSON.parse(readFileSync(join(ROOT, 'kit-overrides.json'), 'utf8'));
  assert.equal(doc.format, KIT_OVERRIDES_FORMAT);
  assert.deepEqual(doc.assets, {});
  assert.deepEqual(parseOverridesDoc(doc), { assets: {} });
  const log = quiet();
  const rt = new AssetRuntime({
    assetSet: 'modular', quality: 'high', logger: log, fetchOverrides: async () => doc,
    loadFamilies: async () => ({ shrine: async () => ({ assets: [goodDef()] }) }),
    createMaterials: async () => ({ bind() {} })
  });
  await rt.preload();
  assert.deepEqual(rt.overrides, { assets: {} });
  assert.deepEqual(log.warnings, []);
  assert.equal(rt.setFor('torii'), 'modular');       // falls through to the global set
  assert.equal(rt.overrideParams('torii'), null);
  const auto = new AssetRuntime({ assetSet: 'auto', quality: 'low', fetchOverrides: async () => doc, loadFamilies: async () => ({}), createMaterials: async () => ({}) });
  await auto.preload();
  assert.equal(auto.set, 'classic');
  assert.equal(auto.needsKit(), false);
});
