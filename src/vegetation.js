import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { barkTextures, texturedMaterial } from './textures.js?v=20261024c';
import {
  createFoliageMaterial, createFoliageDepthMaterial, createBranchMaterial, leafSprayTexture, leafMassTexture,
  buildCanopy, updateFoliage
} from './foliage.js?v=20261024c';
import { GrassSystem, BiomeMask } from './grass.js?v=20261024c';

// Trees past this radius stand in or behind the edge-forest wall and are
// built as textured leaf masses; inside it they are hero trees with
// individual leaves on visible twigs.
const RIM_RADIUS = 39;
// Hero trees inside this radius keep their own meshes (frustum-culled per
// tree); the rest bake into the static merges.
const NEAR_RADIUS = 36;
// One wind strength for every hero canopy: twig and leaf materials must
// share it exactly or the leaves would drift off their twigs.
const TREE_WIND = 1.1;

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Vegetation {
  constructor(scene, colliders, options = {}) {
    this.scene = scene;
    this.colliders = colliders;
    this.rng = mulberry32(options.seed || 77);
    this.time = 0;
    this.swayables = [];
    this._treeCount = 0;
    this._shrubCount = 0;
    this.pathSamples = options.pathSamples || [];
    this.waterRects = options.waterRects || [];
    this.riverSamples = options.riverSamples || [];
    this.exclusionRects = options.exclusionRects || [];
    // Static geometry accumulators: tree trunks/branches and long-tail
    // canopies are baked into one mesh per material instead of one mesh per
    // tree part (see _bakeStatic / _finalizeStatic).
    this._staticAccum = new Map();
    this.grassMeshes = [];
    this.groundCoverMeshes = [];
    // main.js hands in { renderer, camera, player, npcs } once they exist;
    // the grass physics and LOD rings read them every frame.
    this.grassContext = null;
    this._initMaterials();

    this.matBamboo = new THREE.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.6 });
    // Shader-driven bamboo: the culm bend + leaf flutter run in the vertex
    // stage (see bambooSwayMaterial), so the groves cost zero CPU per frame.
    this.bambooTime = { value: 0 };
    this.matBambooSway = this.bambooSwayMaterial(false, false);
    this.matBambooLeafSway = this.bambooSwayMaterial(true, false);
    this.bambooDepthStalk = this.bambooSwayMaterial(false, true);
    this.bambooDepthLeaf = this.bambooSwayMaterial(true, true);

    this.sakuraSpots = [
      [-6, 8, 1.2], [7, 12, 1.0], [-12, -2, 1.3], [10, -4, 0.9],
      [-8, 32, 1.1], [16, 32, 1.2], [-18, 32, 1.0], [6, -18, 1.1],
      [-9, -26, 1.2], [9, -28, 1.0], [-22, -24, 1.1], [24, 14, 1.0],
      [-36, 24, 1.15], [20, -30, 1.2]
    ];
    this.dappleMeshes = [];
    this.dapplePools = [];
    for (const [x, z, s] of this.sakuraSpots) this.sakuraTree(x, z, s);
    this.buildDappledLight();
    this.buildPetalDrifts();
    // Footpath in from the village side, past Bokuchi's offering bell to
    // Mochi's clearing — keeps both reachable while the cat can still weave
    // between the per-culm colliders anywhere else in the grove.
    this.buildBambooGrove(30, -20, 7, [
      { pts: [[24.2, -15.4], [30.5, -16.5], [28, -18]], r: 1.05 },
      { pts: [[30.5, -16.5]], r: 1.5 },
      { pts: [[28, -18]], r: 1.6 }
    ]);
    this.buildBambooGrove(-32, -14, 5);
    this.buildMaplesAndPines();
    this.buildMeadow();
    this._finalizeStatic();
  }

  random() { return this.rng(); }

  /**
   * Bark, hero-tree leaf sprays and rim leaf masses. Split out of the
   * constructor so tools/tree_preview.js can build trees on their own.
   */
  _initMaterials() {
    // Bark with deep fissure normal maps
    this.matTrunks = [
      texturedMaterial(barkTextures(0x6d4d36, 0x2a1a11, 1), { roughness: 0.95, normalScale: 1.3 }),
      texturedMaterial(barkTextures(0x7c6650, 0x352518, 2), { roughness: 0.94, normalScale: 1.1 }),
      texturedMaterial(barkTextures(0x574539, 0x1f1712, 3), { roughness: 0.97, normalScale: 1.4 })
    ];
    this.matTrunk = this.matTrunks[0];
    // Hero-tree limbs bend in the same wind as the leaves they carry
    this.matBranches = this.matTrunks.map((m) => createBranchMaterial(m, { wind: TREE_WIND }));
    this.branchDepth = createFoliageDepthMaterial(null, 0, { flex: true, wind: TREE_WIND });

    // Hero trees: alpha-cut twig sprays (and matching depth materials, so
    // the shade under a tree is leaf-shaped and moves with the wind).
    this.sprays = {};
    for (const [kind, opts] of Object.entries({
      maple: { sss: 0.46, mottle: 0.16, bump: 0.32 },
      sakura: { sss: 0.5, mottle: 0.1, bump: 0.22, roughness: 0.85 },
      needle: { sss: 0.22, mottle: 0.2, bump: 0.36 }
    })) {
      const map = leafSprayTexture(kind);
      this.sprays[kind] = {
        material: createFoliageMaterial(Object.assign({ map, alphaTest: 0.5, side: THREE.DoubleSide, flex: true, twoSided: true, wind: TREE_WIND }, opts)),
        depth: createFoliageDepthMaterial(map, 0.5, { flex: true, wind: TREE_WIND })
      };
    }
    // Rim trees: blob canopies painted with leaf-mass textures whose
    // outlines break into leaves.
    this.masses = {
      sakura: createFoliageMaterial({ sss: 0.42, wind: 1.0, mottle: 0.16, bump: 0.35, roughness: 0.85, massMap: leafMassTexture('blossom'), massScale: 1 / 0.9, ragged: 1 }),
      maple: createFoliageMaterial({ sss: 0.4, wind: 1.0, mottle: 0.22, bump: 0.4, massMap: leafMassTexture('leaf'), massScale: 1 / 1.1, ragged: 1 }),
      needle: createFoliageMaterial({ sss: 0.18, wind: 0.6, mottle: 0.24, bump: 0.4, massMap: leafMassTexture('needle'), massScale: 1 / 1.2, ragged: 1 })
    };
    this.colSakura = [0xd27a94, 0xeaa2b6, 0xf6c6d2, 0xfbdde6];
    this.colMaple = [0x8e2d20, 0xc24a34, 0xe0704a, 0xf09060];
    this.colLeaf = [0x2f4f1c, 0x3f6626, 0x5a8536, 0x7aa348];
    this.colPine = [0x24401f, 0x33582f, 0x4a7040, 0x5f8850];
  }

  /**
   * How a tree at (x, z) is built: `rim` trees are leaf masses, the rest
   * hero trees; `bake` merges a tree into the static meshes instead of
   * keeping its own.
   */
  treeStyle(x, z) {
    const r = Math.hypot(x, z);
    return { rim: r > RIM_RADIUS, bake: r >= NEAR_RADIUS };
  }

  addCollider(x, z, r, h = 6) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - r, 0, z - r),
      new THREE.Vector3(x + r, h, z + r)
    ));
  }

  /**
   * A tree in one of two styles (see treeStyle):
   *
   *   hero — trunk + a four-deep twig skeleton carrying only individual
   *          leaf sprays (`leaves` options). Twigs and leaves share the
   *          flex wind, so the whole crown bends in the breeze with every
   *          leaf staying on its twig; no JS sway.
   *   rim  — the same trunk under textured leaf-mass clumps (`masses`
   *          options merged over `canopy`); no cards.
   *
   * Trunks are static and always bake into the per-material merges. Hero
   * trees near the village keep their own branch + leaf meshes so they cull
   * per tree; the rest bake too (the flex wind is per vertex, so baked
   * canopies sway exactly like the per-tree ones).
   */
  canopyTree(x, z, scale, { kind, colors, trunk, canopy, leaves = {}, masses = {}, collider = 0.35 }) {
    const tree = new THREE.Group();
    const treeIdx = ++this._treeCount;
    tree.name = `${kind.charAt(0).toUpperCase() + kind.slice(1)} Tree ${treeIdx}`;
    tree.position.set(x, 0, z);
    tree.rotation.y = this.random() * Math.PI * 2;
    tree.updateMatrix();

    const barkIdx = Math.abs(Math.floor(x * 0.7 + z * 1.3)) % this.matTrunks.length;
    const trunkMat = this.matTrunks[barkIdx];
    const trunkMesh = this.trunkMesh(trunk.rTop * scale, trunk.rBot * scale, trunk.h * scale, trunkMat, (this.random() - 0.5) * trunk.lean).children[0];
    trunkMesh.updateMatrix();
    this._bakeStatic(trunkMesh.geometry, new THREE.Matrix4().multiplyMatrices(tree.matrix, trunkMesh.matrix), trunkMat);

    const { rim, bake } = this.treeStyle(x, z);
    const base = { scale, colors, trunkH: trunk.h, trunkR: trunk.rTop * 1.15 };
    if (rim) {
      const built = buildCanopy(this.rng, Object.assign(base, canopy, masses, { style: 'masses' }));
      this._bakeStatic(built.branches, tree.matrix, trunkMat);
      this._bakeStatic(built.tufts, tree.matrix, this.masses[kind]);
    } else {
      const built = buildCanopy(this.rng, Object.assign(base, canopy, leaves, { style: 'leaves' }));
      const branchMat = this.matBranches[barkIdx];
      const set = this.sprays[kind];
      if (bake) {
        this._bakeStatic(built.branches, tree.matrix, branchMat, this.branchDepth, 'Canopy Limbs');
        this._bakeStatic(built.cards, tree.matrix, set.material, set.depth, 'Canopy Leaves');
      } else {
        const branches = new THREE.Mesh(built.branches, branchMat);
        branches.name = `${tree.name} Limbs`;
        branches.customDepthMaterial = this.branchDepth;
        const cards = new THREE.Mesh(built.cards, set.material);
        cards.name = `${tree.name} Leaves`;
        cards.customDepthMaterial = set.depth;
        for (const m of [branches, cards]) {
          m.castShadow = true;
          m.receiveShadow = true;
          tree.add(m);
        }
        this.scene.add(tree);
      }
    }

    this.addCollider(x, z, collider * scale);
    return tree;
  }

  /** Accumulate a world-baked geometry for the end-of-build static merge. */
  _bakeStatic(geo, matrix, material, depthMat = null, name = 'Trunks & Canopy') {
    let acc = this._staticAccum.get(material.uuid);
    if (!acc) {
      acc = { geos: [], material, depth: depthMat, name };
      this._staticAccum.set(material.uuid, acc);
    }
    geo.applyMatrix4(matrix);
    acc.geos.push(geo);
  }

  /** Merge every accumulated static geometry into one mesh per material. */
  _finalizeStatic() {
    for (const acc of this._staticAccum.values()) {
      if (!acc.geos.length) continue;
      const merged = mergeGeometries(acc.geos, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, acc.material);
      mesh.name = `Baked ${acc.name}`;
      if (acc.depth) mesh.customDepthMaterial = acc.depth;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    this._staticAccum.clear();
  }

  /** Tapered trunk with a flared root collar and a gentle lean. */
  trunkMesh(radiusTop, radiusBottom, height, mat, lean = 0) {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 9, 4);
    const pos = geo.attributes.position;
    // Flare the base and add slight bark undulation
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + height / 2;
      const t = y / height;
      const flare = 1 + Math.pow(Math.max(0, 1 - t * 4), 2) * 0.55;
      const wob = 1 + (Math.sin(pos.getX(i) * 9 + pos.getZ(i) * 7) * 0.04);
      pos.setX(i, pos.getX(i) * flare * wob);
      pos.setZ(i, pos.getZ(i) * flare * wob);
    }
    geo.computeVertexNormals();
    const trunk = new THREE.Mesh(geo, mat);
    trunk.position.y = height / 2;
    trunk.rotation.z = lean;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    return group;
  }

  sakuraTree(x, z, scale = 1) {
    // Somei-yoshino habit: a short trunk forking into wide, slightly
    // drooping limbs, the dark wood showing through clouds of blossom.
    this.canopyTree(x, z, scale, {
      kind: 'sakura',
      colors: this.colSakura,
      trunk: { rTop: 0.13, rBot: 0.22, h: 2.3, lean: 0.14 },
      canopy: { primaries: 6, tilt: 0.9, tiltVar: 0.2, droop: -0.08, bend: 0.14, branchLen: 1.5, secondaries: 2 },
      // Up close the blossom is nearly white with a blush; the deeper pinks
      // of colSakura stay for the rim masses seen from afar.
      leaves: {
        habit: 'cloud', twigsPerLimb: 3, sprigs: 2, sprayLen: 0.46, sprayAspect: 1, density: 11, tipSprays: 3,
        colors: [0xe4a2b6, 0xf0bccb, 0xf8d4de, 0xfde8ee]
      },
      masses: { twigs: false, crownFill: 3, clumpR: 0.5, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 11 }
    });
  }

  buildSakuraGrove() {}

  /**
   * Dappled sun pools: soft additive blobs of warm light scattered on the
   * ground beneath each sakura canopy. Their opacity tracks the sun so they
   * bloom at golden hour and vanish at night.
   */
  buildDappledLight() {
    if (!this.dappleTex) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      for (let i = 0; i < 26; i++) {
        const bx = 8 + this.random() * 48;
        const by = 8 + this.random() * 48;
        const br = 3 + this.random() * 7;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, 'rgba(255, 214, 150, 0.5)');
        g.addColorStop(1, 'rgba(255, 214, 150, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      this.dappleTex = new THREE.CanvasTexture(c);
      this.dappleTex.colorSpace = THREE.SRGBColorSpace;
    }
    const geo = new THREE.PlaneGeometry(2.6, 2.6);
    for (const [x, z, s] of this.sakuraSpots) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.dappleTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const pool = new THREE.Mesh(geo, mat);
      pool.rotation.x = -Math.PI / 2;
      // Offset pools toward the afternoon sun so light falls through foliage
      pool.position.set(x - 0.6 * s, 0.055, z + 0.8 * s);
      pool.scale.setScalar(s * (1.0 + this.random() * 0.5));
      pool.renderOrder = 1;
      pool.name = `Dapple Pool ${this.dapplePools.length + 1}`;
      this.scene.add(pool);
      this.dappleMeshes.push(mat);
      this.dapplePools.push(pool);
    }
  }

  buildPetalDrifts() {
    // Violet/pink flat drift circles removed — falling petals handle it.
    if (true) return;
    const mat = new THREE.MeshStandardMaterial({ color: 0xf4b8c8, roughness: 1, transparent: true, opacity: 0.85 });
    const geo = new THREE.CircleGeometry(1, 12);
    for (const [x, z, s] of this.sakuraSpots) {
      const patches = 2 + Math.floor(this.random() * 2);
      for (let i = 0; i < patches; i++) {
        const drift = new THREE.Mesh(geo, mat);
        drift.rotation.x = -Math.PI / 2;
        const a = this.random() * Math.PI * 2;
        const r = this.random() * 2.2 * s;
        drift.position.set(x + Math.cos(a) * r, 0.035 + i * 0.002, z + Math.sin(a) * r);
        drift.scale.setScalar((0.8 + this.random() * 1.2) * s);
        drift.receiveShadow = true;
        this.scene.add(drift);
      }
    }
  }

  buildBambooGrove(cx, cz, radius, corridors = []) {
    const count = Math.floor(radius * radius * 1.6);
    const leavesPerStalk = 72;
    const leafTotal = count * leavesPerStalk;

    // Corridors are { pts: [[x,z], ...], r } polylines (a single point is a
    // round clearing). Stalks landing inside one are skipped entirely, so
    // the gaps read as real openings in the grove — a footpath to walk,
    // not invisible holes in a wall.
    const distToSeg = (x, z, a, b) => {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz));
    };
    const inCorridor = (x, z) => corridors.some((c) => {
      if (c.pts.length === 1) return Math.hypot(x - c.pts[0][0], z - c.pts[0][1]) < c.r;
      for (let s = 0; s + 1 < c.pts.length; s++) {
        if (distToSeg(x, z, c.pts[s], c.pts[s + 1]) < c.r) return true;
      }
      return false;
    });

    // Lower culms sit below the bend point and never move: bake their
    // matrices once into a plain InstancedMesh.
    const lowerStalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.065, 0.075, 7, 6), this.matBamboo, count);
    lowerStalks.castShadow = true;

    // Upper culms + leaves carry per-plant data in instanced attributes and
    // animate entirely in the vertex shader — zero per-frame JS or uploads.
    const upperGeo = new THREE.InstancedBufferGeometry().copy(new THREE.CylinderGeometry(0.055, 0.065, 7, 6));
    const leafGeo = new THREE.InstancedBufferGeometry().copy(this.bladeGeometry());
    const plantArr = new Float32Array(count * 4);   // x, z, height, phase
    const yawArr = new Float32Array(count);
    const leafPlant = new Float32Array(leafTotal * 4);
    const leafA = new Float32Array(leafTotal * 4);  // angle, heightRatio, branchLength, phase
    const leafB = new Float32Array(leafTotal * 4);  // length, width, roll, plant yaw
    const dummy = new THREE.Object3D();

    let planted = 0;
    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2;
      const r = Math.sqrt(this.random()) * radius;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (inCorridor(x, z)) continue;
      const k = planted++;
      const height = 5.6 + this.random() * 3.2;
      const yaw = this.random() * Math.PI * 2;
      const phase = this.random() * Math.PI * 2;
      plantArr[k * 4] = x;
      plantArr[k * 4 + 1] = z;
      plantArr[k * 4 + 2] = height;
      plantArr[k * 4 + 3] = phase;
      yawArr[k] = yaw;

      // Static lower culm (below the bend point)
      const bendStart = height * 0.64;
      dummy.position.set(x, bendStart / 2, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, bendStart / 7, 1);
      dummy.updateMatrix();
      lowerStalks.setMatrixAt(k, dummy.matrix);

      // One thin box per culm instead of a single grove-sized slab: the cat
      // can weave between stalks, so the grove is somewhere to walk through
      // rather than a hedge to walk around.
      this.addCollider(x, z, 0.1);

      // Dense, top-heavy foliage hides upper culms while leaving the base open.
      for (let j = 0; j < leavesPerStalk; j++) {
        const li = k * leavesPerStalk + j;
        leafPlant[li * 4] = x;
        leafPlant[li * 4 + 1] = z;
        leafPlant[li * 4 + 2] = height;
        leafPlant[li * 4 + 3] = phase;
        leafA[li * 4] = this.random() * Math.PI * 2;                      // angle
        leafA[li * 4 + 1] = 0.22 + Math.pow(this.random(), 0.48) * 0.76;  // heightRatio
        leafA[li * 4 + 2] = 0.18 + this.random() * 0.46;                  // branchLength
        leafA[li * 4 + 3] = this.random() * Math.PI * 2;                  // phase
        leafB[li * 4] = 0.48 + this.random() * 0.42;                      // length
        leafB[li * 4 + 1] = 0.78 + this.random() * 0.52;                  // width
        leafB[li * 4 + 2] = (this.random() - 0.5) * 0.38;                 // roll
        leafB[li * 4 + 3] = yaw;                                          // plant yaw
      }
    }
    lowerStalks.count = planted;
    lowerStalks.instanceMatrix.needsUpdate = true;

    upperGeo.setAttribute('aPlant', new THREE.InstancedBufferAttribute(plantArr, 4));
    upperGeo.setAttribute('aYaw', new THREE.InstancedBufferAttribute(yawArr, 1));
    upperGeo.instanceCount = planted;
    leafGeo.setAttribute('aPlant', new THREE.InstancedBufferAttribute(leafPlant, 4));
    leafGeo.setAttribute('aLeafA', new THREE.InstancedBufferAttribute(leafA, 4));
    leafGeo.setAttribute('aLeafB', new THREE.InstancedBufferAttribute(leafB, 4));
    leafGeo.instanceCount = planted * leavesPerStalk;

    const groveSphere = new THREE.Sphere(new THREE.Vector3(cx, 4.5, cz), radius + 7);
    upperGeo.boundingSphere = groveSphere.clone();
    leafGeo.boundingSphere = groveSphere.clone();

    const upperStalks = new THREE.Mesh(upperGeo, this.matBambooSway);
    const leaves = new THREE.Mesh(leafGeo, this.matBambooLeafSway);
    upperStalks.castShadow = true;
    leaves.castShadow = true;
    upperStalks.customDepthMaterial = this.bambooDepthStalk;
    leaves.customDepthMaterial = this.bambooDepthLeaf;
    this.scene.add(lowerStalks);
    this.scene.add(upperStalks);
    this.scene.add(leaves);
  }

  /**
   * Bamboo materials with the culm bend + leaf flutter computed in the
   * vertex shader. Per-plant data rides in instanced attributes and the GLSL
   * replicates the previous per-frame JS matrices exactly (Euler XYZ bend of
   * the upper culm, leaf cards hung off the bent culm with their own
   * flutter), so the groves cost zero CPU per frame. `leaf` selects the
   * leaf-card attribute layout; `depth` builds the matching shadow material
   * so shadows sway with the culms.
   */
  bambooSwayMaterial(leaf, depth) {
    const mat = depth
      ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
      : leaf
        ? new THREE.MeshStandardMaterial({ color: 0x74a04a, roughness: 0.9, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.6 });
    const time = this.bambooTime;
    const head = /* glsl */`
      uniform float uTime;
      attribute vec4 aPlant;
      ${leaf ? 'attribute vec4 aLeafA;\n      attribute vec4 aLeafB;' : 'attribute float aYaw;'}
      mat3 bEuler(vec3 r) {
        float cx = cos(r.x), sx = sin(r.x);
        float cy = cos(r.y), sy = sin(r.y);
        float cz = cos(r.z), sz = sin(r.z);
        return mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx)
             * mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy)
             * mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
      }
    `;
    let bend;
    if (leaf) {
      bend = /* glsl */`
        vec4 bP = aPlant;
        vec4 bA = aLeafA;
        vec4 bB = aLeafB;
        float bBx = cos(uTime * 0.62 + bP.w * 1.17) * 0.032;
        float bBz = sin(uTime * 0.75 + bP.w) * 0.085;
        float bH = bP.z * bA.y;
        float bStart = bP.z * 0.64;
        mat3 bRb = bEuler(vec3(bBx, bB.w, bBz));
        vec3 bBent = bRb * vec3(0.0, max(0.0, bH - bStart), 0.0);
        float bHW = smoothstep(0.45, 1.0, bA.y);
        mat3 bRl = bEuler(vec3(
          0.72 + cos(uTime * 0.62 + bA.w) * 0.06 * bHW,
          bA.x + 1.5707963,
          -0.95 + bBz * bHW + bB.z));
        vec3 transformed = vec3(
          bP.x + bBent.x + cos(bA.x) * bA.z,
          min(bH, bStart) + bBent.y,
          bP.y + bBent.z + sin(bA.x) * bA.z
        ) + bRl * (position * vec3(bB.y, bB.x, bB.y));
      `;
    } else {
      bend = /* glsl */`
        vec4 bP = aPlant;
        float bStart = bP.z * 0.64;
        float bH = bP.z - bStart;
        mat3 bR = bEuler(vec3(cos(uTime * 0.62 + bP.w * 1.17) * 0.032, aYaw, sin(uTime * 0.75 + bP.w) * 0.085));
        vec3 bC = bR * vec3(0.0, bH * 0.5, 0.0);
        vec3 transformed = vec3(bP.x + bC.x, bStart + bC.y, bP.y + bC.z)
          + bR * (position * vec3(1.0, bH / 7.0, 1.0));
      `;
    }
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = head + shader.vertexShader
        .replace('#include <begin_vertex>', bend);
      if (!depth) {
        // Rotate shading normals with the same bend so lighting follows.
        const norm = leaf ? /* glsl */`
          vec4 bNP = aPlant;
          vec4 bNA = aLeafA;
          vec4 bNB = aLeafB;
          float bNBx = cos(uTime * 0.62 + bNP.w * 1.17) * 0.032;
          float bNBz = sin(uTime * 0.75 + bNP.w) * 0.085;
          mat3 bNRl = bEuler(vec3(
            0.72 + cos(uTime * 0.62 + bNA.w) * 0.06 * smoothstep(0.45, 1.0, bNA.y),
            bNA.x + 1.5707963,
            -0.95 + bNBz * smoothstep(0.45, 1.0, bNA.y) + bNB.z));
          #include <beginnormal_vertex>
          objectNormal = bNRl * objectNormal;
        ` : /* glsl */`
          vec4 bNP = aPlant;
          mat3 bNR = bEuler(vec3(
            cos(uTime * 0.62 + bNP.w * 1.17) * 0.032,
            aYaw,
            sin(uTime * 0.75 + bNP.w) * 0.085));
          #include <beginnormal_vertex>
          objectNormal = bNR * objectNormal;
        `;
        shader.vertexShader = shader.vertexShader
          .replace('#include <beginnormal_vertex>', norm);
      }
    };
    mat.customProgramCacheKey = () => 'bamboo-' + (leaf ? 'leaf' : 'stalk') + (depth ? '-depth' : '');
    return mat;
  }

  mapleTree(x, z, scale = 1) {
    // Japanese maple: layered, near-horizontal limbs holding flat tiers of
    // palmate leaves in crimson-to-coral.
    this.canopyTree(x, z, scale, {
      kind: 'maple',
      colors: this.colMaple,
      trunk: { rTop: 0.11, rBot: 0.2, h: 2.0, lean: 0.1 },
      canopy: { primaries: 5, tilt: 1.02, tiltVar: 0.18, droop: 0.05, bend: 0.1, branchLen: 1.3, secondaries: 2 },
      leaves: { habit: 'tier', twigsPerLimb: 3, sprigs: 2, sprayLen: 0.42, density: 14, tipSprays: 3 },
      masses: { twigs: false, crownFill: 2, clumpR: 0.44, tuftsPerClump: [3, 2, 2], tuftFlat: 0.55, lump: 0.36, seed: 23 },
      collider: 0.3
    });
  }

  pineTree(x, z, scale = 1) {
    // Niwaki garden pine: a leaning trunk, a few reaching limbs, and flat
    // cloud-pruned needle pads at their ends.
    this.canopyTree(x, z, scale, {
      kind: 'needle',
      colors: this.colPine,
      trunk: { rTop: 0.09, rBot: 0.17, h: 1.9, lean: 0.2 },
      canopy: { primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45, secondaries: 2 },
      leaves: { habit: 'pad', sprayLen: 0.36, sprayAspect: 1, padSprays: 30, padR: 0.45 },
      masses: { twigs: false, crownFill: 2, clumpR: 0.6, tuftsPerClump: [4, 3, 2], tuftFlat: 0.42, pad: true, lump: 0.34, seed: 37 },
      collider: 0.3
    });
  }

  buildMaplesAndPines() {
    const maples = this.mapleSpots = [[-16, 14, 1.1], [14, 6, 1.0], [-6, -34, 1.2], [8, -36, 1.0], [28, 6, 1.1]];
    for (const [x, z, s] of maples) this.mapleTree(x, z, s);
    const pines = [[-36, 6, 1.4], [-40, -6, 1.2], [36, 20, 1.3], [40, -8, 1.5], [34, 34, 1.2], [-38, 32, 1.3]];
    for (const [x, z, s] of pines) this.pineTree(x, z, s);
  }

  /**
   * The meadow — every Grass Lab recipe (src/grass.js) laid out by a biome
   * mask painted from the valley's own colliders, paths and water:
   *  - rings that follow the cat: Bezier blade tufts with pressed trails
   *    near, tri-quad clumps mid, painted tuft cards far, a shell carpet
   *    under the paws;
   *  - cat-eye thicket where the meadow meets paths, walls and banks;
   *  - wildflower cards in drifts, thicker under the sakura;
   *  - susuki plumes on the river banks, paddy bunds and the wild rim;
   *  - mown stripes on the tended lawns of the shrine precinct;
   *  - moss pillows at tree roots, the Moon Pool and the shrine;
   *  - lantern fibers in the Lantern Glade, yarn curls in the turtle corral,
   *    and hotaru fireflies over the river at night.
   */
  buildMeadow() {
    const mask = new BiomeMask(-52, -52, 104, 256);
    for (const c of this.colliders) mask.box('excl', c.min.x - 0.15, c.min.z - 0.15, c.max.x + 0.15, c.max.z + 0.15);
    for (const r of this.exclusionRects) mask.rect('excl', r.x, r.z, r.width, r.depth);
    for (const [px, pz, w, d] of this.waterRects) {
      mask.rect('excl', px, pz, w + 0.8, d + 0.8);
      mask.rect('wild', px, pz, w + 3.4, d + 3.4, 0.7);   // paddy bunds
    }
    for (const s of this.pathSamples) mask.disc('excl', s.x, s.z, 1.3, 1, 0.4);
    for (const s of this.riverSamples) {
      mask.disc('excl', s.x, s.z, 3.5);
      mask.disc('wild', s.x, s.z, 5.6, 1, 2.2);
    }
    // Tended lawns either side of the shrine approach (torii → hall)
    const lawns = [[-4.7, -27.2, 2.1, 3.9], [4.7, -27.2, 2.1, 3.9]];
    for (const [x, z, hw, hd] of lawns) mask.rect('lawn', x, z, hw * 2, hd * 2);
    // The turtle corral grows yarn curls instead of meadow
    mask.disc('excl', -31, 9, 2.0, 1, 0.6);
    // Where the old susuki clumps stood, the meadow stays wild
    for (const [sx, sz] of [[-10, 24], [6, 28], [22, 26], [32, 24], [-16, 2], [-4, -4], [4, -14],
      [8, -20], [-12, -22], [24, -12], [28, 8], [-26, 4], [-20, 18]]) mask.disc('wild', sx, sz, 1.6, 1, 1.6);
    // The wild rim before the forest, and flower drifts through the open meadow
    mask.paint('wild', (x, z) => THREE.MathUtils.smoothstep(Math.hypot(x, z), 37, 46));
    mask.paint('flower', (x, z) => {
      const drift = Math.sin(x * 0.21) * Math.cos(z * 0.17) + 0.45 * Math.sin(x * 0.07 + z * 0.11 + 1.3);
      return THREE.MathUtils.smoothstep(drift, 0.2, 0.85) * 0.85;
    });
    for (const [x, z] of this.sakuraSpots) mask.disc('flower', x, z, 2.6, 0.8, 2.2);
    mask.rect('flower', 0, -18.5, 9, 5, 0.6);   // torii approach
    mask.bake((x, z) => 1 - THREE.MathUtils.smoothstep(Math.hypot(x, z), 45, 50));

    const grass = this.grass = new GrassSystem(this.scene, { mask, wind: 0.55, gustLit: 0.45 });
    grass.addRing('near', { radius: 8, spacing: 0.115, lead: 0.25 });
    grass.addRing('mid', { radius: 24, spacing: 0.27, lead: 0.4, inside: 'near' });
    grass.addRing('far', { radius: 58, spacing: 0.62, lead: 0.45, inside: 'mid' });
    grass.addShell({ radius: 4.5, layers: 10, height: 0.085, density: 75, lead: 0.3, minQuality: 1 });
    grass.addRing('thicket', { radius: 30, spacing: 0.5, lead: 0.45 });
    grass.addRing('flowers', { radius: 26, spacing: 0.34, lead: 0.4 });
    grass.addRing('susuki', { radius: 34, spacing: 0.95, lead: 0.4 });
    lawns.forEach(([x, z, hw, hd], i) => grass.addZone('mown', { name: 'mown' + i, x, z, hw, hd, spacing: 0.042, maxDist: 45 }));
    // GLADE (-31, -10, r 6) and POOL (-20, -27, r 3) live in hidden_places.js
    grass.addZone('lantern', { x: -31, z: -10, hw: 5.4, hd: 5.4, spacing: 0.065, maxDist: 40 });
    grass.addZone('yarn', { x: -31, z: 9, hw: 2.1, hd: 2.1, spacing: 0.075, maxDist: 35 });
    grass.addFireflies({ x: 0, z: 29, hw: 44, hd: 4.2, count: 90 });

    const moss = [];
    const nearPath = (x, z, r) => this.pathSamples.some((s) => Math.hypot(s.x - x, s.z - z) < r + 1.2);
    for (const [x, z, s] of [...this.sakuraSpots, ...this.mapleSpots]) {
      if (Math.hypot(x, z) < RIM_RADIUS && !nearPath(x, z, 1.5)) moss.push({ x, z, r: 1.2 + s * 0.45 });
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      moss.push({ x: -20 + Math.cos(a) * 4.1, z: -27 + Math.sin(a) * 4.1, r: 1.25 });
    }
    moss.push({ x: -2.9, z: -30.6, r: 1.3 }, { x: 2.9, z: -30.6, r: 1.3 }, { x: -23.5, z: -20.5, r: 1.2 });
    grass.addMoss(moss);
    this.grassMeshes = grass.meshes;
  }

  isExcluded(x, z) {
    for (const rect of this.exclusionRects) {
      if (Math.abs(x - rect.x) < rect.width / 2 && Math.abs(z - rect.z) < rect.depth / 2) return true;
    }
    for (const [px, pz, w, d] of this.waterRects) {
      if (Math.abs(x - px) < w / 2 + 0.6 && Math.abs(z - pz) < d / 2 + 0.6) return true;
    }
    for (let i = 0; i < this.pathSamples.length; i += 2) {
      const s = this.pathSamples[i];
      const dx = x - s.x, dz = z - s.z;
      if (dx * dx + dz * dz < 3.2) return true;
    }
    for (let i = 0; i < this.riverSamples.length; i += 2) {
      const s = this.riverSamples[i];
      const dx = x - s.x, dz = z - s.z;
      if (dx * dx + dz * dz < 12) return true;
    }
    for (const c of this.colliders) {
      if (x > c.min.x - 0.15 && x < c.max.x + 0.15 && z > c.min.z - 0.15 && z < c.max.z + 0.15) return true;
    }
    return false;
  }

  /**
   * A tapered, gently arched blade fan from root to a single tip vertex —
   * the bamboo leaf card (the meadow itself lives in src/grass.js).
   */
  bladeGeometry(rows = 4, baseWidth = 0.048, height = 0.95, curveAmt = 0.32, taperPow = 1.35) {
    const positions = [];
    const uvs = [];
    const indices = [];

    // Tapering to a sharp pointed tip at the top end (90%+ thin & pointed)
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      // Exponential taper towards needle-sharp apex
      const w = baseWidth * Math.pow(1.0 - t, taperPow);
      const curve = t * t * curveAmt;
      positions.push(
        -w / 2, t * height, curve * 0.35,
        0, t * height, curve,
        w / 2, t * height, curve * 0.35
      );
      uvs.push(0, t, 0.5, t, 1, t);
    }

    // Top apex: single sharp pointed vertex
    const topCurve = curveAmt * 1.09;
    positions.push(0, height, topCurve);
    uvs.push(0.5, 1.0);
    const apexIndex = rows * 3;

    // Quad rows
    for (let i = 0; i < rows - 1; i++) {
      const a = i * 3, b = (i + 1) * 3;
      indices.push(
        a, b, a + 1,
        a + 1, b, b + 1,
        a + 1, b + 1, a + 2,
        a + 2, b + 1, b + 2
      );
    }

    // Connect last row to apex point
    const last = (rows - 1) * 3;
    indices.push(
      last, apexIndex, last + 1,
      last + 1, apexIndex, last + 2
    );

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Quality-tier lever: the grass rings widen their hash grid (uniformly
   * sparser turf, never a mowed pattern) and the low tier drops the shell
   * carpet.
   */
  setDensity(fraction) {
    const f = THREE.MathUtils.clamp(fraction, 0.05, 1);
    if (this.grass) this.grass.setDensity(f);
    // Dapple pools are additive transparent quads stacked on the ground —
    // pure overdraw, and the first thing worth thinning on a phone.
    const pools = Math.round(this.dapplePools.length * f);
    for (let i = 0; i < this.dapplePools.length; i++) this.dapplePools[i].visible = i < pools;
  }

  update(dt, playerPos, sky = null) {
    this.time += dt;
    updateFoliage(this.time, sky, playerPos);
    if (this.grass) {
      let wind = 0.55;
      if (sky && (sky.weather === 'snow' || sky.weather === 'cloudy' || sky.weather === 'mist' || sky.weather === 'rain')) {
        wind += 0.4 + 0.4 * Math.max(0, sky.weatherBlend * 2 - 0.2);
      }
      const ctx = this.grassContext || {};
      const others = this._grassOthers || (this._grassOthers = []);
      others.length = 0;
      if (ctx.npcs && playerPos) {
        for (const n of ctx.npcs) {
          const p = n.mesh && n.mesh.position;
          if (p && p.y < 0.6 && Math.abs(p.x - playerPos.x) < 10 && Math.abs(p.z - playerPos.z) < 10) others.push(p);
        }
      }
      this.grass.update(dt, {
        renderer: ctx.renderer, camera: ctx.camera, focus: playerPos || this.grass.U.uFocus.value,
        cat: ctx.player ? ctx.player.cat : null, sky, wind, others
      });
    }
    // Dappled light pools track golden-hour sun
    if (sky && this.dappleMeshes) {
      const sunUp = Math.max(0, sky.sunDir.y);
      const golden = sunUp * Math.exp(-Math.max(0, sky.sunDir.y) * 2.4);
      const flicker = 0.88 + Math.sin(this.time * 0.9) * 0.12;
      const o = Math.min(0.5, golden * 0.66) * flicker;
      for (let i = 0; i < this.dappleMeshes.length; i++) {
        this.dappleMeshes[i].opacity = o * (0.85 + Math.sin(this.time * 0.6 + i * 2.1) * 0.15);
      }
    }
    for (const s of this.swayables) {
      s.node.rotation.z = Math.sin(this.time * s.freq * 0.25 + s.phase) * s.amp;
      s.node.rotation.x = Math.cos(this.time * s.freq * 0.20 + s.phase) * s.amp * 0.7;
    }
    // Bamboo culms + leaves animate in the vertex shader; only the clock moves.
    this.bambooTime.value = this.time;
  }
}
