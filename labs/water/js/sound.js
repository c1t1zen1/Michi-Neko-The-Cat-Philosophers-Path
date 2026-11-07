// The river, synthesised: a murmur that grows as Michi nears the water, the
// weir's hiss, splashes, paddling, paws, and a tree-frog chorus on summer
// nights. Off by default; the context is made on first use.

export class Sound {
  constructor() { this.enabled = false; this.ctx = null; this.last = 0; }

  setEnabled(b) {
    this.enabled = b;
    if (b && !this.ctx) this._init();
    if (!this.ctx) return;
    if (b && this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.setTargetAtTime(b ? 0.9 : 0, this.ctx.currentTime, 0.2);
  }

  _init() {
    const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const n = c.sampleRate * 2;
    this.noise = c.createBuffer(1, n, c.sampleRate);
    const d = this.noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5 * 0.6 + w * 0.4; }
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    const bed = (freq, q, gain) => {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; s.loop = true;
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.value = gain;
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start();
      return g;
    };
    this.murmur = bed(520, 0.6, 0);
    this.babble = bed(1900, 1.4, 0);
    this.weir = bed(3200, 0.5, 0);
    this.frogGain = c.createGain();
    this.frogGain.gain.value = 0;
    this.frogGain.connect(this.master);
    this.frogT = 0;
  }

  /** Per frame: how close the cat is to running water and to the weir, and frog time. */
  ambience(dt, { river = 0, weir = 0, frogs = 0 }) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.murmur.gain.setTargetAtTime(0.05 + river * 0.13, t, 0.3);
    this.babble.gain.setTargetAtTime(0.01 + river * 0.05, t, 0.3);
    this.weir.gain.setTargetAtTime(weir * 0.08, t, 0.3);
    this.frogGain.gain.setTargetAtTime(frogs * 0.05, t, 0.6);
    if (frogs > 0.05) {
      this.frogT -= dt;
      if (this.frogT <= 0) {
        // an amagaeru calls in pulse trains, about four calls a second
        this.frogT = 0.4 + Math.random() * 1.6;
        const base = 1700 + Math.random() * 900, count = 4 + Math.floor(Math.random() * 8);
        for (let i = 0; i < count; i++) this._chirp(base, t + i * 0.25 + Math.random() * 0.02);
      }
    }
  }

  _chirp(freq, at) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(freq, at); o.frequency.exponentialRampToValueAtTime(freq * 0.8, at + 0.06);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.25, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    o.connect(g); g.connect(this.frogGain);
    o.start(at); o.stop(at + 0.08);
  }

  _burst(type, freq, q, dur, gain, delay = 0, sweep = 0) {
    const c = this.ctx, t = c.currentTime + delay, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 1.5, dur + 0.05);
  }

  splash(impact = 1) {
    if (!this.enabled || !this.ctx) return;
    this._burst('lowpass', 1800, 0.7, 0.5 + impact * 0.3, 0.3 * Math.min(1.4, 0.5 + impact), 0, 300);
    for (let i = 0; i < 8; i++) this._burst('bandpass', 2500 + Math.random() * 3000, 6, 0.05, 0.05, 0.12 + Math.random() * 0.6);
  }
  plop() { if (this.enabled && this.ctx) { this._burst('bandpass', 900, 3, 0.12, 0.1, 0, 1600); } }
  paddle() { if (this.enabled && this.ctx && Math.random() < 0.6) this._burst('bandpass', 1100 + Math.random() * 600, 2, 0.09, 0.05); }
  hop() { if (this.enabled && this.ctx) this._burst('lowpass', 500, 0.7, 0.06, 0.04); }
  land() { if (this.enabled && this.ctx) this._burst('lowpass', 300, 0.7, 0.08, 0.06); }
  shake() {
    if (!this.enabled || !this.ctx) return;
    for (let i = 0; i < 9; i++) this._burst('bandpass', 3000 + Math.random() * 2000, 3, 0.04, 0.035, i * 0.1);
  }
  step(kind, front = true) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.last < 90) return;
    this.last = now;
    const v = front ? 1 : 0.8;
    if (kind === 'water') { this._burst('highpass', 1200, 0.7, 0.14, 0.05 * v); this._burst('bandpass', 2400, 4, 0.05, 0.03, 0.04); }
    else if (kind === 'wet') this._burst('lowpass', 700, 1, 0.08, 0.04 * v);
    else this._burst('lowpass', 260, 0.7, 0.07, 0.035 * v);
  }
}
