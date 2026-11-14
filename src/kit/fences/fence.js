// bamboo-fence (buildBambooFence): one takegaki run. Closely set verticals
// lashed to two rails, thick posts at both ends, a dark cord knot at every
// crossing. Slats, rails and posts are ONE InstancedMesh of the shared culm
// (part `culms`); the lashings are a second one (part `knots`).
//
// Layout (countryside.js layoutBambooFence): x, z, ry, len, fenceHeight,
// tilts[n + 1], colliderHeight, role, footprint. The footprint and the
// bambooFences list entry are the layout's own; nothing here changes them.
import { defineAsset } from '../contract.js?v=20261113a';
import { culmGeometry, knotGeometry, bake, FINISHES } from './culm.js?v=20261113a';

const RAILS = [0.32, 0.82];

/** The tilts the classic builder drew, or a quiet default when a layout has none. */
function tiltsFor(layout, n, rng) {
  if (Array.isArray(layout.tilts) && layout.tilts.length === n + 1) return layout.tilts;
  return Array.from({ length: n + 1 }, () => (rng() - 0.5) * 0.06);
}

export const bambooFence = defineAsset({
  id: 'bamboo-fence', family: 'fences', lab: 'fences/yotsume',
  label: 'Bamboo fence (takegaki run)',
  tiers: ['hero', 'mid', 'far'],
  params: {
    finish: { type: 'enum', default: 'straw', options: ['fresh', 'straw', 'weathered'], label: 'Bamboo age' },
    thickness: { type: 'number', default: 1, min: 0.8, max: 1.3, step: 0.05, label: 'Culm thickness' },
    lean: { type: 'number', default: 1, min: 0, max: 2, step: 0.1, label: 'Lean of the verticals' },
    lashing: { type: 'boolean', default: true, label: 'Cord lashings' }
  },
  sample: () => {
    const len = 3.4, n = Math.floor(len / 0.16);
    return {
      name: 'Takegaki Fence 1', len, fenceHeight: 1.35, role: 'decorative',
      tilts: Array.from({ length: n + 1 }, (_, i) => Math.sin(i * 12.9898) * 0.03),
      footprint: { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: { bambooFences: [{ mesh: { $part: '.' }, role: 'decorative', connects: [] }] } }
    };
  },
  legacyName: 'Takegaki Fence',
  build(ctx, layout, params) {
    const { THREE, kitMaterials: km, tier, rng } = ctx;
    const len = layout.len || 3, h = layout.fenceHeight || 1.35;
    const n = Math.max(1, Math.floor(len / 0.16));
    const tilts = tiltsFor(layout, n, rng);
    const group = new THREE.Group();
    const culmGeo = culmGeometry(THREE, tier);
    const mat = km.bamboo({ color: FINISHES[params.finish], vcol: true, rough: 0.5 });

    // --- culms: rails (a rail's base is its right end: rotated 90 degrees about z it points to -x), then verticals (end ones are the thick posts)
    const list = [];
    const thick = params.thickness;
    for (const y of RAILS) list.push({ x: len / 2, y, z: -0.01, rz: Math.PI / 2, r: 0.045 * thick, l: len });
    const _v = new THREE.Vector3(), _e = new THREE.Euler();
    for (let i = 0; i <= n; i++) {
      const sx = -len / 2 + i * (len / n), post = i === 0 || i === n;
      const ph = h;
      const tilt = post ? 0 : tilts[i] * params.lean;
      // classic slats tilt about their middle; place the culm's base so the middle stays put
      _e.set(tilt, 0, 0);
      _v.set(0, -ph / 2, 0).applyEuler(_e);
      list.push({ x: sx + _v.x, y: ph / 2 + _v.y, z: _v.z, rx: tilt, r: (post ? 0.05 : 0.032) * thick, l: ph });
    }
    const objs = [], tints = [];
    for (const c of list) {
      const o = new THREE.Object3D();
      o.position.set(c.x, c.y, c.z); o.rotation.set(c.rx || 0, 0, c.rz || 0); o.scale.set(c.r, c.l, c.r); o.updateMatrix();
      objs.push(o);
      const v = 0.9 + rng() * 0.16;
      tints.push([v, v * (0.97 + rng() * 0.05), v * 0.94]);
    }
    // baked into one plain indexed mesh on a merge-able material (see culm.js bake)
    const culms = new THREE.Mesh(bake(THREE, culmGeo, objs, tints), mat);
    culms.castShadow = culms.receiveShadow = true;
    culms.name = 'culms';
    group.add(culms);
    const parts = { culms };

    // --- cord lashings at every rail crossing (not on the far tier)
    if (params.lashing && tier !== 'far') {
      const kg = knotGeometry(THREE, tier);
      const kmat = km.plain(0x2a2017, { rough: 1 });
      const ko = [];
      for (let i = 0; i <= n; i++) {
        const sx = -len / 2 + i * (len / n);
        for (const y of RAILS) {
          const o = new THREE.Object3D();
          o.position.set(sx, y, 0.012 * (i % 2 ? 1 : -1));
          o.rotation.set(Math.PI / 2, 0, rng() * 3);
          o.scale.setScalar(0.05 * thick);
          o.updateMatrix(); ko.push(o);
        }
      }
      const knots = new THREE.Mesh(bake(THREE, kg, ko), kmat);
      knots.castShadow = true;
      knots.name = 'knots';
      group.add(knots);
      parts.knots = knots;
    }
    return { group, parts };
  }
});
