#!/usr/bin/env node
// Summit golden, headless (BUILD_GUIDE_FABLE.md §11 S1.1): runs
// tools/summit_golden.html through tools/headless.mjs and compares the classic
// summit (objects, colliders, platforms, stream draws, terrain and perch
// sightline lattices, instance state) with tools/golden/summit_classic.json.
// It also runs `node tools/summit_test.mjs` and compares its whole output,
// line for line, with tools/golden/summit_test.txt.
//
//   node tools/summit_golden.mjs                compare; exit 0 equal, 1 different, 2 could not run
//                                               (2 also when the routing self-test did not run)
//   node tools/summit_golden.mjs --write        regenerate both goldens from this checkout
//   node tools/summit_golden.mjs --out /tmp/summit.json    also save the fresh digest
//
// Needs Playwright outside the repo (PLAYWRIGHT_MODULE, see tools/headless.mjs)
// and network for three.js from unpkg. No GPU work: the page never renders.
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = '/tools/summit_golden.html';
const DEFAULT_GOLDEN = path.join(ROOT, 'tools', 'golden', 'summit_classic.json');
const TEST_GOLDEN = path.join(ROOT, 'tools', 'golden', 'summit_test.txt');

const USAGE = `Usage: node tools/summit_golden.mjs [options]

Builds the classic summit headlessly (tools/summit_golden.html) and compares
its digest with tools/golden/summit_classic.json, then compares the output of
node tools/summit_test.mjs with tools/golden/summit_test.txt.

  --write             regenerate both goldens from this checkout (exit 0)
  --out <file>        also write the fresh digest to <file>
  --golden <file>     compare with (or --write) another digest golden inside the repo
  --no-test           skip the summit_test.mjs comparison
  --max <n>           changes to list, default 25
  --json              print the page's whole result (diff included) as JSON
  --gpu metal|swiftshader   browser backend (default: metal on macOS)
  --timeout <s>       whole-run budget, default 180
  --console           stream the page's console to stderr

Exit: 0 equal (or written), 1 different, 2 could not run (no golden, page error,
the routing self-test did not run, Playwright missing), 64 bad arguments.
`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { max: 25, timeout: 180 };
  const takes = new Set(['out', 'golden', 'max', 'gpu', 'timeout']);
  const flags = new Set(['write', 'json', 'console', 'help', 'no-test']);
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

function pagePath(goldenFile, max) {
  const qs = [`max=${max}`];
  if (goldenFile !== DEFAULT_GOLDEN) {
    const rel = path.relative(ROOT, goldenFile);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new UsageError(`--golden must be inside ${ROOT} (the page fetches it)`);
    qs.push('golden=' + encodeURIComponent('/' + rel.split(path.sep).join('/')).replace(/%2F/g, '/'));
  }
  return PAGE + '?' + qs.join('&');
}

/** Run node tools/summit_test.mjs; resolve { code, stdout, stderr }. */
function runSummitTest() {
  return new Promise((resolve) => {
    execFile(process.execPath, [path.join('tools', 'summit_test.mjs')], { cwd: ROOT, encoding: 'utf8', timeout: 120000 },
      (error, stdout, stderr) => resolve({ code: error ? (error.code ?? 1) : 0, stdout: stdout || '', stderr: stderr || '' }));
  });
}

/** First differing line of two texts, or null. */
function firstDiff(a, b) {
  const la = a.split('\n'), lb = b.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) return { line: i + 1, golden: la[i], fresh: lb[i] };
  }
  return null;
}

const kb = (n) => `${Number(n).toLocaleString('en-US')} bytes`;

/** The routing test's per-frame drive (fix round 1): throws, portal, perch and fūrin per build. */
function driveLine(d) {
  if (!d) return 'update() drive not run';
  const one = (k) => {
    const x = d[k];
    if (!x || !x.ran) return `${k} not run`;
    return `${k} ${x.throws} throws, portal ${x.portal ? 'ok' : 'SHUT'}, perch ${x.scenic ? 'ok' : 'NO VIEW'}, fūrin ${x.chimes}`;
  };
  return `update() on classic and kit stand-ins: ${['classic', 'modular', 'bare'].map(one).join('; ')}; ` +
    `bind warnings ${d.bindWarnings}/${d.boundFields} (bare)`;
}
const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;

function printSummary(r, run, test, { write, out, goldenFile, max }) {
  const rel = (f) => path.relative(process.cwd(), f) || f;
  const c = r.counts, p = r.previewCounts;
  const d = r.diff;
  let state;
  if (write) state = 'WROTE';
  else if (!r.golden.found) state = 'NO GOLDEN';
  else state = r.equal && (!test || test.equal) ? 'EQUAL' : 'DIFFERENT';
  if (!write && r.routing && r.routing.ran && !r.routing.ok) state += ', ROUTING FAILED';
  if (!write && (!r.routing || !r.routing.ran)) state += ', ROUTING NOT RUN';
  const lines = [];
  lines.push(`summit golden: ${state}${d && !write && !r.equal ? ` (${d.counts.changed} changed, ${d.counts.added} added, ${d.counts.removed} removed)` : ''}`);
  lines.push(`  page     ${run.url}${run.gpu ? '   [' + run.gpu.replace(/^ANGLE \((.*)\)$/, '$1') + ']' : ''}`);
  if (r.golden.found) {
    lines.push(`  golden   ${rel(goldenFile)}  ${kb(r.golden.bytes)}${r.golden.textEqual ? ', byte-identical to this build' : ''}`);
  } else {
    const why = r.golden.status === 404 ? 'missing' : `unusable: ${r.golden.error}`;
    lines.push(`  golden   ${rel(goldenFile)}  ${why}${write ? '' : ' (write it with --write)'}`);
  }
  lines.push(`  digest   ${kb(r.digestBytes)}${out ? ' → ' + rel(out) : ''}${write ? ' → ' + rel(goldenFile) : ''}`);
  lines.push(`  counts   ${c.objects} objects · ${c.aggregates} aggregates (${c.members} members) · ${c.colliders} colliders · ` +
    `${c.platforms} platforms · ${c.state} state fields · ${c.api} methods`);
  lines.push(`  preview  ${p.objects} objects · ${p.members} members · ${p.draws} draws`);
  lines.push(`  rng      summit ${c.draws} draws (probe ${r.probe ? 'ok' : 'FAILED'}) · Math.random ${r.ambient.draws}` +
    ` · volatile ${r.volatile.leaves} leaves, ${r.volatile.members} members`);
  lines.push(`  loads    ${(r.loads || []).join(', ') || 'none'}`);
  const g = r.routing;
  if (g && g.ran) {
    lines.push(`  routing  ${g.ok ? 'ok' : 'FAILED'}: ${g.ids} summit ids, ${g.classicCalls} classic placeAsset() calls; ` +
      `all modular ${g.allModular.kit}/${g.allModular.calls} stand-ins, ${g.allModular.draws} draws (probe ${g.allModular.probe ? 'ok' : 'FAILED'}); ` +
      `single swaps ${g.singles.ok}/${g.singles.of} ok (${secs(g.ms)})`);
    lines.push(`  drive    ${driveLine(g.drive)}`);
    for (const p of g.problems || []) lines.push(`  routing  ${p}`);
  } else {
    lines.push(`  routing  not run: ${(g && g.problems || ['the page reported no routing result']).join('; ')}`);
  }
  if (test) {
    const tail = test.summary ? `"${test.summary}"` : 'no summary line';
    if (write) lines.push(`  test     summit_test.mjs ${tail} → ${rel(TEST_GOLDEN)}`);
    else if (!test.found) lines.push(`  test     summit_test.mjs ${tail}; ${rel(TEST_GOLDEN)} missing (write it with --write)`);
    else if (test.equal) lines.push(`  test     summit_test.mjs ${tail}, output identical to ${rel(TEST_GOLDEN)} (${test.lines} lines)`);
    else lines.push(`  test     summit_test.mjs ${tail}, output DIFFERS from ${rel(TEST_GOLDEN)} at line ${test.diff.line}:`,
      `             golden: ${JSON.stringify(test.diff.golden)}`, `             fresh:  ${JSON.stringify(test.diff.fresh)}`);
  }
  lines.push(`  time     build ${r.timing.buildMs.join(' + ')} ms · page ${secs(r.timing.totalMs)} · run ${secs(run.ms)}`);
  for (const w of r.warnings || []) lines.push(`  warning  ${w}`);
  for (const e of run.errors || []) lines.push(`  console  ${e}`);
  if (d && d.equal && d.advisory.count && !write) {
    lines.push(`  note     advisory differences in ${d.advisory.count} ${d.advisory.count === 1 ? 'entry' : 'entries'}; not part of the verdict (--write refreshes them)`);
    for (const w of d.where || []) lines.push(`           ${w}`);
    for (const it of d.advisory.items.slice(0, 12)) lines.push(`           ${it.op} ${it.path}`);
  }
  if (d && !d.equal && !write) {
    lines.push('');
    for (const w of d.where || []) lines.push(`  ${w}`);
    if ((d.where || []).length) lines.push('');
    lines.push('  section'.padEnd(24) + 'added'.padStart(7) + 'removed'.padStart(9) + 'changed'.padStart(9));
    for (const [s, n] of Object.entries(d.sections)) {
      lines.push(('  ' + s).padEnd(24) + String(n.added).padStart(7) + String(n.removed).padStart(9) + String(n.changed).padStart(9));
    }
    lines.push('');
    for (const it of d.items.slice(0, max)) {
      if (it.op === '~') {
        lines.push(`  ~ ${it.path}${it.note ? '   ' + it.note : ''}`);
        lines.push(`      ${it.from}  →  ${it.to}`);
      } else {
        lines.push(`  ${it.op} ${it.path}   ${it.op === '+' ? it.to : it.from}`);
      }
    }
    const total = d.counts.added + d.counts.removed + d.counts.changed;
    if (total > max) lines.push(`  … ${total - max} more (--max N to list more, --json for everything${d.truncated ? '; the page keeps the first 2000' : ''})`);
  }
  process.stdout.write(lines.join('\n') + '\n');
}

async function main(argv) {
  let opts;
  try { opts = parseArgs(argv); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`summit_golden: ${error.message}\n\n${USAGE}`);
    return 64;
  }
  if (opts.help) { process.stdout.write(USAGE); return 0; }

  const goldenFile = opts.golden ? path.resolve(opts.golden) : DEFAULT_GOLDEN;
  const out = opts.out ? path.resolve(opts.out) : null;
  let page;
  try { page = pagePath(goldenFile, opts.max); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`summit_golden: ${error.message}\n`);
    return 64;
  }

  let runPage;
  try { ({ runPage } = await import('./headless.mjs')); } catch (error) {
    process.stderr.write(`summit_golden: tools/headless.mjs did not load (${error.message.split('\n')[0]}).\n` +
      'It is the shared headless runner from Phase 0 (fable/p0-browser).\n');
    return 2;
  }

  const testRun = opts['no-test'] ? null : runSummitTest();
  const needText = !!(opts.write || out);
  const expr = `(() => { const f = window.__summitGolden || {}; const { digestText, ...rest } = f;` +
    ` return ${needText} ? Object.assign(rest, { digestText }) : rest; })()`;
  const run = await runPage(page, {
    root: ROOT, wait: 'window.__summitGolden && window.__summitGolden.done', eval: expr,
    timeout: opts.timeout, gpu: opts.gpu, console: !!opts.console,
    // The page reports a missing golden itself; the browser's 404 line is noise.
    ignore: [/Failed to load resource: .*404.*\.json/]
  });
  const r = run.value;
  if (!run.ok || !r) {
    process.stdout.write(`summit golden: COULD NOT RUN\n  page     ${run.url}\n  error    ${run.error || 'no result from the page'}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }
  if (!r.ok) {
    process.stdout.write(`summit golden: PAGE FAILED\n  page     ${run.url}\n  error    ${String(r.error).split('\n').slice(0, 6).join('\n           ')}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }

  let test = null;
  if (testRun) {
    const t = await testRun;
    const text = t.stdout + (t.stderr ? t.stderr : '');
    const summary = (text.trim().split('\n').filter((l) => /passed, \d+ failed/.test(l)).pop() || '').trim();
    test = { code: t.code, text, summary, found: false, equal: false, lines: text.split('\n').length - 1 };
    let gold = null;
    try { gold = await readFile(TEST_GOLDEN, 'utf8'); test.found = true; } catch { gold = null; }
    if (gold !== null) {
      test.equal = gold === text;
      if (!test.equal) test.diff = firstDiff(gold, text);
    }
  }

  if (out) {
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, r.digestText);
  }
  if (opts.write) {
    await mkdir(path.dirname(goldenFile), { recursive: true });
    await writeFile(goldenFile, r.digestText);
    if (test) await writeFile(TEST_GOLDEN, test.text);
  }
  if (opts.json) {
    const { digestText, ...rest } = r;
    process.stdout.write(JSON.stringify({ ...rest, test, run: { url: run.url, ms: run.ms, gpu: run.gpu, errors: run.errors } }, null, 1) + '\n');
  } else {
    printSummary(r, run, test, { write: !!opts.write, out, goldenFile, max: opts.max });
  }
  if (opts.write) return test && test.code !== 0 ? 1 : 0;
  if (!r.golden.found || (test && !test.found)) return 2;
  // The routing self-test is part of the verdict: not run is "could not run".
  if (!r.routing || !r.routing.ran) return 2;
  return r.equal && r.routing.ok && (!test || (test.equal && test.code === 0)) ? 0 : 1;
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 3000).unref(); // never hang on a stray handle
}, (error) => {
  process.stdout.write(`summit golden: COULD NOT RUN\n  error    ${String(error && error.stack || error)}\n`);
  process.exit(2);
});
