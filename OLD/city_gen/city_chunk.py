"""
Procedural City Chunk Generation for Cat City FPS

Generates city chunks with buildings, streets, and pathways using
procedural algorithms. Each chunk is a self-contained area that can
be loaded into the game world.
"""

import random
import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict

@dataclass
class Building:
    """Represents a building in the city chunk."""
    x: float
    y: float
    z: float
    width: float
    depth: float
    height: float
    floors: int
    windows: List[Tuple[float, float]] = field(default_factory=list)
    has_door: bool = True
    door_position: Tuple[float, float] = (0.5, 0.0)
    roof_type: str = "flat"  # flat, pitched, dome

    def get_entrance(self) -> Tuple[float, float, float]:
        """Get the entrance position for the building."""
        if self.has_door:
            return (self.x + self.door_position[0] * self.width,
                    self.y + self.door_position[1] * self.depth,
                    self.z)
        # Find nearest window
        min_dist = float('inf')
        best = None
        for win in self.windows:
            d = math.sqrt((win[0] - 0.5)**2 + (win[1] - 0.5)**2)
            if d < min_dist:
                min_dist = d
                best = win
        if best is None:
            return (self.x + 0.5 * self.width,
                    self.y + 0.5 * self.depth,
                    self.z)
        return (self.x + best[0] * self.width,
                self.y + best[1] * self.depth,
                self.z)

class CityChunk:
    """A procedural city chunk with buildings, streets, and pathways."""
    
    CHUNK_SIZE = 64  # meters
    
    def __init__(self, chunk_id: int, x_offset: int, y_offset: int):
        self.chunk_id = chunk_id
        self.x_offset = x_offset
        self.y_offset = y_offset
        self.buildings: List[Building] = []
        self.streets: List[Dict] = []
        self.pathways: List[Dict] = []
        
    def generate(self, seed: Optional[int] = None):
        """Generate procedural city content for this chunk."""
        if seed is not None:
            random.seed(seed + chunk_id)
        
        # Generate streets forming a grid with irregular spacing
        self._generate_streets()
        
        # Place buildings in available spaces
        self._place_buildings()
        
        # Generate pathways (pedestrian paths)
        self._generate_pathways()
        
        # Add some random urban features
        self._add_urban_features()
    
    def _generate_streets(self):
        """Generate street network with irregular grid pattern."""
        # Create a base grid with random spacing
        street_spacing = random.uniform(25, 40)
        
        # Generate perpendicular street lines
        for offset in range(-3, 4):
            x_line = self.x_offset + offset * street_spacing
            y_line = self.y_offset + offset * street_spacing
            
            # Create street segment
            self.streets.append({
                'type': 'street',
                'x': x_line,
                'y': y_line,
                'width': random.uniform(6, 12),
                'depth': self.CHUNK_SIZE,
                'surface': 'asphalt',
                'lanes': random.randint(1, 2),
                'sidewalks': True
            })
    
    def _place_buildings(self):
        """Place buildings in available spaces between streets."""
        # Grid for placing buildings
        cell_size = 20  # meters
        
        for gx in range(-3, 4):
            for gy in range(-3, 4):
                x = self.x_offset + gx * cell_size
                y = self.y_offset + gy * cell_size
                
                # Check if this position is available (not on a street)
                is_available = True
                for street in self.streets:
                    if abs(x - street['x']) < street['width']/2:
                        is_available = False
                        break
                    if abs(y - street['y']) < street['width']/2:
                        is_available = False
                        break
                
                if is_available and random.random() < 0.85:
                    # Place a building
                    building_type = random.choice(['residential', 'commercial', 'industrial', 'public', 'mixed'])
                    
                    # Building dimensions based on type
                    if building_type == 'residential':
                        width = random.uniform(15, 25)
                        depth = random.uniform(15, 30)
                        height = random.uniform(12, 20)
                        floors = random.randint(3, 6)
                    elif building_type == 'commercial':
                        width = random.uniform(20, 35)
                        depth = random.uniform(20, 35)
                        height = random.uniform(15, 25)
                        floors = random.randint(2, 4)
                    elif building_type == 'industrial':
                        width = random.uniform(30, 50)
                        depth = random.uniform(30, 50)
                        height = random.uniform(8, 15)
                        floors = random.randint(1, 2)
                    elif building_type == 'public':
                        width = random.uniform(25, 40)
                        depth = random.uniform(25, 40)
                        height = random.uniform(15, 30)
                        floors = random.randint(2, 5)
                    else:
                        width = random.uniform(20, 35)
                        depth = random.uniform(20, 35)
                        height = random.uniform(15, 25)
                        floors = random.randint(2, 4)
                    
                    # Add windows
                    windows = []
                    num_windows = int((width * depth) / 20)  # windows per area
                    for _ in range(num_windows):
                        wx = random.uniform(0.1, 0.9)
                        wy = random.uniform(0.1, 0.9)
                        windows.append((wx, wy))
                    
                    # Add door for most buildings
                    has_door = building_type in ['residential', 'commercial', 'public']
                    
                    building = Building(
                        x=self.x_offset + x,
                        y=self.y_offset + y,
                        z=0,
                        width=width,
                        depth=depth,
                        height=height,
                        floors=floors,
                        windows=windows,
                        has_door=has_door,
                        roof_type=random.choice(['flat', 'pitched', 'flat', 'flat'])
                    )
                    self.buildings.append(building)
    
    def _generate_pathways(self):
        """Generate pedestrian pathways through the chunk."""
        # Create random pathways that connect buildings
        num_pathways = random.randint(3, 8)
        
        for _ in range(num_pathways):
            # Find two nearby buildings
            b1 = random.choice(self.buildings)
            b2 = random.choice(self.buildings)
            
            # Create pathway
            self.pathways.append({
                'type': 'pathway',
                'start': (b1.x + b1.width/2, b1.y + b1.depth/2, b1.z),
                'end': (b2.x + b2.width/2, b2.y + b2.depth/2, b2.z),
                'width': random.uniform(2, 4),
                'surface': random.choice(['paved', 'gravel', 'grass', 'mixed']),
                'connects': [b1, b2]
            })
    
    def _add_urban_features(self):
        """Add random urban features to the chunk."""
        features = []
        
        # Add street lamps
        lamp_count = random.randint(10, 20)
        for _ in range(lamp_count):
            x = random.uniform(0, self.CHUNK_SIZE)
            y = random.uniform(0, self.CHUNK_SIZE)
            features.append({
                'type': 'street_lamp',
                'position': (x, y, 1.5),
                'height': random.uniform(4, 6),
                'active': True
            })
        
        # Add benches
        bench_count = random.randint(3, 8)
        for _ in range(bench_count):
            x = random.uniform(0, self.CHUNK_SIZE)
            y = random.uniform(0, self.CHUNK_SIZE)
            features.append({
                'type': 'bench',
                'position': (x, y, 0.5),
                'facing': random.uniform(0, 360)
            })
        
        # Add trees
        tree_count = random.randint(5, 15)
        for _ in range(tree_count):
            x = random.uniform(0, self.CHUNK_SIZE)
            y = random.uniform(0, self.CHUNK_SIZE)
            features.append({
                'type': 'tree',
                'position': (x, y, 0),
                'height': random.uniform(3, 8),
                'species': random.choice(['oak', 'pine', 'maple', 'birch'])
            })
        
        # Add benches and benches
        bench_count = random.randint(3, 8)
        for _ in range(bench_count):
            x = random.uniform(0, self.CHUNK_SIZE)
            y = random.uniform(0, self.CHUNK_SIZE)
            features.append({
                'type': 'bench',
                'position': (x, y, 0.5),
                'facing': random.uniform(0, 360)
            })
        
        self.urban_features = features
    
    def to_dict(self) -> Dict:
        """Convert chunk to dictionary for serialization."""
        return {
            'chunk_id': self.chunk_id,
            'x_offset': self.x_offset,
            'y_offset': self.y_offset,
            'buildings': [
                {
                    'x': b.x, 'y': b.y, 'z': b.z,
                    'width': b.width, 'depth': b.depth, 'height': b.height,
                    'floors': b.floors,
                    'windows': b.windows,
                    'has_door': b.has_door,
                    'door_position': b.door_position,
                    'roof_type': b.roof_type
                }
                for b in self.buildings
            ],
            'streets': self.streets,
            'pathways': self.pathways,
            'features': self.urban_features
        }

def generate_city_chunk(chunk_id: int, x_offset: int, y_offset: int,
                        seed: Optional[int] = None) -> CityChunk:
    """Generate a procedural city chunk."""
    chunk = CityChunk(chunk_id, x_offset, y_offset)
    chunk.generate(seed=seed)
    return chunk

def generate_city_chunk_from_dict(data: Dict) -> CityChunk:
    """Reconstruct a city chunk from serialized data."""
    chunk = CityChunk(
        chunk_id=data['chunk_id'],
        x_offset=data['x_offset'],
        y_offset=data['y_offset']
    )
    chunk.buildings = [
        Building(
            x=b['x'], y=b['y'], z=b['z'],
            width=b['width'], depth=b['depth'], height=b['height'],
            floors=b['floors'], windows=b['windows'],
            has_door=b['has_door'], door_position=b['door_position'],
            roof_type=b['roof_type']
        )
        for b in data['buildings']
    ]
    chunk.streets = data['streets']
    chunk.pathways = data['pathways']
    chunk.urban_features = data.get('features', [])
    return chunk
