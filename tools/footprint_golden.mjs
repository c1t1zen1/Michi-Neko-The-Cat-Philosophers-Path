#!/usr/bin/env node
// Footprint golden, headless (BUILD_GUIDE_FABLE.md §8 F1.6, AAA-6): runs
// tools/footprint_golden.html through tools/headless.mjs and compares the
// classic valley's layout, colliders, platforms, exclusions and anchors with
// tools/golden/valley_classic.json.
//
//   node tools/footprint_golden.mjs                compare; exit 0 equal, 1 different, 2 could not run
//   node tools/footprint_golden.mjs --write        regenerate the golden from this checkout
//   node tools/footprint_golden.mjs --query "?assets=modular&swap=torii:modular"
//   node tools/footprint_golden.mjs --out /tmp/valley.json    also save the fresh digest
//
// Needs Playwright outside the repo (PLAYWRIGHT_MODULE, see tools/headless.mjs)
// and network for three.js from unpkg. No GPU work: the page never renders.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = '/tools/footprint_golden.html';
const DEFAULT_GOLDEN = path.join(ROOT, 'tools', 'golden', 'valley_classic.json');

const USAGE = `Usage: node tools/footprint_golden.mjs [options]

Builds the classic valley headlessly (tools/footprint_golden.html) and compares
its digest with tools/golden/valley_classic.json.

  --write             regenerate the golden from this checkout (exit 0)
  --query "<flags>"   page flags, passed through (e.g. "?assets=modular&swap=torii:modular");
                      flags the page does not know are ignored
  --out <file>        also write the fresh digest to <file>
  --golden <file>     compare with (or --write) another golden inside the repo
  --max <n>           changes to list, default 25
  --json              print the page's whole result (diff included) as JSON
  --gpu metal|swiftshader   browser backend (default: metal on macOS)
  --timeout <s>       whole-run budget, default 180
  --console           stream the page's console to stderr

Exit: 0 equal (or written), 1 different, 2 could not run (no golden, page error,
Playwright missing), 64 bad arguments.

Examples:
  node tools/footprint_golden.mjs
  node tools/footprint_golden.mjs --max 60
  node tools/footprint_golden.mjs --write
  node tools/footprint_golden.mjs --query "?assets=modular" --out /tmp/modular.json
`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { max: 25, timeout: 180 };
  const takes = new Set(['query', 'out', 'golden', 'max', 'gpu', 'timeout']);
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

/** The page path with --query passed through verbatim, plus golden= when another golden is used. */
function pagePath(query, goldenFile) {
  let qs = String(query || '').trim().replace(/^[?&]+/, '');
  if (goldenFile !== DEFAULT_GOLDEN) {
    const rel = path.relative(ROOT, goldenFile);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new UsageError(`--golden must be inside ${ROOT} (the page fetches it)`);
    qs += (qs ? '&' : '') + 'golden=' + encodeURIComponent('/' + rel.split(path.sep).join('/')).replace(/%2F/g, '/');
  }
  return PAGE + (qs ? '?' + qs : '');
}

const kb = (n) => `${Number(n).toLocaleString('en-US')} bytes`;
const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;

function printSummary(r, run, { write, out, goldenFile, max }) {
  const rel = (f) => path.relative(process.cwd(), f) || f;
  const c = r.counts;
  const d = r.diff;
  let state;
  if (write) state = 'WROTE';
  else if (!r.golden.found) state = 'NO GOLDEN';
  else state = r.equal ? 'EQUAL' : 'DIFFERENT';
  const lines = [];
  lines.push(`footprint golden: ${state}${d && !write && !r.equal ? ` (${d.counts.changed} changed, ${d.counts.added} added, ${d.counts.removed} removed)` : ''}`);
  lines.push(`  page     ${run.url}${run.gpu ? '   [' + run.gpu.replace(/^ANGLE \((.*)\)$/, '$1') + ']' : ''}`);
  if (r.golden.found) {
    lines.push(`  golden   ${rel(goldenFile)}  ${kb(r.golden.bytes)}${r.golden.textEqual ? ', byte-identical to this build' : ''}`);
  } else {
    const why = r.golden.status === 404 ? 'missing' : `unusable: ${r.golden.error}`;
    lines.push(`  golden   ${rel(goldenFile)}  ${why}${write ? '' : ' (write it with --write)'}`);
  }
  lines.push(`  digest   ${kb(r.digestBytes)}${out ? ' → ' + rel(out) : ''}${write ? ' → ' + rel(goldenFile) : ''}`);
  lines.push(`  counts   ${c.objects} objects · ${c.aggregates} aggregates (${c.members} members) · ${c.baked} baked · ` +
    `${c.colliders} colliders · ${c.platforms} platforms · ${c.waterRects} water rects · ${c.exclusions} exclusions · ${r.anchors} anchors`);
  lines.push(`  rng      valley ${c.draws} draws (probe ${r.probe ? 'ok' : 'FAILED'}) · hidden ${r.hiddenDraws} · Math.random ${r.ambient.draws}` +
    ` · volatile ${r.volatile.leaves} leaves, ${r.volatile.members} members`);
  lines.push(`  time     build ${r.timing.buildMs.join(' + ')} ms · page ${secs(r.timing.totalMs)} · run ${secs(run.ms)}`);
  for (const w of r.warnings || []) lines.push(`  warning  ${w}`);
  for (const e of run.errors || []) lines.push(`  console  ${e}`);
  if (d && d.equal && d.advisory.count && !write) {
    lines.push(`  note     builder attribution differs in ${d.advisory.count} ${d.advisory.count === 1 ? 'entry' : 'entries'}; not part of the verdict (--write refreshes it)`);
    for (const w of d.where || []) lines.push(`           ${w}`);
  }
  if (d && !d.equal && !write) {
    lines.push('');
    for (const w of d.where || []) lines.push(`  ${w}`);
    if ((d.where || []).length) lines.push('');
    lines.push('  section'.padEnd(18) + 'added'.padStart(7) + 'removed'.padStart(9) + 'changed'.padStart(9));
    for (const [s, n] of Object.entries(d.sections)) {
      lines.push(('  ' + s).padEnd(18) + String(n.added).padStart(7) + String(n.removed).padStart(9) + String(n.changed).padStart(9));
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
    process.stderr.write(`footprint_golden: ${error.message}\n\n${USAGE}`);
    return 64;
  }
  if (opts.help) { process.stdout.write(USAGE); return 0; }

  const goldenFile = opts.golden ? path.resolve(opts.golden) : DEFAULT_GOLDEN;
  const out = opts.out ? path.resolve(opts.out) : null;
  let page;
  try { page = pagePath(opts.query, goldenFile); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`footprint_golden: ${error.message}\n`);
    return 64;
  }

  let runPage;
  try { ({ runPage } = await import('./headless.mjs')); } catch (error) {
    process.stderr.write(`footprint_golden: tools/headless.mjs did not load (${error.message.split('\n')[0]}).\n` +
      'It is the shared headless runner from Phase 0 (fable/p0-browser).\n');
    return 2;
  }

  const needText = !!(opts.write || out);
  const expr = `(() => { const f = window.__footprint || {}; const { digestText, ...rest } = f;` +
    ` return ${needText} ? Object.assign(rest, { digestText }) : rest; })()`;
  const run = await runPage(page, {
    root: ROOT, wait: 'window.__footprint && window.__footprint.done', eval: expr,
    timeout: opts.timeout, gpu: opts.gpu, console: !!opts.console,
    // The page reports a missing golden itself; the browser's 404 line is noise.
    ignore: [/Failed to load resource: .*404.*\.json/]
  });
  const r = run.value;
  if (!run.ok || !r) {
    process.stdout.write(`footprint golden: COULD NOT RUN\n  page     ${run.url}\n  error    ${run.error || 'no result from the page'}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }
  if (!r.ok) {
    process.stdout.write(`footprint golden: PAGE FAILED\n  page     ${run.url}\n  error    ${String(r.error).split('\n').slice(0, 6).join('\n           ')}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }

  if (out) {
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, r.digestText);
  }
  if (opts.write) {
    await mkdir(path.dirname(goldenFile), { recursive: true });
    await writeFile(goldenFile, r.digestText);
  }
  if (opts.json) {
    const { digestText, ...rest } = r;
    process.stdout.write(JSON.stringify({ ...rest, run: { url: run.url, ms: run.ms, gpu: run.gpu, errors: run.errors } }, null, 1) + '\n');
  } else {
    printSummary(r, run, { write: !!opts.write, out, goldenFile, max: opts.max });
  }
  if (opts.write) return 0;
  if (!r.golden.found) return 2;
  return r.equal ? 0 : 1;
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 3000).unref(); // never hang on a stray handle
}, (error) => {
  process.stdout.write(`footprint golden: COULD NOT RUN\n  error    ${String(error && error.stack || error)}\n`);
  process.exit(2);
});
