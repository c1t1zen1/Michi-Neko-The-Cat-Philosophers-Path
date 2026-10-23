import * as THREE from 'three';
import { Cat } from './cat.js?v=20261022f';

const _lookAt = new THREE.Vector3();

/**
 * Villager temperaments. Each cat gets its own idle repertoire, pace, size
 * and manner of greeting so the three read as individuals standing next to
 * the player cat rather than recolours of it.
 *   idle      reweights the idle verbs and the pause between them
 *   scale     overall body size (silhouette variety on top of the build)
 *   stripes   how much of the tabby pattern shows (0 = solid coat)
 *   notice    metres at which the cat first takes notice of the player
 *   greeting  what it does when the player comes close
 *   startle   how it reacts to a sprinting player nearby
 */
const PERSONALITIES = {
  // Dignified and tidy: grooms and sits, greets with a slow blink.
  luna: {
    scale: 1.0, stripes: 0.3, notice: 8,
    idle: { weights: { groom: 0.42, sit: 0.4, stretch: 0.1, yawn: 0.08 }, interval: [9, 16] },
    greeting: 'slowblink', startle: 'alert'
  },
  // Round and bouncy: stretches, yawns, bounds up to say hello.
  mochi: {
    scale: 0.96, stripes: 1.0, notice: 11,
    idle: { weights: { stretch: 0.4, yawn: 0.3, groom: 0.15, sit: 0.15 }, interval: [8, 15] },
    greeting: 'playful', startle: 'startled'
  },
  // Aloof and long-limbed: sits and watches, warms up slowly.
  kuro: {
    scale: 1.05, stripes: 0.0, notice: 7,
    idle: { weights: { sit: 0.65, groom: 0.15, stretch: 0.1, yawn: 0.1 }, interval: [14, 24] },
    greeting: 'wary', startle: 'cautious'
  }
};

export class NPC {
  constructor(scene, name, color, position, dialogueLines, options = {}) {
    this.scene = scene;
    this.name = name;
    this.dialogue = dialogueLines || [];
    this.dialogueProvider = options.dialogueProvider || null;
    this.onDialogueComplete = options.onDialogueComplete || null;
    this.baseY = position.y;
    this.hasGreeted = false;

    this.mesh = new THREE.Group();
    this.mesh.name = `${name} (NPC)`;

    // Elegant Kyoto Cat Customization for Luna / NPC Companions
    const isLuna = name.toLowerCase().includes('luna');
    // Luna is a silver smoke-grey (Kuro already owns the black coat), so the
    // two read as different cats at a glance, day or night.
    const furColor = options.fur ?? (isLuna ? 0x7f8796 : (color || 0x3a3a3f));
    const bellyColor = options.belly ?? (isLuna ? 0xdadce2 : 0xede4d0);
    const accentColor = options.accent ?? (isLuna ? 0x474e5f : 0x2e2017);
    const eyeColor = options.eyeColor ?? (isLuna ? 0xdec056 : 0xa2ba6e); // Moonlit Amber/Jade eyes for Luna
    const ribbonColor = options.ribbonColor ?? (isLuna ? 0x2b3d63 : 0xc8402a); // Indigo silk ribbon for Luna

    // Each villager has their own build (src/cat_anatomy.js BUILDS): Luna
    // slender, Mochi round, Kuro long-limbed; anyone else shares Michi's.
    const persona = PERSONALITIES[name.toLowerCase()] || null;
    this.persona = persona;
    this.cat = new Cat({
      stripeAmount: options.stripeAmount ?? (persona ? persona.stripes : undefined),
      idleProfile: options.idleProfile ?? (persona ? persona.idle : undefined),
      fur: furColor,
      belly: bellyColor,
      accent: accentColor,
      eyeColor: eyeColor,
      ribbonColor: ribbonColor,
      build: options.build ?? name.toLowerCase(),
      audio: options.audio || null
    });

    if (persona && persona.scale !== 1) this.cat.group.scale.setScalar(persona.scale);
    this.mesh.add(this.cat.group);
    this.mesh.position.copy(position);
    this.mesh.position.y = this.baseY;
    this.scene.add(this.mesh);

    this.nameTag = this.createNameTag(name);
    this.targetRotation = 0;
    this.idleTimer = Math.random() * 5;

    // Wander AI
    this.home = position.clone();
    this.wanderRadius = options.wanderRadius != null ? options.wanderRadius : 3.5;
    this.wanderSpeed = options.wanderSpeed || 1.15;
    this.wanderTarget = null;
    this.moveSpeed = 0;

    // ---- Routines & schedules (N2.2/N2.3) ----
    // Each entry is a home override: { night, rain, mist, postQuest } — a
    // THREE.Vector3, or { pos, radius, plateau, rise } to tune the stroll
    // at that spot. Elevated spots (the bridge deck) need a tight `radius`
    // so the cat never wanders off the edge while pinned at deck height,
    // and `plateau`/`rise` fade the target height in over the approach so
    // the commute reads as walking up, not levitating.
    this.schedule = options.schedule || null;
    this.postQuestHome = null;
    this.effHome = this.home;
    this.effWanderRadius = this.wanderRadius;
    this._spotPlateau = 1.5;
    this._spotRise = 2.5;
    this.routineIdleTimer = 4 + Math.random() * 8;

    // Reactions to the player (noticing, greeting, being startled) and the
    // curl-up-for-the-night routine (schedule.sleepAtNight).
    this.noticed = false;
    this.greeted = false;
    this.startleCooldown = 0;
    this.warmth = 0;       // 0..1, how comfortable the cat is with the player nearby
    this.sleeping = false;
  }

  /** Night-time as the villagers see it: after dusk, before first light. */
  static isNight(sky) {
    return !!sky && (sky.dayTime >= 19.5 || sky.dayTime < 5.5);
  }

  /**
   * Notice / greet / startle. Runs every frame but only acts on edges: the
   * cat notices once on approach, greets once when the player comes close,
   * and forgets both when the player wanders off.
   */
  reactToPlayer(dt, dist, playerCat) {
    const p = this.persona;
    if (!p) return;
    this.startleCooldown = Math.max(0, this.startleCooldown - dt);

    if (dist > p.notice + 4) {
      this.noticed = false;
      this.greeted = false;
      this.warmth = Math.max(0, this.warmth - dt * 0.05);
    }
    if (!this.noticed && dist < p.notice) {
      this.noticed = true;
      this.cat.setMood(p.greeting === 'wary' ? 'cautious' : 'curious', 1.6, 1);
    }
    if (dist < 5) this.warmth = Math.min(1, this.warmth + dt * (p.greeting === 'wary' ? 0.08 : 0.25));
    if (!this.greeted && dist < 4.5) {
      this.greeted = true;
      if (p.greeting === 'playful') this.cat.setMood('playful', 2.4, 1);
      else if (p.greeting === 'slowblink') {
        this.cat.setMood('calm', 0.1, 0);
        this.cat.slowBlinkTimer = Math.min(this.cat.slowBlinkTimer, 0.4);
      } else if (p.greeting === 'wary') this.cat.setMood('cautious', 2.0, 1);
    }
    // Kuro comes round once he's had time to look the player over.
    if (p.greeting === 'wary' && this.greeted && this.warmth > 0.7 && dist < 3.5) {
      this.cat.setMood('curious', 0.6, 1);
    }
    if (playerCat && playerCat.isSprinting && dist < 6 && this.startleCooldown <= 0) {
      this.startleCooldown = 6;
      this.cat.setMood(p.startle, 0.9, 2);
    }
  }

  /** Curl up for the night where the schedule says to; wake when disturbed. */
  updateSleep(dt, sky, dist, idleNow) {
    const wants = !!(this.schedule && this.schedule.sleepAtNight) && NPC.isNight(sky);
    const disturbed = dist < 3.2;
    if (this.sleeping) {
      if (!wants || disturbed) {
        this.sleeping = false;
        if (this.cat.idleAction === 'sleep') this.cat.endIdleAction();
        // Wake with a yawn — a small grace note when the player tiptoes in
        this.cat.startIdleAction('yawn', 1.8);
      } else if (this.cat.idleAction !== 'sleep') {
        this.cat.startIdleAction('sleep', 9999);
      }
      return;
    }
    if (wants && !disturbed && idleNow) {
      this.sleepDelay = (this.sleepDelay || 0) + dt;
      if (this.sleepDelay > 4) {
        this.sleepDelay = 0;
        this.sleeping = true;
        this.wanderTarget = null;
        this.cat.startIdleAction('sleep', 9999);
      }
    } else {
      this.sleepDelay = 0;
    }
  }

  /** The routine-aware home for this moment (night / weather / quest state). */
  resolveRoutineHome(sky) {
    let entry = this.postQuestHome;
    if (!entry) {
      const s = this.schedule;
      if (s && sky) {
        const night = sky.dayTime >= 19.5 || sky.dayTime < 5.5;
        const w = sky.targetWeather || sky.weather;
        if (night && s.night) entry = s.night;
        else if (w === 'rain' && s.rain) entry = s.rain;
        else if (w === 'mist' && s.mist) entry = s.mist;
      }
    }
    entry = entry || this.home;
    this.effWanderRadius = entry.radius != null ? entry.radius : this.wanderRadius;
    this._spotPlateau = entry.plateau != null ? entry.plateau : 1.5;
    this._spotRise = entry.rise != null ? entry.rise : 2.5;
    return entry.pos || entry;
  }

  createNameTag(name) {
    const div = document.createElement('div');
    div.className = 'npc-nametag';
    const jpSuffix = name.toLowerCase() === 'luna' ? ' · 月' : '';
    div.innerHTML = `✨ <strong>${name}</strong>${jpSuffix}`;
    div.style.cssText = 'position:absolute;color:#2c1b12;background:linear-gradient(160deg,rgba(248,238,222,0.94),rgba(235,218,194,0.9));padding:3px 10px;border-radius:12px;font-size:12px;font-family:Georgia,serif;pointer-events:none;transform:translate(-50%,-100%);white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:1px solid #7c4c28;letter-spacing:0.5px;';
    document.body.appendChild(div);
    return div;
  }

  updateNameTagPosition(camera) {
    if (!this.nameTag || !camera) return;
    if (document.body.classList.contains('in-title') || document.body.classList.contains('photo-mode')) {
      this.nameTag.style.display = 'none';
      return;
    }
    const pos = this.mesh.position.clone().add(new THREE.Vector3(0, 0.85, 0));
    pos.project(camera);
    if (pos.z > 1) {
      this.nameTag.style.display = 'none';
      return;
    }
    this.nameTag.style.display = 'block';
    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;
    this.nameTag.style.left = `${x}px`;
    this.nameTag.style.top = `${y}px`;
  }

  update(dt, playerPos, camera, sky = null, playerCat = null) {
    this.updateNameTagPosition(camera);
    const playerDist = this.distanceTo(playerPos);
    this.reactToPlayer(dt, playerDist, playerCat);
    this.updateSleep(dt, sky, playerDist, this.moveSpeed === 0 && !this.wanderTarget);

    // Routine-aware wandering: the effective home follows the schedule
    // (moon-watching at night, sheltering from rain, river visits in mist).
    const routineHome = this.resolveRoutineHome(sky);
    const homeChanged = routineHome !== this.effHome;
    this.effHome = routineHome;
    if (homeChanged) this.wanderTarget = null;

    // Weather playfulness (Mochi chasing bamboo leaves on the wind)
    if (this.schedule && this.schedule.playInWind && sky) {
      const w = sky.targetWeather || sky.weather;
      if (w === 'cloudy' || w === 'rain') {
        this.routineIdleTimer -= dt;
        if (this.routineIdleTimer <= 0) {
          this.routineIdleTimer = 6 + Math.random() * 10;
          this.cat.setMood('playful', 2.5, 1);
        }
      }
    }

    const dist = this.distanceTo(playerPos);
    let isTurning = false;
    this.moveSpeed = 0;

    if (this.sleeping) {
      // Asleep: stay put, no wandering, no turning to watch the player
    } else if (dist < 5.0) {
      // Player nearby: stop wandering and watch them
      this.wanderTarget = null;
      const dx = playerPos.x - this.mesh.position.x;
      const dz = playerPos.z - this.mesh.position.z;
      this.targetRotation = Math.atan2(dx, dz);
    } else if (this.effWanderRadius > 0) {
      if (!this.wanderTarget) {
        // Idle pause between strolls
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
          const ang = Math.random() * Math.PI * 2;
          const r = 1 + Math.random() * this.effWanderRadius;
          this.wanderTarget = new THREE.Vector3(
            this.effHome.x + Math.cos(ang) * r,
            this.effHome.y,
            this.effHome.z + Math.sin(ang) * r
          );
        }
      } else {
        const dx = this.wanderTarget.x - this.mesh.position.x;
        const dz = this.wanderTarget.z - this.mesh.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.35) {
          this.wanderTarget = null;
          this.idleTimer = 2 + Math.random() * 5;
        } else {
          const step = Math.min(d, this.wanderSpeed * dt);
          this.mesh.position.x += (dx / d) * step;
          this.mesh.position.z += (dz / d) * step;
          this.targetRotation = Math.atan2(dx, dz);
          this.moveSpeed = this.wanderSpeed;
        }
      }
    } else if (dist < 7.0) {
      const dx = playerPos.x - this.mesh.position.x;
      const dz = playerPos.z - this.mesh.position.z;
      this.targetRotation = Math.atan2(dx, dz);
    }

    // Smooth rotational damping
    let diff = this.targetRotation - this.mesh.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    if (Math.abs(diff) > 0.05) {
      this.mesh.rotation.y += diff * Math.min(1.0, dt * 3.5);
      isTurning = true;
    }

    // Routine spots can sit at a different elevation than home (the old
    // bridge deck, an eave-side shelter). The target height fades in over
    // the approach — full height inside `plateau` distance of the spot,
    // ground level beyond `plateau + rise` — so the cat climbs the ramp
    // instead of floating across the valley floor mid-commute.
    let targetY = this.baseY;
    if (this.effHome.y > 0.05) {
      const dx = this.mesh.position.x - this.effHome.x;
      const dz = this.mesh.position.z - this.effHome.z;
      const d = Math.hypot(dx, dz);
      const t = 1 - THREE.MathUtils.clamp((d - this._spotPlateau) / this._spotRise, 0, 1);
      targetY = this.baseY + (this.effHome.y - this.baseY) * t;
    }
    if (Math.abs(this.mesh.position.y - targetY) > 0.01) {
      this.mesh.position.y += (targetY - this.mesh.position.y) * Math.min(1, dt * 2);
    }

    // Follow the player with the head while they're close
    if (dist < 6.0 && !this.sleeping) {
      _lookAt.set(playerPos.x, playerPos.y + 0.55, playerPos.z);
      this.cat.setLookTarget(_lookAt);
    } else {
      this.cat.setLookTarget(null);
    }

    // Call Cat.update with proper numeric signature:
    // (dt, moveSpeed = 0, grounded = true, isSprinting = false, isTurning = false, inWater = false, nearObject = null)
    this.cat.update(dt, this.moveSpeed, true, false, isTurning, false, dist < 2.5 ? 'npc' : null);
  }

  distanceTo(playerPos) {
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  getDialogueLines() {
    if (this.dialogueProvider) return this.dialogueProvider(this);
    return this.dialogue;
  }

  finishDialogue() {
    if (this.onDialogueComplete) this.onDialogueComplete(this);
  }
}
