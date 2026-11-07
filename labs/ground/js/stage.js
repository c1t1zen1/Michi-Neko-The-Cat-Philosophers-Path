// The stage: the 16 × 12 m Kyoto corner and everything that lives on it. It
// owns the scene, the ground field and material, the marks, stones, props,
// trees, the game's grass, Michi and the village cats, the weather, litter,
// the tools and the painted finish. main.js only wires the page to it.
import * as THREE from 'three';
import { CatWalker } from '../../shared/catwalk.js';
import { paintLayers } from './paint.js';
import { GroundField, PAVE } from './field.js';
import { createGroundMaterial, groundMesh, setDefines, FULL } from './ground.js';
import { PrintBuffer, GrooveBuffer } from './marks.js';
import { StoneSet, PROUD } from './stones.js';
import { buildMachiya, buildInuyarai, buildGutter, buildEngawa, buildKakei, Trees, buildSurroundings, buildSkirt, buildBackdropTrees } from './props.js';
import { paintStage, rojiStones, LAYOUT, POIS, laneZ, W, D } from './scene.js';
import { Kemonomichi, VillageCats } from './walkers.js';
import { Weather, Rain, Snow, Ladle, sunFactor } from './weather.js';
import { Litter } from './litter.js';
import { Finish } from './finish.js';
import { mulberry32, sstep, clamp } from './util.js';
import { GameToday } from './today.js';

const SEASON = {
  spring: { grass: [1.02, 1.04, 0.92], moss: [1.05, 1.06, 0.95], blades: [1.0, 1.04, 0.92], flowers: 0.8 },
  summer: { grass: [0.94, 1.0, 0.9], moss: [0.95, 1.0, 0.92], blades: [0.92, 1.0, 0.92], flowers: 0.35 },
  autumn: { grass: [1.12, 0.98, 0.72], moss: [1.04, 0.98, 0.82], blades: [1.22, 1.0, 0.7], flowers: 0.15 },
  winter: { grass: [1.08, 0.92, 0.72], moss: [0.95, 0.92, 0.8], blades: [1.3, 1.02, 0.72], flowers: 0 }
};

export class Stage {
  constructor(renderer, el, { hour = 9.5, quality = 'lush', onSay = () => {}, SkyClass }) {
    this.renderer = renderer;
    this.el = el;
    this.say = onSay;
    this.quality = quality;
    this.t = 0;
    this.timeScale = 1;
    this.season = 'summer';
    this.defines = { ...FULL };
    this.opt = { grass: true, trees: true, props: true, litter: true, village: false, finish: 0.45, grade: 1, skirt: true, valley: true, cats: true, wearOn: true };
    const scene = this.scene = new THREE.Scene();
    // the valley's own sky: dome, painted clouds, sun, fill, golden-hour bounce,
    // palettes and fog, with its clock stopped and its weather picker pinned
    const sky = this.sky = new SkyClass(scene);
    sky.cycleSpeed = 0;
    sky.dayTime = hour;
    sky.weatherTimer = 1e9;
    sky.weatherPool = ['clear'];
    sky.attachRenderer(renderer);
    const sc = sky.sun.shadow.camera;
    sc.left = sc.bottom = -11.5; sc.right = sc.top = 11.5; sc.near = 90; sc.far = 200;
    sc.updateProjectionMatrix();
    sky.sun.shadow.mapSize.set(quality === 'eco' ? 1024 : 2048, quality === 'eco' ? 1024 : 2048);
    this.origin = new THREE.Vector3();
    sky.update(0, this.origin);

    // the ground
    this.layers = paintLayers();
    this.field = new GroundField({ w: W, d: D, k: 16 });
    paintStage(this.field);
    this.prints = new PrintBuffer(renderer, this.field, { k: quality === 'eco' ? 64 : 96 });
    this.grooves = new GrooveBuffer(renderer, this.field, { k: 64 });
    this.eave = new THREE.Vector4(-8.5, LAYOUT.houseX1, LAYOUT.dripZ, 1);
    this.mat = createGroundMaterial(this.field, this.layers, { marks: { print: this.prints, groove: this.grooves }, eave: this.eave });
    this.U = this.mat.userData.u;
    this.ground = groundMesh(this.field, this.mat, quality === 'eco' ? 160 : 256);
    scene.add(this.ground);
    // what props, stones and litter share with the ground's weather
    this.W = { uWet: this.U.uWet, uWetSpec: this.U.uWetSpec, uSnow: this.U.uSnow, uEave: this.U.uEave, uTime: this.U.uTime };

    this.stones = new StoneSet(scene, this.W, { heightAt: (x, z) => this.field.heightAt(x, z) });
    this.resetStones();
    this.props = new THREE.Group();
    this.props.name = 'Props';
    this.props.add(buildMachiya(this.W), buildInuyarai(this.W), buildEngawa(this.W));
    this.gutter = buildGutter(this.W);
    this.kakei = buildKakei(this.W);
    this.props.add(this.gutter, this.kakei);
    scene.add(this.props);
    this.skirt = buildSkirt(this.field);
    this.valley = buildSurroundings(this.W);
    scene.add(this.skirt, this.valley);
    this.today = null;

    this.weather = new Weather();
    const box = { x0: this.field.x0 - 1, z0: this.field.z0 - 1, w: W + 2, d: D + 2 };
    this.rain = new Rain(box, quality === 'eco' ? 1400 : 2600);
    this.snow = new Snow(box, quality === 'eco' ? 1500 : 3000);
    this.ladle = new Ladle();
    scene.add(this.rain.group, this.snow.mesh, this.ladle.mesh);
    this.litter = new Litter(this.field, { heightAt: (x, z) => this.heightAt(x, z), catches: (x, z) => this.catches(x, z) });
    scene.add(this.litter.mesh);

    this.sim = new Kemonomichi(this.field, {
      pois: POIS, blocked: (x, z) => this.blocked(x, z), puddle: (x, z) => this.puddleAt(x, z),
      barrier: () => this.stones.stones.find((s) => s.tag === 'barrier') || null
    });
    this.ghostMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.85 }), 40);
    this.ghostMesh.count = 0;
    this.ghostMesh.frustumCulled = false;
    this.ghostMesh.name = 'A season of cats';
    scene.add(this.ghostMesh);
    this.ff = null;

    this.finish = new Finish(renderer);
    this.cam = null;
    this.rnd = mulberry32(11);
    this.carry = 0;            // how wet Michi's paws are
    this.clocks = { mask: 0, upload: 0, sim: 0, regrow: 0, fall: 0, think: 0 };
    this.field.upload();
    this.setHour(hour);
    this.stats = { tris: 0, calls: 0 };
  }

  /* ---------------- async: trees, grass, cats ---------------- */

  async loadTrees(F) {
    this.F = F;
    this.trees = new Trees(F, this.W);
    this.trees.setSeason(this.season);
    this.scene.add(this.trees.group);
    try { this.valley.add(buildBackdropTrees(F, this.valley.userData.heightAt)); } catch (e) { console.warn('backdrop trees', e); }
  }
  loadGrass(GM) {
    const mask = this.mask = new GM.BiomeMask(-8, -8, 16, 256);
    mask.bake();
    const quality = this.quality === 'eco' ? 0.7 : 1;
    const grass = this.grass = new GM.GrassSystem(this.scene, { mask, wind: 0.55, gustLit: 0.45 });
    grass.addZone('near', { name: 'near', x: 0, z: 0, hw: 8, hd: 6, spacing: 0.11 / Math.sqrt(quality) });
    grass.addZone('thicket', { name: 'thicket', x: 0, z: 0, hw: 8, hd: 6, spacing: 0.42 });
    grass.addZone('flowers', { name: 'flowers', x: 0, z: 0, hw: 8, hd: 6, spacing: 0.3 });
    grass.addZone('susuki', { name: 'susuki', x: 0, z: 0, hw: 8, hd: 6, spacing: 0.8 });
    this.bladeBase = grass.layers.filter((L) => L.mat.uniforms.uRoot).map((L) => ({ L, root: L.mat.uniforms.uRoot.value.clone(), mid: L.mat.uniforms.uMid.value.clone(), tip: L.mat.uniforms.uTip.value.clone() }));
    this.writeMask();
    this.setSeason(this.season);
  }
  async loadCats() {
    const L = LAYOUT;
    this.cat = new CatWalker({
      parent: this.scene, dom: this.el, camera: () => this.cam, ground: this.ground,
      heightAt: (x, z) => this.heightAt(x, z), bounds: { x0: -7.85, x1: 7.85, z0: -5.85, z1: 5.85 },
      blocked: (x, z) => this.blocked(x, z), start: { x: -3.2, z: laneZ(-3.2), heading: Math.PI / 2 }
    });
    this.cat.onStep = (paw, x, z, h) => this.onPaw(this.cat, paw, x, z, h, 1);
    this.cat.active = true;
    this.village = new VillageCats({
      CatWalker, scene: this.scene, stage: this, heightAt: (x, z) => this.heightAt(x, z),
      bounds: { x0: -7.85, x1: 7.85, z0: -5.85, z1: 5.85 }, blocked: (x, z) => this.blocked(x, z), sim: this.sim,
      onStep: (w, paw, x, z, h) => this.onPaw(w, paw, x, z, h, 0.85)
    });
    this.village.setVisible(false);
    const rig = { applyEnv() {} };
    await this.cat.load({ scene: this.scene, renderer: this.renderer, sunDir: this.sky.sunDir, rig });
    this.cat.ready = true;
    this.villageLoad = this.village.load({ scene: this.scene, renderer: this.renderer, sunDir: this.sky.sunDir, rig });
    this.sim.refresh();
  }

  /* ---------------- queries ---------------- */

  heightAt(x, z) { return Math.max(this.field.heightAt(x, z), this.stones.topAt(x, z)); }
  blocked(x, z) {
    const L = LAYOUT;
    if (z < L.wallZ + 0.12 && x < L.houseX1 + 0.12) return true;
    if (z < L.wallZ + 0.4 && ((x > -7.6 && x < -3.3) || (x > -1.65 && x < 0.9))) return true;
    const E = L.engawa;
    if (x > E.x0 && x < E.x1 && z > E.z0 - 0.02) return true;
    if (Math.hypot(x - L.maple.x, z - L.maple.z) < 0.28 || Math.hypot(x - L.pine.x, z - L.pine.z) < 0.28) return true;
    if (Math.hypot(x - LAYOUT.tsukubai.x - 0.95, z - LAYOUT.tsukubai.z + 0.55) < 0.14) return true;
    return this.stones.blockedAt(x, z);
  }
  puddleAt(x, z) {
    const w = this.weather.water;
    if (w < -0.2) return 0;
    const i = this.field.i(x, z), g = this.field.wear[i];
    const depth = w - this.field.heightAt(x, z);
    return depth > 0.003 && (g > 0.45 || this.field.S[i * 8 + 4] > 0.5) ? Math.min(1, depth * 60) : 0;
  }
  /** how well the ground at (x, z) holds a sliding leaf: grass, kerbs, ruts, walls */
  catches(x, z) {
    const f = this.field, i = f.i(x, z), S = f.S, o = i * 8;
    const grass = (S[o] + S[o + 7]) * (1 - sstep(0.1, 0.4, f.wear[i]));
    const kerb = S[o + 4] > 0.3 && f.style[i] === PAVE.slabs ? 0.6 : 0;
    const low = clamp(-f.heightAt(x, z) * 8, 0, 0.7);
    const wall = z < LAYOUT.wallZ + 0.5 && x < LAYOUT.houseX1 ? 0.8 : 0;
    return Math.max(grass * 0.7 + S[o + 1] * 0.3, kerb, low, wall);
  }

  /* ---------------- paws ---------------- */

  onPaw(walker, paw, x, z, h, weight) {
    if (!this.field.inside(x, z)) return;
    const surf = this.field.surfaceAt(x, z);
    const pud = this.puddleAt(x, z);
    surf.puddle = pud > 0.2;
    const isMichi = walker === this.cat;
    // paws pick water up in puddles, wet ground and snow, and leave it in the next prints
    if (isMichi) {
      const pick = Math.max(pud, surf.wet * 0.8, this.weather.wet * 0.5, surf.snow * this.weather.snow * 0.6);
      this.carry = Math.max(this.carry * 0.86, pick);
    }
    const carry = isMichi ? this.carry : Math.max(pud, surf.wet * 0.6);
    const soft = { earth: 1, sand: 1.1, gravel: 0.7, grass: 0.5, wild: 0.4, moss: 0.6, needles: 0.5, paving: 0, tataki: 0.15 }[surf.mat] ?? 0.6;
    const depth = Math.min(1, (soft * (0.45 + this.weather.wet * 0.55) + this.weather.snow * 0.9) * weight);
    if (this.defines.PRINTS) this.prints.stamp(x, z, h, 0.085 * weight, depth, carry * 0.9, paw >= 2 ? 1 : 0);
    if (this.opt.wearOn) this.field.step(x, z, 0.1, weight * this.timeScale);
    if (this.weather.snow > 0.2) this.field.sweepSnow(x, z, 0.06, 0.5);
    this.litter.kick(x, z, h);
    if (paw === 0 && this.sound) this.sound.step(surf, weight);
  }

  /* ---------------- tools ---------------- */

  /** phase: 'down' | 'move' | 'up'; (x, z) the ground point; prev the last point */
  tool(name, phase, x, z, prev, o = {}) {
    const f = this.field, r = o.size ?? 0.6;
    if (name === 'sweep' && prev && phase === 'move') {
      const d = Math.hypot(x - prev.x, z - prev.z);
      if (d < 0.04) return false;
      this.grooves.segment(prev.x, prev.z, x, z, 1, this.prints);
      this.litter.sweep(prev.x, prev.z, x, z);
      f.sweepSnow(x, z, 0.3, 0.8);
      this.sound?.sweep(d * 10);
      return true;
    }
    if (name === 'rake') {
      if (phase === 'down') {
        const rock = this.stones.near(x, z, 0.5).find((s) => s.tag === 'rock');
        if (rock) { this.grooves.rings(rock.x, rock.z, Math.max(rock.rx, rock.rz) + 0.08, 2, this.prints); this.sound?.rake(1); return 'ring'; }
      }
      if (prev && phase === 'move') {
        const d = Math.hypot(x - prev.x, z - prev.z);
        if (d < 0.05) return false;
        this.grooves.segment(prev.x, prev.z, x, z, 0, this.prints);
        this.sound?.rake(Math.min(1.5, d * 8));
        return true;
      }
      return false;
    }
    if (name === 'ladle' && phase === 'down') {
      const cp = this.cam ? this.cam.position : new THREE.Vector3(0, 5, 10);
      const a = Math.atan2(z - cp.z, x - cp.x);
      this.ladle.throw(x, z, a, this.rnd);
      this.sound?.ladle();
      return true;
    }
    if (name === 'stones' && phase === 'down') {
      const hit = this.stones.near(x, z, 0.05).find((s) => s.tag === 'tobi' || s.tag === 'laid');
      if (hit) this.stones.clear((s) => s === hit);
      else this.stones.tobi(x, z, 0.17 + this.rnd() * 0.06, { rot: this.rnd() * 3, seed: Math.floor(this.rnd() * 999), tag: 'laid' });
      this.stones.rebuild();
      this.sound?.stone();
      return true;
    }
    if (name === 'barrier' && phase === 'down') {
      this.stones.barrier(x, z); this.stones.rebuild(); this.sound?.stone();
      this.say('A sekimori-ishi: “not this way, please.” Watch the cats’ trail bend round it.');
      return true;
    }
    if (name === 'dig' && (phase === 'down' || phase === 'move')) {
      f.sculpt(x, z, r * 0.6, (o.raise ? 1 : -1) * 0.012);
      return true;
    }
    const MATS = { moss: 'moss', grass: 'grass', earth: 'earth', gravel: 'gravel', sand: 'sand', pave: 'paving', tataki: 'tataki', needles: 'needles' };
    if (MATS[name] && (phase === 'down' || phase === 'move')) {
      if (name === 'pave') f.paveStyle = o.pave ?? PAVE.setts;
      f.paint(MATS[name], x, z, r, 0.32);
      if (name === 'grass' || name === 'moss') f.each(x, z, r, (i, k) => { f.wear[i] *= 1 - 0.3 * k; f.G0[i] *= 1 - 0.3 * k; }, r * 0.5);
      if (name === 'earth') f.each(x, z, r, (i, k) => { f.wear[i] = Math.max(f.wear[i], 0.5 * k); }, r * 0.5);
      return true;
    }
    return false;
  }

  /* ---------------- the village and the seasons ---------------- */

  setVillage(on) {
    this.opt.village = on;
    if (!this.village) return;
    this.village.enabled = on;
    this.village.setVisible(on && !this.ff);
    if (on) this.say('Luna, Mochi and Kuro are out. Every paw-down wears the ground a little.');
  }
  fastForward(days = 90) {
    if (this.ff) return;
    this.sim.refresh();
    this.sim.spawnGhosts(16);
    this.ff = { t: 0, dur: 22, days, prevT: this.field.T, rain: false, attract: this.sim.attract };
    this.sim.attract = Math.max(this.sim.attract, 4);
    this.field.T = 14;
    if (this.village) this.village.setVisible(false);
    this.say(`A season passes: ${days} days of cats in twenty seconds.`);
  }
  _ff(dt) {
    const F = this.ff;
    F.t += dt;
    const k = Math.min(1, F.t / F.dur);
    const falls = this.sim.stepGhosts(dt * 5.5, 1.3);
    for (const [x, z] of falls) if (this.field.inside(x, z)) this.field.step(x, z, 0.1, 1.5);
    const n = Math.min(this.sim.ghosts.length, 40), m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const g = this.sim.ghosts[i]; m4.makeTranslation(g.x, this.heightAt(g.x, g.z) + 0.08, g.z); this.ghostMesh.setMatrixAt(i, m4); }
    this.ghostMesh.count = n;
    this.ghostMesh.instanceMatrix.needsUpdate = true;
    if (Math.floor(F.t * 2) !== Math.floor((F.t - dt) * 2)) this.sim.refresh();
    // one wet spell midway: the trails bend round their own puddles
    if (!F.rain && k > 0.45) { F.rain = true; this.weather.set('after'); }
    this.dayLabel = Math.round(k * F.days);
    if (k >= 1) {
      this.field.T = F.prevT;
      this.sim.attract = F.attract;
      this.ff = null;
      this.ghostMesh.count = 0;
      this.sim.ghosts = [];
      if (this.village) this.village.setVisible(this.opt.village);
      this.say('The trails the cats agreed on are still there. Pave one, or let it grow back.');
      this.dayLabel = null;
    }
  }
  /** shin-gyō-sō: formalise whatever the feet have worn */
  pave(kind) {
    const f = this.field, n = f.n, S = f.S;
    // only what the feet made: wear above the standing G0, on ground that was grass or moss
    const fresh = (i) => f.wear[i] - f.G0[i] > 0.3 && S[i * 8] + S[i * 8 + 1] + S[i * 8 + 7] > 0.35 && S[i * 8 + 4] < 0.3 && S[i * 8 + 2] < 0.4;
    let count = 0;
    if (kind === 'gyo') {
      const cands = [];
      for (let j = 2; j < f.nz - 2; j += 2) for (let i = 2; i < f.nx - 2; i += 2) {
        const idx = j * f.nx + i, g = f.wear[idx] - f.G0[idx];
        if (g > 0.4 && fresh(idx) && !this.blocked(f.xOf(i), f.zOf(j))) cands.push([g, f.xOf(i), f.zOf(j)]);
      }
      cands.sort((a, b) => b[0] - a[0]);
      const placed = [];
      for (const [, x, z] of cands) {
        if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.52)) continue;
        if (this.stones.near(x, z, 0.3).length) continue;
        placed.push([x, z]);
        this.stones.tobi(x, z, 0.17 + this.rnd() * 0.06, { rot: this.rnd() * 3, seed: Math.floor(this.rnd() * 999), tag: 'laid' });
      }
      for (let i = 0; i < n; i++) if (fresh(i)) f.G0[i] = 0.04;
      f.T = 25; setTimeout(() => { f.T = 180; }, 9000);
      this.stones.rebuild();
      count = placed.length;
      this.say(`Gyō: ${count} stepping stones laid on the trail; the moss and grass will close in round them.`);
    } else {
      for (let i = 0; i < n; i++) {
        const g = f.wear[i], o = i * 8;
        if (!fresh(i) && !(kind === 'shin' && g - f.G0[i] > 0.15 && S[o + 4] < 0.3)) continue;
        if (kind === 'shin') {
          if (g > 0.5) { for (let c = 0; c < 8; c++) S[o + c] = 0; S[o + 4] = 1; f.style[i] = PAVE.nobedan; f.G0[i] = 0.35; count++; }
          else if (g > 0.26) { const a = sstep(0.26, 0.5, g); for (let c = 0; c < 8; c++) S[o + c] *= 1 - a; S[o + 2] += a; f.G0[i] = 0.1; }
        } else if (g > 0.35) {
          f.G0[i] = Math.max(f.G0[i], g * 0.9);
          if (g > 0.6) S[o + 2] = Math.max(S[o + 2], 0.22);
          count++;
        }
      }
      f.touch();
      this.say(kind === 'shin'
        ? 'Shin: the trail is paved as nobedan, with a gravel shoulder where the feet spread.'
        : 'Sō: the gardener keeps it as packed earth with a little gravel; it will not grow back now.');
    }
    this.writeMask();
    return count;
  }
  regrowAll() {
    const f = this.field;
    const T = f.T;
    f.T = 3;
    this.say('Letting it all grow back…');
    setTimeout(() => { f.T = T; }, 6000);
  }
  resetStones() {
    this.stones.clear();
    for (const s of rojiStones()) this.stones.tobi(s.x, s.z, s.r, { rot: s.rot, seed: s.seed, tag: 'tobi' });
    const L = LAYOUT;
    this.stones.kutsunugi(L.kutsunugi.x, L.kutsunugi.z);
    this.stones.tsukubai(L.tsukubai.x, L.tsukubai.z, L.tsukubai.r);
    this.stones.tobi(L.tsukubai.x - 0.05, L.tsukubai.z - 0.62, 0.25, { seed: 61, tag: 'mae', kind: 'granite' });
    for (const [x, z, r] of L.sand.rocks) this.stones.rock(x, z, r, Math.round(x * 10));
    this.stones.barrier(L.barrier.x, L.barrier.z);
    this.stones.rebuild();
  }
  resetAll() {
    paintStage(this.field);
    this.prints.clear(); this.grooves.clear(); this.litter.clear();
    this.resetStones();
    this.setSeason(this.season, true);
    this.weather.set('clear'); this.weather.wet = this.weather.wetSpec = 0; this.weather.water = -0.3; this.weather.snow = 0;
    this.rakeSand();
    this.writeMask();
  }
  /** the gardener's morning: rake the sand into sazanami-mon and rings round each rock */
  rakeSand() {
    const S = LAYOUT.sand;
    for (let z = S.z0 + 0.4; z < S.z1 - 0.2; z += 0.74) this.grooves.segment(S.x0 + 0.12, z, S.x1 - 0.12, z, 0);
    for (const [x, z, r] of S.rocks) this.grooves.rings(x, z, r * 1.1 + 0.06, r > 0.4 ? 2 : 1);
  }

  setSeason(s, force = false) {
    if (s === this.season && !force && this._seasonSet) return;
    this._seasonSet = true;
    this.season = s;
    const P = SEASON[s];
    this.U.uGrassTint.value.setRGB(...P.grass);
    this.U.uMossTint.value.setRGB(...P.moss);
    this.trees?.setSeason(s);
    if (this.bladeBase) for (const b of this.bladeBase) {
      const u = b.L.mat.uniforms, t = P.blades;
      u.uRoot.value.copy(b.root).multiply(new THREE.Color(...t));
      u.uMid.value.copy(b.mid).multiply(new THREE.Color(...t));
      u.uTip.value.copy(b.tip).multiply(new THREE.Color(...t));
    }
    this.litter.clear();
    const f = this.field, L = LAYOUT;
    // shikimatsuba: in winter the gardener lays pine needles over the roji moss
    for (let i = 0; i < f.n; i++) {
      const o = i * 8, x = f.xOf(i % f.nx), z = f.zOf(Math.floor(i / f.nx));
      if (s === 'winter' && x < L.roji.x1 - 0.3 && z > L.roji.z0 + 0.3 && f.S[o + 1] > 0.5) { f.S[o + 6] = 0.85 * f.S[o + 1]; }
      else if (s !== 'winter') f.S[o + 6] = 0;
    }
    f.touch();
    const r = this.rnd, F = this.field;
    if (s === 'autumn') {
      this.litter.scatter('maple', 380, (rn) => { const a = rn() * 6.28, d = Math.sqrt(rn()) * 3.6; return [L.maple.x + Math.cos(a) * d * 1.2, L.maple.z + Math.sin(a) * d]; });
      this.litter.scatter('maple', 120, (rn) => [F.x0 + rn() * F.w, F.z0 + rn() * F.d]);
      this.litter.scatter('ginkgo', 60, (rn) => [F.x0 + rn() * F.w, F.z0 + rn() * F.d]);
    } else if (s === 'spring') {
      this.litter.scatter('petal', 420, (rn) => [F.x0 + rn() * F.w, F.z0 + rn() * F.d]);
    } else if (s === 'winter') {
      this.litter.scatter('needle', 140, (rn) => { const a = rn() * 6.28, d = Math.sqrt(rn()) * 3; return [L.pine.x + Math.cos(a) * d, L.pine.z + Math.sin(a) * d]; });
    } else {
      this.litter.scatter('maple', 30, (rn) => { const a = rn() * 6.28, d = Math.sqrt(rn()) * 3; return [L.maple.x + Math.cos(a) * d, L.maple.z + Math.sin(a) * d]; }, 'green');
    }
    void r;
    this.writeMask();
  }

  setHour(h) {
    this.hour = h;
    this.sky.dayTime = ((h % 24) + 24) % 24;
    this.sky.update(0, this.origin);
    this.sky.invalidateEnvironment();
    this._sunUniforms();
  }
  _sunUniforms() {
    const U = this.U, sky = this.sky;
    U.uSunDir.value.copy(sky.sunDir);
    U.uSunCol.value.copy(sky.sun.color).multiplyScalar(sky.sunDir.y > 0 ? 1 : 0);
    this.night = clamp((0.05 - sky.sunDir.y) / 0.2, 0, 1);
  }
  setDefines(d) { Object.assign(this.defines, d); setDefines(this.mat, this.defines); }
  setGameToday(on) {
    if (on && !this.today) { this.today = new GameToday(this.field); this.scene.add(this.today.group); }
    if (this.today) this.today.group.visible = on;
    this.ground.visible = !on;
  }

  /** write the grass mask from the field (throttled by the caller) */
  writeMask() {
    if (!this.mask) return;
    this.field.writeGrassMask(this.mask, { flowers: SEASON[this.season].flowers });
    // nothing grows through a stone: clear the mask under every footprint
    const m = this.mask, d = m.texture.image.data;
    for (const st of this.stones.stones) {
      const R = Math.max(st.rx, st.rz) * 1.08 + 0.04;
      const i0 = Math.max(0, Math.floor((st.x - R - m.x0) * m.k)), i1 = Math.min(m.res - 1, Math.ceil((st.x + R - m.x0) * m.k));
      const j0 = Math.max(0, Math.floor((st.z - R - m.z0) * m.k)), j1 = Math.min(m.res - 1, Math.ceil((st.z + R - m.z0) * m.k));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = m.x0 + (i + 0.5) / m.k, z = m.z0 + (j + 0.5) / m.k;
        if (Math.hypot((x - st.x) / (st.rx + 0.04), (z - st.z) / (st.rz + 0.04)) < 1.08) { const p = (j * m.res + i) * 4; d[p] = d[p + 1] = d[p + 2] = d[p + 3] = 0; }
      }
    }
  }

  /* ---------------- per frame ---------------- */

  update(dt, camera) {
    this.cam = camera;
    this.t += dt;
    const U = this.U, f = this.field, sun = sunFactor(this.sky.sunDir);
    U.uTime.value = this.t;
    this.weather.update(dt, { sun, speed: this.ff ? 3 : 1 });
    this.weather.apply(U);
    const m = this.weather.mode, skyW = m === 'snow' ? 'snow' : m === 'rain' ? 'rain' : m === 'drops' ? 'cloudy' : 'clear';
    if (this.sky.targetWeather !== skyW) { this.sky.weatherPool = [skyW]; this.sky.setWeather(skyW); }
    this.sky.update(dt, this.origin);
    // the game tunes its horizon bounce for dark grass; pale masa-do takes half
    this.sky.bounce.intensity *= 0.5;
    this.scene.fog.near = 60; this.scene.fog.far = 520;
    this._sunUniforms();
    const c = this.clocks;
    c.regrow += dt;
    if (c.regrow > 0.25) { f.regrow(c.regrow); f.dry(c.regrow, 1 / 80); if (this.weather.snowFall > 0.1) f.snowRecover(c.regrow, 0.02); c.regrow = 0; }
    if (this.ff) this._ff(dt);
    c.think += dt;
    if (this.village && !this.ff) { this.village.update(dt, c.think > 0.15); if (c.think > 0.15) c.think = 0; }
    if (this.cat) this.cat.update(dt, { camera });
    c.sim += dt;
    if (c.sim > 1.2 && this.opt.village && !this.ff) { this.sim.refresh(); c.sim = 0; }
    // marks: rain fills prints, sun dries the wet ones
    this.prints.update(dt, { depth: (1 / 420) * (1 + this.weather.rain * 14) * (this.ff ? 30 : 1), dry: (1 / 22) * (0.4 + sun) * (1 - this.weather.rain * 0.9) });
    this.ladle.update(dt, (x, z) => this.heightAt(x, z), (x, z, s) => {
      if (!f.inside(x, z)) return;
      f.wetAt(x, z, s * 1.6, 0.75);
      this.prints.stamp(x, z, 0, s * 2.2, 0, 1, 2);
    });
    // litter: autumn leaves keep falling, spring petals keep blowing in
    c.fall += dt;
    if (c.fall > 0.25 && this.opt.litter) {
      c.fall = 0;
      const r = this.rnd;
      if (this.season === 'autumn' && this.trees && r() < 0.8) { const [x, y, z] = this.trees.crown(r); this.litter.add('maple', x, y, z); }
      if (this.season === 'spring' && r() < 0.7) this.litter.add('petal', f.x0 + 0.2, 1.5 + r() * 2.5, f.z0 + r() * f.d);
    }
    this.litter.update(dt, { wind: 0.6 + this.weather.rain * 0.4, wet: this.weather.wet, time: this.t });
    this.litter.mesh.visible = this.opt.litter;
    this.rain.update(dt, this.weather.rain, this.sky.resolvePalette().horizon);
    this.snow.update(dt, this.weather.snowFall);
    this.gutter.position.y = -LAYOUT.gutter.depth + 0.03 + this.weather.rain * 0.025 + Math.max(0, this.weather.water + 0.1) * 0.2;
    const tr = this.kakei.userData.trickle;
    tr.scale.x = tr.scale.z = 1 + Math.sin(this.t * 31) * 0.15;
    if (this.F) this.F.updateFoliage(this.t, this.sky, this.cat ? new THREE.Vector3(this.cat.pos.x, this.cat.y, this.cat.pos.y) : null);
    if (this.grass && this.opt.grass) {
      const focus = this.cat ? new THREE.Vector3(this.cat.pos.x, 0, this.cat.pos.y) : new THREE.Vector3();
      this.grass.update(dt, { renderer: this.renderer, camera, focus, cat: this.cat?.cat, sky: this.sky, wind: 0.5 + this.weather.rain * 0.5, others: this.village?.positions() });
    }
    // uploads: the field at ~15 Hz, the grass mask at ~4 Hz
    c.upload += dt; c.mask += dt;
    if (c.upload > 0.066) { f.upload(); c.upload = 0; }
    if (c.mask > 0.25) { this.writeMask(); c.mask = 0; }
    if (this.sound) {
      const L = LAYOUT, b = this.cat ? Math.hypot(this.cat.pos.x - L.tsukubai.x, this.cat.pos.y - L.tsukubai.z) : 9;
      this.sound.ambience(dt, { rain: this.weather.rain, basin: clamp(1 - b / 4, 0, 1) });
    }
    // visibility
    if (this.grass) for (const m of this.grass.meshes) m.visible = this.opt.grass && m.visible !== false && (m.userData.qualityOn ?? true);
    if (this.trees) this.trees.group.visible = this.opt.trees;
    this.props.visible = this.opt.props;
    this.skirt.visible = this.opt.skirt;
    this.valley.visible = this.opt.valley;
  }

  /**
   * compare: { left(), right(), paintOnly } renders the stage twice into the
   * finish target, split at `split` (0..1), "before" on the left
   */
  render(rect, camera, { split = -1, compare = null } = {}) {
    const r = this.renderer;
    const rt = this.finish.begin(rect);
    if (camera.isPerspectiveCamera) { const a = rect.width / Math.max(1, rect.height); if (Math.abs(camera.aspect - a) > 1e-4) { camera.aspect = a; camera.updateProjectionMatrix(); } }
    rt.scissorTest = false;
    r.setRenderTarget(rt);
    r.clear();
    r.info.reset();
    if (compare && !compare.paintOnly && split >= 0) {
      const sw = Math.round(rt.width * split);
      rt.scissorTest = true;
      compare.left();
      rt.scissor.set(0, 0, sw, rt.height); r.setRenderTarget(rt);
      r.render(this.scene, camera);
      compare.right();
      rt.scissor.set(sw, 0, rt.width - sw, rt.height); r.setRenderTarget(rt);
      r.render(this.scene, camera);
      rt.scissorTest = false;
    } else r.render(this.scene, camera);
    this.stats.calls = r.info.render.calls; this.stats.tris = r.info.render.triangles;
    this.finish.sun(camera, this.sky.sunDir, this.sky.sun.color, this.sky.sunDir.y);
    this.finish.draw(rect, { paint: this.opt.finish, grade: this.opt.grade, split: compare?.paintOnly ? split : -1, night: this.night });
  }
}
