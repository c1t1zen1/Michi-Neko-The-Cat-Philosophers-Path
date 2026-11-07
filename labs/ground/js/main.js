// Lab 01 · Ground, path & shoulders: the page, the stage, the tools, the loop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, Views, Loop, Meter, Governor, flag, SHOT } from '../../shared/stage.js';
import { Dropdown, seg, slider, toggle, Stepper, Split } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { loadFoliageModule, loadGrassModule, loadSkyModule } from '../../shared/game.js';
import { Stage } from './stage.js';
import { PAVE } from './field.js';
import { PROUD, STONE_KINDS } from './stones.js';
import { SKIES } from './weather.js';
import { createGroundMaterial } from './ground.js';
import { STEPS } from './steps.js';
import { buildGallery } from './gallery.js';
import { SOURCES, GAME } from './variants.js';
import { Sound } from './sound.js';
import { POIS } from './scene.js';

const $ = (s) => document.querySelector(s);
mountLabChrome('ground');

/* ---------------- renderer, stage, cameras ---------------- */

const { renderer, gpu } = createRenderer($('#gl'), { shadows: true, exposure: 0.96 });
const stageEl = $('#stage');
const msg = $('#msg');
let msgTimer = 0;
const say = (m) => { msg.textContent = m; msg.classList.add('on'); clearTimeout(msgTimer); msgTimer = setTimeout(() => msg.classList.remove('on'), 4600); };
let quality = ['eco', 'lush'].includes(flag('quality')) ? flag('quality') : 'auto';
const { Sky } = await loadSkyModule();
const stage = new Stage(renderer, stageEl, { hour: +flag('hour', 16.2), quality: quality === 'eco' ? 'eco' : 'lush', onSay: say, SkyClass: Sky });
const sound = new Sound();
stage.sound = sound;
const lab = window.__ground = { stage, renderer, ready: false };

const orbitCam = new THREE.PerspectiveCamera(38, 2, 0.05, 900);
const eyeCam = new THREE.PerspectiveCamera(58, 2, 0.03, 900);
const planCam = new THREE.PerspectiveCamera(30, 2, 0.5, 900);
orbitCam.position.set(8.6, 6.4, 12.4);
planCam.position.set(0.001, 26, 0.6); planCam.lookAt(0, 0, 0.1);
const controls = new OrbitControls(orbitCam, stageEl);
controls.target.set(-0.6, 0.2, -0.2);
controls.enableDamping = true;
controls.maxPolarAngle = 1.5;
controls.minDistance = 1.2;
controls.maxDistance = 32;
const S = { valleyAuto: true, view: ['eye', 'plan'].includes(flag('view')) ? flag('view') : 'orbit', tool: 'walk', compare: null, size: 0.55, pave: PAVE.setts, debug: 0 };
let valleyTog = null;
const activeCam = () => (S.view === 'eye' ? eyeCam : S.view === 'plan' ? planCam : orbitCam);
stage.cam = activeCam();
if (flag('cam')) {
  const c = flag('cam').split(',').map(Number);
  orbitCam.position.set(c[0], c[1], c[2]); controls.target.set(c[3], c[4], c[5]);
  if (c[6]) { orbitCam.fov = c[6]; orbitCam.updateProjectionMatrix(); }
}

/* ---------------- the sentence: season, hour, sky ---------------- */

const SEASONS = [
  { value: 'spring', label: 'spring', hint: 'petals blow in and drift against the edges' },
  { value: 'summer', label: 'early summer', hint: 'deep greens, uchimizu weather' },
  { value: 'autumn', label: 'autumn', hint: 'the maple turns and drops its leaves' },
  { value: 'winter', label: 'winter', hint: 'shikimatsuba over the moss, snow if you ask' }
];
const HOURS = [
  { value: 6.4, label: 'at first light' }, { value: 9.5, label: 'in the morning' }, { value: 12.5, label: 'at midday' },
  { value: 16.2, label: 'in the afternoon' }, { value: 17.6, label: 'in the golden hour' }, { value: 19.1, label: 'at dusk' }, { value: 21.5, label: 'at night' }
];
const SKY_ITEMS = Object.entries(SKIES).map(([value, label]) => ({ value, label: { clear: 'under a clear sky', drops: 'as the first drops fall', rain: 'in the rain', after: 'after the rain', snow: 'in the snow' }[value], hint: label }));
const seasonDD = new Dropdown($('#slot-season'), { items: SEASONS, value: flag('season', 'summer'), label: 'Season', onChange: (v) => setSeason(v) });
const nearestHour = (h) => HOURS.reduce((a, b) => (Math.abs(b.value - h) < Math.abs(a.value - h) ? b : a)).value;
const hourDD = new Dropdown($('#slot-hour'), { items: HOURS, value: nearestHour(+flag('hour', 16.2)), label: 'Time of day', onChange: (v) => setHour(v) });
const skyDD = new Dropdown($('#slot-sky'), { items: SKY_ITEMS, value: flag('sky', 'clear'), label: 'Weather', onChange: (v) => setSky(v) });
function setSeason(v) { stage.setSeason(v); seasonDD.set(v, false); if (v === 'winter' && stage.weather.mode !== 'snow') say('Winter: the gardener has laid shikimatsuba over the roji moss. Try “in the snow”.'); }
function setHour(v) { stage.setHour(v); hourDD.set(nearestHour(v), false); }
function setSky(v) {
  stage.weather.set(v); skyDD.set(v, false);
  if (v === 'rain') say('Rain: the porous ground darkens first, the ruts and the ditch fill, the lowest first.');
  if (v === 'after') say('After the rain: the shine goes before the dark does. Walk Michi through a puddle and watch the paws.');
  if (v === 'drops') say('The first drops speckle the dry ground before it darkens all over.');
}

/* ---------------- tools ---------------- */

const TOOLS = [
  ['walk', '歩', 'Walk', 'click to send Michi'],
  ['sweep', '箒', 'Sweep', 'hōki: broom marks, sweep leaves and snow'],
  ['rake', '熊手', 'Rake', 'samon: drag for ripples, click a rock for rings'],
  ['ladle', '柄杓', 'Uchimizu', 'throw water; watch it dry, sun first'],
  ['stones', '飛石', 'Stones', 'click to set a tobi-ishi (again to lift it)'],
  ['barrier', '関守石', 'Barrier', 'a sekimori-ishi: the cats go round'],
  ['moss', '苔', 'Moss', 'paint'], ['grass', '草', 'Grass', 'paint; the game grass grows there'],
  ['earth', '土', 'Earth', 'scrape back to masa-do'], ['gravel', '砂利', 'Gravel', 'paint'], ['sand', '白砂', 'Sand', 'paint'],
  ['pave', '石畳', 'Pave', 'paint stone paving'], ['dig', '掘', 'Dig', 'drag to dig; Shift to raise']
];
const toolSeg = seg($('#tools'), TOOLS.map(([v, k, t]) => ({ v, label: `<span class="k">${k}</span><span class="t">${t}</span>`, title: TOOLS.find((x) => x[0] === v)[3] })), S.tool, (v) => setTool(v));
const toolOpts = $('#toolOpts');
const sizeCtl = slider(toolOpts, { label: 'Brush', min: 0.15, max: 1.6, step: 0.05, value: S.size, fmt: (v) => v.toFixed(2) + ' m', onInput: (v) => { S.size = v; } });
const paveWrap = document.createElement('div'); paveWrap.className = 'ctl'; paveWrap.innerHTML = '<span class="ctl-l">Paving</span><span class="slot"></span>'; toolOpts.append(paveWrap);
new Dropdown(paveWrap.querySelector('.slot'), {
  items: [
    { value: PAVE.setts, label: 'ishidatami setts', hint: 'Ishibe-kōji: the old tram stones' }, { value: PAVE.slabs, label: 'kiri-ishi slabs', hint: '600 × 300 mm granite' },
    { value: PAVE.nobedan, label: 'nobedan', hint: 'cut and natural stones together' }, { value: PAVE.arare, label: 'arare-koboshi', hint: 'hailstone pebbles in mortar' },
    { value: PAVE.uroko, label: 'irokojiki', hint: 'fish-scale squares, after Konchi-in' }, { value: PAVE.araidashi, label: 'araidashi', hint: 'black pebbles washed out of cement' }
  ], value: S.pave, label: 'Paving pattern', onChange: (v) => { S.pave = +v; }
});
const stoneWrap = document.createElement('div'); stoneWrap.className = 'ctl'; stoneWrap.innerHTML = '<span class="ctl-l">Stones</span><span class="slot s1"></span><span class="slot s2"></span>'; toolOpts.append(stoneWrap);
new Dropdown(stoneWrap.querySelector('.s1'), { items: Object.entries(PROUD).map(([k, v]) => ({ value: k, label: { rikyu: 'Rikyū', oribe: 'Oribe', enshu: 'Enshū' }[k], hint: `set ${Math.round(v * 100)} cm proud` })), value: 'oribe', label: 'Stone height', onChange: (v) => { stage.stones.style = v; } });
new Dropdown(stoneWrap.querySelector('.s2'), { items: Object.keys(STONE_KINDS).map((k) => ({ value: k, label: { kurama: 'Kurama stone', kibune: 'Kibune stone', granite: 'Shirakawa granite' }[k] })), value: 'kurama', label: 'Stone kind', onChange: (v) => { stage.stones.kind = v; } });
function setTool(v) {
  S.tool = v; toolSeg.set(v);
  const t = TOOLS.find((x) => x[0] === v);
  $('#toolJp').textContent = t[1]; $('#toolName').textContent = t[2]; $('#toolTip').textContent = t[3];
  const painting = !['walk', 'ladle', 'stones', 'barrier'].includes(v);
  sizeCtl.el.hidden = !painting || v === 'sweep' || v === 'rake';
  paveWrap.hidden = v !== 'pave';
  stoneWrap.hidden = v !== 'stones';
  toolOpts.hidden = sizeCtl.el.hidden && paveWrap.hidden && stoneWrap.hidden;
  if (stage.cat) stage.cat.clickToGo = v === 'walk';
  controls.mouseButtons = { LEFT: v === 'walk' ? THREE.MOUSE.ROTATE : null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: v === 'walk' ? THREE.TOUCH.ROTATE : null, TWO: THREE.TOUCH.DOLLY_ROTATE };
  stageEl.style.cursor = v === 'walk' ? 'grab' : 'crosshair';
}
setTool('walk');

// the ground under the pointer: the ray meets the plane, then the real height
const ray = new THREE.Raycaster(), _p = new THREE.Vector3(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundPoint(e) {
  const r = stageEl.getBoundingClientRect();
  ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, activeCam());
  plane.constant = 0;
  for (let k = 0; k < 3; k++) {
    if (!ray.ray.intersectPlane(plane, _p)) return null;
    plane.constant = -stage.heightAt(_p.x, _p.z);
  }
  return stage.field.inside(_p.x, _p.z) ? { x: _p.x, z: _p.z } : null;
}
let drag = null;
stageEl.addEventListener('pointerdown', (e) => {
  if (S.tool === 'walk' || e.button !== 0 || e.target.closest('.split-handle, .hud, button')) return;
  const p = groundPoint(e);
  if (!p) return;
  drag = { prev: p, id: e.pointerId };
  stageEl.setPointerCapture(e.pointerId);
  const r = stage.tool(S.tool, 'down', p.x, p.z, null, { size: S.size, pave: S.pave, raise: e.shiftKey });
  if (r === 'ring') say('Mizu-mon: rings raked round the rock, like water round an island.');
  e.preventDefault();
});
stageEl.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const p = groundPoint(e);
  if (!p) return;
  if (stage.tool(S.tool, 'move', p.x, p.z, drag.prev, { size: S.size, pave: S.pave, raise: e.shiftKey })) drag.prev = p;
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) { drag = null; stage.writeMask(); } };
stageEl.addEventListener('pointerup', endDrag);
stageEl.addEventListener('pointercancel', endDrag);
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select, .dd')) return;
  if (e.code === 'KeyV' && !e.metaKey && !e.ctrlKey) setView(S.view === 'orbit' ? 'eye' : S.view === 'eye' ? 'plan' : 'orbit');
  if (e.code === 'Escape') setTool('walk');
});

/* ---------------- the village ---------------- */

const villageTog = toggle($('#c-village'), { label: 'Let the village cats roam', value: flag('village') === '1', onChange: (b) => stage.setVillage(b) });
$('#btn-ff').addEventListener('click', () => { stage.fastForward(90); });
seg($('#pave-kind'), [{ v: 'so', label: '草 sō', title: 'informal: keep it as packed earth' }, { v: 'gyo', label: '行 gyō', title: 'semi-formal: tobi-ishi along the trail' }, { v: 'shin', label: '真 shin', title: 'formal: nobedan with gravel shoulders' }], null, (v) => stage.pave(v));
$('#btn-regrow').addEventListener('click', () => stage.regrowAll());
slider($('#c-sim'), { label: 'Trail attraction', min: 0, max: 4, step: 0.1, value: stage.sim.attract, fmt: (v) => v.toFixed(1), onInput: (v) => { stage.sim.attract = v; } });
slider($('#c-sim'), { label: 'Wear per paw', min: 0.005, max: 0.08, step: 0.001, value: stage.field.deposit, fmt: (v) => (v * 100).toFixed(1) + ' %', onInput: (v) => { stage.field.deposit = v; } });
slider($('#c-sim'), { label: 'Grows back in', min: 20, max: 600, step: 10, value: stage.field.T, fmt: (v) => `${Math.round(v)} s`, onInput: (v) => { stage.field.T = v; } });

/* ---------------- look ---------------- */

const viewSeg = seg($('#views'), [{ v: 'orbit', label: 'Orbit' }, { v: 'eye', label: 'Cat-eye' }, { v: 'plan', label: 'Plan' }], S.view, (v) => setView(v));
// orbit and plan show the corner as a cut-open diorama; at cat height the valley goes round it
function setView(v) { S.view = v; viewSeg.set(v); stage.cam = activeCam(); controls.enabled = v === 'orbit'; if (S.valleyAuto) { stage.opt.valley = v === 'eye'; valleyTog?.set(stage.opt.valley); } }
setView(S.view);
const showDD = new Dropdown($('#slot-show'), {
  items: [{ value: 0, label: 'the ground', hint: 'as painted' }, { value: 1, label: 'the wear field G', hint: 'Helbing’s trail field; blue = wet' }, { value: 2, label: 'the splat', hint: 'which layer wins, after height blending' }, { value: 3, label: 'the tiles', hint: 'the earth texture’s repeat' }],
  value: 0, label: 'Show', onChange: (v) => { S.debug = +v; stage.setDefines({ DEBUG: +v }); }
});
const splitUI = new Split(stageEl, { value: 0.5 });
let beforeMat = null;
const COMPARE = {
  game: { labels: ['The game today', 'This lab'], left: () => stage.setGameToday(true), right: () => stage.setGameToday(false) },
  blend: { labels: ['Linear splat', 'Height blend'], defines: { HBLEND: 0 } },
  tile: { labels: ['Plain repeat', 'Hex-tiling'], defines: { ANTI: 0, DEBUG: 0 } },
  wear: { labels: ['No wear', 'Feet wear it'], defines: { WEAR: 0 } },
  paint: { labels: ['The photograph', 'The painting'], paintOnly: true }
};
function compareFor(k) {
  const c = COMPARE[k];
  if (!c || c.paintOnly || c.left) return c;
  beforeMat = createGroundMaterial(stage.field, stage.layers, { defines: { ...stage.defines, ...c.defines }, marks: { print: stage.prints, groove: stage.grooves }, eave: stage.eave });
  beforeMat.userData.u = stage.U;
  beforeMat.onBeforeCompile = ((orig) => (sh) => { orig(sh); Object.assign(sh.uniforms, stage.U); })(beforeMat.onBeforeCompile);
  return { ...c, left: () => { stage.ground.material = beforeMat; }, right: () => { stage.ground.material = stage.mat; } };
}
const compareDD = new Dropdown($('#slot-compare'), {
  items: [{ value: '', label: 'nothing' }, { value: 'game', label: 'the game today', hint: 'buildGround + buildPathShoulders + buildPath' }, { value: 'blend', label: 'linear vs height blend' }, { value: 'tile', label: 'plain repeat vs hex-tiling' }, { value: 'wear', label: 'with and without wear' }, { value: 'paint', label: 'photograph vs painting' }],
  value: '', label: 'Compare', onChange: (v) => setCompare(v)
});
function setCompare(k) {
  S.compare = k ? compareFor(k) : null;
  splitUI.enabled = !!S.compare;
  if (S.compare) splitUI.setLabels(...S.compare.labels);
  else { stage.setGameToday(false); stage.ground.material = stage.mat; }
  compareDD.set(k || '', false);
  if (k === 'paint' && stage.opt.finish < 0.5) { stage.opt.finish = 0.85; finishCtl.set(0.85); }
}
const finishCtl = slider($('#c-finish'), { label: 'Painted', min: 0, max: 1, step: 0.05, value: stage.opt.finish, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => { stage.opt.finish = v; } });
toggle($('#c-sound'), { label: 'Sound', value: false, onChange: (b) => sound.setEnabled(b) });
valleyTog = toggle($('#c-valley'), { label: 'Valley around it', value: stage.opt.valley, onChange: (b) => { S.valleyAuto = false; stage.opt.valley = b; } });
$('#btn-reset').addEventListener('click', () => { stage.resetAll(); say('The corner is as the gardener left it this morning.'); });

/* ---------------- quality ---------------- */

const governor = new Governor({
  onScale: (s) => { renderer.setPixelRatio(Math.max(0.75, Math.min(devicePixelRatio || 1, 1.75) * (0.55 + 0.45 * s))); stage.grass?.setDensity(0.5 + 0.5 * s); },
  onPixelRatio: () => renderer.setPixelRatio(1)
});
governor.enabled = quality === 'auto' && !SHOT;
seg($('#c-quality'), [{ v: 'auto', label: 'Auto' }, { v: 'eco', label: 'Eco' }, { v: 'lush', label: 'Lush' }], quality, (v) => {
  quality = v;
  governor.enabled = v === 'auto' && !SHOT;
  if (v === 'eco') { renderer.setPixelRatio(1); stage.grass?.setDensity(0.6); stage.opt.finish = Math.min(stage.opt.finish, 0.3); }
  if (v === 'lush') { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); stage.grass?.setDensity(1); }
});
const meter = new Meter($('#perf'), gpu);

/* ---------------- steps, variants, the game, sources ---------------- */

const views = new Views(renderer);
lab.views = views;
const stepper = new Stepper($('#steps-mount'), { steps: STEPS, start: 11, onStep: (i, s) => s.apply(stage, { setSeason, setHour, setSky, setTool, finishCtl }) });
lab.stepper = stepper;
const gallery = buildGallery({ mount: $('#families'), views, renderer, layers: stage.layers, onPlant: (v) => plant(v), getEnv: () => stage.scene.environment });
function plant(v) {
  v.plant?.(stage, { setSeason, setHour, setSky, setTool, setCompare });
  gallery.select(v.id);
  document.getElementById('corner').scrollIntoView({ behavior: 'smooth' });
  say(`${v.name} is on the corner now.`);
}
$('#game-list').innerHTML = GAME.map((g) => `<li>${g}</li>`).join('');
$('#srcList').innerHTML = SOURCES.map(([l, u, note]) => `<li><a href="${u}" target="_blank" rel="noopener">${l}</a>${note ? ` <i>(${note})</i>` : ''}</li>`).join('');

/* ---------------- HUD ---------------- */

const mini = $('#mini'), mctx = mini.getContext('2d');
const mimg = mctx.createImageData(mini.width, mini.height);
function drawMini() {
  const f = stage.field, W = mini.width, H = mini.height;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = f.x0 + (i + 0.5) / W * f.w, z = f.z0 + (j + 0.5) / H * f.d, idx = f.i(x, z), o = idx * 8;
    const g = f.wear[idx], S2 = f.S;
    const grass = S2[o] + S2[o + 7], moss = S2[o + 1], stone = S2[o + 4], gravel = S2[o + 2], sand = S2[o + 3];
    let r = 168, gg = 150, b = 116;
    const mix = (c, k) => { r += (c[0] - r) * k; gg += (c[1] - gg) * k; b += (c[2] - b) * k; };
    mix([92, 128, 60], grass); mix([58, 92, 40], moss); mix([150, 146, 138], gravel); mix([224, 220, 210], sand); mix([128, 126, 122], stone);
    mix([196, 150, 92], Math.min(1, g * 1.3) * (grass + moss + 0.3));
    if (g > 0.55) mix([120, 72, 36], (g - 0.55) * 1.6);
    const p = (j * W + i) * 4;
    mimg.data[p] = r; mimg.data[p + 1] = gg; mimg.data[p + 2] = b; mimg.data[p + 3] = 255;
  }
  mctx.putImageData(mimg, 0, 0);
  const dot = (x, z, c, r = 2.6) => { mctx.fillStyle = c; mctx.beginPath(); mctx.arc((x - f.x0) / f.w * W, (z - f.z0) / f.d * H, r, 0, 6.3); mctx.fill(); };
  for (const p of POIS) dot(p.x, p.z, 'rgba(255,255,255,.75)', 2);
  if (stage.village?.enabled) for (const c of stage.village.cats) dot(c.pos.x, c.pos.y, '#2b3d63');
  for (const g of stage.sim.ghosts) dot(g.x, g.z, '#ffe2a8', 1.6);
  if (stage.cat) dot(stage.cat.pos.x, stage.cat.pos.y, '#c2502e', 3.2);
}
const MAT_NAMES = { earth: 'masa-do earth', grass: 'meadow grass', moss: 'sugigoke moss', gravel: 'tamajari gravel', sand: 'Shirakawa sand', paving: 'stone paving', tataki: 'tataki', needles: 'pine needles', wild: 'wild grass' };
function drawUnder() {
  if (!stage.cat) return;
  const { x, y: z } = stage.cat.pos, s = stage.field.surfaceAt(x, z), pud = stage.puddleAt(x, z);
  const on = stage.stones.topAt(x, z) > -Infinity ? 'a stepping stone' : MAT_NAMES[s.mat];
  const state = pud > 0.2 ? ' · in a puddle' : s.snow > 0.5 && stage.weather.snow > 0.3 ? ' · snow' : (s.wet > 0.3 || stage.weather.wet > 0.4) ? ' · damp' : '';
  $('#under').innerHTML = `Under the paws: <b>${on}</b> · worn ${Math.round(s.wear * 100)} %${state}${stage.carry > 0.25 ? ' · <i>wet paws</i>' : ''}`;
}

/* ---------------- loading ---------------- */

(async () => {
  try {
    const [F, GM] = await Promise.all([loadFoliageModule(), loadGrassModule()]);
    await stage.loadTrees(F);
    stage.loadGrass(GM);
  } catch (e) { console.error('trees or grass failed', e); }
  await stage.loadCats();
  setTool(S.tool);
  stage.rakeSand();
  $('#wake').hidden = true;
  lab.ready = true;
  if (flag('village') === '1') stage.setVillage(true);
  if (flag('ff') === '1') stage.fastForward(90);
  if (flag('step')) stepper.go(+flag('step') - 1);
  if (flag('season')) setSeason(flag('season'));
  if (flag('sky')) setSky(flag('sky'));
  if (flag('compare')) setCompare(flag('compare'));
  if (flag('tool')) setTool(flag('tool'));
  if (flag('paint')) { stage.opt.finish = +flag('paint'); finishCtl.set(stage.opt.finish); }
  if (flag('nohud')) document.querySelectorAll('#stage .hud').forEach((h) => { h.style.display = 'none'; });
  if (!flag('step') && !flag('season')) say('Walk Michi across the moss to the water basin a few times, then look at the trail map.');
})();

/* ---------------- the loop ---------------- */

views.add(stageEl, {
  scene: stage.scene, camera: orbitCam,
  update: (dt) => {
    const cam = activeCam();
    if (S.view === 'orbit') controls.update();
    else if (S.view === 'eye' && stage.cat) stage.cat.eyeCamera(eyeCam, dt, { back: 1.5, height: 0.55, ahead: 1.3 });
    else if (S.view === 'plan' && stage.cat) { planCam.position.lerp(_p.set(stage.cat.pos.x * 0.3, 24, stage.cat.pos.y * 0.3 + 0.6), dt * 2); planCam.lookAt(stage.cat.pos.x * 0.3, 0, stage.cat.pos.y * 0.3); }
    stage.update(dt, cam);
  },
  render: (r, rect) => stage.render(rect, activeCam(), { split: splitUI.enabled ? splitUI.value : -1, compare: S.compare }),
  margin: 300
});
let hudClock = 0, frames = 0;
new Loop((dt, t, raw) => {
  const t0 = performance.now();
  views.render(dt, t);
  hudClock += dt;
  if (hudClock > 0.25) {
    hudClock = 0;
    drawMini(); drawUnder();
    const day = $('#day');
    day.hidden = stage.dayLabel == null;
    if (stage.dayLabel != null) day.innerHTML = `day ${stage.dayLabel}<small>a season of cats</small>`;
    $('#btn-ff').disabled = !!stage.ff;
    const st = stage.stats;
    $('#stats').textContent = `${(st.tris / 1000).toFixed(0)} k triangles · ${st.calls} draws · ground layers painted in ${stage.layers.ms.toFixed(0)} ms · ${stage.field.nx} × ${stage.field.nz} field`;
  }
  gallery.tick(dt);
  const js = performance.now() - t0;
  meter.tick(raw, js, views.views.filter((v) => v.built).length + ' views');
  governor.tick(dt, raw * 1000);
  if (++frames === 90) window.__done = true;
}).start();
