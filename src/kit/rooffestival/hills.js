// roof-hills: the ring of hills around the basin (rooftops/js/sky.js buildHills). Same ring, same profile
// (the five fires stand on it: roof-okuribi uses hillHeight), with more rows and segments, ridge noise
// and a darker cedar band in vertex colour. One mesh, one private Lambert material (Sky tints it with the night).
import { defineAsset } from '../contract.js?v=20261114a';
import { hillHeight, hashCloud, disposeTree } from './fx.js?v=20261114a';

const GRID = { hero: [384, 6], mid: [192, 4], far: [96, 2] };

function buildHills(ctx, layout) {
  const T = ctx.THREE, [seg, rows] = GRID[ctx.tier] || GRID.mid, c = layout.center, R = layout.ringR;
  const pos = [], col = [], idx = [];
  const cNear = new T.Color(0x3a4a3c), cFar = new T.Color(0x6f7f86), cCedar = new T.Color(0x26382c), tmp = new T.Color();
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, h = hillHeight(a);
    for (let r = 0; r <= rows; r++) {
      const k = r / rows, rad = R * (1 + k * 0.35);
      const ridge = k > 0 && k < 1 ? 1 + 0.05 * Math.sin(a * 41 + k * 5) * k + 0.03 * Math.sin(a * 97 + 2) * k : 1;
      const y = k === 0 ? -1 : h * (k < 1 ? Math.sin(k * Math.PI * 0.5) : 1) * (0.7 + 0.3 * k) * (ctx.tier === 'hero' ? ridge : 1);
      pos.push(c.x + Math.cos(a) * rad, y, c.z + Math.sin(a) * rad);
      tmp.copy(cNear).lerp(cFar, k * 0.6);
      if (ctx.tier !== 'far') {
        const band = Math.max(0, 1 - Math.abs(k - 0.35) / 0.3);          // the cedar slope band
        tmp.lerp(cCedar, band * 0.55 * (0.5 + hashCloud(i * 0.37 + r)));
        tmp.multiplyScalar(0.92 + 0.16 * hashCloud(i * 1.7 + r * 9.1));
      }
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < seg; i++) for (let r = 0; r < rows; r++) {
    const a = i * (rows + 1) + r, b = a + rows + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  const mesh = new T.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const group = new T.Group();
  group.add(mesh);
  return { group, parts: { hills: mesh }, hillMat: mat, sockets: {}, live: [], dispose() { disposeTree(group); } };
}

export const hillsAsset = defineAsset({
  id: 'roof-hills', family: 'rooffestival', lab: 'roofroad/hills', label: 'Basin hills', tiers: ['hero', 'mid', 'far'],
  sample: { x: -13, y: 0, z: -57, ry: 0, index: 0, band: 'near', center: { x: -13, z: -57 }, ringR: 430 },
  build: buildHills
});
