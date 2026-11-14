import * as THREE from 'three';
import { getCatAnatomy, BUILDS, GROUND } from '../cat_anatomy.js?v=20261107a';
import { makeLegRig, solveLeg } from '../cat_motion.js?v=20261107a';

/**
 * The cat rig: the sculpt for a body type, the feline skeleton built from its
 * landmarks, the leg IK wiring, and applying a pose record to the bones.
 *
 * Every function takes the character `host` (the `Cat`, src/cat.js) and reads
 * or writes the same fields the Cat always had: `bones`, `bone()`, `body`,
 * `hips`, `chest`, `neck`, `head`, `skeleton`, `rest`, `legs`, `tailSegs`,
 * `tailRoot`. Moved verbatim from src/cat.js (lane c1-rig-split).
 */

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mGirdle = new THREE.Matrix4();
const _mInv = new THREE.Matrix4();
const _qParent = new THREE.Quaternion();
const _qWorld = new THREE.Quaternion();
const _qLocal = new THREE.Quaternion();
const _dir = new THREE.Vector3();

/* -------------------------------------------------------------------- */
/*  Body type → sculpt (cached per body type in src/cat_anatomy.js)      */
/* -------------------------------------------------------------------- */

/** A body type as the Cat has always read it: a BUILDS key or a proportions object; anything else is Michi's. */
export function resolveBuild(build) {
  return typeof build === 'object' && build ? build : (BUILDS[build] || BUILDS.michi);
}

/**
 * Sculpt counter (C1.5). `requests` counts sculpt lookups; `sculpts` counts
 * distinct sculpts seen (getCatAnatomy caches one per body type, so a new
 * object means a new sculpt). Swapping a part, changing a tier or recolouring
 * never asks for a sculpt.
 */
export const sculptStats = { requests: 0, sculpts: 0 };
const seenSculpts = new WeakSet();

/** The (cached) sculpt for a body type. */
export function anatomyFor(build) {
  sculptStats.requests++;
  const anatomy = getCatAnatomy(resolveBuild(build));
  if (!seenSculpts.has(anatomy)) {
    seenSculpts.add(anatomy);
    sculptStats.sculpts++;
  }
  return anatomy;
}

/* -------------------------------------------------------------------- */
/*  Skeleton and leg IK wiring                                           */
/* -------------------------------------------------------------------- */

export function buildSkeleton(host) {
  const A = host.anatomy;
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
  host.bones = bones;
  const bone = (name) => bones[A.boneIndex.get(name)];
  host.bone = bone;
  host.body = bone('body');
  host.hips = bone('hips');
  host.chest = bone('chest');
  host.neck = bone('neck');
  host.head = bone('head');
  host.group.add(host.body);
  host.group.updateMatrixWorld(true);
  host.skeleton = new THREE.Skeleton(bones);

  const L = A.landmarks;
  host.rest = {
    chest: host.chest.position.clone(),
    hips: host.hips.position.clone(),
    scap: [bone('scapR').position.clone(), bone('scapL').position.clone()],
    pivot: new THREE.Vector3(0, L.chest[1], -0.02),
    trunkY: L.chest[1],
    paws: []
  };
  // Legs: 0 front R (x<0), 1 front L, 2 hind R, 3 hind L
  host.legs = [];
  for (const k of ['R', 'L']) {
    const f = L.front[k];
    const rig = makeLegRig('front',
      ['scap', 'humerus', 'forearm', 'wrist', 'fpaw'].map((n) => bone(n + k)),
      [f.scap, f.shoulder, f.elbow, f.wrist, f.knuckle, f.toe], L.chest);
    host.legs.push({ front: true, rig, root: bone('scap' + k), knee: bone('forearm' + k), paw: bone('fpaw' + k) });
    host.rest.paws.push(new THREE.Vector3(...f.knuckle));
  }
  for (const k of ['R', 'L']) {
    const h = L.hind[k];
    const rig = makeLegRig('hind',
      ['femur', 'tibia', 'meta', 'hpaw'].map((n) => bone(n + k)),
      [h.hip, h.stifle, h.hock, h.ball, h.toe], L.hips);
    host.legs.push({ front: false, rig, root: bone('femur' + k), knee: bone('tibia' + k), paw: bone('hpaw' + k) });
    host.rest.paws.push(new THREE.Vector3(...h.ball));
  }
  host.tailSegs = [0, 1, 2, 3, 4, 5].map((i) => bone('tail' + i));
  host.tailRoot = host.tailSegs[0];
}

/* -------------------------------------------------------------------- */
/*  Applying a pose to the skeleton                                      */
/* -------------------------------------------------------------------- */

export function applyPose(host, P) {
  const R = host.rest;
  // Body: rotate about the trunk centre, then offset
  host.body.rotation.set(P.bodyPitch, P.bodyYaw, P.bodyRoll, 'YXZ');
  _v1.copy(R.pivot).applyEuler(host.body.rotation);
  host.body.position.set(0, P.bodyY, P.bodyZ).add(R.pivot).sub(_v1);
  host.chest.position.set(R.chest.x, R.chest.y + P.chestY, R.chest.z + P.chestZ);
  host.chest.rotation.set(P.chestPitch, P.chestYaw, P.chestRoll, 'YXZ');
  host.hips.position.set(R.hips.x, R.hips.y + P.hipsY, R.hips.z + P.hipsZ);
  host.hips.rotation.set(P.hipsPitch, P.hipsYaw, P.hipsRoll, 'YXZ');
  host.neck.rotation.set(P.neckPitch, P.neckYaw, 0, 'YXZ');
  host.head.rotation.set(P.headPitch, P.headYaw, P.headRoll, 'YXZ');
  for (let i = 0; i < 2; i++) {
    const s = host.legs[i].root;
    s.position.copy(R.scap[i]);
    s.position.y += P.scapLift;
  }

  host.body.updateMatrix();
  host.chest.updateMatrix();
  host.hips.updateMatrix();
  for (let g = 0; g < 2; g++) {
    const girdle = g === 0 ? host.chest : host.hips;
    _mGirdle.multiplyMatrices(host.body.matrix, girdle.matrix);
    _mInv.copy(_mGirdle).invert();
    for (let i = g * 2; i < g * 2 + 2; i++) solveLeg(host.legs[i].rig, P.paws[i], _mInv);
  }

  // Tail: lift at the root, curl and sideways wrap along its length, and
  // a travelling sway
  const cfg = host.getMoodConfig();
  const segs = host.tailSegs;
  const tSpeed = 2.2 * cfg.tailSpeed + host.speedBlend * 2.5;
  for (let i = 0; i < segs.length; i++) {
    const u = (i + 1) / segs.length;
    const wave = Math.sin(host.time * tSpeed - i * 0.75) * (0.07 + 0.05 * u) * P.tailSway;
    const curl = P.tailCurl * (0.06 + 0.3 * u * u) - P.tailDroop * 0.18 * u;
    if (i === 0) {
      segs[i].rotation.set(P.tailLift + Math.sin(host.time * 1.6) * 0.05 * P.tailSway, P.tailSide * 0.25 + wave * 0.6, 0, 'YXZ');
    } else {
      segs[i].rotation.set(curl, P.tailSide * 0.22 + wave, 0, 'YXZ');
    }
  }
  if (P.tailGround > 0.001) host.layTailOnGround(P);
}

/**
 * Resting tail (sitting, sleeping): drop from the root to the ground,
 * then lie along it in a curve that wraps toward the paws, the tip still
 * twitching. Each bone is aimed down that path, then blended in.
 */
export function layTailOnGround(host, P) {
  const segs = host.tailSegs;
  const L = host.anatomy.landmarks;
  const segLen = L.tailLen / 6;
  const restDir = _v2.set(L.tailDir[0], L.tailDir[1], L.tailDir[2]);
  // Hips orientation and the tail root, in cat space
  _mGirdle.multiplyMatrices(host.body.matrix, host.hips.matrix);
  _qParent.setFromRotationMatrix(_mGirdle);
  _v1.copy(segs[0].position).applyMatrix4(_mGirdle);
  let height = _v1.y - (GROUND + 0.024);
  // Heading: the hips' backward direction, flattened onto the ground
  _dir.copy(restDir).applyQuaternion(_qParent);
  const heading = Math.atan2(_dir.x, _dir.z);
  const turn = P.tailSide * 1.15;
  const w = P.tailGround;
  for (let k = 0; k < segs.length; k++) {
    const twitch = k >= 4 ? Math.sin(host.time * 2.3 + k) * 0.18 * P.tailSway : 0;
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
