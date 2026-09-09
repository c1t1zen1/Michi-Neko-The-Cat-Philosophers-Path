/* dawCAT — Standard MIDI File (SMF) import/export: a small hand-rolled
   Format-1 reader/writer (no external deps), following the same
   "hand-roll binary formats" precedent as engine/render.js's WAV writer.

   Only note data survives the round trip — drum-lane steps, imported
   audio, FX-chain devices and automation are explicitly out of scope,
   same "documented, not silently mishandled" philosophy as the rest of
   the game-export path (see bridge.js). */
import { maxNoteEnd } from './bridge.js';

const PPQ = 480; // ticks per quarter note == 1 dawCAT "beat", independent of tempo

/* ================= export ================= */

function writeVarLen(value) {
  const bytes = [value & 0x7f];
  let v = value >> 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

function pushStr(bytes, str) {
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xff);
}

function pushU32(bytes, v) {
  bytes.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
}

function pushU16(bytes, v) {
  bytes.push((v >>> 8) & 0xff, v & 0xff);
}

function metaEvent(type, data) {
  return [0xff, type, data.length, ...data];
}

function textMeta(type, text) {
  const data = [];
  for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i) & 0xff);
  return metaEvent(type, data);
}

/* events: [{tick, bytes}], any order — sorted here before delta-encoding */
function trackChunk(events) {
  const sorted = events.slice().sort((a, b) => a.tick - b.tick);
  const body = [];
  let lastTick = 0;
  for (const ev of sorted) {
    body.push(...writeVarLen(Math.max(0, ev.tick - lastTick)));
    body.push(...ev.bytes);
    lastTick = ev.tick;
  }
  body.push(...writeVarLen(0), 0xff, 0x2f, 0x00); // End of Track
  const chunk = [];
  pushStr(chunk, 'MTrk');
  pushU32(chunk, body.length);
  return chunk.concat(body);
}

/* Flattens a track's clip content into absolute-beat note events, using the
   same clip-loop-repeat math as bridge.js's buildExportPayload()/
   transport.js's rebuildEvents() so the exported MIDI matches what's
   actually heard on playback. Drum tracks (step lanes, not note lists)
   are the caller's responsibility to skip. */
function flattenTrackNotes(track) {
  const notes = [];
  for (const c of track.clips) {
    const clipStartB = c.start * 4;
    const clipEndB = (c.start + c.length) * 4;
    const contentLen = c.loop ? Math.max(0.25, c.loopLen) : Math.max(0.25, maxNoteEnd(c.notes));
    const totalBeats = c.length * 4;
    const reps = c.loop ? Math.ceil(totalBeats / contentLen) : 1;
    for (let r = 0; r < reps; r++) {
      for (const n of c.notes) {
        const beat = clipStartB + r * contentLen + n.start;
        if (beat >= clipEndB) continue;
        notes.push({ beat, len: n.len, midi: n.midi, vel: n.vel });
      }
    }
  }
  notes.sort((a, b) => a.beat - b.beat);
  return notes;
}

/* Builds a Format-1 SMF: track 0 carries tempo/time-sig/name meta, one
   track per synth track carries that track's flattened notes. Returns a
   Uint8Array ready to hand to Blob/download(). */
export function writeMidiFile(project) {
  const usPerQuarter = Math.max(1, Math.round(60000000 / (project.tempo || 110)));
  const synthTracks = project.tracks.filter((t) => t.kind !== 'drum' && t.clips.some((c) => c.notes && c.notes.length));

  const header = [];
  pushStr(header, 'MThd');
  pushU32(header, 6);
  pushU16(header, 1); // format 1
  pushU16(header, 1 + synthTracks.length);
  pushU16(header, PPQ);

  const denomExp = Math.max(0, Math.round(Math.log2(project.timeSigDen || 4)));
  const tempoTrack = trackChunk([
    { tick: 0, bytes: metaEvent(0x51, [(usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff]) },
    { tick: 0, bytes: metaEvent(0x58, [project.timeSigNum || 4, denomExp, 24, 8]) },
    { tick: 0, bytes: textMeta(0x03, project.name || 'dawCAT') }
  ]);
  const chunks = [header, tempoTrack];

  for (const t of synthTracks) {
    const notes = flattenTrackNotes(t);
    const evs = [{ tick: 0, bytes: textMeta(0x03, t.name || 'Track') }];
    for (const n of notes) {
      const onTick = Math.round(n.beat * PPQ);
      const offTick = Math.max(onTick + 1, Math.round((n.beat + Math.max(0.05, n.len)) * PPQ));
      const vel = Math.max(1, Math.min(127, Math.round(n.vel * 127)));
      const note = Math.max(0, Math.min(127, Math.round(n.midi)));
      evs.push({ tick: onTick, bytes: [0x90, note, vel] });
      evs.push({ tick: offTick, bytes: [0x80, note, 0] });
    }
    chunks.push(trackChunk(evs));
  }

  return new Uint8Array(chunks.flat());
}

/* ================= import ================= */

function readVarLen(bytes, pos) {
  let value = 0;
  let b;
  do {
    b = bytes[pos.i++];
    value = (value << 7) | (b & 0x7f);
  } while (b & 0x80);
  return value >>> 0;
}

/* Parses a Format 0/1 SMF (running status supported). Best-effort, matching
   scanner.js's per-file try/catch philosophy: unsupported/unknown status
   bytes stop parsing the current track rather than throwing, so a partially
   exotic file still yields whatever tracks/notes it could read.
   Explicitly out of scope: multiple tempo changes (only the first is used),
   CC/pitch-bend automation, SysEx payloads (skipped), Format 2. */
export function parseMidiFile(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const pos = { i: 0 };

  function readStr(n) {
    let s = '';
    for (let k = 0; k < n; k++) s += String.fromCharCode(view[pos.i++]);
    return s;
  }
  function readU32() {
    const v = ((view[pos.i] << 24) | (view[pos.i + 1] << 16) | (view[pos.i + 2] << 8) | view[pos.i + 3]) >>> 0;
    pos.i += 4;
    return v;
  }
  function readU16() {
    const v = (view[pos.i] << 8) | view[pos.i + 1];
    pos.i += 2;
    return v;
  }

  if (view.length < 14 || readStr(4) !== 'MThd') throw new Error('Not a MIDI file (missing MThd)');
  readU32(); // header chunk length, always 6
  readU16(); // format — read but not branched on; format 0/1 both parse fine as "N tracks"
  const ntrks = readU16();
  const division = readU16();
  if (division & 0x8000) throw new Error('SMPTE time-code based MIDI files are not supported');
  const ppq = division || PPQ;

  let tempoUsPerQuarter = 500000; // default 120bpm if the file has no Set Tempo meta
  let tempoSeen = false;
  const tracks = [];

  for (let ti = 0; ti < ntrks && pos.i < view.length; ti++) {
    if (readStr(4) !== 'MTrk') throw new Error('Malformed MIDI file (missing MTrk)');
    const len = readU32();
    const end = pos.i + len;
    let tick = 0;
    let runningStatus = 0;
    let name = `Track ${ti + 1}`;
    const active = new Map(); // midi note -> {tick, vel}
    const notes = [];

    while (pos.i < end) {
      const delta = readVarLen(view, pos);
      tick += delta;
      let status = view[pos.i];
      if (status & 0x80) { pos.i++; runningStatus = status; } else { status = runningStatus; }
      const type = status & 0xf0;

      if (status === 0xff) {
        const metaType = view[pos.i++];
        const mlen = readVarLen(view, pos);
        const data = view.slice(pos.i, pos.i + mlen);
        pos.i += mlen;
        if (metaType === 0x51 && data.length >= 3 && !tempoSeen) {
          tempoUsPerQuarter = (data[0] << 16) | (data[1] << 8) | data[2];
          tempoSeen = true;
        } else if (metaType === 0x03 && data.length) {
          name = String.fromCharCode(...data);
        }
      } else if (status === 0xf0 || status === 0xf7) {
        const slen = readVarLen(view, pos);
        pos.i += slen; // SysEx payload, skipped
      } else if (type === 0x90 || type === 0x80) {
        const note = view[pos.i++];
        const vel = view[pos.i++];
        if (type === 0x90 && vel > 0) {
          active.set(note, { tick, vel });
        } else {
          const on = active.get(note);
          if (on) {
            notes.push({ start: on.tick / ppq, len: Math.max(0.05, (tick - on.tick) / ppq), midi: note, vel: on.vel / 127 });
            active.delete(note);
          }
        }
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
        pos.i += 2; // aftertouch / CC / pitch bend — 2 data bytes, ignored
      } else if (type === 0xc0 || type === 0xd0) {
        pos.i += 1; // program change / channel pressure — 1 data byte, ignored
      } else {
        break; // unknown/malformed status — stop this track, keep whatever was read
      }
    }
    pos.i = end; // resync to the chunk boundary regardless of how parsing ended
    notes.sort((a, b) => a.start - b.start);
    if (notes.length) tracks.push({ name, notes });
  }

  const bpm = Math.round((60000000 / tempoUsPerQuarter) * 100) / 100;
  return { bpm, tracks };
}
