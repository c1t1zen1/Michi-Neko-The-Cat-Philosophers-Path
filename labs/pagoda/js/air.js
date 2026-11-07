// The air between Michi and the tower, as a material patch. One shared set
// of uniforms drives every surface: wavelength extinction (air eats blue
// first, so distant timber warms), a veil bent toward the sun (Quilez's fog
// with sun scattering), the night light-up from the ground, and a Bayer
// screen-door fade for crossfading detail tiers without blending.
import * as THREE from 'three';

/** Patches compose: each adds code under a key, and the key list becomes the
 *  program cache key so materials with different patches never share one. */
export function addPatch(mat, key, fn) {
  if (!mat.userData.patches) {
    // keep a material's own hook (the game's materials may carry one) as the first patch
    const own = mat.onBeforeCompile;
    mat.userData.patches = own && own !== THREE.Material.prototype.onBeforeCompile ? [{ key: 'own:' + mat.customProgramCacheKey(), fn: own.bind(mat) }] : [];
  }
  const P = mat.userData.patches;
  if (P.some((p) => p.key === key)) return mat;
  P.push({ key, fn });
  mat.onBeforeCompile = (sh, r) => { for (const p of P) p.fn(sh, r); };
  mat.customProgramCacheKey = () => P.map((p) => p.key).join('|');
  mat.needsUpdate = true;
  return mat;
}

export function makeAir() {
  return {
    uAirCol: { value: new THREE.Color(0xc4d5e4) },
    uSunCol: { value: new THREE.Color(0xffe2b8) },
    uSunW: { value: new THREE.Vector3(0.3, 0.6, -0.7).normalize() },
    // per-metre extinction for r, g, b (blue first). Tuned by eye for a
    // Kyoto autumn afternoon; ×uAir for haze, mist or a clear winter day.
    uBeta: { value: new THREE.Vector3(1.6e-4, 2.3e-4, 4.1e-4) },
    uAir: { value: 1 },
    uUplight: { value: 0 },
    uUpCol: { value: new THREE.Color(0xffb36b) },
    uUpH: { value: 40 }
  };
}

const AIR_FS = /* glsl */`
{
  vec3 airRay = vAirWorld - cameraPosition;
  float airD = length(airRay);
  vec3 airExt = exp(-uBeta * airD * uAir);
  float airSun = pow(max(dot(airRay / max(airD, 1e-3), uSunW), 0.0), 8.0);
  vec3 airVeil = mix(uAirCol, uSunCol * 1.15, airSun * 0.55);
  gl_FragColor.rgb = gl_FragColor.rgb * airExt + airVeil * (1.0 - airExt);
}
`;

export function patchAir(mat, air, { uplight = false } = {}) {
  return addPatch(mat, 'air' + (uplight ? 'U' : ''), (sh) => {
    Object.assign(sh.uniforms, air);
    sh.vertexShader = 'varying vec3 vAirWorld;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      {
        vec4 aw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          aw = instanceMatrix * aw;
        #endif
        vAirWorld = (modelMatrix * aw).xyz;
      }`);
    sh.fragmentShader = `varying vec3 vAirWorld;
      uniform vec3 uAirCol, uSunCol, uSunW, uBeta, uUpCol; uniform float uAir, uUplight, uUpH;
      ` + sh.fragmentShader.replace('#include <tonemapping_fragment>', (uplight ? `
      {
        vec3 wn = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        float up = clamp(0.55 - wn.y * 0.65, 0.0, 1.0) * (1.0 - clamp(vAirWorld.y / uUpH, 0.0, 1.0) * 0.6);
        gl_FragColor.rgb += uUpCol * uUplight * up * (diffuseColor.rgb + 0.06);
      }` : '') + AIR_FS + '#include <tonemapping_fragment>');
  });
}

/** Screen-door fade: discard pixels above a Bayer threshold. uFade 1 = solid. */
export function patchFade(mat, uFade) {
  return addPatch(mat, 'fade', (sh) => {
    sh.uniforms.uFade = uFade;
    sh.fragmentShader = `uniform float uFade;
      float bayer4(vec2 p) {
        ivec2 i = ivec2(mod(p, 4.0));
        const float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
        return (m[i.x + i.y * 4] + 0.5) / 16.0;
      }
      ` + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uFade < 0.999 && bayer4(gl_FragCoord.xy) >= uFade) discard;`);
  });
}

/** Rim / back light: a Fresnel term in the sun's colour, strongest when the
 *  camera looks toward the sun (the sunset silhouette). */
export function patchRim(mat, air, uRim) {
  return addPatch(mat, 'rim', (sh) => {
    sh.uniforms.uRim = uRim;
    sh.uniforms.uRimSun = air.uSunW;
    sh.uniforms.uRimCol = air.uSunCol;
    sh.fragmentShader = 'uniform float uRim; uniform vec3 uRimSun, uRimCol;\n' + sh.fragmentShader.replace('#include <tonemapping_fragment>', `
      {
        vec3 V = normalize(vViewPosition);
        float fres = pow(1.0 - clamp(abs(dot(normal, V)), 0.0, 1.0), 3.0);
        vec3 sv = normalize((viewMatrix * vec4(uRimSun, 0.0)).xyz);
        float back = clamp(-sv.z * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor.rgb += uRimCol * fres * back * uRim;
      }
      #include <tonemapping_fragment>`);
  });
}
