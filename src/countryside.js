import * as THREE from 'three';
import {
  plasterTextures, woodTextures, kawaraTextures, shojiTextures, tatamiTextures,
  cobbleTextures, stoneTextures, groundTextures, dirtTextures, strawTextures,
  metalTextures, texturedMaterial, worldScaleBoxUVs, worldNoise
} from './textures.js?v=20260907a';
import { createFoliageMaterial, lumpyTuftGeometry } from './foliage.js?v=20260907a';

const Y_UP = new THREE.Vector3(0, 1, 0);

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvasTexture(draw, size = 128, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Procedural PBR surface sets shared by every structure in the valley
const TEX = {
  plaster: plasterTextures(0xf3ebda, 1),
  plasterWarm: plasterTextures(0xe6d7ba, 2),
  woodDark: woodTextures(0x3b2819, 0x1b100a, 2),
  woodMedium: woodTextures(0x5e4029, 0x2c1b10, 3),
  woodLight: woodTextures(0x9a744c, 0x5a3c22, 4),
  woodEngawa: woodTextures(0x7d5736, 0x3f2a18, 5),
  kawara: kawaraTextures(0x6f7a85, 3),
  shoji: shojiTextures(4, 6),
  tatami: tatamiTextures(0xa9b476),
  cobble: cobbleTextures(4),
  stone: stoneTextures(0x939389, 5),
  stoneDark: stoneTextures(0x62625b, 6),
  dirt: dirtTextures(7),
  straw: strawTextures(0xd0b070),
  gold: metalTextures(0xd9ad4c),
  bronze: metalTextures(0xb28538)
};

// Materials whose textures are laid out per panel (lattice frames, mats)
// must keep 0..1 UVs instead of world-scaled tiling.
function panelMaterial(mat) { mat.userData.uvPanel = true; return mat; }

const MAT = {
  grass: texturedMaterial(TEX.dirt, { color: 0x6e8a52, roughness: 0.95 }),
  ridge: texturedMaterial(TEX.dirt, { color: 0x77835a, roughness: 1 }),
  dirt: texturedMaterial(TEX.dirt, { color: 0xc9b08a, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: 0x4d8a86, roughness: 0.12, metalness: 0.45 }),
  timberDark: texturedMaterial(TEX.woodDark, { roughness: 0.82, normalScale: 0.8 }),
  timberMedium: texturedMaterial(TEX.woodMedium, { roughness: 0.8, normalScale: 0.8 }),
  timberLight: texturedMaterial(TEX.woodLight, { roughness: 0.78, normalScale: 0.8 }),
  timberEngawa: texturedMaterial(TEX.woodEngawa, { roughness: 0.55, normalScale: 0.6 }),
  plaster: texturedMaterial(TEX.plaster, { roughness: 0.96, normalScale: 0.9 }),
  plasterWarm: texturedMaterial(TEX.plasterWarm, { roughness: 0.96, normalScale: 0.9 }),
  roofTile: texturedMaterial(TEX.kawara, { color: 0xd4d5d4, roughness: 0.5, metalness: 0.05, normalScale: 0.5, envMapIntensity: 0.85 }),
  roofRidge: texturedMaterial(TEX.stoneDark, { color: 0x3a4149, roughness: 0.5, normalScale: 0.5 }),
  roofThatch: texturedMaterial(TEX.straw, { color: 0x9a8352, roughness: 1 }),
  vermilion: texturedMaterial({ normalMap: TEX.woodMedium.normalMap }, { color: 0xd8482c, roughness: 0.42, normalScale: 0.3, envMapIntensity: 0.5 }),
  stone: texturedMaterial(TEX.stone, { roughness: 0.92, normalScale: 0.9 }),
  stoneDark: texturedMaterial(TEX.stoneDark, { roughness: 0.94, normalScale: 0.9 }),
  stonePlinth: texturedMaterial(TEX.stone, { color: 0xbdbdb4, roughness: 0.9 }),
  slabWarm: texturedMaterial(TEX.stone, { color: 0xcfc1a6, roughness: 0.92 }),
  gravel: texturedMaterial(TEX.dirt, { color: 0xdccfb2, roughness: 1 }),
  shoji: panelMaterial(texturedMaterial(TEX.shoji, { emissive: 0xffb264, emissiveIntensity: 0.12, roughness: 0.85, normalScale: 0.6 })),
  shojiOff: panelMaterial(texturedMaterial(TEX.shoji, { color: 0xe6dac4, roughness: 0.9, normalScale: 0.6 })),
  tatami: panelMaterial(texturedMaterial(TEX.tatami, { roughness: 0.95, normalScale: 0.6 })),
  tatamiBorder: texturedMaterial(TEX.woodDark, { color: 0x2a2620, roughness: 0.9 }),
  norenIndigo: new THREE.MeshStandardMaterial({ color: 0x223652, roughness: 0.9, side: THREE.DoubleSide }),
  norenCrimson: new THREE.MeshStandardMaterial({ color: 0x8f2820, roughness: 0.9, side: THREE.DoubleSide }),
  norenHemp: texturedMaterial(TEX.straw, { color: 0xd6c5a2, roughness: 0.95, side: THREE.DoubleSide, normalScale: 0.4 }),
  lanternPaper: panelMaterial(new THREE.MeshStandardMaterial({ color: 0xffe4bc, emissive: 0x5a2d0c, emissiveIntensity: 0.22, roughness: 0.9 })),
  lanternGlow: panelMaterial(new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0x6e3c10, emissiveIntensity: 0.28, roughness: 0.9 })),
  bambooGreen: texturedMaterial({ normalMap: TEX.woodLight.normalMap }, { color: 0x6a9a44, roughness: 0.55, normalScale: 0.3 }),
  goldAntique: texturedMaterial(TEX.gold, { metalness: 0.9, roughness: 0.32, emissive: 0x8a6008, emissiveIntensity: 0.5 }),
  spiritualBellBronze: texturedMaterial(TEX.bronze, { metalness: 0.85, roughness: 0.42, emissive: 0x422605, emissiveIntensity: 0.2 }),
  cushionRed: new THREE.MeshStandardMaterial({ color: 0xb52b22, roughness: 0.85 }),
  grilledFish: new THREE.MeshStandardMaterial({ color: 0xc87432, roughness: 0.6, emissive: 0x552200, emissiveIntensity: 0.3 }),
  yarn: new THREE.MeshStandardMaterial({ color: 0xe04a7a, emissive: 0x701030, emissiveIntensity: 0.5, roughness: 0.7 }),
  nestTwig: texturedMaterial(TEX.straw, { color: 0x6a4a2c, roughness: 1 }),
  birdEgg: new THREE.MeshStandardMaterial({ color: 0x9be3de, roughness: 0.4, metalness: 0.1 }),
  featherGold: new THREE.MeshStandardMaterial({ color: 0xffd042, emissive: 0xb38600, emissiveIntensity: 0.8, roughness: 0.3 })
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (!(mat && mat.userData && mat.userData.uvPanel)) worldScaleBoxUVs(geo, 1);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export class Countryside {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.seed = options.seed || 20260729;
    this.rng = mulberry32(this.seed);
    this.colliders = [];
    this.bambooFences = [];
    this.villageHouseColliders = { left: [], right: [] };
    this.platforms = []; // Climbable / standable surfaces for cat verticality
    this.collectibles = [];
    this.animated = [];
    this.lanterns = [];
    this.time = 0;
    this.waterRects = [];
    this.riverCurve = null;
    this.riverSamples = [];
    this.pathSamples = [];
    this.vegetationExclusions = [];
    this.ripples = [];
    this.paddyWaterMaterials = [];
    this.lanternHalos = [];
    this.lanternHaloTex = this.makeGlowBallTexture();
    this.buildRipplePool();

    // Secret Machiya & Interactive State
    this.hasSecretKey = false;
    this.isSecretHouseUnlocked = false;
    this.secretDoorSlide = 0;
    this.secretDoorMesh = null;
    this.secretKeyMesh = null;
    this.secretKeyCollected = false;
    this.fishEaten = false;
    this.fishMesh = null;
    this.napSpotPos = new THREE.Vector3(20, 0.45, 10);
    this.nestPos = new THREE.Vector3(-12.25, 5.45, -2.85);
    this.nestInteracted = false;
    this.corralRewardCollected = false;
    this.corralChallengeActive = false;
    this.corralGuardian = null;

    this.buildGround();
    this.buildPaddies();
    this.buildPath();
    this.buildRiverAndBridge();

    // Authentic Kyoto Edo Machiya Buildings
    this.buildMachiyaTeaHouse(-14, -6, 0.5);   // Merchant Tea House (Chaya) with rooftop bird nest & climb route
    this.buildMachiyaResidence(13, -14, -0.9); // Craftsman Machiya with Engawa & Shishi-odoshi
    this.buildSecretMachiya(20, 10, Math.PI + 0.35); // Locked Mystery Machiya (Hisomu-an) with interior
    this.buildSecretKey(-23.5, 0.55, -21.5);   // Antique Golden Key: just inside the open field
    this.buildKeyHidingRock(-23.5, -20.5);     // Conceals the key from the path without blocking pickup

    this.buildTorii(0, -22);
    this.buildShrine(0, -32);
    this.buildVillageStreet();
    this.buildStreetGreenery();
    this.buildBambooCorral(-31, 9);
    this.buildLanterns();
    this.buildMountains();
    this.buildYarn();
    this.boundaryRadius = 44;
  }

  random() { return this.rng(); }

  addCollider(mesh, pad = 0) {
    mesh.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(mesh);
    if (pad) b.expandByScalar(pad);
    this.colliders.push(b);
    return b;
  }

  addBuildingWallColliders(parent, w, d, height, baseY = 0, thickness = 0.18) {
    parent.updateWorldMatrix(true, true);
    const definitions = [
      { x: 0, z: d / 2, w, d: thickness },
      { x: 0, z: -d / 2, w, d: thickness },
      { x: w / 2, z: 0, w: thickness, d },
      { x: -w / 2, z: 0, w: thickness, d }
    ];
    const aggregate = new THREE.Box3();
    for (const wall of definitions) {
      const local = new THREE.Box3(
        new THREE.Vector3(wall.x - wall.w / 2, baseY, wall.z - wall.d / 2),
        new THREE.Vector3(wall.x + wall.w / 2, baseY + height, wall.z + wall.d / 2)
      );
      const points = [];
      for (const px of [local.min.x, local.max.x]) {
        for (const py of [local.min.y, local.max.y]) {
          for (const pz of [local.min.z, local.max.z]) {
            points.push(new THREE.Vector3(px, py, pz).applyMatrix4(parent.matrixWorld));
          }
        }
      }
      const collider = new THREE.Box3().setFromPoints(points);
      this.colliders.push(collider);
      aggregate.union(collider);
    }
    return aggregate;
  }

  addPlatform(box3) {
    this.platforms.push(box3);
  }

  addOrientedPlatform(parent, bounds, topY, options = {}) {
    parent.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert();
    const local = new THREE.Vector3();
    const platform = {
      requiredAbility: options.requiredAbility,
      requiredRank: options.requiredRank,
      getHeightAt: (x, z, margin = 0) => {
        local.set(x, 0, z).applyMatrix4(inverse);
        if (local.x < bounds.minX - margin || local.x > bounds.maxX + margin ||
            local.z < bounds.minZ - margin || local.z > bounds.maxZ + margin) return null;
        return topY;
      },
      getNormalAt: () => Y_UP.clone()
    };
    this.addPlatform(platform);
    return platform;
  }

  addSlopedRoofPlatforms(parent, roofY, w, d, ridgeH, overhang, options = {}) {
    parent.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert();
    const rotation = new THREE.Quaternion().setFromRotationMatrix(parent.matrixWorld);
    const halfW = w / 2 + overhang;
    const halfD = d / 2 + overhang;
    const scratch = new THREE.Vector3();
    for (const side of [-1, 1]) {
      const platform = {
        requiredAbility: options.requiredAbility,
        requiredRank: options.requiredRank,
        getHeightAt: (x, z, margin = 0) => {
          scratch.set(x, 0, z).applyMatrix4(inverse);
          if (scratch.x < -halfW - margin || scratch.x > halfW + margin) return null;
          if (side > 0 && (scratch.z < -margin || scratch.z > halfD + margin)) return null;
          if (side < 0 && (scratch.z > margin || scratch.z < -halfD - margin)) return null;
          const rise = ridgeH * (1 - Math.min(1, Math.abs(scratch.z) / halfD));
          return roofY + rise + 0.08;
        },
        getNormalAt: () => new THREE.Vector3(0, 1, side * ridgeH / halfD).applyQuaternion(rotation).normalize()
      };
      this.addPlatform(platform);
    }
  }

  /**
   * World height field. The playable valley floor (r < 55) is flat; beyond
   * it the ground lifts into forested foothills and then noise-ridged
   * mountain walls, replacing the old cone silhouettes.
   */
  terrainHeight(x, z) {
    const d = Math.sqrt(x * x + z * z);
    const lift = Math.max(0, (d - 55) / 40);
    let y = lift * lift * 6 + Math.sin(x * 0.08) * Math.cos(z * 0.07) * lift * 2;
    const foot = smoothstep(68, 150, d);
    if (foot > 0) {
      const n1 = worldNoise(x, z, 0.021, 4, 11);
      y += foot * (5 + n1 * 28);
    }
    const high = smoothstep(135, 330, d);
    if (high > 0) {
      const n2 = worldNoise(x, z, 0.0085, 4, 23);
      const ridged = 1 - Math.abs(n2 * 2 - 1);
      const n3 = worldNoise(x, z, 0.03, 3, 29);
      y += high * (34 + Math.pow(ridged, 1.7) * 110 + n3 * 14);
    }
    return y;
  }

  buildGround() {
    const size = 260;
    const geo = new THREE.PlaneGeometry(size, size, 150, 150);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Natural painterly ground palette — muted mossy greens with pools of
    // dark shaded grass, matching the Kyoto village reference painting
    const colMeadow = new THREE.Color(0x5d8442);   // Fresh meadow green
    const colMoss = new THREE.Color(0x3d6030);     // Deep mossy shade
    const colGold = new THREE.Color(0x7a9448);     // Soft sun-warmed olive
    const colEarth = new THREE.Color(0x8a7452);    // Rich loam near paths/settlement
    const colBank = new THREE.Color(0x4f7440);     // Riverbank lush loam
    const colDark = new THREE.Color(0x2c4a26);     // Dark grass shadow pools
    const colForest = new THREE.Color(0x2f4f2a);   // Foothill forest floor
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.sqrt(x * x + z * z);
      pos.setY(i, this.terrainHeight(x, z));

      // Procedural color blend
      const noise1 = worldNoise(x, z, 0.05, 3, 3);
      const noise2 = worldNoise(x, z, 0.14, 2, 5);
      const noise3 = worldNoise(x, z, 0.028, 3, 7);

      c.copy(colMeadow).lerp(colGold, noise1 * 0.7).lerp(colMoss, noise2 * 0.45);

      // Broad painterly pools of dark shaded grass
      if (noise3 > 0.58) c.lerp(colDark, (noise3 - 0.58) / 0.42 * 0.7);

      // Darker rich earth near river (z ~ 26..32)
      if (Math.abs(z - 29) < 8) {
        const bankFactor = 1.0 - THREE.MathUtils.clamp(Math.abs(z - 29) / 8, 0, 1);
        c.lerp(colBank, bankFactor * 0.7);
      }

      // Loam soil accents near center path/buildings
      if (d < 35 && (Math.abs(x) < 5 || (x > 8 && x < 24 && z > -18 && z < 14))) {
        c.lerp(colEarth, 0.3 + noise2 * 0.25);
      }

      // Outer forest tones darken toward the treeline and foothills
      if (d > 48) c.lerp(colForest, Math.min(1, (d - 48) / 40));

      // The vertex colour is a TINT over the detail texture, so normalise it
      // around unit luminance instead of multiplying two dark colours.
      const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      const k = 1 / Math.max(0.05, lum) * 0.5;
      colors[i * 3 + 0] = c.r * k;
      colors[i * 3 + 1] = c.g * k;
      colors[i * 3 + 2] = c.b * k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    // Tiling moss/grass detail under the blade instances; the vertex colour
    // pass above breaks up the tile repetition with broad painterly patches.
    const ground = new THREE.Mesh(geo, texturedMaterial(groundTextures(6), {
      roughness: 0.96, normalScale: 0.7, repeat: [size / 3.2, size / 3.2]
    }));
    ground.material.vertexColors = true;
    ground.material.color.setHex(0xffffff);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.groundMesh = ground;

    // Soft earthen shoulders either side of the cobbled road so the pavement
    // fades into the meadow rather than ending in a hard seam.
    this.buildPathShoulders();
  }

  buildPathShoulders() {
    if (!this.pathSamplesPreview) {
      const pts = [
        new THREE.Vector3(0, 0, 34), new THREE.Vector3(-2, 0, 20), new THREE.Vector3(1.5, 0, 6),
        new THREE.Vector3(0, 0, -8), new THREE.Vector3(-1, 0, -16), new THREE.Vector3(0, 0, -30)
      ];
      this.pathSamplesPreview = new THREE.CatmullRomCurve3(pts);
    }
    const curve = this.pathSamplesPreview;
    const steps = 80, width = 6.4;
    const verts = [], uvs = [], indices = [], alpha = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const wobble = Math.sin(t * 27) * 0.35 + Math.sin(t * 61) * 0.2;
      verts.push(
        p.x - side.x * (width / 2 + wobble), 0.018, p.z - side.z * (width / 2 + wobble),
        p.x + side.x * (width / 2 - wobble), 0.018, p.z + side.z * (width / 2 - wobble)
      );
      uvs.push(0, i * 0.8, 1, i * 0.8);
      if (i < steps) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = texturedMaterial(dirtTextures(7), { color: 0xb9a37c, roughness: 1, transparent: true, normalScale: 0.6 });
    // Fade the shoulder out across its width via a UV-driven alpha
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vShoulderU = uv.x;')
        .replace('void main() {', 'varying float vShoulderU;\nvoid main() {');
      shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'varying float vShoulderU;\nvoid main() {')
        .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n diffuseColor.a *= smoothstep(0.0, 0.42, vShoulderU) * smoothstep(1.0, 0.58, vShoulderU) * 0.9;');
    };
    const shoulder = new THREE.Mesh(geo, mat);
    shoulder.receiveShadow = true;
    shoulder.renderOrder = -1;
    this.scene.add(shoulder);
  }

  makeGlowBallTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(255, 216, 152, 1)');
    g.addColorStop(0.35, 'rgba(255, 176, 102, 0.5)');
    g.addColorStop(1, 'rgba(255, 148, 74, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildRipplePool() {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf2fbf7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const geo = new THREE.RingGeometry(0.68, 1, 28);
    for (let i = 0; i < 24; i++) {
      const ring = new THREE.Mesh(geo, mat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.045;
      ring.visible = false;
      ring.renderOrder = 2;
      this.scene.add(ring);
      this.ripples.push({ mesh: ring, age: 0, life: 0, strength: 1 });
    }
  }

  shoreDistance(x, z) {
    let best = Infinity;
    for (const [px, pz, w, d] of this.waterRects) {
      const dx = Math.abs(x - px), dz = Math.abs(z - pz);
      if (dx < w / 2 && dz < d / 2) {
        best = Math.min(best, w / 2 - dx, d / 2 - dz);
      }
    }
    if (this.riverSamples.length) {
      let minD = Infinity;
      for (let i = 0; i < this.riverSamples.length; i++) {
        const s = this.riverSamples[i];
        const ddx = x - s.x, ddz = z - s.z;
        const dist = Math.sqrt(ddx * ddx + ddz * ddz);
        if (dist < minD) minD = dist;
      }
      if (minD < 3.2) best = Math.min(best, 3.2 - minD);
    }
    return best;
  }

  spawnRipple(x, z, strength = 1) {
    const shore = this.shoreDistance(x, z);
    if (shore < 0.15) return;
    let slot = this.ripples.find(r => r.life <= 0);
    if (!slot) slot = this.ripples[0];
    slot.mesh.position.set(x, 0.045, z);
    slot.mesh.visible = true;
    slot.age = 0;
    slot.life = 1.1;
    slot.strength = strength;
    slot.maxScale = Math.max(0.3, shore * 1.05);
  }

  isInWater(x, z, y = 0) {
    // Ramps are dry approaches; the deck only excludes water while elevated.
    for (const rect of this.bridgeRampWaterExclusions || []) {
      if (Math.abs(x - rect.x) < rect.width / 2 && Math.abs(z - rect.z) < rect.depth / 2) return false;
    }
    const deck = this.bridgeDeckWaterClearance;
    if (deck && y > deck.underpassY &&
        Math.abs(x - deck.x) < deck.width / 2 && Math.abs(z - deck.z) < deck.depth / 2) return false;
    for (const [px, pz, w, d] of this.waterRects) {
      if (Math.abs(x - px) < w / 2 && Math.abs(z - pz) < d / 2) return true;
    }
    if (this.riverSamples.length) {
      for (let i = 0; i < this.riverSamples.length; i++) {
        const s = this.riverSamples[i];
        const dx = x - s.x, dz = z - s.z;
        if (dx * dx + dz * dz < 10.2) return true;
      }
    }
    return false;
  }

  buildPaddies() {
    const plots = [
      // The former (-26, 8) paddy overlapped the turtle corral. Removing this
      // one plot clears its water, rice instances, and enclosing ridges only.
      [-26, 22, 14, 10],
      [14, 22, 12, 10], [28, 22, 12, 10], [26, -2, 12, 12]
    ];
    this.waterRects = plots;
    const riceMat = new THREE.MeshStandardMaterial({ color: 0x86b23e, roughness: 0.9 });
    const riceGeo = new THREE.ConeGeometry(0.05, 0.5, 4);
    let riceCount = 0;
    for (const [px, pz, w, d] of plots) riceCount += Math.floor(w * d / 1.6);
    const rice = new THREE.InstancedMesh(riceGeo, riceMat, riceCount);
    rice.castShadow = false;
    let ri = 0;
    const dummy = new THREE.Object3D();

    for (const [px, pz, w, d] of plots) {
      const rippleTexture = makeCanvasTexture((ctx, size) => {
        ctx.fillStyle = '#4d8a86';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(210,242,232,0.42)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          const y = 8 + i * 14;
          ctx.beginPath();
          ctx.moveTo(-12, y);
          ctx.bezierCurveTo(size * 0.2, y - 5, size * 0.35, y + 5, size * 0.55, y);
          ctx.bezierCurveTo(size * 0.72, y - 4, size * 0.88, y + 4, size + 12, y - 1);
          ctx.stroke();
        }
      }, 128, Math.max(2, w / 3), Math.max(2, d / 3));
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x4f8a86,
        map: rippleTexture,
        bumpMap: rippleTexture,
        bumpScale: 0.025,
        roughness: 0.32,
        metalness: 0.08,
        envMapIntensity: 0.4,
        transparent: true,
        opacity: 0.9
      });
      this.paddyWaterMaterials.push({ material: waterMat, phase: this.random() * Math.PI * 2, speed: 0.018 + this.random() * 0.012 });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(px, 0.02, pz);
      water.receiveShadow = true;
      this.scene.add(water);

      const ridgeH = 0.28, ridgeW = 0.5;
      this.scene.add(box(w + ridgeW * 2, ridgeH, ridgeW, MAT.ridge, px, ridgeH / 2, pz - d / 2 - ridgeW / 2));
      this.scene.add(box(w + ridgeW * 2, ridgeH, ridgeW, MAT.ridge, px, ridgeH / 2, pz + d / 2 + ridgeW / 2));
      this.scene.add(box(ridgeW, ridgeH, d, MAT.ridge, px - w / 2 - ridgeW / 2, ridgeH / 2, pz));
      this.scene.add(box(ridgeW, ridgeH, d, MAT.ridge, px + w / 2 + ridgeW / 2, ridgeH / 2, pz));

      for (let i = 0; i < Math.floor(w * d / 1.6); i++) {
        dummy.position.set(
          px + (this.random() - 0.5) * (w - 1.2),
          0.26,
          pz + (this.random() - 0.5) * (d - 1.2)
        );
        dummy.rotation.y = this.random() * Math.PI;
        const s = 0.7 + this.random() * 0.6;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        rice.setMatrixAt(ri++, dummy.matrix);
      }
    }
    rice.count = ri;
    rice.instanceMatrix.needsUpdate = true;
    this.scene.add(rice);
  }

  buildPath() {
    const pts = [
      new THREE.Vector3(0, 0, 34),
      new THREE.Vector3(-2, 0, 20),
      new THREE.Vector3(1.5, 0, 6),
      new THREE.Vector3(0, 0, -8),
      new THREE.Vector3(-1, 0, -16),
      new THREE.Vector3(0, 0, -30)
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    this.pathSamples = curve.getPoints(100);
    const steps = 80;
    const width = 3.8;
    const verts = [];
    const indices = [];
    // Stop the ground-level road at the bridge approaches.
    const bridgeRoadGap = { x: -1, z: 30.5, width: 3.2, depth: 9.0 };
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const wobble = Math.sin(t * 40) * 0.15;
      verts.push(
        p.x - side.x * (width / 2 + wobble), 0.03, p.z - side.z * (width / 2 + wobble),
        p.x + side.x * (width / 2 - wobble), 0.03, p.z + side.z * (width / 2 - wobble)
      );
      if (i < steps) {
        const next = curve.getPoint((i + 1) / steps);
        const mx = (p.x + next.x) / 2;
        const mz = (p.z + next.z) / 2;
        const belowBridge = Math.abs(mx - bridgeRoadGap.x) < bridgeRoadGap.width / 2
          && Math.abs(mz - bridgeRoadGap.z) < bridgeRoadGap.depth / 2;
        if (!belowBridge) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    // Ribbon UVs so the cobblestone texture tiles along the road
    const uvs = [];
    for (let i = 0; i <= steps; i++) {
      uvs.push(0, i * 0.6, 1, i * 0.6);
    }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const gravel = new THREE.Mesh(geo, this.getCobbleMaterial());
    gravel.receiveShadow = true;
    this.scene.add(gravel);

    this.buildPathBoulders(curve);
  }

  /**
   * Japanese river-stone cobbles (isogata) with a relief normal map. The
   * default variant tiles across the road ribbon's 0..1 UVs; `worldScaled`
   * returns a variant for boxes whose UVs are in metres (bridge deck, ramps).
   */
  getCobbleMaterial(worldScaled = false) {
    if (worldScaled) {
      if (!this._cobbleWorldMat) {
        this._cobbleWorldMat = texturedMaterial(TEX.cobble, { color: 0xe4dccc, roughness: 0.84, normalScale: 0.9, repeat: [0.65, 0.65] });
      }
      return this._cobbleWorldMat;
    }
    if (!this._cobbleMat) {
      this._cobbleMat = texturedMaterial(TEX.cobble, { color: 0xe4dccc, roughness: 0.84, normalScale: 0.9, repeat: [2.4, 2.0] });
      this._cobbleMat.userData.uvPanel = true;
    }
    return this._cobbleMat;
  }

  buildWalkwaySlabs(curve) {
    const slabMats = [MAT.stone, MAT.stoneDark, MAT.slabWarm];
    const len = curve.getLength();
    const rows = Math.floor(len / 0.62);
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const cols = this.random() > 0.4 ? 2 : 1;
      for (let c = 0; c < cols; c++) {
        const w = 0.55 + this.random() * 0.45;
        const d = 0.45 + this.random() * 0.3;
        const h = 0.06 + this.random() * 0.05;
        const off = cols === 1 ? (this.random() - 0.5) * 0.3 : (c === 0 ? -0.55 - this.random() * 0.15 : 0.55 + this.random() * 0.15);
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          slabMats[Math.floor(this.random() * slabMats.length)]
        );
        slab.position.set(p.x + side.x * off, h / 2 + 0.03, p.z + side.z * off);
        slab.rotation.y = Math.atan2(tan.x, tan.z) + (this.random() - 0.5) * 0.35;
        slab.receiveShadow = true;
        slab.castShadow = true;
        this.scene.add(slab);
      }
    }
  }

  buildPathBoulders(curve) {
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const len = curve.getLength();
    const count = Math.floor(len / 3.2);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const sideSign = this.random() > 0.5 ? 1 : -1;
      const dramatic = this.random() > 0.9;
      const s = dramatic ? 0.55 + this.random() * 0.5 : 0.18 + this.random() * 0.3;
      const off = sideSign * (2.4 + this.random() * 1.8 + s * 0.5);
      const rock = new THREE.Mesh(rockGeo, this.random() > 0.5 ? MAT.stone : MAT.stoneDark);
      rock.position.set(p.x + side.x * off, s * 0.45, p.z + side.z * off);
      rock.scale.set(s * (0.8 + this.random() * 0.5), s * (0.6 + this.random() * 0.7), s * (0.8 + this.random() * 0.5));
      rock.rotation.set(this.random() * Math.PI, this.random() * Math.PI, this.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
      if (s > 0.5) this.addCollider(rock, -0.05);
    }
  }

  buildRiverAndBridge() {
    const riverPts = [
      new THREE.Vector3(-60, 0, 26),
      new THREE.Vector3(-20, 0, 30),
      new THREE.Vector3(12, 0, 32),
      new THREE.Vector3(40, 0, 28),
      new THREE.Vector3(70, 0, 30)
    ];
    const curve = new THREE.CatmullRomCurve3(riverPts);
    this.riverCurve = curve;
    this.riverSamples = curve.getPoints(60);
    const steps = 60, halfW = 3.4;
    const verts = [], indices = [], uvs = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      verts.push(
        p.x - side.x * halfW, 0.02, p.z - side.z * halfW,
        p.x + side.x * halfW, 0.02, p.z + side.z * halfW
      );
      // u = across the channel (banks at 0 and 1), v = downstream distance
      uvs.push(0, t * 40, 1, t * 40);
      if (i < steps) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    this.riverMat = this.createRiverWaterMaterial();
    const river = new THREE.Mesh(geo, this.riverMat);
    river.receiveShadow = true;
    this.scene.add(river);

    // Kyoto-style river bridge: flat walkable deck, wide railings usable
    // as ledge-walk surfaces, stone abutment colliders, and a hidden
    // golden dango charm secret tucked underneath.
    const bridge = new THREE.Group();
    const deckMat = MAT.timberEngawa || MAT.vermilion;
    const deckY = 1.0;

    // Single flat deck — no per-segment rotation, fully walkable
    const deck = box(2.6, 0.16, 8.4, deckMat, 0, deckY, 0);
    bridge.add(deck);
    // Continue the cobbles on the bridge deck, not on the riverbed below.
    const cobbleDeck = box(2.38, 0.025, 8.12, this.getCobbleMaterial(true), 0, deckY + 0.093, 0);
    cobbleDeck.receiveShadow = true;
    bridge.add(cobbleDeck);
    // Support beam underneath
    bridge.add(box(2.4, 0.12, 8.2, MAT.timberDark, 0, deckY - 0.14, 0));

    // Railing posts at regular intervals
    for (let i = 0; i <= 6; i++) {
      const z = -4.0 + (i / 6) * 8.0;
      for (const s of [-1, 1]) {
        bridge.add(box(0.1, 0.6, 0.1, MAT.timberDark, s * 1.22, deckY + 0.35, z));
      }
    }
    // Wide flat-capped railings — walkable as ledge surfaces
    for (const s of [-1, 1]) {
      bridge.add(box(0.42, 0.08, 8.4, MAT.timberDark, s * 1.24, deckY + 0.62, 0));
      bridge.add(box(0.12, 0.5, 8.2, MAT.timberDark, s * 1.24, deckY + 0.36, 0));
    }
    // Gradual walk-up ramps at both ends. A timber base supports the same
    // cobblestone surface as the main pathway so the route reads continuously.
    const rampLen = 2.6;
    const rampAngle = Math.atan2(deckY + 0.08, rampLen);
    for (const sz of [-1, 1]) {
      const slopeLength = Math.sqrt(rampLen * rampLen + (deckY + 0.08) * (deckY + 0.08)) + 0.2;
      const ramp = box(2.6, 0.12, slopeLength, MAT.timberEngawa, 0, (deckY + 0.08) / 2 - 0.04, sz * (4.2 + rampLen / 2));
      // The outer edge starts at ground level and rises toward the bridge deck.
      ramp.rotation.x = sz * rampAngle;
      const cobbleRamp = box(2.38, 0.025, slopeLength - 0.12, this.getCobbleMaterial(true), 0, 0.075, 0);
      cobbleRamp.receiveShadow = true;
      ramp.add(cobbleRamp);
      bridge.add(ramp);
      // Low stone kerbs flanking each ramp
      for (const s of [-1, 1]) {
        bridge.add(box(0.18, 0.22, rampLen, MAT.stoneDark, s * 1.35, 0.11, sz * (4.2 + rampLen / 2)));
      }
    }
    bridge.position.set(-1, 0, 30.5);
    this.scene.add(bridge);

    // Grass/reed placement is generated after the bridge. Reserve the full deck
    // and its approaches so vegetation cannot grow through the timber ramp.
    this.vegetationExclusions.push({ x: -1, z: 30.5, width: 4.2, depth: 15.2 });
    this.bridgeDeckWaterClearance = { x: -1, z: 30.5, width: 2.7, depth: 8.5, underpassY: 0.42 };
    this.bridgeRampWaterExclusions = [
      { x: -1, z: 25.0, width: 3.0, depth: 2.95 },
      { x: -1, z: 36.0, width: 3.0, depth: 2.95 }
    ];

    // Walkable platform: flat deck top surface
    this.platforms.push(new THREE.Box3(
      new THREE.Vector3(-1 - 1.3, 0, 30.5 - 4.2),
      new THREE.Vector3(-1 + 1.3, deckY + 0.08, 30.5 + 4.2)
    ));
    // Railing ledge-walk platforms
    for (const s of [-1, 1]) {
      this.platforms.push(new THREE.Box3(
        new THREE.Vector3(-1 + s * 1.24 - 0.21, 0, 30.5 - 4.2),
        new THREE.Vector3(-1 + s * 1.24 + 0.21, deckY + 0.66, 30.5 + 4.2)
      ));
    }
    // Continuous sloped platform math matches the visible ramps in both
    // directions, avoiding stair seams and making walking down reliable.
    const bridgeTop = deckY + 0.08;
    for (const sz of [-1, 1]) {
      this.addPlatform({
        getHeightAt: (x, z, margin = 0) => {
          if (x < -1 - 1.3 - margin || x > -1 + 1.3 + margin) return null;
          const outward = sz * (z - 30.5) - 4.2;
          if (outward < -margin || outward > rampLen + margin) return null;
          return Math.max(0.03, bridgeTop * (1 - THREE.MathUtils.clamp(outward / rampLen, 0, 1)));
        },
        getNormalAt: () => new THREE.Vector3(0, 1, sz * bridgeTop / rampLen).normalize()
      });
    }

    // Hidden secret under the bridge: a glowing golden dango charm
    const charm = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14),
      new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xd9a441, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.35 })
    );
    charm.position.set(-1, 0.28, 30.5);
    charm.userData.id = 90;
    charm.userData.isCharm = true;
    charm.castShadow = true;
    this.scene.add(charm);
    this.collectibles.push(charm);
  }

  /**
   * Animated painterly river water: layered moving ripple rings, directional
   * flow streaks, and a sharp golden sun sparkle lane that slides with the
   * sun's position. Pure shader — no textures — tinted each frame from the
   * sky palette so sunset turns the river to molten gold.
   */
  createRiverWaterMaterial() {
    this.riverUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.55, 0.28, -0.79) },
      uSunColor: { value: new THREE.Color(0xffe6b8) },
      uDeep: { value: new THREE.Color(0x224c5a) },
      uShallow: { value: new THREE.Color(0x4f8f8c) },
      uSky: { value: new THREE.Color(0xffc98a) },
      uWarm: { value: new THREE.Color(0xffb264) },
      uDusk: { value: 0 },
      uDay: { value: 1 }
    };
    this.riverUniforms.uTop = { value: new THREE.Color(0x4a6a9e) };
    return new THREE.ShaderMaterial({
      uniforms: this.riverUniforms,
      transparent: true,
      vertexShader: `
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform vec3 uSky;
        uniform vec3 uTop;
        uniform float uDusk;
        uniform float uDay;
        varying vec3 vWorld;
        varying vec2 vUv;

        float waveHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float waveNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(waveHash(i), waveHash(i + vec2(1.0, 0.0)), f.x),
                     mix(waveHash(i + vec2(0.0, 1.0)), waveHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        // Layered surface height: two crossing ripple trains plus fine chop
        float waveH(vec2 p, float t) {
          float r1 = sin(p.x * 2.1 - t * 1.4 + sin(p.y * 3.0 + t * 0.7) * 0.8);
          float r2 = sin(p.y * 3.4 + p.x * 0.6 - t * 2.1);
          float r3 = sin((p.x + p.y) * 6.5 - t * 3.1) * 0.35 + (waveNoise(p * 3.0 + vec2(t * 0.8, 0.0)) - 0.5) * 0.8;
          return r1 * 0.5 + r2 * 0.35 + r3 * 0.25;
        }

        void main() {
          vec2 p = vWorld.xz;
          float t = uTime;

          // Surface normal from the height field for real specular response
          float e = 0.06;
          float h0 = waveH(p, t);
          float hx = waveH(p + vec2(e, 0.0), t) - waveH(p - vec2(e, 0.0), t);
          float hz = waveH(p + vec2(0.0, e), t) - waveH(p - vec2(0.0, e), t);
          vec3 n = normalize(vec3(-hx * 0.9, 1.0, -hz * 0.9));
          float rip = h0;

          vec3 V = normalize(cameraPosition - vWorld);
          vec3 L = normalize(uSunDir);
          vec3 H = normalize(L + V);
          float sunUp = clamp(uSunDir.y * 4.0, 0.0, 1.0);

          // Body colour: deep channel centre, shallower tint near the banks
          float bank = min(vUv.x, 1.0 - vUv.x);
          vec3 col = mix(uDeep, uShallow, 0.3 + rip * 0.15 + smoothstep(0.35, 0.0, bank) * 0.35);

          // Fresnel sky reflection: glancing views mirror the sky dome
          float fres = 0.04 + 0.5 * pow(1.0 - max(dot(n, V), 0.0), 4.5);
          vec3 skyRefl = mix(uSky, uTop, clamp(n.y * V.y * 1.4, 0.0, 1.0)) * 0.55;
          col = mix(col, skyRefl, clamp(fres, 0.0, 0.5));

          // Sun specular: tight hot highlight plus a broad soft sheen
          float spec = pow(max(dot(n, H), 0.0), 260.0) * 1.1 + pow(max(dot(n, H), 0.0), 18.0) * 0.05;
          col += uSunColor * spec * sunUp * (0.5 + uDusk * 0.8);

          // Sparse sparkle cells drifting downstream on the crests
          vec2 cell = floor(vec2(p.x * 10.0 - t * 3.2, p.y * 10.0));
          float sparkle = step(0.992, waveHash(cell + floor(t * 9.0) * 0.17));
          sparkle *= smoothstep(0.35, 0.9, rip * 0.5 + 0.5);
          col += uSunColor * sparkle * 0.6 * sunUp;

          // Foam and lapping along both banks
          float foamN = waveNoise(vec2(vUv.y * 6.0 - t * 0.6, vUv.x * 30.0));
          float foam = smoothstep(0.14, 0.0, bank) * smoothstep(0.5, 0.85, foamN + rip * 0.15);
          col = mix(col, vec3(0.85, 0.9, 0.9), foam * 0.45 * (0.4 + 0.6 * uDay));

          // Day/night master dim: molten gold at dusk, near-black at night
          col *= (0.22 + 0.78 * uDay);
          col = min(col, vec3(1.3));

          // Feather the water into the banks
          float alpha = 0.94 * smoothstep(0.0, 0.08, bank) + 0.05;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
  }

  // --- Kyoto Edo Period Architecture Builders ---

  createKoushi(w, h, count = 8, mat = MAT.timberDark) {
    const group = new THREE.Group();
    const frameThick = 0.04;
    // Outer frame
    group.add(box(w, frameThick, frameThick * 1.5, mat, 0, h / 2, 0));
    group.add(box(w, frameThick, frameThick * 1.5, mat, 0, -h / 2, 0));
    group.add(box(frameThick, h, frameThick * 1.5, mat, -w / 2, 0, 0));
    group.add(box(frameThick, h, frameThick * 1.5, mat, w / 2, 0, 0));
    // Vertical slats
    const slatW = 0.018;
    const spacing = (w - frameThick * 2) / (count + 1);
    for (let i = 1; i <= count; i++) {
      const sx = -w / 2 + frameThick + i * spacing;
      group.add(box(slatW, h - frameThick * 2, slatW * 1.2, mat, sx, 0, 0));
    }
    return group;
  }

  /**
   * A roof slope slab with the gentle concave "sori" lift toward the eave
   * that defines Kyoto rooflines. `eaveSign` says which local Z end is the
   * eave. Returns a mesh whose local +Y is the tile surface.
   */
  createCurvedSlope(w, thick, len, eaveSign, lift = 0.16) {
    const geo = new THREE.BoxGeometry(w, thick, len, 1, 1, 10);
    worldScaleBoxUVs(geo, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const t = THREE.MathUtils.clamp((eaveSign * z + len / 2) / len, 0, 1); // 0 ridge → 1 eave
      const curve = Math.pow(smoothstep(0.45, 1.0, t), 2.0) * lift;
      pos.setY(i, pos.getY(i) + curve);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, MAT.roofTile);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  createKawaraRoof(w, d, ridgeH = 1.2, overhang = 0.6) {
    const roof = new THREE.Group();
    const halfD = d / 2 + overhang;
    const slopeLen = Math.sqrt(halfD * halfD + ridgeH * ridgeH) + 0.1;
    const angle = Math.atan2(ridgeH, halfD);
    const fullW = w + overhang * 2;

    // Front & Back main slopes with upturned eaves
    const slopeF = this.createCurvedSlope(fullW, 0.14, slopeLen, 1);
    slopeF.position.set(0, ridgeH / 2, halfD / 2);
    slopeF.rotation.x = angle;
    const slopeB = this.createCurvedSlope(fullW, 0.14, slopeLen, -1);
    slopeB.position.set(0, ridgeH / 2, -halfD / 2);
    slopeB.rotation.x = -angle;
    roof.add(slopeF, slopeB);

    // Eave detail: a row of round-faced end tiles (nokigawara) along each
    // eave and rafter tails underneath — the details that make a tiled roof
    // read as tiled from the street.
    const tileGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.13, 10, 1, false, 0, Math.PI);
    tileGeo.rotateZ(Math.PI / 2);
    const rafterGeo = new THREE.BoxGeometry(0.07, 0.09, overhang + 0.35);
    worldScaleBoxUVs(rafterGeo, 1);
    const tileCount = Math.max(2, Math.floor(fullW / 0.24));
    const rafterCount = Math.max(2, Math.floor(fullW / 0.55));
    const dummy = new THREE.Object3D();
    for (const sz of [1, -1]) {
      const eaveTiles = new THREE.InstancedMesh(tileGeo, MAT.roofRidge, tileCount);
      const rafters = new THREE.InstancedMesh(rafterGeo, MAT.timberDark, rafterCount);
      // Eave edge in roof-local space: end of the slope, lifted by the sori
      const eaveY = -0.03 + 0.16 * Math.cos(angle);
      const eaveZ = sz * (halfD + 0.02);
      for (let i = 0; i < tileCount; i++) {
        const x = -fullW / 2 + 0.12 + (i / (tileCount - 1)) * (fullW - 0.24);
        dummy.position.set(x, eaveY + 0.02, eaveZ);
        dummy.rotation.set(sz > 0 ? 0 : Math.PI, 0, 0);
        dummy.updateMatrix();
        eaveTiles.setMatrixAt(i, dummy.matrix);
      }
      for (let i = 0; i < rafterCount; i++) {
        const x = -fullW / 2 + 0.3 + (i / (rafterCount - 1)) * (fullW - 0.6);
        dummy.position.set(x, eaveY - 0.1, sz * (halfD - overhang * 0.5 - 0.1));
        dummy.rotation.set(sz * angle * 0.6, 0, 0);
        dummy.updateMatrix();
        rafters.setMatrixAt(i, dummy.matrix);
      }
      eaveTiles.instanceMatrix.needsUpdate = true;
      rafters.instanceMatrix.needsUpdate = true;
      eaveTiles.castShadow = true;
      rafters.castShadow = true;
      roof.add(eaveTiles, rafters);
    }

    // Decorative Cylindrical Ridge (Munagawara)
    const ridgeGeo = new THREE.CylinderGeometry(0.18, 0.18, fullW + 0.2, 10);
    const ridgeMesh = new THREE.Mesh(ridgeGeo, MAT.roofRidge);
    ridgeMesh.rotation.z = Math.PI / 2;
    ridgeMesh.position.set(0, ridgeH + 0.08, 0);
    ridgeMesh.castShadow = true;
    roof.add(ridgeMesh);

    // Ridge crest tiles
    roof.add(box(fullW, 0.12, 0.32, MAT.roofTile, 0, ridgeH + 0.18, 0));

    // Gable end cap ornaments (Onigawara)
    for (const sx of [-1, 1]) {
      const oni = new THREE.Group();
      oni.add(box(0.12, 0.42, 0.38, MAT.roofRidge, 0, 0, 0));
      oni.add(box(0.14, 0.18, 0.48, MAT.vermilion, 0, -0.15, 0));
      oni.position.set(sx * (w / 2 + overhang + 0.08), ridgeH + 0.12, 0);
      roof.add(oni);
    }

    // Solid triangular gable wall panels to eliminate any floating roof gap
    for (const sx of [-1, 1]) {
      const gGeo = new THREE.BufferGeometry();
      const gVerts = new Float32Array([
        0, 0, -halfD,
        0, ridgeH, 0,
        0, 0, halfD
      ]);
      gGeo.setAttribute('position', new THREE.BufferAttribute(gVerts, 3));
      gGeo.computeVertexNormals();
      const gable = new THREE.Mesh(gGeo, MAT.plasterWarm);
      gable.material.side = THREE.DoubleSide;
      gable.position.set(sx * (w / 2), 0, 0);
      roof.add(gable);
      // Gable dark timber trim
      roof.add(box(0.1, ridgeH, 0.1, MAT.timberDark, sx * (w / 2 + 0.02), ridgeH / 2, 0));
    }

    return roof;
  }

  createEngawa(w, d, h = 0.38) {
    const engawa = new THREE.Group();
    // Raised wooden deck
    engawa.add(box(w, 0.1, d, MAT.timberEngawa, 0, h - 0.05, 0));
    // Plinth stones supporting veranda
    const cols = Math.max(2, Math.floor(w / 1.6));
    for (let i = 0; i < cols; i++) {
      const px = -w / 2 + 0.3 + (i / (cols - 1)) * (w - 0.6);
      engawa.add(box(0.24, h - 0.1, 0.24, MAT.stonePlinth, px, (h - 0.1) / 2, d / 2 - 0.2));
      engawa.add(box(0.24, h - 0.1, 0.24, MAT.stonePlinth, px, (h - 0.1) / 2, -d / 2 + 0.2));
    }
    // Wooden stepping stone (Kutsunugi-ishi)
    engawa.add(box(0.9, 0.18, 0.5, MAT.stone, 0, 0.09, d / 2 + 0.3));
    return engawa;
  }

  createChochinLantern(x, y, z, parentGroup) {
    const lantern = new THREE.Group();
    // Suspension cord
    lantern.add(box(0.015, 0.35, 0.015, MAT.timberDark, 0, 0.18, 0));
    // Black lacquer top cap
    lantern.add(box(0.22, 0.04, 0.22, MAT.timberDark, 0, 0, 0));
    // Paper lantern body
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 10), MAT.lanternPaper);
    paper.castShadow = true;
    paper.position.y = -0.24;
    lantern.add(paper);
    // Red accent band
    lantern.add(box(0.33, 0.06, 0.33, MAT.vermilion, 0, -0.24, 0));
    // Bottom cap & tassel
    lantern.add(box(0.2, 0.04, 0.2, MAT.timberDark, 0, -0.48, 0));
    lantern.add(box(0.03, 0.15, 0.03, MAT.vermilion, 0, -0.56, 0));

    lantern.position.set(x, y, z);
    parentGroup.add(lantern);
    this.lanterns.push({ group: lantern, baseY: y, phase: this.random() * Math.PI * 2 });
    return lantern;
  }

  createClimbCrates(x, y, z, parentGroup, rotY = 0) {
    const group = new THREE.Group();
    // Bottom step: 2 heavy wooden crates + 1 sake barrel
    const c1 = box(0.9, 0.65, 0.9, MAT.timberMedium, -0.5, 0.325, 0);
    const c2 = box(0.9, 0.65, 0.9, MAT.timberDark, 0.5, 0.325, 0);
    group.add(c1, c2);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.75, 10), MAT.timberMedium);
    barrel.position.set(0.5, 0.375, 0.9);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    group.add(barrel);

    // Mid step: 1 crate atop bottom crate
    const c3 = box(0.85, 0.65, 0.85, MAT.timberLight, -0.45, 0.975, 0);
    group.add(c3);

    // High step crate
    const c4 = box(0.75, 0.65, 0.75, MAT.timberMedium, -0.4, 1.625, -0.3);
    group.add(c4);

    group.position.set(x, y, z);
    group.rotation.y = rotY;
    parentGroup.add(group);

    // Register climb platform boxes for cat jumping.
    // The group lives inside a rotated/translated parent house group, so we
    // resolve the platform Boxes in WORLD space from the mesh itself once it
    // is attached (guaranteed correct regardless of house placement).
    group.updateWorldMatrix(true, true);
    const registerWorldPlat = (mesh, topY, shrink = 0.05) => {
      mesh.updateWorldMatrix(true, false);
      const b = new THREE.Box3().setFromObject(mesh);
      b.min.y = topY - 0.75;
      b.max.y = topY;
      b.expandByScalar(-shrink);
      this.addPlatform(b);
    };
    registerWorldPlat(c1, y + 0.70);
    registerWorldPlat(c2, y + 0.70);
    registerWorldPlat(c3, y + 1.33);
    registerWorldPlat(c4, y + 1.98);
  }

  // --- 1. Merchant Tea House (Chaya) with Rooftop Bird Nest ---
  buildMachiyaTeaHouse(x, z, rotY) {
    const house = new THREE.Group();

    // Ground Floor: 7.6m wide, 5.4m deep, 2.5m high
    const groundFloor = box(7.6, 2.4, 5.4, MAT.plasterWarm, 0, 1.2, 0);
    house.add(groundFloor);
    // Dark timber foundation sill & corner pillars (Hashira)
    house.add(box(7.8, 0.3, 5.6, MAT.timberDark, 0, 0.15, 0));
    house.add(box(7.8, 0.2, 5.6, MAT.timberDark, 0, 2.4, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        house.add(box(0.32, 2.5, 0.32, MAT.timberDark, sx * 3.7, 1.25, sz * 2.6));
      }
    }

    // Front Facade: Lattice sliding panels (Koushi) & Indigo Noren
    const frontLatticeL = this.createKoushi(2.0, 1.7, 9);
    frontLatticeL.position.set(-2.2, 1.3, 2.72);
    const frontLatticeR = this.createKoushi(2.0, 1.7, 9);
    frontLatticeR.position.set(2.2, 1.3, 2.72);
    house.add(frontLatticeL, frontLatticeR);

    // Traditional Tea House Doorway with warm Shoji backing
    house.add(box(1.8, 2.1, 0.08, MAT.shoji, 0, 1.15, 2.71));
    const noren = box(1.9, 0.75, 0.04, MAT.norenIndigo, 0, 2.0, 2.78);
    house.add(noren);

    // Front Chamise Tea Bench with scarlet red felt cushion (Mosen)
    const bench = box(2.2, 0.42, 0.9, MAT.cushionRed, -2.2, 0.21, 3.6);
    house.add(bench);
    house.add(box(2.25, 0.06, 0.95, MAT.timberDark, -2.2, 0.03, 3.6));

    // Mid-level Overhanging Eaves (Hisashi) between floors
    const lowerRoof = box(8.6, 0.16, 6.6, MAT.roofTile, 0, 2.55, 0.2);
    house.add(lowerRoof);
    // Broad, forgiving middle-house ledge. A shallow raised inner lip makes
    // the route readable while the player controller's ledge guard prevents
    // accidental falls unless the cat deliberately jumps down.
    const ledgeFront = box(8.7, 0.18, 1.0, MAT.roofTile, 0, 2.56, 3.05);
    const ledgeBack = box(8.7, 0.18, 1.0, MAT.roofTile, 0, 2.56, -3.05);
    const ledgeLeft = box(1.0, 0.18, 5.2, MAT.roofTile, -3.85, 2.56, 0);
    const ledgeRight = box(1.0, 0.18, 5.2, MAT.roofTile, 3.85, 2.56, 0);
    house.add(ledgeFront, ledgeBack, ledgeLeft, ledgeRight);
    house.add(box(8.0, 0.16, 0.12, MAT.roofRidge, 0, 2.72, 2.62));
    house.add(box(8.0, 0.16, 0.12, MAT.roofRidge, 0, 2.72, -2.62));

    // Upper Floor (2nd story): 6.8m wide, 4.6m deep, 2.0m high
    const upperFloor = box(6.8, 1.9, 4.6, MAT.plaster, 0, 3.5, 0);
    house.add(upperFloor);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        house.add(box(0.28, 2.0, 0.28, MAT.timberDark, sx * 3.3, 3.5, sz * 2.2));
      }
    }
    // Upper fine vertical lattice windows (Mushiko-mado)
    const upperLatticeF = this.createKoushi(3.2, 1.1, 14, MAT.timberDark);
    upperLatticeF.position.set(0, 3.6, 2.32);
    house.add(upperLatticeF);

    // Main Gable/Kawara Upper Roof (Climbable top)
    const mainRoof = this.createKawaraRoof(7.4, 5.2, 1.5, 0.7);
    mainRoof.position.y = 4.4;
    house.add(mainRoof);

    // Tree-side lower kawara lip: visually part of the roof, but low and broad
    // enough for the tutorial jump from the wraparound ledge. From here the cat
    // makes one more short hop onto the real sloped roof surface.
    const tutorialRoofLip = box(3.1, 0.18, 1.0, MAT.roofTile, 1.9, 3.48, 2.72);
    tutorialRoofLip.rotation.z = -0.08;
    house.add(tutorialRoofLip);

    // Suspended Kyoto paper lanterns under front eaves
    this.createChochinLantern(-2.5, 2.4, 3.1, house);
    this.createChochinLantern(2.5, 2.4, 3.1, house);

    // Perched Bird's Nest on roof lower eave / gable corner
    this.buildBirdNest(house, new THREE.Vector3(x, 0, z));

    house.position.set(x, 0, z);
    house.rotation.y = rotY;
    this.scene.add(house);
    this.addOrientedPlatform(house, { minX: -3.5, maxX: -0.9, minZ: 2.8, maxZ: 4.2 }, 0.5);
    this.addOrientedPlatform(house, { minX: -4.35, maxX: 4.35, minZ: 2.55, maxZ: 3.55 }, 2.65);
    this.addOrientedPlatform(house, { minX: -4.35, maxX: 4.35, minZ: -3.55, maxZ: -2.55 }, 2.65);
    this.addOrientedPlatform(house, { minX: -4.35, maxX: -3.35, minZ: -2.65, maxZ: 2.65 }, 2.65);
    this.addOrientedPlatform(house, { minX: 3.35, maxX: 4.35, minZ: -2.65, maxZ: 2.65 }, 2.65);
    this.addOrientedPlatform(house, { minX: 0.35, maxX: 3.45, minZ: 2.2, maxZ: 3.25 }, 3.58);
    this.addSlopedRoofPlatforms(house, 4.4, 7.4, 5.2, 1.5, 0.7);
    // Side climbable crates allowing cat to climb to roof.
    // Must run AFTER the house is placed so platform boxes resolve in world space.
    this.createClimbCrates(4.65, 0, 1.45, house, -Math.PI / 2);
    // Visible walls are the barriers: no extra collision padding outside them.
    this.addBuildingWallColliders(house, 7.6, 5.4, 2.4, 0);
    this.addBuildingWallColliders(house, 6.8, 4.6, 1.9, 2.55);

    this.nestMesh.updateWorldMatrix(true, true);
    this.nestMesh.getWorldPosition(this.nestPos);
  }

  // --- 2. Kyoto Craftsman Machiya with Engawa & Shishi-odoshi ---
  buildMachiyaResidence(x, z, rotY) {
    const house = new THREE.Group();

    // Ground Floor: 8.0m wide, 5.0m deep
    const groundFloor = box(8.0, 2.4, 5.0, MAT.plasterWarm, 0, 1.2, 0);
    house.add(groundFloor);
    house.add(box(8.2, 0.3, 5.2, MAT.timberDark, 0, 0.15, 0));
    house.add(box(8.2, 0.2, 5.2, MAT.timberDark, 0, 2.4, 0));

    // Corner and mid Hashira posts
    for (const sx of [-1, 0, 1]) {
      for (const sz of [-1, 1]) {
        house.add(box(0.28, 2.5, 0.28, MAT.timberDark, sx * 3.8, 1.25, sz * 2.4));
      }
    }

    // Front Sliding Shoji Lattice Doors
    house.add(box(2.4, 1.8, 0.08, MAT.shoji, -1.8, 1.2, 2.52));
    const koushiL = this.createKoushi(2.4, 1.8, 11);
    koushiL.position.set(-1.8, 1.2, 2.54);
    house.add(koushiL);

    house.add(box(2.4, 1.8, 0.08, MAT.shoji, 1.8, 1.2, 2.52));
    const koushiR = this.createKoushi(2.4, 1.8, 11);
    koushiR.position.set(1.8, 1.2, 2.54);
    house.add(koushiR);

    // Front Engawa Veranda wrapping the garden side
    const frontEngawa = this.createEngawa(8.2, 1.4, 0.42);
    frontEngawa.position.set(0, 0, 3.1);
    house.add(frontEngawa);
    this.addPlatform(new THREE.Box3(
      new THREE.Vector3(x - 4.4, 0, z + 2.2),
      new THREE.Vector3(x + 4.4, 0.55, z + 4.0)
    ));

    // Upper Floor
    const upperFloor = box(7.0, 1.8, 4.2, MAT.plaster, 0, 3.3, 0);
    house.add(upperFloor);
    const upperLattice = this.createKoushi(4.0, 1.0, 16);
    upperLattice.position.set(0, 3.4, 2.12);
    house.add(upperLattice);

    // Lower eave & Main Roof
    const lowerRoof = box(9.0, 0.16, 6.2, MAT.roofTile, 0, 2.45, 0.2);
    house.add(lowerRoof);

    const mainRoof = this.createKawaraRoof(7.6, 4.8, 1.4, 0.7);
    mainRoof.position.y = 4.2;
    house.add(mainRoof);

    // Chochin lantern
    this.createChochinLantern(0, 2.3, 2.9, house);

    // Interactive Shishi-odoshi (Bamboo clacker water fountain) in front garden
    this.buildShishiOdoshi(2.8, 0, 4.4, house);

    house.position.set(x, 0, z);
    house.rotation.y = rotY;
    this.scene.add(house);
    this.addOrientedPlatform(house, { minX: -4.5, maxX: 4.5, minZ: -3.1, maxZ: 3.3 }, 2.53);
    this.addSlopedRoofPlatforms(house, 4.2, 7.6, 4.8, 1.4, 0.7);
    // Side climbing crates — placed AFTER scene attach so platform boxes
    // resolve in world space (rotated parent house group).
    this.createClimbCrates(-5.6, 0, 0, house, Math.PI / 2);
    this.addBuildingWallColliders(house, 8.0, 5.0, 2.4, 0);
    this.addBuildingWallColliders(house, 7.0, 4.2, 1.8, 2.4);
  }

  // --- 3. Secret Locked Kyoto Machiya (Hisomu-an) with Interior ---
  buildSecretMachiya(x, z, rotY) {
    const house = new THREE.Group();

    // Outer Shell with open front entrance
    // Left Wall
    const wallL = box(0.3, 2.6, 5.2, MAT.timberDark, -3.8, 1.3, 0);
    // Right Wall
    const wallR = box(0.3, 2.6, 5.2, MAT.timberDark, 3.8, 1.3, 0);
    // Back Wall
    const wallB = box(7.8, 2.6, 0.3, MAT.plasterWarm, 0, 1.3, -2.5);
    // Front Wall Left & Right wings (leaves a 2.4m doorway in middle)
    const wallFL = box(2.7, 2.6, 0.3, MAT.plasterWarm, -2.55, 1.3, 2.5);
    const wallFR = box(2.7, 2.6, 0.3, MAT.plasterWarm, 2.55, 1.3, 2.5);
    house.add(wallL, wallR, wallB, wallFL, wallFR);

    // --- INTERIOR DESIGN (Ghibli Cozy Tatami Room) ---
    // 1. Tatami Mat Floor (6-mat pattern)
    const tatamiFloor = new THREE.Group();
    const matW = 1.15, matL = 2.3, matH = 0.08;
    const matPositions = [
      [-1.15, 0.04, -1.15, false], [1.15, 0.04, -1.15, false],
      [-1.15, 0.04, 1.15, false], [1.15, 0.04, 1.15, false],
      [-2.3, 0.04, 0, true], [2.3, 0.04, 0, true]
    ];
    for (const [mx, my, mz, rotated] of matPositions) {
      const w = rotated ? matL : matW;
      const d = rotated ? matW : matL;
      const matMesh = box(w - 0.04, matH, d - 0.04, MAT.tatami, mx, my, mz);
      const borderMesh = box(w, matH * 0.8, d, MAT.tatamiBorder, mx, my - 0.01, mz);
      tatamiFloor.add(matMesh, borderMesh);
    }
    house.add(tatamiFloor);

    // 2. Low Table (Kotatsu / Chabudai) with ceramic tea set & Grilled Fish Cat Treat
    const table = new THREE.Group();
    table.add(box(1.5, 0.08, 1.1, MAT.timberEngawa, 0, 0.42, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        table.add(box(0.1, 0.38, 0.1, MAT.timberDark, sx * 0.65, 0.19, sz * 0.45));
      }
    }
    // Teapot & Cup
    const teapot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.14, 8), MAT.stoneDark);
    teapot.position.set(-0.35, 0.53, -0.2);
    table.add(teapot);
    const teacup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.06, 8), MAT.plaster);
    teacup.position.set(-0.18, 0.49, -0.2);
    table.add(teacup);

    // Golden Grilled Sea Bream (Fish Snack - interactive food)
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.025, 12), MAT.plasterWarm);
    plate.position.set(0.2, 0.47, 0.1);
    table.add(plate);

    const fish = new THREE.Group();
    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), MAT.grilledFish);
    fishBody.scale.set(1.4, 0.45, 0.55);
    fish.add(fishBody);
    const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), MAT.grilledFish);
    fishTail.rotation.z = Math.PI / 2;
    fishTail.position.x = -0.2;
    fish.add(fishTail);
    fish.position.set(0.2, 0.52, 0.1);
    table.add(fish);
    this.fishMesh = fish;

    table.position.set(0, 0, -0.4);
    house.add(table);
    this.addPlatform(new THREE.Box3(
      new THREE.Vector3(x - 1.0, 0, z - 1.2),
      new THREE.Vector3(x + 1.0, 0.55, z + 0.4)
    ));

    // 3. Cozy Velvet Cat Bed (Zabuton Nap Spot)
    const cushion = box(0.75, 0.14, 0.75, MAT.cushionRed, -1.8, 0.07, -0.8);
    cushion.castShadow = true;
    house.add(cushion);
    // Gold embroidery tassels
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cushion.add(box(0.05, 0.03, 0.05, MAT.goldAntique, sx * 0.35, 0, sz * 0.35));
      }
    }

    // 4. Traditional Wall Hanging Scroll (Kakejiku) with cat motif
    const scroll = box(1.0, 1.8, 0.04, MAT.norenHemp, 0, 1.5, -2.32);
    const scrollArt = box(0.65, 1.1, 0.05, MAT.timberDark, 0, 1.5, -2.31);
    const scrollRoller = box(1.15, 0.06, 0.06, MAT.timberDark, 0, 0.58, -2.3);
    house.add(scroll, scrollArt, scrollRoller);

    // 5. Paper Andon Floor Lantern (glowing warm interior lamp)
    const andon = new THREE.Group();
    andon.add(box(0.4, 0.05, 0.4, MAT.timberDark, 0, 0.025, 0));
    andon.add(box(0.32, 0.65, 0.32, MAT.lanternPaper, 0, 0.35, 0));
    andon.add(box(0.38, 0.04, 0.38, MAT.timberDark, 0, 0.7, 0));
    andon.position.set(2.4, 0, -1.6);
    house.add(andon);

    // 6. Antique Chest (Tansu)
    const tansu = box(1.3, 1.1, 0.65, MAT.timberDark, 2.6, 0.55, 0.6);
    house.add(tansu);

    // --- FRONT SLIDING DOOR & ANTIQUE LOCK ---
    const doorFrame = box(2.6, 2.2, 0.15, MAT.timberDark, 0, 1.1, 2.5);
    house.add(doorFrame);

    const slidingDoor = new THREE.Group();
    slidingDoor.add(box(2.35, 2.05, 0.08, MAT.shoji, 0, 1.05, 0));
    const doorLattice = this.createKoushi(2.35, 2.05, 11);
    doorLattice.position.z = 0.05;
    slidingDoor.add(doorLattice);

    // Antique Brass Padlock Emblem on the door handle
    this.lockPlate = new THREE.Group();
    this.lockPlate.add(box(0.24, 0.3, 0.06, MAT.goldAntique, 0, 1.05, 0.1));
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 12, Math.PI), MAT.goldAntique);
    shackle.position.set(0, 1.2, 0.1);
    this.lockPlate.add(shackle);
    slidingDoor.add(this.lockPlate);

    slidingDoor.position.set(0, 0, 2.52);
    house.add(slidingDoor);
    this.secretDoorMesh = slidingDoor;

    // Roof & Eaves
    const mainRoof = this.createKawaraRoof(7.6, 4.8, 1.4, 0.7);
    mainRoof.position.y = 2.45;
    house.add(mainRoof);

    // Front Hanging Chochin Lanterns
    this.createChochinLantern(-1.8, 2.45, 3.1, house);
    this.createChochinLantern(1.8, 2.45, 3.1, house);

    // Noren above doorway
    const secretNoren = box(2.4, 0.55, 0.04, MAT.norenCrimson, 0, 2.2, 2.65);
    house.add(secretNoren);

    house.position.set(x, 0, z);
    house.rotation.y = rotY;
    this.scene.add(house);
    this.addSlopedRoofPlatforms(house, 2.45, 7.6, 4.8, 1.4, 0.7);

    // Outer colliders (leaves doorway passable when opened)
    this.addCollider(wallL, 0);
    this.addCollider(wallR, 0);
    this.addCollider(wallB, 0);
    this.addCollider(wallFL, 0);
    this.addCollider(wallFR, 0);
    this.addCollider(table, 0);
    this.addCollider(tansu, 0);

    // Door collider — computed from actual world-space mesh bounds after
    // house rotation so the solid wall is correctly positioned.
    this.addCollider(slidingDoor, 0);
    this.doorCollider = this.colliders[this.colliders.length - 1];

    // Store actual door world position and outward spawn point for the
    // shoji transition (context_actions + InteriorManager use these).
    const doorWorld = new THREE.Vector3();
    slidingDoor.getWorldPosition(doorWorld);
    this.secretDoorWorldPos = doorWorld.clone();
    const outDir = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
    this.secretDoorSpawnPos = doorWorld.clone().addScaledVector(outDir, 2.5);
    this.secretDoorOutHeading = Math.atan2(outDir.x, outDir.z);
  }

  // --- 4. Interactive Bird Nest on Machiya Rooftop ---
  buildBirdNest(houseGroup, worldPos) {
    const nestGroup = new THREE.Group();

    // Twig nest bowl
    const nestBowl = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 8, 16), MAT.nestTwig);
    nestBowl.rotation.x = Math.PI / 2;
    nestGroup.add(nestBowl);

    const nestBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.08, 10), MAT.nestTwig);
    nestBottom.position.y = -0.05;
    nestGroup.add(nestBottom);

    // 3 Speckled blue bird eggs
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), MAT.birdEgg);
      egg.scale.set(1, 1.35, 1);
      egg.position.set(Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14);
      egg.rotation.z = (Math.random() - 0.5) * 0.4;
      nestGroup.add(egg);
    }

    // Glowing Golden "Guardian's Feather" Trophy in the nest
    const feather = new THREE.Group();
    const featherQuill = box(0.015, 0.35, 0.01, MAT.featherGold, 0, 0, 0);
    const featherVane = box(0.12, 0.26, 0.01, MAT.featherGold, 0, 0.04, 0);
    feather.add(featherQuill, featherVane);
    feather.rotation.z = 0.4;
    feather.rotation.x = 0.3;
    feather.position.set(0, 0.12, 0);
    nestGroup.add(feather);
    this.nestFeatherMesh = feather;

    // Tree-facing roof edge: visible from the wraparound ledge and reachable
    // with one friendly jump from the eave onto the actual sloped tiles.
    nestGroup.position.set(0.15, 4.9, 2.72);
    houseGroup.add(nestGroup);
    this.nestMesh = nestGroup;
  }

  // --- 5. Antique Golden Key Collectible ---
  buildSecretKey(x, y, z) {
    const keyGroup = new THREE.Group();

    // Antique Japanese Key (Key ring, stem, bit teeth)
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 16), MAT.goldAntique);
    bow.position.y = 0.28;
    keyGroup.add(bow);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), MAT.goldAntique);
    stem.position.y = 0.08;
    keyGroup.add(stem);

    // Key bits / wards
    keyGroup.add(box(0.12, 0.05, 0.03, MAT.goldAntique, 0.06, -0.06, 0));
    keyGroup.add(box(0.09, 0.05, 0.03, MAT.goldAntique, 0.05, 0.02, 0));

    // Sparkling Aura halo
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.38, 16), haloMat);
    keyGroup.add(halo);

    keyGroup.position.set(x, y, z);
    keyGroup.userData = { isSecretKey: true, id: 999 };
    this.scene.add(keyGroup);
    this.secretKeyMesh = keyGroup;
    this.secretKeyPos = new THREE.Vector3(x, y, z);
  }

  buildKeyHidingRock(x, z) {
    const rockGroup = new THREE.Group();
    const rockGeo = new THREE.DodecahedronGeometry(0.78, 1);
    const mainRock = new THREE.Mesh(rockGeo, MAT.stoneDark);
    mainRock.scale.set(1.35, 1.0, 0.9);
    mainRock.rotation.set(0.12, 0.38, -0.08);
    mainRock.position.set(0, 0.58, 0);
    rockGroup.add(mainRock);

    // Small companion stones ground the cover rock and make the hiding place
    // read as a deliberate field-side rock cluster rather than a lone prop.
    for (const [ox, oz, s] of [[-0.68, 0.28, 0.3], [0.55, 0.35, 0.24]]) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), MAT.stone);
      stone.position.set(ox, s * 0.55, oz);
      stone.rotation.set(0.18, this.random() * Math.PI, 0.1);
      rockGroup.add(stone);
    }

    rockGroup.position.set(x, 0, z);
    rockGroup.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    this.scene.add(rockGroup);
    rockGroup.updateMatrixWorld(true);
    this.addCollider(mainRock, 0.08);
  }

  // --- 6. Interactive Shishi-Odoshi (Bamboo Clacker) ---
  buildShishiOdoshi(x, y, z, parentGroup) {
    const shishi = new THREE.Group();

    // Stone Water Basin (Tsukubai)
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.45, 10), MAT.stoneDark);
    basin.position.set(0, 0.225, 0);
    shishi.add(basin);
    // Basin water surface
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), MAT.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.42, 0);
    shishi.add(water);

    // Bamboo feeder spout
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), MAT.bambooGreen);
    spout.rotation.z = -0.5;
    spout.position.set(-0.35, 0.65, 0);
    shishi.add(spout);

    // Rocker pivot support posts
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 6), MAT.timberDark);
      post.position.set(0.15, 0.3, sz * 0.16);
      shishi.add(post);
    }

    // Animated Rocker Tube
    const rocker = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.65, 8), MAT.bambooGreen);
    tube.rotation.z = Math.PI / 2;
    rocker.add(tube);
    rocker.position.set(0.15, 0.48, 0);
    shishi.add(rocker);
    this.shishiRocker = rocker;

    shishi.position.set(x, y, z);
    parentGroup.add(shishi);
  }

  unlockSecretHouse() {
    this.isSecretHouseUnlocked = true;
    if (this.lockPlate) this.lockPlate.visible = false;
    // NOTE: the sliding-door collider intentionally REMAINS in place —
    // the physical doorway is a solid wall; entering the tea house happens
    // through the automatic shoji screen transition instead.
  }

  eatFish() {
    this.fishEaten = true;
    if (this.fishMesh) this.fishMesh.visible = false;
  }

  // --- Lush Edo Village Street: rows of townhouses flanking the road ---
  buildVillageStreet() {
    const spots = [
      { x: -5.8, z: 27, r: Math.PI / 2 + 0.06 },
      { x: 5.9, z: 23, r: -Math.PI / 2 - 0.08 },
      { x: -6.1, z: 12, r: Math.PI / 2 + 0.15 },
      { x: 6.0, z: 8, r: -Math.PI / 2 - 0.1 },
      { x: -5.7, z: -3, r: Math.PI / 2 - 0.12 },
      { x: 6.2, z: -7, r: -Math.PI / 2 + 0.05 },
      { x: -6.0, z: -14, r: Math.PI / 2 + 0.1 },
      { x: 5.8, z: -19, r: -Math.PI / 2 + 0.14 }
    ];
    for (const s of spots) this.buildVillageHouse(s.x, s.z, s.r, s.x < 0 ? 'left' : 'right');
  }

  buildVillageHouse(x, z, rot, side = null) {
    const house = new THREE.Group();
    const wallMat = this.random() > 0.5 ? MAT.plasterWarm : MAT.plaster;
    const w = 4.4 + this.random() * 1.2;   // width along street
    const d = 3.2 + this.random() * 0.6;   // depth

    // Base volume + dark sill
    const base = box(w, 2.1, d, wallMat, 0, 1.05, 0);
    house.add(base);
    house.add(box(w + 0.2, 0.26, d + 0.2, MAT.timberDark, 0, 0.13, 0));

    // Corner posts
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        house.add(box(0.24, 2.15, 0.24, MAT.timberDark, sx * (w / 2 - 0.1), 1.1, sz * (d / 2 - 0.1)));
      }
    }

    // Street-facing facade: shoji panel + koushi lattice + tiny noren
    house.add(box(1.5, 1.6, 0.07, MAT.shojiOff, 0, 1.05, d / 2 + 0.03));
    const lattice = this.createKoushi(1.7, 1.7, 8);
    lattice.position.set(0, 1.1, d / 2 + 0.07);
    house.add(lattice);
    const norenMats = [MAT.norenIndigo, MAT.norenCrimson, MAT.norenHemp];
    const noren = box(1.6, 0.45, 0.04, norenMats[(this.random() * norenMats.length) | 0], 0, 1.85, d / 2 + 0.09);
    house.add(noren);

    // Low front engawa step
    house.add(box(w * 0.8, 0.16, 0.7, MAT.timberEngawa, 0, 0.08, d / 2 + 0.35));

    // Tiled roof with gentle ridge
    const roof = this.createKawaraRoof(w + 0.6, d + 0.4, 0.95, 0.5);
    roof.position.y = 2.1;
    house.add(roof);

    // Warm chochin lantern beside the door
    if (this.random() > 0.4) this.createChochinLantern(w * 0.32, 2.0, d / 2 + 0.3, house);

    house.position.set(x, 0, z);
    house.rotation.y = rot;
    this.scene.add(house);
    const houseCollider = this.addBuildingWallColliders(house, w, d, 2.1, 0);
    if (side && this.villageHouseColliders[side]) this.villageHouseColliders[side].push(houseCollider);

    // Village rooftop parkour: eave-edge ring then the ridge line. The cat
    // reaches these by hopping up from a nearby tōrō lantern cap or gliding
    // across from another rooftop — real cat exploration routes.
    this.addSlopedRoofPlatforms(house, 2.1, w + 0.6, d + 0.4, 0.95, 0.5);
  }

  // --- Street greenery: bushes, moss, bamboo fences & tōrō stone lanterns ---
  buildStreetGreenery() {
    const bushTints = [0x46702f, 0x54803a, 0x628f44, 0x3d6529];
    const bushGeo = lumpyTuftGeometry(2, 9, 0.32);
    const dummy = new THREE.Object3D();
    const count = 90;
    // Street bushes rustle when the cat brushes through them (foliage shader
    // reacts to the shared player position uniform)
    const swayMat = createFoliageMaterial({ sss: 0.3, wind: 0.9, rustle: 1.0, mottle: 0.28, vertexColors: false });
    const bushes = new THREE.InstancedMesh(bushGeo, swayMat, count);
    this.bushMat = swayMat;
    this.bushColliderSpots = [];
    let bi = 0;
    for (let z = 30; z > -27 && bi < count; z -= 3.2) {
      for (const side of [-1, 1]) {
        if (this.random() < 0.28 || bi >= count) continue;
        const x = side * (2.6 + this.random() * 1.3);
        const s = 0.35 + this.random() * 0.55;
        dummy.position.set(x, s * 0.5, z + (this.random() - 0.5) * 1.6);
        dummy.scale.set(s * (1 + this.random() * 0.5), s * 0.75, s * (1 + this.random() * 0.5));
        dummy.rotation.y = this.random() * Math.PI;
        dummy.updateMatrix();
        bushes.setMatrixAt(bi++, dummy.matrix);
        this.bushColliderSpots.push([x, z, s]);
      }
    }
    for (const [bx_, bz_, bs_] of this.bushColliderSpots) {
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(bx_ - bs_ * 0.55, 0, bz_ - bs_ * 0.55),
        new THREE.Vector3(bx_ + bs_ * 0.55, Math.max(0.8, bs_), bz_ + bs_ * 0.55)
      ));
    }
    bushes.count = bi;
    bushes.instanceMatrix.needsUpdate = true;
    // Random per-bush tint via instance colors
    const col = new THREE.Color();
    for (let i = 0; i < bi; i++) {
      bushes.setColorAt(i, col.setHex(bushTints[(this.random() * bushTints.length) | 0]).offsetHSL(0, 0, (this.random() - 0.5) * 0.06));
    }
    if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
    bushes.castShadow = true;
    bushes.receiveShadow = true;
    this.scene.add(bushes);

    // Moss / grass patches hugging the road edges
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x48682f, roughness: 1 });
    const mossGeo = new THREE.CircleGeometry(1, 8);
    const moss = new THREE.InstancedMesh(mossGeo, mossMat, 70);
    let mi = 0;
    for (let z = 32; z > -29 && mi < 70; z -= 2.6) {
      for (const side of [-1, 1]) {
        if (this.random() < 0.3 || mi >= 70) continue;
        dummy.position.set(side * (1.9 + this.random() * 0.7), 0.045, z + (this.random() - 0.5) * 1.2);
        dummy.scale.set(0.4 + this.random() * 0.7, 1, 0.3 + this.random() * 0.6);
        dummy.rotation.set(-Math.PI / 2, 0, this.random() * Math.PI);
        dummy.updateMatrix();
        moss.setMatrixAt(mi++, dummy.matrix);
      }
    }
    moss.count = mi;
    moss.instanceMatrix.needsUpdate = true;
    moss.receiveShadow = true;
    this.scene.add(moss);

    // Continuous takegaki runs bridge the exact world-space gaps between
    // neighboring townhouses. Each fence overlaps both building colliders so
    // there is no side seam the cat can walk through.
    for (const sideName of ['left', 'right']) {
      const houses = [...this.villageHouseColliders[sideName]].sort((a, b) => b.max.z - a.max.z);
      for (let i = 0; i < houses.length - 1; i++) {
        const northHouse = houses[i];
        const southHouse = houses[i + 1];
        const northEnd = northHouse.min.z;
        const southEnd = southHouse.max.z;
        const gap = northEnd - southEnd;
        if (gap <= 0) continue;
        const overlap = 0.45;
        const length = gap + overlap * 2;
        const z = (northEnd + southEnd) / 2;
        const sharedMinX = Math.max(northHouse.min.x, southHouse.min.x);
        const sharedMaxX = Math.min(northHouse.max.x, southHouse.max.x);
        if (sharedMinX >= sharedMaxX) continue;
        // Choose the street-facing edge of the houses' shared X footprint, so
        // the fence physically enters both building colliders at its ends.
        const x = sideName === 'left' ? sharedMaxX - 0.12 : sharedMinX + 0.12;
        this.buildBambooFence(x, z, Math.PI / 2, {
          length,
          rotationJitter: false,
          role: 'village-gap',
          connects: [northHouse, southHouse]
        });
      }
    }

    // Tōrō stone lanterns spaced along the street
    const toroZ = [22, 14, 4, -2, -11, -21];
    toroZ.forEach((z, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      this.buildToroLantern(side * 2.5, z);
    });
  }

  buildBambooFence(x, z, rot, options = {}) {
    const fence = new THREE.Group();
    const len = options.length || (2.6 + this.random() * 1.6);
    const fenceHeight = options.height || 1.35;
    const rotationJitter = options.rotationJitter === false ? 0 : (this.random() - 0.5) * 0.2;
    for (const ry of [0.32, 0.82]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 6), MAT.bambooGreen);
      rail.rotation.z = Math.PI / 2;
      rail.position.y = ry;
      fence.add(rail);
    }
    const n = Math.floor(len / 0.16);
    for (let i = 0; i <= n; i++) {
      const sx = -len / 2 + i * (len / n);
      const slat = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, fenceHeight, 5), MAT.timberMedium);
      slat.position.set(sx, fenceHeight / 2, 0);
      slat.rotation.x = (this.random() - 0.5) * 0.06;
      fence.add(slat);
    }
    fence.position.set(x, 0, z);
    fence.rotation.y = rot + rotationJitter;
    fence.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(fence);
    // A continuous, slightly thick barrier prevents tunnelling through the
    // visual gaps while remaining short enough for the boosted jump to clear.
    fence.updateWorldMatrix(true, true);
    const collider = new THREE.Box3().setFromObject(fence);
    collider.min.y = 0;
    // The standard jump apex cannot clear this barrier, while Luna's rank-2
    // jump boost can. This restores fences as real progression gates.
    collider.max.y = options.colliderHeight || 1.4;
    collider.expandByVector(new THREE.Vector3(0.08, 0, 0.12));
    this.colliders.push(collider);
    this.addOrientedPlatform(fence, {
      minX: -len / 2 - 0.08,
      maxX: len / 2 + 0.08,
      minZ: -0.18,
      maxZ: 0.18
    }, collider.max.y + 0.05, { requiredAbility: 'fenceWalk' });
    this.bambooFences.push({ mesh: fence, collider, role: options.role || 'decorative', connects: options.connects || [] });
    return fence;
  }

  buildBambooCorral(x, z) {
    const width = 7.2;
    const depth = 6.2;
    this.vegetationExclusions.push({ x, z, width: width + 2, depth: depth + 2 });

    this.buildBambooFence(x, z - depth / 2, 0, { length: width, rotationJitter: false });
    this.buildBambooFence(x, z + depth / 2, 0, { length: width, rotationJitter: false });
    this.buildBambooFence(x - width / 2, z, Math.PI / 2, { length: depth, rotationJitter: false });
    this.buildBambooFence(x + width / 2, z, Math.PI / 2, { length: depth, rotationJitter: false });

    const marker = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.7, 7), MAT.timberDark);
    post.position.y = 0.85;
    const board = box(1.65, 0.4, 0.1, MAT.timberLight, 0, 1.3, 0);
    marker.add(post, board);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 160;
    const signCtx = signCanvas.getContext('2d');
    signCtx.fillStyle = '#e7d0a4';
    signCtx.fillRect(0, 0, signCanvas.width, signCanvas.height);
    signCtx.strokeStyle = '#5a311d';
    signCtx.lineWidth = 12;
    signCtx.strokeRect(6, 6, signCanvas.width - 12, signCanvas.height - 12);
    signCtx.fillStyle = '#7b2018';
    signCtx.font = 'bold 52px sans-serif';
    signCtx.textAlign = 'center';
    signCtx.textBaseline = 'middle';
    signCtx.fillText('警告・凶暴な亀', signCanvas.width / 2, signCanvas.height / 2);
    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.colorSpace = THREE.SRGBColorSpace;
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.34),
      new THREE.MeshBasicMaterial({ map: signTexture, transparent: true })
    );
    signFace.position.set(0, 1.3, -0.056);
    signFace.rotation.y = Math.PI;
    marker.add(signFace);
    marker.position.set(x, 0, z - depth / 2 - 0.35);
    marker.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(marker);

    const rewardMat = new THREE.MeshStandardMaterial({
      color: 0x76c7a1,
      emissive: 0x245c48,
      emissiveIntensity: 0.75,
      metalness: 0.45,
      roughness: 0.3
    });
    const reward = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 1), rewardMat);
    reward.position.set(x, 0.42, z);
    reward.castShadow = true;
    reward.userData.id = 91;
    reward.userData.isCollectible = true;
    reward.userData.isCorralReward = true;
    reward.userData.velocity = new THREE.Vector3();
    reward.userData.batted = false;
    reward.visible = false;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 6, 18), MAT.goldAntique);
    ring.rotation.x = Math.PI / 2;
    reward.add(ring);
    this.scene.add(reward);
    this.collectibles.push(reward);
    this.corralRewardMesh = reward;

    const turtle = new THREE.Group();
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x5f7e42, roughness: 0.78, flatShading: true });
    const shellLight = new THREE.MeshStandardMaterial({ color: 0x8da85c, roughness: 0.82, flatShading: true });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x9aaa68, roughness: 0.9, flatShading: true });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 7), shellMat);
    shell.scale.set(1.15, 0.48, 0.9);
    shell.position.y = 0.32;
    turtle.add(shell);
    const shellPatch = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), shellLight);
    shellPatch.scale.set(1.15, 0.35, 0.86);
    shellPatch.position.y = 0.5;
    turtle.add(shellPatch);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), skinMat);
    head.position.set(0, 0.25, 0.58);
    turtle.add(head);
    for (const [lx, lz] of [[-0.42, -0.35], [0.42, -0.35], [-0.42, 0.34], [0.42, 0.34]]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), skinMat);
      foot.scale.set(1.25, 0.45, 0.75);
      foot.position.set(lx, 0.1, lz);
      turtle.add(foot);
    }
    turtle.position.set(x, 0, z);
    turtle.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(turtle);
    this.corralGuardian = {
      name: 'Larry',
      mesh: turtle,
      home: new THREE.Vector3(x, 0, z),
      // Keep enough clearance that a full contact push cannot place the cat
      // inside or through a fence at the edge of the chase area.
      bounds: { minX: x - width / 2 + 1.35, maxX: x + width / 2 - 1.35, minZ: z - depth / 2 + 1.35, maxZ: z + depth / 2 - 1.35 },
      alerted: false,
      hasBeenAlerted: false,
      alertTimer: 0,
      speed: 1.05,
      radius: 0.72
    };
  }

  updateCorralGuardian(dt, player, challengeActive = false) {
    const guardian = this.corralGuardian;
    if (!guardian || !player) return null;
    const turtlePos = guardian.mesh.position;
    const playerPos = player.mesh.position;
    const dx = playerPos.x - turtlePos.x;
    const dz = playerPos.z - turtlePos.z;
    const dist = Math.hypot(dx, dz);
    const collisionDistance = guardian.radius + 0.42;
    let event = null;
    let justAlerted = false;

    if (challengeActive && !this.corralRewardCollected && playerPos.y < 0.62 && dist < collisionDistance) {
      if (!guardian.alerted) event = 'alerted';
      guardian.alerted = true;
      guardian.hasBeenAlerted = true;
      guardian.alertTimer = 12;
      justAlerted = true;
      const nx = dist > 0.001 ? dx / dist : 1;
      const nz = dist > 0.001 ? dz / dist : 0;
      playerPos.x = turtlePos.x + nx * collisionDistance;
      playerPos.z = turtlePos.z + nz * collisionDistance;
    }

    let target = guardian.home;
    let speed = 0.5;
    if (guardian.alerted && challengeActive && !this.corralRewardCollected) {
      guardian.alertTimer -= dt;
      target = playerPos;
      speed = guardian.speed;
      if (guardian.alertTimer <= 0) guardian.alerted = false;
    } else if (this.corralRewardCollected) {
      // Larry remains alive and active after the challenge, calmly patrolling
      // the corral rather than disappearing or freezing at his home point.
      const wanderAngle = this.time * 0.24;
      target = new THREE.Vector3(
        guardian.home.x + Math.cos(wanderAngle) * 1.25,
        0,
        guardian.home.z + Math.sin(wanderAngle * 0.83) * 1.0
      );
      speed = 0.42;
    }

    const tx = target.x - turtlePos.x;
    const tz = target.z - turtlePos.z;
    const targetDistance = Math.hypot(tx, tz);
    const moving = !justAlerted && targetDistance > 0.08;
    if (moving) {
      const step = Math.min(targetDistance, speed * dt);
      turtlePos.x = THREE.MathUtils.clamp(turtlePos.x + tx / targetDistance * step, guardian.bounds.minX, guardian.bounds.maxX);
      turtlePos.z = THREE.MathUtils.clamp(turtlePos.z + tz / targetDistance * step, guardian.bounds.minZ, guardian.bounds.maxZ);
      guardian.mesh.rotation.y = Math.atan2(tx, tz);
    }
    // Larry always breathes and shifts his weight, including after the Jade
    // Paw is collected and while briefly pausing at a patrol turnaround.
    guardian.mesh.position.y = Math.sin(this.time * (moving ? 10 : 3.5)) * (moving ? 0.018 : 0.01);
    guardian.mesh.rotation.z = Math.sin(this.time * 2.2) * 0.012;
    return event;
  }

  setCorralRewardCollected(collected) {
    this.corralRewardCollected = !!collected;
    if (this.corralRewardMesh) this.corralRewardMesh.visible = this.corralChallengeActive && !this.corralRewardCollected;
    if (this.corralGuardian) {
      this.corralGuardian.alerted = false;
      this.corralGuardian.alertTimer = 0;
    }
  }

  setCorralChallengeActive(active, exteriorVisible = true) {
    this.corralChallengeActive = !!active;
    if (this.corralRewardMesh) {
      this.corralRewardMesh.visible = this.corralChallengeActive && exteriorVisible && !this.corralRewardCollected;
    }
  }

  buildToroLantern(x, z) {
    const t = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.18, 8), MAT.stoneDark);
    base.position.y = 0.09;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.62, 7), MAT.stone);
    post.position.y = 0.49;
    const box_ = box(0.34, 0.3, 0.34, MAT.stone, 0, 0.95, 0);
    // Warm glowing light window
    const win = box(0.36, 0.16, 0.36, MAT.lanternGlow, 0, 0.95, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.22, 8), MAT.stoneDark);
    cap.position.y = 1.2;
    t.add(base, post, box_, win, cap);
    // Soft halo sprite so the lantern flame blooms warmly at dusk
    if (this.lanternHaloTex) {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.lanternHaloTex, color: 0xffc878, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      halo.position.y = 0.95;
      halo.scale.set(1.4, 1.4, 1);
      t.add(halo);
      this.lanternHalos.push(halo.material);
    }
    t.position.set(x, 0, z);
    t.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(t);
    if (!this.toroSpots) this.toroSpots = [];
    this.toroSpots.push(new THREE.Vector3(x, 0.95, z));
    // Perchable lantern cap — first hop of the street rooftop parkour route
    this.addPlatform(new THREE.Box3(
      new THREE.Vector3(x - 0.34, 0.8, z - 0.34),
      new THREE.Vector3(x + 0.34, 1.31, z + 0.34)
    ));
  }

  buildTorii(x, z) {
    const torii = new THREE.Group();
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.6, 10);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeo, MAT.vermilion);
      p.position.set(s * 1.8, 2.3, 0);
      p.castShadow = true;
      torii.add(p);
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(x + s * 1.8 - 0.3, 0, z - 0.3),
        new THREE.Vector3(x + s * 1.8 + 0.3, 4.6, z + 0.3)
      ));
    }
    const midLintel = box(5.6, 0.32, 0.4, MAT.vermilion, 0, 4.75, 0);
    torii.add(midLintel);
    const topLintel = box(6.2, 0.28, 0.5, MAT.vermilion, 0, 5.15, 0);
    torii.add(topLintel);
    torii.add(box(0.9, 0.3, 0.3, MAT.vermilion, 0, 4.45, 0));
    torii.add(box(6.3, 0.1, 0.52, MAT.stoneDark, 0, 5.34, 0));

    torii.position.set(x, 0, z);
    this.scene.add(torii);
    // Discreet shrine joinery blocks form a late-game climbing route. They are
    // physical supports only at City Legend rank, after every jump upgrade.
    for (const [sx, sy] of [[-1.8, 1.35], [-1.8, 2.55], [1.8, 3.65]]) {
      const peg = box(0.72, 0.16, 0.72, MAT.vermilion, sx, sy, 0);
      torii.add(peg);
      this.addOrientedPlatform(torii, {
        minX: sx - 0.36, maxX: sx + 0.36, minZ: -0.36, maxZ: 0.36
      }, sy + 0.08, { requiredRank: 4 });
    }
    this.addOrientedPlatform(torii, { minX: -2.8, maxX: 2.8, minZ: -0.24, maxZ: 0.24 }, 4.91, { requiredRank: 4 });
    this.addOrientedPlatform(torii, { minX: -3.1, maxX: 3.1, minZ: -0.28, maxZ: 0.28 }, 5.29, { requiredRank: 4 });
    this.toriiTopPos = new THREE.Vector3(x, 5.29, z);
  }

  buildShrine(x, z) {
    const shrine = new THREE.Group();
    // Stepped stone foundation (Dan)
    shrine.add(box(3.8, 0.35, 3.0, MAT.stoneDark, 0, 0.175, 0));
    shrine.add(box(3.2, 0.35, 2.4, MAT.stone, 0, 0.525, 0));

    // Wooden Sanctuary Hall (Honden / Zushi)
    const hall = box(2.2, 1.8, 1.8, MAT.timberMedium, 0, 1.75, 0);
    shrine.add(hall);

    // Warm shoji inner lattice with gentle candle backdrop
    shrine.add(box(1.1, 1.2, 0.08, MAT.shoji, 0, 1.7, 0.92));

    // Deep-eaved kawara gable roof. This replaces the two disconnected slabs
    // with a proper shrine silhouette: eaves, tiled slopes, gable end caps,
    // raised ridge, chigi cross-beams, and katsuogi ridge logs.
    const roof = this.createKawaraRoof(2.9, 2.35, 1.12, 0.78);
    roof.position.y = 2.62;
    shrine.add(roof);

    // Dark wooden eave fascia makes the roof feel structurally supported.
    shrine.add(box(4.45, 0.16, 0.14, MAT.timberDark, 0, 2.7, 1.93));
    shrine.add(box(4.45, 0.16, 0.14, MAT.timberDark, 0, 2.7, -1.93));

    // Chigi: the crossed forked timbers characteristic of a Shinto shrine.
    for (const sx of [-1, 1]) {
      const chigi = box(0.13, 1.05, 0.16, MAT.timberLight, sx * 0.78, 4.05, 0);
      chigi.rotation.z = sx * 0.43;
      shrine.add(chigi);
    }
    // Katsuogi: short horizontal logs seated on the ridge.
    for (const rx of [-0.72, 0, 0.72]) {
      const katsuogi = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.54, 8), MAT.timberLight);
      katsuogi.rotation.z = Math.PI / 2;
      katsuogi.position.set(rx, 3.91, 0);
      shrine.add(katsuogi);
    }

    // Sacred Shimenawa Straw Rope with paper Shide zigzags
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0xd6c085, roughness: 1 }));
    rope.rotation.z = Math.PI / 2;
    rope.position.set(0, 2.42, 0.96);
    shrine.add(rope);

    // Sacred Buddha / Shrine Spiritual Bell (Suzu / Bonsho) with warm sublime bronze warmth
    const bellGroup = new THREE.Group();
    bellGroup.position.set(0, 2.05, 0.96);
    const bellBody = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), MAT.spiritualBellBronze);
    bellBody.scale.set(1.0, 1.25, 1.0);
    const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 16), MAT.spiritualBellBronze);
    bellRim.rotation.x = Math.PI / 2;
    bellRim.position.y = -0.12;
    bellGroup.add(bellBody, bellRim);

    // Braided crimson/gold cords hanging from the bell
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), MAT.norenCrimson);
    cord.position.set(0, -0.42, 0);
    bellGroup.add(cord);
    shrine.add(bellGroup);

    // Saisen-bako wooden offering box
    const saisen = box(0.8, 0.45, 0.5, MAT.timberDark, 0, 0.925, 0.95);
    shrine.add(saisen);

    shrine.position.set(x, 0, z);
    this.scene.add(shrine);
    this.addCollider(hall, 0.4);
  }

  buildLanterns() {
    const spots = [
      [-2.6, -18], [2.6, -18], [-2.8, -26], [2.8, -26],
      [-3, -4], [3.2, 2], [-2.8, 14]
    ];
    for (const [x, z] of spots) {
      const l = new THREE.Group();
      l.add(box(0.5, 0.25, 0.5, MAT.stone, 0, 0.125, 0));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.9, 8), MAT.stone);
      post.position.y = 0.7;
      post.castShadow = true;
      l.add(post);
      l.add(box(0.44, 0.14, 0.44, MAT.stone, 0, 1.22, 0));
      l.add(box(0.3, 0.3, 0.3, MAT.lanternGlow, 0, 1.45, 0));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 4), MAT.stoneDark);
      cap.position.y = 1.75;
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      l.add(cap);
      l.position.set(x, 0, z);
      this.scene.add(l);
      this.addCollider(l.children[1], 0.15);
    }
  }

  buildMountains() {
    // Far ring: noise-ridged mountain walls carrying the valley's height
    // field out to the horizon. Forested green at the foot, drifting to
    // dusty blue-violet with altitude and distance; the material colour is
    // tinted each frame by the sky so sunsets bleed across the ridges.
    const size = 900;
    const geo = new THREE.PlaneGeometry(size, size, 170, 170);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const forest = new THREE.Color(0x2c4a28);
    const forestLight = new THREE.Color(0x4a6e3a);
    const rock = new THREE.Color(0x6a6a70);
    const haze = new THREE.Color(0x8d90b4);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const inner = Math.abs(x) < 126 && Math.abs(z) < 126;
      const h = this.terrainHeight(x, z);
      pos.setY(i, inner ? h - 4 : h);
      const d = Math.sqrt(x * x + z * z);
      const n = worldNoise(x, z, 0.04, 3, 17);
      c.copy(forest).lerp(forestLight, n * 0.8);
      // Bare rock on the steepest high slopes
      const rocky = smoothstep(70, 130, h) * (0.4 + n * 0.6);
      c.lerp(rock, rocky * 0.7);
      // Atmospheric depth baked into the far peaks
      c.lerp(haze, smoothstep(170, 420, d) * 0.85);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.matHazeFar = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    this.matHazeMid = this.matHazeFar;
    const far = new THREE.Mesh(geo, this.matHazeFar);
    far.receiveShadow = false;
    this.scene.add(far);

    this.buildEdgeForest();
    this.buildDistantPagoda(12, 56);
    this.buildVillage();
    this.buildMistRing();
  }

  /**
   * Distant five-story Kyoto pagoda landmark. It deliberately sits beyond the
   * forest boundary, has no collision/platform registration, and is sized to
   * remain readable above the canopy from the bridge and village pathways.
   */
  buildDistantPagoda(x, z) {
    const pagoda = new THREE.Group();
    const roofTileDark = new THREE.MeshStandardMaterial({
      color: 0x202a2d,
      roughness: 0.62,
      metalness: 0.14,
      flatShading: true
    });
    const roofEdgeMat = new THREE.MeshStandardMaterial({ color: 0x151b1c, roughness: 0.58 });
    const warmWallMat = new THREE.MeshStandardMaterial({ color: 0x5a2e22, roughness: 0.9 });
    const finialMat = new THREE.MeshStandardMaterial({ color: 0x5d5140, metalness: 0.72, roughness: 0.3 });

    // A low stone dais is mostly hidden by the distant forest, grounding the
    // structure while allowing the upper stories to tower over the canopy.
    pagoda.add(box(5.6, 0.6, 5.6, MAT.stoneDark, 0, 0.3, 0));
    pagoda.add(box(4.9, 0.32, 4.9, MAT.stone, 0, 0.76, 0));

    const tierWidths = [4.55, 4.05, 3.58, 3.12, 2.68];
    const tierHeights = [2.2, 2.05, 1.9, 1.78, 1.64];
    let baseY = 0.92;

    for (let tier = 0; tier < 5; tier++) {
      const width = tierWidths[tier];
      const storyH = tierHeights[tier];
      const isGroundTier = tier === 0;
      const bodyW = width * (isGroundTier ? 0.68 : 0.62);
      const bodyD = width * (isGroundTier ? 0.68 : 0.62);
      const bodyY = baseY + storyH / 2;

      // Vermilion posts frame each dark enclosed story, matching the pagoda's
      // stacked red silhouette in the supplied Kyoto reference.
      const body = box(bodyW, storyH, bodyD, warmWallMat, 0, bodyY, 0);
      pagoda.add(body);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          pagoda.add(box(
            0.18,
            storyH + 0.22,
            0.18,
            MAT.vermilion,
            sx * (bodyW / 2 - 0.06),
            bodyY,
            sz * (bodyD / 2 - 0.06)
          ));
        }
      }
      // Dark timber rails and a bright vermilion band give each story a
      // legible architectural rhythm at landmark distance.
      pagoda.add(box(bodyW + 0.24, 0.16, bodyD + 0.24, MAT.timberDark, 0, baseY + 0.18, 0));
      pagoda.add(box(bodyW + 0.34, 0.16, bodyD + 0.34, MAT.vermilion, 0, baseY + storyH - 0.14, 0));

      // Broad hipped kawara roof. A shallow four-sided roof reads more like
      // the reference pagoda than a sharp cone, while its oversized eaves
      // create the familiar tiered silhouette.
      const roofSpan = width + 0.72;
      const roofH = 0.72 - tier * 0.045;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(roofSpan / Math.SQRT2, roofH, 4), roofTileDark);
      roof.position.y = baseY + storyH + roofH / 2 - 0.05;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1, 1, 0.9);
      roof.castShadow = true;
      roof.receiveShadow = true;
      pagoda.add(roof);

      // Heavy eave edge plus small lifted corners approximate the curved,
      // upturned tile lines visible in the reference image.
      const eaveY = baseY + storyH + 0.04;
      for (const s of [-1, 1]) {
        pagoda.add(box(roofSpan, 0.1, 0.14, roofEdgeMat, 0, eaveY, s * roofSpan * 0.36));
        pagoda.add(box(0.14, 0.1, roofSpan * 0.72, roofEdgeMat, s * roofSpan * 0.5, eaveY, 0));
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const upturnedCorner = box(0.13, 0.42, 0.13, roofEdgeMat, sx * roofSpan * 0.5, eaveY + 0.16, sz * roofSpan * 0.36);
          upturnedCorner.rotation.z = sx * 0.42;
          upturnedCorner.rotation.x = -sz * 0.42;
          pagoda.add(upturnedCorner);
        }
      }

      baseY += storyH + roofH * 0.62;
    }

    // Sōrin finial: stacked metal discs, a central shaft, and a pointed cap.
    const finialBaseY = baseY - 0.1;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.6, 8), finialMat);
    shaft.position.y = finialBaseY + 1.3;
    shaft.castShadow = true;
    pagoda.add(shaft);
    for (let i = 0; i < 8; i++) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28 - i * 0.014, 0.28 - i * 0.014, 0.065, 12), finialMat);
      disc.position.y = finialBaseY + 0.42 + i * 0.22;
      disc.castShadow = true;
      pagoda.add(disc);
    }
    const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), finialMat);
    jewel.position.y = finialBaseY + 2.72;
    jewel.castShadow = true;
    pagoda.add(jewel);
    const finialTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.58, 8), finialMat);
    finialTip.position.y = finialBaseY + 3.08;
    finialTip.castShadow = true;
    pagoda.add(finialTip);

    pagoda.position.set(x, 0, z);
    // Keep the stone dais at ground level while making the landmark 12% more
    // prominent over the forest canopy.
    pagoda.scale.setScalar(1.12);
    pagoda.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    this.scene.add(pagoda);
  }

  buildEdgeForest() {
    // Dense impassable tree wall ringing the playfield just inside the
    // hard boundary radius. Each tree is built from TWO layered irregular
    // leafy masses (dark shaded underlayer + lighter sunlit crown) so the
    // forest reads as painterly foliage instead of smooth cones.
    const tuftGeo = lumpyTuftGeometry(2, 5, 0.46);
    const tuftGeoB = lumpyTuftGeometry(2, 6, 0.42);
    const tuftGeoC = lumpyTuftGeometry(2, 10, 0.48);
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 7);
    const canopyMats = [
      new THREE.Color(0x2e5524), new THREE.Color(0x3b6a2e), new THREE.Color(0x25481e)
    ];
    const forestMat = createFoliageMaterial({ sss: 0.24, wind: 0.75, mottle: 0.38, vertexColors: false });
    const count = 260;
    const lower = new THREE.InstancedMesh(tuftGeo, forestMat, count);
    const mid = new THREE.InstancedMesh(tuftGeoC, forestMat, count);
    const upper = new THREE.InstancedMesh(tuftGeoB, forestMat, count);
    const trunks = new THREE.InstancedMesh(trunkGeo, texturedMaterial(TEX.woodDark, { color: 0x6a5a48, roughness: 1 }), count);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const pagodaBearing = Math.atan2(56, 12);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.random() * 0.09;
      const r = 37 + this.random() * 7;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 1.8 + this.random() * 2.4;
      // Lower only the tree crowns in the pagoda's narrow sightline by 12%.
      // Their horizontal footprint and collision wall remain untouched.
      const angleDelta = Math.atan2(Math.sin(a - pagodaBearing), Math.cos(a - pagodaBearing));
      const sightlineHeight = Math.abs(angleDelta) < 0.24 ? 0.88 : 1;
      // Wide dark shaded under-canopy
      dummy.position.set(x, s * 0.95 * sightlineHeight, z);
      dummy.scale.set(s * (0.85 + this.random() * 0.3), s * 0.8 * sightlineHeight, s * (0.85 + this.random() * 0.3));
      dummy.rotation.set(this.random() * 0.5, this.random() * Math.PI, this.random() * 0.5);
      dummy.updateMatrix();
      lower.setMatrixAt(i, dummy.matrix);
      col.copy(canopyMats[2]).offsetHSL(0, (this.random() - 0.5) * 0.05, (this.random() - 0.5) * 0.05);
      lower.setColorAt(i, col);
      // Side clump breaking the outline
      dummy.position.set(x + (this.random() - 0.5) * s * 0.9, s * (1.15 + this.random() * 0.3) * sightlineHeight, z + (this.random() - 0.5) * s * 0.9);
      dummy.scale.set(s * (0.45 + this.random() * 0.25), s * (0.45 + this.random() * 0.2) * sightlineHeight, s * (0.45 + this.random() * 0.25));
      dummy.rotation.set(this.random() * 0.6, this.random() * Math.PI, this.random() * 0.6);
      dummy.updateMatrix();
      mid.setMatrixAt(i, dummy.matrix);
      col.copy(canopyMats[Math.floor(this.random() * canopyMats.length)]).offsetHSL(0, 0, (this.random() - 0.5) * 0.06);
      mid.setColorAt(i, col);
      // Narrower sunlit crown, offset slightly for irregular silhouette
      dummy.position.set(x + (this.random() - 0.5) * s * 0.4, s * 1.55 * sightlineHeight, z + (this.random() - 0.5) * s * 0.4);
      dummy.scale.set(s * (0.55 + this.random() * 0.25), s * 0.65 * sightlineHeight, s * (0.55 + this.random() * 0.25));
      dummy.rotation.set(this.random() * 0.5, this.random() * Math.PI, this.random() * 0.5);
      dummy.updateMatrix();
      upper.setMatrixAt(i, dummy.matrix);
      col.copy(canopyMats[Math.floor(this.random() * canopyMats.length)])
        .offsetHSL(0, 0, 0.02 + this.random() * 0.05);
      upper.setColorAt(i, col);
      dummy.position.set(x, 0.6 * s * sightlineHeight, z);
      dummy.scale.set(s, s * sightlineHeight, s);
      dummy.rotation.set(0, this.random() * Math.PI, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      // Impassable wall collider
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(x - s * 0.35, 0, z - s * 0.35),
        new THREE.Vector3(x + s * 0.35, s * 2.2, z + s * 0.35)
      ));
    }
    lower.instanceMatrix.needsUpdate = true;
    mid.instanceMatrix.needsUpdate = true;
    upper.instanceMatrix.needsUpdate = true;
    trunks.instanceMatrix.needsUpdate = true;
    if (lower.instanceColor) lower.instanceColor.needsUpdate = true;
    if (mid.instanceColor) mid.instanceColor.needsUpdate = true;
    if (upper.instanceColor) upper.instanceColor.needsUpdate = true;
    for (const m of [lower, mid, upper]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
    this.scene.add(trunks);

    // Undergrowth bushes thickening the wall between trees
    const bushGeo = lumpyTuftGeometry(1, 7, 0.3);
    const bushMat = createFoliageMaterial({ sss: 0.2, wind: 0.6, mottle: 0.3, vertexColors: false });
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 160);
    const bushCol = new THREE.Color();
    for (let i = 0; i < 160; i++) {
      const a = this.random() * Math.PI * 2;
      const r = 35.5 + this.random() * 8;
      const s = 0.9 + this.random() * 1.6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      dummy.position.set(x, s * 0.5, z);
      dummy.scale.set(s * 1.2, s * 0.8, s * 1.2);
      dummy.rotation.set(0, this.random() * Math.PI, 0);
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
      bushes.setColorAt(i, bushCol.setHex(0x2c5222).offsetHSL((this.random() - 0.5) * 0.03, 0, (this.random() - 0.5) * 0.08));
      if (r < 41) {
        this.colliders.push(new THREE.Box3(
          new THREE.Vector3(x - s * 0.6, 0, z - s * 0.6),
          new THREE.Vector3(x + s * 0.6, Math.max(0.9, s), z + s * 0.6)
        ));
      }
    }
    bushes.instanceMatrix.needsUpdate = true;
    if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
    bushes.castShadow = true;
    bushes.receiveShadow = true;
    this.scene.add(bushes);
  }

  buildVillage() {
    const pastelWalls = [0xf5e6c8, 0xf2b8c6, 0xfdf3e0, 0xe8d8f0];
    const pastelRoofs = [0x7a8aa8, 0xc87888, 0x88a890, 0x9a86b0, 0xd8a878];
    const clusters = [
      [-62, -78, 9], [18, -88, 12], [78, -70, 8], [-95, -35, 6], [95, -20, 7], [40, -96, 6]
    ];
    const wallMats = pastelWalls.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
    const roofMats = pastelRoofs.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
    // Warm hearth-window glow shared by every distant house; kindles at dusk
    this.villageWindowMat = new THREE.MeshStandardMaterial({
      color: 0x8a5a30,
      emissive: 0xffb45e,
      emissiveIntensity: 0.1,
      roughness: 0.6
    });
    const winGeo = new THREE.PlaneGeometry(0.34, 0.42);
    for (const [cx, cz, n] of clusters) {
      for (let i = 0; i < n; i++) {
        const hx = cx + (this.random() - 0.5) * 26;
        const hz = cz + (this.random() - 0.5) * 18;
        const s = 1.4 + this.random() * 1.6;
        const house = new THREE.Group();
        const wall = box(2.6 * s, 1.6 * s, 2.0 * s, wallMats[Math.floor(this.random() * wallMats.length)], 0, 0.8 * s, 0);
        house.add(wall);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0 * s, 1.1 * s, 4), roofMats[Math.floor(this.random() * roofMats.length)]);
        roof.position.y = 1.6 * s + 0.55 * s;
        roof.rotation.y = Math.PI / 4;
        house.add(roof);
        // 1-3 warm windows on the out-facing walls of distant townhouses
        const winCount = 1 + Math.floor(this.random() * 3);
        for (let wnd = 0; wnd < winCount; wnd++) {
          const win = new THREE.Mesh(winGeo, this.villageWindowMat);
          const side = this.random() < 0.5 ? 1 : -1;
          win.position.set(
            (this.random() - 0.5) * 1.8 * s,
            (0.6 + this.random() * 0.7) * s,
            side * (1.002 * s)
          );
          if (side === -1) win.rotation.y = Math.PI;
          house.add(win);
        }
        house.position.set(hx, this.terrainHeight(hx, hz) - 0.3, hz);
        house.rotation.y = this.random() * Math.PI;
        this.scene.add(house);
      }
    }

    // Foothill forest: dense instanced canopies carpeting the slopes so the
    // ridges read as wooded rather than bare geometry.
    const treeGeo = lumpyTuftGeometry(2, 8, 0.36);
    const treeMat = createFoliageMaterial({ sss: 0.15, wind: 0.5, mottle: 0.3, vertexColors: false });
    const treeCount = 2600;
    const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      const a = this.random() * Math.PI * 2;
      const r = 60 + Math.pow(this.random(), 0.75) * 130;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      // Smaller, denser crowns so the slopes read as woodland, not boulders
      const s = 1.2 + this.random() * 2.2;
      dummy.position.set(x, this.terrainHeight(x, z) + s * 0.5, z);
      dummy.scale.set(s * (0.8 + this.random() * 0.5), s * 1.15, s * (0.8 + this.random() * 0.5));
      dummy.rotation.set(this.random() * 0.4, this.random() * Math.PI, this.random() * 0.4);
      dummy.updateMatrix();
      trees.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.27 + this.random() * 0.08, 0.28 + this.random() * 0.14, 0.15 + this.random() * 0.1);
      trees.setColorAt(i, color);
    }
    trees.instanceMatrix.needsUpdate = true;
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
    this.scene.add(trees);
  }

  mistTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(244, 236, 224, 0.5)');
    g.addColorStop(0.55, 'rgba(244, 236, 224, 0.28)');
    g.addColorStop(1, 'rgba(244, 236, 224, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  buildMistRing() {
    const tex = this.mistTexture();
    this.mists = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + this.random() * 0.3;
      const r = 58 + this.random() * 14;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false });
      const spr = new THREE.Sprite(mat);
      const mx = Math.cos(a) * r, mz = Math.sin(a) * r;
      const baseY = this.terrainHeight(mx, mz) + 2.0 + this.random() * 4;
      spr.position.set(mx, baseY, mz);
      spr.scale.set(28 + this.random() * 22, 10 + this.random() * 8, 1);
      this.scene.add(spr);
      this.mists.push({ spr, baseX: spr.position.x, baseY, phase: this.random() * 6, speed: 0.03 + this.random() * 0.04 });
    }
  }

  buildYarn() {
    let id = 0;
    const yarnSpots = [
      [-20, 14], [12, 20], [24, 4], [-4, -12], [2.5, -24],
      [-10, 28], [18, -10], [-26, -2], [8, 30], [-16, -18]
    ];
    for (const [x, z] of yarnSpots) {
      const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), MAT.yarn);
      yarn.position.set(x, 0.35, z);
      yarn.castShadow = true;
      yarn.userData.id = id++;
      yarn.userData.isCollectible = true;
      yarn.userData.velocity = new THREE.Vector3();
      yarn.userData.batted = false;

      const wrapMat = new THREE.MeshStandardMaterial({ color: 0xf27a9f, roughness: 0.7 });
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), wrapMat);
      wrap.rotation.x = this.random() * Math.PI;
      wrap.rotation.y = this.random() * Math.PI;
      yarn.add(wrap);

      this.scene.add(yarn);
      this.collectibles.push(yarn);
    }
  }

  /**
   * A small pool of real point lights hops between the lanterns nearest the
   * cat so paper and stone lanterns actually throw warm light on the street
   * at night, instead of only glowing themselves.
   */
  updateLanternLights(dt, playerPos, nightness) {
    if (!this.lanternLights) {
      this.lanternLights = [];
      for (let i = 0; i < 4; i++) {
        const light = new THREE.PointLight(0xffb469, 0, 11, 2);
        this.scene.add(light);
        this.lanternLights.push(light);
      }
      // Resolve every lantern's world position once the houses are placed
      this.lightSpots = [];
      const p = new THREE.Vector3();
      for (const l of this.lanterns) {
        l.group.getWorldPosition(p);
        this.lightSpots.push(new THREE.Vector3(p.x, p.y - 0.25, p.z));
      }
      for (const s of this.toroSpots || []) this.lightSpots.push(s.clone());
    }
    if (nightness < 0.02 || !playerPos) {
      for (const l of this.lanternLights) l.intensity = 0;
      return;
    }
    // Pick the four nearest lanterns
    const best = [];
    for (const s of this.lightSpots) {
      const d2 = s.distanceToSquared(playerPos);
      if (best.length < 4) { best.push({ s, d2 }); best.sort((a, b) => a.d2 - b.d2); }
      else if (d2 < best[3].d2) { best[3] = { s, d2 }; best.sort((a, b) => a.d2 - b.d2); }
    }
    for (let i = 0; i < this.lanternLights.length; i++) {
      const light = this.lanternLights[i];
      const pick = best[i];
      if (!pick) { light.intensity = 0; continue; }
      light.position.copy(pick.s);
      const flicker = 0.9 + Math.sin(this.time * 9 + i * 2.1) * 0.06 + Math.sin(this.time * 23 + i) * 0.04;
      light.intensity = nightness * 9 * flicker;
    }
  }

  update(dt, playerPos = null, sky = null) {
    this.time += dt;

    // Lanterns glow at night, dim by day
    if (sky) {
      const sunUp = Math.max(0, sky.sunDir.y);
      const nightness = Math.max(0, 1 - sunUp * 5);
      MAT.lanternGlow.emissiveIntensity = 0.15 + nightness * 2.2;
      MAT.lanternPaper.emissiveIntensity = 0.4 + nightness * 1.8;
      MAT.shoji.emissiveIntensity = 0.2 + nightness * 0.7;
      if (this.villageWindowMat) {
        // Village windows kindle at dusk like the reference Kyoto skyline
        this.villageWindowMat.emissiveIntensity = 0.1 + nightness * 2.6;
      }
      // Lantern halo sprites breathe with dusk; a slow warm flicker
      for (let i = 0; i < this.lanternHalos.length; i++) {
        const flicker = 0.85 + Math.sin(this.time * 7.5 + i * 1.7) * 0.15;
        this.lanternHalos[i].opacity = nightness * 0.55 * flicker;
      }
      // Far ridges wash toward sky colors so sunsets bleed across them
      if (this.matHazeFar) {
        const p = sky.resolvePalette();
        const dayness = Math.min(1, Math.max(0, sky.sunDir.y + 0.25) / 0.5);
        const tint = new THREE.Color(0x4a5478).lerp(new THREE.Color(0xffffff), dayness);
        const golden = Math.max(0, sky.sunDir.y) * Math.exp(-Math.max(0, sky.sunDir.y) * 3.0);
        tint.lerp(p.warm, golden * 0.3);
        this.matHazeFar.color.copy(tint);
      }
      this.updateLanternLights(dt, playerPos, nightness);
    }

    // River shader follows time-of-day sun and palette
    if (this.riverUniforms) {
      this.riverUniforms.uTime.value = this.time;
      if (sky) {
        const p = sky.resolvePalette();
        this.riverUniforms.uSunDir.value.copy(sky.sunDir);
        this.riverUniforms.uSunColor.value.copy(p.sun);
        this.riverUniforms.uSky.value.copy(p.horizon);
        this.riverUniforms.uTop.value.copy(p.top);
        const sunY = Math.max(0, sky.sunDir.y);
        // Same low-sun band as the sky: full gold while the sun rides low
        this.riverUniforms.uDusk.value = Math.min(1, Math.max(0, (0.42 - sunY) / 0.42)) * Math.min(1, sunY / 0.06);
        // Broad brightness window: stays lit through golden hour, fades at night
        this.riverUniforms.uDay.value = Math.min(1, Math.max(0, sky.sunDir.y + 0.18) * 2.2);
      }
    }

    // Paddy water ripples drift in slow, irregular breeze pulses. UV motion is
    // intentionally subtle so the paddies feel alive without reading as a river.
    for (const paddy of this.paddyWaterMaterials) {
      const gust = 0.35 + Math.max(0, Math.sin(this.time * 0.42 + paddy.phase)) * 0.65;
      paddy.material.map.offset.x = (paddy.material.map.offset.x + dt * paddy.speed * gust) % 1;
      paddy.material.map.offset.y = Math.sin(this.time * 0.18 + paddy.phase) * 0.035;
      paddy.material.bumpScale = 0.012 + gust * 0.025;
    }

    // Sway hanging Kyoto Chochin lanterns
    const windSpeed = (sky && sky.weather === 'rain') ? 3.5 : 2.0;
    const windAngle = (sky && sky.weather === 'rain') ? 0.12 : 0.05;
    for (const l of this.lanterns) {
      l.group.rotation.z = Math.sin(this.time * windSpeed + l.phase) * windAngle;
      l.group.rotation.x = Math.cos(this.time * windSpeed * 0.8 + l.phase) * (windAngle * 0.6);
    }

    // Shishi-odoshi bamboo clacker cycle
    if (this.shishiRocker) {
      const cycle = (this.time * 0.4) % (Math.PI * 2);
      let tilt = 0;
      if (cycle < 4.8) {
        // Slowly filling with water
        tilt = (cycle / 4.8) * 0.38;
      } else if (cycle < 5.3) {
        // Tipping over and pouring water
        const p = (cycle - 4.8) / 0.5;
        tilt = 0.38 + p * 0.45;
      } else {
        // Snapping back and hitting the rock (clack!)
        const p = (cycle - 5.3) / (Math.PI * 2 - 5.3);
        tilt = 0.83 * (1 - p);
      }
      this.shishiRocker.rotation.z = Math.PI / 2 + tilt;
    }

    // Secret Key spin & bob
    if (this.secretKeyMesh && !this.secretKeyCollected) {
      this.secretKeyMesh.rotation.y += dt * 2.2;
      this.secretKeyMesh.position.y = this.secretKeyPos.y + Math.sin(this.time * 3.5) * 0.12;
      if (playerPos) {
        const d2 = this.secretKeyMesh.position.distanceToSquared(playerPos);
        MAT.goldAntique.emissiveIntensity = d2 < 16 ? 0.9 + 0.4 * Math.sin(this.time * 8) : 0.6;
      }
    }

    // Secret Machiya door stays permanently closed — entry is via the shoji
    // transition cutscene (InteriorManager.transitionToInterior) once the
    // cat has the key. No physical pass-through into the shell interior.

    // Bush sway wind tick (grass-like flutter; boosts when the cat is close)
    if (this.bushMat && this.bushMat.userData.uSwayTime) {
      this.bushMat.userData.uSwayTime.value = this.time;
      let boost = 0;
      if (playerPos) {
        let nearest = 999;
        for (const [bx_, bz_] of this.bushColliderSpots) {
          const d = Math.hypot(playerPos.x - bx_, playerPos.z - bz_);
          if (d < nearest) nearest = d;
        }
        boost = Math.max(0, 1 - nearest / 2.5);
      }
      this.bushMat.userData.uSwayBoost.value +=
        (boost - this.bushMat.userData.uSwayBoost.value) * Math.min(1, dt * 6);
    }

    // Nest golden feather shimmer
    if (this.nestFeatherMesh) {
      this.nestFeatherMesh.rotation.y = Math.sin(this.time * 2.0) * 0.25;
      MAT.featherGold.emissiveIntensity = 0.7 + Math.sin(this.time * 4) * 0.35;
    }

    // Mist rolls in during misty weather
    const mistStrength = (sky && sky.weather === 'mist') ? Math.max(0, sky.weatherBlend * 2 - 0.4) : 0;

    for (const item of this.collectibles) {
      item.rotation.y += dt * 2;
      const baseY = 0.35 + Math.sin(this.time * 3 + item.userData.id) * 0.08;

      // Yarn physics when batted
      if (item.userData.batted) {
        item.position.addScaledVector(item.userData.velocity, dt);
        item.userData.velocity.y -= 9.8 * dt; // gravity
        if (item.position.y < 0.2) {
          item.position.y = 0.2;
          item.userData.velocity.y *= -0.55;
          item.userData.velocity.x *= 0.85;
          item.userData.velocity.z *= 0.85;
        }
        if (item.userData.velocity.lengthSq() < 0.05) {
          item.userData.batted = false;
          item.userData.velocity.set(0, 0, 0);
        }
      } else {
        item.position.y = baseY;
      }

      // Proximity glow pulse
      if (playerPos) {
        const d2 = item.position.distanceToSquared(playerPos);
        const pulse = d2 < 9 ? 0.5 + 0.5 * Math.sin(this.time * 4 + item.userData.id) : 0;
        const base = 0.5;
        item.material.emissiveIntensity = base + pulse;
      }
    }
    for (const m of this.mists || []) {
      const mistMul = 1 + mistStrength * 2.5;
      m.spr.position.x = m.baseX + Math.sin(this.time * m.speed * 4 + m.phase) * 3 * mistMul;
      m.spr.position.y = m.baseY + 0.6 - mistStrength * 0.4;
      m.spr.material.opacity = (0.6 + Math.sin(this.time * m.speed * 6 + m.phase) * 0.15) * (1 + mistStrength * 0.8);
    }
    for (const r of this.ripples) {
      if (r.life <= 0) continue;
      r.age += dt;
      r.life -= dt;
      const t = r.age / 1.1;
      const cap = r.maxScale || 3.3;
      const raw = (0.3 + t * 3.0) * r.strength;
      const hitAge = ((cap / r.strength) - 0.3) / 3.0 * 1.1;
      const hitShore = raw >= cap;
      r.mesh.scale.setScalar(Math.min(raw, cap));
      let fade = 1 - t;
      if (hitShore) fade = Math.max(0, 1 - (r.age - hitAge) / 0.35);
      r.mesh.material.opacity = Math.max(0, 0.5 * fade) * Math.min(r.strength, 1);
      if (r.life <= 0 || (hitShore && fade <= 0)) { r.mesh.visible = false; r.life = 0; }
    }
  }
}
