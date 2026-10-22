/* dawCAT — Audacity-style Audio Manipulator & Sound Physics DSP engine.
   Pure synchronous DSP on AudioBuffers / Float32Arrays:
   - WSOLA (Waveform Similarity Overlap-Add) time-stretching (duration without pitch change)
   - Granular / resampled pitch shifting (-24..+24 semitones & fine cents without duration change)
   - Varispeed tape playback (speed 0.25x..4.0x)
   - Time reversal (full or region)
   - Loop points (loopStart, loopEnd, ping-pong bidirectional loop)
   - Trim / crop, silence region, fade in/out (linear, exponential, S-curve)
   - Normalize, gain boost, soft tape saturation/drive, bitcrush & sample-rate decimation
   - Highpass / Lowpass SVF filtering, Ring Modulation, Tremolo, and Baked Echo
   - Built-in procedural starter sample generator so Wave Lab & Sampler have rich audio out of the box. */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const STARTER_SAMPLES = [
  { id: 'starter:koto-pluck', name: 'Koto Silk Pluck (C4)', category: 'Instrument', rootMidi: 60, duration: 1.8, desc: 'Resonant plucked koto string at C4 — ideal for chromatic sampler & pitch shifting' },
  { id: 'starter:shakuhachi', name: 'Shakuhachi Flute (C4)', category: 'Instrument', rootMidi: 60, duration: 2.2, desc: 'Breathy bamboo flute note with natural vibrato — amazing when time-stretched' },
  { id: 'starter:temple-bell', name: 'Bonsho Temple Bell', category: 'Kyoto Foley', rootMidi: 60, duration: 3.0, desc: 'Deep bronze temple bell with shimmering metallic partials' },
  { id: 'starter:cat-meow', name: 'Philosopher Cat Meow', category: 'Voice / Cat', rootMidi: 69, duration: 1.1, desc: 'Expressive formant-shaped cat vocalization' },
  { id: 'starter:taiko-hit', name: 'Odaiko Thunder Hit', category: 'Percussion', rootMidi: 48, duration: 1.4, desc: 'Booming Japanese festival drum impact' },
  { id: 'starter:chime-arp', name: 'Inari Shrine Chime Phrase', category: 'Phrase', rootMidi: 60, duration: 2.4, desc: 'Sparkling pentatonic chime phrase — try reversing or half-speeding!' },
  { id: 'starter:lofi-chord', name: 'Warm Rhodes Minor 9th', category: 'Chord Stab', rootMidi: 60, duration: 2.2, desc: 'Lush dusty electric piano chord stab for lo-fi chopping & resampling' },
  { id: 'starter:vinyl-rain', name: 'Kyoto Rain & Vinyl Loop', category: 'Texture', rootMidi: 60, duration: 2.5, desc: 'Cozy rain patter with warm vinyl dust crackle' }
];

export const SOUND_PHYSICS_PRESETS = [
  { id: 'clean', name: 'Original (Bypass Physics)', desc: 'Unmodified audio signal', params: { speed: 1, stretch: 1, pitchSemis: 0, fineCents: 0, reverse: false, gain: 1, normalize: false, fadeIn: 0, fadeOut: 0, lowpass: 20000, highpass: 20, drive: 0, bitcrush: 16, downsample: 1, ringModHz: 0, tremoloRate: 0, echoDelay: 0 } },
  { id: 'half-tape', name: 'Half-Speed Tape (0.5x)', desc: 'Slows speed to 50% and drops pitch an octave like vintage reel-to-reel tape', params: { speed: 0.5, stretch: 1, pitchSemis: 0, lowpass: 4500, drive: 0.2 } },
  { id: 'double-tape', name: 'Double-Speed Chipmunk (2x)', desc: 'Doubles tape speed and raises pitch +12 semitones', params: { speed: 2.0, stretch: 1, pitchSemis: 0 } },
  { id: 'dream-stretch', name: 'Dream Time-Stretch (2x Slow, Same Pitch)', desc: 'Stretches duration to 200% while preserving original pitch', params: { speed: 1, stretch: 2.0, pitchSemis: 0, fadeIn: 0.15, fadeOut: 0.25 } },
  { id: 'reverse-swell', name: 'Reverse Ghost Swell', desc: 'Flips audio backward with a smooth fade-in swell and warm filtering', params: { reverse: true, speed: 1, stretch: 1.2, pitchSemis: 0, fadeIn: 0.2, fadeOut: 0.05, lowpass: 6500, echoDelay: 0.22, echoFeedback: 0.4 } },
  { id: 'octave-down', name: 'Sub Octave Monster (-12 st)', desc: 'Shifts pitch down 12 semitones without changing length, plus warm drive', params: { speed: 1, stretch: 1, pitchSemis: -12, drive: 0.3, lowpass: 3200, normalize: true } },
  { id: 'shimmer-up', name: 'Crystal Octave Up (+12 st)', desc: 'Shifts pitch up 12 semitones while keeping duration intact', params: { speed: 1, stretch: 1, pitchSemis: 12, highpass: 180, echoDelay: 0.18, echoFeedback: 0.35 } },
  { id: 'sp404-lofi', name: 'Kyoto Vinyl Sampler (12-Bit)', desc: 'Classic 12-bit sampler crunch with high/low roll-off and tape warmth', params: { bitcrush: 10, downsample: 3, lowpass: 3800, highpass: 140, drive: 0.35, normalize: true } },
  { id: '8bit-retro', name: '8-Bit Famicom Crunch', desc: 'Retro 6-bit quantization and 8x sample-rate decimation', params: { bitcrush: 6, downsample: 8, highpass: 200, normalize: true } },
  { id: 'spirit-ring', name: 'Yokai Spirit Ring-Mod', desc: 'Metallic bell-like ring modulation with tremolo and echo', params: { ringModHz: 220, ringModMix: 0.55, tremoloRate: 5.5, tremoloDepth: 0.45, echoDelay: 0.24, echoFeedback: 0.45 } }
];
export const PHYSICS_PRESETS = SOUND_PHYSICS_PRESETS;

export function defaultPhysicsParams(durationSec = 0) {
  return {
    trimStart: 0,
    trimEnd: durationSec > 0 ? Math.round(durationSec * 1000) / 1000 : 0,
    loop: false,
    loopStart: 0,
    loopEnd: durationSec > 0 ? Math.round(durationSec * 1000) / 1000 : 0,
    pingPong: false,
    reverse: false,
    speed: 1.0,
    stretch: 1.0,
    pitchSemis: 0,
    fineCents: 0,
    gain: 1.0,
    normalize: false,
    fadeIn: 0,
    fadeOut: 0,
    fadeCurve: 'exp',
    lowpass: 20000,
    highpass: 20,
    drive: 0,
    bitcrush: 16,
    downsample: 1,
    ringModHz: 0,
    ringModMix: 0.5,
    tremoloRate: 0,
    tremoloDepth: 0.5,
    echoDelay: 0,
    echoFeedback: 0.35,
    rootMidi: 60
  };
}

export function normalizePhysicsParams(raw = {}, durationSec = 0) {
  const d = defaultPhysicsParams(durationSec);
  const p = Object.assign({}, d, raw);
  p.trimStart = clamp(Number(p.trimStart) || 0, 0, Math.max(0, (durationSec || 600) - 0.01));
  const rawEnd = Number(p.trimEnd);
  p.trimEnd = rawEnd > p.trimStart + 0.01 ? (durationSec > 0 ? Math.min(durationSec, rawEnd) : rawEnd) : (durationSec || 0);
  p.loop = !!p.loop;
  p.loopStart = clamp(Number(p.loopStart) || 0, 0, Math.max(0, (p.trimEnd || durationSec || 600) - 0.01));
  const rawLoopEnd = Number(p.loopEnd);
  p.loopEnd = rawLoopEnd > p.loopStart + 0.01 ? rawLoopEnd : (p.trimEnd || durationSec || 0);
  p.pingPong = !!p.pingPong;
  p.reverse = !!p.reverse;
  p.speed = clamp(Number(p.speed) || 1, 0.25, 4.0);
  p.stretch = clamp(Number(p.stretch) || 1, 0.25, 4.0);
  p.pitchSemis = clamp(Math.round(Number(p.pitchSemis) || 0), -24, 24);
  p.fineCents = clamp(Math.round(Number(p.fineCents) || 0), -100, 100);
  p.gain = clamp(Number(p.gain ?? 1), 0, 3.0);
  p.normalize = !!p.normalize;
  p.fadeIn = clamp(Number(p.fadeIn) || 0, 0, 15);
  p.fadeOut = clamp(Number(p.fadeOut) || 0, 0, 15);
  p.fadeCurve = ['lin', 'exp', 'scurve'].includes(p.fadeCurve) ? p.fadeCurve : 'exp';
  p.lowpass = clamp(Number(p.lowpass) || 20000, 60, 20000);
  p.highpass = clamp(Number(p.highpass) || 20, 20, 8000);
  p.drive = clamp(Number(p.drive) || 0, 0, 1);
  p.bitcrush = clamp(Math.round(Number(p.bitcrush) || 16), 4, 16);
  p.downsample = clamp(Math.round(Number(p.downsample) || 1), 1, 32);
  p.ringModHz = clamp(Number(p.ringModHz) || 0, 0, 1200);
  p.ringModMix = clamp(Number(p.ringModMix ?? 0.5), 0, 1);
  p.tremoloRate = clamp(Number(p.tremoloRate) || 0, 0, 24);
  p.tremoloDepth = clamp(Number(p.tremoloDepth ?? 0.5), 0, 1);
  p.echoDelay = clamp(Number(p.echoDelay) || 0, 0, 0.6);
  p.echoFeedback = clamp(Number(p.echoFeedback ?? 0.35), 0, 0.85);
  p.rootMidi = clamp(Math.round(Number(p.rootMidi) || 60), 12, 108);
  return p;
}

/* Helper to allocate an AudioBuffer (or stand-in buffer in Node tests) */
export function makeAudioBuffer(ctx, channels, length, sampleRate) {
  const safeLen = Math.max(1, Math.floor(length));
  const safeCh = Math.max(1, channels || 1);
  const safeSr = sampleRate || (ctx && ctx.sampleRate) || 44100;
  if (ctx && typeof ctx.createBuffer === 'function') {
    return ctx.createBuffer(safeCh, safeLen, safeSr);
  }
  const data = Array.from({ length: safeCh }, () => new Float32Array(safeLen));
  return {
    numberOfChannels: safeCh,
    length: safeLen,
    sampleRate: safeSr,
    duration: safeLen / safeSr,
    getChannelData(c) { return data[c]; }
  };
}

/* ---------------- WSOLA Time-Stretch (Pitch-Preserving) ---------------- */

export function olaStretchChannel(input, stretchFactor, sampleRate = 44100) {
  const s = clamp(stretchFactor, 0.2, 5.0);
  if (Math.abs(s - 1) < 0.008 || input.length < 256) return new Float32Array(input);

  const outLen = Math.max(64, Math.round(input.length * s));
  const out = new Float32Array(outLen);
  const weight = new Float32Array(outLen);

  const winSize = Math.max(256, Math.min(4096, Math.round(sampleRate * 0.038)));
  const halfWin = winSize >> 1;
  const searchRange = Math.min(halfWin >> 1, Math.round(sampleRate * 0.008));

  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
  }

  let outPos = 0;
  let prevInPos = 0;

  while (outPos < outLen) {
    const targetInPos = Math.round((outPos / outLen) * Math.max(1, input.length - winSize));
    let bestOffset = 0;

    // WSOLA cross-correlation alignment against already-written overlap tail
    if (outPos > 0 && searchRange > 4 && targetInPos > searchRange && targetInPos + winSize + searchRange < input.length) {
      let bestCorr = -Infinity;
      const step = Math.max(1, searchRange >> 4);
      const checkLen = Math.min(halfWin, outLen - outPos);
      for (let off = -searchRange; off <= searchRange; off += step) {
        let corr = 0;
        const candStart = targetInPos + off;
        for (let k = 0; k < checkLen; k += 4) {
          corr += out[outPos + k] * input[candStart + k];
        }
        if (corr > bestCorr) {
          bestCorr = corr;
          bestOffset = off;
        }
      }
    }

    const inStart = clamp(targetInPos + bestOffset, 0, Math.max(0, input.length - 1));
    prevInPos = inStart;

    for (let i = 0; i < winSize; i++) {
      const oi = outPos + i;
      if (oi >= outLen) break;
      const ii = inStart + i;
      const sample = ii < input.length ? input[ii] : 0;
      const w = hann[i];
      out[oi] += sample * w;
      weight[oi] += w;
    }

    outPos += halfWin;
  }

  for (let i = 0; i < outLen; i++) {
    if (weight[i] > 1e-4) out[i] /= weight[i];
  }
  return out;
}

/* ---------------- Cubic Hermite Resampler ---------------- */

export function resampleChannel(input, rate) {
  const r = clamp(rate, 0.1, 8.0);
  if (Math.abs(r - 1) < 0.002 || input.length < 4) return new Float32Array(input);
  const outLen = Math.max(1, Math.round(input.length / r));
  const out = new Float32Array(outLen);
  const n = input.length;

  for (let i = 0; i < outLen; i++) {
    const pos = i * r;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const y0 = input[Math.max(0, idx - 1)];
    const y1 = input[Math.min(n - 1, idx)];
    const y2 = input[Math.min(n - 1, idx + 1)];
    const y3 = input[Math.min(n - 1, idx + 2)];
    const c0 = y1;
    const c1 = 0.5 * (y2 - y0);
    const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    out[i] = ((c3 * frac + c2) * frac + c1) * frac + c0;
  }
  return out;
}

/* ---------------- Filter, Drive, Bitcrush, Mod, Echo, Fades ---------------- */

function applyFilterChannel(data, sampleRate, highpassHz, lowpassHz) {
  const out = new Float32Array(data.length);
  const doHp = highpassHz > 25;
  const doLp = lowpassHz < 19500;
  if (!doHp && !doLp) { out.set(data); return out; }

  // 1-pole cascade (2-pole 12dB/oct response)
  const lpAlpha = doLp ? clamp(1 - Math.exp((-2 * Math.PI * lowpassHz) / sampleRate), 0.001, 0.999) : 1;
  const hpAlpha = doHp ? clamp(Math.exp((-2 * Math.PI * highpassHz) / sampleRate), 0.001, 0.999) : 0;

  let lp1 = 0, lp2 = 0;
  let hpY1 = 0, hpX1 = 0;
  for (let i = 0; i < data.length; i++) {
    let x = data[i];
    if (doHp) {
      const y = hpAlpha * (hpY1 + x - hpX1);
      hpX1 = x;
      hpY1 = y;
      x = y;
    }
    if (doLp) {
      lp1 += lpAlpha * (x - lp1);
      lp2 += lpAlpha * (lp1 - lp2);
      x = lp2;
    }
    out[i] = x;
  }
  return out;
}

function fadeGain(t, curve) {
  const f = clamp(t, 0, 1);
  if (curve === 'exp') return f * f;
  if (curve === 'scurve') return f * f * (3 - 2 * f);
  return f;
}

/* ---------------- Full Sound Physics Pipeline ---------------- */

export function processAudioBuffer(ctx, sourceBuffer, rawParams = {}) {
  if (!sourceBuffer) return null;
  const sr = sourceBuffer.sampleRate || 44100;
  const numCh = sourceBuffer.numberOfChannels || 1;
  const p = normalizePhysicsParams(rawParams, sourceBuffer.duration || sourceBuffer.length / sr);

  const startIdx = clamp(Math.floor(p.trimStart * sr), 0, Math.max(0, sourceBuffer.length - 1));
  const endIdx = p.trimEnd > p.trimStart + 0.005
    ? clamp(Math.ceil(p.trimEnd * sr), startIdx + 1, sourceBuffer.length)
    : sourceBuffer.length;

  const pitchRatio = Math.pow(2, (p.pitchSemis + p.fineCents / 100) / 12);
  // Stretch factor compensates for pitchRatio so pitchSemis doesn't alter duration,
  // while p.speed alters both duration and pitch (tape varispeed).
  const effectiveStretch = p.stretch * pitchRatio;
  const resampleRate = pitchRatio * p.speed;

  const processedChannels = [];

  for (let ch = 0; ch < numCh; ch++) {
    const raw = sourceBuffer.getChannelData(ch);
    let data = raw.slice(startIdx, endIdx);

    // 1. Reverse
    if (p.reverse) {
      data.reverse();
    }

    // 2. Time-Stretch (WSOLA)
    if (Math.abs(effectiveStretch - 1) >= 0.008) {
      data = olaStretchChannel(data, effectiveStretch, sr);
    }

    // 3. Resample (Pitch + Varispeed)
    if (Math.abs(resampleRate - 1) >= 0.002) {
      data = resampleChannel(data, resampleRate);
    }

    // 4. Filter Sculpt (Highpass + Lowpass)
    if (p.highpass > 25 || p.lowpass < 19500) {
      data = applyFilterChannel(data, sr, p.highpass, p.lowpass);
    }

    // 5. Tape Drive / Saturation
    if (p.drive > 0.005) {
      const k = 1 + p.drive * 8;
      const norm = 1 / Math.tanh(k);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.tanh(data[i] * k) * norm;
      }
    }

    // 6. Bitcrush & Sample-Rate Reduction
    if (p.bitcrush < 16 || p.downsample > 1) {
      const step = Math.pow(2, p.bitcrush - 1);
      const hold = Math.max(1, p.downsample);
      let held = 0;
      for (let i = 0; i < data.length; i++) {
        if (i % hold === 0) {
          held = p.bitcrush < 16 ? Math.round(data[i] * step) / step : data[i];
        }
        data[i] = held;
      }
    }

    // 7. Ring Modulation & Tremolo
    if (p.ringModHz > 0.5 || p.tremoloRate > 0.1) {
      const twoPi = 2 * Math.PI;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        let v = data[i];
        if (p.ringModHz > 0.5) {
          const mod = Math.sin(twoPi * p.ringModHz * t);
          v = v * (1 - p.ringModMix) + (v * mod) * p.ringModMix;
        }
        if (p.tremoloRate > 0.1) {
          const trem = 1 - p.tremoloDepth * 0.5 * (1 - Math.cos(twoPi * p.tremoloRate * t));
          v *= trem;
        }
        data[i] = v;
      }
    }

    // 8. Baked Echo
    if (p.echoDelay >= 0.01 && p.echoFeedback > 0.01) {
      const delaySamples = Math.max(1, Math.round(p.echoDelay * sr));
      const tailSamples = Math.min(sr * 2, delaySamples * 3);
      const echoed = new Float32Array(data.length + tailSamples);
      echoed.set(data);
      const fb = clamp(p.echoFeedback, 0, 0.85);
      for (let i = delaySamples; i < echoed.length; i++) {
        echoed[i] += echoed[i - delaySamples] * fb;
      }
      data = echoed;
    }

    // 9. Ping-Pong Loop Expansion
    if (p.pingPong && data.length > 64) {
      const ping = new Float32Array(data.length * 2);
      ping.set(data, 0);
      for (let i = 0; i < data.length; i++) {
        ping[data.length + i] = data[data.length - 1 - i];
      }
      data = ping;
    }

    processedChannels.push(data);
  }

  const outLen = processedChannels[0] ? processedChannels[0].length : 1;

  // 10. Gain & Peak Normalize
  let scale = p.gain;
  if (p.normalize) {
    let peak = 0;
    for (const chData of processedChannels) {
      for (let i = 0; i < chData.length; i++) {
        const a = Math.abs(chData[i]);
        if (a > peak) peak = a;
      }
    }
    if (peak > 1e-5) scale = (0.98 / peak) * p.gain;
  }

  // 11. Fade In / Fade Out + Final Clamping
  const fadeInSamples = Math.min(outLen, Math.floor(p.fadeIn * sr));
  const fadeOutSamples = Math.min(outLen, Math.floor(p.fadeOut * sr));
  const outBuf = makeAudioBuffer(ctx, numCh, outLen, sr);

  for (let ch = 0; ch < numCh; ch++) {
    const src = processedChannels[ch];
    const dst = outBuf.getChannelData(ch);
    for (let i = 0; i < outLen; i++) {
      let env = 1;
      if (fadeInSamples > 1 && i < fadeInSamples) {
        env *= fadeGain(i / fadeInSamples, p.fadeCurve);
      }
      if (fadeOutSamples > 1 && i >= outLen - fadeOutSamples) {
        env *= fadeGain((outLen - 1 - i) / fadeOutSamples, p.fadeCurve);
      }
      dst[i] = clamp(src[i] * scale * env, -1, 1);
    }
  }

  return outBuf;
}

/* ---------------- Audacity-Style Direct Region Edits ---------------- */

export function cropBufferToRegion(ctx, buffer, startSec, endSec) {
  const sr = buffer.sampleRate;
  const s0 = clamp(Math.floor(startSec * sr), 0, buffer.length - 1);
  const s1 = clamp(Math.ceil(endSec * sr), s0 + 1, buffer.length);
  const out = makeAudioBuffer(ctx, buffer.numberOfChannels, s1 - s0, sr);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.getChannelData(ch).set(buffer.getChannelData(ch).subarray(s0, s1));
  }
  return out;
}

export function silenceBufferRegion(ctx, buffer, startSec, endSec) {
  const sr = buffer.sampleRate;
  const s0 = clamp(Math.floor(startSec * sr), 0, buffer.length - 1);
  const s1 = clamp(Math.ceil(endSec * sr), s0 + 1, buffer.length);
  const out = makeAudioBuffer(ctx, buffer.numberOfChannels, buffer.length, sr);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const dst = out.getChannelData(ch);
    dst.set(buffer.getChannelData(ch));
    dst.fill(0, s0, s1);
  }
  return out;
}

export function reverseBufferRegion(ctx, buffer, startSec = 0, endSec = buffer.duration) {
  const sr = buffer.sampleRate;
  const s0 = clamp(Math.floor(startSec * sr), 0, buffer.length - 1);
  const s1 = clamp(Math.ceil(endSec * sr), s0 + 1, buffer.length);
  const out = makeAudioBuffer(ctx, buffer.numberOfChannels, buffer.length, sr);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    dst.set(src);
    for (let i = 0; i < s1 - s0; i++) {
      dst[s0 + i] = src[s1 - 1 - i];
    }
  }
  return out;
}

/* ---------------- Procedural Starter Sample Synthesizer ---------------- */

export function synthesizeStarterSample(ctx, sampleId, sampleRate = 44100) {
  const spec = STARTER_SAMPLES.find((s) => s.id === sampleId) || STARTER_SAMPLES[0];
  const sr = (ctx && ctx.sampleRate) || sampleRate;
  const len = Math.floor(spec.duration * sr);
  const buf = makeAudioBuffer(ctx, 2, len, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);

  let seed = 1337;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed / 1073741823.5) - 1; };

  if (spec.id === 'starter:koto-pluck') {
    // Karplus-Strong plucked string at C4 (261.63 Hz) + body resonance
    const freq = 261.63;
    const period = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) {
      ring[i] = rnd() * 0.7 + Math.sin((2 * Math.PI * i) / period) * 0.4;
    }
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const nextIdx = (idx + 1) % period;
      const cur = ring[idx];
      ring[idx] = (cur + ring[nextIdx]) * 0.4975;
      idx = nextIdx;
      const t = i / sr;
      const body = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3.2) * 0.35;
      const v = (cur * 0.75 + body) * Math.min(1, i / (sr * 0.003));
      L[i] = v;
      R[i] = v * 0.96;
    }
  } else if (spec.id === 'starter:shakuhachi') {
    // Breathy bamboo flute C4 with attack chiff and delayed vibrato
    const freq = 261.63;
    let bp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.14) * Math.exp(-Math.max(0, t - 1.4) * 3.5);
      const vib = t > 0.35 ? Math.sin(2 * Math.PI * 5.2 * (t - 0.35)) * 0.008 * Math.min(1, (t - 0.35) * 2) : 0;
      const f = freq * (1 + vib);
      const tone = Math.sin(2 * Math.PI * f * t) * 0.55
        + Math.sin(4 * Math.PI * f * t) * 0.22
        + Math.sin(6 * Math.PI * f * t) * 0.08;
      const chiffEnv = Math.exp(-t * 9) * 0.35 + env * 0.08;
      bp = bp * 0.88 + rnd() * 0.12;
      const v = (tone * env + bp * chiffEnv) * 0.85;
      L[i] = v;
      R[i] = v;
    }
  } else if (spec.id === 'starter:temple-bell') {
    // Deep bronze FM temple bell with inharmonic partials & slow beat
    const partials = [
      [220, 1.0, 1.1],
      [221.4, 0.7, 1.2],
      [594, 0.45, 2.2],
      [1012, 0.28, 3.6],
      [1580, 0.16, 5.5],
      [2340, 0.09, 8.0]
    ];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const att = Math.min(1, t / 0.004);
      let sumL = 0, sumR = 0;
      for (let p = 0; p < partials.length; p++) {
        const [f, amp, dec] = partials[p];
        const s = Math.sin(2 * Math.PI * f * t) * amp * Math.exp(-t * dec);
        sumL += s;
        sumR += p % 2 === 0 ? s : -s * 0.85;
      }
      L[i] = sumL * att * 0.52;
      R[i] = sumR * att * 0.52;
    }
  } else if (spec.id === 'starter:cat-meow') {
    // Expressive formant-swept cat meow
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const normT = t / spec.duration;
      const pitch = normT < 0.35
        ? 440 + (720 - 440) * (normT / 0.35)
        : 720 - (720 - 390) * ((normT - 0.35) / 0.65);
      const vib = Math.sin(2 * Math.PI * 6.5 * t) * 8;
      phase += (pitch + vib) / sr;
      const saw = 2 * (phase - Math.floor(phase + 0.5));
      const formant = Math.sin(2 * Math.PI * phase * 2) * 0.5 + Math.sin(2 * Math.PI * phase * 3) * 0.25;
      const env = Math.sin(Math.PI * Math.pow(normT, 0.75));
      const v = (saw * 0.35 + formant * 0.65) * env * 0.75;
      L[i] = v;
      R[i] = v;
    }
  } else if (spec.id === 'starter:taiko-hit') {
    // Booming Japanese odaiko impact
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = 58 + 115 * Math.exp(-t * 24);
      phase += f / sr;
      const body = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 3.2);
      const sub = Math.sin(Math.PI * phase) * Math.exp(-t * 2.4) * 0.5;
      const slap = rnd() * Math.exp(-t * 45) * 0.45;
      const v = clamp((body + sub + slap) * 0.85, -1, 1);
      L[i] = v;
      R[i] = v;
    }
  } else if (spec.id === 'starter:chime-arp') {
    // Sparkling pentatonic phrase (C5, D5, E5, G5, A5, C6)
    const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let sumL = 0, sumR = 0;
      for (let n = 0; n < notes.length; n++) {
        const onset = n * 0.28;
        if (t < onset) continue;
        const dt = t - onset;
        const f = notes[n];
        const env = Math.min(1, dt / 0.003) * Math.exp(-dt * 2.8);
        const sig = (Math.sin(2 * Math.PI * f * dt) + 0.3 * Math.sin(2 * Math.PI * f * 2.01 * dt)) * env * 0.28;
        sumL += sig * (1 - n * 0.08);
        sumR += sig * (0.6 + n * 0.08);
      }
      L[i] = clamp(sumL, -1, 1);
      R[i] = clamp(sumR, -1, 1);
    }
  } else if (spec.id === 'starter:lofi-chord') {
    // Warm Rhodes Cm9 chord (C3, G3, Bb3, Eb4, D5)
    const chord = [130.81, 196.0, 233.08, 311.13, 587.33];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.012) * Math.exp(-t * 1.45);
      const tineEnv = Math.exp(-t * 9.0) * 0.18;
      const trem = 0.88 + 0.12 * Math.sin(2 * Math.PI * 3.8 * t);
      let s = 0;
      for (const f of chord) {
        s += Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 2 * t) * tineEnv) * 0.22;
      }
      L[i] = s * env * trem;
      R[i] = s * env * (1.76 - trem);
    }
  } else {
    // starter:vinyl-rain — Cozy rain + vinyl dust crackle
    let rainL = 0, rainR = 0;
    for (let i = 0; i < len; i++) {
      rainL = rainL * 0.93 + rnd() * 0.07;
      rainR = rainR * 0.93 + rnd() * 0.07;
      const pop = Math.abs(rnd()) > 0.9985 ? rnd() * 0.55 : 0;
      L[i] = clamp(rainL * 0.65 + pop, -1, 1);
      R[i] = clamp(rainR * 0.65 + pop * 0.8, -1, 1);
    }
  }

  return buf;
}
