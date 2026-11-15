// The basin under the summit: the assembly the layers go into (summit-vista),
// the river and street ribbons draped on the ground (vista-terrain) and
// Kyoto's roofs, gardens and window lights (kyoto-city).
//
// Seen from 0.5 to 5 km, so a house is a few pixels: what carries is the
// silhouette (a hipped roof with a ridge, a deep eave), the colour scatter,
// the dark seams of the streets and, after dusk, the lights. Windows come on in
// a wave that starts at the river (a per-point threshold in the point shader,
// read against the opacity the summit's sky drives), so the city kindles
// rather than flipping on.
//
// The summit drives the colours of these meshes by manager field (the classic
// shapes), so the anchors below carry the materials, instanced meshes and
// counts it reads: cityWalls/Roofs/Eaves, cityInstanceMax, city*Mat,
// cityLights, cityLightMat, cityGardens, cityGardenMax, cityGardenMat,
// vistaRiverMat and vistaRoadMat.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainY, riverX, clamp01, pick, seedOf, glowSprite, lumpGeometry, disposeAll } from './ground.js?v=20261113a';

const dummy = new THREE.Object3D();
const mk = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = m.receiveShadow = false; return m; };

/* ------------------------------------------------------------ summit-vista */

export function buildVistaAssembly() {
  const group = new THREE.Group();
  const layers = new THREE.Group();
  group.add(layers);
  return { group, parts: { layers }, sockets: {}, live: [], dispose() {} };
}

/* ----------------------------------------------------------- vista-terrain */

export function buildVistaTerrain(ctx, layout, p) {
  const { tier } = ctx;
  const group = new THREE.Group();
  // river: a ribbon that widens toward the bay, draped over the basin
  const rw = pick(tier, 5, 4, 3), rl = pick(tier, 44, 32, 20);
  const riverGeo = new THREE.PlaneGeometry(12, 132, rw, rl);
  riverGeo.rotateX(-Math.PI / 2);
  const rp = riverGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const z = rp.getZ(i) + 104, across = rp.getX(i);
    const width = (0.72 + clamp01((z - 38) / 145) * 0.68) * p.river_width;
    const x = riverX(z) + across * width;
    rp.setXYZ(i, x, terrainY(x, z) + 0.14, z);
  }
  riverGeo.computeVertexNormals();
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x83bed1, emissive: 0x173d4c, emissiveIntensity: 0.12, roughness: 0.3, metalness: 0.04 });
  const river = mk(riverGeo, riverMat, 'river');
  river.renderOrder = 1;
  group.add(river);

  // twelve ribbons of street (six long avenues, five cross streets), merged into one draw
  const list = [];
  const seg = pick(tier, 28, 18, 10), segX = pick(tier, 36, 24, 12);
  for (const [x, yaw, width] of [[-69, -0.06, 1.1], [-43, 0.045, 0.72], [-4, -0.025, 0.9], [26, 0.055, 0.76], [57, -0.04, 1.0], [83, 0.025, 0.68]]) {
    const g = new THREE.PlaneGeometry(width * p.road_width, 126, 1, seg);
    g.rotateX(-Math.PI / 2);
    const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const z = pp.getZ(i) + 108, rx = x + pp.getX(i) + (z - 108) * yaw;
      pp.setXYZ(i, rx, terrainY(rx, z) + 0.2, z);
    }
    list.push(g);
  }
  for (const [z, width] of [[57, 0.7], [78, 0.55], [101, 0.8], [128, 0.62], [154, 0.72]]) {
    const g = new THREE.PlaneGeometry(190, width * p.road_width, segX, 1);
    g.rotateX(-Math.PI / 2);
    const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), rz = z + pp.getZ(i);
      pp.setXYZ(i, x, terrainY(x, rz) + 0.21, rz);
    }
    list.push(g);
  }
  for (const g of list) { g.deleteAttribute('uv'); }
  const roadGeo = mergeGeometries(list);
  for (const g of list) g.dispose();
  roadGeo.computeVertexNormals();
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xb9ad8c, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const roads = mk(roadGeo, roadMat, 'roads');
  group.add(roads);
  return {
    group, parts: { river, roads }, sockets: {}, live: [],
    footprint: { colliders: layout.footprint?.colliders || [], platforms: layout.footprint?.platforms || [], exclusions: [], anchors: { vistaRiverMat: riverMat, vistaRoadMat: roadMat } },
    dispose() { disposeAll([riverGeo, roadGeo, riverMat, roadMat]); }
  };
}

/* -------------------------------------------------------------- kyoto-city */

/** A hipped roof with a short ridge along x: base 1 x 1 at y 0, ridge at y 1. Flat-shaded faces. */
function hipRoofGeometry(ridge = 0.34) {
  const b = 0.5, r = ridge / 2;
  const A = [-b, 0, -b], B = [b, 0, -b], C = [b, 0, b], D = [-b, 0, b], E = [-r, 1, 0], F = [r, 1, 0];
  const tris = [[A, B, F], [A, F, E], [B, C, F], [C, D, E], [C, E, F], [D, A, E]];
  const pos = [];
  for (const t of tris) for (const v of t) pos.push(...v);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

const WALLS = [0xd3c39e, 0xc4b48f, 0xd9cfb5, 0xb9aa89];
const ROOFS = [0x495967, 0x5a6570, 0x3f4e5a, 0x68727b];
const GREENS = [0x315e35, 0x47783d, 0x5f8d49, 0x7a9c50, 0xb98192];

export function buildKyotoCity(ctx, layout, p) {
  const { tier, rng } = ctx;
  const count = Math.round(pick(tier, 920, 700, 460) * p.density);
  const treeCount = Math.round(pick(tier, 360, 260, 160) * p.gardens);
  const wallGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofGeo = hipRoofGeometry();
  const eaveGeo = tier === 'hero' ? new THREE.BoxGeometry(1, 1, 1) : null;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc7b995, roughness: 0.92, metalness: 0 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x53616c, roughness: 0.86, metalness: 0.02 });
  const eaveMat = eaveGeo ? new THREE.MeshStandardMaterial({ color: 0x3d4b56, roughness: 0.9, metalness: 0.01 }) : null;
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, count);
  const roofs = new THREE.InstancedMesh(roofGeo, roofMat, count);
  const eaves = eaveGeo ? new THREE.InstancedMesh(eaveGeo, eaveMat, count) : null;
  const col = new THREE.Color(), roofCol = new THREE.Color();
  const lights = [], wave = [];
  let placed = 0, halls = 0;
  for (let guard = 0; placed < count && guard < count * 12; guard++) {
    const z = 42 + Math.pow(rng(), 0.78) * 118;
    const halfW = 34 + (z - 42) * 0.72;
    const x = (rng() - 0.5) * halfW * 2;
    const river = riverX(z);
    if (Math.abs(x - river) < 8.5 || Math.abs(x) > halfW) continue;
    // keep several roads and the central temple sightline legible
    if (Math.abs(((x + 8) % 26 + 26) % 26 - 13) < 1.15) continue;
    if (Math.abs(((z - 50) % 23 + 23) % 23 - 11.5) < 0.8) continue;
    if (z < 73 && Math.abs(x - 17) < 9) continue;
    const near = 1 - clamp01((z - 42) / 126);
    // about one lot in seventy is a temple hall: a long low plaster body under a tall dark roof
    const hall = rng() < 0.014;
    let w = 0.85 + rng() * (1.25 + near * 0.8), d = 0.86 + rng() * (1.3 + near * 0.72), h = 0.68 + rng() * (1.05 + near * 1.1);
    if (hall) { w *= 2.3; d *= 1.9; h *= 0.9; halls++; }
    const y = terrainY(x, z);
    const yaw = (rng() - 0.5) * 0.16 + (rng() < 0.18 ? Math.PI / 2 : 0);
    // a machiya ridge runs along the street: the long side of the lot
    const alongX = w >= d;
    dummy.position.set(x, y + h * 0.5, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(w, h, d); dummy.updateMatrix();
    walls.setMatrixAt(placed, dummy.matrix);
    walls.setColorAt(placed, col.setHex(hall ? 0xe1dac6 : WALLS[Math.floor(rng() * 4)]));
    const roofH = (0.34 + near * 0.16) * (hall ? 1.7 : 1);
    if (eaves) {
      dummy.position.set(x, y + h + 0.045, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(w * 1.1, 0.09 + near * 0.035, d * 1.1); dummy.updateMatrix();
      eaves.setMatrixAt(placed, dummy.matrix);
    }
    dummy.position.set(x, y + h + 0.06, z); dummy.rotation.set(0, yaw + (alongX ? 0 : Math.PI / 2), 0);
    dummy.scale.set(alongX ? w * 1.1 : d * 1.1, roofH, alongX ? d * 1.1 : w * 1.1); dummy.updateMatrix();
    roofs.setMatrixAt(placed, dummy.matrix);
    roofCol.setHex(hall ? 0x34424d : ROOFS[Math.floor(rng() * 4)]);
    roofs.setColorAt(placed, roofCol);
    if (eaves) eaves.setColorAt(placed, roofCol.multiplyScalar(0.76));
    if (rng() < 0.68) {
      const side = rng() < 0.5 ? -1 : 1;
      lights.push(x + side * w * 0.36, y + h * (0.42 + rng() * 0.28), z - d * 0.51);
      if (near > 0.36 && rng() < 0.46) lights.push(x - side * w * 0.28, y + h * (0.45 + rng() * 0.22), z - d * 0.515);
    }
    placed++;
  }
  for (const m of [walls, roofs, eaves]) {
    if (!m) continue;
    m.count = placed; m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = m.receiveShadow = false;
  }
  walls.name = 'walls'; roofs.name = 'roofs'; if (eaves) eaves.name = 'eaves';

  // window lights: additive points that come on from the river outward
  for (let i = 0; i < lights.length; i += 3) wave.push(clamp01(Math.abs(lights[i] - riverX(lights[i + 2])) / 80));
  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lights), 3));
  lightGeo.setAttribute('aWave', new THREE.BufferAttribute(new Float32Array(wave), 1));
  const glow = glowSprite('255,205,112', 64);
  const lightMat = new THREE.PointsMaterial({
    map: glow, color: new THREE.Color().setRGB(1, 0.77 + 0.1 * p.lamp, 0.44 + 0.3 * p.lamp), size: 0.8, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false
  });
  lightMat.customProgramCacheKey = () => 'vista-city-lights';
  lightMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute float aWave;\nvarying float vWave;\nvoid main() {\n  vWave = aWave;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vWave;\nvoid main() {')
      .replace('#include <map_particle_fragment>', '#include <map_particle_fragment>\n  diffuseColor.a *= smoothstep(vWave * 0.5, vWave * 0.5 + 0.3, opacity * 1.4);');
  };
  const cityLights = new THREE.Points(lightGeo, lightMat);
  cityLights.name = 'lights'; cityLights.visible = false; cityLights.renderOrder = 2;

  // temple and machiya gardens: painted blobs of leaf, scattered under the roofs
  const parts = { walls, roofs, lights: cityLights };
  if (eaves) parts.eaves = eaves;
  const group = new THREE.Group();
  group.add(walls);
  if (eaves) group.add(eaves);
  group.add(roofs, cityLights);
  let gardens = null, gardenGeo = null, gardenMat = null;
  if (treeCount > 0) {
    gardenGeo = lumpGeometry(pick(tier, 1, 0, 0), seedOf(rng), 0.24);
    gardenMat = new THREE.MeshStandardMaterial({ color: 0x6f9a55, roughness: 0.95 });
    gardens = new THREE.InstancedMesh(gardenGeo, gardenMat, treeCount);
    for (let i = 0; i < treeCount; i++) {
      const z = 43 + rng() * 126, halfW = 31 + (z - 43) * 0.7, x = (rng() - 0.5) * halfW * 2;
      const s = 0.45 + rng() * (1.25 + (1 - clamp01((z - 43) / 130)) * 0.8);
      dummy.position.set(x, terrainY(x, z) + s * 0.72, z); dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(s, s * (0.72 + rng() * 0.45), s); dummy.updateMatrix();
      gardens.setMatrixAt(i, dummy.matrix);
      gardens.setColorAt(i, col.setHex(GREENS[Math.floor(rng() * 5)]));
    }
    gardens.instanceMatrix.needsUpdate = true; gardens.instanceColor.needsUpdate = true;
    gardens.name = 'gardens'; gardens.castShadow = gardens.receiveShadow = false;
    group.add(gardens); parts.gardens = gardens;
  }
  const anchors = {
    cityWalls: walls, cityRoofs: roofs, cityInstanceMax: placed, cityWallMat: wallMat, cityRoofMat: roofMat,
    cityLights, cityLightMat: lightMat
  };
  if (eaves) { anchors.cityEaves = eaves; anchors.cityEaveMat = eaveMat; }
  if (gardens) { anchors.cityGardens = gardens; anchors.cityGardenMax = treeCount; anchors.cityGardenMat = gardenMat; }
  return {
    group, parts, sockets: {}, live: [], halls,
    footprint: { colliders: layout.footprint?.colliders || [], platforms: layout.footprint?.platforms || [], exclusions: [], anchors },
    dispose() { disposeAll([wallGeo, roofGeo, eaveGeo, wallMat, roofMat, eaveMat, lightGeo, lightMat, glow, gardenGeo, gardenMat]); }
  };
}
