import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveTargetLink, sourceLink, originalContextLink, registerKnownTargets } from '../js/links.mjs';
import { requestedSpecimen, mountSpecimenLinks } from '../../labs/shared/specimen-link.js';

const inventory = JSON.parse(readFileSync(new URL('../../labs/asset_inventory.json', import.meta.url), 'utf8'));
registerKnownTargets(inventory.targets);
const target = (key) => inventory.targets[key];

test('every inventoried target resolves beneath the repository URL prefix', () => {
  const rootUrl = 'https://example.test/michi/';
  for (const value of Object.values(inventory.targets)) {
    const url = new URL(resolveTargetLink(value, { rootUrl }));
    assert.equal(url.origin, 'https://example.test');
    assert.ok(url.pathname.startsWith('/michi/'), JSON.stringify(value));
  }
});

test('focused specimens route to the exact catalog selector and DOM anchor', () => {
  assert.equal(resolveTargetLink(target('fences/corral')), '../labs/fences/?specimen=corral#specimen-corral');
  assert.equal(resolveTargetLink(target('ground/slabs')), '../labs/ground/?specimen=slabs#v-slabs');
  assert.equal(resolveTargetLink(target('grass/bezier')), '../labs/grass/?specimen=bezier#bezier');
  assert.equal(resolveTargetLink(target('machiya/original-secret')), '../labs/machiya/?specimen=original-secret#specimen-original-secret');
  assert.equal(resolveTargetLink(target('pagoda/orig-tower')), '../labs/pagoda/?specimen=orig-tower#specimen-orig-tower');
});

test('benches and interactions retain their real destinations', () => {
  assert.equal(resolveTargetLink(target('ranges/wall-mass')), '../labs/ranges/?wall4=mass#wall');
  assert.equal(resolveTargetLink(target('interiors/pottery')), '../labs/interiors/?craft=pottery#craft');
  assert.equal(resolveTargetLink(target('interiors/bat-cup')), '../labs/interiors/?room=garden#house');
  assert.equal(resolveTargetLink(target('interiors/garden')), '../labs/interiors/?room=garden&specimen=garden#specimen-garden');
});

test('review evidence uses the real review URL rather than a fictitious lab', () => {
  assert.equal(resolveTargetLink(target('tree/hero')), '../tools/tree_preview.html?sheet=hero');
  assert.equal(resolveTargetLink(target('cat/face')), '../tools/cat_preview.html?sheet=face');
  assert.equal(resolveTargetLink(target('summit-review/whole-scene')), '../tools/summit_preview.html?view=meditation');
});

test('benches outside the inventory are rejected (allowlist derived from the inventory)', () => {
  assert.throws(() => resolveTargetLink({ lab: 'interiors', kind: 'bench', selector: 'not-a-craft' }), /Unknown interiors craft/);
  assert.throws(() => resolveTargetLink({ lab: 'ranges', kind: 'bench', selector: 'not-a-bench' }), /Unknown ranges bench/);
});

test('external URLs, traversal and fabricated selectors are rejected', () => {
  for (const url of ['https://evil.test/', '//evil.test/', '../private', 'tools/../../private', 'tools/%2e%2e/private', 'tools\\evil']) {
    assert.throws(() => resolveTargetLink({ url }));
  }
  assert.throws(() => resolveTargetLink({ lab: 'unknown', selector: 'foo' }));
  assert.throws(() => resolveTargetLink({ lab: 'fences', selector: 'x"><script>' }));
  assert.throws(() => resolveTargetLink(target('fences/corral'), { rootUrl: 'file:///tmp/' }));
});

test('source links include a verified line only when one is supplied', () => {
  assert.equal(sourceLink({ file: 'src/countryside.js', anchor: 'buildYarn' }, { line: 3452 }), 'https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/blob/main/src/countryside.js#L3452');
  assert.ok(!sourceLink({ file: 'src/cat.js' }, { line: NaN }).includes('#L'));
  assert.throws(() => sourceLink({ file: '../secret' }));
});

test('game-context links are explicitly scene references and preserve normal game startup', () => {
  const summit = originalContextLink(inventory.assets.find((a) => a.id === 'summit-meadow'));
  assert.equal(summit.href, '../tools/summit_preview.html?view=meditation');
  assert.equal(summit.wholeScene, true);
  const unknown = originalContextLink({ id: 'unknown', sources: [] });
  assert.equal(unknown.href, '../index.html');
  assert.match(unknown.note, /does not teleport/);
});

test('specimen requests preserve unrelated flags and reject malformed input', () => {
  assert.equal(requestedSpecimen({ search: '?hour=18&specimen=game-torii', hash: '#other' }), 'game-torii');
  assert.equal(requestedSpecimen({ search: '', hash: '#specimen-moss' }), 'moss');
  assert.equal(requestedSpecimen({ search: '?specimen=%3Cscript%3E', hash: '' }), null);
  assert.equal(requestedSpecimen({ search: '', hash: '#specimen-%FF' }), null);
});

function card(existingId = '') {
  return { id: existingId, hidden: true, dataset: {}, style: {}, parentElement: null,
    classList: { add(value) { this.value = value; } }, hasAttribute() { return false; },
    scrollIntoView(options) { this.scroll = options; }, focus(options) { this.focused = options; } };
}

test('deep linking reveals the requested lazy card without constructing its renderer', () => {
  const first = card('v-first'), second = card();
  let picked = null;
  const items = [{ id: 'first', card: first }, { id: 'second', card: second }];
  const selected = mountSpecimenLinks(items, { document: { body: {} }, location: { search: '?specimen=second', hash: '' }, onSelect: (item) => { picked = item.id; } });
  assert.equal(selected, items[1]);
  assert.equal(first.id, 'v-first');
  assert.equal(second.id, 'specimen-second');
  assert.equal(first.hidden, true);
  assert.equal(second.hidden, false);
  assert.equal(second.classList.value, 'catalog-specimen-focus');
  assert.equal(picked, 'second');
  assert.equal(second.scroll.block, 'center');
});
