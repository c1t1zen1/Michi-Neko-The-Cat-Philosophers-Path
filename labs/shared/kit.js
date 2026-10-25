// Kit check: every shared module on one page (see kit.html).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, Views, Loop, Meter, Governor, renderSplit, renderRect, flag } from './stage.js';
import { LightRig } from './light.js';
import { CatWalker } from './catwalk.js';
import { Dropdown, seg, slider, toggle, Stepper, Split, Callouts } from './ui.js';
import { HASH, NOISE, WARP } from './glsl.js';

const $ = (s) => document.querySelector(s);
const kit = window.__kit = { catReady: false, steps: 0 };

const { renderer, gpu } = createRenderer($('#gl'), { shadows: true });
const stageEl = $('#stage');
const views = new Views(renderer);

/* ---------------- stage scene ---------------- */

const scene = new THREE.Scene();
const rig = new LightRig(scene, { hour: +flag('hour', 10.5), shadows: false, shadowSize: 8 });
const fog = scene.fog;
fog.density = 0.03;
scene.fog = null;

const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x7c9a5a, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
const grid = new THREE.GridHelper(10, 10, 0x5c7a40, 0x6a8a4c);
grid.position.y = 0.004;
scene.add(ground, grid);

const BOXES = [
  { id: 'pillar', x: -2.2, z: -1.6, w: 1, h: 2.4, d: 1, color: 0xc9a27a, title: 'Pillar', sub: '柱' },
  { id: 'bench', x: 2.4, z: 1.2, w: 2.2, h: 0.8, d: 0.9, color: 0x9b6b4a, title: 'Bench', sub: '縁台' },
  { id: 'crate', x: 1.4, z: -2.6, w: 0.9, h: 0.9, d: 0.9, color: 0xb98a5e, title: 'Crate', sub: '箱' }
];
for (const b of BOXES) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.85 }));
  m.position.set(b.x, b.h / 2, b.z);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}
const blocked = (x, z) => BOXES.some((b) => Math.abs(x - b.x) < b.w / 2 + 0.3 && Math.abs(z - b.z) < b.d / 2 + 0.3);

const orbitCam = new THREE.PerspectiveCamera(42, 2, 0.05, 1000);
orbitCam.position.set(7.5, 5.5, 8.5);
const eyeCam = new THREE.PerspectiveCamera(60, 2, 0.04, 1000);
const state = { view: 'orbit', mode: 'drive' };
const activeCam = () => (state.view === 'orbit' ? orbitCam : eyeCam);
const controls = new OrbitControls(orbitCam, stageEl);
controls.target.set(0, 0.4, 0);
controls.enableDamping = true;
controls.maxPolarAngle = 1.45;
controls.minDistance = 3;
controls.maxDistance = 22;

const walker = new CatWalker({
  parent: scene, dom: stageEl, camera: activeCam, ground,
  bounds: { x0: -4.6, x1: 4.6, z0: -4.6, z1: 4.6 }, blocked, start: { x: 0, z: 2.4, heading: Math.PI }
});
kit.walker = walker;
kit.rig = rig;

/* footprints: paw onStep events */
const prints = Array.from({ length: 48 }, () => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), new THREE.MeshBasicMaterial({ color: 0x2a1c10, transparent: true, depthWrite: false, opacity: 0 }));
  m.rotation.x = -Math.PI / 2;
  m.userData.life = 0;
  scene.add(m);
  return m;
});
let printI = 0;
walker.onStep = (i, x, z) => {
  const m = prints[printI++ % prints.length];
  m.position.set(x, 0.012, z);
  m.userData.life = 1;
  kit.steps++;
};

/* callouts, split */
const callouts = new Callouts(stageEl);
callouts.set(BOXES.map((b) => ({ id: b.id, pos: new THREE.Vector3(b.x, b.h + 0.05, b.z), title: b.title, sub: b.sub })));
const split = new Split(stageEl, { left: 'Flat normals', right: 'Lit', value: 0.5 });
const flat = new THREE.MeshNormalMaterial();
const prepFlat = () => { scene.overrideMaterial = flat; scene.background = new THREE.Color(0xe8e8e8); if (rig.dome) rig.dome.visible = false; };
const prepLit = () => { scene.overrideMaterial = null; scene.background = null; if (rig.dome) rig.dome.visible = true; };

views.add(stageEl, {
  scene,
  camera: orbitCam,
  update(dt, t, rect) {
    walker.active = rect.top < innerHeight * 0.62 && rect.bottom > innerHeight * 0.38;
    walker.update(dt, { camera: activeCam(), tank: state.view === 'eye' });
    if (state.view === 'eye') walker.eyeCamera(eyeCam, dt); else controls.update();
    callouts.update(activeCam(), rect);
    for (const m of prints) {
      const u = m.userData;
      if (u.life > 0) { u.life = Math.max(0, u.life - dt / 3); m.material.opacity = u.life * 0.6; }
    }
    $('#hudTop').textContent = `${walker.mode} · ${walker.moving ? 'moving' : 'still'} · paw events ${kit.steps} · hour ${rig.hour.toFixed(1)}`;
  },
  render(r, rect) {
    const cam = activeCam();
    if (split.enabled) {
      renderSplit(r, rect, split.value, [scene, cam, prepFlat], [scene, cam, prepLit]);
      prepLit();
    } else renderRect(r, rect, scene, cam);
  }
});

walker.load({ scene, renderer, sunDir: rig.sunDir }).then(() => {
  walker.cat?.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  $('#wake').hidden = true;
  kit.catReady = walker.ready;
});
if (flag('cat') === '0') $('#wake').hidden = true;

/* ---------------- controls ---------------- */

const c1 = $('#c1'), c2 = $('#c2');
const hourCtl = slider(c1, { label: 'Hour', min: 0, max: 24, step: 0.1, value: rig.hour, fmt: (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`, onInput: (h) => rig.setHour(h) });
const setHour = (h) => { rig.setHour(h); hourCtl.set(h); };
kit.setHour = setHour;
seg(c1, [{ v: 10.5, label: 'Day' }, { v: 17.8, label: 'Golden' }, { v: 22.5, label: 'Night' }], null, setHour);

seg(c2, [{ v: 'drive', label: 'Walk' }, { v: 'wander', label: 'Wander' }], 'drive', (m) => { state.mode = m; walker.setMode(m); });
seg(c2, [{ v: 'orbit', label: 'Iso / orbit' }, { v: 'eye', label: 'Cat-eye' }], 'orbit', (v) => {
  state.view = v;
  walker.eyeInit = false;
  controls.enabled = v === 'orbit';
});
toggle(c2, { label: 'Prowl', onChange: (b) => walker.setProwl(b) });
toggle(c2, { label: 'Split view', onChange: (b) => { split.enabled = b; } });
toggle(c2, { label: 'Callouts', value: true, onChange: (b) => { callouts.visible = b; } });
if (flag('split')) { split.enabled = true; }

new Stepper($('#steps'), {
  steps: [
    { key: 'flat', title: 'No shadows', body: '<p>Direct light and a hemisphere fill only: the boxes float on the ground with nothing to anchor them.</p>' },
    { key: 'shadows', title: 'Shadows', body: '<p>The sun casts a 2048 px PCF shadow map over a ±8 m box, with a small normal bias to stop acne.</p>', code: 'sun.castShadow = true;\nsun.shadow.mapSize.set(2048, 2048);\nsun.shadow.normalBias = 0.02;' },
    { key: 'fog', title: 'Shadows and fog', body: '<p>Exponential fog tinted from the sky horizon pushes distance back and sits the cat in the air.</p>', code: 'scene.fog = new THREE.FogExp2(palette.fog, 0.03);' }
  ],
  onStep(i) {
    rig.sun.castShadow = i >= 1;
    scene.fog = i >= 2 ? fog : null;
    rig.setHour(rig.hour);
  }
});

/* ---------------- GLSL tiles ---------------- */

const SCHEMES = [
  { value: 'moss', label: 'Moss', a: 0x1f3a28, b: 0xcfe08a },
  { value: 'sunset', label: 'Sunset', a: 0x3b2a5a, b: 0xffb27a },
  { value: 'ink', label: 'Ink', a: 0x0e1a24, b: 0xbfe6e0 },
  { value: 'peach', label: 'Peach', a: 0xe96d6d, b: 0xfff0d6 }
];
const uniforms = { uTime: { value: 0 }, uA: { value: new THREE.Color(SCHEMES[0].a) }, uB: { value: new THREE.Color(SCHEMES[0].b) } };
new Dropdown($('#slot-scheme'), {
  items: SCHEMES.map((s) => ({ value: s.value, label: s.label })), value: 'moss', label: 'Colour scheme',
  onChange: (v) => { const s = SCHEMES.find((x) => x.value === v); uniforms.uA.value.set(s.a); uniforms.uB.value.set(s.b); }
});

const TILES = [
  { title: 'Hash & value noise', tag: 'hash12 · hash11 · hash33 · vnoise2', expr: 'v = mix(hash12(cell), hash33(vec3(cell, floor(uTime))).x, 0.3); v = mix(v, hash11(cell.x * 17. + cell.y), 0.2); v = mix(v, vnoise2(p * 1.5 + uTime * 0.2), 0.5);', pre: 'vec2 cell = floor(p * 2.);' },
  { title: 'Gradient fbm', tag: 'gnoise2 · fbm2', expr: 'v = fbm2(p + gnoise2(p * 2.) * 0.6, 5);', pre: '' },
  { title: 'Voronoi', tag: 'voronoi2', expr: 'vec3 w = voronoi2(p * 1.2); v = clamp((w.y - w.x) * 1.6, 0., 1.) * 0.7 + w.z * 0.3;', pre: '' },
  { title: 'Domain warp', tag: 'domainWarp2', expr: 'v = fbm2(domainWarp2(p + uTime * 0.05, 1.2), 5);', pre: '' }
];
const FRAG = (t) => `${HASH}${NOISE}${WARP}
uniform float uTime; uniform vec3 uA, uB; varying vec2 vUv; varying vec3 vN;
void main() {
  vec2 p = vUv * vec2(8., 4.);
  float v;
  ${t.pre}
  ${t.expr}
  vec3 c = mix(uA, uB, clamp(v, 0., 1.));
  c *= 0.62 + 0.45 * max(dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.5))), 0.);
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;
const VERT = 'varying vec2 vUv; varying vec3 vN; void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';

$('#variants').innerHTML = TILES.map((t, i) => `<article class="tile"><div class="view" data-i="${i}"></div><h3 class="name">${t.title}</h3><p class="tag">${t.tag}</p>
  <dl class="stats"><div><dd class="s-calls">–</dd><dt>draws</dt></div><div><dd class="s-tris">–</dd><dt>tris</dt></div><div><dd class="s-cpu">–</dd><dt>ms cpu</dt></div></dl></article>`).join('');
const tileViews = [...document.querySelectorAll('.view')].map((el) => {
  const t = TILES[+el.dataset.i];
  return views.add(el, {
    build() {
      const s = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
      cam.position.set(0, 0.2, 4.2);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 32), new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG(t) }));
      s.add(mesh);
      return { scene: s, camera: cam, update: (dt) => { mesh.rotation.y += dt * 0.3; } };
    }
  });
});

/* ---------------- loop ---------------- */

const meter = new Meter($('#perf'), gpu);
const basePR = renderer.getPixelRatio();
const setPR = (pr) => { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); };
const gov = new Governor({ onScale: (s) => setPR(basePR * (0.5 + 0.5 * s)), onPixelRatio: setPR });
let statClock = 0;
new Loop((dt, t, raw) => {
  const t0 = performance.now();
  uniforms.uTime.value = t;
  views.render(dt, t);
  const js = performance.now() - t0;
  meter.tick(raw, js, `${views.views.filter((v) => v.built).length}/${views.views.length} views`);
  gov.tick(dt, raw * 1000);
  statClock += dt;
  if (statClock > 0.25) {
    statClock = 0;
    tileViews.forEach((v, i) => {
      if (!v.built) return;
      const a = document.querySelectorAll('.tile')[i];
      a.querySelector('.s-calls').textContent = v.stats.calls;
      a.querySelector('.s-tris').textContent = v.stats.tris;
      a.querySelector('.s-cpu').textContent = v.cpuMs.toFixed(2);
    });
  }
}).start();
