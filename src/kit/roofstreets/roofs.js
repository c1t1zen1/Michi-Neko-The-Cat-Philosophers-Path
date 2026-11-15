// Roof Road machiya parts and buildings (part b): machiya, kura, kido gate,
// river steps, komayose, inuyarai, tsuboniwa. Geometry is the classic code
// (rooftops/js/pieces/machiya.js and the piece builders) ported verbatim so
// platform tops, ridges, eaves and gable lines stay exactly where level.js
// and the golden expect them (gameplay is geometry); detail is tiered.
import * as THREE from 'three';
import { Multi, finish, hash1, TAU } from './shared.js?v=20261114a';

/* ------------------------------------------------------------- roof parts --- */

export function ridgeCap(u, x0, x1, y, z, alongZ = false) {
  const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2;
  if (alongZ) {
    u.cyl(0.13, len + 0.1, { m: 'ridge', axis: 'z', seg: 8, x: z, y: y + 0.08, z: cx });
    u.box(0.28, 0.1, len, { m: 'ridge', x: z, y: y + 0.2, z: cx });
  } else {
    u.cyl(0.13, len + 0.1, { m: 'ridge', axis: 'x', seg: 8, x: cx, y: y + 0.08, z });
    u.box(len, 0.1, 0.28, { m: 'ridge', x: cx, y: y + 0.2, z });
  }
  for (const e of [x0, x1]) {
    if (alongZ) u.box(0.4, 0.42, 0.14, { m: 'ridge', x: z, y: y + 0.22, z: e });
    else u.box(0.14, 0.42, 0.4, { m: 'ridge', x: e, y: y + 0.22, z });
  }
}

export function hiraRoof(u, x0, x1, zFront, zBack, eave, ridgeTop, oh = 0.35) {
  const ridge = ridgeTop - 0.25;
  const w = x1 - x0 + oh * 2, xm = (x0 + x1) / 2, zR = (zFront + zBack) / 2, rise = ridge - eave;
  u.slope('roof', { x: xm, y: eave, z: zFront + 0.55 }, rise, zFront + 0.55 - zR, w, 0);
  u.slope('roof', { x: xm, y: eave, z: zBack - 0.55 }, rise, zR - (zBack - 0.55), w, Math.PI);
  ridgeCap(u, x0 - oh, x1 + oh, ridge, zR);
  u.box(w, 0.07, 0.08, { m: 'ridge', x: xm, y: eave - 0.01, z: zFront + 0.6 });
  for (const x of [x0, x1]) {
    u.triangle('plaster', x, eave - 0.02, zFront, x, ridge - 0.05, zR, x, eave - 0.02, zBack);
    u.box(0.08, 0.08, Math.hypot(zFront - zR, rise) + 0.1, { m: 'timber', x, y: (eave + ridge) / 2, z: (zFront + zR) / 2 });
  }
}

export function tsumaRoof(u, x0, x1, zFront, zBack, eave, ridgeTop, oh = 0.25) {
  const ridge = ridgeTop - 0.06;
  const xm = (x0 + x1) / 2, half = (x1 - x0) / 2 + oh, width = zFront - zBack + 1.1, zm = (zFront + zBack) / 2;
  u.slope('roof', { x: x0 - oh, y: eave, z: zm }, ridge - eave, half, width, -Math.PI / 2);
  u.slope('roof', { x: x1 + oh, y: eave, z: zm }, ridge - eave, half, width, Math.PI / 2);
  ridgeCap(u, zBack - 0.55, zFront + 0.55, ridge - 0.2, xm, true);
  u.triangle('plaster', x0, eave, zFront + 0.02, x1, eave, zFront + 0.02, xm, ridge - 0.08, zFront + 0.02);
  u.box(x1 - x0 + 0.1, 0.1, 0.1, { m: 'timber', x: xm, y: eave + 0.02, z: zFront + 0.05 });
  u.box(0.1, ridge - eave - 0.1, 0.1, { m: 'timber', x: xm, y: (eave + ridge) / 2 - 0.05, z: zFront + 0.05 });
  u.triangle('plaster', x1, eave, zBack, x0, eave, zBack, xm, ridge - 0.08, zBack);
}

function facade(u, pc, x0, x1, zF, look) {
  const w = x1 - x0, xm = (x0 + x1) / 2, st = pc.storeys;
  const groundTop = st === 2 ? pc.hisashi : pc.eave;
  u.box(0.14, groundTop, 0.16, { m: 'timber', x: x0 + 0.07, y: groundTop / 2, z: zF + 0.04 });
  u.box(0.14, groundTop, 0.16, { m: 'timber', x: x1 - 0.07, y: groundTop / 2, z: zF + 0.04 });
  u.box(w, 0.12, 0.16, { m: 'timber', x: xm, y: Math.min(2.0, groundTop - 0.08), z: zF + 0.05 });
  const doorX = x0 + w * (0.25 + 0.5 * look), lw = Math.max(0.6, w - 1.6);
  u.box(lw, 1.55, 0.05, { m: 'koshi', x: xm, y: 1.0, z: zF + 0.06 });
  if (pc.noren) u.box(1.1, 0.55, 0.02, { m: 'noren.' + (u.ctx.MAT && u.ctx.MAT.noren && u.ctx.MAT.noren[pc.noren] ? pc.noren : 'indigo'), x: doorX, y: 1.65, z: zF + 0.16 });
  u.box(w, 0.22, 0.2, { m: 'stone', x: xm, y: 0.11, z: zF + 0.05 });
  if (st === 2) {
    u.slope('roof', { x: xm, y: pc.hisashi, z: zF + 0.85 }, 0.42, 0.85, w + 0.2, 0);
    u.box(w + 0.2, 0.06, 0.07, { m: 'ridge', x: xm, y: pc.hisashi - 0.01, z: zF + 0.9 });
    const midY = (pc.hisashi + 0.42 + pc.eave) / 2;
    u.box(Math.min(w * 0.62, 3.2), 0.55, 0.04, { m: 'mushiko', x: xm, y: midY, z: zF + 0.03 });
  }
}

function streetEaveDetails(u, pc, x0, x1, zF, look, tier) {
  const w = x1 - x0, y = pc.storeys === 2 ? pc.hisashi : pc.eave, z = zF + (pc.storeys === 2 ? 0.91 : 0.64);
  const step = tier === 'hero' ? 0.42 : 0.84;
  for (let x = x0 + 0.18; x < x1 - 0.1; x += step) {
    u.box(0.075, 0.075, 0.48, { m: 'timber', x, y: y - 0.12, z: z - 0.18 });
    if (tier === 'hero') u.cyl(0.075, 0.075, { m: 'ridge', axis: 'z', seg: 8, x, y: y - 0.015, z: z + 0.055 });
  }
  u.cyl(0.045, w + 0.12, { m: 'bronze', axis: 'x', seg: 7, x: (x0 + x1) / 2, y: y - 0.08, z: z + 0.06 });
  const pipeX = look > 0.5 ? x0 + 0.16 : x1 - 0.16;
  const ph = Math.max(0.4, y - 0.26);
  u.cyl(0.032, ph, { m: 'bronze', axis: 'y', seg: 7, x: pipeX, y: (y - 0.26) / 2 + 0.18, z: zF + 0.16 });
  if (pc.noren && w > 4.2) {
    const sx = look > 0.5 ? x1 - 0.58 : x0 + 0.58, sy = Math.min(1.55, y - 0.52);
    u.box(0.42, 0.92, 0.055, { m: look > 0.5 ? 'lacquer' : 'timberMed', x: sx, y: sy, z: zF + 0.21, rz: (look - 0.5) * 0.025 });
    for (let i = 0; i < 3; i++) u.box(0.22, 0.026, 0.01, { m: 'plasterWarm', x: sx, y: sy + 0.23 - i * 0.22, z: zF + 0.244 });
  }
}

/* ----------------------------------------------------------- dressing --- */

const LEAF = new THREE.PlaneGeometry(1, 1);
function leaves(u, x, y, z, count, seed, scale = 1) {
  for (let i = 0; i < count; i++) {
    const a = hash1(seed + i * 3.7) * TAU, rad = hash1(seed + i * 9.3) * 0.55 * scale;
    u.add(LEAF, { m: 'leaves.' + (i % 3), x: x + Math.cos(a) * rad, y: y + Math.sin(i * 2.1) * 0.23 * scale, z: z + Math.sin(a) * rad,
      sx: 0.18 * scale, sy: 0.35 * scale, rx: -0.4 + hash1(i + seed) * 1.2, ry: a, rz: Math.sin(a) * 0.7, order: 'YXZ' });
  }
}
function vine(u, x0, x1, y, z, seed) {
  for (let x = x0; x < x1; x += 0.43) {
    const yy = y + Math.sin(x * 1.7 + seed) * 0.12;
    u.beam([x, yy, z], [Math.min(x1, x + 0.46), yy + 0.07, z + 0.04], 0.018, 'bark');
    for (const side of [-1, 1]) {
      const dx = 0.12 + hash1(x + seed + side) * 0.2, drop = 0.2 + hash1(x * 3 + seed) * 0.42;
      const end = [x + dx, yy - drop, z + side * 0.18];
      u.beam([x, yy, z], end, 0.009, 'bark');
      leaves(u, ...end, 4, x + seed + side, 1.05);
    }
    leaves(u, x, yy, z, 3, x + seed, 1.2);
  }
}
function pot(u, x, y, z, seed) {
  u.add(new THREE.CylinderGeometry(0.21, 0.14, 0.3, 10), { m: 'terracotta', x, y: y + 0.15, z });
  u.add(new THREE.TorusGeometry(0.2, 0.025, 5, 12).rotateX(Math.PI / 2), { m: 'terracotta', x, y: y + 0.29, z });
  leaves(u, x, y + 0.48, z, 13, seed, 1.1);
}
function crate(u, x, y, z, w, h, d) {
  u.box(w, h, d, { m: 'agedWood', x, y: y + h / 2, z });
}

/** The downtown kit's decorateHouse (rain cups, shop bench, vines, byobu); the bicycle is left out. */
function dressHouse(u, pc) {
  const w = pc.s1 - pc.s0, d = pc.dFront, eave = pc.hisashi || pc.eave, seed = hash1(pc.s0 * 7.9);
  if (seed > 0.35) {
    const x = w * 0.43;
    for (let y = 0.35; y < eave - 0.15; y += 0.19) u.add(new THREE.ConeGeometry(0.045, 0.055, 7).rotateX(Math.PI), { m: 'bronze', x, y, z: d + 0.48 });
    u.add(new THREE.CylinderGeometry(0.19, 0.14, 0.18, 10, 1, true), { m: 'terracotta', x, y: 0.1, z: d + 0.48 });
    u.box(0.16, 0.035, 0.3, { m: 'steel', x, y: eave - 0.12, z: d + 0.37 });
  }
  if (seed < 0.3) {
    u.box(1.2, 0.07, 0.38, { m: 'agedWood', x: -w * 0.26, y: 0.42, z: d + 0.4 });
    for (const x of [-w * 0.26 - 0.45, -w * 0.26 + 0.45]) u.box(0.06, 0.4, 0.06, { m: 'agedWood', x, y: 0.2, z: d + 0.4 });
    crate(u, -w * 0.26, 0.46, d + 0.4, 0.42, 0.24, 0.32);
    u.beam([w * 0.35, 0.12, d + 0.65], [w * 0.35 - 0.18, 1.3, d + 0.25], 0.017, 'bamboo');
  }
  if (pc.vines) { vine(u, -w * 0.48, -w * 0.05, eave - 0.2, pc.dFront + 0.8, pc.s0); pot(u, -w * 0.42, 0, pc.dFront + 0.5, pc.s0); }
  if (pc.byobu) for (let i = 0; i < 4; i++) u.box(0.42, 0.94, 0.035, { m: i % 2 ? 'tapestry' : 'gold', x: -0.7 + i * 0.4, y: 0.63, z: pc.dFront + 0.15 + (i % 2) * 0.12, ry: i % 2 ? -0.25 : 0.25 });
}

/* ------------------------------------------------------------ buildings --- */

export function buildMachiya(ctx, layout) {
  const pc = layout.piece, tier = ctx.tier, u = new Multi(ctx), sm = (pc.s0 + pc.s1) / 2;
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm, zF = pc.dFront, zB = pc.dFront - pc.depth, look = pc.look;
  const far = pc.row === 'far';
  const wall = far && look > 0.55 ? 'bengara' : (look > 0.7 ? 'plasterWarm' : 'plaster');
  u.box(x1 - x0, pc.eave, pc.depth, { m: wall, x: 0, y: pc.eave / 2, z: (zF + zB) / 2 });
  u.box(x1 - x0 + 0.12, 0.12, pc.depth + 0.12, { m: 'timber', x: 0, y: pc.eave - 0.06, z: (zF + zB) / 2 });
  if (tier !== 'far') facade(u, pc, x0, x1, zF, look);
  if (pc.style === 'hira') hiraRoof(u, x0, x1, zF, zB, pc.eave, pc.ridge); else tsumaRoof(u, x0, x1, zF, zB, pc.eave, pc.ridge);
  if (tier !== 'far') streetEaveDetails(u, pc, x0, x1, zF, look, tier);
  if (pc.kaisho) u.box(1.4, 1.0, 0.06, { m: 'tapestry', x: x1 - 0.9, y: 3.3, z: zF + 0.05 });
  if (pc.deck) {
    const dk = pc.deck, zR = (zF + zB) / 2, zD = zR + 0.9;
    const dx0 = dk.s0 - sm, dx1 = dk.s1 - sm, dxm = (dx0 + dx1) / 2;
    u.box(dx1 - dx0, 0.1, 2.0, { m: 'timberMed', x: dxm, y: dk.y - 0.05, z: zD });
    for (const px of [dx0 + 0.1, dx1 - 0.1]) for (const pz of [zD - 0.9, zD + 0.9]) u.box(0.1, dk.y - pc.ridge + 0.85, 0.1, { m: 'timber', x: px, y: (pc.ridge + dk.y + 0.85) / 2 - 0.05, z: pz });
    if (tier !== 'far') {
      u.box(dx1 - dx0, 0.06, 0.06, { m: 'timber', x: dxm, y: dk.y + 0.8, z: zD + 0.95 });
      u.box(0.06, 0.06, 2.0, { m: 'timber', x: dx0 + 0.1, y: dk.y + 0.8, z: zD });
      u.box(0.06, 0.06, 2.0, { m: 'timber', x: dx1 - 0.1, y: dk.y + 0.8, z: zD });
      u.cyl(0.03, dx1 - dx0, { m: 'bamboo', axis: 'x', seg: 6, x: dxm, y: dk.y + 1.45, z: zD - 0.3 });
      for (let x = dx0 + 0.5, i = 0; x < dx1 - 0.4; x += 0.75, i++)
        u.box(0.55, 0.7 + hash1(x + sm) * 0.25, 0.015, { m: 'cloth.' + ((i + Math.floor(look * 5)) % 5), x, y: dk.y + 1.05, z: zD - 0.3 });
    }
    if (pc.futon) {
      const fx0 = pc.futon.s0 - sm, fx1 = pc.futon.s1 - sm, fxm = (fx0 + fx1) / 2, fw = fx1 - fx0, zf = zR + 1.5;
      u.box(fw, 0.16, 0.9, { m: 'futon', x: fxm, y: pc.futon.y - 0.08, z: zf });
      u.box(fw, 0.75, 0.12, { m: 'futon', x: fxm, y: pc.futon.y - 0.45, z: zf + 0.42 });
      u.box(fw, 0.75, 0.12, { m: 'futon', x: fxm, y: pc.futon.y - 0.45, z: zf - 0.42 });
    }
  }
  const sockets = {};
  if (pc.lanterns && tier !== 'far') {
    const ly = (pc.storeys === 2 ? pc.hisashi : pc.eave) - 0.38;
    for (const lx of [x0 + (x1 - x0) * 0.22, x1 - (x1 - x0) * 0.22]) {
      u.box(0.02, 0.2, 0.02, { m: 'dark', x: lx, y: ly + 0.25, z: zF + 0.55 });
      u.cyl(0.13, 0.32, { m: look > 0.5 ? 'lanternRed' : 'lanternWhite', axis: 'y', seg: 10, x: lx, y: ly, z: zF + 0.55 });
    }
    const s = new THREE.Object3D(); s.position.set(0, ly, zF + 0.9); sockets.light = s;
  }
  if (pc.storeys === 2 && !pc.covered && tier !== 'far')
    u.box(Math.min(1.2, (x1 - x0) * 0.3), 0.5, 0.03, { m: 'shoji', x: x0 + 0.9, y: (pc.hisashi + pc.eave) / 2 + 0.2, z: zF + 0.035 });
  if (tier === 'hero') dressHouse(u, { ...pc, hisashi: pc.hisashi });
  const out = finish(u, 'machiya');
  for (const s of Object.values(sockets)) out.group.add(s);
  out.sockets = sockets;
  return out;
}

export function buildKura(ctx, layout) {
  const pc = layout.piece, u = new Multi(ctx), sm = (pc.s0 + pc.s1) / 2;
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm, w = x1 - x0, zF = pc.dFront, zB = zF - pc.depth, zm = (zF + zB) / 2;
  u.box(w, pc.foot, pc.depth, { m: 'plaster', y: pc.foot / 2, z: zm });
  u.box(w + 0.05, 1.6, pc.depth + 0.05, { m: 'namako', y: 0.8, z: zm });
  u.box(w + 0.16, 0.22, pc.depth + 0.16, { m: 'timber', y: pc.foot - 0.11, z: zm });
  if (ctx.tier !== 'far') {
    u.box(0.8, 0.7, 0.08, { m: 'dark', y: pc.foot - 1.0, z: zF + 0.03 });
    for (let i = -1; i <= 1; i++) u.box(0.05, 0.7, 0.1, { m: 'plaster', x: i * 0.22, y: pc.foot - 1.0, z: zF + 0.05 });
  }
  tsumaRoof(u, x0, x1, zF, zB, pc.foot, pc.ridge, 0.25);
  return finish(u, 'kura');
}

export function buildKido(ctx, layout) {
  const pc = layout.piece, u = new Multi(ctx), hw = (pc.s1 - pc.s0) / 2;
  for (const x of [-hw + 0.15, hw - 0.15]) u.box(0.18, 2.2, 0.18, { m: 'timber', x, y: 1.1, z: pc.d });
  u.box(hw * 2, 0.16, 0.2, { m: 'timber', y: 2.1, z: pc.d });
  u.slope('roof', { x: 0, y: 2.15, z: pc.d + 0.55 }, 0.1, 0.55, hw * 2 + 0.3, 0);
  u.slope('roof', { x: 0, y: 2.15, z: pc.d - 0.55 }, 0.1, 0.55, hw * 2 + 0.3, Math.PI);
  ridgeCap(u, -hw - 0.15, hw + 0.15, pc.y - 0.25, pc.d);
  for (const sx of [-1, 1]) u.box(0.9, 1.8, 0.06, { m: 'timberMed', x: sx * (hw - 0.2), y: 1.0, z: pc.d - 0.5, ry: sx * 1.2 });
  const out = finish(u, 'kido');
  const s = new THREE.Object3D(); s.position.set(0, 1.9, pc.d + 0.5); out.group.add(s); out.sockets = { light: s };
  return out;
}

export function buildSteps(ctx, layout) {
  const pc = layout.piece, u = new Multi(ctx);
  u.box(pc.s1 - pc.s0, 0.3, 4.0, { m: 'stone', y: pc.y - 0.15, z: pc.d });
  return finish(u, 'steps');
}

export function buildKomayose(ctx, layout) {
  const pc = layout.piece, u = new Multi(ctx), w = pc.s1 - pc.s0, step = ctx.tier === 'hero' ? 0.22 : ctx.tier === 'mid' ? 0.44 : 0.88;
  u.box(w, 0.1, 0.16, { m: 'timberMed', y: pc.y - 0.05, z: pc.d });
  for (let x = -w / 2 + 0.08; x <= w / 2 - 0.07; x += step) u.box(0.08, pc.y - 0.1, 0.08, { m: 'timberMed', x, y: (pc.y - 0.1) / 2, z: pc.d });
  return finish(u, 'komayose');
}

export function buildInuyarai(ctx, layout) {
  const pc = layout.piece, u = new Multi(ctx), w = pc.s1 - pc.s0;
  const geo = new THREE.CylinderGeometry(0.9, 0.9, w, ctx.tier === 'far' ? 4 : 12, 1, true, 0, Math.PI / 2);
  geo.rotateZ(Math.PI / 2);
  u.add(geo, { m: 'inuyarai', z: pc.d - 0.4 });
  return finish(u, 'inuyarai');
}

export function buildTsuboniwa(ctx, layout) {
  const pc = layout.piece, u = new Multi(ctx), sm = (pc.s0 + pc.s1) / 2, k = hash1(sm);
  u.cyl(0.07, 2.2, { m: 'bark', axis: 'y', seg: 6, y: 1.1, z: pc.d - 0.8 });
  const n = ctx.tier === 'far' ? 3 : 7;
  for (let i = 0; i < n; i++)
    u.add(new THREE.IcosahedronGeometry(0.28 + 0.14 * hash1(sm + i), ctx.tier === 'hero' ? 1 : 0), { m: k > 0.5 ? 'pine' : 'foliage',
      x: (hash1(sm * 3 + i) - 0.5) * 1.1, y: 1.9 + i * 0.12, z: pc.d - 1.2 + (hash1(sm + i * 7) - 0.5) * 0.7 });
  return finish(u, 'tsuboniwa');
}
