import * as THREE from 'three';
import {
  dirtTextures, groundTextures, stoneTextures, woodTextures, metalTextures, barkTextures,
  texturedMaterial, glowTexture
} from './textures.js?v=20261107a';
import {
  createFoliageMaterial, createFoliageDepthMaterial, leafCardTexture, updateFoliage
} from './foliage.js?v=20261107a';
import {
  mulberry32, smoothstep, ORIGIN, MEADOW_R, MEADOW_Y, CORRIDOR_W, CORRIDOR_Z0, CORRIDOR_Z1, GATE_Z,
  ENTRY_Y, PERCH_CAM, approachTopAt, MEDITATE_SECONDS, summitWeatherAmount
} from './summit/common.js?v=20261107a';
import { lightMethods } from './summit/light.js?v=20261107a';
import { terrainMethods } from './summit/terrain.js?v=20261107a';
import { clearingMethods } from './summit/clearing.js?v=20261107a';
import { plantingMethods } from './summit/planting.js?v=20261107a';
import { vistaMethods } from './summit/vista.js?v=20261107a';

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

// Optional cinematic for the ascent. Drop an mp4 at this path and it plays
// full-screen; when the file is absent (or undecodable) the CSS light-burst
// in index.html carries the transition, so the scene never hard-depends on
// the asset existing. Never fetched at boot — attached on first use only.
const SUMMIT_VIDEO_SRC = 'assets/summit-transition.mp4';

// The summit shares the valley's full weather vocabulary. Clear skies are
// still favoured, but a long stay can now pass through rain, mountain mist,
// cloud and snow without leaving the overlook.
const SUMMIT_WEATHER_POOL = [
  'clear', 'clear', 'clear', 'clear',
  'cloudy', 'cloudy', 'mist', 'rain', 'snow'
];
const SUMMIT_WEATHER_DURATIONS = {
  clear: 520, cloudy: 360, mist: 260, rain: 250, snow: 220
};

/**
 * The hidden summit clearing — a wind-combed grass field above Kyoto with
 * the city, Osaka and the bay descending through layered 3D distance. Reached by
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
    const landWash = this.makeLandTexture();
    this.MAT.land = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 0,
      map: landWash, bumpMap: landWash, bumpScale: 0.6
    });

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
      // The bay sits below the meadow but must remain visible in clear air.
      // Weather still thickens this through the shared post-process controls.
      fogBase: this.origin.y - 8.5,
      densityScale: 0.42,
      heightFalloff: 0.09
    };
    // A complete palette set rather than a frozen final palette. Sky blends
    // these phases with its live weather palettes, so the crisp blue summit
    // day naturally becomes amber dusk and deep moonlit night.
    const palette = (values) => {
      const out = {};
      for (const [key, value] of Object.entries(values)) {
        out[key] = key === 'cloudOpacity' ? value : new THREE.Color(value);
      }
      return out;
    };
    this.skyPalette = {
      phases: {
        day: palette({
          top: 0x168edf, mid: 0x58b9eb, horizon: 0xc9e9f3,
          warm: 0xffdda0, sun: 0xffefc7, hemiSky: 0xb9e2f5,
          hemiGround: 0x6f8748, fog: 0xb7d6df, cloud: 0xfff9e9,
          cloudOpacity: 0.86
        }),
        sunset: palette({
          top: 0x2d4e8f, mid: 0xd87968, horizon: 0xffb56f,
          warm: 0xff8538, sun: 0xffc77f, hemiSky: 0x8d91bd,
          hemiGround: 0x66513e, fog: 0xd88c68, cloud: 0xffc7aa,
          cloudOpacity: 0.76
        }),
        night: palette({
          top: 0x071229, mid: 0x172d50, horizon: 0x354e6f,
          warm: 0x2c3b61, sun: 0x93a6ce, hemiSky: 0x314866,
          hemiGround: 0x252c2c, fog: 0x223247, cloud: 0x566880,
          cloudOpacity: 0.42
        })
      }
    };
    this._vistaColorA = new THREE.Color();
    this._vistaColorB = new THREE.Color();
    this._vistaColorC = new THREE.Color();

    this.buildSummitLight();
    this.buildMeadow();
    this.buildStepsAndGate();
    this.buildRocksAndTrees();
    this.buildMeditationStone();
    this.buildMeditationAtmosphere();
    this.buildGrassField();
    this.buildSkirtAndVista();
    this.loadVistaLandmarks();
    this.buildSummitClouds();
    this.buildPollen();
    this.buildSakuraPetals();
    this.buildAmbientWildlife();
    this.buildSummitSnow();
    this.buildSummitRain();
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
      return this.origin.y + approachTopAt(lz);
    }
    return this.origin.y + MEADOW_Y;
  }

  approachSupportAt(x, z) { return terrainMethods.approachSupportAt.call(this, x, z); }
  landHeightAt(x, z) { return terrainMethods.landHeightAt.call(this, x, z); }
  perchSightlineAt(x, z) { return terrainMethods.perchSightlineAt.call(this, x, z); }
  terrainHeightAt(x, z) { return terrainMethods.terrainHeightAt.call(this, x, z); }

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

  /** Quality-tier density without rebuilding any summit geometry. */
  setQuality(tier = 'high') {
    const fraction = tier === 'low' ? 0.46 : tier === 'medium' ? 0.74 : 1;
    if (this.grass && !this.previewQuality) this.grass.setDensity(tier === 'low' ? 0.5 : tier === 'medium' ? 0.75 : 1);
    if (this.cityWalls && this.cityRoofs) {
      const count = Math.max(1, Math.floor((this.cityInstanceMax || this.cityWalls.count) * fraction));
      this.cityWalls.count = count;
      this.cityRoofs.count = count;
      if (this.cityEaves) this.cityEaves.count = count;
    }
    if (this.cityGardens) {
      this.cityGardens.count = Math.max(1, Math.floor((this.cityGardenMax || this.cityGardens.count) * fraction));
    }
    if (this.harbourSkyline) {
      this.harbourSkyline.count = Math.max(1, Math.floor((this.harbourSkylineMax || this.harbourSkyline.count) *
        (tier === 'low' ? 0.58 : tier === 'medium' ? 0.8 : 1)));
    }
    for (const forest of this.slopeForest || []) {
      forest.count = Math.max(1, Math.floor((forest.userData.summitMaxCount || forest.count) * fraction));
    }
    for (const cloud of this.summitClouds || []) {
      const max = cloud.mesh.userData.summitMaxCount || cloud.mesh.count;
      cloud.mesh.count = Math.max(5, Math.floor(max * (tier === 'low' ? 0.68 : tier === 'medium' ? 0.84 : 1)));
    }
    const setPointBudget = (points, amount) => {
      if (!points || !points.geometry || !points.geometry.attributes.position) return;
      const max = points.geometry.attributes.position.count;
      if (points.geometry.setDrawRange) points.geometry.setDrawRange(0, Math.max(1, Math.floor(max * amount)));
    };
    setPointBudget(this.cityLights, fraction);
    setPointBudget(this.harbourLights, fraction);
    setPointBudget(this.bayGlints, tier === 'low' ? 0.55 : tier === 'medium' ? 0.78 : 1);
    const weatherFraction = tier === 'low' ? 0.5 : tier === 'medium' ? 0.76 : 1;
    setPointBudget(this.rain, weatherFraction);
    setPointBudget(this.snow, weatherFraction);
    if (this.rain && this.rain.geometry.attributes.position) {
      this._rainActive = Math.max(1, Math.floor(this.rain.geometry.attributes.position.count * weatherFraction));
    }
    if (this.snow && this.snow.geometry.attributes.position) {
      this._snowActive = Math.max(1, Math.floor(this.snow.geometry.attributes.position.count * weatherFraction));
    }
    for (let i = 0; i < (this.vistaBoats || []).length; i++) {
      this.vistaBoats[i].visible = tier !== 'low' || i < 4;
    }
  }

  /* ================= Terrain & architecture ================= */

  buildSummitLight() { return lightMethods.buildSummitLight.call(this); }
  buildMeadow() { return clearingMethods.buildMeadow.call(this); }
  buildStepsAndGate() { return clearingMethods.buildStepsAndGate.call(this); }
  buildLegacyRearGate() { return clearingMethods.buildLegacyRearGate.call(this); }
  buildVistaApproach() { return clearingMethods.buildVistaApproach.call(this); }

  /* ================= Flora ================= */

  _tree(x, z, scale, kind, opts) { return plantingMethods._tree.call(this, x, z, scale, kind, opts); }
  buildRocksAndTrees() { return plantingMethods.buildRocksAndTrees.call(this); }

  /* ================= Wind grass (src/grass.js) ================= */

  buildGrassField() { return plantingMethods.buildGrassField.call(this); }
  buildMeditationStone() { return clearingMethods.buildMeditationStone.call(this); }
  makeFurinPaperTexture() { return clearingMethods.makeFurinPaperTexture.call(this); }
  buildMeditationAtmosphere() { return clearingMethods.buildMeditationAtmosphere.call(this); }

  /* ================= The drop & the panorama ================= */

  buildApproachShoulder() { return terrainMethods.buildApproachShoulder.call(this); }
  buildLowerPath() { return clearingMethods.buildLowerPath.call(this); }
  buildSkirtAndVista() { return vistaMethods.buildSkirtAndVista.call(this); }
  landColorAt(x, z, c) { return terrainMethods.landColorAt.call(this, x, z, c); }
  buildSummitTerrain() { return terrainMethods.buildSummitTerrain.call(this); }
  vistaGroundHeight(x, z) { return terrainMethods.vistaGroundHeight.call(this, x, z); }
  vistaRiverX(z) { return vistaMethods.vistaRiverX.call(this, z); }
  buildVistaTerrain() { return vistaMethods.buildVistaTerrain.call(this); }
  buildKyotoCity() { return vistaMethods.buildKyotoCity.call(this); }
  buildKyotoPagoda() { return vistaMethods.buildKyotoPagoda.call(this); }
  makeLandTexture() { return terrainMethods.makeLandTexture.call(this); }
  makeBayWaterTexture() { return vistaMethods.makeBayWaterTexture.call(this); }
  buildSummitBay() { return vistaMethods.buildSummitBay.call(this); }
  buildHarbourAndIslands() { return vistaMethods.buildHarbourAndIslands.call(this); }
  buildHorizonRanges() { return vistaMethods.buildHorizonRanges.call(this); }
  makeVistaTexture() { return vistaMethods.makeVistaTexture.call(this); }
  makeVistaTextureLegacy() { return vistaMethods.makeVistaTextureLegacy.call(this); }
  buildSlopeForest() { return plantingMethods.buildSlopeForest.call(this); }
  loadVistaLandmarks() { return vistaMethods.loadVistaLandmarks.call(this); }
  buildSummitClouds() { return vistaMethods.buildSummitClouds.call(this); }

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

  makeRainStreakTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 64);
    const fade = ctx.createLinearGradient(0, 0, 0, 64);
    fade.addColorStop(0, 'rgba(210,232,248,0)');
    fade.addColorStop(0.18, 'rgba(210,232,248,0.82)');
    fade.addColorStop(1, 'rgba(167,205,235,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(14, 0, 3, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Summit-local rain; the hidden valley particle system cannot be reused. */
  buildSummitRain() {
    const count = this.previewQuality ? 360 : 760;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this._rainSeeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (this.rng() - 0.5) * 54;
      pos[i * 3 + 1] = this.rng() * 19;
      pos[i * 3 + 2] = (this.rng() - 0.5) * 54;
      this._rainSeeds[i * 2] = 14 + this.rng() * 11;
      this._rainSeeds[i * 2 + 1] = this.rng() * 100;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 9, 0), 52);
    const mat = new THREE.PointsMaterial({
      map: this.makeRainStreakTexture(), color: 0xaacbea,
      size: 0.82, transparent: true, opacity: 0,
      depthWrite: false, sizeAttenuation: true, fog: true
    });
    const rain = new THREE.Points(geo, mat);
    rain.name = 'Summit Rainfall';
    rain.frustumCulled = false;
    rain.visible = false;
    this.group.add(rain);
    this.rain = rain;
    this.rainMat = mat;
  }

  reseedRain() {
    const rp = this.rain.geometry.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      rp.setXYZ(
        i,
        this._localPlayer.x + (this.rng() - 0.5) * 56,
        3 + this.rng() * 19,
        this._localPlayer.z + (this.rng() - 0.5) * 56
      );
    }
    rp.needsUpdate = true;
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
    const snowing = summitWeatherAmount(sky, 'snow') > 0.45;
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

  updateMeditationAtmosphere(dt, t, playing, sky) { return clearingMethods.updateMeditationAtmosphere.call(this, dt, t, playing, sky); }

  updateSakuraPetals(dt, t, sky) {
    if (!this.petals || !this.petalMat) return;
    const targetOpacity = 0.7 * (1 - summitWeatherAmount(sky, 'snow'));
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

  buildShrineRays() { return lightMethods.buildShrineRays.call(this); }
  makeRayTexture() { return lightMethods.makeRayTexture.call(this); }

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
      if (overlay) overlay.classList.add('fade-out');
      setTimeout(() => {
        if (overlay) {
          overlay.classList.add('hidden');
          overlay.classList.remove('show', 'fallback', 'fade-out');
        }
        if (video) { try { video.pause(); video.removeAttribute('src'); video.load(); } catch {} }
        this.transitioning = false;
        g.controls.enabled = true;
        g.player.actionLocked = false;
        g.ui.showToast('The Summit Clearing — only wind and sky live here.', 4200);
        g.saveGame();
      }, overlay ? 1100 : 0);
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
        paletteOverride: sky.paletteOverride || null
      };
      this._savedDurations = sky.weatherDurations;
      this._savedWeatherPool = sky.weatherPool;
      sky.weatherDurations = SUMMIT_WEATHER_DURATIONS;
      sky.weatherPool = SUMMIT_WEATHER_POOL;
      // The summit is the same day above the valley: entering at dawn, in a
      // shower or beneath the moon now preserves that exact sky. Only the
      // local colour phases and weighted weather cadence change.
      sky.paletteOverride = this.skyPalette;
      if (sky.invalidateEnvironment) sky.invalidateEnvironment();
      else sky._palStamp = -1;
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
      sky.weatherPool = this._savedWeatherPool || null;
      if (this._savedSkyState) {
        sky.paletteOverride = this._savedSkyState.paletteOverride;
        if (sky.invalidateEnvironment) sky.invalidateEnvironment();
        else sky._palStamp = -1;
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
    // A raised over-the-shoulder view, tipped a few degrees down: the cat
    // sits in the lower left under the tree while the eye clears the meadow
    // rim and falls down the stairs, past the torii, over the city to the sea.
    this._vistaDesired.set(p.x + PERCH_CAM.x + drift, p.y + PERCH_CAM.y, p.z + PERCH_CAM.z);
    this._vistaLookTarget.set(
      this.origin.x + 16.0 + drift * 3,
      this.origin.y - 11.4 + Math.sin(this.time * 0.09) * (this._reducedMotion ? 0 : 0.08),
      this.origin.z + 145
    );
    const cameraEase = this._reducedMotion ? 1 : Math.min(1, dt * 1.45);
    g.camera.position.lerp(this._vistaDesired, cameraEase);
    this._vistaLook.lerp(this._vistaLookTarget, cameraEase);
    g.camera.lookAt(this._vistaLook);
    const nextFov = g.camera.fov + (50 - g.camera.fov) * (this._reducedMotion ? 1 : Math.min(1, dt * 2.2));
    if (Math.abs(nextFov - g.camera.fov) > 0.001) {
      g.camera.fov = nextFov;
      if (g.camera.updateProjectionMatrix) g.camera.updateProjectionMatrix();
    }

    // Settle the seated silhouette toward the bay. The shortest-angle form
    // prevents a full turn if the cat arrived facing just west of north.
    const desiredHeading = -0.16;
    let headingDiff = desiredHeading - g.player.heading;
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
    g.player.heading += headingDiff * (this._reducedMotion ? 1 : Math.min(1, dt * 2.4));
    g.player.mesh.rotation.y = g.player.heading;
  }

  updateVistaEnvironment(dt, t, sky) { return vistaMethods.updateVistaEnvironment.call(this, dt, t, sky); }

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
    this.updateVistaEnvironment(dt, t, sky);

    // Shared foliage clock + a stronger wind base than the valley.
    updateFoliage(t, sky, p);

    // Grass: rings follow the cat in summit-local space; the paw physics
    // reads the real cat; wind stays gusty and is weather-amplified.
    if (this.grass) {
      let wind = 1.35 + 0.35 * Math.sin(t * 0.23) + 0.2 * Math.sin(t * 0.71);
      if (sky) {
        wind += Math.max(summitWeatherAmount(sky, 'snow'),
          summitWeatherAmount(sky, 'cloudy'), summitWeatherAmount(sky, 'rain')) * 0.7;
      }
      this.grass.update(dt, {
        renderer: g.renderer, camera: g.camera, focus: this._localPlayer,
        cat: g.player.cat || null, sky, wind
      });
    }

    // Clouds drift through on the wind; pollen rides it visibly.
    for (const c of this.summitClouds) {
      c.mesh.position.x += c.speed * dt * 1.8;
      if (c.mesh.position.x > c.maxX) c.mesh.position.x = c.minX;
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
      const target = summitWeatherAmount(sky, 'snow') * 0.82;
      this.snowMat.opacity += (target - this.snowMat.opacity) * Math.min(1, dt * 1.4);
      const wasVisible = this.snow.visible;
      this.snow.visible = this.snowMat.opacity > 0.012;
      if (this.snow.visible) {
        const sp = this.snow.geometry.attributes.position;
        if (!wasVisible) this.reseedSnow();
        const activeSnow = this._snowActive || sp.count;
        for (let i = 0; i < activeSnow; i++) {
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

    // Wind-slanted rain uses the same cross-faded weather amount as the sky,
    // so a shower arrives and leaves without a particle pop.
    if (this.rain && this.rainMat) {
      const target = summitWeatherAmount(sky, 'rain') * 0.56;
      this.rainMat.opacity += (target - this.rainMat.opacity) * Math.min(1, dt * 2.1);
      const wasVisible = this.rain.visible;
      this.rain.visible = this.rainMat.opacity > 0.01;
      if (this.rain.visible) {
        if (!wasVisible) this.reseedRain();
        const rp = this.rain.geometry.attributes.position;
        const wind = 2.2 + summitWeatherAmount(sky, 'rain') * 2.8;
        const activeRain = this._rainActive || rp.count;
        for (let i = 0; i < activeRain; i++) {
          const speed = this._rainSeeds[i * 2];
          const phase = this._rainSeeds[i * 2 + 1];
          let x = rp.getX(i) + wind * dt;
          let y = rp.getY(i) - speed * dt;
          let z = rp.getZ(i) + Math.sin(t * 0.8 + phase) * dt * 0.25;
          if (y < 0 || Math.abs(x - this._localPlayer.x) > 31 || Math.abs(z - this._localPlayer.z) > 31) {
            x = this._localPlayer.x - 28 + this.rng() * 56;
            y = 14 + this.rng() * 9;
            z = this._localPlayer.z - 28 + this.rng() * 56;
          }
          rp.setXYZ(i, x, y, z);
        }
        rp.needsUpdate = true;
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
