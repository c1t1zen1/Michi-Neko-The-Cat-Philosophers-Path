/* dawCAT — procedural SFX synthesizer.

   sfxRuntime() is deliberately SELF-CONTAINED: no imports and no references
   to anything outside its own body except browser globals (Math, Float32Array,
   WeakMap, Map, setTimeout). Exports embed `sfxRuntime.toString()` verbatim
   (the same trick bridge.js uses for the music player), so the sound you
   design in dawCAT is produced by exactly the same code inside the game.

   A patch is a list of layers mixed into one bus, followed by optional drive,
   high/low-pass and a seeded convolution reverb. Each layer is one of:
     tone  — oscillator with pitch sweep and vibrato
     fm    — carrier + modulator (bells, gongs, metallic hits)
     noise — white/pink/brown noise through a sweepable filter
     pluck — Karplus–Strong string (koto-like plucks)
   with a one-shot AHDSR envelope, optional repeats (pitch/gain stepped),
   tremolo and pan. All randomness is seeded, so a render is reproducible and
   `opts.variation` picks a different but stable round-robin variant. */
export function sfxRuntime() {
  const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
  const KINDS = ['tone', 'noise', 'fm', 'pluck'];
  const FILTERS = ['lowpass', 'highpass', 'bandpass', 'notch', 'off'];
  const COLORS = ['white', 'pink', 'brown'];
  const FLOOR = 0.0001;

  const clamp = (v, lo, hi, d) => {
    const n = typeof v === 'boolean' ? NaN : Number(v);
    return v === null || v === undefined || v === '' || !Number.isFinite(n) ? d : Math.min(hi, Math.max(lo, n));
  };
  const oneOf = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  const optional = (v, lo, hi) => (v === null || v === undefined || v === '' ? null : clamp(v, lo, hi, null));

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normLayer(l, i) {
    l = l && typeof l === 'object' ? l : {};
    const env = l.env || {}, f = l.filter || {}, rep = l.repeat || {}, vib = l.vibrato || {}, trem = l.tremolo || {};
    return {
      id: typeof l.id === 'string' && l.id ? l.id.slice(0, 40) : 'L' + (i + 1),
      on: l.on !== false,
      kind: oneOf(l.kind, KINDS, 'tone'),
      wave: oneOf(l.wave, WAVES, 'sine'),
      freq: clamp(l.freq, 20, 16000, 440),
      freqEnd: optional(l.freqEnd, 20, 16000),
      sweep: l.sweep === 'lin' ? 'lin' : 'exp',
      sweepTime: optional(l.sweepTime, 0.001, 10),
      fmRatio: clamp(l.fmRatio, 0.01, 32, 2),
      fmDepth: clamp(l.fmDepth, 0, 20000, 200),
      noiseColor: oneOf(l.noiseColor, COLORS, 'white'),
      filter: { type: oneOf(f.type, FILTERS, 'off'), freq: clamp(f.freq, 20, 20000, 2000), freqEnd: optional(f.freqEnd, 20, 20000), q: clamp(f.q, 0.0001, 30, 0.8) },
      env: { attack: clamp(env.attack, 0, 5, 0.005), hold: clamp(env.hold, 0, 5, 0), decay: clamp(env.decay, 0.001, 10, 0.2), sustain: clamp(env.sustain, 0, 1, 0), release: clamp(env.release, 0.001, 10, 0.1) },
      start: clamp(l.start, 0, 10, 0),
      gain: clamp(l.gain, 0, 1.5, 0.5),
      pan: clamp(l.pan, -1, 1, 0),
      repeat: { count: Math.round(clamp(rep.count, 1, 16, 1)), interval: clamp(rep.interval, 0.005, 2, 0.1), pitchStep: clamp(rep.pitchStep, -24, 24, 0), gainStep: clamp(rep.gainStep, 0, 1.5, 1) },
      vibrato: { rate: clamp(vib.rate, 0, 40, 0), depth: clamp(vib.depth, 0, 1200, 0) },
      tremolo: { rate: clamp(trem.rate, 0, 60, 0), depth: clamp(trem.depth, 0, 1, 0) }
    };
  }

  function normalize(p) {
    p = p && typeof p === 'object' ? p : {};
    const fx = p.fx || {}, v = p.variation || {};
    return {
      id: typeof p.id === 'string' ? p.id.slice(0, 60) : '',
      name: String(p.name || 'Untitled SFX').slice(0, 60),
      category: String(p.category || 'Objects').slice(0, 30),
      tags: Array.isArray(p.tags) ? p.tags.map(String).slice(0, 8) : [],
      gain: clamp(p.gain, 0, 2, 0.8),
      seed: Math.round(clamp(p.seed, 1, 2147483646, 1)),
      // "playMeow", or "playFootstep:wood" to replace only one argument's sound.
      gameHook: typeof p.gameHook === 'string' ? p.gameHook.replace(/[^\w$:]/g, '').slice(0, 60) : '',
      variation: { pitch: clamp(v.pitch, 0, 1200, 0), time: clamp(v.time, 0, 1, 0), gain: clamp(v.gain, 0, 1, 0) },
      fx: { lowpass: clamp(fx.lowpass, 200, 20000, 20000), highpass: clamp(fx.highpass, 20, 8000, 20), reverb: clamp(fx.reverb, 0, 1, 0), reverbTime: clamp(fx.reverbTime, 0.1, 8, 1.5), drive: clamp(fx.drive, 0, 1, 0) },
      layers: (Array.isArray(p.layers) ? p.layers : []).slice(0, 12).map(normLayer)
    };
  }

  /* Seconds from a hit's start until it is silent. */
  function hitLength(layer, stretch) {
    const e = layer.env;
    const body = (e.attack + e.hold + e.decay) * stretch;
    return layer.kind === 'pluck' ? body + Math.max(0.05, e.release * stretch) : body + (e.sustain > 0 ? e.release * stretch : 0);
  }

  function layerEnd(layer, stretch) {
    const r = layer.repeat;
    return layer.start * stretch + (r.count - 1) * r.interval * stretch + hitLength(layer, stretch);
  }

  /* Per-layer hit spans (seconds, canonical variation) — the editor's lanes. */
  function timeline(patch) {
    const p = normalize(patch);
    return p.layers.map((l, index) => {
      const hits = [];
      for (let k = 0; k < l.repeat.count; k++) {
        const start = l.start + k * l.repeat.interval;
        hits.push({ start, end: start + hitLength(l, 1) });
      }
      return { index, id: l.id, kind: l.kind, on: l.on && l.gain > 0, hits };
    });
  }

  function duration(patch) {
    const p = normalize(patch);
    let end = 0;
    for (const l of p.layers) if (l.on && l.gain > 0) end = Math.max(end, layerEnd(l, 1));
    return end + (p.fx.reverb > 0 ? p.fx.reverbTime : 0) + 0.02;
  }

  /* ---------- cached buffers (per context) ---------- */

  const caches = new WeakMap();
  function cacheFor(ctx) {
    let c = caches.get(ctx);
    if (!c) { c = new Map(); caches.set(ctx, c); }
    return c;
  }

  function noise(ctx, color, seconds, seed) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * Math.min(10, Math.max(0.01, seconds))));
    const key = `n:${color}:${len}:${seed}`;
    const cache = cacheFor(ctx);
    if (cache.has(key)) return cache.get(key);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    const rnd = mulberry32(seed);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = rnd() * 2 - 1;
      if (color === 'pink') {
        // Paul Kellet's refined pink-noise filter.
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else if (color === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        d[i] = w;
      }
    }
    cache.set(key, buf);
    return buf;
  }

  function impulse(ctx, seconds, seed) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const key = `ir:${len}:${seed}`;
    const cache = cacheFor(ctx);
    if (cache.has(key)) return cache.get(key);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const rnd = mulberry32(seed * 31 + ch + 7);
      for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    cache.set(key, buf);
    return buf;
  }

  /* Karplus–Strong: a noise burst one period long, fed back through a
     two-tap averaging filter whose loss gives `decay` seconds to -60 dB. */
  function karplus(ctx, freq, seconds, decay, seed) {
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * Math.min(8, Math.max(0.05, seconds))));
    const period = Math.max(2, Math.round(sr / freq));
    const key = `ks:${period}:${len}:${Math.round(decay * 1000)}:${seed}`;
    const cache = cacheFor(ctx);
    if (cache.has(key)) return cache.get(key);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const rnd = mulberry32(seed + period);
    const loss = Math.pow(0.001, 1 / Math.max(1, freq * Math.max(0.05, decay)));
    for (let i = 0; i < len; i++) {
      if (i < period) d[i] = rnd() * 2 - 1;
      else d[i] = loss * 0.5 * (d[i - period] + d[i - period + 1]);
    }
    cache.set(key, buf);
    return buf;
  }

  function driveCurve(amount) {
    const n = 1024, curve = new Float32Array(n), k = 1 + amount * 24;
    const norm = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(k * x) / norm; }
    return curve;
  }

  function ramp(param, kind, value, time) {
    if (kind === 'lin') param.linearRampToValueAtTime(value, time);
    else param.exponentialRampToValueAtTime(Math.max(FLOOR, value), time);
  }

  /* ---------- one hit of one layer ---------- */

  function playHit(ctx, out, layer, t, freqMul, gainMul, stretch, rnd, register) {
    const e = layer.env;
    const a = e.attack * stretch, h = e.hold * stretch, d = Math.max(0.001, e.decay * stretch), r = Math.max(0.001, e.release * stretch);
    const s = layer.kind === 'pluck' ? 1 : e.sustain;
    const peak = layer.gain * gainMul;
    const bodyEnd = t + a + h + d;
    const end = t + hitLength(layer, stretch);
    const f0 = Math.min(20000, layer.freq * freqMul);
    const f1 = layer.freqEnd !== null ? Math.min(20000, layer.freqEnd * freqMul) : null;
    const sweepEnd = t + Math.max(0.001, layer.sweepTime !== null ? layer.sweepTime * stretch : a + h + d);
    const sources = [];

    // amplitude envelope
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    if (a > 0.0005) amp.gain.linearRampToValueAtTime(peak, t + a);
    else amp.gain.setValueAtTime(peak, t);
    amp.gain.setValueAtTime(peak, t + a + h);
    if (s >= 1) amp.gain.setValueAtTime(peak, bodyEnd);
    else amp.gain.exponentialRampToValueAtTime(Math.max(FLOOR, peak * s), bodyEnd);
    if (end > bodyEnd) amp.gain.exponentialRampToValueAtTime(FLOOR, end);
    amp.gain.setValueAtTime(0, end + 0.002);

    let tail = amp;
    if (layer.tremolo.rate > 0 && layer.tremolo.depth > 0) {
      const trem = ctx.createGain();
      trem.gain.value = 1 - layer.tremolo.depth / 2;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = layer.tremolo.rate;
      const depth = ctx.createGain();
      depth.gain.value = layer.tremolo.depth / 2;
      lfo.connect(depth); depth.connect(trem.gain);
      lfo.start(t); lfo.stop(end + 0.05);
      sources.push(lfo);
      tail.connect(trem); tail = trem;
    }
    if (layer.pan !== 0 && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = layer.pan;
      tail.connect(pan); tail = pan;
    }
    tail.connect(out);

    // optional filter in front of the envelope
    let input = amp;
    let filter = null;
    if (layer.filter.type !== 'off') {
      filter = ctx.createBiquadFilter();
      filter.type = layer.filter.type;
      filter.frequency.setValueAtTime(layer.filter.freq, t);
      if (layer.filter.freqEnd !== null) ramp(filter.frequency, layer.sweep, layer.filter.freqEnd, sweepEnd);
      filter.Q.value = layer.filter.q;
      filter.connect(amp);
      input = filter;
    }

    const vibrato = (param) => {
      if (!(layer.vibrato.rate > 0 && layer.vibrato.depth > 0)) return;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = layer.vibrato.rate;
      const depth = ctx.createGain();
      depth.gain.value = layer.vibrato.depth;
      lfo.connect(depth); depth.connect(param);
      lfo.start(t); lfo.stop(end + 0.05);
      sources.push(lfo);
    };

    if (layer.kind === 'tone' || layer.kind === 'fm') {
      const osc = ctx.createOscillator();
      osc.type = layer.wave;
      osc.frequency.setValueAtTime(f0, t);
      if (f1 !== null) ramp(osc.frequency, layer.sweep, f1, sweepEnd);
      vibrato(osc.detune);
      if (layer.kind === 'fm') {
        const mod = ctx.createOscillator();
        mod.frequency.setValueAtTime(Math.min(20000, f0 * layer.fmRatio), t);
        if (f1 !== null) ramp(mod.frequency, layer.sweep, Math.min(20000, f1 * layer.fmRatio), sweepEnd);
        const index = ctx.createGain();
        // Brightness decays with the note, as it does on a struck bell.
        index.gain.setValueAtTime(Math.max(FLOOR, layer.fmDepth), t);
        index.gain.exponentialRampToValueAtTime(Math.max(FLOOR, layer.fmDepth * 0.15), Math.max(t + 0.01, bodyEnd));
        mod.connect(index); index.connect(osc.frequency);
        mod.start(t); mod.stop(end + 0.05);
        sources.push(mod);
      }
      osc.connect(input);
      osc.start(t); osc.stop(end + 0.05);
      sources.push(osc);
    } else if (layer.kind === 'noise') {
      const src = ctx.createBufferSource();
      const buf = noise(ctx, layer.noiseColor, 2, 1 + Math.floor(rnd() * 8));
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = Math.max(0.25, Math.min(4, freqMul));
      if (filter) vibrato(filter.detune);
      src.connect(input);
      src.start(t, rnd() * Math.max(0, buf.duration - 0.05));
      src.stop(end + 0.05);
      sources.push(src);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = karplus(ctx, f0, end - t + 0.05, d + r, 1 + Math.floor(rnd() * 1000));
      if (f1 !== null) { src.playbackRate.setValueAtTime(1, t); ramp(src.playbackRate, layer.sweep, Math.max(0.05, Math.min(8, f1 / f0)), sweepEnd); }
      vibrato(src.detune);
      src.connect(input);
      src.start(t);
      src.stop(end + 0.05);
      sources.push(src);
    }
    if (register) for (const n of sources) register(n);
    return end;
  }

  /* Plays `patch` into `dest` at `when`. opts: { variation (0 = canonical,
     1+ = seeded variant), pitch (cents), gain, register(node) }. Returns
     { start, end, duration } in context time. */
  function play(ctx, dest, patch, when, opts) {
    opts = opts || {};
    const p = normalize(patch);
    const t0 = Math.max(ctx.currentTime, Number.isFinite(when) ? when : ctx.currentTime);
    const variation = Math.max(0, Math.round(Number(opts.variation) || 0));
    const rnd = mulberry32((p.seed * 2654435761 + variation * 7919) >>> 0);
    let cents = Number(opts.pitch) || 0;
    let stretch = 1;
    let gainMul = Number.isFinite(Number(opts.gain)) && opts.gain !== null && opts.gain !== undefined ? Number(opts.gain) : 1;
    if (variation > 0) {
      cents += (rnd() * 2 - 1) * p.variation.pitch;
      stretch = 1 + (rnd() * 2 - 1) * p.variation.time * 0.25;
      gainMul *= 1 - rnd() * p.variation.gain * 0.5;
    }
    const freqMul = Math.pow(2, cents / 1200);

    const bus = ctx.createGain();
    bus.gain.value = p.gain * Math.max(0, gainMul);
    let head = bus;
    if (p.fx.drive > 0 && ctx.createWaveShaper) {
      const ws = ctx.createWaveShaper();
      ws.curve = driveCurve(p.fx.drive);
      ws.oversample = '2x';
      head.connect(ws); head = ws;
    }
    if (p.fx.highpass > 25) {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = p.fx.highpass;
      head.connect(hp); head = hp;
    }
    if (p.fx.lowpass < 19500) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.fx.lowpass;
      head.connect(lp); head = lp;
    }
    head.connect(dest);
    if (p.fx.reverb > 0 && ctx.createConvolver) {
      const conv = ctx.createConvolver();
      conv.buffer = impulse(ctx, p.fx.reverbTime, p.seed);
      const wet = ctx.createGain();
      wet.gain.value = p.fx.reverb;
      head.connect(conv); conv.connect(wet); wet.connect(dest);
    }

    let end = t0;
    for (const layer of p.layers) {
      if (!layer.on || layer.gain <= 0) continue;
      const r = layer.repeat;
      for (let k = 0; k < r.count; k++) {
        const t = t0 + (layer.start + k * r.interval) * stretch;
        const fm = freqMul * Math.pow(2, (k * r.pitchStep) / 12);
        const gm = Math.pow(r.gainStep, k);
        if (gm <= 0) continue;
        end = Math.max(end, playHit(ctx, bus, layer, t, fm, gm, stretch, rnd, opts.register));
      }
    }
    if (p.fx.reverb > 0) end += p.fx.reverbTime;
    if (typeof ctx.startRendering !== 'function' && typeof setTimeout === 'function') {
      setTimeout(() => { try { bus.disconnect(); } catch (e) { /* already gone */ } }, Math.max(0, end - ctx.currentTime + 1) * 1000);
    }
    return { start: t0, end, duration: end - t0 };
  }

  return { play, duration, timeline, normalize, noise, version: 1 };
}
