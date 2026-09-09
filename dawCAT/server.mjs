/* dawCAT — static file server + AI agent proxy.
   Mirrors cadJS's server.mjs: serves the whole repo (so dawCAT at /dawCAT/ and
   the game at / share one origin, same as `python -m http.server`) and adds
   one POST endpoint, /api/agent, that builds the provider request server-side
   and forwards it — this is what lets the browser talk to Anthropic/OpenAI/a
   local llama-server without hitting CORS, and keeps API keys out of the
   page's own network tab origin restrictions. Zero npm dependencies — only
   Node builtins. */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentProtocolSchema, createProviderRequest, extractJson, extractProviderText, normalizeAgentSettings, validateAgentPlan } from './src/agent-protocol.js';

const APP_ROOT = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(APP_ROOT, '..');
const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || '127.0.0.1';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif'
};

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(request, limit = 1024 * 1024) {
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function postJson(urlValue, headers, body, timeout = 120000) {
  return new Promise((resolvePromise, reject) => {
    const url = new URL(urlValue); const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = transport(url, { method: 'POST', headers }, (response) => {
      const chunks = []; response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolvePromise({ status: response.statusCode || 500, ok: (response.statusCode || 500) >= 200 && (response.statusCode || 500) < 300, text: Buffer.concat(chunks).toString('utf8') }));
    });
    request.setTimeout(timeout, () => request.destroy(new Error('Provider request timed out')));
    request.on('error', reject); request.end(JSON.stringify(body));
  });
}

async function agentRequest(request, response) {
  const payload = await readJsonBody(request);
  const settings = normalizeAgentSettings(payload.settings);
  if (!payload.instruction?.trim()) return json(response, 400, { error: 'Instruction is required' });
  if (!['local', 'custom'].includes(settings.provider) && !settings.apiKey) return json(response, 400, { error: `API key is required for ${settings.provider}` });
  const outbound = createProviderRequest(settings, payload);
  const upstream = await postJson(outbound.url, outbound.headers, outbound.body);
  const text = upstream.text;
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!upstream.ok) return json(response, upstream.status, { error: data.error?.message || data.message || text.slice(0, 1000) || `Provider HTTP ${upstream.status}` });
  const plan = validateAgentPlan(extractJson(extractProviderText(settings.provider, data)));
  return json(response, 200, { plan, usage: data.usage || null, provider: settings.provider, model: settings.model });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const requested = decoded === '/'
    ? '/index.html'
    : decoded === '/dawCAT' || decoded === '/dawCAT/'
      ? '/dawCAT/index.html'
      : decoded;
  const absolute = normalize(resolve(REPO_ROOT, `.${requested}`));
  return absolute === REPO_ROOT || absolute.startsWith(`${REPO_ROOT}${sep}`) ? absolute : null;
}

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/api/agent' && request.method === 'POST') return await agentRequest(request, response);
    if (request.url === '/api/agent/providers') return json(response, 200, { providers: ['local', 'custom', 'openai', 'openrouter', 'anthropic'], protocol: 1 });
    if (request.url === '/api/agent/schema') return json(response, 200, agentProtocolSchema());
    if (request.url === '/api/health') return json(response, 200, { ok: true, app: 'dawCAT', repoRoot: REPO_ROOT, time: new Date().toISOString() });
    const absolute = safePath(request.url || '/');
    if (!absolute || !existsSync(absolute) || !statSync(absolute).isFile()) return json(response, 404, { error: 'Not found' });
    response.writeHead(200, {
      'Content-Type': MIME[extname(absolute).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': absolute.includes(`${sep}dawCAT${sep}`) ? 'no-store' : 'no-cache'
    });
    createReadStream(absolute).pipe(response);
  } catch (error) {
    json(response, 500, { error: error.message });
  }
});

if (process.env.DAWCAT_VALIDATE !== '1') {
  server.listen(PORT, HOST, () => {
    console.log(`dawCAT: http://${HOST}:${PORT}/dawCAT/`);
    console.log(`game:   http://${HOST}:${PORT}/`);
    console.log(`root:   ${REPO_ROOT}`);
  });
}

export { safePath, server };
