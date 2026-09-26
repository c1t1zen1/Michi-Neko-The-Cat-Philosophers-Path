import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalog, normalizePath } from './src/catalog.mjs';
import { agentProtocolSchema, createProviderRequest, extractJson, extractProviderText, normalizeAgentSettings, validateAgentPlan } from './src/agent-protocol.mjs';

const CAD_ROOT = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(CAD_ROOT, '..');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', '.cache']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'application/octet-stream', '.exr': 'application/octet-stream'
};

async function walk(directory, output = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    if (directory === REPO_ROOT && entry.name === 'cadJS') continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, output);
    else output.push(normalizePath(relative(REPO_ROOT, absolute)));
  }
  return output;
}

async function scanCatalog() {
  const files = await walk(REPO_ROOT);
  return createCatalog(files, (file) => {
    try { return readFileSync(join(REPO_ROOT, ...file.split('/')), 'utf8'); }
    catch { return ''; }
  });
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(request, limit = 96 * 1024 * 1024) {
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function postJson(urlValue, headers, body, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlValue); const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = transport(url, { method:'POST', headers }, (response) => {
      const chunks = []; response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status:response.statusCode || 500, ok:(response.statusCode || 500) >= 200 && (response.statusCode || 500) < 300, text:Buffer.concat(chunks).toString('utf8') }));
    });
    request.setTimeout(timeout, () => request.destroy(new Error('Provider request timed out')));
    request.on('error', reject); request.end(JSON.stringify(body));
  });
}

const OVERRIDES_FILE = join(REPO_ROOT, 'cad-overrides.json');

function readOverridesFile() {
  try {
    const doc = JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8'));
    if (doc?.format === 'michi-neko-cad-overrides' && Array.isArray(doc.overrides)) return doc;
  } catch { /* missing or unreadable file — start fresh */ }
  return { format: 'michi-neko-cad-overrides', version: 1, updated: null, overrides: [] };
}

// Merge published design records (keyed by object name) into
// cad-overrides.json at the repo root. This file — never game source — is
// the permanent integration point; the game loads it at boot.
async function overridesRequest(request, response) {
  if (request.method === 'GET') return json(response, 200, readOverridesFile());
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' });
  const payload = await readJsonBody(request);
  const records = Array.isArray(payload.overrides) ? payload.overrides : [payload];
  const doc = readOverridesFile();
  const byName = new Map(doc.overrides.map((item) => [item.name, item]));
  let written = 0;
  for (const record of records) {
    if (!record || typeof record.name !== 'string' || !record.name.trim()) continue;
    record.updated = new Date().toISOString();
    byName.set(record.name, record); written++;
  }
  if (!written) return json(response, 400, { error: 'No named override records supplied' });
  doc.overrides = [...byName.values()];
  doc.updated = new Date().toISOString();
  await writeFile(OVERRIDES_FILE, JSON.stringify(doc, null, 2));
  return json(response, 200, { ok: true, written, total: doc.overrides.length, file: 'cad-overrides.json' });
}

async function agentRequest(request, response) {
  const payload = await readJsonBody(request);
  const settings = normalizeAgentSettings(payload.settings);
  if (!payload.instruction?.trim()) return json(response, 400, { error: 'Instruction is required' });
  if (!['local','mcp'].includes(settings.provider) && !settings.apiKey) return json(response, 400, { error: `API key is required for ${settings.provider}` });
  const outbound = createProviderRequest(settings, payload);
  {
    const upstream = await postJson(outbound.url, outbound.headers, outbound.body);
    const text = upstream.text;
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) return json(response, upstream.status, { error: data.error?.message || data.message || text.slice(0, 1000) || `Provider HTTP ${upstream.status}` });
    const plan = validateAgentPlan(extractJson(extractProviderText(settings.provider, data)));
    return json(response, 200, { plan, usage: data.usage || null, provider: settings.provider, model: settings.model });
  }
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const requested = decoded === '/'
    ? '/index.html'
    : decoded === '/cadJS' || decoded === '/cadJS/'
      ? '/cadJS/index.html'
      : decoded;
  const absolute = normalize(resolve(REPO_ROOT, `.${requested}`));
  return absolute === REPO_ROOT || absolute.startsWith(`${REPO_ROOT}${sep}`) ? absolute : null;
}

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/api/agent' && request.method === 'POST') return await agentRequest(request, response);
    if (request.url === '/api/agent/providers') return json(response, 200, { providers: ['local', 'mcp', 'openai', 'openrouter', 'anthropic'], protocol: 1 });
    if (request.url === '/api/agent/schema') return json(response, 200, agentProtocolSchema());
    if (request.url === '/api/overrides') return await overridesRequest(request, response);
    if (request.url === '/api/catalog' || request.url === '/api/catalog/refresh') {
      const catalog = await scanCatalog();
      return json(response, 200, catalog);
    }
    if (request.url === '/api/health') {
      return json(response, 200, { ok: true, app: 'cadJS', repoRoot: REPO_ROOT, time: new Date().toISOString() });
    }
    const absolute = safePath(request.url || '/');
    if (!absolute || !existsSync(absolute) || !statSync(absolute).isFile()) {
      return json(response, 404, { error: 'Not found' });
    }
    response.writeHead(200, {
      'Content-Type': MIME[extname(absolute).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': absolute.includes(`${sep}cadJS${sep}`) ? 'no-store' : 'no-cache'
    });
    createReadStream(absolute).pipe(response);
  } catch (error) {
    json(response, 500, { error: error.message });
  }
});

if (process.env.CADJS_VALIDATE !== '1') {
  server.listen(PORT, HOST, () => {
    console.log(`cadJS: http://${HOST}:${PORT}/cadJS/`);
    console.log(`game:  http://${HOST}:${PORT}/`);
    console.log(`root:  ${REPO_ROOT}`);
  });
}

export { scanCatalog, safePath, server };