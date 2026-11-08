import { random, seedOf } from './pcm.js';
import { instrumentPreset } from './instruments.js';

export const MODES = { yo: [0, 2, 5, 7, 9], hirajoshi: [0, 2, 3, 7, 8], 'in sen': [0, 1, 5, 7, 10], iwato: [0, 1, 5, 6, 10], 'pentatonic major': [0, 2, 4, 7, 9], dorian: [0, 2, 3, 5, 7, 9, 10] };
// Motifs, durations, harmony paths and ensemble choices are authored per cue;
// the seeded arranger develops them into six sections, never a random note soup.
const cue = (id, name, japanese, tempo, root, mode, motif, rhythm, lead, reply, groove, modern, harmony, description) =>
  ({ id, name, japanese, tempo, root, mode, motif, rhythm, lead, reply, groove, modern, harmony, description, type: 'song', category: modern > .55 ? 'Edo × modern' : 'Kyoto chamber', bars: 36, seed: seedOf(id), duration: 36 * 240 / tempo + 4 });
export const SCORES = [
  cue('01-dawn-at-higashiyama', 'Dawn at Higashiyama', '東山の朝', 72, 62, 'yo', [0,2,3,2,1,0,4,3], [1,.5,.5,2,1,1,1,1], 'koto','shakuhachi','air',.15,[0,0,3,0], 'Silk strings answer a breathy bamboo line; open fifths leave space for the waking garden.'),
  cue('02-paws-on-stone', 'Paws on Stone', '石畳の足音', 96, 60, 'pentatonic major', [0,1,3,2,1,4,3,0], [.5,.5,1,.5,.5,1,2,2], 'koto-muted','shinobue','skip',.42,[0,3,1,0], 'Playful short plucks, skipping wood percussion and a rounded walking bass.'),
  cue('03-kamo-reflections', 'Kamo Reflections', '鴨川の光', 82, 65, 'yo', [3,2,0,1,2,4,3,1], [1,1,2,.5,.5,1,1,1], 'shakuhachi','koto','water',.36,[0,2,3,0], 'Long flute breaths float over rippling strings and understated tine keys.'),
  cue('04-machiya-window', 'The Machiya Window', '町家の窓', 88, 57, 'hirajoshi', [0,2,1,0,3,4,2,1], [.5,1,.5,2,.5,.5,1,2], 'shamisen','koto-muted','chamber',.22,[0,0,2,0], 'A dry bachi conversation with muted strings in a small wooden room.'),
  cue('05-rain-on-washi', 'Rain on Washi', '和紙の雨', 68, 62, 'in sen', [0,1,3,4,3,2,1,0], [2,1,1,.5,.5,1,1,1], 'felt-piano','shakuhachi','rain',.67,[0,2,4,0], 'Felt piano, bamboo breath and widely spaced droplets over a quiet modern pulse.'),
  cue('06-tea-house-swing', 'Tea House Swing', '茶屋の午後', 92, 65, 'pentatonic major', [2,3,4,2,0,1,3,0], [.5,.5,1,1,.5,.5,2,2], 'koto','rhodes','swing',.78,[0,3,4,1], 'Koto and warm tines trade syncopated phrases above brushed percussion.'),
  cue('07-bamboo-breath', 'Bamboo Breath', '竹の息', 60, 62, 'in sen', [0,3,2,1,0,4,3,0], [2,2,1,1,.5,.5,.5,.5], 'shakuhachi','biwa','air',.08,[0,0,0,3], 'Sparse flute and low biwa punctuation, with whole bars left to resonate.'),
  cue('08-nishiki-morning', 'Nishiki Morning', '錦の朝', 108, 60, 'yo', [0,1,2,4,3,2,1,3], [.5,.5,.5,.5,1,1,2,2], 'shamisen','shinobue','market',.4,[0,1,3,0], 'Bright shamisen gestures and flute replies weave through a small festive groove.'),
  cue('09-moon-pool', 'Moon Pool', '月の池', 64, 59, 'iwato', [0,2,1,3,4,2,1,0], [2,1,1,1,1,.5,.5,1], 'singing-bowl','shakuhachi','air',.32,[0,0,2,0], 'Slow bronze resonances and low breath lines above a dark reed cloud.'),
  cue('10-lantern-glade', 'Lantern Glade', '灯りの林', 76, 64, 'hirajoshi', [0,2,4,3,1,2,0,1], [1,.5,.5,1,1,2,1,1], 'koto','furin','lantern',.48,[0,2,0,3], 'Glass overtones pick up the ends of a gentle silk-string melody.'),
  cue('11-roof-road', 'Roof Road', '屋根道', 116, 62, 'yo', [0,3,2,4,3,1,2,0], [.5,.5,.5,.5,.5,.5,1,4], 'shamisen','silk-lead','roof',.72,[0,3,4,0], 'Agile bachi figures, syncopated bass and brief neon answers keep the run buoyant.'),
  cue('12-gion-afterglow', 'Gion Afterglow', '祇園の余韻', 104, 67, 'yo', [0,2,3,4,2,1,3,0], [1,.5,.5,1,.5,.5,2,2], 'shinobue','shamisen','festival',.3,[0,0,3,0], 'An original flute, kane and shime-inspired conversation, not a traditional festival tune.'),
  cue('13-five-quiet-fires', 'Five Quiet Fires', '五つの灯', 80, 60, 'hirajoshi', [0,3,4,2,1,0,2,3], [2,1,1,.5,.5,1,1,1], 'biwa','temple-bell','procession',.26,[0,2,3,0], 'A patient wooden processional motif broadens into bronze and low modern harmony.'),
  cue('14-garden-between-worlds', 'Garden Between Worlds', 'あわいの庭', 70, 65, 'iwato', [0,1,2,4,3,2,1,4], [1,1,2,1,.5,.5,1,1], 'koto','sho','air',.53,[0,2,0,4], 'Plucked questions open into sustained reed-like clouds and quiet sub notes.'),
  cue('15-summer-furin', 'Summer Fūrin', '夏の風鈴', 90, 69, 'pentatonic major', [0,2,1,3,4,3,2,0], [.5,.5,1,2,.5,.5,1,2], 'furin','koto','water',.44,[0,3,1,0], 'High glass notes are balanced by muted plucks and a low, soft groove.'),
  cue('16-maple-dusk', 'Maple Dusk', '紅葉の夕', 74, 57, 'hirajoshi', [3,2,1,0,2,4,3,1], [1,1,1,1,2,.5,.5,1], 'shakuhachi','rhodes','swing',.64,[0,2,4,0], 'Falling bamboo phrases meet warm electric keys and slow brushed offbeats.'),
  cue('17-snow-in-roji', 'Snow in the Roji', '路地の雪', 62, 62, 'in sen', [0,2,3,1,0,4,2,0], [2,1,1,2,.5,.5,.5,.5], 'felt-piano','koto-muted','air',.39,[0,0,3,0], 'Felt attacks and palm-muted strings leave long, cold spaces between notes.'),
  cue('18-michi-dreams', 'Michi Dreams in Colour', 'みちの夢', 84, 64, 'dorian', [0,2,4,6,5,3,1,2], [.5,.5,1,1,2,.5,.5,2], 'rhodes','koto','dream',.85,[0,3,5,1], 'Tine chords, a drifting koto answer and gentle half-time electronics.'),
  cue('19-river-neon', 'River of Neon', '川のネオン', 112, 60, 'in sen', [0,3,2,1,4,3,1,0], [.5,.5,.5,.5,1,.5,.5,4], 'silk-lead','shamisen','neon',.95,[0,2,4,0], 'A rounded FM hook and buzzing shamisen share a restrained electronic groove.'),
  cue('20-steps-to-the-shrine', 'Steps to the Shrine', '社への道', 78, 62, 'yo', [0,0,2,3,1,2,4,3], [1,.5,.5,2,1,1,1,1], 'biwa','shinobue','procession',.18,[0,3,0,0], 'Low plucked footsteps and clear flute responses with spare ceremonial percussion.'),
  cue('21-paper-crane-waltz', 'Paper Crane, Three Turns', '折鶴の舞', 94, 65, 'pentatonic major', [0,2,3,1,4,2,1,0], [.75,.75,1.5,.75,.75,1.5,1,1], 'koto','felt-piano','three',.52,[0,1,3,4], 'A three-accent cross-rhythm inside a four-beat arrangement, with light piano replies.'),
  cue('22-midnight-atelier', 'Midnight Atelier', '真夜中の工房', 86, 59, 'dorian', [0,1,4,2,5,3,2,6], [.5,1,.5,1,.5,1,.5,3], 'rhodes','biwa','swing',.88,[0,3,1,5], 'Dusky electric keys, woody strings and a pocket of swung percussion.'),
  cue('23-plum-blossom', 'First Plum Blossom', '梅ひとつ', 98, 67, 'yo', [0,1,3,4,2,3,1,0], [.5,.5,1,.5,.5,1,2,2], 'shinobue','koto','skip',.25,[0,2,3,0], 'Clear rising flute figures and small string flourishes suggest the first warm day.'),
  cue('24-home-by-lantern', 'Home by Lantern', '灯りへ帰る', 66, 60, 'pentatonic major', [3,2,0,1,3,4,2,0], [1,2,1,.5,.5,1,1,1], 'koto-muted','shakuhachi','lantern',.3,[0,3,1,0], 'A returning muted-string melody slows into a spacious bamboo farewell.'),
  cue('25-edo-tomorrow', 'Edo, Tomorrow', '江戸の明日', 102, 62, 'dorian', [0,2,4,3,6,5,2,0], [.5,.5,1,.5,.5,1,1,3], 'shamisen','silk-lead','festival',.8,[0,3,5,1], 'Silk, skin, bamboo and bronze grow into a modern ensemble before a quiet final answer.')
];
const COLORS = ['#eebd72','#85c4b1','#aa9cdb','#6c9fc8','#d89494','#a1b971','#c9a4cc'];
export function scoreProject(score) {
  if (typeof score === 'string') score = SCORES.find(x => x.id === score);
  if (!score) throw new Error('Unknown score');
  const s = score, rng = random(s.seed), scale = MODES[s.mode];
  const pitch = (degree, octave = 0) => s.root + scale[((degree % scale.length) + scale.length) % scale.length] + 12 * (Math.floor(degree / scale.length) + octave);
  let counter = 0;
  const id = p => `${s.id}-${p}-${counter++}`;
  const track = (name, model, volume, pan, color, kind = 'synth') => ({ id: id('t'), name, kind, color, preset: kind === 'synth' ? instrumentPreset(model) : null,
    drumKit: s.modern > .7 ? 'neon' : 'kyoto', volume, pan, sends: { a: kind === 'drum' ? .08 : .17, b: model === 'koto' ? .08 : .02 }, mute: false, solo: false, arm: false,
    devices: [], automation: { volume: [], pan: [], devices: {} }, frozenActive: false, frozenAssetId: null, clips: [] });
  const tracks = [track('01 · ' + s.lead, s.lead, .68, -.16, COLORS[0]), track('02 · ' + s.reply, s.reply, .52, .22, COLORS[1]),
    track('03 · Silk ostinato', s.lead === 'koto' ? 'koto-muted' : 'koto', .32, -.28, COLORS[2]),
    track('04 · ' + (s.modern > .5 ? 'Lantern harmony' : 'Reed horizon'), s.modern > .5 ? 'warm-pad' : 'sho', .17 + s.modern * .07, .05, COLORS[3]),
    track('05 · Low foundation', s.modern > .45 ? 'sub-bass' : 'biwa', .28 + s.modern * .12, 0, COLORS[4]),
    track('06 · ' + (s.modern > .7 ? 'Neon percussion' : 'Wood, skin & bronze'), null, .34, 0, COLORS[5], 'drum'),
    track('07 · Bronze punctuation', s.modern > .65 ? 'rhodes' : 'singing-bowl', .19, .3, COLORS[6])];
  const sections = [{ name: 'Threshold', start: 0, bars: 4, energy: .35 }, { name: 'First light · A', start: 4, bars: 8, energy: .72 },
    { name: 'Across the water · B', start: 12, bars: 8, energy: .95 }, { name: 'Breathing space', start: 20, bars: 4, energy: .36 },
    { name: 'Returning · A′', start: 24, bars: 8, energy: 1 }, { name: 'Homeward', start: 32, bars: 4, energy: .38 }];
  const clip = (t, name, bar, bars = 1) => { const c = { id: id('c'), name, start: bar, length: bars, gain: 1, loop: false, loopLen: bars * 4, notes: [], steps: null, sample: null, audio: null }; t.clips.push(c); return c; };
  const note = (c, beat, degree, len, vel, octave = 0) => {
    const start = Math.max(0, beat + (rng() - .5) * .026);
    if (start >= c.length * 4) return;
    c.notes.push({ id: id('n'), midi: pitch(degree, octave), start, len: Math.min(Math.max(.08, len), c.length * 4 - start), vel: Math.min(.92, Math.max(.12, vel + (rng() - .5) * .08)) });
  };
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    for (let bar = sec.start; bar < sec.start + sec.bars; bar++) {
      const local = bar - sec.start, h = s.harmony[Math.floor(local / 2) % s.harmony.length], energy = sec.energy, last = bar === 35;
      const lead = clip(tracks[0], `${sec.name} · phrase ${local + 1}`, bar);
      const reply = clip(tracks[1], `Answer ${local + 1}`, bar);
      const strings = clip(tracks[2], `Silk pattern ${local % 4 + 1}`, bar);
      const harmony = clip(tracks[3], `Open voicing ${h + 1}`, bar);
      const bass = clip(tracks[4], `Foundation ${h + 1}`, bar);
      const drums = clip(tracks[5], `${s.groove} ${local % 4 === 3 ? 'turnaround' : 'pulse'}`, bar);
      const accent = clip(tracks[6], 'Light on bronze', bar);
      // Two-bar question/answer phrasing, an inversion in B and a decorated
      // return in A′. Whole-bar rests are intentional in the sparse cues.
      if ((si !== 3 || local % 2 === 0) && (s.groove !== 'air' || local % 3 !== 2)) {
        const begin = local % 2 ? 4 : 0;
        let beat = 0;
        for (let j = begin; j < begin + 4; j++) {
          const idx = j % s.motif.length, dur = s.rhythm[idx], degree = si === 2 ? s.motif[(idx + 3) % s.motif.length] : s.motif[idx];
          if (beat < 3.85) note(lead, beat, last ? 0 : degree + (si === 4 && local > 3 ? 1 : 0), last ? 3.7 : Math.min(dur * .83, 2.7), .48 + energy * .22);
          if (si === 4 && j === begin + 2 && !last && beat > .12) note(lead, beat - .1, degree - 1, .08, .3);
          beat += dur;
        }
      }
      if (local % 2 === 1 && si !== 0 && !last) {
        const deg = s.motif[(local + si + 2) % s.motif.length];
        note(reply, 1.5, deg + (si === 2 ? 2 : 0), 1.2, .48);
        note(reply, 3, deg - 1, .7, .4);
      }
      const plucks = s.groove === 'air' ? [1.5] : s.groove === 'three' ? [0,1.5,3] : [0,.75,2,2.75];
      plucks.forEach((b, j) => { if (!last || j === 0) note(strings, b, h + [0,2,4,2][j % 4], .42, .3 + energy * .13, -1); });
      if (local % 2 === 0 || last) [0,2,4].forEach((d, j) => note(harmony, .02 * j, h + d, last ? 3.8 : 3.5, .35, -1));
      note(bass, 0, last ? 0 : h, s.modern > .6 ? 1.4 : 2.9, .56, -2);
      if (s.modern > .45 && energy > .5 && !last) { note(bass, 2.5, h + 2, .65, .42, -2); if (local % 4 === 3) note(bass, 3.5, h + 4, .35, .35, -2); }
      if (local % 4 === 0) note(accent, .12, h + (si === 2 ? 4 : 0), 2.8, .36, s.modern > .65 ? 0 : -1);
      drums.steps = drumPattern(s, local, energy, si);
      if (last) Object.values(drums.steps).forEach(a => a.fill(0, 1));
    }
  }
  tracks.forEach((t, i) => { t.automation.volume = [{ beat: 0, value: t.volume * .65 }, { beat: 16, value: t.volume }, { beat: 80, value: t.volume * .65 }, { beat: 96, value: t.volume }, { beat: 137, value: t.volume }, { beat: 144, value: t.volume * .3 }];
    if (i === 3) t.automation.pan = [{ beat: 0, value: -.1 }, { beat: 64, value: .15 }, { beat: 144, value: -.1 }]; });
  return { version: 1, name: `${s.name} · ${s.japanese}`, tempo: s.tempo, timeSigNum: 4, timeSigDen: 4, key: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][s.root % 12], scale: s.mode,
    bars: 36, loop: { on: false, start: 4, end: 32 }, swing: ['swing','dream'].includes(s.groove) ? .2 : .04,
    metronome: false, scene: s.name, timeOfDay: null, sections: { dawn: 0, day: 4, dusk: 20, night: 32 },
    markers: sections.map(x => ({ bar: x.start, name: x.name })), library: { id: s.id, seed: s.seed, description: s.description, provenance: 'Original procedural composition; historically inspired, contemporary arrangement' },
    tracks, master: { volume: .75, automation: { volume: [] } }, assets: {}, sfx: [], cueScan: { at: null, files: [], cues: [] } };
}
export function drumPattern(s, bar, energy = 1, section = 1) {
  const steps = Object.fromEntries(['kick','snare','clap','hatC','hatO','tom','rim','perc'].map(x => [x, Array(16).fill(0)]));
  const put = (lane, indices, v) => indices.forEach((i, j) => { steps[lane][i] = v * (j % 2 ? .78 : 1) * (.7 + energy * .3); });
  if (s.groove === 'air') { if (bar % 2 === 0) put('rim',[0],.24); if (bar % 4 === 3) put('perc',[10],.19); return steps; }
  const patterns = {
    skip: [[0,7,10],[4,12],[2,6,10,14]], water: [[0,10],[12],[3,7,11,15]], chamber: [[0],[8],[4,14]],
    rain: [[0,9],[8],[2,6,10,14]], swing: [[0,7,10],[4,12],[0,2,4,6,8,10,12,14]],
    market: [[0,6,8],[4,12],[2,6,10,14]], lantern: [[0,10],[12],[2,6,14]], roof: [[0,6,10],[4,12],[0,2,4,6,8,10,12,14]],
    festival: [[0,8],[4,10,12],[2,6,10,14]], procession: [[0,8],[6,14],[4,12]], dream: [[0,11],[8],[2,6,10,14]],
    neon: [[0,4,8,12],[4,12],[2,6,10,14]], three: [[0,6,12],[9],[3,6,9,12,15]]
  };
  const p = patterns[s.groove] || patterns.lantern;
  put('kick', p[0], .65); put(s.modern > .55 ? 'snare' : 'tom', p[1], .42);
  put(s.modern > .55 ? 'hatC' : 'rim', p[2], .23);
  if (s.groove === 'festival' || s.groove === 'market') put('perc', bar % 2 ? [3,7,11,15] : [2,6,10,14], .28);
  if (bar % 4 === 3 && section !== 0 && section !== 3) { put('tom',[13,14,15],.32); steps.rim[15] = .24; }
  if (energy < .5) for (const [lane,a] of Object.entries(steps)) { if (lane !== 'rim' && lane !== 'perc') a.forEach((v,i) => { a[i] = i === 0 ? v * .5 : 0; }); }
  return steps;
}
