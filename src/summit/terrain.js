// Summit landform (天上), split out of src/mountaintop.js: the terrain and
// sightline queries, the one polar terrain mesh from under the meadow rim to
// the horizon, the earthen shoulder under the torii approach, and the
// painted land colour and wash. perchSightlineAt() is the protected view:
// nothing planted below it can cover the city or the sea from the seat.
// SummitManager (src/mountaintop.js) delegates to these methods with
// `this` = the manager, so the code reads exactly as it did in the class.

import * as THREE from 'three';
import { worldNoise } from '../textures.js?v=20261107a';
import {
  mulberry32, clamp01, smoothstep, MEADOW_Y, CORRIDOR_W, CORRIDOR_Z0, ENTRY_Y, LANDING_Z0,
  LANDING_Z1, LOWER_STEP_RUN, LOWER_STEP_RISE, LOWER_PATH_Z1, LAND_OUTER_R, PERCH_CAM,
  approachTopAt
} from './common.js?v=20261107a';

export const terrainMethods = {
  /** Decorative earth immediately beneath the stone approach. */
  approachSupportAt(x, z) {
    let fan = 0;
    let y;
    if (z < LANDING_Z0) {
      y = approachTopAt(z) - 0.38;
    } else if (z <= LANDING_Z1) {
      y = ENTRY_Y - 0.5;
    } else {
      // A smooth ramp through the thick lower slabs, so the earth reads as
      // one slope with the stones set into it rather than a terrace.
      fan = smoothstep(LANDING_Z1, LOWER_PATH_Z1, z);
      const run = Math.min(z, LOWER_PATH_Z1) - LANDING_Z1;
      y = ENTRY_Y - 0.5 - run / LOWER_STEP_RUN * LOWER_STEP_RISE;
    }
    return {
      y,
      halfWidth: THREE.MathUtils.lerp(CORRIDOR_W + 0.35, 4.2, fan),
      fan
    };
  },

  /**
   * The land around the mountain: the Kyoto basin ahead, slipping under the
   * bay past the shoreline, and wooded valleys elsewhere that climb into a
   * ring of ridges, so no sightline ever ends in open sky below the horizon.
   */
  landHeightAt(x, z) {
    const r = Math.hypot(x, z);
    const away = Math.abs(Math.atan2(x, z));
    const basin = THREE.MathUtils.lerp(this.vistaGroundHeight(x, z), -15.5, smoothstep(168, 184, z));
    const valley = -12.5 + (worldNoise(x, z, 0.018, 3, 311) - 0.5) * 5;
    const ridges = smoothstep(70, 240, r) * (5 + 22 * worldNoise(x, z, 0.0075, 4, 337));
    return THREE.MathUtils.lerp(basin, valley + ridges, smoothstep(0.9, 1.55, away));
  },

  /**
   * Highest point at (x, z) that the seated scenic camera cannot see over
   * the meadow rim. Planting below it can never cover the city or the sea.
   */
  perchSightlineAt(x, z) {
    const ex = this.perchLocal.x + PERCH_CAM.x;
    const ez = this.perchLocal.z + PERCH_CAM.z;
    const eyeY = this.perchLocal.y + PERCH_CAM.y;
    const dist = Math.hypot(x - ex, z - ez);
    const ux = (x - ex) / dist, uz = (z - ez) / dist;
    const b = ex * ux + ez * uz;
    const rimDist = -b + Math.sqrt(Math.max(0, b * b - (ex * ex + ez * ez - 12.2 * 12.2)));
    return eyeY - (eyeY - MEADOW_Y) * dist / rimDist;
  },

  /**
   * Rendered ground for everything outside the meadow disc: a rounded brow
   * that falls through forested flanks into landHeightAt(), long and gentle
   * toward the city, steeper behind. The stone approach and the lower path
   * are pressed into it so the stairs always sit on earth.
   */
  terrainHeightAt(x, z) {
    const r = Math.hypot(x, z);
    const front = 1 - smoothstep(0.5, 1.2, Math.abs(Math.atan2(x, z)));
    const reach = THREE.MathUtils.lerp(58, 34, front);
    const s = clamp01((r - 12.2) / (reach - 12.2));
    const fall = s * s * (3 - 2 * s);
    // Spurs and gullies so the flanks never read as a lathe-turned cone.
    const relief = (worldNoise(x, z, 0.07, 3, 17) - 0.5) * 3.4 *
      Math.sin(Math.PI * s) * (1 - front * 0.65);
    // Hummocks a few metres across, so the sun models the open slopes; they
    // fade out on the city floor and under the stone approach.
    const hummocks = (worldNoise(x, z, 0.16, 2, 41) - 0.5) * 0.7 * smoothstep(12.6, 16, r) *
      (1 - smoothstep(30, 44, r) * front);
    const underlap = (1 - smoothstep(11.5, 12.4, r)) * 0.12;
    let y = THREE.MathUtils.lerp(MEADOW_Y, this.landHeightAt(x, z), fall) + relief + hummocks - underlap;
    if (z > CORRIDOR_Z0 - 1.5 && z < LOWER_PATH_Z1 + 6) {
      const support = this.approachSupportAt(x, z);
      // Deeper under the stepped stair so the coarse terrain triangles stay
      // below the tighter approach shoulder that carries each tread.
      const depth = 0.12 + 0.26 * (1 - smoothstep(LANDING_Z0, LANDING_Z0 + 1, z));
      const bed = (1 - smoothstep(support.halfWidth, support.halfWidth + 2.6, Math.abs(x))) *
        smoothstep(CORRIDOR_Z0 - 1.5, CORRIDOR_Z0 - 0.5, z) *
        (1 - smoothstep(LOWER_PATH_Z1 + 1, LOWER_PATH_Z1 + 6, z));
      y = THREE.MathUtils.lerp(y, support.y - depth, bed);
    }
    return y;
  },

  buildApproachShoulder() {
    const zMin = CORRIDOR_Z0 - 0.75;
    const zMax = LOWER_PATH_Z1 + 3;
    const geo = new THREE.PlaneGeometry(2, 1, 32, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const moss = new THREE.Color(0x587a34);
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = clamp01(pos.getZ(i) + 0.5);
      const z = THREE.MathUtils.lerp(zMin, zMax, v);
      const support = this.approachSupportAt(0, z);
      const bankWidth = 3.4 + support.fan * 3;
      const outerHalfWidth = support.halfWidth + bankWidth;
      const x = u * outerHalfWidth;
      const sideWeight = 1 - smoothstep(support.halfWidth, outerHalfWidth, Math.abs(x));
      const startWeight = smoothstep(zMin, CORRIDOR_Z0, z);
      const endWeight = 1 - smoothstep(LOWER_PATH_Z1 - 1, zMax, z);
      const weight = sideWeight * startWeight * endWeight;
      const baseY = this.terrainHeightAt(x, z) - 0.025;
      // Break the long banks into small natural undulations, but only outside
      // the stone-bearing core so no earth can poke through a tread.
      const bankBand = smoothstep(CORRIDOR_W + 0.08, support.halfWidth, Math.abs(x)) * sideWeight;
      const bankRough = (worldNoise(x, z, 0.34, 2, 173) - 0.5) * 0.22 * bankBand;
      pos.setXYZ(i, x, THREE.MathUtils.lerp(baseY, support.y, weight) + bankRough, z);
      geo.attributes.uv.setXY(i, x / 6, -z / 6);

      // The hillside's own colour, darkening to moss in the stone joints.
      this.landColorAt(x, z, c);
      c.lerp(moss, (1 - smoothstep(CORRIDOR_W - 0.6, support.halfWidth + 0.2, Math.abs(x))) * 0.75);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const shoulder = new THREE.Mesh(geo, this.MAT.land);
    shoulder.name = 'Torii Approach Earthen Shoulder';
    shoulder.castShadow = false;
    shoulder.receiveShadow = true;
    shoulder.userData.coverage = {
      approachZMin: zMin,
      approachZMax: zMax,
      approachHalfWidth: CORRIDOR_W + 0.35,
      lowerPathZ: LOWER_PATH_Z1
    };
    this.group.add(shoulder);
    this.approachShoulder = shoulder;
  },

  /** Painted ground colour of the hillside, banks and far land at (x, z). */
  landColorAt(x, z, c) {
    const L = this._landPalette || (this._landPalette = {
      brow: new THREE.Color(0x8cb853),
      sunGrass: new THREE.Color(0x7ba744),
      sunHigh: new THREE.Color(0xa9c95c),
      shadeGrass: new THREE.Color(0x4c7b31),
      forestFloor: new THREE.Color(0x40692c),
      earth: new THREE.Color(0x9b8a5c),
      rock: new THREE.Color(0xa29e8f),
      plain: new THREE.Color(0x98ab70),
      fields: new THREE.Color(0xc2c787),
      ridge: new THREE.Color(0x4d7c42),
      seabed: new THREE.Color(0x5d7f78)
    });
    const r = Math.hypot(x, z);
    const away = Math.abs(Math.atan2(x, z));
    const patch = worldNoise(x, z, 0.06, 3, 21);
    const broad = worldNoise(x, z, 0.012, 3, 23);
    const fine = worldNoise(x, z, 0.24, 2, 29);
    // Sunlit grass on the brow and spurs, forest floor in the gullies,
    // dabbed with brighter tufts and the odd bare patch.
    c.copy(L.sunGrass).lerp(L.shadeGrass, smoothstep(0.4, 0.66, patch));
    c.lerp(L.sunHigh, smoothstep(0.55, 0.75, fine) * 0.6);
    c.lerp(L.earth, smoothstep(0.7, 0.8, fine) * smoothstep(0.35, 0.5, patch) * 0.5);
    c.lerp(L.brow, 1 - smoothstep(12.2, 17, r));
    c.lerp(L.forestFloor, smoothstep(18, 40, r) * (1 - smoothstep(0.55, 0.85, broad)) * 0.7);
    c.lerp(L.rock, smoothstep(0.66, 0.82, patch) * smoothstep(16, 26, r) * (1 - smoothstep(60, 90, r)) * 0.55);
    // The city floor: pale fields and gardens between the roofs.
    const city = (1 - smoothstep(0.75, 1.05, away)) * smoothstep(30, 44, r);
    c.lerp(L.plain, city * 0.85).lerp(L.fields, city * smoothstep(0.5, 0.75, broad) * 0.5);
    // Wooded valleys and ridges darken with distance from the summit.
    c.lerp(L.ridge, smoothstep(0.95, 1.4, away) * smoothstep(45, 120, r) * (0.75 + broad * 0.25));
    c.lerp(L.seabed, smoothstep(172, 186, z) * (1 - smoothstep(0.9, 1.3, away)));
    return c;
  },

  /**
   * One polar mesh from under the meadow rim to the far ridges: the summit's
   * flanks, the Kyoto basin the city stands on, and the valleys and ridges
   * that close every other direction. Rings crowd together near the brow,
   * where the shape is read up close, and spread out toward the haze.
   */
  buildSummitTerrain() {
    const inner = CORRIDOR_Z0 - 0.75;
    const rings = 150;
    const around = 288;
    const geo = new THREE.BufferGeometry();
    const vertexCount = (rings + 1) * (around + 1);
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 3);
    const c = new THREE.Color();
    let v = 0;
    for (let i = 0; i <= rings; i++) {
      const r = inner + (LAND_OUTER_R - inner) * Math.pow(i / rings, 2.15);
      for (let j = 0; j <= around; j++) {
        const a = (j / around) * Math.PI * 2;
        const x = Math.sin(a) * r;
        const z = Math.cos(a) * r;
        const y = this.terrainHeightAt(x, z);
        positions[v * 3] = x;
        positions[v * 3 + 1] = y;
        positions[v * 3 + 2] = z;
        uvs[v * 2] = x / 6;
        uvs[v * 2 + 1] = -z / 6;

        this.landColorAt(x, z, c);
        colors[v * 3] = c.r;
        colors[v * 3 + 1] = c.g;
        colors[v * 3 + 2] = c.b;
        v++;
      }
    }
    const index = [];
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < around; j++) {
        const a = i * (around + 1) + j;
        const b = a + around + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    // Painted vertex colour under a soft six-metre wash. The meadow's turf
    // map, tiled over a whole hillside, either stripes or goes flat.
    const terrain = new THREE.Mesh(geo, this.MAT.land);
    terrain.name = 'Summit Terrain';
    terrain.castShadow = false;
    terrain.receiveShadow = true;
    terrain.userData.coverage = { innerRadius: inner, outerRadius: LAND_OUTER_R };
    this.group.add(terrain);
    this.summitTerrain = terrain;
  },

  /** Height of the visible Kyoto basin in summit-local coordinates. */
  vistaGroundHeight(x, z) {
    const depth = clamp01((z - 34) / 150);
    const side = smoothstep(52 + depth * 38, 148, Math.abs(x));
    const folds = (worldNoise(x, z, 0.026, 3, 271) - 0.5) * (1.8 + side * 7.5);
    // Drop sharply just beyond the summit shoulder, then flatten into the
    // basin. This fans the near and far districts apart on screen instead of
    // compressing every roof into one horizon-thin strip.
    const basinDrop = smoothstep(0, 0.23, depth) * 8.1 + depth * 1.45;
    return -3.25 - basinDrop + side * (4.5 + depth * 6.5) + folds;
  },

  /**
   * A tileable 256px wash for the hillsides: soft light and shadow dapples
   * under short brush dabs of grass. Near-white on average, so it shades the
   * vertex colours rather than tinting them; one tile spans six metres.
   */
  makeLandTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const rnd = mulberry32(5150);
    ctx.fillStyle = '#d9d9d2';
    ctx.fillRect(0, 0, size, size);
    // Draw each mark at its wrapped copies so the tile edges meet.
    const wrapped = (x, y, reach, draw) => {
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          if (x + ox > -reach && x + ox < size + reach && y + oy > -reach && y + oy < size + reach) {
            draw(x + ox, y + oy);
          }
        }
      }
    };
    for (let i = 0; i < 70; i++) {
      const x = rnd() * size, y = rnd() * size, r = 18 + rnd() * 46;
      const light = rnd() < 0.5;
      const alpha = 0.08 + rnd() * 0.1;
      wrapped(x, y, r, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, light ? `rgba(255,255,236,${alpha})` : `rgba(64,80,40,${alpha})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * size, y = rnd() * size;
      const len = 3 + rnd() * 7;
      const lean = (rnd() - 0.5) * 0.9;
      const shade = rnd();
      ctx.strokeStyle = shade < 0.45
        ? `rgba(70,92,44,${0.12 + rnd() * 0.16})`
        : `rgba(255,252,214,${0.1 + rnd() * 0.16})`;
      ctx.lineWidth = 0.8 + rnd() * 1.4;
      wrapped(x, y, len, (px, py) => {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.sin(lean) * len, py - Math.cos(lean) * len);
        ctx.stroke();
      });
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }
};
