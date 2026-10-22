import { test, assert, installDomShims } from './harness.mjs';
installDomShims();
const { AppState, defaultProject } = await import('../src/state.js');
const { PlanExecutor } = await import('../src/agent/executor.js');
const { validatePlan } = await import('../src/agent/schema.js');

function setup(project = defaultProject()) {
  const state = new AppState();
  state.setProject(project);
  return { state, ex: new PlanExecutor(state) };
}

const run = (ex, actions) => {
  const { plan, errors } = validatePlan({ actions });
  assert.deepEqual(errors, []);
  return ex.execute(plan);
};

const empty = () => { const p = defaultProject(); p.tracks = []; return p; };

test('addTrack + addChordProgression builds a voiced chord clip', () => {
  const { state, ex } = setup(empty());
  run(ex, [
    { type: 'addTrack', params: { name: 'Pad', kind: 'synth', preset: 'pad' } },
    { type: 'addChordProgression', params: { chords: ['C', 'G', 'Am', 'F'], beatsPerChord: 4 } }
  ]);
  const t = state.project.tracks[0];
  assert.equal(t.preset.kind, 'pad');
  const clip = t.clips[0];
  assert.equal(clip.notes.length, 12);
  assert.equal(clip.length, 4);
  assert.deepEqual([...new Set(clip.notes.filter((n) => n.start === 8).map((n) => n.midi % 12))].sort((a, b) => a - b), [0, 4, 9]);
});

test('roman numerals follow the project key', () => {
  const { state, ex } = setup(empty());
  state.project.key = 'G'; state.project.scale = 'major';
  run(ex, [{ type: 'addTrack', params: { kind: 'synth' } }, { type: 'addChordProgression', params: { chords: 'I IV', voiceLead: false } }]);
  const notes = state.project.tracks[0].clips[0].notes;
  assert.deepEqual(notes.filter((n) => n.start === 0).map((n) => n.midi % 12).sort((a, b) => a - b), [2, 7, 11]);
});

test('arpeggio styles and bass are honoured', () => {
  const { state, ex } = setup(empty());
  run(ex, [{ type: 'addTrack', params: {} }, { type: 'addChordProgression', params: { chords: ['Am'], beatsPerChord: 2, style: 'up', rate: 0.5, bass: true } }]);
  const notes = state.project.tracks[0].clips[0].notes;
  assert.equal(notes.length, 5);
  assert.equal(Math.min(...notes.map((n) => n.midi)), 45);
});

test('addDrumPattern with a groove fills the right steps', () => {
  const { state, ex } = setup(empty());
  run(ex, [{ type: 'addTrack', params: { kind: 'drum', drumKit: 'lofi' } }, { type: 'addDrumPattern', params: { groove: 'backbeat', bars: 2 } }]);
  const clip = state.project.tracks[0].clips[0];
  assert.ok(clip.steps.snare[4] > 0 && clip.steps.snare[12] > 0);
  assert.equal(clip.steps.kick.length, 16);
  assert.equal(clip.length, 2);
  assert.equal(Object.keys(clip.steps).length, 8);
});

test('addDrumPattern on a synth track is a clear error', () => {
  const { ex } = setup(empty());
  assert.throws(() => run(ex, [{ type: 'addTrack', params: { kind: 'synth' } }, { type: 'addDrumPattern', params: { groove: 'lofi' } }]), /Action 2 \(addDrumPattern\).*drum track/);
});

test('addClip accepts a phrase, sizes the clip and loops it', () => {
  const { state, ex } = setup(empty());
  run(ex, [{ type: 'addTrack', params: {} }, { type: 'addClip', params: { phrase: 'C5/1 E5/1 G5/2 r/2 C6/2', loop: true } }]);
  const clip = state.project.tracks[0].clips[0];
  assert.equal(clip.notes.length, 4);
  assert.equal(clip.length, 2);
  assert.equal(clip.loop, true);
  assert.equal(clip.loopLen, 8);
});

test('addClip accepts scale degrees in the project key', () => {
  const { state, ex } = setup(empty());
  state.project.key = 'D'; state.project.scale = 'minor';
  run(ex, [{ type: 'addTrack', params: {} }, { type: 'addClip', params: { degrees: [1, 3, 5], degreeRate: 0.5, octave: 4 } }]);
  assert.deepEqual(state.project.tracks[0].clips[0].notes.map((n) => n.midi), [62, 65, 69]);
});

test('setClipNotes replaces content in place and keeps the clip id', () => {
  const { state, ex } = setup();
  const t = state.project.tracks.find((x) => x.kind === 'synth');
  const c = t.clips[0];
  run(ex, [{ type: 'setClipNotes', target: `${t.id}:${c.id}`, params: { phrase: 'A4/4' } }]);
  const after = state.track(t.id).clips.find((x) => x.id === c.id);
  assert.equal(after.notes.length, 1);
  assert.equal(after.notes[0].midi, 69);
});

test('transposeClip shifts every note; a track target shifts all its clips', () => {
  const { state, ex } = setup();
  const t = state.project.tracks.find((x) => x.name === 'Bass');
  const before = t.clips[0].notes.map((n) => n.midi);
  run(ex, [{ type: 'transposeClip', target: t.id, params: { semitones: 12 } }]);
  assert.deepEqual(state.track(t.id).clips[0].notes.map((n) => n.midi), before.map((m) => m + 12));
});

test('duplicateClip places copies end to end', () => {
  const { state, ex } = setup();
  const t = state.project.tracks[0];
  const c = t.clips[0];
  run(ex, [{ type: 'duplicateClip', target: `${t.id}:${c.id}`, params: { times: 2 } }]);
  const starts = state.track(t.id).clips.map((x) => x.start).sort((a, b) => a - b);
  assert.deepEqual(starts, [c.start, c.start + c.length, c.start + 2 * c.length]);
});

test('tracks can be targeted by name', () => {
  const { state, ex } = setup();
  run(ex, [{ type: 'setTrackMix', target: 'bass', params: { volume: 0.33 } }]);
  assert.equal(state.project.tracks.find((t) => t.name === 'Bass').volume, 0.33);
});

test('addAutomation ramps volume and device params in real units', () => {
  const { state, ex } = setup(empty());
  run(ex, [
    { type: 'addTrack', params: {} },
    { type: 'addAutomation', params: { param: 'volume', ramp: { from: 0, to: 0.8, startBar: 0, endBar: 4, steps: 4 } } },
    { type: 'addAutomation', params: { param: 'filter.freq', ramp: { from: 200, to: 8000, startBar: 0, endBar: 2 } } }
  ]);
  const t = state.project.tracks[0];
  assert.equal(t.automation.volume.length, 4);
  assert.equal(t.automation.volume[0].value, 0);
  assert.equal(t.automation.volume[3].beat, 16);
  const dev = t.devices.find((d) => d.type === 'filter');
  const pts = t.automation.devices[dev.id].freq;
  assert.equal(pts[0].value, 200);
  assert.ok(Math.abs(pts[pts.length - 1].value - 8000) < 1e-6);
});

test('addAutomation rejects unknown device params', () => {
  const { ex } = setup(empty());
  assert.throws(() => run(ex, [{ type: 'addTrack', params: {} }, { type: 'addAutomation', params: { param: 'reverb.size', points: [[0, 1]] } }]), /not automatable/);
});

test('setDeviceParams merges into the existing device', () => {
  const { state, ex } = setup(empty());
  run(ex, [{ type: 'addTrack', params: {} }, { type: 'setDeviceParams', params: { type: 'reverb', params: { wet: 0.5 } } }, { type: 'setDeviceParams', params: { type: 'reverb', params: { size: 3 } } }]);
  const devs = state.project.tracks[0].devices.filter((d) => d.type === 'reverb');
  assert.equal(devs.length, 1);
  assert.equal(devs[0].params.wet, 0.5);
  assert.equal(devs[0].params.size, 3);
});

test('addSfx from a template, updateSfx, and placeSfx onto an SFX track', () => {
  const { state, ex } = setup(empty());
  run(ex, [
    { type: 'addSfx', params: { template: 'collect', name: 'Leaf pickup' } },
    { type: 'updateSfx', params: { layerEdits: [{ index: 0, freq: 900 }], fx: { reverb: 0.5 } } },
    { type: 'placeSfx', params: { start: 2 } }
  ]);
  const sfx = state.project.sfx[0];
  assert.equal(sfx.name, 'Leaf pickup');
  assert.equal(sfx.layers[0].freq, 900);
  assert.equal(sfx.fx.reverb, 0.5);
  const track = state.project.tracks.find((t) => t.name === 'SFX');
  assert.ok(track);
  assert.equal(track.clips[0].sample, `sfxp:${sfx.id}`);
  assert.equal(track.clips[0].start, 2);
  assert.equal(state.selection.sfxId, sfx.id);
});

test('addSfx with an unknown template names the options', () => {
  const { ex } = setup(empty());
  assert.throws(() => run(ex, [{ type: 'addSfx', params: { template: 'kazoo' } }]), /template.*meow/);
});

test('deleteSfx removes the patch and its timeline clips', () => {
  const { state, ex } = setup(empty());
  run(ex, [{ type: 'addSfx', params: { template: 'meow' } }, { type: 'placeSfx', params: {} }]);
  const id = state.project.sfx[0].id;
  run(ex, [{ type: 'deleteSfx', target: id, params: {} }]);
  assert.equal(state.project.sfx.length, 0);
  assert.ok(state.project.tracks.every((t) => t.clips.every((c) => c.sample !== `sfxp:${id}`)));
});

test('a failing action rolls the whole plan back', () => {
  const { state, ex } = setup();
  const before = JSON.stringify(state.project);
  assert.throws(() => run(ex, [
    { type: 'setTempo', params: { bpm: 77 } },
    { type: 'addTrack', params: { name: 'New' } },
    { type: 'renameTrack', target: 'does-not-exist', params: { name: 'x' } }
  ]), /^Error: Action 3 \(renameTrack\)/);
  assert.equal(JSON.stringify(state.project), before);
});

test('one plan is one undo step', () => {
  const { state, ex } = setup();
  const before = JSON.stringify(state.project);
  run(ex, [{ type: 'setTempo', params: { bpm: 70 } }, { type: 'setSwing', params: { swing: 0.3 } }]);
  state.undo();
  assert.equal(JSON.stringify(state.project), before);
});

test('buildContext lists tracks, clip content, SFX and selection', () => {
  const { state, ex } = setup();
  run(ex, [{ type: 'addSfx', params: { template: 'meow' } }]);
  const ctx = ex.buildContext({ mode: 'sfx' });
  assert.equal(ctx.tracks.length, state.project.tracks.length);
  assert.ok(ctx.tracks.some((t) => t.clips.some((c) => Array.isArray(c.notes) && c.notes.length)));
  assert.ok(ctx.tracks.some((t) => t.clips.some((c) => c.steps && c.steps.kick)));
  assert.equal(ctx.sfx.length, 1);
  assert.equal(ctx.selection.sfxId, state.project.sfx[0].id);
  assert.ok(Array.isArray(ctx.gameHooks));
});

test('v1 projects without an sfx array load and gain one', () => {
  const state = new AppState();
  const p = defaultProject();
  delete p.sfx;
  assert.equal(state.loadJSON(JSON.stringify(p)), true);
  assert.deepEqual(state.project.sfx, []);
});
