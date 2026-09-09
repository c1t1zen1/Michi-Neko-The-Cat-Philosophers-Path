/* dawCAT — game bridge: exports a dawCAT arrangement back into the game.
   Three paths, all without modifying game code:
   1. Drop-in src/music.js replacement (same MusicDirector API the game already calls)
   2. Hot-swap console snippet (instant preview, zero file changes)
   3. Track JSON for archival / re-import */

export function maxNoteEnd(notes) {
  let m = 0.25;
  for (const n of notes) m = Math.max(m, n.start + n.len);
  return m;
}

function r3(v) { return Math.round(v * 1000) / 1000; }

export function buildExportPayload(project) {
  const soloed = project.tracks.some((t) => t.solo);
  const tracks = project.tracks.map((t) => ({
    name: t.name, kind: t.kind, preset: t.preset, drumKit: t.drumKit,
    volume: r3(t.volume), pan: r3(t.pan || 0),
    sends: { a: r3(t.sends ? t.sends.a : 0), b: r3(t.sends ? t.sends.b : 0) }
  }));
  const events = [];
  project.tracks.forEach((t, ti) => {
    if (t.mute || (soloed && !t.solo)) return;
    for (const c of t.clips) {
      const clipStartB = c.start * 4;
      const clipEndB = (c.start + c.length) * 4;
      if (t.kind === 'drum' && c.steps) {
        for (let bar = 0; bar < c.length; bar++) {
          for (const lane of Object.keys(c.steps)) {
            const arr = c.steps[lane];
            for (let s = 0; s < 16; s++) {
              const v = arr[s];
              if (!v) continue;
              let beat = clipStartB + bar * 4 + s * 0.25;
              if (s % 2 === 1 && project.swing > 0) beat += project.swing * 0.125;
              if (beat < clipEndB) events.push({ b: r3(beat), k: 'd', t: ti, lane, v: r3(v * c.gain) });
            }
          }
        }
      } else {
        const contentLen = c.loop ? Math.max(0.25, c.loopLen) : Math.max(0.25, maxNoteEnd(c.notes));
        const totalBeats = c.length * 4;
        const reps = c.loop ? Math.ceil(totalBeats / contentLen) : 1;
        for (let r = 0; r < reps; r++) {
          for (const n of c.notes) {
            const beat = clipStartB + r * contentLen + n.start;
            if (beat >= clipEndB) continue;
            events.push({ b: r3(beat), k: 'n', t: ti, m: n.midi, l: r3(n.len), v: r3(n.vel * c.gain) });
          }
        }
      }
      if (c.sample) events.push({ b: r3(clipStartB), k: 's', t: ti, s: c.sample, d: c.length * 4, v: r3(c.gain) });
    }
  });
  events.sort((a, b) => a.b - b.b);
  let endBeat = 4;
  for (const t of project.tracks) {
    for (const c of t.clips) endBeat = Math.max(endBeat, (c.start + c.length) * 4);
  }
  const sections = {};
  let any = false;
  for (const ph of ['dawn', 'day', 'dusk', 'night']) {
    const bar = project.sections ? project.sections[ph] : null;
    sections[ph] = bar == null || bar < 0 ? null : bar;
    if (bar != null && bar >= 0) any = true;
  }
  return {
    v: 1, name: project.name, tempo: project.tempo, songBeats: endBeat,
    master: project.master.volume,
    tracks, events,
    sections: any ? sections : null
  };
}

/* ---------------- self-contained runtime player (embedded into exports) ---------------- */

/* eslint-disable */
function dawcatRuntime() {
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  return class DawCatPlayer {
    constructor(audio, data) {
      this.audio = audio;
      this.data = data;
      this.started = false;
      this.timer = null;
      this.duckTarget = 1;
      this.phase = null;
      this.live = new Set();
      this.anchorBeat = 0;
      this.anchorTime = 0;
      this.evIdx = 0;
      this.out = null;
    }
    get ctx() { return this.audio ? this.audio.ctx : null; }

    start() {
      if (this.started || !this.audio.initialized || !this.ctx) return;
      this.started = true;
      const ctx = this.ctx;
      const d = this.data;
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      this.out.connect(this.audio.buses.music);
      this.reverbBus = ctx.createGain();
      const conv = ctx.createConvolver();
      conv.buffer = this.impulse(2.4, 2.6);
      const revRet = ctx.createGain(); revRet.gain.value = 0.9;
      this.reverbBus.connect(conv); conv.connect(revRet); revRet.connect(this.out);
      this.echo = ctx.createDelay(2.0);
      this.echo.delayTime.value = Math.min(1.9, (60 / d.tempo) * 0.75);
      const fb = ctx.createGain(); fb.gain.value = 0.34;
      const delRet = ctx.createGain(); delRet.gain.value = 0.8;
      this.echo.connect(fb); fb.connect(this.echo);
      this.echo.connect(delRet); delRet.connect(this.out);
      this.chains = d.tracks.map((t) => this.buildChain(t));
      this.out.gain.setTargetAtTime(0.85 * this.duckTarget, ctx.currentTime, 2.0);
      this.anchorBeat = 0;
      this.anchorTime = ctx.currentTime + 0.2;
      this.evIdx = 0;
      this.timer = setInterval(() => this.schedule(), 120);
    }

    buildChain(t) {
      const ctx = this.ctx;
      const input = ctx.createGain();
      const gain = ctx.createGain(); gain.gain.value = t.volume;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      input.connect(gain); gain.connect(pan); pan.connect(this.out);
      const sendA = ctx.createGain(); sendA.gain.value = t.sends ? t.sends.a : 0.1;
      const sendB = ctx.createGain(); sendB.gain.value = t.sends ? t.sends.b : 0.1;
      pan.connect(sendA); sendA.connect(this.reverbBus);
      pan.connect(sendB); sendB.connect(this.echo);
      return { input, gain, pan };
    }

    impulse(seconds, decay) {
      const ctx = this.ctx;
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

    noiseBuf(seconds) {
      if (this._noise) return this._noise;
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;
      return buf;
    }

    stop() {
      if (!this.started) return;
      this.started = false;
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      try { this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5); } catch (e) {}
      const live = this.live;
      const out = this.out;
      setTimeout(() => {
        for (const n of [...live]) { try { n.stop(); } catch (e) {} }
        live.clear();
        try { out.disconnect(); } catch (e) {}
      }, 2500);
      this.out = null;
    }

    setDucked(ducked) {
      this.duckTarget = ducked ? 0.35 : 1;
      if (this.started && this.out && this.ctx) {
        this.out.gain.setTargetAtTime(0.85 * this.duckTarget, this.ctx.currentTime, 0.6);
      }
    }

    phaseForDayTime(dayTime) {
      if (dayTime == null) return 'day';
      if (dayTime < 5.5 || dayTime >= 19.5) return 'night';
      if (dayTime < 7.5) return 'dawn';
      if (dayTime < 17) return 'day';
      return 'dusk';
    }

    update(dayTime) {
      if (!this.started) return;
      const p = this.phaseForDayTime(dayTime);
      if (p !== this.phase) {
        this.phase = p;
        this.seekToPhase(p);
      }
    }

    seekToPhase(ph) {
      const d = this.data;
      const bar = d.sections ? d.sections[ph] : null;
      if (bar == null || bar < 0) return;
      if (!this.started) return;
      for (const n of [...this.live]) { try { n.stop(); } catch (e) {} }
      this.live.clear();
      this.anchorBeat = bar * 4;
      this.anchorTime = this.ctx.currentTime + 0.05;
      this.evIdx = this.firstEventAt(bar * 4);
    }

    firstEventAt(beat) {
      const evs = this.data.events;
      let lo = 0, hi = evs.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (evs[mid].b < beat) lo = mid + 1; else hi = mid; }
      return lo;
    }

    schedule() {
      if (!this.started) return;
      const ctx = this.ctx;
      const d = this.data;
      const spb = 60 / d.tempo;
      const now = ctx.currentTime;
      const horizon = now + 0.5;
      let guard = 0;
      while (guard++ < 5000) {
        if (this.evIdx >= d.events.length) {
          if (this.wrapEpoch()) continue;
          break;
        }
        const ev = d.events[this.evIdx];
        if (ev.b >= d.songBeats) { if (this.wrapEpoch()) continue; break; }
        const time = this.anchorTime + (ev.b - this.anchorBeat) * spb;
        if (time >= horizon) break;
        if (time >= now - 0.05) this.playEvent(ev, time, spb);
        this.evIdx++;
      }
    }

    wrapEpoch() {
      const d = this.data;
      if (!d.events.length) return false;
      this.anchorTime = this.anchorTime + (d.songBeats - this.anchorBeat) * (60 / d.tempo);
      this.anchorBeat = 0;
      this.evIdx = 0;
      return true;
    }

    playEvent(ev, time, spb) {
      if (ev.k === 'n') this.note(ev.t, ev.m, time, ev.l * spb, ev.v);
      else if (ev.k === 'd') this.drum(ev.t, ev.lane, time, ev.v);
      else if (ev.k === 's') this.sample(ev.s, time, (ev.d || 16) * spb, ev.v);
    }

    note(ti, midi, when, dur, vel) {
      const chain = this.chains[ti];
      if (!chain) return;
      const p = (this.data.tracks[ti] || {}).preset || {};
      const ctx = this.ctx;
      const freq = hz(midi);
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = p.cutoff || 1200;
      f.Q.value = p.res || 0.5;
      f.connect(g); g.connect(chain.input);
      const a = Math.max(0.003, p.attack || 0.01);
      const d = Math.max(0.01, p.decay || 0.3);
      const s = p.sustain == null ? 0.5 : p.sustain;
      const r = Math.max(0.02, p.release || 0.3);
      const peak = (p.gain || 0.5) * (vel == null ? 0.9 : vel);
      const off = when + Math.max(dur, a + 0.03);
      const stopAt = off + r + 0.25;
      const types = [p.osc1 || 'sine', p.osc2 || 'sine'];
      for (let i = 0; i < 2; i++) {
        if (!types[i] || types[i] === 'off') continue;
        const o = ctx.createOscillator();
        o.type = types[i];
        if (p.kind === 'pluck' && p.pitchDrop) {
          o.frequency.setValueAtTime(freq * 1.004, when);
          o.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
        } else {
          o.frequency.setValueAtTime(freq, when);
        }
        o.detune.value = i === 0 ? -(p.detune || 0) / 2 : (p.detune || 0);
        o.connect(f);
        o.start(when); o.stop(stopAt);
        this.live.add(o);
        o.onended = () => this.live.delete(o);
      }
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(peak, when + a);
      g.gain.setTargetAtTime(peak * s, when + a, d / 3);
      g.gain.setTargetAtTime(0, off, r / 3);
    }

    drum(ti, lane, when, vel) {
      const chain = this.chains[ti];
      if (!chain) return;
      const ctx = this.ctx;
      const out = ctx.createGain();
      out.gain.value = vel;
      out.connect(chain.input);
      const osc = (type, f0, dur, vol, f1) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1 != null ? f1 : f0, when);
        if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f0), when + dur * 0.85);
        g.gain.setValueAtTime(vol, when);
        g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
        o.connect(g); g.connect(out);
        o.start(when); o.stop(when + dur + 0.05);
        this.live.add(o);
        o.onended = () => this.live.delete(o);
      };
      const noise = (dur, type, freq, vol, q, offset) => {
        const t0 = when + (offset || 0);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf(1.2);
        const f = ctx.createBiquadFilter();
        f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
        src.connect(f); f.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + dur + 0.05);
        this.live.add(src);
        src.onended = () => this.live.delete(src);
      };
      switch (lane) {
        case 'kick': osc('sine', 45, 0.42, 1.1, 150); break;
        case 'snare': noise(0.18, 'bandpass', 1800, 0.8, 0.9); osc('triangle', 190, 0.12, 0.5); break;
        case 'clap': [0, 0.012, 0.026].forEach((dt) => noise(0.09, 'bandpass', 1100, 0.55, 1.4, dt)); break;
        case 'hatC': noise(0.055, 'highpass', 8000, 0.5); break;
        case 'hatO': noise(0.34, 'highpass', 7000, 0.4); break;
        case 'tom': osc('sine', 90, 0.3, 0.9, 200); break;
        case 'rim': osc('square', 1750, 0.035, 0.4); break;
        case 'perc': osc('sine', 880, 0.09, 0.5, 1232); break;
        default: break;
      }
      setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 2500);
    }

    sample(name, when, dur, level) {
      const ctx = this.ctx;
      const bus = ctx.createGain();
      bus.gain.value = 0.8 * (level == null ? 1 : level);
      bus.connect(this.out);
      if (name === 'rain' || name === 'wind' || name === 'purr') {
        const src = ctx.createBufferSource();
        src.buffer = this.noise(2);
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = name === 'rain' ? 500 : name === 'wind' ? 320 : 380;
        src.connect(f); f.connect(bus);
        bus.gain.setValueAtTime(0.02 * level, when);
        src.start(when); src.stop(when + dur + 0.1);
        this.live.add(src);
        src.onended = () => this.live.delete(src);
      } else if (name === 'birds') {
        let t = when + 0.5;
        while (t < when + dur) {
          const base = 2200 + Math.random() * 1400;
          const syll = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < syll; i++) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            const st = t + i * 0.13;
            o.frequency.setValueAtTime(2200 + Math.random() * 1400, st);
            o.frequency.linearRampToValueAtTime(2800 + Math.random() * 600, st + 0.05);
            g.gain.setValueAtTime(0, st);
            g.gain.linearRampToValueAtTime(0.03, st + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0008, st + 0.11);
            o.connect(g); g.connect(bus);
            o.start(st); o.stop(st + 0.12);
            this.live.add(o);
            o.onended = () => this.live.delete(o);
          }
          t += 3 + Math.random() * 5;
        }
      } else if (name === 'chimes') {
        const pent = [1318.5, 1174.7, 1046.5, 880, 783.99];
        let t = when + 1.0;
        while (t < when + dur - 0.5) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = pent[Math.floor(Math.random() * pent.length)];
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
          o.connect(g); g.connect(bus);
          o.start(t); o.stop(t + 2.5);
          this.live.add(o);
          o.onended = () => this.live.delete(o);
          t += 2.5 + Math.random() * 6;
        }
      }
      setTimeout(() => { try { bus.disconnect(); } catch (e) {} }, (dur + 3) * 1000);
    }
  };
}
/* eslint-enable */

/* ---------------- generators ---------------- */

export function generateMusicJS(payload) {
  const data = JSON.stringify(payload, null, 1);
  return `/* ============================================================
 * Generated by dawCAT — drop-in replacement for src/music.js
 *
 * This file implements the exact MusicDirector API the game
 * already calls (start / stop / update / setDucked), so no other
 * game code needs to change. Your dawCAT arrangement plays on a
 * loop; if you mapped day phases to sections, the player seeks
 * to each phase's section as the in-game clock changes.
 *
 * To install: replace src/music.js with this file, then reload
 * the game (hard refresh: Ctrl+Shift+R). Keep a backup of the
 * original generative director if you want it back.
 * ============================================================ */

const DATA = ${data};

const DawCatPlayer = (${dawcatRuntime.toString()})();

export class MusicDirector {
  /** @param {import('./audio.js').AudioManager} audio */
  constructor(audio) {
    this.audio = audio;
    this.started = false;
    this.phase = null;
    this.player = new DawCatPlayer(audio, DATA);
  }

  get ctx() { return this.audio.ctx; }

  start() {
    this.player.start();
    this.started = this.player.started;
  }

  stop() {
    this.player.stop();
    this.started = false;
  }

  /** Lower music volume while paused / dialogue. */
  setDucked(ducked) {
    this.player.setDucked(ducked);
  }

  phaseForDayTime(dayTime) {
    return this.player.phaseForDayTime(dayTime);
  }

  /** Called every frame with the current sky day time (hours). */
  update(dayTime) {
    this.player.update(dayTime);
  }
}
`;
}

export function hotSwapSnippet(payload) {
  const data = JSON.stringify(payload);
  return `(function(){
  try {
    var DATA = ${data};
    var Player = (${dawcatRuntime.toString()})();
    var g = window.game;
    if (!g || !g.audio) { console.warn('dawCAT: game instance not found (window.game)'); return; }
    try { if (g.music && g.music.stop) g.music.stop(); } catch (e) {}
    var p = new Player(g.audio, DATA);
    p.start();
    if (!p.started) { console.warn('dawCAT: audio not initialized yet — click the game once, then re-run this snippet'); return; }
    g.music = p;
    if (g.sky && g.sky.dayTime != null) p.update(g.sky.dayTime);
    console.log('%c dawCAT track hot-swapped into the game! ', 'background:#3f7fff;color:#fff;border-radius:3px');
  } catch (e) { console.error('dawCAT hot-swap failed:', e); }
})();`;
}

export function exportToGame(project) {
  const payload = buildExportPayload(project);
  try { localStorage.setItem('dawcat_export_v1', JSON.stringify(payload)); } catch (e) { /* quota */ }
  return {
    payload,
    snippet: hotSwapSnippet(payload),
    musicJS: generateMusicJS(payload)
  };
}
