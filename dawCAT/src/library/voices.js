import { TAU, clamp, random, seedOf, biquad, edgeFade } from './pcm.js';
import { INSTRUMENTS } from './instruments.js';

// Recurrence oscillators avoid a trigonometric call per sample per mode.
export function modes(length, sr, fundamental, ratios, decay, rng = random(1), brightness = .6) {
  const out = new Float32Array(length);
  ratios.forEach((ratio, j) => {
    const hz = fundamental * ratio;
    if (hz > sr * .43) return;
    const w = TAU * hz / sr, c = 2 * Math.cos(w), r = Math.exp(-6.91 / (sr * Math.max(.03, decay / (1 + j * .38))));
    let y1 = Math.sin(w + rng() * .02), y2 = 0, amp = (j ? brightness : 1) / (1 + j * .65);
    for (let i = 0; i < length; i++) { const y = c * y1 - y2; y2 = y1 * r; y1 = y * r; out[i] += y * amp; }
  });
  return out;
}
function scaleVoice(out, sr, peak = .65) {
  biquad(out, sr, 'highpass', 24);
  let p = 0;
  for (const x of out) p = Math.max(p, Math.abs(x));
  const g = peak / Math.max(p, 1e-8);
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return edgeFade(out, sr, .004);
}

// A lossy, fractionally tuned feedback string with a pick-position comb.
function stringVoice(def, p, hz, duration, sr, rng) {
  const decay = clamp(p.decay ?? def.decay, .08, 8), bright = clamp(p.brightness ?? def.brightness, .05, .98);
  const length = Math.ceil(sr * Math.min(12, Math.max(duration + .25, decay * .72))), out = new Float32Array(length);
  const delay = Math.max(3, sr / hz - (1 - bright)), ring = new Float32Array(Math.ceil(delay) + 2);
  const excitation = new Float32Array(ring.length);
  for (let i = 0; i < ring.length; i++) excitation[i] = rng() * 2 - 1;
  const pos = Math.max(1, Math.round(ring.length * (p.position ?? def.position)));
  for (let i = 0; i < ring.length; i++) ring[i] = excitation[i] - excitation[(i + pos) % ring.length];
  const feedback = Math.exp(-6.91 / (decay * hz));
  let cursor = 0, low = 0, prev = 0;
  for (let i = 0; i < length; i++) {
    // The very small pitch scoop relaxes the string after the attack.
    const d = delay * (1 - .003 * Math.exp(-i / (sr * .05)));
    const read = (cursor - d + ring.length) % ring.length, i0 = Math.floor(read), frac = read - i0;
    const x = ring[i0] * (1 - frac) + ring[(i0 + 1) % ring.length] * frac;
    low = x * bright + prev * (1 - bright); prev = x;
    const buzz = (p.buzz ?? def.buzz ?? 0) * Math.tanh(x * 7) * Math.exp(-i / (sr * .25));
    ring[cursor] = low * feedback; cursor = (cursor + 1) % ring.length;
    out[i] = x + buzz;
  }
  const body = modes(length, sr, def.body, [1, 1.93, 3.08], .14, rng, .3);
  const bodyGain = clamp(p.body ?? .35) * .25;
  for (let i = 0; i < length; i++) out[i] += body[i] * bodyGain;
  return out;
}

export function synthVoice(id, midi = 60, duration = 1, velocity = .8, sampleRate = 48000, seed = 1, params = {}) {
  const def = INSTRUMENTS.find(x => x.id === id);
  if (!def) throw new Error(`Unknown voice: ${id}`);
  const sr = sampleRate, hz = 440 * 2 ** ((midi - 69) / 12), rng = random(seedOf(`${id}:${seed}:${midi}`));
  const dur = clamp(duration, .025, 20), vel = clamp(velocity, .01, 1), p = params;
  let out;
  if (def.family === 'string') out = stringVoice(def, { ...p, brightness: (p.brightness ?? def.brightness) * (.65 + .35 * vel) }, hz, dur, sr, rng);
  else if (['metal', 'wood', 'keys'].includes(def.family)) {
    const decay = clamp(p.decay ?? def.decay, .08, 9), length = Math.ceil(sr * Math.max(dur + .15, decay * .8));
    const ratios = def.ratios || (id === 'rhodes' ? [1, 2.003, 3.99, 7.02] : [1, 2.002, 3.008, 4.018, 5.04, 6.07, 7.12]);
    out = modes(length, sr, hz, ratios, decay, rng, (p.brightness ?? .6) * vel);
    if (def.family === 'metal') {
      const beat = modes(length, sr, hz * 1.0027, ratios.slice(0, 2), decay * .9, rng, .3);
      for (let i = 0; i < length; i++) out[i] += beat[i] * .25;
    }
    for (let i = 0; i < Math.min(length, sr * .03); i++) out[i] += (rng() * 2 - 1) * .06 * vel * Math.exp(-i / (sr * .005));
  } else {
    const attack = clamp(p.attack ?? def.attack ?? .015, .004, 2), release = clamp(p.release ?? .25, .04, 3);
    const length = Math.ceil(sr * (dur + release)), noise = new Float32Array(length);
    for (let i = 0; i < length; i++) noise[i] = rng() * 2 - 1;
    biquad(noise, sr, 'bandpass', hz * 3.2, .8);
    out = new Float32Array(length);
    let phase = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sr, vib = (p.vibrato ?? def.vibrato ?? .003) * Math.min(1, t / .45) * Math.sin(TAU * 4.8 * t);
      const scoop = def.family === 'wind' ? -.018 * Math.exp(-t / .055) : 0;
      phase += TAU * hz * (1 + vib + scoop + .0007 * Math.sin(t * 13.1)) / sr;
      const env = (1 - Math.exp(-t / (attack / 3))) * (t < dur ? 1 : Math.exp(-(t - dur) / (release / 5)));
      let x = Math.sin(phase);
      if (def.family === 'wind') x += .28 * vel * Math.sin(phase * 2) + .09 * Math.sin(phase * 3) + noise[i] * (p.breath ?? def.breath) * (1 + 1.4 * Math.exp(-t / .12));
      else if (def.family === 'reed') x = .6 * Math.sin(phase) + .25 * Math.sin(phase * 2.002) + .13 * Math.sin(phase * 3.001) + .08 * Math.sin(phase * 4.003);
      else if (def.family === 'keys') x += .15 * Math.sin(phase * 2);
      else if (def.family === 'pad') x = .5 * Math.sin(phase) + .25 * Math.sin(phase * 1.003) + .18 * Math.sin(phase * 2) + .07 * Math.sin(phase * 3);
      else if (def.family === 'lead') x = Math.sin(phase + (.3 + vel * .8) * Math.exp(-t / .7) * Math.sin(phase * 2));
      else x += .16 * Math.sin(phase * 2) * Math.exp(-t / .3);
      out[i] = x * env * (1 + .025 * Math.sin(TAU * 2.3 * t));
    }
  }
  scaleVoice(out, sr, .6 * vel ** .8);
  if (p.cutoff && p.cutoff < sr * .42) biquad(out, sr, 'lowpass', p.cutoff);
  return out;
}

export function drumVoice(lane, kit = 'kyoto', velocity = .8, sr = 48000, seed = 1) {
  const rng = random(seedOf(`${lane}:${kit}:${seed}`)), taiko = kit === 'kyoto' || kit === 'taiko';
  const electronic = kit === 'neon' || kit === '808';
  const specs = {
    kick: [taiko ? 72 : electronic ? 43 : 56, taiko ? 1.1 : .65, [1, 1.593, 2.136, 2.65, 3.6]],
    snare: [taiko ? 225 : 185, .3, [1, 1.47, 2.1, 3.4]],
    tom: [taiko ? 118 : 98, .6, [1, 1.594, 2.136, 2.653]],
    rim: [taiko ? 860 : 1400, .12, [1, 1.48, 2.57, 3.9]],
    perc: [taiko ? 1380 : 760, .65, [1, 1.46, 2.17, 3.14, 4.3]],
    hatC: [6200, .065, [1, 1.342, 1.91]], hatO: [5800, .35, [1, 1.342, 1.91]], clap: [1200, .18, [1, 1.6]]
  };
  if (!specs[lane]) return new Float32Array(1);
  const [hz, decay, ratios] = specs[lane], length = Math.ceil(sr * (decay * 1.1 + .03));
  const out = modes(length, sr, hz * (1 + (rng() - .5) * .012), ratios, decay, rng, .7);
  const noise = new Float32Array(length);
  for (let i = 0; i < length; i++) noise[i] = (rng() * 2 - 1) * Math.exp(-i / (sr * (lane.startsWith('hat') ? decay / 4 : lane === 'snare' ? .065 : .006)));
  biquad(noise, sr, lane.startsWith('hat') ? 'highpass' : 'bandpass', lane.startsWith('hat') ? 4800 : lane === 'snare' ? 2300 : 1800, .7);
  for (let i = 0; i < length; i++) {
    if (lane.startsWith('hat')) out[i] = noise[i] * 2 + out[i] * .04;
    else if (lane === 'snare') out[i] = out[i] * .2 + noise[i] * (taiko ? .4 : 1.8);
    else if (lane === 'clap') out[i] = noise[i] * (1 + .7 * Math.sin(i / sr * 520)) + out[i] * .04;
    else out[i] += noise[i] * .28;
  }
  return scaleVoice(out, sr, .7 * clamp(velocity) ** .8);
}
