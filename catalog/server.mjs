// Optional local persistence + AI relay. Mounted by the existing cadJS server;
// the catalog itself also runs on any ordinary static HTTP server.
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRecords, emptyWorkspace, validateWorkspace } from './js/model.mjs';
import { builtinPlan, buildContext, callProvider, parsePlan, probeProvider } from './js/assistant.mjs';
import { getAssetCapabilities } from './js/asset-loader.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PREFIX = '/api/asset-library';
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const error = (message, status = 400) => Object.assign(new Error(message), { status });
async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 * 1024) throw error('Request exceeds 2 MB.', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw error('Send a JSON request body.'); }
}

export function createAssetLibraryApi({ repoRoot = DEFAULT_ROOT, fetchImpl = fetch, capabilities = getAssetCapabilities } = {}) {
  const inventoryPath = resolve(repoRoot, 'labs/asset_inventory.json'), workspacePath = resolve(repoRoot, 'catalog/metadata.json');
  let writeQueue = Promise.resolve();
  const readInventory = async () => JSON.parse(await readFile(inventoryPath, 'utf8'));
  const readWorkspace = async (ids) => {
    try { return validateWorkspace(JSON.parse(await readFile(workspacePath, 'utf8')), ids); }
    catch (e) { if (e.code === 'ENOENT') return emptyWorkspace(); throw e; }
  };
  return async function assetLibraryApi(req, res) {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (!pathname.startsWith(PREFIX + '/')) return false;
    try {
      if (pathname === PREFIX + '/health' && req.method === 'GET') { json(res, 200, { ok: true, app: 'michi-asset-library', persistence: 'repository', ai: 'relay' }); return true; }
      if (req.method !== 'GET' && req.method !== 'POST') throw error('Use GET or POST.', 405);
      if (req.method === 'POST') {
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw error('Content-Type must be application/json.', 415);
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw error('Open the catalog on this local server before saving.', 403);
      }
      const inventory = await readInventory(), ids = inventory.assets.map((a) => a.id);
      if (pathname === PREFIX + '/workspace' && req.method === 'GET') {
        json(res, 200, { workspace: await readWorkspace(ids), reviewedAt: inventory.reviewedAt }); return true;
      }
      if (pathname === PREFIX + '/workspace' && req.method === 'POST') {
        const payload = await body(req), proposed = validateWorkspace(payload.workspace, ids);
        // Serialize the compare-and-write so two tabs cannot both overwrite the
        // same repository revision. A conflict preserves the browser draft.
        const operation = writeQueue.then(async () => {
          const current = await readWorkspace(ids);
          if (proposed.revision !== current.revision) throw error(`Repository revision ${current.revision} differs from your draft (${proposed.revision}). Reload or merge before saving.`, 409);
          const next = { ...proposed, revision: current.revision + 1, updatedAt: new Date().toISOString() };
          const temporary = workspacePath + '.tmp-' + process.pid + '-' + Date.now();
          try { await writeFile(temporary, JSON.stringify(next, null, 2) + '\n'); await rename(temporary, workspacePath); }
          finally { await unlink(temporary).catch(() => {}); }
          return next;
        });
        writeQueue = operation.catch(() => {});
        json(res, 200, { workspace: await operation }); return true;
      }
      if (pathname === PREFIX + '/ai' && req.method === 'POST') {
        const payload = await body(req);
        const instruction = String(payload.instruction || '').trim();
        if (!instruction || instruction.length > 12000) throw error('Enter a prompt of 1–12,000 characters.');
        const workspace = payload.workspace ? validateWorkspace(payload.workspace, ids) : await readWorkspace(ids);
        const records = createRecords(inventory, workspace, capabilities);
        const selectedIds = (payload.selectedIds || []).filter((id) => ids.includes(id)).slice(0, 190);
        if (payload.settings?.provider === 'builtin' || !payload.settings) {
          json(res, 200, { plan: builtinPlan(instruction, records, selectedIds), provider: 'builtin', model: 'catalog-guide' }); return true;
        }
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 120000);
        req.on('aborted', () => controller.abort());
        try {
          const response = await callProvider(payload.settings, { instruction, context: buildContext(records, selectedIds, (payload.visibleIds || []).filter((id) => ids.includes(id))), history: (Array.isArray(payload.history) ? payload.history : []).slice(-4).map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content).slice(0, 3000) })) }, { fetchImpl, signal: controller.signal });
          json(res, 200, { ...response, text: undefined, plan: parsePlan(response.text, records) });
        } finally { clearTimeout(timeout); }
        return true;
      }
      if (pathname === PREFIX + '/probe' && req.method === 'POST') {
        const payload = await body(req);
        if (payload.settings?.provider === 'builtin') json(res, 200, { provider: 'builtin', models: ['catalog-guide'] });
        else json(res, 200, await probeProvider(payload.settings, { fetchImpl, signal: AbortSignal.timeout(8000) }));
        return true;
      }
      throw error('Catalog API route not found.', 404);
    } catch (e) {
      json(res, e.status || (e.name === 'AbortError' || e.name === 'TimeoutError' ? 504 : 400), { error: e.name === 'AbortError' ? 'The provider request was cancelled or timed out.' : e.message });
      return true;
    }
  };
}
