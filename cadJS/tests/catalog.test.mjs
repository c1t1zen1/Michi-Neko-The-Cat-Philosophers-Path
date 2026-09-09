import assert from 'node:assert/strict';
import {
  classifyFile, createCatalog, extractSourceMetadata, fingerprintDescriptor, normalizePath, slugify
} from '../src/catalog.mjs';
import {
  createProviderRequest, extractJson, extractProviderText, normalizeAgentSettings, validateAgentPlan
} from '../src/agent-protocol.mjs';
import {
  changedObjectComponents, changedObjectStates, createAssetPackage, evaluateAssetCompatibility, hashValue, normalizeAssetId,
  stableStringify, validateAssetPackage
} from '../src/asset-package.mjs';

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

test('creates deterministic asset package hashes and semantic identifiers', () => {
  assert.equal(stableStringify({ z:1, a:{ y:2, x:3 } }), '{"a":{"x":3,"y":2},"z":1}');
  assert.equal(hashValue({ a:1, b:2 }), hashValue({ b:2, a:1 }));
  assert.equal(normalizeAssetId(' Character / Michi Neko '), 'character.michi-neko');
});

test('creates, validates, and detects tampering in versioned asset packages', () => {
  const assetPackage = createAssetPackage({
    assetId: 'character.michi-neko', packageVersion: '0.2.0', assetType: 'procedural-transform-rig',
    source: { module:'src/cat.js', symbol:'Cat', baselineFingerprint:'fnv1a32-12345678' },
    changes: { objects: { 'character.michi-neko.head': { position:[0,1,0] } } },
    metadata: { notes:'Rounder head' }
  });
  assert.equal(validateAssetPackage(assetPackage).packageVersion, '0.2.0');
  assert.throws(() => validateAssetPackage({ ...assetPackage, packageVersion:'0.2.1' }), /checksum/);
  assert.throws(() => createAssetPackage({ packageVersion:'version two' }), /semantic versioning/);
});

test('reports package baseline compatibility and extracts incremental changes', () => {
  const baseline = { 'character.cat.head': hashValue({ scale:[1,1,1] }) };
  const states = { 'character.cat.head': { scale:[1.2,1,1] }, 'character.cat.body': { visible:true } };
  const changes = changedObjectStates(baseline, states);
  assert.deepEqual(Object.keys(changes).sort(), ['character.cat.body', 'character.cat.head']);
  const assetPackage = createAssetPackage({ assetId:'character.cat', source:{ baselineFingerprint:'base-1' }, changes:{ objects:changes } });
  assert.equal(evaluateAssetCompatibility(assetPackage, { assetId:'character.cat', baselineFingerprint:'base-1' }).compatible, true);
  assert.match(evaluateAssetCompatibility(assetPackage, { assetId:'character.cat', baselineFingerprint:'base-2' }).issues[0], /different asset baseline/);
});

test('emits sparse object components instead of duplicating unchanged geometry', () => {
  const baseline = { type:'Mesh', transform:{ position:[0,0,0] }, properties:{ visible:true }, geometry:{ attributes:{ position:[1,2,3] } }, materials:[{ color:1 }] };
  const current = { ...baseline, transform:{ position:[0,1,0] } };
  assert.deepEqual(changedObjectComponents(baseline, current), { type:'Mesh', transform:{ position:[0,1,0] } });
  assert.equal(changedObjectComponents(baseline, { ...baseline }), null);
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