// Builds the summit twice (classic, then the real modular kit) and records colliders, platforms, the next summit rng draw,
// the bound handles, the lantern heights and runtime problems. window.__parity = { classic, modular }.
import * as THREE from 'three';
import { SummitManager } from '../src/mountaintop.js?v=20261116a';
import { Sky } from '../src/sky.js?v=20261116a';
import { Player } from '../src/player.js?v=20261116a';
import { LANDING_Z1, LOWER_STEP_RUN } from '../src/summit/common.js?v=20261116a';
import { AssetRuntime } from '../src/kit/runtime.js?v=20261116a';

async function digest(set) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const assets = new AssetRuntime({ THREE, search: '?assets=' + set, quality: 'high' });
  await assets.preload();
  const sky = new Sky(scene), player = new Player(scene, camera, null);
  const game = { scene, camera, renderer: null, sky, player, vegetation: null, summitPreview: false, controls: {}, ui: {}, audio: null, assets,
    discover() {}, saveGame() {}, refreshCompassPois() {} };
  const s = new SummitManager(game);
  const v = new THREE.Vector3();
  // the second toro pair on the lower path, MEASURED from the built scene: the shallowest object whose world x/z sits on
  // the lantern spot, its world y relative to the summit origin (a2-hilltop; this used to be re-derived arithmetic)
  const lanternZ = LANDING_Z1 + 5.5 * LOWER_STEP_RUN;
  s.group.updateMatrixWorld(true);
  const measure = (side) => {
    let best = null;
    const walk = (o, depth) => {
      o.getWorldPosition(v);
      if (Math.abs(v.x - s.origin.x - side * 3.15) < 0.08 && Math.abs(v.z - s.origin.z - lanternZ) < 0.08 && (!best || depth < best.depth)) best = { depth, y: v.y - s.origin.y };
      for (const c of o.children) walk(c, depth + 1);
    };
    walk(s.group, 0);
    return best ? +best.y.toFixed(4) : null;
  };
  return {
    colliders: s.colliders.length, platforms: s.platforms.length, nextRng: s.rng(),
    binds: ['perchStone', 'furin', 'furinSail', 'furinClapper', 'torii', 'vistaApproach', 'lowerPath'].map((k) => [k, !!s[k]]),
    instances: assets.instances.map((i) => i.id).sort(), problems: assets.problems,
    toriiAt: s.torii.getWorldPosition(v.clone()).sub(s.origin).toArray().map((n) => +n.toFixed(3)),
    furinXZ: [s.furin.getWorldPosition(v.clone()).x - s.origin.x, s.furin.getWorldPosition(v.clone()).z - s.origin.z].map((n) => +n.toFixed(3)),
    lanternY: [-1, 1].map(measure),
    lanternYDerived: [-1, 1].map((side) => +(s.terrainHeightAt(side * 3.15, lanternZ) - 0.05).toFixed(4))
  };
}
window.__parity = { classic: await digest('classic'), modular: await digest('modular') };
