// The asset contract (BUILD_GUIDE_FABLE §3.3): `defineAsset()`, the param
// schema, part naming, the tier constants and the tier policy.
//
// Pure: no three.js import, so it loads under Node (tools/kit_check.mjs,
// tools/kit_test.mjs) as well as in the browser. Object3D values are
// duck-typed (`isObject3D`, `isMesh`).
//
// Frozen names (other lanes code against them): `defineAsset`, the
// AssetInstance fields `group, parts, sockets, footprint{colliders,
// exclusions, anchors}, live, update, setTier, dispose`, the ctx fields
// `THREE, MAT, kitMaterials, tier, rng, quality, textures`, and part names
// `asset:<id>/<part>`.

export const TIERS = Object.freeze(['hero', 'mid', 'far']);
export const QUALITIES = Object.freeze(['low', 'medium', 'high']);
export const PARAM_TYPES = Object.freeze(['number', 'enum', 'boolean', 'color']);
export const ENV_KEYS = Object.freeze(['hour', 'wind', 'wet', 'snow', 'lanternOn']);

/** Inventory ids are kebab-case (`labs/asset_inventory.json`). */
export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Part keys are snake_case: `post_l`, `kasagi`, `rope_end2`. */
export const PART_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

const NAME_PREFIX = 'asset:';

export class AssetContractError extends Error {
  constructor(message, id = null) {
    super(id ? `${id}: ${message}` : message);
    this.name = 'AssetContractError';
    this.assetId = id;
  }
}

/* ---------------------------------------------------------------- names --- */

/** The group name of an asset instance: `asset:<id>`. */
export function groupName(id) { return NAME_PREFIX + id; }

/** The public name of one part: `asset:<id>/<part>`. */
export function partName(id, part) { return `${NAME_PREFIX}${id}/${part}`; }

/** `asset:torii/kasagi` → { id: 'torii', part: 'kasagi' }; `asset:torii` → { id, part: null }; else null. */
export function parsePartName(name) {
  if (typeof name !== 'string' || !name.startsWith(NAME_PREFIX)) return null;
  const rest = name.slice(NAME_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return ID_RE.test(rest) ? { id: rest, part: null } : null;
  const id = rest.slice(0, slash), part = rest.slice(slash + 1);
  return ID_RE.test(id) && PART_RE.test(part) ? { id, part } : null;
}

/* ---------------------------------------------------------- tier policy --- */

/**
 * Distance bands of the valley, measured from the world origin (the village
 * centre). `near` is the play field the cat walks (hero trees, r < 39 m),
 * `rim` the edge forest and foothills (39–80 m), `far` everything beyond
 * (distant village, pagoda, ranges).
 */
export const BANDS = Object.freeze(['near', 'rim', 'far']);
export const BAND_RADII = Object.freeze({ near: 39, rim: 80 });

/**
 * Which tier an instance is BUILT at, by quality tier × distance band.
 *
 * Decision (Phase 1, see runtime.js "Tiers vs _mergeStatics"): the tier is
 * chosen once, at build time, so kit meshes can be merged into the valley's
 * static draw calls exactly like classic meshes. There is no runtime
 * handover for merged geometry, so AAA-4 "no pop" holds trivially for it;
 * only unmerged (`live`) instances can change tier later (`setTier`).
 * `medium.near` is deliberately `mid` until the Phase 0 budgets (D1) say the
 * modular medium tier can afford hero detail in the play field.
 */
export const TIER_POLICY = Object.freeze({
  high: Object.freeze({ near: 'hero', rim: 'mid', far: 'far' }),
  medium: Object.freeze({ near: 'mid', rim: 'far', far: 'far' }),
  low: Object.freeze({ near: 'far', rim: 'far', far: 'far' }) // never reached: low resolves to classic
});

/** The band of a layout: an explicit `layout.band`, else from its radius. */
export function bandFor(layout) {
  if (layout && BANDS.includes(layout.band)) return layout.band;
  const p = layout && (layout.position || layout.pos);
  const x = Number(layout?.x ?? (p && p.x) ?? 0) || 0;
  const z = Number(layout?.z ?? (p && p.z) ?? 0) || 0;
  const r = Math.hypot(x, z);
  if (r < BAND_RADII.near) return 'near';
  if (r < BAND_RADII.rim) return 'rim';
  return 'far';
}

/**
 * The tier to build at, clamped to the tiers the asset declares: the policy's
 * choice when available, else the next LESS detailed declared tier, else the
 * nearest more detailed one.
 */
export function tierFor(quality, band, tiers = TIERS) {
  const row = TIER_POLICY[quality] || TIER_POLICY.medium;
  return clampTier(row[band] || row.near, tiers);
}

/** `want` when the asset declares it, else the next less detailed declared tier, else the nearest more detailed one. */
export function clampTier(want, tiers = TIERS) {
  if (tiers.includes(want)) return want;
  const i = TIERS.indexOf(want);
  for (let j = i + 1; j < TIERS.length; j++) if (tiers.includes(TIERS[j])) return TIERS[j];
  for (let j = i - 1; j >= 0; j--) if (tiers.includes(TIERS[j])) return TIERS[j];
  return tiers[0] || 'mid';
}

/* ---------------------------------------------------------------- params --- */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function parseColor(v) {
  if (isNum(v)) return v >= 0 && v <= 0xffffff && Number.isInteger(v) ? v : null;
  if (typeof v === 'string') {
    const m = /^#?([0-9a-f]{6})$/i.exec(v.trim());
    if (m) return parseInt(m[1], 16);
  }
  return null;
}

/**
 * Validate a `params` schema (§3.3). Returns { ok, errors }. Every entry is
 * `{ type, default, … }`: number (min, max, step), enum (options), boolean,
 * color (0xRRGGBB). Defaults must sit inside their ranges.
 */
export function validateParamSchema(params) {
  const errors = [];
  if (params == null) return { ok: true, errors };
  if (typeof params !== 'object' || Array.isArray(params)) return { ok: false, errors: ['params must be an object'] };
  for (const [key, p] of Object.entries(params)) {
    const at = `params.${key}`;
    if (!PART_RE.test(key)) errors.push(`${at}: key must be snake_case`);
    if (!p || typeof p !== 'object') { errors.push(`${at}: must be an object`); continue; }
    if (!PARAM_TYPES.includes(p.type)) { errors.push(`${at}: type must be one of ${PARAM_TYPES.join(', ')}`); continue; }
    if (!('default' in p)) { errors.push(`${at}: needs a default`); continue; }
    switch (p.type) {
      case 'number': {
        if (!isNum(p.default)) errors.push(`${at}: default must be a finite number`);
        if (!isNum(p.min) || !isNum(p.max)) errors.push(`${at}: number params need finite min and max`);
        else if (p.min > p.max) errors.push(`${at}: min > max`);
        else if (isNum(p.default) && (p.default < p.min || p.default > p.max)) errors.push(`${at}: default ${p.default} outside [${p.min}, ${p.max}]`);
        if (p.step !== undefined && (!isNum(p.step) || p.step <= 0)) errors.push(`${at}: step must be > 0`);
        break;
      }
      case 'enum': {
        if (!Array.isArray(p.options) || !p.options.length) errors.push(`${at}: enum params need a non-empty options array`);
        else if (!p.options.every((o) => typeof o === 'string')) errors.push(`${at}: enum options must be strings`);
        else if (!p.options.includes(p.default)) errors.push(`${at}: default '${p.default}' is not in options`);
        break;
      }
      case 'boolean':
        if (typeof p.default !== 'boolean') errors.push(`${at}: default must be true or false`);
        break;
      case 'color':
        if (parseColor(p.default) === null) errors.push(`${at}: default must be 0xRRGGBB or '#rrggbb'`);
        break;
    }
    if (p.label !== undefined && typeof p.label !== 'string') errors.push(`${at}: label must be a string`);
  }
  return { ok: errors.length === 0, errors };
}

/** The defaults of a schema as a plain object. */
export function defaultParams(params) {
  const out = {};
  for (const [key, p] of Object.entries(params || {})) {
    out[key] = p.type === 'color' ? parseColor(p.default) : p.default;
  }
  return out;
}

/**
 * Coerce one value against its schema entry. Returns the accepted value or
 * `undefined` when the value is unusable (the caller keeps the previous one).
 * Numbers are clamped to [min, max] and snapped to `step` when given.
 */
export function coerceParam(p, value) {
  switch (p.type) {
    case 'number': {
      const n = typeof value === 'string' ? Number(value) : value;
      if (!isNum(n)) return undefined;
      let v = Math.min(p.max, Math.max(p.min, n));
      if (isNum(p.step) && p.step > 0) v = p.min + Math.round((v - p.min) / p.step) * p.step;
      return Math.min(p.max, Math.max(p.min, Number(v.toFixed(10))));
    }
    case 'enum':
      return p.options.includes(value) ? value : undefined;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '1' || value === 1) return true;
      if (value === 'false' || value === '0' || value === 0) return false;
      return undefined;
    case 'color': {
      const c = parseColor(value);
      return c === null ? undefined : c;
    }
    default:
      return undefined;
  }
}

/**
 * Defaults merged with any number of override objects, in order (later wins).
 * Unknown keys and unusable values are reported in `problems`, never thrown:
 * a bad published override must not break the game.
 */
export function resolveParams(params, ...overrides) {
  const values = defaultParams(params);
  const problems = [];
  for (const o of overrides) {
    if (!o || typeof o !== 'object') continue;
    for (const [key, value] of Object.entries(o)) {
      const p = params && params[key];
      if (!p) { problems.push(`unknown param '${key}'`); continue; }
      const v = coerceParam(p, value);
      if (v === undefined) problems.push(`param '${key}': unusable value ${JSON.stringify(value)}`);
      else values[key] = v;
    }
  }
  return { values, problems };
}

/* ---------------------------------------------------------- defineAsset --- */

/**
 * Declare one kit asset. Validates the record and returns it frozen.
 *
 *   defineAsset({
 *     id: 'torii', family: 'shrine', lab: 'shrine/myojin',
 *     params: { span: { type: 'number', default: 3.2, min: 2.4, max: 4.5, step: 0.05 } },
 *     tiers: ['hero', 'mid', 'far'],
 *     build(ctx, layout, params) { … return instance; }
 *   })
 *
 * Optional fields: `floating` (part keys the bearing check skips, e.g. a
 * koi), `footprintWaiver` (why the footprint differs from the classic one;
 * recorded in the lane status file), `sample` (a layout for the contract
 * test and catalog: an object or a function returning one), `legacyName`
 * (the classic object name gameplay looks up, used when the layout gives
 * none), `live` hint (see runtime.js), `label`.
 */
export function defineAsset(spec) {
  if (!spec || typeof spec !== 'object') throw new AssetContractError('defineAsset needs an object');
  const id = spec.id;
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new AssetContractError(`invalid id ${JSON.stringify(id)} (kebab-case inventory id)`);
  if (typeof spec.family !== 'string' || !ID_RE.test(spec.family)) throw new AssetContractError('family must be a kebab-case folder name', id);
  if (spec.lab !== undefined && typeof spec.lab !== 'string') throw new AssetContractError('lab must be a string like "shrine/myojin"', id);
  if (typeof spec.build !== 'function') throw new AssetContractError('build(ctx, layout, params) must be a function', id);
  const schema = validateParamSchema(spec.params);
  if (!schema.ok) throw new AssetContractError(schema.errors.join('; '), id);
  let tiers = spec.tiers === undefined ? [...TIERS] : spec.tiers;
  if (!Array.isArray(tiers) || !tiers.length || !tiers.every((t) => TIERS.includes(t)) || new Set(tiers).size !== tiers.length) {
    throw new AssetContractError(`tiers must be a non-empty subset of ${TIERS.join(', ')}`, id);
  }
  tiers = TIERS.filter((t) => tiers.includes(t));
  const floating = spec.floating === undefined ? [] : spec.floating;
  if (!Array.isArray(floating) || !floating.every((k) => PART_RE.test(k))) throw new AssetContractError('floating must list snake_case part keys', id);
  if (spec.footprintWaiver !== undefined && typeof spec.footprintWaiver !== 'string') throw new AssetContractError('footprintWaiver must be a string (the reason)', id);
  if (spec.sample !== undefined && typeof spec.sample !== 'object' && typeof spec.sample !== 'function') throw new AssetContractError('sample must be a layout object or a function returning one', id);
  if (spec.legacyName !== undefined && typeof spec.legacyName !== 'string') throw new AssetContractError('legacyName must be a string', id);

  const def = {
    kind: 'asset',
    id,
    family: spec.family,
    lab: spec.lab || null,
    label: typeof spec.label === 'string' ? spec.label : id,
    params: Object.freeze(deepFreezeParams(spec.params || {})),
    tiers: Object.freeze(tiers),
    floating: Object.freeze([...floating]),
    footprintWaiver: spec.footprintWaiver || null,
    legacyName: spec.legacyName || null,
    sample: spec.sample || null,
    build: spec.build
  };
  return Object.freeze(def);
}

function deepFreezeParams(params) {
  const out = {};
  for (const [k, p] of Object.entries(params)) {
    out[k] = Object.freeze({ ...p, ...(p.options ? { options: Object.freeze([...p.options]) } : {}) });
  }
  return out;
}

export function isAssetDefinition(x) {
  return !!x && typeof x === 'object' && x.kind === 'asset' && typeof x.id === 'string' && typeof x.build === 'function';
}

/* ------------------------------------------------------------- instances --- */

/** Duck-typed: an object with an Object3D `group`, a `parts` map and a `footprint`. */
export function isAssetInstance(x) {
  return !!x && typeof x === 'object' && !!x.group && x.group.isObject3D === true &&
    !!x.parts && typeof x.parts === 'object' && !!x.footprint && typeof x.footprint === 'object';
}

/** An empty footprint in the classic registration format. */
export function emptyFootprint() {
  return { colliders: [], exclusions: [], anchors: {} };
}

/**
 * Check the shape of an AssetInstance against §3.3. Returns { ok, errors }.
 * Used by the runtime right after `build()` (anything wrong falls back to
 * classic) and by the contract test, which adds geometry checks on top.
 */
export function validateInstance(instance, id) {
  const errors = [];
  if (instance == null) return { ok: false, errors: ['build() returned nothing'] };
  if (typeof instance !== 'object') return { ok: false, errors: [`build() must return an AssetInstance object (got ${typeof instance})`] };
  if (!instance.group || instance.group.isObject3D !== true) errors.push('group must be an Object3D');
  if (!instance.parts || typeof instance.parts !== 'object' || Array.isArray(instance.parts)) errors.push('parts must be an object of named Object3Ds');
  else {
    for (const [key, obj] of Object.entries(instance.parts)) {
      if (!PART_RE.test(key)) errors.push(`part key '${key}' must be snake_case`);
      if (!obj || obj.isObject3D !== true) errors.push(`part '${key}' must be an Object3D`);
      else if (obj.name && obj.name !== partName(id, key) && obj.name !== key) errors.push(`part '${key}' is named '${obj.name}', expected '${partName(id, key)}'`);
    }
  }
  if (instance.sockets !== undefined && (typeof instance.sockets !== 'object' || Array.isArray(instance.sockets))) errors.push('sockets must be an object');
  else if (instance.sockets) {
    for (const [key, obj] of Object.entries(instance.sockets)) {
      if (!obj || obj.isObject3D !== true) errors.push(`socket '${key}' must be an Object3D`);
    }
  }
  if (instance.footprint !== undefined) {
    const f = instance.footprint;
    if (!f || typeof f !== 'object') errors.push('footprint must be { colliders, exclusions, anchors }');
    else {
      if (f.colliders !== undefined && !Array.isArray(f.colliders)) errors.push('footprint.colliders must be an array');
      if (f.exclusions !== undefined && !Array.isArray(f.exclusions)) errors.push('footprint.exclusions must be an array');
      if (f.anchors !== undefined && (typeof f.anchors !== 'object' || Array.isArray(f.anchors))) errors.push('footprint.anchors must be an object');
    }
  }
  if (instance.live !== undefined && !Array.isArray(instance.live)) errors.push('live must be an array of Object3Ds');
  for (const fn of ['update', 'setTier', 'dispose']) {
    if (instance[fn] !== undefined && typeof instance[fn] !== 'function') errors.push(`${fn} must be a function`);
  }
  return { ok: errors.length === 0, errors };
}
