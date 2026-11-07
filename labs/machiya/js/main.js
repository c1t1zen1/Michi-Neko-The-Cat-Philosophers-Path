// Lab 04 · Machiya: the page, the nine variant cubes, the climbable hero
// stage, the construction stepper and the loop.
import * as THREE from 'three';
import { createRenderer, Views, Loop, Meter, Governor, renderRect, flag, Q } from '../../shared/stage.js';
import { seg, slider, Stepper } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { Hero } from './hero.js';
import { VARIANTS, FAMILIES } from './variants.js';
import { STEPS } from './steps.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
mountLabChrome('machiya');

const lab = window.__machiya = { style: flag('style', 'hybrid'), hour: +flag('hour', 10.5) };
if (!['hybrid', 'toon', 'standard'].includes(lab.style)) lab.style = 'hybrid';
const getHour = () => lab.hour;

const { renderer, gpu } = createRenderer($('#gl'), { shadows: true, exposure: 1.1 });
lab.renderer = renderer;

/* ---------------- variant cards ---------------- */

const famRoot = $('#families');
FAMILIES.forEach((fam, fi) => {
  const sec = document.createElement('section');
  sec.className = 'family';
  sec.id = fam.key;
  sec.innerHTML = `<div class="fam-head"><span class="fam-num">${String(fi + 1).padStart(2, '0')}</span><h2>${fam.title}</h2><p class="fam-sub">${fam.sub}</p></div><div class="variants"></div>`;
  famRoot.append(sec);
  const grid = sec.querySelector('.variants');
  for (const v of VARIANTS.filter((x) => x.family === fam.key)) {
    const a = document.createElement('article');
    a.className = 'tile';
    a.id = v.slug;
    a.dataset.slug = v.slug;
    a.innerHTML = `
      <div class="view" role="button" tabindex="0" aria-label="${esc(v.name)}"></div>
      <h3 class="name">${esc(v.name)}</h3>
      <p class="tag">${esc(v.tag)}</p>
      <p class="blurb">${esc(v.blurb)}</p>
      <dl class="stats">
        <div><dd class="s-tris">–</dd><dt>tris</dt></div>
        <div><dd class="s-meshes">–</dd><dt>parts</dt></div>
        <div><dd class="s-build">–</dd><dt>ms build</dt></div>
        <div><dd class="s-calls">–</dd><dt>draws</dt></div>
      </dl>
      <p class="stats2">${esc(v.unit)}</p>
      <details>
        <summary>How it’s made</summary>
        <ul class="how">${v.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <pre class="code"><code>${esc(v.code)}</code></pre>
        <p class="use"><b>Use it for</b> ${esc(v.use)}</p>
        ${v.sources.length ? `<ul class="srcs">${v.sources.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>` : ''}
      </details>`;
    grid.append(a);
  }
});

/* ---------------- sources list ---------------- */

{
  const seen = new Map();
  for (const v of VARIANTS) for (const [l, u] of v.sources) if (!seen.has(u)) seen.set(u, l);
  $('#srcList').innerHTML = [...seen].map(([u, l]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('');
}

/* ---------------- views + hero ---------------- */

const views = new Views(renderer);
const stageEl = $('#stage');
const hero = new Hero(lab, stageEl);
lab.hero = hero;

const heroView = views.add(stageEl, {
  scene: hero.scene,
  camera: hero.iso,
  update(dt, t, rect) { hero.frame(dt, t, rect); },
  render(r, rect) { renderRect(r, rect, hero.scene, hero.camera); }
});

// variant cubes: lazy build + a slow turntable that stops while hovered
const tiles = [];
document.querySelectorAll('.tile').forEach((card) => {
  const v = VARIANTS.find((x) => x.slug === card.dataset.slug);
  const el = card.querySelector('.view');
  let hover = 0, hoverT = 0;
  el.addEventListener('pointerenter', () => { hoverT = 1; });
  el.addEventListener('pointerleave', () => { hoverT = 0; });
  const go = () => { stageEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  el.addEventListener('click', go);
  card.querySelector('.name').addEventListener('click', go);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  const view = views.add(el, {
    build() {
      const res = v.build(renderer, getHour());
      card.querySelector('.s-tris').textContent = res.counts.tris.toLocaleString();
      card.querySelector('.s-meshes').textContent = res.counts.meshes;
      card.querySelector('.s-build').textContent = res.built.toFixed(0);
      return {
        scene: res.scene, camera: res.camera,
        update(dt, t) {
          hover += (hoverT - hover) * Math.min(1, dt * 8);
          res.spin.rotation.y += dt * 0.25 * (1 - hover * 0.6);
          res.spin.position.y = hover * 0.08;
          if (res.rig.hour !== getHour()) res.rig.setHour(getHour());
        }
      };
    }
  });
  tiles.push({ card, view });
});

/* ---------------- UI ---------------- */

// style (shading model) — rebuilds the hero machiya live
const STYLES = [{ v: 'hybrid', label: 'Hybrid' }, { v: 'toon', label: 'Toon' }, { v: 'standard', label: 'PBR' }];
const styleSeg = seg($('#seg-style'), STYLES, lab.style, (v) => {
  lab.style = v;
  hero.setStyle(v);
  if (window.__catReady) hero.rig.applyEnv();
});
lab.setStyle = (v) => { lab.style = v; styleSeg.set(v); hero.setStyle(v); };

// hour
const hourCtl = slider($('#hour-mount'), {
  label: 'Hour', min: 0, max: 24, step: 0.1, value: lab.hour,
  fmt: (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`,
  onInput: (h) => { lab.hour = h; hero.setHour(h); }
});
seg($('#hour-presets'), [{ v: 10.5, label: 'Morning' }, { v: 12, label: 'Noon' }, { v: 17.8, label: 'Golden' }, { v: 22, label: 'Night' }], null, (h) => { hourCtl.set(h); lab.hour = h; hero.setHour(h); });

// view / gait / turn
seg($('#seg-view'), [{ v: 'iso', label: 'Isometric' }, { v: 'eye', label: 'Cat-eye' }], hero.view, (v) => hero.setView(v));
seg($('#seg-gait'), [{ v: 'walk', label: 'Walk' }, { v: 'prowl', label: 'Prowl' }], 'walk', (v) => hero.setProwl(v === 'prowl'));
$('#btn-rotl').addEventListener('click', () => hero.rotate(-1));
$('#btn-rotr').addEventListener('click', () => hero.rotate(1));
lab.setProwl = (b) => hero.setProwl(b);
lab.setView = (v) => hero.setView(v);

// construction stepper
new Stepper($('#steps-mount'), { steps: STEPS.map((s) => ({ key: s.key, title: s.title, body: s.body, code: s.code })) });

lab.onCatReady = () => { $('#wake').hidden = true; window.__catReady = true; };
if (flag('cat') === '0') $('#wake').hidden = true;

/* ---------------- stats helpers ---------------- */

let heroCounts = { tris: 0, meshes: 0 };
{
  hero.scene.traverse((o) => {
    if (o.isMesh || o.isInstancedMesh) {
      heroCounts.meshes++;
      const g = o.geometry;
      const n = g.index ? g.index.count : g.attributes.position.count;
      heroCounts.tris += o.isInstancedMesh ? Math.floor(n / 3) * o.count : Math.floor(n / 3);
    }
  });
}
const surfaceName = () => {
  if (hero.climbing) return 'climbing the lattice';
  if (!hero.grounded) return 'mid-air';
  if (hero.y < 0.5) return 'on the street';
  if (hero.y < 1.6) return 'on the engawa';
  if (hero.y < 3.2) return 'on the pent roof';
  return 'on the ridge';
};

/* ---------------- loop ---------------- */

const meter = new Meter($('#perf'), gpu);
const gov = new Governor({ onScale: () => {}, onPixelRatio: () => {} });
let statClock = 0;
new Loop((dt, t, raw) => {
  const t0 = performance.now();
  views.render(dt, t);
  const js = performance.now() - t0;
  meter.tick(raw, js, `${lab.style} · ${getHour().toFixed(1)} h`);
  gov.tick(dt, raw * 1000);
  if ((statClock += dt) > 0.25) {
    statClock = 0;
    for (const { card, view } of tiles) {
      if (!view.built) continue;
      card.querySelector('.s-calls').textContent = view.stats.calls;
    }
    $('#hudState').textContent = surfaceName();
    $('#heroStats').textContent = `${heroCounts.meshes} parts · ${heroCounts.tris.toLocaleString()} tris · ${heroView.stats.calls} draws · ${heroView.cpuMs.toFixed(2)} ms cpu${hero.cat ? '' : ' · cat loading'}`;
  }
}).start();

if (flag('cat') !== '0') hero.loadCat();

window.lab = lab;
window.hero = hero;
