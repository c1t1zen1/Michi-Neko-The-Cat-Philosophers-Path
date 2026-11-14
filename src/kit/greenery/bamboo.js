// Bamboo groves (Phase 2 v-greenery): the Arashiyama grove with real culms.
// Lab 15 "nodes": every culm has swollen nodes, a dark ridge line and the pale
// waxy band just below it (classic: a plain six-sided cylinder). The culm
// builder is parametric (`culmGeometry`, `bambooGrove`) so glade-bamboo can
// reuse it. Bend and flutter stay in the vertex shader (zero per-frame JS but
// one uniform), exactly the classic maths, so layouts and sway match.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Tier knobs: lathe sides, node count along the 7 m unit culm, rings per node, leaves kept of 72, blade rows. */
export const BAMBOO_TIER = Object.freeze({
  hero: { radial: 6, nodes: 6, ring: 3, keep: 1, rows: 3 },
  mid: { radial: 4, nodes: 0, ring: 1, keep: 1 / 3, rows: 2 },
  far: { radial: 3, nodes: 0, ring: 1, keep: 1 / 8, rows: 2 }
});

const bell = (x, w) => Math.exp(-(x / w) * (x / w));

/**
 * A culm 7 units tall centred on the origin (the classic cylinder's frame),
 * radius rBot at the foot to rTop at the tip, with `nodes` internodes. Vertex
 * colour carries the node ridge (dark) and the waxy band below it (pale).
 */
export function culmGeometry(T, { rBot = 0.075, rTop = 0.065, radial = 8, nodes = 12, ring = 6, bulge = 0.1, length = 7 } = {}) {
  const prof = [], shade = [];
  const steps = Math.max(1, nodes * ring);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, f = nodes ? (t * nodes) % 1 : 0, d = Math.min(f, 1 - f);
    const nodeAt = nodes ? bell(d, 0.045) : 0;
    const r = (rBot + (rTop - rBot) * t) * (1 + bulge * nodeAt);
    prof.push(new T.Vector2(r, -length / 2 + t * length));
    const band = nodes && f > 0.8 && f < 1 ? bell(f - 0.92, 0.07) : 0;
    shade.push((1 - 0.6 * bell(d, 0.04)) * (1 + 0.38 * band));
  }
  const g = new T.LatheGeometry(prof, radial);
  const per = radial + 1, cols = new Float32Array(g.attributes.position.count * 3);
  for (let r = 0; r < prof.length; r++) for (let c = 0; c < per; c++) {
    const i = (r * per + c) * 3, v = shade[r];
    cols[i] = v; cols[i + 1] = v; cols[i + 2] = v * (1 + (v > 1 ? 0.1 : 0));
  }
  g.setAttribute('color', new T.BufferAttribute(cols, 3));
  return g;
}

/** The classic leaf card: a tapering blade ending in a single apex vertex. */
export function bladeGeometry(T, rows = 4, baseWidth = 0.048, height = 0.95, curveAmt = 0.32, taperPow = 1.35) {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i < rows; i++) {
    const t = i / rows, w = baseWidth * Math.pow(1.0 - t, taperPow), curve = t * t * curveAmt;
    positions.push(-w / 2, t * height, curve * 0.35, 0, t * height, curve, w / 2, t * height, curve * 0.35);
    uvs.push(0, t, 0.5, t, 1, t);
  }
  positions.push(0, height, curveAmt * 1.09);
  uvs.push(0.5, 1.0);
  for (let i = 0; i < rows - 1; i++) {
    const a = i * 3, b = (i + 1) * 3;
    indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const last = (rows - 1) * 3;
  indices.push(last, rows * 3, last + 1, last + 1, rows * 3, last + 2);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Bamboo materials with the culm bend + leaf flutter computed in the vertex
 * shader (the classic Vegetation.bambooSwayMaterial, ported). `time` is the
 * instance's own { value } uniform.
 */
export function bambooSwayMaterial(T, time, leaf, depth) {
  const mat = depth
    ? new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking })
    : leaf
      ? new T.MeshStandardMaterial({ color: 0x74a04a, roughness: 0.9, side: T.DoubleSide })
      : new T.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.6, vertexColors: true });
  const head = /* glsl */`
    uniform float uTime;
    attribute vec4 aPlant;
    ${leaf ? 'attribute vec4 aLeafA;\n      attribute vec4 aLeafB;' : 'attribute float aYaw;'}
    mat3 bEuler(vec3 r) {
      float cx = cos(r.x), sx = sin(r.x);
      float cy = cos(r.y), sy = sin(r.y);
      float cz = cos(r.z), sz = sin(r.z);
      return mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx)
           * mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy)
           * mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
    }
  `;
  let bend;
  if (leaf) {
    bend = /* glsl */`
      vec4 bP = aPlant;
      vec4 bA = aLeafA;
      vec4 bB = aLeafB;
      float bBx = cos(uTime * 0.62 + bP.w * 1.17) * 0.032;
      float bBz = sin(uTime * 0.75 + bP.w) * 0.085;
      float bH = bP.z * bA.y;
      float bStart = bP.z * 0.64;
      mat3 bRb = bEuler(vec3(bBx, bB.w, bBz));
      vec3 bBent = bRb * vec3(0.0, max(0.0, bH - bStart), 0.0);
      float bHW = smoothstep(0.45, 1.0, bA.y);
      mat3 bRl = bEuler(vec3(
        0.72 + cos(uTime * 0.62 + bA.w) * 0.06 * bHW,
        bA.x + 1.5707963,
        -0.95 + bBz * bHW + bB.z));
      vec3 transformed = vec3(
        bP.x + bBent.x + cos(bA.x) * bA.z,
        min(bH, bStart) + bBent.y,
        bP.y + bBent.z + sin(bA.x) * bA.z
      ) + bRl * (position * vec3(bB.y, bB.x, bB.y));
    `;
  } else {
    bend = /* glsl */`
      vec4 bP = aPlant;
      float bStart = bP.z * 0.64;
      float bH = bP.z - bStart;
      mat3 bR = bEuler(vec3(cos(uTime * 0.62 + bP.w * 1.17) * 0.032, aYaw, sin(uTime * 0.75 + bP.w) * 0.085));
      vec3 bC = bR * vec3(0.0, bH * 0.5, 0.0);
      vec3 transformed = vec3(bP.x + bC.x, bStart + bC.y, bP.y + bC.z)
        + bR * (position * vec3(1.0, bH / 7.0, 1.0));
    `;
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = head + shader.vertexShader
      .replace('#include <begin_vertex>', bend);
    if (!depth && !leaf) {
      // each culm a touch lighter or darker, from its sway phase
      shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>',
        '#include <color_vertex>\n#ifdef USE_COLOR\n vColor.rgb *= 0.88 + 0.24 * fract(aPlant.w * 7.31);\n#endif');
    }
    if (!depth) {
      // Rotate shading normals with the same bend so lighting follows.
      const norm = leaf ? /* glsl */`
        vec4 bNP = aPlant;
        vec4 bNA = aLeafA;
        vec4 bNB = aLeafB;
        float bNBx = cos(uTime * 0.62 + bNP.w * 1.17) * 0.032;
        float bNBz = sin(uTime * 0.75 + bNP.w) * 0.085;
        mat3 bNRl = bEuler(vec3(
          0.72 + cos(uTime * 0.62 + bNA.w) * 0.06 * smoothstep(0.45, 1.0, bNA.y),
          bNA.x + 1.5707963,
          -0.95 + bNBz * smoothstep(0.45, 1.0, bNA.y) + bNB.z));
        #include <beginnormal_vertex>
        objectNormal = bNRl * objectNormal;
      ` : /* glsl */`
        vec4 bNP = aPlant;
        mat3 bNR = bEuler(vec3(
          cos(uTime * 0.62 + bNP.w * 1.17) * 0.032,
          aYaw,
          sin(uTime * 0.75 + bNP.w) * 0.085));
        #include <beginnormal_vertex>
        objectNormal = bNR * objectNormal;
      `;
      shader.vertexShader = shader.vertexShader
        .replace('#include <beginnormal_vertex>', norm);
    }
  };
  mat.customProgramCacheKey = () => 'kit-bamboo-' + (leaf ? 'leaf' : 'stalk') + (depth ? '-depth' : '');
  return mat;

}

/* ------------------------------------------------------------------ grove --- */

// Seeded layout like the classic one (a sample for the contract test and the
// catalog; the real grove arrives from Vegetation.layoutBambooGrove).
export function sampleGrove(radius = 3, seed = 11) {
  let a = seed;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const count = Math.floor(radius * radius * 1.6), leavesPerStalk = 72;
  const plants = [], leafA = new Float32Array(count * leavesPerStalk * 4), leafB = new Float32Array(count * leavesPerStalk * 4), colliders = [];
  for (let i = 0; i < count; i++) {
    const ang = r() * Math.PI * 2, rr = Math.sqrt(r()) * radius, x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
    const k = plants.length, height = 5.6 + r() * 3.2, yaw = r() * Math.PI * 2, phase = r() * Math.PI * 2;
    plants.push({ x, z, height, yaw, phase });
    colliders.push({ x, z, r: 0.1 });
    for (let j = 0; j < leavesPerStalk; j++) {
      const li = k * leavesPerStalk + j;
      leafA.set([r() * Math.PI * 2, 0.22 + Math.pow(r(), 0.48) * 0.76, 0.18 + r() * 0.46, r() * Math.PI * 2], li * 4);
      leafB.set([0.48 + r() * 0.42, 0.78 + r() * 0.52, (r() - 0.5) * 0.38, yaw], li * 4);
    }
  }
  return { index: 0, x: 0, y: 0, z: 0, radius, corridors: [], capacity: count, leavesPerStalk, plants, leafA, leafB, band: 'near', footprint: { colliders } };
}

/**
 * Build a grove from a classic-shaped layout in the group's local frame (the
 * placing module moves the group to layout x/z, so culm positions are made
 * relative to it). Returns an AssetInstance.
 */
export function bambooGrove(ctx, L, p) {
  const { THREE: T, tier, kitMaterials: km } = ctx;
  const q = BAMBOO_TIER[tier] || BAMBOO_TIER.mid;
  const { plants, leavesPerStalk } = L;
  const ox = L.x || 0, oz = L.z || 0;
  const planted = plants.length;
  const time = { value: 0 };

  const lowerGeo = culmGeometry(T, { rBot: 0.075 * p.girth, rTop: 0.065 * p.girth, radial: q.radial, nodes: q.nodes, ring: q.ring });
  const upperGeo = new T.InstancedBufferGeometry().copy(culmGeometry(T, { rBot: 0.065 * p.girth, rTop: 0.05 * p.girth, radial: q.radial, nodes: q.nodes, ring: q.ring }));
  const blade = bladeGeometry(T, q.rows, 0.048 * p.leaf_width);
  const leafGeo = new T.InstancedBufferGeometry().copy(blade);

  // leaves kept at this tier (every j in a repeating stride; hero keeps all)
  const keepLeaf = (j) => Math.floor((j + 1) * q.keep) > Math.floor(j * q.keep);
  const keptJ = [];
  for (let j = 0; j < leavesPerStalk; j++) if (keepLeaf(j)) keptJ.push(j);
  const kept = keptJ;

  const plantArr = new Float32Array(Math.max(1, planted) * 4), yawArr = new Float32Array(Math.max(1, planted));
  const leafPlant = new Float32Array(Math.max(1, planted * kept.length) * 4);
  const leafA = new Float32Array(leafPlant.length), leafB = new Float32Array(leafPlant.length);
  const lower = new T.InstancedMesh(lowerGeo, km.bamboo({ color: 0xa9c06a, vcol: true, rough: 0.5 }) /* the fences family's args: one shared material */, Math.max(1, planted));
  const dummy = new T.Object3D(), col = new T.Color();
  plants.forEach(({ x, z, height, yaw, phase }, k) => {
    const lx = x - ox, lz = z - oz, h = height * p.height;
    plantArr.set([lx, lz, h, phase], k * 4);
    yawArr[k] = yaw;
    const bendStart = tier === 'far' ? h : h * 0.64;
    dummy.position.set(lx, bendStart / 2, lz);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, bendStart / 7, 1);
    dummy.updateMatrix();
    lower.setMatrixAt(k, dummy.matrix);
    const g = 0.88 + 0.24 * (((phase * 7.31) % 1 + 1) % 1);
    lower.setColorAt(k, col.setRGB(0.76 * g, 0.88 * g, 0.74 * g));   // pulls the fences' pale green toward the grove's
    kept.forEach((j, n) => {
      const li = k * leavesPerStalk + j, o = (k * kept.length + n) * 4;
      leafPlant.set([lx, lz, h, phase], o);
      for (let c = 0; c < 4; c++) { leafA[o + c] = L.leafA[li * 4 + c]; leafB[o + c] = L.leafB[li * 4 + c]; }
    });
  });
  lower.count = planted;
  lower.instanceMatrix.needsUpdate = true;
  if (lower.instanceColor) lower.instanceColor.needsUpdate = true;
  lower.castShadow = true;

  upperGeo.setAttribute('aPlant', new T.InstancedBufferAttribute(plantArr, 4));
  upperGeo.setAttribute('aYaw', new T.InstancedBufferAttribute(yawArr, 1));
  upperGeo.instanceCount = planted;
  leafGeo.setAttribute('aPlant', new T.InstancedBufferAttribute(leafPlant, 4));
  leafGeo.setAttribute('aLeafA', new T.InstancedBufferAttribute(leafA, 4));
  leafGeo.setAttribute('aLeafB', new T.InstancedBufferAttribute(leafB, 4));
  leafGeo.instanceCount = planted * kept.length;
  const sphere = new T.Sphere(new T.Vector3(0, 4.5, 0), (L.radius || 5) + 7);
  upperGeo.boundingSphere = sphere.clone();
  leafGeo.boundingSphere = sphere.clone();

  const mats = [bambooSwayMaterial(T, time, false, false), bambooSwayMaterial(T, time, true, false), bambooSwayMaterial(T, time, false, true), bambooSwayMaterial(T, time, true, true)];
  const far = tier === 'far';   // far: the whole culm is the static lower mesh; one sway material left
  const upper = far ? null : new T.Mesh(upperGeo, mats[0]);
  const leaves = new T.Mesh(leafGeo, mats[1]);
  leaves.castShadow = true;
  leaves.customDepthMaterial = mats[3];
  const group = new T.Group();
  group.add(lower, leaves);
  if (upper) { upper.castShadow = true; upper.customDepthMaterial = mats[2]; group.add(upper); }
  blade.dispose();
  return {
    group, parts: upper ? { lower_culms: lower, upper_culms: upper, leaves } : { lower_culms: lower, leaves }, sockets: {},
    live: upper ? [upper, leaves] : [leaves],
    update(dt, t) { time.value = t; },
    dispose() { lower.dispose(); for (const m of mats) m.dispose(); lowerGeo.dispose(); upperGeo.dispose(); leafGeo.dispose(); }
  };
}
