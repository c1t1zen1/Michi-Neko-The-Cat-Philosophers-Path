# Cat City FPS - Technical Architecture Document

**Project:** First-Person Cat Game in ThreeJS  
**Target Platform:** Raspberry Pi 4/5 (WebGL with fallback to software rendering)  
**Engine:** ThreeJS 3D rendering + Cannon-es physics  
**Deployment:** Standalone HTML5 web application  
**Version:** 1.0 Architecture  
**Date:** 2026-07-10

---

## Executive Summary

Cat City FPS is a browser-based first-person game where players experience a procedurally-generated urban environment from a cat's perspective (approximately 20-30cm ground height). The architecture balances visual fidelity with performance constraints on Raspberry Pi hardware, targeting 30-60 FPS through aggressive optimization patterns observed in modern FPS engines (Doom, Halo, Quake3, Source).

**Key Architectural Principles:**
- **Frame-time budgets over raw feature count** (16.6ms @ 60 FPS, 33ms @ 30 FPS fallback)
- **Entity-Component-System (ECS) for decoupled game logic**
- **Spatial chunking for streaming and culling**
- **Worker thread offloading for physics and asset decoding**
- **Graceful degradation tiers** for low-end hardware

---

## 1. GAME ENGINE ARCHITECTURE (ThreeJS)

### 1.1 Scene Management

The core rendering pipeline uses ThreeJS's hierarchical scene graph with custom culling and LOD systems:

```javascript
// Core Scene Structure
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 2000)

// Camera positioned at cat eye level (~25cm from ground)
camera.position.y = 0.25 // meters
camera.up.set(0, 1, 0)   // Y-up coordinate system

// Layered rendering for organization
const layers = {
  world: 0,       // Static geometry, buildings, streets
  dynamic: 1,     // NPCs, interactive objects
  ui: 2,          // HUD overlays
  debug: 3        // Debug visualizations
}
```

**Scene Optimization Strategy:**
- **Frustum Culling:** Built-in ThreeJS frustum culling enabled by default (`frustumCulled: true`)
- **Spatial Partitioning:** Octree-based chunking for visibility determination
- **LOD System:** Multi-level detail switching at distance thresholds
- **Instanced Rendering:** `InstancedMesh` for repeated objects (trees, lamp posts, benches, NPCs)

### 1.2 Renderer Configuration

```javascript
const renderer = new THREE.WebGLRenderer({
  antialias: false,           // Disabled on mobile for performance
  powerPreference: 'high-performance',
  alpha: false,               // Opaque render target
  preserveDrawingBuffer: false // Discard frame immediately after render
})

// Target 60 FPS on desktop, 30 FPS fallback on RPi
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = false // Disabled on RPi, enabled on desktop only
renderer.shadowMap.type = THREE.PCFShadowShadowMap
```

**Performance Targets (Hardware Tiers):**
| Tier | Device | Target FPS | Draw Calls | Triangles | Texture MB |
|------|--------|-----------|-----------|-----------|-----------|
| Low | RPi 4 (1GB) | 30 | <200 | <100K | 64 |
| Medium | RPi 5 / Modern Laptop | 60 | <500 | <500K | 256 |
| High | Desktop GPU | 60 | <1000 | <2M | 512 |

### 1.3 Asset Loading Strategy

**Two-Phase Loading:**

1. **Preload Critical Assets** (Game startup)
   - Player controller mesh and animations
   - Ground/terrain geometry
   - First neighborhood chunk
   - Audio buffers for immediate feedback

2. **Streaming Load** (During gameplay)
   - Distant chunks load asynchronously
   - LOD models queue behind high-priority assets
   - Textures decode in Web Worker to avoid main-thread blocking
   - Memory budget enforced: dispose distant LODs when over 400MB

```javascript
// Asset manager with priority queuing
class AssetManager {
  queue = {
    critical: [],  // Player model, first chunk
    visible: [],   // Currently visible chunks
    predicted: [], // Next 2-3 predicted chunks
    decorative: [] // Distant LODs, post-processing
  }
  
  // LRU eviction on memory pressure
  maxMemory = 400 * 1024 * 1024 // 400 MB
  loadAsset(url, priority) { /* ... */ }
  evictDistantLODs() { /* ... */ }
}
```

**Compression Formats:**
- **Geometry:** glTF 2.0 with Draco mesh compression (4-6x reduction)
- **Textures:** KTX2 with Basis Universal (BC7 desktop, ASTC mobile) - 4-6x VRAM reduction
- **Models:** GLB binary format with embedded textures for fast loading

---

## 2. SYSTEMS ARCHITECTURE

### 2.1 Movement System

**Cat Physics Perspective:** Movement physics scaled to cat proportions, emphasizing:
- Low center of gravity (cat spine bends near ground)
- Quick acceleration/deceleration (cat reflexes)
- Jumping mechanics (cats climb, pounce, navigate obstacles)
- Stamina system (brief sprints, recovery)

```javascript
class PlayerMovement {
  // Physics parameters for cat-scale world
  groundDrag = 0.12        // Air resistance
  groundAccel = 25         // Quick acceleration
  jumpPower = 8            // Vertical impulse
  sprintMultiplier = 1.5   // Run vs. walk
  stamina = 100
  staminaRecoverRate = 20  // Points/sec
  sprintDrainRate = 30     // Points/sec
  
  groundCollisionDetection() {
    // Raycast down from camera position
    // Detect ground contact for jump state
  }
  
  handleInput(keys, deltaTime) {
    if (keys.W) velocity.z -= groundAccel * deltaTime
    if (keys.S) velocity.z += groundAccel * deltaTime
    if (keys.A) velocity.x -= groundAccel * deltaTime
    if (keys.D) velocity.x += groundAccel * deltaTime
    
    // Sprint reduces stamina, boosts speed
    if (keys.Shift && stamina > 0) {
      velocity.multiplyScalar(sprintMultiplier)
      stamina -= sprintDrainRate * deltaTime
    }
  }
  
  jump() {
    if (isGrounded) {
      velocity.y += jumpPower
      isGrounded = false
    }
  }
}
```

**Input Handling:**
- **Desktop:** WASD movement, mouse look (PointerLock API), spacebar jump, Shift sprint
- **Mobile:** Dual-stick virtual joysticks or tilt-to-look

### 2.2 Physics System

**Engine Selection: Cannon-es** (pmndrs maintained fork of cannon.js)

**Rationale:**
- Pure JavaScript, ~50KB bundle (vs. Ammo.js 800KB WASM overhead)
- Adequate for <300 dynamic bodies in real-time
- Sufficient for cat NPC AI and interactive objects
- Better determinism than Rapier for networked play
- Integration proven on production Three.js sites

```javascript
import * as CANNON from 'cannon-es'

const world = new CANNON.World()
world.gravity.set(0, -10, 0)        // Earth gravity scaled to cat size
world.broadphase = new CANNON.NaiveBroadphase()
world.solver.iterations = 3         // Trade accuracy for speed
world.solver.tolerance = 0.001

// Fixed timestep simulation (60 Hz physics, decoupled from render)
const fixedTimeStep = 1/60
const maxSubSteps = 3
let lastTime = performance.now()

function physicsTick(currentTime) {
  const dt = (currentTime - lastTime) / 1000
  world.step(fixedTimeStep, dt, maxSubSteps)
  lastTime = currentTime
}
```

**Physics Bodies:**
- **Player:** Capsule collider (height ~0.25m, radius ~0.1m)
- **NPCs:** Sphere colliders for simplified collision
- **Static Geometry:** Trimesh colliders for building meshes
- **Dynamic Objects:** Box/sphere bodies for knockable items

**Offload Strategy:** Physics simulation runs in Web Worker to prevent main-thread blocking on large scenes (100+ bodies).

### 2.3 AI & NPC System

**Behavior Architecture:** Behavior-tree-based decision making inspired by Halo/Source engine scheduling.

```javascript
class NPCCat {
  state = 'idle'  // idle, walking, running, attacking, socializing
  schedule = []   // Queue of tasks
  
  // Behavior tree structure
  getBehavior() {
    return {
      name: 'dailyRoutine',
      children: [
        { selector: 'findThing', behaviors: ['patrol', 'hunt', 'rest'] },
        { sequence: 'approach', behaviors: ['navigate', 'investigate'] },
        { task: 'interact', duration: 5000 }
      ]
    }
  }
  
  update(deltaTime) {
    // Process current task in schedule
    if (!this.currentTask) this.selectNextTask()
    
    this.currentTask.execute(deltaTime)
    
    if (this.currentTask.isComplete()) {
      this.schedule.shift()
    }
  }
  
  // Pathfinding uses NavMesh computed offline or procedurally
  pathfind(target) {
    // A* search on navigation mesh
    return this.navmesh.findPath(this.position, target)
  }
}
```

**NPC Types:**
- **Street Cats:** Patrol, hunt, interact with environment, socialize
- **House Cats:** Appear in windows, rooftops, alleys
- **Wild Cats:** More aggressive, avoid player
- **Stray Groups:** Travel in packs, defensive behavior

**Population Scaling:**
- **High-end:** 50+ concurrent NPCs with full AI
- **Medium:** 20-30 NPCs with simplified behavior
- **Low-end (RPi):** 5-10 NPCs, behavior LOD applied

### 2.4 Audio System

```javascript
class AudioManager {
  // Audio tracks by context
  ambient = [
    'wind.ogg', 'distant_cars.ogg', 'bird_sounds.ogg'
  ]
  
  sfx = {
    meow: { volume: 0.5, pitch: [0.8, 1.2] },
    purr: { volume: 0.3, pitch: 1.0 },
    jump: { volume: 0.4 },
    land: { volume: 0.3 },
    scratch: { volume: 0.6 }
  }
  
  // Spatial audio: position sound in 3D space
  playSFX(type, position) {
    const sound = new THREE.PositionalAudio(audioListener)
    sound.position.copy(position)
    sound.setVolume(this.sfx[type].volume)
    scene.add(sound)
  }
  
  // Adaptive audio: mute distant sounds
  update(playerPos) {
    this.activeSounds.forEach(sound => {
      const distance = playerPos.distanceTo(sound.position)
      sound.setVolume(this.calculateVolume(distance))
      if (distance > 100) sound.stop()
    })
  }
}
```

**Audio Priority:**
1. Player feedback (meows, purrs, jumps) - always audible
2. Nearby NPCs and events - distance-based volume
3. Ambient sounds - fade in/out with distance
4. Music - low priority, can pause during load

### 2.5 Save/Load System

**Lightweight State Serialization:**

```javascript
class SaveSystem {
  // Only save gameplay-critical state
  saveGame() {
    return {
      playerPos: camera.position,
      playerRot: camera.rotation,
      playedChunks: Array.from(visibleChunks.keys()),
      npcStates: this.serializeNPCs(),
      timestamp: Date.now()
    }
  }
  
  loadGame(save) {
    // Restore player position
    camera.position.copy(save.playerPos)
    
    // Regenerate world from seed for determinism
    // Only restore NPC positions/states
    // Chunk geometry regenerates procedurally
  }
  
  // Local storage fallback (IndexedDB for larger saves)
  storage = new IDBKeyval('catcity-saves')
}
```

### 2.6 Procedural Generation Pipeline

**Terrain & City Layout:**

```javascript
class ProceduralCityGenerator {
  // Deterministic seeding for consistent worlds
  seed = 42
  noise = new PerlinNoise(this.seed)
  
  generateChunk(chunkX, chunkZ) {
    // Fractal Brownian Motion for natural variation
    const heightMap = this.fbm(chunkX, chunkZ, octaves=4, persistence=0.5)
    
    // Street network: path subdivision
    const streets = this.generateStreets(chunkX, chunkZ)
    
    // Building placement: constraint satisfaction
    const buildings = this.placeBuildings(streets, heightMap)
    
    // Vegetation: stochastic placement
    const trees = this.scatterTrees(heightMap, buildings)
    
    return { terrain, streets, buildings, trees }
  }
  
  // Asset selection based on noise
  selectBuildingType(noise) {
    if (noise < 0.3) return 'rowhouse'
    if (noise < 0.6) return 'apartment'
    if (noise < 0.8) return 'villa'
    return 'church'
  }
}
```

**Chunk System:**
- **Chunk Size:** 100m × 100m (cat-scale world, ~400 city blocks per side)
- **Streaming Distance:** 400m (load 2 chunks ahead)
- **Memory Budget:** Max 12 chunks in memory (1.2 × 1.2 km²)

---

## 3. TECHNOLOGY STACK

### 3.1 Core Libraries

| Component | Library | Version | Rationale |
|-----------|---------|---------|-----------|
| **Rendering** | Three.js | r155+ | Industry standard, optimized WebGL abstraction |
| **Physics** | Cannon-es | 0.20+ | Lightweight JS physics, deterministic solver |
| **Input** | Native DOM/Pointer API | - | No dependency overhead |
| **Audio** | Web Audio API | - | Built-in spatial audio support |
| **Procedural Gen** | Perlin-noise | 4.0+ | Deterministic noise for world generation |
| **Math** | Three.js Vector3/Matrix4 | Built-in | No external dependency |
| **Storage** | IndexedDB + localStorage | Native | No extra libraries |

### 3.2 WebGL Extensions & Capabilities

**Required:**
- WebGL 2.0 (fallback to 1.0 with degraded features)
- `EXT_color_buffer_float` - HDR rendering
- `EXT_disjoint_timer_query_webgl2` - GPU timing for profiling
- `WEBGL_draw_buffers` - MRT for deferred rendering (future)

**Optional (Desktop only):**
- `EXT_texture_compression_s3tc` - DXT textures
- `WEBGL_compressed_texture_etc` - ETC textures (mobile)

**Hardware Capabilities Probing:**

```javascript
function getDeviceProfile() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  
  return {
    maxTextures: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxDrawCalls: gl.getParameter(gl.MAX_DRAW_BUFFERS),
    hasFloatTextures: !!gl.getExtension('EXT_color_buffer_float'),
    hasGPUTiming: !!gl.getExtension('EXT_disjoint_timer_query_webgl2')
  }
}

// Assign performance tier based on capabilities
const tier = profile.maxTextures >= 2048 ? 'high' : 'medium' : 'low'
```

### 3.3 Asset Formats

**Models:**
- **Format:** glTF 2.0 (.glb, .gltf)
- **Compression:** Draco mesh codec (4-6x geometry reduction)
- **Tool:** Blender export → gltf-transform → draco-compress

**Textures:**
- **Format:** KTX2 with Basis Universal codec
- **Compression:** BC7 (desktop), ASTC 6x6 (mobile)
- **Mipmaps:** Auto-generated during encoding
- **Tool:** textureatlas → basisu encoder → KTX2 wrapping

**Audio:**
- **Format:** OGG Vorbis (Web Audio native support)
- **Compression:** 128-192 kbps for ambient, 256 kbps for SFX
- **Tool:** FFmpeg encoding

### 3.4 Server-Side Considerations

**Single-Player Mode:** No server required (fully client-side)

**Multiplayer Roadmap (Future):**
- **Architecture:** Client-server with client-side prediction (Quake3/Source pattern)
- **Networking:** WebSockets for commands, UDP-like simulation
- **Sync:** Server maintains authoritative world state, clients predict locally
- **State Exchange:** Sparse updates (delta compression), 60 Hz server tick

```javascript
// Future: Multiplayer state synchronization
class NetworkManager {
  // Snapshot-based network model (Quake3 architecture)
  serverSnapshots = [] // Array of world snapshots @ 60 Hz
  
  // Client-side prediction: move locally, correct on server feedback
  predictClientMovement(input) {
    this.localPlayer.move(input)
  }
  
  // Server snapshot arrives, reconcile with local predictions
  onServerSnapshot(snap) {
    const error = this.localPlayer.position.sub(snap.playerPos)
    if (error.length() > 0.5) {
      // Teleport to server state (or interpolate)
      this.localPlayer.position.copy(snap.playerPos)
    }
  }
}
```

---

## 4. PERFORMANCE TARGETS & OPTIMIZATION STRATEGIES

### 4.1 Frame Budget Analysis

**Target: 60 FPS (16.6ms per frame)**

```
Frame Time Budget:
├─ Input Processing:      1-2 ms (keyboard, mouse)
├─ AI/NPC Updates:        2-4 ms (pathfinding, decisions)
├─ Physics Simulation:    2-3 ms (rigid body solver)
├─ Camera Updates:        1-2 ms (look direction, position)
├─ Asset Streaming:       1-2 ms (queue management, decode)
├─ Culling/Visibility:    2-3 ms (frustum, occlusion)
├─ Renderer Setup:        1-2 ms (state changes, binds)
└─ GPU Rendering:        ~8 ms (draw calls, shading)
───────────────────────────
  TOTAL:                ~16 ms (including GPU wait)
```

**Fallback: 30 FPS (33ms per frame)** - RPi 4 target with reduced draw calls

### 4.2 Draw Call Budget

**Target: <500 draw calls/frame on medium hardware**

Optimization techniques:
1. **Instancing:** All trees, lamp posts, benches → `InstancedMesh` (1 draw call)
2. **Batching:** Merge static geometry by material
3. **Material Atlasing:** Combine 4 textures into single atlas, adjust UVs
4. **LOD Swapping:** Distant buildings use simplified geometry

```javascript
// Example: 100 trees rendered as 1 draw call
const treeGeo = new THREE.BoxGeometry(1, 3, 1)
const treeMaterial = new THREE.MeshStandardMaterial({ map: treeTexture })
const treeInstances = new THREE.InstancedMesh(treeGeo, treeMaterial, 100)

// Set per-instance transforms
for (let i = 0; i < 100; i++) {
  const matrix = new THREE.Matrix4()
  matrix.setPosition(treePositions[i])
  treeInstances.setMatrixAt(i, matrix)
}

scene.add(treeInstances)
// Single draw call for all 100 trees
```

### 4.3 Memory Management

**GPU Memory Targets:**
- **Low-end (RPi 4, 1GB):** 64 MB textures, <100K triangles visible
- **Medium (RPi 5, 2GB):** 256 MB textures, <500K triangles visible
- **High-end (Desktop):** 512 MB textures, <2M triangles visible

**CPU Memory Targets:**
- **Total Footprint:** <400 MB (including JS VM overhead)
- **Scene Graph:** <50 MB (with all loaded chunks)
- **Texture Memory:** <200 MB (compressed formats)
- **Physics Bodies:** <20 MB
- **Audio Buffers:** <50 MB

**Eviction Strategy:**

```javascript
class MemoryManager {
  check() {
    const used = performance.memory?.usedJSHeapSize || 0
    if (used > 350 * 1024 * 1024) {
      // Evict distant LODs
      this.evictFarChunks()
      // Reduce texture resolution
      this.downscaleTextures()
      // Reduce draw distance
      this.reduceDrawDistance()
    }
  }
  
  evictFarChunks() {
    const chunksByDistance = Array.from(chunks.entries())
      .sort((a, b) => a.distance - b.distance)
    
    while (chunks.size > 8) { // Keep 8 chunks max
      const [key, chunk] = chunksByDistance.pop()
      chunk.geometry.dispose()
      chunk.material.dispose()
      chunks.delete(key)
    }
  }
}
```

### 4.4 JavaScript Performance

**GC Pressure Mitigation:**
1. **Object Pooling:** Pre-allocate collision objects, particles
2. **Reusable Vectors:** Cache temporary Vector3/Quaternion instances
3. **Allocation-Free Loop:** Modify in-place instead of creating new objects

```javascript
// BAD: Creates new Vector3 every frame (causes GC pressure)
function updateBad() {
  const newPos = new THREE.Vector3(x, y, z)
  mesh.position.copy(newPos) // <- allocation
}

// GOOD: Reuse existing vector
const tempVec = new THREE.Vector3()
function updateGood() {
  tempVec.set(x, y, z)
  mesh.position.copy(tempVec)
}
```

**Raycasting Optimization:**
- Cache Raycaster instance (expensive creation)
- Batch raycasts per frame (player movement, NPC pathfinding)
- Use Octree spatial index for fast ray queries

---

## 5. SCALABILITY & FUTURE CONSIDERATIONS

### 5.1 NPC Population Scaling

| Hardware Tier | Max Concurrent NPCs | Max Behavior Complexity |
|---------------|-------------------|----------------------|
| Low (RPi 4) | 5-10 | Simplified schedules, no pathfinding |
| Medium (RPi 5) | 20-30 | Full behavior trees, basic pathfinding |
| High (Desktop) | 50+ | Complex behaviors, squad tactics |

**Scaling Approach:**
- **Behavioral LOD:** Distant NPCs on simpler schedules
- **Spatial Partitioning:** Only update NPCs in active chunks
- **Async Pathfinding:** Compute paths in background Worker

### 5.2 Multiplayer Roadmap

**Phase 1 (Current):** Single-player procedurally-generated world

**Phase 2 (Future):** Shared server-side persistent world
- Dedicated Node.js server maintaining world state
- WebSocket transport for low-latency commands
- Delta compression for efficient network usage
- Server-authoritative with client-side prediction

**Phase 3 (Future):** Cross-platform (mobile/desktop)
- Responsive UI for touch and gamepad input
- Reduced quality tiers for mobile GPUs
- Progressive asset loading (visible first, decorative deferred)

### 5.3 Content Streaming System

**Streaming Architecture:**

```
Priority Queues:
├─ CRITICAL (player model, first chunk) - 0s
├─ VISIBLE (active chunks) - 1s
├─ PREDICTED (lookahead 200m) - 2-3s
└─ DECORATIVE (distance assets, post-processing) - 5-10s

Loading Pipeline:
1. Request → 2. Download → 3. Decode (Worker) → 4. Parse → 5. GPU Upload
```

**Bandwidth Optimization:**
- Precompute assets for all procedural variations
- Serve compressed (Brotli) assets from CDN
- Use HTTP/2 multiplexing for parallel downloads
- Cache completed chunks in IndexedDB

---

## 6. ARCHITECTURE PATTERNS (FROM GAME ENGINE ANALYSIS)

### 6.1 Doom/Doom 3 Patterns
- **Binary Space Partitioning (BSP):** Used for level design, replaced by procedural generation in Cat City
- **Sprite-Based Rendering:** Irrelevant (3D WebGL only)
- **Learning:** Modular asset pipeline, clear separation of concerns

### 6.2 Quake 3 Patterns (MOST RELEVANT)
- **Virtual Machine Architecture:** Encapsulate game logic, separate from engine → Implemented as ECS system
- **Snapshot-Based Networking:** Store server state, send deltas to clients → Future multiplayer foundation
- **Client-Side Prediction:** Move locally, reconcile with server → Reduces perceived latency
- **Bot AI with Schedules:** NPC behavior through task queues → Adopted for Cat NPC AI

### 6.3 Source Engine Patterns
- **Client-Server Split:** Authoritative server, predictive client → For multiplayer phase
- **Entity System with Networked DataTables:** All game objects inherit from base entity → Our ECS approach
- **Shared Movement Code:** Both client and server calculate identical physics → Deterministic Cannon.js world stepping

### 6.4 Halo/Destiny Patterns (Tiger Engine)
- **Incremental Architecture Migration:** Replace legacy systems one at a time → Not applicable (greenfield project)
- **Core vs. Feature Layer Distinction:** Tightly-coupled core, loosely-coupled features → Our ECS / component design
- **Cross-Platform Foundation:** Abstract platform differences → Web as platform (responsive design)

### 6.5 Modern Three.js ECS Pattern
- **Entity-Component-System:** Separate data from logic, compose behaviors
- **Web Workers for Heavy Lifting:** Physics, asset decoding, pathfinding offloaded
- **Frustum Culling + LOD:** Automatic visibility management
- **Material Atlasing & Instancing:** Reduce draw calls

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- [ ] SceneManager with camera controller
- [ ] Ground/terrain mesh with collision
- [ ] Player movement (WASD + mouse look)
- [ ] Basic HUD (FPS counter, position display)

### Phase 2: World (Week 2)
- [ ] Procedural chunk generation (terrain, buildings, streets)
- [ ] Asset streaming system
- [ ] Lighting & time-of-day cycle
- [ ] 5+ explorable chunks

### Phase 3: NPCs & Interaction (Week 3)
- [ ] NPC spawning and scheduling
- [ ] Behavior trees for simple AI
- [ ] Knockable objects, interactive elements
- [ ] Sound system with spatial audio

### Phase 4: Polish & Deployment (Week 4)
- [ ] Performance profiling & optimization
- [ ] Quality settings for different hardware
- [ ] Content audit and visual pass
- [ ] Build optimization (minification, compression)
- [ ] Release to itch.io / self-hosted

---

## 8. COMPARATIVE ANALYSIS: EXISTING FPS ENGINES

### ThreeJS FPS (Footprintarts Reference)
**Architecture:** Modular components (camera, lights, world, controls, physics, renderer)
**Strengths:** Proven octree-based collision, animation mixer integration, clean separation of concerns
**Relevance:** Direct reference for movement controller, shooting mechanics (adapt to cat-centric gameplay)

### Custom WebGL Zombie Survival (TypeScript FPS)
**Architecture:** Centralized GameManager coordinating InputManager, EntityManager, Physics
**Strengths:** Hitscan weapon system via raycasting, wave-based spawning with state machines
**Relevance:** State machine patterns for NPC behavior, wave spawning for cat groups

### Quake 3 Snapshot Networking
**Architecture:** 60 Hz server ticks, client-side prediction with reconciliation
**Strengths:** Low-latency gameplay, automatic jitter correction via interpolation
**Relevance:** Foundation for future multiplayer Cat City (currently single-player, but ready to extend)

### Halo's Tiger Engine (Incremental Rewrite)
**Architecture:** New core foundation + legacy compatibility shims
**Strengths:** Multicore/multithreaded design, clear core-vs-feature layer distinction
**Relevance:** Our Worker thread offloading follows this principle (physics/pathfinding in background)

---

## 9. RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| RPi WebGL performance (5-27 FPS observed) | Unplayable on low-end hardware | Aggressive draw call reduction, dynamic resolution, fallback to 30 FPS |
| Physics jitter with 100+ bodies | Unstable NPC behavior | Limit active bodies <50, use simplified colliders, offload to Worker |
| Memory thrashing from continuous streaming | Frame stutters, GC pauses | Precompute procedural chunks, maintain LRU cache, profile heap usage |
| Procedural generation edge cases | Impossible geometry, NPC stuck states | Extensive testing with seed variations, collision mesh post-processing |
| Browser compatibility | Feature parity across devices | Feature detection, graceful degradation, WebGL fallback |
| Player confusion (cat POV unique) | Poor controls, disorienting | Comprehensive tutorial, adjustable camera height, field-of-view presets |

---

## 10. VERIFICATION & TESTING STRATEGY

### Performance Profiling
```javascript
// Frame time counter
const frameTimeGraph = new StatsJS()
frameTimeGraph.track('frame', 'ms')
frameTimeGraph.track('physics', 'ms')
frameTimeGraph.track('render', 'ms')

// GPU timing (if extension available)
const gpuTimer = new GPUTimer(renderer)
gpuTimer.measure('renderPass', () => renderer.render(scene, camera))
```

### Quality Metrics
- **FPS Stability:** p50, p95 frame time over 60-second run
- **Memory:** Peak heap, GC pause frequency
- **Draw Calls:** Per-frame call count breakdown by component
- **Texture Memory:** Reported by `renderer.info.memory`

### Target Benchmarks
- **RPi 4:** 30 FPS sustained, <2 GC pauses/sec
- **RPi 5:** 60 FPS sustained, <1 GC pause/sec
- **Desktop:** 60 FPS locked, <0.5 GC pauses/sec

---

## 11. CONCLUSION

Cat City FPS combines proven patterns from Quake 3 (snapshot architecture), Halo (core-layer design), and modern Three.js (ECS, Workers, streaming) to create a scalable, performant browser-based FPS. The architecture prioritizes frame-time budgets, aggressive culling, and graceful degradation across hardware tiers, enabling smooth gameplay from Raspberry Pi 4 (30 FPS) to modern desktops (60 FPS).

The modular design supports future expansion to multiplayer, mobile platforms, and advanced features (SSAO, particles, shader effects) without restructuring the core engine.

**Next Steps:**
1. Implement core systems from Phase 1 roadmap
2. Profile on target RPi hardware
3. Iterate on performance optimization tiers
4. Conduct playtesting for cat-perspective UX
5. Expand to Phases 2-4 per roadmap

---

**Document Metadata:**
- Status: Complete Architecture Design v1.0
- Review Date: 2026-07-10
- Next Review: Post-Phase-1 Implementation
- Audience: Development team, optimization decisions, future maintainers
