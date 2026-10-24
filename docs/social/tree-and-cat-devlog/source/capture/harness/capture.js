import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { barkTextures, texturedMaterial } from '../src/textures.js';
import {
  foliageUniforms,
  createFoliageMaterial,
  createFoliageDepthMaterial,
  leafSprayTexture,
  leafMassTexture,
  bushGeometry,
  buildCanopy,
  updateFoliage
} from '../src/foliage.js';
import { Vegetation } from '../src/vegetation.js';
import { getCatAnatomy, BUILDS, GROUND } from '../src/cat_anatomy.js';
import { Cat } from '../src/cat.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot') || 'tree_v5_hero';
const W = parseInt(params.get('w') || '1080', 10);
const H = parseInt(params.get('h') || '1080', 10);
const FPS = parseInt(params.get('fps') || '30', 10);
const FRAMES = parseInt(params.get('frames') || '72', 10);

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true
});
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 160);

const hemi = new THREE.HemisphereLight(0xfff5e8, 0x4b5c43, 0.92);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.55);
keyLight.position.set(5.5, 8.5, 6.0);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x9ec5ff, 0.62);
rimLight.position.set(-5.0, 4.2, -5.5);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xffd7b8, 0.38);
fillLight.position.set(-3.2, 2.0, 4.8);
scene.add(fillLight);

let contactShadowTex = null;
function getContactShadowTexture() {
  if (contactShadowTex) return contactShadowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0, 'rgba(18, 26, 14, 0.48)');
  g.addColorStop(0.55, 'rgba(18, 26, 14, 0.22)');
  g.addColorStop(1, 'rgba(18, 26, 14, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  contactShadowTex = new THREE.CanvasTexture(c);
  return contactShadowTex;
}

function makeGroundPedestal(radius = 2.45, colorTop = 0x5c7a3e, colorRim = 0x3b4d28) {
  const grp = new THREE.Group();
  const discGeo = new THREE.CylinderGeometry(radius, radius * 1.04, 0.14, 48);
  const discMat = new THREE.MeshStandardMaterial({ color: colorTop, roughness: 0.92 });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = -0.07;
  grp.add(disc);

  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 1.55, radius * 1.55),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.002;
  grp.add(shadowDisc);

  const ringGeo = new THREE.RingGeometry(radius * 0.96, radius * 1.03, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorRim,
    transparent: true,
    opacity: 0.45
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.004;
  grp.add(ring);
  return grp;
}

function makeShadowCatcher() {
  return new THREE.Group();
}

function projectPoint(worldVec) {
  const v = worldVec.clone().project(camera);
  return [
    Math.round((v.x * 0.5 + 0.5) * W * 10) / 10,
    Math.round((-v.y * 0.5 + 0.5) * H * 10) / 10,
    Math.round(v.z * 1000) / 1000
  ];
}

function projectAnchorsFromMap(rootGroup, localMap) {
  rootGroup.updateMatrixWorld(true);
  const out = {};
  for (const [k, localVec] of Object.entries(localMap)) {
    const w = localVec.clone().applyMatrix4(rootGroup.matrixWorld);
    out[k] = projectPoint(w);
  }
  return out;
}

// ============================================================================
// HISTORICAL TREE BUILDERS (v0.9 Aug 23 -> Sep 06 -> Sep 09 -> Sep 24 -> Oct 22)
// ============================================================================

/**
 * STAGE 1: Commit cc1f7e2 (Aug 23, 2026) — v0.9 Prototype Sakura
 * 7-sided cylinder trunk, 4 straight 5-sided branch cylinders,
 * and unmerged IcosahedronGeometry(1, 0) flat-shaded tufts.
 */
function buildTreeV1(seed = 101, wireOverlay = false) {
  const rng = mulberry32(seed);
  const scale = 1.2;
  const tree = new THREE.Group();

  const matTrunk = new THREE.MeshStandardMaterial({ color: 0x4f3a2c, roughness: 0.95, flatShading: true });
  const matSakura = new THREE.MeshStandardMaterial({ color: 0xefa5b8, roughness: 0.9, flatShading: true });
  const matSakuraDeep = new THREE.MeshStandardMaterial({ color: 0xd97e99, roughness: 0.9, flatShading: true });
  const leafTuftGeo = new THREE.IcosahedronGeometry(1, 0);

  let meshCount = 0;
  const palette = [0xff6b8b, 0xff9f43, 0xfeca57, 0x48dbfb, 0x1dd1a1, 0xc8d6e5];

  function decorateMesh(mesh, idx) {
    meshCount++;
    if (wireOverlay) {
      const col = palette[idx % palette.length];
      mesh.material = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.65,
        flatShading: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      });
      const wf = new THREE.LineSegments(
        new THREE.WireframeGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0x141824, transparent: true, opacity: 0.72 })
      );
      mesh.add(wf);
    }
  }

  function leafCluster(mats, count, spread, baseY, sc) {
    const cluster = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const layer = i / count;
      const mat = mats[Math.min(mats.length - 1, Math.floor(layer * mats.length))];
      const r = (0.42 + rng() * 0.4) * sc * (1.0 - layer * 0.35);
      const tuft = new THREE.Mesh(leafTuftGeo, mat);
      const a = rng() * Math.PI * 2;
      const rad = rng() * spread * sc;
      tuft.position.set(
        Math.cos(a) * rad,
        baseY * sc + layer * 0.55 * sc + (rng() - 0.5) * 0.4 * sc,
        Math.sin(a) * rad
      );
      tuft.scale.set(
        r * (0.9 + rng() * 0.5),
        r * (0.6 + rng() * 0.3),
        r * (0.9 + rng() * 0.5)
      );
      tuft.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      tuft.castShadow = true;
      decorateMesh(tuft, meshCount);
      cluster.add(tuft);
    }
    return cluster;
  }

  const trunkGeo = new THREE.CylinderGeometry(0.14 * scale, 0.24 * scale, 2.4 * scale, 7);
  const trunk = new THREE.Mesh(trunkGeo, matTrunk);
  trunk.position.y = 1.2 * scale;
  trunk.rotation.z = (rng() - 0.5) * 0.15;
  trunk.castShadow = true;
  decorateMesh(trunk, 0);
  tree.add(trunk);

  const branchGeo = new THREE.CylinderGeometry(0.05 * scale, 0.1 * scale, 1.2 * scale, 5);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(branchGeo, matTrunk);
    const a = rng() * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.5 * scale, (2.2 + rng() * 0.5) * scale, Math.sin(a) * 0.5 * scale);
    b.rotation.z = Math.cos(a) * 0.9;
    b.rotation.x = -Math.sin(a) * 0.9;
    b.castShadow = true;
    decorateMesh(b, i + 1);
    tree.add(b);

    const tip = leafCluster([matSakuraDeep, matSakura], 3, 0.3, 0, scale * 0.55);
    tip.position.copy(b.position);
    tip.position.y += 0.55 * scale;
    tip.position.x += Math.cos(a) * 0.45 * scale;
    tip.position.z += Math.sin(a) * 0.45 * scale;
    tree.add(tip);
  }

  const canopy = leafCluster(
    [matSakuraDeep, matSakura, matSakura],
    14 + Math.floor(rng() * 5),
    1.15,
    3.0,
    scale
  );
  tree.add(canopy);

  const anchors = {
    trunk_peg: new THREE.Vector3(0.0, 1.35, 0.18),
    branch_stub: new THREE.Vector3(0.62, 2.65, 0.25),
    ico_tuft: new THREE.Vector3(-0.75, 3.55, 0.55),
    tip_cluster: new THREE.Vector3(0.95, 3.25, 0.42),
    crown_top: new THREE.Vector3(0.0, 4.45, 0.0),
    root_base: new THREE.Vector3(0.0, 0.15, 0.22)
  };

  return { tree, canopy, anchors, meshCount };
}

/**
 * STAGE 2: Commit a2c4fc6 (Sep 06, 2026) — Painterly Bark & Lumpy Merged Tufts
 * Root-flared trunk with deep bark fissure normal maps, lumpyTuftGeometry
 * merged into 1 single canopy mesh with baked vertex tints + SSS shader.
 */
async function buildTreeV2(seed = 101) {
  const folSep06 = await import('../snaps/foliage_sep06.js');
  const rng = mulberry32(seed);
  const scale = 1.2;
  const tree = new THREE.Group();

  const trunkMat = texturedMaterial(barkTextures(0x6d4d36, 0x2a1a11, 1), {
    roughness: 0.95,
    normalScale: 1.3
  });
  const matBlossom = folSep06.createFoliageMaterial({
    sss: 0.42,
    wind: 1.15,
    mottle: 0.2,
    bump: 0.38,
    roughness: 0.85
  });
  const colSakura = [0xd27a94, 0xeaa2b6, 0xf6c6d2];

  const leafTuftGeo = folSep06.lumpyTuftGeometry(3, 1, 0.3);
  const leafTuftGeoB = folSep06.lumpyTuftGeometry(3, 2, 0.34);
  const leafTuftGeoC = folSep06.lumpyTuftGeometry(2, 3, 0.3);
  const geos = [leafTuftGeo, leafTuftGeoB, leafTuftGeoC];

  function leafCluster(colors, count, spread, baseY, sc, material) {
    const parts = [];
    const tmpColor = new THREE.Color();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const layer = i / count;
      const r = (0.3 + rng() * 0.34) * sc * (1.0 - layer * 0.3);
      const a = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng()) * spread * sc;
      p.set(
        Math.cos(a) * rad,
        baseY * sc + layer * 0.5 * sc + (rng() - 0.5) * 0.5 * sc,
        Math.sin(a) * rad
      );
      s.set(r * (0.9 + rng() * 0.5), r * (0.6 + rng() * 0.3), r * (0.9 + rng() * 0.5));
      e.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      q.setFromEuler(e);
      m.compose(p, q, s);
      const geo = geos[i % geos.length].clone();
      geo.applyMatrix4(m);
      const ci = Math.min(colors.length - 1, Math.floor(layer * colors.length + rng() * 0.6));
      tmpColor.setHex(colors[ci]).offsetHSL((rng() - 0.5) * 0.02, (rng() - 0.5) * 0.08, (rng() - 0.5) * 0.06);
      const col = new Float32Array(geo.attributes.position.count * 3);
      for (let v = 0; v < geo.attributes.position.count; v++) {
        col[v * 3] = tmpColor.r;
        col[v * 3 + 1] = tmpColor.g;
        col[v * 3 + 2] = tmpColor.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      parts.push(geo);
    }
    const merged = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Tapered root-flared trunk
  const height = 2.5 * scale;
  const tGeo = new THREE.CylinderGeometry(0.13 * scale, 0.22 * scale, height, 9, 4);
  const pos = tGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + height / 2;
    const t = y / height;
    const flare = 1 + Math.pow(Math.max(0, 1 - t * 4), 2) * 0.55;
    const wob = 1 + Math.sin(pos.getX(i) * 9 + pos.getZ(i) * 7) * 0.04;
    pos.setX(i, pos.getX(i) * flare * wob);
    pos.setZ(i, pos.getZ(i) * flare * wob);
  }
  tGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(tGeo, trunkMat);
  trunk.position.y = height / 2;
  trunk.rotation.z = (rng() - 0.5) * 0.14;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const branchGeo = new THREE.CylinderGeometry(0.04 * scale, 0.09 * scale, 1.3 * scale, 6);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(branchGeo, trunkMat);
    const a = (i / 5) * Math.PI * 2 + rng() * 0.8;
    b.position.set(Math.cos(a) * 0.5 * scale, (2.15 + rng() * 0.6) * scale, Math.sin(a) * 0.5 * scale);
    b.rotation.z = Math.cos(a) * 0.95;
    b.rotation.x = -Math.sin(a) * 0.95;
    b.castShadow = true;
    tree.add(b);
    const tip = leafCluster(colSakura, 5, 0.42, 0, scale * 0.62, matBlossom);
    tip.position.copy(b.position);
    tip.position.y += 0.55 * scale;
    tip.position.x += Math.cos(a) * 0.5 * scale;
    tip.position.z += Math.sin(a) * 0.5 * scale;
    tree.add(tip);
  }

  const canopy = leafCluster(colSakura, 24 + Math.floor(rng() * 6), 1.35, 2.95, scale, matBlossom);
  tree.add(canopy);

  const anchors = {
    root_flare: new THREE.Vector3(0.24, 0.22, 0.2),
    bark_fissure: new THREE.Vector3(0.0, 1.45, 0.2),
    shadow_core: new THREE.Vector3(-0.7, 3.25, 0.55),
    sunlit_crown: new THREE.Vector3(0.45, 4.35, 0.35),
    merged_tuft: new THREE.Vector3(0.95, 3.55, -0.25)
  };

  return { tree, canopy, matBlossom, folMod: folSep06, anchors };
}

/**
 * STAGE 3 & 4: Commit ce00d8f (Sep 09) and e4fb486 (Sep 24)
 * Recursive branching skeleton + lumpy/scalloped core tufts + crossed alpha leaf cards.
 */
async function buildTreeClumpEra(era = 'sep09', seed = 101) {
  const folMod = era === 'sep09'
    ? await import('../snaps/foliage_sep09.js')
    : await import('../snaps/foliage_sep24.js');
  const rng = mulberry32(seed);
  const scale = 1.2;
  const tree = new THREE.Group();

  const trunkMat = texturedMaterial(barkTextures(0x6d4d36, 0x2a1a11, 1), {
    roughness: 0.95,
    normalScale: 1.3
  });
  const matBlossom = folMod.createFoliageMaterial({
    sss: 0.42,
    wind: 1.15,
    mottle: 0.24,
    bump: 0.44,
    roughness: 0.85
  });
  const cardMap = folMod.leafCardTexture('sakura');
  const cardMat = folMod.createFoliageMaterial({
    map: cardMap,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    sss: 0.5,
    wind: 1.2,
    mottle: 0.14,
    bump: 0.28,
    roughness: 0.85
  });
  const cardDepth = folMod.createFoliageDepthMaterial(cardMap, 0.5);
  const colSakura = [0xd27a94, 0xeaa2b6, 0xf6c6d2, 0xfbdde6];

  const trunk = { rTop: 0.13, rBot: 0.22, h: 2.3, lean: 0.14 };
  const height = trunk.h * scale;
  const tGeo = new THREE.CylinderGeometry(trunk.rTop * scale, trunk.rBot * scale, height, 9, 4);
  const pos = tGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + height / 2;
    const t = y / height;
    const flare = 1 + Math.pow(Math.max(0, 1 - t * 4), 2) * 0.55;
    const wob = 1 + Math.sin(pos.getX(i) * 9 + pos.getZ(i) * 7) * 0.04;
    pos.setX(i, pos.getX(i) * flare * wob);
    pos.setZ(i, pos.getZ(i) * flare * wob);
  }
  tGeo.computeVertexNormals();
  const trunkMesh = new THREE.Mesh(tGeo, trunkMat);
  trunkMesh.position.y = height / 2;
  trunkMesh.rotation.z = (rng() - 0.5) * trunk.lean;
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  tree.add(trunkMesh);

  const built = folMod.buildCanopy(rng, {
    scale,
    colors: colSakura,
    trunkH: trunk.h,
    trunkR: trunk.rTop * 1.15,
    primaries: 6,
    tilt: 0.9,
    tiltVar: 0.2,
    droop: -0.08,
    bend: 0.14,
    branchLen: 1.5,
    secondaries: 2,
    twigs: true,
    crownFill: 3,
    clumpR: 0.4,
    tuftsPerClump: [3, 3, 2],
    cardsPerClump: [11, 10, 7],
    cardSize: 0.6,
    tuftFlat: 0.72,
    lump: 0.34,
    seed: 11
  });

  const branches = new THREE.Mesh(built.branches, trunkMat);
  branches.castShadow = true;
  branches.receiveShadow = true;
  tree.add(branches);

  const crown = new THREE.Group();
  const tufts = new THREE.Mesh(built.tufts, matBlossom);
  tufts.castShadow = true;
  tufts.receiveShadow = true;
  crown.add(tufts);

  const cards = new THREE.Mesh(built.cards, cardMat);
  cards.customDepthMaterial = cardDepth;
  cards.castShadow = true;
  cards.receiveShadow = true;
  crown.add(cards);
  tree.add(crown);

  const anchors = {
    primary_fork: new THREE.Vector3(0.0, 2.15, 0.15),
    secondary_bough: new THREE.Vector3(0.85, 2.75, 0.45),
    tuft_pillow: new THREE.Vector3(-0.92, 3.45, 0.62),
    crossed_card: new THREE.Vector3(1.15, 3.55, 0.55),
    crevice_pocket: new THREE.Vector3(0.15, 3.15, 0.85),
    crown_peak: new THREE.Vector3(0.0, 4.45, 0.0)
  };

  return { tree, crown, folMod, anchors };
}

/**
 * STAGE 5: Commit 112c135 (Oct 22, 2026) — Current Dual-Architecture Vegetation
 * Hero trees: 4-level branching wood + individual leaf sprays on twigs + shared vertex wind.
 * Rim trees & bushes: painted leafMassTexture (RGBA highlight, tilt, coverage) over bushGeometry.
 */
let vegBase = null;
function getVegBase() {
  if (!vegBase) {
    vegBase = Object.create(Vegetation.prototype);
    vegBase._initMaterials();
  }
  return vegBase;
}
const HERO_STYLE = { rim: false, bake: false };
const RIM_STYLE = { rim: true, bake: true };

function buildSingleTreeGroup(kind, scale = 1.2, style = HERO_STYLE, seed = 101) {
  const grp = new THREE.Group();
  const v = Object.create(getVegBase());
  Object.assign(v, {
    scene: grp,
    colliders: [],
    rng: mulberry32(seed),
    swayables: [],
    _treeCount: 0,
    _staticAccum: new Map()
  });
  v.treeStyle = () => style;
  v[kind](0, 0, scale);
  v._finalizeStatic();
  return grp;
}

function buildSingleBushMesh(scale = 0.75, blossom = false, seed = 9) {
  const geo = bushGeometry(seed, { lobes: 8, detail: 2, lump: 0.34 });
  const mat = createFoliageMaterial({
    color: blossom ? 0xeb9eb4 : 0x629644,
    sss: 0.32,
    wind: 0.9,
    rustle: 1.0,
    mottle: 0.2,
    bump: 0.45,
    vertexColors: true,
    massMap: leafMassTexture(blossom ? 'blossom' : 'leaf'),
    massScale: 1 / 0.55,
    ragged: 1
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = scale * 0.5;
  m.scale.set(scale * 1.2, scale * 0.8, scale * 1.2);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ============================================================================
// CURRENT CAT ANATOMY HELPERS (29-bone rig, 50 SDF primitives, Surface Nets)
// ============================================================================

const REGION_PALETTE = {
  head: 0xff8566,
  ear: 0xffb38a,
  neck: 0xffcf6b,
  trunk: 0x5ce0a8,
  frontL: 0x5ab4ff,
  frontR: 0x3a94df,
  hindL: 0xb784ff,
  hindR: 0x9764df,
  tail: 0xff7eb6
};

function makeTaperedConeMesh(aArr, bArr, ra, rb, mat) {
  const a = new THREE.Vector3(...aArr);
  const b = new THREE.Vector3(...bArr);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(0.0001, dir.length());
  const grp = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, 16, 1), mat);
  grp.add(cyl);
  const sa = new THREE.Mesh(new THREE.SphereGeometry(ra, 14, 10), mat);
  sa.position.y = -len * 0.5;
  grp.add(sa);
  const sb = new THREE.Mesh(new THREE.SphereGeometry(rb, 14, 10), mat);
  sb.position.y = len * 0.5;
  grp.add(sb);
  grp.position.addVectors(a, b).multiplyScalar(0.5);
  grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  grp.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return grp;
}

function buildPrimitiveGroup(build = BUILDS.michi) {
  const A = getCatAnatomy(build);
  const L = A.landmarks;
  const g = A.build.girth;
  const Y = L.chest[1] - 0.45;
  const hk = A.face.headScale;
  const ch = A.build.cheeks;

  const v3 = (x, y, z) => [x, y, z];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const prims = [];
  const E = (c, r, opt = {}) => prims.push({ type: 'ellipsoid', c, r, ...opt });
  const C = (a, bb, ra, rb, opt = {}) => prims.push({ type: 'cone', a, b: bb, ra, rb, ...opt });

  // Body primitives (from src/cat_anatomy.js)
  E(v3(0, 0.448 + Y, 0.112), v3(0.102 * g, 0.128 * g, 0.165), { region: 'trunk' });
  E(v3(0, 0.392 + Y, 0.198), v3(0.066 * g, 0.088 * g, 0.088), { region: 'trunk' });
  E(v3(0, 0.458 + Y, -0.072), v3(0.1 * g, 0.102 * g, 0.15), { region: 'trunk' });
  E(v3(0, 0.468 + Y, -0.2), v3(0.098 * g, 0.104 * g, 0.112), { region: 'trunk' });
  E(v3(0, 0.392 + Y, -0.118), v3(0.068 * g, 0.05 * g, 0.1), { region: 'trunk' });
  E(v3(0, 0.462 + Y, 0.238), v3(0.074 * g, 0.088 * g, 0.072), { region: 'neck' });
  C(v3(0, 0.468 + Y, 0.17), add(L.head, v3(0, -0.035, -0.045)), 0.092 * g, 0.07, { region: 'neck' });

  for (const [s, k] of [[-1, 'R'], [1, 'L']]) {
    const f = L.front[k];
    const reg = 'front' + k;
    E(lerp3(f.scap, f.shoulder, 0.42), v3(0.036 * g, 0.082, 0.058), { rot: [-0.62, 0, s * 0.1], region: reg });
    C(f.shoulder, f.elbow, 0.048 * g, 0.036, { region: reg });
    E(add(f.elbow, v3(0, 0.004, -0.014)), v3(0.026, 0.03, 0.026), { region: reg });
    C(f.elbow, f.wrist, 0.036, 0.024, { region: reg });
    E(lerp3(f.elbow, f.wrist, 0.26), v3(0.033, 0.065, 0.036), { region: reg });
    C(f.wrist, add(f.knuckle, v3(0, 0.008, 0)), 0.024, 0.026, { region: reg });
    E(v3(f.knuckle[0], GROUND + 0.024, f.knuckle[2] + 0.017), v3(0.028, 0.022, 0.035), { region: reg });

    const h = L.hind[k];
    const hreg = 'hind' + k;
    E(add(lerp3(h.hip, h.stifle, 0.36), v3(-s * 0.008, 0.01, -0.012)), v3(0.05 * g, 0.112, 0.092), { rot: [-0.5, 0, 0], region: hreg });
    C(h.hip, h.stifle, 0.058 * g, 0.037, { region: hreg });
    C(h.stifle, h.hock, 0.037, 0.022, { region: hreg });
    E(add(lerp3(h.stifle, h.hock, 0.33), v3(0, 0.006, -0.012)), v3(0.027, 0.052, 0.03), { rot: [0.85, 0, 0], region: hreg });
    E(add(h.hock, v3(0, 0.004, -0.01)), v3(0.02, 0.024, 0.02), { region: hreg });
    C(h.hock, add(h.ball, v3(0, 0.006, 0)), 0.022, 0.025, { region: hreg });
    E(v3(h.ball[0], GROUND + 0.024, h.ball[2] + 0.02), v3(0.029, 0.022, 0.039), { region: hreg });
  }

  // Head primitives in world/body space (offset by L.head)
  const EH = (c, r, opt = {}) => E(add(L.head, scale(c, hk)), scale(r, hk), { region: 'head', ...opt });
  const CH = (a, bb, ra, rb, opt = {}) => C(add(L.head, scale(a, hk)), add(L.head, scale(bb, hk)), ra * hk, rb * hk, { region: 'head', ...opt });
  EH(v3(0, 0.015, -0.01), v3(0.085, 0.078, 0.082));
  EH(v3(0, 0.01, 0.035), v3(0.074, 0.062, 0.058));
  for (const s of [-1, 1]) {
    EH(v3(s * 0.045 * ch, -0.024, 0.02), v3(0.05 * ch, 0.04, 0.048));
    EH(v3(s * 0.017, -0.034, 0.093), v3(0.021, 0.018, 0.019));
    CH(v3(s * 0.084 * ch, -0.024, 0.0), v3(s * 0.106 * ch, -0.046, -0.018), 0.016, 0.004);
    CH(v3(s * 0.076 * ch, -0.044, 0.012), v3(s * 0.094 * ch, -0.066, -0.004), 0.013, 0.004);
  }
  EH(v3(0, -0.026, 0.076), v3(0.036, 0.03, 0.036));
  EH(v3(0, -0.054, 0.068), v3(0.022, 0.015, 0.022));
  CH(v3(0, 0.03, 0.074), v3(0, -0.006, 0.104), 0.02, 0.01);

  // Tail capsules along L.tail
  for (let i = 0; i < 6; i++) {
    const r0 = 0.031 - 0.009 * (i / 6);
    const r1 = 0.031 - 0.009 * ((i + 1) / 6);
    C(L.tail[i], L.tail[i + 1], r0, r1, { region: 'tail' });
  }

  const grp = new THREE.Group();
  prims.forEach((p, idx) => {
    const col = REGION_PALETTE[p.region] || 0x5ce0a8;
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.38,
      metalness: 0.08
    });
    let m;
    if (p.type === 'cone') {
      m = makeTaperedConeMesh(p.a, p.b, p.ra, p.rb, mat);
    } else {
      const gSphere = new THREE.SphereGeometry(1, 20, 14);
      m = new THREE.Mesh(gSphere, mat);
      m.position.set(...p.c);
      m.scale.set(...p.r);
      if (p.rot) m.rotation.set(...p.rot);
      m.castShadow = true;
      m.receiveShadow = true;
    }
    grp.add(m);
  });

  // Also add ears
  for (const e of A.face.earBase) {
    const ear = new THREE.Group();
    ear.position.set(L.head[0] + e.pos[0], L.head[1] + e.pos[1], L.head[2] + e.pos[2]);
    ear.rotation.set(-0.12, e.side * 0.35, e.side * -0.32);
    ear.add(
      new THREE.Mesh(
        A.ears.outer,
        new THREE.MeshStandardMaterial({ color: REGION_PALETTE.ear, roughness: 0.38 })
      )
    );
    grp.add(ear);
  }

  return { group: grp, count: prims.length, anatomy: A };
}

function buildRawSculptGroup(A, mat) {
  const L = A.landmarks;
  const g = new THREE.Group();
  const add = (geo, pos) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  add(A.body);
  add(A.tail);
  add(A.head, L.head);
  for (const e of A.face.earBase) {
    const ear = new THREE.Group();
    ear.position.set(L.head[0] + e.pos[0], L.head[1] + e.pos[1], L.head[2] + e.pos[2]);
    ear.rotation.set(-0.12, e.side * 0.35, e.side * -0.32);
    ear.add(new THREE.Mesh(A.ears.outer, mat));
    g.add(ear);
  }
  return g;
}

function buildSkeletonVisualizer(skeleton) {
  const grp = new THREE.Group();
  const jointMat = new THREE.MeshBasicMaterial({ color: 0x4effb8, depthTest: false });
  const boneMat = new THREE.MeshBasicMaterial({ color: 0x3ec8ff, depthTest: false });
  const items = [];

  for (const b of skeleton.bones) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 10), jointMat);
    j.renderOrder = 999;
    grp.add(j);
    let link = null;
    if (b.parent && b.parent.isBone && b.name !== 'cat:body') {
      link = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.009, 1, 8), boneMat);
      link.renderOrder = 998;
      grp.add(link);
    }
    items.push({ bone: b, joint: j, link });
  }

  grp.userData.update = () => {
    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (const it of items) {
      it.bone.getWorldPosition(pb);
      it.joint.position.copy(pb);
      if (it.link && it.bone.parent) {
        it.bone.parent.getWorldPosition(pa);
        const dir = new THREE.Vector3().subVectors(pb, pa);
        const len = Math.max(0.0001, dir.length());
        it.link.position.addVectors(pa, pb).multiplyScalar(0.5);
        it.link.scale.set(1, len, 1);
        it.link.quaternion.setFromUnitVectors(up, dir.normalize());
      }
    }
  };
  return grp;
}

function buildWeightColoredGeometry(srcGeo) {
  const geo = srcGeo.clone();
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  const n = si.count;
  const colors = new Float32Array(n * 3);
  const bonePalette = [];
  for (let i = 0; i < 32; i++) {
    const c = new THREE.Color().setHSL((i * 0.137) % 1.0, 0.88, 0.56);
    bonePalette.push(c);
  }
  for (let i = 0; i < n; i++) {
    let r = 0, g = 0, b = 0;
    for (let k = 0; k < 4; k++) {
      const idx = si.getComponent(i, k);
      const w = sw.getComponent(i, k);
      const c = bonePalette[idx % bonePalette.length];
      r += c.r * w;
      g += c.g * w;
      b += c.b * w;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function extractCatAnchors(catInstance) {
  const out = {};
  if (!catInstance || !catInstance.bone) return out;
  catInstance.group.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const map = {
    hips: 'hips',
    chest: 'chest',
    spine1: 'chest',
    neck: 'neck',
    head: 'head',
    scapL: 'scapL',
    shoulderL: 'humerusL',
    elbowL: 'forearmL',
    wristL: 'wristL',
    forePawL: 'fpawL',
    hipL: 'femurL',
    stifleL: 'tibiaL',
    hockL: 'metaL',
    hindPawL: 'hpawL',
    tail0: 'tail0',
    tail2: 'tail2',
    tail3: 'tail3',
    tail5: 'tail5'
  };
  for (const [k, boneName] of Object.entries(map)) {
    const b = catInstance.bone(boneName);
    if (b) {
      b.getWorldPosition(v);
      out[k] = projectPoint(v);
    }
  }
  if (catInstance.anatomy && catInstance.head) {
    const F = catInstance.anatomy.face;
    const headBone = catInstance.head;
    const toHeadWorld = (arr) => new THREE.Vector3(...arr).applyMatrix4(headBone.matrixWorld);
    out.eyeL = projectPoint(toHeadWorld(F.eyeC));
    out.eyeR = projectPoint(toHeadWorld([-F.eyeC[0], F.eyeC[1], F.eyeC[2]]));
    out.noseTip = projectPoint(toHeadWorld(F.nose));
    out.whiskerL = projectPoint(toHeadWorld(F.whiskerRoot));
    if (F.earBase && F.earBase.length >= 2) {
      out.earR = projectPoint(toHeadWorld([F.earBase[0].pos[0], F.earBase[0].pos[1] + 0.05, F.earBase[0].pos[2]]));
      out.earL = projectPoint(toHeadWorld([F.earBase[1].pos[0], F.earBase[1].pos[1] + 0.05, F.earBase[1].pos[2]]));
    }
  }
  return out;
}

// ============================================================================
// SHOT DEFINITIONS
// ============================================================================

async function setupShot() {
  scene.add(makeShadowCatcher(0.26));

  // --------------------------------------------------------------------------
  // 1. TREE V1 — Aug 23 (cc1f7e2) Prototype Icosahedron Tufts
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v1' || shotName === 'tree_v1_wire') {
    const wire = shotName === 'tree_v1_wire';
    const ped = makeGroundPedestal(2.2, 0x58743c, 0x394d25);
    scene.add(ped);
    const { tree, canopy, anchors } = buildTreeV1(101, wire);
    scene.add(tree);

    return (f, u) => {
      const ang = -0.35 + u * Math.PI * 1.15;
      tree.rotation.y = ang;
      canopy.rotation.z = Math.sin(u * Math.PI * 4) * 0.025;
      camera.position.set(0.0, 2.85, 7.6);
      camera.lookAt(0, 2.35, 0);
      return { anchors: projectAnchorsFromMap(tree, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 2. TREE V2 — Sep 06 (a2c4fc6) Painterly Shader & Lumpy Merged Tufts
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v2') {
    const ped = makeGroundPedestal(2.3, 0x5c7a3e, 0x3b4d28);
    scene.add(ped);
    const { tree, canopy, matBlossom, folMod, anchors } = await buildTreeV2(101);
    scene.add(tree);

    return (f, u) => {
      const t = f / FPS;
      tree.rotation.y = -0.35 + u * Math.PI * 1.15;
      canopy.rotation.z = Math.sin(t * 1.8) * 0.022;
      camera.position.set(0.0, 2.85, 7.6);
      camera.lookAt(0, 2.35, 0);
      return { anchors: projectAnchorsFromMap(tree, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 3. TREE V3 — Sep 09 (ce00d8f) Recursive Boughs + Crossed Leaf Cards
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v3') {
    const ped = makeGroundPedestal(2.4, 0x5c7a3e, 0x3b4d28);
    scene.add(ped);
    const { tree, crown, anchors } = await buildTreeClumpEra('sep09', 101);
    scene.add(tree);

    return (f, u) => {
      const t = f / FPS;
      tree.rotation.y = -0.35 + u * Math.PI * 1.15;
      crown.rotation.z = Math.sin(t * 1.8) * 0.022;
      camera.position.set(0.0, 2.85, 7.7);
      camera.lookAt(0, 2.4, 0);
      return { anchors: projectAnchorsFromMap(tree, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 4. TREE V4 — Sep 24 (e4fb486) Scalloped Pillows & Crossed-Card Seams Zoom
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v4') {
    const ped = makeGroundPedestal(2.4, 0x5c7a3e, 0x3b4d28);
    scene.add(ped);
    const { tree, crown, anchors } = await buildTreeClumpEra('sep24', 101);
    scene.add(tree);

    return (f, u) => {
      const t = f / FPS;
      tree.rotation.y = -0.25 + u * Math.PI * 0.95;
      crown.rotation.z = Math.sin(t * 1.8) * 0.02;
      // Zoom in during second half to inspect the intersecting X-card seams on the pillow core
      const zoomT = Math.max(0, Math.min(1, (u - 0.38) / 0.45));
      const ease = zoomT * zoomT * (3 - 2 * zoomT);
      const dist = 7.7 - ease * 3.1;
      const lookY = 2.4 + ease * 0.85;
      const camY = 2.85 + ease * 0.65;
      camera.position.set(0.0, camY, dist);
      camera.lookAt(0, lookY, 0);
      return { anchors: projectAnchorsFromMap(tree, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 5. TREE V5 HERO — Oct 22 (112c135) Leaves on Twigs + Shared Wind
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v5_hero') {
    const ped = makeGroundPedestal(2.5, 0x5f7f40, 0x3d5229);
    scene.add(ped);
    const tree = buildSingleTreeGroup('sakuraTree', 1.2, HERO_STYLE, 101);
    scene.add(tree);
    foliageUniforms.uWindGlobal.value = 2.15;

    const anchors = {
      root_collar: new THREE.Vector3(0.22, 0.2, 0.18),
      scaffold_fork: new THREE.Vector3(0.0, 2.05, 0.12),
      secondary_bough: new THREE.Vector3(-0.85, 2.75, 0.45),
      twig_tip: new THREE.Vector3(1.35, 3.35, 0.62),
      blossom_spray: new THREE.Vector3(-1.25, 3.65, 0.55),
      crown_peak: new THREE.Vector3(0.0, 4.45, 0.0)
    };

    return (f, u) => {
      const t = f / FPS;
      updateFoliage(t * 1.35);
      tree.rotation.y = -0.35 + u * Math.PI * 1.25;
      camera.position.set(0.0, 2.85, 7.7);
      camera.lookAt(0, 2.4, 0);
      return { anchors: projectAnchorsFromMap(tree, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 6. TREE V5 CLOSEUP — Oct 22 Bough & Twig Macro Inspection
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v5_closeup') {
    const tree = buildSingleTreeGroup('sakuraTree', 1.25, HERO_STYLE, 108);
    scene.add(tree);
    foliageUniforms.uWindGlobal.value = 2.4;

    const anchors = {
      scaffold_limb: new THREE.Vector3(0.35, 2.45, 0.25),
      tapering_twig: new THREE.Vector3(0.95, 3.05, 0.55),
      curved_spray: new THREE.Vector3(1.25, 3.35, 0.65),
      inner_sky_gap: new THREE.Vector3(-0.35, 3.15, 0.35),
      sunlit_blossom: new THREE.Vector3(0.55, 3.85, 0.45)
    };

    return (f, u) => {
      const t = f / FPS;
      updateFoliage(t * 1.45);
      tree.rotation.y = 0.2 + u * 0.75;
      camera.position.set(0.35, 3.05, 4.15 - Math.sin(u * Math.PI) * 0.45);
      camera.lookAt(0.25, 3.18, 0);
      return { anchors: projectAnchorsFromMap(tree, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 7. TREE V5 MAPLE & PINE — Hero Japanese Maple & Red Pine
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v5_maple' || shotName === 'tree_v5_pine') {
    const isMaple = shotName === 'tree_v5_maple';
    const ped = makeGroundPedestal(2.35, isMaple ? 0x62783c : 0x526b38, 0x384925);
    scene.add(ped);
    const tree = buildSingleTreeGroup(
      isMaple ? 'mapleTree' : 'pineTree',
      isMaple ? 1.18 : 1.12,
      HERO_STYLE,
      isMaple ? 202 : 303
    );
    scene.add(tree);
    foliageUniforms.uWindGlobal.value = 2.0;

    const anchors = isMaple
      ? {
          maple_trunk: new THREE.Vector3(0.0, 1.5, 0.16),
          tiered_limb: new THREE.Vector3(0.85, 2.65, 0.4),
          palmate_spray: new THREE.Vector3(-1.05, 3.35, 0.5),
          crimson_crown: new THREE.Vector3(0.1, 4.1, 0.0)
        }
      : {
          red_bark: new THREE.Vector3(0.0, 2.3, 0.18),
          windswept_limb: new THREE.Vector3(0.85, 3.55, 0.35),
          needle_pad: new THREE.Vector3(-0.95, 4.15, 0.45),
          pine_crown: new THREE.Vector3(0.0, 4.95, 0.0)
        };

    return (f, u) => {
      const t = f / FPS;
      updateFoliage(t * 1.3);
      tree.rotation.y = -0.3 + u * Math.PI * 1.1;
      const camZ = isMaple ? 7.4 : 8.2;
      const lookY = isMaple ? 2.3 : 2.65;
      camera.position.set(0.0, lookY + 0.45, camZ);
      camera.lookAt(0, lookY, 0);
      return { anchors: projectAnchorsFromMap(tree, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 8. TREE V5 RIM & BUSHES — Painted Leaf Masses (r > 39m) + Shrub Cushions
  // --------------------------------------------------------------------------
  if (shotName === 'tree_v5_rim') {
    const ped = makeGroundPedestal(2.8, 0x58753b, 0x384b25);
    scene.add(ped);
    const grp = new THREE.Group();

    const rimSakura = buildSingleTreeGroup('sakuraTree', 1.15, RIM_STYLE, 404);
    rimSakura.position.set(-0.95, 0, -0.2);
    grp.add(rimSakura);

    const rimMaple = buildSingleTreeGroup('mapleTree', 1.05, RIM_STYLE, 505);
    rimMaple.position.set(1.05, 0, -0.35);
    grp.add(rimMaple);

    const bushA = buildSingleBushMesh(0.72, true, 9);
    bushA.position.x = -0.35;
    bushA.position.z = 1.25;
    grp.add(bushA);

    const bushB = buildSingleBushMesh(0.66, false, 11);
    bushB.position.x = 0.75;
    bushB.position.z = 1.15;
    grp.add(bushB);

    scene.add(grp);
    foliageUniforms.uWindGlobal.value = 1.9;

    const anchors = {
      rim_sakura_mass: new THREE.Vector3(-0.95, 3.65, 0.25),
      rim_maple_mass: new THREE.Vector3(1.05, 3.35, 0.15),
      ragged_silhouette: new THREE.Vector3(-1.85, 3.35, 0.2),
      azalea_cushion: new THREE.Vector3(-0.35, 0.65, 1.45),
      green_shrub: new THREE.Vector3(0.75, 0.55, 1.35)
    };

    return (f, u) => {
      const t = f / FPS;
      updateFoliage(t * 1.3);
      grp.rotation.y = -0.32 + u * 0.64;
      camera.position.set(0.0, 2.75, 8.3);
      camera.lookAt(0, 2.05, 0.2);
      return { anchors: projectAnchorsFromMap(grp, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 9. HISTORICAL CAT SNAPSHOTS (v1 cc1f7e2, v2 a2c4fc6, v3 9b76887)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_v1' || shotName === 'cat_v2' || shotName === 'cat_v3') {
    const modPath =
      shotName === 'cat_v1'
        ? '../snaps/cat_v1.js'
        : shotName === 'cat_v2'
        ? '../snaps/cat_v2.js'
        : '../snaps/cat_v3.js';
    const mod = await import(modPath);
    const ped = makeGroundPedestal(0.95, 0x5c7a3e, 0x3b4d28);
    scene.add(ped);
    const cat = new mod.Cat();
    scene.add(cat.group);

    return (f, u) => {
      const dt = 1 / FPS;
      cat.update(dt, 4.2, true, false, false);
      const ang = 0.72 + Math.sin(u * Math.PI * 2) * 0.25;
      camera.position.set(Math.sin(ang) * 1.75, 0.56, Math.cos(ang) * 1.75);
      camera.lookAt(0, 0.3, 0.02);
      return { anchors: {} };
    };
  }

  // --------------------------------------------------------------------------
  // 10. CAT SKELETON (29-Bone Feline Rig X-Ray)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_skeleton') {
    const ped = makeGroundPedestal(1.05, 0x33473b, 0x1e2b24);
    scene.add(ped);
    const cat = new Cat();
    scene.add(cat.group);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0xd9ecff,
      roughness: 0.35,
      transparent: true,
      opacity: 0.24,
      depthWrite: false
    });
    if (cat.coat) {
      cat.coat.material = ghostMat;
      if (cat.coat.userData.outline) cat.coat.userData.outline.visible = false;
    }
    if (cat.headMesh) cat.headMesh.material = ghostMat;
    if (cat.tailMesh) {
      cat.tailMesh.material = ghostMat;
      if (cat.tailMesh.userData.outline) cat.tailMesh.userData.outline.visible = false;
    }
    const skelVis = buildSkeletonVisualizer(cat.skeleton);
    scene.add(skelVis);

    for (let i = 0; i < 30; i++) cat.update(1 / 60, 4.4, true, false, false);

    return (f, u) => {
      const dt = 1 / FPS;
      cat.update(dt, 4.4, true, false, false);
      cat.group.updateMatrixWorld(true);
      skelVis.userData.update();
      const ang = 0.45 + u * Math.PI * 1.35;
      camera.position.set(Math.sin(ang) * 1.72, 0.56, Math.cos(ang) * 1.72);
      camera.lookAt(0, 0.31, 0.02);
      return { anchors: extractCatAnchors(cat) };
    };
  }

  // --------------------------------------------------------------------------
  // 11. CAT PRIMITIVES (50 SDF Primitives Color-Coded by Region)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_primitives') {
    const ped = makeGroundPedestal(1.05, 0x3a4736, 0x242e21);
    scene.add(ped);
    const built = buildPrimitiveGroup(BUILDS.michi);
    scene.add(built.group);

    const L = built.anatomy.landmarks;
    const anchors = {
      head: new THREE.Vector3(...L.head),
      earL: new THREE.Vector3(L.head[0] + 0.04, L.head[1] + 0.08, L.head[2]),
      shoulderL: new THREE.Vector3(...L.front.L.shoulder),
      elbowL: new THREE.Vector3(...L.front.L.elbow),
      forePawL: new THREE.Vector3(...L.front.L.knuckle),
      spine1: new THREE.Vector3(...L.chest),
      hipL: new THREE.Vector3(...L.hind.L.hip),
      stifleL: new THREE.Vector3(...L.hind.L.stifle),
      hockL: new THREE.Vector3(...L.hind.L.hock),
      tail3: new THREE.Vector3(...L.tail[3])
    };

    return (f, u) => {
      built.group.rotation.y = 0.45 + u * Math.PI * 1.35;
      camera.position.set(0.0, 0.56, 1.72);
      camera.lookAt(0, 0.31, 0.0);
      return { anchors: projectAnchorsFromMap(built.group, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 12. CAT BLEND & WIREFRAME (Smooth-Min smin Voxel Sculpt + Surface Nets)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_blend') {
    const ped = makeGroundPedestal(1.05, 0x4b6338, 0x2e3d22);
    scene.add(ped);
    const root = new THREE.Group();
    scene.add(root);

    const primBuilt = buildPrimitiveGroup(BUILDS.michi);
    root.add(primBuilt.group);

    const A = primBuilt.anatomy;
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0xf0e2d0,
      roughness: 0.42,
      metalness: 0.05,
      transparent: true,
      opacity: 0.0
    });
    const clayGrp = buildRawSculptGroup(A, clayMat);
    root.add(clayGrp);

    const wireMat = new THREE.LineBasicMaterial({
      color: 0x2ee6a8,
      transparent: true,
      opacity: 0.0
    });
    const wireGrp = new THREE.Group();
    wireGrp.add(new THREE.LineSegments(new THREE.WireframeGeometry(A.body), wireMat));
    const headWire = new THREE.LineSegments(new THREE.WireframeGeometry(A.head), wireMat);
    headWire.position.set(...A.landmarks.head);
    wireGrp.add(headWire);
    wireGrp.add(new THREE.LineSegments(new THREE.WireframeGeometry(A.tail), wireMat));
    root.add(wireGrp);

    const L = A.landmarks;
    const anchors = {
      head: new THREE.Vector3(...L.head),
      shoulderL: new THREE.Vector3(...L.front.L.shoulder),
      spine1: new THREE.Vector3(...L.chest),
      hipL: new THREE.Vector3(...L.hind.L.hip),
      hockL: new THREE.Vector3(...L.hind.L.hock),
      tail3: new THREE.Vector3(...L.tail[3])
    };

    return (f, u) => {
      const blendT = Math.max(0, Math.min(1, (u - 0.15) / 0.35));
      const wireT = Math.max(0, Math.min(1, (u - 0.55) / 0.25));
      clayMat.opacity = blendT;
      clayMat.transparent = blendT < 0.99;
      primBuilt.group.traverse((c) => {
        if (c.isMesh) {
          c.material.transparent = true;
          c.material.opacity = Math.max(0, 1 - blendT * 1.15);
          c.visible = c.material.opacity > 0.02;
        }
      });
      wireMat.opacity = wireT * 0.42;

      root.rotation.y = 0.45 + u * Math.PI * 1.35;
      camera.position.set(0.0, 0.56, 1.72);
      camera.lookAt(0, 0.31, 0.0);
      return { anchors: projectAnchorsFromMap(root, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 13. CAT WEIGHTS (Multi-Bone Geodesic Skin Weights Heatmap in Motion)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_weights') {
    const ped = makeGroundPedestal(1.05, 0x3b4d38, 0x243022);
    scene.add(ped);
    const cat = new Cat();
    scene.add(cat.group);
    const wMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.48,
      metalness: 0.05
    });
    if (cat.coat) {
      cat.coat.geometry = buildWeightColoredGeometry(cat.coat.geometry);
      cat.coat.material = wMat;
    }
    if (cat.tailMesh) {
      cat.tailMesh.geometry = buildWeightColoredGeometry(cat.tailMesh.geometry);
      cat.tailMesh.material = wMat;
    }
    for (let i = 0; i < 30; i++) cat.update(1 / 60, 4.8, true, false, false);

    return (f, u) => {
      const dt = 1 / FPS;
      cat.update(dt, 4.8, true, false, false);
      const ang = 0.55 + u * Math.PI * 1.15;
      camera.position.set(Math.sin(ang) * 1.72, 0.56, Math.cos(ang) * 1.72);
      camera.lookAt(0, 0.31, 0.02);
      return { anchors: extractCatAnchors(cat) };
    };
  }

  // --------------------------------------------------------------------------
  // 14. CAT FACE MACRO (Shader-Painted Slit-Pupil Eyes, Nose, Muzzle, Pinna)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_face') {
    const cat = new Cat();
    scene.add(cat.group);
    for (let i = 0; i < 30; i++) cat.update(1 / 60, 0, true, false, false);

    return (f, u) => {
      const dt = 1 / FPS;
      cat.update(dt, 0, true, false, false);
      if (u > 0.44 && u < 0.54) {
        cat.blink = Math.sin(((u - 0.44) / 0.1) * Math.PI);
      }
      const ang = (u - 0.5) * 0.72;
      camera.position.set(Math.sin(ang) * 0.58, 0.66, 0.33 + Math.cos(ang) * 0.56);
      camera.lookAt(0, 0.62, 0.33);
      return { anchors: extractCatAnchors(cat) };
    };
  }

  // --------------------------------------------------------------------------
  // 15. CAT GAITS (Walk -> Trot -> Gallop Full Stride Showcase)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_gaits') {
    const ped = makeGroundPedestal(1.15, 0x5c7a3e, 0x3b4d28);
    scene.add(ped);
    const cat = new Cat();
    scene.add(cat.group);
    for (let i = 0; i < 30; i++) cat.update(1 / 60, 1.3, true, false, false);

    return (f, u) => {
      const dt = 1 / FPS;
      let speed = 1.35;
      let sprinting = false;
      let gaitName = 'WALK · 4-BEAT LATERAL';
      if (u >= 0.33 && u < 0.66) {
        speed = 4.6;
        gaitName = 'TROT · DIAGONAL PAIRS';
      } else if (u >= 0.66) {
        speed = 7.6;
        sprinting = true;
        gaitName = 'GALLOP · ROTARY SUSPENSION';
      }
      cat.update(dt, speed, true, sprinting, false);
      const ang = 1.18 + Math.sin(u * Math.PI * 2) * 0.32;
      camera.position.set(Math.sin(ang) * 1.76, 0.54, Math.cos(ang) * 1.76);
      camera.lookAt(0, 0.3, 0.02);
      return { anchors: extractCatAnchors(cat), gait: gaitName };
    };
  }

  // --------------------------------------------------------------------------
  // 16. CAT POSES & 4 VILLAGER BUILDS (Michi, Luna, Mochi, Kuro)
  // --------------------------------------------------------------------------
  if (shotName === 'cat_poses_builds') {
    const ped = makeGroundPedestal(1.75, 0x5c7a3e, 0x3b4d28);
    scene.add(ped);
    const grp = new THREE.Group();
    scene.add(grp);

    const configs = [
      {
        name: 'MICHI',
        pos: [-0.62, 0, 0.32],
        rotY: 0.35,
        pose: 'sit',
        opts: { build: 'michi', fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 }
      },
      {
        name: 'MOCHI',
        pos: [0.62, 0, 0.32],
        rotY: -0.35,
        pose: 'sleep',
        opts: {
          build: 'mochi',
          fur: 0xe8b06a,
          belly: 0xfaf0dc,
          accent: 0xb07840,
          stripeAmount: 1.0,
          eyeColor: 0xa2ba6e,
          ribbonColor: 0xc8402a
        }
      },
      {
        name: 'LUNA',
        pos: [-0.42, 0, -0.45],
        rotY: 0.25,
        pose: 'stretch',
        opts: {
          build: 'luna',
          fur: 0x7f8796,
          belly: 0xdadce2,
          accent: 0x474e5f,
          stripeAmount: 0.3,
          eyeColor: 0xdec056,
          ribbonColor: 0x2b3d63
        }
      },
      {
        name: 'KURO',
        pos: [0.45, 0, -0.45],
        rotY: -0.28,
        pose: 'groom',
        opts: {
          build: 'kuro',
          fur: 0x1c1c22,
          belly: 0x2e2e38,
          accent: 0x101014,
          stripeAmount: 0.0,
          eyeColor: 0xd8b04a,
          ribbonColor: 0xc8402a
        }
      }
    ];

    const cats = configs.map((cfg) => {
      const holder = new THREE.Group();
      holder.position.set(...cfg.pos);
      holder.rotation.y = cfg.rotY;
      grp.add(holder);
      const c = new Cat(cfg.opts);
      holder.add(c.group);
      c.idleAction = cfg.pose;
      c.idleActionTimer = 0;
      c.idleActionDuration = 999;
      for (let i = 0; i < 240; i++) c.update(1 / 60, 0, true, false, false);
      return { cfg, holder, cat: c };
    });

    const anchors = {
      michi_tag: new THREE.Vector3(-0.62, 0.58, 0.32),
      mochi_tag: new THREE.Vector3(0.62, 0.38, 0.32),
      luna_tag: new THREE.Vector3(-0.42, 0.54, -0.45),
      kuro_tag: new THREE.Vector3(0.45, 0.54, -0.45)
    };

    return (f, u) => {
      const dt = 1 / FPS;
      for (const item of cats) {
        item.cat.update(dt, 0, true, false, false);
      }
      grp.rotation.y = -0.22 + u * 0.44;
      camera.position.set(0.0, 0.88, 2.55);
      camera.lookAt(0, 0.28, 0.0);
      return { anchors: projectAnchorsFromMap(grp, anchors) };
    };
  }

  // --------------------------------------------------------------------------
  // 17. FINALE SCENE — Golden-Hour Kyoto: Sculpted Cat Under Hero Sakura & Maple
  // --------------------------------------------------------------------------
  if (shotName === 'finale_scene') {
    scene.background = new THREE.Color(0x1e2538);
    hemi.color.setHex(0xffe6c8);
    hemi.groundColor.setHex(0x3d4f34);
    hemi.intensity = 1.05;
    keyLight.color.setHex(0xffd2a1);
    keyLight.intensity = 1.85;
    keyLight.position.set(6.5, 7.5, 5.5);

    const ground = makeGroundPedestal(4.6, 0x5b783c, 0x384b26);
    scene.add(ground);

    // Stepping stone path
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8f8b82, roughness: 0.88 });
    for (let i = -4; i <= 4; i++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.05, 10), stoneMat);
      st.position.set(Math.sin(i * 0.4) * 0.25, 0.02, i * 0.68);
      st.scale.set(1.2, 1, 0.85);
      st.rotation.y = i * 0.5;
      st.receiveShadow = true;
      scene.add(st);
    }

    const sakura = buildSingleTreeGroup('sakuraTree', 1.25, HERO_STYLE, 777);
    sakura.position.set(-1.35, 0, -0.55);
    scene.add(sakura);

    const maple = buildSingleTreeGroup('mapleTree', 1.08, HERO_STYLE, 888);
    maple.position.set(1.65, 0, -1.15);
    scene.add(maple);

    const bush1 = buildSingleBushMesh(0.72, true, 12);
    bush1.position.x = -1.85;
    bush1.position.z = 0.95;
    scene.add(bush1);

    const bush2 = buildSingleBushMesh(0.68, false, 14);
    bush2.position.x = 1.55;
    bush2.position.z = 0.65;
    scene.add(bush2);

    foliageUniforms.uWindGlobal.value = 1.85;

    // Falling cherry petals
    const petalCount = 70;
    const petalGeo = new THREE.PlaneGeometry(0.055, 0.038);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xffd0df,
      side: THREE.DoubleSide
    });
    const petals = [];
    const rng = mulberry32(909);
    for (let i = 0; i < petalCount; i++) {
      const pm = new THREE.Mesh(petalGeo, petalMat);
      pm.position.set((rng() - 0.5) * 4.5, 0.4 + rng() * 3.8, (rng() - 0.5) * 3.8);
      pm.userData = {
        vx: -0.25 - rng() * 0.25,
        vy: -0.45 - rng() * 0.35,
        vz: (rng() - 0.5) * 0.25,
        phase: rng() * Math.PI * 2
      };
      scene.add(pm);
      petals.push(pm);
    }

    const cat = new Cat();
    scene.add(cat.group);
    cat.group.position.set(0.0, 0, -0.8);
    for (let i = 0; i < 30; i++) cat.update(1 / 60, 3.6, true, false, false);

    return (f, u) => {
      const dt = 1 / FPS;
      const t = f / FPS;
      cat.group.position.z = -0.95 + u * 2.15;
      cat.group.position.x = Math.sin(u * Math.PI * 1.5) * 0.18;
      cat.group.rotation.y = Math.cos(u * Math.PI * 1.5) * 0.14;
      cat.update(dt, 3.6, true, false, false);

      updateFoliage(t * 1.25, null, cat.group.position);

      for (const pm of petals) {
        pm.position.x += pm.userData.vx * dt;
        pm.position.y += pm.userData.vy * dt;
        pm.position.z += pm.userData.vz * dt;
        pm.rotation.x = t * 2.4 + pm.userData.phase;
        pm.rotation.y = t * 1.9 + pm.userData.phase;
        if (pm.position.y < 0.05) {
          pm.position.y = 3.9;
          pm.position.x = -1.8 + ((pm.userData.phase * 1.3) % 3.6);
        }
      }

      const camAng = -0.18 + u * 0.36;
      camera.position.set(Math.sin(camAng) * 4.6, 1.55 + u * 0.35, Math.cos(camAng) * 4.6 + 0.65);
      camera.lookAt(0.0, 1.45, 0.0);

      const anchors = extractCatAnchors(cat);
      anchors.sakura_crown = projectPoint(new THREE.Vector3(-1.15, 3.35, -0.35));
      anchors.maple_crown = projectPoint(new THREE.Vector3(1.55, 2.95, -0.95));
      anchors.azalea_bush = projectPoint(new THREE.Vector3(-1.65, 0.55, 1.05));
      return { anchors };
    };
  }

  // --------------------------------------------------------------------------
  // 18. TREE TEXTURES — 256px Procedural Spray & Mass Texture Swatches
  // --------------------------------------------------------------------------
  if (shotName === 'tree_textures') {
    const kinds = [
      { key: 'spray_sakura', tex: leafSprayTexture('sakura'), tint: 0xf6c6d2 },
      { key: 'spray_maple', tex: leafSprayTexture('maple'), tint: 0xd94832 },
      { key: 'spray_needle', tex: leafSprayTexture('needle'), tint: 0x456e3a },
      { key: 'spray_broadleaf', tex: leafSprayTexture('broadleaf'), tint: 0x5c8a38 },
      { key: 'mass_sakura', tex: leafMassTexture('blossom'), tint: 0xefa5b8 },
      { key: 'mass_shrub', tex: leafMassTexture('leaf'), tint: 0x528035 }
    ];
    const cards = kinds.map((k, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = (col - 1) * 1.45;
      const y = 2.45 - row * 1.45;
      const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.22, 1.22),
        new THREE.MeshBasicMaterial({ color: 0x161b29 })
      );
      bg.position.set(x, y, -0.02);
      scene.add(bg);

      const mat = new THREE.MeshBasicMaterial({
        map: k.tex,
        color: k.tint,
        transparent: true,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.12), mat);
      plane.position.set(x, y, 0);
      scene.add(plane);
      return { key: k.key, pos: new THREE.Vector3(x, y, 0), plane };
    });

    return (f, u) => {
      camera.position.set(0, 1.72, 4.8);
      camera.lookAt(0, 1.72, 0);
      const out = {};
      for (const c of cards) {
        c.plane.rotation.z = Math.sin(u * Math.PI * 2) * 0.06;
        out[c.key] = projectPoint(c.pos);
      }
      return { anchors: out };
    };
  }

  throw new Error('Unknown shot: ' + shotName);
}

async function run() {
  try {
    const stepFn = await setupShot();
    const metaFrames = [];
    for (let f = 0; f < FRAMES; f++) {
      const u = FRAMES > 1 ? f / (FRAMES - 1) : 0;
      const info = stepFn(f, u) || {};
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      const b64 = dataUrl.split(',')[1];
      await fetch(`/save?shot=${encodeURIComponent(shotName)}&frame=${f}`, {
        method: 'POST',
        body: b64
      });
      metaFrames.push(info);
    }
    await fetch(`/meta?shot=${encodeURIComponent(shotName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shot: shotName, w: W, h: H, fps: FPS, frames: metaFrames })
    });
    await fetch(`/done?shot=${encodeURIComponent(shotName)}`);
  } catch (err) {
    await fetch(`/error?shot=${encodeURIComponent(shotName)}`, {
      method: 'POST',
      body: String(err && err.stack ? err.stack : err)
    });
  }
}

run();
