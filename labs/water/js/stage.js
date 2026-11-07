// The stage: 30 x 22 m of valley with a river bending through it. A weir
// upstream, a bridge (any of the kit), kame-ishi downstream, terraced
// paddies on the far bank, and Michi. The water field drives the shaders,
// the petals, the lanterns and the cat; every slot can be swapped live.
import * as THREE from 'three';
import { LightRig } from '../../shared/light.js';
import { Centreline, WaterField, smooth } from './field.js';
import { waterUniforms, createWaterMaterial, syncSky, STYLE_ENV } from './water.js';
import { PlanarMirror } from './mirror.js';
import { RippleSim } from './ripple.js';
import { HeightGrid, createGroundMaterial, setSeason } from './terrain.js';
import { buildBridge, bridgeMaterials } from './bridges.js';
import { propMaterials, buildKameIshi, buildWeir, makeRock, buildReeds, buildToro, buildWillow, buildHasakake, Frogs } from './props.js';
import { buildPaddies } from './paddies.js';
import { RipplePool, Droplets, Floaters, FloatingLanterns, Fireflies, Mist, Rain } from './effects.js';
import { ellipseSolid } from './physics.js';
import { RiverCat } from './cat.js';
import { PaintPass } from './paint.js';
import { cloudDome } from './clouds.js';

const NIGHT_BLUE = new THREE.Color(0x121a32);
export const SEASON_PADDY = { spring: 'mirror', early: 'taue', summer: 'summer', autumn: 'autumn', winter: 'winter' };

function mulberry(a) {
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wave = (x, z) => 0.05 * Math.sin(x * 0.7 + z * 0.3) + 0.04 * Math.sin(z * 0.9 - x * 0.4 + 1.3) + 0.025 * Math.sin(x * 1.9 + z * 1.4);
const sdBox = (px, pz, cx, cz, hx, hz) => {
  const dx = Math.abs(px - cx) - hx, dz = Math.abs(pz - cz) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
};

export class Stage {
  constructor(renderer, el, { hour = 10.5, onSay = null } = {}) {
    this.renderer = renderer;
    this.el = el;
    this.rnd = mulberry(2026);
    this.onSay = onSay;
    this.B = { x0: -15, x1: 15, z0: -11, z1: 11 };
    this.level0 = 0.02;
    this.level = this.level0;
    this.halfW = 3.4;
    this.BX = -4.5; this.KX = 5.5; this.WX = -11;
    this.centre = new Centreline([[-17.5, -0.2], [-8, 1.0], [0, -0.3], [8, -1.4], [17.5, 0.4]]);
    this.zc = (x) => this.centre.zAt(x);
    const lower = { x0: -1, x1: 5.6, z0: -10.6, z1: -6.2, floor: 0.62, level: 0.67 };
    const upper = { x0: 6.6, x1: 13.6, z0: -10.6, z1: -6.2, floor: 0.96, level: 1.01, notch: { side: 'x0', z: -8.4 }, spillTo: lower };
    this.plots = [lower, upper];
    this.S = {
      water: 'kyoto', bridge: 'sanjo', paddy: 'mirror', season: 'spring', hour, rain: 0, paint: 0.35, mirror: true,
      debug: 0, split: null, tool: 'walk', view: 'orbit', quality: 'auto'
    };
    this.wind = { value: new THREE.Vector2(0, 0.7) };

    /* ---- ground and field ---- */
    this.grid = new HeightGrid({ x0: this.B.x0, z0: this.B.z0, w: 30, d: 22, res: 8, fn: (x, z) => this.groundFn(x, z) });
    this.groundAt = (x, z) => this.grid.heightAt(x, z);
    this.field = new WaterField({ x0: this.B.x0, z0: this.B.z0, w: 30, d: 22, res: 8, groundAt: this.groundAt, centre: this.centre, halfW: this.halfW, speed: 1.05, weir: { x: this.WX } });
    this.U = waterUniforms(this.field);
    this.U.uGameEncode.value = 1;
    this.U.uPaint.value = this.S.paint;

    this.scene = new THREE.Scene();
    this.rig = new LightRig(this.scene, { hour, shadows: true, shadowSize: 17 });
    this.rig.sun.shadow.mapSize.set(2048, 2048);
    this.clouds = cloudDome(this.rig);
    this.scene.add(this.clouds);
    this.groundMat = createGroundMaterial(this.U);
    this.terrain = new THREE.Mesh(this.grid.geometry(-1.6), this.groundMat);
    this.terrain.receiveShadow = true;
    this.terrain.name = 'terrain';
    this.scene.add(this.terrain);

    this.waterGeo = new THREE.PlaneGeometry(30, 22, 150, 110);
    this.waterGeo.rotateX(-Math.PI / 2);
    this.waterGeo.translate(0, 0, 0);
    this.waterMats = {};
    this.water = new THREE.Mesh(this.waterGeo, this.matFor('kyoto'));
    this.water.renderOrder = 2;
    this.water.position.y = this.level;
    this.water.name = 'river';
    this.water.frustumCulled = false;
    this.scene.add(this.water);

    /* ---- mirrors, ripple tank, paint ---- */
    this.mirror = new PlanarMirror({ y: this.level, scale: 0.5 });
    this.mirror.hide.push(this.water);
    this.paddyMirrors = [];
    this.sim = null;
    this.paint = new PaintPass();

    /* ---- props ---- */
    this.bmats = bridgeMaterials(this.U);
    this.pmats = propMaterials();
    this.static = new THREE.Group();
    this.scene.add(this.static);
    const kz = this.zc(this.KX);
    this.kame = buildKameIshi({ x: this.KX, zFrom: kz - 3.3, zTo: kz + 3.3, level: this.level0, bedAt: this.groundAt, mats: this.pmats, kinds: ['square', 'kame', 'kame', 'chidori', 'kame', 'kame', 'square'] });
    this.static.add(this.kame.group);
    const wz = this.zc(this.WX);
    this.static.add(buildWeir({ x: this.WX, z0: wz - this.halfW - 0.2, z1: wz + this.halfW + 0.2, level: this.level0, bedAt: this.groundAt, mats: this.pmats }));
    this.rocks = [];
    this.userRocks = [];
    for (const [x, dz, r] of [[1.6, 1.4, 0.42], [-8.4, -1.6, 0.34], [10.6, 1.7, 0.5]]) this.addRock(x, this.zc(x) + dz, r, false);
    this.toro = buildToro({ x: -2.3, y: this.groundAt(-2.3, 6.2), z: 6.2, mats: this.pmats });
    this.static.add(this.toro.group);
    this.toroLight = new THREE.PointLight(0xffa458, 0, 9, 2);
    this.toroLight.position.set(-2.3, this.toro.light.y, 6.2);
    this.scene.add(this.toroLight);
    this.willow = buildWillow({ x: -10.2, y: this.groundAt(-10.2, 6.4), z: 6.4, mats: this.pmats, rnd: this.rnd, wind: this.wind });
    this.static.add(this.willow.group);
    const reedSpots = [];
    for (let i = 0; i < 26; i++) {
      const x = -14 + i * 1.1 + this.rnd() * 0.5, side = i % 3 ? 1 : -1;
      const z = this.zc(x) + side * (this.halfW + 0.15 + this.rnd() * 0.35);
      if (Math.abs(x - this.BX) < 2 || Math.abs(x - this.KX) < 1.4 || Math.abs(x - this.WX) < 1) continue;
      reedSpots.push({ x, z, y: this.groundAt(x, z) });
    }
    this.reeds = buildReeds({ spots: reedSpots, mats: this.pmats, rnd: this.rnd, wind: this.wind });
    this.static.add(this.reeds);
    this.hasakake = buildHasakake({ x0: -12.5, x1: -8.5, z: -8.4, y: this.groundAt(-10.5, -8.4), mats: this.pmats });
    this.static.add(this.hasakake);

    /* ---- effects ---- */
    this.ripples = new RipplePool(this.U);
    this.drops = new Droplets(700);
    this.floaters = new Floaters(800);
    this.lanterns = new FloatingLanterns(10);
    this.fireflies = new Fireflies(reedSpots, 80, this.rnd);
    this.mist = new Mist({ x: 0, y: this.level0, zAt: this.zc });
    this.rain = new Rain();
    this.scene.add(this.drops.points, this.floaters.mesh, this.lanterns.group, this.fireflies.points, this.mist.group, this.rain.lines);

    /* ---- the cat ---- */
    const world = this.world = {
      groundAt: this.groundAt, solids: [], bounds: { x0: this.B.x0 + 0.3, x1: this.B.x1 - 0.3, z0: this.B.z0 + 0.3, z1: this.B.z1 - 0.3 },
      field: this.field,
      levelAt: (x, z) => this.levelAt(x, z),
      route: (a, b) => this.route(a, b),
      leap: () => this.leapSpot(),
      pickables: () => [this.terrain, this.bridge?.group, this.kame.group, this.paddies?.group].filter(Boolean)
    };
    this.cat = new RiverCat({
      world, dom: el, camera: () => this.camera,
      start: { x: this.BX + 1.6, z: this.zc(this.BX) + 6.6, heading: Math.PI },
      fx: {
        ripple: (x, z, s, drift) => this.addRipple(x, z, s, drift),
        splash: (x, y, z, impact) => this.splash(x, y, z, impact),
        drops: this.drops,
        say: (m) => m && this.say(m),
        sound: null
      }
    });
    this.scene.add(this.cat.parent, this.cat.prints.mesh);

    /* ---- slots ---- */
    this.frogs = null;
    this.setBridge(this.S.bridge);
    this.setPaddy(this.S.paddy);
    this.setSeason(this.S.season, { keepPaddy: true });
    this.setHour(hour);
    this.applyWaterEnv();
    this.time = 0;
  }

  /* ---------------- the landform ---------------- */

  groundFn(x, z) {
    let h = 0.32 + wave(x, z) * 0.6;
    h += 0.28 * smooth(7, 11, z) + 0.12 * smooth(-7, -11, z) * smooth(-1, -9, x);
    h += 0.55 * smooth(-8.5, -11, z) * smooth(-0.5, -6, x);
    for (const p of this.plots ?? []) {
      const d = sdBox(x, z, (p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2, (p.x1 - p.x0) / 2, (p.z1 - p.z0) / 2);
      h = Math.max(h, p.floor * smooth(0.95, 0, d) + (d < 0 ? 0 : 0));
      if (d < 0) h = p.floor;
    }
    const c = this.centre.nearest(x, z, {});
    const o = THREE.MathUtils.clamp(-c.k * 9, -1, 1) * this.halfW * 0.32;
    const dn = Math.abs(c.s - o) / (this.halfW + Math.abs(o) * 0.5);
    const k = Math.pow(smooth(1.15, 0.28, dn), 1.4);
    h = h + (-0.9 + wave(x * 1.7, z * 1.3) * 0.8 - h) * k;
    // the weir sill and the scour pool below it
    if (Math.abs(c.s) < this.halfW + 0.3) {
      const dw = x - this.WX;
      if (Math.abs(dw) < 0.32) h = Math.max(h, this.level0 - 0.045);
      else if (dw > 0.32 && dw < 2.6) h -= 0.14 * smooth(0.32, 0.9, dw) * smooth(2.6, 1.6, dw) * smooth(this.halfW, this.halfW * 0.5, Math.abs(c.s));
    }
    return h;
  }

  /** Water surface over (x, z): a flooded paddy's level, else the river's. */
  levelAt(x, z) {
    const st = this.S.paddy;
    for (const p of this.plots) {
      if (x > p.x0 + 0.42 && x < p.x1 - 0.42 && z > p.z0 + 0.42 && z < p.z1 - 0.42) {
        return st === 'autumn' || st === 'winter' ? p.floor - 0.02 : p.level;
      }
    }
    return this.level;
  }

  /* ---------------- slots ---------------- */

  matFor(style) {
    if (!this.waterMats[style]) this.waterMats[style] = createWaterMaterial(style, this.U);
    return this.waterMats[style];
  }

  setWater(style) {
    this.S.water = style;
    this.water.material = this.matFor(style);
    if (style === 'ripple' && !this.sim) {
      this.sim = new RippleSim(this.renderer, this.field, 256);
      this.U.uHeight.value = this.sim.texture;
      this.U.uHeightTexel.value.copy(this.sim.texel);
    }
    this.applyWaterEnv();
  }

  applyWaterEnv() {
    const e = STYLE_ENV[this.S.water];
    const g = this.groundMat.userData.u;
    g.uCaustic.value = e.caustic * (this.S.debug ? 0 : 1);
    g.uChroma.value = e.chroma;
    this.U.uClarity.value = e.clarity;
    this.mirror.enabled = this.S.mirror && e.mirror;
    this.U.uMirrorOn.value = this.mirror.enabled ? 1 : 0;
    this.U.uMirror.value = this.mirror.texture;
    this.U.uMirrorMat.value = this.mirror.matrix;
  }

  bridgeOpts(type) {
    return {
      x: this.BX, zc: this.zc(this.BX), L: 9.6, W: 2.5, H: 1.08, ramp: 2.4, level: this.level0, s: 1,
      bedAt: this.groundAt, groundAt: this.groundAt, mats: this.bmats, seed: 7
    };
  }

  setBridge(type) {
    if (this.bridge) { this.scene.remove(this.bridge.group); this.bridge.dispose(); }
    this.S.bridge = type;
    this.bridge = buildBridge(type, this.bridgeOpts(type));
    this.scene.add(this.bridge.group);
    this.refreshWorld();
    // if the new bridge lands on Michi, step off to the nearest end
    const c = this.cat;
    if (c && this.bridge.solids.some((so) => so.contains(c.pos.x, c.pos.y, 0.15))) {
      const e = this.bridge.ends.length ? this.bridge.ends.reduce((m, q) => (Math.hypot(q.foot.x - c.pos.x, q.foot.z - c.pos.y) < Math.hypot(m.foot.x - c.pos.x, m.foot.z - c.pos.y) ? q : m)) : null;
      if (e) { c.pos.set(e.foot.x + 0.6, e.foot.z); c.y = this.groundAt(c.pos.x, c.pos.y); }
      c.cancel(); c.state = 'air'; c.vy = 0;
    }
  }

  setPaddy(style) {
    if (this.paddies) { this.scene.remove(this.paddies.group); this.paddies.dispose(); }
    this.S.paddy = style;
    this.paddies = buildPaddies({ style, plots: this.plots, U: this.U, groundMat: this.groundMat, wind: this.wind, rnd: mulberry(77) });
    this.scene.add(this.paddies.group);
    const g = this.groundMat.userData.u;
    this.plots.forEach((p, i) => {
      g.uPaddy.value[i].set(p.x0 + 0.42, p.z0 + 0.42, p.x1 - 0.42, p.z1 - 0.42);
      g.uPaddyLvl.value.setComponent(i, p.level);
    });
    g.uPaddyMud.value = style === 'autumn' ? 0.4 : 1;
    // the water mirror: one planar reflection per flooded plot
    for (const m of this.paddyMirrors) m.mirror.dispose();
    this.paddyMirrors = [];
    if (['mirror', 'taue', 'summer'].includes(style)) {
      for (const w of this.paddies.waters) {
        const m = new PlanarMirror({ y: w.plot.level, scale: 0.35, maxSize: 640 });
        m.hide.push(this.water, ...this.paddies.waters.map((x) => x.mesh));
        const u = w.mesh.material.uniforms;
        u.uMirror.value = m.texture; u.uMirrorMat.value = m.matrix;
        this.paddyMirrors.push({ mirror: m, u, mesh: w.mesh });
      }
    }
    if (this.frogs) { this.scene.remove(this.frogs.group); this.frogs = null; }
    if (style === 'taue' || style === 'summer') {
      const spots = [];
      for (const p of this.plots) for (let i = 0; i < 3; i++) spots.push({ x: p.x0 + 1 + i * (p.x1 - p.x0 - 2) / 2, y: p.floor + 0.22, z: p.z1 - 0.21, face: Math.PI });
      this.frogs = new Frogs({ spots, mats: this.pmats, onPlop: (x, z) => { this.addRipple(x, z, 0.6); this.sound?.plop?.(); } });
      this.scene.add(this.frogs.group);
    }
    this.refreshWorld();
  }

  setSeason(season, { keepPaddy = false } = {}) {
    this.S.season = season;
    setSeason(this.groundMat, season);
    if (!keepPaddy) this.setPaddy(SEASON_PADDY[season]);
    this.floaters.setKind(season === 'autumn' ? 'maple' : 'petal');
    this.hasakake.visible = season === 'autumn';
    const reed = { spring: 0x7c9a4a, early: 0x6f9a3e, summer: 0x557f30, autumn: 0xb39a5a, winter: 0x9a8a68 }[season];
    this.reeds.material.color.setHex(reed);
    const wil = this.willow.group.children.find((m) => m.isInstancedMesh);
    if (wil) { wil.visible = season !== 'winter'; wil.material.color.setHex(season === 'autumn' ? 0xffd27a : season === 'spring' ? 0xf2ffd8 : season === 'summer' ? 0xc8dcb8 : 0xffffff); }
  }

  refreshWorld() {
    const rockSolids = this.rocks.map((r) => r.solid);
    this.world.solids = [...(this.bridge?.solids || []), ...this.kame.solids, ...(this.paddies?.solids || []), this.toro.solid, this.willow.solid, ...rockSolids];
    this.field.setObstacles([...(this.bridge?.obstacles || []), ...this.kame.obstacles, ...this.rocks.map((r) => r.obstacle)]);
  }

  addRock(x, z, r = 0.4, user = true) {
    const bed = this.groundAt(x, z);
    const m = makeRock(r, this.rocks.length + 3, this.pmats.rock);
    m.position.set(x, bed + r * 0.35, z);
    m.rotation.y = this.rnd() * 6;
    this.static.add(m);
    const top = bed + r * 0.35 + r * 0.72;
    const rock = { mesh: m, obstacle: { x, z, r: r * 1.05 }, solid: ellipseSolid({ x, z, rx: r * 1.05, top: (px, pz) => top - 0.18 * Math.min(1, ((px - x) ** 2 + (pz - z) ** 2) / (r * r)), kind: 'rock', name: 'a boulder' }), user };
    this.rocks.push(rock);
    if (user) {
      this.userRocks.push(rock);
      if (this.userRocks.length > 8) { const o = this.userRocks.shift(); this.static.remove(o.mesh); this.rocks.splice(this.rocks.indexOf(o), 1); }
    }
    if (this.world) this.refreshWorld();
    return rock;
  }

  clearUserRocks() {
    for (const r of this.userRocks) { this.static.remove(r.mesh); this.rocks.splice(this.rocks.indexOf(r), 1); }
    this.userRocks = [];
    this.refreshWorld();
  }

  /* ---------------- world settings ---------------- */

  setLevel(v) {
    this.level = v;
    this.U.uLevel.value = v;
    this.water.position.y = v;
    this.mirror.y = v;
  }

  setHour(h) {
    this.S.hour = h;
    this.rig.setHour(h);
    const night = THREE.MathUtils.clamp((-this.rig.sunDir.y + 0.04) * 5, 0, 1);
    // a Kyoto night is deep blue, not mauve: pull the horizon and the air toward indigo
    const P = this.rig.palette;
    P.horizon.lerp(NIGHT_BLUE, night * 0.7);
    P.fog.lerp(NIGHT_BLUE, night * 0.8);
    if (this.scene.fog) this.scene.fog.color.copy(P.fog);
    syncSky(this.U, this.rig, h);
    this.night = night;
    this.bmats.paper.emissiveIntensity = night * 2.4;
    this.pmats.lamp.emissiveIntensity = night * 3;
    this.toroLight.intensity = night * 5;
    this.lanterns.setNight(night);
    this.clouds.material.uniforms.uNight.value = night;
  }

  setRain(v) {
    this.S.rain = v;
    this.U.uRain.value = v;
    if (this.scene.fog) this.scene.fog.density = 0.012 + v * 0.02;
    this.clouds.material.uniforms.uCover.value = 0.52 - v * 0.3;
  }

  setPaint(v) { this.S.paint = v; this.U.uPaint.value = v; }
  setMirror(b) { this.S.mirror = b; this.applyWaterEnv(); }
  setDebug(d) { this.S.debug = d; this.U.uDebug.value = d; this.applyWaterEnv(); }

  /* ---------------- events ---------------- */

  say(m) { this.onSay && this.onSay(m); }

  addRipple(x, z, s = 1, drift = null) {
    this.ripples.add(x, z, s, drift || this.field.flowAt(x, z, this.levelAt(x, z), { x: 0, z: 0 }));
    if (this.sim) this.sim.drop(x, z, 2 + s * 2.5, 0.012 * s);
  }

  splash(x, y, z, impact) {
    this.drops.splash(x, y, z, impact, this.rnd);
    this.addRipple(x, z, 1.2 + impact * 0.5);
    setTimeout(() => this.addRipple(x + 0.05, z, 0.9 + impact * 0.3), 140);
    if (this.sim) this.sim.drop(x, z, 6 + impact * 4, 0.06 * (0.5 + impact));
    this.sound?.splash?.(impact);
  }

  /** Waypoints from a to b: over the bridge when the river is in the way. */
  route(a, b) {
    const br = this.bridge;
    if (!br || !br.ends.length) return [b];
    const onDeck = (p) => br.solids.some((s) => (s.kind === 'deck' || s.kind === 'plank' || s.kind === 'slab') && s.contains(p.x, p.z));
    const wet = (p) => this.levelAt(p.x, p.z) - this.groundAt(p.x, p.z) > 0.02;
    const side = (p) => Math.sign(this.centre.nearest(p.x, p.z, {}).s);
    const fromOn = onDeck(a), toOn = onDeck(b);
    const near = (p) => br.ends.reduce((m, e) => (Math.hypot(e.foot.x - p.x, e.foot.z - p.z) < Math.hypot(m.foot.x - p.x, m.foot.z - p.z) ? e : m), br.ends[0]);
    const path = br.path || br.ends.map((e) => e.top);
    if (fromOn && toOn) return [b];
    if (!fromOn && toOn) { const e = near(a); return [e.foot, e.top, b]; }
    if (fromOn && !toOn) { const e = near(b); return [e.top, e.foot, b]; }
    if (!wet(a) && !wet(b) && side(a) !== side(b) && br.ends.length === 2) {
      const ea = near(a), eb = br.ends.find((e) => e !== ea);
      const mid = ea === br.ends[0] ? path : [...path].reverse();
      return [ea.foot, ...mid, eb.foot, b];
    }
    return [b];
  }

  leapSpot() {
    if (this.bridge?.leap) return this.bridge.leap;
    // no bridge: leap from the middle turtle
    const st = this.kame.stones[3];
    return { stand: { x: st.x, z: st.z }, rail: null, dir: 1 };
  }

  /* ---------------- per frame ---------------- */

  get camera() { return this._camera; }
  set camera(c) { this._camera = c; }

  update(dt, t) {
    this.time = t;
    this.U.uTime.value = t;
    this.clouds.material.uniforms.uTime.value = t;
    this.ripples.time = t;
    this.groundMat.userData.u.uTime.value = t;
    this.wind.value.set(t, 0.55 + 0.45 * Math.sin(t * 0.13) ** 2);
    const lvl = (x, z) => this.levelAt(x, z);
    this.bridge.update(dt, t, this.level);
    this.paddies.update(dt, t, { x: this.cat.pos.x, z: this.cat.pos.y, r: 0.4 });
    if (this.frogs) this.frogs.update(dt, { x: this.cat.pos.x, z: this.cat.pos.y }, (x, z) => lvl(x, z));
    this.drops.update(dt, (x, z) => Math.max(lvl(x, z), this.groundAt(x, z)), (x, z) => { if (this.levelAt(x, z) > this.groundAt(x, z)) this.ripples.add(x, z, 0.25, null, 0.8); });
    this.floaters.update(dt, t, { field: this.field, level: this.level, groundAt: (x, z) => Math.max(this.groundAt(x, z), this.levelAt(x, z) > this.level + 0.1 ? this.levelAt(x, z) - 0.006 : -99), solids: this.world.solids, wind: this.wind.value.y });
    this.lanterns.update(dt, t, { field: this.field, level: this.level });
    this.fireflies.update(dt, t, this.night * (this.S.season === 'early' || this.S.season === 'summer' ? 1 : 0));
    const h = this.S.hour;
    const mist = smooth(4.6, 5.6, h) * (1 - smooth(7.2, 8.6, h)) + this.S.rain * 0.25;
    this.mist.update(dt, t, mist, this.rig.palette.fog, this._camera);
    this.rain.update(dt, t, this.S.rain);
    if (this.sim && this.S.water === 'ripple') this.sim.step(this.level, 2);
    // lights reflected in the water: tōrō, bridge lanterns, floating lanterns
    const L = [];
    if (this.night > 0.05) {
      L.push({ ...this.toro.light, i: this.toro.light.i * this.night });
      for (const l of this.bridge.lights) L.push({ ...l, i: l.i * this.night });
    }
    this.lanterns.lights(L);
    const UL = this.U.uLights.value;
    for (let i = 0; i < 8; i++) { const l = L[i]; if (l) UL[i].set(l.x, l.y, l.z, l.i); else UL[i].set(0, 0, 0, 0); }
  }

  /** Mirrors first, then the scene into the paint target (split if asked), then the painterly pass to screen. */
  render(renderer, rect, cam, split = null) {
    const rt = this.paint.begin(renderer, rect);
    const halves = split && !split.paintOnly ? [[0, split.value, split.left], [split.value, 1, split.right]] : [[0, 1, null]];
    for (const [a, b, prep] of halves) {
      prep?.();
      if (this.mirror.enabled) this.mirror.update(renderer, this.scene, cam, rect.width, rect.height);
      for (const pm of this.paddyMirrors) {
        pm.mirror.enabled = this.S.mirror && this.S.quality !== 'eco';
        pm.u.uMirrorOn.value = pm.mirror.enabled ? 1 : 0;
        if (pm.mirror.enabled) pm.mirror.update(renderer, this.scene, cam, rect.width, rect.height);
      }
      const W = rt.width, H = rt.height;
      const x0 = Math.round(a * W), x1 = Math.round(b * W);
      rt.viewport.set(0, 0, W, H);
      rt.scissor.set(x0, 0, Math.max(0, x1 - x0), H);
      rt.scissorTest = halves.length > 1;
      renderer.setRenderTarget(rt);
      renderer.render(this.scene, cam);
    }
    rt.scissorTest = false;
    renderer.setRenderTarget(null);
    const paintSplit = split && split.paintOnly ? split.value : -1;
    this.paint.draw(renderer, rect, this.S.paint, paintSplit);
  }
}
