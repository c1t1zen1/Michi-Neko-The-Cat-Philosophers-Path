// Builds the summit twice (classic, then the real modular kit) and records colliders, platforms, the next summit rng draw,
// the bound handles, the lantern heights and runtime problems. window.__parity = { classic, modular }.
import * as THREE from 'three';
import { SummitManager } from '../src/mountaintop.js?v=20261113a';
import { Sky } from '../src/sky.js?v=20261113a';
import { Player } from '../src/player.js?v=20261113a';
import { AssetRuntime } from '../src/kit/runtime.js?v=20261113a';

async function digest(set) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const assets = new AssetRuntime({ THREE, search: '?assets=' + set, quality: 'high' });
  await assets.preload();
  const sky = new Sky(scene), player = new Player(scene, camera, null);
  const game = { scene, camera, renderer: null, sky, player, vegetation: null, summitPreview: false, controls: {}, ui: {}, audio: null, assets,
    discover() {}, saveGame() {}, refreshCompassPois() {} };
  const s = new SummitManager(game);
  const v = new THREE.Vector3();
  const lanterns = [];
  s.lowerPath && s.lowerPath.traverse((o) => { if (/toro|lantern|Lantern/i.test(o.name) || (o.userData.asset && o.userData.asset.id === 'toro')) lanterns.push(o.getWorldPosition(v.clone()).y - s.origin.y); });
  return {
    colliders: s.colliders.length, platforms: s.platforms.length, nextRng: s.rng(),
    binds: ['perchStone', 'furin', 'furinSail', 'furinClapper', 'torii', 'vistaApproach', 'lowerPath'].map((k) => [k, !!s[k]]),
    instances: assets.instances.map((i) => i.id).sort(), problems: assets.problems,
    toriiAt: s.torii.getWorldPosition(v.clone()).sub(s.origin).toArray().map((n) => +n.toFixed(3)),
    furinXZ: [s.furin.getWorldPosition(v.clone()).x - s.origin.x, s.furin.getWorldPosition(v.clone()).z - s.origin.z].map((n) => +n.toFixed(3)),
    lanternY: [-1, 1].map((side) => +(s.terrainHeightAt(side * 3.15, 20.6 + 0.35 + 5.5 * 1.7) - 0.05).toFixed(4))
  };
}
window.__parity = { classic: await digest('classic'), modular: await digest('modular') };
