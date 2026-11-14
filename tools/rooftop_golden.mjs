#!/usr/bin/env node
// Rooftop golden, headless (BUILD_GUIDE_FABLE.md §12 R1.4): runs
// tools/rooftop_golden.html through tools/headless.mjs and compares the Roof
// Road's built world (every piece's meshes and world bounds, lights, merged
// batches, moving pieces, materials, update() samples) and its platforms,
// walls and ceilings with tools/golden/rooftop_classic.json.
//
//   node tools/rooftop_golden.mjs                compare; exit 0 equal, 1 different, 2 could not run
//   node tools/rooftop_golden.mjs --write        regenerate the golden from this checkout
//   node tools/rooftop_golden.mjs --query "assets=modular"     the same world on the modular set
//   node tools/rooftop_golden.mjs --out /tmp/roof.json         also save the fresh digest
//
// --write only writes from a run it can trust: no --query (unless --golden
// names another file), both builds identical, every piece attributed, and no
// page warning or console error.
//
// Needs Playwright outside the repo (PLAYWRIGHT_MODULE, see tools/headless.mjs)
// and network for three.js from unpkg. No GPU work: the page never renders.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = '/tools/rooftop_golden.html';
const DEFAULT_GOLDEN = path.join(ROOT, 'tools', 'golden', 'rooftop_classic.json');

const USAGE = `Usage: node tools/rooftop_golden.mjs [options]

Builds the Roof Road headlessly (tools/rooftop_golden.html) and compares its
digest with tools/golden/rooftop_classic.json.

  --write             regenerate the golden from this checkout. Refused (exit 2) when
                      --query is set without --golden, or when the run is not
                      trustworthy: the two builds differ, a piece was not attributed,
                      any page warning or console error
  --query "<flags>"   page flags, passed through (e.g. "assets=modular" or
                      "swap=roof-machiya:modular"); the Roof Road's AssetRuntime reads them
  --out <file>        also write the fresh digest to <file>
  --golden <file>     compare with (or --write) another golden inside the repo
  --max <n>           changes to list, default 25
  --json              print the page's whole result (diff included) as JSON
  --gpu metal|swiftshader   browser backend (default: metal on macOS)
  --timeout <s>       whole-run budget, default 240
  --console           stream the page's console to stderr
  -h, --help          this text

Exit: 0 equal (or written); 1 different; 2 could not run or compare (no or
unusable golden, page error, Playwright missing) or --write refused; 64 bad arguments.
`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { max: 25, timeout: 240 };
  const takes = new Set(['query', 'out', 'golden', 'max', 'gpu', 'timeout']);
  const flags = new Set(['write', 'json', 'console', 'help']);
  for (let i = 0; i < argv.length; i++) {
    let name = argv[i], value;
    if (name === '-h') { opts.help = true; continue; }
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

const normalizeQuery = (query) => String(query || '').trim().replace(/^[?&]+/, '');

function pagePath(query, goldenFile, max) {
  const qs = [normalizeQuery(query), `max=${max}`].filter(Boolean);
  if (goldenFile !== DEFAULT_GOLDEN) {
    const rel = path.relative(ROOT, goldenFile);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new UsageError(`--golden must be inside ${ROOT} (the page fetches it)`);
    qs.push('golden=' + encodeURIComponent('/' + rel.split(path.sep).join('/')).replace(/%2F/g, '/'));
  }
  return PAGE + '?' + qs.join('&');
}

const kb = (n) => `${(Number(n) / 1000).toFixed(1)} kB`;
const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;

function verdict(r, run, write) {
  if (write) {
    const reasons = [];
    for (const w of r.warnings || []) reasons.push(`page warning: ${w}`);
    for (const e of run.errors || []) reasons.push(`page console error: ${e}`);
    if (r.counts.emptyPieces) reasons.push(`${r.counts.emptyPieces} pieces added nothing to the world (attribution failed)`);
    return reasons.length ? { state: 'WRITE REFUSED', code: 2, reasons } : { state: 'WROTE', code: 0, reasons };
  }
  if (!r.golden.found) {
    return { state: 'NO GOLDEN', code: 2, reasons: [r.golden.status === 404 ? 'the golden file is missing (write it with --write)' : `the golden is unusable: ${r.golden.error}`] };
  }
  if (!r.diff) return { state: 'COULD NOT COMPARE', code: 2, reasons: ['the page returned no diff'] };
  const reasons = (r.warnings || []).map((w) => `page warning: ${w}`);
  if (r.equal && reasons.length) return { state: 'EQUAL, WITH WARNINGS', code: 1, reasons };
  return { state: r.equal ? 'EQUAL' : 'DIFFERENT', code: r.equal ? 0 : 1, reasons };
}

function printSummary(r, run, v, { out, goldenFile, max }) {
  const rel = (f) => path.relative(process.cwd(), f) || f;
  const c = r.counts, d = r.diff, a = r.assets;
  const writing = v.state.startsWith('WRO') || v.state === 'WRITE REFUSED';
  const lines = [];
  lines.push(`rooftop golden: ${v.state}${d && !writing && !d.equal ? ` (${d.counts.changed} changed, ${d.counts.added} added, ${d.counts.removed} removed)` : ''}`);
  for (const reason of v.reasons) lines.push(`  reason   ${reason}`);
  lines.push(`  page     ${run.url}${run.gpu ? '   [' + run.gpu.replace(/^ANGLE \((.*)\)$/, '$1') + ']' : ''}`);
  if (r.golden.found) lines.push(`  golden   ${rel(goldenFile)}  ${kb(r.golden.bytes)}${r.golden.textEqual ? ', byte-identical to this build' : ''}`);
  else lines.push(`  golden   ${rel(goldenFile)}  ${r.golden.status === 404 ? 'missing' : 'unusable'}`);
  lines.push(`  digest   ${kb(r.digestBytes)}${out ? ' → ' + rel(out) : ''}${v.state === 'WROTE' ? ' → ' + rel(goldenFile) : ''}`);
  lines.push(`  counts   ${c.pieces} pieces (${c.adds} adds, ${c.emptyPieces} empty) · ${c.platforms} platforms · ${c.walls} walls · ${c.ceilings} ceilings · ` +
    `${c.lights} lights · ${c.root} root children · ${c.batches} batches (${c.vertices} vertices) · ${c.materials} materials`);
  lines.push(`  assets   set ${a.set} (chosen ${a.chosen}${a.explicit ? ', from ?assets=' : ''}, quality ${a.quality}) · swaps ${JSON.stringify(a.swaps)} · ` +
    `kit ${a.loaded ? 'loaded' : 'not loaded'}, ${a.assets.length} kit ids, ${a.instances} instances${a.problems.length ? ' · problems: ' + a.problems.join('; ') : ''}`);
  lines.push(`  random   ${r.ambient.draws} Math.random draws (three.js UUIDs; seeded)`);
  lines.push(`  time     build ${r.timing.buildMs.join(' + ')} ms · page ${secs(r.timing.totalMs)} · run ${secs(run.ms)}`);
  if (!writing) for (const e of run.errors || []) lines.push(`  console  ${e}`);
  if (d && !d.equal && !writing) {
    lines.push('');
    for (const w of d.where || []) lines.push(`  ${w}`);
    if ((d.where || []).length) lines.push('');
    lines.push('  section'.padEnd(18) + 'added'.padStart(7) + 'removed'.padStart(9) + 'changed'.padStart(9));
    for (const [s, n] of Object.entries(d.sections)) {
      lines.push(('  ' + s).padEnd(18) + String(n.added).padStart(7) + String(n.removed).padStart(9) + String(n.changed).padStart(9));
    }
    lines.push('');
    const cut = (s) => (s && s.length > 400 ? s.slice(0, 400) + '…' : s);
    for (const it of d.items.slice(0, max)) {
      if (it.op === '~') { lines.push(`  ~ ${it.path}`); lines.push(`      ${cut(it.from)}`); lines.push(`   →  ${cut(it.to)}`); }
      else lines.push(`  ${it.op} ${it.path}   ${cut(it.op === '+' ? it.to : it.from)}`);
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
    process.stderr.write(`rooftop_golden: ${error.message}\n\n${USAGE}`);
    return 64;
  }
  if (opts.help) { process.stdout.write(USAGE); return 0; }

  const goldenFile = opts.golden ? path.resolve(opts.golden) : DEFAULT_GOLDEN;
  const out = opts.out ? path.resolve(opts.out) : null;
  const query = normalizeQuery(opts.query);
  let page;
  try { page = pagePath(query, goldenFile, opts.max); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`rooftop_golden: ${error.message}\n`);
    return 64;
  }
  if (opts.write && query && !opts.golden) {
    const reason = `--query is set ("${query}"): a run with page flags does not overwrite the classic golden; pass --golden <file>`;
    process.stdout.write(opts.json ? JSON.stringify({ verdict: { state: 'WRITE REFUSED', code: 2, reasons: [reason] } }) + '\n' : `rooftop golden: WRITE REFUSED\n  reason   ${reason}\n`);
    return 2;
  }

  let runPage;
  try { ({ runPage } = await import('./headless.mjs')); } catch (error) {
    process.stderr.write(`rooftop_golden: tools/headless.mjs did not load (${error.message.split('\n')[0]}).\n`);
    return 2;
  }

  const needText = !!(opts.write || out);
  const expr = `(() => { const f = window.__rooftopGolden || {}; const { digestText, ...rest } = f;` +
    ` return ${needText} ? Object.assign(rest, { digestText }) : rest; })()`;
  const run = await runPage(page, {
    root: ROOT, wait: 'window.__rooftopGolden && window.__rooftopGolden.done', eval: expr,
    timeout: opts.timeout, gpu: opts.gpu, console: !!opts.console,
    // The page reports a missing golden itself; the browser's 404 line is noise.
    ignore: [/Failed to load resource: .*404.*\.json/]
  });
  const r = run.value;
  if (!run.ok || !r) {
    process.stdout.write(`rooftop golden: COULD NOT RUN\n  page     ${run.url}\n  error    ${run.error || 'no result from the page'}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }
  if (!r.ok) {
    process.stdout.write(`rooftop golden: PAGE FAILED\n  page     ${run.url}\n  error    ${String(r.error).split('\n').slice(0, 6).join('\n           ')}\n`);
    for (const e of run.errors || []) process.stdout.write(`  console  ${e}\n`);
    return 2;
  }

  const v = verdict(r, run, !!opts.write);
  if (out) { await mkdir(path.dirname(out), { recursive: true }); await writeFile(out, r.digestText); }
  if (v.state === 'WROTE') { await mkdir(path.dirname(goldenFile), { recursive: true }); await writeFile(goldenFile, r.digestText); }
  if (opts.json) {
    const { digestText, ...rest } = r;
    process.stdout.write(JSON.stringify({ ...rest, verdict: v, run: { url: run.url, ms: run.ms, gpu: run.gpu, errors: run.errors } }, null, 1) + '\n');
  } else {
    printSummary(r, run, v, { out, goldenFile, max: opts.max });
  }
  return v.code;
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 3000).unref(); // never hang on a stray handle
}, (error) => {
  process.stdout.write(`rooftop golden: COULD NOT RUN\n  error    ${String(error && error.stack || error)}\n`);
  process.exit(2);
});
