# Cat City FPS - Environment Design

## Executive Summary

Cat City is a stylized urban environment designed from a cat's perspective. The city is procedurally generated with hand-designed districts, each with unique aesthetic and functional characteristics. The environment supports exploration, climbing, parkour, and discovery while maintaining performance targets on edge hardware.

**Environmental Vision:**
- **Scale:** Mid-sized city (~5km x 5km explorable area)
- **Style:** Stylized realism (not photorealistic, but believable)
- **Perspective:** Eye-level at 0.2m height (cat eye height)
- **Dynamics:** Day/night cycle, weather system, NPC activity

---

## 1. City Layout & Districts

### 1.1 District Map

```
         ┌─────────────────────────────┐
         │      RESIDENTIAL NORTH      │
         │   (Houses, gardens, quiet)  │
         └─────────────────────────────┘
              │                  │
    ┌─────────┴──────────────────┴─────────┐
    │  INDUSTRIAL │  CENTRAL  │  PARK      │
    │   (Alleys)  │  PLAZA    │ (Green)   │
    │             │           │           │
    └─────────────┴───────────┴───────────┘
              │                  │
         ┌─────────────────────────────┐
         │    COMMERCIAL SOUTH         │
         │   (Shops, cafes, streets)   │
         └─────────────────────────────┘
         
   Scale: Each district 1km x 1km (total 5km x 5km)
```

### 1.2 District Characteristics

| District | Theme | Key Buildings | NPCs | Collectibles |
|----------|-------|---------------|------|--------------|
| **Residential N** | Suburban homes | Houses, gardens, garages | Pampered house cats, elderly humans | Yarn balls, fish treats |
| **Industrial W** | Alleys, warehouses | Factories, storage, dumpsters | Street cats, rats, trash pandas | Hidden items, gear |
| **Central Plaza** | Commerce & gathering | Cat cafe, market, fountains | Diverse cats, visiting tourists | Rare collectibles, coins |
| **Park** | Nature & relaxation | Trees, water fountain, benches | Squirrels, birds, athletic cats | Berries, natural items |
| **Commercial S** | Shopping & dining | Shops, restaurants, hotels | Worker cats, shopkeepers, delivery cats | Food items, retail goods |

### 1.3 Points of Interest (POI)

**Tier 1: Major Hub (5 total)**
1. **The Whisker Cafe** - NPC gathering hub, serves food
2. **Central Fountain** - Meeting point, story sequences
3. **Library** - Quiet zone, lore items, shy NPCs
4. **Rooftop Village** - Hidden NPC settlement, late-game area
5. **Home Sweet Home** - Player's starting/ending location

**Tier 2: Important Locations (15 total)**
- Pet shops (equipment unlocks)
- Parks (parkour areas, collectibles)
- Alleyways (hidden passages, treasures)
- Rooftops (vantage points, secret meetings)

**Tier 3: Ambient Locations (50+)**
- Individual homes, storefronts, parking areas
- Generic streets, sidewalks, vegetation

---

## 2. Environmental Design Elements

### 2.1 Vertical Design

**Height Variation (Supports Parkour):**

| Height | Purpose | Example |
|--------|---------|---------|
| 0m | Ground level | Streets, parks, ground floors |
| 1-3m | First floor | Window level, climbing challenge |
| 5-10m | Rooftops | Parkour routes, vantage points |
| 10-15m | Building tops | Secret areas, shortcuts |
| 15m+ | Tall buildings | Visual landmarks, unreachable areas |

**Climbing Opportunities:**
- Decorative trellises on buildings
- Fire escapes and exterior stairs
- Trees (branches at various heights)
- Ledges and awnings
- Drainpipes and decorative elements

### 2.2 Visual Aesthetics

**Stylization (not photorealistic):**
- Cartoon-like proportions (buildings wider/shorter than real)
- Vibrant color palette (blues, greens, warm browns)
- Exaggerated shadows for clarity
- Cel-shading aesthetic (optional future enhancement)

**Color Palette by District:**
- **Residential:** Warm earth tones, soft greens
- **Industrial:** Steel grays, rust oranges, weathered textures
- **Central:** Bright whites, primary colors, polished
- **Park:** Forest greens, sky blues, natural browns
- **Commercial:** Neon signs, shop colors, varied aesthetic

**Lighting Approach:**
- Pre-baked lighting for static geometry (buildings)
- Dynamic lighting for: sun (time of day), street lamps, shop windows
- Shadows cast by buildings and trees
- Atmospheric haze at fog distance

### 2.3 Audio Landscape

**Ambient Sound Layers:**
1. **Environmental:** Traffic, wind, city hum
2. **Natural:** Birds, insects, water
3. **Active:** Human voices, machinery, construction
4. **Weather:** Rain, thunder, wind intensity
5. **Time-dependent:** Morning birds (6 AM), evening traffic (5 PM), night quiet

**Audio Design by District:**
- **Residential:** Peaceful, occasional dog barks, lawnmowers
- **Industrial:** Machinery, metal clanging, heavy trucks
- **Central Plaza:** Busy, conversations, fountains
- **Park:** Natural sounds, birds, water
- **Commercial:** Shouting vendors, doors, beeping

---

## 3. Procedural Generation System

### 3.1 Generation Philosophy

**Procedural + Curated Hybrid:**
- Core districts hand-designed (layout, major POIs)
- Building details procedurally varied
- Object placement algorithmically distributed
- NPCs procedurally routed through city

**Advantages:**
- Consistent gameplay experience (designed progression)
- Visual variety (no two buildings identical)
- Replayability (different objects on replay)
- Memory efficiency (generate on-demand, not store all)

### 3.2 Chunk-Based System

**Chunk Definition:**
- Size: 100m x 100m (10,000 sq meters)
- Seed-based: Same seed = same chunk always
- Hierarchical: City seed determines district, district seed determines chunks

```
City Seed: 42
├─ Residential N Seed: 42 + offset_north
│  ├─ Chunk (0,0) Seed: north_seed + 0
│  ├─ Chunk (0,1) Seed: north_seed + 1
│  └─ Chunk (1,0) Seed: north_seed + grid_offset
└─ Industrial W Seed: 42 + offset_west
   └─ ...
```

### 3.3 Building Generation Algorithm

**Pseudo-code:**

```python
def generate_chunk(chunk_x, chunk_y, seed):
    noise = PerlinNoise(seed)
    buildings = []
    
    for grid_cell in 4x4_grid(chunk):
        # Decide if building exists
        if noise(cell_x, cell_y) > 0.3:
            # Generate building properties
            building = {
                x: cell_x * 25,
                y: cell_y * 25,
                width: noise(x, y+1) * 15 + 10,     # 10-25m
                height: noise(x, y+2) * 40 + 20,    # 20-60m
                style: ["modern", "vintage", "industrial"][noise(x,y) % 3],
                color: [available_colors][noise(x*7, y*7) % len(colors)]
            }
            buildings.append(building)
    
    # Generate street objects
    for i in range(int(noise(chunk_x, chunk_y) * 10)):
        objects.append({
            type: ["car", "sign", "plant"][noise(...) % 3],
            position: random_in_chunk(),
            rotation: noise(...) * 360
        })
    
    return {buildings, objects, streets}
```

### 3.4 Object Placement

**Categories & Distribution:**

| Category | Count/Chunk | Spawn Rule |
|----------|------------|-----------|
| Parked cars | 2-4 | Streets, parking areas |
| Street signs | 5-8 | Intersections, corners |
| Plants/trees | 10-20 | Parks, residential |
| Knockovers | 20-50 | Alleyways, streets |
| Collectibles | 5-10 | Hidden spots, elevated |
| NPCs | 3-5 | Spawn points, routes |

**Knockover Object Types:**
- Glass bottles (0.5kg, fragile, satisfying)
- Ceramic vases (1kg, heavy, visual impact)
- Papers/cardboard (0.1kg, light, flutters)
- Metal cans (0.3kg, bouncy, loud)
- Wooden boxes (2kg, solid, thuds)

### 3.5 NPC Spawning & Routing

**Waypoint-Based Pathing:**
1. Generate waypoints on streets
2. Create path graph connecting waypoints
3. Assign NPCs starting positions
4. Define daily routes (waypoint sequences)
5. NPCs follow routes, avoid obstacles

**Dynamic Adjustment:**
- If player blocks waypoint, NPC finds alternate route
- Collision avoidance with other NPCs
- Weather affects route (rain → seek shelter)

---

## 4. Dynamic Systems

### 4.1 Time of Day System

**24-Hour Cycle (Compressed)**
- Real time scale: 1 game minute = 1 real second
- Full day cycle: 24 game minutes = 24 real seconds (for testing)
- Production scale: Adjust multiplier (1 game minute = 4 real seconds typical)

**Lighting Changes:**

| Hour | Sun Position | Intensity | Fog Far | Mood |
|------|-------------|-----------|---------|------|
| 6 AM | Rising | 0.2 | 500m | Dawn glow |
| 9 AM | 45° up | 0.8 | 2000m | Clear morning |
| 12 PM | Zenith | 1.5 | 2000m | Bright day |
| 3 PM | 45° down | 1.0 | 2000m | Afternoon |
| 6 PM | Horizon | 0.5 | 1000m | Golden hour |
| 9 PM | Below | 0.1 | 500m | Night (moon) |
| 12 AM | Below | 0.05 | 300m | Deep night |

**Behavior Changes:**
- **Day (6 AM - 6 PM):** Active NPCs, busy city
- **Dusk (6 PM - 9 PM):** Transition, some NPCs leave
- **Night (9 PM - 6 AM):** Quiet, few NPCs, nocturnal animals emerge

### 4.2 Weather System

**Weather Types:**

| Weather | Probability | Visual | Audio | Impact |
|---------|------------|--------|-------|--------|
| Clear | 60% | Bright, shadows | Wind | No impact |
| Cloudy | 25% | Reduced contrast | Quiet | Slight FPS gain |
| Rainy | 12% | Wet textures, puddles | Rain sounds | NPCs seek shelter |
| Stormy | 3% | Dark, wind, rain | Thunder | Flash lighting |

**Generation:**
- Seed-based: Same day always has same weather
- Transitions: Gradual (15-minute fade)
- Duration: 1-3 hours typical

### 4.3 Seasonal Variation (Future)

**Planned (Post-Launch):**
- Spring: Blooming flowers, mud, fresh green
- Summer: Long days, bright sun, dry conditions
- Fall: Leaves changing color, harvest decoration
- Winter: Snow coverage (procedural), shorter days, ice

**Implementation:** Modify procedural generation seed by season

---

## 5. Performance Optimization

### 5.1 LOD (Level of Detail) Strategy

**Three Tiers by Distance:**

| Distance | Detail Level | Draw Calls | Triangles |
|----------|-------------|-----------|-----------|
| 0-200m | High | Full models, shadows, details | Full geometry |
| 200-1000m | Medium | Simplified models, no shadows | 50% geometry |
| 1000m+ | Low | Billboard/sprite, colors only | <1% geometry |

**Implementation:**
- Precompile 3 LOD models for each building type
- Automatic switching at distance thresholds
- Smooth transitions (morph blend over 50m)

### 5.2 Culling Strategies

**Frustum Culling:**
- Don't render objects outside camera view
- Automatic in Three.js
- Saves ~40-60% draw calls

**Occlusion Culling (Future):**
- Don't render buildings hidden behind other buildings
- Spatial partitioning grid (500m x 500m cells)
- Raycasts from camera to determine visibility

### 5.3 Instancing

**Repeated Objects:**
- Use geometry instancing for identical objects (trees, lamp posts)
- Reduces draw calls from N to 1 for identical meshes
- Target: 80% of street objects use instancing

### 5.4 Streaming Limits

**Active Memory Budget:**
- Current chunk: Fully loaded
- Adjacent chunks (8): Full detail loading
- Visible chunks (16-32): LOD models
- Far chunks: Sprites only
- Total memory: <200MB active chunk data

---

## 6. Design Principles

### 6.1 Cat-Centric Perspective

**Design Rules:**
1. Scale everything relative to cat body length (~20cm)
   - 1m high wall = 5 body heights → climable
   - 0.5m gap = difficult parkour challenge
2. Optimize for ground-level exploration
   - Hidden areas at cat eye height
   - Dangers from above (crows, hawks)
   - Treasures under bushes
3. Vertical design opportunities
   - Every building has climbable elements
   - Rooftops = safe, exploration zones
   - Alleys = risky but rewarding

### 6.2 Discovery & Exploration

**Design Patterns:**
- **Progression gate:** "To reach the rooftop, you must find the trellis"
- **Hidden rewards:** Secret yarn balls tucked in hard-to-reach spots
- **Environmental storytelling:** Knocked-over items tell story of previous chaos
- **Ambient clues:** NPC conversations hint at secret locations

### 6.3 Performance Awareness

**Design for Hardware:**
- Avoid dense geometry in active play areas
- Use texture detail instead of geometry detail
- Minimize overlapping transparent objects (particles, UI)
- Pre-bake lighting for static geometry

---

## 7. Accessibility in Environment

### 7.1 Readability

**Visual Clarity:**
- High contrast between walkable and obstacles
- Clear color coding: Climbable = bright, dangerous = red tint
- UI markers: Can highlight interactable objects (optional toggle)

**Navigation Aid (Optional):**
- Minimap showing chunks, POIs, current position
- Path suggestion system (shows recommended routes)
- Breadcrumb trails for completed quests

### 7.2 Reachability

**Design Assurance:**
- All major POIs reachable via multiple routes
- Climbing challenges have tutorials before hard puzzles
- Optional: Waypoint-based fast travel (future)

---

## 8. Environment Validation Checklist

- [x] City layout (5 districts, clear themes) defined
- [x] Points of interest (major, important, ambient) documented
- [x] Vertical design supports parkour and exploration
- [x] Aesthetics and color palette consistent
- [x] Audio landscape layered and atmospheric
- [x] Procedural generation algorithm feasible (Perlin noise based)
- [x] Chunk system supports dynamic loading
- [x] Building generation produces variety
- [x] Object placement realistic and performant
- [x] Time of day system affects gameplay and mood
- [x] Weather system impacts environment and NPCs
- [x] Performance targets realistic (LOD, culling, instancing)
- [x] Cat-centric design principles applied
- [x] Discovery and exploration encouraged
- [x] Accessibility features identified

---

## Next Phase: Implementation

**Week 1:** District layout implementation (mesh placement)
**Week 2:** Procedural building generation (geometry creation)
**Week 3:** Object placement and distribution (cars, signs, plants)
**Week 4:** Time of day lighting system
**Week 5:** Weather system implementation
**Week 6:** NPC waypoint generation and pathing
**Week 7:** Audio landscape implementation
**Week 8:** Performance optimization and LOD tuning

