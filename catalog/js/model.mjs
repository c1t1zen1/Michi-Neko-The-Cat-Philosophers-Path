// Shared browser/server catalog model. Audited source evidence stays immutable;
// production notes, ownership, status and collections live in a separate overlay.
export const FORMAT = 'michi-asset-workspace';
export const VERSION = 1;
export const COVERAGE = {
  direct: { label: 'Focused study', short: 'In labs', color: 'sage' },
  review: { label: 'Review sheet', short: 'Review', color: 'blue' },
  embedded: { label: 'Embedded reference', short: 'Embedded', color: 'sand' },
  related: { label: 'Related evidence', short: 'Related', color: 'amber' },
  missing: { label: 'No study yet', short: 'No study', color: 'rose' }
};
export const STATUSES = {
  untriaged: 'Untriaged', research: 'Research', modeling: 'In progress', review: 'In review', approved: 'Approved'
};
export const PRIORITIES = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };
const LEVELS = Object.keys(COVERAGE);
const FIELDS = new Set(['id', 'group', 'coverage', 'status', 'owner', 'tag', 'source', 'lifecycle', 'has', 'cad', 'is', 'priority']);
const ALIASES = { category: 'group', type: 'group', tags: 'tag', life: 'lifecycle' };
const clean = (s, max = 200) => String(s ?? '').trim().slice(0, max);
export const fold = (s) => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const coverageLevel = (asset) => LEVELS.find((level) => asset.coverage.some((c) => c.level === level)) || 'missing';
export const emptyWorkspace = () => ({ format: FORMAT, version: VERSION, revision: 0, updatedAt: null, assets: {}, collections: [], views: [], activity: [] });
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

export function normalizePatch(input = {}) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'An asset update must be an object.');
  const allowed = new Set(['status', 'owner', 'priority', 'tags', 'notes', 'favorite', 'updatedAt']);
  for (const key of Object.keys(input)) assert(allowed.has(key), `Unsupported asset field: ${key}`);
  const patch = {};
  if ('status' in input) { assert(Object.hasOwn(STATUSES, input.status), 'Unknown production status.'); patch.status = input.status; }
  if ('priority' in input) { assert(Object.hasOwn(PRIORITIES, input.priority), 'Unknown priority.'); patch.priority = input.priority; }
  if ('owner' in input) patch.owner = clean(input.owner, 120);
  if ('notes' in input) patch.notes = clean(input.notes, 12000);
  if ('favorite' in input) { assert(typeof input.favorite === 'boolean', 'Favorite must be true or false.'); patch.favorite = input.favorite; }
  if ('tags' in input) {
    assert(Array.isArray(input.tags) && input.tags.length <= 30, 'Use up to 30 tags per asset.');
    patch.tags = [...new Set(input.tags.map((tag) => clean(tag, 60)).filter(Boolean))];
  }
  if ('updatedAt' in input) { assert(!input.updatedAt || Number.isFinite(Date.parse(input.updatedAt)), 'Invalid update date.'); patch.updatedAt = input.updatedAt || null; }
  return patch;
}

export function validateWorkspace(input, assetIds) {
  assert(input?.format === FORMAT && input.version === VERSION, 'Choose a Michi asset workspace JSON export (version 1).');
  assert(Number.isSafeInteger(input.revision) && input.revision >= 0, 'Invalid workspace revision.');
  const ids = new Set(assetIds), out = emptyWorkspace();
  out.revision = input.revision;
  out.updatedAt = input.updatedAt ? new Date(input.updatedAt).toISOString() : null;
  assert(input.assets && typeof input.assets === 'object' && !Array.isArray(input.assets), 'Invalid asset notes.');
  assert(Object.keys(input.assets).length <= ids.size, 'Too many asset records.');
  for (const [id, patch] of Object.entries(input.assets)) {
    assert(ids.has(id), `Unknown asset: ${id}`);
    out.assets[id] = normalizePatch(patch);
  }
  for (const field of ['collections', 'views', 'activity']) assert(Array.isArray(input[field] || []), `${field} must be an array.`);
  assert((input.collections || []).length <= 100 && (input.views || []).length <= 100, 'Use up to 100 collections or saved views.');
  const unique = new Set();
  out.collections = (input.collections || []).map((c) => {
    const id = clean(c.id, 100);
    assert(/^[a-z0-9][a-z0-9-]*$/.test(id) && !unique.has(id), 'Collection IDs must be unique lowercase slugs.'); unique.add(id);
    assert(clean(c.name), 'A collection needs a name.');
    assert(Array.isArray(c.assetIds) && c.assetIds.length <= ids.size, 'Invalid collection members.');
    assert(c.assetIds.every((assetId) => ids.has(assetId)), `Collection ${c.name} contains unknown assets.`);
    return { id, name: clean(c.name, 100), assetIds: [...new Set(c.assetIds)] };
  });
  unique.clear();
  out.views = (input.views || []).map((view) => {
    const id = clean(view.id, 100);
    assert(/^[a-z0-9][a-z0-9-]*$/.test(id) && !unique.has(id), 'Saved view IDs must be unique lowercase slugs.'); unique.add(id);
    assert(clean(view.name), 'A saved view needs a name.');
    return { id, name: clean(view.name, 100), query: clean(view.query, 2000), group: clean(view.group, 100), coverage: clean(view.coverage, 30), status: clean(view.status, 30), lifecycle: ['active', 'inactive', 'all'].includes(view.lifecycle) ? view.lifecycle : 'active' };
  });
  out.activity = (input.activity || []).slice(-200).map((a) => ({ at: clean(a.at, 50), action: clean(a.action, 300), assetIds: (Array.isArray(a.assetIds) ? a.assetIds : []).filter((id) => ids.has(id)).slice(0, ids.size) }));
  return out;
}

export function createRecords(inventory, workspace = emptyWorkspace(), capabilities = () => ({})) {
  return inventory.assets.map((asset) => {
    const metadata = { status: 'untriaged', owner: '', priority: 'normal', tags: [], notes: '', favorite: false, updatedAt: null, ...(workspace.assets[asset.id] || {}) };
    const targets = asset.coverage.map((mapping) => ({ ...inventory.targets[mapping.target], ...mapping, targetId: mapping.target }));
    const record = { ...asset, metadata, targets, coverageLevel: coverageLevel(asset), capabilities: capabilities(asset) };
    record.searchText = fold([asset.id, asset.label, asset.group, asset.note, metadata.owner, metadata.notes, ...metadata.tags, ...asset.sources.flatMap((s) => [s.file, s.anchor]), ...targets.flatMap((t) => [t.lab, t.selector])].filter(Boolean).join(' '));
    return record;
  });
}

export function parseQuery(query = '') {
  const tokens = [], errors = [];
  const pattern = /(-?)(?:([\w-]+):)?("(?:\\.|[^"\\])*"|[^\s"]+)/g;
  const text = String(query).trim();
  if ((text.match(/(?<!\\)"/g) || []).length % 2) errors.push('Close the quoted search phrase.');
  for (const m of text.matchAll(pattern)) {
    const rawField = (m[2] || '').toLowerCase();
    const field = ALIASES[rawField] || rawField;
    if (field && !FIELDS.has(field)) errors.push(`Unknown search field “${field}”.`);
    const raw = m[3].startsWith('"') ? m[3].slice(1, -1).replace(/\\(["\\])/g, '$1') : m[3];
    tokens.push({ not: m[1] === '-', field, values: raw.split('|').map(fold).filter(Boolean) });
  }
  return { tokens, errors };
}

function matchesValue(asset, field, value) {
  const meta = asset.metadata;
  if (!field) return asset.searchText.includes(value);
  if (field === 'id') return fold(asset.id).includes(value);
  if (field === 'group') return fold(asset.group).includes(value);
  if (field === 'coverage') return asset.coverageLevel === value || fold(COVERAGE[asset.coverageLevel].label).includes(value);
  if (field === 'status') return meta.status === value || fold(STATUSES[meta.status]).includes(value);
  if (field === 'owner') return value === 'none' ? !meta.owner : fold(meta.owner).includes(value);
  if (field === 'tag') return meta.tags.some((t) => fold(t) === value);
  if (field === 'source') return asset.sources.some((s) => fold(s.file + ' ' + s.anchor).includes(value));
  if (field === 'lifecycle') return asset.lifecycle === value;
  if (field === 'priority') return meta.priority === value;
  if (field === 'cad') return value === 'original' ? !!asset.capabilities.original : value === 'lab' ? !!asset.capabilities.lab : value === 'yes' ? !!(asset.capabilities.original || asset.capabilities.lab) : !(asset.capabilities.original || asset.capabilities.lab);
  if (field === 'is') return value === 'favorite' ? meta.favorite : value === 'gap' ? asset.coverageLevel !== 'direct' : false;
  if (field === 'has') return value === 'lab' ? asset.coverageLevel === 'direct' : value === 'notes' ? !!meta.notes : value === 'owner' ? !!meta.owner : value === 'tags' ? !!meta.tags.length : value === 'cad' ? !!(asset.capabilities.original || asset.capabilities.lab) : false;
  return false;
}

export function searchAssets(records, options = {}) {
  const { query = '', group = '', coverage = '', status = '', lifecycle = 'active', sort = 'label', assetIds = null } = options;
  const { tokens } = parseQuery(query), ids = assetIds ? new Set(assetIds) : null;
  const rows = records.filter((asset) => {
    if (lifecycle !== 'all' && asset.lifecycle !== lifecycle) return false;
    if (group && asset.group !== group) return false;
    if (coverage && asset.coverageLevel !== coverage) return false;
    if (status && asset.metadata.status !== status) return false;
    if (ids && !ids.has(asset.id)) return false;
    return tokens.every((token) => token.not !== token.values.some((v) => matchesValue(asset, token.field, v)));
  });
  const textQuery = tokens.filter((t) => !t.field && !t.not).flatMap((t) => t.values).join(' ');
  const score = (a) => textQuery && (fold(a.id) === textQuery ? 4 : fold(a.label).startsWith(textQuery) ? 3 : fold(a.label).includes(textQuery) ? 2 : 0);
  rows.sort((a, b) => {
    if (sort === 'updated') return (Date.parse(b.metadata.updatedAt) || 0) - (Date.parse(a.metadata.updatedAt) || 0) || a.label.localeCompare(b.label);
    if (sort === 'coverage') return LEVELS.indexOf(a.coverageLevel) - LEVELS.indexOf(b.coverageLevel) || a.label.localeCompare(b.label);
    if (sort === 'group') return a.group.localeCompare(b.group) || a.label.localeCompare(b.label);
    return score(b) - score(a) || a.label.localeCompare(b.label);
  });
  return rows;
}

export function summarize(records) {
  const active = records.filter((a) => a.lifecycle === 'active');
  return { total: records.length, active: active.length, inactive: records.length - active.length, focused: active.filter((a) => a.coverageLevel === 'direct').length, gaps: active.filter((a) => a.coverageLevel !== 'direct').length, editable: active.filter((a) => a.capabilities.original || a.capabilities.lab).length };
}

export function updateAssets(workspace, ids, patch, { at = new Date().toISOString(), action = 'Updated asset details' } = {}) {
  const next = structuredClone(workspace), normalized = normalizePatch(patch);
  for (const id of ids) next.assets[id] = { ...(next.assets[id] || {}), ...normalized, updatedAt: at };
  next.updatedAt = at;
  next.activity = [...next.activity, { at, action, assetIds: [...ids] }].slice(-200);
  return next;
}

// Used for explicit workspace imports and revision-conflict recovery. The
// incoming draft wins for matching records; unrelated repository work survives.
export function mergeWorkspaces(base, incoming) {
  const next = structuredClone(base);
  Object.assign(next.assets, incoming.assets);
  for (const field of ['collections', 'views']) next[field] = [...new Map([...next[field], ...incoming[field]].map((entry) => [entry.id, entry])).values()];
  next.activity = [...new Map([...next.activity, ...incoming.activity].map((a) => [JSON.stringify(a), a])).values()].slice(-200);
  next.revision = base.revision;
  return next;
}

export function exportCSV(records) {
  const quote = (s) => { const value = String(s ?? ''); return '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"'; };
  const rows = [['Asset ID', 'Asset', 'Category', 'Lifecycle', 'Coverage', 'Production status', 'Owner', 'Priority', 'Tags', 'Notes', 'Game source', 'Lab evidence']];
  for (const a of records) rows.push([a.id, a.label, a.group, a.lifecycle, COVERAGE[a.coverageLevel].label, STATUSES[a.metadata.status], a.metadata.owner, a.metadata.priority, a.metadata.tags.join('; '), a.metadata.notes, a.sources.map((s) => s.file).join('; '), a.targets.map((t) => t.targetId + ' (' + t.level + ')').join('; ')]);
  return '\uFEFF' + rows.map((r) => r.map(quote).join(',')).join('\r\n');
}

export function makeSlug(value, existing = []) {
  const base = fold(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'collection';
  let id = base, i = 2;
  while (existing.includes(id)) id = base + '-' + i++;
  return id;
}
