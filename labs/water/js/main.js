// Lab 02 · River, bridge & paddies: the page, the stage, the tools, the loop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, Views, Loop, Meter, Governor, flag, SHOT } from '../../shared/stage.js';
import { Dropdown, seg, slider, toggle, Stepper, Split, Callouts } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { Stage, SEASON_PADDY } from './stage.js';
import { STYLE_ENV } from './water.js';
import { buildBridge } from './bridges.js';
import { buildPaddies } from './paddies.js';
import { VARIANTS, SOURCES, byId } from './variants.js';
import { buildGallery } from './gallery.js';
import { STEPS, BASE } from './steps.js';
import { Sound } from './sound.js';

const $ = (s) => document.querySelector(s);
mountLabChrome('water');

/* ---------------- renderer, stage, cameras ---------------- */

const { renderer, gpu } = createRenderer($('#gl'), { shadows: true, exposure: 1.08 });
const stageEl = $('#stage');
const msg = $('#msg');
let msgTimer = 0;
const say = (m) => { msg.textContent = m; msg.classList.add('on'); clearTimeout(msgTimer); msgTimer = setTimeout(() => msg.classList.remove('on'), 3800); };
const stage = new Stage(renderer, stageEl, { hour: +flag('hour', 10.5), onSay: say });
const sound = new Sound();
stage.sound = sound;
stage.cat.fx.sound = sound;
const lab = window.__water = { stage, renderer };

const orbitCam = new THREE.PerspectiveCamera(40, 2, 0.05, 900);
const eyeCam = new THREE.PerspectiveCamera(60, 2, 0.04, 900);
orbitCam.position.set(5.5, 9.2, 17.5);
const controls = new OrbitControls(orbitCam, stageEl);
controls.target.set(-2.2, 0.3, 0.8);
controls.enableDamping = true;
controls.maxPolarAngle = 1.48;
controls.minDistance = 1.5;
controls.maxDistance = 34;
const S = { view: flag('view') === 'eye' ? 'eye' : 'orbit', tool: 'walk', water: 'kyoto', labels: false, split: null };
const F = { flow: 1, phase: 1, foam: 1, depth: 1, caustic: 1 };
const activeCam = () => (S.view === 'eye' ? eyeCam : orbitCam);
stage.camera = activeCam();

/* ---------------- features and comparisons ---------------- */

function applyFeatures() {
  const U = stage.U;
  U.uFlowOn.value = F.flow; U.uPhaseNoise.value = F.phase; U.uFoamOn.value = F.foam; U.uDepthOn.value = F.depth;
  stage.groundMat.userData.u.uCaustic.value = STYLE_ENV[stage.S.water].caustic * F.caustic;
}

let gameParts = null;
function gameView(on) {
  if (!gameParts && on) {
    const b = buildBridge('game', stage.bridgeOpts('game'));
    const p = buildPaddies({ style: 'game', plots: stage.plots, U: stage.U, groundMat: stage.groundMat, wind: stage.wind, rnd: Math.random });
    stage.scene.add(b.group, p.group);
    gameParts = { b, p };
  }
  if (!gameParts) return;
  gameParts.b.group.visible = on;
  gameParts.p.group.visible = on;
  stage.bridge.group.visible = !on;
  stage.paddies.group.visible = !on;
  stage.water.material = stage.matFor(on ? 'game' : stage.S.water);
  stage.groundMat.userData.u.uCaustic.value = on ? 0 : STYLE_ENV[stage.S.water].caustic * F.caustic;
  stage.mirror.enabled = !on && stage.S.mirror && STYLE_ENV[stage.S.water].mirror;
  stage.U.uMirrorOn.value = stage.mirror.enabled ? 1 : 0;
}

const COMPARE = {
  game: { labels: ['The game today', 'This lab'], left: () => gameView(true), right: () => gameView(false) },
  depth: { labels: ['A flat tint', 'Real depth'], left: () => { stage.U.uDepthOn.value = 0; stage.groundMat.userData.u.uCaustic.value = 0; }, right: applyFeatures },
  phase: { labels: ['Every pixel in step', 'Phase offset per pixel'], left: () => { stage.U.uPhaseNoise.value = 0; }, right: applyFeatures },
  mirror: { labels: ['Sky only', 'Planar mirror'], left: () => { stage.mirror.enabled = false; stage.U.uMirrorOn.value = 0; }, right: () => stage.applyWaterEnv() },
  paint: { labels: ['The photograph', 'The painting'], paintOnly: true }
};
const splitUI = new Split(stageEl, { value: 0.5 });
function setCompare(k) {
  S.split = k && COMPARE[k] ? k : null;
  splitUI.enabled = !!S.split;
  if (S.split) splitUI.setLabels(...COMPARE[S.split].labels);
  else { gameView(false); applyFeatures(); stage.applyWaterEnv(); }
  compareDD.set(S.split || '', false);
}

/* ---------------- slots: water, bridge, paddies ---------------- */

let waterVariant = 'kyoto';
let gallery = null;
const gallerySelect = () => gallery && gallery.select([waterVariant, 'b-' + stage.S.bridge, 'p-' + stage.S.paddy]);

function setWaterVariant(v) {
  waterVariant = v.id;
  stage.setWater(v.style);
  applyFeatures();
  if (v.setup === 'petals') {
    if (stage.S.season !== 'spring') setSeason('spring');
    for (let i = 0; i < 160; i++) { const x = -13 + Math.random() * 7; stage.floaters.add(x, 0.4 + Math.random() * 2, stage.zc(x) + (Math.random() - 0.5) * 4.6); }
    setTool('petals');
  } else if (v.setup === 'night') {
    setHour(21.5);
    for (let i = 0; i < 6; i++) { const x = -12 + i * 1.6; stage.lanterns.add(x, stage.zc(x) + (Math.random() - 0.5) * 2, stage.level); }
    setTool('lantern');
  } else if (v.setup === 'weir') {
    flyTo(new THREE.Vector3(stage.WX + 1.5, 0.1, stage.zc(stage.WX)), new THREE.Vector3(stage.WX + 7, 3.6, stage.zc(stage.WX) + 6.5));
  }
  waterDD.set(v.id, false);
  gallerySelect();
}
function setBridge(type) {
  stage.setBridge(type);
  bridgeDD.set(type, false);
  callouts.set(stage.bridge.callouts);
  gallerySelect();
}
function setPaddy(style) {
  stage.setPaddy(style);
  paddyDD.set(style, false);
  gallerySelect();
}
function setSeason(s) {
  stage.setSeason(s);
  seasonSeg.set(s);
  paddyDD.set(stage.S.paddy, false);
  gallerySelect();
}
function plant(v, scroll = true) {
  if (v.kind === 'water') setWaterVariant(v);
  else if (v.kind === 'bridge') setBridge(v.type);
  else {
    const season = Object.keys(SEASON_PADDY).find((k) => SEASON_PADDY[k] === v.paddy);
    if (season) setSeason(season); else setPaddy(v.paddy);
  }
  if (scroll) stageEl.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  say(`${v.name} is on the stage.`);
}

const item = (v, value) => ({ value, label: v.name, hint: v.tag });
const waterDD = new Dropdown($('#slot-water'), {
  items: VARIANTS.filter((v) => v.kind === 'water').map((v) => ({ ...item(v, v.id), group: v.family === 'field' ? 'From the field' : 'Painted for Kyoto' })),
  value: 'kyoto', columns: 2, wide: true, label: 'Water', onChange: (id) => setWaterVariant(byId(id))
});
const bridgeDD = new Dropdown($('#slot-bridge'), { items: VARIANTS.filter((v) => v.kind === 'bridge').map((v) => item(v, v.type)), value: 'sanjo', label: 'Bridge', onChange: (t) => setBridge(t) });
const paddyDD = new Dropdown($('#slot-paddy'), { items: VARIANTS.filter((v) => v.kind === 'paddy').map((v) => item(v, v.paddy)), value: 'mirror', label: 'Paddies', onChange: (p) => plant(VARIANTS.find((v) => v.paddy === p), false) });

/* ---------------- tools ---------------- */

const TOOLS = [['walk', 'Walk'], ['flow', 'Flow brush'], ['rock', 'Rock'], ['petals', 'Petals'], ['lantern', 'Lanterns'], ['poke', 'Poke']];
const toolSeg = seg($('#tools'), TOOLS.map(([v, label]) => ({ v, label })), 'walk', (v) => setTool(v));
const TOOL_HINT = {
  walk: 'Click to send Michi; Space to jump.', flow: 'Drag across the water to paint the current.', rock: 'Click in the river to drop a boulder.',
  petals: 'Drag to scatter cherry petals (maple leaves in autumn).', lantern: 'Click on the water to float a lantern.', poke: 'Click or drag on the water to make rings.'
};
function setTool(v) {
  S.tool = v;
  toolSeg.set(v);
  $('#toolName').textContent = TOOLS.find((t) => t[0] === v)[1];
  const walk = v === 'walk';
  controls.mouseButtons = { LEFT: walk ? THREE.MOUSE.ROTATE : -1, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: walk ? THREE.TOUCH.ROTATE : -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
  stage.cat.clickToGo = walk;
  stageEl.style.cursor = walk ? 'crosshair' : 'cell';
  if (!walk) say(TOOL_HINT[v]);
}

const ray = new THREE.Raycaster(), UIQ = '.split, .callouts, .callout, .hud, .dd, button, a, input';
const P = { down: false, last: null, clock: 0, painted: 0 };
function hitAt(e, y = stage.level) {
  const r = stageEl.getBoundingClientRect();
  ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) }, activeCam());
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Vector3());
}
const inWater = (p, min = 0.04) => p && stage.field.inside(p.x, p.z) && stage.level - stage.groundAt(p.x, p.z) > min;
function toolAct(e, first) {
  const p = hitAt(e);
  if (!p) return;
  const t = S.tool;
  if (t === 'flow' && P.last && inWater(p, 0)) {
    stage.field.paint(P.last.x, P.last.z, p.x, p.z, 1.1, 0.55, 1.2);
    if (performance.now() - P.painted > 70) { stage.field.compose(); P.painted = performance.now(); }
  } else if (t === 'rock' && first) {
    if (inWater(p, 0.15)) { stage.addRock(p.x, p.z, 0.3 + Math.random() * 0.25); say('The current goes round it: a pillow upstream, an eddy behind.'); }
    else say('Drop rocks where the water is deeper.');
  } else if (t === 'petals') {
    for (let i = 0; i < (first ? 14 : 3); i++) stage.floaters.add(p.x + (Math.random() - 0.5) * 1.2, 1.8 + Math.random() * 1.5, p.z + (Math.random() - 0.5) * 1.2);
  } else if (t === 'lantern' && first) {
    if (inWater(p, 0.1)) stage.lanterns.add(p.x, p.z, stage.level); else say('Lanterns need water to float on.');
  } else if (t === 'poke' && inWater(p, 0.01)) {
    if (first || performance.now() - P.clock > 90) { stage.addRipple(p.x, p.z, first ? 1.3 : 0.8); P.clock = performance.now(); }
  }
  P.last = p;
}
stageEl.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || S.tool === 'walk' || e.target.closest(UIQ)) return;
  stageEl.setPointerCapture(e.pointerId);
  P.down = true; P.last = null;
  toolAct(e, true);
});
stageEl.addEventListener('pointermove', (e) => { if (P.down) toolAct(e, false); });
const up = () => { if (P.down && S.tool === 'flow') stage.field.compose(); P.down = false; P.last = null; };
stageEl.addEventListener('pointerup', up);
stageEl.addEventListener('pointercancel', up);

$('#btn-leap').addEventListener('click', () => { stage.cat.leap(); stageEl.focus({ preventScroll: true }); });

/* ---------------- world controls ---------------- */

const levelCtl = slider($('#c-world'), {
  label: 'Water', min: -0.22, max: 0.86, step: 0.01, value: +flag('level', 0.02),
  fmt: (v) => { const d = Math.round((v - 0.02) * 100); return d === 0 ? 'normal' : (d > 0 ? '+' : '') + d + ' cm'; },
  onInput: (v) => stage.setLevel(v)
});
stage.setLevel(levelCtl.get());
const hourCtl = slider($('#c-world'), { label: 'Hour', min: 0, max: 24, step: 0.05, value: stage.S.hour, fmt: (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`, onInput: (h) => setHour(h) });
function setHour(h) { stage.setHour(h); hourCtl.set(h); }
seg($('#c-world'), [{ v: 5.7, label: 'Dawn mist' }, { v: 8.5, label: 'Morning' }, { v: 12, label: 'Noon' }, { v: 17.6, label: 'Golden' }, { v: 21.5, label: 'Night' }], null, setHour);
const rainCtl = slider($('#c-world'), { label: 'Rain', min: 0, max: 1, step: 0.01, value: +flag('rain', 0), fmt: (v) => Math.round(v * 100) + '%', onInput: (v) => stage.setRain(v) });
stage.setRain(rainCtl.get());
const seasonSeg = seg($('#seasons'), [{ v: 'spring', label: 'Spring' }, { v: 'early', label: 'Early summer' }, { v: 'summer', label: 'Summer' }, { v: 'autumn', label: 'Autumn' }, { v: 'winter', label: 'Winter' }], 'spring', (v) => setSeason(v));

const paintCtl = slider($('#c-look'), { label: 'Painterly', min: 0, max: 1, step: 0.01, value: +flag('paint', 0.35), fmt: (v) => (v < 0.05 ? 'photo' : v > 0.9 ? 'painting' : Math.round(v * 100) + '%'), onInput: (v) => stage.setPaint(v) });
stage.setPaint(paintCtl.get());
const mirrorTog = toggle($('#c-look'), { label: 'Mirror', value: true, onChange: (b) => stage.setMirror(b) });
const callouts = new Callouts(stageEl);
const labelsTog = toggle($('#c-look'), { label: 'Labels', value: false, onChange: (b) => setLabels(b) });
function setLabels(b) {
  const was = S.labels;
  S.labels = b; callouts.visible = b; labelsTog.set(b);
  // the parts are small: come in close to read them
  if (b && !was && stage.bridge.callouts.length) {
    const zc = stage.zc(stage.BX);
    flyTo(new THREE.Vector3(stage.BX, 1.0, zc + 1.2), new THREE.Vector3(stage.BX + 5.2, 3.3, zc + 7.4));
  }
}
callouts.set(stage.bridge.callouts);
setLabels(false);
const viewSeg = seg($('#c-look'), [{ v: 'orbit', label: 'Orbit' }, { v: 'eye', label: 'Cat-eye' }], S.view, (v) => setView(v));
function setView(v) { S.view = v; stage.cat.eyeInit = false; controls.enabled = v === 'orbit'; viewSeg.set(v); stage.camera = activeCam(); }
toggle($('#c-look'), { label: 'Sound', value: false, onChange: (b) => sound.setEnabled(b) });

const debugDD = new Dropdown($('#slot-debug'), {
  items: [{ value: 0, label: 'Final' }, { value: 1, label: 'Flow arrows', hint: 'speed in colour' }, { value: 2, label: 'Depth' }, { value: 3, label: 'Foam' }, { value: 4, label: 'Normals' }],
  value: 0, label: 'Show', onChange: (d) => stage.setDebug(+d)
});
const compareDD = new Dropdown($('#slot-split'), {
  items: [{ value: '', label: 'Off' }, ...Object.entries(COMPARE).map(([k, c]) => ({ value: k, label: `${c.labels[0]} | ${c.labels[1]}` }))],
  value: '', label: 'Compare', onChange: (k) => setCompare(k)
});

function resetAll() {
  setCompare(null);
  Object.assign(F, { flow: 1, phase: 1, foam: 1, depth: 1, caustic: 1 });
  levelCtl.set(0.02); stage.setLevel(0.02);
  rainCtl.set(0); stage.setRain(0);
  paintCtl.set(0.35); stage.setPaint(0.35);
  mirrorTog.set(true); stage.setMirror(true);
  debugDD.set(0, false); stage.setDebug(0);
  stage.clearUserRocks(); stage.field.clearPaint(); stage.field.compose();
  stage.floaters.clear(); stage.lanterns.clear(); stage.drops.clear(); stage.ripples.clear();
  setBridge('sanjo'); setSeason('spring'); setWaterVariant(byId('kyoto')); setHour(10.5); setTool('walk'); setLabels(false);
  const c = stage.cat;
  c.cancel(); c.pos.set(stage.BX + 1.6, stage.zc(stage.BX) + 6.6); c.heading = Math.PI; c.state = 'air'; c.vy = 0; c.wet = 0;
  applyFeatures();
}
$('#btn-reset').addEventListener('click', resetAll);

/* ---------------- quality ---------------- */

let quality = ['eco', 'lush'].includes(flag('quality')) ? flag('quality') : 'auto';
const QUAL = { eco: { pr: 1, mirror: 0.33 }, lush: { pr: Math.min(devicePixelRatio || 1, 1.75), mirror: 0.5 } };
let basePR = renderer.getPixelRatio();
const setPR = (pr) => { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); };
const qSeg = seg($('#c-quality'), [{ v: 'auto', label: 'Auto' }, { v: 'eco', label: 'Eco' }, { v: 'lush', label: 'Lush' }], quality, (v) => setQuality(v));
function setQuality(q) {
  quality = q; qSeg.set(q);
  const Q = q === 'eco' ? QUAL.eco : QUAL.lush;
  stage.S.quality = q;
  stage.mirror.scale = Q.mirror;
  basePR = Q.pr; gov.scale = 1; gov.pixelLowered = false; gov.enabled = q === 'auto' && !SHOT;
  setPR(basePR);
}
const gov = new Governor({
  onScale: (s) => { setPR(basePR * Math.max(0.6, s)); stage.S.quality = s < 0.6 ? 'eco' : 'auto'; stage.mirror.scale = s < 0.6 ? 0.33 : 0.5; },
  onPixelRatio: (pr) => setPR(pr)
});

/* ---------------- steps ---------------- */

let stepsLive = false;
function applyState(step) {
  const s = { ...BASE, ...step.state };
  setCompare(null);
  if (s.water === 'game') { waterVariant = 'game'; stage.setWater('game'); waterDD.set('game', false); }
  else if (byId(waterVariant)?.style !== s.water) setWaterVariant(byId(s.water));
  else stage.setWater(s.water);
  if (stage.S.bridge !== s.bridge) setBridge(s.bridge);
  const paddy = s.paddyGame ? 'game' : SEASON_PADDY[stage.S.season];
  if (stage.S.paddy !== paddy) setPaddy(paddy);
  Object.assign(F, { flow: s.flow, phase: s.phase, foam: s.foam, depth: s.depth, caustic: s.caustic });
  mirrorTog.set(s.mirror); stage.setMirror(s.mirror);
  paintCtl.set(s.paint); stage.setPaint(s.paint);
  debugDD.set(s.debug, false); stage.setDebug(s.debug);
  setLabels(s.labels);
  applyFeatures();
  setCompare(s.split);
  setTool(step.tool || 'walk');
  if (step.hour !== undefined) setHour(step.hour);
  if (step.season) setSeason(step.season);
  if (step.key === 'rocks' && !stage.userRocks.length) { const x = 2.6; stage.addRock(x, stage.zc(x) - 0.4, 0.42); }
  if (step.act === 'leap') setTimeout(() => stage.cat.leap(), 400);
  gallerySelect();
}
const stepper = new Stepper($('#steps-mount'), {
  steps: STEPS.map((s) => ({ title: s.title, body: s.body, code: s.code })),
  onStep: (i) => { if (stepsLive) { applyState(STEPS[i]); stageEl.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); } }
});
stepsLive = true;

/* ---------------- the stage view ---------------- */

const views = new Views(renderer);
const _t = new THREE.Vector3();
let hudClock = 0;
const stageView = views.add(stageEl, {
  scene: stage.scene, camera: orbitCam, margin: 300,
  update(dt, t, rect) {
    const cat = stage.cat;
    cat.active = rect.top < innerHeight * 0.66 && rect.bottom > innerHeight * 0.34;
    stage.camera = activeCam();
    cat.update(dt, { camera: activeCam(), tank: S.view === 'eye' && !cat.route.length && !cat.script });
    stage.update(dt, t);
    if (S.view === 'eye') {
      cat.eyeCamera(eyeCam, dt, { back: 1.4, height: 0.5, ahead: 1.2 });
      eyeCam.position.y = Math.max(eyeCam.position.y, stage.level + 0.12);
    } else {
      if (cat.moving || cat.state !== 'ground') {
        _t.set(cat.pos.x - controls.target.x, cat.y + 0.25 - controls.target.y, cat.pos.y - controls.target.z).multiplyScalar(Math.min(1, dt * 0.9));
        controls.target.add(_t); orbitCam.position.add(_t);
      }
      if (fly) flyStep(dt);
      controls.update();
    }
    if (S.labels) callouts.update(activeCam(), rect);
    if ((hudClock += dt) > 0.12) { hudClock = 0; hud(); }
    // sound: distance to the river and the weir
    const c = stage.centre.nearest(cat.pos.x, cat.pos.y, {});
    const river = THREE.MathUtils.smoothstep(-Math.abs(c.s), -9, -2.5);
    const weir = THREE.MathUtils.smoothstep(-Math.hypot(cat.pos.x - stage.WX, cat.pos.y - stage.zc(stage.WX)), -9, -2);
    sound.ambience(dt, { river, weir, frogs: stage.night * (['early', 'summer'].includes(stage.S.season) ? 1 : 0) });
  },
  render(r, rect) {
    const sp = S.split ? { value: splitUI.value, left: COMPARE[S.split].left, right: COMPARE[S.split].right, paintOnly: COMPARE[S.split].paintOnly } : null;
    stage.render(r, rect, activeCam(), sp);
  }
});

// a gentle camera flight (for the weir card)
let fly = null;
function flyTo(target, pos) { if (S.view !== 'orbit') setView('orbit'); fly = { target, pos, t: 0 }; }
function flyStep(dt) {
  fly.t += dt;
  const k = Math.min(1, dt * 2.2);
  controls.target.lerp(fly.target, k);
  orbitCam.position.lerp(fly.pos, k);
  if (fly.t > 2.2) fly = null;
}

function hud() {
  const st = stage.cat.status();
  const turtle = stage.kame.neckY;
  const lv = stage.level;
  const tline = lv > turtle + 0.12 ? 'The turtles are under water.' : lv > turtle - 0.03 ? 'The turtle is in up to its neck.' : lv < 0.02 - 0.12 ? 'Low water: the turtles stand high and dry.' : '';
  $('#hudCat').innerHTML = `<b>${st.state}</b> ${st.prep} ${st.on}<br>`
    + (st.depth > 0.01 ? `water ${Math.round(st.depth * 100)} cm · current ${st.current.toFixed(2)} m/s<br>` : `${(st.height - lv >= 0 ? '+' : '')}${(st.height - lv).toFixed(2)} m above the river<br>`)
    + `coat <span class="bar"><i style="width:${Math.round(st.wet * 100)}%"></i></span> ${st.wet > 0.05 ? Math.round(st.wet * 100) + '% wet' : 'dry'}`
    + (tline ? `<br><i>${tline}</i>` : '');
}

/* ---------------- gallery, game notes, sources ---------------- */

gallery = buildGallery({ mount: $('#families'), views, renderer, getHour: () => stage.S.hour, onPlant: (v) => plant(v) });
gallerySelect();
seg($('#c-cubes'), [{ v: 8.5, label: 'Morning' }, { v: 12, label: 'Noon' }, { v: 17.6, label: 'Golden' }, { v: 21.5, label: 'Night' }], null, setHour);
$('#c-cubes').insertAdjacentHTML('afterbegin', '<span class="ctl-l">Light for the cubes and the stage</span>');

const GAME = [
  '<code>createRiverWaterMaterial()</code> becomes the <em>Kyoto</em> style. The field is built once from <code>RIVER_POINTS</code> and the carved bed <code>riverBedDepth()</code> already provides, at 8 texels/m, and uploaded as one half-float texture. Flow round the bridge piers and the boulders comes free from their colliders.',
  '<code>buildRiverAndBridge()</code> swaps the box deck for the <em>Sanjō</em> kit with the same walkable numbers: deck top 1.08 m, the top rail as the ledge, ramps at 2.6 m. The deck <code>Box3</code> platforms stay; the railing panels become colliders.',
  'Kame-ishi go in below the bridge as platforms, a crossing that doesn’t need the bridge. The HUD’s turtle line is a good rain-day signal.',
  '<code>buildPaddies()</code> plants rice hills on the 30 × 15 cm grid as one instanced mesh per stage (about 22 a square metre) with the honami wind and the cat push. The season changes the hill geometry and the water mode. Each flooded plot gets a mirror in Lush quality only.',
  '<code>player.js</code> already has <code>isInWater</code>, <code>wadeDepthAt</code>, a splash and buoyancy. Add the swim state (float at level − 0.16, current drift 0.85 × flow, no jumping), the 9.4 Hz shake, wet fur (scale <code>cat.palette</code>) and wet prints.',
  'The painterly pass slots into <code>postfx.js</code> as one more full-screen pass, mixed by the comfort settings (off when reduce-motion is on, since it shimmers slightly in motion).',
  'Review sheet next: <code>tools/water_preview.html?spot=bridge|stones|weir|paddies&amp;hour=…</code> on the same builders with seeded randomness.'
];
$('#game-list').innerHTML = GAME.map((g) => `<li>${g}</li>`).join('');
$('#srcList').innerHTML = Object.values(SOURCES).map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${l}</a></li>`).join('');

/* ---------------- the cat wakes ---------------- */

stage.cat.load({ scene: stage.scene, renderer, sunDir: stage.rig.sunDir, rig: stage.rig }).then(() => {
  $('#wake').hidden = true;
  lab.catReady = stage.cat.ready;
  if (flag('leap') === '1') setTimeout(() => stage.cat.leap(), 600);
});
if (flag('cat') === '0') $('#wake').hidden = true;
addEventListener('keydown', (e) => {
  if (!stage.cat.active || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, .dd')) return;
  if (e.code === 'KeyV') setView(S.view === 'orbit' ? 'eye' : 'orbit');
  if (e.code === 'KeyJ') stage.cat.leap();
});

/* ---------------- loop ---------------- */

const meter = new Meter($('#perf'), gpu);
let statClock = 0;
new Loop((dt, t, raw) => {
  const t0 = performance.now();
  views.render(dt, t);
  meter.tick(raw, performance.now() - t0, quality);
  gov.tick(dt, raw * 1000);
  if ((statClock += dt) > 0.3) {
    statClock = 0;
    gallery.refreshStats();
    const s = stageView.stats;
    $('#stats').textContent = `${s.tris.toLocaleString()} tris · ${s.calls} draws (mirrors included) · field ${stage.field.nx}×${stage.field.nz} · ${stage.world.solids.length} solids · ${stageView.cpuMs.toFixed(2)} ms cpu · mirror ${stage.mirror.enabled ? Math.round(stage.mirror.scale * 100) + '%' : 'off'} · painterly ${Math.round(stage.S.paint * 100)}%`;
  }
}).start();

/* ---------------- start state ---------------- */

setTool('walk');
setQuality(quality);
applyFeatures();
if (flag('season')) setSeason(flag('season'));
if (flag('bridge')) setBridge(flag('bridge'));
if (flag('water') && byId(flag('water'))) setWaterVariant(byId(flag('water')));
if (flag('paddy')) setPaddy(flag('paddy'));
if (flag('step')) { const n = Math.max(1, Math.min(STEPS.length, +flag('step'))); stepper.go(n - 1); }
if (flag('compare')) setCompare(flag('compare'));
if (flag('labels') === '1') setLabels(true);
if (flag('nohud') === '1') document.querySelectorAll('.hud').forEach((h) => { h.style.display = 'none'; });
setView(S.view);
Object.assign(lab, { setHour, setSeason, setBridge, setPaddy, setWaterVariant, plant, applyState, stepper, gallery, setView, setCompare, setTool, controls, orbitCam, eyeCam, resetAll, F, applyFeatures, byId });
