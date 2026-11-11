// The variant gallery: one live core sample per technique, built lazily as it
// nears the viewport and drawn through the shared canvas (Views). Each sample
// is a 2.4 m slab (5 m for the tiling family) with its strata cut open.
import * as THREE from 'three';
import { LightRig } from '../../shared/light.js';
import { reduceMotion } from '../../shared/stage.js';
import { GroundField } from './field.js';
import { createGroundMaterial, groundMesh } from './ground.js';
import { PrintBuffer, GrooveBuffer } from './marks.js';
import { StoneSet } from './stones.js';
import { buildSkirt } from './props.js';
import { Kemonomichi } from './walkers.js';
import { Ladle } from './weather.js';
import { Finish } from './finish.js';
import { GameToday } from './today.js';
import { FAMILIES, VARIANTS, SRC } from './variants.js';
import { mulberry32, sstep } from './util.js';
import { mountSpecimenLinks } from '../../shared/specimen-link.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const HINTS = { wetcycle: 'hover: rain', puddles: 'hover: rain', ladle: 'hover: a ladle', snow: 'hover: snow' };

function leafSheet() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
  const r = mulberry32(5);
  x.fillStyle = '#fff';
  for (let i = 0; i < 420; i++) {
    const px = r() * 256, py = r() * 256, s = 4 + r() * 9, a = r() * 6.3;
    x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2); x.fill(); x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildGallery({ mount, views, renderer, layers, onPlant, getEnv = () => null }) {
  mount.innerHTML = FAMILIES.map((f) => `<section class="family" id="fam-${f.id}">
    <div class="fam-head"><h3>${f.title}</h3><p class="fam-sub">${f.sub}</p></div>
    <div class="variants">${VARIANTS.filter((v) => v.fam === f.id).map((v) => `<article class="tile" id="v-${v.id}" data-id="${v.id}">
      <div class="view" role="button" tabindex="0" aria-label="Plant ${esc(v.name)} on the corner" data-hint="${HINTS[v.anim] || 'click: plant it'}"></div>
      <h3 class="name">${esc(v.name)} <span class="jp">${v.jp}</span></h3>
      <p class="tag"><i>${v.romaji}</i> · ${esc(v.tag)}</p>
      <p class="blurb">${esc(v.blurb)}</p>
      <dl class="stats"><div><dd class="s-tris">–</dd><dt>tris</dt></div><div><dd class="s-calls">–</dd><dt>draws</dt></div><div><dd class="s-cpu">–</dd><dt>ms cpu</dt></div></dl>
      <p class="stats2">built in <span class="s-build">–</span> ms</p>
      <details><summary>How it’s made</summary>
        <ul class="how">${v.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <pre class="code"><code>${esc(v.code)}</code></pre>
        <p class="use"><b>Use it for</b> ${esc(v.use)}</p>
        <ul class="srcs">${v.src.map((k) => SRC[k]).filter(Boolean).map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>
      </details></article>`).join('')}</div></section>`).join('');

  const tiles = [];
  for (const card of mount.querySelectorAll('.tile')) {
    const v = VARIANTS.find((x) => x.id === card.dataset.id), el = card.querySelector('.view');
    const info = { card, v, hover: false };
    el.addEventListener('pointerenter', () => { info.hover = true; });
    el.addEventListener('pointerleave', () => { info.hover = false; });
    const go = () => onPlant(v);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    info.view = views.add(el, {
      build: () => {
        const t0 = performance.now();
        const built = buildSample(v, renderer, layers, info, getEnv);
        card.querySelector('.s-build').textContent = (performance.now() - t0).toFixed(0);
        return built;
      },
      margin: 600
    });
    tiles.push(info);
  }
  mountSpecimenLinks(tiles, { getId: (tile) => tile.v.id });
  let statClock = 0;
  return {
    tiles,
    select(id) { for (const t of tiles) t.card.classList.toggle('planted', t.v.id === id); },
    tick(dt) {
      statClock += dt;
      if (statClock < 0.6) return;
      statClock = 0;
      for (const t of tiles) {
        const s = t.view;
        if (!s.built || !s.scene) continue;
        t.card.querySelector('.s-tris').textContent = s.stats.tris > 999 ? (s.stats.tris / 1000).toFixed(0) + 'k' : s.stats.tris;
        t.card.querySelector('.s-calls').textContent = s.stats.calls;
        t.card.querySelector('.s-cpu').textContent = s.cpuMs.toFixed(2);
      }
    }
  };
}

function buildSample(v, renderer, layers, info, getEnv) {
  const size = v.size || 2.4, k = size > 3 ? 20 : 32;
  const field = new GroundField({ w: size, d: size, k });
  const scene = new THREE.Scene();
  const rig = new LightRig(scene, { hour: 10.4, shadows: true, shadowSize: size * 0.85, sky: false, fog: false, background: false });
  rig.sun.shadow.mapSize.set(1024, 1024);
  const U0 = {};
  let marks = null, stones = null, sim = null, ghosts = null, ladle = null, canopy = null, finish = null, mat = null;
  const needPrints = v.defines?.PRINTS || v.walkers;
  const needGrooves = v.grooves;
  if (needPrints || needGrooves) marks = { print: new PrintBuffer(renderer, field, { k: 96, max: 32 }), groove: needGrooves ? new GrooveBuffer(renderer, field, { k: 96 }) : null };
  if (v.today) {
    const t = new GameToday(field, { lane: (x) => Math.sin(x * 1.1) * 0.25, street: false, laneW: 0.9, shoulderW: 1.6 });
    scene.add(t.group);
  } else {
    v.paint?.(field);
    if (v.wearLane) {
      for (let j = 0; j < field.nz; j++) for (let i = 0; i < field.nx; i++) {
        const x = field.xOf(i), z = field.zOf(j), d = Math.abs(z - Math.sin(x * 1.1) * 0.25), idx = j * field.nx + i;
        const rut = Math.max(0, 1 - Math.abs(d - 0.24) / 0.12);
        field.wear[idx] = field.G0[idx] = Math.max(rut * 0.95, (1 - sstep(0.35, 0.5, d)) * 0.55);
      }
    }
    field.upload();
    mat = createGroundMaterial(field, layers, { defines: v.defines, marks });
    Object.assign(U0, mat.userData.u);
    scene.add(groundMesh(field, mat, size > 3 ? 100 : 96));
  }
  scene.add(buildSkirt(field));
  const W = mat ? { uWet: U0.uWet, uWetSpec: U0.uWetSpec, uSnow: U0.uSnow, uEave: U0.uEave, uTime: U0.uTime } : { uWet: { value: 0 }, uWetSpec: { value: 0 }, uSnow: { value: 0 }, uEave: { value: new THREE.Vector4() }, uTime: { value: 0 } };
  if (v.stones) {
    stones = new StoneSet(scene, W, { heightAt: (x, z) => field.heightAt(x, z) });
    const r = mulberry32(3);
    if (v.stones === 'tobi') {
      let side = 1;
      for (let s = -0.95; s <= 0.96; s += 0.5) { stones.tobi(s, side * 0.1 + Math.sin(s * 2) * 0.12, 0.18 + r() * 0.05, { rot: r() * 3, seed: Math.floor(r() * 99) }); side = -side; }
    } else {
      stones.tobi(-0.45, -0.3, 0.2, { seed: 4 }); stones.tobi(0.4, 0.35, 0.17, { seed: 9, kind: 'granite' });
    }
    stones.rebuild();
  }
  if (v.grooves === 'samon') {
    stones = new StoneSet(scene, W, { heightAt: (x, z) => field.heightAt(x, z) });
    stones.rock(0.25, -0.15, 0.32, 7); stones.rebuild();
    for (let z = -1.1; z < 1.2; z += 0.74) marks.groove.segment(-1.25, z, 1.25, z, 0);
    marks.groove.rings(0.25, -0.15, 0.42, 1);
  }
  if (v.grooves === 'broom') {
    for (let a = 0; a < 7; a++) {
      const cx = -0.8 + a * 0.3, pts = [];
      for (let t = 0; t <= 10; t++) pts.push([cx + Math.sin(t * 0.25 + a) * 0.25, -1.15 + t * 0.23]);
      for (let i = 0; i < pts.length - 1; i++) marks.groove.segment(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 1);
    }
  }
  if (v.walkers === true) {
    const pois = [{ id: 'a', x: -0.85, z: -0.85, w: 1 }, { id: 'b', x: 0.9, z: -0.6, w: 1 }, { id: 'c', x: 0.1, z: 0.95, w: 1 }];
    sim = new Kemonomichi(field, { pois, blocked: (x, z) => !field.inside(x, z, 0.05), seed: 3 });
    sim.attract = 2.2;
    sim.spawnGhosts(4);
    field.T = 26;
    field.deposit = 0.05;
    ghosts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 4);
    scene.add(ghosts);
  } else if (v.walkers) {
    ghosts = { t: 0, side: 0 };
  }
  if (v.anim === 'ladle') { ladle = new Ladle(300); scene.add(ladle.mesh); }
  if (v.canopy) {
    const tex = leafSheet();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.4, size * 2.4), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2; plane.position.y = 1.7;
    plane.castShadow = true;
    plane.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: tex, alphaTest: 0.5 });
    // white = leaf: the depth pass discards the gaps
    plane.customDepthMaterial.alphaMap = tex;
    scene.add(plane);
    canopy = { plane, tex };
    rig.setHour(15.2);
  }
  if (v.finish) finish = new Finish(renderer);

  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  const C0 = v.cam || { dist: 3.4, el: 0.62 }, C = { dist: C0.dist * 2.15, el: C0.el + 0.08 };
  let ang = 0.7 + (VARIANTS.indexOf(v) % 5) * 0.4, lift = 0, cycle = 0;
  const rnd = mulberry32(17);
  const update = (dt) => {
    if (!reduceMotion) ang += dt * 0.08;
    lift += ((info.hover ? 1 : 0) - lift) * Math.min(1, dt * 4);
    const dist = C.dist * (1 - lift * 0.12);
    cam.position.set(Math.cos(ang) * Math.cos(C.el) * dist, Math.sin(C.el) * dist + 0.1, Math.sin(ang) * Math.cos(C.el) * dist);
    cam.lookAt(0, -0.05, 0);
    scene.environment = getEnv();
    if (!mat) return;
    const U = U0;
    U.uTime.value += dt;
    cycle += dt * (info.hover ? 3 : 1);
    // weather on it
    if (v.anim === 'wetcycle') {
      const ph = (cycle % 16) / 16, rain = ph < 0.35 ? 1 : 0;
      U.uRain.value += (rain - U.uRain.value) * Math.min(1, dt * 2);
      U.uWet.value = ph < 0.35 ? Math.min(1, ph / 0.2) : Math.max(0, 1 - (ph - 0.35) / 0.55);
      U.uWetSpec.value = ph < 0.35 ? Math.min(1, ph / 0.12) : Math.max(0, 1 - (ph - 0.35) / 0.25);
    } else if (v.anim === 'puddles') {
      const ph = (cycle % 14) / 14;
      U.uRain.value = ph < 0.5 ? 1 : Math.max(0, 1 - (ph - 0.5) * 4);
      U.uWet.value = Math.min(1, ph < 0.5 ? ph * 3 : 1 - (ph - 0.5) * 1.6);
      U.uWetSpec.value = U.uWet.value;
      U.uWater.value = -0.075 + Math.sin(Math.min(1, ph / 0.75) * Math.PI) * 0.055;
    } else if (v.anim === 'snow') {
      const ph = (cycle % 18) / 18;
      U.uSnow.value = ph < 0.6 ? Math.min(1, ph / 0.35) : Math.max(0, 1 - (ph - 0.6) / 0.4);
    } else if (v.anim === 'ladle') {
      if (cycle > (info.hover ? 1.2 : 4)) { cycle = 0; ladle.throw((rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6, rnd() * 6.28, rnd); }
      ladle.update(dt, (x, z) => field.heightAt(x, z), (x, z, s) => { if (field.inside(x, z)) field.wetAt(x, z, s * 1.6, 0.75); });
      field.dry(dt, 1 / 14);
      field.upload();
    }
    if (sim) {
      const falls = sim.stepGhosts(dt * 1.6, 1.0);
      for (const [x, z] of falls) if (field.inside(x, z)) field.step(x, z, 0.07, 1);
      field.regrow(dt);
      const m = new THREE.Matrix4();
      sim.ghosts.forEach((g, i) => { m.makeTranslation(g.x, field.heightAt(g.x, g.z) + 0.05, g.z); ghosts.setMatrixAt(i, m); });
      ghosts.instanceMatrix.needsUpdate = true;
      if ((sim.clock += dt) > 0.5) { sim.clock = 0; sim.refresh(); }
      field.upload();
    } else if (ghosts) {
      // a cat walking a loop: prints (wet ones on the tataki)
      ghosts.t += dt * (info.hover ? 1.6 : 0.8);
      const a = ghosts.t * 0.9, x = Math.cos(a) * 0.75, z = Math.sin(a) * 0.55, h = Math.atan2(-Math.sin(a) * 0.75, Math.cos(a) * 0.55);
      if ((ghosts.acc = (ghosts.acc || 0) + dt * (info.hover ? 1.6 : 0.8)) > 0.18) {
        ghosts.acc = 0; ghosts.side = 1 - ghosts.side;
        const ox = Math.cos(h) * 0.05 * (ghosts.side ? 1 : -1), oz = -Math.sin(h) * 0.05 * (ghosts.side ? 1 : -1);
        marks.print.stamp(x + ox, z + oz, h, 0.085, v.walkers === 'wetpaws' ? 0.15 : 0.9, v.walkers === 'wetpaws' ? 1 : 0, ghosts.side);
      }
    }
    if (marks?.print) marks.print.update(dt, { depth: 1 / 60, dry: 1 / 9 });
    if (canopy) { canopy.tex.offset.x += dt * 0.004; canopy.tex.offset.y = Math.sin(U.uTime.value * 0.3) * 0.01; }
  };
  const render = finish ? (r, rect) => {
    const rt = finish.begin(rect);
    if (Math.abs(cam.aspect - rect.width / rect.height) > 1e-4) { cam.aspect = rect.width / rect.height; cam.updateProjectionMatrix(); }
    rt.scissorTest = false;
    const pc = r.getClearAlpha();
    r.setRenderTarget(rt); r.setClearAlpha(0); r.clear(); r.render(scene, cam); r.setClearAlpha(pc);
    finish.draw(rect, { paint: v.finish, grade: 1, glow: 0.4 });
  } : undefined;
  return { scene, camera: cam, update, render };
}
