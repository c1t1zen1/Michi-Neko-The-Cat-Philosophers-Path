import * as THREE from 'three';
import { BUILDS } from '../cat_anatomy.js?v=20261113a';
import { makePose, copyPose, lerpPose, dampPose, smoothstep } from '../cat_motion.js?v=20261113a';
import { TIER_POLICY, BAND_RADII } from '../kit/contract.js?v=20261113a';
import { anatomyFor, buildSkeleton } from './rig.js?v=20261113a';
import { coatPalette, coatMaterials, buildCoat } from './parts/coat.js?v=20261113a';
import { faceFrame, faceMaterials, buildFace } from './parts/face.js?v=20261113a';
import { COLLAR_PARTS } from './parts/collar.js?v=20261113a';
import { buildShadowBlob } from './parts/shadow.js?v=20261113a';

/**
 * Characters (BUILD_GUIDE_FABLE.md §10, Phase 3, lane c1-rig-split).
 *
 * A character is a CharacterDef (data) assembled onto a host. The host is
 * the `Cat` (src/cat.js): it holds every field the Cat always had, and its
 * methods delegate to the modules here:
 *
 *   rig.js                 sculpt per body type (cached), skeleton, leg IK, pose → bones
 *   parts/coat.js          palette, fur materials, skinned coat, tail, head, outlines
 *   parts/face.js          eye frame, nose, whiskers, eye markers, ears
 *   parts/collar.js        accessory parts: kumihimo cord (collar), suzu and Master Cat bells (bell)
 *   parts/shadow.js        contact shadow
 *   behaviour/locomotion.js  gait, air, landing, prowl
 *   behaviour/poses.js       rest and action poses, look-at, idle verbs
 *   behaviour/mood.js        moods, sounds, ears, eyes, mouth, tail puff
 *   character.js (this)      CharacterDef contract, accessory slots, assembly, the frame update, tiers
 *
 * CharacterDef — one character as data (guide §10, C1.3):
 *
 *   {
 *     id: 'michi',              // kebab-case; the inventory id where one exists
 *     build: 'michi',           // body type: a BUILDS key (michi, luna, mochi, kuro) or a proportions
 *                               //   object { girth, leg, head, tail, cheeks }. One sculpt per body
 *                               //   type, cached; nothing else here ever re-sculpts.
 *     palette: { fur, belly, accent, stripes },   // coat colours (0xRRGGBB or '#rrggbb'); stripes 0..1
 *                               //   is how much of the tabby pattern shows (0 = solid coat)
 *     face: { eyes, nose },     // eye colour; nose leather colour, or null to derive it from the coat
 *     accessories: [            // at most one part per slot, in build order (the bell hangs on the
 *       { slot: 'collar', part: 'kumihimo', color: 0xd63228 },   //   collar, so the collar comes first)
 *       { slot: 'bell', part: 'suzu' }
 *     ],                        // omitted: the classic collar and bell; [] = none
 *     scale: 1,                 // overall body scale, set on the group (1 = leave it)
 *     personality: null         // or { idle: { weights: { stretch, yawn, groom, sit }, interval: [min, max] },
 *                               //   ...anything else the owner reads (greeting, startle, notice) }
 *   }
 *
 * Accessory slots are `collar`, `bell`, `head`, `back`. A slot is filled
 * by a registered part (`registerCharacterPart`); `setAccessory(host, slot,
 * part)` swaps it on a live character, in place when the part knows how
 * (`swapTo`), else by removing the old part and building the new one on
 * the slot's mount. `setMasterCat()` is the bell slot's swap to its
 * `master` part. A swap never touches the sculpt (C1.5; `sculptStats` in
 * rig.js counts sculpts).
 *
 * Tiers: `hero` is the character exactly as it has always been. `mid`
 * drops the outline pass and simplifies the face (whiskers off); `far` is
 * the same as `mid` until a tier hook (`onCharacterTier`) supplies the
 * single merged mesh (lanes c2/c3). A character made with
 * `{ quality: 'low' }` is locked at `hero`: `setTier()` is ignored. The
 * lock does not choose the def; picking the classic def on quality `low`
 * is the caller's job. `characterTierFor()` is the kit's own tier policy
 * (src/kit/contract.js TIER_POLICY, same quality steps and distance bands);
 * nothing in the game changes tier yet, c2/c3 wire it through the
 * Integrator.
 */

export const CHARACTER_SLOTS = Object.freeze(['collar', 'bell', 'head', 'back']);
export const CHARACTER_TIERS = Object.freeze(['hero', 'mid', 'far']);
/** The cat body types a def may name in `build` (src/cat_anatomy.js BUILDS). */
export const BODY_TYPES = Object.freeze(Object.keys(BUILDS));

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEF_KEYS = ['id', 'build', 'palette', 'face', 'accessories', 'scale', 'personality'];
const CLASSIC_ACCESSORIES = Object.freeze([
  Object.freeze({ slot: 'collar', part: 'kumihimo', color: 0xd63228 }),
  Object.freeze({ slot: 'bell', part: 'suzu' })
]);

export class CharacterContractError extends Error {
  constructor(message, id = null) {
    super(id ? `${id}: ${message}` : message);
    this.name = 'CharacterContractError';
    this.characterId = id;
  }
}

/* -------------------------------------------------------------------- */
/*  Accessory parts                                                      */
/* -------------------------------------------------------------------- */

const PARTS = new Map();

/**
 * Register an accessory part:
 *   { id, slot, label?, mount?, master?, params?,
 *     materials?(host, entry),            // run in the materials pass (before any mesh), in accessory order
 *     build(host, entry, mount) → { objects, fields?, owned? },
 *                                          // objects: what it added to the rig; fields: host fields it set;
 *                                          // owned: { geometries, materials, textures } freed on removal
 *     swapTo?(host, handle, nextPart, entry) → true if it became nextPart in place,
 *     setTier?(host, handle, tier, prev) }
 * `mount` names the host field the part hangs on (default: collar → neck,
 * bell → bellMount, head → head, back → chest). `master` (bell slot) names
 * the part `setMasterCat()` swaps to.
 */
export function registerCharacterPart(part) {
  if (!part || !ID_RE.test(part.id || '')) throw new CharacterContractError('a part needs a kebab-case id');
  if (!CHARACTER_SLOTS.includes(part.slot)) throw new CharacterContractError(`unknown slot "${part.slot}"`, part.id);
  if (typeof part.build !== 'function') throw new CharacterContractError('a part needs build(host, entry, mount)', part.id);
  const had = PARTS.get(part.id);
  if (had && had !== part) throw new CharacterContractError('a different part with this id is already registered', part.id);
  PARTS.set(part.id, part);
  return part;
}

export function characterPart(id) { return PARTS.get(id) || null; }

/** Registered parts, optionally for one slot. */
export function characterParts(slot = null) {
  return [...PARTS.values()].filter((p) => !slot || p.slot === slot);
}

for (const p of COLLAR_PARTS) registerCharacterPart(p);

const SLOT_MOUNT = { collar: 'neck', bell: 'bellMount', head: 'head', back: 'chest' };

function mountFor(host, part) {
  return host[part.mount || SLOT_MOUNT[part.slot]] || null;
}

/* -------------------------------------------------------------------- */
/*  CharacterDef                                                         */
/* -------------------------------------------------------------------- */

const isColour = (v) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xffffff) ||
  (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v));
const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** Check a CharacterDef. → { ok, errors } (nothing thrown). */
export function validateCharacterDef(def) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!isPlainObject(def)) return { ok: false, errors: ['a CharacterDef is an object'] };
  for (const k of Object.keys(def)) if (!DEF_KEYS.includes(k)) err(`unknown field "${k}"`);
  if (typeof def.id !== 'string' || !ID_RE.test(def.id)) err('id must be kebab-case');
  if (def.build !== undefined && typeof def.build !== 'string' && !isPlainObject(def.build)) {
    err('build is a body type name or a proportions object');
  }
  if (typeof def.build === 'string' && !Object.prototype.hasOwnProperty.call(BUILDS, def.build)) {
    err(`build: unknown body type "${def.build}" (one of ${BODY_TYPES.join(', ')}, or a proportions object)`);
  }
  if (isPlainObject(def.build)) {
    for (const [k, v] of Object.entries(def.build)) {
      if (!['girth', 'leg', 'head', 'tail', 'cheeks'].includes(k)) err(`build: unknown proportion "${k}"`);
      else if (typeof v !== 'number' || !(v > 0.5 && v < 1.6)) err(`build.${k} must be a number in (0.5, 1.6)`);
    }
  }
  if (def.palette !== undefined) {
    if (!isPlainObject(def.palette)) err('palette must be an object');
    else {
      for (const [k, v] of Object.entries(def.palette)) {
        if (k === 'stripes') { if (typeof v !== 'number' || v < 0 || v > 1) err('palette.stripes must be 0..1'); }
        else if (!['fur', 'belly', 'accent'].includes(k)) err(`palette: unknown field "${k}"`);
        else if (!isColour(v)) err(`palette.${k} must be 0xRRGGBB or '#rrggbb'`);
      }
    }
  }
  if (def.face !== undefined) {
    if (!isPlainObject(def.face)) err('face must be an object');
    else {
      for (const [k, v] of Object.entries(def.face)) {
        if (!['eyes', 'nose'].includes(k)) err(`face: unknown field "${k}"`);
        else if (!(k === 'nose' && v === null) && !isColour(v)) err(`face.${k} must be a colour${k === 'nose' ? ' or null' : ''}`);
      }
    }
  }
  if (def.accessories !== undefined) {
    if (!Array.isArray(def.accessories)) err('accessories must be an array');
    else {
      const seen = new Set();
      def.accessories.forEach((a, i) => {
        if (!isPlainObject(a)) { err(`accessories[${i}] must be { slot, part, ... }`); return; }
        if (!CHARACTER_SLOTS.includes(a.slot)) err(`accessories[${i}]: unknown slot "${a.slot}"`);
        else if (seen.has(a.slot)) err(`accessories[${i}]: slot "${a.slot}" is filled twice`);
        seen.add(a.slot);
        const part = PARTS.get(a.part);
        if (!part) err(`accessories[${i}]: unknown part "${a.part}"`);
        else if (part.slot !== a.slot) err(`accessories[${i}]: part "${a.part}" fits slot "${part.slot}", not "${a.slot}"`);
        if (a.color !== undefined && !isColour(a.color)) err(`accessories[${i}].color must be a colour`);
        if (a.slot === 'bell' && !seen.has('collar')) err(`accessories[${i}]: the bell hangs on the collar; list the collar first`);
      });
    }
  }
  if (def.scale !== undefined && (typeof def.scale !== 'number' || !(def.scale > 0.2 && def.scale < 5))) err('scale must be a number in (0.2, 5)');
  if (def.personality !== undefined && def.personality !== null) {
    if (!isPlainObject(def.personality)) err('personality must be an object or null');
    else if (def.personality.idle !== undefined) {
      const idle = def.personality.idle;
      if (!isPlainObject(idle)) err('personality.idle must be an object');
      else {
        if (idle.weights !== undefined && (!isPlainObject(idle.weights) ||
          Object.entries(idle.weights).some(([k, v]) => !['stretch', 'yawn', 'groom', 'sit'].includes(k) || typeof v !== 'number' || v < 0))) {
          err('personality.idle.weights: { stretch, yawn, groom, sit } non-negative numbers');
        }
        if (idle.interval !== undefined && (!Array.isArray(idle.interval) || idle.interval.length !== 2 ||
          !idle.interval.every((x) => typeof x === 'number' && x >= 0) || idle.interval[0] > idle.interval[1])) {
          err('personality.idle.interval: [min, max] seconds');
        }
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

const DEFINED = new WeakSet();

/** Validate and normalise a CharacterDef (defaults filled in, frozen). Throws CharacterContractError. */
export function defineCharacter(def) {
  if (DEFINED.has(def)) return def;
  const { ok, errors } = validateCharacterDef(def);
  if (!ok) throw new CharacterContractError(errors.join('; '), def && typeof def.id === 'string' ? def.id : null);
  const p = def.palette || {};
  const f = def.face || {};
  const out = Object.freeze({
    id: def.id,
    build: def.build === undefined ? 'michi' : (typeof def.build === 'string' ? def.build : Object.freeze({ ...def.build })),
    palette: Object.freeze({ fur: p.fur ?? 0xae8450, belly: p.belly ?? 0xeedcb8, accent: p.accent ?? 0x5e3d26, stripes: p.stripes ?? 1.0 }),
    face: Object.freeze({ eyes: f.eyes ?? 0xebb02a, nose: f.nose ?? null }),
    accessories: def.accessories === undefined ? CLASSIC_ACCESSORIES : Object.freeze(def.accessories.map((a) => Object.freeze({ ...a }))),
    scale: def.scale ?? 1,
    personality: def.personality ?? null
  });
  DEFINED.add(out);
  return out;
}

/** Michi, the player cat: today's character (the `hero` tier of the classic set). */
export const MICHI = defineCharacter({
  id: 'michi',
  build: 'michi',
  palette: { fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26, stripes: 1.0 },
  face: { eyes: 0xebb02a, nose: null },
  accessories: [{ slot: 'collar', part: 'kumihimo', color: 0xd63228 }, { slot: 'bell', part: 'suzu' }],
  scale: 1,
  personality: null
});

/**
 * The CharacterDef for the Cat's constructor options, read exactly as the
 * Cat always read them (`fur`, `belly`, `accent`, `eyeColor`, `ribbonColor`,
 * `noseColor`, `stripeAmount`, `build`, `idleProfile`). Lenient like the Cat:
 * not validated, so odd values behave as they always did.
 */
export function catDefFromOptions(options = {}) {
  return Object.freeze({
    id: 'cat',
    build: options.build,
    // Warm tabby palette (reference: caramel coat, chocolate mackerel
    // stripes, cream bib / muzzle / socks, amber eyes)
    palette: Object.freeze({
      fur: options.fur ?? 0xae8450,
      belly: options.belly ?? 0xeedcb8,
      accent: options.accent ?? 0x5e3d26,
      stripes: options.stripeAmount ?? 1.0
    }),
    face: Object.freeze({ eyes: options.eyeColor ?? 0xebb02a, nose: options.noseColor ?? null }),
    accessories: Object.freeze([
      Object.freeze({ slot: 'collar', part: 'kumihimo', color: options.ribbonColor ?? 0xd63228 }),
      Object.freeze({ slot: 'bell', part: 'suzu' })
    ]),
    scale: 1,
    personality: options.idleProfile ? { idle: options.idleProfile } : null
  });
}

/** `options.def` (validated) when given, else the def the legacy options describe. */
export function characterDefFor(options = {}) {
  return options.def ? defineCharacter(options.def) : catDefFromOptions(options);
}

/* -------------------------------------------------------------------- */
/*  Assembly                                                             */
/* -------------------------------------------------------------------- */

/**
 * Assemble a character onto `host`: sculpt, skeleton, materials, coat,
 * face, accessories, shadow, then the behaviour state. The order is the
 * classic Cat's, call for call: three.js draws four Math.random values per
 * object it makes and the collar and bell textures draw their noise from
 * Math.random too, so the order is part of what the seeded review sheets
 * (tools/cat_preview.html) and tools/cat_golden.mjs check.
 *
 * opts: { audio, tier = 'hero', quality } — `quality: 'low'` keeps the
 * classic character (the tier stays `hero`).
 */
export function assembleCharacter(host, def, opts = {}) {
  host.def = def;
  host.anatomy = anatomyFor(def.build);
  host.palette = coatPalette(host.anatomy, def.palette);

  host.group = new THREE.Group();
  buildSkeleton(host);

  // Materials: face frame, fur, ear and nose, then each accessory's
  const parts = def.accessories.map((entry) => [entry, PARTS.get(entry.part)]);
  faceFrame(host, def.face.eyes);
  coatMaterials(host);
  faceMaterials(host, def.face.nose);
  for (const [entry, part] of parts) if (part && part.materials) part.materials(host, entry);

  buildCoat(host);
  buildFace(host);
  host.slots = { collar: null, bell: null, head: null, back: null };
  for (const [entry, part] of parts) {
    if (part) mountAccessory(host, entry, part);
    else console.warn(`character ${def.id}: unknown accessory part "${entry.part}" left out`);
  }
  buildShadowBlob(host);

  initCharacterState(host, {
    audio: opts.audio || null,
    idleProfile: (def.personality && def.personality.idle) || null
  });

  if (def.scale !== 1) host.group.scale.setScalar(def.scale);
  host.tier = 'hero';
  host.tierLock = opts.quality === 'low' ? 'hero' : null;
  if (opts.tier && opts.tier !== 'hero') setCharacterTier(host, opts.tier);
  return host;
}

/** The behaviour state a new character starts in (the classic Cat constructor's fields, in order). */
export function initCharacterState(host, { audio = null, idleProfile = null } = {}) {
  host.isMeowing = false;
  host.meowTimer = 0;
  host.isProwling = false;
  host.isDrinking = false;

  host.time = Math.random() * 10;
  host.phase = Math.random();
  host.speedBlend = 0;
  host.speed = 0;
  host.trotMix = 0;
  host.gallopMix = 0;
  host.gaitAmp = 0;
  host.airBlend = 0;
  host.landBlend = 0;
  host.blinkTimer = 2 + Math.random() * 4;
  host.blink = 0;
  host.slowBlink = 0;
  host.slowBlinkTimer = 8 + Math.random() * 10;
  host.earTwitch = 0;
  host.earTwitchTimer = 3 + Math.random() * 5;
  host.earTwitchSide = 0;
  host.purr = 0;
  host.lookTarget = null;
  host.lookYaw = 0;
  host.lookPitch = 0;
  host.gaze = new THREE.Vector2();
  host.gazeTarget = new THREE.Vector2();
  host.gazeTimer = 1;
  host.squint = 0;
  host.mouthOpen = 0;
  host.tailPuff = 0;
  host.earPose = { x: -0.1, z: 0 };

  // Audio + mood / idle / action state
  host.audio = audio;
  host.mood = 'calm';
  host.moodTimer = 0;
  host.moodPriority = 0;
  host.state = 'idle';
  host.idleTimer = 0;
  host.idleAction = null;
  host.idleActionTimer = 0;
  host.idleActionDuration = 0;
  // Cat stands alert/calm and only sits down after prolonged stillness.
  // A personality (NPC villagers) can reweight the idle verbs and the
  // pause between them: { weights: { stretch, yawn, groom, sit }, interval: [min, max] }.
  host.idleProfile = idleProfile;
  host.nextIdleTime = host.rollIdleInterval();
  host.jumpTime = 0;
  host.landTime = 0;
  host.yawnOpen = 0;
  host.isSprinting = false;
  host.isTurning = false;
  host.inWater = false;

  // Poses: the gait's, the current action's (eased toward its target),
  // and the blend that is applied to the skeleton
  host.neutral = host.makeNeutralPose();
  host.locoPose = makePose();
  host.airPose = makePose();
  host.actionPose = copyPose(makePose(), host.neutral);
  host.actionTarget = makePose();
  host.actionName = null;
  host.actionWeight = 0;
  host.pose = copyPose(makePose(), host.neutral);
  host.applyPose(host.pose);
}

/* -------------------------------------------------------------------- */
/*  Accessory slots                                                      */
/* -------------------------------------------------------------------- */

function mountAccessory(host, entry, part) {
  const mount = mountFor(host, part);
  if (!mount) {
    console.warn(`character ${host.def ? host.def.id : '?'}: no mount for the ${part.slot} part "${part.id}"; left out`);
    return null;
  }
  const built = part.build(host, entry, mount) || {};
  const owned = built.owned || {};
  const handle = {
    slot: part.slot, part, entry,
    objects: built.objects || [],
    fields: built.fields || [],
    owned: { geometries: owned.geometries || [], materials: owned.materials || [], textures: owned.textures || [] }
  };
  host.slots[part.slot] = handle;
  return handle;
}

const within = (o, roots) => { for (let p = o; p; p = p.parent) if (roots.includes(p)) return true; return false; };
/** Entries are flat { slot, part, ...params }: compare them whatever the key order. */
const canonEntry = (e) => JSON.stringify(Object.keys(e).sort().map((k) => [k, e[k]]));
const sameEntry = (a, b) => canonEntry(a) === canonEntry(b);

/** The slots whose parts hang on this slot's part (the bell on the collar), nearest first. */
function dependents(host, slot) {
  const h = host.slots && host.slots[slot];
  if (!h) return [];
  const out = [];
  for (const other of CHARACTER_SLOTS) {
    const o = host.slots[other];
    if (o && o !== h && o.objects.some((obj) => obj.parent && within(obj.parent, h.objects))) {
      out.push(other, ...dependents(host, other));
    }
  }
  return [...new Set(out)];
}

/** Take the part out of a slot (and anything hung on it, like the bell on the collar), freeing what it owned. */
export function removeAccessory(host, slot) {
  const h = host.slots && host.slots[slot];
  if (!h) return false;
  for (const other of CHARACTER_SLOTS) {
    const o = host.slots[other];
    if (o && o !== h && o.objects.some((obj) => obj.parent && within(obj.parent, h.objects))) removeAccessory(host, other);
  }
  const gone = new Set();
  for (const obj of h.objects) {
    obj.traverse((x) => gone.add(x));
    obj.removeFromParent();
  }
  if (host.outlines) host.outlines = host.outlines.filter((o) => !gone.has(o));
  for (const g of h.owned.geometries) g.dispose();
  for (const m of h.owned.materials) m.dispose();
  for (const t of h.owned.textures) if (t) t.dispose();
  for (const f of h.fields) host[f] = undefined;
  host.slots[slot] = null;
  return true;
}

/**
 * Put a part in a slot on a live character: `next` is a part id, an entry
 * `{ part, ...params }`, or null to empty the slot. Never re-sculpts.
 * Parts hung on the one replaced (the bell on the collar) are hung again on
 * the new one when it offers their mount. On a Master Cat a bell part is
 * replaced by its `master` part. → the slot's handle (or null).
 */
export function setAccessory(host, slot, next) {
  if (!CHARACTER_SLOTS.includes(slot)) throw new CharacterContractError(`unknown accessory slot "${slot}"`);
  if (next == null) { removeAccessory(host, slot); return null; }
  let entry = Object.freeze(typeof next === 'string' ? { slot, part: next } : { ...next, slot });
  let part = PARTS.get(entry.part);
  if (!part) throw new CharacterContractError(`unknown accessory part "${entry.part}"`);
  if (part.slot !== slot) throw new CharacterContractError(`part "${part.id}" fits slot "${part.slot}", not "${slot}"`);
  if (host._masterCat && part.master && part.master !== part.id && PARTS.has(part.master)) {
    part = PARTS.get(part.master);
    entry = Object.freeze({ ...entry, part: part.id });
  }
  if (!mountFor(host, part)) {
    throw new CharacterContractError(`nothing to hang "${part.id}" on (${part.mount || SLOT_MOUNT[slot]}); the bell needs a collar`);
  }
  const cur = host.slots[slot];
  let carried = [];
  if (cur) {
    if (cur.part === part && sameEntry(cur.entry, entry)) return cur;
    if (cur.part.swapTo && cur.part.swapTo(host, cur, part, entry)) {
      cur.part = part;
      cur.entry = entry;
      return cur;
    }
    carried = dependents(host, slot).map((s) => host.slots[s].entry);
    removeAccessory(host, slot);
  }
  if (part.materials) part.materials(host, entry);
  const handle = mountAccessory(host, entry, part);
  if (handle && handle.part.setTier && host.tier && host.tier !== 'hero') handle.part.setTier(host, handle, host.tier, 'hero');
  if (host.tier && host.tier !== 'hero') for (const o of host.outlines || []) o.visible = false;
  for (const e of carried) {
    const p = PARTS.get(e.part);
    if (p && mountFor(host, p)) setAccessory(host, e.slot, e);
    else console.warn(`character ${host.def ? host.def.id : '?'}: "${part.id}" has no ${p ? p.mount || SLOT_MOUNT[p.slot] : 'mount'} for the ${e.slot} part "${e.part}"; left off`);
  }
  return handle;
}

/**
 * Master Cat (rank 4, C2.4): the bell slot swaps to its part's `master`
 * (the classic `suzu` becomes `suzu-master`: gold, with a small twin).
 * Once per character, as always.
 */
export function setMasterCat(host) {
  if (host._masterCat) return;
  host._masterCat = true;
  const bell = host.slots && host.slots.bell;
  if (bell && bell.part.master) setAccessory(host, 'bell', bell.part.master);
}

/* -------------------------------------------------------------------- */
/*  Tiers                                                                */
/* -------------------------------------------------------------------- */

const TIER_HOOKS = [];

/** Run `fn(host, tier, prev)` whenever a character changes tier (c2/c3: the far tier's merged mesh). → unsubscribe */
export function onCharacterTier(fn) {
  TIER_HOOKS.push(fn);
  return () => { const i = TIER_HOOKS.indexOf(fn); if (i >= 0) TIER_HOOKS.splice(i, 1); };
}

/**
 * The tier for a character, by the kit's own policy (src/kit/contract.js
 * TIER_POLICY: quality × distance band, bands at BAND_RADII from here
 * measured as camera distance). Quality `low` and the classic asset set
 * stay `hero`: today's character, unchanged (the classic lock).
 */
export function characterTierFor({ quality = 'medium', set = 'classic', distance = 0 } = {}) {
  if (quality === 'low' || set !== 'modular') return 'hero';
  const band = distance < BAND_RADII.near ? 'near' : distance < BAND_RADII.rim ? 'rim' : 'far';
  const row = TIER_POLICY[quality] || TIER_POLICY.medium;
  return row[band];
}

/** Switch a live character's tier. → the tier it is at now. */
export function setCharacterTier(host, tier) {
  if (!CHARACTER_TIERS.includes(tier)) throw new CharacterContractError(`unknown tier "${tier}"`);
  const next = host.tierLock || tier;
  const prev = host.tier || 'hero';
  if (next === prev) return prev;
  const hero = next === 'hero';
  for (const o of host.outlines || []) o.visible = hero;   // mid / far: no outline pass
  if (host.whiskers) host.whiskers.visible = hero;         // mid / far: a simpler face
  for (const slot of CHARACTER_SLOTS) {
    const h = host.slots && host.slots[slot];
    if (h && h.part.setTier) h.part.setTier(host, h, next, prev);
  }
  host.tier = next;
  for (const hook of TIER_HOOKS) hook(host, next, prev);
  return next;
}

/* -------------------------------------------------------------------- */
/*  The frame update                                                     */
/* -------------------------------------------------------------------- */

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/**
 * One frame: mood timers → movement state → idle verbs → gait → action
 * pose blended over it → look-at → skeleton → face. Moved verbatim from
 * Cat.update (this. → host.).
 */
export function updateCharacter(host, dt, moveSpeed = 0, grounded = true, isSprinting = false, isTurning = false, inWater = false, nearObject = null) {
  dt = Math.min(dt, 0.1);
  host.time += dt;
  const time = host.time;
  host.isSprinting = isSprinting;
  host.isTurning = isTurning;
  host.inWater = inWater;

  const cfg = host.getMoodConfig();
  if (host.moodTimer > 0) {
    host.moodTimer -= dt;
    if (host.moodTimer <= 0) host.setMood('calm', -1);
  }

  if (inWater) host.setMood('cautious', 0.3, 1);
  if (nearObject === 'yarn') host.setMood('playful', 0.4, 1);
  if (nearObject === 'npc') host.setMood('curious', 0.4, 1);
  if (isSprinting) host.setMood('alert', 0.4, 1);

  const target = THREE.MathUtils.clamp(moveSpeed / 6, 0, 1.4);
  host.speedBlend += (target - host.speedBlend) * Math.min(1, dt * 8);
  host.speed = approach(host.speed, moveSpeed, 10, dt);

  if (host.jumpTime > 0) host.jumpTime -= dt;
  if (host.landTime > 0) host.landTime -= dt;

  let state = 'idle';
  if (!grounded) state = 'jump';
  else if (host.landTime > 0) state = 'land';
  else if (isSprinting && moveSpeed > 0.5) state = 'run';
  else if (moveSpeed > 0.1) state = 'walk';
  else if (isTurning) state = 'turn';
  host.state = state;

  if (state === 'idle') {
    host.idleTimer += dt;
    if (!host.idleAction && host.idleTimer >= host.nextIdleTime) {
      host.beginIdleAction();
    }
  } else {
    host.idleTimer = 0;
    if (host.idleAction) host.endIdleAction();
  }

  host.computeLocomotion(dt, grounded, isSprinting);

  // Actions: drinking, or an idle verb, posed over the gait
  let action = null;
  if (host.isDrinking) {
    if (host.idleAction) host.endIdleAction();
    host.state = 'drink';
    action = 'drink';
  } else if (host.idleAction) {
    host.idleActionTimer += dt;
    action = host.idleAction;
  }
  let want = action ? 1 : 0;
  if (action && action !== 'drink' && action !== 'sleep' &&
      host.idleActionDuration - host.idleActionTimer < 0.75) want = 0; // stand up as it ends
  const rate = want > host.actionWeight ? (action === 'sleep' ? 0.9 : 3.0) : 3.6;
  host.actionWeight = approach(host.actionWeight, want, rate, dt);
  if (action) {
    host.getActionPose(action, host.actionTarget);
    if (action !== host.actionName) {
      if (host.actionWeight < 0.05) copyPose(host.actionPose, host.actionTarget);
      host.actionName = action;
    }
    dampPose(host.actionPose, host.actionTarget, action === 'sleep' ? 1.6 : 6, dt);
  }
  const w = smoothstep(0, 1, host.actionWeight);
  lerpPose(host.pose, host.locoPose, host.actionPose, w);
  host.yawnOpen = host.actionName === 'yawn' ? w : 0;

  host.applyLook(dt);
  host.applyPose(host.pose);
  host.applyMood(dt, time, cfg);

  if (host.idleAction && host.idleActionTimer >= host.idleActionDuration) host.endIdleAction();
}
