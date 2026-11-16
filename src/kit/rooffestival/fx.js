// rooffestival part b: helpers shared by the sky, hills, fires, city and atmosphere builders.
// Pure at import (no DOM, R67): canvases are made only when a builder runs in a browser.
import * as THREE from 'three';

export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** rooftops/js/sky.js hashCloud: the Roof Road's own sin hash (the fires' bed order and the clouds use it). */
export function hashCloud(x) {
  const n = Math.sin(x * 91.17 + 17.31) * 43758.5453;
  return n - Math.floor(n);
}

/** Terrain height of the hill ring at angle a (0 = +x, east); the same function as sky.js hillHeight (the fires stand on it). */
export function hillHeight(a) {
  const east = Math.cos(a);
  const north = -Math.sin(a);
  const base = 26 + 46 * Math.max(0, north) + 40 * Math.max(0, east) + 22 * Math.max(0, -east) * Math.max(0, north + 0.3);
  const south = Math.max(0, Math.sin(a));
  const n = Math.sin(a * 7.0) * 7 + Math.sin(a * 13.0 + 1.3) * 4 + Math.sin(a * 29.0) * 1.6;
  return Math.max(6, (base + n) * (1 - 0.82 * south * south));
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function canvasTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Free every geometry, private material and texture under `root` (shared kit materials are flagged userData.kit and kept). */
export function disposeTree(root) {
  const mats = new Set(), texs = new Set();
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    for (const m of [].concat(o.material || [])) mats.add(m);
  });
  for (const m of mats) {
    if (m.userData && m.userData.kit) continue;
    if (m.map) texs.add(m.map);
    if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) texs.add(u.value);
    m.dispose();
  }
  for (const t of texs) t.dispose();
}
