import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAssetLibraryApi } from '../server.mjs';
import { emptyWorkspace } from '../js/model.mjs';

async function fixture(t, fetchImpl) {
  const root = await mkdtemp(join(tmpdir(), 'michi-catalog-api-'));
  await mkdir(join(root, 'labs')); await mkdir(join(root, 'catalog'));
  const inventory = await readFile(new URL('../../labs/asset_inventory.json', import.meta.url), 'utf8');
  await writeFile(join(root, 'labs/asset_inventory.json'), inventory); await writeFile(join(root, 'catalog/metadata.json'), JSON.stringify(emptyWorkspace()));
  const api = createAssetLibraryApi({ repoRoot: root, fetchImpl });
  const server = createServer(async (req, res) => { if (!await api(req, res)) { res.statusCode = 404; res.end('Other route'); } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise((done) => server.close(done)); await rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}/api/asset-library/`;
  const post = (path, value, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value) });
  return { root, base, post, inventory };
}

test('local health and workspace endpoints report their actual capabilities', async (t) => {
  const { base } = await fixture(t);
  assert.equal((await (await fetch(base + 'health')).json()).persistence, 'repository');
  assert.equal((await (await fetch(base + 'workspace')).json()).workspace.revision, 0);
});
test('repository writes are atomic, revision checked and cannot change the audited inventory', async (t) => {
  const { root, post, inventory } = await fixture(t);
  const workspace = emptyWorkspace(); workspace.assets.key = { owner: 'Aki', status: 'research', notes: 'Warm brass' };
  const responses = await Promise.all([post('workspace', { workspace }), post('workspace', { workspace })]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const persisted = JSON.parse(await readFile(join(root, 'catalog/metadata.json'), 'utf8'));
  assert.equal(persisted.revision, 1); assert.equal(persisted.assets.key.owner, 'Aki');
  assert.equal(await readFile(join(root, 'labs/asset_inventory.json'), 'utf8'), inventory);
});
test('unknown asset fields and cross-origin saves are rejected before disk writes', async (t) => {
  const { post, root } = await fixture(t), workspace = emptyWorkspace(); workspace.assets.key = { coverage: 'direct' };
  assert.equal((await post('workspace', { workspace })).status, 400);
  assert.equal((await post('workspace', { workspace: emptyWorkspace() }, { Origin: 'https://unrelated.example' })).status, 403);
  assert.equal(JSON.parse(await readFile(join(root, 'catalog/metadata.json'), 'utf8')).revision, 0);
});
test('local guide API produces validated catalog actions without a provider request', async (t) => {
  const { post } = await fixture(t, () => { throw new Error('Provider must not be called'); });
  const response = await post('ai', { instruction: 'Mark selected as research', selectedIds: ['key'], settings: { provider: 'builtin' } });
  assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.provider, 'builtin'); assert.equal(data.plan.actions[0].type, 'annotate');
  assert.deepEqual(data.plan.actions[0].assetIds, ['key']);
});
test('real provider relay keeps keys transient and validates the returned action IDs', async (t) => {
  let outbound;
  const { post, root } = await fixture(t, async (url, options) => {
    outbound = { url, options };
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'A key study', answer: 'The key has a focused study.', actions: [{ type: 'select', assetIds: ['key'] }] }) } }] }));
  });
  const response = await post('ai', { instruction: 'Find the key', settings: { provider: 'custom', baseUrl: 'http://127.0.0.1:9999/v1', model: 'mock-model', apiKey: 'transient-key' } });
  assert.equal(response.status, 200); const data = await response.json();
  assert.equal(outbound.options.headers.authorization, 'Bearer transient-key'); assert.equal(data.plan.actions[0].assetIds[0], 'key');
  assert.ok(!JSON.stringify(data).includes('transient-key'));
  assert.ok(!(await readFile(join(root, 'catalog/metadata.json'), 'utf8')).includes('transient-key'));
});
