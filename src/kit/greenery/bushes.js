// Street bushes + roadside moss (Phase 2 v-greenery). Lab 15 "karikomi": the
// street keeps two shapes of green, free lumpy shrubs and clipped cushions.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createFoliageMaterial, leafMassTexture, bushGeometry } from '../../foliage.js?v=20261113a';

// per-tier [icosphere detail, lobes] of a bush; hero is the classic shape
export const BUSH_DETAIL = Object.freeze({ hero: [2, 8], mid: [1, 8], far: [0, 5] });

export function buildStreetBushes(ctx, layout, p) {
  const { THREE: T, tier, rng } = ctx;
  const [detail, lobes] = BUSH_DETAIL[tier] || BUSH_DETAIL.mid;
  const mat = createFoliageMaterial({
    sss: 0.3, wind: 0.9, rustle: 1.0, mottle: 0.2, bump: 0.45, vertexColors: true,
    massMap: leafMassTexture('leaf'), massScale: 1 / 0.55, ragged: 1
  });
  const freeGeo = bushGeometry(1 + Math.floor(rng() * 9000), { lobes, detail, lump: p.lump });
  const clipGeo = bushGeometry(1 + Math.floor(rng() * 9000), { lobes: Math.max(4, lobes - 2), detail, lump: p.lump * 0.4 });
  const bushes = layout.bushes || [];
  const kind = bushes.map(() => (rng() < p.clipped ? 1 : 0));
  const dummy = new T.Object3D();
  const col = new T.Color();
  const group = new T.Group();
  const parts = {};
  [['bushes', freeGeo, 0], ['karikomi', clipGeo, 1]].forEach(([key, geo, k]) => {
    const list = bushes.filter((_, i) => kind[i] === k);
    const mesh = new T.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((b, i) => {
      // sunk a hair so the lowest lobe is seated in the ground
      dummy.position.set(b.position[0], b.position[1] - b.scale[1] * 0.3, b.position[2]);
      // clipped cushions are flatter-topped and a little rounder in plan
      const s = k ? [b.scale[0] * 0.92, b.scale[1] * 0.85, b.scale[2] * 0.92] : b.scale;
      dummy.scale.set(...s);
      dummy.rotation.set(0, b.ry, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, col.setHex(b.tint).offsetHSL(0, 0, b.light * (k ? 0.6 : 1)));
    });
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    parts[key] = mesh;
  });
  // live: the foliage sway/rustle shader is driven by Countryside.update() through bushMat
  return { group, parts, sockets: {}, live: [parts.bushes, parts.karikomi], dispose() { mat.dispose(); } };
}

/* ------------------------------------------------------------ roadside moss --- */

const SEG = { hero: 14, mid: 10, far: 6 };

/** One lumpy moss pillow: a domed disc of two rings, baked at its place. */
function mossPatch(T, rng, n, [x, y, z], [sx, , sz], yaw) {
  const pos = [], uv = [], idx = [];
  const wob = Array.from({ length: n }, () => 0.82 + rng() * 0.3);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const put = (lx, ly, lz) => {
    const px = lx * sx, pz = lz * sz;
    pos.push(x + px * cy + pz * sy, y - 0.03 + ly, z - px * sy + pz * cy);
    uv.push(lx * 0.5 + 0.5, lz * 0.5 + 0.5);
  };
  put(0, 0.07, 0);
  for (const [r, h] of [[0.55, 0.045], [1, 0.0]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, rr = r * wob[i];
      put(Math.cos(a) * rr, h, Math.sin(a) * rr);
    }
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(0, 1 + j, 1 + i);
    idx.push(1 + i, 1 + j, 1 + n + j, 1 + i, 1 + n + j, 1 + n + i);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildRoadsideMoss(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const n = SEG[tier] || 10;
  const list = (layout.patches || []).map((q) => {
    const k = p.size;
    return mossPatch(T, rng, n, q.position, [q.scale[0] * k, 1, q.scale[2] * k], q.rz);
  });
  const group = new T.Group();
  const parts = {};
  if (list.length) {
    const geo = mergeGeometries(list);
    for (const g of list) g.dispose();
    const mesh = new T.Mesh(geo, km.moss({ a: p.dark, b: p.light }));
    mesh.receiveShadow = true;
    group.add(mesh);
    parts.moss = mesh;
  } else { const e = new T.Group(); group.add(e); parts.moss = e; }
  return { group, parts, sockets: {}, live: [] };
}
