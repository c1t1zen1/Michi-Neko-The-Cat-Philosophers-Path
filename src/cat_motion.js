import * as THREE from 'three';

/**
 * Cat motion helpers: the pose record every behaviour writes into, pose
 * blending, and the leg solvers.
 *
 * Legs are solved in the sagittal plane of their girdle (chest for the
 * forelegs, hips for the hind legs) after a sideways abduction swing:
 *  - Foreleg: the scapula pivots from the withers and carries part of the
 *    swing (the long feline shoulder stride), then shoulder → elbow → wrist
 *    is a two-bone solve with the elbow folding back; the metacarpus angle
 *    is chosen by the gait (flat in stance, folded back in swing).
 *  - Hind leg: the metatarsus stays parallel to the femur (the pantograph
 *    linkage of a digitigrade leg), so thigh + metatarsus act as one link
 *    and the stifle always points forward, the hock back.
 * Angles φ are measured in a girdle's y-z plane as atan2(z, y), so a bone's
 * rotation.x adds directly to the φ of everything below it.
 */

const TAU = Math.PI * 2;
export const wrap = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const phi = (y, z) => Math.atan2(z, y);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/** The animatable pose: girdle/body transforms, paw targets, tail shape. */
export function makePose() {
  return {
    bodyY: 0, bodyZ: 0, bodyPitch: 0, bodyRoll: 0, bodyYaw: 0,
    chestY: 0, chestZ: 0, chestPitch: 0, chestYaw: 0, chestRoll: 0,
    hipsY: 0, hipsZ: 0, hipsPitch: 0, hipsYaw: 0, hipsRoll: 0,
    neckPitch: 0, neckYaw: 0, headPitch: 0, headYaw: 0, headRoll: 0,
    scapLift: 0,
    tailLift: 0, tailCurl: 0, tailSide: 0, tailSway: 0, tailDroop: 0, tailGround: 0,
    // Paw targets in cat (group) space: front = knuckle, hind = ball of
    // foot. `flex` folds the wrist (front) back; `toe` tips the toes down.
    paws: [0, 1, 2, 3].map(() => ({ x: 0, y: 0, z: 0, flex: 0, toe: 0 }))
  };
}

const SCALARS = [
  'bodyY', 'bodyZ', 'bodyPitch', 'bodyRoll', 'bodyYaw',
  'chestY', 'chestZ', 'chestPitch', 'chestYaw', 'chestRoll',
  'hipsY', 'hipsZ', 'hipsPitch', 'hipsYaw', 'hipsRoll',
  'neckPitch', 'neckYaw', 'headPitch', 'headYaw', 'headRoll',
  'scapLift', 'tailLift', 'tailCurl', 'tailSide', 'tailSway', 'tailDroop', 'tailGround'
];

export function copyPose(out, a) {
  for (const k of SCALARS) out[k] = a[k];
  for (let i = 0; i < 4; i++) Object.assign(out.paws[i], a.paws[i]);
  return out;
}

export function lerpPose(out, a, b, t) {
  for (const k of SCALARS) out[k] = a[k] + (b[k] - a[k]) * t;
  for (let i = 0; i < 4; i++) {
    const o = out.paws[i], p = a.paws[i], q = b.paws[i];
    o.x = p.x + (q.x - p.x) * t;
    o.y = p.y + (q.y - p.y) * t;
    o.z = p.z + (q.z - p.z) * t;
    o.flex = p.flex + (q.flex - p.flex) * t;
    o.toe = p.toe + (q.toe - p.toe) * t;
  }
  return out;
}

/** Ease `cur` toward `target` with a time constant (frame-rate independent). */
export function dampPose(cur, target, rate, dt) {
  return lerpPose(cur, cur, target, 1 - Math.exp(-rate * dt));
}

const _v = new THREE.Vector3();
const _d = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** Rest geometry of one leg, from body-space landmarks. */
export function makeLegRig(kind, bones, joints, parentPos) {
  const rel = joints.map((p) => new THREE.Vector3(p[0] - parentPos[0], p[1] - parentPos[1], p[2] - parentPos[2]));
  const seg = (a, b) => phi(rel[b].y - rel[a].y, rel[b].z - rel[a].z);
  const dist = (a, b) => rel[a].distanceTo(rel[b]);
  if (kind === 'front') {
    // joints: scap top Q, shoulder S, elbow E, wrist W, knuckle K, toe T
    return {
      kind, bones, rel,
      L1: dist(1, 2), L2: dist(2, 3), L3: dist(3, 4),
      phiQS: seg(0, 1), phiQK: seg(0, 4), phi1: seg(1, 2), phi2: seg(2, 3), phi3: seg(3, 4), phi4: seg(4, 5),
      restMetaG: phi(joints[4][1] - joints[3][1], joints[4][2] - joints[3][2]),
      restToeG: phi(joints[5][1] - joints[4][1], joints[5][2] - joints[4][2])
    };
  }
  // joints: hip H, stifle K, hock A, ball M, toe T
  return {
    kind, bones, rel,
    L1: dist(0, 1), L2: dist(1, 2), L3: dist(2, 3),
    phi1: seg(0, 1), phi2: seg(1, 2), phi3: seg(2, 3), phi4: seg(3, 4),
    restToeG: phi(joints[4][1] - joints[3][1], joints[4][2] - joints[3][2])
  };
}

/** φ of a group-space sagittal direction, re-expressed in a girdle frame. */
function phiInFrame(phiG, invRot) {
  _d.set(0, Math.cos(phiG), Math.sin(phiG)).transformDirection(invRot);
  return phi(_d.y, _d.z);
}

/**
 * Solve one leg toward `paw` (group space) given the girdle's matrix
 * relative to the cat group and its inverse.
 */
export function solveLeg(leg, paw, girdleInv) {
  _v.set(paw.x, paw.y, paw.z).applyMatrix4(girdleInv);
  const r = leg.rel;
  const b = leg.bones;
  if (leg.kind === 'front') {
    const Q = r[0];
    // Sideways swing about the withers, then work in the swung plane
    const ab = clamp(Math.atan2(_v.x - r[4].x, Q.y - _v.y), -0.45, 0.45);
    const ty = Q.y + (_v.y - Q.y) * Math.cos(ab) - (_v.x - Q.x) * Math.sin(ab);
    const tz = _v.z;
    // Scapula carries ~half the swing, limited like the real shoulder
    const psi = wrap(phi(ty - Q.y, tz - Q.z) - leg.phiQK);
    const sigma = clamp(psi * 0.3, -0.34, 0.34);
    const sy0 = r[1].y - Q.y, sz0 = r[1].z - Q.z;
    const cs = Math.cos(sigma), sn = Math.sin(sigma);
    const Sy = Q.y + sy0 * cs - sz0 * sn;
    const Sz = Q.z + sy0 * sn + sz0 * cs;
    _m.extractRotation(girdleInv);
    const metaPhi = phiInFrame(leg.restMetaG + paw.flex, _m);
    const toePhi = phiInFrame(leg.restToeG + paw.flex * 0.6 + paw.toe, _m);
    const Wy = ty - leg.L3 * Math.cos(metaPhi);
    const Wz = tz - leg.L3 * Math.sin(metaPhi);
    const dy = Wy - Sy, dz = Wz - Sz;
    const d = Math.hypot(dy, dz) || 1e-6;
    const dc = clamp(d, Math.abs(leg.L1 - leg.L2) * 1.02 + 1e-4, (leg.L1 + leg.L2) * 0.9995);
    const base = phi(dy, dz);
    const cosA = clamp((leg.L1 * leg.L1 + dc * dc - leg.L2 * leg.L2) / (2 * leg.L1 * dc), -1, 1);
    const phiE = base + Math.acos(cosA); // elbow folds back
    const Ey = Sy + leg.L1 * Math.cos(phiE), Ez = Sz + leg.L1 * Math.sin(phiE);
    const phiF = phi(Sy + (dy / d) * dc - Ey, Sz + (dz / d) * dc - Ez);
    const A0 = sigma;
    const A1 = wrap(phiE - leg.phi1);
    const A2 = wrap(phiF - leg.phi2);
    const A3 = wrap(metaPhi - leg.phi3);
    const A4 = wrap(toePhi - leg.phi4);
    b[0].rotation.set(A0, 0, ab, 'ZXY');
    b[1].rotation.x = wrap(A1 - A0);
    b[2].rotation.x = wrap(A2 - A1);
    b[3].rotation.x = wrap(A3 - A2);
    b[4].rotation.x = wrap(A4 - A3);
    return;
  }
  const H = r[0];
  const ab = clamp(Math.atan2(_v.x - r[3].x, H.y - _v.y), -0.45, 0.45);
  const dy = (_v.y - H.y) * Math.cos(ab) - (_v.x - H.x) * Math.sin(ab);
  const dz = _v.z - H.z;
  const A = leg.L1 + leg.L3, B = leg.L2;
  const d = Math.hypot(dy, dz) || 1e-6;
  const dc = clamp(d, Math.abs(A - B) * 1.02 + 1e-4, (A + B) * 0.9995);
  const base = phi(dy, dz);
  const cosA = clamp((A * A + dc * dc - B * B) / (2 * A * dc), -1, 1);
  const phiU = base - Math.acos(cosA); // stifle forward, hock back
  const Xy = H.y + A * Math.cos(phiU), Xz = H.z + A * Math.sin(phiU);
  const phiV = phi(H.y + (dy / d) * dc - Xy, H.z + (dz / d) * dc - Xz);
  _m.extractRotation(girdleInv);
  const toePhi = phiInFrame(leg.restToeG + paw.toe, _m);
  const A1 = wrap(phiU - leg.phi1);
  const A2 = wrap(phiV - leg.phi2);
  const A3 = wrap(phiU - leg.phi3);
  const A4 = wrap(toePhi - leg.phi4);
  b[0].rotation.set(A1, 0, ab, 'ZXY');
  b[1].rotation.x = wrap(A2 - A1);
  b[2].rotation.x = wrap(A3 - A2);
  b[3].rotation.x = wrap(A4 - A3);
}

export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export { clamp };
