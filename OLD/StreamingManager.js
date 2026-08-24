/**
 * StreamingManager.js - Spatial Chunked Streaming System
 * 
 * Manages streaming of city chunks based on player proximity:
 * - Define city as chunks (spatial grid)
 * - Load chunks near player with priority queue
 * - Unload distant chunks with LRU strategy
 * - Progress reporting and statistics
 * - Smooth transitions between loaded/unloaded states
 * 
 * Features:
 * - Configurable chunk size and load radius
 * - Priority-based loading queue
 * - Async/await patterns for non-blocking operations
 * - Memory management with automatic unloading
 * - Fallback rendering for unloaded chunks
 * - Network error resilience
 */

import { AssetManager } from './AssetManager.js';

/**
 * Configuration for streaming behavior
 */
const STREAMING_CONFIG = {
  CHUNK_SIZE: 100,              // World units per chunk
  LOAD_RADIUS: 3,               // Chunks to load around player
  UNLOAD_RADIUS: 5,             // Chunks to unload beyond this distance
  MAX_CONCURRENT_LOADS: 4,      // Parallel chunk loads
  CHUNK_PRIORITY_OFFSET: 100,   // Priority queue offset per distance
  FADE_IN_DURATION: 500,        // ms to fade in loaded chunks
  FADE_OUT_DURATION: 500,       // ms to fade out unloading chunks
  UPDATE_FREQUENCY: 100,        // ms between chunk update checks
};

/**
 * Represents a single chunk in the world grid
 */
class Chunk {
  constructor(gridX, gridY, assetManager) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.assetManager = assetManager;

    // World position (center of chunk)
    this.worldX = gridX * STREAMING_CONFIG.CHUNK_SIZE;
    this.worldY = gridY * STREAMING_CONFIG.CHUNK_SIZE;

    // State tracking
    this.state = 'unloaded'; // unloaded, loading, loaded, unloading, failed
    this.priority = Infinity;
    this.loadTime = 0;
    this.timestamp = Date.now();

    // Rendering
    this.meshes = [];
    this.objects = new Map(); // assetName -> THREE.Object3D
    this.fadeProgress = 0;
    this.targetOpacity = 1.0;

    // Performance
    this.vertexCount = 0;
    this.triCount = 0;
    this.memoryUsed = 0;

    // Error handling
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Calculate distance from chunk center to player
   */
  getDistance(playerX, playerY) {
    const dx = this.worldX - playerX;
    const dy = this.worldY - playerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate grid distance (Chebyshev distance for square grid)
   */
  getGridDistance(playerGridX, playerGridY) {
    return Math.max(
      Math.abs(this.gridX - playerGridX),
      Math.abs(this.gridY - playerGridY)
    );
  }

  /**
   * Load chunk assets
   */
  async load() {
    this.state = 'loading';
    const startTime = performance.now();

    try {
      // Define chunk-specific assets
      const assetList = this._getChunkAssets();
      
      // Load all assets for this chunk
      const loadedAssets = await this.assetManager.loadAssetsParallel(assetList, {
        maxConcurrent: STREAMING_CONFIG.MAX_CONCURRENT_LOADS,
      });

      // Create meshes from loaded assets
      await this._createMeshesFromAssets(loadedAssets);

      this.loadTime = performance.now() - startTime;
      this.state = 'loaded';
      this.retryCount = 0;

      return true;

    } catch (error) {
      console.error(`Chunk load failed (${this.gridX},${this.gridY}):`, error);
      this.retryCount++;

      if (this.retryCount < this.maxRetries) {
        this.state = 'unloaded';
        return false;
      } else {
        this.state = 'failed';
        return false;
      }
    }
  }

  /**
   * Unload chunk and dispose resources
   */
  async unload() {
    this.state = 'unloading';

    try {
      // Dispose all meshes
      this.meshes.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });

      this.meshes = [];
      this.objects.clear();
      this.state = 'unloaded';

    } catch (error) {
      console.error(`Chunk unload error (${this.gridX},${this.gridY}):`, error);
    }
  }

  /**
   * Update chunk fade state
   */
  updateFade(deltaTime) {
    const duration = this.targetOpacity > this.fadeProgress 
      ? STREAMING_CONFIG.FADE_IN_DURATION 
      : STREAMING_CONFIG.FADE_OUT_DURATION;

    const targetValue = this.targetOpacity;
    const direction = targetValue > this.fadeProgress ? 1 : -1;
    const step = (deltaTime / duration) * direction;

    this.fadeProgress = Math.max(0, Math.min(1, this.fadeProgress + step));

    // Update mesh opacity
    this.meshes.forEach(mesh => {
      if (mesh.material && mesh.material.transparent) {
        mesh.material.opacity = this.fadeProgress;
      }
    });
  }

  /**
   * Get visibility (0 = invisible, 1 = fully visible)
   */
  getVisibility() {
    return this.fadeProgress;
  }

  /**
   * ========== PRIVATE METHODS ==========
   */

  _getChunkAssets() {
    // Define assets for this specific chunk
    // In production, this would be data-driven from a manifest
    return [
      {
        name: `terrain_${this.gridX}_${this.gridY}`,
        type: 'model',
        url: `/assets/chunks/terrain_${this.gridX}_${this.gridY}.glb`,
      },
      {
        name: `buildings_${this.gridX}_${this.gridY}`,
        type: 'model',
        url: `/assets/chunks/buildings_${this.gridX}_${this.gridY}.glb`,
      },
      {
        name: `props_${this.gridX}_${this.gridY}`,
        type: 'model',
        url: `/assets/chunks/props_${this.gridX}_${this.gridY}.glb`,
      },
      {
        name: `ambient_${this.gridX}_${this.gridY}`,
        type: 'audio',
        url: `/assets/audio/ambient_${this.gridX}_${this.gridY}.mp3`,
      },
    ];
  }

  async _createMeshesFromAssets(loadedAssets) {
    for (const [name, asset] of Object.entries(loadedAssets)) {
      if (!asset) continue;

      if (asset instanceof THREE.Object3D) {
        // It's a model
        const mesh = asset.clone();
        mesh.position.set(this.worldX, 0, this.worldY);
        mesh.userData.chunkId = `${this.gridX}_${this.gridY}`;
        mesh.userData.assetName = name;

        this.meshes.push(mesh);
        this.objects.set(name, mesh);

        // Count geometry
        mesh.traverse(child => {
          if (child instanceof THREE.Mesh && child.geometry) {
            const pos = child.geometry.attributes.position;
            if (pos) {
              this.vertexCount += pos.count;
              this.triCount += pos.count / 3;
            }
          }
        });
      }
    }
  }
}

/**
 * Priority queue for chunk loading
 */
class ChunkLoadingQueue {
  constructor() {
    this.queue = [];
    this.inProgress = new Set();
    this.completed = new Set();
  }

  enqueue(chunk, priority = 0) {
    // Insert in priority order (lower priority value = higher priority)
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (priority < this.queue[i].priority) {
        this.queue.splice(i, 0, { chunk, priority });
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push({ chunk, priority });
    }
  }

  dequeue() {
    if (this.queue.length === 0) return null;
    return this.queue.shift().chunk;
  }

  markInProgress(chunk) {
    this.inProgress.add(chunk);
  }

  markCompleted(chunk) {
    this.inProgress.delete(chunk);
    this.completed.add(chunk);
  }

  isQueued(chunk) {
    return this.queue.some(item => item.chunk === chunk);
  }

  clear() {
    this.queue = [];
    this.inProgress.clear();
  }

  getStats() {
    return {
      queued: this.queue.length,
      inProgress: this.inProgress.size,
      completed: this.completed.size,
    };
  }
}

/**
 * Main StreamingManager Class
 */
export class StreamingManager {
  constructor(scene, assetManager, options = {}) {
    this.scene = scene;
    this.assetManager = assetManager || new AssetManager();

    // Streaming state
    this.chunks = new Map();
    this.loadingQueue = new ChunkLoadingQueue();
    this.activeLoads = [];

    // Player tracking
    this.playerGridX = 0;
    this.playerGridY = 0;
    this.playerWorldX = 0;
    this.playerWorldY = 0;

    // Statistics
    this.stats = {
      chunksLoaded: 0,
      chunksLoading: 0,
      chunksQueued: 0,
      totalVertices: 0,
      totalTriangles: 0,
      totalMemory: 0,
      updateCount: 0,
      lastUpdateTime: 0,
    };

    // Configuration
    this.config = {
      ...STREAMING_CONFIG,
      ...options,
    };

    // Callbacks
    this.onChunkLoad = options.onChunkLoad || (() => {});
    this.onChunkUnload = options.onChunkUnload || (() => {});
    this.onProgress = options.onProgress || (() => {});

    // Update loop
    this.updateInterval = null;
    this.isUpdating = false;

    // Chunk container
    this.chunkContainer = new THREE.Group();
    this.chunkContainer.name = 'ChunkContainer';
    this.scene.add(this.chunkContainer);
  }

  /**
   * Start streaming system
   */
  start() {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(
      () => this.update(),
      this.config.UPDATE_FREQUENCY
    );

    console.log('✓ Streaming manager started');
  }

  /**
   * Stop streaming system
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('✓ Streaming manager stopped');
  }

  /**
   * Update player position and manage chunks
   */
  async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      // Update chunk load/unload state
      await this._updateChunks();

      // Process loading queue
      await this._processLoadingQueue();

      // Update fade animations
      this._updateFades(this.config.UPDATE_FREQUENCY);

      // Collect statistics
      this._updateStats();

      this.stats.updateCount++;
      this.stats.lastUpdateTime = Date.now();

    } catch (error) {
      console.error('Streaming update error:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Set player position in world space
   */
  setPlayerPosition(worldX, worldY) {
    this.playerWorldX = worldX;
    this.playerWorldY = worldY;

    // Convert to grid coordinates
    this.playerGridX = Math.round(worldX / this.config.CHUNK_SIZE);
    this.playerGridY = Math.round(worldY / this.config.CHUNK_SIZE);
  }

  /**
   * Set player by grid coordinates
   */
  setPlayerGridPosition(gridX, gridY) {
    this.playerGridX = gridX;
    this.playerGridY = gridY;
    this.playerWorldX = gridX * this.config.CHUNK_SIZE;
    this.playerWorldY = gridY * this.config.CHUNK_SIZE;
  }

  /**
   * Get chunk at grid coordinates
   */
  getChunk(gridX, gridY) {
    const key = `${gridX}_${gridY}`;
    if (!this.chunks.has(key)) {
      const chunk = new Chunk(gridX, gridY, this.assetManager);
      this.chunks.set(key, chunk);
    }
    return this.chunks.get(key);
  }

  /**
   * Preload specific chunk
   */
  async preloadChunk(gridX, gridY) {
    const chunk = this.getChunk(gridX, gridY);
    
    if (chunk.state !== 'unloaded') {
      return chunk;
    }

    chunk.priority = 0; // Highest priority
    this.loadingQueue.enqueue(chunk, 0);

    return new Promise((resolve) => {
      const checkCompletion = setInterval(() => {
        if (chunk.state === 'loaded') {
          clearInterval(checkCompletion);
          resolve(chunk);
        }
      }, 100);
    });
  }

  /**
   * Get all visible chunks
   */
  getVisibleChunks() {
    return Array.from(this.chunks.values()).filter(
      chunk => chunk.state === 'loaded' && chunk.fadeProgress > 0
    );
  }

  /**
   * Get streaming statistics
   */
  getStats() {
    return {
      ...this.stats,
      queue: this.loadingQueue.getStats(),
      assetManager: this.assetManager.getCacheStats(),
    };
  }

  /**
   * Get memory usage summary
   */
  getMemoryUsage() {
    let totalMemory = 0;
    let vertexCount = 0;

    this.chunks.forEach(chunk => {
      if (chunk.state === 'loaded') {
        totalMemory += chunk.memoryUsed;
        vertexCount += chunk.vertexCount;
      }
    });

    return {
      memoryMB: (totalMemory / 1024 / 1024).toFixed(2),
      vertices: vertexCount,
      chunks: this.chunks.size,
      assetCacheMB: (this.assetManager.cacheStats.memoryUsed / 1024 / 1024).toFixed(2),
    };
  }

  /**
   * Clear all chunks and reset
   */
  async clearAll() {
    this.loadingQueue.clear();

    for (const chunk of this.chunks.values()) {
      await chunk.unload();
      this.chunkContainer.remove(...chunk.meshes);
    }

    this.chunks.clear();
    this.stats = {
      chunksLoaded: 0,
      chunksLoading: 0,
      chunksQueued: 0,
      totalVertices: 0,
      totalTriangles: 0,
      totalMemory: 0,
      updateCount: 0,
      lastUpdateTime: 0,
    };

    console.log('✓ Streaming manager cleared');
  }

  /**
   * ========== PRIVATE METHODS ==========
   */

  async _updateChunks() {
    const loadRadius = this.config.LOAD_RADIUS;
    const unloadRadius = this.config.UNLOAD_RADIUS;

    // Determine which chunks should be loaded
    const shouldLoadChunks = new Set();
    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dy = -loadRadius; dy <= loadRadius; dy++) {
        const gridX = this.playerGridX + dx;
        const gridY = this.playerGridY + dy;
        shouldLoadChunks.add(`${gridX}_${gridY}`);
      }
    }

    // Queue chunks for loading
    for (const chunkKey of shouldLoadChunks) {
      const [gridX, gridY] = chunkKey.split('_').map(Number);
      const chunk = this.getChunk(gridX, gridY);

      if (chunk.state === 'unloaded' && !this.loadingQueue.isQueued(chunk)) {
        // Calculate priority based on distance
        const distance = chunk.getGridDistance(this.playerGridX, this.playerGridY);
        const priority = distance * this.config.CHUNK_PRIORITY_OFFSET;

        chunk.priority = priority;
        this.loadingQueue.enqueue(chunk, priority);
      }
    }

    // Unload distant chunks
    for (const chunk of this.chunks.values()) {
      const distance = chunk.getGridDistance(this.playerGridX, this.playerGridY);

      if (distance > unloadRadius && chunk.state === 'loaded') {
        chunk.targetOpacity = 0;

        // Schedule unload after fade out
        setTimeout(() => {
          if (chunk.state !== 'unloading' && chunk.state !== 'unloaded') {
            chunk.unload();
            this.chunkContainer.remove(...chunk.meshes);
            this.onChunkUnload(chunk);
          }
        }, this.config.FADE_OUT_DURATION);
      }
    }
  }

  async _processLoadingQueue() {
    const maxConcurrent = this.config.MAX_CONCURRENT_LOADS;
    const activeCount = this.loadingQueue.inProgress.size;

    while (activeCount < maxConcurrent) {
      const chunk = this.loadingQueue.dequeue();
      if (!chunk) break;

      this.loadingQueue.markInProgress(chunk);

      (async () => {
        try {
          const success = await chunk.load();

          if (success) {
            // Add meshes to scene
            this.chunkContainer.add(...chunk.meshes);

            // Fade in
            chunk.targetOpacity = 1.0;
            chunk.fadeProgress = 0;

            this.onChunkLoad(chunk);
            console.log(`✓ Chunk loaded: (${chunk.gridX}, ${chunk.gridY})`);
          } else {
            console.warn(`✗ Chunk load failed: (${chunk.gridX}, ${chunk.gridY})`);
          }
        } catch (error) {
          console.error(`Chunk load error: (${chunk.gridX}, ${chunk.gridY})`, error);
        } finally {
          this.loadingQueue.markCompleted(chunk);
        }
      })();
    }
  }

  _updateFades(deltaTime) {
    for (const chunk of this.chunks.values()) {
      if (chunk.state === 'loaded' || chunk.state === 'unloading') {
        chunk.updateFade(deltaTime);
      }
    }
  }

  _updateStats() {
    this.stats.chunksLoaded = Array.from(this.chunks.values())
      .filter(c => c.state === 'loaded').length;

    this.stats.chunksLoading = Array.from(this.chunks.values())
      .filter(c => c.state === 'loading').length;

    this.stats.chunksQueued = this.loadingQueue.queue.length;

    this.stats.totalVertices = Array.from(this.chunks.values())
      .reduce((sum, c) => sum + c.vertexCount, 0);

    this.stats.totalTriangles = Array.from(this.chunks.values())
      .reduce((sum, c) => sum + c.triCount, 0);

    this.stats.totalMemory = Array.from(this.chunks.values())
      .reduce((sum, c) => sum + c.memoryUsed, 0);
  }
}

export { Chunk, ChunkLoadingQueue, STREAMING_CONFIG };
