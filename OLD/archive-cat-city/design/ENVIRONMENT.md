# Cat City Environment Design Specification

**Version:** 1.0  
**Date:** 2026-07-10  
**Status:** Complete Design Specification  
**Target Platform:** ThreeJS / WebGL (RPi 5 optimized, <500MB memory)

---

## Executive Summary

Cat City is a procedurally-generated urban exploration game where players navigate as a cat through a dynamic, time-aware metropolis. The environment features 4 distinct neighborhoods, a full day-night cycle, weather systems, and intelligent streaming architecture for seamless exploration. All design optimizes for **60 FPS on RPi 5** with <500MB peak memory usage.

---

## 1. CITY LAYOUT & ARCHITECTURE

### 1.1 City Scale & Metrics

| Metric | Value | Rationale |
|--------|-------|-----------|
| **Total City Area** | 4 km² (2×2 km) | Explorable in 30-40 min walk; manageable procedural complexity |
| **Grid Cell Size** | 256m × 256m | Streaming chunk (LOD2) = 512m × 512m = 4 cells |
| **Block Size** | 32-48m avg | Realistic city block from cat perspective (120cm height) |
| **Building Height** | 4-12 floors | Mix: residential 4-6f, commercial 8-12f, avg roof height 12-16m |
| **Street Width** | 8-16m | Navigable by car; alleyways 2-4m |
| **Traversal Time** | 10 min corner-to-corner | At 1.5 m/s cat walk speed |

### 1.2 Neighborhood Districts

#### **DISTRICT 1: WHISKER PARK (NW - Residential)**
- **Size:** 0.9 km² (30% of city)
- **Theme:** Quiet residential neighborhoods, tree-lined streets, suburban charm
- **Architecture:** Low-rise houses (2-4f), brownstones, Victorian charm, family-owned shops
- **Key Features:**
  - Central park: 200m × 150m with gazebo, playground (human-scale slides look like mountains)
  - Tree coverage: 40% (birch, oak, willow)
  - Street lights: Warm 2700K sodium lamps
  - Parking: Diagonal street parking, garages
  - Sidewalk width: 4-6m (wider, safer for cats)
- **Points of Interest:**
  - Whisker Park Plaza (town square with fountain)
  - Community Garden (vegetables, herbs)
  - Cat Sanctuary (adoption center, cat welfare focus)
  - Cozy Bookstore (quiet reading area, sunlit windows)
  - Pet-Friendly Diner (outdoor seating, food scraps)
- **NPC Population:** 120-150 cats, 80-100 humans
- **Spawn Zones:** Parks, sidewalks, gardens, shops
- **Atmosphere:** Peaceful, safe, golden-hour friendly, low traffic

#### **DISTRICT 2: YARN MILL DISTRICT (SE - Industrial/Mixed-Use)**
- **Size:** 1.1 km² (35% of city)
- **Theme:** Revitalized industrial, trendy warehouse conversions, street art
- **Architecture:** Converted factories (6-8f), modern lofts, exposed brick, large windows, rooftop gardens
- **Key Features:**
  - Yarn Mill River (2m wide, crossable via bridges/jumping)
  - Warehouse district (6 large structures, rooftop parkour terrain)
  - Street art & murals (animated textures in day cycle)
  - Market stalls & food vendors (weekend-active)
  - Rooftop pathways (cat-optimal traversal)
- **Points of Interest:**
  - Yarn Mill Marketplace (daily food market)
  - Street Art Alley (mutable murals, dynamic textures)
  - Warehouse Parkour Zone (rooftop jumping challenge area)
  - Riverside Path (safe walking, fishing spots)
  - Cat Cafe (central social hub, 40+ cats)
- **NPC Population:** 100-130 cats, 150+ humans
- **Spawn Zones:** Market, cafes, rooftops, river paths
- **Atmosphere:** Vibrant, mixed day/night activity, street culture, Instagram-worthy

#### **DISTRICT 3: DOWNTOWN CORE (SW - Commercial)**
- **Size:** 0.8 km² (25% of city)
- **Theme:** Modern urban center, high-rise offices, retail
- **Architecture:** Skyscrapers (10-20f), glass/steel, modern plazas, underground shopping
- **Key Features:**
  - Central Tower (15f, visible from entire city, navigation landmark)
  - Underground mall system (climate-controlled, safe from weather)
  - Multiple plazas with fountains
  - Street level: High foot traffic, fast-paced
  - Rooftops: Sparse trees, utility boxes, water towers
  - Vertical architecture: Ledges, pipes, HVAC units (cat traversal)
- **Points of Interest:**
  - Downtown Tower (observation deck, high-risk parkour challenge)
  - Central Plaza (performance space, NPC gatherings)
  - Pet Supply Megastore (3 floors of shopping)
  - Gourmet Food Court (high-quality dumpster diving)
  - Urban Garden Rooftop (hidden oasis, quiet retreat)
- **NPC Population:** 60-80 cats, 300+ humans (daytime only)
- **Spawn Zones:** Plazas, streets, cafes, shops
- **Atmosphere:** Busy, modern, artificial lighting, vertical parkour challenges

#### **DISTRICT 4: MOON GARDEN (NE - Parks & Green)**
- **Size:** 1.2 km² (38% of city)
- **Theme:** Natural escape, botanical gardens, wildlife haven
- **Architecture:** Open spaces, garden structures, pavilions, minimal buildings
- **Key Features:**
  - Central Botanical Garden (250m × 200m, lush plant life)
  - Forest Grove (dense tree coverage, 60%)
  - Three ponds (jumping puzzles, fish!)
  - Hiking trails (winding paths, elevation changes)
  - Meadows (open spaces, high visibility)
  - Minimal development (sustainable, eco-friendly theme)
- **Points of Interest:**
  - Moon Garden Conservatory (tropical climate area)
  - Sacred Grove (dense forest, atmospheric)
  - Meditation Lotus Pond (serene, boss cat hangout)
  - Wildflower Meadow (color palette changes seasonally)
  - Observatory Pavilion (night-time landmark)
- **NPC Population:** 80-100 cats, 30-50 humans (weekends only)
- **Spawn Zones:** Gardens, trails, ponds, meadows
- **Atmosphere:** Serene, natural, wildlife-focused, day-cycle responsive

### 1.3 Vertical Design

**Ground Level (0-2m cat-eye height):**
- Sidewalks, streets, ground-floor shops
- Parked cars, benches, street signs
- Grass patches, flower boxes
- Hydrants, drainage grates (navigation hazards)

**Climbing Zone (2-6m):**
- Low walls, fences (1.5-2m)
- Shop windows, ledges, AC units
- Tree branches (parkour pathways)
- Fire escapes (accessible via various routes)
- Chain-link fences (climbable texture)

**Rooftop Zone (6-20m):**
- Building rooftops (primary highway for cats)
- Water tanks, chimneys, utility boxes
- Rooftop gardens, solar panels
- TV antennas (landmarks)
- Ledges connecting buildings

**Underground Zone (-2 to 0m):**
- Storm drains (accessibility tunnels)
- Basement areas (limited, hazard zones)
- Underground mall (safe, climate-controlled)
- Subway station (partial, atmospheric, no trains)

**Key Vertical Mechanic:** Cats naturally navigate 3D space. Every major area has multiple height-level routes (ground, fence-top, rooftop). High roads = safer but slower; ground level = faster but more human/traffic hazard.

---

## 2. ENVIRONMENTAL DESIGN SYSTEMS

### 2.1 Time-of-Day Cycle (24-hour in 20 minutes real-time)

**Scale:** 1 real second = 72 game seconds (20 min = 24 hours)

| Time | Sun Position | Ambient Light | Dir Light | Fog Density | NPCs | Atmosphere |
|------|--------------|---------------|-----------|-------------|------|-----------|
| **04:00** | Below horizon | 0.1 (deep blue) | -0.3 (below) | 0.8 | Sleeping | Night, stars, Moon 100% |
| **06:00** | 10° horizon | 0.25 (blue-purple) | 0.0 | 0.5 | Waking | Dawn, birds start, mist |
| **08:00** | 30° | 0.6 (pale) | 0.4 | 0.2 | Active | Morning, breakfast shops open |
| **10:00** | 45° | 0.85 (bright) | 0.7 | 0.05 | Peak | Mid-morning, shopping begins |
| **12:00** | 70° zenith | 1.0 (warm white) | 1.0 | 0.02 | Peak | High noon, harsh shadows |
| **14:00** | 65° (west) | 0.95 | 0.95 | 0.02 | High | Afternoon, leisure time |
| **16:00** | 45° (west) | 0.9 (golden) | 0.85 | 0.05 | High | Golden hour, warm tones, shoppers |
| **18:00** | 20° (horizon) | 0.5 (orange) | 0.3 | 0.2 | Decrease | Sunset, street lights flicker on |
| **20:00** | Below horizon | 0.15 (dark blue) | 0.0 | 0.6 | Low | Night, street lights 100%, neon |
| **22:00** | Deep night | 0.05 | -0.5 | 0.85 | Minimal | Late night, city sleeps, cat activity |
| **00:00** | Deep night | 0.02 | -0.5 | 0.9 | Minimal | Midnight, eerie, cat culture |
| **02:00** | Deep night | 0.05 | -0.5 | 0.85 | Sleeping | Deep night, rats emerge, quiet |

**Mechanics:**
- Street lights gradually brighten from 18:00-20:00 (light level fixed once on)
- Shadow direction rotates throughout day
- Fog density affects draw distance (performance optimization)
- NPC activity patterns shift (delivery trucks morning, shoppers afternoon, clubs night)
- Bird audio at dawn/dusk; city ambience morning/afternoon; night sounds evening

### 2.2 Weather System

**Weather Types:** (Probability weights vary by season)

#### **CLEAR**
- No particles, max visibility, bright
- Ambient: Day colors saturated, night stars visible
- Sound: Birds, traffic, ambient city
- Duration: 40-120 minutes
- Frequency: 60% (baseline)

#### **OVERCAST**
- Soft diffuse light, slight desaturation
- Fog increases 20%, sun disc hidden
- Ambient: Muted tones, soft shadows
- Sound: Wind whistle, fewer birds
- Duration: 30-90 minutes
- Frequency: 30%

#### **RAIN**
- Rain particle system (2000+ particles)
- Visibility reduced 30%, reflective surfaces wet
- Lighting: Contrast reduced, more ambient light
- Sound: Rain pattering, muted traffic, occasional thunder
- Duration: 20-60 minutes
- Frequency: 20%
- **Physics:** Surface slipperiness (jump height -10%), water accumulation in streets

#### **HEAVY RAIN/STORM**
- Dense particle system, visibility reduced 50%
- Thunder flashes (sudden light pulses)
- Wind noise loud
- NPC behavior: Shelter-seeking
- Duration: 10-30 minutes
- Frequency: 10%
- **Hazard:** Puddles become impassable, roof traversal dangerous

#### **SNOW** (Winter seasonal)
- White particle system (fluffy, slower fall)
- Ground white texture (seasonal override)
- Visibility reduced 20%, ethereal mood
- Sound: Muffled, snow crunch under paws
- Duration: 30-120 minutes
- Frequency: 40% (winter only)
- **Physics:** Slippery surfaces, paw prints trail visible

**Weather Transition Logic:**
```
if (random < clearProbability) { nextWeather = CLEAR }
else if (random < clearProbability + overcastProbability) { nextWeather = OVERCAST }
...transition smoothly over 30 seconds...
```

### 2.3 Seasonal Variations

| Season | Months (Game) | Lighting Shift | Flora | Weather | NPC Behavior |
|--------|---------------|----------------|-------|---------|--------------|
| **Spring** | Mar-May | Sun higher, warmer, longer days | Flowers bloom (pink/yellow), leaves return | Rain 30%, clear 50% | Outdoor activities, parks packed |
| **Summer** | Jun-Aug | Sun highest, golden hour longer, intense | All trees full green, flowers peak | Clear 70%, overcast 20% | Beach outings, outdoor markets |
| **Autumn** | Sep-Nov | Sun lower, golden glow, shorter days | Leaves golden/orange/red, falling | Overcast 40%, rain 25% | Harvest festivals, prep for winter |
| **Winter** | Dec-Feb | Sun lowest, pale blue light, harsh | Trees bare, snow possible, minimalist | Snow 40%, rain 20%, clear 30% | Indoor activities, holiday decorations |

**Asset Variations:**
- Tree meshes swap (full green → autumn colors → bare → snow-dusted)
- Flower boxes change content
- Building decorations (holiday lights in winter, banners in summer)
- NPC clothing colors shift (heavier in winter, lighter in summer)

---

## 3. LIGHTING DESIGN & ATMOSPHERE

### 3.1 Light Hierarchy

**Directional Light (Sun):**
- Primary: Time-of-day sun direction (calculated per frame)
- Intensity: Varies 0.3-1.0 with time
- Color: Shifts blue→white→orange→blue-dark through day
- Shadow casting: Enabled, dynamic resolution based on LOD
- Shadow softness: 1024-2048 map (performance-locked)

**Ambient Light:**
- Base hemisphere light (sky-ground gradient)
- Sky color: Day (pale blue) → Sunset (orange) → Night (dark blue-black)
- Ground color: Tan/green → warm → dark blue
- Intensity: Varies with sun intensity for balanced exposure

**Streetlight Instances:**
- Point lights: 80-120 per chunk (LOD managed)
- Warm 2700K color
- Range: 15-20m radius
- Intensity: Fixed once on at 18:00 (no flicker, stable perf)
- Shadow: Disabled (too expensive, baked shadow maps instead)

**Neon/Shop Signs:**
- Emissive textures on buildings (never actual lights)
- Visible only 18:00-06:00
- Colors: Pink, blue, green (cyberpunk-lite aesthetic)

**Flashlight (Optional):**
- Player equippable at night
- Cone light, 30m range
- Practical in dark underground areas

### 3.2 Atmosphere & Mood

**Golden Hour (16:00-18:00):**
- Sun at 20-45° angle, orange color
- Warm diffuse light, long shadows
- Saturation: +20%
- Purpose: Beautiful traversal, photo moments
- NPC: Outdoor gathering, shopping peak

**Night (20:00-06:00):**
- Artificial lights dominate
- Neon signs active, cool blue ambient
- Saturation: -10% (desaturated, eerie)
- Purpose: Stealth, exploration, danger
- NPC: Reduced activity, nocturnal creatures (rats)

**Sunrise (06:00-08:00):**
- Quick color transition blue→orange→white
- Low sun, soft shadows
- Saturation: Neutral
- Purpose: Peaceful, calm, birds singing
- NPC: Delivery trucks, shop opening

---

## 4. AUDIO LANDSCAPE

### 4.1 Ambient Soundscapes

**Time-Based Audio Layers:**

| Time | Layer 1 (Ambient) | Layer 2 (Traffic) | Layer 3 (Special) |
|------|-------------------|-------------------|-------------------|
| 04:00-06:00 | Forest hum, crickets | Silence | Birds starting |
| 06:00-08:00 | Birds, wind | Light traffic, horns | Delivery trucks, shop shutters |
| 08:00-12:00 | City buzz, distant sirens | Heavy traffic | Park sounds (children), music shops |
| 12:00-14:00 | Lunch crowds, chatter | Heavy traffic | Market sounds, street performers |
| 14:00-18:00 | Bustle, energy | Medium traffic | Parks (kids), markets |
| 18:00-20:00 | Transition (sirens fade) | Medium traffic | Evening shops, restaurants |
| 20:00-22:00 | Night ambience, distant music | Light traffic | Restaurant/bar chatter |
| 22:00-04:00 | Crickets, wind, rats | Minimal | Occasional car, urban quiet |

**Localized Audio Triggers:**
- **Shop proximity (5m):** Store-specific music (cafe hum, market chatter)
- **Park proximity:** Children playing, splashing water
- **Street crossing:** Traffic sounds intensify as car approaches
- **Rooftop:** Wind noise, ventilation, distant sirens

### 4.2 Dynamic Audio Cues

**Weather Audio:**
- Rain: Layered pattering sound, intensity with weather severity
- Wind: Low frequency whoosh, impacts object collision
- Thunder: Sharp crack with 2-3s visual flash delay
- Snow: Muffled world, crunching under paws

**NPC Audio:**
- Meowing: Varies by cat personality (9-12 meow types recorded)
- Human voices: Muffled background chatter, laughter, conversation snippets
- Vehicles: Engine sounds, honks (dangerous warning), tire squeal

**Player Audio (Feedback):**
- Footsteps: Stone, grass, metal, wood (surface-dependent)
- Jump/landing: Soft pads, impact thud
- Meow commands: Player voice control (optional)

---

## 5. PROCEDURAL GENERATION SYSTEMS

*See PROCEDURAL_SPEC.md for detailed algorithms.*

### 5.1 Streaming Architecture

**Chunk System (512m × 512m chunks):**
- Currently loaded: 3×3 grid centered on player (9 chunks)
- Streaming distance: 1 chunk in all directions
- Load time: <500ms per chunk (async)
- Unload: Chunks >1 distance automatically disposed

**LOD Levels:**
- **LOD0** (closest): Full detail, shadows enabled, 500m draw distance
- **LOD1** (mid): Reduced geometry, simple shadow maps, 1000m draw distance
- **LOD2** (far):** Billboards, no shadows, 1500m draw distance
- **LOD3** (skybox): Silhouettes only, baked into far-plane skybox

**Memory Management:**
- Texture streaming: Mip-maps for LOD, low-res far textures
- Mesh culling: Frustum + occlusion culling
- Target: <500MB peak (RPi 5 optimization)

### 5.2 Procedural Generation Domains

1. **Street Grid Generation:** Organic + grid hybrid, rule-based intersection placement
2. **Building Generation:** Modular facades, roof variation, window patterns
3. **NPC Spawning:** Pathfinding AI, district-based distribution
4. **Deco/Props:** Street signs, benches, planters, parked cars (instanced)
5. **Lighting:** Streetlight placement on roads, neon sign placement

See PROCEDURAL_SPEC.md for full algorithmic specifications.

---

## 6. OPTIMIZATION STRATEGIES

### 6.1 Performance Targets

| Metric | Target | Method |
|--------|--------|--------|
| **FPS** | 60 stable | LOD system, frustum culling |
| **Memory** | <500MB peak | Streaming, asset pooling |
| **Draw calls** | <2000 per frame | Instancing, mesh batching |
| **Texture memory** | <256MB | Mip-mapping, atlasing |
| **Audio streams** | <8 concurrent | Mixing, priority queue |

### 6.2 LOD & Culling

**Frustum Culling:**
- Reject chunks outside camera view frustum
- Tested each frame, early exit for off-screen meshes
- Performance: ~20% draw call reduction

**Occlusion Culling:**
- Buildings block distant buildings
- Use pre-baked occlusion meshes (simple shapes)
- Enables deeper fog fade for distant geometry

**Instancing:**
- Repeated objects (streetlights, benches, signs): GPU-instanced
- Single drawcall per object type (16 draw calls for all deco)
- Saves ~30% draw calls

**Texture Atlasing:**
- Road textures: 4×4 atlas (road, sidewalk, parking, etc.)
- Building base materials: Shared atlases per type
- Reduces texture binds from 400+ to 50+

### 6.3 Dynamic Texture Resolution

- **Close objects:** Full 2K textures
- **Mid distance:** 1K textures
- **Far distance:** 512px textures
- **Skybox/far plane:** Pre-rendered 4K but displayed at 1024px

### 6.4 Asset Pooling

- Benches, trash cans, hydrants: Single mesh, reused 200+ times
- Particle pools: Weather effects use pre-allocated particle buffers
- Audio: Mix down to 8 active channels (priority: music > NPCs > effects)

---

## 7. AESTHETIC DIRECTION

### 7.1 Art Style

**Classification:** Stylized Semi-Realism (Ghibli-influenced with modern polish)

**Characteristics:**
- Not fully realistic (no photogrammetry)
- Not cartoon-flat (actual 3D form, subtle shading)
- Painterly quality in diffuse colors
- Expressive proportions (cat eyes oversized, proportions exaggerated)
- Hand-crafted feel (not procedural-default barren)

**Inspirations:**
- Studio Ghibli (Spirited Away backgrounds, organic architecture)
- Persona 5 (stylized UI, thick outlines on characters only)
- Grounded open-world games (RDR2 environmental detail, Stardew Val charm)

### 7.2 Color Palette

**Primary Palette (Sunny Daytime):**
```
Sky Blue:         #87CEEB (pale, soft)
Grass Green:      #7CB342 (saturated, natural)
Wood Brown:       #8B4513 (warm, aged)
Brick Red:        #C9302C (vibrant but not neon)
Street Gray:      #A9A9A9 (neutral, not pure black)
Accent Colors:    Pink #FF69B4, Cyan #00CED1 (neon signs only)
```

**Golden Hour Palette (16:00-18:00):**
```
Sky:              #FFB86D (warm orange)
Sunlit surfaces:  +30% desaturated
Shadows:          +40% orange tint
```

**Night Palette (20:00-06:00):**
```
Sky:              #0a0e27 (deep navy)
Ambient:          +20% blue tint
Neon signs:       Pure pink/cyan (255 saturation)
Streetlights:     #FFD700 (warm yellow)
```

### 7.3 Architecture Style

**Residential (Whisker Park):**
- Victorian brownstones (pitched roofs, bay windows)
- Modern townhouses (flat roofs, large windows)
- Mix ratio: 60% historic, 40% modern (gentrified neighborhood feel)

**Industrial (Yarn Mill):**
- Raw brick warehouses (minimal facade work)
- Converted lofts (glass + steel frames)
- Street art on walls (murals, graffiti, dynamic)

**Commercial (Downtown):**
- Glass-steel towers (modern minimalist)
- Art deco skyscraper (vintage luxury, one iconic building)
- Underground mall (brutalist concrete, clean lines)

**Natural (Moon Garden):**
- Pavilions (Japanese-influenced, wood + stone)
- Conservatory (glass architecture, airy)
- Stone pathways (natural placement)

### 7.4 Lighting Mood Themes

| Mood | Time | Light Angle | Color | Shadow | Purpose |
|------|------|-------------|-------|--------|---------|
| **Serene** | 06:00-08:00 | Low, east | Pale orange-white | Soft, long | Meditation areas, safe zones |
| **Energetic** | 10:00-14:00 | High, neutral | Bright white | Sharp, short | Market areas, playgrounds |
| **Romantic** | 16:00-18:00 | Low, west | Golden orange | Warm, long | Parks, scenic viewpoints |
| **Mysterious** | 20:00-22:00 | None (artificial) | Cold blue | High contrast | Alleys, rooftops, exploration |
| **Eerie** | 22:00-04:00 | None | Deep blue | Minimal | Underground areas, danger zones |

---

## 8. INTEGRATION WITH GAME SYSTEMS

### 8.1 Environmental Hazards

**Weather Hazards:**
- Heavy rain: Movement slow (-20% speed), jump height reduced (-10%)
- Storm: Visibility halved, disorienting wind effect
- Snow: Slippery surfaces, movement unpredictable

**Time-of-Day Hazards:**
- Night: Reduced visibility (use LOD2 from distance)
- High traffic times (12:00-14:00, 18:00): Dangerous street crossing
- Low light times (22:00-06:00): Cats emerge, player vulnerability

### 8.2 NPC Interaction Points

**Time-Responsive Locations:**
- Cafe: Open 07:00-21:00, peak 08:00-09:00 & 14:00-16:00
- Park: Full activity 10:00-17:00, quiet at night
- Market: Open 09:00-19:00, peak 10:00-12:00
- Underground: Always accessible, refuge from weather

**Environmental Storytelling:**
- Decorations change (holiday themes in winter)
- Building damage/repair (seasonal progression)
- NPC appearance shifts (coats in winter, sunglasses in summer)

### 8.3 Environmental Progression

**Unlockable Areas:**
- Downtown tower: Requires rooftop parkour skills
- Underground mall: Discovered via storm event
- Sacred grove: Hidden in Moon Garden, requires specific time visit
- Subway station: Atmospheric area, no functional trains

---

## 9. PERFORMANCE BUDGET BREAKDOWN

| System | Target | Current Est. |
|--------|--------|--------------|
| **Rendering** | 40ms (60 FPS) | 35ms |
| **Physics** | 5ms | 4ms |
| **AI/NPC** | 3ms | 2ms |
| **Audio** | 2ms | 1.5ms |
| **Streaming** | <1ms (async) | <0.5ms |
| **Total** | 51ms | 43.5ms |
| **Headroom** | 9ms (17%) | 16.5ms (33%) |

**Memory Budget:**
```
Textures:        256 MB
Meshes:          128 MB
Audio:            32 MB
Particles:        24 MB
Scripts/Cache:    60 MB
Available:        500 MB (peak)
```

---

## 10. DELIVERABLES CHECKLIST

- [x] City layout (4 neighborhoods, scale metrics)
- [x] Vertical design (ground, climbing, rooftop, underground zones)
- [x] Time-of-day system (24-hour cycle, NPC schedules)
- [x] Weather system (5 types, physics impact, audio)
- [x] Seasonal variations (asset swaps, NPC behavior)
- [x] Lighting design (sun, ambient, streetlights, mood)
- [x] Audio landscape (ambient layers, location-based, dynamic)
- [x] Procedural generation overview (see PROCEDURAL_SPEC.md)
- [x] Optimization strategies (LOD, culling, instancing)
- [x] Performance budget (memory, frame time, draw calls)
- [x] Aesthetic direction (style, color palettes, architecture)
- [x] Environmental hazards & mechanics
- [x] NPC integration points
- [x] Streaming architecture

---

## 11. REFERENCE DOCUMENTS

- **NEIGHBORHOODS.md** — Detailed specs for each of 4 districts
- **PROCEDURAL_SPEC.md** — Algorithms for generation systems
- **PERFORMANCE.md** — Profiling, bottleneck analysis, optimization log
- **GAME_SPEC.md** (consolidated) — Full technical specification

---

**Status:** Ready for implementation  
**Next Phase:** Procedural generation implementation + neighborhood asset creation
