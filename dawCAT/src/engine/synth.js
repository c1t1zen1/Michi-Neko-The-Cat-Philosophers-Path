/* dawCAT — synth voices, game SFX approximations, ambient textures */

export const SYNTH_KINDS = ['pad', 'pluck', 'lead', 'bass', 'keys', 'chime'];
export const OSC_TYPES = ['sine', 'triangle', 'sawtooth', 'square'];

function noiseBuffer(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function getNoise(pack) {
  if (!pack._noise) pack._noise = noiseBuffer(pack.ctx);
  return pack._noise;
}

export function playSynthNote(pack, dest, preset, midi, when, dur, vel, reg) {
  const ctx = pack.ctx;
  if (!ctx) return;
  const p = preset || {};
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = p.cutoff || 1200;
  filter.Q.value = p.res || 0.5;
  filter.connect(gain); gain.connect(dest);

  const a = Math.max(0.003, p.attack || 0.01);
  const d = Math.max(0.01, p.decay || 0.3);
  const s = p.sustain == null ? 0.5 : p.sustain;
  const r = Math.max(0.02, p.release || 0.3);
  const peak = (p.gain || 0.5) * (vel == null ? 0.9 : vel);
  const off = when + Math.max(dur, a + 0.03);
  const stopAt = off + r + 0.25;

  const types = [p.osc1 || 'sine', p.osc2 || 'sine'];
  for (let i = 0; i < 2; i++) {
    if (!types[i] || types[i] === 'off') continue;
    const o = ctx.createOscillator();
    o.type = types[i];
    if (p.kind === 'pluck' && p.pitchDrop) {
      o.frequency.setValueAtTime(freq * 1.004, when);
      o.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
    } else {
      o.frequency.setValueAtTime(freq, when);
    }
    o.detune.value = i === 0 ? -(p.detune || 0) / 2 : (p.detune || 0);
    o.connect(filter);
    o.start(when);
    o.stop(stopAt);
    if (reg) reg(o);
  }

  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peak, when + a);
  gain.gain.setTargetAtTime(peak * s, when + a, d / 3);
  gain.gain.setTargetAtTime(0, off, r / 3);
}

/* ---------- game SFX approximations (mirrors the cues found in src/audio.js) ---------- */

export function playGameSfx(pack, dest, name, when, level = 1, reg) {
  const ctx = pack.ctx;
  const bus = ctx.createGain();
  bus.gain.value = level;
  bus.connect(dest);

  const osc = (type, freq, t0, dur, vol, f1, f2) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1 != null ? f1 : freq, t0);
    if (f2 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + dur * 0.8);
    else if (f1 != null && f1 !== freq) o.frequency.linearRampToValueAtTime(freq, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.12 * vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + dur + 0.05);
    if (reg) reg(o);
  };
  const noise = (t0, dur, filterType, freq, vol, q = 1) => {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(pack);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.25 * vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0); src.stop(t0 + dur + 0.05);
    if (reg) reg(src);
  };

  switch (name) {
    case 'meow': osc('triangle', 600, when, 0.35, 1, 600, 500); break;
    case 'purr': noise(when, 2.0, 'lowpass', 380, 1); break;
    case 'trill': [520, 740, 900].forEach((f, i) => osc('sine', f, when + i * 0.045, 0.18, 0.8, f * 1.1, f)); break;
    case 'hiss': noise(when, 0.4, 'highpass', 900, 1); break;
    case 'chirp': osc('sine', 1500, when, 0.12, 0.7, 1500, 2200); break;
    case 'lap': noise(when, 0.35, 'lowpass', 2600, 0.7); break;
    case 'bell': osc('sine', 520, when, 1.2, 1); osc('sine', 520 * 2.7, when, 0.8, 0.4); break;
    case 'keychime': [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => osc('sine', f, when + i * 0.08, 1.2, 0.9)); break;
    case 'collect': [523.25, 659.25, 783.99].forEach((f, i) => osc('sine', f * 2, when + i * 0.07, 0.9, 1)); break;
    case 'dream': [392, 493.88, 587.33, 783.99, 987.77].forEach((f, i) => osc('sine', f, when + i * 0.12, 2.2, 0.8)); break;
    case 'splash': noise(when, 0.4, 'lowpass', 1600, 1); break;
    case 'door': noise(when, 0.85, 'lowpass', 450, 0.9); break;
    case 'eat': [0, 1, 2].forEach((i) => osc('triangle', 320 - i * 40, when + i * 0.12, 0.08, 0.9, 320 - i * 40, 160)); break;
    case 'squawk': osc('sawtooth', 1200, when, 0.3, 0.9, 1200, 650); break;
    case 'unlock': [660, 990].forEach((f, i) => osc('sine', f, when + i * 0.02, 0.45, 0.9)); break;
    case 'footstep': noise(when, 0.1, 'lowpass', 650, 0.6); break;
    default: osc('sine', 440, when, 0.3, 1);
  }
  setTimeout(() => { try { bus.disconnect(); } catch (e) { /* noop */ } }, 8000);
}

/* ---------- ambient textures (rain / wind / birds / chimes / purr) ---------- */

export function playAmbient(pack, dest, name, when, dur, level = 1, reg) {
  const ctx = pack.ctx;
  const bus = ctx.createGain();
  bus.gain.value = 0.8 * level;
  bus.connect(dest);

  if (name === 'rain' || name === 'wind') {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(pack);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = name === 'rain' ? 500 : 320;
    src.connect(f); f.connect(bus);
    bus.gain.setValueAtTime(0.02 * level, when);
    src.start(when); src.stop(when + dur + 0.1);
    if (reg) reg(src);
    if (name === 'wind') {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 0.13; lg.gain.value = 0.3;
      lfo.connect(lg); lg.connect(bus.gain);
      try { lfo.start(when); lfo.stop(when + dur); } catch (e) { /* noop */ }
      if (reg) reg(lfo);
    }
  } else if (name === 'birds') {
    let t = when + 0.5;
    while (t < when + dur) {
      const base = 2200 + Math.random() * 1400;
      const syllables = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < syllables; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        const st = t + i * (0.12 + Math.random() * 0.06);
        o.frequency.setValueAtTime(base, st);
        o.frequency.linearRampToValueAtTime(base * (1.1 + Math.random() * 0.25), st + 0.05);
        o.frequency.linearRampToValueAtTime(base * 0.9, st + 0.1);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.03 * level, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, st + 0.11);
        o.connect(g); g.connect(bus);
        o.start(st); o.stop(st + 0.12);
        if (reg) reg(o);
      }
      t += 3 + Math.random() * 5;
    }
  } else if (name === 'chimes') {
    const pent = [1318.5, 1174.7, 1046.5, 880, 783.99];
    let t = when + 1.0;
    while (t < when + dur - 0.5) {
      const f = pent[Math.floor(Math.random() * pent.length)];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05 * level, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + 2.5);
      if (reg) reg(o);
      t += 2.5 + Math.random() * 6;
    }
  } else if (name === 'purr') {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(pack);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 380;
    const am = ctx.createOscillator();
    const amg = ctx.createGain();
    am.frequency.value = 27.5; amg.gain.value = 0.35;
    am.connect(amg); amg.connect(bus.gain);
    src.connect(f); f.connect(bus);
    src.start(when); src.stop(when + dur);
    try { am.start(when); am.stop(when + dur); } catch (e) { /* noop */ }
    if (reg) { reg(src); reg(am); }
  }
  setTimeout(() => { try { bus.disconnect(); } catch (e) { /* noop */ } }, (dur + 3) * 1000);
}
