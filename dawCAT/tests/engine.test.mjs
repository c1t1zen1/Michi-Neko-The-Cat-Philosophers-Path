import { test, assert, installDomShims } from './harness.mjs';
import { FakeAudioContext } from './fake-audio.mjs';
installDomShims();
const { buildClipEvents } = await import('../src/engine/transport.js');
const { scheduleClipContent } = await import('../src/engine/render.js');
const { defaultProject } = await import('../src/state.js');
const { createPatch } = await import('../src/sfx/patches.js');

function projectWithSfx() {
  const p = defaultProject();
  const patch = createPatch('meow', { variation: { pitch: 100, time: 0.2, gain: 0.1 } });
  p.sfx = [patch];
  const track = { id: 'tS', name: 'SFX', kind: 'synth', preset: p.tracks[1].preset, clips: [], devices: [], sends: { a: 0, b: 0 } };
  track.clips.push({ id: 'c1', start: 1, length: 1, gain: 0.9, loop: false, loopLen: 4, notes: [], steps: null, sample: `sfxp:${patch.id}`, audio: null });
  track.clips.push({ id: 'c2', start: 2, length: 1, gain: 1, loop: false, loopLen: 4, notes: [], steps: null, sample: `sfxp:${patch.id}`, audio: null });
  p.tracks.push(track);
  return { p, patch, track };
}

test('a designed-SFX clip yields an sfxPatch event carrying its patch', () => {
  const { p, patch, track } = projectWithSfx();
  const evs = buildClipEvents(p, track, track.clips[0], new Map());
  assert.equal(evs.length, 1);
  assert.equal(evs[0].kind, 'sfxPatch');
  assert.equal(evs[0].beat, 4);
  assert.equal(evs[0].patch.id, patch.id);
  assert.equal(evs[0].gain, 0.9);
});

test('repeated SFX clips round-robin through variations', () => {
  const { p, track } = projectWithSfx();
  const rr = new Map();
  const a = buildClipEvents(p, track, track.clips[0], rr)[0];
  const b = buildClipEvents(p, track, track.clips[1], rr)[0];
  assert.notEqual(a.variation, b.variation);
  assert.ok(a.variation >= 1 && b.variation >= 1);
});

test('a clip whose SFX patch was deleted plays silence instead of throwing', () => {
  const { p, track } = projectWithSfx();
  p.sfx = [];
  assert.deepEqual(buildClipEvents(p, track, track.clips[0], new Map()), []);
});

test('note and drum clips still flatten as before', () => {
  const p = defaultProject();
  const drums = p.tracks.find((t) => t.kind === 'drum');
  const devs = buildClipEvents(p, drums, drums.clips[0], new Map());
  assert.ok(devs.length > 0 && devs.every((e) => e.kind === 'drum'));
  const bass = p.tracks.find((t) => t.name === 'Bass');
  const nevs = buildClipEvents(p, bass, bass.clips[0], new Map());
  assert.ok(nevs.length >= bass.clips[0].notes.length && nevs.every((e) => e.kind === 'note'));
});

test('offline render schedules designed SFX and built-in game SFX clips', async () => {
  const { p, track } = projectWithSfx();
  const ctx = new FakeAudioContext();
  const dest = ctx.createGain();
  await scheduleClipContent(ctx, { ctx }, dest, track, p, 0.5);
  assert.ok(ctx.nodes.filter((n) => n.kind === 'oscillator').length >= 2);

  const builtin = { ...track, clips: [{ ...track.clips[0], sample: 'sfx:meow' }] };
  const ctx2 = new FakeAudioContext();
  await scheduleClipContent(ctx2, { ctx: ctx2 }, ctx2.createGain(), builtin, p, 0.5);
  assert.ok(ctx2.nodes.some((n) => n.kind === 'oscillator'), 'built-in sfx: clips render too');
});
