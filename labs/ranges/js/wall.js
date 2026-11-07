// The forest wall in its tiers — from the game's real instanced leaf-mass
// trees down to a single painted frieze — plus the edge's two belts the
// literature names: the mantle (shrubs against the trees) and the sode
// (the low herbaceous sleeve in front).
import * as THREE from 'three';
import { mulberry32, terrainSector, worldNoise, smoothstep } from './profiles.js';

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
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x7a6854, roughness: 1 });
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.17, 1.3, 7);
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

/**
 * Foothill carpet — stand ecology, not uniform scatter. Real Kyoto slopes
 * organise themselves three ways this models: natural clumps where seedlings
 * grew in a parent's shelter, even-aged sugi plantation stands in rough
 * rows (Kitayama cedar is literally planted in rows), and clearings where
 * rock or a gully keeps the slope open. Species band by elevation — broadleaf
 * crowns low, sugi high — and every stand shares a slight tint so neighbours
 * read as one grove, not noise.
 */
export function foothillCarpet(F, heightAt, { r0 = 55, r1 = 185, seed = 23, kinds = 'mixed', budget = 4200 } = {}) {
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
  const cap = Math.ceil(budget * 1.2);
  const meshes = [
    new THREE.InstancedMesh(cedarGeo, cedarMat, cap),
    new THREE.InstancedMesh(cedarGeoB, cedarMat, cap),
    new THREE.InstancedMesh(roundGeo, crownMat, cap)
  ];
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const placed = [0, 0, 0];
  let total = 0;

  const put = (x, z, kind, s, tintH) => {
    if (placed[kind] >= cap || total >= budget) return;
    const { opening } = terrainSector(x, z);
    if (rng() < opening * 0.72) return;   // the corridor thins, it isn't cleared
    const y = heightAt(x, z);
    if (kind === 2) {
      dummy.position.set(x, y + s * 0.45, z);
      dummy.scale.set(s * (0.8 + rng() * 0.5), s * 1.1, s * (0.8 + rng() * 0.5));
      dummy.rotation.set(rng() * 0.3, rng() * Math.PI, rng() * 0.3);
      if (kinds === 'momiji') color.setHSL(0.06 + tintH, 0.5 + rng() * 0.2, 0.32 + rng() * 0.12);
      else color.setHSL(0.235 + tintH + rng() * 0.04, 0.36 + rng() * 0.14, 0.14 + rng() * 0.09);
    } else {
      dummy.position.set(x, y - 0.2, z);
      // sugi crowns are broad — wide-spreading cones touch into canopy
      dummy.scale.set(s * (1.2 + rng() * 0.5), s * (1.0 + rng() * 0.5), s * (1.2 + rng() * 0.5));
      dummy.rotation.set((rng() - 0.5) * 0.12, rng() * Math.PI, (rng() - 0.5) * 0.12);
      if (kinds === 'momiji') color.setHSL(0.09 + tintH * 0.5, 0.42 + rng() * 0.18, 0.26 + rng() * 0.1);
      else color.setHSL(0.33 + tintH + rng() * 0.035, 0.3 + rng() * 0.14, 0.105 + rng() * 0.075);
    }
    dummy.updateMatrix();
    meshes[kind].setMatrixAt(placed[kind], dummy.matrix);
    meshes[kind].setColorAt(placed[kind], color);
    placed[kind]++; total++;
  };

  // jittered stand grid in polar space: cells ~11 m, jittered; a share of
  // cells stays empty — those holes are the clearings and rock outcrops
  let rb = r0;
  while (rb < r1 && total < budget) {
    const bandW = 9 + rng() * 3;
    const rmid = rb + bandW / 2;
    const nA = Math.max(4, Math.round((Math.PI * 2 * rmid) / bandW));
    for (let k = 0; k < nA && total < budget; k++) {
      const a = (k / nA) * Math.PI * 2 + rng() * 0.5;
      const r = rmid + (rng() - 0.5) * bandW * 0.9;
      const sx = Math.cos(a) * r, sz = Math.sin(a) * r;
      // clearing mask + feathered edges at both ends of the belt
      const clear = worldNoise(sx, sz, 0.018, 2, 13);
      const feather = smoothstep(r0 - 4, r0 + 16, r) * (1 - smoothstep(r1 - 26, r1 + 4, r));
      if (clear < -0.34 || rng() > feather + 0.5) continue;
      if (rng() < 0.06) continue;

      // species by elevation band: crowns low, sugi high, mixed between
      let band;
      if (kinds === 'sugi') band = 'sugi';
      else if (kinds === 'momiji') band = 'momiji';
      else band = r < 100 ? 'crown' : r < 140 ? (rng() < 0.5 ? 'crown' : 'sugi') : 'sugi';
      const tintH = (rng() - 0.5) * 0.05;               // stand hue

      if (band === 'sugi' && rng() < 0.5) {
        // plantation stand: two or three rough rows along the contour
        const rows = 2 + (rng() < 0.5 ? 1 : 0), per = 3 + Math.floor(rng() * 4);
        const dirA = a + Math.PI / 2 + (rng() - 0.5) * 0.6;
        const dx = Math.cos(dirA), dz = Math.sin(dirA);
        const px = -dz, pz = dx;
        const sBase = 0.95 + rng() * 0.35;              // uniform poles
        for (let row = 0; row < rows; row++) {
          for (let cI = 0; cI < per; cI++) {
            const ox = dx * (cI - per / 2) * (2.6 + rng()) + px * (row - rows / 2) * 2.4 + (rng() - 0.5) * 1.4;
            const oz = dz * (cI - per / 2) * (2.6 + rng()) + pz * (row - rows / 2) * 2.4 + (rng() - 0.5) * 1.4;
            put(sx + ox, sz + oz, rng() < 0.5 ? 0 : 1, sBase * (0.9 + rng() * 0.2), tintH);
          }
        }
      } else {
        // natural clump: offspring around a parent, gaussian falloff
        const n = 8 + Math.floor(rng() * 13);
        const sig = 3.4 + rng() * 4.6;
        const cedarKind = band === 'sugi';
        for (let j = 0; j < n; j++) {
          const ga = rng() * Math.PI * 2, gr = Math.abs(rng() + rng() - 1) * sig;
          const ox = Math.cos(ga) * gr, oz = Math.sin(ga) * gr;
          const s = cedarKind ? 0.9 + rng() * 1.4 : 1.1 + rng() * 1.7;
          put(sx + ox, sz + oz, cedarKind ? (rng() < 0.5 ? 0 : 1) : 2, s, tintH);
        }
      }
    }
    rb += bandW;
  }
  for (let k = 0; k < 3; k++) {
    meshes[k].count = placed[k];
    meshes[k].instanceMatrix.needsUpdate = true;
    if (meshes[k].instanceColor) meshes[k].instanceColor.needsUpdate = true;
    group.add(meshes[k]);
  }
  return { group, meshes, placed, total };
}

/* ---------------- flat alternatives ---------------- */

/**
 * Bake the real leaf-mass canopies straight-on into a 1×4 card atlas —
 * the SpeedTree recipe: the billboard *is* a photo of the 3D tree, so
 * cards keep the crown detail, the trunk and the light. Each cell holds
 * one variant with the trunk base on the cell's bottom edge.
 */
export function bakeCardAtlas(renderer, F, { cell = 384, seed = 41 } = {}) {
  const rng = mulberry32(seed);
  const forestMat = F.createFoliageMaterial({
    sss: 0.24, wind: 0, mottle: 0.24, bump: 0.42, vertexColors: true,
    massMap: F.leafMassTexture('leaf'), massScale: 1 / 1.5, ragged: 1
  });
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x7a6854, roughness: 1 });
  const rt = new THREE.WebGLRenderTarget(cell, cell, {
    alpha: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace
  });
  const atlas = document.createElement('canvas');
  atlas.width = cell * 4; atlas.height = cell;
  const ctx = atlas.getContext('2d');
  const buf = new Uint8Array(cell * cell * 4);
  const prevRT = renderer.getRenderTarget();

  const scene = new THREE.Scene();
  const key = new THREE.DirectionalLight(0xfff0d6, 3.1);
  key.position.set(0.55, 0.85, 0.6);
  const rim = new THREE.DirectionalLight(0xd8e4f2, 0.9);
  rim.position.set(-0.6, 0.5, -0.7);
  const fill = new THREE.HemisphereLight(0xcfe0f2, 0x5a6a44, 1.5);
  scene.add(key, rim, fill);

  let maxW = 0, maxH = 0;
  for (let v = 0; v < 4; v++) {
    const built = F.buildCanopy(rng, {
      style: 'masses', scale: 1, trunkH: 1.15, trunkR: 0.14, primaries: 5, tilt: 0.76 + v * 0.06, tiltVar: 0.22,
      droop: -0.02, bend: 0.12, branchLen: 0.78, secondaries: 2, twigs: false, crownFill: 3,
      colors: FOREST_GREENS, clumpR: 0.36, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 50 + v * 7
    });
    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(built.tufts, forestMat), new THREE.Mesh(built.branches, barkMat));
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, 1.3, 7), barkMat);
    trunk.position.y = 0.65;
    obj.add(trunk);
    scene.add(obj);

    const box = new THREE.Box3().setFromObject(obj);
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const h = box.max.y - box.min.y, w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    maxH = Math.max(maxH, h); maxW = Math.max(maxW, w);
    // perspective 26°: frame the box with ~9% headroom, base near bottom edge
    const cam = new THREE.PerspectiveCamera(26, 1, 0.01, 100);
    const dist = (h * 0.55) / Math.tan(THREE.MathUtils.degToRad(13));
    cam.position.set(cx, box.min.y + h * 0.52, cz + dist);
    cam.lookAt(cx, box.min.y + h * 0.52, cz);
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, cell, cell, buf);
    const img = ctx.createImageData(cell, cell);
    for (let y = 0; y < cell; y++) {
      const src = (cell - 1 - y) * cell * 4;
      img.data.set(buf.subarray(src, src + cell * 4), y * cell * 4);
    }
    ctx.putImageData(img, v * cell, 0);
    scene.remove(obj);
  }
  renderer.setRenderTarget(prevRT);
  rt.dispose();
  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, treeW: maxW, treeH: maxH, canvas: atlas };
}

/**
 * Star-billboard wall (Florasynth's crossed-billboard recipe): three upright
 * quads 60° apart through the trunk, each carrying a bake of the real tree.
 * A quad that the camera sees near edge-on fades out so the wall never
 * squeezes into thin stripes.
 */
export function cardWall(atlas, { count = 220, r0 = 37, r1 = 44, seed = 7, scale = 1, arcFrom = null, arcTo = null } = {}) {
  const rng = mulberry32(seed * 3 + 1);
  const treeW = atlas.treeW, treeH = atlas.treeH;
  // base geometry: three planes sharing one origin, tagged by quad index
  const parts = [];
  for (let q = 0; q < 3; q++) {
    const g = new THREE.PlaneGeometry(treeW, treeH, 1, 1);
    g.translate(0, treeH / 2, 0);
    const n = g.attributes.position.count;
    const tag = new Float32Array(n).fill(q);
    g.setAttribute('aQuad', new THREE.BufferAttribute(tag, 1));
    parts.push(g);
  }
  const base = mergeQuads(parts);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  geo.attributes.aQuad = base.attributes.aQuad;
  const n = count;
  const iPos = new Float32Array(n * 4), iVar = new Float32Array(n), iRot = new Float32Array(n), iTint = new Float32Array(n * 3);
  const span = arcFrom === null ? Math.PI * 2 : arcTo - arcFrom;
  for (let i = 0; i < n; i++) {
    const a = (arcFrom ?? 0) + (i / n) * span + rng() * 0.09;
    const r = r0 + rng() * (r1 - r0);
    const s = (1.35 + rng() * 1.9) * scale;
    iPos.set([Math.cos(a) * r, 0, Math.sin(a) * r, s], i * 4);
    iVar[i] = Math.floor(rng() * 4);
    iRot[i] = rng() * Math.PI;
    iTint.set([0.88 + rng() * 0.22, 0.9 + rng() * 0.18, 0.86 + rng() * 0.2], i * 3);
  }
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 4));
  geo.setAttribute('iVar', new THREE.InstancedBufferAttribute(iVar, 1));
  geo.setAttribute('iRot', new THREE.InstancedBufferAttribute(iRot, 1));
  geo.setAttribute('iTint', new THREE.InstancedBufferAttribute(iTint, 3));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uMap: { value: atlas.texture } },
    vertexShader: /* glsl */`
      attribute float aQuad;
      attribute vec4 iPos; attribute float iVar; attribute float iRot; attribute vec3 iTint;
      varying vec2 vUv; varying float vAlpha; varying vec3 vTint;
      void main() {
        float qa = aQuad * 1.047197551 + iRot;   // quad yaw around the trunk
        vec3 p = position;
        p.xz = mat2(cos(qa), -sin(qa), sin(qa), cos(qa)) * p.xz;
        p *= iPos.w;
        vec3 w = iPos.xyz + p;
        // edge-on fade: a quad seen nearly side-on shrinks away
        vec2 n2 = vec2(sin(qa), cos(qa));
        vec2 toCam = cameraPosition.xz - w.xz;
        float side = abs(dot(n2, normalize(toCam + vec2(1e-4))));
        vAlpha = smoothstep(0.1, 0.45, side);
        vUv = vec2((iVar + uv.x) * 0.25, uv.y);
        vTint = iTint;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; varying vec2 vUv; varying float vAlpha; varying vec3 vTint;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        if (t.a * vAlpha < 0.42) discard;
        gl_FragColor = vec4(t.rgb * vTint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);
  return { group, count: n * 3, material: mat };
}

/** Tiny merge for the three tagged billboard planes. */
function mergeQuads(parts) {
  let vtx = 0, idx = 0;
  for (const g of parts) { vtx += g.attributes.position.count; idx += g.index.count; }
  const pos = new Float32Array(vtx * 3), uv = new Float32Array(vtx * 2), aq = new Float32Array(vtx);
  const index = new Uint16Array(idx);
  let vo = 0, io = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    aq.set(g.attributes.aQuad.array, vo);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) index[io + i] = gi[i] + vo;
    vo += g.attributes.position.count; io += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('aQuad', new THREE.BufferAttribute(aq, 1));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}

/**
 * Painted canopy strip for the treeline frieze. The Oga/anime-background
 * recipe: a low number of *designed* shapes, not scatter dabs. Each crown
 * is three flat shapes — shadow body, mid mass, two or three lit facets
 * high on the sun side — so the eye reads trees, not noise. Tileable in x.
 */
export function treelineTexture({ w = 1024, h = 256, seed = 17 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const base = h * 0.96;                 // ground line

  // crown helper: one tree = silhouette + mass + facets, sun upper-left
  const crown = (cx, cy, cw, ch, tones, hero) => {
    const [dark, mid, lite, rimc] = tones;
    // 1 · silhouette — a round-topped shape with a flat bottom
    x.fillStyle = dark;
    x.beginPath();
    x.moveTo(cx - cw / 2, base);
    x.quadraticCurveTo(cx - cw * 0.62, cy + ch * 0.28, cx - cw * 0.5, cy + ch * 0.02);
    x.quadraticCurveTo(cx - cw * 0.45, cy - ch * 0.5, cx - cw * 0.06, cy - ch * 0.52);
    x.quadraticCurveTo(cx + cw * 0.4, cy - ch * 0.55, cx + cw * 0.48, cy - ch * 0.05);
    x.quadraticCurveTo(cx + cw * 0.58, cy + ch * 0.24, cx + cw / 2, base);
    x.closePath(); x.fill();
    // 2 · mid mass — upper two-thirds of the crown
    x.fillStyle = mid;
    x.beginPath();
    x.moveTo(cx - cw * 0.5, cy + ch * 0.16);
    x.quadraticCurveTo(cx - cw * 0.44, cy - ch * 0.44, cx - cw * 0.05, cy - ch * 0.47);
    x.quadraticCurveTo(cx + cw * 0.38, cy - ch * 0.5, cx + cw * 0.45, cy + ch * 0.08);
    x.quadraticCurveTo(cx + cw * 0.3, cy + ch * 0.22, cx - cw * 0.1, cy + ch * 0.22);
    x.quadraticCurveTo(cx - cw * 0.45, cy + ch * 0.2, cx - cw * 0.5, cy + ch * 0.16);
    x.closePath(); x.fill();
    // 3 · lit facets — two or three controlled dabs, upper-left
    const nf = hero ? 4 : 2 + (rnd() * 2 | 0);
    x.fillStyle = lite;
    for (let i = 0; i < nf; i++) {
      const fx = cx - cw * (0.08 + rnd() * 0.26), fy = cy - ch * (0.2 + rnd() * 0.26);
      const fr = cw * (0.1 + rnd() * 0.11);
      x.beginPath(); x.ellipse(fx, fy, fr, fr * 0.62, -0.35, 0, Math.PI * 2); x.fill();
    }
    // 4 · rim: a thin warm stroke along the sun-side crown edge
    x.strokeStyle = rimc; x.lineWidth = hero ? 2.4 : 1.6; x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx - cw * 0.42, cy - ch * 0.12);
    x.quadraticCurveTo(cx - cw * 0.4, cy - ch * 0.46, cx - cw * 0.04, cy - ch * 0.5);
    x.stroke();
  };

  const BACK = ['rgb(60,88,96)', 'rgb(74,104,108)', 'rgb(102,132,130)', 'rgb(140,166,152)'];
  const FRONT = ['rgb(50,84,42)', 'rgb(70,112,54)', 'rgb(104,150,70)', 'rgb(168,206,122)'];
  const FRONT2 = ['rgb(58,96,46)', 'rgb(82,126,60)', 'rgb(120,168,80)', 'rgb(186,216,132)'];

  // 1 · back rank — a bluer, lower stand of crowns behind everything
  let bx = -20;
  while (bx < w + 20) {
    const cw = 92 + rnd() * 52, ch = cw * (0.42 + rnd() * 0.14);
    crown(bx, h * 0.55 + rnd() * 8, cw, ch, BACK, false);
    bx += cw * (0.6 + rnd() * 0.22);
  }

  // 2 · trunk hints — sparse strokes only where they might peek out
  x.strokeStyle = 'rgba(78, 60, 44, 0.85)';
  for (let i = 0; i < 46; i++) {
    const px = rnd() * w;
    x.lineWidth = 1.4 + rnd() * 2.6;
    x.beginPath(); x.moveTo(px, base + 2); x.lineTo(px + (rnd() - 0.5) * 6, base - h * (0.1 + rnd() * 0.1)); x.stroke();
  }

  // 3 · front rank — the real treeline: crowns wider than tall, overlapping
  // into one canopy mass, with rare sky slits
  let fx = -26;
  let i = 0;
  while (fx < w + 26) {
    const hero = i % 9 === 3;
    const cw = (hero ? 130 : 96) + rnd() * 46;
    const ch = cw * (0.36 + rnd() * 0.24);
    crown(fx + (rnd() - 0.5) * 8, base - ch * (0.38 + rnd() * 0.18), cw, ch, hero ? FRONT2 : (rnd() < 0.4 ? FRONT2 : FRONT), hero);
    // an occasional thin slit through to the sky between crowns
    if (rnd() < 0.13) {
      x.globalCompositeOperation = 'destination-out';
      const sw = 2.5 + rnd() * 5;
      x.fillStyle = '#000';
      x.fillRect(fx + cw / 2 - sw / 2, base - ch * (0.35 + rnd() * 0.3), sw, ch * (0.35 + rnd() * 0.3));
      x.globalCompositeOperation = 'source-over';
    }
    fx += cw * (0.58 + rnd() * 0.2);
    i++;
  }

  // 4 · under-canopy shadow band, so the base sits in shade
  const sg = x.createLinearGradient(0, base - h * 0.14, 0, base + 2);
  sg.addColorStop(0, 'rgba(30, 50, 28, 0)');
  sg.addColorStop(1, 'rgba(24, 40, 24, 0.62)');
  x.fillStyle = sg; x.fillRect(0, base - h * 0.14, w, h * 0.14 + 2);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The matte-painting wall: one wide frieze with a painted canopy strip. */
export function paintedTreeline({ radius = 40, height = 8, repeat = 7 } = {}) {
  const tex = treelineTexture();
  tex.repeat.x = repeat;
  const geo = new THREE.CylinderGeometry(radius, radius, height, 96, 1, true, 0, Math.PI * 2);
  // unlit: the paint carries its own light (classic matte-painting approach)
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.42, side: THREE.DoubleSide });
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
