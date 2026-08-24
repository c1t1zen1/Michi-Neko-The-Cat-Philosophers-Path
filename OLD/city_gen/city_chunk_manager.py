"""
City Chunk Manager for Cat City FPS

Manages loading, generation, and streaming of city chunks.
"""

import json
import os
import math
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from city_chunk import CityChunk, generate_city_chunk, generate_city_chunk_from_dict

@dataclass
class ChunkData:
    """Serialized chunk data."""
    data: dict
    seed: int = 0
    last_loaded: float = 0.0

class CityChunkManager:
    """
    Manages city chunks for the FPS game.
    
    Features:
    - Generate procedural city chunks
    - Load chunks from disk
    - Save chunks to disk
    - Pre-generate city chunks for faster loading
    """
    
    CHUNK_SIZE = 64  # meters
    CHUNK_SIZE_HALF = CHUNK_SIZE / 2
    CHUNK_FILENAME = "chunk_{x}_{y}.json"
    CACHE_DIR = "cache/city_chunks"
    
    def __init__(self, cache_dir: str = None):
        if cache_dir is None:
            cache_dir = os.path.join(os.path.dirname(__file__), self.CACHE_DIR)
        self.cache_dir = cache_dir
        self.chunks: Dict[Tuple[int, int], CityChunk] = {}
        self.chunk_data: Dict[Tuple[int, int], ChunkData] = {}
        self.generate_cache: Dict[int, CityChunk] = {}
        self.chunk_bounds: Dict[Tuple[int, int], List[Tuple]] = {}
        
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_chunk_key(self, x_offset: int, y_offset: int) -> Tuple[int, int]:
        """Get unique key for a chunk."""
        return (x_offset, y_offset)
    
    def _get_chunk_filename(self, x_offset: int, y_offset: int) -> str:
        """Get filename for a chunk."""
        return self.CHUNK_FILENAME.format(x=x_offset, y=y_offset)
    
    def generate_chunk(self, x_offset: int, y_offset: int, 
                       seed: int = 0) -> CityChunk:
        """Generate a new city chunk."""
        # Check cache first
        cache_key = hash((x_offset, y_offset, seed))
        if cache_key in self.generate_cache:
            chunk = self.generate_cache[cache_key]
            # Copy the chunk to avoid mutation issues
            new_chunk = CityChunk.__new__(CityChunk)
            new_chunk.chunk_id = chunk.chunk_id
            new_chunk.x_offset = chunk.x_offset
            new_chunk.y_offset = chunk.y_offset
            new_chunk.buildings = list(chunk.buildings)
            new_chunk.streets = list(chunk.streets)
            new_chunk.pathways = list(chunk.pathways)
            new_chunk.urban_features = list(chunk.urban_features) if chunk.urban_features else []
            return new_chunk
        
        # Generate new chunk
        chunk = CityChunk(x_offset, y_offset, seed)
        chunk.generate(seed=seed)
        
        # Cache it
        self.generate_cache[cache_key] = chunk
        return chunk
    
    def load_chunk(self, x_offset: int, y_offset: int, 
                   seed: int = 0, generate_if_missing: bool = True) -> CityChunk:
        """
        Load a chunk from disk or generate it if not found.
        
        Args:
            x_offset: Chunk x coordinate offset
            y_offset: Chunk y coordinate offset
            seed: Seed for procedural generation
            generate_if_missing: If True, generate chunk if not found on disk
        
        Returns:
            CityChunk object
        """
        key = self._get_chunk_key(x_offset, y_offset)
        
        # Check if already loaded
        if key in self.chunks:
            return self.chunks[key]
        
        # Check cache first (fast path)
        cache_key = hash((x_offset, y_offset, seed))
        if cache_key in self.generate_cache:
            chunk = self.generate_cache[cache_key]
            new_chunk = CityChunk.__new__(CityChunk)
            new_chunk.chunk_id = chunk.chunk_id
            new_chunk.x_offset = chunk.x_offset
            new_chunk.y_offset = chunk.y_offset
            new_chunk.buildings = list(chunk.buildings)
            new_chunk.streets = list(chunk.streets)
            new_chunk.pathways = list(chunk.pathways)
            new_chunk.urban_features = list(chunk.urban_features) if chunk.urban_features else []
            
            self.chunks[key] = new_chunk
            self.chunk_data[key] = ChunkData(data={}, seed=seed, last_loaded=0.0)
            return new_chunk
        
        # Check disk
        filename = self._get_chunk_filename(x_offset, y_offset)
        filepath = os.path.join(self.cache_dir, filename)
        
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            chunk = generate_city_chunk_from_dict(data)
            chunk.seed = seed
            chunk.last_loaded = 0.0
            self.chunks[key] = chunk
            self.chunk_data[key] = ChunkData(data=data, seed=seed, last_loaded=0.0)
            return chunk
        
        # Generate if requested
        if generate_if_missing:
            chunk = self.generate_chunk(x_offset, y_offset, seed)
            self.save_chunk(chunk, seed)
            return chunk
        
        # Return empty chunk as placeholder
        chunk = CityChunk(x_offset, y_offset)
        chunk.generate(seed=seed)
        return chunk
    
    def save_chunk(self, chunk: CityChunk, seed: int = 0):
        """Save a chunk to disk."""
        key = self._get_chunk_key(chunk.x_offset, chunk.y_offset)
        
        data = chunk.to_dict()
        self.chunk_data[key] = ChunkData(data=data, seed=seed, last_loaded=0.0)
        
        filename = self._get_chunk_filename(chunk.x_offset, chunk.y_offset)
        filepath = os.path.join(self.cache_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    def save_all_chunks(self):
        """Save all loaded chunks to disk."""
        for key, chunk in self.chunks.items():
            seed = self.chunk_data.get(key, ChunkData()).seed
            self.save_chunk(chunk, seed)
    
    def get_chunk_bounds(self, x_offset: int, y_offset: int) -> List[Tuple]:
        """Get the bounding box of a chunk."""
        if (x_offset, y_offset) in self.chunk_bounds:
            return self.chunk_bounds[(x_offset, y_offset)]
        
        bounds = [
            (self.CHUNK_SIZE_HALF + x_offset * self.CHUNK_SIZE,
             self.CHUNK_SIZE_HALF + y_offset * self.CHUNK_SIZE,
             0),
            (-self.CHUNK_SIZE_HALF + (x_offset + 1) * self.CHUNK_SIZE,
             self.CHUNK_SIZE_HALF + y_offset * self.CHUNK_SIZE,
             0),
            (self.CHUNK_SIZE_HALF + x_offset * self.CHUNK_SIZE,
             -self.CHUNK_SIZE_HALF + (y_offset + 1) * self.CHUNK_SIZE,
             0),
            (-self.CHUNK_SIZE_HALF + (x_offset + 1) * self.CHUNK_SIZE,
             -self.CHUNK_SIZE_HALF + (y_offset + 1) * self.CHUNK_SIZE,
             0)
        ]
        
        self.chunk_bounds[(x_offset, y_offset)] = bounds
        return bounds
    
    def is_chunk_visible(self, player_x: float, player_y: float,
                         player_z: float, fov: float = 45.0,
                         distance: float = 100.0) -> bool:
        """
        Check if a chunk is visible from the player's position.
        
        Uses frustum culling based on FOV and distance.
        """
        # Calculate distance to chunk center
        cx = self.CHUNK_SIZE_HALF + player_x * self.CHUNK_SIZE
        cy = self.CHUNK_SIZE_HALF + player_y * self.CHUNK_SIZE
        
        distance_to_chunk = math.sqrt((player_x - cx)**2 + (player_y - cy)**2)
        
        if distance_to_chunk > distance:
            return False
        
        # Simple frustum culling
        fov_rad = math.radians(fov)
        half_fov = fov_rad / 2
        
        # Check if chunk is within horizontal FOV
        angle = math.atan2(player_y - cy, player_x - cx)
        if abs(angle) > half_fov:
            return False
        
        return True
    
    def get_chunks_at_position(self, player_x: float, player_y: float,
                                player_z: float) -> List[CityChunk]:
        """
        Get all chunks that might be visible from player position.
        
        Returns chunks that are within a radius of twice the viewing distance.
        """
        visible_chunks = []
        
        # Calculate viewing radius
        radius = 200.0  # meters
        
        # Iterate over a region of chunks
        chunk_range = int(radius // self.CHUNK_SIZE) + 2
        
        for dx in range(-chunk_range, chunk_range):
            for dy in range(-chunk_range, chunk_range):
                # Check if chunk is visible
                if self.is_chunk_visible(player_x, player_y, player_z, distance=radius):
                    chunk = self.load_chunk(dx, dy)
                    visible_chunks.append(chunk)
        
        return visible_chunks
    
    def get_chunks_in_frustum(self, player_x: float, player_y: float,
                               player_z: float, fov: float = 45.0,
                               distance: float = 100.0) -> List[CityChunk]:
        """
        Get chunks within the player's viewing frustum.
        More precise culling than get_chunks_at_position.
        """
        visible_chunks = []
        fov_rad = math.radians(fov)
        half_fov = fov_rad / 2
        
        # Calculate viewing radius
        viewing_radius = distance * math.tan(half_fov)
        
        # Determine chunk range
        chunk_range = int(viewing_radius // self.CHUNK_SIZE) + 2
        
        for dx in range(-chunk_range, chunk_range):
            for dy in range(-chunk_range, chunk_range):
                cx = self.CHUNK_SIZE_HALF + dx * self.CHUNK_SIZE
                cy = self.CHUNK_SIZE_HALF + dy * self.CHUNK_SIZE
                
                # Calculate angle to chunk center
                dx_to_chunk = player_x - cx
                dy_to_chunk = player_y - cy
                
                # Check if within angular bounds
                if abs(math.atan2(dy_to_chunk, dx_to_chunk)) <= half_fov:
                    # Check distance
                    distance_to_chunk = math.sqrt(dx_to_chunk**2 + dy_to_chunk**2)
                    if distance_to_chunk <= distance:
                        chunk = self.load_chunk(dx, dy)
                        visible_chunks.append(chunk)
        
        return visible_chunks
    
    def clear_unloaded_chunks(self, threshold: float = 0.8,
                              player_x: float = 0.0, player_y: float = 0.0,
                              player_z: float = 0.0):
        """
        Clear chunks that are not visible to free memory.
        
        Args:
            threshold: Fraction of chunks to keep (0.0 = clear all, 1.0 = keep all)
            player_x, player_y, player_z: Player position for visibility check
        """
        visible_chunks = self.get_chunks_in_frustum(
            player_x=player_x, player_y=player_y, player_z=player_z
        )
        
        chunks_to_clear = set(self.chunks.keys()) - set([
            (c.x_offset, c.y_offset) for c in visible_chunks
        ])
        
        for key in chunks_to_clear:
            self.chunks.pop(key, None)
            self.chunk_data.pop(key, None)
    
    def get_chunk_count(self) -> int:
        """Get the number of loaded chunks."""
        return len(self.chunks)
    
    def get_chunk_count_on_disk(self) -> int:
        """Get the number of chunks stored on disk."""
        if not os.path.exists(self.cache_dir):
            return 0
        return len([f for f in os.listdir(self.cache_dir) if f.startswith(self.CHUNK_FILENAME)])
