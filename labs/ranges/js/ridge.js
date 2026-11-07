// Geometry for the far field. A "frieze" is the multiplane layer: a painted
// face whose top edge is a silhouette, with a narrow shoulder sloping back
// so the sun can tell a ridge from a cardboard cut-out. A "patch" is the
// game's way — a real displaced plane with baked vertex colours.
import * as THREE from 'three';
import { fbm1, worldNoise, smoothstep, terrainSector, terrainHeight } from './profiles.js';

/**
 * Frieze strip. cols columns; the front face is rows tall, the crown shoulder
 * runs back `depth` and drops `dip` of the height. uv.y = height fraction,
 * so the shared range shader can paint treeline, rock and mist by altitude.
 * `jitter` roughens the silhouette like a forest edge (0 = painted-smooth).
 */
export function friezeGeometry(profile, { width = 400, height = 60, depth = 18, dip = 0.16, cols = 160, rows = 7, jitter = 0.05, seed = 3, baseY = 0 } = {}) {
  const pos = [], uv = [], idx = [];
  const topAt = (c) => baseY + height * (profile(c / (cols - 1)) + jitter * (fbm1(c * 0.11, 3, seed) - 0.5) * 2);
  // Front face grid
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c < cols; c++) {
      const x = (c / (cols - 1) - 0.5) * width;
      pos.push(x, topAt(c) * v, 0);
      uv.push(c / (cols - 1), v);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  // Crown shoulder: one strip sloping back and down
  const rowBase = (rows + 1) * cols;
  for (let c = 0; c < cols; c++) {
    const x = (c / (cols - 1) - 0.5) * width;
    pos.push(x, topAt(c) * (1 - dip), -depth);
    uv.push(c / (cols - 1), 1 - dip * 0.9);
  }
  for (let c = 0; c < cols - 1; c++) {
    const a = rows * cols + c, b = a + 1, d = rowBase + c, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  // Back skirt down to base so the shoulder never shows daylight under it
  const rowBack = rowBase + cols;
  for (let c = 0; c < cols; c++) {
    const x = (c / (cols - 1) - 0.5) * width;
    pos.push(x, baseY - height * 0.06, -depth);
    uv.push(c / (cols - 1), 0);
  }
  for (let c = 0; c < cols - 1; c++) {
    const a = rowBase + c, b = a + 1, d = rowBack + c, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * A range as an arc of frieze wrapped part-way around the viewer — the way
 * the game's ranges ring the valley but open south. `wall(bearing)` folds
 * the game's sector weight into the silhouette so the arc sinks at the
 * flanks and vanishes behind the opening.
 */
export function arcFriezeGeometry(profile, { radius = 170, bearing = Math.PI, arc = 2.6, height = 60, depth = 24, cols = 180, rows = 6, jitter = 0.05, seed = 3, baseY = -2, wall = null } = {}) {
  const pos = [], uv = [], idx = [];
  const at = (c) => {
    const u = c / (cols - 1);
    const a = bearing - arc / 2 + u * arc;
    const w = wall ? (0.15 + 0.85 * wall(a)) : 1;
    const h = Math.max(1.2, height * (profile(u) + jitter * (fbm1(c * 0.13, 3, seed) - 0.5) * 2) * w);
    return { x: Math.sin(a) * radius, z: -Math.cos(a) * radius, h };
  };
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c < cols; c++) {
      const p = at(c);
      pos.push(p.x, baseY + p.h * v, p.z);
      uv.push(c / (cols - 1), v);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  // shoulder, sloping outward (away from the viewer)
  const rowBase = (rows + 1) * cols;
  for (let c = 0; c < cols; c++) {
    const p = at(c);
    const a = bearing - arc / 2 + (c / (cols - 1)) * arc;
    const out = radius + depth;
    pos.push(Math.sin(a) * out, baseY + p.h * (1 - 0.14), -Math.cos(a) * out);
    uv.push(c / (cols - 1), 0.88);
  }
  for (let c = 0; c < cols - 1; c++) {
    const a = rows * cols + c, b = a + 1, d = rowBase + c, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Displaced plane with baked vertex colours — the game's `buildMountains`
 * way: colour is painted once, including the haze, and cannot follow the sun.
 * `colorAt(x, z, y, d, c)` fills a THREE.Color; `heightAt` is the landform.
 */
export function terrainPatch({ size = 900, seg = 170, heightAt = terrainHeight, colorAt = null, inner = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const inside = Math.abs(x) < inner && Math.abs(z) < inner;
    const h = heightAt(x, z);
    pos.setY(i, inside ? h - 4 : h);
    if (colorAt) {
      colorAt(x, z, h, Math.hypot(x, z), c);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** The game's own mountain colour recipe (ported from buildMountains).
 *  `hazeK` scales the baked distance haze — 1 is the game's static look. */
export function gameRangeColors(x, z, h, d, c, hazeK = 1) {
  const n = worldNoise(x, z, 0.04, 3, 17);
  c.setHex(0x2c4a28).lerp(_forestLight.setHex(0x4a6e3a), n * 0.8);
  const rocky = smoothstep(70, 130, h) * (0.4 + n * 0.6);
  c.lerp(_rock.setHex(0x6a6a70), rocky * 0.7);
  const { opening } = terrainSector(x, z);
  if (opening > 0) {
    c.lerp(_lowland.setHex(0x8aa257), opening * 0.8);
    c.lerp(_lowlandFar.setHex(0xa9b7a4), opening * smoothstep(120, 320, d) * 0.7);
  }
  c.lerp(_haze.setHex(0x8d90b4), smoothstep(105, 380, d) * 0.88 * hazeK);
}
const _forestLight = new THREE.Color(), _rock = new THREE.Color(), _lowland = new THREE.Color(), _lowlandFar = new THREE.Color(), _haze = new THREE.Color();

/** Meadow-disc vertex colours for the bench floor (painterly, near-field). */
export function meadowColors(x, z, h, d, c) {
  const n1 = worldNoise(x, z, 0.05, 3, 3), n2 = worldNoise(x, z, 0.14, 2, 5), n3 = worldNoise(x, z, 0.028, 3, 7);
  c.setHex(0x5d8442).lerp(_gold.setHex(0x7a9448), n1 * 0.7).lerp(_moss.setHex(0x3d6030), n2 * 0.45);
  if (n3 > 0.58) c.lerp(_dark.setHex(0x2c4a26), (n3 - 0.58) / 0.42 * 0.7);
  const { wall } = terrainSector(x, z);
  if (d > 40) c.lerp(_forest.setHex(0x2f4f2a), smoothstep(40, 90, d) * (0.4 + 0.6 * wall));
}
const _gold = new THREE.Color(), _moss = new THREE.Color(), _dark = new THREE.Color(), _forest = new THREE.Color();
