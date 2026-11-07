// Grass Lab bootstrap: one WebGL renderer behind the page, a scissored
// viewport per cube, the hero slab, live CPU stats and a quality governor.
import * as THREE from 'three';
import { GrassPatch } from './patch.js';
import { TYPES, FAMILIES } from './types.js';
import { Dropdown } from './ui.js';
import { Hero, PATTERNS, MODES } from './hero.js';

const q = new URLSearchParams(location.search);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n)));

const SWATCH = {
  'meadow-classic': '#a6c65c', 'meadow-gpu': '#a6c65c', 'meadow-tuft': '#9ec95a', 'meadow-thicket': '#c8b45a', 'meadow-painted': '#e0ec72',
  cards: '#8ec24a', bezier: '#bbd36b', triquad: '#aecb62', shell: '#9cc659', 'ring-lod': '#6fa84a',
  'carpet-blades': '#8fc35a', wildflowers: '#ff8fb8', pressed: '#c4d96f', 'halo-meadow': '#c3e06e', mown: '#a2d355',
  lantern: '#2ad4c0', susuki: '#d9c98a', sumi: '#5a7676', yarn: '#f0a0c8', moss: '#9fd05a'
};

/* ---------------- renderer ---------------- */

const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: q.has('shot') });
} catch (e) {
  document.body.insertAdjacentHTML('afterbegin', '<p style="padding:40px;font:1.2rem Georgia">This page needs WebGL2 — your browser could not create a context.</p>');
  throw e;
}
const lab = {
  renderer, wind: 0.8, density: 1, quality: 'auto', pixelRatio: Math.min(devicePixelRatio || 1, +q.get('pr') || 1.75),
  cubes: [], hero: null
};
renderer.setPixelRatio(lab.pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xffffff, 1);
renderer.debug.onShaderError = (gl, prog, vs, fs) => {
  console.error('SHADER ERROR\n' + gl.getProgramInfoLog(prog) + '\nVS:' + gl.getShaderInfoLog(vs) + '\nFS:' + gl.getShaderInfoLog(fs));
};
let gpuName = 'unknown GPU';
try {
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  if (dbg) {
    const raw = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    if (/swiftshader/i.test(raw)) gpuName = 'software renderer';
    else {
      // "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" -> the model
      const inner = raw.replace(/^ANGLE \(/, '').replace(/\)$/, '').split(',');
      gpuName = (inner[1] || inner[0]).replace(/Direct3D\d*|OpenGL.*|vs_\d_\d|ps_\d_\d|\(0x[0-9a-f]+\)/gi, '').replace(/\s+/g, ' ').trim().slice(0, 40) || raw.slice(0, 40);
    }
  }
} catch (e) { /* ignore */ }
addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight, false));

/* ---------------- cards ---------------- */

const famRoot = $('#families');
const dots = (n) => '●'.repeat(n) + '○'.repeat(5 - n);
FAMILIES.forEach((fam, fi) => {
  const sec = document.createElement('section');
  sec.className = 'family';
  sec.id = fam.key;
  sec.innerHTML = `<div class="fam-head"><span class="fam-num">${String(fi + 1).padStart(2, '0')}</span><h2>${fam.title}</h2><p class="fam-sub">${fam.sub}</p></div><div class="grid"></div>`;
  famRoot.append(sec);
  const grid = $('.grid', sec);
  for (const t of TYPES.filter((x) => x.family === fam.key)) {
    const a = document.createElement('article');
    a.className = 'card';
    a.id = t.slug;
    a.tabIndex = 0;
    a.dataset.i = t.index;
    a.innerHTML = `
      <div class="cube" role="button" aria-label="Walk the cat on ${t.name}"></div>
      <h3 class="name">${t.name}</h3>
      <p class="tag">${t.tag}</p>
      <p class="blurb">${t.blurb}</p>
      <dl class="stats">
        <div><dd class="s-items">–</dd><dt>${t.unit}</dt></div>
        <div><dd class="s-tris">–</dd><dt>tris</dt></div>
        <div><dd class="s-draws">–</dd><dt>draws</dt></div>
        <div><dd class="s-cpu">–</dd><dt>ms cpu</dt></div>
      </dl>
      <p class="stats2">built in <span class="s-build">–</span> ms · <span class="s-kb">–</span> KB per-blade data · GPU load <span class="gpu" title="author's estimate, 1 = light, 5 = heavy">${dots(t.gpu)}</span></p>
      <details>
        <summary>How it’s made</summary>
        <ul class="how">${t.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <pre class="code"><code>${esc(t.code)}</code></pre>
        <p class="use"><b>Use it for</b> ${esc(t.use)}</p>
        ${t.sources.length ? `<ul class="srcs">${t.sources.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>` : ''}
      </details>`;
    grid.append(a);
  }
});

/* ---------------- sources list ---------------- */

{
  const seen = new Map();
  for (const t of TYPES) for (const [l, u] of t.sources) if (/^https?:/.test(u) && !seen.has(u)) seen.set(u, l);
  $('#srcList').innerHTML = [...seen].map(([u, l]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('');
}

/* ---------------- cubes ---------------- */

const cubeCam = new THREE.OrthographicCamera(-2.75, 2.75, 2.75, -2.75, 0.1, 100);
{
  const az = Math.PI / 4, el = 0.58, d = 20;
  cubeCam.position.set(Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d);
  cubeCam.lookAt(0, -0.25, 0);
}

class Cube {
  constructor(type, card) {
    this.type = type;
    this.card = card;
    this.el = $('.cube', card);
    this.patch = null;
    this.hover = 0;
    this.hoverT = 0;
    this.cpu = 0;
    this.statsAt = 0;
    this.el.addEventListener('pointerenter', () => { this.hoverT = 1; });
    this.el.addEventListener('pointerleave', () => { this.hoverT = 0; });
  }
  build() {
    if (this.patch) return;
    const p = new GrassPatch(renderer, {
      w: 3, d: 3, cell: 3, thick: 0.7, ball: true, trail: true, texelsPerMeter: 20, seed: this.type.index + 1
    });
    p.setCell(0, this.type.index);
    p.setSoilTint(this.type.soil ?? 0xffffff);
    p.setDensity(lab.density);
    p.U.uPx.value = lab.pixelRatio;
    p.U.uWind.value = lab.wind;
    this.patch = p;
    this.refreshStats(true);
  }
  refreshStats(force) {
    const s = this.patch.stats();
    this.s = s;
    const c = this.card;
    $('.s-items', c).textContent = fmt(s.items);
    $('.s-tris', c).textContent = fmt(s.tris);
    $('.s-draws', c).textContent = s.draws;
    $('.s-draws', c).nextElementSibling.textContent = s.draws === 1 ? 'draw' : 'draws';
    $('.s-build', c).textContent = s.build < 10 ? s.build.toFixed(1) : Math.round(s.build);
    $('.s-kb', c).textContent = s.kb ? Math.round(s.kb).toLocaleString() : '0';
  }
}
lab.cubes = [...document.querySelectorAll('.card')].map((c) => new Cube(TYPES[+c.dataset.i], c));

/* ---------------- hero + UI ---------------- */

const stage = $('#stage');
const hero = new Hero(lab, stage);
lab.hero = hero;

const grassItems = [];
FAMILIES.forEach((fam) => {
  for (const t of TYPES.filter((x) => x.family === fam.key)) grassItems.push({ value: t.index, label: t.name, group: fam.title, swatch: SWATCH[t.slug] });
});
const ddA = new Dropdown($('#slot-a'), { items: grassItems, value: hero.state.a, columns: 4, wide: true, label: 'Grass', onChange: (v) => select(v, false) });
const ddB = new Dropdown($('#slot-b'), { items: grassItems, value: hero.state.b, columns: 4, wide: true, label: 'Second grass', onChange: (v) => hero.setSecond(v) });
const patternItems = PATTERNS.map((p) => ({ value: p.key, label: p.name, hint: p.hint }));
const ddP = new Dropdown($('#slot-p'), {
  items: patternItems, value: hero.state.pattern, label: 'Layout',
  onChange: (v) => {
    const p = PATTERNS.find((x) => x.key === v);
    $('#with').hidden = !p.needsB;
    $('#btn-shuffle').hidden = v !== 'random';
    hero.setPattern(v);
  }
});
$('#btn-shuffle').addEventListener('click', () => hero.shuffle());

const USES_A = new Set(['single', 'checker', 'stripes', 'rings']);
function select(i, fromCard) {
  if (fromCard && !USES_A.has(hero.state.pattern)) ddP.set('single', true);
  hero.setGrass(i);
  ddA.set(i, false);
  for (const c of lab.cubes) c.card.classList.toggle('sel', c.type.index === i);
  if (fromCard) $('#walk').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
lab.select = select;
for (const c of lab.cubes) {
  const go = () => select(c.type.index, true);
  c.el.addEventListener('click', go);
  $('.name', c.card).addEventListener('click', go);
  c.card.addEventListener('keydown', (e) => { if (e.target === c.card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } });
}
lab.cubes[hero.state.a].card.classList.add('sel');

// segmented controls
function seg(id, onPick) {
  const el = $(id);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (b) onPick(b.dataset.v);
  });
  return (v) => el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
}
$('#seg-mode').innerHTML = MODES.map((m, i) => `<button data-v="${m.key}"${i === 0 ? ' class="on"' : ''}>${m.name}</button>`).join('');
const markMode = seg('#seg-mode', (v) => lab.setMode(v));
const markView = seg('#seg-view', (v) => lab.setView(v));
const markGait = seg('#seg-gait', (v) => lab.setProwl(v === 'prowl'));
lab.setMode = (m) => { hero.setMode(m); markMode(m); };
lab.setView = (v) => { hero.setView(v); markView(v); };
lab.setProwl = (on) => { hero.setProwl(on); markGait(on ? 'prowl' : 'walk'); };
$('#btn-rotl').addEventListener('click', () => hero.rotate(-1));
$('#btn-rotr').addEventListener('click', () => hero.rotate(1));
lab.onCatReady = () => { $('#wake').hidden = true; if (hero.state.prowl) hero.cat.setProwling(true); };

// wind
$('#wind').addEventListener('input', (e) => { lab.wind = +e.target.value; });
if (q.get('wind')) { lab.wind = +q.get('wind'); $('#wind').value = lab.wind; }

// quality
const QUALITY = { eco: { d: 0.45, pr: 1 }, lush: { d: 1, pr: Math.min(devicePixelRatio || 1, 1.75) } };
function applyDensity(f) {
  lab.density = f;
  for (const c of lab.cubes) if (c.patch) { c.patch.setDensity(f); c.refreshStats(); }
  hero.patch.setDensity(f * 0.8);
}
lab.setQuality = (qk) => {
  lab.quality = qk;
  document.querySelectorAll('#seg-quality button').forEach((b) => b.classList.toggle('on', b.dataset.v === qk));
  if (qk === 'auto') { lab.pixelRatio = Math.min(devicePixelRatio || 1, 1.75); applyDensity(1); }
  else { lab.pixelRatio = QUALITY[qk].pr; applyDensity(QUALITY[qk].d); }
  renderer.setPixelRatio(lab.pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);
  for (const c of lab.cubes) if (c.patch) c.patch.U.uPx.value = lab.pixelRatio;
  hero.patch.U.uPx.value = lab.pixelRatio;
};
$('#seg-quality').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) lab.setQuality(b.dataset.v); });
if (q.get('quality') && QUALITY[q.get('quality')]) lab.setQuality(q.get('quality'));
hero.patch.setDensity(lab.density * 0.8);

/* ---------------- loop ---------------- */

let last = performance.now(), t = 0, frames = 0;
let frameEma = 16, jsEma = 1, govClock = 0, lastChange = 0;
let statClock = 0, perfClock = 0;
let heroCpu = 0;
const visibleCubes = new Set();

function inView(r, margin = 0) { return r.bottom > -margin && r.top < innerHeight + margin && r.right > 0 && r.left < innerWidth; }

function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { last = now; return; }
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(raw, 0.05);
  t += dt;
  frames++;
  frameEma += (raw * 1000 - frameEma) * 0.05;
  const jsStart = performance.now();

  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  // build at most one cube per frame, nearest-to-viewport first
  let built = false;
  visibleCubes.clear();
  for (const c of lab.cubes) {
    const r = c.el.getBoundingClientRect();
    const near = inView(r, 500);
    if (!c.patch && near && !built) { c.build(); built = true; }
    if (!c.patch || !inView(r, 0)) continue;
    visibleCubes.add(c);
    c.hover += (c.hoverT - c.hover) * Math.min(1, dt * 8);
    const t0 = performance.now();
    c.patch.update(dt, t, { hover: c.hover, wind: lab.wind });
    renderer.setViewport(r.left, innerHeight - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, innerHeight - r.bottom, r.width, r.height);
    renderer.render(c.patch.scene, cubeCam);
    c.cpu += (performance.now() - t0 - c.cpu) * 0.08;
  }

  const hr = stage.getBoundingClientRect();
  if (inView(hr, 0)) {
    const t0 = performance.now();
    hero.patch.U.uWind.value = lab.wind;
    hero.frame(dt, t, hr);
    renderer.setViewport(hr.left, innerHeight - hr.bottom, hr.width, hr.height);
    renderer.setScissor(hr.left, innerHeight - hr.bottom, hr.width, hr.height);
    renderer.render(hero.patch.scene, hero.camera);
    heroCpu += (performance.now() - t0 - heroCpu) * 0.08;
  }

  jsEma += (performance.now() - jsStart - jsEma) * 0.05;

  // DOM stats a few times a second
  statClock += dt;
  if (statClock > 0.25) {
    statClock = 0;
    for (const c of visibleCubes) $('.s-cpu', c.card).textContent = c.cpu.toFixed(2);
    if (inView(hr, 0)) {
      const s = hero.patch.stats();
      $('#heroStats').textContent = `${hero.patch.cells.length} cells · ${fmt(s.items)} instances · ${fmt(s.tris)} tris · ${s.draws} draws · ${heroCpu.toFixed(2)} ms cpu${hero.cat ? '' : ' · cat loading'}`;
    }
  }
  perfClock += dt;
  if (perfClock > 0.5) {
    perfClock = 0;
    $('#perf').textContent = `${Math.round(1000 / Math.max(frameEma, 1))} fps · ${jsEma.toFixed(1)} ms js/frame · density ×${lab.density.toFixed(2)} · ${gpuName}`;
  }

  // quality governor
  if (lab.quality === 'auto' && !q.has('shot')) {
    govClock += dt;
    if (govClock > 1.5) {
      govClock = 0;
      if (frameEma > 30 && lab.density > 0.31) { applyDensity(Math.max(0.3, lab.density * 0.78)); lastChange = t; }
      else if (frameEma > 34 && lab.density <= 0.31 && lab.pixelRatio > 1) {
        lab.pixelRatio = 1; renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight, false); lastChange = t;
      } else if (frameEma < 19 && lab.density < 1 && t - lastChange > 6) { applyDensity(Math.min(1, lab.density * 1.2)); lastChange = t; }
    }
  }
  window.__frames = frames;
  window.__built = lab.cubes.filter((c) => c.patch).length;
}
requestAnimationFrame(frame);

/* ---------------- background work: cat, then warm every cube ---------------- */

const wantCat = q.get('cat') !== '0';
setTimeout(async () => {
  if (wantCat) await hero.loadCat();
  else $('#wake').hidden = true;
  window.__catReady = hero.catState;
  if (q.get('prewarm') === '0') return;
  for (const c of lab.cubes) {
    if (c.patch) continue;
    await new Promise((r) => setTimeout(r, 220));
    c.build();
    try { await renderer.compileAsync(c.patch.scene, cubeCam); } catch (e) { /* ignore */ }
  }
}, +q.get('delay') || 1200);

window.lab = lab;
