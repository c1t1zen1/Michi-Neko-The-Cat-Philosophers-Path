// Static server + headless Chrome runner for harness/capture.html.
//   node driver.js <job> [<job> ...]      (jobs/<job>.json)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = __dirname;
const PORT = Number(process.env.CAP_PORT || 18731);
const CHROME = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png' };
const stamp = () => new Date().toTimeString().slice(0, 8);

let onDone = null;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const shot = u.searchParams.get('shot');
      if (u.pathname === '/frame') {
        const dir = path.join(ROOT, 'frames', shot);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, String(u.searchParams.get('i')).padStart(4, '0') + '.png'), body);
      } else if (u.pathname === '/meta') {
        const dir = path.join(ROOT, 'frames', shot);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'meta.json'), body);
      } else if (u.pathname === '/log') {
        console.log(stamp(), body.toString());
      } else if (u.pathname === '/done') {
        if (onDone) onDone();
      }
      res.writeHead(200);
      res.end('ok');
    });
    return;
  }
  const p = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname)));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});

function runJob(name, timeoutMs) {
  return new Promise((resolve) => {
    const job = JSON.parse(fs.readFileSync(path.join(ROOT, 'jobs', name + '.json'), 'utf8'));
    const ud = path.join(ROOT, 'ud', name);
    fs.rmSync(ud, { recursive: true, force: true });
    const args = [
      '--headless', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--remote-debugging-port=0', `--user-data-dir=${ud}`,
      `--window-size=${job.w || 1080},${job.h || 1080}`, '--hide-scrollbars',
      `http://127.0.0.1:${PORT}/harness/capture.html?job=${name}`
    ];
    const t0 = Date.now();
    console.log(stamp(), `job ${name}: launching`);
    const child = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      if (/ERROR|Uncaught|SyntaxError|TypeError/i.test(s) && !/devtools|DevTools|gpu_init|dxva|sandbox/.test(s)) process.stdout.write('  chrome: ' + s.slice(0, 400));
    });
    const finish = (why) => {
      clearTimeout(timer);
      onDone = null;
      try { execSync(`taskkill /T /F /PID ${child.pid}`, { stdio: 'ignore' }); } catch (e) { /* already gone */ }
      console.log(stamp(), `job ${name}: ${why} after ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      setTimeout(resolve, 1500);
    };
    const timer = setTimeout(() => finish('TIMEOUT'), timeoutMs);
    onDone = () => finish('done');
  });
}

server.listen(PORT, '127.0.0.1', async () => {
  for (const name of process.argv.slice(2)) await runJob(name, 90 * 60 * 1000);
  server.close();
  process.exit(0);
});
