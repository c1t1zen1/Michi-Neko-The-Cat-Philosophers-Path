# Cat City FPS - Design Review & Coherence Analysis

**Document Date:** 2026-07-10  
**Review Type:** Cross-Document Coherence Verification  
**Reviewer:** Game Director (Design Verification Agent)  
**Status:** APPROVED with MINOR REVISIONS

---

## Executive Summary

The Cat City FPS design demonstrates **strong architectural coherence** across all three design documents (ARCHITECTURE.md, GAMEPLAY.md, ENVIRONMENT.md). The three pillars—technical stack, gameplay mechanics, and environmental design—are well-integrated and support each other logically.

**Overall Assessment: GREEN**

The design is technically feasible on Raspberry Pi 5, gameplay loops are clear and fun-focused, and environmental systems directly support the intended player experience. All major systems integrate without critical conflicts. Ready to proceed to implementation phase with identified minor optimizations.

---

## 1. Technical Feasibility Review

### 1.1 Architecture Validation ✅

**Coherence Check:**
- ✅ **Three.js + Cannon.js stack**: Well-justified for WebGL 2.0 on RPi 5
- ✅ **Streaming LOD system**: Chunk size (100m × 100m) aligns with draw-call budget
- ✅ **Physics engine choice**: 13.88% faster than Bullet.js; acceptable accuracy for exploration
- ✅ **NPC AI**: Schedule-based system matches Half-Life Source pattern; proven scalable

**Performance Targets Assessment:**

| Metric | Target | Feasible? | Notes |
|--------|--------|-----------|-------|
| **Frame Rate** | 60 FPS | ✅ YES | ARM Cortex-A76 + VideoCore VII capable with optimization |
| **Draw Calls** | <500 per frame | ✅ YES | Instancing + geometry merging strategies documented |
| **Memory** | <500 MB | ✅ YES | KTX2 compression (4-6x VRAM savings) + LRU texture cache |
| **Physics** | <3ms per frame | ✅ YES | Cannon.js lightweight; NPC LOD reduces AI compute |
| **Texture VRAM** | <400 MB | ✅ YES | 256 MB cache with streaming; margin for physics bodies |
| **JavaScript Heap** | <100 MB | ✅ YES | GC pauses managed via careful memory pooling |

**Risk Assessment: LOW**

All performance targets are achievable with disciplined implementation. The 16.67ms budget breakdown is realistic:
- JavaScript: 4ms (24%)
- Rendering: 10ms (60%)
- Browser/OS overhead: 2.67ms (16%)

---

### 1.2 Technology Stack Compatibility ✅

**Verified Integration:**

1. **Three.js r128+ with WebGL 2.0**
   - ✅ Supports InstancedMesh for vegetation/props
   - ✅ Supports KTX2 texture loading
   - ✅ Supports built-in frustum culling
   - ✅ Supports IndexedDB for save/load

2. **Cannon.js 0.20+**
   - ✅ Compatible with Three.js coordinate system
   - ✅ Sphere rotation instability mitigated via box colliders (documented)
   - ✅ No continuous collision detection; swept-sphere checks added (documented)
   - ✅ Ragdoll simplified to 8 bones (feasible)

3. **Web Audio API**
   - ✅ Oscillator synthesis for meow variants (no large sample library needed)
   - ✅ Convolver effect for reverb (pre-baked impulse responses)
   - ✅ 3D panning via Web Audio panner
   - ✅ Spatial audio fully implementable

4. **Streaming & Compression**
   - ✅ KTX2 + Basis Universal: Transcodes to BC7 (desktop) or ASTC (mobile)
   - ✅ glTF binary format for chunks
   - ✅ Worker threads for async chunk loading
   - ✅ IndexedDB with 100 MB capacity (ample for saves + chunk cache)

**No Critical Dependencies Missing: ✅**

---

### 1.3 Rendering Pipeline Coherence ✅

**Verification:**

**Scene Management Flow (from ARCHITECTURE.md):**
```
RequestAnimationFrame() 
→ GatherVisibleChunks() 
→ CullOccludedObjects() 
→ UpdateAnimations() 
→ PreRenderPass() 
→ MainRenderPass() 
→ PostProcessPass()
```

**Alignment with Environment Design (from ENVIRONMENT.md):**
- ✅ Chunk-based visibility: 100m × 100m chunks load within 500-1000m radius
- ✅ LOD system: 3-tier LOD (high/medium/low) matches performance targets
- ✅ Frustum culling: Saves 40-60% draw calls (documented in ENV design)
- ✅ Texture atlasing: 50 building facades → 1 atlas (documented)

**Lighting Strategy Coherence:**
- ✅ Pre-baked static lightmaps for buildings (both docs agree)
- ✅ Dynamic sun positioning tied to time of day (ENV 4.1: 24-hour cycle)
- ✅ No real-time shadows (mitigated via ambient occlusion)
- ✅ Atmospheric haze at fog distance (documented in ENV 2.2)

---

### 1.4 Physics System Feasibility ✅

**Gameplay Requirements → Technical Implementation:**

| Requirement | Implementation | Status |
|-------------|-----------------|--------|
| **Cat falls don't hurt (early game)** | No fall damage mechanic (Peaceful mode default) | ✅ Implemented |
| **Object knockback physics** | 80% momentum transfer from player to object | ✅ Feasible |
| **NPC ragdoll** | 8-bone skeleton (head, torso, 4 limbs, tail) | ✅ Optimized |
| **Climbing interaction** | Raycast detection + climb animation | ✅ Simple |
| **Stamina mechanic** | Running depletes 25/sec, regens 10/sec | ✅ Straightforward |

**Physics-Gameplay Integration: STRONG**
- Movement system (1.5-4.0 m/s walk/run) matches cat perspective
- Jump physics (6.0 m/s, ~1.5m height) realistic for cat
- Object interactions tied to physics, not animation (feels responsive)

---

## 2. Gameplay Loop Clarity & Fun Potential

### 2.1 Core Loop Validation ✅

**Gameplay Loop (from GAMEPLAY.md 3.1):**
```
1. OBSERVE → 2. INTERACT → 3. DISCOVER → 4. PROGRESS → 5. REPEAT
```

**Coherence with Environment Design:**
- ✅ **OBSERVE:** Stylized city (not photorealistic) encourages visual exploration
- ✅ **INTERACT:** Knockable objects (20-50 per chunk), climbable surfaces everywhere
- ✅ **DISCOVER:** Collectibles (yarn balls, fish treats, memories) hidden in procedural chunks
- ✅ **PROGRESS:** Area unlocks via NPC relationships + skill progression
- ✅ **REPEAT:** 60-second cycle naturally leads to continuous engagement

**Fun Validation:**

| Element | Design Detail | Fun Factor | Risk |
|---------|---------------|-----------|------|
| **Knockovers** | Physics-based, satisfying audio, hidden areas | ⭐⭐⭐⭐⭐ | LOW (core mechanic) |
| **Climbing** | Vertical puzzles, vantage points, shortcuts | ⭐⭐⭐⭐ | LOW (documented routes) |
| **NPCs** | Relationship system, daily routines, dialogue | ⭐⭐⭐⭐ | MEDIUM (dialogue authoring) |
| **Exploration** | Procedurally varied, 5 districts, replayability | ⭐⭐⭐⭐⭐ | LOW (proc gen proven) |
| **Collectibles** | 100+ yarn balls, achievements, unlocks | ⭐⭐⭐⭐ | LOW (simple mechanics) |

---

### 2.2 Progression Path Clarity ✅

**Story Arc (from GAMEPLAY.md 6.1):**
- **Act 1 (Lost):** Explore 25%, meet Orange Tom, learn basics → 1-8 hours
- **Act 2 (Discovery):** Explore 60%, unlock cat cafe, gather allies → 8-18 hours
- **Act 3 (Resolution):** 100% exploration, climax mission, home → 18-25 hours

**Implementation Alignment:**
- ✅ **Act 1 → Act 2:** NPC relationship triggers (e.g., "Gain trust of ginger cat → shows hidden alley")
- ✅ **Act 2 → Act 3:** Cumulative collectibles unlock progression
- ✅ **Post-game:** Side quests, New Game+, speed-run challenges

**Unique Selling Points Apparent:**
1. ✅ **Cat-centric perspective:** 0.3m camera height changes everything (parkour, scale)
2. ✅ **Exploration-first design:** No combat, no time pressure
3. ✅ **Physics-based interaction:** Knockovers feel real, not canned animations
4. ✅ **NPC life simulation:** Schedules + relationships create emergent storytelling
5. ✅ **Stylized urban world:** Hand-designed + procedural hybrid (consistency + variety)

---

### 2.3 Session Structure Validation ✅

**Playtime Expectations (from GAMEPLAY.md 3.2):**
- **15-30 min:** Explore 1-2 districts, interact with 5-10 NPCs, collect 3-5 items
- **1 hour:** Complete 1 neighborhood, max out 3-5 NPC relationships, unlock 1 area
- **2+ hours:** Explore 50%+ of city, complete story arc, discover secrets

**Environment Support:**
- ✅ District size (1km × 1km each): 1-2 districts explorable in 15-30 min
- ✅ NPCs per district (10-50): Adequate for social interaction
- ✅ Collectibles density (5-10 per chunk): Natural pacing
- ✅ Story triggers: Positioned to unlock every 30 min of play

**Accessibility Features (from GAMEPLAY.md 7.2):**
- ✅ Colorblind modes (Deuteranopia, Protanopia, Tritanopia)
- ✅ Audio cues for all visuals
- ✅ Remappable controls
- ✅ FOV slider (60-100°)
- ✅ Motion sickness options (disable head bob, vignette, max FOV change)

---

## 3. Environmental Design Supporting Gameplay

### 3.1 Vertical Design & Parkour Coherence ✅

**Height Variation (from ENVIRONMENT.md 2.1):**

| Height | Purpose | Gameplay Support |
|--------|---------|------------------|
| 0m | Ground level | Core exploration, NPC routes |
| 1-3m | First floor | Climbable challenge, discovery |
| 5-10m | Rooftops | Parkour, vantage points, secrets |
| 10-15m | Building tops | Late-game areas, visual landmarks |
| 15m+ | Tall buildings | Unreachable areas (visual interest) |

**Verification:**
- ✅ Cat jump height (1m max) vs. 1-3m first floor = climbing challenge
- ✅ Rooftop villages (documented as "Tier 1 hub") accessible via vertical progression
- ✅ Multiple climbing routes per area (trellis, fire escape, tree, drainpipe)
- ✅ Natural skill progression: Walk → Climb → Sprint

**Risk: NONE**

---

### 3.2 District Layout Supporting Progression ✅

**District Map (from ENVIRONMENT.md 1.1):**
```
Residential N ↔ Industrial / Central / Park ↔ Commercial S
(Start area)   (Mid-game)                    (Late game)
```

**Gameplay Alignment:**
- ✅ **Residential N:** Safe, familiar, tutorial content (slow dogs, pampered cats)
- ✅ **Industrial W:** Alleyways, hidden items, street cats (mid-game complexity)
- ✅ **Central Plaza:** Hub, cat cafe, NPC gathering (story beat)
- ✅ **Park:** Natural areas, parkour challenges, athletic cats
- ✅ **Commercial S:** Shopping, workers, final discoveries

**NPC Distribution Coherence:**
- ✅ Residential: Pampered house cats (passive, friendly)
- ✅ Industrial: Street cats, rats, trash pandas (adventurous)
- ✅ Central: Diverse cats, tourists (social hub)
- ✅ Park: Squirrels, birds, athletic cats (environmental challenges)
- ✅ Commercial: Worker cats, shopkeepers (economy simulation)

**Performance Impact:**
- ✅ Each district = ~10-15 chunks = manageable draw call count
- ✅ Chunk streaming: Avoid loading all districts at once
- ✅ LOD system: Distant districts simplified automatically

---

### 3.3 Environmental Storytelling ✅

**Design Patterns (from ENVIRONMENT.md 6.2):**
- ✅ **Progression gate:** "Find trellis to reach rooftop"
- ✅ **Hidden rewards:** Yarn balls in hard-to-reach spots
- ✅ **Environmental stories:** Knocked-over items show prior chaos
- ✅ **Ambient clues:** NPC conversations hint at secrets

**Gameplay Integration:**
- ✅ Knockover physics serves dual purpose: interaction + storytelling
- ✅ NPC daily routines (GAMEPLAY.md 5.2) create dynamic environment
- ✅ Time of day (ENVIRONMENT.md 4.1) changes NPC availability and mood
- ✅ Weather system (ENVIRONMENT.md 4.2) affects NPC behavior (rain → seek shelter)

---

## 4. Performance Targets Realism

### 4.1 Hardware Constraints ✅

**Target: Raspberry Pi 5 (4GB RAM, ARM Cortex-A76, VideoCore VII)**

**Performance Estimates:**

| System | Budget | Allocation | Risk |
|--------|--------|-----------|------|
| **Frame Rate** | 60 FPS (16.67ms) | JS 4ms, Render 10ms, OS 2.67ms | LOW (achievable) |
| **Draw Calls** | <500 | Terrain 250, Buildings 100, NPCs 30, Props 80, UI 10, Post-process 10 | MEDIUM (instancing critical) |
| **Memory** | <500 MB | Geometry 150MB, Textures 250MB, Sounds 30MB, Physics 20MB, JS 100MB | LOW (streaming mitigation) |
| **Chunks Active** | 10-15 | ~100-150m radius at LOD0, 500-1000m LOD1-2 | LOW (proven in Minecraft) |
| **NPCs** | 20-30 | AI LOD: nearby=per frame, far=per 5 frames | MEDIUM (needs profiling) |

**Validation:**
- ✅ Draw call reduction techniques documented (instancing, merging, atlasing, LOD)
- ✅ Texture compression strategy (KTX2 + Basis) reduces VRAM 4-6x
- ✅ Physics pooling strategy avoids GC pauses
- ✅ Adaptive quality fallback if FPS drops (dynamic resolution)

---

### 4.2 NPC Scaling ✅

**Population vs. Hardware (from ARCHITECTURE.md 5.2):**

| Hardware | Max NPCs | Draw Call Budget | Physics Time | AI Update |
|----------|----------|------------------|--------------|-----------|
| **RPi 5 (4GB)** | 20-30 | 500 | <3ms | Nearby=1/frame, Far=1/5 frames |
| **Desktop (16GB)** | 100-200 | 1000-2000 | <5ms | All=1/frame |

**GAMEPLAY.md Requirements:**
- Major NPCs: 10-15
- Minor NPCs: 30-50
- Background NPCs: 50+

**Assessment: ⚠️ NEEDS MONITORING**

RPi 5 budget (20-30 NPCs) fits Major + Minor classes, but requires:
1. ✅ LOD AI system (distant NPCs use simplified behavior)
2. ✅ Task pooling (reuse task objects)
3. ✅ Spatial hashing for NPC queries
4. ✅ Update frequency throttling

**Recommendation:** Profile early; if NPCs exceed budget, reduce minor/background count or increase LOD distances.

---

### 4.3 Texture Streaming ✅

**Strategy (from ARCHITECTURE.md 1.2):**
- Initial load: 2-3 seconds (25 chunks + assets)
- Per-chunk file size: 2-8 MB (compressed)
- Texture VRAM footprint: 256-384 MB steady state

**Validation:**
- ✅ KTX2 compression: 4-6x savings documented
- ✅ 256 MB cache with LRU eviction: Sufficient for active chunks
- ✅ Worker thread loading: Async, doesn't block main thread
- ✅ Fallback: Pre-computed chunks in database; runtime generation if missing

**Risk: LOW**

---

## 5. System Integration & Conflict Analysis

### 5.1 Cross-Document Consistency ✅

**Checked Parameters:**

| Parameter | ARCH | GAMEPLAY | ENV | Consistency |
|-----------|------|----------|-----|-------------|
| **Player Camera Height** | 0.3m | Lower than human | 0.2m eye level | ✅ ALIGNED (ENV is precise) |
| **Walk Speed** | 1.5 m/s | 5 m/s | Inferred 1.2-4.2 m/s | ⚠️ MISMATCH (see 5.2) |
| **Jump Height** | 6.0 m/s power | ~1m height | 1-1.5m typical | ✅ ALIGNED |
| **Chunk Size** | 100m × 100m | Explored in 15-30 min | 100m × 100m | ✅ ALIGNED |
| **NPC Population** | 20-30 on RPi | 10-15 major + 30-50 minor | 3-5 per chunk × 10-15 chunks | ⚠️ SEE 5.2 |
| **Stamina System** | Run depletes 25/sec | Not detailed | Not mentioned | ✅ ARCHITECTURE-LED |
| **Collectible Count** | Not specified | 100+ yarn balls | 5-10 per chunk | ✅ ALIGNED |

---

### 5.2 Critical Inconsistencies ⚠️

**ISSUE #1: Walk Speed Discrepancy**

- **ARCHITECTURE.md (1.2.1):** Walk speed = 1.5 m/s, Run speed = 4.0 m/s
- **GAMEPLAY.md (1.1):** Walk = 5 m/s, Sprint = 10 m/s, Climb = 2.5 m/s
- **ENVIRONMENT.md (implied):** ~1.2m cat length × 4.2 body lengths/sec = 5 m/s walk

**Impact:** 3.3x difference (1.5 vs 5 m/s walk)

**Analysis:**
- GAMEPLAY and ENV use realistic cat speeds (real cats walk ~0.5-1.5 m/s, burst ~5 m/s)
- ARCHITECTURE uses conservative speeds (lower risk of clipping, animation issues)
- ENVIRONMENT justification is more detailed ("1.2m cat × 4.2 body lengths/sec")

**RECOMMENDATION: Use GAMEPLAY/ENV speeds (5 m/s walk, 10 m/s sprint)**

**Rationale:**
1. More faithful to cat physics
2. Justified by environment designer
3. 60 FPS with raycast detection handles collision well
4. Conservative speeds risk feeling sluggish on large 5km × 5km map

**Action:** Update ARCHITECTURE.md line 149-150 to match GAMEPLAY.

---

**ISSUE #2: Camera Height Precision**

- **ARCHITECTURE.md (1.1.1):** Cat-eye height = 0.3m
- **ENVIRONMENT.md (1.0):** Cat eye height = 0.2m

**Impact:** 50% difference in perspective

**Analysis:**
- 0.2m (ENVIRONMENT) is more accurate (small domestic cat eye height)
- 0.3m (ARCHITECTURE) provides more generous collision margins
- Both are within cat eye-level range (0.15-0.35m depending on breed/posture)

**RECOMMENDATION: Use 0.25m (compromise)**

**Justification:**
1. Splits difference (0.25m midpoint)
2. Provides margin for physics without distorting perspective
3. Update both ARCHITECTURE and ENVIRONMENT for consistency

---

**ISSUE #3: NPC Population on RPi 5**

- **ARCHITECTURE.md (2.2.6):** Max 20-30 cats on RPi 5
- **GAMEPLAY.md (5.1):** 10-15 major + 30-50 minor + 50+ background = 90-115 total

**Impact:** GAMEPLAY exceeds ARCHITECTURE budget by 3-5x

**Analysis:**
- ARCHITECTURE budget is per spawn area (500m radius)
- GAMEPLAY is total in world (5km × 5km = 256× larger)
- Real world: Need to load/unload NPCs as player moves

**RECOMMENDATION: Clarify in implementation docs**

**Action:** Update GAMEPLAY to specify NPC density is "per active chunk" not "total," with LOD system preventing all from being simulated simultaneously.

**Implementation Detail:**
- Load/unload NPCs based on chunk proximity (similar to geometry)
- Only simulate 20-30 near player at full fidelity
- Distant NPCs use simplified schedules (idle/wander only)
- Total world NPCs can be 90+; active simulated = 20-30

---

### 5.3 Benign Differences (Not Conflicts)

| Difference | ARCH | GAMEPLAY | ENV | Impact |
|-----------|------|----------|-----|--------|
| **Time Scale (Game Minute = Real Second)** | Not specified | Mentioned as "24 min = 24 sec for testing" | Mentioned as "1 min = 4 sec typical" | LOW (implementation detail) |
| **Fall Damage** | Not detailed | "None (yet)" in Peaceful mode | Not mentioned | LOW (difficulty setting) |
| **Stamina Details** | Specified (25 drain, 10 regen) | Not detailed | Not mentioned | LOW (ARCHITECTURE-LED) |
| **Audio System** | Detailed (WebAudio API) | Mentioned (meow variants) | Mentioned (soundscape layers) | LOW (all aligned) |

**These are complementary, not conflicting.**

---

## 6. Risk Assessment & Mitigation

### 6.1 Critical Risks (Must Address Before Implementation)

**NONE**

All critical systems have documented fallbacks:
- Physics engine (Cannon.js → custom AABB if needed)
- Performance optimization (adaptive quality fallback)
- Asset streaming (database cache → runtime generation)

---

### 6.2 Medium Risks (Monitor During Implementation)

| Risk | Severity | Mitigation | Validation |
|------|----------|-----------|-----------|
| **NPC Population Scaling** | MEDIUM | LOD AI + spatial hashing; profile early | Test 50+ NPCs on target hardware |
| **Draw Call Budget on RPi** | MEDIUM | Instancing + texture atlasing non-negotiable | Monthly FPS testing @ 500 draw call target |
| **Physics Simulation Accuracy** | MEDIUM | Cannon.js sphere instability → box colliders | Test object knockback physics @ 60 FPS |
| **Procedural Generation Variability** | LOW | Seed-based determinism; test replayability | Generate 10 different city seeds |
| **Dialogue/NPC Authoring** | MEDIUM | Procedural generation + templated dialogue | Design 10 major NPC dialogue trees |

---

### 6.3 Low Risks (Document & Monitor)

1. **Audio Synthesis Quality:** Oscillator meows may sound artificial (acceptable for stylized game)
2. **Lighting Bake Quality:** Pre-baked shadows may look static during dynamic day/night (acceptable; accept trade-off)
3. **Texture Compression Artifacts:** KTX2 compression may show banding in sky/water (mitigated via post-processing)
4. **Replayability:** Procedural world + seeding may feel repetitive on 2nd playthrough (mitigate via New Game+ changes)

---

## 7. Blockers for Implementation Phase

### 7.1 Blockers: NONE ✅

All three documents are sufficiently detailed for implementation:

**Architect (ARCHITECTURE.md):**
- ✅ Scene management pipeline detailed
- ✅ Physics parameters specified
- ✅ Audio system designed
- ✅ Performance targets documented
- ✅ Serialization format defined

**Gameplay (GAMEPLAY.md):**
- ✅ Movement mechanics specified
- ✅ Interaction systems documented
- ✅ Progression path clear
- ✅ NPC behavior system outlined
- ✅ Difficulty modes defined

**Environment (ENVIRONMENT.md):**
- ✅ District layout detailed
- ✅ Procedural generation algorithm pseudocoded
- ✅ LOD strategy documented
- ✅ Time/weather systems specified
- ✅ Collectible distribution defined

---

### 7.2 Pre-Implementation Checklist

- [ ] **UPDATE ARCHITECTURE.md:** Change walk speed from 1.5 to 5 m/s (per GAMEPLAY)
- [ ] **UPDATE ENVIRONMENT.md & ARCHITECTURE.md:** Camera height to 0.25m (compromise)
- [ ] **ADD to GAMEPLAY.md:** Clarify NPC population is per-chunk with LOD system, not global limit
- [ ] **CREATE IMPLEMENTATION_ROADMAP.md:** 8-week breakdown with feature gates
- [ ] **CREATE TECH_DEBT_LOG.md:** Document fallback systems (custom physics, etc.)

---

## 8. Nice-to-Have Improvements (Not Blocking)

| Improvement | Priority | Effort | Value |
|-------------|----------|--------|-------|
| **Advanced NPC Dialogue** | LOW | HIGH | Procedural generation sufficient for v1 |
| **Multiplayer Foundation** | LOW | VERY HIGH | Single-player v1 is viable; multiplayer phase 2 |
| **Procedural Music** | LOW | MEDIUM | Adaptive music via generative system (future) |
| **Advanced Weather** | LOW | MEDIUM | Seasonal variation post-launch (documented) |
| **Level Editor** | LOW | HIGH | In-browser chunk designer (post-launch tool) |
| **Ray-Traced Lighting** | LOW | VERY HIGH | Not feasible on RPi; skip for performance |

---

## 9. Design Review Verdict

### Overall Assessment: **GREEN ✅**

**The design is:**
- ✅ **Technically feasible** on Raspberry Pi 5 (all systems have fallbacks)
- ✅ **Gameplay-coherent** (core loop is clear, fun, and well-paced)
- ✅ **Environmentally-supported** (vertical design, district progression, NPC placement all aligned)
- ✅ **Performance-realistic** (targets achievable with optimization techniques)
- ✅ **Integrated without critical conflicts** (minor parameter mismatches identified and addressed)
- ✅ **Ready for implementation** (sufficient technical detail across all domains)

### Approval Status: **APPROVED FOR IMPLEMENTATION**

**Conditions:**
1. **Critical:** Apply three consistency fixes (walk speed, camera height, NPC population clarification)
2. **High:** Profile NPC scaling early in dev cycle
3. **Medium:** Monitor draw call budget during terrain/building implementation

### Next Phase: Implementation Roadmap

**Week 1-2:** Foundation (Three.js setup, player movement, basic chunk system)  
**Week 3:** World (Procedural generation, building placement, NPC spawning)  
**Week 4:** Polish (Performance profiling, adaptive quality, audio integration)  
**Week 5-8:** Full feature implementation (NPC behavior, progression, story)

---

## Appendix: Cross-Reference Index

### ARCHITECTURE.md Critical Sections
- 1.1: Scene management (supports GAMEPLAY loop)
- 1.2: Asset streaming (supports ENV 5km × 5km world)
- 1.3: Physics engine (supports GAMEPLAY knockback mechanics)
- 2.1: Movement system (CONFLICT: walk speed mismatch; see 5.2)
- 2.2: AI system (aligns with GAMEPLAY NPC behavior)
- 4.1: Performance targets (realistic per ENV/GAMEPLAY constraints)

### GAMEPLAY.md Critical Sections
- 1.1: Movement mechanics (SOURCE of authoritative walk speed; update ARCH)
- 2.1: Interactions (knockovers, climbing directly supported by ARCH physics)
- 3.1: Core loop (validated against ENV district design)
- 5.1: NPC population (NEEDS clarification re: LOD system)
- 6.1: Story arc (progression gates aligned with ENV exploration)

### ENVIRONMENT.md Critical Sections
- 1.0: Executive summary (camera height 0.2m; conflicts with ARCH 0.3m; see 5.2)
- 1.1-1.3: District layout (supports GAMEPLAY progression path)
- 3.2-3.5: Procedural generation (supports infinite world + replayability)
- 4.1-4.2: Time/weather systems (affects NPC behavior per GAMEPLAY 5.2)
- 5.0: Performance optimization (LOD/culling supporting ARCH targets)

---

**DOCUMENT SIGNED BY: Game Director (Design Verification)**  
**DATE: 2026-07-10 04:30 UTC**  
**NEXT REVIEW: After Week 1 implementation (technical validation against actual profiling data)**
