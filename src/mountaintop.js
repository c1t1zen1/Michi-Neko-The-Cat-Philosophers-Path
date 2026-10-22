import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  dirtTextures, groundTextures, stoneTextures, woodTextures, metalTextures, barkTextures,
  texturedMaterial, worldNoise, glowTexture
} from './textures.js?v=20261022d';
import {
  createFoliageMaterial, createFoliageDepthMaterial, leafCardTexture,
  leafCardGeometry, buildCanopy, updateFoliage, lumpyTuftGeometry
} from './foliage.js?v=20261022d';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function summitBirdWingGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0.02, 0, 0.1,   0.92, 0, 0.02,   0.56, 0, -0.22,
    0.02, 0, 0.1,   0.56, 0, -0.22,  0.08, 0, -0.13
  ]), 3));
  geo.computeVertexNormals();
  return geo;
}

function summitBirdTailGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.11, 0, 0,  0.11, 0, 0,  -0.2, 0, -0.42,
     0.11, 0, 0,  0.2, 0, -0.42,  0, 0, -0.28
  ]), 3));
  geo.computeVertexNormals();
  return geo;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// The summit lives in its own coordinate pocket, like the Tea House
// interior — far enough that the valley's mountain ring and fog swallow it
// completely. Everything under this.group is local to the clearing.
const ORIGIN = new THREE.Vector3(0, -1200, 0);
const MEADOW_R = 10.75;         // intimate playable clearing radius
const MEADOW_Y = 0.08;          // shared render + physics surface
const CORRIDOR_W = 2.9;         // ocean-side stair half-width
const CORRIDOR_Z0 = 8.25;       // top tread where the stair meets the grass
const CORRIDOR_Z1 = 20.25;      // lower arrival landing
const GATE_Z = 16.2;            // overlook torii line in local space
const ENTRY_Y = -1.6;
const STEP_COUNT = 7;
const STEP_RUN = 1.05;
const STEP_RISE = 0.28;

// Optional cinematic for the ascent. Drop an mp4 at this path and it plays
// full-screen; when the file is absent (or undecodable) the CSS light-burst
// in index.html carries the transition, so the scene never hard-depends on
// the asset existing. Never fetched at boot — attached on first use only.
const SUMMIT_VIDEO_SRC = 'assets/summit-transition.mp4';

// Summit sky: no rain, no mist — wind, drifting clouds, soft snow at times.
const SUMMIT_WEATHER_POOL = ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'snow'];
const SUMMIT_WEATHER_DURATIONS = { clear: 300, cloudy: 260, snow: 200 };

// Seconds of stillness in the meadow heart before the cat curls up to sleep.
const MEDITATE_SECONDS = 165;
// Resolve from this module rather than the current document: the main game is
// served from `/`, while the art-review page lives under `/tools/`.
const SUMMIT_LANDMARKS_SRC = new URL('../assets/models/summit_kyoto_landmarks.glb?v=20261022d', import.meta.url).href;

/**
 * The hidden summit clearing — a wind-combed grass field above Kyoto with
 * the city, Osaka and the bay painted into one hazy panorama. Reached by
 * ringing the shrine bell ten times and stepping into the light; left by
 * walking back under the torii at the foot of the shrine steps.
 *
 * No quests, no hints, no NPCs — a respite scene. The only mechanism is
 * stillness: sit in the meadow long enough and the cat sleeps.
 */
export class SummitManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.origin = ORIGIN.clone();
    this.active = false;
    this.transitioning = false;
    this.unlocked = false;
    this.bellRings = 0;
    this.meditateT = 0;
    this.sleeping = false;
    this._sitHintShown = false;
    this.cameraActive = false;
    this._vistaSuppressed = false;
    this._exitArmed = false;
    this._thicketOpen = 0;
    this.time = 0;

    // The authored overlook used by gameplay and the standalone art preview.
    // +Z is the bay; a positive X seat composes the cat beneath the framing
    // tree while the torii and pagoda remain readable on the opposite side.
    this.perchLocal = new THREE.Vector3(3.3, MEADOW_Y, 3.15);
    this.perchRadius = 2.35;
    this._vistaDesired = new THREE.Vector3();
    this._vistaLook = new THREE.Vector3();
    this._vistaLookTarget = new THREE.Vector3();
    this._reducedMotion = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._meditationGlow = 0;
    this._furinNear = false;
    this._furinChimed = false;

    this.group = new THREE.Group();
    this.group.name = 'Summit Clearing';
    this.group.position.copy(this.origin);
    this.group.visible = false;
    this.scene.add(this.group);

    this.colliders = [];
    this.platforms = [];
    this.collectibles = [];   // player.update probes this — the summit has none
    this.swayables = [];
    this.rng = mulberry32(20261004);
    this.previewQuality = game.summitPreview === true;

    // Shared materials — kept local so a quality/texture change upstream
    // doesn't ripple into the valley's merge sets.
    const TEX = {
      dirt: dirtTextures(41),
      ground: groundTextures(41),
      stone: stoneTextures(0x8e9187, 12),
      stoneDark: stoneTextures(0x5f6158, 13),
      woodDark: woodTextures(0x3f2818, 0x1c110a, 14),
      gold: metalTextures(0xd9ad4c)
    };
    this.MAT = {
      meadow: texturedMaterial(TEX.ground, { color: 0xd7efad, roughness: 1 }),
      stone: texturedMaterial(TEX.stone, { roughness: 0.94, normalScale: 0.9 }),
      stoneDark: texturedMaterial(TEX.stoneDark, { roughness: 0.95, normalScale: 0.8 }),
      stoneWarm: texturedMaterial(TEX.stone, { color: 0xcabfa0, roughness: 0.92 }),
      vermilion: texturedMaterial({ normalMap: TEX.woodDark.normalMap }, { color: 0xd8482c, roughness: 0.45, normalScale: 0.3 }),
      timberDark: texturedMaterial(TEX.woodDark, { roughness: 0.8, normalScale: 0.8 }),
      bark: texturedMaterial(barkTextures(0x6d4d36, 0x2a1a11, 21), { roughness: 0.95, normalScale: 1.2 }),
      gold: texturedMaterial(TEX.gold, { metalness: 0.85, roughness: 0.35, emissive: 0x6a4d08, emissiveIntensity: 0.4 }),
      lanternGlow: new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0x6e3c10, emissiveIntensity: 0.28, roughness: 0.9 })
    };
    this.MAT.meadow.vertexColors = true;

    // Foliage materials for summit trees — the same painterly shader the
    // valley uses; the shared foliageUniforms clock keeps them swaying.
    this.matFoliage = createFoliageMaterial({ sss: 0.34, wind: 1.35, mottle: 0.4 });
    this.matBlossom = createFoliageMaterial({ sss: 0.42, wind: 1.5, mottle: 0.24, bump: 0.44, roughness: 0.85 });
    this.matNeedle = createFoliageMaterial({ sss: 0.18, wind: 0.9, mottle: 0.42 });
    this.cardSets = {};
    for (const [kind, opts] of Object.entries({
      broadleaf: { sss: 0.4, wind: 1.4, mottle: 0.22, bump: 0.4 },
      maple: { sss: 0.46, wind: 1.45, mottle: 0.22, bump: 0.4 },
      sakura: { sss: 0.5, wind: 1.55, mottle: 0.14, bump: 0.28, roughness: 0.85 },
      needle: { sss: 0.22, wind: 0.95, mottle: 0.26, bump: 0.42 }
    })) {
      const map = leafCardTexture(kind);
      this.cardSets[kind] = {
        material: createFoliageMaterial(Object.assign({ map, alphaTest: 0.5, side: THREE.DoubleSide }, opts)),
        depth: createFoliageDepthMaterial(map, 0.5)
      };
    }
    this.colSakura = [0xd27a94, 0xeaa2b6, 0xf6c6d2, 0xfbdde6];
    this.colMaple = [0x8e2d20, 0xc24a34, 0xe0704a, 0xf09060];
    this.colPine = [0x24401f, 0x33582f, 0x4a7040, 0x5f8850];
    this.colLeaf = [0x2f4f1c, 0x3f6626, 0x5a8536, 0x7aa348];

    this._localPlayer = new THREE.Vector3();
    this._grassTime = 0;
    // The global atmosphere integrates from absolute world height.  The
    // summit is deliberately parked at y=-1200, so it supplies a local fog
    // datum or the exponential term saturates the entire frame.
    this.atmosphereSettings = {
      fogBase: this.origin.y - 0.5,
      densityScale: 0.56,
      heightFalloff: 0.105
    };
    this.skyPalette = {
      top: new THREE.Color(0x168edf),
      mid: new THREE.Color(0x58b9eb),
      horizon: new THREE.Color(0xc9e9f3),
      warm: new THREE.Color(0xffdda0),
      sun: new THREE.Color(0xffefc7),
      hemiSky: new THREE.Color(0xb9e2f5),
      hemiGround: new THREE.Color(0x6f8748),
      fog: new THREE.Color(0xb7d6df),
      cloud: new THREE.Color(0xfff9e9),
      cloudOpacity: 0.86
    };

    this.buildSummitLight();
    this.buildMeadow();
    this.buildStepsAndGate();
    this.buildRocksAndTrees();
    this.buildMeditationStone();
    this.buildMeditationAtmosphere();
    this.buildGrassField();
    this.buildSusukiAndFlowers();
    this.buildSkirtAndVista();
    this.loadVistaLandmarks();
    this.buildSummitClouds();
    this.buildPollen();
    this.buildSakuraPetals();
    this.buildAmbientWildlife();
    this.buildSummitSnow();
    this.buildShrineRays();
    this.markSkyKeepers();

    // A scene tap wakes a touch player out of the chrome-free view. Keyboard
    // movement is handled by the ordinary stillness check below.
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('pointerdown', (event) => {
        if (!this.cameraActive || !event.target || event.target.tagName !== 'CANVAS') return;
        this._vistaSuppressed = true;
        this.setVistaView(false);
      }, { passive: true });
    }
  }

  /* ================= World shims for player.update ================= */

  isInWater() { return false; }

  /**
   * Base ground height — WORLD space, like the interior's getGroundHeight:
   * the player physics compares it against the cat's world y, so returning
   * the local 0/-1.6 would snap the cat out of the summit pocket.
   */
  groundAt(x, z) {
    const lx = x - this.origin.x, lz = z - this.origin.z;
    if (Math.abs(lx) <= CORRIDOR_W + 0.45 && lz >= CORRIDOR_Z0 && lz <= CORRIDOR_Z1) {
      const step = Math.min(STEP_COUNT - 1, Math.max(0, Math.floor((lz - CORRIDOR_Z0) / STEP_RUN)));
      const top = lz >= CORRIDOR_Z0 + STEP_COUNT * STEP_RUN
        ? ENTRY_Y
        : Math.max(ENTRY_Y, MEADOW_Y - step * STEP_RISE);
      return this.origin.y + top;
    }
    return this.origin.y + MEADOW_Y;
  }

  /** Soft containment: meadow circle + the stair corridor notch. */
  constrain(pos) {
    const lx = pos.x - this.origin.x, lz = pos.z - this.origin.z;
    const inCorridorLane = lz >= CORRIDOR_Z0 - 0.8 && lz <= CORRIDOR_Z1 + 0.35;
    const inCorridor = inCorridorLane && Math.abs(lx) <= CORRIDOR_W;
    if (inCorridor) {
      if (lz > CORRIDOR_Z1) pos.z = this.origin.z + CORRIDOR_Z1;
      return;
    }
    if (inCorridorLane && Math.abs(lx) <= CORRIDOR_W + 0.8) {
      pos.x = this.origin.x + Math.sign(lx || 1) * CORRIDOR_W;
      return;
    }
    const r = Math.hypot(lx, lz);
    if (r > MEADOW_R) {
      const k = MEADOW_R / r;
      pos.x = this.origin.x + lx * k;
      pos.z = this.origin.z + lz * k;
    }
  }

  addColliderBox(minX, minY, minZ, maxX, maxY, maxZ) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(this.origin.x + minX, this.origin.y + minY, this.origin.z + minZ),
      new THREE.Vector3(this.origin.x + maxX, this.origin.y + maxY, this.origin.z + maxZ)
    ));
  }

  addPlatformBox(minX, topY, minZ, maxX, bottomY, maxZ) {
    this.platforms.push(new THREE.Box3(
      new THREE.Vector3(this.origin.x + minX, this.origin.y + bottomY, this.origin.z + minZ),
      new THREE.Vector3(this.origin.x + maxX, this.origin.y + topY, this.origin.z + maxZ)
    ));
  }

  /* ================= Terrain & architecture ================= */

  buildSummitLight() {
    // A high mountain bounce keeps the meadow readable even when the valley
    // clock is near dawn or dusk.  These do not cast another shadow map; the
    // live sky sun still supplies the moving key and all long shadows.
    const skyFill = new THREE.HemisphereLight(0xbfe5ff, 0x5b6638, 1.15);
    skyFill.name = 'Summit Open Sky Fill';
    this.group.add(skyFill);

    const warmFill = new THREE.DirectionalLight(0xffedc2, 1.1);
    warmFill.name = 'Summit Warm Rim Fill';
    warmFill.position.set(-32, 42, -18);
    warmFill.castShadow = false;
    warmFill.target.position.set(5, 0, 18);
    this.group.add(warmFill, warmFill.target);
    this.summitWarmFill = warmFill;
  }

  buildMeadow() {
    // A compact, level patch beneath the old tree. Keeping the rendered
    // surface and groundAt() on the same MEADOW_Y plane prevents the cat's
    // legs and paws disappearing into a decorative terrain crown.
    const radius = 12.2;
    const notchHalf = CORRIDOR_W + 0.18;
    const rimZ = Math.sqrt(radius * radius - notchHalf * notchHalf);
    const leftAngle = Math.atan2(rimZ, -notchHalf);
    const rightAngle = Math.atan2(rimZ, notchHalf) + Math.PI * 2;
    const shape = new THREE.Shape();
    // Shape Y is -world Z because the geometry rotates -90 degrees to face up.
    shape.moveTo(-notchHalf, -CORRIDOR_Z0);
    shape.lineTo(-notchHalf, -rimZ);
    for (let i = 0; i <= 80; i++) {
      const a = leftAngle + (rightAngle - leftAngle) * (i / 80);
      shape.lineTo(Math.cos(a) * radius, -Math.sin(a) * radius);
    }
    shape.lineTo(notchHalf, -CORRIDOR_Z0);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const meadow = new THREE.Color(0xb6d986);
    const dry = new THREE.Color(0xd8d287);
    const rimSoil = new THREE.Color(0xae9868);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      pos.setY(i, MEADOW_Y);
      c.copy(meadow).lerp(dry, smoothstep(0.35, 0.9, worldNoise(x * 0.7, z * 0.7, 0.09, 2, 9) * 0.5 + 0.5));
      c.lerp(rimSoil, smoothstep(9.7, radius, r) * 0.55);
      // worn grass along the stair approach
      if (Math.abs(x) < 3.4 && z > 6.5) c.lerp(rimSoil, smoothstep(6.5, 13.5, z) * 0.42);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, this.MAT.meadow);
    m.receiveShadow = true;
    m.name = 'Summit Meadow';
    this.group.add(m);
  }

  buildStepsAndGate() {
    const approach = new THREE.Group();
    approach.name = 'Playable Ocean Torii Approach';

    // Seven low, regular treads connect the arrival landing to the grass.
    // Their visual tops, physics groundAt() bands, and platform boxes share
    // the same constants so there is no invisible ramp or paw clipping.
    for (let i = 0; i < STEP_COUNT; i++) {
      const top = Math.max(ENTRY_Y, MEADOW_Y - i * STEP_RISE);
      const z0 = CORRIDOR_Z0 + i * STEP_RUN;
      const width = 5.7 - i * 0.09;
      const slab = box(width, 0.34, STEP_RUN + 0.08, this.MAT.stoneWarm,
        0, top - 0.17, z0 + STEP_RUN * 0.5);
      slab.name = `Overlook Step ${i + 1}`;
      approach.add(slab);
      this.addPlatformBox(-width * 0.5, top, z0, width * 0.5, top - 0.5, z0 + STEP_RUN);
    }

    const landingZ = CORRIDOR_Z0 + STEP_COUNT * STEP_RUN;
    const landingDepth = CORRIDOR_Z1 - landingZ + 0.35;
    const landing = box(5.25, 0.45, landingDepth, this.MAT.stoneWarm,
      0, ENTRY_Y - 0.225, landingZ + landingDepth * 0.5);
    landing.name = 'Overlook Torii Landing';
    approach.add(landing);
    this.addPlatformBox(-2.62, ENTRY_Y, landingZ, 2.62, ENTRY_Y - 0.65, CORRIDOR_Z1 + 0.35);

    // Rope rails echo the reference image while leaving every tread fully
    // walkable. The corridor constraint supplies the safety boundary.
    const postGeo = new THREE.CylinderGeometry(0.07, 0.1, 1.05, 7);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x58432e, roughness: 1 });
    for (const side of [-1, 1]) {
      const high = [];
      const low = [];
      for (let i = 0; i <= STEP_COUNT; i++) {
        const z = CORRIDOR_Z0 + i * STEP_RUN;
        const stepIndex = Math.min(STEP_COUNT - 1, i);
        const top = Math.max(ENTRY_Y, MEADOW_Y - stepIndex * STEP_RISE);
        const x = side * (2.95 - i * 0.045);
        const post = new THREE.Mesh(postGeo, this.MAT.timberDark);
        post.position.set(x, top + 0.52, z + 0.22);
        post.rotation.z = -side * 0.025;
        post.castShadow = true;
        approach.add(post);
        high.push(new THREE.Vector3(x, top + 0.96, z + 0.22));
        low.push(new THREE.Vector3(x, top + 0.62, z + 0.22));
      }
      for (const points of [high, low]) {
        const rope = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 44, 0.026, 5, false),
          ropeMat
        );
        approach.add(rope);
      }
    }

    const torii = new THREE.Group();
    torii.name = 'Overlook Entrance Torii';
    const toriiScale = 0.82;
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.29, 4.6, 10);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(pillarGeo, this.MAT.vermilion);
      pillar.position.set(side * 1.8, 2.3, 0);
      pillar.castShadow = true;
      torii.add(pillar);
      const pillarX = side * 1.8 * toriiScale;
      this.addColliderBox(pillarX - 0.27, ENTRY_Y, GATE_Z - 0.27,
        pillarX + 0.27, ENTRY_Y + 3.86, GATE_Z + 0.27);
    }
    torii.add(box(5.7, 0.32, 0.42, this.MAT.vermilion, 0, 4.72, 0));
    torii.add(box(6.25, 0.25, 0.5, this.MAT.vermilion, 0, 5.12, 0));
    torii.add(box(0.86, 0.28, 0.3, this.MAT.vermilion, 0, 4.42, 0));
    torii.add(box(6.35, 0.1, 0.52, this.MAT.stoneDark, 0, 5.31, 0));
    torii.scale.setScalar(toriiScale);
    torii.position.set(0, ENTRY_Y, GATE_Z);
    approach.add(torii);
    this.torii = torii;

    // Small stone lanterns make the lower landing feel intentional without
    // turning this quiet threshold into another shrine objective.
    for (const side of [-1, 1]) {
      const lantern = new THREE.Group();
      lantern.add(box(0.5, 0.2, 0.5, this.MAT.stone, 0, 0.1, 0));
      lantern.add(box(0.16, 0.85, 0.16, this.MAT.stone, 0, 0.58, 0));
      lantern.add(box(0.46, 0.14, 0.46, this.MAT.stone, 0, 1.04, 0));
      lantern.add(box(0.3, 0.3, 0.3, this.MAT.lanternGlow, 0, 1.27, 0));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), this.MAT.stoneDark);
      cap.position.y = 1.56;
      cap.rotation.y = Math.PI / 4;
      lantern.add(cap);
      lantern.position.set(side * 2.15, ENTRY_Y, 18.15);
      approach.add(lantern);
    }

    this.group.add(approach);
    this.vistaApproach = approach;
  }

  // Kept as source reference for the former oversized rear approach. It is
  // deliberately not built: arrival now happens through the ocean-side gate.
  buildLegacyRearGate() {
    const g = this.group;
    // Earthen stair notch: grass shoulders drop to a stepped stone path that
    // ends on a small landing carrying the torii — the only way back down.
    const stepMat = this.MAT.stoneWarm;
    const stepTops = [-0.32, -0.64, -0.96, -1.28, -1.56];
    for (let i = 0; i < stepTops.length; i++) {
      const z = -30.6 - i * 1.62;
      const slab = box(6.4 - i * 0.12, 0.5, 1.7, stepMat, 0, stepTops[i] - 0.25, z);
      slab.name = `Summit Step ${i + 1}`;
      g.add(slab);
      this.addPlatformBox(-3.2 + i * 0.06, stepTops[i], z - 0.9, 3.2 - i * 0.06, stepTops[i] - 1.2, z + 0.9);
    }
    // Landing under the gate
    const land = box(7.0, 0.5, 9.6, stepMat, 0, -1.85, -43.6);
    land.name = 'Summit Gate Landing';
    g.add(land);
    this.addPlatformBox(-3.45, -1.6, -48.2, 3.45, -2.4, -38.6);

    // Stone curbs flanking the stair corridor
    for (const s of [-1, 1]) {
      const curb = box(0.55, 1.5, 20.5, this.MAT.stoneDark, s * 3.6, -1.1, -38.5);
      curb.rotation.z = -s * 0.05;
      g.add(curb);
      this.addColliderBox(s * 3.6 - 0.5, -2.2, -48.6, s * 3.6 + 0.5, 1.2, -29);
    }

    // The torii — same silhouette language as the valley gate, no climb pegs.
    const torii = new THREE.Group();
    torii.name = 'Summit Torii';
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.6, 10);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeo, this.MAT.vermilion);
      p.position.set(s * 1.8, 2.3, 0);
      p.castShadow = true;
      torii.add(p);
      this.addColliderBox(s * 1.8 - 0.32, -1.6, GATE_Z - 0.32, s * 1.8 + 0.32, 3.0, GATE_Z + 0.32);
    }
    torii.add(box(5.6, 0.32, 0.4, this.MAT.vermilion, 0, 4.75, 0));
    torii.add(box(6.2, 0.28, 0.5, this.MAT.vermilion, 0, 5.15, 0));
    torii.add(box(0.9, 0.3, 0.3, this.MAT.vermilion, 0, 4.45, 0));
    torii.add(box(6.3, 0.1, 0.52, this.MAT.stoneDark, 0, 5.34, 0));
    // Small hanging lantern plaques flanking the gate
    torii.position.set(0, -1.6, GATE_Z);
    g.add(torii);
    this.torii = torii;

    // A pair of weathered toro lanterns marking the descent
    for (const s of [-1, 1]) {
      const l = new THREE.Group();
      l.name = 'Summit Toro Lantern';
      l.add(box(0.55, 0.25, 0.55, this.MAT.stone, 0, 0.12, 0));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.0, 8), this.MAT.stone);
      post.position.y = 0.72;
      post.castShadow = true;
      l.add(post);
      l.add(box(0.5, 0.15, 0.5, this.MAT.stone, 0, 1.3, 0));
      l.add(box(0.34, 0.34, 0.34, this.MAT.lanternGlow, 0, 1.55, 0));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.34, 4), this.MAT.stoneDark);
      cap.position.y = 1.9;
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      l.add(cap);
      l.position.set(s * 2.6, -1.6, -41.8);
      l.rotation.y = this.rng() * 0.5;
      g.add(l);
      this.addColliderBox(s * 2.6 - 0.35, -1.6, -42.15, s * 2.6 + 0.35, 0.6, -41.45);
    }

    // Gorinto stone marker — the quiet grave-stone silhouette at the landing's edge
    const gorinto = new THREE.Group();
    gorinto.name = 'Summit Gorinto';
    gorinto.add(box(0.5, 0.22, 0.5, this.MAT.stoneDark, 0, 0.11, 0));
    gorinto.add(box(0.34, 0.3, 0.34, this.MAT.stone, 0, 0.37, 0));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), this.MAT.stone);
    ball.position.y = 0.64;
    gorinto.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 12), this.MAT.stone);
    ring.position.y = 0.86;
    gorinto.add(ring);
    const capc = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), this.MAT.stoneDark);
    capc.position.y = 1.08;
    gorinto.add(capc);
    gorinto.position.set(2.9, -1.6, -46.4);
    g.add(gorinto);
    this.addColliderBox(2.55, -1.6, -46.75, 3.25, -0.4, -46.05);

    // The path "continues" past the gate: three descending slabs that
    // dissolve into the cloud bank — pure scenery beyond the trigger line.
    for (let i = 0; i < 3; i++) {
      const s = box(5.4 - i, 0.4, 1.5, stepMat, 0, -2.0 - i * 0.42, -46.2 - i * 1.5);
      s.material = this.MAT.stoneDark;
      g.add(s);
    }
  }

  buildVistaApproach() {
    // A second, purely scenic stair cuts down the sunny face of the hill.
    // It is the strong central line in the reference: meadow -> torii ->
    // tiled neighbourhood -> pagoda -> bay.  The playable boundary ends
    // before the drop, so these slabs never become accidental platforms.
    const g = new THREE.Group();
    g.name = 'Vista Descent';
    const stepMat = this.MAT.stoneWarm;
    for (let i = 0; i < 15; i++) {
      const z = 25.4 + i * 1.38;
      const y = i < 5 ? 0.24 - i * 0.025 : 0.14 - (i - 4) * 0.31;
      const w = 5.2 - i * 0.065;
      const slab = box(w, 0.34, 1.52, stepMat, 0, y, z);
      slab.rotation.y = (this.rng() - 0.5) * 0.035;
      slab.rotation.z = (this.rng() - 0.5) * 0.02;
      g.add(slab);
    }

    const postMat = this.MAT.timberDark;
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x5b4933, roughness: 1 });
    const postGeo = new THREE.CylinderGeometry(0.075, 0.105, 1.15, 7);
    for (const side of [-1, 1]) {
      const points = [];
      for (let i = 0; i < 7; i++) {
        const z = 26.0 + i * 3.05;
        const stairY = z < 31.5 ? 0.16 : 0.16 - (z - 31.5) * 0.225;
        const y = stairY + 0.56;
        const x = side * (3.35 - i * 0.035);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(x, y, z);
        post.rotation.z = -side * 0.025;
        post.castShadow = true;
        g.add(post);
        points.push(new THREE.Vector3(x, y + 0.44, z));
      }
      // A slightly sagging twin rope reads at distance without thick rails.
      for (const dy of [0, -0.34]) {
        const sagged = points.map((p, i) => p.clone().add(new THREE.Vector3(0,
          dy - (i > 0 && i < points.length - 1 ? 0.13 : 0), 0)));
        const rope = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sagged), 42, 0.025, 5, false),
          ropeMat
        );
        g.add(rope);
      }
    }

    // The vermilion gate sits below the brow so it never competes with the
    // exit gate behind the player; from the meadow it frames the pagoda.
    const torii = new THREE.Group();
    torii.name = 'Vista Torii';
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.24, 4.2, 10);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(pillarGeo, this.MAT.vermilion);
      pillar.position.set(side * 1.65, 2.05, 0);
      pillar.castShadow = true;
      torii.add(pillar);
    }
    torii.add(box(5.2, 0.3, 0.38, this.MAT.vermilion, 0, 4.2, 0));
    torii.add(box(5.75, 0.22, 0.45, this.MAT.vermilion, 0, 4.58, 0));
    torii.add(box(0.72, 0.26, 0.28, this.MAT.vermilion, 0, 3.88, 0));
    torii.position.set(0, -2.9, 43.2);
    g.add(torii);

    g.position.x = -7.0;
    this.group.add(g);
    this.vistaApproach = g;
  }

  /* ================= Flora ================= */

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
    tufts.castShadow = tufts.receiveShadow = true;
    crown.add(tufts);
    const set = this.cardSets[kind];
    const cards = new THREE.Mesh(built.cards, set.material);
    cards.customDepthMaterial = set.depth;
    cards.castShadow = cards.receiveShadow = true;
    crown.add(cards);
    tree.add(crown);
    this.swayables.push({ node: crown, amp: opts.sway || 0.035, freq: 0.8 + this.rng() * 0.6, phase: this.rng() * 6 });

    this.group.add(tree);
    const r = (opts.collider || 0.34) * scale;
    this.addColliderBox(x - r, 0, z - r, x + r, 5, z + r);
    return tree;
  }

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
      sway: 0.045, collider: 0.48
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
  }

  /* ================= Dense wind grass ================= */

  buildGrassField() {
    const veg = this.game.vegetation;
    const bladeGeo = veg.bladeGeometry(4, 0.05, 1.0, 0.4, 1.3);
    this.grassMat = veg.grassMaterial();
    // High-altitude turf: drier, more olive-gold than the valley floor.
    this.grassMat.uniforms.uRootColor.value.setHex(0x557735);
    this.grassMat.uniforms.uMidColor.value.setHex(0x8eab4c);
    this.grassMat.uniforms.uTipColor.value.setHex(0xd5d978);
    this.grassMat.customProgramCacheKey = () => 'summit-grass';

    // Very dense turf — roughly twice the valley's blade count per metre.
    const chunks = [
      { cx: -6, cz: -6, size: 12, count: 1900 },
      { cx: 6, cz: -6, size: 12, count: 1900 },
      { cx: -6, cz: 6, size: 12, count: 1750 },
      { cx: 6, cz: 6, size: 12, count: 1750 }
    ];
    if (this.previewQuality) {
      for (const ch of chunks) ch.count = Math.max(120, Math.round(ch.count * 0.2));
    }
    const dummy = new THREE.Object3D();
    for (const ch of chunks) {
      const geo = bladeGeo.clone();
      const phases = new Float32Array(ch.count);
      const tints = new Float32Array(ch.count * 3);
      const widthScales = new Float32Array(ch.count);
      const curveAngles = new Float32Array(ch.count);
      const mesh = new THREE.InstancedMesh(geo, this.grassMat, ch.count);
      let placed = 0, guard = 0;
      while (placed < ch.count && guard < ch.count * 7) {
        guard++;
        const x = ch.cx - ch.size / 2 + this.rng() * ch.size;
        const z = ch.cz - ch.size / 2 + this.rng() * ch.size;
        if (Math.hypot(x, z) > 11.8) continue;
        if (Math.abs(x) < CORRIDOR_W + 0.32 && z > CORRIDOR_Z0 - 0.35) continue;
        if (Math.hypot(x - this.perchLocal.x, z - this.perchLocal.z) < 1.85) continue;
        if (this.meditationPath.some((stone) => Math.hypot(x - stone.x, z - stone.z) < stone.clearance)) continue;
        const patch = Math.sin(x * 0.14) * Math.cos(z * 0.16)
          + 0.55 * Math.sin(x * 0.31 + z * 0.25)
          + 0.3 * Math.cos((x - z) * 0.22);
        if (patch < -0.55 && this.rng() < 0.45) continue; // only the barest gaps
        let s = 0.24 + this.rng() * 0.22;
        if (patch > 0.35) s *= 1.25 + this.rng() * 0.48;
        let wScale = 0.4 + this.rng() * 0.3;
        if (this.rng() > 0.92) wScale = 0.85 + this.rng() * 0.35;
        dummy.position.set(x, MEADOW_Y, z);
        dummy.scale.set(1, s, 1);
        dummy.rotation.set(0, this.rng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(placed, dummy.matrix);
        phases[placed] = this.rng() * Math.PI * 2;
        widthScales[placed] = wScale;
        curveAngles[placed] = this.rng() * Math.PI * 2;
        const f = this.rng();
        let rM = 0.86 + this.rng() * 0.12, gM = 0.96 + this.rng() * 0.08, bM = 0.72 + this.rng() * 0.12;
        if (f < 0.3) { rM = 0.62 + this.rng() * 0.1; gM = 0.8 + this.rng() * 0.1; bM = 0.68 + this.rng() * 0.1; }
        else if (f > 0.82) { rM = 1.04 + this.rng() * 0.08; gM = 0.96 + this.rng() * 0.06; bM = 0.6 + this.rng() * 0.08; }
        const br = (0.74 + this.rng() * 0.26) * (patch > 0.35 ? 0.85 : 1);
        tints[placed * 3] = br * rM; tints[placed * 3 + 1] = br * gM; tints[placed * 3 + 2] = br * bM;
        placed++;
      }
      mesh.count = placed;
      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases.subarray(0, placed), 1));
      geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints.subarray(0, placed * 3), 3));
      geo.setAttribute('aWidthScale', new THREE.InstancedBufferAttribute(widthScales.subarray(0, placed), 1));
      geo.setAttribute('aCurveAngle', new THREE.InstancedBufferAttribute(curveAngles.subarray(0, placed), 1));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(ch.cx, 0.5, ch.cz), ch.size * 0.75 + 1);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.name = 'Summit Grass';
      this.group.add(mesh);
    }
  }

  makeSusukiTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const rnd = mulberry32(421);
    ctx.clearRect(0, 0, 64, 128);
    ctx.lineCap = 'round';
    // Fine divergent hairs create a feathery silhouette without adding a
    // forest of geometry. A crossed pair of these cards reads from all sides.
    for (let i = 0; i < 72; i++) {
      const rootX = 31 + (rnd() - 0.5) * 5;
      const rootY = 120 - rnd() * 18;
      const side = rnd() < 0.5 ? -1 : 1;
      const reach = (5 + rnd() * 22) * side * (0.35 + (1 - rootY / 128));
      const tipY = 9 + rnd() * 72;
      const alpha = 0.2 + rnd() * 0.55;
      ctx.strokeStyle = `rgba(238,226,194,${alpha})`;
      ctx.lineWidth = 0.55 + rnd() * 1.05;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.bezierCurveTo(rootX + reach * 0.18, rootY - 22, rootX + reach * 0.78, tipY + 13, rootX + reach, tipY);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(205,191,151,0.76)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(32, 126);
    ctx.bezierCurveTo(30, 88, 34, 46, 32, 5);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildSusukiAndFlowers() {
    // Pampas plumes — the signature wind instrument of a Japanese hilltop.
    const stalkGeo = new THREE.CylinderGeometry(0.014, 0.03, 1.7, 5);
    stalkGeo.translate(0, 0.85, 0);
    const plumeGeoA = new THREE.PlaneGeometry(0.22, 0.62);
    plumeGeoA.translate(0, 1.91, 0);
    const plumeGeoB = plumeGeoA.clone();
    plumeGeoB.rotateY(Math.PI / 2);
    const merged = mergeGeometries([stalkGeo, plumeGeoA, plumeGeoB], true);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x77794d, roughness: 0.96 });
    const plumeMat = new THREE.MeshStandardMaterial({
      map: this.makeSusukiTexture(), color: 0xeee4c9,
      emissive: 0x3c3323, emissiveIntensity: 0.06,
      roughness: 0.94, transparent: true, alphaTest: 0.08,
      depthWrite: false, side: THREE.DoubleSide
    });
    const susukiCount = this.previewQuality ? 24 : 92;
    const susuki = new THREE.InstancedMesh(merged, [stalkMat, plumeMat, plumeMat], susukiCount);
    const dummy = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < 700 && placed < susukiCount; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 5.2 + Math.sqrt(this.rng()) * 6.2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < CORRIDOR_W + 0.5 && z > CORRIDOR_Z0 - 0.4) continue;
      const s = 0.72 + this.rng() * 0.5;
      dummy.position.set(x, MEADOW_Y, z);
      dummy.scale.setScalar(s);
      dummy.rotation.set((this.rng() - 0.5) * 0.22, this.rng() * Math.PI * 2, -0.14 - this.rng() * 0.16); // all lean leeward
      dummy.updateMatrix();
      susuki.setMatrixAt(placed++, dummy.matrix);
    }
    susuki.count = placed;
    susuki.instanceMatrix.needsUpdate = true;
    susuki.castShadow = false;
    susuki.receiveShadow = true;
    susuki.name = 'Summit Susuki';
    this.group.add(susuki);

    // Sparse alpine wildflowers echoing the valley's palette
    const petalGeo = new THREE.CircleGeometry(0.044, 7);
    const parts = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const petal = petalGeo.clone();
      petal.rotateX(-Math.PI / 2 + 0.35);
      petal.rotateY(a);
      petal.translate(Math.cos(a) * 0.044, 0.27, Math.sin(a) * 0.044);
      parts.push(petal);
    }
    const centre = new THREE.SphereGeometry(0.022, 7, 5);
    centre.translate(0, 0.275, 0);
    parts.push(centre);
    const stem = new THREE.CylinderGeometry(0.006, 0.009, 0.28, 4);
    stem.translate(0, 0.14, 0);
    parts.push(stem);
    const flowerGeo = mergeGeometries(parts, false);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide, emissive: 0x222222, emissiveIntensity: 0.25 });
    const flowerCount = this.previewQuality ? 120 : 360;
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    const palette = [0xf288a8, 0xf7a8c4, 0x6478cc, 0x7894e6, 0xf5ba38, 0xffde59, 0xfffaee, 0xe8f0d8];
    const color = new THREE.Color();
    let fp = 0;
    const flowerPatches = [
      [5.0, 1.2], [1.0, 3.8], [-3.1, 4.4], [-6.7, 1.2],
      [7.6, 5.4], [-5.8, -4.2], [4.8, -4.8]
    ];
    for (let i = 0; i < 1900 && fp < flowerCount; i++) {
      let x, z;
      if (this.rng() < 0.7) {
        const patch = flowerPatches[Math.floor(this.rng() * flowerPatches.length)];
        x = patch[0] + (this.rng() + this.rng() - 1) * 4.6;
        z = patch[1] + (this.rng() + this.rng() - 1) * 3.8;
      } else {
        const a = this.rng() * Math.PI * 2;
        const r = 1.5 + Math.sqrt(this.rng()) * 8.8;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      }
      if (Math.hypot(x, z) > 10.5) continue;
      if (Math.abs(x) < CORRIDOR_W + 0.35 && z > CORRIDOR_Z0 - 0.4) continue;
      if (this.meditationPath.some((stone) => Math.hypot(x - stone.x, z - stone.z) < stone.clearance * 0.9)) continue;
      const s = 0.7 + this.rng() * 0.8;
      dummy.position.set(x, MEADOW_Y + 0.02, z);
      dummy.scale.set(s, s * (0.8 + this.rng() * 0.5), s);
      dummy.rotation.set((this.rng() - 0.5) * 0.25, this.rng() * Math.PI * 2, (this.rng() - 0.5) * 0.25);
      dummy.updateMatrix();
      flowers.setMatrixAt(fp, dummy.matrix);
      color.setHex(palette[Math.floor(this.rng() * palette.length)]);
      flowers.setColorAt(fp, color);
      fp++;
    }
    flowers.count = fp;
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    flowers.receiveShadow = true;
    flowers.name = 'Summit Wildflowers';
    this.group.add(flowers);
  }

  buildMeditationStone() {
    // A low warm stone beside the grassy sitting place. It sits off the main
    // view axis so it frames the cat instead of becoming a dark centre-screen
    // blob in the scenic camera.
    const geo = lumpyTuftGeometry(2, 91, 0.22);
    const stone = new THREE.Mesh(geo, this.MAT.stoneWarm);
    stone.scale.set(0.52, 0.14, 0.46);
    stone.position.set(5.25, MEADOW_Y + 0.065, 3.95);
    stone.rotation.y = 0.48;
    stone.castShadow = stone.receiveShadow = true;
    stone.name = 'Perch-side Warm Stone';
    this.group.add(stone);
    this.perchStone = stone;

    // A weather-softened ensō makes the stone feel placed with intention. It
    // stays decorative, as do the path stones below, so physics remains on the
    // shared grass plane and the cat never bumps over invisible ledges.
    const ensoMat = new THREE.MeshBasicMaterial({
      color: 0x655d4d, transparent: true, opacity: 0.52,
      depthWrite: false, side: THREE.DoubleSide
    });
    const enso = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 5, 28, Math.PI * 1.78), ensoMat);
    enso.rotation.x = -Math.PI / 2;
    enso.rotation.z = 0.36;
    enso.scale.set(1, 0.76, 1);
    enso.position.set(5.25, MEADOW_Y + 0.15, 3.95);
    enso.name = 'Weathered Enso';
    this.group.add(enso);

    // Five half-buried stones curve naturally from the top tread to the
    // sitting place. This is guidance made from landscape rather than UI.
    const defs = [
      [0.15, 7.72, 0.48, 0.36, -0.15],
      [0.62, 6.78, 0.43, 0.33, 0.22],
      [1.22, 5.88, 0.46, 0.34, -0.28],
      [1.94, 5.02, 0.42, 0.32, 0.34],
      [2.64, 4.2, 0.4, 0.3, -0.08]
    ];
    this.meditationPath = [];
    for (let i = 0; i < defs.length; i++) {
      const [x, z, sx, sz, rot] = defs[i];
      const step = new THREE.Mesh(geo, this.MAT.stoneWarm);
      step.scale.set(sx, 0.055 + i * 0.004, sz);
      step.position.set(x, MEADOW_Y + 0.018, z);
      step.rotation.y = rot;
      step.receiveShadow = true;
      step.name = `Meditation Path Stone ${i + 1}`;
      this.group.add(step);
      this.meditationPath.push({ x, z, clearance: Math.max(sx, sz) * 1.12 });
    }
  }

  makeFurinPaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 128);
    const paper = ctx.createLinearGradient(0, 0, 64, 128);
    paper.addColorStop(0, 'rgba(255,249,229,0.96)');
    paper.addColorStop(1, 'rgba(224,209,176,0.94)');
    ctx.fillStyle = paper;
    ctx.fillRect(4, 2, 56, 124);
    ctx.strokeStyle = 'rgba(65,102,101,0.62)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(19, 101);
    ctx.bezierCurveTo(28, 78, 26, 51, 42, 25);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(85,129,119,0.42)';
    ctx.lineWidth = 2;
    for (const [x, y, dx] of [[27, 76, -10], [31, 64, 12], [36, 47, -9]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + dx * 0.55, y - 5, x + dx, y - 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(177,61,43,0.72)';
    ctx.beginPath();
    ctx.arc(46, 106, 6, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * A quiet focal layer around the perch: canopy light, motes that gather as
   * the cat settles, and one glass furin. None of it is an objective marker;
   * it simply lets the meadow acknowledge stillness without putting a meter
   * or prompt over the view.
   */
  buildMeditationAtmosphere() {
    const poolMat = new THREE.MeshBasicMaterial({
      map: glowTexture(255, 226, 154, 64), color: 0xffdfa0,
      transparent: true, opacity: 0.035, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(this.perchLocal.x, MEADOW_Y + 0.024, this.perchLocal.z);
    pool.renderOrder = 2;
    pool.name = 'Meditation Sun Pool';
    this.group.add(pool);
    this.meditationPool = pool;
    this.meditationPoolMat = poolMat;

    const count = this.previewQuality ? 22 : 54;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this._meditationMoteAnchors = new Float32Array(count * 3);
    this._meditationMoteSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 0.65 + Math.sqrt(this.rng()) * 2.85;
      const x = this.perchLocal.x + Math.cos(a) * r;
      const y = 0.28 + this.rng() * 2.35;
      const z = this.perchLocal.z + Math.sin(a) * r;
      positions[i * 3] = this._meditationMoteAnchors[i * 3] = x;
      positions[i * 3 + 1] = this._meditationMoteAnchors[i * 3 + 1] = y;
      positions[i * 3 + 2] = this._meditationMoteAnchors[i * 3 + 2] = z;
      this._meditationMoteSeeds[i * 3] = this.rng() * 100;
      this._meditationMoteSeeds[i * 3 + 1] = 0.3 + this.rng() * 0.65;
      this._meditationMoteSeeds[i * 3 + 2] = 0.14 + this.rng() * 0.34;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.meditationMoteMat = new THREE.PointsMaterial({
      map: glowTexture(255, 239, 181, 40), color: 0xffe9b2,
      size: 0.12, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.meditationMotes = new THREE.Points(geo, this.meditationMoteMat);
    this.meditationMotes.name = 'Meditation Light Motes';
    this.meditationMotes.visible = false;
    this.group.add(this.meditationMotes);

    // A small Edo-style glass wind bell hangs from the old shade tree. Its
    // paper strip makes even a light gust readable from the seated camera.
    const furin = new THREE.Group();
    furin.name = 'Summit Furin';
    const threadMat = new THREE.MeshStandardMaterial({ color: 0x5b4431, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xaee7e6, emissive: 0x183b42, emissiveIntensity: 0.22,
      roughness: 0.18, metalness: 0.02, transparent: true, opacity: 0.62,
      depthWrite: false, side: THREE.DoubleSide
    });
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xf6ead0, emissive: 0x4d3218, emissiveIntensity: 0.12,
      map: this.makeFurinPaperTexture(), transparent: true, opacity: 0.94,
      roughness: 0.96, side: THREE.DoubleSide
    });
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.76, 5), threadMat);
    thread.position.y = 0.38;
    furin.add(thread);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.62), glassMat);
    bell.scale.y = 0.82;
    bell.position.y = -0.08;
    furin.add(bell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 5, 18), glassMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.14;
    furin.add(rim);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.MAT.gold);
    clapper.position.y = -0.2;
    furin.add(clapper);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.145, 0.54), paperMat);
    sail.position.y = -0.54;
    furin.add(sail);
    furin.position.set(4.55, 3.75, 5.1);
    furin.scale.setScalar(1.08);
    this.group.add(furin);
    this.furin = furin;
    this.furinSail = sail;
    this.furinClapper = clapper;
  }

  /* ================= The drop & the panorama ================= */

  buildSkirtAndVista() {
    // Mountain shoulder: the meadow's rim falls away into forested folds
    // that sink below the haze line.
    const skirt = new THREE.RingGeometry(11.8, 70, 112, 8);
    skirt.rotateX(-Math.PI / 2);
    const pos = skirt.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cGrass = new THREE.Color(0x7c9450);
    const cRock = new THREE.Color(0x767065);
    const cForest = new THREE.Color(0x3c5a30);
    const cHaze = new THREE.Color(0x9aa4c0);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const t = smoothstep(11.8, 55, r);
      let drop = MEADOW_Y - 39 * Math.pow(t, 1.45) - 5 * t;
      // Sink the mountain skin beneath the playable ocean-side stair rather
      // than letting a decorative ring slice across its lower treads.
      if (z > CORRIDOR_Z0 - 0.5 && Math.abs(x) < CORRIDOR_W + 1.8) {
        drop -= 3.4 * smoothstep(CORRIDOR_Z0 - 0.5, GATE_Z + 2, z);
      }
      const rough = (worldNoise(x, z, 0.05, 3, 17) - 0.5) * 6 * Math.min(1, t * 3);
      pos.setY(i, drop + rough);
      c.copy(cGrass).lerp(cRock, smoothstep(0.08, 0.4, t));
      c.lerp(cForest, smoothstep(0.3, 0.7, t) * (0.6 + worldNoise(x, z, 0.09, 2, 21) * 0.4));
      c.lerp(cHaze, smoothstep(0.55, 1, t) * 0.85);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    skirt.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    skirt.computeVertexNormals();
    const skirtMesh = new THREE.Mesh(skirt, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    skirtMesh.name = 'Summit Skirt';
    this.group.add(skirtMesh);

    // The panorama: Kyoto below, the Yodo river, Osaka's towers at the bay,
    // and the sea glint — painted once onto a curved matte backdrop.
    const tex = this.makeVistaTexture();
    // A continuous 210-degree cyclorama replaces the old bent plane. Its only
    // open edge sits behind the rear brush, so the seated view can pan across
    // Osaka, the bay, and the ocean without ever revealing a card boundary.
    const panoramaArc = Math.PI * 210 / 180;
    const geo = new THREE.CylinderGeometry(
      236, 236, 154, 128, 1, true,
      -panoramaArc * 0.5, panoramaArc
    );
    // Unlit by design: this is distant painted atmosphere, not a wall that
    // should flip from black to white as the directional light moves.
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.015,
      depthWrite: true, depthTest: true, fog: false,
      side: THREE.BackSide
    });
    const vista = new THREE.Mesh(geo, mat);
    vista.name = 'Kyoto–Osaka Vista';
    vista.position.set(0, 7, 0);
    vista.renderOrder = -10;
    this.group.add(vista);
    this.vista = vista;
    this.buildVistaFoliage();
  }

  /**
   * One continuous painterly panorama. The shoreline is an irregular path,
   * never a horizontal card edge, and roof / garden / road scale increases
   * toward the foreground to give Kyoto genuine basin depth.
   */
  makeVistaTexture() {
    const w = 1600, h = 640;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const rnd = mulberry32(1604);
    ctx.clearRect(0, 0, w, h);

    // The ocean is allowed to meet the live sky through the transparent top
    // of the cylinder. A deepening blue wash keeps it luminous, not grey.
    const seaTop = 150;
    const sea = ctx.createLinearGradient(0, seaTop, 0, 350);
    sea.addColorStop(0, 'rgba(117,199,235,0.88)');
    sea.addColorStop(0.38, 'rgba(67,157,207,0.97)');
    sea.addColorStop(1, 'rgba(39,119,174,0.98)');
    ctx.fillStyle = sea;
    ctx.fillRect(0, seaTop, w, 220);

    const ridge = (base, amp, color, step, seed, bottom) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, bottom);
      for (let x = 0; x <= w; x += step) {
        const broad = Math.sin(x * 0.006 + seed) * amp * 0.42;
        const shoulder = Math.sin(x * 0.018 + seed * 1.7) * amp * 0.18;
        const detail = worldNoise(x, seed * 71, 0.009, 3, seed) * amp * 0.75;
        ctx.lineTo(x, base - broad - shoulder - detail);
      }
      ctx.lineTo(w, bottom); ctx.closePath(); ctx.fill();
    };
    ridge(151, 22, 'rgba(145,195,216,0.66)', 24, 9, 229);
    ridge(177, 32, 'rgba(89,153,187,0.76)', 22, 17, 241);
    ridge(207, 39, 'rgba(49,111,153,0.88)', 18, 27, 252);

    // Long, fine water strokes and a broad sun path make the bay read as
    // kilometres of open water rather than a single coloured stripe.
    for (let i = 0; i < 420; i++) {
      const x = rnd() * w;
      const y = 208 + rnd() * 112;
      const sunLane = Math.max(0, 1 - Math.abs(x - 1260) / 330);
      const len = 3 + rnd() * (20 + sunLane * 58);
      ctx.strokeStyle = sunLane > 0.2
        ? `rgba(255,244,201,${0.12 + sunLane * 0.38})`
        : `rgba(198,232,242,${0.09 + rnd() * 0.18})`;
      ctx.lineWidth = 0.7 + rnd() * 1.3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (rnd() - 0.5) * 1.5); ctx.stroke();
    }
    // Tiny sails, ferries and wakes reward a long, quiet look at the water.
    for (let i = 0; i < 26; i++) {
      const x = 35 + rnd() * (w - 70), y = 224 + rnd() * 74;
      const s = 1.2 + rnd() * 2.5;
      ctx.fillStyle = rnd() < 0.25 ? 'rgba(212,76,51,0.82)' : 'rgba(250,248,229,0.9)';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.8); ctx.lineTo(x, y); ctx.lineTo(x + s * 1.65, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(45,82,105,0.78)';
      ctx.fillRect(x - s * 0.7, y, s * 2.6, Math.max(0.8, s * 0.38));
      ctx.strokeStyle = 'rgba(230,245,242,0.42)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x - s, y + 1.5); ctx.lineTo(x - s * (4 + rnd() * 4), y + 2.5); ctx.stroke();
    }

    // Osaka's shore sits beyond the near basin. Towers vary in width and
    // value, with harbour landmarks that stay subtle enough to feel distant.
    const osakaBase = 278;
    ctx.fillStyle = 'rgba(57,95,104,0.62)';
    ctx.beginPath();
    ctx.moveTo(760, osakaBase + 8);
    for (let x = 760; x <= 1588; x += 18) {
      ctx.lineTo(x, osakaBase + Math.sin(x * 0.021) * 4 + worldNoise(x, 7, 0.018, 2, 44) * 7);
    }
    ctx.lineTo(1588, 305); ctx.lineTo(760, 305); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 105; i++) {
      const bx = 770 + rnd() * 790;
      const bw = 3 + rnd() * 11;
      const landmark = rnd() < 0.12;
      const bh = 7 + rnd() * rnd() * (landmark ? 78 : 43);
      const blue = 133 + (rnd() * 33 | 0);
      ctx.fillStyle = `rgba(${blue - 22},${blue - 7},${blue + 8},${0.44 + rnd() * 0.28})`;
      ctx.fillRect(bx, osakaBase - bh, bw, bh);
      if (landmark) {
        ctx.fillStyle = 'rgba(197,210,213,0.54)';
        ctx.fillRect(bx + bw * 0.44, osakaBase - bh - 7, Math.max(1, bw * 0.12), 7);
      }
    }
    // Ferris wheel, port cranes and the long bay bridge.
    ctx.strokeStyle = 'rgba(213,223,226,0.68)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(1452, 250, 18, 0, Math.PI * 2); ctx.stroke();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath(); ctx.moveTo(1452, 250); ctx.lineTo(1452 + Math.cos(a) * 18, 250 + Math.sin(a) * 18); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(226,231,228,0.58)';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(910, 270); ctx.bezierCurveTo(1060, 247, 1200, 255, 1385, 270); ctx.stroke();
    for (let x = 960; x < 1350; x += 78) {
      ctx.beginPath(); ctx.moveTo(x, 263); ctx.lineTo(x, 277); ctx.stroke();
    }

    // An organic coastline masks the lower water. It removes the old hard
    // sea/city cutoff and gives beaches, inlets and wooded promontories.
    const coastY = (x) => 296 + Math.sin(x * 0.008 + 0.7) * 24 +
      Math.sin(x * 0.027) * 9 + (worldNoise(x, 91, 0.014, 3, 61) - 0.5) * 38;
    const cityWash = ctx.createLinearGradient(0, 285, 0, 535);
    cityWash.addColorStop(0, 'rgba(121,157,137,0.9)');
    cityWash.addColorStop(0.42, 'rgba(91,128,92,0.97)');
    cityWash.addColorStop(1, 'rgba(61,100,59,1)');
    ctx.fillStyle = cityWash;
    ctx.beginPath(); ctx.moveTo(0, coastY(0));
    for (let x = 0; x <= w; x += 12) ctx.lineTo(x, coastY(x));
    ctx.lineTo(w, 548); ctx.lineTo(0, 548); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(35,88,67,0.64)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, coastY(0));
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, coastY(x));
    ctx.stroke();
    for (let i = 0; i < 230; i++) {
      const x = rnd() * w, y = coastY(x) + (rnd() - 0.25) * 8;
      const r = 1.2 + rnd() * 4.2;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(46,103,63,0.68)' : 'rgba(75,126,68,0.58)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Pale road and river ribbons establish neighbourhood-scale structure
    // beneath the thousands of individual roofs.
    ctx.lineCap = 'round';
    for (let i = 0; i < 20; i++) {
      const y = 328 + i * 9 + (rnd() - 0.5) * 7;
      ctx.strokeStyle = `rgba(225,218,190,${0.16 + i * 0.006})`;
      ctx.lineWidth = 1 + i * 0.07;
      ctx.beginPath();
      ctx.moveTo(-20, y + Math.sin(i) * 14);
      ctx.bezierCurveTo(400, y - 24, 990, y + 31, 1620, y - 7); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(189,220,229,0.78)';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(40, 492); ctx.bezierCurveTo(330, 420, 760, 445, 1160, 328); ctx.stroke();
    ctx.strokeStyle = 'rgba(245,246,233,0.34)'; ctx.lineWidth = 2;
    ctx.stroke();

    // Dense roof field, depth-scaled and clustered around gardens rather than
    // evenly sprayed. Warm plaster and blue kawara tile echo the reference.
    for (let i = 0; i < 3100; i++) {
      const bx = rnd() * w;
      const minY = coastY(bx) + 8;
      const by = minY + Math.pow(rnd(), 0.74) * Math.max(8, 520 - minY);
      const near = smoothstep(300, 520, by);
      const bw = 2.4 + rnd() * (4.2 + near * 10.5);
      const bh = 1.4 + rnd() * (2.1 + near * 4.8);
      const warm = 161 + (rnd() * 45 | 0);
      ctx.fillStyle = `rgba(${warm},${warm - 12},${warm - 28},${0.42 + near * 0.38})`;
      ctx.fillRect(bx - bw * 0.42, by, bw * 0.84, bh * 1.15);
      const slate = 71 + (rnd() * 40 | 0);
      ctx.fillStyle = `rgba(${slate - 7},${slate + 3},${slate + 18},${0.55 + near * 0.37})`;
      ctx.beginPath();
      ctx.moveTo(bx - bw * 0.65, by);
      ctx.lineTo(bx, by - bh * (0.75 + rnd() * 0.45));
      ctx.lineTo(bx + bw * 0.65, by);
      ctx.closePath(); ctx.fill();
    }

    const gardenCols = [
      'rgba(39,91,45,0.82)', 'rgba(55,112,51,0.78)',
      'rgba(79,139,61,0.74)', 'rgba(117,162,73,0.64)'
    ];
    for (let i = 0; i < 430; i++) {
      const gx = rnd() * w;
      const gy = Math.max(coastY(gx) + 12, 316 + Math.pow(rnd(), 0.72) * 211);
      const near = smoothstep(315, 530, gy);
      const gr = 1.8 + rnd() * (2.5 + near * 6.2);
      ctx.fillStyle = rnd() < 0.055
        ? (rnd() < 0.5 ? 'rgba(239,174,190,0.78)' : 'rgba(249,215,202,0.75)')
        : gardenCols[Math.floor(rnd() * gardenCols.length)];
      for (let l = 0, n = 3 + Math.floor(rnd() * 4); l < n; l++) {
        const a = rnd() * Math.PI * 2, d = rnd() * gr;
        ctx.beginPath();
        ctx.arc(gx + Math.cos(a) * d, gy + Math.sin(a) * d * 0.48,
          gr * (0.48 + rnd() * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Readable cultural anchors: small vermilion gates and one five-storey
    // pagoda. They are details in the city, not giant foreground props.
    ctx.fillStyle = 'rgba(189,54,31,0.82)';
    for (let i = 0; i < 28; i++) {
      const tx = 35 + rnd() * (w - 70), ty = 350 + rnd() * 152;
      const s = 1.6 + rnd() * 2.8;
      ctx.fillRect(tx - s, ty - s * 2.4, s * 0.5, s * 2.4);
      ctx.fillRect(tx + s * 0.5, ty - s * 2.4, s * 0.5, s * 2.4);
      ctx.fillRect(tx - s * 1.3, ty - s * 2.8, s * 3.1, s * 0.48);
    }
    const pagX = 1142, pagY = 438;
    ctx.fillStyle = 'rgba(52,58,62,0.92)';
    for (let level = 0; level < 5; level++) {
      const width = 54 - level * 6;
      const py = pagY - level * 19;
      ctx.beginPath();
      ctx.moveTo(pagX - width * 0.58, py);
      ctx.lineTo(pagX, py - 7);
      ctx.lineTo(pagX + width * 0.58, py);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(pagX - width * 0.21, py, width * 0.42, 12);
    }
    ctx.fillRect(pagX - 1.5, pagY - 107, 3, 24);

    // Foreground forest overlaps every city layer with irregular crowns, so
    // the bottom of the cyclorama disappears into the real mountain skirt.
    const bands = [
      [493, 560, 'rgba(62,110,52,0.95)'],
      [536, 606, 'rgba(39,82,42,0.98)'],
      [582, 650, 'rgba(24,59,35,1)']
    ];
    for (let b = 0; b < bands.length; b++) {
      const [top, bottom, col] = bands[b];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, bottom);
      for (let x = 0; x <= w; x += 15) {
        const canopy = top + Math.sin(x * 0.025 + b) * 8 + worldNoise(x, top, 0.016, 3, 33 + b) * 24;
        ctx.lineTo(x, canopy);
      }
      ctx.lineTo(w, bottom); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 480; i++) {
        const sx = rnd() * w, sy = top + rnd() * (bottom - top);
        const sr = 1.2 + rnd() * (3 + b * 1.2);
        ctx.fillStyle = b === 0 ? 'rgba(114,151,72,0.28)' : 'rgba(15,47,31,0.25)';
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Transparent atmospheric feather into the live sky. Everything below
    // the feather remains fully opaque, so there are no rectangular cutoffs.
    const fade = ctx.createLinearGradient(0, 0, 0, 122);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.72, 'rgba(0,0,0,0.42)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fade; ctx.fillRect(0, 0, w, h);
    const sideFade = ctx.createLinearGradient(0, 0, w, 0);
    sideFade.addColorStop(0, 'rgba(0,0,0,0)');
    sideFade.addColorStop(0.075, 'rgba(0,0,0,1)');
    sideFade.addColorStop(0.925, 'rgba(0,0,0,1)');
    sideFade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sideFade; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    return tex;
  }

  /** Kept as a compact fallback reference while the new panorama settles. */
  makeVistaTextureLegacy() {
    const w = 1600, h = 640;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const rnd = mulberry32(1604);

    // Sky-melt top: transparent so the live sky dome shows through.
    ctx.clearRect(0, 0, w, h);

    // Three blue ranges sit beyond the water. Separate silhouettes and a
    // transparent upper edge stop the vista reading as one flat grey strip.
    const ridge = (base, amp, color, step, seed, bottom) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, bottom);
      for (let x = 0; x <= w; x += step) {
        const broad = Math.sin(x * 0.006 + seed) * amp * 0.42;
        const detail = worldNoise(x, seed * 71, 0.009, 3, seed) * amp;
        ctx.lineTo(x, base - broad - detail);
      }
      ctx.lineTo(w, bottom); ctx.closePath(); ctx.fill();
    };
    ridge(142, 23, 'rgba(122,174,207,0.7)', 34, 9, 238);
    ridge(166, 34, 'rgba(78,140,181,0.82)', 28, 17, 254);
    ridge(196, 44, 'rgba(50,108,150,0.9)', 24, 27, 276);

    // Distant sea band + glints
    let y0 = 180;
    const seaGrad = ctx.createLinearGradient(0, y0, 0, y0 + 90);
    seaGrad.addColorStop(0, 'rgba(105,188,230,0.96)');
    seaGrad.addColorStop(0.48, 'rgba(76,157,207,0.98)');
    seaGrad.addColorStop(1, 'rgba(132,185,210,0.98)');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, y0, w, 118);
    ctx.fillStyle = 'rgba(255,250,235,0.5)';
    for (let i = 0; i < 170; i++) {
      const gx = rnd() * w, gy = y0 + 8 + rnd() * 96;
      const lane = Math.max(0, 1 - Math.abs(gx - 1320) / 420);
      const gw = 7 + rnd() * (22 + lane * 58);
      ctx.fillStyle = `rgba(255,247,215,${0.15 + lane * 0.42})`;
      ctx.fillRect(gx, gy, gw, 1.2 + rnd());
    }

    // Osaka shoreline skyline — pale slate towers rising from the bay
    for (let i = 0; i < 46; i++) {
      const bx = w * 0.55 + rnd() * w * 0.42;
      const bw = 6 + rnd() * 14;
      const bh = 14 + rnd() * rnd() * 66;
      ctx.fillStyle = `rgba(${118 + rnd() * 30 | 0},${132 + rnd() * 26 | 0},${150 + rnd() * 24 | 0},${0.55 + rnd() * 0.3})`;
      ctx.fillRect(bx, y0 + 66 - bh, bw, bh);
      if (rnd() < 0.3) ctx.fillRect(bx + bw * 0.3, y0 + 66 - bh - 6, bw * 0.4, 6);
    }
    // A small ferris wheel on the harbour edge
    ctx.strokeStyle = 'rgba(140,150,168,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w * 0.93, y0 + 40, 16, 0, Math.PI * 2); ctx.stroke();

    // Kyoto basin: a wash of roofs fading toward the mountains
    const cityGrad = ctx.createLinearGradient(0, 252, 0, 472);
    cityGrad.addColorStop(0, 'rgba(169,174,166,0.84)');
    cityGrad.addColorStop(0.5, 'rgba(130,142,128,0.94)');
    cityGrad.addColorStop(1, 'rgba(91,113,83,0.98)');
    ctx.fillStyle = cityGrad;
    ctx.fillRect(0, 250, w, 230);
    // Dense field of small sunlit walls and blue-grey hipped roofs.
    for (let i = 0; i < 1850; i++) {
      const bx = rnd() * w;
      const by = 258 + Math.pow(rnd(), 0.68) * 216;
      const near = smoothstep(258, 474, by);
      const bw = 2.2 + rnd() * (4.5 + near * 8.5);
      const bh = 1.6 + rnd() * (2.5 + near * 4.2);
      const warm = 136 + (rnd() * 45 | 0);
      ctx.fillStyle = `rgba(${warm},${warm - 8},${warm - 18},${0.42 + near * 0.38})`;
      ctx.fillRect(bx - bw * 0.42, by, bw * 0.84, bh);
      const slate = 72 + (rnd() * 34 | 0);
      ctx.fillStyle = `rgba(${slate - 8},${slate},${slate + 12},${0.52 + near * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(bx - bw * 0.62, by);
      ctx.lineTo(bx, by - bh * (0.75 + rnd() * 0.45));
      ctx.lineTo(bx + bw * 0.62, by);
      ctx.closePath(); ctx.fill();
    }
    // Leafy temple gardens break up the roof field. A few pale blossom
    // crowns echo Kyoto's shrine grounds without turning the vista pink.
    const gardenCols = [
      'rgba(48,101,48,0.72)', 'rgba(69,126,55,0.68)',
      'rgba(90,145,65,0.62)', 'rgba(126,165,73,0.56)'
    ];
    for (let i = 0; i < 250; i++) {
      const gx = rnd() * w;
      const gy = 292 + Math.pow(rnd(), 0.76) * 190;
      const near = smoothstep(292, 482, gy);
      const gr = 2.1 + rnd() * (3.1 + near * 4.8);
      ctx.fillStyle = rnd() < 0.07
        ? (rnd() < 0.5 ? 'rgba(236,173,188,0.7)' : 'rgba(244,207,207,0.68)')
        : gardenCols[Math.floor(rnd() * gardenCols.length)];
      const lobes = 3 + Math.floor(rnd() * 4);
      for (let l = 0; l < lobes; l++) {
        const a = rnd() * Math.PI * 2;
        const d = rnd() * gr * 0.9;
        const lr = gr * (0.56 + rnd() * 0.52);
        ctx.beginPath();
        ctx.arc(gx + Math.cos(a) * d, gy + Math.sin(a) * d * 0.58, lr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Tiny vermilion shrine strokes remain legible through the greenery.
    ctx.fillStyle = 'rgba(185,56,34,0.76)';
    for (let i = 0; i < 22; i++) {
      const tx = 40 + rnd() * (w - 80), ty = 330 + rnd() * 122;
      const s = 2 + rnd() * 2.5;
      ctx.fillRect(tx - s, ty - s * 2.6, s * 0.55, s * 2.6);
      ctx.fillRect(tx + s * 0.45, ty - s * 2.6, s * 0.55, s * 2.6);
      ctx.fillRect(tx - s * 1.35, ty - s * 3.0, s * 3.1, s * 0.5);
    }
    // Temple roofs & the pagoda silhouette
    ctx.fillStyle = 'rgba(66,62,70,0.9)';
    const pagX = w * 0.31, pagY = 385;
    for (let t = 0; t < 5; t++) {
      const tw = 64 - t * 7;
      const py = pagY - t * 22;
      ctx.beginPath();
      ctx.moveTo(pagX - tw * 0.55, py);
      ctx.lineTo(pagX, py - 8);
      ctx.lineTo(pagX + tw * 0.55, py);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(pagX - tw * 0.25, py, tw * 0.5, 14);
    }
    ctx.fillRect(pagX - 2, pagY - 122, 4, 30);
    for (let i = 0; i < 26; i++) {
      const tx = rnd() * w, ty = 330 + rnd() * 118;
      ctx.fillStyle = 'rgba(80,74,82,0.75)';
      ctx.beginPath();
      ctx.moveTo(tx - 12, ty); ctx.lineTo(tx, ty - 7); ctx.lineTo(tx + 12, ty); ctx.closePath(); ctx.fill();
    }
    // The Yodo river — a pale ribbon crossing the city
    ctx.strokeStyle = 'rgba(214,226,232,0.8)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w * 0.04, 472);
    ctx.bezierCurveTo(w * 0.28, 388, w * 0.56, 382, w * 0.84, 292);
    ctx.stroke();

    // Forested foothills, three deepening bands toward the viewer
    const bands = [
      [446, 526, 'rgba(68,112,58,0.94)'],
      [500, 586, 'rgba(46,88,43,0.97)'],
      [558, 650, 'rgba(30,65,35,1)']
    ];
    for (const [top, bot, col] of bands) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, bot);
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, top + worldNoise(x, top, 0.012, 2, 33) * 26);
      }
      ctx.lineTo(w, bot);
      ctx.closePath();
      ctx.fill();
      // tree speckle
      ctx.fillStyle = 'rgba(38,56,34,0.5)';
      for (let i = 0; i < 360; i++) {
        const sx = rnd() * w, sy = top + rnd() * (bot - top);
        const sr = 1.5 + rnd() * 4;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Melt the top edge into the dome
    const fade = ctx.createLinearGradient(0, 0, 0, 130);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fade;
    // Fill the whole canvas: after the last colour stop the mask remains
    // opaque, preserving the bay/city/forest below the softened top edge.
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    return tex;
  }

  buildVistaFoliage() {
    // Low-poly crowns bridge the dimensional meadow and painted panorama.
    // Their parallax is subtle but crucial: the city now sits *inside* a
    // wooded Kyoto basin instead of on the same flat card as the sky.
    const crownGeo = new THREE.IcosahedronGeometry(1, 1);
    const mats = [
      new THREE.MeshLambertMaterial({ color: 0x315f35 }),
      new THREE.MeshLambertMaterial({ color: 0x4f7d3d }),
      new THREE.MeshLambertMaterial({ color: 0x6d9448 })
    ];
    const counts = this.previewQuality ? [20, 18, 16] : [72, 62, 54];
    const dummy = new THREE.Object3D();
    this.vistaForest = [];
    for (let layer = 0; layer < counts.length; layer++) {
      const mesh = new THREE.InstancedMesh(crownGeo, mats[layer], counts[layer]);
      let placed = 0, guard = 0;
      while (placed < counts[layer] && guard++ < counts[layer] * 12) {
        const z = 21 + this.rng() * 44;
        const spread = 18 + (z - 21) * 0.58;
        const x = (this.rng() - 0.5) * spread * 2;
        // Preserve the broad ocean aperture while building irregular wooded
        // shoulders at the sides of the overlook.
        const aperture = 8.5 + (z - 21) * 0.18;
        if (Math.abs(x) < aperture && this.rng() < 0.9) continue;
        const downhill = -3.4 - (z - 21) * 0.16;
        const s = (1.15 + this.rng() * 2.2) * (1 - layer * 0.08);
        dummy.position.set(x, downhill + (this.rng() - 0.5) * 2.8 + s, z);
        dummy.rotation.set((this.rng() - 0.5) * 0.08, this.rng() * Math.PI * 2, (this.rng() - 0.5) * 0.08);
        dummy.scale.set(s * (0.82 + this.rng() * 0.35), s * (0.8 + this.rng() * 0.5), s);
        dummy.updateMatrix();
        mesh.setMatrixAt(placed++, dummy.matrix);
      }
      mesh.count = placed;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.name = `Vista Forest Layer ${layer + 1}`;
      this.group.add(mesh);
      this.vistaForest.push(mesh);
    }
  }

  loadVistaLandmarks() {
    // Authored in Blender, merged to one mesh with six material primitives.
    // The panorama remains a graceful fallback if a local asset is missing.
    const loader = new GLTFLoader();
    loader.load(SUMMIT_LANDMARKS_SRC, (gltf) => {
      const landmark = gltf.scene;
      landmark.name = 'Blender Kyoto Roofscape';
      landmark.position.set(-7, -7.2, 63);
      landmark.rotation.y = Math.PI;
      landmark.scale.setScalar(0.5);
      landmark.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false;
        o.receiveShadow = false;
        o.frustumCulled = true;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of materials) {
          if (!mat) continue;
          mat.roughness = Math.max(0.72, mat.roughness == null ? 0.9 : mat.roughness);
          mat.envMapIntensity = 0.28;
          if (mat.name && mat.name.includes('plaster')) mat.color.multiplyScalar(0.58);
          if (mat.name && mat.name.includes('kawara')) mat.color.multiplyScalar(0.7);
        }
      });
      this.group.add(landmark);
      this.vistaLandmarks = landmark;
    }, undefined, (error) => {
      console.warn('Summit landmark layer could not be loaded; using the painted vista fallback.', error);
    });
  }

  buildSummitClouds() {
    // A few local cumulus that drift through the saddle — the sky's own
    // clouds stay near the valley, so the summit keeps its own weather.
    this.summitClouds = [];
    const defs = [
      // One towering sunlit mass over the right-hand bay, balanced by
      // smaller high puffs. Keeping every belly above the ridge preserves a
      // clean, uninterrupted strip of ocean from the meditation perch.
      [-92, 64, 194, 58, 25, 0.68],
      [58, 76, 212, 76, 32, 0.78],
      [126, 51, 190, 48, 20, 0.56],
      [-146, 88, 222, 42, 18, 0.48]
    ];
    for (let i = 0; i < defs.length; i++) {
      const tex = this.game.sky.buildCloudTexture(3 + i);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: defs[i][5],
        fog: false, depthWrite: false
      }));
      const [x, y, z, sx, sy] = defs[i];
      spr.position.set(x, y, z);
      spr.scale.set(sx, sy, 1);
      this.group.add(spr);
      this.summitClouds.push({
        spr,
        speed: 0.24 + this.rng() * 0.24,
        minX: -190 - sx,
        maxX: 190 + sx
      });
    }
  }

  /**
   * Summit-local snow. The valley's snowfall is a scene child and gets hidden
   * by setValleyVisible(), so a mountain-top 'snow' weather would otherwise
   * render nothing at all. This one lives in the summit group and drifts with
   * the same gusts as the grass.
   */
  buildSummitSnow() {
    const count = 620;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this._snowSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (this.rng() - 0.5) * 62;
      pos[i * 3 + 1] = this.rng() * 26;
      pos[i * 3 + 2] = (this.rng() - 0.5) * 62;
      this._snowSeeds[i * 3] = this.rng() * 100;              // phase
      this._snowSeeds[i * 3 + 1] = 0.55 + this.rng() * 0.7;   // fall speed
      this._snowSeeds[i * 3 + 2] = 0.6 + this.rng() * 0.9;    // flutter amp
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 12, 0), 60);
    this.snowMat = new THREE.PointsMaterial({
      map: glowTexture(255, 255, 255, 48),
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.snow = new THREE.Points(geo, this.snowMat);
    this.snow.name = 'Summit Snowfall';
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.group.add(this.snow);
  }

  /** Scatter the live flakes through the column above the cat. */
  reseedSnow() {
    const sp = this.snow.geometry.attributes.position;
    const cx = this._localPlayer.x, cz = this._localPlayer.z;
    for (let i = 0; i < sp.count; i++) {
      sp.setXYZ(
        i,
        cx + (this.rng() - 0.5) * 66,
        this.rng() * 26,
        cz + (this.rng() - 0.5) * 66
      );
    }
    sp.needsUpdate = true;
  }

  buildPollen() {
    // Grass pollen / seeds riding the gusts — visible wind.
    const count = 90;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (this.rng() - 0.5) * 56;
      pos[i * 3 + 1] = 0.15 + this.rng() * 2.6;
      pos[i * 3 + 2] = (this.rng() - 0.5) * 56;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: glowTexture(255, 246, 214, 32),
      size: 0.14, transparent: true, opacity: 0.65,
      depthWrite: false, blending: THREE.AdditiveBlending,
      color: 0xfff3c8
    });
    this.pollen = new THREE.Points(geo, mat);
    this.pollen.name = 'Summit Pollen';
    this.group.add(this.pollen);
  }

  makePetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    const blush = ctx.createRadialGradient(13, 13, 1, 16, 16, 14);
    blush.addColorStop(0, 'rgba(255,249,244,1)');
    blush.addColorStop(0.55, 'rgba(249,185,203,0.96)');
    blush.addColorStop(1, 'rgba(222,116,151,0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.ellipse(16, 16, 7.5, 13, -0.48, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** A sparse ribbon of petals blown from the sakura across the clearing. */
  buildSakuraPetals() {
    const count = this.previewQuality ? 26 : 76;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this._petalSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -12 + this.rng() * 24;
      positions[i * 3 + 1] = 0.22 + this.rng() * 5.6;
      positions[i * 3 + 2] = -4 + this.rng() * 15;
      this._petalSeeds[i * 3] = this.rng() * Math.PI * 2;
      this._petalSeeds[i * 3 + 1] = 0.28 + this.rng() * 0.5;
      this._petalSeeds[i * 3 + 2] = 0.16 + this.rng() * 0.32;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2.8, 3.5), 19);
    this.petalMat = new THREE.PointsMaterial({
      map: this.makePetalTexture(), color: 0xffcad8,
      size: 0.16, transparent: true, opacity: 0.7,
      depthWrite: false, sizeAttenuation: true
    });
    this.petals = new THREE.Points(geo, this.petalMat);
    this.petals.name = 'Summit Sakura Drift';
    this.group.add(this.petals);
  }

  /* ================= Quiet summit wildlife ================= */

  butterflyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    const wing = ctx.createRadialGradient(18, 28, 2, 18, 28, 19);
    wing.addColorStop(0, 'rgba(255,255,244,1)');
    wing.addColorStop(0.58, 'rgba(255,236,166,0.96)');
    wing.addColorStop(1, 'rgba(255,205,92,0)');
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.ellipse(17, 28, 16, 23, -0.24, 0, Math.PI * 2);
    ctx.ellipse(47, 28, 16, 23, 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(65,43,27,0.9)';
    ctx.beginPath();
    ctx.ellipse(32, 33, 2.4, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildAmbientWildlife() {
    // Butterflies are one inexpensive point cloud whose whole visit fades in
    // and out. Anchors are kept separately so their drift never accumulates
    // away from the flowers during a long meditation.
    const butterflyCount = this.previewQuality ? 8 : 18;
    const butterflyGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(butterflyCount * 3);
    const colors = new Float32Array(butterflyCount * 3);
    this._butterflyAnchors = new Float32Array(butterflyCount * 3);
    this._butterflySeeds = new Float32Array(butterflyCount * 3);
    const palette = [0xffd34e, 0x73c9ff, 0xff91b5, 0xd9f278, 0xf7f0e5];
    const color = new THREE.Color();
    for (let i = 0; i < butterflyCount; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 1.5 + Math.sqrt(this.rng()) * 5.6;
      const x = this.perchLocal.x + Math.cos(a) * r;
      const z = this.perchLocal.z + Math.sin(a) * r;
      const y = 0.65 + this.rng() * 1.15;
      positions[i * 3] = this._butterflyAnchors[i * 3] = x;
      positions[i * 3 + 1] = this._butterflyAnchors[i * 3 + 1] = y;
      positions[i * 3 + 2] = this._butterflyAnchors[i * 3 + 2] = z;
      this._butterflySeeds[i * 3] = this.rng() * 100;
      this._butterflySeeds[i * 3 + 1] = 0.55 + this.rng() * 0.65;
      this._butterflySeeds[i * 3 + 2] = 0.35 + this.rng() * 0.55;
      color.setHex(palette[Math.floor(this.rng() * palette.length)]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    butterflyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    butterflyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.butterflyMat = new THREE.PointsMaterial({
      map: this.butterflyTexture(), size: 0.34, transparent: true, opacity: 0,
      depthWrite: false, vertexColors: true, sizeAttenuation: true
    });
    this.butterflies = new THREE.Points(butterflyGeo, this.butterflyMat);
    this.butterflies.name = 'Summit Butterfly Visitors';
    this.butterflies.frustumCulled = false;
    this.butterflies.visible = false;
    this.group.add(this.butterflies);

    // A tiny pool of individually articulated birds. They stay hidden until
    // a seeded fly-by, then cross the bay in loose formation and park again.
    const wingGeo = summitBirdWingGeometry();
    const tailGeo = summitBirdTailGeometry();
    const bodyGeo = new THREE.SphereGeometry(0.23, 8, 6);
    const headGeo = new THREE.SphereGeometry(0.135, 8, 6);
    const beakGeo = new THREE.ConeGeometry(0.045, 0.15, 6);
    const birdColors = [
      [0x315f82, 0x8fc6df, 0xe8a33b], // kingfisher blue
      [0xf0eee5, 0xc8d1d4, 0xd6a642], // pale gull
      [0x4b4039, 0x9a6f54, 0xc89335], // mountain thrush
      [0x263c53, 0x718ba0, 0xe0a33d]
    ];
    this.summitBirds = [];
    for (let i = 0; i < 4; i++) {
      const [bodyCol, wingCol, beakCol] = birdColors[i % birdColors.length];
      const bodyMat = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.88, flatShading: true });
      const wingMat = new THREE.MeshStandardMaterial({ color: wingCol, roughness: 0.9, side: THREE.DoubleSide });
      const beakMat = new THREE.MeshStandardMaterial({ color: beakCol, roughness: 0.72 });
      const bird = new THREE.Group();
      bird.name = `Summit Fly-by Bird ${i + 1}`;
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(0.85, 0.68, 1.45);
      bird.add(body);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0, 0.045, 0.31);
      bird.add(head);
      const beak = new THREE.Mesh(beakGeo, beakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.025, 0.48);
      bird.add(beak);
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(0.04, 0.05, 0.06);
      bird.add(leftWing);
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.scale.x = -1;
      rightWing.position.set(-0.04, 0.05, 0.06);
      bird.add(rightWing);
      const tail = new THREE.Mesh(tailGeo, wingMat);
      tail.position.set(0, 0, -0.23);
      bird.add(tail);
      bird.visible = false;
      this.group.add(bird);
      this.summitBirds.push({
        mesh: bird, wings: [leftWing, rightWing], active: false, age: 0,
        duration: 0, direction: 1, startX: 0, baseY: 0, baseZ: 0,
        span: 0, depthDrift: 0, phase: this.rng() * Math.PI * 2
      });
    }
    this._birdLook = new THREE.Vector3();
    this._birdFlybyTimer = 5 + this.rng() * 7;
    this._butterflyVisitTimer = 2 + this.rng() * 4;
    this._butterflyVisit = 0;
  }

  startBirdFlyby() {
    const count = 1 + Math.floor(this.rng() * 3);
    const direction = this.rng() < 0.5 ? 1 : -1;
    const baseY = 7 + this.rng() * 8;
    const baseZ = 36 + this.rng() * 54;
    for (let i = 0; i < this.summitBirds.length; i++) {
      const bird = this.summitBirds[i];
      if (i >= count) {
        bird.active = false;
        bird.mesh.visible = false;
        continue;
      }
      bird.active = true;
      bird.age = -i * (0.32 + this.rng() * 0.24);
      bird.duration = 8 + this.rng() * 5;
      bird.direction = direction;
      bird.startX = direction > 0 ? -48 - i * 2.8 : 48 + i * 2.8;
      bird.baseY = baseY + i * 0.65 + (this.rng() - 0.5) * 1.2;
      bird.baseZ = baseZ + i * 2.6 + (this.rng() - 0.5) * 4;
      bird.span = 96 + this.rng() * 18;
      bird.depthDrift = (this.rng() - 0.5) * 18;
      bird.mesh.scale.setScalar(0.85 + this.rng() * 0.55);
      bird.mesh.visible = false;
    }
    this._birdFlybyTimer = 18 + this.rng() * 30;
  }

  updateAmbientWildlife(dt, t, sky) {
    const snowing = sky && (sky.weather === 'snow' || sky.targetWeather === 'snow');
    this._birdFlybyTimer -= dt;
    if (!snowing && this._birdFlybyTimer <= 0) this.startBirdFlyby();
    for (const bird of this.summitBirds) {
      if (!bird.active) continue;
      bird.age += dt;
      if (bird.age < 0) continue;
      const u = bird.age / bird.duration;
      if (u >= 1 || snowing) {
        bird.active = false;
        bird.mesh.visible = false;
        continue;
      }
      bird.mesh.visible = true;
      const x = bird.startX + bird.direction * bird.span * u;
      const y = bird.baseY + Math.sin(u * Math.PI) * 4.2 + Math.sin(t * 0.8 + bird.phase) * 0.45;
      const z = bird.baseZ + (u - 0.5) * bird.depthDrift + Math.sin(u * Math.PI * 2 + bird.phase) * 1.4;
      bird.mesh.position.set(x, y, z);
      this._birdLook.set(x + bird.direction * 3, y + Math.cos(u * Math.PI) * 0.3, z + bird.depthDrift * 0.025);
      bird.mesh.lookAt(this._birdLook);
      const flap = Math.sin(t * 11.5 + bird.phase) * 0.62;
      bird.wings[0].rotation.z = flap;
      bird.wings[1].rotation.z = -flap;
    }

    this._butterflyVisitTimer -= dt;
    if (!snowing && this._butterflyVisit <= 0 && this._butterflyVisitTimer <= 0) {
      this._butterflyVisit = 12 + this.rng() * 12;
      this._butterflyVisitTimer = this._butterflyVisit + 16 + this.rng() * 24;
    }
    if (this._butterflyVisit > 0) this._butterflyVisit -= dt;
    const butterflyTarget = !snowing && this._butterflyVisit > 0 ? 0.92 : 0;
    this.butterflyMat.opacity += (butterflyTarget - this.butterflyMat.opacity) * Math.min(1, dt * 1.6);
    this.butterflies.visible = this.butterflyMat.opacity > 0.015;
    if (this.butterflies.visible) {
      const bp = this.butterflies.geometry.attributes.position;
      for (let i = 0; i < bp.count; i++) {
        const seed = this._butterflySeeds[i * 3];
        const speed = this._butterflySeeds[i * 3 + 1];
        const range = this._butterflySeeds[i * 3 + 2];
        const ax = this._butterflyAnchors[i * 3];
        const ay = this._butterflyAnchors[i * 3 + 1];
        const az = this._butterflyAnchors[i * 3 + 2];
        bp.setXYZ(
          i,
          ax + Math.sin(t * speed + seed) * range + Math.cos(t * 0.43 + seed) * 0.25,
          ay + Math.sin(t * (1.2 + speed * 0.4) + seed * 1.7) * 0.32,
          az + Math.cos(t * speed * 0.82 + seed * 1.3) * range
        );
      }
      bp.needsUpdate = true;
    }
  }

  updateMeditationAtmosphere(dt, t, playing, sky) {
    const progress = clamp01(this.meditateT / MEDITATE_SECONDS);
    const target = this.cameraActive ? 0.24 + progress * 0.76 : 0;
    this._meditationGlow += (target - this._meditationGlow) * Math.min(1, dt * (target > 0 ? 0.75 : 1.8));
    const breath = this._reducedMotion ? 1 : 0.88 + Math.sin(t * 0.72) * 0.12;
    if (this.meditationPoolMat) {
      this.meditationPoolMat.opacity = 0.028 + this._meditationGlow * 0.105 * breath;
    }
    if (this.meditationMotes && this.meditationMoteMat) {
      this.meditationMoteMat.opacity = this._meditationGlow * 0.62;
      this.meditationMotes.visible = this.meditationMoteMat.opacity > 0.008;
      if (this.meditationMotes.visible) {
        const pos = this.meditationMotes.geometry.attributes.position;
        const motion = this._reducedMotion ? 0.16 : 1;
        for (let i = 0; i < pos.count; i++) {
          const seed = this._meditationMoteSeeds[i * 3];
          const speed = this._meditationMoteSeeds[i * 3 + 1];
          const range = this._meditationMoteSeeds[i * 3 + 2];
          const ax = this._meditationMoteAnchors[i * 3];
          const ay = this._meditationMoteAnchors[i * 3 + 1];
          const az = this._meditationMoteAnchors[i * 3 + 2];
          pos.setXYZ(
            i,
            ax + Math.sin(t * speed + seed) * range * motion,
            ay + Math.sin(t * (0.7 + speed * 0.35) + seed * 1.7) * 0.2 * motion,
            az + Math.cos(t * speed * 0.82 + seed * 1.3) * range * motion
          );
        }
        pos.needsUpdate = true;
      }
    }

    // The furin is a spatial reward, not a prompt: entering its little patch
    // of shade rings it once per summit visit, then the breeze keeps it alive
    // visually without repeatedly sounding as the cat circles the tree.
    if (this.furin) {
      const snowing = sky && (sky.weather === 'snow' || sky.targetWeather === 'snow');
      const gust = snowing ? 1.2 : 0.8;
      const motion = this._reducedMotion ? 0.18 : 1;
      this.furin.rotation.z = Math.sin(t * 1.15) * 0.075 * gust * motion;
      this.furin.rotation.x = Math.cos(t * 0.73) * 0.035 * gust * motion;
      this.furinSail.rotation.y = Math.sin(t * 1.7) * 0.48 * motion;
      this.furinClapper.position.x = Math.sin(t * 1.15 + 0.35) * 0.045 * gust * motion;
      const dx = this._localPlayer.x - this.furin.position.x;
      const dz = this._localPlayer.z - this.furin.position.z;
      const near = dx * dx + dz * dz < 8.2;
      if (playing && near && !this._furinNear && !this._furinChimed) {
        this._furinChimed = true;
        if (this.game.audio) this.game.audio.playDreamChime();
      }
      this._furinNear = near;
    }
  }

  updateSakuraPetals(dt, t, sky) {
    if (!this.petals || !this.petalMat) return;
    const snowing = sky && (sky.weather === 'snow' || sky.targetWeather === 'snow');
    const targetOpacity = snowing ? 0 : 0.7;
    this.petalMat.opacity += (targetOpacity - this.petalMat.opacity) * Math.min(1, dt * 1.2);
    this.petals.visible = this.petalMat.opacity > 0.01;
    if (!this.petals.visible) return;
    const pos = this.petals.geometry.attributes.position;
    const motion = this._reducedMotion ? 0.2 : 1;
    const gust = (0.52 + 0.16 * Math.sin(t * 0.31) + 0.1 * Math.sin(t * 0.83)) * motion;
    for (let i = 0; i < pos.count; i++) {
      const phase = this._petalSeeds[i * 3];
      const speed = this._petalSeeds[i * 3 + 1];
      const flutter = this._petalSeeds[i * 3 + 2];
      let x = pos.getX(i) + gust * speed * dt;
      let y = pos.getY(i) - (0.045 + speed * 0.035) * dt * motion + Math.sin(t * 1.7 + phase) * dt * flutter * motion;
      let z = pos.getZ(i) + Math.cos(t * 0.74 + phase) * dt * flutter * 0.45 * motion;
      if (x > 13 || y < 0.14 || z > 12.5 || z < -5.5) {
        x = -12.5 - this.rng() * 1.5;
        y = 1.1 + this.rng() * 4.9;
        z = -3.5 + this.rng() * 14;
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  resetAmbientWildlife() {
    if (this.butterflyMat) this.butterflyMat.opacity = 0;
    if (this.butterflies) this.butterflies.visible = false;
    this._butterflyVisit = 0;
    this._butterflyVisitTimer = 2 + this.rng() * 4;
    this._birdFlybyTimer = 5 + this.rng() * 7;
    for (const bird of this.summitBirds || []) {
      bird.active = false;
      bird.mesh.visible = false;
    }
  }

  /* ================= The shrine-side beacon ================= */

  /**
   * God-rays that bloom behind the valley shrine after the tenth bell —
   * the portal marker. This group lives in valley space (scene root),
   * not in the summit group, so it stays anchored to the shrine.
   */
  buildShrineRays() {
    const g = new THREE.Group();
    g.name = 'Shrine Summit Rays';
    const rayTex = this.makeRayTexture();
    const baseY = 0;
    // Fan of leaning shafts rising from behind the shrine roof — kept inside
    // the parted thicket's gap so the light reads through it.
    for (let i = 0; i < 9; i++) {
      const w = 1.6 + this.rng() * 2.6;
      const ray = new THREE.Mesh(
        new THREE.PlaneGeometry(w, 17 + this.rng() * 7),
        new THREE.MeshBasicMaterial({
          map: rayTex, transparent: true, opacity: 0.0,
          blending: THREE.AdditiveBlending, depthWrite: false,
          side: THREE.DoubleSide, fog: false
        })
      );
      const a = (i / 8 - 0.5) * 1.15;
      ray.position.set(Math.sin(a) * 6.8, baseY + 8.5, -39.4 - Math.abs(a) * 2);
      ray.rotation.z = a * 0.55;
      ray.rotation.y = a * 0.4;
      ray.userData.phase = this.rng() * Math.PI * 2;
      ray.userData.baseOpacity = 0.55 + this.rng() * 0.35;
      g.add(ray);
      this._rays = this._rays || [];
      this._rays.push(ray);
    }
    // A soft bloom in the gap — light flooding through, readable against
    // the fog where thin shafts alone would wash out.
    const bloom = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(255, 236, 190, 64), transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    bloom.position.set(0, baseY + 5.2, -38.6);
    bloom.scale.set(15, 10, 1);
    bloom.userData.phase = 1.7;
    bloom.userData.baseOpacity = 0.5;
    g.add(bloom);
    this._rays.push(bloom);
    // Ground glow where the light pools
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 28),
      new THREE.MeshBasicMaterial({
        map: glowTexture(255, 232, 176, 64), transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, baseY + 0.06, -40.4);
    pool.userData.phase = 0;
    pool.userData.baseOpacity = 0.55;
    g.add(pool);
    this._rays.push(pool);

    g.visible = false;
    this.scene.add(g);
    this.raysGroup = g;
  }

  makeRayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gx = ctx.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, 'rgba(255,238,190,0)');
    gx.addColorStop(0.5, 'rgba(255,238,190,0.85)');
    gx.addColorStop(1, 'rgba(255,238,190,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, 64, 256);
    const gy = ctx.createLinearGradient(0, 256, 0, 0);
    gy.addColorStop(0, 'rgba(255,255,255,1)');
    gy.addColorStop(0.75, 'rgba(255,255,255,0.55)');
    gy.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, 64, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ================= Keep-list for valley hiding ================= */

  markSkyKeepers() {
    const sky = this.game.sky;
    for (const o of [sky.dome, sky.stars, sky.moon, sky.sun, sky.sun.target,
      sky.hemi, sky.fill, sky.bounce, sky.bounce.target, ...(sky.clouds || [])]) {
      if (o) o.userData.skyKeep = true;
    }
    this.group.userData.skyKeep = true;
    this.game.player.mesh.userData.skyKeep = true;
  }

  setValleyVisible(visible) {
    for (const o of this.scene.children) {
      if (o.userData.skyKeep) continue;
      if (o === this.group || o === this.game.player.mesh) continue;
      if (!visible) {
        o.userData._summitHidden = o.visible;
        o.visible = false;
      } else if (o.userData._summitHidden !== undefined) {
        o.visible = o.userData._summitHidden;
        delete o.userData._summitHidden;
      }
    }
    if (visible) {
      // Anything added while away (e.g. async overrides) stays untouched.
      for (const o of this.scene.children) {
        if (o.userData._summitHidden !== undefined) {
          o.visible = o.userData._summitHidden;
          delete o.userData._summitHidden;
        }
      }
    }
  }

  /* ================= Unlock & transitions ================= */

  onBellRing() {
    this.bellRings++;
    if (!this.unlocked && this.bellRings === 9) {
      this.game.ui.showToast('The shrine seems to be listening…', 3000);
    }
    if (!this.unlocked && this.bellRings >= 10) {
      this.setUnlocked(true);
      return;
    }
    this.game.saveGame();
  }

  setUnlocked(on, silent = false) {
    this.unlocked = on;
    if (this.raysGroup) this.raysGroup.visible = on;
    if (on && silent) {
      // Restore-from-save: the thicket is already open — no animation.
      this._thicketOpen = 1;
      if (this.game.city && this.game.city.setShrineThicketOpen) {
        this.game.city.setShrineThicketOpen(1);
      }
    }
    if (on && !silent) {
      if (this.game.audio) this.game.audio.playMonkChoir();
      // A gentle look-up so the light reveal lands — the player can take
      // over at any time (a downward drag cancels it, never fought).
      this._revealT = 3.0;
      this._revealPitch = this.game.player.pitch || 0;
      this.game.ui.showToast('✦ The thicket parts — light spills from behind the shrine ✦', 5200);
      if (this.game.progression) this.game.progression.addXP(60, 'The tenth bell — a path of light');
      this.game.discover('places', { id: 'summit-path', text: 'Light gathers behind the shrine where the mountain leans close' });
      this.game.saveGame();
    }
  }

  /** Player walked into the light behind the shrine. */
  enter() {
    if (this.transitioning || this.active) return;
    this.transitioning = true;
    const g = this.game;
    g.controls.enabled = false;
    g.player.actionLocked = true;
    g.player.moveInput.set(0, 0);
    if (g.audio) g.audio.playMonkChoir();

    const overlay = document.getElementById('summit-transition');
    const video = document.getElementById('summit-video');
    let teleported = false;
    let finished = false;

    const doTeleport = () => {
      if (teleported) return;
      teleported = true;
      this.setActive(true);
      const p = g.player;
      // Arrive on the landing under the torii, looking up the steps into
      // the clearing with the vista beyond.
      p.mesh.position.set(this.origin.x, this.origin.y + ENTRY_Y, this.origin.z + GATE_Z + 1.6);
      p.heading = Math.PI; p.yaw = Math.PI; p.yawPrev = Math.PI;
      p.mesh.rotation.y = Math.PI;
      p.velocity.set(0, 0, 0);
      g.camera.position.set(this.origin.x, this.origin.y + ENTRY_Y + 1.9, this.origin.z + GATE_Z + 5.0);
      g.camera.lookAt(this.origin.x, this.origin.y + 0.35, this.origin.z + CORRIDOR_Z0 - 0.5);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('show', 'fallback', 'fade-out');
        if (video) { try { video.pause(); video.removeAttribute('src'); video.load(); } catch {} }
        this.transitioning = false;
        g.controls.enabled = true;
        g.player.actionLocked = false;
        g.ui.showToast('The Summit Clearing — only wind and sky live here.', 4200);
        g.saveGame();
      }, 1100);
    };

    if (overlay) {
      overlay.classList.remove('hidden', 'fade-out', 'fallback', 'quick', 'video-playing');
      overlay.classList.add('show');
      // Prefer the mp4 cinematic; if it is absent or unplayable the CSS
      // light-burst in index.html carries the transition instead.
      let videoPlaying = false;
      if (video) {
        // Attach the source lazily — a missing file is the normal case, and
        // the 404 lands us straight on the fallback rather than a black frame.
        if (!video.src) {
          video.src = SUMMIT_VIDEO_SRC;
          try { video.load(); } catch {}
        }
        video.onended = finish;
        video.onerror = () => { overlay.classList.add('fallback'); };
        const pr = video.play();
        if (pr && pr.then) {
          pr.then(() => {
            videoPlaying = true;
            // Fades the 天上 plate out once frames are actually running.
            overlay.classList.add('video-playing');
          }).catch(() => {
            overlay.classList.add('fallback');
          });
        } else {
          overlay.classList.add('fallback');
        }
      } else {
        overlay.classList.add('fallback');
      }
      // Teleport once the screen is fully veiled — video mid-point or the
      // fallback flash's white apex.
      setTimeout(doTeleport, 1700);
      // Safety net: never trap input if a video stalls.
      setTimeout(() => { if (!videoPlaying) finish(); }, 3400);
      setTimeout(finish, 12000);
    } else {
      doTeleport();
      finish();
    }
  }

  /** Restore-from-save entry: no cinematic, just arrive. */
  enterImmediate() {
    if (this.active) return;
    this.setActive(true);
    this.transitioning = false;
    // Place the cat on the landing under the torii, facing up the steps into
    // the meadow — exactly where enter() leaves it, minus the veil.
    const g = this.game;
    const p = g.player;
    p.mesh.position.set(this.origin.x, this.origin.y + ENTRY_Y, this.origin.z + GATE_Z + 1.6);
    p.heading = Math.PI; p.yaw = Math.PI; p.yawPrev = Math.PI;
    p.mesh.rotation.y = Math.PI;
    p.velocity.set(0, 0, 0);
    g.camera.position.set(this.origin.x, this.origin.y + ENTRY_Y + 1.9, this.origin.z + GATE_Z + 5.0);
    g.camera.lookAt(this.origin.x, this.origin.y + 0.35, this.origin.z + CORRIDOR_Z0 - 0.5);
  }

  /** Torii crossing on the summit → back to the shrine torii in the valley. */
  exit() {
    if (this.transitioning || !this.active) return;
    this.transitioning = true;
    const g = this.game;
    g.controls.enabled = false;
    g.player.actionLocked = true;
    g.player.moveInput.set(0, 0);
    if (g.audio) g.audio.playDreamChime();

    const overlay = document.getElementById('summit-transition');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('show', 'fallback', 'quick');
    }
    setTimeout(() => {
      const p = g.player;
      // Place the cat FIRST, so setActive(false)'s compass re-seed measures
      // discovery against the valley position rather than the summit pocket.
      // Stand under the valley torii facing the shrine — the bell's home.
      p.mesh.position.set(0, 0, -23.6);
      p.heading = Math.PI; p.yaw = Math.PI; p.yawPrev = Math.PI;
      p.mesh.rotation.y = Math.PI;
      p.velocity.set(0, 0, 0);
      g.camera.position.set(0, 1.7, -19.6);
      g.camera.lookAt(0, 0.5, -24);
      this.setActive(false);
      setTimeout(() => {
        if (overlay) {
          overlay.classList.add('fade-out');
          setTimeout(() => {
            // Clear every veil mode, not just `hidden` — otherwise the next
            // ascent inherits `quick` and reuses the descent's veil.
            overlay.classList.remove('show', 'fallback', 'quick', 'video-playing', 'fade-out');
            overlay.classList.add('hidden');
          }, 900);
        }
        this.transitioning = false;
        g.controls.enabled = true;
        g.player.actionLocked = false;
        g.ui.showToast('You pad back under the gate. The valley remembers you.', 3600);
        g.saveGame();
      }, 500);
    }, 900);
  }

  setActive(on) {
    if (this.active === on) return;
    if (!on) this.setVistaView(false);
    this.active = on;
    this.group.visible = on;
    this.setValleyVisible(!on);
    if (this.game.ui && this.game.ui.setSummitMode) this.game.ui.setSummitMode(on);
    const sky = this.game.sky;
    if (on) {
      if (this.game.dialogue && this.game.dialogue.active) this.game.dialogue.close();
      this._savedSkyState = {
        dayTime: sky.dayTime,
        weather: sky.weather,
        previousWeather: sky.previousWeather,
        targetWeather: sky.targetWeather,
        weatherBlend: sky.weatherBlend,
        weatherTimer: sky.weatherTimer,
        paletteOverride: sky.paletteOverride || null
      };
      this._savedDurations = sky.weatherDurations;
      sky.weatherDurations = SUMMIT_WEATHER_DURATIONS;
      sky.weatherPool = SUMMIT_WEATHER_POOL;
      // Crossing the portal opens on the reference's clear late-morning
      // light. The summit's own weather may evolve later, but the reveal is
      // never an unreadable night or an overexposed weather transition.
      sky.dayTime = 10.35;
      sky.weather = 'clear';
      sky.previousWeather = 'clear';
      sky.targetWeather = 'clear';
      sky.weatherBlend = 1;
      sky.weatherTimer = 190;
      sky.paletteOverride = this.skyPalette;
      sky._palStamp = -1;
      if (this.game.audio) this.game.audio.setSummitWind(true);
      // No hints, no missions, no waypoint arrows — a respite scene.
      this.game.ui.hideAllGuidance();
      this.meditateT = 0;
      this.sleeping = false;
      this._sitHintShown = false;
      this._vistaSuppressed = false;
      this._exitArmed = false;
      this._meditationGlow = 0;
      this._furinNear = false;
      this._furinChimed = false;
      if (this.meditationMoteMat) this.meditationMoteMat.opacity = 0;
      if (this.meditationMotes) this.meditationMotes.visible = false;
      this.resetAmbientWildlife();
    } else {
      sky.weatherDurations = this._savedDurations || sky.weatherDurations;
      sky.weatherPool = null;
      if (this._savedSkyState) {
        sky.dayTime = this._savedSkyState.dayTime;
        sky.weather = this._savedSkyState.weather;
        sky.previousWeather = this._savedSkyState.previousWeather;
        sky.targetWeather = this._savedSkyState.targetWeather;
        sky.weatherBlend = this._savedSkyState.weatherBlend;
        sky.weatherTimer = this._savedSkyState.weatherTimer;
        sky.paletteOverride = this._savedSkyState.paletteOverride;
        sky._palStamp = -1;
        this._savedSkyState = null;
      }
      if (this.game.audio) this.game.audio.setSummitWind(false);
      this.resetAmbientWildlife();
      // Restore the valley's guidance, and re-seed the compass so its POIs
      // come back where they were.
      for (const id of ['quest-card', 'compass']) {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
      }
      if (this.game.waypoints) this.game.waypoints.setTargets([]);
      if (this.game.refreshCompassPois) this.game.refreshCompassPois();
    }
  }

  setVistaView(on) {
    on = !!on && this.active;
    if (this.cameraActive === on) return;
    this.cameraActive = on;
    const g = this.game;
    if (g.ui && g.ui.setScenicView) g.ui.setScenicView(on);
    if (on) {
      const p = g.player.mesh.position;
      this._vistaLook.set(p.x, p.y + 0.55, p.z + 4);
      this._vistaFovStart = g.camera.fov;
      g.player.yaw = 0;
      if (Number.isFinite(g.player.yawPrev)) g.player.yawPrev = 0;
    } else if (g.camera && Number.isFinite(g.player.fovCurrent)) {
      g.camera.fov = g.player.fovCurrent;
      if (g.camera.updateProjectionMatrix) g.camera.updateProjectionMatrix();
    }
  }

  updateVistaCamera(dt) {
    if (!this.cameraActive) return;
    const g = this.game;
    const p = g.player.mesh.position;
    const drift = this._reducedMotion ? 0 : Math.sin(this.time * 0.12) * 0.16;
    // A low, close shoulder view keeps the cat large in the foreground while
    // the gaze travels past the torii and pagoda to the unbroken sea band.
    this._vistaDesired.set(p.x - 1.72 + drift, p.y + 1.48, p.z - 3.85);
    this._vistaLookTarget.set(
      this.origin.x + 2.4 + drift * 3,
      this.origin.y + 0.8 + Math.sin(this.time * 0.09) * (this._reducedMotion ? 0 : 0.08),
      this.origin.z + 108
    );
    const cameraEase = this._reducedMotion ? 1 : Math.min(1, dt * 1.45);
    g.camera.position.lerp(this._vistaDesired, cameraEase);
    this._vistaLook.lerp(this._vistaLookTarget, cameraEase);
    g.camera.lookAt(this._vistaLook);
    const nextFov = g.camera.fov + (48 - g.camera.fov) * (this._reducedMotion ? 1 : Math.min(1, dt * 2.2));
    if (Math.abs(nextFov - g.camera.fov) > 0.001) {
      g.camera.fov = nextFov;
      if (g.camera.updateProjectionMatrix) g.camera.updateProjectionMatrix();
    }

    // Settle the seated silhouette toward the bay. The shortest-angle form
    // prevents a full turn if the cat arrived facing just west of north.
    let headingDiff = -g.player.heading;
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
    g.player.heading += headingDiff * (this._reducedMotion ? 1 : Math.min(1, dt * 2.4));
    g.player.mesh.rotation.y = g.player.heading;
  }

  /* ================= Per-frame ================= */

  update(dt, playing) {
    // The shrine beacon pulses even while the player is in the valley.
    if (this.unlocked && this.raysGroup && !this.active) {
      const t = this.time += dt;
      for (const r of this._rays) {
        r.material.opacity = r.userData.baseOpacity * (0.72 + 0.28 * Math.sin(t * 0.7 + r.userData.phase));
      }
      // The thicket behind the shrine parts open — one-way, permanent.
      if (this._thicketOpen < 1) {
        this._thicketOpen = Math.min(1, this._thicketOpen + dt * 0.35);
        if (this.game.city && this.game.city.setShrineThicketOpen) {
          this.game.city.setShrineThicketOpen(smoothstep(0, 1, this._thicketOpen));
        }
      }
      // The reveal: lift the gaze toward the light for a beat (negative
      // pitch lowers the boom and looks up). A downward drag cancels it
      // immediately — the camera never fights the player.
      if (this._revealT > 0) {
        this._revealT -= dt;
        const p = this.game.player;
        if (typeof p.pitch === 'number') {
          if (p.pitch > this._revealPitch + 0.03) {
            this._revealT = 0;
          } else if (p.pitch > -0.35) {
            p.pitch = Math.max(-0.35, p.pitch - dt * 0.2);
            this._revealPitch = p.pitch;
          }
        }
      }
      const pos = this.game.player.mesh.position;
      // The portal pool behind the shrine
      if (playing && !this.transitioning &&
          pos.z < -38.2 && pos.z > -44 && Math.abs(pos.x) < 4.2 && pos.y < 1) {
        this.enter();
      }
      return;
    }
    if (!this.active) { this.time += dt; return; }

    const g = this.game;
    this.time += dt;
    const t = this.time;
    const sky = g.sky;
    const p = g.player.mesh.position;
    this._localPlayer.copy(p).sub(this.origin);
    this.updateAmbientWildlife(dt, t, sky);
    this.updateMeditationAtmosphere(dt, t, playing, sky);
    this.updateSakuraPetals(dt, t, sky);

    // Shared foliage clock + a stronger wind base than the valley.
    updateFoliage(t, sky, p);

    // Grass uniforms — player position in summit-local space for the
    // paw-push term; wind stays gusty and is weather-amplified.
    if (this.grassMat) {
      const u = this.grassMat.uniforms;
      this._grassTime += dt;
      u.uTime.value = this._grassTime;
      u.uPlayerPos.value.copy(this._localPlayer);
      let wind = 1.35 + 0.35 * Math.sin(t * 0.23) + 0.2 * Math.sin(t * 0.71);
      if (sky && (sky.targetWeather === 'snow' || sky.targetWeather === 'cloudy')) wind += sky.weatherBlend * 0.7;
      u.uWind.value += (wind - u.uWind.value) * Math.min(1, dt * 1.2);
      if (sky) {
        const pal = sky.resolvePalette();
        const sunUp = Math.max(0, sky.sunDir.y);
        u.uSunDir.value.copy(sky.sunDir);
        u.uSunColor.value.copy(pal.sun).multiplyScalar(Math.pow(sunUp, 0.5));
      }
    }

    // Clouds drift through on the wind; pollen rides it visibly.
    for (const c of this.summitClouds) {
      c.spr.position.x += c.speed * dt * 1.8;
      if (c.spr.position.x > c.maxX) c.spr.position.x = c.minX;
    }
    if (this.pollen) {
      const pp = this.pollen.geometry.attributes.position;
      const wv = 2.6 + Math.sin(t * 0.4) * 1.2;
      for (let i = 0; i < pp.count; i++) {
        let x = pp.getX(i) + wv * dt + Math.sin(t * 1.7 + i) * dt * 0.5;
        let z = pp.getZ(i) + Math.cos(t * 0.5 + i * 0.7) * dt * 0.4;
        let y = pp.getY(i) + Math.sin(t * 0.9 + i * 1.3) * dt * 0.25;
        if (x > 30) x = -30;
        if (Math.hypot(x, z) > 30) { x *= 0.98; z *= 0.98; }
        if (y < 0.1) y = 0.1; else if (y > 3.2) y = 3.2;
        pp.setXYZ(i, x, y, z);
      }
      pp.needsUpdate = true;
    }

    // Summit-local snow — only while the weather actually says snow. Parks the
    // system (visible=false) otherwise so it costs nothing in clear weather.
    if (this.snow && this.snowMat) {
      const snowing = sky && (sky.weather === 'snow' ||
        (sky.weather === 'cloudy' && sky.weatherBlend > 0.65));
      const target = snowing ? 0.8 : 0;
      this.snowMat.opacity += (target - this.snowMat.opacity) * Math.min(1, dt * 1.4);
      const wasVisible = this.snow.visible;
      this.snow.visible = this.snowMat.opacity > 0.012;
      if (this.snow.visible) {
        const sp = this.snow.geometry.attributes.position;
        if (!wasVisible) this.reseedSnow();
        for (let i = 0; i < sp.count; i++) {
          const phase = this._snowSeeds[i * 3];
          const fall = this._snowSeeds[i * 3 + 1];
          const amp = this._snowSeeds[i * 3 + 2];
          let x = sp.getX(i) + Math.sin(t * 1.3 + phase) * dt * 0.7 * amp;
          let y = sp.getY(i) - fall * dt;
          let z = sp.getZ(i) + Math.cos(t * 1.05 + phase * 1.3) * dt * 0.55 * amp;
          if (y < 0.1) {
            // Landed: recycle upwind so gusts visibly sweep the field.
            y = 24 + this.rng() * 4;
            x = this._localPlayer.x - 34 + this.rng() * 68;
            z = this._localPlayer.z - 34 + this.rng() * 68;
          }
          sp.setXYZ(i, x, y, z);
        }
        sp.needsUpdate = true;
      }
    }

    // Gentle crown sway for the rim trees.
    for (const s of this.swayables) {
      s.node.rotation.z = Math.sin(t * s.freq * 0.3 + s.phase) * s.amp;
      s.node.rotation.x = Math.cos(t * s.freq * 0.24 + s.phase) * s.amp * 0.7;
    }

    // Keep the cat inside the meadow + stair corridor.
    this.constrain(p);
    this._localPlayer.copy(p).sub(this.origin);

    // Arrival begins outside the gate, so the exit stays disarmed until the
    // cat has genuinely climbed into the clearing. Walking back out through
    // the torii then works as an ordinary, intuitive return route.
    if (playing && !this.transitioning) {
      const lx = this._localPlayer.x, lz = this._localPlayer.z;
      if (!this._exitArmed && lz < CORRIDOR_Z0 + 2.1) this._exitArmed = true;
      if (this._exitArmed && lz > GATE_Z + 0.4 && Math.abs(lx) < 1.75) this.exit();
    }

    /* ---------- Meditation: still → sit → sleep ---------- */
    if (!playing || this.transitioning) return;
    const cat = g.player.cat;
    const still = g.player.isGrounded && g.player.moveInput.lengthSq() < 0.02 &&
      g.player.currentSpeed < 0.3 && !g.player.actionLocked;
    const lx2 = this._localPlayer.x, lz2 = this._localPlayer.z;
    const inHeart = (lx2 * lx2 + lz2 * lz2) < 132; // ~11.5 m around the meadow centre
    const perchDx = lx2 - this.perchLocal.x;
    const perchDz = lz2 - this.perchLocal.z;
    const atPerch = perchDx * perchDx + perchDz * perchDz < this.perchRadius * this.perchRadius;

    if (still && inHeart) {
      // A summit cat lounges — any idle lull becomes a sit, automatically.
      if (!cat.idleAction && cat.state === 'idle' && cat.idleTimer > 2.5) {
        cat.idleAction = 'sit';
        cat.idleActionTimer = 0;
        cat.idleActionDuration = 190;
        if (g.audio && Math.random() > 0.5) g.audio.playPurr(2.5);
      }
      if (cat.idleAction === 'sit' && !this.sleeping) {
        this.meditateT += dt;
        if (!this._sitHintShown && this.meditateT > 6) {
          this._sitHintShown = true;
          g.ui.showToast('The wind moves through the grass. There is nowhere to be.', 4200);
        }
        if (this.meditateT >= MEDITATE_SECONDS) this.beginSleep();
      } else if (cat.idleAction !== 'sleep') {
        this.meditateT = Math.max(0, this.meditateT - dt * 0.5);
      }
      if (this.sleeping && cat.idleAction !== 'sleep') {
        this.sleeping = false;
        this.meditateT = 0;
      }
    } else {
      // The spell breaks the moment the cat moves or leaves the meadow
      // heart. Without this the `sleeping` flag latches on forever: every
      // other branch is guarded by `!this.sleeping`, so a sleeping cat that
      // stands up would never be cleared and could never re-sit.
      if (this.sleeping) {
        this.sleeping = false;
        if (cat.idleAction === 'sleep') cat.endIdleAction();
      }
      this.meditateT = 0;
    }

    const scenicReady = atPerch && still &&
      (cat.idleAction === 'sit' || cat.idleAction === 'sleep');
    if (!still || !atPerch) this._vistaSuppressed = false;
    if (scenicReady && !this._vistaSuppressed) {
      this.setVistaView(true);
      this.updateVistaCamera(dt);
    } else {
      this.setVistaView(false);
    }
  }

  /** The stillness pays off: the cat folds itself into a sleeping ball. */
  beginSleep() {
    const g = this.game;
    const cat = g.player.cat;
    this.sleeping = true;
    cat.idleAction = 'sleep';
    cat.idleActionTimer = 0;
    cat.idleActionDuration = Infinity;
    cat.setMood('sleepy', 30, 3);
    if (g.audio) {
      g.audio.playPurr(5.5);
      g.audio.playSingingBowl(174.61); // F3 — settles under the wind
    }
    if (g.music && g.music.swell) g.music.swell(12);
    g.ui.showToast('✦ Curled into the grass, the cat sleeps — the mountain keeps watch ✦', 5200);
    g.discover('quietMoments', {
      id: 'summit-sleep',
      text: 'Fell asleep in the summit meadow while the wind combed the grass'
    });
    g.saveGame();
  }
}
