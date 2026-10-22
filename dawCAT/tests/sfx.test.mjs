import { test, assert } from './harness.mjs';
import { FakeAudioContext, numericLeaves } from './fake-audio.mjs';
import { sfxRuntime } from '../src/sfx/runtime.js';
import { SFX_TEMPLATES, SFX_CATEGORIES, GAME_HOOKS, createPatch, normalizePatch, newLayer } from '../src/sfx/patches.js';

const rt = sfxRuntime();

test('normalizePatch clamps hostile values and leaves no NaN', () => {
  const p = normalizePatch({ gain: 'loud', layers: [{ freq: 0, env: { attack: -1, decay: NaN }, repeat: { count: 1000, interval: -3 }, filter: { type: 'banana', q: 1e9 } }], fx: { reverb: 7 } });
  const l = p.layers[0];
  assert.ok(l.freq >= 20);
  assert.ok(l.env.attack >= 0);
  assert.ok(l.repeat.count <= 16);
  assert.ok(l.repeat.interval > 0);
  assert.equal(l.filter.type, 'off');
  assert.ok(p.fx.reverb <= 1);
  for (const [path, v] of numericLeaves(p)) assert.ok(Number.isFinite(v), `${path} is ${v}`);
});

test('normalizePatch caps the layer count and keeps strings bounded', () => {
  const p = normalizePatch({ name: 'x'.repeat(500), layers: Array.from({ length: 40 }, () => ({})) });
  assert.ok(p.layers.length <= 12);
  assert.ok(p.name.length <= 60);
});

test('there are at least 20 templates across the categories', () => {
  const ids = Object.keys(SFX_TEMPLATES);
  assert.ok(ids.length >= 20, `${ids.length} templates`);
  for (const id of ['meow', 'purr', 'bell', 'collect', 'paw-step', 'splash', 'shoji-door', 'dream-chime', 'ui-click', 'koto-pluck', 'temple-gong']) assert.ok(ids.includes(id), id);
  for (const id of ids) assert.ok(SFX_CATEGORIES.includes(SFX_TEMPLATES[id].category), `${id} category`);
});

test('every template plays on a strict fake AudioContext without invalid AudioParam values', () => {
  for (const id of Object.keys(SFX_TEMPLATES)) {
    const ctx = new FakeAudioContext();
    const patch = createPatch(id);
    const out = rt.play(ctx, ctx.destination, patch, 0.1, { variation: 3 });
    assert.ok(out.end > 0.1, `${id} end`);
    assert.ok(ctx.nodes.some((n) => n.kind === 'oscillator' || n.kind === 'bufferSource'), `${id} makes sound`);
  }
});

test('durations are sensible for one-shots', () => {
  const d = rt.duration(createPatch('collect'));
  assert.ok(d > 0 && d < 5, `collect ${d}`);
  assert.ok(rt.duration(createPatch('ui-click')) < 0.3);
  assert.ok(rt.duration(createPatch('temple-gong')) > 2);
});

test('repeats schedule one source per hit', () => {
  const ctx = new FakeAudioContext();
  rt.play(ctx, ctx.destination, { layers: [{ kind: 'tone', freq: 800, repeat: { count: 4, interval: 0.05, pitchStep: 2 } }] }, 0);
  const oscs = ctx.nodes.filter((n) => n.kind === 'oscillator');
  assert.equal(oscs.length, 4);
  const starts = oscs.map((o) => o.startedAt).sort((a, b) => a - b);
  assert.ok(Math.abs(starts[3] - 0.15) < 1e-9);
});

test('variation 0 is canonical; other variations differ but stay deterministic', () => {
  const patch = createPatch('paw-step');
  const freqs = (variation) => {
    const ctx = new FakeAudioContext();
    rt.play(ctx, ctx.destination, patch, 0, { variation });
    return ctx.nodes.filter((n) => n.kind === 'oscillator').map((o) => o.frequency.events[0][1]);
  };
  assert.deepEqual(freqs(0), freqs(0));
  assert.deepEqual(freqs(2), freqs(2));
  assert.notDeepEqual(freqs(0), freqs(2));
});

test('seeded noise buffers are reproducible', () => {
  const ctx = new FakeAudioContext();
  const a = rt.noise(ctx, 'pink', 0.5, 42).getChannelData(0);
  const b = rt.noise(new FakeAudioContext(), 'pink', 0.5, 42).getChannelData(0);
  assert.deepEqual(Array.from(a.slice(0, 64)), Array.from(b.slice(0, 64)));
  const c = rt.noise(ctx, 'pink', 0.5, 43).getChannelData(0);
  assert.notDeepEqual(Array.from(a.slice(0, 64)), Array.from(c.slice(0, 64)));
});

test('the runtime is self-contained so exports can embed its source', () => {
  const rebuilt = new Function(`return (${sfxRuntime.toString()})`)()();
  const ctx = new FakeAudioContext();
  const out = rebuilt.play(ctx, ctx.destination, createPatch('meow'), 0);
  assert.ok(out.end > 0);
});

test('registered sources are reported for voice tracking', () => {
  const ctx = new FakeAudioContext();
  const seen = [];
  rt.play(ctx, ctx.destination, createPatch('sparkle'), 0, { register: (n) => seen.push(n) });
  assert.ok(seen.length > 0);
});

test('createPatch applies overrides and gives each patch an id', () => {
  const a = createPatch('meow', { name: 'Sleepy meow' });
  const b = createPatch('meow');
  assert.equal(a.name, 'Sleepy meow');
  assert.ok(a.id && b.id && a.id !== b.id);
  assert.throws(() => createPatch('kazoo'), /template/);
});

test('newLayer makes a playable layer of each kind', () => {
  for (const kind of ['tone', 'noise', 'fm', 'pluck']) {
    const ctx = new FakeAudioContext();
    rt.play(ctx, ctx.destination, { layers: [newLayer(kind)] }, 0);
    assert.ok(ctx.nodes.length > 2, kind);
  }
});

test('GAME_HOOKS lists the game AudioManager methods', () => {
  for (const h of ['playMeow', 'playCollect', 'playFootstep', 'playBell']) assert.ok(GAME_HOOKS.includes(h), h);
});
