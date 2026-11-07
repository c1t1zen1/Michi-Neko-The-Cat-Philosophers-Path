// The ground, synthesised. A footstep is many micro-impacts (Turchet et al.):
// gravel is a burst of short bright grains, sand a softer hiss, stone a tap,
// moss and grass a hush, snow a squeak of low grains, wet ground a slap.
// Plus the broom's swish, the rake's scrape, the ladle, rain and the basin.
// Off by default; the context is made on first use.

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
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    const bed = (type, freq, q) => {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; s.loop = true;
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start();
      return g;
    };
    this.rainBed = bed('lowpass', 2400, 0.4);
    this.rainHiss = bed('highpass', 5200, 0.5);
    this.basin = bed('bandpass', 1700, 2.5);
    this.dripT = 0;
  }

  _grain(type, freq, q, dur, gain, at = 0, sweep = 0) {
    const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.8, dur + 0.05);
  }
  _tone(freq, dur, gain, at = 0) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  /** a paw (or a foot) on a surface: { mat, wet, snow } from field.surfaceAt */
  step(surf, weight = 1) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.last < 70) return;
    this.last = now;
    const v = 0.6 * weight, m = surf.mat;
    if (surf.snow > 0.5) { for (let i = 0; i < 6; i++) this._grain('bandpass', 900 + Math.random() * 700, 5, 0.02, 0.05 * v, i * 0.012); return; }
    if (surf.puddle) { this._grain('highpass', 1100, 0.8, 0.12, 0.07 * v); this._grain('bandpass', 2300, 5, 0.05, 0.04 * v, 0.03); return; }
    if (m === 'gravel') { for (let i = 0; i < 9; i++) this._grain('bandpass', 2600 + Math.random() * 3500, 3.5, 0.012 + Math.random() * 0.018, 0.06 * v, i * 0.007 + Math.random() * 0.01); return; }
    if (m === 'sand') { this._grain('bandpass', 3800, 0.9, 0.07, 0.035 * v); for (let i = 0; i < 3; i++) this._grain('bandpass', 1800 + Math.random() * 1200, 4, 0.015, 0.025 * v, i * 0.015); return; }
    if (m === 'paving' || m === 'tataki') { this._grain('bandpass', 1500, 2.5, 0.03, 0.05 * v); this._tone(170, 0.05, 0.03 * v); return; }
    if (m === 'moss' || m === 'grass' || m === 'wild') { this._grain('highpass', 3000, 0.6, 0.06, 0.018 * v); return; }
    if (m === 'needles') { for (let i = 0; i < 4; i++) this._grain('highpass', 4200, 1, 0.02, 0.025 * v, i * 0.01); return; }
    if (surf.wet > 0.5) { this._grain('lowpass', 900, 1, 0.07, 0.05 * v); return; }
    this._grain('lowpass', 320, 0.8, 0.06, 0.06 * v);
  }
  sweep(speed = 1) { if (this.enabled && this.ctx) this._grain('bandpass', 2400 + speed * 800, 0.7, 0.18, 0.05, 0, 900); }
  rake(speed = 1) { if (this.enabled && this.ctx) for (let i = 0; i < 4; i++) this._grain('bandpass', 1300 + Math.random() * 500, 7, 0.05, 0.03 * speed, i * 0.03); }
  ladle() {
    if (!this.enabled || !this.ctx) return;
    this._grain('lowpass', 2000, 0.6, 0.45, 0.12, 0.16, 300);
    for (let i = 0; i < 12; i++) this._grain('bandpass', 2000 + Math.random() * 4000, 5, 0.03, 0.04, 0.25 + Math.random() * 0.4);
  }
  stone() { if (this.enabled && this.ctx) { this._grain('lowpass', 400, 1, 0.1, 0.1); this._tone(120, 0.12, 0.06); } }

  /** per frame: rain on the ground, the basin's trickle by distance */
  ambience(dt, { rain = 0, basin = 0 }) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.rainBed.gain.setTargetAtTime(rain * 0.09, t, 0.4);
    this.rainHiss.gain.setTargetAtTime(rain * 0.03, t, 0.4);
    this.basin.gain.setTargetAtTime(basin * 0.025, t, 0.3);
    if (basin > 0.05) {
      this.dripT -= dt;
      if (this.dripT <= 0) { this.dripT = 0.25 + Math.random() * 0.6; this._tone(900 + Math.random() * 500, 0.06, 0.03 * basin); }
    }
  }
}
