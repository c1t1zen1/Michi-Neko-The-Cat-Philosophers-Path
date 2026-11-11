import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRecords, emptyWorkspace } from '../js/model.mjs';
import { builtinPlan, validatePlan, parsePlan, buildContext, callProvider } from '../js/assistant.mjs';
const inventory = JSON.parse(readFileSync(new URL('../../labs/asset_inventory.json', import.meta.url), 'utf8'));
const records = createRecords(inventory, emptyWorkspace());

test('local guide produces a real coverage query instead of hallucinating assets', () => {
  const plan = builtinPlan('Find shrine assets without focused lab studies', records);
  assert.match(plan.actions[0].query, /is:gap/);
  assert.match(plan.actions[0].query, /group:"Shrine"/);
  assert.equal(plan.actions[0].type, 'search');
});
test('selected-only local changes do not hide the catalog behind an instruction sentence', () => {
  const plan = builtinPlan('Mark selected assets as research and high priority', records, ['key', 'larry']);
  assert.deepEqual(plan.actions, [{ type: 'annotate', assetIds: ['key', 'larry'], patch: { status: 'research', priority: 'high' } }]);
});
test('AI output cannot edit source coverage, run code, name arbitrary URLs or invent IDs', () => {
  const action = (item) => validatePlan({ actions: [item] }, records);
  assert.throws(() => action({ type: 'execute', code: 'alert(1)' }), /Unsupported/);
  assert.throws(() => action({ type: 'annotate', assetIds: ['key'], patch: { coverage: 'direct' } }), /Unsupported/);
  assert.throws(() => action({ type: 'select', assetIds: ['invented'] }), /unknown/);
  assert.throws(() => action({ type: 'open', assetId: 'key', destination: 'https://example.com' }), /unsupported/);
});
test('fenced structured results validate; invalid status and filters fail before application', () => {
  assert.equal(parsePlan('```json\n{"summary":"Keys","actions":[{"type":"search","query":"id:key"}]}\n```', records).actions[0].query, 'id:key');
  assert.throws(() => validatePlan({ actions: [{ type: 'search', query: 'alien:yes' }] }, records), /Unknown search/);
  assert.throws(() => validatePlan({ actions: [{ type: 'annotate', assetIds: ['key'], patch: { status: 'published' } }] }, records), /Unknown production/);
});
test('model context includes the complete catalog but no credentials', () => {
  const context = buildContext(records, ['key'], ['key', 'key-rock']);
  assert.equal(context.assets.length, inventory.assets.length);
  assert.equal(context.selectedDetails[0].id, 'key');
  assert.ok(!JSON.stringify(context).includes('apiKey'));
});
test('provider integration reuses real chat protocol and returns a catalog-specific plan', async () => {
  let request;
  const response = await callProvider({ provider: 'custom', baseUrl: 'http://127.0.0.1:9876/v1', model: 'test-model', apiKey: 'session-test', structured: 'json_object' }, { instruction: 'Find key', context: buildContext(records) }, {
    fetchImpl: async (url, opts) => { request = { url, ...opts }; return new Response(JSON.stringify({ choices: [{ message: { content: '{"summary":"Keys","actions":[{"type":"search","query":"id:key"}]}' } }], usage: { prompt_tokens: 50, completion_tokens: 12 } }), { headers: { 'Content-Type': 'application/json' } }); }
  });
  assert.equal(request.url, 'http://127.0.0.1:9876/v1/chat/completions');
  assert.equal(request.headers.authorization, 'Bearer session-test');
  assert.match(JSON.parse(request.body).messages[0].content, /asset librarian/);
  assert.equal(parsePlan(response.text, records).summary, 'Keys');
});
test('non-HTTP provider URLs and truncated provider results are rejected', async () => {
  await assert.rejects(callProvider({ provider: 'custom', baseUrl: 'file:///etc' }, { instruction: 'test' }), /http/);
  await assert.rejects(callProvider({ provider: 'custom', baseUrl: 'http://localhost:99/v1' }, { instruction: 'test' }, { fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' }, finish_reason: 'length' }] })) }), /cut short/);
});
