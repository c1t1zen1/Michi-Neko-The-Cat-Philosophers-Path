// The bay and what stands on it (lane s3-vista): open water with a sun path and
// working boats (summit-bay), the Osaka harbour skyline with its quay cranes and
// the islands (harbour, layout index 0 / 1), the long suspension bridge across
// the bay (bay-bridge) and the harbour's slowly turning Ferris wheel
// (ferris-wheel). Everything sits at 160 to 460 m from the seat.
//
// The summit recolours these by manager field (the classic shapes), carried as
// footprint anchors: bayMat, bayTexture, bayGlints, bayGlintMat, vistaBoats,
// harbourSkyline(+Max), skylineMat, harbourLights(+Mat), vistaIslands,
// islandMat, bridgeMat and ferrisWheelMat. Each asset leaves classic-only
// fields it does not own untouched.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Bag } from '../craft.js?v=20261113a';
import { canvas2d, canvasTexture, rng as seeded } from '../craft.js?v=20261113a';
import { pick, seedOf, glowSprite, lumpGeometry, disposeAll } from './ground.js?v=20261113a';

const fp = (layout, anchors) => ({ colliders: layout.footprint?.colliders || [], platforms: layout.footprint?.platforms || [], exclusions: [], anchors });

/* ------------------------------------------------------------- summit-bay */

function bayTexture(rng, size) {
  const [c, x] = canvas2d(size, size);
  const k = size / 256;
  x.fillStyle = '#4e94b9'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < 420 * k * k; i++) {
    const px = rng() * size, py = rng() * size, len = (3 + rng() * 28) * k;
    x.strokeStyle = rng() < 0.24 ? `rgba(226,245,241,${0.16 + rng() * 0.3})` : `rgba(18,86,132,${0.1 + rng() * 0.22})`;
    x.lineWidth = (0.5 + rng() * 1.3) * k;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + len, py + (rng() - 0.5) * 1.5 * k); x.stroke();
  }
  const tex = canvasTexture(c, { repeat: true });
  tex.repeat.set(22, 10);
  return tex;
}

/** One working boat: a tapered hull with a raised bow, and a lateen sail (a fishing boat) or a deckhouse (a ferry), one mesh. */
function boatGeometry(kind) {
  const bag = new Bag();
  const hull = new THREE.BoxGeometry(1, 1, 1);
  bag.add(hull, { sx: 1.2, sy: 0.14, sz: 0.34, color: 0x263d4a });
  bag.add(hull, { x: 0.52, y: 0.07, sx: 0.2, sy: 0.12, sz: 0.24, color: 0x2f4a59 });   // bow
  bag.add(hull, { x: -0.46, y: 0.08, sx: 0.28, sy: 0.14, sz: 0.3, color: 0x34505d });  // stern deck
  if (kind === 'sail') {
    const sail = new THREE.BufferGeometry();
    sail.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.34, 0.12, 0, 0.42, 0.12, 0, 0.02, 0.98, 0]), 3));
    sail.setIndex([0, 1, 2, 0, 2, 1]);
    sail.computeVertexNormals();
    bag.add(sail, { ry: 0.22, color: 0xf4ecdc });
    bag.add(hull, { y: 0.5, sx: 0.025, sy: 0.9, sz: 0.025, color: 0x4b3a2c });
  } else {
    bag.add(hull, { x: -0.1, y: 0.25, sx: 0.4, sy: 0.3, sz: 0.26, color: 0xf4ecdc });
    bag.add(hull, { x: -0.1, y: 0.42, sx: 0.46, sy: 0.04, sz: 0.3, color: 0xb94b3a });
  }
  const g = bag.geometry();
  hull.dispose();
  return g;
}

export function buildSummitBay(ctx, layout, p) {
  const { tier, rng } = ctx;
  const group = new THREE.Group();
  const tex = bayTexture(seeded(seedOf(rng)), pick(tier, 256, 128, 64));
  const gx = pick(tier, 80, 56, 32), gz = pick(tier, 34, 24, 14);
  const geo = new THREE.PlaneGeometry(720, 320, gx, gz);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) + 300;
    const ripple = (Math.sin(x * 0.075 + z * 0.12) * 0.08 + Math.sin(x * 0.021 - z * 0.083) * 0.11) * p.swell;
    pos.setXYZ(i, x, -12.8 + ripple, z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: tex, bumpMap: tex, bumpScale: 0.085, color: 0x4f9ec7, emissive: 0x113a55, emissiveIntensity: 0.18,
    roughness: 0.32, metalness: 0.08, envMapIntensity: 1.15, fog: false
  });
  const water = new THREE.Mesh(geo, mat);
  water.name = 'water'; water.receiveShadow = water.castShadow = false;
  group.add(water);

  // the sun path: additive glints scattered over the far water
  const nGlint = Math.round(pick(tier, 180, 120, 70) * p.glints);
  const gp = new Float32Array(nGlint * 3);
  for (let i = 0; i < nGlint; i++) {
    const z = 168 + Math.pow(rng(), 0.72) * 250;
    gp[i * 3] = (rng() - 0.5) * (18 + (z - 168) * 0.28); gp[i * 3 + 1] = -12.43 + rng() * 0.12; gp[i * 3 + 2] = z;
  }
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  const glow = glowSprite('255,242,194', 64);
  const glintMat = new THREE.PointsMaterial({ map: glow, color: 0xfff0bd, size: 1.05, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
  const glints = new THREE.Points(glintGeo, glintMat);
  glints.name = 'glints';
  group.add(glints);

  // boats: one mesh each, so the summit can sail them by group (userData.speed / limit)
  const boatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  const kinds = [boatGeometry('sail'), boatGeometry('ferry')];
  const boats = new THREE.Group();
  const vistaBoats = [];
  for (let i = 0; i < p.boats; i++) {
    const boat = new THREE.Group();
    boat.add(new THREE.Mesh(kinds[i < Math.ceil(p.boats * 0.57) ? 0 : 1], boatMat));
    const z = 186 + rng() * 176;
    boat.position.set((rng() - 0.5) * (90 + z * 0.24), -12.25, z);
    boat.scale.setScalar(0.65 + rng() * 0.75);
    boat.rotation.y = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    boat.userData.speed = (0.7 + rng() * 0.9) * (boat.rotation.y > 0 ? 1 : -1);
    boat.userData.limit = 150 + z * 0.42;
    boats.add(boat); vistaBoats.push(boat);
  }
  boats.name = 'boats';
  group.add(boats);
  return {
    group, parts: { water, glints, boats }, sockets: {}, live: [glints],
    footprint: fp(layout, { bayMat: mat, bayTexture: tex, bayGlints: glints, bayGlintMat: glintMat, vistaBoats }),
    dispose() { disposeAll([geo, mat, tex, glintGeo, glintMat, glow, boatMat, ...kinds]); }
  };
}

/* ---------------------------------------------------------------- harbour */

const gl = (hex) => new THREE.Color(hex);
const white = (g) => { const n = g.attributes.position.count, a = new Float32Array(n * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };

/** Quay cranes (a portal frame, a boom and a back-stay) and stacked containers: the harbour's working edge. */
function quayFittings(rng, nCranes, nStacks) {
  const bag = new Bag();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const y0 = -12.45;
  bag.add(box, { x: 0, y: y0 + 0.05, z: 177, sx: 232, sy: 0.4, sz: 9, color: 0x8a9494 });   // the wharf the cranes and stacks stand on
  for (let i = 0; i < nCranes; i++) {
    const x = -105 + (i + 0.5) * (210 / Math.max(1, nCranes)) + (rng() - 0.5) * 8, z = 172 + rng() * 5, s = 0.85 + rng() * 0.4;
    const c = 0xcfd3d0;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) bag.add(box, { x: x + dx * 1.2 * s, y: y0 + 2.1 * s, z: z + dz * 0.9 * s, sx: 0.18 * s, sy: 4.2 * s, sz: 0.18 * s, color: c });
    bag.add(box, { x, y: y0 + 4.25 * s, z, sx: 3 * s, sy: 0.25 * s, sz: 2.2 * s, color: 0xb94b3a });             // portal beam
    bag.add(box, { x, y: y0 + 4.6 * s, z: z + 3.1 * s, sx: 0.22 * s, sy: 0.22 * s, sz: 8.2 * s, color: c });     // boom out over the water
    bag.add(box, { x, y: y0 + 5.3 * s, z: z - 1.6 * s, sx: 0.12 * s, sy: 1.7 * s, sz: 0.12 * s, color: c, rx: 0.5 });
  }
  const palette = [0xb94b3a, 0x2f6f8e, 0xd9a441, 0x4f7a56, 0xe4e0d4, 0x8a4f3a];
  for (let i = 0; i < nStacks; i++) {
    const x = -112 + rng() * 224, z = 176 + rng() * 14, rows = 1 + Math.floor(rng() * 3), cols = 2 + Math.floor(rng() * 3);
    const color = palette[Math.floor(rng() * palette.length)];
    for (let r = 0; r < rows; r++) bag.add(box, { x, y: y0 + 0.2 + r * 0.42, z, sx: cols * 0.78, sy: 0.4, sz: 0.62, color: r % 2 ? palette[(i + r) % palette.length] : color });
  }
  const g = bag.geometry();
  box.dispose();
  return g;
}

function buildSkyline(ctx, layout, p) {
  const { tier, rng } = ctx;
  const towers = layout.towers || [];
  const n = Math.max(1, Math.round(towers.length * pick(tier, 1, 0.8, 0.58)));
  const towerGeo = white(new THREE.BoxGeometry(1, 1, 1));
  const mat = new THREE.MeshStandardMaterial({ color: 0x84949a, roughness: 0.82, metalness: 0.04, fog: false, vertexColors: true });
  const skyline = new THREE.InstancedMesh(towerGeo, mat, n);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const lights = [], crowns = new Bag(), box = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const { x, z, w, d, h, ry, color, lit } = towers[i];
    dummy.position.set(x, -12.45 + h * 0.5, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(w, h, d); dummy.updateMatrix();
    skyline.setMatrixAt(i, dummy.matrix); skyline.setColorAt(i, col.setHex(color));
    if (tier === 'hero' && h > 6.5) {
      // tall blocks step in at the crown, with a roof plant
      crowns.add(box, { x, y: -12.45 + h + 0.25, z, ry, sx: w * 0.7, sy: 0.5, sz: d * 0.7, color: 0x6a7a80 });
      crowns.add(box, { x: x + w * 0.1, y: -12.45 + h + 0.7, z, ry, sx: w * 0.25, sy: 0.4, sz: d * 0.3, color: 0xc9cdc6 });
    }
    if (lit) for (let y = 0.8; y < h - 0.2; y += 1.1) lights.push(x - w * 0.51, -12.45 + y, z);
  }
  skyline.instanceMatrix.needsUpdate = true; skyline.instanceColor.needsUpdate = true;
  skyline.name = 'skyline'; skyline.castShadow = skyline.receiveShadow = false;
  const group = new THREE.Group();
  group.add(skyline);
  const parts = { skyline };
  // quay cranes and containers share the skyline's material, so the summit's palette tints them too
  const fitGeo = tier === 'far' ? null : quayFittings(rng, tier === 'hero' ? p.cranes : Math.min(p.cranes, 3), tier === 'hero' ? 40 : 18);
  const crownGeo = tier === 'hero' ? crowns.geometry() : null;
  const fits = [fitGeo, crownGeo].filter(Boolean);
  let fittings = null, merged = null;
  if (fits.length) {
    merged = mergeGeometries(fits.map((g) => { const c = g.index ? g.toNonIndexed() : g; return c; }));
    for (const g of fits) g.dispose();
    fittings = new THREE.Mesh(merged, mat);
    fittings.name = 'fittings'; fittings.castShadow = fittings.receiveShadow = false;
    group.add(fittings); parts.fittings = fittings;
  }
  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lights), 3));
  const glow = glowSprite('255,190,91', 64);
  const lightMat = new THREE.PointsMaterial({ map: glow, color: 0xffb457, size: 0.42, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true });
  const harbourLights = new THREE.Points(lightGeo, lightMat);
  harbourLights.name = 'lights'; harbourLights.visible = false;
  group.add(harbourLights); parts.lights = harbourLights;
  return {
    group, parts, sockets: {}, live: [],
    footprint: fp(layout, { harbourSkyline: skyline, harbourSkylineMax: n, skylineMat: mat, harbourLights, harbourLightMat: lightMat }),
    dispose() { disposeAll([towerGeo, box, merged, mat, lightGeo, lightMat, glow]); }
  };
}

function buildIslands(ctx, layout) {
  const { tier, rng } = ctx;
  const list = layout.islands || [];
  const mat = new THREE.MeshLambertMaterial({ color: 0x477054, fog: false, vertexColors: true });
  const detail = pick(tier, 3, 2, 1);
  const geos = list.map(({ x, y, z, sx, sy, sz, ry }) => {
    const g = lumpGeometry(detail, seedOf(rng), 0.1);
    // a rocky foot and a forested top: darker at the waterline, brighter up the crown
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const t = Math.min(1, Math.max(0, (p.getY(i) + 0.2) / 1.0));
      const sh = 0.55 + 0.45 * t;
      c[i * 3] = sh * (t < 0.12 ? 1.35 : 1); c[i * 3 + 1] = sh * (t < 0.12 ? 1.2 : 1); c[i * 3 + 2] = sh * (t < 0.12 ? 1.1 : 1);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)));
    return g.index ? g.toNonIndexed() : g;
  });
  const merged = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = 'islands'; mesh.castShadow = mesh.receiveShadow = false;
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group, parts: { islands: mesh }, sockets: {}, live: [],
    footprint: fp(layout, { vistaIslands: [mesh], islandMat: mat }),
    dispose() { disposeAll([merged, mat]); }
  };
}

export function buildHarbour(ctx, layout, p) {
  return layout.index === 1 ? buildIslands(ctx, layout) : buildSkyline(ctx, layout, p);
}

/* ------------------------------------------------------------- bay-bridge */

export function buildBayBridge(ctx, layout, p) {
  const { tier } = ctx;
  const bag = new Bag();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const L = 71;                                          // half span, bearing to bearing
  const deckY = -8.95, towerX = 42, towerH = 11 * p.tower_height;
  bag.add(box, { y: deckY, sx: 142, sy: 0.24, sz: 0.9 });                       // deck
  bag.add(box, { y: deckY - 0.3, sx: 142, sy: 0.3, sz: 0.5 });                  // box girder under it
  for (const s of [-1, 1]) {
    const x = s * towerX;
    // an H-frame tower with a cross beam at the top and one at deck level
    for (const dz of [-0.28, 0.28]) bag.add(box, { x, y: deckY + towerH / 2 - 0.2, z: dz, sx: 0.5, sy: towerH + 0.4, sz: 0.3 });
    bag.add(box, { x, y: deckY + towerH - 0.2, sx: 0.7, sy: 0.32, sz: 0.9 });
    bag.add(box, { x, y: deckY + towerH * 0.55, sx: 0.6, sy: 0.22, sz: 0.9 });
    bag.add(box, { x: s * (L + 1.5), y: deckY - 1.1, sx: 3, sy: 2.2, sz: 1.2 });  // anchorage block
  }
  // main cables: a catenary over each tower, down to the deck at mid span, up to the anchorages
  const top = deckY + towerH - 0.1, mid = deckY + 1.2, sag = p.sag;
  const cableY = (x) => {
    const ax = Math.abs(x);
    if (ax >= towerX) { const u = (ax - towerX) / (L - towerX); return top - u * (top - deckY - 0.4) * (1 - sag * 0.2); }
    const u = ax / towerX; return mid + (top - mid) * Math.pow(u, 2 + (1 - sag) * 1.2) + 0;
  };
  const step = pick(tier, 3, 5, 9), hang = pick(tier, 4.25, 8.5, 17);
  for (const dz of [-0.4, 0.4]) {
    for (let x = -L; x < L; x += step) {
      const x2 = Math.min(L, x + step), y1 = cableY(x), y2 = cableY(x2), len = Math.hypot(x2 - x, y2 - y1);
      bag.add(box, { x: (x + x2) / 2, y: (y1 + y2) / 2, z: dz, sx: len, sy: 0.12, sz: 0.12, rz: Math.atan2(y2 - y1, x2 - x) });
    }
    if (tier !== 'far') for (let x = -L + hang; x < L; x += hang) {
      if (Math.abs(Math.abs(x) - towerX) < 1) continue;
      const y = cableY(x);
      bag.add(box, { x, y: (y + deckY) / 2 + 0.05, z: dz, sx: 0.05, sy: y - deckY, sz: 0.05 });
    }
  }
  // piers under the deck, as classic's row of posts, spaced
  for (let x = -68; x <= 68; x += 8.5) bag.add(box, { x, y: deckY - 3.2, sx: 0.18, sy: 6.4, sz: 0.18 });
  const geo = bag.geometry();
  box.dispose();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb7b9b2, roughness: 0.78, fog: false, vertexColors: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'bridge'; mesh.castShadow = mesh.receiveShadow = false;
  const holder = new THREE.Group();
  holder.add(mesh);
  holder.scale.setScalar(0.82);
  const group = new THREE.Group();
  group.add(holder);
  return {
    group, parts: { bridge: holder }, sockets: {}, live: [],
    footprint: fp(layout, { bridgeMat: mat }),
    dispose() { disposeAll([geo, mat]); }
  };
}

/* ----------------------------------------------------------- ferris-wheel */

export function buildFerrisWheel(ctx, layout, p) {
  const { tier } = ctx;
  const mat = new THREE.MeshStandardMaterial({ color: 0xe3dfd0, emissive: 0x614522, emissiveIntensity: 0.05, roughness: 0.72, fog: false });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const R = 4.8, nSpokes = p.spokes;
  const bag = new Bag();
  const rim = (z, r) => bag.add(new THREE.TorusGeometry(r, 0.1, 6, pick(tier, 48, 36, 24)), { z });
  rim(0.28, R); rim(-0.28, R);
  if (tier !== 'far') rim(0, R * 0.46);
  for (let i = 0; i < nSpokes; i++) bag.add(box, { sx: R * 2 - 0.2, sy: 0.05, sz: 0.05, rz: i * Math.PI / nSpokes });
  bag.add(box, { sx: 0.5, sy: 0.5, sz: 0.7 });                                // hub
  const wheelGeo = bag.geometry();
  const wheel = new THREE.Mesh(wheelGeo, mat);
  wheel.name = 'wheel'; wheel.castShadow = wheel.receiveShadow = false;
  // A-frame legs and the axle: the static frame
  const frame = new Bag();
  for (const dz of [-0.55, 0.55]) {
    for (const s of [-1, 1]) frame.add(box, { x: s * 1.5, y: -4.7, z: dz, sx: 0.2, sy: 9.5, sz: 0.2, rz: -s * 0.17 });
    frame.add(box, { y: -2.2, z: dz, sx: 3, sy: 0.12, sz: 0.12 });
  }
  frame.add(box, { y: -9.3, sx: 5.4, sy: 0.3, sz: 1.5 });
  const frameGeo = frame.geometry();
  const legs = new THREE.Mesh(frameGeo, mat);
  legs.name = 'frame'; legs.castShadow = legs.receiveShadow = false;
  // gondolas hang from the rim: one instanced mesh whose matrices follow the turn
  const nG = p.gondolas;
  const gondGeo = new THREE.BoxGeometry(0.62, 0.5, 0.42);
  const gondolas = new THREE.InstancedMesh(gondGeo, mat, nG);
  gondolas.name = 'gondolas'; gondolas.castShadow = gondolas.receiveShadow = false;
  gondolas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  gondolas.frustumCulled = false;
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.add(wheel, legs, gondolas);
  holder.scale.setScalar(0.82);
  group.add(holder);
  const dummy = new THREE.Object3D();
  let angle = (layout.index || 0) * 0.5;
  const place = () => {
    for (let i = 0; i < nG; i++) {
      const a = angle + (i / nG) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * (R + 0.34), Math.sin(a) * (R + 0.34) - 0.28, 0);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      gondolas.setMatrixAt(i, dummy.matrix);
    }
    gondolas.instanceMatrix.needsUpdate = true;
    wheel.rotation.z = angle;
  };
  place();
  return {
    group, parts: { wheel, frame: legs, gondolas }, sockets: {}, live: [wheel, gondolas],
    footprint: fp(layout, { ferrisWheelMat: mat }),
    update(dt) { angle += dt * 0.035; place(); },
    dispose() { disposeAll([box, wheelGeo, frameGeo, gondGeo, mat]); }
  };
}
