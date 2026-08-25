import * as THREE from 'three';

export class ContextActionManager {
  constructor(player, world, npc, ui, audio, progression = null, ambientLife = null, sky = null, dialogue = null, quest = null, interior = null) {
    this.player = player;
    this.world = world;
    this.npc = npc;
    this.ui = ui;
    this.audio = audio;
    this.progression = progression;
    this.ambientLife = ambientLife;
    this.sky = sky;
    this.dialogue = dialogue;
    this.quest = quest;
    this.interior = interior;
    this.cooldown = 0;
    this.activeAction = null;
    this.drinkTimer = 0;
    this.drinkDuration = 3.0;
    this.onDrinkComplete = null;
    this.shrinePoint = new THREE.Vector3(0, 0, -31.05);
    this.wasGrounded = false;
    this.landDust = [];

    const dustGeo = new THREE.PlaneGeometry(0.08, 0.08);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xd9c48a,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(dustGeo, dustMat.clone());
      m.visible = false;
      m.rotation.x = -Math.PI / 2;
      this.player.scene.add(m);
      this.landDust.push({ mesh: m, life: 0, vx: 0, vz: 0 });
    }
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.drinkTimer > 0) {
      this.updateDrinking(dt);
      this.activeAction = null;
      this.ui.hidePrompt();
      this.updateDust(dt);
      return;
    }

    // Automatic Tea House door transitions (no button press needed)
    this.updateDoorProximity();

    const justLanded = this.player.isGrounded && !this.wasGrounded;
    this.wasGrounded = this.player.isGrounded;
    if (justLanded && this.player.mesh.position.y < 0.1) {
      this.spawnLandDust(this.player.mesh.position.x, this.player.mesh.position.z);
    }

    const action = this.findAction();
    this.activeAction = action;

    if (action) {
      this.ui.showPrompt(this.isMobile() ? `Tap ACT to ${action.label}` : `Press E to ${action.label}`);
    } else {
      this.ui.hidePrompt();
    }

    this.updateDust(dt);
  }

  isMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  findAction() {
    if (this.cooldown > 0) return null;

    const pos = this.player.mesh.position;
    const world = this.world;
    const interior = this.interior;
    const isInside = interior && interior.isInside;

    // --- A. INDOOR INTERACTIONS ---
    if (isInside) {
      // 1. Grilled Sea Bream Treat on Chabudai Table
      if (!interior.fishEaten) {
        const tableCenter = new THREE.Vector3(interior.origin.x + 0.3, interior.origin.y + 0.5, interior.origin.z - 0.1);
        if (pos.distanceToSquared(tableCenter) < 2.5) {
          return { type: 'eatFish', label: 'eat Grilled Sea Bream', target: tableCenter };
        }
      }

      // 3. Cozy Velvet Zabuton Bed Nap Spot
      const napCenter = new THREE.Vector3(interior.origin.x - 2.2, interior.origin.y + 0.1, interior.origin.z - 1.2);
      if (pos.distanceToSquared(napCenter) < 2.2) {
        return { type: 'cozyNap', label: 'curl up & take cozy nap', target: napCenter };
      }

      return null;
    }

    // --- B. OUTDOOR INTERACTIONS ---
    // 1. Secret Key Pickup
    if (world && world.secretKeyMesh && !world.secretKeyCollected) {
      if (pos.distanceToSquared(world.secretKeyPos) < 2.5) {
        return { type: 'takeKey', label: 'take Antique Key', target: world.secretKeyMesh };
      }
    }

    // 2. Secret Machiya Door (Unlock, Locked Hint, or Enter)
    const doorPos = new THREE.Vector3(20, 0, 12.5);
    if (pos.distanceToSquared(doorPos) < 4.5) {
      if (!world.isSecretHouseUnlocked) {
        if (world.hasSecretKey) {
          return { type: 'unlockDoor', label: 'unlock Tea House door', target: doorPos };
        } else {
          return { type: 'lockedDoorHint', label: 'inspect lock (Needs Key)', target: doorPos };
        }
      }
    }

    // 3. Rooftop Bird's Nest Inspection
    if (world && world.nestPos) {
      if (pos.distanceTo(world.nestPos) < 2.2) {
        return { type: 'inspectNest', label: 'inspect Bird Nest & Feather', target: world.nestPos };
      }
    }

    // 4. Paw at Koi Fish in Water
    if (world && world.isInWater && world.isInWater(pos.x, pos.z, pos.y)) {
      if (this.ambientLife && this.ambientLife.koi) {
        for (const k of this.ambientLife.koi) {
          const dx = k.x - pos.x, dz = k.z - pos.z;
          if (dx * dx + dz * dz < 4.0) {
            return { type: 'pawKoi', label: 'paw at Koi fish', target: k };
          }
        }
      }
      return { type: 'drink', label: 'drink fresh water', target: null };
    }

    // 5. Greet NPC Luna
    if (this.npc) {
      const d = this.npc.distanceTo(pos);
      if (d < 2.2) return { type: 'greet', label: 'greet Luna', target: this.npc };
    }

    // 6. Bat yarn
    if (world && world.collectibles) {
      for (const item of world.collectibles) {
        if (item.userData.isCharm || item.userData.isCorralReward) continue;
        if (item.position.distanceToSquared(pos) < 1.8) {
          return { type: 'batYarn', label: 'bat yarn ball', target: item };
        }
      }
    }

    // 7. Ring shrine bell
    if (pos.distanceToSquared(this.shrinePoint) < 12) {
      return { type: 'ringBell', label: 'ring sacred shrine bell', target: this.shrinePoint };
    }

    return null;
  }

  trigger() {
    if (!this.activeAction || this.cooldown > 0 || this.drinkTimer > 0) return;
    const action = this.activeAction;
    this.cooldown = 0.6;

    switch (action.type) {
      case 'takeKey':
        this.takeKey();
        break;
      case 'unlockDoor':
        this.unlockDoor();
        break;
      case 'lockedDoorHint':
        this.lockedDoorHint();
        break;
      case 'eatFish':
        this.eatFish();
        break;
      case 'cozyNap':
        this.cozyNap();
        break;
      case 'inspectNest':
        this.inspectNest();
        break;
      case 'pawKoi':
        this.pawKoi(action.target);
        break;
      case 'drink':
        this.drink();
        break;
      case 'greet':
        this.greet(action.target);
        break;
      case 'batYarn':
        this.batYarn(action.target);
        break;
      case 'ringBell':
        this.ringBell();
        break;
    }
  }

  takeKey() {
    if (this.world) {
      this.world.secretKeyCollected = true;
      this.world.hasSecretKey = true;
      if (this.world.secretKeyMesh) this.world.secretKeyMesh.visible = false;
    }
    if (this.audio) this.audio.playKeyChime();
    this.player.cat.setMood('playful', 1.2, 2);
    if (this.progression) this.progression.addXP(40, 'Found the Antique Machiya Key!');
    this.ui.showToast('Obtained Antique Key! Seek the locked Kyoto Tea House.');
  }

  unlockDoor() {
    if (this.world) {
      this.world.unlockSecretHouse();
    }
    if (this.progression) this.progression.addXP(50, 'Unlocked Secret Kyoto House!');
    this.ui.showToast('Tea House Unlocked! Entering...');
    if (this.interior) {
      this.interior.transitionToInterior();
    } else if (this.audio) {
      this.audio.playDoorSlide();
    }
  }

  enterInterior() {
    if (this.interior) {
      this.interior.transitionToInterior();
    }
  }

  exitInterior() {
    if (this.interior) {
      this.interior.transitionToExterior();
    }
  }

  lockedDoorHint() {
    this.player.cat.setMood('curious', 0.8, 1);
    this.ui.showToast('Locked with an antique brass lock. Search the bamboo shrine for the key!');
  }

  eatFish() {
    if (this.interior) this.interior.eatFish();
    if (this.world) this.world.eatFish();
    if (this.audio) this.audio.playEat();
    this.player.speedBuffTimer = 40; // 40 seconds speed boost
    this.player.cat.setMood('playful', 1.5, 2);
    if (this.progression) this.progression.addXP(30, 'Ate grilled sea bream feast!');
    this.ui.showToast('Delicious! +35% Agility Speed Boost!');
  }

  cozyNap() {
    if (this.audio) this.audio.playDreamChime();
    if (this.audio) this.audio.playPurr(3.5);
    this.player.cat.setMood('sleepy', 4.0, 3);
    this.player.cat.idleAction = 'sit';
    this.player.cat.idleActionTimer = 0;
    this.player.cat.idleActionDuration = 4.0;
    if (this.sky) {
      // Advance time smoothly by 4 hours
      this.sky.dayTime = (this.sky.dayTime + 4) % 24;
    }
    if (this.progression) this.progression.addXP(50, 'Cozy Ghibli Nap');
    this.ui.showToast('Took a cozy nap... Awakened refreshed in a new time of day!');
  }

  inspectNest() {
    if (this.world && !this.world.nestInteracted) {
      this.world.nestInteracted = true;
      if (this.world.nestFeatherMesh) this.world.nestFeatherMesh.visible = false;
      if (this.audio) this.audio.playKeyChime();
      this.player.cat.setMood('playful', 1.5, 2);
      if (this.progression) this.progression.addXP(60, "Obtained Guardian's Feather!");
      this.ui.showToast("Brave Climber! Obtained Guardian's Feather trophy!");
    } else {
      this.player.cat.setMood('curious', 0.8, 1);
      this.ui.showToast('Three cute speckled eggs sleeping safely in the nest.');
    }
  }

  pawKoi(koi) {
    if (this.audio) this.audio.playSplash();
    if (this.ambientLife && koi) {
      this.ambientLife.scatterKoi(this.player.mesh.position.x, this.player.mesh.position.z);
    }
    if (this.world && this.world.spawnRipple) {
      this.world.spawnRipple(this.player.mesh.position.x, this.player.mesh.position.z, 2.0);
    }
    this.player.cat.setMood('playful', 0.8, 1);
    if (this.progression) this.progression.addXP(5, 'Pawed at the koi fish');
  }

  drink() {
    this.drinkTimer = this.drinkDuration;
    this.cooldown = this.drinkDuration + 0.35;
    this.player.actionLocked = true;
    this.player.moveInput.set(0, 0);
    this.player.sprint = false;
    this.player.jumpBufferTimer = 0;
    this.player.jumpHeld = false;
    this.player.cat.setMood('cautious', this.drinkDuration, 2);
    this.player.cat.setDrinking(true);
    if (this.audio) this.audio.startLapping();
  }

  updateDrinking(dt) {
    if (this.drinkTimer <= 0) return;
    this.drinkTimer = Math.max(0, this.drinkTimer - dt);
    this.player.actionLocked = true;
    this.player.moveInput.set(0, 0);
    this.player.sprint = false;
    this.player.jumpBufferTimer = 0;
    this.player.jumpHeld = false;
    if (this.world && this.world.spawnRipple) {
      this.drinkRippleTimer = (this.drinkRippleTimer || 0) - dt;
      if (this.drinkRippleTimer <= 0) {
        const forward = new THREE.Vector3(0, 0, 0.45).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.heading);
        this.world.spawnRipple(
          this.player.mesh.position.x + forward.x,
          this.player.mesh.position.z + forward.z,
          0.45
        );
        this.drinkRippleTimer = 0.65;
      }
    }
    if (this.drinkTimer > 0) return;

    this.player.actionLocked = false;
    this.player.cat.setDrinking(false);
    if (this.audio) this.audio.stopLapping();
    if (this.progression) this.progression.addXP(2, 'Drank fresh water');
    if (this.onDrinkComplete) this.onDrinkComplete();
  }

  cancelDrinking() {
    if (this.drinkTimer <= 0 && !this.player.actionLocked) return;
    this.drinkTimer = 0;
    this.player.actionLocked = false;
    this.player.cat.setDrinking(false);
    if (this.audio) this.audio.stopLapping();
  }

  greet(npc) {
    if (this.audio) this.audio.playTrill();
    this.player.cat.setMood('playful', 0.8, 1);
    if (npc && npc.cat) {
      npc.cat.setMood('playful', 0.8, 1);
    }
    if (npc && !npc.hasGreeted) {
      npc.hasGreeted = true;
      if (this.progression) this.progression.addXP(5, 'Made a friend');
    }
    if (this.dialogue) {
      const dynamicLines = npc && npc.getDialogueLines ? npc.getDialogueLines() : null;
      const lines = dynamicLines && dynamicLines.length > 0 ? dynamicLines : [
        'Nyaa~ Hello there, little traveler!',
        'I am Luna (月). The Kyoto spirits tell me ancient golden yarn and secret keys are hidden throughout the Machiya townhouses.',
        'Could you collect 3 yarn balls for me? 🐾'
      ];
      this.dialogue.show(npc ? npc.name : 'Luna', lines, () => {
        if (npc && npc.finishDialogue) {
          npc.finishDialogue();
        } else if (this.quest && !this.quest.active) {
          this.quest.start({ name: "Luna's Yarn Hunt", type: 'yarn', target: 3 });
        }
      });
    }
  }

  batYarn(yarn) {
    if (!yarn) return;
    const pos = this.player.mesh.position;
    const dir = new THREE.Vector3().subVectors(yarn.position, pos).normalize();
    if (dir.y < 0.1) dir.y = 0.1;
    dir.normalize();
    yarn.userData.velocity = dir.multiplyScalar(4.5).add(new THREE.Vector3(0, 2.5, 0));
    yarn.userData.batted = true;
    if (this.audio) this.audio.playTrill();
    this.player.cat.setMood('playful', 0.6, 1);
  }

  ringBell() {
    if (this.audio) this.audio.playBell();
    this.player.cat.setMood('alert', 0.6, 2);
    if (this.progression) this.progression.addXP(10, 'Rang the sacred shrine bell');
  }

  /**
   * Automatic door transitions: walking up to the Tea House door (or to the
   * front of the room while inside) triggers the transition by proximity.
   * A latch with hysteresis prevents instant re-triggering right after a
   * transition places the cat near the threshold; it re-arms once the cat
   * steps away from the trigger zone.
   */
  updateDoorProximity() {
    const interior = this.interior;
    if (!interior || interior.isTransitioning) return;
    const pos = this.player.mesh.position;
    const world = this.world;

    if (!interior.isInside) {
      const doorPos = world.secretDoorWorldPos || new THREE.Vector3(20, 0, 12.5);
      const doorDistSq = pos.distanceToSquared(doorPos);
      // Auto-unlock: walking up to the locked door WITH the key opens it.
      if (!world.isSecretHouseUnlocked && world.hasSecretKey && doorDistSq < 9) {
        world.unlockSecretHouse();
        this.ui.showToast('The antique key turns... the Tea House is unlocked!');
        if (this.audio) this.audio.playBell();
        if (this.progression) this.progression.addXP(20, 'Unlocked the Hisomu-an Tea House');
      }
      // Door itself stays a solid collision wall — entry is via the
      // automatic shoji-screen transition when close enough.
      if (!world.isSecretHouseUnlocked) return;
      if (!this._doorLatch && doorDistSq < 3.2) {
        this._doorLatch = true;
        interior.transitionToInterior();
      } else if (doorDistSq > 9) {
        this._doorLatch = false;
      }
    } else {
      const localX = pos.x - interior.origin.x;
      const localZ = pos.z - interior.origin.z;
      if (!this._doorLatch && localZ > 1.8 && Math.abs(localX) < 1.8) {
        this._doorLatch = true;
        interior.transitionToExterior();
      } else if (localZ < 1.2) {
        this._doorLatch = false;
      }
    }
  }

  spawnLandDust(x, z) {
    for (let i = 0; i < 6; i++) {
      const d = this.landDust.find(p => p.life <= 0);
      if (!d) break;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.25;
      d.mesh.position.set(x + Math.cos(a) * r, 0.03, z + Math.sin(a) * r);
      d.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
      d.mesh.visible = true;
      d.life = 0.45;
      d.vx = Math.cos(a) * 0.2;
      d.vz = Math.sin(a) * 0.2;
    }
  }

  updateDust(dt) {
    for (const d of this.landDust) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.z += d.vz * dt;
      const t = d.life / 0.45;
      d.mesh.scale.setScalar(t * (0.5 + Math.random() * 0.2));
      d.mesh.material.opacity = t * 0.55;
      if (d.life <= 0) d.mesh.visible = false;
    }
  }
}
