// Takegaki: a fence is rails between posts and a rhythm of verticals, lashed
// with dark cord. Everything along a run is instanced culms and knots.
import * as THREE from 'three';
import { V3, rng, lerp, Bag, TAU } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { culmGeometry, bambooColor, culmMatrix } from '../../shared/bamboo.js';

export const STYLES = {
  yotsume: { label: 'Yotsume-gaki', hint: 'open, four spaces at each crossing', h: 1.3 },
  kenninji: { label: 'Kenninji-gaki', hint: 'a closed screen of split bamboo', h: 1.8 },
  teppo: { label: 'Teppō-gaki', hint: 'alternate thick poles, front and back', h: 1.6 },
  koetsu: { label: 'Kōetsu-gaki', hint: 'a diagonal lattice, arching at the top', h: 1.3 },
  ginkaku: { label: 'Ginkakuji-gaki', hint: 'low, set along a stone wall', h: 1.1 }
};

const CULM = culmGeometry({ nodes: 6, radial: 8 });
const KNOT = new THREE.TorusGeometry(1, 0.32, 5, 10);

/** Resample a polyline by arc length: returns [{p, dir, s}]. */
export function runAlong(points, spacing) {
  const out = [], segLen = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) { const l = points[i].distanceTo(points[i + 1]); segLen.push(l); total += l; }
  if (!total) return { posts: [], total: 0 };
  const n = Math.max(1, Math.round(total / spacing));
  for (let k = 0; k <= n; k++) {
    let d = k * total / n, i = 0;
    while (i < segLen.length - 1 && d > segLen[i]) { d -= segLen[i]; i++; }
    const t = segLen[i] ? d / segLen[i] : 0, p = points[i].clone().lerp(points[i + 1], t), dir = points[i + 1].clone().sub(points[i]).normalize();
    out.push({ p, dir, s: k * total / n });
  }
  return { posts: out, total };
}

/** Build a fence along a polyline. Returns a Group with culms and knots. */
export function fence(points, style = 'yotsume', { age = 0.3, seed = 3, knotAge = 0 } = {}) {
  const S = STYLES[style], g = new THREE.Group(), R = rng(seed), cols = [], knots = [], list = [];
  const c = new THREE.Color();
  const put = (a, b, r, ageVar = 0.1) => { const m = culmMatrix(a, b, r); list.push(m); bambooColor(Math.max(0, age + (R() - 0.5) * ageVar), c); cols.push(c.getHex()); };
  const knot = (p, r = 0.05) => knots.push(p.clone(), r);
  const lean = () => (R() - 0.5) * 0.03 * (0.4 + age);
  const { posts, total } = runAlong(points, style === 'kenninji' ? 1.5 : 1.8);
  if (!posts.length) return g;
  const up = (p, h) => p.clone().add(V3(0, h, 0));
  // posts and rails common to every style
  const postH = style === 'ginkaku' ? 1.05 : S.h + 0.1, postR = style === 'kenninji' ? 0.05 : 0.045;
  for (const q of posts) put(q.p, up(q.p, postH).add(V3(lean(), 0, lean())), postR);
  const rails = { yotsume: [0.3, 0.7, 1.15], kenninji: [0.18, 0.7, 1.25, 1.72], teppo: [0.34, 0.84, 1.34], koetsu: [0.12, 1.0], ginkaku: [0.55, 0.95] }[style];
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1], dir = a.dir, n = V3(-dir.z, 0, dir.x);
    for (const y of rails) put(up(a.p, y).addScaledVector(n, style === 'teppo' ? 0 : -0.05), up(b.p, y).addScaledVector(n, style === 'teppo' ? 0 : -0.05), 0.032);
    const L = a.p.distanceTo(b.p);
    if (style === 'yotsume') {
      const cnt = Math.max(2, Math.round(L / 0.3));
      for (let k = 1; k < cnt; k++) {
        const t = k / cnt, p = a.p.clone().lerp(b.p, t), front = k % 2 ? 1 : -1;
        const base = p.clone().addScaledVector(n, 0.05 * front);
        put(base, up(base, S.h + lean()).add(V3(lean(), 0, lean())), 0.022);
        for (const y of rails) knot(up(p, y).addScaledVector(n, 0.02 * front), 0.038);
      }
    } else if (style === 'kenninji') {
      const cnt = Math.round(L / 0.07);
      for (let k = 0; k <= cnt; k++) { const p = a.p.clone().lerp(b.p, k / cnt).addScaledVector(n, 0.02); const m = culmMatrix(p, up(p, S.h), 0.05); list.push(m); bambooColor(Math.max(0, age + (R() - 0.5) * 0.08), c); cols.push(c.getHex()); }
      for (const y of rails) { put(up(a.p, y).addScaledVector(n, 0.08), up(b.p, y).addScaledVector(n, 0.08), 0.026, 0.04); }
      for (const y of [rails[1], rails[2]]) for (let k = 0; k < 4; k++) knot(up(a.p.clone().lerp(b.p, (k + 0.5) / 4), y).addScaledVector(n, 0.1), 0.03);
    } else if (style === 'teppo') {
      const cnt = Math.max(2, Math.round(L / 0.24));
      for (let k = 0; k <= cnt; k++) {
        const t = k / cnt, front = k % 2 ? 1 : -1, p = a.p.clone().lerp(b.p, t).addScaledVector(n, 0.06 * front);
        put(p, up(p, S.h + 0.02 * R()), front > 0 ? 0.05 : 0.038);
        knot(up(p, rails[1]).addScaledVector(n, -0.03 * front), 0.03);
      }
    } else if (style === 'koetsu') {
      const cnt = Math.max(2, Math.round(L / 0.26));
      for (let k = 0; k < cnt; k++) {
        const t0 = k / cnt, t1 = (k + 1) / cnt, y0 = 0.14, ym = S.h;
        const pa = a.p.clone().lerp(b.p, t0), pb = a.p.clone().lerp(b.p, t1);
        put(up(pa, y0).addScaledVector(n, 0.02), up(pb, ym).addScaledVector(n, 0.02), 0.017, 0.05);
        put(up(pb, y0).addScaledVector(n, -0.02), up(pa, ym).addScaledVector(n, -0.02), 0.017, 0.05);
      }
    } else if (style === 'ginkaku') {
      const cnt = Math.max(2, Math.round(L / 0.09));
      for (let k = 0; k <= cnt; k++) { const p = a.p.clone().lerp(b.p, k / cnt); put(up(p, 0.44).addScaledVector(n, 0.02), up(p, 1.03).addScaledVector(n, 0.02), 0.032, 0.05); }
    }
  }
  const cul = new THREE.InstancedMesh(CULM, M.bamboo({ rough: 0.5, color: 0xffffff, vcol: true }), list.length);
  list.forEach((m, i) => { cul.setMatrixAt(i, m); cul.setColorAt(i, c.set(cols[i])); });
  cul.instanceMatrix.needsUpdate = true; if (cul.instanceColor) cul.instanceColor.needsUpdate = true;
  cul.castShadow = cul.receiveShadow = true; cul.frustumCulled = false; cul.name = 'Culms'; g.add(cul);
  if (knots.length) {
    const kn = new THREE.InstancedMesh(KNOT, M.plain(0x2a2017, { rough: 1 }), knots.length / 2), o = new THREE.Object3D();
    for (let i = 0; i < knots.length; i += 2) { o.position.copy(knots[i]); o.rotation.set(Math.PI / 2, 0, R() * 3); o.scale.setScalar(knots[i + 1]); o.updateMatrix(); kn.setMatrixAt(i / 2, o.matrix); }
    kn.instanceMatrix.needsUpdate = true; kn.frustumCulled = false; kn.castShadow = true; kn.name = 'Knots'; g.add(kn);
  }
  if (style === 'ginkaku') {
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i], b = posts[i + 1], len = a.p.distanceTo(b.p), m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.05, 0.42, 0.36), M.stone({ tint: 0x8f8a7e, moss: 0.6, lichen: 0.4 }));
      m.position.copy(a.p).lerp(b.p, 0.5); m.position.y = 0.21; m.rotation.y = Math.atan2(-(b.p.z - a.p.z), b.p.x - a.p.x); m.castShadow = m.receiveShadow = true; g.add(m);
    }
  }
  g.userData.total = total;
  return g;
}

export const straight = (L) => [V3(-L / 2, 0, 0), V3(L / 2, 0, 0)];
