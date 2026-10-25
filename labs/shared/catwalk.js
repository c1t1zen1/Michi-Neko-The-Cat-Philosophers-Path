// The real game cat as a reusable walker (generalised from grass/js/hero.js):
// keyboard / click-to-go / wander / path steering, bounds and blockers, and the
// read-outs (paws, chest, hips, step events) labs use to react to the cat.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadCatModule } from './game.js';
import { flag } from './stage.js';

export const MICHI = { fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 };

const KEYS = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
const UI_SELECTOR = '.split, .callouts, .callout, .hud, .stepper, .dd, button, a, input, select, textarea';
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _h = new THREE.Vector3();
const envs = new WeakMap();
const clamp = THREE.MathUtils.clamp;
const wrapAngle = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

export class CatWalker {
  constructor({ parent, dom, camera, ground = null, heightAt = () => 0, bounds = { x0: -4, x1: 4, z0: -4, z1: 4 }, blocked = null, start = { x: 0, z: 0, heading: 0 }, coat = MICHI }) {
    Object.assign(this, { parent, dom, getCamera: camera, ground, heightAt, bounds, blocked, coat });
    this.pos = new THREE.Vector2(start.x, start.z);
    this.heading = start.heading || 0;
    this.y = heightAt(start.x, start.z);
    this.speed = 0;
    this.moving = false;
    this.ready = false;
    this.active = false;
    this.mode = 'drive';
    this.prowl = false;
    this.cat = null;
    this.target = null;
    this.path = null;
    this.pathLoop = true;
    this.pathIdx = 0;
    this.wp = null;
    this.pause = 0.6;
    this.keys = new Set();
    this.sprint = false;
    this.turning = false;
    this.onStep = null;
    this.clickToGo = true;
    this.chest = new THREE.Vector3();
    this.hips = new THREE.Vector3();
    this.paws = Array.from({ length: 4 }, () => ({ x: 0, y: 0, z: 0, planted: false, down: false }));
    this.eyePos = new THREE.Vector3();
    this.eyeInit = false;
    this.seed = 4242;
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(UP, 0);

    this.root = new THREE.Group();
    this.root.position.set(this.pos.x, this.y + 0.02, this.pos.y);
    this.root.rotation.y = this.heading;
    this.standIn = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.38, 4, 10), new THREE.MeshStandardMaterial({ color: coat.fur, roughness: 0.9 }));
    this.standIn.rotation.x = Math.PI / 2;
    this.standIn.position.y = 0.16;
    this.standIn.castShadow = true;
    this.standIn.visible = flag('cat') !== '0';
    this.root.add(this.standIn);
    parent.add(this.root);
    this._bindInput();
  }

  async load({ scene, renderer, sunDir, rig } = {}) {
    if (flag('cat') === '0') return this;
    try {
      const mod = await loadCatModule();
      await new Promise((r) => setTimeout(r, 60));
      const cat = new mod.Cat(this.coat);
      this.root.add(cat.group);
      this.root.remove(this.standIn);
      this.cat = cat;
      if (scene && renderer && !scene.environment) {
        if (!envs.has(renderer)) envs.set(renderer, new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture);
        scene.environment = envs.get(renderer);
      }
      mod.catRimUniforms.uRimStrength.value = 0.3;
      mod.catRimUniforms.uRimColor.value.set(0xffd9a0);
      if (sunDir) mod.catRimUniforms.uRimDir.value.copy(sunDir);
      if (this.prowl) cat.setProwling(true);
      rig?.applyEnv();
      this.ready = true;
    } catch (e) {
      console.error('cat failed to load', e);
    }
    return this;
  }

  /* ---------------- state ---------------- */

  setMode(m) {
    this.mode = m;
    this.target = null; this.wp = null; this.pause = 0.4;
    if (m === 'path') this._nearestPathIdx();
  }
  setPath(points, loop = true) { this.path = points; this.pathLoop = loop; this.setMode('path'); }
  goTo(x, z) {
    this.target = new THREE.Vector2(clamp(x, this.bounds.x0, this.bounds.x1), clamp(z, this.bounds.z0, this.bounds.z1));
    this.mode = 'drive';
  }
  setProwl(b) { this.prowl = b; if (this.cat) this.cat.setProwling(b); }
  stop() { this.target = null; this.wp = null; this.keys.clear(); this.mode = 'drive'; }
  _nearestPathIdx() {
    let best = 0, bd = 1e9;
    (this.path || []).forEach((p, i) => { const d = p.distanceToSquared(this.pos); if (d < bd) { bd = d; best = i; } });
    this.pathIdx = best;
  }
  _rnd() { // mulberry32
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* ---------------- input ---------------- */

  _bindInput() {
    addEventListener('keydown', (e) => {
      if (!this.active || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.closest?.('.dd')) return;
      const k = KEYS[e.code];
      if (k) { this.keys.add(k); e.preventDefault(); this.mode = 'drive'; this.target = null; }
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = true;
      else if (e.code === 'KeyC') this.setProwl(!this.prowl);
    });
    addEventListener('keyup', (e) => {
      const k = KEYS[e.code];
      if (k) this.keys.delete(k);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = false;
    });
    addEventListener('blur', () => { this.keys.clear(); this.sprint = false; });
    let down = null;
    this.dom.addEventListener('pointerdown', (e) => {
      down = e.target.closest(UI_SELECTOR) ? null : { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    this.dom.addEventListener('pointerup', (e) => {
      if (!down) return;
      const d = down;
      down = null;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && performance.now() - d.t < 600) this._click(e);
    });
  }

  _click(e) {
    if (!this.clickToGo) return;
    const cam = this.getCamera();
    const rect = this.dom.getBoundingClientRect();
    this.ray.setFromCamera({ x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -(((e.clientY - rect.top) / rect.height) * 2 - 1) }, cam);
    let p = null;
    if (this.ground) {
      const hit = this.ray.intersectObjects([].concat(this.ground), true)[0];
      if (hit) p = hit.point;
    } else {
      this.parent.getWorldPosition(_w);
      this.plane.constant = -_w.y;
      p = this.ray.ray.intersectPlane(this.plane, _v);
    }
    if (!p) return;
    this.parent.worldToLocal(_h.copy(p));
    this.goTo(_h.x, _h.z);
  }

  /* ---------------- per frame ---------------- */

  _steer(dt, camera, tank) {
    const prowl = this.prowl ? 0.45 : 1;
    let want = null, spd = 0, sprint = false;
    const toward = (p, arrive) => {
      const dx = p.x - this.pos.x, dz = p.y - this.pos.y, dist = Math.hypot(dx, dz);
      return dist < arrive ? null : { x: dx / dist, z: dz / dist, dist };
    };
    if (this.mode === 'drive') {
      const kx = (this.keys.has('r') ? 1 : 0) - (this.keys.has('l') ? 1 : 0);
      const kz = (this.keys.has('u') ? 1 : 0) - (this.keys.has('d') ? 1 : 0);
      if (tank) {
        this.heading -= kx * 2.4 * dt;
        if (kz > 0) { want = { x: Math.sin(this.heading), z: Math.cos(this.heading), tank: true }; spd = 3.0; sprint = this.sprint; }
        else if (kz < 0) { want = { x: -Math.sin(this.heading), z: -Math.cos(this.heading), back: true, tank: true }; spd = 1.2; }
        if (kx || kz) this.target = null;
      } else if (kx || kz) {
        const cam = camera || this.getCamera();
        cam.getWorldDirection(_v);
        let fx = _v.x, fz = _v.z;
        if (Math.hypot(fx, fz) < 0.2) { _w.set(0, 1, 0).transformDirection(cam.matrixWorld); fx = _w.x; fz = _w.z; }
        const fl = Math.hypot(fx, fz) || 1;
        fx /= fl; fz /= fl;
        const dx = fx * kz + -fz * kx, dz = fz * kz + fx * kx, l = Math.hypot(dx, dz) || 1;
        want = { x: dx / l, z: dz / l };
        spd = 3.0; sprint = this.sprint;
      }
      if (!want && this.target) {
        const t = toward(this.target, 0.14);
        if (t) { want = t; spd = t.dist > 1.6 ? 3.4 : Math.max(1.1, t.dist * 2); } else this.target = null;
      }
    } else if (this.mode === 'wander') {
      if (this.pause > 0) this.pause -= dt;
      else {
        const b = this.bounds, m = 0.4;
        if (!this.wp) {
          this.wp = new THREE.Vector2(b.x0 + m + this._rnd() * (b.x1 - b.x0 - 2 * m), b.z0 + m + this._rnd() * (b.z1 - b.z0 - 2 * m));
          const r = this._rnd();
          this.wpSpeed = r < 0.18 ? 6.0 : r < 0.55 ? 3.1 : 1.6;
        }
        const t = toward(this.wp, 0.25);
        if (t) { want = t; spd = this.wpSpeed; sprint = this.wpSpeed > 5; } else { this.wp = null; this.pause = 1.2 + this._rnd() * 3.2; }
      }
    } else if (this.mode === 'path' && this.path && this.path.length) {
      const t = toward(this.path[this.pathIdx], 0.3);
      if (t) { want = t; spd = 2.6; }
      else if (this.pathIdx < this.path.length - 1) this.pathIdx++;
      else if (this.pathLoop) this.pathIdx = 0;
    }

    if (want && !want.tank) {
      const diff = wrapAngle(Math.atan2(want.x, want.z) - this.heading);
      this.heading += diff * Math.min(1, dt * 9);
      this.turning = Math.abs(diff) > 0.35 && this.speed < 0.6;
      if (Math.abs(diff) > 1.2) spd *= 0.35;
    } else this.turning = false;
    this.speed += ((want ? spd * prowl : 0) - this.speed) * Math.min(1, dt * 6);
    if (this.speed < 0.02) this.speed = 0;
    this.sprintNow = sprint && !this.prowl && this.speed > 4.4;
    this.moving = this.speed > 0.05;
    if (this.speed > 0) {
      const s = want && want.back ? -1 : 1;
      const step = this.speed * dt * s, dx = Math.sin(this.heading) * step, dz = Math.cos(this.heading) * step;
      const b = this.bounds;
      const nx = clamp(this.pos.x + dx, b.x0, b.x1), nz = clamp(this.pos.y + dz, b.z0, b.z1);
      if (!this.blocked || !this.blocked(nx, nz)) { this.pos.set(nx, nz); }
      else if (!this.blocked(nx, this.pos.y)) this.pos.x = nx;
      else if (!this.blocked(this.pos.x, nz)) this.pos.y = nz;
      else { this.speed = 0; this.target = null; this.wp = null; }
    }
  }

  update(dt, { camera = null, tank = false } = {}) {
    this._steer(dt, camera, tank);
    this.y = this.heightAt(this.pos.x, this.pos.y);
    this.root.position.set(this.pos.x, this.y + 0.02, this.pos.y);
    this.root.rotation.y = this.heading;
    const cat = this.cat;
    if (cat) cat.update(dt, this.speed, true, this.sprintNow, this.turning, false, null);
    this.parent.updateWorldMatrix(true, false);
    this.root.updateMatrixWorld(true);
    const P = this.parent;
    if (cat) {
      P.worldToLocal(cat.chest.getWorldPosition(this.chest));
      P.worldToLocal(cat.hips.getWorldPosition(this.hips));
      for (let i = 0; i < 4; i++) {
        const p = this.paws[i];
        P.worldToLocal(cat.legs[i].paw.getWorldPosition(_v));
        const planted = Math.abs(_v.y - this.heightAt(_v.x, _v.z)) < 0.055;
        p.down = planted && !p.planted;
        p.planted = planted;
        p.x = _v.x; p.y = _v.y; p.z = _v.z;
        if (p.down && this.onStep) this.onStep(i, p.x, p.z, this.heading);
      }
    }
  }

  eyeCamera(camera, dt, { back = 1.35, height = 0.5, ahead = 1.2 } = {}) {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    _v.set(this.pos.x - fx * back, this.y + height, this.pos.y - fz * back);
    if (!this.eyeInit) { this.eyePos.copy(_v); this.eyeInit = true; }
    this.eyePos.lerp(_v, Math.min(1, dt * 4.5));
    const b = this.bounds;
    this.eyePos.x = clamp(this.eyePos.x, b.x0 + 0.12, b.x1 - 0.12);
    this.eyePos.z = clamp(this.eyePos.z, b.z0 + 0.12, b.z1 - 0.12);
    camera.position.copy(this.eyePos);
    camera.lookAt(this.pos.x + fx * ahead, this.y + 0.2, this.pos.y + fz * ahead);
  }
}
