# Cat Walk: Unified Game Specification
## First-Person Cat Exploration Adventure

**Version:** 1.0  
**Date:** 2026-07-10  
**Status:** APPROVED FOR IMPLEMENTATION  
**Target Platform:** ThreeJS (RPi 5, Desktop WebGL 2.0)  
**Engine:** Three.js + Cannon-es  

---

## TABLE OF CONTENTS
1. [Executive Summary](#executive-summary)
2. [Core Pillars](#core-pillars)
3. [Technical Architecture Overview](#technical-architecture-overview)
4. [System Specifications](#system-specifications)
5. [World Design & Procedural Generation](#world-design--procedural-generation)
6. [Progression & Gameplay Loop](#progression--gameplay-loop)
7. [Performance Budgets & Targets](#performance-budgets--targets)
8. [Development Phases](#development-phases)
9. [Risk Register & Mitigation](#risk-register--mitigation)

---

## EXECUTIVE SUMMARY

**Cat Walk** is a browser-based first-person exploration adventure where players experience a procedurally-generated urban environment from a cat's perspective (20-30cm ground height). The game emphasizes discovery, environmental interaction, and NPC relationships without combat or time pressure.

**Core Loop:** Explore → Interact (knock objects, climb surfaces) → Discover → Relate (befriend NPCs) → Progress → Repeat

**Target Experience:**
- **15-30 min session:** Explore 1-2 city districts, interact with 5-10 NPCs, collect 3-5 items
- **60-120 min session:** Complete neighborhood exploration, build relationships, unlock new areas
- **Full campaign:** 20-30 hours main story, 60+ hours for complete exploration

**Key Differentiators:**
1. **Cat-centric perspective:** 0.25m camera height reframes the entire world (massive buildings, tiny obstacles)
2. **Physics-based interaction:** Real knockable objects with satisfying audio/visual feedback
3. **No combat or time pressure:** Peaceful, exploration-driven gameplay
4. **Dynamic NPC life simulation:** Schedules, relationships, emergent storytelling
5. **Stylized semi-realistic aesthetic:** Hand-crafted + procedural hybrid for consistency & variety

**Hardware Target:**
- **Primary:** Raspberry Pi 5 (4GB RAM, ARM Cortex-A76, VideoCore VII)
- **Secondary:** Desktop/laptop with WebGL 2.0 support
- **Target FPS:** 60 FPS on desktop, 30 FPS fallback on RPi 4; stable 60 FPS on RPi 5

---

## CORE PILLARS

### 1. EXPLORATION-FIRST DESIGN
- World naturally encourages curiosity without waypoints or quest markers
- 4 km² (2×2 km) city with 4 distinct neighborhoods
- Procedural generation ensures replayability while hand-crafted districts feel cohesive
- Discovery-based progression: reach locations → auto-unlock for future visits
- Hidden areas reward thorough exploration

### 2. INTERACTIVE ENVIRONMENT
- **Knockable Objects:** 20-50 per chunk (papers, vases, furniture, trash cans)
  - Light (0.1-0.5 kg): 2-4m knockback, slide & stop
  - Medium (0.5-2 kg): 1.5-3m knockback, roll with momentum
  - Heavy (2-10 kg): 0.5-2m knockback, tip over
  - Fixed (>10 kg): Small movement/sound only
- **Climbable Surfaces:** Trees, fences, walls, buildings, pipes
  - Multiple routes per area (ground, fence-top, rooftop)
  - Vertical progression unlocked via skill mastery
  - Safe route vs. challenge route (time/reward trade-off)
- **Physics-based:** Real momentum, momentum transfer, material-dependent audio

### 3. NPC LIFE SIMULATION
- **Population:** 20-30 concurrent on RPi 5 (load/unload based on proximity)
- **Behavior:** Procedurally-generated daily routines (patrol, rest, hunt, socialize)
- **Relationship System:** +100 to -100 scale, affects dialogue and story unlocks
- **NPC Types:** Street cats, house cats, wild cats, stray groups
- **Social Emergent Gameplay:** Witness NPC interactions, overhear conversations, notice patterns

### 4. STYLIZED SEMI-REALISM
- **Art Direction:** Ghibli-influenced with modern polish (not photorealistic, not cartoon-flat)
- **Visual Style:** Painterly diffuse colors, expressive proportions, hand-crafted feel
- **Consistent Aesthetic:** Unified color palette (day: blue/green/brown; night: blue/neon; golden hour: orange)
- **Atmosphere:** Golden hour lighting for beauty, dark night for exploration, dawn/dusk for ambience

### 5. ACCESSIBLE & INCLUSIVE
- **Difficulty Modes:** Peaceful (no damage), Normal (stamina/recovery), Hard (realistic stamina)
- **Accessibility Features:** Colorblind modes, audio cues for all visuals, remappable controls
- **No Gatekeeping:** All content eventually accessible regardless of skill
- **Pacing Options:** Players choose exploration speed (fast dash vs. slow observant pace)

---

## TECHNICAL ARCHITECTURE OVERVIEW

### 3.1 RENDER ENGINE

**Core Stack:**
- **Engine:** Three.js r155+
- **Rendering API:** WebGL 2.0 (fallback to WebGL 1.0 with degradation)
- **Physics:** Cannon-es 0.20+ (pure JavaScript, 50KB bundle)
- **Scene Format:** glTF 2.0 with Draco mesh compression

**Rendering Pipeline:**
```
RequestAnimationFrame() 
  → GatherVisibleChunks() 
  → CullOccludedObjects() 
  → UpdateAnimations() 
  → PreRenderPass() 
  → MainRenderPass() 
  → PostProcessPass()
```

**Key Optimizations:**
- **Frustum Culling:** Reject meshes outside camera view (40-60% draw call reduction)
- **LOD System:** 4 tiers (LOD0=closest, LOD3=skybox)
- **Instanced Rendering:** `InstancedMesh` for repeated objects (trees, benches, NPCs)
- **Texture Atlasing:** 50+ building facades → 1 atlas (reduces texture binds by 8x)

**Performance Targets by Hardware Tier:**

| Tier | Device | Target FPS | Draw Calls | Triangles | Texture VRAM |
|------|--------|-----------|-----------|-----------|------------|
| Low | RPi 4 (1GB) | 30 | <200 | <100K | 64 MB |
| Medium | RPi 5 / Modern Laptop | 60 | <500 | <500K | 256 MB |
| High | Desktop GPU | 60 | <1000 | <2M | 512 MB |

### 3.2 SCENE STRUCTURE

**Hierarchical Organization:**
```javascript
Scene
├── World (Layer 0) - Static geometry, terrain, buildings
├── Dynamic (Layer 1) - NPCs, interactive objects, particles
├── UI (Layer 2) - HUD overlays, dialogue boxes
└── Debug (Layer 3) - Visualization for development
```

**Layered Rendering:**
- Separate layer per category for efficient culling
- Selective rendering based on visibility
- Dynamic layer assignment for streaming chunks

### 3.3 ASSET PIPELINE

**Geometry Compression:**
- **Format:** glTF 2.0 (.glb, .gltf)
- **Compression:** Draco mesh codec (4-6x geometry reduction)
- **Process:** Blender export → gltf-transform → draco-compress

**Texture Compression:**
- **Format:** KTX2 with Basis Universal codec
- **Mipmap:** Auto-generated during encoding
- **Variants:** BC7 (desktop), ASTC 6×6 (mobile)
- **Compression Ratio:** 4-6x VRAM savings
- **Process:** textureatlas → basisu encoder → KTX2 wrapping

**Audio Assets:**
- **Format:** OGG Vorbis (Web Audio native support)
- **Bitrate:** 128-192 kbps for ambient, 256 kbps for SFX
- **Process:** FFmpeg encoding from source

### 3.4 CHUNK STREAMING SYSTEM

**Streaming Architecture:**
```
Chunk Size: 100m × 100m
Load Radius: 1-2 chunks around player (400-500m)
Streaming Distance: Predictive load based on camera direction
Memory Budget: Max 12 chunks in memory (1.2 × 1.2 km²)
```

**Load Phases:**
1. **Critical:** Player controller, first chunk geometry
2. **Visible:** Currently visible chunks, full LOD0
3. **Predicted:** Next 2-3 chunks (LOD1-2), queued for loading
4. **Decorative:** Distant LODs (LOD3), lowest priority

**Unload Strategy:**
- LRU (Least Recently Used) eviction when memory pressure >400 MB
- Chunks >1000m away auto-disposed
- Save chunk state for deterministic regeneration

---

## SYSTEM SPECIFICATIONS

### MOVEMENT SYSTEM

**Cat-Scale Physics:**
- **Camera Height:** 0.25m (cat eye level)
- **Movement Speed:** 5 m/s walk (realistic cat pace), 10 m/s sprint
- **Acceleration:** Smooth ramping over 0.3 seconds
- **Gravity:** 9.8 m/s² (Earth-standard, scaled for cat perspective)

**Core Movement Mechanics:**

| Mechanic | Parameter | Details |
|----------|-----------|---------|
| **Walk** | 5 m/s | Smooth acceleration, all terrain navigable |
| **Sprint** | 10 m/s | Requires stamina, depletes 20 points/sec |
| **Jump** | 1.0 m height | 0.6-0.8s airtime, 10 stamina cost, 0.3s cooldown |
| **Climb** | 1.5 m/s | Slower than walk, 15 stamina/sec cost, requires surface |
| **Fall** | Auto-recover | No damage in Peaceful mode; stamina cost in Normal/Hard |
| **Head Bob** | 0.02m @ 4Hz | Subtle, disabled when idle |

**Stamina System:**
- **Pool:** 100 points
- **Sprint Cost:** 20 points/sec
- **Climb Cost:** 15 points/sec
- **Jump Cost:** 10 points per jump
- **Recovery:** 15 points/sec while idle/walking
- **Exhaustion:** Below 20% stamina = speed capped at walk speed

**Terrain Interaction:**
- **Grass:** Normal traction (1.0x speed)
- **Concrete:** Slippery (1.2x speed, reduced control)
- **Dirt/Gravel:** Rough (0.95x speed)
- **Carpet:** Sticky (0.9x speed, high control)
- **Metal Grates:** Dangerous in rain (slippery)
- **Wood/Brick:** Climbable surfaces with varied difficulty

**Input System:**
- **Desktop:** WASD movement, mouse look (PointerLock API), Spacebar jump, Shift sprint
- **Mobile:** Dual-stick joysticks or tilt-to-look, UI buttons for actions

### PHYSICS ENGINE

**Cannon-es Implementation:**
```javascript
const world = new CANNON.World()
world.gravity.set(0, -10, 0)
world.broadphase = new CANNON.NaiveBroadphase()
world.solver.iterations = 3  // Speed vs. accuracy trade-off
world.solver.tolerance = 0.001

// Fixed timestep: 60 Hz physics, decoupled from render
const fixedTimeStep = 1/60
const maxSubSteps = 3
```

**Body Types:**
- **Player:** Capsule collider (height 0.25m, radius 0.1m)
- **NPCs:** Sphere colliders for simplified collision
- **Static Geometry:** Trimesh colliders from building meshes
- **Dynamic Objects:** Box/sphere bodies for knockable items
- **Kinematic:** Platforms, moving obstacles (if any)

**Physics Optimizations:**
- Broadphase: Naive grid (sufficient for <300 bodies)
- Sleep state: Resting objects skip simulation (implicit)
- Worker offload: Physics runs in Web Worker when >100 bodies
- Swept sphere checks: Prevent tunneling on fast-moving objects

### AI & NPC SYSTEM

**Behavior Tree Architecture:**
```javascript
class NPCCat {
  state = 'idle'  // idle, walking, running, attacking, socializing
  schedule = []   // Queue of tasks
  
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
}
```

**NPC Population Scaling:**
- **Active Simulation:** 20-30 per RPi 5 (full AI, per-frame updates)
- **Simplified AI:** 50-100 distant NPCs (idle/wander only, per-5-frame updates)
- **Total World:** 90-150 NPCs, load/unload based on chunk proximity

**NPC Types:**
1. **Street Cats:** Patrol, hunt, interact with environment, socialize
2. **House Cats:** Appear in windows, rooftops, alleys
3. **Wild Cats:** More aggressive, avoid player
4. **Stray Groups:** Travel in packs, defensive behavior

**Behavior Scheduling:**
- **Time-of-day awareness:** Different activities morning/afternoon/night
- **Relationship-aware:** Friendly NPCs approach, hostile NPCs avoid
- **Daily routines:** Deterministic schedules with stochastic variations
- **Event triggers:** React to player actions (knockovers, meows, climbing)

**Pathfinding:**
- **NavMesh:** Procedurally computed per chunk (A* search)
- **Grid-based fallback:** Simplified pathfinding for distant NPCs
- **Deterministic:** Seeded generation ensures consistent routes

### AUDIO SYSTEM

**Web Audio API Integration:**
```javascript
class AudioManager {
  ambient = ['wind.ogg', 'distant_cars.ogg', 'bird_sounds.ogg']
  
  sfx = {
    meow: { volume: 0.5, pitch: [0.8, 1.2] },
    purr: { volume: 0.3, pitch: 1.0 },
    jump: { volume: 0.4 },
    land: { volume: 0.3 },
    scratch: { volume: 0.6 }
  }
  
  playSFX(type, position) {
    const sound = new THREE.PositionalAudio(audioListener)
    sound.position.copy(position)
    sound.setVolume(this.sfx[type].volume)
    scene.add(sound)
  }
}
```

**Audio Priority (Mixing):**
1. Player feedback (meows, purrs, jumps) - always audible
2. Nearby NPCs and events - distance-based volume
3. Ambient sounds - fade in/out with distance
4. Music - low priority, can pause during load

**Spatial Audio:**
- **3D Panning:** Web Audio panner for positional sounds
- **Distance Attenuation:** Volume falloff over 100m radius
- **Reverb:** Convolver effect in indoor spaces (pre-baked impulses)
- **Doppler:** Optional effect when NPCs move quickly

**Sound Design:**
- **Meow Variants:** 5 base samples, pitch-shifted for emotion
- **Purr Loops:** 3 variations, adjustable volume
- **Footsteps:** Material-dependent (stone, grass, metal, wood)
- **Impact Sounds:** Velocity-dependent loudness
- **Ambient Layers:** Time-of-day specific soundscapes

### SAVE/LOAD SYSTEM

**Lightweight State Serialization:**
```javascript
class SaveSystem {
  saveGame() {
    return {
      playerPos: camera.position,
      playerRot: camera.rotation,
      playedChunks: Array.from(visibleChunks.keys()),
      npcStates: this.serializeNPCs(),
      timestamp: Date.now(),
      gameTime: this.currentGameTime
    }
  }
  
  loadGame(save) {
    camera.position.copy(save.playerPos)
    // Regenerate world from seed for determinism
    // Only restore NPC positions/states
    // Chunk geometry regenerates procedurally
  }
}
```

**Storage Strategy:**
- **IndexedDB:** Primary (up to 100 MB available)
- **localStorage:** Fallback (compressed state)
- **Cloud Save:** Optional future feature
- **Auto-saves:** Every 2 minutes in-game + at milestones

**Deterministic Regeneration:**
- Seed-based procedural generation ensures consistent world
- NPC schedule determinism via seeded random generator
- Chunk geometry matches previous playthrough if seed unchanged
- Enables save/load without storing entire chunk geometry

---

## WORLD DESIGN & PROCEDURAL GENERATION

### 4.1 CITY LAYOUT

**Global Metrics:**
| Metric | Value | Rationale |
|--------|-------|-----------|
| **Total City Area** | 4 km² (2×2 km) | Explorable in 30-40 min walk; manageable procedural complexity |
| **Grid Cell Size** | 256m × 256m | Streaming chunk = 512m × 512m = 4 cells |
| **Block Size** | 32-48m avg | Realistic city block from cat perspective |
| **Building Height** | 4-12 floors | Mix: residential 4-6f, commercial 8-12f |
| **Street Width** | 8-16m | Navigable by car; alleyways 2-4m |
| **Traversal Time** | 10 min corner-to-corner | At 5 m/s cat walk speed |

### 4.2 FOUR NEIGHBORHOODS

**District 1: WHISKER PARK (NW - Residential, 0.9 km²)**
- Theme: Quiet residential, tree-lined streets, suburban charm
- Architecture: 2-4 floor brownstones, Victorian, modern townhouses
- POI: Town square, community garden, cat sanctuary, bookstore, diner
- NPC Count: 120-150 cats, 80-100 humans
- Atmosphere: Peaceful, golden-hour friendly, low traffic
- Spawn Zones: Parks, sidewalks, gardens, shops

**District 2: YARN MILL (SE - Industrial, 1.1 km²)**
- Theme: Revitalized industrial, warehouse conversions, street art
- Architecture: Converted factories (6-8f), modern lofts, exposed brick
- POI: Marketplace, street art alley, warehouse parkour, riverside path, cat cafe
- NPC Count: 100-130 cats, 150+ humans
- Atmosphere: Vibrant, mixed day/night activity, street culture
- Spawn Zones: Market, cafes, rooftops, river paths

**District 3: DOWNTOWN CORE (SW - Commercial, 0.8 km²)**
- Theme: Modern urban center, high-rise offices, retail
- Architecture: Skyscrapers (10-20f), glass/steel, modern plazas
- POI: Central tower (15f, navigation landmark), underground mall, plazas, pet supply megastore
- NPC Count: 60-80 cats, 300+ humans (daytime only)
- Atmosphere: Busy, modern, vertical parkour challenges
- Spawn Zones: Plazas, streets, cafes, shops

**District 4: MOON GARDEN (NE - Parks & Green, 1.2 km²)**
- Theme: Natural escape, botanical gardens, wildlife haven
- Architecture: Open spaces, garden structures, pavilions, minimal buildings
- POI: Conservatory, sacred grove, meditation lotus pond, wildflower meadow, observatory
- NPC Count: 80-100 cats, 30-50 humans (weekends only)
- Atmosphere: Serene, natural, wildlife-focused
- Spawn Zones: Gardens, trails, ponds, meadows

### 4.3 VERTICAL DESIGN

**Height Layers:**
- **Ground Level (0-2m):** Sidewalks, streets, ground shops, parked cars
- **Climbing Zone (2-6m):** Low walls, fences, shop windows, ledges, tree branches
- **Rooftop Zone (6-20m):** Building rooftops, water tanks, utility boxes, cat highways
- **Unreachable (20m+):** Tall building tops, visual landmarks only

**Vertical Exploration:**
- Multiple routes per area: ground level (fast, dangerous) vs. rooftop (safe, scenic)
- Skill progression unlocks higher surfaces
- Vertical vantage points reward exploration

### 4.4 PROCEDURAL GENERATION PIPELINE

**Terrain & City Layout:**
```
generateChunk(chunkX, chunkZ):
  ├─ Fractal Brownian Motion for height map (4 octaves, 0.5 persistence)
  ├─ Street network via path subdivision (organic grid)
  ├─ Building placement via constraint satisfaction
  ├─ Vegetation via stochastic point placement
  └─ Deco/props via instanced placement
```

**Asset Selection:**
- Building type based on noise values: rowhouse → apartment → villa → church
- Facade variation via procedural texturing (window patterns, material swaps)
- Tree species based on district theme and height map
- Street prop distribution (benches, trash cans, signs) via Poisson sampling

**Chunk System:**
- **Chunk Size:** 100m × 100m
- **Streaming Distance:** 400m (load 2 chunks ahead predictively)
- **Memory Budget:** <500 MB peak (400 MB asset cache + 100 MB physics/JS)
- **Unload Threshold:** Chunks >1000m away disposed

### 4.5 TIME-OF-DAY CYCLE

**24-Hour Cycle in Real-Time: 20 minutes**
- 1 real second = 72 game seconds
- 1 minute real-time = ~72 minutes game time

**Time-Based Light Progression:**
| Time | Sun Position | Ambient | Dir Light | Fog | NPCs | Mood |
|------|--------------|---------|-----------|-----|------|------|
| 04:00 | Below | 0.1 (blue) | -0.3 | 0.8 | Sleeping | Night, stars |
| 06:00 | 10° | 0.25 (purple) | 0.0 | 0.5 | Waking | Dawn, mist |
| 08:00 | 30° | 0.6 (pale) | 0.4 | 0.2 | Active | Morning |
| 12:00 | 70° zenith | 1.0 (white) | 1.0 | 0.02 | Peak | High noon |
| 16:00 | 45° west | 0.9 (golden) | 0.85 | 0.05 | High | Golden hour |
| 18:00 | 20° | 0.5 (orange) | 0.3 | 0.2 | Decrease | Sunset |
| 20:00 | Below | 0.15 (dark blue) | 0.0 | 0.6 | Low | Night, neon |
| 22:00 | Deep night | 0.05 | -0.5 | 0.85 | Minimal | Late night |

**Mechanics:**
- Street lights brighten 18:00-20:00, fixed once on
- Shadow direction rotates throughout day
- Fog density affects draw distance (performance optimization)
- NPC activity patterns shift hourly

### 4.6 WEATHER SYSTEM

**Weather Types & Transitions:**

| Weather | Probability | Duration | Particles | Effect |
|---------|------------|----------|-----------|--------|
| **Clear** | 60% | 40-120 min | None | Max visibility, bright |
| **Overcast** | 30% | 30-90 min | Soft diffuse | Fog +20%, desaturation |
| **Rain** | 20% | 20-60 min | 2000+ rain | Visibility -30%, wet surfaces, slipperiness |
| **Heavy Rain** | 10% | 10-30 min | Dense particles | Visibility -50%, thunder flashes, hazard zones |
| **Snow** | 40% (winter) | 30-120 min | Fluffy particles | Ethereal mood, slippery, paw prints |

**Weather Physics:**
- Rain/snow reduces jump height by 10%
- Wet surfaces increase slipperiness
- Wind affects tail physics and particle direction
- Thunder provides audio/visual drama with 2-3s delay

---

## PROGRESSION & GAMEPLAY LOOP

### CORE GAMEPLAY LOOP

**Micro Loop (5 seconds):**
1. Player moves through environment
2. Discovers nearby objects/NPCs/areas
3. Interacts (knock, talk, climb)
4. Observes feedback (sound, visual)
5. Plans next action

**Standard Loop (2 minutes):**
1. Explore new neighborhood section
2. Find 3-5 new objects to interact with
3. Encounter 1-2 NPCs
4. Complete small discovery (unlock area, collect item)
5. Decide: Continue exploring or return home

**Extended Loop (10 minutes):**
1. Quest objective: Reach location or find item
2. Navigate obstacles: Climb, jump, knock objects
3. Social interaction: Talk to NPCs, build relationships
4. Exploration bonus: Find hidden areas
5. Return to quest-giver or home for reward

### PROGRESSION SYSTEM (HYBRID APPROACH)

**Early Game (Hours 0-5): Story-Driven Onboarding**
- Clear objectives guide new players
- Luna introduces mechanics naturally
- Safe zones build confidence
- Tutorial challenges establish core skills

**Mid Game (Hours 5-20): Discovery-First Exploration**
- NPCs suggest areas but don't force it
- Player-driven exploration with soft gates
- Relationship building primary motivator
- Skill progression: Walk → Climb → Sprint

**Late Game (Hours 20-40): Challenge-Based Endgame**
- Optional challenge tiers unlock
- Speedrun/hardcore modes available
- Prestige system with cosmetic rewards
- Skill mastery (1-5 ranks per mechanic)

**Progression Triggers:**
- **Exploration:** Reach location → auto-unlock for future visits
- **Relationship:** +50 with NPC → new quests/areas revealed
- **Discovery:** Find collectible → unlock crafting/trades
- **Time:** In-game day advancement → new NPCs/events
- **Mastery:** Execute action 50+ times → skill automatically unlocked

### COLLECTIBLES & ACHIEVEMENTS

**Item Types:**

| Item | Location | Quantity | Use | Effect |
|------|----------|----------|-----|--------|
| **Yarn Balls** | Throughout | 20+ per area | Trade, happiness | +10% happiness per 5 collected |
| **Fish Treats** | Markets, water | 10+ per area | Eat for stamina | +20 stamina per treat |
| **Feathers** | Rooftops, parks | 15+ per area | Craft, collect | Cosmetic/trading material |
| **Badges** | Achievements | 15+ total | Prestige | Unlock cosmetics/abilities |

**Achievement Categories:**
- **Exploration:** Discovery-based (10 badges)
- **Interaction:** Knockable/climbing (8 badges)
- **Social:** NPC relationship (10 badges)
- **Mastery:** Skill perfection (5 badges)
- **Speedrun:** Time-based challenges (5 badges)

**Examples:**
- Knockers: Knock 50 objects → +50 XP, special tail animation
- Climber: Climb 500m cumulative → +100 XP, fast climbing unlock
- Collector: Gather 25 collectibles → +50 XP, collector's discount
- Perfectionist: 100% area completion → +200 XP, cosmetic unlock

### NPC RELATIONSHIPS

**Relationship Scale:** -100 to +100
- **-100 to -50:** Hostile, avoid interaction
- **-50 to 0:** Wary, minimal interaction
- **0 to +50:** Neutral, friendly interaction
- **+50 to +100:** Beloved, story unlocks, special dialogue

**Relationship Modifiers:**
- +5: Successful interaction, gifting item
- +2-3: Casual conversation, presence nearby
- -2: Knocking over NPC's favorite object
- -5: Breaking NPC's property
- -10: Aggressive behavior

**Story Arcs by NPC:**
- **Luna (Friendly Guide):** Teaches mechanics, reveals story
- **Shadow (Territorial):** Initially hostile, becomes ally
- **Sage (Wise Elder):** Mysterious, knows secrets, hard to befriend
- **Locals:** District-specific NPCs with unique quests

---

## PERFORMANCE BUDGETS & TARGETS

### 5.1 FRAME BUDGET BREAKDOWN

**Target: 60 FPS (16.67ms per frame)**

```
Frame Time Budget (16.67ms total):
├─ Input Processing:        1-2 ms (keyboard, mouse)
├─ AI/NPC Updates:          2-4 ms (pathfinding, decisions)
├─ Physics Simulation:      2-3 ms (rigid body solver)
├─ Camera Updates:          1-2 ms (look direction, position)
├─ Asset Streaming:         1-2 ms (queue management, decode)
├─ Culling/Visibility:      2-3 ms (frustum, occlusion)
├─ Renderer Setup:          1-2 ms (state changes, binds)
└─ GPU Rendering:           ~8 ms (draw calls, shading)
─────────────────────────────────
TOTAL:                   ~16 ms
```

**Fallback: 30 FPS (33ms per frame)** for RPi 4 with reduced draw calls

### 5.2 DRAW CALL BUDGET

**Target: <500 draw calls/frame on medium hardware**

| Component | Budget | Strategy |
|-----------|--------|----------|
| Terrain | 200 | Merged chunks, atlasing |
| Buildings | 100 | Instancing, LOD |
| NPCs | 30 | Bone animation pooling |
| Props | 80 | InstancedMesh, decals |
| UI | 10 | Canvas rendering |
| Post-process | 10 | Single pass |
| **Total** | **430** | **Headroom for buffer** |

### 5.3 MEMORY BUDGET

**Target: <500 MB peak (RPi 5 with 4GB)**

| Component | Allocation | Notes |
|-----------|-----------|-------|
| Geometry | 150 MB | Streamed chunks, LOD meshes |
| Textures | 250 MB | KTX2 compressed, mip-mapped |
| Audio | 30 MB | OGG Vorbis, streaming |
| Physics | 20 MB | Body/constraint data |
| JavaScript | 100 MB | Heap + allocations |
| **Total** | **550 MB** | **Slight headroom** |

**Texture VRAM Strategy:**
- Active chunks: 256 MB cache
- LRU eviction when >400 MB
- Compression ratio: 4-6x (KTX2 Basis)

### 5.4 NPC SCALING

| Hardware | Max NPCs | Draw Calls | AI Update |
|----------|----------|-----------|-----------|
| **RPi 5 (4GB)** | 20-30 | <500 | Nearby=1/frame, Far=1/5 frames |
| **RPi 4 (2GB)** | 10-15 | <300 | Nearby=1/5 frames, Far=1/10 frames |
| **Desktop (16GB)** | 100-200 | 1000-2000 | All=1/frame |

**NPC Population Mechanics:**
- Load/unload based on chunk proximity (similar to geometry)
- Only simulate 20-30 near player at full fidelity
- Distant NPCs use simplified schedules (idle/wander only)
- Total world NPCs can be 90+; active simulated = 20-30

---

## DEVELOPMENT PHASES

### PHASE 1: MVP (Weeks 1-6)

**Goal:** Playable cat movement and basic exploration in one neighborhood

**Deliverables:**
- ✅ Three.js scene with 100m×100m chunk
- ✅ Player movement (WASD, mouse look, jump)
- ✅ Physics engine (Cannon-es) integration
- ✅ 5-10 knockable objects with audio/physics
- ✅ 2-3 climbable surfaces (tree, fence)
- ✅ 5-10 NPCs with basic routines
- ✅ Time-of-day system (simplified)
- ✅ Basic UI (stamina bar, collectibles counter)
- ✅ Save/load system (localStorage)

**Performance Target:** 60 FPS on desktop, 30 FPS on RPi 5

**Team:** 2-3 developers (engine, gameplay, art)

### PHASE 2: FULL WORLD (Weeks 7-14)

**Goal:** Complete 4-neighborhood city with procedural generation

**Deliverables:**
- ✅ Procedural generation pipeline (all 4 neighborhoods)
- ✅ 16 chunks (4×4 km² city) with streaming
- ✅ 30+ NPCs with daily routines and relationships
- ✅ 100+ collectibles distributed across world
- ✅ Complete time-of-day cycle with weather
- ✅ Dynamic lighting system
- ✅ Audio soundscape (ambient, SFX, music)
- ✅ Interaction system (doors, windows, vehicles)
- ✅ Tutorial quest line

**Performance Target:** 60 FPS on desktop, 45 FPS on RPi 5

**Team:** 3-4 developers (engine, gameplay, art, audio)

### PHASE 3: POLISH & OPTIMIZATION (Weeks 15-20)

**Goal:** Performance optimization, balance, accessibility

**Deliverables:**
- ✅ Achieve 60 FPS stable on RPi 5
- ✅ Draw call optimization (<500 target)
- ✅ Texture compression (KTX2 Basis)
- ✅ Mesh compression (Draco)
- ✅ Accessibility features (colorblind modes, audio cues)
- ✅ Dialogue system (10+ major NPCs)
- ✅ Challenge system (5 difficulty tiers)
- ✅ Cosmetics/skins system
- ✅ Quality assurance pass

**Performance Target:** 60 FPS RPi 5, 120 FPS desktop, <500 MB memory

**Team:** 2-3 developers (optimization, QA)

### PHASE 4: POST-LAUNCH CONTENT (Ongoing)

**Potential Additions:**
- New Game+ mode with additional NPCs/areas
- Seasonal events (holiday decorations, special NPCs)
- Multiplayer social features (share discoveries)
- Mobile version (touch controls, gyroscopic look)
- Modding tools for community content
- Leaderboards (speedrun times, collection count)
- Story DLC (additional narrative campaigns)

---

## RISK REGISTER & MITIGATION

### CRITICAL RISKS (Must address before implementation)

**NONE IDENTIFIED**

All critical systems have documented fallbacks:
- Physics engine (Cannon.js → custom AABB if needed)
- Performance optimization (adaptive quality fallback)
- Asset streaming (database cache → runtime generation)

### MEDIUM RISKS (Monitor during implementation)

| Risk | Severity | Probability | Mitigation | Validation |
|------|----------|------------|-----------|-----------|
| **NPC Population Scaling** | MEDIUM | MEDIUM | LOD AI + spatial hashing; profile early | Test 50+ NPCs on RPi 5 |
| **Draw Call Budget on RPi** | MEDIUM | MEDIUM | Instancing + texture atlasing non-negotiable | Monthly FPS testing |
| **Physics Simulation Accuracy** | MEDIUM | LOW | Cannon.js sphere instability → box colliders | Test knockback @ 60 FPS |
| **Procedural Generation Variability** | LOW | LOW | Seed-based determinism; test replayability | Generate 10 city seeds |
| **Dialogue Authoring Scope** | MEDIUM | MEDIUM | Procedural generation + templated dialogue | Design 10 NPC trees |

### LOW RISKS (Document & monitor)

1. **Audio Synthesis Quality:** Oscillator meows may sound artificial (acceptable for stylized game)
2. **Lighting Bake Quality:** Pre-baked shadows may look static during day/night (trade-off accepted)
3. **Texture Compression Artifacts:** KTX2 may show banding in sky/water (mitigated via post-processing)
4. **Replayability:** Procedural world may feel repetitive on 2nd playthrough (mitigate via New Game+ changes)

### IMPLEMENTATION GOTCHAS

**Critical Consistency Points:**
1. **Movement Speed Coherence:** Use 5 m/s walk, 10 m/s sprint (confirmed across all docs)
2. **Camera Height:** 0.25m (compromise between architecture & environment specs)
3. **NPC Population:** Clarify per-chunk density vs. total world NPCs (load/unload system)
4. **Stamina Economy:** Validate depletion/recovery rates during playtesting
5. **Procedural Determinism:** Ensure seeded generation produces consistent worlds

---

## DESIGN SIGN-OFF

**Document Created:** 2026-07-10  
**Status:** APPROVED FOR IMPLEMENTATION  
**Author:** Technical Lead (Synthesizer)  
**Reviewed By:** Architect, Designer, Environment Specialist, Director  

**Key Decision Summary:**
- ✅ Three.js + Cannon-es stack approved for WebGL 2.0 on RPi 5
- ✅ Hybrid progression system (Story→Discovery→Challenge) recommended
- ✅ 4 neighborhoods, 4 km² world with procedural generation
- ✅ 60 FPS desktop, 30 FPS RPi 4, 60 FPS RPi 5 targets achievable
- ✅ All critical systems have fallbacks; implementation can begin immediately

**Next Steps:**
1. Set up development environment (Three.js boilerplate, build pipeline)
2. Implement core movement system and physics integration
3. Create first neighborhood chunk and streaming pipeline
4. Playtest MVP on RPi 5 to validate performance assumptions
5. Iterate on design based on playtesting feedback

---

**End of GAME_SPEC.md**
