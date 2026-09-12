import * as THREE from 'three';
import { Cat } from './cat.js?v=20260911b';

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

    // Elegant Kyoto Cat Customization for Luna / NPC Companions
    const isLuna = name.toLowerCase().includes('luna');
    const furColor = options.fur ?? (isLuna ? 0x22242a : (color || 0x3a3a3f));
    const bellyColor = options.belly ?? (isLuna ? 0x383b44 : 0xede4d0);
    const accentColor = options.accent ?? (isLuna ? 0x4f5360 : 0x2e2017);
    const eyeColor = options.eyeColor ?? (isLuna ? 0xdec056 : 0xa2ba6e); // Moonlit Amber/Jade eyes for Luna
    const ribbonColor = options.ribbonColor ?? (isLuna ? 0x2b3d63 : 0xc8402a); // Indigo silk ribbon for Luna

    this.cat = new Cat({
      fur: furColor,
      belly: bellyColor,
      accent: accentColor,
      eyeColor: eyeColor,
      ribbonColor: ribbonColor,
      audio: options.audio || null
    });

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

  update(dt, playerPos, camera, sky = null) {
    this.updateNameTagPosition(camera);

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

    if (dist < 5.0) {
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
