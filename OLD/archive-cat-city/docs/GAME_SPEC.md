# Cat City FPS - Comprehensive Game Specification

**Version:** 1.0  
**Last Updated:** July 2026  
**Status:** Ready for Implementation  
**Target Platform:** Web (ThreeJS), Browser-based, RPi/Desktop Compatible

---

## Executive Summary

### Vision
Cat City is an immersive first-person adventure game where players experience the urban world from the unique perspective of a cat. Unlike traditional FPS games designed for human players, Cat City reimagines the city as a vast, wondrous landscape from a cat's eye view (~30cm height). The game emphasizes exploration, discovery, physics-based interactions, and the quirky behavior patterns of feline protagonists navigating human spaces.

### Unique Features
1. **Cat Perspective Physics** - Camera positioned at cat height (0.3m), affecting perception of scale, jump mechanics, and interaction opportunities
2. **Environmental Interactivity** - Physics-enabled knockable objects, climbable surfaces, and destructible elements respond realistically to player actions
3. **NPC Cat AI** - Dynamic behavior trees for non-player cats with realistic behaviors (hunting, grooming, territorial interactions)
4. **Procedural City Generation** - Infinite, algorithmically-generated neighborhoods using Perlin noise and cellular automata
5. **Discovery-Based Progression** - Unlock new areas and abilities through exploration rather than linear quests
6. **Meow-Based Communication** - Cat vocalizations serve as both player feedback and NPC interaction mechanic

### Target Player Experience
- **Casual Exploration** - Relaxing city traversal with no combat pressure
- **Physics Playground** - Emergent gameplay through environmental interactions (knocking things over, climbing)
- **Achievement/Mastery** - Unlock skills, collectibles (yarn balls, fish), and new areas
- **Story Discovery** - Narrative emerges through environmental storytelling and NPC interactions
- **Performance Stability** - Smooth 60 FPS gameplay on Raspberry Pi 5 (target minimum hardware)

---

## Core Pillars of Game Design

### Pillar 1: Authentic Cat Perspective
The entire game is designed from a cat's point of view. Scale, physics, and interactions must reflect how a cat would experience the world. Objects that seem small to humans are significant obstacles or opportunities to cats. Jump mechanics, climb mechanics, and movement speeds are calibrated for feline physiology.

### Pillar 2: Emergent Physics-Driven Gameplay
Rather than scripted sequences, gameplay emerges from player interaction with a responsive physics environment. Players discover unintended uses for objects, find creative solutions to navigation challenges, and create memorable moments through physical interaction.

### Pillar 3: Exploration Over Combat
The game rewards curiosity, not reflexes. There are no enemies to fight or health bars to manage. Instead, players are driven to explore every corner of the city, discover hidden areas, collect unique items, and interact with fascinating NPCs.

### Pillar 4: Procedural Content Generation
The city is infinite and generated algorithmically with consistent rules. Each building, street, and neighborhood is created using seeded noise functions, ensuring variety while maintaining coherence and allowing for dynamic content updates.

### Pillar 5: Tight Performance & Accessibility
The game runs flawlessly on modest hardware (RPi 5, 4GB RAM, integrated GPU). Performance targets of 60 FPS, <500 draw calls, and <500MB memory usage are hard constraints, not aspirations. This accessibility principle ensures the game is playable on consumer hardware without expensive GPUs.

---

## Technical Architecture Overview

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Engine** | ThreeJS (WebGL) | Browser-native, no installation, runs on RPi |
| **Physics** | Cannon.js or custom | Lightweight, JavaScript-native, suitable for cat scale |
| **Rendering** | WebGL 1.0 support | RPi Broadcom GPU supports GL 1.0, minimal extensions |
| **Audio** | Web Audio API | Spatial audio support, browser-native |
| **Persistence** | IndexedDB / LocalStorage | Client-side save/load, no server dependency |
| **Build** | Vite + Rollup | Fast development builds, optimized production bundles |
| **Deployment** | Static HTML/JS | Host on any web server or local file:// access |

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
│  (HUD, Crosshair, Debug Panel, Mobile Controls)         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│               Game Systems Orchestration                │
│  (GameEngine, Clock, Frame Limiter, State Manager)      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────┬──────────────┐
│      Core Game Systems                   │ Support      │
├──────────────────────────────────────────┼──────────────┤
│ SceneManager (ThreeJS)                   │ InputManager │
│ PlayerController                         │ AudioMgr     │
│ CameraController (Mouse Look)            │ SaveLoad     │
│ WorldManager (Chunks/Streaming)          │ Performance  │
│ PhysicsEngine (Interactions)             │ Monitor      │
│ NPCSystem (AI Behaviors)                 │              │
└──────────────────────────────────────────┴──────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Asset & Data Management                    │
│  (AssetManager, StreamingManager, ProceduralGenerator)  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Three.js + WebGL                      │
│         (Renderer, Materials, Shaders, GPU)             │
└─────────────────────────────────────────────────────────┘
```

### ThreeJS Rendering Pipeline

1. **Scene Setup** - Single persistent scene with dynamic object pooling
2. **Camera System** - PerspectiveCamera at cat height (0.3m), 75° FOV, 0.1-5000m clipping
3. **Lighting** - Directional sun (with shadows), ambient light, hemisphere light for outdoor feel
4. **Rendering** - WebGL renderer with shadow mapping, progressive asset loading
5. **Post-Processing** - Optional FXAA anti-aliasing, fog for performance
6. **LOD System** - Geometry detail levels based on distance to player

---

## System Specifications

### 1. Movement System

#### Core Mechanics
- **Walking Speed** - 5 m/s (cat-appropriate pace)
- **Sprint Speed** - 10 m/s (with stamina cost over time)
- **Jump Force** - Initial upward velocity ~15 units/frame
- **Gravity** - 0.5 units/frame² (tuned for cat jumping)
- **Ground Friction** - 0.1 (provides responsive stopping)
- **Air Friction** - 0.02 (reduces mid-air control)

#### Input Controls
- **WASD / Arrow Keys** - 8-directional movement
- **Space** - Jump (cat meow on jump trigger)
- **Shift** - Sprint toggle
- **Mouse Look** - Pointer lock for FPS-style camera
- **Click** - Interact with nearby objects
- **F1** - Toggle debug panel
- **E** - Examine/pickup objects

#### Special Movement Mechanics
- **Climbing** - Physics raycasts detect climbable surfaces (vertical walls, ropes, trees)
- **Ledge Grab** - Automatic grab on surfaces just above jump reach
- **Ceiling Crawl** - Cats can traverse horizontal surfaces on ceilings (experimental)
- **Swimming** - Reduced gravity in water, stamina consumption

#### Animation Integration
- **Idle Pose** - Sitting, grooming, stretching
- **Movement Cycle** - Smooth blending between walk/run animations
- **Jump Anticipation** - Crouch before jump, arc during flight, landing impact
- **Impact Feedback** - Plays meow on hard landings

### 2. Physics System

#### Rigid Body Dynamics
- **Player Body** - Sphere collider at cat hip height (0.15-0.35m)
- **Object Interactions** - Box/sphere colliders for all interactive props
- **Constraint Solving** - Iterative solver for stable stacking
- **Collision Channels** - Player, Props, Static, Kinematic (door frames, elevators)

#### Physics Objects
- **Knockable Objects** - Vases, bottles, papers, books (low mass, high friction)
- **Climbable Surfaces** - Fences, trees, buildings (no collision below, climbable above)
- **Destructible Elements** - Glass windows, wooden crates, paper screens
- **Environmental Forces** - Wind (affects lightweight objects), water currents

#### Physics Optimization
- **Sleeping** - Inactive bodies enter sleep state after 2 seconds inactivity
- **Spatial Partitioning** - Quad-tree for broad-phase collision detection
- **Constraint Reduction** - Non-critical collisions processed at 30 Hz
- **Predictive Collision** - Continuous collision detection for fast-moving objects

### 3. Rendering System

#### Scene Structure
- **Active Scene** - Single persistent THREE.Scene()
- **Chunk System** - Loaded chunks culled via frustum and distance
- **Object Pooling** - Pre-allocated object buffers to reduce GC pressure
- **Batch Rendering** - Merged geometries for identical objects (cars, buildings)

#### Material System
- **Standard Materials** - MeshPhongMaterial for most geometry (performance)
- **Instancing** - Merged meshes for 100+ identical objects (streetlights, railings)
- **Texture Atlas** - Combined textures reduce draw calls
- **Dynamic Materials** - Time-varying shaders for water, clouds, fire

#### Performance Targets
- **Draw Calls** - <500 per frame
- **Triangles** - <500K per frame (visible + shadow passes)
- **Textures** - <50 loaded simultaneously
- **Memory** - <300MB scene + assets (including system memory)

#### Visual Features
- **Shadows** - PCF shadows from directional sun (512x512 → 2048x2048 resolution scaling)
- **Fog** - Exponential fog for distance culling (100-2000m based on time of day)
- **Lighting** - Dynamic time-of-day affecting sun intensity and color
- **Weather** - Particle effects (rain, snow) dynamically added/removed
- **Post-Effects** - FXAA anti-aliasing, optional bloom

### 4. AI System (NPC Cats & Humans)

#### Behavior Tree Architecture
```
Root (Selector)
├── Emergency Flee (High Priority)
├── Hunting State
│   ├── Detect Prey
│   ├── Stalk
│   └── Pounce/Catch
├── Social Interaction
│   ├── Find Other Cat
│   ├── Approach & Greet
│   └── Play/Fight
├── Routine Behavior
│   ├── Rest (based on time)
│   ├── Groom & Stretch
│   ├── Patrol Territory
│   └── Eat/Drink (find food/water)
└── Idle
    ├── Sit & Watch
    ├── Nap
    └── Wander
```

#### NPC Parameters
- **Personality Type** - Aloof, Friendly, Grumpy, Playful (affects behavior selection)
- **Territory** - Each NPC has home area (2-5 chunks), defends against intruders
- **Relationship** - Player reputation with NPCs affects interactions
- **Memory** - Simple memory of player (friendly petting = positive)
- **Schedules** - Time-based routines (nocturnal vs diurnal)

#### Human NPCs
- **Activity Patterns** - Realistic routines (commute, work, meals, sleep)
- **Awareness** - Detect player cat, may react with surprise/delight/annoyance
- **Interaction Depth** - Can pet player cat, may leave food, occasionally offer quest-like tasks

#### Performance Optimization
- **LOD Behavior** - Distant NPCs use simpler behavior (less frequent updates)
- **Sleep State** - Off-screen NPCs pause updates entirely
- **Prediction** - Estimate future positions for visibility culling
- **Pooling** - Reuse NPC objects when population changes

### 5. Audio System

#### Sound Categories
| Category | Examples | Behavior |
|----------|----------|----------|
| **Player Actions** | Meow, Purr, Hiss, Footsteps | 3D spatial, real-time |
| **Environmental** | Traffic, Wind, Rain, Ambient | Looped, distance-attenuated |
| **NPC Vocalizations** | Cat meows, Human voices | 3D spatial, behavior-triggered |
| **UI Feedback** | Menu beeps, Selection sounds | 2D, immediate |
| **Music** | Dynamic ambient score | 2D, time-of-day based |

#### Spatial Audio
- **Audio Listener** - Attached to camera, moves with player
- **3D Positioning** - All sound sources have 3D position in world
- **Rolloff** - Inverse distance attenuation, max distance 100m
- **Doppler** - Slight pitch shift for moving sources

#### Dynamic Audio
- **Time-of-Day** - Music intensity increases at night (fear/mystery)
- **Weather Integration** - Rain/wind volume based on active effects
- **Distance Filtering** - High-frequency rolloff for distant sounds
- **Compression** - Real-time compression to prevent clipping

#### Audio Assets (Procedurally Generated)
- **Meow Variations** - 10+ meow types (surprise, pain, greeting, demand)
- **Footstep Variety** - Concrete, grass, metal, wood surface sounds
- **Environmental Mix** - City ambience varies by district (residential, commercial)

### 6. Save/Load System

#### Data Persistence
- **Save Format** - JSON (human-readable, debuggable)
- **Storage** - IndexedDB (persistent, 50MB+ quota on most browsers)
- **Auto-Save** - Every 30 seconds to backup slot
- **Save Slots** - 5 independent saves + auto-save slot

#### Save Data Structure
```json
{
  "version": "1.0",
  "timestamp": 1689000000,
  "playtime": 3600,
  "checkpoint": {
    "playerPosition": [100, 0.3, -150],
    "playerRotation": [0, 1.5, 0],
    "timeOfDay": 14.5
  },
  "world": {
    "loadedChunks": [[0, 0], [1, 0], [0, 1]],
    "generationSeed": 42,
    "modifiedObjects": {
      "building_123": {"rotation": [0, 0.1, 0]},
      "knocked_vase_456": {"position": [50, 0, -100], "destroyed": true}
    }
  },
  "progression": {
    "unlockedAreas": ["spawn", "park", "residential_1"],
    "skills": ["fast_jump", "climb_high"],
    "collectibles": {"yarn_balls": 3, "fish": 1},
    "achievements": ["first_jump", "found_park", "met_10_cats"]
  },
  "npcState": {
    "cat_1": {"position": [50, 0, -50], "lastSeen": 3590, "reputation": 50},
    "human_1": {"lastInteraction": 3500, "trust": 75}
  }
}
```

#### Save Management
- **Quick Save** - Press F5 to save to auto-slot
- **Load Game** - Press F9 to load from auto-slot
- **Slot Management** - In-game menu for manual slot selection
- **Cloud Sync** - Optional: sync to browser storage across devices (future)

### 7. Procedural Generation System

#### City Structure Algorithm

**Input:** Seed, Chunk Coordinates (X, Y)  
**Output:** Building placement, street routing, object distribution

```
1. Noise-Based Zoning
   - Use Perlin noise at various scales to determine zone types
   - Zone 0: Residential (single-family homes)
   - Zone 1: Commercial (offices, shops)
   - Zone 2: Industrial (warehouses, factories)
   - Zone 3: Parks & Green Space

2. Street Network Generation
   - Major streets: Grid-based with 500m spacing
   - Minor streets: Organic branching using space colonization
   - Cross-sections: 20-40m wide (proportional to cat perspective)
   - Intersections: Traffic lights, crosswalks, street furniture

3. Building Generation
   - Building footprint: Assigned based on lot size and zone
   - Height: Perlin noise determines number of floors (1-20)
   - Architecture: Style determined by zone + local noise
   - Facade: Windows, doors, details procedurally placed
   - Entryways: Doors and ramps positioned at street level

4. Object Distribution
   - Street furniture: Benches, trash cans, fire hydrants, poles
   - Parked cars: Aligned to streets, variety of models/colors
   - Vegetation: Trees, bushes, flower planters, street gardens
   - Signs: Business signs, street signs, warning signs
   - Clutter: Details unique to zone (industrial vs residential)
```

#### Noise Functions
- **Primary Perlin Noise** - Z scale: Octaves=4, Frequency=0.01, Persistence=0.5
- **Secondary Simplex** - Detail scale: Octaves=5, Frequency=0.05
- **Tertiary Cellular** - Building clustering: Voronoi cells with randomization

#### Generation Parameters by Zone

| Zone | Residential | Commercial | Industrial | Parks |
|------|-------------|-----------|-----------|-------|
| **Density** | Medium (30%) | High (70%) | Medium (40%) | Low (10%) |
| **Building Heights** | 2-6 floors | 3-20 floors | 1-4 floors | N/A |
| **Street Width** | 20m | 40m | 50m | N/A |
| **Walkways** | Yes | Yes | Minimal | Yes |
| **Vegetation** | Moderate | Low | Minimal | High |
| **Parking** | High | Medium | High | Low |

#### LOD System (Level of Detail)

```
Distance from Player | Detail Level | Visible | Draw Calls | Simplification
<50m                 | Full (LOD0)  | All     | High       | None
50-200m              | High (LOD1)  | >90%    | Med        | -25% triangles
200-500m             | Med (LOD2)   | >70%    | Low        | -60% triangles
500-1000m            | Low (LOD3)   | >30%    | Very Low   | -85% triangles
>1000m               | Minimal      | Silhouette | 1 call | Single billboard
```

#### Streaming System
- **Chunk Size** - 100m x 100m x 50m (height)
- **Load Distance** - 500m (5 chunk radius)
- **Unload Distance** - 1000m (10 chunk radius)
- **Load Priority** - Player direction first, then distance
- **Background Loading** - Assets load over 3-5 frames to prevent frame hitches

---

## World Design and Procedural Generation

### City Neighborhoods

The generated city contains distinct neighborhoods with unique characteristics:

#### Neighborhood 1: Residential District
- **Character** - Quiet, tree-lined streets, single/multi-family homes
- **Building Types** - Townhouses, apartments, small shops
- **Atmosphere** - Safe, peaceful, kid-friendly
- **NPCs** - Families, retirees, busy commuters
- **Unique Features** - Community gardens, playgrounds, sidewalk cats

#### Neighborhood 2: Commercial Zone
- **Character** - Bustling, diverse, mixed-use buildings
- **Building Types** - Retail, restaurants, offices, entertainment
- **Atmosphere** - Vibrant, crowded, economic energy
- **NPCs** - Shop owners, customers, street performers
- **Unique Features** - Cafes (especially cat cafes), markets, sidewalk seating

#### Neighborhood 3: Industrial Area
- **Character** - Raw, utilitarian, functional
- **Building Types** - Factories, warehouses, maintenance facilities
- **Atmosphere** - Gritty, mysterious, dangerous for cats
- **NPCs** - Workers, security guards, occasional homeless
- **Unique Features** - Loading docks, pipes and infrastructure, hidden passages

#### Neighborhood 4: Urban Park
- **Character** - Natural refuge, recreational
- **Building Types** - Park structures (gazebos, restrooms, concessions)
- **Atmosphere** - Relaxing, natural, discovery-focused
- **NPCs** - Joggers, families, homeless people with cats
- **Unique Features** - Water features, wooded areas, open fields, hidden trails

#### Neighborhood 5: Nightlife District
- **Character** - Entertainment, clubs, restaurants
- **Building Types** - Bars, restaurants, theaters, galleries
- **Atmosphere** - Energetic, sensory-rich, active at night
- **NPCs** - Musicians, performers, late-night workers
- **Unique Features** - Neon signs, outdoor seating, alleys for sneaking

### Environmental Systems

#### Time of Day Cycle
- **6:00 AM** - Dawn, low sun angle, cool colors, birds singing
- **10:00 AM** - Morning, medium sun, vibrant colors, human activity peaks
- **6:00 PM** - Evening, warm orange sun, golden hour lighting, rush hour
- **10:00 PM** - Night, moon-lit, street lights glow, reduced NPC activity
- **2:00 AM** - Deep night, dark, mysterious, nocturnal cat activity

The cycle repeats every 48 in-game minutes (1 in-game minute = 1 real second), allowing players to experience day/night cycles without long waits.

#### Weather System
- **Clear Sky** - Normal visibility, optimal conditions
- **Overcast** - Reduced light, more atmospheric
- **Light Rain** - Wet ground, particle effects, increased ambient sound
- **Heavy Rain** - Reduced visibility, splashes, thunder, NPCs seek shelter
- **Snow** - Winter aesthetic, slower movement, particle trails
- **Wind** - Affects lightweight objects, particle effects

Weather changes occur every 10-20 game minutes.

#### Seasonal Variation (Future)
- **Spring** - Flowers blooming, birds active, mild weather
- **Summer** - Hot, bright, vibrant colors, pool areas appear
- **Autumn** - Falling leaves, cooler, darker lighting
- **Winter** - Snow, frost, darker evenings, heating vents steam

---

## Progression and Gameplay Loop

### Primary Gameplay Loop

```
1. EXPLORE
   ↓
2. DISCOVER (new area, NPC, object, skill)
   ↓
3. INTERACT (with environment or NPC)
   ↓
4. COLLECT (items, reputation, knowledge)
   ↓
5. UNLOCK (new area, ability, achievement)
   ↓
6. REPEAT (with new unlocked content)
```

### Discovery Mechanics

**Area Discovery**
- Each neighborhood is locked behind a "threshold" (a specific landmark or achievement)
- Example: "First Park Area" unlocks only after player reaches the park boundaries
- Subsequent areas unlock through progression (exploring 3 parks → can visit industrial area)
- Visual cues (barriers, visible inaccessible areas) suggest locked content

**NPC Discovery**
- NPCs appear dynamically based on time of day and location
- Player can initiate conversation with any NPC by approaching within 3 meters
- Each NPC has unique dialogue and can suggest areas/items to find
- Reputation system: interactions affect how NPCs treat the player

**Collectible Discovery**
- Yarn balls (10 total per neighborhood): Player finds by exploring thoroughly
- Fish (5 per neighborhood): Located near water features and fish markets
- Special items: Unique discoveries (keys, rare toys, mysterious artifacts)

**Skill Discovery**
- **Fast Jump** - Unlocked after successful jump over 2m gap
- **Climb High** - Unlocked after reaching 3m height on a surface
- **Sprint Mastery** - Unlocked after sprinting for 100m total distance
- **Night Vision** - Unlocked after playing during night cycle
- **Meow Mastery** - Unlocked after interacting with 5+ NPCs

### Progression Path (Week-by-Week Suggested Order)

**Week 1: MVP Exploration & Core Loop**
- Start in spawn area (small park)
- Discover first neighborhood (residential)
- Meet first NPC cat
- Unlock first skill (fast jump)
- Play session target: 20-30 minutes

**Week 2: Content Expansion & Depth**
- Unlock 2-3 new neighborhoods
- Increase NPC variety (humans, different cat personalities)
- Introduce time-of-day effects
- Add collectible quest line (find 10 yarn balls)
- Play session target: 45-60 minutes

**Week 3: Systems Integration & Challenge**
- Weather system active
- Skill progression system full featured
- Advanced NPCs with complex behaviors
- Hidden area discovery (secret passages, rooftop routes)
- Play session target: 60+ minutes

**Week 4: Polish & Replayability**
- All neighborhoods fully populated
- Achievement system active
- Performance optimization complete
- Content generation refinement
- New Game+ mode (similar layout, different seed)

### Progression Gates

The game gates content through a simple stat-based system:

```
Player Level = (Discoveries + Skills + Collectibles + NPCReputation) / 4

| Level | New Content Unlocked |
|-------|----------------------|
| 0-10 | Spawn area, 1 neighborhood |
| 11-25 | Commercial district, more NPCs |
| 26-40 | Industrial area, advanced skills |
| 41-60 | Park area, night cycles |
| 61-100 | Secret areas, all neighborhoods |
```

### Unlockables System

**Abilities (Unlocked by Achievement)**
- Double Jump (reach 5m height in one jump)
- Wall Climb (reach top of 10m building)
- Sprint Boost (run for 200m without stopping)
- Stealth Walk (move silently, pets become less aware)
- Sonic Meow (loud meow damages fragile objects)

**Areas (Unlocked by Progression)**
- Spawn Park (starts unlocked)
- Residential District (after first NPC interaction)
- Commercial Zone (after collecting 5 items)
- Industrial Area (after reaching level 25)
- Underground Passages (after finding 3 secret routes)
- Rooftop Network (after reaching 20m height)

**Cosmetics (Unlocked by Collection)**
- Different meow sounds (find 5 yarn balls)
- Collar colors (meet 10 unique NPCs)
- Tail variations (find all fish in an area)
- Special animations (complete neighborhood collectible sets)

---

## Performance Budgets and Targets

### Frame Rate & Latency
- **Target FPS** - 60 FPS consistent
- **Min FPS** - 45 FPS (absolute minimum acceptable)
- **Frame Time** - 16.67ms max (60 FPS), 22.22ms max (45 FPS)
- **Input Lag** - <33ms mouse-to-pixel (2 frame latency max)

### Memory Budgets

| Component | Budget | Monitoring |
|-----------|--------|-----------|
| Scene Graph | 50MB | Object count per chunk |
| Loaded Textures | 100MB | Streaming manager |
| Audio Buffers | 50MB | Audio manager |
| NPC State | 10MB | Update frequency |
| Procedural Cache | 20MB | Seed-based generation |
| **Total Target** | **<300MB** | Performance monitor |

### Rendering Budgets

| Metric | Target | Method |
|--------|--------|--------|
| Draw Calls | <500 | Instancing, batch rendering |
| Triangles/Frame | <500K | LOD system, culling |
| Textures Active | <50 | Atlasing, streaming |
| Unique Materials | <100 | Material pooling |
| Shadow Maps | <10 | Selective shadows |

### CPU Budgets (16.67ms frame time)

| System | Allocation | Budget |
|--------|-----------|--------|
| Physics Update | 2ms | Narrow/broad phase, sleeping |
| NPC Behavior | 2ms | Behavior tree updates |
| Procedural Gen | 1ms | Chunk generation steps |
| Audio Update | 0.5ms | Spatial audio, listener |
| Input Processing | 0.5ms | Polling, raycasts |
| Asset Loading | Variable | Background streaming |
| **Render Time** | 10ms | GPU limited |

### Target Hardware Profiles

**Baseline (Raspberry Pi 5, 4GB RAM)**
- CPU: ARM Cortex-A76, 2.4 GHz (4 cores)
- GPU: VideoCore VII
- RAM: 4GB shared
- Storage: 64GB microSD
- Expected FPS: 45-60 (avg 55)

**Recommended (Desktop, Intel i5/Ryzen 5)**
- CPU: 6-core modern processor
- GPU: 4GB dedicated VRAM (GTX 1650 or better)
- RAM: 8GB+ system RAM
- Storage: SSD (2GB available)
- Expected FPS: 60+ (avg 90+)

**Optimal (High-end Desktop/Laptop)**
- CPU: 8+ core modern processor
- GPU: 8GB dedicated VRAM (RTX 3060 or better)
- RAM: 16GB+ system RAM
- Storage: SSD (2GB available)
- Expected FPS: 120+ (avg 144+)

### Optimization Targets During Development

**Week 1 MVP**
- Target: 60 FPS on i5 (desktop development machine)
- Avoid: Complex shaders, real-time shadows
- Accept: Lower visual quality, fewer NPCs

**Week 2 Content**
- Target: 60 FPS on i5, 45+ FPS on RPi 5
- Implement: LOD system, asset streaming
- Refine: Shader complexity based on hardware

**Week 3 Systems**
- Target: Maintain 60 FPS on RPi 5 with weather effects
- Focus: CPU optimization (NPC updates, physics)
- Implement: Frame pacing, adaptive resolution

**Week 4 Polish**
- Target: 60 FPS stable on RPi 5, 90+ FPS on desktop
- Final pass: Profiling, hot-path optimization
- Release: Performance locked at 60 FPS for consistency

---

## Development Phases

### Phase 1: MVP - Core Loop (Week 1)

**Objectives**
- Establish working ThreeJS game engine
- Implement FPS player movement and camera
- Create basic city chunk with buildings
- Implement simple physics for player collision
- Basic HUD showing position/FPS
- Procedural city generation for single neighborhood

**Deliverables**
1. SceneManager.js - Complete scene/camera/lighting setup
2. PlayerController.js - Movement, jumping, basic physics
3. CameraController.js - Mouse look, FPS controls
4. GameEngine.js - Main loop, orchestration
5. WorldManager.js - Chunk loading/unloading
6. ProceduralCity.js - Basic noise-based generation
7. index.html - Game entry point with UI
8. Performance: 60 FPS on desktop, 45+ FPS on RPi 5

**Team Assignment (Multi-Agent Swarm)**
- **Scene Architect** → SceneManager, CameraController
- **Physics Specialist** → PlayerController, basic collision
- **Procedural Designer** → ProceduralCity, WorldManager
- **Integration Lead** → GameEngine, coordinating all systems

**Testing Criteria**
- ✓ Game loads without errors
- ✓ Player can move WASD, jump Space, look with mouse
- ✓ City chunk generates procedurally
- ✓ No frame drops below 45 FPS on target hardware
- ✓ HUD displays correct player position and FPS

---

### Phase 2: Content Expansion (Week 2)

**Objectives**
- Expand city to 3-5 neighborhoods
- Implement time-of-day lighting system
- Create NPC system with basic behavior trees
- Add interactive object physics (knockable items)
- Implement collectible system (yarn balls, fish)
- Add audio system with spatial sound

**Deliverables**
1. EnvironmentManager.js - Time of day, weather system
2. NPCSystem.js - Behavior trees, NPC spawning
3. InteractiveObjects.js - Physics-enabled interactions
4. CollectibleSystem.js - Tracking, UI feedback
5. AudioManager.js - Spatial audio, 3D sound positioning
6. SaveLoadSystem.js - Game state persistence
7. Extended procedural city with 3+ neighborhoods
8. Performance: 60 FPS maintained, streaming system active

**Team Assignment**
- **Environment Designer** → EnvironmentManager, neighborhoods
- **NPC Programmer** → NPCSystem, behavior trees
- **Physics Engineer** → InteractiveObjects, interactions
- **Audio Specialist** → AudioManager with spatial effects
- **Persistence Expert** → SaveLoadSystem

**Testing Criteria**
- ✓ Multiple neighborhoods load/unload correctly
- ✓ Sun rotates, lighting changes with time
- ✓ NPCs spawn, move, and interact with environment
- ✓ Objects knock over with realistic physics
- ✓ Collectibles tracked, saved between sessions
- ✓ Audio plays spatially, fades with distance
- ✓ 60 FPS sustained on RPi 5

---

### Phase 3: System Integration (Week 3)

**Objectives**
- Implement progression/unlock system
- Add weather effects (rain, snow, wind)
- Create skill progression system
- Implement achievement system
- Optimize rendering pipeline (LOD, batching)
- NPC daily routines and schedules

**Deliverables**
1. ProgressionSystem.js - Level gates, unlocks
2. SkillSystem.js - Skill unlocks, player stats
3. AchievementSystem.js - Track, notify achievements
4. WeatherSystem.js - Dynamic effects, particle systems
5. RenderingOptimizer.js - LOD, frustum culling, batching
6. NPCScheduling.js - Daily routines, time-based behavior
7. Performance profiler and optimization report

**Team Assignment**
- **Game Designer** → ProgressionSystem, SkillSystem
- **Graphics Programmer** → RenderingOptimizer, LOD
- **NPC Specialist** → NPCScheduling, advanced AI
- **Effects Artist** → WeatherSystem, particles
- **Performance Engineer** → Profiling, optimization

**Testing Criteria**
- ✓ Skills unlock correctly based on achievements
- ✓ Weather changes every 10-20 minutes
- ✓ Rendering optimizations reduce draw calls by 40%+
- ✓ NPCs follow daily schedules (awake at day, sleep at night)
- ✓ 60+ FPS on RPi 5, 90+ FPS on desktop
- ✓ Memory stable, no leaks detected over 1+ hour play

---

### Phase 4: Polish & Release (Week 4)

**Objectives**
- Final content pass (bug fixes, balance)
- Performance optimization final pass
- UI/UX refinement and polish
- Cross-browser testing
- Mobile support (touchscreen controls)
- Documentation and release preparation

**Deliverables**
1. Polished UI (menus, settings, controls customization)
2. Cross-browser compatibility report
3. Mobile controls implementation
4. Performance benchmarks on target hardware
5. Developer documentation (architecture guide)
6. Game design document (this spec + revisions)
7. Launch-ready build (optimized, minified)

**Team Assignment**
- **UI/UX Designer** → Interface refinement
- **QA Lead** → Testing, bug fixes
- **Performance Engineer** → Final optimization
- **Web Specialist** → Cross-browser, mobile support
- **Release Manager** → Build, documentation

**Testing Criteria**
- ✓ Zero critical bugs in final build
- ✓ 60 FPS locked on RPi 5, 90+ FPS on desktop
- ✓ Works on Chrome, Firefox, Safari (WebGL 1.0 support)
- ✓ Touch controls functional on mobile devices
- ✓ Mobile game playable with on-screen buttons
- ✓ Load time <5 seconds on 25 Mbps connection
- ✓ Full documentation available

---

## Risk Register and Mitigation

### Risk 1: Performance Degradation on RPi 5
**Severity:** Critical (Game is unplayable if FPS drops below 45)  
**Likelihood:** High (RPi hardware is limited)  
**Impact:** Game cannot reach release quality, target platform unusable

**Mitigation Strategies**
1. **Early Hardware Testing** - Test weekly on actual RPi 5, identify bottlenecks early
2. **Aggressive Budgeting** - Strict 16ms frame time budget, allocate 60% to GPU rendering
3. **LOD System** - Implement hierarchical detail levels, aggressively simplify at distance
4. **Adaptive Rendering** - Dynamic resolution scaling, reduce shadow map quality if needed
5. **Shader Simplification** - Use basic Phong shaders, avoid expensive fragment operations
6. **Alternative Path** - Plan fallback to simpler graphics mode if performance impossible

**Responsibility:** Performance Engineer  
**Checkpoint:** Weekly FPS tests on hardware, escalate if trending below 50 FPS

---

### Risk 2: Procedural Generation Creates Unplayable Areas
**Severity:** High (Content is unplayable, breaks exploration loop)  
**Likelihood:** Medium (Complex algorithm, many edge cases)  
**Impact:** Players stuck in impossible/broken landscapes

**Mitigation Strategies**
1. **Algorithmic Validation** - Pre-check generated chunks for playable paths, min/max heights
2. **Seed Testing** - Test 100+ procedural seeds for edge cases before release
3. **Fallback Generation** - If chunk invalid, regenerate or load from validated cache
4. **Player Feedback** - Debug panel shows terrain height/building data for artists to verify
5. **Manual Overrides** - Allow designers to "fix" bad chunks with manual placements
6. **Incremental Rollout** - Expand generation complexity gradually week-by-week

**Responsibility:** Procedural Designer  
**Checkpoint:** Daily generation tests, visual inspection of 5+ unique seeds

---

### Risk 3: NPC AI Creates Frustrating Interactions
**Severity:** Medium (Bad UX, breaks immersion)  
**Likelihood:** Medium (AI is complex, tuning difficult)  
**Impact:** Players frustrated by NPC behavior, turn off game

**Mitigation Strategies**
1. **Behavior Tree Logging** - Log all NPC decisions, diagnose stuck/looping behavior
2. **Player Feedback Loop** - NPCs give clear visual/audio feedback for actions
3. **Simple Initial AI** - Start with simple behavior (wander, sleep, eat), iterate
4. **Tuning Parameters** - Expose behavior weights for easy tweaking without code changes
5. **Player Agency** - NPCs never block critical path, always alternate routes available
6. **Monitoring Dashboard** - Real-time view of NPC state, behavior execution rates

**Responsibility:** NPC Programmer  
**Checkpoint:** Weekly NPC testing, observe for stuck/frustrating behavior

---

### Risk 4: Memory Leaks or Growing Allocations
**Severity:** High (Game becomes unplayable after 30+ min play)  
**Likelihood:** Medium (Complex object lifecycle, streaming)  
**Impact:** RPi 5 becomes unstable, forced crash/restart

**Mitigation Strategies**
1. **Memory Profiling** - Weekly heap snapshots, identify growing allocations
2. **Asset Pooling** - Reuse object buffers instead of creating/destroying
3. **Explicit Cleanup** - Unload chunks completely, dispose ThreeJS geometries
4. **GC Monitoring** - Log GC pauses >16ms, optimize to reduce collections
5. **Load Testing** - Run 2-hour continuous play sessions, log memory over time
6. **Memory Dashboard** - Real-time memory usage display, alert if growth >1MB/min

**Responsibility:** Integration Lead / Performance Engineer  
**Checkpoint:** Daily memory profiling, escalate if trending upward

---

### Risk 5: Browser Compatibility Issues
**Severity:** Medium (Game doesn't work on some platforms)  
**Likelihood:** Medium (WebGL has quirks, shader support varies)  
**Impact:** Some users cannot play, reduced audience

**Mitigation Strategies**
1. **Early Testing** - Week 2: Test on Chrome, Firefox, Safari on desktop + mobile
2. **WebGL 1.0 Focus** - Use only features guaranteed on all platforms (no extensions)
3. **Feature Detection** - Check for required features, graceful degradation if missing
4. **Fallback Shaders** - Simple shader fallbacks for complex effects
5. **Known Issues Doc** - Document platform-specific quirks, provide workarounds
6. **Continuous CI** - GitHub Actions tests build and basic load on multiple browsers

**Responsibility:** Web Specialist  
**Checkpoint:** Bi-weekly cross-browser testing, maintain compatibility matrix

---

## Appendix: Design Patterns & Architecture Decisions

### Pattern 1: Entity Component System (Future Consideration)
Current implementation is monolithic (PlayerController, WorldManager, etc.). For future expansion beyond MVP, consider ECS pattern:
- Entities are simple data containers (Position, Velocity, Health)
- Components are pure data
- Systems operate on entities with specific component combinations
- Benefits: Better composition, easier testing, more flexible gameplay

### Pattern 2: Behavior Trees vs FSM for NPCs
**Selected:** Behavior Trees (BTs)  
**Rationale:**
- Hierarchical structure easier to visualize complex behavior
- Modularity: Reuse sub-trees across NPC types
- Debugging: Can visualize execution paths

**Alternative (FSM):** Simpler for single-task behavior, harder to compose complex sequences

### Pattern 3: Streaming vs Preload
**Selected:** Streaming (assets loaded as player approaches)  
**Rationale:**
- Limited memory on RPi 5 (4GB shared)
- Infinite city cannot be preloaded
- Streaming allows larger city within memory constraints

### Pattern 4: Seed-Based Procedural Generation
**Selected:** Deterministic seeding for reproducibility  
**Rationale:**
- Players can share favorite seeds
- Easier debugging (seed identifies exact issue)
- Possible multiplayer via seed-sharing

### Pattern 5: Quantized Physics (Fixed Timestep)
**Selected:** Fixed timestep for physics, variable timestep for rendering  
**Rationale:**
- Stable, deterministic physics behavior
- Reproducible across platforms
- Easier debugging and testing

---

## Glossary

| Term | Definition |
|------|-----------|
| **Chunk** | 100m x 100m city area, loaded/unloaded as unit |
| **LOD** | Level of Detail; simplified geometry for distant objects |
| **NPC** | Non-Player Character; cat or human controlled by AI |
| **Meow** | Player vocalization; audio feedback for actions |
| **Collectible** | Yarn balls, fish; items player finds and collects |
| **Reputation** | NPC relationship stat; affects interactions |
| **Skill** | Player ability; unlocked through progression |
| **Procedural** | Generated algorithmically, not hand-placed |
| **Seed** | Input to procedural generator; determines output |
| **Draw Call** | Single GPU rendering instruction |

---

## Sign-Off

**Document Status:** APPROVED FOR IMPLEMENTATION  
**Target Completion:** 4 weeks  
**Next Phase:** Technical Architecture Review & Dev Kickoff  
**Contact:** Game Architect Agent (192.168.0.112:8040)

---

**Revision History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | July 2026 | Initial comprehensive specification |

