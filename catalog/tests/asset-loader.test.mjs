import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAssetCapabilities, loadCatalogAsset, cloneCatalogMaterial } from '../js/asset-loader.mjs';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const inventory = JSON.parse(read('labs/asset_inventory.json'));

test('the capability index imports in Node without loading Three.js or the DOM', () => {
  const counts = inventory.assets.reduce((out, asset) => {
    const caps = getAssetCapabilities(asset); out.original += Number(caps.original); out.lab += Number(caps.lab); return out;
  }, { original: 0, lab: 0 });
  assert.ok(counts.original >= 100, JSON.stringify(counts));
  assert.ok(counts.lab >= 40, JSON.stringify(counts));
});

test('characters, ordinary objects and hidden physical rewards have real original adapters', () => {
  for (const id of ['michi','luna','mochi','kuro','larry','guardian-crows','jade-paw','dango','key','secret-fish','interior-fish','sakura','bamboo-groves','tatami']) {
    assert.equal(getAssetCapabilities(id).original, true, id);
  }
});

test('retired builders and scene-wide effects do not advertise editable isolation', () => {
  for (const id of ['old-sakura-grove','old-petal-drifts','ao','atmosphere','summit-terrain','summit-transition','not-a-real-asset']) {
    const caps = getAssetCapabilities(id); assert.equal(caps.original, false, id); assert.ok(caps.reason, id);
  }
});

test('context adapters and optional media describe their limits', () => {
  assert.equal(getAssetCapabilities('namako').originalLabel, 'Original game context');
  assert.match(getAssetCapabilities('namako').reason, /context/i);
  assert.equal(getAssetCapabilities('blender-roofscape').originalLabel, 'Optional original GLB');
  assert.match(getAssetCapabilities('blender-roofscape').reason, /optional/i);
});

test('every advertised updated specimen resolves to an actual known recipe selector', () => {
  const checked = new Set();
  for (const asset of inventory.assets) for (const target of getAssetCapabilities(asset).targets) {
    if (checked.has(target.id)) continue; checked.add(target.id);
    assert.equal(target.id, `${target.lab}/${target.selector}`);
    let source;
    if (target.lab === 'machiya') source = read('labs/machiya/js/variants.js');
    else if (target.lab === 'pagoda') {
      source = read('labs/pagoda/js/presets.js');
      const preset = target.selector.replace(/^tower-/, '');
      assert.ok(source.includes(`key: '${preset}'`), target.id); continue;
    } else if (target.lab === 'interiors') {
      source = read('labs/interiors/js/data.js') + read('labs/interiors/js/craft.js');
    } else source = read(`labs/${target.lab}/js/recipes.js`);
    const escaped = target.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.ok(new RegExp(`['"]${escaped}['"]|\\b${escaped}:`).test(source), target.id);
  }
  assert.ok(checked.size >= 50);
});

test('capability targets are defensive copies and preserve stable asset identifiers', () => {
  const a = getAssetCapabilities('bamboo-fence'); a.targets[0].id = 'evil/other'; a.targets.length = 0;
  const b = getAssetCapabilities('bamboo-fence'); assert.ok(b.targets.length > 0); assert.equal(b.targets[0].id, 'fences/koetsu');
  assert.deepEqual(getAssetCapabilities('key'), getAssetCapabilities(inventory.assets.find(asset => asset.id === 'key')));
});

test('invalid handoffs are rejected before any Three.js or recipe module is imported', async () => {
  await assert.rejects(loadCatalogAsset('key', { variant: 'arbitrary-code' }), /original game asset or a lab study/);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => inventory });
  try {
    await assert.rejects(loadCatalogAsset('../../secret'), /Unknown asset ID/);
    await assert.rejects(loadCatalogAsset('key', { variant: 'lab', targetId: 'fences/koetsu' }), /not registered for this asset/);
    await assert.rejects(loadCatalogAsset('jade-paw', { variant: 'lab' }), /isolated editing adapter/);
  } finally { globalThis.fetch = previousFetch; }
});

test('editable material copies retain game shader defines, callbacks and live shader uniforms', () => {
  const compile = () => {}, cacheKey = () => 'cat-fur';
  // Three built-in materials omit custom defines/callbacks in clone(). This
  // omission produced real CAT_PART shader failures in browser adapter QA.
  const original = {
    clone: () => ({}), defines: { CAT_PART: 2 }, extensions: { derivatives: true },
    onBeforeCompile: compile, customProgramCacheKey: cacheKey,
    isShaderMaterial: true, uniforms: { uTime: { value: 0 } }
  };
  const copy = cloneCatalogMaterial(original);
  assert.notEqual(copy, original); assert.deepEqual(copy.defines, { CAT_PART: 2 });
  assert.notEqual(copy.defines, original.defines); assert.equal(copy.onBeforeCompile, compile);
  assert.equal(copy.customProgramCacheKey, cacheKey); assert.equal(copy.uniforms, original.uniforms);
  original.uniforms.uTime.value = 3; assert.equal(copy.uniforms.uTime.value, 3);
});

test('the production variant is an accepted variant and unknown variants are still refused', async () => {
  await assert.rejects(loadCatalogAsset('torii', { variant: 'nonsense' }), /production kit/);
});

test('catalog modules reach the kit only through labs/shared/game.js', () => {
  const loader = read('catalog/js/asset-loader.mjs');
  assert.doesNotMatch(loader, /(?:from\s*|import\s*\(\s*)['"](?:(?:\.\.\/)+|\/)src\//);
  const game = read('labs/shared/game.js');
  for (const name of ['loadKitIndexModule', 'loadKitRuntimeModule', 'loadKitContractModule', 'loadKitMaterialsModule']) assert.match(game, new RegExp('export const ' + name));
  assert.match(loader, /loadKitIndexModule/); assert.match(loader, /FAMILIES/);
});

test('the production variant builds from the registry, not from a hand-kept id list', () => {
  const loader = read('catalog/js/asset-loader.mjs');
  assert.doesNotMatch(loader, /PRODUCTION\s*=/); assert.match(loader, /runtime\.defs\.get\(assetId\)/);
  assert.match(loader, /classic only/);
});
