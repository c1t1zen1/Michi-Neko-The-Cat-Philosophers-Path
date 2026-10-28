// Footsteps per surface, synthesised; off by default, context made on first use.
export class Sound {
  constructor() { this.enabled = false; this.ctx = null; this.last = 0; }
  setEnabled(b) {
    this.enabled = b;
    if (b && !this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const n = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, n, n);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (b && this.ctx.state === 'suspended') this.ctx.resume();
  }
  _burst(type, freq, q, dur, gain, delay = 0, sweep = 0) {
    const c = this.ctx, t = c.currentTime + delay, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t, Math.random() * 0.5, dur + 0.02);
  }
  step(kind, front = true) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.last < 90) return;
    this.last = now;
    const v = front ? 1 : 0.85;
    if (kind === 'water') { this._burst('highpass', 1200, 0.7, 0.16, 0.05 * v); this._burst('bandpass', 2400, 4, 0.05, 0.03, 0.05); }
    else if (kind === 'mud') this._burst('lowpass', 420, 1, 0.16, 0.06 * v, 0, 120);
    else if (kind === 'gravel') for (let i = 0; i < 5; i++) this._burst('bandpass', 2000 + Math.random() * 2000, 2, 0.02, 0.03 * v, i * 0.012);
    else if (kind === 'moss') this._burst('lowpass', 400, 0.5, 0.07, 0.012 * v);
    else if (kind === 'setts' || kind === 'cobble') this._burst('bandpass', 1500, 6, 0.04, 0.05 * v);
    else this._burst('lowpass', 220, 0.7, 0.09, 0.055 * v);
  }
}
