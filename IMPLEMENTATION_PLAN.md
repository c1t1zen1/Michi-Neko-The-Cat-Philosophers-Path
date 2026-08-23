# Cat City FPS - Implementation Plan

**Timeline:** 4 weeks (Week 1-4)  
**Team:** Multi-agent parallel orchestration (3 distributed servers)  
**Output:** Fully functional ThreeJS game prototype with procedural generation

---

## Overview: Development Approach

This plan leverages **multi-agent orchestration** across distributed local AI servers to parallelize game development. Each phase is decomposed into independent workstreams that execute in parallel, then converge for integration.

### Parallel Execution Model
- **Design Phase** - 3 specialist agents propose solutions in parallel
- **Implementation Phase** - Independent code agents write modules without blocking
- **Testing Phase** - Verification agents validate independently
- **Integration Phase** - Coordinator reconciles outputs and resolves conflicts

### Success Criteria per Phase
- **Week 1:** Playable MVP (move, jump, basic city, 45+ FPS on RPi 5)
- **Week 2:** Full content loop (multiple areas, NPCs, audio, save/load)
- **Week 3:** All core systems (weather, progression, achievements, optimization)
- **Week 4:** Polished release (bug-free, 60 FPS locked, mobile-ready)

---

## Phase 1: MVP - Core Loop (Week 1)

### Duration: Monday 6AM - Friday 11:59PM (5 days)

### Workstreams (Parallel Execution)

#### WS1.1: Game Engine Architecture [CRITICAL PATH]
**Owner:** Technical Architect Agent  
**Time Estimate:** 20 hours  
**Status:** BLOCKING for other workstreams

**Tasks:**
1. Design GameEngine.js main loop and orchestration pattern
2. Create SceneManager.js with ThreeJS setup (camera at cat height)
3. Implement PlayerController.js with WASD + mouse controls
4. Create CameraController.js with FPS-style mouse look
5. Integration: All systems connected, main loop running
6. Testing: Verify 60 FPS on desktop, 45+ FPS on RPi 5

**Deliverable:** `src/GameEngine.js`, `src/scene/SceneManager.js`, `src/player/PlayerController.js`, `src/player/CameraController.js`

**Acceptance Criteria:**
- ✓ Game initializes without console errors
- ✓ Player moves with WASD, rotates with mouse
- ✓ Jump works with Space, camera maintains FPS perspective
- ✓ Frame rate stable: 60 FPS on laptop, ≥45 FPS on RPi 5
- ✓ HUD displays position and FPS

---

#### WS1.2: World & Procedural Generation [PARALLEL]
**Owner:** Procedural Generation Specialist  
**Time Estimate:** 20 hours  
**Status:** Independent from WS1.1 after API contract

**Tasks:**
1. Design procedural city generation algorithm (Perlin noise + zoning)
2. Implement ProceduralCity.js with basic neighborhood generation
3. Create WorldManager.js with chunk loading/unloading
4. Generate first neighborhood: Residential District (100m x 100m)
5. Create simple building models (cube placeholders, LOD disabled)
6. Integration: Chunks generate and load as player moves
7. Testing: Multiple seed values, verify no collision volumes overlap

**Deliverable:** `src/world/ProceduralCity.js`, `src/world/WorldManager.js`, `assets/city-chunks.json` (sample data)

**Acceptance Criteria:**
- ✓ City chunk generates procedurally from seed
- ✓ Buildings appear with reasonable spacing (no overlap)
- ✓ Player can walk around buildings without clipping
- ✓ Chunks unload when player moves away (no infinite memory growth)
- ✓ 10+ unique seeds tested, all generate playable areas

---

#### WS1.3: Physics & Player Collision [PARALLEL]
**Owner:** Physics Engine Specialist  
**Time Estimate:** 16 hours  
**Status:** Independent, integrates with WS1.1

**Tasks:**
1. Implement basic physics (gravity, collision detection)
2. Player collision system (sphere collider at cat height)
3. Ground collision (keep player above terrain)
4. Collision response (stop movement, landing feedback)
5. Simple object collision (buildings are solid)
6. Integration: PlayerController uses physics for movement
7. Testing: Jump physics feel responsive, landing is predictable

**Deliverable:** `src/physics/PhysicsEngine.js`, `src/physics/Collider.js`

**Acceptance Criteria:**
- ✓ Player cannot fall through ground or buildings
- ✓ Gravity pulls player down at realistic rate
- ✓ Jump reaches ~1.5m height (cat-appropriate)
- ✓ Landing has crisp response, no floating
- ✓ Player slides smoothly on ramps (no jitter)

---

#### WS1.4: Basic UI & HUD [PARALLEL]
**Owner:** UI/UX Designer  
**Time Estimate:** 12 hours  
**Status:** Independent

**Tasks:**
1. Create main HTML (index.html) with canvas and UI divs
2. Implement HUDManager.js (position, speed, FPS display)
3. Create loading screen with progress bar
4. Add crosshair to screen center
5. Debug panel (F1 to toggle) showing camera pos, draw calls, triangles
6. Mobile controls placeholder (for Week 4 expansion)
7. Styling: Dark theme, green accents (retro FPS aesthetic)

**Deliverable:** `public/index.html`, `src/ui/HUDManager.js`, `styles/game.css`

**Acceptance Criteria:**
- ✓ Game loads with loading screen visible
- ✓ Loading screen hides after 0.5 seconds
- ✓ HUD displays player position with 1 decimal precision
- ✓ FPS counter updates every 0.25 seconds
- ✓ Debug panel toggles on F1 press
- ✓ Crosshair centered on screen

---

### Integration & Testing: WS1.1 + WS1.2 + WS1.3 + WS1.4

**Timeline:** Friday 6PM-11:59PM (5 hours)

**Tasks:**
1. Merge all workstreams into single build
2. Verify all systems interact correctly
3. Run 1-hour play session on RPi 5, monitor FPS
4. Performance profiling: identify bottlenecks
5. Bug triage: critical fixes only (defer cosmetic issues)

**Success Criteria:**
- ✓ Game is playable end-to-end
- ✓ No crashes during 1-hour play session
- ✓ FPS stable at 45+ FPS on RPi 5 (Baseline hardware)
- ✓ Memory usage <300MB
- ✓ All systems communicate without errors

**Go/No-Go Decision:** If above criteria met → PROCEED to Phase 2. Otherwise, extend Phase 1.

---

## Phase 2: Content Expansion (Week 2)

### Duration: Monday 6AM - Friday 11:59PM (5 days)

### Objectives
- 3-5 neighborhoods fully populated
- Time-of-day lighting system
- NPC system with behavior trees
- Interactive physics (knockable objects)
- Collectibles (yarn balls, fish)
- Audio system (spatial 3D sound)
- Save/load game state

### Workstreams (Parallel)

#### WS2.1: Time of Day & Environment [PARALLEL]
**Owner:** Environment Designer Agent  
**Time Estimate:** 24 hours

**Tasks:**
1. Implement EnvironmentManager.js managing time cycle
2. Dynamic sun rotation (6AM = east, 6PM = west)
3. Lighting intensity changes with time
4. Fog distance changes (closer fog at night)
5. Skybox color changes (blue day, orange sunset, dark night)
6. Weather system placeholder (ready for Week 3)
7. Integration: GameEngine calls updateTimeOfDay() each frame

**Deliverable:** `src/environment/EnvironmentManager.js`, `src/environment/WeatherSystem.js` (skeleton)

**Acceptance Criteria:**
- ✓ Sun rotates 360° over 48 in-game minutes (1 real minute)
- ✓ Lighting intensity peaks at noon, zero at midnight
- ✓ Fog reveals/hides buildings naturally with time change
- ✓ Sunset is visibly golden (5-7PM)
- ✓ Night is dark but visible (street lights not yet, ambient only)

---

#### WS2.2: NPC System & Behavior Trees [PARALLEL]
**Owner:** NPC Specialist Agent  
**Time Estimate:** 32 hours

**Tasks:**
1. Design NPC behavior tree architecture
2. Implement NPCSystem.js (spawning, scheduling)
3. Create behavior tree classes: Selector, Sequence, Leaf nodes
4. Implement 5 core NPC behaviors:
   - Idle (sit, groom, stretch)
   - Patrol (walk around territory)
   - Eat (find food source)
   - Sleep (rest during night hours)
   - Socialize (approach other NPCs)
5. Create CatNPC class with personality types (friendly, aloof, playful)
6. Create HumanNPC class with basic routines
7. Integration: Spawn 3-5 NPCs per neighborhood
8. Testing: NPCs follow schedules, don't overlap, behavior looks natural

**Deliverable:** `src/npc/NPCSystem.js`, `src/npc/BehaviorTree.js`, `src/npc/CatNPC.js`, `src/npc/HumanNPC.js`

**Acceptance Criteria:**
- ✓ Cats spawn in neighborhoods, wander naturally
- ✓ Cats sleep at night (disappear or lay down)
- ✓ Humans appear at day, less at night
- ✓ NPCs don't overlap/clip through each other
- ✓ NPC approaching player (within 3m) plays greeting animation/sound
- ✓ NPCs continue moving off-screen (don't pause)

---

#### WS2.3: Interactive Physics Objects [PARALLEL]
**Owner:** Physics Specialist Agent  
**Time Estimate:** 20 hours

**Tasks:**
1. Extend PhysicsEngine.js with interactive object support
2. Create InteractiveObject.js class (mass, friction, drag)
3. Implement knockable objects: Vases, bottles, papers, books
4. Player collision triggers knockback (push objects)
5. Gravity simulation for falling objects
6. Collision sounds (clink of glass, thud of wood)
7. Object persistence (state saved, restored on load)
8. Integration: WorldManager spawns objects in chunks
9. Testing: Various weights feel realistic, stacking is stable

**Deliverable:** `src/physics/InteractiveObject.js`, Extended `src/physics/PhysicsEngine.js`

**Acceptance Criteria:**
- ✓ Player bumps vase, it slides/falls realistically
- ✓ Light object (paper) knocked far, heavy object (rock) stays close
- ✓ Object falling from height has impact sound
- ✓ Multiple objects stack without exploding (stable solver)
- ✓ Object state persists across save/load

---

#### WS2.4: Collectible System [PARALLEL]
**Owner:** Game Designer Agent  
**Time Estimate:** 16 hours

**Tasks:**
1. Create CollectibleSystem.js (tracking, state)
2. Design 2 collectible types: Yarn Balls (10 per area), Fish (5 per area)
3. Spawn collectibles in key locations (parks, markets, hidden spots)
4. Player pickup mechanic (walk over item, plays collection sound)
5. HUD indicator (yarn balls: 3/10, fish: 1/5)
6. Collectible storage in save file
7. Achievement: Collect all items in area → unlock reward
8. Integration: UI shows collection progress
9. Testing: All 15 items findable, no impossible locations

**Deliverable:** `src/systems/CollectibleSystem.js`, updated `src/ui/HUDManager.js`

**Acceptance Criteria:**
- ✓ 10 yarn balls spawn in first neighborhood
- ✓ 5 fish spawn near water features
- ✓ Player walks over item → automatically collected
- ✓ Collection sound plays, HUD updates
- ✓ Progress persists across game load
- ✓ Collectible locations consistent with seed (same seed = same items)

---

#### WS2.5: Audio System (3D Spatial) [PARALLEL]
**Owner:** Audio Engineer Agent  
**Time Estimate:** 24 hours

**Tasks:**
1. Implement AudioManager.js with Web Audio API
2. Spatial audio (3D positioning)
3. Audio listener attached to camera (moves with player)
4. Create sound categories:
   - Player (meow on jump, purr on landing)
   - Ambient (city sounds, wind)
   - NPCs (cat meows, human chatter)
   - UI (button clicks)
5. Generate/source 5+ audio samples:
   - Meow variants (surprise, greeting, pain)
   - Footstep (concrete, grass, metal)
   - Jump/land sound
   - Collectible pickup sound
   - Object collision sound
6. Volume attenuation with distance (max 100m)
7. Doppler effect for moving sources (optional)
8. Integration: Player actions trigger audio
9. Testing: Audio comes from correct 3D locations

**Deliverable:** `src/audio/AudioManager.js`, `assets/sounds/` (10+ audio files or generation script)

**Acceptance Criteria:**
- ✓ Player hears meow sound when jumping
- ✓ Footsteps play while walking (volume matches speed)
- ✓ City ambient sound in background
- ✓ NPC meow comes from NPC location (3D spatial)
- ✓ Collectible pickup sound plays on collection
- ✓ Sound volume decreases with distance

---

#### WS2.6: Save/Load System [PARALLEL]
**Owner:** Persistence Engineer Agent  
**Time Estimate:** 16 hours

**Tasks:**
1. Design save data structure (JSON format)
2. Implement SaveLoadSystem.js using IndexedDB
3. Serialize player state: position, rotation, inventory
4. Serialize world state: generated chunks, object positions
5. Serialize progression: skills, collectibles, NPC reputation
6. Auto-save every 30 seconds to backup slot
7. Manual save: F5 key, load: F9 key
8. Menu UI for slot selection (5 slots + auto)
9. Load screen shows saving/loading progress
10. Testing: Load game after quit, verify all state restored

**Deliverable:** `src/systems/SaveLoadSystem.js`, IndexedDB schema

**Acceptance Criteria:**
- ✓ Auto-save happens every 30 seconds (no player action needed)
- ✓ Manual save (F5) saves to slot 1-5
- ✓ Game quit, restart, load (F9) → restored to exact position
- ✓ Collectibles collected before save are retained
- ✓ NPCs in same state (if save mid-day, load shows mid-day)

---

### Extended World Generation: 3-5 Neighborhoods

**Parallel to above workstreams:**

#### WS2.7: Procedural Expansion [PARALLEL]
**Owner:** Procedural Generator Agent  
**Time Estimate:** 20 hours

**Tasks:**
1. Extend ProceduralCity.js for neighborhood variety
2. Create 3 distinct neighborhood types:
   - **Residential** (houses, parks, quiet)
   - **Commercial** (shops, restaurants, busy)
   - **Industrial** (factories, warehouses, gritty)
3. Zone noise function assigns type based on coordinate
4. Each zone type has distinct building styles, street widths, vegetation
5. Generate connected road network between zones
6. Ensure playable terrain (no impossible cliffs)
7. Spawn collectibles within neighborhoods
8. Testing: 20+ unique seeds, all playable

**Deliverable:** Extended `src/world/ProceduralCity.js` with zone system

**Acceptance Criteria:**
- ✓ Residential area feels quiet, lower building density
- ✓ Commercial area feels bustling, higher density
- ✓ Industrial area feels raw, utilitarian
- ✓ Roads connect neighborhoods, player can navigate freely
- ✓ No large gaps/cliffs that block traversal
- ✓ Collectibles distributed across all zones

---

### Integration: Phase 2 Convergence

**Timeline:** Friday 6PM (start of WS2.8)

#### WS2.8: Integration & Performance Pass [SEQUENTIAL]
**Owner:** Integration Lead Agent  
**Time Estimate:** 8 hours

**Tasks:**
1. Merge all Phase 2 workstreams
2. Verify all systems work together
3. Performance profiling: identify bottlenecks
4. Memory leak check (1-hour continuous play)
5. NPC/Player interaction testing
6. Save/load with all systems active
7. Bug triage: critical fixes only

**Success Criteria:**
- ✓ Game runs 1 hour continuously without crashes
- ✓ FPS stable at 45+ FPS on RPi 5
- ✓ Memory growth <1MB/minute
- ✓ NPCs interact with player (approach, meow)
- ✓ Collectibles appear and persist
- ✓ Save/load works with all state

**Go/No-Go Decision:** If above met → PROCEED to Phase 3. Otherwise, debug and extend.

---

## Phase 3: System Integration & Optimization (Week 3)

### Duration: Monday 6AM - Friday 11:59PM (5 days)

### Objectives
- Progression & unlock system
- Weather effects (rain, snow, wind)
- Skill progression system
- Achievement tracking
- Rendering pipeline optimization (LOD, batching)
- Advanced NPC scheduling

### Workstreams (Parallel)

#### WS3.1: Progression & Unlock System [PARALLEL]
**Owner:** Game Designer Agent  
**Time Estimate:** 20 hours

**Tasks:**
1. Implement ProgressionSystem.js (level calculation)
2. Define progression gates (area unlocks at level 10, 25, 40, 60)
3. Skill unlock triggers:
   - "Fast Jump" → reach 2m height in single jump
   - "Climb High" → reach 3m height on wall
   - "Sprint Master" → run 100m distance
   - "Night Vision" → play during night for 5 min
   - "Meow Master" → interact with 5+ NPCs
4. Achievement tracking (10-15 achievements)
5. UI notifications for unlocks
6. Progression state saved in save file
7. Testing: Unlock triggers reliably

**Deliverable:** `src/systems/ProgressionSystem.js`, `src/systems/AchievementSystem.js`

**Acceptance Criteria:**
- ✓ Level progresses based on discoveries, skills, collectibles
- ✓ New area message displays when threshold crossed
- ✓ Skill unlocks triggered by correct action
- ✓ Achievement notifications appear on unlock
- ✓ Progression state saved/restored

---

#### WS3.2: Weather System [PARALLEL]
**Owner:** Environment Designer Agent  
**Time Estimate:** 24 hours

**Tasks:**
1. Extend WeatherSystem.js with full weather effects
2. Implement 4 weather states: Clear, Overcast, Rain, Snow
3. Weather changes every 10-20 minutes
4. Weather affects:
   - **Clear:** Normal lighting, good visibility
   - **Overcast:** Reduced light intensity, neutral colors
   - **Rain:** Particle effects, wet ground shader, increased ambient sound, NPCs seek shelter
   - **Snow:** Particle effects, white ground, colder colors
5. Wind system: Affects lightweight objects
6. Integration: AudioManager adjusts ambient sound for weather
7. Testing: Weather transitions smoothly, performance impact <5% FPS

**Deliverable:** `src/environment/WeatherSystem.js`, weather particle shaders

**Acceptance Criteria:**
- ✓ Weather changes at least once per 20-minute play session
- ✓ Rain visible as particles, ground reflects wet appearance
- ✓ Snow accumulates/falls naturally
- ✓ NPCs behavior changes (take shelter in rain)
- ✓ Audio changes (rain sound in rain weather)
- ✓ FPS impact <5% (no drops below 42 FPS on RPi 5)

---

#### WS3.3: Skill Progression System [PARALLEL]
**Owner:** Game Design Agent  
**Time Estimate:** 16 hours

**Tasks:**
1. Extend ProgressionSystem with skill stat tracking
2. Each skill has effects on gameplay:
   - **Fast Jump:** Jump height +20%
   - **Climb High:** Can climb steeper walls
   - **Sprint Master:** Sprint duration +30%
   - **Night Vision:** Increase view distance at night by 25%
   - **Meow Master:** NPCs more receptive (easier to befriend)
3. Skill UI: Display learned skills, progression to next
4. Stat system: Store skill levels (1-5) for future upgrades
5. Balance pass: Ensure skills feel meaningful but not OP
6. Testing: Each skill visibly changes gameplay

**Deliverable:** Updated `src/systems/ProgressionSystem.js` with skill effects

**Acceptance Criteria:**
- ✓ Each unlocked skill noticeably changes gameplay
- ✓ Fast Jump makes jump reach higher visibly
- ✓ Sprint Master extends sprint duration
- ✓ Night Vision increases visibility in dark areas
- ✓ Skills persist across save/load

---

#### WS3.4: Rendering Optimization (LOD, Batching) [PARALLEL]
**Owner:** Graphics Programmer Agent  
**Time Estimate:** 28 hours

**Tasks:**
1. Implement LOD system:
   - LOD0 (0-50m): Full detail
   - LOD1 (50-200m): 25% fewer triangles
   - LOD2 (200-500m): 60% fewer triangles
   - LOD3 (500-1000m): 85% fewer triangles
   - LOD4 (>1000m): Silhouette only (single billboard)
2. Create LODManager.js
3. Frustum culling: Don't render off-screen geometry
4. Batch rendering: Merge static geometry
5. Texture atlasing: Combine textures to reduce draw calls
6. Material pooling: Reuse materials for identical geometry
7. Performance profiling: Target <500 draw calls, <500K triangles
8. Testing: Verify 40%+ draw call reduction

**Deliverable:** `src/rendering/LODManager.js`, updated `src/scene/SceneManager.js`, texture atlas pipeline

**Acceptance Criteria:**
- ✓ Draw calls <500 (target <300 for Phase 4)
- ✓ Triangles <500K per frame
- ✓ No visible pop-in when transitioning LOD levels
- ✓ FPS improvement ≥15% vs Phase 2 (e.g., 50 → 57 FPS)
- ✓ Memory usage stable despite expanded world

---

#### WS3.5: Advanced NPC Scheduling [PARALLEL]
**Owner:** NPC Specialist Agent  
**Time Estimate:** 20 hours

**Tasks:**
1. Extend NPCSystem with daily schedules
2. Schedule types:
   - **Diurnal:** Active 6AM-10PM, sleep 10PM-6AM
   - **Nocturnal:** Sleep 6AM-6PM, active 6PM-6AM
   - **Humans:** Commute 8AM, work 9AM-5PM, evening activities
3. Location-based routines (cat returns to home area each night)
4. Hunger/need system (NPCs eat/drink at specific times)
5. Relationship evolution: NPCs remember player, change behavior
6. Integration: Time system triggers schedule updates
7. Testing: NPCs follow realistic daily patterns

**Deliverable:** Updated `src/npc/NPCSystem.js` with schedule system

**Acceptance Criteria:**
- ✓ NPCs visible during day, disappear at night
- ✓ Same NPC returns to same location each day (within territory)
- ✓ NPCs eat/sleep at consistent times
- ✓ Repeated player interaction increases NPC friendliness
- ✓ NPCs avoid player if mistreated

---

### Integration: Phase 3 Convergence

#### WS3.6: Integration & Optimization Pass [SEQUENTIAL]
**Owner:** Integration Lead Agent  
**Time Estimate:** 12 hours

**Tasks:**
1. Merge all Phase 3 workstreams
2. Verify progression gates work
3. Performance profiling: ensure FPS stable
4. Memory leak check (2-hour session)
5. Balance pass: Are skills meaningful? Is progression fun?
6. Bug triage: Fix critical issues
7. Benchmark on all target hardware

**Success Criteria:**
- ✓ Game runs 2 hours continuously without crashes
- ✓ FPS stable at 50+ FPS on RPi 5 (or 55+ after optimization)
- ✓ Progression feels rewarding (clear unlock feedback)
- ✓ Weather effects don't cause frame rate drops
- ✓ NPC schedules follow daily patterns
- ✓ Memory growth <0.5MB/minute

**Go/No-Go Decision:** If criteria met → PROCEED to Phase 4. Otherwise, extend.

---

## Phase 4: Polish & Release (Week 4)

### Duration: Monday 6AM - Friday 11:59PM (5 days)

### Objectives
- Final content pass (balance, bug fixes)
- Performance optimization final pass
- UI/UX refinement and polish
- Cross-browser testing
- Mobile support (touch controls)
- Documentation and release prep

### Workstreams (Mostly Sequential)

#### WS4.1: QA & Bug Triage [SEQUENTIAL - CRITICAL]
**Owner:** QA Lead Agent  
**Time Estimate:** 24 hours (Monday-Wednesday)

**Tasks:**
1. Comprehensive test plan (20+ test cases)
2. Test on all target hardware: RPi 5, Desktop i5, Laptop
3. Test on all browsers: Chrome, Firefox, Safari
4. Stress test: 4-hour continuous play sessions
5. Bug logging: Document every issue (critical, major, minor)
6. Critical fixes: Crashes, unplayable areas, major lag
7. Major fixes: Gameplay balance, NPC issues, progression bugs
8. Defer: Cosmetic issues, minor balance adjustments

**Deliverable:** Bug report with triage and resolution

**Acceptance Criteria:**
- ✓ Zero critical bugs in final build
- ✓ No crashes during 4-hour play session
- ✓ No permanently stuck players (always exit available)
- ✓ All major features working as designed

---

#### WS4.2: Performance Final Optimization [PARALLEL to WS4.1]
**Owner:** Performance Engineer Agent  
**Time Estimate:** 20 hours

**Tasks:**
1. Profile on RPi 5 hardware (not emulator)
2. Identify hot paths (functions called >1000/frame)
3. Optimize hot paths:
   - Physics update order (broad-phase → narrow-phase)
   - NPC behavior tree traversal (short-circuit evaluation)
   - Rendering state changes (batch by material)
4. Memory optimizations:
   - Reuse buffers, reduce allocations
   - Aggressive GC tuning
   - Asset pooling for dynamic objects
5. Shader optimization:
   - Reduce precision where possible
   - Pre-compute what can be baked
6. Benchmark: Before/after FPS comparison
7. Target: 60 FPS stable on RPi 5 (not 45+ anymore)

**Deliverable:** Performance profiling report, optimized build

**Acceptance Criteria:**
- ✓ FPS at least 55 on RPi 5 (target 60)
- ✓ Frame time variance <5ms
- ✓ Hot paths optimized (profiler shows no bottleneck >5% time)
- ✓ Memory stable <300MB

---

#### WS4.3: UI/UX Polish & Settings [PARALLEL to WS4.1]
**Owner:** UI/UX Designer Agent  
**Time Estimate:** 16 hours

**Tasks:**
1. Create main menu (Start, Load, Settings, Quit)
2. Pause menu (accessible during play, return to menu option)
3. Settings menu:
   - Graphics: Resolution, FOV, shadow quality
   - Audio: Master volume, music/SFX balance
   - Input: Sensitivity, invert mouse, custom key bindings
   - Accessibility: Subtitle toggles, colorblind modes
4. Responsive UI: Scale for different resolutions
5. Tutorial/Help: Quick start guide in-game
6. Polish: Animations, transitions, visual feedback
7. Testing: Navigate menus, verify settings persist

**Deliverable:** Updated `public/index.html`, menu system, settings persistence

**Acceptance Criteria:**
- ✓ Main menu displays on game load
- ✓ Can start game, load game, access settings
- ✓ Settings persist across quit/load
- ✓ Pause menu accessible during play (Esc key)
- ✓ UI responsive on mobile (buttons large enough)

---

#### WS4.4: Cross-Browser & Mobile Support [PARALLEL to WS4.1]
**Owner:** Web Specialist Agent  
**Time Estimate:** 20 hours

**Tasks:**
1. Test on browsers:
   - Chrome (latest) - Desktop & mobile
   - Firefox (latest) - Desktop & mobile
   - Safari (latest) - Desktop & mobile
2. Identify browser-specific issues:
   - WebGL context loss handling
   - Touch event handling
   - Audio context start requirements
3. Mobile optimizations:
   - Touch controls: On-screen joystick + action buttons
   - Responsive HUD (scale for small screens)
   - Reduced graphics for mobile (disable shadows/fog on mobile)
   - Landscape-only orientation
4. Fallback graphics for low-end mobile (reduce texture resolution, shader complexity)
5. Testing: Play on actual devices, not just browser emulation

**Deliverable:** Mobile controls implementation, cross-browser compatibility report

**Acceptance Criteria:**
- ✓ Chrome, Firefox, Safari all run game at 45+ FPS on baseline hardware
- ✓ Mobile touch controls functional (move joystick + jump button)
- ✓ Game runs in landscape orientation
- ✓ HUD readable on 5" mobile screen
- ✓ No JavaScript errors in any browser console

---

#### WS4.5: Documentation & Build [SEQUENTIAL - Final]
**Owner:** Release Manager Agent  
**Time Estimate:** 12 hours (Thursday-Friday)

**Tasks:**
1. Developer documentation:
   - Architecture overview (systems, data flow)
   - Code organization guide (folder structure)
   - Key classes and APIs (SceneManager, PlayerController, WorldManager)
   - Performance tips (LOD system, asset streaming)
   - How to add new features (extending behavior trees, adding NPCs)
2. Game design documentation:
   - High-level design (vision, pillars)
   - Content generation (how procedural system works)
   - NPC system (behavior trees, schedules)
3. Build & deployment:
   - Minify JavaScript (Terser or similar)
   - Optimize assets (texture compression, audio compression)
   - Generate performance report
   - Create release checklist
4. README.md for end-users (how to play, system requirements)

**Deliverable:** Documentation, optimized build, README

**Acceptance Criteria:**
- ✓ README explains how to play (WASD, mouse, space to jump)
- ✓ System requirements clear (browser, hardware)
- ✓ Performance benchmarks documented (FPS on target hardware)
- ✓ Developer guide allows future extension

---

### Go-Live Checklist

**Before Release:**
- [ ] Zero critical bugs
- [ ] 60 FPS stable on RPi 5
- [ ] All features working as designed
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Mobile touch controls functional
- [ ] Documentation complete
- [ ] Save/load tested thoroughly
- [ ] Performance benchmarks documented
- [ ] Final build optimized & minified

**Release Steps:**
1. Commit final code to repository
2. Deploy to static hosting (or serve locally)
3. Announce release, share game URL
4. Monitor for user feedback
5. Plan post-launch patches

---

## Risk Mitigation Timeline

### Critical Path Protection
- **Week 1:** If GameEngine not complete by Wed → extend phase, reduce scope
- **Week 2:** If NPC system blocking → reduce NPC count, simplify AI
- **Week 3:** If performance target not met → activate fallback graphics mode
- **Week 4:** If bugs critical → extend QA phase, delay release

### Escalation Contacts
- **Performance Issues:** Contact Performance Engineer, consider simplified rendering
- **NPC Bugs:** Contact NPC Specialist, may simplify AI behavior
- **Procedural Gen Issues:** Contact Procedural Designer, may use manual layouts
- **Game Design Questions:** Contact Game Designer, adjust progression gates

---

## Success Metrics (End of Week 4)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **FPS on RPi 5** | 60 stable | TBD | 🔲 |
| **Playable Neighborhoods** | 5 | TBD | 🔲 |
| **Unique NPCs** | 10+ | TBD | 🔲 |
| **Collectible Items** | 50+ (10/area) | TBD | 🔲 |
| **Achievements** | 10-15 | TBD | 🔲 |
| **Playtime** | 2+ hours | TBD | 🔲 |
| **Critical Bugs** | 0 | TBD | 🔲 |
| **Cross-Browser** | 3+ browsers | TBD | 🔲 |
| **Documentation** | Complete | TBD | 🔲 |
| **Mobile Support** | Touch controls | TBD | 🔲 |

---

## Post-Launch Roadmap (Future Phases)

### Phase 5: Multiplayer (Weeks 5-6)
- Seed-based multiplayer (players share same seed, see each other's paths)
- Shared collectible progress
- NPC relationships affect both players

### Phase 6: Advanced Content (Weeks 7-8)
- Story campaign (mystery to solve)
- Boss encounters (challenging NPCs)
- Cosmetics shop (earn through gameplay)
- Leaderboards (distance traveled, collectibles found)

### Phase 7: Modding Support (Weeks 9-10)
- Custom neighborhood creation
- NPC behavior modding
- Custom skin/model creation

---

**Document Status:** APPROVED FOR EXECUTION  
**Next Action:** Begin Phase 1 (Week 1) on [Monday date]  
**Team Lead:** Technical Architect Agent  
**Contact:** 192.168.0.112:8040

