import * as THREE from 'three';

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

    this.matTrunk = new THREE.MeshStandardMaterial({ color: 0x4f3a2c, roughness: 0.95 });
    this.matSakura = new THREE.MeshStandardMaterial({ color: 0xefa5b8, roughness: 0.9, flatShading: true });
    this.matSakuraDeep = new THREE.MeshStandardMaterial({ color: 0xd97e99, roughness: 0.9, flatShading: true });
    this.matLeafGreen = new THREE.MeshStandardMaterial({ color: 0x4c7433, roughness: 0.95, flatShading: true });
    this.matLeafDeep = new THREE.MeshStandardMaterial({ color: 0x38581f, roughness: 0.95, flatShading: true });
    this.matLeafLight = new THREE.MeshStandardMaterial({ color: 0x678a3c, roughness: 0.95, flatShading: true });
    this.matBamboo = new THREE.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.75 });
    this.matBambooLeaf = new THREE.MeshStandardMaterial({ color: 0x74a04a, roughness: 0.9, side: THREE.DoubleSide });
    this.matMaple = new THREE.MeshStandardMaterial({ color: 0xc24a34, roughness: 0.95, flatShading: true });
    this.matMapleDeep = new THREE.MeshStandardMaterial({ color: 0x9c3626, roughness: 0.95, flatShading: true });
    this.matPine = new THREE.MeshStandardMaterial({ color: 0x33582f, roughness: 0.95, flatShading: true });
    this.matSusuki = new THREE.MeshStandardMaterial({ color: 0xd9cca8, roughness: 0.9, side: THREE.DoubleSide });
    // Small leaf tuft geometry — low-poly icosahedron reads as a painterly
    // clump of leaves rather than a smooth round blob
    this.leafTuftGeo = new THREE.IcosahedronGeometry(1, 0);

    this.sakuraSpots = [
      [-6, 8, 1.2], [7, 12, 1.0], [-12, -2, 1.3], [10, -4, 0.9],
      [-8, 32, 1.1], [16, 32, 1.2], [-18, 32, 1.0], [6, -18, 1.1],
      [-9, -26, 1.2], [9, -28, 1.0], [-22, -24, 1.1], [24, 14, 1.0],
      [-36, 24, 1.15], [20, -30, 1.2]
    ];
    for (const [x, z, s] of this.sakuraSpots) this.sakuraTree(x, z, s);
    this.buildPetalDrifts();
    this.buildBambooGrove(30, -20, 7);
    this.buildBambooGrove(-32, -14, 5);
    this.buildMaplesAndPines();
    this.buildSusukiGrass();
    this.buildGrass();
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
   * Painterly foliage mass: a cluster of irregular low-poly leaf tufts
   * layered dark→light (shadow core, mid body, sunlit crown highlights)
   * so the canopy reads like brushed Ghibli foliage instead of blobs.
   */
  leafCluster(mats, count, spread, baseY, scale) {
    const cluster = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const layer = i / count; // 0 = inner/shadow, 1 = outer/sunlit
      const mat = mats[Math.min(mats.length - 1, Math.floor(layer * mats.length))];
      const r = (0.42 + this.random() * 0.4) * scale * (1.0 - layer * 0.35);
      const tuft = new THREE.Mesh(this.leafTuftGeo, mat);
      const a = this.random() * Math.PI * 2;
      const rad = (this.random() * spread) * scale;
      tuft.position.set(
        Math.cos(a) * rad,
        baseY * scale + layer * 0.55 * scale + (this.random() - 0.5) * 0.4 * scale,
        Math.sin(a) * rad
      );
      tuft.scale.set(r * (0.9 + this.random() * 0.5), r * (0.6 + this.random() * 0.3), r * (0.9 + this.random() * 0.5));
      tuft.rotation.set(this.random() * Math.PI, this.random() * Math.PI, this.random() * Math.PI);
      tuft.castShadow = true;
      cluster.add(tuft);
    }
    return cluster;
  }

  sakuraTree(x, z, scale = 1) {
    const tree = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.14 * scale, 0.24 * scale, 2.4 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.y = 1.2 * scale;
    trunk.rotation.z = (this.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    tree.add(trunk);

    const branchGeo = new THREE.CylinderGeometry(0.05 * scale, 0.1 * scale, 1.2 * scale, 5);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(branchGeo, this.matTrunk);
      const a = this.random() * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.5 * scale, (2.2 + this.random() * 0.5) * scale, Math.sin(a) * 0.5 * scale);
      b.rotation.z = Math.cos(a) * 0.9;
      b.rotation.x = -Math.sin(a) * 0.9;
      b.castShadow = true;
      tree.add(b);
      // Every branch carries its own leaf tuft — no bare stubs
      const tip = this.leafCluster([this.matSakuraDeep, this.matSakura], 3, 0.3, 0, scale * 0.55);
      tip.position.copy(b.position);
      tip.position.y += 0.55 * scale;
      tip.position.x += Math.cos(a) * 0.45 * scale;
      tip.position.z += Math.sin(a) * 0.45 * scale;
      tree.add(tip);
    }

    // Layered blossom canopy: deep pink shadow core → light sunlit crown
    const canopy = this.leafCluster(
      [this.matSakuraDeep, this.matSakura, this.matSakura],
      14 + Math.floor(this.random() * 5), 1.15, 3.0, scale
    );
    tree.add(canopy);
    this.swayables.push({ node: canopy, amp: 0.02, freq: 0.8 + this.random() * 0.4, phase: this.random() * 6 });

    tree.position.set(x, 0, z);
    tree.rotation.y = this.random() * Math.PI * 2;
    this.scene.add(tree);
    this.addCollider(x, z, 0.35 * scale);
  }

  buildSakuraGrove() {}

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
    const stalkGeo = new THREE.CylinderGeometry(0.06, 0.075, 7, 6);
    const stalks = new THREE.InstancedMesh(stalkGeo, this.matBamboo, count);
    stalks.castShadow = true;
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

      this.setBambooStalkMatrix(stalks, i, plant, 0);

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
    stalks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    this.scene.add(stalks);
    this.scene.add(leaves);
    this.bambooSwayables.push({ stalks, leaves, plantData, leafData, leafCount: leafIndex });
    this.addCollider(cx, cz, radius * 0.7);
  }

  setBambooStalkMatrix(mesh, index, plant, time) {
    const sway = Math.sin(time * 0.75 + plant.phase) * 0.085;
    const dummy = new THREE.Object3D();
    dummy.position.set(plant.x, plant.height / 2, plant.z);
    dummy.rotation.set(sway * 0.55, plant.yaw, sway);
    dummy.scale.set(1, plant.height / 7, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  setBambooLeafMatrix(mesh, index, leaf, time) {
    const { plant } = leaf;
    const sway = Math.sin(time * 0.75 + plant.phase) * 0.085;
    const swayY = Math.cos(time * 0.62 + leaf.phase) * 0.06;
    const h = plant.height * leaf.heightRatio;
    const leanX = sway * h * 0.33;
    const leanZ = swayY * h * 0.22;
    const dummy = new THREE.Object3D();
    dummy.position.set(
      plant.x + leanX + Math.cos(leaf.angle) * leaf.branchLength,
      h,
      plant.z + leanZ + Math.sin(leaf.angle) * leaf.branchLength
    );
    dummy.rotation.set(0.72 + swayY, leaf.angle + Math.PI / 2, -0.95 + sway + leaf.roll);
    dummy.scale.set(leaf.width, leaf.length, leaf.width);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  mapleTree(x, z, scale = 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 2 * scale, 7), this.matTrunk);
    trunk.position.y = scale;
    trunk.castShadow = true;
    tree.add(trunk);
    // Layered crimson canopy: deep shadow core → bright sunlit crown
    const canopy = this.leafCluster(
      [this.matMapleDeep, this.matMaple, this.matMaple],
      11 + Math.floor(this.random() * 4), 0.85, 2.2, scale
    );
    tree.add(canopy);
    this.swayables.push({ node: canopy, amp: 0.02, freq: 0.7 + this.random() * 0.5, phase: this.random() * 6 });
    tree.position.set(x, 0, z);
    this.scene.add(tree);
    this.addCollider(x, z, 0.3 * scale);
  }

  pineTree(x, z, scale = 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.16 * scale, 1.6 * scale, 6), this.matTrunk);
    trunk.position.y = 0.8 * scale;
    trunk.castShadow = true;
    tree.add(trunk);
    // Japanese garden pine: irregular layered needle pads instead of
    // stacked smooth cones
    for (let i = 0; i < 3; i++) {
      const padY = (1.7 + i * 0.7) * scale;
      const padR = (1.05 - i * 0.26) * scale;
      const pads = 4 + Math.floor(this.random() * 3);
      for (let j = 0; j < pads; j++) {
        const a = (j / pads) * Math.PI * 2 + this.random();
        const tuft = new THREE.Mesh(this.leafTuftGeo, this.random() > 0.4 ? this.matPine : this.matLeafDeep);
        const rad = this.random() * padR * 0.7;
        tuft.position.set(Math.cos(a) * rad, padY + (this.random() - 0.5) * 0.25 * scale, Math.sin(a) * rad);
        const s = (0.4 + this.random() * 0.3) * scale * (1.1 - i * 0.2);
        tuft.scale.set(s * 1.5, s * 0.55, s * 1.5);
        tuft.rotation.y = this.random() * Math.PI;
        tuft.castShadow = true;
        tree.add(tuft);
      }
    }
    tree.position.set(x, 0, z);
    this.scene.add(tree);
    this.addCollider(x, z, 0.3 * scale);
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
    const count = 580;
    const geo = new THREE.SphereGeometry(0.05, 6, 5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, emissive: 0x111111, emissiveIntensity: 0.2 });
    const flowers = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // Studio Ghibli Traditional Japanese Wildflower Palette:
    // Nadeshiko Pink (0xf288a8), Kikyo Indigo (0x6478cc), Yamabuki Gold (0xf5ba38), Shirotsume White (0xfffaee)
    const palette = [0xf288a8, 0xf7a8c4, 0x6478cc, 0x7894e6, 0xf5ba38, 0xffde59, 0xfffaee, 0xe8f0d8];

    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2;
      const r = 3 + Math.sqrt(this.random()) * 42;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (this.isExcluded(x, z)) continue;

      const s = 0.65 + this.random() * 0.9;
      dummy.position.set(x, 0.14 + this.random() * 0.16, z);
      dummy.scale.set(s, s * 0.75, s);
      dummy.rotation.set((this.random() - 0.5) * 0.2, this.random() * Math.PI, (this.random() - 0.5) * 0.2);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);

      color.setHex(palette[Math.floor(this.random() * palette.length)]);
      flowers.setColorAt(i, color);
    }
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
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

  bladeGeometry() {
    const rows = 4;
    const baseWidth = 0.048;
    const height = 0.95;
    const positions = [];
    const uvs = [];
    const indices = [];

    // Tapering to a sharp pointed tip at the top end (90%+ thin & pointed)
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      // Exponential taper towards needle-sharp apex
      const w = baseWidth * Math.pow(1.0 - t, 1.35);
      const curve = t * t * 0.32;
      positions.push(
        -w / 2, t * height, curve * 0.35,
        0, t * height, curve,
        w / 2, t * height, curve * 0.35
      );
      uvs.push(0, t, 0.5, t, 1, t);
    }

    // Top apex: single sharp pointed vertex
    const topCurve = 0.35;
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

  grassMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xffe6b8) },
        uHemiSky: { value: new THREE.Color(0x8fa5c9) },
        uHemiGround: { value: new THREE.Color(0x9a7a55) },
        uExposure: { value: 1.0 },
        uRootColor: { value: new THREE.Color(0x1a2e18) },   // Deep shaded moss
        uMidColor: { value: new THREE.Color(0x41682c) },    // Natural muted green
        uTipColor: { value: new THREE.Color(0x74923f) },    // Soft olive-lit tip
        uWind: { value: 0.0 }
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uPlayerPos;
        uniform float uWind;
        attribute float aPhase;
        attribute vec3 aTint;
        attribute float aWidthScale;
        attribute float aCurveAngle;
        varying float vT;
        varying vec3 vTint;
        varying float vLight;

        void main() {
          vT = uv.y;
          vTint = aTint;

          vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

          // Multi-frequency wind gust waves (slowed to 0.25x with per-blade speed variation)
          float speedVar = 0.75 + fract(aPhase * 3.17) * 0.5; // Natural variation 0.75x to 1.25x
          float gustTime = uTime * 0.25 * speedVar;
          float gust = sin(gustTime * 1.3 + base.x * 0.18 + base.z * 0.14 + aPhase);
          float gust2 = sin(gustTime * 0.6 + base.x * 0.06 - base.z * 0.08 + aPhase * 0.5);
          float flutter = sin(gustTime * 2.6 + aPhase * 6.0) * 0.12;
          float windMul = 1.0 + uWind * 1.5;
          float sway = (gust * 0.6 + gust2 * 0.35 + flutter) * 0.20 * windMul;

          float w = vT * vT;
          vec3 pos = position;

          // Apply instance width variety (fine whisper, meadow, broad leaf)
          pos.x *= aWidthScale;

          // Arching curve
          pos.x += sin(aCurveAngle) * 0.18 * w;
          pos.z += cos(aCurveAngle) * 0.18 * w;

          // Wind sway
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

          // Translucent top sunlit sheen
          vLight = (0.55 + 0.45 * vT) * (1.0 - push * 0.25);

          vec4 mv = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uRootColor;
        uniform vec3 uMidColor;
        uniform vec3 uTipColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uHemiSky;
        uniform vec3 uHemiGround;
        uniform float uExposure;
        varying float vT;
        varying vec3 vTint;
        varying float vLight;

        void main() {
          vec3 baseColor = (vT < 0.5) 
            ? mix(uRootColor, uMidColor, vT * 2.0)
            : mix(uMidColor, uTipColor, (vT - 0.5) * 2.0);

          // Dynamic ambient and sun illumination from sky & time of day
          vec3 ambient = mix(uHemiGround, uHemiSky, 0.35 + 0.65 * vT);
          float sunDot = max(0.0, dot(vec3(0.0, 1.0, 0.0), uSunDir));
          float sunLight = sunDot * vLight;
          vec3 totalLight = (ambient * 0.85 + uSunColor * sunLight * 1.1) * uExposure;

          vec3 col = baseColor * vTint * totalLight;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
  }

  buildGrass() {
    const bladeGeo = this.bladeGeometry();
    this.grassMat = this.grassMaterial();
    const extent = 44;
    const chunksPerSide = 4;
    const chunkSize = (extent * 2) / chunksPerSide;
    const perChunk = 3200;
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
        mesh.receiveShadow = false;
        mesh.castShadow = false;
        this.scene.add(mesh);
      }
    }
  }

  update(dt, playerPos, sky = null) {
    this.time += dt;
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
        this.grassMat.uniforms.uSunDir.value.copy(sky.sunDir);
        this.grassMat.uniforms.uSunColor.value.copy(p.sun);
        this.grassMat.uniforms.uHemiSky.value.copy(p.hemiSky);
        this.grassMat.uniforms.uHemiGround.value.copy(p.hemiGround);

        const sunY = sky.sunDir.y;
        const sunUp = Math.max(0, sunY);
        const moonUp = Math.max(0, -sunY * 0.6);
        const exposure = 0.42 + sunUp * 0.72 + moonUp * 0.32;
        this.grassMat.uniforms.uExposure.value = exposure;
      }
    }
    for (const s of this.swayables) {
      s.node.rotation.z = Math.sin(this.time * s.freq * 0.25 + s.phase) * s.amp;
      s.node.rotation.x = Math.cos(this.time * s.freq * 0.20 + s.phase) * s.amp * 0.7;
    }
    for (const bamboo of this.bambooSwayables) {
      for (let i = 0; i < bamboo.plantData.length; i++) {
        this.setBambooStalkMatrix(bamboo.stalks, i, bamboo.plantData[i], this.time);
      }
      for (let i = 0; i < bamboo.leafCount; i++) {
        this.setBambooLeafMatrix(bamboo.leaves, i, bamboo.leafData[i], this.time);
      }
      bamboo.stalks.instanceMatrix.needsUpdate = true;
      bamboo.leaves.instanceMatrix.needsUpdate = true;
    }
  }
}
