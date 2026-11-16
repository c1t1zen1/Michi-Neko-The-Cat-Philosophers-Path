// pocket.js — the Roof Road run inside the game (BUILD_GUIDE_FABLE R6.3; spec
// §5–§7, §8.2). RooftopManager (manager.js) builds this the first time the cat
// goes through the noren and drives it while the Roof Road is up.
//
// It is the sandbox page's run (rooftops/js/game.js) without the page: the same
// level, runner physics, world, sky, atmosphere, companion and camera, built
// from the same modules (nothing is copied but the frame loop below, which
// follows game.js tick() / updateCamera() / the finale step by step), with the
// game's own pieces in place of the page's:
//   - the cat is the game's Michi (player.mesh is parented into the pocket while
//     it is up; Player.update is skipped), Chidori is a second Cat as on the page;
//   - input comes from the game's Controls (RooftopManager.readInput);
//   - it renders with the game's renderer and camera: its own scene, no
//     valley post chain (the page has none either), its own exposure;
//   - the HUD is the game's toasts; greeting a Shōki, the finale and the way
//     home go to the manager (journal, XP, save).
//
// Coordinates: everything is built in the run's own frame (as on the page),
// under `root`, which sits at the manager's origin (0, -2400, 0). The camera
// logic runs on a local camera in that frame and is copied to the game camera
// offset by the origin each frame; the projection is the same.
//
// No timers and no fail states: the sky follows distance along the route, a
// missed jump lands in the street, R (a convenience) returns to the last
// lantern, and a cat that somehow ends below the world is put back on the last
// lantern's roof.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLevel, mouthAt } from './level.js?v=20261114a';
import { Runner, platOffset, platTop, platDepth } from './physics.js?v=20261114a';
import { Autopilot } from './autopilot.js?v=20261114a';
import { buildWorld } from '../../rooftops/js/build.js';
import { Sky } from '../../rooftops/js/sky.js';
import { RooftopAtmosphere } from '../../rooftops/js/atmosphere.js';
import { alleyEntrance, alleyDepth } from '../../rooftops/js/alleys.js';
import { Companion } from '../../rooftops/js/companion.js';
import { AssetRuntime } from '../kit/runtime.js?v=20261114a';
import { Cat, catRimUniforms } from '../cat.js?v=20261114a';
import { PENTATONIC } from './posts.js?v=20261114a';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const STEP = 1 / 120;
const NO_INPUT = Object.freeze({ move: 0 });
/** Walk back past here (route metres) once armed and the run hands the cat home. */
const HOME_S = 0.6;
const FIRE_NOTES = [196.0, 220.0, 246.94, 293.66, 329.63];

export class RooftopPocket {
  constructor(game, { origin, manager }) {
    this.game = game;
    this.manager = manager;
    this.origin = new THREE.Vector3(origin.x, origin.y, origin.z);
    this.ready = false;
  }

  /** Build the run (behind the veil): level, world, sky, atmosphere, Chidori; compile. */
  async init() {
    const g = this.game;
    const quality = g.resolvedQuality || (g.settings && g.settings.resolveQuality && g.settings.resolveQuality()) || 'medium';
    this.lowPower = quality === 'low';
    this.reduceMotion = !!g.reducedMotion;
    this.shadows = !this.lowPower;
    const renderer = g.renderer;

    this.scene = new THREE.Scene();
    this.scene.name = 'Roof Road';
    this.root = new THREE.Group();
    this.root.name = 'Roof Road pocket';
    this.root.position.copy(this.origin);
    this.scene.add(this.root);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const level = this.level = buildLevel();
    this.rail = level.rail;
    this.runner = new Runner(level);
    // The Roof Road's own asset runtime, on the game's set (settings, ?assets=, ?swap=).
    // Created and preloaded BEFORE the sky, as the page does (r4b: the sky, hills,
    // fires and atmosphere route through it too).
    this.assets = new AssetRuntime({
      THREE, assetSet: g.settings && g.settings.values ? g.settings.values.assetSet : 'classic',
      search: typeof location !== 'undefined' ? location.search : '', quality
    });
    await this.assets.preload();
    // The sky writes the run's exposure here; render() applies it around the draw.
    this.exposure = { toneMappingExposure: 1 };
    this.sky = new Sky(this.root, this.exposure, {
      shadows: this.shadows, reduceMotion: this.reduceMotion, lowPower: this.lowPower,
      center: new THREE.Vector3(level.center.x, 0, level.center.z),
      assets: this.assets
    });
    this.scene.fog = this.root.fog;            // Sky sets the fog on what it was given
    this.world = buildWorld(level, { reduceMotion: this.reduceMotion, lowPower: this.lowPower, assets: this.assets });
    this.root.add(this.world.root);
    this.atmosphere = new RooftopAtmosphere(this.root, level, { reduceMotion: this.reduceMotion, lowPower: this.lowPower, assets: this.assets });

    this.envMats = [];
    this.root.traverse((o) => {
      const m = o.material;
      if (m && m.isMeshStandardMaterial && !this.envMats.includes(m)) { this.envMats.push(m); m.userData.env0 = m.envMapIntensity; }
    });
    this.lightPool = [0, 1, 2, 3].map(() => {
      const l = new THREE.PointLight(0xffa24a, 0, 9, 1.6);
      this.root.add(l);
      return l;
    });

    // Michi rides in catRoot while the run is up (attach/detach); Chidori in guideRoot.
    this.catRoot = new THREE.Group();
    this.catRoot.name = 'Roof Road cat';
    this.root.add(this.catRoot);
    this.guideRoot = new THREE.Group();
    this.guideRoot.name = 'Chidori';
    this.root.add(this.guideRoot);
    const chidoriModular = this.assets.setFor('roof-chidori') === 'modular' && !this.lowPower;
    const chidoriDef = chidoriModular ? (await import('../characters/defs/chidori.js?v=20261114a')).CHIDORI : null;
    this.guide = new Cat(chidoriDef
      ? { def: chidoriDef, quality: 'high' }
      : { fur: 0x8f9095, belly: 0xf3f1ec, accent: 0x55575e, eyeColor: 0x9fd0a8, stripeAmount: 0.55, ribbonColor: 0x3a6fa8 });
    this.guide.group.scale.setScalar(0.86);
    this.guide.group.position.y = 0.02;
    this.guideRoot.add(this.guide.group);
    this.companion = new Companion(level);
    this.chidori = { pos: new THREE.Vector3(), heading: 0, depth: 0 };

    this.cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 2000);
    this.camState = { s: 0, y: 2, dist: 8.2, fov: 40, n: { x: 0, z: 1 }, init: false };
    this.vis = { depth: 0, phi: 0, catY: 0, landT: 0 };
    this.time = 0;
    this.acc = 0;
    this.lastPhase = -1;
    this.finale = null;
    this.autopilot = null;
    this.seen = new Set();
    this.greeted = new Set();
    this.tmpV = new THREE.Vector3(); this.tmpL = new THREE.Vector3(); this.tmpImpact = new THREE.Vector3();
    this.applyQuality(quality);

    // Settle and compile the whole scene once (the page does the same).
    this.lastCheckpoint = level.checkpoints[0];
    this.currentMouth = mouthAt(level, 1.0, 1.1);
    this.homeArmed = false;
    this.lastMove = 0;
    this.startAt(1.0, 1.1);
    this.initChidori();
    this.update(0, null, false);
    // Compile with the run's own camera: the game camera is the valley's until attach().
    this.cam.position.add(this.origin);
    this.cam.updateMatrixWorld(true);
    if (renderer.compileAsync) await renderer.compileAsync(this.scene, this.cam);
    this.cam.position.sub(this.origin);
    this.ready = true;
  }

  /* ---------------- the cat in and out ---------------- */

  /** Michi into the run: player.mesh under catRoot, the camera's far plane for the hills. */
  attach() {
    const g = this.game, p = g.player;
    this._saved = {
      parent: p.mesh.parent, pos: p.mesh.position.clone(), rotY: p.mesh.rotation.y,
      catY: p.cat.group.position.y, far: g.camera.far, near: g.camera.near, fov: g.camera.fov,
      rimStrength: catRimUniforms.uRimStrength.value
    };
    this.catRoot.add(p.mesh);
    p.mesh.position.set(0, 0, 0);
    p.mesh.rotation.set(0, 0, 0);
    this.cat = p.cat;
    catRimUniforms.uRimStrength.value = 0.35;
    if (p.cat.setLookTarget) p.cat.setLookTarget(null);
  }

  /** Michi back into the valley scene (the manager then places it on the bridge). */
  detach() {
    const g = this.game, p = g.player, s = this._saved;
    if (!s) return;
    (s.parent || g.scene).add(p.mesh);
    p.mesh.position.copy(s.pos);
    p.mesh.rotation.set(0, s.rotY, 0);
    p.cat.group.rotation.x = 0;
    if (p.cat.endIdleAction && p.cat.idleAction) p.cat.endIdleAction();
    if (p.cat.setProwling) p.cat.setProwling(!!p.isProwling);
    if (p.cat.setLookTarget) p.cat.setLookTarget(null);
    g.camera.far = s.far; g.camera.near = s.near; g.camera.fov = s.fov;
    g.camera.updateProjectionMatrix();
    catRimUniforms.uRimStrength.value = s.rimStrength;
    this.cat = null;
    this._saved = null;
  }

  /**
   * A new visit: at the first lantern on the bridge, Shōki already greeted (the
   * saved mask) shown as greeted, the sky back at afternoon, the fires out.
   */
  start({ shoki = 0 } = {}) {
    this.finale = null;
    this.sky.resetFires();
    this.seen.clear();
    this.greeted.clear();
    for (const obj of this.world.dynamic.shoki) {
      const k = obj.userData.pickup;
      const done = !!(shoki & (1 << ((k.id - 1) % 7)));
      obj.userData.done = done;
      if (done) { this.greeted.add(k.id); this.lightShoki(obj); }
    }
    for (const obj of this.world.dynamic.treats) { obj.userData.done = false; obj.visible = true; }
    this.lastCheckpoint = this.level.checkpoints[0];
    this.homeArmed = false;
    this.lantern = null;
    this.startAt(1.0, 1.1);
    this.initChidori();
    this.currentMouth = mouthAt(this.level, this.runner.s, this.runner.y);
    this.seen.add(this.currentMouth.id);
    this.camState.init = false;
    this.cam.fov = 40;
    this.lastPhase = -1;
    this.acc = 0;
    const m = this.currentMouth;
    this.game.ui.showToast(`${m.kanji} ${m.romaji} — ${m.title}`, 4200);
  }

  setAuto(on = true) { this.autopilot = on ? new Autopilot(this.level) : null; }

  /* ---------------- positions ---------------- */

  startAt(s, y) {
    const r = this.runner;
    r.reset(s, y + 0.4);
    this.vis.depth = r.depth;
    this.vis.catY = r.y; this.vis.stepOff = null;
    const p = this.rail.place(r.s, this.vis.depth);
    this.catRoot.position.set(p.x, r.y, p.z);
    this.camState.dist = 10.2;
    this.camState.init = false;
    this.camState.boom = null;
    if (this.companion) this.initChidori();
  }

  respawn() {
    if (this.finale) return;
    this.startAt(this.lastCheckpoint.s, this.lastCheckpoint.y);
    this.game.ui.showToast('Back to the last lantern.', 1600);
  }

  initChidori() {
    this.companion.reset(this.runner, this.time);
    const r = this.companion.runner, p = this.rail.place(r.s, r.depth);
    this.chidori.pos.set(p.x, r.y, p.z); this.chidori.depth = r.depth;
    this.guideRoot.position.copy(this.chidori.pos);
    this.chidori.catY = r.y; this.chidori.stepOff = null;
  }

  beginStepOff(r, visual) {
    const gnd = r.dropIgnore;
    if (r.alley !== null || gnd?.kind !== 'eave') return;
    visual.stepOff = { t: 0, top: platTop(gnd, r.s, this.time), depth: platDepth(gnd, r.s) + 0.95 };
  }

  stepOffHeight(r, visual, dt) {
    const step = visual.stepOff;
    if (!step) { visual.catY = r.y; return r.y; }
    step.t += dt;
    if (r.grounded || step.t > 0.3) { visual.stepOff = null; visual.catY = r.y; return r.y; }
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
    const portrait = this.cam.aspect < 0.85;
    const steps = Math.max(1, Math.ceil(dt / STEP)), step = dt / steps;
    let r = this.companion.runner;
    const events = new Set();
    for (let i = 0; i < steps; i++) {
      if (this.finale) r.step(step, NO_INPUT, this.time - dt + i * step);
      else r = this.companion.update(step, this.runner, this.time - dt + i * step, portrait);
      for (const event of r.events) events.add(event);
    }
    const ch = this.chidori;
    ch.depth = r.alley !== null ? r.depth : damp(ch.depth, r.depth, 9, dt);
    if (events.has('drop')) this.beginStepOff(r, ch);
    const drawY = this.stepOffHeight(r, ch, dt);
    const p = this.rail.place(r.s, ch.depth);
    ch.pos.set(p.x, drawY, p.z);
    const t = this.pathTangent(r);
    const watch = Math.abs(r.vs) < 0.2;
    const cp = this.catRoot.position;
    const want = watch ? Math.atan2(cp.x - p.x, cp.z - p.z) : Math.atan2(t.x * r.facing, t.z * r.facing);
    let turn = want - ch.heading;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    ch.heading += turn * Math.min(1, dt * 8);
    this.guideRoot.position.copy(ch.pos); this.guideRoot.rotation.y = ch.heading;
    const guide = this.guide;
    if (events.has('jump') || events.has('bounce')) guide.onJump();
    if (events.has('land')) guide.onLand();
    if (!watch && guide.idleAction) guide.endIdleAction();
    if (watch && this.companion.modeTime > 0.65 && !guide.idleAction) {
      const mood = this.companion.mood;
      guide.startIdleAction(mood === 'prowl' ? 'groom' : mood === 'feint' ? 'stretch' : 'sit', 2);
    }
    guide.setProwling(this.companion.mood === 'prowl' || r.onRope || this.lowHeadroom(this.guideRoot.position, r));
    guide.update(dt, Math.abs(r.vs), r.grounded, r.sprinting, false, r.inWater, null);
    guide.setLookTarget(watch ? this.catRoot.position : null);
  }

  /* ---------------- pickups, checkpoints, mouths ---------------- */

  lightShoki(obj) {
    const M = this.world.M;
    const lit = M.clayLit || (M.clayLit = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.7, emissive: 0x5a3a14, emissiveIntensity: 0.55 }));
    for (const ch of obj.children) ch.material = lit;
  }

  checkPickups() {
    const r = this.runner;
    for (const obj of [...this.world.dynamic.shoki, ...this.world.dynamic.treats]) {
      const k = obj.userData.pickup;
      if (obj.userData.done) continue;
      if (Math.abs(r.s - k.s) > 0.6 || Math.abs(r.y - k.y) > 0.8) continue;
      obj.userData.done = true;
      this.atmosphere.burst(k.kind, obj.position, this.rail.tangentAt(k.s));
      if (k.kind === 'shoki') {
        this.greeted.add(k.id);
        this.lightShoki(obj);
        this.chime(PENTATONIC[(k.id - 1) % PENTATONIC.length], 2.2, 0.06);
        const n = this.greeted.size;
        this.game.ui.showToast(n >= 7 ? 'Seven Shōki greeted. The roofs are well guarded.' : `A Shōki keeps watch here. (${n}/7)`, 3200);
        if (this.cat) this.cat.setMood('curious', 1.2, 2);
        if (this.manager) this.manager.onShoki(k.id, this.currentMouth);
      } else {
        obj.visible = false;
        this.chime(659.25, 1.0, 0.04);
        this.game.ui.showToast(k.label[0].toUpperCase() + k.label.slice(1) + '.', 3600);
        if (this.cat) this.cat.startIdleAction('groom', 2.4);
      }
    }
  }

  checkProgress() {
    const r = this.runner, level = this.level;
    if (r.grounded) {
      for (const cp of level.checkpoints) {
        if (cp.mouth > this.lastCheckpoint.mouth && r.s >= cp.s - 0.6 && r.y >= cp.y - 0.6) this.lastCheckpoint = cp;
      }
    }
    const m = mouthAt(level, r.s, r.y);
    if (m !== this.currentMouth) {
      this.currentMouth = m;
      if (!this.seen.has(m.id)) {
        this.seen.add(m.id);
        this.game.ui.showToast(`${m.kanji} ${m.romaji} — ${m.title}`, 4200);
        this.chime(PENTATONIC[(m.id - 1) % PENTATONIC.length] * 0.5, 2.4, 0.04);
      }
    }
    if (!this.finale && r.grounded && r.ground && r.ground.kind === 'perch') this.startFinale();
    // The way home: back across the bridge past where the run began.
    if (r.s > 6) this.homeArmed = true;
    if (this.homeArmed && r.s <= HOME_S && r.grounded && this.lastMove < -0.3 && this.manager) {
      this.homeArmed = false;
      this.manager.onLeave();
    }
  }

  /* ---------------- the finale ---------------- */

  startFinale() {
    this.finale = { t: 0, lit: 0, shown: false };
    const last = this.level.mouths[this.level.mouths.length - 1];
    this.seen.add(last.id);
    this.game.ui.showToast(`${last.kanji} ${last.romaji} — ${last.title}`, 4200);
    if (this.cat) { this.cat.startIdleAction('sit', 9999); this.cat.setLookTarget(null); }
    this.companion.runner.vs = 0;
    if (this.companion.runner.grounded) this.guide.startIdleAction('sit', 9999);
    if (this.manager) this.manager.onFinale();
  }

  updateFinale(dt, input) {
    const f = this.finale;
    f.t += dt;
    const due = Math.floor((f.t - 3.0) / 1.6) + 1;
    while (f.lit < Math.min(5, due)) {
      const i = f.lit;
      this.sky.lightFire(i);
      this.drum(76 - i * 4, 1.15, 0.04);
      this.chime(FIRE_NOTES[i], 3.5, 0.05);
      const fire = this.sky.fires[i];
      this.game.ui.showToast(fire?.label || fire?.name || 'Okuribi', 1450);
      f.lit++;
    }
    if (!f.shown && f.t > 13.5) {
      f.shown = true;
      this.game.ui.showToast(`屋根道 The Roof Road — ${this.greeted.size} of 7 Shōki greeted`, 5200);
    }
    // In the game the card has no buttons: a paper lantern drifts past, and
    // following it (any move) takes the cat home. Sitting on is staying a while.
    if (f.t > 15.5 && !this.lantern) this.releaseLantern();
    if (this.lantern) {
      const l = this.lantern;
      l.t += dt;
      l.mesh.position.set(l.x0 + Math.sin(l.t * 0.4) * 0.6 - l.t * 0.35, l.y0 + l.t * 0.32 + Math.sin(l.t * 1.3) * 0.05, l.z0 - l.t * 0.2);
      l.mat.emissiveIntensity = 1.2 + Math.sin(l.t * 2.1) * 0.15;
      if (input && (Math.abs(input.move) > 0.3 || input.jumpPressed) && f.t > 16.5 && this.manager && !this.manager.transitioning) {
        if (this.cat) this.cat.endIdleAction();
        this.manager.onLeave();
      }
    }
  }

  releaseLantern() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xf6e2bc, roughness: 0.8, emissive: 0xffa040, emissiveIntensity: 1.2 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8).scale(1, 1.25, 1), mat);
    mesh.name = 'Paper lantern home';
    const c = this.catRoot.position;
    this.root.add(mesh);
    this.lantern = { mesh, mat, t: 0, x0: c.x + 0.8, y0: c.y + 0.6, z0: c.z + 0.6 };
    this.game.ui.showToast('A paper lantern drifts past toward the bridge. Follow it home when you are ready.', 5200);
  }

  /* ---------------- sound: small tones on the game's sfx bus ---------------- */

  _bus() {
    const a = this.game.audio;
    return a && a.initialized && a.ctx && a.buses ? a : null;
  }

  chime(freq, dur = 1.6, gain = 0.05) {
    const a = this._bus(); if (!a) return;
    const c = a.ctx, t = c.currentTime;
    for (const [mul, gn] of [[1, gain], [2.01, gain * 0.35], [3.0, gain * 0.12]]) {
      const o = c.createOscillator(), v = c.createGain();
      o.type = 'sine'; o.frequency.value = freq * mul;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(gn, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(v).connect(a.buses.sfx); o.start(t); o.stop(t + dur + 0.05);
    }
  }

  drum(freq = 72, dur = 0.9, gain = 0.04) {
    const a = this._bus(); if (!a) return;
    const c = a.ctx, t = c.currentTime;
    const o = c.createOscillator(), v = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + dur * 0.35);
    f.type = 'lowpass'; f.frequency.value = 260;
    v.gain.setValueAtTime(gain, t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(v).connect(a.buses.sfx);
    o.start(t); o.stop(t + dur + 0.03);
  }

  step(kind) {
    const a = this._bus(); if (!a || !a.playFootstep) return;
    if (kind === 'water') return a.playFootstep('water');
    a.playFootstep(['deck', 'boat', 'rack', 'futon', 'rope', 'branch', 'step'].includes(kind) ? 'wood'
      : ['ridge', 'eave', 'roof', 'canopy', 'cap', 'street', 'perch'].includes(kind) ? 'stone' : 'grass');
  }

  /* ---------------- quality ---------------- */

  applyQuality(q) {
    const trim = q === 'low' || q === 'medium';
    this.atmosphere.setLowPower(trim);
    this.sky.setLowPower(trim);
    this.sky.sun.castShadow = this.shadows && q !== 'low';
  }

  setQuality(q) { if (this.ready) this.applyQuality(q); }

  /* ---------------- per frame ---------------- */

  burstAtRunner(kind) {
    this.rail.place(this.runner.s, this.runner.depth, this.tmpImpact);
    this.tmpImpact.y = this.runner.y + 0.04;
    this.atmosphere.burst(kind, this.tmpImpact, this.rail.tangentAt(this.runner.s));
  }

  stepPhysics(inp) {
    const r = this.runner, cat = this.cat;
    const prevGrounded = r.grounded;
    r.step(STEP, inp, this.time);
    const ev = r.events;
    if (ev.includes('drop')) this.beginStepOff(r, this.vis);
    if (ev.includes('jump') && cat) cat.onJump();
    const bounced = ev.includes('bounce');
    if (bounced) { if (cat) cat.onJump(); this.burstAtRunner('futon'); }
    if (ev.includes('land') || ev.includes('mantle')) {
      if (cat && !prevGrounded) cat.onLand();
      const kind = (r.ground || r.lastGround)?.kind;
      this.step(kind);
      if (!bounced && kind !== 'rope' && kind !== 'branch' && kind !== 'boat' && kind !== 'water') this.burstAtRunner('dust');
    }
    if (ev.includes('splash')) {
      const a = this._bus(); if (a && a.playSplash) a.playSplash();
      this.burstAtRunner('water'); if (cat) cat.onLand();
    }
    this.time += STEP;
  }

  /**
   * One frame. input: RooftopManager.readInput() (null while the veil is up or
   * the game is paused-like: the cat stands still). draw is false for the
   * settling tick in init().
   */
  update(dt, input, draw = true) {
    dt = Math.max(0, Math.min(0.1, dt));
    const r = this.runner;
    let inp = input || NO_INPUT;
    this.lastMove = inp.move || 0;
    if (input && input.reset) this.respawn();
    if (this.finale) inp = NO_INPUT;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 24) {
      const use = this.autopilot && !this.finale ? this.autopilot.input(r, this.time, STEP) : inp;
      this.stepPhysics(use);
      inp = { ...inp, jumpPressed: false, downPressed: false, jumpReleased: false };
      this.acc -= STEP;
      steps++;
    }
    // A runner below every surface (never expected: the street is always there).
    if (r.y < -6) this.startAt(this.lastCheckpoint.s, this.lastCheckpoint.y);

    // The sky by progress along the route, night at the finale (ruling D3).
    const prog = this.finale ? 1 : clamp(r.s / this.level.length, 0, 1);
    if (Math.abs(prog - this.lastPhase) > 0.002) {
      const night = this.sky.setPhase(prog);
      this.lastPhase = prog;
      const envScale = 1 - 0.75 * night;
      for (const m of this.envMats) m.envMapIntensity = (m.userData.env0 ?? 1) * envScale;
    }
    const night = this.sky.night;
    this.world.update(this.time, night, platOffset, this.level.platforms, r.s);

    // Where the cat is drawn: depth eases toward what it stands on (or will land on).
    const vis = this.vis, catRoot = this.catRoot;
    let targetD = r.depth;
    if (!r.grounded) {
      const below = r.support(r.s, r.y, 0, 40);
      if (below) targetD = platDepth(below, r.s);
    }
    vis.depth = r.alley !== null ? targetD : damp(vis.depth, targetD, r.grounded ? 10 : 5, dt);
    const drawY = this.stepOffHeight(r, vis, dt);
    const p = this.rail.place(r.s, vis.depth);
    catRoot.position.set(p.x, drawY, p.z);
    const goal = r.facing > 0 ? 0 : Math.PI;
    const turning = Math.abs(vis.phi - goal) > 0.3;
    vis.phi = damp(vis.phi, goal, 11, dt);
    const t = this.pathTangent(r);
    const n = { x: -t.z, z: t.x };
    const dir = { x: t.x * Math.cos(vis.phi) + n.x * Math.sin(vis.phi), z: t.z * Math.cos(vis.phi) + n.z * Math.sin(vis.phi) };
    if (this.finale) {
      const f = this.sky.fires[1].center;
      const want = Math.atan2(f.x - catRoot.position.x, f.z - catRoot.position.z);
      let d = want - catRoot.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      catRoot.rotation.y += d * Math.min(1, dt * 2.5);
    } else {
      catRoot.rotation.y = Math.atan2(dir.x, dir.z);
    }
    let pitch = 0;
    if (r.grounded && r.ground.y1 !== r.ground.y0) {
      const gnd = r.ground;
      pitch = -Math.atan2(gnd.y1 - gnd.y0, gnd.s1 - gnd.s0) * Math.cos(vis.phi);
    }
    catRoot.rotation.x = damp(catRoot.rotation.x, 0, 10, dt);
    const cat = this.cat;
    if (cat) {
      cat.group.rotation.x = damp(cat.group.rotation.x, pitch, 10, dt);
      cat.group.rotation.z = 0;
      cat.setProwling(r.onRope || this.lowHeadroom(catRoot.position, r));
      const speed = Math.abs(r.vs);
      cat.update(dt, speed, r.grounded, r.sprinting && speed > 4.5, turning && speed < 0.6, r.inWater, null);
      const sup = r.grounded ? null : r.support(r.s, r.y, 0, 40);
      cat.updateShadow(sup ? Math.max(0, r.y - platTop(sup, r.s, this.time)) : 0);
      if (r.peering && !this.finale) {
        const ahead = this.rail.place(r.s + r.facing * 0.8, vis.depth);
        cat.setLookTarget(this.tmpL.set(ahead.x, r.y - 1.5, ahead.z).add(this.origin));
      } else if (!this.finale) cat.setLookTarget(null);
      catRimUniforms.uRimDir.value.copy(this.sky.lightDir);
      catRimUniforms.uRimStrength.value = 0.35;
    }

    this.updateChidori(dt);
    if (!this.finale) {
      const entrance = r.alley === null ? alleyEntrance(this.level, r.s, r.y) : null;
      if (entrance && entrance !== this._entranceShown && input) {
        this._entranceShown = entrance;
        this.game.ui.showToast('↓ ' + entrance.name, 2200);
      } else if (!entrance) this._entranceShown = null;
      this.checkPickups();
      this.checkProgress();
    } else this.updateFinale(dt, input);

    // Lantern light pool: the nearest anchors to the cat.
    if (night > 0.05) {
      const near = this.world.lights.map((v) => [v, v.distanceToSquared(catRoot.position)]).sort((a, b) => a[1] - b[1]).slice(0, this.lightPool.length);
      this.lightPool.forEach((l, i) => {
        const e = near[i];
        if (!e || e[1] > 30 * 30) { l.intensity = 0; return; }
        l.position.copy(e[0]);
        l.intensity = 2.2 * night;
      });
    } else this.lightPool.forEach((l) => { l.intensity = 0; });

    this.updateCamera(dt);
    this.sky.update(dt, this.time, catRoot.position);
    this.atmosphere.update(dt, this.time, prog, night, catRoot.position);
    if (draw) this.syncCamera();
  }

  /** The local camera, offset by the origin, onto the game camera. */
  syncCamera() {
    const gc = this.game.camera, c = this.cam;
    gc.position.copy(c.position).add(this.origin);
    gc.quaternion.copy(c.quaternion);
    if (gc.fov !== c.fov || gc.far !== c.far || gc.near !== c.near) {
      gc.fov = c.fov; gc.far = c.far; gc.near = c.near;
      gc.updateProjectionMatrix();
    }
    gc.updateMatrixWorld(true);
  }

  updateCamera(dt, playerOnly = false) {
    const camera = this.cam, cam = this.camState, level = this.level, rail = this.rail;
    const runner = this.runner, catRoot = this.catRoot, guideRoot = this.guideRoot;
    const gc = this.game.camera;
    if (camera.aspect !== gc.aspect) { camera.aspect = gc.aspect; camera.updateProjectionMatrix(); }
    const reduceMotion = this.reduceMotion;
    if (this.finale) {
      const k = smooth(0, 4.5, this.finale.t);
      const c = catRoot.position;
      const want = this.tmpV.set(c.x - 5.2, c.y + 0.7, c.z + 3.6);
      camera.position.lerp(want, 1 - Math.exp(-(reduceMotion ? 1.2 : 2.2) * dt * (0.3 + k)));
      const look = this.tmpL.set(0, 0, 0);
      for (const fire of this.sky.fires) look.add(fire.center);
      look.multiplyScalar(1 / this.sky.fires.length); look.y -= 20;
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
    cam.soloT = Math.max(0, (cam.soloT || 0) - dt);
    const together = !inAlley && r.alley === null && !playerOnly && !cam.soloT;
    const subjects = together ? [catRoot, guideRoot] : [catRoot];
    const lastMouth = level.mouths[level.mouths.length - 1];
    const vertical = smooth(lastMouth.s0 - 5, lastMouth.s0, runner.s);
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
    camera.fov = 40 + cam.alley * 18 + (portrait ? 3 : 0);
    camera.updateProjectionMatrix();
    const direction = side.clone().lerp(behind, cam.alley).normalize();
    const baseDistance = (portrait ? 9 : 8.4) * (1 - cam.alley) + 2.5 * cam.alley;
    const baseHeight = (4.5 + vertical * 0.5) * (1 - cam.alley) + 1.25 * cam.alley;
    const point = new THREE.Vector3(), offset = new THREE.Vector3();
    const obstacles = this.world.obstacles;
    const sightPoints = [], sightGroups = [];
    for (const subject of subjects) {
      const first = sightPoints.length;
      subject.updateMatrixWorld(true);
      const model = subject === catRoot ? this.cat : this.guide;
      if (model && model.head && model.chest && model.hips) {
        // the model's world positions, back into the run's frame
        sightPoints.push(model.head.getWorldPosition(new THREE.Vector3()).sub(this.origin).add(new THREE.Vector3(0, 0.05, 0)));
        const chest = model.chest.getWorldPosition(new THREE.Vector3()).sub(this.origin);
        for (const x of [-0.09, 0.09]) sightPoints.push(chest.clone().addScaledVector(side, x));
        sightPoints.push(model.hips.getWorldPosition(new THREE.Vector3()).sub(this.origin));
      } else sightPoints.push(subject.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
      sightGroups.push([first, sightPoints.length]);
    }
    const clear = (position) => {
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
    if (!found) searchClose: for (const d of [1.8, 1.2, 0.8]) for (const h of [1.1, 0.75, 0.45]) {
      place(d, h);
      if (fits() <= 1.12 && clear(camera.position)) { candidate.copy(camera.position); found = true; break searchClose; }
    }
    if (!found && together) {
      cam.soloT = 0.8; cam.init = false;
      this.updateCamera(0, true); return;
    }
    if (!found) {
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
        if (fits() > 1.001 || !clear(eased)) camera.position.copy(candidate);
      }
    }
    camera.lookAt(cam.center); camera.updateMatrixWorld(true);
    cam.boom.subVectors(camera.position, cam.center);
    cam.dist = cam.boom.length();
    cam.clear = found;
    cam.mode = inAlley ? 'alley' : 'street';
  }

  /** Draw the run with the game's renderer and camera (no valley post chain). */
  render() {
    const r = this.game.renderer;
    const exposure = r.toneMappingExposure;
    r.toneMappingExposure = this.exposure.toneMappingExposure;
    r.setRenderTarget(null);
    r.render(this.scene, this.game.camera);
    r.toneMappingExposure = exposure;
  }

  /** For headless review and the console: where the run is. */
  get state() {
    const r = this.runner;
    return {
      s: +r.s.toFixed(2), y: +r.y.toFixed(2), grounded: r.grounded, mouth: this.currentMouth && this.currentMouth.id,
      greeted: [...this.greeted], finale: !!this.finale, lantern: !!this.lantern, camera: this.camState.mode, clear: this.camState.clear
    };
  }
}
