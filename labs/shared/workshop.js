// The page engine behind the Tier 2-4 labs. A lab hands runLab() its families,
// specimens, steps and sources, plus a function that builds its stage; this
// file renders the shelves (one canvas, one scissored view per tile), the
// recipes, the stepper, the notebook and the frame loop. A recipe's code is
// the build function that drew the tile, so the two can never disagree.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer, Views, Loop, Meter, Governor, renderRect, flag, SHOT, reduceMotion } from './stage.js';
import { seg, slider, toggle, Stepper, Dropdown } from './ui.js';
import { mountLabChrome } from './nav.js';
import { LightRig } from './light.js';
import { Finisher, FINISHES } from './finish.js';
import * as craft from './craft.js';
import { M, paintify } from './painted.js';
import { setMuted } from './sound.js';
import { mountSpecimenLinks } from './specimen-link.js';

const { V3, rng, canvas2d, canvasTexture, countScene, shadows, TAU, clamp } = craft;
const _bc = new THREE.Vector3();
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
const hhmm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

/** Strip the shared indent from a function's source for display. */
export function sourceOf(fn) {
  if (typeof fn === 'string') return fn;
  const lines = fn.toString().split('\n');
  const rest = lines.slice(1).filter((l) => l.trim());
  const ind = rest.length ? Math.min(...rest.map((l) => l.match(/^ */)[0].length)) : 0;
  return [lines[0], ...lines.slice(1).map((l) => l.slice(ind))].join('\n');
}

/* ---------------- plinths ---------------- */

const PLINTHS = {
  earth: { top: '#7c6a4e', side: ['#5b4630', '#3d2c1e', '#2a1e15'], dots: 'rgba(200,180,150,A)' },
  moss: { top: '#5e7a3c', side: ['#46582c', '#3d2c1e', '#2a1e15'], dots: 'rgba(130,160,90,A)' },
  stone: { top: '#a8a397', side: ['#807a6e', '#5f5a50', '#46423b'], dots: 'rgba(60,55,50,A)' },
  gravel: { top: '#d6cfbb', side: ['#b9b09a', '#8c8473', '#655e51'], dots: 'rgba(120,112,98,A)' },
  water: { top: '#4f7f86', side: ['#2f5560', '#3d2c1e', '#2a1e15'], dots: 'rgba(190,225,230,A)' },
  dark: { top: '#3a3a44', side: ['#2c2c35', '#22222a', '#191920'], dots: 'rgba(160,160,190,A)' },
  wood: { top: '#9a7a54', side: ['#7a5c3e', '#5e452e', '#463320'], dots: 'rgba(60,40,24,A)' }
};
const plinthTex = new Map();
function plinthMats(style) {
  if (plinthTex.has(style)) return plinthTex.get(style);
  const P = PLINTHS[style] || PLINTHS.earth, r = rng(style.length * 77 + 3);
  const [c, x] = canvas2d(256, 256);
  x.fillStyle = P.top; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = (r() < 0.5 ? P.dots : 'rgba(30,28,20,A)').replace('A', (0.03 + r() * 0.12).toFixed(3));
    x.beginPath(); x.ellipse(r() * 256, r() * 256, 1 + r() * 9, 1 + r() * 5, r() * 3, 0, TAU); x.fill();
  }
  const [s, y] = canvas2d(128, 128);
  const g = y.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, P.side[0]); g.addColorStop(0.32, P.side[0]); g.addColorStop(0.42, P.side[1]); g.addColorStop(0.72, P.side[1]); g.addColorStop(0.82, P.side[2]); g.addColorStop(1, P.side[2]);
  y.fillStyle = g; y.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) { y.fillStyle = `rgba(255,240,220,${0.03 + r() * 0.07})`; y.beginPath(); y.arc(r() * 128, 30 + r() * 95, 0.6 + r() * 2, 0, TAU); y.fill(); }
  const topM = new THREE.MeshStandardMaterial({ map: canvasTexture(c), roughness: 1 });
  const sideM = new THREE.MeshStandardMaterial({ map: canvasTexture(s), roughness: 1 });
  const res = [sideM, sideM, topM, sideM, sideM, sideM];
  plinthTex.set(style, res);
  return res;
}
let blobTex = null;
function plinth(W, T, style) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, T, W), plinthMats(style));
  box.position.y = -T / 2; box.receiveShadow = true; box.userData.noShadow = true;
  g.add(box);
  if (!blobTex) {
    const [c, x] = canvas2d(128, 128);
    const gr = x.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(36,40,34,.5)'); gr.addColorStop(0.55, 'rgba(36,40,34,.22)'); gr.addColorStop(1, 'rgba(36,40,34,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    blobTex = canvasTexture(c);
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(W * 0.98, 48), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: true, toneMapped: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -T - 0.01; blob.userData.noShadow = true;
  g.add(blob);
  g.userData.blob = blob;   // drawn by the finish pass instead when the shelf is painted
  return g;
}

/* ---------------- tiles ---------------- */

function presentSpecimen(lab, spec, built) {
  const group = built.group || built;
  const scene = new THREE.Scene();
  let hasAirEffects = false;
  group.traverse((o) => { if (o.isPoints || o.isLine || o.isSprite) hasAirEffects = true; });
  shadows(group);
  if (built.noCast) group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  scene.add(group);
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(V3()), c = box.getCenter(V3());
  if (spec.sit !== false) {
    group.position.x -= c.x; group.position.z -= c.z; group.position.y -= box.min.y;
    // Flat water/disc studies would otherwise coincide with the plinth top.
    if (size.y < 0.002) group.position.y += 0.008;
  }
  const span = Math.max(size.x, size.z, 0.2), W = spec.plinthW ?? span * 1.14 + 0.14, T = W * 0.18;
  const base = spec.plinth !== 'none' ? plinth(W, T, spec.plinth || lab.def.plinth || 'earth') : null;
  if (base) scene.add(base);
  const rig = new LightRig(scene, { hour: spec.hour ?? lab.hour, shadows: true, shadowSize: Math.max(W * 0.9, size.y), sky: false, fog: false, background: false });
  rig.sun.shadow.mapSize.set(1024, 1024);
  rig.sun.shadow.normalBias = 0.02 * Math.min(1, W / 3);
  rig.sun.shadow.bias = -0.0005;
  rig.sun.shadow.autoUpdate = false;
  rig.sun.shadow.needsUpdate = true;
  scene.environment = lab.env;
  rig.applyEnv();
  // a sphere round the plinth and specimen keeps the frame steady as it turns
  const fit = new THREE.Box3(V3(-W / 2, -T, -W / 2), V3(W / 2, Math.max(size.y * 1.02, W * 0.15), W / 2));
  const sph = fit.getBoundingSphere(new THREE.Sphere());
  const R = sph.radius * (spec.zoom ?? 1.02);
  const camera = new THREE.OrthographicCamera(-R, R, R, -R, 0.1, R * 40);
  const el0 = spec.el ?? 0.58;
  return { scene, camera, rig, R, target: sph.center, az: spec.az ?? Math.PI * 0.25, el: el0, update: built.update, group, counts: countScene(group), base, W, T, hasAirEffects, blob: new THREE.Vector4() };
}

function buildTiles(lab) {
  const { def, views, renderer } = lab, root = $('#shelves');
  lab.tiles = [];
  const toSrc = (k) => def.sources[k];
  for (const [fi, fam] of def.families.entries()) {
    const sec = document.createElement('section');
    sec.className = 'family'; sec.id = 'shelf-' + fam.key;
    sec.innerHTML = `<div class="fam-head"><span class="fam-num">${String(fi + 1).padStart(2, '0')}</span><h2>${fam.title}</h2><p class="fam-sub">${esc(fam.sub)}</p></div><div class="variants"></div>`;
    root.append(sec);
    const opt = document.createElement('option'); opt.value = fam.key; opt.textContent = fam.title.replace(/<[^>]*>/g, ''); $('#family-filter').append(opt);
    for (const spec of def.specimens.filter((s) => s.family === fam.key)) {
      const card = document.createElement('article');
      card.className = 'tile' + (spec.original ? ' is-original' : ''); card.dataset.id = spec.id;
      const srcs = (spec.sources || []).map(toSrc).filter(Boolean);
      // the real builder for originals, then the tile's own code and any helpers it leans on
      const code = [...(spec.game ? [spec.game()] : []), spec.build, ...(spec.also || [])].map(sourceOf).join('\n\n');
      card.innerHTML = `<div class="specimen-mark">${spec.original ? 'In the game today' : 'New recipe'}</div>
        <div class="view" role="button" tabindex="0" aria-label="${spec.original ? 'Compare' : 'Try'} ${esc(spec.name)}"></div>
        <h3 class="name">${esc(spec.name)}${spec.jp ? ` <span class="jp">${spec.jp}</span>` : ''}</h3>
        <p class="tag">${esc(spec.tag)}</p>
        <p class="blurb">${esc(spec.blurb)}</p>
        <dl class="stats"><div><dd class="s-tris">–</dd><dt>tris</dt></div><div><dd class="s-meshes">–</dd><dt>draws</dt></div><div><dd class="s-inst">–</dd><dt>instances</dt></div><div><dd class="s-build">–</dd><dt>ms build</dt></div></dl>
        <div class="card-actions"><button type="button" class="apply">${def.chooseLabel ? esc(def.chooseLabel(spec)) : (spec.original ? 'See it on the stage' : 'Try it on the stage')} ↗</button><button type="button" class="copy">Copy recipe</button></div>
        <details><summary>Source recipe</summary>
          <ul class="how">${(spec.how || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
          <pre class="code"><code>${esc(code)}</code></pre>
          ${spec.use ? `<p class="use"><b>Use it for</b> ${esc(spec.use)}</p>` : ''}
          <p class="source-file"><a href="js/recipes.js" target="_blank">The whole recipe file ↗</a></p>
          ${srcs.length ? `<ul class="srcs">${srcs.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>` : ''}
        </details>`;
      sec.querySelector('.variants').append(card);
      const el = card.querySelector('.view');
      let hover = false, drag = null, azim = 0;
      el.addEventListener('pointerenter', () => { hover = true; });
      el.addEventListener('pointerleave', () => { hover = false; });
      el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, a: azim, moved: false }; });
      addEventListener('pointermove', (e) => { if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; azim = drag.a + dx * 0.012; } });
      const pick = () => choose(lab, spec);
      addEventListener('pointerup', () => { if (drag) { const moved = drag.moved; drag = null; if (moved) el.dataset.dragged = '1'; } });
      el.addEventListener('click', () => { if (el.dataset.dragged) { delete el.dataset.dragged; return; } pick(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      card.querySelector('.apply').addEventListener('click', pick);
      card.querySelector('.copy').addEventListener('click', (e) => copy(code, e.currentTarget));
      const view = views.add(el, {
        margin: 200,
        build() {
          const t0 = performance.now();
          const k = { THREE, ...craft, M, paintify, seed: (fi + 1) * 100 + lab.tiles.length, rand: rng((fi + 1) * 100 + lab.tiles.length + 1), lab };
          const built = spec.build(k);
          const p = presentSpecimen(lab, spec, built);
          card.querySelector('.s-tris').textContent = fmt(p.counts.tris);
          card.querySelector('.s-meshes').textContent = p.counts.meshes;
          card.querySelector('.s-inst').textContent = fmt(p.counts.instanced);
          card.querySelector('.s-build').textContent = (performance.now() - t0).toFixed(0);
          const spin = spec.spin ?? 1;
          const obj = {
            scene: p.scene, camera: p.camera,
            update(dt, t, rect) {
              if (lab.spin && !hover && !drag && !reduceMotion) azim += dt * 0.16 * spin;
              const a = p.az + azim, D = p.R * 16, ce = Math.cos(p.el);
              p.camera.position.set(p.target.x + Math.sin(a) * ce * D, p.target.y + Math.sin(p.el) * D, p.target.z + Math.cos(a) * ce * D);
              p.camera.lookAt(p.target);
              const asp = rect.width / rect.height;
              p.camera.left = -p.R * asp; p.camera.right = p.R * asp; p.camera.top = p.R; p.camera.bottom = -p.R; p.camera.updateProjectionMatrix();
              const hour = spec.hour ?? lab.hour;
              if (p.rig.hour !== hour) { p.rig.setHour(hour); p.rig.sun.shadow.needsUpdate = true; }
              if (p.update) { p.update(t, dt, lab); if (spec.animatedShadow !== false) p.rig.sun.shadow.needsUpdate = true; }
            },
            render(r, rect) {
              // The painted shelf replaces depthless background pixels. Points,
              // lines and sprites don't write depth, so draw those studies directly.
              const painted = lab.shelfPaint && !p.hasAirEffects;
              if (p.base) p.base.userData.blob.visible = !painted;
              if (painted) {
                const asp = rect.width / rect.height, c = _bc.set(0, -p.T, 0).project(p.camera);
                const rx = (p.W * 0.78) / (2 * p.R * asp), ry = (p.W * 0.78) / (2 * p.R) * Math.sin(p.el);
                p.blob.set(c.x * 0.5 + 0.5, c.y * 0.5 + 0.5, rx, ry);
                lab.finisher.render(p.scene, p.camera, rect, 'background', { strength: 0.62, time: 0, keepBg: true, lineFar: 1000, paintMix: 0.7, sat: 1.05, blob: p.blob });
              } else renderRect(r, rect, p.scene, p.camera);
            }
          };
          return obj;
        }
      });
      lab.tiles.push({ card, view, spec });
    }
  }
  const search = $('#recipe-search'), fam = $('#family-filter');
  const filter = () => {
    const w = search.value.trim().toLowerCase(), f = fam.value;
    let n = 0;
    for (const { card, spec } of lab.tiles) {
      const show = (!w || [spec.name, spec.tag, spec.blurb, spec.family].join(' ').toLowerCase().includes(w)) && (f === 'all' || f === spec.family || (f === 'original' && spec.original));
      card.hidden = !show; if (show) n++;
    }
    for (const sec of document.querySelectorAll('#shelves .family')) sec.hidden = ![...sec.querySelectorAll('.tile')].some((c) => !c.hidden);
    $('#recipe-count').textContent = `${n} / ${def.specimens.length} specimens`;
    $('#empty-search').hidden = n > 0;
  };
  search.addEventListener('input', filter); fam.addEventListener('change', filter);
  filter();
  mountSpecimenLinks(lab.tiles, { getId: (tile) => tile.spec.id });
}

function choose(lab, spec) {
  document.querySelectorAll('.tile').forEach((el) => el.classList.toggle('selected', el.dataset.id === spec.id));
  lab.def.choose?.(spec, lab);
  $('#walk').scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
}

async function copy(text, button) {
  const old = button.textContent;
  try { await navigator.clipboard.writeText(text); button.textContent = 'Copied ✓'; } catch { button.textContent = 'Open the recipe below'; }
  setTimeout(() => { button.textContent = old; }, 1800);
}

/* ---------------- shelf and sources chrome ---------------- */

function shelfControls(lab) {
  const mount = $('#shelf-bar');
  if (!mount) return;
  const wrap = document.createElement('div'); wrap.className = 'ctl-row'; mount.append(wrap);
  slider(wrap, { label: 'Hour', min: 5, max: 22, step: 0.25, value: lab.hour, fmt: hhmm, onInput: (h) => { lab.hour = h; } });
  const paint = document.createElement('div'); paint.className = 'ctl'; paint.innerHTML = '<span class="ctl-l">Finish</span>'; wrap.append(paint);
  lab.shelfSeg = seg(paint, [{ v: 'paint', label: 'Painted' }, { v: 'photo', label: 'Physical light' }], lab.shelfPaint ? 'paint' : 'photo', (v) => { lab.shelfPaint = v === 'paint'; });
  toggle(wrap, { label: 'Turntables', value: lab.spin, onChange: (b) => { lab.spin = b; } });
}

function sourcesList(lab) {
  const el = $('#srcList'); if (!el) return;
  const list = Object.values(lab.def.sources);
  el.innerHTML = list.map(([l, u, kind]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a>${kind ? ` <small>· ${esc(kind)}</small>` : ''}</li>`).join('');
}

/* ---------------- steps ---------------- */

function mountSteps(lab) {
  const { def, views } = lab, A = def.assembly;
  if (!$('#steps-mount') || !def.steps?.length) return;
  let state = null;
  const k = { THREE, ...craft, M, paintify, seed: 7, rand: rng(8), lab };
  if (A && $('#assembly-view')) {
    views.add($('#assembly-view'), {
      build() {
        state = A.build(k);
        shadows(state.group);
        const scene = new THREE.Scene(); scene.add(state.group); scene.environment = lab.env;
        const rig = new LightRig(scene, { hour: lab.hour, shadows: true, shadowSize: A.shadow ?? 8, sky: false, fog: false, background: false });
        rig.sun.shadow.mapSize.set(1024, 1024);
        rig.applyEnv();
        const R = A.radius ?? 5, cam = new THREE.OrthographicCamera(-R, R, R, -R, 0.1, 200);
        const tgt = V3(...(A.target ?? [0, 1.4, 0]));
        let az = 0.9;
        state.setPhase?.(lab.stepper ? lab.stepper.steps[lab.stepper.index].phase ?? lab.stepper.index : 0);
        return {
          scene, camera: cam,
          update(dt, t, r) {
            if (lab.spin && !reduceMotion) az += dt * 0.18;
            cam.position.set(tgt.x + Math.sin(az) * 22, tgt.y + 13, tgt.z + Math.cos(az) * 22); cam.lookAt(tgt);
            const asp = r.width / r.height; cam.left = -R * asp; cam.right = R * asp; cam.top = R; cam.bottom = -R; cam.updateProjectionMatrix();
            if (rig.hour !== lab.hour) rig.setHour(lab.hour);
            state.update?.(t, dt);
          }
        };
      }, margin: 300
    });
  }
  lab.stepper = new Stepper($('#steps-mount'), {
    steps: def.steps, start: 0,
    onStep: (i, s) => { state?.setPhase?.(s.phase ?? i); def.onStep?.(i, s, lab); }
  });
  $('#steps-finished')?.addEventListener('click', () => lab.stepper.go(def.steps.length - 1));
}

/* ---------------- bars the stages share ---------------- */

/** Hour, finish, view, sound, postcard: the row most stages want. */
export function standardBar(world, mount, { hour = true, finish = true, views = true, postcard = true, presets = [[8.5, 'Morning'], [16.5, 'Golden'], [20.6, 'Dusk']] } = {}) {
  const row = document.createElement('div'); row.className = 'bar-row'; mount.append(row);
  const out = {};
  if (views) {
    const c = document.createElement('div'); c.className = 'ctl'; c.innerHTML = '<span class="ctl-l">View</span>'; row.append(c);
    out.view = seg(c, Object.entries(world.viewsDef).map(([v, d]) => ({ v, label: d.label })), 'stage', (v) => world.view(v));
  }
  if (hour) {
    const h = document.createElement('span'); row.append(h);
    out.hour = slider(h, { label: 'Hour', min: 5, max: 22.5, step: 0.05, value: world.hour, fmt: hhmm, onInput: (v) => world.setHour(v) });
    if (presets) { const c = document.createElement('span'); row.append(c); seg(c, presets.map(([v, label]) => ({ v, label })), null, (v) => { out.hour.set(v); world.setHour(v); }); }
  }
  if (finish) {
    const c = document.createElement('div'); c.className = 'ctl'; c.innerHTML = '<span class="ctl-l">Finish</span>'; row.append(c);
    const m = document.createElement('span'); m.className = 'slot'; c.append(m);
    out.finish = new Dropdown(m, { items: FINISHES.map((f) => ({ value: f.key, label: f.name, hint: `${f.jp} · ${f.hint}` })), value: world.finishMode, label: 'Finish', onChange: (v) => world.setFinish(v) });
  }
  const snd = document.createElement('span'); row.append(snd);
  toggle(snd, { label: 'Sound', value: true, onChange: (b) => setMuted(!b) });
  if (postcard) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = 'Keep a postcard'; row.append(b);
    b.addEventListener('click', () => world.postcard(world.lab.def.slug + '-postcard'));
  }
  return out;
}

/* ---------------- the page ---------------- */

export async function runLab(def) {
  mountLabChrome(def.slug);
  if (SHOT && flag('nohud')) document.body.classList.add('shot');
  const { renderer, gpu } = createRenderer($('#gl'), { shadows: true, exposure: def.exposure ?? 1.05, maxPR: def.maxPR ?? 1.5 });
  const views = new Views(renderer);
  const lab = window.__lab = {
    def, renderer, views, gpu, hour: +flag('hour', def.hour ?? 16.5), spin: flag('spin') !== '0',
    shelfPaint: flag('shelf') !== 'photo' && !/software/i.test(gpu), tiles: [], world: null, stepper: null
  };
  lab.finisher = new Finisher(renderer);
  lab.env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  buildTiles(lab);
  shelfControls(lab);
  sourcesList(lab);
  mountSteps(lab);

  const meter = new Meter($('#perf') || document.createElement('span'), gpu);
  const gov = new Governor({
    onScale: (s) => { if (s < 0.7 && lab.shelfPaint) { lab.shelfPaint = false; lab.shelfSeg?.set('photo'); } },
    onPixelRatio: (pr) => renderer.setPixelRatio(pr)
  });
  let clock = 0;
  new Loop((dt, t, raw) => {
    const t0 = performance.now();
    views.render(dt, t);
    meter.tick(raw, performance.now() - t0, lab.world ? `${hhmm(lab.world.hour)}` : '');
    gov.tick(dt, raw * 1000);
    if ((clock += dt) > 0.4) {
      clock = 0;
      if (lab.heroView && $('#heroStats')) { const s = lab.heroView.stats; $('#heroStats').textContent = `${fmt(s.tris)} triangles · ${s.calls} draws · ${lab.heroView.cpuMs.toFixed(1)} ms CPU`; }
      def.onTick?.(lab);
    }
  }).start();

  // the stage comes last: it may need game modules, the cat and the grass
  const wake = $('#wake');
  try {
    lab.world = await def.stage(lab);
    if (lab.world) lab.heroView = views.add($('#stage'), { scene: lab.world.scene, camera: lab.world.camera, update: (dt, t, r) => lab.world.frame(dt, t, r), render: (r, rect) => lab.world.render(r, rect), margin: 200 });
    if (wake) wake.hidden = true;
  } catch (e) {
    console.error('stage failed', e);
    if (wake) wake.textContent = 'The stage could not load. Check your connection to the Three.js CDN and reload.';
  }
  window.__labReady = true;
  return lab;
}
