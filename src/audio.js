import * as THREE from 'three';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientNode = null;
    this.lastFootstep = 0;
    this.initialized = false;
    this.started = false;
    this.stateChangeHandler = null;
    this.lappingTimer = null;
  }

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    // True output node
    this.output = this.ctx.createGain();
    this.output.gain.value = 0.4;
    this.output.connect(this.ctx.destination);

    // Volume buses: music / sfx / ambient
    const mk = (v) => {
      const g = this.ctx.createGain();
      g.gain.value = v;
      g.connect(this.output);
      return g;
    };
    this.buses = { music: mk(0.7), sfx: mk(0.85), ambient: mk(0.75) };

    // Legacy default routing: one-shots land on the SFX bus
    this.master = this.buses.sfx;
    this.initialized = true;
    this.ctx.addEventListener('statechange', () => {
      if (this.stateChangeHandler) this.stateChangeHandler(this.ctx.state);
    });
  }

  get isRunning() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  onStateChange(handler) {
    this.stateChangeHandler = handler;
    if (handler && this.ctx) handler(this.ctx.state);
  }

  /** Apply persisted settings volumes (0..1 range). */
  applyVolumes(vols) {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.output && isFinite(vols.master)) this.output.gain.setTargetAtTime(vols.master, t, 0.1);
    if (isFinite(vols.music)) this.buses.music.gain.setTargetAtTime(vols.music, t, 0.1);
    if (isFinite(vols.sfx)) this.buses.sfx.gain.setTargetAtTime(vols.sfx, t, 0.1);
    if (isFinite(vols.ambient)) this.buses.ambient.gain.setTargetAtTime(vols.ambient, t, 0.1);
  }

  resumeOnGesture() {
    // Must be called directly by an activation event. On touch WebKit that
    // means pointerup/touchend/click, not touch pointerdown.
    this.init();
    if (!this.ctx) return Promise.resolve(false);
    const resume = this.ctx.state === 'running'
      ? Promise.resolve(true)
      : this.ctx.resume()
        .then(() => this.ctx.state === 'running')
        .catch(() => false);

    // Starting an attached source during the same activation is Chrome's
    // documented Web Audio game unlock path and also primes mobile WebKit.
    const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start(0);

    // Some WebKit versions can leave resume() pending indefinitely after an
    // interruption. Do not leave the UI disabled forever; a later gesture can
    // safely retry the same operation.
    return Promise.race([
      resume,
      new Promise((resolve) => setTimeout(() => resolve(this.isRunning), 1500))
    ]);
  }

  /** Audible confirmation scheduled synchronously inside the speaker gesture. */
  playUnlockChime() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    [660, 990].forEach((frequency, index) => {
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.12 : 0.07, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      // Bypass persisted mix levels for this one confirmation. Pressing the
      // speaker is an explicit request to prove that device audio is enabled.
      oscillator.connect(gain).connect(this.ctx.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.5);
    });
  }

  /** Best-effort startup for browsers/origins where audible autoplay is allowed. */
  attemptAutoplay() {
    this.init();
    this.start();
    if (!this.ctx) return Promise.resolve(false);
    if (this.ctx.state === 'running') return Promise.resolve(true);
    const resume = this.ctx.resume()
      .then(() => this.ctx.state === 'running')
      .catch(() => false);
    return Promise.race([
      resume,
      new Promise((resolve) => setTimeout(() => resolve(this.isRunning), 1500))
    ]);
  }

  /** Sync the WebAudio listener with the camera for positional sound. */
  updateListener(camera) {
    if (!this.initialized || !this.ctx.listener || !camera) return;
    const p = camera.position;
    const t = this.ctx.currentTime;
    if (this.ctx.listener.positionX) {
      this.ctx.listener.positionX.setTargetAtTime(p.x, t, 0.05);
      this.ctx.listener.positionY.setTargetAtTime(p.y, t, 0.05);
      this.ctx.listener.positionZ.setTargetAtTime(p.z, t, 0.05);
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      this.ctx.listener.forwardX.setTargetAtTime(fwd.x, t, 0.05);
      this.ctx.listener.forwardY.setTargetAtTime(fwd.y, t, 0.05);
      this.ctx.listener.forwardZ.setTargetAtTime(fwd.z, t, 0.05);
      this.ctx.listener.upX.setTargetAtTime(0, t, 0.05);
      this.ctx.listener.upY.setTargetAtTime(1, t, 0.05);
      this.ctx.listener.upZ.setTargetAtTime(0, t, 0.05);
    } else if (this.ctx.listener.setPosition) {
      this.ctx.listener.setPosition(p.x, p.y, p.z);
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      this.ctx.listener.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  start() {
    if (this.started) return;
    this.init();
    if (!this.initialized) return;
    // Set this before installing delayed ambience callbacks so every callback
    // observes a fully started manager, even on unusually fast test clocks.
    this.started = true;
    this.startAmbient();
    this.startWindChimes();
    this.startBirds();
    this.startRain();
  }

  setMasterVolume(v) {
    if (this.master) this.master.gain.value = v;
  }

  playCollect() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * 2;
      const start = t + i * 0.07;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.9);
    });
  }

  startWindChimes() {
    if (!this.initialized) return;
    const pentatonic = [1318.5, 1174.7, 1046.5, 880, 783.99];
    const chime = () => {
      if (!this.started) return;
      const t = this.ctx.currentTime;
      const f = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
      osc.connect(gain).connect(this.buses.ambient);
      osc.start(t);
      osc.stop(t + 2.5);
      this.chimeTimer = setTimeout(chime, 2500 + Math.random() * 6000);
    };
    this.chimeTimer = setTimeout(chime, 1500 + Math.random() * 3000);
  }

  startBirds() {
    if (!this.initialized) return;
    if (this.birdActive) return;
    this.birdActive = true;
    if (!this.birdGain) {
      this.birdGain = this.ctx.createGain();
      this.birdGain.gain.value = 1;
      this.birdGain.connect(this.buses.ambient);
    }
    const chirp = () => {
      if (!this.started || !this.birdActive) return;
      const t = this.ctx.currentTime;
      const base = 2200 + Math.random() * 1400;
      const syllables = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < syllables; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = t + i * (0.12 + Math.random() * 0.06);
        osc.frequency.setValueAtTime(base, start);
        osc.frequency.linearRampToValueAtTime(base * (1.1 + Math.random() * 0.25), start + 0.05);
        osc.frequency.linearRampToValueAtTime(base * 0.9, start + 0.1);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.03, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.11);
        osc.connect(gain).connect(this.birdGain);
        osc.start(start);
        osc.stop(start + 0.12);
      }
      this.birdTimer = setTimeout(chirp, 4000 + Math.random() * 9000);
    };
    this.birdTimer = setTimeout(chirp, 2000 + Math.random() * 4000);
  }

  stopBirds() {
    this.birdActive = false;
    if (this.birdTimer) {
      clearTimeout(this.birdTimer);
      this.birdTimer = null;
    }
  }

  playMeow() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.08);
    osc.frequency.linearRampToValueAtTime(500, t + 0.25);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playPurr(duration = 2.0) {
    if (!this.initialized) return;
    const sr = this.ctx.sampleRate;
    const samples = Math.floor(sr * duration);
    const buffer = this.ctx.createBuffer(1, samples, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const t = i / sr;
      const mod = 0.5 + 0.5 * Math.sin(t * 55 * Math.PI * 2); // ~27.5 Hz purr
      data[i] = (Math.random() * 2 - 1) * mod * (1 - t / duration);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  playTrill() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const notes = [520, 740, 900];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const start = t + i * 0.045;
      osc.frequency.setValueAtTime(f * 1.1, start);
      osc.frequency.exponentialRampToValueAtTime(f, start + 0.08);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  playHiss() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const samples = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const life = 1 - i / samples;
      data[i] = (Math.random() * 2 - 1) * life;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t);
  }

  playChirp() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.08);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  playLap() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const samples = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const life = 1 - i / samples;
      data[i] = (Math.random() * 2 - 1) * life * 0.25;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t);
  }

  startLapping() {
    if (!this.initialized || this.lappingTimer) return;
    this.playLap();
    this.lappingTimer = setInterval(() => this.playLap(), 430);
  }

  stopLapping() {
    if (!this.lappingTimer) return;
    clearInterval(this.lappingTimer);
    this.lappingTimer = null;
  }

  playBell() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const base = 520;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 1.3);

    // Add a faint harmonic
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(base * 2.7, t);
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.025, t + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc2.connect(gain2).connect(this.master);
    osc2.start(t);
    osc2.stop(t + 0.9);
  }

  playKeyChime() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = t + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 1.2);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 1.25);
    });
  }

  playDoorSlide() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const samples = Math.floor(this.ctx.sampleRate * 0.85);
    const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const p = i / samples;
      const mod = Math.sin(p * Math.PI) * (0.8 + 0.2 * Math.sin(i * 0.05));
      data[i] = (Math.random() * 2 - 1) * mod * 0.18;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 450;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t);
  }

  playEat() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = t + i * 0.12;
      osc.frequency.setValueAtTime(320 - i * 40, start);
      osc.frequency.linearRampToValueAtTime(160, start + 0.06);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.09);
    }
  }

  playSquawk() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.linearRampToValueAtTime(2100, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.28);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 3;
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  playSplash() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const samples = Math.floor(this.ctx.sampleRate * 0.4);
    const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const p = 1 - i / samples;
      data[i] = (Math.random() * 2 - 1) * p * p * 0.3;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t);
  }

  playDreamChime() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const chord = [392.00, 493.88, 587.33, 783.99, 987.77];
    chord.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0005, start + 2.2);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 2.3);
    });
  }

  /**
   * A distant monk choir "aaah" — layered detuned voices with vibrato and a
   * soft formant band, the sound of the mountain answering the tenth bell.
   */
  playMonkChoir(duration = 5.5) {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.075, t + 1.4);
    out.gain.setValueAtTime(0.075, t + duration - 1.8);
    out.gain.linearRampToValueAtTime(0, t + duration);
    // Low choral body through a warm formant band
    const formant = this.ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = 640;
    formant.Q.value = 0.7;
    out.connect(formant).connect(this.master);
    // A parallel "air" path for the open vowel brightness
    const air = this.ctx.createGain();
    air.gain.value = 0.4;
    out.connect(air).connect(this.master);

    const voices = [
      [98.0, -6], [98.0, 5], [146.83, -4], [146.83, 7],   // G2 / D3 unison pairs
      [196.0, 0], [196.0, 9]                              // G3 lift
    ];
    for (const [freq, detune] of voices) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const vib = this.ctx.createOscillator();
      vib.frequency.value = 4.6 + Math.random() * 0.8;
      const vibG = this.ctx.createGain();
      vibG.gain.value = 2.2;
      vib.connect(vibG).connect(osc.frequency);
      const g = this.ctx.createGain();
      g.gain.value = freq > 150 ? 0.16 : 0.3;
      osc.connect(g).connect(out);
      osc.start(t); osc.stop(t + duration + 0.1);
      vib.start(t); vib.stop(t + duration + 0.1);
    }
    // A high choir shimmer arriving late — the "aaaaah" opening
    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 392;
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(0.05, t + duration * 0.5);
    sg.gain.linearRampToValueAtTime(0, t + duration);
    shimmer.connect(sg).connect(this.master);
    shimmer.start(t); shimmer.stop(t + duration + 0.1);
  }

  /** Singing bowl: a slow-blooming tone with soft partials, meditation cue. */
  playSingingBowl(freq = 174.61, duration = 9) {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const partials = [[1, 0.06, 0.9], [2.76, 0.018, 0.7], [4.9, 0.007, 0.5]];
    for (const [mult, vol, decayK] of partials) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0004, t + duration * decayK);
      osc.connect(g).connect(this.buses.ambient);
      osc.start(t);
      osc.stop(t + duration);
    }
    // The bowl's soft strike tick
    const tick = this.ctx.createOscillator();
    tick.type = 'sine';
    tick.frequency.setValueAtTime(freq * 4.4, t);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.012, t);
    tg.gain.exponentialRampToValueAtTime(0.0003, t + 0.35);
    tick.connect(tg).connect(this.buses.ambient);
    tick.start(t); tick.stop(t + 0.4);
  }

  /**
   * Summit wind bed: a dedicated filtered-noise layer with slow gust LFOs,
   * switched while the cat is on the mountain. Louder and airier than the
   * valley ambient — the wind is the scene's main voice.
   */
  setSummitWind(on) {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (on && !this._summitWind) {
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 480;
      filter.Q.value = 0.6;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      // Two gust LFOs: a slow swell plus a quicker whistle flutter on the filter
      const lfo1 = this.ctx.createOscillator();
      lfo1.frequency.value = 0.11;
      const lfo1G = this.ctx.createGain();
      lfo1G.gain.value = 0.028;
      lfo1.connect(lfo1G).connect(gain.gain);
      const lfo2 = this.ctx.createOscillator();
      lfo2.frequency.value = 0.53;
      const lfo2G = this.ctx.createGain();
      lfo2G.gain.value = 260;
      lfo2.connect(lfo2G).connect(filter.frequency);
      noise.connect(filter).connect(gain).connect(this.buses.ambient);
      noise.start(t); lfo1.start(t); lfo2.start(t);
      gain.gain.setTargetAtTime(0.055, t, 2.2);
      this._summitWind = { noise, lfo1, lfo2, gain };
    } else if (!on && this._summitWind) {
      const w = this._summitWind;
      this._summitWind = null;
      w.gain.gain.setTargetAtTime(0, t, 1.4);
      setTimeout(() => {
        try { w.noise.stop(); w.lfo1.stop(); w.lfo2.stop(); } catch {}
      }, 4000);
    }
  }

  /** Surface-aware footsteps: grass / wood / stone / water. */
  playFootstep(surface = 'grass') {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    if (now - this.lastFootstep < 0.28) return;
    this.lastFootstep = now;

    if (surface === 'water') {
      this.playLap();
      return;
    }

    const profiles = {
      grass: { freq: 650, q: 0.8, vol: 0.04 },
      wood: { freq: 1500, q: 2.2, vol: 0.05 },
      stone: { freq: 2100, q: 1.4, vol: 0.045 }
    };
    const prof = profiles[surface] || profiles.grass;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = surface === 'stone' ? 'bandpass' : 'lowpass';
    filter.frequency.value = prof.freq * (0.9 + Math.random() * 0.2);
    filter.Q.value = prof.q;

    const gain = this.ctx.createGain();
    gain.gain.value = prof.vol;

    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(now);
  }

  startAmbient() {
    if (!this.initialized || this.ambientNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.value = 320;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.02;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain).connect(this.ambientGain.gain);
    lfo.start(0);

    noise.connect(this.ambientFilter).connect(this.ambientGain).connect(this.buses.ambient);
    noise.start(0);
    this.ambientNode = noise;
  }

  startRain() {
    if (!this.initialized || this.rainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;

    noise.connect(filter).connect(this.rainGain).connect(this.buses.ambient);
    noise.start(0);
    this.rainNode = noise;
  }

  setWeatherTransition(fromOrObj, to = 'clear', blend = 1) {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    let fromVal = 'clear';
    let toVal = 'clear';
    let blendVal = 1;

    if (typeof fromOrObj === 'object' && fromOrObj !== null) {
      fromVal = fromOrObj.from || 'clear';
      toVal = fromOrObj.to || 'clear';
      blendVal = typeof fromOrObj.blend === 'number' ? fromOrObj.blend : 1;
    } else {
      fromVal = fromOrObj || 'clear';
      toVal = to || 'clear';
      blendVal = typeof blend === 'number' ? blend : 1;
    }

    blendVal = Math.max(0, Math.min(1, isFinite(blendVal) ? blendVal : 1));

    const rainFrom = fromVal === 'rain' ? 1 : 0;
    const rainTo = toVal === 'rain' ? 1 : 0;
    const rain = rainFrom * (1 - blendVal) + rainTo * blendVal;
    const mist = ((fromVal === 'mist' ? 1 : 0) * (1 - blendVal) + (toVal === 'mist' ? 1 : 0) * blendVal) * 0.45;
    const rainTarget = Math.max(0, rain * 0.03 + mist * 0.01);
    if (this.rainGain && isFinite(rainTarget)) {
      this.rainGain.gain.setTargetAtTime(rainTarget, t, 0.8);
    }

    const windFrom = fromVal === 'rain' ? 1 : (fromVal === 'cloudy' ? 0.5 : (fromVal === 'mist' ? 0.35 : 0));
    const windTo = toVal === 'rain' ? 1 : (toVal === 'cloudy' ? 0.5 : (toVal === 'mist' ? 0.35 : 0));
    const wind = windFrom * (1 - blendVal) + windTo * blendVal;
    const ambientTarget = Math.max(0, 0.02 + wind * 0.04);
    if (this.ambientGain && isFinite(ambientTarget)) {
      this.ambientGain.gain.setTargetAtTime(ambientTarget, t, 0.8);
    }
    const filterFreq = 320 + wind * 200;
    if (this.ambientFilter && isFinite(filterFreq)) {
      this.ambientFilter.frequency.setTargetAtTime(filterFreq, t, 1.0);
    }

    const birdFrom = (fromVal === 'rain' || fromVal === 'mist') ? 0 : 1;
    const birdTo = (toVal === 'rain' || toVal === 'mist') ? 0 : 1;
    const birdVol = Math.max(0, Math.min(1, birdFrom * (1 - blendVal) + birdTo * blendVal));
    if (this.birdGain && isFinite(birdVol)) {
      this.birdGain.gain.setTargetAtTime(birdVol, t, 0.5);
    }

    if (birdVol < 0.05) this.stopBirds();
    else if (!this.birdActive) this.startBirds();
  }

  stopAmbient() {
    if (this.ambientNode) {
      try { this.ambientNode.stop(); } catch {}
      this.ambientNode = null;
    }
    if (this.rainNode) {
      try { this.rainNode.stop(); } catch {}
      this.rainNode = null;
      this.rainGain = null;
    }
  }
}
