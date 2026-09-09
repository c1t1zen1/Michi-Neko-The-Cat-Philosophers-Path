/* dawCAT — FX device rack: each device wraps an input/output node pair */

export function makeImpulse(ctx, seconds = 2.2, decay = 2.4) {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

const DELAY_SYNC = { '1/16': 0.25, '1/8': 0.5, '1/8D': 0.75, '1/4': 1, '1/4D': 1.5, '1/2': 2 };

function baseIO(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  return { input, output };
}

function eq8(ctx, params) {
  const { input, output } = baseIO(ctx);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = params.hpFreq || 30;
  const bands = params.bands.map((b) => {
    const f = ctx.createBiquadFilter();
    f.type = b2t(b.type); f.frequency.value = b.freq; f.Q.value = b.q || 1; f.gain.value = b.gain || 0;
    return f;
  });
  let head = input;
  const all = [hp, ...bands];
  for (const f of all) { head.connect(f); head = f; }
  head.connect(output);
  apply();

  function b2t(t) { return t === 'lowshelf' ? 'lowshelf' : t === 'highshelf' ? 'highshelf' : 'peaking'; }
  function apply() {
    hp.frequency.value = params.hpFreq || 30;
    bands.forEach((f, i) => {
      const b = params.bands[i];
      f.type = b2t(b.type);
      f.frequency.value = clamp(b.freq, 20, 20000);
      f.Q.value = clamp(b.q || 1, 0.1, 12);
      f.gain.value = clamp(b.gain || 0, -24, 24);
    });
  }
  return {
    input, output,
    update(p) { Object.assign(params, p); apply(); },
    getResponse(freqs) {
      const mag = new Float32Array(freqs.length).fill(1);
      const tmp = new Float32Array(freqs.length);
      const phase = new Float32Array(freqs.length);
      for (const f of all) {
        f.getFrequencyResponse(freqs, tmp, phase);
        for (let i = 0; i < freqs.length; i++) mag[i] *= tmp[i];
      }
      return mag;
    },
    dispose() { try { input.disconnect(); output.disconnect(); bands.forEach((f) => f.disconnect()); hp.disconnect(); } catch (e) { /* noop */ } }
  };
}

function comp(ctx, params) {
  const { input, output } = baseIO(ctx);
  const c = ctx.createDynamicsCompressor();
  const makeup = ctx.createGain();
  input.connect(c); c.connect(makeup); makeup.connect(output);
  apply();
  function apply() {
    c.threshold.value = params.threshold; c.ratio.value = params.ratio;
    c.attack.value = params.attack; c.release.value = params.release;
    c.knee.value = params.knee;
    makeup.gain.value = params.makeup || 1;
  }
  return {
    input, output,
    update(p) { Object.assign(params, p); apply(); },
    dispose() { try { input.disconnect(); output.disconnect(); } catch (e) { /* noop */ } }
  };
}

function delayFx(ctx, params, pack) {
  const { input, output } = baseIO(ctx);
  const dry = ctx.createGain(); dry.gain.value = 1;
  const wet = ctx.createGain();
  const delay = ctx.createDelay(2.5);
  const fb = ctx.createGain();
  input.connect(dry); dry.connect(output);
  input.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(output);
  apply();
  function apply() {
    const sync = params.sync || '1/8';
    let sec = params.timeMs / 1000;
    if (sync !== 'free') {
      const beat = 60 / (pack.bpm || 110);
      sec = beat * (DELAY_SYNC[sync] || 0.5);
    }
    delay.delayTime.setTargetAtTime(clamp(sec, 0.01, 1.9), ctx.currentTime, 0.05);
    fb.gain.setTargetAtTime(clamp(params.feedback, 0, 0.92), ctx.currentTime, 0.05);
    wet.gain.setTargetAtTime(params.wet, ctx.currentTime, 0.05);
    dry.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
  }
  return {
    input, output,
    update(p) { Object.assign(params, p); apply(); },
    dispose() { try { input.disconnect(); output.disconnect(); } catch (e) { /* noop */ } }
  };
}

function reverbFx(ctx, params, pack) {
  const { input, output } = baseIO(ctx);
  const conv = ctx.createConvolver();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  input.connect(dry); dry.connect(output);
  input.connect(conv); conv.connect(wet); wet.connect(output);
  let curSize = -1;
  apply();
  function apply() {
    wet.gain.value = params.wet; dry.gain.value = 1 - params.wet * 0.4;
    if (Math.abs(params.size - curSize) > 0.05) {
      curSize = params.size;
      // Regenerate IR asynchronously to avoid blocking the audio thread
      const size = clamp(params.size, 0.2, 6), decay = clamp(params.decay, 0.5, 6);
      setTimeout(() => { try { conv.buffer = makeImpulse(ctx, size, decay); } catch (e) { /* noop */ } }, 0);
    }
  }
  return {
    input, output,
    update(p) { Object.assign(params, p); apply(); },
    dispose() { try { input.disconnect(); output.disconnect(); } catch (e) { /* noop */ } }
  };
}

function filterFx(ctx, params) {
  const { input, output } = baseIO(ctx);
  const f = ctx.createBiquadFilter();
  input.connect(f); f.connect(output);
  apply();
  function apply() {
    f.type = params.type || 'lowpass';
    f.frequency.value = clamp(params.freq, 20, 20000);
    f.Q.value = clamp(params.q, 0.0001, 24);
  }
  return {
    input, output,
    update(p) { Object.assign(params, p); apply(); },
    getResponse(freqs) {
      const mag = new Float32Array(freqs.length), ph = new Float32Array(freqs.length);
      f.getFrequencyResponse(freqs, mag, ph);
      return mag;
    },
    dispose() { try { input.disconnect(); output.disconnect(); } catch (e) { /* noop */ } }
  };
}

function chorusFx(ctx, params) {
  const { input, output } = baseIO(ctx);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const dl = ctx.createDelay(0.2);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  input.connect(dry); dry.connect(output);
  input.connect(dl); dl.connect(wet); wet.connect(output);
  lfo.connect(lfoGain); lfoGain.connect(dl.delayTime);
  let started = false;
  apply();
  function apply() {
    if (!started && params.mix > 0) { try { lfo.start(); started = true; } catch (e) { /* noop */ } }
    lfo.frequency.value = params.rate;
    lfoGain.gain.value = params.depth * 0.012;
    dl.delayTime.value = 0.025;
    wet.gain.value = params.mix; dry.gain.value = 1 - params.mix * 0.5;
  }
  return {
    input, output,
    update(p) { Object.assign(params, p); apply(); },
    dispose() { try { lfo.stop(); input.disconnect(); output.disconnect(); } catch (e) { /* noop */ } }
  };
}

function utility(ctx, params) {
  const { input, output } = baseIO(ctx);
  const g = ctx.createGain();
  input.connect(g); g.connect(output);
  apply();
  function apply() { g.gain.value = params.gain; }
  return {
    input, output,
    update(p) { Object.assign(params, p); apply(); },
    dispose() { try { input.disconnect(); output.disconnect(); } catch (e) { /* noop */ } }
  };
}

export function createDeviceNode(pack, def) {
  const { ctx } = pack;
  switch (def.type) {
    case 'eq8': return eq8(ctx, def.params);
    case 'comp': return comp(ctx, def.params);
    case 'delay': return delayFx(ctx, def.params, pack);
    case 'reverb': return reverbFx(ctx, def.params, pack);
    case 'filter': return filterFx(ctx, def.params);
    case 'chorus': return chorusFx(ctx, def.params);
    case 'utility': return utility(ctx, def.params);
    default: return utility(ctx, { gain: 1 });
  }
}

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
