# Cat City Design Summary

**Project:** Cat City FPS - Procedurally Generated Urban World  
**Engine:** ThreeJS + WebGL  
**Target:** 60 FPS, <500MB memory  
**Scale:** 8km × 8km infinite procedural city (chunk-based)  
**Player Perspective:** First-person feline (30cm ground height)

---

## Documentation Overview

This design package contains four comprehensive specifications:

### 1. **ENVIRONMENT.md** (21.9 KB)
Complete world specification covering:
- City layout and geography (4 neighborhoods + interconnects)
- Environmental systems (time-of-day, weather, seasons, lighting)
- Visual aesthetic framework
- Vertical design (rooftops, underground, parkour)
- Streaming & optimization strategies
- Performance targets and technical specs

### 2. **NEIGHBORHOODS.md** (34.5 KB)
Detailed district specifications:
- **Residential (NW):** Cozy, intimate, Victorian & modern mix
- **Commercial (SE):** Bustling downtown, vertical high-rises
- **Industrial (NE):** Gritty urban edge, artistic culture
- **Park/Nature (SW):** Peaceful exploration, natural features

Each neighborhood includes:
- Architecture typology (6-12 building variations per type)
- Points of interest (landmarks, exploration zones)
- Time-of-day activity cycles
- Vertical exploration routes
- Street furniture and details
- Seasonal variations

### 3. **PROCEDURAL_SPEC.md** (27.7 KB)
Algorithmic specification for content generation:
- **Street Layout:** District-specific generation (organic, grid, irregular, natural)
- **Building Generation:** Type selection, scale, facade variation, height calculation
- **NPC Spawning:** Spawn points, behavior schedules, routing algorithms
- **Object Placement:** Vehicles, street furniture, vegetation
- **Content Streaming:** Chunk loading system, LOD levels, memory management
- **Performance Optimization:** Instancing, frustum culling, noise caching

### 4. **This File:** Design Summary + Aesthetic Decisions

---

## KEY AESTHETIC DECISIONS

### VISUAL STYLE: "Stylized Realism"

**Philosophy:** Realistic proportions with hand-crafted, slightly exaggerated features
- Realistic cat anatomy with expressive eyes
- Accurate building shapes with artistic material textures
- Real car designs with simplified geometry
- Natural landscape with artistic color grading

**Justification:**
- Balances player immersion (realistic scale) with artistic charm (stylization)
- Allows for expressive NPC design without uncanny valley
- Maintains performance by limiting polygon count while maintaining visual quality

---

## COLOR PALETTE DECISIONS

### Primary Urban Palette (Warm Neutrals)
```
Urban Gray (#8B8B8B)      — Concrete, asphalt, industrial base
Brick Red (#C85A54)       — Building facades, historical warmth
Tan/Beige (#D4C5B9)       — Stone, walls, approachable texture
```

### Secondary Urban Palette (Cool Neutrals)
```
Slate Blue (#546B82)      — Metal, glass reflections, modern contrast
Deep Navy (#2C3E50)       — Night sky, shadows, depth
Cool Gray (#A8A8A8)       — Modern surfaces, technology
```

### Accent Colors (Vibrant Energy)
```
Warm Gold (#F4A460)       — Sunset, warm lighting, hope
Fresh Green (#7AC74F)     — Foliage, parks, life
Neon Cyan (#00D9FF)       — Signs, technology, energy
Neon Pink (#FF006E)       — Signs, evening, mystery
Sky Blue (#87CEEB)        — Daytime sky, calm
```

**Rationale:**
- Warm neutrals create inviting, walkable urban spaces
- Cool neutrals provide contrast and modern sophistication
- Accent colors draw attention to points of interest and create districts identity
- Seasonal palette shifts (spring pastels, summer vibrant, fall deep, winter muted) maintain freshness

---

## LIGHTING MOOD DECISIONS

### Daytime Lighting (6 AM - 6 PM)
**Strategy:** Dynamic realistic lighting with clear direction
- Sun position moves realistically across sky (east to west)
- Color temperature: Warm (sunrise/sunset) → Cool (midday)
- Intensity: Follows smooth sine curve (low dawn, peak noon, low dusk)
- Strong directional shadows (important for gameplay visibility)

**Mood:** Energetic, optimistic, playful exploration

### Golden Hour (5 PM - 7 PM)
**Strategy:** Special atmospheric lighting
- Color: Warm amber (2500K)
- Soft shadows (lower sun angle)
- Dramatic long shadows on buildings
- Neon signs beginning to glow
- Haze in air (atmospheric perspective)

**Mood:** Melancholic, romantic, introspective — best for exploration

### Night Lighting (7 PM - 6 AM)
**Strategy:** Artificial + natural lighting
- Streetlights: Warm amber glow (2700K)
- Building windows: Scattered warm interior light
- Neon signs: Bright colored halos (cyan, pink, blue)
- Moon: Subtle illumination (cool blue)
- Ambient: Slight cool blue tint

**Mood:** Mysterious, quiet, eerie but safe

**Technical Implementation:**
- Directional light for sun
- 1000+ point lights for streetlights (with LOD culling)
- Bloom post-processing for neon glow
- Volumetric fog for atmosphere
- Color grading LUT for mood adjustment

---

## ARCHITECTURE STYLE DECISIONS

### Mixed Era Aesthetic
**Concept:** Buildings span 1890s-2020s, showing urban evolution

**Residential District:** Victorian (1890s) + Modern (1980s-2020s)
- **Victorian:** Red brick, detailed cornices, arched windows, character
- **Modern:** Clean lines, glass, open spaces, efficiency
- **Blend:** Charming walkable streets with contemporary amenities

**Commercial District:** Mid-20th century + Contemporary
- **Skyscrapers:** Steel/glass, clean modernism
- **Historic:** Art deco details, grand lobbies
- **Current:** Minimalist glass, sustainable design

**Industrial District:** Factory Era (1920s-1980s) + Artist Conversions
- **Original:** Raw brick, exposed structure, utilitarian
- **Converted:** Modern lofts preserve bones, add personality

**Park District:** Natural + Historic Structures
- **Terrain:** Organic landscape, no grid
- **Structures:** Wooden bridges, stone pavilions, historical monuments

**Rationale:**
- Mixed eras create depth and tell urban story
- Variety prevents visual fatigue during extended play
- Historical aesthetics create authenticity and exploration interest
- Each district becomes visually distinctive and memorable

---

## ENVIRONMENTAL DYNAMICS DECISIONS

### Time-of-Day Cycle: 48-Minute Loop
**Why 48 minutes (not real-time)?**
- Allows player to experience 6 distinct lighting moods in one ~hour session
- Fast enough to feel meaningful change, slow enough to explore each time
- Respects pacing: doesn't force rapid transitions

**Time Impact on Gameplay:**
- Morning (6-9 AM): Few NPCs, peaceful, good for learning
- Day (9 AM-5 PM): Bustling, social, high-energy
- Evening (5-7 PM): Peak activity, beautiful lighting, romantic
- Night (7 PM-6 AM): Sparse, quiet, mysterious, dangerous

### Weather System: 4 States
**Distribution:** 60% clear, 20% cloudy, 15% rain, 5% heavy/snow

**Why Multiple Weather States?**
- Clear: Standard gameplay, high visibility, exploration optimal
- Rain: Atmospheric change, slowed gameplay (hazards), indoor exploration
- Heavy: Dramatic visual change, forces indoor activities, testing
- Snow: Rare, seasonal spectacle, physics changes (interesting challenge)

**Technical Details:**
- Smooth 2-minute transitions between states
- Wet pavement reflections (50% opacity during rain)
- Puddle physics + splashing
- Thunder audio (delayed from lightning for realism)
- Flooding in low terrain during heavy rain

### Seasonal Variations: Full Calendar
**Why full seasons?**
- Visual freshness over extended play
- Cultural events (holidays, harvest, snow)
- Gameplay variations (slippery snow, hot summer)
- World feels alive and evolving

---

## SCALE & TRAVERSAL DECISIONS

### 8km × 8km City (Chunk-Based)
**Why this size?**
- Large enough for 4 distinct neighborhoods
- Small enough for meaningful navigation (8 minutes corner-to-corner)
- Chunk-based allows infinite expansion
- Performance-friendly (<500MB at any moment)

### 256m × 256m Chunks
**Why this granularity?**
- Balanced load/unload frequency
- Typical view distance ~1km (visible + 1 buffer)
- Streaming completes in <2 seconds
- Memory footprint predictable

### 30cm Ground Height (Cat Perspective)
**Why this unusual height?**
- Completely changes level design (obstacles become mountains)
- Fire hydrants become towering objects
- Makes human-scale architecture feel vast
- Gameplay consequences: Can climb/squeeze into cat-only areas
- Visual freshness: Low-angle perspective on familiar urban elements

---

## VERTICAL DESIGN PHILOSOPHY

### Three Distinct Layers

**Layer 1: Ground Level (±0m)**
- Standard pedestrian experience
- Human-sized architecture
- Vehicles and street level

**Layer 2: Rooftops & Upper Levels (+2m to +40m)**
- Parkour challenge zones
- Elevated shortcuts
- Scenic overlooks
- Danger: Fall damage

**Layer 3: Underground (-2m to -30m)**
- Subway system (transport)
- Utility tunnels (atmosphere)
- Cave system (exploration)
- Danger: Darkness, water, trains

**Rationale:**
- Multiple traversal options create player choice
- Vertical exploration feels rewarding
- Different zones for different playstyles
- Parkour players use rooftops, explorers use tunnels

---

## NPC DISTRIBUTION DECISIONS

### Density Model
```
Residential:  8,000-12,000 NPCs (moderate)
Commercial:  15,000-30,000 NPCs (very high)
Industrial:   2,000-5,000 NPCs (low)
Park:         1,000-3,000 NPCs (minimal)
```

**Why this distribution?**
- Commercial feels bustling and energetic
- Residential feels inhabited but walkable
- Industrial feels abandoned, atmospheric
- Park feels peaceful and open

### NPC Activity Scheduling
**Time-based probabilities determine NPC presence**
- Rush hours (8-9 AM, 5-7 PM): Peak commercial/residential
- Daytime (9 AM-5 PM): Workers in commercial, shoppers
- Evening (5-9 PM): Varied activities, golden hour exploration
- Night (9 PM-6 AM): Sparse, eerie, only essential workers

**Rationale:**
- Feels realistic and alive
- Player can observe patterns and plan exploration
- Quiet times feel special and quiet

---

## OPTIMIZATION STRATEGY DECISIONS

### Memory Target: <500MB
**Breakdown:**
- GPU Textures: 256MB (largest allocation)
- Geometry: 150MB (models, meshes)
- Audio: 50MB (streamed)
- Reserved: 44MB (buffer)

**Why conservative?**
- Must run on Raspberry Pi (GPU-limited)
- Allows sustained gameplay without stutter
- Leaves room for NPC, physics, particles

### Draw Call Target: <1500/frame @ 60 FPS
**Strategy:**
- Instanced rendering for repeated objects (20-50 draw calls)
- Frustum culling (30-40% of objects out of view)
- LOD system (far objects use simple geometry)
- Material batching (similar shaders grouped)

### Streaming Strategy: Progressive LOD
```
Near (0-100m):   LOD0 — Full detail (2K textures)
Mid (100-500m):  LOD1 — Medium (1K textures, 60% geometry)
Far (500-1500m): LOD2 — Simple (512 textures, 30% geometry)
Ultra (1500m+):  LOD3 — Billboard only
```

**Rationale:**
- Full detail only where needed (maintains visual quality near player)
- Progressive reduction prevents pop-in
- Billboard system handles ultra-far objects elegantly

---

## GAME FEEL DECISIONS

### Audio Landscape Strategy
**Layered approach:**
1. **Ambient baseline** (12 dB): Urban hum, wind
2. **Environmental layer** (0 dB): Traffic, crowds, birds
3. **Interactive layer** (relative): Player footsteps, meowing, interactions

**Why separate layers?**
- Ambient creates immersion without being distracting
- Environmental layer provides gameplay info (busy/quiet, location cues)
- Interactive layer gives player agency (sound feedback)

### Visual Feedback Systems
**Particle Effects:**
- Rain particles (300+ per frame during storm)
- Dust in light shafts
- Splash effects on water
- Pollen in spring
- Leaf particles in fall

**Shader Effects:**
- Bloom for neon signs
- Ambient occlusion for depth
- Screen-space reflections for water
- Color grading for mood/time
- Fog for atmospheric perspective

---

## DESIGN VALIDATION CRITERIA

### Visual Quality Gates
- ✓ Framerate maintains 60 FPS in all districts
- ✓ Lighting smooth transitions across time
- ✓ Weather effects visible and performant
- ✓ NPCs visible and believable
- ✓ No visual popping (LOD smooth)

### Gameplay Gates
- ✓ Player movement responsive and fluid
- ✓ Jumping/climbing mechanics feel right
- ✓ Exploration rewarding (hidden areas findable)
- ✓ Districts feel distinct and thematic
- ✓ Audio landscape immersive

### Technical Gates
- ✓ Memory usage <500MB peak
- ✓ Draw calls <1500/frame
- ✓ Streaming seamless (no hitching)
- ✓ Collision detection accurate
- ✓ Physics stable

---

## NEXT STEPS FOR IMPLEMENTATION

1. **Phase 1: Foundation (Week 1)**
   - Set up Three.js scene with basic chunk system
   - Implement time-of-day lighting
   - Test performance targets

2. **Phase 2: Procedural Content (Week 2)**
   - Implement building generation algorithms
   - Add street layout system
   - Create asset instancing pipeline

3. **Phase 3: World Features (Week 3)**
   - Add weather system
   - Implement NPC spawning and AI
   - Create particle systems

4. **Phase 4: Polish (Week 4)**
   - Performance optimization passes
   - Visual effects (bloom, AO, grading)
   - Audio landscape implementation

---

## DESIGN DOCUMENT STATISTICS

| Document | Pages | Words | Key Sections |
|----------|-------|-------|--------------|
| ENVIRONMENT.md | 22 KB | ~4,400 | 10 major sections |
| NEIGHBORHOODS.md | 35 KB | ~7,000 | 4 districts × 8 sections |
| PROCEDURAL_SPEC.md | 28 KB | ~5,600 | 10 algorithm specifications |
| **Total** | **85 KB** | **~17,000** | **35+ detailed subsections** |

---

**Design Completed:** 2026-07-10  
**Status:** Ready for Implementation  
**Next Phase:** Load PROCEDURAL_SPEC.md into development environment

