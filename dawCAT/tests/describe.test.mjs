import { test, assert } from './harness.mjs';
import { describeAction } from '../src/agent/describe.js';

const names = { tracks: { t1: 'Pad' }, sfx: { s1: 'Leaf pickup' } };

test('describeAction turns actions into short human sentences', () => {
  assert.equal(describeAction({ type: 'setTempo', target: 'selection', params: { bpm: 84 } }), 'Tempo → 84 BPM');
  assert.equal(describeAction({ type: 'addTrack', params: { name: 'Dawn Pad', kind: 'synth', preset: 'pad' } }), 'New synth track “Dawn Pad” (pad)');
  assert.equal(describeAction({ type: 'addChordProgression', target: 't1', params: { chords: ['Cmaj7', 'Am7'] } }, names), 'Chords Cmaj7 Am7 on Pad');
  assert.equal(describeAction({ type: 'addSfx', params: { template: 'collect', name: 'Leaf pickup' } }), 'New sound “Leaf pickup” (from collect)');
  assert.equal(describeAction({ type: 'updateSfx', target: 's1', params: { fx: { reverb: 0.4 } } }, names), 'Edit sound Leaf pickup: fx');
  assert.equal(describeAction({ type: 'addDrumPattern', target: 'selection', params: { groove: 'lofi', bars: 4 } }), 'Drum groove lofi, 4 bars on the selected track');
});

test('unknown actions fall back to their type', () => {
  assert.equal(describeAction({ type: 'mystery', params: {} }), 'mystery');
});
