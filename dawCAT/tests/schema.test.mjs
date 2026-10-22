import { test, assert } from './harness.mjs';
import { validatePlan, extractJson, planJsonSchema, actionReference, ACTIONS, MAX_ACTIONS } from '../src/agent/schema.js';

const one = (action) => validatePlan({ summary: 's', actions: [action] });

test('unknown action types are errors that name the path and suggest a fix', () => {
  const { errors } = one({ type: 'addTrak', params: {} });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /actions\[0\]\.type/);
  assert.match(errors[0], /addTrack/);
});

test('action type aliases and casing are normalised', () => {
  const { plan, errors } = validatePlan({ actions: [{ type: 'add_track', params: { kind: 'drum' } }, { type: 'SetTempo', params: { bpm: 90 } }] });
  assert.deepEqual(errors, []);
  assert.deepEqual(plan.actions.map((a) => a.type), ['addTrack', 'setTempo']);
});

test('flattened params (no params object) are collected', () => {
  const { plan, errors } = one({ type: 'setTempo', bpm: 84 });
  assert.deepEqual(errors, []);
  assert.equal(plan.actions[0].params.bpm, 84);
});

test('addClip notes accept note names and resolve them to MIDI', () => {
  const { plan, errors } = one({ type: 'addClip', target: 't1', params: { start: 0, length: 2, notes: [{ note: 'C4', start: 0, len: 1 }, { midi: 'Eb4', start: 1, dur: 1, velocity: 0.5 }] } });
  assert.deepEqual(errors, []);
  assert.deepEqual(plan.actions[0].params.notes.map((n) => n.midi), [60, 63]);
  assert.equal(plan.actions[0].params.notes[1].len, 1);
  assert.equal(plan.actions[0].params.notes[1].vel, 0.5);
});

test('bad note names report the exact note path', () => {
  const { errors } = one({ type: 'addClip', params: { notes: [{ note: 'C4' }, { note: 'Q7' }] } });
  assert.match(errors[0], /actions\[0\]\.params\.notes\[1\]/);
});

test('out-of-range numbers clamp instead of failing', () => {
  const { plan, errors } = one({ type: 'setTempo', params: { bpm: 999 } });
  assert.deepEqual(errors, []);
  assert.equal(plan.actions[0].params.bpm, 220);
});

test('missing required params are errors', () => {
  const { errors } = one({ type: 'setTempo', params: {} });
  assert.match(errors[0], /actions\[0\]\.params\.bpm.*required/);
});

test('enum values are matched case-insensitively and bad ones list the options', () => {
  const ok = one({ type: 'addTrack', params: { kind: 'Synth', preset: 'PAD' } });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.plan.actions[0].params.preset, 'pad');
  const bad = one({ type: 'addTrack', params: { preset: 'banjo' } });
  assert.match(bad.errors[0], /preset/);
  assert.match(bad.errors[0], /pluck/);
});

test('chord progressions validate every chord and name the bad one', () => {
  const { errors } = one({ type: 'addChordProgression', params: { chords: ['Cmaj7', 'Hm'] } });
  assert.match(errors[0], /chords\[1\]/);
  const ok = one({ type: 'addChordProgression', params: { chords: 'C G Am F' } });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.plan.actions[0].params.chords, ['C', 'G', 'Am', 'F']);
});

test('drum grids and phrases are syntax-checked', () => {
  assert.match(one({ type: 'addDrumPattern', params: { grid: { kick: 'x?..' } } }).errors[0], /grid/);
  assert.match(one({ type: 'addClip', params: { phrase: 'C4/1 Z9' } }).errors[0], /phrase/);
  assert.deepEqual(one({ type: 'addDrumPattern', params: { groove: 'Boom Bap' } }).errors, []);
});

test('a reply with no actions is a valid conversational answer', () => {
  const { plan, errors } = validatePlan({ reply: 'Try D dorian for dusk.', actions: [] });
  assert.deepEqual(errors, []);
  assert.equal(plan.reply, 'Try D dorian for dusk.');
  const noActions = validatePlan({ reply: 'hello' });
  assert.deepEqual(noActions.errors, []);
});

test('a bare array is treated as the actions list', () => {
  const { plan, errors } = validatePlan([{ type: 'setSwing', params: { swing: 0.2 } }]);
  assert.deepEqual(errors, []);
  assert.equal(plan.actions.length, 1);
});

test(`plans over ${MAX_ACTIONS} actions are rejected`, () => {
  const actions = Array.from({ length: MAX_ACTIONS + 1 }, () => ({ type: 'setSwing', params: { swing: 0 } }));
  assert.match(validatePlan({ actions }).errors[0], /60/);
});

test('missing actions without a reply is an error', () => {
  assert.match(validatePlan({ summary: 'x' }).errors[0], /actions/);
  assert.match(validatePlan('nope').errors[0], /object/);
});

test('extractJson strips thinking blocks and code fences', () => {
  assert.deepEqual(extractJson('<think>{x}</think>```json\n{"actions":[]}\n```'), { actions: [] });
  assert.deepEqual(extractJson('Sure! Here is the plan: {"actions":[{"type":"setSwing","params":{"swing":0.1}}]} Enjoy.'), { actions: [{ type: 'setSwing', params: { swing: 0.1 } }] });
});

test('extractJson repairs trailing commas and comments', () => {
  assert.deepEqual(extractJson('{"actions":[{"type":"setSwing","params":{"swing":0.1,},},], // done\n}'), { actions: [{ type: 'setSwing', params: { swing: 0.1 } }] });
});

test('extractJson reports truncation and prose distinctly', () => {
  assert.throws(() => extractJson('{"actions":[{"type":"addTrack","params":{"na'), (e) => e.code === 'truncated');
  assert.throws(() => extractJson('I would add a pad track in C major.'), (e) => e.code === 'no-json' && /pad track/.test(e.prose));
});

test('the JSON schema enumerates every action type', () => {
  const schema = planJsonSchema();
  const types = schema.properties.actions.items.properties.type.enum;
  assert.ok(types.includes('addSfx'));
  assert.equal(types.length, ACTIONS.length);
});

test('the action reference documents every action', () => {
  const ref = actionReference();
  for (const a of ACTIONS) assert.ok(ref.includes(a.type), a.type);
});

test('the action reference can be limited to groups', () => {
  const ref = actionReference({ groups: ['Sound design'] });
  assert.ok(ref.includes('addSfx'));
  assert.ok(!ref.includes('addChordProgression'));
});
