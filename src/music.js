/**
 * Generative day-phase music director.
 * Layers: warm pad drone + sparse koto-style plucks with echo.
 * Musical key/mood crossfades with the in-game time of day.
 */
export class MusicDirector {
  /** @param {import('./audio.js').AudioManager} audio */
  constructor(audio) {
    this.audio = audio;
    this.started = false;
    this.phase = null;
    this.duckTarget = 1;
    this.nextBarTime = 0;
    this.barLen = 4.0;
    this.timer = null;

    // Phase definitions: root freq, pad chord (semitone offsets), pluck scale, density
    this.phases = {
      dawn: { root: 87.31, chord: [0, 7, 12, 16], scale: [0, 2, 4, 7, 9, 12, 14], density: 0.45, cutoff: 700 },
      day: { root: 130.81, chord: [0, 7, 14, 16], scale: [0, 2, 4, 7, 9, 12, 16], density: 0.75, cutoff: 1100 },
      dusk: { root: 110.0, chord: [0, 3, 10, 15], scale: [0, 3, 5, 7, 10, 12, 15], density: 0.55, cutoff: 850 },
      night: { root: 82.41, chord: [0, 7, 12, 19], scale: [0, 2, 3, 7, 10, 12, 14], density: 0.28, cutoff: 520 }
    };
  }

  get ctx() { return this.audio.ctx; }

  start() {
    if (this.started || !this.audio.initialized || !this.ctx) return;
    this.started = true;

    const ctx = this.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(this.audio.buses.music);

    // Shared echo bus for plucks
    this.echo = ctx.createDelay(1.0);
    this.echo.delayTime.value = 0.42;
    this.echoFb = ctx.createGain();
    this.echoFb.gain.value = 0.34;
    this.echoWet = ctx.createGain();
    this.echoWet.gain.value = 0.3;
    this.echo.connect(this.echoFb).connect(this.echo);
    this.echo.connect(this.echoWet).connect(this.out);

    // Pad voice: detuned pair through a slowly breathing lowpass
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padFilter.Q.value = 0.6;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.0;
    this.padFilter.connect(this.padGain).connect(this.out);

    this.padOscs = [];
    for (const [type, detune] of [['sine', -4], ['triangle', 3]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.detune.value = detune;
      o.frequency.value = 110;
      o.connect(this.padFilter);
      o.start();
      this.padOscs.push(o);
    }
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(this.padFilter.frequency);
    lfo.start();

    // Fade the whole mix in
    this.out.gain.setTargetAtTime(0.8 * this.duckTarget, ctx.currentTime, 2.5);

    this.nextBarTime = ctx.currentTime + 0.3;
    this.timer = setInterval(() => this.schedule(), 300);
  }

  stop() {
    if (!this.started) return;
    clearInterval(this.timer);
    this.timer = null;
    try { this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8); } catch {}
    const oscs = this.padOscs;
    setTimeout(() => oscs.forEach((o) => { try { o.stop(); } catch {} }), 3000);
    this.started = false;
  }

  /** Lower music volume while paused / dialogue. */
  setDucked(ducked) {
    this.duckTarget = ducked ? 0.35 : 1;
    if (this.started && this.ctx) {
      this.out.gain.setTargetAtTime(0.8 * this.duckTarget, this.ctx.currentTime, 0.6);
    }
  }

  phaseForDayTime(dayTime) {
    if (dayTime == null) return 'day';
    if (dayTime < 5.5 || dayTime >= 19.5) return 'night';
    if (dayTime < 7.5) return 'dawn';
    if (dayTime < 17) return 'day';
    return 'dusk';
  }

  /** Called every frame with the current sky day time (hours). */
  update(dayTime) {
    if (!this.started) return;
    const p = this.phaseForDayTime(dayTime);
    if (p !== this.phase) {
      this.phase = p;
      this.applyPhase(p);
    }
  }

  applyPhase(name) {
    const def = this.phases[name];
    const t = this.ctx.currentTime;
    // Glide pad to new root
    for (const o of this.padOscs) {
      o.frequency.setTargetAtTime(def.root, t, 1.8);
    }
    this.padFilter.frequency.setTargetAtTime(def.cutoff, t, 2.0);
    // Swell pad level slightly by phase
    const padLevel = name === 'night' ? 0.05 : name === 'day' ? 0.032 : 0.04;
    this.padGain.gain.setTargetAtTime(padLevel, t, 2.0);
  }

  schedule() {
    if (!this.started) return;
    const ctx = this.ctx;
    const def = this.phases[this.phase || 'day'];
    const horizon = ctx.currentTime + 0.8;

    while (this.nextBarTime < horizon) {
      const barT = this.nextBarTime;
      // Pad chord change each bar
      const chordNote = def.chord[Math.floor(Math.random() * def.chord.length)];
      this.playPadChord(barT, def.root * Math.pow(2, chordNote / 12));

      // Sparse plucks
      let t = barT + Math.random() * 0.5;
      while (t < barT + this.barLen) {
        if (Math.random() < def.density * 0.5) {
          const deg = def.scale[Math.floor(Math.random() * def.scale.length)];
          const oct = Math.random() < 0.35 ? 2 : 1;
          this.playPluck(t, def.root * oct * Math.pow(2, deg / 12));
        }
        t += 0.32 + Math.random() * 0.55;
      }
      this.nextBarTime += this.barLen;
    }
  }

  playPadChord(t, freq) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.028, t + 1.4);
    g.gain.linearRampToValueAtTime(0.0001, t + this.barLen + 1.2);
    g.connect(this.padGain);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * 2;
    o.connect(g);
    o.start(t);
    o.stop(t + this.barLen + 1.4);
  }

  playPluck(t, freq) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq * 1.003, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.075, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 1.5);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.connect(g);
    if (pan) {
      pan.pan.value = Math.random() * 1.4 - 0.7;
      g.connect(pan);
      pan.connect(this.out);
      pan.connect(this.echo);
    } else {
      g.connect(this.out);
      g.connect(this.echo);
    }
    o.start(t);
    o.stop(t + 1.6);
  }
}