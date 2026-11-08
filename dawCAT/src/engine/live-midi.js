import { playSynthNote } from './synth.js';

export function decodeMidi(data) {
  const [status, a = 0, b = 0] = data, kind = status & 0xf0, channel = status & 15;
  if (kind === 0x90 && b) return { type: 'on', channel, note: a, velocity: b / 127 };
  if (kind === 0x80 || kind === 0x90) return { type: 'off', channel, note: a };
  if (kind === 0xb0) return { type: 'cc', channel, controller: a, value: b / 127 };
  if (kind === 0xe0) return { type: 'bend', channel, semitones: (((b << 7) | a) - 8192) / 8192 * 2 };
  return { type: 'other', channel };
}

export class LiveMidi extends EventTarget {
  constructor(app) {
    super(); this.app = app; this.access = null; this.inputId = 'all'; this.voices = new Map(); this.sustain = new Map(); this.bends = new Map(); this.status = 'MIDI disconnected';
    app.transport.addEventListener('playstate', () => { if (!app.transport.playing) this.panic(); });
  }
  report(message) { this.status = message; this.dispatchEvent(new Event('change')); }
  async connect() {
    if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is unavailable here. Try Chrome or Edge on localhost. MIDI files work in every supported browser.');
    await this.app.engine.resume();
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.onstatechange = () => this.bind(); this.bind();
  }
  bind() {
    this.panic();
    for (const input of this.access.inputs.values()) input.onmidimessage = e => {
      if (this.inputId === 'all' || this.inputId === input.id) this.receive(e.data, input.id);
    };
    const count = [...this.access.inputs.values()].filter(i => i.state === 'connected').length;
    this.report(count ? `${count} MIDI input${count > 1 ? 's' : ''} connected` : 'MIDI enabled · connect a keyboard');
  }
  receive(data, input = 'keyboard') {
    const m = decodeMidi(data), key = `${input}:${m.channel}:${m.note}`, channel = `${input}:${m.channel}`;
    if (m.type === 'on') this.noteOn(key, channel, m.note, m.velocity);
    if (m.type === 'off') this.noteOff(key, channel);
    if (m.type === 'cc' && m.controller === 64) {
      this.sustain.set(channel, m.value >= .5);
      if (m.value < .5) for (const [key,v] of this.voices) if (v.channel === channel && v.released) this.finish(key);
    }
    if (m.type === 'cc' && [120,123].includes(m.controller)) this.panic();
    if (m.type === 'bend') {
      this.bends.set(channel, m.semitones);
      for (const v of this.voices.values()) if (v.channel === channel) this.bend(v, m.semitones);
    }
  }
  bend(v, semitones) {
    const t = this.app.engine.ctx.currentTime;
    for (const src of v.sources) if (src.detune) src.detune.setTargetAtTime(semitones * 100, t, .012);
  }
  noteOn(key, channel, midi, velocity) {
    if (this.voices.has(key)) this.finish(key);
    if (this.voices.size >= 24) this.finish(this.voices.keys().next().value);
    const { engine, state, transport } = this.app, track = state.selectedTrack();
    if (!track || track.kind !== 'synth') return;
    engine.ensure(); engine.rebuildAll(state.project);
    let recordClip = state.selectedClip();
    const record = transport.playing && transport.recording && track.arm;
    const recordBeat = transport.playing ? Math.max(0, transport.timeToBeat(engine.ctx.currentTime)) : 0;
    if (record && !recordClip) { recordClip = state.addClip(track.id, { name: 'MIDI take', start: Math.floor(recordBeat / 4), length: 4 }); state.select(track.id, recordClip.id); }
    const ctx = engine.ctx, bus = ctx.createGain(), sources = []; bus.connect(engine.trackInput(track.id));
    playSynthNote(engine.pack, bus, track.preset, midi, ctx.currentTime + .004, 12, velocity, n => { sources.push(n); engine.register(n); });
    const v = { channel, trackId: track.id, clipId: recordClip?.id || null, midi, velocity, sources, bus, at: ctx.currentTime,
      beat: recordBeat, record, released: false };
    this.voices.set(key, v); this.bend(v, this.bends.get(channel) || 0);
  }
  noteOff(key, channel) { const v = this.voices.get(key); if (!v) return; if (this.sustain.get(channel)) v.released = true; else this.finish(key); }
  finish(key) {
    const v = this.voices.get(key); if (!v) return;
    const { engine, state, transport } = this.app, now = engine.ctx.currentTime;
    v.bus.gain.setTargetAtTime(0, now, .025);
    for (const src of v.sources) { try { src.stop(now + .15); } catch {} }
    setTimeout(() => v.bus.disconnect(), 180);
    if (v.record) {
      const track = state.track(v.trackId);
      if (track) {
        let clip = track.clips.find(c => c.id === v.clipId);
        if (!clip) { clip = state.addClip(track.id, { name: 'MIDI take', start: Math.floor(v.beat / 4), length: 4 }); state.select(track.id, clip.id); }
        const local = v.beat - clip.start * 4, duration = Math.max(.05, (now - v.at) / transport.spb);
        if (local >= 0) { if (local + duration > clip.length * 4) state.updateClip(track.id, clip.id, { length: Math.ceil((local + duration) / 4) }); state.addNote(track.id, clip.id, { midi: v.midi, start: local, len: duration, vel: v.velocity }); }
      }
    }
    this.voices.delete(key);
  }
  panic() { for (const key of [...this.voices.keys()]) this.finish(key); this.sustain.clear(); this.bends.clear(); }
  disconnect() { this.panic(); if (this.access) { this.access.onstatechange = null; for (const input of this.access.inputs.values()) input.onmidimessage = null; } this.access = null; this.report('MIDI disconnected'); }
}
