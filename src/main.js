import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Player } from './player.js?v=20260827a';
import { Countryside } from './countryside.js?v=20260827a';
import { Sky } from './sky.js?v=20260823a';
import { Vegetation } from './vegetation.js?v=20260827a';
import { Particles } from './particles.js?v=20260823a';
import { AmbientLife } from './ambient_life.js?v=20260827a';
import { Controls } from './controls.js?v=20260825b';
import { UI } from './ui.js?v=20260825h';
import { NPC } from './npc.js?v=20260825j';
import { Dialogue } from './dialogue.js?v=20260823a';
import { QuestManager } from './quest.js?v=20260825i';
import { AudioManager } from './audio.js?v=20260825j';
import { ProgressionManager } from './progression.js?v=20260823a';
import { ContextActionManager } from './context_actions.js?v=20260825j';
import { InteriorManager } from './interior.js?v=20260823a';
import { SaveManager } from './save.js?v=20260823a';
import { ScentTrail } from './scent.js?v=20260823a';
import { SettingsManager } from './settings.js?v=20260825h';
import { MenuSystem } from './menus.js?v=20260825d';
import { WaypointSystem, Compass } from './waypoints.js?v=20260823a';
import { MusicDirector } from './music.js?v=20260825h';

const AUTOSTART_KEY = 'catwalk_autostart';

class Game {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ui = new UI();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 4, -6);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    window.game = this;

    // Multisampled HDR target: keeps MSAA anti-aliasing through the post chain
    const rtSize = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const renderTarget = new THREE.WebGLRenderTarget(rtSize.width, rtSize.height, {
      samples: 4,
      type: THREE.HalfFloatType
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.42, 0.7, 0.82
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.clock = new THREE.Clock();
    this.audio = new AudioManager();
    this.sky = new Sky(this.scene);
    this.city = new Countryside(this.scene);
    this.interior = new InteriorManager(this);
    this.vegetation = new Vegetation(this.scene, this.city.colliders, {
      pathSamples: this.city.pathSamples,
      waterRects: this.city.waterRects,
      riverSamples: this.city.riverSamples,
      exclusionRects: this.city.vegetationExclusions
    });
    this.particles = new Particles(this.scene);
    this.ambientLife = new AmbientLife(this.scene, this.audio, this.city.nestPos);
    this.scent = new ScentTrail(this.scene);
    this.player = new Player(this.scene, this.camera, this.audio);
    this.dialogue = new Dialogue();
    this.progression = new ProgressionManager(this.ui, this.player);
    this.quest = new QuestManager(this.ui, (quest) => this.progression.addXP(50, 'Quest complete'));

    this.luna = new NPC(
      this.scene,
      'Luna',
      0x3a3a3f,
      new THREE.Vector3(3, 0, 3),
      [
        'Oh, hello little wanderer!',
        'I am Luna. This valley is full of secrets... and yarn.',
        'Could you collect 3 yarn balls for me?'
      ],
      { wanderRadius: 3 }
    );
    this.luna.dialogueProvider = () => this.getLunaDialogue();
    this.luna.onDialogueComplete = () => this.finishLunaDialogue();

    // Additional wandering villagers
    this.mochi = new NPC(
      this.scene,
      'Mochi',
      0xe8b06a,
      new THREE.Vector3(28, 0, -18),
      [
        'Nyaa~ The bamboo whispers today!',
        'They say a hidden house appears for cats who explore...',
        'I saw something shiny glinting near the old torii gate!'
      ],
      { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, wanderRadius: 5 }
    );
    this.kuro = new NPC(
      this.scene,
      'Kuro',
      0x1c1c22,
      new THREE.Vector3(-14, 0, 24),
      [
        '...You walk quietly. Good.',
        'The river keeps old secrets, little one.',
        'Follow the red shrine gates when the mist rolls in.'
      ],
      { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, eyeColor: 0xd8b04a, wanderRadius: 6, wanderSpeed: 0.9 }
    );
    this.npcs = [this.luna, this.mochi, this.kuro];

    this.contextActions = new ContextActionManager(
      this.player,
      this.city,
      this.luna,
      this.ui,
      this.audio,
      this.progression,
      this.ambientLife,
      this.sky,
      this.dialogue,
      this.quest,
      this.interior
    );
    this.drinkCount = 0;
    this.freshWaterAchievement = false;
    this.contextActions.onDrinkComplete = () => this.completeDrink();
    this.controls = new Controls(this.player, this.ui, this.audio, this.contextActions, this.dialogue);

    this.collectibles = this.city.collectibles;
    this.score = 0;
    this.collectedIds = new Set();
    this.saveManager = new SaveManager();
    this.saveTimer = 5;
    this.doorPos = new THREE.Vector3(20, 0, 12.5);
    this.poiRefreshTimer = 0;
    this.toriiMessageSeen = false;

    // Generative day-phase music
    this.music = new MusicDirector(this.audio);

    // HUD 3D helpers
    this.waypoints = new WaypointSystem();
    this.waypoints.setCamera(this.camera);
    this.compass = new Compass();
    this.refreshCompassPois();

    // Settings + menus
    this.settings = new SettingsManager();
    this.ui.onHintsChange = (enabled) => {
      this.settings.set('hints', enabled);
      const hintsInput = document.getElementById('set-hints');
      if (hintsInput) hintsInput.checked = enabled;
    };
    this.menu = new MenuSystem({
      settings: this.settings,
      audio: this.audio,
      ui: this.ui,
      callbacks: {
        onStartNewGame: () => this.startNewGame(),
        onContinue: () => this.continueGame(),
        onResume: () => {},
        onQuitToTitle: () => this.quitToTitle(),
        onApplySettings: () => this.applySettings(),
        canPause: () => !this.dialogue.active
      }
    });
    this.applySettings();
    this.installAudioEnableButton();
    this.startTitleAudio();

    this.loadGame();

    // A reload is used to reset the world for a new game. Starting the game
    // must never depend on audio being enabled first.
    this.pendingNewGame = sessionStorage.getItem(AUTOSTART_KEY) === 'new';
    if (this.pendingNewGame) {
      sessionStorage.removeItem(AUTOSTART_KEY);
      this.pendingNewGame = false;
      this.menu.startGame();
      this.controls.enabled = true;
    } else {
      this.controls.enabled = false; // title screen active
    }

    // iOS Safari can interrupt an AudioContext after the browser is
    // backgrounded. Attempt recovery and surface the explicit control if the
    // browser requires another user gesture.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.audio.ctx && !this.audio.isRunning) {
        this.audio.attemptAutoplay().then((running) => {
          this.updateAudioEnableButton(running);
        });
      }
    });

    // ---- Photo mode ----
    this.photoMode = false;
    this.pm = { yaw: Math.PI, pitch: 0.18, dist: 5 };
    this.captureRequested = false;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' && this.menu.isPlaying) {
        e.preventDefault();
        this.togglePhotoMode();
      }
      if (e.code === 'Enter' && this.photoMode) {
        e.preventDefault();
        this.captureRequested = true;
      }
      if (e.code === 'Escape' && this.photoMode) {
        this.togglePhotoMode();
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.photoMode || !this._pmDragging) return;
      this.pm.yaw -= e.movementX * 0.005;
      this.pm.pitch = THREE.MathUtils.clamp(this.pm.pitch + e.movementY * 0.004, -0.3, 1.1);
    });
    window.addEventListener('mousedown', () => { this._pmDragging = true; });
    window.addEventListener('mouseup', () => { this._pmDragging = false; });
    window.addEventListener('wheel', (e) => {
      if (!this.photoMode) return;
      this.pm.dist = THREE.MathUtils.clamp(this.pm.dist + e.deltaY * 0.004, 1.6, 14);
    }, { passive: true });

    // ---- Adaptive resolution ----
    this.adaptTimer = 2;
    this.pixelCap = Math.min(window.devicePixelRatio || 1, 1.75);
    this.pixelScale = this.renderer.getPixelRatio();

    window.addEventListener('resize', () => this.onResize());
    this.loop();
  }

  /* ---------------- Photo mode ---------------- */

  togglePhotoMode() {
    this.photoMode = !this.photoMode;
    document.body.classList.toggle('photo-mode', this.photoMode);
    document.getElementById('photo-hint').classList.toggle('hidden', !this.photoMode);
    if (this.photoMode) {
      this.pm.yaw = this.player.heading + Math.PI;
      this.pm.pitch = 0.18;
      this.pm.dist = 5;
    } else {
      // Restore normal FOV
      this.camera.fov = this.player.fovCurrent;
      this.camera.updateProjectionMatrix();
    }
  }

  updatePhotoCamera(dt) {
    const p = this.player.mesh.position;
    const target = new THREE.Vector3(p.x, p.y + 0.45, p.z);
    const offset = new THREE.Vector3(
      Math.sin(this.pm.yaw) * Math.cos(this.pm.pitch),
      Math.sin(this.pm.pitch),
      Math.cos(this.pm.yaw) * Math.cos(this.pm.pitch)
    ).multiplyScalar(this.pm.dist);
    const desired = target.clone().add(offset);
    desired.y = Math.max(0.25, desired.y);
    this.camera.position.lerp(desired, Math.min(1, dt * 10));
    this.camera.lookAt(target);
  }

  capturePhoto() {
    try {
      const url = this.renderer.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `catwalk_photo_${Date.now()}.png`;
      a.click();
      const flash = document.getElementById('photo-flash');
      flash.style.transition = 'none';
      flash.style.opacity = '0.85';
      requestAnimationFrame(() => {
        flash.style.transition = 'opacity 0.35s ease';
        flash.style.opacity = '0';
      });
      this.ui.showToast('Photo saved!');
    } catch (err) {
      this.ui.showToast('Photo capture failed');
    }
  }

  /* ---------------- Adaptive resolution ---------------- */

  updateAdaptiveResolution(dt) {
    this.adaptTimer -= dt;
    if (this.adaptTimer > 0) return;
    this.adaptTimer = 2;
    const fps = this.ui.fps;
    let changed = false;
    if (fps > 0 && fps < 45 && this.pixelScale > 0.55) {
      this.pixelScale = Math.max(0.55, this.pixelScale * 0.85);
      changed = true;
    } else if (fps > 58 && this.pixelScale < this.pixelCap) {
      this.pixelScale = Math.min(this.pixelCap, this.pixelScale * 1.12);
      changed = true;
    }
    if (changed) {
      this.renderer.setPixelRatio(this.pixelScale);
      this.onResize();
    }
  }

  /* ---------------- Settings ---------------- */

  applySettings() {
    const v = this.settings.values;
    this.audio.applyVolumes({
      master: v.master / 100,
      music: v.music / 100,
      sfx: v.sfx / 100,
      ambient: v.ambient / 100
    });
    this.controls.sensitivity = (v.sensitivity / 100) * 0.004;
    this.controls.invertY = v.invertY;
    this.ui.setHints(v.hints);
    this.applyQuality();
  }

  applyQuality() {
    const q = this.settings.resolveQuality();
    const dpr = window.devicePixelRatio || 1;
    const cap = q === 'low' ? 1.0 : q === 'medium' ? 1.25 : Math.min(dpr, 1.75);
    this.renderer.setPixelRatio(Math.min(dpr, cap));
    this.onResize();

    const shadowSize = q === 'low' ? 1024 : 2048;
    if (this.sky.sun.shadow.mapSize.x !== shadowSize) {
      this.sky.sun.shadow.mapSize.set(shadowSize, shadowSize);
      if (this.sky.sun.shadow.map) {
        this.sky.sun.shadow.map.dispose();
        this.sky.sun.shadow.map = null;
      }
    }
    this.bloom.enabled = q !== 'low';
  }

  /* ---------------- Game flow ---------------- */

  /** Start title ambience immediately where autoplay policy permits it. */
  startTitleAudio() {
    const mobilePointer = window.matchMedia &&
      window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (mobilePointer || mobileUserAgent) {
      // Do not construct AudioContext before the first valid touch activation.
      // Real iOS Safari is substantially more reliable when construction,
      // resume, source startup, and the first audible tone share one event.
      this.updateAudioEnableButton(false);
      return;
    }
    this.audio.start();
    this.music.start();
    this.applySettings();
    this.audio.attemptAutoplay().then((running) => {
      this.updateAudioEnableButton(running);
    });
  }

  /** Install one shared audio unlock path for menus, controls, and the speaker. */
  installAudioEnableButton() {
    this.audioEnableButton = document.getElementById('btn-enable-audio');
    this.audio.onStateChange((state) => this.updateAudioEnableButton(state === 'running'));

    const unlock = (event) => {
      if (event.type === 'keydown' && (event.metaKey || event.ctrlKey || event.altKey)) return;
      // WebKit only grants touch activation on pointerup/touchend/click. Never
      // create the context from touch pointerdown.
      if (event.type === 'pointerdown' && event.pointerType !== 'mouse') return;
      if (event.type === 'pointerup' && event.pointerType === 'mouse') return;
      const confirm = event.type === 'click' && event.target === this.audioEnableButton;
      this.unlockAudioFromGesture(confirm);
    };

    // Capture phase is intentional: unlock before menu navigation. Mouse uses
    // pointerdown; touch/pen uses pointerup, with touchend/click fallbacks for
    // older iOS Safari versions.
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('pointerup', unlock, { capture: true, passive: true });
    window.addEventListener('touchend', unlock, { capture: true, passive: true });
    window.addEventListener('click', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  unlockAudioFromGesture(confirm = false) {
    const resume = this.audio.resumeOnGesture();
    // Source creation remains in the trusted event call stack for Chrome's
    // Web Audio game heuristic and mobile Safari's user-activation rule.
    this.audio.start();
    this.music.start();
    this.applySettings();
    if (confirm) this.audio.playUnlockChime();

    Promise.resolve(resume).then((running) => {
      this.updateAudioEnableButton(running);
    });
  }

  updateAudioEnableButton(running) {
    const label = running ? 'Audio is on' : 'Turn on audio';
    document.body.classList.toggle('audio-blocked', !running);
    this.setAudioEnableButtonState(running, label);
  }

  setAudioEnableButtonState(enabled, label) {
    this.audioEnableButton.textContent = enabled ? '🔊' : '🔇';
    this.audioEnableButton.classList.toggle('audio-on', enabled);
    this.audioEnableButton.setAttribute('aria-pressed', String(enabled));
    this.audioEnableButton.setAttribute('aria-label', label);
    this.audioEnableButton.title = label;
  }

  startNewGame() {
    this.saveManager.clear();
    sessionStorage.setItem(AUTOSTART_KEY, 'new');
    location.reload();
  }

  continueGame() {
    this.menu.startGame();
    this.controls.enabled = true;
    this.audio.start();
    this.music.start();
  }

  quitToTitle() {
    this.saveGame();
    this.controls.enabled = false;
    this.menu.showTitle();
  }

  /* ---------------- HUD helpers ---------------- */

  refreshCompassPois() {
    const pois = [
      { icon: '🐱', pos: this.luna.mesh.position },
      { icon: '🍡', pos: this.mochi.mesh.position },
      { icon: '⚫', pos: this.kuro.mesh.position },
      { icon: '🏮', pos: this.doorPos },
      { icon: '🎋', pos: new THREE.Vector3(30, 0, -20) }
    ];
    if (this.city.secretKeyMesh && this.city.secretKeyMesh.visible) {
      pois.push({ icon: '🔑', pos: this.city.secretKeyMesh.position });
    }
    if (this.city.nestFeatherMesh && this.city.nestFeatherMesh.visible) {
      pois.push({ icon: '🪶', pos: this.city.nestPos });
    }
    if (this.city.corralRewardMesh && this.city.corralRewardMesh.visible) {
      pois.push({ icon: '🐢', pos: this.city.corralRewardMesh.position });
    }
    this.compass.setPois(pois);
  }

  updateWaypointTargets() {
    const targets = [];
    const c = this.city;
    if (!c.hasSecretKey && c.secretKeyMesh && c.secretKeyMesh.visible) {
      targets.push({ id: 'key', icon: '🔑', pos: c.secretKeyMesh.position });
    } else if (!c.isSecretHouseUnlocked) {
      targets.push({ id: 'door', icon: '🏮', pos: this.doorPos });
    }
    if (!c.nestInteracted && c.nestFeatherMesh && c.nestFeatherMesh.visible) {
      targets.push({ id: 'nest', icon: '🪶', pos: c.nestPos });
    }
    const larryReady = this.quest.hasCompleted('yarn') && !this.quest.hasPendingReward('yarn');
    if (larryReady && c.corralRewardMesh && c.corralRewardMesh.visible) {
      targets.push({ id: 'corral', icon: '🐢', pos: c.corralRewardMesh.position });
    }
    if (this.quest.active && this.quest.active.type === 'yarn') {
      let best = null;
      let bd = Infinity;
      for (const y of this.collectibles) {
        const d = y.position.distanceToSquared(this.player.mesh.position);
        if (d < bd) { bd = d; best = y; }
      }
      if (best) targets.push({ id: 'yarn', icon: '🧶', pos: best.position });
    }
    this.waypoints.setTargets(targets);
  }

  /* ---------------- Persistence ---------------- */

  loadGame() {
    const data = this.saveManager.load();
    if (!data) return;

    const p = this.player;
    p.mesh.position.set(data.x || 0, data.y || 0, data.z || 0);
    p.heading = data.heading || 0;
    p.yaw = data.yaw || 0;
    p.yawPrev = data.yaw || 0;
    p.mesh.rotation.y = p.heading;

    this.score = data.score || 0;
    this.collectedIds = new Set(data.collected || []);

    this.progression.load({ xp: data.xp || 0, rank: data.rank || 0 });

    if (data.quest) {
      this.quest.active = { ...data.quest };
      this.ui.setQuest(`${data.quest.name} — ${data.quest.current}/${data.quest.target}`, data.quest.current, data.quest.target);
    }
    this.quest.completed = data.completed || [];

    if (data.npcGreeted) {
      for (const name of data.npcGreeted) {
        const n = this.npcs.find((x) => x.name === name);
        if (n) n.hasGreeted = true;
      }
    } else if (data.lunaGreeted) {
      this.luna.hasGreeted = true;
    }

    if (data.dayTime != null) this.sky.dayTime = data.dayTime;
    if (data.weather) {
      this.sky.weather = data.weather;
      this.sky.targetWeather = data.weather;
      this.sky.weatherBlend = 1;
    }

    if (data.hasSecretKey) {
      this.city.hasSecretKey = true;
      this.city.secretKeyCollected = true;
      if (this.city.secretKeyMesh) this.city.secretKeyMesh.visible = false;
    }
    if (data.isSecretHouseUnlocked) {
      this.city.unlockSecretHouse();
    }
    if (data.fishEaten) {
      this.city.eatFish();
    }
    if (data.nestInteracted) {
      this.city.nestInteracted = true;
      if (this.city.nestFeatherMesh) this.city.nestFeatherMesh.visible = false;
    }
    if (data.corralRewardCollected || this.collectedIds.has(91)) {
      this.city.setCorralRewardCollected(true);
      this.player.canWalkFences = true;
    }
    this.toriiMessageSeen = !!data.toriiMessageSeen;
    this.drinkCount = data.drinkCount || 0;
    this.freshWaterAchievement = !!data.freshWaterAchievement;

    // Remove already-collected yarn
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      if (item.userData.id != null && this.collectedIds.has(item.userData.id)) {
        this.scene.remove(item);
        this.collectibles.splice(i, 1);
      }
    }
  }

  saveGame() {
    const pos = this.player.mesh.position;
    const collected = [...this.collectedIds];
    const data = {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      heading: this.player.heading,
      yaw: this.player.yaw,
      score: this.score,
      collected,
      xp: this.progression.xp,
      rank: this.progression.rank,
      quest: this.quest.active,
      completed: this.quest.completed,
      npcGreeted: this.npcs.filter((n) => n.hasGreeted).map((n) => n.name),
      dayTime: this.sky.dayTime,
      weather: this.sky.weather,
      hasSecretKey: this.city.hasSecretKey,
      isSecretHouseUnlocked: this.city.isSecretHouseUnlocked,
      fishEaten: this.city.fishEaten,
      nestInteracted: this.city.nestInteracted,
      corralRewardCollected: this.city.corralRewardCollected,
      toriiMessageSeen: this.toriiMessageSeen,
      drinkCount: this.drinkCount,
      freshWaterAchievement: this.freshWaterAchievement
    };
    this.saveManager.save(data);
  }

  /* ---------------- Frame loop ---------------- */

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  update(dt) {
    const playing = this.menu.isPlaying;

    this.controls.update(dt);

    if (playing) {
      this.player.update(dt, this.city.colliders, this.city, this.luna);
      const yarnFinished = this.quest.hasCompleted('yarn') && !this.quest.hasPendingReward('yarn');
      const corralEvent = this.city.updateCorralGuardian(dt, this.player, yarnFinished);
      if (corralEvent === 'alerted') {
        this.ui.showToast('🐢 Larry spotted you — run for the Jade Paw!');
        this.player.cat.setMood('alert', 1.2, 2);
      }
      this.contextActions.update(dt);
      this.dialogue.update(dt);
      this.updateDialogue();
      this.checkCollectibles();
      if (!this.toriiMessageSeen && this.progression.rank >= 4 && this.city.toriiTopPos &&
          this.player.mesh.position.y > 5.05 &&
          this.player.mesh.position.distanceToSquared(this.city.toriiTopPos) < 5.5) {
        this.toriiMessageSeen = true;
        this.ui.showToast("I can see beyond this valley, I wonder what's out there?", 5200);
        this.saveGame();
      }

      // Interior simulation (knockable table objects)
      this.interior.update(dt);

      // Valley collectibles are hidden while inside the Tea House
      const insideNow = this.interior.isInside;
      for (const item of this.collectibles) {
        if (!item.userData.isCorralReward) item.visible = !insideNow;
      }
      this.city.setCorralChallengeActive(yarnFinished, !insideNow);

      this.saveTimer -= dt;
      if (this.saveTimer <= 0) {
        this.saveTimer = 12;
        this.saveGame();
      }
    } else {
      if (this.contextActions.drinkTimer > 0) this.contextActions.cancelDrinking();
      // Title/pause: keep the cat idling in place (no input, no camera takeover)
      const savedInput = this.player.moveInput.clone();
      this.player.moveInput.set(0, 0);
      this.player.update(dt, this.city.colliders, this.city, this.luna);
      this.player.moveInput.copy(savedInput);
    }

    // World simulation always runs (living background on title screen)
    this.city.update(dt, this.player.mesh.position, this.sky);
    this.sky.update(dt, this.player.mesh.position);
    this.vegetation.update(dt, this.player.mesh.position, this.sky);
    this.particles.update(dt, this.player.mesh.position, this.sky);
    this.ambientLife.update(dt, this.player.mesh.position, this.sky, this.player.cat, this.player, this.city);
    this.scent.update(dt, this.player.mesh.position, playing ? this.player.currentSpeed : 0);
    this.audio.setWeatherTransition(this.sky.getWeatherTransition());
    this.audio.updateListener(this.camera);
    for (const n of this.npcs) n.update(dt, this.player.mesh.position, this.camera);

    // Music follows the day cycle; ducks during pause/dialogue
    this.music.update(this.sky.dayTime);
    this.music.setDucked(!playing || this.dialogue.active);

    this.ui.setTimeWeather(this.formatTime(this.sky.dayTime), this.capitalise(this.sky.weather));
    this.ui.setInventory(this.city.hasSecretKey, this.city.nestInteracted);

    // Photo mode camera takeover
    if (this.photoMode && playing) {
      this.updatePhotoCamera(dt);
    }

    // Title screen cinematic orbit camera
    if (this.menu.mode === 'title') {
      const t = this.clock.elapsedTime * 0.07;
      const r = 17;
      this.camera.position.set(
        Math.cos(t) * r,
        5.6 + Math.sin(t * 0.6) * 1.2,
        Math.sin(t) * r
      );
      this.camera.lookAt(0, 1.4, 0);
      if (this.camera.fov !== 55) {
        this.camera.fov = 55;
        this.camera.updateProjectionMatrix();
      }
    }

    // Objective markers + compass (playing only)
    if (playing) {
      this.updateWaypointTargets();
      this.waypoints.update(this.player.mesh.position);
      this.camera.getWorldDirection(this._camDir || (this._camDir = new THREE.Vector3()));
      this.compass.update(this.camera.position, this._camDir);
      this.poiRefreshTimer -= dt;
      if (this.poiRefreshTimer <= 0) {
        this.poiRefreshTimer = 2;
        this.refreshCompassPois();
      }
    }

    const debug = `Pos      ${this.player.mesh.position.x.toFixed(1)}, ${this.player.mesh.position.y.toFixed(1)}, ${this.player.mesh.position.z.toFixed(1)}
Time     ${this.formatTime(this.sky.dayTime)} · ${this.sky.weather}
Quality  ${this.settings.resolveQuality()}`;
    this.ui.update(dt, this.score, debug);
  }

  formatTime(dayTime) {
    const h = Math.floor(dayTime);
    const m = Math.floor((dayTime - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  completeDrink() {
    this.drinkCount++;
    if (this.drinkCount >= 10 && !this.freshWaterAchievement) {
      this.freshWaterAchievement = true;
      this.progression.addXP(40, 'Fresh Water Connoisseur achievement');
      this.ui.showToast('🏅 Fresh Water Connoisseur — completed 10 refreshing drinks!');
      if (this.audio) this.audio.playDreamChime();
    } else {
      this.ui.showToast(`Fresh water enjoyed · ${Math.min(this.drinkCount, 10)}/10`);
    }
    this.saveGame();
  }

  updateDialogue() {
    if (this.dialogue.active) {
      // Close if the speaker wandered off
      const speaker = this.npcs.find((n) => n.name === this.dialogue.title.textContent);
      if (speaker && speaker.distanceTo(this.player.mesh.position) > 4.5) this.dialogue.close();
      return;
    }
    for (const n of this.npcs) {
      if (!n.hasGreeted && n.distanceTo(this.player.mesh.position) < 2.5) {
        n.hasGreeted = true;
        const lines = n.getDialogueLines ? n.getDialogueLines() : n.dialogue;
        this.dialogue.show(n.name, lines, () => {
          if (n.finishDialogue) n.finishDialogue();
          this.progression.addXP(5, 'Made a friend');
        });
        break;
      }
    }
  }

  getLunaDialogue() {
    if (this.quest.hasPendingReward('yarn')) {
      return [
        'You found all three! Even the moonlight looks warmer around you.',
        'Here is your reward: Luna’s Leap lesson. Your paws can spring much higher now!',
        'Try it at the bamboo corral west of the village. A stubborn turtle guards a Jade Paw inside.'
      ];
    }
    if (this.quest.active && this.quest.active.type === 'yarn') {
      const remaining = Math.max(0, this.quest.active.target - this.quest.active.current);
      return remaining === 1
        ? ['Only one yarn ball remains. I can almost hear it rolling through the grass!']
        : [`You have found ${this.quest.active.current} of 3 yarn balls. ${remaining} still hide in the valley.`];
    }
    if (this.quest.hasCompleted('yarn')) {
      return [
        'Your new leap suits you, little wanderer.',
        'The turtle is slow but determined. Let it chase you, then spring past and claim the Jade Paw!'
      ];
    }
    return this.luna.dialogue;
  }

  finishLunaDialogue() {
    if (this.quest.hasPendingReward('yarn')) {
      const reward = this.quest.claimReward('yarn');
      if (reward) {
        this.ui.showToast(reward.granted
          ? 'Luna’s reward: Jump boost unlocked! Find the turtle corral.'
          : 'Luna points you toward the turtle corral and its hidden Jade Paw.');
        if (this.audio) this.audio.playKeyChime();
        this.saveGame();
      }
      return;
    }
    if (!this.quest.active && !this.quest.hasCompleted('yarn')) {
      this.quest.start({ name: "Luna's Yarn Hunt", type: 'yarn', target: 3 });
    }
  }

  checkCollectibles() {
    const pos = this.player.mesh.position;
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      // The river-spirit charm is intentionally collected from below the deck.
      if (item.userData.isCharm && !this.player.inWater) continue;
      // The Jade Paw challenge begins only after the cat bumps the turtle and
      // draws it away from its guarding position.
      if (item.userData.isCorralReward &&
          (!this.quest.hasCompleted('yarn') || this.quest.hasPendingReward('yarn') ||
           !this.city.corralGuardian || !this.city.corralGuardian.hasBeenAlerted)) continue;
      if (item.position.distanceTo(pos) < 1.0) {
        this.scene.remove(item);
        this.collectibles.splice(i, 1);
        this.score++;
        if (item.userData.id != null) this.collectedIds.add(item.userData.id);
        if (this.audio) this.audio.playCollect();
        if (item.userData.isCharm) {
          // Golden Dango Charm — grants XP + temporary speed buff
          this.progression.addXP(50, 'Golden Dango Charm found!');
          this.ui.showToast('✦ Golden Dango Charm! Speed blessed by the river spirit ✦');
          this.player.speedBuffTimer = 20;
          if (this.audio) this.audio.playBell();
        } else if (item.userData.isCorralReward) {
          this.city.setCorralRewardCollected(true);
          this.player.canWalkFences = true;
          this.progression.addXP(75, 'Claimed the Jade Paw from the turtle corral');
          this.ui.showToast('✦ Jade Paw claimed! Larry taught you to balance on fence tops! ✦');
          this.player.cat.setMood('playful', 1.8, 2);
          if (this.audio) this.audio.playKeyChime();
          this.saveGame();
        } else {
          this.progression.addXP(10, 'Yarn collected');
          this.quest.onCollect('yarn');
        }
      }
    }
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (!this.menu.isPausedLike()) {
      this.update(dt);
      this.updateAdaptiveResolution(dt);
    }
    this.composer.render();
    if (this.captureRequested) {
      this.captureRequested = false;
      this.capturePhoto();
    }
  }
}

const game = new Game();
window.game = game;