// A stone lantern from its named parts (kiso, sao, chudai, hibukuro, kasa,
// hoju), after labs/lanterns/js/kit.js `toro()` and its construction fix
// (REVIEW_2026-11-10: the hibukuro is a hollow stone chamber with real higuchi,
// not a glowing belt; kotoji legs are connected).
//
// `stoneLantern(kind, tier)` returns plain geometry in metres with the ground
// at y = 0: { parts: { kiso, sao, chudai, hibukuro, kasa, hoju → BufferGeometry },
// lamp: { geometry (centred on its flame), y, r, h }, height }. The caller
// fits it to the game's size and builds the meshes. Geometry is indexed with
// position, normal and uv so _mergeStatics() can take it.
import * as THREE from 'three';
import { V3, TAU, lerp, tube, merge, indexed } from '../craft.js?v=20261113a';

export const KINDS = ['kasuga', 'yukimi', 'oribe', 'kotoji', 'street'];

const ring = (r, h, s, y, r2 = r) => new THREE.CylinderGeometry(r2, r, h, s, 1).translate(0, y, 0);
const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));

/** Roof with a concave sweep (kudarimune skirt), an underside, `sides` facets. */
function kasa(r, rise, sides, tier) {
  const prof = tier === 'hero'
    ? [[r, 0], [r * 0.98, 0.04], [r * 0.76, 0.05 + rise * 0.28], [r * 0.5, rise * 0.68], [r * 0.2, rise * 0.92], [0.001, rise]]
    : [[r, 0], [r * 0.62, rise * 0.55], [0.001, rise]];
  const top = new THREE.LatheGeometry(v2(prof), sides);
  if (sides < 12) top.computeVertexNormals();
  const under = new THREE.CircleGeometry(r * 0.99, sides).rotateX(Math.PI / 2);
  return merge([top, under]);
}

function hoju(h, y, tier) {
  const g = new THREE.LatheGeometry(v2([[0.001, 0], [h * 0.34, h * 0.1], [h * 0.44, h * 0.4], [h * 0.2, h * 0.78], [0.001, h]]), tier === 'hero' ? 12 : 6);
  return g.translate(0, y, 0);
}

/**
 * The firebox. hero: top and bottom plates and `sides` stone panels, each with
 * a rectangular opening (higuchi). mid: plates and corner posts, open between.
 * far: a plain stone prism (the lit prism stands proud of it).
 */
function firebox(r, h, sides, y0, tier) {
  const wall = 0.025, apothem = r * Math.cos(Math.PI / sides), faceW = 2 * r * Math.sin(Math.PI / sides);
  const list = [ring(r, wall, sides, y0 + wall / 2), ring(r, wall, sides, y0 + h - wall / 2)];
  if (tier === 'hero') {
    for (let i = 0; i < sides; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(-faceW / 2, 0); shape.lineTo(faceW / 2, 0); shape.lineTo(faceW / 2, h); shape.lineTo(-faceW / 2, h); shape.closePath();
      const hole = new THREE.Path();
      const hw = faceW * 0.23, bottom = h * 0.23, top = h * 0.77;
      hole.moveTo(-hw, bottom); hole.lineTo(-hw, top); hole.lineTo(hw, top); hole.lineTo(hw, bottom); hole.closePath();
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, { depth: wall, bevelEnabled: false });
      const a = (i + 0.5) / sides * TAU;
      g.rotateY(a).translate(Math.sin(a) * (apothem - wall), y0, Math.cos(a) * (apothem - wall));
      list.push(g);
    }
  } else if (tier === 'mid') {
    for (let i = 0; i < sides; i++) {
      const a = i / sides * TAU;
      list.push(new THREE.CylinderGeometry(0.018, 0.018, h - wall * 2, 5, 1).translate(Math.sin(a) * r * 0.97, y0 + h / 2, Math.cos(a) * r * 0.97));
    }
  } else list.push(ring(r * 0.97, h - wall * 2, sides, y0 + h / 2));
  const lampR = tier === 'far' ? r * 1.02 : apothem - wall - 0.006;
  const lampH = tier === 'far' ? h * 0.46 : h - wall * 2 - 0.01;
  const lamp = ring(lampR, lampH, sides, 0);
  return { stone: merge(list), lamp, lampR, lampH, lampY: y0 + h / 2 };
}

/** Everything about one kind, in natural metres. */
export function stoneLantern(kind, tier) {
  const parts = {};
  const put = (name, geo) => { (parts[name] ||= []).push(geo); };
  let y = 0, fb, rot = 0;
  const sides = tier === 'far' ? 6 : 6;
  if (kind === 'kasuga') {
    put('kiso', ring(0.26, 0.06, 6, 0.03, 0.3)); put('kiso', ring(0.22, 0.09, 6, 0.1, 0.26)); y = 0.15;
    put('sao', ring(0.075, 0.52, tier === 'far' ? 6 : 12, y + 0.26, 0.085)); y += 0.52;
    put('chudai', ring(0.25, 0.09, 6, y + 0.045, 0.14)); y += 0.09;
    fb = firebox(0.17, 0.27, 6, y, tier); y += 0.27;
    put('kasa', kasa(0.38, 0.17, 6, tier).translate(0, y, 0)); y += 0.17;
    put('hoju', hoju(0.13, y - 0.02, tier)); y += 0.11;
  } else if (kind === 'yukimi') {
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU, x = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3;
      put('kiso', tube([V3(x * 1.3, 0, z * 1.3), V3(x * 1.1, 0.14, z * 1.1), V3(x * 0.72, 0.3, z * 0.72)], (t) => lerp(0.06, 0.04, t), { radial: tier === 'hero' ? 8 : 5 }));
    }
    y = 0.3;
    put('chudai', ring(0.3, 0.06, 6, y + 0.03)); y += 0.06;
    fb = firebox(0.19, 0.22, 6, y, tier); y += 0.22;
    put('kasa', kasa(0.55, 0.16, tier === 'hero' ? 40 : 14, tier).translate(0, y, 0)); y += 0.16;
    put('hoju', new THREE.SphereGeometry(0.05, tier === 'hero' ? 12 : 6, tier === 'hero' ? 10 : 5).translate(0, y + 0.03, 0)); y += 0.08;
  } else if (kind === 'oribe') {
    put('sao', ring(0.12, 0.9, 4, 0.45, 0.13).rotateY(Math.PI / 4));
    if (tier === 'hero') put('sao', new THREE.BoxGeometry(0.1, 0.22, 0.02).rotateY(Math.PI / 4).translate(0.0792, 0.42, 0.0792));
    y = 0.9;
    put('chudai', ring(0.22, 0.08, 4, y + 0.04).rotateY(Math.PI / 4)); y += 0.08;
    fb = firebox(0.14, 0.26, 4, y, tier); rot = Math.PI / 4; y += 0.26;
    put('kasa', kasa(0.34, 0.18, 4, tier).rotateY(Math.PI / 4).translate(0, y, 0)); y += 0.18;
    put('hoju', new THREE.SphereGeometry(0.05, tier === 'hero' ? 12 : 6, tier === 'hero' ? 10 : 5).translate(0, y + 0.03, 0)); y += 0.08;
  } else if (kind === 'kotoji') {
    for (const [lx, footY] of [[-0.42, 0], [0.42, 0.32]]) {
      put('kiso', tube([V3(lx, footY, 0), V3(lx * 0.72, 0.52, 0), V3(lx * 0.12, 0.69, 0)], (t) => lerp(0.065, 0.055, t), { radial: tier === 'hero' ? 12 : 6 }));
    }
    put('kiso', new THREE.DodecahedronGeometry(0.23, tier === 'hero' ? 1 : 0).scale(1, 0.85, 0.85).translate(0.42, 0.14, 0));
    y = 0.68;
    put('chudai', ring(0.26, 0.06, 6, y + 0.03)); y += 0.06;
    fb = firebox(0.17, 0.24, 6, y, tier); y += 0.24;
    put('kasa', kasa(0.46, 0.17, 6, tier).translate(0, y, 0)); y += 0.17;
    put('hoju', new THREE.SphereGeometry(0.05, tier === 'hero' ? 12 : 6, tier === 'hero' ? 10 : 5).translate(0, y + 0.03, 0)); y += 0.08;
  } else { // street: the square post lamp of buildLanterns(), 1.9 m
    put('kiso', ring(0.354, 0.25, 4, 0.125).rotateY(Math.PI / 4)); y = 0.25;
    put('sao', ring(0.1, 0.9, tier === 'far' ? 6 : 12, y + 0.45, 0.13)); y += 0.9;
    put('chudai', ring(0.311, 0.14, 4, y + 0.07).rotateY(Math.PI / 4)); y += 0.14;
    fb = firebox(0.212, 0.3, 4, y, tier); rot = Math.PI / 4; y += 0.3;
    put('kasa', kasa(0.4, 0.26, 4, tier).rotateY(Math.PI / 4).translate(0, y, 0)); y += 0.26;
    put('hoju', new THREE.SphereGeometry(0.035, tier === 'hero' ? 10 : 6, tier === 'hero' ? 8 : 4).translate(0, y + 0.02, 0)); y += 0.06;
  }
  if (rot) { fb.stone.rotateY(rot); fb.lamp.rotateY(rot); }
  const out = {};
  for (const [name, list] of Object.entries(parts)) out[name] = indexed(list.length > 1 ? merge(list) : list[0].clone());
  out.hibukuro = indexed(fb.stone);
  const lamp = indexed(fb.lamp);
  return { parts: out, lamp: { geometry: lamp, y: fb.lampY, r: fb.lampR, h: fb.lampH }, height: y };
}

/** Scale every geometry of a stone lantern to a target height (y) and girth (x, z), about the ground. */
export function fitStoneLantern(L, height, girth = 1) {
  const fy = height / L.height;
  for (const g of Object.values(L.parts)) g.scale(girth, fy, girth);
  L.lamp.geometry.scale(girth, fy, girth);
  L.lamp.y *= fy;
  L.height = height;
  return L;
}
