// pocket.js — the Roof Road run inside the game (BUILD_GUIDE_FABLE R6.3; spec
// §5–§7, §8.2). RooftopManager (manager.js) builds this the first time the cat
// goes through the noren and drives it while the Roof Road is up.
//
// The run itself is the Roof Road's own: the level, runner physics, world,
// sky, atmosphere and companion modules, and its view of a run (where the cat
// is drawn, the camera, Chidori following, pickups, mouths and the finale) is
// rooftops/js/runview.js, the module the sandbox page shares (ruling R80).
// This file is only the game's glue:
//   - the scene: built behind the veil in its own THREE.Scene, parked at the
//     manager's origin (0, -2400, 0); rendered with the game's renderer and
//     camera, no valley post chain (the page has none either), its own exposure;
//   - the cat is the game's Michi (player.mesh is parented into the run while
//     it is up; Player.update is skipped), Chidori is a second Cat as on the page;
//   - input comes from the game's Controls (RooftopManager.readInput);
//   - the HUD is the game's toasts; greeting a Shōki, the finale and the way
//     home go to the manager (journal, XP, save); sounds go to the game's sfx bus;
//   - the camera logic runs on a local camera in the run's frame and is copied
//     to the game camera offset by the origin each frame (same projection).
//
// No timers and no fail states: the sky follows distance along the route, a
// missed jump lands in the street, R (a convenience) returns to the last
// lantern, and a cat that somehow ends below the world is put back on the last
// lantern's roof.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLevel } from './level.js?v=20261116a';
import { Runner } from './physics.js?v=20261116a';
import { Autopilot } from './autopilot.js?v=20261116a';
import { RunView } from './runview.js?v=20261116a';
import { buildWorld } from '../../rooftops/js/build.js';
import { Sky } from '../../rooftops/js/sky.js';
import { RooftopAtmosphere } from '../../rooftops/js/atmosphere.js';
import { alleyEntrance } from '../../rooftops/js/alleys.js';
import { Companion } from '../../rooftops/js/companion.js';
import { AssetRuntime } from '../kit/runtime.js?v=20261116a';
import { Cat, catRimUniforms } from '../cat.js?v=20261116a';
import { PENTATONIC } from './posts.js?v=20261116a';

/** Walk back past here (route metres) once armed and the run hands the cat home. */
const HOME_S = 0.6;
const FIRE_NOTES = [196.0, 220.0, 246.94, 293.66, 329.63];
const WOOD = ['deck', 'boat', 'rack', 'futon', 'rope', 'branch', 'step'];
const STONE = ['ridge', 'eave', 'roof', 'canopy', 'cap', 'street', 'perch'];

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
    // Kept: buildWorld reads opts.reduceMotion every frame (the street people), so setReduceMotion() updates it here.
    this._worldOpts = { reduceMotion: this.reduceMotion, lowPower: this.lowPower, assets: this.assets };
    this.world = buildWorld(level, this._worldOpts);
    this.root.add(this.world.root);
    this.atmosphere = new RooftopAtmosphere(this.root, level, { reduceMotion: this.reduceMotion, lowPower: this.lowPower, assets: this.assets });

    const envMats = [];
    this.root.traverse((o) => {
      const m = o.material;
      if (m && m.isMeshStandardMaterial && !envMats.includes(m)) { envMats.push(m); m.userData.env0 = m.envMapIntensity; }
    });
    const lightPool = [0, 1, 2, 3].map(() => {
      const l = new THREE.PointLight(0xffa24a, 0, 9, 1.6);
      this.root.add(l);
      return l;
    });

    // Michi rides in catRoot while the run is up (attach/detach); Chidori in guideRoot.
    const catRoot = new THREE.Group();
    catRoot.name = 'Roof Road cat';
    this.root.add(catRoot);
    const guideRoot = new THREE.Group();
    guideRoot.name = 'Chidori';
    this.root.add(guideRoot);
    const chidoriModular = this.assets.setFor('roof-chidori') === 'modular' && !this.lowPower;
    const chidoriDef = chidoriModular ? (await import('../characters/defs/chidori.js?v=20261116a')).CHIDORI : null;
    const guide = new Cat(chidoriDef
      ? { def: chidoriDef, quality: 'high' }
      : { fur: 0x8f9095, belly: 0xf3f1ec, accent: 0x55575e, eyeColor: 0x9fd0a8, stripeAmount: 0.55, ribbonColor: 0x3a6fa8 });
    guide.group.scale.setScalar(0.86);
    guide.group.position.y = 0.02;
    guideRoot.add(guide.group);
    this.cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 2000);

    this.view = new RunView({
      level, runner: this.runner, world: this.world, sky: this.sky, atmosphere: this.atmosphere,
      companion: new Companion(level), catRoot, guideRoot, camera: this.cam, guide, cat: null,
      rim: catRimUniforms, lightPool, envMats, origin: this.origin, reduceMotion: this.reduceMotion,
      hooks: this.hooks()
    });
    this.autopilot = null;
    this.lantern = null;
    this.homeArmed = false;
    this.lastMove = 0;
    this.applyQuality(quality);

    // Settle and compile the whole scene once (the page does the same), with
    // the run's own camera: the game camera is the valley's until attach().
    this.view.startAt(1.0, 1.1);
    this.view.frame(0, null);
    this.cam.position.add(this.origin);
    this.cam.updateMatrixWorld(true);
    if (renderer.compileAsync) await renderer.compileAsync(this.scene, this.cam);
    this.cam.position.sub(this.origin);
    this.ready = true;
  }

  /** The view's events, in the game's voice: toasts, the sfx bus, the manager. */
  hooks() {
    const toast = (text, ms) => this.game.ui.showToast(text, ms);
    return {
      viewport: () => {
        const aspect = this.game.camera.aspect;
        if (this.cam.aspect !== aspect) { this.cam.aspect = aspect; this.cam.updateProjectionMatrix(); }
      },
      sound: (name, kind) => {
        if (name === 'land') this.step(kind);
        else if (name === 'splash') { const a = this._bus(); if (a && a.playSplash) a.playSplash(); }
      },
      mouth: (m, first) => {
        if (!first) return;
        toast(`${m.kanji} ${m.romaji} — ${m.title}`, 4200);
        this.chime(PENTATONIC[(m.id - 1) % PENTATONIC.length] * 0.5, 2.4, 0.04);
      },
      shoki: (k, count, total) => {
        this.chime(PENTATONIC[(k.id - 1) % PENTATONIC.length], 2.2, 0.06);
        toast(count >= total ? 'Every Shōki greeted. The roofs are well guarded.' : `A Shōki keeps watch here. (${count}/${total})`, 3200);
        if (this.manager) this.manager.onShoki(k.id, this.view.currentMouth);
      },
      treat: (k) => {
        this.chime(659.25, 1.0, 0.04);
        toast(k.label[0].toUpperCase() + k.label.slice(1) + '.', 3600);
      },
      finale: (m) => {
        toast(`${m.kanji} ${m.romaji} — ${m.title}`, 4200);
        if (this.manager) this.manager.onFinale();
      },
      fire: (i, fire) => {
        this.drum(76 - i * 4, 1.15, 0.04);
        this.chime(FIRE_NOTES[i], 3.5, 0.05);
        toast(fire?.label || fire?.name || 'Okuribi', 1450);
      },
      finaleCard: (count, total) => toast(`屋根道 The Roof Road — ${count} of ${total} Shōki greeted`, 5200)
    };
  }

  /* ---------------- the cat in and out ---------------- */

  /** Michi into the run: player.mesh under the run's cat group, the camera's far plane for the hills. */
  attach() {
    const g = this.game, p = g.player;
    this._saved = {
      parent: p.mesh.parent, pos: p.mesh.position.clone(), rotY: p.mesh.rotation.y,
      far: g.camera.far, near: g.camera.near, fov: g.camera.fov,
      rimStrength: catRimUniforms.uRimStrength.value
    };
    this.view.catRoot.add(p.mesh);
    p.mesh.position.set(0, 0, 0);
    p.mesh.rotation.set(0, 0, 0);
    p.cat.group.rotation.z = 0;
    this.view.cat = p.cat;
    // The comfort setting as the game holds it now (a change made while the pocket was building).
    this.setReduceMotion(g.reducedMotion);
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
    // The valley camera's own lens: the comfort FOV the player has now, not the one at entry.
    g.camera.far = s.far; g.camera.near = s.near;
    g.camera.fov = Number.isFinite(p.fovCurrent) ? p.fovCurrent : s.fov;
    g.camera.updateProjectionMatrix();
    catRimUniforms.uRimStrength.value = s.rimStrength;
    this.view.cat = null;
    this._saved = null;
  }

  /**
   * A new visit: at the first lantern on the bridge, Shōki already greeted (the
   * saved mask) shown as greeted, the sky back at afternoon, the fires out.
   */
  start({ shoki = 0 } = {}) {
    const view = this.view;
    view.restart();
    if (this.guide && this.guide.idleAction) this.guide.endIdleAction();
    view.greeted.clear();
    for (const obj of this.world.dynamic.shoki) {
      const k = obj.userData.pickup;
      const done = k.id >= 1 && k.id <= 31 && !!(shoki & (1 << (k.id - 1)));
      obj.userData.done = done;
      if (done) { view.greeted.add(k.id); view.lightShoki(obj); }
    }
    for (const obj of this.world.dynamic.treats) { obj.userData.done = false; obj.visible = true; }
    if (this.lantern) { this.lantern.mesh.removeFromParent(); this.lantern = null; }
    this.homeArmed = false;
    view.currentMouth = view.level.mouths[0];
    view.seen.add(view.currentMouth.id);
    view.cam.init = false;
    this.cam.fov = 40;
    view.lastPhase = -1;
    view.acc = 0;
    const m = view.currentMouth;
    this.game.ui.showToast(`${m.kanji} ${m.romaji} — ${m.title}`, 4200);
  }

  get guide() { return this.view.guide; }
  get companion() { return this.view.companion; }
  get finale() { return this.view.finale; }
  get greeted() { return this.view.greeted; }

  setAuto(on = true) { this.autopilot = on ? new Autopilot(this.level) : null; }
  /** Stand the cat at route position s (console, review): the view's own startAt. */
  startAt(s, y) { this.view.startAt(s, y); }

  /* ---------------- sound: small tones on the game's sfx bus ---------------- */

  _bus() {
    const a = this.game.audio;
    return a && a.initialized && a.ctx && a.buses ? a : null;
  }

  chime(freq, dur = 1.6, gain = 0.05) {
    const a = this._bus(); if (!a || !Number.isFinite(freq)) return;
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
    a.playFootstep(kind === 'water' ? 'water' : WOOD.includes(kind) ? 'wood' : STONE.includes(kind) ? 'stone' : 'grass');
  }

  /* ---------------- quality ---------------- */

  applyQuality(q) {
    const trim = q === 'low' || q === 'medium';
    this.atmosphere.setLowPower(trim);
    this.sky.setLowPower(trim);
    this.sky.sun.castShadow = this.shadows && q !== 'low';
  }

  setQuality(q) { if (this.ready) this.applyQuality(q); }

  /* ---------------- comfort ---------------- */

  /**
   * Reduce motion, live. The pocket is built once and kept after the cat
   * leaves, so a later change (Game.applyComfort(), and attach() on every
   * entry) has to reach it. Read again every frame, so updated here: the run
   * view's camera easing (RunView.reduceMotion), the sky's cloud drift and sun
   * flicker (Sky.reduceMotion), the atmosphere's clock, petals and impact
   * bursts (RooftopAtmosphere.reduceMotion and its ImpactFX), the street
   * people's pace (buildWorld's opts, this._worldOpts). Build-time only, kept
   * as built until the page reloads: the float's tassel and musician sway
   * (build.js motionScale, a constant taken when the world was built).
   */
  setReduceMotion(on) {
    on = !!on;
    if (!this.view || on === this.reduceMotion) return;
    this.reduceMotion = on;
    this.view.reduceMotion = on;
    this.sky.reduceMotion = on;
    this._worldOpts.reduceMotion = on;
    const a = this.atmosphere;
    a.reduceMotion = on;
    if (a.impacts) a.impacts.reduceMotion = on;
    a.setLowPower(a.lowPower);          // re-derives the petals' visibility (hidden on a trimmed tier with reduce motion)
  }

  /* ---------------- per frame ---------------- */

  /**
   * One frame: the shared run view, then the game's glue (the way home, the
   * lantern after the finale, the alley hint). input: RooftopManager.readInput()
   * (null while the veil is up or the game is paused-like: the cat stands still).
   */
  update(dt, input) {
    dt = Math.max(0, Math.min(0.1, dt));
    const view = this.view, r = this.runner;
    this.lastMove = input ? input.move || 0 : 0;
    if (input && input.reset && view.respawn()) this.game.ui.showToast('Back to the last lantern.', 1600);
    view.frame(dt, input, this.autopilot);
    // A runner below every surface (never expected: the street is always there).
    if (r.y < -6) view.startAt(view.lastCheckpoint.s, view.lastCheckpoint.y);
    if (!view.finale) {
      const entrance = r.alley === null ? alleyEntrance(this.level, r.s, r.y) : null;
      if (entrance && entrance !== this._entranceShown && input) {
        this._entranceShown = entrance;
        this.game.ui.showToast('↓ ' + entrance.name, 2200);
      } else if (!entrance) this._entranceShown = null;
      // The way home: back across the bridge past where the run began.
      if (r.s > 6) this.homeArmed = true;
      if (this.homeArmed && r.s <= HOME_S && r.grounded && this.lastMove < -0.3 && this.manager) {
        this.homeArmed = false;
        this.manager.onLeave();
      }
    } else this.updateLantern(dt, input);
    this.syncCamera();
  }

  /**
   * In the game the finale card has no buttons: a paper lantern drifts past,
   * and following it (any move) takes the cat home. Sitting on is staying a while.
   */
  updateLantern(dt, input) {
    const f = this.view.finale;
    if (f.t > 15.5 && !this.lantern) this.releaseLantern();
    if (!this.lantern) return;
    const l = this.lantern;
    l.t += dt;
    l.mesh.position.set(l.x0 + Math.sin(l.t * 0.4) * 0.6 - l.t * 0.35, l.y0 + l.t * 0.32 + Math.sin(l.t * 1.3) * 0.05, l.z0 - l.t * 0.2);
    l.mat.emissiveIntensity = 1.2 + Math.sin(l.t * 2.1) * 0.15;
    if (input && (Math.abs(input.move) > 0.3 || input.jumpPressed) && f.t > 16.5 && this.manager && !this.manager.transitioning) {
      if (this.view.cat) this.view.cat.endIdleAction();
      this.manager.onLeave();
    }
  }

  releaseLantern() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xf6e2bc, roughness: 0.8, emissive: 0xffa040, emissiveIntensity: 1.2 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8).scale(1, 1.25, 1), mat);
    mesh.name = 'Paper lantern home';
    const c = this.view.catRoot.position;
    this.root.add(mesh);
    this.lantern = { mesh, mat, t: 0, x0: c.x + 0.8, y0: c.y + 0.6, z0: c.z + 0.6 };
    this.game.ui.showToast('A paper lantern drifts past toward the bridge. Follow it home when you are ready.', 5200);
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
    const r = this.runner, v = this.view;
    return {
      s: +r.s.toFixed(2), y: +r.y.toFixed(2), grounded: r.grounded, mouth: v.currentMouth && v.currentMouth.id,
      greeted: [...v.greeted], finale: !!v.finale, lantern: !!this.lantern, camera: v.cam.mode, clear: v.cam.clear
    };
  }
}
