// Headless checks for the Roof Road (rooftops/): the rail, the level data and
// the runner. Pure modules only — no GPU, no three.js.
//
//   node tools/rooftop_test.mjs
//
// What it proves: the rail is continuous; every piece sits on one straight
// leg (or is a corner piece); the finale is reachable from the start AND from
// every platform (no soft-locks); the street always has a way back up within
// 12 m; route gaps fit the strict jump budget; all seven Shōki are reachable;
// the layered landmark routes and mobile controls remain present; and a
// scripted run of the real physics climbs the route without falling.

import { readFileSync } from 'node:fs';
import { Rail } from '../rooftops/js/rail.js';
import { buildLevel, mouthAt } from '../rooftops/js/level.js';
import { Runner, PHYS, platCovers, platTop } from '../rooftops/js/physics.js';
import { buildGraph, reachable, canReach, link, reach } from '../rooftops/js/reach.js';
import { Autopilot } from '../rooftops/js/autopilot.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

/* ---------------- rail ---------------- */
console.log('rail');
{
  const r = new Rail([{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: -10 }], 2);
  ok('L-rail length = legs minus the fillet saving', near(r.length, 20 - 4 + Math.PI, 1e-9), r.length);
  const p = r.pointAt(8), t = r.tangentAt(8);
  ok('first straight leg point', near(p.x, 8) && near(p.z, 0));
  ok('first leg tangent +x', near(t.x, 1) && near(t.z, 0));
  const n = r.normalAt(1);
  ok('normal points at the camera (+z on a +x leg)', near(n.x, 0) && near(n.z, 1));
  const end = r.pointAt(r.length);
  ok('rail ends on the last vertex', near(end.x, 10, 1e-9) && near(end.z, -10, 1e-9), JSON.stringify(end));
  let worst = 0;
  for (let s = 0.01; s < r.length; s += 0.01) {
    const a = r.pointAt(s - 0.005), b = r.pointAt(s + 0.005);
    worst = Math.max(worst, Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - 0.01));
  }
  ok('arc length is uniform (|ds| error < 1e-5)', worst < 1e-5, worst);
  let tj = 0;
  for (const c of r.corners) {
    for (const s of [c.s0, c.s1]) {
      const a = r.tangentAt(s - 1e-4), b = r.tangentAt(s + 1e-4);
      tj = Math.max(tj, Math.hypot(a.x - b.x, a.z - b.z));
    }
  }
  ok('tangent is continuous through fillets', tj < 1e-3, tj);
  ok('isStraight sees the fillet', r.isStraight(0, 7) && !r.isStraight(7, 9));
}

/* ---------------- level ---------------- */
console.log('level');
const L = buildLevel();
const P = L.platforms;
ok('level has a rail and platforms', L.rail && P.length > 60, P.length);
ok('seven mouths', L.mouths.length === 7);
ok('every platform has s0 < s1 and finite heights',
  P.every((p) => p.s1 > p.s0 && Number.isFinite(p.y0) && Number.isFinite(p.y1) && Number.isFinite(p.d)),
  P.filter((p) => !(p.s1 > p.s0)).map((p) => p.id + ':' + p.label).join(', '));
{
  // Street and canal ribbons follow the rail round corners by design.
  const ribbon = new Set(['corner', 'street', 'water']);
  const bad = L.pieces.filter((pc) => !ribbon.has(pc.type) && pc.s1 !== undefined &&
    !L.rail.isStraight(pc.s0 - 0.2, pc.s1 + 0.2));
  ok('every piece sits on one straight leg (or is a corner)', bad.length === 0,
    bad.map((b) => b.type + '@' + b.s0.toFixed(1)).join(', '));
}
{
  // The street (or the canal) must be under every metre of the rail.
  const floor = P.filter((p) => p.kind === 'street' || p.kind === 'water');
  let gapAt = null;
  for (let s = 0.3; s < L.length - 0.3; s += 0.25) {
    if (!floor.some((p) => platCovers(p, s, 0, 0.01))) { gapAt = s; break; }
  }
  ok('the street runs the whole rail', gapAt === null, 'no floor at s=' + gapAt);
}

{
  // Each mouth's lantern stands inside that mouth (the float's lantern is at
  // the foot of the climb, so it shows ⑥ until the roof) and on a surface.
  const bad = L.checkpoints.filter((cp) => {
    const m = mouthAt(L, cp.s, cp.y);
    const wantId = cp.mouth === 7 ? 6 : cp.mouth;
    const under = P.some((p) => platCovers(p, cp.s, 0, 0.05) && Math.abs(platTop(p, cp.s) - cp.y) < 0.05);
    return m.id !== wantId || !under;
  });
  ok('every lantern checkpoint sits in its own mouth, on a surface', L.checkpoints.length === 7 && bad.length === 0,
    bad.map((c) => `#${c.mouth}@${c.s.toFixed(1)} in ${mouthAt(L, c.s, c.y).id}`).join(', '));
  const mids = L.mouths.slice(0, 6);
  ok('the six street mouths tile the rail end to end',
    mids[0].s0 === 0 && mids.every((m, i) => i === 0 || Math.abs(m.s0 - mids[i - 1].s1) < 1e-9) && Math.abs(mids[5].s1 - L.length) < 1e-9);
}
{
  const pieces = (type, m = null) => L.pieces.filter((pc) => pc.type === type && (!m || (pc.s1 ?? pc.s0) >= m.s0 && (pc.s0 ?? pc.s1) <= m.s1));
  const m = L.mouths;
  ok('Takase keeps water, nine stones, the boat, footbridge and five boughs',
    pieces('water', m[2]).length === 1 && pieces('steppingStone', m[2]).length === 9 &&
    pieces('boat', m[2]).length === 1 && pieces('canalBridge', m[2]).length === 1 && pieces('cherry', m[2]).length === 5);
  ok('Pontochō keeps complete low and middle zigzag roads',
    pieces('deck', m[1]).filter((pc) => pc.style === 'yuka').length === 7 && pieces('balcony', m[1]).length === 11);
  ok('Nishiki keeps three canopy runs and two lowered crossings',
    P.filter((p) => p.kind === 'canopy').length === 3 && pieces('marketCrossing', m[3]).length === 2 && pieces('canopy', m[3])[0]?.gaps.length === 2);
  ok('Laundry Sky keeps its low futons and high cistern/chimney route',
    pieces('futonRack', m[4]).length === 2 && pieces('cistern', m[4]).length === 1 && pieces('chimney', m[4]).length === 1);
  ok('Hoko-chō keeps five yatai and its lantern-rack ascent',
    pieces('yatai', m[5]).length === 5 && pieces('rack', m[5]).length >= 2 &&
    pieces('rope', m[5]).filter((pc) => pc.style === 'lanterns').length >= 2 && pieces('float', m[5]).length === 1);
  const route = P.filter((p) => p.route !== undefined).sort((a, b) => a.route - b.route);
  const depthChanges = route.slice(1).filter((p, i) => Math.abs(p.d - route[i].d) >= 1).length;
  ok('the main road visibly changes depth at least 35 times', depthChanges >= 35, depthChanges);
}

console.log('interface');
{
  const html = readFileSync(new URL('../kyoto-rooftops.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../rooftops/style.css', import.meta.url), 'utf8');
  ok('touch UI has an analog pad plus separate jump and drop actions',
    /id="pad"/.test(html) && /id="stick"/.test(html) && /id="btn-jump"/.test(html) && /id="btn-down"/.test(html) &&
    /@media \(pointer: coarse\)/.test(css) && /safe-area-inset-(left|right|bottom)/.test(css));
  ok('pause, sound, guidance and recovery controls remain accessible',
    /id="btn-guide"[^>]+aria-label=/.test(html) && /id="btn-sound"[^>]+aria-label=/.test(html) &&
    /id="btn-reset"[^>]+aria-label=/.test(html) && /id="btn-pause"[^>]+aria-label=/.test(html) &&
    /id="pause-panel"[^>]+role="dialog"[^>]+aria-modal="true"/.test(html));
}

/* ---------------- reachability ---------------- */
console.log('reach');
const G = buildGraph(L);
const start = P.find((p) => p.start);
const goal = P.find((p) => p.kind === 'perch');
ok('start and perch exist', !!start && !!goal);
const fromStart = reachable(G, [start.id]);
ok('the perch is reachable from the start', fromStart.has(goal.id));
const toGoal = canReach(G, goal.id);
{
  const stuck = P.filter((p) => !toGoal.has(p.id));
  ok('no soft-locks: the perch is reachable from every platform', stuck.length === 0,
    stuck.slice(0, 8).map((p) => p.label + '@' + p.s0.toFixed(1)).join(', '));
}
{
  // Climb-backs: from any metre of street, within 12 m there is a platform that
  // reaches the perch without touching the street again.
  const isFloor = (j) => P[j].kind === 'street' || P[j].kind === 'water';
  const upward = canReach(G, goal.id, isFloor);
  const floors = P.filter((p) => p.kind === 'street' || p.kind === 'water');
  const backs = [];
  for (const f of floors) for (const j of G[f.id]) if (!isFloor(j) && upward.has(j)) backs.push(P[j]);
  let worst = 0, worstAt = 0;
  for (const f of floors) {
    for (let s = f.s0; s <= f.s1; s += 1) {
      let best = Infinity;
      for (const b of backs) {
        const b1 = b.s1 + (b.move ? b.move.amp : 0);
        const dist = s < b.s0 ? b.s0 - s : (s > b1 ? s - b1 : 0);
        if (dist < best) best = dist;
      }
      if (best > worst) { worst = best; worstAt = s; }
    }
  }
  ok('a climb-back within 12 m of every metre of street', worst <= 12,
    'worst ' + worst.toFixed(1) + ' m at s=' + worstAt.toFixed(1));
}
{
  // Route gaps: consecutive route platforms within the strict budget.
  const route = P.filter((p) => p.route !== undefined).sort((a, b) => a.route - b.route);
  ok('the route starts on the start platform and ends on the perch',
    route[0] === start && route[route.length - 1] === goal,
    route.length ? route[0].label + ' … ' + route[route.length - 1].label : 'empty');
  const bad = [];
  for (let i = 0; i + 1 < route.length; i++) {
    const A = route[i], B = route[i + 1];
    const r = link(A, B, { strict: true, sprint: !!B.sprint });
    if (!r.ok) bad.push(`${A.label}→${B.label} (${r.how} gap ${r.gap.toFixed(2)} rise ${r.rise.toFixed(2)}${r.reach ? ' reach ' + (r.reach * 0.8).toFixed(2) : ''})`);
  }
  ok('route links fit the strict budget (80 % of run reach, no mantle)', bad.length === 0, bad.join('; '));
}
{
  const missing = L.pickups.filter((k) => k.kind === 'shoki').filter((k) => {
    const under = P.filter((p) => platCovers(p, k.s, 0, 0.05) && k.y - platTop(p, k.s) >= -0.05 && k.y - platTop(p, k.s) <= 0.6);
    return !under.some((p) => fromStart.has(p.id));
  });
  ok('seven Shōki, each standing on a reachable platform',
    L.pickups.filter((k) => k.kind === 'shoki').length === 7 && missing.length === 0,
    missing.map((k) => '#' + k.id + '@' + k.s.toFixed(1)).join(', '));
}

/* ---------------- physics ---------------- */
console.log('physics');
{
  // Apex and reach from the shared constants.
  const r = new Runner({ platforms: [{ id: 0, s0: 0, s1: 100, y0: 0, y1: 0, d: 0, kind: 'street' }], walls: [], length: 100 });
  r.reset(10, 0);
  let t = 0, peak = 0, first = true;
  while (t < 2) {
    r.step(1 / 240, { move: 0, jumpHeld: true, jumpPressed: first }, t);
    first = false;
    t += 1 / 240;
    peak = Math.max(peak, r.y);
  }
  ok('held jump peaks at the game apex (1.30 m)', near(peak, 1.296, 0.03), peak.toFixed(3));
  ok('analytic flat reach at run = 2.99 m', near(reach(0, PHYS.run, PHYS.jump, false), 2.99, 0.01));
}
{
  // Ledge guard: walking off a roof edge stops the cat; ↓ lets it go.
  const lvl = {
    platforms: [
      { id: 0, s0: 0, s1: 40, y0: 0, y1: 0, d: 2, kind: 'street' },
      { id: 1, s0: 5, s1: 10, y0: 3, y1: 3, d: 0, kind: 'ridge' }
    ], walls: [], length: 40
  };
  const r = new Runner(lvl);
  r.reset(8, 3.2);
  for (let i = 0; i < 120; i++) r.step(1 / 60, { move: 1 }, i / 60);
  ok('ledge guard holds the cat on the roof', r.grounded && r.y === 3 && r.s <= 10 + PHYS.foot + 1e-6, `s=${r.s.toFixed(2)} y=${r.y}`);
  for (let i = 0; i < 120; i++) r.step(1 / 60, { move: 1, downHeld: true }, 2 + i / 60);
  ok('↓ lets it step off into the street', r.grounded && r.y === 0 && r.s > 10.2, `s=${r.s.toFixed(2)} y=${r.y}`);
}
{
  // Mantle: a jump that comes up just short of an edge still makes it.
  const lvl = {
    platforms: [
      { id: 0, s0: 0, s1: 40, y0: 0, y1: 0, d: 2, kind: 'street' },
      { id: 1, s0: 0, s1: 10, y0: 2, y1: 2, d: 0, kind: 'ridge' },
      { id: 2, s0: 10.6, s1: 20, y0: 3.55, y1: 3.55, d: 0, kind: 'ridge' }
    ], walls: [{ s: 10.6, y0: 0, y1: 3.55, dir: 1, d0: -3, d1: 1 }], length: 40
  };
  const r = new Runner(lvl);
  r.reset(9.5, 2.1);
  let t = 0;
  for (let i = 0; i < 200; i++) {
    r.step(1 / 60, { move: 1, jumpHeld: true, jumpPressed: i === 2 }, t);
    t += 1 / 60;
  }
  ok('mantle pulls up a 1.55 m rise', r.grounded && r.ground.id === 2, `s=${r.s.toFixed(2)} y=${r.y.toFixed(2)} on=${r.ground && r.ground.id}`);
}
{
  // Futon: landing from a hop flings the cat well above a normal jump.
  const lvl = {
    platforms: [
      { id: 0, s0: 0, s1: 40, y0: 0, y1: 0, d: 2, kind: 'street' },
      { id: 1, s0: 4, s1: 6, y0: 0.8, y1: 0.8, d: 0, kind: 'futon' }
    ], walls: [], length: 40
  };
  const r = new Runner(lvl);
  r.reset(4.5, 2.0);
  r.y = 2.0; r.grounded = false; r.ground = null;      // drop it from 1.2 m above
  let peak = 0, bounced = false, t = 0;
  for (let i = 0; i < 240; i++) {
    r.step(1 / 120, { move: 0, jumpHeld: true }, t);
    t += 1 / 120;
    if (r.events.includes('bounce')) bounced = true;
    if (bounced) peak = Math.max(peak, r.y);
  }
  ok('futon bounce reaches ≈1.85 m above it', bounced && near(peak - 0.8, 1.849, 0.06), (peak - 0.8).toFixed(2));
}
{
  // Scripted run: the autopilot follows the route with the real physics and
  // must reach the perch without ever touching the street or the canal.
  const pilot = new Autopilot(L);
  const route = pilot.route;
  const r = new Runner(L);
  r.reset(start.s0 + 0.6, platTop(start, start.s0 + 0.6));
  let t = 0, touched = null, stalled = 0, lastS = r.s;
  const dt = 1 / 120;
  for (let step = 0; step < 120 * 360 && !pilot.done; step++) {
    const input = pilot.input(r, t, dt);
    if (r.grounded && (r.ground.kind === 'street' || r.ground.kind === 'water') && !touched) touched = r.s.toFixed(1);
    r.step(dt, input, t);
    t += dt;
    if (process.env.TRACE && Math.abs(r.s - Number(process.env.TRACE)) < 4) {
      console.log('    ', pilot.idx, r.s.toFixed(2), r.y.toFixed(2), r.grounded ? r.ground.label : '-', JSON.stringify(input), r.events.join(','));
    }
    if (Math.abs(r.s - lastS) < 1e-4 && r.grounded) stalled += dt; else stalled = 0;
    lastS = r.s;
    if (stalled > 25) break;
  }
  // One more look: the last step may have landed on the perch.
  pilot.input(r, t, dt);
  const idx = pilot.idx;
  const at = route[idx];
  ok('autopilot reaches the perch on the real physics', idx >= route.length - 1,
    `stopped after ${at ? at.label + '@' + at.s0.toFixed(1) : '?'} (route ${idx}/${route.length - 1}), s=${r.s.toFixed(2)} y=${r.y.toFixed(2)}`);
  ok('…without touching the street or the canal', touched === null, 'touched at s=' + touched);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
