# Cat Walk: Implementation Plan
## High-Level Phase Overview & Schedule

**Version:** 1.0  
**Date:** 2026-07-10  
**Target Launch:** 20 weeks from start  
**Team Size:** 4-5 developers (Engine, Gameplay, Art, Audio, QA)  

---

## PROJECT OVERVIEW

This document outlines the high-level development roadmap for Cat Walk, breaking down the consolidated GAME_SPEC.md into actionable phases with deliverables, timelines, and resource allocation.

---

## PHASE 1: MVP (Weeks 1-6) — Playable Cat in One Neighborhood

### Goals
- Establish technical foundation (build pipeline, rendering, physics)
- Prove core gameplay loop works (movement, interaction, exploration)
- Validate performance targets on RPi 5
- Secure "vertical slice" playable within 6 weeks

### Key Features

#### Week 1-2: Engine Setup & First Chunk
**Deliverables:**
- Three.js boilerplate with ES6 modules
- Webpack/Vite build pipeline with asset compression
- Single 100m×100m test chunk with basic geometry
- Player camera at 0.25m height with WASD/mouse controls
- Basic ground plane with collision

**Acceptance Criteria:**
- Can move around test chunk at 5 m/s
- Frame rate stable 60 FPS on desktop
- Load time <2 seconds
- No memory leaks in first hour of play

**Team:** 1 engineer (engine lead)
**Risk:** Build pipeline complexity (mitigated: use Three.js template)

---

#### Week 2-3: Movement & Physics Integration
**Deliverables:**
- Cannon-es physics world with gravity
- Player capsule collider (0.25m height, 0.1m radius)
- Jump mechanic with coyote time
- Sprint with stamina system (100 points, drain 20/sec, recover 15/sec)
- Ground detection (raycast)

**Acceptance Criteria:**
- Jump height ~1.0m, airtime 0.6-0.8s
- Stamina depletes/recovers correctly
- No clipping through ground
- Movement feels responsive (<50ms input lag)

**Team:** 1 engineer (gameplay)
**Risk:** Physics solver tuning (mitigated: extensive tweaking)

---

#### Week 3-4: Knockable Objects & Audio
**Deliverables:**
- 5-10 knockable objects (boxes, vases, papers)
- Physics mass system (light/medium/heavy categories)
- Impact audio (material-dependent: ceramic, wood, metal)
- Spatial audio positioning (Web Audio API)
- Sound pool management

**Acceptance Criteria:**
- Knock objects 2-4 meters with realistic momentum
- Audio plays on impact with correct volume attenuation
- Max 8 concurrent sound sources (no audio artifacts)
- Satisfying "thunk" feedback

**Team:** 1 engineer (gameplay), 1 audio designer
**Risk:** Audio latency (mitigated: Web Audio mixer testing)

---

#### Week 4-5: Climbable Surfaces & NPCs
**Deliverables:**
- 2-3 climbable objects (tree, fence, wall)
- Climb state machine (grounded → climbing → falling)
- Raycast detection for climbable surfaces
- 3-5 simple NPCs with idle/walk behaviors
- NPC daily schedule (8 AM-6 PM routine)

**Acceptance Criteria:**
- Can climb tree via Alt+directional input
- Climb speed 1.5 m/s, stamina drain 15/sec
- NPCs patrol simple paths
- No pathfinding errors/infinite loops

**Team:** 1 engineer (gameplay), 1 engineer (AI)
**Risk:** Climbing feels awkward (mitigated: extensive UX testing)

---

#### Week 5-6: Save/Load & Polish MVP
**Deliverables:**
- Save system (position, rotation, npc states)
- Load game from IndexedDB
- Basic UI (stamina bar, collectibles counter, objective marker)
- Tutorial quest (explore neighborhood, meet NPC, collect item)
- Placeholder assets for rough playability

**Acceptance Criteria:**
- Game saves every 2 minutes
- Load restores exact player position
- UI doesn't obscure gameplay
- MVP playable for 30 minutes without crashing

**Team:** 1 engineer (gameplay), 1 UI/UX designer
**Risk:** Save system consistency (mitigated: extensive testing)

### Phase 1 Success Metrics
- ✅ Frame rate: 60 FPS stable on RTX 3060, 30+ FPS on RPi 5
- ✅ Memory: <300 MB peak (single chunk)
- ✅ Draw calls: <200 per frame
- ✅ Playable for 1 hour without critical bugs
- ✅ Team can move to Phase 2 without rework

### Resource Allocation (Phase 1)
| Role | Count | Allocation |
|------|-------|-----------|
| Engine Lead | 1 | 100% (6 weeks) |
| Gameplay Engineer | 1 | 100% (6 weeks) |
| AI Engineer | 0.5 | 50% (Weeks 4-6) |
| Audio Designer | 0.5 | 50% (Weeks 3-6) |
| **Total** | **3** | **5.5 person-weeks** |

---

## PHASE 2: FULL WORLD (Weeks 7-14) — 4 Neighborhoods, Procedural Generation

### Goals
- Complete procedural generation pipeline
- Implement all 4 neighborhoods with distinct aesthetics
- Build streaming system for seamless exploration
- Scale NPCs to 30+ with relationship system
- Establish complete gameplay loop

### Key Features

#### Week 7-8: Procedural Generation Pipeline
**Deliverables:**
- Perlin noise-based terrain generation (FBM, 4 octaves)
- Street network generation (organic grid via path subdivision)
- Building placement algorithm (constraint satisfaction)
- Vegetation/deco placement (Poisson disk sampling)
- Asset selection per building type

**Acceptance Criteria:**
- Generate diverse 100m×100m chunks
- Chunks feel hand-crafted, not procedural
- Load time <500ms per chunk
- Deterministic seeding (same seed = same chunk)

**Team:** 1 engineer (procedural generation specialist)
**Risk:** Generation quality (mitigated: visual art direction)

---

#### Week 8-9: Chunk Streaming System
**Deliverables:**
- Streaming manager (load/unload based on distance)
- 3×3 chunk grid centered on player (9 chunks active)
- Predictive loading (2 chunks ahead)
- LOD system (4 tiers: LOD0-3)
- Memory management (LRU eviction at 400 MB)

**Acceptance Criteria:**
- Seamless chunk transitions (<0.1s visible pop-in)
- Memory stays <500 MB
- Draw calls <500 per frame
- Can explore 1+ km without reset

**Team:** 1 engineer (engine)
**Risk:** Memory fragmentation (mitigated: careful pooling)

---

#### Week 9-10: Four Neighborhoods Design & Art
**Deliverables:**
- Whisker Park (residential, 0.9 km²): 10 building types, park assets
- Yarn Mill (industrial, 1.1 km²): warehouse, street art textures
- Downtown Core (commercial, 0.8 km²): skyscrapers, plazas
- Moon Garden (parks, 1.2 km²): vegetation, pavilions
- District-specific NPCs, POIs, lighting

**Acceptance Criteria:**
- Each district visually distinct
- 100+ unique building façades
- Texture atlasing <256 MB
- POIs clearly marked/identifiable

**Team:** 2 artists (3D modeling, texturing), 1 level designer
**Risk:** Asset creation scope (mitigated: modular asset system)

---

#### Week 10-11: NPC System & Relationships
**Deliverables:**
- NPC behavior tree system (selector, sequence, task)
- Daily schedule system (time-of-day aware)
- Relationship tracking (-100 to +100 scale)
- Dialogue system (simple branching)
- NPC pathfinding (NavMesh + A*)

**Acceptance Criteria:**
- 30+ NPCs active, 20-30 near player
- Relationship changes persist across saves
- NPCs have distinct visual appearance + personality
- Dialogue reflects relationship level

**Team:** 1 AI engineer, 1 dialogue writer
**Risk:** NPC behavior variety (mitigated: procedural dialogue templates)

---

#### Week 11-12: Time-of-Day & Weather System
**Deliverables:**
- 24-hour cycle (20 minutes real-time)
- Dynamic lighting (sun rotation, color shift)
- Weather transitions (clear → overcast → rain)
- Particle systems (rain, snow, fog)
- Ambient soundscape layers

**Acceptance Criteria:**
- Smooth lighting transitions throughout day
- Weather feels atmospheric, not distracting
- Particle performance <2ms
- Audio ambience layers seamlessly

**Team:** 1 graphics engineer, 1 audio designer
**Risk:** Lighting bake quality (mitigated: post-processing enhancement)

---

#### Week 12-13: Collectibles & Achievements
**Deliverables:**
- Yarn ball distribution (20+ per neighborhood)
- Fish treat placement (hidden in POIs)
- Feather collection mechanic
- Achievement tracking system
- Badge/reward system

**Acceptance Criteria:**
- 100+ collectibles feel naturally placed
- Achievements encourage exploration
- Reward progression feels meaningful
- No unreachable items

**Team:** 1 gameplay designer, 1 level designer
**Risk:** Collection balance (mitigated: statistical testing)

---

#### Week 13-14: Integration & Playtesting
**Deliverables:**
- All 4 neighborhoods integrated into seamless world
- Quest system (tutorial → exploration → discovery)
- Full save/load across all chunks
- UI iteration (map, objective, inventory)
- Closed alpha playtesting (5-10 testers)

**Acceptance Criteria:**
- Game playable from start to "60% exploration"
- No blocking bugs
- Average session: 15-60 minutes
- Playtester feedback integrated

**Team:** 1 QA lead, 1 designer, 1 engineer
**Risk:** Integration bugs (mitigated: continuous integration)

### Phase 2 Success Metrics
- ✅ 4 neighborhoods fully explorable
- ✅ 60+ NPCs with relationship system
- ✅ 100+ collectibles
- ✅ 60 FPS on desktop, 45 FPS on RPi 5
- ✅ <500 MB memory peak
- ✅ 5+ hours gameplay without major bugs

### Resource Allocation (Phase 2)
| Role | Count | Allocation |
|------|-------|-----------|
| Engine Engineer | 1 | 100% (8 weeks) |
| Gameplay Engineer | 1 | 100% (8 weeks) |
| Procedural Gen Specialist | 1 | 100% (Weeks 7-9) |
| AI Engineer | 1 | 100% (8 weeks) |
| 3D Artist | 1 | 100% (8 weeks) |
| Texture Artist | 0.5 | 50% (8 weeks) |
| Audio Designer | 0.5 | 50% (8 weeks) |
| Level Designer | 0.5 | 50% (Weeks 9-14) |
| QA Lead | 0.5 | 50% (Weeks 13-14) |
| **Total** | **5.5** | **43 person-weeks** |

---

## PHASE 3: OPTIMIZATION & POLISH (Weeks 15-20) — 60 FPS RPi 5, Quality

### Goals
- Achieve consistent 60 FPS on RPi 5 (currently 45 FPS)
- Optimize for <500 MB memory
- Implement accessibility features
- Polish all systems for launch quality
- Comprehensive QA pass

### Key Features

#### Week 15: Performance Profiling & Optimization
**Deliverables:**
- Frame-time analysis (GPU/CPU breakdown)
- Draw call reduction (<500 target)
- Texture memory audit (KTX2 Basis compression)
- JavaScript heap profiling
- Asset streaming tuning

**Acceptance Criteria:**
- 60 FPS stable on RPi 5 (previously 45 FPS)
- <500 MB peak memory
- Draw calls <500
- No GC pauses >10ms

**Team:** 1 performance engineer
**Risk:** Optimization rabbit hole (mitigated: strict time box)

---

#### Week 15-16: Asset Compression & LOD Refinement
**Deliverables:**
- Draco mesh compression on all geometry (-60% size)
- KTX2 Basis texture encoding (-75% VRAM)
- Mipmap generation for all textures
- LOD0-3 validation (distant objects look acceptable)
- Pre-compressed asset build pipeline

**Acceptance Criteria:**
- Texture VRAM <256 MB (down from 300+ MB)
- Geometry size <150 MB in memory
- No visual degradation at distance
- Compression build time <2 minutes

**Team:** 1 graphics engineer
**Risk:** Compression artifacts (mitigated: visual testing)

---

#### Week 16-17: Accessibility & Localization
**Deliverables:**
- Colorblind modes (Deuteranopia, Protanopia, Tritanopia)
- Audio cues for all visual feedback
- Remappable controls system
- FOV slider (60-100°)
- Motion sickness options (disable head bob, vignette)
- UI text sizing

**Acceptance Criteria:**
- Game fully playable without color vision
- Audio cues redundant with visuals
- All default controls reassignable
- Accessibility QA pass

**Team:** 1 accessibility specialist, 1 QA
**Risk:** Audio cue coverage (mitigated: checklist validation)

---

#### Week 17-18: Dialogue, NPCs, Challenge System
**Deliverables:**
- 10+ major NPC dialogue trees (procedurally-generated branching)
- Challenge tier system (5 tiers: tutorial → master)
- Leaderboard UI (optional, local for now)
- Prestige/New Game+ mode
- Cosmetics system (skins, tails, meow variations)

**Acceptance Criteria:**
- 10 major NPCs have unique personalities
- Challenge system feels balanced (progression clear)
- Cosmetics feel rewarding, not pay-to-win
- Prestige mode extends gameplay 20+ hours

**Team:** 1 designer, 1 dialogue writer, 1 gameplay engineer
**Risk:** Dialogue volume (mitigated: procedural generation templates)

---

#### Week 18-19: Final Polish & Quality Assurance
**Deliverables:**
- Bug fix pass (prioritized by severity/frequency)
- UI iteration (menu flow, onboarding, settings)
- Tutorial quest refinement (teach all mechanics)
- Balance pass (movement, stamina, difficulty)
- Build optimization (asset pipeline efficiency)

**Acceptance Criteria:**
- <10 P1 bugs remaining
- Tutorial teaches all mechanics
- Settings menu covers all options
- Performance stable across all target hardware

**Team:** 2 QA, 1 designer, 1 engineer
**Risk:** Last-minute bugs (mitigated: early testing)

---

#### Week 19-20: Closed Beta & Launch Prep
**Deliverables:**
- Closed beta build (50-100 testers)
- Community feedback collection & prioritization
- Critical bug fixes
- Launch trailer/documentation
- Server setup (if multiplayer planned)

**Acceptance Criteria:**
- Average playtime: 2+ hours per tester
- Playtester satisfaction: >80%
- <5 P1 bugs from beta
- Ready for open launch

**Team:** 1 QA lead, 1 community manager, 1 engineer
**Risk:** Last-minute critical bugs (mitigated: extensive pre-beta testing)

### Phase 3 Success Metrics
- ✅ 60 FPS stable on RPi 5 (verified on hardware)
- ✅ 45+ FPS on RPi 4
- ✅ 120 FPS on desktop
- ✅ <500 MB memory peak
- ✅ <10 P1 bugs
- ✅ All accessibility features implemented
- ✅ Ready for public launch

### Resource Allocation (Phase 3)
| Role | Count | Allocation |
|------|-------|-----------|
| Performance Engineer | 1 | 100% (Weeks 15-16) |
| Graphics Engineer | 1 | 100% (Weeks 16-17) |
| Accessibility Specialist | 1 | 100% (Weeks 16-17) |
| Gameplay Designer | 1 | 100% (Weeks 17-18) |
| Dialogue Writer | 0.5 | 50% (Weeks 17-18) |
| QA Lead | 1 | 100% (Weeks 18-20) |
| QA Tester | 1 | 100% (Weeks 18-20) |
| Community Manager | 0.5 | 50% (Weeks 19-20) |
| **Total** | **5.5** | **43 person-weeks** |

---

## PHASE 4: POST-LAUNCH CONTENT (Weeks 21+) — Ongoing Support

### Potential Additions (Roadmap)

1. **New Game+ Mode** (2-3 weeks)
   - Unlocked abilities from start
   - Harder NPCs/challenges
   - Cosmetic variations

2. **Seasonal Events** (1-2 weeks per season)
   - Holiday decorations
   - Special NPCs
   - Limited-time challenges

3. **Mobile Version** (6-8 weeks)
   - Touch controls, gyroscopic look
   - Optimized for iOS/Android
   - Cross-platform save sync

4. **Multiplayer Social Features** (8-12 weeks)
   - Shared discoveries
   - Leaderboards (speedrun, completion %)
   - Photo mode sharing

5. **Story DLC** (6-8 weeks per episode)
   - New neighborhoods
   - Additional NPCs
   - Novel narrative threads

6. **Modding Tools** (12+ weeks)
   - Map editor
   - NPC personality customization
   - Community asset creation

---

## CRITICAL PATH DEPENDENCIES

### Week-to-Week Dependencies

```
Phase 1: MVP (Weeks 1-6)
├─ Weeks 1-2: Engine setup → required for Weeks 2-6
├─ Weeks 2-3: Physics → required for movement/jumping
├─ Weeks 3-4: Audio → parallel (can be done in parallel)
├─ Weeks 4-5: NPCs → depends on movement done
└─ Weeks 5-6: Save/load → depends on all systems above

Phase 2: Full World (Weeks 7-14)
├─ Weeks 7-8: Proc gen → required for streaming (Weeks 8-9)
├─ Weeks 8-9: Streaming → depends on proc gen
├─ Weeks 9-10: Art → parallel, enables districts
├─ Weeks 10-11: NPCs → depends on streaming/districts
├─ Weeks 11-12: Time/weather → mostly parallel
├─ Weeks 12-13: Collectibles → depends on districts placed
└─ Weeks 13-14: Integration → depends on all above

Phase 3: Optimization (Weeks 15-20)
├─ Week 15: Profiling → enables all optimizations
├─ Weeks 15-16: Compression → depends on profiling
├─ Weeks 16-17: Accessibility → parallel
├─ Weeks 17-18: Dialogue → parallel
├─ Weeks 18-19: Polish → depends on all previous
└─ Weeks 19-20: Beta → depends on all previous
```

### Critical Bottlenecks

1. **Week 8: Proc Gen Completion** → Blocks streaming, art, NPCs
2. **Week 15: Performance Profiling** → Blocks optimization decisions
3. **Week 18: Tutorial Refinement** → Blocks launch readiness

---

## RISK MITIGATION TIMELINE

### High-Risk Items (Early Identification)

| Risk | Identification (Week) | Mitigation |
|------|----------------------|-----------|
| Physics feel unresponsive | Week 3 | Extensive UX testing, control tuning |
| Proc gen quality low | Week 8 | Art direction, hand-crafting adjustments |
| Performance target unachievable | Week 14 | Design scope reduction (fewer NPCs, simpler graphics) |
| NPC AI too complex | Week 11 | Simplify behavior trees, use templates |
| Dialogue authoring bottleneck | Week 17 | Procedural dialogue + templates |
| Platform-specific bugs | Week 19 | Early hardware testing each phase |

---

## QUALITY GATES

### Phase 1 Gate (Week 6)
- [ ] MVP playable 30+ minutes without crash
- [ ] 60 FPS desktop, 30+ FPS RPi 5
- [ ] Core movement feels responsive
- [ ] Team can demonstrate gameplay loop

### Phase 2 Gate (Week 14)
- [ ] 4 neighborhoods fully explorable
- [ ] 5+ hours gameplay
- [ ] Streaming system seamless
- [ ] Closed alpha testing feedback positive

### Phase 3 Gate (Week 20)
- [ ] 60 FPS RPi 5 verified on hardware
- [ ] <10 P1 bugs
- [ ] All accessibility features complete
- [ ] Closed beta ready

---

## SCHEDULE SUMMARY

| Phase | Weeks | Team Size | Key Deliverable |
|-------|-------|-----------|-----------------|
| MVP | 1-6 | 3-4 | Playable cat in one neighborhood |
| Full World | 7-14 | 5-6 | 4 neighborhoods, 60+ NPCs |
| Optimization | 15-20 | 5-6 | 60 FPS RPi 5, launch quality |
| **Total** | **20 weeks** | **4-6 average** | **Game launch** |

**Calendar Estimate:**
- Start: Next Monday (2026-07-13)
- Phase 1 Complete: 2026-08-24
- Phase 2 Complete: 2026-10-12
- Phase 3 Complete: 2026-11-23
- **Launch Ready:** Late November 2026

---

## RESOURCE ALLOCATION SUMMARY

### By Phase

| Role | Phase 1 | Phase 2 | Phase 3 | Total |
|------|---------|---------|---------|-------|
| Engine Lead | 100% | 50% | 20% | 450 hours |
| Gameplay Engineer | 100% | 100% | 50% | 540 hours |
| AI Engineer | 30% | 100% | 20% | 450 hours |
| Procedural Gen Specialist | 0% | 75% | 0% | 240 hours |
| Audio Designer | 30% | 50% | 20% | 300 hours |
| 3D Artist | 0% | 100% | 0% | 480 hours |
| Texture Artist | 0% | 50% | 0% | 240 hours |
| Level Designer | 0% | 50% | 20% | 240 hours |
| Accessibility Specialist | 0% | 0% | 50% | 200 hours |
| Dialogue Writer | 0% | 10% | 50% | 240 hours |
| QA Lead | 10% | 20% | 100% | 480 hours |
| QA Tester | 0% | 0% | 100% | 480 hours |
| Community Manager | 0% | 0% | 25% | 120 hours |

**Total Effort:** ~4,200 person-hours (20 weeks × 4-6 FTE average)

---

## COMMUNICATION & REPORTING

### Weekly Standup
- **Format:** 30-minute sync, all hands
- **Cadence:** Monday 10 AM
- **Agenda:** Blockers, next week goals, risks

### Bi-Weekly Review
- **Format:** 1-hour phase review
- **Cadence:** Every other Friday 2 PM
- **Attendees:** Core team + leads
- **Deliverable:** Status report, prioritized blockers

### End-of-Phase Milestone
- **Format:** Playable build demo + retrospective
- **Attendees:** Full team
- **Duration:** 2 hours
- **Output:** Go/no-go decision, Phase N+1 planning

---

## SUCCESS CRITERIA (Overall)

✅ **Launch Readiness:**
- Game playable 60+ hours without critical bugs
- 60 FPS stable on RPi 5, >100 FPS on desktop
- All 4 neighborhoods fully implemented
- 80+ NPCs with unique personalities
- 100+ collectibles
- Accessibility features complete
- Tutorial guides new players effectively

✅ **Playtester Validation:**
- Average session: 30-90 minutes
- 80%+ satisfaction score
- <5 P1 bugs post-launch

✅ **Technical Targets:**
- <500 MB memory peak
- <500 draw calls per frame
- Asset load time <500ms per chunk
- No GC pauses >10ms

---

**End of IMPLEMENTATION_PLAN.md**

Last Updated: 2026-07-10  
Prepared By: Technical Lead (Synthesizer)  
Approved By: Project Lead
