import { test, assert } from './harness.mjs';
import { FakeAudioContext } from './fake-audio.mjs';
import { crc32, createZip } from '../src/zip.js';
import { generateSfxModule, sfxHotSwapSnippet, sfxManifest, sfxSlug, packEntries } from '../src/sfx/export.js';
import { createPatch } from '../src/sfx/patches.js';

const enc = new TextEncoder();

/* Evaluates the generated ES module by stripping `export` so it can run in
   new Function — proves it is self-contained and syntactically valid. */
function loadModule(src) {
  const body = src.replace(/^export (const|function) /gm, '$1 ');
  return new Function(`${body}\nreturn { PATCHES, SFX_NAMES, HOOKS, playSfx, installSfxOverrides, uninstallSfxOverrides };`)();
}

function fakeAudio() {
  const ctx = new FakeAudioContext();
  const calls = [];
  const sfxBus = ctx.createGain();
  return {
    ctx, initialized: true, buses: { sfx: sfxBus }, master: sfxBus, calls,
    playMeow() { calls.push('orig-meow'); },
    playFootstep(surface) { calls.push(`orig-step-${surface}`); },
    playLap() { calls.push('orig-lap'); }
  };
}

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(enc.encode('123456789')), 0xCBF43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('createZip writes local headers, a central directory and an end record', () => {
  const zip = createZip([{ name: 'a.txt', data: 'hello' }, { name: 'sfx/b.bin', data: new Uint8Array([1, 2, 3]) }]);
  assert.deepEqual(Array.from(zip.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = zip.byteLength - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50);
  assert.equal(view.getUint16(eocd + 10, true), 2);
  const cdOffset = view.getUint32(eocd + 16, true);
  assert.equal(view.getUint32(cdOffset, true), 0x02014b50);
  // first entry's stored CRC matches its data
  assert.equal(view.getUint32(14, true), crc32(enc.encode('hello')));
});

test('sfxSlug makes file-safe names', () => {
  assert.equal(sfxSlug('Leaf Pickup!'), 'leaf-pickup');
  assert.equal(sfxSlug('  '), 'sfx');
});

test('the generated module is self-contained and plays a patch on the sfx bus', () => {
  const meow = createPatch('meow', { name: 'Sleepy Meow' });
  const mod = loadModule(generateSfxModule([meow, createPatch('collect')]));
  assert.deepEqual(mod.SFX_NAMES.sort(), ['collect', 'sleepy-meow']);
  const audio = fakeAudio();
  const out = mod.playSfx(audio, 'Sleepy Meow');
  assert.ok(out && out.end > 0);
  assert.ok(audio.ctx.nodes.some((n) => n.kind === 'oscillator'));
  assert.equal(mod.playSfx(audio, 'nope'), null);
});

test('installSfxOverrides only replaces hooked methods and can be undone', () => {
  const meow = createPatch('meow', { gameHook: 'playMeow' });
  const mod = loadModule(generateSfxModule([meow, createPatch('collect')]));
  const audio = fakeAudio();
  const installed = mod.installSfxOverrides(audio);
  assert.deepEqual(installed, ['playMeow']);
  const before = audio.ctx.nodes.length;
  audio.playMeow();
  assert.ok(audio.ctx.nodes.length > before);
  assert.ok(!audio.calls.includes('orig-meow'));
  mod.uninstallSfxOverrides(audio);
  audio.playMeow();
  assert.ok(audio.calls.includes('orig-meow'));
});

test('footstep overrides keep the game throttle, surface qualifiers and water lapping', () => {
  const wood = createPatch('paw-step', { name: 'Wood step', gameHook: 'playFootstep:wood' });
  const any = createPatch('paw-step', { name: 'Grass step', gameHook: 'playFootstep' });
  const mod = loadModule(generateSfxModule([wood, any]));
  const audio = fakeAudio();
  mod.installSfxOverrides(audio);
  audio.playFootstep('water');
  assert.ok(audio.calls.includes('orig-step-water'));
  const n0 = audio.ctx.nodes.length;
  audio.playFootstep('wood');
  const n1 = audio.ctx.nodes.length;
  assert.ok(n1 > n0);
  audio.playFootstep('wood');
  assert.equal(audio.ctx.nodes.length, n1, 'second step within 0.28 s is throttled');
  audio.ctx.currentTime = 1;
  audio.playFootstep('stone');
  assert.ok(audio.ctx.nodes.length > n1, 'unqualified hook covers other surfaces');
});

test('the export has no hook code when no patch has a gameHook', () => {
  const src = generateSfxModule([createPatch('collect')]);
  assert.match(src, /HOOKS = \{\}/);
});

test('the hot-swap snippet is valid script and mentions every sound', () => {
  const patches = [createPatch('meow', { gameHook: 'playMeow' }), createPatch('sparkle')];
  const snippet = sfxHotSwapSnippet(patches);
  assert.doesNotThrow(() => new Function(snippet));
  for (const p of patches) assert.ok(snippet.includes(sfxSlug(p.name)));
});

test('the hot-swap snippet installs into window.game.audio', () => {
  const patches = [createPatch('meow', { gameHook: 'playMeow' })];
  const audio = fakeAudio();
  const win = { game: { audio } };
  const logs = [];
  new Function('window', 'console', sfxHotSwapSnippet(patches))(win, { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) });
  assert.ok(win.dawcatSfx && typeof win.dawcatSfx.play === 'function');
  const before = audio.ctx.nodes.length;
  audio.playMeow();
  assert.ok(audio.ctx.nodes.length > before);
});

test('manifest lists sounds with durations, hooks and files', () => {
  const p = createPatch('bell', { gameHook: 'playBell' });
  const m = sfxManifest([p], { [p.id]: ['sfx/bell.wav'] });
  assert.equal(m.kind, 'dawcat-sfx-pack');
  assert.equal(m.sfx[0].slug, 'bell');
  assert.equal(m.sfx[0].gameHook, 'playBell');
  assert.ok(m.sfx[0].duration > 0);
  assert.deepEqual(m.sfx[0].files, ['sfx/bell.wav']);
});

test('packEntries de-duplicates slugs and adds module, manifest and readme', () => {
  const a = createPatch('meow'), b = createPatch('meow');
  const entries = packEntries([a, b], { [a.id]: [new Uint8Array([1])], [b.id]: [new Uint8Array([2]), new Uint8Array([3])] });
  const names = entries.map((e) => e.name).sort();
  assert.ok(names.includes('sfx/meow.wav'));
  assert.ok(names.includes('sfx/meow-2.wav'));
  assert.ok(names.includes('sfx/meow-2.v2.wav'));
  assert.ok(names.includes('sfx-pack.js'));
  assert.ok(names.includes('sfx-manifest.json'));
  assert.ok(names.includes('README.txt'));
});
