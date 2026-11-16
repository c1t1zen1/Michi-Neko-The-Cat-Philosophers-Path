// runview.js — the Roof Road's view of a run: where the cat is drawn, the
// camera, Chidori following, the Shōki and treats, the lanterns and mouths,
// and the finale. One module for both players of the run (ruling R80):
//   - the sandbox page, rooftops/js/game.js (kyoto-rooftops.html), and
//   - the game, src/rooftops/pocket.js (through src/rooftops/runview.js).
// The code is game.js's own (tick(), updateCamera(), the Chidori, pickup,
// progress and finale functions), moved onto one object; each caller keeps
// only its glue (input, HUD, sound, renderer) and hears about events through
// `hooks`. No DOM, no renderer: a caller draws.
//
// One difference from the page as it was: the finale's mouth comes from the
// level's data (its last mouth, or level.finaleMouth when a level names one),
// where game.js hard-coded the seventh mouth (the stage-1 route had seven).
//
// Coordinates are the run's own frame. A caller that parks the run elsewhere
// (the game: a pocket 2.4 km below the valley) passes `origin`, the world
// position of that frame; models' world positions are taken back into it.

import * as THREE from 'three';
import { mouthAt } from './level.js';
import { platOffset, platTop, platDepth } from './physics.js';
import { alleyDepth } from './alleys.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/** The fixed physics step (120 Hz), as on the page and in the tests. */
export const STEP = 1 / 120;
const NO_INPUT = Object.freeze({ move: 0 });
const NOOP = () => {};

/** The finale's mouth: the one a level names, else its last (the float roof, 送り火). */
export function finaleMouth(level) {
  return level.finaleMouth || level.mouths[level.mouths.length - 1];
}

export class RunView {
  /**
   * @param o.level, o.runner, o.world, o.sky, o.atmosphere, o.companion  the run (level.js, physics.js, build.js, sky.js, atmosphere.js, companion.js)
   * @param o.catRoot, o.guideRoot  groups the cat and Chidori are drawn in (run frame)
   * @param o.camera  the camera this view frames (in the run's frame)
   * @param o.cat, o.guide  Cat instances, or null until they load (set later)
   * @param o.rim  the cats' shared rim uniforms (src/cat.js catRimUniforms), or null
   * @param o.lightPool  point lights that follow the cat between the nearest lanterns
   * @param o.envMats  standard materials whose environment dims with the evening
   * @param o.origin  world position of the run's frame (default 0, 0, 0)
   * @param o.reduceMotion
   * @param o.hooks  { viewport, sound(name, kind), mouth(m, first), shoki(k, count, total, obj),
   *                  treat(k, obj), finale(mouth), fire(i, fire), finaleCard(count, total) }
   */
  constructor(o) {
    this.level = o.level;
    this.rail = o.level.rail;
    this.runner = o.runner;
    this.world = o.world;
    this.sky = o.sky;
    this.atmosphere = o.atmosphere;
    this.companion = o.companion;
    this.catRoot = o.catRoot;
    this.guideRoot = o.guideRoot;
    this.camera = o.camera;
    this.cat = o.cat || null;
    this.guide = o.guide || null;
    this.rim = o.rim || null;
    this.lightPool = o.lightPool || [];
    this.envMats = o.envMats || [];
    this.origin = o.origin ? o.origin.clone() : new THREE.Vector3();
    this.reduceMotion = !!o.reduceMotion;
    this.hooks = o.hooks || {};
    this.finaleMouth = finaleMouth(this.level);
    this.shokiTotal = this.level.pickups.filter((k) => k.kind === 'shoki').length;

    this.time = 0;
    this.acc = 0;
    this.lastPhase = -1;
    this.envScale = 1;
    this.fixedPhase = null;          // the page's ?hour=: hold the sky at this progress
    this.finale = null;
    this.seen = new Set();
    this.greeted = new Set();
    this.currentMouth = this.level.mouths[0];
    this.lastCheckpoint = this.level.checkpoints[0];
    // Visual state for the cat, Chidori and the camera rig (game.js's vis, chidori, cam).
    this.vis = { depth: 0, phi: 0, catY: 0, landT: 0 };
    this.chidori = { pos: new THREE.Vector3(), heading: 0, depth: 0 };
    this.cam = { s: 0, y: 2, dist: 8.2, water: 0, fov: 34, n: { x: 0, z: 1 }, init: false };
    this.tmpV = new THREE.Vector3();
    this.tmpL = new THREE.Vector3();
    this.tmpImpact = new THREE.Vector3();
    this.tmpP = new THREE.Vector3();
  }

  _hook(name) { return this.hooks[name] || NOOP; }

  /* ---------------- positions ---------------- */

  startAt(s, y) {
    const runner = this.runner, vis = this.vis;
    runner.reset(s, y + 0.4);
    vis.depth = runner.depth;
    vis.catY = runner.y; vis.stepOff = null;
    const p = this.rail.place(runner.s, vis.depth);
    this.catRoot.position.set(p.x, runner.y, p.z);
    this.cam.dist = 10.2;
    this.cam.init = false;
    this.cam.boom = null;
    if (this.companion) this.initChidori();
  }

  jumpToMouth(id) {
    const cp = this.level.checkpoints.find((c) => c.mouth === id) || this.level.checkpoints[0];
    this.lastCheckpoint = cp;
    this.startAt(cp.s, cp.y);
  }

  /** Back to the last lantern (never during the finale). Returns whether it moved the cat. */
  respawn() {
    if (this.finale) return false;
    this.startAt(this.lastCheckpoint.s, this.lastCheckpoint.y);
    return true;
  }

  /** Run it again: the fires out, the mouths unseen, the cat at the first lantern. */
  restart() {
    this.finale = null;
    this.sky.resetFires();
    if (this.cat) this.cat.endIdleAction();
    this.seen.clear();
    this.lastCheckpoint = this.level.checkpoints[0];
    this.initChidori();
    this.startAt(this.level.checkpoints[0].s, this.level.checkpoints[0].y);
  }

  initChidori() {
    const companion = this.companion, chidori = this.chidori;
    companion.reset(this.runner, this.time);
    const r = companion.runner, p = this.rail.place(r.s, r.depth);
    chidori.pos.set(p.x, r.y, p.z); chidori.depth = r.depth;
    this.guideRoot.position.copy(chidori.pos);
    chidori.catY = r.y; chidori.stepOff = null;
  }

  beginStepOff(r, visual) {
    const g = r.dropIgnore;
    if (r.alley !== null || g?.kind !== 'eave') return;
    visual.stepOff = { t: 0, top: platTop(g, r.s, this.time), depth: platDepth(g, r.s) + 0.95 };
  }

  stepOffHeight(r, visual, dt) {
    const step = visual.stepOff;
    if (!step) { visual.catY = r.y; return r.y; }
    step.t += dt;
    if (r.grounded || step.t > 0.3) { visual.stepOff = null; visual.catY = r.y; return r.y; }
    // Step sideways over the actual roof edge before descending to the lower
    // ledge. The one-way physics drop must not draw a cat melting through tiles.
    visual.depth = damp(visual.depth, step.depth, 24, dt);
    visual.catY = step.t < 0.12 ? Math.max(r.y, step.top) : damp(visual.catY, r.y, 18, dt);
    return visual.catY;
  }

  lowHeadroom(position, r) {
    const tangent = this.pathTangent(r);
    for (const lead of [0, 0.6]) {
      const from = position.clone(); from.y += 0.35;
      from.x += tangent.x * r.facing * lead; from.z += tangent.z * r.facing * lead;
      const to = from.clone(); to.y += 0.65;
      if (this.world.obstacles.distance(from, to) < 0.52) return true;
    }
    return false;
  }

  pathTangent(r) {
    if (r.alley === null) return this.rail.tangentAt(r.s);
    const a = this.level.alleys[r.alley], lo = clamp(r.s - 0.1, a.s0, a.s1), hi = clamp(r.s + 0.1, a.s0, a.s1);
    const p = this.rail.place(lo, alleyDepth(a, lo)), q = this.rail.place(hi, alleyDepth(a, hi));
    const length = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    return { x: (q.x - p.x) / length, z: (q.z - p.z) / length };
  }

  /* ---------------- Chidori ---------------- */

  updateChidori(dt) {
    const camera = this.camera, companion = this.companion, chidori = this.chidori, guide = this.guide;
    const portrait = camera.aspect < 0.85;
    // Substep the companion alongside the same real runner constants.
    const steps = Math.max(1, Math.ceil(dt / STEP)), step = dt / steps;
    let r = companion.runner;
    const events = new Set();
    for (let i = 0; i < steps; i++) {
      if (this.finale) r.step(step, NO_INPUT, this.time - dt + i * step);
      else r = companion.update(step, this.runner, this.time - dt + i * step, portrait);
      for (const event of r.events) events.add(event);
    }
    chidori.depth = r.alley !== null ? r.depth : damp(chidori.depth, r.depth, 9, dt);
    if (events.has('drop')) this.beginStepOff(r, chidori);
    const drawY = this.stepOffHeight(r, chidori, dt);
    const p = this.rail.place(r.s, chidori.depth);
    chidori.pos.set(p.x, drawY, p.z);
    const t = this.pathTangent(r);
    const watch = Math.abs(r.vs) < 0.2;
    const catPos = this.catRoot.position;
    const want = watch ? Math.atan2(catPos.x - p.x, catPos.z - p.z) : Math.atan2(t.x * r.facing, t.z * r.facing);
    let turn = want - chidori.heading;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    chidori.heading += turn * Math.min(1, dt * 8);
    this.guideRoot.position.copy(chidori.pos); this.guideRoot.rotation.y = chidori.heading;
    if (guide) {
      if (events.has('jump') || events.has('bounce')) guide.onJump();
      if (events.has('land')) guide.onLand();
      if (!watch && guide.idleAction) guide.endIdleAction();
      if (watch && companion.modeTime > 0.65 && !guide.idleAction) guide.startIdleAction(companion.mood === 'prowl' ? 'groom' : companion.mood === 'feint' ? 'stretch' : 'sit', 2);
      guide.setProwling(companion.mood === 'prowl' || r.onRope || this.lowHeadroom(this.guideRoot.position, r));
      guide.update(dt, Math.abs(r.vs), r.grounded, r.sprinting, false, r.inWater, null);
      guide.setLookTarget(watch ? this.catRoot.position : null);
    }
  }

  /* ---------------- pickups, checkpoints, mouths ---------------- */

  /** A greeted Shōki warms to lit clay. */
  lightShoki(obj) {
    const M = this.world.M;
    const lit = M.clayLit || (M.clayLit = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.7, emissive: 0x5a3a14, emissiveIntensity: 0.55 }));
    for (const ch of obj.children) ch.material = lit;
  }

  checkPickups() {
    const runner = this.runner;
    for (const obj of [...this.world.dynamic.shoki, ...this.world.dynamic.treats]) {
      const k = obj.userData.pickup;
      if (obj.userData.done) continue;
      if (Math.abs(runner.s - k.s) > 0.6 || Math.abs(runner.y - k.y) > 0.8) continue;
      obj.userData.done = true;
      this.atmosphere.burst(k.kind, obj.position, this.rail.tangentAt(k.s));
      if (k.kind === 'shoki') {
        this.greeted.add(k.id);
        this.lightShoki(obj);
        if (this.cat) this.cat.setMood('curious', 1.2, 2);
        this._hook('shoki')(k, this.greeted.size, this.shokiTotal, obj);
      } else {
        obj.visible = false;
        if (this.cat) this.cat.startIdleAction('groom', 2.4);
        this._hook('treat')(k, obj);
      }
    }
  }

  checkProgress() {
    const runner = this.runner, level = this.level;
    if (runner.grounded) {
      for (const cp of level.checkpoints) {
        if (cp.mouth > this.lastCheckpoint.mouth && runner.s >= cp.s - 0.6 && runner.y >= cp.y - 0.6) this.lastCheckpoint = cp;
      }
    }
    const m = mouthAt(level, runner.s, runner.y);
    if (m !== this.currentMouth) {
      this.currentMouth = m;
      const first = !this.seen.has(m.id);
      if (first) this.seen.add(m.id);
      this._hook('mouth')(m, first);
    }
    if (!this.finale && runner.grounded && runner.ground.kind === 'perch') this.startFinale();
  }

  /* ---------------- the finale ---------------- */

  startFinale() {
    this.finale = { t: 0, lit: 0, shown: false };
    const m = this.finaleMouth;
    this.seen.add(m.id);
    if (this.cat) { this.cat.startIdleAction('sit', 9999); this.cat.setLookTarget(null); }
    // Chidori settles on the real roof he reached beside Michi. The chase
    // ends here; no scripted long leap or old perch index takes over.
    this.companion.runner.vs = 0;
    if (this.guide && this.companion.runner.grounded) this.guide.startIdleAction('sit', 9999);
    this._hook('finale')(m);
  }

  updateFinale(dt) {
    const finale = this.finale;
    finale.t += dt;
    const t = finale.t;
    // Fires: Daimonji first, then right to left, ~1.6 s apart.
    const due = Math.floor((t - 3.0) / 1.6) + 1;
    while (finale.lit < Math.min(5, due)) {
      const i = finale.lit;
      this.sky.lightFire(i);
      this._hook('fire')(i, this.sky.fires[i]);
      finale.lit++;
    }
    if (!finale.shown && t > 13.5) {
      finale.shown = true;
      this._hook('finaleCard')(this.greeted.size, this.shokiTotal);
    }
  }

  /** Jump to the end of the finale: all five fires burning, the card up. */
  skipFinale() {
    if (!this.finale) {
      const perch = this.level.platforms.find((p) => p.kind === 'perch');
      this.startAt((perch.s0 + perch.s1) / 2, perch.y0);
      this.startFinale();
    }
    this.finale.t = 14;
    this.finale.lit = 5;
    this.sky.fires.forEach((f, i) => { this.sky.lightFire(i); f.kindle = 1; });
  }

  /* ---------------- the frame ---------------- */

  burstAtRunner(kind) {
    const runner = this.runner;
    this.rail.place(runner.s, runner.depth, this.tmpImpact);
    this.tmpImpact.y = runner.y + 0.04;
    this.atmosphere.burst(kind, this.tmpImpact, this.rail.tangentAt(runner.s));
  }

  stepPhysics(inp) {
    const runner = this.runner, cat = this.cat, sound = this._hook('sound');
    const prevGrounded = runner.grounded;
    runner.step(STEP, inp, this.time);
    const ev = runner.events;
    if (ev.includes('drop')) this.beginStepOff(runner, this.vis);
    if (ev.includes('jump')) { if (cat) cat.onJump(); sound('jump'); }
    const bounced = ev.includes('bounce');
    if (bounced) { if (cat) cat.onJump(); sound('bounce'); this.burstAtRunner('futon'); }
    if (ev.includes('land') || ev.includes('mantle')) {
      if (cat && !prevGrounded) cat.onLand();
      const kind = (runner.ground || runner.lastGround)?.kind;
      sound('land', kind);
      if (!bounced && kind !== 'rope' && kind !== 'branch' && kind !== 'boat' && kind !== 'water') this.burstAtRunner('dust');
    }
    if (ev.includes('splash')) { sound('splash'); this.burstAtRunner('water'); if (cat) cat.onLand(); }
    this.time += STEP;
  }

  /**
   * One frame of the run (game.js tick() without the page): input → fixed
   * physics steps (an autopilot drives instead when given), the sky by
   * progress (night at the finale), moving pieces, the cat, Chidori, pickups
   * and mouths or the finale, the lantern lights, the camera, the sky and the
   * atmosphere. input null = no input (the cat stands still).
   * Returns { steps, prog, night } (steps > 0 means the edge presses were consumed).
   */
  frame(dt, input, autopilot = null) {
    const runner = this.runner;
    let inp = input || NO_INPUT;
    if (this.finale) inp = NO_INPUT;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 24) {
      const use = autopilot && !this.finale ? autopilot.input(runner, this.time, STEP) : inp;
      this.stepPhysics(use);
      // Only the first sub-step sees the edge presses.
      inp = { ...inp, jumpPressed: false, downPressed: false, jumpReleased: false };
      this.acc -= STEP;
      steps++;
    }

    // Sky by progress along the route (or held by the page's ?hour, or night at the finale).
    const prog = this.finale ? 1 : (this.fixedPhase !== null ? this.fixedPhase : clamp(runner.s / this.level.length, 0, 1));
    if (Math.abs(prog - this.lastPhase) > 0.002) {
      const night = this.sky.setPhase(prog);
      this.lastPhase = prog;
      this.envScale = 1 - 0.75 * night;
      for (const m of this.envMats) m.envMapIntensity = (m.userData.env0 ?? 1) * this.envScale;
    }
    const night = this.sky.night;
    this.world.update(this.time, night, platOffset, this.level.platforms, runner.s);

    this.placeCat(dt);
    this.updateChidori(dt);
    if (!this.finale) { this.checkPickups(); this.checkProgress(); }
    else this.updateFinale(dt);
    this.updateLights(night);
    this.updateCamera(dt);
    this.sky.update(dt, this.time, this.catRoot.position);
    this.atmosphere.update(dt, this.time, prog, night, this.catRoot.position);
    return { steps, prog, night };
  }

  /** Where the cat is drawn: depth eases toward what it stands on (or will land on). */
  placeCat(dt) {
    const runner = this.runner, vis = this.vis, catRoot = this.catRoot, cat = this.cat, rail = this.rail;
    let targetD = runner.depth;
    if (!runner.grounded) {
      const below = runner.support(runner.s, runner.y, 0, 40);
      if (below) targetD = platDepth(below, runner.s);
    }
    vis.depth = runner.alley !== null ? targetD : damp(vis.depth, targetD, runner.grounded ? 10 : 5, dt);
    const drawY = this.stepOffHeight(runner, vis, dt);
    const p = rail.place(runner.s, vis.depth);
    catRoot.position.set(p.x, drawY, p.z);
    // Facing: φ = 0 along +s, π along −s, turning through the camera side.
    const goal = runner.facing > 0 ? 0 : Math.PI;
    const turning = Math.abs(vis.phi - goal) > 0.3;
    vis.phi = damp(vis.phi, goal, 11, dt);
    const t = this.pathTangent(runner);
    const n = { x: -t.z, z: t.x };
    const dir = { x: t.x * Math.cos(vis.phi) + n.x * Math.sin(vis.phi), z: t.z * Math.cos(vis.phi) + n.z * Math.sin(vis.phi) };
    if (this.finale) {
      // Sit facing the hills, back to the camera, like the summit's overlook.
      const f = this.sky.fires[1].center;
      const want = Math.atan2(f.x - catRoot.position.x, f.z - catRoot.position.z);
      let d = want - catRoot.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      catRoot.rotation.y += d * Math.min(1, dt * 2.5);
    } else {
      catRoot.rotation.y = Math.atan2(dir.x, dir.z);
    }
    // Lean with slopes along s.
    let pitch = 0;
    if (runner.grounded && runner.ground.y1 !== runner.ground.y0) {
      const g = runner.ground;
      pitch = -Math.atan2(g.y1 - g.y0, g.s1 - g.s0) * Math.cos(vis.phi);
    }
    catRoot.rotation.x = damp(catRoot.rotation.x, 0, 10, dt);
    if (cat) {
      cat.group.rotation.x = damp(cat.group.rotation.x, pitch, 10, dt);
      cat.setProwling(runner.onRope || this.lowHeadroom(catRoot.position, runner));
      const speed = Math.abs(runner.vs);
      cat.update(dt, speed, runner.grounded, runner.sprinting && speed > 4.5, turning && speed < 0.6, runner.inWater, null);
      const sup = runner.grounded ? null : runner.support(runner.s, runner.y, 0, 40);
      cat.updateShadow(sup ? Math.max(0, runner.y - platTop(sup, runner.s, this.time)) : 0);
      // Peer over a ledge the guard stopped us at.
      if (runner.peering && !this.finale) {
        const ahead = rail.place(runner.s + runner.facing * 0.8, vis.depth);
        cat.setLookTarget(this.tmpL.set(ahead.x, runner.y - 1.5, ahead.z).add(this.origin));
      } else if (!this.finale) cat.setLookTarget(null);
      if (this.rim) this.rim.uRimDir.value.copy(this.sky.lightDir);
    }
  }

  /** Lantern light pool: the nearest anchors to the cat. */
  updateLights(night) {
    const pool = this.lightPool, catPos = this.catRoot.position;
    if (night > 0.05) {
      const near = this.world.lights.map((v) => [v, v.distanceToSquared(catPos)]).sort((a, b) => a[1] - b[1]).slice(0, pool.length);
      pool.forEach((l, i) => {
        const e = near[i];
        if (!e || e[1] > 30 * 30) { l.intensity = 0; return; }
        l.position.copy(e[0]);
        l.intensity = 2.2 * night;
      });
    } else pool.forEach((l) => { l.intensity = 0; });
  }

  updateCamera(dt, playerOnly = false) {
    this._hook('viewport')();
    const camera = this.camera, cam = this.cam, level = this.level, rail = this.rail;
    const runner = this.runner, catRoot = this.catRoot, guideRoot = this.guideRoot, finale = this.finale;
    const reduceMotion = this.reduceMotion;

    if (finale) {
      // Pull back behind the cat and turn toward the hills and the fires.
      // Three-quarter from behind, so the cat sits against the fires and the
      // shingi pole stays off to one side; 1.1 m above the perch, so Michi
      // shows whole over the near ridge.
      const k = smooth(0, 4.5, finale.t);
      const m = catRoot.position;
      const want = this.tmpV.set(m.x - 5.2, m.y + 1.1, m.z + 3.6);
      camera.position.lerp(want, 1 - Math.exp(-(reduceMotion ? 1.2 : 2.2) * dt * (0.3 + k)));
      // The new downtown endpoint faces a different bearing. Aim at the real
      // hill fires (a little below them, so the roofs and the cats come up the
      // frame); a portrait panorama needs a wider horizontal field as well.
      const look = this.tmpL.set(0, 0, 0);
      for (const fire of this.sky.fires) look.add(fire.center);
      look.multiplyScalar(1 / this.sky.fires.length); look.y -= 45;
      // Frame the pair, not Michi alone: as the finale settles, turn half-way
      // from the fires toward Michi and Chidori's midpoint (Michi alone when
      // Chidori is far off), at most 13°, but never so far that a fire leaves
      // the frame (a narrow portrait screen keeps the fires and turns less).
      // (Moving the camera instead walks it into the float's pole and deck.)
      const guide = guideRoot.position;
      const pair = this.tmpP.copy(m).lerp(guide, 0.5 * (1 - smooth(3.5, 6, m.distanceTo(guide))));
      const cx = camera.position.x, cz = camera.position.z;
      const toFires = Math.atan2(look.x - cx, look.z - cz);
      const off = (x, z) => {
        let a = Math.atan2(x - cx, z - cz) - toFires;
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
      };
      const half = Math.atan(0.85 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
      let lo = -Math.PI, hi = Math.PI;
      for (const fire of this.sky.fires) {
        const a = off(fire.center.x, fire.center.z);
        lo = Math.max(lo, a - half); hi = Math.min(hi, a + half);
      }
      const turn = lo <= hi ? clamp(0.5 * k * clamp(off(pair.x, pair.z), -0.45, 0.45), lo, hi) : 0;
      const yaw = toFires + turn, reach = Math.hypot(look.x - cx, look.z - cz);
      look.set(cx + Math.sin(yaw) * reach, look.y, cz + Math.cos(yaw) * reach);
      camera.lookAt(look);
      const finaleFov = camera.aspect < 0.85 ? 96 : 50;
      camera.fov = damp(camera.fov, finaleFov, 1.5, dt);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      return;
    }

    const previousPosition = camera.position.clone();
    const portrait = camera.aspect < 0.85;
    const r = this.companion.runner, inAlley = runner.alley !== null;
    const alley = inAlley ? level.alleys[runner.alley] : null;
    // A close alley view follows Michi. Chidori can explore another lane without
    // pulling the camera back through the intervening houses.
    cam.soloT = Math.max(0, (cam.soloT || 0) - dt);
    const together = !inAlley && r.alley === null && !playerOnly && !cam.soloT;
    const subjects = together ? [catRoot, guideRoot] : [catRoot];
    cam.subjects = together ? ['player', 'guide'] : ['player'];
    const vertical = smooth(this.finaleMouth.s0 - 5, this.finaleMouth.s0, runner.s);
    const mid = catRoot.position.clone();
    if (together) mid.add(guideRoot.position).multiplyScalar(0.5);
    mid.y += inAlley ? 0.38 : 0.5;
    const rate = reduceMotion ? 4 : 7;
    const reset = !cam.init;
    if (reset) { cam.center = mid.clone(); cam.init = true; cam.alley = inAlley ? 1 : 0; }
    cam.center.lerp(mid, 1 - Math.exp(-rate * Math.max(dt, 1 / 120)));
    if (inAlley) { cam.center.x = mid.x; cam.center.z = mid.z; }
    cam.alley = damp(cam.alley, inAlley ? 1 : 0, 5, dt);
    cam.s = (runner.s + (together ? r.s : runner.s)) / 2;
    const normal = rail.smoothNormalAt(clamp(cam.s, 0, level.length), 3.5, cam.n);
    const side = new THREE.Vector3(normal.x, 0, normal.z);
    const tangent = new THREE.Vector3(normal.z, 0, -normal.x);
    const behind = tangent.clone().multiplyScalar(-runner.facing);
    if (alley) {
      const lo = clamp(runner.s - 0.35, alley.s0, alley.s1), hi = clamp(runner.s + 0.35, alley.s0, alley.s1);
      const a = rail.place(lo, alleyDepth(alley, lo)), b = rail.place(hi, alleyDepth(alley, hi));
      behind.set(a.x - b.x, 0, a.z - b.z).normalize().multiplyScalar(runner.facing);
    }
    // Street: see over the eaves. Alley: human head height, close behind and
    // looking down at the paws, with a slightly wider lens in the confined space.
    camera.fov = 40 + cam.alley * 18 + (portrait ? 3 : 0);
    camera.updateProjectionMatrix();
    const direction = side.clone().lerp(behind, cam.alley).normalize();
    const baseDistance = (portrait ? 9 : 8.4) * (1 - cam.alley) + 2.5 * cam.alley;
    const baseHeight = (4.5 + vertical * 0.5) * (1 - cam.alley) + 1.25 * cam.alley;
    const point = new THREE.Vector3(), offset = new THREE.Vector3();
    const obstacles = this.world.obstacles;
    // Test the posed anatomy, including a lowered head when prowling. A
    // fixed cube around the root overestimated the cats in covered passages.
    const sightPoints = [], sightGroups = [];
    for (const subject of subjects) {
      const first = sightPoints.length;
      subject.updateMatrixWorld(true);
      const model = subject === catRoot ? this.cat : this.guide;
      if (model) {
        // World positions, taken back into the run's frame.
        sightPoints.push(model.head.getWorldPosition(new THREE.Vector3()).sub(this.origin).add(new THREE.Vector3(0, 0.05, 0)));
        const chest = model.chest.getWorldPosition(new THREE.Vector3()).sub(this.origin);
        for (const x of [-0.09, 0.09]) sightPoints.push(chest.clone().addScaledVector(side, x));
        sightPoints.push(model.hips.getWorldPosition(new THREE.Vector3()).sub(this.origin));
      } else sightPoints.push(subject.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
      sightGroups.push([first, sightPoints.length]);
    }
    const clear = (position) => {
      // Thin rails can overlap an extremity without concealing the cat. Avoid
      // throwing the camera over a roof for that normal contact during a jump.
      for (const [first, end] of sightGroups) {
        let visible = 0;
        for (let i = first; i < end; i++) {
          const pt = sightPoints[i];
          if (obstacles.distance(pt, position) >= pt.distanceTo(position) - 0.18) visible++;
        }
        if (visible < Math.ceil((end - first) * 0.75)) return false;
      }
      return true;
    };
    const fits = () => {
      let overflow = 1;
      for (const subject of subjects) for (const x of [-0.42, 0.42]) for (const y of [0, 0.72]) for (const z of [-0.42, 0.42]) {
        point.copy(subject.position).add(offset.set(x, y, z)).project(camera);
        if (point.z > 1) return Infinity;
        overflow = Math.max(overflow, Math.abs(point.x) / (portrait ? 0.8 : 0.88), Math.abs(point.y) / 0.56);
      }
      return overflow;
    };
    const place = (distance, height, shift = 0) => {
      camera.position.copy(cam.center).addScaledVector(direction, distance).addScaledVector(tangent, shift);
      camera.position.y += height;
      camera.lookAt(cam.center); camera.updateMatrixWorld(true);
    };
    const candidate = new THREE.Vector3();
    const sharedLimit = portrait ? 16 : 22;
    let found = false;
    // Try the gently returning boom first. If scenery blocks it, resolve before
    // drawing: easing alone would spend several frames inside a wall or roof.
    const wanted = direction.clone().multiplyScalar(baseDistance); wanted.y = baseHeight;
    if (!cam.boom || reset) cam.boom = wanted.clone();
    cam.boom.lerp(wanted, 1 - Math.exp(-2.5 * dt));
    camera.position.copy(cam.center).add(cam.boom);
    camera.lookAt(cam.center); camera.updateMatrixWorld(true);
    if ((!together || (cam.boom.y <= baseHeight + 3 && cam.boom.length() <= sharedLimit)) && fits() <= 1.001 && clear(camera.position)) { candidate.copy(camera.position); found = true; }
    const lifts = inAlley ? [0, 0.35, 0.8, 1.6, 3, 5, 8] : together ? [0, 1.2, 2.8] : [0, 1.2, 2.8, 4.8, 7.5, 11, 16];
    if (!found) search: for (const shift of [0, 1.4, -1.4, 3, -3]) for (const lift of lifts) {
      let distance = baseDistance, height = baseHeight + lift;
      for (let i = 0; i < 5; i++) {
        place(distance, height, shift);
        const overflow = fits();
        if (overflow <= 1.001) break;
        const scale = Math.min(1.7, overflow * 1.02);
        distance *= scale; height *= scale;
      }
      if ((!together || camera.position.distanceTo(cam.center) <= sharedLimit) && fits() <= 1.001 && clear(camera.position)) { candidate.copy(camera.position); found = true; break search; }
    }
    // In a covered passage, shortening the boom keeps it below the soffit.
    if (!found) searchClose: for (const d of [1.8, 1.2, 0.8]) for (const h of [1.1, 0.75, 0.45]) {
      place(d, h);
      if (fits() <= 1.12 && clear(camera.position)) { candidate.copy(camera.position); found = true; break searchClose; }
    }
    if (!found && together) {
      cam.soloT = 0.8; cam.init = false;
      this.updateCamera(0, true); return;
    }
    if (!found) {
      // A sharp exit can leave the eased focus behind a corner. Recenter on
      // Michi and search around the corner before falling back to a short boom.
      cam.center.copy(mid);
      const savedDirection = direction.clone();
      searchAround: for (const turn of [0, 0.45, -0.45, 0.9, -0.9, 1.57, -1.57, Math.PI]) {
        direction.copy(savedDirection).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
        for (const height of [1.25, 0.85, 0.55, 0.3, 0.12, 2, 3.5, 5, 8, 12, 18]) for (const distance of [baseDistance, 3.4, 2.5, 1.9]) {
          place(distance, height);
          if (fits() <= 1.001 && clear(camera.position)) { candidate.copy(camera.position); found = true; break searchAround; }
        }
      }
    }
    if (found) {
      camera.position.copy(candidate);
      if (!reset && dt > 0) {
        const eased = previousPosition.lerp(candidate, 1 - Math.exp(-(reduceMotion ? 5 : 8) * dt));
        camera.position.copy(eased); camera.lookAt(cam.center); camera.updateMatrixWorld(true);
        // Ease only through a clear view. A collision correction must take
        // effect before drawing, never leave an interpolated frame in a wall.
        if (fits() > 1.001 || !clear(eased)) camera.position.copy(candidate);
      }
    }
    camera.lookAt(cam.center); camera.updateMatrixWorld(true);
    cam.boom.subVectors(camera.position, cam.center);
    cam.dist = cam.boom.length();
    cam.clear = found;
    cam.mode = inAlley ? 'alley' : 'street';
  }
}
