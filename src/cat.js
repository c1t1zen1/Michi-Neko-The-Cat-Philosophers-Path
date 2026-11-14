import { catRimUniforms } from './cat_shading.js?v=20261107a';
import { buildSkeleton, applyPose, layTailOnGround } from './characters/rig.js?v=20261107a';
import { coatMaterials, buildCoat } from './characters/parts/coat.js?v=20261107a';
import { faceFrame, faceMaterials, buildFace } from './characters/parts/face.js?v=20261107a';
import {
  collarMaterials, buildCollarCord, bellMaterials, buildBell
} from './characters/parts/collar.js?v=20261107a';
import { buildShadowBlob, updateShadow } from './characters/parts/shadow.js?v=20261107a';
import {
  computeLocomotion, onJump, onLand, onSprint, setProwling
} from './characters/behaviour/locomotion.js?v=20261107a';
import {
  makeNeutralPose, placeBody, poseSit, getActionPose, applyLook, setLookTarget, setDrinking,
  rollIdleInterval, startIdleAction, beginIdleAction, endIdleAction
} from './characters/behaviour/poses.js?v=20261107a';
import {
  getMoodConfig, setMood, canPlaySound, triggerMeow, applyMood
} from './characters/behaviour/mood.js?v=20261107a';
import {
  assembleCharacter, characterDefFor, updateCharacter, setAccessory, setMasterCat, setCharacterTier
} from './characters/character.js?v=20261107a';

export { catRimUniforms };
// The character kit, for callers that build from a CharacterDef (src/characters/character.js)
export {
  defineCharacter, validateCharacterDef, MICHI, CHARACTER_SLOTS, CHARACTER_TIERS, characterTierFor
} from './characters/character.js?v=20261107a';

/**
 * The cat.
 *
 * One continuous sculpted coat (src/cat_anatomy.js) skinned to a feline
 * skeleton: spine split between ribcage and pelvis, scapulae that slide on
 * the chest, forelegs with a backward elbow, hind legs in the thigh →
 * stifle → hock zig-zag, a six-bone tail, and a rigid head whose eyes,
 * brow "M" and mouth are painted by the coat shader.
 *
 * Motion is procedural. A gait clock drives paw targets — a lateral walk
 * that eases into a trot and, when sprinting, a rotary gallop with spine
 * flexion — and the legs are solved toward them every frame, so planted
 * paws stay planted. Idle actions (sit, groom, stretch, yawn, sleep) and
 * drinking are poses of the same targets, blended in over the gait.
 *
 * Public surface is unchanged from the primitive-built cat: `group`,
 * `update()`, moods, idle actions, `setDrinking`, `triggerMeow`,
 * `setProwling`, `setMasterCat`, `updateShadow`, plus the part handles
 * (body, chest, hips, neck, head, muzzle, tailRoot, eyes, pupils, ears,
 * legs, tailSegs) that cadJS labels.
 *
 * Since Phase 3 (BUILD_GUIDE_FABLE.md §10) the Cat is a facade: the code
 * lives in src/characters/ (rig, parts, behaviour, and the CharacterDef
 * assembly in character.js) and every method here delegates to it. All
 * state is still plain fields on the Cat, which callers read and write
 * (`idleAction`, `blinkTimer`, `palette`, `legs`, ...).
 *
 *   new Cat({ fur, belly, accent, eyeColor, ribbonColor, noseColor,
 *             stripeAmount, build, idleProfile, audio })   // as always
 *   new Cat({ def: MICHI, audio })                        // from a CharacterDef
 *   options.tier ('hero' | 'mid' | 'far'), options.quality ('low' keeps the classic character)
 *   cat.setAccessory('head', 'some-part')   cat.setTier('mid')
 */
export class Cat {
  constructor(options = {}) {
    assembleCharacter(this, characterDefFor(options), options);
  }

  /* ------------------------------------------------------------------ */
  /*  Construction (each step delegates; the constructor assembles the   */
  /*  whole character through src/characters/character.js)               */
  /* ------------------------------------------------------------------ */

  buildSkeleton() {
    return buildSkeleton(this);
  }

  buildMaterials(eyeColor, ribbonColor, options) {
    faceFrame(this, eyeColor);
    coatMaterials(this);
    faceMaterials(this, options.noseColor);
    collarMaterials(this, ribbonColor);
    bellMaterials(this);
  }

  buildCoat() {
    return buildCoat(this);
  }

  buildFace() {
    return buildFace(this);
  }

  buildCollar() {
    buildCollarCord(this);
    buildBell(this);
  }

  buildShadowBlob() {
    return buildShadowBlob(this);
  }

  updateShadow(heightAboveGround) {
    return updateShadow(this, heightAboveGround);
  }

  /** Standing at rest: paws under the girdles, tail up in a soft hook. */
  makeNeutralPose() {
    return makeNeutralPose(this);
  }

  /* ------------------------------------------------------------------ */
  /*  Frame update                                                       */
  /* ------------------------------------------------------------------ */

  update(dt, moveSpeed = 0, grounded = true, isSprinting = false, isTurning = false, inWater = false, nearObject = null) {
    return updateCharacter(this, dt, moveSpeed, grounded, isSprinting, isTurning, inWater, nearObject);
  }

  /** Gait: paw targets, body bob / pitch / roll, spine bend, tail carriage. */
  computeLocomotion(dt, grounded, sprint) {
    return computeLocomotion(this, dt, grounded, sprint);
  }

  /* ------------------------------------------------------------------ */
  /*  Action poses                                                       */
  /* ------------------------------------------------------------------ */

  /** Place the body so the pelvis lands at (y, z) with the given pitch. */
  placeBody(P, hipsY, hipsZ, pitch) {
    return placeBody(this, P, hipsY, hipsZ, pitch);
  }

  /** A sitting cat: rump down, forelegs straight, tail curled round. */
  poseSit(P) {
    return poseSit(this, P);
  }

  getActionPose(name, P) {
    return getActionPose(this, name, P);
  }

  /* ------------------------------------------------------------------ */
  /*  Applying a pose to the skeleton                                    */
  /* ------------------------------------------------------------------ */

  applyLook(dt) {
    return applyLook(this, dt);
  }

  setLookTarget(worldPos) {
    return setLookTarget(this, worldPos);
  }

  applyPose(P) {
    return applyPose(this, P);
  }

  /**
   * Resting tail (sitting, sleeping): drop from the root to the ground,
   * then lie along it in a curve that wraps toward the paws, the tip still
   * twitching. Each bone is aimed down that path, then blended in.
   */
  layTailOnGround(P) {
    return layTailOnGround(this, P);
  }

  /* ------------------------------------------------------------------ */
  /*  Moods, faces, ears                                                 */
  /* ------------------------------------------------------------------ */

  getMoodConfig() {
    return getMoodConfig(this);
  }

  setMood(name, duration = 2.0, priority = 0) {
    return setMood(this, name, duration, priority);
  }

  canPlaySound(type, cooldown = 1.5) {
    return canPlaySound(this, type, cooldown);
  }

  onJump() {
    return onJump(this);
  }

  onLand() {
    return onLand(this);
  }

  onSprint(active) {
    return onSprint(this, active);
  }

  setDrinking(active) {
    return setDrinking(this, active);
  }

  /** Seconds of stillness before the next idle verb. */
  rollIdleInterval() {
    return rollIdleInterval(this);
  }

  /** Start a named idle verb now (sit, groom, stretch, yawn, sleep). */
  startIdleAction(name, duration = 3) {
    return startIdleAction(this, name, duration);
  }

  beginIdleAction() {
    return beginIdleAction(this);
  }

  endIdleAction() {
    return endIdleAction(this);
  }

  triggerMeow() {
    return triggerMeow(this);
  }

  /**
   * Master Cat (rank 4, C2.4): the collar bell becomes gold and gains a
   * small twin. A quiet, permanent identity reward for the whole valley.
   * A swap of the `bell` accessory slot to its master part.
   */
  setMasterCat() {
    return setMasterCat(this);
  }

  setProwling(prowl) {
    return setProwling(this, prowl);
  }

  applyMood(dt, time, cfg) {
    return applyMood(this, dt, time, cfg);
  }

  /* ------------------------------------------------------------------ */
  /*  Parts and tiers                                                    */
  /* ------------------------------------------------------------------ */

  /** Fill a slot ('collar', 'bell', 'head', 'back') with a part id or entry, or empty it (null). Never re-sculpts. */
  setAccessory(slot, part) {
    return setAccessory(this, slot, part);
  }

  /** 'hero' (as always), 'mid' (no outlines, simpler face) or 'far'. Returns the tier now in effect. */
  setTier(tier) {
    return setCharacterTier(this, tier);
  }
}
