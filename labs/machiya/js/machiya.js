// Machiya workshop · original code for Three.js r160. See research.md for
// architectural references and the official Three.js APIs behind each recipe.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { plasterTextures, woodTextures, kawaraTextures, shojiTextures, namakoTextures,
  texturedMaterial, worldScaleBoxUVs } from '../../shared/game.js';
import { originalKit } from './original.js';

const TEX = {
  plaster: plasterTextures(0xeee5d0, 1), warm: plasterTextures(0xe2c9a3, 2),
  dark: woodTextures(0x604332, 0x35251f, 2), light: woodTextures(0xac8861, 0x705139, 4),
  deck: woodTextures(0x98704f, 0x58402e, 5), roof: kawaraTextures(0x788487, 3),
  shoji: shojiTextures(4, 6), namako: namakoTextures()
};
const clamp = THREE.MathUtils.clamp;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const KOUSHI = {
  itoya: { slat: .026, gap: .065 }, komeya: { slat: .052, gap: .054 },
  sakaya: { slat: .046, gap: .056 }, fuya: { slat: .024, gap: .075 },
  sumiya: { slat: .034, gap: .062 }, shimotaya: { slat: .021, gap: .072 }
};

export function createMaterialSet(style = 'hybrid') {
  let ramp;
  if (style === 'toon') {
    ramp = new THREE.DataTexture(new Uint8Array([80, 158, 240]), 3, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  }
  const uniforms = { uLabAge: { value: 0 }, uLabWet: { value: 0 } };
  const make = (tex, color = 0xffffff, roughness = .85, options = {}) => {
    const mat = style === 'toon'
      ? new THREE.MeshToonMaterial({ map: tex?.map, color, gradientMap: ramp, ...options })
      : texturedMaterial(tex || {}, { color, roughness, normalScale: .45, ...options });
    // Object-space brush modulation is intentionally subtle. Age is an art
    // grade, not simulated splash staining or a claim about a studio shader.
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 vLabPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLabPosition = position;');
      shader.fragmentShader = 'varying vec3 vLabPosition;\nuniform float uLabAge;\nuniform float uLabWet;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float brush = sin(vLabPosition.x*9. + sin(vLabPosition.y*13.))*sin(vLabPosition.z*11. + vLabPosition.y*3.);
        diffuseColor.rgb *= 1. + brush * ${style === 'hybrid' ? '.035' : '.008'};
        diffuseColor.rgb *= 1. - uLabWet * .16;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.78,.81,.68), uLabAge*.24);
      `);
    };
    mat.customProgramCacheKey = () => 'machiya-brush-v2-' + style;
    return mat;
  };
  const M = {
    timberDark: make(TEX.dark), timberLight: make(TEX.light), timberEngawa: make(TEX.deck, 0xffffff, .68),
    plaster: make(TEX.plaster, 0xffffff, .97), plasterWarm: make(TEX.warm, 0xffffff, .97),
    kawara: make(TEX.roof, 0xd2d8d8, .65), roofRidge: make(null, 0x43515a, .65),
    shoji: make(TEX.shoji, 0xfff4d6, .9, { emissive: 0xffb15f, emissiveIntensity: .1 }),
    namako: make(TEX.namako), norenIndigo: make(null, 0x354d70, .95, { side: THREE.DoubleSide }),
    norenCrimson: make(null, 0x9c4535, .95, { side: THREE.DoubleSide }),
    bengara: make(TEX.light, 0xa75b46), stone: make(null, 0x99978a),
    dark: make(null, 0x27292a), clay: make(null, 0x9a7154), bamboo: make(TEX.light, 0xc3b780),
    lantern: make(null, 0xffebc9, .9, { emissive: 0xffae4f, emissiveIntensity: .2 }),
    cushionRed: make(null, 0xb74738)
  };
  for (const m of Object.values(M)) m.userData.baseColor = m.color.clone();
  M.uniforms = uniforms; M.ramp = ramp;
  return M;
}

function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, bevel = false) {
  const geo = bevel ? new RoundedBoxGeometry(w, h, d, 1, Math.min(.025, w / 6, h / 6, d / 6)) : new THREE.BoxGeometry(w, h, d);
  worldScaleBoxUVs(geo, 1); return mesh(parent, geo, mat, x, y, z);
}
function instances(parent, geo, mat, transforms, name) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length), dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.set(...(t.p || [0, 0, 0])); dummy.rotation.set(...(t.r || [0, 0, 0])); dummy.scale.set(...(t.s || [1, 1, 1]));
    dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    if (t.color) im.setColorAt(i, new THREE.Color(t.color));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere(); im.name = name; im.castShadow = im.receiveShadow = true; parent.add(im); return im;
}

/** One height function for the watertight deck, tile placement and cat support.
 * lift=0 is straight; lift>0 gives a restrained eave lift, not a temple roof. */
export function roofHeight(z, halfD, eaveY, ridgeH, lift = .075) {
  const t = clamp(Math.abs(z) / halfD, 0, 1);
  return eaveY + ridgeH * (1 - t) + lift * t ** 6;
}
function roofDeck(w, halfD, eaveY, ridgeH, lift, thickness = .12) {
  const geo = new THREE.BoxGeometry(w, thickness, halfD * 2, 1, 1, 48);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, roofHeight(p.getZ(i), halfD, eaveY, ridgeH, lift) + p.getY(i) - thickness / 2);
  worldScaleBoxUVs(geo, 1); geo.computeVertexNormals(); return geo;
}
// Closed overlapping pan-and-roll tile: local Z follows the fall line. A
// sinusoidal section suggests sangawara; it is a game mesh, not a JIS model.
export function tileGeometry(width, length, profile = 'wave') {
  const g = new THREE.BoxGeometry(width, .022, length, 10, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) / width + .5);
    const wave = profile === 'wave' ? .036 * Math.cos(u * Math.PI * 2) : .012 * Math.cos(u * Math.PI);
    const lip = p.getZ(i) > 0 ? .012 : 0;
    p.setY(i, p.getY(i) + wave + lip);
  }
  g.computeVertexNormals(); return g;
}
export function kawaraRoof(parent, w, d, ridgeH, overhang, eaveY, M, recipe = 'wave') {
  const g = new THREE.Group(); g.name = 'Kawara roof';
  const halfD = d / 2 + overhang, fullW = w + overhang * 2, lift = recipe === 'mukuri' ? .14 : .075;
  // A complete closed shell is always present, including below instanced tiles.
  mesh(g, roofDeck(fullW, halfD, eaveY, ridgeH, lift), M.kawara);
  const cols = Math.ceil(fullW / .265), rows = Math.ceil(Math.hypot(halfD, ridgeH) / .235);
  if (recipe !== 'slab') {
    const pitchX = fullW / cols, pitchZ = halfD / rows;
    const tileLen = Math.hypot(pitchZ, ridgeH / rows) * 1.18;
    const transforms = [];
    for (const sign of [-1, 1]) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const z = sign * (r + .5) * pitchZ;
      const t = Math.abs(z) / halfD;
      const derivative = sign * (-ridgeH + 6 * lift * t ** 5) / halfD;
      const lightness = .78 + hash(c * 73 + r * 19 + sign * 41) * .27;
      transforms.push({ p: [-fullW / 2 + (c + .5) * pitchX, roofHeight(z, halfD, eaveY, ridgeH, lift) + .055, z],
        r: [-Math.atan(derivative), 0, 0], color: new THREE.Color().setRGB(lightness, lightness, lightness * 1.015) });
    }
    instances(g, tileGeometry(pitchX * 1.015, tileLen, recipe === 'courses' ? 'pan' : 'wave'), M.kawara, transforms, 'Overlapping tile courses');
  }
  // Rafter tails run down the slope, exposed below the fascia.
  const tails = [], ends = [], count = Math.ceil(fullW / .42);
  for (const sign of [-1, 1]) {
    const y = roofHeight(sign * halfD, halfD, eaveY, ridgeH, lift);
    box(g, fullW, .12, .1, M.timberDark, 0, y - .12, sign * halfD);
    for (let i = 0; i < count; i++) tails.push({ p: [-fullW / 2 + (i + .5) * fullW / count, y - .18, sign * (halfD - .24)], r: [sign * Math.atan2(ridgeH, halfD), 0, 0] });
    for (let i = 0; i < cols; i++) ends.push({ p: [-fullW / 2 + (i + .5) * fullW / cols, y + .045, sign * (halfD + .005)], r: [Math.PI / 2, 0, 0] });
  }
  instances(g, new THREE.BoxGeometry(.065, .085, .6), M.timberLight, tails, 'Rafter tails');
  instances(g, new THREE.CylinderGeometry(.053, .053, .09, 8), M.roofRidge, ends, 'Nokigawara end faces');
  // Bargeboards follow the same section. Solid wall triangles stop at the
  // wall plane, not at the far eave, so the overhang stays visibly thin.
  for (const sign of [-1, 1]) {
    const shape = new THREE.Shape(); shape.moveTo(-d / 2, eaveY - .12);
    for (let i = 0; i <= 24; i++) { const z = -d / 2 + d * i / 24; shape.lineTo(z, roofHeight(z, halfD, eaveY, ridgeH, lift) - .1); }
    shape.lineTo(d / 2, eaveY - .12); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: false });
    const end = mesh(g, geo, M.plasterWarm, sign * w / 2, 0, 0); end.rotation.y = Math.PI / 2;
    const points = Array.from({ length: 33 }, (_, i) => { const z = -halfD + halfD * 2 * i / 32; return new THREE.Vector3(sign * (fullW / 2 - .025), roofHeight(z, halfD, eaveY, ridgeH, lift) - .04, z); });
    mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .045, 4, false), M.roofRidge);
    box(g, .12, .3, .32, M.roofRidge, sign * fullW / 2, eaveY + ridgeH + .12, 0, true);
  }
  for (let i = 0; i < 3; i++) box(g, fullW, .065, .34 - i * .055, M.roofRidge, 0, eaveY + ridgeH + i * .065, 0);
  const ridge = mesh(g, new THREE.CylinderGeometry(.11, .11, fullW + .14, 12), M.roofRidge, 0, eaveY + ridgeH + .24, 0); ridge.rotation.z = Math.PI / 2;
  g.userData.profile = { halfD, eaveY, ridgeH, lift, fullW }; parent.add(g); return g;
}

// A true single-slope hisashi, fitted between the upper wall and outer eave.
function pentRoof(parent, width, innerZ, outerZ, innerY, outerY, M, recipe) {
  const group = new THREE.Group(); group.name = 'Hisashi lean-to';
  const span = outerZ - innerZ, midZ = (innerZ + outerZ) / 2;
  const deck = new THREE.BoxGeometry(width, .10, Math.abs(span), 1, 1, 8), p = deck.attributes.position;
  const height = z => THREE.MathUtils.lerp(innerY, outerY, (z - innerZ) / span);
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - .05 + height(p.getZ(i) + midZ));
  worldScaleBoxUVs(deck, 1); deck.computeVertexNormals(); mesh(group, deck, M.kawara, 0, 0, midZ);
  const cols = Math.ceil(width / .265), rows = Math.ceil(Math.hypot(span, innerY - outerY) / .235);
  const pitch = width / cols, len = Math.hypot(span / rows, (innerY - outerY) / rows), transforms = [];
  if (recipe !== 'slab') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const z = innerZ + (r + .5) / rows * span;
      transforms.push({ p: [-width / 2 + (c + .5) * pitch, height(z) + .055, z], r: [-Math.atan((outerY - innerY) / span), 0, 0], color:new THREE.Color().setScalar(.85+hash(r*29+c)*.18) });
    }
    instances(group, tileGeometry(pitch * 1.015, len * 1.18, recipe === 'courses' ? 'pan' : 'wave'), M.kawara, transforms, 'Hisashi tile courses');
  }
  box(group, width, .12, .09, M.timberDark, 0, outerY - .12, outerZ);
  const tails = Array.from({length:Math.ceil(width/.42)}, (_,i) => ({p:[-width/2+(i+.5)*width/Math.ceil(width/.42),outerY-.14,outerZ-Math.sign(span)*.2],r:[-Math.atan((outerY-innerY)/span),0,0]}));
  instances(group, new THREE.BoxGeometry(.055,.075,.46), M.timberLight, tails, 'Hisashi rafter tails');
  parent.add(group); return group;
}

export function koushi(parent, w, h, M, pattern = 'itoya', recipe = 'instance') {
  const g = new THREE.Group(); g.name = 'Kōshi lattice';
  if (recipe === 'original') { const original = originalKit().createKoushi(w, h, 11); original.traverse(o => { if (o.material) o.material = o.material.clone(); }); g.add(original); parent.add(g); return g; }
  const mat = recipe === 'bengara' ? M.bengara : M.timberDark;
  const k = KOUSHI[pattern] || KOUSHI.itoya, count = Math.floor((w - .12) / (k.slat + k.gap));
  for (const sign of [-1, 1]) {
    box(g, w, .065, .12, mat, 0, sign * h / 2, .03, true);
    box(g, .065, h, .12, mat, sign * w / 2, 0, .03, true);
  }
  const transforms = [];
  for (let i = 0; i < count; i++) {
    // The thread-shop pattern cuts back two short slats between tall ones.
    const short = pattern === 'itoya' && i % 3 !== 0;
    transforms.push({ p: [-w / 2 + .08 + (i + .5) * (w - .16) / count, short ? -.15 : 0, .08], s: [1, short ? .78 : 1, 1] });
  }
  instances(g, new THREE.BoxGeometry(k.slat, h - .1, .075), mat, transforms, 'Trade-pattern slats');
  for (const y of [-h * .27, h * .27]) box(g, w, .038, .055, mat, 0, y, .01);
  parent.add(g); return g;
}
export function engawa(parent, w, depth, h, M, recipe = 'planks') {
  const g = new THREE.Group(); g.name = 'Engawa';
  if (recipe === 'original') g.add(originalKit().createEngawa(w, depth, h));
  else {
    const count = Math.ceil(w / .19), pitch = w / count;
    instances(g, new THREE.BoxGeometry(pitch - .009, .085, depth), M.timberEngawa,
      Array.from({ length: count }, (_, i) => ({ p: [-w / 2 + (i + .5) * pitch, h - .0425, 0], color: new THREE.Color().setScalar(.82 + hash(i) * .22) })), 'Individual deck boards');
    for (const sign of [-1, 1]) {
      box(g, w, .13, .11, M.timberDark, 0, h - .15, sign * (depth / 2 - .13));
      for (let x = -w / 2 + .25; x < w / 2; x += 1.2) {
        box(g, .28, .12, .32, M.stone, x, .06, sign * (depth / 2 - .18), true);
        box(g, .11, h - .12, .11, M.timberLight, x, h / 2, sign * (depth / 2 - .18), true);
      }
    }
    box(g, .85, .17, .48, M.stone, 0, .085, depth / 2 + .2, true);
  }
  parent.add(g); return g;
}
export function inuyarai(parent, w, h, M, recipe = 'curved') {
  const g = new THREE.Group(); g.name = 'Inuyarai';
  const curved = recipe === 'curved';
  const foot = new THREE.Vector3(0, 0, .65), top = new THREE.Vector3(0, h, 0);
  // Both recipes lean from the same street-side foot to the wall-side top.
  // A straight cylinder spans that whole diagonal, not just the wall height.
  const path = curved
    ? new THREE.QuadraticBezierCurve3(foot, new THREE.Vector3(0, h * .4, .5), top)
    : new THREE.LineCurve3(foot, top);
  const radius = curved ? .023 : .024;
  const geo = curved ? new THREE.TubeGeometry(path, 14, radius, 5, false)
    : new THREE.CylinderGeometry(radius, radius, foot.distanceTo(top), 5);
  const count = Math.max(2, Math.ceil(w / .11));
  instances(g, geo, M.bamboo, Array.from({ length: count }, (_, i) => ({
    p: [-w / 2 + i * w / (count - 1), curved ? 0 : h / 2, curved ? 0 : .325],
    r: [curved ? 0 : -Math.atan2(.65, h), 0, 0]
  })), curved ? 'Bowed bamboo staves' : 'Leaning straight bamboo staves');
  for (const t of [.18, .6, .88]) {
    const p = path.getPoint(t), tangent = path.getTangent(t).normalize();
    const normal = new THREE.Vector3(0, -tangent.z, tangent.y);
    // Seat the rail's lower face on the outward face of the staves. A tiny
    // overlap accounts for their low-poly cross-section, preventing daylight.
    p.addScaledVector(normal, radius + .033 / 2 - .005);
    const rail = box(g, w + .1, .033, .035, M.timberDark, 0, p.y, p.z);
    rail.rotation.x = Math.atan2(normal.z, normal.y);
  }
  parent.add(g); return g;
}
export function mushiko(parent, w, h, M, recipe = 'plaster') {
  const g = new THREE.Group(); g.name = 'Mushiko-mado';
  box(g, w + .18, h + .15, .06, M.dark, 0, 0, -.04);
  if (recipe === 'original') g.add(originalKit().createKoushi(w, h, 14));
  else {
    // A genuine opening in the extruded plaster surround.
    const shape = new THREE.Shape(); shape.moveTo(-w / 2 - .1, -h / 2 - .1); shape.lineTo(w / 2 + .1, -h / 2 - .1);
    shape.lineTo(w / 2 + .1, h / 2 + .1); shape.lineTo(-w / 2 - .1, h / 2 + .1); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(-w / 2, -h / 2); hole.lineTo(-w / 2, h * .2);
    hole.quadraticCurveTo(-w / 2, h / 2, -w * .3, h / 2); hole.lineTo(w * .3, h / 2);
    hole.quadraticCurveTo(w / 2, h / 2, w / 2, h * .2); hole.lineTo(w / 2, -h / 2); hole.closePath(); shape.holes.push(hole);
    mesh(g, new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: true, bevelSize: .018, bevelThickness: .018, bevelSegments: 1, steps: 1 }), M.plaster);
    const count = Math.ceil(w / .13);
    instances(g, new RoundedBoxGeometry(.047, h * .92, .13, 1, .018), M.plaster,
      Array.from({ length: count }, (_, i) => ({ p: [-w / 2 + (i + .5) * w / count, -.01, .055] })), 'Plaster-coated window bars');
  }
  parent.add(g); return g;
}
export function noren(parent, w, h, M, recipe = 'cloth', red = false) {
  const g = new THREE.Group(); g.name = 'Noren';
  const mat = red ? M.norenCrimson : M.norenIndigo;
  if (recipe === 'original') box(g, w, h, .04, mat);
  else {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const geo = new THREE.PlaneGeometry(w / n - .018, h, 6, 9), p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const v = (h / 2 - p.getY(k)) / h; p.setZ(k, Math.sin(p.getX(k) * 24) * .016 * v); }
      geo.computeVertexNormals();
      const panel = mesh(g, geo, mat, -w / 2 + (i + .5) * w / n, -h / 2, .02);
      panel.userData.cloth = { rest: new Float32Array(p.array), height: h, phase: i * .85 };
      // An undyed circle crest, deliberately simple and legible from cat height.
      mesh(panel, new THREE.RingGeometry(.064, .078, 20), M.plaster, 0, .035, .032);
    }
    box(g, w + .15, .035, .035, M.timberLight, 0, .03, 0);
  }
  parent.add(g); return g;
}
export function chochin(parent, M, recipe = 'ribbed') {
  const g = new THREE.Group(); g.name = 'Chōchin';
  if (recipe === 'original') originalKit().createChochinLantern(0, 0, 0, g);
  else {
    const profile = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24, radius = .08 + .12 * Math.sin(Math.PI * t) ** .55 + .005 * Math.cos(t * Math.PI * 24);
      return new THREE.Vector2(radius, -.55 * t);
    });
    mesh(g, new THREE.LatheGeometry(profile, 16), M.lantern);
    for (let i = 1; i < 12; i++) {
      const t = i / 12, r = .08 + .12 * Math.sin(Math.PI * t) ** .55;
      const rib = mesh(g, new THREE.TorusGeometry(r, .004, 4, 16), M.timberLight, 0, -.55 * t, 0); rib.rotation.x = Math.PI / 2;
    }
    for (const y of [0, -.55]) mesh(g, new THREE.CylinderGeometry(.09, .09, .035, 12), M.timberDark, 0, y, 0);
    box(g, .012, .24, .012, M.timberDark, 0, .12, 0);
  }
  parent.add(g); return g;
}

export class Collider {
  constructor() { this.walkers = []; this.walls = []; this.climbs = []; }
  flat(x0, x1, z0, z1, y) { this.walkers.push({ kind: 'flat', x0, x1, z0, z1, y }); return this; }
  slope(x0, x1, z0, z1, y0, y1) {
    if (z1 < z0) [z0, z1, y0, y1] = [z1, z0, y1, y0];
    this.walkers.push({ kind: 'slope', x0, x1, z0, z1, y0, y1 }); return this;
  }
  roof(x0, x1, z0, z1, eaveY, ridgeH, lift = .075) { this.walkers.push({ kind: 'roof', x0, x1, z0, z1, eaveY, ridgeH, lift }); return this; }
  wall(x0, x1, z0, z1, y0, y1) { this.walls.push({ x0, x1, z0, z1, y0, y1 }); return this; }
  climb(x0, x1, z0, z1, y0, y1, exitY, exitX, exitZ) { this.climbs.push({ x0, x1, z0, z1, y0, y1, exitY, exitX, exitZ }); return this; }
  top(w, x, z) {
    if (w.kind === 'flat') return w.y;
    if (w.kind === 'roof') return roofHeight(z - (w.z0 + w.z1) / 2, (w.z1 - w.z0) / 2, w.eaveY, w.ridgeH, w.lift) + .09;
    return THREE.MathUtils.lerp(w.y0, w.y1, clamp((z - w.z0) / (w.z1 - w.z0), 0, 1));
  }
  ceiling(x, z, feet, step) {
    let best = -1e9;
    for (const w of this.walkers) if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) { const y = this.top(w, x, z); if (y <= feet + step && y > best) best = y; }
    return best;
  }
  blocked(x, z, y) { return this.walls.some(w => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && y >= w.y0 && y < w.y1); }
  climbAt(x, z, y) { return this.climbs.find(w => x > w.x0 - .12 && x < w.x1 + .12 && z > w.z0 - .32 && z < w.z1 + .55 && y >= w.y0 - .05 && y < w.y1 - .015); }
}

// Preserve instanced batches and dynamic cloth, but collapse static joinery
// within each assembly part by material. Keeping the part boundary lets the
// stepper and exploded view remain useful without hundreds of box draws.
function mergeStaticPart(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), groups = new Map(), originals = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(geo); originals.push(o);
  });
  for (const o of originals) { o.removeFromParent(); o.geometry.dispose(); }
  for (const [material, geometries] of groups) {
    const combined = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (combined) mesh(root, combined, material);
  }
}

export const DEFAULTS = {
  w: 7.6, d: 5.4, gh: 2.4, upper: { w: 6.8, d: 4.6, h: 1.9 },
  roof: { eaveY: 4.3, ridgeH: 1.5, overhang: .65 },
  engawaOpts: { front: true, back: true, h: .42, depth: 1.2 }
};
export function buildMachiya(options = {}) {
  const o = { ...DEFAULTS, style: 'hybrid', ...options };
  const { w, d, gh, upper, roof, engawaOpts, x = 0, z = 0 } = o;
  const M = createMaterialSet(o.style), group = new THREE.Group(), col = new Collider(), parts = {};
  const hw = w / 2, hd = d / 2;
  if (o.frameRecipe === 'bengara') M.timberDark.color.copy(M.bengara.color);
  const part = (key, phase) => { const g = new THREE.Group(); g.name = key; g.userData.phase = phase; g.userData.part = key; parts[key] = g; group.add(g); return g; };
  const base = part('foundation', 0), frame = part('frame', 1), walls = part('wall', 3);
  const lattice = part('lattice', 4), windows = part('window', 5), deck = part('deck', 2);
  const eaves = part('eaves', 6), top = part('roof', 7), cloth = part('cloth', 9), lantern = part('lantern', 9), bamboo = part('bamboo', 4);
  // Open frame with shallow infill panels. The wall front is behind the lattice,
  // allowing the joinery to cast readable contact shadows instead of z-fighting.
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
    box(base, .42, .2, .45, M.stone, sx * (hw - .12), .1, sz * (hd - .12), true);
    box(frame, .16, gh - .18, .16, M.timberDark, sx * (hw - .1), (gh + .18) / 2, sz * (hd - .1), o.frameRecipe !== 'square');
  }
  for (const sy of [.33, gh - .05]) for (const sz of [-1, 1]) box(frame, w, .16, .18, M.timberDark, 0, sy, sz * (hd - .09), true);
  for (const sx of [-1, 1]) box(frame, .18, .16, d, M.timberDark, sx * (hw - .09), gh - .05, 0, true);
  const wallMat = o.wallRecipe === 'clay' ? M.clay : M.plasterWarm;
  box(walls, w - .2, gh - .4, .13, wallMat, 0, gh / 2 + .1, -hd + .12);
  for (const sx of [-1, 1]) box(walls, .13, gh - .4, d - .22, wallMat, sx * (hw - .12), gh / 2 + .1, 0);
  box(walls, w - .2, .35, .13, wallMat, 0, .4, hd - .12);
  box(walls, w - .2, .28, .13, wallMat, 0, gh - .18, hd - .12);
  if (o.wallRecipe === 'namako') for (const sx of [-1, 1]) box(walls, .04, .86, d - .3, M.namako, sx * (hw + .01), .7, 0);
  const doorW = w * .23, lw = (w - doorW - .65) / 2;
  for (const sx of [-1, 1]) {
    const kx = sx * (doorW / 2 + .16 + lw / 2);
    box(walls, lw, 1.55, .07, M.shoji, kx, 1.34, hd - .08);
    const g = koushi(lattice, lw, 1.65, M, o.koushiPattern || 'itoya', o.latticeRecipe || 'instance'); g.position.set(kx, 1.34, hd + .03);
  }
  box(walls, doorW, 1.9, .07, M.shoji, 0, 1.3, hd - .08);
  for (const sx of [-1, 1]) box(frame, .12, gh - .3, .18, M.timberDark, sx * (doorW / 2 + .07), gh / 2 + .15, hd, true);
  if (upper) {
    const uy = gh + upper.h / 2;
    box(walls, upper.w, upper.h, upper.d, M.plaster, 0, uy, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(frame, .16, upper.h, .16, M.timberDark, sx * (upper.w / 2 - .04), uy, sz * (upper.d / 2 - .04), true);
    const win = mushiko(windows, upper.w * .46, upper.h * .44, M, o.windowRecipe || 'plaster'); win.position.set(0, uy, upper.d / 2 + .03);
    const frontZ = hd + .65, innerZ = upper.d / 2 - .07;
    for (const sign of [-1, 1]) pentRoof(eaves, w + .8, sign * innerZ, sign * frontZ, gh + .3, gh + .02, M, o.roofRecipe || 'wave');
    for (const sx of [-1, 1]) box(eaves, .8, .14, d + .5, M.kawara, sx * (hw + .18), gh + .08, 0);
  }
  kawaraRoof(top, upper ? upper.w : w, upper ? upper.d : d, roof.ridgeH, roof.overhang, roof.eaveY, M, o.roofRecipe || 'wave');
  for (const sign of [-1, 1]) if (sign > 0 ? engawaOpts.front : engawaOpts.back) {
    const g = engawa(deck, w + .35, engawaOpts.depth, engawaOpts.h, M, o.deckRecipe || 'planks'); g.position.z = sign * (hd + engawaOpts.depth / 2); if (sign < 0) g.rotation.y = Math.PI;
  }
  const n = noren(cloth, doorW + .1, .7, M, o.clothRecipe || 'cloth', o.red); n.position.set(0, gh - .21, hd + .22);
  const l = chochin(lantern, M, o.lanternRecipe || 'ribbed'); l.position.set(w * .31, gh - .13, hd + .52);
  const lamp = new THREE.PointLight(0xffb96e, 0, 4, 2); lamp.position.copy(l.position).add(new THREE.Vector3(0, -.25, .12)); lantern.add(lamp);
  if (o.bambooRecipe !== 'none') { const b = inuyarai(bamboo, w * .22, .85, M, o.bambooRecipe || 'curved'); b.position.set(-w * .33, engawaOpts.h, hd + .15); }
  // Broad physical stairs at the side are a friendly route: each .58 m rise is
  // below the game's 1.296 m jump apex. Their colliders come from these boxes.
  const steps = part('route', 2);
  for (let i = 0; i < 4; i++) {
    const y = .58 * (i + 1), sx = hw + .8, sz = hd + 1.55 - i * .72;
    box(steps, .85, y, .8, M.timberLight, sx, y / 2, sz, true);
    for (const dz of [-.27, .27]) box(steps, .88, .07, .07, M.timberDark, sx, y - .13, sz + dz);
    col.flat(sx - .425, sx + .425, sz - .4, sz + .4, y);
    col.wall(sx - .425, sx + .425, sz - .4, sz + .4, 0, y - .1);
  }
  col.wall(-hw, hw, -hd, hd, .2, gh);
  if (upper) col.wall(-upper.w / 2, upper.w / 2, -upper.d / 2, upper.d / 2, gh, gh + upper.h);
  if (engawaOpts.front) { col.flat(-hw - .175, hw + .175, hd, hd + engawaOpts.depth, engawaOpts.h); col.flat(-.425, .425, hd + engawaOpts.depth - .04, hd + engawaOpts.depth + .44, .17); }
  if (engawaOpts.back) { col.flat(-hw - .175, hw + .175, -hd - engawaOpts.depth, -hd, engawaOpts.h); col.flat(-.425, .425, -hd - engawaOpts.depth - .44, -hd - engawaOpts.depth + .04, .17); }
  const ledgeY = gh + .2;
  if (upper) {
    col.slope(-hw - .4, hw + .4, upper.d / 2 - .07, hd + .65, gh + .39, gh + .11);
    col.slope(-hw - .4, hw + .4, -hd - .65, -upper.d / 2 + .07, gh + .11, gh + .39);
    for (const sx of [-1, 1]) col.flat(sx < 0 ? -hw - .58 : hw - .22, sx < 0 ? -hw + .22 : hw + .58, -hd, hd, gh + .15);
    col.climb(-hw + .4, -doorW / 2 - .1, hd, hd + .08, .38, ledgeY, ledgeY, -w * .25, hd + .35);
    const exitZ = upper.d / 2 + .2;
    const exitY = roofHeight(exitZ, upper.d / 2 + roof.overhang, roof.eaveY, roof.ridgeH) + .09;
    col.climb(-upper.w * .28, upper.w * .28, upper.d / 2, hd + .4, ledgeY - .1, roof.eaveY, exitY, 0, exitZ);
  }
  col.roof(-(upper ? upper.w : w) / 2 - roof.overhang, (upper ? upper.w : w) / 2 + roof.overhang, -(upper ? upper.d : d) / 2 - roof.overhang, (upper ? upper.d : d) / 2 + roof.overhang, roof.eaveY, roof.ridgeH, o.roofRecipe === 'mukuri' ? .14 : .075);
  for (const s of [...col.walkers, ...col.walls, ...col.climbs]) { s.x0 += x; s.x1 += x; s.z0 += z; s.z1 += z; if ('exitX' in s) { s.exitX += x; s.exitZ += z; } }
  for (const [key, value] of Object.entries(parts)) if (key !== 'cloth') mergeStaticPart(value);
  group.position.set(x, 0, z);
  let age = 0, wet = 0, phase = 10, explode = 0;
  const build = {
    group, collider: col, mats: M, parts, params: o,
    setWeather(a, rain = wet) { age = a; wet = rain; M.uniforms.uLabAge.value = a; M.uniforms.uLabWet.value = rain;
      if (M.kawara.isMeshStandardMaterial) M.kawara.roughness = .65 - rain * .38;
    },
    setAssembly(p = 10, e = 0) { phase = p; explode = e;
      for (const g of Object.values(parts)) { g.visible = g.userData.phase <= p; g.position.y = g.userData.phase * e * .18; }
    },
    update(t, hour = 10.5, wind = .5) {
      const night = clamp((Math.abs(hour - 12) - 5) / 3, 0, 1);
      M.lantern.emissiveIntensity = .12 + night * 1.7; M.shoji.emissiveIntensity = .06 + night * .42; lamp.intensity = night * 9;
      if (wind) cloth.traverse(o => { const c = o.userData.cloth; if (!c) return; const p = o.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { const y = c.rest[i * 3 + 1], f = (.35 - y) / c.height; p.setZ(i, c.rest[i * 3 + 2] + Math.sin(t * 1.7 + c.phase + p.getX(i) * 3) * .075 * f * f * wind); }
        p.needsUpdate = true; o.geometry.computeVertexNormals();
      });
    },
    dispose() { disposeBuild(group); M.ramp?.dispose(); },
    get inspection() { return phase < 10 || explode > 0; }
  };
  build.setWeather(o.age || 0, o.wet || 0); return build;
}
export function disposeBuild(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of [].concat(o.material || [])) materials.add(m); });
  for (const g of geometries) g.dispose(); for (const m of materials) m.dispose();
  // Shared game texture objects belong to the bridge, not an individual house.
}
export function countScene(root) {
  let tris = 0, meshes = 0;
  root.traverse(o => { if (!o.isMesh) return; meshes++; const n = o.geometry.index?.count || o.geometry.attributes.position.count; tris += n / 3 * (o.isInstancedMesh ? o.count : 1); });
  return { tris: Math.round(tris), meshes };
}
