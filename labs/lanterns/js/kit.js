// Tōrō from their named parts, paper lanterns, and the andon.
import * as THREE from 'three';
import { V3, TAU, Bag, merge, tube, rng, lerp } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { lanternMaterial, washiTexture, chochin } from '../../shared/paperlantern.js';

export const TORO_KINDS = {
  kasuga: { label: 'Kasuga', hint: 'long shaft, high firebox, hexagon', h: 1.62, sides: 6 },
  yukimi: { label: 'Yukimi', hint: 'snow-viewing: short legs, wide round cap', h: 0.9, sides: 40 },
  oribe: { label: 'Oribe', hint: 'square shaft sunk straight into the ground', h: 1.4, sides: 4 },
  kotoji: { label: 'Kotoji', hint: 'two legs, one in the water', h: 1.1, sides: 6 }
};

const ring = (r, h, s, y, r2 = r) => new THREE.CylinderGeometry(r2, r, h, s, 1).translate(0, y, 0);

/** Roof with a concave sweep and small curled corners (warabite). */
function kasa(r, rise, sides) {
  const prof = [[r, 0], [r * 0.98, 0.05], [r * 0.76, 0.06 + rise * 0.28], [r * 0.5, rise * 0.68], [r * 0.2, rise * 0.92], [0.001, rise]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(prof, sides);
  if (sides < 12) g.computeVertexNormals();
  return g;
}

export function toro(kind = 'kasuga', { moss = 0.4, lichen = 0.5, tint = 0xa39e92 } = {}) {
  const K = TORO_KINDS[kind], g = new THREE.Group(), s = K.sides, stone = M.stone({ tint, moss, lichen, grime: 0.3 });
  const parts = {};
  const add = (name, geo, mat = stone) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); (parts[name] ||= []).push(m); return m; };
  const paper = lanternMaterial(washiTexture({ ribs: 0, seed: 11 }), { glowColor: 0xffae55 });
  paper.userData.u.uFall.value = 0.2;
  const hex = kind === 'yukimi' ? 6 : s;
  let y = 0;
  if (kind === 'kasuga') {
    add('kiso', ring(0.26, 0.06, 6, 0.03, 0.3)); add('kiso', ring(0.22, 0.09, 6, 0.1, 0.26)); y = 0.16;
    add('sao', ring(0.075, 0.9, 12, y + 0.45, 0.085)); y += 0.9;
    add('chudai', ring(0.25, 0.1, 6, y + 0.05, 0.14)); y += 0.1;
    add('hibukuro', ring(0.17, 0.3, 6, y + 0.15));
    const win = add('window', ring(0.172, 0.17, 6, y + 0.15), paper); y += 0.3;
    const roof = add('kasa', kasa(0.38, 0.2, 6)); roof.position.y = y;
    y += 0.2;
    add('hoju', new THREE.LatheGeometry([[0.001, 0], [0.05, 0.02], [0.065, 0.07], [0.03, 0.14], [0.001, 0.18]].map(([a, b]) => new THREE.Vector2(a, b)), 12)).position.y = y - 0.02;
  } else if (kind === 'yukimi') {
    const legs = 3;
    for (let i = 0; i < legs; i++) {
      const a = i / legs * TAU, x = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3;
      add('leg', tube([V3(x * 1.3, 0, z * 1.3), V3(x * 1.1, 0.14, z * 1.1), V3(x * 0.72, 0.3, z * 0.72)], (t) => lerp(0.06, 0.04, t), { radial: 8 }));
    }
    y = 0.3;
    add('chudai', ring(0.3, 0.06, 6, y + 0.03));
    y += 0.06;
    add('hibukuro', ring(0.19, 0.22, 6, y + 0.11));
    add('window', ring(0.192, 0.14, 6, y + 0.11), paper); y += 0.22;
    const roof = add('kasa', kasa(0.55, 0.16, 40)); roof.position.y = y; y += 0.16;
    add('hoju', new THREE.SphereGeometry(0.05, 12, 10)).position.y = y + 0.03;
  } else if (kind === 'oribe') {
    add('sao', ring(0.12, 0.9, 4, 0.45, 0.13)); y = 0.9;
    // Oribe's small carved figure at the foot of the shaft
    const fig = add('figure', new THREE.BoxGeometry(0.1, 0.22, 0.02)); fig.position.set(0, 0.42, 0.112); fig.rotation.y = Math.PI / 4;
    add('chudai', ring(0.22, 0.08, 4, y + 0.04)); y += 0.08;
    add('hibukuro', ring(0.14, 0.26, 4, y + 0.13));
    add('window', ring(0.142, 0.16, 4, y + 0.13), paper); y += 0.26;
    const roof = add('kasa', kasa(0.34, 0.18, 4)); roof.position.y = y; roof.rotation.y = Math.PI / 4; y += 0.18;
    add('hoju', new THREE.SphereGeometry(0.05, 12, 10)).position.y = y + 0.03;
  } else if (kind === 'kotoji') {
    for (const [lx, h] of [[-0.42, 0.7], [0.42, 0.34]]) add('leg', tube([V3(lx, 0, 0), V3(lx * 0.75, h * 0.7, 0), V3(lx * 0.4, h, 0)], (t) => lerp(0.06, 0.05, t), { radial: 8 }));
    y = 0.68;
    add('chudai', ring(0.26, 0.06, 6, y + 0.03)); y += 0.06;
    add('hibukuro', ring(0.17, 0.24, 6, y + 0.12));
    add('window', ring(0.172, 0.15, 6, y + 0.12), paper); y += 0.24;
    const roof = add('kasa', kasa(0.46, 0.17, 6)); roof.position.y = y; y += 0.17;
    add('hoju', new THREE.SphereGeometry(0.05, 12, 10)).position.y = y + 0.03;
  }
  g.userData.paper = paper; g.userData.parts = parts; g.userData.h = K.h; g.userData.lampY = kind === 'kasuga' ? 1.3 : kind === 'yukimi' ? 0.47 : kind === 'oribe' ? 1.11 : 0.86;
  return g;
}

/** A floor andon: a paper box in a wooden frame. */
export function andon({ h = 0.7, glow = 1.4 } = {}) {
  const g = new THREE.Group(), w = 0.3, b = new Bag(), c = 0x3a2616;
  for (const [x, z] of [[-w, -w], [w, -w], [-w, w], [w, w]]) b.box(0.03, h, 0.03, { x, y: h / 2, z, color: c });
  for (const y of [0.1, h * 0.55, h]) { b.box(w * 2 + 0.03, 0.025, 0.03, { y, z: w, color: c }); b.box(w * 2 + 0.03, 0.025, 0.03, { y, z: -w, color: c }); b.box(0.03, 0.025, w * 2 + 0.03, { y, x: w, color: c }); b.box(0.03, 0.025, w * 2 + 0.03, { y, x: -w, color: c }); }
  g.add(b.mesh(M.bag({ rough: 0.7 })));
  const mat = lanternMaterial(washiTexture({ ribs: 6, seed: 2 }), {});
  mat.userData.u.uGlow.value = glow; mat.userData.u.uFall.value = 0.2;
  const p = new THREE.Mesh(new THREE.BoxGeometry(w * 2 - 0.02, h * 0.82, w * 2 - 0.02, 1, 6, 1), mat); p.position.y = h * 0.53; g.add(p);
  g.userData.paper = mat;
  return g;
}

export { chochin };
