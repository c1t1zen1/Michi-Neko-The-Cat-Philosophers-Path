// The machiya kit: a parameterised Kyoto townhouse built post-by-post, plus a
// small collision model the hero cat can jump and climb around. Materials come
// from the game's own painterly textures, and three "styles" switch the shading
// model so one builder serves the photoreal, cel and painterly variants.
import * as THREE from 'three';
import {
  plasterTextures, woodTextures, kawaraTextures, shojiTextures, namakoTextures,
  texturedMaterial, worldScaleBoxUVs
} from '../../shared/game.js';

const TEX = {
  plaster: plasterTextures(0xf3ebda, 1),
  plasterWarm: plasterTextures(0xe6d7ba, 2),
  woodDark: woodTextures(0x3b2819, 0x1b100a, 2),
  woodLight: woodTextures(0x9a744c, 0x5a3c22, 4),
  woodEngawa: woodTextures(0x7d5736, 0x3f2a18, 5),
  kawara: kawaraTextures(0x6f7a85, 3),
  shoji: shojiTextures(4, 6),
  namako: namakoTextures()
};

/** A 1-D ramp the toon materials sample for their light bands. */
function gradientFor(style) {
  if (style === 'standard') return null;
  // Hybrid keeps more, closer bands so the painted textures read through; toon
  // cuts to three hard bands for the classic cel look.
  const steps = style === 'toon' ? [118, 224] : [72, 128, 176, 214, 246];
  const d = new Uint8Array(steps);
  const t = new THREE.DataTexture(d, steps.length, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Material set for one shading style.
 *  standard = the game's PBR (photoreal background)
 *  toon     = flat colours + a 3-band gradient map (cel)
 *  hybrid   = painterly textures + a soft 5-band gradient map (the Kyoto mix)
 */
export function createMaterialSet(style = 'standard') {
  const grad = gradientFor(style);
  const make = (hex, tex, o = {}) => {
    const col = new THREE.Color(hex);
    if (style === 'standard') {
      return texturedMaterial(tex || {}, { color: col, ...o });
    }
    const p = { color: col, gradientMap: grad };
    if (tex && tex.map) p.map = tex.map;
    if (tex && tex.normalMap) {
      p.normalMap = tex.normalMap;
      p.normalScale = new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1);
    }
    if (o.emissive) { p.emissive = new THREE.Color(o.emissive); p.emissiveIntensity = o.emissiveIntensity ?? 1; }
    if (o.side) p.side = o.side;
    return new THREE.MeshToonMaterial(p);
  };
  return {
    timberDark: make(0x4a3320, TEX.woodDark, { roughness: 0.8, normalScale: 0.8 }),
    timberLight: make(0x8a6a48, TEX.woodLight, { roughness: 0.78, normalScale: 0.8 }),
    timberEngawa: make(0x7d5736, TEX.woodEngawa, { roughness: 0.55, normalScale: 0.6 }),
    plaster: make(0xefe6d2, TEX.plaster, { roughness: 0.96, normalScale: 0.9 }),
    plasterWarm: make(0xe6d7ba, TEX.plasterWarm, { roughness: 0.96, normalScale: 0.9 }),
    kawara: make(0x8a929c, TEX.kawara, { roughness: 0.5, normalScale: 0.5 }),
    kawaraDark: make(0x545d68, TEX.kawara, { roughness: 0.5, normalScale: 0.5 }),
    shoji: make(0xf5ecd8, TEX.shoji, { roughness: 0.85, normalScale: 0.6, emissive: 0xffb264, emissiveIntensity: 0.12 }),
    namako: make(0x33383e, TEX.namako, { roughness: 0.62, normalScale: 1.1 }),
    norenIndigo: make(0x2a3f66, null, { roughness: 0.9, side: THREE.DoubleSide }),
    norenCrimson: make(0x8f2820, null, { roughness: 0.9, side: THREE.DoubleSide }),
    bengara: make(0xb5533a, null, { roughness: 0.85 }),
    roofRidge: make(0x3a4149, null, { roughness: 0.5 }),
    stone: make(0x9a9a92, null, { roughness: 0.9 }),
    cushionRed: make(0xb52b22, null, { roughness: 0.85 }),
    lantern: make(0xffe4bc, null, { roughness: 0.9, emissive: 0x5a2d0c, emissiveIntensity: 0.4 })
  };
}

/** Inverted-hull outline for a mesh (the cel-shading ink line). */
export function addOutline(mesh, thickness = 0.03, color = 0x2a2018) {
  const hull = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  hull.userData.outlineScale = 1 + thickness;
  hull.onBeforeRender = () => {
    const s = hull.userData.outlineScale;
    hull.scale.setScalar(s);
  };
  hull.scale.setScalar(1 + thickness);
  mesh.add(hull);
  return mesh;
}

/* ============================ collision ============================ */

const _in = (w, x, z) => x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1;

export class Collider {
  constructor() { this.walkers = []; this.walls = []; this.climbs = []; }
  flat(x0, x1, z0, z1, y) { this.walkers.push({ kind: 'flat', x0, x1, z0, z1, y }); return this; }
  // Linear slope along Z: y from y0 at z0 to y1 at z1.
  slope(x0, x1, z0, z1, y0, y1) { this.walkers.push({ kind: 'slope', x0, x1, z0, z1, y0, y1 }); return this; }
  // A gable: two slopes meeting at a ridge on z = (z0 + z1) / 2.
  gable(x0, x1, z0, z1, eaveY, ridgeY) {
    const zr = (z0 + z1) / 2;
    this.slope(x0, x1, z0, zr, eaveY, ridgeY);
    this.slope(x0, x1, zr, z1, ridgeY, eaveY);
    return this;
  }
  wall(x0, x1, z0, z1, y0, y1) { this.walls.push({ x0, x1, z0, z1, y0, y1 }); return this; }
  climb(x0, x1, z0, z1, y0, y1, exitY, exitX, exitZ) { this.climbs.push({ x0, x1, z0, z1, y0, y1, exitY, exitX, exitZ }); return this; }

  top(w, x, z) {
    if (w.kind === 'flat') return w.y;
    const t = THREE.MathUtils.clamp((z - w.z0) / (w.z1 - w.z0), 0, 1);
    return w.y0 + (w.y1 - w.y0) * t;
  }

  /** Highest walkable top at (x,z) no more than `maxY` above the feet. */
  ceiling(x, z, feetY, maxY) {
    let best = -1e9;
    for (const w of this.walkers) {
      if (!_in(w, x, z)) continue;
      const y = this.top(w, x, z);
      if (y <= feetY + maxY && y > best) best = y;
    }
    return best;
  }

  blocked(x, z, y) {
    for (const w of this.walls) {
      if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && y >= w.y0 && y < w.y1) return true;
    }
    return false;
  }

  climbAt(x, z, y) {
    for (const c of this.climbs) {
      if (x > c.x0 - 0.7 && x < c.x1 + 0.7 && z > c.z0 - 0.7 && z < c.z1 + 0.7 && y >= c.y0 && y < c.y1 + 0.1) return c;
    }
    return null;
  }
}

/* ============================ builder ============================ */

const boxGeo = (w, h, d, segs = [1, 1, 1]) => new THREE.BoxGeometry(w, h, d, segs[0], segs[1], segs[2]);

function box(parent, w, h, d, mat, x, y, z, panel = false) {
  const g = boxGeo(w, h, d);
  if (!panel) worldScaleBoxUVs(g, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Koushi lattice: the trade pattern chooses slat width, spacing and count. */
const KOUSHI = {
  itoya:    { slat: 0.018, gap: 0.055, note: 'thread — tops cut back to judge colour' },
  komeya:   { slat: 0.034, gap: 0.040, note: 'rice — thick, fixed, cask-proof' },
  sakaya:   { slat: 0.034, gap: 0.042, note: 'sake — thick, fixed' },
  fuya:     { slat: 0.020, gap: 0.060, note: 'wheat gluten' },
  sumiya:   { slat: 0.026, gap: 0.048, note: 'charcoal — airy' },
  shimotaya: { slat: 0.016, gap: 0.062, note: 'residence — thin, fine slats' }
};

function koushi(parent, w, h, mat, pattern = 'itoya', detail = 'boxes') {
  const g = new THREE.Group();
  g.name = 'Koushi ' + pattern;
  const f = 0.05;                       // frame thickness
  const k = KOUSHI[pattern] || KOUSHI.itoya;
  const innerW = w - f * 2, innerH = h - f * 2;
  const count = Math.max(4, Math.round(innerW / (k.slat + k.gap)));
  const spacing = innerW / count;
  // outer frame
  box(g, w, f, f * 1.5, mat, 0, h / 2, 0);
  box(g, w, f, f * 1.5, mat, 0, -h / 2, 0);
  box(g, f, h, f * 1.5, mat, -w / 2, 0, 0);
  box(g, f, h, f * 1.5, mat, w / 2, 0, 0);
  if (detail === 'geometry') {
    // one InstancedMesh of real slats
    const sgeo = boxGeo(k.slat, innerH, k.slat * 1.2);
    worldScaleBoxUVs(sgeo, 1);
    const im = new THREE.InstancedMesh(sgeo, mat, count);
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      d.position.set(-innerW / 2 + spacing * (i + 0.5), 0, 0);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    }
    im.castShadow = true;
    g.add(im);
  } else {
    for (let i = 0; i < count; i++) {
      box(g, k.slat, innerH, k.slat * 1.2, mat, -innerW / 2 + spacing * (i + 0.5), 0, 0);
    }
  }
  parent.add(g);
  return g;
}

/** A curved kawara roof slope with a gentle sori lift toward the eave. */
function curvedSlope(w, thick, len, eaveSign, lift = 0.16) {
  const g = boxGeo(w, thick, len, [1, 1, 10]);
  worldScaleBoxUVs(g, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const t = THREE.MathUtils.clamp((eaveSign * z + len / 2) / len, 0, 1);
    const curve = Math.pow(THREE.MathUtils.smoothstep(t, 0.45, 1.0), 2) * lift;
    pos.setY(i, pos.getY(i) + curve);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The roof. `detail: 'boxes'` is the game today (curved slabs + eave tiles);
 * `'geometry'` lays real half-round sangawara tiles, course by course.
 */
function kawaraRoof(parent, w, d, ridgeH, overhang, eaveY, mat, ridgeMat, detail = 'geometry') {
  const roof = new THREE.Group();
  roof.name = 'Kawara Roof';
  const halfD = d / 2 + overhang;
  const slopeLen = Math.sqrt(halfD * halfD + ridgeH * ridgeH) + 0.12;
  const angle = Math.atan2(ridgeH, halfD);
  const fullW = w + overhang * 2;

  if (detail === 'boxes') {
    const sf = new THREE.Mesh(curvedSlope(fullW, 0.14, slopeLen, 1), mat);
    sf.position.set(0, eaveY, halfD / 2);
    sf.rotation.x = angle;
    sf.castShadow = sf.receiveShadow = true;
    const sb = new THREE.Mesh(curvedSlope(fullW, 0.14, slopeLen, -1), mat);
    sb.position.set(0, eaveY, -halfD / 2);
    sb.rotation.x = -angle;
    sb.castShadow = sb.receiveShadow = true;
    roof.add(sf, sb);
  } else {
    // Real tiles: rows of half-cylinders across the slope, staggered per row.
    const cols = Math.max(6, Math.round(fullW / 0.24));
    const rows = Math.max(3, Math.round(slopeLen / 0.235));
    const tileW = fullW / cols;
    const tileGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.22, 8, 1, false, 0, Math.PI);
    tileGeo.rotateZ(Math.PI / 2);
    worldScaleBoxUVs(tileGeo, 1);
    const im = new THREE.InstancedMesh(tileGeo, mat, cols * rows * 2);
    const d = new THREE.Object3D();
    let n = 0;
    for (const sz of [1, -1]) {
      for (let r = 0; r < rows; r++) {
        const t = (r + 0.5) / rows;
        const off = (r & 1) ? tileW / 2 : 0;
        const y = eaveY + (t * slopeLen) * Math.sin(angle) * sz * -1;
        // slope surface height: ridge at centre, eave at the ends
        const along = t * slopeLen;
        const sy = eaveY + ridgeH * (1 - t);
        for (let c = 0; c < cols; c++) {
          const x = -fullW / 2 + off + tileW * (c + 0.5);
          const z = sz * (t * halfD);
          d.position.set(x, sy + 0.03, z);
          d.rotation.set(angle * sz, 0, 0);
          d.updateMatrix();
          im.setMatrixAt(n++, d.matrix);
        }
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true;
    im.receiveShadow = true;
    roof.add(im);
  }

  // Ridge barrel + crest + end onigawara.
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, fullW + 0.2, 10), ridgeMat);
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(0, eaveY + ridgeH + 0.08, 0);
  ridge.castShadow = true;
  roof.add(ridge);
  box(roof, fullW, 0.12, 0.32, ridgeMat, 0, eaveY + ridgeH + 0.18, 0);
  for (const sx of [-1, 1]) {
    box(roof, 0.12, 0.4, 0.36, ridgeMat, sx * (w / 2 + overhang + 0.06), eaveY + ridgeH + 0.1, 0);
  }

  // Gable ends so no gap shows through.
  for (const sx of [-1, 1]) {
    const ggeo = new THREE.BufferGeometry();
    ggeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, -halfD, 0, ridgeH, 0, 0, 0, halfD
    ], 3));
    ggeo.computeVertexNormals();
    const gable = new THREE.Mesh(ggeo, mat);
    gable.material.side = THREE.DoubleSide;
    gable.position.set(sx * (w / 2), eaveY, 0);
    roof.add(gable);
  }
  parent.add(roof);
  return roof;
}

function engawa(parent, w, depth, h, mat, stoneMat) {
  const g = new THREE.Group();
  g.name = 'Engawa';
  box(g, w, 0.1, depth, mat, 0, h - 0.05, 0);
  const cols = Math.max(2, Math.round(w / 1.6));
  for (let i = 0; i < cols; i++) {
    const px = -w / 2 + 0.3 + (i / (cols - 1)) * (w - 0.6);
    box(g, 0.24, h - 0.1, 0.24, stoneMat, px, (h - 0.1) / 2, depth / 2 - 0.2);
    box(g, 0.24, h - 0.1, 0.24, stoneMat, px, (h - 0.1) / 2, -depth / 2 + 0.2);
  }
  box(g, 0.9, 0.18, 0.5, stoneMat, 0, 0.09, depth / 2 + 0.3);
  parent.add(g);
  return g;
}

function noren(parent, w, h, mat, x, y, z) {
  // Two hanging cloth panels with a centre slit and crest bar.
  const g = new THREE.Group();
  const half = w / 2 - 0.02;
  box(g, half, h, 0.04, mat, -half / 2 - 0.01, 0, 0);
  box(g, half, h, 0.04, mat, half / 2 + 0.01, 0, 0);
  box(g, w, 0.09, 0.05, mat, 0, h / 2, 0);
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function inuyarai(parent, w, h, mat) {
  // Curved bamboo screen: a shallow arc of staves bowed away from the wall.
  const g = new THREE.Group();
  const count = Math.max(6, Math.round(w / 0.14));
  const stave = new THREE.CylinderGeometry(0.035, 0.035, 1, 6, 1, false);
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const x = -w / 2 + u * w;
    const m = new THREE.Mesh(stave, mat);
    const bow = Math.sin(u * Math.PI) * 0.16;
    m.scale.y = h;
    m.position.set(x, h / 2, bow);
    m.rotation.x = Math.sin(u * Math.PI) * 0.35;
    m.castShadow = true;
    g.add(m);
  }
  parent.add(g);
  return g;
}

function mushiko(parent, w, h, mat, x, y, z) {
  const g = new THREE.Group();
  g.name = 'Mushiko-mado';
  const f = 0.05;
  box(g, w, h, f * 1.4, mat, 0, 0, 0);
  const count = Math.max(5, Math.round(w / 0.09));
  for (let i = 0; i < count; i++) {
    box(g, 0.02, h - f * 2, 0.03, mat, -w / 2 + f + (i + 0.5) * ((w - f * 2) / count), 0, 0.02);
  }
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function shoki(parent, x, y, z, mat) {
  const g = new THREE.Group();
  box(g, 0.14, 0.22, 0.14, mat, 0, 0, 0);      // body
  box(g, 0.16, 0.09, 0.1, mat, 0, 0.15, 0);     // head
  box(g, 0.12, 0.03, 0.05, mat, 0, 0.22, 0);    // hat
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function chochin(parent, x, y, z, mat, timberMat) {
  const g = new THREE.Group();
  box(g, 0.015, 0.35, 0.015, timberMat, 0, 0.18, 0);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 12), mat);
  body.position.y = -0.08;
  body.castShadow = true;
  g.add(body);
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/* --------------------------- the whole house --------------------------- */

/**
 * Build one machiya. Returns { group, collider } so the hero can walk the
 * exact same surfaces the builder drew.
 */
export function buildMachiya(o = {}) {
  const {
    x = 0, z = 0, rotY = 0,
    w = 7.6, d = 5.4, gh = 2.4,
    upper = { w: 6.8, d: 4.6, h: 1.9 },
    roof = { eaveY: gh + (upper ? upper.h : 0), ridgeH: 1.5, overhang: 0.7 },
    engawaOpts = { front: true, back: false, h: 0.42, depth: 1.4 },
    battari = false, komayose = false, inuyaraiOpts = false,
    norenColor = null, koushiPattern = 'itoya', mushikoMado = false,
    namako = false, shokiFig = false, lantern = true,
    style = 'standard', detail = 'geometry'
  } = o;

  const M = createMaterialSet(style);
  const group = new THREE.Group();
  const col = new Collider();

  const hw = w / 2, hd = d / 2;
  const wallMat = namako ? M.plasterWarm : M.plasterWarm;

  // --- ground floor body (solid) ---
  box(group, w, gh, d, wallMat, 0, gh / 2, 0);
  box(group, w + 0.2, 0.3, d + 0.2, M.timberDark, 0, 0.15, 0);           // sill
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(group, 0.3, gh, 0.3, M.timberDark, sx * (hw - 0.15), gh / 2, sz * (hd - 0.15));
  }
  // eave beam
  box(group, w + 0.12, 0.1, d + 0.12, M.timberDark, 0, gh - 0.05, 0);

  // --- namako skirt ---
  if (namako) {
    const skH = 0.92, skY = 0.26 + skH / 2, out = 0.022;
    box(group, w - 0.5, skH, 0.04, M.namako, 0, skY, -(hd + out));
    for (const sx of [-1, 1]) box(group, 0.04, skH, d - 0.5, M.namako, sx * (hw + out), skY, 0);
  }

  // --- front koushi + shoji + noren ---
  const doorW = w * 0.24, latticeW = (w - doorW - 0.6) / 2;
  for (const sx of [-1, 1]) {
    const kx = sx * (doorW / 2 + 0.3 + latticeW / 2);
    koushi(group, latticeW, 1.7, M.timberDark, koushiPattern, detail);
    group.children[group.children.length - 1].position.set(kx, 1.35, hd + 0.02);
    group.children[group.children.length - 1].rotation.y = 0;
  }
  box(group, doorW, 2.0, 0.08, M.shoji, 0, 1.15, hd + 0.02, true);
  if (norenColor !== null) noren(group, w * 0.26, 0.75, M[norenColor] || M.norenIndigo, 0, gh - 0.45, hd + 0.06);

  // --- upper floor + mushiko-mado ---
  let uw = 0, ud = 0, uh = 0;
  if (upper) {
    uw = upper.w; ud = upper.d; uh = upper.h;
    const uy0 = gh, uy1 = gh + uh;
    box(group, uw, uh, ud, M.plaster, 0, uy0 + uh / 2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(group, 0.26, uh, 0.26, M.timberDark, sx * (uw / 2 - 0.12), uy0 + uh / 2, sz * (ud / 2 - 0.12));
    }
    if (mushikoMado) {
      mushiko(group, uw * 0.5, uh * 0.55, M.timberDark, 0, uy0 + uh * 0.42, ud / 2 + 0.03);
    }
  }

  // --- hisashi pent roof (walkable ring) ---
  const ledY = gh - 0.0;
  if (upper) {
    box(group, w + 1.0, 0.16, d + 1.2, M.kawara, 0, ledY, 0);
    box(group, w + 1.0, 0.2, 0.7, M.kawara, 0, ledY, hd + 0.7);
    box(group, w + 1.0, 0.2, 0.7, M.kawara, 0, ledY, -hd - 0.7);
    box(group, 0.7, 0.2, d, M.kawara, -hw - 0.7, ledY, 0);
    box(group, 0.7, 0.2, d, M.kawara, hw + 0.7, ledY, 0);
  }

  // --- main roof ---
  const eaveY = roof.eaveY;
  kawaraRoof(group, w, d, roof.ridgeH, roof.overhang, eaveY, M.kawara, M.roofRidge, detail);
  if (shokiFig) shoki(group, w * 0.3, eaveY + 0.1, hd + roof.overhang, M.roofRidge);

  // --- engawa ---
  if (engawaOpts.front) {
    engawa(group, w + 0.6, engawaOpts.depth, engawaOpts.h, M.timberEngawa, M.stone);
    group.children[group.children.length - 1].position.set(0, 0, hd + engawaOpts.depth / 2);
  }
  if (engawaOpts.back) {
    engawa(group, w + 0.6, engawaOpts.depth, engawaOpts.h, M.timberEngawa, M.stone);
    group.children[group.children.length - 1].position.set(0, 0, -hd - engawaOpts.depth / 2);
  }

  // --- battari-shogi bench ---
  if (battari) {
    box(group, 1.6, 0.45, 0.7, M.timberLight, -w * 0.28, 0.225, hd + 0.55);
    box(group, 1.7, 0.06, 0.8, M.timberDark, -w * 0.28, 0.03, hd + 0.55);
    box(group, 1.6, 0.05, 0.6, M.cushionRed, -w * 0.28, 0.48, hd + 0.55);
  }

  // --- komayose fence ---
  if (komayose) {
    for (let i = 0; i < 4; i++) box(group, 0.09, 1.05, 0.09, M.timberDark, -w * 0.55 + i * 0.28, 0.525, hd + 0.7);
    box(group, 1.0, 0.07, 0.07, M.timberDark, -w * 0.55 + 0.42, 1.02, hd + 0.7);
  }

  // --- inuyarai ---
  if (inuyaraiOpts) {
    inuyarai(group, 1.0, inuyaraiOpts.h ?? 1.0, M.timberLight);
    group.children[group.children.length - 1].position.set(w * 0.44, 0, hd + 0.55);
  }

  // --- lantern ---
  if (lantern) chochin(group, w * 0.33, gh - 0.25, hd + 0.5, M.lantern, M.timberDark);

  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  /* --- collision, built to match --- */
  const rh = roof.ridgeH, e = roof.eaveY, ov = roof.overhang;
  const local = { x0: -hw, x1: hw, z0: -hd, z1: hd };
  // solid ground floor
  col.wall(-hw, hw, -hd, hd, 0.0, gh);
  if (upper) col.wall(-uw / 2, uw / 2, -ud / 2, ud / 2, gh, gh + uh);
  // engawa decks (one-way walkable tops)
  if (engawaOpts.front) col.flat(-(w + 0.6) / 2, (w + 0.6) / 2, hd, hd + engawaOpts.depth, engawaOpts.h);
  if (engawaOpts.back) col.flat(-(w + 0.6) / 2, (w + 0.6) / 2, -hd - engawaOpts.depth, -hd, engawaOpts.h);
  // battari bench
  if (battari) col.flat(-w * 0.28 - 0.8, -w * 0.28 + 0.8, hd + 0.2, hd + 0.9, 0.45);
  // komayose fence top
  if (komayose) col.flat(-w * 0.55 - 0.1, -w * 0.55 + 0.94, hd + 0.66, hd + 0.74, 1.05);
  // inuyarai ramp (slope up toward the wall)
  if (inuyaraiOpts) col.slope(w * 0.44 - 0.5, w * 0.44 + 0.5, hd + 1.1, hd + 0.45, 0, inuyaraiOpts.h ?? 1.2);
  // pent-roof ring
  if (upper) {
    col.flat(-(w + 1.0) / 2, (w + 1.0) / 2, hd, hd + 0.7, ledY);
    col.flat(-(w + 1.0) / 2, (w + 1.0) / 2, -hd - 0.7, -hd, ledY);
    col.flat(-hw - 0.7, -hw, -hd, hd, ledY);
    col.flat(hw, hw + 0.7, -hd, hd, ledY);
    // koushi climb: street/engawa up to the front pent ledge
    col.climb(-hw + 0.4, -doorW / 2 - 0.2, hd, hd + 0.05, 0.3, ledY, ledY, -hw * 0.5, hd + 0.35);
    col.climb(doorW / 2 + 0.2, hw - 0.4, hd, hd + 0.05, 0.3, ledY, ledY, hw * 0.5, hd + 0.35);
    // mushiko-mado climb: pent roof up to the main roof slope
    const halfSpan = hd + roof.overhang;
    const upperExitY = eaveY + rh * (1 - (ud / 2 + 0.3) / halfSpan);
    col.climb(-uw / 2 + 0.4, uw / 2 - 0.4, ud / 2 - 0.06, ud / 2 + 0.06, ledY, eaveY, upperExitY, 0, ud / 2 + 0.3);
  }
  // main roof slopes (walkable)
  col.gable(-hw - ov, hw + ov, -hd - ov, hd + ov, e, e + rh);

  // Shift the collision model to the building's world position (no rotation:
  // the lab's machiya all face the street +Z).
  for (const s of col.walkers) { s.x0 += x; s.x1 += x; s.z0 += z; s.z1 += z; }
  for (const s of col.walls) { s.x0 += x; s.x1 += x; s.z0 += z; s.z1 += z; }
  for (const c of col.climbs) { c.x0 += x; c.x1 += x; c.z0 += z; c.z1 += z; c.exitX += x; c.exitZ += z; }

  return { group, collider: col, mats: M, params: { w, d, gh, upper, roof, engawaOpts } };
}

export { KOUSHI };
