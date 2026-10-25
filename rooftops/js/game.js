// game.js — the Roof Road lab: input, the runner, the real cat, the camera,
// the guide cat, the HUD and the finale. See docs/superpowers/specs/
// 2026-10-24-rooftop-road-design.md for the design this plays.
//
// URL flags: ?at=<s>  ?mouth=<1-7>  ?hour=<0-1>  ?finale=1  ?auto=1
//            ?debug=1  ?cat=0  ?shadows=0  ?shot=1  ?nohud=1

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLevel, mouthAt } from './level.js';
import { Runner, PHYS, platOffset, platTop } from './physics.js';
import { Autopilot } from './autopilot.js';
import { buildWorld } from './build.js';
import { Sky } from './sky.js';

const Q = new URLSearchParams(location.search);
const flag = (k, d = null) => (Q.has(k) ? Q.get(k) : d);
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/* ---------------- renderer, scene, camera ---------------- */

const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: flag('shot') === '1' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const shadows = flag('shadows') !== '0';
renderer.shadowMap.enabled = shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 2000);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const level = buildLevel();
const rail = level.rail;
const runner = new Runner(level);
const sky = new Sky(scene, renderer, { shadows });
const world = buildWorld(level);
scene.add(world.root);

// Every standard material, so the room environment can dim with the evening.
const envMats = [];
scene.traverse((o) => {
  const m = o.material;
  if (m && m.isMeshStandardMaterial && !envMats.includes(m)) { envMats.push(m); m.userData.env0 = m.envMapIntensity; }
});

// A few warm lights that follow the cat between the nearest lanterns.
const lightPool = [0, 1, 2, 3].map(() => {
  const l = new THREE.PointLight(0xffa24a, 0, 9, 1.6);
  scene.add(l);
  return l;
});

/* ---------------- the cat (and a stand-in while it is sculpted) ---------------- */

const catRoot = new THREE.Group();
scene.add(catRoot);
const standIn = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.32, 4, 8), new THREE.MeshStandardMaterial({ color: 0xae8450 }));
standIn.rotation.x = Math.PI / 2;
standIn.position.y = 0.17;
catRoot.add(standIn);
let cat = null, catMod = null;

const guideRoot = new THREE.Group();
scene.add(guideRoot);
const guideStandIn = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 4, 8), new THREE.MeshStandardMaterial({ color: 0x9a9a9e }));
guideStandIn.rotation.x = Math.PI / 2;
guideStandIn.position.y = 0.14;
guideRoot.add(guideStandIn);
let guide = null;

async function loadCats() {
  if (flag('cat') === '0') { hideWake(); return; }
  try {
    const mod = await import('../../src/cat.js?v=20261024c');
    await new Promise((r) => setTimeout(r, 60));          // let the page paint first
    cat = new mod.Cat({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 });
    cat.group.position.y = 0.02;
    catRoot.remove(standIn);
    catRoot.add(cat.group);
    catMod = mod;
    // Chidori: the same sculpt (cached), a smaller grey-and-white coat.
    guide = new mod.Cat({ fur: 0x8f9095, belly: 0xf3f1ec, accent: 0x55575e, eyeColor: 0x9fd0a8, stripeAmount: 0.55, ribbonColor: 0x3a6fa8 });
    guide.group.scale.setScalar(0.86);
    guide.group.position.y = 0.02;
    guideRoot.remove(guideStandIn);
    guideRoot.add(guide.group);
    mod.catRimUniforms.uRimStrength.value = 0.35;
  } catch (e) {
    console.error('cat failed to load', e);
  }
  hideWake();
}
function hideWake() { const w = $('wake'); if (w) w.classList.add('gone'); }

/* ---------------- audio: a few soft synthesized sounds ---------------- */

const audio = {
  ctx: null, muted: false,
  ensure() {
    if (this.ctx || this.muted) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
  },
  chime(freq, dur = 1.6, gain = 0.06) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime;
    for (const [mul, g] of [[1, gain], [2.01, gain * 0.35], [3.0, gain * 0.12]]) {
      const o = c.createOscillator(), v = c.createGain();
      o.type = 'sine'; o.frequency.value = freq * mul;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(v).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    }
  },
  noise(dur, freq, gain) {
    const c = this.ctx; if (!c || this.muted) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; v.gain.value = gain;
    src.connect(f).connect(v).connect(c.destination); src.start();
  },
  pat() { this.noise(0.06, 900, 0.05); },
  splash() { this.noise(0.35, 1400, 0.12); },
  bounce() { this.noise(0.12, 300, 0.12); }
};
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

/* ---------------- input ---------------- */

const keys = new Set();
const press = { jump: false, down: false, jumpUp: false };
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'sprint', ShiftRight: 'sprint'
};
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  audio.ensure();
  const k = KEYMAP[e.code];
  if (k) {
    if (!keys.has(k)) { if (k === 'jump') press.jump = true; if (k === 'down') press.down = true; }
    keys.add(k);
    e.preventDefault();
    noteMoved();
  } else if (e.code === 'KeyR') respawn();
  else if (e.code === 'KeyH') toggleGuidance();
  else if (e.code === 'KeyM') { audio.muted = !audio.muted; toast(audio.muted ? 'Sound off' : 'Sound on'); }
  else if (e.code === 'KeyN' && Q.has('debug')) jumpToMouth(Math.min(7, currentMouth.id + 1));
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) { keys.delete(k); if (k === 'jump') press.jumpUp = true; }
});
addEventListener('blur', () => keys.clear());

// Touch: left half is a horizontal stick, buttons on the right.
const touch = { id: null, x0: 0, x: 0 };
const pad = $('pad');
if (pad) {
  pad.addEventListener('pointerdown', (e) => { audio.ensure(); touch.id = e.pointerId; touch.x0 = touch.x = e.clientX; pad.setPointerCapture(e.pointerId); noteMoved(); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === touch.id) touch.x = e.clientX; });
  const end = (e) => { if (e.pointerId === touch.id) { touch.id = null; touch.x = touch.x0; } };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}
const holdBtn = (id, key) => {
  const b = $(id);
  if (!b) return;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); audio.ensure(); if (!keys.has(key)) press[key] = true; keys.add(key); });
  const up = () => { keys.delete(key); if (key === 'jump') press.jumpUp = true; };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
};
holdBtn('btn-jump', 'jump');
holdBtn('btn-down', 'down');

function readInput() {
  let move = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  let sprint = keys.has('sprint');
  if (touch.id !== null) {
    const dx = (touch.x - touch.x0) / 70;
    move = clamp(dx, -1, 1);
    if (Math.abs(move) < 0.15) move = 0;
    sprint = Math.abs(dx) > 1.6;
  }
  const inp = {
    move, sprint,
    jumpHeld: keys.has('jump'), jumpPressed: press.jump, jumpReleased: press.jumpUp,
    downHeld: keys.has('down'), downPressed: press.down
  };
  press.jump = press.down = press.jumpUp = false;
  return inp;
}

/* ---------------- HUD ---------------- */

const hud = { hidden: flag('nohud') === '1', moved: false, hintT: 0 };
if (hud.hidden) document.body.classList.add('nohud');
function toggleGuidance() { document.body.classList.toggle('noguide'); }
function noteMoved() { if (!hud.moved) { hud.moved = true; hud.hintT = 6; } }

let toastT = 0;
function toast(text, secs = 3.2) {
  const t = $('toast'); if (!t) return;
  t.textContent = text; t.classList.add('show'); toastT = secs;
}

let cardT = 0;
function showCard(m) {
  const c = $('card'); if (!c) return;
  c.querySelector('.k').textContent = m.kanji;
  c.querySelector('.r').textContent = m.romaji;
  c.querySelector('.t').textContent = m.title;
  c.querySelector('.n').textContent = m.note;
  c.classList.add('show');
  cardT = 4.2;
}

const strip = $('strip');
if (strip) {
  strip.innerHTML = level.mouths.map((m) => `<li data-m="${m.id}" title="${m.romaji} — ${m.title}"><span>${m.kanji}</span></li>`).join('');
}
function updateStrip() {
  if (!strip) return;
  for (const li of strip.children) {
    const id = +li.dataset.m;
    li.classList.toggle('seen', seenMouths.has(id));
    li.classList.toggle('here', id === currentMouth.id);
  }
  const sc = $('shoki-count');
  if (sc) sc.textContent = `${greeted.size}/7`;
}

/* ---------------- state ---------------- */

let time = 0;
let currentMouth = level.mouths[0];
const seenMouths = new Set();
const greeted = new Set();
let lastCheckpoint = level.checkpoints[0];
let finale = null;
let autopilot = flag('auto') === '1' ? new Autopilot(level) : null;

// Visual state for the cat.
const vis = { depth: 0, phi: 0, catY: 0, landT: 0 };
// The camera rig.
const cam = { s: 0, y: 2, dist: 8.2, fov: 34, n: { x: 0, z: 1 }, init: false };

function startAt(s, y) {
  runner.reset(s, y + 0.4);
  vis.depth = runner.depth;
  cam.init = false;
}

function jumpToMouth(id) {
  const cp = level.checkpoints.find((c) => c.mouth === id) || level.checkpoints[0];
  lastCheckpoint = cp;
  startAt(cp.s, cp.y);
}

function respawn() {
  if (finale) return;
  startAt(lastCheckpoint.s, lastCheckpoint.y);
  toast('Back to the last lantern.', 1.6);
}

/* ---------------- Chidori, the guide cat ---------------- */

const chidori = { idx: 0, from: null, to: null, t: 0, dur: 0, pos: new THREE.Vector3(), heading: 0, hopping: false, sitT: 0 };
function perchWorld(p, out) {
  const xz = rail.place(p.s, p.d);
  return out.set(xz.x, p.y, xz.z);
}
function initChidori() {
  const p = level.perches[0];
  perchWorld(p, chidori.pos);
  chidori.idx = 0;
}
function updateChidori(dt) {
  const P = level.perches;
  const here = P[chidori.idx];
  if (!chidori.hopping && here) {
    const near = Math.abs(runner.s - here.s) < 2.6 && runner.y > here.y - 2.6;
    const passed = runner.s > here.s + 0.5;
    let next = chidori.idx + 1;
    // Never run off to a perch behind the player; skip ones already passed.
    while (next < P.length - 1 && P[next].s < runner.s + 1.0) next++;
    if ((near || passed) && next < P.length && (!finale || next === P.length - 1)) {
      chidori.from = chidori.pos.clone();
      chidori.to = perchWorld(P[next], new THREE.Vector3());
      const dist = chidori.from.distanceTo(chidori.to);
      chidori.dur = clamp(dist / 5.5, 0.45, 1.5);
      chidori.t = 0;
      chidori.peak = Math.max(0.5, chidori.to.y - chidori.from.y + 0.6, dist * 0.12);
      chidori.hopping = true;
      chidori.idx = next;
      if (guide) guide.onJump();
    }
  }
  let speed = 0, grounded = true;
  if (chidori.hopping) {
    chidori.t += dt / chidori.dur;
    const u = Math.min(1, chidori.t);
    chidori.pos.lerpVectors(chidori.from, chidori.to, u);
    const base = chidori.from.y + (chidori.to.y - chidori.from.y) * u;
    chidori.pos.y = base + 4 * chidori.peak * u * (1 - u);
    const dx = chidori.to.x - chidori.from.x, dz = chidori.to.z - chidori.from.z;
    if (dx * dx + dz * dz > 1e-4) chidori.heading = Math.atan2(dx, dz);
    speed = 4; grounded = false;
    if (u >= 1) { chidori.hopping = false; chidori.sitT = 0; if (guide) guide.onLand(); }
  } else {
    chidori.sitT += dt;
    // Turn to watch Michi coming.
    const cp = catRoot.position;
    const want = Math.atan2(cp.x - chidori.pos.x, cp.z - chidori.pos.z);
    let d = want - chidori.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    chidori.heading += d * Math.min(1, dt * 3);
    if (guide && chidori.sitT > 1.2 && !guide.idleAction) guide.startIdleAction('sit', 600);
  }
  guideRoot.position.copy(chidori.pos);
  guideRoot.rotation.y = chidori.heading;
  if (guide) {
    if (chidori.hopping && guide.idleAction) guide.endIdleAction();
    guide.update(dt, speed, grounded, false, false, false, null);
  }
}

/* ---------------- pickups, checkpoints, mouths ---------------- */

function checkPickups() {
  for (const obj of [...world.dynamic.shoki, ...world.dynamic.treats]) {
    const k = obj.userData.pickup;
    if (obj.userData.done) continue;
    if (Math.abs(runner.s - k.s) > 0.6 || Math.abs(runner.y - k.y) > 0.8) continue;
    obj.userData.done = true;
    if (k.kind === 'shoki') {
      greeted.add(k.id);
      for (const ch of obj.children) ch.material = world.M.clayLit || (world.M.clayLit = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.7, emissive: 0x5a3a14, emissiveIntensity: 0.55 }));
      audio.chime(PENTA[(k.id - 1) % PENTA.length], 2.2, 0.07);
      toast(greeted.size === 7 ? 'Seven Shōki greeted. The roofs are well guarded.' : `A Shōki keeps watch here. (${greeted.size}/7)`);
      if (cat) cat.setMood('curious', 1.2, 2);
    } else {
      obj.visible = false;
      audio.chime(659.25, 1.0, 0.05);
      toast(k.label[0].toUpperCase() + k.label.slice(1) + '.', 3.6);
      if (cat) cat.startIdleAction('groom', 2.4);
    }
    updateStrip();
  }
}

function checkProgress() {
  if (runner.grounded) {
    for (const cp of level.checkpoints) {
      if (cp.mouth > lastCheckpoint.mouth && runner.s >= cp.s - 0.6 && runner.y >= cp.y - 0.6) lastCheckpoint = cp;
    }
  }
  const m = mouthAt(level, runner.s, runner.y);
  if (m !== currentMouth) {
    currentMouth = m;
    if (!seenMouths.has(m.id)) {
      seenMouths.add(m.id);
      showCard(m);
      audio.chime(PENTA[m.id - 1] * 0.5, 2.6, 0.05);
    }
    updateStrip();
  }
  if (!finale && runner.grounded && runner.ground.kind === 'perch') startFinale();
}

/* ---------------- the finale ---------------- */

function startFinale() {
  finale = { t: 0, lit: 0, shown: false };
  seenMouths.add(7);
  showCard(level.mouths[6]);
  updateStrip();
  if (cat) { cat.startIdleAction('sit', 9999); cat.setLookTarget(null); }
  // Chidori comes to the float roof beside the perch.
  const last = level.perches.length - 1;
  if (chidori.idx !== last) {
    chidori.from = chidori.pos.clone();
    chidori.to = perchWorld(level.perches[last], new THREE.Vector3());
    chidori.dur = 1.2; chidori.t = 0; chidori.peak = 1; chidori.hopping = true; chidori.idx = last;
  }
}

function updateFinale(dt) {
  finale.t += dt;
  const t = finale.t;
  // Fires: Daimonji first, then right to left, ~1.6 s apart.
  const due = Math.floor((t - 3.0) / 1.6) + 1;
  while (finale.lit < Math.min(5, due)) {
    sky.lightFire(finale.lit);
    audio.chime([196.0, 220.0, 246.94, 293.66, 329.63][finale.lit], 3.5, 0.06);
    finale.lit++;
  }
  if (!finale.shown && t > 13.5) {
    finale.shown = true;
    const f = $('finale');
    if (f) {
      f.querySelector('.count').textContent = `${greeted.size} of 7 Shōki greeted`;
      f.classList.add('show');
    }
  }
}

$('again') && $('again').addEventListener('click', () => {
  $('finale').classList.remove('show');
  finale = null;
  sky.resetFires();
  if (cat) cat.endIdleAction();
  seenMouths.clear();
  lastCheckpoint = level.checkpoints[0];
  initChidori();
  startAt(level.checkpoints[0].s, level.checkpoints[0].y);
  if (autopilot) autopilot = new Autopilot(level);
});
$('stay') && $('stay').addEventListener('click', () => $('finale').classList.remove('show'));

/* ---------------- debug: the platform lines ---------------- */

if (flag('debug') === '1') {
  const col = { street: 0x777777, water: 0x3a8acc, ridge: 0xff7744, eave: 0xffbb44, roof: 0xff5533, deck: 0x55dd88, rope: 0xdd55dd, branch: 0xee88cc, canopy: 0x44dddd, futon: 0xffff44, boat: 0x4488ff, cap: 0xffffff, step: 0xaaaaaa, rack: 0xffaa88, perch: 0xff2222 };
  const pos = [], cols = [];
  const c = new THREE.Color();
  for (const p of level.platforms) {
    if (p.move) continue;
    const a = rail.place(p.s0, p.d), b = rail.place(p.s1, p.d);
    pos.push(a.x, p.y0 + 0.03, a.z, b.x, p.y1 + 0.03, b.z);
    c.setHex(p.route !== undefined ? 0xff0000 : (col[p.kind] || 0xffffff));
    cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  for (const w of level.walls) {
    const a = rail.place(w.s, (w.d0 + w.d1) / 2);
    pos.push(a.x, w.y0, a.z, a.x, w.y1, a.z);
    cols.push(0.3, 0.3, 1, 0.3, 0.3, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, fog: false }));
  lines.renderOrder = 10;
  scene.add(lines);
}

/* ---------------- per-frame ---------------- */

const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
const STEP = 1 / 120;
let acc = 0, lastNow = performance.now();
let lastPhase = -1, envScale = 1;
const fixedHour = flag('hour') !== null ? clamp(parseFloat(flag('hour')), 0, 1) : null;
let fpsT = 0, fpsN = 0, governed = false;

function stepPhysics(inp) {
  const prevGrounded = runner.grounded;
  runner.step(STEP, inp, time);
  const ev = runner.events;
  if (ev.includes('jump')) { if (cat) cat.onJump(); }
  if (ev.includes('bounce')) { if (cat) cat.onJump(); audio.bounce(); }
  if (ev.includes('land') || ev.includes('mantle')) {
    if (cat && !prevGrounded) cat.onLand();
    audio.pat();
  }
  if (ev.includes('splash')) { audio.splash(); if (cat) cat.onLand(); }
  time += STEP;
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  if (flag('shot') === '1') dt = Math.min(dt, 1 / 30);

  // Input → fixed physics steps.
  let inp = readInput();
  if (finale) inp = { move: 0 };
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 24) {
    let use = inp;
    if (autopilot && !finale) use = autopilot.input(runner, time, STEP);
    stepPhysics(use);
    // Only the first sub-step sees the edge presses.
    inp = { ...inp, jumpPressed: false, downPressed: false, jumpReleased: false };
    acc -= STEP;
    steps++;
  }

  // Sky by progress along the route (or forced by ?hour, or night at the finale).
  const prog = finale ? 1 : (fixedHour !== null ? fixedHour : clamp(runner.s / level.length, 0, 1));
  if (Math.abs(prog - lastPhase) > 0.002) {
    const night = sky.setPhase(prog);
    lastPhase = prog;
    envScale = 1 - 0.75 * night;
    for (const m of envMats) m.envMapIntensity = (m.userData.env0 ?? 1) * envScale;
  }
  const night = sky.night;
  world.update(time, night, platOffset, level.platforms);

  // Where the cat is drawn: depth eases toward what it stands on (or will land on).
  let targetD = runner.depth;
  if (!runner.grounded) {
    const below = runner.support(runner.s, runner.y, 0, 40);
    if (below) targetD = below.d;
  }
  vis.depth = damp(vis.depth, targetD, runner.grounded ? 10 : 5, dt);
  const p = rail.place(runner.s, vis.depth);
  catRoot.position.set(p.x, runner.y, p.z);
  // Facing: φ = 0 along +s, π along −s, turning through the camera side.
  const goal = runner.facing > 0 ? 0 : Math.PI;
  const turning = Math.abs(vis.phi - goal) > 0.3;
  vis.phi = damp(vis.phi, goal, 11, dt);
  const t = rail.tangentAt(runner.s);
  const n = { x: -t.z, z: t.x };
  const dir = { x: t.x * Math.cos(vis.phi) + n.x * Math.sin(vis.phi), z: t.z * Math.cos(vis.phi) + n.z * Math.sin(vis.phi) };
  if (finale) {
    // Sit facing the hills, back to the camera, like the summit's overlook.
    const f = sky.fires[1].center;
    let want = Math.atan2(f.x - catRoot.position.x, f.z - catRoot.position.z);
    let d = want - catRoot.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    catRoot.rotation.y += d * Math.min(1, dt * 2.5);
  } else {
    catRoot.rotation.y = Math.atan2(dir.x, dir.z);
  }
  // Lean with slopes along s.
  let pitch = 0;
  if (runner.grounded && runner.ground.y1 !== runner.ground.y0) {
    const g = runner.ground;
    pitch = -Math.atan2(g.y1 - g.y0, g.s1 - g.s0) * Math.cos(vis.phi);
  }
  catRoot.rotation.x = damp(catRoot.rotation.x, 0, 10, dt);
  if (cat) {
    cat.group.rotation.x = damp(cat.group.rotation.x, pitch, 10, dt);
    cat.setProwling(runner.onRope);
    const speed = Math.abs(runner.vs);
    cat.update(dt, speed, runner.grounded, runner.sprinting && speed > 4.5, turning && speed < 0.6, runner.inWater, null);
    const sup = runner.grounded ? null : runner.support(runner.s, runner.y, 0, 40);
    cat.updateShadow(sup ? Math.max(0, runner.y - platTop(sup, runner.s, time)) : 0);
    // Peer over a ledge the guard stopped us at.
    if (runner.peering && !finale) {
      const ahead = rail.place(runner.s + runner.facing * 0.8, vis.depth);
      cat.setLookTarget(tmpL.set(ahead.x, runner.y - 1.5, ahead.z));
    } else if (!finale) cat.setLookTarget(null);
    catMod.catRimUniforms.uRimDir.value.copy(sky.lightDir);
  }

  updateChidori(dt);
  if (!finale) { checkPickups(); checkProgress(); }
  else updateFinale(dt);

  // Lantern light pool: nearest anchors to the cat.
  if (night > 0.05) {
    const near = world.lights.map((v) => [v, v.distanceToSquared(catRoot.position)]).sort((a, b) => a[1] - b[1]).slice(0, lightPool.length);
    lightPool.forEach((l, i) => {
      const e = near[i];
      if (!e || e[1] > 30 * 30) { l.intensity = 0; return; }
      l.position.copy(e[0]);
      l.intensity = 2.2 * night;
    });
  } else lightPool.forEach((l) => { l.intensity = 0; });

  updateCamera(dt);
  sky.update(dt, time, catRoot.position);

  // HUD timers.
  if (cardT > 0) { cardT -= dt; if (cardT <= 0) $('card').classList.remove('show'); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (hud.moved && hud.hintT > 0) { hud.hintT -= dt; if (hud.hintT <= 0) $('hint').classList.add('gone'); }

  // A light governor: drop resolution, then shadows, if the frame rate sags.
  fpsT += dt; fpsN++;
  if (fpsT > 4 && !governed && flag('shot') !== '1') {
    const fps = fpsN / fpsT;
    if (fps < 36) {
      renderer.setPixelRatio(1);
      if (fps < 24) { renderer.shadowMap.enabled = false; sky.sun.castShadow = false; }
      governed = true;
    }
    fpsT = 0; fpsN = 0;
  }

  renderer.render(scene, camera);
}

function updateCamera(dt) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
  }
  camera.aspect = w / Math.max(1, h);

  if (finale) {
    // Pull back behind the cat and turn toward the hills and the fires.
    // Three-quarter from behind, low, so the cat sits against the fires and
    // the shingi pole stays off to one side.
    const k = smooth(0, 4.5, finale.t);
    const c = catRoot.position;
    const want = tmpV.set(c.x - 5.2, c.y + 0.7, c.z + 3.6);
    camera.position.lerp(want, 1 - Math.exp(-(reduceMotion ? 1.2 : 2.2) * dt * (0.3 + k)));
    const look = tmpL.set(c.x + 40, c.y + 2.0 + 4 * k, c.z - 9);
    camera.lookAt(look);
    camera.fov = damp(camera.fov, 50, 1.5, dt);
    camera.updateProjectionMatrix();
    return;
  }

  // Side-on rig: look ahead the way the cat faces, softened round corners.
  const vertical = smooth(311, 316, runner.s) * (1 - smooth(323, 327, runner.s));
  const lookAhead = 1.3 * runner.facing * (1 - vertical);
  const sTarget = runner.s + lookAhead;
  const yTarget = runner.y + 0.7 + vertical * 0.6;
  if (!cam.init) { cam.s = sTarget; cam.y = yTarget; cam.init = true; }
  const rate = reduceMotion ? 2.2 : 3.6;
  cam.s = damp(cam.s, sTarget, rate, dt);
  cam.y = damp(cam.y, yTarget, runner.vy < -4 ? 6 : 3.2, dt);
  cam.dist = damp(cam.dist, 9.4 + vertical * 3.0, 2, dt);
  const nrm = rail.smoothNormalAt(clamp(cam.s, 0, level.length), 5, cam.n);
  const base = rail.place(clamp(cam.s, 0, level.length), vis.depth * 0.6);
  // A flat, side-on view just above the cat: roof lines read as the
  // platforms, the gaps between houses as notches in the skyline.
  camera.position.set(base.x + nrm.x * cam.dist, cam.y + 0.55 + vertical * 1.2, base.z + nrm.z * cam.dist);
  const look = rail.place(clamp(cam.s, 0, level.length), vis.depth);
  camera.lookAt(look.x, cam.y - 0.15 + vertical * 0.2, look.z);
  camera.fov = damp(camera.fov, 34 + vertical * 6, 2, dt);
  camera.updateProjectionMatrix();
}

/* ---------------- start ---------------- */

function start() {
  initChidori();
  if (flag('finale') === '1') {
    const perch = level.platforms.find((p) => p.kind === 'perch');
    startAt((perch.s0 + perch.s1) / 2, perch.y0);
    lastCheckpoint = level.checkpoints[6];
  } else if (flag('at') !== null) {
    const s = clamp(parseFloat(flag('at')), 0.5, level.length - 0.5);
    const sup = runner.support(s, 20, 0, 40);
    startAt(s, sup ? platTop(sup, s) : 0);
  } else if (flag('mouth') !== null) {
    jumpToMouth(clamp(parseInt(flag('mouth'), 10) || 1, 1, 7));
  } else {
    startAt(1.0, 1.1);
  }
  // Put Chidori just ahead of wherever we start.
  while (chidori.idx < level.perches.length - 1 && level.perches[chidori.idx].s < runner.s + 1.0) chidori.idx++;
  perchWorld(level.perches[chidori.idx], chidori.pos);
  currentMouth = mouthAt(level, runner.s, runner.y);
  seenMouths.add(currentMouth.id);
  if (flag('nohud') !== '1') showCard(currentMouth);
  updateStrip();
  requestAnimationFrame((t) => { lastNow = t; frame(t); });
  loadCats();
}

// Expose a little for headless captures and the console.
window.roofRoad = {
  level, runner, sky, world, PHYS, jumpToMouth,
  get finale() { return finale; },
  get catReady() { return !!cat || flag('cat') === '0'; },
  /** Stand the cat on the highest surface at route position s. */
  at(s) {
    const sup = runner.support(s, 20, 0, 40);
    startAt(s, sup ? platTop(sup, s) : 0);
  },
  /** Jump to the end of the finale: all five fires burning, the card up. */
  skipFinale() {
    if (!finale) {
      const perch = level.platforms.find((p) => p.kind === 'perch');
      startAt((perch.s0 + perch.s1) / 2, perch.y0);
      startFinale();
    }
    finale.t = 14;
    finale.lit = 5;
    sky.fires.forEach((f, i) => { sky.lightFire(i); f.kindle = 1; });
  }
};
start();
