// The valley river, promoted from Lab 02's "The lab's river" (`kyoto`, the
// lab's recommendation): the CPU water field above drives flow-mapped ripple
// normals (Vlachos' two phases with a per-pixel phase offset), Beer-Lambert
// depth from the real carved bed, foam on the shallows and on the pillows and
// eddy lines round every post standing in the water, Fresnel sky reflection,
// a sun glitter road, moon glints at night, caustic dapple over the shallow
// bed and the classic's sparkle cells, now drifting with the current.
//
// Kept from the classic so gameplay and the other systems see the same river:
// the ribbon follows the same centreline (layout.footprint.anchors.riverCurve)
// at the same height (y = 0.02) and half-width (3.4 m), so isInWater(),
// wadeDepthAt(), shoreDistance(), rain-spot picking and the ripple pools are
// unchanged (they read riverSamples / RIVER_POINTS, never the mesh). The
// material is bound to `riverMat` through part `water`.
//
// Not promoted: the lab's half-resolution planar mirror (it re-renders the
// scene; the analytic sky is the lab's own cheap default) and the Kuwahara
// painterly pass (post-processing, v-sky's lane). The river does not receive
// shadows (neither does the classic one).
import { HASH, NOISE } from '../materials.js?v=20261113a';
import { RiverField, riverFrames, WATER_Y } from './field.js?v=20261113a';
import { waterSky, rootOf, WATER_GLSL, FOG_PREMULT } from './sky.js?v=20261113a';
import { rippleNormals, foamTexture } from './textures.js?v=20261113a';

export const HALF_W = 3.4;

// The game's RIVER_POINTS (countryside.js), for samples and a layout without a curve.
export const RIVER_POINTS = [[-60, 26], [-20, 30], [12, 32], [40, 28], [70, 30]];

// Per tier: ribbon sections and cross segments, field texels per metre downstream and across.
const DETAIL = {
  hero: { sections: 240, across: 4, resS: 4, nu: 24, defines: { CAUSTICS: 1, SPARKLE: 1, RINGS: 1 } },
  mid: { sections: 120, across: 2, resS: 3, nu: 16, defines: { SPARKLE: 1, RINGS: 1 } },
  far: { sections: 60, across: 1, resS: 2, nu: 8, defines: {} }
};

const VERT = /* glsl */`
#include <common>
#include <fog_pars_vertex>
attribute vec4 aRiver;
varying vec3 vWorld;
varying vec2 vRiver;
varying vec2 vTan;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorld = wp.xyz;
  vRiver = aRiver.xy;
  vTan = aRiver.zw;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
#include <common>
#include <fog_pars_fragment>
${HASH}
${NOISE}
${WATER_GLSL}
uniform sampler2D uField, uNormal, uFoamTex;
uniform vec2 uFieldScale;
uniform vec3 uDeep, uShallow;
uniform float uClarity, uFlowRate, uRough, uFoamAmt, uPaint, uHalfW;
varying vec3 vWorld;
varying vec2 vRiver;
varying vec2 vTan;

vec2 nslope(vec2 uv) { vec3 n = texture2D(uNormal, uv).xyz * 2. - 1.; return n.xy / max(n.z, 0.2); }

// Vlachos (Portal 2): two layers half a cycle apart, each pushed along the
// current and cross-faded so neither restart shows; a per-pixel phase offset
// stops the whole river "breathing" once a cycle.
vec2 flowSlope(vec2 q, vec2 flow, float t) {
  float ph = t * uFlowRate + texture2D(uFoamTex, q * 0.071).g * 1.9;
  float p0 = fract(ph), p1 = fract(ph + 0.5);
  float w0 = 1. - abs(2. * p0 - 1.);
  float T = 1. / uFlowRate;
  vec2 d0 = flow * (p0 - 0.5) * T, d1 = flow * (p1 - 0.5) * T;
  vec2 a = nslope((q - d0) / 2.6) * w0 + nslope((q - d1) / 2.6 + 0.37) * (1. - w0);
  vec2 b = nslope((q - d0) / 0.85 + 0.61) * w0 + nslope((q - d1) / 0.85 + 0.13) * (1. - w0);
  return a + b * 0.55;
}

vec4 flowFoam(vec2 q, vec2 flow, float t, float scale) {
  float ph = t * 0.31;
  float p0 = fract(ph), p1 = fract(ph + 0.5);
  float w0 = 1. - abs(2. * p0 - 1.);
  float T = 1. / 0.31;
  vec4 a = texture2D(uFoamTex, (q - flow * (p0 - 0.5) * T) * scale);
  vec4 b = texture2D(uFoamTex, (q - flow * (p1 - 0.5) * T) * scale + 0.5);
  return a * w0 + b * (1. - w0);
}

void main() {
  vec3 P = vWorld;
  vec2 q = vRiver;
  float t = uTime;
  vec4 F = texture2D(uField, vec2(q.x * uFieldScale.x, q.y * uFieldScale.y + 0.5));
  float depth = F.r;
  vec2 flow = F.gb;
  float speed = length(flow);
  // the ribbon's own edge: the classic feathers its last half metre too
  float edge = smoothstep(uHalfW, uHalfW - 0.5, abs(q.y));
  vec2 T2 = normalize(vTan), S2 = vec2(-T2.y, T2.x);

  // slopes in river space, turned into the world by the centreline frame
  vec3 V = normalize(cameraPosition - P);
  // grazing views see the ripples averaged out (what a normal map's mips do), so they calm toward the horizon
  vec2 sl = flowSlope(q, flow, t) * (0.16 + 0.75 * smoothstep(0.05, 1.3, speed)) * uRough * mix(0.4, 1., smoothstep(0.04, 0.45, V.y));
  vec2 wt = T2 * sl.x + S2 * sl.y;
  float crest = 0.;
  #ifdef RINGS
    wt += ringWaves(P.xz, crest) * 0.9;
  #endif
  wt += rainRings(P.xz, t) * uRain;
  vec3 N = normalize(vec3(wt.x, 1., wt.y));

  float NdV = max(dot(N, V), 0.);
  float fres = 0.02 + 0.98 * pow(1. - NdV, 5.);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = reflColor(R);
  // a painter's water is lighter where the view grazes it and darker underfoot
  float far = 1. - smoothstep(0.12, 0.85, V.y);
  refl = mix(refl, mix(uTop * 0.5, uSky * 1.05, far), uPaint * 0.45);
  refl = mix(refl, uWarm, uDusk * 0.2);

  vec3 amb = ambientWater();
  float absorb = 1. - exp(-depth * uClarity);
  vec3 body = mix(uShallow, uDeep, smoothstep(0.05, 0.95, depth)) * amb * 2.2;
  float sunUp = smoothstep(-0.05, 0.08, uSunDir.y);

  // foam: the shallows by the banks, the field's pillows and eddy lines, ring crests
  vec4 fm = flowFoam(q, flow, t, 0.6);
  // lapping at the banks: soft streaks broken by a few bubbles, not a lace of cells
  float lap = 0.5 + 0.5 * sin(q.x * 1.3 - t * 0.9 + fm.g * 4.);
  float shore = (1. - smoothstep(0.022, 0.06 + lap * 0.02, depth)) * smoothstep(0.55, 0.95, fm.g * 0.85 + lap * 0.2) * 0.5;
  float fieldFoam = smoothstep(0.2, 0.7, F.a * (0.5 + fm.r * 0.65 + fm.g * 0.45));
  float foam = max(shore, fieldFoam) * uFoamAmt;
  foam = max(foam, smoothstep(0.35, 1.2, crest) * 0.55);
  foam = clamp(foam, 0., 1.);

  vec3 H = normalize(normalize(uSunDir) + V);
  float nh = max(dot(N, H), 0.);
  float spec = pow(nh, 600.) * 5. + pow(nh, 60.) * 0.08;
  vec3 specCol = uSunColor * spec * sunUp * (0.8 + uDusk * 0.6);
  vec3 Hm = normalize(uMoonDir + V);
  specCol += vec3(0.8, 0.86, 1.) * pow(max(dot(N, Hm), 0.), 320.) * 7. * uMoonI;
  #ifdef SPARKLE
    // the classic's sparkle cells, drifting with the current in river space
    vec2 cell = floor(vec2(q.x * 10. - t * (1.2 + speed * 2.4), q.y * 10.));
    float sparkle = step(0.992, hash12(cell + floor(t * 9.) * 0.17)) * smoothstep(0.1, 0.5, length(sl));
    specCol += uSunColor * sparkle * 0.6 * sunUp;
  #endif

  // premultiplied: the body covers the bed by absorption, reflection and foam sit on top
  float aBody = absorb * (1. - fres);
  vec3 col = body * aBody + refl * fres + specCol;
  float a = aBody + fres;
  vec3 foamCol = (uSky * 0.45 + uTop * 0.3 + uSunColor * 0.38 * max(uSunDir.y, 0.)) * 0.95 + 0.04 + uMoonI * 0.08;
  col = col * (1. - foam) + foamCol * foam;
  a = a * (1. - foam) + foam;
  #ifdef CAUSTICS
    // light nets on the shallow bed, seen through the water (added light)
    vec3 v1 = voronoi2(P.xz * 1.7 + t * vec2(0.23, 0.11));
    vec3 v2 = voronoi2(P.xz * 2.31 + t * vec2(-0.19, 0.27));
    float caus = (1. - smoothstep(0., 0.17, v1.y - v1.x)) * (1. - smoothstep(0., 0.17, v2.y - v2.x));
    col += uSunColor * caus * 0.1 * sunUp * max(uSunDir.y, 0.) * (1. - absorb) * smoothstep(0.03, 0.15, depth) * smoothstep(0.15, 0.6, V.y) * (1. - foam);
  #endif
  // a thin ink line where the water meets the bank (Ghibli backgrounds)
  col *= 1. - (1. - smoothstep(0.022, 0.05, depth)) * uPaint * 0.35;
  col *= edge; a *= edge;
  col = min(col, vec3(1.6));
  ${FOG_PREMULT}
  gl_FragColor = vec4(col, clamp(a, 0., 1.));
}`;

/** The river ribbon in world space: position, normal, uv and aRiver = (s, u, tangent x, tangent z). */
function ribbonGeometry(T, frames, across, halfW) {
  const n = frames.n, m = across + 1;
  const pos = new Float32Array(n * m * 3), nor = new Float32Array(n * m * 3), uv = new Float32Array(n * m * 2), rv = new Float32Array(n * m * 4);
  const idx = [];
  for (let i = 0; i < n; i++) {
    const tx = frames.tx[i], tz = frames.tz[i], sx = -tz, sz = tx;
    for (let j = 0; j < m; j++) {
      const u = (j / across * 2 - 1) * halfW, k = i * m + j;
      pos[k * 3] = frames.px[i] + sx * u; pos[k * 3 + 1] = WATER_Y; pos[k * 3 + 2] = frames.pz[i] + sz * u;
      nor[k * 3 + 1] = 1;
      uv[k * 2] = j / across; uv[k * 2 + 1] = frames.s[i] / frames.length * 40; // the classic's uv (v = 40 along)
      rv[k * 4] = frames.s[i]; rv[k * 4 + 1] = u; rv[k * 4 + 2] = tx; rv[k * 4 + 3] = tz;
      if (i < n - 1 && j < across) {
        const a = k, b = k + 1, c = k + m, d = k + m + 1;
        idx.push(a, b, c, b, d, c); // counter-clockwise seen from above (the classic ribbon's winding)
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setAttribute('aRiver', new T.BufferAttribute(rv, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** The centreline the layout carries (the classic curve), else the game's RIVER_POINTS. */
function curveOf(T, layout) {
  const c = layout && layout.footprint && layout.footprint.anchors && layout.footprint.anchors.riverCurve;
  if (c && typeof c.getPointAt === 'function') return c;
  const pts = (layout && Array.isArray(layout.points) && layout.points.length > 1 ? layout.points : RIVER_POINTS)
    .map((p) => new T.Vector3(p[0], 0, p.length > 2 ? p[2] : p[1]));
  return new T.CatmullRomCurve3(pts);
}

export function buildRiver(ctx, layout, p) {
  const { THREE: T, tier, kitMaterials: km } = ctx;
  const det = DETAIL[tier] || DETAIL.mid;
  const frames = riverFrames(curveOf(T, layout), det.sections);
  const field = new RiverField(frames, { halfW: HALF_W, resS: det.resS, nu: det.nu, speed: p.flow });
  const sky = waterSky(km);
  const uniforms = Object.assign(T.UniformsUtils.clone(T.UniformsLib.fog), sky.u, {
    uField: { value: field.texture },
    uFieldScale: { value: new T.Vector2(1 / frames.length, 1 / (2 * HALF_W)) },
    uNormal: { value: rippleNormals(km) },
    uFoamTex: { value: foamTexture(km) },
    uDeep: { value: new T.Color(p.deep) },
    uShallow: { value: new T.Color(p.shallow) },
    uClarity: { value: p.clarity },
    uFlowRate: { value: 0.62 },
    uRough: { value: p.rough },
    uFoamAmt: { value: p.foam },
    uPaint: { value: p.paint },
    uHalfW: { value: HALF_W }
  });
  const material = new T.ShaderMaterial({
    name: `kit-water:river(${tier} clarity=${p.clarity} flow=${p.flow} foam=${p.foam} paint=${p.paint} rough=${p.rough} deep=${p.deep} shallow=${p.shallow})`,
    uniforms, vertexShader: VERT, fragmentShader: FRAG, defines: { ...det.defines },
    transparent: true, premultipliedAlpha: true, fog: true
  });
  const water = new T.Mesh(ribbonGeometry(T, frames, det.across, HALF_W), material);
  water.receiveShadow = false;
  water.castShadow = false;
  const group = new T.Group();
  group.add(water);
  // the field is exposed so floating things (petals, lanterns) can ride the same current
  group.userData.riverField = field;

  let piersFound = 0, piersTries = 0, nextLook = 0;
  return {
    group,
    parts: { water },
    sockets: {},
    live: [water],
    field,
    update(dt, t, env) {
      const root = rootOf(group);
      sky.sync(t, env, root);
      // the bridge (a component placed after the river) leaves its piers on its
      // group as `userData.waterObstacles`; read them once it is in the scene
      if (root && !piersFound && piersTries < 4 && t >= nextLook) {
        piersTries++; nextLook = t + 1.5;
        const posts = [];
        const v = new T.Vector3();
        for (const o of root.children) {
          const list = o.userData && o.userData.waterObstacles;
          if (!Array.isArray(list)) continue;
          o.updateMatrixWorld(true);
          for (const ob of list) {
            v.set(ob.x, 0, ob.z).applyMatrix4(o.matrixWorld);
            const at = field.locate(v.x, v.z);
            if (at) posts.push({ s: at.s, u: at.u, r: ob.r });
          }
        }
        if (posts.length) { piersFound = posts.length; field.setObstacles(posts); }
      }
    },
    dispose() { material.dispose(); field.dispose(); }
  };
}
