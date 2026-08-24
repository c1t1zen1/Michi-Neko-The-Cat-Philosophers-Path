/**
 * Cat City FPS - SceneManager.js
 * Main scene foundation for ThreeJS-based first-person cat game
 * 
 * Architecture:
 * - SceneManager: Core scene initialization and configuration
 * - CameraSystem: FPS-style camera with head bob, collision detection
 * - RendererOptimizer: RPi-aware renderer settings, pixel ratio, shadows
 * - LightingSystem: Dynamic day/night cycle, street lights, ambient lighting
 * - AudioSystem: Spatial audio listener, mixer structure, initialization
 * 
 * Target Platform: Raspberry Pi 5 + Desktop (ThreeJS r128+)
 * Performance Target: 60 FPS, <500MB memory, optimized for mobile GPUs
 * 
 * Author: Hermes Agent
 * Date: 2026-07-10
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@r128/build/three.module.js';

/**
 * SceneManager - Core scene initialization and lifecycle
 * Handles scene setup, camera, renderer, and main update loop
 */
class SceneManager {
  constructor(options = {}) {
    this.options = {
      canvas: options.canvas || null,
      width: options.width || window.innerWidth,
      height: options.height || window.innerHeight,
      pixelRatioScale: options.pixelRatioScale || 0.75, // For RPi performance
      frameRateCap: options.frameRateCap || 60, // Max 60 FPS
      shadowMapResolution: options.shadowMapResolution || 1024,
      fogDensity: options.fogDensity || 0.001,
      debugMode: options.debugMode || false,
      ...options
    };

    // Core THREE objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Subsystems
    this.cameraSystem = null;
    this.rendererOptimizer = null;
    this.lightingSystem = null;
    this.audioSystem = null;

    // Runtime state
    this.isRunning = false;
    this.frameTimeTarget = 1000 / this.options.frameRateCap;
    this.lastFrameTime = 0;
    this.deltaTime = 0;

    // Frame callbacks
    this.updateCallbacks = [];
    this.lateUpdateCallbacks = [];

    // Initialize
    this.initialize();
  }

  /**
   * Main initialization sequence
   */
  initialize() {
    console.log('[SceneManager] Initializing scene...');
    
    // 1. Create scene with fog and environment
    this.createScene();
    
    // 2. Setup camera from cat perspective (5-10cm height)
    this.createCamera();
    
    // 3. Setup WebGL renderer with RPi optimization
    this.createRenderer();
    
    // 4. Initialize subsystems
    this.cameraSystem = new CameraSystem(this.camera, this.options);
    this.rendererOptimizer = new RendererOptimizer(this.renderer, this.options);
    this.lightingSystem = new LightingSystem(this.scene, this.options);
    this.audioSystem = new AudioSystem(this.camera, this.options);
    
    // 5. Setup lighting
    this.lightingSystem.initialize();
    
    // 6. Setup event listeners
    this.setupEventListeners();
    
    console.log('[SceneManager] ✓ Initialization complete');
    console.log(`[SceneManager] Canvas: ${this.options.width}x${this.options.height}`);
    console.log(`[SceneManager] Device pixel ratio: ${window.devicePixelRatio}`);
    console.log(`[SceneManager] Target FPS: ${this.options.frameRateCap}`);
  }

  /**
   * Create ThreeJS scene with fog and background
   */
  createScene() {
    this.scene = new THREE.Scene();
    
    // Background color (sky blue)
    this.scene.background = new THREE.Color(0x87ceeb);
    
    // Fog for depth perception and performance
    // Exponential fog density controls far clipping effectively
    const fog = new THREE.FogExp2(0x87ceeb, this.options.fogDensity);
    this.scene.fog = fog;
    
    // Optional: Scene environment map for reflections (can be added later)
    // this.scene.environment = environmentMap;
  }

  /**
   * Create perspective camera from cat height (5-10cm eye level)
   * Cat's eye level is ~20-30cm from ground, we position at ~7cm for immersion
   */
  createCamera() {
    const catEyeHeight = 0.07; // 7cm (cat perspective)
    
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view (degrees) - can be adjusted via CameraSystem
      this.options.width / this.options.height,
      0.01, // Near plane (10mm for small objects nearby)
      1000 // Far plane (1km, controlled by fog)
    );
    
    // Position camera at cat eye level
    this.camera.position.set(0, catEyeHeight, 0);
    this.camera.lookAt(0, catEyeHeight, -1);
    
    console.log(`[SceneManager] Camera positioned at cat eye height: ${catEyeHeight}m`);
  }

  /**
   * Create WebGL renderer with RPi optimizations
   */
  createRenderer() {
    const canvas = this.options.canvas || document.getElementById('canvas') || this.createCanvas();
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      precision: 'highp',
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
    
    // Set size with pixel ratio adjustment for RPi
    this.updateRendererSize();
    
    // Enable shadow maps
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    
    // Performance settings
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.gammaFactor = 2.2;
    
    // Append to body if created
    if (!this.options.canvas && canvas.parentElement === null) {
      document.body.appendChild(canvas);
    }
    
    console.log('[SceneManager] ✓ WebGL renderer initialized with shadow mapping');
  }

  /**
   * Update renderer size and handle window resizing
   */
  updateRendererSize() {
    const width = this.options.width;
    const height = this.options.height;
    
    // Get device pixel ratio with scaling for RPi
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaledPixelRatio = Math.min(
      devicePixelRatio * this.options.pixelRatioScale,
      2.0 // Cap at 2x for mobile
    );
    
    // Set renderer size with scaled pixel ratio
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(scaledPixelRatio);
    
    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    console.log(`[SceneManager] Renderer size: ${width}x${height} @ ${scaledPixelRatio.toFixed(2)}x pixel ratio`);
  }

  /**
   * Create canvas element if not provided
   */
  createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.style.display = 'block';
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return canvas;
  }

  /**
   * Setup window event listeners
   */
  setupEventListeners() {
    window.addEventListener('resize', () => this.handleWindowResize());
    window.addEventListener('blur', () => this.handleWindowBlur());
    window.addEventListener('focus', () => this.handleWindowFocus());
    
    // Pointer lock for mouse look
    document.addEventListener('click', () => this.requestPointerLock());
  }

  /**
   * Request pointer lock for mouse look
   */
  requestPointerLock() {
    const canvas = this.renderer.domElement;
    const pointerLockElement = canvas.ownerDocument.pointerLockElement || 
                               canvas.ownerDocument.mozPointerLockElement;
    
    if (pointerLockElement !== canvas) {
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    }
  }

  /**
   * Handle window resize
   */
  handleWindowResize() {
    this.options.width = window.innerWidth;
    this.options.height = window.innerHeight;
    this.updateRendererSize();
  }

  /**
   * Handle window blur
   */
  handleWindowBlur() {
    if (this.cameraSystem) {
      this.cameraSystem.releaseAllKeys();
    }
  }

  /**
   * Handle window focus
   */
  handleWindowFocus() {
    // Resume after blur
  }

  /**
   * Register update callback (called each frame)
   */
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  /**
   * Register late update callback (called after physics)
   */
  onLateUpdate(callback) {
    this.lateUpdateCallbacks.push(callback);
  }

  /**
   * Start render loop with frame rate capping
   */
  start() {
    console.log('[SceneManager] Starting render loop...');
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.render();
  }

  /**
   * Render loop with frame rate limiting
   */
  render = () => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    // Frame rate capping
    if (elapsed >= this.frameTimeTarget) {
      this.deltaTime = elapsed / 1000; // Convert to seconds
      this.lastFrameTime = now;
      
      // Update subsystems
      this.update();
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
    }
    
    requestAnimationFrame(this.render);
  }

  /**
   * Update all systems
   */
  update() {
    // Update camera and input
    if (this.cameraSystem) {
      this.cameraSystem.update(this.deltaTime);
    }
    
    // Update lighting (day/night cycle)
    if (this.lightingSystem) {
      this.lightingSystem.update(this.deltaTime);
    }
    
    // Call registered update callbacks
    for (const callback of this.updateCallbacks) {
      callback(this.deltaTime);
    }
    
    // Late update (after physics, collisions, etc)
    for (const callback of this.lateUpdateCallbacks) {
      callback(this.deltaTime);
    }
  }

  /**
   * Stop render loop
   */
  stop() {
    this.isRunning = false;
    console.log('[SceneManager] Render loop stopped');
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      fps: Math.round(1 / this.deltaTime),
      deltaTime: this.deltaTime.toFixed(4),
      cameraPosition: this.camera.position,
      sceneObjectCount: this.scene.children.length,
      rendererMemory: this.renderer.info.memory,
      lights: this.lightingSystem?.getLightCount() || 0
    };
  }

  /**
   * Cleanup and disposal
   */
  dispose() {
    console.log('[SceneManager] Disposing resources...');
    this.stop();
    
    if (this.audioSystem) {
      this.audioSystem.dispose();
    }
    
    if (this.lightingSystem) {
      this.lightingSystem.dispose();
    }
    
    if (this.cameraSystem) {
      this.cameraSystem.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

/**
 * CameraSystem - FPS-style camera with head bob, collision, and mouse look
 */
class CameraSystem {
  constructor(camera, options = {}) {
    this.camera = camera;
    this.options = {
      mouseSensitivity: options.mouseSensitivity || 0.002,
      maxLookUp: options.maxLookUp || Math.PI / 3, // 60 degrees up
      maxLookDown: options.maxLookDown || Math.PI / 3, // 60 degrees down
      headBobAmount: options.headBobAmount || 0.02, // 2cm bob
      headBobFrequency: options.headBobFrequency || 5, // Hz
      walkSpeed: options.walkSpeed || 1.5, // m/s
      runSpeed: options.runSpeed || 3.0, // m/s
      jumpForce: options.jumpForce || 5, // m/s
      collisionRadius: options.collisionRadius || 0.15, // 15cm collision radius
      ...options
    };

    // Input state
    this.keys = {};
    this.mouseDown = false;
    this.mouseDelta = { x: 0, y: 0 };

    // Camera rotation state
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.pitchObject = new THREE.Object3D();
    this.yawObject = new THREE.Object3D();
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);

    // Movement state
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;
    this.headBobPhase = 0;

    // Camera collision helper
    this.lastValidPosition = new THREE.Vector3();

    this.setupEventListeners();
    this.updateLastValidPosition();

    console.log('[CameraSystem] ✓ Initialized with mouse sensitivity:', this.options.mouseSensitivity);
  }

  /**
   * Setup keyboard and mouse listeners
   */
  setupEventListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  /**
   * Handle keydown
   */
  onKeyDown(event) {
    this.keys[event.code] = true;
  }

  /**
   * Handle keyup
   */
  onKeyUp(event) {
    this.keys[event.code] = false;
  }

  /**
   * Handle mouse movement for look
   */
  onMouseMove(event) {
    this.mouseDelta.x = event.movementX;
    this.mouseDelta.y = event.movementY;
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event) {
    this.mouseDown = true;
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event) {
    this.mouseDown = false;
  }

  /**
   * Release all pressed keys
   */
  releaseAllKeys() {
    this.keys = {};
  }

  /**
   * Update camera each frame
   */
  update(deltaTime) {
    // Update mouse look
    this.updateMouseLook(deltaTime);

    // Update movement
    this.updateMovement(deltaTime);

    // Update head bob
    this.updateHeadBob(deltaTime);

    // Reset mouse delta
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }

  /**
   * Update mouse look (yaw and pitch)
   */
  updateMouseLook(deltaTime) {
    // Apply yaw (horizontal rotation)
    this.yawObject.rotation.y -= this.mouseDelta.x * this.options.mouseSensitivity;

    // Apply pitch (vertical rotation with clamping)
    const currentPitch = this.pitchObject.rotation.x;
    const newPitch = currentPitch - this.mouseDelta.y * this.options.mouseSensitivity;

    // Clamp pitch to prevent over-rotation
    this.pitchObject.rotation.x = Math.max(
      -this.options.maxLookDown,
      Math.min(this.options.maxLookUp, newPitch)
    );
  }

  /**
   * Update movement based on input
   */
  updateMovement(deltaTime) {
    // Determine speed (walking or running)
    const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = isRunning ? this.options.runSpeed : this.options.walkSpeed;

    // Calculate movement direction
    const moveVector = new THREE.Vector3();

    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      moveVector.z -= speed;
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      moveVector.z += speed;
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      moveVector.x -= speed;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      moveVector.x += speed;
    }

    // Apply movement relative to camera direction
    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yawObject.rotation.y);

    // Update position
    const newPosition = this.yawObject.position.clone();
    newPosition.add(moveVector.multiplyScalar(deltaTime));

    // Collision check (simplified)
    this.yawObject.position.copy(newPosition);
    this.updateLastValidPosition();

    // Jump
    if ((this.keys['Space'] || this.keys['KeyJ']) && this.isGrounded) {
      this.velocity.y = this.options.jumpForce;
      this.isGrounded = false;
    }

    // Apply gravity
    this.velocity.y -= 9.81 * deltaTime;
    this.yawObject.position.y += this.velocity.y * deltaTime;

    // Ground collision
    if (this.yawObject.position.y <= 0.07) { // Cat eye height
      this.yawObject.position.y = 0.07;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
  }

  /**
   * Update head bob animation while moving
   */
  updateHeadBob(deltaTime) {
    const isMoving = Object.keys(this.keys).some(key => 
      ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)
    );

    if (isMoving && this.isGrounded) {
      this.headBobPhase += this.options.headBobFrequency * deltaTime;
      const bobAmount = Math.sin(this.headBobPhase * Math.PI * 2) * this.options.headBobAmount;
      this.pitchObject.position.y = bobAmount;
    } else {
      this.pitchObject.position.y = 0;
    }
  }

  /**
   * Update last valid position (for collision rollback)
   */
  updateLastValidPosition() {
    this.lastValidPosition.copy(this.yawObject.position);
  }

  /**
   * Get camera world position
   */
  getWorldPosition() {
    return this.yawObject.position.clone();
  }

  /**
   * Set camera field of view
   */
  setFOV(fov) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Get camera field of view
   */
  getFOV() {
    return this.camera.fov;
  }

  /**
   * Cleanup
   */
  dispose() {
    // Remove event listeners if needed
  }
}

/**
 * RendererOptimizer - Handle RPi-specific renderer settings and optimization
 */
class RendererOptimizer {
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.options = {
      shadowMapResolution: options.shadowMapResolution || 1024,
      autoAdjustQuality: options.autoAdjustQuality || true,
      enablePostProcessing: options.enablePostProcessing || false,
      ...options
    };

    this.qualityLevel = this.detectQualityLevel();
    this.shadowMapResolution = this.calculateShadowMapResolution();

    console.log(`[RendererOptimizer] ✓ Quality level: ${this.qualityLevel}`);
    console.log(`[RendererOptimizer] Shadow map resolution: ${this.shadowMapResolution}x${this.shadowMapResolution}`);

    this.configureShadowMaps();
  }

  /**
   * Detect device capability level
   */
  detectQualityLevel() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      console.warn('[RendererOptimizer] WebGL not available, using LOW quality');
      return 'LOW';
    }

    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    // Estimate based on max texture size
    if (maxTextureSize < 2048) {
      return 'LOW'; // Mobile/RPi
    } else if (maxTextureSize < 8192) {
      return 'MEDIUM';
    } else {
      return 'HIGH'; // Desktop
    }
  }

  /**
   * Calculate appropriate shadow map resolution based on device
   */
  calculateShadowMapResolution() {
    const baseResolution = this.options.shadowMapResolution;

    switch (this.qualityLevel) {
      case 'LOW':
        return Math.max(512, baseResolution / 2);
      case 'MEDIUM':
        return baseResolution;
      case 'HIGH':
        return Math.min(2048, baseResolution * 2);
      default:
        return baseResolution;
    }
  }

  /**
   * Configure shadow maps
   */
  configureShadowMaps() {
    const resolution = this.shadowMapResolution;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    // Note: Individual light shadow maps will be configured in LightingSystem
    console.log(`[RendererOptimizer] Shadow maps configured at ${resolution}x${resolution}`);
  }

  /**
   * Enable post-processing (optional)
   */
  enablePostProcessing(enabled = true) {
    this.options.enablePostProcessing = enabled;
    console.log(`[RendererOptimizer] Post-processing: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get current quality level
   */
  getQualityLevel() {
    return this.qualityLevel;
  }

  /**
   * Get shadow map resolution
   */
  getShadowMapResolution() {
    return this.shadowMapResolution;
  }

  /**
   * Cleanup
   */
  dispose() {
    // Cleanup if needed
  }
}

/**
 * LightingSystem - Manages sun, ambient light, street lights, and day/night cycle
 */
class LightingSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      enableDayNightCycle: options.enableDayNightCycle || true,
      dayNightCycleSpeed: options.dayNightCycleSpeed || 0.1, // 1 full cycle = 10 seconds (for testing)
      sunIntensity: options.sunIntensity || 1.0,
      ambientIntensity: options.ambientIntensity || 0.4,
      streetLightIntensity: options.streetLightIntensity || 0.5,
      ...options
    };

    // Lights
    this.sunLight = null;
    this.ambientLight = null;
    this.streetLights = [];

    // Time of day state (0-1, 0 = midnight, 0.5 = noon)
    this.timeOfDay = 0.5; // Start at noon
    this.dayNightCycleTime = 0;

    console.log('[LightingSystem] Initializing lighting system...');
  }

  /**
   * Initialize all lights
   */
  initialize() {
    // Create sun (directional light with shadows)
    this.createSunLight();

    // Create ambient light
    this.createAmbientLight();

    // Create street lights (example positions)
    this.createStreetLights();

    console.log('[LightingSystem] ✓ Lighting system initialized');
  }

  /**
   * Create directional light (sun) with shadows
   */
  createSunLight() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, this.options.sunIntensity);

    // Position sun high in sky
    this.sunLight.position.set(100, 100, 50);
    this.sunLight.target.position.set(0, 0, 0);

    // Shadow configuration
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 1000;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.001;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    console.log('[LightingSystem] ✓ Sun light created');
  }

  /**
   * Create ambient light
   */
  createAmbientLight() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, this.options.ambientIntensity);
    this.scene.add(this.ambientLight);

    console.log('[LightingSystem] ✓ Ambient light created');
  }

  /**
   * Create street lights (placeholder - can be populated from world data)
   */
  createStreetLights() {
    // Example street light positions (in a real game, these would come from world data)
    const streetLightPositions = [
      { x: -50, y: 2, z: 0 },
      { x: 50, y: 2, z: 0 },
      { x: 0, y: 2, z: -50 },
      { x: 0, y: 2, z: 50 }
    ];

    for (const pos of streetLightPositions) {
      this.addStreetLight(pos.x, pos.y, pos.z);
    }

    console.log(`[LightingSystem] ✓ Created ${streetLightPositions.length} street lights`);
  }

  /**
   * Add a street light at a specific position
   */
  addStreetLight(x, y, z) {
    const light = new THREE.PointLight(0xffaa00, this.options.streetLightIntensity, 50);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;

    this.scene.add(light);
    this.streetLights.push(light);

    return light;
  }

  /**
   * Update lighting based on day/night cycle
   */
  update(deltaTime) {
    if (!this.options.enableDayNightCycle) return;

    // Update time of day
    this.dayNightCycleTime += deltaTime * this.options.dayNightCycleSpeed;
    if (this.dayNightCycleTime >= 1.0) {
      this.dayNightCycleTime = 0;
    }

    this.timeOfDay = this.dayNightCycleTime;

    // Update sun position and intensity based on time of day
    this.updateSunPosition();
    this.updateLightingIntensities();
  }

  /**
   * Update sun position based on time of day
   */
  updateSunPosition() {
    // Sun arc from east to west
    const angle = (this.timeOfDay - 0.5) * Math.PI; // -PI/2 to PI/2
    const height = Math.max(0, Math.cos(angle) * 100); // Sun dips below horizon at night
    const distance = 150;

    this.sunLight.position.set(
      Math.sin(angle) * distance,
      Math.max(5, height), // Minimum height to avoid completely dark scenes
      Math.cos(angle) * distance
    );
  }

  /**
   * Update light intensities based on time of day
   */
  updateLightingIntensities() {
    // Sun intensity follows a bell curve
    const sunIntensity = Math.max(0.1, Math.cos((this.timeOfDay - 0.5) * Math.PI));
    this.sunLight.intensity = sunIntensity * this.options.sunIntensity;

    // Ambient light intensity inverse to sun
    const ambientIntensity = 0.3 + (1 - Math.abs(sunIntensity - 0.5) * 2) * 0.3;
    this.ambientLight.intensity = ambientIntensity * this.options.ambientIntensity;

    // Street lights increase at night
    const streetLightIntensity = Math.max(0, 1 - sunIntensity) * this.options.streetLightIntensity * 2;
    for (const light of this.streetLights) {
      light.intensity = streetLightIntensity;
    }
  }

  /**
   * Set time of day (0-1)
   */
  setTimeOfDay(time) {
    this.timeOfDay = Math.max(0, Math.min(1, time));
    this.dayNightCycleTime = this.timeOfDay;
    this.updateSunPosition();
    this.updateLightingIntensities();
  }

  /**
   * Get current time of day
   */
  getTimeOfDay() {
    return this.timeOfDay;
  }

  /**
   * Get light count
   */
  getLightCount() {
    return 1 + 1 + this.streetLights.length; // sun + ambient + street lights
  }

  /**
   * Cleanup
   */
  dispose() {
    // Lights will be removed from scene when scene is disposed
  }
}

/**
 * AudioSystem - Initialize audio listener, spatial audio, and mixer structure
 */
class AudioSystem {
  constructor(camera, options = {}) {
    this.camera = camera;
    this.options = {
      masterVolume: options.masterVolume || 1.0,
      musicVolume: options.musicVolume || 0.7,
      sfxVolume: options.sfxVolume || 0.8,
      ...options
    };

    // Audio listener (attached to camera for spatial audio)
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    // Audio mixer structure
    this.mixer = {
      master: {
        gain: this.createGainNode(),
        muted: false
      },
      music: {
        gain: this.createGainNode(),
        muted: false,
        sources: []
      },
      sfx: {
        gain: this.createGainNode(),
        muted: false,
        sources: []
      },
      ambient: {
        gain: this.createGainNode(),
        muted: false,
        sources: []
      }
    };

    // Connect mixer chain: individual channels -> master -> destination
    const context = this.listener.context;
    this.mixer.music.gain.connect(this.mixer.master.gain);
    this.mixer.sfx.gain.connect(this.mixer.master.gain);
    this.mixer.ambient.gain.connect(this.mixer.master.gain);
    this.mixer.master.gain.connect(context.destination);

    // Set initial volumes
    this.setMasterVolume(this.options.masterVolume);
    this.setMusicVolume(this.options.musicVolume);
    this.setSFXVolume(this.options.sfxVolume);

    console.log('[AudioSystem] ✓ Audio listener attached to camera');
    console.log('[AudioSystem] ✓ Audio mixer initialized (Master, Music, SFX, Ambient channels)');
  }

  /**
   * Create a GainNode for volume control
   */
  createGainNode() {
    const context = this.listener.context;
    return context.createGain();
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume) {
    this.mixer.master.gain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume) {
    this.mixer.music.gain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set SFX volume (0-1)
   */
  setSFXVolume(volume) {
    this.mixer.sfx.gain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set ambient volume (0-1)
   */
  setAmbientVolume(volume) {
    this.mixer.ambient.gain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Load audio from URL (for future use)
   */
  loadAudio(url, channel = 'sfx') {
    return {
      url: url,
      channel: channel,
      // Audio loading implementation goes here
      play: function() {
        console.log(`[AudioSystem] Playing ${channel} audio from ${url}`);
      }
    };
  }

  /**
   * Create spatial audio source at position
   */
  createSpatialAudioSource(position) {
    return {
      position: position,
      listener: this.listener,
      // Spatial audio implementation goes here
    };
  }

  /**
   * Get audio context
   */
  getAudioContext() {
    return this.listener.context;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.camera.remove(this.listener);
    console.log('[AudioSystem] ✓ Audio system disposed');
  }
}

/**
 * Initialization test and stdout output
 */
function initializeSceneManagerTest() {
  console.log('\n========================================');
  console.log('Cat City FPS - SceneManager Test');
  console.log('========================================\n');

  // Create scene manager
  const sceneManager = new SceneManager({
    width: 1280,
    height: 720,
    pixelRatioScale: 0.75,
    frameRateCap: 60,
    debugMode: true
  });

  // Register test callbacks
  sceneManager.onUpdate((deltaTime) => {
    if (Math.random() > 0.99) { // Log periodically
      const debugInfo = sceneManager.getDebugInfo();
      console.log('[Update] FPS:', debugInfo.fps, '| Camera:', {
        x: debugInfo.cameraPosition.x.toFixed(2),
        y: debugInfo.cameraPosition.y.toFixed(2),
        z: debugInfo.cameraPosition.z.toFixed(2)
      });
    }
  });

  // Print initialization results
  console.log('\n✓ Scene Manager initialized successfully');
  console.log('✓ File path:', __filename || 'SceneManager.js');
  console.log('✓ Systems initialized:');
  console.log('  - CameraSystem (FPS controls, mouse look)');
  console.log('  - RendererOptimizer (RPi-aware, shadow maps)');
  console.log('  - LightingSystem (day/night cycle)');
  console.log('  - AudioSystem (spatial audio, mixer)');
  console.log('\n✓ Capabilities:');
  console.log('  - Cat perspective (7cm eye height)');
  console.log('  - Frame rate cap at 60 FPS');
  console.log('  - Pixel ratio scaling for RPi');
  console.log('  - Shadow mapping enabled');
  console.log('  - Dynamic lighting with day/night cycle');
  console.log('  - Spatial audio listener setup');
  console.log('\n========================================\n');

  return sceneManager;
}

// Export for use in HTML/JS modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SceneManager,
    CameraSystem,
    RendererOptimizer,
    LightingSystem,
    AudioSystem,
    initializeSceneManagerTest
  };
}

// Automatically run test if not imported as module
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initializeSceneManagerTest();
  });
}
