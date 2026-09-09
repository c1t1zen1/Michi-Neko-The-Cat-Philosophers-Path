# Cat City Procedural Generation Specification

**Version:** 1.0  
**Date:** 2026-07-10  
**Language:** Pseudocode + ThreeJS patterns  
**Target:** 60 FPS, <500MB memory, RPi 5 compatible

---

## Executive Summary

Procedural generation in Cat City uses **multi-layered noise functions, rule-based spatial grids, and asset instancing** to generate infinite explorable terrain while staying within strict performance budgets. Each 512m × 512m chunk generates in <500ms and consumes <30MB memory.

**Key Techniques:**
- Perlin noise for terrain variation (not actual heightmaps, stylized)
- L-system-like rules for street layout (grid + organic hybrid)
- Seeded RNG for deterministic, reproducible generation
- Mesh instancing for <2000 draw calls per frame
- Streaming pipeline with async loading

---

## 1. CHUNK GENERATION PIPELINE

### 1.1 Chunk Structure

**World Division:**
```
World Coordinates: 2000m × 2000m (4 km²)
Chunk Size: 512m × 512m (64 chunks total, 8×8 grid)
Cell Size: 32m × 32m (16×16 cells per chunk)
LOD System:
  - LOD0 (closest): Full chunks loaded, detail visible
  - LOD1 (mid): Simplified geometry, fewer assets
  - LOD2 (far): Billboards, baked textures only
  - LOD3 (skybox): Silhouettes on far-plane

Streaming:
  - Load radius: 1 chunk in all directions (3×3 grid around player)
  - Unload distance: >1 chunk away
  - Memory per chunk: <30MB (meshes + textures + audio)
  - Load time: <500ms (async task)
```

**Chunk Data Structure (Pseudocode):**
```javascript
class Chunk {
  id: string                      // "chunk_0_0" (x_y)
  position: Vector3               // World position (0,0,0) = center
  seed: number                    // Deterministic, chunk_id hash
  terrainHeightmap: Float32Array // 33×33 grid (includes edges)
  streetNetwork: Road[]           // Connected street segments
  buildings: Building[]           // Building objects (geometry + data)
  props: PropInstance[]           // Benches, signs, street lights
  npcs: NPCSpawn[]                // NPC spawn points
  
  // Rendering
  terrainMesh: THREE.Mesh         // Ground + sidewalk mesh
  buildingMeshes: THREE.Mesh[]    // Separate per building
  propMeshes: THREE.InstancedMesh // Instanced props
  
  // State
  isLoaded: boolean
  lodLevel: 0 | 1 | 2 | 3
  lastAccessTime: number
  isDirty: boolean
}
```

### 1.2 Generation Pipeline (Per Chunk)

**Step 1: Deterministic Seeding**
```python
def chunk_seed(chunk_x, chunk_y):
    # Hash chunk coordinates to deterministic seed
    seed = hash_combine(
        hash(chunk_x),
        hash(chunk_y),
        WORLD_SEED  # Global constant
    )
    return seed
```

**Step 2: Noise Functions (Elevation & Feature)**
```python
def generate_noise_layers(chunk_x, chunk_y, seed):
    # Perlin noise (terrain variation)
    elevation_noise = perlin_2d(
        x=chunk_x * 512 / 1024,  # Scale to noise frequency
        y=chunk_y * 512 / 1024,
        scale=512,
        octaves=4,
        persistence=0.5,
        lacunarity=2.0,
        seed=seed
    )
    
    # Forest density (affects trees, vegetation)
    forest_noise = perlin_2d(
        x=chunk_x * 512 / 256,
        y=chunk_y * 512 / 256,
        scale=256,
        octaves=3,
        persistence=0.6,
        lacunarity=2.2,
        seed=seed + 1000
    )
    
    # Urbanization (affects building density, street grid)
    urban_noise = perlin_2d(
        x=chunk_x * 512 / 512,
        y=chunk_y * 512 / 512,
        scale=512,
        octaves=2,
        persistence=0.7,
        lacunarity=2.5,
        seed=seed + 2000
    )
    
    return elevation_noise, forest_noise, urban_noise
```

**Step 3: Street Grid Generation**
```python
def generate_streets(chunk_x, chunk_y, seed, urban_noise):
    streets = []
    
    # Determine street type (grid density) based on urban_noise
    if urban_noise > 0.6:
        street_type = GRID_DENSE      # Downtown (45m blocks)
    elif urban_noise > 0.3:
        street_type = GRID_STANDARD   # Residential (50m blocks)
    else:
        street_type = ORGANIC_WANDERING  # Parks/suburbs (variable)
    
    if street_type == GRID_DENSE:
        # Regular grid with slight rotation
        rotation = (perlin_1d(seed) - 0.5) * 0.1  # ±5 degrees
        block_size = 45
        streets = generate_grid(block_size, rotation, chunk_x, chunk_y)
    
    elif street_type == GRID_STANDARD:
        # Grid with more variation
        block_size = 50 + random_range(-5, 5, seed)
        streets = generate_grid(block_size, 0, chunk_x, chunk_y)
    
    else:  # ORGANIC
        # Fractal-like street patterns
        streets = generate_organic_streets(chunk_x, chunk_y, seed)
    
    return streets, street_type
```

**Step 4: Building Placement**
```python
def generate_buildings(chunk_x, chunk_y, streets, forest_noise, seed):
    buildings = []
    
    for street_block in streets.blocks:
        # Skip blocks in high-forest areas
        forest_value = sample_noise(forest_noise, street_block.center)
        if forest_value > 0.7:
            continue  # Too forested, no buildings
        
        # Determine building type based on street width
        if street_block.perimeter_length > 300:
            building_type = LARGE_STRUCTURE  # Downtown skyscraper
            building_height = random_range(8, 15, seed + hash(street_block.id))
        else:
            building_type = RESIDENTIAL     # House or brownstone
            building_height = random_range(2, 4, seed + hash(street_block.id))
        
        # Place 1-4 buildings per block (L-shaped or covering portion)
        placement_pattern = select_pattern(street_block.perimeter, seed)
        
        for placement in placement_pattern:
            building = {
                position: placement.position,
                width: placement.width,
                depth: placement.depth,
                height: building_height,
                type: building_type,
                facade_color: select_facade_color(building_type, seed),
                seed: seed + hash(placement.id)
            }
            buildings.append(building)
    
    return buildings
```

**Step 5: NPC Spawn Points**
```python
def generate_npc_spawns(chunk_x, chunk_y, buildings, streets, seed):
    spawns = []
    
    # Outdoor spawns (streets, parks)
    outdoor_density = 8  # Per chunk
    for i in range(outdoor_density):
        pos = random_street_position(streets, seed + i)
        spawn = {
            position: pos,
            type: select_npc_type(pos, seed),
            time_active: determine_time_window(pos, seed),
            behavior: select_behavior(pos, seed)
        }
        spawns.append(spawn)
    
    # Indoor spawns (cafes, shops)
    cafe_buildings = [b for b in buildings if has_ground_floor_retail(b)]
    for cafe in cafe_buildings[:3]:  # Limit to 3 cafes per chunk
        spawn = {
            position: cafe.position + Vector3(0, 0, 0),
            type: NPC_CAT_INDOOR,
            time_active: "daytime",
            behavior: "stationary_or_wandering"
        }
        spawns.append(spawn)
    
    return spawns
```

### 1.3 Mesh Generation

**Street Mesh (Combined Geometry):**
```python
def generate_street_mesh(streets, chunk_bounds):
    geometry = THREE.BufferGeometry()
    vertices = []
    indices = []
    uv = []
    
    # For each street segment
    for street in streets:
        # Road surface (8m wide)
        road_verts = extrude_street(street, width=8, height=0)
        # Sidewalk (2m wide each side)
        sidewalk_l = extrude_street(street, width=2, height=0.1)
        sidewalk_r = extrude_street(street, offset_left, width=2, height=0.1)
        
        # Add to geometry with proper indices
        add_verts_indices(geometry, road_verts, sidewalk_l, sidewalk_r)
        
        # UV mapping (repeated road texture)
        map_uv_tiling(geometry, street.length, tile_size=8)
    
    # Create mesh
    material = create_street_material()  # Shared material
    mesh = THREE.Mesh(geometry, material)
    
    return mesh
```

**Building Mesh Generation (Procedural Faces):**
```python
def generate_building_mesh(building_spec):
    # Modular facade system
    geometry = THREE.BoxGeometry(building_spec.width, building_spec.height, building_spec.depth)
    
    # Window patterns
    window_cols = floor(building_spec.width / 3)
    window_rows = floor(building_spec.height / 3)
    
    # Create window texture dynamically (1K texture, reused)
    window_pattern = generate_window_pattern(window_cols, window_rows, building_spec.seed)
    
    # Select facade material
    facade_material = select_material_by_type(building_spec.type, building_spec.facade_color)
    
    # Create instanced mesh (same building template reused)
    mesh = THREE.Mesh(geometry, [
        facade_material,      // Front
        facade_material,      // Back
        roof_material,        // Top
        facade_material,      // Bottom
        facade_material,      // Left
        facade_material       // Right
    ])
    
    return mesh
```

---

## 2. STREET NETWORK GENERATION

### 2.1 Grid-Based Streets (Residential & Downtown)

**Algorithm: Modified L-System Grid**
```python
def generate_grid_streets(block_size, rotation, chunk_x, chunk_y):
    streets = []
    
    # Global coordinates (world-space)
    chunk_world_x = chunk_x * 512
    chunk_world_y = chunk_y * 512
    
    # Generate vertical streets (N-S)
    x = chunk_world_x
    while x < chunk_world_x + 512:
        # Apply slight curvature using noise
        curve = perlin_1d((x / 1000) * 0.5, seed=WORLD_SEED) * 10
        street = Line3D(
            start=(x + curve, chunk_world_y, 0),
            end=(x + curve, chunk_world_y + 512, 0),
            width=8,
            type="north_south"
        )
        streets.append(street)
        x += block_size
    
    # Generate horizontal streets (E-W)
    y = chunk_world_y
    while y < chunk_world_y + 512:
        curve = perlin_1d((y / 1000) * 0.5, seed=WORLD_SEED + 1000) * 10
        street = Line3D(
            start=(chunk_world_x, y + curve, 0),
            end=(chunk_world_x + 512, y + curve, 0),
            width=8,
            type="east_west"
        )
        streets.append(street)
        y += block_size
    
    # Identify intersections
    intersections = find_intersections(streets)
    
    return streets, intersections
```

### 2.2 Organic Streets (Parks & Natural Areas)

**Algorithm: Fractal Branching**
```python
def generate_organic_streets(chunk_x, chunk_y, seed):
    streets = []
    
    # Start from center or random point
    root_pos = Vector2(
        chunk_x * 512 + random(0, 512, seed),
        chunk_y * 512 + random(0, 512, seed)
    )
    
    # Recursive branching (L-system like)
    def branch(pos, direction, depth):
        if depth == 0:
            return
        
        # Extend street in direction
        length = random(50, 150, seed + depth)
        new_pos = pos + direction * length
        
        street = Line3D(pos, new_pos, width=4, type="path")
        streets.append(street)
        
        # Branch left and right with angle variation
        for angle_offset in [-30, 30]:  # Degrees
            new_direction = rotate_2d(direction, angle_offset)
            # Reduce probability of continuing
            if random() < 0.6:
                branch(new_pos, new_direction, depth - 1)
    
    # Start branching (3-4 depth levels for natural look)
    initial_direction = random_angle(seed)
    branch(root_pos, initial_direction, depth=3)
    
    return streets
```

### 2.3 Special Cases (Rivers, Parks)

**River Generation:**
```python
def generate_river(chunk_x, chunk_y, seed):
    # Use noise function to determine river position
    river_noise = perlin_2d(chunk_x, chunk_y, scale=2000, seed=RIVER_SEED)
    
    if river_noise < 0.4:
        # River runs through this chunk
        river_path = []
        
        for y in range(0, 512, 10):
            # Sine-wave meander
            x = 256 + sin(y / 100) * 100 + perlin_1d(y, seed) * 20
            river_path.append(Vector2(x, y))
        
        river = {
            path: river_path,
            width: random(2, 4, seed),
            crossings: generate_bridge_positions(river_path, seed)
        }
        
        return river
    
    return None  # No river in chunk
```

---

## 3. BUILDING VARIATION SYSTEM

### 3.1 Facade Generation (Modular)

**Building Type Selector:**
```python
def select_building_type(location, urban_density, seed):
    # Based on location and urban_density noise
    
    if urban_density > 0.75:
        types = [SKYSCRAPER, ART_DECO, BRUTALIST]
        weights = [0.4, 0.2, 0.4]
    elif urban_density > 0.5:
        types = [TOWNHOUSE, WAREHOUSE, MIXED_USE]
        weights = [0.3, 0.3, 0.4]
    else:
        types = [RESIDENTIAL, VICTORIAN, COTTAGE]
        weights = [0.4, 0.3, 0.3]
    
    return weighted_random_select(types, weights, seed)
```

**Facade Color Palette:**
```python
def select_facade_color(building_type, seed):
    if building_type == VICTORIAN:
        palette = [
            "#8B4513",  # Brown
            "#A0522D",  # Sienna
            "#704214",  # Darker brown
            "#C9302C"   # Red brick
        ]
    elif building_type == SKYSCRAPER:
        palette = [
            "#708090",  # Gray
            "#A9A9A9",  # Light gray
            "#DCDCDC",  # Gainsboro (white-ish)
            "#696969"   # Dim gray
        ]
    elif building_type == RESIDENTIAL:
        palette = [
            "#F5DEB3",  # Wheat
            "#DEB887",  # Burlywood
            "#CD853F",  # Peru
            "#D2B48C"   # Tan
        ]
    else:
        palette = [...]  # Other types
    
    return palette[hash(seed) % len(palette)]
```

**Window Pattern Generation:**
```python
def generate_window_pattern(cols, rows, building_seed):
    pattern = Matrix(rows, cols)
    
    for row in range(rows):
        for col in range(cols):
            # Most windows present (90%)
            # Some variation (missing or blocked)
            has_window = random() > 0.1
            
            if has_window:
                # Window type variation
                is_lit = random() < 0.6  # 60% lit at night
                window_type = select_from([DOUBLE_HUNG, MODERN, CASEMENT], building_seed + row + col)
                pattern[row][col] = {
                    present: true,
                    lit: is_lit,
                    type: window_type
                }
            else:
                pattern[row][col] = {present: false}
    
    return pattern
```

---

## 4. PROP & DECORATION PLACEMENT

### 4.1 Instanced Objects (Performance Critical)

**Prop Types:**
```python
PROP_TYPES = {
    STREETLIGHT: {
        mesh: "streetlight.glb",
        height: 4,
        spacing: 25,  # meters
        count_per_chunk: 80-120
    },
    BENCH: {
        mesh: "bench.glb",
        height: 0.8,
        placement: "near_parks_and_plazas",
        count_per_chunk: 20-40
    },
    TRASH_CAN: {
        mesh: "trash_can.glb",
        height: 1.2,
        placement: "streets_and_alleys",
        count_per_chunk: 30-50
    },
    FIRE_HYDRANT: {
        mesh: "fire_hydrant.glb",
        height: 0.8,
        placement: "street_intersections",
        count_per_chunk: 10-20
    },
    SIGN: {
        mesh: "sign.glb",
        height: 2,
        placement: "streets_and_parks",
        count_per_chunk: 15-30
    },
    PLANTER: {
        mesh: "planter.glb",
        height: 0.6,
        placement: "storefronts",
        count_per_chunk: 20-40
    }
}
```

**Instancing Algorithm:**
```python
def place_props_instanced(streets, buildings, chunk_seed):
    # Group props by type
    prop_instances = {}
    
    for prop_type in PROP_TYPES:
        prop_instances[prop_type] = []
        count = random(
            PROP_TYPES[prop_type].count_per_chunk[0],
            PROP_TYPES[prop_type].count_per_chunk[1],
            chunk_seed
        )
        
        for i in range(count):
            position = determine_prop_position(prop_type, streets, buildings, chunk_seed + i)
            rotation = random_rotation(chunk_seed + i * 2)
            scale = random_scale(0.95, 1.05, chunk_seed + i * 3)  # Minor variation
            
            prop_instances[prop_type].append({
                position: position,
                rotation: rotation,
                scale: scale
            })
    
    # Create InstancedMesh for each type (single draw call)
    meshes = {}
    for prop_type, instances in prop_instances.items():
        mesh = create_instanced_mesh(
            PROP_TYPES[prop_type].mesh,
            instances
        )
        meshes[prop_type] = mesh
    
    return meshes
```

### 4.2 Parked Car Placement

**Algorithm:**
```python
def place_parked_cars(streets, chunk_seed):
    cars = []
    
    # On-street parking along residential/commercial streets
    total_cars = random(40, 60, chunk_seed)
    
    for street in streets:
        # Determine parking eligibility
        if street.width < 12:
            continue  # Too narrow
        
        # Space cars along street (random spacing)
        spacing = random(5, 8, chunk_seed + hash(street.id))
        
        distance = 0
        while distance < street.length:
            car_model = select_car_model(chunk_seed + distance)
            color = select_car_color(chunk_seed + distance * 2)
            
            position = street.point_at_distance(distance) + offset_to_street_edge(spacing)
            rotation = street.direction  # Aligned to street
            
            cars.append({
                model: car_model,
                color: color,
                position: position,
                rotation: rotation
            })
            
            distance += spacing
    
    # Instanced rendering for all cars
    return create_instanced_mesh("car.glb", cars)
```

---

## 5. NPC & CONTENT STREAMING

### 5.1 NPC Spawn Management

**Deterministic Spawning:**
```python
def spawn_npcs_in_chunk(chunk, time_of_day, weather):
    npcs = []
    
    # Load pre-determined spawn points from chunk data
    for spawn_point in chunk.npc_spawns:
        # Check if active at current time
        if spawn_point.time_active.contains(time_of_day):
            npc = {
                id: spawn_point.id,
                type: spawn_point.type,
                position: spawn_point.position,
                behavior: spawn_point.behavior,
                route: generate_daily_route(spawn_point, time_of_day),
                personality: generate_personality(spawn_point.seed),
                
                // Weather response
                shelter_seeking: weather.intensity > 0.7
            }
            npcs.append(npc)
    
    return npcs
```

**Route Generation (Daily Behavior):**
```python
def generate_daily_route(npc_spawn, time_of_day):
    route = []
    current_time = time_of_day
    
    # Determine primary location for this time
    if is_morning(current_time):
        primary_location = HOME
    elif is_work_hours(current_time):
        primary_location = WORKPLACE or CAFE
    elif is_evening(current_time):
        primary_location = RESTAURANT or PARK
    else:
        primary_location = HOME or ROOFTOP
    
    # Generate path (A* pathfinding)
    path = pathfind_to_location(npc_spawn.position, primary_location)
    
    // Add waypoints (resting, looking around)
    for segment in path:
        route.append({
            waypoint: segment,
            duration: random(2, 8),
            action: select_idle_action(npc_spawn.type)
        })
    
    return route
```

### 5.2 Content Streaming

**Texture Streaming:**
```python
def stream_textures_for_chunk(chunk, target_lod):
    // Load textures based on LOD level
    
    if target_lod == 0:
        // LOD0: Full detail, 2K textures
        chunk.texture_resolution = 2048
        chunk.mipmap_levels = 4
    elif target_lod == 1:
        // LOD1: Reduced, 1K textures
        chunk.texture_resolution = 1024
        chunk.mipmap_levels = 3
    else:
        // LOD2+: Minimal, 512px
        chunk.texture_resolution = 512
        chunk.mipmap_levels = 2
    
    // Load via GPU async
    for material in chunk.materials:
        material.map = load_texture_async(
            texture_url,
            chunk.texture_resolution
        )
}
```

**Audio Streaming:**
```python
def stream_audio_for_chunk(chunk, active_weather):
    // Ambient layer
    chunk.ambient_audio = load_audio_stream(ambient_category(chunk))
    chunk.ambient_audio.play()
    chunk.ambient_audio.volume = 0.3
    
    // Weather audio (if applicable)
    if active_weather == RAIN:
        chunk.weather_audio = load_audio_stream("rain.ogg")
        chunk.weather_audio.volume = 0.6
    
    // Limit to 3-4 active audio streams per chunk (mixing)
}
```

---

## 6. LOD SYSTEM & CULLING

### 6.1 Frustum Culling

**Algorithm:**
```python
def cull_chunks(camera, all_chunks):
    frustum = extract_frustum_from_camera(camera)
    visible_chunks = []
    
    for chunk in all_chunks:
        // Fast AABB test
        if frustum.intersects_aabb(chunk.bounding_box):
            visible_chunks.append(chunk)
    
    return visible_chunks
```

### 6.2 Occlusion Culling

**Baked Occlusion Meshes:**
```python
def generate_occlusion_mesh(buildings):
    // Simplified collision geometry for buildings
    occlusion_mesh = THREE.Geometry()
    
    for building in buildings:
        // Use bounding box (no window details)
        box_geometry = THREE.BoxGeometry(
            building.width,
            building.height,
            building.depth
        )
        occlusion_mesh.merge(box_geometry, building.position)
    
    return occlusion_mesh
```

### 6.3 LOD Transitions

**Smooth LOD Switching:**
```python
def update_chunk_lod(chunk, distance_from_camera):
    new_lod = select_lod_for_distance(distance_from_camera)
    
    if new_lod != chunk.current_lod:
        // Fade transition (0.5 second)
        chunk.transition_lod(chunk.current_lod, new_lod, duration=0.5)
        chunk.current_lod = new_lod
    
    // Update draw calls based on LOD
    chunk.update_geometry_detail(new_lod)
    chunk.update_texture_resolution(new_lod)
}

function select_lod_for_distance(distance):
    if distance < 500:
        return LOD0  // Full detail
    elif distance < 1000:
        return LOD1  // Reduced geometry
    elif distance < 1500:
        return LOD2  // Billboards
    else:
        return LOD3  // Hidden
}
```

---

## 7. OPTIMIZATION TECHNIQUES

### 7.1 Mesh Batching

**Static Geometry Merging:**
```python
def batch_static_geometry(chunk):
    // Combine multiple small meshes into single draw call
    batches = {}
    
    // Group by material
    for mesh in chunk.static_meshes:
        material_key = mesh.material.id
        if material_key not in batches:
            batches[material_key] = []
        batches[material_key].append(mesh)
    
    // Merge geometries with same material
    for material, meshes in batches.items():
        combined_geometry = merge_geometries(meshes)
        batched_mesh = THREE.Mesh(combined_geometry, material)
        chunk.batched_meshes.append(batched_mesh)
    
    // Result: 1 draw call per material instead of N
}
```

### 7.2 Texture Atlasing

**Building Facade Atlas:**
```python
def create_facade_atlas(building_types, width=2048, height=2048):
    atlas = create_blank_image(width, height)
    uv_map = {}
    
    current_x = 0
    for building_type in building_types:
        // Render facade texture at smaller size
        facade_tex = render_facade(building_type, size=256)
        atlas.blit(facade_tex, (current_x, 0))
        
        // Store UV coordinates
        uv_map[building_type] = {
            u_min: current_x / width,
            u_max: (current_x + 256) / width,
            v_min: 0,
            v_max: 256 / height
        }
        
        current_x += 256
    
    return atlas, uv_map
```

### 7.3 Memory Pooling

**Object Pool Pattern:**
```javascript
class MeshPool {
  constructor(poolSize = 100) {
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(this.createMesh());
    }
    this.active = new Set();
  }
  
  acquire(geometry, material) {
    let mesh;
    if (this.pool.length > 0) {
      mesh = this.pool.pop();
      mesh.geometry = geometry;
      mesh.material = material;
    } else {
      mesh = this.createMesh();
    }
    this.active.add(mesh);
    return mesh;
  }
  
  release(mesh) {
    this.active.delete(mesh);
    this.pool.push(mesh);
    mesh.geometry.dispose();
  }
  
  createMesh() {
    return new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
  }
}
```

---

## 8. PERFORMANCE METRICS & BUDGETS

**Target Performance:**
```
FPS:           60 stable (1000 / 60 ≈ 16.67ms per frame)
Memory:        <500MB peak (texture: 256MB, meshes: 128MB, other: 116MB)
Draw Calls:    <2000 per frame
Triangle Count: <2M per frame (LOD-managed)
Texture Binds:  <50 per frame (atlasing)

Streaming:
- Chunk load time: <500ms (async, non-blocking)
- LOD transition: <0.5s smooth fade
- Audio buffer: 8 concurrent streams max
```

**Profiling Checkpoints:**
```python
def profile_chunk_generation():
    start = time.now()
    
    timing = {
        "noise_generation": measure(generate_noise_layers),
        "street_layout": measure(generate_streets),
        "building_placement": measure(generate_buildings),
        "mesh_creation": measure(generate_meshes),
        "prop_placement": measure(place_props_instanced),
        "npc_spawning": measure(generate_npc_spawns),
        "total": time.now() - start
    }
    
    for step, duration in timing.items():
        log(f"{step}: {duration}ms")
    
    assert timing["total"] < 500, "Chunk generation exceeded budget!"
```

---

## 9. CONTENT STREAMING ARCHITECTURE

### 9.1 Async Loading Pipeline

**Job Queue:**
```javascript
class StreamingQueue {
  constructor(maxConcurrent = 2) {
    this.queue = [];
    this.active = 0;
    this.maxConcurrent = maxConcurrent;
  }
  
  enqueue(chunk) {
    this.queue.push(chunk);
    this.process();
  }
  
  async process() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      this.active++;
      const chunk = this.queue.shift();
      
      await this.generateChunk(chunk);
      this.active--;
      this.process();  // Continue queue
    }
  }
  
  async generateChunk(chunk) {
    return new Promise((resolve) => {
      // Offload to worker thread
      const worker = new Worker('generation-worker.js');
      worker.postMessage({chunk_x: chunk.x, chunk_y: chunk.y});
      worker.onmessage = (e) => {
        chunk.load(e.data);
        resolve();
      };
    });
  }
}
```

### 9.2 Web Worker Integration

**generation-worker.js:**
```javascript
self.onmessage = async (e) => {
  const {chunk_x, chunk_y} = e.data;
  
  // Full generation in worker thread (non-blocking)
  const chunk_data = await generateChunk(chunk_x, chunk_y);
  
  // Send back to main thread
  self.postMessage({
    mesh_data: chunk_data.meshes,
    npc_data: chunk_data.npcs,
    audio_data: chunk_data.audio,
    // Can include ArrayBuffers for zero-copy transfer
  }, [chunk_data.meshes.buffer]);  // Transfer ownership
};
```

---

## APPENDIX: PSEUDOCODE REFERENCE

### Perlin Noise (2D)
```python
def perlin_2d(x, y, scale, octaves, persistence, lacunarity, seed):
    value = 0
    amplitude = 1
    frequency = 1
    max_value = 0
    
    for i in range(octaves):
        value += amplitude * perlin_gradient(
            x * frequency / scale,
            y * frequency / scale,
            seed + i
        )
        max_value += amplitude
        amplitude *= persistence
        frequency *= lacunarity
    
    return value / max_value  // Normalize to [-1, 1]
```

### Hash Function (Seeding)
```python
def hash_combine(a, b, seed):
    // Simple but effective combine
    x = seed ^ (a + 0x9e3779b9 + (x << 6) + (x >> 2))
    x = x ^ (b + 0x9e3779b9 + (x << 6) + (x >> 2))
    return x
```

### Pathfinding (A* Simplified)
```python
def pathfind(start, goal, obstacles):
    open_set = PriorityQueue()
    open_set.add(start, 0)
    came_from = {}
    g_score = {start: 0}
    
    while not open_set.empty():
        current = open_set.pop()
        
        if current == goal:
            return reconstruct_path(came_from, current)
        
        for neighbor in get_neighbors(current):
            if neighbor in obstacles:
                continue
            
            tentative_g = g_score[current] + distance(current, neighbor)
            
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, goal)
                open_set.add(neighbor, f_score)
                came_from[neighbor] = current
    
    return []  // No path found
```

---

**STATUS:** Complete specification  
**Next Phase:** Implementation in ThreeJS + Web Worker integration  
**Test Target:** 60 FPS on RPi 5 with <500MB memory
