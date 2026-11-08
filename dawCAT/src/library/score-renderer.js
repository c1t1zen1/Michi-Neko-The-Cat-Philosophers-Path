import { pcm, mixMono, edgeFade, biquad, stats, dbGain } from './pcm.js';
import { synthVoice, drumVoice } from './voices.js';
import { buildClipEvents } from '../engine/transport.js';
import { roomReturn, dynamics } from './mastering.js';

export function automationValue(points, beat, fallback) {
  if (!points?.length) return fallback;
  if (beat <= points[0].beat) return points[0].value;
  for (let i = 1; i < points.length; i++) if (beat <= points[i].beat) {
    const a = points[i - 1], b = points[i]; return a.value + (b.value - a.value) * (beat - a.beat) / Math.max(.00001, b.beat - a.beat);
  }
  return points[points.length - 1].value;
}
export function waveformPeaks(buffer, count = 640) {
  const out = [];
  for (let j = 0; j < count; j++) {
    let p = 0, start = Math.floor(j * buffer.length / count), end = Math.floor((j + 1) * buffer.length / count);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) { const d = buffer.getChannelData(ch); for (let i = start; i < end; i++) p = Math.max(p, Math.abs(d[i])); }
    out.push(Math.round(p * 1000) / 1000);
  }
  return out;
}
// This portable bounce is for the authored Kyoto library. Editable projects
// containing imported audio or insert devices use engine/render.js instead.
export function renderScore(project, { sampleRate = 48000, trackId = null, master = true, onProgress = () => {} } = {}) {
  const sr = sampleRate, spb = 60 / project.tempo;
  const end = Math.max(...project.tracks.flatMap(t => t.clips.map(c => (c.start + c.length) * 4)), 4);
  const length = Math.ceil((end * spb + 4) * sr), mix = pcm(sr, [new Float32Array(length), new Float32Array(length)]), send = pcm(sr, [new Float32Array(length), new Float32Array(length)]);
  const soloed = project.tracks.some(t => t.solo), cache = new Map();
  for (let ti = 0; ti < project.tracks.length; ti++) {
    const t = project.tracks[ti];
    if (trackId && t.id !== trackId || t.mute || soloed && !t.solo) continue;
    if (t.devices?.some(d => d.on) || t.clips.some(c => c.audio || c.sample)) throw new Error('Use the DAW Render WAV command for imported audio and insert effects');
    const dry = pcm(sr, [new Float32Array(length), new Float32Array(length)]);
    let events = 0;
    for (const c of t.clips) for (const ev of buildClipEvents(project, t, c)) {
      const vel = Math.round(ev.vel * 12) / 12, dur = Math.round((ev.len || .25) * spb * 20) / 20;
      const key = `${ev.kind}:${t.preset?.model}:${ev.midi}:${dur}:${vel}:${ev.lane}:${t.drumKit}:${events % 3}`;
      let voice = cache.get(key);
      if (!voice) {
        voice = ev.kind === 'drum' ? drumVoice(ev.lane, t.drumKit, vel, sr, events % 3) : synthVoice(t.preset.model, ev.midi, dur, vel, sr, events % 3, t.preset);
        // Bounded cache, so exporting all 25 cues doesn't retain every note.
        if (cache.size > 220) cache.clear();
        cache.set(key, voice);
      }
      mixMono(dry, voice, ev.beat * spb, ev.kind === 'note' ? (t.preset.gain ?? .62) : 1);
      events++;
    }
    const L = dry.getChannelData(0), R = dry.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const beat = i / sr / spb, g = automationValue(t.automation?.volume, beat, t.volume);
      const pan = automationValue(t.automation?.pan, beat, t.pan), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
      L[i] *= g * gl; R[i] *= g * gr;
      mix.getChannelData(0)[i] += L[i]; mix.getChannelData(1)[i] += R[i];
      send.getChannelData(0)[i] += L[i] * (t.sends?.a || 0); send.getChannelData(1)[i] += R[i] * (t.sends?.a || 0);
      // A short tempo-aware feed-forward echo, printed identically into stems.
      const echoAt = i + Math.round(spb * .75 * sr);
      if (echoAt < length) { mix.getChannelData(0)[echoAt] += R[i] * (t.sends?.b || 0) * .4; mix.getChannelData(1)[echoAt] += L[i] * (t.sends?.b || 0) * .4; }
    }
    onProgress({ track: ti + 1, total: project.tracks.length, name: t.name });
  }
  const room = roomReturn(send, .65);
  for (let ch = 0; ch < 2; ch++) {
    const d = mix.getChannelData(ch), r = room.getChannelData(ch);
    for (let i = 0; i < length; i++) d[i] = (d[i] + r[i]) * project.master.volume;
    biquad(d, sr, 'highpass', 28); edgeFade(d, sr, .035);
    // A musical four-second tail; the final half second falls fully to zero.
    for (let i = Math.max(0, length - Math.round(sr * .6)); i < length; i++) d[i] *= (length - 1 - i) / (sr * .6);
  }
  if (!master) return mix;
  const out = dynamics(mix, { threshold: -18, ratio: 1.7, attack: .02, release: .22 });
  const measured = stats(out), gain = Math.min(dbGain(-22 - measured.rmsDb), dbGain(-2) / Math.max(measured.peak, 1e-9));
  for (let ch = 0; ch < 2; ch++) { const d = out.getChannelData(ch); for (let i = 0; i < length; i++) d[i] *= gain; }
  return out;
}
