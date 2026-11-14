export const ASSET_PACKAGE_FORMAT = 'cadjs-asset-package';
export const ASSET_PACKAGE_SCHEMA_VERSION = 2;
export const SUPPORTED_SCHEMA_VERSIONS = [1, 2];
export const STRUCTURE_OPS = ['create', 'remove', 'reparent'];
export const CREATE_KINDS = ['Group', 'Mesh'];
export const ASSET_CONTRACT_VERSION = 1;

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const ASSET_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function hashValue(value) {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function normalizeAssetId(value, fallback = 'asset.untitled') {
  const normalized = String(value || '').trim().toLowerCase()
    .replace(/\s*[\\/]+\s*/g, '.')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .replace(/[._-]{2,}/g, '.');
  return normalized && ASSET_ID.test(normalized) ? normalized : fallback;
}

export function isSemanticVersion(value) {
  return SEMVER.test(String(value || ''));
}

function packageWithoutChecksum(input) {
  const output = { ...input };
  delete output.checksum;
  return output;
}

export function createAssetPackage(input = {}) {
  const assetId = normalizeAssetId(input.assetId);
  const packageVersion = String(input.packageVersion || '0.1.0');
  if (!isSemanticVersion(packageVersion)) throw new Error('Package version must use semantic versioning, for example 0.1.0');
  const objectChanges = input.changes?.objects && typeof input.changes.objects === 'object' ? input.changes.objects : {};
  const output = {
    format: ASSET_PACKAGE_FORMAT,
    schemaVersion: ASSET_PACKAGE_SCHEMA_VERSION,
    packageVersion,
    assetId,
    assetType: String(input.assetType || 'three-object'),
    createdAt: String(input.createdAt || new Date().toISOString()),
    source: {
      module: String(input.source?.module || ''),
      symbol: String(input.source?.symbol || ''),
      baselineFingerprint: String(input.source?.baselineFingerprint || '')
    },
    compatibility: { assetContract: ASSET_CONTRACT_VERSION },
    parentPackage: input.parentPackage ? {
      version: String(input.parentPackage.version || ''),
      checksum: String(input.parentPackage.checksum || '')
    } : null,
    changes: { objects: objectChanges },
    structure: { ops: normalizeStructureOps(input.structure?.ops, assetId) },
    metadata: {
      author: String(input.metadata?.author || ''),
      notes: String(input.metadata?.notes || ''),
      ...(input.metadata?.migratedFrom ? { migratedFrom: Number(input.metadata.migratedFrom) } : {})
    }
  };
  output.checksum = hashValue(output);
  return output;
}

export function validateAssetPackage(input, options = {}) {
  if (!input || typeof input !== 'object') throw new Error('Asset package must be a JSON object');
  if (input.format !== ASSET_PACKAGE_FORMAT) throw new Error(`Expected ${ASSET_PACKAGE_FORMAT}`);
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(input.schemaVersion)) throw new Error(`Unsupported asset package schema ${input.schemaVersion}`);
  if (!isSemanticVersion(input.packageVersion)) throw new Error('Asset package has an invalid semantic version');
  if (!ASSET_ID.test(String(input.assetId || ''))) throw new Error('Asset package has an invalid assetId');
  if (input.compatibility?.assetContract !== ASSET_CONTRACT_VERSION) throw new Error(`Unsupported asset contract ${input.compatibility?.assetContract}`);
  if (!input.source || typeof input.source.baselineFingerprint !== 'string' || !input.source.baselineFingerprint) throw new Error('Asset package is missing its baseline fingerprint');
  if (!input.changes || !input.changes.objects || typeof input.changes.objects !== 'object' || Array.isArray(input.changes.objects)) throw new Error('Asset package changes.objects must be an object');
  const entries = Object.entries(input.changes.objects);
  if (entries.length > 4096) throw new Error('Asset package exceeds the 4096-object safety limit');
  for (const [semanticId, state] of entries) {
    if (!semanticId.startsWith(`${input.assetId}.`) && semanticId !== input.assetId) throw new Error(`Object ${semanticId} is outside asset ${input.assetId}`);
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error(`Object ${semanticId} has an invalid state`);
  }
  if (input.schemaVersion === 1 && input.structure !== undefined) throw new Error('Schema 1 packages cannot carry structure operations');
  const structure = input.schemaVersion === 2 ? normalizeStructureOps(input.structure?.ops, input.assetId, { strict: true }) : [];
  const expectedChecksum = hashValue(packageWithoutChecksum(input));
  if (!options.allowMissingChecksum && input.checksum !== expectedChecksum) throw new Error('Asset package checksum does not match its contents');
  return {
    ...input,
    source: { module:String(input.source.module || ''), symbol:String(input.source.symbol || ''), baselineFingerprint:input.source.baselineFingerprint },
    parentPackage: input.parentPackage || null,
    metadata: { author:String(input.metadata?.author || ''), notes:String(input.metadata?.notes || ''), ...(input.metadata?.migratedFrom ? { migratedFrom:Number(input.metadata.migratedFrom) } : {}) },
    ...(input.schemaVersion === 2 ? { structure: { ops: structure } } : {}),
    checksum: expectedChecksum
  };
}

/* ---------------------------------------------------- schema 2: structure --- */

const insideAsset = (assetId, id) => id === assetId || String(id).startsWith(`${assetId}.`);

/**
 * Normalise (and with `strict` validate) an ordered list of structure
 * operations: create { id, parent, kind, state? }, remove { id },
 * reparent { id, parent }. Ids are semantic ids inside the asset. The asset root
 * itself can be neither created, removed nor reparented. Throws when strict.
 */
export function normalizeStructureOps(ops, assetId, { strict = false } = {}) {
  if (ops === undefined || ops === null) return [];
  if (!Array.isArray(ops)) throw new Error('structure.ops must be an array');
  if (ops.length > 1024) throw new Error('Asset package exceeds the 1024-operation structure limit');
  return ops.map((raw, index) => {
    const at = `Structure operation ${index}`;
    if (!raw || typeof raw !== 'object' || !STRUCTURE_OPS.includes(raw.op)) throw new Error(`${at} must be create, remove or reparent`);
    const id = String(raw.id || '');
    if (!insideAsset(assetId, id) || id === assetId) throw new Error(`${at}: ${id || 'missing id'} is not a part of asset ${assetId}`);
    const op = { op: raw.op, id };
    if (raw.op !== 'remove') {
      const parent = String(raw.parent || '');
      if (!insideAsset(assetId, parent)) throw new Error(`${at}: parent ${parent || 'missing'} is outside asset ${assetId}`);
      if (parent === id) throw new Error(`${at}: ${id} cannot be its own parent`);
      op.parent = parent;
    }
    if (raw.op === 'create') {
      if (!CREATE_KINDS.includes(raw.kind)) throw new Error(`${at}: kind must be ${CREATE_KINDS.join(' or ')}`);
      op.kind = raw.kind;
      if (raw.state !== undefined) {
        if (!raw.state || typeof raw.state !== 'object' || Array.isArray(raw.state)) throw new Error(`${at}: state must be an object`);
        op.state = raw.state;
      }
    }
    return op;
  });
}

/**
 * Apply structure ops to a hierarchy ([{ id, parent }], the root has parent
 * null) and return the new hierarchy. Pure; throws on a duplicate create, a
 * missing id or parent, a reparent into the object's own subtree, or touching
 * the root. A removed part takes its descendants with it.
 */
export function applyStructureOps(hierarchy, ops, assetId) {
  const nodes = new Map(hierarchy.map((item) => [item.id, { id: item.id, parent: item.parent ?? null }]));
  const descendantsOf = (id) => {
    const out = new Set([id]);
    let grew = true;
    while (grew) { grew = false; for (const n of nodes.values()) if (n.parent && out.has(n.parent) && !out.has(n.id)) { out.add(n.id); grew = true; } }
    return out;
  };
  for (const [index, op] of ops.entries()) {
    const at = `Structure operation ${index} (${op.op} ${op.id})`;
    if (op.id === assetId) throw new Error(`${at}: the asset root cannot change`);
    if (op.op === 'create') {
      if (nodes.has(op.id)) throw new Error(`${at}: ${op.id} already exists`);
      if (!nodes.has(op.parent)) throw new Error(`${at}: parent ${op.parent} does not exist`);
      nodes.set(op.id, { id: op.id, parent: op.parent });
    } else if (op.op === 'remove') {
      if (!nodes.has(op.id)) throw new Error(`${at}: ${op.id} does not exist`);
      for (const id of descendantsOf(op.id)) nodes.delete(id);
    } else {
      if (!nodes.has(op.id)) throw new Error(`${at}: ${op.id} does not exist`);
      if (!nodes.has(op.parent)) throw new Error(`${at}: parent ${op.parent} does not exist`);
      if (descendantsOf(op.id).has(op.parent)) throw new Error(`${at}: ${op.parent} is inside ${op.id}`);
      nodes.get(op.id).parent = op.parent;
    }
  }
  return [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The ops that turn `baseline` into `current` (both [{ id, parent }]): topmost
 * removals first, then creates parent-before-child, then reparents. Created
 * parts get `kind` and `state` from `describe(id)` -> { kind, state }.
 */
export function diffHierarchy(baseline, current, assetId, describe = () => ({ kind: 'Group' })) {
  const before = new Map(baseline.map((n) => [n.id, n.parent ?? null])), after = new Map(current.map((n) => [n.id, n.parent ?? null]));
  const ops = [];
  // Only the topmost removal is listed: a removed part's descendants go with it.
  for (const [id, parent] of before) if (!after.has(id) && (parent === null || after.has(parent))) ops.push({ op: 'remove', id });
  const created = [...after.keys()].filter((id) => !before.has(id));
  const depth = (id) => { let d = 0, p = after.get(id); while (p != null) { d++; p = after.get(p); } return d; };
  created.sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));
  for (const id of created) { const { kind = 'Group', state } = describe(id) || {}; ops.push({ op: 'create', id, parent: after.get(id), kind, ...(state ? { state } : {}) }); }
  for (const [id, parent] of after) if (before.has(id) && before.get(id) !== parent) ops.push({ op: 'reparent', id, parent });
  return normalizeStructureOps(ops, assetId);
}

/**
 * Bring a schema 1 package to schema 2: no structure operations, a new
 * checksum, and `migratedFrom: 1` in the metadata. A schema 2 package comes
 * back unchanged. The input is validated first, so a corrupt v1 file fails here.
 */
export function migrateAssetPackage(input) {
  const valid = validateAssetPackage(input);
  if (valid.schemaVersion === 2) return valid;
  const migrated = {
    ...valid, schemaVersion: 2, structure: { ops: [] },
    metadata: { ...valid.metadata, migratedFrom: 1 },
    parentPackage: valid.parentPackage
  };
  delete migrated.checksum;
  migrated.checksum = hashValue(migrated);
  return validateAssetPackage(migrated);
}

export function evaluateAssetCompatibility(assetPackage, target = {}) {
  const issues = [];
  if (!target.assetId) issues.push('No matching asset is loaded in the CAD workspace');
  else if (target.assetId !== assetPackage.assetId) issues.push(`Package targets ${assetPackage.assetId}, not ${target.assetId}`);
  if (!target.baselineFingerprint) issues.push('The loaded asset has no baseline fingerprint');
  else if (target.baselineFingerprint !== assetPackage.source.baselineFingerprint) issues.push('The package was created from a different asset baseline');
  return {
    status: issues.length ? 'incompatible' : 'compatible',
    compatible: issues.length === 0,
    issues,
    objectCount: Object.keys(assetPackage.changes?.objects || {}).length
  };
}

export function changedObjectStates(baselineHashes = {}, currentStates = {}) {
  const changes = {};
  for (const [semanticId, state] of Object.entries(currentStates)) {
    if (baselineHashes[semanticId] !== hashValue(state)) changes[semanticId] = state;
  }
  return changes;
}

export function changedObjectComponents(baseline, current) {
  if (!baseline) return current;
  const change = { type:current.type };
  for (const key of ['transform','properties','geometry','materials']) {
    if (hashValue(baseline[key]) !== hashValue(current[key])) change[key] = current[key];
  }
  return Object.keys(change).length > 1 ? change : null;
}