// The real Roof Road pocket in the real game, headless (BUILD_GUIDE_FABLE R6.3).
// tools/rooftop_manager_test.mjs drives the manager against a stub pocket; this
// boots /index.html as /__boot.html does (autostart new), opens the Roof Road
// through the manager's own transition (setUnlocked + enter()) and checks the
// built pocket, src/rooftops/pocket.js, in the game it ships in.
//
//   node tools/rooftop_pocket_test.mjs [--query "assets=modular"] [--gpu metal|swiftshader]
//                                      [--timeout <s>] [--console]
//
// Reduce motion, live: the pocket is built once and kept after the player
// leaves, so a comfort change made later (the settings menu, Game.applyComfort)
// must reach it. Checked on the flags the run reads every frame (the run view's
// camera easing, the sky, the atmosphere and its impact bursts, the street
// people through buildWorld's opts) and on what one frame does with them (the
// atmosphere's clock runs at 0.22 × the run's time with reduce motion on, 1 ×
// with it off): built with it off, turned on in the pocket, turned off while
// away and back in, and a value that reached the game without applyComfort is
// taken on the next entry (attach).
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
  const enter = async () => {
    await page.evaluate('game.rooftops.enter()');
    await wait('game.rooftops.active && !game.rooftops.transitioning && !!game.rooftops.pocket');
    await frames(8);
  };
  const leave = async () => {
    await page.evaluate('game.rooftops.exit()');
    await wait('!game.rooftops.active && !game.rooftops.transitioning');
    await frames(4);
  };

  await wait('window.game && game.capture && game.capture.frame >= 30 && !!game.rooftops');
  console.log(`booted /index.html${query ? '?' + query : ''} in ${((Date.now() - t0) / 1000).toFixed(1)} s (${await headless.gpuInfo(session.browser).catch(() => '?')})`);

  section('Reduce motion, live (Game.applyComfort → RooftopPocket.setReduceMotion)');
  ok('reduce motion off before the first visit', (await setReduce(false)) === false);
  await page.evaluate('game.rooftops.setUnlocked(true, true)');
  await enter();
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

  await leave();
  await setReduce(false);
  s = await page.evaluate(READ);
  ok('turned off while away: the kept pocket hears it', all(s, false), show(s));
  await enter();
  s = await page.evaluate(READ);
  ok('back in: the same pocket (kept, not rebuilt)', s.tag === 'first build', show(s));
  ok('…every flag off and the clock at 1 ×', all(s, false) && near(s.clock, 1), show(s));

  await leave();
  // A value the game holds that never went through applyComfort (e.g. set
  // while the pocket was still building) is taken when the cat goes in.
  await page.evaluate('game.reducedMotion = true');
  await enter();
  s = await page.evaluate(READ);
  ok('a value set without applyComfort is taken on entry (attach)', all(s, true) && near(s.clock, 0.22), show(s));
  await setReduce(false);
  s = await page.evaluate(READ);
  ok('…and applyComfort turns it back off', all(s, false), show(s));
  await leave();

  section('Finale framing (RunView.updateCamera, the finale)');
  await enter();
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
  await leave();

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
