#!/usr/bin/env node
// Boot the real game headlessly and save one frame (BUILD_GUIDE_FABLE F1.12).
//
//   node tools/game_shot.mjs --query "hour=10.5&cam=0,4,-6,0,1,0&nohud=1&shot=1&assets=classic" --out x.png
//   node tools/game_shot.mjs --diff a.png b.png [--out diff.png]
//
// Options
//   --query "<flags>"     the game's URL query (see src/main.js: ?hour= ?cam=px,py,pz,tx,ty,tz[,fov]
//                         ?nohud=1 ?shot=1 ?weather= ?assets=classic|modular|auto ?swap=id:set,…)
//   --out <file.png|jpg>  the frame (PNG for diffs, JPG for sharing)
//   --size WxH            viewport, default 1280x720
//   --frames N            rendered frames to wait for before the shot, default 120 (2 s of ?shot=1 time)
//   --settle <ms>         extra sleep after the frame count, default 0
//   --timeout <s>         whole-run budget, default 600 (the world takes 15–20 min under SwiftShader)
//   --gpu metal|swiftshader   default: metal on macOS
//   --console             stream the page console to stderr
//   --json                print the summary as one JSON line only
//
// Boots as /__boot.html does (sessionStorage catwalk_autostart=new) so the
// cat is in the valley, not on the title screen. Waits until
// window.game.capture.frame ≥ N: with ?shot=1 that is the same world frame on
// every boot, so two shots with the same flags diff at the noise floor.
// The summary records the kit runtime's summary() and renderer.info.
// Uses tools/headless.mjs (shared Phase 0 runner; Playwright outside the repo).
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback = null) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : fallback; };
const flag = (name) => args.includes('--' + name);

if (flag('help') || flag('h') || (!flag('diff') && !opt('out'))) {
  console.log(`usage:
  node tools/game_shot.mjs --query "<flags>" --out x.png [--size 1280x720] [--frames 120] [--timeout 600] [--gpu metal]
  node tools/game_shot.mjs --diff a.png b.png [--out diff.png]`);
  process.exit(flag('help') || flag('h') ? 0 : 64);
}
if (!existsSync(join(HERE, 'headless.mjs'))) {
  console.error('tools/headless.mjs is missing — it is the shared headless runner from lane p0-browser (fable/integration after Phase 0).');
  process.exit(2);
}
const headless = await import('./headless.mjs');

if (flag('diff')) {
  const i = args.indexOf('--diff');
  const a = args[i + 1], b = args[i + 2];
  if (!a || !b) { console.error('--diff wants two images'); process.exit(64); }
  const d = await headless.diffImages(resolve(a), resolve(b), { out: opt('out') ? resolve(opt('out')) : undefined });
  console.log(JSON.stringify({ a, b, ...d }));
  process.exit(0);
}

const query = String(opt('query', '')).replace(/^\?/, '');
const out = resolve(opt('out'));
const frames = Number(opt('frames', 120));
const settle = Number(opt('settle', 0));
const timeout = Number(opt('timeout', 600));
const t0 = Date.now();
let session;
const summary = { ok: false, out, query, frames, size: opt('size', '1280x720') };
try {
  session = await headless.openPage('/index.html' + (query ? '?' + query : ''), {
    size: opt('size', '1280x720'),
    gpu: opt('gpu') || undefined,
    session: { catwalk_autostart: 'new' },
    timeout,
    console: flag('console')
  });
  const { page } = session;
  const deadline = t0 + timeout * 1000;
  await headless.waitForExpression(page, `window.game && window.game.capture && window.game.capture.frame >= ${frames}`, deadline, 200);
  if (settle > 0) await new Promise((r) => setTimeout(r, settle));
  summary.frame = await page.evaluate('window.game.capture.frame');
  summary.assets = await page.evaluate('window.game.assets.summary()');
  summary.render = await page.evaluate('({ calls: game.renderer.info.render.calls, triangles: game.renderer.info.render.triangles, geometries: game.renderer.info.memory.geometries, textures: game.renderer.info.memory.textures })');
  summary.world = await page.evaluate('({ hour: game.sky.dayTime, weather: game.sky.weather, quality: game.settings.resolveQuality(), mode: game.menu.mode, cat: game.player.mesh.position.toArray().map((v) => +v.toFixed(3)), cam: game.camera.position.toArray().map((v) => +v.toFixed(3)) })');
  await page.screenshot({ path: out, type: /\.jpe?g$/i.test(out) ? 'jpeg' : 'png', ...(/\.jpe?g$/i.test(out) ? { quality: 85 } : {}), caret: 'hide' });
  summary.gpu = await headless.gpuInfo(session.browser).catch(() => null);
  summary.errors = session.errors;
  summary.warnings = session.warnings;
  summary.ok = true;
} catch (error) {
  summary.error = String(error && error.message || error);
  summary.errors = session ? session.errors : [];
  summary.warnings = session ? session.warnings : [];
} finally {
  summary.ms = Date.now() - t0;
  await session?.close();
}
if (flag('json')) console.log(JSON.stringify(summary));
else {
  if (summary.ok) {
    console.log(`shot ${out} after ${summary.frame} frames (${summary.ms} ms, gpu: ${summary.gpu})`);
    console.log(`world: ${JSON.stringify(summary.world)}`);
    console.log(`assets: set=${summary.assets.set} chosen=${summary.assets.chosen} loaded=${summary.assets.loaded} assets=${summary.assets.assets.length} instances=${summary.assets.instances} swaps=${JSON.stringify(summary.assets.swaps)}`);
    console.log(`render: ${JSON.stringify(summary.render)}`);
  } else console.log(`FAILED: ${summary.error} (${summary.ms} ms)`);
  if (summary.errors?.length) console.log('page errors: ' + summary.errors.join(' | '));
  if (summary.warnings?.length) console.log('page warnings: ' + summary.warnings.join(' | '));
}
process.exit(summary.ok ? 0 : 2);
