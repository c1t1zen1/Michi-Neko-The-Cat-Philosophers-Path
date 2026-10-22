import { test, assert } from './harness.mjs';
import { defaultStore, migrateV1, resolveSettings, storeSettings } from '../src/agent/settings-store.js';

test('v1 session settings migrate with their key', () => {
  const { store, key } = migrateV1({ provider: 'openai', baseUrl: 'https://proxy.example/v1', model: 'gpt-x', apiKey: 'sk-1', temperature: 0.2, maxTokens: 6000, reasoning: 'low' });
  assert.equal(store.provider, 'openai');
  assert.deepEqual(store.perProvider.openai, { baseUrl: 'https://proxy.example/v1', model: 'gpt-x' });
  assert.equal(store.common.temperature, 0.2);
  assert.equal(key, 'sk-1');
  const s = resolveSettings(store, { openai: key });
  assert.equal(s.baseUrl, 'https://proxy.example/v1');
  assert.equal(s.apiKey, 'sk-1');
  assert.equal(s.maxTokens, 6000);
});

test('garbage v1 data yields defaults', () => {
  const { store, key } = migrateV1({ provider: 'nope' });
  assert.equal(store.provider, 'local');
  assert.equal(key, '');
});

test('each provider remembers its own base URL and model', () => {
  let store = defaultStore();
  store = storeSettings(store, resolveSettings(store, {}, 'local'), { baseUrl: 'http://127.0.0.1:9000/v1', model: 'm1' });
  store = storeSettings(store, resolveSettings(store, {}, 'openai'), { model: 'gpt-y' });
  assert.equal(resolveSettings(store, {}, 'local').baseUrl, 'http://127.0.0.1:9000/v1');
  assert.equal(resolveSettings(store, {}, 'local').model, 'm1');
  assert.equal(resolveSettings(store, {}, 'openai').model, 'gpt-y');
  assert.equal(resolveSettings(store, {}, 'openai').baseUrl, 'https://api.openai.com/v1');
});

test('shared generation settings apply to every provider', () => {
  let store = defaultStore();
  store = storeSettings(store, resolveSettings(store, {}, 'local'), { temperature: 0.9, applyMode: 'review', repairAttempts: 3 });
  const s = resolveSettings(store, {}, 'groq');
  assert.equal(s.temperature, 0.9);
  assert.equal(s.applyMode, 'review');
  assert.equal(s.repairAttempts, 3);
});
