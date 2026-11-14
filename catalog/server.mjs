// Optional local persistence + AI relay. Mounted by the existing cadJS server;
// the catalog itself also runs on any ordinary static HTTP server.
import { readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRecords, emptyWorkspace, validateWorkspace } from './js/model.mjs';
import { builtinPlan, buildContext, callProvider, parsePlan, probeProvider } from './js/assistant.mjs';
import { getAssetCapabilities } from './js/asset-loader.mjs';
import { emptyOverrides, validateOverrides, serializeOverrides } from './js/kit-overrides.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PREFIX = '/api/asset-library';
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const error = (message, status = 400) => Object.assign(new Error(message), { status });
async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 * 1024) throw error('Request exceeds 2 MB.', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw error('Send a JSON request body.'); }
}

/** The registered kit ids, read as text from src/kit/<family>/*.js (`defineAsset({ id: '…'`). Never evaluated. */
export async function scanKitIds(repoRoot) {
  const ids = new Set(), kit = resolve(repoRoot, 'src/kit');
  let entries = [];
  try { entries = await readdir(kit, { withFileTypes: true }); } catch { return ids; }
  for (const dir of entries.filter((e) => e.isDirectory())) {
    for (const file of (await readdir(resolve(kit, dir.name))).filter((f) => f.endsWith('.js'))) {
      const text = await readFile(resolve(kit, dir.name, file), 'utf8');
      for (const m of text.matchAll(/defineAsset\(\s*\{\s*id:\s*['"]([a-z0-9-]+)['"]/g)) ids.add(m[1]);
    }
  }
  return ids;
}
const revisionOf = (text) => text == null ? 'none' : createHash('sha256').update(text).digest('hex').slice(0, 16);

export function createAssetLibraryApi({ repoRoot = DEFAULT_ROOT, fetchImpl = fetch, capabilities = getAssetCapabilities, kitIds = null } = {}) {
  const overridesPath = resolve(repoRoot, 'kit-overrides.json');
  const readKitIds = async () => kitIds ? new Set(kitIds) : scanKitIds(repoRoot);
  const readOverridesText = async () => { try { return await readFile(overridesPath, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
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
      if (pathname === PREFIX + '/kit-overrides' && req.method === 'GET') {
        const text = await readOverridesText(), allow = await readKitIds();
        let overrides = emptyOverrides();
        if (text != null) { try { overrides = validateOverrides(JSON.parse(text)); } catch (e) { throw error('kit-overrides.json on disk is not usable: ' + e.message, 422); } }
        json(res, 200, { overrides, revision: revisionOf(text), exists: text != null, kitIds: [...allow].sort() }); return true;
      }
      if (pathname === PREFIX + '/kit-overrides' && req.method === 'POST') {
        const payload = await body(req), allow = await readKitIds();
        if (!allow.size) throw error('No kit assets are registered, so nothing can be published.', 409);
        let proposed; try { proposed = validateOverrides(payload.overrides, allow); } catch (e) { throw error('Not saved: ' + e.message); }
        // Same atomic, serialized compare-and-write as the workspace: the revision is a hash of the file bytes ('none' when absent).
        const operation = writeQueue.then(async () => {
          const current = revisionOf(await readOverridesText());
          if (payload.revision !== current) throw error(`kit-overrides.json changed on disk (${current}, you edited ${payload.revision}). Reload before saving.`, 409);
          const text = serializeOverrides(proposed), temporary = overridesPath + '.tmp-' + process.pid + '-' + Date.now();
          try { await writeFile(temporary, text); await rename(temporary, overridesPath); }
          finally { await unlink(temporary).catch(() => {}); }
          return { overrides: proposed, revision: revisionOf(text), exists: true };
        });
        writeQueue = operation.catch(() => {});
        json(res, 200, await operation); return true;
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
