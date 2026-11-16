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
// Ruling R88: leaving disposes the pocket and the next visit builds a new one
// behind the veil; the stub pocket counts its builds and disposals, and the
// section "the pocket is put away" covers a half-built pocket, a quit to title
// while a build is under way, a dispose that throws and many visits in a row.
// (The real pocket's disposal and memory are tools/rooftop_pocket_test.mjs.)
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
/** A DOM element stub, enough for the arrival hint in #toast-stack. */
const element = () => {
  const el = {
    classList: classList(), attrs: {}, listeners: {}, parentNode: null, textContent: '', title: '', className: '',
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(t, fn) { this.listeners[t] = fn; },
    remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
  };
  return el;
};
const toastStack = { children: [], appendChild(el) { el.parentNode = this; this.children.push(el); return el; } };
globalThis.document = {
  body: { classList: classList() },
  createElement: () => element(),
  getElementById: (id) => (id === 'rooftop-transition' ? veil : id === 'toast-stack' ? toastStack : null)
};

const posts = await mod('src/rooftops/posts.js');
const { RooftopManager, ROOFTOP_ORIGIN, SHOKI_COUNT, CONTROLS_HINT } = await mod('src/rooftops/manager.js');
// The run as built (the Roof Road's own level module, pure): its Shōki are the save mask's bits.
const { buildLevel } = await import(pathToFileURL(join(ROOT, 'rooftops/js/level.js')).href);
const LEVEL_SHOKI = buildLevel().pickups.filter((k) => k.kind === 'shoki');
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
  inOdoiGate({ x: 0.2, y: 0.35, z: 36.6 }) && !inOdoiGate(ODOI_RETURN) && !inOdoiGate({ x: 0.2, y: 1.66, z: 36.6 }) && ODOI_GATE.z > 34.7 + 1);
ok('the gate is the gap (x -0.45…1.15), not the whole ramp foot: walking down the ramp axis does not pull the cat in',
  !inOdoiGate({ x: -1, y: 0.35, z: 36.6 }) && !inOdoiGate({ x: -1.6, y: 0.35, z: 36.6 }) && inOdoiGate({ x: -0.6, y: 0.35, z: 36.6 }) && inOdoiGate({ x: 0.9, y: 0.35, z: 36.6 }));

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
    music: { swell: () => log.swells++, scenes: [], setScene(n) { this.scenes.push(n); } },
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
const pocketLog = {
  built: 0, attach: 0, detach: 0, starts: [], updates: [], renders: 0, quality: [],
  // R88: disposals, the order of detach/dispose per pocket, the most pockets alive at once,
  // and whether the noren was down (shown, not parting) when each was built and disposed.
  disposed: 0, order: [], alive: 0, maxAlive: 0, veilAtBuild: [], veilAtDispose: []
};
const veilDown = () => veil.classList.contains('show') && !veil.classList.contains('out') && !veil.classList.contains('hidden');
class StubPocket {
  constructor(game, { origin, manager }) {
    this.game = game; this.origin = origin; this.manager = manager; pocketLog.built++;
    this.serial = pocketLog.built;
    pocketLog.alive++; pocketLog.maxAlive = Math.max(pocketLog.maxAlive, pocketLog.alive);
  }
  async init() { pocketLog.veilAtBuild.push(veilDown()); this.ready = true; }
  attach() { pocketLog.attach++; }
  detach() { pocketLog.detach++; pocketLog.order.push('detach:' + this.serial); }
  start(opts) { pocketLog.starts.push(opts); }
  update(dt, input) { pocketLog.updates.push(input); }
  render() { pocketLog.renders++; }
  setQuality(q) { pocketLog.quality.push(q); }
  dispose() {
    pocketLog.disposed++; pocketLog.alive--; this.disposed = true;
    pocketLog.order.push('dispose:' + this.serial); pocketLog.veilAtDispose.push(veilDown());
  }
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
  ok('the save mask is as wide as the run has Shōki (level ids 1…N)', SHOKI_COUNT === LEVEL_SHOKI.length &&
    LEVEL_SHOKI.every((k) => k.id >= 1 && k.id <= SHOKI_COUNT) && new Set(LEVEL_SHOKI.map((k) => k.id)).size === LEVEL_SHOKI.length,
    `level ${LEVEL_SHOKI.length} (${LEVEL_SHOKI.map((k) => k.id)}), mask ${SHOKI_COUNT}`);
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
  ok('all seven caps ring warm while the thicket parts (the seventh too)', g.log.glow.every((v) => v > 0.75), JSON.stringify(g.log.glow));
  tick(m, 5, true);
  ok('…then settle to a soft glow', g.log.glow.every((v) => Math.abs(v - 0.5) < 0.05), JSON.stringify(g.log.glow));

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
  ok('…built while the noren was down', pocketLog.veilAtBuild.length === 1 && pocketLog.veilAtBuild[0] === true, JSON.stringify(pocketLog.veilAtBuild));
  ok('the veil parts and clears, input comes back, a save',
    veil.classList.contains('hidden') && !veil.classList.contains('show') && !m.transitioning && g.controls.enabled && !g.player.actionLocked && g.log.saves > 0);
  ok('rooftop-mode on the body; the manager renders and owns the camera',
    document.body.classList.contains('rooftop-mode') && m.rendering && m.cameraActive);
  const hint = toastStack.children.find((el) => /roof-hint/.test(el.className));
  ok('on arrival, one hint in the toast stack: the controls and the way home', !!hint && hint.textContent === CONTROLS_HINT &&
    /walk back over the bridge to go home/.test(hint.textContent) && /toast-item/.test(hint.className) &&
    toastStack.children.filter((el) => /roof-hint/.test(el.className)).length === 1);
  hint.listeners.pointerdown();
  ok('…a tap or click dismisses it', hint.classList.contains('leaving'));
  ok('the Rooftops music mood is set once on arrival, not every frame', g.music.scenes.filter((n) => n === 'Rooftops').length === 1);
  ok('a save on the roofs writes the bridge (saveSpot)', m.saveSpot({ x: -100, y: 4, z: -50 }) === ODOI_RETURN);

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
  ok('a Shōki past the mask is journaled once and never aliased onto another bit',
    m.onShoki(SHOKI_COUNT + 1, null) && m.shoki === 65 && !m.onShoki(SHOKI_COUNT + 1, null) && g.journal.keepsakes.length === 3);
  m.setShokiMask(0xffff);
  ok('a restored mask keeps only the run\'s bits', m.shoki === (1 << SHOKI_COUNT) - 1);
  m.setShokiMask(65);
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
  ok('R88: leaving disposes the pocket, once, behind the noren (down, not yet parting), after the cat was handed back',
    pocketLog.disposed === 1 && JSON.stringify(pocketLog.order) === '["detach:1","dispose:1"]' && pocketLog.veilAtDispose[0] === true,
    JSON.stringify({ disposed: pocketLog.disposed, order: pocketLog.order, veil: pocketLog.veilAtDispose }));
  ok('…the manager holds no pocket: nothing renders, quality and render calls go nowhere',
    m.pocket === null && !m.rendering && (m.setQuality('medium'), m.render(), pocketLog.renders === 1 && pocketLog.quality.length === 1));
  m.update(1 / 60, true);
  ok('the return spot is outside the gate: no immediate re-entry', !m.transitioning && !m.active);
  ok('the return spot is where a save made on the roofs puts the cat', m.returnSpot === ODOI_RETURN);
  // second entry rebuilds the pocket (R88)
  q.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  ok('a second walk into the gap starts the veil and loads a new pocket', m.transitioning && !m.active && loads === 2 && veil.classList.contains('show'));
  await timers.run();
  ok('a second visit rebuilds the pocket behind the veil (a new one, attached and started with the Shōki mask)',
    m.active && pocketLog.built === 2 && m.pocket && m.pocket.serial === 2 && !m.pocket.disposed && pocketLog.attach === 2 &&
    pocketLog.starts[1].shoki === 65 && pocketLog.veilAtBuild[1] === true && pocketLog.maxAlive === 1,
    JSON.stringify({ built: pocketLog.built, attach: pocketLog.attach, veil: pocketLog.veilAtBuild, maxAlive: pocketLog.maxAlive }));
  m.exitImmediate();
  ok('exitImmediate (quit to title): out at once, on the bridge, no veil', !m.active && !m.transitioning && pocketLog.detach === 2 && q.z === ODOI_RETURN.z && g.controls.enabled);
  ok('…and the pocket is disposed there too (after the cat was handed back)',
    pocketLog.disposed === 2 && m.pocket === null && pocketLog.order.slice(-2).join() === 'detach:2,dispose:2', JSON.stringify(pocketLog.order));
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
  m.update(1 / 60, true);
  ok('a cat that was in the gate all along (never seen outside) does not trigger it', !m.transitioning && !m.active);
  g.player.mesh.position.set(-1, 1.08, 30);
  m.update(1 / 60, true);
  g.player.mesh.position.set(-0.5, 0.35, 36.6);
  failNext = true;
  const errs = [], err0 = console.error;
  console.error = (...a) => errs.push(a.map(String).join(' '));
  try { m.update(1 / 60, true); await timers.run(); } finally { console.error = err0; }
  ok('a failed build: back on the bridge (outside the gate), input returned, one calm line, the error logged once',
    !m.active && !m.transitioning && g.controls.enabled && !inOdoiGate(g.player.mesh.position) &&
    g.log.toasts.filter((t) => /not ready/.test(t)).length === 1 && errs.length === 1, JSON.stringify(errs));
  m.update(1 / 60, true);                           // a frame on the bridge, outside the gate: armed
  g.player.mesh.position.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  await timers.run();
  ok('…and the next walk into the gap builds it', m.active && !!m.pocket);

  /* quit to title in the middle of a veil (review r1, Minor 1) */
  m.exitImmediate();
  g.player.mesh.position.set(-1, 1.08, 30);
  m.update(1 / 60, true);
  g.player.mesh.position.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  ok('an enter is under way', m.transitioning && !m.active);
  m.exitImmediate();
  g.controls.enabled = false;                       // what quitToTitle does next
  await timers.run();
  ok('exitImmediate cancels a pending enter: nothing fires on the title screen', !m.active && !m.transitioning && !g.controls.enabled &&
    veil.classList.contains('hidden') && !veil.classList.contains('show'));
  g.controls.enabled = true;
  g.player.mesh.position.set(-1, 1.08, 30);
  m.update(1 / 60, true);
  g.player.mesh.position.set(-0.5, 0.35, 36.6);
  m.update(1 / 60, true);
  await timers.run();
  m.onLeave();
  ok('an exit is under way', m.transitioning && m.active);
  m.exitImmediate();
  g.controls.enabled = false;
  await timers.run();
  ok('exitImmediate cancels a pending exit too', !m.active && !m.transitioning && !g.controls.enabled && veil.classList.contains('hidden'));
}

/* ---------------- a build that keeps failing, a cat that does not move (review r1, Important 1) ---------------- */
section('RooftopManager: a pocket that never builds (no soft-lock at the gate)');
{
  // Timers on a stepped clock: callbacks fire when the frame time reaches them, as setTimeout would.
  const clock = {
    now: 0, queue: [],
    set(fn, ms) { this.queue.push({ fn, at: this.now + ms }); },
    async advance(dt) {
      this.now += dt * 1000;
      for (;;) {
        const due = this.queue.filter((q) => q.at <= this.now).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        this.queue.splice(this.queue.indexOf(due), 1);
        await due.fn();
        await new Promise((r) => setImmediate(r));
      }
    }
  };
  let attempts = 0;
  const alwaysFails = async () => { attempts++; throw new Error('stub: the run cannot be built'); };
  const g = makeGame();
  const m = new RooftopManager(g, { loadPocket: alwaysFails, timers: clock });
  // What main.js saveGame() persists: the manager's spot when it names one, the cat's position otherwise.
  const saved = [];
  g.saveGame = () => {
    const pos = g.player.mesh.position;
    const spot = typeof m.saveSpot === 'function' ? m.saveSpot(pos) : ((m.active || m.transitioning) ? m.returnSpot : null);
    saved.push(spot ? { x: spot.x, y: spot.y, z: spot.z } : { x: pos.x, y: pos.y, z: pos.z });
    g.log.saves++;
  };
  m.setUnlocked(true, true);
  const p = g.player.mesh.position;
  p.set(-1, 1.08, 30);                 // seen outside the gate first (on the deck)
  m.update(1 / 60, true);
  p.set(0.2, 0.35, 36.7);              // one walk into the gap; from here the cat never moves by itself
  const errors = [];
  const err0 = console.error;
  console.error = (...a) => errors.push(a.map(String).join(' '));
  let lockedFrames = 0, frames = 0;
  try {
    for (let t = 0; t < 20; t += 1 / 60) {
      m.update(1 / 60, true);
      await clock.advance(1 / 60);
      frames++;
      if (!g.controls.enabled) lockedFrames++;
    }
  } finally { console.error = err0; }
  ok('one gate entry, at most one enter attempt (a failing build is not retried in a loop)', attempts <= 1, `attempts=${attempts}`);
  ok('…the failure is logged once', errors.length === attempts && errors.every((e) => /could not be built/.test(e)), JSON.stringify(errors).slice(0, 160));
  ok('control comes back and stays (no veil cycle)', lockedFrames < 2.2 * 60 && g.controls.enabled && !g.player.actionLocked && !m.transitioning && !m.active,
    `locked ${lockedFrames} of ${frames} frames`);
  ok('the cat is put back on the bridge, outside the gate', !inOdoiGate(p) && p.z === ODOI_RETURN.z, JSON.stringify(p));
  ok('one soft message, no stack in the game', g.log.toasts.filter((t) => /not ready|lanes/.test(t)).length === 1);
  ok('every save is outside the gate', saved.length > 0 && saved.every((q) => !inOdoiGate(q)), JSON.stringify(saved.slice(0, 3)));
  // The gate re-arms only once the cat has left it: a cat placed straight into it does nothing.
  const g2 = makeGame();
  let tries2 = 0;
  const m2 = new RooftopManager(g2, { loadPocket: async () => { tries2++; return StubPocket; }, timers: clock });
  m2.setUnlocked(true, true);
  g2.player.mesh.position.set(0.2, 0.35, 36.7);      // e.g. a reload that somehow landed in the gap
  for (let i = 0; i < 30; i++) { m2.update(1 / 60, true); await clock.advance(1 / 60); }
  ok('a cat that starts inside the gate does not trigger it (armed only after leaving)', tries2 === 0 && !m2.transitioning && !m2.active);
  ok('…and a save made there writes the bridge, not the gate', typeof m2.saveSpot === 'function' && m2.saveSpot(g2.player.mesh.position) === ODOI_RETURN);
  g2.player.mesh.position.set(-1, 1.08, 30);
  m2.update(1 / 60, true);
  g2.player.mesh.position.set(0.2, 0.35, 36.7);
  m2.update(1 / 60, true);
  ok('…walking out and back in opens it', m2.transitioning && tries2 === 1);
  for (let i = 0; i < 180; i++) await clock.advance(1 / 60);
}

/* ---------------- ruling R88: the pocket is put away when the cat leaves ---------------- */
section('RooftopManager: the pocket is put away (ruling R88)');
{
  const made = [];
  let queue = [], loadsR = 0;
  const loader = async () => { loadsR++; return queue.shift() || StubPocket; };
  const track = (Base) => class extends Base { constructor(...a) { super(...a); made.push(this); } };
  const g = makeGame();
  const m = new RooftopManager(g, { loadPocket: loader, timers });
  m.setUnlocked(true, true);
  const p = g.player.mesh.position;
  const walkIn = () => { p.set(-1, 1.08, 30); m.update(1 / 60, true); p.set(-0.5, 0.35, 36.6); m.update(1 / 60, true); };
  const settle = () => new Promise((r) => setImmediate(r));     // the loader and the build's first steps run
  const quietly = async (fn) => {
    const errs = [], err0 = console.error;
    console.error = (...a) => errs.push(a.map(String).join(' '));
    try { await fn(); } finally { console.error = err0; }
    return errs;
  };

  // 1. A build that breaks half-way through init(): what it made is disposed, the cat is not stranded.
  queue.push(track(class extends StubPocket { async init() { this.half = true; throw new Error('stub: broke half-way'); } }));
  let errs = await quietly(async () => { walkIn(); await timers.run(); });
  const half = made[made.length - 1];
  ok('a pocket that fails half-way through its build is disposed before the error goes on',
    !!half && half.half && half.disposed && m.pocket === null, JSON.stringify({ half: !!half, disposed: half && half.disposed }));
  ok('…and the cat is back on the bridge with input, as for any failed build (one line logged)',
    !m.active && !m.transitioning && g.controls.enabled && !inOdoiGate(p) && p.z === ODOI_RETURN.z &&
    errs.length === 1 && /could not be built/.test(errs[0]), JSON.stringify(errs));

  // 2. Quit to title while the build is still under way: when it lands, it is put away, not kept.
  let land;
  queue.push(track(class extends StubPocket { async init() { await new Promise((r) => { land = r; }); this.ready = true; } }));
  walkIn();
  await settle();
  ok('an enter is under way with its build still running', m.transitioning && !m.active && !!land);
  const slow = made[made.length - 1];
  m.exitImmediate();
  ok('exitImmediate meanwhile: out at once (the build keeps running)', !m.transitioning && !m.active && g.controls.enabled && m.pocket === null && !slow.disposed);
  land();
  await timers.run();
  ok('…the build lands for nobody and is disposed, not kept for later', slow.disposed && m.pocket === null && !m.active && !m.transitioning);

  // 3. Quit mid-build, then walk in again before it lands: the new enter takes that build.
  const loads3 = loadsR;
  queue.push(track(class extends StubPocket { async init() { await new Promise((r) => { land = r; }); this.ready = true; } }));
  walkIn();
  await settle();
  const slow2 = made[made.length - 1];
  m.exitImmediate();
  walkIn();
  ok('walking back in before the build lands reuses that build (no second load)', m.transitioning && loadsR === loads3 + 1);
  land();
  await timers.run();
  ok('…which the new visit gets, live (not disposed)', m.active && m.pocket === slow2 && !slow2.disposed);
  m.onLeave();
  await timers.run();
  ok('…and leaving disposes it', slow2.disposed && m.pocket === null && !m.active);

  // 4. A dispose() that throws never strands the cat.
  queue.push(track(class extends StubPocket { dispose() { super.dispose(); throw new Error('stub: dispose failed'); } }));
  walkIn();
  await timers.run();
  const bad = made[made.length - 1];
  ok('(a pocket whose dispose() throws is up)', m.active && m.pocket === bad);
  errs = await quietly(async () => { m.onLeave(); await timers.run(); });
  ok('a dispose() that throws: home all the same (bridge, input, veil cleared), the pocket dropped, one line logged',
    !m.active && !m.transitioning && g.controls.enabled && veil.classList.contains('hidden') && p.z === ODOI_RETURN.z &&
    m.pocket === null && errs.length === 1 && /could not be put away/.test(errs[0]), JSON.stringify(errs));
  walkIn();
  await timers.run();
  ok('…and the next visit builds a new pocket', m.active && !!m.pocket && m.pocket !== bad && !m.pocket.disposed);
  m.onLeave();
  await timers.run();

  // 5. Many visits: one pocket alive at a time, each one disposed, the save mask on every start.
  const built0 = pocketLog.built, disposed0 = pocketLog.disposed, starts0 = pocketLog.starts.length;
  pocketLog.maxAlive = pocketLog.alive;
  const alive0 = pocketLog.alive;
  m.setShokiMask(5);
  for (let i = 0; i < 6; i++) {
    walkIn();
    await timers.run();
    if (!m.active) break;
    m.onLeave();
    await timers.run();
  }
  ok('six visits in a row: six builds, six disposals, never two pockets at once, the mask on every start',
    pocketLog.built - built0 === 6 && pocketLog.disposed - disposed0 === 6 && pocketLog.maxAlive === alive0 + 1 &&
    pocketLog.alive === alive0 && pocketLog.starts.slice(starts0).every((s) => s.shoki === 5) && m.pocket === null,
    JSON.stringify({ built: pocketLog.built - built0, disposed: pocketLog.disposed - disposed0, maxAlive: pocketLog.maxAlive - alive0 }));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
