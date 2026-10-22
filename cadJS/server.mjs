import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalog, normalizePath } from './src/catalog.mjs';
import {
  AGENT_PROTOCOL_VERSION, PROVIDER_CATALOG, agentProtocolSchema, createProviderRequest,
  extractJson, extractProviderReasoning, extractProviderText, normalizeAgentSettings,
  synthesizeBuiltinPlan, validateAgentPlan
} from './src/agent-protocol.mjs';

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

function getJson(urlValue, headers = {}, timeout = 4500) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlValue); const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = transport(url, { method:'GET', headers }, (response) => {
      const chunks = []; response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = null; try { data = JSON.parse(text); } catch {}
        resolve({ status:response.statusCode || 500, ok:(response.statusCode || 500) >= 200 && (response.statusCode || 500) < 300, text, data });
      });
    });
    request.setTimeout(timeout, () => request.destroy(new Error('Probe timed out')));
    request.on('error', reject); request.end();
  });
}

const LOCAL_PROBES = [
  { provider: 'local', label: 'llama-server (:8080)', baseUrl: 'http://127.0.0.1:8080/v1', healthUrl: 'http://127.0.0.1:8080/health', propsUrl: 'http://127.0.0.1:8080/props', modelsUrl: 'http://127.0.0.1:8080/v1/models' },
  { provider: 'local', label: 'llama-server (:8081)', baseUrl: 'http://127.0.0.1:8081/v1', healthUrl: 'http://127.0.0.1:8081/health', propsUrl: 'http://127.0.0.1:8081/props', modelsUrl: 'http://127.0.0.1:8081/v1/models' },
  { provider: 'ollama', label: 'Ollama (:11434)', baseUrl: 'http://127.0.0.1:11434/v1', modelsUrl: 'http://127.0.0.1:11434/api/tags' },
  { provider: 'lmstudio', label: 'LM Studio (:1234)', baseUrl: 'http://127.0.0.1:1234/v1', modelsUrl: 'http://127.0.0.1:1234/v1/models' }
];

async function probeSingleEndpoint(entry, headers = {}) {
  const start = Date.now();
  try {
    const modelsRes = await getJson(entry.modelsUrl, headers, 2500);
    if (!modelsRes.ok && entry.healthUrl) {
      const healthRes = await getJson(entry.healthUrl, headers, 2000);
      if (!healthRes.ok) return null;
    } else if (!modelsRes.ok) {
      return null;
    }
    const latencyMs = Date.now() - start;
    const models = [];
    if (Array.isArray(modelsRes.data?.data)) {
      for (const m of modelsRes.data.data) if (m?.id) models.push(String(m.id));
    } else if (Array.isArray(modelsRes.data?.models)) {
      for (const m of modelsRes.data.models) if (m?.name || m?.model || m?.id) models.push(String(m.name || m.model || m.id).replace(/^models\//, ''));
    }
    let serverProps = null;
    if (entry.propsUrl) {
      try {
        const propsRes = await getJson(entry.propsUrl, headers, 1500);
        if (propsRes.ok && propsRes.data) {
          serverProps = {
            modelAlias: propsRes.data.model_alias || propsRes.data.default_generation_settings?.model || null,
            nCtx: propsRes.data.default_generation_settings?.n_ctx || null,
            modalities: propsRes.data.modalities || null
          };
          if (serverProps.modelAlias && !models.includes(serverProps.modelAlias)) models.unshift(serverProps.modelAlias);
        }
      } catch {}
    }
    return {
      online: true,
      provider: entry.provider,
      label: entry.label,
      baseUrl: entry.baseUrl,
      latencyMs,
      models: models.length ? models : [PROVIDER_CATALOG[entry.provider]?.model || 'local-model'],
      serverProps
    };
  } catch {
    return null;
  }
}

async function probeRequest(request, response) {
  const payload = request.method === 'POST' ? await readJsonBody(request) : {};
  const settings = normalizeAgentSettings(payload.settings || {});

  if (settings.provider === 'builtin') {
    return json(response, 200, {
      online: true,
      provider: 'builtin',
      label: 'Built-in Instant CAD Copilot',
      baseUrl: 'builtin://procedural-engine',
      latencyMs: 1,
      models: ['cadjs-kyoto-architect-v2'],
      discovered: []
    });
  }

  // Also scan known local servers in parallel
  const discovered = (await Promise.all(LOCAL_PROBES.map((item) => probeSingleEndpoint(item)))).filter(Boolean);

  // Probe the user's currently configured baseUrl
  const headers = {};
  if (settings.apiKey) {
    if (settings.provider === 'anthropic') {
      headers['x-api-key'] = settings.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (settings.provider !== 'gemini') {
      headers.authorization = `Bearer ${settings.apiKey}`;
    }
  }
  const base = settings.baseUrl.replace(/\/+$/, '');
  const origin = base.replace(/\/v1(?:beta)?$/, '');
  const modelsUrl = settings.provider === 'gemini' && !base.includes('/openai')
    ? `${base}/models?key=${encodeURIComponent(settings.apiKey)}`
    : `${base}/models`;
  const customProbe = await probeSingleEndpoint({
    provider: settings.provider,
    label: PROVIDER_CATALOG[settings.provider]?.label || settings.provider,
    baseUrl: base,
    healthUrl: ['local', 'mcp'].includes(settings.provider) ? `${origin}/health` : null,
    propsUrl: settings.provider === 'local' ? `${origin}/props` : null,
    modelsUrl
  }, headers);

  if (customProbe) {
    return json(response, 200, { ...customProbe, discovered });
  }
  if (discovered.length && ['local', 'ollama', 'lmstudio'].includes(settings.provider)) {
    return json(response, 200, { ...discovered[0], autoSwitched: true, discovered });
  }
  return json(response, 200, {
    online: false,
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    models: PROVIDER_CATALOG[settings.provider]?.popularModels || [settings.model],
    discovered,
    hint: ['local', 'ollama', 'lmstudio'].includes(settings.provider)
      ? 'No local LLM server responded on :8080, :11434, or :1234. Start llama-server (e.g. llama-server -m model.gguf --port 8080) or switch to Built-in Instant CAD Copilot.'
      : 'Endpoint did not respond to /models probe (or requires a valid API key).'
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

  if (settings.provider === 'builtin') {
    const plan = synthesizeBuiltinPlan(payload);
    return json(response, 200, { plan, usage: null, provider: 'builtin', model: settings.model, builtin: true });
  }

  const providerMeta = PROVIDER_CATALOG[settings.provider];
  if (providerMeta?.requiresKey && !settings.apiKey) {
    return json(response, 400, { error: `API key is required for ${providerMeta.label || settings.provider}` });
  }

  const outbound = createProviderRequest(settings, payload);
  try {
    let upstream = await postJson(outbound.url, outbound.headers, outbound.body);
    // If a local server (llama-server/Ollama/LM Studio) rejected response_format or multimodal array content, retry with plain string content
    if (!upstream.ok && ['local', 'ollama', 'lmstudio', 'mcp'].includes(settings.provider)) {
      const fallbackBody = { ...outbound.body };
      delete fallbackBody.response_format;
      if (Array.isArray(fallbackBody.messages?.[0]?.content)) {
        const textPart = fallbackBody.messages[0].content.find((item) => item.type === 'text');
        if (textPart) fallbackBody.messages = [{ role: 'user', content: textPart.text }];
      }
      upstream = await postJson(outbound.url, outbound.headers, fallbackBody);
    }

    const text = upstream.text;
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) {
      return json(response, upstream.status, {
        error: data.error?.message || data.message || text.slice(0, 1000) || `Provider HTTP ${upstream.status}`
      });
    }
    const rawContent = extractProviderText(settings.provider, data);
    const reasoning = extractProviderReasoning(settings.provider, data, rawContent);
    const parsed = extractJson(rawContent);
    if (reasoning && !parsed.reasoning) parsed.reasoning = reasoning;
    const plan = validateAgentPlan(parsed);
    return json(response, 200, { plan, usage: data.usage || null, provider: settings.provider, model: settings.model });
  } catch (error) {
    if (settings.fallbackToBuiltin && ['local', 'ollama', 'lmstudio'].includes(settings.provider)) {
      const plan = synthesizeBuiltinPlan(payload);
      plan.notes = [
        `Local server (${settings.baseUrl}) was unreachable (${error.message}) — executed with Built-in Instant CAD Copilot.`,
        ...plan.notes
      ];
      return json(response, 200, { plan, usage: null, provider: 'builtin-fallback', model: 'cadjs-kyoto-architect-v2', fallback: true });
    }
    return json(response, 502, { error: `Connection to ${settings.provider} (${settings.baseUrl}) failed: ${error.message}` });
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
    if (request.url === '/api/agent/probe') return await probeRequest(request, response);
    if (request.url === '/api/agent/providers') {
      return json(response, 200, {
        providers: Object.keys(PROVIDER_CATALOG),
        catalog: PROVIDER_CATALOG,
        protocol: AGENT_PROTOCOL_VERSION
      });
    }
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