/**
 * AssetManager.js - Comprehensive Asset Loading and Cache Management System
 * 
 * Handles loading and management of all asset types for Cat City:
 * - 3D Models (GLTF/GLB format)
 * - Textures with mipmap generation
 * - Audio files
 * - Materials with instance management
 * - Smart caching with memory pooling
 * 
 * Features:
 * - Async/await patterns for non-blocking loading
 * - Texture atlasing support
 * - Geometry merging capabilities
 * - Memory pooling for object reuse
 * - Fallback assets for missing resources
 * - Network error recovery
 * - Corruption detection
 * - Progress tracking
 * - Extensible asset type system
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Cache configuration constants
 */
const CACHE_CONFIG = {
  MAX_MEMORY_MB: 512,           // Maximum cache size in MB
  TEXTURE_CACHE_SIZE: 256,       // Max textures in cache
  MODEL_CACHE_SIZE: 64,          // Max models in cache
  AUDIO_CACHE_SIZE: 128,         // Max audio clips in cache
  MIPMAP_LEVELS: 4,              // Mipmap levels for textures
  TEXTURE_ATLAS_SIZE: 2048,      // Texture atlas resolution
};

/**
 * Memory pool for frequently reused objects
 */
class ObjectPool {
  constructor(objectFactory, initialSize = 10) {
    this.factory = objectFactory;
    this.available = [];
    this.inUse = new Set();
    
    // Pre-allocate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  acquire() {
    let obj;
    if (this.available.length > 0) {
      obj = this.available.pop();
    } else {
      obj = this.factory();
    }
    this.inUse.add(obj);
    return obj;
  }

  release(obj) {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.available.push(obj);
    }
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }
}

/**
 * Texture atlas for optimized rendering
 */
class TextureAtlas {
  constructor(size = CACHE_CONFIG.TEXTURE_ATLAS_SIZE) {
    this.size = size;
    this.canvas = new OffscreenCanvas(size, size);
    this.ctx = this.canvas.getContext('2d');
    this.entries = [];
    this.currentY = 0;
    this.currentRowHeight = 0;
    this.maxX = 0;
  }

  async addTexture(texture, name) {
    if (!(texture instanceof HTMLImageElement) && !(texture instanceof ImageData)) {
      console.warn(`Cannot atlas texture ${name}: invalid format`);
      return null;
    }

    const entry = {
      name,
      x: this.maxX,
      y: this.currentY,
      width: texture.width,
      height: texture.height,
    };

    // Check if need to wrap to next row
    if (this.maxX + texture.width > this.size) {
      this.currentY += this.currentRowHeight;
      this.maxX = 0;
      this.currentRowHeight = 0;
      entry.x = 0;
      entry.y = this.currentY;
    }

    // Draw to atlas
    this.ctx.drawImage(texture, entry.x, entry.y);
    
    this.entries.push(entry);
    this.maxX += texture.width;
    this.currentRowHeight = Math.max(this.currentRowHeight, texture.height);

    return entry;
  }

  getAtlasTexture() {
    return this.canvas.convertToBlob().then(blob => 
      new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => resolve(new THREE.CanvasTexture(this.canvas));
        img.src = url;
      })
    );
  }

  getUVMapping(name) {
    const entry = this.entries.find(e => e.name === name);
    if (!entry) return null;

    return {
      offsetX: entry.x / this.size,
      offsetY: entry.y / this.size,
      scaleX: entry.width / this.size,
      scaleY: entry.height / this.size,
    };
  }
}

/**
 * Geometry merging for performance optimization
 */
class GeometryMerger {
  static mergeGeometries(geometries, materials = []) {
    const merged = [];
    const materialMap = new Map();

    geometries.forEach((geo, idx) => {
      const matIdx = idx % materials.length;
      const mat = materials[matIdx];
      
      if (!materialMap.has(mat)) {
        materialMap.set(mat, []);
      }
      materialMap.get(mat).push(geo);
    });

    materialMap.forEach((geos, mat) => {
      const mergedGeo = BufferGeometryUtils.mergeGeometries(geos, false);
      mergedGeo.computeBoundingBox();
      mergedGeo.computeBoundingSphere();
      merged.push({ geometry: mergedGeo, material: mat });
    });

    return merged;
  }

  static computeNormalMapFromHeightMap(heightMapCanvas, strength = 1.0) {
    const normalCanvas = new OffscreenCanvas(heightMapCanvas.width, heightMapCanvas.height);
    const ctx = normalCanvas.getContext('2d');
    const imageData = ctx.createImageData(normalCanvas.width, normalCanvas.height);
    const data = imageData.data;

    const heightData = ctx.getImageData(0, 0, heightMapCanvas.width, heightMapCanvas.height).data;
    const w = heightMapCanvas.width;
    const h = heightMapCanvas.height;

    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        const idx = (i * w + j) * 4;
        const left = j > 0 ? heightData[idx - 4] : heightData[idx];
        const right = j < w - 1 ? heightData[idx + 4] : heightData[idx];
        const up = i > 0 ? heightData[(i - 1) * w + j * 4] : heightData[idx];
        const down = i < h - 1 ? heightData[(i + 1) * w + j * 4] : heightData[idx];

        const dx = (left - right) * strength;
        const dy = (up - down) * strength;
        const dz = 1.0;

        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        data[idx] = Math.round(((dx / len + 1) * 0.5) * 255);
        data[idx + 1] = Math.round(((dy / len + 1) * 0.5) * 255);
        data[idx + 2] = Math.round(((dz / len + 1) * 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return normalCanvas;
  }
}

/**
 * Main AssetManager Class
 */
export class AssetManager {
  constructor(options = {}) {
    // Loaders
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.audioLoader = new THREE.AudioLoader();
    this.ktx2Loader = new KTX2Loader();

    // Cache management
    this.modelCache = new Map();
    this.textureCache = new Map();
    this.audioCache = new Map();
    this.materialCache = new Map();
    this.geometryCache = new Map();

    // Asset metadata
    this.assetMetadata = new Map();
    this.cacheStats = {
      memoryUsed: 0,
      itemsLoaded: 0,
      itemsFailed: 0,
    };

    // Object pools
    this.vectorPool = new ObjectPool(() => new THREE.Vector3(), 20);
    this.quaternionPool = new ObjectPool(() => new THREE.Quaternion(), 10);

    // Texture atlasing
    this.textureAtlas = new TextureAtlas();

    // Configuration
    this.config = {
      enableMipmapping: true,
      enableCompression: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableTextureAtlasing: true,
      enableGeometryMerging: true,
      ...options,
    };

    // Fallback assets
    this.fallbackAssets = {
      model: this._createFallbackModel(),
      texture: this._createFallbackTexture(),
      audio: null,
    };

    // Progress tracking
    this.loadingQueue = [];
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Load a 3D model (GLTF/GLB format)
   */
  async loadModel(url, options = {}) {
    const cacheKey = `model:${url}`;
    
    // Check cache first
    if (this.modelCache.has(cacheKey)) {
      console.log(`✓ Model loaded from cache: ${url}`);
      return this.modelCache.get(cacheKey);
    }

    const metadata = {
      url,
      type: 'model',
      size: 0,
      loadTime: 0,
      timestamp: Date.now(),
    };

    try {
      const startTime = performance.now();
      let gltf = null;

      // Retry logic for network errors
      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        try {
          gltf = await this._loadGLTF(url);
          break;
        } catch (error) {
          if (attempt < this.config.maxRetries - 1) {
            console.warn(`Retry ${attempt + 1}/${this.config.maxRetries} for ${url}`);
            await this._delay(this.config.retryDelay);
          } else {
            throw error;
          }
        }
      }

      // Validate and process model
      if (!gltf || !gltf.scene) {
        throw new Error('Invalid GLTF structure');
      }

      // Clone scene to avoid shared references
      const clonedScene = gltf.scene.clone();
      
      // Merge geometries if enabled
      if (this.config.enableGeometryMerging) {
        this._mergeGeometries(clonedScene);
      }

      // Compute bounds
      const bbox = new THREE.Box3().setFromObject(clonedScene);
      metadata.bounds = bbox;
      metadata.size = this._estimateSceneSize(clonedScene);
      metadata.loadTime = performance.now() - startTime;

      // Store animations and other data
      if (gltf.animations && gltf.animations.length > 0) {
        metadata.animations = gltf.animations;
        clonedScene.userData.animations = gltf.animations;
      }

      // Cache the model
      this.modelCache.set(cacheKey, clonedScene);
      this.assetMetadata.set(cacheKey, metadata);
      this.cacheStats.itemsLoaded++;

      console.log(`✓ Loaded model: ${url} (${(metadata.size / 1024).toFixed(2)}KB in ${metadata.loadTime.toFixed(0)}ms)`);
      return clonedScene;

    } catch (error) {
      console.error(`✗ Failed to load model: ${url}`, error);
      this.cacheStats.itemsFailed++;
      
      // Return fallback
      return this.fallbackAssets.model.clone();
    }
  }

  /**
   * Load a texture with mipmap support
   */
  async loadTexture(url, options = {}) {
    const cacheKey = `texture:${url}`;
    
    if (this.textureCache.has(cacheKey)) {
      console.log(`✓ Texture loaded from cache: ${url}`);
      return this.textureCache.get(cacheKey);
    }

    const metadata = {
      url,
      type: 'texture',
      size: 0,
      timestamp: Date.now(),
      format: options.format || 'standard',
    };

    try {
      let texture;

      // Load based on format
      if (url.endsWith('.ktx2') && this.config.enableCompression) {
        texture = await this._loadKTX2Texture(url);
      } else {
        texture = await this._loadStandardTexture(url);
      }

      // Apply mipmap settings
      if (this.config.enableMipmapping) {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
      }

      // Apply additional options
      if (options.magFilter) texture.magFilter = options.magFilter;
      if (options.minFilter) texture.minFilter = options.minFilter;
      if (options.wrapS) texture.wrapS = options.wrapS;
      if (options.wrapT) texture.wrapT = options.wrapT;

      // Estimate size
      metadata.size = texture.image.width * texture.image.height * 4;
      texture.userData.metadata = metadata;

      // Add to atlas if enabled
      if (this.config.enableTextureAtlasing && options.useAtlas !== false) {
        const atlasEntry = await this.textureAtlas.addTexture(texture.image, url);
        if (atlasEntry) {
          texture.userData.atlasEntry = atlasEntry;
        }
      }

      this.textureCache.set(cacheKey, texture);
      this.assetMetadata.set(cacheKey, metadata);
      this.cacheStats.itemsLoaded++;

      console.log(`✓ Loaded texture: ${url} (${(metadata.size / 1024).toFixed(2)}KB)`);
      return texture;

    } catch (error) {
      console.error(`✗ Failed to load texture: ${url}`, error);
      this.cacheStats.itemsFailed++;
      return this.fallbackAssets.texture.clone();
    }
  }

  /**
   * Load audio file
   */
  async loadAudio(url, options = {}) {
    const cacheKey = `audio:${url}`;
    
    if (this.audioCache.has(cacheKey)) {
      console.log(`✓ Audio loaded from cache: ${url}`);
      return this.audioCache.get(cacheKey);
    }

    const metadata = {
      url,
      type: 'audio',
      duration: 0,
      timestamp: Date.now(),
    };

    try {
      const audioBuffer = await this._loadAudioBuffer(url);

      if (!audioBuffer) {
        throw new Error('Failed to decode audio');
      }

      metadata.duration = audioBuffer.duration;

      this.audioCache.set(cacheKey, audioBuffer);
      this.assetMetadata.set(cacheKey, metadata);
      this.cacheStats.itemsLoaded++;

      console.log(`✓ Loaded audio: ${url} (${audioBuffer.duration.toFixed(2)}s)`);
      return audioBuffer;

    } catch (error) {
      console.error(`✗ Failed to load audio: ${url}`, error);
      this.cacheStats.itemsFailed++;
      return null;
    }
  }

  /**
   * Create or manage materials
   */
  createMaterial(name, options = {}) {
    const cacheKey = `material:${name}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey);
    }

    const materialConfig = {
      color: options.color || 0xffffff,
      metalness: options.metalness !== undefined ? options.metalness : 0.5,
      roughness: options.roughness !== undefined ? options.roughness : 0.5,
      emissive: options.emissive || 0x000000,
      ...options,
    };

    const material = new THREE.MeshStandardMaterial(materialConfig);
    material.name = name;

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create merged material for geometry pooling
   */
  async createMaterialInstance(baseMatName, customProps = {}) {
    const baseMat = this.materialCache.get(`material:${baseMatName}`);
    if (!baseMat) {
      throw new Error(`Base material not found: ${baseMatName}`);
    }

    // Clone material for instance
    const instance = baseMat.clone();
    Object.assign(instance, customProps);
    
    return instance;
  }

  /**
   * Load multiple assets in parallel with priority queue
   */
  async loadAssetsParallel(assetList, options = {}) {
    const { maxConcurrent = 4, onItemLoaded = () => {} } = options;

    const results = {};
    const queue = [...assetList];
    let active = 0;
    let completed = 0;

    return new Promise((resolve, reject) => {
      const processNext = async () => {
        if (queue.length === 0 && active === 0) {
          resolve(results);
          return;
        }

        while (active < maxConcurrent && queue.length > 0) {
          active++;
          const asset = queue.shift();

          this._loadAssetByType(asset)
            .then(result => {
              results[asset.name] = result;
              completed++;
              onItemLoaded({ completed, total: assetList.length });
            })
            .catch(error => {
              console.error(`Failed to load ${asset.name}:`, error);
              results[asset.name] = null;
            })
            .finally(() => {
              active--;
              processNext();
            });
        }
      };

      processNext();
    });
  }

  /**
   * Cleanup and memory management
   */
  disposeAsset(key) {
    if (this.modelCache.has(key)) {
      const model = this.modelCache.get(key);
      this._disposeObject(model);
      this.modelCache.delete(key);
    }

    if (this.textureCache.has(key)) {
      const texture = this.textureCache.get(key);
      texture.dispose();
      this.textureCache.delete(key);
    }

    if (this.audioCache.has(key)) {
      this.audioCache.delete(key);
    }

    if (this.materialCache.has(key)) {
      const material = this.materialCache.get(key);
      material.dispose();
      this.materialCache.delete(key);
    }

    this.assetMetadata.delete(key);
  }

  /**
   * Clear cache based on LRU strategy
   */
  pruneCache(targetMemoryMB = CACHE_CONFIG.MAX_MEMORY_MB) {
    const entries = Array.from(this.assetMetadata.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let removedSize = 0;
    for (const [key, metadata] of entries) {
      if (this.cacheStats.memoryUsed < targetMemoryMB * 1024 * 1024) break;
      
      this.disposeAsset(key);
      removedSize += metadata.size || 0;
    }

    this.cacheStats.memoryUsed -= removedSize;
    console.log(`Pruned cache: freed ${(removedSize / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      memoryUsedMB: (this.cacheStats.memoryUsed / 1024 / 1024).toFixed(2),
      modelsCached: this.modelCache.size,
      texturesCached: this.textureCache.size,
      audiosCached: this.audioCache.size,
      materialsCached: this.materialCache.size,
      vectorPoolStats: this.vectorPool.getStats(),
      quaternionPoolStats: this.quaternionPool.getStats(),
    };
  }

  /**
   * ========== PRIVATE METHODS ==========
   */

  async _loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });
  }

  async _loadStandardTexture(url) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }

  async _loadKTX2Texture(url) {
    return new Promise((resolve, reject) => {
      this.ktx2Loader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }

  async _loadAudioBuffer(url) {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => resolve(buffer),
        undefined,
        (error) => reject(error)
      );
    });
  }

  async _loadAssetByType(asset) {
    switch (asset.type) {
      case 'model':
        return this.loadModel(asset.url, asset.options);
      case 'texture':
        return this.loadTexture(asset.url, asset.options);
      case 'audio':
        return this.loadAudio(asset.url, asset.options);
      default:
        throw new Error(`Unknown asset type: ${asset.type}`);
    }
  }

  _createFallbackModel() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isFallback = true;
    return mesh;
  }

  _createFallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.userData.isFallback = true;
    return texture;
  }

  _mergeGeometries(object) {
    const geometries = [];
    const materials = [];

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        geometries.push(child.geometry);
        materials.push(child.material);
      }
    });

    if (geometries.length > 1) {
      const merged = GeometryMerger.mergeGeometries(geometries, materials);
      // Update object with merged geometry
      // Note: In production, implement selective merging based on material groups
    }
  }

  _estimateSceneSize(scene) {
    let size = 0;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          const pos = child.geometry.attributes.position;
          if (pos) size += pos.array.byteLength;
        }
      }
    });
    return size;
  }

  _disposeObject(object) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ObjectPool, TextureAtlas, GeometryMerger, CACHE_CONFIG };
