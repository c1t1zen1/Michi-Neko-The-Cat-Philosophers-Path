// Shared pieces of the hidden-places family (Moon Pool and Lantern Glade): the
// sun and night curves the classic update() reads from the Sky (here from the
// hour), shared textures, a polar disc, billboard sets, glow points, a small
// compose() that fuses sub-builders into one instance, and the leaf material.
//
// Nothing here reads Math.random or Date.now.
import * as THREE from 'three';
import { TAU, sstep, canvas2d, canvasTexture, indexed } from '../craft.js?v=20261113a';
import { nightnessAt } from '../lanterns/light.js?v=20261113a';

export { nightnessAt, TAU, sstep };

/** Sun height 0..~0.9 from the hour: the asymmetric path of Sky.updateDayNight() (clamped at the horizon). */
export function sunUpAt(hour) {
  const h = ((hour % 24) + 24) % 24, dayStart = 6.0, dayEnd = 19.2;
  let angle;
  if (h >= dayStart && h <= dayEnd) angle = ((h - dayStart) / (dayEnd - dayStart)) * Math.PI;
  else {
    const nt = h < dayStart ? h + 24 - dayEnd : h - dayEnd;
    angle = Math.PI + (nt / (24 - (dayEnd - dayStart))) * Math.PI;
  }
  return Math.max(0, Math.sin(angle) / Math.sqrt(1.25));
}
export const hourOf = (env) => (env && typeof env.hour === 'number' ? env.hour : 12);
/** Daylight the caustics need (HiddenPlaces.update: smooth(0.05, 0.4, sunUp)). */
export const dayLightAt = (hour) => sstep(0.05, 0.4, sunUpAt(hour));
/** Rain quiets the pool's drifting things (classic: weather rain or mist halves them). */
export const calmAt = (env) => 1 - 0.5 * sstep(0.15, 0.5, Math.max((env && env.wet) || 0, (env && env.mist) || 0));

/* ------------------------------------------------------- shared textures --- */

const cache = new WeakMap();
/** One thing per KitMaterials set, built lazily, never disposed by an instance. */
export function shared(km, key, make) {
  const owner = km && typeof km === 'object' ? km : cache;
  let bag = cache.get(owner);
  if (!bag) { bag = new Map(); cache.set(owner, bag); }
  if (!bag.has(key)) { const t = make(); if (t && t.userData) t.userData.kit = true; bag.set(key, t); }
  return bag.get(key);
}

/** A radial glow (the classic glowTexture, redrawn at 64 px). */
export function glowTexture(km, key, inner, outer) {
  return shared(km, 'glow:' + key, () => {
    const [c, x] = canvas2d(64, 64);
    const g = x.createRadialGradient(32, 32, 1, 32, 32, 31);
    g.addColorStop(0, inner); g.addColorStop(0.4, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return canvasTexture(c);
  });
}

/**
 * The one new merged material of the family: vertex-coloured, double-sided,
 * for lily pads, lotus, bamboo blades (and any leafy thing). Instance colours
 * multiply the vertex colours.
 */
export const leafMaterial = (km) => km.bamboo({ color: 0xffffff, vcol: true, side: THREE.DoubleSide, rough: 0.8 });

/** Free what an instance made itself (private materials and textures); never the shared ones. */
export function freePrivate(list) {
  for (const o of list) if (o && !(o.userData && o.userData.kit)) o.dispose();
}

/* ---------------------------------------------------------------- shapes --- */

/**
 * A disc (or pie) in the XZ plane facing up: a centre vertex and `rings`
 * rings of `segs` segments. y(rn, a) lifts a vertex (rn 0..1); color(rn, a, j)
 * returns [r, g, b]. uv is the plan position, v = 0 toward +z (the south).
 */
export function polarDisc(r, rings, segs, { a0 = 0, a1 = TAU, y = null, color = null, uvScale = 1 } = {}) {
  const pos = [0, y ? y(0, a0) : 0, 0], uv = [0.5, 0.5], col = [];
  if (color) col.push(...color(0, a0, 0));
  for (let i = 1; i <= rings; i++) {
    const rn = i / rings;
    for (let j = 0; j <= segs; j++) {
      const a = a0 + (a1 - a0) * (j / segs), c = Math.cos(a), s = Math.sin(a);
      pos.push(c * r * rn, y ? y(rn, a) : 0, s * r * rn);
      uv.push(0.5 + 0.5 * c * rn * uvScale, 0.5 - 0.5 * s * rn * uvScale);
      if (color) col.push(...color(rn, a, j));
    }
  }
  const idx = [], at = (i, j) => 1 + (i - 1) * (segs + 1) + j;
  for (let j = 0; j < segs; j++) idx.push(0, at(1, j + 1), at(1, j));
  for (let i = 2; i <= rings; i++) for (let j = 0; j < segs; j++) {
    const a = at(i - 1, j), b = at(i, j), c = at(i, j + 1), d = at(i - 1, j + 1);
    idx.push(a, c, b, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
/** Bake a placement (x, y, z, ry, scale) into a copy of `geo`. */
export function bakeAt(geo, { x = 0, y = 0, z = 0, ry = 0, scale = 1 } = {}) {
  const g = geo.clone();
  g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.setScalar(scale)));
  return g;
}

/** A thin straight cylinder from a to b ([x, y, z]); `radial` sides, no caps. */
export function strut(a, b, r, radial = 3) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 1e-3;
  const g = new THREE.CylinderGeometry(r, r, len, radial, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

export function tint(geo, hex, shade = 1) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r * shade; a[i * 3 + 1] = c.g * shade; a[i * 3 + 2] = c.b * shade; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

/* ------------------------------------------------------- points and quads --- */

/**
 * Additive glow points with a per-point intensity in the vertex colour, so
 * each mote can fade on its own with one draw. Returns { points, set(i, x, y, z, k) }.
 */
export function glowPoints(km, count, { size, tex, color }) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const c = new THREE.Color(color);
  return {
    points,
    set(i, x, y, z, k) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; },
    done() { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; }
  };
}

/**
 * Billboard quads, one draw for any number of lights (a Points size would be
 * clamped by the GPU close up; a Sprite is a draw each). `centers` are
 * [x, y, z]; intensity per light goes in the colour attribute through set(i, k).
 */
export function billboardSet(tex, centers, { size = 1.9, color = 0xffc070 } = {}) {
  const n = centers.length, pos = new Float32Array(n * 12), corner = new Float32Array(n * 8), inten = new Float32Array(n * 4), uv = new Float32Array(n * 8);
  const idx = [], k = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  centers.forEach((c, i) => {
    for (let v = 0; v < 4; v++) {
      pos.set(c, (i * 4 + v) * 3);
      corner[(i * 4 + v) * 2] = k[v][0]; corner[(i * 4 + v) * 2 + 1] = k[v][1];
      uv[(i * 4 + v) * 2] = (k[v][0] + 1) / 2; uv[(i * 4 + v) * 2 + 1] = (k[v][1] + 1) / 2;
    }
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
  geo.setAttribute('aI', new THREE.BufferAttribute(inten, 1));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uSize: { value: size }, uColor: { value: new THREE.Color(color) } },
    vertexShader: 'attribute vec2 aCorner; attribute float aI; varying vec2 vUv; varying float vI; uniform float uSize;\nvoid main(){ vUv = uv; vI = aI; vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xy += aCorner * uSize * 0.5; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; uniform vec3 uColor; varying vec2 vUv; varying float vI;\nvoid main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(uColor * t.rgb, t.a * vI); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.userData.noShadow = true;
  return { mesh, set(i, v) { for (let c = 0; c < 4; c++) inten[i * 4 + c] = v; }, done() { geo.attributes.aI.needsUpdate = true; mesh.visible = inten.some((x) => x > 0.002); } };
}

/* --------------------------------------------------------------- compose --- */

/**
 * Fuse sub-builders into one instance. `entries`: [key, sub, placement?] where
 * sub = { group, parts, live, update, dispose } and placement { x, y, z, ry, scale }.
 * Part keys become `<key>_<part>`.
 */
export function compose(entries) {
  const group = new THREE.Group(), parts = {}, live = [], updates = [], frees = [];
  for (const [key, sub, at] of entries) {
    if (!sub) continue;
    if (at) {
      sub.group.position.set(at.x || 0, at.y || 0, at.z || 0);
      if (at.ry) sub.group.rotation.y = at.ry;
      if (at.scale) sub.group.scale.setScalar(at.scale);
    }
    group.add(sub.group);
    for (const [k, o] of Object.entries(sub.parts)) { o.name = ''; parts[`${key}_${k}`] = o; }
    live.push(...(sub.live || []));
    if (sub.update) updates.push(sub.update);
    if (sub.dispose) frees.push(sub.dispose);
  }
  return {
    group, parts, live,
    update(dt, t, env) { for (const u of updates) u(dt, t, env); },
    dispose() { for (const f of frees) f(); }
  };
}

/** A sub-builder result from one mesh. */
export function single(key, mesh, extra = {}) {
  const group = new THREE.Group();
  group.add(mesh);
  return { group, parts: { [key]: mesh }, live: [], ...extra };
}

export { indexed };
