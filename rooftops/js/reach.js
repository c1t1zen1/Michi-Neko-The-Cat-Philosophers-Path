// Reach: what a jump can cover, and which platforms connect to which.
//
// The numbers come straight from PHYS (the game's jump), so this is the
// analytic twin of physics.js. tools/rooftop_test.mjs uses it to prove the
// route is finishable from anywhere, and ?debug=1 draws the graph.

import { PHYS, platTop, platOffset, droppable } from './physics.js';

const FALL = () => PHYS.gravity * PHYS.fallMul;

export const apex = (vy0 = PHYS.jump) => (vy0 * vy0) / (2 * PHYS.gravity);
export const tUp = (vy0 = PHYS.jump) => vy0 / PHYS.gravity;

/** Time at which the falling feet pass height h above take-off (−1 if never). */
export function tDown(h, vy0 = PHYS.jump) {
  const A = apex(vy0);
  if (h > A) return -1;
  return tUp(vy0) + Math.sqrt((2 * (A - h)) / FALL());
}

/**
 * Horizontal reach to land on a surface h above take-off at full speed.
 * With `mantle` the feet only need to come within PHYS.mantle of the top.
 */
export function reach(h, speed, vy0 = PHYS.jump, mantle = true) {
  const t = tDown(mantle ? h - PHYS.mantle : h, vy0);
  return t < 0 ? -1 : speed * t;
}

/** Take-off speed and launch velocity available from a platform. */
export function launchFrom(p, sprint = true) {
  let speed = PHYS.run * (sprint ? PHYS.sprintMul : 1);
  if (p.kind === 'rope') speed = PHYS.run * PHYS.prowlMul;
  if (p.kind === 'water') speed = PHYS.run * PHYS.waterMul;
  const vy0 = p.kind === 'futon' ? PHYS.futonVy : PHYS.jump;
  return { speed, vy0 };
}

/** s range a platform can occupy (a moving platform sweeps its travel). */
export function sweep(p) {
  if (!p.move) return [p.s0, p.s1];
  return [p.s0, p.s1 + p.move.amp];
}

function topAtEdge(p, s) {
  // Moving platforms are judged at the offset that brings them to s.
  if (!p.move) return platTop(p, s, 0);
  return p.y0;
}

/**
 * Can the cat get from A onto B?
 * opts.strict: route rules (no mantle, 80 % of reach, run pace unless sprint).
 * Returns { ok, how, gap, rise } — how ∈ walk | jump | climb | drop.
 */
export function link(A, B, opts = {}) {
  const strict = !!opts.strict;
  const [a0, a1] = sweep(A);
  const [b0, b1] = sweep(B);
  const { speed: sp, vy0 } = launchFrom(A, strict ? !!opts.sprint : true);
  const margin = strict ? 0.8 : 1;
  const ovl0 = Math.max(a0, b0), ovl1 = Math.min(a1, b1);

  if (ovl1 - ovl0 > 0.25) {
    // Overlapping in s: a straight climb, a drop, or a step.
    const sm = (ovl0 + ovl1) / 2;
    const rise = topAtEdge(B, sm) - topAtEdge(A, sm);
    if (rise <= PHYS.step + 1e-6 && rise >= -PHYS.guard) return { ok: true, how: 'walk', gap: 0, rise };
    if (rise < 0) {
      const canDrop = droppable(A) || (a0 > b0 + 0.1) || (a1 < b1 - 0.1);
      return { ok: canDrop, how: 'drop', gap: 0, rise };
    }
    // Up through a one-way platform, or onto an edge with a mantle.
    const edgeInside = (b0 >= a0 - 0.5 && b0 <= a1 + 0.5) || (b1 >= a0 - 0.5 && b1 <= a1 + 0.5);
    // Straight up through the middle only the 5 cm landing tolerance helps;
    // off-route, an edge within reach allows a mantle.
    let limit = apex(vy0) + 0.05;
    if (!strict && edgeInside) limit = apex(vy0) + PHYS.mantle;
    if (B.solid && !edgeInside) return { ok: false, how: 'climb', gap: 0, rise };
    return { ok: rise <= limit + 1e-6, how: 'climb', gap: 0, rise };
  }

  // A gap: jump from A's near end to B's near end.
  const ahead = b0 >= a1 - 0.25;
  const sA = ahead ? a1 : a0;
  const sB = ahead ? b0 : b1;
  const gap = Math.max(0, ahead ? b0 - a1 : a0 - b1);
  const rise = topAtEdge(B, sB) - topAtEdge(A, sA);
  if (gap <= 2 * PHYS.foot + 1e-6 && rise <= PHYS.step && rise >= -PHYS.guard) {
    return { ok: true, how: 'walk', gap, rise };
  }
  const r = reach(rise, sp, vy0, !strict);
  return { ok: r > 0 && gap <= r * margin + 1e-6, how: rise < -PHYS.guard ? 'drop' : 'jump', gap, rise, reach: r };
}

/** Adjacency over all platforms (non-strict physics). */
export function buildGraph(level, maxSpan = 14) {
  const P = level.platforms;
  const out = P.map(() => []);
  for (let i = 0; i < P.length; i++) {
    const [a0, a1] = sweep(P[i]);
    for (let j = 0; j < P.length; j++) {
      if (i === j) continue;
      const [b0, b1] = sweep(P[j]);
      if (b0 > a1 + maxSpan || b1 < a0 - maxSpan) continue;
      if (link(P[i], P[j]).ok) out[i].push(j);
    }
  }
  return out;
}

/** Ids reachable from `starts` (optionally never stepping on `avoid`). */
export function reachable(graph, starts, avoid = null) {
  const seen = new Set(starts);
  const queue = [...starts];
  while (queue.length) {
    const i = queue.shift();
    for (const j of graph[i]) {
      if (seen.has(j) || (avoid && avoid(j))) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return seen;
}

/** Ids from which `goal` can be reached. */
export function canReach(graph, goal, avoid = null) {
  const rev = graph.map(() => []);
  graph.forEach((outs, i) => outs.forEach((j) => rev[j].push(i)));
  return reachable(rev, [goal], avoid);
}

export { platOffset };
