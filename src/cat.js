import * as THREE from 'three';
import { getCatAnatomy, BUILDS, GROUND } from './cat_anatomy.js?v=20261107a';
import {
  catRimUniforms, toonMat, furMaterial, FUR_PART, outlineMaterial,
  makeCollarTexture, makeBellTexture, getEarInnerTexture
} from './cat_shading.js?v=20261107a';
import {
  makePose, copyPose, lerpPose, dampPose, smoothstep, clamp
} from './cat_motion.js?v=20261107a';
import {
  anatomyFor, buildSkeleton, applyPose, layTailOnGround
} from './characters/rig.js?v=20261107a';
import { coatPalette, coatMaterials, buildCoat } from './characters/parts/coat.js?v=20261107a';
import { faceFrame, faceMaterials, buildFace } from './characters/parts/face.js?v=20261107a';
import {
  collarMaterials, buildCollarCord, bellMaterials, buildBell, goldBell
} from './characters/parts/collar.js?v=20261107a';
import { buildShadowBlob, updateShadow } from './characters/parts/shadow.js?v=20261107a';
import {
  computeLocomotion, onJump, onLand, onSprint, setProwling
} from './characters/behaviour/locomotion.js?v=20261107a';
import {
  makeNeutralPose, placeBody, poseSit, getActionPose, applyLook, setLookTarget, setDrinking,
  rollIdleInterval, startIdleAction, beginIdleAction, endIdleAction
} from './characters/behaviour/poses.js?v=20261107a';

export { catRimUniforms };

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
 */

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (x) => x - Math.floor(x);
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mGirdle = new THREE.Matrix4();
const _mInv = new THREE.Matrix4();
const _qParent = new THREE.Quaternion();
const _qWorld = new THREE.Quaternion();
const _qLocal = new THREE.Quaternion();
const _dir = new THREE.Vector3();


export class Cat {
  constructor(options = {}) {
    // Warm tabby palette (reference: caramel coat, chocolate mackerel
    // stripes, cream bib / muzzle / socks, amber eyes)
    const fur = options.fur ?? 0xae8450;
    const belly = options.belly ?? 0xeedcb8;
    const accent = options.accent ?? 0x5e3d26;
    const eyeColor = options.eyeColor ?? 0xebb02a;
    const ribbonColor = options.ribbonColor ?? 0xd63228;
    this.anatomy = anatomyFor(options.build);
    this.palette = coatPalette(this.anatomy, { fur, belly, accent, stripes: options.stripeAmount ?? 1.0 });

    this.group = new THREE.Group();
    this.buildSkeleton();
    this.buildMaterials(eyeColor, ribbonColor, options);
    this.buildCoat();
    this.buildFace();
    this.buildCollar();
    this.buildShadowBlob();

    this.isMeowing = false;
    this.meowTimer = 0;
    this.isProwling = false;
    this.isDrinking = false;

    this.time = Math.random() * 10;
    this.phase = Math.random();
    this.speedBlend = 0;
    this.speed = 0;
    this.trotMix = 0;
    this.gallopMix = 0;
    this.gaitAmp = 0;
    this.airBlend = 0;
    this.landBlend = 0;
    this.blinkTimer = 2 + Math.random() * 4;
    this.blink = 0;
    this.slowBlink = 0;
    this.slowBlinkTimer = 8 + Math.random() * 10;
    this.earTwitch = 0;
    this.earTwitchTimer = 3 + Math.random() * 5;
    this.earTwitchSide = 0;
    this.purr = 0;
    this.lookTarget = null;
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.gaze = new THREE.Vector2();
    this.gazeTarget = new THREE.Vector2();
    this.gazeTimer = 1;
    this.squint = 0;
    this.mouthOpen = 0;
    this.tailPuff = 0;
    this.earPose = { x: -0.1, z: 0 };

    // Audio + mood / idle / action state
    this.audio = options.audio || null;
    this.mood = 'calm';
    this.moodTimer = 0;
    this.moodPriority = 0;
    this.state = 'idle';
    this.idleTimer = 0;
    this.idleAction = null;
    this.idleActionTimer = 0;
    this.idleActionDuration = 0;
    // Cat stands alert/calm and only sits down after prolonged stillness.
    // A personality (NPC villagers) can reweight the idle verbs and the
    // pause between them: { weights: { stretch, yawn, groom, sit }, interval: [min, max] }.
    this.idleProfile = options.idleProfile || null;
    this.nextIdleTime = this.rollIdleInterval();
    this.jumpTime = 0;
    this.landTime = 0;
    this.yawnOpen = 0;
    this.isSprinting = false;
    this.isTurning = false;
    this.inWater = false;

    // Poses: the gait's, the current action's (eased toward its target),
    // and the blend that is applied to the skeleton
    this.neutral = this.makeNeutralPose();
    this.locoPose = makePose();
    this.airPose = makePose();
    this.actionPose = copyPose(makePose(), this.neutral);
    this.actionTarget = makePose();
    this.actionName = null;
    this.actionWeight = 0;
    this.pose = copyPose(makePose(), this.neutral);
    this.applyPose(this.pose);
  }

  /* ------------------------------------------------------------------ */
  /*  Construction                                                       */
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
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const time = this.time;
    this.isSprinting = isSprinting;
    this.isTurning = isTurning;
    this.inWater = inWater;

    const cfg = this.getMoodConfig();
    if (this.moodTimer > 0) {
      this.moodTimer -= dt;
      if (this.moodTimer <= 0) this.setMood('calm', -1);
    }

    if (inWater) this.setMood('cautious', 0.3, 1);
    if (nearObject === 'yarn') this.setMood('playful', 0.4, 1);
    if (nearObject === 'npc') this.setMood('curious', 0.4, 1);
    if (isSprinting) this.setMood('alert', 0.4, 1);

    const target = THREE.MathUtils.clamp(moveSpeed / 6, 0, 1.4);
    this.speedBlend += (target - this.speedBlend) * Math.min(1, dt * 8);
    this.speed = approach(this.speed, moveSpeed, 10, dt);

    if (this.jumpTime > 0) this.jumpTime -= dt;
    if (this.landTime > 0) this.landTime -= dt;

    let state = 'idle';
    if (!grounded) state = 'jump';
    else if (this.landTime > 0) state = 'land';
    else if (isSprinting && moveSpeed > 0.5) state = 'run';
    else if (moveSpeed > 0.1) state = 'walk';
    else if (isTurning) state = 'turn';
    this.state = state;

    if (state === 'idle') {
      this.idleTimer += dt;
      if (!this.idleAction && this.idleTimer >= this.nextIdleTime) {
        this.beginIdleAction();
      }
    } else {
      this.idleTimer = 0;
      if (this.idleAction) this.endIdleAction();
    }

    this.computeLocomotion(dt, grounded, isSprinting);

    // Actions: drinking, or an idle verb, posed over the gait
    let action = null;
    if (this.isDrinking) {
      if (this.idleAction) this.endIdleAction();
      this.state = 'drink';
      action = 'drink';
    } else if (this.idleAction) {
      this.idleActionTimer += dt;
      action = this.idleAction;
    }
    let want = action ? 1 : 0;
    if (action && action !== 'drink' && action !== 'sleep' &&
        this.idleActionDuration - this.idleActionTimer < 0.75) want = 0; // stand up as it ends
    const rate = want > this.actionWeight ? (action === 'sleep' ? 0.9 : 3.0) : 3.6;
    this.actionWeight = approach(this.actionWeight, want, rate, dt);
    if (action) {
      this.getActionPose(action, this.actionTarget);
      if (action !== this.actionName) {
        if (this.actionWeight < 0.05) copyPose(this.actionPose, this.actionTarget);
        this.actionName = action;
      }
      dampPose(this.actionPose, this.actionTarget, action === 'sleep' ? 1.6 : 6, dt);
    }
    const w = smoothstep(0, 1, this.actionWeight);
    lerpPose(this.pose, this.locoPose, this.actionPose, w);
    this.yawnOpen = this.actionName === 'yawn' ? w : 0;

    this.applyLook(dt);
    this.applyPose(this.pose);
    this.applyMood(dt, time, cfg);

    if (this.idleAction && this.idleActionTimer >= this.idleActionDuration) this.endIdleAction();
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
    const map = {
      calm:       { earTwitchBase: 1.5, blinkBase: 1.0, pupilScale: 1.0, tailSpeed: 1.0, tailLift: 0.0,  headScan: 1.0, ear: [-0.08, 0.0] },
      curious:    { earTwitchBase: 1.0, blinkBase: 0.9, pupilScale: 1.08, tailSpeed: 0.9, tailLift: 0.10, headScan: 1.4, ear: [0.18, -0.04] },
      playful:    { earTwitchBase: 0.6, blinkBase: 0.85, pupilScale: 1.15, tailSpeed: 1.6, tailLift: 0.25, headScan: 1.8, ear: [0.12, -0.02] },
      sleepy:     { earTwitchBase: 3.0, blinkBase: 1.8, pupilScale: 0.90, tailSpeed: 0.4, tailLift: -0.05, headScan: 0.4, ear: [-0.22, 0.22] },
      startled:   { earTwitchBase: 0.2, blinkBase: 0.15, pupilScale: 1.25, tailSpeed: 2.2, tailLift: 0.4, headScan: 2.5, ear: [-0.5, 0.42] },
      alert:      { earTwitchBase: 0.7, blinkBase: 0.7, pupilScale: 1.10, tailSpeed: 1.3, tailLift: 0.15, headScan: 1.3, ear: [0.2, -0.06] },
      cautious:   { earTwitchBase: 1.2, blinkBase: 1.0, pupilScale: 1.0, tailSpeed: 0.7, tailLift: -0.10, headScan: 0.8, ear: [-0.36, 0.3] }
    };
    return map[this.mood] || map.calm;
  }

  setMood(name, duration = 2.0, priority = 0) {
    if (priority < this.moodPriority && this.moodTimer > 0 && name !== 'calm') return;
    if (name === 'calm') priority = 0;
    this.mood = name;
    this.moodTimer = Math.max(duration, 0);
    this.moodPriority = priority;
    if (this.audio) {
      if (name === 'playful' && this.canPlaySound('trill')) this.audio.playTrill();
      else if (name === 'startled' && this.canPlaySound('hiss')) this.audio.playHiss();
      else if (name === 'curious' && this.canPlaySound('chirp')) this.audio.playChirp();
    }
  }

  canPlaySound(type, cooldown = 1.5) {
    const now = performance.now() / 1000;
    this.soundCooldowns = this.soundCooldowns || {};
    if (now - (this.soundCooldowns[type] || 0) < cooldown) return false;
    this.soundCooldowns[type] = now;
    return true;
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
    this.isMeowing = true;
    this.meowTimer = 0.55;
    this.setMood('playful', 1.0, 2);
    if (this.audio) this.audio.playMeow();
  }

  /**
   * Master Cat (rank 4, C2.4): the collar bell becomes gold and gains a
   * small twin. A quiet, permanent identity reward for the whole valley.
   */
  setMasterCat() {
    if (this._masterCat) return;
    this._masterCat = true;
    if (this.collarBell) goldBell(this);
  }

  setProwling(prowl) {
    return setProwling(this, prowl);
  }

  applyMood(dt, time, cfg) {
    // Ears: mood carriage (forward when interested, flattened when uneasy)
    // plus quick independent flicks
    const sleeping = this.idleAction === 'sleep';
    let earX = cfg.ear[0], earZ = cfg.ear[1];
    if (sleeping) { earX = -0.2; earZ = 0.26; }
    if (this.isSprinting) earX -= 0.2;
    if (this.yawnOpen > 0) { earX -= 0.25 * this.yawnOpen; earZ += 0.15 * this.yawnOpen; }
    this.earPose.x = approach(this.earPose.x, earX, 8, dt);
    this.earPose.z = approach(this.earPose.z, earZ, 8, dt);
    this.earTwitchTimer -= dt;
    if (this.earTwitchTimer <= 0) {
      this.earTwitch = 0.25;
      this.earTwitchSide = Math.random() < 0.5 ? 0 : 1;
      this.earTwitchTimer = (2.5 + Math.random() * 5) * cfg.earTwitchBase;
    }
    let flick = 0;
    if (this.earTwitch > 0) {
      this.earTwitch -= dt;
      flick = Math.sin(this.earTwitch * 40) * Math.max(0, this.earTwitch) * 1.4;
    }
    for (let i = 0; i < this.ears.length; i++) {
      const ear = this.ears[i];
      const s = ear.userData.side;
      const f = i === this.earTwitchSide ? flick : 0;
      ear.rotation.set(this.earPose.x + f + Math.sin(time * 1.1 + i) * 0.02, f * 0.4 * s, -s * this.earPose.z);
    }

    // Eyes: blinks, slow "I trust you" blinks when calm and still, sleepy
    // lids, and the pupil size for the mood
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blink = 0.16;
      this.blinkTimer = (2 + Math.random() * 4) * cfg.blinkBase;
    }
    let blinkK = 0;
    if (this.blink > 0) {
      this.blink -= dt;
      blinkK = this.blink > 0.08 ? (0.16 - this.blink) / 0.08 : Math.max(0, this.blink) / 0.08;
    }
    const still = this.state === 'idle' && this.speed < 0.1;
    if (this.mood === 'calm' && still) this.slowBlinkTimer -= dt;
    if (this.slowBlinkTimer <= 0 && this.slowBlink <= 0) {
      this.slowBlink = 1.6;
      this.slowBlinkTimer = 9 + Math.random() * 14;
    }
    let slow = 0;
    if (this.slowBlink > 0) {
      this.slowBlink -= dt;
      const p = 1 - Math.max(0, this.slowBlink) / 1.6;
      slow = Math.sin(Math.PI * p) * 0.95;
    }
    let lids = this.mood === 'sleepy' ? 0.42 : 0;
    if (this.actionName === 'groom') lids = Math.max(lids, 0.55 * this.actionWeight);
    if (this.actionName === 'sit' && this.purr > 0) lids = Math.max(lids, 0.4 * this.actionWeight);
    if (this.actionName === 'stretch') lids = Math.max(lids, 0.6 * this.actionWeight);
    const closed = Math.max(this.yawnOpen * 0.95, sleeping ? this.actionWeight : 0);
    this.squint = approach(this.squint, lids, 6, dt);
    const blink = Math.min(1, Math.max(blinkK, slow, closed, this.squint));
    const st = this.face.state;
    st.x = blink;
    st.y = this.mood === 'playful' ? 0.12 : 0;
    st.z = approach(st.z, cfg.pupilScale, 5, dt);
    st.w = sleeping ? 1 : 0;

    // Little saccades so the eyes never look painted on
    this.gazeTimer -= dt;
    if (this.gazeTimer <= 0) {
      this.gazeTimer = 1.2 + Math.random() * 3;
      this.gazeTarget.set((Math.random() - 0.5) * 0.24, (Math.random() - 0.5) * 0.1);
      if (this.lookTarget) this.gazeTarget.x = clamp(this.lookYaw * 0.25, -0.18, 0.18);
    }
    this.gaze.x = approach(this.gaze.x, this.gazeTarget.x, 18, dt);
    this.gaze.y = approach(this.gaze.y, this.gazeTarget.y, 18, dt);
    this.face.look.copy(this.gaze);

    // Mouth: meow, yawn, licking and lapping
    let mouth = this.yawnOpen;
    if (this.isMeowing) {
      this.meowTimer -= dt;
      const meowOpen = Math.sin((1 - Math.max(0, this.meowTimer) / 0.55) * Math.PI);
      mouth = Math.max(mouth, meowOpen * 0.7);
      this.head.rotation.x -= meowOpen * 0.18;
      if (this.meowTimer <= 0) this.isMeowing = false;
    }
    if (this.actionName === 'groom') mouth = Math.max(mouth, (0.2 + 0.12 * Math.sin(this.idleActionTimer * 9.5)) * this.actionWeight);
    if (this.isDrinking) mouth = Math.max(mouth, Math.max(0, Math.sin(time * 13)) * 0.3 * this.actionWeight);
    this.mouthOpen = approach(this.mouthOpen, mouth, 16, dt);
    this.face.mouth.value = this.mouthOpen;

    // A startled cat's tail fluffs up into a bottlebrush. The swell is a
    // morph on the tail tube: scaling the chained tail bones would compound
    // down the chain (and stretch the tail along its length).
    this.tailPuff = approach(this.tailPuff, this.mood === 'startled' ? 1 : 0, this.mood === 'startled' ? 10 : 2, dt);
    this.tailMesh.morphTargetInfluences[0] = this.tailPuff;
    this.tailMesh.userData.outline.morphTargetInfluences[0] = this.tailPuff;

    if (!this.idleAction) {
      const scan = cfg.headScan;
      this.head.rotation.y += Math.sin(time * 0.45) * 0.1 * (scan - 1) * (1 - Math.min(1, Math.abs(this.lookYaw) * 2));
      this.head.rotation.x += Math.sin(time * 0.7) * 0.03 * (scan - 1);
    }
  }
}
