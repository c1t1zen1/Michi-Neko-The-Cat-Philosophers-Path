#!/usr/bin/env node
// P0.4 baseline captures: every review sheet (town, hidden, tree, cat,
// summit) and the Roof Road mouths + finale, as lossless PNG masters (kept
// outside the repo), small JPG previews (in the repo), a SHA-256 per master,
// and a second, fresh capture of every sheet diffed against the first: the
// noise floor that later "matches Phase 0" claims are judged against.
//
//   node tools/capture_baseline.mjs --masters ../_baseline [--previews docs/fable/baseline/captures]
//     [--only town,cat/face] [--no-repeat] [--compare <old masters dir>] [--out captures.json]
//
// Later lanes: capture into a new --masters dir and pass --compare with the
// Phase 0 masters; each row then carries maxDelta/meanDelta/pixelsOver8
// against Phase 0, next to that sheet's Phase 0 noise floor in captures.md.
// Each page is waited on by its own ready signal (read from its JS), never a
// fixed sleep. Uses tools/headless.mjs; changes no game file.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_GPU, REPO_ROOT, gpuInfo, openImageTool, openPage, waitForExpression } from './headless.mjs';

// How each page says "rendered" (see the page's .js).
export const READY = {
  // town_preview.js / hidden_preview.js render every cell synchronously, then write #log.
  town: "document.getElementById('log')?.textContent.startsWith('town')",
  hidden: "document.getElementById('log')?.textContent.startsWith('hidden places')",
  // tree_preview.js / cat_preview.js set document.title = 'ready' after the last cell.
  tree: "document.title === 'ready'",
  cat: "document.title === 'ready'",
  // summit_preview.js runs a live rAF loop: setup is done when window.previewView
  // is set; the optional Blender roofscape GLB loads async into summit.vistaLandmarks.
  summit: "window.previewView !== undefined && !!window.game?.summit?.vistaLandmarks",
  // rooftops/js/game.js exposes window.roofRoad; catReady turns true once the cat has loaded.
  rooftops: '!!window.roofRoad?.catReady',
  // grass_preview.js sheet mode draws the four panels, then sets window.__ready.
  grass: 'window.__ready === true'
};

// The Roof Road finale is time-driven (five fires kindle over ~14 s). The
// documented console hook jumps to its end state; the page's own "stay"
// button then dismisses the card, as a player would, leaving the fires.
const FINALE = `(async () => {
  roofRoad.skipFinale();
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !roofRoad.finale?.shown; i++) await frame();
  document.getElementById('stay')?.click();
  return !!roofRoad.finale?.shown;
})()`;

/** Every Phase 0 capture: page, sheet name, exact URL, ready signal, frames to run after ready. */
export function captureList() {
  const list = [];
  const add = (page, sheet, url, extra = {}) => list.push({ page, sheet, url, wait: READY[page], frames: 2, ...extra });
  const variants = (names, flags) => names.flatMap((s) => flags.map(([v, q]) => [v ? `${s}-${v}` : s, s, q]));
  for (const [name, s, q] of variants(['street', 'landmarks', 'props'], [['', ''], ['golden', '&golden=1'], ['night', '&night=1']])) {
    add('town', name, `/tools/town_preview.html?sheet=${s}${q}`);
  }
  for (const s of ['pool', 'glade', 'both']) add('hidden', s, `/tools/hidden_preview.html?sheet=${s}`); // day + night in every sheet
  for (const [name, s, q] of variants(['hero', 'detail', 'rim', 'bush', 'compare', 'thicket', 'textures'], [['', ''], ['golden', '&golden=1']])) {
    add('tree', name, `/tools/tree_preview.html?sheet=${s}${q}`);
  }
  for (const [name, s, q] of variants(['anatomy', 'face', 'coat', 'gait', 'stride', 'poses', 'sleep', 'closeup', 'npcs'], [['', ''], ['golden', '&golden=1']])) {
    add('cat', name, `/tools/cat_preview.html?sheet=${s}${q}`);
  }
  for (const v of ['meditation', 'arrival', 'approach-front', 'approach-side', 'meadow-gate', 'edge-left', 'edge-right', 'edge-sheet']) {
    add('summit', v, `/tools/summit_preview.html?view=${v}`, { frames: 90 });
  }
  for (let m = 1; m <= 7; m++) add('rooftops', `mouth-${m}`, `/kyoto-rooftops.html?mouth=${m}&shot=1&nohud=1`, { frames: 90 });
  add('rooftops', 'finale', '/kyoto-rooftops.html?finale=1&shot=1&nohud=1', { frames: 90, action: FINALE });
  // Extra to the P0.4 list: Appendix C (G4) also compares grass_preview with
  // Phase 0. The two 2×2 still sheets cover all eight spots at 10.5 h.
  add('grass', 'sheet-a', '/tools/grass_preview.html?spots=meadow,path,river,shrine');
  add('grass', 'sheet-b', '/tools/grass_preview.html?spots=glade,corral,pool,wide');
  return list;
}

const waitFrames = (page, n) => page.evaluate((count) => new Promise((resolve) => {
  let left = count;
  const tick = () => (--left <= 0 ? resolve(true) : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
}), n);

/** Open, wait for the page's ready signal, run its action, let `frames` frames pass, PNG. */
export async function captureOne(item, file, { size = '1200x750', gpu, timeout = 180 } = {}) {
  const t0 = Date.now();
  const session = await openPage(item.url, { size, gpu, timeout });
  try {
    await waitForExpression(session.page, item.wait, t0 + timeout * 1000);
    if (item.action) await session.page.evaluate(item.action);
    await waitFrames(session.page, item.frames);
    await mkdir(path.dirname(file), { recursive: true });
    await session.page.screenshot({ path: file, type: 'png', timeout: timeout * 1000 });
    return { ms: Date.now() - t0, errors: [...session.errors], warnings: [...session.warnings] };
  } finally {
    await session.close();
  }
}

const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');

async function preview(tool, master, file, maxBytes) {
  for (const quality of [80, 74, 68, 62, 56]) {
    const r = await tool.convert(master, file, { quality });
    if (r.bytes <= maxBytes || quality === 56) return { ...r, quality };
  }
}

const USAGE = `Usage: node tools/capture_baseline.mjs --masters <dir> [options]
  --masters <dir>        lossless PNG masters, <dir>/<page>/<sheet>.png (keep it outside the repo)
  --previews <dir|none>  JPG previews, default docs/fable/baseline/captures (<dir>/<page>/<sheet>.jpg)
  --only a,b/c           pages (town, hidden, tree, cat, summit, rooftops, grass) or page/sheet
  --no-repeat            skip the second capture (no noise floor)
  --compare <dir>        diff every new master against <dir>/<page>/<sheet>.png (e.g. the Phase 0 masters)
  --size WxH             default 1200x750;  --gpu metal|swiftshader (default ${DEFAULT_GPU});  --timeout s (default 180)
  --max-preview-kb N     preview size cap (default 250; quality steps down from 80)
  --out <file.json>      raw results (default <masters>/captures.json)
  --list                 print the capture list and exit
`;

async function main(argv) {
  const opts = { masters: null, previews: path.join(REPO_ROOT, 'docs/fable/baseline/captures'), only: null, repeat: true,
    compare: null, size: '1200x750', gpu: DEFAULT_GPU, timeout: 180, maxPreviewKb: 250, out: null, list: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    const value = () => (inline !== undefined ? inline : argv[++i]);
    switch (flag) {
      case '--masters': opts.masters = path.resolve(value()); break;
      case '--previews': { const v = value(); opts.previews = v === 'none' ? null : path.resolve(v); break; }
      case '--only': opts.only = value().split(',').filter(Boolean); break;
      case '--no-repeat': opts.repeat = false; break;
      case '--compare': opts.compare = path.resolve(value()); break;
      case '--size': opts.size = value(); break;
      case '--gpu': opts.gpu = value(); break;
      case '--timeout': opts.timeout = Number(value()); break;
      case '--max-preview-kb': opts.maxPreviewKb = Number(value()); break;
      case '--out': opts.out = path.resolve(value()); break;
      case '--list': opts.list = true; break;
      case '--help': case '-h': process.stdout.write(USAGE); return 0;
      default: process.stderr.write(`capture_baseline: unknown option ${argv[i]}\n\n${USAGE}`); return 64;
    }
  }
  let items = captureList();
  if (opts.only) items = items.filter((it) => opts.only.some((o) => o === it.page || o === `${it.page}/${it.sheet}`));
  if (opts.list) { for (const it of items) process.stdout.write(`${it.page}/${it.sheet}  ${it.url}\n`); return 0; }
  if (!opts.masters) { process.stderr.write(`capture_baseline: --masters is required\n\n${USAGE}`); return 64; }
  if (!items.length) { process.stderr.write('capture_baseline: --only matched nothing\n'); return 64; }
  const log = (line) => process.stderr.write(line + '\n');
  const started = Date.now();
  const rows = [];

  // Pass 1: masters. Pass 2: a fresh capture of everything again (noise floor).
  for (const item of items) {
    const master = path.join(opts.masters, item.page, `${item.sheet}.png`);
    const run = await captureOne(item, master, opts);
    rows.push({ ...item, wait: undefined, action: item.action ? 'roofRoad.skipFinale(); click #stay' : undefined,
      size: opts.size, master, ms: run.ms, errors: run.errors, warnings: run.warnings });
    log(`captured ${item.page}/${item.sheet} in ${run.ms} ms${run.errors.length ? ` — errors: ${run.errors.join(' | ')}` : ''}`);
  }
  if (opts.repeat) {
    for (const row of rows) {
      row.repeatFile = path.join(opts.masters, '_repeat', row.page, `${row.sheet}.png`);
      const run = await captureOne(items.find((it) => it.page === row.page && it.sheet === row.sheet), row.repeatFile, opts);
      row.repeatMs = run.ms;
      log(`repeated ${row.page}/${row.sheet} in ${run.ms} ms`);
    }
  }

  const tool = await openImageTool();
  try {
    for (const row of rows) {
      row.sha256 = await sha256(row.master);
      row.bytes = (await stat(row.master)).size;
      if (row.repeatFile) {
        const d = await tool.diff(row.master, row.repeatFile, { out: path.join(opts.masters, '_diff', row.page, `${row.sheet}.png`) });
        row.repeat = { maxDelta: d.maxDelta, meanDelta: d.meanDelta, pixelsOver8: d.pixelsOver8, identical: (await sha256(row.repeatFile)) === row.sha256 };
      }
      if (opts.compare) {
        const old = path.join(opts.compare, row.page, `${row.sheet}.png`);
        row.compare = existsSync(old) ? await tool.diff(old, row.master, { out: path.join(opts.masters, '_compare', row.page, `${row.sheet}.png`) })
          : { missing: old };
      }
      if (opts.previews) {
        const file = path.join(opts.previews, row.page, `${row.sheet}.jpg`);
        const p = await preview(tool, row.master, file, opts.maxPreviewKb * 1024);
        row.preview = { file, bytes: p.bytes, quality: p.quality };
      }
    }
  } finally { await tool.close(); }

  // Browser + GPU strings for the record.
  const probe = await openPage('/tools/labs_geometry_test.html', { gpu: opts.gpu, size: opts.size, timeout: 60 });
  let browser, gpuRenderer;
  try { browser = `Chromium ${probe.browser.version()} (Playwright headless)`; gpuRenderer = await gpuInfo(probe.browser); }
  finally { await probe.close(); }

  const result = { tool: 'tools/capture_baseline.mjs', date: new Date(started).toISOString(), minutes: Math.round((Date.now() - started) / 600) / 100,
    browser, gpuRenderer, options: opts, captures: rows };
  const out = opts.out || path.join(opts.masters, 'captures.json');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(result, null, 2) + '\n');

  const rel = (file) => (file && file.startsWith(REPO_ROOT + path.sep) ? path.relative(REPO_ROOT, file) : file);
  const lines = [
    `Masters: ${opts.masters} · ${browser} · ${gpuRenderer} · ${opts.size}`, '',
    '| Page | Sheet | URL | Size | Master | SHA-256 (master) | Preview | Repeat maxΔ / meanΔ / px>8 |' + (opts.compare ? ' vs --compare maxΔ / meanΔ / px>8 |' : ''),
    '|---|---|---|---|---|---|---|---|' + (opts.compare ? '---|' : '')
  ];
  for (const r of rows) {
    const rep = r.repeat ? `${r.repeat.maxDelta} / ${r.repeat.meanDelta} / ${r.repeat.pixelsOver8}${r.repeat.identical ? ' (identical)' : ''}` : '—';
    const cmp = opts.compare ? (r.compare?.missing ? ' missing |' : ` ${r.compare.maxDelta} / ${r.compare.meanDelta} / ${r.compare.pixelsOver8} |`) : '';
    lines.push(`| ${r.page} | ${r.sheet} | \`${r.url}\` | ${r.size} | \`${path.relative(opts.masters, r.master)}\` | \`${r.sha256}\` | ` +
      `${r.preview ? `\`${rel(r.preview.file)}\` (${Math.round(r.preview.bytes / 1024)} KB, q${r.preview.quality})` : '—'} | ${rep} |${cmp}`);
  }
  process.stdout.write(lines.join('\n') + '\n');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => {
    process.stderr.write(`capture_baseline: ${error?.stack || error}\n`);
    process.exitCode = 2;
  });
}
