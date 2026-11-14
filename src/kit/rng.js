// Seeded randomness for kit assets.
//
// Every kit builder draws from its own stream, never from the valley's
// seeded layout stream (`Countryside.random()`), so a kit asset can grow a
// twig or drop a tile without shifting anything the classic layout placed
// after it. The generator is the same mulberry32 the valley uses, so the
// behaviour is familiar; only the seed differs: `hashId(id) ^ layout.index`.
//
// Pure: no three.js, importable under Node (tools/kit_test.mjs).

/**
 * mulberry32 — identical output sequence to the valley's generator in
 * `src/countryside.js` for the same seed (the state is kept wrapped to
 * 32 bits, which is what the valley's `a += …` version computes modulo 2^32).
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash of an asset id → unsigned 32-bit seed. Stable forever. */
export function hashId(id) {
  const s = String(id);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The seed of one placed instance: `hashId(id) ^ layout.index` (§3.3). */
export function assetSeed(id, index = 0) {
  return (hashId(id) ^ (Number(index) | 0)) >>> 0;
}

/** The per-instance stream handed to `build(ctx, …)` as `ctx.rng`. */
export function assetRng(id, index = 0) {
  return mulberry32(assetSeed(id, index));
}

/** Convenience draws on top of a stream. */
export const draw = {
  range: (rng, a, b) => a + (b - a) * rng(),
  int: (rng, a, b) => a + Math.floor(rng() * (b - a + 1)),
  pick: (rng, list) => list[Math.floor(rng() * list.length)],
  chance: (rng, p) => rng() < p,
  jitter: (rng, amount) => (rng() * 2 - 1) * amount
};
