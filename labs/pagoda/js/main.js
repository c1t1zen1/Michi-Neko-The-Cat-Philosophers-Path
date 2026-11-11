// Lab 08 bootstrap: one renderer behind the page, the viewing platform, the
// specimen shelves (a scissored live view per recipe), the assembly stepper,
// the field notebook, and the keep row (recipe, JSON, postcard, link).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer, Views, Loop, Meter, Governor, flag, reduceMotion, SHOT } from '../../shared/stage.js';
import { Dropdown, slider, toggle, Stepper, seg } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { LightRig } from '../../shared/light.js';
import { Finisher, FINISHES } from './finish.js';
import { Hero, VIEWS, HOURS } from './hero.js';
import { PRESETS, byKey } from './presets.js';
import { VARIANTS, FAMILIES, SOURCES } from './variants.js';
import { mountSpecimenLinks } from '../../shared/specimen-link.js';
import { buildTile } from './tiles.js';
import { buildPagoda } from './pagoda.js';
import { STEPS } from './steps.js';
import { SEASONS } from './world.js';
import { esc, clamp } from './util.js';

const $ = (s, r = document) => r.querySelector(s);
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
const hhmm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
if (SHOT) document.body.classList.add('shot');
if (flag('nohud')) document.body.classList.add('nohud');
mountLabChrome('pagoda');

const { renderer, gpu } = createRenderer($('#gl'), { clear: 0xfbf8f2, exposure: 1.02, shadows: true, maxPR: 1.6 });
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const finisher = new Finisher(renderer);
const views = new Views(renderer);
const lab = window.__pagoda = { renderer, finisher, views, soundOn: false };
const stage = $('#stage');
const hero = lab.hero = new Hero(lab, stage, finisher);

/* ---------------- the sentence ---------------- */

const ddPreset = new Dropdown($('#slot-preset'), {
  items: PRESETS.map((p) => ({ value: p.key, label: p.name, hint: `${p.jp} · ${p.era} · ${p.H} m`, group: p.key === 'valley' ? 'For the game' : 'From the record' })),
  value: 'yasaka', label: 'Tower', columns: 2, wide: true, onChange: (v) => setPreset(v)
});
const ddView = new Dropdown($('#slot-view'), { items: VIEWS.map((v) => ({ value: v.key, label: v.name, hint: v.hint })), value: 'perch', label: 'View', onChange: (v) => setView(v) });
const ddFinish = new Dropdown($('#slot-finish'), { items: FINISHES.map((f) => ({ value: f.key, label: f.name.toLowerCase(), hint: `${f.jp} · ${f.hint}` })), value: 'background', label: 'Finish', onChange: (v) => setFinish(v) });
const ddHour = new Dropdown($('#slot-hour'), { items: HOURS.map((h) => ({ value: h.v, label: h.label.toLowerCase(), hint: hhmm(h.v) })), value: 17.5, label: 'Hour', onChange: (v) => setHour(+v, true) });
const ddSeason = new Dropdown($('#slot-season'), { items: Object.entries(SEASONS).map(([k, s]) => ({ value: k, label: s.name.toLowerCase(), hint: s.jp })), value: 'autumn', label: 'Season', onChange: (v) => setSeason(v) });

function setPreset(k) {
  hero.setPreset(k);
  ddPreset.set(k, false);
  const p = byKey(k);
  $('#stage-caption').textContent = `${p.name} · ${p.place}`;
  $('#stage-seal').textContent = p.jp.slice(0, 3);
  updateRecipe();
}
function setView(v) { hero.setView(v); ddView.set(v, false); syncDial(); }
function setFinish(f) { hero.finish = f; ddFinish.set(f, false); updateRecipe(); }
function setHour(h, fromDd = false) { hero.setHour(h); hourCtl.set(h); if (!fromDd) { const near = HOURS.find((x) => Math.abs(x.v - h) < 0.01); if (near) ddHour.set(near.v, false); } }
function setSeason(s) { hero.setSeason(s); ddSeason.set(s, false); }
lab.onView = (v) => { ddView.set(v, false); syncDial(); };

/* ---------------- the dial and the ladder ---------------- */

const dial = $('#dial');
const toD = (x) => 5 * Math.pow(400, x / 1000);
const fromD = (d) => (Math.log(d / 5) / Math.log(400)) * 1000;
function syncDial() { dial.value = fromD(hero.dist); $('#dial-v').textContent = hero.dist < 1000 ? Math.round(hero.dist) + ' m' : (hero.dist / 1000).toFixed(2) + ' km'; }
dial.addEventListener('input', () => { hero.setDistance(toD(+dial.value)); syncDial(); });
lab.onDistance = syncDial;
for (const b of document.querySelectorAll('#dial-marks button')) b.addEventListener('click', () => { const d = +b.dataset.d; hero.setDistance(d === 57 ? 57 * (hero.H / 19.4) : d); syncDial(); });
const ladder = $('#ladder');
ladder.innerHTML = hero.ladder().map((f) => `<li data-k="${f.key}"><span class="lt">${esc(f.label)} <i class="jp">${f.jp}</i></span><span class="lb"><i></i></span><span class="lv"></span></li>`).join('');
function drawLadder() {
  for (const f of hero.ladder()) {
    const li = ladder.querySelector(`[data-k="${f.key}"]`);
    if (!li) continue;
    li.classList.toggle('gone', f.px < 1);
    li.classList.toggle('faint', f.px >= 1 && f.px < 3);
    li.querySelector('.lv').textContent = f.px < 0.1 ? '< 0.1 px' : f.px < 10 ? f.px.toFixed(1) + ' px' : Math.round(f.px) + ' px';
    li.querySelector('.lb i').style.width = clamp((Math.log10(f.px + 1) / 3) * 100, 1, 100) + '%';
  }
}

/* ---------------- actions ---------------- */

$('#btn-ring').addEventListener('click', () => { hero.ring(); stage.focus({ preventScroll: true }); });
$('#btn-shake').addEventListener('click', () => { hero.shake(); stage.focus({ preventScroll: true }); });
$('#btn-raise').addEventListener('click', () => { hero.raise(); stage.focus({ preventScroll: true }); });
const frameTog = toggle($('#tog-frame'), { label: 'Frame (心柱)', onChange: (b) => { hero.setFrame(b); if (hero.labels) hero.setLabels(true); } });
const labelTog = toggle($('#tog-labels'), { label: 'Labels', onChange: (b) => hero.setLabels(b) });
const compareTog = toggle($('#tog-compare'), { label: 'Compare with the game', onChange: (b) => hero.setCompare(b) });
toggle($('#tog-sound'), { label: 'Sound', onChange: (b) => { lab.soundOn = b; hero.sound.setOn(b); } });
toggle($('#tog-lightup'), { label: 'Light-up at night', value: true, onChange: (b) => hero.setLightUp(b) });
toggle($('#tog-kasumi'), { label: 'Kasumi bands', value: true, onChange: (b) => { hero.kasumi = b ? 1 : 0; } });
lab.toggleFrame = () => { frameTog.set(!hero.frameOn); hero.setFrame(!hero.frameOn); };
lab.toggleLabels = () => { labelTog.set(!hero.labels); hero.setLabels(!hero.labels); };
const hourCtl = slider($('#hour-mount'), { label: 'Hour', min: 0, max: 24, step: 0.05, value: hero.hour, fmt: hhmm, onInput: (h) => setHour(h) });
slider($('#wind-mount'), { label: 'Wind', min: 0, max: 2, step: 0.05, value: reduceMotion ? 0.1 : hero.wind, onInput: (w) => hero.setWind(w) });
slider($('#explode-mount'), { label: 'Explode', min: 0, max: 1, step: 0.02, value: 0, fmt: (v) => Math.round(v * 100) + '%', onInput: (e) => hero.setExplode(e) });
const tierSeg = seg($('#tier-mount'), [{ v: 'auto', label: 'Auto' }, { v: 'hero', label: 'Hero' }, { v: 'mid', label: 'Mid' }, { v: 'far', label: 'Far' }, { v: 'impostor', label: 'Impostor' }], 'auto', (v) => hero.setTierMode(v));

/* ---------------- keep ---------------- */

function recipeText() {
  return `import { buildPagoda } from './labs/pagoda/js/pagoda.js';

const tower = buildPagoda(${JSON.stringify(hero.recipe(), null, 2)}, { detail: 'hero' });
scene.add(tower.group);
// each frame: bells in the wind, the snake dance when shaken
tower.update(dt, time, { wind: ${hero.wind.toFixed(2)} });
// finish: finisher.render(scene, camera, rect, '${hero.finish}');`;
}
function updateRecipe() {
  $('#recipe-code').textContent = recipeText();
  const p = byKey(hero.opts.preset), o = hero.opts;
  $('#selected-recipe').textContent = `${p.name} · ${o.roof} roof · ${o.brackets} brackets · ${o.rafters} rafters · ${o.paint} · ${hero.finish}`;
}
lab.onRebuild = () => updateRecipe();
async function copy(text, btn) {
  const prev = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied ✓'; } catch { btn.textContent = 'Open the source below'; $('#live-source').open = true; }
  setTimeout(() => (btn.textContent = prev), 1800);
}
$('#copy-recipe').addEventListener('click', (e) => copy(recipeText(), e.currentTarget));
$('#save-recipe').addEventListener('click', () => {
  const data = { lab: 'pagoda', version: 1, options: hero.recipe(), finish: hero.finish, view: hero.view, distance: Math.round(hero.dist), hour: +hero.hour.toFixed(2), season: hero.season, wind: hero.wind };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `michi-pagoda-${hero.opts.preset}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#share').addEventListener('click', (e) => {
  const q = new URLSearchParams({ preset: hero.opts.preset, view: hero.view, finish: hero.finish, hour: hero.hour.toFixed(2), season: hero.season, dist: Math.round(hero.dist) });
  copy(location.origin + location.pathname + '?' + q, e.currentTarget);
});
let postcard = false;
$('#postcard').addEventListener('click', () => { postcard = true; });
function takePostcard() {
  const r = stage.getBoundingClientRect(), pr = renderer.getPixelRatio(), c = document.createElement('canvas');
  c.width = Math.round(r.width * pr); c.height = Math.round(r.height * pr);
  const x = c.getContext('2d');
  x.drawImage(renderer.domElement, r.left * pr, r.top * pr, r.width * pr, r.height * pr, 0, 0, c.width, c.height);
  const p = byKey(hero.opts.preset), s = c.height / 900;
  x.fillStyle = 'rgba(251,248,242,0.86)'; x.fillRect(c.width - 330 * s, c.height - 112 * s, 300 * s, 82 * s);
  x.fillStyle = '#b8432c'; x.font = `${46 * s}px "Shippori Mincho", serif`; x.fillText(p.jp.slice(0, 3), c.width - 312 * s, c.height - 52 * s);
  x.fillStyle = '#221d18'; x.font = `italic ${22 * s}px Fraunces, Georgia, serif`; x.fillText(p.name, c.width - 200 * s, c.height - 70 * s);
  x.font = `${14 * s}px Inter, sans-serif`; x.fillText(`${hhmm(hero.hour)} · ${SEASONS[hero.season].name} · ${Math.round(hero.dist)} m`, c.width - 200 * s, c.height - 46 * s);
  c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `michi-pagoda-${p.key}.png`; a.click(); });
}

/* ---------------- the viewing platform ---------------- */

const heroView = views.add(stage, {
  scene: hero.scene, camera: hero.camera,
  update: (dt, t, rect) => hero.frame(dt, t, rect),
  render: (r, rect) => hero.render(r, rect)
});

/* ---------------- shelves ---------------- */

const ctx = { renderer, finisher, env, reduceMotion };
const tiles = [];
const famFilter = $('#family-filter');
FAMILIES.forEach((fam, fi) => {
  const sec = document.createElement('section');
  sec.className = 'family'; sec.id = 'shelf-' + fam.key;
  sec.innerHTML = `<div class="fam-head"><span class="fam-num">${String(fi + 1).padStart(2, '0')}</span><h2>${fam.title} <span class="jp fam-jp">${fam.jp}</span></h2><p class="fam-sub">${esc(fam.sub)}</p></div><div class="variants"></div>`;
  $('#shelves').append(sec);
  famFilter.insertAdjacentHTML('beforeend', `<option value="${fam.key}">${fam.title.replace(/<[^>]*>/g, '').replace('&amp;', '&')}</option>`);
  for (const v of VARIANTS.filter((x) => x.family === fam.key)) {
    const card = document.createElement('article');
    card.className = 'tile' + (v.original ? ' original' : '');
    card.dataset.slug = v.slug;
    card.innerHTML = `<div class="specimen-mark">${v.original ? 'THE GAME TODAY' : 'RECIPE'}<span>${esc(fam.jp)}</span></div>
      <div class="view" role="button" tabindex="0" aria-label="${v.original ? 'Compare' : 'Try'} ${esc(v.name)} on the viewing platform"></div>
      <h3 class="name">${esc(v.name)} <span class="jp">${esc(v.jp)}</span></h3><p class="tag">${esc(v.tag)}</p><p class="blurb">${esc(v.blurb)}</p>
      <dl class="stats"><div><dd class="s-tris">–</dd><dt>tris</dt></div><div><dd class="s-meshes">–</dd><dt>meshes</dt></div><div><dd class="s-calls">–</dd><dt>draws</dt></div><div><dd class="s-build">–</dd><dt>ms build</dt></div></dl>
      <div class="card-actions"><button class="apply-recipe" type="button">${v.original ? 'Compare with the game' : 'Try on the tower'} ↑</button><button class="copy-card" type="button" aria-label="Copy the ${esc(v.name)} recipe">Copy code</button></div>
      <details><summary>Recipe, source &amp; tradeoffs</summary><ul class="how">${(v.how || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul><pre class="code"><code>${esc(v.code || '')}</code></pre><p class="use"><b>Use it for</b> ${esc(v.use || '')}</p><ul class="srcs">${(v.sources || []).map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul></details>`;
    sec.querySelector('.variants').append(card);
    const el = $('.view', card);
    let res = null;
    el.addEventListener('pointerenter', () => res?.setHover(1));
    el.addEventListener('pointerleave', () => res?.setHover(0));
    const go = () => apply(v);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    $('.apply-recipe', card).addEventListener('click', go);
    $('.copy-card', card).addEventListener('click', (e) => copy(v.code || '', e.currentTarget));
    const view = views.add(el, {
      margin: 260,
      build() {
        res = buildTile(v, ctx);
        const c = res.counts();
        $('.s-tris', card).textContent = fmt(c.tris);
        $('.s-meshes', card).textContent = c.meshes;
        $('.s-build', card).textContent = res.built.toFixed(0);
        return { scene: res.scene, camera: res.camera, update: (dt, t, rect) => res.update(dt, t, rect), render: res.render || undefined };
      }
    });
    tiles.push({ card, view, v });
  }
});
function filterShelves() {
  const word = $('#recipe-search').value.trim().toLowerCase(), fam = famFilter.value;
  let n = 0;
  for (const { card, v } of tiles) {
    const show = (!word || [v.name, v.jp, v.tag, v.blurb, v.family].join(' ').toLowerCase().includes(word)) && (fam === 'all' || fam === v.family || (fam === 'original' && v.original));
    card.hidden = !show;
    if (show) n++;
  }
  for (const sec of document.querySelectorAll('#shelves .family')) sec.hidden = ![...sec.querySelectorAll('.tile')].some((c) => !c.hidden);
  $('#recipe-count').textContent = `${n} / ${VARIANTS.length} specimens`;
  $('#empty-search').hidden = n > 0;
}
$('#recipe-search').addEventListener('input', filterShelves);
famFilter.addEventListener('change', filterShelves);
filterShelves();
mountSpecimenLinks(tiles, { getId: (tile) => tile.v.slug });

function apply(v) {
  const a = v.apply || {};
  if (a.preset) setPreset(a.preset);
  if (a.opts) hero.rebuild(a.opts);
  if (a.finish) setFinish(a.finish);
  if (a.season) setSeason(a.season);
  if (a.hour !== undefined) setHour(a.hour);
  if (a.tierMode) { hero.setTierMode(a.tierMode); tierSeg.set(a.tierMode); }
  if (a.distance) { hero.setDistance(a.distance); syncDial(); }
  if (a.compare) { compareTog.set(true); hero.setCompare(true); }
  if (a.frame) { frameTog.set(true); hero.setFrame(true); }
  if (a.shake) setTimeout(() => hero.shake(), 700);
  if (a.ring) setTimeout(() => hero.ring(), 600);
  for (const { card } of tiles) card.classList.toggle('selected', card.dataset.slug === v.slug);
  $('#stage-caption').textContent = v.name;
  updateRecipe();
  $('#walk').scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
}

/* ---------------- raise the tower ---------------- */

const asmScene = new THREE.Scene();
asmScene.environment = env;
const asmRig = new LightRig(asmScene, { hour: 15.5, shadows: false, sky: false, fog: false, background: false });
const asm = buildPagoda({ preset: 'valley', roof: 'ribbon' }, { detail: 'hero' });
asmScene.add(asm.group);
asmRig.applyEnv();
const asmCam = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
let asmPhase = 0;
const stepper = new Stepper($('#steps-mount'), { steps: STEPS, onStep: (i, s) => { asmPhase = s.phase; asm.setAssembly(s.phase); } });
slider($('#asm-explode'), { label: 'Explode the storeys', min: 0, max: 1, step: 0.02, value: 0, fmt: (v) => Math.round(v * 100) + '%', onInput: (e) => asm.setExplode(e) });
$('#asm-finished').addEventListener('click', () => stepper.go(STEPS.length - 1));
views.add($('#assembly-view'), {
  scene: asmScene, camera: asmCam,
  update: (dt, t) => {
    const H = asm.dims.H, focus = asmPhase < 8 ? 0.22 : 0.5, d = asmPhase < 8 ? H * 1.05 : H * 2.1;
    asmCam.position.set(d * 0.62, H * (focus + 0.08), d * 0.78);
    asmCam.lookAt(0, H * focus, 0);
    if (!reduceMotion) asm.group.rotation.y += dt * 0.12;
    asm.update(dt, t, { wind: 0.5 });
  }
});

/* ---------------- notebook ---------------- */

$('#srcList').innerHTML = Object.values(SOURCES).map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('');

/* ---------------- flags ---------------- */

if (flag('preset')) setPreset(flag('preset'));
if (flag('season')) setSeason(flag('season'));
if (flag('hour')) setHour(+flag('hour'));
if (flag('finish')) setFinish(flag('finish'));
if (flag('view')) setView(flag('view'));
if (flag('dist')) hero.setDistance(+flag('dist'));
if (flag('wind')) hero.setWind(+flag('wind'));
if (flag('tier')) { hero.setTierMode(flag('tier')); tierSeg.set(flag('tier')); }
if (flag('frame')) { frameTog.set(true); hero.setFrame(true); }
if (flag('compare')) { compareTog.set(true); hero.setCompare(true); }
if (flag('labels')) { labelTog.set(true); hero.setLabels(true); }
if (flag('quake')) setTimeout(() => hero.shake(30), 1500);
if (flag('opts')) { try { hero.rebuild(JSON.parse(flag('opts'))); } catch (e) { console.warn('bad ?opts', e); } }
syncDial();
updateRecipe();

/* ---------------- loop ---------------- */

lab.onCatReady = () => { $('#wake').hidden = true; window.__catReady = true; };
lab.onCatError = () => { $('#wake').textContent = 'Michi could not come today. The tower is ready; reload to try again.'; };
const meter = new Meter($('#perf'), gpu);
const gov = new Governor({ onScale: () => {}, onPixelRatio: (pr) => renderer.setPixelRatio(pr) });
let statClock = 0;
new Loop((dt, t, raw) => {
  const t0 = performance.now();
  views.render(dt, t);
  if (postcard) { postcard = false; takePostcard(); }
  meter.tick(raw, performance.now() - t0, `${hero.finish} · ${hero.tier}`);
  gov.tick(dt, raw * 1000);
  if ((statClock += dt) > 0.3) {
    statClock = 0;
    for (const { card, view } of tiles) if (view.built && !card.hidden) $('.s-calls', card).textContent = view.stats.calls;
    drawLadder();
    const c = hero.counts();
    const dist = hero.dist < 1000 ? Math.round(hero.dist) + ' m' : (hero.dist / 1000).toFixed(2) + ' km';
    $('#hud-state').innerHTML = `<b>${dist}</b> · ${Math.round(hero.pxH)} px tall · <span class="tier t-${hero.tier}">${hero.tier}</span>`;
    $('#hero-stats').textContent = `${hero.tier} tier · ${c.meshes} meshes · ${fmt(c.tris)} triangles · ${heroView.stats.calls} draws · ${heroView.cpuMs.toFixed(1)} ms CPU · ${hhmm(hero.hour)}`;
  }
}).start();

if (flag('cat') === '0') $('#wake').hidden = true;
else setTimeout(() => hero.loadCat(), SHOT ? 0 : 600);
window.lab = lab;
