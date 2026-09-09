/* dawCAT — game cue scanner: reads the game's source over HTTP and extracts music cues.
   Works when dawCAT is served from the same static server as the game (e.g. /dawCAT/ next to /src/). */

import { hzToMidi } from './state.js';

// The game currently has one continuous scene, so every scanned cue is tagged
// with this constant. When the game grows more scenes, give each its own
// scanner pass (or a per-file scene map) so cues carry a real scene id —
// the sidebar grouping and export Scene/Time-of-Day pickers already key off
// this field and need no further changes.
const SCENE = 'Overworld';

export async function discoverFiles() {
  const files = new Set(['src/music.js', 'src/audio.js']);
  try {
    const html = await fetchText('../index.html');
    if (html) {
      const entry = /<script[^>]+type="module"[^>]+src="(src\/[^"?]+)/.exec(html)
        || /<script[^>]+src="(src\/[^"?]+)/.exec(html);
      if (entry) files.add(entry[1]);
    }
    for (const f of [...files]) {
      const text = await fetchText('../' + f);
      if (!text) continue;
      const re = /from\s+['"]\.\/([A-Za-z0-9_./-]+\.js)/g;
      let m;
      while ((m = re.exec(text))) files.add('src/' + m[1].replace(/^\.\//, ''));
    }
  } catch (e) { /* offline / file:// — fall back to defaults */ }
  return [...files].slice(0, 40);
}

export async function scanGameCues(onProgress) {
  const files = await discoverFiles();
  const cues = [];
  const errors = [];
  let done = 0;
  for (const file of files) {
    const text = await fetchText('../' + file);
    if (!text) { errors.push(file); continue; }
    try { scanText(file, text, cues); } catch (e) { errors.push(file); }
    done++;
    if (onProgress) onProgress(done, files.length);
  }
  cues.sort((a, b) => (a.file + a.name).localeCompare(b.file + b.name));
  return { at: Date.now(), files, cues, errors };
}

/* ---------------- per-file scanning ---------------- */

function scanText(file, text, out) {
  const lines = text.split('\n');

  // 1) MusicDirector-style phase objects: this.phases = { dawn: {...}, day: {...} ... }
  const phasesIdx = text.search(/this\.phases\s*=\s*\{|phases\s*=\s*\{/);
  if (phasesIdx >= 0) {
    const block = extractBlock(text, text.indexOf('{', phasesIdx));
    if (block) {
      const phaseRe = /(\w+)\s*:\s*\{/g;
      let pm;
      while ((pm = phaseRe.exec(block))) {
        const name = pm[1];
        const body = extractBlock(block, block.indexOf('{', pm.index));
        if (!body) continue;
        const root = num(body, /root:\s*([\d.]+)/);
        const chord = nums(body, /chord:\s*\[([^\]]*)\]/);
        const scale = nums(body, /scale:\s*\[([^\]]*)\]/);
        const density = num(body, /density:\s*([\d.]+)/);
        const cutoff = num(body, /cutoff:\s*([\d.]+)/);
        if (root == null && !chord.length && !scale.length) continue;
        out.push({
          id: `phase:${file}:${name}`,
          kind: 'phase', name: cap(name), file, line: lineOf(lines, text, body),
          scene: SCENE, timeOfDay: name,
          rootHz: root, chord, scale, density, cutoff
        });
      }
    }
  }

  // 2) play*/start* methods → SFX / ambient cues
  const methodRe = /\b(play|start)([A-Z]\w*)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = methodRe.exec(text))) {
    const body = extractBlock(text, text.indexOf('{', m.index));
    if (!body) continue;
    const oscTypes = [...body.matchAll(/\.type\s*=\s*['"](\w+)['"]/g)].map((x) => x[1]);
    const arrays = [...body.matchAll(/(?:const|let|this\.)(\w*)\s*=\s*\[([\d\s.,]+)\]/g)]
      .map((x) => ({ name: x[1], values: x[2].split(',').map(parseFloat).filter((v) => isFinite(v)) }))
      .filter((a) => a.values.length >= 2 && a.values.every((v) => v > 20 && v < 9500));
    const freqs = freqValues(body);
    const hz = hzAll(arrays, freqs);
    const isAmbient = m[0].startsWith('start');
    const hasContent = oscTypes.length > 0 || hz.length > 0 || /createBuffer|createOscillator/.test(body);
    if (!hasContent) continue;
    out.push({
      id: `m:${file}:${m[2]}:${lineOf(lines, text, m[0])}`,
      kind: isAmbient ? 'ambient' : 'sfx',
      name: cap(splitCamel(m[2])),
      file, line: lineOf(lines, text, body),
      scene: SCENE, timeOfDay: null,
      oscTypes: [...new Set(oscTypes)],
      hz, midi: hz.map(hzToMidi),
      dur: durOf(body),
      filter: firstMatch(body, /filter\.type\s*=\s*['"](\w+)['"]/),
      filterFreq: num(body, /filter\.frequency\.value\s*=\s*([\d.]+)/)
    });
  }

  // 3) standalone frequency arrays anywhere (melodies, chords, scales)
  const arrRe = /(?:const|let|this\.)(\w+)\s*=\s*\[([^\]]*[\d.][^\]]*)\]/g;
  let am;
  while ((am = arrRe.exec(text))) {
    const vals = am[2].split(',').map((s) => parseFloat(s.trim())).filter((v) => isFinite(v));
    if (vals.length < 3 || !vals.every((v) => v > 20 && v < 9500)) continue;
    const varName = am[1];
    if (!/(?:notes|chord|pentatonic|scale|freq|melody|chime|bell|arpeggio)/i.test(varName)) continue;
    out.push({
      id: `arr:${file}:${varName}`,
      kind: /chord/i.test(varName) ? 'chord' : /scale|pentatonic/i.test(varName) ? 'scale' : 'notes',
      name: cap(splitCamel(varName)), file, line: lineOf(lines, text, am[0]),
      scene: SCENE, timeOfDay: null,
      hz: vals, midi: vals.map(hzToMidi)
    });
  }
}

/* ---------------- helpers ---------------- */

async function fetchText(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) { return null; }
}

function extractBlock(text, openIdx) {
  if (openIdx < 0) return null;
  let depth = 0;
  const max = Math.min(text.length, openIdx + 20000);
  for (let i = openIdx; i < max; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(openIdx, i + 1); }
  }
  return null;
}

function lineOf(lines, text, needle) {
  const idx = text.indexOf(needle);
  if (idx < 0) return 0;
  let line = 1;
  for (let i = 0; i < idx && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

function num(s, re) { const m = re.exec(s); return m ? parseFloat(m[1]) : null; }
function nums(s, re) {
  const m = re.exec(s);
  return m ? m[1].split(',').map((v) => parseFloat(v.trim())).filter((v) => isFinite(v)) : [];
}
function firstMatch(s, re) { const m = re.exec(s); return m ? m[1] : null; }

function splitCamel(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2'); }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function freqValues(body) {
  const out = [];
  const re = /frequency\.value\s*=\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(body))) out.push(parseFloat(m[1]));
  return out;
}

function hzAll(arrays, freqs) {
  const all = [];
  for (const a of arrays) for (const v of a.values) if (v > 20 && v < 9500) all.push(v);
  for (const f of freqs) if (f > 20 && f < 9500) all.push(f);
  return all;
}

function durOf(body) {
  let d = 0.5;
  const re = /stop\([^)]*?\+\s*([\d.]+)\)/g;
  let m;
  while ((m = re.exec(body))) d = Math.max(d, parseFloat(m[1]));
  return d;
}
