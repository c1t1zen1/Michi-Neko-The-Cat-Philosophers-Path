import { clamp } from '../../cat_motion.js?v=20261107a';

/**
 * Mood: the seven moods (calm, curious, playful, sleepy, startled, alert,
 * cautious) and what each does to the ears, blinks, pupils, tail and head
 * scan; mood timers and priorities, the cat's own sounds (trill, hiss,
 * chirp, meow) with their cooldowns, and the face animation (ear carriage
 * and flicks, blinks and slow blinks, sleepy lids, saccades, mouth, the
 * startled bottlebrush tail).
 *
 * Moved verbatim from src/cat.js (lane c1-rig-split); `host` is the Cat.
 */

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export function getMoodConfig(host) {
  const map = {
    calm:       { earTwitchBase: 1.5, blinkBase: 1.0, pupilScale: 1.0, tailSpeed: 1.0, tailLift: 0.0,  headScan: 1.0, ear: [-0.08, 0.0] },
    curious:    { earTwitchBase: 1.0, blinkBase: 0.9, pupilScale: 1.08, tailSpeed: 0.9, tailLift: 0.10, headScan: 1.4, ear: [0.18, -0.04] },
    playful:    { earTwitchBase: 0.6, blinkBase: 0.85, pupilScale: 1.15, tailSpeed: 1.6, tailLift: 0.25, headScan: 1.8, ear: [0.12, -0.02] },
    sleepy:     { earTwitchBase: 3.0, blinkBase: 1.8, pupilScale: 0.90, tailSpeed: 0.4, tailLift: -0.05, headScan: 0.4, ear: [-0.22, 0.22] },
    startled:   { earTwitchBase: 0.2, blinkBase: 0.15, pupilScale: 1.25, tailSpeed: 2.2, tailLift: 0.4, headScan: 2.5, ear: [-0.5, 0.42] },
    alert:      { earTwitchBase: 0.7, blinkBase: 0.7, pupilScale: 1.10, tailSpeed: 1.3, tailLift: 0.15, headScan: 1.3, ear: [0.2, -0.06] },
    cautious:   { earTwitchBase: 1.2, blinkBase: 1.0, pupilScale: 1.0, tailSpeed: 0.7, tailLift: -0.10, headScan: 0.8, ear: [-0.36, 0.3] }
  };
  return map[host.mood] || map.calm;
}

export function setMood(host, name, duration = 2.0, priority = 0) {
  if (priority < host.moodPriority && host.moodTimer > 0 && name !== 'calm') return;
  if (name === 'calm') priority = 0;
  host.mood = name;
  host.moodTimer = Math.max(duration, 0);
  host.moodPriority = priority;
  if (host.audio) {
    if (name === 'playful' && host.canPlaySound('trill')) host.audio.playTrill();
    else if (name === 'startled' && host.canPlaySound('hiss')) host.audio.playHiss();
    else if (name === 'curious' && host.canPlaySound('chirp')) host.audio.playChirp();
  }
}

export function canPlaySound(host, type, cooldown = 1.5) {
  const now = performance.now() / 1000;
  host.soundCooldowns = host.soundCooldowns || {};
  if (now - (host.soundCooldowns[type] || 0) < cooldown) return false;
  host.soundCooldowns[type] = now;
  return true;
}

export function triggerMeow(host) {
  host.isMeowing = true;
  host.meowTimer = 0.55;
  host.setMood('playful', 1.0, 2);
  if (host.audio) host.audio.playMeow();
}

export function applyMood(host, dt, time, cfg) {
  // Ears: mood carriage (forward when interested, flattened when uneasy)
  // plus quick independent flicks
  const sleeping = host.idleAction === 'sleep';
  let earX = cfg.ear[0], earZ = cfg.ear[1];
  if (sleeping) { earX = -0.2; earZ = 0.26; }
  if (host.isSprinting) earX -= 0.2;
  if (host.yawnOpen > 0) { earX -= 0.25 * host.yawnOpen; earZ += 0.15 * host.yawnOpen; }
  host.earPose.x = approach(host.earPose.x, earX, 8, dt);
  host.earPose.z = approach(host.earPose.z, earZ, 8, dt);
  host.earTwitchTimer -= dt;
  if (host.earTwitchTimer <= 0) {
    host.earTwitch = 0.25;
    host.earTwitchSide = Math.random() < 0.5 ? 0 : 1;
    host.earTwitchTimer = (2.5 + Math.random() * 5) * cfg.earTwitchBase;
  }
  let flick = 0;
  if (host.earTwitch > 0) {
    host.earTwitch -= dt;
    flick = Math.sin(host.earTwitch * 40) * Math.max(0, host.earTwitch) * 1.4;
  }
  for (let i = 0; i < host.ears.length; i++) {
    const ear = host.ears[i];
    const s = ear.userData.side;
    const f = i === host.earTwitchSide ? flick : 0;
    ear.rotation.set(host.earPose.x + f + Math.sin(time * 1.1 + i) * 0.02, f * 0.4 * s, -s * host.earPose.z);
  }

  // Eyes: blinks, slow "I trust you" blinks when calm and still, sleepy
  // lids, and the pupil size for the mood
  host.blinkTimer -= dt;
  if (host.blinkTimer <= 0) {
    host.blink = 0.16;
    host.blinkTimer = (2 + Math.random() * 4) * cfg.blinkBase;
  }
  let blinkK = 0;
  if (host.blink > 0) {
    host.blink -= dt;
    blinkK = host.blink > 0.08 ? (0.16 - host.blink) / 0.08 : Math.max(0, host.blink) / 0.08;
  }
  const still = host.state === 'idle' && host.speed < 0.1;
  if (host.mood === 'calm' && still) host.slowBlinkTimer -= dt;
  if (host.slowBlinkTimer <= 0 && host.slowBlink <= 0) {
    host.slowBlink = 1.6;
    host.slowBlinkTimer = 9 + Math.random() * 14;
  }
  let slow = 0;
  if (host.slowBlink > 0) {
    host.slowBlink -= dt;
    const p = 1 - Math.max(0, host.slowBlink) / 1.6;
    slow = Math.sin(Math.PI * p) * 0.95;
  }
  let lids = host.mood === 'sleepy' ? 0.42 : 0;
  if (host.actionName === 'groom') lids = Math.max(lids, 0.55 * host.actionWeight);
  if (host.actionName === 'sit' && host.purr > 0) lids = Math.max(lids, 0.4 * host.actionWeight);
  if (host.actionName === 'stretch') lids = Math.max(lids, 0.6 * host.actionWeight);
  const closed = Math.max(host.yawnOpen * 0.95, sleeping ? host.actionWeight : 0);
  host.squint = approach(host.squint, lids, 6, dt);
  const blink = Math.min(1, Math.max(blinkK, slow, closed, host.squint));
  const st = host.face.state;
  st.x = blink;
  st.y = host.mood === 'playful' ? 0.12 : 0;
  st.z = approach(st.z, cfg.pupilScale, 5, dt);
  st.w = sleeping ? 1 : 0;

  // Little saccades so the eyes never look painted on
  host.gazeTimer -= dt;
  if (host.gazeTimer <= 0) {
    host.gazeTimer = 1.2 + Math.random() * 3;
    host.gazeTarget.set((Math.random() - 0.5) * 0.24, (Math.random() - 0.5) * 0.1);
    if (host.lookTarget) host.gazeTarget.x = clamp(host.lookYaw * 0.25, -0.18, 0.18);
  }
  host.gaze.x = approach(host.gaze.x, host.gazeTarget.x, 18, dt);
  host.gaze.y = approach(host.gaze.y, host.gazeTarget.y, 18, dt);
  host.face.look.copy(host.gaze);

  // Mouth: meow, yawn, licking and lapping
  let mouth = host.yawnOpen;
  if (host.isMeowing) {
    host.meowTimer -= dt;
    const meowOpen = Math.sin((1 - Math.max(0, host.meowTimer) / 0.55) * Math.PI);
    mouth = Math.max(mouth, meowOpen * 0.7);
    host.head.rotation.x -= meowOpen * 0.18;
    if (host.meowTimer <= 0) host.isMeowing = false;
  }
  if (host.actionName === 'groom') mouth = Math.max(mouth, (0.2 + 0.12 * Math.sin(host.idleActionTimer * 9.5)) * host.actionWeight);
  if (host.isDrinking) mouth = Math.max(mouth, Math.max(0, Math.sin(time * 13)) * 0.3 * host.actionWeight);
  host.mouthOpen = approach(host.mouthOpen, mouth, 16, dt);
  host.face.mouth.value = host.mouthOpen;

  // A startled cat's tail fluffs up into a bottlebrush. The swell is a
  // morph on the tail tube: scaling the chained tail bones would compound
  // down the chain (and stretch the tail along its length).
  host.tailPuff = approach(host.tailPuff, host.mood === 'startled' ? 1 : 0, host.mood === 'startled' ? 10 : 2, dt);
  host.tailMesh.morphTargetInfluences[0] = host.tailPuff;
  host.tailMesh.userData.outline.morphTargetInfluences[0] = host.tailPuff;

  if (!host.idleAction) {
    const scan = cfg.headScan;
    host.head.rotation.y += Math.sin(time * 0.45) * 0.1 * (scan - 1) * (1 - Math.min(1, Math.abs(host.lookYaw) * 2));
    host.head.rotation.x += Math.sin(time * 0.7) * 0.03 * (scan - 1);
  }
}
