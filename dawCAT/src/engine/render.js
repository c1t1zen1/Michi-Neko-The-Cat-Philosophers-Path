/* dawCAT — offline render to WAV */
import { buildMasterPack, buildTrackChain } from './core.js';
import { playSynthNote, playGameSfx, playAmbient } from './synth.js';
import { playDrum } from './drums.js';

function maxNoteEnd(notes) {
  let m = 0.25;
  for (const n of notes) m = Math.max(m, n.start + n.len);
  return m;
}

export function songEndBeat(project) {
  let end = 4;
  for (const t of project.tracks) {
    for (const c of t.clips) end = Math.max(end, (c.start + c.length) * 4);
  }
  return end;
}

export async function renderProject(project, onProgress) {
  const spb = 60 / (project.tempo || 110);
  const endBeat = songEndBeat(project);
  const seconds = endBeat * spb + 2.5;
  const sampleRate = 44100;
  const OfflineAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineAC) throw new Error('OfflineAudioContext not supported');
  const ctx = new OfflineAC(2, Math.ceil(seconds * 44100), 44100);

  const pack = buildMasterPack(ctx);
  pack.bpm = project.tempo;
  pack.master.gain.value = project.master.volume;

  const soloed = project.tracks.some((t) => t.solo);
  let done = 0;
  const total = project.tracks.length || 1;
  for (const t of project.tracks) {
    if (t.mute || (soloed && !t.solo)) continue;
    const chain = buildTrackChain(pack, t, project);
    for (const c of t.clips) {
      const clipStartSec = c.start * 4 * spb;
      if (t.kind === 'drum' && c.steps) {
        for (let bar = 0; bar < c.length; bar++) {
          for (const [lane, arr] of Object.entries(c.steps)) {
            for (let s = 0; s < 16; s++) {
              const v = arr[s];
              if (!v) continue;
              let beat = bar * 4 + s * 0.25;
              if (s % 2 === 1 && project.swing > 0) beat += project.swing * 0.125;
              playDrum(pack, chain.input, lane, clipStartSec + beat * spb, v * c.gain, t.drumKit, null);
            }
          }
        }
      } else {
        const contentLen = c.loop ? Math.max(0.25, c.loopLen) : Math.max(0.25, maxNoteEnd(c.notes));
        const totalBeats = c.length * 4;
        const reps = c.loop ? Math.ceil(totalBeats / contentLen) : 1;
        for (let r = 0; r < reps; r++) {
          for (const n of c.notes) {
            const beat = r * contentLen + n.start;
            if (beat >= c.length * 4) continue;
            playSynthNote(pack, chain.input, t.preset, n.midi, clipStartSec + beat * spb, n.len * spb, n.vel * c.gain, null);
          }
        }
      }
      if (c.sample) playAmbient(pack, chain.input, c.sample, clipStartSec, c.length * 4 * spb, c.gain, null);
    }
    done++;
    if (onProgress) onProgress(`Rendering track ${done}/${total}…`);
  }

  if (onProgress) onProgress('Rendering…');
  const buffer = await ctx.startRendering();
  if (onProgress) onProgress('Encoding WAV…');
  return wavBlob(buffer);
}

export function wavBlob(buffer) {
  const numCh = Math.min(2, buffer.numberOfChannels);
  const len = buffer.length;
  const bytes = 44 + len * numCh * 2;
  const ab = new ArrayBuffer(bytes);
  const view = new DataView(ab);
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, len * numCh * 2, true);
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let v = buffer.getChannelData(ch)[i];
      v = Math.max(-1, Math.min(1, v));
      view.setInt16(44 + (i * numCh + ch) * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
