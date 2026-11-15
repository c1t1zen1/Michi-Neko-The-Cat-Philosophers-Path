/* Pure helpers for kit-overrides.json (format michi-neko-kit-overrides, guide 3.5).
   No Three.js, no DOM: shared by the swap board, the server and the Node tests.
   The game ignores keys it does not know, so this file adds none. */
export const KIT_OVERRIDES_FORMAT = 'michi-neko-kit-overrides';
export const VARIANTS = ['classic', 'modular'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export const emptyOverrides = () => ({ format: KIT_OVERRIDES_FORMAT, assets: {} });

/** Validate a document. `kitIds` (Set or array) is the allowlist of registered kit ids. Throws with a readable message. */
export function validateOverrides(doc, kitIds) {
  const allow = kitIds ? new Set(kitIds) : null;
  if (!doc || typeof doc !== 'object' || doc.format !== KIT_OVERRIDES_FORMAT) throw new Error(`format must be '${KIT_OVERRIDES_FORMAT}'.`);
  if (!doc.assets || typeof doc.assets !== 'object' || Array.isArray(doc.assets)) throw new Error('assets must be an object keyed by asset id.');
  const assets = {};
  for (const [id, entry] of Object.entries(doc.assets)) {
    if (!ID_RE.test(id)) throw new Error(`'${id}' is not an asset id.`);
    if (allow && !allow.has(id)) throw new Error(`'${id}' is not a registered kit asset.`);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${id}: entry must be an object.`);
    const out = {};
    if (entry.variant !== undefined) {
      if (!VARIANTS.includes(entry.variant)) throw new Error(`${id}: variant must be classic or modular.`);
      out.variant = entry.variant;
    }
    if (entry.params !== undefined) {
      if (!entry.params || typeof entry.params !== 'object' || Array.isArray(entry.params)) throw new Error(`${id}: params must be an object.`);
      out.params = {};
      for (const [key, value] of Object.entries(entry.params)) {
        if (!KEY_RE.test(key)) throw new Error(`${id}: '${key}' is not a parameter name.`);
        if (!(typeof value === 'boolean' || typeof value === 'string' && value.length <= 64 || typeof value === 'number' && Number.isFinite(value))) throw new Error(`${id}.${key}: unusable value.`);
        out.params[key] = value;
      }
    }
    assets[id] = out;
  }
  return { format: KIT_OVERRIDES_FORMAT, assets };
}

/** Pure edit: returns a new document with `id` set to { variant, params }. Entries equal to the defaults are dropped. */
export function setEntry(doc, id, { variant = 'modular', params = {} } = {}, defaults = {}) {
  const next = { format: KIT_OVERRIDES_FORMAT, assets: { ...(doc?.assets || {}) } };
  const changed = Object.fromEntries(Object.entries(params).filter(([key, value]) => defaults[key] !== value));
  const entry = { variant: variant === 'classic' ? 'classic' : 'modular' };
  if (Object.keys(changed).length) entry.params = changed;
  next.assets[id] = entry;
  return next;
}

export const removeEntry = (doc, id) => { const assets = { ...(doc?.assets || {}) }; delete assets[id]; return { format: KIT_OVERRIDES_FORMAT, assets }; };

/** Stable text for the file and for revision hashing. */
export const serializeOverrides = (doc) => JSON.stringify(doc, null, 2) + '\n';
