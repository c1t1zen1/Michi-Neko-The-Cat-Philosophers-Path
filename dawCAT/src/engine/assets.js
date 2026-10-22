/* dawCAT — asset store: IndexedDB-backed storage for imported audio files
   (raw bytes, kept out of localStorage/project JSON so autosave never blows
   quota), plus a per-session in-memory cache of decoded AudioBuffers and
   waveform peaks so a dragged-in file is only ever decoded once. */

import { synthesizeStarterSample, processAudioBuffer } from './manipulator.js';

const DB_NAME = 'dawcat-assets';
const STORE = 'assets';
const DB_VERSION = 1;

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/* asset = { id, name, mime, durationSec, sampleRate, channels, bytes: ArrayBuffer } */
export async function putAsset(asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(asset);
    tx.oncomplete = () => resolve(asset);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAsset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAsset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- per-session decoded-buffer + waveform-peak cache ---------- */
/* Assets are immutable once imported, so decoding/peak-computation only
   ever needs to happen once per browser session, not per playback. */
const bufferCache = new Map();
const peaksCache = new Map();
const processedCache = new Map();

export function getCachedBuffer(assetId, ctx = null) {
  if (!assetId) return null;
  const hit = bufferCache.get(assetId);
  if (hit) return hit;
  if (String(assetId).startsWith('starter:')) {
    const buf = synthesizeStarterSample(ctx, assetId);
    cacheBuffer(assetId, buf);
    return buf;
  }
  return null;
}

export function getCachedPeaks(assetId, ctx = null) {
  if (!assetId) return null;
  if (!peaksCache.has(assetId) && String(assetId).startsWith('starter:')) {
    getCachedBuffer(assetId, ctx);
  }
  return peaksCache.get(assetId) || null;
}

/* Returns a processed AudioBuffer with any non-trivial Sound Physics (stretch,
   pitchSemis, reverse, bitcrush, drive, filters, fades, etc.) applied and
   cached by signature so live playback and offline render are instant. */
export function getProcessedBuffer(ctx, assetId, physics = null) {
  const base = getCachedBuffer(assetId, ctx);
  if (!base) return null;
  if (!physics) return base;
  const hasPhysics = (
    (physics.stretch && Math.abs(physics.stretch - 1) > 0.008) ||
    (physics.speed && Math.abs(physics.speed - 1) > 0.004) ||
    physics.pitchSemis ||
    physics.fineCents ||
    physics.reverse ||
    physics.pingPong ||
    physics.normalize ||
    (physics.fadeIn && physics.fadeIn > 0.002) ||
    (physics.fadeOut && physics.fadeOut > 0.002) ||
    (physics.lowpass && physics.lowpass < 19500) ||
    (physics.highpass && physics.highpass > 25) ||
    (physics.drive && physics.drive > 0.005) ||
    (physics.bitcrush && physics.bitcrush < 16) ||
    (physics.downsample && physics.downsample > 1) ||
    (physics.ringModHz && physics.ringModHz > 0.5) ||
    (physics.tremoloRate && physics.tremoloRate > 0.1) ||
    (physics.echoDelay && physics.echoDelay >= 0.01) ||
    (physics.trimStart && physics.trimStart > 0.002) ||
    (physics.trimEnd && physics.trimEnd > 0.01 && physics.trimEnd < base.duration - 0.005)
  );
  if (!hasPhysics) return base;
  const sig = `${assetId}:${JSON.stringify(physics)}`;
  const cached = processedCache.get(sig);
  if (cached) return cached;
  const processed = processAudioBuffer(ctx, base, Object.assign({}, physics, { gain: 1 }));
  if (processedCache.size > 60) {
    const firstKey = processedCache.keys().next().value;
    processedCache.delete(firstKey);
  }
  processedCache.set(sig, processed);
  return processed;
}

/* Seeds the cache directly from an AudioBuffer that's already in hand (e.g.
   the output of an OfflineAudioContext render), skipping a redundant
   decode/re-encode round-trip. */
export function cacheBuffer(assetId, buffer) {
  bufferCache.set(assetId, buffer);
  peaksCache.set(assetId, computePeaks(buffer));
  for (const k of [...processedCache.keys()]) {
    if (k.startsWith(assetId + ':')) processedCache.delete(k);
  }
}

export function computePeaks(buffer, bucketCount = 200) {
  const data = buffer.getChannelData(0);
  const bucketSize = Math.max(1, Math.floor(data.length / bucketCount));
  const peaks = new Float32Array(bucketCount);
  for (let i = 0; i < bucketCount; i++) {
    const start = i * bucketSize;
    const end = Math.min(data.length, start + bucketSize);
    let max = 0;
    for (let j = start; j < end; j++) { const v = Math.abs(data[j]); if (v > max) max = v; }
    peaks[i] = max;
  }
  return peaks;
}

/* Decodes+caches an ArrayBuffer of audio bytes straight away (used right
   after a native file drop, before the asset even has an IndexedDB row). */
export async function decodeAndCache(ctx, assetId, bytes) {
  const buffer = await ctx.decodeAudioData(bytes.slice(0));
  bufferCache.set(assetId, buffer);
  peaksCache.set(assetId, computePeaks(buffer));
  return buffer;
}

/* Loads an asset's decoded AudioBuffer for playback, using the in-memory
   cache when present, otherwise pulling stored bytes from IndexedDB. */
export async function loadDecodedAsset(ctx, assetId) {
  const cached = getCachedBuffer(assetId, ctx);
  if (cached) return cached;
  const rec = await getAsset(assetId);
  if (!rec || !rec.bytes) return null;
  return decodeAndCache(ctx, assetId, rec.bytes);
}

/* Warms the in-memory decode cache for every asset referenced by the project's
   clips. Needed after a page reload / project (re)load, since the decoded-
   buffer cache is session-only while the raw bytes persist in IndexedDB.
   Cheap to call repeatedly — loadDecodedAsset no-ops once an asset is cached. */
export async function preloadProjectAssets(ctx, project) {
  const ids = new Set();
  for (const id of Object.keys(project.assets || {})) ids.add(id);
  for (const t of project.tracks || []) {
    if (t.preset && t.preset.samplerAssetId) ids.add(t.preset.samplerAssetId);
    for (const c of t.clips || []) {
      if (c.audio && c.audio.assetId) ids.add(c.audio.assetId);
    }
  }
  await Promise.all([...ids].map((id) => loadDecodedAsset(ctx, id).catch(() => null)));
}

export function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}
