// posts.js — the Seven Posts, the Roof Road's unlock (spec
// docs/superpowers/specs/2026-10-24-rooftop-road-design.md §4, ruling D3).
//
// Walk the EAST railing of the valley bridge from the north end to the south
// end without stepping off. As the cat passes each post its giboshi warms and
// plays the next note of a rising pentatonic scale; step off and the glows fade
// back (a quiet reset, no penalty, no time limit). The seventh note opens the
// Odoi bank's bamboo south of the bridge.
//
// Also the Odoi bank's footprint, its gate and the return spot (R6.2), which
// src/rooftops/valley.js builds and RooftopManager reads.
//
// Pure: no three.js, no DOM. The geometry is the valley bridge's
// (Countryside.layoutRiverAndBridge: deck centre (-1, 30.5), walkable rails at
// x = -1 ± 1.24 ± 0.21 with tops at deck + 0.66 = 1.66, seven posts per side at
// local z = -4 … 4) and of the kit bridge (src/kit/water/bridge.js BRIDGE),
// which keeps the same posts and rails. +x is east, -z is north (the north
// ramp is sz = -1).

export const BRIDGE_X = -1;
export const BRIDGE_Z = 30.5;
/** The east railing's walkable top (Countryside's railing platform, s = +1). */
export const EAST_RAIL = Object.freeze({ x: BRIDGE_X + 1.24, half: 0.21, top: 1.66, minY: 1.6, z0: BRIDGE_Z - 4.2, z1: BRIDGE_Z + 4.2 });
/** The seven posts, north to south (world z). */
export const POST_Z = Object.freeze([0, 1, 2, 3, 4, 5, 6].map((i) => BRIDGE_Z - 4 + (i / 6) * 8));
/** A rising pentatonic scale, one note per post (C5 D5 E5 G5 A5 C6 D6). */
export const PENTATONIC = Object.freeze([523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]);

/**
 * The Odoi bank, in world metres. Its gap sits at the foot of the bridge's south
 * ramp, a little east of the ramp's axis (x = -1): the edge forest's trunks stand
 * at x ≈ -1.5 and x ≈ 2.1 just behind the bank, and the gate stands between them.
 */
export const ODOI = Object.freeze({
  seed: 0x0D01,
  z: 38.7, depth: 2.4, crest: 0.9, height: 1.35,
  x0: -11, x1: 9, gap0: -0.45, gap1: 1.15
});
/**
 * Walking into the open gap starts the noren veil: the cat at the foot of the
 * south ramp (it ends at z = 37.3; the forest stops a cat at z ≈ 36.7), anywhere
 * across the ramp's width, on the ground (not on a kerb or a jump).
 */
export const ODOI_GATE = Object.freeze({ x0: -2.0, x1: 1.0, z: 36.45, maxY: 1.25 });
/** The cat's spot on the way back: the bridge's south ramp, facing north (the valley). */
export const ODOI_RETURN = Object.freeze({ x: -1, y: 0.67, z: 35.7, heading: Math.PI });

/** True when the cat (world position) stands in the open gap's mouth (ODOI_GATE). */
export function inOdoiGate(pos) {
  return pos.x >= ODOI_GATE.x0 && pos.x <= ODOI_GATE.x1 && pos.z >= ODOI_GATE.z && pos.z <= ODOI.z && pos.y <= ODOI_GATE.maxY;
}

/** How far past the rail's band the cat may drift (a hop, a wobble) before it counts as off. */
const BAND = EAST_RAIL.half + 0.05;
/** The walk must start at the north end: the first post lights only from here (world z). */
const START_Z = POST_Z[0] + 0.6;

/** True when the cat (world position) is on, or hopping just above, the east railing. */
export function onEastRail(pos) {
  return Math.abs(pos.x - EAST_RAIL.x) <= BAND && pos.y >= EAST_RAIL.minY &&
    pos.z >= EAST_RAIL.z0 - 0.1 && pos.z <= EAST_RAIL.z1 + 0.1;
}

export class SevenPosts {
  constructor() {
    this.lit = 0;          // posts lit in this walk (0 … 7)
    this.complete = false; // the seventh note has rung: the unlock is permanent
    this.started = false;  // this walk began at the north end
  }

  /** Forget the current walk (the glows fade back). */
  reset() {
    this.lit = 0;
    this.started = false;
  }

  /**
   * Feed the cat's world position once per frame. Returns the events of this
   * frame, in order: { type: 'post', index } for each post passed (index 0 is
   * the north end), { type: 'reset', lit } when a walk with lit posts is broken
   * by stepping off, and { type: 'complete' } after the seventh post.
   */
  update(pos) {
    const events = [];
    if (this.complete) return events;
    if (!onEastRail(pos)) {
      if (this.lit > 0) events.push({ type: 'reset', lit: this.lit });
      this.reset();
      return events;
    }
    // A walk counts only from the north end: climbing on halfway lights nothing
    // until the cat steps off and starts again at the first post.
    if (!this.started) {
      if (pos.z > START_Z) return events;
      this.started = true;
    }
    while (this.lit < POST_Z.length && pos.z >= POST_Z[this.lit] - 0.12) {
      events.push({ type: 'post', index: this.lit });
      this.lit++;
    }
    if (this.lit === POST_Z.length) {
      this.complete = true;
      events.push({ type: 'complete' });
    }
    return events;
  }
}
