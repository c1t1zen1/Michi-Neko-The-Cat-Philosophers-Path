// One-shot verification for the 天上 summit scene.
//
//   node tools/verify.mjs
//
// Runs five passes:
//   1. ES-module syntax check across src/ and src/kit/**
//   2. static wiring checks (the call sites main.js must make, summit + kit + Roof Road)
//   3. the headless state-machine suites (tools/summit_test.mjs, tools/rooftop_manager_test.mjs)
//   4. an HTML/CSS sanity pass over index.html
//   5. the kit: tools/kit_check.mjs and the node --test suites tools/kit_test.mjs and tools/a1_village_test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const step = (n, name, fn) => {
  process.stdout.write(`\n[${n}/5] ${name}\n`);
  try { fn(); } catch (e) { failures++; console.log('  ERROR ' + e.message); }
};

// 1. syntax -----------------------------------------------------------------
step(1, 'ES module syntax', () => {
  const out = execFileSync(process.execPath, ['tools/check_syntax.mjs'], {
    cwd: ROOT, encoding: 'utf8',
  });
  const lines = out.trim().split(/\r?\n/);
  const bad = lines.filter((l) => l.startsWith('FAIL'));
  if (bad.length) { failures++; console.log(bad.join('\n')); }
  console.log('  ' + lines[lines.length - 1]);
  // The summit's modules (src/summit/, behind the SummitManager facade) are
  // checked here too: tools/check_syntax.mjs reads src/*.js and src/kit/ only.
  const summitFiles = readdirSync(join(ROOT, 'src', 'summit')).filter((f) => f.endsWith('.js')).sort();
  const summitBad = [];
  for (const f of summitFiles) {
    const raw = readFileSync(join(ROOT, 'src', 'summit', f), 'utf8');
    try {
      execFileSync(process.execPath, ['--input-type=module', '--check'], {
        input: raw.replace(/^\uFEFF/, ''), stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      summitBad.push(`FAIL src/summit/${f}\n${String(e.stderr || e.message)}`);
    }
  }
  if (summitBad.length) { failures++; console.log(summitBad.join('\n')); }
  console.log(`  ${summitBad.length ? summitBad.length + ' of ' : 'All '}${summitFiles.length} summit modules ${summitBad.length ? 'failed' : 'OK'} (src/summit/)`);
  // The Roof Road's game side (src/rooftops/, BUILD_GUIDE_FABLE R6), likewise.
  const roofFiles = readdirSync(join(ROOT, 'src', 'rooftops')).filter((f) => f.endsWith('.js')).sort();
  const roofBad = [];
  for (const f of roofFiles) {
    const raw = readFileSync(join(ROOT, 'src', 'rooftops', f), 'utf8');
    try {
      execFileSync(process.execPath, ['--input-type=module', '--check'], {
        input: raw.replace(/^\uFEFF/, ''), stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      roofBad.push(`FAIL src/rooftops/${f}\n${String(e.stderr || e.message)}`);
    }
  }
  if (roofBad.length) { failures++; console.log(roofBad.join('\n')); }
  console.log(`  ${roofBad.length ? roofBad.length + ' of ' : 'All '}${roofFiles.length} Roof Road game modules ${roofBad.length ? 'failed' : 'OK'} (src/rooftops/)`);
});

// 2. wiring -----------------------------------------------------------------
step(2, 'main.js wiring', () => {
  const m = readFileSync(join(ROOT, 'src', 'main.js'), 'utf8');
  const s = readFileSync(join(ROOT, 'src', 'mountaintop.js'), 'utf8');
  // The summit's builders live in src/summit/*.js behind the SummitManager
  // facade (BUILD_GUIDE_FABLE S1.5): a check reads the file its code moved to.
  const summit = (name) => readFileSync(join(ROOT, 'src', 'summit', name), 'utf8');
  const planting = summit('planting.js');
  const vista = summit('vista.js');
  // The facade and every summit module, for checks that must hold anywhere.
  const summitAll = [s, ...readdirSync(join(ROOT, 'src', 'summit'))
    .filter((f) => f.endsWith('.js')).sort().map(summit)].join('\n');
  const checks = [
    ['summit.update() is called every frame', /this\.summit\.update\(dt, playing\)/.test(m)],
    ['summit imported', /import \{ SummitManager \} from '\.\/mountaintop\.js/.test(m)],
    ['music switches to the Summit mood', /this\.summit\.active \? 'Summit'/.test(m)],
    ['summit unlock is saved', /summitUnlocked: this\.summit\.unlocked/.test(m)],
    ['summit ring count is saved', /summitBellRings: this\.summit\.bellRings/.test(m)],
    ['on-summit position is saved', /let onSummit = this\.summit\.active/.test(m)],
    ['save never persists the summit pocket',
      /interior\.isTransitioning \|\| onSummit/.test(m)],
    ['unlock is restored', /worldFlags\.summitUnlocked/.test(m)],
    ['ring count is restored', /worldFlags\.summitBellRings/.test(m)],
    ['onSummit resumes the clearing', /worldFlags\.onSummit/.test(m)],
    ['valley vegetation paused on the summit',
      /!this\.summit\.active && !inside/.test(m)],
    ['NPCs paused on the summit', /if \(!this\.summit\.active\) \{\s*\n\s*for \(const n of this\.npcs\)/.test(m)],
    ['scent trail gated off', /!this\.summit\.active && this\.computeScentGate\(\)/.test(m)],
    ['waypoints suppressed', /this\.settings\.values\.hints && !this\.summit\.active/.test(m)],
    ['valley prompts suppressed',
      /hideAllPrompts\(\)[\s\S]{0,80}contextActions\.update\(dt\)/.test(m)],
    ['mp4 source attached lazily', /SUMMIT_VIDEO_SRC/.test(s)],
    ['video-playing class applied', /video-playing/.test(s)],
    ['veil modes cleared on exit',
      /classList\.remove\('show', 'fallback', 'quick', 'video-playing', 'fade-out'\)/.test(s)],
    ['summit snow system built', /this\.buildSummitSnow\(\)/.test(s)],
    ['summit rain system built', /this\.buildSummitRain\(\)/.test(s)],
    ['summit vista uses spatial geometry, not the painted cyclorama',
      /Layered Kyoto Bay Vista/.test(vista) && !/const tex = this\.makeVistaTexture\(\)/.test(summitAll)],
    ['summit vista has city, bay and horizon depth bands',
      /this\.buildKyotoCity\(\)/.test(vista) && /this\.buildSummitBay\(\)/.test(vista) &&
      /this\.buildHorizonRanges\(\)/.test(vista)],
    ['summit weather includes rain and mist',
      /SUMMIT_WEATHER_POOL[\s\S]{0,220}'mist'[\s\S]{0,80}'rain'/.test(s)],
    ['card set keyed by kind (not opts.kind)', /this\.cardSets\[kind\]/.test(planting)],
    ['summit landmark asset is module-relative',
      /SUMMIT_LANDMARKS_SRC\s*=\s*new URL\([^\n]+import\.meta\.url\)/.test(vista)],
    // The summit split (BUILD_GUIDE_FABLE S1.2/S1.3)
    ['summit receives the runtime as its own scoped view',
      /this\.assets = scopeAssets\(game\.assets, \{ MAT: this\.MAT, textures: TEX \}\)/.test(s)],
    ['summit builders route through placeAsset()',
      /placeAsset\(id, layout, classicFn\) \{/.test(s) && /this\.placeAsset\('summit-meadow'/.test(summitAll)],
    ['summit modules import with the main.js cache tag',
      (() => {
        const tag = (m.match(/\?v=([0-9a-z]+)/) || [])[1];
        const tags = summitAll.match(/\?v=[0-9a-z]+/g) || [];
        return !!tag && tags.length > 0 && tags.every((t) => t === '?v=' + tag);
      })()],
    // Kit runtime wiring (BUILD_GUIDE_FABLE F1.8 / F1.12)
    ['kit runtime imported', /import \{ AssetRuntime \} from '\.\/kit\/runtime\.js\?v=/.test(m)],
    ['kit runtime constructed on the Game', /this\.assets = new AssetRuntime\(/.test(m)],
    ['kit preload awaited before the world is built',
      /await this\.assets\.preload\(\);[\s\S]{0,200}this\.assembleWorld\(\)/.test(m)],
    ['quality resolved (and set on the runtime) before the kit preloads and the world builds (G-F I1)',
      /this\.resolvedQuality = this\.settings\.resolveQuality\(\);\s*this\.assets\.setQuality\(this\.resolvedQuality\);\s*await this\.assets\.preload\(\);/.test(m)],
    ['Player gets the resolved quality (G-F I1)', /new Player\([^)]*quality: this\.resolvedQuality/.test(m)],
    ['Countryside receives the runtime', /new Countryside\(this\.scene, \{ assets: this\.assets \}\)/.test(m)],
    ['Vegetation receives the runtime', /new Vegetation\([\s\S]{0,300}assets: this\.assets/.test(m)],
    ['HiddenPlaces receives the runtime', /new HiddenPlaces\(this\.scene, this\.city, \{ assets: this\.assets \}\)/.test(m)],
    ['Particles receives the runtime', /new Particles\(this\.scene, \{ assets: this\.assets \}\)/.test(m)],
    ['AmbientLife receives the runtime', /new AmbientLife\(this\.scene, this\.audio, this\.city\.nestPos, \{ assets: this\.assets \}\)/.test(m)],
    ['kit instances updated in the frame loop', /this\.assets\.update\(dt, this\.elapsed, /.test(m)],
    ['kit tier follows applyQuality()', /applyQuality\(\) \{[\s\S]*?this\.assets\.setQuality\(q\)/.test(m)],
    ['startGame is async and awaits init', /export async function startGame\(\)[\s\S]{0,200}await game\.init\(\)/.test(m)],
    ['capture flags parsed from the URL', /parseCaptureFlags\(location\.search\)/.test(m)],
    ['?cam= applied after every camera owner', /applyCaptureCamera\(\)/.test(m)],
    ['?shot=1 fixes the timestep', /CAPTURE_DT/.test(m)],
    ...rooftopChecks(m),
  ];
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) failures++;
  }
});

/**
 * The Roof Road in the game (BUILD_GUIDE_FABLE R6, the spec's section 8.2), in
 * the summit checks' style: the call sites main.js makes, what the manager,
 * the pocket and the valley builders must keep, and the cache tags.
 */
function rooftopChecks(m) {
  const read = (p) => readFileSync(join(ROOT, p), 'utf8');
  const mgr = read('src/rooftops/manager.js');
  const pocket = read('src/rooftops/pocket.js');
  const valley = read('src/rooftops/valley.js');
  const posts = read('src/rooftops/posts.js');
  const city = read('src/countryside.js');
  const roofDir = join(ROOT, 'src', 'rooftops');
  const roofAll = readdirSync(roofDir).filter((f) => f.endsWith('.js')).sort().map((f) => [f, read('src/rooftops/' + f)]);
  const tag = (m.match(/\?v=([0-9a-z]+)/) || [])[1];
  const body = (src, head) => {
    const i = src.indexOf(head);
    if (i < 0) return '';
    let depth = 0;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1);
    }
    return '';
  };
  const updateRooftops = body(m, '  updateRooftops(dt, playing) {');
  return [
    ['rooftops imported', /import \{ RooftopManager \} from '\.\/rooftops\/manager\.js\?v=/.test(m)],
    ['rooftop manager built after the summit', /this\.summit = new SummitManager\(this\);[\s\S]{0,800}this\.rooftops = new RooftopManager\(this\)/.test(m)],
    ['rooftops.update() runs in the valley frame (posts, thicket, gap)', /if \(!this\.summit\.active && !inside\) this\.rooftops\.update\(dt, playing\)/.test(m)],
    ['the Roof Road owns the frame while active', /if \(this\.rooftops && this\.rooftops\.active\) \{\s*this\.updateRooftops\(dt, playing\);\s*return;/.test(m)],
    ['Player.update is skipped on the roofs', updateRooftops.length > 0 && !/this\.player\.update\(/.test(updateRooftops) && /this\.rooftops\.update\(dt, playing\)/.test(updateRooftops)],
    ['valley prompts suppressed on the roofs', /hideAllPrompts\(\)/.test(updateRooftops)],
    ['music switches to the Rooftops mood', /this\.music\.setScene\('Rooftops'\)/.test(updateRooftops)],
    ['the pocket renders instead of the composer', /if \(this\.rooftops && this\.rooftops\.rendering\) this\.rooftops\.render\(\);\s*else this\.composer\.render\(\);/.test(m)],
    ['rooftop unlock is saved', /rooftopsUnlocked: this\.rooftops\.unlocked/.test(m)],
    ['rooftop Shōki mask is saved', /rooftopShoki: this\.rooftops\.shoki/.test(m)],
    ['rooftop finale is saved', /rooftopFinished: this\.rooftops\.finished/.test(m)],
    ['save never persists the rooftop pocket',
      /const onRoof = !!\(this\.rooftops && \(this\.rooftops\.active \|\| this\.rooftops\.transitioning\)\)/.test(m) &&
      /if \(back\) \{ px = back\.x; py = back\.y; pz = back\.z; \}/.test(m)],
    ['rooftop unlock restored silently', /worldFlags\.rooftopsUnlocked\) this\.rooftops\.setUnlocked\(true, true\)/.test(m)],
    ['rooftop Shōki mask restored (7 bits)', /worldFlags\.rooftopShoki\)\) this\.rooftops\.shoki = data\.worldFlags\.rooftopShoki & 0x7f/.test(m)],
    ['rooftop finale restored', /worldFlags\.rooftopFinished\) this\.rooftops\.finished = true/.test(m)],
    ['quit to title leaves the roofs', /quitToTitle\(\) \{[\s\S]{0,250}this\.rooftops\.exitImmediate\(\)/.test(m)],
    ['the pocket loads only on the first enter (dynamic import)',
      /import\('\.\/pocket\.js\?v=/.test(mgr) && !/^import [^\n]*(pocket\.js|rooftops\/js\/)/m.test(mgr)],
    ['the manager is pure (no three.js import)', !/from 'three'/.test(mgr) && !/from 'three'/.test(posts)],
    ['pocket origin 2.4 km below the valley', /ROOFTOP_ORIGIN = Object\.freeze\(\{ x: 0, y: -2400, z: 0 \}\)/.test(mgr)],
    ['noren veil driven by the manager', /getElementById\('rooftop-transition'\)/.test(mgr) && !/summit-transition/.test(mgr)],
    ['pocket: the runtime is preloaded before the Sky (r4b order)', /await this\.assets\.preload\(\);[\s\S]{0,600}new Sky\(this\.root, this\.exposure, \{[\s\S]{0,200}assets: this\.assets/.test(pocket)],
    ['pocket: the sky follows the run (progress), night at the finale', /const prog = this\.finale \? 1 : clamp\(r\.s \/ this\.level\.length, 0, 1\)/.test(pocket)],
    ['Countryside builds the Seven Posts and the Odoi', /this\.sevenPosts = buildSevenPosts\(this\.scene, MAT\)/.test(city) && /this\.odoi = buildOdoiThicket\(this, MAT\)/.test(city)],
    ['setOdoiThicketOpen() and setSevenPostGlow() on Countryside', /\n  setOdoiThicketOpen\(t\) \{/.test(city) && /\n  setSevenPostGlow\(i, v\) \{/.test(city)],
    ['the Odoi draws its own mulberry32(0x0D01), never the valley stream',
      /seed: 0x0D01/.test(posts) && /mulberry32\(ODOI\.seed\)/.test(valley) && !/\.random\(\)|\.rng\(\)|Math\.random/.test(valley)],
    ['R57: the runner modules are re-exported from rooftops/js/, not copied',
      ['rail', 'level', 'physics', 'reach', 'autopilot'].every((n) => {
        const src = read('src/rooftops/' + n + '.js');
        return src.includes(`export * from '../../rooftops/js/${n}.js';`) && !/\b(class|function)\b/.test(src.replace(/^\/\/.*$/gm, ''));
      })],
    ['src/rooftops modules import game modules with the main.js cache tag',
      !!tag && roofAll.every(([, src]) => {
        const specs = [...src.matchAll(/(?:from|import\()\s*'([^']+)'/g)].map((x) => x[1]).filter((p) => p.startsWith('.'));
        return specs.every((p) => (p.includes('rooftops/js/') ? !/\?v=/.test(p) : p.endsWith('?v=' + tag)));
      })],
  ];
}

// 3. behaviour --------------------------------------------------------------
step(3, 'summit + rooftop state machines', () => {
  const out = execFileSync(process.execPath, ['tools/summit_test.mjs'], {
    cwd: ROOT, encoding: 'utf8',
  });
  const summary = out.trim().split(/\r?\n/);
  console.log('  summit_test: ' + summary[summary.length - 1]);
  if (!/0 failed/.test(summary[summary.length - 1])) failures++;
  let roof;
  try { roof = execFileSync(process.execPath, ['tools/rooftop_manager_test.mjs'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { failures++; roof = String(e.stdout || '') + String(e.stderr || ''); }
  const roofSummary = roof.trim().split(/\r?\n/);
  console.log('  rooftop_manager_test: ' + roofSummary[roofSummary.length - 1]);
  if (!/ 0 failed/.test(roofSummary[roofSummary.length - 1])) failures++;
});

// 4. markup -----------------------------------------------------------------
step(4, 'index.html markup + CSS', () => {
  const h = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const checks = [
    ['transition veil present', h.includes('id="summit-transition"')],
    ['video element present', h.includes('id="summit-video"')],
    ['fallback flare is animated', /@keyframes summit-flare/.test(h)],
    ['descent veil is animated', /@keyframes summit-dim/.test(h)],
    ['no duplicate summit-dim keyframes',
      (h.match(/@keyframes summit-dim/g) || []).length === 1],
    ['no duplicate .quick rules outside the reduced-motion block',
      (h.match(/^ {4}#summit-transition\.quick \{/gm) || []).length === 1],
    ['reduced-motion disables the veils',
      /prefers-reduced-motion[\s\S]{0,400}summit-transition\.fallback, #summit-transition\.quick \{ animation: none; \}/.test(h)],
    ['quest card target exists', h.includes('id="quest-card"')],
    ['rooftop noren veil present', h.includes('id="rooftop-transition"') && /#rooftop-transition\.show/.test(h) && /#rooftop-transition\.out/.test(h)],
    ['rooftop veil is a sibling of the summit veil, not inside it', (() => {
      const a = h.indexOf('<div id="summit-transition">'), b = h.indexOf('<div id="rooftop-transition"');
      if (a < 0 || b < a) return false;
      let depth = 0;
      for (const t of h.slice(a, b).matchAll(/<div\b|<\/div>/g)) depth += t[0] === '</div>' ? -1 : 1;
      return depth === 0;
    })()],
    ['rooftop-mode hides the valley guidance, keeps the toasts', /body\.rooftop-mode #compass/.test(h) && !/body\.rooftop-mode #toast-stack/.test(h)],
    ['compass target exists', h.includes('id="compass"')],
    ['prompt target exists', h.includes('id="prompt"')],
  ];
  const open = (h.match(/\{/g) || []).length;
  const close = (h.match(/\}/g) || []).length;
  checks.push(['braces balanced', open === close]);
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) failures++;
  }
});

// 5. kit -------------------------------------------------------------------
step(5, 'kit static checks + unit tests', () => {
  const out = execFileSync(process.execPath, ['tools/kit_check.mjs'], { cwd: ROOT, encoding: 'utf8' });
  const lines = out.trim().split(/\r?\n/);
  const bad = lines.filter((l) => l.startsWith('FAIL'));
  if (bad.length) { failures++; console.log(bad.join('\n')); }
  console.log('  ' + lines[lines.length - 1]);
  let tests;
  try { tests = execFileSync(process.execPath, ['--test', 'tools/kit_test.mjs'], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { failures++; tests = String(e.stdout || '') + String(e.stderr || ''); }
  const summary = tests.split(/\r?\n/).filter((l) => /^ℹ (tests|pass|fail) /.test(l)).map((l) => l.slice(2).trim());
  console.log('  kit_test: ' + (summary.join(', ') || 'no summary (see output above)'));
  if (!/^ℹ fail 0$/m.test(tests)) failures++;
  // a1-village (Phase 7): the R66 same-output speedups and the A.5 kindle edge, against their oracles
  let a1;
  try { a1 = execFileSync(process.execPath, ['--test', 'tools/a1_village_test.mjs'], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { failures++; a1 = String(e.stdout || '') + String(e.stderr || ''); }
  const a1summary = a1.split(/\r?\n/).filter((l) => /^ℹ (tests|pass|fail) /.test(l)).map((l) => l.slice(2).trim());
  console.log('  a1_village_test: ' + (a1summary.join(', ') || 'no summary (see output above)'));
  if (!/^ℹ fail 0$/m.test(a1)) failures++;
});

console.log(failures
  ? `\n${failures} check(s) FAILED\n`
  : '\nAll checks passed\n');
process.exit(failures ? 1 : 0);
