// The runner: Michi's body on the Roof Road, in (s, y) along the rail.
//
// The constants are the game's own (src/player.js): the same run, sprint,
// jump, gravity, coyote time, jump buffer, variable height and ledge guard,
// so a gap tuned here plays the same in the valley. New for the run: a
// mantle at roof edges, futons that bounce, ropes that make the cat prowl,
// and the canopy's low friction.
//
// Pure: no three.js. The page feeds it input and reads s / y / depth back.

export const PHYS = {
  run: 4.5,           // player.speed
  sprintMul: 1.7,     // player.sprintMultiplier
  jump: 7.2,          // player.jumpForce
  gravity: 20,        // -player.gravity
  fallMul: 1.4,       // snappier fall
  releaseMul: 1.7,    // short hop on an early release
  releaseClamp: 3.2,  // onJumpRelease()
  coyote: 0.12,
  buffer: 0.15,
  guard: 0.55,        // ledge guard: never walk off a drop bigger than this
  step: 0.3,          // walk up kerbs and ridge stacks
  mantle: 0.35,       // pull up when the feet are this close under an edge
  futonVy: 8.6,       // a futon flings the cat ≈1.85 m
  prowlMul: 0.45,     // player.isProwling
  waterMul: 0.55,     // wading
  canopyAccel: 6,
  canopyDecel: 4,
  halfLen: 0.22,      // body half-length along s (walls, edges)
  body: 0.32,         // body height (walls, ceilings)
  foot: 0.12,         // a paw may hang this far past a platform end
  dropTime: 0.25
};

// Platform kinds the cat can't drop through with ↓.
const NO_DROP = new Set(['street', 'water']);

/** Current s offset of a moving platform (ping-pong, eased). */
export function platOffset(p, time) {
  const m = p.move;
  if (!m) return 0;
  const ph = (time / m.period + (m.phase || 0)) * Math.PI * 2;
  return m.amp * (0.5 - 0.5 * Math.cos(ph));
}

/** Platform top at s (clamped to its ends), for moving platforms at `time`. */
export function platTop(p, s, time = 0) {
  if (p.y0 === p.y1) return p.y0;
  const off = platOffset(p, time);
  const k = Math.min(1, Math.max(0, (s - off - p.s0) / (p.s1 - p.s0)));
  return p.y0 + (p.y1 - p.y0) * k;
}

export function platCovers(p, s, time = 0, margin = 0) {
  const off = p.move ? platOffset(p, time) : 0;
  return s >= p.s0 + off - margin && s <= p.s1 + off + margin;
}

export function droppable(p) {
  return !NO_DROP.has(p.kind) && !p.solid;
}

export class Runner {
  /** @param level the object from buildLevel() */
  constructor(level) {
    this.level = level;
    this.events = [];
    this.reset(0.5, 0);
  }

  reset(s, y) {
    this.s = s;
    this.y = y;
    this.vs = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.ground = null;
    this.lastGround = null;
    this.bufferT = 0;
    this.coyoteT = 0;
    this.dropIgnore = null;
    this.dropT = 0;
    this.peering = false;
    this.inWater = false;
    this.onRope = false;
    this.sprinting = false;
    this.time = this.time || 0;
    const sup = this.support(s, y + 0.5, 0, 60);
    if (sup) { this.y = platTop(sup, s, this.time); this.grounded = true; this.ground = sup; this.lastGround = sup; }
  }

  /** Depth the walls test against: whatever the cat last stood on. */
  get depth() {
    const g = this.ground || this.lastGround;
    return g ? g.d : 0;
  }

  /** Highest platform at s whose top lies in [y - down, y + up]. */
  support(s, y, up, down, time = this.time) {
    let best = null, bestTop = -Infinity;
    for (const p of this.level.platforms) {
      if (p === this.dropIgnore && this.dropT > 0) continue;
      if (!platCovers(p, s, time, PHYS.foot)) continue;
      const top = platTop(p, s, time);
      if (top > y + up || top < y - down) continue;
      if (top > bestTop) { bestTop = top; best = p; }
    }
    return best;
  }

  /** Clamp a horizontal move against one-way building walls. */
  _walls(from, to, grounded) {
    const dir = Math.sign(to - from);
    if (!dir) return to;
    const d = this.depth;
    const lo = this.y + 0.03, hi = this.y + PHYS.body;
    for (const w of this.level.walls) {
      if (w.dir !== dir) continue;
      if (d < w.d0 - 0.3 || d > w.d1 + 0.3) continue;
      if (hi <= w.y0 || lo >= w.y1) continue;
      if (grounded && w.y1 - this.y <= PHYS.step) continue; // a kerb, not a wall
      const front0 = from + dir * PHYS.halfLen, front1 = to + dir * PHYS.halfLen;
      const crosses = dir > 0 ? (front0 <= w.s + 1e-6 && front1 > w.s) : (front0 >= w.s - 1e-6 && front1 < w.s);
      if (crosses) {
        to = w.s - dir * (PHYS.halfLen + 1e-4);
        this.vs = 0;
        this.blockedBy = w;
      }
    }
    return to;
  }

  /**
   * Advance one tick.
   * @param input {move:-1..1, jumpHeld, jumpPressed, jumpReleased, downHeld, downPressed, sprint}
   */
  step(dt, input, time) {
    const P = PHYS;
    const L = this.level;
    dt = Math.min(dt, 1 / 20);
    this.events.length = 0;
    const prevTime = this.time;
    this.time = time;
    this.blockedBy = null;
    this.peering = false;

    if (this.dropT > 0) { this.dropT -= dt; if (this.dropT <= 0) this.dropIgnore = null; }
    this.bufferT = input.jumpPressed ? P.buffer : Math.max(0, this.bufferT - dt);
    this.coyoteT = this.grounded ? P.coyote : Math.max(0, this.coyoteT - dt);

    const g = this.grounded ? this.ground : null;
    const kind = g ? g.kind : null;
    this.onRope = kind === 'rope';
    this.inWater = kind === 'water';

    // Pace: instant, like the valley, except on the canopy's smooth roof.
    const move = Math.max(-1, Math.min(1, input.move || 0));
    if (move) this.facing = Math.sign(move);
    let speed = P.run * Math.abs(move);
    this.sprinting = !!input.sprint && !this.onRope && !this.inWater && speed > 0;
    if (this.sprinting) speed *= P.sprintMul;
    if (this.onRope) speed *= P.prowlMul;
    if (this.inWater) speed *= P.waterMul;
    const target = Math.sign(move) * speed;
    if (kind === 'canopy') {
      const rate = (target && Math.sign(target) === Math.sign(this.vs || target) && Math.abs(target) > Math.abs(this.vs))
        ? P.canopyAccel : P.canopyDecel;
      const dv = target - this.vs;
      this.vs += Math.sign(dv) * Math.min(Math.abs(dv), rate * dt);
    } else {
      this.vs = target;
    }

    // ↓ on a roof, deck or rope: let go and drop to whatever is below.
    if (this.grounded && input.downPressed && g && droppable(g)) {
      this.dropIgnore = g;
      this.dropT = P.dropTime;
      this.grounded = false;
      this.ground = null;
      this.vy = 0;
      this.events.push('drop');
    }

    // Jump (buffered, with coyote time). A futon turns it into a fling.
    if (this.bufferT > 0 && (this.grounded || this.coyoteT > 0)) {
      const from = this.grounded ? this.ground : this.lastGround;
      this.vy = from && from.kind === 'futon' ? P.futonVy : P.jump;
      this.y += 0.02;
      this.grounded = false;
      this.ground = null;
      this.bufferT = 0;
      this.coyoteT = 0;
      this.events.push('jump');
    }

    // Ride a moving platform.
    let s = this.s;
    if (this.grounded && this.ground.move) {
      s += platOffset(this.ground, time) - platOffset(this.ground, prevTime);
    }

    // Horizontal.
    let sNew = this._walls(s, s + this.vs * dt, this.grounded);
    if (this.grounded) {
      const sup = this.support(sNew, this.y, P.step, P.guard, time);
      if (sup) {
        s = sNew;
        this.y = platTop(sup, s, time);
        this.ground = sup;
      } else {
        const onFloor = this.ground && NO_DROP.has(this.ground.kind);
        if (input.downHeld || onFloor) {
          s = sNew;
          this.grounded = false;
          this.ground = null;
          this.vy = 0;
          this.events.push('leave');
        } else {
          // Ledge guard: the cat stops at the edge and peers over.
          this.vs = 0;
          this.peering = true;
        }
      }
    } else {
      s = sNew;
    }
    this.s = s;

    // Vertical.
    if (!this.grounded) {
      if (input.jumpReleased && this.vy > P.releaseClamp) this.vy = P.releaseClamp;
      let grav = P.gravity;
      if (this.vy < 0) grav *= P.fallMul;
      else if (!input.jumpHeld && this.vy > 0) grav *= P.releaseMul;
      this.vy -= grav * dt;
      const prevY = this.y;
      this.y += this.vy * dt;

      // Ceilings: solid platforms (the canopy) stop a jump from below.
      if (this.vy > 0) {
        for (const p of L.platforms) {
          if (!p.solid || !platCovers(p, this.s, time, -PHYS.halfLen * 0.5)) continue;
          const under = platTop(p, this.s, time) - 0.12;
          if (prevY + P.body <= under + 1e-6 && this.y + P.body > under) {
            this.y = under - P.body;
            this.vy = 0;
          }
        }
      }

      // Mantle: feet just under an edge in the direction of travel.
      const dir = this.vs ? Math.sign(this.vs) : (move ? Math.sign(move) : 0);
      if (dir) {
        for (const p of L.platforms) {
          if (p === this.dropIgnore && this.dropT > 0) continue;
          const off = p.move ? platOffset(p, time) : 0;
          const edge = dir > 0 ? p.s0 + off : p.s1 + off;
          const ahead = (this.s - edge) * dir;            // >0 once past the edge
          if (ahead < -(P.halfLen + 0.08) || ahead > 0.45) continue;
          const top = platTop(p, edge + dir * 0.1, time);
          const below = top - this.y;
          if (below <= 0 || below > P.mantle) continue;
          if (this.vy > 2.5) continue;                     // still rising clear of it
          this.s = edge + dir * Math.max(0.12, ahead);
          this.y = top;
          this.vy = 0;
          this.grounded = true;
          this.ground = p;
          this.events.push('mantle');
          break;
        }
      }

      // Land on the highest surface crossed this tick.
      if (!this.grounded && this.vy <= 0) {
        let best = null, bestTop = -Infinity;
        for (const p of L.platforms) {
          if (p === this.dropIgnore && this.dropT > 0) continue;
          if (!platCovers(p, this.s, time, P.foot)) continue;
          const top = platTop(p, this.s, time);
          if (prevY >= top - 0.05 && this.y <= top + 1e-6 && top > bestTop) { bestTop = top; best = p; }
        }
        if (best) {
          const impact = this.vy;
          this.y = bestTop;
          this.vy = 0;
          this.grounded = true;
          this.ground = best;
          this.events.push(best.kind === 'water' ? 'splash' : 'land');
          if (best.kind === 'futon' && impact < -1.5 && !input.downHeld) {
            this.vy = P.futonVy;
            this.grounded = false;
            this.ground = null;
            this.lastGround = best;
            this.events.push('bounce');
          }
        }
      }
    }

    if (this.grounded) {
      this.lastGround = this.ground;
      this.inWater = this.ground.kind === 'water';
      this.onRope = this.ground.kind === 'rope';
    }

    // The rail ends are the world's ends.
    const lo = 0.3, hi = L.length - 0.3;
    if (this.s < lo || this.s > hi) { this.s = Math.min(hi, Math.max(lo, this.s)); this.vs = 0; }
    // Belt and braces: never fall out of the world.
    if (this.y < -6) this.reset(this.s, 0);
  }
}
