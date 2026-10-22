import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Shared painterly foliage system.
 *
 * Every leafy mass in the valley (sakura and maple canopies, garden pines,
 * street bushes, the edge forest and the foothill woods) draws through one
 * MeshStandardMaterial extension that adds:
 *   - lumpy, cauliflower-like tuft geometry with smooth normals
 *   - alpha-cut leaf-spray cards that fringe every clump with real leaves
 *   - a branching canopy builder (tapered curved limbs carrying dense
 *     clumps) so crowns read as leafy branches rather than smooth blobs
 *   - a top-lit crown gradient with cool blue-violet shadow sides
 *   - fine world-space mottling so large canopies never read as flat blobs
 *   - sun translucency (leaves glow when the sun is behind them)
 *   - wind sway with height weighting, plus a rustle when the cat brushes past
 * Colours come from vertex / instance colours so one material serves all.
 *
 * Two looks split the valley. Hero trees in the play field are individual
 * leaves on visible wood: buildCanopy's 'leaves' style (twig sprays from
 * leafSprayTexture, a branch-coherent `flex` wind shared with the bark via
 * createBranchMaterial). The rim — the edge-forest wall, the foothills, the
 * shrubs — is abstract: blob geometry painted with a leafMassTexture whose
 * `ragged` outline breaks into leaves (buildCanopy 'masses', bushGeometry).
 * The original 'clumps' style stays the default for the summit's trees.
 */

export const foliageUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.55, 0.28, -0.79) },
  uSunColor: { value: new THREE.Color(0xffe6b8) },
  uPlayerPos: { value: new THREE.Vector3(0, -100, 0) },
  uWindGlobal: { value: 1.0 }
};

function hash3(x, y, z) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647 ^ 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

/** 3D value noise in [0,1] for lumping tuft geometry. */
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * u;
  const x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * u;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * u;
  const x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

const tuftCache = new Map();

/**
 * Scalloped leaf-mass pillow: an icosphere displaced by a peaky low-
 * frequency lobe field so its silhouette breaks into a handful of
 * cauliflower puffs with real grooves between them — the way hand-painted
 * canopies build their masses — over finer grain. The underside is crushed
 * so a tuft reads as foliage hanging from a bough, not a ball.
 */
export function lumpyTuftGeometry(detail = 2, seed = 0, lump = 0.3) {
  const key = detail + '_' + seed + '_' + lump;
  if (tuftCache.has(key)) return tuftCache.get(key);
  let geo = new THREE.IcosahedronGeometry(1, detail);
  geo = mergeVertices(geo);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n1 = noise3(p.x * 1.5 + seed * 7.1, p.y * 1.5 + seed * 3.3, p.z * 1.5 + seed * 5.7);
    const n2 = noise3(p.x * 4.3 + seed, p.y * 4.3, p.z * 4.3 - seed);
    const n3 = noise3(p.x * 8.7 - seed * 2.0, p.y * 8.7 + seed, p.z * 8.7);
    // Peaky lobes: squaring the field sharpens the bulges and carves deep
    // creases where it dips, so light catches each puff separately.
    const lobe = Math.pow(n1, 1.7);
    const r = 1 + (lobe - 0.42) * 2 * lump * 0.95 + (n2 - 0.5) * lump * 0.55 + (n3 - 0.5) * lump * 0.28;
    // Pillow, not sphere: scallops droop on the underside, dome on top,
    // and the mass is a touch wider than it is deep.
    const squash = p.y < 0 ? 1 - (0.2 + 0.14 * lobe) * (-p.y) : 1;
    p.multiplyScalar(r);
    p.x *= 1.07;
    p.z *= 1.07;
    p.y = p.y * squash + (p.y >= 0 ? 0.16 : -0.05) * (lobe - 0.3);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  tuftCache.set(key, geo);
  return geo;
}

const GLSL_NOISE = /* glsl */`
  float folHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float folNoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(folHash(i), folHash(i + vec3(1, 0, 0)), f.x), mix(folHash(i + vec3(0, 1, 0)), folHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(folHash(i + vec3(0, 0, 1)), folHash(i + vec3(1, 0, 1)), f.x), mix(folHash(i + vec3(0, 1, 1)), folHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

/**
 * Branch-coherent wind for trees whose twigs show between the leaves.
 * `aWind.x` is a bend weight baked along the limb hierarchy (0 where the
 * limbs leave the trunk, 1 at the sprig tips) and `aWind.y` the tree's
 * phase. Twigs and the leaf sprays pinned to them share position, weight
 * and phase, so the same displacement moves both and no leaf ever slides
 * off its twig. Expects uTime / uWindAmp / uWindGlobal declared above it.
 */
const GLSL_FLEX_SWAY = /* glsl */`
  attribute vec2 aWind;
  vec3 folFlexSway(vec3 p, vec2 w, float amp) {
    float k = w.x * amp;
    float sx = sin(uTime * 0.85 + w.y) * 0.075 + sin(uTime * 2.3 + w.y * 1.7 + (p.x + p.z) * 1.4) * 0.024;
    float sz = cos(uTime * 0.72 + w.y * 1.4) * 0.05 + cos(uTime * 2.7 + w.y + (p.x - p.z) * 1.6) * 0.018;
    return vec3(sx, -abs(sx) * 0.25, sz) * k;
  }
`;
const GLSL_FLEX_UNIFORMS = /* glsl */`
  uniform float uTime;
  uniform float uWindAmp;
  uniform float uWindGlobal;
`;

/** Splice the flex sway into any material's vertex stage (bark, depth). */
function injectFlexSway(mat, wind, key) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = foliageUniforms.uTime;
    shader.uniforms.uWindGlobal = foliageUniforms.uWindGlobal;
    shader.uniforms.uWindAmp = { value: wind };
    shader.vertexShader = GLSL_FLEX_UNIFORMS + GLSL_FLEX_SWAY + shader.vertexShader
      .replace('#include <begin_vertex>', /* glsl */`
        #include <begin_vertex>
        transformed += folFlexSway(transformed, aWind, uWindAmp * uWindGlobal);
      `);
  };
  mat.customProgramCacheKey = () => key + '_' + wind;
  return mat;
}

/**
 * Bark for canopy limbs that sway with their leaves: a clone of `base` with
 * the flex wind spliced in. Geometry must carry `aWind` (buildCanopy's
 * 'leaves' style bakes it) and `wind` must match the leaf material's.
 */
export function createBranchMaterial(base, { wind = 1.0 } = {}) {
  return injectFlexSway(base.clone(), wind, 'foliage-branch');
}

/**
 * Every foliage material built so far, so a quality-tier change can
 * re-specialise them together.
 */
const foliageMaterials = [];
let foliageLowDetail = false;

/**
 * Build the shared foliage material. `sss` scales sun translucency,
 * `wind` scales canopy sway, `rustle` enables the cat-brush response.
 *
 * `flex` switches the sway to the branch-coherent wind above (geometry
 * must carry `aWind`). `twoSided` lights both faces of a double-sided card
 * with its own (crown-shaped) normal instead of flipping it, and lets sun
 * through to the shaded side, so a crown seen from below glows rather than
 * going dark. `massMap` (a leafMassTexture) paints leaves onto blob
 * geometry with a world-space triplanar projection, `massScale` tiles per
 * metre; `ragged` cuts the gaps between those leaves out where the surface
 * turns away from the eye, so blob outlines break into leaf edges.
 */
export function createFoliageMaterial({ sss = 0.32, wind = 1.0, rustle = 0.0, roughness = 0.92, mottle = 0.26, bump = 0.7, vertexColors = true, map = null, alphaTest = 0, side = THREE.FrontSide, flex = false, twoSided = false, massMap = null, massScale = 1, ragged = 0 } = {}) {
  // Instanced meshes colour through instanceColor and must NOT declare
  // vertexColors unless their geometry carries a colour attribute (a
  // missing attribute would read as black). Leaf cards pass an alpha-cut
  // `map` and render double-sided.
  const mat = new THREE.MeshStandardMaterial({ vertexColors, roughness, metalness: 0, envMapIntensity: 0.35, side });
  if (map) {
    mat.map = map;
    mat.alphaTest = alphaTest;
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = foliageUniforms.uTime;
    shader.uniforms.uSunDir = foliageUniforms.uSunDir;
    shader.uniforms.uSunColor = foliageUniforms.uSunColor;
    shader.uniforms.uPlayerPos = foliageUniforms.uPlayerPos;
    shader.uniforms.uWindGlobal = foliageUniforms.uWindGlobal;
    shader.uniforms.uSSS = { value: sss };
    shader.uniforms.uWindAmp = { value: wind };
    shader.uniforms.uRustle = { value: rustle };
    shader.uniforms.uMottle = { value: mottle };
    shader.uniforms.uBump = { value: bump };
    shader.uniforms.uMassMap = { value: massMap };
    shader.uniforms.uMassScale = { value: massScale };
    shader.uniforms.uRagged = { value: ragged };

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindAmp;
      uniform float uWindGlobal;
      uniform float uRustle;
      uniform vec3 uPlayerPos;
      varying vec3 vFolWorld;
      varying float vFolTop;
      #ifdef FOL_FLEX
        ${GLSL_FLEX_SWAY}
      #endif
      #ifdef FOL_MASS
        varying vec3 vFolN;
      #endif
    ` + shader.vertexShader
      .replace('#include <begin_vertex>', /* glsl */`
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 folWorld = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
          vec4 folCentre = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #else
          vec4 folWorld = modelMatrix * vec4(transformed, 1.0);
          vec4 folCentre = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #endif
        #ifdef FOL_MASS
          // World normal for the triplanar leaf projection (rest pose)
          #ifdef USE_INSTANCING
            vFolN = mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal;
          #else
            vFolN = mat3(modelMatrix) * objectNormal;
          #endif
        #endif
        // Whole-crown sway plus a faster leaf flutter, weighted toward the top
        float folPhase = folCentre.x * 0.31 + folCentre.z * 0.23;
        float folH = clamp(transformed.y * 0.5 + 0.5, 0.0, 1.0);
        float folWind = uWindAmp * uWindGlobal;
        #ifdef FOL_FLEX
          transformed += folFlexSway(transformed, aWind, folWind);
        #else
          float folSway = (sin(uTime * 0.85 + folPhase) * 0.05 + sin(uTime * 2.4 + folPhase * 2.3 + transformed.x * 2.0) * 0.018) * folWind;
          transformed.x += folSway * folH;
          transformed.z += cos(uTime * 0.72 + folPhase * 1.4) * 0.035 * folWind * folH;
        #endif
        // Rustle when the cat pushes through a bush
        if (uRustle > 0.0) {
          vec2 folAway = folWorld.xz - uPlayerPos.xz;
          float folD = length(folAway);
          float folPush = smoothstep(1.7, 0.2, folD) * uRustle;
          if (folPush > 0.001) {
            vec2 folDir = folD > 0.001 ? folAway / folD : vec2(0.0, 1.0);
            float jitter = sin(uTime * 14.0 + folWorld.x * 9.0) * 0.05;
            transformed.x += folDir.x * folPush * (0.22 + jitter) * folH;
            transformed.z += folDir.y * folPush * (0.22 + jitter) * folH;
            transformed.y -= folPush * 0.08 * folH;
          }
        }
        vFolWorld = folWorld.xyz;
        vFolTop = folH;
      `);

    shader.fragmentShader = `
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uSSS;
      uniform float uMottle;
      uniform float uBump;
      varying vec3 vFolWorld;
      varying float vFolTop;
      #ifdef FOL_MASS
        uniform sampler2D uMassMap;
        uniform float uMassScale;
        uniform float uRagged;
        varying vec3 vFolN;
      #endif
      ${GLSL_NOISE}
    ` + shader.fragmentShader
      .replace('#include <normal_fragment_begin>', /* glsl */`
        #include <normal_fragment_begin>
        #if defined(FOL_TWOSIDE) && defined(DOUBLE_SIDED)
          // Undo the back-face flip: both faces share the crown normal
          normal *= faceDirection;
        #endif
        {
          // Leaf-clump relief: jitter the shading normal with world-space noise
          // so light breaks into hundreds of small facets across the canopy.
          // The fine octave is the expensive half (three more noise lookups
          // per fragment) and the one that stops resolving first at distance,
          // so the low tier drops it — see FOL_LOW in setFoliageDetail().
          // Leaf-mass blobs get their fine relief from the painted leaves.
          vec3 fw = vFolWorld * 3.2;
          vec3 folBump = vec3(folNoise(fw + 1.7), folNoise(fw + 9.1), folNoise(fw + 17.3)) - 0.5;
          #if !defined(FOL_LOW) && !defined(FOL_MASS)
            vec3 fw2 = vFolWorld * 9.5;
            folBump += (vec3(folNoise(fw2 + 3.3), folNoise(fw2 + 5.9), folNoise(fw2 + 12.7)) - 0.5) * 0.5;
          #endif
          #ifdef FOL_MASS
            // Every painted leaf carries its own tilt (G/B), so each one
            // catches the light on its own instead of following the blob.
            folBump += (vec3(0.0, fmX.b, fmX.g) - vec3(0.0, 0.5, 0.5)) * fmW.x * 2.4;
            folBump += (vec3(fmY.g, 0.0, fmY.b) - vec3(0.5, 0.0, 0.5)) * fmW.y * 2.4;
            folBump += (vec3(fmZ.g, fmZ.b, 0.0) - vec3(0.5, 0.5, 0.0)) * fmW.z * 2.4;
          #endif
          normal = normalize(normal + (viewMatrix * vec4(folBump, 0.0)).xyz * uBump);
        }
      `)
      .replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        #ifdef FOL_MASS
          // Painted leaf mass, projected along whichever world axis the
          // surface faces most (sharp blend so leaves never smear).
          vec3 fmW = abs(normalize(vFolN));
          fmW *= fmW;
          fmW *= fmW;
          fmW /= fmW.x + fmW.y + fmW.z;
          vec3 fmP = vFolWorld * uMassScale;
          vec4 fmX = texture2D(uMassMap, fmP.zy);
          vec4 fmY = texture2D(uMassMap, fmP.xz);
          vec4 fmZ = texture2D(uMassMap, fmP.xy);
          vec4 fmT = fmX * fmW.x + fmY * fmW.y + fmZ * fmW.z;
          #ifdef FOL_RAGGED
            // Toward the silhouette the gaps between leaves open up, deepest
            // leaves first, so the outline is leaves rather than a curve.
            float fmRim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
            if (fmT.a < smoothstep(0.25, 0.85, fmRim) * uRagged) discard;
          #endif
          // Lit leaf faces over shadowed gaps between them, balanced so the
          // mass keeps roughly its base tone on average
          diffuseColor.rgb *= 0.45 + fmT.r * 1.25;
        #endif
        // Painterly mottling: broad patches, leaf clumps and fine speckle so a
        // canopy reads as thousands of leaves rather than one smooth mass.
        // Dropping the fine speckle on the low tier redistributes its weight
        // across the two that remain, so the average tone is unchanged and
        // only the finest grain goes. Leaf-mass blobs take their fine grain
        // from the painted leaves instead.
        #if defined(FOL_LOW) || defined(FOL_MASS)
          float folM = folNoise(vFolWorld * 0.55) * 0.53 + folNoise(vFolWorld * 2.1) * 0.47;
        #else
          float folM = folNoise(vFolWorld * 0.55) * 0.4 + folNoise(vFolWorld * 2.1) * 0.35 + folNoise(vFolWorld * 6.5) * 0.25;
        #endif
        diffuseColor.rgb *= 1.0 - uMottle + folM * uMottle * 2.0;
        // Dark crevices between clumps
        float folCrevice = smoothstep(0.62, 0.3, folNoise(vFolWorld * 1.6 + 11.0));
        diffuseColor.rgb *= 1.0 - folCrevice * 0.38;
        // Top-lit crown gradient, cool violet-tinged undersides
        vec3 folUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        float folUpness = dot(normalize(vNormal), folUp) * 0.5 + 0.5;
        float folCrown = folUpness * 0.55 + vFolTop * 0.45;
        diffuseColor.rgb *= 0.72 + folCrown * 0.42;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.68, 0.78, 1.1), (1.0 - folCrown) * 0.5);
      `)
      .replace('#include <opaque_fragment>', /* glsl */`
        {
          // Sun translucency: leaves between the eye and the sun glow through
          vec3 folSunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
          vec3 folToCam = normalize(vViewPosition);
          float folBack = pow(clamp(dot(-folToCam, folSunV), 0.0, 1.0), 3.5);
          float folRim = pow(1.0 - abs(dot(folToCam, normalize(vNormal))), 1.6);
          outgoingLight += diffuseColor.rgb * uSunColor * folBack * (0.35 + folRim * 0.9) * uSSS;
          // Faint warm rim from the sun-side even when front-lit
          float folSunSide = clamp(dot(normalize(vNormal), folSunV), 0.0, 1.0);
          outgoingLight += diffuseColor.rgb * uSunColor * folRim * folSunSide * uSSS * 0.35;
          #ifdef FOL_TWOSIDE
            // Sun filtering through the leaves to the crown's shaded side
            float folThrough = clamp(-dot(normal, folSunV), 0.0, 1.0);
            outgoingLight += diffuseColor.rgb * uSunColor * (0.25 + folThrough * 0.75) * uSSS * 0.6;
          #endif
        }
        #include <opaque_fragment>
      `);
  };
  // Detail level rides in a #define, so the low tier genuinely skips the
  // noise lookups instead of multiplying their result by zero. It has to be
  // part of the cache key or three would hand back the other variant's
  // compiled program.
  mat.defines = mat.defines || {};
  if (foliageLowDetail) mat.defines.FOL_LOW = '';
  if (flex) mat.defines.FOL_FLEX = '';
  if (twoSided) mat.defines.FOL_TWOSIDE = '';
  if (massMap) mat.defines.FOL_MASS = '';
  if (massMap && ragged > 0) mat.defines.FOL_RAGGED = '';
  mat.customProgramCacheKey = () => 'foliage_' + sss + '_' + wind + '_' + rustle + '_' + mottle + '_' + bump + '_' + (vertexColors ? 'vc' : 'ic') + (map ? '_map' : '') +
    (flex ? '_flex' : '') + (twoSided ? '_2s' : '') + (massMap ? '_mass' + massScale + '_' + ragged : '') + (mat.defines.FOL_LOW !== undefined ? '_lod' : '');
  foliageMaterials.push(mat);
  return mat;
}

/**
 * Quality-tier lever: drop the fine bump octave and the fine mottle octave
 * on the low tier. The canopy shader runs ten world-space noise lookups per
 * fragment across every leaf, bush and forest pixel in the valley; this
 * takes that to six. Both dropped octaves are the highest-frequency detail,
 * which is the first thing a phone screen stops resolving anyway.
 */
export function setFoliageDetail(low) {
  if (foliageLowDetail === low) return;
  foliageLowDetail = low;
  for (const mat of foliageMaterials) {
    if (low) mat.defines.FOL_LOW = '';
    else delete mat.defines.FOL_LOW;
    mat.needsUpdate = true;
  }
}

/**
 * Shadow-map depth material that honours a leaf card's alpha cut-out.
 * With `flex` it also runs the branch-coherent wind (same `wind` as the
 * lit material), so leaf and twig shadows sway with the canopy.
 */
export function createFoliageDepthMaterial(map, alphaTest = 0.5, { flex = false, wind = 1.0 } = {}) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest, side: THREE.DoubleSide });
  return flex ? injectFlexSway(mat, wind, 'foliage-depth' + (map ? '-map' : '')) : mat;
}

/* ------------------------------------------------------------------ */
/*  Leaf-spray cards                                                   */
/* ------------------------------------------------------------------ */

const cardTexCache = new Map();

/**
 * Procedural leaf-spray textures for alpha-cut foliage cards, painted in
 * pale greys (blossoms in cream) so the vertex tint supplies the hue and
 * the same painterly crown gradient applies. Kinds: broadleaf, maple,
 * sakura, needle.
 */
export function leafCardTexture(kind = 'broadleaf') {
  if (cardTexCache.has(kind)) return cardTexCache.get(kind);
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  let s = 4241 + kind.length * 977;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const grey = (v) => `rgb(${v | 0},${v | 0},${v | 0})`;
  const cx = size / 2, cy = size / 2;

  const leaf = (x, y, ang, len, wid, shade) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, grey(shade * 0.66));
    g.addColorStop(0.5, grey(shade * 0.9));
    g.addColorStop(1, grey(shade));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.42, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.42, wid, 0, 0);
    ctx.fill();
    ctx.strokeStyle = `rgba(${shade * 0.5 | 0},${shade * 0.5 | 0},${shade * 0.5 | 0},0.65)`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.9, 0);
    ctx.stroke();
    // Fine side veins branching off the midrib for real leaf texture
    ctx.strokeStyle = `rgba(${shade * 0.55 | 0},${shade * 0.55 | 0},${shade * 0.55 | 0},0.4)`;
    ctx.lineWidth = 0.7;
    for (let vk = 1; vk < 5; vk++) {
      const vt = vk / 5;
      const vx = len * 0.82 * vt;
      const vy = wid * Math.sin(vt * Math.PI) * 0.78;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx + len * 0.05, vy);
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx + len * 0.05, -vy);
      ctx.stroke();
    }
    ctx.restore();
  };
  const maple = (x, y, ang, r, shade) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    g.addColorStop(0, grey(shade * 0.72));
    g.addColorStop(1, grey(shade));
    ctx.fillStyle = g;
    ctx.beginPath();
    const lobes = 5;
    for (let i = 0; i < lobes * 2; i++) {
      const a = (i / (lobes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${shade * 0.5 | 0},${shade * 0.5 | 0},${shade * 0.5 | 0},0.5)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.stroke();
      // Fine offshoot veinlets along each lobe rib
      ctx.lineWidth = 0.5;
      for (const vt of [0.4, 0.65]) {
        const bx = Math.cos(a) * r * 0.85 * vt, by = Math.sin(a) * r * 0.85 * vt;
        const perp = a + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(perp) * r * 0.12, by + Math.sin(perp) * r * 0.12);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - Math.cos(perp) * r * 0.12, by - Math.sin(perp) * r * 0.12);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
    ctx.restore();
  };
  const blossom = (x, y, r, shade) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * Math.PI * 2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const g = ctx.createRadialGradient(0, 0, r * 0.15, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.75);
      g.addColorStop(0, grey(shade * 0.84));
      g.addColorStop(1, grey(shade));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, r * 0.34, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = grey(shade * 0.62);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const whorl = (x, y, ang, shade) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = (rnd() - 0.5) * 1.9;
      const len = 34 + rnd() * 38;
      ctx.strokeStyle = grey(shade * (0.7 + rnd() * 0.3));
      ctx.lineWidth = 2.2 + rnd() * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  };

  if (kind === 'maple') {
    for (let i = 0; i < 11; i++) {
      const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.6) * 70;
      maple(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd() * Math.PI * 2, 30 + rnd() * 16, 175 + rnd() * 80);
    }
  } else if (kind === 'sakura') {
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.55) * 82;
      blossom(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 15 + rnd() * 10, 200 + rnd() * 55);
    }
    // Tight buds between the open flowers
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * 95;
      ctx.fillStyle = grey(150 + rnd() * 40);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4 + rnd() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'needle') {
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.7) * 60;
      whorl(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd() * Math.PI * 2, 170 + rnd() * 85);
    }
  } else {
    // Broadleaf spray: big leaves radiating from the centre, smaller ones on top
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rnd() * 0.6;
      const bx = cx + (rnd() - 0.5) * 50, by = cy + (rnd() - 0.5) * 50;
      leaf(bx, by, a, 58 + rnd() * 40, 13 + rnd() * 9, 165 + rnd() * 75);
    }
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2;
      leaf(cx + (rnd() - 0.5) * 70, cy + (rnd() - 0.5) * 70, a, 34 + rnd() * 26, 9 + rnd() * 6, 200 + rnd() * 55);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cardTexCache.set(kind, tex);
  return tex;
}

let cardGeo = null;
/** Unit leaf card: a 1×1 quad with a shallow centre crease so sprays catch light from the side. */
export function leafCardGeometry() {
  if (cardGeo) return cardGeo;
  const geo = new THREE.PlaneGeometry(1, 1, 2, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getX(i)) < 0.01) pos.setZ(i, 0.09);
  geo.computeVertexNormals();
  cardGeo = geo;
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Twig sprays (the 'leaves' canopy style)                            */
/* ------------------------------------------------------------------ */

/**
 * Mip chain for an alpha-cut canvas that keeps its coverage: each level is
 * downsampled from the original and its alpha rescaled until as many texels
 * pass the cut-off as at full size. Plain mipmaps average the gaps between
 * leaves into the leaves, so sprays thin out and vanish with distance.
 */
function coverageMips(src, cutoff = 0.5) {
  const cut = cutoff * 255;
  const covered = (d, s) => {
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] * s > cut) n++;
    return n / (d.length / 4);
  };
  const base = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  const target = covered(base, 1);
  const levels = [src];
  for (let size = src.width >> 1; size >= 1; size >>= 1) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    let lo = 1, hi = 6;
    for (let it = 0; it < 14; it++) {
      const mid = (lo + hi) / 2;
      if (covered(d, mid) < target) lo = mid; else hi = mid;
    }
    for (let i = 3; i < d.length; i += 4) d[i] = Math.min(255, d[i] * hi);
    ctx.putImageData(img, 0, 0);
    levels.push(c);
  }
  return levels;
}

const sprayTexCache = new Map();

/**
 * Leaf sprays for the 'leaves' canopy style: a twiglet rooted at the bottom
 * centre of the card carrying individual leaves, so a card pinned to a twig
 * reads as that twig's own leaves. Painted in greys (the vertex tint brings
 * the hue). Kinds: sakura (umbels of notched five-petal blossoms and buds),
 * maple (seven-lobed palmate leaves on petioles), broadleaf (alternate
 * leaves with a terminal leaf), needle (pine fascicles).
 */
export function leafSprayTexture(kind = 'broadleaf') {
  if (sprayTexCache.has(kind)) return sprayTexCache.get(kind);
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  let s = 7919 + kind.length * 613;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const grey = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Stem: a tapered quadratic from the card's root up to `tip`.
  const stem = (x0, y0, cx, cy, x1, y1, w0, w1, shade) => {
    const pt = (t) => {
      const u = 1 - t;
      return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
    };
    const steps = 14;
    ctx.strokeStyle = grey(shade);
    for (let i = 0; i < steps; i++) {
      const a = pt(i / steps), b = pt((i + 1) / steps);
      ctx.lineWidth = w0 + (w1 - w0) * (i / steps);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    return (t) => {
      const p = pt(t), q = pt(Math.min(1, t + 0.02)), r = pt(Math.max(0, t - 0.02));
      return { x: p[0], y: p[1], ang: Math.atan2(q[1] - r[1], q[0] - r[0]) };
    };
  };
  const line = (x0, y0, x1, y1, w, shade) => {
    ctx.strokeStyle = grey(shade);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  // Lanceolate leaf along +x from its base, outlined so overlapping leaves
  // stay separate, with a midrib and paired side veins.
  const leaf = (x, y, ang, len, wid, shade) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, grey(shade * 0.62));
    g.addColorStop(0.45, grey(shade * 0.92));
    g.addColorStop(1, grey(shade));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -wid * 1.05, len * 0.7, -wid * 0.8, len, 0);
    ctx.bezierCurveTo(len * 0.7, wid * 0.8, len * 0.25, wid * 1.05, 0, 0);
    ctx.fill();
    ctx.strokeStyle = grey(shade * 0.42, 0.75);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.strokeStyle = grey(shade * 0.55, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.92, 0);
    ctx.stroke();
    ctx.lineWidth = 0.6;
    for (let k = 1; k < 6; k++) {
      const vx = len * k / 6.5;
      const vy = wid * Math.sin((k / 6) * Math.PI) * 0.72;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx + len * 0.07, -vy);
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx + len * 0.07, vy);
      ctx.stroke();
    }
    ctx.restore();
  };
  // Acer palmatum leaf: seven slender, finely toothed lobes fanned away
  // from the petiole, the middle lobe longest.
  const palmate = (x, y, ang, r, shade) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const lobes = 7;
    const g = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r);
    g.addColorStop(0, grey(shade * 0.66));
    g.addColorStop(1, grey(shade));
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < lobes; i++) {
      const a = -2.25 + (i / (lobes - 1)) * 4.5;
      const len = r * (1 - Math.pow(Math.abs(a) / 2.25, 2) * 0.42);
      const half = 0.24;
      const sinus = r * 0.28;
      if (i === 0) ctx.moveTo(Math.cos(a - half) * sinus, Math.sin(a - half) * sinus);
      // Toothed outer edge running up to the lobe tip and back down
      const teeth = 4;
      for (let k = 1; k <= teeth; k++) {
        const t = k / teeth;
        const rr = sinus + (len - sinus) * t;
        const aa = a - half * (1 - t) * 1.15 - (k % 2 ? 0.035 : 0);
        ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
      }
      for (let k = teeth - 1; k >= 0; k--) {
        const t = k / teeth;
        const rr = sinus + (len - sinus) * t;
        const aa = a + half * (1 - t) * 1.15 + (k % 2 ? 0.035 : 0);
        ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = grey(shade * 0.45, 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = grey(shade * 0.55, 0.6);
    ctx.lineWidth = 0.9;
    for (let i = 0; i < lobes; i++) {
      const a = -2.25 + (i / (lobes - 1)) * 4.5;
      const len = r * (1 - Math.pow(Math.abs(a) / 2.25, 2) * 0.42);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len * 0.88, Math.sin(a) * len * 0.88);
      ctx.stroke();
    }
    ctx.restore();
  };
  // Somei-yoshino blossom: five petals, each with the notch at its tip that
  // makes a cherry blossom a cherry blossom, a deeper eye and stamens.
  // `tilt` squashes it for flowers seen side-on.
  const blossom = (x, y, r, shade, tilt) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * Math.PI * 2);
    ctx.scale(1, tilt);
    for (let p = 0; p < 5; p++) {
      ctx.save();
      ctx.rotate((p / 5) * Math.PI * 2);
      const g = ctx.createLinearGradient(0, 0, 0, r);
      g.addColorStop(0, grey(shade * 0.86));
      g.addColorStop(0.45, grey(shade * 0.98));
      g.addColorStop(1, grey(shade));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-r * 0.52, r * 0.22, -r * 0.62, r * 0.86, -r * 0.18, r);
      ctx.lineTo(0, r * 0.84);
      ctx.lineTo(r * 0.18, r);
      ctx.bezierCurveTo(r * 0.62, r * 0.86, r * 0.52, r * 0.22, 0, 0);
      ctx.fill();
      ctx.strokeStyle = grey(shade * 0.82, 0.45);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
    // A small blushing eye and a few stamens; kept light so a cluster
    // reads as pale petals, not as a field of dark dots.
    ctx.fillStyle = grey(shade * 0.74);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = grey(shade * 0.7, 0.6);
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rnd() * 0.3;
      const l = r * (0.32 + rnd() * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l);
      ctx.stroke();
      ctx.fillStyle = grey(shade * 0.95);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * l, Math.sin(a) * l, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  const fascicle = (x, y, ang, spread, n, len, shade) => {
    for (let i = 0; i < n; i++) {
      const a = ang + (rnd() - 0.5) * spread;
      const l = len * (0.6 + rnd() * 0.4);
      line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 2 + rnd() * 1.3, shade * (0.68 + rnd() * 0.32));
    }
  };

  const rootX = size / 2, rootY = size - 3;
  if (kind === 'sakura') {
    // A short dark spur with umbels of blossoms splaying up and out on
    // long pedicels, so each card reads as one rounded cluster of flowers;
    // the odd unopened bud among them.
    const at = stem(rootX, rootY, rootX + (rnd() - 0.5) * 30, 196, rootX + (rnd() - 0.5) * 30, 128, 5, 2.6, 72);
    for (const [t, n, reach] of [[0.4, 3, 30], [0.72, 4, 40], [1.0, 6, 52]]) {
      const node = at(t);
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + ((k + 0.5) / n - 0.5) * (1.6 + t * 1.2) + (rnd() - 0.5) * 0.35;
        const l = reach * (0.6 + rnd() * 0.5);
        const bx = node.x + Math.cos(a) * l, by = node.y + Math.sin(a) * l;
        line(node.x, node.y, bx, by, 1.4, 150);
        if (rnd() < 0.12) {
          ctx.fillStyle = grey(176);
          ctx.beginPath();
          ctx.ellipse(bx, by, 5, 7.5, a + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          blossom(bx, by, 20 + rnd() * 7, 234 + rnd() * 21, 0.6 + rnd() * 0.4);
        }
      }
    }
  } else if (kind === 'maple') {
    const tipX = rootX + (rnd() - 0.5) * 30;
    const at = stem(rootX, rootY, rootX + (rnd() - 0.5) * 36, 170, tipX, 92, 4, 1.8, 92);
    for (const [t, side] of [[0.38, -1], [0.62, 1], [0.84, -1], [1.0, 0]]) {
      const node = at(t);
      const a = node.ang + side * (0.75 + rnd() * 0.4);
      const l = 16 + rnd() * 16;
      const r = 34 + rnd() * 10;
      const px = node.x + Math.cos(a) * l, py = node.y + Math.sin(a) * l;
      line(node.x, node.y, px, py, 1.4, 110);
      palmate(px + Math.cos(a) * r * 0.1, py + Math.sin(a) * r * 0.1, a, r, 180 + rnd() * 75);
    }
  } else if (kind === 'needle') {
    // A pine tuft: a fan of short shoots from one spur, each bristling with
    // needle bundles and ending in a candle burst, so a card is a dense
    // half-dome of needles and a pad of them reads as a needle cushion.
    const shoots = 5;
    for (let k = 0; k < shoots; k++) {
      const a = -Math.PI / 2 + ((k + 0.5) / shoots - 0.5) * 2.2 + (rnd() - 0.5) * 0.2;
      const len = 120 + rnd() * 70 - Math.abs(k - (shoots - 1) / 2) * 18;
      const ex = rootX + Math.cos(a) * len, ey = rootY + Math.sin(a) * len;
      const at = stem(rootX, rootY, rootX + Math.cos(a) * len * 0.5 + (rnd() - 0.5) * 16, rootY + Math.sin(a) * len * 0.5, ex, ey, 4, 2, 80);
      for (const t of [0.3, 0.45, 0.6, 0.75, 0.88]) {
        const node = at(t);
        fascicle(node.x, node.y, node.ang, 2.2, 12, 26 + t * 16, 222);
      }
      const tip = at(1);
      fascicle(tip.x, tip.y, tip.ang, 2.8, 18, 40, 242);
    }
  } else {
    const tipX = rootX + (rnd() - 0.5) * 30;
    const at = stem(rootX, rootY, rootX + (rnd() - 0.5) * 40, 140, tipX, 40, 3.5, 1.4, 88);
    for (let k = 0; k < 7; k++) {
      const t = 0.2 + k * 0.115;
      const node = at(t);
      const side = k % 2 ? 1 : -1;
      const len = 66 - k * 4 + rnd() * 10;
      leaf(node.x, node.y, node.ang + side * (0.62 + rnd() * 0.3), len, len * (0.3 + rnd() * 0.08), 175 + rnd() * 75);
    }
    const tip = at(1);
    leaf(tip.x, tip.y, tip.ang, 48, 16, 235);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.mipmaps = coverageMips(c, 0.5);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  sprayTexCache.set(kind, tex);
  return tex;
}

let sprayGeo = null;
/**
 * Unit spray card rooted at the origin: x ∈ [-½, ½], y ∈ [0, 1] along the
 * twiglet, +z the face. The spine is raised, the leaves fall away either
 * side of it and the tip arches down under its own weight.
 */
export function sprayCardGeometry() {
  if (sprayGeo) return sprayGeo;
  const geo = new THREE.PlaneGeometry(1, 1, 2, 2);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, (Math.abs(x) < 0.01 ? 0.07 : -0.03) - y * y * 0.16);
  }
  geo.computeVertexNormals();
  sprayGeo = geo;
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Leaf-mass textures (blob canopies and bushes)                      */
/* ------------------------------------------------------------------ */

const massTexCache = new Map();

/**
 * Tileable painted leaf mass for blob foliage, drawn as hundreds of
 * overlapping leaves (deep, dim ones first; bright outer ones on top).
 * Channels: R leaf shading (0 in the gaps), G/B each leaf's own normal
 * tilt, A coverage, which the foliage shader's `ragged` rim cut reads.
 * Kinds: leaf, blossom, needle. A DataTexture, so the gap colours survive
 * (a canvas would premultiply them away).
 */
export function leafMassTexture(kind = 'leaf') {
  if (massTexCache.has(kind)) return massTexCache.get(kind);
  const size = 256;
  const layer = (fill) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.fillStyle = fill;
    x.fillRect(0, 0, size, size);
    x.lineCap = 'round';
    return x;
  };
  const shade = layer('#000');
  const tilt = layer('rgb(128,128,128)');
  const cover = layer('#000');
  let s = 2621 + kind.length * 389;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const grey = (v) => `rgb(${v | 0},${v | 0},${v | 0})`;

  // Paint one shape into all three layers, wrapped across the tile edges.
  const stamp = (x, y, reach, draw) => {
    const tx = 128 + (rnd() - 0.5) * 190, ty = 128 + (rnd() - 0.5) * 190;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        if (x + ox < -reach || x + ox > size + reach || y + oy < -reach || y + oy > size + reach) continue;
        draw(shade, x + ox, y + oy, 'shade');
        tilt.fillStyle = tilt.strokeStyle = `rgb(${tx | 0},${ty | 0},128)`;
        draw(tilt, x + ox, y + oy, 'tilt');
        draw(cover, x + ox, y + oy, 'cover');
      }
    }
  };

  const count = kind === 'blossom' ? 420 : kind === 'needle' ? 260 : 520;
  for (let i = 0; i < count; i++) {
    const depth = i / count;
    const x = rnd() * size, y = rnd() * size;
    const lit = (0.38 + depth * 0.62) * (0.82 + rnd() * 0.18);
    const cov = 0.4 + depth * 0.6;
    const ang = rnd() * Math.PI * 2;
    if (kind === 'blossom') {
      const r = 7 + rnd() * 5, sq = 0.6 + rnd() * 0.4;
      stamp(x, y, r, (ctx, px, py, pass) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.scale(1, sq);
        if (pass === 'shade') ctx.fillStyle = grey(255 * lit);
        if (pass === 'cover') ctx.fillStyle = grey(255 * cov);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.52, r * 0.36, a, 0, Math.PI * 2);
          ctx.fill();
        }
        if (pass === 'shade') {
          ctx.fillStyle = grey(255 * lit * 0.55);
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    } else if (kind === 'needle') {
      const n = 12, len = 16 + rnd() * 12;
      stamp(x, y, len, (ctx, px, py, pass) => {
        for (let k = 0; k < n; k++) {
          const a = ang + ((k / (n - 1)) - 0.5) * 1.9;
          if (pass === 'shade') ctx.strokeStyle = grey(255 * lit * (0.75 + (k % 3) * 0.1));
          if (pass === 'cover') ctx.strokeStyle = grey(255 * cov);
          ctx.lineWidth = pass === 'cover' ? 3.2 : 2.2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
          ctx.stroke();
        }
      });
    } else {
      const len = 20 + rnd() * 12, wid = len * (0.32 + rnd() * 0.1);
      stamp(x, y, len, (ctx, px, py, pass) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.25, -wid * 1.05, len * 0.7, -wid * 0.8, len, 0);
        ctx.bezierCurveTo(len * 0.7, wid * 0.8, len * 0.25, wid * 1.05, 0, 0);
        if (pass === 'shade') {
          const g = ctx.createLinearGradient(0, 0, len, 0);
          g.addColorStop(0, grey(255 * lit * 0.62));
          g.addColorStop(0.5, grey(255 * lit));
          g.addColorStop(1, grey(255 * lit * 0.9));
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = grey(255 * lit * 0.35);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.strokeStyle = grey(255 * lit * 0.6);
          ctx.beginPath();
          ctx.moveTo(1, 0);
          ctx.lineTo(len * 0.88, 0);
          ctx.stroke();
        } else if (pass === 'cover') {
          const g = ctx.createRadialGradient(len * 0.45, 0, 0, len * 0.45, 0, len * 0.55);
          g.addColorStop(0, grey(255 * cov));
          g.addColorStop(1, grey(255 * cov * 0.55));
          ctx.fillStyle = g;
          ctx.fill();
        } else {
          ctx.fill();
        }
        ctx.restore();
      });
    }
  }

  const S = shade.getImageData(0, 0, size, size).data;
  const T = tilt.getImageData(0, 0, size, size).data;
  const C = cover.getImageData(0, 0, size, size).data;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = S[i * 4];
    data[i * 4 + 1] = T[i * 4];
    data[i * 4 + 2] = T[i * 4 + 1];
    data[i * 4 + 3] = C[i * 4];
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  massTexCache.set(kind, tex);
  return tex;
}

/**
 * Lumpy cedar/cypress silhouette for distant hillside forests: a noise-
 * pushed icosphere stretched tall and tapered to a tip.
 */
const coneCache = new Map();
export function lumpyConeGeometry(detail = 1, seed = 0, lump = 0.3) {
  const key = detail + '_' + seed + '_' + lump;
  if (coneCache.has(key)) return coneCache.get(key);
  const geo = lumpyTuftGeometry(detail, seed, lump).clone();
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp((p.y + 1) * 0.5, 0, 1);
    const taper = 1.05 - t * 0.78;
    pos.setXYZ(i, p.x * taper, p.y * 1.9 + 0.9, p.z * taper);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  coneCache.set(key, geo);
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Branching canopy builder                                           */
/* ------------------------------------------------------------------ */

/** Tube along `curve` whose radius tapers from r0 to r1. */
function taperedTube(curve, r0, r1, segs = 6, radial = 6) {
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position;
  const ring = radial + 1;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let j = 0; j <= segs; j++) {
    const t = j / segs;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let i = 0; i < ring; i++) {
      const idx = j * ring + i;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function bakeColor(geo, color) {
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    col[v * 3] = color.r; col[v * 3 + 1] = color.g; col[v * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/**
 * Build a canopy in tree-local space (trunk base at the origin, everything
 * already multiplied by `scale`). Three styles:
 *
 *   'clumps' (default) — leaf clumps of lumpy tuft cores fringed with
 *       alpha-cut leaf-spray cards (see buildClumpCanopy).
 *   'leaves' — hero trees: a deep twig skeleton carrying only individual
 *       leaf sprays, no blob cores (see buildLeafCanopy). Geometry carries
 *       `aWind`; draw it with flex materials.
 *   'masses' — rim trees: the clump skeleton with its tuft cores only, no
 *       cards; meant for a leafMassTexture material.
 *
 * Returns { branches, tufts, cards, top, radius } — three merged
 * geometries (tufts and cards carry a `color` attribute; a style without
 * one returns it empty) plus the crown extents for colliders and sway.
 */
export function buildCanopy(rng, opts = {}) {
  if (opts.style === 'leaves') return buildLeafCanopy(rng, opts);
  return buildClumpCanopy(rng, opts.style === 'masses' ? Object.assign({}, opts, { leafCards: false }) : opts);
}

/**
 * A branching skeleton of tapered, gently arcing primaries with
 * secondaries and twigs carries a leaf clump at every tip and along the
 * outer limbs; each clump is a few lumpy tuft cores, fringed by alpha-cut
 * leaf-spray cards unless `leafCards` is off. Vertex tints grade from deep
 * shade inside/below to the sunlit crown on top.
 */
function buildClumpCanopy(rng, {
  scale = 1,
  trunkH = 2.4,          // height at which the primaries fan out from
  trunkR = 0.12,         // trunk radius at the fork (limbs start inside it)
  primaries = 6,
  tilt = 0.8,            // primary angle from vertical (rad)
  tiltVar = 0.22,
  droop = 0,             // limb-end lift (+) or droop (−) as a fraction of length
  bend = 0.12,           // mid-limb upward arc
  branchLen = 1.4,
  secondaries = 2,
  twigs = true,
  crownFill = 3,
  colors = [0x35561f, 0x4c7433, 0x6f9440],
  clumpR = 0.42,
  tuftsPerClump = [3, 3, 2],
  cardsPerClump = [10, 9, 6],
  cardSize = 0.68,
  tuftFlat = 0.72,       // vertical squash of tuft cores (pads use ~0.4)
  pad = false,           // flat needle pads: cards lie horizontal
  tuftDetail = 1,
  lump = 0.34,
  seed = 1,
  leafCards = true       // off for 'masses': tuft cores only
} = {}) {
  const up = new THREE.Vector3(0, 1, 0);
  const tips = [];
  const branchGeos = [];

  const addLimb = (start, dir, len, r0, r1, level) => {
    const end = start.clone().addScaledVector(dir, len);
    end.y += droop * len * (level === 0 ? 1 : 0.6);
    const mid = start.clone().addScaledVector(dir, len * 0.5);
    mid.y += bend * len * (level === 0 ? 1 : 0.5);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    branchGeos.push(taperedTube(curve, r0, r1, level === 0 ? 7 : 5, level === 0 ? 7 : 5));
    return { curve, end, tangent: curve.getTangent(1).normalize() };
  };

  for (let i = 0; i < primaries; i++) {
    const a = (i / primaries) * Math.PI * 2 + rng() * (Math.PI * 2 / primaries) * 0.7;
    const t = tilt + (rng() - 0.5) * 2 * tiltVar;
    const dir = new THREE.Vector3(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a));
    const h = trunkH * (0.68 + rng() * 0.28);
    const start = new THREE.Vector3(Math.cos(a) * trunkR * 0.5, h, Math.sin(a) * trunkR * 0.5);
    const len = branchLen * (0.8 + rng() * 0.45);
    const limb = addLimb(start, dir, len, trunkR * 0.55, trunkR * 0.2, 0);
    tips.push({ p: limb.end, dir: limb.tangent, level: 0 });
    tips.push({ p: limb.curve.getPoint(0.6), dir: limb.curve.getTangent(0.6).normalize(), level: 1, inner: true });
    for (let j = 0; j < secondaries; j++) {
      const tj = 0.42 + (j / secondaries) * 0.45 + rng() * 0.1;
      const base = limb.curve.getPoint(tj);
      const tan = limb.curve.getTangent(tj).normalize();
      const side = (j % 2 === 0 ? 1 : -1) * (0.55 + rng() * 0.5);
      const sdir = tan.clone().applyAxisAngle(up, side);
      sdir.y += 0.2 + rng() * 0.3;
      sdir.normalize();
      const slen = len * (0.42 + rng() * 0.25);
      const sec = addLimb(base, sdir, slen, trunkR * 0.24, trunkR * 0.09, 1);
      tips.push({ p: sec.end, dir: sec.tangent, level: 1 });
      if (twigs) {
        for (let k = 0; k < 2; k++) {
          const tdir = sec.tangent.clone().applyAxisAngle(up, (k ? 1 : -1) * (0.6 + rng() * 0.5));
          tdir.y += 0.25;
          tdir.normalize();
          const twig = addLimb(sec.end.clone(), tdir, slen * 0.42, trunkR * 0.09, trunkR * 0.035, 2);
          tips.push({ p: twig.end, dir: twig.tangent, level: 2 });
        }
      }
    }
  }
  for (let i = 0; i < crownFill; i++) {
    const a = rng() * Math.PI * 2;
    tips.push({
      p: new THREE.Vector3(Math.cos(a) * trunkR * 2.5, trunkH * (0.98 + rng() * 0.22), Math.sin(a) * trunkR * 2.5),
      dir: up.clone(), level: 1, inner: true
    });
  }

  // Crown extents for the light gradient
  let minY = Infinity, maxY = -Infinity, maxR = 0;
  for (const tip of tips) {
    minY = Math.min(minY, tip.p.y);
    maxY = Math.max(maxY, tip.p.y);
    maxR = Math.max(maxR, Math.hypot(tip.p.x, tip.p.z));
  }

  const tuftGeos = [];
  const cardGeos = [];
  const card = leafCardGeometry();
  const tmpColor = new THREE.Color();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qRoll = new THREE.Quaternion();
  const sc = new THREE.Vector3(), p = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const pick = (light, jitter) => {
    const ci = Math.min(colors.length - 1, Math.max(0, Math.floor(light * colors.length)));
    return tmpColor.setHex(colors[ci]).offsetHSL((rng() - 0.5) * 0.02, (rng() - 0.5) * 0.08, (rng() - 0.5) * jitter);
  };

  for (const tip of tips) {
    const hNorm = maxY > minY ? (tip.p.y - minY) / (maxY - minY) : 0.5;
    const rNorm = maxR > 0 ? Math.hypot(tip.p.x, tip.p.z) / maxR : 0.5;
    let light = 0.12 + hNorm * 0.55 + rNorm * 0.4 - (tip.inner ? 0.3 : 0) + (tip.level === 2 ? 0.08 : 0);
    light = THREE.MathUtils.clamp(light, 0, 0.999);
    const R = clumpR * (tip.level === 0 ? 1.1 : tip.level === 1 ? 0.95 : 0.7) * (0.85 + rng() * 0.3);
    const centre = tip.p.clone().addScaledVector(tip.dir, R * 0.35);
    const lvl = Math.min(2, tip.level);
    // Each clump gets its own macro tint so neighbouring masses separate in
    // hue and value the way painted canopies do.
    const clumpTint = (rng() - 0.5) * 0.16;

    // Clump frame: `out` points from the limb tip up-and-out over the crown
    // shell; pillows stack tangent to `out`, cards fringe its surface.
    const out = tip.dir.clone().lerp(up, pad ? 0.85 : 0.45).normalize();
    const sideA = new THREE.Vector3().crossVectors(out, up);
    if (sideA.lengthSq() < 0.01) sideA.set(1, 0, 0);
    sideA.normalize();
    const sideB = new THREE.Vector3().crossVectors(out, sideA).normalize();

    const nTufts = tuftsPerClump[lvl];
    for (let n = 0; n < nTufts; n++) {
      // Golden-angle fan: pillows ring the clump centre with tight overlaps
      // at the core and bulge apart at the rim, so the silhouette breaks
      // into distinct scalloped masses rather than one merged ball.
      const ang = n * 2.399963 + rng() * 0.7;
      const ringR = nTufts > 1 ? R * (0.3 + rng() * 0.28) : 0;
      const off = sideA.clone().multiplyScalar(Math.cos(ang) * ringR)
        .addScaledVector(sideB, Math.sin(ang) * ringR)
        .addScaledVector(out, (rng() - 0.35) * R * (pad ? 0.18 : 0.4));
      p.copy(centre).add(off);
      const r = R * (0.78 + rng() * 0.3);
      // Pillow puffs: wide and squashed, domed toward the sky-side of its
      // spot on the shell, scallops spun by a random roll about the dome.
      const domeN = off.lengthSq() > 1e-6
        ? out.clone().multiplyScalar(0.6).addScaledVector(off.clone().normalize(), 0.55).normalize()
        : out.clone();
      q.setFromUnitVectors(up, domeN);
      qRoll.setFromAxisAngle(up, rng() * Math.PI * 2);
      q.multiply(qRoll);
      sc.set(r * (1.0 + rng() * 0.34), r * tuftFlat * (0.85 + rng() * 0.2), r * (1.0 + rng() * 0.34));
      m.compose(p, q, sc);
      const geo = lumpyTuftGeometry(tuftDetail, seed + n, lump).clone().applyMatrix4(m);
      // Under-shell pillows go deep into shade; sky-side crests stay bright
      const shadeBias = THREE.MathUtils.clamp(off.dot(up) / (R * 0.5) * 0.12, -0.14, 0.1);
      const col = pick(THREE.MathUtils.clamp(light - 0.1 + shadeBias + clumpTint, 0, 0.999), 0.06);
      col.multiplyScalar(0.76 + light * 0.24);
      tuftGeos.push(bakeColor(geo, col));
    }

    for (let n = 0; leafCards && n < cardsPerClump[lvl]; n++) {
      // Cards live ON the clump shell: a cone of directions about `out`,
      // more on the silhouette rim than the interior, tilted tangent to
      // the mass so sprays lie against it instead of floating randomly.
      const ang = rng() * Math.PI * 2;
      const rim = rng();
      const elev = pad ? 1.1 + rim * 0.35 : rim * rim * 1.45; // bias to rim for canopies
      const shell = sideA.clone().multiplyScalar(Math.cos(ang) * Math.cos(elev))
        .addScaledVector(sideB, Math.sin(ang) * Math.cos(elev))
        .addScaledVector(out, Math.sin(elev)).normalize();
      p.copy(centre).addScaledVector(shell, R * (0.92 + rng() * 0.3));
      if (pad) p.y = centre.y + (rng() - 0.5) * R * 0.22;
      const face = pad
        ? new THREE.Vector3((rng() - 0.5) * 0.5, 1, (rng() - 0.5) * 0.5).normalize()
        : shell.clone().lerp(out, 0.25).addScaledVector(up, 0.12).add(
            new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.3)
          ).normalize();
      q.setFromUnitVectors(zAxis, face);
      qRoll.setFromAxisAngle(zAxis, rng() * Math.PI * 2);
      q.multiply(qRoll);
      // Rim sprays a touch larger (they break the silhouette), crown-top
      // sprays smaller (they only texturise the surface).
      const size = cardSize * (0.8 + rng() * 0.45) * (tip.level === 2 ? 0.85 : 1) * (pad ? 1 : 1.12 - elev * 0.22);
      sc.set(size, size, size);
      m.compose(p, q, sc);
      const geo = card.clone().applyMatrix4(m);
      const col = pick(Math.min(0.999, light + 0.1 + (1 - rim) * 0.1 + rng() * 0.08 + clumpTint * 0.5), 0.08);
      cardGeos.push(bakeColor(geo, col));
    }
  }

  const branches = mergeGeometries(branchGeos, false);
  const tufts = mergeGeometries(tuftGeos, false);
  const cards = cardGeos.length ? mergeGeometries(cardGeos, false) : new THREE.BufferGeometry();
  for (const g of branchGeos) g.dispose();
  for (const g of tuftGeos) g.dispose();
  for (const g of cardGeos) g.dispose();
  if (scale !== 1) {
    branches.scale(scale, scale, scale);
    tufts.scale(scale, scale, scale);
    if (cardGeos.length) cards.scale(scale, scale, scale);
  }
  return { branches, tufts, cards, top: (maxY + clumpR * 1.5) * scale, radius: (maxR + clumpR) * scale };
}

/** taperedTube carrying the flex-wind attribute: weight f0 → f1 along it. */
function flexTube(curve, r0, r1, segs, radial, f0, f1, phase) {
  const geo = taperedTube(curve, r0, r1, segs, radial);
  const ring = radial + 1;
  const wind = new Float32Array(geo.attributes.position.count * 2);
  for (let j = 0; j <= segs; j++) {
    const f = f0 + (f1 - f0) * (j / segs);
    for (let i = 0; i < ring; i++) {
      wind[(j * ring + i) * 2] = f;
      wind[(j * ring + i) * 2 + 1] = phase;
    }
  }
  geo.setAttribute('aWind', new THREE.BufferAttribute(wind, 2));
  return geo;
}

/**
 * Hero-tree canopy: individual leaves on visible wood, no blob cores.
 *
 * The skeleton runs four deep — primaries, secondaries, twigs and sprigs —
 * each finer level kinked a little at its nodes. Leaf sprays (cards whose
 * texture is a twiglet carrying its own leaves, see leafSprayTexture) are
 * rooted ON the wood: strung along the twigs and sprigs, gathered into a
 * rosette at every tip, and sparser along the older limbs, so every leaf
 * visibly grows from a branch. Interior sprays are tinted down so the
 * crown has depth without filler blobs.
 *
 * `habit` sets how sprays sit:
 *   'cloud' (sakura) — blossom sprays all round the twigs, leaning up/out
 *   'tier'  (maple)  — leaves splayed flat and facing the sky, in layers
 *   'pad'   (pine)   — needle sprays fanned horizontally into flat pads
 *                       at the limb ends (niwaki cloud pruning)
 *
 * Leaf size stays constant across tree sizes (`sprayLen` is in metres
 * after scaling); bigger trees simply carry more sprays. Branches and
 * cards both carry `aWind` (bend weight, tree phase) for the flex wind.
 */
function buildLeafCanopy(rng, {
  scale = 1,
  trunkH = 2.4,
  trunkR = 0.12,
  primaries = 6,
  tilt = 0.8,
  tiltVar = 0.22,
  droop = 0,
  bend = 0.12,
  branchLen = 1.4,
  secondaries = 2,
  colors = [0x35561f, 0x4c7433, 0x6f9440],
  habit = 'cloud',
  twigsPerLimb = 3,      // twigs along each secondary (and 2 on each primary's outer half)
  sprigs = 2,            // sprigs along each twig
  zigzag = 0.3,          // node kink of the fine wood, as a fraction of its length
  sprayLen = 0.34,       // spray card length in metres (after scale)
  sprayAspect = 0.9,     // card width / length
  density = 14,          // sprays per metre of leaf-bearing twig (after scale)
  tipSprays = 3,         // rosette at every twig and sprig tip
  padSprays = 14,        // 'pad' habit: sprays per limb-end pad
  padR = 0.45            // 'pad' habit: pad radius in metres
} = {}) {
  const up = new THREE.Vector3(0, 1, 0);
  const phase = rng() * Math.PI * 2;
  const branchGeos = [];
  const limbs = [];
  // Work in unscaled units; convert the metre-based leaf sizes into them.
  const sLen = sprayLen / scale;
  const sDensity = density * scale;
  const sPadR = padR / scale;

  const perp = (dir) => {
    const a = Math.abs(dir.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0);
    return new THREE.Vector3().crossVectors(dir, a).normalize().applyAxisAngle(dir, rng() * Math.PI * 2);
  };
  const addLimb = (start, dir, len, r0, r1, level, f0, f1) => {
    const end = start.clone().addScaledVector(dir, len);
    end.y += droop * len * (level === 0 ? 1 : 0.6);
    const mid = start.clone().addScaledVector(dir, len * 0.5);
    mid.y += bend * len * (level === 0 ? 1 : 0.5);
    if (level >= 2) mid.addScaledVector(perp(dir), len * zigzag * (rng() - 0.3));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    branchGeos.push(flexTube(curve, r0, r1, [7, 5, 3, 2][level], [7, 5, 4, 3][level], f0, f1, phase));
    const limb = { curve, level, len, f0, f1 };
    limbs.push(limb);
    return limb;
  };
  const flexAt = (limb, t) => limb.f0 + (limb.f1 - limb.f0) * t;
  // A child limb of `level` leaving `parent` at t, swung `side` radians
  // round the vertical and lifted toward the light. Bend weight keeps
  // accumulating outward: secondaries +0.3, twigs +0.22, sprigs +0.14.
  const branchOff = (parent, t, side, lift, len, r0, r1, level) => {
    const base = parent.curve.getPoint(t);
    const dir = parent.curve.getTangent(t).normalize().applyAxisAngle(up, side);
    dir.y += lift;
    dir.normalize();
    const f = flexAt(parent, t);
    return addLimb(base, dir, len, r0, r1, level, f, f + [0, 0.3, 0.22, 0.14][level]);
  };
  const twiggy = habit !== 'pad';
  const growTwigs = (parent, n, t0, t1) => {
    for (let k = 0; k < n; k++) {
      const t = t0 + (t1 - t0) * (n > 1 ? k / (n - 1) : 1) + (rng() - 0.5) * 0.06;
      const side = (k % 2 ? 1 : -1) * (0.5 + rng() * 0.6);
      const twig = branchOff(parent, Math.min(1, t), side, 0.15 + rng() * 0.35, parent.len * (0.34 + rng() * 0.2),
        trunkR * 0.07, trunkR * 0.025, 2);
      for (let m = 0; m < sprigs; m++) {
        const tm = 0.45 + (sprigs > 1 ? m / (sprigs - 1) : 1) * 0.5;
        branchOff(twig, Math.min(1, tm + (rng() - 0.5) * 0.08), (m % 2 ? 1 : -1) * (0.55 + rng() * 0.6), 0.2 + rng() * 0.3,
          twig.len * (0.4 + rng() * 0.25), trunkR * 0.025, trunkR * 0.012, 3);
      }
    }
  };

  for (let i = 0; i < primaries; i++) {
    const a = (i / primaries) * Math.PI * 2 + rng() * (Math.PI * 2 / primaries) * 0.7;
    const t = tilt + (rng() - 0.5) * 2 * tiltVar;
    const dir = new THREE.Vector3(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a));
    const h = trunkH * (0.68 + rng() * 0.28);
    const start = new THREE.Vector3(Math.cos(a) * trunkR * 0.5, h, Math.sin(a) * trunkR * 0.5);
    const len = branchLen * (0.8 + rng() * 0.45);
    const prim = addLimb(start, dir, len, trunkR * 0.55, trunkR * 0.18, 0, 0, 0.35);
    for (let j = 0; j < secondaries; j++) {
      const tj = 0.38 + (j / Math.max(1, secondaries)) * 0.5 + rng() * 0.08;
      const sec = branchOff(prim, tj, (j % 2 === 0 ? 1 : -1) * (0.55 + rng() * 0.5), 0.2 + rng() * 0.3,
        len * (0.42 + rng() * 0.25), trunkR * 0.22, trunkR * 0.07, 1);
      if (twiggy) growTwigs(sec, twigsPerLimb, 0.35, 1);
    }
    if (twiggy) growTwigs(prim, 2, 0.62, 0.95);
  }

  // Crown extents (for the light gradient) from the leaf-bearing wood
  let minY = Infinity, maxY = -Infinity, maxR = 0;
  const tmpP = new THREE.Vector3();
  for (const limb of limbs) {
    for (const t of [0.5, 1]) {
      limb.curve.getPoint(t, tmpP);
      minY = Math.min(minY, tmpP.y);
      maxY = Math.max(maxY, tmpP.y);
      maxR = Math.max(maxR, Math.hypot(tmpP.x, tmpP.z));
    }
  }

  // Sprays are written straight into flat arrays (no per-card geometry).
  const tpl = sprayCardGeometry();
  const tPos = tpl.attributes.position, tNrm = tpl.attributes.normal, tUv = tpl.attributes.uv;
  const tIdx = tpl.index.array;
  const nv = tPos.count;
  const sprays = [];
  const tmpColor = new THREE.Color();
  const pick = (light) => {
    const ci = Math.min(colors.length - 1, Math.max(0, Math.floor(light * colors.length)));
    return tmpColor.setHex(colors[ci]).offsetHSL((rng() - 0.5) * 0.02, (rng() - 0.5) * 0.08, (rng() - 0.5) * 0.08).clone();
  };
  const lightAt = (p, bias) => {
    const hN = maxY > minY ? (p.y - minY) / (maxY - minY) : 0.5;
    const rN = maxR > 0 ? Math.hypot(p.x, p.z) / maxR : 0.5;
    return THREE.MathUtils.clamp(0.16 + hN * 0.5 + rN * 0.42 + bias + (rng() - 0.5) * 0.16, 0, 0.999);
  };
  const outwardAt = (p) => {
    const o = new THREE.Vector3(p.x, 0, p.z);
    return o.lengthSq() > 1e-6 ? o.normalize() : new THREE.Vector3(1, 0, 0);
  };
  // The crown as one ellipsoid: sprays face out of it (so the crown reads
  // full from the side, not as edge-on cards) and their shading normals
  // lean on it, so light rounds the whole crown instead of speckling
  // card by card.
  const crownY = (minY + maxY) / 2;
  const crownRh = Math.max(0.5, maxR), crownRv = Math.max(0.4, (maxY - minY) / 2 + sLen);
  const crownDir = (p, out = new THREE.Vector3()) => {
    out.set(p.x / (crownRh * crownRh), (p.y - crownY) / (crownRv * crownRv), p.z / (crownRh * crownRh));
    return out.lengthSq() > 1e-9 ? out.normalize() : out.set(0, 1, 0);
  };
  const crownLean = habit === 'cloud' ? 0.72 : 0.55;
  // One spray rooted at p, its twiglet along `dir`, its face toward `face`.
  const addSpray = (p, dir, face, flex, light, sizeMul = 1) => {
    const D = dir.clone().normalize();
    const N = face.clone().addScaledVector(D, -face.dot(D));
    if (N.lengthSq() < 1e-6) N.copy(perp(D));
    N.normalize();
    const X = new THREE.Vector3().crossVectors(D, N).normalize();
    const len = sLen * (0.8 + rng() * 0.4) * sizeMul;
    sprays.push({ p: p.clone(), X: X.multiplyScalar(len * sprayAspect), D: D.multiplyScalar(len), N: N.multiplyScalar(len), flex, color: pick(light) });
  };
  const jitter = (v, amt) => v.add(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(amt));

  const P = new THREE.Vector3(), T = new THREE.Vector3();
  if (habit === 'pad') {
    // Cloud-pruned pads: shoots fanned out from every limb end in three
    // layers — a domed top whose shoots turn their faces up and out, a
    // middle ring, and a shaded underside — so a pad has body from the
    // side instead of being one edge-on plane. A few more shoots along the
    // outer third of each limb feed it.
    for (const limb of limbs) {
      limb.curve.getPoint(1, P);
      const outward = outwardAt(P);
      for (let k = 0; k < padSprays; k++) {
        // Shoots radiate from the limb end over a squashed dome, from just
        // under the rim (closing the pad's belly) up to its crown.
        const a = rng() * Math.PI * 2;
        const e = -0.25 + Math.pow(rng(), 0.8) * 1.35;
        const ray = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
        const root = P.clone().addScaledVector(ray, sPadR * 0.3 * rng());
        const D = ray.clone();
        D.y *= 0.5;
        const face = jitter(ray.clone().addScaledVector(up, 0.6), 0.3);
        const light = lightAt(root, e * 0.18 - 0.06 + ray.dot(outward) * 0.08);
        addSpray(root, D, face, limb.f1 + 0.05, light, 0.75 + rng() * 0.35);
      }
      for (let k = 0; k < 4; k++) {
        const t = 0.66 + rng() * 0.3;
        limb.curve.getPoint(t, P);
        limb.curve.getTangent(t, T);
        const D = T.clone().add(perp(T).multiplyScalar(0.9));
        D.y *= 0.3;
        addSpray(P, D, jitter(up.clone(), 0.4), flexAt(limb, t), lightAt(P, -0.05));
      }
    }
  } else {
    for (const limb of limbs) {
      // Older wood carries a few spurs; twigs and sprigs carry the bulk.
      const [t0, dens] = limb.level === 0 ? [0.72, 0.25] : limb.level === 1 ? [0.45, 0.55] : [0.12, 1];
      const n = Math.round(limb.len * (1 - t0) * sDensity * dens);
      for (let k = 0; k < n; k++) {
        const t = t0 + (1 - t0) * rng();
        limb.curve.getPoint(t, P);
        limb.curve.getTangent(t, T).normalize();
        const outward = outwardAt(P);
        const shell = crownDir(P);
        let D, face;
        if (habit === 'tier') {
          D = T.clone().multiplyScalar(0.55).add(perp(T).multiplyScalar(0.8)).addScaledVector(outward, 0.35);
          D.y = D.y * 0.3 + 0.04;
          face = jitter(up.clone().multiplyScalar(0.7).addScaledVector(shell, 0.6), 0.5);
        } else {
          D = T.clone().multiplyScalar(0.5).add(perp(T).multiplyScalar(0.85)).addScaledVector(up, 0.3).addScaledVector(outward, 0.3);
          face = jitter(shell.clone().addScaledVector(up, 0.25), 0.7);
        }
        // Inside the crown (older wood, low down) the leaves sit in shade
        const inner = limb.level <= 1 ? -0.16 : 0;
        addSpray(P, D, face, flexAt(limb, t), lightAt(P, inner));
      }
      if (limb.level >= 2) {
        limb.curve.getPoint(1, P);
        limb.curve.getTangent(1, T).normalize();
        const outward = outwardAt(P);
        for (let k = 0; k < tipSprays; k++) {
          const D = jitter(T.clone().addScaledVector(outward, 0.3), 1.4);
          if (habit === 'tier') D.y = D.y * 0.3 + 0.04;
          const shell = crownDir(P);
          const face = habit === 'tier'
            ? jitter(up.clone().multiplyScalar(0.7).addScaledVector(shell, 0.6), 0.5)
            : jitter(shell.clone().addScaledVector(up, 0.25), 0.7);
          addSpray(P, D, face, limb.f1, lightAt(P, 0.08));
        }
      }
    }
  }

  const count = sprays.length;
  const pos = new Float32Array(count * nv * 3);
  const nrm = new Float32Array(count * nv * 3);
  const uv = new Float32Array(count * nv * 2);
  const col = new Float32Array(count * nv * 3);
  const wind = new Float32Array(count * nv * 2);
  const idx = new Uint32Array(count * tIdx.length);
  const n = new THREE.Vector3(), lp = new THREE.Vector3(), cn = new THREE.Vector3();
  for (let k = 0; k < count; k++) {
    const sp = sprays[k];
    const nN = sp.N.clone().normalize(), nX = sp.X.clone().normalize(), nD = sp.D.clone().normalize();
    for (let v = 0; v < nv; v++) {
      const lx = tPos.getX(v), ly = tPos.getY(v), lz = tPos.getZ(v);
      const o = (k * nv + v) * 3;
      lp.set(
        sp.p.x + sp.X.x * lx + sp.D.x * ly + sp.N.x * lz,
        sp.p.y + sp.X.y * lx + sp.D.y * ly + sp.N.y * lz,
        sp.p.z + sp.X.z * lx + sp.D.z * ly + sp.N.z * lz
      );
      pos[o] = lp.x * scale; pos[o + 1] = lp.y * scale; pos[o + 2] = lp.z * scale;
      n.set(0, 0, 0)
        .addScaledVector(nX, tNrm.getX(v))
        .addScaledVector(nD, tNrm.getY(v))
        .addScaledVector(nN, tNrm.getZ(v)).normalize();
      // Card normal on the crown side, leaned onto the crown ellipsoid
      if (n.dot(crownDir(lp, cn)) < 0) n.negate();
      n.multiplyScalar(1 - crownLean).addScaledVector(cn, crownLean).normalize();
      nrm[o] = n.x; nrm[o + 1] = n.y; nrm[o + 2] = n.z;
      col[o] = sp.color.r; col[o + 1] = sp.color.g; col[o + 2] = sp.color.b;
      uv[(k * nv + v) * 2] = tUv.getX(v);
      uv[(k * nv + v) * 2 + 1] = tUv.getY(v);
      // The leaves themselves flutter a little past their twig
      wind[(k * nv + v) * 2] = sp.flex + ly * 0.12;
      wind[(k * nv + v) * 2 + 1] = phase;
    }
    for (let i = 0; i < tIdx.length; i++) idx[k * tIdx.length + i] = tIdx[i] + k * nv;
  }
  const cards = new THREE.BufferGeometry();
  cards.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  cards.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  cards.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  cards.setAttribute('color', new THREE.BufferAttribute(col, 3));
  cards.setAttribute('aWind', new THREE.BufferAttribute(wind, 2));
  cards.setIndex(new THREE.BufferAttribute(idx, 1));
  cards.computeBoundingSphere();

  const branches = mergeGeometries(branchGeos, false);
  for (const g of branchGeos) g.dispose();
  if (scale !== 1) branches.scale(scale, scale, scale);
  return {
    branches, tufts: new THREE.BufferGeometry(), cards,
    top: (maxY + sLen) * scale, radius: (maxR + sLen) * scale, sprays: count
  };
}

const bushCache = new Map();

/**
 * A thick natural shrub instead of one ball: a crowd of rounded growth
 * domes — a broad core, a ring of shoulders spilling outward and down,
 * a couple of crests — merged into one geometry. Vertex tints sink the
 * base and the inner shoulders into shade. Roughly unit radius, bottom at
 * y ≈ -0.7 (the street and undergrowth placements set it on the ground).
 * Pair it with a leafMassTexture material with `ragged` on.
 */
export function bushGeometry(seed = 0, { lobes = 8, detail = 2, lump = 0.34 } = {}) {
  const key = seed + '_' + lobes + '_' + detail + '_' + lump;
  if (bushCache.has(key)) return bushCache.get(key);
  let s = 3301 + seed * 7919;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const parts = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const ring = Math.max(1, lobes - 3);
  for (let i = 0; i < lobes; i++) {
    let r;
    if (i === 0) {
      p.set(0, 0.02, 0);
      r = 0.66;
    } else if (i <= ring) {
      const a = (i / ring) * Math.PI * 2 + rnd() * 0.7;
      const d = 0.42 + rnd() * 0.2;
      p.set(Math.cos(a) * d, -0.16 + rnd() * 0.16, Math.sin(a) * d);
      r = 0.4 + rnd() * 0.16;
    } else {
      const a = rnd() * Math.PI * 2, d = rnd() * 0.28;
      p.set(Math.cos(a) * d, 0.34 + rnd() * 0.12, Math.sin(a) * d);
      r = 0.34 + rnd() * 0.1;
    }
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    sc.set(r * (1 + rnd() * 0.18), r * (0.82 + rnd() * 0.16), r * (1 + rnd() * 0.18));
    m.compose(p, q, sc);
    const g = lumpyTuftGeometry(detail, seed * 13 + i, lump).clone().applyMatrix4(m);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      // Shade low and near the core; crests and outer shoulders stay lit
      const y = pos.getY(v), rr = Math.hypot(pos.getX(v), pos.getZ(v));
      const lit = THREE.MathUtils.clamp(0.5 + (y + 0.55) * 0.42 + rr * 0.18, 0.4, 1.05);
      col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = lit;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  }
  const geo = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  // Same envelope as the single tuft it replaces (about 1.05 across the
  // shoulders, 1.9 from base to crest) so existing placements still sit
  // right; whatever sags below the base is flattened onto it.
  const pos = geo.attributes.position;
  let reach = 0, top = -Infinity;
  for (let v = 0; v < pos.count; v++) {
    reach = Math.max(reach, Math.hypot(pos.getX(v), pos.getZ(v)));
    top = Math.max(top, pos.getY(v));
  }
  const lift = 1.9 / (top + 0.7);
  for (let v = 0; v < pos.count; v++) {
    pos.setX(v, pos.getX(v) / reach * 1.05);
    pos.setZ(v, pos.getZ(v) / reach * 1.05);
    const y = pos.getY(v) < -0.7 ? -0.7 + (pos.getY(v) + 0.7) * 0.15 : pos.getY(v);
    pos.setY(v, -0.7 + (y + 0.7) * lift);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  bushCache.set(key, geo);
  return geo;
}

/** Update the shared uniforms once per frame. */
export function updateFoliage(time, sky, playerPos) {
  foliageUniforms.uTime.value = time;
  if (sky) {
    foliageUniforms.uSunDir.value.copy(sky.sunDir).normalize();
    const p = sky.resolvePalette();
    const sunUp = Math.max(0, sky.sunDir.y);
    foliageUniforms.uSunColor.value.copy(p.sun).multiplyScalar(Math.pow(sunUp, 0.5) * 1.2);
    let wind = 1.0;
    if (sky.weather === 'rain' || sky.weather === 'snow' || sky.weather === 'cloudy') wind = 1.0 + sky.weatherBlend * 1.6;
    foliageUniforms.uWindGlobal.value += (wind - foliageUniforms.uWindGlobal.value) * 0.02;
  }
  if (playerPos) foliageUniforms.uPlayerPos.value.copy(playerPos);
}
