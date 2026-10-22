import { test, assert, fakeResponse, installDomShims } from './harness.mjs';
installDomShims();
const { AgentSession } = await import('../src/agent/session.js');
const { MODES, buildSystemPrompt, compactContext, chooseDetail, buildUserMessage, estimateTokens } = await import('../src/agent/prompt.js');

const CONTEXT = {
  editor: 'dawCAT', tempo: 100, key: 'C', scale: 'minor',
  tracks: [{ id: 't1', name: 'Pad', kind: 'synth', preset: 'pad', clips: [{ id: 'c1', name: 'A', start: 0, length: 4, notes: [{ midi: 60, start: 0, len: 1, vel: 0.8 }, { midi: 63, start: 1, len: 1, vel: 0.8 }] }] },
    { id: 't2', name: 'Drums', kind: 'drum', drumKit: 'soft', clips: [{ id: 'c2', name: 'B', start: 0, length: 4, steps: { kick: [[0, 1], [8, 1]], snare: [[4, 0.9]] } }] }],
  sfx: [], gameCues: []
};

const openaiJson = (content, finish = 'stop') => fakeResponse({ json: { choices: [{ message: { content }, finish_reason: finish }] } });
const plan = (actions, extra = {}) => JSON.stringify({ summary: 'did it', actions, ...extra });

function harness(responses, { settings = {}, executePlan } = {}) {
  const requests = [];
  const queue = [...responses];
  const executed = [];
  const session = new AgentSession({
    fetchImpl: async (url, init) => { requests.push({ url, body: init && init.body ? JSON.parse(init.body) : null }); const next = queue.shift(); if (!next) throw new Error('no more responses'); return typeof next === 'function' ? next() : next; },
    getSettings: () => ({ provider: 'local', stream: false, repairAttempts: 2, ...settings }),
    getContext: () => CONTEXT,
    executePlan: executePlan || (async (p) => { executed.push(p); return { count: p.actions.length }; }),
    pageOrigin: 'http://localhost:8000'
  });
  return { session, requests, executed };
}

const lastUser = (req) => req.body.messages.filter((m) => m.role === 'user').pop().content;

test('every mode has a label, guidance and quick-start chips', () => {
  for (const id of ['compose', 'remix', 'sfx', 'mix', 'ask', 'free']) {
    assert.ok(MODES[id].label && MODES[id].guidance && MODES[id].chips.length >= 3, id);
  }
});

test('the system prompt carries the contract, mode guidance and the relevant actions', () => {
  const sys = buildSystemPrompt('sfx');
  assert.match(sys, /JSON/);
  assert.match(sys, /addSfx/);
  assert.ok(sys.includes(MODES.sfx.guidance));
  assert.match(buildSystemPrompt('compose'), /addChordProgression/);
  assert.match(buildSystemPrompt('ask'), /reply/);
});

test('compact context writes notes as strings and drum steps as grids', () => {
  const c = compactContext(CONTEXT, 'compact');
  assert.equal(typeof c.tracks[0].clips[0].notes, 'string');
  assert.match(c.tracks[0].clips[0].notes, /C4@0:1/);
  assert.equal(c.tracks[1].clips[0].grid.kick, 'x.......x.......');
  const m = compactContext(CONTEXT, 'minimal');
  assert.equal(m.tracks[0].clips[0].notes, undefined);
  assert.equal(m.tracks[0].clips[0].noteCount, 2);
  assert.deepEqual(compactContext(CONTEXT, 'full').tracks[0].clips[0].notes[0], { note: 'C4', start: 0, len: 1, vel: 0.8 });
});

test('chooseDetail scales context to the model window', () => {
  assert.equal(chooseDetail(2000, 128000), 'full');
  assert.equal(chooseDetail(20000, 8192), 'compact');
  assert.equal(chooseDetail(60000, 8192), 'minimal');
  assert.ok(estimateTokens('abcdefg') === 2);
  assert.match(buildUserMessage({ prompt: 'make it sad', context: { a: 1 }, mode: 'remix', detail: 'compact' }), /make it sad/);
});

test('a valid plan is applied and the turn is marked applied', async () => {
  const { session, executed } = harness([openaiJson(plan([{ type: 'setTempo', params: { bpm: 90 } }]))]);
  const turn = await session.send('slower please', 'free');
  assert.equal(turn.status, 'applied');
  assert.equal(executed.length, 1);
  assert.equal(executed[0].actions[0].params.bpm, 90);
  assert.equal(turn.attempts, 1);
});

test('invalid JSON is repaired by feeding the error back', async () => {
  const { session, requests } = harness([
    openaiJson(plan([{ type: 'addChordProgression', target: 't1', params: { chords: ['Cmaj7', 'Hm'] } }])),
    openaiJson(plan([{ type: 'addChordProgression', target: 't1', params: { chords: ['Cmaj7', 'Am'] } }]))
  ]);
  const turn = await session.send('chords', 'compose');
  assert.equal(turn.status, 'applied');
  assert.equal(turn.attempts, 2);
  assert.match(lastUser(requests[1]), /chords\[1\]/);
  assert.equal(requests[1].body.messages.filter((m) => m.role === 'assistant').length, 1);
});

test('a plan that throws while applying is rolled back and repaired', async () => {
  let calls = 0;
  const { session, requests } = harness([
    openaiJson(plan([{ type: 'renameTrack', target: 'nope', params: { name: 'x' } }])),
    openaiJson(plan([{ type: 'renameTrack', target: 't1', params: { name: 'x' } }]))
  ], { executePlan: async (p) => { calls++; if (p.actions[0].target === 'nope') throw new Error('Action 1 (renameTrack): track "nope" not found'); return { count: 1 }; } });
  const turn = await session.send('rename', 'free');
  assert.equal(turn.status, 'applied');
  assert.equal(calls, 2);
  assert.match(lastUser(requests[1]), /not found/);
});

test('with repairAttempts 0 an invalid plan fails without retrying', async () => {
  const { session, requests } = harness([openaiJson(plan([{ type: 'flyToMoon', params: {} }]))], { settings: { repairAttempts: 0 } });
  const turn = await session.send('x', 'free');
  assert.equal(turn.status, 'failed');
  assert.equal(requests.length, 1);
  assert.match(turn.message, /flyToMoon/);
});

test('review mode parks the plan until applyTurn', async () => {
  const { session, executed } = harness([openaiJson(plan([{ type: 'setSwing', params: { swing: 0.2 } }]))], { settings: { applyMode: 'review' } });
  const turn = await session.send('swing', 'free');
  assert.equal(turn.status, 'review');
  assert.equal(executed.length, 0);
  await session.applyTurn(turn.id);
  assert.equal(executed.length, 1);
  assert.equal(session.turns[0].status, 'applied');
});

test('a reply with no actions is an answer, not a change', async () => {
  const { session, executed } = harness([openaiJson(JSON.stringify({ reply: 'D dorian suits dusk.', actions: [] }))]);
  const turn = await session.send('what scale for dusk?', 'ask');
  assert.equal(turn.status, 'answered');
  assert.equal(turn.plan.reply, 'D dorian suits dusk.');
  assert.equal(executed.length, 0);
});

test('prose in Ask mode is accepted as the answer', async () => {
  const { session } = harness([openaiJson('Use a pentatonic scale for a calm feel.')]);
  const turn = await session.send('advice?', 'ask');
  assert.equal(turn.status, 'answered');
  assert.match(turn.plan.reply, /pentatonic/);
});

test('later turns include earlier turns as history', async () => {
  const { session, requests } = harness([
    openaiJson(plan([{ type: 'setTempo', params: { bpm: 90 } }], { summary: 'Slowed to 90 BPM' })),
    openaiJson(plan([{ type: 'setSwing', params: { swing: 0.1 } }]))
  ]);
  await session.send('slower', 'free');
  await session.send('now add swing', 'free');
  const msgs = requests[1].body.messages;
  assert.ok(msgs.some((m) => m.role === 'assistant' && /Slowed to 90 BPM/.test(m.content)));
  assert.ok(msgs.some((m) => m.role === 'user' && /slower/.test(m.content)));
});

test('a turn the user undid is reported as undone in later history', async () => {
  const { session, requests } = harness([
    openaiJson(plan([{ type: 'setTempo', params: { bpm: 90 } }])),
    openaiJson(plan([{ type: 'setSwing', params: { swing: 0.1 } }]))
  ]);
  const first = await session.send('slower', 'free');
  session.markUndone(first.id);
  await session.send('again', 'free');
  assert.ok(requests[1].body.messages.some((m) => m.role === 'assistant' && /undone/i.test(m.content)));
});

test('a truncated response fails with a Max tokens fix', async () => {
  const { session } = harness([openaiJson('{"actions":[{"type":"addTrack","params":{"na', 'length')]);
  const turn = await session.send('big', 'compose');
  assert.equal(turn.status, 'failed');
  assert.match(turn.message, /Max tokens/);
});

test('a rejected optional parameter is dropped and the request retried', async () => {
  const { session, requests } = harness([
    fakeResponse({ status: 400, json: { error: { message: "Unsupported value: 'temperature' does not support 0.4" } } }),
    openaiJson(plan([{ type: 'setSwing', params: { swing: 0 } }]))
  ], { settings: { provider: 'openai', apiKey: 'k', reasoning: 'none' } });
  const turn = await session.send('x', 'free');
  assert.equal(turn.status, 'applied');
  assert.equal(requests[1].body.temperature, undefined);
});

test('cloud providers without a key fail fast with a clear message', async () => {
  const { session, requests } = harness([], { settings: { provider: 'openai' } });
  const turn = await session.send('x', 'free');
  assert.equal(turn.status, 'failed');
  assert.match(turn.message, /API key/);
  assert.equal(requests.length, 0);
});

test('HTTP errors carry the provider message and a hint', async () => {
  const { session } = harness([fakeResponse({ status: 401, json: { error: { message: 'bad key' } } })], { settings: { provider: 'openai', apiKey: 'k' } });
  const turn = await session.send('x', 'free');
  assert.equal(turn.status, 'failed');
  assert.match(turn.message, /bad key/);
  assert.match(turn.message, /API key/);
});

test('streaming deltas are emitted while the response arrives', async () => {
  const chunks = [
    `data: ${JSON.stringify({ choices: [{ delta: { content: '{"summary":"s",' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: '"actions":[]}' }, finish_reason: 'stop' }] })}\n\n`
  ];
  const { session } = harness([fakeResponse({ chunks })], { settings: { stream: true } });
  const seen = [];
  session.addEventListener('delta', (e) => seen.push(e.detail.text));
  const turn = await session.send('x', 'free');
  assert.equal(turn.status, 'answered');
  assert.ok(seen.length >= 2);
});

test('a busy event reports when a request starts and fully finishes', async () => {
  const { session } = harness([openaiJson(plan([{ type: 'setSwing', params: { swing: 0 } }]))]);
  const seen = [];
  session.addEventListener('busy', (e) => seen.push([e.detail, session.busy]));
  await session.send('x', 'free');
  assert.deepEqual(seen, [[true, true], [false, false]]);
});

test('turns survive a toJSON/load round trip', async () => {
  const { session } = harness([openaiJson(plan([{ type: 'setSwing', params: { swing: 0 } }]))]);
  await session.send('x', 'free');
  const copy = harness([]).session;
  copy.load(JSON.parse(JSON.stringify(session.toJSON())));
  assert.equal(copy.turns.length, 1);
  assert.equal(copy.turns[0].status, 'applied');
});
