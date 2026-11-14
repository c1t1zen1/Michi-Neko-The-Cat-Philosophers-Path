// Summit planting (天上), split out of src/mountaintop.js: the rim trees,
// back brush, boulders and brow stones, the clearing's grass (src/grass.js,
// hashed on the GPU, so it draws nothing from this.rng), and the slope forest,
// whose planting inside the perch's view window is capped by
// perchSightlineAt().
// SummitManager (src/mountaintop.js) delegates to these methods with
// `this` = the manager, so the code reads exactly as it did in the class.

import * as THREE from 'three';
import { worldNoise } from '../textures.js?v=20261107a';
import {
  createFoliageMaterial, buildCanopy, lumpyTuftGeometry, lumpyConeGeometry, bushGeometry,
  leafMassTexture
} from '../foliage.js?v=20261107a';
import { GrassSystem, BiomeMask } from '../grass.js?v=20261107a';
import {
  mulberry32, MEADOW_Y, CORRIDOR_W, CORRIDOR_Z0, LOWER_PATH_Z1, summitFootprint
} from './common.js?v=20261107a';

export const plantingMethods = {
  // Each build*() is the §3.4 split: a layout step (every this.rng() draw, in
  // the classic order, and the footprint), then placeAsset() with the classic
  // mesh step, mesh*Classic(layout), which builds exactly what it always did.

  _tree(x, z, scale, kind, opts) {
    const tree = new THREE.Group();
    tree.name = `Summit ${kind} Tree`;
    tree.position.set(x, MEADOW_Y, z);
    tree.rotation.y = this.rng() * Math.PI * 2;
    // Wind-flagged: mountain trees lean away from the prevailing gusts.
    tree.rotation.z = -0.06 - this.rng() * 0.08;

    const t = opts.trunk;
    const trunkGeo = new THREE.CylinderGeometry(t.rTop * scale, t.rBot * scale, t.h * scale, 9, 4);
    const tp = trunkGeo.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i) + t.h * scale / 2;
      const tt = y / (t.h * scale);
      const flare = 1 + Math.pow(Math.max(0, 1 - tt * 4), 2) * 0.55;
      tp.setX(i, tp.getX(i) * flare);
      tp.setZ(i, tp.getZ(i) * flare);
    }
    trunkGeo.computeVertexNormals();
    const trunk = new THREE.Mesh(trunkGeo, this.MAT.bark);
    trunk.position.y = t.h * scale / 2;
    trunk.rotation.z = t.lean || 0;
    trunk.castShadow = trunk.receiveShadow = true;
    tree.add(trunk);

    const built = buildCanopy(this.rng, Object.assign({ scale, colors: opts.colors, trunkH: t.h, trunkR: t.rTop * 1.15 }, opts.canopy));
    const branches = new THREE.Mesh(built.branches, this.MAT.bark);
    branches.castShadow = true;
    tree.add(branches);
    const crown = new THREE.Group();
    const tufts = new THREE.Mesh(built.tufts, opts.tuftMat);
    // The hero shade tree uses a soft painted canopy: trunk and branches cast
    // crisp forms, while the leaf mass lets the sitting patch stay sunlit.
    tufts.castShadow = !opts.softShadow;
    tufts.receiveShadow = true;
    crown.add(tufts);
    const set = this.cardSets[kind];
    const cards = new THREE.Mesh(built.cards, set.material);
    cards.customDepthMaterial = set.depth;
    cards.castShadow = !opts.softShadow;
    cards.receiveShadow = true;
    crown.add(cards);
    tree.add(crown);
    this.swayables.push({ node: crown, amp: opts.sway || 0.035, freq: 0.8 + this.rng() * 0.6, phase: this.rng() * 6 });

    this.group.add(tree);
    const r = (opts.collider || 0.34) * scale;
    this.addColliderBox(x - r, 0, z - r, x + r, 5, z + r);
    return tree;
  },

  buildRocksAndTrees() {
    // Wind-shaped pines hugging the rim, one lone sakura, two maples —
    // the concept art's big framing tree sits east of the clearing.
    this._tree(-8.8, -6.4, 1.05, 'needle', {
      colors: this.colPine, tuftMat: this.matNeedle,
      trunk: { rTop: 0.09, rBot: 0.17, h: 1.9, lean: 0.22 },
      canopy: { primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45, secondaries: 2, twigs: false, crownFill: 2, clumpR: 0.55, tuftsPerClump: [4, 3, 2], cardsPerClump: [12, 10, 6], cardSize: 0.72, tuftFlat: 0.38, pad: true, lump: 0.3, seed: 37 },
      sway: 0.05
    });
    this._tree(8.8, -6.0, 1.0, 'needle', {
      colors: this.colPine, tuftMat: this.matNeedle,
      trunk: { rTop: 0.09, rBot: 0.17, h: 1.9, lean: 0.24 },
      canopy: { primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45, secondaries: 2, twigs: false, crownFill: 2, clumpR: 0.55, tuftsPerClump: [4, 3, 2], cardsPerClump: [12, 10, 6], cardSize: 0.72, tuftFlat: 0.38, pad: true, lump: 0.3, seed: 37 },
      sway: 0.05
    });
    this._tree(-10.1, -1.2, 0.9, 'needle', {
      colors: this.colPine, tuftMat: this.matNeedle,
      trunk: { rTop: 0.09, rBot: 0.17, h: 1.9, lean: 0.2 },
      canopy: { primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45, secondaries: 2, twigs: false, crownFill: 2, clumpR: 0.55, tuftsPerClump: [4, 3, 2], cardsPerClump: [12, 10, 6], cardSize: 0.72, tuftFlat: 0.38, pad: true, lump: 0.3, seed: 37 },
      sway: 0.05
    });
    // The shade tree over the sitting spot — the reference art's broad
    // green crown, open over the meditation stone and the vista.
    this._tree(5.35, 6.15, 1.92, 'broadleaf', {
      colors: this.colLeaf, tuftMat: this.matFoliage,
      trunk: { rTop: 0.2, rBot: 0.38, h: 2.9, lean: -0.13 },
      canopy: { primaries: 8, tilt: 0.78, tiltVar: 0.22, droop: -0.05, bend: 0.15, branchLen: 2.05, secondaries: 3, twigs: true, crownFill: 4, clumpR: 0.58, tuftsPerClump: [4, 3, 2], cardsPerClump: [14, 11, 8], cardSize: 0.78, tuftFlat: 0.64, lump: 0.34, seed: 63 },
      sway: 0.045, collider: 0.48, softShadow: true
    });
    // The leaning sakura on the eastern brow — the framing tree of the vista.
    this._tree(-8.9, 3.8, 0.95, 'sakura', {
      colors: this.colSakura, tuftMat: this.matBlossom,
      trunk: { rTop: 0.13, rBot: 0.22, h: 2.3, lean: 0.16 },
      canopy: { primaries: 6, tilt: 0.9, tiltVar: 0.2, droop: -0.08, bend: 0.14, branchLen: 1.5, secondaries: 2, twigs: true, crownFill: 3, clumpR: 0.4, tuftsPerClump: [3, 3, 2], cardsPerClump: [11, 10, 7], cardSize: 0.6, tuftFlat: 0.72, lump: 0.34, seed: 11 },
      sway: 0.06, collider: 0.4
    });
    this._tree(-7.6, -7.8, 0.85, 'maple', {
      colors: this.colMaple, tuftMat: this.matFoliage,
      trunk: { rTop: 0.11, rBot: 0.2, h: 2.0, lean: 0.12 },
      canopy: { primaries: 5, tilt: 1.02, tiltVar: 0.18, droop: 0.05, bend: 0.1, branchLen: 1.3, secondaries: 2, twigs: true, crownFill: 2, clumpR: 0.36, tuftsPerClump: [3, 2, 2], cardsPerClump: [10, 9, 6], cardSize: 0.58, tuftFlat: 0.5, lump: 0.3, seed: 23 },
      sway: 0.055
    });
    this._tree(7.5, -7.6, 0.82, 'maple', {
      colors: this.colMaple, tuftMat: this.matFoliage,
      trunk: { rTop: 0.11, rBot: 0.2, h: 2.0, lean: 0.12 },
      canopy: { primaries: 5, tilt: 1.02, tiltVar: 0.18, droop: 0.05, bend: 0.1, branchLen: 1.3, secondaries: 2, twigs: true, crownFill: 2, clumpR: 0.36, tuftsPerClump: [3, 2, 2], cardsPerClump: [10, 9, 6], cardSize: 0.58, tuftFlat: 0.5, lump: 0.3, seed: 23 },
      sway: 0.055
    });

    // Low brush closes the rear of the clearing without becoming a wall:
    // irregular gaps between the crowns keep strips of open sky visible.
    const brushGeo = lumpyTuftGeometry(1, 118, 0.34);
    const brushMat = new THREE.MeshLambertMaterial({ color: 0x4f7938 });
    const brush = new THREE.InstancedMesh(brushGeo, brushMat, 30);
    const brushDummy = new THREE.Object3D();
    let brushCount = 0;
    for (let i = 0; i < 36 && brushCount < 30; i++) {
      const x = -10.4 + i * 0.62 + (this.rng() - 0.5) * 0.45;
      if (Math.abs(x + 1.2) < 0.75 || Math.abs(x - 4.2) < 0.65) continue;
      const z = -8.1 - Math.abs(x) * 0.13 + (this.rng() - 0.5) * 0.7;
      const s = 0.55 + this.rng() * 0.65;
      brushDummy.position.set(x, MEADOW_Y + s * 0.42, z);
      brushDummy.scale.set(s * (0.85 + this.rng() * 0.35), s * (0.65 + this.rng() * 0.45), s);
      brushDummy.rotation.set(0, this.rng() * Math.PI * 2, 0);
      brushDummy.updateMatrix();
      brush.setMatrixAt(brushCount++, brushDummy.matrix);
    }
    brush.count = brushCount;
    brush.instanceMatrix.needsUpdate = true;
    brush.name = 'Summit Back Brush';
    this.group.add(brush);
    this.backBrush = brush;

    // Boulders: a few sitting stones in the meadow, a broken ledge line
    // along the vista rim, clusters guarding the stair mouth.
    const rockGeo = lumpyTuftGeometry(1, 71, 0.42);
    const rockDefs = [
      [8.8, 5.8, 1.0, 0.45], [-8.7, 6.2, 0.85, 0.42],
      [-9.4, -3.6, 0.9, 0.48], [9.1, -2.8, 0.8, 0.42],
      [-5.8, -8.4, 0.72, 0.38], [5.4, -8.6, 0.75, 0.36],
      [5.7, 1.9, 0.55, 0.3], [-4.6, 3.2, 0.5, 0.28]
    ];
    for (const [x, z, s, h] of rockDefs) {
      const rock = new THREE.Mesh(rockGeo, this.MAT.stone);
      rock.scale.set(s, s * h, s * (0.8 + this.rng() * 0.4));
      rock.position.set(x, MEADOW_Y + s * h * 0.32, z);
      rock.rotation.y = this.rng() * Math.PI * 2;
      rock.castShadow = rock.receiveShadow = true;
      this.group.add(rock);
      const cr = s * 0.85;
      this.addColliderBox(x - cr, 0, z - cr, x + cr, s * h, z + cr);
    }

    // Brow boulders half-sunk where the meadow rolls over into the slopes,
    // kept out of the perch's view window so none of them sits on the city.
    // Their own seed leaves this.rng, and everything drawn after, untouched.
    const browRnd = mulberry32(7719);
    this.browStones = [[7.8, 9.0, 1.05], [-8.6, 8.1, 0.9], [-10.9, 3.4, 1.15],
      [11.0, 1.4, 0.95], [-6.4, -9.9, 1.1], [3.6, -11.3, 0.85], [-11.6, -3.0, 0.8]];
    for (const [x, z, s] of this.browStones) {
      const rock = new THREE.Mesh(rockGeo, this.MAT.stone);
      rock.scale.set(s * 1.2, s * (0.42 + browRnd() * 0.16), s * (0.85 + browRnd() * 0.3));
      rock.position.set(x, MEADOW_Y + s * 0.08, z);
      rock.rotation.set((browRnd() - 0.5) * 0.2, browRnd() * Math.PI * 2, (browRnd() - 0.5) * 0.2);
      rock.castShadow = rock.receiveShadow = true;
      rock.name = 'Summit Brow Stone';
      this.group.add(rock);
      const cr = s * 0.9;
      this.addColliderBox(x - cr, 0, z - cr, x + cr, s * 0.5, z + cr);
    }
  },

  /**
   * The clearing's turf, grown from the Grass Lab recipes: painted-meadow
   * Bezier tufts around the cat over tri-quad clumps that cover the whole
   * clearing, a shell carpet under the paws, cat-eye thicket and susuki
   * plumes on the windy rim, alpine wildflower drifts, moss pillows by the
   * boulders and a moss cushion on the perch, and a ring of sumi-e brush
   * grass about the ensō stone. Blades are hashed on the GPU, so nothing
   * here draws from this.rng.
   */
  buildGrassField() {
    const layout = { index: 0, x: 0, y: 0, z: 0, footprint: summitFootprint() };
    return this.placeAsset('summit-grass', layout, () => plantingMethods.meshGrassFieldClassic.call(this, layout));
  },

  meshGrassFieldClassic(layout) {
    const ox = this.origin.x, oz = this.origin.z;
    const mask = new BiomeMask(-13, -13, 26, 128);
    for (const c of this.colliders) {
      mask.box('excl', c.min.x - ox - 0.12, c.min.z - oz - 0.12, c.max.x - ox + 0.12, c.max.z - oz + 0.12);
    }
    mask.box('excl', -(CORRIDOR_W + 0.32), CORRIDOR_Z0 - 0.35, CORRIDOR_W + 0.32, 13);
    mask.disc('excl', this.perchLocal.x, this.perchLocal.z, 0.85, 1, 0.6);
    for (const stone of this.meditationPath) mask.disc('excl', stone.x, stone.z, stone.clearance * 0.8, 1, 0.25);
    mask.paint('wild', (x, z) => THREE.MathUtils.smoothstep(Math.hypot(x, z), 8.4, 11.2));
    // The last four drift along the bay-facing brow, flowering the stretch
    // the perch looks across on its way to the city.
    const flowerPatches = [[5.0, 1.2], [1.0, 3.8], [-3.1, 4.4], [-6.7, 1.2], [7.6, 5.4], [-5.8, -4.2], [4.8, -4.8],
      [4.7, 9.3], [-4.5, 9.5], [6.9, 7.3], [-7.3, 6.7]];
    for (const [x, z] of flowerPatches) mask.disc('flower', x, z, 1.6, 0.9, 2.6);
    mask.bake((x, z) => 1 - THREE.MathUtils.smoothstep(Math.hypot(x, z), 11.3, 12.2));

    // High-altitude turf: drier, more olive-gold than the valley floor, and
    // strongly painted by the wind.
    const grass = this.grass = new GrassSystem(this.group, {
      mask, groundY: MEADOW_Y, wind: 1.4, gustLit: 0.9,
      palette: { root: 0x557735, mid: 0x8eab4c, tip: 0xd5d978 }
    });
    grass.addRing('near', { radius: 6.5, spacing: 0.1, lead: 0.2 });
    grass.addZone('mid', { x: 0, z: 0, hw: 12.2, hd: 12.2, spacing: 0.21, inside: 'near' });
    grass.addShell({ radius: 4, layers: 10, height: 0.09, density: 75, lead: 0.25,
      palette: { root: 0x2c4a1e, mid: 0x5f7f34, tip: 0xb3c264 } });
    grass.addZone('thicket', { x: 0, z: 0, hw: 12.2, hd: 12.2, spacing: 0.42,
      palette: { root: 0x2c4a1e, mid: 0x6b8a3a, tip: 0xc9c66a } });
    grass.addZone('flowers', { x: 0, z: 0, hw: 11, hd: 11, spacing: 0.26 });
    grass.addZone('susuki', { x: 0, z: 0, hw: 12.2, hd: 12.2, spacing: 0.8,
      palette: { root: 0x4a5a2c, mid: 0x93964f, tip: 0xd9c98a } });
    grass.addZone('sumi', { x: 5.25, z: 3.95, hw: 1.6, hd: 1.6, spacing: 0.15, gustLit: 0,
      palette: { root: 0x1b1d17, mid: 0x46523f, tip: 0xaab8a0 } });
    grass.addMoss([
      { x: this.perchLocal.x, z: this.perchLocal.z, r: 1.35 },
      { x: 8.8, z: 5.8, r: 1.5 }, { x: -8.7, z: 6.2, r: 1.3 }, { x: -9.4, z: -3.6, r: 1.4 },
      { x: 9.1, z: -2.8, r: 1.2 }, { x: 5.7, z: 1.9, r: 1.0 }, { x: -4.6, z: 3.2, r: 1.0 },
      { x: 1.6, z: 5.5, r: 0.9 },
      ...this.browStones.map(([x, z, s]) => ({ x, z, r: s * 1.3 }))
    ]);
    if (this.previewQuality) grass.setDensity(0.5);
    this.grassMat = grass.layers[0].mat;
  },

  /**
   * The mountain's green coat: a thicket hugging the meadow rim, broadleaf
   * canopy and cedar spires down every flank, and stands over the far
   * ridges. The bay-facing arc stays low and open so the city, pagoda and
   * sea read from the meditation perch; elsewhere crowns rise past the rim
   * so the clearing sits inside a forest, never on a plinth in the sky.
   */
  buildSlopeForest() {
    const layout = { index: 0, x: 0, y: 0, z: 0, footprint: summitFootprint() };
    return this.placeAsset('slope-forest', layout, () => plantingMethods.meshSlopeForestClassic.call(this, layout));
  },

  meshSlopeForestClassic(layout) {
    const rnd = mulberry32(20261106);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    const leafMass = leafMassTexture('leaf');
    const shrubMat = createFoliageMaterial({
      sss: 0.34, wind: 1.1, rustle: 0.6, mottle: 0.2, bump: 0.45,
      massMap: leafMass, massScale: 1 / 0.55, ragged: 1
    });
    const crownMat = createFoliageMaterial({
      sss: 0.3, wind: 0.75, mottle: 0.24, bump: 0.42,
      massMap: leafMass, massScale: 1 / 1.3, ragged: 0.6
    });
    const cedarMat = createFoliageMaterial({
      sss: 0.16, wind: 0.5, mottle: 0.24, vertexColors: false,
      massMap: leafMassTexture('needle'), massScale: 1 / 1.8
    });
    const farMat = createFoliageMaterial({
      sss: 0.15, wind: 0.4, mottle: 0.24, vertexColors: false,
      massMap: leafMass, massScale: 1 / 3
    });
    const sets = {
      shrub: { geo: bushGeometry(11, { lobes: 7, detail: 1, lump: 0.36 }), mat: shrubMat, max: 190, shadow: true },
      scrub: { geo: bushGeometry(3, { lobes: 4, detail: 1, lump: 0.38 }), mat: shrubMat, max: 480, shadow: false },
      crown: { geo: bushGeometry(5, { lobes: 5, detail: 1, lump: 0.4 }), mat: crownMat, max: 560, shadow: false },
      cedar: { geo: lumpyConeGeometry(1, 12, 0.32), mat: cedarMat, max: 260, shadow: false },
      far: { geo: lumpyTuftGeometry(1, 8, 0.36), mat: farMat, max: 1300, shadow: false },
      farCedar: { geo: lumpyConeGeometry(1, 8, 0.3), mat: cedarMat, max: 700, shadow: false }
    };
    for (const [name, set] of Object.entries(sets)) {
      set.mesh = new THREE.InstancedMesh(set.geo, set.mat, set.max);
      set.mesh.name = 'Summit Slope ' + name;
      set.mesh.castShadow = set.shadow;
      set.mesh.receiveShadow = set.shadow;
      set.count = 0;
    }
    const place = (set, x, y, z, sx, sy, sz, color) => {
      if (set.count >= set.max) return;
      dummy.position.set(x, y, z);
      dummy.rotation.set((rnd() - 0.5) * 0.12, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.12);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      set.mesh.setMatrixAt(set.count, dummy.matrix);
      set.mesh.setColorAt(set.count, tint.setHex(color).multiplyScalar(0.92 + rnd() * 0.16));
      set.count++;
    };
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    // Keeps the stone approach, the lower path and their banks clear.
    const onPath = (x, z, margin) => z > CORRIDOR_Z0 - 2.5 && z < LOWER_PATH_Z1 + 4 &&
      Math.abs(x) < CORRIDOR_W + margin;
    const shrubTints = [0x5a8a3c, 0x67974a, 0x4e7d36, 0x76a24e, 0x5f8f3e];
    const flowerShrubTints = [0xe6e2c4, 0xdcc35c, 0xf0d6dc];
    const crownTints = [0x3f6f2f, 0x4f8038, 0x5f9442, 0x6fa24a, 0x4a7a35];
    const blossomTints = [0xe9b3c3, 0xf3cdd8];
    const cedarTints = [0x2f5130, 0x3b6136, 0x355a32];

    // Rim thicket. The perch's view window keeps only a few knee-high
    // shrubs, set out on the brow below its sightline to the sea.
    for (let n = 0; n < 420 && sets.shrub.count < sets.shrub.max; n++) {
      const a = rnd() * Math.PI * 2;
      const r = 11.2 + rnd() * 3.2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (onPath(x, z, 1.5)) continue;
      const bearing = Math.atan2(x, z);
      let s = 0.55 + rnd() * 0.8;
      if (bearing > -0.62 && bearing < 0.38) {
        if (rnd() < 0.7 || r < 12.6) continue;
        s = 0.3 + rnd() * 0.16;
      }
      const sy = s * (0.75 + rnd() * 0.3);
      const ground = Math.min(MEADOW_Y, this.terrainHeightAt(x, z));
      place(sets.shrub, x, ground + sy * 0.62, z,
        s * (1 + rnd() * 0.4), sy, s * (1 + rnd() * 0.4), pick(shrubTints));
    }

    // Scrub in drifts, not an even sprinkle, each bush capped just above the
    // perch's line over the rim so it can only ever fringe the near roofs.
    const scrubAt = (x, z, r) => {
      if (onPath(x, z, 1.3) || r > 50) return;
      if (worldNoise(x, z, 0.09, 2, 53) < 0.4 + rnd() * 0.2) return;
      const y = this.terrainHeightAt(x, z);
      const room = this.perchSightlineAt(x, z) + 0.45 - y;
      if (room < 0.5) return;
      const sy = Math.min(0.42 + rnd() * 0.9, room / 1.75);
      const sw = sy * (1.15 + rnd() * 0.45);
      place(sets.scrub, x, y + sy * 0.55, z, sw, sy, sw * (0.9 + rnd() * 0.2),
        rnd() < 0.18 ? pick(flowerShrubTints) : pick(shrubTints));
    };

    // Flank canopy and cedars, crowded toward the rim and thinning downhill.
    // Seen from the perch, the city, pagoda and sea fill a window between
    // the shade tree's trunk (+x) and the frame's right edge (-x). Inside it
    // only scrub grows, capped under the perch's line over the rim; outside
    // it the forest runs right up to the meadow.
    for (let n = 0; n < 4800 && (sets.crown.count < sets.crown.max || sets.cedar.count < sets.cedar.max); n++) {
      const a = rnd() * Math.PI * 2;
      const r = 13.4 + Math.pow(rnd(), 1.45) * 62;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const bearing = Math.atan2(x, z);
      if (bearing > -0.62 && bearing < 0.38) {
        scrubAt(x, z, r);
        continue;
      }
      if (onPath(x, z, 3.2)) continue;
      const y = this.terrainHeightAt(x, z);
      // Cedars stand back from the rim so the frame's edges stay soft.
      if (r > 22 && rnd() < 0.3) {
        const s = 1.1 + rnd() * 1.3;
        place(sets.cedar, x, y - 0.3, z, s * 0.9, s * (1.15 + rnd() * 0.5), s * 0.9, pick(cedarTints));
      } else {
        const s = 1.3 + rnd() * 1.7;
        const sy = s * (0.85 + rnd() * 0.35);
        const color = r > 30 && rnd() < 0.04 ? pick(blossomTints) : pick(crownTints);
        place(sets.crown, x, y + sy * 0.55, z, s * (0.95 + rnd() * 0.3), sy, s * (0.95 + rnd() * 0.3), color);
      }
    }

    // The bay-facing slopes the torii and stairs look across get a second,
    // denser pass of scrub.
    for (let n = 0; n < 1800 && sets.scrub.count < sets.scrub.max; n++) {
      const a = -0.62 + rnd();
      const r = 13 + rnd() * 34;
      scrubAt(Math.sin(a) * r, Math.cos(a) * r, r);
    }

    // Far valleys and ridges: coarse stands that give the hills a wooded
    // grain before the haze takes them.
    for (let n = 0; n < 6000 && (sets.far.count < sets.far.max || sets.farCedar.count < sets.farCedar.max); n++) {
      const a = rnd() * Math.PI * 2;
      const r = 70 + Math.pow(rnd(), 0.85) * 175;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const away = Math.abs(Math.atan2(x, z));
      if (away < 0.85 || (z > 150 && away < 1.1)) continue;
      const y = this.terrainHeightAt(x, z);
      const s = 2.2 + rnd() * 2.8;
      if (rnd() < 0.35) {
        place(sets.farCedar, x, y - 0.4, z, s * 0.8, s * (1.1 + rnd() * 0.4), s * 0.8, pick(cedarTints));
      } else {
        place(sets.far, x, y + s * 0.35, z, s * (1 + rnd() * 0.4), s * (0.7 + rnd() * 0.3), s * (1 + rnd() * 0.4), pick(crownTints));
      }
    }

    this.slopeForest = [];
    for (const set of Object.values(sets)) {
      set.mesh.count = set.count;
      set.mesh.instanceMatrix.needsUpdate = true;
      if (set.mesh.instanceColor) set.mesh.instanceColor.needsUpdate = true;
      set.mesh.userData.summitMaxCount = set.count;
      this.group.add(set.mesh);
      this.slopeForest.push(set.mesh);
    }
    this.rimThicket = sets.shrub.mesh;
  }
};
