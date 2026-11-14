import * as THREE from 'three';
import { GROUND } from '../../cat_anatomy.js?v=20261107a';
import { makePose, copyPose, smoothstep, clamp } from '../../cat_motion.js?v=20261107a';

/**
 * Poses and idle verbs: the rest pose, the action poses (sit, groom,
 * stretch, yawn, drink, sleep) written into a pose record, the head turning
 * toward a look target, and the idle-verb scheduling (which verb, for how
 * long, and the stillness before the next one; a personality reweights them
 * through `host.idleProfile`).
 *
 * Moved verbatim from src/cat.js (lane c1-rig-split); `host` is the Cat.
 */

const lerp = (a, b, t) => a + (b - a) * t;
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const _v1 = new THREE.Vector3();

/** Standing at rest: paws under the girdles, tail up in a soft hook. */
export function makeNeutralPose(host) {
  const P = makePose();
  for (let i = 0; i < 4; i++) {
    const r = host.rest.paws[i];
    P.paws[i].x = r.x; P.paws[i].y = r.y; P.paws[i].z = r.z;
  }
  P.neckPitch = -0.04;
  P.tailLift = 1.05;
  P.tailCurl = 0.95;
  P.tailSway = 1;
  return P;
}

/** Place the body so the pelvis lands at (y, z) with the given pitch. */
export function placeBody(host, P, hipsY, hipsZ, pitch) {
  const pv = host.rest.pivot;
  const hy = host.rest.hips.y - pv.y, hz = host.rest.hips.z - pv.z;
  const c = Math.cos(pitch), s = Math.sin(pitch);
  P.bodyPitch = pitch;
  P.bodyY = hipsY - pv.y - (hy * c - hz * s);
  P.bodyZ = hipsZ - pv.z - (hy * s + hz * c);
}

/** A sitting cat: rump down, forelegs straight, tail curled round. */
export function poseSit(host, P) {
  const R = host.rest;
  host.placeBody(P, GROUND + 0.168, R.hips.z + 0.045, -0.78);
  P.chestPitch = 0.06;
  P.neckPitch = 0.42;
  P.headPitch = 0.3 + Math.sin(host.time * 0.6) * 0.04;
  P.headYaw = Math.sin(host.time * 0.37) * 0.25;
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
  P.bodyY += Math.sin(host.time * 1.7) * 0.0025;
}

export function getActionPose(host, name, P) {
  copyPose(P, host.neutral);
  const R = host.rest;
  const t = host.idleActionTimer;
  const time = host.time;
  if (name === 'sit') {
    host.poseSit(P);
  } else if (name === 'groom') {
    host.poseSit(P);
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
    host.placeBody(P, R.trunkY + 0.04, R.hips.z - 0.03, 0.45);
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
    host.placeBody(P, R.trunkY - 0.075, R.hips.z + 0.03, 0.2);
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
    const R2 = host.rest;
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

export function applyLook(host, dt) {
  const P = host.pose;
  let yaw = 0, pitch = 0;
  const active = host.lookTarget && host.idleAction !== 'sleep' && !host.isDrinking;
  if (active) {
    host.group.updateWorldMatrix(true, false);
    _v1.copy(host.lookTarget);
    host.group.worldToLocal(_v1);
    const dx = _v1.x, dy = _v1.y - 0.62, dz = _v1.z - 0.3;
    yaw = clamp(Math.atan2(dx, dz), -1.0, 1.0);
    pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.45, 0.35);
    if (Math.abs(Math.atan2(dx, dz)) > 2.2) yaw = 0;
  }
  host.lookYaw = approach(host.lookYaw, yaw, 4, dt);
  host.lookPitch = approach(host.lookPitch, pitch, 4, dt);
  P.neckYaw += host.lookYaw * 0.45;
  P.headYaw = P.headYaw * (1 - Math.min(1, Math.abs(host.lookYaw) * 2)) + host.lookYaw * 0.55;
  P.headPitch += host.lookPitch * 0.6;
}

export function setLookTarget(host, worldPos) {
  if (!worldPos) { host.lookTarget = null; return; }
  if (!host.lookTarget) host.lookTarget = new THREE.Vector3();
  host.lookTarget.copy(worldPos);
}

export function setDrinking(host, active) {
  host.isDrinking = !!active;
  if (host.isDrinking && host.idleAction) host.endIdleAction();
}

/** Seconds of stillness before the next idle verb. */
export function rollIdleInterval(host) {
  const [lo, hi] = (host.idleProfile && host.idleProfile.interval) || [18, 32];
  return lo + Math.random() * (hi - lo);
}

/** Start a named idle verb now (sit, groom, stretch, yawn, sleep). */
export function startIdleAction(host, name, duration = 3) {
  if (host.isDrinking) return;
  host.idleAction = name;
  host.idleActionTimer = 0;
  host.idleActionDuration = duration;
  host.yawnOpen = 0;
}

export function beginIdleAction(host) {
  // Balanced idle repertoire (gentle stretches, yawns, occasional grooming/sitting)
  const actions = ['stretch', 'yawn', 'groom', 'sit'];
  const w = (host.idleProfile && host.idleProfile.weights) || null;
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
  host.idleAction = choice;
  host.idleActionTimer = 0;
  host.idleActionDuration = choice === 'sit' ? 4 + Math.random() * 2 : choice === 'groom' ? 2.5 + Math.random() * 1.5 : choice === 'stretch' ? 2.2 + Math.random() : 1.6 + Math.random();
  host.yawnOpen = 0;
  if (host.audio && choice === 'sit' && Math.random() > 0.6) host.audio.playPurr(host.idleActionDuration);
}

export function endIdleAction(host) {
  host.idleAction = null;
  host.idleActionTimer = 0;
  host.idleTimer = 0;
  host.nextIdleTime = host.rollIdleInterval();
  host.yawnOpen = 0;
}
