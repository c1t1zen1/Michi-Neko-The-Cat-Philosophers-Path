import { test, assert } from './harness.mjs';
import {
  parseNote, parseChord, parseRoman, parseChordOrRoman, voiceLead, parsePhrase, degreesToMidi,
  arpeggiate, parseStepGrid, GROOVES, PRESET_RANGES
} from '../src/agent/theory.js';

test('parseNote reads scientific pitch names, any case, sharps and flats', () => {
  assert.equal(parseNote('C4'), 60);
  assert.equal(parseNote('c#4'), 61);
  assert.equal(parseNote('Eb3'), 51);
  assert.equal(parseNote('Bb-1'), 10);
  assert.equal(parseNote('eb4'), 63);
  assert.equal(parseNote(61), 61);
  assert.equal(parseNote('64'), 64);
});

test('parseNote rejects non-notes and out-of-range pitches with a clear message', () => {
  assert.throws(() => parseNote('H2'), /not a note/);
  assert.throws(() => parseNote('C10'), /out of range/);
  assert.throws(() => parseNote(200), /out of range/);
  assert.throws(() => parseNote(''), /not a note/);
});

test('parseChord voices common chord symbols from the given octave', () => {
  assert.deepEqual(parseChord('Cmaj7', 3), [48, 52, 55, 59]);
  assert.deepEqual(parseChord('Am7', 3), [57, 60, 64, 67]);
  assert.deepEqual(parseChord('F#m7b5', 3), [54, 57, 60, 64]);
  assert.deepEqual(parseChord('Gsus4', 3), [55, 60, 62]);
  assert.deepEqual(parseChord('C', 3), [48, 52, 55]);
  assert.deepEqual(parseChord('Bbadd9', 3), [58, 62, 65, 72]);
  assert.deepEqual(parseChord('Ddim', 3), [50, 53, 56]);
});

test('parseChord slash chords put the named bass lowest', () => {
  const ce = parseChord('C/E', 3);
  assert.equal(Math.min(...ce), 52);
  assert.deepEqual([...new Set(ce.map((m) => m % 12))].sort((a, b) => a - b), [0, 4, 7]);
  const cd = parseChord('C/D', 3);
  assert.equal(Math.min(...cd) % 12, 2);
});

test('parseChord rejects unknown symbols', () => {
  assert.throws(() => parseChord('Hm'), /not a chord/);
  assert.throws(() => parseChord('Cfoo'), /not a chord/);
});

test('parseRoman resolves numerals against key and scale', () => {
  assert.deepEqual(parseRoman('ii7', 'C', 'major'), [50, 53, 57, 60]);
  assert.deepEqual(parseRoman('V7', 'C', 'major'), [55, 59, 62, 65]);
  assert.deepEqual(parseRoman('IV', 'G', 'major'), [48, 52, 55]);
  assert.deepEqual(parseRoman('bVII', 'C', 'major'), [58, 62, 65]);
  assert.throws(() => parseRoman('IX', 'C', 'major'), /roman numeral/);
});

test('parseChordOrRoman tells numerals from chord symbols', () => {
  assert.deepEqual(parseChordOrRoman('vi7', 'C', 'major'), [57, 60, 64, 67]);
  assert.deepEqual(parseChordOrRoman('Bb', 'C', 'major'), [58, 62, 65]);
  assert.deepEqual(parseChordOrRoman('bVII', 'C', 'major'), [58, 62, 65]);
  assert.deepEqual(parseChordOrRoman('Em', 'C', 'major'), [52, 55, 59]);
});

test('voiceLead keeps pitch classes and moves less than root position', () => {
  const chords = ['C', 'F', 'G', 'C'].map((c) => parseChord(c, 3));
  const led = voiceLead(chords);
  const cost = (list) => list.slice(1).reduce((sum, ch, i) => {
    const a = [...list[i]].sort((x, y) => x - y), b = [...ch].sort((x, y) => x - y);
    return sum + b.reduce((s, m, j) => s + Math.abs(m - a[Math.min(j, a.length - 1)]), 0);
  }, 0);
  assert.ok(cost(led) < cost(chords), `voice-led cost ${cost(led)} should beat ${cost(chords)}`);
  led.forEach((ch, i) => {
    const pcs = (arr) => [...new Set(arr.map((m) => m % 12))].sort((a, b) => a - b);
    assert.deepEqual(pcs(ch), pcs(chords[i]));
  });
});

test('parsePhrase reads note/duration@velocity tokens sequentially', () => {
  const notes = parsePhrase('E5/1 G5/.5 r/.5 A5/2@0.6');
  assert.equal(notes.length, 3);
  assert.deepEqual(notes.map((n) => n.start), [0, 1, 2]);
  assert.deepEqual(notes.map((n) => n.midi), [76, 79, 81]);
  assert.equal(notes[2].len, 2);
  assert.equal(notes[2].vel, 0.6);
});

test('parsePhrase supports bracket chords, letter durations and duration carry-over', () => {
  const notes = parsePhrase('[C4 E4 G4]/h C5 D5/q. E5/e');
  assert.equal(notes.length, 6);
  assert.deepEqual(notes.slice(0, 3).map((n) => n.start), [0, 0, 0]);
  assert.equal(notes[3].start, 2);
  assert.equal(notes[3].len, 2);
  assert.equal(notes[4].len, 1.5);
  assert.equal(notes[5].start, 5.5);
});

test('parsePhrase errors name the bad token', () => {
  assert.throws(() => parsePhrase('C4/1 Q9/1'), /Q9/);
});

test('degreesToMidi maps 1-based scale degrees in a key', () => {
  assert.deepEqual(degreesToMidi([1, 3, 5, 8], 'C', 'major', 4), [60, 64, 67, 72]);
  assert.deepEqual(degreesToMidi([1, 'b3', 5], 'C', 'major', 4), [60, 63, 67]);
  assert.deepEqual(degreesToMidi([1, 2, 3], 'A', 'pentatonic minor', 3), [57, 60, 62]);
});

test('arpeggiate up spreads chord tones at the given rate', () => {
  const notes = arpeggiate([60, 64, 67], { style: 'up', rate: 0.5, beats: 2 });
  assert.deepEqual(notes.map((n) => n.midi), [60, 64, 67, 60]);
  assert.deepEqual(notes.map((n) => n.start), [0, 0.5, 1, 1.5]);
});

test('arpeggiate block holds the chord for the whole span', () => {
  const notes = arpeggiate([60, 64, 67], { style: 'block', beats: 4, start: 8 });
  assert.equal(notes.length, 3);
  assert.ok(notes.every((n) => n.start === 8 && n.len > 3.5));
});

test('parseStepGrid converts x/o/./- strings into 16-step velocity lanes', () => {
  const grid = parseStepGrid({ kick: 'x...o...', hh: '..x...x...x...x.' });
  assert.deepEqual(grid.kick, [1, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(grid.hatC[2], 1);
  assert.equal(grid.hatC.length, 16);
  assert.throws(() => parseStepGrid({ cowbellz: 'x' }), /unknown drum lane/);
  assert.throws(() => parseStepGrid({ kick: 'x?x' }), /kick/);
});

test('every named groove parses and has a pulse lane', () => {
  assert.ok(Object.keys(GROOVES).length >= 10);
  for (const [name, groove] of Object.entries(GROOVES)) {
    const grid = parseStepGrid(groove);
    const pulse = (grid.kick || []).concat(grid.perc || []).some((v) => v > 0);
    assert.ok(pulse, `${name} has no kick/perc hits`);
  }
  const bb = parseStepGrid(GROOVES.backbeat);
  assert.ok(bb.snare[4] > 0 && bb.snare[12] > 0);
});

test('PRESET_RANGES covers every synth preset', () => {
  for (const k of ['pad', 'pluck', 'lead', 'bass', 'keys', 'chime']) {
    assert.ok(Array.isArray(PRESET_RANGES[k]) && PRESET_RANGES[k][0] < PRESET_RANGES[k][1], k);
  }
});
