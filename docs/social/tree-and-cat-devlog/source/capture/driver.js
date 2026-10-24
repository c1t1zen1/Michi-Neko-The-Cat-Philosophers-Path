import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const WORK_DIR = path.join(os.tmpdir(), 'tree-cat-cap');
const OUT_DIR = path.join(WORK_DIR, 'out');
const VENDOR_DIR = path.join(WORK_DIR, 'vendor');
const SRC_DIR = path.join(WORK_DIR, 'src');
const SNAPS_DIR = path.join(WORK_DIR, 'snaps');
const HARNESS_DIR = path.join(WORK_DIR, 'harness');

const CHROME =
  process.env.CHROME_BIN ||
  'C:\\Users\\c1t1zen\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1234\\chrome-headless-shell-win64\\chrome-headless-shell.exe';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      return resolve();
    }
    const request = (u) => {
      https
        .get(u, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, u).toString();
            return request(nextUrl);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
        })
        .on('error', reject);
    };
    request(url);
  });
}

async function prepareWorkspace() {
  for (const d of [WORK_DIR, OUT_DIR, VENDOR_DIR, SRC_DIR, SNAPS_DIR, HARNESS_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }

  console.log('[prep] Caching Three.js r160 vendor modules...');
  await downloadFile(
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    path.join(VENDOR_DIR, 'three.module.js')
  );
  await downloadFile(
    'https://unpkg.com/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js',
    path.join(VENDOR_DIR, 'BufferGeometryUtils.js')
  );

  console.log('[prep] Copying current src/ modules...');
  for (const f of fs.readdirSync(path.join(REPO_ROOT, 'src'))) {
    if (f.endsWith('.js')) {
      const content = fs
        .readFileSync(path.join(REPO_ROOT, 'src', f), 'utf8')
        .replace(/\?v=[0-9a-zA-Z_.-]+/g, '');
      fs.writeFileSync(path.join(SRC_DIR, f), content, 'utf8');
    }
  }

  console.log('[prep] Extracting historical git snapshots...');
  const snaps = [
    ['foliage_sep06.js', 'a2c4fc6:src/foliage.js'],
    ['foliage_sep09.js', 'ce00d8f:src/foliage.js'],
    ['foliage_sep24.js', 'e4fb486:src/foliage.js'],
    ['cat_v1.js', 'cc1f7e2:src/cat.js'],
    ['cat_v2.js', 'a2c4fc6:src/cat.js'],
    ['cat_v3.js', '9b76887:src/cat.js']
  ];
  for (const [outName, gitSpec] of snaps) {
    const raw = execFileSync('git', ['show', gitSpec], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    });
    fs.writeFileSync(path.join(SNAPS_DIR, outName), raw.replace(/^\uFEFF/, ''), 'utf8');
  }

  console.log('[prep] Copying capture harness...');
  for (const f of ['capture.html', 'capture.js']) {
    fs.copyFileSync(path.join(__dirname, 'harness', f), path.join(HARNESS_DIR, f));
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png'
};

const SHOTS = [
  { name: 'tree_v1', w: 960, h: 960, fps: 30, frames: 72 },
  { name: 'tree_v1_wire', w: 960, h: 960, fps: 30, frames: 48 },
  { name: 'tree_v2', w: 960, h: 960, fps: 30, frames: 72 },
  { name: 'tree_v3', w: 800, h: 800, fps: 30, frames: 54 },
  { name: 'tree_v4', w: 800, h: 800, fps: 30, frames: 54 },
  { name: 'tree_v5_hero', w: 840, h: 840, fps: 30, frames: 64 },
  { name: 'tree_v5_closeup', w: 840, h: 840, fps: 30, frames: 54 },
  { name: 'tree_v5_maple', w: 760, h: 760, fps: 30, frames: 48 },
  { name: 'tree_v5_pine', w: 760, h: 760, fps: 30, frames: 48 },
  { name: 'tree_v5_rim', w: 840, h: 840, fps: 30, frames: 54 },
  { name: 'tree_textures', w: 840, h: 640, fps: 30, frames: 24 },
  { name: 'cat_v1', w: 680, h: 680, fps: 30, frames: 36 },
  { name: 'cat_v2', w: 680, h: 680, fps: 30, frames: 36 },
  { name: 'cat_v3', w: 680, h: 680, fps: 30, frames: 36 },
  { name: 'cat_skeleton', w: 820, h: 820, fps: 30, frames: 54 },
  { name: 'cat_primitives', w: 820, h: 820, fps: 30, frames: 54 },
  { name: 'cat_blend', w: 820, h: 820, fps: 30, frames: 54 },
  { name: 'cat_weights', w: 820, h: 820, fps: 30, frames: 48 },
  { name: 'cat_face', w: 820, h: 820, fps: 30, frames: 54 },
  { name: 'cat_gaits', w: 820, h: 820, fps: 30, frames: 66 },
  { name: 'cat_poses_builds', w: 840, h: 840, fps: 30, frames: 54 },
  { name: 'finale_scene', w: 860, h: 1020, fps: 30, frames: 84 }
];

const waiters = new Map();

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'POST' && u.pathname === '/save') {
    const shot = u.searchParams.get('shot');
    const frame = Number(u.searchParams.get('frame'));
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const b64 = Buffer.concat(chunks).toString('utf8');
      const dir = path.join(OUT_DIR, shot);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `frame_${String(frame).padStart(4, '0')}.png`);
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      res.writeHead(200);
      res.end('ok');
    });
    return;
  }
  if (req.method === 'POST' && u.pathname === '/meta') {
    const shot = u.searchParams.get('shot');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const dir = path.join(OUT_DIR, shot);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'meta.json'), Buffer.concat(chunks));
      res.writeHead(200);
      res.end('ok');
    });
    return;
  }
  if (req.method === 'GET' && u.pathname === '/done') {
    const shot = u.searchParams.get('shot');
    res.writeHead(200);
    res.end('bye');
    const w = waiters.get(shot);
    if (w) w.resolve();
    return;
  }
  if (req.method === 'POST' && u.pathname === '/error') {
    const shot = u.searchParams.get('shot');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const msg = Buffer.concat(chunks).toString('utf8');
      res.writeHead(200);
      res.end('err');
      const w = waiters.get(shot);
      if (w) w.reject(new Error(`Shot ${shot} failed: ${msg}`));
    });
    return;
  }

  let filePath = path.join(WORK_DIR, decodeURIComponent(u.pathname));
  if (!filePath.startsWith(WORK_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('not found: ' + u.pathname);
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(filePath).pipe(res);
});

function runShot(port, job) {
  return new Promise((resolve, reject) => {
    const doneDir = path.join(OUT_DIR, job.name);
    const lastFrame = path.join(doneDir, `frame_${String(job.frames - 1).padStart(4, '0')}.png`);
    const metaFile = path.join(doneDir, 'meta.json');
    if (fs.existsSync(lastFrame) && fs.existsSync(metaFile)) {
      console.log(`[skip] ${job.name} already captured (${job.frames} frames)`);
      return resolve();
    }

    const q = new URLSearchParams({
      shot: job.name,
      w: String(job.w),
      h: String(job.h),
      fps: String(job.fps),
      frames: String(job.frames)
    }).toString();
    const url = `http://127.0.0.1:${port}/harness/capture.html?${q}`;
    const t0 = Date.now();
    console.log(`[start] ${job.name} (${job.w}x${job.h}, ${job.frames}f)`);

    const userDataDir = path.join(WORK_DIR, 'profiles', job.name);
    fs.mkdirSync(userDataDir, { recursive: true });

    const proc = spawn(
      CHROME,
      [
        '--headless',
        '--no-sandbox',
        '--disable-gpu-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--hide-scrollbars',
        '--mute-audio',
        `--user-data-dir=${userDataDir}`,
        `--window-size=${job.w},${job.h}`,
        url
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Timeout on ${job.name}. stderr:\n${stderr.slice(-600)}`));
    }, 360000);

    waiters.set(job.name, {
      resolve: () => {
        clearTimeout(timer);
        setTimeout(() => proc.kill('SIGKILL'), 60);
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[done]  ${job.name} in ${dt}s`);
        resolve();
      },
      reject: (err) => {
        clearTimeout(timer);
        proc.kill('SIGKILL');
        reject(err);
      }
    });
  });
}

async function main() {
  await prepareWorkspace();
  const filter = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
  const jobs = filter ? SHOTS.filter((j) => filter.has(j.name)) : SHOTS;

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  console.log(`[server] Listening on http://127.0.0.1:${port} — capturing ${jobs.length} shots...`);

  const CONCURRENCY = 2;
  let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const job = jobs[idx++];
      await runShot(port, job);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()));
  server.close();
  console.log(`[all done] Plates saved in ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
