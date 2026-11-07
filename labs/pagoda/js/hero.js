// The viewing platform: one tower in its town, seen from Michi's perch, up
// the street, from the valley bridge, or in orbit. The distance dial walks
// the camera from 5 m to 2 km while the tower trades detail tiers (hero →
// mid → far → baked impostor) by its height in pixels, crossfading through a
// Bayer screen door. Bells swing in the wind and ring when struck; the
// storeys do the snake dance round the heart pillar; the whole tower can be
// raised from its stone podium.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LightRig } from '../../shared/light.js';
import { Callouts, Split } from '../../shared/ui.js';
import { loadCatModule } from '../../shared/game.js';
import { buildPagoda, resolveOpts } from './pagoda.js';
import { originalPagoda, ORIGINAL_SCALE } from './original.js';
import { makeAir, patchAir, patchFade, patchRim } from './air.js';
import { World, heightAt } from './world.js';
import { Impostor } from './impostor.js';
import { FX_LAYER } from './finish.js';
import { Sound } from './sound.js';
import { clamp } from './util.js';

export const VIEWS = [
  { key: 'perch', name: 'Michi’s perch', hint: 'from the hill, over the roofs' },
  { key: 'street', name: 'the street', hint: 'up the slope, like Yasaka-dōri' },
  { key: 'valley', name: 'the valley bridge', hint: 'as the game frames it, past the forest wall' },
  { key: 'orbit', name: 'anywhere (orbit)', hint: 'drag to turn, scroll to step back' },
  { key: 'kite', name: 'a kite', hint: 'high above the town' }
];
export const HOURS = [
  { v: 5.9, label: 'Dawn mist', kasumi: 1 }, { v: 9.5, label: 'Morning', kasumi: 0.35 }, { v: 12.5, label: 'Noon', kasumi: 0.2 },
  { v: 17.5, label: 'Golden', kasumi: 0.5 }, { v: 19.3, label: 'Light-up', kasumi: 0.3 }, { v: 22.5, label: 'Moonlight', kasumi: 0.15 }
];
const TIERS = ['hero', 'mid', 'far', 'impostor'];
const GROUND = heightAt(0, 0);

export class Hero {
  constructor(lab, stage, finisher) {
    this.lab = lab;
    this.stage = stage;
    this.fin = finisher;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 16000);
    this.camera.layers.enable(FX_LAYER);
    this.air = makeAir();
    this.uRim = { value: 0 };
    this.rig = new LightRig(this.scene, { hour: 17.5, shadows: true, fog: false, sky: true });
    this.rig.sun.shadow.mapSize.set(2048, 2048);
    this.rig.sun.shadow.bias = -0.0006;
    this.scene.environment = new THREE.PMREMGenerator(lab.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    this.world = new World(this.scene, this.air, { season: 'autumn' });
    this.impostor = new Impostor(lab.renderer, this.air);
    this.scene.add(this.impostor.mesh);
    this.sound = new Sound();

    Object.assign(this, {
      opts: resolveOpts({ preset: 'yasaka' }), finish: 'background', view: 'perch', dist: 190, hour: 17.5, season: 'autumn', wind: 0.45,
      tierMode: 'auto', tier: 'hero', prevTier: null, fadeT: 1, kasumi: 1, lightUp: true, frameOn: false, explode: 0, labels: false,
      compare: false, quake: 0, quakeLeft: 0, riseT: 1, look: { yaw: 0, pitch: 0 }, t: 0, pxH: 0, needBake: true
    });
    this.center = new THREE.Vector3(0, GROUND, 0);
    this.controls = new OrbitControls(this.camera, stage);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', () => { if (this.view === 'orbit') this.dist = this.camera.position.distanceTo(this.controls.target); });
    this.callouts = new Callouts(stage);
    this.callouts.visible = false;
    this.split = new Split(stage, { value: 0.5, left: 'The game today', right: 'The new tower' });
    this.ray = new THREE.Raycaster();
    this._bindInput();
    this.rebuild();
    this.setHour(this.hour);
  }

  /* ---------------- the towers ---------------- */

  rebuild(patch = null) {
    if (patch) this.opts = resolveOpts({ ...this.opts, ...patch });
    for (const b of Object.values(this.builds || {})) { this.scene.remove(b.group); b.dispose(); }
    this.builds = {};
    for (const detail of ['hero', 'mid', 'far']) {
      const b = buildPagoda(this.opts, { detail, shadows: true });
      b.uFade = { value: detail === this.tier ? 1 : 0 };
      b.group.traverse((m) => {
        if (!m.isMesh) return;
        for (const mat of [].concat(m.material)) { patchAir(mat, this.air, { uplight: true }); patchRim(mat, this.air, this.uRim); patchFade(mat, b.uFade); }
      });
      b.group.position.copy(this.center);
      b.group.visible = detail === this.tier;
      b.state.onRing = (bell, s) => this._ringSound(bell, s);
      this.scene.add(b.group);
      this.builds[detail] = b;
    }
    const H = this.builds.hero.dims.H;
    this.H = H;
    this.air.uUpH.value = H;
    if (!this.original) {
      this.original = originalPagoda();
      this.original.group.traverse((m) => { if (m.isMesh) { patchAir(m.material, this.air, { uplight: true }); m.castShadow = m.receiveShadow = true; } });
      this.scene.add(this.original.group);
    }
    this.original.group.scale.setScalar(ORIGINAL_SCALE * (H / this.original.dims.H));
    this.original.group.position.copy(this.center);
    this.original.group.visible = false;
    this.builds.hero.setFrame(this.frameOn);
    this.builds.hero.setExplode(this.explode);
    this.needBake = true;
    this.rig.applyEnv();
    this._fitShadow();
    this.lab.onRebuild?.();
  }

  /** A new record: proportions, paint and roof from the preset; part choices kept. */
  setPreset(key) {
    const keep = {};
    for (const k of ['brackets', 'rafters', 'body', 'koran', 'sorinStyle', 'bells', 'podium', 'snow']) keep[k] = this.opts[k];
    const roof = this.opts.roof === 'bark' ? 'tile' : this.opts.roof;
    this.opts = resolveOpts({ ...keep, preset: key });
    if (this.opts.roof !== 'bark') this.opts.roof = roof;
    this.rebuild();
    if (this.view === 'valley') this.dist = 57 * (this.H / 19.4);
    this.setHour(this.hour);
  }

  get active() { return this.builds[this.tier === 'impostor' ? 'far' : this.tier]; }
  get heroBuild() { return this.builds.hero; }

  _fitShadow() {
    const c = this.rig.sun.shadow.camera, H = this.H || 30;
    c.left = c.bottom = -H * 0.75; c.right = c.top = H * 0.75; c.near = 1; c.far = H * 8;
    c.updateProjectionMatrix();
  }

  /* ---------------- settings ---------------- */

  setHour(h) {
    this.hour = h;
    this.rig.setHour(h);
    this.rig.hemi.intensity *= 1.75;   // the town is Lambert: no environment fill, so lend it more sky
    const P = this.rig.palette, A = this.air;
    const night = clamp((-this.rig.sunDir.y + 0.04) / 0.16, 0, 1);
    A.uAirCol.value.copy(P.horizon).lerp(P.skyTop, 0.25).multiplyScalar(0.95 - night * 0.55);
    A.uSunCol.value.copy(P.sun).multiplyScalar(0.9 * (1 - night) + 0.05);
    A.uSunW.value.copy(this.rig.sunDir);
    A.uUplight.value = this.lightUp ? night * 1.6 : 0;
    this.uRim.value = (1 - night) * clamp(1 - this.rig.sunDir.y * 2.4, 0, 1) * 0.55;
    const hz = HOURS.reduce((a, b) => (Math.abs(b.v - h) < Math.abs(a.v - h) ? b : a));
    this.hourKasumi = hz.kasumi;
    const haze = (this.world.haze ?? 1) * (h < 7.5 ? 1.6 : 1);
    A.uBeta.value.set(1.6e-4, 2.3e-4, 4.1e-4).multiplyScalar(haze);
    this.rig.sun.position.copy(this.rig.sunDir).multiplyScalar((this.H || 30) * 3).add(this.center);
    this.rig.sun.target.position.copy(this.center).setY(GROUND + (this.H || 30) * 0.4);
    this.needBake = true;
  }
  setSeason(s) {
    this.season = s;
    const S = this.world.setSeason(s);
    for (const b of Object.values(this.builds)) b.group.traverse((m) => { const U = m.material?.userData?.roofU; if (U) U.uSnow.value = S.snow; });
    this.opts.snow = S.snow;
    this.setHour(this.hour);
  }
  setWind(w) { this.wind = w; this.sound.setWind(w, this.t); }
  setTierMode(m) { this.tierMode = m; }
  setView(v) {
    this.view = v;
    this.controls.enabled = v === 'orbit';
    this.look.yaw = this.look.pitch = 0;
    if (v === 'orbit') {
      this.controls.target.set(0, GROUND + this.H * 0.42, 0);
      const d = Math.min(this.dist, 900);
      this.camera.position.set(d * 0.62, GROUND + this.H * 0.5 + d * 0.18, d * 0.76);
      this.controls.update();
    }
    if (v === 'valley') this.dist = 57 * (this.H / 19.4);
    this.world.arc.visible = v === 'valley';
    this.lab.onView?.(v);
  }
  setDistance(d) {
    this.dist = d;
    if (this.view === 'orbit') {
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this.camera.position.copy(this.controls.target).addScaledVector(dir, d);
      this.controls.update();
    }
  }
  setFrame(on) { this.frameOn = on; this.builds.hero.setFrame(on); this.builds.mid.setFrame(on); }
  setExplode(e) { this.explode = e; for (const k of ['hero', 'mid']) this.builds[k].setExplode(e); }
  setLabels(on) {
    this.labels = on;
    this.callouts.visible = on;
    if (on) {
      const list = this.builds.hero.anchors.filter((a) => !a.frame || this.frameOn).map((a) => ({ ...a, pos: a.pos.clone() }));
      this.callouts.set(list);
      for (const c of this.callouts.items) c.el.classList.toggle('left', c.side === 'left');
      if (this.dist > this.H * 3.2) { this.setView('orbit'); this.setDistance(this.H * 1.9); this.lab.onView?.('orbit'); }
    }
  }
  setCompare(on) { this.compare = on; this.split.enabled = on; }
  setLightUp(on) { this.lightUp = on; this.setHour(this.hour); }
  ring() { this.sound.setOn(this.sound.on || this.lab.soundOn); for (const k of ['hero']) this.builds[k].strike(-1, 1); this.cat?.setMood('curious', 3); }
  shake(sec = 6) { this.quakeLeft = sec; this.cat?.setMood('alert', sec); }
  raise() { this.riseT = 0; this.lockTier = true; }

  _ringSound(bell, s) {
    if (!this.sound.on) return;
    const p = bell.hook.clone().add(this.center).project(this.camera);
    const vol = clamp(70 / Math.max(10, this.dist), 0.04, 1);
    this.sound.bell(bell.pitch, s * vol, p.x * 0.8);
  }

  /* ---------------- Michi ---------------- */

  async loadCat() {
    try {
      const mod = await loadCatModule();
      const cat = new mod.Cat({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 });
      this.cat = cat;
      this.catRoot = new THREE.Group();
      this.catRoot.add(cat.group);
      this.scene.add(this.catRoot);
      mod.catRimUniforms.uRimStrength.value = 0.35;
      mod.catRimUniforms.uRimColor.value.set(0xffd9a0);
      this.catRim = mod.catRimUniforms;
      cat.startIdleAction('sit', 1e9);
      this.rig.applyEnv();
      this.lab.onCatReady?.();
    } catch (e) {
      console.error('Michi could not load', e);
      this.lab.onCatError?.();
    }
  }

  /* ---------------- input ---------------- */

  _bindInput() {
    const el = this.stage;
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.split, .callout, button')) return;
      drag = { x: e.clientX, y: e.clientY, yaw: this.look.yaw, pitch: this.look.pitch, t: performance.now() };
    });
    addEventListener('pointermove', (e) => {
      if (!drag || this.view === 'orbit') return;
      this.look.yaw = clamp(drag.yaw - (e.clientX - drag.x) * 0.0035, -1.1, 1.1);
      this.look.pitch = clamp(drag.pitch - (e.clientY - drag.y) * 0.0035, -0.5, 0.6);
    });
    addEventListener('pointerup', (e) => {
      if (!drag) return;
      const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
      drag = null;
      if (moved < 5) this._click(e);
    });
    el.addEventListener('wheel', (e) => {
      if (this.view === 'orbit') return;
      e.preventDefault();
      this.setDistance(clamp(this.dist * Math.exp(e.deltaY * 0.0012), 5, 2000));
      this.lab.onDistance?.(this.dist);
    }, { passive: false });
    el.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'r') this.ring(); else if (k === 'q') this.shake(); else if (k === 'b') this.raise();
      else if (k === 'f') this.lab.toggleFrame?.(); else if (k === 'l') this.lab.toggleLabels?.();
      else if (k === '[' || k === ']') { this.setDistance(clamp(this.dist * (k === ']' ? 1.25 : 0.8), 5, 2000)); this.lab.onDistance?.(this.dist); }
    });
  }

  _click(e) {
    const b = this.builds.hero;
    if (!b.bellMesh || this.tier !== 'hero') return;
    const r = this.stage.getBoundingClientRect();
    this.ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, this.camera);
    b.bellMesh.boundingSphere = null;
    const hit = this.ray.intersectObject(b.bellMesh, false)[0];
    if (hit && hit.instanceId !== undefined) {
      this.sound.setOn(this.sound.on || this.lab.soundOn);
      b.strike(hit.instanceId, 1.4);
      if (this.cat) { this.cat.setLookTarget(hit.point); this.lookUntil = this.t + 2.5; this.cat.setMood('curious', 2.5); }
    }
  }

  /* ---------------- per frame ---------------- */

  _placeCamera(dt) {
    const cam = this.camera, H = this.H, d = this.dist, look = new THREE.Vector3(0, GROUND + H * 0.45, 0);
    let pos;
    if (this.view === 'perch') {
      const P = this.world.setPerch(d);
      const f = look.clone().sub(P).setY(0).normalize(), side = new THREE.Vector3(-f.z, 0, f.x);
      pos = P.clone().addScaledVector(f, -2.5).addScaledVector(side, -0.8 * clamp(this.camera.aspect / 1.6, 0.25, 1)).add(new THREE.Vector3(0, 1.25, 0));
      if (this.catRoot) {
        this.catRoot.position.copy(P);
        this.catRoot.rotation.y = Math.atan2(f.x, f.z);
        this.catRoot.visible = true;
      }
      cam.near = 0.05;
    } else {
      if (this.catRoot) this.catRoot.visible = false;
      if (this.view === 'street') pos = new THREE.Vector3(0.8, heightAt(0.8, d) + 1.55, d);
      else if (this.view === 'valley') { const dir = new THREE.Vector3(-0.97, 0, 0.24).normalize(); pos = dir.multiplyScalar(d); pos.y = heightAt(pos.x, pos.z) + 2.4; this.world.placeArc(pos, H); }
      else if (this.view === 'kite') { const a = this.t * 0.03; pos = new THREE.Vector3(Math.sin(a) * d, GROUND + Math.max(60, d * 0.55), Math.cos(a) * d); look.y = GROUND + H * 0.3; }
      cam.near = clamp(d * 0.004, 0.2, 4);
    }
    cam.far = 16000;
    if (this.view === 'orbit') {
      this.controls.update();
      cam.near = clamp(this.dist * 0.003, 0.1, 3);
    } else {
      cam.position.copy(pos);
      cam.lookAt(look);
      cam.rotateY(this.look.yaw);
      cam.rotateX(this.look.pitch + (this.view === 'perch' ? -0.1 : this.view === 'street' ? -0.02 : 0));
    }
    cam.updateProjectionMatrix();
  }

  _chooseTier(rect) {
    const cam = this.camera, dist = cam.position.distanceTo(this.center.clone().setY(GROUND + this.H * 0.45));
    const pxPerM = rect.height / (2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    this.pxPerM = pxPerM;
    this.pxH = this.H * pxPerM;
    let want = this.tierMode;
    if (want === 'auto') want = this.pxH >= 380 ? 'hero' : this.pxH >= 110 ? 'mid' : this.pxH >= 26 ? 'far' : 'impostor';
    if (this.lockTier) want = this.tier;
    if (want !== this.tier) { this.prevTier = this.tier; this.tier = want; this.fadeT = 0; }
  }

  _applyFade(dt) {
    this.fadeT = Math.min(1, this.fadeT + dt / 0.45);
    const k = this.fadeT;
    for (const key of ['hero', 'mid', 'far']) {
      const b = this.builds[key];
      const isNew = key === this.tier;
      const isOld = key === this.prevTier && k < 1;
      b.group.visible = isNew || isOld;
      b.uFade.value = isNew ? k : isOld ? 1 - k : 0;
    }
    const im = this.impostor.mesh;
    im.visible = this.tier === 'impostor' || (this.prevTier === 'impostor' && k < 1);
    if (im.visible && this.needBake) this.bake();
  }

  bake() {
    const far = this.builds.far, vis = far.group.visible, f = far.uFade.value;
    far.group.visible = true; far.uFade.value = 1;
    this.impostor.bake(far.group, this.rig, this.scene.environment);
    far.group.visible = vis; far.uFade.value = f;
    this.needBake = false;
  }

  frame(dt, t, rect) {
    this.t = t;
    this._placeCamera(dt);
    this._chooseTier(rect);
    this._applyFade(dt);
    // the build animation
    if (this.riseT < 1) {
      this.riseT = Math.min(1, this.riseT + dt / 7);
      for (const k of ['hero', 'mid', 'far']) this.builds[k].setRise(this.riseT);
      if (this.riseT >= 1) { this.lockTier = false; this.setFrame(this.frameOn); }
    }
    // snake dance
    if (this.quakeLeft > 0) this.quakeLeft -= dt;
    const want = this.quakeLeft > 0 ? clamp(this.quakeLeft, 0, 1) * clamp((6 - this.quakeLeft) * 2, 0, 1) : 0;
    this.quake += (want - this.quake) * Math.min(1, dt * 4);
    const windDir = new THREE.Vector3(Math.cos(t * 0.05), 0, Math.sin(t * 0.05) * 0.6 + 0.4).normalize();
    for (const k of ['hero', 'mid']) { const b = this.builds[k]; b.setQuake(this.quake); b.update(dt, t, { wind: this.wind, windDir }); }
    this.builds.far.setQuake(this.quake); this.builds.far.update(dt, t, { wind: 0 });
    // the world and the light
    this.world.update(this.camera, this.rig, t);
    this.air.uSunW.value.copy(this.rig.sunDir);
    this.kasumiNow = this.kasumi * (this.hourKasumi ?? 0.4);
    // Michi
    if (this.cat && this.catRoot.visible) {
      if (!this.lookUntil || t > this.lookUntil) this.cat.setLookTarget(new THREE.Vector3(0, GROUND + this.H * 0.7, 0));
      this.cat.update(dt, 0, true, false, false, false, null);
      if (this.catRim) this.catRim.uRimDir.value.copy(this.rig.sunDir);
    }
    if (this.callouts.visible) {
      const b = this.builds.hero, list = this.callouts.items;
      for (const c of list) { const a = b.anchors.find((x) => x.id === c.id); if (a) c.pos.copy(a.pos).add(this.center); }
      this.callouts.update(this.camera, rect);
    }
    if (this.sound.on) this.sound.setWind(this.wind, t);
  }

  sunScreen(rect) {
    const p = this.rig.sunDir.clone().multiplyScalar(5000).add(this.camera.position).project(this.camera);
    const vis = p.z < 1 && this.rig.sunDir.y > -0.05 ? clamp(1.4 - Math.max(Math.abs(p.x), Math.abs(p.y)) * 0.6, 0, 1) : 0;
    return new THREE.Vector3(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, vis * clamp(this.rig.sunDir.y * 6 + 0.3, 0, 1));
  }

  _show(which) {
    const orig = which === 'original';
    this.original.group.visible = orig;
    for (const key of ['hero', 'mid', 'far']) {
      const b = this.builds[key];
      if (orig) { b._vis = b.group.visible; b.group.visible = false; } else if (b._vis !== undefined) { b.group.visible = b._vis; b._vis = undefined; }
    }
    if (orig) { this._imVis = this.impostor.mesh.visible; this.impostor.mesh.visible = false; } else if (this._imVis !== undefined) { this.impostor.mesh.visible = this._imVis; this._imVis = undefined; }
  }

  render(r, rect) {
    const o = { kasumi: this.kasumiNow ?? 0.4, kasumiNear: this.camera.position.distanceTo(this.center) * 1.15 + 40, sun: this.sunScreen(rect), time: this.t, lineFar: 1600 };
    if (this.compare) {
      const s = this.split.value;
      this._show('original');
      this.fin.render(this.scene, this.camera, rect, this.finish, { ...o, clip: [0, s] });
      this._show('new');
      this.fin.render(this.scene, this.camera, rect, this.finish, { ...o, clip: [s, 1] });
    } else this.fin.render(this.scene, this.camera, rect, this.finish, o);
  }

  /** What still reads at this distance: each feature's size on screen. */
  ladder() {
    const b = this.builds.hero, k = this.pxPerM || 0;
    return b.features.map((f) => ({ ...f, px: f.size * k }));
  }

  recipe() {
    const o = this.opts, keep = {};
    for (const k of ['preset', 'H', 'ratio', 'top', 'overhang', 'oTaper', 'sorin', 'curve', 'start', 'sori', 'flare', 'pitch', 'pitchUp', 'paint', 'roof', 'brackets', 'rafters', 'body', 'koran', 'sorinStyle', 'bells', 'mokoshi', 'podium']) keep[k] = typeof o[k] === 'number' ? +o[k].toFixed(4) : o[k];
    return keep;
  }

  counts() {
    const b = this.active;
    if (this.tier === 'impostor') return { meshes: 1, tris: 2, instances: 0 };
    return b.counts();
  }
}
