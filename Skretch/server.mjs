import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, rename, mkdir, stat, readdir, unlink, realpath } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { emptyReview, validateReview, reviewMarkdown } from './js/model.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DATA = fileURLToPath(new URL('./data/', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8' };
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
const problem = (message, status = 400) => Object.assign(new Error(message), { status });
async function atomic(file, text) {
  const temporary = file + '.tmp-' + process.pid + '-' + crypto.randomUUID();
  try { await writeFile(temporary, text); await rename(temporary, file); }
  finally { await unlink(temporary).catch(() => {}); }
}
export function createSkretchServer({ repoRoot = ROOT, dataDir = DATA, manifestPath = path.join(repoRoot, 'Skretch/assets/manifest.json') } = {}) {
  repoRoot = path.resolve(repoRoot);            // fileURLToPath keeps a trailing sep
  let writes = Promise.resolve();
  const manifest = async () => JSON.parse(await readFile(manifestPath, 'utf8'));
  async function current() {
    try { return validateReview(JSON.parse(await readFile(path.join(dataDir, 'review.json'), 'utf8')), await manifest()); }
    catch (e) { if (e.code === 'ENOENT') return emptyReview(); throw e; }
  }
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/Skretch/api/')) {
        if (url.pathname === '/Skretch/api/report') {
          if (req.method !== 'GET') throw problem('Use GET.', 405);
          res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(reviewMarkdown(await current(), await manifest()));
        }
        if (url.pathname !== '/Skretch/api/review') throw problem('Unknown endpoint.', 404);
        if (req.method === 'GET') return json(res, 200, { review: await current(), storage: 'Skretch/data/review.json' });
        if (req.method !== 'PUT') throw problem('Use GET or PUT.', 405);
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw problem('Open Skretch on this server before saving.', 403);
        if (!String(req.headers['content-type']).startsWith('application/json')) throw problem('Send application/json.', 415);
        let bytes = 0; const chunks = [];
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 32 * 1024 * 1024) throw problem('Review exceeds 32 MB.', 413); chunks.push(chunk); }
        let payload; try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw problem('Invalid JSON.'); }
        const source = await manifest(), proposed = validateReview(payload.review, source);
        const operation = writes.then(async () => {
          const existing = await current();
          if (payload.baseRevision !== existing.revision) throw problem('Another tab or device saved a newer review. Merge it before saving.', 409);
          const next = { ...proposed, revision: existing.revision + 1, updatedAt: new Date().toISOString() };
          await mkdir(path.join(dataDir, 'history'), { recursive: true });
          if (existing.revision) await atomic(path.join(dataDir, 'history', `review-${String(existing.revision).padStart(8, '0')}.json`), JSON.stringify(existing, null, 2) + '\n');
          // JSON is canonical. A failed report write does not advance its revision.
          await atomic(path.join(dataDir, 'review.md'), reviewMarkdown(next, source));
          await atomic(path.join(dataDir, 'review.json'), JSON.stringify(next, null, 2) + '\n');
          const history = (await readdir(path.join(dataDir, 'history'))).filter(f => /^review-\d+\.json$/.test(f)).sort();
          for (const name of history.slice(0, -20)) await unlink(path.join(dataDir, 'history', name));
          return next;
        });
        writes = operation.catch(() => {});
        return json(res, 200, { review: await operation, storage: 'Skretch/data/review.json' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw problem('Read-only path.', 405);
      if (url.pathname === '/') { res.writeHead(302, { Location: '/Skretch/' }); return res.end(); }
      let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { throw problem('Invalid path.'); }
      // Keep local save history private to the API and avoid serving dotfiles.
      if (pathname.split('/').some(p => p.startsWith('.')) || /^\/Skretch\/data(?:\/|$)/i.test(pathname)) throw problem('Not found.', 404);
      let file = path.resolve(repoRoot, '.' + pathname);
      if (!file.startsWith(repoRoot + path.sep)) throw problem('Not found.', 404);
      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) {
        if (!pathname.endsWith('/')) { res.writeHead(302, { Location: url.pathname + '/' }); return res.end(); }
        file = path.join(file, 'index.html'); info = await stat(file).catch(() => null);
      }
      if (!info?.isFile() || !(await realpath(file)).startsWith(await realpath(repoRoot) + path.sep)) throw problem('Not found.', 404);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch (e) { json(res, e.status || (e.code === 'ENOENT' ? 404 : 400), { error: e.message }); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8098), hostIndex = process.argv.indexOf('--host');
  const host = hostIndex >= 0 ? process.argv[hostIndex + 1] : '127.0.0.1';
  const server = createSkretchServer();
  server.listen(port, host, () => console.log(`Skretch: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/Skretch/\nReviews save to Skretch/data/review.json and review.md`));
}
