// Headless logic test for the Roof Road's game wiring (BUILD_GUIDE_FABLE R6.8),
// modelled on tools/summit_test.mjs.
//
// src/rooftops/manager.js (RooftopManager) and src/rooftops/posts.js (the Seven
// Posts) are pure: they import nothing from three.js, and the run itself
// (src/rooftops/pocket.js, the Roof Road's scene modules) loads only through
// an injectable loader. So the REAL shipped modules are imported natively here
// and driven against a small stub of the game (player, controls, ui, audio,
// city, progression, journal, save) and of the page (the veil element, body
// classes), with a stub pocket and timers this test steps itself. What runs is
// the actual unlock, the thicket, the gate, enter/exit with the noren veil, the
// controls → runner input mapping, the journal/XP/save hooks and the restore.
//
//   node tools/rooftop_manager_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = (readFileSync(join(ROOT, 'src', 'main.js'), 'utf8').match(/\?v=([0-9a-z]+)/) || [])[1];
const mod = (p) => import(pathToFileURL(join(ROOT, p)).href + '?v=' + TAG);

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};
const section = (name) => console.log('\n' + name);

/* ---------------- page stubs: the veil and the body ---------------- */
const classList = () => {
  const set = new Set();
  return {
    set,
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    contains: (c) => set.has(c),
    toggle: (c, on) => { if (on === undefined ? !set.has(c) : on) set.add(c); else set.delete(c); }
  };
};
const veil = { classList: classList(), offsetWidth: 0 };
veil.classList.add('hidden');
globalThis.document = {
  body: { classList: classList() },
  getElementById: (id) => (id === 'rooftop-transition' ? veil : null)
};

const posts = await mod('src/rooftops/posts.js');
const { RooftopManager, ROOFTOP_ORIGIN, SHOKI_COUNT } = await mod('src/rooftops/manager.js');
const { SevenPosts, POST_Z, EAST_RAIL, ODOI_GATE, ODOI_RETURN, inOdoiGate, onEastRail } = posts;

/* ---------------- the Seven Posts state machine ---------------- */
section('Seven Posts (posts.js)');
const walk = (sp, z0, z1, x = EAST_RAIL.x, y = EAST_RAIL.top, step = 0.05) => {
  const events = [];
  for (let z = z0; z <= z1 + 1e-9; z += step) events.push(...sp.update({ x, y, z }));
  return events;
};
{
  const sp = new SevenPosts();
  const ev = walk(sp, EAST_RAIL.z0 + 0.05, EAST_RAIL.z1 - 0.05);
  const lit = ev.filter((e) => e.type === 'post').map((e) => e.index);
  ok('a full north → south walk lights posts 0…6 in order', JSON.stringify(lit) === '[0,1,2,3,4,5,6]', JSON.stringify(lit));
  ok('…and ends with one complete event', ev.filter((e) => e.type === 'complete').length === 1 && ev[ev.length - 1].type === 'complete');
  ok('complete is permanent (no more events)', sp.update({ x: 0, y: 0, z: 0 }).length === 0 && sp.complete);
}
{
  const sp = new SevenPosts();
  walk(sp, EAST_RAIL.z0 + 0.05, POST_Z[2] + 0.1);
  ok('a partial walk lights three posts', sp.lit === 3, 'lit=' + sp.lit);
  const off = sp.update({ x: EAST_RAIL.x, y: 1.08, z: POST_Z[2] + 0.2 });   // down onto the deck
  ok('stepping off resets quietly (one reset event, lit back to 0)', off.length === 1 && off[0].type === 'reset' && off[0].lit === 3 && sp.lit === 0);
  ok('no reset event when nothing was lit', sp.update({ x: 5, y: 0, z: 0 }).length === 0);
}
{
  const sp = new SevenPosts();
  const ev = walk(sp, POST_Z[3] - 0.3, EAST_RAIL.z1 - 0.05);
  ok('climbing on mid-rail lights nothing (the walk starts at the north end)', ev.length === 0 && sp.lit === 0);
}
{
  const sp = new SevenPosts();
  const ev = walk(sp, EAST_RAIL.z0 + 0.05, EAST_RAIL.z1 - 0.05, EAST_RAIL.x, EAST_RAIL.top + 0.6);
  ok('hopping along above the rail still counts', ev.some((e) => e.type === 'complete'));
}
{
  const sp = new SevenPosts();
  const ev = walk(sp, EAST_RAIL.z0 + 0.05, EAST_RAIL.z1 - 0.05, -1 - 1.24);
  ok('the west railing does not sing', ev.length === 0);
  const back = new SevenPosts();
  const evb = [];
  for (let z = EAST_RAIL.z1 - 0.05; z >= EAST_RAIL.z0 + 0.05; z -= 0.05) evb.push(...back.update({ x: EAST_RAIL.x, y: EAST_RAIL.top, z }));
  ok('south → north lights only the first post, on reaching the north end (where a walk starts)',
    evb.length === 1 && evb[0].type === 'post' && evb[0].index === 0 && back.lit === 1, JSON.stringify(evb));
  ok('the deck is not the rail', !onEastRail({ x: -1, y: 1.08, z: 30 }) && onEastRail({ x: EAST_RAIL.x, y: 1.66, z: 30 }));
}
ok('seven posts, north to south, on the bridge (local z -4 … 4)', POST_Z.length === 7 && POST_Z[0] === 26.5 && POST_Z[6] === 34.5);
ok('the gate zone is at the foot of the south ramp, the return spot outside it',
  inOdoiGate({ x: -1, y: 0.35, z: 36.6 }) && !inOdoiGate(ODOI_RETURN) && !inOdoiGate({ x: -1, y: 1.66, z: 36.6 }) && ODOI_GATE.z > 34.7 + 1);

/* ---------------- the game stub ---------------- */
const V = (x = 0, y = 0, z = 0) => ({
  x, y, z,
  set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; }
});
function makeGame() {
  const log = { toasts: [], xp: [], journal: [], saves: 0, bells: 0, chimes: 0, thicket: [], glow: new Array(7).fill(0), swells: 0 };
  const game = {
    log,
    player: {
      mesh: { position: V(0, 0, 0), rotation: { y: 0 } },
      velocity: V(), heading: 0, yaw: 0, yawPrev: 0, actionLocked: false,
      moveInput: { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } },
      sprint: false, jumpBufferTimer: 0
    },
    camera: { position: V(), lookAt() {} },
    controls: { enabled: true, keys: {} },
    dialogue: { active: false, close() { this.active = false; } },
    contextActions: { hideAllPrompts() {} },
    ui: { showToast: (m) => log.toasts.push(m) },
    audio: { playBell: () => log.bells++, playDreamChime: () => log.chimes++, initialized: false },
    music: { swell: () => log.swells++ },
    progression: { addXP: (n, why) => log.xp.push([n, why]) },
    city: {
      setOdoiThicketOpen: (t) => log.thicket.push(t),
      setSevenPostGlow: (i, v) => { log.glow[i] = v; }
    },
    waypoints: { setTargets() {} },
    refreshCompassPois() {},
    journal: { places: [], keepsakes: [], quietMoments: [] },
    discover(section, entry) {
      const list = this.journal[section];
      if (list.some((e) => e.id === entry.id)) return false;
      list.push(entry); log.journal.push([section, entry.id]); this.saveGame(); return true;
    },
    saveGame() { log.saves++; }
  };
  return game;
}

/** A stub pocket: records what the manager asks of it. */
const pocketLog = { built: 0, attach: 0, detach: 0, starts: [], updates: [], renders: 0, quality: [] };
class StubPocket {
  constructor(game, { origin, manager }) { this.game = game; this.origin = origin; this.manager = manager; pocketLog.built++; }
  async init() { this.ready = true; }
  attach() { pocketLog.attach++; }
  detach() { pocketLog.detach++; }
  start(opts) { pocketLog.starts.push(opts); }
  update(dt, input) { pocketLog.updates.push(input); }
  render() { pocketLog.renders++; }
  setQuality(q) { pocketLog.quality.push(q); }
}
let loads = 0, failNext = false;
const loadPocket = async () => {
  loads++;
  if (failNext) { failNext = false; throw new Error('stub: no build'); }
  return StubPocket;
};
/** Timers the test steps: run() fires everything due, awaiting async callbacks. */
const timers = {
  queue: [],
  set(fn, ms) { this.queue.push({ fn, ms }); },
  async run() {
    while (this.queue.length) {
      const { fn } = this.queue.shift();
      await fn();
      await new Promise((r) => setImmediate(r));
    }
  }
};
const tick = (m, seconds, playing = true, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) m.update(dt, playing); };

/* ---------------- the manager: unlock ---------------- */
section('RooftopManager: the Seven Posts unlock');
{
  const g = makeGame();
  const m = new RooftopManager(g, { loadPocket, timers });
  ok('starts locked, inactive, not loaded; origin 2.4 km below the valley',
    !m.unlocked && !m.active && !m.transitioning && loads === 0 && !m.pocket && ROOFTOP_ORIGIN.y === -2400);
  ok('seven Shōki in the save mask', SHOKI_COUNT === 7);
  const p = g.player.mesh.position;
  // walk three posts, step off
  for (let z = EAST_RAIL.z0 + 0.05; z <= POST_Z[2] + 0.1; z += 0.05) { p.set(EAST_RAIL.x, EAST_RAIL.top, z); m.update(1 / 60, true); }
  ok('each passed post warms its giboshi', g.log.glow[0] > 0.5 && g.log.glow[2] > 0 && g.log.glow[3] === 0, JSON.stringify(g.log.glow));
  p.set(-1, 1.08, 30);
  tick(m, 4);
  ok('stepping off lets them cool back to cold bronze', g.log.glow.every((v) => v < 0.05), JSON.stringify(g.log.glow));
  ok('no unlock, no toast, no penalty', !m.unlocked && g.log.toasts.length === 0 && g.log.xp.length === 0);
  // posts don't listen while the menu is up
  for (let z = EAST_RAIL.z0 + 0.05; z <= EAST_RAIL.z1 - 0.05; z += 0.05) { p.set(EAST_RAIL.x, EAST_RAIL.top, z); m.update(1 / 60, false); }
  ok('the posts do not listen on the title / pause screen', !m.unlocked && m.posts.lit === 0);
  // the full walk
  for (let z = EAST_RAIL.z0 + 0.05; z <= EAST_RAIL.z1 - 0.05; z += 0.05) { p.set(EAST_RAIL.x, EAST_RAIL.top, z); m.update(1 / 60, true); }
  ok('the seventh post unlocks', m.unlocked);
  ok('…with the toast, a journal places entry, XP and the bell, then a save',
    g.log.toasts.some((t) => /bamboo on the old earthen wall parts/.test(t)) &&
    g.journal.places.some((e) => e.id === 'odoi-gate') && g.log.xp.some(([n]) => n === 60) && g.log.bells === 1 && g.log.saves >= 1);
  // the gate is not open yet: standing in it does nothing
  p.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  ok('the gap does not open the veil before the thicket has parted', !m.transitioning && !m.active);
  const n0 = g.log.thicket.length;
  tick(m, 1.0, true);
  const mid = g.log.thicket[g.log.thicket.length - 1];
  p.set(-1, 1.08, 30);
  tick(m, 2.2, true);
  const last = g.log.thicket[g.log.thicket.length - 1];
  ok('the Odoi thicket leans apart over ~3 s (monotonic, ends at 1)',
    g.log.thicket.length > n0 && mid > 0 && mid < 1 && last === 1 &&
    g.log.thicket.every((v, i, a) => i === 0 || v >= a[i - 1]), `mid=${mid} last=${last}`);
  ok('the caps settle to a soft glow once unlocked', g.log.glow.every((v) => Math.abs(v - 0.5) < 0.05), JSON.stringify(g.log.glow));

  /* ---------------- enter ---------------- */
  section('RooftopManager: through the noren');
  p.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  ok('walking into the open gap starts the veil and locks input',
    m.transitioning && !m.active && !g.controls.enabled && g.player.actionLocked && veil.classList.contains('show') && !veil.classList.contains('hidden'));
  ok('the run is loaded only now (on the first enter)', loads === 1);
  m.update(1 / 60, true);
  ok('no second enter while transitioning', loads === 1 && timers.queue.length === 1);
  await timers.run();
  ok('behind the veil: active, the pocket built once, attached and started with the saved Shōki mask',
    m.active && pocketLog.built === 1 && pocketLog.attach === 1 && pocketLog.starts.length === 1 && pocketLog.starts[0].shoki === 0);
  ok('the veil parts and clears, input comes back, a toast and a save',
    veil.classList.contains('hidden') && !veil.classList.contains('show') && !m.transitioning && g.controls.enabled && !g.player.actionLocked &&
    g.log.toasts.some((t) => /Through the noren/.test(t)));
  ok('rooftop-mode on the body; the manager renders and owns the camera',
    document.body.classList.contains('rooftop-mode') && m.rendering && m.cameraActive);

  /* ---------------- input mapping ---------------- */
  section('RooftopManager: the game controls → the runner');
  pocketLog.updates.length = 0;
  g.player.moveInput.x = 1;                       // Controls: A / ← is +x
  m.update(1 / 60, true);
  let inp = pocketLog.updates[0];
  ok('A / ← runs back along the route (move -1)', inp && inp.move === -1, JSON.stringify(inp));
  g.player.moveInput.x = -1;
  g.controls.keys.Space = true;
  m.update(1 / 60, true);
  inp = pocketLog.updates[1];
  ok('Space: jumpPressed on the first frame, held after', inp.move === 1 && inp.jumpPressed && inp.jumpHeld);
  m.update(1 / 60, true);
  inp = pocketLog.updates[2];
  ok('…not pressed again while held', !inp.jumpPressed && inp.jumpHeld);
  g.controls.keys.Space = false;
  g.player.jumpBufferTimer = 0;
  m.update(1 / 60, true);
  inp = pocketLog.updates[3];
  ok('…released on key up', inp.jumpReleased && !inp.jumpHeld);
  // Space's keydown also buffers player.jump(); the touch button only buffers
  g.player.jumpBufferTimer = 0.15;
  m.update(1 / 60, true);
  inp = pocketLog.updates[4];
  ok('the touch jump button (player.jump buffer) jumps and holds for a full jump', inp.jumpPressed && inp.jumpHeld && g.player.jumpBufferTimer === 0);
  for (let i = 0; i < 30; i++) m.update(1 / 60, true);
  ok('…the touch hold ends after ~0.34 s', !pocketLog.updates[pocketLog.updates.length - 1].jumpHeld);
  g.player.moveInput.x = 0; g.player.moveInput.y = -1;   // S / ↓ or the stick pulled down
  m.update(1 / 60, true);
  inp = pocketLog.updates[pocketLog.updates.length - 1];
  ok('S / ↓ drops (downPressed then held)', inp.downPressed && inp.downHeld);
  g.player.moveInput.y = 0;
  g.controls.keys.KeyR = true; m.update(1 / 60, true);
  ok('R asks for the last lantern once', pocketLog.updates[pocketLog.updates.length - 1].reset);
  m.update(1 / 60, true);
  ok('…edge only', !pocketLog.updates[pocketLog.updates.length - 1].reset);
  g.controls.keys.KeyR = false;
  g.player.sprint = true; m.update(1 / 60, true);
  ok('Shift (player.sprint) sprints', pocketLog.updates[pocketLog.updates.length - 1].sprint);
  g.player.sprint = false;
  m.update(1 / 60, false);
  ok('no input reaches the run on the pause / title screen', pocketLog.updates[pocketLog.updates.length - 1] === null);
  m.render();
  ok('render() draws the pocket', pocketLog.renders === 1);
  m.setQuality('low');
  ok('quality reaches the pocket', pocketLog.quality[0] === 'low');

  /* ---------------- journal hooks ---------------- */
  section('RooftopManager: Shōki, the finale');
  const saves0 = g.log.saves;
  ok('greeting Shōki 1 sets bit 0, a keepsake, XP and a save', m.onShoki(1, { romaji: 'Awataguchi' }) && m.shoki === 1 &&
    g.journal.keepsakes.some((e) => e.id === 'roof-shoki-1') && g.log.xp.some(([n, w]) => n === 10 && /Shōki/.test(w)) && g.log.saves > saves0);
  ok('Shōki 7 sets bit 6', m.onShoki(7, null) && m.shoki === (1 | 64) && m.greeted === 2);
  ok('a Shōki greeted twice counts once', !m.onShoki(1, null) && m.shoki === 65 && g.journal.keepsakes.length === 2);
  const xp0 = g.log.xp.length;
  m.onFinale();
  ok('the finale: rooftopFinished, a quiet moment, XP once', m.finished && g.journal.quietMoments.some((e) => e.id === 'roof-road-okuribi') && g.log.xp.length === xp0 + 1);
  m.onFinale();
  ok('…a second finale adds no XP and no duplicate entry', g.log.xp.length === xp0 + 1 && g.journal.quietMoments.length === 1);

  /* ---------------- exit ---------------- */
  section('RooftopManager: home again');
  g.player.mesh.position.set(5, 5, 5);
  m.onLeave();
  ok('leaving starts the veil and locks input', m.transitioning && veil.classList.contains('show') && !g.controls.enabled);
  await timers.run();
  const q = g.player.mesh.position;
  ok('back in the valley: inactive, pocket detached, the cat on the south ramp facing the valley',
    !m.active && pocketLog.detach === 1 && q.x === ODOI_RETURN.x && q.y === ODOI_RETURN.y && q.z === ODOI_RETURN.z && g.player.heading === Math.PI);
  ok('veil cleared, input back, rooftop-mode off, a save', veil.classList.contains('hidden') && g.controls.enabled && !document.body.classList.contains('rooftop-mode') && !m.transitioning);
  m.update(1 / 60, true);
  ok('the return spot is outside the gate: no immediate re-entry', !m.transitioning && !m.active);
  ok('the return spot is where a save made on the roofs puts the cat', m.returnSpot === ODOI_RETURN);
  // second entry reuses the pocket
  q.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  await timers.run();
  ok('a second visit reuses the pocket (no reload, no rebuild) and passes the Shōki mask',
    m.active && loads === 1 && pocketLog.built === 1 && pocketLog.starts[1].shoki === 65);
  m.exitImmediate();
  ok('exitImmediate (quit to title): out at once, on the bridge, no veil', !m.active && !m.transitioning && pocketLog.detach === 2 && q.z === ODOI_RETURN.z && g.controls.enabled);
}

/* ---------------- locked, restore, failure ---------------- */
section('RooftopManager: locked gate, a save restored, a failed build');
{
  const g = makeGame();
  const loads0 = loads;
  const m = new RooftopManager(g, { loadPocket, timers });
  m.enter();
  g.player.mesh.position.set(-0.5, 0.35, 36.6);
  tick(m, 4);
  ok('locked: enter() is refused and the gap does nothing', !m.transitioning && !m.active && loads === loads0);
  m.setUnlocked(true, true);
  ok('restore (silent): unlocked, the thicket open at once, caps warm, no toast / journal / XP / save',
    m.unlocked && g.log.thicket[g.log.thicket.length - 1] === 1 && g.log.glow.every((v) => v === 0.5) &&
    g.log.toasts.length === 0 && g.journal.places.length === 0 && g.log.xp.length === 0 && g.log.saves === 0);
  failNext = true;
  m.update(1 / 60, true);
  await timers.run();
  ok('a failed build: back in the valley, input returned, a calm toast', !m.active && !m.transitioning && g.controls.enabled &&
    g.log.toasts.some((t) => /not ready/.test(t)));
  g.player.mesh.position.set(-1, 1.08, 30);
  m.update(1 / 60, true);
  g.player.mesh.position.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  await timers.run();
  ok('…and the next try builds it', m.active && !!m.pocket);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
