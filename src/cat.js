import * as THREE from 'three';
import { getCatAnatomy, BUILDS, GROUND } from './cat_anatomy.js?v=20261024b';
import {
  catRimUniforms, toonMat, furMaterial, FUR_PART, outlineMaterial,
  makeCollarTexture, makeBellTexture, getEarInnerTexture
} from './cat_shading.js?v=20261024b';
import {
  makePose, copyPose, lerpPose, dampPose, makeLegRig, solveLeg, smoothstep, clamp
} from './cat_motion.js?v=20261024b';

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

// Leg order: 0 front x<0, 1 front x>0, 2 hind x<0, 3 hind x>0.
// Phase offsets (fraction of a stride) for each gait.
const GAIT_WALK = [0.75, 0.25, 0.5, 0.0];   // lateral sequence: LH, LF, RH, RF
const GAIT_TROT = [1.0, 0.5, 0.5, 0.0];     // diagonal pairs
const GAIT_GALLOP = [1.42, 0.52, 0.1, 0.0]; // rotary gallop

// The four back stripes (body-space z of their centres over the spine):
// withers to saddle, clear of the rump and the tail root
const STRIPE_Z = [0.165, 0.07, -0.025, -0.12];

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mGirdle = new THREE.Matrix4();
const _mInv = new THREE.Matrix4();
const _qParent = new THREE.Quaternion();
const _qWorld = new THREE.Quaternion();
const _qLocal = new THREE.Quaternion();
const _dir = new THREE.Vector3();

let _whiskerMat = null;
let _blobTex = null;

export class Cat {
  constructor(options = {}) {
    // Warm tabby palette (reference: caramel coat, chocolate mackerel
    // stripes, cream bib / muzzle / socks, amber eyes)
    const fur = options.fur ?? 0xae8450;
    const belly = options.belly ?? 0xeedcb8;
    const accent = options.accent ?? 0x5e3d26;
    const eyeColor = options.eyeColor ?? 0xebb02a;
    const ribbonColor = options.ribbonColor ?? 0xd63228;
    const build = typeof options.build === 'object' && options.build
      ? options.build
      : (BUILDS[options.build] || BUILDS.michi);

    this.anatomy = getCatAnatomy(build);
    const A = this.anatomy;
    const L = A.landmarks;

    this.palette = {
      fur: new THREE.Color(fur),
      belly: new THREE.Color(belly),
      stripe: new THREE.Color(accent),
      stripeAmount: options.stripeAmount ?? 1.0,
      stripeZ: new THREE.Vector4(...STRIPE_Z),
      trunk: new THREE.Vector4(L.chest[1], A.build.girth, A.face.headScale, 5.4)
    };
    // Near-black coats read as black (not brown) under warm light with a
    // cool sheen, and get a dusky nose and inner ear
    const lum = this.palette.fur.r * 0.3 + this.palette.fur.g * 0.59 + this.palette.fur.b * 0.11;
    this.palette.cool = THREE.MathUtils.clamp((0.16 - lum) / 0.1, 0, 1);

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
    const A = this.anatomy;
    const bones = A.bones.map((def) => {
      const b = new THREE.Bone();
      b.name = 'cat:' + def.name;
      return b;
    });
    A.bones.forEach((def, i) => {
      const b = bones[i];
      if (def.parent) {
        const pi = A.boneIndex.get(def.parent);
        bones[pi].add(b);
        const pp = A.bones[pi].pos;
        b.position.set(def.pos[0] - pp[0], def.pos[1] - pp[1], def.pos[2] - pp[2]);
      } else {
        b.position.set(def.pos[0], def.pos[1], def.pos[2]);
      }
    });
    this.bones = bones;
    const bone = (name) => bones[A.boneIndex.get(name)];
    this.bone = bone;
    this.body = bone('body');
    this.hips = bone('hips');
    this.chest = bone('chest');
    this.neck = bone('neck');
    this.head = bone('head');
    this.group.add(this.body);
    this.group.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(bones);

    const L = A.landmarks;
    this.rest = {
      chest: this.chest.position.clone(),
      hips: this.hips.position.clone(),
      scap: [bone('scapR').position.clone(), bone('scapL').position.clone()],
      pivot: new THREE.Vector3(0, L.chest[1], -0.02),
      trunkY: L.chest[1],
      paws: []
    };
    // Legs: 0 front R (x<0), 1 front L, 2 hind R, 3 hind L
    this.legs = [];
    for (const k of ['R', 'L']) {
      const f = L.front[k];
      const rig = makeLegRig('front',
        ['scap', 'humerus', 'forearm', 'wrist', 'fpaw'].map((n) => bone(n + k)),
        [f.scap, f.shoulder, f.elbow, f.wrist, f.knuckle, f.toe], L.chest);
      this.legs.push({ front: true, rig, root: bone('scap' + k), knee: bone('forearm' + k), paw: bone('fpaw' + k) });
      this.rest.paws.push(new THREE.Vector3(...f.knuckle));
    }
    for (const k of ['R', 'L']) {
      const h = L.hind[k];
      const rig = makeLegRig('hind',
        ['femur', 'tibia', 'meta', 'hpaw'].map((n) => bone(n + k)),
        [h.hip, h.stifle, h.hock, h.ball, h.toe], L.hips);
      this.legs.push({ front: false, rig, root: bone('femur' + k), knee: bone('tibia' + k), paw: bone('hpaw' + k) });
      this.rest.paws.push(new THREE.Vector3(...h.ball));
    }
    this.tailSegs = [0, 1, 2, 3, 4, 5].map((i) => bone('tail' + i));
    this.tailRoot = this.tailSegs[0];
  }

  buildMaterials(eyeColor, ribbonColor, options) {
    const A = this.anatomy;
    const f = A.face;
    // Eye frame on the sculpted face: up projected onto the skin, the
    // outer corner tilted up a touch for the almond, cat-like set
    const n = new THREE.Vector3(...f.eyeN);
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
    const right = new THREE.Vector3().crossVectors(up, n).normalize();
    const tilt = 0.14;
    const r = right.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(up, Math.sin(tilt));
    const u = up.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(right, -Math.sin(tilt));
    const hk = f.headScale;
    this.face = {
      eyeC: new THREE.Vector3(...f.eyeC).addScaledVector(n, 0.0004),
      eyeR: r, eyeU: u, eyeN: n,
      eyeSize: new THREE.Vector2(0.0228 * hk, 0.0208 * hk),
      eyeColor: new THREE.Color(eyeColor),
      state: new THREE.Vector4(0, 0, 1, 0),
      look: new THREE.Vector2(),
      nose: new THREE.Vector3(...f.nose),
      mouth: { value: 0 }
    };
    this.matBody = furMaterial(this.palette, FUR_PART.body);
    this.matHead = furMaterial(this.palette, FUR_PART.head, this.face);
    this.matTail = furMaterial(this.palette, FUR_PART.tail);
    this.matEar = furMaterial(this.palette, FUR_PART.ear);
    const cool = this.palette.cool;
    this.matEarInner = toonMat(new THREE.Color(0xffffff).lerp(new THREE.Color(0x7d6168), cool * 0.75), { map: getEarInnerTexture() });
    this.matNose = toonMat(options.noseColor ?? new THREE.Color(0xd9868c).lerp(new THREE.Color(0x4f3a40), cool));
    this.matRibbon = toonMat(0xffffff, { map: makeCollarTexture(ribbonColor) });
    this.matBellBrass = new THREE.MeshStandardMaterial({
      map: makeBellTexture(0xc79a4e), metalness: 0.5, roughness: 0.36, envMapIntensity: 1.2
    });
    this.matGoldBell = new THREE.MeshStandardMaterial({
      map: makeBellTexture(0xf5cf55), metalness: 0.62, roughness: 0.26, envMapIntensity: 1.4,
      emissive: new THREE.Color(0x3a2604), emissiveIntensity: 0.35
    });
    this.matRing = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 0.8, roughness: 0.3 });
  }

  buildCoat() {
    const A = this.anatomy;
    const skinned = (geo, mat, outline) => {
      const m = new THREE.SkinnedMesh(geo, mat);
      m.bind(this.skeleton, new THREE.Matrix4());
      m.castShadow = true;
      // Poses reach well beyond the rest silhouette; keep culling generous
      m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.38, -0.02), 0.85);
      this.group.add(m);
      if (outline) {
        const o = new THREE.SkinnedMesh(geo, outlineMaterial(outline));
        o.bind(this.skeleton, new THREE.Matrix4());
        o.boundingSphere = m.boundingSphere;
        this.group.add(o);
        m.userData.outline = o;
      }
      return m;
    };
    this.coat = skinned(A.body, this.matBody, 0.0032);
    this.coat.name = 'Cat Coat';
    this.tailMesh = skinned(A.tail, this.matTail, 0.0028);

    const head = new THREE.Mesh(A.head, this.matHead);
    head.castShadow = true;
    head.name = 'Cat Head';
    this.head.add(head);
    this.head.add(new THREE.Mesh(A.head, outlineMaterial(0.0026)));
    this.headMesh = head;
  }

  buildFace() {
    const A = this.anatomy;
    const f = A.face;
    const hk = f.headScale;
    // Muzzle group: nose leather and whiskers
    this.muzzle = new THREE.Group();
    this.muzzle.name = 'Muzzle';
    this.head.add(this.muzzle);
    const nose = new THREE.Mesh(A.nose, this.matNose);
    const nn = new THREE.Vector3(...f.noseN);
    nose.position.set(...f.nose).addScaledVector(nn, 0.0015 * hk);
    nose.quaternion.setFromUnitVectors(_v2.set(0, 0, 1), nn);
    this.muzzle.add(nose);
    this.nose = nose;

    // Whiskers: four per side, fanning out and drooping a little
    if (!_whiskerMat) _whiskerMat = new THREE.LineBasicMaterial({ color: 0xf4eee4, transparent: true, opacity: 0.7 });
    const pts = [];
    const root = f.whiskerRoot;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const lift = 0.07 - i * 0.055;
        const len = (0.105 + (i === 1 ? 0.012 : 0)) * hk;
        let prev = null;
        for (let k = 0; k <= 4; k++) {
          const t = k / 4;
          const p = new THREE.Vector3(
            s * (root[0] + 0.004 * hk + len * t),
            root[1] - i * 0.0042 * hk + len * lift * t - 0.016 * hk * t * t,
            root[2] - 0.002 * hk - len * 0.28 * t
          );
          if (prev) pts.push(prev, p);
          prev = p;
        }
      }
    }
    const whiskers = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), _whiskerMat);
    this.muzzle.add(whiskers);

    // Eye markers (the eyes themselves are painted by the head shader)
    this.eyes = [];
    this.pupils = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Object3D();
      eye.position.set(s * this.face.eyeC.x, this.face.eyeC.y, this.face.eyeC.z);
      const pupil = new THREE.Object3D();
      eye.add(pupil);
      this.head.add(eye);
      this.eyes.push(eye);
      this.pupils.push(pupil);
    }

    // Ears: a fixed base orientation, with an inner pivot that animates
    this.ears = [];
    for (const e of f.earBase) {
      const s = e.side;
      const base = new THREE.Group();
      base.position.set(e.pos[0], e.pos[1], e.pos[2]);
      base.rotation.set(-0.12, s * 0.38, s * -0.34);
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(A.ears.outer, this.matEar);
      outer.castShadow = true;
      const inner = new THREE.Mesh(A.ears.inner, this.matEarInner);
      ear.add(outer, inner, new THREE.Mesh(A.ears.outer, outlineMaterial(0.0016)));
      base.add(ear);
      this.head.add(base);
      ear.userData.side = s;
      this.ears.push(ear);
    }
  }

  buildCollar() {
    const A = this.anatomy;
    const c = A.collar;
    // Braided silk cord hugging the coat (C2.1 cosmetics; Master Cat rank
    // swaps the bell for bright gold and adds a twin — setMasterCat()).
    this.collar = new THREE.Mesh(c.geometry, this.matRibbon);
    this.collar.castShadow = false;
    this.collar.name = 'Collar';
    this.neck.add(this.collar);
    this.collar.add(new THREE.Mesh(c.geometry, outlineMaterial(0.0012)));

    // Front fitting: a little cord bow, a brass ring, and the suzu bell
    const front = new THREE.Vector3(...c.front);
    const out = new THREE.Vector3(...c.frontDir);
    const hk = A.face.headScale;
    this.bellMount = new THREE.Group();
    this.bellMount.position.copy(front).addScaledVector(out, 0.0015);
    this.collar.add(this.bellMount);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0052 * hk, 12, 10), this.matRibbon);
    knot.scale.set(1.15, 0.9, 0.8);
    this.bellMount.add(knot);
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.0068 * hk, 0.0024 * hk, 8, 16), this.matRibbon);
      loop.position.set(s * 0.0085 * hk, 0.001, 0);
      loop.rotation.set(0, Math.PI / 2 * 0.35 * s, s * 0.45);
      loop.scale.set(1, 0.72, 1);
      this.bellMount.add(loop);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0052 * hk, 0.0014 * hk, 8, 18), this.matRing);
    ring.position.set(0, -0.0068 * hk, 0.001);
    this.bellMount.add(ring);
    this.bellR = 0.0165 * hk;
    this.collarBell = new THREE.Mesh(new THREE.SphereGeometry(this.bellR, 28, 18), this.matBellBrass);
    this.collarBell.position.set(0, -0.0112 * hk - this.bellR, 0.002);
    this.collarBell.castShadow = true;
    this.bellMount.add(this.collarBell);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0028 * hk, 0.0036 * hk, 0.0028 * hk, 10), this.matRing);
    cap.position.set(0, -0.0112 * hk + 0.0006, 0.002);
    this.bellMount.add(cap);
  }

  buildShadowBlob() {
    if (!_blobTex) {
      const blobCanvas = document.createElement('canvas');
      blobCanvas.width = 64;
      blobCanvas.height = 64;
      const bctx = blobCanvas.getContext('2d');
      const bgrad = bctx.createRadialGradient(32, 32, 4, 32, 32, 31);
      bgrad.addColorStop(0, 'rgba(20, 12, 6, 0.42)');
      bgrad.addColorStop(0.6, 'rgba(20, 12, 6, 0.18)');
      bgrad.addColorStop(1, 'rgba(20, 12, 6, 0)');
      bctx.fillStyle = bgrad;
      bctx.fillRect(0, 0, 64, 64);
      _blobTex = new THREE.CanvasTexture(blobCanvas);
    }
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.025;
    this.blob.scale.set(0.85, 1.25, 1);
    this.blob.renderOrder = 1;
    this.group.add(this.blob);
  }

  updateShadow(heightAboveGround) {
    if (!this.blob) return;
    this.blob.position.y = 0.025 - heightAboveGround;
    const k = THREE.MathUtils.clamp(1 - heightAboveGround * 0.45, 0.35, 1);
    this.blob.scale.set(0.85 * k, 1.25 * k, 1);
    this.blob.material.opacity = k;
  }

  /** Standing at rest: paws under the girdles, tail up in a soft hook. */
  makeNeutralPose() {
    const P = makePose();
    for (let i = 0; i < 4; i++) {
      const r = this.rest.paws[i];
      P.paws[i].x = r.x; P.paws[i].y = r.y; P.paws[i].z = r.z;
    }
    P.neckPitch = -0.04;
    P.tailLift = 1.05;
    P.tailCurl = 0.95;
    P.tailSway = 1;
    return P;
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
    const P = this.locoPose;
    copyPose(P, this.neutral);
    const t = this.time;
    const prowl = this.isProwling;
    const state = this.state;
    const moving = state === 'walk' || state === 'run';
    const turning = state === 'turn';
    const v = this.speed;
    const sb = Math.min(1, this.speedBlend);

    this.trotMix = approach(this.trotMix, prowl ? 0 : smoothstep(1.8, 3.4, v), 4, dt);
    this.gallopMix = approach(this.gallopMix, sprint && v > 4.5 ? 1 : 0, 3.5, dt);
    this.gaitAmp = approach(this.gaitAmp, moving || turning ? 1 : 0, moving ? 7 : 5, dt);
    const tm = this.trotMix, gm = this.gallopMix, amp = this.gaitAmp;

    // Stride length grows with speed; the stride rate follows from it, so
    // a planted paw moves back exactly as fast as the body moves forward
    const vEff = turning && v < 0.3 ? 0.6 : v;
    let S = lerp(lerp(0.3 + 0.25 * vEff, 0.52 + 0.11 * vEff, tm), 0.85 + 0.09 * vEff, gm);
    if (prowl) S *= 0.85;
    const duty = lerp(lerp(0.62, 0.42, tm), 0.34, gm);
    const liftF = lerp(lerp(0.05, 0.07, tm), 0.085, gm) * (prowl ? 1.25 : 1);
    const liftH = lerp(lerp(0.055, 0.07, tm), 0.075, gm) * (prowl ? 1.2 : 1);
    if (moving || turning) this.phase += dt * vEff / S;
    const sweep = S * duty * (turning ? 0.22 : 1);

    for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const off = lerp(lerp(GAIT_WALK[i], GAIT_TROT[i], tm), GAIT_GALLOP[i], gm);
      const ph = frac(this.phase + off);
      let z, y = 0, flex = 0, toe = 0;
      if (ph < duty) {
        const u = ph / duty;
        z = sweep * (0.5 - u);
        // Heel peels off the ground at the end of stance
        if (!front) toe = smoothstep(0.75, 1, u) * 0.35;
      } else {
        const s = (ph - duty) / (1 - duty);
        z = sweep * (-0.5 + s * s * (3 - 2 * s));
        y = (front ? liftF : liftH) * Math.pow(Math.sin(Math.PI * s), 0.85);
        if (front) flex = 1.65 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.25)), 1.3);
        else toe = 0.75 * Math.sin(Math.PI * s);
      }
      const r = this.rest.paws[i];
      const paw = P.paws[i];
      paw.x = r.x * (1 - 0.1 * amp);
      paw.y = r.y + y * amp;
      paw.z = r.z + z * amp;
      paw.flex = flex * amp;
      paw.toe = toe * amp;
    }

    const ph2 = this.phase * TAU;
    const bob = lerp(lerp(-0.0055 * Math.cos(2 * ph2), -0.012 * Math.cos(2 * (ph2 - 0.21 * TAU)), tm),
      0.028 * Math.sin(ph2 - 0.3 * TAU), gm) * amp;
    const breathe = Math.sin(t * 2.2) * 0.004 * (1 - sb);
    P.bodyY = bob + breathe + (prowl ? -0.085 : 0);
    P.bodyPitch = gm * 0.07 * Math.sin(ph2 - 0.05 * TAU) * amp + (prowl ? 0.045 : 0);
    // Gallop: the spine flexes as the legs gather and extends as they reach
    const flexS = Math.sin(ph2 + 0.15 * TAU) * gm * amp;
    P.chestPitch = 0.13 * flexS;
    P.hipsPitch = -0.15 * flexS;
    P.chestZ = -0.022 * (0.5 + 0.5 * Math.sin(ph2 + 0.15 * TAU)) * gm * amp;
    // Walk: a little roll and a lateral S through the spine
    const lat = (1 - gm) * amp;
    P.bodyRoll = 0.018 * Math.sin(ph2) * lat;
    P.chestYaw = 0.05 * Math.sin(ph2 + 0.25 * TAU) * lat * (1 - tm * 0.5);
    P.hipsYaw = -0.045 * Math.sin(ph2) * lat * (1 - tm * 0.5);
    if (prowl) {
      P.chestY = -0.02;
      P.scapLift = 0.028;
    }
    // Head steadied against the body's rock (cats keep their gaze level)
    P.neckPitch = -0.04 - (P.bodyPitch + P.chestPitch) * 0.85 + (prowl ? 0.32 : 0);
    P.headPitch = Math.sin(t * 0.7) * 0.06 * (1 - sb) + (prowl ? -0.34 : 0);
    P.headYaw = Math.sin(t * 0.45) * 0.22 * (1 - sb);

    // Tail carriage: a raised question mark when relaxed, lower and
    // straighter with speed, streaming behind in the gallop, low when stalking
    const cfg = this.getMoodConfig();
    P.tailLift = lerp(lerp(1.05, 0.88, tm * amp), 0.32, gm) + cfg.tailLift;
    P.tailCurl = lerp(lerp(0.95, 0.45, Math.max(sb, tm)), -0.1, gm);
    P.tailSway = lerp(1, 0.6, gm);
    if (prowl) { P.tailLift = 0.14; P.tailCurl = -0.12; P.tailDroop = 0.25; P.tailSway = 0.5; }

    // Airborne / landing
    this.airBlend = approach(this.airBlend, grounded ? 0 : 1, 16, dt);
    this.landBlend = approach(this.landBlend, this.landTime > 0 ? 1 : 0, 18, dt);
    if (this.airBlend > 0.002) {
      const Q = this.airPose;
      copyPose(Q, P);
      const launch = this.jumpTime > 0 ? smoothstep(0, 0.3, this.jumpTime) : 0;
      for (let i = 0; i < 4; i++) {
        const r = this.rest.paws[i];
        const q = Q.paws[i];
        q.x = r.x * 0.92;
        if (i < 2) {
          q.y = r.y + 0.11 + 0.05 * launch;
          q.z = r.z + 0.13 + 0.05 * launch;
          q.flex = lerp(0.45, 0.15, launch);
          q.toe = 0;
        } else {
          q.y = r.y + lerp(0.1, 0.01, launch);
          q.z = r.z + lerp(0.05, -0.17, launch);
          q.flex = 0;
          q.toe = lerp(0.45, 0.85, launch);
        }
      }
      Q.bodyY = 0.02;
      Q.bodyPitch = lerp(0.05, -0.22, launch);
      Q.chestPitch = lerp(0.0, -0.08, launch);
      Q.hipsPitch = lerp(-0.06, 0.12, launch);
      Q.neckPitch = -Q.bodyPitch * 0.8 + 0.04;
      Q.headPitch = 0.05;
      Q.tailLift = lerp(0.55, 0.85, launch);
      Q.tailCurl = 0.15;
      lerpPose(P, P, Q, this.airBlend);
    }
    if (this.landBlend > 0.002) {
      const k = this.landBlend;
      P.bodyY -= 0.065 * k;
      P.chestPitch += 0.08 * k;
      P.neckPitch -= 0.06 * k;
      P.tailLift -= 0.25 * k;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Action poses                                                       */
  /* ------------------------------------------------------------------ */

  /** Place the body so the pelvis lands at (y, z) with the given pitch. */
  placeBody(P, hipsY, hipsZ, pitch) {
    const pv = this.rest.pivot;
    const hy = this.rest.hips.y - pv.y, hz = this.rest.hips.z - pv.z;
    const c = Math.cos(pitch), s = Math.sin(pitch);
    P.bodyPitch = pitch;
    P.bodyY = hipsY - pv.y - (hy * c - hz * s);
    P.bodyZ = hipsZ - pv.z - (hy * s + hz * c);
  }

  /** A sitting cat: rump down, forelegs straight, tail curled round. */
  poseSit(P) {
    const R = this.rest;
    this.placeBody(P, GROUND + 0.168, R.hips.z + 0.045, -0.78);
    P.chestPitch = 0.06;
    P.neckPitch = 0.42;
    P.headPitch = 0.3 + Math.sin(this.time * 0.6) * 0.04;
    P.headYaw = Math.sin(this.time * 0.37) * 0.25;
    for (let i = 0; i < 2; i++) {
      const r = R.paws[i], q = P.paws[i];
      q.x = r.x * 0.85; q.y = r.y; q.z = r.z - 0.005; q.flex = 0; q.toe = 0;
    }
    for (let i = 2; i < 4; i++) {
      const r = R.paws[i], q = P.paws[i];
      q.x = r.x * 1.08; q.y = r.y; q.z = R.hips.z + 0.17; q.flex = 0; q.toe = -0.05;
    }
    P.tailLift = 0.42;
    P.tailCurl = 0.05;
    P.tailSide = 2.3;
    P.tailDroop = 0.2;
    P.tailSway = 0.25;
    P.tailGround = 1;
    P.bodyY += Math.sin(this.time * 1.7) * 0.0025;
  }

  getActionPose(name, P) {
    copyPose(P, this.neutral);
    const R = this.rest;
    const t = this.idleActionTimer;
    const time = this.time;
    if (name === 'sit') {
      this.poseSit(P);
    } else if (name === 'groom') {
      this.poseSit(P);
      // Lick a forepaw, then wash behind the ear with it, and repeat
      const cyc = (t * 0.32) % 1;
      const wash = smoothstep(0.55, 0.68, cyc) * (1 - smoothstep(0.9, 1.0, cyc));
      const lick = Math.sin(t * 9.5);
      const q = P.paws[0];
      q.x = -0.015 + wash * -0.035;
      q.y = R.paws[0].y + lerp(0.43, 0.51, wash) + lick * 0.006 * (1 - wash);
      q.z = R.paws[0].z + lerp(0.13, 0.07, wash);
      q.flex = lerp(1.35, 1.0, wash);
      P.neckPitch = lerp(0.86, 0.62, wash);
      P.headPitch = lerp(0.55, 0.25, wash) + lick * 0.05 * (1 - wash);
      P.headYaw = lerp(-0.28, -0.12, wash);
      P.headRoll = lerp(0.05, -0.4, wash);
    } else if (name === 'stretch') {
      // Play-bow stretch: elbows down, forepaws reaching, rump high
      this.placeBody(P, R.trunkY + 0.04, R.hips.z - 0.03, 0.45);
      for (let i = 0; i < 2; i++) {
        const r = R.paws[i], q = P.paws[i];
        q.x = r.x * 0.9; q.y = r.y; q.z = r.z + 0.27; q.flex = -0.25; q.toe = 0;
      }
      for (let i = 2; i < 4; i++) {
        const r = R.paws[i], q = P.paws[i];
        q.x = r.x; q.y = r.y; q.z = r.z - 0.02;
      }
      P.chestY = -0.06;
      P.scapLift = 0.035;
      P.neckPitch = -0.6;
      P.headPitch = -0.1;
      P.tailLift = 1.3;
      P.tailCurl = 0.35;
    } else if (name === 'yawn') {
      P.neckPitch = -0.14;
      P.headPitch = -0.36;
      P.paws[0].z += 0.02; P.paws[1].z += 0.02;
      P.tailLift = 0.95;
      P.tailCurl = 0.7;
    } else if (name === 'drink') {
      // Crouch at the water: elbows up, chest low, muzzle to the surface
      this.placeBody(P, R.trunkY - 0.075, R.hips.z + 0.03, 0.2);
      for (let i = 0; i < 2; i++) {
        const r = R.paws[i], q = P.paws[i];
        q.x = r.x * 1.05; q.y = r.y; q.z = r.z + 0.035;
      }
      for (let i = 2; i < 4; i++) {
        const r = R.paws[i], q = P.paws[i];
        q.x = r.x; q.y = r.y; q.z = r.z + 0.06;
      }
      const lap = Math.max(0, Math.sin(time * 13));
      P.chestY = -0.05;
      P.scapLift = 0.03;
      P.neckPitch = 1.0;
      P.headPitch = 0.55 + lap * 0.04;
      P.tailLift = 0.55;
      P.tailCurl = 0.25;
    } else if (name === 'sleep') {
      // Curled up: belly down, spine in a C, paws tucked, chin on the
      // flank and the tail wrapped round the front
      const R2 = this.rest;
      P.bodyY = -(R2.trunkY - 0.128 - GROUND) + 0.012 + Math.sin(t * 1.9) * 0.006;
      P.bodyRoll = 0.12;
      P.chestYaw = 0.7;
      P.hipsYaw = -0.6;
      P.chestRoll = 0.08;
      for (let i = 0; i < 2; i++) {
        const r = R2.paws[i], q = P.paws[i];
        q.x = r.x * 0.8 + 0.03; q.y = r.y; q.z = r.z - 0.02; q.flex = 1.5;
      }
      for (let i = 2; i < 4; i++) {
        const r = R2.paws[i], q = P.paws[i];
        q.x = r.x * 0.9 + 0.02; q.y = r.y; q.z = r.z + 0.14; q.toe = 0.2;
      }
      P.neckPitch = 1.25;
      P.neckYaw = 0.9;
      P.headPitch = 0.35;
      P.headYaw = 0.35;
      P.headRoll = -0.5;
      P.tailLift = -1.05;
      P.tailCurl = 0.55;
      P.tailSide = -2.0;
      P.tailDroop = 0.0;
      P.tailGround = 1;
      P.tailSway = 0.08;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Applying a pose to the skeleton                                    */
  /* ------------------------------------------------------------------ */

  applyLook(dt) {
    const P = this.pose;
    let yaw = 0, pitch = 0;
    const active = this.lookTarget && this.idleAction !== 'sleep' && !this.isDrinking;
    if (active) {
      this.group.updateWorldMatrix(true, false);
      _v1.copy(this.lookTarget);
      this.group.worldToLocal(_v1);
      const dx = _v1.x, dy = _v1.y - 0.62, dz = _v1.z - 0.3;
      yaw = clamp(Math.atan2(dx, dz), -1.0, 1.0);
      pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.45, 0.35);
      if (Math.abs(Math.atan2(dx, dz)) > 2.2) yaw = 0;
    }
    this.lookYaw = approach(this.lookYaw, yaw, 4, dt);
    this.lookPitch = approach(this.lookPitch, pitch, 4, dt);
    P.neckYaw += this.lookYaw * 0.45;
    P.headYaw = P.headYaw * (1 - Math.min(1, Math.abs(this.lookYaw) * 2)) + this.lookYaw * 0.55;
    P.headPitch += this.lookPitch * 0.6;
  }

  setLookTarget(worldPos) {
    if (!worldPos) { this.lookTarget = null; return; }
    if (!this.lookTarget) this.lookTarget = new THREE.Vector3();
    this.lookTarget.copy(worldPos);
  }

  applyPose(P) {
    const R = this.rest;
    // Body: rotate about the trunk centre, then offset
    this.body.rotation.set(P.bodyPitch, P.bodyYaw, P.bodyRoll, 'YXZ');
    _v1.copy(R.pivot).applyEuler(this.body.rotation);
    this.body.position.set(0, P.bodyY, P.bodyZ).add(R.pivot).sub(_v1);
    this.chest.position.set(R.chest.x, R.chest.y + P.chestY, R.chest.z + P.chestZ);
    this.chest.rotation.set(P.chestPitch, P.chestYaw, P.chestRoll, 'YXZ');
    this.hips.position.set(R.hips.x, R.hips.y + P.hipsY, R.hips.z + P.hipsZ);
    this.hips.rotation.set(P.hipsPitch, P.hipsYaw, P.hipsRoll, 'YXZ');
    this.neck.rotation.set(P.neckPitch, P.neckYaw, 0, 'YXZ');
    this.head.rotation.set(P.headPitch, P.headYaw, P.headRoll, 'YXZ');
    for (let i = 0; i < 2; i++) {
      const s = this.legs[i].root;
      s.position.copy(R.scap[i]);
      s.position.y += P.scapLift;
    }

    this.body.updateMatrix();
    this.chest.updateMatrix();
    this.hips.updateMatrix();
    for (let g = 0; g < 2; g++) {
      const girdle = g === 0 ? this.chest : this.hips;
      _mGirdle.multiplyMatrices(this.body.matrix, girdle.matrix);
      _mInv.copy(_mGirdle).invert();
      for (let i = g * 2; i < g * 2 + 2; i++) solveLeg(this.legs[i].rig, P.paws[i], _mInv);
    }

    // Tail: lift at the root, curl and sideways wrap along its length, and
    // a travelling sway
    const cfg = this.getMoodConfig();
    const segs = this.tailSegs;
    const tSpeed = 2.2 * cfg.tailSpeed + this.speedBlend * 2.5;
    for (let i = 0; i < segs.length; i++) {
      const u = (i + 1) / segs.length;
      const wave = Math.sin(this.time * tSpeed - i * 0.75) * (0.07 + 0.05 * u) * P.tailSway;
      const curl = P.tailCurl * (0.06 + 0.3 * u * u) - P.tailDroop * 0.18 * u;
      if (i === 0) {
        segs[i].rotation.set(P.tailLift + Math.sin(this.time * 1.6) * 0.05 * P.tailSway, P.tailSide * 0.25 + wave * 0.6, 0, 'YXZ');
      } else {
        segs[i].rotation.set(curl, P.tailSide * 0.22 + wave, 0, 'YXZ');
      }
    }
    if (P.tailGround > 0.001) this.layTailOnGround(P);
  }

  /**
   * Resting tail (sitting, sleeping): drop from the root to the ground,
   * then lie along it in a curve that wraps toward the paws, the tip still
   * twitching. Each bone is aimed down that path, then blended in.
   */
  layTailOnGround(P) {
    const segs = this.tailSegs;
    const L = this.anatomy.landmarks;
    const segLen = L.tailLen / 6;
    const restDir = _v2.set(L.tailDir[0], L.tailDir[1], L.tailDir[2]);
    // Hips orientation and the tail root, in cat space
    _mGirdle.multiplyMatrices(this.body.matrix, this.hips.matrix);
    _qParent.setFromRotationMatrix(_mGirdle);
    _v1.copy(segs[0].position).applyMatrix4(_mGirdle);
    let height = _v1.y - (GROUND + 0.024);
    // Heading: the hips' backward direction, flattened onto the ground
    _dir.copy(restDir).applyQuaternion(_qParent);
    const heading = Math.atan2(_dir.x, _dir.z);
    const turn = P.tailSide * 1.15;
    const w = P.tailGround;
    for (let k = 0; k < segs.length; k++) {
      const twitch = k >= 4 ? Math.sin(this.time * 2.3 + k) * 0.18 * P.tailSway : 0;
      const psi = heading + turn * (k + 0.5) / segs.length + twitch;
      const dy = -Math.min(height, segLen * 0.92);
      height += dy;
      const flat = Math.sqrt(Math.max(0, segLen * segLen - dy * dy));
      _dir.set(Math.sin(psi) * flat, dy, Math.cos(psi) * flat).normalize();
      _qWorld.setFromUnitVectors(restDir, _dir);
      _qLocal.copy(_qParent).invert().multiply(_qWorld);
      segs[k].quaternion.slerp(_qLocal, w);
      // The next bone's parent is this one, as it now actually sits
      _qParent.multiply(segs[k].quaternion);
    }
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
    this.jumpTime = 0.35;
    this.setMood('alert', 0.6, 2);
  }

  onLand() {
    this.landTime = 0.18;
  }

  onSprint(active) {
    if (active) this.setMood('alert', 0.4, 1);
  }

  setDrinking(active) {
    this.isDrinking = !!active;
    if (this.isDrinking && this.idleAction) this.endIdleAction();
  }

  /** Seconds of stillness before the next idle verb. */
  rollIdleInterval() {
    const [lo, hi] = (this.idleProfile && this.idleProfile.interval) || [18, 32];
    return lo + Math.random() * (hi - lo);
  }

  /** Start a named idle verb now (sit, groom, stretch, yawn, sleep). */
  startIdleAction(name, duration = 3) {
    if (this.isDrinking) return;
    this.idleAction = name;
    this.idleActionTimer = 0;
    this.idleActionDuration = duration;
    this.yawnOpen = 0;
  }

  beginIdleAction() {
    // Balanced idle repertoire (gentle stretches, yawns, occasional grooming/sitting)
    const actions = ['stretch', 'yawn', 'groom', 'sit'];
    const w = (this.idleProfile && this.idleProfile.weights) || null;
    const weights = w
      ? (() => {
        const raw = actions.map((a) => Math.max(0, w[a] ?? 0));
        const sum = raw.reduce((x, y) => x + y, 0) || 1;
        return raw.map((x) => x / sum);
      })()
      : [0.35, 0.30, 0.20, 0.15];
    const r = Math.random();
    let choice = 'stretch';
    let c = 0;
    for (let i = 0; i < actions.length; i++) {
      c += weights[i];
      if (r <= c) { choice = actions[i]; break; }
    }
    this.idleAction = choice;
    this.idleActionTimer = 0;
    this.idleActionDuration = choice === 'sit' ? 4 + Math.random() * 2 : choice === 'groom' ? 2.5 + Math.random() * 1.5 : choice === 'stretch' ? 2.2 + Math.random() : 1.6 + Math.random();
    this.yawnOpen = 0;
    if (this.audio && choice === 'sit' && Math.random() > 0.6) this.audio.playPurr(this.idleActionDuration);
  }

  endIdleAction() {
    this.idleAction = null;
    this.idleActionTimer = 0;
    this.idleTimer = 0;
    this.nextIdleTime = this.rollIdleInterval();
    this.yawnOpen = 0;
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
    if (this.collarBell) {
      this.collarBell.material = this.matGoldBell;
      const hk = this.anatomy.face.headScale;
      const twin = new THREE.Mesh(new THREE.SphereGeometry(this.bellR * 0.72, 22, 14), this.matGoldBell);
      twin.position.copy(this.collarBell.position);
      twin.position.x += 0.024 * hk;
      twin.position.y += 0.005 * hk;
      twin.rotation.y = -0.5;
      this.bellMount.add(twin);
      this.collarBellTwin = twin;
    }
  }

  setProwling(prowl) {
    this.isProwling = prowl;
    if (prowl) this.setMood('alert', 0.8, 1);
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
