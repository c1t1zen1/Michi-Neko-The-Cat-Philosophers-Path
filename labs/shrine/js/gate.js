// The gate and everything hung on it: torii from measured parts, rope, paper,
// the bell, the guardians and the hall. Geometry is merged per material so one
// gate costs three or four draws, and the senbon tunnel can instance it.
import * as THREE from 'three';
import { V3, sweep, ringRect, ringRound, tube, rope, merge, clamp, sstep, lerp, TAU, Bag, rng, fbm3, canvas2d, canvasTexture } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';

/** Catmull-Rom through evenly spaced values: the curve drawn in the kasagi editor. */
export const curveOf = (vals) => (t) => {
  const n = vals.length - 1, x = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
  const a = vals[Math.max(0, i - 1)], b = vals[i], c = vals[i + 1], d = vals[Math.min(n, i + 2)];
  return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
};

export const SORI = { straight: [0, 0, 0, 0, 0], myojin: [0, 0.015, 0.05, 0.12, 0.24], deep: [0, 0.03, 0.1, 0.24, 0.46], gentle: [0, 0.01, 0.03, 0.07, 0.13] };

/** Shear the last few centimetres of a beam so its end face is cut at an angle. */
function cutEnds(g, halfL, tan, yMid) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    if (Math.abs(x) > halfL * 0.985) p.setX(i, x + Math.sign(x) * (p.getY(i) - yMid) * tan);
  }
  g.computeVertexNormals();
  return g;
}

const beamOnCurve = (L, y0, curve, h, d, bev, tan = 0.35) => {
  const pts = [];
  for (let i = 0; i <= 48; i++) { const t = i / 48, x = (t - 0.5) * L, u = Math.abs(x) / (L / 2); pts.push(V3(x, y0 + curve(u), 0)); }
  return cutEnds(sweep(pts, ringRect(h, d, bev), { uScale: 1.2 }), L / 2, tan, y0 + curve(1));
};

/** One gate as named parts: [{name, mat, geo}]. Order is the order it is raised. */
export function gateParts(o = {}) {
  const O = { kind: 'myojin', span: 3.6, height: 4.6, postR: 0.21, taper: 0.8, lean: 0.03, lintelH: 0.3, lintelD: 0.36, ext: 0.72, sori: SORI.myojin, nukiDrop: 0.74, ...o };
  const C = curveOf(O.sori);
  const parts = [], add = (name, mat, geo) => parts.push({ name, mat, geo });
  const shinmei = O.kind === 'shinmei', ishi = O.kind === 'ishi', slim = O.kind === 'slim';
  const body = shinmei ? 'wood' : ishi ? 'stone' : 'paint';
  const postBase = (s) => V3(s * O.span / 2, 0, 0), postTop = (s) => V3(s * (O.span / 2 - O.lean * O.height), O.height, 0);
  const L = O.span + O.ext * 2;
  const yTop = O.height + 0.02;
  for (const s of [-1, 1]) {
    const a = postBase(s), b = postTop(s), radial = slim ? 10 : 18;
    if (!shinmei && !slim) {
      const k = new THREE.LatheGeometry([[0.001, 0.0], [O.postR * 1.7, 0.0], [O.postR * 1.74, 0.09], [O.postR * 1.5, 0.24], [O.postR * 1.1, 0.34], [0.001, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
      k.translate(s * O.span / 2, 0, 0);
      add('kamebara', 'stone', k);
    }
    add('hashira', body, tube([a, a.clone().lerp(b, 0.5), b], (t) => O.postR * lerp(1, O.taper, t), { radial, uScale: 1.2 }));
    if (!shinmei && !slim) add('nemaki', 'black', tube([V3(s * O.span / 2, 0, 0), V3(s * (O.span / 2 - O.lean * 0.6), 0.6, 0)], (t) => O.postR * lerp(1.14, 1.08, t), { radial, uScale: 1.2 }));
  }
  // nuki: straight through the posts, projecting a fifth of its length in total
  const nukiY = O.height - O.nukiDrop, NL = shinmei ? O.span + 0.24 : O.span * 1.25;
  add('nuki', body, sweep([V3(-NL / 2, nukiY, 0), V3(NL / 2, nukiY, 0)], ringRect(O.lintelH * 0.7, O.lintelD * 0.55, 0.02), { uScale: 1.2 }));
  if (!shinmei && !slim) {
    for (const s of [-1, 1]) add('kusabi', 'black', new THREE.BoxGeometry(0.2, 0.09, 0.32).translate(s * (O.span / 2 - O.lean * (O.height - O.nukiDrop)), nukiY + O.lintelH * 0.46, 0));
    const gapTop = yTop + O.lintelH * 0.5;
    add('gakuzuka', body, new THREE.BoxGeometry(0.26, gapTop - nukiY - O.lintelH * 0.3, 0.2).translate(0, (gapTop + nukiY + O.lintelH * 0.3) / 2, 0));
  }
  if (shinmei) add('kasagi', 'wood', tube([V3(-L / 2, yTop + 0.16, 0), V3(L / 2, yTop + 0.16, 0)], O.lintelH * 0.62, { radial: 14, uScale: 1.2 }));
  else {
    const kasagiY = yTop + O.lintelH * 1.55;
    if (O.kind !== 'kasuga') add('shimaki', body, beamOnCurve(L * 0.965, kasagiY - O.lintelH * 0.98, (t) => C(t) * 0.96, O.lintelH * 0.92, O.lintelD * 0.9, 0.025));
    add('kasagi', ishi ? 'stone' : 'black', beamOnCurve(L, kasagiY, C, O.lintelH, O.lintelD, 0.03));
  }
  return parts;
}

/** One gate: geometry merged per material, three or four draws. */
export function gateGeos(o = {}) {
  const by = {};
  for (const p of gateParts(o)) (by[p.mat] ||= []).push(p.geo);
  const out = {};
  for (const [k, list] of Object.entries(by)) out[k] = merge(list);
  return out;
}

export function gateMats(o = {}) {
  return {
    paint: M.lacquer({ color: o.paint ?? 0xd8482c, rough: 0.34, grime: 0.35 }),
    black: M.plain(0x1c1816, { rough: 0.45, brush: 0.05 }),
    stone: M.stone({ tint: 0x8f8a7e, moss: o.moss ?? 0.4, lichen: 0.3 }),
    wood: M.wood({ base: 0xb89468, dark: 0x8a6a42 })
  };
}

export function buildGate(o = {}) {
  const g = new THREE.Group(), geos = gateGeos(o), mats = gateMats(o);
  g.name = (o.kind || 'myojin') + ' torii';
  for (const [k, geo] of Object.entries(geos)) { const m = new THREE.Mesh(geo, mats[k]); m.name = k; g.add(m); }
  return g;
}

/** Sode posts, the extra little gates of a ryōbu or miwa torii. */
export function sidePosts(o, s) {
  const list = [];
  const b = new Bag();
  const x = s * (o.span / 2 + o.gap), h = o.height * 0.42;
  list.push(tube([V3(x, 0, 0), V3(x, h, 0)], o.postR * 0.62, { radial: 12, uScale: 1.2 }));
  list.push(new THREE.BoxGeometry(o.gap + 0.3, 0.09, 0.2).translate(s * (o.span / 2 + o.gap / 2), h * 0.72, 0));
  return merge(list);
}

/* ---------------- rope, paper, bell ---------------- */

export function catenary(a, b, sag, n = 36) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = a.clone().lerp(b, t);
    p.y -= sag * (1 - Math.pow(2 * t - 1, 2));
    pts.push(p);
  }
  return pts;
}

export const ropeProfiles = {
  gobo: (t) => 0.07 + 0.012 * Math.sin(t * Math.PI),              // gobō-jime: slim, even
  daikon: (t) => 0.06 + 0.17 * Math.pow(Math.sin(t * Math.PI), 1.3), // daikon-jime: fat in the middle
  taper: (t) => lerp(0.13, 0.05, t)                                   // tapered, thick end to the right of the deity
};

export function shimenawa(span, y, { profile = 'daikon', sag = 0.16, strands = 3, twist = 7 } = {}) {
  const pts = catenary(V3(-span / 2, y, 0.02), V3(span / 2, y, 0.02), sag);
  return { geo: rope(pts, ropeProfiles[profile], { strands, twist, radial: 6 }), pts };
}

/** Sagari: straw tufts combed down from the rope. */
export function sagari(pts, count = 3, len = 0.42) {
  const g = new Bag(), n = pts.length - 1;
  for (let k = 1; k <= count; k++) {
    const p = pts[Math.round(k / (count + 1) * n)];
    for (let i = 0; i < 8; i++) g.cyl(0.0085, len * (0.8 + i * 0.03), { x: p.x + (i - 3.5) * 0.008, y: p.y - 0.1 - len * 0.45, z: p.z + Math.sin(i * 2.3) * 0.006, color: 0xcdb077 });
  }
  return g.mesh(M.bag({ rough: 1 }), 'sagari');
}

/**
 * Shide paper, folded three ways. Yoshida steps every fold to the same side;
 * Shirakawa alternates; Ise cuts longer, narrower tongues. Each is a stack of
 * paper tongues, offset as the fold shifts them.
 */
export function shideGeo(school = 'yoshida', { w = 0.078, h = 0.5, tiers = 4 } = {}) {
  const pos = [], uv = [], idx = [];
  const SCH = {
    yoshida: (i) => i * w * 0.55,
    shirakawa: (i) => (i % 2 ? w * 0.6 : 0),
    ise: (i) => (i % 2 ? w * 0.42 : -w * 0.18)
  }[school];
  const w0 = school === 'ise' ? w * 0.72 : w, tH = h / tiers;
  for (let i = 0; i < tiers; i++) {
    const cx = SCH(i), y1 = -i * tH, y0 = y1 - tH * (school === 'ise' && i === tiers - 1 ? 1.25 : 1), z = (i % 2 ? 1 : -1) * 0.0055;
    const l = cx - w0 / 2, r = cx + w0 / 2, b = pos.length / 3;
    pos.push(l, y1, z, r, y1, z, r, y0, -z, l, y0, -z);
    uv.push(0, 1 - i / tiers, 1, 1 - i / tiers, 1, 1 - (i + 1) / tiers, 0, 1 - (i + 1) / tiers);
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export const shideMat = () => M.plain(0xf5f1e6, { rough: 0.85, side: THREE.DoubleSide, brush: 0.03 });

/** Hang shide along a rope; returned sway(t) keeps them moving. */
export function hangShide(pts, school, count = 5) {
  const g = new THREE.Group(), list = [], n = pts.length - 1, geo = shideGeo(school), mat = shideMat();
  for (let k = 1; k <= count; k++) {
    const p = pts[Math.round(k / (count + 1) * n)];
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x, p.y - 0.04, p.z + 0.035);
    m.userData.ph = k * 1.7;
    g.add(m); list.push(m);
  }
  return { group: g, sway(t, gust = 1) { for (const m of list) { m.rotation.x = Math.sin(t * 1.5 + m.userData.ph) * 0.13 * gust; m.rotation.z = Math.sin(t * 0.9 + m.userData.ph * 1.3) * 0.08 * gust; } } };
}

/** Suzu: a bronze crotal bell with its slit and a striped rope. */
export function buildSuzu({ cord = 1.2 } = {}) {
  const g = new THREE.Group();
  const prof = [[0.001, 0.16], [0.05, 0.155], [0.105, 0.11], [0.135, 0.02], [0.13, -0.075], [0.09, -0.135], [0.05, -0.155], [0.001, -0.152]].map(([x, y]) => new THREE.Vector2(x, y));
  const bronze = M.bronze({ color: 0xb08a48, rough: 0.34 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), bronze);
  g.add(body);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.008, 0.02), M.plain(0x1a1208, { brush: 0 }));
  slit.position.set(0, -0.128, 0.05); g.add(slit);
  const lug = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 8, 16), bronze);
  lug.position.y = 0.19; g.add(lug);
  const bag = new Bag(), cols = [0xb8322a, 0xe9dcb8, 0x5a3a6a], r = 0.024;
  const bandH = 0.11;
  for (let i = 0; i < Math.round(cord / bandH); i++) bag.cyl(r, bandH, { y: -0.2 - bandH / 2 - i * bandH, color: cols[i % 3] });
  bag.sphere(0.05, { y: -0.22 - cord, color: 0xb8322a, sy: 1.6 });
  g.add(bag.mesh(M.bag({ rough: 0.8 }), 'cord'));
  return g;
}

/* ---------------- guardians ---------------- */

/**
 * A komainu sculpted from soft primitives, sitting on its haunches. mouth open
 * for a-gyō; un-gyō shuts it and grows a single horn.
 */
export function komainuPrims(open = true, h = 1) {
  const p = [];
  const E = (c, r, blend = 0.05, extra = {}) => p.push({ type: 'ellipsoid', c, r, blend, ...extra });
  const C = (a, b, ra, rb, blend = 0.05, extra = {}) => p.push({ type: 'cone', a, b, ra, rb, blend, ...extra });
  E([0, 0.34, -0.05], [0.2, 0.26, 0.27], 0.08);                  // haunches
  E([0, 0.58, 0.05], [0.17, 0.27, 0.19], 0.1);                   // chest
  C([-0.11, 0.1, 0.17], [-0.12, 0.5, 0.11], 0.075, 0.09, 0.05);  // forelegs
  C([0.11, 0.1, 0.17], [0.12, 0.5, 0.11], 0.075, 0.09, 0.05);
  E([-0.12, 0.06, 0.19], [0.09, 0.06, 0.12], 0.04);              // paws
  E([0.12, 0.06, 0.19], [0.09, 0.06, 0.12], 0.04);
  C([-0.18, 0.1, -0.2], [-0.2, 0.3, -0.04], 0.08, 0.13, 0.06);   // thighs
  C([0.18, 0.1, -0.2], [0.2, 0.3, -0.04], 0.08, 0.13, 0.06);
  E([0, 0.86, 0.13], [0.17, 0.155, 0.17], 0.08);                 // head
  E([0, 0.8, 0.29], [0.11, 0.08, 0.1], 0.05);                    // muzzle
  E([-0.1, 0.96, 0.05], [0.055, 0.07, 0.04], 0.03);               // ears
  E([0.1, 0.96, 0.05], [0.055, 0.07, 0.04], 0.03);
  // the mane: curls set in rows round the neck
  for (let row = 0; row < 3; row++) {
    const n = 8 + row * 2;
    for (let i = 0; i < n; i++) {
      const a = -1.3 + (i / (n - 1)) * 2.6, r = 0.2 + row * 0.03, y = 0.8 - row * 0.1;
      E([Math.sin(a) * r, y, 0.08 - Math.cos(a) * r * 0.9], [0.05, 0.05, 0.05], 0.03);
    }
  }
  E([-0.07, 0.9, 0.3], [0.03, 0.028, 0.02], 0.015);              // brows
  E([0.07, 0.9, 0.3], [0.03, 0.028, 0.02], 0.015);
  if (open) E([0, 0.75, 0.37], [0.07, 0.045, 0.06], 0.03, { sub: true });   // the open a-gyō mouth
  else {
    C([0, 0.99, 0.12], [0, 1.15, 0.17], 0.04, 0.012, 0.03);               // un-gyō's single horn
    C([-0.09, 0.73, 0.35], [0.09, 0.73, 0.35], 0.012, 0.012, 0.01, { sub: true });
  }
  C([0, 0.22, -0.3], [0, 0.72, -0.34], 0.07, 0.03, 0.06);        // the tail, flamed up the back
  E([0, 0.72, -0.34], [0.08, 0.12, 0.07], 0.05);
  return p;
}

export function hallRoofSurface({ w, d, ridge, over, sori = 0.12, frontOver = 0, nu = 30, nv = 12 }) {
  const pos = [], uv = [], idx = [];
  const surf = (side) => {
    const base = pos.length / 3;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, run = d / 2 + over + (side > 0 ? frontOver : 0);
      const dy = -ridge * (1 - Math.pow(1 - v, 1.28)) - sori * Math.pow(v, 3) * -1;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, x = (u - 0.5) * (w + over * 2);
        const wing = sori * 0.55 * Math.pow(Math.abs(x) / ((w + over * 2) / 2), 2.4) * Math.pow(v, 1.5);
        pos.push(x, dy + wing, side * v * run);
        uv.push(u * (w + over * 2), v * run * 2);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1;
      if (side > 0) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c);
    }
  };
  surf(1); surf(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Layered cedar-bark roofing (hiwadabuki): thin courses seen edge on. */
export function hiwadaTexture() {
  const [c, x] = canvas2d(256, 256);
  const r = rng(91);
  x.fillStyle = '#6b4a34'; x.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8) {
    x.fillStyle = `rgba(${40 + r() * 30},${26 + r() * 18},${16 + r() * 14},0.55)`; x.fillRect(0, y, 256, 2);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${150 + r() * 60},${110 + r() * 50},${80 + r() * 40},${0.05 + r() * 0.12})`; x.fillRect(r() * 256, y + 2 + r() * 5, 8 + r() * 30, 1.3); }
  }
  return canvasTexture(c, { repeat: true });
}
