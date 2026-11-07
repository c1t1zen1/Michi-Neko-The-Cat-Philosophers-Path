// What the cat can stand on and bump into. Pure functions, no three.js.
// A solid is a column between bottom(x, z) and top(x, z) over a footprint:
// walkable ones carry the cat, the rest only block. The game's own numbers:
// 7.2 m/s take-off, gravity 20 (x1.4 falling), so the apex is about 1.3 m.

export const PHYS = {
  jump: 7.2, gravity: 20, fallMul: 1.4,
  step: 0.3,          // walk up kerbs, ridges, the lip of a ramp
  height: 0.3,        // the cat's body, for ceilings (swimming under the deck)
  radius: 0.13,
  wade: 0.24,         // deeper than this and the paws leave the bed
  float: 0.25,        // a swimming cat's root sits this far below the surface: back awash, head up
  wadeMul: 0.6, swimMul: 0.42, drift: 0.85
};

const num = (v) => (typeof v === 'function' ? v : () => v);

/** Axis-aligned box footprint. */
export function rectSolid({ x0, x1, z0, z1, top, bottom = -20, walk = true, kind = 'solid', name = '' }) {
  const T = num(top), B = num(bottom);
  return {
    kind, name, walk, top: T, bottom: B,
    contains: (x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m,
    bounds: { x0, x1, z0, z1 }
  };
}

/** Oriented box: centre, angle = the mesh's rotation.y (0 = long axis along z), half length/width. */
export function obbSolid({ cx, cz, ang = 0, hl, hw, top, bottom = -20, walk = true, kind = 'solid', name = '' }) {
  const s = { kind, name, walk, cx, cz, ang, hl, hw };
  s.top = num(top); s.bottom = num(bottom);
  s.local = (x, z) => {
    const dx = x - s.cx, dz = z - s.cz, c = Math.cos(s.ang), n = Math.sin(s.ang);
    return [dx * c - dz * n, dx * n + dz * c];   // [across, along]
  };
  s.contains = (x, z, m = 0) => { const [a, l] = s.local(x, z); return Math.abs(a) < s.hw + m && Math.abs(l) < s.hl + m; };
  return s;
}

/** Ellipse footprint (stepping stones, boulders, posts). */
export function ellipseSolid({ x, z, rx, rz = rx, ang = 0, top, bottom = -20, walk = true, kind = 'solid', name = '' }) {
  const T = num(top), B = num(bottom);
  return {
    kind, name, walk, top: T, bottom: B, x, z, rx, rz,
    contains: (px, pz, m = 0) => {
      const dx = px - x, dz = pz - z, c = Math.cos(ang), n = Math.sin(ang);
      const a = (dx * c - dz * n) / (rx + m), b = (dx * n + dz * c) / (rz + m);
      return a * a + b * b < 1;
    }
  };
}

/** Highest walkable top at (x, z) no higher than yMax (terrain otherwise). */
export function topAt(world, x, z, yMax) {
  let best = world.groundAt(x, z);
  for (const s of world.solids) {
    if (!s.walk || !s.contains(x, z)) continue;
    const t = s.top(x, z);
    if (t <= yMax && t > best) best = t;
  }
  return best;
}

/** Support under a cat at (x, z) facing `heading`: the best of front paws, centre and hind paws. */
export function supportAt(world, x, z, heading, y, reach = 0.17) {
  const yMax = y + PHYS.step;
  const sx = Math.sin(heading) * reach, sz = Math.cos(heading) * reach;
  return Math.max(topAt(world, x, z, yMax), topAt(world, x + sx, z + sz, yMax), topAt(world, x - sx, z - sz, yMax));
}

/** Is a cat body standing at height y blocked at (x, z)? */
export function blockedAt(world, x, z, y) {
  const r = PHYS.radius;
  if (x < world.bounds.x0 || x > world.bounds.x1 || z < world.bounds.z0 || z > world.bounds.z1) return true;
  for (const s of world.solids) {
    if (!s.contains(x, z, s.walk ? r * 0.5 : r)) continue;
    const top = s.top(x, z), bottom = s.bottom(x, z);
    if (y < top - PHYS.step && y + PHYS.height > bottom) return true;
  }
  // terrain steeper than a step (the paddy terrace riser, steep banks)
  return world.groundAt(x, z) > y + PHYS.step + 0.15;
}

/** The solid under (x, z) that carries the cat at height y, if any (for moving decks). */
export function carrierAt(world, x, z, y) {
  for (const s of world.solids) {
    if (s.walk && s.moving && s.contains(x, z) && Math.abs(s.top(x, z) - y) < 0.05) return s;
  }
  return null;
}
