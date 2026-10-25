// Lab 01 · Ground: the page, the stage, the tools, the loop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, Views, Loop, Meter, Governor, renderSplit, renderRect, flag, Q, SHOT } from '../../shared/stage.js';
import { LightRig } from '../../shared/light.js';
import { CatWalker } from '../../shared/catwalk.js';
import { Dropdown, seg, slider, toggle, Stepper, Split } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { groundTextures } from '../../shared/game.js';
import { GLSL_HASH, pcg2d } from './hash.js';
import { layerTextures } from './layers.js';
import { Terrain, LAYERS } from './terrain.js';
import { createGroundMaterial, addRipple } from './material.js';
import { PrintBuffer } from './prints.js';
import { StoneLOD, SteppingStones, makeRock, STYLES, PATTERNS } from './stones.js';
import { Weather, RainStreaks, EaveDrips } from './weather.js';
import { Sound } from './sound.js';
import { RECIPES, SAMPLER, SOURCES, recipeById } from './recipes.js';
import { STEPS, BASE } from './steps.js';
import { buildGallery } from './gallery.js';

const $ = (s) => document.querySelector(s);
mountLabChrome('ground');

/* ---------------- renderer + hash parity ---------------- */

const { renderer, gpu } = createRenderer($('#gl'), { shadows: true, exposure: 1.1 });
const ground = window.__ground = { catReady: false, parity: null };

function hashParity() {
  const rt = new THREE.WebGLRenderTarget(64, 1, { type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `${GLSL_HASH}\nvoid main(){ int i = int(gl_FragCoord.x); ivec2 c = ivec2((i % 8 - 4) * 131, (i / 8 - 4) * 97); uvec2 h = pcg2d(uvec2(c)); gl_FragColor = vec4(vec2(h >> 24u) / 255., 0., 1.); }`
  }));
  const sc = new THREE.Scene(); sc.add(quad);
  const buf = new Uint8Array(64 * 4), prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(sc, new THREE.Camera()); renderer.readRenderTargetPixels(rt, 0, 0, 64, 1, buf); renderer.setRenderTarget(prev);
  let ok = 0; const bad = [];
  for (let i = 0; i < 64; i++) {
    const [x, y] = pcg2d(((i % 8) - 4) * 131, (Math.floor(i / 8) - 4) * 97);
    if (buf[i * 4] === x >>> 24 && buf[i * 4 + 1] === y >>> 24) ok++; else bad.push(`${i}: gpu ${buf[i * 4]},${buf[i * 4 + 1]} js ${x >>> 24},${y >>> 24}`);
  }
  console.log(ok === 64 ? 'HASH PARITY OK 64/64' : `HASH PARITY FAIL ${ok}/64\n${bad.join('\n')}`);
  ground.parity = ok;
  rt.dispose();
}
if (flag('check') === '1') hashParity();

/* ---------------- stage scene ---------------- */

const scene = new THREE.Scene();
const rig = new LightRig(scene, { hour: +flag('hour', 10.5), shadows: true, shadowSize: 8 });
const layers = layerTextures(renderer);
const gameTex = groundTextures(6).map;
const weather = new Weather();
const terrain = new Terrain({ size: 12, res: 256, hres: 129, seg: 192 });
terrain.weather = weather;
const QUAL = {
  eco: { prints: 1024, pr: 1, lod: 1.6, seg: 128 },
  lush: { prints: 2048, pr: Math.min(devicePixelRatio || 1, 1.75), lod: 2.4, seg: 192 }
};
let quality = ['eco', 'lush'].includes(flag('quality')) ? flag('quality') : 'auto';
let Qs = quality === 'eco' ? QUAL.eco : QUAL.lush;
let prints = new PrintBuffer(renderer, terrain, Qs.prints);
const mat = createGroundMaterial(terrain, { layers, rig, gameTex, prints: prints.texture, printRes: Qs.prints });
const U = mat.userData.u;
terrain.mesh.material = mat;
terrain.setSeg(Qs.seg);
scene.add(terrain.group);
const stones = new SteppingStones(terrain, scene);
const lod = new StoneLOD(terrain, mat, { radius: Qs.lod });
scene.add(lod.group);
const rain = new RainStreaks(12, rig.palette);
scene.add(rain.mesh);
let eave = null;
const sound = new Sound();

const stageEl = $('#stage');
const eyeCam = new THREE.PerspectiveCamera(60, 2, 0.04, 1000);
const orbitCam = new THREE.PerspectiveCamera(40, 2, 0.05, 1000);
orbitCam.position.set(5.5, 7.5, 9.8);
const controls = new OrbitControls(orbitCam, stageEl);
controls.target.set(0, 0, 0.5);
controls.enableDamping = true; controls.maxPolarAngle = 1.45; controls.minDistance = 1.2; controls.maxDistance = 18;

const S = { view: 'orbit', tool: 'walk', blend: 0.18, lod: true, ring: false, prints: true, hud: false, recipe: 'sampler', lodScale: 1 };
const activeCam = () => (S.view === 'orbit' ? orbitCam : eyeCam);

const walker = new CatWalker({
  parent: scene, dom: stageEl, camera: activeCam, ground: terrain.mesh, heightAt: (x, z) => terrain.heightAt(x, z),
  bounds: { x0: -5.6, x1: 5.6, z0: -5.6, z1: 5.6 }, blocked: (x, z) => terrain.blockedAt(x, z), start: { x: -1, z: 0.5, heading: Math.PI / 2 }
});
ground.walker = walker;

/* ---------------- recipes ---------------- */

function env() {
  return {
    stones, setCobble: (v) => { U.uCobble.value = v; }, tint: (c) => U.uTint.value.set(...c),
    rock(x, z, r) { const m = makeRock(r); m.position.set(x, terrain.groundAt(x, z) + r * 0.05, z); terrain.props.add(m); terrain.colliders.push({ x, z, r: r * 1.3 }); },
    wall(wallZ, drip) {
      const s = terrain.size, g = terrain.groundAt(0, wallZ);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(s, 2.6, 0.2), new THREE.MeshStandardMaterial({ color: 0xe6dcc3, roughness: 0.95 }));
      wall.position.set(0, g + 1.3, wallZ);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(s + 0.1, 0.1, drip - wallZ + 0.15), new THREE.MeshStandardMaterial({ color: 0x3f444b, roughness: 0.7 }));
      roof.position.set(0, g + 2.35, (drip + wallZ - 0.15) / 2);
      for (const m of [wall, roof]) m.castShadow = m.receiveShadow = true;
      terrain.props.add(wall, roof);
      terrain.colliders.push({ x0: -s, x1: s, z0: wallZ - 0.5, z1: wallZ + 0.4 });
    },
    eave(o) { eave = new EaveDrips(mat, S.prints ? prints : null, { ...o, y: 2.35 }); scene.add(eave.mesh); }
  };
}
function loadRecipe(id, keepCat = false) {
  const r = recipeById(id) || SAMPLER;
  S.recipe = r.id;
  terrain.baseline(); stones.clear(); prints.clear();
  if (eave) { scene.remove(eave.mesh); eave = null; }
  U.uTint.value.set(1, 1, 1); U.uCobble.value = 0.12; terrain.extraH = null;
  r.paint(terrain, env());
  terrain.flush(); lod.last.r = -1;
  if (!keepCat) {
    const start = r.id === 'sampler' ? { x: -1, z: 0.5, h: Math.PI / 2 } : { x: 0, z: 1.2, h: Math.PI };
    walker.pos.set(start.x, start.z); walker.heading = start.h; walker.stop();
  }
}
ground.loadRecipe = loadRecipe;

/* ---------------- UI ---------------- */

const TOOLS = [['walk', 'Walk'], ['earth', 'Earth'], ['gravel', 'Gravel'], ['moss', 'Moss'], ['setts', 'Setts'], ['cobble', 'Cobbles'], ['dig', 'Dig'], ['raise', 'Raise'], ['rake', 'Rake'], ['stones', 'Stones']];
const tools = seg($('#tools'), TOOLS.map(([v, label]) => ({ v, label })), S.tool, (v) => setTool(v));
const brush = slider($('#c-tools'), { label: 'Brush', min: 0.2, max: 2, step: 0.05, value: 0.7, fmt: (v) => v.toFixed(2) + ' m' });
let pattern = 'chidorigake', style = 'oribe';
const stoneOpts = $('#stoneOpts');
new Dropdown($('#slot-pattern'), { items: PATTERNS, value: pattern, label: 'Stone pattern', onChange: (v) => { pattern = v; } });
new Dropdown($('#slot-style'), { items: STYLES, value: style, label: 'Stone style', onChange: (v) => { style = v; } });
function setTool(v) {
  S.tool = v; tools.set(v);
  $('#toolName').textContent = TOOLS.find((t) => t[0] === v)[1];
  stoneOpts.hidden = v !== 'stones';
  const walk = v === 'walk';
  controls.mouseButtons = { LEFT: walk ? THREE.MOUSE.ROTATE : -1, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: walk ? THREE.TOUCH.ROTATE : -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
  walker.clickToGo = walk;
  stageEl.style.cursor = walk ? 'crosshair' : 'none';
  if (walk) ring.visible = false;
}
const rainCtl = slider($('#c-world'), { label: 'Rain', min: 0, max: 1, step: 0.01, value: +flag('rain', 0), fmt: (v) => (v * 100).toFixed(0) + '%', onInput: (v) => weather.setRain(v) });
weather.setRain(rainCtl.get());
let hour = rig.hour;
const hourCtl = slider($('#c-world'), { label: 'Hour', min: 0, max: 24, step: 0.1, value: hour, fmt: (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`, onInput: (h) => setHour(h) });
function setHour(h) { hour = h; rig.setHour(h); hourCtl.set(h); }
seg($('#c-world'), [{ v: 8.5, label: 'Morning' }, { v: 12, label: 'Noon' }, { v: 17.8, label: 'Golden' }, { v: 22.5, label: 'Night' }], null, setHour);
const splitUI = new Split(stageEl, { left: 'Linear', right: 'Height blend' });
const splitTog = toggle($('#c-more'), { label: 'Split view', onChange: (b) => { splitUI.enabled = b; } });
toggle($('#c-more'), { label: 'Sound', onChange: (b) => sound.setEnabled(b) });
const viewSeg = seg($('#c-more'), [{ v: 'orbit', label: 'Orbit' }, { v: 'eye', label: 'Cat-eye' }], S.view, (v) => setView(v));
function setView(v) {
  S.view = v; walker.eyeInit = false; controls.enabled = v === 'orbit';
  viewSeg.set(v);
}
const recipeDD = new Dropdown($('#slot-recipe'), {
  items: [{ value: '', label: 'Choose…' }, { value: 'sampler', label: 'Sampler (the default)' }, ...RECIPES.map((r) => ({ value: r.id, label: r.name, hint: r.jp }))], value: '', label: 'Plant a recipe',
  onChange: (v) => { if (v) { loadRecipe(v); } }
});
$('#btn-reset').addEventListener('click', () => { weather.reset(); rainCtl.set(0); weather.setRain(0); loadRecipe('sampler'); });
const qSeg = seg($('#c-quality'), [{ v: 'auto', label: 'Auto' }, { v: 'eco', label: 'Eco' }, { v: 'lush', label: 'Lush' }], quality, (v) => setQuality(v));

/* ---------------- quality ---------------- */

let basePR = renderer.getPixelRatio();
const setPR = (pr) => { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); };
function applyLod() { lod.setRadius(S.lod && U.uMode.value === 0 ? Qs.lod * S.lodScale : 0); }
function setQuality(q) {
  quality = q; qSeg.set(q); Qs = q === 'eco' ? QUAL.eco : QUAL.lush;
  if (prints.res !== Qs.prints) {
    prints.rt.dispose(); prints = new PrintBuffer(renderer, terrain, Qs.prints);
    U.uPrints.value = prints.texture; U.uPrintRes.value = Qs.prints; ground.prints = prints;
  }
  terrain.setSeg(Qs.seg);
  basePR = Qs.pr; gov.scale = 1; gov.pixelLowered = false; gov.enabled = q === 'auto' && !SHOT; S.lodScale = 1;
  setPR(basePR); applyLod(); lod.last.r = -1;
}
const gov = new Governor({
  onScale: (s) => { S.lodScale = s; setPR(basePR * Math.max(0.6, s)); applyLod(); },
  onPixelRatio: (pr) => setPR(pr)
});
ground.prints = prints;

/* ---------------- steps ---------------- */

const lodRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
lodRing.rotation.x = -Math.PI / 2; lodRing.visible = false; scene.add(lodRing);
const PATHS = {
  lane: [[-4.6, -3.5], [4.6, -3.5]],
  hollow: [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((x) => [x, 2 - (x + 6) * 0.25 + Math.sin(x * 0.45) * 0.9])
};
function applyState(st, tool) {
  U.uMode.value = st.mode; U.uAntiTile.value = st.antiTile; U.uGrid.value = st.grid;
  S.blend = st.blendDepth; splitUI.enabled = st.split; splitTog.set(st.split); S.lod = st.lod; S.ring = st.lodRing && flag('ring') !== '0'; S.prints = st.prints;
  U.uPrintsOn.value = st.prints ? 1 : 0;
  rainCtl.set(st.rain); weather.setRain(st.rain);
  setView(st.view);
  $('#hudSplat').hidden = !(S.hud = st.hudSplat);
  if (st.catPath) walker.setPath(PATHS[st.catPath].map(([x, z]) => new THREE.Vector2(x, z)), true);
  else if (walker.mode === 'path') walker.setMode('drive');
  if (tool) setTool(tool);
  applyLod(); lod.last.r = -1;
}
let stepsLive = false;
const stepper = new Stepper($('#steps-mount'), {
  steps: STEPS.map((s) => ({ key: s.key, title: s.title, body: s.body, code: s.code })),
  onStep: (i) => { if (stepsLive) applyState({ ...BASE, ...STEPS[i].state }, STEPS[i].tool); }
});
stepsLive = true;
ground.stepper = stepper;
$('#to-stage')?.addEventListener('click', () => stageEl.scrollIntoView({ behavior: 'smooth', block: 'center' }));

/* ---------------- painting ---------------- */

const ring = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, depthTest: false }));
ring.rotation.x = -Math.PI / 2; ring.renderOrder = 20; ring.visible = false; scene.add(ring);
const ray = new THREE.Raycaster(), pointer = { x: 0, z: 0, ok: false, down: false, lx: null, lz: null }, drag = { a: null, b: null };
const UI = '.split, .callouts, .hud, .stepper, .dd, button, a, input, select, textarea';
function hit(e) {
  const r = stageEl.getBoundingClientRect();
  ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) }, activeCam());
  const h = ray.intersectObject(terrain.mesh)[0];
  if (!h) return false;
  pointer.x = h.point.x; pointer.z = h.point.z; pointer.ok = true;
  return true;
}
stageEl.addEventListener('pointermove', (e) => { if (S.tool !== 'walk') { hit(e); if (S.tool === 'stones' && drag.a) drag.b = { x: pointer.x, z: pointer.z }; } });
stageEl.addEventListener('pointerleave', () => { pointer.ok = false; ring.visible = false; });
stageEl.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || S.tool === 'walk' || e.target.closest(UI) || !hit(e)) return;
  stageEl.setPointerCapture(e.pointerId);
  pointer.down = true; pointer.lx = pointer.x; pointer.lz = pointer.z;
  if (S.tool === 'stones') drag.a = { x: pointer.x, z: pointer.z };
});
function endDrag() {
  if (pointer.down && S.tool === 'stones' && drag.a && drag.b && Math.hypot(drag.b.x - drag.a.x, drag.b.z - drag.a.z) > 0.3) stones.lay(pattern, drag.a, drag.b, style);
  pointer.down = false; drag.a = drag.b = null; stones.preview(null);
}
stageEl.addEventListener('pointerup', endDrag);
stageEl.addEventListener('pointercancel', endDrag);
const BRUSH_LAYER = { earth: 0, gravel: 1, moss: 2, setts: 3, cobble: 4 };
function paintFrame(dt) {
  const r = brush.get(), tool = S.tool;
  ring.visible = pointer.ok && tool !== 'walk' && tool !== 'stones';
  if (ring.visible) { ring.position.set(pointer.x, terrain.groundAt(pointer.x, pointer.z) + 0.02, pointer.z); ring.scale.setScalar(tool === 'rake' ? 0.38 : r); }
  if (tool === 'stones' && drag.a && drag.b) stones.preview(stones.layout(pattern, drag.a, drag.b, style));
  if (!pointer.down || !pointer.ok || tool === 'walk' || tool === 'stones') return;
  const dist = Math.hypot(pointer.x - pointer.lx, pointer.z - pointer.lz);
  if (tool === 'rake') {
    if (dist >= 0.1) { terrain.rakeStroke(pointer.lx, pointer.lz, pointer.x, pointer.z); pointer.lx = pointer.x; pointer.lz = pointer.z; }
    return;
  }
  const n = Math.max(1, Math.ceil(dist / (r * 0.5)));
  for (let i = 1; i <= n; i++) {
    const x = pointer.lx + (pointer.x - pointer.lx) * (i / n), z = pointer.lz + (pointer.z - pointer.lz) * (i / n);
    if (tool === 'dig') terrain.dig(x, z, r, 0.12 * dt / n);
    else if (tool === 'raise') terrain.dig(x, z, r, -0.12 * dt / n);
    else terrain.paint(BRUSH_LAYER[tool], x, z, r, 4 * dt / n);
  }
  pointer.lx = pointer.x; pointer.lz = pointer.z;
}

/* ---------------- paws ---------------- */

let wetSteps = 0;
walker.onStep = (i, x, z, heading) => {
  const L = terrain.layerAt(x, z), inWater = L.water > 0.002;
  if (inWater) { wetSteps = 8; addRipple(mat, x, z, 1); }
  const wet = wetSteps > 0 ? 1 : 0;
  if (wetSteps > 0 && !inWater) wetSteps--;
  if (S.prints) prints.stamp(x, z, heading, i < 2 ? 0.1 : 0.09, wet, 1, 0);
  const k = LAYERS[terrain.dominant(L.w)];
  sound.step(inWater ? 'water' : k === 'earth' && L.wet > 0.6 ? 'mud' : k, i < 2);
};

/* ---------------- HUD ---------------- */

const mini = $('#mini'), mctx = mini.getContext('2d'), mimg = mctx.createImageData(132, 132);
const FALSE = [[120, 88, 60], [236, 236, 230], [86, 150, 70], [140, 140, 148], [70, 120, 210]];
let hudClock = 0;
function hudUpdate() {
  const L = terrain.layerAt(walker.pos.x, walker.pos.y);
  const names = LAYERS.map((n, i) => [n, L.w[i]]).filter((p) => p[1] >= 0.03).sort((a, b) => b[1] - a[1]);
  $('#under').textContent = names.map(([n, w]) => `${n} ${Math.round(w * 100)} %`).join(' · ') + ` · wet ${Math.round(L.wet * 100)} %` + (L.water > 0 ? ' · puddle' : '');
  if (!S.hud) return;
  const { res, splat, size } = terrain;
  for (let y = 0; y < 132; y++) for (let x = 0; x < 132; x++) {
    const k = (Math.min(res - 1, Math.floor((y + 0.5) / 132 * res)) * res + Math.min(res - 1, Math.floor((x + 0.5) / 132 * res))) * 4, o = (y * 132 + x) * 4;
    let w0 = 1, r = 0, g = 0, b = 0;
    for (let c = 0; c < 4; c++) { const w = splat[k + c] / 255; w0 -= w; r += FALSE[c + 1][0] * w; g += FALSE[c + 1][1] * w; b += FALSE[c + 1][2] * w; }
    w0 = Math.max(0, w0);
    mimg.data[o] = r + FALSE[0][0] * w0; mimg.data[o + 1] = g + FALSE[0][1] * w0; mimg.data[o + 2] = b + FALSE[0][2] * w0; mimg.data[o + 3] = 255;
  }
  mctx.putImageData(mimg, 0, 0);
  mctx.fillStyle = '#fff'; mctx.strokeStyle = '#2a2118'; mctx.lineWidth = 2;
  mctx.beginPath(); mctx.arc((walker.pos.x / size + 0.5) * 132, (walker.pos.y / size + 0.5) * 132, 4, 0, 7); mctx.fill(); mctx.stroke();
}

/* ---------------- stage view ---------------- */

const vTmp = new THREE.Vector3();
const prepLinear = () => { U.uBlendDepth.value = 0; };
const prepBlend = () => { U.uBlendDepth.value = S.blend; };
const views = new Views(renderer);
let simT = 0;
const stageView = views.add(stageEl, {
  scene, camera: orbitCam,
  update(dt, t, rect) {
    walker.active = rect.top < innerHeight * 0.62 && rect.bottom > innerHeight * 0.38;
    paintFrame(dt);
    walker.update(dt, { camera: activeCam(), tank: S.view === 'eye' && walker.mode === 'drive' });
    if (S.view === 'eye') walker.eyeCamera(eyeCam, dt);
    else {
      if (S.tool === 'walk' && walker.moving) {
        vTmp.set(walker.pos.x - controls.target.x, 0, walker.pos.y - controls.target.z).multiplyScalar(Math.min(1, dt * 0.9));
        controls.target.add(vTmp); orbitCam.position.add(vTmp);
      }
      controls.update();
    }
    weather.bind(mat, terrain, t);
    U.uSunCol.value.copy(rig.sun.color).multiplyScalar(rig.sun.intensity * 0.4);
    U.uStone.value.w = lod.band;
    terrain.flush();
    lod.update(walker.pos.x, walker.pos.y); lod.setWet(weather.wet); stones.setWet(weather.wet);
    lodRing.visible = S.ring && lod.radius > 0;
    if (lodRing.visible) { lodRing.position.set(walker.pos.x, walker.y + 0.03, walker.pos.y); lodRing.scale.setScalar(lod.radius); }
    rain.update(t, weather.rain);
    if (eave) eave.update(t, weather.rain);
    if (prints) prints.update(dt, Math.max(weather.wet, terrain.wetFloor));
    if (weather.rain > 0.3 && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) terrain.rakeWear(1);
    if ((hudClock += dt) > 0.1) { hudClock = 0; hudUpdate(); }
  },
  render(r, rect) {
    const cam = activeCam();
    if (splitUI.enabled) renderSplit(r, rect, splitUI.value, [scene, cam, prepLinear], [scene, cam, prepBlend]);
    else { prepBlend(); renderRect(r, rect, scene, cam); }
    prepBlend();
  }
});
ground.stats = () => ({
  grid: `${terrain.seg}×${terrain.seg}`, tris: stageView.stats.tris, draws: stageView.stats.calls, setts: lod.counts.setts, cobbles: lod.counts.cobbles,
  prints: prints.res, cpuMs: +stageView.cpuMs.toFixed(2), fps: Math.round(1000 / meter.frameEma), gpu, jsMs: +meter.jsEma.toFixed(2), tileBuildMs: gallery.tiles.map((t) => +t.built.toFixed(0))
});

walker.load({ scene, renderer, sunDir: rig.sunDir, rig }).then(() => {
  walker.cat?.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  $('#wake').hidden = true; ground.catReady = walker.ready;
});
if (flag('cat') === '0') $('#wake').hidden = true;

/* ---------------- gallery, sources ---------------- */

const gallery = buildGallery({
  mount: $('#gallery'), views, weather, getHour: () => hour, layers, gameTex,
  onPlant: (id) => { loadRecipe(id); stageEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});
$('#srcList').innerHTML = Object.values(SOURCES).map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${l}</a></li>`).join('');

/* ---------------- loop ---------------- */

const meter = new Meter($('#perf'), gpu);
let statClock = 0;
new Loop((dt, t, raw) => {
  const t0 = performance.now();
  weather.update(dt);
  views.render(dt, t);
  const js = performance.now() - t0;
  meter.tick(raw, js, `${quality} · lod ${lod.radius.toFixed(1)} m`);
  gov.tick(dt, raw * 1000);
  if ((statClock += dt) > 0.3) {
    statClock = 0;
    gallery.refreshStats();
    const s = ground.stats();
    $('#stats').textContent = `${s.grid} grid · ${s.tris.toLocaleString()} tris · ${s.draws} draws · stones near the paws: ${s.setts} setts + ${s.cobbles} cobbles · print buffer ${s.prints}² · ${s.cpuMs} ms cpu`;
  }
}).start();

/* ---------------- start state ---------------- */

ground.setRain = (v) => { rainCtl.set(v); weather.setRain(v); };
ground.setHour = setHour;
ground.setView = setView;
ground.setTool = setTool;
ground.renderer = renderer; ground.controls = controls; ground.orbitCam = orbitCam; ground.eyeCam = eyeCam; ground.terrain = terrain; ground.mat = mat; ground.lod = lod; ground.stones = stones; ground.weather = weather; ground.S = S;
setTool('walk');
loadRecipe(flag('recipe', 'sampler'));
applyState({ ...BASE, hudSplat: true, rain: +flag('rain', 0), view: flag('view', 'orbit') === 'eye' ? 'eye' : 'orbit' });
if (flag('step')) { const n = Math.max(1, Math.min(STEPS.length, +flag('step'))); stepper.go(n - 1); }
setQuality(quality);
