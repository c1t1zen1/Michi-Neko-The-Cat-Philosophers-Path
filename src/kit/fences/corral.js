// corral (buildBambooCorral): Larry's pen. The parent builds ONLY its own body
// (rule: a kit parent never builds its listed components): four heavy corner
// posts with rain-cap lashings that tie the four fence runs together. The
// four `bamboo-fence` runs, `corral-sign`, `jade-paw` and `larry` are placed by
// the Countryside as components; Larry's patrol bounds, the reward flag and the
// vegetation exclusion stay in the layout's footprint (countryside.js) and are
// registered from `layout.footprint` untouched.
import { defineAsset } from '../contract.js?v=20261113a';
import { culmGeometry, knotGeometry, FINISHES } from './culm.js?v=20261113a';

export const corral = defineAsset({
  id: 'corral', family: 'fences', lab: 'fences/corral',
  label: 'Bamboo corral (corner posts)',
  tiers: ['hero', 'mid', 'far'],
  params: {
    post_height: { type: 'number', default: 1.55, min: 1.3, max: 1.9, step: 0.05, label: 'Corner post height' },
    post_radius: { type: 'number', default: 0.075, min: 0.05, max: 0.11, step: 0.005, label: 'Corner post radius' },
    finish: { type: 'enum', default: 'straw', options: ['fresh', 'straw', 'weathered'], label: 'Bamboo age' }
  },
  sample: { x: 0, z: 0, width: 7.2, depth: 6.2, footprint: { colliders: [], platforms: [], exclusions: [{ x: 0, z: 0, width: 9.2, depth: 8.2 }], waterRects: [], anchors: {}, lists: {} } },
  build(ctx, layout, params) {
    const { THREE, kitMaterials: km, tier, rng } = ctx;
    const w = layout.width || 7.2, d = layout.depth || 6.2;
    const group = new THREE.Group();
    const o = new THREE.Object3D();
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    const posts = new THREE.InstancedMesh(culmGeometry(THREE, tier), km.bamboo({ color: FINISHES[params.finish], vcol: true, rough: 0.5 }), 4);
    const col = new THREE.Color();
    corners.forEach(([sx, sz], i) => {
      o.position.set(sx * w / 2, 0, sz * d / 2);
      o.rotation.set((rng() - 0.5) * 0.02, rng() * 6, (rng() - 0.5) * 0.02);
      o.scale.set(params.post_radius, params.post_height, params.post_radius);
      o.updateMatrix(); posts.setMatrixAt(i, o.matrix);
      const v = 0.92 + rng() * 0.12; posts.setColorAt(i, col.setRGB(v, v, v * 0.95));
    });
    posts.instanceMatrix.needsUpdate = true; if (posts.instanceColor) posts.instanceColor.needsUpdate = true;
    posts.castShadow = posts.receiveShadow = true; posts.userData.sharedGeometry = true;
    group.add(posts);
    const parts = { corner_posts: posts };
    if (tier !== 'far') {
      // two cord lashings per post: below the cap and at the fence-rail height
      const lash = new THREE.InstancedMesh(knotGeometry(THREE, tier), km.plain(0x2a2017, { rough: 1 }), 8);
      let k = 0;
      for (const [sx, sz] of corners) for (const y of [0.82, params.post_height - 0.12]) {
        o.position.set(sx * w / 2, y, sz * d / 2); o.rotation.set(Math.PI / 2, 0, 0); o.scale.setScalar(params.post_radius * 1.15);
        o.updateMatrix(); lash.setMatrixAt(k++, o.matrix);
      }
      lash.instanceMatrix.needsUpdate = true; lash.castShadow = true; lash.userData.sharedGeometry = true;
      group.add(lash); parts.lashings = lash;
    }
    return { group, parts };
  }
});
