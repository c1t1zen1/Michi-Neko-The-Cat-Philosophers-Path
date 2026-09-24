import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/**
 * Screen-space finishing passes that give the valley its cinematic depth:
 *
 *  - AOPass: depth-only ambient occlusion (normals reconstructed from the
 *    depth buffer, so no extra scene render) with a bilateral blur. Grounds
 *    every object with contact shadow under eaves, bushes, paws and stones.
 *  - AtmospherePass: physically-shaped height fog with sun in-scatter and
 *    screen-space crepuscular light shafts, driven by the sky palette.
 *  - GradeShader: filmic contrast, split-toning, vignette, chromatic fringe
 *    and grain applied after tone mapping.
 */

const DEPTH_HELPERS = /* glsl */`
  uniform sampler2D tDepth;
  uniform mat4 uInvProj;
  uniform vec2 uResolution;

  float readDepth(vec2 uv) { return texture2D(tDepth, uv).x; }

  vec3 viewPos(vec2 uv, float d) {
    vec4 clip = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    vec4 v = uInvProj * clip;
    return v.xyz / v.w;
  }
`;

// ---------------------------------------------------------------------------
// Ambient occlusion
// ---------------------------------------------------------------------------

const AOShader = {
  uniforms: {
    tDepth: { value: null },
    uInvProj: { value: new THREE.Matrix4() },
    uProj: { value: new THREE.Matrix4() },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uKernel: { value: [] },
    uRadius: { value: 0.55 },
    uBias: { value: 0.015 },
    uIntensity: { value: 1.0 },
    uTime: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    ${DEPTH_HELPERS}
    uniform mat4 uProj;
    uniform vec3 uKernel[SAMPLES];
    uniform float uRadius;
    uniform float uBias;
    uniform float uIntensity;
    uniform float uTime;
    varying vec2 vUv;

    vec3 reconstructNormal(vec2 uv, vec3 P) {
      vec2 px = 1.0 / uResolution;
      vec3 Pr = viewPos(uv + vec2(px.x, 0.0), readDepth(uv + vec2(px.x, 0.0)));
      vec3 Pl = viewPos(uv - vec2(px.x, 0.0), readDepth(uv - vec2(px.x, 0.0)));
      vec3 Pu = viewPos(uv + vec2(0.0, px.y), readDepth(uv + vec2(0.0, px.y)));
      vec3 Pd = viewPos(uv - vec2(0.0, px.y), readDepth(uv - vec2(0.0, px.y)));
      vec3 dx = (abs(Pr.z - P.z) < abs(Pl.z - P.z)) ? Pr - P : P - Pl;
      vec3 dy = (abs(Pu.z - P.z) < abs(Pd.z - P.z)) ? Pu - P : P - Pd;
      return normalize(cross(dx, dy));
    }

    // Interleaved gradient noise: stable, high-frequency per-pixel rotation
    float ign(vec2 p) {
      return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
    }

    void main() {
      float d = readDepth(vUv);
      if (d > 0.99999) { gl_FragColor = vec4(1.0); return; }
      vec3 P = viewPos(vUv, d);
      vec3 N = reconstructNormal(vUv, P);

      float angle = ign(gl_FragCoord.xy) * 6.2831853;
      vec3 rvec = vec3(cos(angle), sin(angle), 0.0);
      vec3 T = normalize(rvec - N * dot(rvec, N));
      vec3 B = cross(N, T);
      mat3 tbn = mat3(T, B, N);

      // Shrink the radius for distant pixels so the effect stays subtle far away
      float radius = uRadius * clamp(1.0 + (-P.z) * 0.02, 1.0, 2.2);
      float occlusion = 0.0;
      for (int i = 0; i < SAMPLES; i++) {
        vec3 s = P + tbn * uKernel[i] * radius;
        vec4 o = uProj * vec4(s, 1.0);
        vec2 suv = o.xy / o.w * 0.5 + 0.5;
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
        float sd = readDepth(suv);
        vec3 sp = viewPos(suv, sd);
        float rangeCheck = smoothstep(0.0, 1.0, radius / max(abs(P.z - sp.z), 1e-4));
        occlusion += (sp.z >= s.z + uBias ? 1.0 : 0.0) * rangeCheck;
      }
      occlusion /= float(SAMPLES);
      float ao = 1.0 - occlusion * uIntensity;
      gl_FragColor = vec4(vec3(clamp(ao, 0.0, 1.0)), 1.0);
    }
  `
};

const AOBlurShader = {
  uniforms: {
    tAO: { value: null },
    tDepth: { value: null },
    uInvProj: { value: new THREE.Matrix4() },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDir: { value: new THREE.Vector2(1, 0) }
  },
  vertexShader: AOShader.vertexShader,
  fragmentShader: /* glsl */`
    ${DEPTH_HELPERS}
    uniform sampler2D tAO;
    uniform vec2 uDir;
    varying vec2 vUv;
    void main() {
      float cd = readDepth(vUv);
      float cz = viewPos(vUv, cd).z;
      vec2 px = uDir / uResolution;
      float sum = 0.0, wsum = 0.0;
      for (int i = -4; i <= 4; i++) {
        vec2 uv = vUv + px * float(i) * 1.5;
        float z = viewPos(uv, readDepth(uv)).z;
        float w = exp(-float(i * i) * 0.12) * exp(-abs(z - cz) * 2.5);
        sum += texture2D(tAO, uv).x * w;
        wsum += w;
      }
      gl_FragColor = vec4(vec3(sum / max(wsum, 1e-4)), 1.0);
    }
  `
};

export class AOPass extends Pass {
  constructor(camera, width, height, { scale = 0.5, samples = 12 } = {}) {
    super();
    this.camera = camera;
    this.needsSwap = false;
    this.scale = scale;
    this.samples = samples;
    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtA.texture.name = 'AOPass.a';
    this.rtB.texture.name = 'AOPass.b';

    this.aoMaterial = new THREE.ShaderMaterial({
      defines: { SAMPLES: samples },
      uniforms: THREE.UniformsUtils.clone(AOShader.uniforms),
      vertexShader: AOShader.vertexShader,
      fragmentShader: AOShader.fragmentShader,
      depthTest: false,
      depthWrite: false
    });
    this.aoMaterial.uniforms.uKernel.value = this.buildKernel(samples);
    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AOBlurShader.uniforms),
      vertexShader: AOBlurShader.vertexShader,
      fragmentShader: AOBlurShader.fragmentShader,
      depthTest: false,
      depthWrite: false
    });
    this.fsQuad = new FullScreenQuad(null);
    this.texture = this.rtA.texture;
    this.setSize(width, height);
  }

  buildKernel(n) {
    // Cosine-weighted hemisphere samples, biased toward the centre so small
    // crevices dominate (the classic SSAO kernel distribution)
    const kernel = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const phi = i * 2.399963; // golden angle
      const r = Math.sqrt(u);
      const x = Math.cos(phi) * r, y = Math.sin(phi) * r;
      const z = Math.sqrt(Math.max(0, 1 - u));
      let s = (i + 1) / n;
      s = 0.1 + 0.9 * s * s;
      kernel.push(new THREE.Vector3(x * s, y * s, Math.max(z, 0.15) * s));
    }
    return kernel;
  }

  setSamples(n) {
    if (n === this.samples) return;
    this.samples = n;
    this.aoMaterial.defines.SAMPLES = n;
    this.aoMaterial.uniforms.uKernel.value = this.buildKernel(n);
    this.aoMaterial.needsUpdate = true;
  }

  setSize(width, height) {
    const w = Math.max(1, Math.round(width * this.scale));
    const h = Math.max(1, Math.round(height * this.scale));
    this.rtA.setSize(w, h);
    this.rtB.setSize(w, h);
    this.aoMaterial.uniforms.uResolution.value.set(w, h);
    this.blurMaterial.uniforms.uResolution.value.set(w, h);
  }

  render(renderer, writeBuffer, readBuffer) {
    const depth = readBuffer.depthTexture;
    if (!depth) return;
    const cam = this.camera;
    const u = this.aoMaterial.uniforms;
    u.tDepth.value = depth;
    u.uProj.value.copy(cam.projectionMatrix);
    u.uInvProj.value.copy(cam.projectionMatrixInverse);
    this.blurMaterial.uniforms.tDepth.value = depth;
    this.blurMaterial.uniforms.uInvProj.value.copy(cam.projectionMatrixInverse);

    renderer.setRenderTarget(this.rtA);
    this.fsQuad.material = this.aoMaterial;
    this.fsQuad.render(renderer);

    this.fsQuad.material = this.blurMaterial;
    this.blurMaterial.uniforms.tAO.value = this.rtA.texture;
    this.blurMaterial.uniforms.uDir.value.set(1, 0);
    renderer.setRenderTarget(this.rtB);
    this.fsQuad.render(renderer);

    this.blurMaterial.uniforms.tAO.value = this.rtB.texture;
    this.blurMaterial.uniforms.uDir.value.set(0, 1);
    renderer.setRenderTarget(this.rtA);
    this.fsQuad.render(renderer);
    this.texture = this.rtA.texture;
  }

  dispose() {
    this.rtA.dispose();
    this.rtB.dispose();
    this.aoMaterial.dispose();
    this.blurMaterial.dispose();
    this.fsQuad.dispose();
  }
}

// ---------------------------------------------------------------------------
// Atmosphere: height fog + sun in-scatter + light shafts + AO composite
// ---------------------------------------------------------------------------

const AtmosphereShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    tAO: { value: null },
    uInvProj: { value: new THREE.Matrix4() },
    uInvView: { value: new THREE.Matrix4() },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uCamPos: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunScreen: { value: new THREE.Vector2(0.5, 0.5) },
    uSunVisible: { value: 0 },
    uFogColor: { value: new THREE.Color(0xf2b98a) },
    uHazeColor: { value: new THREE.Color(0x9aa4c4) },
    uFogSunColor: { value: new THREE.Color(0xffc27a) },
    uDensity: { value: 0.012 },
    uHeightFalloff: { value: 0.09 },
    uFogBase: { value: 0.0 },
    uAOStrength: { value: 0.0 },
    uShaftStrength: { value: 0.0 },
    uTime: { value: 0 }
  },
  vertexShader: AOShader.vertexShader,
  fragmentShader: /* glsl */`
    ${DEPTH_HELPERS}
    uniform sampler2D tDiffuse;
    uniform sampler2D tAO;
    uniform mat4 uInvView;
    uniform vec3 uCamPos;
    uniform vec3 uSunDir;
    uniform vec2 uSunScreen;
    uniform float uSunVisible;
    uniform vec3 uFogColor;
    uniform vec3 uHazeColor;
    uniform vec3 uFogSunColor;
    uniform float uDensity;
    uniform float uHeightFalloff;
    uniform float uFogBase;
    uniform float uAOStrength;
    uniform float uShaftStrength;
    uniform float uTime;
    varying vec2 vUv;

    float ign(vec2 p) {
      return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
    }

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      float d = readDepth(vUv);
      bool sky = d > 0.99999;
      vec3 P = viewPos(vUv, d);
      vec3 W = (uInvView * vec4(P, 1.0)).xyz;
      float dist = length(P);
      vec3 rayDir = normalize(W - uCamPos);

      // Depth-aware AO upsample: 4 taps, keep the ones on the same surface
      if (uAOStrength > 0.0 && !sky) {
        vec2 px = 1.0 / uResolution;
        float ao = 0.0, wsum = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = vec2(i == 1 || i == 3 ? px.x : -px.x, i >= 2 ? px.y : -px.y) * 1.0;
          float z = viewPos(vUv + o, readDepth(vUv + o)).z;
          float w = exp(-abs(z - P.z) * 3.0) + 0.02;
          ao += texture2D(tAO, vUv + o).x * w;
          wsum += w;
        }
        ao /= wsum;
        // Keep occlusion soft and painterly, never crunchy black
        col.rgb *= mix(1.0, ao * ao * 0.7 + ao * 0.3, uAOStrength);
      }

      // Exponential height fog integrated along the view ray (warm valley
      // mist) plus a distance-only aerial perspective that pulls far ridges
      // toward the cool sky haze, the way painted backgrounds recede.
      float fogAmount = 0.0;
      float aerial = 0.0;
      if (!sky) {
        float b = uHeightFalloff;
        float camH = uCamPos.y - uFogBase;
        float dy = rayDir.y;
        float base = uDensity * exp(-camH * b);
        float integral = abs(dy * b) < 1e-3
          ? base * dist
          : base * (1.0 - exp(-dist * dy * b)) / (dy * b);
        fogAmount = 1.0 - exp(-max(integral, 0.0));
        aerial = 1.0 - exp(-dist * uDensity * 0.42);
      }
      float sunAmt = max(dot(rayDir, uSunDir), 0.0);
      float sunGlow = pow(sunAmt, 6.0) * uSunVisible;
      vec3 fogCol = mix(uFogColor, uFogSunColor, sunGlow);
      vec3 hazeCol = mix(uHazeColor, uFogSunColor, sunGlow * 0.8);
      float dither = (ign(gl_FragCoord.xy) - 0.5) * 0.01; // debanding
      col.rgb = mix(col.rgb, hazeCol, clamp(aerial + dither, 0.0, 1.0));
      col.rgb = mix(col.rgb, fogCol, clamp(fogAmount + dither, 0.0, 1.0));

      // Crepuscular light shafts: march toward the sun in screen space and
      // accumulate sky visibility. Occluders (roofs, trees) carve dark rays.
      if (uShaftStrength > 0.0 && uSunVisible > 0.0) {
        vec2 toSun = uSunScreen - vUv;
        float len = length(toSun);
        float radial = smoothstep(1.25, 0.0, len);
        if (radial > 0.001) {
          const int STEPS = 22;
          vec2 stepUv = toSun / float(STEPS);
          vec2 uv = vUv + stepUv * ign(gl_FragCoord.xy + uTime);
          float illum = 0.0, w = 1.0, wsum = 0.0;
          for (int i = 0; i < STEPS; i++) {
            uv += stepUv;
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
            float dd = readDepth(uv);
            illum += (dd > 0.99999 ? 1.0 : 0.0) * w;
            wsum += w;
            w *= 0.95;
          }
          illum = wsum > 0.0 ? illum / wsum : 0.0;
          float glow = illum * radial * radial * uShaftStrength * uSunVisible;
          col.rgb += uFogSunColor * glow * (sky ? 0.55 : 1.0);
        }
      }

      gl_FragColor = col;
    }
  `
};

export class AtmospherePass extends Pass {
  constructor(camera, width, height) {
    super();
    this.camera = camera;
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AtmosphereShader.uniforms),
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      depthTest: false,
      depthWrite: false
    });
    this.fsQuad = new FullScreenQuad(this.material);
    this.aoPass = null;
    this.aoStrength = 0.9;
    this._sunNdc = new THREE.Vector3();
    this.setSize(width, height);
  }

  setSize(width, height) {
    this.material.uniforms.uResolution.value.set(width, height);
  }

  /**
   * Pull fog + sun state from the sky each frame. `strengths` lets the
   * quality tier scale AO and shafts (0 disables).
   */
  updateFromSky(sky, camera, { ao = 1, shafts = 1 } = {}) {
    const u = this.material.uniforms;
    const p = sky.resolvePalette();
    const sunY = sky.sunDir.y;
    const sunUp = Math.max(0, sunY);
    const golden = THREE.MathUtils.clamp((0.42 - sunUp) / 0.42, 0, 1) * THREE.MathUtils.clamp(sunUp / 0.06, 0, 1);
    const night = THREE.MathUtils.clamp(-sunY * 4, 0, 1);

    u.uSunDir.value.copy(sky.sunDir).normalize();
    // Aerial perspective leans toward the pale horizon, not the saturated
    // palette fog, so daylight stays clean and only dusk turns amber.
    // (Constants hoisted — allocating Colors here ran every frame.)
    u.uFogColor.value.copy(p.fog).lerp(p.horizon, 0.45).lerp(AERIAL_TINT, 0.35 * (1 - golden) * (1 - night));
    // Far haze sits between the sky's zenith and horizon tints: blue-violet
    // by day, mauve at dusk, ink-blue at night
    u.uHazeColor.value.copy(p.top).lerp(p.mid, 0.45).lerp(HAZE_TINT, 0.35 * (1 - night));
    u.uFogSunColor.value.copy(p.warm).lerp(p.sun, 0.35).multiplyScalar(0.5 + golden * 0.8);
    // Night fog is a cool, thin blue; weather thickens it
    const weatherFog = { clear: 1, cloudy: 1.6, mist: 5.0, snow: 2.8, rain: 3.0 };
    const from = weatherFog[sky.weather] || 1;
    const to = weatherFog[sky.targetWeather] || 1;
    const wf = from + (to - from) * (sky.weatherBlend != null ? sky.weatherBlend : 1);
    u.uDensity.value = (0.0034 + golden * 0.0026 - night * 0.0008) * wf;
    u.uHeightFalloff.value = 0.16 - (wf > 2 ? 0.06 : 0);
    u.uFogBase.value = -0.5;
    u.uAOStrength.value = this.aoStrength * ao;
    u.uShaftStrength.value = (0.22 + golden * 0.5 + (wf > 2 ? 0.25 : 0)) * shafts * (1 - night);
    u.uSunVisible.value = sunUp > 0.01 ? Math.min(1, sunUp / 0.05) : 0;
    u.uTime.value = performance.now() * 0.001;

    // Sun position on screen for the light-shaft march
    this._sunNdc.copy(sky.sunDir).multiplyScalar(1000).add(camera.position).project(camera);
    const behind = this._sunNdc.z > 1;
    u.uSunScreen.value.set(this._sunNdc.x * 0.5 + 0.5, this._sunNdc.y * 0.5 + 0.5);
    if (behind) u.uSunVisible.value = 0;
  }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture;
    u.tAO.value = this.aoPass ? this.aoPass.texture : null;
    if (!this.aoPass || !this.aoPass.enabled) u.uAOStrength.value = 0;
    u.uInvProj.value.copy(this.camera.projectionMatrixInverse);
    u.uInvView.value.copy(this.camera.matrixWorld);
    u.uCamPos.value.setFromMatrixPosition(this.camera.matrixWorld);
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

// ---------------------------------------------------------------------------
// Final grade
// ---------------------------------------------------------------------------

// Palette constants hoisted out of AtmospherePass.updateFromSky (was: two
// THREE.Color allocations per frame).
const AERIAL_TINT = new THREE.Color(0xdde6ee);
const HAZE_TINT = new THREE.Color(0xb8c0dc);

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.38 },
    uGrain: { value: 0.028 },
    uFringe: { value: 0.0012 },
    uWarmth: { value: 0.75 },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.12 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uFringe;
    uniform float uWarmth;
    uniform float uContrast;
    uniform float uSaturation;
    varying vec2 vUv;

    float gradeHash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 centre = vUv - 0.5;
      float r2 = dot(centre, centre);
      // Lateral chromatic fringe, strongest at the frame edges
      vec2 fr = centre * uFringe * r2 * 8.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + fr).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - fr).b;

      float lum = dot(col, vec3(0.299, 0.587, 0.114));

      // Filmic S-curve contrast around mid grey
      col = mix(vec3(0.5), col, uContrast);
      col = clamp(col, 0.0, 1.0);

      // Golden-hour split tone: amber highlights, gentle plum shadows
      col += vec3(0.05, 0.024, -0.014) * smoothstep(0.38, 1.0, lum) * uWarmth;
      col = mix(col, col * vec3(1.02, 0.975, 1.06), smoothstep(0.55, 0.0, lum) * 0.3);

      // Painterly saturation lift keyed to mid tones
      float midMask = smoothstep(0.04, 0.4, lum) * (1.0 - smoothstep(0.62, 1.0, lum));
      col = mix(vec3(lum), col, 1.0 + midMask * (uSaturation - 1.0));

      // Soft-edged cinematic vignette
      float vig = smoothstep(0.95, 0.3, sqrt(r2) * 1.02);
      col *= mix(1.0, vig, uVignette);

      // Fine animated grain, denser in shadows
      float grain = gradeHash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 13.7) * 91.0) - 0.5;
      col += grain * uGrain * (1.0 - lum * 0.65);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};

// ---------------------------------------------------------------------------
// Merged output + grade pass
// ---------------------------------------------------------------------------

// OutputPass (tone map + sRGB encode) and GradeShader fused into a single
// fullscreen pass: one less render-target round-trip per frame. Tone mapping
// and the sRGB encode call three.js's own prefix-injected helpers — a
// tone-mapped ShaderMaterial pulls in tonemapping_pars_fragment, which
// defines ACESFilmicToneMapping (driven by renderer.toneMappingExposure) and
// saturate. Redefining them here collided with the prefix and broke the
// program, so the pass simply calls the prefix versions.
export const GradeOutputShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.38 },
    uGrain: { value: 0.028 },
    uFringe: { value: 0.0012 },
    uWarmth: { value: 0.75 },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.12 }
  },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uFringe;
    uniform float uWarmth;
    uniform float uContrast;
    uniform float uSaturation;
    varying vec2 vUv;

    // sRGB OETF (three.js r160 colourspace math, vec3 flavour)
    vec3 gradeToSRGB(vec3 value) {
      vec3 lt = vec3(lessThanEqual(value.rgb, vec3(0.0031308)));
      vec3 v1 = value.rgb * 12.92;
      vec3 v2 = pow(value.rgb, vec3(0.41666)) * 1.055 - 0.055;
      return mix(v2, v1, lt);
    }

    float gradeHash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 centre = vUv - 0.5;
      float r2 = dot(centre, centre);
      // Lateral chromatic fringe, strongest at the frame edges
      vec2 fr = centre * uFringe * r2 * 8.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + fr).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - fr).b;

      // Tone map + encode to sRGB (what OutputPass did) before grading, so
      // the grade math sees exactly the same values as before the merge.
      // ACESFilmicToneMapping + toneMappingExposure come from the prefix.
      col = ACESFilmicToneMapping(col);
      col = gradeToSRGB(col);

      float lum = dot(col, vec3(0.299, 0.587, 0.114));

      // Filmic S-curve contrast around mid grey
      col = mix(vec3(0.5), col, uContrast);
      col = clamp(col, 0.0, 1.0);

      // Golden-hour split tone: amber highlights, gentle plum shadows
      col += vec3(0.05, 0.024, -0.014) * smoothstep(0.38, 1.0, lum) * uWarmth;
      col = mix(col, col * vec3(1.02, 0.975, 1.06), smoothstep(0.55, 0.0, lum) * 0.3);

      // Painterly saturation lift keyed to mid tones
      float midMask = smoothstep(0.04, 0.4, lum) * (1.0 - smoothstep(0.62, 1.0, lum));
      col = mix(vec3(lum), col, 1.0 + midMask * (uSaturation - 1.0));

      // Soft-edged cinematic vignette
      float vig = smoothstep(0.95, 0.3, sqrt(r2) * 1.02);
      col *= mix(1.0, vig, uVignette);

      // Fine animated grain, denser in shadows
      float grain = gradeHash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 13.7) * 91.0) - 0.5;
      col += grain * uGrain * (1.0 - lum * 0.65);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
