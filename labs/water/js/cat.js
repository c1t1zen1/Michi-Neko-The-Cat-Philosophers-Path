// Michi at the river: the real game cat (src/cat.js) through the kit's
// CatWalker, plus what water asks of a cat. It wades, swims (head up, legs
// paddling, carried by the current), climbs out onto stones and banks,
// shakes itself dry at about 9 Hz, darkens when wet and dries over half a
// minute, leaves wet paw prints, and on request jumps off the bridge.
import * as THREE from 'three';
import { CatWalker } from '../../shared/catwalk.js';
import { PHYS, supportAt, blockedAt, topAt } from './physics.js';

const _v = new THREE.Vector3();
const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

/** Wet paw prints: dark ovals that dry from the edges in (they shrink). */
class Prints {
  constructor(n = 90) {
    const g = new THREE.CircleGeometry(0.03, 12);
    g.rotateX(-Math.PI / 2);
    g.scale(0.85, 1, 1.15);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x1a140c, transparent: true, opacity: 0.32, depthWrite: false }), n);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.items = [];
    this.n = n;
    this.d = new THREE.Object3D();
  }
  stamp(x, y, z, heading, wet) {
    if (this.items.length >= this.n) this.items.shift();
    this.items.push({ x, y: y + 0.004, z, h: heading, life: 6 + wet * 8, max: 6 + wet * 8 });
  }
  update(dt) {
    let k = 0;
    for (let i = this.items.length - 1; i >= 0; i--) { const p = this.items[i]; p.life -= dt; if (p.life <= 0) this.items.splice(i, 1); }
    for (const p of this.items) {
      this.d.position.set(p.x, p.y, p.z);
      this.d.rotation.set(0, p.h, 0);
      this.d.scale.setScalar(Math.sqrt(p.life / p.max));
      this.d.updateMatrix();
      this.mesh.setMatrixAt(k++, this.d.matrix);
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { this.items.length = 0; this.mesh.count = 0; }
}

export class RiverCat extends CatWalker {
  /** world: { groundAt, solids, bounds, levelAt(x, z), field, route(from, to) }, fx: { ripples, drops, sound, say } */
  constructor({ world, fx, dom, camera, start }) {
    const parent = new THREE.Group();
    super({ parent, dom, camera, heightAt: (x, z) => world.groundAt(x, z), bounds: world.bounds, start });
    this.world = world;
    this.fx = fx;
    this.root.rotation.order = 'YXZ';
    this.y = supportAt(world, start.x, start.z, start.heading, 5);
    this.vy = 0;
    this.state = 'ground';          // ground | air | swim
    this.medium = 'dry';            // dry | wade | swim
    this.wet = 0;
    this.shake = 0;
    this.calm = 0;
    this.script = null;
    this.route = [];
    this.carrier = null;
    this.prints = new Prints();
    this.rippleClock = 0;
    this.dripClock = 0;
    this.air = { vx: 0, vz: 0, scripted: false };
    this.blocked = (x, z) => blockedAt(world, x, z, this.y);
    this.onStep = (i, x, z, heading) => this._step(i, x, z, heading);
    this.dry = null;
    addEventListener('keydown', (e) => {
      if (!this.active || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, .dd')) return;
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) this.jump(); }
    });
  }

  async load(opts) {
    await super.load(opts);
    if (this.cat) {
      const P = this.cat.palette;
      this.dry = { fur: P.fur.clone(), belly: P.belly.clone(), stripe: P.stripe.clone() };
      this.cat.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    }
    return this;
  }

  /* ---------------- control ---------------- */

  say(m) { this.fx.say && this.fx.say(m); }
  cancel() { this.script = null; this.route = []; this.target = null; this.keys.clear(); this.mode = 'drive'; this.cat?.endIdleAction?.(); }
  jump() {
    if (this.script) this.script = null;
    if (this.state === 'swim') { this.say('Cats can’t jump out of deep water. Paddle to a stone or the bank.'); return; }
    if (this.state !== 'ground') return;
    this.vy = PHYS.jump;
    this.state = 'air';
    this.air.scripted = false;
    this.cat?.onJump();
    this.fx.sound?.hop?.();
  }
  goTo(x, z) {
    const r = this.world.route ? this.world.route({ x: this.pos.x, z: this.pos.y }, { x, z }) : [{ x, z }];
    this.route = r;
    this.target = null;
    this.mode = 'drive';
    if (this.script && !this.script.keepRoute) this.script = null;
  }
  _click(e) {
    if (!this.clickToGo) return;
    const cam = this.getCamera(), rect = this.dom.getBoundingClientRect();
    this.ray.setFromCamera({ x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -(((e.clientY - rect.top) / rect.height) * 2 - 1) }, cam);
    const hit = this.ray.intersectObjects(this.world.pickables(), true)[0];
    if (!hit) return;
    this.cancel();
    this.goTo(hit.point.x, hit.point.z);
  }

  /** The leap: onto the rail, a look down, then out over the water. */
  leap() {
    const L = this.world.leap();
    if (!L) { this.say('Nothing to leap from here.'); return; }
    if (this.state === 'swim') { this.say('Michi is already in the water.'); return; }
    this.cancel();
    this.script = { phase: 'walk', t: 0, L, keepRoute: true };
    this.goTo(L.stand.x, L.stand.z);
    this.script.keepRoute = true;
    this.say('Michi heads for the bridge…');
  }

  _ballistic(tx, ty, tz, extra = 0.25) {
    const g = PHYS.gravity;
    const up = Math.max(0.3, ty - this.y + extra);
    const vy = Math.sqrt(2 * g * up);
    const tUp = vy / g, peak = this.y + up;
    const tDown = Math.sqrt(Math.max(0.01, 2 * (peak - ty) / (g * PHYS.fallMul)));
    const T = tUp + tDown;
    this.vy = vy;
    this.air.vx = (tx - this.pos.x) / T;
    this.air.vz = (tz - this.pos.y) / T;
    this.air.scripted = true;
    this.state = 'air';
    this.heading = Math.atan2(this.air.vx, this.air.vz);
    this.cat?.onJump();
  }

  _runScript(dt) {
    const S = this.script;
    S.t += dt;
    const L = S.L;
    if (S.phase === 'walk') {
      if (!this.route.length && this.state === 'ground') {
        if (Math.hypot(this.pos.x - L.stand.x, this.pos.y - L.stand.z) > 0.9) { this.say('Michi can’t find a way up there. Try walking closer first.'); this.script = null; return; }
        S.phase = 'face'; S.t = 0;
      } else if (S.t > 30) { this.script = null; return; }
    } else if (S.phase === 'face') {
      const want = L.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.heading += wrap(want - this.heading) * Math.min(1, dt * 7);
      if (S.t > 0.45) {
        if (L.rail) { this._ballistic(L.rail.x, L.rail.y, this.pos.y, 0.2); S.phase = 'hop'; this.say('Up onto the rail…'); }
        else { S.phase = 'jump'; }
        S.t = 0;
      }
    } else if (S.phase === 'hop') {
      // settle onto the rail line on the way down
      if (this.state === 'air' && this.vy < 0) this.pos.x += (L.rail.x - this.pos.x) * Math.min(1, dt * 12);
      if (this.state === 'ground') {
        S.phase = 'perch'; S.t = 0;
        this.pos.x = L.rail.x;
        this.cat?.startIdleAction('sit', 1.7);
        _v.set(this.pos.x + L.dir * 1.6, this.world.levelAt(this.pos.x + L.dir * 1.6, this.pos.y), this.pos.y);
        this.cat?.setLookTarget?.(_v);
        this.say('A long look down at the water…');
      } else if (S.t > 2.5) { this.script = null; }
    } else if (S.phase === 'perch') {
      this.speed = 0;
      if (S.t > 1.6) { this.cat?.endIdleAction(); this.cat?.setLookTarget?.(null); S.phase = 'jump'; S.t = 0; }
    } else if (S.phase === 'jump') {
      const out = L.dir * (L.rail ? 1.9 : 1.4);
      const tx = this.pos.x + out, tz = this.pos.y + 0.15;
      this._ballistic(tx, this.world.levelAt(tx, tz) - 0.1, tz, L.rail ? 0.55 : 0.35);
      S.phase = 'fly'; S.t = 0;
      this.say('…and in!');
    } else if (S.phase === 'fly') {
      if (this.state !== 'air') { this.script = null; }
    }
  }

  /* ---------------- per frame ---------------- */

  _depthAt(x, z, support) { return this.world.levelAt(x, z) - support; }

  update(dt, { camera = null, tank = false } = {}) {
    const W = this.world;
    if (this.script) this._runScript(dt);
    if (this.keys.size && this.script) { this.script = null; this.route = []; }
    if (this.keys.size) this.route = [];
    // follow the route
    if (this.route.length && this.state !== 'air') {
      const p = this.route[0];
      this.target = new THREE.Vector2(p.x, p.z);
      if (Math.hypot(this.pos.x - p.x, this.pos.y - p.z) < 0.22) { this.route.shift(); if (!this.route.length) this.target = null; }
    }
    // riding a floating deck section
    if (this.carrier && this.state === 'ground') {
      const s = this.carrier, c = Math.cos(s.ang), n = Math.sin(s.ang);
      this.pos.x = s.cx + this.carrierLocal[0] * c + this.carrierLocal[1] * n;
      this.pos.y = s.cz - this.carrierLocal[0] * n + this.carrierLocal[1] * c;
      this.heading += s.ang - this.carrierAng;
    }
    const x0 = this.pos.x, z0 = this.pos.y;
    const scripted = this.script && ['face', 'perch', 'jump', 'fly', 'hop'].includes(this.script.phase);
    if (this.state === 'air' && this.air.scripted) {
      const nx = this.pos.x + this.air.vx * dt, nz = this.pos.y + this.air.vz * dt;
      if (!blockedAt(W, nx, nz, this.y)) this.pos.set(nx, nz);
      this.speed = 0;
    } else if (!scripted && this.shake <= 0) {
      this._steer(dt, camera, tank);
    } else this.speed = 0;
    // water slows the paws; the current carries a swimmer
    const mul = this.medium === 'swim' ? PHYS.swimMul : this.medium === 'wade' ? PHYS.wadeMul : 1;
    if (mul < 1 && this.state !== 'air') {
      this.pos.x = x0 + (this.pos.x - x0) * mul;
      this.pos.y = z0 + (this.pos.y - z0) * mul;
    }
    const level = W.levelAt(this.pos.x, this.pos.y);
    if (this.medium !== 'dry' && this.state !== 'air') {
      const f = W.field.flowAt(this.pos.x, this.pos.y, level, { x: 0, z: 0 });
      const edge = THREE.MathUtils.smoothstep(W.bounds.x1 - this.pos.x, 0, 2.5);
      const k = (this.medium === 'swim' ? PHYS.drift : 0.22) * edge;
      const nx = this.pos.x + f.x * k * dt, nz = this.pos.y + f.z * k * dt;
      if (!blockedAt(W, nx, nz, this.y)) this.pos.set(nx, nz);
    }
    const b = W.bounds;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, b.x0, b.x1);
    this.pos.y = THREE.MathUtils.clamp(this.pos.y, b.z0, b.z1);

    // auto-hop: walking or paddling into a stone or a bank lip a little higher than a step
    const tried = Math.hypot(this.pos.x - x0, this.pos.y - z0) < 0.004 && (this.target || this.keys.size);
    if (tried && this.state !== 'air' && !scripted) {
      const ax = this.pos.x + Math.sin(this.heading) * 0.34, az = this.pos.y + Math.cos(this.heading) * 0.34;
      const top = topAt(W, ax, az, this.y + 0.75);
      if (top > this.y + PHYS.step - 0.02 && top < this.y + 0.75) {
        this._ballistic(ax, top, az, 0.12);
        this.air.scripted = true;
        this.air.vx *= 1.05; this.air.vz *= 1.05;
      }
    }

    // vertical
    const sup = supportAt(W, this.pos.x, this.pos.y, this.heading, this.y);
    const depth = level - sup;
    const prevY = this.y;
    if (this.state === 'ground') {
      if (sup < this.y - 0.06) { this.state = 'air'; this.vy = 0; this.air.scripted = false; }
      else if (depth > PHYS.wade) { this.state = 'swim'; this.vy = -0.2; }
      else this.y += (sup - this.y) * Math.min(1, dt * 18);
    }
    if (this.state === 'air') {
      this.vy -= PHYS.gravity * (this.vy < 0 ? PHYS.fallMul : 1) * dt;
      this.y += this.vy * dt;
      const sNow = supportAt(W, this.pos.x, this.pos.y, this.heading, prevY);
      const dNow = level - sNow;
      if (this.vy <= 0 && dNow > 0.12 && this.y < level && prevY >= level - 0.02) {
        // into the water
        const impact = Math.min(2, Math.abs(this.vy) / 5);
        this.fx.splash(this.pos.x, level, this.pos.y, impact);
        this.state = dNow > PHYS.wade ? 'swim' : 'ground';
        this.vy *= 0.25;
        this.wet = 1;
        this.cat?.onLand();
        if (this.state === 'swim') this.say(impact > 1.1 ? 'Splash! Michi bobs up and paddles.' : 'Into the water. Michi paddles.');
      } else if (this.vy <= 0 && this.y <= sNow) {
        this.y = sNow; this.vy = 0;
        this.state = dNow > PHYS.wade ? 'swim' : 'ground';
        this.air.scripted = false;
        this.cat?.onLand();
        this.fx.sound?.land?.();
      }
    }
    if (this.state === 'swim') {
      if (depth <= PHYS.wade - 0.03) { this.state = 'ground'; this.vy = 0; if (this.wet > 0.5) this.say('Paws on the bottom again.'); }
      else {
        const fy = Math.max(level - PHYS.float, sup + 0.01) + Math.sin(this.cat ? this.cat.time * 5.5 : 0) * 0.008;
        this.vy += ((fy - this.y) * 28 - this.vy * 5.5) * dt;
        this.y += this.vy * dt;
        this.wet = 1;
      }
    }
    this.medium = this.state === 'swim' ? 'swim' : (depth > 0.03 && this.state === 'ground' ? 'wade' : 'dry');
    if (this.medium === 'wade') this.wet = Math.max(this.wet, Math.min(0.45, this.wet + dt * 0.2));

    // carried by a moving deck?
    this.carrier = null;
    if (this.state === 'ground') {
      for (const s of W.solids) {
        if (s.moving && s.contains(this.pos.x, this.pos.y) && Math.abs(s.top(this.pos.x, this.pos.y) - this.y) < 0.08) {
          this.carrier = s;
          this.carrierLocal = s.local(this.pos.x, this.pos.y);
          this.carrierAng = s.ang;
        }
      }
    }

    this._wetness(dt, level);

    // pose
    this.root.position.set(this.pos.x, this.y + 0.012, this.pos.y);
    this.root.rotation.y = this.heading;
    const swim = this.state === 'swim';
    this.root.rotation.x += ((swim ? -0.2 : 0) - this.root.rotation.x) * Math.min(1, dt * 6);
    this.root.rotation.z = this.shake > 0 ? Math.sin(this.shake * Math.PI * 2 * 9.4) * 0.32 * Math.sin(Math.min(1, this.shake / 0.9) * Math.PI) : 0;
    if (this.cat) {
      const animSpeed = swim ? Math.max(1.4, this.speed * 1.5) : this.speed;
      this.cat.update(dt, animSpeed, this.state !== 'air', this.sprintNow, this.turning, this.medium !== 'dry', null);
      if (this.cat.blob) this.cat.blob.visible = !swim;
      if (this.state === 'air') this.cat.updateShadow?.(Math.max(0, this.y - sup));
      else this.cat.updateShadow?.(0);
    }
    this.parent.updateWorldMatrix(true, false);
    this.root.updateMatrixWorld(true);
    if (this.cat) this._paws();
    this.prints.update(dt);
  }

  _paws() {
    const cat = this.cat;
    cat.chest.getWorldPosition(this.chest);
    cat.hips.getWorldPosition(this.hips);
    for (let i = 0; i < 4; i++) {
      const p = this.paws[i];
      cat.legs[i].paw.getWorldPosition(_v);
      const top = supportAt(this.world, _v.x, _v.z, this.heading, this.y);
      const planted = this.state === 'ground' && Math.abs(_v.y - top) < 0.06;
      p.down = planted && !p.planted;
      p.planted = planted;
      p.x = _v.x; p.y = _v.y; p.z = _v.z;
      if (p.down && this.onStep) this.onStep(i, p.x, p.z, this.heading);
    }
  }

  _step(i, x, z, heading) {
    const W = this.world, level = W.levelAt(x, z);
    const top = supportAt(W, x, z, heading, this.y);
    if (level - top > 0.01) {
      this.fx.ripple(x, z, 0.35);
      this.fx.sound?.step?.('water', i < 2);
    } else {
      if (this.wet > 0.18) this.prints.stamp(x, top, z, heading, this.wet);
      this.fx.sound?.step?.(this.wet > 0.3 ? 'wet' : 'dry', i < 2);
    }
  }

  _wetness(dt, level) {
    const swim = this.state === 'swim';
    if (swim) {
      this.rippleClock -= dt;
      if (this.rippleClock <= 0) {
        // a ring every fifth of a second; strung out behind a swimmer they make the wake
        this.rippleClock = 0.19;
        const f = this.world.field.flowAt(this.pos.x, this.pos.y, level, { x: 0, z: 0 });
        this.fx.ripple(this.pos.x - Math.sin(this.heading) * 0.12, this.pos.y - Math.cos(this.heading) * 0.12, this.speed > 0.2 ? 0.75 : 0.45, f);
        this.fx.sound?.paddle?.();
      }
    }
    // shake once back on dry ground, then dry slowly
    if (this.medium === 'dry' && this.state === 'ground' && !swim) {
      if (this.wet > 0.5 && this.shake <= 0) {
        this.calm += dt;
        if (this.calm > 0.45 && this.speed < 0.6) { this.shake = 0.95; this.calm = 0; this.say('Shake, shake: about nine times a second.'); this.fx.sound?.shake?.(); }
      }
      this.wet = Math.max(0, this.wet - dt / 32);
    } else this.calm = 0;
    if (this.shake > 0) {
      const before = this.shake;
      this.shake -= dt;
      this.speed = 0;
      // fling drops off the coat, tangent to the roll
      const n = Math.round(160 * dt);
      for (let k = 0; k < n; k++) {
        const side = Math.random() < 0.5 ? -1 : 1, along = (Math.random() - 0.4) * 0.35;
        const fx = Math.sin(this.heading), fz = Math.cos(this.heading), rx = fz, rz = -fx;
        this.fx.drops.spawn(this.pos.x + fx * along + rx * side * 0.08, this.y + 0.2, this.pos.y + fz * along + rz * side * 0.08,
          rx * side * (1.6 + Math.random() * 1.8), 0.6 + Math.random() * 1.6, rz * side * (1.6 + Math.random() * 1.8), 0.015 + Math.random() * 0.02, 1.2);
      }
      if (before > 0 && this.shake <= 0) this.wet *= 0.45;
    }
    if (this.wet > 0.25 && !swim && this.state === 'ground') {
      this.dripClock -= dt * this.wet;
      if (this.dripClock <= 0) {
        this.dripClock = 0.09;
        this.fx.drops.spawn(this.pos.x + (Math.random() - 0.5) * 0.2, this.y + 0.12, this.pos.y + (Math.random() - 0.5) * 0.25, 0, -0.2, 0, 0.012, 0.6);
      }
    }
    // wet fur darkens: water fills the gaps between hairs, so less light scatters back
    if (this.dry && this.cat) {
      const k = 1 - 0.42 * Math.min(1, this.wet * 1.15);
      const P = this.cat.palette;
      P.fur.copy(this.dry.fur).multiplyScalar(k);
      P.belly.copy(this.dry.belly).multiplyScalar(k * 0.95 + 0.05);
      P.stripe.copy(this.dry.stripe).multiplyScalar(Math.min(1, k + 0.15));
    }
  }

  /** Where Michi is and what the water is doing there, for the HUD. */
  status() {
    const W = this.world, x = this.pos.x, z = this.pos.y;
    const level = W.levelAt(x, z), sup = supportAt(W, x, z, this.heading, this.y);
    let on = 'the bank';
    for (const s of W.solids) if (s.walk && s.contains(x, z) && Math.abs(s.top(x, z) - sup) < 0.03 && s.name) on = s.name;
    if (on === 'the bank' && level - W.groundAt(x, z) > 0.01) on = this.medium === 'swim' ? 'the river' : 'the river bed';
    const f = W.field.flowAt(x, z, level, { x: 0, z: 0 });
    return {
      state: this.state === 'air' ? 'in the air' : this.medium === 'swim' ? 'swimming' : this.medium === 'wade' ? 'wading' : 'on foot',
      prep: this.medium === 'swim' ? 'in' : 'on',
      on, height: this.y, depth: Math.max(0, level - sup), current: Math.hypot(f.x, f.z), wet: this.wet
    };
  }
}
