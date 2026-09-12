import * as THREE from 'three';

// Hoisted findAction scratch (2026-09-11 review §1.2.2: the proximity scan
// ran every frame and allocated several vectors per call).
const _tableCenter = new THREE.Vector3();
const _napCenter = new THREE.Vector3();
const _DOOR_POS = new THREE.Vector3(20, 0, 12.5);
const _shishiWorld = new THREE.Vector3();
const _BAT_UP = new THREE.Vector3(0, 2.5, 0);

export class ContextActionManager {
  constructor(player, world, npc, ui, audio, progression = null, ambientLife = null, sky = null, dialogue = null, quest = null, interior = null) {
    this.player = player;
    this.world = world;
    this.npc = npc;
    this.npcs = npc ? [npc] : [];
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

    // Discovery journal hook — main.js installs this (section, entry).
    this.onDiscover = null;
    // Music swell hook for rest spots / stillness moments.
    this.onMusicSwell = null;

    // ---- Rest & watch spots (G1.1): hand-placed vantage points ----
    this.restSpots = [
      { id: 'shrine', name: 'Shrine Steps', pos: new THREE.Vector3(0, 0, -26.5), poem: 'Stone remembers every paw that paused here.' },
      { id: 'bridge', name: 'Old Bridge', pos: new THREE.Vector3(-1, 1.1, 30.5), poem: 'The river hums the song it sang a hundred years ago.' },
      { id: 'rooftop', name: 'Rooftop Perch', pos: new THREE.Vector3(-12.2, 5.5, -2.9), poem: 'From up here the whole valley fits in one slow breath.' },
      { id: 'bamboo', name: 'Bamboo Clearing', pos: new THREE.Vector3(30, 0, -20), poem: 'Bamboo leans together, whispering about the wind.' },
      { id: 'porch', name: 'Tea House Porch', pos: new THREE.Vector3(20, 0, 10.2), poem: 'Warm tea steam, old wood, an afternoon with nowhere to be.' },
      // The completion beat (G3.1): only a City Legend can settle here.
      { id: 'torii', name: 'Torii Crown', pos: new THREE.Vector3(0, 5.29, -22), requiredRank: 4,
        poem: 'Every path becomes a home when someone remembers your pawprints.' }
    ];
    this.rest = null;          // active rest { spot, t, dur, quietT, fired }
    this.visitedSpots = new Set();

    // One-time flags for micro-interaction XP (no farming).
    this.scratchedAt = new Set();
    this.clackerXP = false;
    this.chimeXP = false;
    this.slowBlinked = new Set();
    this.gifted = new Set();

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

  discover(section, entry) {
    if (this.onDiscover) this.onDiscover(section, entry);
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

    if (this.rest) {
      this.updateRest(dt);
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
        _tableCenter.set(interior.origin.x + 0.3, interior.origin.y + 0.5, interior.origin.z - 0.1);
        if (pos.distanceToSquared(_tableCenter) < 2.5) {
          return { type: 'eatFish', label: 'eat Grilled Sea Bream', target: _tableCenter };
        }
      }

      // 3. Cozy Velvet Zabuton Bed Nap Spot
      _napCenter.set(interior.origin.x - 2.2, interior.origin.y + 0.1, interior.origin.z - 1.2);
      if (pos.distanceToSquared(_napCenter) < 2.2) {
        return { type: 'cozyNap', label: 'curl up & take cozy nap', target: _napCenter };
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
    if (pos.distanceToSquared(_DOOR_POS) < 4.5) {
      if (!world.isSecretHouseUnlocked) {
        if (world.hasSecretKey) {
          return { type: 'unlockDoor', label: 'unlock Tea House door', target: _DOOR_POS };
        } else {
          return { type: 'lockedDoorHint', label: 'inspect lock (Needs Key)', target: _DOOR_POS };
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

    // 5. NPC interactions: greet > gift > slow blink (C1.5, N2.1)
    for (const n of this.npcs) {
      if (!n || !n.mesh) continue;
      const d = n.distanceTo(pos);
      if (d < 2.2) {
        if (!n.hasGreeted) {
          return { type: 'greet', label: `greet ${n.name}`, target: n };
        }
        // Gift a nearby yarn ball to a friend — but never the yarn a
        // running quest still needs.
        const questNeedsYarn = this.quest && this.quest.active && this.quest.active.type === 'yarn';
        if (!questNeedsYarn && world && world.collectibles) {
          for (const item of world.collectibles) {
            if (item.userData.isCharm || item.userData.isCorralReward) continue;
            if (item.position.distanceToSquared(n.mesh.position) < 6.5) {
              return { type: 'giftYarn', label: `gift a yarn ball to ${n.name}`, target: { npc: n, item } };
            }
          }
        }
        return { type: 'slowBlink', label: `slow blink at ${n.name}`, target: n };
      }
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

    // 8. Mist-gated spirit altar (G1.6)
    if (world && world.mistAltarPos && world.mistAltar && world.mistAltar.visible && !world.mistAltarTouched) {
      if (pos.distanceToSquared(world.mistAltarPos) < 4.5) {
        return { type: 'touchAltar', label: 'touch the spirit altar', target: world.mistAltarPos };
      }
    }

    // 9. Shishi-odoshi clacker (G1.5)
    if (world && world.shishiRocker) {
      world.shishiRocker.getWorldPosition(_shishiWorld);
      if (pos.distanceToSquared(_shishiWorld) < 3.2) {
        return { type: 'tipClacker', label: 'tip the shishi-odoshi', target: _shishiWorld };
      }
    }

    // 10. Wind chime (G1.5)
    if (world && world.chimePos && pos.distanceToSquared(world.chimePos) < 3.0) {
      return { type: 'batChime', label: 'bat the furin chime', target: world.chimePos };
    }

    // 11. Scratch designated surfaces (C1.3)
    if (pos.x > 26 && pos.x < 34 && pos.z > -24 && pos.z < -14 && !this.scratchedAt.has('bamboo')) {
      return { type: 'scratch', label: 'scratch the bamboo', target: 'bamboo' };
    }
    if (pos.x > -36 && pos.x < -26 && pos.z > 4 && pos.z < 14 && !this.scratchedAt.has('fence')) {
      return { type: 'scratch', label: 'scratch the fence post', target: 'fence' };
    }

    // 12. Rest & watch spots (G1.1)
    for (const spot of this.restSpots) {
      if (spot.requiredRank && (!this.progression || this.progression.rank < spot.requiredRank)) continue;
      if (pos.distanceToSquared(spot.pos) < 2.6 && this.player.isGrounded) {
        const sunset = this.sky && this.sky.sunDir && this.sky.sunDir.y > 0.03 && this.sky.sunDir.y < 0.32;
        return {
          type: 'restWatch',
          label: sunset ? `watch the sunset from the ${spot.name}` : `sit & watch — ${spot.name}`,
          target: spot
        };
      }
    }

    // 13. Idle cat verbs (C1.1/2): sit / groom / stretch cycle
    if (this.player.isGrounded && this.player.currentSpeed < 0.25) {
      const current = this.player.cat.idleAction;
      let verb, label;
      if (current === 'sit') { verb = 'groom'; label = 'groom your fur'; }
      else if (current === 'groom') { verb = 'stretch'; label = 'stretch your paws'; }
      else { verb = 'sit'; label = 'sit down'; }
      return { type: 'catVerb', label, target: verb };
    }

    return null;
  }

  trigger() {
    if (!this.activeAction || this.cooldown > 0 || this.drinkTimer > 0 || this.rest) return;
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
      case 'giftYarn':
        this.giftYarn(action.target);
        break;
      case 'slowBlink':
        this.slowBlink(action.target);
        break;
      case 'touchAltar':
        this.touchAltar();
        break;
      case 'tipClacker':
        this.tipClacker();
        break;
      case 'batChime':
        this.batChime();
        break;
      case 'scratch':
        this.scratch(action.target);
        break;
      case 'restWatch':
        this.startRest(action.target);
        break;
      case 'catVerb':
        this.catVerb(action.target);
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
    this.discover('keepsakes', { id: 'antique-key', text: 'Antique Key — brass, patient, waiting for its door' });
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
    // Stretch after waking (C1.4) — the body remembers it slept well.
    setTimeout(() => {
      const cat = this.player.cat;
      if (cat && !cat.idleAction && cat.isDrinking !== true) {
        cat.idleAction = 'stretch';
        cat.idleActionTimer = 0;
        cat.idleActionDuration = 2.5;
      }
    }, 350);
  }

  inspectNest() {
    if (this.world && !this.world.nestInteracted) {
      this.world.nestInteracted = true;
      if (this.world.nestFeatherMesh) this.world.nestFeatherMesh.visible = false;
      if (this.audio) this.audio.playKeyChime();
      this.player.cat.setMood('playful', 1.5, 2);
      if (this.progression) this.progression.addXP(60, "Obtained Guardian's Feather!");
      this.ui.showToast("Brave Climber! Obtained Guardian's Feather trophy!");
      this.discover('keepsakes', { id: 'guardian-feather', text: 'Guardian’s Feather — a rooftop promise kept' });
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
    const dir = this._batDir || (this._batDir = new THREE.Vector3());
    dir.subVectors(yarn.position, pos).normalize();
    if (dir.y < 0.1) dir.y = 0.1;
    dir.normalize();
    yarn.userData.velocity = dir.multiplyScalar(4.5).add(_BAT_UP);
    yarn.userData.batted = true;
    if (this.audio) this.audio.playTrill();
    this.player.cat.setMood('playful', 0.6, 1);
  }

  ringBell() {
    if (this.audio) this.audio.playBell();
    this.player.cat.setMood('alert', 0.6, 2);
    if (this.progression) this.progression.addXP(10, 'Rang the sacred shrine bell');
  }

  /* ---------------- Cat verbs & friendship (C1, N2.1) ---------------- */

  /** Sit / groom / stretch — expressive, no XP, ends when the cat moves. */
  catVerb(verb) {
    const cat = this.player.cat;
    if (cat.idleAction) cat.endIdleAction();
    cat.idleAction = verb;
    cat.idleActionTimer = 0;
    cat.idleActionDuration = verb === 'sit' ? 45 : verb === 'groom' ? 4.5 : 2.5;
    cat.idleTimer = 0;
    cat.yawnOpen = 0;
    if (verb === 'groom' && this.audio) this.audio.playPurr(3.5);
    if (verb === 'sit' && this.audio && Math.random() > 0.5) this.audio.playPurr(2.5);
  }

  /** Gift a yarn ball to a befriended NPC — friendship-lite (N2.1). */
  giftYarn({ npc, item }) {
    if (!npc || !item) return;
    // The friend keeps the yarn: remove it from the world.
    const idx = this.world.collectibles.indexOf(item);
    if (idx !== -1) this.world.collectibles.splice(idx, 1);
    if (item.parent) item.parent.remove(item);
    npc.giftedYarn = true;
    if (npc.cat) npc.cat.setMood('calm', 4.0, 2);
    if (this.audio) this.audio.playPurr(2.5);
    this.player.cat.setMood('playful', 1.2, 2);
    const first = !this.gifted.has(npc.name);
    if (first) {
      this.gifted.add(npc.name);
      if (this.progression) this.progression.addXP(15, `Gave a yarn ball to ${npc.name}`);
    }
    const lines = {
      Luna: 'Luna tucks the yarn under her paw and purrs. “It smells like you. I will keep it safe.”',
      Mochi: 'Mochi bats the yarn once, then curls around it. “Nyaa~ mine now!”',
      Kuro: 'Kuro stares at the yarn for a long moment… then gently rests a paw on it. “Acceptable.”'
    };
    this.ui.showToast(lines[npc.name] || `${npc.name} keeps the yarn, purring softly.`);
    this.discover('catsMet', { id: `gift-${npc.name}`, text: `${npc.name} keeps your yarn gift` });
  }

  /** Slow blink at a befriended NPC (C1.5). */
  slowBlink(npc) {
    if (!npc) return;
    const cat = this.player.cat;
    cat.setMood('calm', 2.5, 2);
    // A long deliberate blink
    cat.blink = 0.16;
    cat.blinkTimer = 3.5;
    if (npc.cat) npc.cat.setMood('calm', 3.0, 2);
    npc.slowBlinks = (npc.slowBlinks || 0) + 1;
    const first = !this.slowBlinked.has(npc.name);
    if (first) {
      this.slowBlinked.add(npc.name);
      if (this.progression) this.progression.addXP(10, `Shared a slow blink with ${npc.name}`);
      this.ui.showToast(`${npc.name} blinks slowly back. Trust settles between you like warm sunlight.`);
      this.discover('catsMet', { id: `blink-${npc.name}`, text: `${npc.name} returned your slow blink` });
    } else if (this.audio) {
      this.audio.playPurr(1.2);
    }
  }

  /* ---------------- World micro-interactions (G1.5, G1.6) ---------------- */

  /** Shishi-odosi clacker: knock it and let it clack (G1.5). */
  tipClacker() {
    if (this.world) this.world.clackerBoost = 1.0;
    if (this.audio) {
      this.audio.playSplash();
      setTimeout(() => this.audio && this.audio.playBell(), 420);
    }
    this.player.cat.setMood('alert', 0.8, 2);
    if (!this.clackerXP) {
      this.clackerXP = true;
      if (this.progression) this.progression.addXP(10, 'Set the shishi-odosi clacking');
      this.ui.showToast('The bamboo clacker rocks — tok… tok… The garden nods along.');
    }
  }

  /** Bat the furin wind chime (G1.5). */
  batChime() {
    if (this.world) this.world.chimeSway = 1.3;
    if (this.audio) this.audio.playDreamChime();
    this.player.cat.setMood('playful', 1.2, 2);
    if (!this.chimeXP) {
      this.chimeXP = true;
      if (this.progression) this.progression.addXP(10, 'Rang the furin wind chime');
      this.ui.showToast('The furin chime sings — a bright, cooling note for a warm day.');
    }
  }

  /** Scratch designated bamboo / fence post (C1.3). */
  scratch(surface) {
    if (this.scratchedAt.has(surface)) return;
    this.scratchedAt.add(surface);
    const p = this.player.mesh.position;
    this.spawnLandDust(p.x, p.z);
    if (this.audio) this.audio.playChirp();
    this.player.cat.setMood('playful', 1.5, 2);
    if (this.progression) this.progression.addXP(10, surface === 'bamboo' ? 'Scratched the bamboo grove' : 'Sharpened claws on the fence post');
    this.ui.showToast(surface === 'bamboo'
      ? 'You stretch up and rake the bamboo — satisfying, and nobody minds.'
      : 'The fence post is now officially yours.');
  }

  /** The mist-gated spirit altar (G1.6). */
  touchAltar() {
    if (!this.world || this.world.mistAltarTouched) return;
    this.world.mistAltarTouched = true;
    if (this.audio) this.audio.playDreamChime();
    this.player.cat.setMood('calm', 5.0, 3);
    if (this.progression) this.progression.addXP(60, 'Received the Mist Charm');
    this.ui.showToast('✦ Mist Charm — the valley’s spirits walk beside you now ✦', 4200);
    this.discover('keepsakes', { id: 'mist-charm', text: 'Mist Charm — a gift from the shrine spirits' });
    this.discover('places', { id: 'mist-altar', text: 'Found the hidden spirit altar behind the shrine' });
  }

  /* ---------------- Rest & watch: stillness that pays off (G1.1, G1.2) ---------------- */

  startRest(spot) {
    if (!spot || this.rest) return;
    const firstVisit = !this.visitedSpots.has(spot.id);
    if (firstVisit) {
      this.visitedSpots.add(spot.id);
      if (this.progression) this.progression.addXP(20, `Discovered ${spot.name}`);
      this.discover('places', { id: `rest-${spot.id}`, text: spot.name });
    }
    this.rest = { spot, t: 0, dur: 9, quietT: 0, fired: false };
    const cat = this.player.cat;
    if (cat.idleAction) cat.endIdleAction();
    cat.idleAction = 'sit';
    cat.idleActionTimer = 0;
    cat.idleActionDuration = 12;
    cat.idleTimer = 0;
    this.lockPlayer();
    if (this.onMusicSwell) this.onMusicSwell(8);
    this.ui.showToast(`You settle in at the ${spot.name}…`, 2200);
  }

  lockPlayer() {
    this.player.actionLocked = true;
    this.player.moveInput.set(0, 0);
    this.player.sprint = false;
    this.player.jumpBufferTimer = 0;
    this.player.jumpHeld = false;
  }

  updateRest(dt) {
    const r = this.rest;
    if (!r) return;
    // Any deliberate movement (or dialogue) ends the moment naturally.
    if (this.player.moveInput.lengthSq() > 0.02 || this.player.jumpBufferTimer > 0 ||
        (this.dialogue && this.dialogue.active)) {
      this.endRest();
      return;
    }
    this.lockPlayer();
    r.t += dt;
    r.quietT += dt;

    // Stillness moment (G1.2): after ~8 quiet seconds something answers.
    // No countdown UI — it simply arrives.
    if (!r.fired && r.quietT >= 8) {
      r.fired = true;
      this.quietMoment(r.spot);
    }
    if (r.t >= r.dur) this.endRest();
  }

  endRest() {
    const r = this.rest;
    this.rest = null;
    this.player.actionLocked = false;
    if (r && r.fired) this.ui.showToast('The moment passes, but it stays with you.', 2600);
  }

  /** One quiet reveal per spot — sensory, weather- and time-aware. */
  quietMoment(spot) {
    const sky = this.sky;
    const night = sky && sky.sunDir && sky.sunDir.y < -0.02;
    const weather = sky ? sky.weather : 'clear';
    let text;
    if (spot.id === 'torii') {
      // The local completion beat (G3.2): arrival, not an ending.
      text = 'Every path becomes a home when someone remembers your pawprints.';
      this.discover('keepsakes', { id: 'valley-home', text: 'The valley became home — watched from the torii crown' });
    } else if (night) {
      text = 'Fireflies gather around you like small, warm thoughts.';
    } else if (weather === 'rain') {
      text = 'Rain writes its thousand tiny letters on the leaves, just for you.';
    } else if (weather === 'mist') {
      text = 'Something pale watches from the mist for a while — and means no harm.';
    } else if (spot.id === 'bridge') {
      text = 'A koi rises, tastes the air, and slips away without a sound.';
    } else if (spot.id === 'shrine') {
      text = 'A bird lands an arm’s length away… and decides to stay.';
    } else {
      text = spot.poem;
    }
    if (this.audio) this.audio.playDreamChime();
    if (this.onMusicSwell) this.onMusicSwell(5);
    if (this.progression) this.progression.addXP(15, 'A quiet moment');
    this.ui.showToast(`✦ ${text}`, 4600);
    this.discover('quietMoments', { id: `quiet-${spot.id}`, text, spot: spot.name });
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
      const doorPos = world.secretDoorWorldPos || _DOOR_POS;
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
