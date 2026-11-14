// The summit vista (天上), split out of src/mountaintop.js: the layered
// Kyoto basin (river and road ribbons, the city, the Higashiyama pagoda), the
// bay with its glints and boats, the harbour skyline, islands, bay bridge and
// Ferris wheel, the horizon ranges, the cumulus banks, the optional Blender
// roofscape, and the per-frame re-lighting of all of it. makeVistaTexture()
// and makeVistaTextureLegacy() are the retired painted cyclorama, kept as
// source reference and not built.
// SummitManager (src/mountaintop.js) delegates to these methods with
// `this` = the manager, so the code reads exactly as it did in the class.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { worldNoise, glowTexture } from '../textures.js?v=20261107a';
import {
  createFoliageMaterial, lumpyTuftGeometry, leafMassTexture
} from '../foliage.js?v=20261107a';
import { mulberry32, box, clamp01, smoothstep, summitWeatherAmount, summitFootprint } from './common.js?v=20261107a';

// Resolve from this module rather than the current document: the main game is
// served from `/`, while the art-review page lives under `/tools/`.
const SUMMIT_LANDMARKS_SRC = new URL('../../assets/models/summit_kyoto_landmarks.glb?v=20261107a', import.meta.url).href;

export const vistaMethods = {
  // Each build*() is the §3.4 split: a layout step (every this.rng() draw, in
  // the classic order, and the footprint), then placeAsset() with the classic
  // mesh step, mesh*Classic(layout), which builds exactly what it always did.

  buildSkirtAndVista() {
    this.buildSummitTerrain();
    this.buildApproachShoulder();
    this.buildLowerPath();

    // The overlook is a stack of real spatial layers rather than a panorama
    // card: descending basin terrain, hundreds of roof volumes, gardens and
    // river, open bay, harbour skyline, islands and three mountain ranges.
    // Their separation produces parallax even during the very slow seated
    // camera drift, while ordinary lit/fogged materials make every layer
    // participate in the live day, night and weather systems.
    const vista = new THREE.Group();
    vista.name = 'Layered Kyoto Bay Vista';
    this.group.add(vista);
    this.vista = vista;
    this.buildVistaTerrain();
    this.buildKyotoCity();
    this.buildSummitBay();
    this.buildHarbourAndIslands();
    this.buildHorizonRanges();
    this.buildSlopeForest();
  },

  vistaRiverX(z) {
    return -20 + Math.sin(z * 0.041) * 13 + Math.sin(z * 0.017 + 1.3) * 8;
  },

  /**
   * River and street ribbons draped over the basin. The ground itself is
   * part of buildSummitTerrain(), so the city has no sheet edge to show.
   */
  buildVistaTerrain() {
    const layout = {
      index: 0, parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0,
      footprint: summitFootprint()
    };
    return this.placeAsset('vista-terrain', layout, () => vistaMethods.meshVistaTerrainClassic.call(this, layout));
  },

  meshVistaTerrainClassic(layout) {
    // The Yodo/Katsura water ribbon winds through several real city blocks.
    const riverGeo = new THREE.PlaneGeometry(12, 132, 5, 44);
    riverGeo.rotateX(-Math.PI / 2);
    const rp = riverGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const z = rp.getZ(i) + 104;
      const across = rp.getX(i);
      const width = 0.72 + clamp01((z - 38) / 145) * 0.68;
      const x = this.vistaRiverX(z) + across * width;
      rp.setXYZ(i, x, this.terrainHeightAt(x, z) + 0.14, z);
    }
    riverGeo.computeVertexNormals();
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x83bed1, emissive: 0x173d4c, emissiveIntensity: 0.12,
      roughness: 0.3, metalness: 0.04
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.name = 'Yodo River Ribbon';
    river.renderOrder = 1;
    this.vista.add(river);
    this.vistaRiverMat = riverMat;

    // Long pale streets and cross lanes make the basin read as districts,
    // while staying cheap: twelve meshes cover the entire road network.
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xb9ad8c, roughness: 1, polygonOffset: true,
      polygonOffsetFactor: -1, polygonOffsetUnits: -1
    });
    const roads = new THREE.Group();
    roads.name = 'Kyoto Road Ribbons';
    for (const [x, yaw, width] of [
      [-69, -0.06, 1.1], [-43, 0.045, 0.72], [-4, -0.025, 0.9],
      [26, 0.055, 0.76], [57, -0.04, 1.0], [83, 0.025, 0.68]
    ]) {
      const roadGeo = new THREE.PlaneGeometry(width, 126, 1, 28);
      roadGeo.rotateX(-Math.PI / 2);
      const roadPos = roadGeo.attributes.position;
      for (let i = 0; i < roadPos.count; i++) {
        const z = roadPos.getZ(i) + 108;
        const rx = x + roadPos.getX(i) + (z - 108) * yaw;
        roadPos.setXYZ(i, rx, this.terrainHeightAt(rx, z) + 0.2, z);
      }
      roadGeo.computeVertexNormals();
      const road = new THREE.Mesh(roadGeo, roadMat);
      roads.add(road);
    }
    for (const [z, width] of [[57, 0.7], [78, 0.55], [101, 0.8], [128, 0.62], [154, 0.72]]) {
      const roadGeo = new THREE.PlaneGeometry(190, width, 36, 1);
      roadGeo.rotateX(-Math.PI / 2);
      const roadPos = roadGeo.attributes.position;
      for (let i = 0; i < roadPos.count; i++) {
        const x = roadPos.getX(i);
        const rz = z + roadPos.getZ(i);
        roadPos.setXYZ(i, x, this.terrainHeightAt(x, rz) + 0.21, rz);
      }
      roadGeo.computeVertexNormals();
      const road = new THREE.Mesh(roadGeo, roadMat);
      roads.add(road);
    }
    this.vista.add(roads);
    this.vistaRoadMat = roadMat;
  },

  /** Hundreds of separately placed buildings and gardens in the basin. */
  buildKyotoCity() {
    const layout = {
      index: 0, parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0,
      footprint: summitFootprint()
    };
    const city = this.placeAsset('kyoto-city', layout, () => vistaMethods.meshKyotoCityClassic.call(this, layout));
    // The pagoda is its own asset (summit-pagoda), built right after the city
    // as before; its evening lanterns share the city's window-light material.
    this.buildKyotoPagoda();
    return city;
  },

  meshKyotoCityClassic(layout) {
    const rnd = mulberry32(202610221);
    const count = this.previewQuality ? 430 : 920;
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    const roofGeo = new THREE.ConeGeometry(1, 1, 4);
    roofGeo.rotateY(Math.PI / 4);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xc7b995, roughness: 0.92, metalness: 0
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x53616c, roughness: 0.86, metalness: 0.02
    });
    const eaveMat = new THREE.MeshStandardMaterial({
      color: 0x3d4b56, roughness: 0.9, metalness: 0.01
    });
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, count);
    const roofs = new THREE.InstancedMesh(roofGeo, roofMat, count);
    const eaves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), eaveMat, count);
    const dummy = new THREE.Object3D();
    const wallCol = new THREE.Color();
    const roofCol = new THREE.Color();
    const lights = [];
    let placed = 0;
    for (let guard = 0; placed < count && guard < count * 12; guard++) {
      const z = 42 + Math.pow(rnd(), 0.78) * 118;
      const halfW = 34 + (z - 42) * 0.72;
      const x = (rnd() - 0.5) * halfW * 2;
      const river = this.vistaRiverX(z);
      if (Math.abs(x - river) < 8.5 || Math.abs(x) > halfW) continue;
      // Keep several roads and the central temple sightline legible.
      if (Math.abs(((x + 8) % 26 + 26) % 26 - 13) < 1.15) continue;
      if (Math.abs(((z - 50) % 23 + 23) % 23 - 11.5) < 0.8) continue;
      if (z < 73 && Math.abs(x - 17) < 9) continue;

      const near = 1 - clamp01((z - 42) / 126);
      const w = 0.85 + rnd() * (1.25 + near * 0.8);
      const d = 0.86 + rnd() * (1.3 + near * 0.72);
      const h = 0.68 + rnd() * (1.05 + near * 1.1);
      const y = this.terrainHeightAt(x, z);
      const yaw = (rnd() - 0.5) * 0.16 + (rnd() < 0.18 ? Math.PI / 2 : 0);

      dummy.position.set(x, y + h * 0.5, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      walls.setMatrixAt(placed, dummy.matrix);
      wallCol.setHex([0xd3c39e, 0xc4b48f, 0xd9cfb5, 0xb9aa89][Math.floor(rnd() * 4)]);
      walls.setColorAt(placed, wallCol);

      const roofH = 0.34 + near * 0.16;
      dummy.position.set(x, y + h + 0.045, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(w * 1.1, 0.09 + near * 0.035, d * 1.1);
      dummy.updateMatrix();
      eaves.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, y + h + roofH * 0.42, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(w * 0.78, roofH, d * 0.78);
      dummy.updateMatrix();
      roofs.setMatrixAt(placed, dummy.matrix);
      roofCol.setHex([0x495967, 0x5a6570, 0x3f4e5a, 0x68727b][Math.floor(rnd() * 4)]);
      roofs.setColorAt(placed, roofCol);
      roofCol.multiplyScalar(0.76);
      eaves.setColorAt(placed, roofCol);

      if (rnd() < 0.68) {
        const side = rnd() < 0.5 ? -1 : 1;
        lights.push(x + side * w * 0.36, y + h * (0.42 + rnd() * 0.28), z - d * 0.51);
        if (near > 0.36 && rnd() < 0.46) {
          lights.push(x - side * w * 0.28, y + h * (0.45 + rnd() * 0.22), z - d * 0.515);
        }
      }
      placed++;
    }
    walls.count = roofs.count = eaves.count = placed;
    walls.instanceMatrix.needsUpdate = roofs.instanceMatrix.needsUpdate = eaves.instanceMatrix.needsUpdate = true;
    if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
    if (roofs.instanceColor) roofs.instanceColor.needsUpdate = true;
    if (eaves.instanceColor) eaves.instanceColor.needsUpdate = true;
    walls.name = 'Kyoto Machiya Walls';
    roofs.name = 'Kyoto Kawara Roofs';
    eaves.name = 'Kyoto Deep Roof Eaves';
    walls.castShadow = roofs.castShadow = eaves.castShadow = false;
    walls.receiveShadow = roofs.receiveShadow = eaves.receiveShadow = false;
    this.vista.add(walls, eaves, roofs);
    this.cityWalls = walls;
    this.cityRoofs = roofs;
    this.cityEaves = eaves;
    this.cityInstanceMax = placed;
    this.cityWallMat = wallMat;
    this.cityRoofMat = roofMat;
    this.cityEaveMat = eaveMat;

    const lightGeo = new THREE.BufferGeometry();
    lightGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lights), 3));
    const lightMat = new THREE.PointsMaterial({
      map: glowTexture(255, 205, 112, 42), color: 0xffc56f,
      size: 0.46, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false
    });
    const cityLights = new THREE.Points(lightGeo, lightMat);
    cityLights.name = 'Kyoto Window Lights';
    cityLights.visible = false;
    cityLights.renderOrder = 2;
    this.vista.add(cityLights);
    this.cityLights = cityLights;
    this.cityLightMat = lightMat;

    const treeCount = this.previewQuality ? 160 : 360;
    // Painted leaf masses, like the slope forest, rather than faceted balls.
    const gardenGeo = lumpyTuftGeometry(1, 31, 0.36);
    const gardenMat = createFoliageMaterial({
      sss: 0.22, wind: 0.45, mottle: 0.24, vertexColors: false,
      massMap: leafMassTexture('leaf'), massScale: 1 / 1.6
    });
    const gardens = new THREE.InstancedMesh(gardenGeo, gardenMat, treeCount);
    for (let i = 0; i < treeCount; i++) {
      const z = 43 + rnd() * 126;
      const halfW = 31 + (z - 43) * 0.7;
      const x = (rnd() - 0.5) * halfW * 2;
      const s = 0.45 + rnd() * (1.25 + (1 - clamp01((z - 43) / 130)) * 0.8);
      dummy.position.set(x, this.terrainHeightAt(x, z) + s * 0.72, z);
      dummy.rotation.set(0, rnd() * Math.PI * 2, 0);
      dummy.scale.set(s, s * (0.72 + rnd() * 0.45), s);
      dummy.updateMatrix();
      gardens.setMatrixAt(i, dummy.matrix);
      wallCol.setHex([0x315e35, 0x47783d, 0x5f8d49, 0x7a9c50, 0xb98192][Math.floor(rnd() * 5)]);
      gardens.setColorAt(i, wallCol);
    }
    gardens.instanceMatrix.needsUpdate = true;
    if (gardens.instanceColor) gardens.instanceColor.needsUpdate = true;
    gardens.name = 'Kyoto Temple Gardens';
    gardens.castShadow = gardens.receiveShadow = false;
    this.vista.add(gardens);
    this.cityGardens = gardens;
    this.cityGardenMax = treeCount;
    this.cityGardenMat = gardenMat;
  },

  /** A readable five-storey landmark assembled from real roof volumes. */
  buildKyotoPagoda() {
    const layout = {
      index: 0, name: 'Higashiyama Five Storey Pagoda', parent: 'Layered Kyoto Bay Vista',
      x: -27, y: this.terrainHeightAt(-27, 86) + 0.04, z: 86, ry: -0.08,
      footprint: summitFootprint(), bind: { kyotoPagoda: 'pagoda' }
    };
    return this.placeAsset('summit-pagoda', layout, () => vistaMethods.meshKyotoPagodaClassic.call(this, layout));
  },

  meshKyotoPagodaClassic(layout) {
    const walls = [];
    const timber = [];
    const roofs = [];
    let top = 0;
    for (let level = 0; level < 5; level++) {
      const width = 6.8 - level * 0.72;
      const depth = width * 0.76;
      const baseY = level * 1.72;
      const bodyH = 1.08;

      const wall = new THREE.BoxGeometry(width * 0.42, bodyH, depth * 0.42);
      wall.translate(0, baseY + bodyH * 0.5, 0);
      walls.push(wall);

      const gallery = new THREE.BoxGeometry(width * 0.82, 0.12, depth * 0.82);
      gallery.translate(0, baseY + bodyH * 0.82, 0);
      timber.push(gallery);
      for (const x of [-1, 1]) {
        for (const z of [-1, 1]) {
          const post = new THREE.BoxGeometry(0.11, bodyH * 0.82, 0.11);
          post.translate(x * width * 0.24, baseY + bodyH * 0.42, z * depth * 0.24);
          timber.push(post);
        }
      }

      const eave = new THREE.BoxGeometry(width, 0.13, depth);
      eave.translate(0, baseY + bodyH + 0.02, 0);
      roofs.push(eave);
      const roof = new THREE.ConeGeometry(1, 0.6, 4);
      roof.rotateY(Math.PI / 4);
      roof.scale(width * 0.7, 1, depth * 0.7);
      roof.translate(0, baseY + bodyH + 0.36, 0);
      roofs.push(roof);
      top = baseY + bodyH + 0.66;
    }

    const mast = new THREE.CylinderGeometry(0.08, 0.13, 2.65, 8);
    mast.translate(0, top + 1.25, 0);
    timber.push(mast);
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.TorusGeometry(0.24 - i * 0.035, 0.035, 5, 12);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, top + 0.45 + i * 0.36, 0);
      timber.push(ring);
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc7b78e, roughness: 0.94, fog: false });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x4b3428, roughness: 0.9, fog: false });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x344853, roughness: 0.84, metalness: 0.025, fog: false });
    const pagoda = new THREE.Group();
    pagoda.name = 'Higashiyama Five Storey Pagoda';
    pagoda.add(
      new THREE.Mesh(mergeGeometries(walls, false), wallMat),
      new THREE.Mesh(mergeGeometries(timber, false), timberMat),
      new THREE.Mesh(mergeGeometries(roofs, false), roofMat)
    );
    const lanternPositions = [];
    for (let level = 0; level < 5; level++) {
      const width = 6.8 - level * 0.72;
      const y = level * 1.72 + 0.74;
      lanternPositions.push(-width * 0.23, y, -width * 0.39);
      lanternPositions.push(width * 0.23, y, -width * 0.39);
    }
    const lanternGeo = new THREE.BufferGeometry();
    lanternGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lanternPositions), 3));
    const lanterns = new THREE.Points(lanternGeo, this.cityLightMat);
    lanterns.name = 'Pagoda Evening Lanterns';
    lanterns.renderOrder = 3;
    pagoda.add(lanterns);
    const x = -27, z = 86;
    pagoda.position.set(x, this.terrainHeightAt(x, z) + 0.04, z);
    pagoda.rotation.y = -0.08;
    pagoda.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.receiveShadow = false;
    });
    this.vista.add(pagoda);
    this.kyotoPagoda = pagoda;
    this.pagodaWallMat = wallMat;
    this.pagodaTimberMat = timberMat;
    this.pagodaRoofMat = roofMat;
  },

  makeBayWaterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const rnd = mulberry32(7271);
    ctx.fillStyle = '#4e94b9';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) {
      const x = rnd() * 256;
      const y = rnd() * 256;
      const len = 3 + rnd() * 28;
      ctx.strokeStyle = rnd() < 0.24
        ? `rgba(226,245,241,${0.16 + rnd() * 0.3})`
        : `rgba(18,86,132,${0.1 + rnd() * 0.22})`;
      ctx.lineWidth = 0.5 + rnd() * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (rnd() - 0.5) * 1.5);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(22, 10);
    return tex;
  },

  /** Actual open water, reflective glints and small moving boats. */
  buildSummitBay() {
    const layout = {
      index: 0, name: 'Kyoto Bay Water', parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0,
      footprint: summitFootprint(), bind: { bay: 'water' }
    };
    return this.placeAsset('summit-bay', layout, () => vistaMethods.meshSummitBayClassic.call(this, layout));
  },

  meshSummitBayClassic(layout) {
    const tex = this.makeBayWaterTexture();
    const geo = new THREE.PlaneGeometry(720, 320, 80, 34);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + 300;
      const ripple = Math.sin(x * 0.075 + z * 0.12) * 0.08 +
        Math.sin(x * 0.021 - z * 0.083) * 0.11;
      pos.setXYZ(i, x, -12.8 + ripple, z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      map: tex, bumpMap: tex, bumpScale: 0.085,
      color: 0x4f9ec7, emissive: 0x113a55, emissiveIntensity: 0.18,
      roughness: 0.32, metalness: 0.08, envMapIntensity: 1.15, fog: false
    });
    const bay = new THREE.Mesh(geo, mat);
    bay.name = 'Kyoto Bay Water';
    bay.receiveShadow = false;
    bay.castShadow = false;
    this.vista.add(bay);
    this.bay = bay;
    this.bayMat = mat;
    this.bayTexture = tex;

    const rnd = mulberry32(8842);
    const glintCount = this.previewQuality ? 80 : 180;
    const glintPos = new Float32Array(glintCount * 3);
    for (let i = 0; i < glintCount; i++) {
      const z = 168 + Math.pow(rnd(), 0.72) * 250;
      glintPos[i * 3] = (rnd() - 0.5) * (18 + (z - 168) * 0.28);
      glintPos[i * 3 + 1] = -12.43 + rnd() * 0.12;
      glintPos[i * 3 + 2] = z;
    }
    const glintGeo = new THREE.BufferGeometry();
    glintGeo.setAttribute('position', new THREE.BufferAttribute(glintPos, 3));
    const glintMat = new THREE.PointsMaterial({
      map: glowTexture(255, 242, 194, 56), color: 0xfff0bd,
      size: 1.05, transparent: true, opacity: 0.34,
      depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true, fog: false
    });
    const glints = new THREE.Points(glintGeo, glintMat);
    glints.name = 'Bay Sun Path';
    this.vista.add(glints);
    this.bayGlints = glints;
    this.bayGlintMat = glintMat;

    this.vistaBoats = [];
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x263d4a, roughness: 0.76 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xf4ecdc, roughness: 0.95, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.36), hullMat);
      boat.add(hull);
      if (i < 4) {
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.85), sailMat);
        sail.position.set(0, 0.5, 0);
        sail.rotation.y = i % 2 ? 0.25 : -0.2;
        boat.add(sail);
      } else {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.26), sailMat);
        cabin.position.y = 0.22;
        boat.add(cabin);
      }
      const z = 186 + rnd() * 176;
      boat.position.set((rnd() - 0.5) * (90 + z * 0.24), -12.25, z);
      boat.scale.setScalar(0.65 + rnd() * 0.75);
      boat.rotation.y = rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      boat.userData.speed = (0.7 + rnd() * 0.9) * (boat.rotation.y > 0 ? 1 : -1);
      boat.userData.limit = 150 + z * 0.42;
      this.vista.add(boat);
      this.vistaBoats.push(boat);
    }
  },

  /** Harbour towers, bridge, cranes and islands occupy their own depths. */
  buildHarbourAndIslands() {
    const rnd = mulberry32(19271);
    const skylineCount = this.previewQuality ? 72 : 138;
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x84949a, roughness: 0.82, metalness: 0.04, fog: false
    });
    const skyline = new THREE.InstancedMesh(towerGeo, towerMat, skylineCount);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const lights = [];
    for (let i = 0; i < skylineCount; i++) {
      const z = 178 + rnd() * 48;
      const x = (rnd() - 0.5) * 245;
      const landmark = rnd() < 0.12;
      const w = 0.9 + rnd() * (landmark ? 3.4 : 2.2);
      const d = 0.8 + rnd() * 2.4;
      const h = 1.3 + rnd() * rnd() * (landmark ? 15 : 7.5);
      dummy.position.set(x, -12.45 + h * 0.5, z);
      dummy.rotation.set(0, (rnd() - 0.5) * 0.08, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      skyline.setMatrixAt(i, dummy.matrix);
      col.setHex([0x74878f, 0x91a0a1, 0xa2aaa6, 0x6d808b][Math.floor(rnd() * 4)]);
      skyline.setColorAt(i, col);
      if (landmark || rnd() < 0.42) {
        for (let y = 0.8; y < h - 0.2; y += 1.1) {
          lights.push(x - w * 0.51, -12.45 + y, z);
        }
      }
    }
    skyline.instanceMatrix.needsUpdate = true;
    if (skyline.instanceColor) skyline.instanceColor.needsUpdate = true;
    skyline.name = 'Osaka Harbour Skyline';
    skyline.castShadow = skyline.receiveShadow = false;
    this.vista.add(skyline);
    this.harbourSkyline = skyline;
    this.harbourSkylineMax = skylineCount;
    this.skylineMat = towerMat;

    const harbourLightGeo = new THREE.BufferGeometry();
    harbourLightGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lights), 3));
    const harbourLightMat = new THREE.PointsMaterial({
      map: glowTexture(255, 190, 91, 40), color: 0xffb457,
      size: 0.42, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true, fog: true
    });
    const harbourLights = new THREE.Points(harbourLightGeo, harbourLightMat);
    harbourLights.name = 'Harbour Window Lights';
    harbourLights.visible = false;
    this.vista.add(harbourLights);
    this.harbourLights = harbourLights;
    this.harbourLightMat = harbourLightMat;

    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xb7b9b2, roughness: 0.78, fog: false });
    const bridge = new THREE.Group();
    bridge.name = 'Bay Bridge';
    bridge.position.set(8, 0, 238);
    bridge.add(box(142, 0.24, 0.9, bridgeMat, 0, -8.95, 0));
    for (const x of [-42, 42]) {
      bridge.add(box(0.72, 11, 0.72, bridgeMat, x, -3.55, 0));
      bridge.add(box(9, 0.36, 0.72, bridgeMat, x, 0.75, 0));
    }
    for (let x = -68; x <= 68; x += 8.5) bridge.add(box(0.18, 3.4, 0.18, bridgeMat, x, -7.25, 0));
    bridge.scale.setScalar(0.82);
    bridge.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    this.vista.add(bridge);
    this.bridgeMat = bridgeMat;

    const islandMat = new THREE.MeshLambertMaterial({ color: 0x477054, fog: false });
    const islandDefs = [
      [-128, -13.05, 279, 31, 3.8, 18], [119, -13.25, 305, 43, 4.8, 21],
      [-38, -13.35, 356, 24, 3.1, 14], [187, -13.45, 382, 56, 5.2, 26]
    ];
    this.vistaIslands = [];
    for (const [x, y, z, sx, sy, sz] of islandDefs) {
      const island = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), islandMat);
      island.position.set(x, y, z);
      island.scale.set(sx, sy, sz);
      island.rotation.y = rnd() * Math.PI;
      island.castShadow = island.receiveShadow = false;
      this.vista.add(island);
      this.vistaIslands.push(island);
    }
    this.islandMat = islandMat;

    // A readable ferris wheel provides scale without dominating Kyoto's
    // traditional foreground landmarks.
    const wheel = new THREE.Group();
    wheel.name = 'Harbour Ferris Wheel';
    wheel.position.set(91, -4.15, 205);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xe3dfd0, emissive: 0x614522, emissiveIntensity: 0.05,
      roughness: 0.72, fog: false
    });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.12, 6, 36), wheelMat);
    wheel.add(rim);
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.06, 0.06), wheelMat);
      spoke.rotation.z = i * Math.PI / 8;
      wheel.add(spoke);
    }
    wheel.add(box(0.34, 9.5, 0.34, wheelMat, 0, -4.6, 0));
    wheel.scale.setScalar(0.82);
    this.vista.add(wheel);
    this.ferrisWheel = wheel;
    this.ferrisWheelMat = wheelMat;
  },

  /** Three thick terrain ranges close the bay without a horizon card. */
  buildHorizonRanges() {
    const layout = {
      index: 0, parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0,
      footprint: summitFootprint()
    };
    return this.placeAsset('horizon', layout, () => vistaMethods.meshHorizonRangesClassic.call(this, layout));
  },

  meshHorizonRangesClassic(layout) {
    const defs = [
      { x: -58, z: 370, width: 540, depth: 76, base: -14.2, peak: 43, color: 0x4a8195, seed: 41 },
      { x: 66, z: 475, width: 720, depth: 90, base: -15.1, peak: 37, color: 0x6497aa, seed: 57 },
      { x: 0, z: 575, width: 900, depth: 100, base: -16, peak: 31, color: 0x86b0c0, seed: 73 }
    ];
    this.horizonRangeMats = [];
    for (let layer = 0; layer < defs.length; layer++) {
      const def = defs[layer];
      const geo = new THREE.PlaneGeometry(def.width, def.depth, 88, 10);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + def.x;
        const localZ = pos.getZ(i);
        const z = localZ + def.z;
        const profile = Math.pow(Math.max(0, Math.sin((localZ / def.depth + 0.5) * Math.PI)), 0.58);
        const broad = 0.52 + Math.sin(x * 0.012 + def.seed) * 0.2 +
          Math.sin(x * 0.029 + def.seed * 0.3) * 0.1;
        const detail = worldNoise(x, def.seed * 9, 0.014, 4, def.seed) * 0.42;
        const y = def.base + profile * def.peak * Math.max(0.2, broad + detail);
        pos.setXYZ(i, x, y, z);
        const slopeLight = clamp01(0.25 + detail + (x / def.width + 0.5) * 0.28);
        // Neutral per-vertex relief lets the live material colour carry the
        // phase/weather tint without multiplying the blue hue twice.
        const shade = 0.72 + slopeLight * 0.22 + layer * 0.025;
        colors[i * 3] = shade;
        colors[i * 3 + 1] = shade;
        colors[i * 3 + 2] = shade;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        color: def.color, vertexColors: true, fog: false, side: THREE.DoubleSide
      });
      mat.userData = { baseColor: new THREE.Color(def.color), layer };
      const range = new THREE.Mesh(geo, mat);
      range.name = `Horizon Mountain Range ${layer + 1}`;
      range.castShadow = range.receiveShadow = false;
      this.vista.add(range);
      this.horizonRangeMats.push(mat);
    }
  },

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
  },

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
  },

  loadVistaLandmarks() {
    const layout = {
      index: 0, name: 'Blender Kyoto Roofscape', parent: 'Layered Kyoto Bay Vista', x: 8, y: -5.6, z: 68, ry: Math.PI,
      footprint: summitFootprint(), bind: { vistaLandmarks: 'roofscape' }
    };
    return this.placeAsset('blender-roofscape', layout, () => vistaMethods.meshLoadVistaLandmarksClassic.call(this, layout));
  },

  meshLoadVistaLandmarksClassic(layout) {
    // Authored in Blender, merged to one mesh with six material primitives.
    // It is a hero middle-distance district; the procedural city around it
    // remains complete if the optional asset is unavailable.
    const loader = new GLTFLoader();
    loader.load(SUMMIT_LANDMARKS_SRC, (gltf) => {
      const landmark = gltf.scene;
      landmark.name = 'Blender Kyoto Roofscape';
      // Large enough to read as Kyoto's near temple district, while its
      // procedural neighbours continue for several hundred metres behind it.
      landmark.position.set(8, -5.6, 68);
      landmark.rotation.y = Math.PI;
      landmark.scale.setScalar(0.72);
      const landmarkMats = new Set();
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
          if (!mat.userData) mat.userData = {};
          mat.userData.summitBaseColor = mat.color.clone();
          mat.userData.summitBaseRoughness = mat.roughness;
          landmarkMats.add(mat);
        }
      });
      this.vista.add(landmark);
      this.vistaLandmarks = landmark;
      this.landmarkMats = Array.from(landmarkMats);
    }, undefined, (error) => {
      console.warn('Summit landmark layer could not be loaded; using the procedural city.', error);
    });
  },

  buildSummitClouds() {
    // Dimensional cumulus banks at several depths. Low-poly lobes catch the
    // live sun independently and overlap in parallax; no cloud is painted
    // into the horizon or flattened onto a panorama.
    this.summitClouds = [];
    const defs = [
      { x: -98, y: 47, z: 186, sx: 58, sy: 19, lobes: 34 },
      { x: 64, y: 57, z: 215, sx: 78, sy: 39, lobes: 58 },
      { x: 151, y: 41, z: 252, sx: 54, sy: 17, lobes: 30 },
      { x: -168, y: 72, z: 302, sx: 68, sy: 22, lobes: 31 },
      { x: 30, y: 29, z: 350, sx: 200, sy: 12, lobes: 48, small: true },
      { x: 0, y: 35, z: 167, sx: 112, sy: 24, lobes: 46, storm: true }
    ];
    // Rounded lobes retain an illustrated silhouette without exposing the
    // large triangular facets that made the old banks read as boulders.
    const cloudGeo = new THREE.SphereGeometry(1, 14, 9);
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfff9e9, emissive: 0xfff9e9, emissiveIntensity: 0.12,
        roughness: 1, metalness: 0, transparent: !!def.storm,
        opacity: def.storm ? 0 : 1, depthWrite: !def.storm, fog: false
      });
      const mesh = new THREE.InstancedMesh(cloudGeo, mat, def.lobes);
      const dummy = new THREE.Object3D();
      const shade = new THREE.Color();
      for (let lobe = 0; lobe < def.lobes; lobe++) {
        const core = lobe < Math.ceil(def.lobes * 0.26);
        const a = this.rng() * Math.PI * 2;
        const r = Math.pow(this.rng(), core ? 1.8 : 0.72);
        const dx = Math.cos(a) * r * def.sx * 0.48;
        const dz = (this.rng() - 0.5) * def.sx * 0.18;
        const shelf = 1 - Math.abs(dx) / (def.sx * 0.56);
        const dy = (this.rng() - 0.42) * def.sy * 0.72 + Math.max(0, shelf) * def.sy * 0.16;
        const s = (3.5 + this.rng() * 5.4) * (core ? 1.3 : 1) * (def.small ? 0.55 : 1);
        dummy.position.set(dx, dy, dz);
        dummy.rotation.set(this.rng() * 0.5, this.rng() * Math.PI * 2, this.rng() * 0.5);
        dummy.scale.set(s * (1.15 + this.rng() * 0.75), s * (0.7 + this.rng() * 0.7), s);
        dummy.updateMatrix();
        mesh.setMatrixAt(lobe, dummy.matrix);
        shade.setHex(dy < -def.sy * 0.08 ? 0xd7e1e3 : (this.rng() < 0.35 ? 0xf8f3e4 : 0xffffff));
        mesh.setColorAt(lobe, shade);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.position.set(def.x, def.y, def.z);
      mesh.castShadow = mesh.receiveShadow = false;
      mesh.name = def.storm ? 'Summit Weather Cloud Bank' : `Summit Cumulus Bank ${i + 1}`;
      mesh.userData.summitMaxCount = def.lobes;
      this.vista.add(mesh);
      this.summitClouds.push({
        mesh, material: mat, baseOpacity: 1, storm: !!def.storm,
        speed: 0.24 + this.rng() * 0.24,
        minX: -235 - def.sx,
        maxX: 235 + def.sx
      });
    }
  },

  /**
   * Re-light the entire distant world from a small shared material set. The
   * instanced roofs and towers never need per-instance work after creation.
   */
  updateVistaEnvironment(dt, t, sky) {
    if (!sky) return;
    const pal = sky.currentPalette || (sky.resolvePalette && sky.resolvePalette());
    const sunY = sky.sunDir ? sky.sunDir.y : 1;
    const sunUp = Math.max(0, sunY);
    const dayness = THREE.MathUtils.clamp((sunY + 0.18) * 2.2, 0, 1);
    const nightness = THREE.MathUtils.clamp(1 - sunUp * 5, 0, 1);
    const golden = THREE.MathUtils.clamp((0.42 - sunUp) / 0.42, 0, 1) *
      THREE.MathUtils.clamp(sunUp / 0.06, 0, 1);
    const rain = summitWeatherAmount(sky, 'rain');
    const mist = summitWeatherAmount(sky, 'mist');
    const cloudy = summitWeatherAmount(sky, 'cloudy');
    const snow = summitWeatherAmount(sky, 'snow');

    // The supplementary summit lights now fall with the sun. Moonlight and
    // the global sky fill keep silhouettes readable without bleaching night.
    if (this.summitSkyFill) {
      this.summitSkyFill.intensity = 0.12 + dayness * 0.62 + nightness * 0.1;
      if (pal && pal.hemiSky && this.summitSkyFill.color && this.summitSkyFill.color.copy) {
        this.summitSkyFill.color.copy(pal.hemiSky);
        this.summitSkyFill.groundColor.copy(pal.hemiGround);
      }
    }
    if (this.summitWarmFill) {
      this.summitWarmFill.intensity = 0.06 + golden * 0.72 + sunUp * 0.12;
      if (pal && pal.warm && this.summitWarmFill.color && this.summitWarmFill.color.copy) {
        this.summitWarmFill.color.copy(pal.warm);
      }
    }

    // The headless logic harness supplies only a minimal `sun` palette.
    // Particle/weather simulation still runs there; material art updates do
    // not need to manufacture missing colours.
    if (!pal || !pal.horizon || !pal.top || !pal.cloud) return;

    const setColor = (material, color) => {
      if (material && material.color && material.color.copy) material.color.copy(color);
    };
    const setEmissive = (material, color, strength) => {
      if (!material) return;
      if (material.emissive && material.emissive.copy) material.emissive.copy(color);
      material.emissiveIntensity = strength;
    };

    const wallColor = this._vistaColorA.copy(pal.hemiGround).lerp(pal.sun, 0.52 + golden * 0.18);
    wallColor.multiplyScalar(0.38 + dayness * 0.62);
    setColor(this.cityWallMat, wallColor);
    const roofColor = this._vistaColorB.copy(pal.top).lerp(pal.horizon, 0.44).multiplyScalar(0.3 + dayness * 0.7);
    setColor(this.cityRoofMat, roofColor);
    setColor(this.cityEaveMat, this._vistaColorC.copy(roofColor).multiplyScalar(0.72));
    setColor(this.pagodaWallMat, wallColor);
    setColor(this.pagodaRoofMat, roofColor);
    setColor(this.pagodaTimberMat,
      this._vistaColorC.copy(pal.hemiGround).lerp(pal.warm, golden * 0.16).multiplyScalar(0.3 + dayness * 0.7));
    if (this.cityRoofMat) this.cityRoofMat.roughness = 0.86 - rain * 0.26;
    if (this.cityEaveMat) this.cityEaveMat.roughness = 0.9 - rain * 0.24;
    if (this.pagodaRoofMat) this.pagodaRoofMat.roughness = 0.84 - rain * 0.24;
    setEmissive(this.pagodaWallMat, pal.warm, nightness * 0.11);
    setEmissive(this.pagodaTimberMat, pal.warm, nightness * 0.055);
    setEmissive(this.pagodaRoofMat, pal.horizon, nightness * 0.035);
    const greenColor = this._vistaColorC.copy(pal.hemiGround).lerp(pal.horizon, mist * 0.38).multiplyScalar(0.42 + dayness * 0.58);
    setColor(this.cityGardenMat, greenColor);
    setColor(this.islandMat, greenColor);

    const waterColor = this._vistaColorA.copy(pal.horizon).lerp(pal.top, 0.32).multiplyScalar(0.5 + dayness * 0.5);
    setColor(this.bayMat, waterColor);
    setColor(this.vistaRiverMat, waterColor);
    setEmissive(this.bayMat, pal.horizon, 0.035 + nightness * 0.16);
    setEmissive(this.vistaRiverMat, pal.horizon, 0.025 + nightness * 0.12);
    if (this.bayMat) {
      this.bayMat.roughness = 0.27 + rain * 0.35 + (cloudy + mist + snow) * 0.08;
      this.bayMat.envMapIntensity = 0.72 + dayness * 0.65;
    }
    if (this.bayTexture && this.bayTexture.offset) {
      this.bayTexture.offset.x = (this.bayTexture.offset.x + dt * (0.006 + rain * 0.018)) % 1;
      this.bayTexture.offset.y = (this.bayTexture.offset.y + dt * 0.0025) % 1;
    }
    if (this.bayGlints && this.bayGlintMat) {
      this.bayGlints.position.x = (sky.sunDir ? sky.sunDir.x : 0) * 112;
      this.bayGlintMat.color.copy(pal.sun);
      this.bayGlintMat.opacity = (0.04 + Math.pow(sunUp, 0.7) * 0.52 + nightness * 0.04) *
        (1 - rain * 0.72 - mist * 0.52 - cloudy * 0.3);
      this.bayGlints.visible = this.bayGlintMat.opacity > 0.01;
    }

    const lights = nightness * (0.72 + cloudy * 0.18 + rain * 0.1) *
      (0.92 + Math.sin(t * 1.7) * 0.04);
    for (const [points, material, scale] of [
      [this.cityLights, this.cityLightMat, 0.94],
      [this.harbourLights, this.harbourLightMat, 1]
    ]) {
      if (!points || !material) continue;
      material.opacity = lights * scale;
      points.visible = material.opacity > 0.012;
    }
    setColor(this.skylineMat, this._vistaColorB.copy(pal.horizon).multiplyScalar(0.44 + dayness * 0.56));
    setColor(this.bridgeMat, this._vistaColorB.copy(pal.horizon).lerp(pal.sun, 0.28).multiplyScalar(0.5 + dayness * 0.5));
    if (this.ferrisWheelMat) {
      setColor(this.ferrisWheelMat, this._vistaColorB.copy(pal.horizon).lerp(pal.sun, 0.42).multiplyScalar(0.46 + dayness * 0.54));
      setEmissive(this.ferrisWheelMat, pal.warm, nightness * 0.75);
    }

    for (const mat of this.horizonRangeMats || []) {
      const layer = mat.userData ? mat.userData.layer || 0 : 0;
      const base = mat.userData && mat.userData.baseColor;
      if (!base || !mat.color || !mat.color.copy) continue;
      mat.color.copy(base).lerp(pal.horizon, 0.26 + layer * 0.2 + mist * 0.2);
      mat.color.multiplyScalar(0.4 + dayness * 0.6);
    }
    for (const mat of this.landmarkMats || []) {
      const base = mat.userData && mat.userData.summitBaseColor;
      if (base && mat.color && mat.color.copy) mat.color.copy(base).multiplyScalar(0.34 + dayness * 0.66);
      setEmissive(mat, pal.warm, nightness * 0.08);
      const baseRoughness = mat.userData && mat.userData.summitBaseRoughness;
      mat.roughness = Math.max(0.58, (baseRoughness == null ? 0.85 : baseRoughness) - rain * 0.22);
    }

    for (const cloud of this.summitClouds || []) {
      const mesh = cloud.mesh;
      const material = cloud.material;
      if (!mesh || !material) continue;
      const sunFacing = sky.sunDir
        ? clamp01((mesh.position.x * sky.sunDir.x + mesh.position.z * sky.sunDir.z) /
          Math.max(1, Math.hypot(mesh.position.x, mesh.position.z)) * 0.5 + 0.5)
        : 0.5;
      material.color.copy(pal.cloud).lerp(pal.warm, sunFacing * golden * 0.68);
      setEmissive(material, pal.cloud, 0.16 + nightness * 0.08);
      const stormOpacity = Math.max(cloudy * 0.62, rain * 0.94, mist * 0.36, snow * 0.72);
      material.opacity = cloud.storm
        ? stormOpacity * 0.88
        : 1;
      mesh.visible = material.opacity > 0.01;
    }

    if (this.MAT && this.MAT.lanternGlow) {
      this.MAT.lanternGlow.emissiveIntensity = 0.18 + nightness * 2.1;
    }
    if (this.vistaRoadMat) this.vistaRoadMat.roughness = 1 - rain * 0.36;

    for (const boat of this.vistaBoats || []) {
      boat.position.x += boat.userData.speed * dt * (1 + rain * 0.35);
      const limit = boat.userData.limit || 200;
      if (boat.position.x > limit) boat.position.x = -limit;
      else if (boat.position.x < -limit) boat.position.x = limit;
    }
  }
};
