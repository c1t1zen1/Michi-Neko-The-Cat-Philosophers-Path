import * as THREE from 'three';

/**
 * The cat.
 *
 * Geometry is still a hand-built hierarchy of smooth primitives (so every
 * existing animation rig — chest, hips, neck, head, legs, tail, ears — is
 * unchanged), but the coat is now painted by a fur shader:
 *
 *  - every fur mesh bakes a body-space coordinate + part id into its
 *    vertices, so a single procedural mackerel-tabby pattern (flank stripes,
 *    spine line, forehead "M", cheek marks, leg rings, tail rings, cream
 *    belly / bib / socks) flows continuously across separate meshes and
 *    moves with the animation
 *  - a soft three-band toon ramp with painterly fur noise, warm rim light
 *    keyed to the sun, and a subtle cool shadow tint
 *  - textured amber irises with limbal rings and catchlights
 */

// Soft toon ramp: three bands with feathered transitions — cel shading that
// still reads as painted rather than hard-edged.
let toonGradientTexture = null;
function getToonGradient() {
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

const FUR_KIND = { torso: 0, head: 1, leg: 2, tail: 3, ear: 4 };

const RIM_PARS = /* glsl */`
  uniform vec3 uRimColor;
  uniform vec3 uRimDir;
  uniform float uRimStrength;
`;
const RIM_APPLY = /* glsl */`
  {
    vec3 rimView = normalize(vViewPosition);
    float fres = pow(clamp(1.0 + dot(rimView, normal), 0.0, 1.0), 2.6);
    vec3 rimDirV = normalize((viewMatrix * vec4(uRimDir, 0.0)).xyz);
    float sunSide = clamp(dot(normal, rimDirV) * 0.5 + 0.5, 0.0, 1.0);
    outgoingLight += uRimColor * fres * (0.25 + sunSide * 0.75) * uRimStrength;
  }
`;

/** Plain toon material (cream parts, nose, pads) with the shared rim light. */
function toonMat(color, opts = {}) {
  const { noRim, ...matOpts } = opts;
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradient(),
    ...matOpts
  });
  if (noRim) return mat;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = catRimUniforms.uRimColor;
    shader.uniforms.uRimDir = catRimUniforms.uRimDir;
    shader.uniforms.uRimStrength = catRimUniforms.uRimStrength;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_toon_pars_fragment>', '#include <lights_toon_pars_fragment>\n' + RIM_PARS)
      .replace('#include <opaque_fragment>', RIM_APPLY + '\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'cat-toon-rim';
  return mat;
}

/**
 * Fur shader: procedural tabby coat evaluated in baked body space.
 * `palette` = { fur, belly, stripe } THREE.Color values.
 */
function furMat(palette) {
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getToonGradient() });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = catRimUniforms.uRimColor;
    shader.uniforms.uRimDir = catRimUniforms.uRimDir;
    shader.uniforms.uRimStrength = catRimUniforms.uRimStrength;
    shader.uniforms.uFur = { value: palette.fur };
    shader.uniforms.uBelly = { value: palette.belly };
    shader.uniforms.uStripe = { value: palette.stripe };
    shader.uniforms.uStripeAmount = { value: palette.stripeAmount };

    shader.vertexShader = `
      attribute vec3 aBody;
      attribute float aKind;
      varying vec3 vBody;
      varying float vKind;
    ` + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vBody = aBody;
      vKind = aKind;
    `);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_toon_pars_fragment>', `#include <lights_toon_pars_fragment>
        ${RIM_PARS}
        uniform vec3 uFur;
        uniform vec3 uBelly;
        uniform vec3 uStripe;
        uniform float uStripeAmount;
        varying vec3 vBody;
        varying float vKind;

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
        float stripeWave(float x, float n) {
          return smoothstep(0.05, 0.62, sin(x + n));
        }

        vec3 furPattern(vec3 p, float kind) {
          vec3 col = uFur;
          float n = furNoise(p.xy * 9.0 + p.z * 4.0) * 2.4;
          float grain = furNoise(p.xz * 70.0) * 0.5 + furNoise(p.yz * 95.0 + 3.7) * 0.5;
          float stripe = 0.0;
          float cream = 0.0;

          if (kind < 0.5) {
            // ---- torso ----
            float belly = smoothstep(0.405, 0.315, p.y);
            float bib = ellipseMask(p, vec3(0.0, 0.43, 0.30), vec3(0.085, 0.11, 0.13), 0.35);
            cream = max(belly, bib * 0.85);
            float top = smoothstep(0.34, 0.50, p.y) * (1.0 - cream);
            float span = smoothstep(-0.30, -0.22, p.z) * smoothstep(0.30, 0.20, p.z);
            stripe = stripeWave(p.z * 38.0 + abs(p.x) * 6.0, n) * top * span;
            // Flank stripes break into shorter dashes lower down
            stripe *= 0.75 + 0.25 * smoothstep(0.35, 0.55, p.y);
            stripe = max(stripe, smoothstep(0.045, 0.0, abs(p.x)) * top * span * 0.65);
            // Coat darkens slightly along the back
            col = mix(col, uStripe, smoothstep(0.42, 0.62, p.y) * 0.18);
          } else if (kind < 1.5) {
            // ---- head ----
            float muzzle = ellipseMask(p, vec3(0.0, 0.628, 0.405), vec3(0.078, 0.052, 0.07), 0.35);
            float chin = ellipseMask(p, vec3(0.0, 0.59, 0.385), vec3(0.06, 0.05, 0.06), 0.4);
            float throat = smoothstep(0.62, 0.56, p.y) * smoothstep(0.24, 0.32, p.z);
            cream = max(max(muzzle, chin), throat * 0.9);
            // Forehead "M": three short vertical marks between the ears
            float crownZone = smoothstep(0.695, 0.725, p.y) * smoothstep(0.32, 0.37, p.z) * smoothstep(0.10, 0.06, abs(p.x));
            float mMarks = smoothstep(0.45, 0.85, abs(sin(p.x * 68.0))) * smoothstep(0.02, 0.05, abs(p.x) + 0.02);
            stripe = max(stripe, mMarks * crownZone * 0.85);
            // Brow stripes sweeping back over the skull
            float skullTop = smoothstep(0.70, 0.74, p.y) * smoothstep(0.34, 0.26, p.z);
            stripe = max(stripe, stripeWave(p.z * 46.0, n) * skullTop * 0.7);
            // Eye-corner marks running back toward the cheeks
            float cheekLine = smoothstep(0.010, 0.0, abs(p.y - 0.665 + (abs(p.x) - 0.08) * 0.35))
              * smoothstep(0.08, 0.095, abs(p.x)) * smoothstep(0.31, 0.35, p.z) * smoothstep(0.42, 0.38, p.z);
            stripe = max(stripe, cheekLine * 0.45);
            // Lighter cheek ruffs
            float cheek = ellipseMask(p, vec3(0.0, 0.62, 0.35), vec3(0.14, 0.05, 0.08), 0.5) * smoothstep(0.06, 0.1, abs(p.x));
            col = mix(col, uBelly, cheek * 0.35);
          } else if (kind < 2.5) {
            // ---- legs ----
            float sock = smoothstep(0.135, 0.085, p.y);
            cream = sock;
            float mid = smoothstep(0.12, 0.2, p.y) * smoothstep(0.40, 0.30, p.y);
            stripe = stripeWave(p.y * 44.0, n * 0.6) * mid * 0.8;
          } else if (kind < 3.5) {
            // ---- tail: p.y is the 0..1 distance along the tail ----
            float t = p.y;
            stripe = stripeWave(t * 33.0 + 1.2, n * 0.4) * smoothstep(0.02, 0.12, t) * 0.9;
            stripe = max(stripe, smoothstep(0.84, 0.94, t));
          } else {
            // ---- ear backs ----
            stripe = 0.55;
          }

          col = mix(col, uBelly, cream);
          col = mix(col, uStripe, stripe * uStripeAmount * (1.0 - cream));
          col *= 0.93 + grain * 0.14;
          return col;
        }
      `)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = furPattern(vBody, vKind);
      `)
      .replace('#include <opaque_fragment>', `
        {
          // Cool blue-violet lift in the shadow side, warm rim on the sun side
          vec3 rimView = normalize(vViewPosition);
          vec3 rimDirV = normalize((viewMatrix * vec4(uRimDir, 0.0)).xyz);
          float shade = 1.0 - clamp(dot(normal, rimDirV) * 0.5 + 0.5, 0.0, 1.0);
          outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.9, 0.94, 1.12), shade * 0.35);
          float fres = pow(clamp(1.0 + dot(rimView, normal), 0.0, 1.0), 3.0);
          float sunSide = clamp(dot(normal, rimDirV) * 0.5 + 0.5, 0.0, 1.0);
          outgoingLight += uRimColor * fres * (0.15 + sunSide * 0.85) * uRimStrength * 0.6;
          // Fine fur sheen along the silhouette
          outgoingLight += diffuseColor.rgb * fres * 0.1;
        }
        #include <opaque_fragment>
      `);
  };
  mat.customProgramCacheKey = () => 'cat-fur-v2';
  return mat;
}

// Thin animation-cell ink outline (inverted hull) for the Ghibli cel look.
let _outlineMat = null;
function getOutlineMaterial() {
  if (!_outlineMat) {
    _outlineMat = new THREE.MeshBasicMaterial({ color: 0x3a2214, side: THREE.BackSide });
  }
  return _outlineMat;
}
function addOutline(mesh, k = 1.04) {
  const o = new THREE.Mesh(mesh.geometry, getOutlineMaterial());
  o.scale.setScalar(k);
  mesh.add(o);
  return mesh;
}

function capsule(r, len, mat, sx = 1, sy = 1, sz = 1, kind) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 12, 24), mat);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  if (kind !== undefined) m.userData.furKind = kind;
  return m;
}

function ball(r, mat, sx = 1, sy = 1, sz = 1, w = 26, h = 20, kind) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  if (kind !== undefined) m.userData.furKind = kind;
  return m;
}

/**
 * Amber anime iris as an equirectangular map for a sphere whose +Y pole
 * faces forward: rows are polar angle (iris centre at the top edge, limbal
 * ring part way down, dark sclera beyond), columns are azimuth (fibres).
 */
function makeIrisTexture(hex) {
  const c = new THREE.Color(hex);
  const w = 128, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const lerp = (a, b, t) => a + (b - a) * t;
  for (let y = 0; y < h; y++) {
    // v = 1 at the top row = the forward pole (canvas flipY)
    const theta = (y / (h - 1)) * Math.PI; // polar angle from the front pole
    const t = theta / 0.95;                 // 0 centre → 1 iris edge
    for (let x = 0; x < w; x++) {
      let r, g, b;
      if (t < 1.0) {
        // Bright centre, deeper toward the edge, with radial fibres
        const fibre = 0.9 + 0.2 * Math.abs(Math.sin(x * 0.55 + Math.sin(x * 0.13) * 2.0));
        const k = lerp(1.35, 0.7, t * t) * fibre;
        const ring = Math.max(0, 1 - Math.abs(t - 0.92) / 0.09);
        r = c.r * k * (1 - ring * 0.7); g = c.g * k * (1 - ring * 0.75); b = c.b * k * (1 - ring * 0.8);
      } else {
        // Sclera / liner behind the iris: near-black warm brown
        r = 0.13; g = 0.09; b = 0.07;
      }
      const i = (y * w + x) * 4;
      d[i] = Math.min(255, r * 255); d[i + 1] = Math.min(255, g * 255); d[i + 2] = Math.min(255, b * 255); d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Cat {
  constructor(options = {}) {
    // Warm tabby palette (reference: golden-tan coat, chocolate mackerel
    // stripes, cream bib / muzzle / socks, amber eyes)
    const fur = options.fur ?? 0xc4915a;
    const belly = options.belly ?? 0xf3e7d0;
    const accent = options.accent ?? 0x6e4424;
    const eyeColor = options.eyeColor ?? 0xebb02a;
    const ribbonColor = options.ribbonColor ?? 0xd63228;

    this.palette = {
      fur: new THREE.Color(fur),
      belly: new THREE.Color(belly),
      stripe: new THREE.Color(accent),
      stripeAmount: options.stripeAmount ?? 1.0
    };
    this.matFur = furMat(this.palette);
    this.matBelly = toonMat(belly);
    this.matAccent = toonMat(accent);
    this.matPink = toonMat(0xd9a5ab);
    this.matNose = toonMat(0xd07a80);
    this.matEyeLiner = toonMat(0x221712, { noRim: true });
    // Textured iris with a soft glow so eyes stay bright at dusk
    const irisTex = makeIrisTexture(eyeColor);
    this.matEye = new THREE.MeshStandardMaterial({
      map: irisTex, emissive: new THREE.Color(0xffffff), emissiveMap: irisTex, emissiveIntensity: 0.45,
      roughness: 0.2, metalness: 0
    });
    this.matPupil = toonMat(0x120c08, { noRim: true });
    this.matGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matPawPad = toonMat(0xd8959d);
    this.matGoldBell = toonMat(0xf7ca38, { emissive: 0x5a3e04, emissiveIntensity: 0.3 });
    this.matRibbon = toonMat(ribbonColor);

    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);

    this.isMeowing = false;
    this.meowTimer = 0;
    this.isProwling = false;
    this.isDrinking = false;

    this.buildTorso();
    this.buildHead();
    this.buildLegs();
    this.buildTail();
    this.bakeFurCoordinates();

    this.time = Math.random() * 10;
    this.phase = 0;
    this.speedBlend = 0;
    this.blinkTimer = 2 + Math.random() * 4;
    this.blink = 0;
    this.earTwitch = 0;
    this.earTwitchTimer = 3 + Math.random() * 5;
    this.purr = 0;

    // Audio + mood / idle / action state
    this.audio = options.audio || null;
    this.mood = 'calm';
    this.moodTimer = 0;
    this.moodPriority = 0;
    this.state = 'idle';
    this.idleTimer = 0;
    this.idleAction = null;
    this.idleActionTimer = 0;
    this.idleActionDuration = 0;
    // Cat stands alert/calm and only sits down after prolonged stillness
    this.nextIdleTime = 18.0 + Math.random() * 14.0;
    this.jumpTime = 0;
    this.landTime = 0;
    this.yawnOpen = 0;
    this.isSprinting = false;
    this.isTurning = false;
    this.inWater = false;

    // Neutral base transforms for idle poses and resets
    this.base = {
      bodyY: this.body.position.y,
      chestY: this.chest.position.y,
      hipsY: this.hips.position.y,
      headY: this.head.position.y,
      bodyRotX: 0,
      bodyRotZ: 0,
      headRotX: 0,
      headRotY: 0,
      neckX: 0,
      tailRootX: 0.85,
      legRootX: [0, 0, 0, 0],
      legKneeX: [0, 0, 0, 0],
      earX: [-0.12, -0.12]
    };
  }

  /**
   * Bake body-space coordinates and a part id into every fur mesh so the
   * coat pattern is continuous across meshes and rides the animation.
   */
  bakeFurCoordinates() {
    this.group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.body.matrixWorld).invert();
    const v = new THREE.Vector3();
    const m = new THREE.Matrix4();
    this.body.traverse((o) => {
      if (!o.isMesh || o.userData.furKind === undefined) return;
      const geo = o.geometry;
      const pos = geo.attributes.position;
      const body = new Float32Array(pos.count * 3);
      const kind = new Float32Array(pos.count).fill(o.userData.furKind);
      m.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        if (o.userData.furKind === FUR_KIND.tail) {
          // Tail: store the normalised distance along the tail in y
          const t = (o.userData.tailIndex + (0.5 - pos.getY(i) / o.userData.tailSegLen)) / o.userData.tailSegs;
          body[i * 3] = pos.getX(i); body[i * 3 + 1] = t; body[i * 3 + 2] = pos.getZ(i);
        } else {
          v.fromBufferAttribute(pos, i).applyMatrix4(m);
          body[i * 3] = v.x; body[i * 3 + 1] = v.y; body[i * 3 + 2] = v.z;
        }
      }
      geo.setAttribute('aBody', new THREE.BufferAttribute(body, 3));
      geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    });
  }

  buildTorso() {
    this.hips = new THREE.Group();
    this.hips.position.set(0, 0.43, -0.12);
    this.body.add(this.hips);

    this.chest = new THREE.Group();
    this.chest.position.set(0, 0.45, 0.13);
    this.body.add(this.chest);

    // Haunches: broader rear mass reads as a real cat rump
    const hipMesh = ball(0.155, this.matFur, 1.0, 0.98, 1.22, 26, 20, FUR_KIND.torso);
    addOutline(hipMesh, 1.035);
    this.hips.add(hipMesh);
    for (const side of [-1, 1]) {
      const thigh = ball(0.085, this.matFur, 0.9, 1.1, 1.05, 18, 14, FUR_KIND.torso);
      thigh.position.set(side * 0.085, -0.06, -0.03);
      this.hips.add(thigh);
    }

    const chestMesh = ball(0.162, this.matFur, 0.94, 1.0, 1.3, 26, 20, FUR_KIND.torso);
    addOutline(chestMesh, 1.035);
    this.chest.add(chestMesh);
    for (const side of [-1, 1]) {
      const shoulder = ball(0.075, this.matFur, 0.9, 1.05, 1.0, 18, 14, FUR_KIND.torso);
      shoulder.position.set(side * 0.085, -0.04, 0.05);
      this.chest.add(shoulder);
    }

    // Cream chest ruff: broad where it tucks under the neck, then tapering
    // naturally into a small triangular tuft.
    const bibVerts = [
      -0.072,  0.070, 0.147,
       0.072,  0.070, 0.147,
       0.052,  0.015, 0.190,
       0.000, -0.105, 0.160,
      -0.052,  0.015, 0.190
    ];
    const bibGeo = new THREE.BufferGeometry();
    bibGeo.setAttribute('position', new THREE.Float32BufferAttribute(bibVerts, 3));
    bibGeo.setIndex([0, 1, 2, 0, 2, 4, 4, 2, 3]);
    bibGeo.computeVertexNormals();
    const bibMesh = new THREE.Mesh(bibGeo, this.matBelly);
    bibMesh.castShadow = false;
    this.chest.add(bibMesh);

    // Subtle cream belly line kept low along the underside
    const bellyMesh = ball(0.115, this.matBelly, 0.62, 0.5, 1.35, 18, 14);
    bellyMesh.position.set(0, -0.105, -0.06);
    this.chest.add(bellyMesh);

    const spine = capsule(0.145, 0.24, this.matFur, 0.9, 1, 1, FUR_KIND.torso);
    spine.rotation.x = Math.PI / 2;
    spine.position.set(0, 0.445, 0.005);
    addOutline(spine, 1.03);
    this.body.add(spine);

    const blobCanvas = document.createElement('canvas');
    blobCanvas.width = 64;
    blobCanvas.height = 64;
    const bctx = blobCanvas.getContext('2d');
    const bgrad = bctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    bgrad.addColorStop(0, 'rgba(20, 12, 6, 0.42)');
    bgrad.addColorStop(0.6, 'rgba(20, 12, 6, 0.18)');
    bgrad.addColorStop(1, 'rgba(20, 12, 6, 0)');
    bctx.fillStyle = bgrad;
    bctx.fillRect(0, 0, 64, 64);
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.025;
    this.blob.renderOrder = 1;
    this.group.add(this.blob);
  }

  updateShadow(heightAboveGround) {
    if (!this.blob) return;
    this.blob.position.y = 0.025 - heightAboveGround;
    const k = THREE.MathUtils.clamp(1 - heightAboveGround * 0.45, 0.35, 1);
    this.blob.scale.setScalar(k);
    this.blob.material.opacity = k;
  }

  buildHead() {
    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.08, 0.14);
    this.chest.add(this.neck);

    // Fur bridge so the head connects seamlessly to the body (no gap/neck hole)
    const neckFur = capsule(0.062, 0.10, this.matFur, 1, 1, 1, FUR_KIND.torso);
    neckFur.rotation.x = Math.PI / 2.6;
    neckFur.position.set(0, 0.05, 0.045);
    addOutline(neckFur, 1.05);
    this.neck.add(neckFur);

    // Silk ribbon collar with a small brass bell (C2.1 cosmetics; Master
    // Cat rank swaps it for bright gold and adds a twin — setMasterCat()).
    this.matBellBrass = toonMat(0xb08a4a, { emissive: 0x40300a, emissiveIntensity: 0.15 });
    this.collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.012, 8, 20),
      this.matRibbon
    );
    this.collar.rotation.x = Math.PI / 2.15;
    this.collar.position.set(0, 0.015, 0.02);
    this.neck.add(this.collar);
    this.collarBell = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 10, 8),
      this.matBellBrass
    );
    this.collarBell.position.set(0, -0.06, 0.085);
    this.neck.add(this.collarBell);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.125, 0.055);
    this.head.scale.setScalar(1.06);
    this.neck.add(this.head);

    // Rounded feline skull, slightly broader than tall
    const skull = ball(0.104, this.matFur, 1.08, 0.97, 1.05, 30, 24, FUR_KIND.head);
    addOutline(skull, 1.04);
    this.head.add(skull);

    // Fluffy cheek ruffs
    const cheekL = ball(0.064, this.matFur, 1.18, 0.84, 0.95, 22, 16, FUR_KIND.head);
    cheekL.position.set(-0.05, -0.024, 0.024);
    const cheekR = ball(0.064, this.matFur, 1.18, 0.84, 0.95, 22, 16, FUR_KIND.head);
    cheekR.position.set(0.05, -0.024, 0.024);
    this.head.add(cheekL, cheekR);

    // Cream snout bridge & rounded whisker pads
    const snoutBridge = ball(0.042, this.matBelly, 0.92, 0.78, 1.15, 20, 14);
    snoutBridge.position.set(0, -0.008, 0.082);
    this.head.add(snoutBridge);

    const padL = ball(0.028, this.matBelly, 1.12, 0.86, 0.96, 18, 12);
    padL.position.set(-0.024, -0.024, 0.116);
    const padR = ball(0.028, this.matBelly, 1.12, 0.86, 0.96, 18, 12);
    padR.position.set(0.024, -0.024, 0.116);
    this.head.add(padL, padR);
    this.muzzle = snoutBridge;

    // Small rounded lower chin (cream)
    const chin = ball(0.022, this.matBelly, 0.95, 0.72, 0.9, 16, 12);
    chin.position.set(0, -0.044, 0.096);
    this.head.add(chin);

    // Soft coral pink nose leather
    const nose = ball(0.014, this.matNose, 1.15, 0.82, 0.75, 12, 10);
    nose.position.set(0, -0.014, 0.134);
    this.head.add(nose);

    // Large, round, expressive anime eyes
    this.eyes = [];
    this.pupils = [];
    this.glints = [];

    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.045, 0.020, 0.088);
      eyeGroup.rotation.y = side * 0.18;
      // Almond tilt: outer corners raised like the reference art
      eyeGroup.rotation.z = side * -0.14;

      // Dark eye contour / eyeliner — wide almond shape
      const eyeLiner = ball(0.028, this.matEyeLiner, 1.28, 1.15, 0.45, 20, 14);
      eyeGroup.add(eyeLiner);

      // Textured amber iris (almond). The geometry itself is turned so the
      // sphere's pole faces forward (+Z) and the iris map reads as a disc;
      // the mesh scale then flattens it front-to-back, not top-to-bottom.
      const iris = ball(0.024, this.matEye, 1.16, 1.06, 0.52, 24, 18);
      iris.geometry.rotateX(Math.PI / 2);
      iris.position.set(0, 0, 0.004);
      eyeGroup.add(iris);

      // Large rounded dark pupil
      const pupil = ball(0.0135, this.matPupil, 0.88, 1.05, 0.65, 12, 12);
      pupil.position.set(0, 0, 0.0085);
      eyeGroup.add(pupil);

      // Bright anime highlight catchlights
      const glint = ball(0.0055, this.matGlint, 1, 1, 0.4, 8, 8);
      glint.position.set(side * -0.006, 0.007, 0.0125);
      eyeGroup.add(glint);

      const glintSmall = ball(0.0028, this.matGlint, 1, 1, 0.4, 6, 6);
      glintSmall.position.set(side * 0.005, -0.006, 0.0125);
      eyeGroup.add(glintSmall);

      this.head.add(eyeGroup);
      this.eyes.push(eyeGroup);
      this.pupils.push(pupil);
    }

    // Triangular ears with warm pink inner ear and a cream tuft
    this.ears = [];
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.062, 0.095, 0.008);

      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.088, 10), this.matFur);
      outer.scale.set(1, 1, 0.6);
      outer.castShadow = true;
      outer.userData.furKind = FUR_KIND.ear;

      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 10), this.matPink);
      inner.scale.set(1, 1, 0.45);
      inner.position.set(0, -0.006, 0.012);

      const tuft = ball(0.018, this.matBelly, 0.85, 1.0, 0.8, 10, 8);
      tuft.position.set(side * -0.004, -0.022, 0.014);

      ear.add(outer, inner, tuft);
      ear.rotation.z = side * -0.22;
      ear.rotation.x = -0.08;
      ear.rotation.y = side * 0.12;
      this.head.add(ear);
      this.ears.push(ear);
    }

    // Fine whiskers
    const whiskerMat = new THREE.LineBasicMaterial({ color: 0x3a2a20, transparent: true, opacity: 0.55 });
    for (const side of [-1, 1]) {
      const whiskerAngles = [0.10, -0.02, -0.14];
      for (let i = 0; i < whiskerAngles.length; i++) {
        const y = -0.019 - i * 0.006;
        const ang = whiskerAngles[i];
        const pts = [
          new THREE.Vector3(side * 0.026, y, 0.118),
          new THREE.Vector3(side * 0.070, y + ang * 0.03, 0.124),
          new THREE.Vector3(side * 0.125, y + ang * 0.07 - 0.008, 0.114)
        ];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), whiskerMat);
        this.head.add(line);
      }
    }
  }

  buildLegs() {
    this.legs = [];
    const defs = [
      { parent: this.chest, x: -0.075, z: 0.05, front: true },
      { parent: this.chest, x: 0.075, z: 0.05, front: true },
      { parent: this.hips, x: -0.075, z: -0.04, front: false },
      { parent: this.hips, x: 0.075, z: -0.04, front: false }
    ];
    for (const d of defs) {
      const root = new THREE.Group();
      root.position.set(d.x, -0.05, d.z);
      d.parent.add(root);

      const upperLen = d.front ? 0.13 : 0.15;
      const upper = capsule(d.front ? 0.037 : 0.05, upperLen, this.matFur, 0.88, 1, 0.88, FUR_KIND.leg);
      upper.position.y = -upperLen / 2 - 0.02;
      addOutline(upper, 1.06);
      root.add(upper);

      const knee = new THREE.Group();
      knee.position.y = -upperLen - 0.04;
      root.add(knee);

      const lowerLen = 0.13;
      const lower = capsule(0.027, lowerLen, this.matFur, 0.88, 1, 0.88, FUR_KIND.leg);
      lower.position.y = -lowerLen / 2 - 0.015;
      addOutline(lower, 1.07);
      knee.add(lower);

      // Cream paws / socks
      const paw = new THREE.Group();
      const pawBall = ball(0.034, this.matBelly, 1, 0.65, 1.35, 18, 12);
      paw.add(pawBall);

      // Pink paw beans / pads
      const mainPad = ball(0.014, this.matPawPad, 1.1, 0.4, 1.0, 10, 8);
      mainPad.position.set(0, -0.022, 0.005);
      paw.add(mainPad);
      for (let t = -1; t <= 1; t++) {
        const toe = ball(0.007, this.matPawPad, 1, 0.4, 1, 8, 6);
        toe.position.set(t * 0.014, -0.022, 0.024);
        paw.add(toe);
      }

      paw.position.set(0, -lowerLen - 0.058, 0.014);
      knee.add(paw);

      this.legs.push({ root, knee, front: d.front, upperLen, lowerLen, paw });
    }
  }

  buildTail() {
    this.tailSegs = [];
    let parent = this.hips;
    let segLen = 0.09;
    const root = new THREE.Group();
    root.position.set(0, 0.05, -0.14);
    parent.add(root);
    let cur = root;
    const segCount = 5;
    for (let i = 0; i < segCount; i++) {
      const seg = new THREE.Group();
      if (i > 0) seg.position.z = -segLen * 0.82;
      const r = 0.034 - i * 0.003;
      const mesh = capsule(r, segLen, this.matFur, 1, 1, 1, FUR_KIND.tail);
      mesh.userData.tailIndex = i;
      mesh.userData.tailSegs = segCount;
      mesh.userData.tailSegLen = segLen;
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = -segLen / 2;
      addOutline(mesh, 1.07);
      seg.add(mesh);
      cur.add(seg);
      this.tailSegs.push(seg);
      cur = seg;
    }
    root.rotation.x = 0.85;
    this.tailRoot = root;
  }

  update(dt, moveSpeed = 0, grounded = true, isSprinting = false, isTurning = false, inWater = false, nearObject = null) {
    this.time += dt;
    const time = this.time;
    this.isSprinting = isSprinting;
    this.isTurning = isTurning;
    this.inWater = inWater;

    const cfg = this.getMoodConfig();
    if (this.moodTimer > 0) {
      this.moodTimer -= dt;
      if (this.moodTimer <= 0) this.setMood('calm', -1);
    }

    if (inWater) this.setMood('cautious', 0.3, 1);
    if (nearObject === 'yarn') this.setMood('playful', 0.4, 1);
    if (nearObject === 'npc') this.setMood('curious', 0.4, 1);
    if (isSprinting) this.setMood('alert', 0.4, 1);

    const target = THREE.MathUtils.clamp(moveSpeed / 6, 0, 1.4);
    this.speedBlend += (target - this.speedBlend) * Math.min(1, dt * 8);
    const sb = this.speedBlend;

    if (this.jumpTime > 0) this.jumpTime -= dt;
    if (this.landTime > 0) this.landTime -= dt;

    let state = 'idle';
    if (!grounded) state = 'jump';
    else if (this.landTime > 0) state = 'land';
    else if (isSprinting && moveSpeed > 0.5) state = 'run';
    else if (moveSpeed > 0.1) state = 'walk';
    else if (isTurning) state = 'turn';
    this.state = state;

    if (state === 'idle') {
      this.idleTimer += dt;
      if (!this.idleAction && this.idleTimer >= this.nextIdleTime) {
        this.beginIdleAction();
      }
    } else {
      this.idleTimer = 0;
      if (this.idleAction) this.endIdleAction();
    }

    if (this.isDrinking) {
      if (this.idleAction) this.endIdleAction();
      this.state = 'drink';
      this.applyDrinkingPose(time);
    } else if (this.idleAction) {
      this.applyIdleAction(dt);
    } else {
      this.animateLocomotion(dt, time, sb, grounded, isSprinting, isTurning);
    }

    this.applyMood(dt, time, cfg);
  }

  getMoodConfig() {
    const map = {
      calm:       { earTwitchBase: 1.5, blinkBase: 1.0, pupilScale: 1.0, tailSpeed: 1.0, tailLift: 0.0,  headScan: 1.0 },
      curious:    { earTwitchBase: 1.0, blinkBase: 0.9, pupilScale: 1.08, tailSpeed: 0.9, tailLift: 0.10, headScan: 1.4 },
      playful:    { earTwitchBase: 0.6, blinkBase: 0.85, pupilScale: 1.15, tailSpeed: 1.6, tailLift: 0.35, headScan: 1.8 },
      sleepy:     { earTwitchBase: 3.0, blinkBase: 1.8, pupilScale: 0.90, tailSpeed: 0.4, tailLift: -0.05, headScan: 0.4 },
      startled:   { earTwitchBase: 0.2, blinkBase: 0.15, pupilScale: 1.25, tailSpeed: 2.2, tailLift: 0.55, headScan: 2.5 },
      alert:      { earTwitchBase: 0.7, blinkBase: 0.7, pupilScale: 1.10, tailSpeed: 1.3, tailLift: 0.20, headScan: 1.3 },
      cautious:   { earTwitchBase: 1.2, blinkBase: 1.0, pupilScale: 1.0, tailSpeed: 0.7, tailLift: -0.10, headScan: 0.8 }
    };
    return map[this.mood] || map.calm;
  }

  setMood(name, duration = 2.0, priority = 0) {
    if (priority < this.moodPriority && this.moodTimer > 0 && name !== 'calm') return;
    if (name === 'calm') priority = 0;
    this.mood = name;
    this.moodTimer = Math.max(duration, 0);
    this.moodPriority = priority;
    if (this.audio) {
      if (name === 'playful' && this.canPlaySound('trill')) this.audio.playTrill();
      else if (name === 'startled' && this.canPlaySound('hiss')) this.audio.playHiss();
      else if (name === 'curious' && this.canPlaySound('chirp')) this.audio.playChirp();
    }
  }

  canPlaySound(type, cooldown = 1.5) {
    const now = performance.now() / 1000;
    this.soundCooldowns = this.soundCooldowns || {};
    if (now - (this.soundCooldowns[type] || 0) < cooldown) return false;
    this.soundCooldowns[type] = now;
    return true;
  }

  onJump() {
    this.jumpTime = 0.35;
    this.setMood('alert', 0.6, 2);
  }

  onLand() {
    this.landTime = 0.18;
  }

  onSprint(active) {
    if (active) this.setMood('alert', 0.4, 1);
  }

  setDrinking(active) {
    this.isDrinking = !!active;
    if (this.isDrinking && this.idleAction) this.endIdleAction();
    if (!this.isDrinking && this.muzzle) this.muzzle.scale.set(1, 1, 1);
  }

  applyDrinkingPose(time) {
    const lap = Math.max(0, Math.sin(time * 13));
    this.body.position.y = -0.075;
    this.body.rotation.x = 0.12;
    this.body.rotation.z = 0;
    this.chest.position.y = this.base.chestY - 0.055;
    this.hips.position.y = this.base.hipsY - 0.025;
    this.head.position.y = this.base.headY - 0.11;
    this.head.rotation.x = 0.72 + lap * 0.035;
    this.head.rotation.y = 0;
    this.neck.rotation.x = 0.48;
    this.tailRoot.rotation.x = 0.72 + Math.sin(time * 1.8) * 0.04;
    for (let i = 0; i < 4; i++) {
      this.legs[i].root.rotation.x = i < 2 ? 0.18 : -0.08;
      this.legs[i].knee.rotation.x = i < 2 ? -0.2 : 0.1;
    }
    if (this.muzzle) this.muzzle.scale.set(1, 1 + lap * 0.08, 1);
  }

  beginIdleAction() {
    // Balanced idle repertoire (gentle stretches, yawns, occasional grooming/sitting)
    const actions = ['stretch', 'yawn', 'groom', 'sit'];
    const weights = [0.35, 0.30, 0.20, 0.15];
    const r = Math.random();
    let choice = 'stretch';
    let c = 0;
    for (let i = 0; i < actions.length; i++) {
      c += weights[i];
      if (r <= c) { choice = actions[i]; break; }
    }
    this.idleAction = choice;
    this.idleActionTimer = 0;
    this.idleActionDuration = choice === 'sit' ? 4 + Math.random() * 2 : choice === 'groom' ? 2.5 + Math.random() * 1.5 : choice === 'stretch' ? 2.2 + Math.random() : 1.6 + Math.random();
    this.yawnOpen = 0;
    if (this.audio && choice === 'sit' && Math.random() > 0.6) this.audio.playPurr(this.idleActionDuration);
  }

  endIdleAction() {
    this.idleAction = null;
    this.idleActionTimer = 0;
    this.idleTimer = 0;
    this.nextIdleTime = 18.0 + Math.random() * 14.0;
    this.yawnOpen = 0;
    if (this.muzzle) this.muzzle.scale.set(1, 1, 1);
  }

  applyIdleAction(dt) {
    this.idleActionTimer += dt;
    const d = this.idleActionDuration;
    const p = this.idleActionTimer / d;

    let blend;
    if (p < 0.2) blend = p / 0.2;
    else if (p < 0.65) blend = 1.0;
    else blend = Math.max(0, 1 - (p - 0.65) / 0.35);
    blend = blend * blend * (3 - 2 * blend);

    const pose = this.getIdlePose(this.idleAction);
    this.yawnOpen = (this.idleAction === 'yawn') ? blend : 0;

    this.body.position.y = THREE.MathUtils.lerp(this.base.bodyY, pose.bodyY, blend);
    this.body.rotation.x = THREE.MathUtils.lerp(this.base.bodyRotX, pose.bodyRotX, blend);
    this.body.rotation.z = THREE.MathUtils.lerp(this.base.bodyRotZ, pose.bodyRotZ, blend);
    this.chest.position.y = THREE.MathUtils.lerp(this.base.chestY, pose.chestY, blend);
    this.hips.position.y = THREE.MathUtils.lerp(this.base.hipsY, pose.hipsY, blend);
    this.head.position.y = THREE.MathUtils.lerp(this.base.headY, pose.headY, blend);
    this.head.rotation.x = THREE.MathUtils.lerp(this.base.headRotX, pose.headRotX, blend);
    this.head.rotation.y = THREE.MathUtils.lerp(this.base.headRotY, pose.headRotY, blend);
    this.neck.rotation.x = THREE.MathUtils.lerp(this.base.neckX, pose.neckX, blend);
    this.tailRoot.rotation.x = THREE.MathUtils.lerp(this.base.tailRootX, pose.tailRootX, blend);
    for (let i = 0; i < 4; i++) {
      this.legs[i].root.rotation.x = THREE.MathUtils.lerp(this.base.legRootX[i], pose.legRootX[i], blend);
      this.legs[i].knee.rotation.x = THREE.MathUtils.lerp(this.base.legKneeX[i], pose.legKneeX[i], blend);
    }
    this.ears[0].rotation.x = THREE.MathUtils.lerp(this.base.earX[0], pose.earX[0], blend);
    this.ears[1].rotation.x = THREE.MathUtils.lerp(this.base.earX[1], pose.earX[1], blend);

    if (this.muzzle && pose.muzzleScaleY) {
      this.muzzle.scale.set(1, THREE.MathUtils.lerp(1, pose.muzzleScaleY, blend), 1);
    }

    if (this.idleActionTimer >= d) this.endIdleAction();
  }

  getIdlePose(name) {
    const pose = {
      bodyY: 0, bodyRotX: 0, bodyRotZ: 0,
      chestY: this.base.chestY, hipsY: this.base.hipsY, headY: this.base.headY,
      headRotX: 0, headRotY: 0, neckX: 0, tailRootX: this.base.tailRootX,
      legRootX: [0, 0, 0, 0], legKneeX: [0, 0, 0, 0],
      earX: [-0.12, -0.12]
    };
    if (name === 'sit') {
      pose.bodyY = -0.10;
      pose.chestY = 0.41;
      pose.hipsY = 0.39;
      pose.headY = 0.14;
      pose.headRotX = 0.05;
      pose.tailRootX = 0.55;
      pose.legRootX = [-0.6, -0.6, 0.75, 0.75];
      pose.legKneeX = [-0.9, -0.9, 0.85, 0.85];
    } else if (name === 'groom') {
      pose.bodyY = -0.06;
      pose.chestY = 0.43;
      pose.hipsY = 0.41;
      pose.headRotX = 0.45;
      pose.headRotY = 0.28;
      pose.neckX = 0.35;
      pose.legRootX[2] = -0.9;
      pose.legKneeX[2] = -1.4;
      pose.legRootX[0] = 0.15;
      pose.legKneeX[0] = -0.15;
    } else if (name === 'stretch') {
      pose.bodyY = -0.12;
      pose.chestY = 0.43;
      pose.hipsY = 0.41;
      pose.headRotX = -0.20;
      pose.tailRootX = 0.30;
      pose.legRootX[0] = 0.75;
      pose.legKneeX[0] = 0.1;
      pose.legRootX[1] = 0.75;
      pose.legKneeX[1] = 0.1;
      pose.legRootX[2] = 0.35;
      pose.legKneeX[2] = -0.25;
      pose.legRootX[3] = 0.35;
      pose.legKneeX[3] = -0.25;
    } else if (name === 'yawn') {
      pose.bodyRotX = -0.06;
      pose.headRotX = -0.4;
      pose.headRotY = 0.08;
      pose.earX = [-0.20, -0.20];
      pose.muzzleScaleY = 1.5;
    }
    return pose;
  }

  triggerMeow() {
    this.isMeowing = true;
    this.meowTimer = 0.55;
    this.setMood('playful', 1.0, 2);
    if (this.audio) this.audio.playMeow();
  }

  /**
   * Master Cat (rank 4, C2.4): the collar bell becomes gold and gains a
   * small twin. A quiet, permanent identity reward for the whole valley.
   */
  setMasterCat() {
    if (this._masterCat) return;
    this._masterCat = true;
    if (this.collarBell) {
      this.collarBell.material = this.matGoldBell;
      const twin = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 10, 8),
        this.matGoldBell
      );
      twin.position.set(0.028, -0.058, 0.082);
      this.neck.add(twin);
      this.collarBellTwin = twin;
    }
  }


  setProwling(prowl) {
    this.isProwling = prowl;
    if (prowl) this.setMood('alert', 0.8, 1);
  }

  animateLocomotion(dt, time, sb, grounded, isSprinting, isTurning) {
    const state = this.state;
    const run = state === 'run';
    const turn = state === 'turn';
    const prowl = this.isProwling;
    const strideFreq = (run ? 6.2 : (prowl ? 2.8 : 4.2)) + sb * (run ? 6.0 : (prowl ? 3.0 : 4.5));
    this.phase += dt * strideFreq * Math.min(sb, 1);
    const p = this.phase * Math.PI * 2;

    for (let i = 0; i < 4; i++) {
      const leg = this.legs[i];
      const phaseOffset = (i === 0 || i === 3) ? 0 : Math.PI;
      const lp = p + phaseOffset;
      const swing = Math.sin(lp);
      const lift = Math.max(0, Math.sin(lp + Math.PI / 2));
      let amp = (prowl ? 0.35 : 0.55) * Math.min(sb, 1);

      if (state === 'jump') {
        // Dynamic feline leap pose: front paws stretch forward, rear legs kick back
        leg.root.rotation.x = leg.front ? -0.85 : 0.95;
        leg.knee.rotation.x = leg.front ? -1.15 : 0.75;
      } else if (state === 'land') {
        leg.root.rotation.x = leg.front ? -0.20 : 0.12;
        leg.knee.rotation.x = leg.front ? -0.50 : -0.20;
      } else if (!grounded) {
        leg.root.rotation.x = leg.front ? -0.75 : 0.80;
        leg.knee.rotation.x = leg.front ? -1.0 : 0.65;
      } else if (turn) {
        const shuffle = Math.sin(time * 6 + i * Math.PI) * 0.08;
        leg.root.rotation.x = shuffle + (i % 2 === 0 ? 0.1 : -0.1);
        leg.knee.rotation.x = -0.15;
      } else {
        leg.root.rotation.x = swing * amp * (leg.front ? 1 : 0.9);
        // Front carpus folds forward (negative), hind hock folds the
        // OPPOSITE way (positive) — real cat hind-limb anatomy.
        const kneeDir = leg.front ? -1 : 1;
        leg.knee.rotation.x = (lift * amp * 1.4 + sb * 0.1) * kneeDir;
      }
    }

    const bob = Math.sin(p * 2) * (prowl ? 0.008 : 0.018) * sb;
    const breathe = Math.sin(time * 2.2) * 0.008 * (1 - sb);
    let bodyY = bob + breathe - (prowl ? 0.08 : 0);
    let bodyRotX = prowl ? 0.06 : 0;
    let bodyRotZ = Math.sin(p) * 0.03 * sb;

    if (state === 'jump') {
      bodyY = 0.08;
      bodyRotX = -0.22;
      bodyRotZ = 0;
    } else if (state === 'land') {
      bodyY = -0.07;
      bodyRotX = 0.04;
      bodyRotZ = 0;
    } else if (!grounded) {
      bodyRotX = -0.18;
    }

    this.body.position.y = bodyY;
    this.body.rotation.x = bodyRotX;
    this.body.rotation.z = bodyRotZ;

    if (state === 'jump') {
      this.chest.rotation.x = 0.12;
      this.hips.rotation.x = -0.25;
      this.neck.rotation.x = 0.20;
    } else if (state === 'land') {
      this.chest.rotation.x = -0.08;
      this.hips.rotation.x = 0.08;
      this.neck.rotation.x = -0.05;
    } else {
      this.chest.rotation.x = Math.sin(p * 2) * 0.025 * sb + (grounded ? 0 : -0.15);
      this.hips.rotation.x = -Math.sin(p * 2) * 0.03 * sb + (grounded ? 0 : 0.2);
      this.neck.rotation.x = Math.sin(p * 2 + 0.9) * 0.04 * sb - 0.05 + (grounded ? 0 : 0.25);
    }

    this.head.rotation.y = Math.sin(time * 0.45) * 0.22 * (1 - sb);
    this.head.rotation.x = Math.sin(time * 0.7) * 0.06 * (1 - sb) + (prowl ? -0.12 : 0);

    // Meow vocalization mouth & head tilt
    if (this.isMeowing) {
      this.meowTimer -= dt;
      const meowProgress = this.meowTimer / 0.55;
      const meowOpen = Math.sin((1 - meowProgress) * Math.PI);
      if (this.muzzle) this.muzzle.scale.set(1.1, 1 + meowOpen * 0.6, 1.1);
      this.head.rotation.x -= meowOpen * 0.18;
      if (this.meowTimer <= 0) {
        this.isMeowing = false;
        if (this.muzzle) this.muzzle.scale.set(1, 1, 1);
      }
    }

    // Expressive tail
    const cfg = this.getMoodConfig();
    const tailSpeed = cfg.tailSpeed;
    const tailLift = cfg.tailLift;
    for (let i = 0; i < this.tailSegs.length; i++) {
      const seg = this.tailSegs[i];
      const wave = Math.sin(time * (2.2 * tailSpeed + sb * 3) - i * 0.7);
      const lift = Math.sin(time * 1.6 - i * 0.5);

      const curl = (i >= 3 && !prowl) ? 0.20 * (i - 2) : 0;
      seg.rotation.y = wave * (0.14 + sb * 0.1);
      seg.rotation.x = (i === 0 ? lift * 0.08 : lift * 0.05 - 0.06) + curl;
    }

    let trBase = prowl ? 0.35 : 0.95;
    if (state === 'jump') trBase = 1.35;
    else if (state === 'land') trBase = 0.55;
    else if (run) trBase = 1.15;
    this.tailRoot.rotation.x = trBase + Math.sin(time * 1.6) * 0.08 + sb * 0.25 + (grounded ? 0 : -0.2) + tailLift;
  }

  applyMood(dt, time, cfg) {
    this.earTwitchTimer -= dt;
    if (this.earTwitchTimer <= 0) {
      this.earTwitch = 0.25;
      this.earTwitchTimer = (2.5 + Math.random() * 5) * cfg.earTwitchBase;
    }
    if (this.earTwitch > 0) {
      this.earTwitch -= dt;
      const k = Math.sin(this.earTwitch * 40) * this.earTwitch * 1.2;
      this.ears[0].rotation.x = this.base.earX[0] + k + ((this.mood === 'alert' || this.mood === 'startled') ? 0.25 : 0);
      this.ears[1].rotation.x = this.base.earX[1] + Math.sin(time * 1.1) * 0.03 + ((this.mood === 'alert' || this.mood === 'startled') ? 0.25 : 0);
    } else {
      this.ears[0].rotation.x = this.base.earX[0];
      this.ears[1].rotation.x = this.base.earX[1] + Math.sin(time * 1.1) * 0.03;
    }
    if (this.isSprinting) {
      this.ears[0].rotation.x -= 0.12;
      this.ears[1].rotation.x -= 0.12;
    }

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blink = 0.16;
      this.blinkTimer = (2 + Math.random() * 4) * cfg.blinkBase;
    }
    let blinkSquint = 1;
    if (this.blink > 0) {
      this.blink -= dt;
      const k = this.blink > 0.08 ? (0.16 - this.blink) / 0.08 : this.blink / 0.08;
      blinkSquint = 1 - k * 0.92;
    }
    const squint = blinkSquint * (1 - this.yawnOpen * 0.55);
    const pupilScale = cfg.pupilScale;
    // Almond baseline (y squashed) preserved through blinks
    for (const eye of this.eyes) eye.scale.y = 0.74 * squint;
    for (const pupil of this.pupils) pupil.scale.y = 1.0 * squint * pupilScale;

    if (!this.idleAction) {
      const scan = cfg.headScan;
      this.head.rotation.y += Math.sin(time * 0.45) * 0.1 * (scan - 1);
      this.head.rotation.x += Math.sin(time * 0.7) * 0.03 * (scan - 1);
    }
  }
}
