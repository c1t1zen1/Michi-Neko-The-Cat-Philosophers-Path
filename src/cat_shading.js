import * as THREE from 'three';

/**
 * Cat materials: a soft three-band toon ramp, a procedural tabby coat
 * painted in bind-pose coordinates (so it rides the skinned animation), the
 * hand-painted anime eyes and mouth lines drawn straight onto the head,
 * an ink outline that thickens a touch with distance like a cel line, and
 * the textured silk collar + engraved suzu bell.
 */

// Soft toon ramp: three bands with feathered transitions — cel shading that
// still reads as painted rather than hard-edged.
let toonGradientTexture = null;
export function getToonGradient() {
  if (!toonGradientTexture) {
    const w = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, 1);
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let i = 0; i < w; i++) {
      const x = i / (w - 1);
      let v = 0.42;
      v += smooth(0.32, 0.46, x) * 0.33;
      v += smooth(0.52, 0.72, x) * 0.25;
      const b = Math.round(v * 255);
      img.data[i * 4] = b; img.data[i * 4 + 1] = b; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    toonGradientTexture = new THREE.CanvasTexture(canvas);
    toonGradientTexture.minFilter = THREE.LinearFilter;
    toonGradientTexture.magFilter = THREE.LinearFilter;
    toonGradientTexture.generateMipmaps = false;
  }
  return toonGradientTexture;
}

// Shared rim-light uniforms so the whole scene's time-of-day can warm the
// cat's silhouette edges from one place.
export const catRimUniforms = {
  uRimColor: { value: new THREE.Color(0xffb264) },
  uRimDir: { value: new THREE.Vector3(-0.55, 0.28, -0.79) },
  uRimStrength: { value: 0.55 }
};

const RIM_PARS = /* glsl */`
  uniform vec3 uRimColor;
  uniform vec3 uRimDir;
  uniform float uRimStrength;
`;
// vViewPosition points from the surface toward the camera, so the rim is
// strongest where the normal turns away from the viewer.
const RIM_APPLY = /* glsl */`
  {
    vec3 rimView = normalize(vViewPosition);
    float fres = pow(1.0 - clamp(dot(rimView, normal), 0.0, 1.0), 2.6);
    vec3 rimDirV = normalize((viewMatrix * vec4(uRimDir, 0.0)).xyz);
    float sunSide = clamp(dot(normal, rimDirV) * 0.5 + 0.5, 0.0, 1.0);
    outgoingLight += uRimColor * fres * (0.25 + sunSide * 0.75) * uRimStrength;
    // Sun-warmed surface, scaled by its own colour so dark things stay dark
    outgoingLight += diffuseColor.rgb * uRimColor * sunSide * uRimStrength * 0.2;
  }
`;

function bindRim(shader) {
  shader.uniforms.uRimColor = catRimUniforms.uRimColor;
  shader.uniforms.uRimDir = catRimUniforms.uRimDir;
  shader.uniforms.uRimStrength = catRimUniforms.uRimStrength;
}

/** Plain toon material (nose, pads, collar) with the shared rim light. */
export function toonMat(color, opts = {}) {
  const { noRim, ...matOpts } = opts;
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradient(),
    ...matOpts
  });
  if (noRim) return mat;
  mat.onBeforeCompile = (shader) => {
    bindRim(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_toon_pars_fragment>', '#include <lights_toon_pars_fragment>\n' + RIM_PARS)
      .replace('#include <opaque_fragment>', RIM_APPLY + '\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'cat-toon-rim';
  return mat;
}

export const FUR_PART = { body: 0, head: 1, tail: 2, ear: 3 };

const FUR_PARS = /* glsl */`
  uniform vec3 uFur;
  uniform vec3 uBelly;
  uniform vec3 uStripe;
  uniform float uStripeAmount;
  uniform vec4 uStripeZ;     // the four back stripes (body-space z)
  uniform vec4 uTrunk;       // trunk centre y, girth, head scale, tail rings
  uniform vec3 uEyeC;        // +x eye centre (head space), on the skin
  uniform vec3 uEyeR;        // eye frame: toward the outer corner
  uniform vec3 uEyeU;        //            up
  uniform vec3 uEyeN;        //            out of the face
  uniform vec2 uEyeSize;     // half width / half height
  uniform vec3 uEyeColor;
  uniform vec4 uEyeState;    // blink, lower-lid lift, pupil scale, sleep-curve
  uniform vec2 uLook;        // gaze offset in eye units
  uniform vec3 uNose;        // nose leather centre (head space)
  uniform float uMouth;      // 0 closed → 1 wide open
  uniform float uCool;       // dark coats: cool blue-black sheen (0..1)
  varying vec3 vBody;
  varying vec2 vFur;
  vec3 gCatGlow;

  float furHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float furNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(furHash(i), furHash(i + vec2(1.0, 0.0)), f.x),
               mix(furHash(i + vec2(0.0, 1.0)), furHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float ellipseMask(vec3 p, vec3 c, vec3 r, float soft) {
    vec3 d = (p - c) / r;
    return 1.0 - smoothstep(1.0 - soft, 1.0 + soft, length(d));
  }
  // Anti-aliased band of half-width w around 0 (screen-space softened)
  float band(float d, float w) {
    float aa = max(fwidth(d), 1e-5);
    return 1.0 - smoothstep(w - aa, w + aa, abs(d));
  }
  float segDist(vec3 p, vec3 a, vec3 b) {
    vec3 pa = p - a, ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * t);
  }

  // ---- body: four bold back stripes, cream bib / belly / socks, leg bars
  vec3 furBody(vec3 p, vec2 fur) {
    float trunkY = uTrunk.x;
    float g = uTrunk.y;
    float leg = clamp(fur.x, 0.0, 1.0);
    float lc = fur.y;
    float n = furNoise(p.zy * 26.0 + p.x * 7.0);
    float n2 = furNoise(p.zx * 9.0 + 3.1);
    vec3 col = uFur;
    // Coat deepens a little along the topline
    col = mix(col, uStripe, smoothstep(trunkY + 0.05, trunkY + 0.13, p.y) * 0.16);

    // Cream underside: belly line on the lower flank, the bib down the
    // front of the chest, and the throat under the collar
    float bellyLine = trunkY - 0.095 + (n2 - 0.5) * 0.02;
    float under = smoothstep(bellyLine + 0.014, bellyLine - 0.014, p.y);
    float bib = ellipseMask(vec3(p.x, p.y, 0.0), vec3(0.0, trunkY - 0.02, 0.0), vec3(0.058 * g, 0.14, 1.0), 0.3)
              * smoothstep(0.15, 0.2, p.z);
    float throat = ellipseMask(p, vec3(0.0, trunkY + 0.07, 0.27), vec3(0.055 * g, 0.075, 0.07), 0.35);
    // Legs keep the coat colour on the outside; only the belly is cream
    float cream = max(under * (1.0 - leg), max(bib, throat));

    // Four back stripes from the withers (just behind the collar) to the
    // saddle, the rump behind them plain: broad over the spine, tapering
    // to points part-way down the flank, each reaching a little lower or
    // higher, leaning back slightly as they descend
    float reach = bellyLine + 0.035 + n2 * 0.04;
    float top = smoothstep(reach, reach + 0.04, p.y);
    float taper = smoothstep(reach, trunkY + 0.12, p.y);
    float zz = p.z + (trunkY + 0.12 - p.y) * 0.32 + (n - 0.5) * 0.018;
    float w = mix(0.006, 0.028, taper);
    float stripe = 0.0;
    stripe = max(stripe, band(zz - uStripeZ.x, w));
    stripe = max(stripe, band(zz - uStripeZ.y, w));
    stripe = max(stripe, band(zz - uStripeZ.z, w));
    stripe = max(stripe, band(zz - uStripeZ.w, w));
    // Keep them off the chest front and the neck
    stripe *= top * smoothstep(0.25, 0.21, p.z) * (1.0 - smoothstep(0.55, 0.8, leg * (1.0 - lc)));

    // Legs: cream paws, softer inner legs, and a broad tabby band above
    // the wrist / hock with a fainter one higher up
    float front = step(0.0, p.z);
    float sock = smoothstep(0.15, 0.11, lc);
    float bars = 0.0;
    if (front > 0.5) {
      bars = max(band(lc - 0.3, 0.03), band(lc - 0.44, 0.016) * 0.7);
    } else {
      bars = max(band(lc - 0.4, 0.028), band(lc - 0.54, 0.018) * 0.7);
    }
    // Bars wrap the outside of the leg and fade on the inside
    float outside = smoothstep(0.045 * g, 0.075 * g, abs(p.x));
    bars *= leg * mix(0.35, 1.0, outside) * (1.0 - sock);
    cream = max(cream, leg * sock);
    cream = max(cream, leg * (1.0 - outside) * smoothstep(0.62, 0.4, lc) * 0.45);
    stripe = max(stripe, bars);

    col = mix(col, uBelly, cream);
    col = mix(col, uStripe, clamp(stripe, 0.0, 1.0) * uStripeAmount * (1.0 - cream * 0.85));
    return col;
  }

  // ---- head: muzzle, M on the brow, cheek lines, painted eyes and mouth
  vec3 furHead(vec3 pw) {
    float hk = uTrunk.z;
    vec3 p = pw / hk;
    float n = furNoise(p.xy * 60.0 + p.z * 20.0);
    vec3 col = uFur;
    float ax = abs(p.x);
    vec3 pm = vec3(ax, p.y, p.z);
    gCatGlow = vec3(0.0);

    // Cream muzzle: whisker pads, upper lip, chin, and the throat beneath
    float pads = ellipseMask(pm, vec3(0.018, -0.034, 0.09), vec3(0.03, 0.024, 0.034), 0.35);
    float chin = ellipseMask(p, vec3(0.0, -0.056, 0.066), vec3(0.03, 0.022, 0.034), 0.35);
    float jaw = smoothstep(-0.045, -0.07, p.y) * smoothstep(-0.02, 0.04, p.z);
    float cream = max(max(pads, chin), jaw);
    // Pale fur ringing the eyes
    vec3 qe = pm - uEyeC / hk;
    vec2 eo = vec2(dot(qe, uEyeR), dot(qe, uEyeU)) / (uEyeSize / hk);
    float ring = smoothstep(1.65, 1.15, length(eo * vec2(0.85, 1.0))) * step(0.0, dot(qe, uEyeN) + 0.012);
    col = mix(col, uBelly, ring * 0.26);

    // Tabby "M": three fine lines up the brow and over the crown, with an
    // arch above each eye
    float brow = smoothstep(0.03, 0.05, p.y) * smoothstep(-0.06, 0.0, p.z) * smoothstep(0.09, 0.06, p.z + p.y * 0.1);
    float lines = max(band(p.x, 0.0042), max(band(ax - 0.015, 0.0036), band(ax - 0.029, 0.0034) * smoothstep(0.045, 0.06, p.y)));
    lines *= smoothstep(0.03, 0.046, p.y) * smoothstep(-0.07, -0.02, p.z) * step(ax, 0.036);
    float stripe = lines * (0.75 + 0.25 * n);
    stripe = max(stripe, band(segDist(pm, vec3(0.05, 0.036, 0.062), vec3(0.03, 0.052, 0.07)), 0.0035) * 0.9);
    // Cheek lines sweeping back from the outer eye corners
    stripe = max(stripe, band(segDist(pm, vec3(0.062, 0.006, 0.06), vec3(0.088, -0.012, 0.012)), 0.0035) * 0.85);
    stripe = max(stripe, band(segDist(pm, vec3(0.06, -0.012, 0.055), vec3(0.082, -0.03, 0.016)), 0.003) * 0.7);
    // Crown: broader bars toward the back of the skull
    float crown = smoothstep(0.045, 0.07, p.y) * smoothstep(-0.02, -0.06, p.z);
    stripe = max(stripe, crown * band(fract(p.z * 22.0 + 0.3) - 0.5, 0.17));

    col = mix(col, uBelly, cream);
    col = mix(col, uStripe, clamp(stripe, 0.0, 1.0) * uStripeAmount * (1.0 - cream));

    // ---- painted eyes ------------------------------------------------
    float side = p.x >= 0.0 ? 1.0 : -1.0;
    vec3 q = vec3(abs(pw.x), pw.y, pw.z) - uEyeC;
    vec2 e = vec2(dot(q, uEyeR), dot(q, uEyeU)) / uEyeSize;
    float facing = dot(q, uEyeN);
    if (facing > -0.02 * hk && dot(e, e) < 6.0) {
      float blink = uEyeState.x;
      float lower = uEyeState.y;
      // Lids: the upper lid arches and lifts toward the outer corner; it
      // falls to meet the lower lid as the eye closes
      float x = e.x;
      float topOpen = 0.95 - 0.2 * x * x + 0.08 * x;
      float bot = -0.88 + 0.22 * x * x + lower * 0.55;
      float top = mix(topOpen, bot + 0.02, blink);
      float dTop = e.y - top;
      float dBot = bot - e.y;
      float dSide = length(vec2(x * 0.98, e.y * 0.9)) - 1.0;
      float sd = max(max(dTop, dBot), dSide);
      float aa = max(fwidth(sd), 1e-4);
      float inside = 1.0 - smoothstep(-aa, aa, sd);
      // Ink: heavy upper lid with a little flick at the outer corner
      float topLine = band(dTop, 0.14) * step(dSide, 0.12) * step(-0.18, dTop + 0.3);
      float botLine = band(dBot, 0.06) * step(dSide, 0.05) * step(0.0, -e.y);
      float sideLine = band(dSide, 0.07) * step(dTop, 0.0) * step(dBot, 0.0);
      float flick = band(e.y - (topOpen + (x - 1.0) * 0.55), 0.09) * step(0.92, x) * step(x, 1.32) * (1.0 - blink);
      float closedLine = band(e.y - (bot + 0.02 - uEyeState.w * 0.16 * (1.0 - x * x)), 0.1) * step(abs(x), 1.0) * smoothstep(0.7, 1.0, blink);
      float liner = max(max(topLine, botLine * (1.0 - blink)), max(sideLine * (1.0 - blink), max(flick, closedLine)));
      liner *= smoothstep(1.5, 1.0, length(vec2(x * 0.8, e.y)));

      vec2 lk = uLook;
      vec2 ie = e - vec2(lk.x * side, lk.y);
      float ir = length(ie);
      // Iris: shaded dark under the lid, warm and luminous below
      vec3 iris = uEyeColor * mix(0.5, 1.12, smoothstep(0.75, -0.55, ie.y));
      iris += uEyeColor * 0.32 * smoothstep(-0.2, -0.85, ie.y);
      float ang = atan(ie.y, ie.x);
      iris *= 0.9 + 0.18 * furNoise(vec2(ang * 9.0, ir * 3.0));
      iris = mix(iris, uEyeColor * 0.35, smoothstep(0.66, 0.92, ir));
      // Pupil: a soft vertical oval that widens with excitement
      float ps = uEyeState.z;
      float pd = length(ie / vec2(0.3 * ps, 0.5 * min(ps, 1.15)));
      float pupil = 1.0 - smoothstep(1.0 - 0.06, 1.0 + 0.06, pd);
      vec3 eyeCol = mix(iris, vec3(0.035, 0.025, 0.02), pupil);
      // Catchlights, the same side on both eyes
      vec2 he = vec2(e.x * side, e.y);
      float hl = 1.0 - smoothstep(0.17, 0.23, length(he - vec2(-0.32, 0.36) - vec2(lk.x, lk.y) * 0.5));
      float hl2 = 1.0 - smoothstep(0.065, 0.1, length(he - vec2(0.3, -0.36) - vec2(lk.x, lk.y) * 0.5));
      eyeCol = mix(eyeCol, vec3(1.0), max(hl, hl2 * 0.85));
      float open = inside * (1.0 - smoothstep(0.85, 1.0, blink));
      col = mix(col, eyeCol, open);
      col = mix(col, vec3(0.12, 0.07, 0.045), liner);
      gCatGlow = (iris * 0.32 * (1.0 - pupil) + vec3(0.6) * max(hl, hl2)) * open;
    }

    // ---- nose shadow, philtrum and the "ω" mouth --------------------
    vec3 np = uNose / hk;
    if (p.z > np.z - 0.05 && ax < 0.04) {
      float ys = np.y - 0.016;
      float philtrum = band(p.x, 0.0011) * step(p.y, np.y - 0.004) * step(ys, p.y);
      float w = 0.02;
      float mcurve = ys - 0.0065 * sin(3.14159 * clamp(ax / w, 0.0, 1.0));
      float mouthLine = band(p.y - mcurve, 0.0011) * step(ax, w);
      // Open mouth: dark red with a pink tongue, growing down from the lip
      float openD = uMouth * 0.03;
      float lowCurve = mcurve - openD * pow(max(0.0, 1.0 - pow(ax / (w * (0.7 + 0.3 * uMouth)), 2.0)), 0.6);
      float mouthIn = step(lowCurve, p.y) * step(p.y, mcurve) * step(0.0005, openD);
      float tongue = mouthIn * smoothstep(lowCurve + openD * 0.45, lowCurve + openD * 0.2, p.y);
      vec3 inner = mix(vec3(0.33, 0.09, 0.1), vec3(0.85, 0.45, 0.47), tongue);
      col = mix(col, inner, mouthIn);
      float ink = max(philtrum, mouthLine) * smoothstep(np.z - 0.05, np.z - 0.03, p.z);
      // Lip line around the opening
      ink = max(ink, step(0.0005, openD) * band(p.y - lowCurve, 0.0012) * step(ax, w * (0.7 + 0.3 * uMouth)));
      col = mix(col, vec3(0.16, 0.08, 0.06), ink);
    }
    return col;
  }

  // ---- tail: rings and a dark tip (p.y = 0 base → 1 tip)
  vec3 furTail(vec3 p) {
    float t = p.y;
    float n = furNoise(vec2(t * 20.0, atan(p.z, p.x) * 2.0));
    float rings = band(fract(t * uTrunk.w + 0.15 + (n - 0.5) * 0.08) - 0.5, 0.2) * smoothstep(0.08, 0.16, t);
    float tip = smoothstep(0.86, 0.92, t);
    float s = max(rings, tip);
    // Underside of the tail stays a shade lighter
    vec3 col = mix(uFur, uBelly, smoothstep(0.0, -0.025, p.z) * 0.2);
    return mix(col, uStripe, s * uStripeAmount);
  }

  // ---- ear backs: coat colour darkening toward the tip and rim
  vec3 furEar(vec3 p) {
    float t = p.y;
    float rim = smoothstep(0.65, 1.0, abs(p.x) / max(0.004, 0.04 * (1.0 - t)));
    return mix(uFur, uStripe, clamp(smoothstep(0.35, 0.95, t) * 0.6 + rim * 0.25, 0.0, 1.0) * uStripeAmount);
  }
`;

let partCounter = 0;

/**
 * Coat material for one part of one cat. `palette` = { fur, belly, stripe,
 * stripeAmount, stripeZ: Vector4, trunk: Vector4 } and, for the head, the
 * face uniforms in `face`. All cats share four shader programs.
 */
export function furMaterial(palette, part, face = null) {
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getToonGradient() });
  mat.defines = { CAT_PART: part };
  const u = {
    uFur: { value: palette.fur },
    uBelly: { value: palette.belly },
    uStripe: { value: palette.stripe },
    uStripeAmount: { value: palette.stripeAmount },
    uStripeZ: { value: palette.stripeZ },
    uTrunk: { value: palette.trunk },
    uEyeC: { value: face ? face.eyeC : new THREE.Vector3() },
    uEyeR: { value: face ? face.eyeR : new THREE.Vector3(1, 0, 0) },
    uEyeU: { value: face ? face.eyeU : new THREE.Vector3(0, 1, 0) },
    uEyeN: { value: face ? face.eyeN : new THREE.Vector3(0, 0, 1) },
    uEyeSize: { value: face ? face.eyeSize : new THREE.Vector2(1, 1) },
    uEyeColor: { value: face ? face.eyeColor : new THREE.Color(1, 1, 1) },
    uEyeState: { value: face ? face.state : new THREE.Vector4(0, 0, 1, 0) },
    uLook: { value: face ? face.look : new THREE.Vector2() },
    uNose: { value: face ? face.nose : new THREE.Vector3() },
    uMouth: face ? face.mouth : { value: 0 },
    uCool: { value: palette.cool ?? 0 }
  };
  mat.userData.uniforms = u;
  mat.onBeforeCompile = (shader) => {
    bindRim(shader);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = `
      attribute vec3 aBody;
      #if CAT_PART == 0
      attribute vec2 aFur;
      #endif
      varying vec3 vBody;
      varying vec2 vFur;
    ` + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vBody = aBody;
      #if CAT_PART == 0
      vFur = aFur;
      #else
      vFur = vec2(0.0);
      #endif
    `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_toon_pars_fragment>', `#include <lights_toon_pars_fragment>
        ${RIM_PARS}
        ${FUR_PARS}
      `)
      .replace('#include <color_fragment>', `#include <color_fragment>
        gCatGlow = vec3(0.0);
        #if CAT_PART == 0
          diffuseColor.rgb = furBody(vBody, vFur);
        #elif CAT_PART == 1
          diffuseColor.rgb = furHead(vBody);
        #elif CAT_PART == 2
          diffuseColor.rgb = furTail(vBody);
        #else
          diffuseColor.rgb = furEar(vBody);
        #endif
        {
          // Painterly grain: fine, low-contrast fur noise
          float grain = furNoise(vBody.xz * 180.0) * 0.5 + furNoise(vBody.yz * 240.0 + 3.7) * 0.5;
          diffuseColor.rgb *= 0.95 + grain * 0.1;
        }
      `)
      .replace('#include <opaque_fragment>', `
        {
          // Cool blue-violet lift in the shadow side, warm rim on the sun side
          vec3 rimView = normalize(vViewPosition);
          vec3 rimDirV = normalize((viewMatrix * vec4(uRimDir, 0.0)).xyz);
          float shade = 1.0 - clamp(dot(normal, rimDirV) * 0.5 + 0.5, 0.0, 1.0);
          outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.9, 0.94, 1.12), shade * (0.35 + uCool * 0.3));
          // Silhouette rim (vViewPosition points toward the camera)
          float fres = pow(1.0 - clamp(dot(rimView, normal), 0.0, 1.0), 3.5);
          float sunSide = clamp(dot(normal, rimDirV) * 0.5 + 0.5, 0.0, 1.0);
          // Dark coats catch a cool, silvery sheen instead of the warm rim
          vec3 rimCol = mix(uRimColor, vec3(0.62, 0.7, 0.95), uCool * 0.85);
          outgoingLight += rimCol * fres * (0.15 + sunSide * 0.85) * uRimStrength * (0.9 - uCool * 0.45);
          outgoingLight += vec3(0.16, 0.2, 0.3) * fres * uCool * 0.3;
          outgoingLight += vec3(0.03, 0.034, 0.048) * uCool * (0.6 + 0.4 * sunSide);
          // Fine fur sheen along the silhouette, and the sun-warmed coat
          outgoingLight += diffuseColor.rgb * fres * 0.12;
          outgoingLight += diffuseColor.rgb * uRimColor * sunSide * uRimStrength * 0.22;
          outgoingLight += gCatGlow;
        }
        #include <opaque_fragment>
      `);
  };
  mat.customProgramCacheKey = () => 'cat-fur-v4-' + part;
  partCounter++;
  return mat;
}

/**
 * Ink outline: back faces pushed out along the normal. The push grows
 * gently with camera distance so the line keeps a steady painted weight.
 */
const outlineCache = new Map();
export function outlineMaterial(thickness = 0.0032) {
  const key = thickness.toFixed(5);
  if (outlineCache.has(key)) return outlineCache.get(key);
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a2214, side: THREE.BackSide });
  const uOutline = { value: thickness };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = uOutline;
    shader.vertexShader = 'uniform float uOutline;\nfloat outlineK;\n' + shader.vertexShader
      .replace('#include <skinning_vertex>', `
        #include <skinning_vertex>
        {
          #ifdef USE_SKINNING
            vec3 outlineN = normalize(objectNormal);
          #else
            vec3 outlineN = normalize(normal);
          #endif
          vec4 viewP = modelViewMatrix * vec4(transformed, 1.0);
          outlineK = clamp(-viewP.z * 0.42, 0.75, 2.2);
          transformed += outlineN * uOutline * outlineK;
        }
      `)
      .replace('#include <project_vertex>', `
        #include <project_vertex>
        // Sink the hull a little behind the coat so it only shows past the
        // silhouette, never through shallow folds at the shoulders and hips
        mvPosition.xyz += normalize(mvPosition.xyz) * uOutline * outlineK * 2.6;
        gl_Position = projectionMatrix * mvPosition;
      `);
  };
  mat.customProgramCacheKey = () => 'cat-outline';
  outlineCache.set(key, mat);
  return mat;
}

/**
 * Braided silk cord (kumihimo): rows of slanted strands forming a chevron
 * weave, a fine gold thread along each edge, and soft shading between
 * strands. Wraps around the band (u) and across it (v).
 */
export function makeCollarTexture(hex) {
  const W = 128, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(hex);
  const css = (c, k) => `rgb(${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)})`;
  ctx.fillStyle = css(base, 0.68);
  ctx.fillRect(0, 0, W, H);
  // Chevron strands: each column of the weave is a "V" of two strands
  const cols = 8;
  const cw = W / cols;
  const top = 10, bottom = H - 10;
  for (let c = 0; c < cols; c++) {
    for (let half = 0; half < 2; half++) {
      for (let r = 0; r < 3; r++) {
        const y0 = top + ((bottom - top) / 3) * r;
        const y1 = y0 + (bottom - top) / 3;
        const x0 = c * cw + (half ? cw : 0);
        const x1 = c * cw + cw * 0.5;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, css(base, 0.82));
        g.addColorStop(0.5, css(base, 1.28));
        g.addColorStop(1, css(base, 0.9));
        ctx.strokeStyle = g;
        ctx.lineWidth = 5.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0 + 2);
        ctx.lineTo(x1, y1 - 2);
        ctx.stroke();
      }
    }
  }
  // Gold edge threads and a darker selvedge
  const gold = new THREE.Color(0xe0b04a);
  for (const y of [6, H - 7]) {
    ctx.fillStyle = css(base, 0.4);
    ctx.fillRect(0, y - 4, W, 2);
    ctx.fillStyle = css(gold, 1.0);
    ctx.fillRect(0, y - 1.5, W, 3);
    ctx.fillStyle = css(gold, 1.25);
    for (let x = 0; x < W; x += 6) ctx.fillRect(x, y - 1.5, 3, 1);
  }
  // Silk fibre noise
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Suzu bell surface: warm metal with a raised equator band between two
 * engraved lines, the sound slit running up from the bottom to a round
 * hole, and a small sakura crest stamped on the front above the band.
 * Mapped on a SphereGeometry (u = 0.25 faces +Z).
 */
export function makeBellTexture(hex) {
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const c = new THREE.Color(hex);
  const css = (k, a = 1) => `rgba(${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)},${a})`;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, css(1.18));
  grad.addColorStop(0.5, css(1.0));
  grad.addColorStop(1, css(0.7));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Equator band
  const eq = H * 0.5;
  ctx.fillStyle = css(1.22);
  ctx.fillRect(0, eq - 7, W, 14);
  ctx.fillStyle = css(0.42);
  ctx.fillRect(0, eq - 9, W, 2.5);
  ctx.fillRect(0, eq + 7, W, 2.5);
  // Sound slit at front and back, ending in a round hole
  for (const u of [0.25, 0.75]) {
    const x = u * W;
    ctx.fillStyle = css(0.16);
    ctx.fillRect(x - 2.2, eq + 18, 4.4, H - eq - 18);
    ctx.beginPath();
    ctx.arc(x, eq + 20, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(1.3, 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, eq + 20, 8, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  // Sakura crest on the front, above the band
  const cx = 0.25 * W, cy = H * 0.27;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = css(0.45);
  ctx.fillStyle = css(1.3);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i / 5) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-7, -5, -6, -14, -1.5, -15);
    ctx.lineTo(0, -12.5);
    ctx.lineTo(1.5, -15);
    ctx.bezierCurveTo(6, -14, 7, -5, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = css(0.5);
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Hammered-metal speckle
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n * 0.7));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Inner ear: warm pink deepening into the bowl, with pale fur tufts. */
let earInnerTex = null;
export function getEarInnerTexture() {
  if (earInnerTex) return earInnerTex;
  const W = 64, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  // u across the ear (0..1), v up the ear (canvas bottom = base)
  const g = ctx.createRadialGradient(W / 2, H * 1.05, 4, W / 2, H * 0.9, H);
  g.addColorStop(0, '#b8707a');
  g.addColorStop(0.55, '#e3a6ad');
  g.addColorStop(1, '#efc3c4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  const tuft = (x0, lean, len) => {
    ctx.strokeStyle = 'rgba(250,240,228,0.9)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    ctx.quadraticCurveTo(x0 + lean * 0.4, H - len * 0.6, x0 + lean, H - len);
    ctx.stroke();
  };
  for (let i = 0; i < 7; i++) tuft(6 + i * 3.2, 10 + i * 1.5, 26 + i * 2);
  for (let i = 0; i < 7; i++) tuft(W - 6 - i * 3.2, -10 - i * 1.5, 26 + i * 2);
  earInnerTex = new THREE.CanvasTexture(canvas);
  earInnerTex.colorSpace = THREE.SRGBColorSpace;
  return earInnerTex;
}
