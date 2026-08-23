# Cat City Asset Loading & Streaming System

## Overview

A production-ready asset loading and streaming system for the Cat City game, designed for efficient memory management, smooth performance, and extensibility.

## Two-Component Architecture

### 1. AssetManager.js
Centralized asset loading and caching system.

**Features:**
- Load models (GLTF/GLB), textures, audio files
- Automatic mipmap generation for textures
- Texture atlasing to optimize rendering
- Geometry merging for static object batching
- Memory pooling for frequently-used objects
- LRU cache with automatic eviction
- Retry logic for network failures
- Fallback assets for missing resources

**Quick Start:**
```javascript
const assetManager = new AssetManager();

// Load single asset
const model = await assetManager.loadModel('/assets/building.glb');
const texture = await assetManager.loadTexture('/assets/wall.png');
const audio = await assetManager.loadAudio('/assets/ambient.mp3');

// Load multiple assets in parallel
const assets = await assetManager.loadAssetsParallel([
  { name: 'tree', type: 'model', url: '/assets/tree.glb' },
  { name: 'leaves', type: 'texture', url: '/assets/leaves.png' },
]);

// Monitor cache
const stats = assetManager.getCacheStats();
// { modelsCached: 5, texturesCached: 12, memoryUsedMB: "234.56", ... }
```

### 2. StreamingManager.js
Dynamic spatial streaming of world chunks based on player proximity.

**Features:**
- Grid-based chunking of the world
- Load/unload chunks based on player distance
- Priority queue for intelligent loading order
- Smooth fade transitions for loaded/unloaded chunks
- Memory and performance statistics
- Configurable chunk size and load radius

**Quick Start:**
```javascript
const streamingManager = new StreamingManager(scene, assetManager);
streamingManager.start();

// Update player position (in game loop)
streamingManager.setPlayerPosition(playerX, playerY);

// Monitor performance
const stats = streamingManager.getStats();
// { chunksLoaded: 8, chunksLoading: 2, chunksQueued: 3, ... }
```

## Configuration

### AssetManager Options
```javascript
const assetManager = new AssetManager({
  enableMipmapping: true,          // Generate mipmaps for textures
  enableCompression: true,          // Use KTX2 compression
  enableTextureAtlasing: true,      // Merge textures into atlas
  enableGeometryMerging: true,      // Merge static geometries
  maxRetries: 3,                    // Retry failed loads
  retryDelay: 1000,                 // ms between retries
});
```

### StreamingManager Options
```javascript
const streamingManager = new StreamingManager(scene, assetManager, {
  CHUNK_SIZE: 100,                  // World units per chunk
  LOAD_RADIUS: 3,                   // Chunks to load around player
  UNLOAD_RADIUS: 5,                 // Chunks to unload beyond
  MAX_CONCURRENT_LOADS: 4,          // Parallel chunk loads
  FADE_IN_DURATION: 500,            // ms to fade in
  FADE_OUT_DURATION: 500,           // ms to fade out
  UPDATE_FREQUENCY: 100,            // ms between updates
});
```

## Advanced Usage

### Custom Asset Types
Extend AssetManager for custom formats:

```javascript
class MyAssetManager extends AssetManager {
  async loadCustomFormat(url) {
    // Custom loading logic
    const data = await fetch(url).then(r => r.json());
    return this._parseCustomFormat(data);
  }
}
```

### Chunk Preloading
Preload chunks along predicted player path:

```javascript
// Preload ahead of player direction
await streamingManager.preloadChunk(playerGridX + 2, playerGridY);
```

### Memory Management
Monitor and optimize memory usage:

```javascript
// Get detailed memory breakdown
const memory = streamingManager.getMemoryUsage();
// { memoryMB: "156.34", vertices: 1250000, chunks: 12, ... }

// Manually prune cache when needed
assetManager.pruneCache(512); // Keep under 512MB

// Dispose specific assets
assetManager.disposeAsset('model:/assets/building.glb');
```

### Error Handling
Built-in fallback system for missing assets:

```javascript
// Failed loads automatically return fallback geometry
const model = await assetManager.loadModel('/missing.glb');
console.log(model.userData.isFallback); // true

// Retry logic handles transient network errors
// Max retries configured in options, with exponential backoff
```

## Performance Optimization

### Cache Management
- Enable texture atlasing to reduce draw calls
- Enable geometry merging for static objects
- Use memory pooling for Vector3/Quaternion objects
- Implement LRU cache eviction strategy

### Streaming Optimization
- Adjust CHUNK_SIZE based on memory budget
- Set LOAD_RADIUS to balance memory vs visibility
- Use preloadChunk() for critical areas
- Monitor stats with getStats() periodically

### Texture Optimization
- Use KTX2 compression for smaller file sizes
- Enable mipmapping for distant LOD
- Implement texture atlasing
- Keep dimensions within power-of-2 sizes when possible

### Geometry Optimization
- Enable geometry merging for static assets
- Use LOD (Level of Detail) for complex models
- Pool frequently created objects
- Merge meshes with shared materials

## Statistics & Monitoring

### Asset Cache Stats
```javascript
const stats = assetManager.getCacheStats();
// {
//   itemsLoaded: 45,
//   itemsFailed: 2,
//   memoryUsedMB: "234.56",
//   modelsCached: 5,
//   texturesCached: 12,
//   audiosCached: 8,
//   vectorPoolStats: { available: 18, inUse: 2, total: 20 },
// }
```

### Streaming Stats
```javascript
const stats = streamingManager.getStats();
// {
//   chunksLoaded: 9,
//   chunksLoading: 2,
//   chunksQueued: 4,
//   totalVertices: 2500000,
//   totalTriangles: 850000,
//   totalMemory: 156000000,
//   updateCount: 1234,
//   queue: { queued: 4, inProgress: 2, completed: 125 },
// }
```

## Troubleshooting

### Chunks Not Loading
- Check console for error messages
- Verify asset URLs are correct
- Check that chunk assets exist at expected paths
- Increase MAX_CONCURRENT_LOADS if queue is backed up

### Memory Growing
- Call assetManager.pruneCache() periodically
- Monitor texture sizes - prefer smaller resolutions
- Check for texture memory leaks in console
- Reduce LOAD_RADIUS to lower active chunk count

### Slow Performance
- Reduce CHUNK_SIZE for faster loading
- Enable geometry merging and texture atlasing
- Use KTX2 compressed textures
- Monitor frame rate with performance profiler

### Asset Fallbacks Appearing
- Check asset URLs in console output
- Verify files exist on server
- Check network tab in DevTools for failed requests
- Implement custom loader for non-standard formats

## Architecture Decisions

### Why Grid-Based Chunks?
- O(1) lookup for visibility determination
- Simple player proximity calculation
- Easy to implement distance-based priority
- Natural fit for spatial data structures

### Why Priority Queue?
- Nearest chunks load first for smooth experience
- Prevents distant content blocking critical loads
- Intelligent memory budget allocation

### Why Object Pooling?
- Reduces garbage collection pressure
- Faster object creation for frequently-used types
- Predictable memory footprint

### Why Texture Atlasing?
- Reduces draw calls significantly
- Better texture cache utilization
- Enables instancing for identical objects

## Future Enhancements

- Implement Level-of-Detail (LOD) system
- Add terrain heightmap support
- Streaming audio (positional sound)
- Procedural chunk generation
- Compressed asset bundles
- Worker thread streaming
- Physics world synchronization

## File Structure

```
~/Documents/Hermes-Jetson/Cat_Walk/
├── AssetManager.js           # Core asset loading system
├── StreamingManager.js        # Spatial chunk streaming
├── ARCHITECTURE.js            # Detailed architecture examples
└── USAGE.md                   # This file
```

## Integration Checklist

- [ ] Import AssetManager and StreamingManager
- [ ] Create instances with appropriate options
- [ ] Call streamingManager.start() on scene init
- [ ] Update player position in game loop
- [ ] Monitor stats with getStats() periodically
- [ ] Implement custom chunk asset loading
- [ ] Test with actual asset pipeline
- [ ] Profile memory and performance
- [ ] Tune configuration for target hardware

---

**Status:** Production Ready  
**Last Updated:** 2025-07-10  
**Version:** 1.0.0
