// AssetRuntime — the switch between the classic builders and the kit
// (BUILD_GUIDE_FABLE §3.1, §3.3–§3.5).
//
//   const assets = new AssetRuntime({ THREE, assetSet, search: location.search, quality });
//   await assets.preload();                       // imports kit families only when the modular set can be active
//   assets.build('torii', layout, () => classic)  // kit builder when 'torii' resolves modular, else classic
//   assets.update(dt, t, env);                    // per frame, env = { hour, wind, wet, snow, lanternOn }
//   assets.setQuality('high');                    // from Game.applyQuality()
//
// Resolution, per asset id (`setFor(id)`):
//   1. `?swap=torii:modular,toro:classic`      (A/B testing; a bare id means modular)
//   2. quality 'low' without an explicit `?assets=` → classic (compat promise §3.6)
//   3. kit-overrides.json `assets[id].variant`  (published by the catalog / cadJS)
//   4. the global set: `?assets=classic|modular|auto` wins over the
//      `assetSet` setting; 'auto' is classic on quality 'low', modular otherwise
//   …and an id with no registered kit builder is always classic.
//
// Classic mode downloads none of the kit: families and materials are dynamic
// imports made by preload() only when some id can resolve modular.
// kit-overrides.json is fetched only when the set is not classic (or a ?swap
// asks for the kit), so the classic default makes no extra request.
//
// Tiers vs _mergeStatics() — the Phase 1 decision:
//   Countryside._mergeStatics() bakes every static mesh with a shared MAT
//   material into one mesh per material and disposes the originals, so a
//   merged object cannot change its level of detail afterwards. Rather than
//   keep kit meshes unmerged (and lose the one-draw-call-per-material win
//   that the classic valley relies on), the tier of an instance is chosen
//   ONCE at build time from quality × distance band (contract.js
//   TIER_POLICY: on 'high' the play field is hero, the rim mid, beyond far;
//   on 'medium' one step less) and the instance is merged like classic
//   geometry unless it is listed in `instance.live`. There is no runtime
//   handover for merged geometry, so "no pop at the handover distance"
//   (AAA-4) holds by construction. `setTier(tier)` is honoured only for
//   instances that implement it (the live, unmerged ones: lanterns, chimes,
//   the shishi-odoshi) and is called by setQuality(); merged statics re-tier
//   on the next boot, which is also when the quality setting re-reads its
//   density levers today. A distance LOD for live instances can be added
//   later without an API change.
//
// Footprint registration (Integrator ruling R12):
//   1. The routed classic builder's layout carries
//      `layout.footprint = { colliders, exclusions, anchors }` as plain data
//      in the classic formats, computed in the layout step with the same
//      arithmetic the classic code uses.
//   2. The owning module has ONE helper (e.g. Countryside.placeAsset) that
//      adds `instance.group` to the scene (or to the parent named in the
//      layout), registers `instance.footprint` through the same code path
//      classic uses, in the same order, and binds mesh-reference anchors
//      gameplay holds from `instance.parts` / `instance.sockets` by the part
//      names the layout declares (`layout.bind = { secretKeyMesh: 'key' }`).
//   3. A kit asset's `footprint` defaults to `layout.footprint` (this file
//      copies it when the builder returns none); any deviation is a waiver.
//   4. `_mergeStatics()` merges kit-instance meshes unless listed in `live`.
//
// Pure except for the dynamic imports: loads under Node for the unit tests
// (THREE, the family loader, the material factory and the override fetch are
// all injectable).

import {
  TIERS, isAssetDefinition, isAssetInstance as isInstanceShape, validateInstance,
  resolveParams, groupName, partName, bandFor, tierFor, clampTier, emptyFootprint, AssetContractError
} from './contract.js?v=20261113a';
import { assetRng } from './rng.js?v=20261113a';
import { createKitAudio } from './audio.js?v=20261113a';

export { isAssetInstance } from './contract.js?v=20261113a';

export const ASSET_SETS = Object.freeze(['classic', 'modular', 'auto']);
// Resolved against this module, not the document, so tools/ and labs pages
// read the real root file.
export const KIT_OVERRIDES_URL = new URL('../../kit-overrides.json', import.meta.url).href;
export const KIT_OVERRIDES_FORMAT = 'michi-neko-kit-overrides';

const CTX_FIELDS = Object.freeze(['THREE', 'MAT', 'kitMaterials', 'tier', 'rng', 'quality', 'textures']);

/* ------------------------------------------------------------- parsing --- */

/** `?assets=classic|modular|auto` → that set, or null when absent/invalid. */
export function parseAssetsFlag(search) {
  const value = new URLSearchParams(search || '').get('assets');
  return value && ASSET_SETS.includes(value) ? value : null;
}

/**
 * `?swap=torii:modular,toro:classic` → { swaps: { torii: 'modular', toro: 'classic' }, problems }.
 * A bare id means modular. Unknown sets and malformed entries are reported,
 * not thrown.
 */
export function parseSwap(text) {
  const swaps = {}, problems = [];
  for (const raw of String(text || '').split(',')) {
    const entry = raw.trim();
    if (!entry) continue;
    const [id, set = 'modular', ...rest] = entry.split(':').map((s) => s.trim());
    if (rest.length || !id) { problems.push(`swap entry '${entry}' is not id[:set]`); continue; }
    if (set !== 'classic' && set !== 'modular') { problems.push(`swap '${id}': set must be classic or modular (got '${set}')`); continue; }
    swaps[id] = set;
  }
  return { swaps, problems };
}

/**
 * The global set. `chosen` is the URL flag when present, else the setting;
 * `explicit` says the URL chose it. 'auto' follows the quality tier; the
 * setting-driven path never leaves classic on quality 'low'.
 */
export function resolveSet({ chosen = 'classic', quality = 'medium', explicit = false } = {}) {
  let set = ASSET_SETS.includes(chosen) ? chosen : 'classic';
  if (set === 'auto') set = quality === 'low' ? 'classic' : 'modular';
  if (!explicit && quality === 'low') set = 'classic';
  return set;
}

/** Validate a kit-overrides.json document. Returns the usable part or null. */
export function parseOverridesDoc(doc) {
  if (!doc || typeof doc !== 'object' || doc.format !== KIT_OVERRIDES_FORMAT) return null;
  if (!doc.assets || typeof doc.assets !== 'object' || Array.isArray(doc.assets)) return null;
  const assets = {};
  for (const [id, entry] of Object.entries(doc.assets)) {
    if (!entry || typeof entry !== 'object') continue;
    const out = {};
    if (entry.variant === 'classic' || entry.variant === 'modular') out.variant = entry.variant;
    if (entry.params && typeof entry.params === 'object' && !Array.isArray(entry.params)) out.params = { ...entry.params };
    assets[id] = out;
  }
  return { assets };
}

/* ------------------------------------------------------------- runtime --- */

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

export class AssetRuntime {
  /**
   * @param {object} options
   *   THREE            the three.js namespace handed to builders as ctx.THREE
   *   assetSet         the settings value ('classic' | 'modular' | 'auto'), default 'classic'
   *   search           location.search (reads ?assets= and ?swap=)
   *   quality          'low' | 'medium' | 'high'
   *   loadFamilies     async () → { family: () => import(...) }   (default: src/kit/index.js)
   *   createMaterials  async () → KitMaterials                     (default: src/kit/materials.js)
   *   fetchOverrides   async () → parsed JSON or null               (default: fetch kit-overrides.json)
   *   logger           console-like, for the one warning per id
   */
  constructor({
    THREE = null, assetSet = 'classic', search = '', quality = 'medium',
    loadFamilies = null, createMaterials = null, fetchOverrides = null, logger = console
  } = {}) {
    const params = new URLSearchParams(search || '');
    const urlSet = parseAssetsFlag(search);
    this.explicit = urlSet !== null;
    this.chosen = urlSet || (ASSET_SETS.includes(assetSet) ? assetSet : 'classic');
    this.quality = quality;
    this.set = resolveSet({ chosen: this.chosen, quality, explicit: this.explicit });
    const swap = parseSwap(params.get('swap'));
    this.swaps = swap.swaps;
    this.problems = [];             // swap problems arrive via warnOnce() below
    this.overrides = null;          // parsed kit-overrides.json
    this.defs = new Map();          // id → definition
    this.families = new Map();      // family → [ids]
    this.instances = [];            // every kit instance built (modular only)
    this.loaded = false;            // families imported
    this.kitMaterials = null;
    this.ctxBase = { THREE, MAT: {}, textures: {} };
    this._tables = new Set();        // every owner MAT table the kit materials are bound into
    this.warned = new Set();
    this.logger = logger;
    this._loadFamilies = loadFamilies;
    this._createMaterials = createMaterials;
    this._fetchOverrides = fetchOverrides;
    this._preload = null;
    this.audio = createKitAudio();   // env.audio: families call env.audio?.play(event, { pos, gain })
    this._env = { hour: 12, wind: 1, wet: 0, snow: 0, lanternOn: false, audio: this.audio };
    for (const p of swap.problems) this.warnOnce('swap:' + p, p);
  }

  get isClassic() { return false; }

  /** Owners provide what builders need: Countryside gives MAT and textures, main gives THREE. */
  setContext(fields) {
    if (!fields || typeof fields !== 'object') return this;
    if (fields.THREE) this.ctxBase.THREE = fields.THREE;
    if (fields.MAT && typeof fields.MAT === 'object') { this.ctxBase.MAT = fields.MAT; this._tables.add(fields.MAT); }
    if (fields.textures && typeof fields.textures === 'object') this.ctxBase.textures = fields.textures;
    this._bindMaterials();
    return this;
  }

  /** Bind the kit materials into every owner table seen so far (idempotent). */
  _bindMaterials() {
    if (!this.kitMaterials || typeof this.kitMaterials.bind !== 'function') return;
    for (const table of this._tables) this.kitMaterials.bind(table);
  }

  anySwap(set) { return Object.values(this.swaps).includes(set); }

  anyOverride(variant) {
    const assets = this.overrides && this.overrides.assets;
    return !!assets && Object.values(assets).some((a) => a.variant === variant);
  }

  /**
   * The compatibility promise (§3.6): on quality 'low' without an explicit
   * `?assets=`, the kit is neither resolved nor downloaded — only a `?swap`
   * (a developer flag) can ask for it.
   */
  get lowLocked() { return this.quality === 'low' && !this.explicit; }

  /** Whether preload() must import the kit at all. */
  needsKit() {
    if (this.lowLocked) return this.anySwap('modular');
    return this.set === 'modular' || this.anySwap('modular') || this.anyOverride('modular');
  }

  /** The set one id resolves to right now. */
  setFor(id) {
    const swap = this.swaps[id];
    if (swap) return swap;
    if (this.lowLocked) return 'classic';
    const o = this.overrides && this.overrides.assets && this.overrides.assets[id];
    if (o && o.variant) return o.variant;
    return this.set;
  }

  has(id) { return this.defs.has(id); }

  /** Published params for an id (kit-overrides.json), or null. */
  overrideParams(id) {
    const o = this.overrides && this.overrides.assets && this.overrides.assets[id];
    return o && o.params ? o.params : null;
  }

  /** Register one definition (families do this through preload; tests directly). */
  register(def, family = def && def.family) {
    if (!isAssetDefinition(def)) throw new AssetContractError('register() wants a defineAsset() record');
    if (this.defs.has(def.id)) {
      this.warnOnce('dup:' + def.id, `${def.id}: registered twice (${this.defs.get(def.id).family} and ${family}); keeping the first`);
      return false;
    }
    this.defs.set(def.id, def);
    if (!this.families.has(family)) this.families.set(family, []);
    this.families.get(family).push(def.id);
    return true;
  }

  /** Import the families (and the kit materials) if any id can resolve modular. Never throws. */
  preload() {
    if (!this._preload) {
      this._preload = this._doPreload().catch((error) => {
        this.warnOnce('preload', `kit preload failed, running classic: ${error && error.message || error}`);
        this.loaded = false;
      });
    }
    return this._preload;
  }

  async _doPreload() {
    // kit-overrides.json is read only when it can change anything: never on
    // a low-locked device (the promise), never on the classic default.
    if (!this.lowLocked && (this.chosen !== 'classic' || this.anySwap('modular'))) {
      this.overrides = await this._loadOverrides();
    }
    if (!this.needsKit()) return;
    const families = await (this._loadFamilies ? this._loadFamilies() : defaultFamilies());
    for (const [family, load] of Object.entries(families || {})) {
      try {
        const mod = await load();
        const list = mod && mod.assets;
        if (!Array.isArray(list)) throw new Error('index.js must export `assets` (an array of defineAsset records)');
        for (const def of list) this.register(def, family);
      } catch (error) {
        this.warnOnce('family:' + family, `family '${family}' failed to load, its assets stay classic: ${error && error.message || error}`);
      }
    }
    if (!this.kitMaterials) {
      this.kitMaterials = await (this._createMaterials ? this._createMaterials() : defaultMaterials());
      this._bindMaterials();
    }
    this.loaded = true;
  }

  async _loadOverrides() {
    try {
      let doc;
      if (this._fetchOverrides) doc = await this._fetchOverrides();
      else {
        if (typeof fetch !== 'function') return null;
        const response = await fetch(KIT_OVERRIDES_URL, { cache: 'no-store' });
        if (!response.ok) return null;
        doc = await response.json();
      }
      if (doc == null) return null;
      const parsed = parseOverridesDoc(doc);
      if (!parsed) this.warnOnce('overrides', `${KIT_OVERRIDES_URL} ignored: format must be '${KIT_OVERRIDES_FORMAT}' with an assets object`);
      return parsed;
    } catch {
      return null; // no file, or a static host without it — fine
    }
  }

  /** The tier an instance is built at (an explicit `layout.tier` wins, clamped to the asset's tiers). */
  tierFor(layout, def = null) {
    const tiers = def ? def.tiers : TIERS;
    if (layout && TIERS.includes(layout.tier)) return clampTier(layout.tier, tiers);
    return tierFor(this.quality, bandFor(layout), tiers);
  }

  /** ctx for one build: exactly the seven frozen fields. `scope` is an owner's { MAT, textures } (see scope()). */
  makeContext(def, layout, tier, scope = null) {
    return {
      THREE: this.ctxBase.THREE,
      MAT: (scope && scope.MAT) || this.ctxBase.MAT,
      kitMaterials: this.kitMaterials,
      tier,
      rng: assetRng(def.id, layout && layout.index),
      quality: this.quality,
      textures: (scope && scope.textures) || this.ctxBase.textures
    };
  }

  /**
   * An owner's view of the runtime (Integrator ruling, review round 1): the
   * same registry and resolution, but builds get THAT owner's MAT and
   * textures in ctx, the kit materials are bound into the owner's MAT table
   * (so its own _mergeStatics() merges them) and `instances` lists what the
   * owner built. Every owner with a MAT table and a merge pass (Countryside,
   * InteriorManager) does `this.assets = scopeAssets(options.assets, { MAT, textures })`.
   */
  scope({ MAT = null, textures = null } = {}) {
    const runtime = this;
    const ctxScope = { MAT: MAT || null, textures: textures || null };
    if (MAT) {
      this._tables.add(MAT);
      this._bindMaterials();
    }
    const view = {
      isClassic: false,
      isScoped: true,
      runtime,
      instances: [],
      get set() { return runtime.set; },
      get chosen() { return runtime.chosen; },
      get quality() { return runtime.quality; },
      get swaps() { return runtime.swaps; },
      get problems() { return runtime.problems; },
      get kitMaterials() { return runtime.kitMaterials; },
      build: (id, layout, classicFn) => runtime.build(id, layout, classicFn, ctxScope, view),
      update: (dt, t, env) => runtime.update(dt, t, env, view.instances),
      setQuality: (q) => runtime.setQuality(q),
      setContext: () => view,
      scope: (s) => runtime.scope(s),
      setFor: (id) => runtime.setFor(id),
      has: (id) => runtime.has(id),
      needsKit: () => runtime.needsKit(),
      preload: () => runtime.preload(),
      dispose: (instance) => (instance ? runtime.dispose(instance) : view.instances.slice().forEach((i) => i.dispose())),
      tierFor: (layout, def) => runtime.tierFor(layout, def),
      summary: () => runtime.summary()
    };
    return view;
  }

  /**
   * §3.4: run the kit builder when `id` resolves modular and one is
   * registered; otherwise (and whenever the kit builder throws or returns
   * something that is not an AssetInstance) build the classic asset.
   * Returns the AssetInstance, or whatever `classicFn` returns.
   * `scope` / `owner` are supplied by scope() views, never by callers.
   */
  build(id, layout, classicFn, scope = null, owner = null) {
    if (typeof classicFn !== 'function') throw new TypeError(`assets.build('${id}'): classicFn must be a function`);
    const def = this.defs.get(id);
    if (!def || this.setFor(id) !== 'modular') return classicFn();
    let raw = null;
    try {
      const tier = this.tierFor(layout, def);
      const { values: params, problems } = resolveParams(def.params, this.overrideParams(id), layout && layout.params);
      for (const p of problems) this.warnOnce(`params:${id}:${p}`, `${id}: ${p}`);
      const t0 = now();
      raw = def.build(this.makeContext(def, layout, tier, scope), layout || {}, params);
      const instance = this._adopt(raw, def, layout, tier, params, now() - t0);
      instance.owner = owner;
      this.instances.push(instance);
      if (owner) owner.instances.push(instance);
      return instance;
    } catch (error) {
      this.warnOnce('build:' + id, `${id}: kit build failed, using the classic asset — ${error && error.message || error}`);
      if (raw && raw.group && raw.group.isObject3D) disposeTree(raw.group);
      return classicFn();
    }
  }

  /** Validate and normalise what a builder returned (names, defaults, dispose). */
  _adopt(raw, def, layout, tier, params, buildMs) {
    const check = validateInstance(raw, def.id);
    if (!check.ok) throw new AssetContractError(check.errors.join('; '), def.id);
    const instance = raw;
    const group = instance.group;
    if (!group.name) group.name = (layout && layout.name) || def.legacyName || groupName(def.id);
    group.userData.asset = { id: def.id, family: def.family, tier, index: (layout && layout.index) || 0 };
    for (const [key, obj] of Object.entries(instance.parts)) {
      obj.name = partName(def.id, key);
      obj.userData.part = key;
    }
    if (!instance.sockets) instance.sockets = {};
    for (const [key, obj] of Object.entries(instance.sockets)) {
      if (!obj.name) obj.name = `socket:${def.id}/${key}`;
    }
    if (!instance.footprint) instance.footprint = (layout && layout.footprint) || emptyFootprint();
    if (!instance.live) instance.live = [];
    instance.id = def.id;
    instance.tier = tier;
    instance.params = params;
    instance.layout = layout || null;
    instance.buildMs = buildMs;
    const own = typeof instance.dispose === 'function' ? instance.dispose : null;
    instance.dispose = () => this.dispose(instance, own);
    return instance;
  }

  /** Per frame; env = { hour, wind, wet, snow, lanternOn, audio }. A throwing update is disabled after one warning. */
  update(dt, t, env, list = this.instances) {
    if (!list.length) return;
    const e = env || this._env;
    if (this.kitMaterials && typeof this.kitMaterials.setEnv === 'function') this.kitMaterials.setEnv(e);
    for (const instance of list) {
      if (typeof instance.update !== 'function') continue;
      try { instance.update(dt, t, e); }
      catch (error) {
        this.warnOnce('update:' + instance.id, `${instance.id}: update() threw and was switched off — ${error && error.message || error}`);
        instance.update = null;
      }
    }
  }

  /** From Game.applyQuality(): re-tier live instances; later builds use the new quality. */
  setQuality(quality) {
    if (!quality || quality === this.quality) return;
    this.quality = quality;
    this.set = resolveSet({ chosen: this.chosen, quality, explicit: this.explicit });
    for (const instance of this.instances) {
      if (typeof instance.setTier !== 'function') continue;
      const def = this.defs.get(instance.id);
      const tier = this.tierFor(instance.layout, def);
      if (tier === instance.tier) continue;
      try { instance.setTier(tier); instance.tier = tier; }
      catch (error) { this.warnOnce('tier:' + instance.id, `${instance.id}: setTier(${tier}) threw — ${error && error.message || error}`); }
    }
  }

  /** Dispose one instance (or every instance when called with none). */
  dispose(instance = null, own = undefined) {
    if (!instance) {
      for (const i of [...this.instances]) i.dispose();
      return;
    }
    if (instance._disposed) return;
    instance._disposed = true;
    const ownDispose = own === undefined ? null : own;
    if (ownDispose) {
      try { ownDispose.call(instance); }
      catch (error) { this.warnOnce('dispose:' + instance.id, `${instance.id}: dispose() threw — ${error && error.message || error}`); }
    }
    if (instance.group && instance.group.isObject3D) {
      disposeTree(instance.group);
      if (instance.group.parent) instance.group.parent.remove(instance.group);
    }
    const i = this.instances.indexOf(instance);
    if (i >= 0) this.instances.splice(i, 1);
    if (instance.owner && instance.owner.instances) {
      const j = instance.owner.instances.indexOf(instance);
      if (j >= 0) instance.owner.instances.splice(j, 1);
    }
  }

  /** One console warning per key; also kept in `problems` for tests and the debug overlay. */
  warnOnce(key, message) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.problems.push(message);
    if (this.logger && typeof this.logger.warn === 'function') this.logger.warn('[kit] ' + message);
  }

  /** A plain summary for the debug overlay, tests and game_shot. */
  summary() {
    return {
      chosen: this.chosen, set: this.set, explicit: this.explicit, quality: this.quality,
      swaps: { ...this.swaps }, loaded: this.loaded,
      families: Object.fromEntries([...this.families].map(([f, ids]) => [f, [...ids]])),
      assets: [...this.defs.keys()], instances: this.instances.length, problems: [...this.problems]
    };
  }
}

/** Geometry cleanup for a subtree; shared materials and textures are never disposed here. */
function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && typeof o.geometry.dispose === 'function' && !(o.userData && o.userData.sharedGeometry)) o.geometry.dispose();
  });
}

async function defaultFamilies() {
  const mod = await import('./index.js?v=20261113a');
  return mod.FAMILIES || {};
}

async function defaultMaterials() {
  const mod = await import('./materials.js?v=20261113a');
  return new mod.KitMaterials();
}

/**
 * The pass-through every owner defaults to until a Game hands it a runtime:
 * `build(id, layout, classicFn)` → `classicFn()`, `update()` does nothing,
 * `instances` is empty. The classic game is unchanged.
 */
export const CLASSIC_ASSETS = Object.freeze({
  isClassic: true,
  set: 'classic',
  chosen: 'classic',
  quality: 'medium',
  instances: Object.freeze([]),
  swaps: Object.freeze({}),
  problems: Object.freeze([]),
  kitMaterials: null,
  build: (id, layout, classicFn) => classicFn(),
  update() {},
  setQuality() {},
  setContext() { return this; },
  scope() { return this; },
  setFor() { return 'classic'; },
  has() { return false; },
  needsKit() { return false; },
  preload: async () => {},
  dispose() {},
  tierFor() { return 'far'; },
  summary() { return { chosen: 'classic', set: 'classic', explicit: false, quality: 'medium', swaps: {}, loaded: false, families: {}, assets: [], instances: 0, problems: [] }; }
});

/**
 * The one line every owner module writes:
 *   this.assets = scopeAssets(options.assets, { MAT, textures: TEX });
 * Returns the owner's scoped view of the runtime (ctx.MAT / ctx.textures are
 * the owner's; kit materials are bound into the owner's MAT table; `instances`
 * are the owner's). Given nothing, CLASSIC_ASSETS, or anything without a
 * scope(), it returns CLASSIC_ASSETS / the object as is, so the classic game
 * never changes.
 */
export function scopeAssets(assets, scope = {}) {
  if (!assets || assets.isClassic || typeof assets.build !== 'function') return CLASSIC_ASSETS;
  if (typeof assets.scope === 'function') return assets.scope(scope || {});
  return assets;
}

/** The ctx field names, for tests and documentation. */
export const CONTEXT_FIELDS = CTX_FIELDS;
export { TIERS, groupName, partName, isInstanceShape as isInstanceLike };
