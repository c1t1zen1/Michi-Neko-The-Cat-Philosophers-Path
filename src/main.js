import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { AOPass, AtmospherePass, GradeOutputShader } from './postfx.js?v=20260912b';
import { Player } from './player.js?v=20260912b';
import { Countryside } from './countryside.js?v=20260912b';
import { Sky } from './sky.js?v=20260912b';
import { Vegetation } from './vegetation.js?v=20260912b';
import { Particles } from './particles.js?v=20260912b';
import { AmbientLife } from './ambient_life.js?v=20260912b';
import { Controls } from './controls.js?v=20260912b';
import { UI } from './ui.js?v=20260912b';
import { NPC } from './npc.js?v=20260912b';
import { Dialogue } from './dialogue.js?v=20260912b';
import { QuestManager } from './quest.js?v=20260912b';
import { AudioManager } from './audio.js?v=20260912b';
import { ProgressionManager } from './progression.js?v=20260912b';
import { ContextActionManager } from './context_actions.js?v=20260912b';
import { InteriorManager } from './interior.js?v=20260912b';
import { SaveManager } from './save.js?v=20260912b';
import { ScentTrail } from './scent.js?v=20260912b';
import { SettingsManager } from './settings.js?v=20260912b';
import { isDiscreteGPU } from './settings.js?v=20260912b';
import { MenuSystem } from './menus.js?v=20260912b';
import { WaypointSystem, Compass } from './waypoints.js?v=20260912b';
import { MusicDirector } from './music.js?v=20260912b';
import { catRimUniforms } from './cat.js?v=20260912b';
import { chunkSceneInstances } from './instanced_chunks.js?v=20260912b';
import { setFoliageDetail } from './foliage.js?v=20260912b';

const AUTOSTART_KEY = 'catwalk_autostart';

class Game {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ui = new UI();

    // WebGL2 feature gate (A1.6): the composer's half-float MSAA render
    // targets require WebGL2. Without it, fail calmly instead of freezing.
    if (!this.supportsWebGL2()) {
      this.showRecoveryOverlay(
        'この谷には WebGL2 が必要です',
        'This valley needs WebGL2 to render. Please try an up-to-date browser.',
        false
      );
      return;
    }

    this.scene = new THREE.Scene();

    // Far plane reaches past the outer mountain ring so the ridges are never
    // clipped and the depth-based haze can still grade them
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 700);
    this.camera.position.set(0, 4, -6);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      // MSAA now lives on the composer's render target (tier-driven samples),
      // so the default framebuffer never needs its own multisampling.
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.32;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    window.game = this;

    // Multisampled HDR target with a resolved depth attachment: MSAA edges
    // survive the post chain, and the depth buffer feeds the screen-space
    // ambient occlusion, height fog and light-shaft passes.
    const rtSize = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const renderTarget = new THREE.WebGLRenderTarget(rtSize.width, rtSize.height, {
      samples: 4, // tier-driven; applyQuality() rewrites this per device
      type: THREE.HalfFloatType,
      depthTexture: this.makeDepthTexture()
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    // Each ping-pong buffer needs its own depth attachment so the scene depth
    // read by the post passes is never a stale copy from the other buffer.
    this.composer.renderTarget2.depthTexture = this.makeDepthTexture();
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.aoPass = new AOPass(this.camera, rtSize.width, rtSize.height, { scale: 0.5, samples: 12 });
    this.composer.addPass(this.aoPass);
    this.atmosphere = new AtmospherePass(this.camera, rtSize.width, rtSize.height);
    this.atmosphere.aoPass = this.aoPass;
    this.composer.addPass(this.atmosphere);
    // Bloom renders at half resolution: its 5 mip levels blur everything
    // anyway, so the downsize is invisible while costing ~4x less fill.
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
      0.38, 0.85, 0.82
    );
    this.composer.addPass(this.bloom);
    // Tone mapping + colour-space + grade fused into one fullscreen pass
    // (was OutputPass + GradeShader: two passes over the frame).
    this.gradePass = new ShaderPass(GradeOutputShader);
    this.composer.addPass(this.gradePass);

    this.clock = new THREE.Clock();
    this.audio = new AudioManager();
    this.sky = new Sky(this.scene);
    this.sky.attachRenderer(this.renderer);
    this.city = new Countryside(this.scene);
    this.interior = new InteriorManager(this);
    this.vegetation = new Vegetation(this.scene, this.city.colliders, {
      pathSamples: this.city.pathSamples,
      waterRects: this.city.waterRects,
      riverSamples: this.city.riverSamples,
      exclusionRects: this.city.vegetationExclusions
    });
    // Every builder has run: split the instanced vegetation sets that span
    // the valley into spatial chunks so the frustum (and the sun's shadow
    // frustum) can reject the ones behind the cat. Measured before this:
    // 30 sets with a >60 m cull radius carrying 2.2 M triangles — two thirds
    // of the scene — submitted regardless of where the camera looked.
    this.chunkStats = chunkSceneInstances(this.scene, { cell: 32, minRadius: 40, minCount: 12, minTriangles: 80000 });

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
    // Routine (N2.2): at night Luna walks to the old bridge to watch the
    // moon travel across the water.
    // The night spot is the old bridge deck (y≈1.1): a tight stroll radius
    // keeps her on the timber, and plateau/rise match the deck+ramp so she
    // climbs to deck height only as she reaches the bridge.
    this.luna.schedule = {
      night: { pos: new THREE.Vector3(-1, 1.1, 30.5), radius: 0.25, plateau: 4.0, rise: 3.0 }
    };

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
    // Mochi plays with fallen bamboo leaves when the wind picks up (N2.2).
    this.mochi.schedule = { playInWind: true };
    this.mochi.dialogueProvider = () => this.getMochiDialogue();
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
    // Kuro's routines (N2.2): the river only in mist; shelter under the tea
    // house eave when it rains.
    this.kuro.schedule = {
      mist: new THREE.Vector3(-4, 0, 28),
      rain: new THREE.Vector3(17, 0, 14)
    };
    this.kuro.dialogueProvider = () => this.getKuroDialogue();
    this.kuro.onDialogueComplete = () => this.finishKuroDialogue();
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
    this.contextActions.npcs = this.npcs;
    this.contextActions.onDiscover = (section, entry) => this.discover(section, entry);
    this.contextActions.onMusicSwell = (d) => this.music.swell(d);

    // Discovery journal (G1.4): keepsake memory of the valley, not a checklist.
    this.journal = {
      places: [], quietMoments: [], photos: [], weatherMemories: [],
      keepsakes: [], catsMet: []
    };
    // Last-known-safe grounded spawn point (S1.5).
    this.safePos = null;
    this._lastWeatherSeen = null;
    // POIs the compass may reveal before the cat has been there (U1.1).
    this.discoveredPois = new Set();
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
      saveManager: this.saveManager,
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
    this.buildJournalUI();
    this.installAudioEnableButton();
    this.startTitleAudio();

    // A reload is used to reset the world for a new game. Starting the game
    // must never depend on audio being enabled first.
    this.pendingNewGame = sessionStorage.getItem(AUTOSTART_KEY);
    sessionStorage.removeItem(AUTOSTART_KEY);
    // 'new' must boot a fresh valley — never restore a save that survived
    // or was rewritten during the reset reload.
    if (this.pendingNewGame !== 'new') this.loadGame();

    if (this.pendingNewGame) {
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
    // applyQuality() already ran (via applySettings) and set the tier's cap —
    // don't stomp it back to full DPR here.
    if (this.pixelCap === undefined) this.pixelCap = Math.min(window.devicePixelRatio || 1, 1.75);
    this.pixelScale = this.renderer.getPixelRatio();
    // Two-stage adaptive: stage 1 trims post-FX before touching resolution,
    // stage 2 then scales the framebuffer (see updateAdaptiveResolution).
    this.perfStage = 0;
    this.perfEscalateTimer = 0;
    this.perfLowSamples = 0;
    // Frame pacing: 0 = uncapped; 1/30 while the eco governor or the
    // touch-device title mode holds the frame floor.
    this.frameFloor = 0;
    this._frameAccum = 0;
    // Shadow-map refresh cadence (frames); 1 = every frame.
    this.shadowCadence = 1;
    this._shadowFrame = 0;

    window.addEventListener('resize', () => this.onResize());

    // WebGL context-loss recovery (A1.2): iOS Safari and memory-constrained
    // mobile browsers can drop the context at any time. Prevent the default
    // terminal failure, pause, save, and show a calm recovery screen.
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.onContextLost();
    }, false);
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.onContextRestored();
    }, false);
    const glReload = document.getElementById('btn-gl-reload');
    if (glReload) glReload.addEventListener('click', () => {
      try { if (this.menu && this.menu.isPlaying) this.saveGame(); } catch (err) {}
      sessionStorage.setItem(AUTOSTART_KEY, 'continue');
      location.reload();
    });

    // Save on page hide / tab hidden (S1.3): mobile browsers close tabs
    // without a reliable unload event; visibilitychange + pagehide cover it.
    window.addEventListener('pagehide', () => this.saveIfPlaying());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.saveIfPlaying();
    });

    this.loop();
  }

  supportsWebGL2() {
    try {
      return !!document.createElement('canvas').getContext('webgl2');
    } catch (e) {
      return false;
    }
  }

  saveIfPlaying() {
    try {
      if (this.saveSuspended) return;
      if (this.menu && this.menu.isPlaying) this.saveGame();
    } catch (e) {}
  }

  showRecoveryOverlay(title, text, reloadable = true) {
    const overlay = document.getElementById('gl-recovery');
    if (!overlay) return;
    const titleEl = document.getElementById('gl-recovery-title');
    if (titleEl) titleEl.innerHTML = `${title.split(' ')[0]}<span>${title.split(' ').slice(1).join(' ')}</span>`;
    const textEl = document.getElementById('gl-recovery-text');
    if (textEl) textEl.textContent = text;
    const btn = document.getElementById('btn-gl-reload');
    if (btn) btn.style.display = reloadable ? '' : 'none';
    overlay.classList.remove('hidden');
  }

  onContextLost() {
    if (this._contextLost) return;
    this._contextLost = true;
    try { this.controls.enabled = false; } catch (e) {}
    this.saveIfPlaying();
    this.showRecoveryOverlay(
      '静けさ THE VALLEY IS RESTING…',
      'The valley is resting for a moment. Your pawprints are safe — it will wake on its own, or you can reload and continue.'
    );
  }

  onContextRestored() {
    if (!this._contextLost) return;
    this._contextLost = false;
    // three.js rebuilds programs and buffers lazily; force the render
    // targets and viewport back to the correct size.
    this.onResize();
    const overlay = document.getElementById('gl-recovery');
    if (overlay) overlay.classList.add('hidden');
    if (this.menu && this.menu.isPlaying && !this.menu.isPausedLike()) {
      this.controls.enabled = true;
    }
    this.sky.sun.shadow.needsUpdate = true;
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
    // Allocation-free (A2.3): the vectors persist on the game instance.
    const p = this.player.mesh.position;
    const target = this._pmTarget || (this._pmTarget = new THREE.Vector3());
    target.set(p.x, p.y + 0.45, p.z);
    const offset = this._pmOffset || (this._pmOffset = new THREE.Vector3());
    offset.set(
      Math.sin(this.pm.yaw) * Math.cos(this.pm.pitch),
      Math.sin(this.pm.pitch),
      Math.cos(this.pm.yaw) * Math.cos(this.pm.pitch)
    ).multiplyScalar(this.pm.dist);
    const desired = this._pmDesired || (this._pmDesired = new THREE.Vector3());
    desired.copy(target).add(offset);
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
      // Photo-spot stamp album (G1.3): stamp the nearest discovered rest
      // spot — a keepsake journal, not a score.
      const spot = this.nearestRestSpot();
      if (spot) {
        const isNew = this.discover('photos', {
          id: `photo-${spot.id}`,
          text: `A photograph taken at the ${spot.name}`,
          spot: spot.name,
          time: this.formatTime(this.sky.dayTime)
        });
        this.ui.showToast(isNew
          ? `📸 ${spot.name} stamped into your photo album`
          : 'Photo saved!');
      } else {
        this.ui.showToast('Photo saved!');
      }
    } catch (err) {
      this.ui.showToast('Photo capture failed');
    }
  }

  nearestRestSpot() {
    const p = this.player.mesh.position;
    let best = null;
    let bd = Infinity;
    for (const spot of this.contextActions.restSpots) {
      const d = spot.pos.distanceToSquared(p);
      if (d < bd) { bd = d; best = spot; }
    }
    return bd < 36 ? best : null; // within ~6 m of a known spot
  }

  /* ---------------- Adaptive resolution ---------------- */

  updateAdaptiveResolution(dt) {
    this.adaptTimer -= dt;
    if (this.adaptTimer > 0) return;
    this.adaptTimer = 2;
    const fps = this.ui.fps;
    const struggling = fps > 0 && fps < 45;
    const healthy = fps > 58;

    // Stage 1 sheds post-FX weight (light shafts, quarter-res bloom); stage 2
    // additionally lets the framebuffer scale below the tier's pixel cap.
    // Stage 1 gets two consecutive slow samples (~4 s) to prove whether it
    // helped before the resolution is allowed to drop.
    if (struggling) {
      this.perfEscalateTimer = 0;
      this.perfLowSamples++;
      if (this.perfStage === 0) {
        this.setPerfStage(1);
        this.perfLowSamples = 0;
        return;
      }
      if (this.perfStage === 1 && this.perfLowSamples >= 2) {
        this.setPerfStage(2);
        this.perfLowSamples = 0;
      }
    } else {
      this.perfLowSamples = 0;
      if (healthy) {
        this.perfEscalateTimer += 2;
        // Sustained healthy fps walks back down, but resolution is restored
        // before the stage itself steps down so the two never fight.
        if (this.perfEscalateTimer > 10 && this.perfStage > 0 &&
            this.pixelScale >= this.pixelCap - 1e-3) {
          this.setPerfStage(this.perfStage - 1);
          this.perfEscalateTimer = 0;
          return;
        }
      } else {
        this.perfEscalateTimer = 0;
      }
    }

    if (this.perfStage < 2) return; // stage 1 must get a chance to help
    let changed = false;
    if (struggling && this.pixelScale > 0.55) {
      this.pixelScale = Math.max(0.55, this.pixelScale * 0.85);
      changed = true;
    } else if (healthy && this.pixelScale < this.pixelCap) {
      this.pixelScale = Math.min(this.pixelCap, this.pixelScale * 1.12);
      changed = true;
    }
    if (changed) {
      this.renderer.setPixelRatio(this.pixelScale);
      this.onResize();
    }
  }

  /**
   * Move between adaptive performance stages. Stage 0 is the tier's own
   * settings, stage 1 drops light shafts and quarters the bloom, stage 2
   * additionally unlocks framebuffer scaling. Leaving stage 2 puts the
   * resolution back at the tier's cap first, so a recovering device never
   * sits at a reduced pixel ratio with the stage already walked back.
   */
  setPerfStage(stage) {
    stage = Math.max(0, Math.min(2, stage));
    if (stage === this.perfStage) return;
    const leavingStageTwo = this.perfStage === 2 && stage < 2;
    this.perfStage = stage;
    if (leavingStageTwo && this.pixelScale < this.pixelCap) {
      this.pixelScale = this.pixelCap;
      this.renderer.setPixelRatio(this.pixelScale);
    }
    if (stage >= 1) {
      this.postStrengths = { ...(this.postStrengths || {}), shafts: 0 };
    } else {
      const q = this.settings.resolveQuality();
      this.postStrengths = {
        ao: q === 'low' ? 0 : q === 'medium' ? 0.85 : 1,
        shafts: this.resolveShaftStrength(q)
      };
    }
    this.onResize(); // re-applies the stage's bloom size
  }

  /* ---------------- Settings ---------------- */

  /** Fresh depth attachment for a composer render target (see applyQuality). */
  makeDepthTexture() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const d = new THREE.DepthTexture(size.width, size.height, THREE.UnsignedIntType);
    d.format = THREE.DepthFormat;
    d.minFilter = THREE.NearestFilter;
    d.magFilter = THREE.NearestFilter;
    return d;
  }

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
    // Interface mode (U1.2): 'minimal' keeps the parchment rolled up by
    // default and the markers quiet; 'guided' keeps the classic overlay.
    this.ui.setHudMode(v.hudMode || 'minimal');
    this.applyQuality();
  }

  applyQuality() {
    const q = this.settings.resolveQuality();
    const dpr = window.devicePixelRatio || 1;
    const cap = q === 'low' ? 1.0 : q === 'medium' ? 1.25 : Math.min(dpr, 1.75);
    this.renderer.setPixelRatio(Math.min(dpr, cap));
    // The adaptive-resolution loop walks pixelScale back up to pixelCap, so
    // the cap has to follow the tier or low/medium drift back to full res.
    this.pixelCap = Math.min(dpr, cap);
    this.pixelScale = this.renderer.getPixelRatio();
    // Picking a tier by hand restarts the adaptive ladder from the top: the
    // stage reached under the old tier says nothing about this one. This has
    // to precede onResize(), which sizes bloom from the current stage.
    this.perfStage = 0;
    this.perfLowSamples = 0;
    this.perfEscalateTimer = 0;
    this.onResize();

    // MSAA on the composer target: 4x only on the high tier. Medium keeps
    // the half-res bloom + FXAA-free look but drops the per-tile memory and
    // resolve cost that 4x MSAA adds on integrated/mobile GPUs.
    //
    // Mutating .samples on the live targets and disposing them in place
    // corrupts the depth attachments (observed as a lost WebGL context and a
    // white screen), so the ping-pong targets are rebuilt from scratch at the
    // new sample count instead.
    const samples = q === 'high' ? 4 : 0;
    if (this.composer.renderTarget1.samples !== samples) {
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      // Each buffer gets its OWN depth attachment. Sharing one DepthTexture
      // across the ping-pong pair makes the pass that samples readBuffer's
      // depth while drawing into writeBuffer a framebuffer feedback loop, and
      // the driver drops those draws — the scene renders black under the GUI.
      const rtOpts = { samples, type: THREE.HalfFloatType };
      const rt1 = new THREE.WebGLRenderTarget(size.width, size.height,
        { ...rtOpts, depthTexture: this.makeDepthTexture() });
      const rt2 = new THREE.WebGLRenderTarget(size.width, size.height,
        { ...rtOpts, depthTexture: this.makeDepthTexture() });
      const old1 = this.composer.renderTarget1;
      const old2 = this.composer.renderTarget2;
      this.composer.renderTarget1 = rt1;
      this.composer.renderTarget2 = rt2;
      this.composer.writeBuffer = rt1;
      this.composer.readBuffer = rt2;
      old1.dispose();
      old2.dispose();
    }

    // 4096 shadow maps only for high tier on a desktop discrete GPU; every
    // other device caps at 2048 (low: 1024).
    const shadowSize = q === 'low' ? 1024 : q === 'medium' ? 2048 : (isDiscreteGPU() ? 4096 : 2048);
    if (this.sky.sun.shadow.mapSize.x !== shadowSize) {
      this.sky.sun.shadow.mapSize.set(shadowSize, shadowSize);
      if (this.sky.sun.shadow.map) {
        this.sky.sun.shadow.map.dispose();
        this.sky.sun.shadow.map = null;
      }
    }
    // Low/medium refresh the shadow map every other frame — the sun and the
    // cat move slowly enough that the one-frame lag is invisible.
    this.shadowCadence = q === 'high' ? 1 : 2;
    this.sky.sun.shadow.autoUpdate = false;
    this.sky.sun.shadow.needsUpdate = true;

    // Sub-0.35 m props stop casting shadows on low: their shadow cost is
    // pure overdraw at 1024px and their absence is unnoticeable.
    this.applySmallPropShadows(q !== 'low');

    this.bloom.enabled = q !== 'low';
    // Screen-space AO and light shafts scale with the tier; low keeps only
    // the cheap height fog.
    this.aoPass.enabled = q !== 'low';
    this.aoPass.setSamples(q === 'high' ? 14 : 8);
    this.postStrengths = {
      ao: q === 'low' ? 0 : q === 'medium' ? 0.85 : 1,
      shafts: this.resolveShaftStrength(q)
    };
    this.gradePass.uniforms.uFringe.value = q === 'high' ? 0.0012 : 0.0;

    // Environment re-bake interval. The bake is a cube render plus a mip
    // chain; on a phone that is a visible hitch, and the sky palette moves
    // slowly enough over a 60-minute day that a longer gap is invisible.
    this.sky.envInterval = q === 'low' ? 60 : q === 'medium' ? 40 : 25;

    // Canopy shader detail: the low tier drops the two finest noise octaves.
    setFoliageDetail(q === 'low');

    // Density levers: grass blades, particle counts, lantern point lights.
    if (this.vegetation) {
      this.vegetation.setDensity(q === 'low' ? 0.5 : q === 'medium' ? 0.75 : 1.0);
    }
    if (this.particles) {
      this.particles.setBudget(q === 'low' ? 0.5 : q === 'medium' ? 0.75 : 1.0);
    }
    if (this.city) {
      this.city.lanternLightCount = q === 'low' ? 2 : 4;
      // Resize the pool now: the count is the number of lights that exist,
      // not the number that are turned up.
      if (this.city.lanternLights) this.city.ensureLanternPool();
    }
  }

  /**
   * Light-shaft strength for a quality tier. The shafts are a 22-step screen
   * march, which is too heavy for any mobile tier, so phones lose them at
   * medium as well as low.
   */
  resolveShaftStrength(q) {
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (q === 'low' || (mobile && q === 'medium')) return 0;
    return q === 'medium' ? 0.7 : 1;
  }

  /**
   * Toggle castShadow for small props (bounding sphere < 0.35 m). The base
   * state is remembered on first traversal so re-enabling restores exactly
   * what the builders set.
   */
  applySmallPropShadows(enabled) {
    if (!this._propShadowCache) this._propShadowCache = new Map();
    this.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      if (o.userData._baseCastShadow === undefined) {
        o.userData._baseCastShadow = o.castShadow;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        o.userData._propRadius = o.geometry.boundingSphere
          ? o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z)
          : Infinity;
      }
      if (o.userData._propRadius < 0.35) {
        o.castShadow = enabled ? o.userData._baseCastShadow : false;
      }
    });
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
    // The reset reload fires pagehide/visibilitychange — don't let them
    // write a fresh save that would resurrect the cleared position.
    this.saveSuspended = true;
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
    // Discovery-based compass (U1.1): with hints off, a POI only appears
    // once the cat has actually been near it. With hints on, everything
    // the quest logic cares about stays visible. (Runs once during
    // construction, before the settings manager exists.)
    const hintsOn = !!(this.settings && this.settings.values && this.settings.values.hints);
    const p = this.player.mesh.position;
    const checkDiscover = (id, pos, d2 = 225) => {
      if (this.discoveredPois.has(id)) return true;
      if (p.distanceToSquared(pos) < d2) {
        this.discoveredPois.add(id);
        return true;
      }
      return false;
    };
    const pois = [
      { icon: '🐱', pos: this.luna.mesh.position },
      { icon: '🍡', pos: this.mochi.mesh.position },
      { icon: '⚫', pos: this.kuro.mesh.position }
    ];
    const pushIfVisible = (id, icon, pos) => {
      if (hintsOn || checkDiscover(id, pos)) pois.push({ icon, pos });
    };
    pushIfVisible('door', '🏮', this.doorPos);
    pushIfVisible('bamboo', '🎋', this._bambooPoi || (this._bambooPoi = new THREE.Vector3(30, 0, -20)));
    if (this.city.secretKeyMesh && this.city.secretKeyMesh.visible) {
      pushIfVisible('key', '🔑', this.city.secretKeyMesh.position);
    }
    if (this.city.nestFeatherMesh && this.city.nestFeatherMesh.visible) {
      pushIfVisible('nest', '🪶', this.city.nestPos);
    }
    if (this.city.corralRewardMesh && this.city.corralRewardMesh.visible) {
      pushIfVisible('corral', '🐢', this.city.corralRewardMesh.position);
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

  /** Record a journal discovery once; returns true when it was new. */
  discover(section, entry) {
    if (!section || !entry || !entry.id) return false;
    const list = this.journal[section] || (this.journal[section] = []);
    if (list.some((e) => e.id === entry.id)) return false;
    list.push({ ...entry, at: Date.now() });
    this.saveGame();
    return true;
  }

  loadGame() {
    const data = this.saveManager.load();
    if (!data) return;

    const p = this.player;
    // Exact position — but never trust one that disagrees with the last
    // safe grounded position by much (mid-air autosave, S1.5).
    let spawnX = Number.isFinite(data.x) ? data.x : 0;
    let spawnY = Number.isFinite(data.y) ? data.y : 0;
    let spawnZ = Number.isFinite(data.z) ? data.z : 0;
    if (Number.isFinite(data.safeX) && Math.abs((data.y || 0) - (data.safeY || 0)) > 0.45) {
      spawnX = data.safeX; spawnY = data.safeY; spawnZ = data.safeZ;
    }
    p.mesh.position.set(spawnX, spawnY, spawnZ);
    p.heading = data.heading || 0;
    p.yaw = data.yaw || 0;
    p.yawPrev = data.yaw || 0;
    p.mesh.rotation.y = p.heading;

    this.score = data.score || 0;
    this.collectedIds = new Set(data.collected || []);

    this.progression.load({ xp: data.xp || 0, rank: data.rank || 0 });
    // Rank-4 cosmetic identity (C2.1/C2.4) restores with the save.
    if (this.progression.rank >= 4 && p.cat.setMasterCat) p.cat.setMasterCat();

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

    // Journal + world flags + interaction memories (S2 integration)
    if (data.journal) this.journal = { ...this.journal, ...data.journal };
    if (data.worldFlags) {
      if (data.worldFlags.mistCharm) this.city.mistAltarTouched = true;
    }
    if (Array.isArray(data.restVisited)) {
      this.contextActions.visitedSpots = new Set(data.restVisited);
    }
    if (Array.isArray(data.slowBlinked)) {
      this.contextActions.slowBlinked = new Set(data.slowBlinked);
    }
    if (Array.isArray(data.gifted)) {
      this.contextActions.gifted = new Set(data.gifted);
    }

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
    const p = this.player;
    // Never persist an interior or mid-transition position as the spawn
    // (S1.5): the tea house reloads outside its front door.
    let px = p.mesh.position.x, py = p.mesh.position.y, pz = p.mesh.position.z;
    if (this.interior.isInside || this.interior.isTransitioning) {
      const spawn = this.city.secretDoorSpawnPos;
      px = spawn ? spawn.x : 20; py = 0; pz = spawn ? spawn.z : 14.5;
    }
    const safe = this.safePos || { x: px, y: py, z: pz };
    const collected = [...this.collectedIds];
    const data = {
      x: px,
      y: py,
      z: pz,
      safeX: safe.x,
      safeY: safe.y,
      safeZ: safe.z,
      heading: p.heading,
      yaw: p.yaw,
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
      freshWaterAchievement: this.freshWaterAchievement,
      journal: this.journal,
      worldFlags: {
        mistCharm: !!this.city.mistAltarTouched
      },
      restVisited: [...(this.contextActions.visitedSpots || [])],
      slowBlinked: [...(this.contextActions.slowBlinked || [])],
      gifted: [...(this.contextActions.gifted || [])]
    };
    this.saveManager.save(data);
  }

  /* ---------------- Frame loop ---------------- */

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    // composer.setSize() resets every pass to full resolution — put bloom
    // back at its reduced size (quarter while adaptive stage 1 is active).
    // composer.setSize() takes CSS pixels and scales passes by the pixel
    // ratio internally; bloom.setSize() does not, so the ratio has to be
    // applied here or the bloom's share of the framebuffer drifts with DPR.
    const bf = this.perfStage >= 1 ? 4 : 2;
    const dpr = this.renderer.getPixelRatio();
    this.bloom.setSize(window.innerWidth * dpr / bf, window.innerHeight * dpr / bf);
  }

  update(dt) {
    const playing = this.menu.isPlaying;

    // Rest cinematics own the camera while they last (G1.1).
    this.player.cameraPaused = !!(this.contextActions.rest && playing);

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

      // Save on interior/area transitions (S1.3) — the door wipe hides it.
      if (insideNow !== this._insideSaved) {
        this._insideSaved = insideNow;
        this.saveGame();
      }

      this.saveTimer -= dt;
      if (this.saveTimer <= 0) {
        this.saveTimer = 30; // debounced autosave (S1.2)
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

    // World simulation always runs (living background on title screen) —
    // except while inside the tea house, where the valley is invisible and
    // the room only needs its own lights. Sky keeps ticking so the dome and
    // weather stay continuous for the windows.
    const inside = this.interior.isInside;
    // Last-known-safe spawn: only record grounded, outdoor, dry paws (S1.5).
    if (playing && !inside && !this.interior.isTransitioning && this.player.isGrounded && !this.player.inWater) {
      const p = this.player.mesh.position;
      this.safePos = { x: p.x, y: p.y, z: p.z };
    }
    this.sky.envPaused = inside;
    this.sky.setInteriorShadowMode(inside);
    // Only one set of lights is ever in play: the room's two, or the
    // valley's lanterns. Every visible light is evaluated in every lit
    // fragment, so the half that cannot be seen is switched off outright.
    this.interior.setLightsActive(inside);
    if (inside) {
      this.city.suspendLanternLights();
    } else {
      this.city.update(dt, this.player.mesh.position, this.sky);
    }
    this.sky.update(dt, this.player.mesh.position);
    this.atmosphere.updateFromSky(this.sky, this.camera, this.postStrengths || { ao: 1, shafts: 1 });
    // Golden-hour rim light on the cat follows the sun palette (C1.11: the
    // already-resolved frame palette, never a second resolvePalette pass).
    {
      const pal = this.sky.currentPalette;
      catRimUniforms.uRimColor.value.copy(pal.warm || pal.sun);
      catRimUniforms.uRimDir.value.copy(this.sky.sunDir);
      const sunY = Math.max(0, this.sky.sunDir.y);
      const golden = Math.min(1, Math.max(0, (0.42 - sunY) / 0.42)) * Math.min(1, sunY / 0.06);
      catRimUniforms.uRimStrength.value = 0.14 + golden * 0.7;
    }
    // Title-screen performance mode (A3.2): on touch devices the living
    // background updates at half frequency while nobody is playing.
    const onTitle = this.menu.mode === 'title';
    if (onTitle && this.isTouchDevice()) this._titleTick = !this._titleTick;
    if (!inside && !(onTitle && this._titleTick)) {
      this.vegetation.update(dt, this.player.mesh.position, this.sky);
      this.particles.update(dt, this.player.mesh.position, this.sky);
      this.ambientLife.update(dt, this.player.mesh.position, this.sky, this.player.cat, this.player, this.city);
    }
    // Scent gating (U1.4): the trail only flows near things worth finding.
    this.scent.gated = playing && this.computeScentGate();
    this.scent.update(dt, this.player.mesh.position, playing ? this.player.currentSpeed : 0);
    this.audio.setWeatherTransition(this.sky.getWeatherTransition());
    this.audio.updateListener(this.camera);
    for (const n of this.npcs) n.update(dt, this.player.mesh.position, this.camera, this.sky);

    // Weather memories (G2.3): the first time each weather is experienced
    // while playing, it becomes a keepsake memory.
    if (playing && this.sky.weatherBlend > 0.9 && this.sky.weather !== this._lastWeatherSeen) {
      this._lastWeatherSeen = this.sky.weather;
      const text = {
        clear: 'Clear skies — the whole valley stretched out in sunlight.',
        cloudy: 'Cloud-shadows drifted across the rice paddies like slow fish.',
        rain: 'You watched the rain embroider the river silver.',
        mist: 'Mist folded the valley into secrets and soft edges.',
        snow: 'Snow hushed the rooftops and wrote your pawprints down.'
      }[this.sky.weather];
      if (text) this.discover('weatherMemories', { id: `weather-${this.sky.weather}`, text });
    }

    // Music follows the day cycle; ducks during pause/dialogue; muted/cozier
    // inside the Tea House than out in the open valley. Guarded in case an
    // older hot-swapped/exported music.js predates setScene().
    this.music.update(this.sky.dayTime);
    this.music.setDucked(!playing || this.dialogue.active);
    if (this.music.setScene) this.music.setScene(inside ? 'Tea House' : 'Overworld');
    if (this.music.updateSwell) this.music.updateSwell(dt);

    this.ui.setTimeWeather(this.formatTime(this.sky.dayTime), this.capitalise(this.sky.weather));
    this.ui.setInventory(this.city.hasSecretKey, this.city.nestInteracted);

    // Photo mode camera takeover
    if (this.photoMode && playing) {
      this.updatePhotoCamera(dt);
    }

    // Rest & watch cinematic (G1.1): slow orbit drift around the sitting cat
    if (this.contextActions.rest && playing) {
      const r = this.contextActions.rest;
      const p = this.player.mesh.position;
      this._restYaw = (this._restYaw || 0) + dt * 0.18;
      const rad = 4.2;
      const target = this._restCamTarget || (this._restCamTarget = new THREE.Vector3());
      target.set(
        p.x + Math.sin(this._restYaw) * rad,
        p.y + 1.9,
        p.z + Math.cos(this._restYaw) * rad
      );
      this.camera.position.lerp(target, Math.min(1, dt * 1.4));
      const look = this._restCamLook || (this._restCamLook = new THREE.Vector3());
      look.set(p.x, p.y + 0.45, p.z);
      this.camera.lookAt(look);
    }

    // Title screen cinematic orbit camera
    if (onTitle) {
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

    // Objective markers + compass (playing only). Discovery-based markers
    // (U1.1): waypoint arrows only guide when the hints toggle is ON; the
    // compass keeps POIs but only those already discovered (or all, when
    // hints are on).
    if (playing) {
      if (this.settings.values.hints) {
        this.updateWaypointTargets();
      } else if (this.waypoints.targets.length) {
        this.waypoints.setTargets([]);
      }
      this.waypoints.update(this.player.mesh.position);
      this.camera.getWorldDirection(this._camDir || (this._camDir = new THREE.Vector3()));
      this.compass.update(this.camera.position, this._camDir);
      this.poiRefreshTimer -= dt;
      if (this.poiRefreshTimer <= 0) {
        this.poiRefreshTimer = 2;
        this.refreshCompassPois();
      }
    }

    // Startup calibration probe (A1.4): measure title-screen fps once,
    // ignore shader-compile time, and lower the starting tier if needed.
    this.updateStartupProbe(dt);

    const debug = `Pos      ${this.player.mesh.position.x.toFixed(1)}, ${this.player.mesh.position.y.toFixed(1)}, ${this.player.mesh.position.z.toFixed(1)}
Time     ${this.formatTime(this.sky.dayTime)} · ${this.sky.weather}
Quality  ${this.settings.resolveQuality()}`;
    this.ui.update(dt, this.score, debug);
  }

  isTouchDevice() {
    if (this._isTouch === undefined) {
      this._isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
        window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    }
    return this._isTouch;
  }

  /**
   * Scent gate (U1.4): true when the cat is near something the trail could
   * meaningfully point at — quest yarn, NPCs, the tea-house door, rest spots.
   */
  computeScentGate() {
    const p = this.player.mesh.position;
    const c = this.city;
    if (this.quest.active && this.quest.active.type === 'yarn') {
      for (const y of this.collectibles) {
        if (y.position.distanceToSquared(p) < 196) return true; // 14 m
      }
    }
    for (const n of this.npcs) {
      if (n.mesh.position.distanceToSquared(p) < 100) return true;
    }
    if (this.doorPos.distanceToSquared(p) < 144) return true;
    if (c.secretKeyMesh && c.secretKeyMesh.visible && c.secretKeyPos.distanceToSquared(p) < 144) return true;
    for (const spot of this.contextActions.restSpots) {
      if (spot.pos.distanceToSquared(p) < 100) return true;
    }
    return false;
  }

  /**
   * Startup calibration probe (A1.4). Samples title-screen fps after the
   * shader-compile window has passed, and if the median is poor, lowers the
   * starting tier once. Cached per game version — a probe never raises a
   * tier, because thermal throttling usually arrives later.
   */
  updateStartupProbe(dt) {
    if (this._probeDone) return;
    // The probe measures the title scene; once the player is in the valley
    // their experience is the real measurement.
    if (this.menu.mode !== 'title') { this._probeDone = true; return; }
    this._probeTime = (this._probeTime || 0) + dt;
    // Ignore the first ~4 s: shader compilation dominates frame time there.
    if (this._probeTime < 4) return;
    this._probeSampleTimer = (this._probeSampleTimer || 0) + dt;
    if (this._probeSampleTimer < 0.5) return;
    this._probeSampleTimer = 0;
    this._probeSamples = this._probeSamples || [];
    this._probeSamples.push(this.ui.fps);
    if (this._probeSamples.length < 8) return;
    this._probeDone = true;
    const sorted = [...this._probeSamples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median >= 34) return; // healthy — leave the tier alone
    const q = this.settings.values.quality;
    const target = q === 'high' ? 'medium' : 'low';
    this.settings.set('quality', target);
    this.applyQuality();
    this.ui.showToast('Graphics adjusted for this device for a smoother stroll.');
    try { localStorage.setItem('catwalk_probe_v1', JSON.stringify({ v: 1, tier: target })); } catch (e) {}
  }

  formatTime(dayTime) {
    const h = Math.floor(dayTime);
    const m = Math.floor((dayTime - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------------- Discovery journal (G1.4) ---------------- */

  buildJournalUI() {
    const overlay = document.getElementById('journal-overlay');
    const closeBtn = document.getElementById('btn-journal-close');
    if (!overlay || !closeBtn) return;
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
    const hudBtn = document.getElementById('journal-btn');
    if (hudBtn) {
      hudBtn.addEventListener('click', () => this.toggleJournal());
    }
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyJ' && this.menu.isPlaying) {
        e.preventDefault();
        this.toggleJournal();
      }
    });
  }

  toggleJournal() {
    const overlay = document.getElementById('journal-overlay');
    if (!overlay) return;
    if (!overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      return;
    }
    this.refreshJournal();
    overlay.classList.remove('hidden');
  }

  refreshJournal() {
    const body = document.getElementById('journal-body');
    if (!body) return;
    const j = this.journal;
    const section = (title, entries, emptyText) => {
      const rows = entries.length
        ? entries.map((e) => `<div style="padding:4px 0 4px 12px;color:#4a3524;">· ${e.text}</div>`).join('')
        : `<div style="padding:4px 0 4px 12px;color:#9a8368;font-style:italic;">· ${emptyText}</div>`;
      return `<div style="margin-top:10px;"><strong style="color:#7c4c28;letter-spacing:0.5px;">${title}</strong>${rows}</div>`;
    };
    const cats = this.npcs.filter((n) => n.hasGreeted).map((n) => ({
      id: n.name, text: `${n.name}${n.giftedYarn ? ' — keeps your yarn gift' : n.slowBlinks ? ' — trusts your slow blink' : ' — a friend of the valley'}`
    }));
    body.innerHTML =
      section('🐱 Cats Met', cats, 'The cats of the valley have not introduced themselves yet.') +
      section('⛰ Places Discovered', j.places, 'The valley is still largely a blank page.') +
      section('✨ Quiet Moments', j.quietMoments, 'Sit still somewhere beautiful, and see what finds you.') +
      section('🌦 Weather Memories', j.weatherMemories, 'Every kind of sky leaves its own memory.') +
      section('🎁 Keepsakes', j.keepsakes, 'Nothing found and kept yet.') +
      section('📸 Photo Album', j.photos, 'No photographs taken at memorable spots yet.');
  }

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

  /** Weather-reactive lines for Mochi (N2.4). */
  getMochiDialogue() {
    const w = this.sky.weather;
    if (w === 'rain') {
      return [
        'Nyaa~ my fur is all damp! The eaves make the best umbrella.',
        'Listen to the rain on the roof tiles — plink, plonk, plink!'
      ];
    }
    if (w === 'mist') {
      return [
        'The bamboo disappears into the mist… like it is playing hide and seek!',
        'Careful where you step — the whole valley is whispering today.'
      ];
    }
    if (w === 'snow') {
      return [
        'Snow! Cold on the paws, but so, so pretty.',
        'Want to leave pawprints side by side? Mine are the small round ones!'
      ];
    }
    const night = this.sky.sunDir && this.sky.sunDir.y < -0.02;
    if (night) {
      return [
        'The bamboo sounds different at night… all hush-hush and crick-crick.',
        'Luna said she’d be at the old bridge if you’re looking for her.'
      ];
    }
    return this.mochi.dialogue;
  }

  /** Weather-reactive lines for Kuro (N2.4) + the mist-altar hook (G1.6). */
  getKuroDialogue() {
    // Bell hunt (N1.1) — offered once Luna's yarn hunt is done.
    if (this.quest.hasPendingReward('bell')) {
      return [
        '…The bells are quiet again. Bokuchi is pleased.',
        'Take this. The forest will hum where you walk — he asked me to say that exactly.'
      ];
    }
    if (!this.quest.active && !this.quest.hasCompleted('bell') && this.quest.hasCompleted('yarn')) {
      return [
        '…You found Luna’s yarn. So you are the one.',
        'A forest spirit I know — Bokuchi — hid five offering bells in this valley when he grew tired of being thanked only by the wind.',
        'Find them for me, and I will make sure he notices you.'
      ];
    }
    if (this.quest.active && this.quest.active.type === 'bell') {
      const remaining = Math.max(0, this.quest.active.target - this.quest.active.current);
      return remaining === 0
        ? ['…That is all five. Bring their silence back to me.']
        : [`…${remaining} bell${remaining === 1 ? '' : 's'} still ring where the valley tucked them away.`];
    }
    const w = this.sky.weather;
    if (w === 'mist') {
      if (this.city.mistAltarTouched) {
        return [
          '…You found the altar. The spirits speak of you now.',
          'The mist only shows itself to those who wait. You waited.'
        ];
      }
      return [
        '…The mist is thick. The red gates are awake.',
        'Walk past the shrine when the veil is heaviest. Something old is listening.'
      ];
    }
    if (w === 'rain') {
      return [
        '…Rain. The river swells and tells older stories.',
        'I do not mind it. The sound is… honest.'
      ];
    }
    if (w === 'snow') {
      return [
        '…Snow silences even the river’s gossip.',
        'Walk softly. The valley is sleeping under this.'
      ];
    }
    const night = this.sky.sunDir && this.sky.sunDir.y < -0.02;
    if (night) {
      return [
        '…The moon is full of old cats’ promises.',
        'Come back when the mist rolls in. I will show you something.'
      ];
    }
    return this.kuro.dialogue;
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
      this.quest.start({ name: "Luna's Yarn Hunt", type: 'yarn', target: 3, giver: 'Luna' });
    }
  }

  /** Kuro's turn-in: Bokuchi's Offering Bells quest start / reward (N1.1). */
  finishKuroDialogue() {
    if (this.quest.hasPendingReward('bell')) {
      const reward = this.quest.claimReward('bell');
      if (reward) {
        this.ui.showToast('✦ Bokuchi’s Blessing — the forest hums softly wherever you walk ✦', 4200);
        if (this.audio) this.audio.playDreamChime();
        this.music.swell(6);
        this.progression.addXP(50, 'Bokuchi’s Blessing');
        this.discover('keepsakes', { id: 'bokuchi-blessing', text: 'Bokuchi’s Blessing — the forest spirit’s quiet thanks' });
        this.saveGame();
      }
      return;
    }
    if (!this.quest.active && !this.quest.hasCompleted('bell') && this.quest.hasCompleted('yarn')) {
      this.quest.start({ name: "Bokuchi's Offering Bells", type: 'bell', target: 5, giver: 'Kuro' });
      this.ui.showToast('Five offering bells hide in the valley — listen for the shimmer.', 3600);
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
      // Offering bells answer only the bell hunt (N1.1).
      if (item.userData.isOfferingBell &&
          !(this.quest.active && this.quest.active.type === 'bell') &&
          !this.quest.hasCompleted('bell')) continue;
      if (item.position.distanceTo(pos) < 1.0) {
        this.scene.remove(item);
        this.collectibles.splice(i, 1);
        this.score++;
        if (item.userData.id != null) this.collectedIds.add(item.userData.id);
        if (this.audio) this.audio.playCollect();
        if (item.userData.isOfferingBell) {
          // Bokuchi's offering bell — a soft chime for the forest spirit
          this.quest.onCollect('bell');
          this.progression.addXP(10, 'Offering bell found');
          if (this.audio) this.audio.playBell();
          this.ui.showToast('🔔 An offering bell rings softly for Bokuchi.');
          this.saveGame();
        } else if (item.userData.isCharm) {
          // Golden Dango Charm — grants XP + temporary speed buff
          this.progression.addXP(50, 'Golden Dango Charm found!');
          this.ui.showToast('✦ Golden Dango Charm! Speed blessed by the river spirit ✦');
          this.player.speedBuffTimer = 20;
          if (this.audio) this.audio.playBell();
          this.discover('keepsakes', { id: 'golden-dango', text: 'Golden Dango Charm — a river spirit’s sweet blessing' });
        } else if (item.userData.isCorralReward) {
          this.city.setCorralRewardCollected(true);
          this.player.canWalkFences = true;
          this.progression.addXP(75, 'Claimed the Jade Paw from the turtle corral');
          this.ui.showToast('✦ Jade Paw claimed! Larry taught you to balance on fence tops! ✦');
          this.player.cat.setMood('playful', 1.8, 2);
          if (this.audio) this.audio.playKeyChime();
          this.discover('keepsakes', { id: 'jade-paw', text: 'Jade Paw — Larry the turtle’s fence-walking secret' });
          this.saveGame();
        } else {
          this.progression.addXP(10, 'Yarn collected');
          this.quest.onCollect('yarn');
        }
      }
    }
  }

  /**
   * Frame pacing (A1.3 eco/thermal governor + A3.2 title mode): when the
   * device sustains <30 fps, cap requestAnimationFrame cadence at ~30 fps
   * before any further quality drop — keeps long sessions cool. The title
   * screen on touch devices also caps at 30 fps (nothing is at stake there).
   */
  updateFrameGovernor(dt) {
    this._govTimer = (this._govTimer || 0) + dt;
    if (this._govTimer < 2) return;
    this._govTimer = 0;
    const fps = this.ui.fps;

    if (this.menu.mode === 'title' && this.isTouchDevice()) {
      this.frameFloor = 1 / 30; // A3.2: cool title screen on touch devices
      this._titleCapped = true;
      return;
    }
    // Leaving the title clears any title cap; the eco governor re-applies a
    // cap only under sustained struggle.
    if (this._titleCapped) {
      this._titleCapped = false;
      this.frameFloor = 0;
    }

    if (fps > 0 && fps < 30) {
      this._ecoLow = (this._ecoLow || 0) + 1;
      // Three consecutive slow windows (~6 s) of sustained struggle → cap.
      if (this._ecoLow >= 3) this.frameFloor = 1 / 30;
    } else if (fps > 45) {
      this._ecoLow = 0;
      if (this.frameFloor) this.frameFloor = 0;
    }
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.updateFrameGovernor(dt);
    // Frame cadence cap: skip this frame's simulation + render entirely.
    // dt stays real elapsed time, so the world simulation stays in real
    // time — only the presentation rate is limited.
    if (this.frameFloor > 0) {
      this._frameAccum = (this._frameAccum || 0) + dt;
      if (this._frameAccum < this.frameFloor) return;
      this._frameAccum = 0;
    }
    if (!this.menu.isPausedLike()) {
      this.update(dt);
      this.updateAdaptiveResolution(dt);
    }
    this.gradePass.uniforms.uTime.value = this.clock.elapsedTime;
    // Shadow map refreshes on a tier-driven cadence; the sun and cat move
    // slowly enough that a one-frame-old map is indistinguishable. Indoors
    // (A3.1) the valley is out of sight — the room's sun shadow is only
    // refreshed on the transition itself (setInteriorShadowMode).
    if (!this.interior.isInside && ++this._shadowFrame >= this.shadowCadence) {
      this._shadowFrame = 0;
      this.sky.sun.shadow.needsUpdate = true;
    }
    this.composer.render();
    // First frame is on screen: dissolve the soft-focus boot image away.
    if (!this._bootDissolved) {
      this._bootDissolved = true;
      const boot = document.getElementById('boot-screen');
      if (boot) {
        boot.classList.add('dissolve');
        setTimeout(() => boot.remove(), 900);
      }
    }
    if (this.captureRequested) {
      this.captureRequested = false;
      this.capturePhoto();
    }
  }
}

const game = new Game();
window.game = game;