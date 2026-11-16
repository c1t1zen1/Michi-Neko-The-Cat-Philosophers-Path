// roofcanal part b (lane r3b-canal-market): the canal, its banks, the lines, the
// cherry boughs, the Nishiki canopy, the market stalls, the skylight bridge and
// the takasebune hull. Same rules as index.js: built in the layout frame from
// layout.piece / layout.rail, geometry and heights identical to the classic
// builders in rooftops/js/pieces/, nothing registered for collision.
import { defineAsset } from '../contract.js?v=20261116a';
import { Bag } from '../craft.js?v=20261116a';
import { THREE, matFor, seg, PBag, PARAMS, sample, finish, ribbonGeo, placeLocal, frameGroupAt, lightSocket } from './common.js?v=20261116a';

const rep = (tier, far, mid, hero) => (tier === 'far' ? far : tier === 'mid' ? mid : hero);

/* ------------------------------------------------------------------ canal --- */
function buildCanal(ctx, layout, p) {
  const pc = layout.piece, bag = new PBag(ctx.tier === 'far' ? { sand: 'cobble' } : null), wy = pc.y + 0.18 + p.level;
  bag.add(ribbonGeo(layout, pc.s0, pc.s1, pc.d - 1.55, pc.d + 1.65, pc.y - 0.04, 0.5), { m: 'sand' });
  bag.add(ribbonGeo(layout, pc.s0, pc.s1, pc.d - 1.53, pc.d + 1.63, wy, 0.24), { m: 'water' });
  if (ctx.tier !== 'far') {
    bag.add(ribbonGeo(layout, pc.s0 + 0.2, pc.s1 - 0.2, pc.d - 1.48, pc.d - 1.34, wy + 0.018, 0.7), { m: 'foam' });
    bag.add(ribbonGeo(layout, pc.s0 + 0.2, pc.s1 - 0.2, pc.d + 1.43, pc.d + 1.57, wy + 0.018, 0.7), { m: 'foam' });
  }
  bag.add(ribbonGeo(layout, pc.s0, pc.s1, pc.d + 1.82, pc.d + 4.35, 0, 1), { m: 'cobble' });
  return finish(ctx, bag);
}

/* ------------------------------------------------------------ canal banks --- */
function buildBanks(ctx, layout, p) {
  const pc = layout.piece, len = pc.s1 - pc.s0, t = ctx.tier, bag = new PBag(t === 'far' ? { stone: 'wetStone', slab: 'wetStone', timber: 'wetStone' } : t === 'mid' ? { timberMed: 'timber', agedWood: 'timber', twine: 'timber', steel: 'timber', dark: 'wetStone', water: 'wetStone', bronze: 'timber', pine: 'foliage', clay: 'timber', stone: 'slab' } : null);
  const zFar = pc.d - 1.68, zNear = pc.d + 1.78;
  for (const z of [zFar, zNear]) {
    bag.box(len, 0.72, 0.38, { y: -0.12, z, m: 'wetStone' });
    if (t !== 'far') for (let x = -len / 2 + 0.55, i = 0; x < len / 2 - 0.2; x += 1.08, i++)
      bag.box(0.98, 0.16, 0.52, { x, y: 0.28 + (i % 2) * 0.018, z, ry: (i % 3 - 1) * 0.012 * (0.5 + p.wear), m: i % 3 === 0 ? 'slab' : 'stone' });
  }
  bag.box(len, 0.16, 5.0, { y: 0, z: zNear + 2.55, m: 'slab' });
  bag.box(len, 0.16, 1.35, { y: 0.08, z: zFar - 0.72, m: 'slab' });
  bag.box(len, 0.13, 0.12, { y: 0.26, z: zFar + 0.23, m: 'timber' });
  const hero = t === 'hero';
  for (const u of [-0.41, -0.18, 0.13, 0.39]) {
    const x = u * len;
    bag.cyl(0.075, 1.05, seg(t, 8), { x, y: 0.55, z: zNear - 0.18, m: 'timberMed' });
    if (t !== 'far') {
      if (hero) for (let j = 0; j < 3; j++) bag.torus(0.085, 0.012, 5, 10, { rx: Math.PI / 2, x, y: 0.66 + j * 0.028, z: zNear - 0.18, m: 'twine' });
      bag.box(0.17, 0.035, 0.17, { rz: 0.025, x, y: 1.09, z: zNear - 0.18, m: 'agedWood' });
      bag.torus(0.12, 0.025, 5, 10, { rx: Math.PI / 2, x, y: 0.77, z: zNear - 0.36, m: 'steel' });
    }
  }
  if (t !== 'far') {
    const dx = -len * 0.22;
    bag.add(new THREE.CircleGeometry(0.28, seg(t, 16)), { x: dx, y: -0.04, z: zFar + 0.205, m: 'dark' });
    bag.torus(0.31, 0.055, 6, seg(t, 16), { x: dx, y: -0.04, z: zFar + 0.205, m: 'wetStone' });
    bag.box(0.13, 0.03, 0.7, { rx: Math.PI / 2, x: dx, y: -0.18, z: zFar + 0.55, m: 'water' });
    for (const u of [-0.34, 0.27]) {
      const x = u * len;
      bag.cyl(0.018, 2.1, 6, { x, y: 1.15, z: zFar - 1.37, m: 'bronze' });
      for (let j = 0; j < 4; j++) bag.add(new THREE.IcosahedronGeometry(0.12 + j * 0.015, hero ? 1 : 0), { x: x + (j - 1.5) * 0.12, y: 0.48 + j * 0.12, z: zFar - 1.0 + (j % 2) * 0.1, m: j % 2 ? 'pine' : 'foliage' });
      bag.cyl(0.18, 0.34, seg(t, 10), { x, y: 0.17, z: zFar - 1.0, m: 'clay' });
    }
  }
  const out = finish(ctx, bag), sockets = {};
  for (const [i, f] of [0.28, 0.72].entries()) { const [k, o] = lightSocket(ctx, layout, out.group, `light_bank${i}`, pc.s0 + len * f, 1.2, zFar - 0.8); sockets[k] = o; }
  out.sockets = sockets;
  return out;
}

/* ------------------------------------------------------------------ lines --- */
function buildLines(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, t = ctx.tier, sm = layout.s, sockets = {};
  const bag = new PBag(t === 'far' ? (m) => (m.startsWith('cloth') ? 'cloth#0' : m) : t === 'mid' ? (m) => (m.startsWith('cloth') ? `cloth#${Number(m.slice(6)) % 2}` : m) : null);
  let out;
  if (pc.style === 'laundry') {
    bag.cyl(0.045, w + 0.4, seg(t, 8), { axis: 'x', rz: p.tilt, y: pc.y - 0.04, z: pc.d, m: 'bamboo' });
    for (let x = -w / 2 + 0.45, i = 0; x < w / 2 - 0.3; x += 0.8, i++) {
      const f = `cloth#${(i * 2 + Math.floor(sm)) % 5}`;
      bag.box(0.46, 0.75, 0.018, { x, y: pc.y - 0.48, z: pc.d + 0.02, m: f });
      if (t !== 'far') {
        if (i % 2 === 0) for (const side of [-1, 1]) bag.box(0.23, 0.28, 0.018, { x: x + side * 0.3, y: pc.y - 0.24, z: pc.d + 0.02, m: f });
        if (t === 'hero') for (const side of [-1, 1]) bag.box(0.025, 0.09, 0.04, { x: x + side * 0.17, y: pc.y - 0.07, z: pc.d + 0.04, m: 'agedWood' });
      }
    }
    out = finish(ctx, bag);
  } else if (pc.style === 'tow') {
    bag.cyl(0.045, w + 0.36, seg(t, 8), { axis: 'x', rz: 0.025 + p.tilt, y: pc.y - 0.045, z: pc.d, m: 'hemp' });
    for (const x of [-w / 2 - 0.08, w / 2 + 0.08]) {
      bag.cyl(0.075, 1.0, seg(t, 8), { x, y: pc.y - 0.52, z: pc.d, m: 'timberMed' });
      if (t !== 'far') bag.torus(0.09, 0.018, 5, 9, { ry: Math.PI / 2, x, y: pc.y - 0.06, z: pc.d, m: 'hemp' });
    }
    out = finish(ctx, bag);
  } else {
    bag.cyl(0.02, w + 0.3, 5, { axis: 'x', rz: p.tilt, y: pc.y - 0.03, z: pc.d, m: 'dark' });
    for (let x = -w / 2 + 0.3, i = 0; x < w / 2 - 0.2; x += 0.55, i++)
      bag.lantern(0.11, 0.26, seg(t, 10), { x, y: pc.y - 0.28, z: pc.d, m: i % 3 === 1 ? 'lanternWhite' : 'lanternRed' });
    out = finish(ctx, bag);
    const o = new ctx.THREE.Object3D(); o.position.set(0, pc.y - 0.3, pc.d); out.group.add(o); sockets.light_lines = o;
  }
  out.sockets = sockets;
  return out;
}

/* ---------------------------------------------------------- skylight bridge --- */
function buildSkylightBridge(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, t = ctx.tier, toward = pc.side === 'near' ? 1 : -1;
  const bag = new PBag(t === 'far' ? () => 'timberMed' : t === 'mid' ? { goods: 'steel', hemp: 'timber' } : null);
  bag.box(w, 0.11, 1.2, { y: pc.y - 0.055, z: pc.d, m: 'timberMed' });
  const stepX = rep(t, 0.68, 0.51, 0.34);
  for (let x = -w / 2 + 0.18, i = 0; x <= w / 2 - 0.12; x += stepX, i++) bag.box(0.07, 0.08, 1.34, { ry: 0.02 * p.wear * (i % 2 ? 1 : -1), x, y: pc.y - 0.12, z: pc.d, m: 'timber' });
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) for (const z of [pc.d - 0.52, pc.d + 0.52]) bag.cyl(0.018, 1.12, 5, { x, y: pc.y + 0.55, z, m: 'hemp' });
  const crossZ = pc.d - toward * 1.65;
  bag.box(0.13, 0.1, 4.3, { y: pc.y + 1.05, z: crossZ, m: 'steel' });
  if (t !== 'far') for (const z of [-1, 0, 1]) bag.box(0.42, 0.52, 0.018, { ry: 0.04 * z, y: pc.y + 0.72, z: crossZ + z * 0.82, m: t === 'mid' ? 'steel' : `goods#${(z + 3)}` });
  if (t !== 'far') bag.lantern(0.13, 0.34, seg(t, 10), { caps: t === 'hero', y: pc.y + 0.42, z: pc.d + toward * 0.8, m: 'lanternWhite' });
  const out = finish(ctx, bag);
  const o = new ctx.THREE.Object3D(); o.position.set(0, pc.y + 0.42, pc.d + toward * 0.8); out.group.add(o);
  out.sockets = { light_lamp: o };
  return out;
}

/* ------------------------------------------------------------ market stalls --- */
function buildStalls(ctx, layout, p) {
  const pc = layout.piece, t = ctx.tier, group = new ctx.THREE.Group(), parts = {}, bags = [];
  const bag = new PBag(t === 'far' ? () => 'plasterWarm' : t === 'mid' ? (m) => (m.startsWith('goods') ? 'goods#0' : m === 'plaster' ? 'plasterWarm' : m === 'indigo' || m === 'norenhemp' ? 'crimson' : m) : null);
  // one rail frame per stall (classic: frameGroup(rail, s + 1.5)); stalls are baked into the layout frame
  for (let s = pc.s0 + 0.2, n = 0; s < pc.s1 - 1; s += 3.2, n++) {
    if (pc.gaps?.some(([a, b]) => s + 3 > a - 0.4 && s < b + 0.4)) continue;
    const h = Math.sin(s * 127.1 + 311.7) * 43758.5453, k = h - Math.floor(h);   // the level's hash1(s): same look as classic
    const [x, z0] = placeLocal(layout, s + 1.5, 0), f = frameGroupAt(layout, s + 1.5);
    const ry = f.rotation.y, c = Math.cos(ry), sn = Math.sin(ry);
    const at = (lx, ly, lz) => ({ x: x + lx * c + lz * sn, y: ly, z: z0 - lx * sn + lz * c, ry });
    bag.box(3.0, 3.6, 4.0, { ...at(0, 1.8, -2.0), m: k > 0.5 ? 'plaster' : 'plasterWarm' });
    if (t === 'far') continue;
    bag.box(3.0, 0.1, 0.9, { ...at(0, 2.3, 0.4), m: 'timberMed' });
    bag.box(2.6, 0.8, 0.7, { ...at(0, 0.4, 0.4), m: 'timberMed' });
    for (let i = 0; i < 5; i++) bag.box(0.4, 0.18, 0.4, { ...at(-1.0 + i * 0.5, 0.9, 0.4 + (i % 2) * 0.1), ry: ry + 0.12 * p.wear * (i - 2) / 2, m: `goods#${(i + Math.floor(k * 6)) % 6}` });
    bag.box(1.0, 0.55, 0.02, { ...at(0.6, 1.95, 0.05), m: k > 0.66 ? 'crimson' : k > 0.33 ? 'indigo' : 'norenhemp' });
  }
  return finish(ctx, bag);
}

/* ------------------------------------------------------------ cherry bough --- */
function buildCherry(ctx, layout, p) {
  const pc = layout.piece, bg = pc.bough, t = ctx.tier, r = ctx.rng, bag = new PBag(t === 'far' ? { blossomPale: 'blossom', blossomRose: 'blossom' } : null);
  const sm = (bg.s0 + bg.s1) / 2, f = frameGroupAt(layout, sm);
  const ox = f.position.x, oz = f.position.z, c = Math.cos(f.rotation.y), sn = Math.sin(f.rotation.y);
  const P = (lx, ly, lz) => ({ x: ox + lx * c + lz * sn, y: ly, z: oz - lx * sn + lz * c });
  const bx0 = bg.s0 - sm, bx1 = bg.s1 - sm, bank = pc.bank === 'far' ? -1 : 1, ry = f.rotation.y;
  bag.cyl(0.14, bg.y + 0.9, seg(t, 7), { ...P(bx0 - 0.5, (bg.y - 0.3) / 2, pc.d + bank * 1.55), rx: -bank * (0.35 + 0.05 * p.wear), ry, m: 'bark' });
  bag.cyl(0.09, bx1 - bx0 + 0.6, seg(t, 6), { axis: 'x', ...P((bx0 + bx1) / 2, bg.y - 0.09, pc.d), ry, m: 'bark' });
  const twigs = rep(t, 0, 3, 6);
  for (let i = 0; i < twigs; i++) {
    const side = i % 2 ? 1 : -1, len = 0.48 + 0.42 * r();
    bag.cyl(0.028 + 0.008 * r(), len, 5, { axis: 'z', ...P(bx0 + (i + 0.55) / twigs * (bx1 - bx0), bg.y + 0.05, pc.d + side * len * 0.46), rx: side * (0.18 + 0.12 * r()), ry, m: 'bark' });
  }
  const mats = ['blossomPale', 'blossom', 'blossomRose'], n = Math.round(rep(t, 8, 18, 30) * p.bloom);
  for (let i = 0; i < n; i++) {
    const rad = 0.065 + 0.075 * r(), u = (i + r() * 0.8) / n;
    bag.add(new THREE.IcosahedronGeometry(rad, t === 'hero' ? 1 : 0), { ...P(bx0 - 0.45 + u * (bx1 - bx0 + 0.9), bg.y + 0.18 + 0.42 * r(), pc.d - bank * (0.12 + 0.82 * r())), m: mats[i % 3] });
  }
  return finish(ctx, bag);
}

/* ------------------------------------------------------------------ canopy --- */
function buildCanopy(ctx, layout, p) {
  const pc = layout.piece, t = ctx.tier, bag = new PBag(t === 'far' ? { goods: 'steel' } : t === 'mid' ? (m) => (m.startsWith('goods') ? 'goods#0' : m) : null), sm = layout.s;
  const R = 3.63, half = Math.asin(2.0 / R), yC = pc.y - R, K = rep(t, 4, 6, 10), RK = rep(t, 3, 4, 6);
  const cuts = [pc.s0, ...(pc.gaps || []).flat(), pc.s1];
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i] - sm, b = cuts[i + 1] - sm, pos = [], idx = [];
    for (const x of [a, b]) for (let k = 0; k <= K; k++) { const ang = -half + (2 * half * k) / K; pos.push(x, yC + Math.cos(ang) * R, pc.d + Math.sin(ang) * R); }
    for (let k = 0; k < K; k++) idx.push(k, k + 1, K + 1 + k, k + 1, K + 2 + k, K + 1 + k);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    bag.add(geo, { m: 'glass' });
  }
  const rs = t === 'far' ? 4.8 : 2.4;
  for (let x = pc.s0 - sm; x <= pc.s1 - sm + 0.01; x += rs) for (let k = 0; k < RK; k++) {
    const a0 = -half + (2 * half * k) / RK, a1 = -half + (2 * half * (k + 1)) / RK;
    const z0 = pc.d + Math.sin(a0) * R, y0 = yC + Math.cos(a0) * R, z1 = pc.d + Math.sin(a1) * R, y1 = yC + Math.cos(a1) * R;
    bag.box(0.06, 0.08, Math.hypot(z1 - z0, y1 - y0) + 0.02, { x, y: (y0 + y1) / 2, z: (z0 + z1) / 2, rx: -Math.atan2(y1 - y0, z1 - z0), m: 'steel' });
  }
  const len = pc.s1 - pc.s0;
  for (const z of [pc.d - 2.0, pc.d + 2.0]) bag.box(len, 0.14, 0.14, { y: yC + Math.cos(half) * R - 0.05, z, m: 'steel' });
  if (t !== 'far') for (let x = pc.s0 - sm + 1.2, i = 0; x < pc.s1 - sm - 0.5; x += 3.6, i++)
    bag.box(0.7, 1.0, 0.015, { ry: 0.08 * p.wear * (i % 2 ? 1 : -1), x, y: pc.y - 1.35, z: pc.d + (i % 2 ? 0.9 : -0.9), m: `goods#${i % 6}` });
  const out = finish(ctx, bag), sockets = {};
  let n = 0;
  for (let s = pc.s0 + 4; s < pc.s1; s += 9, n++) { const [k, o] = lightSocket(ctx, layout, out.group, `light_canopy${n}`, s, pc.y - 1.0, pc.d); sockets[k] = o; }
  out.sockets = sockets;
  return out;
}

/* ------------------------------------------------------------- takasebune --- */
function hullGeometry(len, width, depth) {
  const xs = [-len / 2, -len * 0.34, len * 0.34, len / 2], ws = [width * 0.18, width * 0.5, width * 0.5, width * 0.18], bs = [-depth * 0.42, -depth, -depth, -depth * 0.42];
  const pos = [], uv = [];
  const q = (a, b, c, d) => { for (const p of [a, b, c, a, c, d]) { pos.push(...p); uv.push(p[0] / len + 0.5, p[2] / width + 0.5); } };
  for (let i = 0; i < xs.length - 1; i++) {
    const aL = [xs[i], 0, -ws[i]], aR = [xs[i], 0, ws[i]], bL = [xs[i + 1], 0, -ws[i + 1]], bR = [xs[i + 1], 0, ws[i + 1]];
    const abL = [xs[i], bs[i], -ws[i] * 0.62], abR = [xs[i], bs[i], ws[i] * 0.62], bbL = [xs[i + 1], bs[i + 1], -ws[i + 1] * 0.62], bbR = [xs[i + 1], bs[i + 1], ws[i + 1] * 0.62];
    q(aL, bL, bbL, abL); q(bR, aR, abR, bbR); q(abL, bbL, bbR, abR);
  }
  q([xs[0], 0, ws[0]], [xs[0], 0, -ws[0]], [xs[0], bs[0], -ws[0] * 0.62], [xs[0], bs[0], ws[0] * 0.62]);
  q([xs[3], 0, -ws[3]], [xs[3], 0, ws[3]], [xs[3], bs[3], ws[3] * 0.62], [xs[3], bs[3], -ws[3] * 0.62]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function buildBoat(ctx, layout, p) {
  const pc = layout.piece, t = ctx.tier, len = pc.len || 4.4, bag = new PBag(t === 'far' ? { timberMed: 'timber', agedWood: 'timber', hemp: 'timber', steel: 'timber', twine: 'timber', hullBand: 'timber', hull: 'timber', straw: 'timber' } : t === 'mid' ? { timberMed: 'timber', agedWood: 'timber', hemp: 'straw', steel: 'timber', twine: 'timber', hullBand: 'hull' } : null);
  bag.add(hullGeometry(len + 0.5, 1.58, 0.5), { y: 0.28, m: 'hull' });
  bag.box(len - 0.35, 0.07, 1.08, { y: 0.22, m: 'timberMed' });
  for (const z of [-0.76, 0.76]) bag.box(len + 0.18, 0.12, 0.1, { y: 0.34, z, m: 'timber' });
  const rib = rep(t, 1.1, 0.8, 0.55);
  for (let x = -len / 2 + 0.45; x < len / 2 - 0.15; x += rib) bag.box(0.065, 0.2, 1.42, { x, y: 0.24, m: 'timberMed' });
  if (t !== 'far') {
    for (const z of [-0.78, 0.78]) {
      bag.box(len - 0.4, 0.045, 0.035, { y: 0.16, z, m: 'hullBand' });
      if (t === 'hero') for (let x = -len / 2 + 0.5; x < len / 2 - 0.2; x += 0.5) bag.add(new THREE.SphereGeometry(0.014, 5, 4), { x, y: 0.32, z: z + 0.02 * Math.sign(z), m: 'steel' });
    }
    for (let j = 0; j < (t === 'hero' ? 4 : 2); j++) bag.torus(0.13 + j * 0.025, 0.012, 5, 18, { rx: Math.PI / 2, x: -len * 0.35, y: 0.33, z: 0.22, m: 'twine' });
    bag.add(new THREE.CylinderGeometry(0.13, 0.10, 0.22, 9, 1, true), { x: len * 0.36, y: 0.4, z: 0.35, m: 'agedWood' });
    bag.box(0.03, 0.06, 0.48, { x: len * 0.36, y: 0.52, z: 0.35, m: 'agedWood' });
    for (const sx of [-1, 1]) bag.add(new THREE.TorusGeometry(0.34, 0.055, 6, 12, Math.PI * 0.9), { x: sx * (len / 2 + 0.12), y: 0.48, rx: Math.PI / 2, rz: sx > 0 ? 0.25 : Math.PI + 0.25, m: 'timber' });
  }
  const cargo = [[-1.0, 0.57, -0.29], [-0.18, 0.57, -0.29], [0.64, 0.57, -0.29], [-1.0, 0.57, 0.29], [-0.18, 0.57, 0.29], [0.64, 0.57, 0.29], [-0.62, 1.02, 0.0], [0.18, 1.02, 0.0]];
  for (const [x, y, z] of cargo) {
    bag.cyl(0.28, 0.76, seg(t, 10), { axis: 'x', x, y, z, rx: 0.04 * Math.sin(x * 8) + 0.03 * p.wear * Math.cos(x * 5), m: 'straw' });
    if (t !== 'far') for (const dx of [-0.23, 0.23]) bag.torus(0.285, 0.012, 5, 12, { ry: Math.PI / 2, x: x + dx, y, z, m: 'hemp' });
  }
  const plank = rep(t, 0.52, 0.39, 0.26);
  for (let x = -len / 2 + 0.12; x < len / 2; x += plank) bag.box(plank - 0.02, 0.065, 0.88, { x, y: pc.y - 0.0325, m: 'agedWood' });
  if (t !== 'far') for (const z of [-0.54, 0.54]) bag.cyl(0.025, len - 0.2, 6, { axis: 'x', y: 0.82, z, m: 'twine' });
  const out = finish(ctx, bag), group = out.group;
  // r5 attach node: `boatman` (a group at the classic boatman's place, boat-local; the update turns it
  // and tilts it) with `pole` (the pole pivot, child of the boatman) inside it. Both are empty here.
  const boatman = new ctx.THREE.Group(); boatman.position.set(1.55, 0.28, -0.24);
  const pole = new ctx.THREE.Group(); pole.position.set(0.04, 0.66, 0); boatman.add(pole); group.add(boatman);
  // R75: until r5 lands the kit boat carries the CLASSIC boatman and pole (same meshes, sizes and places as pieces/boat.js)
  // inside these two groups; r5 replaces them through the sockets. Not at the far tier (never chosen on the Roof Road).
  if (t !== 'far') {
    const mk = (geo, name, x, y) => { const m = new THREE.Mesh(geo, matFor(ctx, name)); m.position.set(x, y, 0); m.castShadow = true; return m; };
    const hs = t === 'hero' ? 1 : 0.6;
    boatman.add(mk(new THREE.BoxGeometry(0.24, 0.32, 0.2), 'goods#1', 0, 0.16),
      mk(new THREE.CylinderGeometry(0.1, 0.15, 0.42, Math.max(5, Math.round(8 * hs))), 'bengara', 0, 0.5),
      mk(new THREE.SphereGeometry(0.105, Math.max(6, Math.round(10 * hs)), Math.max(4, Math.round(7 * hs))), 'plasterWarm', 0, 0.79),
      mk(new THREE.ConeGeometry(0.27, 0.13, Math.max(8, Math.round(16 * hs))), 'straw', 0, 0.91));
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 3.8, 6), matFor(ctx, 'bamboo')); pm.position.y = -0.25; pm.castShadow = true;
    pole.add(pm);
  }
  // the V wake and bow ring are ONE live mesh (the update scales/hides the `wake` group, M.wake's opacity follows speed)
  const wake = new ctx.THREE.Group(), wmat = (ctx.MAT && ctx.MAT.wake) || ctx.kitMaterials.plain(0xe8f2f0, { rough: 0.9 });
  const wb = new Bag();
  for (const z of [-0.36, 0.36]) wb.add(new THREE.PlaneGeometry(2.4, 0.12), { rx: -Math.PI / 2, rz: z > 0 ? 0.17 : -0.17, order: 'XYZ', x: -1.2, y: -0.205, z });
  wb.add(new THREE.RingGeometry(0.34, 0.39, 20, 1, 0.15, Math.PI * 1.7), { rx: -Math.PI / 2, x: len / 2 + 0.2, y: -0.205 });
  const bowRing = wb.mesh(wmat);
  wake.add(bowRing); group.add(wake);
  out.parts.wake = wake; out.parts.boatman = boatman;
  out.sockets = { attach_boatman: boatman, attach_pole: pole };
  out.live = [group];
  const rec = { group, plat: pc.plat, d: pc.d, boatman, pole, wake, bowRing, lastS: null, dir: 1 };
  out.dynamic = { boats: rec, boat: rec };
  return out;
}

const def = (id, label, build, piece, extra = {}) => defineAsset({
  id, family: 'roofcanal', label, params: PARAMS, tiers: ['hero', 'mid', 'far'], sample: sample(piece), build, ...extra
});
const LEVEL = { level: { type: 'number', default: 0, min: -0.06, max: 0.06, step: 0.01, label: 'Water level offset (m)' } };
const TILT = { tilt: { type: 'number', default: 0, min: 0, max: 0.05, step: 0.01, label: 'Line tilt (rad)' } };
const bloom = { bloom: { type: 'number', default: 1, min: 0.4, max: 1.2, step: 0.1, label: 'Blossom density' } };

export const assetsB = [
  def('roof-canal', 'Takase canal water', buildCanal, { s0: -35, s1: 35, y: 0, d: 0 }, { params: LEVEL, floating: ['body_water', 'body_foam'] }),
  def('roof-canal-banks', 'Canal banks', buildBanks, { s0: -37, s1: 37, y: 0, d: 0 }),
  def('roof-lines', 'Laundry, tow and lantern lines', buildLines, { s0: -2.5, s1: 2.5, y: 4.2, d: 0, style: 'laundry' }, { params: TILT, floating: ['body_bamboo', 'body_cloth_0', 'body_cloth_1', 'body_cloth_2', 'body_cloth_3', 'body_cloth_4', 'body_cloth_5', 'body_cloth_6', 'body_agedwood', 'body_dark', 'body_lanternwhite', 'body_lanternred'] }),
  def('roof-skylight-bridge', 'Skylight bridge', buildSkylightBridge, { s0: -1.15, s1: 1.15, y: 0.12, d: 0, side: 'near' }, { floating: ['body_lanternwhite', 'body_dark'] }),
  def('roof-market-stalls', 'Market stalls', buildStalls, { s0: -51.5, s1: 51.5, d: 0, gaps: [[-30, -26], [-2, 2], [24, 28]] }),
  def('roof-cherry-boughs', 'Cherry bough', buildCherry, { s0: -3, s1: 3, y: 0, d: 0, bough: { s0: -2.6, s1: 2.2, y: 1.8 }, bank: 'near' }, { params: { ...PARAMS, ...bloom }, floating: ['body_blossompale', 'body_blossom', 'body_blossomrose', 'body_bark'] }),
  def('roof-canopy', 'Nishiki canopy', buildCanopy, { s0: -51.5, s1: 51.5, y: 5.0, d: 1.2, gaps: [[-30, -26], [-2, 2], [24, 28]] }, { floating: ['body_glass', 'body_steel', 'body_goods_0', 'body_goods_1', 'body_goods_2', 'body_goods_3', 'body_goods_4', 'body_goods_5'] }),
  def('roof-takasebune', 'Takasebune hull', buildBoat, { s0: -11, s1: 11, y: 1.28, d: 2.65, len: 4.6, plat: 'boat1' }, { floating: ['wake'] })
];
