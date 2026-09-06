import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Shared painterly foliage system.
 *
 * Every leafy mass in the valley (sakura and maple canopies, garden pines,
 * street bushes, the edge forest and the foothill woods) draws through one
 * MeshStandardMaterial extension that adds:
 *   - lumpy, cauliflower-like tuft geometry with smooth normals
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
 * Lumpy leaf-mass sphere: an icosphere pushed in and out by 3D noise so its
 * silhouette clumps like a hand-painted canopy, with smooth vertex normals.
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
    const n1 = noise3(p.x * 1.9 + seed * 7.1, p.y * 1.9 + seed * 3.3, p.z * 1.9 + seed * 5.7);
    const n2 = noise3(p.x * 4.3 + seed, p.y * 4.3, p.z * 4.3 - seed);
    const n3 = noise3(p.x * 8.7 - seed * 2.0, p.y * 8.7 + seed, p.z * 8.7);
    const r = 1 + (n1 - 0.5) * 2 * lump + (n2 - 0.5) * lump * 0.7 + (n3 - 0.5) * lump * 0.35;
    // Flatten the underside a little so masses sit like foliage, not balls
    const squash = p.y < 0 ? 1 - 0.18 * (-p.y) : 1;
    p.multiplyScalar(r).multiply(new THREE.Vector3(1, squash, 1));
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
 * Build the shared foliage material. `sss` scales sun translucency,
 * `wind` scales canopy sway, `rustle` enables the cat-brush response.
 */
export function createFoliageMaterial({ sss = 0.32, wind = 1.0, rustle = 0.0, roughness = 0.92, mottle = 0.26, bump = 0.7, vertexColors = true } = {}) {
  // Instanced meshes colour through instanceColor and must NOT declare
  // vertexColors (a missing colour attribute would read as black).
  const mat = new THREE.MeshStandardMaterial({ vertexColors, roughness, metalness: 0, envMapIntensity: 0.35 });
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
        float folPhase = folCentre.x * 0.31 + folCentre.z * 0.23;
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
        {
          // Leaf-clump relief: jitter the shading normal with world-space noise
          // so light breaks into hundreds of small facets across the canopy
          vec3 fw = vFolWorld * 3.2;
          vec3 folBump = vec3(folNoise(fw + 1.7), folNoise(fw + 9.1), folNoise(fw + 17.3)) - 0.5;
          vec3 fw2 = vFolWorld * 9.5;
          folBump += (vec3(folNoise(fw2 + 3.3), folNoise(fw2 + 5.9), folNoise(fw2 + 12.7)) - 0.5) * 0.5;
          normal = normalize(normal + (viewMatrix * vec4(folBump, 0.0)).xyz * uBump);
        }
      `)
      .replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        // Painterly mottling: broad patches, leaf clumps and fine speckle so a
        // canopy reads as thousands of leaves rather than one smooth mass
        float folM = folNoise(vFolWorld * 0.55) * 0.4 + folNoise(vFolWorld * 2.1) * 0.35 + folNoise(vFolWorld * 6.5) * 0.25;
        diffuseColor.rgb *= 1.0 - uMottle + folM * uMottle * 2.0;
        // Dark crevices between clumps
        float folCrevice = smoothstep(0.62, 0.3, folNoise(vFolWorld * 1.6 + 11.0));
        diffuseColor.rgb *= 1.0 - folCrevice * 0.3;
        // Top-lit crown gradient, cool violet-tinged undersides
        vec3 folUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        float folUpness = dot(normalize(vNormal), folUp) * 0.5 + 0.5;
        float folCrown = folUpness * 0.55 + vFolTop * 0.45;
        diffuseColor.rgb *= 0.78 + folCrown * 0.34;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.8, 1.08), (1.0 - folCrown) * 0.45);
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
  mat.customProgramCacheKey = () => 'foliage_' + sss + '_' + wind + '_' + rustle + '_' + mottle + '_' + bump + '_' + (vertexColors ? 'vc' : 'ic');
  return mat;
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
