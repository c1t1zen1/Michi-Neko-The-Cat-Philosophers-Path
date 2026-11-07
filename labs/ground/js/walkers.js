// Kemonomichi (獣道): the village cats wear their own paths. Each walker heads
// for a favourite place, but leans toward ground that is already trodden,
// after the active-walker model of Helbing, Schweitzer, Keltsch & Molnár (1997):
//
//   e = ∇[U + V_tr] / |∇[U + V_tr]|,  U = −|d − r| (the way there),
//   V_tr = ∫ exp(−|r − r'| / σ) G(r') d²r' (how trodden the ground nearby looks)
//
// Here V_tr is G blurred on a coarse grid (σ ≈ 0.9 m), weighted by "trail
// attraction". Cats also refuse puddles and a sekimori-ishi (so the trail
// bends round both), and they pause where they arrive.
import * as THREE from 'three';
import { boxBlur } from './field.js';
import { clamp, mulberry32 } from './util.js';

export const VILLAGE = [
  { name: 'Luna', coat: { fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, eyeColor: 0xdec056, ribbonColor: 0x2b3d63, stripeAmount: 0.3 } },
  { name: 'Mochi', coat: { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, stripeAmount: 1.0 } },
  { name: 'Kuro', coat: { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, eyeColor: 0xd8b04a, stripeAmount: 0 } }
];

export class Kemonomichi {
  constructor(field, { pois, blocked, puddle = () => 0, barrier = () => null, seed = 7 }) {
    Object.assign(this, { field, pois, blocked, puddle, barrier });
    this.rnd = mulberry32(seed);
    this.k = 4;                                  // potential grid, texels per metre
    this.cx = Math.round(field.w * this.k); this.cz = Math.round(field.d * this.k);
    this.V = new Float32Array(this.cx * this.cz);
    this.attract = 1.6;
    this.cap = 0.8;
    this.clock = 0;
    this.ghosts = [];
    this.days = 0;
  }

  /** V_tr: the wear averaged down to 25 cm cells, then blurred twice (≈ an exp kernel) */
  refresh() {
    const f = this.field, s = f.k / this.k, cx = this.cx, cz = this.cz, coarse = new Float32Array(cx * cz);
    for (let j = 0; j < cz; j++) for (let i = 0; i < cx; i++) {
      let sum = 0, n = 0;
      for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) {
        const ix = i * s + a, iz = j * s + b;
        if (ix < f.nx && iz < f.nz) { sum += f.wear[iz * f.nx + ix]; n++; }
      }
      coarse[j * cx + i] = sum / Math.max(1, n);
    }
    this.V = boxBlur(boxBlur(coarse, cx, cz, 2), cx, cz, 2);
  }
  grad(x, z) {
    const f = this.field, k = this.k, cx = this.cx, cz = this.cz;
    const i = clamp(Math.round((x - f.x0) * k - 0.5), 1, cx - 2), j = clamp(Math.round((z - f.z0) * k - 0.5), 1, cz - 2);
    const V = this.V;
    return [(V[j * cx + i + 1] - V[j * cx + i - 1]) * k * 0.5, (V[(j + 1) * cx + i] - V[(j - 1) * cx + i]) * k * 0.5];
  }

  pick(from) {
    const tot = this.pois.reduce((s, p) => s + (p === from ? 0 : p.w), 0);
    let r = this.rnd() * tot;
    for (const p of this.pois) { if (p === from) continue; r -= p.w; if (r <= 0) return p; }
    return this.pois[0];
  }

  /**
   * One steering decision: the unit direction for a walker at (x, z) heading
   * for `to`. Probes seven headings 40 cm ahead and scores them by the way
   * there, the trail, and what is in the way.
   */
  steer(x, z, to, prev) {
    let dx = to.x - x, dz = to.z - z;
    const dist = Math.hypot(dx, dz) || 1;
    dx /= dist; dz /= dist;
    // the trail's pull, capped below the way there so a walker is drawn onto
    // a trail but never held on one that leads elsewhere
    let [gx, gz] = this.grad(x, z);
    gx *= this.attract; gz *= this.attract;
    const gl = Math.hypot(gx, gz);
    if (gl > this.cap) { gx *= this.cap / gl; gz *= this.cap / gl; }
    let ex = dx + gx, ez = dz + gz;
    const b = this.barrier();
    if (b) {
      const bx = x - b.x, bz = z - b.z, bd = Math.hypot(bx, bz);
      if (bd < 1.3) { const push = (1.3 - bd) * 3.2 / Math.max(bd, 0.1); ex += bx * push; ez += bz * push; }
    }
    const el = Math.hypot(ex, ez) || 1;
    ex /= el; ez /= el;
    const base = Math.atan2(ez, ex);
    let best = null, bestS = -1e9;
    for (const da of [0, -0.35, 0.35, -0.75, 0.75, -1.2, 1.2]) {
      const a = base + da, px = x + Math.cos(a) * 0.4, pz = z + Math.sin(a) * 0.4;
      let s = Math.cos(da) - (this.blocked(px, pz) ? 5 : 0) - this.puddle(px, pz) * 1.4;
      if (prev) s += 0.25 * (Math.cos(a) * prev[0] + Math.sin(a) * prev[1]);
      if (s > bestS) { bestS = s; best = [Math.cos(a), Math.sin(a)]; }
    }
    return best;
  }

  /* ---------------- fast-forward: a season of ghost walkers ---------------- */

  spawnGhosts(n) {
    this.ghosts = [];
    for (let i = 0; i < n; i++) {
      const from = this.pois[Math.floor(this.rnd() * this.pois.length)];
      const to = this.pick(from);
      this.ghosts.push({ x: from.x + (this.rnd() - 0.5) * 0.6, z: from.z + (this.rnd() - 0.5) * 0.6, to, dir: null, acc: 0, wait: this.rnd() * 2, lat: (this.rnd() - 0.5) * 0.22 });
    }
  }
  /** advance every ghost; returns footfalls [[x, z], ...] made this tick */
  stepGhosts(dt, speed = 1.3) {
    const falls = [];
    for (const g of this.ghosts) {
      if (g.wait > 0) { g.wait -= dt; continue; }
      g.dir = this.steer(g.x, g.z, g.to, g.dir);
      const step = speed * dt;
      g.x += g.dir[0] * step; g.z += g.dir[1] * step;
      g.acc += step;
      while (g.acc > 0.13) { g.acc -= 0.13; falls.push([g.x - g.dir[1] * g.lat, g.z + g.dir[0] * g.lat]); }
      if (Math.hypot(g.to.x - g.x, g.to.z - g.z) < 0.35) {
        const from = g.to;
        g.to = this.pick(from);
        g.wait = 0.3 + this.rnd() * 1.2;
        g.lat = (this.rnd() - 0.5) * 0.22;
      }
    }
    return falls;
  }
}

/** Village cats: real game cats (CatWalker) steered by Kemonomichi. */
export class VillageCats {
  constructor({ CatWalker, scene, stage, heightAt, bounds, blocked, sim, onStep }) {
    this.sim = sim;
    this.cats = VILLAGE.map((v, i) => {
      const poi = sim.pois[(i * 3) % sim.pois.length];
      const w = new CatWalker({ parent: scene, dom: document.createElement('div'), camera: () => null, heightAt, bounds, blocked, start: { x: poi.x, z: poi.z, heading: i * 2 }, coat: v.coat });
      w.clickToGo = false;
      w.name = v.name;
      w.to = sim.pick(poi);
      w.wait = 1 + i * 2.5;
      w.dir = null;
      w.onStep = (paw, x, z, h) => onStep(w, paw, x, z, h);
      return w;
    });
    this.enabled = false;
    this.root = new THREE.Group();
  }
  async load(opts) { for (const c of this.cats) await c.load(opts); }
  setVisible(b) { for (const c of this.cats) c.root.visible = b; }
  update(dt, think = true) {
    for (const c of this.cats) {
      if (!this.enabled) { c.stop(); c.update(dt); continue; }
      if (c.wait > 0) { c.wait -= dt; c.target = null; }
      else if (think) {
        c.dir = this.sim.steer(c.pos.x, c.pos.y, c.to, c.dir);
        c.target = new THREE.Vector2(c.pos.x + c.dir[0] * 0.55, c.pos.y + c.dir[1] * 0.55);
        if (Math.hypot(c.to.x - c.pos.x, c.to.z - c.pos.y) < 0.4) {
          const from = c.to;
          c.to = this.sim.pick(from);
          c.wait = 2 + Math.random() * 5;
          c.target = null;
        }
      }
      c.update(dt);
    }
  }
  positions() { return this.cats.filter((c) => c.root.visible).map((c) => new THREE.Vector3(c.pos.x, c.y, c.pos.y)); }
}
