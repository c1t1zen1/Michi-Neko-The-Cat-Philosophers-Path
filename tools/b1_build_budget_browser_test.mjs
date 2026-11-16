#!/usr/bin/env node
// Browser checks for the b1-build-budget draw-only canopy (ruling R89), which
// needs the real three.js (the Node units are tools/b1_build_budget_test.mjs):
//
//   1. every valley tree: Vegetation is built classic in the page and every
//      layoutTree() call's draws are taped; each tree's layout is then run
//      again from its tape on a bare Vegetation twice, classic (buildCanopy)
//      and as the modular set runs it (setFor 'modular', has true: drawCanopy
//      on a recording stream). Both consume exactly the tape, the recorded
//      canopy draws are the tape after the tree's turn and lean, value for
//      value, top and radius agree, and replayCanopy() grows the canopy
//      byte for byte as the classic layout does;
//   2. a spread of seeds: buildCanopy and drawCanopy on the same seed draw the
//      same values in the same order, for the valley's canopy options (hero
//      'leaves', rim 'masses', every kind) and the kit trees' canopyOptions()
//      in every style ('leaves', 'masses', 'clumps') and tier (hero, mid, far);
//   3. a kit tree that fails in a real boot: ?assets=modular with the 'sakura'
//      kit builder made to throw falls back to the classic tree, and every
//      sakura canopy it grows (the replay) is byte for byte the canopy a
//      classic boot grows for the same tree.
//
//   node tools/b1_build_budget_browser_test.mjs        (needs PLAYWRIGHT_MODULE; ~30 s on Metal)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { openPage, waitForExpression } = await import(join(ROOT, 'tools/headless.mjs'));
const { currentTag } = await import(join(ROOT, 'tools/kit_index.mjs'));
const TAG = currentTag(ROOT);
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? '  — ' + detail : ''}`); };

// In the page: a canopy's geometry as one hash (every attribute array's bits, the index, the extents).
const HASH = `(c) => {
  let h = 0x811c9dc5;
  const word = (w) => { h = Math.imul(h ^ (w & 0xffff), 0x01000193); h = Math.imul(h ^ (w >>> 16), 0x01000193); };
  const arr = (a) => { if (a instanceof Float32Array) { const u = new Uint32Array(a.buffer, a.byteOffset, a.length); for (let i = 0; i < u.length; i++) word(u[i]); } else for (let i = 0; i < a.length; i++) word(a[i]); };
  for (const k of ['branches', 'cards', 'tufts']) {
    const g = c[k]; if (!g || !g.attributes) { word(0xdead); continue; }
    for (const n of Object.keys(g.attributes).sort()) { for (let i = 0; i < n.length; i++) word(n.charCodeAt(i)); arr(g.attributes[n].array); }
    if (g.index) arr(g.index.array);
  }
  const f = new Float64Array([c.top, c.radius]); arr(new Uint32Array(f.buffer));
  return (h >>> 0).toString(16);
}`;

/* ------------------------------------------------- 1 + 2: in one page --- */
{
  const s = await openPage('/tools/villagers_check.html', { timeout: 180 });
  try {
    const r = await s.page.evaluate(async ({ tag, HASH }) => {
      const hash = eval(HASH);
      const THREE = await import('three');
      const F = await import(`/src/foliage.js?v=${tag}`);
      const V = await import(`/src/vegetation.js?v=${tag}`);
      const C = await import(`/src/countryside.js?v=${tag}`);
      const Hd = await import(`/src/hidden_places.js?v=${tag}`);
      const T = await import(`/src/kit/trees/build.js?v=${tag}`);
      const { mulberry32 } = await import(`/src/kit/rng.js?v=${tag}`);
      const { CLASSIC_ASSETS } = await import(`/src/kit/runtime.js?v=${tag}`);
      const out = { trees: 0, bad: [], seeds: 0, seedBad: [] };

      // 1. tape every layoutTree() of a classic valley build
      const taped = [];
      const layoutTree = V.Vegetation.prototype.layoutTree;
      V.Vegetation.prototype.layoutTree = function (x, z, scale, opts) {
        const real = this.rng, tape = [];
        this.rng = () => { const v = real(); tape.push(v); return v; };
        try {
          const L = layoutTree.call(this, x, z, scale, opts);
          taped.push({ x, z, scale, opts, tape, classic: hash(L.canopy), kind: L.kind, rim: L.rim, name: L.name });
          return L;
        } finally { this.rng = real; }
      };
      let veg;
      try {
        const scene = new THREE.Scene();
        const city = new C.Countryside(scene);
        new Hd.HiddenPlaces(scene, city);
        veg = new V.Vegetation(scene, city.colliders, {
          pathSamples: city.pathSamples, waterRects: city.waterRects, riverSamples: city.riverSamples, exclusionRects: city.vegetationExclusions
        });
      } finally { V.Vegetation.prototype.layoutTree = layoutTree; }
      const modular = { setFor: () => 'modular', has: () => true };
      for (const t of taped) {
        const run = (assets) => {
          const bare = Object.create(V.Vegetation.prototype);
          bare._treeCount = 0; bare.matTrunks = veg.matTrunks; bare.assets = assets;
          let i = 0;
          bare.rng = () => { if (i >= t.tape.length) throw new Error('past the tape'); return t.tape[i++]; };
          const L = bare.layoutTree(t.x, t.z, t.scale, t.opts);
          return { L, used: i, bare };
        };
        out.trees++;
        try {
          const a = run(CLASSIC_ASSETS), b = run(modular);
          const canopyTape = b.L.canopyReplay && b.L.canopyReplay.tape;
          const sameSeq = !!canopyTape && canopyTape.length === t.tape.length - 2 && canopyTape.every((v, k) => Object.is(v, t.tape[k + 2]));
          const replayed = canopyTape ? hash(b.bare.replayCanopy(b.L)) : null;
          const ok = a.used === t.tape.length && b.used === t.tape.length && hash(a.L.canopy) === t.classic && !a.L.canopyReplay && sameSeq
            && b.L.canopy.top === a.L.canopy.top && b.L.canopy.radius === a.L.canopy.radius && !b.L.canopy.branches && replayed === t.classic;
          if (!ok) out.bad.push(`${t.name}${t.rim ? ' (rim)' : ''}: classic ${a.used}/${t.tape.length}, draw-only ${b.used}, sequence ${sameSeq}, replay ${replayed === t.classic}`);
        } catch (e) { out.bad.push(`${t.name}${t.rim ? ' (rim)' : ''}: ${e.message}`); }
      }
      out.kinds = [...new Set(taped.map((t) => `${t.kind}${t.rim ? '/rim' : '/hero'}`))].sort();

      // 2. a spread of seeds over the valley's option sets and the kit's canopyOptions()
      const sets = [];
      const seen = new Set();
      for (const t of taped) {
        const key = JSON.stringify([t.opts, t.rim, t.scale]);
        if (seen.has(key)) continue; seen.add(key);
        const base = { scale: t.scale, colors: t.opts.colors, trunkH: t.opts.trunk.h, trunkR: t.opts.trunk.rTop * 1.15 };
        sets.push({ name: `valley ${t.kind} ${t.rim ? 'masses' : 'leaves'} ×${t.scale}`, opts: t.rim
          ? Object.assign(base, t.opts.canopy, t.opts.masses || {}, { style: 'masses' })
          : Object.assign(base, t.opts.canopy, t.opts.leaves || {}, { style: 'leaves' }) });
      }
      for (const kind of Object.keys(T.SPECIES)) for (const style of ['leaves', 'masses', 'clumps']) for (const tier of ['hero', 'mid', 'far']) {
        sets.push({ name: `kit ${kind} ${style} ${tier}`, opts: T.canopyOptions(T.SPECIES[kind], style, tier, { S: 1.2 }) });
      }
      const record = (seed) => { const g = mulberry32(seed), tape = []; return { tape, rng: () => { const v = g(); tape.push(v); return v; } }; };
      for (const set of sets) for (let seed = 1; seed <= 12; seed++) {
        const A = record(seed * 7919 + 13), B = record(seed * 7919 + 13);
        const full = F.buildCanopy(A.rng, set.opts), dry = F.drawCanopy(B.rng, set.opts);
        const ok = A.tape.length === B.tape.length && A.tape.every((v, k) => Object.is(v, B.tape[k])) && full.top === dry.top && full.radius === dry.radius;
        for (const k of ['branches', 'cards', 'tufts']) if (full[k] && full[k].dispose) full[k].dispose();
        out.seeds++;
        if (!ok) out.seedBad.push(`${set.name} seed ${seed}: ${A.tape.length} vs ${B.tape.length} draws`);
      }
      out.sets = sets.length;
      return out;
    }, { tag: TAG, HASH });
    check(`every valley tree (${r.trees}: ${r.kinds.join(', ')}) draws exactly its taped stream through drawCanopy, the canopy draws value for value, and replayCanopy() grows the classic canopy byte for byte`,
      r.trees > 20 && r.bad.length === 0, r.bad.slice(0, 4).join('; '));
    check(`buildCanopy and drawCanopy draw the same values in the same order (${r.sets} option sets × 12 seeds = ${r.seeds} runs: valley hero and rim, kit leaves/masses/clumps at hero/mid/far)`,
      r.seedBad.length === 0, r.seedBad.slice(0, 4).join('; '));
  } finally { await s.close(); }
}

/* ------------------------------- 3: a kit tree that fails in a real boot --- */
// Hash every canopy meshTreeClassic grows (classic: L.canopy; modular fallback: the replay), by tree name.
const HOOK = (forceFail) => `(() => {
  const hash = ${HASH};
  window.__canopies = {};
  let game;
  Object.defineProperty(window, 'game', { configurable: true, enumerable: true, get: () => game, set(value) {
    game = value;
    if (!value || window.__hooked || !value.assets) return;
    window.__hooked = true;
    const pre = value.assets.preload.bind(value.assets);
    value.assets.preload = async () => {
      await pre();
      const V = await import('/src/vegetation.js?v=${TAG}');
      const mesh = V.Vegetation.prototype.meshTreeClassic;
      V.Vegetation.prototype.meshTreeClassic = function (L) {
        if (L.canopyReplay) {
          const replay = this.replayCanopy.bind(this);
          this.replayCanopy = (layout) => { const c = replay(layout); window.__canopies[layout.name] = { hash: hash(c), rim: !!layout.rim }; return c; };
        } else window.__canopies[L.name] = { hash: hash(L.canopy), rim: !!L.rim };
        return mesh.call(this, L);
      };
      ${forceFail ? `const def = value.assets.defs.get('sakura');
      if (def) value.assets.defs.set('sakura', { ...def, build() { throw new Error('b1 test: forced kit failure'); } });` : ''}
    };
  } });
})();`;
const bootCanopies = async (query, forceFail) => {
  const s = await openPage('/index.html' + query, { timeout: 180, session: { catwalk_autostart: 'new' }, init: HOOK(forceFail), ignore: ['cad-overrides', 'forced kit failure'] });
  try {
    await waitForExpression(s.page, 'window.game && window.game.menu && window.game.menu.isPlaying', Date.now() + 170000);
    return await s.page.evaluate(() => ({ canopies: window.__canopies, set: game.assets.summary().set, problems: game.assets.summary().problems }));
  } finally { await s.close(); }
};
{
  const classic = await bootCanopies('', false);
  const failing = await bootCanopies('?assets=modular', true);
  // the 'sakura' id is the hero sakura; a sakura past the rim is a 'rim-trees' instance and still builds as kit
  const names = Object.keys(classic.canopies).filter((n) => /^Sakura Tree/.test(n) && !classic.canopies[n].rim).sort();
  const got = Object.keys(failing.canopies).sort();
  const mismatch = names.filter((n) => !failing.canopies[n] || failing.canopies[n].hash !== classic.canopies[n].hash);
  check(`?assets=modular with the sakura kit builder throwing: every hero sakura falls back to classic and its replayed canopy equals the classic boot's (${names.length} trees)`,
    failing.set === 'modular' && names.length > 5 && got.join() === names.join() && mismatch.length === 0
      && failing.problems.some((p) => /sakura: kit build failed/.test(p)),
    `fell back: ${got.length}, mismatched: ${mismatch.slice(0, 3).join(', ')}; problems: ${failing.problems.slice(0, 2).join(' | ')}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
