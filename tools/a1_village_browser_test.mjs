#!/usr/bin/env node
// Browser checks for the a1-village changes that need the real three.js or the
// running game (the Node units are tools/a1_village_test.mjs):
//   1. the fence bake (src/kit/fences/culm.js bake) equals the original baker,
//      geo.clone().applyMatrix4() per copy merged by mergeGeometries() (the
//      oracle, kept here), byte for byte: attributes, index type, userData,
//      groups, bounds, on culm and knot geometries of every tier;
//   2. the kit sound sink (src/main.js): a pack sound plays for a near event,
//      not for one 300 m away, not twice within its gap, lantern kindles at
//      most one per 0.15 s, nothing while paused, nothing on a ?shot=1 boot;
//   3. the kit prefetch (src/bootstrap.js): saved settings modular + high
//      start the kit download before the runtime's preload fetches
//      kit-overrides.json; classic and a saved low quality download no family.
//
//   node tools/a1_village_browser_test.mjs        (needs PLAYWRIGHT_MODULE; ~1 min on Metal)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { openPage, waitForExpression } = await import(join(ROOT, 'tools/headless.mjs'));
const { currentTag } = await import(join(ROOT, 'tools/kit_index.mjs'));
const TAG = currentTag(ROOT);
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? '  — ' + detail : ''}`); };

/* ------------------------------------------------------------- 1. bake --- */
{
  const s = await openPage('/tools/villagers_check.html', { timeout: 120 });
  try {
    const r = await s.page.evaluate(async (tag) => {
      const THREE = await import('three');
      const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
      const { bake, culmGeometry, knotGeometry } = await import(`/src/kit/fences/culm.js?v=${tag}`);
      // the oracle: the baker as it was before a1-village (src/kit/fences/culm.js at 98c3a61)
      const bakeReference = (geo, objs, tints = null) => {
        const parts = objs.map((o, i) => {
          const g = geo.clone();
          g.applyMatrix4(o.matrix);
          if (tints) { const c = g.attributes.color, t = tints[i]; for (let k = 0; k < c.count; k++) c.setXYZ(k, c.getX(k) * t[0], c.getY(k) * t[1], c.getZ(k) * t[2]); }
          else g.deleteAttribute('color');
          return g;
        });
        const out = mergeGeometries(parts);
        for (const p of parts) p.dispose();
        return out;
      };
      let s = 7; const r = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
      const same = (a, b) => a && b && a.itemSize === b.itemSize && a.normalized === b.normalized && a.array.constructor === b.array.constructor
        && a.array.length === b.array.length && a.array.every((v, i) => Object.is(v, b.array[i]));
      const bad = []; let cases = 0;
      for (const tier of ['hero', 'mid', 'far']) for (const kind of ['culm', 'knot']) for (const copies of [1, 7, 60, 600]) for (const withT of [false, true]) {
        if (kind === 'knot' && withT) continue;
        const geo = kind === 'culm' ? culmGeometry(THREE, tier) : knotGeometry(THREE, tier);
        const objs = [], tints = [];
        for (let i = 0; i < copies; i++) {
          const o = new THREE.Object3D();
          o.position.set(r() * 20 - 10, r() * 3, r() * 20 - 10); o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(0.02 + r() * 0.1, 0.5 + r() * 3, 0.02 + r() * 0.1); o.updateMatrix();
          objs.push(o); tints.push([0.6 + r() * 0.4, 0.6 + r() * 0.4, 0.6 + r() * 0.4]);
        }
        const A = bakeReference(geo, objs, withT ? tints : null), B = bake(THREE, geo, objs, withT ? tints : null);
        const names = Object.keys(A.attributes);
        const ok = names.join() === Object.keys(B.attributes).join() && names.every((n) => same(A.attributes[n], B.attributes[n]))
          && (!A.index === !B.index) && (!A.index || same(A.index, B.index))
          && JSON.stringify(A.userData) === JSON.stringify(B.userData) && JSON.stringify(A.groups) === JSON.stringify(B.groups)
          && A.boundingBox === B.boundingBox && A.boundingSphere === B.boundingSphere;
        cases++;
        if (!ok) bad.push(`${tier}/${kind}/${copies}/${withT ? 'tinted' : 'plain'}`);
      }
      return { cases, bad };
    }, TAG);
    check(`fence bake equals the original baker (${r.cases} culm/knot cases, every tier, up to 600 copies, Uint16 and Uint32 index)`, r.bad.length === 0, r.bad.slice(0, 4).join(', '));
  } finally { await s.close(); }
}

/* ------------------------------------------------------- 2. sound sink --- */
// Count what reaches the kit's sfx bus: a probe gain node stands in for game.audio.buses.sfx
// (the sink plays kit sounds into buses.sfx; the game's own one-shots use audio.master, the
// original bus, so ambient birds and chimes are not counted), and every connect() into it counts.
const COUNT_NODES = `(() => {
  const a = game.audio;
  window.__nodes = 0;
  if (!a.ctx) return;                              // a ?shot=1 boot never starts audio
  const probe = a.ctx.createGain();
  probe.connect(a.buses.sfx); a.buses.sfx = probe; window.__nodes = 0;
  const f = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest) { if (dest === probe) window.__nodes++; return f.apply(this, arguments); };
})()`;
const fire = (page, events, waitMs = 450) => page.evaluate(async ({ events, waitMs }) => {
  const before = window.__nodes, p = game.player.mesh.position;
  for (const [ev, dx, delay] of events) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    game.assets.audio.play(ev, { pos: p.clone().setX(p.x + dx) });
  }
  await new Promise((r) => setTimeout(r, waitMs));
  return window.__nodes - before;
}, { events, waitMs });
{
  const s = await openPage('/index.html?assets=modular', { session: { catwalk_autostart: 'new' }, timeout: 240, ignore: ['cad-overrides.json'] });
  try {
    const { page } = s;
    await waitForExpression(page, 'window.game && game.menu && game.menu.isPlaying && game.player && game.player.mesh', Date.now() + 200000);
    await page.evaluate(COUNT_NODES);
    await page.evaluate(() => game.audio.ctx && game.audio.ctx.resume());
    const running = await page.evaluate(() => game.audio.isRunning);
    check('the AudioContext runs (headless autoplay)', running);
    const one = await fire(page, [['lantern.kindle', 2, 0]]);          // loads the pack, then plays
    check('a kindle 2 m away plays (pack loaded on the first event)', one > 0, `${one} nodes`);
    const far = await fire(page, [['lantern.kindle', 300, 0]]);
    check('a kindle 300 m away is silent', far === 0, `${far} nodes`);
    const twoFast = await fire(page, [['lantern.kindle', 2, 0], ['lantern.kindle', 2, 50]]);
    check('two kindles 50 ms apart play once (gap 0.15 s)', twoFast === one, `${twoFast} nodes, one kindle = ${one}`);
    const twoSlow = await fire(page, [['lantern.kindle', 2, 0], ['lantern.kindle', 2, 220]]);
    check('two kindles 220 ms apart both play', twoSlow === 2 * one, `${twoSlow} nodes`);
    const clack = await fire(page, [['garden.shishi.clack', 2, 0], ['garden.shishi.clack', 2, 100]]);
    const clackOne = await fire(page, [['garden.shishi.clack', 2, 0]]);
    check('other events: two 100 ms apart both play (gap 0.06 s)', clack === 2 * clackOne && clackOne > 0, `${clack} vs one ${clackOne}`);
    await page.evaluate(() => { game.menu.mode = 'paused'; });
    const paused = await fire(page, [['garden.shishi.clack', 2, 0]]);
    await page.evaluate(() => { game.menu.mode = 'playing'; });
    check('nothing while paused', paused === 0, `${paused} nodes`);
    const unknown = await fire(page, [['not.an.event', 2, 0]]);
    check('an unknown event is ignored', unknown === 0);
    check('no page errors (modular boot)', s.errors.length === 0, s.errors.slice(0, 2).join(' | '));
  } finally { await s.close(); }
}
{
  const s = await openPage('/index.html?assets=modular&shot=1', { session: { catwalk_autostart: 'new' }, timeout: 240, ignore: ['cad-overrides.json'] });
  try {
    const { page } = s;
    await waitForExpression(page, 'window.game && game.menu && game.menu.isPlaying && game.player && game.player.mesh', Date.now() + 200000);
    await page.evaluate(COUNT_NODES);
    const n = await fire(page, [['lantern.kindle', 2, 0], ['garden.shishi.clack', 2, 200]]);
    const pack = await page.evaluate(() => performance.getEntriesByType('resource').some((e) => e.name.includes('kit/sfx_pack.js')));
    check('a ?shot=1 capture boot is silent and never loads the pack', n === 0 && !pack, `${n} nodes, pack ${pack}`);
  } finally { await s.close(); }
}

/* --------------------------------------------------------- 3. prefetch --- */
const kitRequests = (page) => page.evaluate(() => performance.getEntriesByType('resource')
  .filter((e) => /\/src\/kit\/[a-z]+\/index\.js|\/src\/kit\/index\.js|kit-overrides\.json|\/src\/kit\/materials\.js/.test(e.name))
  .map((e) => ({ name: e.name.replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, ''), start: e.startTime })));
const BIG_BUFFER = 'performance.setResourceTimingBufferSize(5000)';   // the game requests more than the default 250 resources
const boot = async (settings, query = '') => {
  const s = await openPage('/index.html' + query, { session: { catwalk_autostart: 'new' }, local: settings ? { catwalk_settings_v1: settings } : {}, timeout: 240, ignore: ['cad-overrides.json'], init: BIG_BUFFER });
  try {
    await waitForExpression(s.page, 'window.game && game.menu && game.menu.isPlaying', Date.now() + 200000);
    return { reqs: await kitRequests(s.page), set: await s.page.evaluate(() => game.assets.summary().set), errors: s.errors };
  } finally { await s.close(); }
};
{
  const m = await boot({ assetSet: 'modular', quality: 'high' });
  const index = m.reqs.find((e) => e.name === 'src/kit/index.js'), over = m.reqs.find((e) => e.name.includes('kit-overrides.json'));
  const fams = m.reqs.filter((e) => /^src\/kit\/[a-z]+\/index\.js$/.test(e.name));
  const early = fams.filter((e) => over && e.start < over.start).length;
  check('saved modular + high: the kit index and every family are requested before preload fetches kit-overrides.json',
    m.set === 'modular' && index && over && index.start < over.start && fams.length >= 20 && early === fams.length,
    index && over ? `index at ${index.start.toFixed(0)} ms, ${early}/${fams.length} families before kit-overrides.json at ${over.start.toFixed(0)} ms` : JSON.stringify(m.reqs.slice(0, 4)));
  const c = await boot(null);
  check('classic default: no kit family, index or materials module requested', c.set === 'classic' && c.reqs.length === 0, JSON.stringify(c.reqs));
  const low = await boot({ assetSet: 'modular', quality: 'low' });
  check('saved modular + low: no kit family requested (the low lock)', low.set === 'classic' && !low.reqs.some((e) => /index\.js|materials\.js/.test(e.name)), JSON.stringify(low.reqs));
  check('no page errors (prefetch boots)', [...m.errors, ...c.errors, ...low.errors].length === 0);
}

console.log(`\na1-village browser checks: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
