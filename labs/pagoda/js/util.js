// Pagoda Lab helpers: seeded random, a geometry Bag that bakes coloured
// primitives into one mesh, and the small canvas-painted textures (256 px or
// less, painted at load time like the game's own).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _c = new THREE.Color();

export function paint(geo, hex) {
  _c.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

export const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10, 1),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6, 1),
  sphere: new THREE.SphereGeometry(1, 12, 8)
};

/** Collect transformed, coloured primitives; bake them into one mesh. */
export class Bag {
  constructor() { this.geos = []; }
  add(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, color = 0xffffff, order = 'XYZ', keep = false } = {}) {
    const g = geo.clone();
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, order)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (!(keep && g.attributes.color)) { g.deleteAttribute('color'); paint(g, color); }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    this.geos.push(g);
    return this;
  }
  box(w, h, d, o = {}) { return this.add(UNIT.box, { ...o, sx: w, sy: h, sz: d }); }
  cyl(r, h, o = {}, six = false) { return this.add(six ? UNIT.cyl6 : UNIT.cyl, { ...o, sx: r, sy: h, sz: r }); }
  /** A box running from point a to point b (thickness w × h). */
  beam(a, b, w, h, o = {}) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz);
    const ry = Math.atan2(dx, dz), rx = -Math.atan2(dy, Math.hypot(dx, dz));
    return this.add(UNIT.box, { ...o, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, ry, rx, order: 'YXZ', sx: w, sy: h, sz: len });
  }
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

/** Build an indexed grid surface from fn(i, j) -> [x, y, z] (and optional uv fn). */
export function gridGeometry(nu, nv, fn, uvFn, wantDir = null) {
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
  if (wantDir) orient(g, wantDir);
  return g;
}

/** Flip the winding if the surface's mean normal points away from `dir`. */
export function orient(g, dir) {
  const n = g.attributes.normal;
  let s = 0;
  for (let i = 0; i < n.count; i++) s += n.getX(i) * dir.x + n.getY(i) * dir.y + n.getZ(i) * dir.z;
  if (s >= 0) return g;
  const ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  g.index.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

export function countMesh(root) {
  let meshes = 0, tris = 0, instances = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    meshes++;
    const g = o.geometry, k = o.isInstancedMesh ? o.count : 1;
    instances += o.isInstancedMesh ? o.count : 0;
    tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * k;
  });
  return { meshes, tris: Math.round(tris), instances };
}

/* ---------------- canvas textures ---------------- */

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { repeat = false, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Suien: four openwork sheets of flame round the sōrin shaft (alpha cut). */
export const suienTexture = () => once('suien', () => {
  const [c, x] = canvas(128, 256);
  const r = rng(77);
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 256);
  // the flame silhouette: a tall leaf with scalloped tongues
  x.fillStyle = '#fff';
  x.beginPath();
  x.moveTo(64, 4);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, y = 8 + t * 236, w = Math.sin(Math.PI * Math.pow(t, 0.75)) * 58 * (0.86 + 0.14 * Math.sin(t * 40));
    x.lineTo(64 + w + (i % 2 ? 6 : -2), y);
  }
  for (let i = 12; i >= 0; i--) {
    const t = i / 12, y = 8 + t * 236, w = Math.sin(Math.PI * Math.pow(t, 0.75)) * 58 * (0.86 + 0.14 * Math.sin(t * 40 + 1));
    x.lineTo(64 - w - (i % 2 ? 6 : -2), y);
  }
  x.closePath(); x.fill();
  // openwork: scrolls and small flying figures cut through the sheet
  x.globalCompositeOperation = 'destination-out';
  x.lineWidth = 5; x.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const cx = 34 + r() * 60, cy = 40 + i * 22 + r() * 8, rad = 7 + r() * 8;
    x.beginPath(); x.arc(cx, cy, rad, r() * 3, r() * 3 + 4.2); x.stroke();
  }
  x.fillStyle = '#000';
  for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(44 + i * 20, 70 + i * 52, 6, 11, 0.6, 0, 7); x.fill(); }
  x.globalCompositeOperation = 'source-over';
  const t = tex(c, { srgb: false });
  return t;
});

/** Itatobira: two leaves of planks with rows of iron studs. */
export const doorTexture = (tone = '#6b3a26') => once('door' + tone, () => {
  const [c, x] = canvas(128, 256);
  x.fillStyle = tone; x.fillRect(0, 0, 128, 256);
  const r = rng(5);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.1})`;
    x.fillRect(i * 16, 0, 1.5, 256);
    for (let k = 0; k < 30; k++) { x.fillStyle = `rgba(255,240,220,${r() * 0.05})`; x.fillRect(i * 16 + r() * 14, r() * 256, 1, 8 + r() * 30); }
  }
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(63, 0, 2, 256);
  for (const y of [34, 92, 164, 222]) {
    x.fillStyle = 'rgba(30,20,12,0.55)'; x.fillRect(0, y - 5, 128, 10);
    for (let i = 0; i < 9; i++) { x.fillStyle = '#c9a75a'; x.beginPath(); x.arc(8 + i * 14, y, 2.4, 0, 7); x.fill(); }
  }
  return tex(c);
});

/** Renji-mado: vertical square bars against the dark inside. */
export const renjiTexture = () => once('renji', () => {
  const [c, x] = canvas(128, 128);
  x.fillStyle = '#1d1612'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 9; i++) {
    const g = x.createLinearGradient(i * 14 + 4, 0, i * 14 + 12, 0);
    g.addColorStop(0, '#8a5a3a'); g.addColorStop(0.5, '#b07a52'); g.addColorStop(1, '#5a3a26');
    x.fillStyle = g; x.fillRect(i * 14 + 4, 0, 8, 128);
  }
  return tex(c);
});

/** Painted soffit: dark boards with pale rafter stripes (the mid-tier eave). */
export const soffitTexture = () => once('soffit', () => {
  const [c, x] = canvas(64, 64);
  x.fillStyle = '#3a2a22'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#7a4a34'; x.fillRect(22, 0, 20, 64);
  x.fillStyle = '#e8dcc2'; x.fillRect(22, 56, 20, 8);
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(40, 0, 4, 64);
  return tex(c, { repeat: true });
});

/** The eave edge: round tile ends (nokigawara) over a pale kayaoi board. */
export const eaveTexture = () => once('eave', () => {
  const [c, x] = canvas(64, 64);
  x.fillStyle = '#2b3135'; x.fillRect(0, 0, 64, 40);
  x.fillStyle = '#d9cfb8'; x.fillRect(0, 40, 64, 10);
  x.fillStyle = '#4a3428'; x.fillRect(0, 50, 64, 14);
  x.fillStyle = '#6d757a'; x.beginPath(); x.arc(32, 22, 15, 0, 7); x.fill();
  x.strokeStyle = '#3c4246'; x.lineWidth = 2; x.beginPath(); x.arc(32, 22, 10, 0, 7); x.stroke();
  x.fillStyle = '#596166';
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(32 + Math.cos(i * 2.1) * 4.5, 22 + Math.sin(i * 2.1) * 4.5, 3, 0, 7); x.fill(); }
  return tex(c, { repeat: true });
});

/** A painted strip of bracket rhythm with alpha: the card tier's kumimono. */
export const bracketCardTexture = (paintHex = '#b8452f') => once('card' + paintHex, () => {
  const [c, x] = canvas(256, 64);
  x.clearRect(0, 0, 256, 64);
  const unit = 64;
  for (let k = 0; k < 4; k++) {
    const cx = k * unit + 32;
    x.fillStyle = '#2a1d16';
    x.fillRect(0, 54, 256, 10);
    x.fillStyle = paintHex;
    x.fillRect(cx - 9, 40, 18, 14);           // daito
    x.fillRect(cx - 28, 32, 56, 8);           // first arm
    x.fillRect(cx - 7, 22, 14, 10);
    x.fillRect(cx - 30, 14, 60, 8);           // second arm
    x.fillStyle = '#e2c98a';
    for (const dx of [-24, 0, 24]) x.fillRect(cx + dx - 5, 6, 10, 8);
    x.fillStyle = '#2a1d16';
    x.fillRect(0, 0, 256, 6);                  // purlin
  }
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
});

/** Soft painterly cumulus: overlapping lobes, cream crown, cooler belly. */
export function cloudTexture(seed = 1) {
  return once('cloud' + seed, () => {
    const [c, x] = canvas(256, 128);
    const r = rng(seed * 31 + 7);
    for (let i = 0; i < 26; i++) {
      const cx = 30 + r() * 196, cy = 56 + (r() - 0.5) * 34 - Math.sin(((cx - 30) / 196) * Math.PI) * 26, rad = 16 + r() * 26;
      const g = x.createRadialGradient(cx, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.65, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
    }
    // flatten the base like a fair-weather cumulus
    x.globalCompositeOperation = 'destination-out';
    const g = x.createLinearGradient(0, 84, 0, 110);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = g; x.fillRect(0, 84, 256, 44);
    const t = tex(c, { srgb: false });
    return t;
  });
}
