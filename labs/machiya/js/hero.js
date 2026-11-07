// The hero stage: a row of three machiya and the real game cat, which can
// jump, run up the inuyarai, climb the koushi lattice and leap roof to roof.
// Physics copies the game's jump constants (7.2 m/s take-off, -20 m/s² gravity
// -> a 1.3 m apex), so a route that works here works in the valley.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LightRig } from '../../shared/light.js';
import { loadCatModule } from '../../shared/game.js';
import { buildMachiya, Collider } from './machiya.js';

const GRAVITY = -20, JUMP = 7.2, STEP = 0.32, FALL = 0.6;
const CLIMB_SPEED = 2.4, COYOTE = 0.12, BUFFER = 0.12;
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

const BOUNDS = { x0: -11.5, x1: 11.5, z0: -6.2, z1: 7.2 };
const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

// The hero street: the chaya (teahouse) between two lower residences, so the
// cat can jump a roof gap in either direction.
const HOUSES = [
  { x: 0, z: 0, full: true },
  { x: -8.6, z: 0.3, small: true },
  { x: 8.6, z: 0.3, small: true }
];

export class Hero {
  constructor(lab, el) {
    this.lab = lab;
    this.el = el;
    this.scene = new THREE.Scene();
    this.rig = new LightRig(this.scene, { hour: 10.5, shadows: true, shadowSize: 10 });
    this.col = new Collider();
    this.col.flat(BOUNDS.x0, BOUNDS.x1, BOUNDS.z0, BOUNDS.z1, 0);

    // street slab
    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 14),
      new THREE.MeshStandardMaterial({ color: 0xcbb999, roughness: 0.98 })
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, -0.001, 0.5);
    street.receiveShadow = true;
    this.scene.add(street);

    this.buildings = [];
    for (const h of HOUSES) {
      const b = buildMachiya(this.opts(h));
      this.scene.add(b.group);
      this.merge(b.collider);
      this.buildings.push(b);
    }

    // cameras
    this.iso = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.eye = new THREE.PerspectiveCamera(60, 2, 0.04, 80);
    this.az = Math.PI * 0.26;
    this.azTarget = this.az;
    this.eyePos = new THREE.Vector3(-4, 0.6, 3.5);
    this.eyeInit = false;

    // cat state
    this.pos = new THREE.Vector2(-6.5, -4.5);
    this.y = 0;
    this.vy = 0;
    this.prevY = 0;
    this.grounded = true;
    this.climbing = null;
    this.heading = Math.PI * 0.5;
    this.speed = 0;
    this.sprint = false;
    this.turning = false;
    this.prowl = false;
    this.target = null;
    this.keys = new Set();
    this.coyote = 0;
    this.buffer = 0;
    this.jumpHeld = false;
    this.active = false;
    this.cat = null;
    this.catMod = null;
    this.catRoot = new THREE.Group();
    this.scene.add(this.catRoot);
    this.catRoot.position.set(this.pos.x, this.y, this.pos.y);
    this.catRoot.rotation.y = this.heading;
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(UP, 0);
    this.mode = 'drive';
    this.view = 'iso';
    this._bindInput();
  }

  opts(h) {
    if (h.full) {
      return {
        x: h.x, z: h.z,
        w: 7.6, d: 5.4, gh: 2.4,
        upper: { w: 6.8, d: 4.6, h: 1.9 },
        roof: { eaveY: 4.4, ridgeH: 1.5, overhang: 0.7 },
        engawaOpts: { front: true, back: true, h: 0.42, depth: 1.4 },
        battari: true, komayose: true, inuyaraiOpts: { h: 1.4 },
        norenColor: 'norenIndigo', koushiPattern: 'itoya', mushikoMado: true,
        namako: true, shokiFig: true, lantern: true, style: this.lab.style, detail: 'geometry'
      };
    }
    return {
      x: h.x, z: h.z,
      w: 4.4, d: 3.6, gh: 2.1,
      upper: null,
      roof: { eaveY: 2.1, ridgeH: 1.0, overhang: 0.5 },
      engawaOpts: { front: true, back: false, h: 0.42, depth: 1.1 },
      norenColor: 'norenCrimson', koushiPattern: 'komeya', namako: false,
      lantern: true, style: this.lab.style, detail: 'geometry'
    };
  }

  merge(src) {
    for (const s of src.walkers) this.col.walkers.push(s);
    for (const s of src.walls) this.col.walls.push(s);
    for (const s of src.climbs) this.col.climbs.push(s);
  }

  async loadCat() {
    try {
      const mod = await loadCatModule();
      await new Promise((r) => setTimeout(r, 60));
      const cat = new mod.Cat({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 });
      cat.group.position.y = 0.02;
      this.catRoot.add(cat.group);
      this.cat = cat;
      this.catMod = mod;
      const pmrem = new THREE.PMREMGenerator(this.lab.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      mod.catRimUniforms.uRimStrength.value = 0.28;
      mod.catRimUniforms.uRimColor.value.set(0xffd9a0);
      mod.catRimUniforms.uRimDir.value.copy(this.rig.sunDir);
      cat.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.rig.applyEnv();
      this.lab.onCatReady?.();
    } catch (e) {
      console.error('cat failed to load', e);
    }
  }

  setStyle(style) {
    // rebuild the machiya with the new shading model
    for (const b of this.buildings) this.scene.remove(b.group);
    this.buildings = [];
    this.col = new Collider();
    this.col.flat(BOUNDS.x0, BOUNDS.x1, BOUNDS.z0, BOUNDS.z1, 0);
    for (const h of HOUSES) {
      const b = buildMachiya(this.opts(h));
      this.scene.add(b.group);
      this.merge(b.collider);
      this.buildings.push(b);
    }
    this.rig.applyEnv();
  }

  setView(v) { this.view = v; this.eyeInit = false; }
  setProwl(b) { this.prowl = b; if (this.cat) this.cat.setProwling(b); }
  rotate(dir) { this.azTarget += dir * Math.PI / 2; }
  setHour(h) { this.rig.setHour(h); }

  _bindInput() {
    const map = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
    addEventListener('keydown', (e) => {
      if (!this.active || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.closest?.('.dd')) return;
      const k = map[e.code];
      if (k) { this.keys.add(k); e.preventDefault(); this.mode = 'drive'; this.target = null; }
      else if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) this.buffer = BUFFER; this.jumpHeld = true; }
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = true;
      else if (e.code === 'KeyC') this.lab.setProwl(!this.prowl);
      else if (e.code === 'KeyV') this.lab.setView(this.view === 'iso' ? 'eye' : 'iso');
      else if (e.code === 'KeyQ') this.rotate(-1);
      else if (e.code === 'KeyE') this.rotate(1);
    });
    addEventListener('keyup', (e) => {
      const k = map[e.code];
      if (k) this.keys.delete(k);
      if (e.code === 'Space') { this.buffer = 0; this.jumpHeld = false; }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = false;
    });
    addEventListener('blur', () => { this.keys.clear(); this.sprint = false; this.jumpHeld = false; });
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.split, .callouts, .hud, .stepper, .dd, button, a, input, select, textarea')) return;
      const r = this.el.getBoundingClientRect();
      this.ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) }, this.camera);
      this.plane.constant = 0;
      const p = this.ray.ray.intersectPlane(this.plane, _v);
      if (!p) return;
      this.target = new THREE.Vector2(
        THREE.MathUtils.clamp(p.x, BOUNDS.x0 + 0.4, BOUNDS.x1 - 0.4),
        THREE.MathUtils.clamp(p.z, BOUNDS.z0 + 0.4, BOUNDS.z1 - 0.4)
      );
      this.mode = 'drive';
    });
  }

  get camera() { return this.view === 'iso' ? this.iso : this.eye; }

  _steer(dt) {
    if (this.climbing) { this.speed = 0; this.target = null; return; }
    const prowl = this.prowl ? 0.45 : 1;
    let want = null, spd = 0, sprint = false;
    const toward = (p, arrive) => {
      const dx = p.x - this.pos.x, dz = p.y - this.pos.y, dist = Math.hypot(dx, dz);
      return dist < arrive ? null : { x: dx / dist, z: dz / dist, dist };
    };
    if (this.mode === 'drive') {
      const kx = (this.keys.has('r') ? 1 : 0) - (this.keys.has('l') ? 1 : 0);
      const kz = (this.keys.has('u') ? 1 : 0) - (this.keys.has('d') ? 1 : 0);
      if (this.view === 'eye') {
        this.heading -= kx * 2.4 * dt;
        if (kz > 0) { want = { x: Math.sin(this.heading), z: Math.cos(this.heading), tank: true }; spd = 3.0; sprint = this.sprint; }
        else if (kz < 0) { want = { x: -Math.sin(this.heading), z: -Math.cos(this.heading), back: true, tank: true }; spd = 1.2; }
        if (kx || kz) this.target = null;
      } else if (kx || kz) {
        const fx = -Math.cos(this.az), fz = -Math.sin(this.az);
        const rx = Math.sin(this.az), rz = -Math.cos(this.az);
        const dx = fx * kz + rx * kx, dz = fz * kz + rz * kx;
        const l = Math.hypot(dx, dz) || 1;
        want = { x: dx / l, z: dz / l };
        spd = 3.0; sprint = this.sprint;
      }
      if (!want && this.target) {
        const t = toward(this.target, 0.2);
        if (t) { want = t; spd = t.dist > 1.6 ? 3.4 : Math.max(1.1, t.dist * 2); } else this.target = null;
      }
    }
    if (want && !want.tank) {
      const diff = wrap(Math.atan2(want.x, want.z) - this.heading);
      this.heading += diff * Math.min(1, dt * 9);
      this.turning = Math.abs(diff) > 0.35 && this.speed < 0.6;
      if (Math.abs(diff) > 1.2) spd *= 0.35;
    } else this.turning = false;
    this.speed += ((want ? spd * prowl : 0) - this.speed) * Math.min(1, dt * 6);
    if (this.speed < 0.02) this.speed = 0;
    this.sprintNow = sprint && !this.prowl && this.speed > 4.4;

    if (this.speed > 0 && want) {
      const s = want.back ? -1 : 1;
      const step = this.speed * dt * s;
      const dx = Math.sin(this.heading) * step, dz = Math.cos(this.heading) * step;
      this._move(dx, dz);
    }
  }

  _move(dx, dz) {
    const body = this.y + 0.15;
    let nx = this.pos.x + dx, nz = this.pos.y + dz;
    const bx = nx < BOUNDS.x0 || nx > BOUNDS.x1;
    const bz = nz < BOUNDS.z0 || nz > BOUNDS.z1;
    if (this.col.blocked(nx, nz, body) || bx || bz) {
      const okX = !this.col.blocked(nx, this.pos.y, body) && !bx;
      const okZ = !this.col.blocked(this.pos.x, nz, body) && !bz;
      if (okX) this.pos.x = nx;
      if (okZ) this.pos.y = nz;
      if (!okX && !okZ) { this.speed = 0; this.target = null; }
    } else {
      this.pos.x = nx; this.pos.y = nz;
    }
  }

  _vertical(dt) {
    this.prevY = this.y;
    const wantClimb = (this.keys.has('u') || this.buffer > 0);
    const c = this.col.climbAt(this.pos.x, this.pos.y, this.y);

    if (this.climbing) {
      const w = this.climbing;
      if (this.keys.has('u')) this.y += CLIMB_SPEED * dt;
      if (this.keys.has('d')) this.y -= CLIMB_SPEED * dt;
      if (this.keys.has('l')) this.pos.x -= 1.4 * dt;
      if (this.keys.has('r')) this.pos.x += 1.4 * dt;
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, w.x0 + 0.1, w.x1 - 0.1);
      this.y = THREE.MathUtils.clamp(this.y, w.y0, w.y1);
      if (this.y >= w.y1 - 0.02) {
        this.pos.x = w.exitX; this.pos.y = w.exitZ;
        this.y = w.exitY; this.climbing = null; this.grounded = true; this.vy = 0;
        this.cat?.onLand();
      } else if (this.y <= w.y0 + 0.02 && this.keys.has('d')) {
        this.climbing = null; this.grounded = true; this.vy = 0;
      } else if (this.buffer > 0) {
        this.climbing = null; this.grounded = false; this.vy = 3.2; this.buffer = 0;
        this.pos.y += Math.cos(this.heading) * 0.2;
      }
      return;
    }

    if (wantClimb && c) {
      this.climbing = c;
      this.heading = Math.PI; // face the wall (front facades face +Z)
      this.pos.y = THREE.MathUtils.clamp(this.pos.y, c.z0, c.z1);
      this.vy = 0;
      return;
    }

    if (this.grounded) {
      const support = this.col.ceiling(this.pos.x, this.pos.y, this.prevY, 0.05);
      if (support < this.prevY - FALL) {
        this.grounded = false; this.vy = 0; this.y = this.prevY;
      } else {
        this.y = this.col.ceiling(this.pos.x, this.pos.y, this.prevY, STEP);
      }
      if (this.buffer > 0) {
        this.grounded = false; this.vy = JUMP; this.buffer = 0; this.coyote = 0;
        this.cat?.onJump();
      }
    } else {
      this.y += this.vy * dt;
      this.vy += GRAVITY * dt;
      // variable jump: release early and the leap shortens
      if (!this.jumpHeld && this.vy > 2.0) this.vy = 2.0;
      if (this.vy <= 0) {
        const land = this.col.ceiling(this.pos.x, this.pos.y, this.prevY, 0.05);
        if (this.y <= land + 0.03) {
          this.y = land; this.vy = 0; this.grounded = true;
          this.cat?.onLand();
        }
      }
    }
    this.y = Math.max(0, this.y);
  }

  _camera(dt, aspect) {
    this.az += (this.azTarget - this.az) * Math.min(1, dt * 5);
    const halfH = Math.max(7.5, 11 / aspect);
    const halfW = halfH * aspect;
    this.iso.left = -halfW; this.iso.right = halfW; this.iso.top = halfH; this.iso.bottom = -halfH;
    this.iso.updateProjectionMatrix();
    const el = 0.58, dist = 40;
    this.iso.position.set(Math.cos(this.az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.sin(this.az) * Math.cos(el) * dist);
    this.iso.lookAt(0, 0.5, 0.5);

    if (this.view === 'eye') {
      const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
      const want = _v.set(this.pos.x - fx * 1.35, this.y + 0.5, this.pos.y - fz * 1.35);
      if (!this.eyeInit) { this.eyePos.copy(want); this.eyeInit = true; }
      this.eyePos.lerp(want, Math.min(1, dt * 4.5));
      this.eye.aspect = aspect;
      this.eye.updateProjectionMatrix();
      this.eye.position.copy(this.eyePos);
      this.eye.lookAt(this.pos.x + fx * 1.2, this.y + 0.2, this.pos.y + fz * 1.2);
    }
  }

  frame(dt, t, rect) {
    this.active = rect.top < innerHeight * 0.62 && rect.bottom > innerHeight * 0.38;
    if (!this.active) return;
    this.coyote -= dt;
    this.buffer -= dt;
    this._steer(dt);
    this._vertical(dt);
    this.catRoot.position.set(this.pos.x, this.y + 0.02, this.pos.y);
    this.catRoot.rotation.y = this.heading;
    if (this.cat) {
      const climb = !!this.climbing;
      const spd = climb ? CLIMB_SPEED : this.speed;
      this.cat.update(dt, spd, !climb ? this.grounded : true, this.sprintNow, this.turning, false, null);
    }
    this._camera(dt, rect.width / Math.max(1, rect.height));
    this.rig.update();
  }
}