// Geometry helpers for kit builders, promoted from labs/shared/craft.js
// (BUILD_GUIDE_FABLE §3.3 rule 3: no kit file imports from labs/). Seeded
// random and noise, a Bag that bakes coloured primitives into one mesh,
// sections swept along curves (beams, rope, culms), rocks, instancing and
// counts. Geometry made here is indexed with position/normal/uv (and colour
// for Bags), which is what Countryside._mergeStatics() needs to merge it.
//
// Determinism: nothing here reads Math.random — `rockGeometry(seed)` and
// every other draw come from the seed a builder passes (use `ctx.rng`).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './rng.js?v=20261113a';

export const TAU = Math.PI * 2;
export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** The labs' `rng(seed)`: mulberry32 with seed 0 mapped to 1 (lab specimens keep their exact look). */
export function rng(seed = 1) {
  return mulberry32((seed >>> 0) || 1);
}

/* ---------------- noise ---------------- */

function h3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function noise3(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const u = fade(x - i), v = fade(y - j), w = fade(z - k);
  const a = lerp(lerp(h3(i, j, k), h3(i + 1, j, k), u), lerp(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v);
  const b = lerp(lerp(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), lerp(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v);
  return lerp(a, b, w);
}
export function fbm3(x, y, z, oct = 4) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise3(x, y, z); n += a; x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; z = z * 2.03 + 3.7; a *= 0.5; }
  return s / n;
}
export function ridged3(x, y, z, oct = 4) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * (1 - Math.abs(noise3(x, y, z) * 2 - 1)); n += a; x *= 2.1; y *= 2.1; z *= 2.1; a *= 0.5; }
  return s / n;
}

/* ---------------- Bag ---------------- */

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

export function paintVerts(geo, hex) {
  _c.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

export const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12, 1),
  sphere: new THREE.SphereGeometry(1, 14, 10)
};

/** Collect transformed, coloured primitives and bake them into one mesh. */
export class Bag {
  constructor() { this.geos = []; }
  add(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, color = 0xffffff, order = 'XYZ', keep = false } = {}) {
    const g = geo.clone();
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, order)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (!(keep && g.attributes.color)) { g.deleteAttribute('color'); paintVerts(g, color); }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    this.geos.push(g);
    return this;
  }
  box(w, h, d, o = {}) { return this.add(UNIT.box, { ...o, sx: w, sy: h, sz: d }); }
  cyl(r, h, o = {}) { return this.add(UNIT.cyl, { ...o, sx: r, sy: h, sz: r }); }
  sphere(r, o = {}) { return this.add(UNIT.sphere, { ...o, sx: r, sy: r, sz: r }); }
  get empty() { return !this.geos.length; }
  geometry() {
    if (!this.geos.length) return null;
    const g = mergeGeometries(this.geos);
    for (const x of this.geos) x.dispose();
    this.geos = [];
    return g;
  }
  mesh(material, name = '') {
    const g = this.geometry();
    if (!g) return null;
    const m = new THREE.Mesh(g, material);
    m.name = name;
    return m;
  }
}

/** Merge geometries that may differ in attributes, keeping position/normal/uv (+colour when any has it). */
export function merge(list) {
  const clean = list.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    if (!c.attributes.normal) c.computeVertexNormals();
    if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
    for (const k of Object.keys(c.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) c.deleteAttribute(k);
    return c;
  });
  const anyColor = clean.some((c) => c.attributes.color);
  if (anyColor) for (const c of clean) if (!c.attributes.color) paintVerts(c, 0xffffff);
  return mergeGeometries(clean);
}

/** Give a non-indexed geometry an index (so _mergeStatics can take it). */
export function indexed(geo) {
  if (geo.index) return geo;
  geo.setIndex([...Array(geo.attributes.position.count).keys()]);
  return geo;
}

/* ---------------- curves and sweeps ---------------- */

export const catmull = (pts, n = 32, closed = false, tension = 0.5) => new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(...p))), closed, 'catmullrom', tension).getPoints(n);

/** Parallel-transport frames along a polyline: N, B and T at every point. */
export function transportFrames(pts, up = V3(0, 1, 0)) {
  const n = pts.length, T = [], N = [], B = [];
  for (let i = 0; i < n; i++) T.push(pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
  const nrm = up.clone().addScaledVector(T[0], -up.dot(T[0]));
  if (nrm.lengthSq() < 1e-6) nrm.set(1, 0, 0).addScaledVector(T[0], -T[0].x);
  N.push(nrm.normalize());
  B.push(T[0].clone().cross(N[0]));
  const ax = new THREE.Vector3();
  for (let i = 1; i < n; i++) {
    const nx = N[i - 1].clone();
    ax.crossVectors(T[i - 1], T[i]);
    const s = ax.length();
    if (s > 1e-5) nx.applyAxisAngle(ax.divideScalar(s), Math.atan2(s, T[i - 1].dot(T[i])));
    N.push(nx);
    B.push(T[i].clone().cross(nx).normalize());
  }
  return { T, N, B };
}

export const ringRound = (r = 1, n = 10) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * TAU) * r, Math.sin(i / n * TAU) * r]);
/** A rectangle with chamfered corners. a runs along N (height for a horizontal beam), b along B (depth). */
export function ringRect(a, b, bevel = 0) {
  const x = a / 2, y = b / 2, c = Math.min(bevel, x * 0.9, y * 0.9);
  if (c <= 0) return [[x, y], [-x, y], [-x, -y], [x, -y]];
  return [[x, y - c], [x - c, y], [-x + c, y], [-x, y - c], [-x, -y + c], [-x + c, -y], [x - c, -y], [x, -y + c]];
}

/**
 * Sweep a closed section along a polyline. scale(t, i) may return a number or
 * [sa, sb]. u runs along the length in metres / uScale, v once round the ring.
 */
export function sweep(pts, ring, { scale = null, caps = true, uScale = 1, up } = {}) {
  const { N, B } = transportFrames(pts, up), m = ring.length, n = pts.length;
  const pos = [], uv = [], idx = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i) s += pts[i].distanceTo(pts[i - 1]);
    const t = i / (n - 1), sc = scale ? scale(t, i) : 1, sa = Array.isArray(sc) ? sc[0] : sc, sb = Array.isArray(sc) ? sc[1] : sc;
    for (let j = 0; j <= m; j++) {
      const [a, b] = ring[j % m];
      const p = pts[i];
      pos.push(p.x + N[i].x * a * sa + B[i].x * b * sb, p.y + N[i].y * a * sa + B[i].y * b * sb, p.z + N[i].z * a * sa + B[i].z * b * sb);
      uv.push(s / uScale, j / m);
    }
  }
  const w = m + 1;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) {
    const a = i * w + j, b = a + 1, c = a + w, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  if (caps) {
    for (const [i, flip] of [[0, true], [n - 1, false]]) {
      const c = pos.length / 3, p = pts[i];
      pos.push(p.x, p.y, p.z); uv.push(0, 0);
      for (let j = 0; j < m; j++) {
        const a = i * w + j, b = i * w + j + 1;
        if (flip) idx.push(c, b, a); else idx.push(c, a, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the seam column was computed twice; average so round sections stay smooth
  const nor = g.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = i * w, b = a + m;
    v.set(nor.getX(a) + nor.getX(b), nor.getY(a) + nor.getY(b), nor.getZ(a) + nor.getZ(b)).normalize();
    nor.setXYZ(a, v.x, v.y, v.z); nor.setXYZ(b, v.x, v.y, v.z);
  }
  return g;
}

/** A round tube. r is a radius or fn(t) -> radius. */
export function tube(pts, r, { radial = 8, caps = true, uScale = 1, up } = {}) {
  const f = typeof r === 'function' ? r : () => r;
  return sweep(pts, ringRound(1, radial), { scale: (t) => f(t), caps, uScale, up });
}

/** Twisted rope: strands wound as helices round the path. */
export function rope(pts, r, { strands = 3, twist = 16, radial = 5, up } = {}) {
  const rf = typeof r === 'function' ? r : () => r;
  const { N, B } = transportFrames(pts, up);
  const geos = [];
  for (let k = 0; k < strands; k++) {
    const offs = pts.map((p, i) => {
      const t = i / (pts.length - 1), a = t * twist * TAU + (k / strands) * TAU, o = rf(t) * 0.55;
      return p.clone().addScaledVector(N[i], Math.cos(a) * o).addScaledVector(B[i], Math.sin(a) * o);
    });
    geos.push(tube(offs, (t) => rf(t) * 0.62, { radial, caps: false, uScale: 0.25 }));
  }
  return merge(geos);
}

/** A flat ribbon strip, one-sided: fn(t) -> {p: Vector3, w: width, side: Vector3}. */
export function ribbon(n, fn) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, { p, w, side } = fn(t);
    pos.push(p.x - side.x * w / 2, p.y - side.y * w / 2, p.z - side.z * w / 2, p.x + side.x * w / 2, p.y + side.y * w / 2, p.z + side.z * w / 2);
    uv.push(0, t, 1, t);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------------- rocks ---------------- */

/**
 * A boulder: an icosphere chiselled by random planes, then displaced by
 * domain-warped fbm and ridges. The planes give it facets and fracture lines
 * that pure noise never does. Indexed (mergeVertices), with normals; call
 * `withUv()` or `worldScaleBoxUVs` before merging it into the statics.
 */
export function rockGeometry(seed = 1, { detail = 5, w = 1, h = 0.72, d = 0.86, rough = 0.2, ridge = 0.08, cuts = 9, cutDepth = 0.72, flat = 0.3 } = {}) {
  const r = rng(seed * 137 + 11);
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const planes = Array.from({ length: cuts }, () => {
    const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u);
    return { n: V3(s * Math.cos(a), u, s * Math.sin(a)), d: cutDepth + r() * (1 - cutDepth) * 0.8 };
  });
  const sx = seed * 3.1 + 0.7, sz = seed * 1.7 + 4.3;
  const pos = g.attributes.position, p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    for (const c of planes) { const e = p.dot(c.n); if (e > c.d) p.addScaledVector(c.n, c.d - e); }
    const wx = p.x + (fbm3(p.x * 1.4 + sx, p.y * 1.4, p.z * 1.4, 3) - 0.5) * 0.6;
    const wy = p.y + (fbm3(p.x * 1.4, p.y * 1.4 + sz, p.z * 1.4, 3) - 0.5) * 0.6;
    const wz = p.z + (fbm3(p.x * 1.4, p.y * 1.4, p.z * 1.4 + sx, 3) - 0.5) * 0.6;
    const disp = (fbm3(wx * 1.9 + sx, wy * 1.9, wz * 1.9 + sz, 5) - 0.5) * rough * 2 + (ridged3(wx * 3.4 + sz, wy * 3.4, wz * 3.4, 4) - 0.55) * ridge * 2;
    p.multiplyScalar(1 + disp);
    if (p.y < -flat) p.y = -flat + (p.y + flat) * 0.18;   // a seated, flattened base
    pos.setXYZ(i, p.x * w, p.y * h, p.z * d);
  }
  g.computeVertexNormals();
  return g;
}

/** Add a planar-projected uv (xz) to a geometry that has none, so it can merge. */
export function withUv(geo, scale = 1) {
  if (geo.attributes.uv) return geo;
  const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) * scale; uv[i * 2 + 1] = pos.getZ(i) * scale; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/* ---------------- instancing and counts ---------------- */

const _o = new THREE.Object3D();
/** list: [{x,y,z,rx,ry,rz,s,sx,sy,sz,color}] */
export function instances(geo, mat, list, name = '') {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const col = new THREE.Color();
  list.forEach((a, i) => {
    _o.position.set(a.x || 0, a.y || 0, a.z || 0);
    _o.rotation.set(a.rx || 0, a.ry || 0, a.rz || 0);
    const s = a.s ?? 1;
    _o.scale.set(a.sx ?? s, a.sy ?? s, a.sz ?? s);
    _o.updateMatrix();
    im.setMatrixAt(i, _o.matrix);
    if (a.color !== undefined) im.setColorAt(i, col.set(a.color));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.name = name;
  return im;
}

/** Visible meshes, triangles (instances counted) and instance total under a root. */
export function countScene(root) {
  let meshes = 0, tris = 0, instanced = 0;
  root.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || !o.visible) return;
    meshes++;
    if (!o.isMesh) return;
    const g = o.geometry, k = o.isInstancedMesh ? o.count : 1;
    instanced += o.isInstancedMesh ? o.count : 0;
    tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * k;
  });
  return { meshes, tris: Math.round(tris), instanced };
}

export function shadows(root, cast = true, receive = true) {
  root.traverse((o) => { if (o.isMesh && !o.userData.noShadow) { o.castShadow = cast; o.receiveShadow = receive; } });
  return root;
}

/** A canvas and its 2d context. */
export function canvas2d(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

export function canvasTexture(c, { repeat = false, srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}
