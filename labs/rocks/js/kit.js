// Five named stone forms, plus a groove canvas for raked gravel.
import * as THREE from 'three';
import { V3, rockGeometry, TAU, rng, canvas2d, canvasTexture, sstep } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';

// The Edo manual's five basic forms. Proportions are read off the names and the
// 1912 guide's description; they are not measured from real stones.
export const FORMS = {
  taido: { label: 'Taidōseki', en: 'Statue stone', hint: 'tall, bulging toward the middle, finishing conically', w: 0.55, h: 1.75, d: 0.5, cuts: 7, flat: 0.75 },
  reisho: { label: 'Reishōseki', en: 'Low vertical', hint: 'an upright guardian, rounded at the base', w: 0.65, h: 1.1, d: 0.6, cuts: 9, flat: 0.7 },
  shintai: { label: 'Shintaiseki', en: 'Flat stone', hint: 'a broad, low, flat stone', w: 1.3, h: 0.34, d: 0.9, cuts: 8, flat: 0.5 },
  shigyo: { label: 'Shigyōseki', en: 'Arching stone', hint: 'a branching, arching form', w: 1.15, h: 0.95, d: 0.6, cuts: 7, flat: 0.55 },
  kikyaku: { label: 'Kikyakuseki', en: 'Recumbent ox', hint: 'low and lying down', w: 1.25, h: 0.55, d: 0.7, cuts: 10, flat: 0.4 }
};

export function stone(form, { seed = 1, scale = 1, moss = 0.3, lichen = 0.5, a = 0x5b5851, b = 0x9b958a } = {}) {
  const F = FORMS[form];
  const geo = rockGeometry(seed, { detail: 5, w: F.w * scale, h: F.h * scale, d: F.d * scale, cuts: F.cuts, cutDepth: 0.68, rough: 0.14, ridge: 0.05, flat: F.flat });
  const m = new THREE.Mesh(geo, M.rock({ a, b, moss, lichen, bump: 0.022 }));
  m.name = F.label; m.userData.form = form;
  return m;
}

/** A soft gravel texture with rake lines drawn in, and a height map to match. */
export function gravelCanvas(size = 1024) {
  const [c, x] = canvas2d(size, size), r = rng(4);
  x.fillStyle = '#d3cbb5'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.06; i++) { x.fillStyle = `rgba(${140 + r() * 90},${130 + r() * 90},${105 + r() * 90},${0.15 + r() * 0.3})`; x.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2); }
  return [c, x];
}

export function drawRakeStroke(x, pts, width, { lines = 6, spacing = 5, dark = 'rgba(90,82,62,.5)', light = 'rgba(244,238,220,.55)' } = {}) {
  for (let k = 0; k < lines; k++) {
    const off = (k - (lines - 1) / 2) * spacing;
    for (const [col, shift, w] of [[dark, 0, 1.6], [light, 1.6, 1]]) {
      x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
      pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], a = pts[Math.max(i - 1, 0)], dx = q[0] - a[0], dy = q[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; const X = p[0] + nx * (off + shift), Y = p[1] + ny * (off + shift); i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
      x.stroke();
    }
  }
}
