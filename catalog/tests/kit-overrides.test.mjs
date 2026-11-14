import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KIT_OVERRIDES_FORMAT, emptyOverrides, validateOverrides, setEntry, removeEntry, serializeOverrides } from '../js/kit-overrides.mjs';

test('the empty document matches the committed repo-root file and the game format', () => {
  assert.deepEqual(emptyOverrides(), { format: 'michi-neko-kit-overrides', assets: {} });
  const committed = JSON.parse(readFileSync(new URL('../../kit-overrides.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateOverrides(committed), committed);
});
test('setEntry stores only parameters that differ from the defaults and removeEntry clears an asset', () => {
  let doc = setEntry(emptyOverrides(), 'toro', { variant: 'modular', params: { height: 1.4, moss: 0.4 } }, { height: 1, moss: 0.4 });
  assert.deepEqual(doc.assets.toro, { variant: 'modular', params: { height: 1.4 } });
  doc = setEntry(doc, 'toro', { variant: 'modular', params: { height: 1 } }, { height: 1 });
  assert.deepEqual(doc.assets.toro, { variant: 'modular' });
  assert.deepEqual(removeEntry(doc, 'toro').assets, {});
});
test('validateOverrides enforces the allowlist, variants and parameter shapes', () => {
  const ok = { format: KIT_OVERRIDES_FORMAT, assets: { toro: { variant: 'classic', params: { a_b: true, mode: 'x', n: 2 } } } };
  assert.deepEqual(validateOverrides(ok, ['toro']), ok);
  assert.throws(() => validateOverrides(ok, ['nest']), /not a registered/);
  assert.throws(() => validateOverrides({ ...ok, format: 'x' }), /format/);
  assert.throws(() => validateOverrides({ format: KIT_OVERRIDES_FORMAT, assets: { toro: { variant: 'x' } } }), /variant/);
  assert.throws(() => validateOverrides({ format: KIT_OVERRIDES_FORMAT, assets: { 'Bad Id': {} } }), /asset id/);
  assert.throws(() => validateOverrides({ format: KIT_OVERRIDES_FORMAT, assets: { toro: { params: { n: NaN } } } }), /unusable/);
});
test('serializeOverrides ends with a newline and round-trips', () => {
  const doc = setEntry(emptyOverrides(), 'toro', { variant: 'modular' });
  const text = serializeOverrides(doc); assert.ok(text.endsWith('\n')); assert.deepEqual(JSON.parse(text), doc);
});
