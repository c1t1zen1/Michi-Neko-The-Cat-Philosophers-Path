import assert from 'node:assert/strict';
import {
  classifyFile, createCatalog, extractSourceMetadata, fingerprintDescriptor, normalizePath, slugify
} from '../src/catalog.mjs';
import {
  createProviderRequest, extractJson, extractProviderText, normalizeAgentSettings, validateAgentPlan
} from '../src/agent-protocol.mjs';

const tests = [];
const test = (name, callback) => tests.push({ name, callback });

test('normalizes Windows paths and classifies supported files', () => {
  assert.equal(normalizePath('src\\cat.js'), 'src/cat.js');
  assert.equal(classifyFile('models/cat.glb'), 'model');
  assert.equal(classifyFile('docs/cat.jpg'), 'image');
  assert.equal(classifyFile('src/cat.js?v=1'), 'source');
});

test('extracts Three.js classes, builders, geometries, materials, and object types', () => {
  const metadata = extractSourceMetadata(`
    import * as THREE from 'three';
    export class Cat {
      buildHead() {
        return new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshToonMaterial());
      }
    }
  `, 'src/cat.js');
  assert.deepEqual(metadata.classes, ['Cat']);
  assert.deepEqual(metadata.builders, ['buildHead']);
  assert.deepEqual(metadata.geometries, ['SphereGeometry']);
  assert.deepEqual(metadata.materials, ['MeshToonMaterial']);
  assert.deepEqual(metadata.objectTypes, ['Mesh']);
});

test('creates a sorted source and asset catalogue', () => {
  const sources = { 'src/cat.js': "import * as THREE from 'three'; export class Cat {\n  buildTail() {}\n}" };
  const catalog = createCatalog(['src/cat.js', 'assets/new-model.glb', 'docs/reference.png'], (file) => sources[file] || '');
  assert.equal(catalog.stats.models, 1);
  assert.equal(catalog.stats.images, 1);
  assert.ok(catalog.entries.some((entry) => entry.symbol === 'Cat'));
  assert.ok(catalog.entries.some((entry) => entry.symbol === 'buildTail'));
});

test('produces stable, readable descriptor fingerprints', () => {
  const value = fingerprintDescriptor({ source: 'game', path: 'Scene/Cat/Head', type: 'Group', name: 'Head' });
  assert.equal(value, slugify('game__Scene/Cat/Head__Group__Head'));
});

test('normalizes and clamps AI provider settings', () => {
  const settings = normalizeAgentSettings({ provider: 'openai', temperature: 9, topP: 0, maxTokens: 2, reasoning: 'high' });
  assert.equal(settings.provider, 'openai');
  assert.equal(settings.temperature, 2);
  assert.equal(settings.topP, 0.01);
  assert.equal(settings.maxTokens, 128);
  assert.equal(settings.reasoning, 'high');
});

test('extracts fenced plans and rejects unsupported actions', () => {
  const parsed = extractJson('```json\n{"summary":"shape","actions":[{"type":"distort","params":{"mode":"bend"}}]}\n```');
  assert.equal(validateAgentPlan(parsed).actions[0].target, 'selection');
  assert.throws(() => validateAgentPlan({ actions: [{ type: 'runJavaScript' }] }), /Unsupported agent action/);
});

test('builds OpenAI-compatible multimodal requests for local and OpenRouter providers', () => {
  const payload = { instruction: 'make it rounder', context: { selectionUuid: 'abc' }, references: [{ name: 'cat.png', dataUrl: 'data:image/png;base64,AAAA' }] };
  const local = createProviderRequest({ provider: 'local', reasoning: 'high' }, payload);
  assert.equal(local.url, 'http://127.0.0.1:8080/v1/chat/completions');
  assert.equal(local.body.messages[0].content[1].type, 'image_url');
  assert.equal('reasoning_effort' in local.body, false);
  const router = createProviderRequest({ provider: 'openrouter', apiKey: 'secret' }, payload);
  assert.equal(router.headers.authorization, 'Bearer secret');
  assert.equal(router.body.response_format.type, 'json_object');
});

test('builds Anthropic image requests and extracts provider text', () => {
  const request = createProviderRequest({ provider: 'anthropic', apiKey: 'secret', maxTokens: 2048, reasoning: 'high' }, { instruction: 'inspect', context: {}, references: [{ dataUrl: 'data:image/jpeg;base64,BBBB' }] });
  assert.equal(request.body.messages[0].content[1].source.media_type, 'image/jpeg');
  assert.equal(request.body.thinking.budget_tokens, 1920);
  assert.equal(extractProviderText('anthropic', { content: [{ type:'text', text:'{"actions":[]}' }] }), '{"actions":[]}');
  assert.equal(extractProviderText('openai', { choices:[{ message:{ content:'ok' } }] }), 'ok');
});

let failures = 0;
for (const item of tests) {
  try {
    await item.callback();
    console.log(`✓ ${item.name}`);
  } catch (error) {
    failures++;
    console.error(`✗ ${item.name}`);
    console.error(error.stack || error.message);
  }
}
console.log(`\n${tests.length - failures}/${tests.length} tests passed`);
if (failures) process.exitCode = 1;