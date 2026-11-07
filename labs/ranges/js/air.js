// The air between the viewer and the ranges. One shared model: exponential
// veils (Gurney's wedding veils), a veil colour bent toward the sun
// (Quilez), wavelength extinction warming the farthest ridges, and a
// single cloud field whose shadows drape over every slope that opts in.
import * as THREE from 'three';
import { HASH, NOISE } from '../../shared/glsl.js';

export const fogT = (d, b = 0.0015) => 1 - Math.exp(-d * b);
// wavelength-dependent extinction: air eats blue first (1,1.5,4 scaled down
// for a 1 km world — these are per-metre constants tuned by eye)
export const extinction = (d) => new THREE.Vector3(
  Math.exp(-d * 2.6e-4), Math.exp(-d * 3.6e-4), Math.exp(-d * 7.2e-4)
);

const RANGE_VS = /* glsl */`
varying vec2 vUv; varying vec3 vWorld; varying vec3 vNorm;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNorm = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const RANGE_FS = /* glsl */`
uniform vec3 uFootCol, uCrownCol, uRockCol, uVeil, uSunCol, uSunDir, uExtinct;
uniform float uFogT, uVeilSun, uFootMist, uTreed, uRocky, uPaper, uSunTint, uDither;
uniform sampler2D uCloudTex; uniform vec2 uCloudOff; uniform float uCloudScale, uCloudAmt;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vNorm;
${HASH}
${NOISE}
void main() {
  float v = vUv.y;
  vec3 base = mix(uFootCol, uCrownCol, pow(v, 0.78));
  // forest texture climbing the lower slopes: darker clumps that dissolve
  // into individual noise flecks with height (the painted mass break-up)
  float trees = fbm2(vWorld.xz * vec2(0.055, 0.16) * uTreed, 4);
  float band = smoothstep(0.92, 0.28, v);
  base *= mix(1.0, 0.62 + 0.5 * trees, band * min(1.0, uTreed));
  base = mix(base, base * 1.22, smoothstep(0.45, 0.75, trees) * band * 0.5 * uTreed);
  // rock shows on the steep high faces
  float rockM = smoothstep(0.55, 0.92, v + (fbm2(vWorld.xz * 0.02, 3) - 0.5) * 0.4);
  base = mix(base, uRockCol, rockM * uRocky);
  // painterly light: lambert + sun tint, or three flat gouache bands
  float ndl = clamp(dot(normalize(vNorm), uSunDir), 0.0, 1.0);
  float lit;
  if (uPaper > 0.5) lit = ndl > 0.55 ? 1.06 : ndl > 0.22 ? 0.86 : 0.62;
  else lit = 0.38 + 0.72 * ndl;
  vec3 col = base * lit * mix(vec3(1.0), uSunCol, uSunTint);
  col *= uExtinct;
  // veil: thicker at the feet (mist pools in the valleys)
  float fog = clamp(uFogT + uFootMist * smoothstep(0.42, 0.0, v), 0.0, 1.0);
  vec2 rd = normalize(vWorld.xz - cameraPosition.xz);
  float sunAmt = pow(clamp(dot(rd, normalize(uSunDir.xz + vec2(1e-4))), 0.0, 1.0), 8.0);
  vec3 veil = mix(uVeil, uSunCol, sunAmt * uVeilSun);
  col = mix(col, veil, fog);
  // cloud shadows only dim what the veil hasn't already eaten
  float cs = texture2D(uCloudTex, vWorld.xz * uCloudScale + uCloudOff).a;
  col *= 1.0 - cs * uCloudAmt * (1.0 - fog * 0.55);
  col += (hash12(vWorld.xz) - 0.5) * uDither;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** One shared cloud-shadow field, painted top-down once (blobs), scrolled by wind. */
export class CloudField {
  constructor({ size = 512, scale = 1 / 1400, seed = 5 } = {}) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, size, size);
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    // elongated cumulus-shadow blobs, tileable in x and y
    for (let i = 0; i < 34; i++) {
      const x = rnd() * size, y = rnd() * size;
      const rx = 34 + rnd() * 92, ry = rx * (0.38 + rnd() * 0.3);
      const a = 0.32 + rnd() * 0.4;
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, rx * 0.08, x + ox, y + oy, rx);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.62, `rgba(0,0,0,${(a * 0.55).toFixed(3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(1, ry / rx); ctx.translate(-(x + ox), -(y + oy));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, rx, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    this.canvas = c;
    this.texture = new THREE.CanvasTexture(c);
    this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.colorSpace = THREE.NoColorSpace;
    this.offset = new THREE.Vector2(0.37, 0.11);
    this.scale = scale;
    this.wind = new THREE.Vector2(0.006, 0.0022); // texture units per second
  }
  update(dt) { this.offset.addScaledVector(this.wind, dt); }
}

/** Shared uniforms for every range material + the cloud-shadow patcher. */
export class Air {
  constructor(field) {
    this.field = field;
    this.shadowMats = new Set();
    this.u = {
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color(1, 1, 1) },
      uVeil: { value: new THREE.Color(0xaebcd4) },
      uVeilSun: { value: 0.85 },
      uSunTint: { value: 0.35 },
      uCloudTex: { value: field.texture },
      uCloudOff: { value: field.offset },
      uCloudScale: { value: field.scale },
      uCloudAmt: { value: 0.8 }
    };
    this.mats = [];
  }
  /** Call after the LightRig moves: veil follows the sky's horizon. */
  update(rig) {
    this.u.uSunDir.value.copy(rig.sunDir);
    this.u.uSunCol.value.copy(rig.palette.sun);
    // The veil is sky light in the line of sight: horizon warmed by a third
    // of the zenith, exactly the mix the game's fog already uses.
    this.u.uVeil.value.copy(rig.palette.fog);
    const low = THREE.MathUtils.clamp(1 - rig.sunDir.y * 2.4, 0, 1);
    this.u.uVeilSun.value = 0.5 + low * 0.9; // low sun → strong warm bend
  }
  /**
   * A painted range. dist: metres from the viewer (sets the veil).
   * palette: {foot, crown, rock}; opts: treed, rocky, paper, footMist, fogK.
   */
  rangeMaterial({ dist = 200, foot = 0x3a5a34, crown = 0x51763f, rock = 0x6a6a70, treed = 1, rocky = 0.5, paper = 0, footMist = 0, fogK = 1, dither = 0.008 } = {}) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: RANGE_VS, fragmentShader: RANGE_FS,
      uniforms: {
        ...this.u,
        uFootCol: { value: new THREE.Color(foot) },
        uCrownCol: { value: new THREE.Color(crown) },
        uRockCol: { value: new THREE.Color(rock) },
        uFogT: { value: Math.min(0.97, fogT(dist) * fogK) },
        uExtinct: { value: extinction(dist) },
        uFootMist: { value: footMist },
        uTreed: { value: treed }, uRocky: { value: rocky },
        uPaper: { value: paper }, uDither: { value: dither }
      }
    });
    mat.userData.fogT0 = mat.uniforms.uFogT.value;
    this.mats.push(mat);
    return mat;
  }

  /** Master cloud-shadow amount — range materials share uCloudAmt; the
   *  patched built-ins keep their own uniform, tracked here. */
  setClouds(amt) {
    this.u.uCloudAmt.value = amt;
    for (const m of this.shadowMats) m.userData.csUniforms?.uCsAmt && (m.userData.csUniforms.uCsAmt.value = amt);
  }
  /**
   * Cloud shadows on any lit built-in material (Standard, Lambert…).
   * Composes with an existing onBeforeCompile (e.g. the foliage shader).
   * `diffuseColor` is darkened before lighting, so it dims direct sun and a
   * share of ambient — cheap and close enough for paint.
   */
  applyCloudShadow(mat, amt = 0.8) {
    if (this.shadowMats.has(mat)) return mat;
    this.shadowMats.add(mat);
    const prevKey = mat.customProgramCacheKey?.bind(mat);
    mat.customProgramCacheKey = () => (prevKey ? prevKey() : 'mat') + `_cs${amt}`;
    const prev = mat.onBeforeCompile;
    const u = this.u;
    mat.onBeforeCompile = (shader, r) => {
      prev?.(shader, r);
      shader.uniforms.uCsTex = u.uCloudTex;
      shader.uniforms.uCsOff = u.uCloudOff;
      shader.uniforms.uCsScale = { value: this.field.scale };
      shader.uniforms.uCsAmt = { value: amt };
      mat.userData.csUniforms = shader.uniforms;
      shader.vertexShader = 'varying vec3 vCsW;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec4 csW = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            csW = instanceMatrix * csW;
          #endif
          vCsW = (modelMatrix * csW).xyz;
        }`);
      shader.fragmentShader = 'uniform sampler2D uCsTex; uniform vec2 uCsOff; uniform float uCsScale, uCsAmt; varying vec3 vCsW;\n' + shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb *= 1.0 - texture2D(uCsTex, vCsW.xz * uCsScale + uCsOff).a * uCsAmt;`);
    };
    mat.needsUpdate = true;
    return mat;
  }
}
