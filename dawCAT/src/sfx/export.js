/* dawCAT — SFX pack export. Turns the project's SFX patches into things the
   game can use without any audio files:
   - sfx-pack.js: an ES module embedding the SFX runtime + patches, with
     playSfx(audio, name) and installSfxOverrides(audio), which swaps the
     game's own AudioManager methods (playMeow, playFootstep…) for patches
     whose gameHook names them;
   - a console hot-swap snippet doing the same live in a running game;
   - a manifest and README, and (via the UI) WAV renders, zipped together.
   Pure string generation — no DOM. */
import { sfxRuntime } from './runtime.js';

const RT = sfxRuntime();

/* Game SFX sit quietly under the music (meow peaks ~0.15, footsteps ~0.05),
   so exported patches are scaled down to match by default. */
export const DEFAULT_PACK_LEVEL = 0.35;

export function sfxSlug(name) {
  return String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sfx';
}

/* id → unique slug, deduplicated with -2, -3 … in patch order. */
export function assignSlugs(patches) {
  const used = new Map();
  const out = new Map();
  for (const p of patches) {
    const base = sfxSlug(p.name);
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    out.set(p.id, n === 1 ? base : `${base}-${n}`);
  }
  return out;
}

/* method → { '*': slug, '<first arg>': slug } from "method" / "method:arg". */
function hookTable(patches, slugs) {
  const hooks = {};
  for (const p of patches) {
    if (!p.gameHook) continue;
    const [method, arg] = p.gameHook.split(':');
    if (!method) continue;
    hooks[method] = hooks[method] || {};
    hooks[method][arg || '*'] = slugs.get(p.id);
  }
  return hooks;
}

function r3(v) { return Math.round(v * 1000) / 1000; }

/* Shared code for the module and the snippet. `ex` is "export " or "". */
function packBody(patches, { level = DEFAULT_PACK_LEVEL, ex = '' } = {}) {
  const slugs = assignSlugs(patches);
  const table = {};
  for (const p of patches) table[slugs.get(p.id)] = RT.normalize(p);
  return `const SFX_RUNTIME = (${sfxRuntime.toString()})();
const LEVEL = ${Number(level) || DEFAULT_PACK_LEVEL};
${ex}const PATCHES = ${JSON.stringify(table)};
${ex}const SFX_NAMES = Object.keys(PATCHES);
${ex}const HOOKS = ${JSON.stringify(hookTable(patches, slugs))};
// Behaviour the game's originals have that an override must keep.
const THROTTLE = { playFootstep: 0.28 };
const PASSTHROUGH = { playFootstep: ['water'] };
const roundRobin = {};
const lastHook = {};

function resolveSfx(name) {
  if (Object.prototype.hasOwnProperty.call(PATCHES, name)) return name;
  const slug = String(name == null ? '' : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (Object.prototype.hasOwnProperty.call(PATCHES, slug)) return slug;
  const lower = String(name).toLowerCase();
  for (const key in PATCHES) if (PATCHES[key].name.toLowerCase() === lower) return key;
  return null;
}

/** Plays a pack sound on the game's SFX bus. opts: { variation, pitch (cents), gain, when, dest }.
 *  Sounds with variation amounts cycle through 4 round-robin variants automatically. */
${ex}function playSfx(audio, name, opts) {
  opts = opts || {};
  const key = resolveSfx(name);
  if (!key) { if (typeof console !== 'undefined') console.warn('dawCAT SFX: no sound named', name); return null; }
  if (!audio || !audio.ctx || audio.initialized === false) return null;
  const patch = PATCHES[key];
  const dest = opts.dest || (audio.buses && audio.buses.sfx) || audio.master || audio.ctx.destination;
  const v = patch.variation;
  let variation = opts.variation;
  if (variation == null) variation = v && (v.pitch || v.time || v.gain) ? (roundRobin[key] = (roundRobin[key] || 0) % 4 + 1) : 0;
  return SFX_RUNTIME.play(audio.ctx, dest, patch, opts.when == null ? audio.ctx.currentTime : opts.when, {
    variation: variation, pitch: opts.pitch, gain: LEVEL * (opts.gain == null ? 1 : opts.gain)
  });
}

/** Replaces the game's AudioManager methods named by each sound's gameHook. Returns the methods replaced. */
${ex}function installSfxOverrides(audio) {
  const installed = [];
  if (!audio) return installed;
  for (const method in HOOKS) {
    const original = audio[method];
    if (typeof original !== 'function' || original.dawcatOverride) continue;
    const map = HOOKS[method];
    const own = Object.prototype.hasOwnProperty.call(audio, method);
    const wrapped = function () {
      const arg = arguments[0];
      if (PASSTHROUGH[method] && PASSTHROUGH[method].indexOf(arg) >= 0) return original.apply(audio, arguments);
      const key = (arg != null && Object.prototype.hasOwnProperty.call(map, arg) && map[arg]) || map['*'];
      if (!key) return original.apply(audio, arguments);
      if (!audio.initialized || !audio.ctx) return undefined;
      const now = audio.ctx.currentTime;
      if (THROTTLE[method] && lastHook[method] != null && now - lastHook[method] < THROTTLE[method]) return undefined;
      lastHook[method] = now;
      return playSfx(audio, key);
    };
    wrapped.dawcatOverride = true;
    wrapped.dawcatOriginal = original;
    wrapped.dawcatOwn = own;
    audio[method] = wrapped;
    installed.push(method);
  }
  return installed;
}

/** Restores the game's original sounds. */
${ex}function uninstallSfxOverrides(audio) {
  if (!audio) return;
  for (const method in HOOKS) {
    const f = audio[method];
    if (!f || !f.dawcatOverride) continue;
    if (f.dawcatOwn) audio[method] = f.dawcatOriginal;
    else delete audio[method];
  }
}`;
}

/* The sfx-pack.js ES module. */
export function generateSfxModule(patches, { level = DEFAULT_PACK_LEVEL } = {}) {
  const slugs = assignSlugs(patches);
  const names = patches.map((p) => slugs.get(p.id));
  const hooks = patches.filter((p) => p.gameHook).map((p) => `${p.gameHook} → ${slugs.get(p.id)}`);
  const list = (items) => items.map((s) => ` *   ${String(s).replace(/\*\//g, '* /')}`).join('\n');
  return `/* ============================================================
 * Generated by dawCAT — procedural SFX pack for Michi-Neko.
 * ${patches.length} sound(s). No audio files: every sound is synthesized
 * live with the Web Audio API by the embedded dawCAT SFX runtime, so
 * what you heard in dawCAT is exactly what plays in the game.
 *
 * Sounds:
${list(names) || ' *   (none)'}
 * Game hooks (installSfxOverrides):
${list(hooks) || ' *   (none — set a Game hook on a sound in dawCAT to replace a game sound)'}
 *
 * Use it from the game (save as src/sfx-pack.js):
 *   import { playSfx, installSfxOverrides } from './sfx-pack.js';
 *   playSfx(this.audio, '${names[0] || 'my-sound'}');   // play any sound
 *   installSfxOverrides(this.audio);           // swap hooked game sounds
 * ============================================================ */

${packBody(patches, { level, ex: 'export ' })}
`;
}

/* Console snippet: installs the pack into a running game (window.game.audio)
   and exposes window.dawcatSfx = { play, names, uninstall }. */
export function sfxHotSwapSnippet(patches, { level = DEFAULT_PACK_LEVEL } = {}) {
  return `(function () {
  try {
    var g = window.game;
    if (!g || !g.audio) { console.warn('dawCAT SFX: game instance not found (window.game)'); return; }
    ${packBody(patches, { level }).replace(/\n/g, '\n    ')}
    if (window.dawcatSfx && window.dawcatSfx.uninstall) window.dawcatSfx.uninstall();
    var installed = installSfxOverrides(g.audio);
    window.dawcatSfx = {
      play: function (name, opts) { return playSfx(g.audio, name, opts); },
      names: SFX_NAMES,
      uninstall: function () { uninstallSfxOverrides(g.audio); }
    };
    if (!g.audio.initialized) console.warn('dawCAT SFX: game audio is not started yet — click the game once; hooked sounds will work after that.');
    console.log('dawCAT SFX pack loaded: ' + SFX_NAMES.length + ' sound(s)' + (installed.length ? ', replacing ' + installed.join(', ') : '') + '. Try dawcatSfx.play("' + (SFX_NAMES[0] || '') + '"). dawcatSfx.uninstall() restores the originals.');
  } catch (e) { console.error('dawCAT SFX hot-swap failed:', e); }
})();`;
}

export function sfxManifest(patches, filesById = {}, { level = DEFAULT_PACK_LEVEL } = {}) {
  const slugs = assignSlugs(patches);
  return {
    kind: 'dawcat-sfx-pack',
    v: 1,
    generator: 'dawCAT',
    generatedAt: new Date().toISOString(),
    level,
    sfx: patches.map((p) => ({
      id: p.id, name: p.name, slug: slugs.get(p.id), category: p.category, tags: p.tags || [],
      duration: r3(RT.duration(p)), gameHook: p.gameHook || null, files: filesById[p.id] || []
    }))
  };
}

function readme(patches, level) {
  return `dawCAT SFX pack for Michi-Neko
==============================

${patches.length} procedural sound(s), generated ${new Date().toISOString().slice(0, 10)}.

sfx-pack.js         Drop into the game's src/ folder. No audio files needed —
                    sounds are synthesized live, exactly as in dawCAT.
                      import { playSfx, installSfxOverrides } from './sfx-pack.js';
                      playSfx(this.audio, 'sound-name');
                      installSfxOverrides(this.audio);   // replace hooked game sounds
sfx/*.wav           Rendered previews (and .v2/.v3… round-robin variations) for
                    use in other tools, trailers or audio middleware.
sfx-manifest.json   Names, durations, categories and game hooks.

Pack level ${level} scales sounds to sit at the game's SFX loudness.
Re-export from dawCAT (Sound Design ▸ Export SFX pack) after any change.
`;
}

/* Zip entries for the pack. wavsById: id → [Uint8Array main, …variations]. */
export function packEntries(patches, wavsById = {}, { level = DEFAULT_PACK_LEVEL } = {}) {
  const slugs = assignSlugs(patches);
  const entries = [];
  const files = {};
  for (const p of patches) {
    const wavs = wavsById[p.id] || [];
    files[p.id] = wavs.map((_, i) => `sfx/${slugs.get(p.id)}${i ? `.v${i + 1}` : ''}.wav`);
    wavs.forEach((data, i) => entries.push({ name: files[p.id][i], data }));
  }
  entries.push({ name: 'sfx-pack.js', data: generateSfxModule(patches, { level }) });
  entries.push({ name: 'sfx-manifest.json', data: JSON.stringify(sfxManifest(patches, files, { level }), null, 2) });
  entries.push({ name: 'README.txt', data: readme(patches, level) });
  return entries;
}
