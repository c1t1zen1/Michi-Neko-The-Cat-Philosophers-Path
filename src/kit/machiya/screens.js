// Screens of the facade: koushi (the lattice), upper-windows (the loft's
// lattice: the same builder, wider, with a sill) and noren (the shop curtain).
// Koushi and the window are static bag geometry (one kit draw for the whole
// street); the noren cloth is the one live mesh: at hero it breathes with the
// wind, at mid and far it is a static panel on the game's own noren material.
import * as THREE from 'three';
import { Bag, bagMat, matOr, meshOf, assemble, seg, tint } from './common.js?v=20261113a';

const FINISH = { dark: 0x41302a, bengara: 0x7a2f22, natural: 0x9a7650 };

/* ------------------------------------------------------------------ koushi --- */

function latticeBuilder(sill) {
  return function buildLattice(ctx, layout, p) {
    const { tier, rng, kitMaterials: km } = ctx;
    const { w, h } = layout, count = layout.count ?? 8;
    const col = FINISH[p.finish], bag = new Bag(), ft = 0.04, fd = ft * 1.5;
    bag.box(w, ft, fd, { y: h / 2, color: col });
    bag.box(w, ft, fd, { y: -h / 2, color: col });
    bag.box(ft, h, fd, { x: -w / 2, color: col });
    bag.box(ft, h, fd, { x: w / 2, color: col });
    const slat = p.slat, spacing = (w - ft * 2) / (count + 1), inner = h - ft * 2;
    for (let i = 1; i <= count; i++) {
      const x = -w / 2 + ft + i * spacing;
      const cut = tier !== 'far' && p.cutback && i % 2 === 0 ? 0.16 * inner : 0;                // itoya-style short slats
      bag.box(slat, inner - cut, slat * 1.2, { x, y: cut / 2, color: tint(col, (rng() - 0.5) * 0.04) });
    }
    if (tier === 'hero') {
      for (const f of [-1 / 6, 1 / 6]) bag.box(w - ft * 2, 0.014, 0.012, { y: f * inner, z: -slat * 0.9, color: tint(col, -0.05) });   // rear ties
    }
    if (sill && tier !== 'far') bag.box(w + 0.12, 0.04, fd + 0.08, { y: -h / 2 - 0.04, z: 0.04, color: tint(col, 0.03) });
    return assemble({ lattice: meshOf(bag.geometry(), bagMat(km)) });
  };
}

export const koushiAsset = {
  id: 'koushi', family: 'machiya', lab: 'machiya/koushi', label: 'Koushi lattice', legacyName: 'Koushi Lattice',
  params: {
    slat: { type: 'number', default: 0.022, min: 0.012, max: 0.06, step: 0.002, label: 'Slat width' },
    cutback: { type: 'boolean', default: false, label: 'Cut-back alternate slats' },
    finish: { type: 'enum', default: 'dark', options: ['dark', 'bengara', 'natural'], label: 'Finish' }
  },
  sample: { index: 0, w: 2.4, h: 2.05, count: 11, mat: 'timberDark' },   // the biggest real lattices: residence 2.4 x 1.8, secret door 2.35 x 2.05, 11 slats
  build: latticeBuilder(false)
};

export const upperWindowsAsset = {
  id: 'upper-windows', family: 'machiya', lab: 'machiya/koushi', label: 'Upper windows (loft lattice)', legacyName: 'Koushi Lattice',
  params: {
    slat: { type: 'number', default: 0.028, min: 0.012, max: 0.06, step: 0.002, label: 'Slat width' },
    cutback: { type: 'boolean', default: true, label: 'Cut-back alternate slats' },
    finish: { type: 'enum', default: 'dark', options: ['dark', 'bengara', 'natural'], label: 'Finish' }
  },
  sample: { index: 0, w: 4.0, h: 1.1, count: 16, mat: 'timberDark' },
  build: latticeBuilder(true)
};

/* ------------------------------------------------------------------- noren --- */

const CLOTH = { norenIndigo: 0x223652, norenCrimson: 0x8f2820, norenHemp: 0xd6c5a2 };

/** Flat panels (metre UVs, +Z normals) merged into one indexed geometry. */
function mergePlanes(list) {
  let count = 0, ic = 0;
  for (const g of list) { count += g.attributes.position.count; ic += g.index.count; }
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2), idx = new Uint32Array(ic);
  let v = 0, i = 0;
  for (const g of list) {
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      pos.set([p.getX(k), p.getY(k), p.getZ(k)], (v + k) * 3);
      nor.set([0, 0, 1], (v + k) * 3);
      uv.set([p.getX(k), p.getY(k)], (v + k) * 2);          // metres: the hemp weave tiles per metre
    }
    for (let k = 0; k < g.index.count; k++) idx[i++] = g.index.array[k] + v;
    v += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

function buildNoren(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const { w, h } = layout, key = layout.mat || 'norenIndigo';
  const base = CLOTH[key] || 0x223652;
  const cloth = matOr(ctx, key, () => km.cloth({ color: base }));
  const n = Math.round(p.panels), gap = n > 1 ? 0.035 : 0, pw = (w - gap * (n - 1)) / n;
  const top = h / 2, hang = h - 0.05;                                  // the pole sits above; the cloth hangs from y = top - 0.04
  const rows = tier === 'hero' ? 8 : 1, cols = tier === 'hero' ? 3 : 1;
  const geos = [];
  for (let i = 0; i < n; i++) geos.push(new THREE.PlaneGeometry(pw, hang, cols, rows).translate(-w / 2 + pw / 2 + i * (pw + gap), top - 0.04 - hang / 2, 0));
  const merged = mergePlanes(geos);
  const mesh = new THREE.Mesh(merged, cloth);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const bag = new Bag();
  bag.cyl(0.018, w + 0.16, { rz: Math.PI / 2, y: top + 0.01, color: 0x3a2a1d });             // the hanging pole
  if (tier !== 'far') {
    for (const sx of [-1, 1]) bag.sphere(0.03, { x: sx * (w / 2 + 0.09), y: top + 0.01, color: 0x2a1d14 });
    for (let i = 0; i < n; i++) bag.box(pw, 0.05, 0.012, { x: -w / 2 + pw / 2 + i * (pw + gap), y: -top + 0.03, z: 0.004, color: tint(base, -0.06) });  // hem band
  }
  if (p.crest) bag.add(new THREE.CylinderGeometry(0.1, 0.1, 0.006, seg(tier, 20, 10, 6)).rotateX(Math.PI / 2), { y: 0, z: 0.02, color: 0xe9e1cf });
  const inst = assemble({ cloth: mesh, trim: meshOf(bag.geometry(), bagMat(km)) });
  if (tier === 'hero') {
    const pos = merged.attributes.position, rest = pos.array.slice();
    const phase = (layout.index || 0) * 1.7;
    inst.live = [mesh];
    inst.update = (dt, t, env) => {
      const wind = (env && typeof env.wind === 'number' ? env.wind : 1);
      for (let i = 0; i < pos.count; i++) {
        const x = rest[i * 3], y = rest[i * 3 + 1];
        const k = Math.min(1, Math.max(0, (top - 0.04 - y) / hang));       // 0 at the pole, 1 at the hem
        const wave = Math.sin(t * 1.3 + phase + x * 2.2) * 0.6 + Math.sin(t * 2.7 + phase * 0.5 + x * 3.1) * 0.25;
        pos.setZ(i, k * k * (0.012 + 0.03 * wind) * wave + k * 0.01 * Math.sin(t * 0.9 + phase));
      }
      pos.needsUpdate = true;
    };
  }
  return inst;
}

export const norenAsset = {
  id: 'noren', family: 'machiya', lab: 'machiya/noren', label: 'Noren curtain',
  params: {
    panels: { type: 'number', default: 3, min: 1, max: 4, step: 1, label: 'Panels (slits between)' },
    crest: { type: 'boolean', default: true, label: 'Shop crest' }
  },
  sample: { index: 0, w: 2.4, h: 0.75, d: 0.04, mat: 'norenCrimson', x: 0, y: 2.0, z: 2.78 },   // widest 2.4 (secret house), tallest 0.75 (tea house)
  build: buildNoren
};
