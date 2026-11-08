// Read-only adapters: run the game's own builders without building a valley or
// registering any gameplay state. The first tile on every shelf comes through
// here, so "our original" is the code that ships, not a replica of it.
import * as THREE from 'three';
import { loadCountrysideModule, loadVegetationModule, glowTexture } from './game.js';

let Countryside = null, Vegetation = null;
export async function ensureCountryside() { if (!Countryside) ({ Countryside } = await loadCountrysideModule()); return Countryside; }
export async function ensureVegetation() { if (!Vegetation) ({ Vegetation } = await loadVegetationModule()); return Vegetation; }

/** Random that repeats, so a captured tile is the same tile every load. */
export function seeded(seed = 0x4d43) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const noop = () => {};

/** A Countryside with no constructor run: just the state the builders write to. */
export function gameKit(seed) {
  if (!Countryside) throw new Error('call ensureCountryside() first');
  const kit = Object.create(Countryside.prototype);
  return Object.assign(kit, {
    scene: new THREE.Group(), lanterns: [], colliders: [], collectibles: [], bambooFences: [], lanternHalos: [], offeringBells: [], toroSpots: [],
    lanternHaloTex: glowTexture(255, 214, 150), nestPos: new THREE.Vector3(), villageHouseColliders: { left: [], right: [] }, random: seeded(seed),
    addPlatform: noop, addOrientedPlatform: noop, addSlopedRoofPlatforms: noop, addBuildingWallColliders: noop, addCollider: noop
  });
}

export function vegetationKit(seed) {
  if (!Vegetation) throw new Error('call ensureVegetation() first');
  const kit = Object.create(Vegetation.prototype);
  return Object.assign(kit, {
    scene: new THREE.Group(), colliders: [], sakuraSpots: [[0, 0, 1]], dapplePools: [], dappleMeshes: [], random: seeded(seed),
    addCollider: noop, matBamboo: new THREE.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.6 })
  });
}

/** Give a built group its own materials so lab lighting can't touch the game's. */
export function ownMaterials(group) {
  const seen = new Map();
  group.traverse((o) => {
    if (!o.material) return;
    const list = [].concat(o.material).map((m) => { if (!seen.has(m)) seen.set(m, m.clone()); return seen.get(m); });
    o.material = list.length === 1 ? list[0] : list;
  });
  return group;
}

/** Wrap a game builder call: originalOf('buildTorii', 0, 0) -> a clean group. */
export function originalOf(method, ...args) {
  const kit = gameKit();
  kit[method](...args);
  return { group: ownMaterials(kit.scene), kit };
}
