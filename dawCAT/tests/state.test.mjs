import { test, assert, installDomShims } from './harness.mjs';
installDomShims();
const { AppState, defaultProject } = await import('../src/state.js');
const { createPatch } = await import('../src/sfx/patches.js');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function fresh() {
  const st = new AppState();
  st.setProject(defaultProject());
  return st;
}

test('undo right after an edit restores the state before the edit', () => {
  const st = fresh();
  const t = st.project.tracks[0];
  const before = t.name;
  st.updateTrack(t.id, { name: 'Renamed' });
  st.undo();
  assert.equal(st.project.tracks[0].name, before);
});

test('undo after the debounce window still restores the pre-edit state', async () => {
  const st = fresh();
  const t = st.project.tracks[0];
  const before = t.name;
  st.updateTrack(t.id, { name: 'Renamed' });
  await wait(300);
  st.undo();
  assert.equal(st.project.tracks[0].name, before);
});

test('a burst of edits (knob drag) is one undo step back to the start', async () => {
  const st = fresh();
  const s = st.addSfx(createPatch('meow'));
  await wait(300);
  const gain0 = st.sfxById(s.id).gain;
  for (const g of [0.5, 0.6, 0.7]) st.updateSfx(s.id, { gain: g });
  await wait(300);
  st.undo();
  assert.equal(st.sfxById(s.id).gain, gain0);
});

test('redo re-applies an undone edit', () => {
  const st = fresh();
  const t = st.project.tracks[0];
  st.updateTrack(t.id, { name: 'Renamed' });
  st.undo();
  st.redo();
  assert.equal(st.project.tracks[0].name, 'Renamed');
});

test('an AI batch right after a manual edit keeps both undo steps', () => {
  const st = fresh();
  const t = st.project.tracks[0];
  const before = t.name;
  st.updateTrack(t.id, { name: 'Manual' });
  st.applyBatch(() => { st.project.tempo = 61; });
  st.undo();
  assert.equal(st.project.tempo !== 61, true);
  assert.equal(st.project.tracks[0].name, 'Manual');
  st.undo();
  assert.equal(st.project.tracks[0].name, before);
});

test('removing an SFX removes its clips and fixes the selection', () => {
  const st = fresh();
  const a = st.addSfx(createPatch('meow'));
  const b = st.addSfx(createPatch('bell'));
  st.project.tracks[0].clips.push({ id: 'cx', start: 0, length: 1, gain: 1, notes: [], sample: `sfxp:${b.id}` });
  st.removeSfx(b.id);
  assert.equal(st.selection.sfxId, a.id);
  assert.ok(!st.project.tracks[0].clips.some((c) => c.id === 'cx'));
});
