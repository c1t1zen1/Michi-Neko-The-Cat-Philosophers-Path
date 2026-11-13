#!/usr/bin/env node
// Runs tools/kit_contract_test.html headlessly through tools/headless.mjs
// (the shared Phase 0 runner) and prints the result.
//
//   node tools/kit_contract_test.mjs [--family <name>] [--asset <id>] [--no-merge]
//                                    [--no-selftest] [--gpu metal|swiftshader]
//                                    [--shot out.png] [--json] [--timeout <s>]
//
// Exit 0 when the page reports PASS, 1 when it reports FAIL, 2 when the run
// itself failed (no Playwright, page error, timeout).
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback = null) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : fallback; };
const flag = (name) => args.includes('--' + name);

if (flag('help') || flag('h')) {
  console.log('usage: node tools/kit_contract_test.mjs [--family <name>] [--asset <id>] [--no-merge] [--no-selftest] [--gpu metal|swiftshader] [--shot out.png] [--json] [--timeout <s>]');
  process.exit(0);
}
if (!existsSync(join(HERE, 'headless.mjs'))) {
  console.error('tools/headless.mjs is missing — it is the shared headless runner from lane p0-browser (fable/integration after Phase 0).');
  process.exit(2);
}
const { runPage } = await import('./headless.mjs');

const query = new URLSearchParams();
if (opt('family')) query.set('family', opt('family'));
if (opt('asset')) query.set('asset', opt('asset'));
if (flag('no-merge')) query.set('merge', '0');
if (flag('no-selftest')) query.set('selftest', '0');
const page = '/tools/kit_contract_test.html' + (query.toString() ? '?' + query : '');

const run = await runPage(page, {
  wait: 'window.__contractResults',
  eval: 'window.__contractResults',
  shot: opt('shot'),
  gpu: opt('gpu') || undefined,
  timeout: Number(opt('timeout', 300)),
  console: flag('console'),
  size: '1200x900'
});

if (!run.ok || !run.value) {
  console.error(`kit contract test did not complete: ${run.error || 'no results'}`);
  for (const e of run.errors || []) console.error('  page error: ' + e);
  process.exit(2);
}
const r = run.value;
if (flag('json')) console.log(JSON.stringify({ ok: r.ok, assets: r.assets, tiers: r.tiers, checks: r.checks.length, failed: r.failed, merge: r.merge, selftest: r.selftest, families: r.families, budgets: r.budgets, gpu: run.gpu, ms: run.ms, errors: run.errors, warnings: run.warnings, problems: r.problems }));
else {
  console.log(`${r.assets} assets, ${r.tiers} asset×tier builds, ${r.checks.length} checks, ${r.failed} failed (gpu: ${run.gpu}, ${run.ms} ms)`);
  for (const c of r.checks.filter((c) => !c.pass)) console.log(`  FAIL ${c.asset} [${c.tier}] ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
  if (r.merge) console.log(`merge: ${r.merge.ok ? 'OK' : 'FAIL'} — valley ${r.merge.valleyCalls} calls; +48 kit meshes → ${r.merge.callsBefore}; after _mergeInto → ${r.merge.callsAfter} (${r.merge.bakedKitMeshes} baked kit meshes)${r.merge.error ? ' ' + r.merge.error : ''}`);
  if (r.selftest) {
    console.log(`self-test: ${r.selftest.ok ? 'OK' : 'FAIL'}`);
    for (const c of r.selftest.cases) console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.knob.padEnd(16)} → ${c.failing.join('; ') || 'nothing failed'}`);
  }
  console.log(`budgets: ${r.budgets.status} (${r.budgets.file})`);
  if (run.errors?.length) console.log('page errors: ' + run.errors.join(' | '));
  console.log(r.ok ? 'PASS: kit contract' : 'FAIL: kit contract');
}
process.exit(r.ok ? 0 : 1);
