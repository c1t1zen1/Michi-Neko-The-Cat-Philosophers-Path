#!/usr/bin/env node
// Headless page runner for the repo: open any page in headless Chromium,
// wait for it to say it is ready, read a value out of it, screenshot it, and
// print a one-line JSON summary. Also diffs and converts images in the
// browser (canvas, no npm dependencies). Shared by every Fable lane.
//
//   node tools/headless.mjs --help
//
// It serves a root directory (default: the repo this file lives in) with a
// tiny built-in static server on a free 127.0.0.1 port, so parallel worktrees
// never collide on a port. Playwright stays outside the repo, the same pattern
// as catalog/tests/browser-support.mjs:
//
//   export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
//
// Module API (the CLI only runs when this file is executed directly):
//   openPage(pathOrUrl, { root, size, gpu, session, local, init, timeout, console, args, ignore, waitUntil })
//     → { page, browser, context, url, origin, gpu, errors, warnings, close }
//   runPage(pathOrUrl, { wait, eval, shot, settle, jpegQuality, failOnError, ...openPage options })
//     → { ok, url, ms, errors, warnings, shot, value, gpu, error? }
//   diffImages(aPath, bPath, { out })      → { width, height, maxDelta, meanDelta, pixelsOver8 }
//   convertImage(srcPath, dstPath, { quality })  → { width, height, bytes, quality }
//   openImageTool()                        → { diff, convert, close } (one browser for many images)
//   startServer(root), loadPlaywright(), gpuInfo(browser), waitForExpression(page, expr, deadline)
import http from 'node:http';
import { createReadStream, existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_GPU = process.platform === 'darwin' ? 'metal' : 'swiftshader';

// Chromium flags per GPU backend. Metal is the real GPU on macOS (fast);
// SwiftShader is the CPU rasteriser (slow, but the same on every machine).
const GPU_ARGS = {
  metal: ['--use-angle=metal', '--ignore-gpu-blocklist'],
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.ktx2': 'image/ktx2',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------- server ---

/** Serve `root` on a free 127.0.0.1 port. → { root, port, origin, close() } */
export function startServer(root = REPO_ROOT) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    serveFile(root, req, res).catch((error) => {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(error?.message || error));
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      let closing;
      resolve({
        root, port, origin: `http://127.0.0.1:${port}`,
        close: () => (closing ||= new Promise((done) => { server.close(() => done()); server.closeAllConnections?.(); }))
      });
    });
  });
}

async function serveFile(root, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  const url = new URL(req.url, 'http://localhost');
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end('bad path'); }
  let file = path.join(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('outside the served root'); }
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    // Same as python3 -m http.server: /labs/grass → /labs/grass/ so relative URLs resolve.
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }); return res.end(); }
    file = path.join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  if (!info?.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('not found: ' + rel); }
  const headers = {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes'
  };
  // Byte ranges, so <video> (the summit transition mp4) can seek.
  let start = 0, end = info.size - 1, status = 200;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && info.size > 0 && (range[1] || range[2])) {
    if (range[1] === '') start = Math.max(0, info.size - Number(range[2]));
    else { start = Number(range[1]); if (range[2] !== '') end = Math.min(end, Number(range[2])); }
    if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); return res.end(); }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length'] = info.size ? end - start + 1 : 0;
  res.writeHead(status, headers);
  if (req.method === 'HEAD' || !info.size) return res.end();
  createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
}

// ------------------------------------------------------------ playwright ---

let playwright;
/** Playwright from PLAYWRIGHT_MODULE, else a normal resolve, else the npx cache. */
export function loadPlaywright() {
  if (playwright) return playwright;
  const require = createRequire(import.meta.url);
  if (process.env.PLAYWRIGHT_MODULE) {
    try { return (playwright = require(process.env.PLAYWRIGHT_MODULE)); }
    catch (error) { throw new Error(`PLAYWRIGHT_MODULE=${process.env.PLAYWRIGHT_MODULE} did not load: ${error.message}`); }
  }
  for (const candidate of ['playwright', ...npxPlaywrights()]) {
    try { return (playwright = require(candidate)); } catch { /* next */ }
  }
  throw new Error('Playwright not found. Install it outside this repo and set ' +
    'PLAYWRIGHT_MODULE=/path/to/node_modules/playwright (see catalog/README.md). Nothing is installed in the repo.');
}

function npxPlaywrights() {
  const base = path.join(homedir(), '.npm', '_npx');
  const version = (dir) => {
    try { return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).version.split('.').map(Number); }
    catch { return [0]; }
  };
  try {
    return readdirSync(base)
      .map((d) => path.join(base, d, 'node_modules', 'playwright'))
      .filter((dir) => existsSync(path.join(dir, 'package.json')))
      .sort((a, b) => {
        const va = version(a), vb = version(b);
        for (let i = 0; i < 3; i++) if ((vb[i] || 0) !== (va[i] || 0)) return (vb[i] || 0) - (va[i] || 0);
        return 0;
      });
  } catch { return []; }
}

function launch(gpu, extraArgs = []) {
  const { chromium } = loadPlaywright();
  const args = gpu ? GPU_ARGS[gpu] : [];
  if (!args) throw new Error(`--gpu must be one of ${Object.keys(GPU_ARGS).join(', ')} (got ${gpu})`);
  return chromium.launch({
    headless: true, timeout: 60000, args: [...args, ...extraArgs],
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {})
  });
}

/** The WebGL renderer string of a browser (proves Metal vs SwiftShader). */
export async function gpuInfo(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    return await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
      if (!gl) return 'no WebGL';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    });
  } finally { await context.close(); }
}

// ------------------------------------------------------------------ pages ---

function parseSize(size) {
  if (size && typeof size === 'object') return { width: size.width, height: size.height };
  const match = /^(\d+)x(\d+)$/i.exec(String(size));
  if (!match) throw new Error(`size must look like 1200x750 (got ${size})`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

const isUrl = (target) => /^[a-z][a-z0-9+.-]*:/i.test(target);

// '/tools/x.html?a=1', 'tools/x.html' and '<root>/tools/x.html' all mean the same page.
function rootPath(target, root) {
  let p = String(target);
  if (p.startsWith(root + path.sep)) p = p.slice(root.length);
  p = p.split(path.sep).join('/');
  return p.startsWith('/') ? p : '/' + p;
}

/**
 * Open a page in headless Chromium. A path is served from `root` (default:
 * this repo) on a free port; a full URL is opened as is.
 * → { page, browser, context, url, origin, gpu, errors: [], warnings: [], close }
 * `close()` stops the browser AND the server. Messages are stored with the
 * server origin removed, so they read the same on every port.
 */
export async function openPage(pathOrUrl, {
  root, size = '1200x750', gpu, session = {}, local = {}, init, timeout = 120, console: echo = false,
  args = [], ignore = [], waitUntil = 'load'
} = {}) {
  const t0 = Date.now();
  const { width, height } = parseSize(size);
  const backend = gpu || DEFAULT_GPU;
  const errors = [], warnings = [];
  const ignored = [].concat(ignore).map((re) => (re instanceof RegExp ? re : new RegExp(re)));
  let server = null, browser = null, closing;
  const close = () => (closing ||= (async () => {
    await browser?.close().catch(() => {});
    await server?.close();
  })());
  try {
    if (!isUrl(pathOrUrl)) server = await startServer(root || REPO_ROOT);
    const url = server ? server.origin + rootPath(pathOrUrl, server.root) : pathOrUrl;
    const origin = new URL(url).origin;
    const clean = (s) => String(s ?? '').split(origin).join('');
    const echoLine = (tag, text) => {
      if (echo) process.stderr.write(`[+${((Date.now() - t0) / 1000).toFixed(1)}s ${tag}] ${text}\n`);
    };
    const record = (list, text) => { if (!ignored.some((re) => re.test(text))) list.push(text); };

    browser = await launch(backend, args);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(timeout * 1000);
    page.on('console', (message) => {
      const type = message.type();
      let text = clean(message.text());
      const where = message.location?.();
      if ((type === 'error' || type === 'warning') && where?.url && !text.includes(clean(where.url))) {
        text += ` (${clean(where.url)}${where.lineNumber ? ':' + (where.lineNumber + 1) : ''})`;
      }
      echoLine(type, text);
      if (type === 'error') record(errors, text);
      else if (type === 'warning') record(warnings, text);
    });
    page.on('pageerror', (error) => {
      const text = clean(error?.message || error);
      echoLine('pageerror', text + (echo && error?.stack ? '\n' + clean(error.stack) : ''));
      record(errors, text);
    });
    page.on('crash', () => { echoLine('crash', 'the page crashed'); errors.push('the page crashed'); });
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText || '';
      if (!/ERR_ABORTED/.test(reason)) echoLine('requestfailed', `${clean(request.url())} ${reason}`);
    });

    // Init scripts run before any page script, in every document (timing hooks).
    for (const script of [].concat(init || [])) await page.addInitScript(script);

    // sessionStorage / localStorage before navigation (e.g. catwalk_autostart=new,
    // as /__boot.html does, or a saved quality tier): set them once on a stub page
    // of the same origin, then navigate. The browser profile is fresh every run.
    if (Object.keys(session).length || Object.keys(local).length) {
      const stub = origin + '/__headless_session__';
      await page.route(stub, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>session</title>' }));
      await page.goto(stub);
      const pairs = (o) => Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]);
      await page.evaluate(([s, l]) => {
        for (const [k, v] of s) sessionStorage.setItem(k, v);
        for (const [k, v] of l) localStorage.setItem(k, v);
      }, [pairs(session), pairs(local)]);
      await page.unroute(stub);
    }

    let response = null;
    try { response = await page.goto(url, { waitUntil, timeout: timeout * 1000 }); }
    catch (error) {
      // A page that redirects itself while loading (/__boot.html → /index.html).
      if (!/interrupted by another navigation|ERR_ABORTED|frame was detached/i.test(error.message)) throw error;
      await page.waitForLoadState(waitUntil, { timeout: timeout * 1000 }).catch(() => {});
    }
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${clean(url) || url}`);
    return { page, browser, context, url, origin, gpu: backend, errors, warnings, close };
  } catch (error) {
    await close();
    throw error;
  }
}

/**
 * Poll `expr` in the page until it is truthy. Exceptions count as "not yet"
 * (so `window.game.ready` works before `game` exists), and the poll survives
 * navigations. Throws on timeout or a crashed page.
 */
export async function waitForExpression(page, expr, deadline, pollMs = 250) {
  let lastError = '';
  for (;;) {
    if (page.isClosed()) throw new Error('the page closed while waiting');
    const left = deadline - Date.now();
    try {
      const value = await raceDeadline(page.evaluate(expr), left);
      if (value) return value;
      lastError = '';
    } catch (error) {
      if (error.timeout) break;
      if (/crash/i.test(error.message)) throw new Error('the page crashed while waiting');
      lastError = error.message.split('\n')[0];
    }
    if (Date.now() + pollMs > deadline) break;
    await sleep(pollMs);
  }
  throw new Error(`wait timed out: ${expr}${lastError ? ` (last error: ${lastError})` : ''}`);
}

function raceDeadline(promise, ms) {
  let timer;
  const expire = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { timeout: true })), Math.max(0, ms));
  });
  return Promise.race([promise, expire]).finally(() => clearTimeout(timer));
}

async function screenshot(page, file, { quality = 80, timeout = 60000 } = {}) {
  const target = path.resolve(file);
  const jpeg = /\.jpe?g$/i.test(target);
  if (!jpeg && !/\.png$/i.test(target)) throw new Error(`--shot must end in .png or .jpg (got ${file})`);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, type: jpeg ? 'jpeg' : 'png', ...(jpeg ? { quality } : {}), timeout, caret: 'hide' });
  return target;
}

/**
 * Open, wait, settle, evaluate, screenshot, close.
 * → { ok, url, ms, errors, warnings, shot, value, gpu, error? }
 * `ok` is false when navigation, the wait, the eval or the shot failed, or
 * (with failOnError) when the page logged an error.
 */
export async function runPage(pathOrUrl, {
  wait, eval: expr, shot, settle = 0, jpegQuality = 80, failOnError = false, ...openOpts
} = {}) {
  const t0 = Date.now();
  const deadline = t0 + (openOpts.timeout ?? 120) * 1000;
  const result = {
    ok: false, url: isUrl(pathOrUrl) ? pathOrUrl : rootPath(pathOrUrl, path.resolve(openOpts.root || REPO_ROOT)),
    ms: 0, errors: [], warnings: [], shot: shot ? path.resolve(shot) : null, value: undefined, gpu: null
  };
  let session;
  try {
    session = await openPage(pathOrUrl, openOpts);
    result.errors = session.errors;
    result.warnings = session.warnings;
    if (wait) await waitForExpression(session.page, wait, deadline);
    if (settle) await sleep(settle);
    if (expr) {
      try { result.value = await raceDeadline(session.page.evaluate(expr), deadline - Date.now()); }
      catch (error) { throw new Error(error.timeout ? `eval timed out: ${expr}` : `eval failed: ${error.message.split('\n')[0]}`); }
    }
    if (shot) await screenshot(session.page, shot, { quality: jpegQuality, timeout: Math.max(30000, deadline - Date.now()) });
    const finalUrl = session.page.url().split(session.origin).join('');
    if (finalUrl !== result.url && finalUrl !== session.url) result.finalUrl = finalUrl;
    result.gpu = await gpuInfo(session.browser).catch(() => null);
    result.ok = true;
  } catch (error) {
    result.error = String(error?.message || error).split('\n')[0];
  } finally {
    await session?.close();
  }
  if (failOnError && result.errors.length) result.ok = false;
  result.ms = Date.now() - t0;
  return result;
}

// ----------------------------------------------------------------- images ---

// Runs in the page: decode with no colour conversion, so pixels compare raw.
const IMAGE_KIT = `
window.__img = {
  async load(name) {
    const blob = await (await fetch('/' + name)).blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(bitmap, 0, 0);
    return { w: bitmap.width, h: bitmap.height, data: g.getImageData(0, 0, bitmap.width, bitmap.height).data };
  },
  async encode(w, h, data, type, quality) {
    const canvas = new OffscreenCanvas(w, h);
    canvas.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type, quality })).arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
};`;

const encodeType = (file) => (/\.jpe?g$/i.test(file) ? 'image/jpeg' : /\.webp$/i.test(file) ? 'image/webp' : 'image/png');

/** One browser for many image diffs/conversions. → { diff, convert, close } */
export async function openImageTool() {
  const browser = await launch(null);
  try {
    const page = await browser.newPage();
    const files = new Map();
    await page.route('http://headless.invalid/**', (route) => {
      const name = new URL(route.request().url()).pathname;
      if (name === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>images</title>' });
      const file = files.get(name);
      return file ? route.fulfill({ path: file, contentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
        : route.fulfill({ status: 404, body: 'no such image' });
    });
    await page.goto('http://headless.invalid/');
    await page.addScriptTag({ content: IMAGE_KIT });
    let serial = 0;
    const expose = async (file) => {
      const full = path.resolve(file);
      await stat(full).catch(() => { throw new Error(`cannot read image ${file}`); });
      const name = `/i${++serial}${path.extname(full)}`;
      files.set(name, full);
      return name.slice(1);
    };

    /** maxDelta etc. use d = max(|ΔR|,|ΔG|,|ΔB|,|ΔA|) per pixel, 0…255. */
    async function diff(aPath, bPath, { out } = {}) {
      const [a, b] = [await expose(aPath), await expose(bPath)];
      const type = out ? encodeType(out) : null;
      const result = await page.evaluate(async ({ a, b, type }) => {
        const A = await __img.load(a), B = await __img.load(b);
        const w = Math.min(A.w, B.w), h = Math.min(A.h, B.h);
        const view = type ? new Uint8ClampedArray(w * h * 4) : null;
        let maxDelta = 0, sum = 0, pixelsOver8 = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * A.w + x) * 4, j = (y * B.w + x) * 4;
          const d = Math.max(Math.abs(A.data[i] - B.data[j]), Math.abs(A.data[i + 1] - B.data[j + 1]),
            Math.abs(A.data[i + 2] - B.data[j + 2]), Math.abs(A.data[i + 3] - B.data[j + 3]));
          if (d > maxDelta) maxDelta = d;
          sum += d;
          if (d > 8) pixelsOver8++;
          if (view) {
            // Dimmed grey of A; small differences tint red (×16), over 8 is solid red-orange.
            const o = (y * w + x) * 4, base = (A.data[i] * 0.299 + A.data[i + 1] * 0.587 + A.data[i + 2] * 0.114) * 0.35;
            view[o] = d > 8 ? 255 : base + d * 16; view[o + 1] = d > 8 ? Math.min(160, d) : base;
            view[o + 2] = d > 8 ? 0 : base; view[o + 3] = 255;
          }
        }
        const r = { width: w, height: h, maxDelta, meanDelta: Math.round((sum / Math.max(1, w * h)) * 10000) / 10000, pixelsOver8 };
        if (A.w !== B.w || A.h !== B.h) r.sizeMismatch = { a: [A.w, A.h], b: [B.w, B.h], compared: 'overlap' };
        if (view) r.image = await __img.encode(w, h, view, type, 0.9);
        return r;
      }, { a, b, type });
      if (out && result.image) {
        await mkdir(path.dirname(path.resolve(out)), { recursive: true });
        await writeFile(out, Buffer.from(result.image, 'base64'));
        result.out = path.resolve(out);
      }
      delete result.image;
      return result;
    }

    /** Re-encode an image (PNG master → JPG preview). quality is 1…100. */
    async function convert(srcPath, dstPath, { quality = 80 } = {}) {
      const src = await expose(srcPath);
      const type = encodeType(dstPath);
      const r = await page.evaluate(async ({ src, type, q }) => {
        const I = await __img.load(src);
        return { width: I.w, height: I.h, image: await __img.encode(I.w, I.h, I.data, type, q) };
      }, { src, type, q: quality / 100 });
      const bytes = Buffer.from(r.image, 'base64');
      await mkdir(path.dirname(path.resolve(dstPath)), { recursive: true });
      await writeFile(dstPath, bytes);
      return { width: r.width, height: r.height, bytes: bytes.length, quality };
    }

    return { diff, convert, close: () => browser.close() };
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}

/** Compare two images in the browser. → { width, height, maxDelta, meanDelta, pixelsOver8 } */
export async function diffImages(aPath, bPath, { out } = {}) {
  const tool = await openImageTool();
  try { return await tool.diff(aPath, bPath, { out }); } finally { await tool.close(); }
}

/** Re-encode an image in the browser, e.g. a PNG master to a JPG preview. */
export async function convertImage(srcPath, dstPath, { quality = 80 } = {}) {
  const tool = await openImageTool();
  try { return await tool.convert(srcPath, dstPath, { quality }); } finally { await tool.close(); }
}

// -------------------------------------------------------------------- CLI ---

const USAGE = `Usage:
  node tools/headless.mjs <path-or-url> [options]
  node tools/headless.mjs --diff a.png b.png [--out diff.png]
  node tools/headless.mjs --convert master.png preview.jpg [--jpeg-quality 80]

A path ('/tools/x.html?a=1', 'tools/x.html' or an absolute file path inside the
root) is served from --root (default: this repo) on a free 127.0.0.1 port; a
full http(s) URL is opened as is. Quote anything with ? or &.

Page options:
  --shot <file.png|file.jpg>  screenshot of the viewport after wait/settle/eval
  --size WxH                  viewport, default 1200x750 (device scale 1)
  --wait "<js expression>"    poll every 250 ms until truthy; exceptions count
                              as not yet, and it survives redirects
  --eval "<js expression>"    print its JSON result on its own line (promises are awaited)
  --settle <ms>               sleep after --wait, before --eval and --shot
  --timeout <s>               whole-run budget, default 120
  --gpu metal|swiftshader     default ${DEFAULT_GPU} here (metal on macOS)
  --console                   stream console, pageerror and failed requests to stderr,
                              prefixed [+seconds type]
  --session k=v               sessionStorage before navigation (repeatable)
  --local k=v                 localStorage before navigation (repeatable), e.g. a saved quality tier
  --fail-on-error             exit 1 if the page logged an error or threw
  --ignore <regex>            leave matching messages out of errors/warnings (repeatable)
  --jpeg-quality N            for .jpg shots and --convert, default 80
  --root <dir>                directory to serve, default: the repo containing this file
  --arg <chromium flag>       extra browser flag (repeatable), e.g. --arg=--disable-gpu-vsync

Output: stdout ends with one JSON line {ok,url,ms,errors,warnings,shot,gpu,...}
(repeated messages are folded as "text (×N)"). With --eval, the line before it is
the JSON value. Exit 0 ok; 1 page errors with --fail-on-error; 2 the run failed
(navigation, wait timeout, eval, shot); 64 bad arguments.

--diff measures, it does not judge: per pixel d = max |Δ| over R,G,B,A (0-255),
prints {width,height,maxDelta,meanDelta,pixelsOver8} and exits 0 (2 only if an
image cannot be read). --out writes a diff view: dimmed A, red where d > 0,
solid red-orange where d > 8.

Playwright is never installed in the repo: set PLAYWRIGHT_MODULE to its package
directory (otherwise a normal resolve, then ~/.npm/_npx/*/node_modules/playwright).

Examples:
  node tools/headless.mjs "/tools/town_preview.html?sheet=street&golden=1" \\
    --wait "document.getElementById('log').textContent.startsWith('town')" --shot /tmp/street.png
  node tools/headless.mjs /tools/labs_geometry_test.html --wait "window.__geometryResults" \\
    --eval "__geometryResults.filter(r => r.pass).length + '/' + __geometryResults.length" --fail-on-error
  node tools/headless.mjs /__boot.html --timeout 1500 --console \\
    --wait "window.game?._bootDissolved && game.menu.isPlaying" --settle 5000 \\
    --eval "({ quality: game.settings.resolveQuality(), fps: game.ui.fps })" --shot /tmp/game.png
  node tools/headless.mjs /index.html --session catwalk_autostart=new --local 'catwalk_settings_v1={"quality":"low"}' \\
    --wait "window.game?._bootDissolved" --eval "game.settings.resolveQuality()"
  node tools/headless.mjs "/kyoto-rooftops.html?mouth=3&shot=1&nohud=1" --wait "window.roofRoad?.catReady" \\
    --settle 1500 --shot /tmp/mouth-3.png
  node tools/headless.mjs --diff /tmp/street.png /tmp/street-2.png --out /tmp/street-diff.png
  node tools/headless.mjs --convert /tmp/street.png /tmp/street.jpg --jpeg-quality 80
`;

const VALUE_OPTIONS = new Set(['shot', 'size', 'wait', 'eval', 'timeout', 'gpu', 'session', 'local', 'settle',
  'jpeg-quality', 'root', 'out', 'ignore', 'arg']);
const FLAG_OPTIONS = new Set(['console', 'fail-on-error', 'help', 'diff', 'convert']);

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { session: {}, local: {}, ignore: [], arg: [] }, positional = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--') || token === '--') { positional.push(token); continue; }
    let name = token.slice(2), value;
    const eq = name.indexOf('=');
    if (eq > 0) { value = name.slice(eq + 1); name = name.slice(0, eq); }
    if (name === 'h') name = 'help';
    if (FLAG_OPTIONS.has(name)) {
      if (value !== undefined) throw new UsageError(`--${name} takes no value`);
      opts[name] = true;
      continue;
    }
    if (!VALUE_OPTIONS.has(name)) throw new UsageError(`unknown option --${name}`);
    if (value === undefined) {
      if (i + 1 >= argv.length) throw new UsageError(`--${name} needs a value`);
      value = argv[++i];
    }
    if (name === 'session' || name === 'local') {
      const k = value.indexOf('=');
      if (k < 1) throw new UsageError(`--${name} wants key=value (got ${value})`);
      opts[name][value.slice(0, k)] = value.slice(k + 1);
    } else if (name === 'ignore' || name === 'arg') opts[name].push(value);
    else opts[name] = value;
  }
  return { opts, positional };
}

function number(opts, name, fallback) {
  if (opts[name] === undefined) return fallback;
  const n = Number(opts[name]);
  if (!Number.isFinite(n) || n < 0) throw new UsageError(`--${name} wants a number (got ${opts[name]})`);
  return n;
}

// "text (×N)" for repeats, so the summary stays one readable line.
function fold(messages) {
  const counts = new Map();
  for (const m of messages) {
    const text = m.length > 400 ? m.slice(0, 400) + '…' : m;
    counts.set(text, (counts.get(text) || 0) + 1);
  }
  return [...counts].map(([text, n]) => (n > 1 ? `${text} (×${n})` : text));
}

async function main(argv) {
  let parsed;
  try { parsed = parseArgs(argv); }
  catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`headless: ${error.message}\n\n${USAGE}`);
    return 64;
  }
  const { opts, positional } = parsed;
  if (opts.help || (!positional.length && !opts.diff && !opts.convert)) {
    process.stdout.write(USAGE);
    return opts.help ? 0 : 64;
  }
  try {
    if (opts.diff || opts.convert) {
      const [a, b] = positional;
      if (!a || !b) throw new UsageError(opts.diff ? '--diff wants two images' : '--convert wants a source and a destination');
      const quality = number(opts, 'jpeg-quality', 80);
      try {
        const result = opts.diff
          ? await diffImages(a, b, { out: opts.out })
          : await convertImage(a, b, { quality });
        process.stdout.write(JSON.stringify(result) + '\n');
        return 0;
      } catch (error) {
        process.stdout.write(JSON.stringify({ ok: false, error: error.message.split('\n')[0] }) + '\n');
        return 2;
      }
    }
    if (positional.length > 1) throw new UsageError(`one page at a time (got ${positional.join(' ')})`);
    if (opts.gpu && !GPU_ARGS[opts.gpu]) throw new UsageError(`--gpu must be metal or swiftshader (got ${opts.gpu})`);
    if (opts.size) parseSize(opts.size);
    const result = await runPage(positional[0], {
      root: opts.root, size: opts.size || '1200x750', gpu: opts.gpu, session: opts.session, local: opts.local,
      timeout: number(opts, 'timeout', 120), console: !!opts.console, ignore: opts.ignore, args: opts.arg,
      wait: opts.wait, eval: opts.eval, shot: opts.shot, settle: number(opts, 'settle', 0),
      jpegQuality: number(opts, 'jpeg-quality', 80), failOnError: !!opts['fail-on-error']
    });
    if (opts.eval && result.error === undefined) process.stdout.write(JSON.stringify(result.value ?? null) + '\n');
    const { value, ...summary } = result;
    summary.errors = fold(result.errors);
    summary.warnings = fold(result.warnings);
    process.stdout.write(JSON.stringify(summary) + '\n');
    if (result.error !== undefined) return 2;
    return result.ok ? 0 : 1;
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`headless: ${error.message}\n\n${USAGE}`);
    return 64;
  }
}

const invokedDirectly = (() => {
  try { return !!process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url; }
  catch { return false; }
})();

if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
    setTimeout(() => process.exit(code), 3000).unref(); // never hang on a stray handle
  }, (error) => {
    process.stdout.write(JSON.stringify({ ok: false, error: String(error?.message || error).split('\n')[0] }) + '\n');
    process.exit(2);
  });
}
