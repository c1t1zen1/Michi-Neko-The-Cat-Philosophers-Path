// Fūtaku, synthesised. A small bronze bell is a handful of inharmonic modes,
// each an exponentially decaying sine (the modal model); higher modes die
// faster, and each mode is doubled a few cents apart so it beats the way a
// cast bell warbles. Wind is filtered noise. Nothing plays until the page is
// told it may (browsers require a gesture).
const MODES = [[1, 1, 2.8], [1.004, 0.55, 2.6], [2.31, 0.5, 1.6], [3.86, 0.36, 1.0], [5.43, 0.24, 0.62], [7.92, 0.14, 0.38]];

export class Sound {
  constructor() { this.ctx = null; this.on = false; this.wind = 0; }

  _init() {
    if (this.ctx) return;
    const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = c.createGain(); this.master.gain.value = 0.8; this.master.connect(c.destination);
    // a short stone-courtyard reverb from decaying noise
    const len = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.32;
    this.verb.connect(wet).connect(this.master);
    // wind: looping pink-ish noise through a wandering band-pass
    const nb = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), nd = nb.getChannelData(0);
    let b0 = 0, b1 = 0;
    for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.05; b1 = 0.985 * b1 + w * 0.12; nd[i] = (b0 + b1) * 0.6; }
    const src = c.createBufferSource(); src.buffer = nb; src.loop = true;
    this.windFilter = c.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.frequency.value = 420; this.windFilter.Q.value = 0.7;
    this.windGain = c.createGain(); this.windGain.gain.value = 0;
    src.connect(this.windFilter).connect(this.windGain).connect(this.master);
    src.start();
  }

  setOn(b) {
    this.on = b;
    if (b) { this._init(); this.ctx.resume(); this.setWind(this.wind); } else if (this.ctx) this.ctx.suspend();
  }

  setWind(w, t = 0) {
    this.wind = w;
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(Math.min(0.12, w * 0.07), now, 0.6);
    this.windFilter.frequency.setTargetAtTime(320 + w * 260 + Math.sin(t * 0.7) * 90, now, 0.8);
  }

  /** One strike. pitch scales the 1.1 kHz fundamental; pan in [-1, 1]. */
  bell(pitch = 1, strength = 0.6, pan = 0) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.005, f0 = 1100 * pitch;
    const out = c.createGain(), p = c.createStereoPanner();
    out.gain.value = 0.16 * strength;
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p); p.connect(this.master); p.connect(this.verb);
    for (const [ratio, amp, decay] of MODES) {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f0 * ratio * (1 + (Math.random() - 0.5) * 0.003);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (0.7 + strength * 0.5));
      o.connect(g).connect(out);
      o.start(t); o.stop(t + decay * 1.3 + 0.1);
    }
    // the clapper's tick
    const n = c.createBufferSource(), nb = c.createBuffer(1, 600, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    n.buffer = nb;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200;
    const ng = c.createGain(); ng.gain.value = 0.35 * strength;
    n.connect(hp).connect(ng).connect(out);
    n.start(t);
  }
}
