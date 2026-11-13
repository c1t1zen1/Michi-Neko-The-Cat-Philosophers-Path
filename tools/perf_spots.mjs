#!/usr/bin/env node
// P0.3 perf baseline: boot the full game headlessly at each quality tier,
// put the cat (and its follow camera) on fixed spots, and measure frame time,
// draw calls, triangles and world build time. Rerun it for every later
// re-measure with the same spots, so numbers stay comparable:
//
//   node tools/perf_spots.mjs [--tiers low,medium,high] [--spots street,shrine,river,meadow]
//     [--boots 3] [--rounds 3] [--frames 240] [--warmup 3000] [--hour 10.5]
//     [--url-suffix "?assets=modular"] [--gpu metal|swiftshader] [--size 1200x750]
//     [--shots <dir>] --out <file.json>
//
// Prints a markdown table (and writes the raw numbers to --out). Uses
// tools/headless.mjs (Playwright outside the repo: PLAYWRIGHT_MODULE).
// Measures only; it changes no game file. In the page it pins the tier by
// saving it the way the settings menu does (localStorage), fixes the hour
// and clear weather, and switches off the adaptive resolution and the eco
// frame governor so each tier is measured as itself.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_GPU, gpuInfo, openPage, waitForExpression } from './headless.mjs';

// The cat's spot [x, z] in valley metres and its yaw (the follow camera sits
// 4.2 m behind and 2.4 m above, rotated by yaw; yaw 0 looks toward +z).
// Fixed here so every re-measure looks at the same thing.
export const SPOTS = {
  street: { cat: [0, 14], yaw: Math.PI, about: 'village street at the W3/E4 houses, looking up the lane to the torii' },
  shrine: { cat: [0, -19], yaw: Math.PI, about: 'torii approach, looking through the torii (z -22) to the shrine hall (z -32)' },
  river: { cat: [9, 28.2], yaw: -1.3, about: 'grass strip between the river and the paddies, east of the bridge, looking west along the water to the bridge (-1, 30.5)' },
  meadow: { cat: [-12, 12], yaw: 2.46, about: 'open meadow west of the street (the grass_preview "meadow" spot)' }
};
const TIERS = ['low', 'medium', 'high'];

// Timing hooks, installed before any page script. The Game constructor's
// first statement looks up #canvas; it ends by calling this.loop(), which
// renders the first frame synchronously.
const TIMING_HOOK = `(() => {
  if (window.__perf) return;
  const P = window.__perf = { t: {} };
  new MutationObserver((records, observer) => {
    const boot = document.getElementById('boot-screen');
    if (boot && boot.classList.contains('loading')) { P.t.engineStart ??= performance.now(); observer.disconnect(); }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  const getById = Document.prototype.getElementById;
  Document.prototype.getElementById = function (id) {
    if (id === 'canvas' && P.t.ctor === undefined) { P.t.ctor = performance.now(); Document.prototype.getElementById = getById; }
    return getById.call(this, id);
  };
  let game;
  Object.defineProperty(window, 'game', {
    configurable: true, enumerable: true,
    get: () => game,
    set(value) {
      game = value;
      if (!value || P.hooked || typeof value.loop !== 'function') return;
      P.hooked = true;
      const loop = Object.getPrototypeOf(value).loop;
      value.loop = function () {
        P.t.loop = performance.now();
        const result = loop.apply(this, arguments);
        P.t.firstFrame = performance.now();
        delete value.loop;
        return result;
      };
    }
  });
})();`;

// ------------------------------------------------------------ in the page ---

/** Fix the hour and weather, re-apply the tier, and freeze adaptive quality. */
function pinWorld({ hour }) {
  const g = window.game;
  g.sky.cycleSpeed = 0;
  g.sky.dayTime = hour;
  g.sky._palStamp = -1;
  g.sky.weatherTimer = 1e9;
  g.sky.weather = g.sky.previousWeather = g.sky.targetWeather = 'clear';
  g.sky.weatherBlend = 1;
  g.updateAdaptiveResolution = () => {};
  g.updateFrameGovernor = () => {};
  g.frameFloor = 0;
  g.applyQuality(); // back to the tier's own pixel ratio, stage 0, post strengths
  const r = g.renderer;
  return {
    quality: g.settings.resolveQuality(), stored: g.settings.values.quality,
    pixelRatio: r.getPixelRatio(), drawingBuffer: [r.domElement.width, r.domElement.height],
    msaa: g.composer.renderTarget1.samples, shadowMap: g.sky.sun.shadow.mapSize.x, shadowCadence: g.shadowCadence,
    bloom: g.bloom.enabled, ao: g.aoPass.enabled, perfStage: g.perfStage
  };
}

/** Put the cat on a spot and snap the follow camera behind it. */
function placeCat({ cat, yaw }) {
  const g = window.game, p = g.player;
  const y = g.city.groundAt ? g.city.groundAt(cat[0], cat[1]) : 0;
  p.mesh.position.set(cat[0], y, cat[1]);
  p.velocity.set(0, 0, 0);
  p.moveInput.set(0, 0);
  p.yaw = p.yawPrev = p.heading = yaw;
  p.pitch = 0;
  p.mesh.rotation.y = yaw;
  const off = p.cameraOffset;
  g.camera.position.set(cat[0] + off.x * Math.cos(yaw) + off.z * Math.sin(yaw), y + off.y,
    cat[1] - off.x * Math.sin(yaw) + off.z * Math.cos(yaw));
  return { x: cat[0], y: Math.round(y * 1000) / 1000, z: cat[1] };
}

/**
 * Rounds of `frames` real game frames. Each Game.loop() call (world update +
 * composer.render submission) is followed by a 1-pixel readPixels, so the
 * frame's GPU work is finished before the clock stops: frame = cpu + gpuWait.
 * Then a synced render-only timing. Headless Chromium paces
 * requestAnimationFrame at 60 Hz whatever the flags, so the rAF interval is
 * recorded but is not the frame time.
 */
async function measureFrames({ frames, rounds, warmup, renderReps }) {
  const g = window.game, r = g.renderer, info = r.info;
  const gl = r.getContext(), px = new Uint8Array(4);
  // The composer's last pass draws to the screen; setRenderTarget(null) keeps
  // three's state cache in step while the readback targets the default framebuffer.
  const sync = () => { r.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  const raf = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const t0 = performance.now();
  while (performance.now() - t0 < warmup) await raf();
  sync();
  const syncError = gl.getError();

  // WebGLRenderer.render is an own property in three r160 (set in the
  // constructor); Game.loop is a class method. Wrap both, restore both.
  const render = r.render, loopIsOwn = Object.prototype.hasOwnProperty.call(g, 'loop'), loop = g.loop;
  let main = { calls: 0, triangles: 0 };
  const samples = [];
  info.autoReset = false;
  r.render = function (scene, camera) {
    const c = info.render.calls, t = info.render.triangles;
    const out = render.call(this, scene, camera);
    if (scene === g.scene && camera === g.camera) { main.calls += info.render.calls - c; main.triangles += info.render.triangles - t; }
    return out;
  };
  g.loop = function () {
    info.reset();
    main = { calls: 0, triangles: 0 };
    const start = performance.now();
    loop.call(this);
    const submitted = performance.now();
    sync();
    samples.push({ start, cpu: submitted - start, gpuWait: performance.now() - submitted,
      calls: info.render.calls, triangles: info.render.triangles, mainCalls: main.calls, mainTriangles: main.triangles });
  };
  const out = [];
  try {
    for (let round = 0; round < rounds; round++) {
      samples.length = 0;
      const limit = performance.now() + 30000 + frames * 500;
      while (samples.length < frames + 1) {
        if (performance.now() > limit) throw new Error(`only ${samples.length} frames in round ${round + 1}: is the game loop throwing?`);
        await raf();
      }
      const s = samples.slice(1, frames + 1);
      out.push({
        frame: s.map((x) => x.cpu + x.gpuWait), cpu: s.map((x) => x.cpu), gpuWait: s.map((x) => x.gpuWait),
        interval: s.map((x, i) => x.start - samples[i].start),
        calls: s.map((x) => x.calls), triangles: s.map((x) => x.triangles),
        mainCalls: s.map((x) => x.mainCalls), mainTriangles: s.map((x) => x.mainTriangles)
      });
    }
  } finally {
    if (loopIsOwn) g.loop = loop; else delete g.loop;
    r.render = render;
    info.autoReset = true;
  }

  // Render-only: the composer chain back to back, synced with a 1-pixel
  // readback, at the tier's shadow cadence. No world update in between.
  let n = 0;
  const once = () => { if (++n % g.shadowCadence === 0) g.sky.sun.shadow.needsUpdate = true; g.composer.render(); };
  for (let i = 0; i < 4; i++) once();
  sync();
  const renderOnly = [];
  for (let k = 0; k < 5; k++) {
    const start = performance.now();
    for (let i = 0; i < renderReps; i++) once();
    sync();
    renderOnly.push((performance.now() - start) / renderReps);
  }
  return {
    rounds: out, render: renderOnly, syncError,
    memory: { geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs.length },
    adaptive: { pixelRatio: r.getPixelRatio(), perfStage: g.perfStage, frameFloor: g.frameFloor }
  };
}

/**
 * Per-asset cost of every classic asset that has an isolated original
 * adapter (catalog/js/asset-loader.mjs): triangles, draw calls and build
 * time. One warm build first (module + texture caches), then `reps` timed
 * builds; counts come from the warm build.
 */
async function measureAssets({ reps }) {
  const { loadCatalogAsset, getAssetCapabilities } = await import('/catalog/js/asset-loader.mjs');
  const inventory = await (await fetch('/labs/asset_inventory.json')).json();
  const rows = [];
  for (const asset of inventory.assets) {
    if (asset.lifecycle !== 'active' || !getAssetCapabilities(asset).original) continue;
    const row = { id: asset.id, group: asset.group, label: asset.label };
    try {
      const warm = await loadCatalogAsset(asset.id, { variant: 'original' });
      let triangles = 0, drawCalls = 0, meshes = 0, instances = 0;
      warm.group.updateMatrixWorld(true);
      warm.group.traverse((o) => {
        if (!o.visible || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
        const g = o.geometry, copies = o.isInstancedMesh ? o.count : 1;
        meshes++;
        instances += copies;
        drawCalls += Array.isArray(o.material) ? Math.max(1, g?.groups?.length || o.material.length) : 1;
        if (o.isMesh && g) triangles += ((g.index ? g.index.count : g.attributes.position?.count || 0) / 3) * copies;
      });
      warm.dispose();
      const times = [];
      for (let i = 0; i < reps; i++) {
        const start = performance.now();
        const built = await loadCatalogAsset(asset.id, { variant: 'original' });
        times.push(performance.now() - start);
        built.dispose();
      }
      times.sort((a, b) => a - b);
      Object.assign(row, { triangles: Math.round(triangles), drawCalls, meshes, instances, buildMs: Math.round(times[times.length >> 1] * 100) / 100,
        buildMsMin: Math.round(times[0] * 100) / 100, buildMsMax: Math.round(times[times.length - 1] * 100) / 100 });
    } catch (error) {
      row.error = String(error?.message || error).split('\n')[0];
    }
    rows.push(row);
  }
  return rows;
}

// --------------------------------------------------------------- in Node ---

const quantile = (values, q) => {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const median = (v) => quantile(v, 0.5);
const round = (v, d = 2) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const stats = (v, d = 2) => ({ median: round(median(v), d), p10: round(quantile(v, 0.1), d), p90: round(quantile(v, 0.9), d),
  min: round(Math.min(...v), d), max: round(Math.max(...v), d), n: v.length });

function machine() {
  const out = { platform: `${os.type()} ${os.release()} ${os.arch()}`, cpus: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / 2 ** 30), node: process.version };
  if (process.platform === 'darwin') {
    try {
      out.model = execFileSync('sysctl', ['-n', 'hw.model'], { encoding: 'utf8' }).trim();
      out.chip = execFileSync('sysctl', ['-n', 'machdep.cpu.brand_string'], { encoding: 'utf8' }).trim();
      out.macos = execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim();
    } catch { /* not fatal */ }
  } else out.chip = os.cpus()[0]?.model;
  return out;
}

async function bootOnce(tier, opts, log) {
  log(`${tier} boot ${opts.bootNo}: starting`);
  const session = await openPage('/index.html' + opts.urlSuffix, {
    size: opts.size, gpu: opts.gpu, timeout: opts.timeout, init: TIMING_HOOK,
    session: { catwalk_autostart: 'new' }, local: { catwalk_settings_v1: { quality: tier } }
  });
  const { page } = session;
  try {
    const deadline = Date.now() + opts.timeout * 1000;
    await waitForExpression(page, 'window.__perf?.t?.firstFrame !== undefined && window.game?.menu?.isPlaying', deadline);
    const t = await page.evaluate(() => window.__perf.t);
    const build = {
      worldReadyMs: round(t.firstFrame - t.ctor, 1), worldBuildMs: round(t.loop - t.ctor, 1),
      firstFrameMs: round(t.firstFrame - t.loop, 1), bootTotalMs: round(t.firstFrame - (t.engineStart ?? 0), 1),
      engineStartAtMs: round(t.engineStart, 1), ctorAtMs: round(t.ctor, 1)
    };
    const state = await page.evaluate(pinWorld, { hour: opts.hour });
    if (state.quality !== tier) throw new Error(`asked for ${tier}, the game resolved ${state.quality}`);
    const spots = {};
    for (const name of opts.spots) {
      const placed = await page.evaluate(placeCat, SPOTS[name]);
      const m = await page.evaluate(measureFrames, { frames: opts.frames, rounds: opts.rounds, warmup: opts.warmup, renderReps: 30 });
      const all = (key) => m.rounds.flatMap((r) => r[key]);
      spots[name] = {
        placed,
        frameMs: { ...stats(all('frame')), roundMedians: m.rounds.map((r) => round(median(r.frame))) },
        loopCpuMs: { ...stats(all('cpu')), roundMedians: m.rounds.map((r) => round(median(r.cpu))) },
        gpuWaitMs: stats(all('gpuWait')),
        rafIntervalMs: stats(all('interval')),
        renderMs: { ...stats(m.render, 3), reps: m.render.map((v) => round(v, 3)) },
        drawCalls: stats(all('calls'), 0), triangles: stats(all('triangles'), 0),
        sceneDrawCalls: stats(all('mainCalls'), 0), sceneTriangles: stats(all('mainTriangles'), 0),
        memory: m.memory, adaptive: m.adaptive
      };
      if (m.syncError) throw new Error(`readPixels sync raised GL error ${m.syncError}; frame timings would not be synced`);
      if (opts.shots && opts.shotBoot) {
        const file = path.join(opts.shots, `${tier}-${name}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
        spots[name].shot = file;
      }
      log(`  ${tier} boot ${opts.bootNo} ${name}: frame ${spots[name].frameMs.median} ms (cpu ${spots[name].loopCpuMs.median} + gpu wait ${spots[name].gpuWaitMs.median}), ` +
        `render ${spots[name].renderMs.median} ms, calls ${spots[name].drawCalls.median}, tris ${spots[name].triangles.median}`);
    }
    return { build, state, spots, errors: [...session.errors], warnings: [...session.warnings] };
  } finally {
    await session.close();
  }
}

const fmtSpread = (median, lo, hi, d = 1) => `${median.toFixed(d)} (${lo.toFixed(d)}–${hi.toFixed(d)})`;
const fmtInt = (v) => Math.round(v).toLocaleString('en-US');

/** Markdown tables from the raw result. */
export function tables(result) {
  const lines = [];
  lines.push('| Tier | Spot | Frame ms, GPU-synced: median (round medians min–max) | p90 | Loop CPU ms (boot medians min–max) | GPU wait ms | Render-only ms (boot medians min–max) | Draw calls (scene / frame) | Triangles (scene / frame) |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const tier of result.options.tiers) {
    for (const spot of result.options.spots) {
      const runs = result.tiers[tier].boots.map((b) => b.spots[spot]);
      const roundMedians = runs.flatMap((s) => s.frameMs.roundMedians);
      const frame = median(runs.map((s) => s.frameMs.median));
      const p90 = median(runs.map((s) => s.frameMs.p90));
      const cpu = runs.map((s) => s.loopCpuMs.median), render = runs.map((s) => s.renderMs.median);
      const gpuWait = median(runs.map((s) => s.gpuWaitMs.median));
      const sceneCalls = median(runs.map((s) => s.sceneDrawCalls.median)), calls = median(runs.map((s) => s.drawCalls.median));
      const sceneTris = median(runs.map((s) => s.sceneTriangles.median)), tris = median(runs.map((s) => s.triangles.median));
      lines.push(`| ${tier} | ${spot} | ${fmtSpread(frame, Math.min(...roundMedians), Math.max(...roundMedians), 2)} | ${p90.toFixed(2)} | ` +
        `${fmtSpread(median(cpu), Math.min(...cpu), Math.max(...cpu), 2)} | ${gpuWait.toFixed(2)} | ${fmtSpread(median(render), Math.min(...render), Math.max(...render), 2)} | ` +
        `${fmtInt(sceneCalls)} / ${fmtInt(calls)} | ${fmtInt(sceneTris)} / ${fmtInt(tris)} |`);
    }
  }
  lines.push('');
  lines.push('| Tier | World ready ms, ctor → first frame (min–max) | World build ms (min–max) | First frame ms (min–max) | Boot total ms, engine start → first frame (min–max) | Boots |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const tier of result.options.tiers) {
    const b = result.tiers[tier].boots.map((x) => x.build);
    const col = (k) => { const v = b.map((x) => x[k]); return fmtSpread(median(v), Math.min(...v), Math.max(...v), 0); };
    lines.push(`| ${tier} | ${col('worldReadyMs')} | ${col('worldBuildMs')} | ${col('firstFrameMs')} | ${col('bootTotalMs')} | ${b.length} |`);
  }
  return lines.join('\n');
}

/** --assets: per-asset classic costs, measured in a light host page that has the three import map. */
async function assetCosts(opts, log) {
  const session = await openPage('/tools/labs_geometry_test.html', { size: opts.size, gpu: opts.gpu, timeout: opts.timeout });
  try {
    await waitForExpression(session.page, 'window.__geometryResults', Date.now() + 60000);
    const rows = await session.page.evaluate(measureAssets, { reps: 5 });
    log(`measured ${rows.length} classic assets (${rows.filter((r) => r.error).length} errors)`);
    return { rows, errors: [...session.errors] };
  } finally { await session.close(); }
}

export function assetTables(rows) {
  const ok = rows.filter((r) => !r.error);
  const groups = [...new Set(ok.map((r) => r.group))].sort();
  const lines = ['| Group | Assets | Triangles median | p90 | max | Draw calls median | max | Build ms median | p90 | max |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
  const row = (name, list) => {
    const t = list.map((r) => r.triangles), d = list.map((r) => r.drawCalls), b = list.map((r) => r.buildMs);
    lines.push(`| ${name} | ${list.length} | ${fmtInt(median(t))} | ${fmtInt(quantile(t, 0.9))} | ${fmtInt(Math.max(...t))} | ${fmtInt(median(d))} | ${fmtInt(Math.max(...d))} | ` +
      `${median(b).toFixed(2)} | ${quantile(b, 0.9).toFixed(2)} | ${Math.max(...b).toFixed(2)} |`);
  };
  for (const g of groups) row(g, ok.filter((r) => r.group === g));
  row('**all**', ok);
  lines.push('', '| Asset | Group | Triangles | Draw calls | Meshes | Build ms median (min–max of 5) |', '|---|---|---:|---:|---:|---:|');
  for (const r of [...rows].sort((a, b) => (b.triangles || 0) - (a.triangles || 0))) {
    lines.push(r.error ? `| ${r.id} | ${r.group} | error: ${r.error} | | | |`
      : `| ${r.id} | ${r.group} | ${fmtInt(r.triangles)} | ${r.drawCalls} | ${r.meshes} | ${r.buildMs.toFixed(2)} (${r.buildMsMin.toFixed(2)}–${r.buildMsMax.toFixed(2)}) |`);
  }
  return lines.join('\n');
}

// -------------------------------------------------------------------- CLI ---

const USAGE = `Usage: node tools/perf_spots.mjs [options] --out <file.json>
  --tiers low,medium,high        quality tiers (each is saved before boot, like the settings menu)
  --spots street,shrine,river,meadow   fixed spots: ${Object.keys(SPOTS).join(', ')}
  --boots N                      fresh boots per tier (default 3; build time is per boot)
  --rounds N                     measurement rounds per spot per boot (default 3)
  --frames N                     frames per round (default 240)
  --warmup ms                    frames before measuring each spot (default 3000)
  --hour H                       fixed time of day (default 10.5), clear weather
  --url-suffix S                 appended to /index.html, e.g. "?assets=modular"
  --gpu metal|swiftshader        default ${DEFAULT_GPU}
  --size WxH                     viewport (default 1200x750, device scale 1)
  --shots <dir>                  JPG of each tier × spot from the first boot
  --timeout s                    per boot (default 900)
  --out <file.json>              raw numbers (required)
  --assets                       instead: per-asset triangles, draw calls and build time of every classic
                                 asset with an original catalog adapter (for the AAA-7 per-asset budgets)
`;

async function main(argv) {
  const opts = { tiers: TIERS, spots: Object.keys(SPOTS), boots: 3, rounds: 3, frames: 240, warmup: 3000, hour: 10.5,
    urlSuffix: '', gpu: DEFAULT_GPU, size: '1200x750', shots: null, timeout: 900, out: null, assets: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    const value = () => (inline !== undefined ? inline : argv[++i]);
    switch (flag) {
      case '--tiers': opts.tiers = value().split(',').filter(Boolean); break;
      case '--spots': opts.spots = value().split(',').filter(Boolean); break;
      case '--boots': opts.boots = Number(value()); break;
      case '--rounds': opts.rounds = Number(value()); break;
      case '--frames': opts.frames = Number(value()); break;
      case '--warmup': opts.warmup = Number(value()); break;
      case '--hour': opts.hour = Number(value()); break;
      case '--url-suffix': opts.urlSuffix = value(); break;
      case '--gpu': opts.gpu = value(); break;
      case '--size': opts.size = value(); break;
      case '--shots': opts.shots = path.resolve(value()); break;
      case '--timeout': opts.timeout = Number(value()); break;
      case '--out': opts.out = path.resolve(value()); break;
      case '--assets': opts.assets = true; break;
      case '--help': case '-h': process.stdout.write(USAGE); return 0;
      default: process.stderr.write(`perf_spots: unknown option ${argv[i]}\n\n${USAGE}`); return 64;
    }
  }
  const bad = opts.tiers.find((t) => !TIERS.includes(t)) || opts.spots.find((s) => !SPOTS[s]);
  if (bad || !opts.out || ![opts.boots, opts.rounds, opts.frames].every((n) => Number.isInteger(n) && n > 0)) {
    process.stderr.write(`perf_spots: ${bad ? `unknown tier or spot ${bad}` : 'check --out / --boots / --rounds / --frames'}\n\n${USAGE}`);
    return 64;
  }
  if (opts.shots) await mkdir(opts.shots, { recursive: true });
  const log = (line) => process.stderr.write(line + '\n');
  const started = new Date();
  if (opts.assets) {
    const { rows, errors } = await assetCosts(opts, log);
    const result = { tool: 'tools/perf_spots.mjs --assets', date: started.toISOString(), machine: machine(), gpu: opts.gpu, pageErrors: errors, assets: rows };
    await mkdir(path.dirname(opts.out), { recursive: true });
    await writeFile(opts.out, JSON.stringify(result, null, 2) + '\n');
    process.stdout.write(assetTables(rows) + '\n');
    return 0;
  }
  const result = {
    tool: 'tools/perf_spots.mjs', date: started.toISOString(), machine: machine(), options: { ...opts, out: undefined },
    method: {
      frameMs: 'one real game frame, GPU-synced: Game.loop() (world update + composer.render() submission) followed by a 1-pixel readPixels, so the clock stops when the GPU has finished the frame (cpu + gpuWait). Headless Chromium paces requestAnimationFrame at 60 Hz whatever the flags (--disable-gpu-vsync / --disable-frame-rate-limit measured slower, not faster), so the rAF interval is kept only as rafIntervalMs',
      loopCpuMs: 'main-thread time inside one Game.loop() call: world update + composer.render() submission',
      gpuWaitMs: 'time the 1-pixel readPixels after the loop waited for the GPU to finish the frame',
      renderMs: 'composer.render() 30× back to back at the tier shadow cadence, synced by a 1-pixel readPixels, divided by 30; 5 reps',
      drawCalls: 'renderer.info.render with autoReset off for one whole loop: every pass (shadow map, scene, AO, atmosphere, bloom, grade, grass physics, env bake when due); "scene" = the RenderPass call (scene + shadow map)',
      build: 'worldBuildMs = Game constructor start (#canvas lookup) → its closing this.loop(); firstFrameMs = that first loop (shader compile + first render); worldReadyMs = sum; bootTotalMs adds engine start (boot screen "loading") → constructor, i.e. module download/evaluation',
      pinned: 'quality saved in localStorage before boot; hour fixed, clear weather; adaptive resolution and eco governor switched off; tier re-applied with applyQuality()'
    },
    tiers: {}
  };
  for (const tier of opts.tiers) {
    result.tiers[tier] = { boots: [] };
    for (let b = 0; b < opts.boots; b++) {
      const run = await bootOnce(tier, { ...opts, bootNo: b + 1, shotBoot: b === 0 }, log);
      result.tiers[tier].boots.push(run);
      log(`${tier} boot ${b + 1}: world ready ${run.build.worldReadyMs} ms (build ${run.build.worldBuildMs}, first frame ${run.build.firstFrameMs})` +
        (run.errors.length ? `; page errors: ${run.errors.join(' | ')}` : ''));
    }
  }
  // Browser + GPU strings from one short extra session.
  const probe = await openPage('/__boot.html', { gpu: opts.gpu, size: opts.size, timeout: 60 });
  try {
    result.browser = `Chromium ${probe.browser.version()} (Playwright headless)`;
    result.gpuRenderer = await gpuInfo(probe.browser);
  } finally { await probe.close(); }
  result.minutes = round((Date.now() - started) / 60000, 1);
  await mkdir(path.dirname(opts.out), { recursive: true });
  await writeFile(opts.out, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(`${result.machine.model || ''} ${result.machine.chip || ''} · ${result.browser} · ${result.gpuRenderer} · ${opts.size} · hour ${opts.hour}\n\n`);
  process.stdout.write(tables(result) + '\n');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => {
    process.stderr.write(`perf_spots: ${error?.stack || error}\n`);
    process.exitCode = 2;
  });
}
