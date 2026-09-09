/* dawCAT — transport: lookahead scheduler, tempo, loop, metronome, automation */

export class Transport extends EventTarget {
  constructor(engine, state) {
    super();
    this.engine = engine;
    this.state = state;
    this.playing = false;
    this._pos = 0;
    this.anchorBeat = 0;
    this.anchorTime = 0;
    this.evIdx = 0;
    this.events = [];
    this.timer = null;
    this.recording = false;
    this._noLoopEvents = false;
    this._dirty = false;
  }

  get project() { return this.state.project; }
  get spb() { return 60 / (this.project.tempo || 110); }
  get position() { return this._pos || 0; }

  beatToTime(beat) { return this.anchorTime + (beat - this.anchorBeat) * this.spb; }
  timeToBeat(time) { return this.anchorBeat + (time - this.anchorTime) / this.spb; }

  play() {
    if (this.playing) return;
    this.engine.resume();
    this.engine.rebuildAll(this.project);
    this.playing = true;
    this.anchorBeat = this.position;
    this.anchorTime = this.engine.ctx.currentTime + 0.08;
    this._pos = this.anchorBeat;
    this.rebuildEvents();
    this._noLoopEvents = false;
    this.timer = setInterval(() => this.tick(), 25);
    this.emitState();
  }

  stop() {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.engine.stopAll();
    this.emitState();
  }

  toggle() { if (this.playing) this.stop(); else this.play(); }

  rewind() { this.seek(0); }

  seek(beat) {
    this._pos = Math.max(0, beat);
    if (this.playing) {
      this.engine.stopAll();
      this.anchorBeat = this._pos;
      this.anchorTime = this.engine.ctx.currentTime + 0.03;
      this.evIdx = this.firstEventAt(this._pos);
      this._noLoopEvents = false;
    }
  }

  setTempo(bpm) {
    const p = this.project;
    if (this.playing) {
      const cur = this.timeToBeat(this.engine.ctx.currentTime);
      p.tempo = bpm;
      this.engine.pack.bpm = bpm;
      this.anchorBeat = cur;
      this.anchorTime = this.engine.ctx.currentTime;
    } else {
      p.tempo = bpm;
      if (this.engine.pack) this.engine.pack.bpm = bpm;
    }
  }

  markDirty() {
    if (!this.playing) return;
    // Re-flatten events while playing, keeping the schedule pointer near the playhead
    const pos = this.position;
    this.rebuildEvents();
    this.evIdx = this.firstEventAt(pos);
  }

  firstEventAt(beat) {
    const evs = this.events;
    let lo = 0, hi = evs.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (evs[mid].beat < beat) lo = mid + 1; else hi = mid; }
    return lo;
  }

  emitState() { this.dispatchEvent(new CustomEvent('playstate', { detail: { playing: this.playing, recording: this.recording } })); }

  /* ---------- event flattening ---------- */

  maxNoteEnd(notes) {
    let m = 0.25;
    for (const n of notes) m = Math.max(m, n.start + n.len);
    return m;
  }

  rebuildEvents() {
    const p = this.project;
    const soloed = p.tracks.some((t) => t.solo);
    const evs = [];
    for (const t of p.tracks) {
      if (t.mute || (soloed && !t.solo)) continue;
      for (const c of t.clips) {
        const clipStartB = c.start * 4;
        const clipEndB = (c.start + c.length) * 4;
        if (t.kind === 'drum' && c.steps) {
          for (let bar = 0; bar < c.length; bar++) {
            for (const [lane, arr] of Object.entries(c.steps)) {
              for (let s = 0; s < 16; s++) {
                const v = arr[s];
                if (!v) continue;
                let beat = clipStartB + bar * 4 + s * 0.25;
                if (s % 2 === 1 && p.swing > 0) beat += p.swing * 0.125;
                if (beat < clipEndB) evs.push({ beat, kind: 'drum', trackId: t.id, lane, vel: v * c.gain, kit: t.drumKit });
              }
            }
          }
        } else {
          const contentLen = c.loop ? Math.max(0.25, c.loopLen) : Math.max(0.25, this.maxNoteEnd(c.notes));
          const totalBeats = c.length * 4;
          const reps = c.loop ? Math.ceil(totalBeats / contentLen) : 1;
          for (let r = 0; r < reps; r++) {
            for (const n of c.notes) {
              const beat = clipStartB + r * contentLen + n.start;
              if (beat >= clipEndB) continue;
              evs.push({ beat, kind: 'note', trackId: t.id, midi: n.midi, vel: n.vel * c.gain, len: n.len, preset: t.preset });
            }
          }
        }
        if (c.sample) {
          if (c.sample.startsWith('sfx:')) {
            evs.push({ beat: clipStartB, kind: 'sfx', trackId: t.id, name: c.sample.slice(4), gain: c.gain });
          } else {
            evs.push({ beat: clipStartB, kind: 'sample', trackId: t.id, sample: c.sample, durBeats: c.length * 4, gain: c.gain });
          }
        }
      }
    }
    evs.sort((a, b) => a.beat - b.beat);
    this.events = evs;
  }

  /* ---------- scheduler ---------- */

  tick() {
    if (!this.playing) return;
    const t0 = performance.now();
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    const horizon = now + 0.16;
    const p = this.project;
    const loopOn = p.loop.on && !this._noLoopEvents;

    // Schedule events inside the horizon window
    let guard = 0;
    while (guard++ < 10000) {
      if (this.evIdx >= this.events.length) {
        if (loopOn && this.wrapEpoch()) continue;
        break;
      }
      const ev = this.events[this.evIdx];
      if (loopOn && ev.beat >= p.loop.end * 4) {
        if (this.wrapEpoch()) continue;
        break;
      }
      const time = this.beatToTime(ev.beat);
      if (time >= horizon) break;
      if (time >= now - 0.03) this.scheduleEvent(ev, time);
      this.evIdx++;
    }

    // Playhead position (with loop wrap for display)
    let raw = this.timeToBeat(now);
    if (loopOn && raw >= p.loop.end * 4) {
      const ls = p.loop.start * 4, le = p.loop.end * 4;
      raw = ls + ((raw - ls) % Math.max(0.25, le - ls));
    }
    this._pos = Math.max(0, raw);

    this.applyAutomation(now);
    if (p.metronome) this.scheduleMetronome(now, horizon);

    // Auto-stop at song end when loop is off
    if (!p.loop.on && raw >= p.bars * 4 + 2) {
      this.stop();
      this.seek(0);
      return;
    }

    const cost = performance.now() - t0;
    this.engine.cpu = this.engine.cpu * 0.88 + Math.min(100, (cost / 25) * 100) * 0.12;
  }

  wrapEpoch() {
    const p = this.project;
    const ls = p.loop.start * 4;
    const le = p.loop.end * 4;
    const idx = this.events.findIndex((e) => e.beat >= ls && e.beat < le);
    if (idx === -1) { this._noLoopEvents = true; return false; }
    // Re-anchor: the moment loop-end sounds becomes the moment loop-start plays
    this.anchorTime = this.beatToTime(p.loop.end * 4);
    this.anchorBeat = ls;
    this.evIdx = idx;
    return true;
  }

  scheduleEvent(ev, time) {
    const e = this.engine;
    if (ev.kind === 'note') e.synthNote(ev.trackId, ev.preset, ev.midi, time, ev.len * this.spb, ev.vel);
    else if (ev.kind === 'drum') e.drum(ev.trackId, ev.lane, time, ev.vel, ev.kit);
    else if (ev.kind === 'sfx') e.sfx(ev.name, time, ev.gain);
    else if (ev.kind === 'sample') e.ambient(ev.sample, time, ev.durBeats * this.spb, ev.gain);
  }

  applyAutomation(now) {
    const p = this.project;
    for (const t of p.tracks) {
      const chain = this.engine.chains.get(t.id);
      if (!chain) continue;
      const vol = t.automation && t.automation.volume;
      if (vol && vol.length) chain.gain.gain.setTargetAtTime(autoValue(vol, this.position), now, 0.06);
      const pan = t.automation && t.automation.pan;
      if (pan && pan.length && chain.pan.pan) chain.pan.pan.setTargetAtTime(autoValue(pan, this.position), now, 0.06);
    }
    const mv = p.master.automation && p.master.automation.volume;
    if (mv && mv.length) {
      this.engine.pack.master.gain.setTargetAtTime(autoValue(mv, this.position) * p.master.volume, now, 0.06);
    }
  }

  scheduleMetronome(now, horizon) {
    const p = this.project;
    const beatsPerBar = p.timeSigNum || 4;
    const endB = Math.min(this.timeToBeat(horizon), p.bars * 4);
    let b = Math.ceil(this.timeToBeat(now) - 0.001);
    while (b < endB) {
      const time = this.beatToTime(b);
      if (time >= now - 0.02 && time < horizon) this.click(time, b % beatsPerBar === 0);
      b += 1;
    }
  }

  click(time, accent) {
    const ctx = this.engine.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = accent ? 1400 : 900;
    g.gain.setValueAtTime(0.18, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    o.connect(g); g.connect(this.engine.pack.clickBus);
    o.start(time); o.stop(time + 0.06);
  }

  /* ---------- musical typing capture ---------- */

  recordNote(midi, vel = 0.85) {
    if (!this.recording || !this.playing) return false;
    const st = this.state;
    const track = st.selectedTrack();
    if (!track || track.kind !== 'synth') return false;
    let clip = st.selectedClip();
    if (!clip) {
      const startBar = Math.floor(this.position / 4);
      clip = st.addClip(track.id, { start: startBar, length: 4, name: 'Take 1' });
      st.select(track.id, clip.id);
    }
    const local = this.position - clip.start * 4;
    if (local < 0 || local > clip.length * 4) return false;
    st.addNote(track.id, clip.id, { midi, start: Math.round(local * 4) / 4, len: 0.5, vel });
    return true;
  }
}

function autoValue(points, beat) {
  if (!points.length) return 0;
  if (beat <= points[0].beat) return points[0].value;
  for (let i = 1; i < points.length; i++) {
    if (beat <= points[i].beat) {
      const a = points[i - 1], b = points[i];
      const f = (beat - a.beat) / Math.max(0.0001, b.beat - a.beat);
      return a.value + (b.value - a.value) * f;
    }
  }
  return points[points.length - 1].value;
}
