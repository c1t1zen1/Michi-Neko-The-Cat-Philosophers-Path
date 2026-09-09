/**
 * ARCHITECTURE AND USAGE EXAMPLES
 * Cat City Asset Loading and Streaming System
 * 
 * This file documents the complete system design, architecture, and usage patterns.
 */

import { AssetManager, ObjectPool, TextureAtlas, GeometryMerger } from './AssetManager.js';
import { StreamingManager, Chunk } from './StreamingManager.js';

/**
 * ============================================================================
 * ARCHITECTURE OVERVIEW
 * ============================================================================
 * 
 * The system is designed around two core components:
 * 
 * 1. ASSET MANAGER (AssetManager.js)
 *    - Centralized asset loading and caching
 *    - Supports: Models (GLTF/GLB), Textures, Audio, Materials
 *    - Features: Memory pooling, texture atlasing, geometry merging
 *    - Error handling: Retries, fallbacks, corruption detection
 *    - Async/await patterns for non-blocking operations
 * 
 * 2. STREAMING MANAGER (StreamingManager.js)
 *    - Spatial chunking of world (grid-based)
 *    - Dynamic loading/unloading based on player proximity
 *    - Priority queue for intelligent load ordering
 *    - Smooth fade transitions for loaded/unloaded chunks
 *    - Memory and performance monitoring
 * 
 * DESIGN PATTERNS:
 * 
 * - Object Pool Pattern: Reuses frequently created objects (Vector3, Quaternion)
 * - LRU Cache Pattern: Least-recently-used assets are evicted when cache full
 * - Priority Queue Pattern: Chunks nearest to player load first
 * - Lazy Loading Pattern: Assets loaded only when needed
 * - Spatial Partitioning: World divided into chunks for efficient streaming
 * 
 * EXTENSIBILITY:
 * 
 * - Asset types easily extended in AssetManager._loadAssetByType()
 * - Chunk content defined by _getChunkAssets() (data-driven in production)
 * - Custom loading strategies via options parameter in constructors
 * - Plugin system ready for additional loaders (KTX2, Basis, etc.)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 
 * - Texture mipmapping for distance LOD
 * - Texture atlasing to reduce draw calls
 * - Geometry merging to batch static meshes
 * - Memory pooling to reduce garbage collection pressure
 * - Async loading to prevent frame rate drops
 * - Chunk preloading based on player trajectory
 * 
 * ============================================================================
 * QUICK START EXAMPLE
 * ============================================================================
 */

async function exampleQuickStart(scene) {
  console.log('\n=== QUICK START EXAMPLE ===\n');

  // 1. Create asset manager
  const assetManager = new AssetManager({
    onProgress: (progress) => {
      console.log(`Loading: ${(progress * 100).toFixed(0)}%`);
    },
  });

  // 2. Create streaming manager
  const streamingManager = new StreamingManager(scene, assetManager, {
    CHUNK_SIZE: 100,
    LOAD_RADIUS: 3,
    onChunkLoad: (chunk) => {
      console.log(`✓ Chunk loaded: (${chunk.gridX}, ${chunk.gridY})`);
    },
    onChunkUnload: (chunk) => {
      console.log(`✓ Chunk unloaded: (${chunk.gridX}, ${chunk.gridY})`);
    },
  });

  // 3. Start streaming
  streamingManager.start();

  // 4. Update player position (typically in game loop)
  const playerX = 50;
  const playerY = 75;
  streamingManager.setPlayerPosition(playerX, playerY);

  // 5. Monitor stats
  setInterval(() => {
    const stats = streamingManager.getStats();
    console.log(`Chunks: ${stats.chunksLoaded}L/${stats.chunksLoading}L/${stats.chunksQueued}Q`, 
                `Vertices: ${stats.totalVertices}, Memory: ${stats.totalMemory / 1024 / 1024}MB`);
  }, 2000);

  return { assetManager, streamingManager };
}

/**
 * ============================================================================
 * ASSET MANAGER USAGE EXAMPLES
 * ============================================================================
 */

async function exampleAssetManagerCore() {
  console.log('\n=== ASSET MANAGER: CORE OPERATIONS ===\n');

  const assetManager = new AssetManager({
    enableMipmapping: true,
    enableCompression: true,
    enableTextureAtlasing: true,
    enableGeometryMerging: true,
  });

  // Load single model
  console.log('Loading single model...');
  const model = await assetManager.loadModel('/assets/buildings/office.glb');
  console.log(`✓ Model loaded, bounds:`, model.userData);

  // Load texture with options
  console.log('Loading texture with mipmaps...');
  const texture = await assetManager.loadTexture('/assets/textures/brick.png', {
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearMipmapLinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
  });
  console.log(`✓ Texture loaded, size: ${texture.image.width}x${texture.image.height}`);

  // Load audio
  console.log('Loading audio...');
  const audioBuffer = await assetManager.loadAudio('/assets/audio/ambient.mp3');
  console.log(`✓ Audio loaded, duration: ${audioBuffer.duration.toFixed(1)}s`);

  // Create material
  const material = assetManager.createMaterial('wood_material', {
    color: 0x8B4513,
    metalness: 0.1,
    roughness: 0.8,
  });
  console.log('✓ Material created');

  // Get cache statistics
  const stats = assetManager.getCacheStats();
  console.log('Cache Statistics:', {
    models: stats.modelsCached,
    textures: stats.texturesCached,
    audio: stats.audiosCached,
    memoryMB: stats.memoryUsedMB,
  });

  return assetManager;
}

async function exampleAssetManagerParallel() {
  console.log('\n=== ASSET MANAGER: PARALLEL LOADING ===\n');

  const assetManager = new AssetManager();

  // Define multiple assets to load in parallel
  const assetList = [
    { name: 'terrain', type: 'model', url: '/assets/terrain.glb' },
    { name: 'buildings', type: 'model', url: '/assets/buildings.glb' },
    { name: 'props', type: 'model', url: '/assets/props.glb' },
    { name: 'grass_texture', type: 'texture', url: '/assets/grass.png' },
    { name: 'stone_texture', type: 'texture', url: '/assets/stone.png' },
    { name: 'ambient_audio', type: 'audio', url: '/assets/ambient.mp3' },
  ];

  console.log(`Loading ${assetList.length} assets in parallel...`);

  const results = await assetManager.loadAssetsParallel(assetList, {
    maxConcurrent: 4,
    onItemLoaded: ({ completed, total }) => {
      const progress = ((completed / total) * 100).toFixed(0);
      console.log(`Progress: ${completed}/${total} (${progress}%)`);
    },
  });

  console.log('All assets loaded:', Object.keys(results).join(', '));
  return results;
}

async function exampleAssetManagerCaching() {
  console.log('\n=== ASSET MANAGER: CACHING STRATEGIES ===\n');

  const assetManager = new AssetManager();

  // Load same asset multiple times - should use cache
  console.log('Loading asset first time...');
  const model1 = await assetManager.loadModel('/assets/tree.glb');
  
  console.log('Loading same asset second time (from cache)...');
  const model2 = await assetManager.loadModel('/assets/tree.glb');
  
  console.log(`Same object reference: ${model1 === model2}`);

  // Manual cache disposal
  console.log('Disposing cached asset...');
  assetManager.disposeAsset('model:/assets/tree.glb');
  
  // Next load will fetch fresh copy
  console.log('Loading after disposal...');
  const model3 = await assetManager.loadModel('/assets/tree.glb');

  // Prune cache to manage memory
  console.log('Pruning cache (LRU strategy)...');
  assetManager.pruneCache(256); // Keep under 256MB

  console.log('Cache stats:', assetManager.getCacheStats());
}

async function exampleErrorHandling() {
  console.log('\n=== ERROR HANDLING & FALLBACKS ===\n');

  const assetManager = new AssetManager({
    maxRetries: 3,
    retryDelay: 1000,
  });

  // Load non-existent asset (will use fallback)
  console.log('Attempting to load missing asset...');
  const model = await assetManager.loadModel('/assets/nonexistent.glb');
  console.log('Received fallback model:', model.userData.isFallback);

  // Load corrupt texture (will use fallback)
  console.log('Attempting to load corrupt texture...');
  const texture = await assetManager.loadTexture('/assets/corrupt.png');
  console.log('Received fallback texture:', texture.userData.isFallback);
}

/**
 * ============================================================================
 * STREAMING MANAGER USAGE EXAMPLES
 * ============================================================================
 */

async function exampleStreamingManagerBasic(scene) {
  console.log('\n=== STREAMING MANAGER: BASIC SETUP ===\n');

  const assetManager = new AssetManager();
  const streamingManager = new StreamingManager(scene, assetManager, {
    CHUNK_SIZE: 100,           // 100 unit chunks
    LOAD_RADIUS: 3,            // Load 3 chunks in each direction
    UNLOAD_RADIUS: 5,          // Unload beyond 5 chunks
    MAX_CONCURRENT_LOADS: 4,   // Load 4 chunks simultaneously
  });

  // Start the streaming system
  streamingManager.start();

  // Update player position (in game loop)
  const updatePlayerPosition = (x, y) => {
    streamingManager.setPlayerPosition(x, y);
  };

  // Get current statistics
  const stats = streamingManager.getStats();
  console.log('Streaming Stats:', {
    loaded: stats.chunksLoaded,
    loading: stats.chunksLoading,
    queued: stats.chunksQueued,
  });

  return { streamingManager, updatePlayerPosition };
}

async function exampleStreamingChunkManagement(streamingManager) {
  console.log('\n=== STREAMING MANAGER: CHUNK MANAGEMENT ===\n');

  // Get specific chunk
  const chunk = streamingManager.getChunk(5, 10);
  console.log(`Retrieved chunk: (${chunk.gridX}, ${chunk.gridY})`);

  // Preload critical chunk ahead of player
  console.log('Preloading chunk...');
  const preloadedChunk = await streamingManager.preloadChunk(6, 10);
  console.log(`Preloaded: (${preloadedChunk.gridX}, ${preloadedChunk.gridY})`);

  // Get visible chunks
  const visible = streamingManager.getVisibleChunks();
  console.log(`Visible chunks: ${visible.length}`);

  // Monitor memory
  const memory = streamingManager.getMemoryUsage();
  console.log('Memory Usage:', {
    sceneMemoryMB: memory.memoryMB,
    cacheMemoryMB: memory.assetCacheMB,
    totalChunks: memory.chunks,
    vertices: memory.vertices,
  });
}

async function exampleStreamingMonitoring(streamingManager) {
  console.log('\n=== STREAMING MANAGER: MONITORING & STATS ===\n');

  // Setup monitoring loop
  const monitoringInterval = setInterval(() => {
    const stats = streamingManager.getStats();
    const memory = streamingManager.getMemoryUsage();

    console.log('--- STREAMING STATS ---');
    console.log(`Chunks: ${stats.chunksLoaded} loaded, ${stats.chunksLoading} loading, ${stats.chunksQueued} queued`);
    console.log(`Geometry: ${stats.totalTriangles} triangles, ${stats.totalVertices} vertices`);
    console.log(`Memory: Scene ${memory.memoryMB}MB, Cache ${memory.assetCacheMB}MB`);
    console.log(`Updates: ${stats.updateCount} (${stats.lastUpdateTime})`);
  }, 5000);

  // Return cleanup function
  return () => clearInterval(monitoringInterval);
}

/**
 * ============================================================================
 * ADVANCED USAGE: CUSTOM ASSET LOADERS
 * ============================================================================
 */

class CustomAssetManager extends AssetManager {
  /**
   * Extend AssetManager with custom asset type
   */
  async loadCustomFormat(url, options = {}) {
    const cacheKey = `custom:${url}`;

    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey);
    }

    try {
      const response = await fetch(url);
      const data = await response.json();

      // Custom parsing logic
      const mesh = this._parseCustomFormat(data);

      this.modelCache.set(cacheKey, mesh);
      return mesh;

    } catch (error) {
      console.error(`Failed to load custom format: ${url}`, error);
      return this.fallbackAssets.model.clone();
    }
  }

  _parseCustomFormat(data) {
    // Implement custom format parsing
    return new THREE.Group();
  }
}

async function exampleCustomLoader() {
  console.log('\n=== CUSTOM ASSET LOADER EXAMPLE ===\n');

  const customManager = new CustomAssetManager();

  // Load custom format
  const customAsset = await customManager.loadCustomFormat('/assets/custom/data.custom');
  console.log('✓ Custom format loaded');

  return customAsset;
}

/**
 * ============================================================================
 * ADVANCED USAGE: CHUNKING STRATEGY
 * ============================================================================
 */

async function exampleAdvancedChunking(streamingManager) {
  console.log('\n=== ADVANCED: CUSTOM CHUNKING STRATEGY ===\n');

  // Get chunk grid around player
  const playerGridX = 5;
  const playerGridY = 10;

  const chunksToCheck = [];
  const loadRadius = 3;

  for (let x = playerGridX - loadRadius; x <= playerGridX + loadRadius; x++) {
    for (let y = playerGridY - loadRadius; y <= playerGridY + loadRadius; y++) {
      const chunk = streamingManager.getChunk(x, y);
      
      // Calculate custom priority (e.g., forward direction bias)
      const distance = Math.abs(x - playerGridX) + Math.abs(y - playerGridY);
      chunk.priority = distance;

      chunksToCheck.push({
        chunk,
        x,
        y,
        distance,
        state: chunk.state,
      });
    }
  }

  // Sort by priority and print
  chunksToCheck.sort((a, b) => a.distance - b.distance);

  console.log('Chunk Load Order (by priority):');
  chunksToCheck.slice(0, 5).forEach((info, idx) => {
    console.log(`${idx + 1}. (${info.x}, ${info.y}) - Distance: ${info.distance}, State: ${info.state}`);
  });

  return chunksToCheck;
}

/**
 * ============================================================================
 * COMPLETE INTEGRATION EXAMPLE
 * ============================================================================
 */

async function exampleCompleteIntegration(scene) {
  console.log('\n=== COMPLETE INTEGRATION EXAMPLE ===\n');

  // Initialize managers
  const assetManager = new AssetManager({
    enableMipmapping: true,
    enableTextureAtlasing: true,
    enableGeometryMerging: true,
  });

  const streamingManager = new StreamingManager(scene, assetManager, {
    CHUNK_SIZE: 100,
    LOAD_RADIUS: 3,
    UNLOAD_RADIUS: 5,
    MAX_CONCURRENT_LOADS: 4,
    onChunkLoad: (chunk) => {
      console.log(`✓ Chunk (${chunk.gridX}, ${chunk.gridY}) loaded in ${chunk.loadTime.toFixed(0)}ms`);
    },
  });

  // Start streaming
  streamingManager.start();

  // Game loop simulation
  const gameLoop = {
    playerX: 0,
    playerY: 0,
    vx: 0.5, // pixels per frame
    vy: 0.5,

    update: function() {
      // Update player position
      this.playerX += this.vx;
      this.playerY += this.vy;

      // Update streaming
      streamingManager.setPlayerPosition(this.playerX, this.playerY);

      // Log stats occasionally
      if (Math.floor(this.playerX) % 50 === 0) {
        const stats = streamingManager.getStats();
        const memory = streamingManager.getMemoryUsage();
        console.log(`Player: (${this.playerX.toFixed(0)}, ${this.playerY.toFixed(0)}) - ` +
                    `Chunks: ${stats.chunksLoaded}/${memory.chunks} - ` +
                    `Memory: ${memory.memoryMB}MB`);
      }
    },
  };

  // Simulate game loop
  console.log('Simulating 10 game frames...');
  for (let i = 0; i < 10; i++) {
    gameLoop.update();
  }

  // Cleanup
  streamingManager.stop();
  await streamingManager.clearAll();

  console.log('✓ Integration example complete');
  return { assetManager, streamingManager, gameLoop };
}

/**
 * ============================================================================
 * OPTIMIZATION TIPS & BEST PRACTICES
 * ============================================================================
 * 
 * TEXTURE OPTIMIZATION:
 * - Use mipmapping for distant textures
 * - Enable texture atlasing to reduce draw calls
 * - Use KTX2 compression for faster loading
 * - Keep texture resolutions reasonable (512-2048px)
 * 
 * GEOMETRY OPTIMIZATION:
 * - Enable geometry merging for static objects
 * - Use LOD (Level of Detail) for complex models
 * - Merge meshes sharing same material
 * - Use vertex colors instead of multiple textures
 * 
 * MEMORY MANAGEMENT:
 * - Set appropriate MAX_MEMORY_MB in CACHE_CONFIG
 * - Call pruneCache() periodically
 * - Monitor getCacheStats() and getMemoryUsage()
 * - Dispose unused materials explicitly
 * 
 * STREAMING OPTIMIZATION:
 * - Tune CHUNK_SIZE based on performance budget
 * - Adjust LOAD_RADIUS for desired visibility
 * - Use onProgress callbacks for loading feedback
 * - Preload chunks on predicted player path
 * 
 * LOADING STRATEGY:
 * - Load critical assets first with preloadChunk()
 * - Use loadAssetsParallel() for batch operations
 * - Implement asset manifests for data-driven loading
 * - Add retry logic for unreliable connections
 * 
 * DEBUGGING:
 * - Enable console logging in AssetManager/StreamingManager
 * - Use getStats() and getMemoryUsage() for monitoring
 * - Visualize chunk boundaries in debug mode
 * - Profile with Chrome DevTools Performance tab
 */

/**
 * ============================================================================
 * EXPORT ALL EXAMPLES FOR TESTING
 * ============================================================================
 */

export {
  exampleQuickStart,
  exampleAssetManagerCore,
  exampleAssetManagerParallel,
  exampleAssetManagerCaching,
  exampleErrorHandling,
  exampleStreamingManagerBasic,
  exampleStreamingChunkManagement,
  exampleStreamingMonitoring,
  exampleCustomLoader,
  exampleAdvancedChunking,
  exampleCompleteIntegration,
};
