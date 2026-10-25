// The Terrain: CPU height / splat / rake arrays (so paws, sounds and the stone
// LOD can ask what is underfoot), uploaded as textures once per frame, plus
// the brushes that edit them.
import * as THREE from 'three';
import { vnoise, fbm } from './hash.js';

export const LAYERS = ['earth', 'gravel', 'moss', 'setts', 'cobble'];
export const RAKE_PITCH = 0.063, RAKE_HALF = 0.38;
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class Terrain {
  constructor({ size = 12, res = 256, hres = 129, seg = 192 } = {}) {
    Object.assign(this, { size, res, hres, seg });
    this.height = new Float32Array(hres * hres);
    this.splat = new Uint8Array(res * res * 4);
    this.rake = new Uint8Array(res * res * 4);
    this.h16 = new Uint16Array(hres * hres);
    this.extraH = null;
    this.weather = null;
    this.colliders = [];
    this.splatVersion = 0;
    this.wetFloor = 0;
    this.waterBias = 0;
    this.dirty = { h: true, s: true, r: true };

    this.heightTex = new THREE.DataTexture(this.h16, hres, hres, THREE.RedFormat, THREE.HalfFloatType);
    this.splatTex = new THREE.DataTexture(this.splat, res, res, THREE.RGBAFormat);
    this.rakeTex = new THREE.DataTexture(this.rake, res, res, THREE.RGBAFormat);
    for (const t of [this.heightTex, this.splatTex]) { t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
    this.rakeTex.minFilter = this.rakeTex.magFilter = THREE.NearestFilter;
    this.rakeTex.wrapS = this.rakeTex.wrapT = THREE.ClampToEdgeWrapping;

    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(g, null);
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.props = new THREE.Group();
    this.group = new THREE.Group();
    this.group.add(this.mesh, this.props);
    this.baseline();
  }

  setSeg(seg) {
    this.seg = seg;
    const g = new THREE.PlaneGeometry(this.size, this.size, seg, seg);
    g.rotateX(-Math.PI / 2);
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
  }

  get tris() { return this.seg * this.seg * 2; }

  baseline() {
    const { hres, size } = this;
    for (let j = 0; j < hres; j++) for (let i = 0; i < hres; i++) {
      const x = ((i + 0.5) / hres - 0.5) * size, z = ((j + 0.5) / hres - 0.5) * size;
      this.height[j * hres + i] = clamp(0.03 + (fbm(x * 0.35 + 40, z * 0.35, 3) - 0.5) * 0.09 + (vnoise(x * 1.7, z * 1.7 + 9) - 0.5) * 0.01, -0.12, 0.12);
    }
    this.splat.fill(0); this.rake.fill(0);
    this.colliders.length = 0;
    this.extraH = null;
    this.wetFloor = 0; this.waterBias = 0;
    while (this.props.children.length) this.props.remove(this.props.children[0]);
    this.dirty = { h: true, s: true, r: true };
  }

  /* ---------------- queries ---------------- */

  _hBilinear(x, z) {
    const { hres, size } = this;
    const gx = clamp((x / size + 0.5) * hres - 0.5, 0, hres - 1.001), gz = clamp((z / size + 0.5) * hres - 0.5, 0, hres - 1.001);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, H = this.height, k = j * hres + i;
    return (H[k] * (1 - fx) + H[k + 1] * fx) * (1 - fz) + (H[k + hres] * (1 - fx) + H[k + hres + 1] * fx) * fz;
  }
  groundAt(x, z) { return this._hBilinear(x, z); }
  heightAt(x, z) {
    const g = this._hBilinear(x, z);
    return this.extraH ? this.extraH(x, z, g) : g;
  }
  _sIndex(x, z) {
    const { res, size } = this;
    return [clamp((x / size + 0.5) * res - 0.5, 0, res - 1.001), clamp((z / size + 0.5) * res - 0.5, 0, res - 1.001)];
  }
  layerAt(x, z) {
    const { res, splat, rake } = this, [gx, gz] = this._sIndex(x, z), i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const w = [0, 0, 0, 0, 0];
    for (let c = 0; c < 4; c++) {
      const a = splat[(j * res + i) * 4 + c], b = splat[(j * res + i + 1) * 4 + c], d = splat[((j + 1) * res + i) * 4 + c], e = splat[((j + 1) * res + i + 1) * 4 + c];
      w[c + 1] = ((a * (1 - fx) + b * fx) * (1 - fz) + (d * (1 - fx) + e * fx) * fz) / 255;
    }
    w[0] = Math.max(0, 1 - w[1] - w[2] - w[3] - w[4]);
    const shelter = rake[(Math.round(gz) * res + Math.round(gx)) * 4 + 2] / 255;
    const wx = this.weather ? this.weather : { wet: 0, water: -1 };
    const wet = Math.max(wx.wet, this.wetFloor) * (1 - shelter);
    const water = Math.max(0, wx.water + this.waterBias - this._hBilinear(x, z));
    return { w, wet, water, shelter, rake: rake[(Math.round(gz) * res + Math.round(gx)) * 4 + 1] / 255 };
  }
  dominant(w) { let k = 0; for (let i = 1; i < 5; i++) if (w[i] > w[k]) k = i; return k; }

  /* ---------------- editing ---------------- */

  _splatXZ(i, j) { return [((i + 0.5) / this.res - 0.5) * this.size, ((j + 0.5) / this.res - 0.5) * this.size]; }
  _each(x, z, r, fn) {
    const { res, size } = this;
    const i0 = Math.max(0, Math.floor(((x - r) / size + 0.5) * res)), i1 = Math.min(res - 1, Math.ceil(((x + r) / size + 0.5) * res));
    const j0 = Math.max(0, Math.floor(((z - r) / size + 0.5) * res)), j1 = Math.min(res - 1, Math.ceil(((z + r) / size + 0.5) * res));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const [px, pz] = this._splatXZ(i, j); fn(i, j, px, pz); }
  }
  _addLayer(k, layer, amount) { // layer 1..4 grows, the rest give way; layer 0 (earth) erases
    const s = this.splat, o = k * 4;
    if (layer === 0) { for (let c = 0; c < 4; c++) s[o + c] = Math.max(0, s[o + c] - amount * 255); return; }
    const c = layer - 1, v = Math.min(255, s[o + c] + amount * 255);
    s[o + c] = v;
    let others = 0;
    for (let q = 0; q < 4; q++) if (q !== c) others += s[o + q];
    const room = 255 - v;
    if (others > room) { const f = room / others; for (let q = 0; q < 4; q++) if (q !== c) s[o + q] = Math.floor(s[o + q] * f); }
  }
  paint(layer, x, z, r, strength) {
    this._each(x, z, r, (i, j, px, pz) => {
      const d = Math.hypot(px - x, pz - z) / r + (vnoise(px * 6, pz * 6) - 0.5) * 0.5;
      const f = smooth(1, 0.4, d);
      if (f > 0) this._addLayer(j * this.res + i, layer, f * strength);
    });
    this.dirty.s = true;
  }
  dig(x, z, r, amount) { // amount > 0 digs, < 0 raises (metres)
    const { hres, size } = this;
    const i0 = Math.max(0, Math.floor(((x - r) / size + 0.5) * hres)), i1 = Math.min(hres - 1, Math.ceil(((x + r) / size + 0.5) * hres));
    const j0 = Math.max(0, Math.floor(((z - r) / size + 0.5) * hres)), j1 = Math.min(hres - 1, Math.ceil(((z + r) / size + 0.5) * hres));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = ((i + 0.5) / hres - 0.5) * size, pz = ((j + 0.5) / hres - 0.5) * size, f = smooth(1, 0, Math.hypot(px - x, pz - z) / r);
      const k = j * hres + i;
      this.height[k] = clamp(this.height[k] - f * amount, -0.12, 0.12);
    }
    this.dirty.h = true;
  }
  rakeStroke(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    if (len < 1e-4) return;
    let nx = -dz / len, nz = dx / len, th = Math.atan2(nz, nx);
    if (th < 0) th += Math.PI;
    const q = Math.round(th / Math.PI * 255), thq = q / 255 * Math.PI;
    nx = Math.cos(thq); nz = Math.sin(thq);
    const r0 = ((-(x0 * nx + z0 * nz) / RAKE_PITCH) % 1 + 1) % 1, rb = Math.round(r0 * 255);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this._each(cx, cz, len / 2 + RAKE_HALF, (i, j, px, pz) => {
      const t = clamp(((px - x0) * dx + (pz - z0) * dz) / (len * len), 0, 1), d = Math.hypot(px - x0 - dx * t, pz - z0 - dz * t);
      if (d > RAKE_HALF) return;
      const f = 1 - smooth(0.28, RAKE_HALF, d), k = (j * this.res + i) * 4;
      if (f * 255 < this.rake[k + 1] * 0.9) return;
      this.rake[k] = rb; this.rake[k + 1] = Math.round(f * 255); this.rake[k + 3] = q;
      this._addLayer(j * this.res + i, 1, f * 0.8);
    });
    this.dirty.r = this.dirty.s = true;
  }
  rakeWear(amount) { // rain softens the ridges
    const r = this.rake;
    for (let k = 1; k < r.length; k += 4) if (r[k] > 0) r[k] = Math.max(0, r[k] - amount);
    this.dirty.r = true;
  }

  // recipe helpers: per-texel functions in world metres
  setSplat(fn) {
    const s = this.splat;
    for (let j = 0; j < this.res; j++) for (let i = 0; i < this.res; i++) {
      const [x, z] = this._splatXZ(i, j), w = fn(x, z), k = (j * this.res + i) * 4;
      let sum = w[0] + w[1] + w[2] + w[3];
      const f = sum > 1 ? 1 / sum : 1;
      for (let c = 0; c < 4; c++) s[k + c] = Math.round(clamp(w[c] * f, 0, 1) * 255);
    }
    this.dirty.s = true;
  }
  setHeight(fn) {
    const { hres, size } = this;
    for (let j = 0; j < hres; j++) for (let i = 0; i < hres; i++) {
      const k = j * hres + i;
      this.height[k] = clamp(fn(((i + 0.5) / hres - 0.5) * size, ((j + 0.5) / hres - 0.5) * size, this.height[k]), -0.12, 0.12);
    }
    this.dirty.h = true;
  }
  setShelter(fn) {
    for (let j = 0; j < this.res; j++) for (let i = 0; i < this.res; i++) {
      const [x, z] = this._splatXZ(i, j);
      this.rake[(j * this.res + i) * 4 + 2] = Math.round(clamp(fn(x, z), 0, 1) * 255);
    }
    this.dirty.r = true;
  }
  blockedAt(x, z) {
    for (const c of this.colliders) {
      if (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r : x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true;
    }
    return false;
  }

  flush() {
    const d = this.dirty;
    if (d.h) {
      const H = THREE.DataUtils.toHalfFloat;
      for (let i = 0; i < this.height.length; i++) this.h16[i] = H(this.height[i]);
      this.heightTex.needsUpdate = true;
    }
    if (d.s) { this.splatTex.needsUpdate = true; this.splatVersion++; }
    if (d.r) this.rakeTex.needsUpdate = true;
    this.dirty = { h: false, s: false, r: false };
  }
}
