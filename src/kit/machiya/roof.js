// kawara-roof: the hipless gable roof every machiya wears. Same frame as the
// classic builder (origin on the eave plane at the house centre; w x d plan,
// ridge height, eave overhang) but each slope is a real slab whose surface is
// a pan-and-roll (sangawara) relief with the Kyoto "sori" lift at the eave,
// closed by a fascia, sides and an underside, so there is no daylight through
// it. Ridge roll, round-faced eave tiles, rafter tails, bargeboards, gable
// closures and onigawara follow the classic positions.
//
// Draws: tiles (the game's MAT.roofTile), ridge (MAT.roofRidge), trim (the
// shared kit bag). All static and plain, so _mergeStatics folds every roof in
// the valley into those three draws. Params stay general for the Roof Road.
import * as THREE from 'three';
import { Bag, merge, bagMat, matOr, meshOf, assemble, seg, tint, uvBox, worldUV } from './common.js?v=20261113a';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** A (rows x cols) grid of shared vertices wound to face `out`; smooth normals. */
function grid(rows, cols, at, out) {
  const pos = [], idx = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) pos.push(...at(r / rows, c / cols, r, c));
  const w = cols + 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = r * w + c, b = a + 1, d = a + w, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.attributes.normal;
  if (n.getX(0) * out[0] + n.getY(0) * out[1] + n.getZ(0) * out[2] < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

/** One slab (top relief, underside, fascia, two ends) of a slope, sign +1 front, -1 back. */
function slab(o, s) {
  const { fullW, halfD, ridgeH, len, angle, lift, ribs, pitch, amp, rows, tier, jit } = o;
  const sa = Math.sin(angle), ca = Math.cos(angle);
  const curve = (t) => Math.pow(sstep(0.45, 1, t), 2) * lift;
  // the slope's mid-thickness point at fall distance f from the ridge, offset `off` along its normal
  const P = (x, t, off, extra = 0) => {
    const u = -len / 2 + t * len;
    return [x, ridgeH / 2 - u * sa + (off + extra) * ca, s * (halfD / 2 + u * ca + (off + extra) * sa)];
  };
  const nTop = ribs ? Math.max(2, Math.round(fullW / pitch)) * 3 : 1;
  const topOff = (x, t, r) => 0.07 + curve(t) + (ribs ? amp * (0.5 - 0.5 * Math.cos((x / pitch) * Math.PI * 2)) : 0) + jit(r, x);
  const geos = [];
  const top = grid(rows, nTop, (t, cx, r) => { const x = -fullW / 2 + cx * fullW; return P(x, t, topOff(x, t, r)); }, [0, ca, s * sa]);
  const tp = top.attributes.position, uv = new Float32Array(tp.count * 2);
  for (let i = 0; i < tp.count; i++) { uv[i * 2] = tp.getX(i); uv[i * 2 + 1] = (Math.floor(i / (nTop + 1)) / rows) * len; }
  top.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geos.push(top);
  const under = (t) => -0.07 + curve(t);
  geos.push(worldUV(grid(Math.max(2, rows >> 1), 1, (t, cx) => P(-fullW / 2 + cx * fullW, t, under(t)), [0, -ca, -s * sa])));
  geos.push(worldUV(grid(1, nTop, (t, cx, r) => { const x = -fullW / 2 + cx * fullW; return P(x, 1, r === 0 ? under(1) : topOff(x, 1, rows)); }, [0, -sa, s * ca])));
  for (const sx of [-1, 1]) {
    geos.push(worldUV(grid(rows, 1, (t, cx, r, c) => { const x = sx * fullW / 2; return P(x, t, c === 0 ? under(t) : topOff(x, t, r)); }, [sx, 0, 0])));
  }
  return geos;
}

function gable(x, halfD, ridgeH, flip, bag, color) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x, 0, -halfD, x, ridgeH, 0, x, 0, halfD], 3));
  g.setIndex(flip ? [0, 2, 1] : [0, 1, 2]);
  g.computeVertexNormals();
  bag.add(g, { color });
}

function buildRoof(ctx, layout, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const w = layout.w ?? 7.4, d = layout.d ?? 5.2, ridgeH = layout.ridgeH ?? 1.2, overhang = layout.overhang ?? 0.6;
  const halfD = d / 2 + overhang, fullW = w + overhang * 2;
  const len = Math.hypot(halfD, ridgeH) + 0.1, angle = Math.atan2(ridgeH, halfD);
  const wear = p.weather;
  // settling of the tiles: a few coarse, seeded bumps (zero when new)
  const bump = Array.from({ length: 64 }, () => (rng() - 0.5) * 0.02 * wear);
  const jit = (r, x) => bump[(r * 7 + Math.floor((x + 40) * 1.5)) & 63];
  const o = { fullW, halfD, ridgeH, len, angle, lift: p.sori, ribs: p.ribs && tier !== 'far', pitch: 0.26, amp: tier === 'hero' ? 0.022 : 0.016,
    rows: seg(tier, 12, 6, 3), tier, jit };

  const tileGeos = [...slab(o, 1), ...slab(o, -1)];
  tileGeos.push(uvBox(fullW, 0.12, 0.32, 0, ridgeH + 0.18, 0));              // ridge crest tiles
  const tiles = meshOf(merge(tileGeos), matOr(ctx, 'roofTile', () => km.tile()));

  const trim = new Bag(), ridge = tier === 'far' ? trim : new Bag();     // far folds the ridge into the trim draw (2 materials)
  const roll = new THREE.CylinderGeometry(0.18, 0.18, fullW + 0.2, seg(tier, 12, 8, 6));
  ridge.add(roll, { rz: Math.PI / 2, y: ridgeH + 0.08, color: 0x3a4149 });
  const eaveY = -0.03 + p.sori * Math.cos(angle);
  const tileN = Math.max(2, Math.floor(fullW / 0.24)), rafterN = Math.max(2, Math.floor(fullW / 0.55));
  const rad = seg(tier, 6, 3, 0);
  for (const sz of [1, -1]) {
    if (tier === 'far') {
      ridge.box(fullW, 0.1, 0.15, { y: eaveY + 0.05, z: sz * (halfD + 0.02), color: 0x3a4149 });
    } else {
      const half = new THREE.CylinderGeometry(0.075, 0.075, 0.13, rad, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
      for (let i = 0; i < tileN; i++) {
        const x = -fullW / 2 + 0.12 + (i / (tileN - 1)) * (fullW - 0.24);
        ridge.add(half, { x, y: eaveY + 0.02, z: sz * (halfD + 0.02), rx: sz > 0 ? 0 : Math.PI, color: 0x3a4149 });
      }
      for (let i = 0; i < rafterN; i++) {            // rafter tails under the eave
        const x = -fullW / 2 + 0.3 + (i / (rafterN - 1)) * (fullW - 0.6);
        trim.box(0.07, 0.09, overhang + 0.35, { x, y: eaveY - 0.1, z: sz * (halfD - overhang * 0.5 - 0.1), rx: sz * angle * 0.6, color: tint(0x4b3427, (rng() - 0.5) * 0.05 * (1 + wear)) });
      }
    }
  }
  if (p.onigawara) {
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 + overhang + 0.08), y = ridgeH + 0.12;
      ridge.box(0.12, 0.42, 0.38, { x, y, color: 0x3a4149 });
      trim.box(0.14, 0.18, 0.48, { x, y: y - 0.15, color: 0xb23a28 });
      if (tier === 'hero') ridge.add(new THREE.ConeGeometry(0.07, 0.24, 6), { x, y: y + 0.32, z: 0.02, rz: -sx * 0.25, color: 0x3a4149 });
    }
  }
  // gable closures (plaster, both faces) and the dark rake posts
  for (const sx of [-1, 1]) {
    gable(sx * (w / 2), halfD, ridgeH, false, trim, 0xe3d6b9);
    gable(sx * (w / 2), halfD, ridgeH, true, trim, 0xe3d6b9);
    trim.box(0.1, ridgeH, 0.1, { x: sx * (w / 2 + 0.02), y: ridgeH / 2, color: 0x4b3427 });
    if (tier !== 'far') for (const sz of [-1, 1])  // bargeboards along the rake
      trim.box(0.05, 0.16, len * 0.98, { x: sx * (fullW / 2 - 0.03), y: ridgeH / 2 - 0.12 * Math.cos(angle), z: sz * halfD / 2, rx: sz * angle, color: 0x4b3427 });
  }
  const parts = { tiles, trim: meshOf(trim.geometry(), bagMat(km)) };
  if (ridge !== trim) parts.ridge = meshOf(ridge.geometry(), matOr(ctx, 'roofRidge', () => km.bag({ rough: 0.5 })));
  return assemble(parts);
}

export const roofAsset = {
  id: 'kawara-roof', family: 'machiya', lab: 'machiya/roof', label: 'Kawara roof', legacyName: 'Kawara Roof',
  params: {
    sori: { type: 'number', default: 0.16, min: 0.04, max: 0.3, step: 0.02, label: 'Eave lift (sori)' },
    ribs: { type: 'boolean', default: true, label: 'Pan-and-roll relief' },
    onigawara: { type: 'boolean', default: true, label: 'Ridge-end ornaments' },
    weather: { type: 'number', default: 0.4, min: 0, max: 1, step: 0.1, label: 'Weathering' }
  },
  // the largest real roof in the valley: the residence's 7.6 wide, the tea house's 5.2 deep and 1.5 ridge, 0.7 eaves
  sample: { index: 0, x: 0, y: 0, z: 0, w: 7.6, d: 5.2, ridgeH: 1.5, overhang: 0.7 },
  build: buildRoof
};
