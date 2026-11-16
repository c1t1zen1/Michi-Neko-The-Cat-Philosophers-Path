#!/usr/bin/env node
// Hero capture tool (BUILD_GUIDE_FABLE H1.1): real frames from the game for the README.
//
//   node tools/hero_capture.mjs --list
//   node tools/hero_capture.mjs                       # every shot in docs/images/hero/shots.json
//   node tools/hero_capture.mjs --only title-valley-golden-hour,moon-pool-night
//   node tools/hero_capture.mjs --only <id> --preview # 1600x900 look-see into the scratch dir, no JPG written
//   node tools/hero_capture.mjs --diff <id>           # shoot <id> twice, report maxDelta (needs nothing committed)
//
// Every shot is one entry of docs/images/hero/shots.json:
//   { id, file, title, kind, page, cam, hour, weather, season, assets, width, height, query, frames, eval, settle, ... }
// kinds:
//   game      /index.html through the autostart boot (as tools/game_shot.mjs does): ?hour= ?cam= ?weather= ?assets=
//             ?nohud=1 ?shot=1 (fixed 1/60 s step, seeded randomness), frozen at frame `frames` (?hold=) unless `eval` is set
//   summit    /tools/summit_preview.html (the real SummitManager; its clock is wall time, so repeats differ in
//             cloud and pollen drift but not in composition)
//   rooftops  /kyoto-rooftops.html (?at= ?hour= ?finale=1 ?shot=1 ?nohud=1; wall-time loops, same caveat)
//   sheet     a review sheet page (tools/cat_preview.html?sheet=npcs): labelled as a review-sheet capture
// `eval` (optional) runs in the page after the wait (game kind: at frame `evalAt`, default 5) and `after` runs once the `settle` time has passed, just before the screenshot; `wait` overrides the readiness test.
// Real frames only: nothing is painted over or composited (decision D8). The one exception is the parts sheet,
// which is a real game frame of an asset's named parts moved apart by `eval` (labelled in docs/images/README.md).
//
// Output: masters (PNG, width x height, default 2560x1440) go OUTSIDE the repo (--masters, default
// ../_scratch/h1-hero/masters beside the worktree); the committed JPGs (1600 px wide, quality 80) go to docs/images/.
// Uses tools/headless.mjs (shared runner; Playwright outside the repo: export PLAYWRIGHT_MODULE=...).
import { readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const args = process.argv.slice(2);
const opt = (name, fallback = null) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : fallback; };
const flag = (name) => args.includes('--' + name);

if (flag('help') || flag('h')) {
  console.log(`usage: node tools/hero_capture.mjs [--list] [--only id,id] [--preview] [--diff id] [--masters dir] [--out dir]
                                    [--shots file] [--gpu metal|swiftshader] [--timeout s] [--jpeg-width 1600] [--quality 80]`);
  process.exit(0);
}

const shotsFile = resolve(opt('shots', join(REPO, 'docs/images/hero/shots.json')));
const spec = JSON.parse(readFileSync(shotsFile, 'utf8'));
const defaults = spec.defaults || {};
const shots = spec.shots.map((s) => ({ ...defaults, ...s }));

if (flag('list')) {
  for (const s of shots) console.log(`${s.id.padEnd(34)} ${String(s.kind).padEnd(9)} ${s.file}`);
  process.exit(0);
}

const only = (opt('only') || opt('diff') || '').split(',').filter(Boolean);
const chosen = only.length ? only.map((id) => shots.find((s) => s.id === id) || (console.error(`no shot "${id}" (try --list)`), process.exit(64))) : shots;
const preview = flag('preview');
const mastersDir = resolve(opt('masters', join(REPO, '..', '_scratch', 'h1-hero', 'masters')));
const outDir = resolve(opt('out', join(REPO, 'docs', 'images')));
const jpegWidth = Number(opt('jpeg-width', 1600));
const quality = Number(opt('quality', 80));
const timeout = Number(opt('timeout', 300));
const gpu = opt('gpu') || undefined;
const headless = await import('./headless.mjs');

const commit = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: REPO }).toString().trim(); } catch { return 'unknown'; } })();

function queryOf(s) {
  const q = [];
  const add = (k, v) => { if (v !== undefined && v !== null && v !== '') q.push(`${k}=${v}`); };
  if (s.kind === 'summit') {
    add('assets', s.assets); add('time', s.hour); add('weather', s.weather); add('quality', s.quality); add('speed', s.speed ?? 0);
    if (s.cam) add('cam', [].concat(s.cam).join(','));
    else add('view', s.view);
  } else if (s.kind === 'rooftops') {
    add('assets', s.assets); add('hour', s.hour); add('at', s.at); add('mouth', s.mouth);
    if (s.finale) q.push('finale=1');
    q.push('shot=1', 'nohud=1');
  } else if (s.kind === 'sheet') {
    add('sheet', s.sheet);
  } else {
    add('hour', s.hour); add('weather', s.weather); add('assets', s.assets);
    if (s.cam) add('cam', [].concat(s.cam).join(','));
    q.push('nohud=1');
    q.push('shot=1');
    if (s.season) add('season', s.season);
  }
  if (s.query) q.push(String(s.query).replace(/^&/, ''));
  return q.join('&');
}

const PAGES = { game: '/index.html', summit: '/tools/summit_preview.html', rooftops: '/kyoto-rooftops.html', sheet: '/tools/cat_preview.html' };
const READY = {
  game: (s) => `window.game && window.game.capture && window.game.capture.frame >= ${s.frames || 120}`,
  summit: () => 'window.previewView && window.game && window.game.summit',
  rooftops: () => 'window.roofRoad && window.roofRoad.catReady',
  sheet: () => "document.title === 'ready'"
};

async function shoot(s, png, size) {
  let query = queryOf(s);
  const frames = s.frames || 120;
  // A game frame is frozen at frame N (?hold=N) so the PNG is exactly that frame; `eval` then runs at frame `evalAt`
  // (default 5), early enough that the following frames settle it. `hold: false` keeps the loop running (interiors).
  const holds = s.kind === 'game' && s.hold !== false && /(^|&)shot=1(&|$)/.test(query) && !/(^|&)hold=/.test(query);
  if (holds) query += `&hold=${frames}`;
  const page = (s.page || PAGES[s.kind] || PAGES.game) + (query ? '?' + query : '');
  const t0 = Date.now();
  const session = await headless.openPage(page, {
    size, gpu, timeout,
    session: s.kind === 'game' ? { catwalk_autostart: 'new' } : {},
    ignore: [/cad-overrides\.json/]
  });
  try {
    const deadline = t0 + timeout * 1000;
    let value;
    if (s.eval && holds) {
      await headless.waitForExpression(session.page, `window.game && window.game.capture && window.game.capture.frame >= ${s.evalAt || 5}`, deadline, 100);
      value = await session.page.evaluate(s.eval);
    }
    await headless.waitForExpression(session.page, s.wait || READY[s.kind](s), deadline, 200);
    if (s.eval && !holds) value = await session.page.evaluate(s.eval);
    if (s.settle) await new Promise((r) => setTimeout(r, s.settle));
    if (s.after) { await session.page.evaluate(s.after); await new Promise((r) => setTimeout(r, 150)); }
    await session.page.screenshot({ path: png, type: 'png', caret: 'hide' });
    const info = s.kind === 'game' ? await session.page.evaluate('({ frame: game.capture.frame, set: game.assets.summary().set, hour: game.sky.dayTime, weather: game.sky.weather, quality: game.settings.resolveQuality() })').catch(() => null) : null;
    return { ms: Date.now() - t0, url: page, value, info, errors: session.errors };
  } finally {
    await session.close();
  }
}

// Downscale a PNG master to a README JPG in the browser (canvas, no dependencies).
async function toJpeg(tool, png, jpg) {
  const r = await tool.resize(png, jpg, jpegWidth, quality);
  return r;
}

async function openResizer() {
  const { loadPlaywright } = headless;
  const browser = await loadPlaywright().chromium.launch({ headless: true });
  const page = await browser.newPage();
  return {
    async resize(png, jpg, width, q) {
      const b64 = readFileSync(png).toString('base64');
      const out = await page.evaluate(async ({ b64, width, q }) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
        const w = Math.min(width, img.naturalWidth), h = Math.round(img.naturalHeight * (w / img.naturalWidth));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
        return { w, h, data: c.toDataURL('image/jpeg', q / 100).split(',')[1] };
      }, { b64, width, q });
      const buf = Buffer.from(out.data, 'base64');
      mkdirSync(dirname(jpg), { recursive: true });
      writeFileSync(jpg, buf);
      return { width: out.w, height: out.h, bytes: buf.length };
    },
    close: () => browser.close()
  };
}

mkdirSync(mastersDir, { recursive: true });
const results = [];
let resizer = null;
for (const s of chosen) {
  const size = preview ? '1600x900' : `${s.width || 2560}x${s.height || 1440}`;
  const png = join(mastersDir, `${s.id}${preview ? '.preview' : ''}.png`);
  process.stderr.write(`[hero] ${s.id} (${s.kind}, ${size}) ...\n`);
  try {
    if (flag('diff')) {
      const a = png.replace(/\.png$/, '.a.png'), b = png.replace(/\.png$/, '.b.png');
      await shoot(s, a, size); await shoot(s, b, size);
      const d = await headless.diffImages(a, b);
      console.log(JSON.stringify({ id: s.id, ...d }));
      continue;
    }
    const r = await shoot(s, png, size);
    const rec = { id: s.id, master: png, ms: r.ms, size, commit, info: r.info };
    if (r.value !== undefined) rec.value = r.value;
    if (r.errors?.length) rec.errors = r.errors;
    if (!preview) {
      resizer ||= await openResizer();
      const jpg = join(outDir, s.file);
      const j = await toJpeg(resizer, png, jpg);
      rec.jpg = jpg; rec.jpgSize = `${j.width}x${j.height}`; rec.bytes = j.bytes;
      if (j.bytes > 1_000_000) rec.warn = 'over 1 MB';
    }
    results.push(rec);
    console.log(JSON.stringify(rec));
  } catch (error) {
    results.push({ id: s.id, error: String(error?.message || error) });
    console.log(JSON.stringify({ id: s.id, error: String(error?.message || error) }));
  }
}
await resizer?.close();
if (results.some((r) => r.error)) process.exit(2);
