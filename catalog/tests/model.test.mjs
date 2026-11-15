import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyWorkspace, createRecords, validateWorkspace, normalizePatch, searchAssets, parseQuery, summarize, updateAssets, mergeWorkspaces, exportCSV } from '../js/model.mjs';
const inventory = JSON.parse(readFileSync(new URL('../../labs/asset_inventory.json', import.meta.url), 'utf8'));
const ids = inventory.assets.map((a) => a.id);
const records = () => createRecords(inventory, emptyWorkspace(), (asset) => ({ original: ['key', 'larry'].includes(asset.id), lab: asset.id === 'torii' }));

test('all audited entries are represented without treating dormant builders as active', () => {
  const rows = records(), stats = summarize(rows);
  assert.equal(stats.total, inventory.assets.length);
  assert.equal(stats.active + stats.inactive, stats.total);
  assert.equal(stats.focused + stats.gaps, stats.active);
  // jade-paw gained a direct lab-17 study at v-keepsakes (cb8ff3f); its related evidence stays, the best level is direct
  assert.equal(rows.find((a) => a.id === 'jade-paw').coverageLevel, 'direct');
  assert.deepEqual(rows.find((a) => a.id === 'jade-paw').coverage.map((c) => c.level), ['direct', 'related']);
});
test('field filters, quoted phrases, exclusions and alternatives combine precisely', () => {
  const rows = records();
  assert.deepEqual(searchAssets(rows, { query: 'id:key -id:rock' }).map((a) => a.id), ['key']);
  assert.ok(searchAssets(rows, { query: 'group:"Ground and water"' }).length > 8);
  assert.equal(searchAssets(rows, { query: 'GROUP:"Ground and water"' }).length, searchAssets(rows, { query: 'group:"Ground and water"' }).length);
  assert.ok(searchAssets(rows, { query: 'coverage:related|missing' }).every((a) => ['related', 'missing'].includes(a.coverageLevel)));
  assert.ok(searchAssets(rows, { query: 'group:Shrine -coverage:direct' }).every((a) => a.group === 'Shrine' && a.coverageLevel !== 'direct'));
  assert.deepEqual(searchAssets(rows, { query: 'cad:original' }).map((a) => a.id).sort(), ['key', 'larry']);
  assert.ok(searchAssets(rows, { query: '"secret-house key"' }).some((a) => a.id === 'key'));
});
test('invalid query fields and unclosed quotes are surfaced to the UI', () => {
  assert.match(parseQuery('password:secret').errors.join(' '), /Unknown search field/);
  assert.match(parseQuery('"tea house').errors.join(' '), /Close the quoted/);
});
test('empty collections return no results and explicit inactive queries use the lifecycle scope', () => {
  assert.equal(searchAssets(records(), { assetIds: [] }).length, 0);
  assert.equal(searchAssets(records(), { query: 'lifecycle:inactive' }).length, 0);
  assert.ok(searchAssets(records(), { query: 'lifecycle:inactive', lifecycle: 'all' }).length > 0);
});
test('production changes are separate from source evidence and support exact tag search', () => {
  const before = emptyWorkspace(), next = updateAssets(before, ['key'], { status: 'review', owner: 'Aki', tags: ['hero', 'kyoto'], notes: 'Worn brass' }, { at: '2026-11-11T19:00:00Z' });
  assert.equal(Object.keys(before.assets).length, 0);
  assert.equal(next.activity[0].assetIds[0], 'key');
  const rows = createRecords(inventory, next);
  assert.deepEqual(searchAssets(rows, { query: 'owner:Aki tag:hero status:review' }).map((a) => a.id), ['key']);
  assert.equal(rows.find((a) => a.id === 'key').coverageLevel, 'direct');
  assert.throws(() => normalizePatch({ coverage: 'direct' }), /Unsupported/);
  assert.throws(() => normalizePatch({ apiKey: 'secret' }), /Unsupported/);
});
test('workspace imports reject unknown IDs, invalid statuses and foreign collections', () => {
  const doc = emptyWorkspace();
  assert.deepEqual(validateWorkspace(doc, ids), doc);
  assert.throws(() => validateWorkspace({ ...doc, assets: { imaginary: {} } }, ids), /Unknown asset/);
  assert.throws(() => validateWorkspace({ ...doc, assets: { key: { status: 'shipped' } } }, ids), /Unknown production/);
  assert.throws(() => validateWorkspace({ ...doc, collections: [{ id: 'one', name: 'Bad', assetIds: ['missing'] }] }, ids), /unknown assets/);
});
test('CSV preserves commas/newlines and neutralizes spreadsheet formula prefixes', () => {
  const rows = createRecords(inventory, updateAssets(emptyWorkspace(), ['key'], { notes: '=HYPERLINK("external")', owner: 'Aki, Art' }));
  const csv = exportCSV(rows.filter((a) => a.id === 'key'));
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Aki, Art"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""external"")"'));
});
test('explicit conflict merges preserve unrelated work and use the current repository revision', () => {
  const base = emptyWorkspace(); base.revision = 8; base.assets.larry = { owner: 'Another artist' }; base.assets.key = { owner: 'Previous artist' };
  const draft = emptyWorkspace(); draft.revision = 2; draft.assets.key = { owner: 'Draft artist' };
  const merged = mergeWorkspaces(base, draft);
  assert.equal(merged.revision, 8); assert.equal(merged.assets.larry.owner, 'Another artist'); assert.equal(merged.assets.key.owner, 'Draft artist');
  assert.equal(base.assets.key.owner, 'Previous artist');
});
