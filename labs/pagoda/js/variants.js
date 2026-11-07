// Pagoda variants for the lab — 7 distinct approaches to building a five-storey pagoda.
import {
  buildOriginalPagoda, buildCorrectSorin, buildKumimonoCluster, buildCurvedEaveRoof,
  buildPainterlyPagoda, buildWireframePagoda, buildTojiPagoda, box, makeMaterials
} from './pagoda.js';

const M = makeMaterials();

export const VARIANTS = [
  {
    id: 'original',
    name: 'Original Game',
    slug: 'original',
    builder: (scale) => buildOriginalPagoda(M, scale),
    desc: 'The current src/countryside.js builder, reproduced exactly in this lab.',
    how: [
      'Five box bodies, narrowing from 4.55 to 2.68 m',
      'Vermilion posts frame each story',
      'Four-sided cone roofs (rotated 45°)',
      'Box eave edges + upturned corner pieces',
      'Sōrin: eight stacked discs + shaft + jewel'
    ],
    code: 'pagoda.add(box(4.55*s, 2.2*s, 4.55*s, warmWall, 0, y+1.1*s, 0));\nconst roof = new THREE.Mesh(\n  new THREE.ConeGeometry(span/Math.SQRT2, roofH, 4),\n  roofTileDark);\nroof.rotation.y = Math.PI/4;'
  },
  {
    id: 'correct-sorin',
    name: 'Correct Sōrin',
    slug: 'correct-sorin',
    builder: (scale) => buildCorrectSorin(M, scale),
    desc: 'The complete nine-part sōrin per Rachel Stull\'s research.',
    how: [
      'Hōju (jewel) at the very top',
      'Ryūsha (dragon wheel)',
      'Suien (water flame)',
      'Fūtaku (wind bells)',
      'Kurin (nine rings)',
      'Ukebana (upturned lotus, eight petals)',
      'Fukubachi (inverted bowl)',
      'Roban (base ring)'
    ],
    code: '// Kurin: nine rings\nfor (let i = 0; i < 9; i++) {\n  const ring = new THREE.Mesh(\n    new THREE.TorusGeometry(\n      (0.22 - i * 0.018) * scale, 0.02 * scale, 8, 16),\n    bronzeMat);\n  ring.rotation.x = Math.PI / 2;\n  ring.position.y = y + i * 0.15 * scale;\n  g.add(ring);\n}'
  },
  {
    id: 'kumimono',
    name: 'Kumimono Clusters',
    slug: 'kumimono',
    builder: (scale) => buildKumimonoCluster(M, scale),
    desc: 'Silhouette bracket clusters (kumimono) at each eave corner.',
    how: [
      'Stacked masu (blocks) and hijiki (arms)',
      'Simplified to 5 tiers for silhouette read',
      'Instanced at each eave corner',
      'Just enough detail to read at distance'
    ],
    code: 'function buildKumimonoCluster(scale) {\n  const g = new THREE.Group();\n  g.add(box(0.4*s, 0.08*s, 0.4*s, wood));\n  g.add(box(0.5*s, 0.06*s, 0.06*s, wood, 0, 0.04*s, 0));\n  g.add(box(0.35*s, 0.07*s, 0.35*s, wood, 0, 0.08*s, 0));\n  return g;\n}'
  },
  {
    id: 'curved-eaves',
    name: 'Curved Eaves',
    slug: 'curved-eaves',
    builder: (scale) => buildCurvedEaveRoof(M, 4, 0.8, 0.2, scale),
    desc: 'Eaves using CatmullRom splines for the signature upward curve.',
    how: [
      'CatmullRomCurve3 defines the eave profile',
      'Parabola weight increases toward eave ends',
      'BufferGeometry from the spline points',
      'Two sides (front and back)'
    ],
    code: 'const points = [];\nfor (let i = 0; i <= 20; i++) {\n  const t = i / 20;\n  const x = (t - 0.5) * width;\n  const curve = Math.pow(Math.abs(t - 0.5) * 2, 2);\n  points.push(new THREE.Vector3(x, curve * 0.15, 0));\n}\nconst spline = new THREE.CatmullRomCurve3(points);'
  },
  {
    id: 'painterly',
    name: 'Painterly',
    slug: 'painterly',
    builder: (scale) => buildPainterlyPagoda(M, scale),
    desc: 'Flat, high-contrast colors in the Ghibli/Kyoto Animation style.',
    how: [
      'MeshBasicMaterial (no lighting)',
      'Bold black eave lines',
      'High-contrast palette',
      'No PBR textures needed'
    ],
    code: 'const paintWood = new THREE.MeshBasicMaterial(\n  { color: 0x8B5E3C });\nconst paintRoof = new THREE.MeshBasicMaterial(\n  { color: 0x3C4A52 });\nconst paintEave = new THREE.MeshBasicMaterial(\n  { color: 0x1E2A30 });'
  },
  {
    id: 'wireframe',
    name: 'Wireframe Silhouette',
    slug: 'wireframe',
    builder: (scale) => buildWireframePagoda(M, scale),
    desc: 'Wireframe outline for distant skyline visibility.',
    how: [
      'THREE.Wireframe from BoxGeometry',
      'Bold eave lines (linewidth: 2)',
      'Sōrin as simple line',
      'Use for >200 m distance'
    ],
    code: 'const bodyGeo = new THREE.BoxGeometry(w*0.55, h, w*0.55);\nconst bodyWire = new THREE.Wireframe(bodyGeo);\nconst bodyLine = new THREE.LineSegments(bodyWire, wireMat);\npagoda.add(bodyLine);'
  },
  {
    id: 'toji-proportions',
    name: 'Tō-ji Proportions',
    slug: 'toji-proportions',
    builder: (scale) => buildTojiPagoda(M, scale),
    desc: 'Built to the real Tō-ji pagoda proportions (54.8 m).',
    how: [
      'Height:width ratio 5.1:1',
      'Sōrin is 1/3.4 of total height',
      'Tapering: 0.82^n per storey',
      'First floor 9.48 m wide'
    ],
    code: 'const firstFloorW = 9.48 * scale;\nconst totalH = 54.8 * scale;\nconst sorinH = totalH / 3.4;\nfor (let i = 0; i < 5; i++) {\n  const tierScale = Math.pow(0.82, i);\n  const w = firstFloorW * tierScale;\n  // ... build tier ...'
  }
];

export function getVariant(id) {
  return VARIANTS.find(v => v.id === id);
}