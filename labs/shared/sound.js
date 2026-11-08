// Small Web Audio synths for the labs. Nothing plays until the visitor has
// touched the page, and every sound is made here: no samples to download.
let ctx = null, master = null, muted = false;

export function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return { ctx, master };
}
export const setMuted = (b) => { muted = b; if (master) master.gain.value = b ? 0 : 0.7; };
export const isMuted = () => muted;

const noiseBuffer = (c, secs = 2, brown = false) => {
  const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
};

function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

/** A struck bronze or glass bell: inharmonic partials, each with its own decay. */
export function bell(freq = 520, { vol = 0.3, dur = 2.6, partials = [1, 2.01, 2.76, 4.07, 5.4], pan = 0 } = {}) {
  const A = audio(); if (!A) return;
  const { ctx: c, master: m } = A, t = c.currentTime + 0.005;
  const out = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
  if (out.pan) out.pan.value = pan;
  out.connect(m);
  partials.forEach((p, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq * p * (1 + (Math.random() - 0.5) * 0.002);
    env(g, t, 0.003, vol / (i * 0.8 + 1), dur / (i * 0.55 + 1));
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.1);
  });
}

/** Bamboo on stone: a resonant knock with a noisy attack. */
export function clack({ vol = 0.5, freq = 620 } = {}) {
  const A = audio(); if (!A) return;
  const { ctx: c, master: m } = A, t = c.currentTime + 0.005;
  const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  n.buffer = noiseBuffer(c, 0.2); f.type = 'bandpass'; f.frequency.value = freq * 1.6; f.Q.value = 3;
  env(g, t, 0.001, vol, 0.07);
  n.connect(f); f.connect(g); g.connect(m); n.start(t); n.stop(t + 0.15);
  for (const [r, a] of [[1, 1], [1.58, 0.55], [2.4, 0.3]]) {
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(freq * r * 1.05, t); o.frequency.exponentialRampToValueAtTime(freq * r, t + 0.04);
    env(og, t, 0.001, vol * 0.45 * a, 0.16);
    o.connect(og); og.connect(m); o.start(t); o.stop(t + 0.3);
  }
}

/** A drop into still water: a sine that chirps upward and dies. */
export function drip({ vol = 0.22, freq = 900, jitter = 0.3 } = {}) {
  const A = audio(); if (!A) return;
  const { ctx: c, master: m } = A, t = c.currentTime + 0.005;
  const f = freq * (1 - jitter / 2 + Math.random() * jitter);
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.12);
  env(g, t, 0.003, vol, 0.14);
  o.connect(g); g.connect(m); o.start(t); o.stop(t + 0.2);
}

/** A soft paper-and-wood thump: footfalls, things set down. */
export function thump({ vol = 0.2, freq = 130 } = {}) {
  const A = audio(); if (!A) return;
  const { ctx: c, master: m } = A, t = c.currentTime + 0.005;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq * 1.8, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  env(g, t, 0.004, vol, 0.14);
  o.connect(g); g.connect(m); o.start(t); o.stop(t + 0.22);
}

/** A soft bed of filtered noise: wind, rain, a stream. set(level) fades it. */
export class Bed {
  constructor({ type = 'lowpass', freq = 700, q = 0.6, brown = false, max = 0.3 } = {}) { this.o = { type, freq, q, brown, max }; this.g = null; }
  _start() {
    const A = audio(); if (!A || this.g) return;
    const { ctx: c, master: m } = A, O = this.o;
    const n = c.createBufferSource(), f = c.createBiquadFilter();
    n.buffer = noiseBuffer(c, 3, O.brown); n.loop = true;
    f.type = O.type; f.frequency.value = O.freq; f.Q.value = O.q;
    this.g = c.createGain(); this.g.gain.value = 0;
    n.connect(f); f.connect(this.g); this.g.connect(m); n.start();
    this.c = c;
  }
  set(level) {
    this._start();
    if (!this.g) return;
    this.g.gain.setTargetAtTime(Math.max(0, level) * this.o.max, this.c.currentTime, 0.25);
  }
}
