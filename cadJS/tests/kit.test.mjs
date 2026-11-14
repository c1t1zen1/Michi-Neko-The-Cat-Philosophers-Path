// Kit parameter validation, AI kit actions, package schema 2 and kit-overrides entries.
// Real kit schemas are read from every registered family. Node has no `three` package; the families only
// `import * as THREE` (builders run later, with ctx.THREE), so a stub module stands in for it while loading.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// The stub exports every `THREE.<Name>` the kit sources mention, as an inert class (MathUtils is real).
const kitRoot = fileURLToPath(new URL('../../src/kit/', import.meta.url));
const names = new Set();
const scan = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const f = join(dir, e.name); if (e.isDirectory()) scan(f); else if (e.name.endsWith('.js')) for (const m of readFileSync(f, 'utf8').matchAll(/\bTHREE\.([A-Z][A-Za-z0-9_]*)/g)) names.add(m[1]); } };
scan(kitRoot); names.delete('MathUtils');
const threeStub = `class S { constructor() { return new Proxy(this, { get: (t, k) => k in t ? t[k] : k === 'then' ? undefined : () => t }); } }
export const MathUtils = { clamp: (v, a, b) => Math.min(b, Math.max(a, v)), lerp: (a, b, t) => a + (b - a) * t, degToRad: (d) => d * Math.PI / 180, smoothstep: (x, a, b) => x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a) };
${[...names].map((n) => `export const ${n} = S;`).join('\n')}`;
const STUBS = {
  three: threeStub,
  'three/addons/utils/BufferGeometryUtils.js': 'export const mergeGeometries = () => null, mergeVertices = () => null',
  'three/addons/geometries/RoundedBoxGeometry.js': 'export class RoundedBoxGeometry {}'
};
register('data:text/javascript,' + encodeURIComponent(`
const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(specifier, context, next) { return specifier in STUBS ? { url: 'data:text/javascript,' + encodeURIComponent(STUBS[specifier]), shortCircuit: true } : next(specifier, context); }`));
const { FAMILIES } = await import('../../src/kit/index.js');
import { validateParamSchema } from '../../src/kit/contract.js';
import { validateOverrides } from '../../catalog/js/kit-overrides.mjs';
import { KIT_ACTIONS, changedParams, checkParam, foldKitActions, kitOverridesWith, kitState, paramControls, validateParams } from '../src/kit-params.mjs';
import { validateAgentPlan, SUPPORTED_AGENT_ACTIONS } from '../src/agent-protocol.mjs';
import {
  applyStructureOps, createAssetPackage, diffHierarchy, hashValue, migrateAssetPackage, normalizeStructureOps, validateAssetPackage
} from '../src/asset-package.mjs';

const tests = [];
const test = (name, callback) => tests.push({ name, callback });

const defs = new Map();
for (const load of Object.values(FAMILIES)) for (const def of (await load()).assets || []) defs.set(def.id, def);
console.log(`kit assets read: ${defs.size} from ${Object.keys(FAMILIES).length} families`);
const lookup = (id) => defs.get(id) || null;
const rocks = defs.get('path-boulders');

test('reads every registered kit family and its params schema', () => {
  assert.ok(defs.size >= 28, `expected the kit assets, got ${defs.size}`);
  for (const def of defs.values()) assert.ok(validateParamSchema(def.params || {}).ok, def.id);
});

test('every registered asset accepts its own min and max and rejects just beyond them', () => {
  let numbers = 0;
  for (const def of defs.values()) for (const [key, p] of Object.entries(def.params || {})) {
    if (p.type !== 'number') continue; numbers++;
    assert.equal(checkParam(key, p, p.min).ok, true, `${def.id}.${key} min`);
    assert.equal(checkParam(key, p, p.max).ok, true, `${def.id}.${key} max`);
    assert.equal(checkParam(key, p, p.max + 1e-3).ok, false, `${def.id}.${key} above max`);
    assert.equal(checkParam(key, p, p.min - 1e-3).ok, false, `${def.id}.${key} below min`);
    assert.doesNotThrow(() => kitOverridesWith(null, kitState(def.id, 'modular', { [key]: p.max }), def));
  }
  assert.ok(numbers > 20);
});

test('rejects out-of-range, unknown and mistyped params instead of clamping them', () => {
  assert.ok(rocks, 'path-boulders is registered');
  assert.equal(validateParams(rocks.params, { size: 1.2 }).errors.length, 0);
  assert.match(validateParams(rocks.params, { size: 9 }).errors[0], /outside 0.6..1.5/);
  assert.match(validateParams(rocks.params, { size: 'big' }).errors[0], /expected a number/);
  assert.match(validateParams(rocks.params, { nope: 1 }).errors[0], /unknown parameter/);
  assert.match(validateParams(rocks.params, { moss: NaN }).errors[0], /expected a number/);
  assert.deepEqual(validateParams(rocks.params, { size: 1.2, moss: 9 }).values, { size: 1.2 });
});

test('checks enum, boolean and colour params', () => {
  const schema = { mode: { type: 'enum', default: 'a', options: ['a', 'b'] }, on: { type: 'boolean', default: false }, tint: { type: 'color', default: 0xff0000 } };
  assert.equal(checkParam('mode', schema.mode, 'b').ok, true);
  assert.equal(checkParam('mode', schema.mode, 'c').ok, false);
  assert.equal(checkParam('on', schema.on, 'true').ok, false);
  assert.equal(checkParam('tint', schema.tint, '#00ff00').value, 0x00ff00);
  assert.equal(checkParam('tint', schema.tint, 'green').ok, false);
  assert.deepEqual(changedParams(schema, { mode: 'a', on: true, tint: 0x00ff00 }), { on: true, tint: '#00ff00' });
});

test('builds the param panel model from the schema', () => {
  const controls = paramControls(rocks.params, { size: 1.3 });
  assert.equal(controls.length, Object.keys(rocks.params).length);
  const size = controls.find((c) => c.key === 'size');
  assert.deepEqual([size.type, size.value, size.min, size.max], ['number', 1.3, 0.6, 1.5]);
  assert.equal(controls.find((c) => c.key === 'moss').value, rocks.params.moss.default);
});

test('adds the two kit AI actions and shape-checks them', () => {
  for (const type of KIT_ACTIONS) assert.ok(SUPPORTED_AGENT_ACTIONS.has(type));
  const plan = validateAgentPlan({ actions: [{ type: 'set_asset_params', params: { asset: 'path-boulders', values: { size: 1.1 } } }] });
  assert.equal(plan.actions[0].type, 'set_asset_params');
  assert.throws(() => validateAgentPlan({ actions: [{ type: 'set_asset_params', params: { values: { size: 1 } } }] }), /needs params.asset/);
  assert.throws(() => validateAgentPlan({ actions: [{ type: 'swap_asset_variant', params: { asset: 'path-boulders', variant: 'wireframe' } }] }), /classic or modular/);
  assert.throws(() => validateAgentPlan({ actions: [{ type: 'set_asset_params', params: { asset: 'path-boulders', values: { 'Bad Key': 1 } } }] }), /not a parameter name/);
});

test('validates a plan against the asset schema when a lookup is available, rejecting out-of-range values', () => {
  const ok = { actions: [{ type: 'set_asset_params', params: { asset: 'path-boulders', values: { size: 1.4 } } }, { type: 'swap_asset_variant', params: { asset: 'path-boulders', variant: 'modular' } }] };
  assert.equal(validateAgentPlan(ok, { kitLookup: lookup }).actions.length, 2);
  const bad = { actions: [{ type: 'set_asset_params', params: { asset: 'path-boulders', values: { size: 4 } } }] };
  assert.throws(() => validateAgentPlan(bad, { kitLookup: lookup }), /outside 0.6..1.5/);
  assert.throws(() => validateAgentPlan({ actions: [{ type: 'set_asset_params', params: { asset: 'no-such-asset', values: { size: 1 } } }] }, { kitLookup: lookup }), /not a registered kit asset/);
  assert.throws(() => validateAgentPlan({ actions: [{ type: 'set_asset_params', params: { asset: 'path-boulders', values: { size: 1 } } }, { type: 'delete', target: 'selection' }] }), /cannot be mixed/);
});

test('folds kit actions into one final state, atomically', () => {
  const start = kitState('path-boulders', 'modular', { size: 1.1 });
  const { state, review } = foldKitActions(start, [
    { type: 'set_asset_params', params: { asset: 'path-boulders', values: { moss: 0.9 } } },
    { type: 'swap_asset_variant', params: { asset: 'path-boulders', variant: 'classic' } },
    { type: 'set_asset_params', params: { asset: 'path-boulders', values: { size: 1.5 } } }
  ], lookup);
  assert.deepEqual(state, { id: 'path-boulders', variant: 'classic', params: { size: 1.5, moss: 0.9 } });
  assert.equal(review.length, 3);
  assert.deepEqual(start.params, { size: 1.1 }, 'the input state is not mutated');
  assert.throws(() => foldKitActions(start, [{ type: 'set_asset_params', params: { asset: 'path-boulders', values: { moss: 0.5 } } }, { type: 'set_asset_params', params: { asset: 'path-boulders', values: { facets: 99 } } }], lookup), /Action 2/);
  assert.throws(() => foldKitActions(start, [{ type: 'set_asset_params', params: { asset: 'other-asset', values: { size: 1 } } }], lookup), /open asset/);
});

test('writes a kit-overrides entry that the server validator accepts, dropping defaults', () => {
  const doc = kitOverridesWith({ format: 'michi-neko-kit-overrides', assets: { 'edge-forest': { variant: 'classic' } } }, kitState('path-boulders', 'modular', { size: 1.3, moss: rocks.params.moss.default }), rocks);
  assert.deepEqual(doc.assets['path-boulders'], { variant: 'modular', params: { size: 1.3 } });
  assert.deepEqual(doc.assets['edge-forest'], { variant: 'classic' });
  assert.doesNotThrow(() => validateOverrides(doc, [...defs.keys()]));
  assert.throws(() => kitOverridesWith(null, kitState('path-boulders', 'modular', { size: 7 }), rocks), /outside/);
  assert.deepEqual(kitOverridesWith(null, kitState('path-boulders', 'classic', {}), rocks).assets['path-boulders'], { variant: 'classic' });
});

/* ---------------------------------------------------------------- schema 2 --- */

const ROOT = 'asset.table';
const base = { assetId: ROOT, source: { baselineFingerprint: 'fp-1', module: 'm', symbol: 's' }, changes: { objects: { [`${ROOT}.top`]: { type: 'Mesh', transform: { position: [0, 1, 0] } } } } };
const hierarchy = [
  { id: ROOT, parent: null }, { id: `${ROOT}.top`, parent: ROOT }, { id: `${ROOT}.leg`, parent: ROOT }, { id: `${ROOT}.foot`, parent: `${ROOT}.leg` }
];

test('creates schema 2 packages and keeps them tamper-evident', () => {
  const pkg = createAssetPackage({ ...base, structure: { ops: [{ op: 'create', id: `${ROOT}.drawer`, parent: ROOT, kind: 'Mesh', state: { type: 'Mesh' } }] } });
  assert.equal(pkg.schemaVersion, 2);
  assert.equal(validateAssetPackage(pkg).structure.ops[0].op, 'create');
  const tampered = JSON.parse(JSON.stringify(pkg)); tampered.structure.ops[0].parent = `${ROOT}.top`;
  assert.throws(() => validateAssetPackage(tampered), /checksum/);
});

test('rejects malformed structure operations', () => {
  assert.throws(() => normalizeStructureOps([{ op: 'explode', id: `${ROOT}.x` }], ROOT), /create, remove or reparent/);
  assert.throws(() => normalizeStructureOps([{ op: 'remove', id: ROOT }], ROOT), /not a part of asset/);
  assert.throws(() => normalizeStructureOps([{ op: 'create', id: 'other.x', parent: ROOT, kind: 'Group' }], ROOT), /not a part of asset/);
  assert.throws(() => normalizeStructureOps([{ op: 'create', id: `${ROOT}.x`, parent: 'other', kind: 'Group' }], ROOT), /outside asset/);
  assert.throws(() => normalizeStructureOps([{ op: 'create', id: `${ROOT}.x`, parent: ROOT, kind: 'Light' }], ROOT), /kind must be/);
  assert.throws(() => normalizeStructureOps([{ op: 'reparent', id: `${ROOT}.x`, parent: `${ROOT}.x` }], ROOT), /own parent/);
});

test('applies create, remove and reparent to a hierarchy', () => {
  const ops = normalizeStructureOps([
    { op: 'create', id: `${ROOT}.drawer`, parent: ROOT, kind: 'Group' },
    { op: 'reparent', id: `${ROOT}.foot`, parent: `${ROOT}.drawer` },
    { op: 'remove', id: `${ROOT}.leg` }
  ], ROOT);
  const next = applyStructureOps(hierarchy, ops, ROOT);
  assert.deepEqual(next.map((n) => [n.id, n.parent]), [
    [ROOT, null], [`${ROOT}.drawer`, ROOT], [`${ROOT}.foot`, `${ROOT}.drawer`], [`${ROOT}.top`, ROOT]
  ]);
  const cascade = applyStructureOps(hierarchy, [{ op: 'remove', id: `${ROOT}.leg` }], ROOT);
  assert.deepEqual(cascade.map((n) => n.id), [ROOT, `${ROOT}.top`], 'a removed part takes its children');
});

test('refuses structure that cannot apply', () => {
  const apply = (ops) => applyStructureOps(hierarchy, normalizeStructureOps(ops, ROOT), ROOT);
  assert.throws(() => apply([{ op: 'create', id: `${ROOT}.top`, parent: ROOT, kind: 'Group' }]), /already exists/);
  assert.throws(() => apply([{ op: 'create', id: `${ROOT}.n`, parent: `${ROOT}.ghost`, kind: 'Group' }]), /does not exist/);
  assert.throws(() => apply([{ op: 'remove', id: `${ROOT}.ghost` }]), /does not exist/);
  assert.throws(() => apply([{ op: 'reparent', id: `${ROOT}.leg`, parent: `${ROOT}.foot` }]), /is inside/);
});

test('diffs two hierarchies into ordered operations that reproduce the target', () => {
  const current = [
    { id: ROOT, parent: null }, { id: `${ROOT}.top`, parent: `${ROOT}.shelf` }, { id: `${ROOT}.shelf`, parent: ROOT },
    { id: `${ROOT}.shelf.label`, parent: `${ROOT}.shelf` }
  ];
  const ops = diffHierarchy(hierarchy, current, ROOT, (id) => ({ kind: id.endsWith('label') ? 'Mesh' : 'Group' }));
  assert.deepEqual(ops.map((o) => `${o.op}:${o.id}`), [`remove:${ROOT}.leg`, `create:${ROOT}.shelf`, `create:${ROOT}.shelf.label`, `reparent:${ROOT}.top`]);
  assert.deepEqual(applyStructureOps(hierarchy, ops, ROOT), [...current].sort((a, b) => a.id.localeCompare(b.id)));
});

test('migrates a schema 1 package to schema 2 and still validates it as schema 1', () => {
  // Build a genuine schema 1 package: the format as shipped before this lane.
  const v1 = { format: 'cadjs-asset-package', schemaVersion: 1, packageVersion: '1.2.0', assetId: ROOT, assetType: 'three-object', createdAt: '2026-10-01T00:00:00.000Z',
    source: { module: 'm', symbol: 's', baselineFingerprint: 'fp-1' }, compatibility: { assetContract: 1 }, parentPackage: null,
    changes: base.changes, metadata: { author: '', notes: 'old' } };
  v1.checksum = hashValue(v1);
  const imported = validateAssetPackage(v1);
  assert.equal(imported.schemaVersion, 1);
  assert.equal(imported.structure, undefined);
  const migrated = migrateAssetPackage(v1);
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.structure, { ops: [] });
  assert.deepEqual(migrated.changes, v1.changes);
  assert.equal(migrated.metadata.migratedFrom, 1);
  assert.equal(migrated.metadata.notes, 'old');
  assert.notEqual(migrated.checksum, v1.checksum);
  assert.equal(migrateAssetPackage(migrated).checksum, migrated.checksum, 'migrating schema 2 is a no-op');
  const tampered = { ...v1, packageVersion: '9.9.9' };
  assert.throws(() => migrateAssetPackage(tampered), /checksum/);
  assert.throws(() => validateAssetPackage({ ...v1, structure: { ops: [] } }), /Schema 1 packages cannot carry structure/);
  assert.throws(() => validateAssetPackage({ ...v1, schemaVersion: 3 }), /Unsupported asset package schema/);
});

let failures = 0;
for (const item of tests) {
  try { await item.callback(); console.log(`✓ ${item.name}`); }
  catch (error) { failures++; console.error(`✗ ${item.name}`); console.error(error.stack || error.message); }
}
console.log(`\n${tests.length - failures}/${tests.length} tests passed`);
if (failures) process.exitCode = 1;
