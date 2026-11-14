/**
 * The one dusk eye-shine curve (ruling R27): 0 by day, 1 at night, ramping
 * 17.3-19.5 h in the evening and 4.8-6.8 h at dawn. Used by the player driver
 * in src/main.js and by src/npc.js; both feed `cat.setEyeShine(k)` (the
 * `eye-shine` head part, src/characters/parts/michi_extras.js).
 */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function duskEyeShine(hour) {
  if (hour == null) return 0;
  return hour > 12 ? clamp01((hour - 17.3) / 2.2) : 1 - clamp01((hour - 4.8) / 2);
}
