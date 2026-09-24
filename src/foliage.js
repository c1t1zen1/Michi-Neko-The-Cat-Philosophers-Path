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
 * Every foliage material built so far, so a quality-tier change can
 * re-specialise them together.
 */
const foliageMaterials = [];
let foliageLowDetail = false;

/**
 * Build the shared foliage material. `sss` scales sun translucency,
 * `wind` scales canopy sway, `rustle` enables the cat-brush response.
 */
export function createFoliageMaterial({ sss = 0.32, wind = 1.0, rustle = 0.0, roughness = 0.92, mottle = 0.26, bump = 0.7, vertexColors = true, map = null, alphaTest = 0, side = THREE.FrontSide } = {}) {
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

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindAmp;
      uniform float uWindGlobal;
      uniform float uRustle;
      uniform vec3 uPlayerPos;
      varying vec3 vFolWorld;
      varying float vFolTop;
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
        // Whole-crown sway plus a faster leaf flutter, weighted toward the top
        // World position keeps merged forests from swaying as one rigid mass.
        float folPhase = folWorld.x * 0.31 + folWorld.z * 0.23;
        float folH = clamp(transformed.y * 0.5 + 0.5, 0.0, 1.0);
        float folWind = uWindAmp * uWindGlobal;
        float folSway = (sin(uTime * 0.85 + folPhase) * 0.05 + sin(uTime * 2.4 + folPhase * 2.3 + transformed.x * 2.0) * 0.018) * folWind;
        transformed.x += folSway * folH;
        transformed.z += cos(uTime * 0.72 + folPhase * 1.4) * 0.035 * folWind * folH;
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
      ${GLSL_NOISE}
    ` + shader.fragmentShader
      .replace('#include <normal_fragment_begin>', /* glsl */`
        #include <normal_fragment_begin>
        #ifndef FOL_CARD
        {
          // Leaf-clump relief: jitter the shading normal with world-space noise
          // so light breaks into hundreds of small facets across the canopy.
          // The fine octave is the expensive half (three more noise lookups
          // per fragment) and the one that stops resolving first at distance,
          // so the low tier drops it — see FOL_LOW in setFoliageDetail().
          vec3 fw = vFolWorld * 3.2;
          vec3 folBump = vec3(folNoise(fw + 1.7), folNoise(fw + 9.1), folNoise(fw + 17.3)) - 0.5;
          #ifndef FOL_LOW
            vec3 fw2 = vFolWorld * 9.5;
            folBump += (vec3(folNoise(fw2 + 3.3), folNoise(fw2 + 5.9), folNoise(fw2 + 12.7)) - 0.5) * 0.5;
          #endif
          normal = normalize(normal + (viewMatrix * vec4(folBump, 0.0)).xyz * uBump);
        }
        #endif
      `)
      .replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        // Painterly mottling: broad patches, leaf clumps and fine speckle so a
        // canopy reads as thousands of leaves rather than one smooth mass.
        // Dropping the fine speckle on the low tier redistributes its weight
        // across the two that remain, so the average tone is unchanged and
        // only the finest grain goes.
        #ifdef FOL_CARD
          // The painted card texture already supplies veins and leaf-scale
          // breakup. One broad sample is enough here and avoids heavy noise
          // work on the canopy's alpha-overdraw layer.
          float folM = folNoise(vFolWorld * 0.72);
        #elif defined(FOL_LOW)
          float folM = folNoise(vFolWorld * 0.55) * 0.53 + folNoise(vFolWorld * 2.1) * 0.47;
        #else
          float folM = folNoise(vFolWorld * 0.55) * 0.4 + folNoise(vFolWorld * 2.1) * 0.35 + folNoise(vFolWorld * 6.5) * 0.25;
        #endif
        diffuseColor.rgb *= 1.0 - uMottle + folM * uMottle * 2.0;
        // Dark crevices between clumps
        #ifndef FOL_CARD
          float folCrevice = smoothstep(0.62, 0.3, folNoise(vFolWorld * 1.6 + 11.0));
          diffuseColor.rgb *= 1.0 - folCrevice * 0.38;
        #endif
        // Top-lit crown gradient, cool violet-tinged undersides
        vec3 folUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        float folUpness = dot(normalize(vNormal), folUp) * 0.5 + 0.5;
        float folCrown = folUpness * 0.55 + vFolTop * 0.45;
        // Broad hand-painted value steps read like anime cels at gameplay
        // distance while feathered edges avoid hard posterisation.
        float folBand = 0.72
          + smoothstep(0.30, 0.46, folCrown) * 0.20
          + smoothstep(0.68, 0.82, folCrown) * 0.17;
        diffuseColor.rgb *= folBand;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.66, 0.77, 1.12), (1.0 - folCrown) * 0.46);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.035, 0.91), smoothstep(0.72, 0.94, folCrown) * 0.22);
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
        }
        #include <opaque_fragment>
      `);
  };
  // Detail level rides in a #define, so the low tier genuinely skips the
  // noise lookups instead of multiplying their result by zero. It has to be
  // part of the cache key or three would hand back the other variant's
  // compiled program.
  mat.defines = mat.defines || {};
  if (map) mat.defines.FOL_CARD = '';
  if (foliageLowDetail) mat.defines.FOL_LOW = '';
  mat.customProgramCacheKey = () => 'foliage_' + sss + '_' + wind + '_' + rustle + '_' + mottle + '_' + bump + '_' + (vertexColors ? 'vc' : 'ic') + (map ? '_map' : '') + (mat.defines.FOL_LOW !== undefined ? '_lod' : '');
  foliageMaterials.push(mat);
  return mat;
}

/**
 * Lightweight anime foliage for the thousands of foothill trees. These
 * crowns resolve as a layered colour mass, not individual leaves, so they
 * use one Lambert light evaluation and no procedural fragment noise.
 */
export function createDistantFoliageMaterial({ wind = 0.35 } = {}) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = foliageUniforms.uTime;
    shader.uniforms.uWindGlobal = foliageUniforms.uWindGlobal;
    shader.uniforms.uWindAmp = { value: wind };
    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindGlobal;
      uniform float uWindAmp;
      varying float vDistantTop;
    ` + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */`
      #include <begin_vertex>
      float distantTop = clamp(transformed.y * 0.45 + 0.35, 0.0, 1.0);
      #ifdef USE_INSTANCING
        float distantPhase = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.17;
      #else
        float distantPhase = modelMatrix[3].x * 0.13 + modelMatrix[3].z * 0.17;
      #endif
      transformed.x += sin(uTime * 0.46 + distantPhase) * 0.025 * uWindAmp * uWindGlobal * distantTop;
      vDistantTop = distantTop;
    `);
    shader.fragmentShader = `
      varying float vDistantTop;
    ` + shader.fragmentShader.replace('#include <color_fragment>', /* glsl */`
      #include <color_fragment>
      float distantBand = 0.76
        + smoothstep(0.18, 0.42, vDistantTop) * 0.15
        + smoothstep(0.62, 0.86, vDistantTop) * 0.12;
      diffuseColor.rgb *= distantBand;
      diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.72, 0.82, 1.08), diffuseColor.rgb, smoothstep(0.12, 0.55, vDistantTop));
    `);
  };
  mat.customProgramCacheKey = () => `distant-foliage-${wind}`;
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

/** Shadow-map depth material that honours a leaf card's alpha cut-out. */
export function createFoliageDepthMaterial(map, alphaTest = 0.5) {
  return new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest, side: THREE.DoubleSide });
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
    // Repeating skirts produce the tiered silhouette of Japanese sugi and
    // cypress without adding vertices or separate branch meshes.
    const tier = 0.87 + Math.pow(Math.max(0, Math.sin(t * Math.PI * 5.0 + 0.35)), 2) * (0.2 - t * 0.07);
    const taper = (1.08 - t * 0.8) * tier;
    const lean = Math.sin(seed * 1.91) * t * 0.08;
    pos.setXYZ(i, p.x * taper + lean, p.y * 1.9 + 0.9, p.z * taper);
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
 * Build a realistic canopy in tree-local space (trunk base at the origin,
 * everything already multiplied by `scale`). A branching skeleton of
 * tapered, gently arcing primaries with secondaries and twigs carries a
 * leaf clump at every tip and along the outer limbs; each clump is a few
 * lumpy tuft cores fringed by alpha-cut leaf-spray cards. Vertex tints
 * grade from deep shade inside/below to the sunlit crown on top.
 *
 * Returns { branches, tufts, cards, top, radius } — three merged
 * geometries (tufts and cards carry a `color` attribute) plus the crown
 * extents for colliders and sway.
 */
export function buildCanopy(rng, {
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
  seed = 1
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

    for (let n = 0; n < cardsPerClump[lvl]; n++) {
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
  const cards = mergeGeometries(cardGeos, false);
  for (const g of branchGeos) g.dispose();
  for (const g of tuftGeos) g.dispose();
  for (const g of cardGeos) g.dispose();
  if (scale !== 1) {
    branches.scale(scale, scale, scale);
    tufts.scale(scale, scale, scale);
    cards.scale(scale, scale, scale);
  }
  return { branches, tufts, cards, top: (maxY + clumpR * 1.5) * scale, radius: (maxR + clumpR) * scale };
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
