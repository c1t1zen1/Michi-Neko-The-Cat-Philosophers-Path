// Litter: what the season drops on the ground. Maple leaves fall from the
// real crown, petals blow in on the wind, needles under the pine. Resting
// pieces slide in gusts until something catches them (grass, a kerb, a rut,
// the foot of the inuyarai), which is how drifts build along edges. Rain
// sticks them down; paws kick them; the broom sweeps them into piles.
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const KINDS = { maple: 0, petal: 1, needle: 2, ginkgo: 3 };
const PAL = {
  maple: [0xc0392b, 0xd85a2a, 0xe9893a, 0xb02a24, 0xf0a640, 0x8e2d20],
  petal: [0xf6d3dc, 0xfbe4ea, 0xf0bfcc, 0xffeef2],
  needle: [0xa47b48, 0x8a6538, 0xc49a5c],
  ginkgo: [0xf2c84b, 0xe9b836, 0xf7d76a],
  green: [0x5a8536, 0x6f9a3a, 0x7aa348]
};

function atlas() {
  const S = 128, c = document.createElement('canvas');
  c.width = S * 2; c.height = S * 2;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.strokeStyle = '#fff';
  // 0 maple: seven lobes
  x.save(); x.translate(S / 2, S / 2 + 6); x.beginPath();
  for (let i = 0; i <= 140; i++) {
    const a = -Math.PI / 2 + (i / 140) * Math.PI * 2;
    const lobes = Math.abs(Math.cos(3.5 * (a + Math.PI / 2)));
    const r = 18 + 38 * Math.pow(lobes, 0.6) * (a > 0.6 && a < 2.55 ? 0.45 : 1);
    i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  x.fill(); x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 54); x.stroke(); x.restore();
  // 1 petal: notched sakura petal
  x.save(); x.translate(S * 1.5, S / 2); x.beginPath();
  x.moveTo(0, 40); x.bezierCurveTo(-34, 18, -30, -30, -8, -40); x.lineTo(0, -30); x.lineTo(8, -40); x.bezierCurveTo(30, -30, 34, 18, 0, 40); x.fill(); x.restore();
  // 2 needles: a pair of pine needles
  x.save(); x.translate(S / 2, S * 1.5); x.lineWidth = 3;
  for (const a of [-0.12, 0.1]) { x.beginPath(); x.moveTo(0, 50); x.lineTo(Math.sin(a) * 100, 50 - Math.cos(a) * 100); x.stroke(); }
  x.restore();
  // 3 ginkgo fan
  x.save(); x.translate(S * 1.5, S * 1.5 + 30); x.beginPath(); x.moveTo(0, 0);
  x.arc(0, 0, 52, -Math.PI * 0.85, -Math.PI * 0.15); x.closePath(); x.fill(); x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 30); x.stroke(); x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Litter {
  constructor(field, { max = 900, heightAt, catches }) {
    this.field = field;
    this.max = max;
    this.heightAt = heightAt;
    this.catches = catches;          // (x, z) -> 0..1, how strongly the ground there holds a leaf
    this.rnd = mulberry32(99);
    this.items = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.aCell = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    geo.setAttribute('aCell', this.aCell);
    const mat = new THREE.MeshStandardMaterial({ map: atlas(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * .5 + vec2(mod(aCell, 2.), floor(aCell / 2.)) * .5;');
    };
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Litter';
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._c = new THREE.Color();
    this.wind = new THREE.Vector2(0.8, 0.3);
    this.gust = 0;
  }
  clear() { this.items.length = 0; }
  add(kind, x, y, z, colour = null) {
    if (this.items.length >= this.max) this.items.shift();
    const r = this.rnd, pal = PAL[colour || kind];
    this.items.push({
      kind: KINDS[kind], x, y, z, vx: 0, vy: 0, vz: 0, rest: false, wet: 0,
      s: kind === 'maple' ? 0.06 + r() * 0.035 : kind === 'petal' ? 0.022 + r() * 0.008 : kind === 'needle' ? 0.07 : 0.05,
      yaw: r() * 6.28, tilt: 0, spin: (r() - 0.5) * 6, flut: r() * 6.28, col: pal[Math.floor(r() * pal.length)]
    });
  }
  /** scatter already-fallen pieces over a region (for presets) */
  scatter(kind, n, fx, colour = null) {
    for (let i = 0; i < n; i++) {
      const [x, z] = fx(this.rnd);
      this.add(kind, x, this.heightAt(x, z) + 0.004, z, colour);
      const it = this.items[this.items.length - 1];
      it.rest = true;
    }
  }
  /** a broom stroke from a to b, half-width h: everything inside is pushed along */
  sweep(ax, az, bx, bz, h = 0.26) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1, tx = dx / len, tz = dz / len;
    for (const it of this.items) {
      const px = it.x - ax, pz = it.z - az, along = px * tx + pz * tz, across = -px * tz + pz * tx;
      if (along > -0.1 && along < len + 0.15 && Math.abs(across) < h) {
        it.rest = false; it.vx = tx * (1.6 + this.rnd() * 0.8); it.vz = tz * (1.6 + this.rnd() * 0.8); it.vy = 0.25 + this.rnd() * 0.3; it.wet *= 0.5;
      }
    }
  }
  /** a paw comes down: kick what is under it */
  kick(x, z, heading, r = 0.12) {
    for (const it of this.items) {
      if (!it.rest || it.wet > 0.6) continue;
      const d = Math.hypot(it.x - x, it.z - z);
      if (d < r) { it.rest = false; it.vx = Math.sin(heading) * 0.7 + (it.x - x) * 3; it.vz = Math.cos(heading) * 0.7 + (it.z - z) * 3; it.vy = 0.5 + this.rnd() * 0.5; }
    }
  }
  update(dt, { wind = 0.6, wet = 0, time = 0 } = {}) {
    // gusts come in fronts every few seconds
    const gustT = Math.max(0, Math.sin(time * 0.45) * Math.sin(time * 0.17 + 1)) ** 2 * wind;
    this.gust += (gustT - this.gust) * Math.min(1, dt * 1.5);
    const wx = this.wind.x * this.gust, wz = this.wind.y * this.gust, f = this.field;
    for (const it of this.items) {
      it.wet = Math.max(it.wet, wet * 0.95);
      it.wet = Math.max(0, it.wet - dt / 120);
      const g = this.heightAt(it.x, it.z);
      if (!it.rest) {
        // falling: drag toward the wind plus a flutter
        it.flut += dt * (3 + it.kind);
        const flut = it.kind === 2 ? 0 : Math.sin(it.flut) * 0.55;
        it.vx += ((wx * 1.4 + Math.cos(it.flut * 0.7) * flut) - it.vx) * Math.min(1, dt * 2.2);
        it.vz += ((wz * 1.4 + Math.sin(it.flut * 0.9) * flut) - it.vz) * Math.min(1, dt * 2.2);
        it.vy += (-(it.kind === 2 ? 1.6 : it.kind === 1 ? 0.45 : 0.75) - it.vy) * Math.min(1, dt * 3);
        it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
        it.yaw += it.spin * dt; it.tilt = Math.sin(it.flut) * 0.9;
        if (it.y <= g + 0.004) { it.y = g + 0.004; it.rest = true; it.vx = it.vz = 0; it.tilt = (this.rnd() - 0.5) * 0.4; }
      } else if (it.wet < 0.5) {
        // resting: a strong gust slides it until something holds it
        const hold = this.catches(it.x, it.z);
        const push = Math.max(0, this.gust - 0.35 - hold * 1.2);
        if (push > 0) {
          it.x += wx * push * dt * 1.4 * (it.kind === 1 ? 1.6 : 1); it.z += wz * push * dt * 1.4 * (it.kind === 1 ? 1.6 : 1);
          it.yaw += (this.rnd() - 0.5) * push * dt * 8;
          it.y = this.heightAt(it.x, it.z) + 0.004;
        }
      }
      // off the stage: recycle at the windward edge (petals keep blowing in)
      if (!f.inside(it.x, it.z, 0.05)) { it.x = Math.min(Math.max(it.x, f.x0 + 0.1), f.x0 + f.w - 0.1); it.z = Math.min(Math.max(it.z, f.z0 + 0.1), f.z0 + f.d - 0.1); it.rest = true; it.y = this.heightAt(it.x, it.z) + 0.004; }
    }
    // write instances
    const n = this.items.length, M = this.mesh;
    for (let i = 0; i < n; i++) {
      const it = this.items[i];
      this._e.set(it.tilt, it.yaw, it.rest ? 0 : it.tilt * 0.6);
      this._q.setFromEuler(this._e);
      this._m.compose(new THREE.Vector3(it.x, it.y, it.z), this._q, new THREE.Vector3(it.s, it.s, it.s));
      M.setMatrixAt(i, this._m);
      this._c.set(it.col).multiplyScalar(1 - it.wet * 0.35);
      M.setColorAt(i, this._c);
      this.aCell.array[i] = it.kind;
    }
    M.count = n;
    M.instanceMatrix.needsUpdate = true;
    if (M.instanceColor) M.instanceColor.needsUpdate = true;
    this.aCell.needsUpdate = true;
  }
}
