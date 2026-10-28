// Autopilot: drives the runner along the level's route platforms.
//
// tools/rooftop_test.mjs uses it to prove the route can be run on the real
// physics without touching the street; the page uses it for ?auto=1, the
// attract mode. It only produces input — the Runner does the moving.

import { PHYS, platTop, platOffset } from './physics.js';

export class Autopilot {
  constructor(level) {
    this.route = level.platforms.filter((p) => p.route !== undefined).sort((a, b) => a.route - b.route);
    this.idx = 0;
    this.jumpHeldT = 0;
  }

  get done() { return this.idx >= this.route.length - 1; }

  /** Input for this tick, given the runner's state before it steps. */
  input(r, t, dt) {
    const route = this.route;
    if (r.grounded && r.ground.route !== undefined && r.ground.route > this.idx) this.idx = r.ground.route;
    // A futon bounce leaves the ground in the same tick it lands.
    if (r.events.includes('bounce') && r.lastGround && r.lastGround.route !== undefined && r.lastGround.route > this.idx) {
      this.idx = r.lastGround.route;
    }
    const input = { move: 0, jumpHeld: false, jumpPressed: false, jumpReleased: false, sprint: false, downPressed: false, downHeld: false };
    const B = route[this.idx + 1];
    if (!B) return input;
    input.sprint = !!B.sprint;

    let A = r.grounded ? r.ground : null;
    // Two slopes meeting at a gable peak trade places as the support; judge
    // edges from the route platform already reached.
    if (A && A.route !== undefined && A.route < this.idx && Math.abs(A.s1 - route[this.idx].s0) < 0.3) A = route[this.idx];
    const off = B.move ? platOffset(B, t) : 0;
    const b0 = B.s0 + off, b1 = B.s1 + off;
    const jump = () => { input.jumpPressed = true; this.jumpHeldT = 0.5; };

    if (A) {
      const aOff = A.move ? platOffset(A, t) : 0;
      const a0 = A.s0 + aOff, a1 = A.s1 + aOff;
      const rise = platTop(B, Math.min(Math.max(r.s, b0), b1), t) - r.y;
      const overlap = Math.min(a1, b1) - Math.max(a0, b0) > 0.25;
      if (overlap) {
        // Stand under the middle of the overlap, then climb or drop.
        const mid = (Math.max(a0, b0) + Math.min(a1, b1)) / 2;
        if (Math.abs(r.s - mid) > 0.15) input.move = Math.sign(mid - r.s);
        else if (rise > PHYS.step) jump();
        else if (rise < -PHYS.step) { input.downPressed = true; input.downHeld = true; }
        else input.move = Math.sign((b0 + b1) / 2 - r.s) || 1;
      } else {
        const dir = Math.sign((b0 + b1) / 2 - r.s);
        const edge = dir > 0 ? a1 : a0;
        const gapB = dir > 0 ? b0 - a1 : a0 - b1;
        input.move = dir;
        if (A.move && gapB > 1.6) {
          input.move = 0;                       // riding: wait to be carried close
        } else if (B.move) {
          // Wait at the edge for the boat, then step or hop on.
          const gapNow = dir > 0 ? b0 - edge : edge - b1;
          if (Math.abs(edge - r.s) < 0.35) {
            if (gapNow > 1.6 || gapNow < -1.0) input.move = 0;
            else if (rise < -PHYS.guard) input.downHeld = true;
            else jump();
          }
        } else if (Math.abs(edge - r.s) < 0.32 && (dir > 0 ? r.s <= edge + 0.1 : r.s >= edge - 0.1)) {
          if (rise > PHYS.step || gapB > 2 * PHYS.foot) jump();
          else if (rise < -PHYS.guard) input.downHeld = true;
        }
      }
      // A hurdle (canopy vent, taller neighbour) stopped us last tick: hop it.
      if (r.blockedBy && input.move) jump();
    } else {
      // In the air: steer onto B.
      const tgt = Math.min(Math.max(r.s, b0 + 0.3), b1 - 0.3);
      if (Math.abs(tgt - r.s) > 0.05) input.move = Math.sign(tgt - r.s);
    }
    if (this.jumpHeldT > 0) { this.jumpHeldT -= dt; input.jumpHeld = true; }
    return input;
  }
}
