import { test, assert } from './harness.mjs';
import { FakeAudioContext } from './fake-audio.mjs';
import { KIT_SOUND_EVENTS, kitPatches, kitPackModule, kitCatalogMarkdown } from '../src/sfx/kit-events.js';
import { SFX_TEMPLATES } from '../src/sfx/patches.js';
import { sfxRuntime } from '../src/sfx/runtime.js';
import { KIT_AUDIO_EVENTS, createKitAudio } from '../../src/kit/audio.js';
import { readFileSync } from 'node:fs';

test('dawCAT kit events match the game env.audio contract exactly', () => {
  assert.deepEqual(KIT_SOUND_EVENTS.map((e) => e.event).sort(), [...KIT_AUDIO_EVENTS].sort());
});

test('every kit event maps to a real template that plays on a strict fake AudioContext', () => {
  const rt = sfxRuntime();
  for (const e of KIT_SOUND_EVENTS) assert.ok(SFX_TEMPLATES[e.template], e.template);
  for (const p of kitPatches()) {
    const ctx = new FakeAudioContext();
    const out = rt.play(ctx, ctx.destination, p, 0.1, { variation: 2 });
    assert.ok(out.end > 0.1, p.name);
  }
});

test('the kit pack module is a valid ES module naming every event', () => {
  const src = kitPackModule();
  for (const e of KIT_SOUND_EVENTS) assert.ok(src.includes(e.event.replace(/[^a-z0-9]+/g, '-')), e.event);
  assert.ok(src.includes('export function playSfx'));
});

test('catalog markdown lists every event and the committed catalog carries it', () => {
  const md = kitCatalogMarkdown();
  const file = readFileSync(new URL('../docs/GAME_AUDIO_CATALOG.md', import.meta.url), 'utf8');
  for (const e of KIT_SOUND_EVENTS) { assert.ok(md.includes('`' + e.event + '`')); assert.ok(file.includes('`' + e.event + '`'), 'catalog md: ' + e.event); }
});

test('createKitAudio: silent without a sink, forwards known events, survives a throwing sink', () => {
  const a = createKitAudio();
  assert.equal(a.play('lantern.kindle'), false);
  const got = [];
  a.setSink((ev, o) => got.push([ev, o.gain]));
  assert.equal(a.play('lantern.kindle', { gain: 0.5 }), true);
  assert.equal(a.play('not.an.event'), false);
  assert.deepEqual(got, [['lantern.kindle', 0.5]]);
  a.setSink(() => { throw new Error('x'); });
  assert.equal(a.play('lantern.kindle'), false);
});
