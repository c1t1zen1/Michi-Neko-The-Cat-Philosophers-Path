// Lab 03 · Ranges: the page, the valley, the benches, the loop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, Views, Loop, Meter, Governor, renderSplit, renderRect, flag, Q, SHOT, reduceMotion, inView } from '../../shared/stage.js';
import { LightRig } from '../../shared/light.js';
import { CatWalker } from '../../shared/catwalk.js';
import { Dropdown, seg, Stepper, Split, Callouts } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { loadFoliageModule } from '../../shared/game.js';
import { terrainHeight } from './profiles.js';
import { Valley } from './hero.js';
import { buildStack, buildWallBench, buildEdgeScene, buildAirBench, buildDrawScene } from './tiles.js';
import { WALL_METHODS, RIDGE_MODES, KASUMI_STYLES, STACK_PROFILES, STEPS, SOURCES } from './data.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
mountLabChrome('ranges');

const motion = { still: reduceMotion || flag('still') === '1' || SHOT };
const mo = () => (motion.still ? 0 : 1);
const { renderer, gpu } = createRenderer($('#gl'), { clear: 0xffffff, exposure: 1.08, shadows: false, maxPR: 1.75 });
const views = new Views(renderer);
const rangesLab = window.rangesLab = { ready: false };

/* ---------------- the valley ---------------- */

const F = await loadFoliageModule();
const valley = new Valley(renderer, F);
const rig = new LightRig(valley.scene, { hour: +flag('hour', 9.8), shadows: false, sky: true, fog: false });
valley.scene.fog = new THREE.FogExp2(rig.palette.fog.getHex(), valley.fogBase);
valley.setWall(flag('wall', 'mass'));
valley.ensureCarpet();
valley.setRidges(flag('ridges', 'stack'));
valley.setKasumi(flag('kasumi', 'suyari'));
valley.setVeil(+flag('veil', 1));
valley.setClouds(+flag('clouds', 0.8));
valley.setWind(+flag('wind', 0.8));

const stageEl = $('#stage');
const cam = new THREE.PerspectiveCamera(42, 2, 0.1, 1400);
const eyeCam = new THREE.PerspectiveCamera(60, 2, 0.04, 900);
const controls = new OrbitControls(cam, stageEl);
controls.target.set(0, 60, -160);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI * 0.495;
cam.position.set(0, 9, 26);
if (Q.has('cam')) {
  const p = flag('cam').split(',').map(Number);
  if (p.length >= 6 && p.every(Number.isFinite)) { cam.position.set(p[0], p[1], p[2]); controls.target.set(p[3], p[4], p[5]); }
}

const S = { view: flag('view', 'orbit') };
const activeCam = () => (S.view === 'eye' ? eyeCam : cam);

const walker = new CatWalker({
  parent: valley.scene, dom: stageEl, camera: activeCam, ground: valley.ground,
  heightAt: terrainHeight, bounds: { x0: -33, x1: 33, z0: -33, z1: 33 },
  blocked: (x, z) => Math.hypot(x, z) > 33,
  start: { x: 3, z: 10, heading: -Math.PI / 3 }
});

const splitUI = new Split(stageEl, { left: 'No air', right: 'Shared air' });
const noAir = () => { valley.setVeil(0); };
const withAir = () => { valley.setVeil(valley.veilK); };
const heroView = views.add(stageEl, {
  scene: valley.scene, camera: cam,
  update(dt, t, rect) {
    walker.active = rect.top < innerHeight * 0.62 && rect.bottom > innerHeight * 0.3;
    const m = mo();
    valley.update(dt * m, t * m, rig);
    if (motion.still) walker.update(0, { camera: activeCam() });
    else walker.update(dt, { camera: activeCam(), tank: S.view === 'eye' && walker.mode === 'drive' });
    if (S.view === 'eye') walker.eyeCamera(eyeCam, dt || 0.016);
    else {
      if (walker.moving) {
        _v.set(walker.pos.x - controls.target.x, 0, walker.pos.y - controls.target.z).multiplyScalar(Math.min(1, dt * 0.5));
        controls.target.add(_v); cam.position.add(_v);
      }
      controls.update();
    }
  },
  render(r, rect) {
    const c = activeCam();
    if (splitUI.enabled) {
      renderSplit(r, rect, splitUI.value, [valley.scene, c, noAir], [valley.scene, c, withAir]);
      withAir();
    } else renderRect(r, rect, valley.scene, c);
  }
});
const _v = new THREE.Vector3();

/* ---------------- hero controls ---------------- */

const wallDD = new Dropdown($('#slot-wall'), {
  items: WALL_METHODS, value: valley.wall, label: 'Wall technique', wide: true,
  onChange: (v) => valley.setWall(v)
});
const ridgeSeg = seg($('#seg-ridges'), RIDGE_MODES, valley.ridges, (v) => valley.setRidges(v));
const kasumiDD = new Dropdown($('#slot-kasumi'), {
  items: KASUMI_STYLES, value: valley.kasumiStyle, label: 'Mist band style',
  onChange: (v) => valley.setKasumi(v)
});
const viewSeg = seg($('#seg-view'), [{ v: 'orbit', label: 'Orbit' }, { v: 'eye', label: 'Cat-eye' }, { v: 'split', label: 'Air A/B' }], 'orbit', (v) => setView(v));
function setView(v) {
  S.view = v === 'split' ? 'orbit' : v;
  splitUI.enabled = v === 'split';
  walker.eyeInit = false;
  controls.enabled = S.view === 'orbit';
  viewSeg.set(v);
}
const gaitSeg = seg($('#seg-gait'), [{ v: 'walk', label: 'Walk' }, { v: 'prowl', label: 'Prowl' }], 'walk', (v) => { walker.prowl = v === 'prowl'; });

let hour = rig.hour;
const fmtHour = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
function setHour(h) {
  hour = h;
  rig.setHour(h);
  if (valley.scene.fog) valley.scene.fog.color.copy(rig.palette.fog);
  $('#hour').value = h;
  $('#hour-out').textContent = fmtHour(h);
}
$('#hour').addEventListener('input', (e) => setHour(+e.target.value));
seg($('#seg-hour'), [{ v: 6.5, label: 'Dawn' }, { v: 9.8, label: 'Morning' }, { v: 17.8, label: 'Golden' }, { v: 21.5, label: 'Night' }], null, setHour);

/* Sliders live in markup (id-based), so bind directly */
const bind = (id, out, fmt, fn) => {
  const el = $(id), o = $(out);
  const upd = () => { const v = +el.value; o.textContent = fmt(v); fn(v); };
  el.addEventListener('input', upd);
  return { set: (v) => { el.value = v; upd(); } };
};
const veilCtl = bind('#veil', '#veil-out', (v) => `${Math.round(v * 100)}%`, (v) => valley.setVeil(v));
const cloudCtl = bind('#clouds', '#clouds-out', (v) => `${Math.round(v * 100)}%`, (v) => valley.setClouds(v));
const windCtl = bind('#wind', '#wind-out', (v) => `${Math.round(v * 100)}%`, (v) => valley.setWind(v));
veilCtl.set(valley.veilK); cloudCtl.set(valley.air.u.uCloudAmt.value); windCtl.set(valley.wind);

/* ---------------- bench views ---------------- */

// 02 · the stack
let stack = null;
const stackView = views.add($('#stackStage'), {
  margin: 400,
  build() { stack = buildStack({ profile: stackProfileDD.value }); return { scene: stack.scene, camera: stack.camera }; },
  update(dt, t) { stack?.update(dt * mo(), t * mo()); }
});
const stackProfileDD = new Dropdown($('#slot-stack'), {
  items: STACK_PROFILES, value: 'higashiyama', label: 'Ridge profile',
  onChange: (v) => stack?.setProfile(v)
});
bind('#gap', '#gap-out', (v) => `${Math.round(v * 100)}%`, (v) => stack?.setGap(v));

// 03 · the wall, four ways
let wallBench = null;
const WALL4 = [
  { v: 'mass', label: 'Instances' }, { v: 'cards', label: 'Cards' },
  { v: 'impostor', label: 'Impostors' }, { v: 'painted', label: 'Painted' }
];
const WALL_NOTES = {
  mass: 'the game’s own recipe — 9 draws, ~60k tris, full wind and rustle',
  cards: 'two quads per tree — 2 draws, ~1k tris, static but cheap',
  impostor: 'one quad per tree — 1 draw, ~500 tris, baked parallax views',
  painted: 'the matte painting — 1 draw, 2 tris, from £0.02 a frame'
};
const wallView = views.add($('#wallStage'), {
  margin: 400,
  build() { wallBench = buildWallBench(renderer, F); return { scene: wallBench.scene, camera: wallBench.camera }; },
  update(dt, t) {
    wallBench?.update(dt * mo(), t * mo());
    if (wallBench && (this._statT = (this._statT || 0) + dt) > 0.5) {
      this._statT = 0;
      $('#wallStats').textContent = `${wallView.stats.calls} draws · ${wallView.stats.tris.toLocaleString()} tris — ${WALL_NOTES[wallBenchKind]}`;
    }
  }
});
let wallBenchKind = 'mass';
seg($('#seg-wall4'), WALL4, 'mass', (v) => {
  wallBenchKind = v;
  wallBench?.set(v);
  $('#atlasFig').hidden = !(v === 'impostor' && wallBench?.atlas);
  if (v === 'impostor' && wallBench?.atlas && !$('#atlasMount').firstChild) {
    wallBench.atlas.canvas.style.width = '100%';
    wallBench.atlas.canvas.style.imageRendering = 'auto';
    $('#atlasMount').append(wallBench.atlas.canvas);
  }
});

// 04 · the edge in section
let edgeBench = null;
const edgeCallouts = new Callouts($('#edgeStage'));
const edgeView = views.add($('#edgeStage'), {
  margin: 400,
  build() {
    edgeBench = buildEdgeScene(F);
    edgeCallouts.set(edgeBench.labels);
    edgeCallouts.visible = $('#labels-toggle').checked;
    return { scene: edgeBench.scene, camera: edgeBench.camera };
  },
  update(dt, t, rect) {
    edgeBench?.update(dt * mo(), t * mo());
    edgeCallouts.update(edgeBench.camera, rect);
  }
});
$('#labels-toggle').addEventListener('change', (e) => { edgeCallouts.visible = e.target.checked; });

// 05 · the air bench
let airBench = null;
views.add($('#airStage'), {
  margin: 400,
  build() { airBench = buildAirBench(); airBench.setVeil(+$('#airVeil').value); return { scene: airBench.scene, camera: airBench.camera }; },
  update(dt, t) { airBench?.update(dt * mo(), t * mo()); }
});
bind('#airVeil', '#airVeil-out', (v) => `${Math.round(v * 100)}%`, (v) => airBench?.setVeil(v));
seg($('#seg-reverse'), [{ v: 0, label: 'Forward (cool far)' }, { v: 1, label: 'Reverse (warm far)' }], 0, (v) => airBench?.setReverse(!!v));

// 06 · draw a ridge
let drawBench = null;
views.add($('#drawStage'), {
  margin: 400,
  build() { drawBench = buildDrawScene(); return { scene: drawBench.scene, camera: drawBench.camera }; },
  update(dt, t) { drawBench?.update(dt * mo(), t * mo()); }
});
const pad = $('#strokePad');
let stroke = null;
const padCtx = pad.getContext('2d');
function padResize() { pad.width = pad.clientWidth * devicePixelRatio; pad.height = pad.clientHeight * devicePixelRatio; }
padResize();
addEventListener('resize', padResize);
function padDraw() {
  padCtx.clearRect(0, 0, pad.width, pad.height);
  if (!stroke || stroke.length < 2) return;
  padCtx.strokeStyle = '#1b261a'; padCtx.lineWidth = 2.4 * devicePixelRatio; padCtx.lineCap = 'round';
  padCtx.beginPath();
  stroke.forEach((p, i) => { const x = p.u * pad.width, y = (1 - p.h) * pad.height; i ? padCtx.lineTo(x, y) : padCtx.moveTo(x, y); });
  padCtx.stroke();
}
const padPoint = (e) => {
  const r = pad.getBoundingClientRect();
  return { u: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), h: Math.min(1, Math.max(0.06, 1 - (e.clientY - r.top) / r.height)) };
};
pad.addEventListener('pointerdown', (e) => {
  e.preventDefault(); pad.setPointerCapture(e.pointerId);
  stroke = [padPoint(e)]; padDraw();
});
pad.addEventListener('pointermove', (e) => {
  if (!stroke) return;
  stroke.push(padPoint(e));
  padDraw();
  drawBench?.setStroke(stroke);
});
for (const ev of ['pointerup', 'pointercancel']) pad.addEventListener(ev, () => { stroke = null; });
$('#strokeClear').addEventListener('click', () => { stroke = null; padDraw(); drawBench?.setStroke(null); });
$('#drawKasumi').addEventListener('change', (e) => drawBench?.setKasumi(e.target.checked));

/* ---------------- learn by building ---------------- */

let stepsLive = false;
const stepper = new Stepper($('#steps-mount'), {
  steps: STEPS.map((s) => ({ title: s.title, body: s.body, code: s.code })),
  onStep(i) {
    if (!stepsLive) return;
    const st = STEPS[i].state;
    valley.applyState(st);
    if (st.wall !== undefined) wallDD.set(st.wall, false);
    if (st.ridges !== undefined) ridgeSeg.set(st.ridges);
    if (st.kasumi !== undefined) kasumiDD.set(st.kasumi, false);
    if (STEPS[i].hour) setHour(STEPS[i].hour);
    stageEl.scrollIntoView({ behavior: motion.still ? 'instant' : 'smooth', block: 'center' });
  }
});
stepsLive = true;

/* ---------------- quality, meter, loop ---------------- */

let basePR = renderer.getPixelRatio();
const setPR = (pr) => { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); };
let quality = ['eco', 'lush'].includes(flag('quality')) ? flag('quality') : 'auto';
const qSeg = seg($('#seg-quality'), [{ v: 'auto', label: 'Auto' }, { v: 'eco', label: 'Eco' }, { v: 'lush', label: 'Lush' }], quality, (v) => setQuality(v));
const gov = new Governor({
  onScale: (s) => setPR(basePR * Math.max(0.55, s)),
  onPixelRatio: (pr) => setPR(pr)
});
function setQuality(q) {
  quality = q; qSeg.set(q);
  basePR = q === 'eco' ? 1 : Math.min(devicePixelRatio || 1, 1.75);
  gov.scale = 1; gov.pixelLowered = false; gov.enabled = q === 'auto' && !SHOT;
  setPR(basePR);
}
const meter = new Meter($('#perf'), gpu);
let statClock = 0;
new Loop((dt, t, raw) => {
  const start = performance.now();
  const rect = stageEl.getBoundingClientRect();
  if (!inView(rect)) { walker.active = false; walker.keys.clear(); }
  views.render(dt, t);
  meter.tick(raw, performance.now() - start, quality);
  gov.tick(dt, raw * 1000);
  if ((statClock += dt) > 0.4) {
    statClock = 0;
    $('#heroStats').textContent = `${heroView.stats.calls} draws · ${heroView.stats.tris.toLocaleString()} tris · wall: ${valley.wall} · ranges: ${valley.ridges}`;
  }
}).start();

/* ---------------- cat ---------------- */

walker.load({ scene: valley.scene, renderer, sunDir: rig.sunDir, rig }).then(() => {
  $('#wake').hidden = true;
  rangesLab.catReady = walker.ready;
  if (!walker.ready && flag('cat') !== '0') $('#wake').textContent = '';
});

/* ---------------- shot / poster / QA ---------------- */

if (flag('poster') === '1' || SHOT) {
  setHour(+flag('hour', 9.8));
  if (flag('wall')) valley.setWall(flag('wall'));
  if (flag('ridges')) valley.setRidges(flag('ridges'));
  if (flag('kasumi')) valley.setKasumi(flag('kasumi'));
  document.body.classList.add('shot');
  if (flag('poster') === '1') document.body.classList.add('poster');
  document.documentElement.style.scrollBehavior = 'auto';
  const at = flag('at');
  if (at) {
    const go = () => document.getElementById(at)?.scrollIntoView({ block: 'center' });
    if (document.fonts?.ready) document.fonts.ready.then(() => setTimeout(go, 60));
    else setTimeout(go, 900);
  }
}
setHour(hour);
setView(flag('view', 'orbit'));
$('#source-list').innerHTML = SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title} ↗</a><small>${s.note}</small></li>`).join('');

Object.assign(rangesLab, {
  ready: true, valley, rig, views, walker, stepper, renderer,
  setHour, setView, setQuality,
  stats: () => ({ draws: heroView.stats.calls, tris: heroView.stats.tris, frames: window.__frames, catReady: walker.ready, gpu })
});
$('#wake').hidden = true;
