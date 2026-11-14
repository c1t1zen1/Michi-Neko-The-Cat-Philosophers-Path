import { copyPose, lerpPose, smoothstep } from '../../cat_motion.js?v=20261107a';

/**
 * Locomotion: the gait clock and paw targets (a lateral walk that eases
 * into a trot and, when sprinting, a rotary gallop with spine flexion), body
 * bob / pitch / roll, the tail's carriage with speed, prowling, and the
 * airborne and landing poses. Writes `host.locoPose`, which the frame update
 * blends with the action pose before the rig applies it.
 *
 * Moved verbatim from src/cat.js (lane c1-rig-split); `host` is the Cat.
 */

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (x) => x - Math.floor(x);
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

// Leg order: 0 front x<0, 1 front x>0, 2 hind x<0, 3 hind x>0.
// Phase offsets (fraction of a stride) for each gait.
export const GAIT_WALK = [0.75, 0.25, 0.5, 0.0];   // lateral sequence: LH, LF, RH, RF
export const GAIT_TROT = [1.0, 0.5, 0.5, 0.0];     // diagonal pairs
export const GAIT_GALLOP = [1.42, 0.52, 0.1, 0.0]; // rotary gallop

/** Gait: paw targets, body bob / pitch / roll, spine bend, tail carriage. */
export function computeLocomotion(host, dt, grounded, sprint) {
  const P = host.locoPose;
  copyPose(P, host.neutral);
  const t = host.time;
  const prowl = host.isProwling;
  const state = host.state;
  const moving = state === 'walk' || state === 'run';
  const turning = state === 'turn';
  const v = host.speed;
  const sb = Math.min(1, host.speedBlend);

  host.trotMix = approach(host.trotMix, prowl ? 0 : smoothstep(1.8, 3.4, v), 4, dt);
  host.gallopMix = approach(host.gallopMix, sprint && v > 4.5 ? 1 : 0, 3.5, dt);
  host.gaitAmp = approach(host.gaitAmp, moving || turning ? 1 : 0, moving ? 7 : 5, dt);
  const tm = host.trotMix, gm = host.gallopMix, amp = host.gaitAmp;

  // Stride length grows with speed; the stride rate follows from it, so
  // a planted paw moves back exactly as fast as the body moves forward
  const vEff = turning && v < 0.3 ? 0.6 : v;
  let S = lerp(lerp(0.3 + 0.25 * vEff, 0.52 + 0.11 * vEff, tm), 0.85 + 0.09 * vEff, gm);
  if (prowl) S *= 0.85;
  const duty = lerp(lerp(0.62, 0.42, tm), 0.34, gm);
  const liftF = lerp(lerp(0.05, 0.07, tm), 0.085, gm) * (prowl ? 1.25 : 1);
  const liftH = lerp(lerp(0.055, 0.07, tm), 0.075, gm) * (prowl ? 1.2 : 1);
  if (moving || turning) host.phase += dt * vEff / S;
  const sweep = S * duty * (turning ? 0.22 : 1);

  for (let i = 0; i < 4; i++) {
    const front = i < 2;
    const off = lerp(lerp(GAIT_WALK[i], GAIT_TROT[i], tm), GAIT_GALLOP[i], gm);
    const ph = frac(host.phase + off);
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
    const r = host.rest.paws[i];
    const paw = P.paws[i];
    paw.x = r.x * (1 - 0.1 * amp);
    paw.y = r.y + y * amp;
    paw.z = r.z + z * amp;
    paw.flex = flex * amp;
    paw.toe = toe * amp;
  }

  const ph2 = host.phase * TAU;
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
  const cfg = host.getMoodConfig();
  P.tailLift = lerp(lerp(1.05, 0.88, tm * amp), 0.32, gm) + cfg.tailLift;
  P.tailCurl = lerp(lerp(0.95, 0.45, Math.max(sb, tm)), -0.1, gm);
  P.tailSway = lerp(1, 0.6, gm);
  if (prowl) { P.tailLift = 0.14; P.tailCurl = -0.12; P.tailDroop = 0.25; P.tailSway = 0.5; }

  // Airborne / landing
  host.airBlend = approach(host.airBlend, grounded ? 0 : 1, 16, dt);
  host.landBlend = approach(host.landBlend, host.landTime > 0 ? 1 : 0, 18, dt);
  if (host.airBlend > 0.002) {
    const Q = host.airPose;
    copyPose(Q, P);
    const launch = host.jumpTime > 0 ? smoothstep(0, 0.3, host.jumpTime) : 0;
    for (let i = 0; i < 4; i++) {
      const r = host.rest.paws[i];
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
    lerpPose(P, P, Q, host.airBlend);
  }
  if (host.landBlend > 0.002) {
    const k = host.landBlend;
    P.bodyY -= 0.065 * k;
    P.chestPitch += 0.08 * k;
    P.neckPitch -= 0.06 * k;
    P.tailLift -= 0.25 * k;
  }
}

export function onJump(host) {
  host.jumpTime = 0.35;
  host.setMood('alert', 0.6, 2);
}

export function onLand(host) {
  host.landTime = 0.18;
}

export function onSprint(host, active) {
  if (active) host.setMood('alert', 0.4, 1);
}

export function setProwling(host, prowl) {
  host.isProwling = prowl;
  if (prowl) host.setMood('alert', 0.8, 1);
}
