// The forest rings (Phase 2 v-ranges): edge-forest (the wall that holds the
// valley in), edge-undergrowth (its shrub belt) and foothill-forest (the
// carpet of cedars and crowns on the slopes). Rim forest stays painted leaf
// masses ('masses' style, the leaf-mass material): the hero trees inside the
// valley carry the leaf detail.
//
// Reusable (s3-vista): `canopySet(tier, opts)` returns the four painted crown
// variants (cached), `flaredTrunk(...)` a tapered trunk, `instanceRing(...)`
// writes a ring of trees into InstancedMesh sets.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createFoliageMaterial, leafMassTexture, buildCanopy, bushGeometry, lumpyConeGeometry, lumpyTuftGeometry
} from '../../foliage.js?v=20261113a';
import { texturedMaterial, woodTextures } from '../../textures.js?v=20261113a';
import { rng as seeded, noise3 } from '../craft.js?v=20261113a';

export const FOREST_GREENS = [0x2e5a24, 0x3b6e2e, 0x4e873c, 0x67a24a];
const VARIANTS = 4;

// The crown skeleton per tier. hero and mid (the game's high quality, band rim) are the classic recipe: the wall
// must stay full. far (medium quality) spends two tufts a clump, in slightly larger clumps to keep the coverage.
export const CROWN_TIER = Object.freeze({
  hero: { primaries: 5, crownFill: 3, tufts: [3, 3, 2], secondaries: 2, grow: 1 },
  mid: { primaries: 5, crownFill: 3, tufts: [3, 3, 2], secondaries: 2, grow: 1 },
  far: { primaries: 5, crownFill: 3, tufts: [2, 2, 2], secondaries: 1, grow: 1.12 }
});

const canopyCache = new Map();

/** The four painted-mass crown variants of a tier (cached; never dispose them). */
export function canopySet(tier, { fill = 1, warmth = 0 } = {}) {
  const key = `${tier}|${fill}|${warmth}`;
  if (canopyCache.has(key)) return canopyCache.get(key);
  const t = CROWN_TIER[tier] || CROWN_TIER.mid;
  const colors = FOREST_GREENS.map((c) => new THREE.Color(c).offsetHSL(warmth * 0.08, 0, 0).getHex());
  const set = [];
  for (let v = 0; v < VARIANTS; v++) {
    set.push(buildCanopy(seeded(9000 + v * 31), {
      style: 'masses', scale: 1, trunkH: 1.15, trunkR: 0.14, primaries: t.primaries, tilt: 0.76 + v * 0.06, tiltVar: 0.22,
      droop: -0.02, bend: 0.12, branchLen: 0.78, secondaries: t.secondaries, twigs: false, crownFill: t.crownFill,
      colors, clumpR: 0.36 * fill * t.grow, tuftsPerClump: t.tufts, tuftFlat: 0.74, lump: 0.4, seed: 50 + v * 7
    }));
  }
  canopyCache.set(key, set);
  return set;
}

/** A tapered trunk, 1.2 tall and centred on the origin like the classic cylinder, with root flare and a slight bole. */
export function flaredTrunk({ radial = 8, rows = 4, flare = 0.6, seed = 3 } = {}) {
  const geo = new THREE.CylinderGeometry(0.12, 0.2, 1.2, radial, rows);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (y + 0.6) / 1.2; // 0 at the foot
    const ang = Math.atan2(z, x);
    const buttress = 1 + flare * 0.9 * Math.exp(-t * 9) * (0.55 + 0.45 * Math.cos(ang * 3 + seed));
    const bole = 1 + (noise3(ang * 1.3 + seed, t * 3, seed) - 0.5) * 0.18;
    pos.setXYZ(i, x * buttress * bole, y, z * buttress * bole);
  }
  geo.computeVertexNormals();
  return geo;
}

const barkMaterial = () => texturedMaterial(woodTextures(0x6a5a48, 0x2e2418, 4), { color: 0xffffff, roughness: 1 });
const leafMat = (opts) => createFoliageMaterial({
  sss: 0.24, wind: 0.75, mottle: 0.24, bump: 0.42, vertexColors: true,
  massMap: leafMassTexture('leaf'), massScale: 1 / 1.5, ragged: 1, ...opts
});

const THICKET = (x, z) => Math.abs(x) < 3.6 && z < -33;

/* -------------------------------------------------------------- edge-forest --- */

const TRUNK_TIER = Object.freeze({ hero: [8, 4], mid: [6, 3], far: [5, 1] });

export function buildEdgeForest(ctx, layout, p) {
  const T = ctx.THREE;
  const trees = layout.trees || [], assign = layout.assign || [];
  const canopies = canopySet(ctx.tier, { fill: p.crown_fill, warmth: p.warmth });
  const forestMat = leafMat();
  const barkMat = barkMaterial();
  const [radial, rows] = TRUNK_TIER[ctx.tier] || TRUNK_TIER.mid;
  const trunkGeo = flaredTrunk({ radial, rows, flare: p.trunk_flare });

  const wallN = new Array(VARIANTS).fill(0), thicketN = new Array(VARIANTS).fill(0);
  trees.forEach((t, i) => { (THICKET(t.x, t.z) ? thicketN : wallN)[assign[i]]++; });
  const group = new T.Group(), parts = {};
  const mk = (key, geo, mat, n, noChunk) => {
    const m = new T.InstancedMesh(geo, mat, Math.max(1, n));
    m.count = n; m.visible = n > 0; m.castShadow = true; m.receiveShadow = true;
    if (noChunk) m.userData.noChunk = true; // re-posed per instance by setShrineThicketOpen
    group.add(m); parts[key] = m;
    return m;
  };
  const wall = [], thicket = [];
  for (let v = 0; v < VARIANTS; v++) {
    wall.push({ tufts: mk(`wall_crown_${v + 1}`, canopies[v].tufts, forestMat, wallN[v]), branches: mk(`wall_branches_${v + 1}`, canopies[v].branches, barkMat, wallN[v]), next: 0 });
    thicket.push({ tufts: mk(`thicket_crown_${v + 1}`, canopies[v].tufts, forestMat, thicketN[v], true), branches: mk(`thicket_branches_${v + 1}`, canopies[v].branches, barkMat, thicketN[v], true), next: 0 });
  }
  const trunks = mk('trunks', trunkGeo, barkMat, trees.length, true);

  const dummy = new T.Object3D(), col = new T.Color();
  const pagodaBearing = Math.atan2(56, 12);
  trees.forEach((t, i) => {
    const { a, x, z, s, rotCrown, sx, sz, rotTrunk, tint } = t;
    // crowns in the pagoda's sightline are lowered so the tower clears the canopy
    const d = Math.atan2(Math.sin(a - pagodaBearing), Math.cos(a - pagodaBearing));
    const sy = s * (Math.abs(d) < 0.3 ? 0.88 * 0.9 : 1);
    const set = (THICKET(x, z) ? thicket : wall)[assign[i]];
    const idx = set.next++;
    dummy.position.set(x, 0, z); dummy.rotation.set(0, rotCrown, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    set.tufts.setMatrixAt(idx, dummy.matrix); set.branches.setMatrixAt(idx, dummy.matrix);
    set.tufts.setColorAt(idx, col.setRGB(...tint));
    dummy.position.set(x, 0.6 * sy, z); dummy.rotation.set(0, rotTrunk, 0); dummy.scale.set(s, sy, s); dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  for (const m of Object.values(parts)) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  return {
    group, parts, sockets: {}, live: [],
    dispose() { forestMat.dispose(); barkMat.dispose(); trunkGeo.dispose(); /* canopies are cached and shared */ }
  };
}

/* ---------------------------------------------------------- edge-undergrowth --- */

const BUSH_TIER = Object.freeze({ hero: 1, mid: 1, far: 0 });
const bushCache = new Map();
const bushShape = (seed, lobes, detail, lump) => {
  const key = `${seed}|${lobes}|${detail}|${lump}`;
  if (!bushCache.has(key)) bushCache.set(key, bushGeometry(seed, { lobes, detail, lump }));
  return bushCache.get(key);
};

export function buildEdgeUndergrowth(ctx, layout, p) {
  const T = ctx.THREE;
  const detail = BUSH_TIER[ctx.tier] ?? 1;
  const lobes = ctx.tier === 'hero' ? p.lobes : Math.max(4, p.lobes - 2);
  const geoA = bushShape(7, lobes, detail, p.lump), geoB = bushShape(19, lobes, detail, p.lump);
  const mat = leafMat({ sss: 0.2, wind: 0.6, massScale: 1 / 0.8 });
  const bushes = layout.bushes || [];
  const inThicket = (b) => Math.abs(b.x) < 9 && b.z < -32;
  const nT = bushes.filter(inThicket).length;
  const nA = bushes.filter((b, i) => !inThicket(b) && i % 2 === 0).length, nB = bushes.length - nT - nA;
  const group = new T.Group(), parts = {};
  const mk = (key, geo, n, noChunk) => {
    const m = new T.InstancedMesh(geo, mat, Math.max(1, n));
    m.count = n; m.visible = n > 0; m.castShadow = true; m.receiveShadow = true;
    if (noChunk) m.userData.noChunk = true;
    group.add(m); parts[key] = m;
    return m;
  };
  const wallA = mk('wall_a', geoA, nA), wallB = mk('wall_b', geoB, nB), thicket = mk('thicket', geoA, nT, true);
  const dummy = new T.Object3D(), col = new T.Color();
  let ia = 0, ib = 0, it = 0;
  bushes.forEach((b, i) => {
    const { s, x, z, rotY, hue, light } = b;
    const isT = inThicket(b);
    const mesh = isT ? thicket : (i % 2 === 0 ? wallA : wallB);
    const idx = isT ? it++ : (i % 2 === 0 ? ia++ : ib++);
    dummy.position.set(x, s * 0.5, z); dummy.scale.set(s * 1.2, s * 0.8, s * 1.2); dummy.rotation.set(0, rotY, 0); dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, col.setHex(0x4c7c36).offsetHSL(hue, 0, light));
  });
  for (const m of Object.values(parts)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  return { group, parts, sockets: {}, live: [], dispose() { mat.dispose(); /* bush geometries are cached */ } };
}

/* ------------------------------------------------------------ foothill-forest --- */

const cedarCache = new Map();
/** A cedar spire with a baked tone gradient (dark skirt, sunlit tip); `tiered` adds a wide lower skirt like a sugi. */
function cedarGeometry(detail, seed, lump, tiered) {
  const key = `${detail}|${seed}|${lump}|${tiered}`;
  if (cedarCache.has(key)) return cedarCache.get(key);
  const upper = lumpyConeGeometry(detail, seed, lump).clone();
  let geo = upper;
  if (tiered) {
    const skirt = lumpyConeGeometry(Math.max(0, detail - 1), seed + 5, lump).clone();
    skirt.scale(1.28, 0.62, 1.28);
    geo = mergeGeometries([upper.toNonIndexed(), skirt.toNonIndexed()]);
    geo.computeVertexNormals();
  }
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) + 1) / 3.8)); // the cone spans roughly -1 .. 2.8
    const k = 0.66 + t * 0.52;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  cedarCache.set(key, geo);
  return geo;
}
const crownCache = new Map();
function crownGeometry(detail, seed, lump) {
  const key = `${detail}|${seed}|${lump}`;
  if (crownCache.has(key)) return crownCache.get(key);
  const geo = lumpyTuftGeometry(detail, seed, lump).clone();
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const k = 0.7 + Math.min(1, Math.max(0, (pos.getY(i) + 1) * 0.5)) * 0.4; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  crownCache.set(key, geo);
  return geo;
}

const FOOT_TIER = Object.freeze({ hero: [2, 1], mid: [1, 1], far: [1, 0] }); // [cedar detail, crown detail]

export function buildFoothillForest(ctx, layout, p) {
  const T = ctx.THREE;
  const [cd, rd] = FOOT_TIER[ctx.tier] || FOOT_TIER.far;
  const geos = [cedarGeometry(cd, 8, p.lump, false), cedarGeometry(cd, 8, p.lump, true), crownGeometry(rd, 8, p.crown_lump)];
  const cedarMat = createFoliageMaterial({ sss: 0.15, wind: 0.5, mottle: 0.24, vertexColors: true, massMap: leafMassTexture('needle'), massScale: 1 / 2.4 });
  const crownMat = createFoliageMaterial({ sss: 0.15, wind: 0.5, mottle: 0.24, vertexColors: true, massMap: leafMassTexture('leaf'), massScale: 1 / 3 });
  const trees = layout.trees || [];
  const counts = [0, 0, 0];
  for (const t of trees) counts[t.kind]++;
  const names = ['cedars_a', 'cedars_b', 'crowns'];
  const group = new T.Group(), parts = {}, meshes = [];
  for (let k = 0; k < 3; k++) {
    const m = new T.InstancedMesh(geos[k], k === 2 ? crownMat : cedarMat, Math.max(1, counts[k]));
    m.count = 0; m.castShadow = false; m.receiveShadow = false;
    group.add(m); parts[names[k]] = m; meshes.push(m);
  }
  const dummy = new T.Object3D(), color = new T.Color();
  for (const { kind, position, scale, rotation, hsl } of trees) {
    dummy.position.set(...position); dummy.scale.set(...scale); dummy.rotation.set(...rotation); dummy.updateMatrix();
    const m = meshes[kind];
    m.setMatrixAt(m.count, dummy.matrix); m.setColorAt(m.count, color.setHSL(...hsl)); m.count++;
  }
  for (const m of meshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.visible = m.count > 0; }
  return { group, parts, sockets: {}, live: [], dispose() { cedarMat.dispose(); crownMat.dispose(); /* geometries are cached */ } };
}
