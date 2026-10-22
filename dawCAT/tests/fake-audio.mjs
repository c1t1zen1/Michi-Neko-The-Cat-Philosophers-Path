/* A strict stand-in for the Web Audio graph. It records node creation and
   AudioParam automation, and throws the same way browsers do for values that
   would crash a real AudioContext (non-finite numbers, negative times,
   exponential ramps to zero), so tests catch them under Node. */

function check(v, what) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError(`${what}: non-finite value ${v}`);
}

class FakeParam {
  constructor(ctx, name, value = 0) { this.ctx = ctx; this.name = name; this._value = value; this.events = []; }
  get value() { return this._value; }
  set value(v) { check(v, `${this.name}.value`); this._value = v; }
  setValueAtTime(v, t) { check(v, `${this.name}.setValueAtTime value`); check(t, `${this.name}.setValueAtTime time`); if (t < 0) throw new RangeError('negative time'); this.events.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { check(v, `${this.name}.linearRamp value`); check(t, `${this.name}.linearRamp time`); if (t < 0) throw new RangeError('negative time'); this.events.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) {
    check(v, `${this.name}.expRamp value`); check(t, `${this.name}.expRamp time`);
    if (v === 0) throw new RangeError(`${this.name}: exponential ramp to 0`);
    if (t < 0) throw new RangeError('negative time');
    this.events.push(['exp', v, t]); return this;
  }
  setTargetAtTime(v, t, c) { check(v, 'target value'); check(t, 'target time'); check(c, 'target constant'); if (c <= 0) throw new RangeError('time constant must be > 0'); this.events.push(['target', v, t, c]); return this; }
  cancelScheduledValues(t) { check(t, 'cancel time'); return this; }
}

class FakeNode {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.outputs = []; ctx.nodes.push(this); }
  connect(target) { if (!target) throw new TypeError('connect to nothing'); this.outputs.push(target); return target; }
  disconnect() { this.outputs = []; }
}

class FakeSource extends FakeNode {
  start(t = 0, offset = 0, dur) {
    check(t, `${this.kind}.start time`); if (t < 0) throw new RangeError('negative start');
    check(offset, `${this.kind}.start offset`); if (dur !== undefined) check(dur, `${this.kind}.start duration`);
    this.startedAt = t;
  }
  stop(t = 0) { check(t, `${this.kind}.stop time`); if (t < 0) throw new RangeError('negative stop'); this.stoppedAt = t; }
}

class FakeBuffer {
  constructor(channels, length, sampleRate) {
    if (!(length > 0) || !Number.isInteger(length)) throw new RangeError(`bad buffer length ${length}`);
    this.numberOfChannels = channels; this.length = length; this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._data = Array.from({ length: channels }, () => new Float32Array(length));
  }
  getChannelData(i) { return this._data[i]; }
}

export class FakeAudioContext {
  constructor({ sampleRate = 8000, currentTime = 0 } = {}) {
    this.sampleRate = sampleRate; this.currentTime = currentTime; this.nodes = [];
    this.destination = new FakeNode(this, 'destination');
  }
  createGain() { const n = new FakeNode(this, 'gain'); n.gain = new FakeParam(this, 'gain', 1); return n; }
  createOscillator() { const n = new FakeSource(this, 'oscillator'); n.type = 'sine'; n.frequency = new FakeParam(this, 'frequency', 440); n.detune = new FakeParam(this, 'detune', 0); return n; }
  createBiquadFilter() { const n = new FakeNode(this, 'biquad'); n.type = 'lowpass'; n.frequency = new FakeParam(this, 'filter.frequency', 350); n.Q = new FakeParam(this, 'Q', 1); n.gain = new FakeParam(this, 'filter.gain', 0); n.detune = new FakeParam(this, 'filter.detune', 0); return n; }
  createBufferSource() { const n = new FakeSource(this, 'bufferSource'); n.buffer = null; n.loop = false; n.playbackRate = new FakeParam(this, 'playbackRate', 1); n.detune = new FakeParam(this, 'source.detune', 0); return n; }
  createBuffer(ch, len, sr) { return new FakeBuffer(ch, len, sr); }
  createConvolver() { const n = new FakeNode(this, 'convolver'); n.buffer = null; return n; }
  createWaveShaper() { const n = new FakeNode(this, 'waveshaper'); n.curve = null; n.oversample = 'none'; return n; }
  createStereoPanner() { const n = new FakeNode(this, 'panner'); n.pan = new FakeParam(this, 'pan', 0); return n; }
}

/* Every finite-number leaf of an object, for "no NaN anywhere" checks. */
export function numericLeaves(obj, path = '', out = []) {
  if (typeof obj === 'number') out.push([path, obj]);
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) numericLeaves(v, path ? `${path}.${k}` : k, out);
  return out;
}
