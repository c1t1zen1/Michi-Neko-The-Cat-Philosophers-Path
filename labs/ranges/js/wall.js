// The forest wall in its tiers — from the game's real instanced leaf-mass
// trees down to a single painted frieze — plus the edge's two belts the
// literature names: the mantle (shrubs against the trees) and the sode
// (the low herbaceous sleeve in front).
import * as THREE from 'three';
import { mulberry32, terrainSector } from './profiles.js';

export const FOREST_GREENS = [0x2e5a24, 0x3b6e2e, 0x4e873c, 0x67a24a];

/**
 * The game's own recipe (buildEdgeForest, ported): four leaf-mass variants
 * from the real buildCanopy, instanced crowns/branches/trunks, tinted per
 * tree. `F` is the game's foliage module (labs/shared/game.js bridge).
 */
export function instancedWall(F, { count = 220, r0 = 37, r1 = 44, seed = 7, scale = 1, arcFrom = null, arcTo = null } = {}) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const variants = 4;
  const forestMat = F.createFoliageMaterial({
    sss: 0.24, wind: 0.75, mottle: 0.24, bump: 0.42, vertexColors: true,
    massMap: F.leafMassTexture('leaf'), massScale: 1 / 1.5, ragged: 1
  });
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 });
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 7);
  const assign = [], per = new Array(variants).fill(0);
  for (let i = 0; i < count; i++) { const v = Math.floor(rng() * variants); assign.push(v); per[v]++; }
  const sets = [];
  for (let v = 0; v < variants; v++) {
    const built = F.buildCanopy(rng, {
      style: 'masses', scale: 1, trunkH: 1.15, trunkR: 0.14, primaries: 5, tilt: 0.76 + v * 0.06, tiltVar: 0.22,
      droop: -0.02, bend: 0.12, branchLen: 0.78, secondaries: 2, twigs: false, crownFill: 3,
      colors: FOREST_GREENS, clumpR: 0.36, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 50 + v * 7
    });
    sets.push({
      tufts: new THREE.InstancedMesh(built.tufts, forestMat, per[v]),
      branches: new THREE.InstancedMesh(built.branches, barkMat, per[v]),
      next: 0
    });
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, count);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const trees = [];
  for (let i = 0; i < count; i++) {
    const span = arcFrom === null ? Math.PI * 2 : arcTo - arcFrom;
    const a = (arcFrom ?? 0) + (i / count) * span + rng() * 0.09;
    const r = r0 + rng() * (r1 - r0);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const s = (1.8 + rng() * 2.4) * scale;
    const set = sets[assign[i]], idx = set.next++;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(s * (0.9 + rng() * 0.2), s, s * (0.9 + rng() * 0.2));
    dummy.updateMatrix();
    set.tufts.setMatrixAt(idx, dummy.matrix);
    set.branches.setMatrixAt(idx, dummy.matrix);
    col.setRGB(0.88 + rng() * 0.24, 0.9 + rng() * 0.2, 0.84 + rng() * 0.22);
    set.tufts.setColorAt(idx, col);
    dummy.position.set(x, 0.6 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    trees.push({ x, z, s });
  }
  for (const set of sets) {
    for (const m of [set.tufts, set.branches]) {
      m.count = set.next;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      group.add(m);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  group.add(trunks);
  return { group, trees, material: forestMat };
}

/**
 * The edge's two belts (the part the game has half of): the MANTLE — shrubs
 * and climbers standing against the trees — and the SODE, the low
 * herbaceous sleeve on the open side.
 */
export function edgeBelts(F, { r0 = 35.5, r1 = 43.5, count = 140, seed = 11, scale = 1, arcFrom = null, arcTo = null } = {}) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const bushGeo = F.bushGeometry(7, { lobes: 7, detail: 1, lump: 0.36 });
  const bushMat = F.createFoliageMaterial({
    sss: 0.2, wind: 0.6, mottle: 0.24, bump: 0.42, vertexColors: true,
    massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.8, ragged: 1
  });
  const mantle = new THREE.InstancedMesh(bushGeo, bushMat, count);
  const sodeGeo = F.lumpyTuftGeometry(1, 3, 0.42);
  const sodeMat = F.createFoliageMaterial({
    sss: 0.18, wind: 0.9, mottle: 0.3, bump: 0.3, vertexColors: false,
    massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.6
  });
  const sode = new THREE.InstancedMesh(sodeGeo, sodeMat, count * 2);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const span = arcFrom === null ? Math.PI * 2 : arcTo - arcFrom;
  for (let i = 0; i < count; i++) {
    const a = (arcFrom ?? 0) + rng() * span;
    const r = r0 + rng() * (r1 - r0);
    const s = (0.9 + rng() * 1.6) * scale;
    dummy.position.set(Math.cos(a) * r, s * 0.5, Math.sin(a) * r);
    dummy.scale.set(s * 1.2, s * 0.8, s * 1.2);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.updateMatrix();
    mantle.setMatrixAt(i, dummy.matrix);
    mantle.setColorAt(i, col.setHex(0x4c7c36).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.08));
  }
  for (let i = 0; i < count * 2; i++) {
    const a = (arcFrom ?? 0) + rng() * span;
    const r = (r0 - 1.5) + rng() * 3.2;
    const s = (0.5 + rng() * 0.9) * scale;
    dummy.position.set(Math.cos(a) * r, s * 0.28, Math.sin(a) * r);
    dummy.scale.set(s * 1.5, s * 0.55, s * 1.5);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.updateMatrix();
    sode.setMatrixAt(i, dummy.matrix);
    sode.setColorAt(i, col.setHSL(0.23 + rng() * 0.06, 0.4 + rng() * 0.15, 0.32 + rng() * 0.12));
  }
  for (const m of [mantle, sode]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    group.add(m);
  }
  return { group, mantle, sode };
}

/** Foothill carpet: instanced sugi spires + broadleaf crowns (ported). */
export function foothillCarpet(F, heightAt, { count = 2600, r0 = 60, r1 = 190, seed = 23, kinds = 'mixed' } = {}) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const cedarGeo = F.lumpyConeGeometry(1, 8, 0.3);
  const cedarGeoB = F.lumpyConeGeometry(1, 12, 0.34);
  const roundGeo = F.lumpyTuftGeometry(1, 8, 0.36);
  const cedarMat = F.createFoliageMaterial({
    sss: 0.15, wind: 0.5, mottle: 0.24, vertexColors: false,
    massMap: F.leafMassTexture('needle'), massScale: 1 / 2.4
  });
  const crownMat = F.createFoliageMaterial({
    sss: 0.15, wind: 0.5, mottle: 0.24, vertexColors: false,
    massMap: F.leafMassTexture('leaf'), massScale: 1 / 3
  });
  const meshes = [
    new THREE.InstancedMesh(cedarGeo, cedarMat, count),
    new THREE.InstancedMesh(cedarGeoB, cedarMat, count),
    new THREE.InstancedMesh(roundGeo, crownMat, count)
  ];
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const placed = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = r0 + Math.pow(rng(), 0.75) * (r1 - r0);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const { opening } = terrainSector(x, z);
    if (rng() < opening * 0.93) continue;
    const cedarChance = kinds === 'sugi' ? 0.9 : r < 95 ? 0.5 : 0.78;
    const kind = rng() < cedarChance ? (rng() < 0.5 ? 0 : 1) : 2;
    const y = heightAt(x, z);
    if (kind === 2) {
      const s = 1.1 + rng() * 1.7;
      dummy.position.set(x, y + s * 0.45, z);
      dummy.scale.set(s * (0.8 + rng() * 0.5), s * 1.1, s * (0.8 + rng() * 0.5));
      dummy.rotation.set(rng() * 0.3, rng() * Math.PI, rng() * 0.3);
      if (kinds === 'momiji') color.setHSL(0.06 + rng() * 0.1, 0.5 + rng() * 0.2, 0.32 + rng() * 0.12);
      else color.setHSL(0.24 + rng() * 0.08, 0.32 + rng() * 0.14, 0.17 + rng() * 0.1);
    } else {
      const s = 0.9 + rng() * 1.4;
      dummy.position.set(x, y - 0.2, z);
      dummy.scale.set(s * (0.85 + rng() * 0.3), s * (1.0 + rng() * 0.5), s * (0.85 + rng() * 0.3));
      dummy.rotation.set((rng() - 0.5) * 0.12, rng() * Math.PI, (rng() - 0.5) * 0.12);
      if (kinds === 'momiji') color.setHSL(0.09 + rng() * 0.06, 0.42 + rng() * 0.18, 0.26 + rng() * 0.1);
      else color.setHSL(0.33 + rng() * 0.07, 0.26 + rng() * 0.14, 0.13 + rng() * 0.09);
    }
    dummy.updateMatrix();
    meshes[kind].setMatrixAt(placed[kind], dummy.matrix);
    meshes[kind].setColorAt(placed[kind], color);
    placed[kind]++;
  }
  for (let k = 0; k < 3; k++) {
    meshes[k].count = placed[k];
    meshes[k].instanceMatrix.needsUpdate = true;
    if (meshes[k].instanceColor) meshes[k].instanceColor.needsUpdate = true;
    group.add(meshes[k]);
  }
  return { group, meshes, placed };
}

/* ---------------- flat alternatives ---------------- */

/** A little 2×2 atlas of painted trees for the card wall. */
export function treeCardAtlas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const x = c.getContext('2d');
  let s = 91;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const dab = (px, py, r, fill) => {
    x.fillStyle = fill;
    x.beginPath();
    x.ellipse(px, py, r * (0.8 + rnd() * 0.4), r * (0.66 + rnd() * 0.3), rnd() * 0.6 - 0.3, 0, Math.PI * 2);
    x.fill();
  };
  for (let v = 0; v < 4; v++) {
    const cx = (v % 2) * 256 + 128, cy = Math.floor(v / 2) * 256 + 236;
    const W = 84 + rnd() * 30, H = 170 + rnd() * 50;
    // trunk: two brush strokes
    x.strokeStyle = 'rgb(88, 68, 50)'; x.lineCap = 'round';
    x.lineWidth = 7;
    x.beginPath(); x.moveTo(cx - 3, cy); x.quadraticCurveTo(cx + 2, cy - H * 0.4, cx - 6 + rnd() * 12, cy - H * 0.62); x.stroke();
    x.lineWidth = 4;
    x.beginPath(); x.moveTo(cx + 4, cy - H * 0.15); x.quadraticCurveTo(cx + 10, cy - H * 0.4, cx + 22, cy - H * 0.55); x.stroke();
    // canopy: massed dabs, dark first then mid then light on top
    const tones = [['rgb(42, 76, 36)', 1.05], ['rgb(58, 102, 44)', 0.82], ['rgb(82, 132, 58)', 0.6]];
    for (const [tone, shrink] of tones) {
      for (let i = 0; i < 12; i++) {
        const a = rnd() * Math.PI * 2, rr = rnd() * W * 0.42 * shrink;
        dab(cx + Math.cos(a) * rr * 1.35, cy - H * 0.72 + Math.sin(a) * rr * 0.8 - rnd() * 10 * (1 - shrink), (10 + rnd() * 16) * shrink, tone);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Crossed-card wall: two quads per tree, one instanced draw. */
export function cardWall({ count = 220, r0 = 37, r1 = 44, seed = 7, scale = 1, treeW = 5.2, treeH = 7.4 } = {}) {
  const rng = mulberry32(seed * 3 + 1);
  const base = new THREE.PlaneGeometry(treeW, treeH, 1, 1);
  base.translate(0, treeH / 2, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  const offs = [], variants = [], rots = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.09;
    const r = r0 + rng() * (r1 - r0);
    const s = (0.8 + rng() * 0.9) * scale;
    offs.push(Math.cos(a) * r, 0, Math.sin(a) * r, s);
    variants.push(Math.floor(rng() * 4));
    rots.push(rng() * Math.PI);
  }
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(offs), 4));
  geo.setAttribute('iVar', new THREE.InstancedBufferAttribute(new Float32Array(variants), 1));
  geo.setAttribute('iRot', new THREE.InstancedBufferAttribute(new Float32Array(rots), 1));
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: false, alphaTest: 0.5,
    uniforms: { uMap: { value: treeCardAtlas() } },
    vertexShader: /* glsl */`
      attribute vec4 iPos; attribute float iVar; attribute float iRot;
      varying vec2 vUv; varying float vFogZ;
      void main() {
        // crossed pair: even instances get a second quad rotated 90°
        vec3 p = position;
        float c = cos(iRot), s = sin(iRot);
        p.xz = mat2(c, -s, s, c) * p.xz;
        vec4 w = vec4(iPos.xyz + p * iPos.w, 1.0);
        // iVar picks one of the 2×2 atlas cells (CanvasTexture is Y-flipped)
        vUv = vec2((mod(iVar, 2.0) + uv.x) * 0.5, 1.0 - (floor(iVar / 2.0) * 0.5 + uv.y * 0.5));
        vec4 mv = viewMatrix * w;
        vFogZ = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; varying vec2 vUv; varying float vFogZ;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        if (t.a < 0.5) discard;
        gl_FragColor = vec4(t.rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  // a second crossed set is folded into the same geometry by rotating iRot ±90:
  // cheap trick — duplicate the attribute work once
  const geo2 = geo.clone();
  const rot2 = new Float32Array(rots.map((v) => v + Math.PI / 2));
  geo2.setAttribute('iRot', new THREE.InstancedBufferAttribute(rot2, 1));
  const mesh2 = new THREE.Mesh(geo2, mat);
  mesh2.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh, mesh2);
  return { group, count: count * 2, material: mat };
}

/** Painted canopy strip for the treeline frieze (one texture row). */
export function treelineTexture({ w = 1024, h = 256, seed = 17 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // trunks first: sparse dark strokes under the canopy
  x.strokeStyle = 'rgba(70, 54, 40, 0.9)'; x.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const px = rnd() * w, top = h * 0.45 + rnd() * h * 0.2;
    x.lineWidth = 2 + rnd() * 3;
    x.beginPath(); x.moveTo(px, h); x.lineTo(px + (rnd() - 0.5) * 8, top); x.stroke();
  }
  // shadow band under the canopy
  const sg = x.createLinearGradient(0, h * 0.5, 0, h);
  sg.addColorStop(0, 'rgba(30, 48, 28, 0)'); sg.addColorStop(1, 'rgba(26, 40, 24, 0.55)');
  x.fillStyle = sg; x.fillRect(0, h * 0.5, w, h * 0.5);
  // scalloped canopy: rows of dabs — dark base, mid, light crowns
  const dab = (px, py, r, fill) => { x.fillStyle = fill; x.beginPath(); x.ellipse(px, py, r, r * (0.6 + rnd() * 0.25), 0, 0, Math.PI * 2); x.fill(); };
  const rows = [[h * 0.62, 30, 'rgb(40, 66, 34)'], [h * 0.48, 26, 'rgb(56, 92, 40)'], [h * 0.34, 20, 'rgb(80, 122, 54)']];
  for (const [y, r, tone] of rows) {
    for (let px = -r; px < w + r; px += r * (1.1 + rnd() * 0.5)) {
      dab(px + rnd() * 14, y + (rnd() - 0.5) * 14, r * (0.7 + rnd() * 0.5), tone);
    }
  }
  // ragged bottom fringe
  for (let i = 0; i < 240; i++) {
    const px = rnd() * w, py = h * 0.6 + rnd() * h * 0.3;
    dab(px, py, 3 + rnd() * 7, `rgba(${44 + rnd() * 30 | 0}, ${76 + rnd() * 40 | 0}, ${34 + rnd() * 24 | 0}, ${0.5 + rnd() * 0.4})`);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The matte-painting wall: one wide frieze with a painted canopy strip. */
export function paintedTreeline({ radius = 40, height = 8, repeat = 7 } = {}) {
  const tex = treelineTexture();
  tex.repeat.x = repeat;
  const geo = new THREE.CylinderGeometry(radius, radius, height, 96, 1, true, 0, Math.PI * 2);
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.42, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = height / 2 - 0.4;
  return { group: mesh, material: mat, count: 1 };
}

/**
 * The edge in cross-section: a straight slice showing the three belts —
 * sode herbs, mantle shrubs, the wall trees — for the Callouts overlay.
 */
export function edgeSlice(F, { len = 16, seed = 5 } = {}) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  // ground strip
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(len, 7), new THREE.MeshLambertMaterial({ color: 0x4f7434 }));
  strip.rotation.x = -Math.PI / 2;
  strip.position.z = -1.4;
  group.add(strip);
  // sode: small pale tufts along the front
  const sodeGeo = F.lumpyTuftGeometry(1, 3, 0.42);
  const sodeMat = F.createFoliageMaterial({ sss: 0.18, wind: 0.9, mottle: 0.3, bump: 0.3, vertexColors: false, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.6 });
  const sode = new THREE.InstancedMesh(sodeGeo, sodeMat, 60);
  for (let i = 0; i < 60; i++) {
    const s = 0.4 + rng() * 0.7;
    dummy.position.set((rng() - 0.5) * len, s * 0.3, -0.4 + rng() * 1.6);
    dummy.scale.set(s * 1.5, s * 0.55, s * 1.5);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.updateMatrix();
    sode.setMatrixAt(i, dummy.matrix);
    sode.setColorAt(i, col.setHSL(0.23 + rng() * 0.06, 0.42, 0.34 + rng() * 0.1));
  }
  sode.instanceMatrix.needsUpdate = true;
  if (sode.instanceColor) sode.instanceColor.needsUpdate = true;
  group.add(sode);
  // mantle: shrub band
  const bushGeo = F.bushGeometry(7, { lobes: 7, detail: 1, lump: 0.36 });
  const bushMat = F.createFoliageMaterial({ sss: 0.2, wind: 0.6, mottle: 0.24, bump: 0.42, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.8, ragged: 1 });
  const mantle = new THREE.InstancedMesh(bushGeo, bushMat, 26);
  for (let i = 0; i < 26; i++) {
    const s = 0.8 + rng() * 1.3;
    dummy.position.set((rng() - 0.5) * len, s * 0.5, -2.4 + rng() * 1.6);
    dummy.scale.set(s * 1.2, s * 0.85, s * 1.2);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.updateMatrix();
    mantle.setMatrixAt(i, dummy.matrix);
    mantle.setColorAt(i, col.setHex(0x4c7c36).offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.08));
  }
  mantle.instanceMatrix.needsUpdate = true;
  if (mantle.instanceColor) mantle.instanceColor.needsUpdate = true;
  group.add(mantle);
  // wall trees: real canopies in a row
  const forestMat = F.createFoliageMaterial({
    sss: 0.24, wind: 0.75, mottle: 0.24, bump: 0.42, vertexColors: true,
    massMap: F.leafMassTexture('leaf'), massScale: 1 / 1.5, ragged: 1
  });
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 });
  const built = F.buildCanopy(rng, {
    style: 'masses', scale: 1, trunkH: 1.15, trunkR: 0.14, primaries: 5, tilt: 0.82, tiltVar: 0.2,
    droop: -0.02, bend: 0.12, branchLen: 0.78, secondaries: 2, twigs: false, crownFill: 3,
    colors: FOREST_GREENS, clumpR: 0.36, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 57
  });
  const tufts = new THREE.InstancedMesh(built.tufts, forestMat, 7);
  const branches = new THREE.InstancedMesh(built.branches, barkMat, 7);
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 7);
  const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, 7);
  for (let i = 0; i < 7; i++) {
    const s = 2 + rng() * 1.6;
    const x = -len / 2 + 1 + i * (len - 2) / 6 + (rng() - 0.5);
    const z = -4.4 - rng() * 1.4;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
    branches.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 0.6 * s, z);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    col.setRGB(0.9 + rng() * 0.2, 0.9 + rng() * 0.2, 0.86 + rng() * 0.2);
    tufts.setColorAt(i, col);
  }
  for (const m of [tufts, branches, trunks]) { m.instanceMatrix.needsUpdate = true; group.add(m); }
  return { group, labels: [
    { id: 'sode', title: 'Sode sleeve', sub: 'ソデ群落 · herbs', pos: new THREE.Vector3(-3, 0.5, 0.2) },
    { id: 'mantle', title: 'Mantle', sub: 'マント群落 · shrubs', pos: new THREE.Vector3(1.5, 1.6, -2.2) },
    { id: 'wall', title: 'The wall', sub: 'buildCanopy masses', pos: new THREE.Vector3(2.5, 6.4, -4.6) }
  ] };
}

/** Drive the foliage module's shared uniforms from a LightRig. */
export function driveFoliage(F, t, rig, wind = 1) {
  F.foliageUniforms.uTime.value = t;
  F.foliageUniforms.uSunDir.value.copy(rig.sunDir).normalize();
  F.foliageUniforms.uSunColor.value.copy(rig.palette.sun).multiplyScalar(Math.max(0, rig.sunDir.y) ** 0.5 * 1.2);
  F.foliageUniforms.uWindGlobal.value += (wind - F.foliageUniforms.uWindGlobal.value) * 0.04;
}
