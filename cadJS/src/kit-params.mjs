// Pure helpers for kit (production) assets: parameter validation against an
// asset's `params` schema, the param-panel control model, the AI actions
// `set_asset_params` / `swap_asset_variant`, and the kit-overrides entry that
// "Push to game" writes. No three.js, no DOM: runs under Node tests.
//
// The game's runtime clamps or ignores a bad published param, so a stray value
// cannot break it. cadJS is stricter: it rejects an out-of-range, unknown or
// mistyped value before anything is applied or written.
import { coerceParam, defaultParams, ID_RE } from '../../src/kit/contract.js?v=20261113a';
import { KIT_OVERRIDES_FORMAT, emptyOverrides, setEntry, validateOverrides } from '../../catalog/js/kit-overrides.mjs';

export { KIT_OVERRIDES_FORMAT };
export const KIT_VARIANTS = ['classic', 'modular'];
export const KIT_ACTIONS = ['set_asset_params', 'swap_asset_variant'];
const KEY_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const hex = (n) => '#' + Number(n).toString(16).padStart(6, '0');

const colorNumber = (value) => {
  if (Number.isInteger(value) && value >= 0 && value <= 0xffffff) return value;
  const m = typeof value === 'string' ? /^#?([0-9a-f]{6})$/i.exec(value.trim()) : null;
  return m ? parseInt(m[1], 16) : null;
};

/** One value against one schema entry, strictly. Returns { ok, value } or { ok:false, error }. */
export function checkParam(key, p, value) {
  if (!p) return { ok: false, error: `unknown parameter '${key}'` };
  switch (p.type) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, error: `${key}: expected a number` };
      if (value < p.min || value > p.max) return { ok: false, error: `${key}: ${value} is outside ${p.min}..${p.max}` };
      return { ok: true, value: coerceParam(p, value) };
    }
    case 'enum':
      return p.options.includes(value) ? { ok: true, value } : { ok: false, error: `${key}: '${value}' is not one of ${p.options.join(', ')}` };
    case 'boolean':
      return typeof value === 'boolean' ? { ok: true, value } : { ok: false, error: `${key}: expected true or false` };
    case 'color': {
      const n = colorNumber(value);
      return n === null ? { ok: false, error: `${key}: expected #rrggbb` } : { ok: true, value: n };
    }
    default: return { ok: false, error: `${key}: unsupported parameter type` };
  }
}

/** A params object against a schema. Never clamps: returns { values, errors }; values holds only accepted keys. */
export function validateParams(schema, params) {
  const values = {}, errors = [];
  if (!params || typeof params !== 'object' || Array.isArray(params)) return { values, errors: ['params must be an object'] };
  const entries = Object.entries(params);
  if (entries.length > 64) errors.push('too many parameters');
  for (const [key, value] of entries.slice(0, 64)) {
    const r = checkParam(key, schema?.[key], value);
    if (r.ok) values[key] = r.value; else errors.push(r.error);
  }
  return { values, errors };
}

/** Control model for the param panel (the same shape the catalog preview uses). */
export function paramControls(schema, current = {}) {
  const defaults = defaultParams(schema);
  return Object.entries(schema || {}).map(([key, p]) => {
    const value = current[key] !== undefined ? current[key] : defaults[key];
    return {
      key, type: p.type, label: p.label || key.replace(/_/g, ' '), value, default: defaults[key],
      ...(p.type === 'number' ? { min: p.min, max: p.max, step: p.step || (p.max - p.min) / 100 } : {}),
      ...(p.type === 'enum' ? { options: [...p.options] } : {}),
      ...(p.type === 'color' ? { hex: hex(value) } : {})
    };
  });
}

/** Parameters that differ from the defaults, colours as '#rrggbb' (the file's JSON-friendly form). */
export function changedParams(schema, values) {
  const defaults = defaultParams(schema), out = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (!schema?.[key] || value === defaults[key]) continue;
    out[key] = schema[key].type === 'color' ? hex(value) : value;
  }
  return out;
}

/** The edit state of a kit asset: { id, variant, params } with params already validated and numeric colours. */
export const kitState = (id, variant = 'modular', params = {}) => ({ id, variant, params: { ...params } });

/* -------------------------------------------------------------- AI actions --- */

/** Shape-only check, usable where no schema is known (the server relay). Throws. */
export function checkKitActionShape(action) {
  const p = action?.params || {};
  if (action.type === 'set_asset_params') {
    if (!ID_RE.test(String(p.asset || ''))) throw new Error('set_asset_params needs params.asset (a kit asset id)');
    if (!p.values || typeof p.values !== 'object' || Array.isArray(p.values)) throw new Error('set_asset_params needs params.values (an object)');
    const keys = Object.keys(p.values);
    if (!keys.length || keys.length > 64) throw new Error('set_asset_params needs 1..64 values');
    for (const key of keys) if (!KEY_RE.test(key)) throw new Error(`'${key}' is not a parameter name`);
  } else if (action.type === 'swap_asset_variant') {
    if (!ID_RE.test(String(p.asset || ''))) throw new Error('swap_asset_variant needs params.asset (a kit asset id)');
    if (!KIT_VARIANTS.includes(p.variant)) throw new Error('swap_asset_variant needs params.variant of classic or modular');
  }
}

/**
 * Fold kit actions into one final state, validating each against the asset's
 * schema. `lookup(id)` returns { params: schema } or null. Throws on the first
 * bad action so a plan is applied whole or not at all. Pure: returns the new
 * state and a human-readable list for the review step.
 */
export function foldKitActions(state, actions, lookup) {
  let next = kitState(state.id, state.variant, state.params);
  const review = [];
  for (const [index, action] of actions.entries()) {
    const at = `Action ${index + 1} (${action.type})`;
    try { checkKitActionShape(action); } catch (e) { throw new Error(`${at}: ${e.message}`); }
    const p = action.params;
    if (p.asset !== state.id) throw new Error(`${at}: targets '${p.asset}' but the open asset is '${state.id}'`);
    const def = lookup(p.asset);
    if (!def) throw new Error(`${at}: '${p.asset}' is not a registered kit asset`);
    if (action.type === 'swap_asset_variant') {
      next = { ...next, variant: p.variant }; review.push(`variant -> ${p.variant}`);
    } else {
      const { values, errors } = validateParams(def.params || {}, p.values);
      if (errors.length) throw new Error(`${at}: ${errors.join('; ')}`);
      next = { ...next, params: { ...next.params, ...values } };
      review.push(...Object.entries(values).map(([k, v]) => `${k} = ${def.params[k].type === 'color' ? hex(v) : v}`));
    }
  }
  return { state: next, review };
}

/* ------------------------------------------------------------ push to game --- */

/**
 * The kit-overrides document with this asset's entry set. Params are validated
 * against the schema (throws on a bad one); defaults are dropped; the result
 * is re-validated by the same function the server uses.
 */
export function kitOverridesWith(doc, state, def) {
  const { values, errors } = validateParams(def.params || {}, state.params);
  if (errors.length) throw new Error(errors.join('; '));
  const base = doc && doc.format === KIT_OVERRIDES_FORMAT ? doc : emptyOverrides();
  const next = setEntry(base, state.id, { variant: state.variant, params: changedParams(def.params, values) });
  return validateOverrides(next);
}
