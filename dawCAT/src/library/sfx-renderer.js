import { pcm, random, seedOf, TAU, clamp, biquad, edgeFade, mixMono, peakNormalize } from './pcm.js';
import { synthVoice, modes } from './voices.js';

function curve(values, u) {
  const x = clamp(u) * (values.length - 1), i = Math.min(values.length - 2, Math.floor(x));
  return values[i] + (values[i + 1] - values[i]) * (x - i);
}
function noise(length, rng) { const d = new Float32Array(length); for (let i = 0; i < length; i++) d[i] = rng() * 2 - 1; return d; }
// Glottal source -> three moving vocal-tract resonators. Coefficients update
// every 32 samples; pole states remain continuous through vowel changes.
function vocal(length, sr, recipe, rng) {
  const d = new Float32Array(length), dur = length / sr, states = [[0, 0], [0, 0], [0, 0]], coeff = [];
  let phase = 0, previousPulse = 0, breath = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sr, u = i / length, mouth = Math.sin(Math.PI * u) ** .8 * (recipe.open || .5);
    if (i % 32 === 0) {
      const formants = [520 + mouth * 720, 1850 - mouth * 450, 3100 - mouth * 260];
      formants.forEach((f, j) => { const r = Math.exp(-Math.PI * (140 + j * 180) / sr); coeff[j] = [2 * r * Math.cos(TAU * f / sr), r * r, 1 - r]; });
    }
    const semis = curve(recipe.contour || [0, 1, 0, -3], u), roll = recipe.trill ? .025 * Math.sin(TAU * recipe.trill * t) : 0;
    const f0 = (recipe.f0 || 490) * 2 ** (semis / 12) * (1 + roll + .007 * Math.sin(TAU * 31 * t) + .003 * (rng() - .5));
    phase = (phase + f0 / sr) % 1;
    const pulse = phase < .62 ? .5 - .5 * Math.cos(TAU * phase / .62) : 0;
    const source = (pulse - previousPulse) * sr / f0; previousPulse = pulse;
    breath = breath * .65 + (rng() * 2 - 1) * .35;
    let x = source * .08;
    states.forEach((state, j) => { const [a, b, g] = coeff[j], y = source * g + a * state[0] - b * state[1]; state[1] = state[0]; state[0] = y; x += y * [1, .6, .22][j]; });
    let env = Math.sin(Math.PI * u) ** .65;
    if (recipe.trill) env *= .5 + .5 * Math.sin(TAU * recipe.trill * t) ** 2;
    if (recipe.chatter) env *= Math.max(0, Math.sin(TAU * 8 * t));
    d[i] = (x + breath * (.03 + .08 * u ** 3)) * env * Math.min(1, t / .02, (dur - t) / .035);
  }
  return d;
}
function granular(length, sr, r, rng, material = false) {
  const d = new Float32Array(length), seconds = length / sr, grains = r.grains || 20;
  const bed = noise(length, rng);
  biquad(bed, sr, material ? 'bandpass' : 'lowpass', r.grit || r.color || 1500, .6);
  for (let i = 0; i < length; i++) {
    const u = i / length;
    d[i] = bed[i] * (material ? Math.exp(-u * 12) : Math.sin(Math.PI * u) ** 1.3) * .25;
  }
  for (let k = 0; k < grains; k++) {
    const at = Math.floor((material ? rng() ** 2 * .45 : rng() * .9) * length), span = Math.floor(sr * (.003 + rng() * .025));
    const freq = (r.grit || r.color || 1500) * (.6 + rng()), amp = (.15 + rng() * .35) / Math.sqrt(grains / 8);
    for (let j = 0; j < span && at + j < length; j++) d[at + j] += (rng() * 2 - 1 + Math.sin(TAU * freq * j / sr) * .3) * amp * Math.exp(-j / (span / 5));
  }
  if (r.body) {
    const body = modes(length, sr, r.body, [1, 1.59, 2.42], material ? .18 : .12, rng, .3);
    for (let i = 0; i < length; i++) d[i] += body[i] * (material ? .38 : .09);
  }
  if (r.crunch) for (let i = 0; i < length; i++) d[i] *= .15 + .85 * Math.max(0, Math.sin(TAU * 3.3 * i / sr)) ** 4;
  if (r.slide) {
    const stop = modes(Math.floor(sr * .2), sr, 225, [1, 1.9, 3.2], .14, rng);
    for (let j = 0, at = Math.floor(length * .78); j < stop.length && at + j < length; j++) d[at + j] += stop[j] * .15;
  }
  return d;
}
function water(length, sr, r, rng) {
  const d = noise(length, rng), seconds = length / sr;
  biquad(d, sr, 'lowpass', r.pour ? 3200 : 1800);
  for (let i = 0; i < length; i++) {
    const u = i / length;
    d[i] *= (r.impact || .1) * (r.pour ? Math.sin(Math.PI * u) : (1 - Math.exp(-u * 100)) * Math.exp(-u * 10));
  }
  for (let k = 0; k < r.bubbles; k++) {
    const at = Math.floor((r.drop && k === 0 ? .03 : rng() ** 1.7 * .85) * length), freq = r.drop && k === 0 ? 1450 : 350 + rng() * 2600;
    const span = Math.floor(sr * (.025 + rng() * .12)), amp = (r.drop ? .8 : .12 + rng() * .25) / Math.sqrt(Math.max(1, r.bubbles / 6));
    let phase = 0;
    for (let j = 0; j < span && at + j < length; j++) {
      phase += TAU * freq * (1 + j / span * .45) / sr;
      d[at + j] += Math.sin(phase) * amp * Math.exp(-j / (span / 5)) * Math.min(1, j / (sr * .001));
    }
  }
  if (r.lap) for (let i = 0; i < length; i++) d[i] *= .6 + .4 * Math.sin(TAU * i / sr * 11);
  return d;
}
export function renderSound(sound, { sampleRate = 48000, take = 0 } = {}) {
  if (!sound) throw new Error('Sound recipe is required');
  const sr = sampleRate, rng = random(seedOf(`${sound.id}:${sound.seed}:${take}`)), r = sound.recipe;
  const length = Math.ceil(sr * sound.duration), out = pcm(sr, [new Float32Array(length), new Float32Array(length)]);
  let d;
  if (sound.model === 'vocal') d = vocal(length, sr, { ...r, f0: r.f0 * (1 + (rng() - .5) * .055) }, rng);
  else if (sound.model === 'step' || sound.model === 'friction') d = granular(length, sr, r, rng, sound.model === 'step');
  else if (sound.model === 'water') d = water(length, sr, r, rng);
  else if (sound.model === 'instrument' || sound.model === 'phrase') {
    const notes = r.notes || r.strikes.map(() => r.midi);
    notes.forEach((midi, i) => {
      const at = r.strikes ? r.strikes[i] : i * r.interval;
      const voice = synthVoice(r.instrument, midi + (rng() - .5) * .12, .25, .65 - i * .05, sr, take + i, { decay: r.decay || Math.max(.4, sound.duration * .8) });
      mixMono(out, voice, at, .7, (rng() - .5) * .35);
    });
  } else if (sound.model === 'bed') {
    for (let ch = 0; ch < 2; ch++) {
      const bed = noise(length, rng); biquad(bed, sr, 'lowpass', r.color); biquad(bed, sr, 'highpass', 60);
      for (let i = 0; i < length; i++) bed[i] *= .25 + .15 * Math.sin(TAU * i / length * 2 + ch) * r.motion;
      for (let k = 0; k < r.droplets; k++) {
        const at = Math.floor(rng() * length), span = Math.floor(sr * (r.crackle ? .012 : .025 + rng() * .06)), freq = 500 + rng() * 3500;
        for (let j = 0; j < span && at + j < length; j++) bed[at + j] += (r.crackle ? rng() * 2 - 1 : Math.sin(TAU * freq * j / sr)) * .14 * Math.exp(-j / (span / 5));
      }
      out.getChannelData(ch).set(bed);
    }
  } else if (sound.model === 'purr') {
    d = noise(length, rng); biquad(d, sr, 'lowpass', 650);
    for (let i = 0; i < length; i++) { const t = i / sr, breath = .6 + .4 * Math.sin(TAU * t / 3) ** 2, phase = TAU * r.rate * t;
      d[i] = (d[i] * .7 + .15 * Math.sin(phase) + .08 * Math.sin(phase * 2)) * (.15 + .85 * Math.max(0, Math.sin(phase + .08 * Math.sin(t * 11))) ** 2) * breath;
    }
  } else if (sound.model === 'hiss') {
    d = noise(length, rng); biquad(d, sr, 'highpass', 1800); biquad(d, sr, 'peak', r.color, 1, 5);
    for (let i = 0; i < length; i++) d[i] *= (1 - Math.exp(-i / (sr * .008))) * Math.exp(-i / (sr * .22));
  } else if (sound.model === 'bird') {
    d = new Float32Array(length);
    for (let k = 0; k < r.syllables.length; k++) {
      const at = Math.floor(r.syllables[k] * sr), span = Math.floor(sr * (r.crow ? .28 : .15)), freq = r.base * (1 + .12 * k);
      let phase = 0;
      for (let j = 0; j < span && at + j < length; j++) {
        const u = j / span; phase += TAU * freq * (1 + .2 * Math.sin(Math.PI * u) - .1 * u) / sr;
        d[at + j] += Math.sin(Math.PI * u) ** .6 * (r.crow ? Math.tanh(Math.sin(phase) * 3) * (.65 + .35 * Math.sin(TAU * 39 * j / sr)) + (rng() - .5) * .3 : Math.sin(phase) + .12 * Math.sin(phase * 2));
      }
    }
  } else if (sound.model === 'insect') {
    d = new Float32Array(length);
    for (let i = 0; i < length; i++) { const t = i / sr;
      d[i] = (Math.sin(TAU * r.base * t) + .12 * (rng() * 2 - 1)) * Math.max(0, Math.sin(TAU * r.rate * t)) ** 4 * Math.max(0, Math.sin(TAU * t / r.cycle)) ** .5;
    }
  } else if (sound.model === 'choir') {
    r.notes.forEach((midi, i) => {
      const v = synthVoice('sho', midi, sound.duration - 1, .5, sr, i + take, { attack: 1, release: .8 });
      biquad(v, sr, 'peak', 760 + i * 40, 2, 7); biquad(v, sr, 'peak', 1200 + i * 80, 2, 3);
      mixMono(out, v, 0, .5, (i - 1) * .4);
    });
  } else throw new Error(`Unknown SFX model: ${sound.model}`);
  if (d) { edgeFade(d, sr, sound.loop ? .08 : .006); mixMono(out, d); }
  for (let ch = 0; ch < 2; ch++) { biquad(out.getChannelData(ch), sr, 'highpass', 28); edgeFade(out.getChannelData(ch), sr, sound.loop ? .08 : .008); }
  // Beds have matching zero-valued boundaries; intended to loop with an
  // 80 ms equal-power overlap, rather than implying phase-exact ambience.
  return peakNormalize(out, sound.category === 'Nature beds' || sound.loop ? -9 : -4);
}
