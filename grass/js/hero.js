// The hero: a floating 9.6 x 4.8 m slab, 8 x 4 cells of grass, and the real
// game cat walking on it. Patterns decide which grass each cell grows; the
// cat-collision physics (patch.js / kit.js) reacts to its body and paws.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GrassPatch } from './patch.js';
import { TYPES } from './types.js';

export const PATTERNS = [
  { key: 'single', name: 'Single patch', hint: 'one grass, edge to edge', needsB: false },
  { key: 'checker', name: 'Checkerboard', hint: 'two grasses, alternating', needsB: true },
  { key: 'stripes', name: 'Stripes', hint: 'lanes across the slab', needsB: true },
  { key: 'rings', name: 'Concentric rings', hint: 'a bullseye of two', needsB: true },
  { key: 'random', name: 'Random mix', hint: 'a shuffled quilt of all twenty', needsB: false },
  { key: 'families', name: 'Family rows', hint: 'ours · field · cross-bred · strange', needsB: false },
  { key: 'every', name: 'Every grass', hint: 'the full sampler, in order', needsB: false }
];

export const MODES = [
  { key: 'drive', name: 'Walk' }, { key: 'wander', name: 'Wander' },
  { key: 'tour', name: 'Tour' }, { key: 'eight', name: 'Figure-eight' }
];

function mulberry(a) {
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which type index each of the nx*nz cells grows, row-major (z rows). */
export function layoutFor(pattern, a, b, nx, nz, seed = 1) {
  const out = [];
  const n = TYPES.length;
  const rnd = mulberry(seed * 9973 + 17);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      let v = a;
      switch (pattern) {
        case 'checker': v = (ix + iz) % 2 ? b : a; break;
        case 'stripes': v = ix % 2 ? b : a; break;
        case 'rings': {
          const r = Math.floor(Math.max(Math.abs(ix - (nx - 1) / 2), Math.abs(iz - (nz - 1) / 2) * 1.0));
          v = r % 2 ? b : a; break;
        }
        case 'random': v = order[(iz * nx + ix) % n]; break;
        case 'families': v = (Math.min(3, iz) * 5) + (ix % 5); break;
        case 'every': v = (iz * nx + ix) % n; break;
        default: v = a;
      }
      out.push(v);
    }
  }
  return out;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class Hero {
  constructor(lab, el) {
    this.lab = lab;
    this.renderer = lab.renderer;
    this.el = el;
    this.slab = { w: 9.6, d: 4.8, cell: 1.2 };
    this.patch = new GrassPatch(this.renderer, {
      w: this.slab.w, d: this.slab.d, cell: this.slab.cell, thick: 0.85, trail: true,
      texelsPerMeter: 24, bob: 0.02, seed: 7
    });
    this.patch.setSoilTint(0xe6efd8);
    this.patch.U.uPx.value = lab.pixelRatio;
    this.state = { a: 1, b: 5, pattern: 'single', mode: 'drive', view: 'iso', prowl: false, shuffle: 1 };
    this.pending = null;
    this.pendingAt = 0;
    this.cellCount = this.patch.cells.length;

    this.iso = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.eye = new THREE.PerspectiveCamera(60, 2, 0.04, 80);
    this.az = Math.PI * 0.28;
    this.azTarget = this.az;
    this.eyePos = new THREE.Vector3(-3, 0.6, 2);
    this.eyeLook = new THREE.Vector3();
    this.eyeInit = false;

    this.pos = new THREE.Vector2(-3.2, 0.5);
    this.heading = Math.PI * 0.5;
    this.speed = 0;
    this.sprint = false;
    this.turning = false;
    this.target = null;
    this.wp = null;
    this.pause = 0.6;
    this.path = null;
    this.pathIdx = 0;
    this.keys = new Set();
    this.active = false;
    this.cat = null;
    this.catRoot = new THREE.Group();
    this.patch.root.add(this.catRoot);
    this.catRoot.position.set(this.pos.x, 0, this.pos.y);
    this.catRoot.rotation.y = this.heading;
    this.catState = 'loading';
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(UP, -0.05);
    this.rnd = mulberry(4242);
    this._bindInput();
    this.apply();
  }

  /* ---------------- cat ---------------- */

  async loadCat() {
    try {
      const mod = await import('../../src/cat.js?v=20261024c');
      // let the page paint first: sculpting the cat is the one heavy synchronous step
      await new Promise((r) => setTimeout(r, 60));
      const cat = new mod.Cat({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 });
      cat.group.position.y = 0.035;
      this.catRoot.add(cat.group);
      this.cat = cat;
      this.catMod = mod;
      const env = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
      this.patch.scene.environment = env;
      mod.catRimUniforms.uRimStrength.value = 0.3;
      mod.catRimUniforms.uRimColor.value.set(0xffd9a0);
      mod.catRimUniforms.uRimDir.value.copy(this.patch.sun.position).normalize();
      this.catState = 'ready';
      this.lab.onCatReady && this.lab.onCatReady();
    } catch (e) {
      console.error('cat failed to load', e);
      this.catState = 'error';
    }
  }

  /* ---------------- state ---------------- */

  setGrass(i) { this.state.a = i; this.apply(); }
  setSecond(i) { this.state.b = i; this.apply(); }
  setPattern(p) { this.state.pattern = p; this.apply(); }
  shuffle() { this.state.shuffle++; this.apply(); }
  setMode(m) {
    this.state.mode = m;
    this.target = null; this.wp = null; this.path = null; this.pause = 0.4;
    if (m === 'tour') this.path = this._tourPath();
    if (m === 'eight') this.path = this._eightPath();
    if (this.path) {
      // start from the nearest waypoint
      let best = 0, bd = 1e9;
      this.path.forEach((p, i) => { const d = p.distanceToSquared(this.pos); if (d < bd) { bd = d; best = i; } });
      this.pathIdx = best;
    }
  }
  setView(v) { this.state.view = v; this.eyeInit = false; }
  setProwl(on) { this.state.prowl = on; if (this.cat) this.cat.setProwling(on); }
  rotate(dir) { this.azTarget += dir * Math.PI / 2; }

  apply() {
    const s = this.state;
    this.pending = layoutFor(s.pattern, s.a, s.b, this.patch.nx, this.patch.nz, s.shuffle);
    this.pendingAt = 0;
  }

  _tourPath() {
    const pts = [];
    const { w, d, cell } = this.slab;
    const rows = Math.round(d / cell);
    for (let r = 0; r < rows; r++) {
      const z = -d / 2 + cell * (r + 0.5);
      const x0 = -w / 2 + 0.55, x1 = w / 2 - 0.55;
      const ltr = r % 2 === 0;
      pts.push(new THREE.Vector2(ltr ? x0 : x1, z), new THREE.Vector2(ltr ? x1 : x0, z));
    }
    return pts;
  }
  _eightPath() {
    const pts = [];
    const ax = this.slab.w / 2 - 0.9, az = this.slab.d / 2 - 0.75;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const den = 1 + Math.sin(a) * Math.sin(a);
      pts.push(new THREE.Vector2(ax * Math.cos(a) / den * 1.35, az * Math.sin(a) * Math.cos(a) / den * 2.1));
    }
    return pts;
  }

  /* ---------------- input ---------------- */

  _bindInput() {
    const keyMap = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
    addEventListener('keydown', (e) => {
      if (!this.active || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.closest?.('.dd')) return;
      const k = keyMap[e.code];
      if (k) {
        this.keys.add(k); e.preventDefault();
        if (this.state.mode !== 'drive') this.lab.setMode('drive');
        this.target = null;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = true;
      else if (e.code === 'KeyC') this.lab.setProwl(!this.state.prowl);
      else if (e.code === 'KeyV') this.lab.setView(this.state.view === 'iso' ? 'eye' : 'iso');
      else if (e.code === 'KeyQ') this.rotate(-1);
      else if (e.code === 'KeyE') this.rotate(1);
    });
    addEventListener('keyup', (e) => {
      const k = keyMap[e.code];
      if (k) this.keys.delete(k);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = false;
    });
    addEventListener('blur', () => { this.keys.clear(); this.sprint = false; });
    this.el.addEventListener('pointerdown', (e) => {
      const rect = this.el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.ray.setFromCamera({ x: nx, y: ny }, this.state.view === 'iso' ? this.iso : this.eye);
      const hit = this.ray.ray.intersectPlane(this.plane, _v);
      if (!hit) return;
      const hw = this.slab.w / 2 - 0.35, hd = this.slab.d / 2 - 0.35;
      this.target = new THREE.Vector2(THREE.MathUtils.clamp(_v.x, -hw, hw), THREE.MathUtils.clamp(_v.z, -hd, hd));
      if (this.state.mode !== 'drive') this.lab.setMode('drive');
      this.lab.markTarget && this.lab.markTarget(this.target);
    });
  }

  /* ---------------- per frame ---------------- */

  _steer(dt) {
    const s = this.state;
    const prowl = s.prowl ? 0.45 : 1;
    let want = null;      // unit direction on the ground
    let spd = 0;
    let sprint = false;
    const toward = (p, arrive) => {
      const dx = p.x - this.pos.x, dz = p.y - this.pos.y;
      const dist = Math.hypot(dx, dz);
      return dist < arrive ? null : { x: dx / dist, z: dz / dist, dist };
    };

    if (s.mode === 'drive') {
      const kx = (this.keys.has('r') ? 1 : 0) - (this.keys.has('l') ? 1 : 0);
      const kz = (this.keys.has('u') ? 1 : 0) - (this.keys.has('d') ? 1 : 0);
      if (s.view === 'eye') {
        // tank-style in the cat's own view: A/D steer, W/S walk
        this.heading -= kx * 2.4 * dt;
        if (kz > 0) { want = { x: Math.sin(this.heading), z: Math.cos(this.heading), tank: true }; spd = 3.0; sprint = this.sprint; }
        else if (kz < 0) { want = { x: -Math.sin(this.heading), z: -Math.cos(this.heading), back: true, tank: true }; spd = 1.2; }
        if (kx || kz) this.target = null;
      } else if (kx || kz) {
        const phi = this.az;
        const fx = -Math.cos(phi), fz = -Math.sin(phi);   // camera forward on the ground
        const rx = Math.sin(phi), rz = -Math.cos(phi);    // camera right
        let dx = fx * kz + rx * kx, dz = fz * kz + rz * kx;
        const l = Math.hypot(dx, dz) || 1;
        want = { x: dx / l, z: dz / l };
        spd = 3.0; sprint = this.sprint;
      }
      if (!want && this.target) {
        const t = toward(this.target, 0.14);
        if (t) { want = t; spd = t.dist > 1.6 ? 3.4 : Math.max(1.1, t.dist * 2); }
        else this.target = null;
      }
    } else if (s.mode === 'wander') {
      if (this.pause > 0) this.pause -= dt;
      else {
        if (!this.wp) {
          const hw = this.slab.w / 2 - 0.7, hd = this.slab.d / 2 - 0.7;
          this.wp = new THREE.Vector2((this.rnd() * 2 - 1) * hw, (this.rnd() * 2 - 1) * hd);
          const r = this.rnd();
          this.wpSpeed = r < 0.18 ? 6.0 : (r < 0.55 ? 3.1 : 1.6);
        }
        const t = toward(this.wp, 0.25);
        if (t) { want = t; spd = this.wpSpeed; sprint = this.wpSpeed > 5; }
        else { this.wp = null; this.pause = 1.2 + this.rnd() * 3.2; }
      }
    } else if (this.path) {
      const eight = s.mode === 'eight';
      const wp = this.path[this.pathIdx];
      const t = toward(wp, eight ? 0.45 : 0.3);
      if (t) { want = t; spd = eight ? 3.4 : 2.3; }
      else this.pathIdx = (this.pathIdx + 1) % this.path.length;
    }

    // heading + speed (tank-style steering already set the heading itself)
    if (want && !want.tank) {
      const desired = Math.atan2(want.x, want.z);
      let diff = desired - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 9);
      this.turning = Math.abs(diff) > 0.35 && this.speed < 0.6;
      if (Math.abs(diff) > 1.2) spd *= 0.35;           // turn first, then go
    } else this.turning = false;
    const targetSpeed = want ? spd * prowl : 0;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 6);
    if (this.speed < 0.02) this.speed = 0;
    this.sprintNow = sprint && !s.prowl && this.speed > 4.4;
    if (this.speed > 0) {
      const dirx = want && want.back ? -Math.sin(this.heading) : Math.sin(this.heading);
      const dirz = want && want.back ? -Math.cos(this.heading) : Math.cos(this.heading);
      this.pos.x += dirx * this.speed * dt;
      this.pos.y += dirz * this.speed * dt;
    }
    // the invisible edge
    const hw = this.slab.w / 2 - 0.3, hd = this.slab.d / 2 - 0.3;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -hw, hw);
    this.pos.y = THREE.MathUtils.clamp(this.pos.y, -hd, hd);
  }

  _stamps() {
    const p = this.patch;
    p.clearStamps();
    if (!this.cat) return;
    this.catRoot.updateMatrixWorld(true);
    const off = p.root.position;
    this.cat.chest.getWorldPosition(_v); p.setStamp(0, _v.x, _v.z - off.z, 0.34, 0.9);
    this.cat.hips.getWorldPosition(_v); p.setStamp(1, _v.x, _v.z - off.z, 0.30, 0.85);
    for (let i = 0; i < 4; i++) {
      this.cat.legs[i].paw.getWorldPosition(_w);
      const planted = _w.y - off.y < 0.055;
      p.setStamp(2 + i, _w.x, _w.z - off.z, 0.13, planted ? 0.7 : 0.25);
    }
    p.U.uFocus.value.set(this.pos.x, 0.1, this.pos.y);
  }

  _updateCamera(dt, aspect) {
    const s = this.state;
    this.az += (this.azTarget - this.az) * Math.min(1, dt * 5);
    const cam = this.iso;
    const halfH = Math.max(3.5, 6.2 / aspect);
    const halfW = halfH * aspect;
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH;
    cam.updateProjectionMatrix();
    const el = 0.58, dist = 30;
    cam.position.set(Math.cos(this.az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.sin(this.az) * Math.cos(el) * dist);
    cam.lookAt(0, -0.15, 0);
    if (s.view === 'eye') {
      const fwd = _w.set(Math.sin(this.heading), 0, Math.cos(this.heading));
      const want = _v.set(this.pos.x - fwd.x * 1.35, 0.5, this.pos.y - fwd.z * 1.35);
      if (!this.eyeInit) { this.eyePos.copy(want); this.eyeInit = true; }
      this.eyePos.lerp(want, Math.min(1, dt * 4.5));
      // stay over the slab: the camera never leaves the floating patch
      this.eyePos.x = THREE.MathUtils.clamp(this.eyePos.x, -this.slab.w / 2 + 0.12, this.slab.w / 2 - 0.12);
      this.eyePos.z = THREE.MathUtils.clamp(this.eyePos.z, -this.slab.d / 2 + 0.12, this.slab.d / 2 - 0.12);
      this.eye.aspect = aspect;
      this.eye.updateProjectionMatrix();
      this.eye.position.copy(this.eyePos);
      this.eyeLook.set(this.pos.x + fwd.x * 1.2, 0.2, this.pos.y + fwd.z * 1.2);
      this.eye.lookAt(this.eyeLook);
      this.patch.U.uFog.value.x = 0.2;
      this.patch.scene.fog.density = 0.25;
    } else {
      this.patch.U.uFog.value.x = 0;
      this.patch.scene.fog.density = 0;
    }
  }

  /** Called once per rendered frame by the lab with the stage rect. */
  frame(dt, t, rect) {
    this.active = rect.top < innerHeight * 0.62 && rect.bottom > innerHeight * 0.38;
    // plant a few cells per frame so pattern changes ripple across the slab
    if (this.pending) {
      let n = 0;
      while (n < 5 && this.pendingAt < this.pending.length) {
        this.patch.setCell(this.pendingAt, this.pending[this.pendingAt]);
        this.pendingAt++; n++;
      }
      if (this.pendingAt >= this.pending.length) { this.pending = null; this.lab.onPlanted && this.lab.onPlanted(); }
    }
    this._steer(dt);
    this.catRoot.position.set(this.pos.x, 0, this.pos.y);
    this.catRoot.rotation.y = this.heading;
    if (this.cat) {
      this.cat.update(dt, this.speed, true, this.sprintNow, this.turning, false, null);
    }
    this._stamps();
    this.patch.update(dt, t, { hover: 0 });
    this._updateCamera(dt, rect.width / Math.max(1, rect.height));
  }

  get camera() { return this.state.view === 'iso' ? this.iso : this.eye; }
}
