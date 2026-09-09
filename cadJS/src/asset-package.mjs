export const ASSET_PACKAGE_FORMAT = 'cadjs-asset-package';
export const ASSET_PACKAGE_SCHEMA_VERSION = 1;
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
    metadata: {
      author: String(input.metadata?.author || ''),
      notes: String(input.metadata?.notes || '')
    }
  };
  output.checksum = hashValue(output);
  return output;
}

export function validateAssetPackage(input, options = {}) {
  if (!input || typeof input !== 'object') throw new Error('Asset package must be a JSON object');
  if (input.format !== ASSET_PACKAGE_FORMAT) throw new Error(`Expected ${ASSET_PACKAGE_FORMAT}`);
  if (input.schemaVersion !== ASSET_PACKAGE_SCHEMA_VERSION) throw new Error(`Unsupported asset package schema ${input.schemaVersion}`);
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
  const expectedChecksum = hashValue(packageWithoutChecksum(input));
  if (!options.allowMissingChecksum && input.checksum !== expectedChecksum) throw new Error('Asset package checksum does not match its contents');
  return {
    ...input,
    source: { module:String(input.source.module || ''), symbol:String(input.source.symbol || ''), baselineFingerprint:input.source.baselineFingerprint },
    parentPackage: input.parentPackage || null,
    metadata: { author:String(input.metadata?.author || ''), notes:String(input.metadata?.notes || '') },
    checksum: expectedChecksum
  };
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