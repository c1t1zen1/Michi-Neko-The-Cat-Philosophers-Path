// The real Roof Road pocket in the real game, headless (BUILD_GUIDE_FABLE R6.3).
// tools/rooftop_manager_test.mjs drives the manager against a stub pocket; this
// boots /index.html as /__boot.html does (autostart new), opens the Roof Road
// through the manager's own transition (setUnlocked + enter()) and checks the
// built pocket, src/rooftops/pocket.js, in the game it ships in.
//
//   node tools/rooftop_pocket_test.mjs [--query "assets=modular"] [--gpu metal|swiftshader]
//                                      [--timeout <s>] [--console]
//
// Reduce motion, live: a comfort change made while the run is up (the settings
// menu, Game.applyComfort) must reach the pocket, and so must one made while
// it was still building (attach() re-reads the game's value). Checked on the
// flags the run reads every frame (the run view's camera easing, the sky, the
// atmosphere and its impact bursts, the street people through buildWorld's
// opts) and on what one frame does with them (the atmosphere's clock runs at
// 0.22 × the run's time with reduce motion on, 1 × with it off): built with it
// off, turned on in the pocket, turned off while away and back in (a new
// pocket, built with it off), a value that reached the game without
// applyComfort is taken on the next entry, and one set after the build but
// before the swap reaches it through attach.
//
// Ruling R88, the pocket is disposed when the cat leaves: after every exit the
// manager holds no pocket, the old one has freed its run (geometries, materials,
// textures) and let go of its scene, nothing holds it (a WeakRef to it is
// cleared by a full GC: the page runs with --js-flags=--expose-gc), and the
// game's GPU counts (renderer.info: geometries, textures, programs) and JS heap
// (performance.memory after gc(), --enable-precise-memory-info) come back to
// the valley's own before the first visit: geometries and textures within
// +12, programs within +30 (the cat's own materials keep a program for the
// run's lights, and the shadow pass a few depth variants), the heap within
// 30 MB, and none of them grows from one visit to the next. Every entry is a
// rebuild behind the noren: the build starts only after a frame with the veil
// down was on screen, and every frame until the run is drawn shows it down.
// Entry times (enter() → the run drawn → playable) are printed, not judged.
//
// Finale framing (rooftops/js/runview.js, shared with the sandbox page): the cat
// stands on the perch, and once the five fires burn (t ≥ 12 s, before the card)
// Michi and Chidori both sit well inside a 1280 × 720 frame (|x| ≤ 0.75, the
// 0.84 m box around each cat) with all five fires in it; on a 360 × 780
// portrait screen the five fires still fit (as tools/rooftop_browser_test.mjs
// asks of the sandbox).
//
// Exit 0 all passed, 1 a check failed, 2 the run itself failed. Needs
// Playwright outside the repo (PLAYWRIGHT_MODULE, see tools/headless.mjs) and
// network for three.js from unpkg.
import * as headless from './headless.mjs';

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback; };
const flag = (name) => argv.includes('--' + name);
const query = String(opt('query', '')).replace(/^\?/, '');
const timeout = Number(opt('timeout', 300));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};
const section = (name) => console.log('\n' + name);

// What the pocket's moving parts read now, and what the last frame did with it.
const READ = `(() => {
  const p = game.rooftops.pocket, a = p.atmosphere;
  return {
    game: game.reducedMotion, pocket: p.reduceMotion, view: p.view.reduceMotion, sky: p.sky.reduceMotion,
    atmosphere: a.reduceMotion, impacts: a.impacts.reduceMotion, people: p._worldOpts ? p._worldOpts.reduceMotion : undefined,
    clock: p.view.time > 0 ? a.petals.material.uniforms.uTime.value / p.view.time : null,
    tag: p.__testTag || null
  };
})()`;
// The finale frame in normalised device coordinates: each cat's 0.84 m box
// (left, right, bottom, top) and each fire's centre 0.3 m up (as the sandbox's
// roofRoad.view reports them), on the run's own camera.
const FRAME = `(() => {
  const v = game.rooftops.pocket.view, cam = v.camera;
  const box = (p) => {
    let l = 9, r = -9, b = 9, t = -9;
    for (const x of [-0.42, 0.42]) for (const y of [0, 0.72]) for (const z of [-0.42, 0.42]) {
      const q = p.clone(); q.x += x; q.y += y; q.z += z; q.project(cam);
      l = Math.min(l, q.x); r = Math.max(r, q.x); b = Math.min(b, q.y); t = Math.max(t, q.y);
    }
    return [l, r, b, t].map((n) => +n.toFixed(3));
  };
  const at = (p) => { const q = p.clone(); q.y += 0.3; q.project(cam); return [+q.x.toFixed(3), +q.y.toFixed(3)]; };
  return { t: v.finale ? +v.finale.t.toFixed(2) : null, lit: v.finale ? v.finale.lit : 0, aspect: +cam.aspect.toFixed(3),
    cat: box(v.catRoot.position), guide: box(v.guideRoot.position), fires: v.sky.fires.map((fire) => at(fire.center)) };
})()`;
// R88: the game's GPU counts and JS heap, after the valley has drawn for 2 s and a full GC.
const MEASURE = `(async () => {
  const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  await frames(120);
  const gcs = typeof gc === 'function';
  for (let i = 0; i < 4 && gcs; i++) { gc(); await frames(8); }
  if (gcs) gc();
  const m = game.renderer.info.memory, pm = performance.memory;
  return { geometries: m.geometries, textures: m.textures, programs: game.renderer.info.programs.length,
    heapMB: gcs && pm ? +(pm.usedJSHeapSize / 1048576).toFixed(1) : null };
})()`;
// One entry, frame by frame from enter(): when the build started (the pocket's
// init, through a subclass the loader hands out), whether every frame before
// the run was drawn showed the noren down, and the times.
const PROBE = `(() => {
  const m = game.rooftops, load = m._loadPocket, R = window.__r88 = { initAt: null, afterInit: null };
  m._loadPocket = async () => {
    const P = await load();
    return class extends P {
      async init() {
        R.initAt = performance.now();
        await super.init();
        if (R.afterInit) { const f = R.afterInit; R.afterInit = null; f(); }
      }
    };
  };
  return true;
})()`;
const ENTER = `(async () => {
  const r = game.rooftops, veil = document.getElementById('rooftop-transition'), R = window.__r88;
  R.initAt = null;
  const t0 = performance.now();
  let frames = 0, initAfter = null, drawn = null, uncovered = 0;
  r.enter();
  await new Promise((res) => {
    const f = () => {
      const now = performance.now();
      if (initAfter === null && R.initAt !== null) initAfter = frames;
      frames++;
      if (!r.rendering) { const c = veil.classList; if (!(c.contains('show') && !c.contains('out') && !c.contains('hidden'))) uncovered++; }
      else if (drawn === null) drawn = now - t0;
      if (r.active && !r.transitioning) res({ playable: now - t0 }); else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }).then(({ playable }) => { R.last = { playable }; });
  return { initAfter, buildStart: R.initAt === null ? null : Math.round(R.initAt - t0), drawn: Math.round(drawn), playable: Math.round(R.last.playable), uncovered, frames };
})()`;
const inside = ([l, r, b, t], x, y) => l >= -x && r <= x && b >= -y && t <= y;
const FLAGS = ['pocket', 'view', 'sky', 'atmosphere', 'impacts', 'people'];
const all = (s, on) => FLAGS.every((k) => s[k] === on);
const show = (s) => JSON.stringify(s);
const near = (v, want) => v !== null && Math.abs(v - want) < 1e-6;

const t0 = Date.now();
const deadline = t0 + timeout * 1000;
let session, status = 0;
try {
  session = await headless.openPage('/index.html' + (query ? '?' + query : ''), {
    size: '1280x720', gpu: opt('gpu') || undefined, session: { catwalk_autostart: 'new' }, timeout,
    console: flag('console'),
    // R88's memory checks: gc() and exact performance.memory numbers.
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
    // The optional CAD override file is absent in a plain checkout (404 is expected).
    ignore: [/cad-overrides\.json/, /Failed to load resource: the server responded with a status of 404/]
  });
  const { page } = session;
  const wait = (expr) => headless.waitForExpression(page, expr, deadline, 100);
  const frames = async (n) => {
    const f = await page.evaluate('game.capture.frame');
    await wait(`game.capture.frame >= ${f + n}`);
  };
  const setReduce = (on) => page.evaluate(`(game.settings.values.reduceMotion = ${on}, game.applyComfort(), game.reducedMotion)`);
  const entries = [], exits = [];
  const enter = async (label) => {
    const e = await page.evaluate(ENTER);
    entries.push({ label, ...e });
    await wait('game.rooftops.active && !game.rooftops.transitioning && !!game.rooftops.pocket');
    await frames(8);
  };
  const leave = async (label) => {
    await page.evaluate('game.rooftops.exit()');
    await wait('!game.rooftops.active && !game.rooftops.transitioning');
    await frames(4);
    if (label) exits.push({ label, ...(await page.evaluate(MEASURE)) });
  };

  await wait('window.game && game.capture && game.capture.frame >= 30 && !!game.rooftops');
  console.log(`booted /index.html${query ? '?' + query : ''} in ${((Date.now() - t0) / 1000).toFixed(1)} s (${await headless.gpuInfo(session.browser).catch(() => '?')})`);

  await page.evaluate(PROBE);
  section('Reduce motion, live (Game.applyComfort → RooftopPocket.setReduceMotion)');
  ok('reduce motion off before the first visit', (await setReduce(false)) === false);
  await page.evaluate('game.rooftops.setUnlocked(true, true), game.rooftops.placeOnBridge()');
  // R88: the valley before the first visit, at the return spot every exit lands on.
  const valley = await page.evaluate(MEASURE);
  await enter('first visit');
  await page.evaluate('game.rooftops.pocket.__testTag = "first build"');
  let s = await page.evaluate(READ);
  ok('first build: every per-frame flag is off', all(s, false), show(s));
  ok('…and the atmosphere clock runs at the run\'s time (1 ×)', near(s.clock, 1), show(s));

  await setReduce(true);
  s = await page.evaluate(READ);
  ok('turned on in the pocket: every per-frame flag follows', all(s, true), show(s));
  await frames(4);
  s = await page.evaluate(READ);
  ok('…and the next frames run the atmosphere clock at 0.22 ×', near(s.clock, 0.22), show(s));

  await page.evaluate('window.__r88.weak = new WeakRef(game.rooftops.pocket)');
  await leave('exit 1');

  section('Disposed on exit (ruling R88)');
  const gone = await page.evaluate(`(() => {
    const p = window.__r88.weak.deref();
    return { held: game.rooftops.pocket === null, collected: !p, disposed: p ? p.disposed : null, freed: p ? p.freed : null,
      dropped: p ? [p.scene, p.root, p.world, p.sky, p.atmosphere, p.view, p.level, p.runner, p.assets, p.pmrem, p.envTarget].every((x) => x === null) : null };
  })()`);
  ok('leaving: the manager holds no pocket', gone.held, show(gone));
  // The disposal itself, read from the old pocket (unless a GC already took it; then the next check says so).
  ok('the old pocket freed its run: its geometries, materials and textures', gone.collected ||
    (gone.disposed === true && gone.freed && gone.freed.geometries >= 500 && gone.freed.materials >= 50 && gone.freed.textures >= 20), show(gone));
  ok('…and let go of its scene, level, runner, world, sky, atmosphere, view, assets and environment', gone.collected || gone.dropped === true, show(gone));
  const weak = await page.evaluate(`(async () => {
    const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    for (let i = 0; i < 3 && typeof gc === 'function'; i++) { gc(); await frames(4); }
    return { gc: typeof gc === 'function', collected: !window.__r88.weak.deref() };
  })()`);
  ok('nothing holds the old pocket: a full GC collects it (WeakRef cleared)', weak.gc && weak.collected, show(weak));

  section('Reduce motion across a rebuild');
  await setReduce(false);
  ok('turned off while away: no pocket to reach (disposed); the game holds it off',
    await page.evaluate('game.rooftops.pocket === null && game.reducedMotion === false'));
  await enter('rebuild (2nd visit)');
  s = await page.evaluate(READ);
  ok('back in: a new pocket, rebuilt behind the veil (not the kept one)', s.tag === null, show(s));
  ok('…every flag off and the clock at 1 ×', all(s, false) && near(s.clock, 1), show(s));

  await leave('exit 2');
  // A value the game holds that never went through applyComfort (e.g. set
  // while the pocket was still building) is taken when the cat goes in.
  await page.evaluate('game.reducedMotion = true');
  await enter('3rd visit');
  s = await page.evaluate(READ);
  ok('a value set without applyComfort is taken on entry (attach)', all(s, true) && near(s.clock, 0.22), show(s));
  await setReduce(false);
  s = await page.evaluate(READ);
  ok('…and applyComfort turns it back off', all(s, false), show(s));
  await leave('exit 3');
  // A value that reaches the game after the pocket was built (off) but before it is swapped in.
  await page.evaluate('window.__r88.afterInit = () => { game.reducedMotion = true; }');
  await enter('4th visit');
  s = await page.evaluate(READ);
  ok('one set while the pocket was building, after it read the setting, reaches it through attach()', all(s, true) && near(s.clock, 0.22), show(s));
  await setReduce(false);
  await leave('exit 4');

  section('Finale framing (RunView.updateCamera, the finale)');
  await enter('5th visit (finale)');
  await page.evaluate(`(() => { const p = game.rooftops.pocket, perch = p.level.platforms.find((k) => k.kind === 'perch'); p.startAt((perch.s0 + perch.s1) / 2, perch.y0); })()`);
  await wait('!!game.rooftops.pocket.view.finale && game.rooftops.pocket.view.finale.t >= 12');
  let f = await page.evaluate(FRAME);
  ok('the finale: five fires lit', f.lit === 5, show(f));
  ok('Michi well inside the frame', inside(f.cat, 0.75, 0.95), show(f.cat));
  ok('Chidori well inside the frame', inside(f.guide, 0.75, 0.95), show(f.guide));
  ok('all five fires in the frame', f.fires.every(([x, y]) => Math.abs(x) <= 0.9 && Math.abs(y) <= 0.9), show(f.fires));
  await page.setViewportSize({ width: 360, height: 780 });
  await page.waitForTimeout(5000);           // the finale lens eases to its portrait field
  f = await page.evaluate(FRAME);
  ok('360 × 780 portrait: the five fires still fit', f.aspect < 0.5 && f.fires.every(([x, y]) => Math.abs(x) < 0.95 && Math.abs(y) < 0.9), show({ aspect: f.aspect, fires: f.fires }));
  await page.setViewportSize({ width: 1280, height: 720 });
  await leave('exit 5');

  section('Memory back to the valley after every exit (ruling R88)');
  const row = (r) => `geometries ${r.geometries} · textures ${r.textures} · programs ${r.programs} · heap ${r.heapMB} MB`;
  console.log(`  valley before the first visit: ${row(valley)}`);
  for (const x of exits) console.log(`  after ${x.label}: ${row(x)}`);
  const d = (x, k) => x[k] - valley[k];
  ok('every exit: GPU geometries within +12 of the valley\'s', exits.length === 5 && exits.every((x) => d(x, 'geometries') <= 12), show(exits.map((x) => d(x, 'geometries'))));
  ok('every exit: GPU textures within +12', exits.every((x) => d(x, 'textures') <= 12), show(exits.map((x) => d(x, 'textures'))));
  ok('every exit: shader programs within +30 (the cat\'s run-lit variants, the shadow pass\'s depth variants)', exits.every((x) => d(x, 'programs') <= 30), show(exits.map((x) => d(x, 'programs'))));
  ok('every exit: JS heap within 30 MB after a full GC', valley.heapMB !== null && exits.every((x) => x.heapMB !== null && d(x, 'heapMB') <= 30), show(exits.map((x) => x.heapMB)));
  ok('no growth from one visit to the next (exits 2–5 within +3 geometries / textures / programs and +8 MB of exit 1)',
    exits.slice(1).every((x) => ['geometries', 'textures', 'programs'].every((k) => x[k] - exits[0][k] <= 3) && x.heapMB - exits[0].heapMB <= 8),
    show(exits.map((x) => [x.geometries, x.textures, x.programs, x.heapMB])));

  section('Every entry is built behind the noren');
  for (const e of entries) console.log(`  ${e.label}: build starts ${e.buildStart} ms after enter() (after ${e.initAfter} frame(s)), run drawn at ${e.drawn} ms, playable at ${e.playable} ms`);
  ok('every build starts only after a frame with the noren down was on screen', entries.length === 5 && entries.every((e) => e.initAfter >= 1), show(entries.map((e) => e.initAfter)));
  ok('every frame until the run is drawn shows the noren down', entries.every((e) => e.uncovered === 0 && e.frames > 0), show(entries.map((e) => e.uncovered)));

  section('Console');
  ok('no page errors', session.errors.length === 0, JSON.stringify(session.errors));
  ok('no warnings', session.warnings.length === 0, JSON.stringify(session.warnings));
} catch (error) {
  console.log('\nRUN FAILED: ' + (error && error.message ? error.message : error));
  if (session) console.log('page errors: ' + JSON.stringify(session.errors));
  status = 2;
} finally {
  await session?.close();
}
console.log(`\n${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(status || (fail ? 1 : 0));
