#!/usr/bin/env node
// Cat golden, headless (BUILD_GUIDE_FABLE.md §10, lane c1-rig-split, C1.4 and
// C1.5): runs tools/cat_golden.html through tools/headless.mjs and compares
// the Cat's numeric digest (construction order, scene graph, geometry,
// materials, textures, skeleton, fields, every review-sheet pose, scripted
// behaviour) with tools/golden/cat_classic.json. Also prints the CharacterDef
// contract checks the page runs once src/characters/ exists.
//
//   node tools/cat_golden.mjs            compare; exit 0 equal, 1 different (or a check failed), 2 could not run
//   node tools/cat_golden.mjs --write    regenerate the golden from this checkout
//   node tools/cat_golden.mjs --out /tmp/cat.json    also save the fresh digest
//
// Additions are allowed and listed, never silently: a new own field on a Cat,
// a new method on Cat.prototype, a new static or a new export of src/cat.js.
// Everything else must be equal. Needs Playwright outside the repo
// (PLAYWRIGHT_MODULE, see tools/headless.mjs) and network for three.js.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = '/tools/cat_golden.html';
const DEFAULT_GOLDEN = path.join(ROOT, 'tools', 'golden', 'cat_classic.json');

const USAGE = `Usage: node tools/cat_golden.mjs [options]

Builds real cats headlessly (tools/cat_golden.html) and compares their digest
with tools/golden/cat_classic.json.

  --write             regenerate the golden from this checkout (exit 0)
  --out <file>        also write the fresh digest to <file>
  --golden <file>     compare with (or --write) another golden file
  --root <dir>        serve another checkout (default: this repo)
  --max <n>           differences to list, default 25
  --json              print the result (differences and checks) as JSON
  --gpu metal|swiftshader   browser backend (default: metal on macOS)
  --timeout <s>       whole-run budget, default 180
  --console           stream the page's console to stderr

Exit: 0 equal (or written), 1 different or a contract check failed,
2 could not run, 64 bad arguments.
`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { max: 25, timeout: 180 };
  const takes = new Set(['out', 'golden', 'root', 'max', 'gpu', 'timeout']);
  const flags = new Set(['write', 'json', 'console', 'help']);
  for (let i = 0; i < argv.length; i++) {
    let name = argv[i], value;
    if (!name.startsWith('--')) throw new UsageError(`unexpected argument ${name}`);
    name = name.slice(2);
    const eq = name.indexOf('=');
    if (eq > 0) { value = name.slice(eq + 1); name = name.slice(0, eq); }
    if (name === 'h') name = 'help';
    if (flags.has(name)) {
      if (value !== undefined) throw new UsageError(`--${name} takes no value`);
      opts[name] = true;
    } else if (takes.has(name)) {
      if (value === undefined) {
        if (i + 1 >= argv.length) throw new UsageError(`--${name} needs a value`);
        value = argv[++i];
      }
      opts[name] = value;
    } else {
      throw new UsageError(`unknown option --${name}`);
    }
  }
  for (const k of ['max', 'timeout']) {
    const n = Number(opts[k]);
    if (!Number.isFinite(n) || n <= 0) throw new UsageError(`--${k} wants a positive number (got ${opts[k]})`);
    opts[k] = n;
  }
  if (opts.gpu && !['metal', 'swiftshader'].includes(opts.gpu)) throw new UsageError(`--gpu must be metal or swiftshader (got ${opts.gpu})`);
  return opts;
}

// ---------------------------------------------------------------------- diff

const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
function brief(v) {
  const s = JSON.stringify(v);
  return s === undefined ? 'undefined' : s.length > 140 ? s.slice(0, 137) + '…' : s;
}

// Additions that do not change what callers see: new own fields on a Cat,
// new methods / statics on the class.
const ALLOWED_ADDITION = [/^\.cats\[\d+\]\.fields\.[^.[]+$/, /^\.api\.prototype\.[^.[]+$/, /^\.api\.statics\.[^.[]+$/];

function diffValues(a, b, at, out) {
  if (a === b) return;
  const ka = kind(a), kb = kind(b);
  if (ka !== kb) { out.push({ op: '~', path: at, from: brief(a), to: brief(b) }); return; }
  if (ka === 'array') {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i >= b.length) out.push({ op: '-', path: `${at}[${i}]`, from: brief(a[i]) });
      else if (i >= a.length) out.push({ op: '+', path: `${at}[${i}]`, to: brief(b[i]) });
      else diffValues(a[i], b[i], `${at}[${i}]`, out);
    }
    return;
  }
  if (ka === 'object') {
    for (const k of Object.keys(a)) {
      if (!(k in b)) out.push({ op: '-', path: `${at}.${k}`, from: brief(a[k]) });
      else diffValues(a[k], b[k], `${at}.${k}`, out);
    }
    for (const k of Object.keys(b)) {
      if (k in a) continue;
      const p = `${at}.${k}`;
      out.push({ op: '+', path: p, to: brief(b[k]), allowed: ALLOWED_ADDITION.some((re) => re.test(p)) });
    }
    return;
  }
  out.push({ op: '~', path: at, from: brief(a), to: brief(b) });
}

/** Golden vs fresh: { equal, items, allowed } (exports compared as sets). */
export function compareDigests(golden, fresh) {
  const items = [];
  const g = structuredClone(golden), f = structuredClone(fresh);
  const ge = new Set(g.api?.exports || []), fe = new Set(f.api?.exports || []);
  for (const k of ge) if (!fe.has(k)) items.push({ op: '-', path: `.api.exports{${k}}`, from: k });
  for (const k of fe) if (!ge.has(k)) items.push({ op: '+', path: `.api.exports{${k}}`, to: k, allowed: true });
  if (g.api) delete g.api.exports;
  if (f.api) delete f.api.exports;
  diffValues(g, f, '', items);
  const allowed = items.filter((it) => it.allowed);
  const real = items.filter((it) => !it.allowed);
  return { equal: real.length === 0, items: real, allowed };
}

// ---------------------------------------------------------------------- main

async function main(argv) {
  let opts;
  try { opts = parseArgs(argv); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`cat_golden: ${error.message}\n\n${USAGE}`);
    return 64;
  }
  if (opts.help) { process.stdout.write(USAGE); return 0; }
  const goldenFile = opts.golden ? path.resolve(opts.golden) : DEFAULT_GOLDEN;
  const out = opts.out ? path.resolve(opts.out) : null;
  const root = opts.root ? path.resolve(opts.root) : ROOT;

  let runPage;
  try { ({ runPage } = await import('./headless.mjs')); } catch (error) {
    process.stderr.write(`cat_golden: tools/headless.mjs did not load (${error.message.split('\n')[0]}).\n` +
      'It is the shared headless runner from Phase 0 (fable/p0-browser).\n');
    return 2;
  }
  const run = await runPage(PAGE, {
    root, wait: 'window.__catGolden && window.__catGolden.done', eval: 'window.__catGolden',
    timeout: opts.timeout, gpu: opts.gpu, console: !!opts.console,
    // Before the split src/characters/ does not exist; the page reports that itself.
    ignore: [/Failed to load resource: .*404.*/]
  });
  const r = run.value;
  const rel = (f) => path.relative(process.cwd(), f) || f;
  if (!run.ok || !r) {
    process.stdout.write(`cat golden: COULD NOT RUN\n  page     ${run.url}\n  error    ${run.error || 'no result from the page'}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }
  if (!r.ok) {
    process.stdout.write(`cat golden: PAGE FAILED\n  page     ${run.url}\n  error    ${String(r.error).split('\n').slice(0, 8).join('\n           ')}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }
  if (out) { await mkdir(path.dirname(out), { recursive: true }); await writeFile(out, r.digestText); }
  if (opts.write) { await mkdir(path.dirname(goldenFile), { recursive: true }); await writeFile(goldenFile, r.digestText); }

  let goldenText = null;
  try { goldenText = await readFile(goldenFile, 'utf8'); } catch { /* reported below */ }
  const cmp = goldenText ? compareDigests(JSON.parse(goldenText), JSON.parse(r.digestText)) : null;
  const checks = r.checks || {};
  const failedChecks = checks.results ? checks.results.filter((x) => !x[1]) : [];

  if (opts.json) {
    process.stdout.write(JSON.stringify({ counts: r.counts, ms: r.ms, equal: cmp && cmp.equal, differences: cmp && cmp.items,
      allowed: cmp && cmp.allowed, checks, run: { url: run.url, ms: run.ms, gpu: run.gpu, errors: run.errors } }, null, 1) + '\n');
  } else {
    const c = r.counts;
    const state = opts.write ? 'WROTE' : !cmp ? 'NO GOLDEN' : cmp.equal ? 'EQUAL' : `DIFFERENT (${cmp.items.length} differences)`;
    const lines = [`cat golden: ${state}`];
    lines.push(`  page     ${run.url}${run.gpu ? '   [' + run.gpu.replace(/^ANGLE \((.*)\)$/, '$1') + ']' : ''}${root !== ROOT ? '   root ' + root : ''}`);
    lines.push(`  golden   ${rel(goldenFile)}${goldenText ? `  ${goldenText.length.toLocaleString('en-US')} bytes` +
      (goldenText === r.digestText ? ', byte-identical to this build' : '') : '  missing (write it with --write)'}`);
    lines.push(`  counts   ${c.cats} cats · ${c.poses} poses · ${c.samples} samples · ${c.geometries} geometries · ${c.materials} materials · ` +
      `${c.textures} textures · ${c.skeletons} skeletons · ${c.anatomies} sculpts · Math.random ${c.draws}`);
    lines.push(`  time     page ${(r.ms / 1000).toFixed(1)} s · run ${(run.ms / 1000).toFixed(1)} s`);
    for (const e of run.errors || []) lines.push(`  console  ${e}`);
    if (cmp && cmp.allowed.length) {
      lines.push(`  allowed  ${cmp.allowed.length} additions (new fields / methods / exports; not part of the verdict)`);
      const names = [...new Set(cmp.allowed.map((it) => it.path.replace(/^\.cats\[\d+\]/, '.cats[*]')))];
      for (const n of names.slice(0, opts.max)) lines.push(`           + ${n}`);
      if (names.length > opts.max) lines.push(`           … ${names.length - opts.max} more`);
    }
    if (cmp && !cmp.equal && !opts.write) {
      lines.push('');
      for (const it of cmp.items.slice(0, opts.max)) {
        if (it.op === '~') lines.push(`  ~ ${it.path}\n      ${it.from}  →  ${it.to}`);
        else lines.push(`  ${it.op} ${it.path}   ${it.op === '+' ? it.to : it.from}`);
      }
      if (cmp.items.length > opts.max) lines.push(`  … ${cmp.items.length - opts.max} more (--max N, or --json)`);
    }
    if (checks.skipped) lines.push(`  checks   skipped (${checks.skipped})`);
    else if (checks.results) {
      lines.push(`  checks   ${checks.passed} passed, ${checks.failed} failed`);
      for (const [name, ok, detail] of checks.results) if (!ok || opts.max > 100) lines.push(`    ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
    }
    process.stdout.write(lines.join('\n') + '\n');
  }
  if (opts.write) return failedChecks.length ? 1 : 0;
  if (!cmp) return 2;
  return cmp.equal && !failedChecks.length ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
    setTimeout(() => process.exit(code), 3000).unref(); // never hang on a stray handle
  }, (error) => {
    process.stdout.write(`cat golden: COULD NOT RUN\n  error    ${String(error && error.stack || error)}\n`);
    process.exit(2);
  });
}
