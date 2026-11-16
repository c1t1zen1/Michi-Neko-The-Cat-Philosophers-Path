// game.js — the Roof Road lab: input, the runner, the real cat, the camera,
// the guide cat, the HUD and the finale. See docs/superpowers/specs/
// 2026-10-24-rooftop-road-design.md for the design this plays.
//
// URL flags: ?at=<s>  ?mouth=<1-7>  ?hour=<0-1>  ?finale=1  ?auto=1
//            ?debug=1  ?cat=0  ?shadows=0  ?shot=1  ?nohud=1

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLevel, mouthAt } from './level.js';
import { Runner, PHYS, platTop } from './physics.js';
import { Autopilot } from './autopilot.js';
import { buildWorld } from './build.js';
import { Sky } from './sky.js';
import { RooftopAtmosphere } from './atmosphere.js';
import { alleyEntrance } from './alleys.js';
import { Companion } from './companion.js';
import { neighbourhoodMap } from './neighbourhood-map.js';
import { RunView } from './runview.js';
import { AssetRuntime } from '../../src/kit/runtime.js?v=20261114a';

const Q = new URLSearchParams(location.search);
const flag = (k, d = null) => (Q.has(k) ? Q.get(k) : d);
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const qualityFlag = flag('quality');
const lowPower = qualityFlag === 'low' || (qualityFlag !== 'high' && (coarsePointer || (navigator.hardwareConcurrency || 8) <= 4));
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/* ---------------- renderer, scene, camera ---------------- */

const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: lowPower ? 'low-power' : 'high-performance', preserveDrawingBuffer: flag('shot') === '1' });
const basePixelRatio = Math.min(devicePixelRatio || 1, lowPower ? 1.15 : 1.5);
renderer.setPixelRatio(basePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const shadows = flag('shadows') === '1' || (!lowPower && flag('shadows') !== '0');
renderer.shadowMap.enabled = shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 2000);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const level = buildLevel();
const rail = level.rail;
const runner = new Runner(level);
// The asset set switch (BUILD_GUIDE_FABLE §3.1), built as src/main.js builds
// the game's: classic by default, ?assets=classic|modular|auto and ?swap= honoured,
// the kit imported only when some id can resolve modular. Every piece is built
// through it (build.js); with no Roof Road kit asset every piece stays classic.
const assets = new AssetRuntime({ THREE, assetSet: 'classic', search: location.search, quality: lowPower ? 'low' : 'high', families: (f) => f.startsWith('roof') });
await assets.preload();
const sky = new Sky(scene, renderer, { shadows, reduceMotion, lowPower, assets, center: new THREE.Vector3(level.center.x, 0, level.center.z) });
const world = buildWorld(level, { reduceMotion, lowPower, assets });
scene.add(world.root);
const atmosphere = new RooftopAtmosphere(scene, level, { reduceMotion, lowPower, assets });

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

/* ---------------- the cats; revealed together after GPU warm-up ---------------- */

const catRoot = new THREE.Group();
scene.add(catRoot);
let cat = null, catMod = null;

const guideRoot = new THREE.Group();
scene.add(guideRoot);
let guide = null, stageReady = false;

async function loadCats() {
  if (flag('cat') === '0') return true;
  try {
    const mod = await import('../../src/cat.js?v=20261114a');
    await new Promise((r) => setTimeout(r, 60));          // let the page paint first
    cat = new mod.Cat({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 });
    cat.group.position.y = 0.02;
    catRoot.add(cat.group);
    catMod = mod;
    // Chidori: the same sculpt (cached), a smaller grey-and-white coat.
    const chidoriModular = assets.setFor('roof-chidori') === 'modular' && !lowPower;
    const chidoriDef = chidoriModular ? (await import('../../src/characters/defs/chidori.js?v=20261114a')).CHIDORI : null;
    guide = new mod.Cat(chidoriDef ? { def: chidoriDef, quality: 'high' } : { fur: 0x8f9095, belly: 0xf3f1ec, accent: 0x55575e, eyeColor: 0x9fd0a8, stripeAmount: 0.55, ribbonColor: 0x3a6fa8 });
    guide.group.scale.setScalar(0.86);
    guide.group.position.y = 0.02;
    guideRoot.add(guide.group);
    mod.catRimUniforms.uRimStrength.value = 0.35;
    view.cat = cat; view.guide = guide; view.rim = mod.catRimUniforms;
    return true;
  } catch (e) {
    console.error('cat failed to load', e);
    const wake = $('wake');
    wake.textContent = 'The cats could not wake up. ';
    const retry = document.createElement('button');
    retry.textContent = 'Try again'; retry.onclick = () => location.reload();
    wake.append(retry);
    return false;
  }
}

/* ---------------- audio: a soft, procedural Kyoto soundscape ---------------- */

const audio = {
  ctx: null, master: null, ambience: null, noiseBuffer: null,
  muted: false, paused: false, lastMixT: -1,
  nextStep: 0, nextChirp: 0, nextFestivalDrum: 0,
  ensure() {
    if (this.muted) return;
    if (this.ctx) { this.ctx.resume?.(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.ctx.destination);
      this._buildNoise();
      this._startAmbience();
      this.ctx.resume?.();
    } catch {
      this.ctx = null; this.master = null; this.ambience = null;
    }
  },
  _buildNoise() {
    const c = this.ctx;
    const n = Math.floor(c.sampleRate * 3.0);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  },
  _startAmbience() {
    const c = this.ctx;
    const bus = c.createGain();
    bus.gain.value = this.paused ? 0 : 1;
    bus.connect(this.master);
    const layer = (freq, q, offset) => {
      const src = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
      src.buffer = this.noiseBuffer; src.loop = true;
      filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = q;
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(bus);
      src.start(c.currentTime, offset);
      return gain;
    };
    this.ambience = {
      bus,
      water: layer(820, 0.45, 0.15),
      wind: layer(280, 0.28, 1.37)
    };
  },
  _out(node, ambient = false) {
    node.connect(ambient && this.ambience ? this.ambience.bus : (this.master || this.ctx.destination));
  },
  setPaused(on) {
    this.paused = !!on;
    const c = this.ctx, bus = this.ambience?.bus;
    if (!c || !bus) return;
    bus.gain.cancelScheduledValues(c.currentTime);
    bus.gain.setTargetAtTime(this.paused ? 0 : 1, c.currentTime, this.paused ? 0.08 : 0.22);
  },
  update(s, y, progress, night, ground, finaleActive) {
    const c = this.ctx, a = this.ambience;
    if (!c || !a || this.muted || this.paused || c.state !== 'running') return;
    const t = c.currentTime;
    if (t - this.lastMixT >= 0.1) {
      this.lastMixT = t;
      const river = level.pieces.some(p => p.type === 'water' && s > p.s0 - 8 && s < p.s1 + 8) ? 1 : (s < level.mouths[1].s1 ? 0.55 : 0);
      const low = 1 - smooth(1.2, 6.5, y);
      const waterGain = 0.0015 + river * (0.009 + low * 0.009);
      const windGain = 0.0025 + smooth(3.0, 8.0, y) * 0.008 + progress * 0.0025;
      a.water.gain.setTargetAtTime(waterGain, t, 0.35);
      a.wind.gain.setTargetAtTime(windGain, t, 0.55);
    }

    // Paw sounds follow gait rather than frame rate and change with the
    // surface under the cat. They stay quiet enough to sit inside the wind.
    const pace = Math.abs(runner.vs);
    if (!finaleActive && ground && pace > 0.75 && t >= this.nextStep) {
      this.step(ground.kind, pace);
      this.nextStep = t + clamp(0.48 - pace * 0.033, 0.19, 0.43);
    } else if (!ground || pace <= 0.75) this.nextStep = Math.max(this.nextStep, t + 0.08);

    if (night > 0.32 && t >= this.nextChirp) {
      this.chirp(night);
      this.nextChirp = t + 2.8 + Math.random() * 4.2;
    }
    if (!finaleActive && s > level.mouths[5].s0 && night > 0.42 && t >= this.nextFestivalDrum) {
      this.drum(58 + Math.random() * 8, 1.2, 0.009);
      this.nextFestivalDrum = t + 6.5 + Math.random() * 5.5;
    }
  },
  chime(freq, dur = 1.6, gain = 0.06) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime;
    for (const [mul, g] of [[1, gain], [2.01, gain * 0.35], [3.0, gain * 0.12]]) {
      const o = c.createOscillator(), v = c.createGain();
      o.type = 'sine'; o.frequency.value = freq * mul;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(v); this._out(v); o.start(t); o.stop(t + dur + 0.05);
    }
  },
  noise(dur, freq, gain) {
    const c = this.ctx; if (!c || this.muted) return;
    if (!this.noiseBuffer) this._buildNoise();
    const t = c.currentTime;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain();
    src.buffer = this.noiseBuffer; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    v.gain.setValueAtTime(gain, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(v); this._out(v);
    const maxOffset = Math.max(0, this.noiseBuffer.duration - dur - 0.01);
    src.start(t, Math.random() * maxOffset, dur);
  },
  step(kind, pace) {
    const fast = smooth(2.0, 7.5, pace);
    if (kind === 'water') this.noise(0.09, 1280, 0.009 + fast * 0.005);
    else if (['deck', 'boat', 'rack', 'futon', 'rope', 'branch'].includes(kind)) this.noise(0.045, 520, 0.011 + fast * 0.004);
    else if (['ridge', 'eave', 'roof', 'canopy', 'cap'].includes(kind)) this.noise(0.032, 1550, 0.009 + fast * 0.004);
    else this.noise(0.042, 920, 0.009 + fast * 0.004);
  },
  chirp(night) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime, base = 3500 + Math.random() * 950;
    for (let i = 0; i < 2; i++) {
      const o = c.createOscillator(), v = c.createGain(), at = t + i * 0.115;
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (1 + i * 0.035), at);
      o.frequency.exponentialRampToValueAtTime(base * 1.07, at + 0.065);
      v.gain.setValueAtTime(0.0001, at);
      v.gain.exponentialRampToValueAtTime(0.0022 * night, at + 0.012);
      v.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
      o.connect(v); this._out(v, true); o.start(at); o.stop(at + 0.1);
    }
  },
  pat() { this.noise(0.06, 900, 0.045); if (this.ctx) this.nextStep = this.ctx.currentTime + 0.16; },
  splash() { this.noise(0.35, 1400, 0.1); if (this.ctx) this.nextStep = this.ctx.currentTime + 0.2; },
  bounce() { this.noise(0.12, 300, 0.1); if (this.ctx) this.nextStep = this.ctx.currentTime + 0.2; },
  drum(freq = 72, dur = 0.9, gain = 0.045) {
    const c = this.ctx;
    if (!c || this.muted) return;
    const t = c.currentTime;
    const o = c.createOscillator(), v = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + dur * 0.35);
    f.type = 'lowpass'; f.frequency.value = 260;
    v.gain.setValueAtTime(gain, t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(v); this._out(v);
    o.start(t); o.stop(t + dur + 0.03);
  }
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
  else if (e.code === 'KeyM') setMuted(!audio.muted);
  else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  else if (e.code === 'KeyN' && Q.has('debug')) jumpToMouth(Math.min(7, view.currentMouth.id + 1));
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) { keys.delete(k); if (k === 'jump') press.jumpUp = true; }
});
addEventListener('blur', () => { keys.clear(); resetTouch(); });

// Touch: a floating horizontal stick on the left, two generous action buttons
// on the right. Vertical thumb movement is shown but never steals a jump.
const touch = { id: null, x0: 0, y0: 0, move: 0, sprint: false };
const pad = $('pad');
const stickBase = $('stick-base');
const stick = $('stick');
function resetTouch() {
  touch.id = null; touch.move = 0; touch.sprint = false;
  if (stick) stick.style.transform = '';
  if (pad) pad.classList.remove('active', 'sprint');
}
function moveTouch(e) {
  if (e.pointerId !== touch.id) return;
  const dx = e.clientX - touch.x0, dy = e.clientY - touch.y0;
  const len = Math.hypot(dx, dy) || 1;
  const radius = 45;
  const k = Math.min(1, radius / len);
  if (stick) stick.style.transform = `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)`;
  touch.move = clamp(dx / radius, -1, 1);
  if (Math.abs(touch.move) < 0.13) touch.move = 0;
  touch.sprint = Math.abs(dx) > radius * 0.84;
  pad.classList.toggle('sprint', touch.sprint);
}
if (pad) {
  pad.addEventListener('pointerdown', (e) => {
    if (touch.id !== null) return;
    e.preventDefault(); audio.ensure(); touch.id = e.pointerId; touch.x0 = e.clientX; touch.y0 = e.clientY;
    const r = pad.getBoundingClientRect();
    if (stickBase) {
      stickBase.style.left = `${e.clientX - r.left}px`; stickBase.style.top = `${e.clientY - r.top}px`;
      stickBase.style.bottom = 'auto'; stickBase.style.transform = 'translate(-50%, -50%)';
    }
    pad.classList.add('active'); pad.setPointerCapture(e.pointerId); noteMoved(); moveTouch(e);
  });
  pad.addEventListener('pointermove', moveTouch);
  const end = (e) => { if (e.pointerId === touch.id) resetTouch(); };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}
const holdBtn = (id, key) => {
  const b = $(id);
  if (!b) return;
  let pointer = null;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); audio.ensure(); pointer = e.pointerId; b.setPointerCapture(e.pointerId);
    if (!keys.has(key)) press[key] = true;
    keys.add(key); b.classList.add('pressed'); b.setAttribute('aria-pressed', 'true'); noteMoved();
  });
  const up = (e) => {
    if (pointer !== null && e.pointerId !== pointer) return;
    pointer = null; keys.delete(key); if (key === 'jump') press.jumpUp = true;
    b.classList.remove('pressed'); b.setAttribute('aria-pressed', 'false');
  };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
};
holdBtn('btn-jump', 'jump');
holdBtn('btn-down', 'down');

// Standard gamepads: left stick / d-pad, A to jump, B or d-pad down to drop,
// and either trigger to sprint. Edge state keeps jump buffering deterministic.
const gamepadPrev = { jump: false, down: false };
function readGamepad() {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = list && [...list].find(Boolean);
  if (!gp) { gamepadPrev.jump = gamepadPrev.down = false; return { move: 0, sprint: false, jumpHeld: false, downHeld: false, jumpPressed: false, downPressed: false }; }
  let move = Math.abs(gp.axes[0] || 0) > 0.16 ? gp.axes[0] : 0;
  if (gp.buttons[14]?.pressed) move = -1;
  if (gp.buttons[15]?.pressed) move = 1;
  const jumpHeld = !!gp.buttons[0]?.pressed;
  const downHeld = !!gp.buttons[1]?.pressed || !!gp.buttons[13]?.pressed;
  const out = {
    move, sprint: !!gp.buttons[6]?.pressed || !!gp.buttons[7]?.pressed || !!gp.buttons[2]?.pressed,
    jumpHeld, downHeld,
    jumpPressed: jumpHeld && !gamepadPrev.jump,
    downPressed: downHeld && !gamepadPrev.down
  };
  gamepadPrev.jump = jumpHeld; gamepadPrev.down = downHeld;
  if (move || jumpHeld || downHeld) { noteMoved(); audio.ensure(); }
  return out;
}

function readInput() {
  const gp = readGamepad();
  let move = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  if (Math.abs(gp.move) > Math.abs(move)) move = gp.move;
  let sprint = keys.has('sprint') || gp.sprint;
  if (touch.id !== null) {
    move = touch.move;
    sprint = touch.sprint;
  }
  press.jump ||= gp.jumpPressed; press.down ||= gp.downPressed;
  const inp = {
    move, sprint,
    jumpHeld: keys.has('jump') || gp.jumpHeld, jumpPressed: press.jump || gp.jumpPressed, jumpReleased: press.jumpUp,
    downHeld: keys.has('down') || gp.downHeld, downPressed: press.down || gp.downPressed
  };
  return inp;
}

/* ---------------- HUD ---------------- */

const hud = { hidden: flag('nohud') === '1', moved: false, hintT: 0 };
if (hud.hidden) document.body.classList.add('nohud');
function toggleGuidance() {
  const hidden = document.body.classList.toggle('noguide');
  const b = $('btn-guide');
  if (b) { b.setAttribute('aria-pressed', String(hidden)); b.setAttribute('aria-label', hidden ? 'Show guidance' : 'Hide guidance'); }
}
function noteMoved() { if (!hud.moved) { hud.moved = true; hud.hintT = 6; } }

function setMuted(muted, announce = true) {
  audio.muted = muted;
  if (audio.ctx) {
    if (muted) audio.ctx.suspend?.();
    else { audio.ctx.resume?.(); audio.setPaused(isPaused); }
  } else if (!muted && announce) audio.ensure();
  const b = $('btn-sound');
  if (b) { b.setAttribute('aria-pressed', String(muted)); b.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound'); }
  if (announce) toast(muted ? 'Sound off.' : 'Sound on.', 1.5);
}

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
    li.classList.toggle('seen', view.seen.has(id));
    li.classList.toggle('here', id === view.currentMouth.id);
  }
  const sc = $('shoki-count');
  if (sc) sc.textContent = `${view.greeted.size}/7`;
}

/* ---------------- state ---------------- */

// The run's view (rooftops/js/runview.js, shared with the game, ruling R80)
// owns the run's time, the mouths seen, the Shōki greeted, the last lantern,
// the finale and the cat's and camera's rigs. It is built below, once
// Chidori's companion exists; this page keeps its input, HUD, sound and
// renderer, and hears the run's events through the view's hooks.
let view = null;
let autopilot = flag('auto') === '1' ? new Autopilot(level) : null;
let isPaused = false, contextLost = false;

function startAt(s, y) { view.startAt(s, y); }

function jumpToMouth(id) { view.jumpToMouth(id); }

function respawn() {
  if (view.respawn()) toast('Back to the last lantern.', 1.6);
}

function setPaused(on, reason = 'The roofs will wait.') {
  isPaused = !!on;
  keys.clear(); resetTouch(); press.jump = press.down = press.jumpUp = false;
  audio.setPaused(isPaused);
  document.body.classList.toggle('paused', isPaused);
  const panel = $('pause-panel');
  if (panel) {
    panel.hidden = !isPaused;
    $('pause-reason').textContent = reason;
    if (isPaused) requestAnimationFrame(() => $('btn-resume')?.focus());
  }
  const b = $('btn-pause');
  if (b) { b.setAttribute('aria-pressed', String(isPaused)); b.setAttribute('aria-label', isPaused ? 'Resume' : 'Pause'); }
  if (!isPaused) { if (view) view.acc = 0; lastNow = performance.now(); canvas.focus?.(); }
}
function togglePause() { if (!contextLost) setPaused(!isPaused); }

$('btn-guide')?.addEventListener('click', toggleGuidance);
$('btn-sound')?.addEventListener('click', () => setMuted(!audio.muted));
$('btn-reset')?.addEventListener('click', respawn);
$('btn-pause')?.addEventListener('click', togglePause);
$('btn-resume')?.addEventListener('click', () => setPaused(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !view?.finale) setPaused(true, 'Paused while you were away.');
});
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); contextLost = true; setPaused(true, 'The painted world is restoring itself…');
});
canvas.addEventListener('webglcontextrestored', () => location.reload());
setMuted(false, false);

/* ---------------- Chidori and the run's view ---------------- */

const companion = new Companion(level);
const townMap = neighbourhoodMap(level, () => { keys.clear(); resetTouch(); });
view = new RunView({
  level, runner, world, sky, atmosphere, companion, catRoot, guideRoot, camera,
  lightPool, envMats, reduceMotion,
  hooks: {
    viewport: syncViewport,
    sound(name) {
      if (name === 'bounce') audio.bounce();
      else if (name === 'land') audio.pat();
      else if (name === 'splash') audio.splash();
    },
    mouth(m, first) {
      if (first) {
        showCard(m);
        audio.chime(PENTA[m.id - 1] * 0.5, 2.6, 0.05);
      }
      updateStrip();
    },
    shoki(k, count) {
      audio.chime(PENTA[(k.id - 1) % PENTA.length], 2.2, 0.07);
      toast(count === 7 ? 'Seven Shōki greeted. The roofs are well guarded.' : `A Shōki keeps watch here. (${count}/7)`);
      updateStrip();
    },
    treat(k) {
      audio.chime(659.25, 1.0, 0.05);
      toast(k.label[0].toUpperCase() + k.label.slice(1) + '.', 3.6);
      updateStrip();
    },
    finale(m) {
      document.body.classList.add('at-finale');
      showCard(m);
      updateStrip();
    },
    fire(i, fire) {
      audio.drum(76 - i * 4, 1.15, 0.042);
      audio.chime([196.0, 220.0, 246.94, 293.66, 329.63][i], 3.5, 0.06);
      toast(fire?.label || fire?.name || 'Okuribi', 1.45);
    },
    finaleCard(count) {
      const f = $('finale');
      if (f) {
        f.querySelector('.count').textContent = `${count} of 7 Shōki greeted`;
        f.classList.add('show');
      }
    }
  }
});

$('again') && $('again').addEventListener('click', () => {
  $('finale').classList.remove('show');
  document.body.classList.remove('at-finale');
  view.restart();
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

let lastNow = performance.now();
const fixedHour = flag('hour') !== null ? clamp(parseFloat(flag('hour')), 0, 1) : null;
view.fixedPhase = fixedHour;
let fpsT = 0, fpsN = 0, healthyT = 0;
let qualityTier = qualityFlag === 'low' ? 2 : (lowPower ? 1 : 0);

function applyQualityTier(tier) {
  qualityTier = clamp(tier, 0, 2);
  const ratio = qualityTier === 0 ? basePixelRatio : qualityTier === 1 ? Math.min(1, basePixelRatio) : Math.min(0.86, basePixelRatio);
  renderer.setPixelRatio(ratio);
  const trim = qualityTier >= 1;
  atmosphere.setLowPower(trim);
  sky.setLowPower(trim);
  renderer.shadowMap.enabled = shadows && qualityTier < 2;
  sky.sun.castShadow = shadows && qualityTier < 2;
  renderer.shadowMap.needsUpdate = true;
}
applyQualityTier(qualityTier);

function frame(now) {
  requestAnimationFrame(frame);
  tick(now);
}
function tick(now, draw = true) {
  let dt = Math.max(0, Math.min(0.1, (now - lastNow) / 1000));
  lastNow = now;
  if (flag('shot') === '1') dt = Math.min(dt, 1 / 30);

  if (isPaused || contextLost) {
    view.acc = 0;
    if (!contextLost) { updateCamera(0); if (draw) renderer.render(scene, camera); }
    return;
  }

  // Input → the run's view: fixed physics steps (or the autopilot), the sky by
  // progress, moving pieces, the cat, Chidori, pickups and mouths or the
  // finale, the lantern lights and the camera.
  const { steps, prog, night } = view.frame(dt, readInput(), autopilot);
  // A press is consumed by the first physics step that sees it; with no step
  // this frame it waits for the next one.
  if (steps) press.jump = press.down = press.jumpUp = false;
  audio.update(runner.s, runner.y, prog, night, runner.grounded ? runner.ground : null, !!view.finale);

  townMap.update(runner.s, companion.runner.s, runner.depth, companion.runner.depth);
  const entrance = runner.alley === null ? alleyEntrance(level, runner.s, runner.y) : null;
  const alley = runner.alley !== null ? level.alleys[runner.alley] : null;
  const alleyHint = $('alley-hint');
  alleyHint.hidden = !!view.finale || !(entrance || alley);
  alleyHint.textContent = entrance ? '↓ ' + entrance.name : alley ? alley.kanji + ' · ' + alley.name : '';
  $('btn-down').querySelector('span').textContent = entrance ? 'alley' : 'drop';
  $('btn-down').setAttribute('aria-label', entrance ? 'Enter ' + entrance.name : 'Drop down');

  // HUD timers.
  if (cardT > 0) { cardT -= dt; if (cardT <= 0) $('card').classList.remove('show'); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (hud.moved && hud.hintT > 0) { hud.hintT -= dt; if (hud.hintT <= 0) $('hint').classList.add('gone'); }

  // Adaptive quality uses sustained windows and can recover after a calm spell.
  // Explicit ?quality=low stays locked for predictable battery-friendly play.
  fpsT += dt; fpsN++;
  if (fpsT > 4 && flag('shot') !== '1') {
    const fps = fpsN / fpsT;
    if (qualityFlag !== 'low') {
      if (fps < 27 && qualityTier < 2) { applyQualityTier(2); healthyT = 0; }
      else if (fps < 42 && qualityTier < 1) { applyQualityTier(1); healthyT = 0; }
      else if (fps > 55 && qualityTier > 0) {
        healthyT += fpsT;
        if (healthyT > 12) { applyQualityTier(qualityTier - 1); healthyT = 0; }
      } else healthyT = Math.max(0, healthyT - fpsT * 0.5);
    }
    fpsT = 0; fpsN = 0;
  }

  if (draw) renderer.render(scene, camera);
}

/** The page's canvas and lens, before the view frames the camera. */
function syncViewport() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
  }
  camera.aspect = w / Math.max(1, h);
}

function updateCamera(dt, playerOnly = false) { view.updateCamera(dt, playerOnly); }

/* ---------------- start ---------------- */

async function start() {
  view.initChidori();
  if (flag('finale') === '1') {
    const perch = level.platforms.find((p) => p.kind === 'perch');
    startAt((perch.s0 + perch.s1) / 2, perch.y0);
    view.lastCheckpoint = level.checkpoints[6];
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
  view.initChidori();
  view.currentMouth = mouthAt(level, runner.s, runner.y);
  view.seen.add(view.currentMouth.id);
  updateStrip();
  if (!await loadCats()) return;
  // Initialise poses, all visible scenery and lighting before compiling the
  // complete scene. Nothing advances or accepts held input under the cover.
  lastNow = performance.now(); tick(lastNow, false);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  await new Promise(requestAnimationFrame);
  renderer.render(scene, camera);
  keys.clear(); resetTouch(); press.jump = press.down = press.jumpUp = false;
  view.acc = 0; lastNow = performance.now(); stageReady = true;
  document.body.classList.remove('loading');
  document.body.setAttribute('aria-busy', 'false');
  $('wake').classList.add('gone');
  if (flag('nohud') !== '1') showCard(view.currentMouth);
  requestAnimationFrame((t) => { lastNow = t; frame(t); });
}

// Expose a little for headless captures and the console.
window.roofRoad = {
  level, runner, sky, world, atmosphere, audio, PHYS, jumpToMouth,
  get companion() { return companion; },
  get runView() { return view; },
  get view() {
    const ndc = p => { const v = p.clone().add(new THREE.Vector3(0, 0.3, 0)).project(camera); return { x: v.x, y: v.y, z: v.z }; };
    const bounds = p => {
      const b = { left: Infinity, right: -Infinity, top: -Infinity, bottom: Infinity };
      for (const x of [-.42,.42]) for (const y of [0,.72]) for (const z of [-.42,.42]) {
        const v = p.clone().add(new THREE.Vector3(x,y,z)).project(camera);
        b.left = Math.min(b.left,v.x); b.right = Math.max(b.right,v.x); b.top = Math.max(b.top,v.y); b.bottom = Math.min(b.bottom,v.y);
      }
      b.pixelsHigh = (b.top - b.bottom) * canvas.clientHeight / 2; return b;
    };
    return { positions:{player:catRoot.position.toArray(),guide:guideRoot.position.toArray()}, player: ndc(catRoot.position), guide: ndc(guideRoot.position), fires: sky.fires.map(f => ndc(f.center)), bounds: { player: bounds(catRoot.position), guide: bounds(guideRoot.position) }, distance: view.cam.dist, aspect: camera.aspect, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, mood: companion.mood, camera: { mode: view.cam.mode, clear: view.cam.clear, subjects: view.cam.subjects, position: camera.position.toArray(), focus: view.cam.center.toArray() } };
  },
  setAuto(on = true) { autopilot = on ? new Autopilot(level) : null; },
  get finale() { return view.finale; },
  get catReady() { return stageReady; },
  /** Stand the cat at route position s; pass y to inspect a specific layer. */
  at(s, y = null) {
    if (Number.isFinite(y)) startAt(s, y);
    else {
      const sup = runner.support(s, 20, 0, 40);
      startAt(s, sup ? platTop(sup, s) : 0);
    }
  },
  /** Force one or more camera ticks while an inspector has paused animation. */
  renderNow(frames = 1) {
    const count = clamp(Math.floor(frames) || 1, 1, 600);
    for (let i = 0; i < count; i++) updateCamera(1 / 60);
    renderer.render(scene, camera);
  },
  /** Jump to the end of the finale: all five fires burning, the card up. */
  skipFinale() { view.skipFinale(); }
};
// Deterministic browser review runs the actual frame pipeline without drawing
// every intermediate tick. Available only with ?qa=1; normal play has no clock.
if (flag('qa') === '1') {
  roofRoad.advanceFramesForReview = milliseconds => {
    view.acc=0;const states=[];
    for(const ms of milliseconds.slice(0,120)) {
      tick(lastNow+clamp(Number(ms)||0,0,100),false);
      states.push({y:runner.y,vy:runner.vy,grounded:runner.grounded});
    }
    lastNow=performance.now();view.acc=0;renderer.render(scene,camera);return states;
  };
  roofRoad.advanceForReview = seconds => {
    const n = Math.ceil(clamp(Number(seconds) || 0, 0, 450) * 60);
    const samples = [], moods = new Set(), cameraFailures = [];
    for (let i = 0; i < n; i++) {
      tick(lastNow + 1000 / 60, false);
      if (!view.finale && !view.cam.clear && cameraFailures.length < 80 && cameraFailures.every(f=>Math.abs(f.s-runner.s)>1 || f.alley!==runner.alley)) cameraFailures.push({s:runner.s,alley:runner.alley,y:runner.y,depth:runner.depth,ground:runner.ground?.label,positions:roofRoad.view.positions,camera:roofRoad.view.camera});
      if (i % 30 === 0 && !view.finale) { const v = roofRoad.view; samples.push({ s: runner.s, y: runner.y, ...v }); moods.add(companion.mood); }
    }
    // The accelerated review clock must never leak into the next real RAF.
    lastNow = performance.now(); view.acc = 0;
    renderer.render(scene, camera);
    return { samples, cameraFailures, moods: [...moods], s: runner.s, finale: !!view.finale, catReady: stageReady };
  };
}
start();
