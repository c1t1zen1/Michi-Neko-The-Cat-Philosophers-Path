# Cat City Procedural Generation Specification

**Version:** 1.0  
**Date:** 2026-07-10  
**Engine:** ThreeJS + Noise-based procedural systems  
**Language:** JavaScript/WebGL  

---

## 1. PROCEDURAL GENERATION OVERVIEW

### 1.1 Generation Philosophy

**Core Principle:** "Deterministic randomness using seeded noise"

All procedural generation uses Seeded Perlin/Simplex noise functions, guaranteeing:
- **Reproducibility:** Same seed = same world always
- **Continuity:** Seamless chunk boundaries
- **Performance:** Pre-computed noise, not real-time generation
- **Variety:** Multiple noise octaves for natural variety

### 1.2 Generation Pipeline

```
WORLD SEED (User input or auto-generated)
    ↓
CHUNK REQUEST (x, y coordinates)
    ↓
NOISE SAMPLING (Per-chunk noise lookup)
    ↓
STREET LAYOUT GENERATION
    ↓
BUILDING PLACEMENT & VARIATION
    ↓
PROP/OBJECT PLACEMENT
    ↓
NPC SPAWN POINTS
    ↓
CHUNK MESH ASSEMBLY
    ↓
STREAMING TO GPU
```

### 1.3 Noise Function Standards

**Noise Type:** Simplex Noise (2D)
**Library:** `simplex-noise.js` or equivalent

**Standard Parameters:**
```javascript
let seed = 12345; // World seed
let perlin = new SimplexNoise(Math.random);
let noiseValue = perlin.noise2D(x / scale, y / scale);
// Returns: -1.0 to 1.0
```

**Scaling & Remapping:**
```javascript
// Convert noise to 0-1 range
normalized = (noiseValue + 1.0) / 2.0;

// Scale to specific range
result = Math.floor(normalized * maxValue);
```

---

## 2. STREET LAYOUT GENERATION

### 2.1 District-Specific Layout Strategies

#### **Residential District: Organic Grid**

**Algorithm:** Modified grid with organic variation

```
Step 1: Base Grid Generation
  - Create 80m × 80m grid of blocks
  - 6-8m street width

Step 2: Noise-Based Distortion
  - Sample Perlin noise at grid points
  - Offset grid lines by ±5-10% (noise-based)
  - Creates organic, non-perfect grid

Step 3: Alley Network
  - Sample secondary noise function
  - Random alley placement (40% probability per block diagonal)
  - Alley width: 4-5m
  - Creates shortcut network

Step 4: Intersection Types
  - Standard (80% of intersections): 90° corners
  - Diagonal (15%): 45° cuts (parkour opportunities)
  - Plaza (5%): Expanded to 100m × 100m open area
```

**Pseudocode:**
```javascript
function generateResidentialStreets(chunkX, chunkY, seed) {
  const streetGrid = [];
  const baseGridSize = 80; // meters
  const noiseScale = 0.05;
  
  for (let bx = 0; bx < 10; bx++) { // 10 blocks per chunk
    for (let by = 0; by < 10; by++) {
      // Base grid position
      let gridX = chunkX * 2560 + bx * baseGridSize;
      let gridY = chunkY * 2560 + by * baseGridSize;
      
      // Noise-based offset
      let noise1 = perlin.noise2D(gridX / 500, gridY / 500);
      let noise2 = perlin.noise2D(gridX / 400 + 10000, gridY / 400 + 10000);
      
      let offsetX = noise1 * 8; // ±8m offset
      let offsetY = noise2 * 8;
      
      gridX += offsetX;
      gridY += offsetY;
      
      streetGrid.push({
        x: gridX,
        y: gridY,
        type: 'intersection',
        hasAlley: (perlin.noise2D(gridX/200, gridY/200) > 0.5)
      });
    }
  }
  
  return streetGrid;
}
```

**Output:** Array of intersection points, street segments connecting them

#### **Commercial District: Regular Grid**

**Algorithm:** Perfect grid with minimal variation

```
Step 1: Strict Grid
  - 120m × 120m blocks (wider for car traffic)
  - 12-16m street width
  - Perfectly aligned (no noise distortion)

Step 2: Intersection Enhancement
  - Detect major intersections (every 240m)
  - Expand to plaza (150m × 150m)
  - Add fountain/public space

Step 3: One-Way Streets
  - Alternate N-S and E-W one-way patterns
  - Based on noise (deterministic)
  - Creates traffic flow variation

Step 4: Elevated Paths
  - Connect sky bridges (noise-determined)
  - Between tower pairs (specified)
  - 20-30m elevation
```

**Pseudocode:**
```javascript
function generateCommercialStreets(chunkX, chunkY) {
  const streetGrid = [];
  const blockSize = 120;
  
  for (let bx = 0; bx < 8; bx++) { // 8 blocks per chunk (commercial larger)
    for (let by = 0; by < 8; by++) {
      let x = chunkX * 2560 + bx * blockSize + blockSize/2;
      let y = chunkY * 2560 + by * blockSize + blockSize/2;
      
      let intersectionType = 'normal';
      
      // Major intersection expansion
      if (bx % 2 === 0 && by % 2 === 0) {
        intersectionType = 'plaza';
      }
      
      streetGrid.push({
        x, y,
        type: intersectionType,
        oneWay: (perlin.noise2D(x/300, y/300) > 0) ? 'NS' : 'EW'
      });
    }
  }
  
  return streetGrid;
}
```

#### **Industrial District: Irregular Grid**

**Algorithm:** Large blocks with truck-focused layout

```
Step 1: Large Block Generation
  - 150-200m variable block sizes
  - Noise determines size variation
  - Creates uneven urban feel

Step 2: Truck Routes
  - Primary north-south route (wide)
  - Primary east-west route (wide)
  - Secondary routes (narrower)
  - Truck-friendly geometry (large radii)

Step 3: Rail Integration
  - Rail track placement (north-south)
  - Based on noise sampling
  - Parallel to main street

Step 4: Loading Areas
  - Expanded areas for docks
  - 30-40m radius per major warehouse
  - Truck turning radiuses accommodated
```

**Pseudocode:**
```javascript
function generateIndustrialStreets(chunkX, chunkY) {
  const streets = [];
  let baseX = chunkX * 2560;
  let baseY = chunkY * 2560;
  
  // Primary streets (wide, truck routes)
  streets.push({
    type: 'primary',
    direction: 'horizontal',
    y: baseY + 1280,
    width: 16,
    priority: 1
  });
  
  streets.push({
    type: 'primary',
    direction: 'vertical',
    x: baseX + 1280,
    width: 16,
    priority: 1
  });
  
  // Secondary streets with noise variation
  for (let i = 0; i < 6; i++) {
    let noise = perlin.noise2D(baseX / 500 + i, baseY / 500);
    let offset = (noise + 1) * 500; // 0-1000m offset
    
    streets.push({
      type: 'secondary',
      direction: i % 2 === 0 ? 'horizontal' : 'vertical',
      position: baseY + offset,
      width: 12
    });
  }
  
  return streets;
}
```

#### **Park District: Organic Paths**

**Algorithm:** Natural flowing paths, non-grid

```
Step 1: Terrain Analysis
  - Generate height map (noise-based)
  - Identify natural flow paths
  - Avoid steep slopes

Step 2: Main Loop
  - Circular/elliptical main path
  - 10km+ walking distance
  - Connects all major features
  - Width: 3-4m

Step 3: Secondary Trails
  - Branch from main loop
  - Random branching (noise-determined)
  - Lead to points of interest
  - Width: 2-3m

Step 4: Natural Obstacles
  - Place rocks, logs (noise distribution)
  - Fallen trees (parkour obstacles)
  - Water crossings (bridge points)
  - Creates exploration challenge
```

**Pseudocode:**
```javascript
function generateParkPaths(chunkX, chunkY) {
  const paths = [];
  
  // Main loop (approximately)
  const centerX = 2048, centerY = 2048;
  const radius = 1400; // Large loop radius
  
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    let x = centerX + Math.cos(angle) * radius;
    let y = centerY + Math.sin(angle) * radius;
    
    // Noise variation on path (natural wandering)
    let noise = perlin.noise2D(angle, 0);
    x += noise * 50;
    y += noise * 50;
    
    paths.push({ x, y, type: 'main_loop', width: 4 });
  }
  
  // Secondary trails (radiating)
  for (let i = 0; i < 8; i++) {
    let angle = (i / 8) * Math.PI * 2;
    
    // Trail radiates outward
    for (let dist = 200; dist < radius; dist += 50) {
      let x = centerX + Math.cos(angle) * dist;
      let y = centerY + Math.sin(angle) * dist;
      
      paths.push({ x, y, type: 'secondary', angle });
    }
  }
  
  return paths;
}
```

---

## 3. BUILDING GENERATION & VARIATION

### 3.1 Building Placement Algorithm

**Input:** Street layout, district type, chunk coordinates
**Output:** Array of building specifications

```javascript
function generateBuildings(streetSegments, districtType, seed) {
  const buildings = [];
  
  // Identify blocks between streets
  const blocks = identifyBlocks(streetSegments);
  
  for (let block of blocks) {
    // Skip percentage of blocks (empty space, parks)
    let developmentNoise = perlin.noise2D(block.centerX / 1000, block.centerY / 1000);
    if (developmentNoise < -0.3) continue; // 40% empty
    
    // Determine building type based on district
    let typeNoise = perlin.noise2D(block.centerX / 500 + 5000, block.centerY / 500 + 5000);
    let buildingType = selectBuildingType(districtType, typeNoise);
    
    // Place building in block with margin
    let building = {
      type: buildingType,
      position: {
        x: block.centerX,
        y: block.centerY
      },
      rotation: perlin.noise2D(block.centerX / 200, block.centerY / 200) * Math.PI,
      scale: generateBuildingScale(buildingType, typeNoise),
      variation: generateVariation(buildingType, block.centerX, block.centerY),
      color: generateBuildingColor(districtType, typeNoise)
    };
    
    buildings.push(building);
  }
  
  return buildings;
}
```

### 3.2 Building Type Selection by District

| District | Type Distribution | Selection Noise Range |
|----------|------------------|---------------------|
| **Residential** | 30% Victorian, 40% Modern Apt, 20% Single-Family, 10% Corner | -1.0 to 0.0: Victorian / 0.0-0.5: Modern / 0.5-0.8: Family / 0.8-1.0: Corner |
| **Commercial** | 20% Skyscraper, 40% Mid-Rise, 10% Dept Store, 30% Specialty | -1.0 to -0.2: Tower / -0.2 to 0.3: Mid / 0.3-0.5: Dept / 0.5-1.0: Specialty |
| **Industrial** | 50% Warehouse, 25% Factory, 20% Converted Loft, 5% Specialty | -1.0 to 0.3: Warehouse / 0.3-0.6: Factory / 0.6-0.9: Loft / 0.9-1.0: Special |
| **Park** | Minimal buildings, mostly natural | N/A (use terrain features) |

### 3.3 Building Scale Generation

**Pseudocode:**
```javascript
function generateBuildingScale(buildingType, noiseValue) {
  // Normalize noise to 0-1
  let normalized = (noiseValue + 1) / 2;
  
  const scales = {
    'victorian': { min: 0.9, max: 1.1 },
    'modern_apt': { min: 0.8, max: 1.3 },
    'single_family': { min: 0.7, max: 1.0 },
    'skyscraper': { min: 1.0, max: 1.5 },
    'mid_rise': { min: 0.9, max: 1.2 },
    'warehouse': { min: 0.95, max: 1.2 }
  };
  
  let typeScale = scales[buildingType];
  return typeScale.min + (normalized * (typeScale.max - typeScale.min));
}
```

### 3.4 Building Facade Variation

**Variation Types:** Window patterns, door styles, color schemes, architectural details

**Facade Variation System:**
```javascript
function generateVariation(buildingType, x, y) {
  // Multiple noise samples for different aspects
  let detailNoise = perlin.noise2D(x / 100, y / 100);
  let colorNoise = perlin.noise2D(x / 150 + 1000, y / 150 + 1000);
  let styleNoise = perlin.noise2D(x / 200 + 2000, y / 200 + 2000);
  
  return {
    facadeIndex: Math.floor(Math.abs(detailNoise) * 8), // 0-7 facade variations
    colorVariant: Math.floor(Math.abs(colorNoise) * 5), // 0-4 color options
    architecturalStyle: Math.abs(styleNoise) > 0 ? 'style_a' : 'style_b',
    doorType: Math.abs(styleNoise) > 0.5 ? 'glass' : 'wood'
  };
}
```

**Facade Database (per building type):**
- **Victorian:** 6 facade styles (window patterns, cornice details)
- **Modern Apartment:** 8 facade styles (glass ratios, horizontal banding)
- **Single Family:** 6 house style variations
- **Skyscraper:** 12 tower profiles
- **Warehouse:** 4 industrial variations

**Color Palette Variation:**
- Sample noise at separate coordinate offset (ensures variation)
- Map noise value to district-appropriate color palette
- Apply weather aging (faded colors in industrial, clean in residential)

### 3.5 Building Height Determination

**Algorithm:**
```javascript
function calculateBuildingHeight(buildingType, noiseValue) {
  const heights = {
    'victorian': { base: 15, variance: 5 }, // 10-20m
    'modern_apt': { base: 22, variance: 8 }, // 14-30m
    'single_family': { base: 10, variance: 3 }, // 7-13m
    'skyscraper': { base: 120, variance: 80 }, // 40-200m
    'mid_rise': { base: 45, variance: 15 }, // 30-60m
    'warehouse': { base: 18, variance: 7 }, // 11-25m
    'factory': { base: 30, variance: 10 } // 20-40m
  };
  
  let typeHeight = heights[buildingType];
  let normalized = (noiseValue + 1) / 2;
  
  return typeHeight.base + (normalized * typeHeight.variance);
}
```

---

## 4. NPC SPAWNING & BEHAVIOR GENERATION

### 4.1 NPC Spawn Point Generation

**Input:** Building locations, street positions, district type, time of day
**Output:** Spawn points with NPC type, schedule, behavior pattern

```javascript
function generateNPCSpawns(buildings, streets, districtType, timeOfDay) {
  const spawns = [];
  
  for (let building of buildings) {
    // Skip based on building type (warehouses have fewer NPCs)
    let activityNoise = perlin.noise2D(
      building.position.x / 300,
      building.position.y / 300
    );
    
    if (districtType === 'industrial' && activityNoise < 0.2) {
      continue; // Skip 40% of industrial buildings
    }
    
    // Generate spawn points on building entrance
    let entrancePos = {
      x: building.position.x + Math.cos(building.rotation) * 10,
      y: building.position.y + Math.sin(building.rotation) * 10
    };
    
    // Determine NPC type based on building type & district
    let npcType = selectNPCType(building.type, districtType, activityNoise);
    
    // Generate behavior schedule
    let schedule = generateNPCSchedule(npcType, timeOfDay);
    
    spawns.push({
      position: entrancePos,
      npcType: npcType,
      schedule: schedule,
      personality: generatePersonality(npcType, entrancePos),
      routine: generateRoutine(building, npcType)
    });
  }
  
  return spawns;
}
```

### 4.2 NPC Type Distribution by District & Building Type

**Residential District:**
- Victorian brownstones: Elderly residents (60%), Young professionals (25%), Families (15%)
- Modern apartments: Young professionals (40%), Students (30%), Families (30%)
- Single-family: Families (70%), Elderly (30%)

**Commercial District:**
- Skyscrapers: Business workers (80%), Visitors (20%)
- Dept stores: Shoppers (60%), Workers (40%)
- Restaurants: Diners (70%), Staff (30%)

**Industrial District:**
- Warehouses: Workers (80%), Artists (15%), Security (5%)
- Converted lofts: Artists (70%), Start-up workers (20%), Residents (10%)

**Park District:**
- Natural zones: Joggers (40%), Casual visitors (40%), Picnickers (20%)

### 4.3 NPC Schedule Generation

**Algorithm:** Time-of-day activity probability

```javascript
function generateNPCSchedule(npcType, timeOfDay) {
  const schedules = {
    'business_worker': {
      6: 0.1,   // 10% present at 6 AM
      8: 0.8,   // 80% present at 8 AM
      12: 0.95, // 95% present midday
      17: 0.9,  // 90% at 5 PM
      19: 0.2,  // 20% at 7 PM
      22: 0.05  // 5% at 10 PM
    },
    'shoppers': {
      8: 0.1,
      11: 0.6,
      13: 0.8,
      15: 0.7,
      18: 0.85,
      20: 0.4,
      22: 0.05
    },
    'joggers': {
      7: 0.7,
      8: 0.3,
      17: 0.6,
      19: 0.3,
      22: 0.0
    },
    'elderly': {
      8: 0.5,
      11: 0.8,
      14: 0.6,
      17: 0.4,
      22: 0.1
    }
  };
  
  // Interpolate probability at current time
  let schedule = schedules[npcType];
  return interpolateSchedule(schedule, timeOfDay);
}
```

### 4.4 NPC Routing & Pathfinding

**Algorithm:** Waypoint-based with noise variation

```javascript
function generateRoutine(building, npcType) {
  // Select routine type based on NPC type
  const routineTypes = {
    'business_worker': 'commute',
    'shopper': 'shopping',
    'jogger': 'exercise',
    'family': 'recreation'
  };
  
  let routineType = routineTypes[npcType];
  let waypoints = [];
  
  if (routineType === 'commute') {
    // Start at building, go to work area, return
    waypoints = [
      building.position,
      { x: building.position.x + 500, y: building.position.y + 500 },
      building.position
    ];
  }
  
  // Add noise variation to exact path
  for (let i = 0; i < waypoints.length; i++) {
    let noise = perlin.noise2D(
      waypoints[i].x / 200,
      waypoints[i].y / 200
    );
    waypoints[i].x += noise * 20;
    waypoints[i].y += noise * 20;
  }
  
  return {
    type: routineType,
    waypoints: waypoints,
    speed: generateNPCSpeed(npcType),
    pauseDuration: generatePauseDuration(npcType)
  };
}
```

---

## 5. OBJECT & PROP PLACEMENT

### 5.1 Parked Vehicle Generation

**Algorithm:** Place cars along street edges

```javascript
function generateParkedVehicles(streets, chunkX, chunkY) {
  const vehicles = [];
  
  for (let street of streets) {
    // Parking along street edges
    let streetLength = calculateStreetLength(street);
    let carSpacing = 6; // 6m per car (including bumper)
    
    for (let pos = 0; pos < streetLength; pos += carSpacing) {
      let parkingNoise = perlin.noise2D(
        street.x / 100 + pos / 100,
        street.y / 100 + pos / 100
      );
      
      // 60% parking density
      if (Math.abs(parkingNoise) > 0.4) continue;
      
      // Determine car model & color
      let modelNoise = perlin.noise2D(pos / 200, street.id);
      let colorNoise = perlin.noise2D(pos / 150 + 5000, street.id + 5000);
      
      vehicles.push({
        position: calculatePositionAlongStreet(street, pos),
        model: selectCarModel(modelNoise), // 8 variations
        color: selectCarColor(colorNoise),
        rotation: street.direction + (Math.random() - 0.5) * 0.1
      });
    }
  }
  
  return vehicles;
}
```

### 5.2 Street Furniture Placement

**Objects:**
- Fire hydrants (every 50m)
- Mailboxes (every 30m)
- Benches (parks, intersections)
- Trash cans (every 40m)
- Lampposts (every 20m)
- Bike racks (near shops)

**Algorithm:**
```javascript
function generateStreetFurniture(streets, districtType) {
  const furniture = [];
  
  for (let street of streets) {
    let position = 0;
    
    while (position < calculateStreetLength(street)) {
      // Fire hydrant
      if (position % 50 === 0) {
        furniture.push({
          type: 'fire_hydrant',
          position: calculatePositionAlongStreet(street, position),
          rotation: street.direction + Math.PI / 2
        });
      }
      
      // Bench (parks, plazas)
      if (districtType === 'park' && position % 100 === 0) {
        furniture.push({
          type: 'bench',
          position: calculatePositionAlongStreet(street, position),
          rotation: street.direction
        });
      }
      
      // Trash can
      if (position % 40 === 0) {
        furniture.push({
          type: 'trash_can',
          position: calculatePositionAlongStreet(street, position),
          color: selectRandomColor(position)
        });
      }
      
      position += 20;
    }
  }
  
  return furniture;
}
```

### 5.3 Vegetation Placement

**Algorithm:** Noise-based density maps

```javascript
function generateVegetation(terrain, districtType) {
  const vegetation = [];
  
  for (let x = 0; x < chunkWidth; x += 10) {
    for (let y = 0; y < chunkHeight; y += 10) {
      let treeNoise = perlin.noise2D(x / 100, y / 100);
      let grassNoise = perlin.noise2D(x / 50, y / 50);
      
      // Trees in residential/park (high in park, moderate in residential)
      if (districtType === 'park') {
        if (treeNoise > 0.3) {
          let treeType = selectTreeType(treeNoise);
          vegetation.push({
            type: 'tree',
            position: { x, y },
            model: treeType,
            scale: 0.8 + Math.abs(treeNoise) * 0.4
          });
        }
      } else if (districtType === 'residential' && treeNoise > 0.6) {
        vegetation.push({
          type: 'tree',
          position: { x, y },
          model: selectTreeType(treeNoise)
        });
      }
      
      // Grass everywhere
      vegetation.push({
        type: 'grass',
        position: { x, y },
        height: 0.1 + Math.abs(grassNoise) * 0.1
      });
    }
  }
  
  return vegetation;
}
```

---

## 6. CONTENT STREAMING ALGORITHM

### 6.1 Chunk Request & Loading

**System:** Quadtree-based spatial partitioning

```javascript
class ChunkManager {
  constructor(viewDistance = 2) {
    this.viewDistance = viewDistance; // chunks in each direction
    this.loadedChunks = new Map();
    this.chunkSize = 256; // meters
  }
  
  update(playerX, playerY) {
    let playerChunkX = Math.floor(playerX / this.chunkSize);
    let playerChunkY = Math.floor(playerY / this.chunkSize);
    
    // Determine which chunks should be loaded
    let chunksToLoad = [];
    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dy = -this.viewDistance; dy <= this.viewDistance; dy++) {
        let cx = playerChunkX + dx;
        let cy = playerChunkY + dy;
        
        if (!this.loadedChunks.has(`${cx},${cy}`)) {
          chunksToLoad.push({ x: cx, y: cy });
        }
      }
    }
    
    // Load chunks asynchronously
    for (let chunk of chunksToLoad) {
      this.loadChunk(chunk.x, chunk.y);
    }
    
    // Unload distant chunks
    this.unloadDistantChunks(playerChunkX, playerChunkY);
  }
  
  async loadChunk(x, y) {
    // Generate all procedural content for chunk
    let buildings = generateBuildings(x, y, this.seed);
    let npcs = generateNPCSpawns(buildings, x, y);
    let objects = generateObjects(x, y);
    
    // Create Three.js geometry and add to scene
    let chunkMesh = createChunkMesh(buildings, objects);
    this.scene.add(chunkMesh);
    
    // Spawn NPCs
    for (let npc of npcs) {
      this.spawnNPC(npc);
    }
    
    this.loadedChunks.set(`${x},${y}`, {
      mesh: chunkMesh,
      npcs: npcs,
      loaded: Date.now()
    });
  }
  
  unloadDistantChunks(centerX, centerY) {
    for (let [key, chunk] of this.loadedChunks) {
      let [cx, cy] = key.split(',').map(Number);
      
      // Unload chunks beyond view distance
      if (Math.abs(cx - centerX) > this.viewDistance + 1 ||
          Math.abs(cy - centerY) > this.viewDistance + 1) {
        this.scene.remove(chunk.mesh);
        this.loadedChunks.delete(key);
      }
    }
  }
}
```

### 6.2 LOD Streaming

**Streaming Strategy:**
1. **Distance 0-100m (LOD0):** Full detail, all geometry
2. **Distance 100-500m (LOD1):** 60% geometry, merged meshes
3. **Distance 500-1500m (LOD2):** 30% geometry, simple shading
4. **Distance 1500m+ (LOD3):** Billboards only

**Implementation:**
```javascript
function selectLODForChunk(distanceToPlayer) {
  if (distanceToPlayer < 100) return 0;
  if (distanceToPlayer < 500) return 1;
  if (distanceToPlayer < 1500) return 2;
  return 3; // Billboard
}

function generateChunkGeometry(x, y, lod) {
  let buildings = generateBuildings(x, y);
  
  if (lod === 0) {
    // Full detail models
    return buildings.map(b => createDetailedBuilding(b));
  } else if (lod === 1) {
    // Merged geometry
    return mergeGeometry(buildings.map(b => createSimplifiedBuilding(b)));
  } else if (lod === 2) {
    // Very simple
    return buildings.map(b => createBoxBuilding(b));
  } else {
    // Billboard only
    return buildings.map(b => createBillboard(b));
  }
}
```

---

## 7. PERFORMANCE OPTIMIZATION TECHNIQUES

### 7.1 Noise Pre-computation

**Strategy:** Pre-compute noise values for chunk at low frequency, sample during generation

```javascript
class NoiseCache {
  constructor(octaves = 4) {
    this.octaves = octaves;
    this.cache = new Map();
  }
  
  sample(x, y, scale = 100) {
    let key = `${Math.floor(x/scale)},${Math.floor(y/scale)}`;
    
    if (!this.cache.has(key)) {
      let value = 0;
      for (let oct = 0; oct < this.octaves; oct++) {
        let freq = Math.pow(2, oct);
        let amp = Math.pow(0.5, oct);
        value += perlin.noise2D(x / scale * freq, y / scale * freq) * amp;
      }
      this.cache.set(key, value);
    }
    
    return this.cache.get(key);
  }
}
```

### 7.2 Instanced Rendering

**Optimization:** Use GPU instancing for repeated objects

```javascript
function createInstancedBuildings(buildings) {
  const geometries = {};
  const instancedMeshes = [];
  
  // Group buildings by model type
  const grouped = groupBy(buildings, b => b.type);
  
  for (let [type, buildingList] of Object.entries(grouped)) {
    const geometry = getBaseGeometry(type);
    const count = buildingList.length;
    
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial(),
      count
    );
    
    // Set position, rotation, scale for each instance
    let index = 0;
    for (let building of buildingList) {
      const matrix = new THREE.Matrix4();
      matrix.compose(
        building.position,
        building.quaternion,
        building.scale
      );
      instancedMesh.setMatrixAt(index++, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMeshes.push(instancedMesh);
  }
  
  return instancedMeshes;
}
```

### 7.3 Frustum Culling

```javascript
function updateFrustumCulling(camera, scene) {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  );
  
  for (let object of scene.children) {
    if (object.geometry) {
      object.geometry.computeBoundingSphere();
      object.visible = frustum.intersectsSphere(
        object.geometry.boundingSphere.translate(object.position)
      );
    }
  }
}
```

---

## 8. TESTING & VALIDATION

### 8.1 Generation Validation Checklist

- [ ] Same seed produces identical world (reproducibility)
- [ ] Chunk boundaries seamless (no gaps/overlaps)
- [ ] No unreachable buildings (all accessible)
- [ ] NPC spawning balanced across districts
- [ ] Street connectivity verified
- [ ] Memory usage <500MB peak
- [ ] Generation completes <2s per chunk

### 8.2 Performance Profiling

```javascript
function profileChunkGeneration(x, y) {
  console.time('Building Generation');
  let buildings = generateBuildings(x, y);
  console.timeEnd('Building Generation');
  
  console.time('Mesh Creation');
  let mesh = createChunkMesh(buildings);
  console.timeEnd('Mesh Creation');
  
  console.log(`Buildings: ${buildings.length}`);
  console.log(`Triangle Count: ${mesh.geometry.getAttribute('position').count / 3}`);
}
```

---

## 9. ALGORITHM REFERENCE SUMMARY

| System | Algorithm | Complexity | Output |
|--------|-----------|-----------|--------|
| **Street Layout** | Noise-based grid distortion | O(n²) chunks | Street segment array |
| **Building Placement** | Block identification + noise selection | O(n) buildings | Building spec array |
| **Building Variation** | Noise sampling per building | O(1) per building | Facade variation ID |
| **NPC Spawning** | Building-based + schedule generation | O(n) buildings | Spawn point array |
| **Object Placement** | Spacing algorithm + noise | O(n) along streets | Object array |
| **Chunk Streaming** | Quadtree + distance check | O(log n) updates | Active chunk set |

---

## 10. FUTURE ENHANCEMENTS

- [ ] **Heightmap-based roads:** Terrain-aware street generation
- [ ] **Traffic flow simulation:** AI for vehicle routing
- [ ] **Procedural building interiors:** Room layout generation
- [ ] **Dynamic population:** Real-time NPC respawning based on activities
- [ ] **Asset variation streaming:** High-resolution variations load as player approaches
- [ ] **Seasonal procedural changes:** Weather and season affect building appearance

---

**Status:** Procedural Specification Complete  
**Ready for Implementation:** Yes  
**Integration Point:** Load into ChunkManager at application startup

