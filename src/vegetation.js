import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { barkTextures, texturedMaterial } from './textures.js?v=20260909a';
import { createFoliageMaterial, createFoliageDepthMaterial, leafCardTexture, buildCanopy, updateFoliage } from './foliage.js?v=20260909a';

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
    this.pathSamples = options.pathSamples || [];
    this.waterRects = options.waterRects || [];
    this.riverSamples = options.riverSamples || [];
    this.exclusionRects = options.exclusionRects || [];
    this.bambooSwayables = [];

    // Bark with deep fissure normal maps
    this.matTrunks = [
      texturedMaterial(barkTextures(0x6d4d36, 0x2a1a11, 1), { roughness: 0.95, normalScale: 1.3 }),
      texturedMaterial(barkTextures(0x7c6650, 0x352518, 2), { roughness: 0.94, normalScale: 1.1 }),
      texturedMaterial(barkTextures(0x574539, 0x1f1712, 3), { roughness: 0.97, normalScale: 1.4 })
    ];
    this.matTrunk = this.matTrunks[0];

    // One painterly foliage shader for every canopy; colours come from
    // per-vertex tints baked into the merged tuft geometry. Each kind pairs
    // a tuft-core material with an alpha-cut leaf-spray card material (and
    // a depth material so the cards throw leaf-shaped shadows).
    this.matFoliage = createFoliageMaterial({ sss: 0.34, wind: 1.0, mottle: 0.4 });
    this.matBlossom = createFoliageMaterial({ sss: 0.42, wind: 1.15, mottle: 0.24, bump: 0.44, roughness: 0.85 });
    this.matNeedle = createFoliageMaterial({ sss: 0.18, wind: 0.6, mottle: 0.42 });
    this.cardSets = {};
    for (const [kind, opts] of Object.entries({
      broadleaf: { sss: 0.4, wind: 1.05, mottle: 0.22, bump: 0.4 },
      maple: { sss: 0.46, wind: 1.1, mottle: 0.22, bump: 0.4 },
      sakura: { sss: 0.5, wind: 1.2, mottle: 0.14, bump: 0.28, roughness: 0.85 },
      needle: { sss: 0.22, wind: 0.65, mottle: 0.26, bump: 0.42 }
    })) {
      const map = leafCardTexture(kind);
      this.cardSets[kind] = {
        material: createFoliageMaterial(Object.assign({ map, alphaTest: 0.5, side: THREE.DoubleSide }, opts)),
        depth: createFoliageDepthMaterial(map, 0.5)
      };
    }
    this.colSakura = [0xd27a94, 0xeaa2b6, 0xf6c6d2, 0xfbdde6];
    this.colMaple = [0x8e2d20, 0xc24a34, 0xe0704a, 0xf09060];
    this.colLeaf = [0x2f4f1c, 0x3f6626, 0x5a8536, 0x7aa348];
    this.colPine = [0x24401f, 0x33582f, 0x4a7040, 0x5f8850];

    this.matBamboo = new THREE.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.6 });
    this.matBambooLeaf = new THREE.MeshStandardMaterial({ color: 0x74a04a, roughness: 0.9, side: THREE.DoubleSide });
    this.matSusuki = new THREE.MeshStandardMaterial({ color: 0xd9cca8, roughness: 0.9, side: THREE.DoubleSide });

    this.sakuraSpots = [
      [-6, 8, 1.2], [7, 12, 1.0], [-12, -2, 1.3], [10, -4, 0.9],
      [-8, 32, 1.1], [16, 32, 1.2], [-18, 32, 1.0], [6, -18, 1.1],
      [-9, -26, 1.2], [9, -28, 1.0], [-22, -24, 1.1], [24, 14, 1.0],
      [-36, 24, 1.15], [20, -30, 1.2]
    ];
    this.dappleMeshes = [];
    for (const [x, z, s] of this.sakuraSpots) this.sakuraTree(x, z, s);
    this.buildDappledLight();
    this.buildPetalDrifts();
    this.buildBambooGrove(30, -20, 7);
    this.buildBambooGrove(-32, -14, 5);
    this.buildMaplesAndPines();
    this.buildSusukiGrass();
    this.buildGrass();
    this.buildGroundCover();
    this.buildWildflowers();
  }

  random() { return this.rng(); }

  addCollider(x, z, r, h = 6) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - r, 0, z - r),
      new THREE.Vector3(x + r, h, z + r)
    ));
  }

  /**
   * Realistic tree: trunk + branching skeleton whose limbs carry dense leaf
   * clumps (lumpy cores fringed with alpha-cut leaf sprays). The crown group
   * sways as one; the branches stay put so limbs never detach.
   */
  canopyTree(x, z, scale, { kind, tuftMat, colors, trunk, canopy, sway = 0.02, collider = 0.35 }) {
    const tree = new THREE.Group();
    const trunkMat = this.matTrunks[Math.abs(Math.floor(x * 0.7 + z * 1.3)) % this.matTrunks.length];
    tree.add(this.trunkMesh(trunk.rTop * scale, trunk.rBot * scale, trunk.h * scale, trunkMat, (this.random() - 0.5) * trunk.lean));

    const built = buildCanopy(this.rng, Object.assign({ scale, colors, trunkH: trunk.h, trunkR: trunk.rTop * 1.15 }, canopy));
    const branches = new THREE.Mesh(built.branches, trunkMat);
    branches.castShadow = true;
    branches.receiveShadow = true;
    tree.add(branches);

    const crown = new THREE.Group();
    const tufts = new THREE.Mesh(built.tufts, tuftMat);
    tufts.castShadow = true;
    tufts.receiveShadow = true;
    crown.add(tufts);
    const set = this.cardSets[kind];
    const cards = new THREE.Mesh(built.cards, set.material);
    cards.customDepthMaterial = set.depth;
    cards.castShadow = true;
    cards.receiveShadow = true;
    crown.add(cards);
    tree.add(crown);
    this.swayables.push({ node: crown, amp: sway, freq: 0.7 + this.random() * 0.5, phase: this.random() * 6 });

    tree.position.set(x, 0, z);
    tree.rotation.y = this.random() * Math.PI * 2;
    this.scene.add(tree);
    this.addCollider(x, z, collider * scale);
    return tree;
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
    // drooping limbs smothered in blossom clusters.
    this.canopyTree(x, z, scale, {
      kind: 'sakura',
      tuftMat: this.matBlossom,
      colors: this.colSakura,
      trunk: { rTop: 0.13, rBot: 0.22, h: 2.3, lean: 0.14 },
      canopy: {
        primaries: 6, tilt: 0.9, tiltVar: 0.2, droop: -0.08, bend: 0.14, branchLen: 1.5,
        secondaries: 2, twigs: true, crownFill: 3, clumpR: 0.4,
        tuftsPerClump: [3, 3, 2], cardsPerClump: [11, 10, 7], cardSize: 0.6,
        tuftFlat: 0.72, lump: 0.34, seed: 11
      },
      sway: 0.02
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
      this.scene.add(pool);
      this.dappleMeshes.push(mat);
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

  buildBambooGrove(cx, cz, radius) {
    const count = Math.floor(radius * radius * 1.6);
    const lowerStalkGeo = new THREE.CylinderGeometry(0.065, 0.075, 7, 6);
    const upperStalkGeo = new THREE.CylinderGeometry(0.055, 0.065, 7, 6);
    const lowerStalks = new THREE.InstancedMesh(lowerStalkGeo, this.matBamboo, count);
    const upperStalks = new THREE.InstancedMesh(upperStalkGeo, this.matBamboo, count);
    lowerStalks.castShadow = true;
    upperStalks.castShadow = true;
    const leafGeo = this.bladeGeometry();
    const leavesPerStalk = 72;
    const leaves = new THREE.InstancedMesh(leafGeo, this.matBambooLeaf, count * leavesPerStalk);
    leaves.castShadow = true;
    const dummy = new THREE.Object3D();
    const plantData = [];
    const leafData = [];
    let leafIndex = 0;

    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2;
      const r = Math.sqrt(this.random()) * radius;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const height = 5.6 + this.random() * 3.2;
      const yaw = this.random() * Math.PI * 2;
      const plant = { x, z, height, yaw, phase: this.random() * Math.PI * 2 };
      plantData.push(plant);

      this.setBambooStalkMatrices(lowerStalks, upperStalks, i, plant, 0);

      // Dense, top-heavy foliage hides upper culms while leaving the base open.
      for (let j = 0; j < leavesPerStalk; j++) {
        const angle = this.random() * Math.PI * 2;
        const heightRatio = 0.22 + Math.pow(this.random(), 0.48) * 0.76;
        const branchLength = 0.18 + this.random() * 0.46;
        const leaf = {
          plant,
          angle,
          heightRatio,
          branchLength,
          length: 0.48 + this.random() * 0.42,
          width: 0.78 + this.random() * 0.52,
          roll: (this.random() - 0.5) * 0.38,
          phase: this.random() * Math.PI * 2
        };
        leafData.push(leaf);
        this.setBambooLeafMatrix(leaves, leafIndex++, leaf, 0);
      }
    }
    lowerStalks.instanceMatrix.needsUpdate = true;
    upperStalks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    this.scene.add(lowerStalks);
    this.scene.add(upperStalks);
    this.scene.add(leaves);
    this.bambooSwayables.push({ lowerStalks, upperStalks, leaves, plantData, leafData, leafCount: leafIndex });
    this.addCollider(cx, cz, radius * 0.7);
  }

  getBambooBend(plant, time) {
    return {
      x: Math.cos(time * 0.62 + plant.phase * 1.17) * 0.032,
      z: Math.sin(time * 0.75 + plant.phase) * 0.085
    };
  }

  setBambooStalkMatrices(lowerMesh, upperMesh, index, plant, time) {
    const bendStart = plant.height * 0.64;
    const upperHeight = plant.height - bendStart;
    const lower = new THREE.Object3D();
    lower.position.set(plant.x, bendStart / 2, plant.z);
    lower.rotation.y = plant.yaw;
    lower.scale.set(1, bendStart / 7, 1);
    lower.updateMatrix();
    lowerMesh.setMatrixAt(index, lower.matrix);

    const bend = this.getBambooBend(plant, time);
    const upper = new THREE.Object3D();
    upper.rotation.set(bend.x, plant.yaw, bend.z);
    const centerOffset = new THREE.Vector3(0, upperHeight / 2, 0).applyEuler(upper.rotation);
    upper.position.set(plant.x + centerOffset.x, bendStart + centerOffset.y, plant.z + centerOffset.z);
    upper.scale.set(1, upperHeight / 7, 1);
    upper.updateMatrix();
    upperMesh.setMatrixAt(index, upper.matrix);
  }

  setBambooLeafMatrix(mesh, index, leaf, time) {
    const { plant } = leaf;
    const bend = this.getBambooBend(plant, time);
    const swayY = Math.cos(time * 0.62 + leaf.phase) * 0.06;
    const h = plant.height * leaf.heightRatio;
    const bendStart = plant.height * 0.64;
    const bendHeight = Math.max(0, h - bendStart);
    const bentOffset = new THREE.Vector3(0, bendHeight, 0).applyEuler(new THREE.Euler(bend.x, plant.yaw, bend.z));
    const dummy = new THREE.Object3D();
    dummy.position.set(
      plant.x + bentOffset.x + Math.cos(leaf.angle) * leaf.branchLength,
      Math.min(h, bendStart) + bentOffset.y,
      plant.z + bentOffset.z + Math.sin(leaf.angle) * leaf.branchLength
    );
    const heightWeight = THREE.MathUtils.smoothstep(leaf.heightRatio, 0.45, 1);
    dummy.rotation.set(0.72 + swayY * heightWeight, leaf.angle + Math.PI / 2, -0.95 + bend.z * heightWeight + leaf.roll);
    dummy.scale.set(leaf.width, leaf.length, leaf.width);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  mapleTree(x, z, scale = 1) {
    // Japanese maple: layered, near-horizontal limbs holding flat tiers of
    // palmate leaves in crimson-to-coral.
    this.canopyTree(x, z, scale, {
      kind: 'maple',
      tuftMat: this.matFoliage,
      colors: this.colMaple,
      trunk: { rTop: 0.11, rBot: 0.2, h: 2.0, lean: 0.1 },
      canopy: {
        primaries: 5, tilt: 1.02, tiltVar: 0.18, droop: 0.05, bend: 0.1, branchLen: 1.3,
        secondaries: 2, twigs: true, crownFill: 2, clumpR: 0.36,
        tuftsPerClump: [3, 2, 2], cardsPerClump: [10, 9, 6], cardSize: 0.58,
        tuftFlat: 0.5, lump: 0.3, seed: 23
      },
      sway: 0.02,
      collider: 0.3
    });
  }

  pineTree(x, z, scale = 1) {
    // Niwaki garden pine: a leaning trunk, a few reaching limbs, and flat
    // cloud-pruned needle pads at their ends.
    this.canopyTree(x, z, scale, {
      kind: 'needle',
      tuftMat: this.matNeedle,
      colors: this.colPine,
      trunk: { rTop: 0.09, rBot: 0.17, h: 1.9, lean: 0.2 },
      canopy: {
        primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45,
        secondaries: 2, twigs: false, crownFill: 2, clumpR: 0.55,
        tuftsPerClump: [4, 3, 2], cardsPerClump: [12, 10, 6], cardSize: 0.72,
        tuftFlat: 0.38, pad: true, lump: 0.3, seed: 37
      },
      sway: 0.012,
      collider: 0.3
    });
  }

  buildMaplesAndPines() {
    const maples = [[-16, 14, 1.1], [14, 6, 1.0], [-6, -34, 1.2], [8, -36, 1.0], [28, 6, 1.1]];
    for (const [x, z, s] of maples) this.mapleTree(x, z, s);
    const pines = [[-36, 6, 1.4], [-40, -6, 1.2], [36, 20, 1.3], [40, -8, 1.5], [34, 34, 1.2], [-38, 32, 1.3]];
    for (const [x, z, s] of pines) this.pineTree(x, z, s);
  }

  buildSusukiGrass() {
    const susukiCount = 90;
    const group = new THREE.Group();
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.03, 1.8, 5);
    const plumeGeo = new THREE.ConeGeometry(0.08, 0.55, 5);
    const leafGeo = new THREE.PlaneGeometry(0.08, 1.2);

    const susukiSpots = [
      [-10, 24], [6, 28], [22, 26], [32, 24],
      [-16, 2], [-4, -4], [4, -14], [8, -20], [-12, -22],
      [24, -12], [28, 8], [-26, 4], [-20, 18]
    ];

    for (const [sx, sz] of susukiSpots) {
      const x = sx + (this.random() - 0.5) * 1.5;
      const z = sz + (this.random() - 0.5) * 1.5;
      // Grouped susuki must explicitly respect bridge/path exclusions.
      if (this.isExcluded(x, z)) continue;
      const clump = new THREE.Group();
      const count = 5 + Math.floor(this.random() * 4);
      for (let i = 0; i < count; i++) {
        const stalk = new THREE.Group();
        const h = 1.4 + this.random() * 0.7;
        const stem = new THREE.Mesh(stemGeo, this.matBamboo);
        stem.position.y = h / 2;
        stem.scale.set(1, h / 1.8, 1);
        stalk.add(stem);

        const plume = new THREE.Mesh(plumeGeo, this.matSusuki);
        plume.position.set(0, h + 0.22, 0);
        plume.rotation.z = (this.random() - 0.5) * 0.4;
        stalk.add(plume);

        // Arching leaves
        for (let l = 0; l < 3; l++) {
          const leaf = new THREE.Mesh(leafGeo, this.matBambooLeaf);
          const la = this.random() * Math.PI * 2;
          leaf.position.set(Math.cos(la) * 0.06, 0.4 + l * 0.3, Math.sin(la) * 0.06);
          leaf.rotation.y = la;
          leaf.rotation.x = 0.5 + this.random() * 0.4;
          stalk.add(leaf);
        }

        const a = (i / count) * Math.PI * 2 + this.random() * 0.5;
        const r = this.random() * 0.4;
        stalk.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        stalk.rotation.z = (this.random() - 0.5) * 0.15;
        clump.add(stalk);
      }
      clump.position.set(x, 0, z);
      this.scene.add(clump);
      this.swayables.push({ node: clump, amp: 0.04, freq: 1.1 + this.random() * 0.4, phase: this.random() * 6 });
    }
  }

  buildWildflowers() {
    const count = 760;
    // Flower head: five petal discs around a small centre, on a thin stem
    const petalGeo = new THREE.CircleGeometry(0.028, 6);
    const parts = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const petal = petalGeo.clone();
      petal.rotateX(-Math.PI / 2 + 0.35);
      petal.rotateY(a);
      petal.translate(Math.cos(a) * 0.026, 0.19, Math.sin(a) * 0.026);
      parts.push(petal);
    }
    const centre = new THREE.SphereGeometry(0.014, 6, 5);
    centre.translate(0, 0.195, 0);
    parts.push(centre);
    const stem = new THREE.CylinderGeometry(0.005, 0.007, 0.2, 4);
    stem.translate(0, 0.1, 0);
    parts.push(stem);
    const geo = mergeGeometries(parts, false);
    // Vertex colours: petals take the instance tint, centre gold, stem green
    const petalVerts = petalGeo.attributes.position.count * 5;
    const centreVerts = centre.attributes.position.count;
    const col = new Float32Array(geo.attributes.position.count * 3);
    for (let v = 0; v < geo.attributes.position.count; v++) {
      let c;
      if (v < petalVerts) c = [1, 1, 1];
      else if (v < petalVerts + centreVerts) c = [1.0, 0.82, 0.3];
      else c = [0.35, 0.55, 0.25];
      col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, vertexColors: true, side: THREE.DoubleSide, emissive: 0x222222, emissiveIntensity: 0.25 });
    const flowers = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // Traditional Japanese wildflower palette: nadeshiko pink, kikyo indigo,
    // yamabuki gold, shirotsume white
    const palette = [0xf288a8, 0xf7a8c4, 0x6478cc, 0x7894e6, 0xf5ba38, 0xffde59, 0xfffaee, 0xe8f0d8];

    let placed = 0;
    for (let i = 0; i < count * 3 && placed < count; i++) {
      const a = this.random() * Math.PI * 2;
      const r = 3 + Math.sqrt(this.random()) * 42;
      // Flowers grow in loose drifts rather than an even scatter
      const x = Math.cos(a) * r + (this.random() - 0.5) * 2;
      const z = Math.sin(a) * r + (this.random() - 0.5) * 2;
      if (this.isExcluded(x, z)) continue;
      const drift = Math.sin(x * 0.21) * Math.cos(z * 0.17);
      if (drift < 0.1 && this.random() < 0.7) continue;

      const s = 0.7 + this.random() * 0.8;
      dummy.position.set(x, 0.02, z);
      dummy.scale.set(s, s * (0.8 + this.random() * 0.5), s);
      dummy.rotation.set((this.random() - 0.5) * 0.25, this.random() * Math.PI * 2, (this.random() - 0.5) * 0.25);
      dummy.updateMatrix();
      flowers.setMatrixAt(placed, dummy.matrix);
      color.setHex(palette[Math.floor(this.random() * palette.length)]);
      flowers.setColorAt(placed, color);
      placed++;
    }
    flowers.count = placed;
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    flowers.castShadow = false;
    flowers.receiveShadow = true;
    this.scene.add(flowers);
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
   * A tapered, gently arched blade fan from root to a single tip vertex.
   * Defaults match the meadow grass blade; `taperPow` below ~0.6 keeps the
   * blade broad near the tip instead of needle-sharp, which is what turns
   * this same builder into a clover-like paddle for buildGroundCover().
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
   * Grass blades now run through MeshLambertMaterial so they receive the
   * sun's shadow map, react to the hemisphere/point lights and fog like
   * everything else — under trees and eaves the meadow finally darkens.
   * Wind, arching and the cat's footprint push are injected into the vertex
   * stage; a root→tip gradient and sun translucency into the fragment stage.
   */
  grassMaterial() {
    const uniforms = {
      uTime: { value: 0 },
      uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(0xffe6b8) },
      uRootColor: { value: new THREE.Color(0x36622a) },
      uMidColor: { value: new THREE.Color(0x669a3e) },
      uTipColor: { value: new THREE.Color(0xa6c65c) },
      uWind: { value: 0.0 }
    };
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    mat.uniforms = uniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uPlayerPos;
        uniform float uWind;
        attribute float aPhase;
        attribute vec3 aTint;
        attribute float aWidthScale;
        attribute float aCurveAngle;
        varying float vT;
        varying vec3 vTint;
      ` + shader.vertexShader
        .replace('#include <beginnormal_vertex>', /* glsl */`
          #include <beginnormal_vertex>
          // Blades shade like a soft carpet rather than as knife-edged cards
          objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.8));
        `)
        .replace('#include <begin_vertex>', /* glsl */`
          vT = uv.y;
          vTint = aTint;
          vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

          // Multi-frequency wind gust waves with per-blade speed variation
          float speedVar = 0.75 + fract(aPhase * 3.17) * 0.5;
          float gustTime = uTime * 0.25 * speedVar;
          float gust = sin(gustTime * 1.3 + base.x * 0.18 + base.z * 0.14 + aPhase);
          float gust2 = sin(gustTime * 0.6 + base.x * 0.06 - base.z * 0.08 + aPhase * 0.5);
          float flutter = sin(gustTime * 2.6 + aPhase * 6.0) * 0.12;
          float windMul = 1.0 + uWind * 1.5;
          float sway = (gust * 0.6 + gust2 * 0.35 + flutter) * 0.20 * windMul;

          float w = vT * vT;
          vec3 pos = position;
          pos.x *= aWidthScale;
          pos.x += sin(aCurveAngle) * 0.18 * w;
          pos.z += cos(aCurveAngle) * 0.18 * w;
          pos.x += sway * w;
          pos.z += sway * 0.5 * w;
          pos.y *= 1.0 - abs(sway) * 0.16 * w;

          // Interactive player push
          vec2 away = base.xz - uPlayerPos.xz;
          float dist = length(away);
          float push = smoothstep(0.95, 0.05, dist);
          if (push > 0.001) {
            vec2 dir = dist > 0.001 ? away / dist : vec2(0.0, 1.0);
            float bendAmt = push * 0.65 * w;
            pos.x += dir.x * bendAmt;
            pos.z += dir.y * bendAmt;
            pos.y *= 1.0 - push * 0.62 * vT;
          }
          vec3 transformed = pos;
        `);
      shader.fragmentShader = `
        uniform vec3 uRootColor;
        uniform vec3 uMidColor;
        uniform vec3 uTipColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying float vT;
        varying vec3 vTint;
      ` + shader.fragmentShader
        .replace('#include <normal_fragment_begin>', /* glsl */`
          #include <normal_fragment_begin>
          // Both faces of a blade shade as if facing the sky; the double-sided
          // flip would otherwise turn every back face black.
          normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), 0.85));
        `)
        .replace('#include <color_fragment>', /* glsl */`
          #include <color_fragment>
          vec3 gcol = (vT < 0.5) ? mix(uRootColor, uMidColor, vT * 2.0) : mix(uMidColor, uTipColor, (vT - 0.5) * 2.0);
          diffuseColor.rgb *= gcol * vTint;
        `)
        .replace('#include <emissivemap_fragment>', /* glsl */`
          #include <emissivemap_fragment>
          // Translucent tips catch the low sun
          vec3 gSunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
          float gThru = pow(max(dot(normalize(-vViewPosition), gSunV), 0.0), 3.0);
          totalEmissiveRadiance += gcol * vTint * uSunColor * (gThru * 0.5 + 0.06) * vT * vT;
        `);
    };
    mat.customProgramCacheKey = () => 'meadow-grass';
    return mat;
  }

  /**
   * Lightweight wind-swayed material for small ground-cover blooms: unlike
   * the meadow grass shader it skips the fixed green root→tip gradient so
   * each instance's tint (a real petal colour) reads clearly, fading up
   * from a shaded green base at the root to full bloom colour at the tip.
   */
  groundBloomMaterial() {
    const uniforms = {
      uTime: { value: 0 },
      uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(0xffe6b8) },
      uWind: { value: 0.0 }
    };
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    mat.uniforms = uniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uPlayerPos;
        uniform float uWind;
        attribute float aPhase;
        attribute vec3 aTint;
        attribute float aWidthScale;
        attribute float aCurveAngle;
        varying float vT;
        varying vec3 vTint;
      ` + shader.vertexShader
        .replace('#include <beginnormal_vertex>', /* glsl */`
          #include <beginnormal_vertex>
          objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.8));
        `)
        .replace('#include <begin_vertex>', /* glsl */`
          vT = uv.y;
          vTint = aTint;
          vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float speedVar = 0.75 + fract(aPhase * 3.17) * 0.5;
          float gustTime = uTime * 0.22 * speedVar;
          float gust = sin(gustTime * 1.3 + base.x * 0.18 + base.z * 0.14 + aPhase);
          float windMul = 1.0 + uWind * 1.4;
          float sway = gust * 0.16 * windMul;

          float w = uv.y * uv.y;
          vec3 pos = position;
          pos.x *= aWidthScale;
          pos.x += sin(aCurveAngle) * 0.1 * w + sway * w;
          pos.z += cos(aCurveAngle) * 0.1 * w + sway * 0.5 * w;

          vec2 away = base.xz - uPlayerPos.xz;
          float dist = length(away);
          float push = smoothstep(0.85, 0.05, dist);
          if (push > 0.001) {
            vec2 dir = dist > 0.001 ? away / dist : vec2(0.0, 1.0);
            pos.x += dir.x * push * 0.5 * w;
            pos.z += dir.y * push * 0.5 * w;
            pos.y *= 1.0 - push * 0.55 * vT;
          }
          vec3 transformed = pos;
        `);
      shader.fragmentShader = `
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying float vT;
        varying vec3 vTint;
      ` + shader.fragmentShader
        .replace('#include <normal_fragment_begin>', /* glsl */`
          #include <normal_fragment_begin>
          normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), 0.85));
        `)
        .replace('#include <color_fragment>', /* glsl */`
          #include <color_fragment>
          vec3 groundBase = vec3(0.3, 0.4, 0.22);
          vec3 gcol = mix(groundBase, vTint, vT * vT);
          diffuseColor.rgb *= gcol;
        `)
        .replace('#include <emissivemap_fragment>', /* glsl */`
          #include <emissivemap_fragment>
          vec3 gSunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
          float gThru = pow(max(dot(normalize(-vViewPosition), gSunV), 0.0), 3.0);
          totalEmissiveRadiance += vTint * uSunColor * (gThru * 0.4 + 0.05) * vT * vT;
        `);
    };
    mat.customProgramCacheKey = () => 'ground-bloom';
    return mat;
  }

  buildGrass() {
    const bladeGeo = this.bladeGeometry();
    this.grassMat = this.grassMaterial();
    const extent = 44;
    const chunksPerSide = 4;
    const chunkSize = (extent * 2) / chunksPerSide;
    const perChunk = 4600;
    const dummy = new THREE.Object3D();

    for (let cx = 0; cx < chunksPerSide; cx++) {
      for (let cz = 0; cz < chunksPerSide; cz++) {
        const ox = -extent + cx * chunkSize;
        const oz = -extent + cz * chunkSize;
        const geo = bladeGeo.clone();
        const phases = new Float32Array(perChunk);
        const tints = new Float32Array(perChunk * 3);
        const widthScales = new Float32Array(perChunk);
        const curveAngles = new Float32Array(perChunk);
        const mesh = new THREE.InstancedMesh(geo, this.grassMat, perChunk);
        let placed = 0;
        let guard = 0;

        while (placed < perChunk && guard < perChunk * 7) {
          guard++;
          const x = ox + this.random() * chunkSize;
          const z = oz + this.random() * chunkSize;
          if (Math.sqrt(x * x + z * z) > extent + 4) continue;
          if (this.isExcluded(x, z)) continue;

          // Multi-octave patchy meadow density noise
          const patchNoise = Math.sin(x * 0.14) * Math.cos(z * 0.16)
            + 0.55 * Math.sin(x * 0.31 + z * 0.25)
            + 0.3 * Math.cos((x - z) * 0.22);

          // Patchy density skipping: sparse in clearings, lush in clumps
          if (patchNoise < -0.35 && this.random() < 0.65) continue;
          if (patchNoise < 0.0 && this.random() < 0.25) continue;

          const isThickClump = patchNoise > 0.35;
          const isSparseClearing = patchNoise < -0.2;

          // Height scaling
          let s = 0.22 + this.random() * 0.22;
          if (isThickClump) s *= 1.5 + this.random() * 0.8;
          if (isSparseClearing) s *= 0.75 + this.random() * 0.3;

          // 90% thin, delicate, pointed grass blades with rich Ghibli color variety
          const widthChoice = this.random();
          let wScale = 0.38 + this.random() * 0.28; // 90% thin pointed blades
          if (widthChoice > 0.90) {
            wScale = 0.85 + this.random() * 0.35; // 10% medium accent blades
          }

          dummy.position.set(x, 0, z);
          dummy.scale.set(1.0, s, 1.0);
          dummy.rotation.set(0, this.random() * Math.PI * 2, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(placed, dummy.matrix);

          phases[placed] = this.random() * Math.PI * 2;
          widthScales[placed] = wScale;
          curveAngles[placed] = this.random() * Math.PI * 2;

          // Natural painterly tint variations — muted mossy greens with
          // occasional soft olive warmth; dark shaded patches in clumps
          const colorFlavor = this.random();
          let rMul = 0.9, gMul = 1.0, bMul = 0.85;
          if (colorFlavor < 0.30) {
            // Deep forest moss (dark grass pools)
            rMul = 0.62 + this.random() * 0.10;
            gMul = 0.82 + this.random() * 0.10;
            bMul = 0.72 + this.random() * 0.10;
          } else if (colorFlavor < 0.60) {
            // Natural meadow green
            rMul = 0.82 + this.random() * 0.10;
            gMul = 0.98 + this.random() * 0.08;
            bMul = 0.78 + this.random() * 0.10;
          } else if (colorFlavor < 0.82) {
            // Kyoto tea green
            rMul = 0.90 + this.random() * 0.08;
            gMul = 0.95 + this.random() * 0.08;
            bMul = 0.80 + this.random() * 0.10;
          } else {
            // Soft sun-warmed olive (subtle, not neon gold)
            rMul = 1.02 + this.random() * 0.08;
            gMul = 0.98 + this.random() * 0.06;
            bMul = 0.62 + this.random() * 0.08;
          }

          // Thick clumps sit in shade — darker; clearings slightly lighter
          let brightness = 0.72 + this.random() * 0.26;
          if (isThickClump) brightness *= 0.82;
          tints[placed * 3] = brightness * rMul;
          tints[placed * 3 + 1] = brightness * gMul;
          tints[placed * 3 + 2] = brightness * bMul;
          placed++;
        }

        mesh.count = placed;
        geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases.subarray(0, placed), 1));
        geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints.subarray(0, placed * 3), 3));
        geo.setAttribute('aWidthScale', new THREE.InstancedBufferAttribute(widthScales.subarray(0, placed), 1));
        geo.setAttribute('aCurveAngle', new THREE.InstancedBufferAttribute(curveAngles.subarray(0, placed), 1));

        const center = new THREE.Vector3(ox + chunkSize / 2, 0.5, oz + chunkSize / 2);
        geo.boundingSphere = new THREE.Sphere(center, chunkSize * 0.75 + 1);
        mesh.instanceMatrix.needsUpdate = true;
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        this.scene.add(mesh);
      }
    }
  }

  /**
   * Ground-cover variety mixed sparsely through the meadow: broad rounded
   * clover paddles (reusing the meadow-grass shader, just wider/shorter/
   * duller-tipped than a grass blade) and tiny bright ground blooms, so the
   * turf reads as more than one repeated blade shape up close.
   */
  buildGroundCover() {
    this.groundBloomMat = this.groundBloomMaterial();
    const extent = 44;
    const dummy = new THREE.Object3D();
    const bloomPalette = [
      [1.0, 0.66, 0.74], [1.0, 0.84, 0.42], [0.98, 0.95, 0.86], [0.8, 0.66, 0.94], [1.0, 0.5, 0.42]
    ];

    const specs = [
      { geo: this.bladeGeometry(3, 0.15, 0.24, 0.12, 0.4), mat: this.grassMat, count: 1300, sMin: 0.75, sMax: 1.2, flavor: 'clover' },
      { geo: this.bladeGeometry(3, 0.08, 0.19, 0.08, 0.55), mat: this.groundBloomMat, count: 850, sMin: 0.8, sMax: 1.25, flavor: 'bloom' }
    ];

    for (const spec of specs) {
      const mesh = new THREE.InstancedMesh(spec.geo, spec.mat, spec.count);
      const phases = new Float32Array(spec.count);
      const tints = new Float32Array(spec.count * 3);
      const widthScales = new Float32Array(spec.count);
      const curveAngles = new Float32Array(spec.count);
      let placed = 0;
      let guard = 0;

      while (placed < spec.count && guard < spec.count * 8) {
        guard++;
        const a = this.random() * Math.PI * 2;
        const r = Math.sqrt(this.random()) * extent;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (this.isExcluded(x, z)) continue;

        // Follow the same clumping pattern as the meadow grass so ground
        // cover naturally gathers in the same lush patches
        const patchNoise = Math.sin(x * 0.14) * Math.cos(z * 0.16) + 0.55 * Math.sin(x * 0.31 + z * 0.25);
        if (patchNoise < 0.05 && this.random() < 0.7) continue;

        const s = spec.sMin + this.random() * (spec.sMax - spec.sMin);
        dummy.position.set(x, 0, z);
        dummy.scale.set(1.0, s, 1.0);
        dummy.rotation.set(0, this.random() * Math.PI * 2, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(placed, dummy.matrix);

        phases[placed] = this.random() * Math.PI * 2;
        widthScales[placed] = 0.85 + this.random() * 0.3;
        curveAngles[placed] = this.random() * Math.PI * 2;

        if (spec.flavor === 'clover') {
          const inBloom = this.random() < 0.14;
          tints[placed * 3] = inBloom ? 1.0 : 0.56 + this.random() * 0.12;
          tints[placed * 3 + 1] = inBloom ? 1.0 : 0.8 + this.random() * 0.12;
          tints[placed * 3 + 2] = inBloom ? 0.9 : 0.5 + this.random() * 0.12;
        } else {
          const c = bloomPalette[Math.floor(this.random() * bloomPalette.length)];
          const b = 0.85 + this.random() * 0.3;
          tints[placed * 3] = c[0] * b;
          tints[placed * 3 + 1] = c[1] * b;
          tints[placed * 3 + 2] = c[2] * b;
        }
        placed++;
      }

      mesh.count = placed;
      spec.geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases.subarray(0, placed), 1));
      spec.geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints.subarray(0, placed * 3), 3));
      spec.geo.setAttribute('aWidthScale', new THREE.InstancedBufferAttribute(widthScales.subarray(0, placed), 1));
      spec.geo.setAttribute('aCurveAngle', new THREE.InstancedBufferAttribute(curveAngles.subarray(0, placed), 1));
      const center = new THREE.Vector3(0, 0.3, 0);
      spec.geo.boundingSphere = new THREE.Sphere(center, extent * 1.05 + 2);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      this.scene.add(mesh);
    }
  }

  update(dt, playerPos, sky = null) {
    this.time += dt;
    updateFoliage(this.time, sky, playerPos);
    if (this.grassMat) {
      this.grassMat.uniforms.uTime.value = this.time;
      if (playerPos) this.grassMat.uniforms.uPlayerPos.value.copy(playerPos);
      let wind = 0.0;
      if (sky && (sky.weather === 'snow' || sky.weather === 'cloudy' || sky.weather === 'mist')) {
        wind = 0.4 + 0.4 * Math.max(0, sky.weatherBlend * 2 - 0.2);
      }
      this.grassMat.uniforms.uWind.value += (wind - this.grassMat.uniforms.uWind.value) * dt * 0.8;

      if (sky) {
        const p = sky.resolvePalette();
        const sunUp = Math.max(0, sky.sunDir.y);
        this.grassMat.uniforms.uSunDir.value.copy(sky.sunDir);
        this.grassMat.uniforms.uSunColor.value.copy(p.sun).multiplyScalar(Math.pow(sunUp, 0.5));

        if (this.groundBloomMat) {
          this.groundBloomMat.uniforms.uTime.value = this.time;
          this.groundBloomMat.uniforms.uWind.value = this.grassMat.uniforms.uWind.value;
          this.groundBloomMat.uniforms.uSunDir.value.copy(sky.sunDir);
          this.groundBloomMat.uniforms.uSunColor.value.copy(p.sun).multiplyScalar(Math.pow(sunUp, 0.5));
          if (playerPos) this.groundBloomMat.uniforms.uPlayerPos.value.copy(playerPos);
        }
      }
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
    for (const bamboo of this.bambooSwayables) {
      for (let i = 0; i < bamboo.plantData.length; i++) {
        this.setBambooStalkMatrices(bamboo.lowerStalks, bamboo.upperStalks, i, bamboo.plantData[i], this.time);
      }
      for (let i = 0; i < bamboo.leafCount; i++) {
        this.setBambooLeafMatrix(bamboo.leaves, i, bamboo.leafData[i], this.time);
      }
      bamboo.lowerStalks.instanceMatrix.needsUpdate = true;
      bamboo.upperStalks.instanceMatrix.needsUpdate = true;
      bamboo.leaves.instanceMatrix.needsUpdate = true;
    }
  }
}
