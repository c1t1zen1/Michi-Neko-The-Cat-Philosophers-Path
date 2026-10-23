// One-shot verification for the 天上 summit scene.
//
//   node tools/verify.mjs
//
// Runs three passes:
//   1. ES-module syntax check across src/
//   2. static wiring checks (the call sites main.js must make)
//   3. the headless summit state-machine suite (tools/summit_test.mjs)
//   4. an HTML/CSS sanity pass over index.html
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const step = (n, name, fn) => {
  process.stdout.write(`\n[${n}/4] ${name}\n`);
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
});

// 2. wiring -----------------------------------------------------------------
step(2, 'main.js wiring', () => {
  const m = readFileSync(join(ROOT, 'src', 'main.js'), 'utf8');
  const s = readFileSync(join(ROOT, 'src', 'mountaintop.js'), 'utf8');
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
      /Layered Kyoto Bay Vista/.test(s) && !/const tex = this\.makeVistaTexture\(\)/.test(s)],
    ['summit vista has city, bay and horizon depth bands',
      /this\.buildKyotoCity\(\)/.test(s) && /this\.buildSummitBay\(\)/.test(s) &&
      /this\.buildHorizonRanges\(\)/.test(s)],
    ['summit weather includes rain and mist',
      /SUMMIT_WEATHER_POOL[\s\S]{0,220}'mist'[\s\S]{0,80}'rain'/.test(s)],
    ['card set keyed by kind (not opts.kind)', /this\.cardSets\[kind\]/.test(s)],
    ['summit landmark asset is module-relative',
      /SUMMIT_LANDMARKS_SRC\s*=\s*new URL\([^\n]+import\.meta\.url\)/.test(s)],
  ];
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) failures++;
  }
});

// 3. behaviour --------------------------------------------------------------
step(3, 'summit state machine', () => {
  const out = execFileSync(process.execPath, ['tools/summit_test.mjs'], {
    cwd: ROOT, encoding: 'utf8',
  });
  const summary = out.trim().split(/\r?\n/);
  console.log('  ' + summary[summary.length - 1]);
  if (!/0 failed/.test(summary[summary.length - 1])) failures++;
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

console.log(failures
  ? `\n${failures} check(s) FAILED\n`
  : '\nAll checks passed\n');
process.exit(failures ? 1 : 0);
