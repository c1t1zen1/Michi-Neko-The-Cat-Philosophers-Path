// Chidori uses the same feet, walls, boat offsets and jump physics as Michi.
// Intent changes independently of the player; distance is a leash, not a clock.
import { Runner, PHYS, platTop, platOffset, platCovers } from './physics.js';
import { buildGraph } from './reach.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FLOOR = new Set(['street', 'water']);
const MOODS = [
  { name: 'saunter', duration: 2.8, pace: 0.64, lead: 2.7 },
  { name: 'dash', duration: 1.15, pace: 1, lead: 3.6 },
  { name: 'wait', duration: 1.05, pace: 0, lead: 2.6 },
  { name: 'prowl', duration: 1.8, pace: 0.4, lead: 2.2 },
  { name: 'feint', duration: 1.1, pace: 0.54, lead: -0.65 },
  { name: 'dash', duration: 1.45, pace: 1, lead: 3.5 },
  { name: 'detour', duration: 2.4, pace: 0.72, lead: 2.5 }
];
export class Companion {
  constructor(level) {
    this.level = level;
    this.runner = new Runner(level);
    this.graph = buildGraph(level);
    this.modeIndex = 0; this.modeTime = 0; this.replan = 0; this.target = null;
    this.jumpT = 0; this.stuckT = 0; this.steps = 0;
  }
  get mood() { return MOODS[this.modeIndex].name; }
  reset(player, time = 0) {
    this.runner.time = time;
    const s = clamp(player.s + 2.2, 0.4, this.level.length - 0.4);
    const support = this.pickSupport(s, player.y, player.depth, time);
    const at = support ? clamp(s, support.s0 + platOffset(support, time) + 0.05, support.s1 + platOffset(support, time) - 0.05) : player.s;
    this.runner.reset(at, support ? platTop(support, at, time) : player.y);
    this.modeIndex = 0; this.modeTime = 0; this.target = null; this.replan = 0;
    this.stuckT = 0; this.jumpT = 0;
  }
  pickSupport(s, y, d, time, detour = false) {
    let best = null, score = Infinity;
    for (const p of this.level.platforms) {
      const off = platOffset(p, time);
      const horizontal = Math.max(0, p.s0 + off - s, s - p.s1 - off);
      if (horizontal > 2.3) continue;
      const top = platTop(p, s, time), dy = top - y;
      // Stay in the player's vertical neighbourhood so a phone never has to
      // zoom out to frame a rooftop guide and a player five storeys below.
      if (dy > 1.35 || dy < -1.65) continue;
      let n = horizontal * 1.4 + Math.abs(dy) * 2 + Math.abs(p.d - d) * 0.17;
      if (detour && !FLOOR.has(p.kind)) n -= 0.45;
      if (n < score) { score = n; best = p; }
    }
    return best;
  }
  pathStep(from, to, player) {
    if (!from || !to || from.id === to.id) return to;
    const q = [from.id], prev = new Map([[from.id, null]]);
    for (let i = 0; i < q.length && i < 150; i++) {
      for (const id of this.graph[q[i]]) {
        if (prev.has(id)) continue;
        const p = this.level.platforms[id];
        if (p.s0 > player.s + 11 || p.s1 < player.s - 8) continue;
        if (p.y0 > player.y + 2.6 || p.y1 < player.y - 3.0) continue;
        prev.set(id, q[i]); q.push(id);
        if (id === to.id) {
          let k = id;
          while (prev.get(k) !== from.id) k = prev.get(k);
          return this.level.platforms[k];
        }
      }
    }
    return null;
  }
  update(dt, player, time, portrait = false) {
    const r = this.runner;
    this.modeTime += dt;
    if (this.modeTime >= MOODS[this.modeIndex].duration) {
      this.modeTime = 0; this.modeIndex = (this.modeIndex + 1) % MOODS.length;
      this.replan = 0;
    }
    const mode = MOODS[this.modeIndex], maxLead = portrait ? 3.5 : 5.4;
    const facing = player.facing || 1;
    let lead = mode.lead * (portrait ? 0.86 : 1.2);
    if (Math.abs(player.vs) > 5 && mode.name !== 'feint') lead = maxLead - 0.5;
    const wanted = clamp(player.s + facing * lead, 0.4, this.level.length - 0.4);
    this.replan -= dt;
    if (this.replan <= 0 || !this.target) {
      this.replan = 0.3;
      let dest = this.pickSupport(wanted, player.y, player.depth, time, mode.name === 'detour');
      this.target = this.pathStep(r.ground || r.lastGround, dest, player);
      if (!this.target) {
        dest = this.pickSupport(wanted, r.y, r.depth, time);
        this.target = this.pathStep(r.ground || r.lastGround, dest, { ...player, y: r.y });
      }
      this.destination = dest;
    }
    const inp = { move: 0, sprint: false, jumpHeld: false, jumpPressed: false, downHeld: false, downPressed: false };
    const separation = (r.s - player.s) * facing;
    let pace = mode.pace;
    if (separation < 0.7 || Math.abs(player.vs) > 5.5) pace = 1;
    if (separation > maxLead || (mode.name === 'wait' && separation > 1.4)) pace = 0;
    const B = this.target;
    if (B && pace > 0) {
      const off = platOffset(B, time), b0 = B.s0 + off, b1 = B.s1 + off;
      const targetS = B === this.destination ? clamp(wanted, b0 + 0.08, b1 - 0.08) : (b0 + b1) / 2;
      const dir = Math.sign(targetS - r.s);
      inp.move = Math.abs(targetS - r.s) > 0.18 ? dir * pace : 0;
      inp.sprint = mode.name === 'dash' || separation < 0.7 || Math.abs(player.vs) > 5;
      if (r.grounded && r.ground !== B) {
        const A = r.ground, ao = platOffset(A, time), a0 = A.s0 + ao, a1 = A.s1 + ao;
        const rise = platTop(B, clamp(r.s, b0, b1), time) - r.y;
        const ov0 = Math.max(a0, b0), ov1 = Math.min(a1, b1);
        if (B.solid && rise > PHYS.step) {
          const left = Math.abs(r.s - b0) < Math.abs(r.s - b1);
          const edge = left ? b0 : b1, outside = left ? r.s < edge - 0.24 : r.s > edge + 0.24;
          if (outside && Math.abs(r.s - edge) < 0.9) {
            inp.move = left ? 1 : -1; inp.jumpPressed = true; this.jumpT = 0.5;
          } else {
            inp.move = Math.sign((edge + (left ? -0.4 : 0.4)) - r.s);
          }
        } else if (ov1 - ov0 > 0.2 && rise < -PHYS.step) {
          inp.downHeld = true; inp.downPressed = true;
          inp.move = Math.sign(wanted - r.s) * Math.max(0.7, pace);
        } else if (ov1 - ov0 > 0.2 && rise > PHYS.step) {
          const mid = (ov0 + ov1) / 2;
          inp.move = Math.abs(r.s - mid) > 0.17 ? Math.sign(mid - r.s) * Math.max(0.65, pace) : 0;
          if (!inp.move) {
            if (rise > 0) { inp.jumpPressed = true; this.jumpT = 0.5; }
            else { inp.downHeld = true; inp.downPressed = true; }
          }
        } else {
          const edge = dir > 0 ? a1 : a0;
          if (Math.abs(edge - r.s) < 0.38) {
            if (rise > PHYS.step || (dir > 0 ? b0 - a1 : a0 - b1) > 0.18) { inp.jumpPressed = true; this.jumpT = 0.5; }
            else if (rise < -PHYS.guard) inp.downHeld = true;
          }
        }
      }
      if (r.blockedBy) { inp.jumpPressed = true; this.jumpT = 0.5; }
    }
    if (!r.grounded && B) {
      const off = platOffset(B, time), x = clamp(wanted, B.s0 + off + 0.08, B.s1 + off - 0.08);
      if (Math.abs(x - r.s) > 0.12) inp.move = Math.sign(x - r.s);
    }
    if (!B && pace > 0) {
      inp.move = Math.sign(wanted - r.s); inp.sprint = true;
      if (r.peering || r.blockedBy) { inp.jumpPressed = true; this.jumpT = 0.5; }
    }
    if (this.jumpT > 0) { this.jumpT -= dt; inp.jumpHeld = true; }
    const before = r.s;
    r.step(dt, inp, time);
    if (inp.move && Math.abs(r.s - before) < 0.001) this.stuckT += dt;
    else this.stuckT = 0;
    if (this.stuckT > 0.7) { this.target = null; this.replan = 0; this.modeIndex = 5; }
    // If Michi changes layers, Chidori drops down to join him. Reappearing
    // after a reset is handled explicitly by reset(), never by a camera warp.
    if (r.grounded && r.y > player.y + 1.8 && !FLOOR.has(r.ground.kind)) {
      r.step(dt, { downPressed: true, downHeld: true }, time + dt);
      this.replan = 0;
    }
    this.steps++;
    return r;
  }
}
