// Pure data for the "life in the distance" benches (no three.js, so Node can
// test it): the hillside village's house layout, the dawn-mist time envelope
// and the hearth-window glow, all as the game runs them.
import { mulberry32 } from './profiles.js';

export const VILLAGE_CLUSTERS = [[-62, -78, 9], [18, -88, 12], [78, -70, 8], [-95, -35, 6], [95, -20, 7], [40, -96, 6]];
export const WALL_COLORS = [0xf5e6c8, 0xf2b8c6, 0xfdf3e0, 0xe8d8f0];
export const ROOF_COLORS = [0x7a8aa8, 0xc87888, 0x88a890, 0x9a86b0, 0xd8a878];

/** Houses of the distant village: per house x, z, size, wall, roof, 1-3 windows (side, x, height), yaw. */
export function villageHouses(seed = 5, clusters = VILLAGE_CLUSTERS, heightAt = () => 0) {
  const r = mulberry32(seed), houses = [];
  for (const [cx, cz, n] of clusters) {
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * 26, z = cz + (r() - 0.5) * 18, s = 1.4 + r() * 1.6;
      const wall = Math.floor(r() * 4), roof = Math.floor(r() * 5), wn = 1 + Math.floor(r() * 3), windows = [];
      for (let w = 0; w < wn; w++) windows.push([r() < 0.5 ? 1 : -1, (r() - 0.5) * 1.8 * s, (0.6 + r() * 0.7) * s]);
      houses.push({ x, y: heightAt(x, z) - 0.3, z, s, wall, roof, windows, ry: r() * Math.PI });
    }
  }
  return houses;
}

/** Dawn river mist strength 0..1: a bell around 06:15 (from ~04:45, gone by ~09:15), thicker in mist, a little in rain. */
export function dawnStrength(hour, weather = 'clear', weatherBlend = 1) {
  const x = (hour - 6.25) / 1.6;
  const dawn = Math.exp(-x * x);
  const misty = weather === 'mist' ? Math.min(1, weatherBlend * 1.4) : 0;
  const rainy = weather === 'rain' ? 0.25 : 0;
  return Math.min(1, dawn * 0.85 + misty * 0.6 + rainy);
}

/** Sun height (-1..1) by hour for the bench: rises 06:00, sets 18:00. */
export const sunHeight = (hour) => Math.sin(((hour - 6) / 12) * Math.PI);

/** Hearth-window emissive intensity: 0.1 by day, kindling toward 2.7 as the sun drops. */
export function hearthGlow(sunY) {
  const nightness = Math.max(0, 1 - Math.max(0, sunY) * 5);
  return 0.1 + nightness * 2.6;
}
