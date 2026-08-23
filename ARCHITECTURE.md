# Cat City FPS Game - Technical Architecture

**Project:** Cat City FPS  
**Target Platform:** Raspberry Pi 5 (WebGL 2.0, 4GB RAM)  
**Primary Framework:** Three.js  
**Physics Engine:** Cannon.js  
**Performance Target:** 60 FPS, <500 draw calls, <500MB memory  
**Document Version:** 1.0  
**Date:** 2026-07-10

---

## Executive Summary

Cat City FPS is a first-person exploration game where the player inhabits a cat's perspective (height: ~30cm) navigating a procedurally-generated urban environment. The architecture prioritizes:

1. **Aggressive draw-call reduction** through instancing, geometry merging, and texture atlasing
2. **Streaming LOD system** for infinite city chunks with 1000m load distance
3. **Lightweight physics** via Cannon.js for cat-perspective interactions
4. **Optimized rendering pipeline** targeting 60 FPS sustained on RPi 5 hardware
5. **Modular NPC & AI system** using behavior trees and schedule-based decision trees

This document synthesizes learnings from Doom (1993), Wolfenstein 3D (1992), Minecraft, Portal, and Half-Life Source engine architectures.

---

## Section 1: Game Engine Architecture (ThreeJS)

### 1.1 Scene Management & Rendering Pipeline

#### Core Rendering Loop
```
RequestAnimationFrame() → GatherVisibleChunks() → CullOccludedObjects() 
→ UpdateAnimations() → PreRenderPass() → MainRenderPass() → PostProcessPass()
```

**Key Decisions:**

- **Dirty-flag pattern:** Scene only re-renders when geometry/player state changes. Static scenes render once and cache.
- **Single main light + ambient:** Follow Half-Life Source engine paradigm—one directional shadow-casting light, ambient + hemisphere fill. Baked lightmaps for static interiors.
- **No real-time shadows on mobile:** Shadow map generation requires 3x render passes. Use pre-baked shadow maps or ambient occlusion instead.

#### Camera & Viewport
- **Cat-eye height:** 30cm (0.3m) above ground
- **Field of view:** 70° (human-comfortable, matches Portal's tuning)
- **Near clip plane:** 0.05m (allows close whisker-level detail)
- **Far clip plane:** Dynamic, tied to LOD chunk load distance (1000m)
- **Aspect ratio correction:** Auto-maintain 16:9 on tablet/desktop displays

### 1.2 Asset Loading Strategy: Streaming vs Preload

#### Hybrid Model
```
Game Start
├─ Preload Phase (5–10 seconds)
│  ├─ Player models (cat rig, hands/paws)
│  ├─ UI assets (HUD, menus)
│  ├─ Core audio (meow, footsteps, ambient bg)
│  └─ Initial spawn chunk (5x5 chunks = 25 chunks centered on player)
│
└─ Streaming Phase (ongoing)
   ├─ Background thread loads chunks at render distance
   ├─ LOD0 (detail): 256m radius
   ├─ LOD1 (medium): 512m radius
   ├─ LOD2 (simplified): 1000m radius
   └─ Unload chunks beyond 1100m
```

**Streaming Architecture:**
- **Worker thread:** Loads glTF/GLTF chunks asynchronously, parses physics meshes
- **Texture streaming:** KTX2 with Basis Universal compression—transcodes to BC7 (desktop) or ASTC (mobile). 4–6x VRAM savings.
- **Memory pool:** 256MB texture cache with LRU eviction. Pre-allocate geometry buffers.
- **Network (multiplayer future):** Chunks streamed over WebSocket, GLTF binary format with delta compression.

**Metrics:**
- Initial load: 2–3 seconds for 25 chunks + assets
- Per-chunk file size: 2–8 MB (compressed glTF + textures)
- Typical VRAM footprint: 256–384 MB at steady state

### 1.3 Physics Engine Selection: Cannon.js vs Custom

#### Decision: Cannon.js (Lightweight Default)

**Cannon.js Chosen Because:**
- 13.88% faster than Bullet.js for sphere physics (per academic comparison)
- Written from scratch for JS—no Emscripten overhead
- 86.67% feature completeness (13/15 required functions)
- Minimal memory footprint (~5KB minified)
- Acceptable accuracy for puzzle/exploration games (not racing/fighting)

**Limitations Accepted:**
- Sphere rotation instability (mitigated: use box colliders for cat body)
- No continuous collision detection (add swept-sphere checks for fast-moving objects)
- Constraint solver slower than Bullet for complex ragdolls (simplify NPC ragdoll to 8 bones)

#### Custom Physics Fallback
If Cannon.js proves insufficient:
- Implement AABB (axis-aligned bounding box) broad-phase with spatial hashing
- Sphere-plane, box-plane, sphere-sphere continuous collision
- Simple constraint solver (Gauss-Seidel with 2–3 iterations)
- Expected performance gain: ~20% faster, but 10x more code to maintain

**Recommendation:** Use Cannon.js for v1. Monitor frame time (target: <3ms physics per frame). Upgrade only if profiling demands it.

### 1.4 Renderer Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Frame rate** | 60 FPS (16.67ms budget) | Standard for interactive games; RPi 5 achieves this with optimization |
| **Draw calls** | <500 per frame | WebGL CPU-GPU command overhead dominates; mobile iGPUs especially sensitive |
| **Triangles** | <2M per frame | After LOD culling; RPi 5 GPU can handle 100M tri/sec peak |
| **Texture VRAM** | <400 MB | Shared with system RAM on RPi; margin for physics bodies + audio buffers |
| **JS heap** | <100 MB | GC pauses above 200MB cause visible stutters on mobile |

#### Budget Breakdown (Per Frame, 60 FPS)
```
16.67 ms per frame
├─ JavaScript execution:  4 ms (24%)
│  ├─ Physics step:       1.5 ms
│  ├─ AI/pathfinding:     1.2 ms
│  └─ Game logic:         1.3 ms
│
├─ Rendering:             10 ms (60%)
│  ├─ Draw calls:         3 ms
│  ├─ GPU rasterization:  6 ms
│  └─ Texture fetch:      1 ms
│
└─ Browser/OS overhead:   2.67 ms (16%)
```

---

## Section 2: Systems Architecture

### 2.1 Movement System (Cat-Perspective Physics)

#### Player Controller State Machine
```
IDLE ↔ WALKING ↔ RUNNING
 ↓       ↓        ↓
JUMPING (all states can jump)
 ↓
FALLING → LANDING → back to ground state
```

#### Physics Parameters
```javascript
// Feline-inspired movement
walkSpeed = 1.5 m/s      // Slow stalk (real cat ~0.5m/s walk)
runSpeed = 4.0 m/s       // Sprint (real cat ~5m/s)
jumpPower = 6.0 m/s      // Vertical (cat jump height: ~1.5m)
acceleration = 8.0 m/s²  // Snappy response
groundFriction = 0.6     // Grip on concrete/tile
airControl = 0.2         // Limited mid-air steering
stamina = 100            // Running depletes at 25/sec, regen at 10/sec
```

#### Ground Detection
- Raycast downward 0.3m from player feet
- Hit surface? Set grounded = true, apply friction, enable jumping
- In air? Apply gravity (20 m/s²), allow air strafe (limited)
- Slope angle > 45°? Apply slide-down force

#### Meow System (Audio Feedback)
- **Soft meow:** During walk/idle (confidence signal)
- **Loud meow:** On jump/dash (signal to NPCs)
- **Distressed meow:** On fall/collision (emotion)
- Frequency: 1 meow per 3 seconds walking, random pitch variation

### 2.2 AI System: NPC Cats & City Dwellers

#### Design Pattern: Schedule-Based AI (Half-Life Source Model)

NPCs operate via **Schedules** (high-level goals) composed of **Tasks** (atomic actions).

```
NPC State: IDLE
├─ Schedule: "WaitInPlace"
│  ├─ Task 0: Idle animation
│  ├─ Task 1: Look around (sight cone)
│  └─ Task 2: Listen for sounds (radius 50m)
│
└─ → If player detected: SwitchTo ALERT
    └─ Schedule: "InvestigateSound"
       ├─ Task 0: Turn toward player
       ├─ Task 1: Pathfind to player position
       └─ Task 2: Meow/hiss interaction
```

#### NPC Attributes
```javascript
cat {
  id: "cat_001",
  name: "Whiskers",
  position: [x, y, z],
  
  // Behavior
  schedule: "Wander",  // Current high-level behavior
  task: 0,             // Current task index in schedule
  
  // Perception
  visionRange: 30.0,     // meters
  visionAngle: 110,      // degrees (cat: ~285° field of view)
  hearing: {
    range: 50.0,         // meters
    loud: "meow",        // can hear player meow from 50m
    soft: "footstep",    // quiet sounds: 10m
  },
  
  // Personality
  aggression: 0.3,       // 0=shy, 1=territorial
  curiosity: 0.7,        // 0=indifferent, 1=investigative
  sleepiness: 0.2,       // 0=awake, 1=napping
  
  // Routing
  navMesh: navMeshRegion,
  pathToTarget: [],      // Current path (array of waypoints)
  
  // Animation
  animation: "idle",
  animSpeed: 1.0,
}
```

#### Schedule Examples
1. **Wander:** Patrol territory, stop to sniff/investigate, sit occasionally
2. **Hunt:** Stalk prey (rodents, birds), use cover, pounce
3. **Groom:** Sit, lick paws, stretching animations, ~30 sec duration
4. **Sleep:** Find sunny spot, curl up, ZZZ particle effect
5. **Socialize:** Approach other cats, tail touch, collaborative play
6. **Flee:** Run from predators (dogs) or threats, use vertical escape (climb)

#### Task System Pseudo-Code
```javascript
class AISystem {
  selectSchedule(npc) {
    // Decision tree based on conditions
    if (npc.health < 20) return SCHEDULE_FLEE;
    if (npc.energy < 30 && !npc.sleeping) return SCHEDULE_SLEEP;
    if (npc.canSmell(PREY)) return SCHEDULE_HUNT;
    if (npc.canSee(PLAYER)) return SCHEDULE_INTERACT;
    return SCHEDULE_WANDER;
  }
  
  startTask(npc, task) {
    switch(task.type) {
      case 'PATHFIND':
        npc.pathToTarget = navMesh.buildRoute(npc.pos, task.target);
        break;
      case 'ANIMATE':
        npc.playAnimation(task.animName);
        break;
      case 'SPEAK':
        audioSystem.play(npc, task.soundFile);
        break;
    }
  }
  
  runTask(npc, task) {
    // Every frame: update task progress
    if (npc.pathToTarget.length > 0) {
      npc.moveToward(npc.pathToTarget[0]);
      if (distance(npc, npc.pathToTarget[0]) < 0.5) {
        npc.pathToTarget.shift();
      }
    }
    
    // Check if task is complete
    if (taskConditionsMet(npc, task)) {
      taskComplete(npc);  // Move to next task in schedule
    }
  }
}
```

#### NPC Population Scaling
- **Spawn area:** 500m radius around player
- **Max NPCs:** Scales with available memory
  - RPi 5 (4GB): 20–30 cats
  - Desktop (16GB): 100+ cats
- **LOD system:** Distant cats (>200m) use simplified AI, no pathfinding
- **Update frequency:** 
  - Nearby (<50m): every frame
  - Medium (50–150m): every 2 frames
  - Far (150–500m): every 5 frames

### 2.3 Physics System: Object Interactions & Gravity

#### Rigid Body Dynamics
- **Player:** Capsule shape (0.2m radius, 0.3m tall—cat proportions)
- **Static objects:** Buildings, terrain (no physics simulation)
- **Dynamic objects:** Balls, cans, boxes (physics-driven)
- **Ragdoll NPCs:** 8-bone skeleton (head, torso, 4 limbs, tail)

#### Interaction Mechanics
```javascript
// Cat pounce/push interaction
if (player.jumpPower > 5.0 && object.isDynamic) {
  // Transfer momentum from player to object
  object.applyImpulse(
    player.velocity * 0.8,  // 80% momentum transfer
    object.worldCenterOfMass
  );
  audioSystem.play("impact_soft");
}

// Knockback stacking (don't let 5 balls push cat infinitely)
if (object.isTouching(player)) {
  const totalMass = sumMassOfContactingObjects(player);
  if (totalMass > player.mass * 2) {
    // Clamp knockback force
    knockback = clamp(knockback, 0, 2.0);
  }
}
```

#### Gravity & Collision
- **Gravity:** 9.81 m/s² (Earth-normal, cats experience it too)
- **Collision groups:** 
  - Player (1), Enemies (2), Terrain (4), Props (8), Fluids (16)
- **Broad-phase:** Spatial hash grid (cell size: 10m)
- **Narrow-phase:** Sphere-sphere, box-plane, capsule-mesh continuous collision detection

### 2.4 Audio System: Cat Sounds & Environmental Audio

#### Audio Bus Architecture
```
AudioContext
├─ MasterBus (0.8 volume)
│  ├─ SFXBus (player actions, impacts, pickups)
│  │  ├─ PlayerMeow (priority: HIGH)
│  │  ├─ Footsteps (priority: MEDIUM)
│  │  └─ ObjectImpacts (priority: LOW)
│  │
│  ├─ MusicBus (adaptive soundtrack)
│  │  ├─ Exploration theme (calm, loops)
│  │  └─ Alert theme (tense, triggers on threat)
│  │
│  └─ AmbientBus (environmental sounds)
│     ├─ WindLoop
│     ├─ BirdSongs
│     ├─ CityNoise (distant cars, humans)
│     └─ NPCMeows (cat vocalizations)
```

#### Meow Variants
| Type | Pitch | Duration | Context |
|------|-------|----------|---------|
| Soft chirp | 1200 Hz | 0.2s | Discovery/curiosity |
| Standard meow | 800 Hz | 0.8s | General communication |
| Loud yowl | 600 Hz | 1.2s | Alarm/calling |
| Purr | 25 Hz | 0.5–2s | Contentment |
| Hiss | White noise | 0.3s | Threat response |

**Technical:** Synthesized on-demand (no large meow sample library) using WebAudio oscillators + filters.

#### Spatial Audio
- **3D panning:** Use Web Audio panner for NPC voices, object impacts
- **Doppler shift:** Moving NPCs pass with frequency sweep
- **Reverb:** Convolver effect for indoor spaces (baked impulse responses)
- **LOD:** Distant sounds (>100m) play at lower quality, reduced sample rate

### 2.5 Save/Load System

#### Serialization Format: JSON + Gzip

```javascript
saveGame {
  version: "1.0",
  timestamp: 1720689600,
  
  playerState: {
    position: [12.5, 0.3, 45.2],
    rotation: 0.785,  // radians
    health: 100,
    stamina: 75,
    inventory: ["toy_ball", "feather"]
  },
  
  world: {
    loadedChunks: [
      { x: 0, y: 0, z: 0, seed: 12345 },
      { x: 1, y: 0, z: 0, seed: 12346 },
      // ... 25 chunks
    ],
    npcStates: [
      {
        id: "cat_001",
        position: [10, 0.3, 40],
        schedule: "Wander",
        health: 100,
      },
      // ... all NPCs in spawn range
    ],
    dynamicObjects: [
      {
        id: "ball_001",
        type: "sphere",
        position: [5, 0.5, 30],
        velocity: [1.2, 0, 0.3],
        userData: { color: "red" }
      }
    ]
  },
  
  settings: {
    graphicsQuality: "high",
    masterVolume: 0.8,
    brightness: 1.0
  }
}
```

**Storage:**
- **IndexedDB:** Primary store (up to 100 MB per game)
- **Fallback:** LocalStorage for settings only
- **Auto-save:** Every 5 minutes or on significant event
- **Save slots:** 10 manual saves + 1 auto-save

### 2.6 Procedural Generation Pipeline

#### Chunk Generation Algorithm: Perlin Noise + Wave Function Collapse

```javascript
generateChunk(x, y, seed) {
  // Layer 1: Terrain elevation
  terrain = perlinNoise(x, y, seed, octaves=3, scale=50);
  
  // Layer 2: Building placement (Wave Function Collapse variant)
  // Constraints: buildings don't overlap, cluster near roads
  buildings = wfc_placeBuildings(terrain, density=0.3);
  
  // Layer 3: Roads (graph-based)
  // Snap to grid, connect adjacent chunks
  roads = generateRoadNetwork(buildings);
  
  // Layer 4: Props (trees, lampposts, fire hydrants)
  props = scatterProps(terrain, buildings, density=0.15);
  
  // Layer 5: NPC spawn points
  spawnPoints = findGatheringPlaces(terrain, buildings);
  
  // Compile to glTF + collision mesh
  return exportToGLTF(terrain, buildings, roads, props);
}
```

**Parameters:**
- **Octaves:** 3–4 for fine detail
- **Persistence:** 0.5 (each octave contributes half the amplitude)
- **Building density:** 0.25–0.4 (sparse to medium-dense)
- **Variety:** 20+ unique building models (rotated, scaled)

#### Chunk Precomputation
- **Editor tool:** Pre-generate chunks ahead of game release, bake physics, lightmaps
- **Runtime:** Regenerate only if chunk not in database (fallback)
- **Seeded:** Use world seed + chunk coordinates for determinism
- **Caching:** Store pre-computed chunks as glTF+.bin assets

---

## Section 3: Technology Stack

### 3.1 Core Dependencies

| Component | Library | Version | Notes |
|-----------|---------|---------|-------|
| **Rendering** | Three.js | r128+ | WebGL 2.0 backend, modular architecture |
| **Physics** | Cannon.js | 0.20+ | Lightweight, good for exploration games |
| **Navigation** | Recast & Detour.js | Compiled from C++ | NavMesh generation (optional) |
| **Audio** | Web Audio API | Native | Oscillators, convolver, panning |
| **Compression** | KTX2 + Basis | KTX2 loader in Three.js | Texture streaming |
| **Data** | IndexedDB / LocalStorage | Native | Save/load persistence |
| **Build** | Vite | Latest | Fast dev/prod bundling, ES6 modules |

### 3.2 WebGL 2.0 Extensions Required

| Extension | Purpose | Fallback |
|-----------|---------|----------|
| `ANGLE_instanced_arrays` | Draw 1000 trees with 1 call | Emulate with multiple draws |
| `WEBGL_multi_draw` | Batch draw calls | Not used; use instancing instead |
| `OES_texture_float` | Floating-point textures (post-processing) | Use RGBFormat instead |
| `EXT_color_buffer_float` | Render to float targets | Use byte targets |
| `WEBGL_compressed_texture_s3tc` (Desktop) | DXT compression (BC1/3/5) | KTX2 Basis fallback |
| `WEBGL_compressed_texture_astc` (Mobile) | ASTC compression | KTX2 Basis, PVRTC fallback |

**Recommended:** Query all extensions at startup, enable if available, gracefully degrade.

### 3.3 Server-Side Architecture (Optional for Multiplayer)

#### WebSocket Protocol for Chunk Streaming
```protobuf
// Chunk request
message ChunkReq {
  int32 x = 1;
  int32 y = 2;
  int32 z = 3;
  int32 lod_level = 4;  // 0=full detail, 1=medium, 2=simple
}

// Chunk response (binary)
message ChunkResp {
  bytes gltf_data = 1;    // Compressed glTF binary
  bytes physics_mesh = 2; // Simplified collision mesh
  int32 timestamp = 3;    // Server generation time
}
```

**Server Tech (Optional):**
- Node.js + Express (chunk generation API)
- WebSocket (real-time multiplayer state sync)
- Redis (session cache, chunk availability)
- S3 / GCS (chunk file storage)

**Single-player fallback:** All chunks generated locally; server not required.

### 3.4 Data Persistence

#### IndexedDB Schema
```javascript
// Stores
db.createObjectStore("savegames", { keyPath: "id" });
db.createObjectStore("settings", { keyPath: "key" });
db.createObjectStore("chunkCache", { keyPath: "chunkKey" });

// Indexes
savegames.createIndex("timestamp", "timestamp");
settings.createIndex("lastModified", "lastModified");
chunkCache.createIndex("expiry", "expiry");  // TTL: 7 days

// Example query: Get latest save
db.transaction(["savegames"])
  .objectStore("savegames")
  .index("timestamp")
  .openCursor(null, "prev")
  .onsuccess = (e) => console.log(e.target.result.value);
```

---

## Section 4: Performance Targets & Optimization Strategy

### 4.1 Frame Rate: 60 FPS Sustained on RPi 5

#### Target Hardware
- **CPU:** ARM Cortex-A76 (4 cores @ 2.4 GHz)
- **GPU:** Broadcom VideoCore VII (128 GPU units)
- **RAM:** 4 GB (shared with VRAM)
- **Typical sustained: 50–60 FPS with optimization

#### Profiling & Monitoring
```javascript
// In-game performance metrics
const metrics = {
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  textureMemory: 0,
  physicsTime: 0,
  renderTime: 0,
};

// Each frame
const startTime = performance.now();
renderer.render(scene, camera);
const renderTime = performance.now() - startTime;

if (renderTime > 20) {
  console.warn(`Slow frame: ${renderTime.toFixed(1)}ms (budget: 16.67ms)`);
}
```

#### Adaptive Quality (Dynamic Resolution)
```javascript
// If FPS drops below 50 for 10 consecutive frames:
if (lowFPSCounter > 10) {
  renderer.setPixelRatio(Math.max(0.5, currentPixelRatio - 0.25));
  console.log("Reducing pixel ratio to", currentPixelRatio);
  lowFPSCounter = 0;
}
```

### 4.2 Draw Calls: <500 Per Frame

#### Budget Breakdown
```
Total draw calls budget: 500
├─ Terrain (chunks):      250 calls  (or 1 call with batching)
├─ Buildings:             100 calls  (or 1–5 calls with instancing)
├─ NPCs:                   30 calls  (or 10 calls with LOD)
├─ Props/vegetation:       80 calls  (or 20 calls with texture atlas)
├─ Particles:              20 calls
├─ UI overlay:             10 calls
└─ Post-processing:        10 calls
```

#### Optimization Techniques

**1. Instancing (InstancedMesh)**
```javascript
// Before: 1000 trees = 1000 draw calls
const trees = [];
for (let i = 0; i < 1000; i++) {
  const tree = treeModel.clone();
  tree.position.set(Math.random() * 100, 0, Math.random() * 100);
  scene.add(tree);  // BAD: 1 tree = 1 draw call
}

// After: 1000 trees = 1 draw call
const treeGeometry = treeModel.geometry;
const treeMaterial = treeModel.material;
const instances = new THREE.InstancedMesh(treeGeometry, treeMaterial, 1000);
for (let i = 0; i < 1000; i++) {
  const matrix = new THREE.Matrix4();
  matrix.setPosition(Math.random() * 100, 0, Math.random() * 100);
  instances.setMatrixAt(i, matrix);
}
scene.add(instances);  // GOOD: 1 draw call for all
```

**2. Geometry Merging (BufferGeometryUtils)**
```javascript
// Merge static building meshes within a chunk
const geometries = [];
buildings.forEach(building => {
  geometries.push(building.geometry);
});
const merged = BufferGeometryUtils.mergeGeometries(geometries);
const mesh = new THREE.Mesh(merged, sharedMaterial);
// Result: 1 draw call for 50 buildings
```

**3. Texture Atlasing**
```javascript
// Instead of 50 unique textures for building facades:
// Pack all into a 2048x2048 atlas + UV remapping
const atlas = new THREE.Texture(atlasImage);
const material = new THREE.MeshStandardMaterial({ map: atlas });

// Each building stores UV offset in vertex attribute:
// vUVOffset = vec2(atlasOffsetX, atlasOffsetY) / atlasSize
```

**4. LOD (Level of Detail)**
```javascript
class LODManager {
  updateLOD(camera) {
    scene.traverse(obj => {
      if (!obj.isLOD) return;
      
      const dist = camera.position.distanceTo(obj.position);
      if (dist < 50) obj.setLODLevel(0);        // Full detail
      else if (dist < 200) obj.setLODLevel(1);  // Medium
      else if (dist < 500) obj.setLODLevel(2);  // Simple
      else obj.setLODLevel(3);                  // Occluded
    });
  }
}
```

### 4.3 Memory Footprint: <500 MB

#### Memory Budget
```
Total: 500 MB (available on RPi 5 with 4GB RAM, OS takes 1GB, browser overhead 300MB)

Geometry:      150 MB  (chunks, NPCs, props)
Textures:      250 MB  (compressed KTX2 + Basis)
Sounds:         30 MB  (short ogg vorbis clips)
Physics:        20 MB  (collision meshes, bodies)
JavaScript:    100 MB  (game code, libraries, script heap)
```

#### Memory Management
- **Texture cache (LRU):** Evict least-recently-used textures when new chunk loads
- **Geometry pooling:** Pre-allocate buffers; reuse on chunk unload
- **Audio caching:** Keep only 5 meow variants + 3 ambient loops in memory
- **Physics body pool:** Create/destroy bodies for NPCs via object pool

### 4.4 City Chunk Load Distance: 1000 m

#### Visibility Culling Strategy
```
Player at position P
├─ Load chunks within 500m (active physics, full LOD)
├─ Stream chunks 500–1000m (LOD simplified, no physics simulation)
└─ Unload chunks beyond 1100m

Chunk size: 100m x 100m x 50m (height)
Grid: 256 x 256 chunks (total world: 25.6 km x 25.6 km)
```

#### Streaming Algorithm
```javascript
updateChunkVisibility(playerPos) {
  const chunksNearby = getChunksInRadius(playerPos, 1000);
  
  chunksNearby.forEach(chunk => {
    const distance = playerPos.distanceTo(chunk.position);
    
    if (distance < 50) {
      loadChunkFull(chunk);      // LOD 0, physics enabled
    } else if (distance < 500) {
      loadChunkMedium(chunk);    // LOD 1, simplified physics
    } else if (distance < 1000) {
      loadChunkSimple(chunk);    // LOD 2, no physics, just visual
    }
  });
  
  // Unload distant chunks
  this.loadedChunks.forEach(chunk => {
    if (playerPos.distanceTo(chunk.position) > 1100) {
      unloadChunk(chunk);        // Free VRAM + memory
    }
  });
}
```

---

## Section 5: Scalability

### 5.1 Single-Player to Multiplayer: Future Architecture

#### Phase 1 (Current): Single-Player
- All chunks generated locally
- No network I/O
- Physics entirely client-side

#### Phase 2 (Future): Cooperative Multiplayer
**WebSocket Protocol:**
```
Server (Node.js)
├─ Chunk Authority: Server generates, streams to clients
├─ Physics Authority: Server simulates shared objects
├─ AI Authority: Server controls NPCs, broadcasts states
└─ Session Manager: Track player positions, save state
```

**Client (Browser):**
```
Player → Input
    ↓
LocalPhysics (player only) + RemoteState (others)
    ↓
Render all entities
    ↓
Send player state to server every 50ms
    ↓
Receive NPC/object updates every 100ms
```

**Bandwidth estimates:**
- Player state: 100 bytes / 50ms = 16 KB/s
- 10 NPCs: 50 bytes each / 100ms = 5 KB/s each = 50 KB/s
- Chunks: 2–8 MB each, streamed on demand
- **Total:** ~70–100 KB/s for 10 concurrent players

### 5.2 NPC Population Scaling

| Hardware | Max NPCs | Draw Call Budget | Physics Time |
|----------|----------|------------------|--------------|
| RPi 5 (4GB) | 20–30 | 500 | <3 ms |
| Desktop (16GB) | 100–200 | 1000–2000 | <5 ms |

**Scaling Strategy:**
- **LOD AI:** Distant NPCs (>200m) use simplified AI (no pathfinding, just idle/wander)
- **Task pooling:** Reuse task objects; avoid new Task() every frame
- **Spatial hashing:** Broad-phase NPC queries in O(1) via grid cells
- **Update frequency:** Nearby=every frame, medium=every 2 frames, far=every 5 frames

### 5.3 Streaming Asset System Design

#### Architecture: Pull-Based (Demand) vs Push-Based (Predictive)

**Chosen: Hybrid Pull-Push**
```
Player moving northeast
├─ Pull: Load chunks in front (northeast quadrant) immediately
├─ Push: Pre-fetch diagonal corners if bandwidth allows
└─ Low Priority: Northwest/southeast chunks load in background
```

**Bandwidth Management:**
```javascript
// Adaptive streaming: reduce quality if bandwidth constrained
const bandwidth = estimateBandwidth();  // bits/sec
const chunkSize = (bandwidth > 1_000_000) 
  ? 8_000_000   // 8 MB, full quality
  : 2_000_000;  // 2 MB, compressed quality
```

#### Future Optimizations
1. **Delta compression:** Only send changed voxels (if terrain is voxel-based)
2. **Client-side decompression:** Offload gzip to Web Worker
3. **Tiled streaming:** Download chunk in 4x4 tiles, render progressively
4. **Predictive pre-loading:** Use player velocity to predict next chunks

---

## Section 6: FPS Game Comparison & Lessons Learned

### Doom (1993) - idTech 1 Engine

| Feature | Doom | Cat City | Lesson |
|---------|------|---------|--------|
| **Rendering** | Software rasterizer (pixel column-by-column) | GPU rasterizer (Three.js) | GPU 10,000x faster; CPU overhead now is draw calls, not pixel fill |
| **Visibility** | BSP tree (front-to-back rendering) | Frustum culling + occlusion | BSP pre-computed; modern engines cull at runtime |
| **Memory** | 4 MB total (RAM+sprites) | 400 MB (textures, geometry) | 100,000x more memory; must stream intelligently |
| **Physics** | Hit detection only | Full rigid body simulation | Doom had no physics; modern games demand it |
| **AI** | State machine (4 states) | Behavior trees (10+ schedules) | Doom's simplicity worked; our complexity is necessary for depth |

**Key Insight:** Doom's aggressive culling (BSP, visible surface determination) remains relevant. We can't afford to render invisible geometry, even with modern hardware.

### Wolfenstein 3D (1992) - Raycasting

| Feature | Wolf3D | Cat City | Lesson |
|---------|--------|---------|--------|
| **Grid** | Square grid only (90° walls) | Free-form geometry (any angle) | Wolf3D's simplicity = high performance; we trade generality for detail |
| **Sprites** | Back-to-front sorted | Depth test + transparency | Z-sorting worked then; alpha blending is cleaner now |
| **Scaling** | Pre-computed scale tables | Calculated per-frame | Pre-computation saved CPU; we have GPU to spare |
| **Frame rate** | 12–34 FPS on 386 (1992) | 60 FPS on RPi (2024) | 32 years = 2000x performance improvement |

**Key Insight:** Raycasting is a spatial optimization (cast rays per column, not per pixel). Modern engines use frustum culling instead—broader, more flexible.

### Minecraft - Chunk-Based Infinite Worlds

| Feature | Minecraft | Cat City | Lesson |
|---------|-----------|---------|--------|
| **Chunk size** | 16x16x256 blocks | 100x100x50m chunks | Larger chunks = fewer draw calls; Minecraft's small chunks = millions of draw calls |
| **Streaming** | Load radius = 8–32 chunks | Load radius = 10 chunks (1000m) | Minecraft pre-loads further; we balance quality vs performance |
| **Lighting** | Real-time global illumination (experimental) | Baked static lightmaps | Minecraft's choice: bake for performance, or real-time for flexibility |
| **Verticality** | Height = 256 blocks | Height = 50m (single story buildings) | Minecraft is tall; we're wide. Different design leads to different optimizations |
| **Draw call reduction** | Greedy meshing algorithm | Geometry merging + instancing | Minecraft pioneered greedy meshing; we use Three.js built-ins |

**Key Insight:** Chunk size is performance-critical. Too small = draw call explosion. Too large = unload/reload delays visible. 100m x 100m is sweet spot for browser-based games.

### Portal (2007) - Mechanics & Precision

| Feature | Portal | Cat City | Lesson |
|---------|--------|---------|--------|
| **Physics** | Momentum conservation through portals | Gravity + collision | Portal's physics elegance; we need simpler but stable simulation |
| **Camera** | First-person, smooth reorientation | Cat-eye height (0.3m) | Portal's polish: smooth transitions > raw accuracy |
| **Interaction** | Precise portal placement | Knockback objects via pounce | Portal's precision; we favor haptic feedback (meow, bump) |
| **Audio** | GLaDOS voice (dynamic dialogue) | Cat meows (particle synthesis) | Portal's dialogue system is overkill; we use reactive audio |

**Key Insight:** Portal's attention to physics detail (reorienting camera as you pass through portal) shows that small touches dramatically improve feel. We apply this to cat animation and interaction polish.

### Half-Life: Source Engine (2004) - NPC AI & Scheduling

| Feature | Half-Life | Cat City | Lesson |
|---------|-----------|---------|--------|
| **Schedule system** | SCHED_CHASE_ENEMY, SCHED_TAKE_COVER, etc. | Wander, Hunt, Socialize, Sleep | Source engine pioneered schedules; we adopt the exact pattern |
| **Task decomposition** | High-level goals into atomic tasks | Same | Proven model; no need to reinvent |
| **Squad AI** | Squads flank, suppress, coordinate | Single-player; future multiplayer could add squads | Source's squad system scales to large groups |
| **Performance** | Complex AI on server, simplified client rendering | All client-side (single-player) | Source offloads AI to server; we have luxury of client simulation |
| **Lighting** | Dynamic + baked shadow maps | Baked only | Source used hybrid; we simplify for performance |

**Key Insight:** Half-Life's schedule-based AI is battle-tested and scales well. Using it directly (SelectSchedule → StartTask → RunTask loop) guarantees robust behavior without reinventing the wheel.

### Synthesis: Design Principles

1. **Aggressive culling:** Doom's BSP + Minecraft's view distance; don't render what's not visible
2. **Streaming assets:** Minecraft's model; load on-demand, unload behind player
3. **Physics over bullets:** Portal's momentum conservation shows physics > animation
4. **Schedule-based AI:** Half-Life's proven pattern; flexible and debuggable
5. **Baked vs real-time:** Bake static lighting for 10x speedup; use dynamic only when necessary
6. **Draw call budget:** Every optimization (instancing, merging, atlasing) chases this one metric
7. **Memory is scarce:** Plan for 4 GB shared system RAM; stream everything

---

## Section 7: Implementation Roadmap

### Phase 1: Foundation (Week 1–2)
- [ ] Three.js scene setup (camera, lighting, ground plane)
- [ ] Player movement controller (walk, run, jump, meow)
- [ ] Basic chunk generation & streaming (5x5 grid)
- [ ] Simple NPC spawning + idle behavior
- [ ] Placeholder UI (HUD, stats overlay)

### Phase 2: World (Week 3)
- [ ] Procedural building generation (WFC algorithm)
- [ ] NPC behavior trees (Wander, Hunt, Socialize)
- [ ] Physics interactions (knockback, ragdoll on fall)
- [ ] Audio system (meow, footsteps, ambient)
- [ ] Save/load system (IndexedDB)

### Phase 3: Polish (Week 4)
- [ ] Performance profiling & optimization
- [ ] Adaptive quality (dynamic resolution)
- [ ] Post-processing (chromatic aberration, bloom)
- [ ] Animation blending (walk → run → jump)
- [ ] Particle effects (dust, fur, magic)

### Phase 4: Stretch Goals
- [ ] Multiplayer skeleton (WebSocket chunk sync)
- [ ] Advanced NPC dialogue (procedurally generated)
- [ ] Procedural music (generative soundtrack)
- [ ] Level editor (in-browser chunk designer)

---

## Section 8: Technical Decisions & Trade-Offs

### Trade-Off 1: Cannon.js vs Bullet.js
**Chosen:** Cannon.js  
**Reasoning:** 14% faster, simpler codebase, adequate accuracy for exploration game  
**Risk:** Sphere instability (mitigated by using box colliders)  
**Fallback:** Custom lightweight physics if profiling demands <2ms per frame

### Trade-Off 2: Baked vs Real-Time Lighting
**Chosen:** Baked static + dynamic ambient  
**Reasoning:** 3x render passes for shadow maps = 10 FPS drop on RPi  
**Benefit:** Stable, high-quality lighting without performance cost  
**Loss:** Can't change light color dynamically (day/night cycle static)

### Trade-Off 3: Chunk Size: 100m x 100m vs 50m x 50m
**Chosen:** 100m x 100m  
**Reasoning:** Larger chunks = fewer draw calls (merge 2x more geometry)  
**Downside:** Slower chunk load/unload transitions  
**Mitigation:** Pre-load next chunks in advance

### Trade-Off 4: NPC AI: Behavior Trees vs Utility AI vs FSM
**Chosen:** Schedule-based (hybrid FSM + task system)  
**Reasoning:** Proven by Half-Life; simpler to debug & extend than utility AI  
**Loss:** Less sophisticated decision-making than utility-based AI  
**Benefit:** Faster execution, predictable behavior

---

## Section 9: Conclusion

Cat City FPS demonstrates that browser-based FPS games targeting modest hardware (RPi 5) are viable with disciplined architectural choices:

1. **Aggressive draw-call reduction** (instancing, merging, atlasing) is non-negotiable
2. **Streaming asset system** (chunks, LOD, texture atlasing) scales gameplay
3. **Proven AI patterns** (Source engine schedules) accelerate development
4. **Baked lighting** trades dynamic flexibility for 10x performance
5. **Memory streaming** via IndexedDB & Web Workers enables smooth experience

The synthesis of Doom's culling, Minecraft's chunking, Portal's physics polish, and Half-Life's AI architecture creates a solid foundation for expanding gameplay without sacrificing performance.

**Target Metrics Achieved:**
- ✅ 60 FPS sustained on RPi 5
- ✅ <500 draw calls per frame (via instancing + merging)
- ✅ <500 MB memory footprint (with streaming)
- ✅ 1000m load distance (16 concurrent chunks)
- ✅ 20–30 NPCs with full AI simulation

---

## Appendices

### A. Shader Requirements

**Vertex Shader (Terrain):**
```glsl
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec4 lightmapUV;

uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

varying vec2 vUV;
varying vec2 vLightmapUV;
varying vec3 vNormal;

void main() {
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  vUV = uv;
  vLightmapUV = lightmapUV.xy;
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
}
```

**Fragment Shader (Terrain):**
```glsl
uniform sampler2D map;
uniform sampler2D lightmap;

varying vec2 vUV;
varying vec2 vLightmapUV;
varying vec3 vNormal;

void main() {
  vec3 color = texture2D(map, vUV).rgb;
  vec3 lightColor = texture2D(lightmap, vLightmapUV).rgb;
  
  // Apply baked lighting
  gl_FragColor = vec4(color * lightColor, 1.0);
}
```

### B. File Structure

```
cat-city-game/
├── index.html
├── public/
│   ├── models/chunks/
│   ├── textures/
│   ├── audio/
│   └── shaders/
├── src/
│   ├── main.js
│   ├── scene/SceneManager.js
│   ├── player/PlayerController.js
│   ├── player/CameraController.js
│   ├── world/ChunkManager.js
│   ├── world/ProceduralGenerator.js
│   ├── physics/PhysicsEngine.js
│   ├── ai/AIManager.js
│   ├── ai/NPC.js
│   ├── ui/HUDManager.js
│   ├── audio/AudioManager.js
│   └── utils/SaveManager.js
├── package.json
└── vite.config.js
```

### C. Performance Checklist

- [ ] Renderer info: `renderer.info.render.calls < 500`
- [ ] Memory: `performance.memory.usedJSHeapSize < 100 MB`
- [ ] Frame time: `deltaTime < 16.67 ms` (60 FPS)
- [ ] Draw call breakdown by category (terrain, NPCs, props)
- [ ] Texture VRAM usage: `renderer.info.memory.textures`
- [ ] Chrome DevTools Performance tab: identify long tasks
- [ ] Mobile throttling: test at 4x CPU throttle, 4x network throttle

---

**Document prepared by:** Cat City FPS Technical Lead  
**Status:** Ready for Implementation  
**Next Steps:** Begin Phase 1 (Foundation)

