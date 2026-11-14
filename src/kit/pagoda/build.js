// The parametric gojū-no-tō for the kit (promoted from labs/pagoda/js/pagoda.js).
// buildPagoda(opts, { detail }) builds a five-storey pagoda in real metres from
// a handful of measured proportions (presets.js). Storey widths taper by
// teigen, eave projection is near constant so the eave:body ratio grows upward,
// storey heights are solved so H / W1 and the sorin share match the record,
// and every roof is lofted with the measured corner rise (sori).
//
// Kit differences from the lab: ONE material (km.bag, vertex colours) so every
// instance merges into the valley's statics; kumimono, rafters and bells are
// baked into plain merged geometry (no InstancedMesh, no shaders); the roof
// tile look is vertex colour banding. Detail tiers: hero (bracket clusters,
// futanoki rafters, koran rails, full sorin, fūtaku), mid (shelf brackets,
// painted soffit), far (silhouette: roofs, dark eave band, needle sorin).
import * as THREE from 'three';
import { UNIT, clamp, V3 } from '../craft.js?v=20261113a';
import { PAINTS, byKey } from './presets.js?v=20261113a';

export const DEFAULTS = {
  preset: 'valley', storeys: 5, roof: 'tile', brackets: 'mitesaki', rafters: 'futanoki',
  body: 'wayo', koran: 'rail', sorinStyle: 'full', bells: true, podium: 'kidan', age: 0.35
};
const PROPS = ['H', 'ratio', 'top', 'overhang', 'oTaper', 'sorin', 'curve', 'start', 'sori', 'flare', 'pitch', 'pitchUp', 'paint', 'mokoshi'];

export function resolveOpts(input = {}) {
  const P = byKey(input.preset || DEFAULTS.preset);
  const base = { ...DEFAULTS };
  for (const k of PROPS) base[k] = P[k];
  if (P.roof === 'bark') base.roof = 'bark';
  const o = { ...base };
  for (const [k, v] of Object.entries(input)) if (v !== undefined) o[k] = v;
  o.preset = P.key;
  return o;
}

export function tierOpts(o, detail) {
  if (detail === 'mid') return { ...o, podium: 'slab', brackets: o.brackets === 'mitesaki' ? 'shelf' : o.brackets, rafters: o.rafters === 'none' ? 'none' : 'soffit', koran: o.koran === 'rail' ? 'band' : o.koran, bells: false, body: 'plain' };
  if (detail === 'far') return { ...o, brackets: 'shadow', rafters: 'none', koran: 'none', bells: false, sorinStyle: 'needle', body: 'plain', podium: 'slab', mokoshi: false, lowpoly: true };
  return o;
}

/* ---------------- proportions ---------------- */

export function towerDims(o) {
  const n = o.storeys;
  const f = (i) => (n > 1 ? i / (n - 1) : 0);
  const S = [];
  for (let i = 0; i < n; i++) {
    const w = 1 - (1 - o.top) * f(i);
    const bs = 0.074 * (0.8 + 0.2 * w);
    S.push({
      i, w, bs, bays: w >= 0.6 ? 3 : 2, proj: 4.25 * bs, b: 3.45 * bs,
      ov: o.overhang * (1 - o.oTaper * f(i)), hb: i === 0 ? 0.6 : 0.3 + 0.1 * w, pitch: o.pitch + o.pitchUp * f(i)
    });
  }
  const kd = 0.1, podiumH = 0.16, robanHalf = 0.1;
  const stack = (k) => {
    let y = podiumH;
    for (let i = 0; i < n; i++) {
      const s = S[i];
      s.R = s.w / 2 + s.ov;
      s.y0 = y; s.h = k * s.hb; s.yTop = y + s.h; s.yB = s.yTop + s.b;
      s.concave = i === n - 1 ? 0.3 : 0.45;
      s.sr = s.pitch * (1 - s.concave);
      s.yE = s.yB + 0.08 - s.sr * Math.max(0, s.R - (s.w / 2 + s.proj));
      s.rIn = i < n - 1 ? S[i + 1].w / 2 + kd + 0.012 : robanHalf;
      s.yR = s.yE + s.pitch * (s.R - s.rIn);
      y = s.yR + (i < n - 1 ? 0.025 : 0);
    }
    return y;
  };
  const sumHb = S.reduce((a, s) => a + s.hb, 0);
  const T0 = stack(0);
  let k = 1;
  if (o.ratio) k = clamp((o.ratio * (1 - o.sorin) - T0) / sumHb, 0.5, 1.9);
  const top = stack(k);
  const Hu = top / (1 - o.sorin);
  const m = o.H / Hu;
  for (const s of S) for (const key of ['w', 'bs', 'proj', 'b', 'ov', 'R', 'y0', 'h', 'yTop', 'yB', 'yE', 'rIn', 'yR']) s[key] *= m;
  for (const s of S) {
    s.rise = o.curve * o.sori * 2 * s.R;
    s.edgeH = 0.07 * m * (0.85 + 0.15 * s.w / m);
    s.rd = 0.034 * m;
    s.bellH = 0.05 * m * (0.85 + 0.15 * s.w / m);
  }
  return { S, n, W1: m, H: o.H, k, kd: kd * m, podiumH: podiumH * m, robanHalf: robanHalf * m, podiumHalf: (0.5 + 0.36) * m, sorinY: top * m, sorinH: (Hu - top) * m };
}

/* ---------------- the roof surface ---------------- */

const NK = [], TK = [];
for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; NK.push(V3(Math.sin(a), 0, Math.cos(a))); TK.push(V3(Math.cos(a), 0, -Math.sin(a))); }

/** Square hipped roof lofted from the eave (half-span R at yE, rising toward the corners by the sori) to the inner square (rIn at yR). */
export function roofFrame({ R, rIn, yE, yR, rise, start, flare, concave = 0.45 }) {
  const lift = (a) => { const x = clamp((Math.abs(a) - start) / (1 - start), 0, 1); return x * x; };
  const g = (t) => t * (1 - concave) + concave * t * t;
  const S = (k, u, t, out = new THREE.Vector3()) => {
    const fu = lift(u), rr = R + (rIn - R) * t, ext = R * flare * fu * (1 - t);
    const nd = rr + ext, td = u * rr + Math.sign(u) * ext;
    const y = yE + rise * fu * Math.pow(1 - t, 1.6) + (yR - yE) * g(t);
    return out.set(NK[k].x * nd + TK[k].x * td, y, NK[k].z * nd + TK[k].z * td);
  };
  return { S, lift, R, rIn, yE, yR, rise, flare };
}

/** Indexed grid surface from fn(a, b, out); uv from uvFn. Winding flipped toward `dir`. */
function grid(nu, nv, fn, uvFn, dir) {
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    fn(i / nu, j / nv, p);
    pos.push(p.x, p.y, p.z);
    const t = uvFn ? uvFn(i / nu, j / nv, p) : [i / nu, j / nv];
    uv.push(t[0], t[1]);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.attributes.normal;
  let s = 0;
  for (let i = 0; i < n.count; i++) s += n.getX(i) * dir.x + n.getY(i) * dir.y + n.getZ(i) * dir.z;
  if (s < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g.index.needsUpdate = true;
    g.computeVertexNormals();
  }
  return g;
}

/** Tile row banding painted into vertex colour (the kit's roofs share one vertex-colour material). */
function paintRoof(g, hex, rows, age) {
  const c = new THREE.Color(hex), uv = g.attributes.uv, n = uv.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let k = 1;
    if (rows) { const f = ((uv.getY(i) / 0.32) % 1 + 1) % 1; k = 0.8 + 0.3 * Math.min(1, f * 4) ; }
    const h = Math.sin(uv.getX(i) * 7.1 + uv.getY(i) * 2.3) * 0.5 + 0.5;
    k *= 0.93 + 0.1 * h - age * 0.04 * h;
    a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
const SPH = new THREE.SphereGeometry(1, 10, 6);
const CONE = new THREE.ConeGeometry(1, 1, 8);

const _m = new THREE.Matrix4(), _n3 = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();

/** A fast geometry accumulator: transformed, coloured primitives written straight into flat arrays. */
class CBag {
  constructor(color, sink = null) {
    this.col = color;
    this.s = sink || { pos: [], nor: [], uv: [], col: [], idx: [], n: 0 };
  }
  /** Another bag with a different default colour writing into the same buffers. */
  view(color) { return new CBag(color, this.s); }
  add(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, color, order = 'XYZ', keep = false } = {}) {
    const S = this.s, pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv, ca = keep ? geo.attributes.color : null;
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, order)), _s.set(sx, sy, sz));
    _n3.getNormalMatrix(_m);
    _c.set(color === undefined ? this.col : color);
    const cnt = pa.count, base = S.n;
    for (let i = 0; i < cnt; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m);
      S.pos.push(_v.x, _v.y, _v.z);
      if (na) { _v.fromBufferAttribute(na, i).applyMatrix3(_n3).normalize(); S.nor.push(_v.x, _v.y, _v.z); } else S.nor.push(0, 1, 0);
      if (ua) S.uv.push(ua.getX(i), ua.getY(i)); else S.uv.push(0, 0);
      if (ca) S.col.push(ca.getX(i), ca.getY(i), ca.getZ(i)); else S.col.push(_c.r, _c.g, _c.b);
    }
    const ix = geo.index;
    if (ix) for (let i = 0; i < ix.count; i++) S.idx.push(base + ix.getX(i));
    else for (let i = 0; i < cnt; i++) S.idx.push(base + i);
    S.n += cnt;
    return this;
  }
  box(w, h, d, o = {}) { return this.add(UNIT.box, { ...o, sx: w, sy: h, sz: d }); }
  cyl(r, h, o = {}) { return this.add(UNIT.cyl, { ...o, sx: r, sy: h, sz: r }); }
  cyl6(r, h, o = {}) { return this.add(CYL6, { ...o, sx: r, sy: h, sz: r }); }
  beam(a, b, w, h, o = {}) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz);
    const ry = Math.atan2(dx, dz), rx = -Math.atan2(dy, Math.hypot(dx, dz));
    return this.add(UNIT.box, { ...o, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, ry, rx, order: 'YXZ', sx: w, sy: h, sz: len });
  }
  get empty() { return this.s.n === 0; }
  geometry() {
    const S = this.s;
    if (!S.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(S.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(S.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(S.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(S.col, 3));
    g.setIndex(S.n > 65535 ? new THREE.Uint32BufferAttribute(S.idx, 1) : new THREE.Uint16BufferAttribute(S.idx, 1));
    this.s = { pos: [], nor: [], uv: [], col: [], idx: [], n: 0 };
    return g;
  }
}

/** One mitesaki (three-step) bracket cluster facing +z, base on the column top. */
function bracketCluster(bs, P, corner = false) {
  const B = new CBag(P.bracket);
  const armH = 0.42 * bs, armW = 0.34 * bs, blkS = 0.62 * bs, blkH = 0.4 * bs;
  const arm = (len, x, y, z, alongZ) => (alongZ
    ? B.box(armW, armH, len, { x, y: y + armH / 2, z })
    : B.box(len, armH, armW, { x, y: y + armH / 2, z }));
  const blk = (x, y, z) => B.box(blkS, blkH, blkS, { x, y: y + blkH / 2, z, color: P.bracketEnd });
  B.box(1.1 * bs, 0.5 * bs, 1.1 * bs, { y: 0.25 * bs, color: P.bracketEnd });
  let y = 0.5 * bs;
  arm(2.1 * bs, 0, y, 0.5 * bs, true); arm(2.6 * bs, 0, y, 0, false);
  y += armH; blk(0, y, 1.45 * bs); blk(-1.1 * bs, y, 0); blk(1.1 * bs, y, 0);
  y += blkH;
  arm(3.3 * bs, 0, y, 1.25 * bs, true); arm(2.6 * bs, 0, y, 1.45 * bs, false);
  y += armH; blk(0, y, 2.8 * bs); blk(-1.1 * bs, y, 1.45 * bs); blk(1.1 * bs, y, 1.45 * bs);
  y += blkH;
  B.beam(V3(0, y + 0.95 * bs, -1.5 * bs), V3(0, y + 0.05 * bs, 4.35 * bs), 0.42 * bs, 0.5 * bs);
  blk(0, y + 0.2 * bs, 4.25 * bs);
  arm(2.6 * bs, 0, y + 0.2 * bs + blkH, 4.25 * bs, false);
  for (const dx of [-1.1, 0, 1.1]) blk(dx * bs, y + 0.2 * bs + blkH + armH, 4.25 * bs);
  const g = B.geometry();
  if (!corner) return g;
  const C = new CBag(P.bracket);
  C.add(g, { keep: true }); C.add(g, { ry: Math.PI / 2, keep: true });
  C.beam(V3(0, y + 1.1 * bs, 0), V3(4.6 * bs, y + 0.05 * bs, 4.6 * bs), 0.46 * bs, 0.55 * bs);
  C.box(blkS * 1.15, blkH, blkS * 1.15, { x: 4.4 * bs, y: y + 0.3 * bs, z: 4.4 * bs, ry: Math.PI / 4, color: P.bracketEnd });
  g.dispose();
  return C.geometry();
}

function bellGeometry() {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.14 + 0.34 * Math.pow(t, 1.7) + (t > 0.9 ? 0.05 : 0), -t)); }
  pts.push(new THREE.Vector2(0.001, -1));
  const B = new CBag(0x625c46);
  B.add(new THREE.LatheGeometry(pts, 8));
  B.box(0.04, 0.9, 0.04, { y: -1.45 }); // wind-plate stem
  B.box(0.5, 0.55, 0.03, { y: -1.35, color: 0xd9a96a });
  return B.geometry();
}

/* ---------------- the tower ---------------- */

/**
 * Build the tower in metres, origin at the centre of the podium's base.
 * Returns { group, parts, dims, tris } — parts are single merged meshes.
 */
export function buildPagoda(input, { detail = 'hero', material } = {}) {
  const opts = resolveOpts(input);
  const o = tierOpts(opts, detail);
  const D = towerDims(o);
  const P = PAINTS[o.paint] || PAINTS.game;
  const W = D.W1, low = !!o.lowpoly;
  const roofCol = { bark: 0x6f4b33, copper: 0x5c9886 }[o.roof] ?? P.tile;
  const lightBoards = new THREE.Color(P.wall).getHSL({}).l > 0.6 && o.paint !== 'natural';
  const soffitCol = lightBoards ? P.wall : 0x3e2d23;
  const group = new THREE.Group();
  const parts = {};
  const mk = (bag, name, key, to = group) => {
    const g = bag.geometry();
    if (!g) return null;
    const m = new THREE.Mesh(g, material);
    m.name = key; m.castShadow = true; m.receiveShadow = true;
    to.add(m);
    parts[key] = m;
    return m;
  };
  const onFace = (k, r, t, y) => NK[k].clone().multiplyScalar(r).addScaledVector(TK[k], t).setY(y);

  /* podium (kidan) */
  {
    const B = new CBag(0xb0aca2), ph = D.podiumH, pw = D.podiumHalf;
    if (o.podium === 'kidan') {
      B.box(pw * 2, ph * 0.84, pw * 2, { y: ph * 0.42, color: 0xb9b5aa });
      B.box(pw * 2 + 0.05 * W, ph * 0.18, pw * 2 + 0.05 * W, { y: ph * 0.91, color: 0xd2cec4 });
      for (let k = 0; k < 4; k++) for (let s = 0; s < 3; s++) {
        const d = pw + (s + 0.5) * 0.07 * W, hs = ph * (1 - (s + 1) / 4);
        B.box(0.4 * W, hs, 0.07 * W, { x: NK[k].x * d, y: hs / 2, z: NK[k].z * d, ry: (k * Math.PI) / 2, color: 0xc4c0b6 });
      }
    } else B.box(pw * 2, ph, pw * 2, { y: ph / 2 });
    mk(B, 'Kidan', 'podium');
  }

  const towerBag = new CBag(0xffffff);
  for (let i = 0; i < D.n; i++) {
    const s = D.S[i], hw = s.w / 2;
    const G = new THREE.Group();
    G.name = `Storey ${i + 1}`;
    group.add(G);
    const top = i === D.n - 1;
    const SB = low ? towerBag : new CBag(0xffffff);
    const colR = 0.034 * W * (0.85 + (0.15 * s.w) / W);
    const T = SB.view(P.timber), WL = SB.view(P.wall), DR = SB.view(new THREE.Color(P.door).getHex()), RJ = SB.view(0x2a1d16);
    const BR = SB.view(P.bracket);
    WL.box(s.w - colR, s.h, s.w - colR, { y: s.y0 + s.h / 2 });

    if (o.body === 'wayo') {
      const xs = s.bays === 3 ? [-hw, -hw / 3, hw / 3, hw] : [-hw, 0, hw];
      const seen = new Set();
      for (let k = 0; k < 4; k++) for (const x of xs) {
        const p = onFace(k, hw, x, 0), key = p.x.toFixed(2) + ',' + p.z.toFixed(2);
        if (seen.has(key)) continue;
        seen.add(key);
        T.cyl6(colR, s.h, { x: p.x, y: s.y0 + s.h / 2, z: p.z });
      }
      const bh = 0.034 * W, bd = colR * 1.25;
      for (const fy of [0.05, 0.7, 0.9]) for (let k = 0; k < 4; k++) {
        const c = onFace(k, hw, 0, s.y0 + s.h * fy);
        T.box(s.w + colR * 2, bh, bd, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2, color: P.beam });
      }
      for (let k = 0; k < 4; k++) {
        const c = onFace(k, hw, 0, s.yTop - bh * 0.35);
        T.box(s.w + colR * 3, bh * 0.7, bd * 1.3, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2, color: P.beam });
      }
      const bay = s.w / s.bays;
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2;
        if (s.bays === 3) {
          const c = onFace(k, hw + 0.004 * W, 0, s.y0 + s.h * 0.375);
          DR.box(bay * 0.8, s.h * 0.62, 0.012 * W, { x: c.x, y: c.y, z: c.z, ry });
        }
        for (const x of s.bays === 3 ? [-bay, bay] : [-bay / 2, bay / 2]) {
          const c = onFace(k, hw + 0.004 * W, x, s.y0 + s.h * 0.45);
          RJ.box(bay * 0.58, s.h * 0.34, 0.012 * W, { x: c.x, y: c.y, z: c.z, ry });
        }
      }
    } else if (!low) {
      for (let k = 0; k < 4; k++) {
        const p = onFace(k, hw, hw, 0);
        T.box(colR * 2, s.h, colR * 2, { x: p.x, y: s.y0 + s.h / 2, z: p.z });
        const c = onFace(k, hw + 0.004 * W, 0, s.y0 + s.h * 0.4), ry = (k * Math.PI) / 2;
        (s.bays === 3 ? DR : RJ).box(s.w * 0.4, s.h * 0.55, 0.012 * W, { x: c.x, y: c.y, z: c.z, ry });
        const bc = onFace(k, hw, 0, s.y0 + s.h * 0.9);
        T.box(s.w + colR * 2, 0.034 * W, colR * 1.25, { x: bc.x, y: bc.y, z: bc.z, ry, color: P.beam });
      }
    }

    /* kumimono */
    const yT = s.yTop;
    if (o.brackets === 'mitesaki' && i === 0) {
      const pos = s.bays === 3 ? [-hw / 3, hw / 3] : [0];
      const hg = bracketCluster(s.bs, P), cg = bracketCluster(s.bs, P, true);
      for (let k = 0; k < 4; k++) {
        const ry = Math.atan2(NK[k].x, NK[k].z);
        for (const x of pos) { const p = onFace(k, hw, x, yT); BR.add(hg, { x: p.x, y: p.y, z: p.z, ry, keep: true }); }
        const c = onFace(k, hw, hw, yT);
        BR.add(cg, { x: c.x, y: c.y, z: c.z, ry, keep: true });
      }
      hg.dispose(); cg.dispose();
      for (let k = 0; k < 4; k++) {
        for (const [z, y0, hh] of [[0, 1.74, 0.42], [1.45, 2.14, 0.4], [4.25, 3.1, 0.38]]) {
          const c = onFace(k, hw + z * s.bs, 0, yT + (y0 + hh / 2) * s.bs);
          BR.box(2 * (hw + z * s.bs), hh * s.bs, 0.36 * s.bs, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2 });
        }
        for (const x of s.bays === 3 ? [-2 * hw / 3, 0, 2 * hw / 3] : [-hw / 2, hw / 2]) {
          const c = onFace(k, hw, x, yT);
          BR.box(0.32 * s.bs, 1.1 * s.bs, 0.32 * s.bs, { x: c.x, y: c.y + 0.55 * s.bs, z: c.z });
          BR.box(0.6 * s.bs, 0.38 * s.bs, 0.6 * s.bs, { x: c.x, y: c.y + 1.3 * s.bs, z: c.z, color: P.bracketEnd });
        }
      }
    } else if (o.brackets === 'shelf' || o.brackets === 'mitesaki') {
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2;
        for (const [z, y0, hh, col] of [[0.6, 0.4, 1.0, P.bracketEnd], [1.9, 1.35, 0.85, P.bracket], [3.3, 2.15, 0.8, P.bracketEnd], [4.25, 2.95, 0.5, P.bracket]].filter((_, j) => detail !== 'mid' || j === 1 || j === 3)) {
          const c = onFace(k, hw + (z * s.bs) / 2, 0, yT + (y0 + hh / 2) * s.bs);
          BR.box(2 * (hw + z * s.bs), hh * s.bs, z * s.bs, { x: c.x, y: c.y, z: c.z, ry, color: col });
        }
      }
    } else if (o.brackets === 'shadow') {
      // one dark box per storey stands for the shadowed bracket band
      BR.box(2 * (hw + s.proj * 0.7), s.b, 2 * (hw + s.proj * 0.7), { y: yT + s.b / 2, color: 0x2a1d16 });
    }

    /* the roof */
    const F = roofFrame({ R: s.R, rIn: s.rIn, yE: s.yE, yR: s.yR, rise: s.rise, start: o.start, flare: o.flare, concave: s.concave });
    const cw = (s.w - colR) / 2;
    let yCore = top ? s.yR : D.S[i + 1].y0 - 0.02 * W;
    if (cw > s.rIn) yCore = Math.min(yCore, F.S(0, 0, (s.R - cw) / (s.R - s.rIn)).y - 0.01 * W);
    const CB = SB.view(P.wall);
    CB.box(2 * cw, yCore - s.yTop, 2 * cw, { y: (s.yTop + yCore) / 2 });
    if (!top && cw <= s.rIn) CB.box(2 * s.rIn - 0.008 * W, 0.025 * W, 2 * s.rIn - 0.008 * W, { y: yCore - 0.0125 * W });
    const segU = low ? 4 : (detail === 'hero' ? 14 : 8), segT = low ? 2 : (detail === 'hero' ? 8 : 3);
    const L = Math.hypot(s.R - s.rIn, s.yR - s.yE);
    const rafterTop = (r) => s.yE + s.sr * (s.R - r) - 0.012 * W;
    const ySi = rafterTop(hw) - 2 * s.rd;
    const tops = SB.view(roofCol), fasc = SB.view(0x2b3135), soff = SB.view(o.rafters === 'soffit' ? 0x7a4a34 : soffitCol);
    for (let k = 0; k < 4; k++) {
      const tk = TK[k], up = NK[k].clone().setY(1.4);
      const rt = grid(segU, segT, (a, b, out) => F.S(k, a * 2 - 1, b, out), (a, b, q) => [q.x * tk.x + q.z * tk.z, b * L], up);
      paintRoof(rt, roofCol, false, o.age);
      tops.add(rt, { keep: true });
      rt.dispose();
      fasc.add(grid(segU, 1, (a, b, out) => F.S(k, a * 2 - 1, 0, out).add(V3(0, -b * s.edgeH, 0)), null, NK[k]));
      {
        soff.add(grid(low ? 1 : segU, low || detail === 'mid' ? 1 : 2, (a, b, out) => {
          const u = a * 2 - 1;
          F.S(k, u, 0, out).add(V3(0, -s.edgeH, 0));
          return out.lerp(onFace(k, cw, u * cw, ySi), b);
        }, null, V3(0, -1, 0)));
      }
    }

    if (!low) {
      const H = SB.view(new THREE.Color(roofCol).multiplyScalar(0.72).getHex()), rr = 0.03 * W;
      for (let k = 0; k < 4; k++) {
        const pts = [];
        for (let j = 0; j <= 8; j++) pts.push(F.S(k, 1, j / 8).add(V3(0, rr * 0.6, 0)));
        H.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), detail === 'hero' ? 8 : 4, rr, detail === 'hero' ? 4 : 3, false));
        const e = F.S(k, 1, 0), d = NK[k].clone().add(TK[k]).normalize();
        H.box(rr * 2.8, rr * 3.2, rr * 1.8, { x: e.x + d.x * rr, y: e.y + rr * 1.5, z: e.z + d.z * rr, ry: Math.atan2(d.x, d.z), rx: -0.35, order: 'YXZ' });
      }
      if (!top) for (let k = 0; k < 4; k++) {
        const c = onFace(k, s.rIn - 0.01 * W, 0, s.yR + rr * 0.5);
        H.box(2 * s.rIn, rr * 1.6, rr * 2, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2 });
      }
    }

    /* rafters: futanoki, two tiers of parallel rafters */
    if (o.rafters === 'futanoki' && i === 0) {
      const sp = 0.075 * W, rp = hw + s.proj, rMid = rp + 0.5 * (s.R - rp);
      const liftAt = (u, r) => F.rise * F.lift(u) * Math.pow(1 - clamp((s.R - r) / (s.R - s.rIn), 0, 1), 1.6);
      const RF = SB.view(P.timber);
      for (let k = 0; k < 4; k++) {
        const pt = (r, t, up) => onFace(k, r, t, rafterTop(r) + liftAt(t / s.R, r) + up);
        for (let st = -s.R + sp / 2; st <= s.R - sp / 2; st += sp) {
          const a = Math.abs(st);
          const rIn1 = Math.max(hw + 0.01 * W, a);
          if (rIn1 < rMid - sp) RF.beam(pt(rIn1, st, -1.5 * s.rd), pt(rMid, st, -1.5 * s.rd), 0.024 * W, s.rd);
          const fStart = Math.max(rMid - 0.25 * (s.R - rp), a);
          if (fStart < s.R - 0.03 * W) {
            const tip = pt(s.R - 0.012 * W, st, -0.5 * s.rd);
            RF.beam(pt(fStart, st, -0.5 * s.rd), tip, 0.022 * W, s.rd * 0.85);
            RF.beam(tip, pt(s.R - 0.004 * W, st, -0.5 * s.rd), 0.023 * W, s.rd * 0.87, { color: P.ends });
          }
        }
        const a = onFace(k, hw, hw, s.yB + 0.1 * s.bs), b = F.S(k, 1, 0).add(V3(0, -s.edgeH * 0.55, 0));
        RF.beam(a, b, 0.05 * W, 0.06 * W);
      }
    }

    /* koran */
    if (i > 0 && o.koran !== 'none') {
      const B = SB.view(P.beam), kd = D.kd, y = s.y0, deckT = 0.035 * W;
      for (let k = 0; k < 4; k++) {
        const c = onFace(k, hw + kd / 2, 0, y - deckT / 2);
        B.box(s.w + 2 * kd, deckT, kd, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2 });
      }
      const kh = 0.1 * W, r0 = hw + kd - 0.012 * W;
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2;
        if (o.koran === 'rail') {
          for (const [fy, th] of [[0.1, 0.014], [0.55, 0.012]]) {
            const c = onFace(k, r0, 0, y + kh * fy);
            B.box(2 * r0 + 0.03 * W, th * W, th * W, { x: c.x, y: c.y, z: c.z, ry });
          }
          const c = onFace(k, r0, 0, y + kh);
          B.cyl6(0.009 * W, 2 * r0 + 0.06 * W, { x: c.x, y: c.y, z: c.z, rz: Math.PI / 2, ry, order: 'YXZ' });
          const nPost = Math.max(3, Math.round((2 * r0) / (0.16 * W)));
          for (let j = 0; j <= nPost; j++) {
            const p = onFace(k, r0, -r0 + (j * 2 * r0) / nPost, y + kh / 2);
            B.box(0.013 * W, kh, 0.013 * W, { x: p.x, y: p.y, z: p.z, color: P.timber });
          }
        } else {
          const c = onFace(k, r0, 0, y + kh * 0.6);
          B.box(2 * r0, 0.025 * W, 0.012 * W, { x: c.x, y: c.y, z: c.z, ry });
        }
      }
    }

    /* mokoshi: pent roof skirting the ground storey (Horyu-ji) */
    if (i === 0 && o.mokoshi) {
      const mr = hw + 0.2 * W, my = s.y0 + s.h * 0.36;
      const B = SB.view(P.timber), WB = SB.view(P.wall);
      for (let k = 0; k < 4; k++) {
        const c = onFace(k, mr, 0, (D.podiumH + my) / 2);
        WB.box(2 * mr, my - D.podiumH, 0.03 * W, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2 });
        const p = onFace(k, mr, mr, (D.podiumH + my) / 2);
        B.box(0.05 * W, my - D.podiumH, 0.05 * W, { x: p.x, y: p.y, z: p.z });
      }
      const MF = roofFrame({ R: hw + 0.4 * W, rIn: hw, yE: my + 0.03 * W, yR: my + 0.03 * W + 0.3 * 0.4 * W, rise: s.rise * 0.5, start: o.start, flare: o.flare * 0.5 });
      const MT = SB.view(roofCol), MS = SB.view(soffitCol);
      for (let k = 0; k < 4; k++) {
        const tk = TK[k];
        const g = grid(14, 4, (a, b, out) => MF.S(k, a * 2 - 1, b, out), (a, b, q) => [q.x * tk.x + q.z * tk.z, b * 0.45 * W], NK[k].clone().setY(1.4));
        paintRoof(g, roofCol, false, o.age);
        MT.add(g, { keep: true }); g.dispose();
        MS.add(grid(14, 1, (a, b, out) => { MF.S(k, a * 2 - 1, 0, out).add(V3(0, -s.edgeH * 0.8, 0)); return out.lerp(onFace(k, mr, (a * 2 - 1) * mr, my), b); }, null, V3(0, -1, 0)));
      }
    }

    /* fūtaku (static in the kit: hero only) */
    if (o.bells && !low && i === 0) {
      const BL = SB.view(0xffffff), bg = bellGeometry();
      for (let k = 0; k < 4; k++) {
        const d = NK[k].clone().add(TK[k]).normalize();
        const hook = F.S(k, 1, 0).add(V3(0, -s.edgeH * 0.95, 0)).addScaledVector(d, -0.01 * W);
        BL.add(bg, { x: hook.x, y: hook.y, z: hook.z, sx: s.bellH, sy: s.bellH, sz: s.bellH, keep: true });
      }
      bg.dispose();
    }
    if (!low) mk(SB, '', `storey_${i + 1}`, G);
  }

  if (low) mk(towerBag, 'tower', 'tower');

  /* sorin */
  {
    const Sh = D.sorinH, y0 = D.sorinY, rb = D.robanHalf;
    const B = new CBag(0x625c46);
    if (o.sorinStyle === 'needle') {
      B.box(rb * 1.8, Sh * 0.05, rb * 1.8, { y: y0 + Sh * 0.025 });
      B.cyl6(rb * 0.14, Sh * 0.9, { y: y0 + Sh * 0.45 });
      B.cyl6(rb * 0.7, Sh * 0.03, { y: y0 + Sh * 0.25 });
      B.cyl6(rb * 0.7, Sh * 0.03, { y: y0 + Sh * 0.5 });
      B.add(CONE, { y: y0 + Sh * 0.95, sx: rb * 0.3, sy: Sh * 0.1, sz: rb * 0.3 });
    } else {
      B.box(rb * 2, Sh * 0.045, rb * 2, { y: y0 + Sh * 0.0225 });
      B.box(rb * 2.2, Sh * 0.012, rb * 2.2, { y: y0 + Sh * 0.051 });
      B.add(SPH, { y: y0 + Sh * 0.057, sx: rb * 0.8, sy: Sh * 0.055, sz: rb * 0.8 });
      for (let p = 0; p < 8; p++) {
        const a = (p * Math.PI) / 4, r = rb * 0.5;
        B.add(SPH, { x: Math.sin(a) * r, y: y0 + Sh * 0.14, z: Math.cos(a) * r, sx: rb * 0.2, sy: Sh * 0.03, sz: rb * 0.07, ry: a, rx: 0.55, order: 'YXZ' });
      }
      B.cyl6(rb * 0.13, Sh * 0.8, { y: y0 + Sh * 0.53 });
      for (let r = 0; r < 9; r++) {
        const rad = rb * (0.86 - r * 0.018), yy = y0 + Sh * (0.19 + r * 0.052);
        B.add(UNIT.cyl, { y: yy, sx: rad, sy: Sh * 0.012, sz: rad });
      }
      for (let p = 0; p < 2; p++) B.box(Sh * 0.2, Sh * 0.2, 0.012 * W, { y: y0 + Sh * 0.735, ry: (p * Math.PI) / 2, color: 0xc9a85a }); // suien, as flat sheets
      B.add(SPH, { y: y0 + Sh * 0.86, sx: rb * 0.38, sy: Sh * 0.02, sz: rb * 0.38 });
      B.add(SPH, { y: y0 + Sh * 0.915, sx: rb * 0.3, sy: rb * 0.34, sz: rb * 0.3 });
      B.add(CONE, { y: y0 + Sh * 0.955, sx: rb * 0.16, sy: Sh * 0.05, sz: rb * 0.16 });
    }
    mk(B, 'Sorin', 'sorin');
  }
  return { group, parts, dims: D, opts };
}
