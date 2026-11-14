// mountains: the far ranges (Phase 2 v-ranges). One polar height-field ring
// whose material the sky tints each frame (bind: matHazeFar / matHazeMid ->
// part `far`). Its listed components (edge-forest, distant-village, mist-ring,
// dawn-mist and the pagoda) are placed by the Countryside, never built here.
import * as THREE from 'three';
import { ridgeRingGeometry, terrainHeight, valleyRangeColors } from './landform.js?v=20261113a';

// [around, rings] per tier; the game builds `far` (band far), the lab shows all three
export const RING_GRID = Object.freeze({ hero: [288, 120], mid: [224, 96], far: [192, 80] });

export function buildMountains(ctx, layout, p) {
  const [around, rings] = RING_GRID[ctx.tier] || RING_GRID.far;
  const heightAt = typeof layout.heightAt === 'function' ? layout.heightAt : terrainHeight;
  const geo = ridgeRingGeometry({
    around, rings, heightAt,
    colorAt: valleyRangeColors({ forest: p.forest, strata: p.strata, haze: p.haze }),
    cacheKey: layout.heightAt ? null : `valley|${p.forest}|${p.strata}|${p.haze}`
  });
  // the sky tints this colour every frame (Countryside.update), so it is its own material
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const far = new THREE.Mesh(geo, material);
  far.receiveShadow = false;
  far.frustumCulled = false; // the ring surrounds the camera; its sphere always contains it
  const group = new THREE.Group();
  group.add(far);
  return {
    group, parts: { far }, sockets: {}, live: [far],
    dispose() { geo.dispose(); material.dispose(); }
  };
}
