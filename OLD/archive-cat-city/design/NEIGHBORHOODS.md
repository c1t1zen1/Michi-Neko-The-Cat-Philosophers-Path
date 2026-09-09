# Cat City Neighborhoods - Detailed Specifications

**Version:** 1.0  
**Date:** 2026-07-10  
**Related:** ENVIRONMENT.md (citywide spec), PROCEDURAL_SPEC.md (generation)

---

## DISTRICT 1: WHISKER PARK (NW Residential)

### 1.1 Geographic Boundaries & Layout

**Boundaries:** NW quadrant, 0.9 km² (0-512m x 512-1024m in world coords)

**Grid Structure:**
```
Whisker Park Street Layout (simplified):
├── North Edge: Highland Drive (main north-south arterial)
├── East Edge: Park Lane (feeds to downtown)
├── South Edge: Ivy Street (residential)
├── West Edge: Overlook Road (scenic, lower traffic)
├── Center: Park Square (0.7km² central park)
└── Internal: Residential grid (40m × 50m blocks)
```

**Procedural Generation Rules:**
- Base grid: 40-48m block size, slight 5-10° rotation variations
- Street type distribution: 
  - 60% residential (quiet, trees, parking)
  - 25% park-adjacent (wider sidewalks)
  - 15% main arterials (wider lanes, no parking)
- Building density: 70% (low-mid rise only)
- Green coverage: 45% (trees, parks, gardens)

### 1.2 Park Area Details (Central Focus)

**Whisker Park Plaza (200m × 150m):**

**Features:**
- Central fountain (15m diameter, cat-safe water depth 30cm)
- Gazebo (8m × 8m octagon, shelter point)
- Playground equipment (human-scaled: slides 2m high, swings, monkey bars)
- Open lawn area (100m × 80m, soft grass asset)
- Tree-lined pathways (pedestrian routes with shade)
- Benches (24 scattered, NPC gathering points)
- Sidewalk cafe area (8 tables, weathered umbrellas)
- Dog park (fenced, separate from main plaza, avoided by cats)

**Botanical Garden Section (adjacent):**
- Flower beds (seasonal color swaps: spring pink/yellow, summer multi, autumn red/gold, winter bare)
- Herb garden (aromatic plants, player can identify by name)
- Vegetable garden (rows of produce, accessible via broken fence)
- Path network (connecting all sections, PCG-guided wandering)
- Water feature (small pond 8m × 6m, jumping puzzle)

**Tree Inventory:**
- Oak trees (15 large, 25m crown spread) - weight-bearing, canopy pathways
- Birch trees (30 medium) - slender, visual breaks
- Willow trees (3 near water) - drooping branches, atmospheric
- Ornamental cherry (5, seasonal pink) - visual landmark
- Mix ensures canopy coverage 40% year-round

### 1.3 Residential Architecture Pattern

**House Types (Procedurally Varied):**

**Type A: Victorian Brownstone (30% of houses)**
- 4-story (16m height)
- Facade: Red-brown brick with cream trim
- Windows: Large bay windows (upper floors), ground floor shop windows
- Roof: Pitched, dark slate, dormer windows
- Stoop: 4-5 steps up to main door (parkour obstacle)
- Alley access: Side alley for delivery/cat movement

**Type B: Modern Townhouse (25% of houses)**
- 3-story (12m height)
- Facade: Smooth stucco (light gray, cream, or warm tan)
- Windows: Large modern frames, full-width second floor
- Roof: Flat with planted rooftop garden (accessible)
- Ground floor: Open garage or retail space
- Clean lines, minimalist aesthetic

**Type C: Mixed-Use Walk-Up (20% of houses)**
- 4-story (16m height)
- Ground floor: Retail/cafe, steps up to entry
- Upper floors: Residential (3 units per floor)
- Facade: Varied materials per floor (brick + stucco)
- Windows: Older style double-hung (Victorian renovation aesthetic)

**Type D: Single Family Home (25% of houses)**
- 2-story (8m height, shortest)
- Facade: Varied (painted brick, clapboard, modern siding)
- Windows: Varied, often asymmetrical
- Roof: Pitched, residential shingles
- Private front yard (small fence, flowers)
- Garage: Attached or detached

**Procedural Variation Formula:**
```python
building_type = select_random([A: 0.3, B: 0.25, C: 0.2, D: 0.25])
facade_color = random_select(type_palette[building_type])
window_count = calculate_windows(building_height, facade_width)
roof_style = select_from(residential_roofs)
roof_color = varies_within_palette(facade_color)
details = {
  fire_escape: random < 0.3,
  planter_boxes: random < 0.6,
  air_conditioner: random < 0.4,
  TV_antenna: random < 0.2,
  chimney: random < 0.8
}
```

### 1.4 Street-Level Details

**Streetscape Elements (Instanced):**
- Streetlights: Victorian-style lamp posts (4m height, warm 2700K)
- Distribution: One per 25m of street (8-12 per block)
- Benches: Wooden slats, weathered appearance (24 throughout district)
- Trash cans: Cylindrical public bins (cat-accessible rim level)
- Fire hydrants: Yellow paint (navigation hazards)
- Street signs: Typical US street signs (Stop, Speed Limit 25 mph, etc.)
- Parking meters: Cluster near shops (10 per commercial area)
- Planters: Seasonal flowers, distributed along sidewalks
- Bike racks: Near shops, empty (not functional)

**Parked Cars:**
- On-street parking: 40-50 vehicles throughout
- Types: Mix of sedan/SUV/hatchback models (simplified geometry)
- Placement: PCG-determined along streets, never blocking intersections
- Asset reuse: 12 distinct models, instanced 4-5x each
- Colors: Realistic palette (white, black, silver, red, blue)

**Trees & Vegetation:**
- Street trees: One per 15-20m of residential streets
- Overhanging branches: Create natural canopy pathways for cats
- Base coverage: Flowers/ivy at street level (collision-free)
- Seasonal swap: Bare tree models in winter, full canopy other seasons

### 1.5 Points of Interest (Detailed)

**Whisker Park Sanctuary (NPC Hub):**
- Type: Cat shelter/adoption center
- Location: SE corner of park (accessible from multiple paths)
- Architecture: Modern building (Type B townhouse style)
- Size: 20m × 15m
- Features:
  - Large windows (viewing area)
  - Cat rooftop garden (safe, fenced)
  - Outdoor play area (climbing structures, toys)
  - Human staff visible inside
  - Adoption event signage (dynamic, changes weekly)
- NPC Population: 10-15 cats (lounging, playing, socializing)
- Gameplay: Main social hub, cat quest origin point
- Audio: Meowing variety, ambient purring, human care sounds

**Cozy Bookstore:**
- Type: Quiet bookstore with cafe
- Location: N edge of park (Type A brownstone)
- Architecture: Historic Victorian facade, modern interior (large windows visible)
- Features:
  - Outdoor seating area (3-4 cafe tables)
  - Sunlit reading space (visible through windows)
  - Window displays (dynamic, seasonal books)
  - Cat-friendly policy (visible cat statues, cat bookmarks)
- NPC Population: 4-6 humans, 2-3 cats
- Gameplay: Respite from weather, dialogue/lore triggers
- Timing: Open 08:00-18:00 (closed evenings)
- Aesthetic: Warm wood interior, soft lighting (visible through windows)

**Community Garden:**
- Type: Shared gardening space
- Location: W edge of park
- Size: 80m × 60m
- Layout:
  - Raised planting beds (1m × 0.5m, arranged in grid)
  - Vegetable & herb sections (tomatoes, basil, mint, etc.)
  - Compost area (brown pile, accessible)
  - Tool shed (locked, can't enter but visible)
  - Gravel paths (connecting beds)
- Features:
  - Broken fence section (accessible to cats)
  - Herbs attract butterflies/insects (visual detail)
  - Rain barrels (water accumulation mechanic)
  - Seasonal active/dormant cycles
- Gameplay: Item pickup (catnip patches, insects), quiet area
- Audio: Rustling leaves, water, occasional gardener chatter

**Pet-Friendly Diner (The Pounce):**
- Type: Casual restaurant with outdoor seating
- Location: S edge of park (mixed-use building, Type C)
- Size: 30m × 20m (street frontage)
- Features:
  - Large patio (8 tables, umbrella shade)
  - Open kitchen (visible from street, aroma effects)
  - Cat-friendly signage visible
  - Trash cans overflow with food scraps (dumpster diving mechanic)
  - Large window (viewing into warm interior)
- NPC Population: 6-8 humans eating/working, 3-4 cats lingering (scraps)
- Gameplay: Food source, NPC conversation point, economic hub
- Timing: Open 07:00-21:00 (peak 12:00-14:00, 18:00-19:30)
- Aesthetic: Warm lighting, friendly, colorful (umbrellas, flowers)

**Scenic Overlook (West End):**
- Type: Viewpoint, minimal development
- Location: W edge, highest elevation point
- Features:
  - Stone railing/bench (vista point)
  - Panoramic city view (player can see downtown tower)
  - Tree-shaded area (cool, quiet)
  - Information plaque (atmospheric, tells neighborhood history)
- NPC Population: 1-2 humans on benches, 0-1 cats exploring
- Gameplay: Rest point, photography spot, lore location
- Aesthetic: Golden hour friendly, peaceful

### 1.6 NPC Distribution & Behavior

**NPC Population: 120-150 total (80-90 cats, 40-50 humans)**

**Daily Activity Schedule (Example - Cat NPC):**

```
TIME    LOCATION         ACTIVITY           NPC_COUNT
06:00   Homes/beds       Sleeping           120 cats (dark, peaceful)
07:00   Homes            Waking             90 cats
08:00   Streets/cafe     Breakfast hunting  60 cats at diner, 20 park
09:00   Shelters/park    Morning activities 40 shelter, 35 park wandering
10:00   Park/streets     Peak activity      50 park, 30 shelter, mixed
12:00   Diner/park       Lunch time         45 diner, 40 park
14:00   Trees/roofs      Napping (heat)     80 cats (distributed, sparse)
16:00   Park/diner       Golden hour social 55 park (photo moments), 25 diner
18:00   Shelters/homes   Dinner/settling    70 scattered
20:00   Shelters/homes   Sleeping           100 cats
22:00   Rooftops/alleys  Night activity     40 cats (nocturnal culture)
00:00   Everywhere quiet Sleep              110 cats (sparse roaming)
```

**NPC Cat Types (Procedural Selection):**
1. **Stray** (40% of cats): Nomadic, rooftop pathways, food-motivated
2. **Shelter Resident** (30%): Hub-based, predictable, quest-givers
3. **Domestic** (20%): Ground level, pet-friendly spots, friendly
4. **Feral** (10%): Dangerous, avoid humans, nocturnal, evasive

**NPC Human Types (Simplified AI):**
1. **Pedestrians** (60%): Walking, relaxing, time-dependent presence
2. **Shopkeepers** (20%): Static in shops, tending (morning/evening)
3. **Parents/Children** (20%): Playing in park (10:00-17:00 peak)

---

## DISTRICT 2: YARN MILL DISTRICT (SE Industrial/Mixed-Use)

### 2.1 Geographic Boundaries & Layout

**Boundaries:** SE quadrant, 1.1 km² (512-1024m x 0-512m)

**Key Feature:** Yarn Mill River (boundary between NW and SE halves)
- Width: 2-4m (jumpable for cat)
- Depth: 0.5-1.5m (wading possible)
- Current: Slow, navigable
- Crossings: 3 bridges (pedestrian), plus jumping paths

**Grid Structure:**
```
Yarn Mill District Layout:
├── North Zone: Warehouse row (1km long, massive structures)
├── Central Zone: Market plaza, cafes, mixed-use (busiest)
├── South Zone: Riverside parks, quieter
├── Rooftop Network: Primary highway for cats (6+ buildings)
└── River: Wildlife corridor (fish visible, jumping puzzle)
```

**Procedural Generation Rules:**
- Base grid: 50-60m blocks (larger than residential)
- Building density: 60% (medium-high, with wide streets/plazas)
- Street type: 40% major/arterial, 60% pedestrian/alley
- Rooftop connectivity: Bridges/planks between adjacent roofs
- Green coverage: 20% (selective tree placement, no continuous park)

### 2.2 Warehouse District Details

**6 Main Warehouse Structures (Converted Lofts):**

**Warehouse A (Yarn Mill Central):**
- Original purpose: Textile factory (iconic building)
- Current: Mixed-use converted lofts
- Height: 7 stories (28m)
- Facade: Raw red brick, large windows (upper floors added)
- Rooftop: Accessible via fire escape, with connecting bridge to B
- Interior visible: Exposed beams, industrial aesthetic
- Features:
  - Ground floor: Open-concept cafe/restaurant
  - Upper floors: Residential lofts, artist studios
  - Rooftop garden: Small trees, seating area
  - Alley entry: Side access to rooftop stairs

**Warehouse B-F (Similar, Varied Details):**
- Heights: 6-8 stories (varies by PCG)
- Facades: Mix of brick/metal panel, large modern windows
- Rooftop access: Fire escapes, interior stairs
- Ground level: Mix of shops, galleries, cafes
- Distinctive features: Unique architectural details (some with turrets, skylights, etc.)
- Rooftop network: Planks/bridges connect 4-5 adjacent roofs

**Rooftop Parkour Zone:**
- Challenge: Navigate from Warehouse A to F via rooftops
- Obstacles: Height differences (1-3m), gaps (2-4m), HVAC units
- Rewards: Hidden items, scenic views, NPC encounters
- Asset use: Instanced pipes, railings, utility boxes (visual complexity without draw-call cost)

### 2.3 Yarn Mill Marketplace

**Layout:**
```
Marketplace Plaza (150m × 120m):
├── North: Permanent vendor stalls (30 individual structures)
├── East: Food court (5 restaurant frontages)
├── South: Seating area (20 tables, umbrellas)
├── West: Performance stage (3m × 4m, platforms)
└── Center: Open plaza (gathering, performance space)
```

**Vendor Stalls (Procedurally Placed):**
- Fish market stall (primary: fresh fish, cat-favorite!)
- Vegetable market (seasonal produce)
- Flower stall (color changes seasonally)
- Craft items (pottery, woven goods, etc.)
- Food trucks (2-3, parked semi-permanent)
- Art display (rotating local artists)

**Daily Rhythm:**
- Early morning (06:00-08:00): Vendor setup, delivery trucks
- Daytime (08:00-17:00): Full market, peak 10:00-12:00
- Evening (17:00-20:00): Wind down, some vendor departure
- Night (20:00+): Empty plaza, occasional food scraps

**Visual Details:**
- Signage (hand-painted, weathered)
- Tarps/canopies (colored, casting shadows)
- Produce displays (apples, melons, vegetables modeled simply)
- People clusters (baked animation, eating/talking)

### 2.4 Street Art & Murals

**Strategy:** Dynamic mural system shows district personality

**Mural Locations (8-12 major pieces):**

**The Great Cat Mural (60m × 20m):**
- Location: East side of Warehouse B
- Content: Giant stylized cat face, colorful
- Animation: Subtle eye-follow effect (player movement tracking)
- Seasonal variants: Changes colors per season (spring pastels, summer bright, autumn warm, winter cool)
- Asset: High-res 2K texture, part of building facade

**Street Art Alley (Secondary Scene):**
- Location: Narrow alley between Warehouses C & D
- Content: Mix of graffiti, stencils, wheatpaste art
- Dynamic: 2-3 murals rotate monthly (procedural texture variation)
- Atmosphere: Colorful, youthful, photography-worthy
- Safety: Safe zone (no human traffic at night)

**Rooftop Galleries:**
- Murals on rooftop-facing walls (visible when climbing)
- Content: Abstract designs, city themes, cat-friendly art
- Coordination: Linked to neighborhood events/stories

### 2.5 Riverside Path & Nature

**Yarn Mill River Features:**
- Slow-moving water, ducks visible
- Bank width: 3-5m flat area
- Path: Paved pedestrian trail (1.5m wide)
- Bridges: 3 crossings (stone/wood aesthetic)

**Riverside Park Sections:**
- North area: Quiet, tree-shaded, few visitors
- Central area: Cafe-adjacent, busier
- South area: Open meadow, visible from far (landmark)

**Jumping Challenge (River Crossing):**
- Direct route across river via stepping stones (optional)
- Players can also use bridges (longer, safer)
- Water depth: 1m (can swim if necessary)
- Fish visible in water (ambient detail, can't catch)

### 2.6 Cat Cafe (Central Social Hub)

**The Purr Parlor:**
- Type: Famous local cat cafe, main gathering point
- Location: Central plaza, adjacent to market
- Architecture: Modern building (2 stories, 20m × 15m)
- Facade: Floor-to-ceiling windows, visible interior activity
- Capacity: Designed for 40+ cats, humans welcome

**Interior (Visible Through Windows):**
- Large seating area (human tables, 12 seats)
- Cat lounging platforms (shelves, towers, hammocks)
- Play area (toys scattered, human-cat interaction)
- Service counter (coffee/pastries)
- Ambiance: Warm lighting, cat-themed decor visible

**Exterior Details:**
- Patio seating (4 tables, cat-accessible)
- Hanging plants (flowers, creating visual interest)
- Menu board (visible from street)
- Cat-themed signage (cute, welcoming)

**Gameplay Role:**
- Primary NPC hub for cafe cat NPCs (15+ cats)
- Quest origin point
- Safe rest area
- Photo opportunity
- Lore delivery (bulletin board visible, daily announcements)

**Daily Activity:**
- 08:00-22:00: Open, variable foot traffic
- Peak: 14:00-16:00 (afternoon visitors), 19:00-21:00 (evening social)
- Cats present: 30-40 throughout day (PCG-spawned from resident pool)

### 2.7 NPC Distribution & Behavior

**NPC Population: 100-130 total (70-80 cats, 30-50 humans)**

**Cat NPC Types (District-Specific):**
1. **Warehouse Strays** (40%): Rooftop-dwelling, urban survivors
2. **Cafe Residents** (35%): Hub-based, celebrity cats, quest givers
3. **Market Scavengers** (20%): Food-focused, daytime active
4. **Industrial Loners** (5%): Dangerous/feral, night-active

**Human NPC Types (Simplified):**
1. **Vendors** (40%): Market stall workers, shop owners
2. **Cafe Staff** (20%): Cat cafe baristas, keepers
3. **Artists/Creative** (20%): Seen in galleries, alleyways
4. **Casual Visitors** (20%): Pedestrians, market browsers

**Daily Schedule Snapshot:**
```
TIME    LOCATION          CATS    HUMANS  ACTIVITY
08:00   Market/cafe       35      15      Opening, setup
10:00   Market/cafe       60      40      Peak market activity
12:00   Diner/cafe        50      45      Lunch gathering
14:00   Everywhere        70      20      Siesta (sparse)
16:00   Market/cafe       65      30      Afternoon browsing
18:00   Cafe/homes        45      25      Dinner time
20:00   Cafe/roofs        40      10      Evening social
22:00   Rooftops/alleys   30      0       Nocturnal activity (no humans)
```

---

## DISTRICT 3: DOWNTOWN CORE (SW Commercial/High-Rise)

### 3.1 Geographic Boundaries & Layout

**Boundaries:** SW quadrant, 0.8 km² (0-512m x 0-512m)

**Dominant Feature:** Central Tower (15 floors, 60m height, visible from city boundary)

**Grid Structure:**
```
Downtown Layout:
├── North: Lower mid-rise (6-10 stories)
├── Central: Tower zone (10-20 stories, tight cluster)
├── South: Mixed mid-rise, transitioning
├── East: Vertical integration (underground mall connections)
├── West: Quieter, less developed
└── Rooftops: Sparse, utility-focused (pipes, HVAC, water tanks)
```

**Procedural Generation Rules:**
- Base grid: 45-55m blocks (variable, responding to tower space)
- Building density: 75% (high-rise city)
- Street width: 12-16m (wider, car-focused streets)
- Vertical architecture: Facades emphasize height (glass reflections, shadow play)
- Rooftop variation: Mostly flat utility roofs, few parkour opportunities

### 3.2 Central Tower & Plaza Complex

**Downtown Tower (Iconic Landmark):**
- Height: 15 stories, 60m total (includes antenna spire 8m)
- Facade: Modern glass/steel, mirrored windows
- Architecture: Art deco influence (setbacks, ornamental top)
- Lobby: Visible through 8m-tall lobby windows (public space, NPCs visible)
- Rooftop: Observation area (player can reach via parkour, high-risk jump sequence)
- Base: Plaza surrounds (100m × 100m)

**Plaza Components:**

**Fountain Plaza (Central):**
- Large water feature (circular, 30m diameter)
- Multiple tiers, jumping-puzzle potential
- Water reflections (performance optimization: 2 reflection probes max)
- Seating: 15 benches around perimeter
- Accessibility: 1-2m edges (climbable by cat)

**Performance Stage (North):**
- Raised platform (2m high, 8m × 6m)
- Microphones/speakers visible (dormant during gameplay)
- Space for NPC performances, events
- Amphitheater seating (20 steps down, cascading benches)

**Shopping Pavilion (East):**
- Covered marketplace (4 vendor stalls, permanent fixtures)
- Retail storefronts (3-4 ground floor shops with windows)
- Signage: "Premium Shopping District"
- High-traffic area (busiest district)

**Sculpture Garden (South):**
- 3-4 modern art pieces (abstract, cat-safe materials)
- Planted areas (trees, flowers, benches)
- Quieter than plaza center
- Artistic community gathering point

### 3.3 High-Rise Buildings (Procedural Variation)

**Tower Types:**

**Type A: Glass Skyscraper (40% of downtown buildings)**
- 10-15 floors (40-60m)
- Facade: Reflective glass, metallic frame
- Windows: Uniform grid (geometric precision)
- Roof: Flat, HVAC visible
- Street Level: Retail/lobby (open, public)

**Type B: Art Deco (15% - signature historic buildings)**
- 8-12 floors (32-48m)
- Facade: Stone/brick, ornamental details
- Windows: Smaller, deco patterns
- Roof: Stepped/setback design
- Street Level: Vintage storefronts, marble lobby

**Type C: Brutalist Concrete (25% - aging '70s buildings)**
- 6-10 floors (24-40m)
- Facade: Bare concrete, minimal ornamentation
- Windows: Horizontal slits, narrow
- Roof: Flat, weathered
- Street Level: Various retail, mixed usage

**Type D: Modern Mixed-Use (20% - new developments)**
- 12-16 floors (48-64m)
- Facade: Varied materials (stone, glass, metal)
- Windows: Large, modern (asymmetrical patterns)
- Roof: Terraced, possible garden access
- Street Level: Retail + public space

### 3.4 Underground Mall System

**Layout (Below Downtown Core):**
```
Underground Mall (Basement Level -1 to -2):
├── Main Corridor: 100m long, 8m wide (climate-controlled)
├── Branch A: Food Court (5 restaurants/stalls)
├── Branch B: Shopping (8 retail stores)
├── Central Hub: Seating, information, atmosphere
├── Access: 3 entry points to street above (stairs/escalators)
└── Parking: Limited, not gameplay-relevant
```

**Visual Style:**
- Brutalist concrete walls (matched to Brutalist buildings above)
- Fluorescent ceiling lights (cool 5000K, clinical)
- Shiny polished floors (reflective, wet-appearance)
- Minimal decoration (functional, utilitarian)
- Some color (store signs, product displays add warmth)

**Gameplay Features:**
- Weather sanctuary (escape rain/snow/heavy weather)
- NPC gathering space (always populated, safe)
- Quick traversal route (straight path under district)
- Atmospheric contrast (from outdoor city to indoor refuge)

**NPC Activity:**
- Consistent presence (daytime: 20-30 NPCs, evening: 10-15)
- Shopping patterns (browsing, eating)
- Noise: Echoing footsteps, ambient chatter, food court sounds
- Lighting: Cool, artificial (mood shift from outdoor)

### 3.5 Points of Interest

**Pet Supply Megastore (3-floor building):**
- Location: East plaza edge
- Size: 40m × 30m footprint, 15m height (3 floors)
- Exterior: Modern facade, large window displays
- Signage: Bright, colorful, pet-themed
- Entrance: Accessible (sliding doors, ramp)
- Visible Interior:
  - Ground floor: Small animals section (visible cages, toys)
  - Upper floors: Larger pet equipment visible through windows
- NPC Presence: 2-3 human staff visible, 5+ cat NPCs browsing/exploring
- Gameplay: Item source (potential), quest location

**Gourmet Food Court (Underground):**
- Central gathering space (50m × 40m)
- 5 food stalls (sushi, pizza, burgers, salads, desserts)
- Visible through windows from main corridor
- Seating: 20 tables (some occupied)
- Aroma: Food particle effects visible
- Activity: Peak 12:00-13:30, evening 18:00-19:30
- Quest hook: NPC gathering point

**Urban Garden Rooftop (Botanical Sanctuary):**
- Location: Top floor of mixed-use building (16 floors)
- Accessibility: Internal stairs (player reaches via extreme parkour)
- Garden: 60m × 40m planted area
- Features:
  - Vegetables (tomato vines, herb boxes)
  - Flowers (seasonal color)
  - Trees (3-4 medium trees, shade)
  - Seating (benches, overlooking city)
  - Water feature (small fountain)
- Atmosphere: Peaceful, high, overlooking entire city
- Gameplay: Secret area reward, photo spot, lore location
- NPC: 1-2 gardeners tending (daytime only)

**Downtown Tower Observation Deck (High-Risk Challenge):**
- Location: 15th floor rooftop area
- Accessibility: Parkour challenge through building exterior
- Features:
  - 360° city view (largest vantage point in game)
  - Observation railings (static, visual)
  - Wind effects (particle trails, audio wind)
  - Vulnerable to height (visual dizziness effect for player)
- Challenge: Multiple jump sequences, narrow ledges
- Reward: Achievement, story unlock, panoramic view
- Gameplay: End-game exploration goal, NPC meeting point

### 3.6 NPC Distribution & Behavior

**NPC Population: 60-80 total (30-40 cats, 30-50 humans)**

**Daytime vs. Night Distribution:**
- Daytime (08:00-18:00): 45 humans, 40 cats (busy commercial district)
- Evening (18:00-22:00): 20 humans, 25 cats (shops closing, quieter)
- Night (22:00-08:00): 0 humans, 10-15 cats (eerie, dangerous, nocturnal culture)

**Cat NPC Types (Urban-Specific):**
1. **Businesscats** (30%): Daytime-active, shopping/eating, fast-paced
2. **Strays** (40%): Night-active, rooftop wanderers, evasive
3. **Cafe/Restaurant Cats** (20%): Hub-based, food-motivated
4. **Tourist Cats** (10%): Random visitors from other districts

**Human NPC Types:**
1. **Office Workers** (40%): Rushing between locations (peak 08:00-09:00, 17:00-18:00)
2. **Shoppers** (30%): Browsing stores, eating
3. **Street Performers** (10%): Musicians, artists (main plaza, daytime)
4. **Security/Staff** (20%): Shop workers, mall employees

**Daily Rhythm:**
```
TIME    LOCATION         ACTIVITY                    DENSITY
06:00   Streets/homes    Setup, delivery trucks      5 humans
08:00   Streets/shops    Commute, opening            25 humans
10:00   Shops/plaza      Shopping, browsing          35 humans
12:00   Food court/diner Lunch gathering             40 humans + 30 cats
14:00   Everywhere       Post-lunch, dispersed       25 humans
16:00   Shops/plaza      Afternoon shopping          30 humans
18:00   Shops/streets    Evening commute out         15 humans
20:00   Cafe/roofs       Evening social (cats only)  20 cats
22:00   Rooftops/alleys  Nocturnal activity          10-15 cats
```

---

## DISTRICT 4: MOON GARDEN (NE Parks & Green)

### 4.1 Geographic Boundaries & Layout

**Boundaries:** NE quadrant, 1.2 km² (512-1024m x 512-1024m)

**Dominant Feature:** Central Botanical Garden (250m × 200m, crown jewel)

**Grid Structure:**
```
Moon Garden Layout:
├── Central Garden: Botanical centerpiece (manicured)
├── Sacred Grove: Dense forest (north zone, atmospheric)
├── Wildflower Meadow: Open grassland (west, colorful)
├── Lotus Ponds: Three water features (east, jumping puzzles)
├── Hiking Trails: Network connecting zones
└── Pavilion: Central structure, gathering point
```

**Procedural Generation Rules:**
- Building density: 15% (minimal infrastructure)
- Green coverage: 85% (maximum vegetation)
- Trail network: PCG-generated organic paths (non-grid)
- Water placement: Fixed ponds + PCG stream features
- Vertical relief: Elevation changes 5-15m (hilly terrain)

### 4.2 Botanical Garden (Central Zone)

**Master Garden Layout:**

**Entrance Area (South Gate):**
- Formal entry plaza (40m × 30m)
- Signage: "Moon Botanical Garden - Est. 1987"
- Paths: Multiple entry routes (accessibility)
- Feature: Small fountain, 5m diameter
- Parking: Visible (not accessible to player)
- Welcome: Gated but open, inviting

**Formal Garden Section (25% of area):**
- Geometric layout (grid paths, symmetrical beds)
- Plant categories:
  - Rose garden (pink/red/yellow varieties, fragrant)
  - Herb garden (organized by type: culinary, medicinal)
  - Perennial beds (seasonal color rotations)
- Infrastructure:
  - Gravel paths (crunching audio, visible footprints)
  - Arbors and trellises (climbing vines, shade structures)
  - Benches (12 scattered, scenic views)
  - Water features (fountains, small channels)

**Wildflower Meadow (35% of area):**
- Naturalistic planting (not organized)
- Plant diversity: 40+ visible flower types
- Seasonal color swaps:
  - Spring: Tulips (reds, yellows, purples)
  - Summer: Cosmos, zinnias (bright pastels)
  - Autumn: Goldenrod, asters (warm oranges, purples)
  - Winter: Ornamental grasses (tan, golden tones)
- Pathways: Mown grass trails (natural wear patterns)
- Wildlife: Bees, butterflies visible (particle effects)

**Tropical Conservatory (20% of area):**
- Greenhouse structure (glass + steel, 30m × 25m)
- Interior visible through glass:
  - Palm trees (towering, creating jungle atmosphere)
  - Humid vegetation (ferns, exotic plants)
  - Water features (interior pond, moss-covered)
  - Warm lighting (visible from outside)
- Entrance: Glass doors, accessible to NPCs (not player)
- Gameplay: Visual landmark, atmospheric landmark, no interior access

**Arboretum Zone (20% of area):**
- Large specimen trees (native and exotic)
- Tree types (spacing to avoid overcrowding):
  - Oak trees (10 large specimens)
  - Magnolias (5, flowering, beautiful)
  - Maples (8, seasonal color leaders)
  - Birches (12, white-bark contrast)
  - Evergreens (5 species, year-round structure)
- Understory: Shade plants, ferns, shade-tolerant flowers
- Shade rating: 50-60% canopy coverage (openness with shelter)

### 4.3 Sacred Grove (North Zone)

**Atmosphere:** Spiritual, meditative, slightly eerie

**Physical Features:**
- Tight tree spacing (80%+ canopy coverage, dark and cool)
- Moss-covered ground (soft, muted colors)
- Fallen logs (navigational obstacles, atmospheric)
- Water features: Small stream flowing through (2m wide, 0.5m deep)
- Pathways: Narrow, winding, natural (not formal)

**Tree Composition:**
- Old-growth appearance (mature specimens)
- Mix of types: Oak, beech, spruce (dense, dark-barked)
- Tangled undergrowth: Ferns, brambles, shade-plants
- Exposed roots: Creating natural parkour obstacles

**Audio Landscape:**
- Ambient: Forest hum, rustling leaves, bird calls
- Water: Stream babbling, distant waterfall sound
- Wind: Whispers through dense canopy
- Absence: Minimal human sounds (sanctuary feel)

**Gameplay Features:**
- Navigation challenge (winding, easy to get lost)
- Hiding spots (NPCs spawn here, encounters possible)
- Atmospheric tension (darkness, isolation)
- Photography opportunity (moody, beautiful light breaks)

### 4.4 Lotus Pond Complex (East Zone)

**Three Connected Ponds:**

**Meditation Lotus Pond (Central):**
- Shape: Circular, 40m diameter
- Depth: 1.5m max (swimmable)
- Water level: Clear, reflective
- Features:
  - Lotus flowers (pink/white, surface-floating)
  - Lily pads (5-6 large ones, jumping puzzle)
  - Koi fish (visible, orange and white)
  - Stone bridge (crossing, 2m wide)
  - Waterfall (entering from north, 2m drop)
- Surrounding: Tree-lined, benches facing water (4-5)
- Atmosphere: Serene, meditative, healing

**Wildlife Pond (North):**
- Shape: Irregular, natural shoreline
- Depth: 1-2m variable
- Feature:
  - Cattails and water plants (natural vegetation)
  - Turtles visible (sunbathing, audio sounds)
  - Reeds (hiding spots for NPCs)
  - Shallow beach area (wading zone)
- Accessibility: Natural entry points (no formal path)
- Atmosphere: Wild, untamed, naturalistic

**Cascade Pool (South):**
- Shape: Elongated, fed by waterfall
- Depth: 0.5-1m (shallower)
- Features:
  - Waterfall from above (3m drop, visual feature)
  - Rocky outcropping (jumping challenge)
  - Mist zone (water particles, atmospheric)
  - Whirlpool effect (gentle, not dangerous)
- Surrounding: Rocks, moss, water-loving plants
- Gameplay: Optional extreme parkour route (waterfall challenge)

### 4.5 Observatory Pavilion (Landmark)

**Location:** Hilltop (center-north), highest point in Moon Garden

**Structure:**
- Architectural style: Japanese-influenced (pagoda inspiration)
- Materials: Wood + stone, weathered aesthetic
- Size: 15m × 15m
- Levels: 2 stories (10m total height)

**Design Details:**
- Curved roof (traditional Asian architecture)
- Open sides (pavilion, not enclosed)
- Central column (support, decorative)
- Platform edges (railings, safety)
- Interior: Benches, observation equipment (decorative)

**Purpose:**
- Viewing platform (panoramic vista, entire city visible)
- Landmark (visible from far, navigation aid)
- NPC gathering point (quest hub)
- Photography spot (beautiful vantage)

**Surrounding:**
- Cleared plaza (30m radius, grass, flowers)
- Approaching paths (multiple routes, varying difficulty)
- Elevation: 20m above surrounding (climbed via hiking trails)

### 4.6 Hiking Trail Network

**Trail System (PCG-Generated):**

**Trail Distribution:**
- Main Trail (easy, 2km loop): Flat, wide, all-accessible
- Woodland Trail (moderate, 1.5km): Winding, elevation changes
- Summit Trail (hard, 1km): Steep, narrow, obstacle-course
- Secondary Paths (exploratory, branching): Hidden routes

**Trail Features:**
- Signage: Mileage markers, difficulty indicators
- Surface variety: Gravel (quiet), grass (soft), dirt (natural)
- Obstacles: Fallen logs, rocks, elevation (parkour elements)
- Clearings: Scenic viewpoints, rest areas at intervals

**NPC Integration:**
- NPCs follow trails (hiking behavior)
- Jogging cats on main trail
- Solitary cats meditating at pavilion
- Guides (seasonal, lead tours on weekends)

### 4.7 NPC Distribution & Behavior

**NPC Population: 80-100 total (60-70 cats, 20-30 humans)**

**Distribution Pattern:**
- Garden center: 15-20 humans (daytime weekends only, sparse weekdays)
- Trails: 10-15 cats (hikers, wanderers)
- Pavilion: 5-8 cats (gatherers, leaders)
- Ponds: 10-15 cats (fishing, meditation, swimming)
- Sacred Grove: 5-10 cats (solo, meditating, evasive)

**Cat NPC Types (Nature-Specific):**
1. **Wilderness Cats** (50%): Trail wanderers, confident, independent
2. **Garden Tenders** (20%): Caretaker-like, protective, wise elders
3. **Water Dwellers** (15%): Fishing, swimming, aquatic-focused
4. **Spiritual Cats** (15%): Meditation seekers, pacific, mysterious

**Human NPC Types:**
1. **Weekend Gardeners** (40% - weekends only): Tending garden, socializing
2. **Joggers/Hikers** (30% - mornings, weekends): Trail users, exercise-focused
3. **Garden Staff** (20%): Visible tending plants (pruning, watering)
4. **Tourists** (10%): Photo-takers, casual visitors

**Daily/Weekly Schedule:**

```
WEEKDAYS:
TIME    LOCATION         HUMANS  CATS    ACTIVITY
08:00   Trails           0       8       Morning hikers (cats)
10:00   Garden           2       12      Staff tending, scattered cats
12:00   Pavilion/ponds   1       15      Lunch, meditation
14:00   Everywhere       0       20      Siesta, dispersed
16:00   Garden           1       12      Afternoon wandering
18:00   Trails           0       10      Evening strollers
20:00   Pavilion         0       8       Gathering time
22:00   Everywhere       0       5       Night explorers

WEEKENDS (Different):
TIME    LOCATION         HUMANS  CATS    ACTIVITY
09:00   Trails           8       10      Joggers, casual hikers
10:00   Garden/cafe      15      15      Peak visit, family groups
12:00   Pavilion/ponds   10      20      Social gathering
14:00   Everywhere       12      18      Dispersed, photo-taking
16:00   Garden           8       12      Lingering, tea (visible)
18:00   Pavilion         5       10      Sunset social gathering
```

---

## APPENDIX: Shared District Systems

### A.1 NPC Movement & Pathfinding
- All districts use same A* pathfinding on street/trail networks
- Cats prefer rooftops/high paths; humans use streets
- Time-locked routes (morning commute, lunch rush, evening departure)

### A.2 Dynamic Events
- Weekly market day variations (markets busier weekends)
- Seasonal festival decorations (holiday season, harvest festival)
- Weather-triggered NPC shelter behavior
- Emergency events (rare, story-driven)

### A.3 Player Hazard Zones
- Traffic (downtown, moderate danger)
- Water (rivers, ponds, avoidable)
- Height (rooftops, optional challenge)
- Feral cats (sacred grove, night-time, avoidable)

### A.4 Rest & Safe Areas
- Parks (quiet, shelter, safety)
- Cafes (indoor, warm, safe)
- Pavilion (secluded, spiritual)
- Rooftops (elevated, visibility, safety)

---

**STATUS:** Complete (4 districts, detailed specs)  
**Next Phase:** Asset creation (models, textures, animations) & NPC behavior scripting
