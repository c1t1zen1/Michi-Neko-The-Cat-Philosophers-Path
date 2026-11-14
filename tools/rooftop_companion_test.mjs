// Real-physics regression: guide pacing, reverse exploration and canopy edges.
import assert from 'node:assert/strict';
import { buildLevel } from '../rooftops/js/level.js';
import { Runner } from '../rooftops/js/physics.js';
import { Autopilot } from '../rooftops/js/autopilot.js';
import { Companion } from '../rooftops/js/companion.js';
const level = buildLevel(), dt = 1 / 120;
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
check('guide traverses the entire real-physics run without losing the player', () => {
  const player = new Runner(level), guide = new Companion(level), auto = new Autopilot(level);
  player.reset(1, 1.1); guide.reset(player);
  let maxGap = 0, maxSpeed = 0, feints = 0, detours = 0; const moods = new Set(), paces = new Set();
  for (let i = 0; i < 120 * 370; i++) {
    const t = i * dt; player.step(dt, auto.input(player, t, dt), t);
    const before = guide.runner.s;
    guide.update(dt, player, t, true);
    maxGap = Math.max(maxGap, Math.abs(player.s - guide.runner.s));
    maxSpeed = Math.max(maxSpeed, Math.abs(guide.runner.s - before));
    if (guide.mood === 'feint' && guide.runner.vs < -.5 && player.vs > .5) feints++;
    if (guide.mood === 'detour' && guide.runner.ground && player.ground && guide.runner.ground !== player.ground) detours++;
    moods.add(guide.mood); paces.add(Math.round(Math.abs(guide.runner.vs)));
  }
  assert.ok(player.ground?.kind === 'perch', 'player reaches finale');
  assert.ok(guide.runner.s > level.mouths[6].s0 - 8, 'guide reaches final neighbourhood');
  assert.ok(maxGap < 8, `guide separation ${maxGap.toFixed(2)}m`);
  assert.ok(maxSpeed < 0.6, 'guide never teleports between perches');
  assert.ok(['saunter', 'dash', 'wait', 'prowl', 'feint', 'detour'].every(m => moods.has(m)));
  assert.ok(feints > 20 && detours > 20, 'guide really reverses and chooses alternate surfaces');
  assert.ok(paces.has(0) && [...paces].some(v => v >= 7) && paces.has(2), 'wait, slow walk and sprint all occur');
});
check('desktop lead also completes the run without a stranded guide', () => {
  const player=new Runner(level), guide=new Companion(level), auto=new Autopilot(level);
  player.reset(1,1.1);guide.reset(player);let gap=0;
  for(let i=0;i<48000;i++) { const t=i*dt;player.step(dt,auto.input(player,t,dt),t);guide.update(dt,player,t,false);gap=Math.max(gap,Math.abs(player.s-guide.runner.s)); }
  assert.ok(gap<10, 'desktop separation '+gap.toFixed(2));assert.ok(guide.runner.s>level.mouths[6].s0-8);
});
check('curious guide returns through the same alley when Michi does not follow', () => {
  for(const a of level.alleys) {
    const player=new Runner(level), guide=new Companion(level);
    player.reset(a.s0-.7,0);guide.reset(player);guide.runner.reset(a.s0+.8,0);
    guide.modeIndex=6;guide.duration=5;let entered=false;
    for(let i=0;i<1200;i++) { player.step(dt,{},i*dt);guide.update(dt,player,i*dt,true);if(guide.runner.alley===a.id)entered=true; }
    assert.ok(entered,a.name+' invitation occurs');assert.equal(guide.runner.alley,null,a.name+' returns to Michi');
  }
});
check('guide keeps up when cargo boats begin at different points in their cycles', () => {
  for (const phase of [4, 9, 13, 18]) {
    const player = new Runner(level), guide = new Companion(level), auto = new Autopilot(level);
    player.time = phase; player.reset(1, 1.1); guide.reset(player, phase);
    let maxGap = 0;
    for (let i = 0; i < 48000; i++) {
      const t = phase + i * dt; player.step(dt, auto.input(player, t, dt), t);
      guide.update(dt, player, t, true);
      maxGap = Math.max(maxGap, Math.abs(player.s - guide.runner.s));
    }
    assert.ok(player.ground?.kind === 'perch');
    assert.ok(maxGap < 10, `boat phase ${phase}: guide gap ${maxGap.toFixed(2)}m`);
  }
});
check('guide follows stopping, dropping and backtracking from all seven lanterns', () => {
  for (const cp of level.checkpoints) {
    const player = new Runner(level), guide = new Companion(level);
    player.reset(cp.s, cp.y); guide.reset(player);
    let maxGap = 0;
    for (let i = 0; i < 3600; i++) {
      const t = i * dt, move = i < 1200 ? 1 : i < 2400 ? 0 : -1;
      player.step(dt, { move, downHeld: true, sprint: i < 600 }, t);
      guide.update(dt, player, t, true);
      maxGap = Math.max(maxGap, Math.abs(player.s - guide.runner.s));
    }
    assert.ok(maxGap < 6, `lantern ${cp.mouth}: ${maxGap.toFixed(2)}m`);
    guide.reset(player, 30);
    assert.ok(Math.abs(guide.runner.s - player.s) < 5, 'reset returns the guide beside Michi');
  }
});
check('solid tunnel ceilings stop upward jumps and keep both exits usable', () => {
  for (const c of level.ceilings) {
    const floor = { id: 0, s0: c.s0 - 3, s1: c.s1 + 3, y0: c.y - 0.8, y1: c.y - 0.8, d: (c.d0 + c.d1) / 2, kind: 'deck' };
    const r = new Runner({ platforms: [floor], walls: [], ceilings: [{ ...c, alley: undefined }], length: level.length });
    r.reset((c.s0 + c.s1) / 2, floor.y0); let peak = r.y;
    for (let i = 0; i < 150; i++) { r.step(dt, { jumpPressed: i === 0, jumpHeld: true }, i * dt); peak = Math.max(peak, r.y); }
    assert.ok(peak + 0.32 <= c.y + 1e-5, 'cat cannot pass through the tunnel soffit');
    assert.ok(r.grounded && Math.abs(r.y - floor.y0) < 1e-6, 'cat lands safely below');
  }
});
check('canopy vents do not wall off the market below', () => {
  for (const pc of level.pieces.filter(p => p.type === 'vent')) {
    const mid = (pc.s0 + pc.s1) / 2;
    assert.ok(level.walls.filter(w => Math.abs(w.s - mid) < 0.5).every(w => w.y0 >= 5), 'vent walls start at canopy level');
  }
});
console.log(`${checks} companion/ceiling checks passed`);
