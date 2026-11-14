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
//   node tools/footprint_golden.mjs --systems      the systems golden (tools/golden/systems_classic.json, F3.3)
//
// --write only writes a golden from a run it can trust: no --query (unless
// --golden names another file), the rng probe ok, three.js UUID draws kept
// apart from Math.random(), and no page warning or console error.
//
// Needs Playwright outside the repo (PLAYWRIGHT_MODULE, see tools/headless.mjs)
// and network for three.js from unpkg. No GPU work: the page never renders.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = '/tools/footprint_golden.html';
const DEFAULT_GOLDEN = path.join(ROOT, 'tools', 'golden', 'valley_classic.json');
const SYSTEMS_GOLDEN = path.join(ROOT, 'tools', 'golden', 'systems_classic.json');

const USAGE = `Usage: node tools/footprint_golden.mjs [options]

Builds the classic valley headlessly (tools/footprint_golden.html) and compares
its digest with tools/golden/valley_classic.json.

  --write             regenerate the golden from this checkout. Refused (exit 2) when
                      --query is set without --golden, or when the run is not
                      trustworthy: rng probe failed, three.js UUID draws not kept
                      apart from Math.random(), any page warning or console error
  --systems           the systems golden instead: interior, hidden places, vegetation,
                      particles, ambient life (tools/golden/systems_classic.json)
  --query "<flags>"   page flags, passed through (e.g. "?assets=modular&swap=torii:modular");
                      flags the page does not know are ignored
  --out <file>        also write the fresh digest to <file>
  --golden <file>     compare with (or --write) another golden inside the repo
  --max <n>           changes to list, default 25
  --json              print the page's whole result (diff and verdict included) as JSON
  --gpu metal|swiftshader   browser backend (default: metal on macOS)
  --timeout <s>       whole-run budget, default 180
  --console           stream the page's console to stderr
  -h, --help          this text

Exit: 0 equal (or written); 1 different; 2 could not run or compare (no or
unusable golden, page error, Playwright missing), rng probe failed (even when
the digest is equal), or --write refused; 64 bad arguments.

Examples:
  node tools/footprint_golden.mjs
  node tools/footprint_golden.mjs --max 60
  node tools/footprint_golden.mjs --write
  node tools/footprint_golden.mjs --query "?assets=modular" --out /tmp/modular.json
  node tools/footprint_golden.mjs --query "?assets=modular" --golden tools/golden/valley_modular.json --write
`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { max: 25, timeout: 180 };
  const takes = new Set(['query', 'out', 'golden', 'max', 'gpu', 'timeout']);
  const flags = new Set(['write', 'json', 'console', 'help', 'systems']);
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

/** --query without its leading ? or &, or '' when there is none. */
const normalizeQuery = (query) => String(query || '').trim().replace(/^[?&]+/, '');

/** The page path with --query passed through verbatim, plus golden= when another golden is used. */
function pagePath(query, goldenFile) {
  let qs = normalizeQuery(query);
  if (goldenFile !== DEFAULT_GOLDEN) {
    const rel = path.relative(ROOT, goldenFile);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new UsageError(`--golden must be inside ${ROOT} (the page fetches it)`);
    qs += (qs ? '&' : '') + 'golden=' + encodeURIComponent('/' + rel.split(path.sep).join('/')).replace(/%2F/g, '/');
  }
  return PAGE + (qs ? '?' + qs : '');
}

const kb = (n) => `${(Number(n) / 1000).toFixed(1)} kB`;
const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;

/** What a finished run means: { state, code, reasons }. */
function verdict(r, run, write) {
  if (write) {
    // A golden is only written from a run that can be trusted.
    const reasons = [];
    if (!r.probe) reasons.push('the rng probe failed: the counted valley draws do not match the stream position');
    if (!r.ambient || r.ambient.uuidSeparated !== true) reasons.push('three.js UUID draws were not kept apart from Math.random()');
    for (const w of r.warnings || []) reasons.push(`page warning: ${w}`);
    for (const e of run.errors || []) reasons.push(`page console error: ${e}`);
    return reasons.length ? { state: 'WRITE REFUSED', code: 2, reasons } : { state: 'WROTE', code: 0, reasons };
  }
  if (!r.golden.found) {
    return { state: 'NO GOLDEN', code: 2, reasons: [r.golden.status === 404 ? 'the golden file is missing (write it with --write)' : `the golden is unusable: ${r.golden.error}`] };
  }
  if (!r.diff) return { state: 'COULD NOT COMPARE', code: 2, reasons: [`the comparison failed: ${r.golden.error || 'the page returned no diff'}`] };
  if (!r.probe) {
    return { state: 'PROBE FAILED', code: 2, reasons: [`the rng probe failed: the counted valley draws do not match the stream position (the digest is ${r.equal ? 'equal' : 'different'})`] };
  }
  // --systems: the modular-path seam check runs beside the digest (tools/golden/systems_digest.js)
  if (r.seam && r.seam.ok === false) return { state: 'SEAM FAILED', code: 1, reasons: (r.seam.failures || []).slice(0, 8) };
  return { state: r.equal ? 'EQUAL' : 'DIFFERENT', code: r.equal ? 0 : 1, reasons: [] };
}

function printSummary(r, run, v, { out, goldenFile, max }) {
  const rel = (f) => path.relative(process.cwd(), f) || f;
  const c = r.counts;
  const d = r.diff;
  const wrote = v.state === 'WROTE';
  const writing = wrote || v.state === 'WRITE REFUSED';
  const lines = [];
  lines.push(`footprint golden: ${v.state}${d && !writing && !d.equal ? ` (${d.counts.changed} changed, ${d.counts.added} added, ${d.counts.removed} removed)` : ''}`);
  for (const reason of v.reasons) lines.push(`  reason   ${reason}`);
  lines.push(`  page     ${run.url}${run.gpu ? '   [' + run.gpu.replace(/^ANGLE \((.*)\)$/, '$1') + ']' : ''}`);
  if (r.golden.found) {
    lines.push(`  golden   ${rel(goldenFile)}  ${kb(r.golden.bytes)}${r.golden.textEqual ? ', byte-identical to this build' : ''}`);
  } else {
    lines.push(`  golden   ${rel(goldenFile)}  ${r.golden.status === 404 ? 'missing' : 'unusable'}`);
  }
  lines.push(`  digest   ${kb(r.digestBytes)}${out ? ' → ' + rel(out) : ''}${wrote ? ' → ' + rel(goldenFile) : ''}`);
  lines.push(`  counts   ${c.objects} objects · ${c.aggregates} aggregates (${c.members} members) · ${c.baked} baked · ` +
    `${c.colliders} colliders · ${c.platforms} platforms · ${c.waterRects} water rects · ${c.exclusions} exclusions · ${r.anchors} anchors`);
  if (r.rngLine) lines.push(`  rng      ${r.rngLine}`);
  else lines.push(`  rng      valley ${c.draws} draws (probe ${r.probe ? 'ok' : 'FAILED'}) · hidden ${r.hiddenDraws} · Math.random ${r.ambient.draws}` +
    ` · volatile ${r.volatile.leaves} leaves, ${r.volatile.members} members`);
  if (r.seam) {
    lines.push(`  seam     ${r.seam.skipped ? 'skipped: ' + r.seam.skipped : `${r.seam.ok ? 'ok' : 'FAILED'} · ${r.seam.ids} ids routed · classic updates ${r.seam.classicUpdates}`}`);
    for (const [k, run] of Object.entries(r.seam.runs || {})) lines.push(`           ${k}: ${run.placed} instances · registries ${run.registries} · updates ${run.updates} · canopies freed ${run.canopiesFreed}`);
  }
  lines.push(`  time     build ${r.timing.buildMs.join(' + ')} ms · page ${secs(r.timing.totalMs)} · run ${secs(run.ms)}`);
  if (!v.state.startsWith('WRITE')) {
    for (const w of r.warnings || []) lines.push(`  warning  ${w}`);
    for (const e of run.errors || []) lines.push(`  console  ${e}`);
  }
  if (d && d.equal && d.advisory.count && !writing) {
    lines.push(`  note     builder attribution differs in ${d.advisory.count} ${d.advisory.count === 1 ? 'entry' : 'entries'}; not part of the verdict (--write refreshes it)`);
    for (const w of d.where || []) lines.push(`           ${w}`);
  }
  if (d && !d.equal && !writing) {
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

  const goldenFile = opts.golden ? path.resolve(opts.golden) : opts.systems ? SYSTEMS_GOLDEN : DEFAULT_GOLDEN;
  const out = opts.out ? path.resolve(opts.out) : null;
  let page;
  const pageQuery = [opts.systems ? 'systems=1' : '', normalizeQuery(opts.query)].filter(Boolean).join('&');
  try { page = pagePath(pageQuery, goldenFile); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`footprint_golden: ${error.message}\n`);
    return 64;
  }

  // A run with page flags (?assets=modular …) never overwrites the classic golden.
  const query = normalizeQuery(opts.query);
  if (opts.write && query && !opts.golden) {
    const reason = `--query is set ("${query}"): a run with page flags does not overwrite the classic golden;` +
      ' pass --golden <file> to write its digest to another file';
    if (opts.json) process.stdout.write(JSON.stringify({ verdict: { state: 'WRITE REFUSED', code: 2, reasons: [reason] } }, null, 1) + '\n');
    else process.stdout.write(`footprint golden: WRITE REFUSED\n  reason   ${reason}\n`);
    return 2;
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

  const v = verdict(r, run, !!opts.write);
  if (out) {
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, r.digestText);
  }
  if (v.state === 'WROTE') {
    await mkdir(path.dirname(goldenFile), { recursive: true });
    await writeFile(goldenFile, r.digestText);
  }
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
  process.stdout.write(`footprint golden: COULD NOT RUN\n  error    ${String(error && error.stack || error)}\n`);
  process.exit(2);
});
