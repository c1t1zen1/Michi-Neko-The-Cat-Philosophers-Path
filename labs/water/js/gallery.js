// The variant cards: one live isometric cube each, drawn on the page's single
// canvas through the kit's Views (built lazily as they scroll near). Water
// cubes are a glass-sided slab of river with a rock in it; bridge cubes span
// a small river with mirror water; paddy cubes are two terraces and a spill.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { renderRect } from '../../shared/stage.js';
import { LightRig } from '../../shared/light.js';
import { Centreline, WaterField, smooth } from './field.js';
import { waterUniforms, createWaterMaterial, syncSky, STYLE_ENV } from './water.js';
import { PlanarMirror } from './mirror.js';
import { RippleSim } from './ripple.js';
import { HeightGrid, createGroundMaterial, setSeason, cutawayGeometry, cutawayMaterial } from './terrain.js';
import { buildBridge, bridgeMaterials } from './bridges.js';
import { propMaterials, buildKameIshi, makeRock, buildReeds, buildToro, buildHasakake, Frogs } from './props.js';
import { buildPaddies } from './paddies.js';
import { RipplePool, Floaters, FloatingLanterns } from './effects.js';
import { VARIANTS, FAMILIES } from './variants.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n)));
const dots = (n) => '●'.repeat(n) + '○'.repeat(5 - n);
const wave = (x, z) => 0.03 * Math.sin(x * 2.1 + z * 0.7) + 0.02 * Math.sin(z * 2.9 - x * 1.3);
const PADDY_SEASON = { mirror: 'spring', taue: 'early', summer: 'summer', autumn: 'autumn', winter: 'winter', game: 'spring' };

function mulberry(a) {
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoCamera(half) {
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 120);
  const az = Math.PI / 4, el = 0.58, d = 40;
  cam.position.set(Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d);
  cam.lookAt(0, -0.25, 0);
  return cam;
}

let env = null;
function environment(renderer) {
  if (!env) env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  return env;
}

/** A river slab of size `size` with a channel along x (half width hw), optional weir at x = weir. */
function riverSlab({ size, hw, bank = 0.24, bed = -0.6, res = 20, fieldRes = 24, weir = null, centre, speed = 0.95 }) {
  const h0 = -size / 2;
  const fn = (x, z) => {
    const c = centre.nearest(x, z, {});
    const o = THREE.MathUtils.clamp(-c.k * 9, -1, 1) * hw * 0.3;
    const dn = Math.abs(c.s - o) / hw;
    const k = Math.pow(smooth(1.15, 0.28, dn), 1.4);
    let h = bank + wave(x, z);
    h += (bed + wave(x * 2, z * 2) - h) * k;
    if (weir !== null && Math.abs(c.s) < hw + 0.2) {
      const dw = x - weir;
      if (Math.abs(dw) < 0.18) h = Math.max(h, 0.02 - 0.04);
      else if (dw > 0.18 && dw < 1.2) h -= 0.1 * smooth(0.18, 0.5, dw) * smooth(1.2, 0.8, dw);
    }
    return h;
  };
  const grid = new HeightGrid({ x0: h0, z0: h0, w: size, d: size, res, fn });
  const field = new WaterField({ x0: h0, z0: h0, w: size, d: size, res: fieldRes, groundAt: (x, z) => grid.heightAt(x, z), centre, halfW: hw, speed, weir: weir !== null ? { x: weir } : null });
  return { grid, field };
}

class Cube {
  constructor(v, card, ctx) {
    Object.assign(this, { v, card, ctx });
    this.el = card.querySelector('.view');
    this.hover = null;
    this.hoverClock = 0;
    this.buildMs = 0;
    this.level = 0.02;
    this.ray = new THREE.Raycaster();
    this.el.addEventListener('pointermove', (e) => { this.hover = e; });
    this.el.addEventListener('pointerleave', () => { this.hover = null; });
  }

  build() {
    const t0 = performance.now();
    const { v, ctx } = this;
    const scene = this.scene = new THREE.Scene();
    scene.environment = environment(ctx.renderer);
    const night = v.setup === 'night';
    this.hour = night ? 21.5 : ctx.getHour();
    const shadows = v.kind === 'bridge';
    const rig = this.rig = new LightRig(scene, { hour: this.hour, shadows, shadowSize: 5, sky: false, fog: false, background: false });
    rig.sun.shadow.mapSize.set(1024, 1024);
    const rnd = this.rnd = mulberry(v.index + 11);
    if (v.kind === 'water') this.buildWater(rnd);
    else if (v.kind === 'bridge') this.buildBridge(rnd);
    else this.buildPaddy(rnd);
    this.U.uGameEncode.value = 0;
    syncSky(this.U, rig, this.hour);
    if (this.mirror) this.mirror.clearColor = rig.palette.horizon;
    rig.applyEnv();
    this.buildMs = performance.now() - t0;
    return { scene, camera: this.camera };
  }

  water(style, level = 0.02) {
    const U = this.U;
    U.uLevel.value = level;
    const m = createWaterMaterial(style, U);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size, 64, 64).rotateX(-Math.PI / 2), m);
    w.position.y = level;
    w.renderOrder = 2;
    this.scene.add(w);
    this.waterMesh = w;
    const e = STYLE_ENV[style];
    this.groundMat.userData.u.uCaustic.value = e.caustic;
    this.groundMat.userData.u.uChroma.value = e.chroma;
    U.uClarity.value = e.clarity;
    const cut = new THREE.Mesh(cutawayGeometry(this.grid, level), cutawayMaterial(U));
    cut.renderOrder = 1;
    this.scene.add(cut);
    this.cut = cut;
    if (e.mirror || this.v.kind === 'bridge') {
      this.mirror = new PlanarMirror({ y: level, scale: 0.6, maxSize: 640 });
      this.mirror.hide.push(w, cut);
      U.uMirror.value = this.mirror.texture; U.uMirrorMat.value = this.mirror.matrix; U.uMirrorOn.value = 1;
    }
    if (style === 'ripple') {
      this.sim = new RippleSim(this.ctx.renderer, this.field, 128);
      U.uHeight.value = this.sim.texture; U.uHeightTexel.value.copy(this.sim.texel);
    }
  }

  slab(mat) {
    const m = new THREE.Mesh(this.grid.geometry(-0.95), mat);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  buildWater(rnd) {
    const v = this.v;
    this.size = 3.2;
    this.camera = isoCamera(2.55);
    const centre = new Centreline([[-2.6, 0.18], [0, -0.14], [2.6, 0.2]], 60);
    const { grid, field } = riverSlab({ size: 3.2, hw: 1.22, centre, weir: v.setup === 'weir' ? -0.55 : null });
    Object.assign(this, { grid, field, centre });
    const U = this.U = waterUniforms(field);
    this.groundMat = createGroundMaterial(U);
    this.slab(this.groundMat);
    if (v.setup !== 'weir') {
      const rk = makeRock(0.21, 4, this.ctx.pmats.rock);
      const bx = 0.32, bz = centre.zAt(0.32) + 0.05;
      rk.position.set(bx, grid.heightAt(bx, bz) + 0.08, bz);
      this.scene.add(rk);
      field.setObstacles([{ x: bx, z: bz, r: 0.23 }]);
    }
    this.ripples = new RipplePool(U);
    // a small tōrō on the far bank: something to reflect, and a light at night
    const mats = v.setup === 'night' ? { ...this.ctx.pmats, lamp: this.ctx.pmats.lamp.clone() } : this.ctx.pmats;
    this.lampMat = mats.lamp;
    const toro = buildToro({ x: 0, y: 0, z: 0, mats });
    toro.group.position.set(-0.95, grid.heightAt(-0.95, -1.32), -1.32);
    toro.group.scale.setScalar(0.75);
    this.scene.add(toro.group);
    this.toroLight = { x: -0.95, y: toro.group.position.y + 0.93 * 0.75, z: -1.32 };
    const spots = [{ x: 1.1, z: -1.4, y: grid.heightAt(1.1, -1.4) }, { x: -0.2, z: 1.42, y: grid.heightAt(-0.2, 1.42) }];
    this.reedWind = { value: new THREE.Vector2() };
    this.scene.add(buildReeds({ spots, mats: this.ctx.pmats, rnd, wind: this.reedWind }));
    this.water(v.style);
    if (v.setup === 'petals') {
      this.floaters = new Floaters(320, 2.2);
      this.scene.add(this.floaters.mesh);
    }
    if (v.setup === 'night') {
      this.lanterns = new FloatingLanterns(4);
      this.scene.add(this.lanterns.group);
    }
  }

  buildBridge(rnd) {
    const v = this.v;
    this.size = 6.4;
    this.camera = isoCamera(4.75);
    const centre = new Centreline([[-4.2, 0.1], [0, -0.1], [4.2, 0.12]], 60);
    const { grid, field } = riverSlab({ size: 6.4, hw: 1.75, bank: 0.3, bed: -0.7, res: 12, fieldRes: 12, centre });
    Object.assign(this, { grid, field, centre });
    const U = this.U = waterUniforms(field);
    this.groundMat = createGroundMaterial(U);
    this.slab(this.groundMat);
    const ga = (x, z) => grid.heightAt(x, z);
    const zc = centre.zAt(0);
    const L = v.type === 'taiko' ? 4.7 : 4.5;
    this.bmats = this.ctx.bmats;
    if (v.type === 'stones') {
      const k = buildKameIshi({ x: 0, zFrom: zc - 2.0, zTo: zc + 2.0, level: 0.02, bedAt: ga, mats: this.ctx.pmats, kinds: ['square', 'kame', 'chidori', 'kame', 'square'] });
      this.scene.add(k.group);
      field.setObstacles(k.obstacles);
      this.bridge = null;
    } else {
      this.bridge = buildBridge(v.type, { x: 0, zc, L, W: 1.8, H: 0.98, ramp: 0.85, level: 0.02, s: 0.72, bedAt: ga, groundAt: ga, mats: this.ctx.bmats, seed: v.index });
      this.scene.add(this.bridge.group);
      field.setObstacles(this.bridge.obstacles);
    }
    this.ripples = new RipplePool(U);
    this.water('kyoto');
  }

  buildPaddy(rnd) {
    const v = this.v;
    this.size = 4.4;
    this.camera = isoCamera(3.05);
    const lower = { x0: -2.15, x1: -0.15, z0: -2.15, z1: 2.15, floor: 0.2, level: 0.25 };
    const upper = { x0: 0.25, x1: 2.15, z0: -2.15, z1: 2.15, floor: 0.5, level: 0.55, notch: { side: 'x0', z: 0.7 }, spillTo: lower };
    const plots = [lower, upper];
    const sd = (px, pz, p) => {
      const dx = Math.max(p.x0 - px, px - p.x1, 0), dz = Math.max(p.z0 - pz, pz - p.z1, 0);
      const inside = px > p.x0 && px < p.x1 && pz > p.z0 && pz < p.z1;
      return inside ? -1 : Math.hypot(dx, dz);
    };
    const fn = (x, z) => {
      let h = 0.04 + wave(x, z);
      for (const p of plots) { const d = sd(x, z, p); h = d < 0 ? p.floor : Math.max(h, p.floor * smooth(0.45, 0, d)); }
      return h;
    };
    const grid = this.grid = new HeightGrid({ x0: -2.2, z0: -2.2, w: 4.4, d: 4.4, res: 16, fn });
    const field = this.field = new WaterField({ x0: -2.2, z0: -2.2, w: 4.4, d: 4.4, res: 4, groundAt: (x, z) => grid.heightAt(x, z), centre: new Centreline([[-20, 40], [20, 40]], 4), halfW: 1, speed: 0 });
    const U = this.U = waterUniforms(field);
    U.uLevel.value = -5;
    this.groundMat = createGroundMaterial(U);
    setSeason(this.groundMat, PADDY_SEASON[v.paddy]);
    const g = this.groundMat.userData.u;
    plots.forEach((p, i) => { g.uPaddy.value[i].set(p.x0 + 0.42, p.z0 + 0.42, p.x1 - 0.42, p.z1 - 0.42); g.uPaddyLvl.value.setComponent(i, p.level); });
    g.uPaddyMud.value = v.paddy === 'autumn' ? 0.4 : 1;
    this.slab(this.groundMat);
    this.wind = { value: new THREE.Vector2(0, 0.6) };
    this.paddies = buildPaddies({ style: v.paddy, plots, U, groundMat: this.groundMat, wind: this.wind, rnd: mulberry(5) });
    this.scene.add(this.paddies.group);
    this.ripples = new RipplePool(U);
    this.pmirrors = [];
    if (['mirror', 'taue', 'summer'].includes(v.paddy)) {
      for (const w of this.paddies.waters) {
        const m = new PlanarMirror({ y: w.plot.level, scale: 0.45, maxSize: 420 });
        m.hide.push(...this.paddies.waters.map((x) => x.mesh));
        const u = w.mesh.material.uniforms;
        u.uMirror.value = m.texture; u.uMirrorMat.value = m.matrix; u.uMirrorOn.value = 1;
        this.pmirrors.push(m);
      }
    }
    if (v.paddy === 'autumn') this.scene.add(buildHasakake({ x0: 0.7, x1: 1.8, z: -1.95, y: upper.floor + 0.18, mats: this.ctx.pmats }));
    if (v.paddy === 'taue' || v.paddy === 'summer') {
      this.frogs = new Frogs({ spots: [{ x: -1.2, y: lower.floor + 0.22, z: 1.94, face: Math.PI }, { x: 1.2, y: upper.floor + 0.22, z: 1.94, face: Math.PI }], mats: this.ctx.pmats, onPlop: (x, z) => this.ripples.add(x, z, 0.6) });
      this.scene.add(this.frogs.group);
    }
  }

  /** Where the pointer meets the water (or the paddy) in cube space, if anywhere. */
  pointer(rect) {
    const e = this.hover;
    if (!e) return null;
    this.ray.setFromCamera({ x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -(((e.clientY - rect.top) / rect.height) * 2 - 1) }, this.camera);
    const y = this.v.kind === 'paddy' ? 0.25 : this.level;
    const p = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Vector3());
    if (!p || Math.abs(p.x) > this.size / 2 || Math.abs(p.z) > this.size / 2) return null;
    return p;
  }

  update(dt, t, rect) {
    const U = this.U;
    U.uTime.value = t;
    this.ripples.time = t;
    this.groundMat.userData.u.uTime.value = t;
    if (this.reedWind) this.reedWind.value.set(t, 0.6);
    const hour = this.v.setup === 'night' ? 21.5 : this.ctx.getHour();
    if (Math.abs(hour - this.hour) > 0.01) {
      this.hour = hour;
      this.rig.setHour(hour);
      syncSky(U, this.rig, hour);
      this.rig.applyEnv();
    }
    const night = THREE.MathUtils.clamp((-this.rig.sunDir.y + 0.04) * 5, 0, 1);
    if (this.lampMat) this.lampMat.emissiveIntensity = night * 3;
    if (this.v.kind === 'bridge') this.ctx.bmats.paper.emissiveIntensity = night * 2.4;
    // hover: pebbles into the water, a flood for the nagare-bashi, a gust over the rice
    const p = this.pointer(rect);
    this.hoverClock -= dt;
    if (p && this.hoverClock <= 0 && this.v.type !== 'nagare') {
      this.hoverClock = 0.28;
      this.ripples.add(p.x, p.z, 0.9, this.field.flowAt(p.x, p.z, this.level, { x: 0, z: 0 }));
      if (this.sim) this.sim.drop(p.x, p.z, 4, 0.04);
    }
    if (this.v.type === 'nagare') {
      const want = this.hover ? 0.62 : 0.02;
      this.level += (want - this.level) * Math.min(1, dt * 0.9);
      U.uLevel.value = this.level;
      this.waterMesh.position.y = this.level;
      this.mirror.y = this.level;
      if (this.cutLevel === undefined || Math.abs(this.cutLevel - this.level) > 0.01) {
        this.cut.geometry.dispose();
        this.cut.geometry = cutawayGeometry(this.grid, this.level);
        this.cutLevel = this.level;
      }
    }
    if (this.bridge) {
      this.bridge.update(dt, t, this.level);
      const L = [];
      for (const l of this.bridge.lights) L.push({ ...l, i: l.i * night });
      const UL = U.uLights.value;
      for (let i = 0; i < 8; i++) { const l = L[i]; if (l) UL[i].set(l.x, l.y, l.z, l.i); else UL[i].set(0, 0, 0, 0); }
    }
    if (this.wind) this.wind.value.set(t, this.hover ? 1.6 : 0.6);
    if (this.paddies) this.paddies.update(dt, t, p ? { x: p.x, z: p.z, r: 0.4 } : null);
    if (this.frogs) this.frogs.update(dt, p ? { x: p.x, z: p.z } : null, (x, z) => (x < 0 ? 0.25 : 0.55));
    if (this.sim) this.sim.step(this.level, 2);
    if (this.floaters) {
      for (let k = 0; k < 2; k++) if (Math.random() < dt * 9) { const x = -1.55 + Math.random() * 1.8; this.floaters.add(x, 0.5 + Math.random() * 1.2, this.centre.zAt(x) + (Math.random() - 0.5) * 2); }
      this.floaters.update(dt, t, { field: this.field, level: this.level, groundAt: (x, z) => this.grid.heightAt(x, z), solids: [], wind: 0.3, flowScale: 0.55 });
    }
    if (this.lanterns) {
      if (this.lanterns.items.length < 3 && Math.random() < dt * 0.6) this.lanterns.add(-1.5, this.centre.zAt(-1.5) + (Math.random() - 0.5) * 0.8, this.level);
      this.lanterns.update(dt, t, { field: this.field, level: this.level });
      this.lanterns.setNight(night);
      const L = this.lanterns.lights([{ ...this.toroLight, i: 1.2 * night }]);
      const UL = U.uLights.value;
      for (let i = 0; i < 8; i++) { const l = L[i]; if (l) UL[i].set(l.x, l.y, l.z, l.i); else UL[i].set(0, 0, 0, 0); }
    }
  }

  render(r, rect) {
    if (this.mirror) this.mirror.update(r, this.scene, this.camera, rect.width, rect.height);
    for (const m of this.pmirrors || []) m.update(r, this.scene, this.camera, rect.width, rect.height);
    renderRect(r, rect, this.scene, this.camera);
  }
}

/** Build every card and register its cube with the shared Views. */
export function buildGallery({ mount, views, renderer, getHour, onPlant }) {
  const ctx = { renderer, getHour, pmats: propMaterials(), bmats: null };
  ctx.bmats = bridgeMaterials(waterUniforms({ texture: null, box: new THREE.Vector4() }));
  const cubes = [];
  FAMILIES.forEach((fam, fi) => {
    const sec = document.createElement('section');
    sec.className = 'family';
    sec.id = 'fam-' + fam.key;
    sec.innerHTML = `<div class="fam-head"><span class="fam-num">${String.fromCharCode(65 + fi)}</span><h2>${fam.title}</h2><p class="fam-sub">${fam.sub}</p></div><div class="variants"></div>`;
    mount.append(sec);
    const grid = sec.querySelector('.variants');
    for (const v of VARIANTS.filter((x) => x.family === fam.key)) {
      const a = document.createElement('article');
      a.className = 'tile';
      a.id = 'v-' + v.id;
      a.tabIndex = 0;
      a.innerHTML = `
        <div class="view" role="button" aria-label="Plant ${esc(v.name)} on the stage"></div>
        <h3 class="name">${esc(v.name)}<span class="jp">${v.jp}</span></h3>
        <p class="tag">${esc(v.tag)}</p>
        <p class="blurb">${esc(v.blurb)}</p>
        <dl class="stats">
          <div><dd class="s-tris">–</dd><dt>tris</dt></div>
          <div><dd class="s-draws">–</dd><dt>draws</dt></div>
          <div><dd class="s-cpu">–</dd><dt>ms cpu</dt></div>
        </dl>
        <p class="stats2">built in <span class="s-build">–</span> ms · GPU load <span class="gpu" title="author's estimate, 1 = light, 5 = heavy">${dots(v.gpu)}</span></p>
        <details>
          <summary>How it’s made</summary>
          <ul class="how">${v.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
          <pre class="code"><code>${esc(v.code)}</code></pre>
          <p class="use"><b>Use it for</b> ${esc(v.use)}</p>
          ${v.sources.length ? `<ul class="srcs">${v.sources.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>` : ''}
        </details>`;
      grid.append(a);
      const cube = new Cube(v, a, ctx);
      const go = () => onPlant(v);
      a.querySelector('.view').addEventListener('click', go);
      a.querySelector('.name').addEventListener('click', go);
      a.addEventListener('keydown', (e) => { if (e.target === a && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } });
      cube.view = views.add(a.querySelector('.view'), {
        margin: 600,
        build: () => cube.build(),
        update: (dt, t, rect) => cube.update(dt, t, rect),
        render: (r, rect) => cube.render(r, rect)
      });
      cubes.push(cube);
    }
  });
  return {
    cubes,
    refreshStats() {
      for (const c of cubes) {
        if (!c.view.built) continue;
        const r = c.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const q = (s) => c.card.querySelector(s);
        q('.s-tris').textContent = fmt(c.view.stats.tris);
        q('.s-draws').textContent = c.view.stats.calls;
        q('.s-cpu').textContent = c.view.cpuMs.toFixed(2);
        q('.s-build').textContent = c.buildMs < 10 ? c.buildMs.toFixed(1) : Math.round(c.buildMs);
      }
    },
    select(ids) { for (const c of cubes) c.card.classList.toggle('sel', ids.includes(c.v.id)); }
  };
}
