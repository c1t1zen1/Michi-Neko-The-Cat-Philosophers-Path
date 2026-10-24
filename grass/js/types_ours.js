// Family 1 — five variations on the grass the game ships today
// (src/vegetation.js: bladeGeometry + grassMaterial + buildGrass).
import * as THREE from 'three';
import { mulberry32, singleBlade, tuftGeometry, RibbonBuilder, seedHeadDecor, packCell } from './kit.js';
import { ribbonMake, MEADOW, PLACE_MEADOW } from './types_util.js';

/* ---- 1. Meadow Classic: the shipped CPU-placed InstancedMesh ---- */

function gameBladeGeometry(rows = 4, baseWidth = 0.048, height = 0.95, curveAmt = 0.32, taperPow = 1.35) {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const w = baseWidth * Math.pow(1.0 - t, taperPow);
    const curve = t * t * curveAmt;
    positions.push(-w / 2, t * height, curve * 0.35, 0, t * height, curve, w / 2, t * height, curve * 0.35);
    uvs.push(0, t, 0.5, t, 1, t);
  }
  positions.push(0, height, curveAmt * 1.09);
  uvs.push(0.5, 1.0);
  const apex = rows * 3;
  for (let i = 0; i < rows - 1; i++) {
    const a = i * 3, b = (i + 1) * 3;
    indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const last = (rows - 1) * 3;
  indices.push(last, apex, last + 1, last + 1, apex, last + 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** The game's grassMaterial(), unchanged except that it shares the patch uniforms. */
function classicMaterial(ctx) {
  const U = ctx.U;
  const uniforms = {
    uTime: U.uTime, uPlayerPos: U.uFocus, uSunDir: U.uSunDir, uSunColor: U.uSunCol, uWind: U.uWind,
    uRootColor: { value: new THREE.Color(0x36622a) },
    uMidColor: { value: new THREE.Color(0x669a3e) },
    uTipColor: { value: new THREE.Color(0xa6c65c) }
  };
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `
      uniform float uTime;
      uniform vec3 uPlayerPos;
      uniform float uWind;
      attribute float aPhase;
      attribute vec3 aTint;
      attribute float aWidthScale;
      attribute float aCurveAngle;
      varying float vT;
      varying vec3 vTint;
    ` + shader.vertexShader
      .replace('#include <beginnormal_vertex>', `
        #include <beginnormal_vertex>
        objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.8));
      `)
      .replace('#include <begin_vertex>', `
        vT = uv.y;
        vTint = aTint;
        vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float speedVar = 0.75 + fract(aPhase * 3.17) * 0.5;
        float gustTime = uTime * 0.25 * speedVar;
        float gust = sin(gustTime * 1.3 + base.x * 0.18 + base.z * 0.14 + aPhase);
        float gust2 = sin(gustTime * 0.6 + base.x * 0.06 - base.z * 0.08 + aPhase * 0.5);
        float flutter = sin(gustTime * 2.6 + aPhase * 6.0) * 0.12;
        float windMul = 1.0 + uWind * 1.5;
        float sway = (gust * 0.6 + gust2 * 0.35 + flutter) * 0.20 * windMul;
        float w = vT * vT;
        vec3 pos = position;
        pos.x *= aWidthScale;
        pos.x += sin(aCurveAngle) * 0.18 * w;
        pos.z += cos(aCurveAngle) * 0.18 * w;
        pos.x += sway * w;
        pos.z += sway * 0.5 * w;
        pos.y *= 1.0 - abs(sway) * 0.16 * w;
        vec2 away = base.xz - uPlayerPos.xz;
        float dist = length(away);
        float push = smoothstep(0.95, 0.05, dist);
        if (push > 0.001) {
          vec2 dir = dist > 0.001 ? away / dist : vec2(0.0, 1.0);
          float bendAmt = push * 0.65 * w;
          pos.x += dir.x * bendAmt;
          pos.z += dir.y * bendAmt;
          pos.y *= 1.0 - push * 0.62 * vT;
        }
        vec3 transformed = pos;
      `);
    shader.fragmentShader = `
      uniform vec3 uRootColor;
      uniform vec3 uMidColor;
      uniform vec3 uTipColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      varying float vT;
      varying vec3 vTint;
    ` + shader.fragmentShader
      .replace('#include <normal_fragment_begin>', `
        #include <normal_fragment_begin>
        normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), 0.85));
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        vec3 gcol = (vT < 0.5) ? mix(uRootColor, uMidColor, vT * 2.0) : mix(uMidColor, uTipColor, (vT - 0.5) * 2.0);
        diffuseColor.rgb *= gcol * vTint;
      `)
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        vec3 gSunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
        float gThru = pow(max(dot(normalize(-vViewPosition), gSunV), 0.0), 3.0);
        totalEmissiveRadiance += gcol * vTint * uSunColor * (gThru * 0.5 + 0.06) * vT * vT;
      `);
  };
  mat.customProgramCacheKey = () => 'lab-meadow-classic';
  return mat;
}

const CLASSIC_PER_M2 = 1800;

function classicMake(ctx, cell) {
  const rng = mulberry32(cell.seed * 7919 + 13);
  const full = Math.ceil(CLASSIC_PER_M2 * cell.size * cell.size);
  const base = ctx.cache('classic:geo', () => gameBladeGeometry());
  const geo = base.clone();
  const mat = ctx.cache('classic:mat', () => classicMaterial(ctx));
  const mesh = new THREE.InstancedMesh(geo, mat, full);
  const phases = new Float32Array(full), tints = new Float32Array(full * 3);
  const widths = new Float32Array(full), curves = new Float32Array(full);
  const dummy = new THREE.Object3D();
  let placed = 0, guard = 0;
  while (placed < full && guard < full * 6) {
    guard++;
    const x = cell.ox + rng() * cell.size, z = cell.oz + rng() * cell.size;
    const patchNoise = Math.sin(x * 0.9) * Math.cos(z * 1.0) + 0.55 * Math.sin(x * 1.9 + z * 1.5) + 0.3 * Math.cos((x - z) * 1.3);
    if (patchNoise < -0.35 && rng() < 0.65) continue;
    if (patchNoise < 0.0 && rng() < 0.25) continue;
    const thick = patchNoise > 0.35, sparse = patchNoise < -0.2;
    let s = 0.22 + rng() * 0.22;
    if (thick) s *= 1.5 + rng() * 0.8;
    if (sparse) s *= 0.75 + rng() * 0.3;
    let wScale = 0.38 + rng() * 0.28;
    if (rng() > 0.9) wScale = 0.85 + rng() * 0.35;
    dummy.position.set(x, 0, z);
    dummy.scale.set(1, s, 1);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    phases[placed] = rng() * Math.PI * 2;
    widths[placed] = wScale * 1.05;
    curves[placed] = rng() * Math.PI * 2;
    const f = rng();
    let r, g, b;
    if (f < 0.30) { r = 0.62 + rng() * 0.1; g = 0.82 + rng() * 0.1; b = 0.72 + rng() * 0.1; }
    else if (f < 0.60) { r = 0.82 + rng() * 0.1; g = 0.98 + rng() * 0.08; b = 0.78 + rng() * 0.1; }
    else if (f < 0.82) { r = 0.90 + rng() * 0.08; g = 0.95 + rng() * 0.08; b = 0.80 + rng() * 0.1; }
    else { r = 1.02 + rng() * 0.08; g = 0.98 + rng() * 0.06; b = 0.62 + rng() * 0.08; }
    let br = 0.72 + rng() * 0.26;
    if (thick) br *= 0.82;
    tints[placed * 3] = br * r; tints[placed * 3 + 1] = br * g; tints[placed * 3 + 2] = br * b;
    placed++;
  }
  mesh.count = placed;
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases.subarray(0, placed), 1));
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints.subarray(0, placed * 3), 3));
  geo.setAttribute('aWidthScale', new THREE.InstancedBufferAttribute(widths.subarray(0, placed), 1));
  geo.setAttribute('aCurveAngle', new THREE.InstancedBufferAttribute(curves.subarray(0, placed), 1));
  mesh.frustumCulled = false;
  const tris = base.index.count / 3;
  mesh.userData.hash = { tris, apply(f) { mesh.count = Math.max(1, Math.floor(placed * f)); } };
  mesh.userData.kb = placed * (64 + 4 + 12 + 4 + 4) / 1024;
  mesh.userData.dispose = () => geo.dispose();
  return packCell([mesh]);
}

/* ---- 2. Zero-Attribute Meadow: same look, placement hashed on the GPU ---- */

const zeroAttr = {
  id: 'meadow-gpu', perM2: 1800,
  geo: () => singleBlade(4),
  palette: MEADOW, ao: 0.4, trans: 0.65, spec: 0.08,
  place: PLACE_MEADOW
};

/* ---- 3. Tuft Meadow: five blades per instance ---- */

const tuft = {
  id: 'meadow-tuft', perM2: 380, itemsPer: 5,
  geo: () => tuftGeometry({ count: 5, rows: 3, spread: 0.042, hMin: 0.62, hMax: 1.0, lean: 1.25, wMul: 1.15, seed: 4 }),
  palette: MEADOW, ao: 0.38, trans: 0.65, spec: 0.08,
  place: PLACE_MEADOW + `
  B.w *= 1.1;`,
  fragColor: 'albedo *= 0.86 + 0.07 * vX.w;'
};

/* ---- 4. Cat-Eye Thicket: undergrowth, mid blades and seed-head stalks ---- */

function thicketGeometry() {
  const rnd = mulberry32(9);
  const b = new RibbonBuilder();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd();
    b.blade({ rows: 3, offX: Math.sin(a) * 0.03, offZ: Math.cos(a) * 0.03, yaw: a, lean: 1.3, h: 0.5 + rnd() * 0.15, w: 1.5, cls: 0 });
  }
  for (let i = 0; i < 3; i++) {
    const a = rnd() * 6.28;
    b.blade({ rows: 4, offX: Math.sin(a) * 0.02, offZ: Math.cos(a) * 0.02, yaw: a, lean: 1.0, h: 0.95 + rnd() * 0.25, w: 1.0, cls: 1 });
  }
  for (let i = 0; i < 2; i++) {
    const a = rnd() * 6.28;
    const st = b.blade({ rows: 6, offX: Math.sin(a) * 0.015, offZ: Math.cos(a) * 0.015, yaw: a, lean: 0.7, h: 1.65 + rnd() * 0.3, w: 0.5, cls: 2 });
    if (i === 0) {   // one headed stalk per tuft; its twin is a bare reed
      const [v, t] = seedHeadDecor(st, 0.05, 0.008);
      b.decor(st, v, t, 1);
    }
  }
  return b.build();
}

const thicket = {
  id: 'meadow-thicket', perM2: 300, itemsPer: 9,
  geo: thicketGeometry,
  palette: { root: 0x1f4620, mid: 0x4f8434, tip: 0xa2c55a }, ao: 0.12, trans: 1.0, spec: 0.1,
  defines: { WIND_GAIN: '1.0' },
  place: PLACE_MEADOW + `
  B.h = (0.26 + r1 * 0.14) * (1.0 + thick * 0.5);
  B.w = 0.011 + r2 * 0.006;`,
  pre: 'wv *= 0.7 + aShape.w * 0.55;',
  fragColor: `
    if (vY.w > 0.5) {
      albedo = mix(vec3(0.30, 0.20, 0.07), vec3(0.62, 0.44, 0.16), vX.x);
    } else if (vX.w < 0.5) {
      albedo *= vec3(0.6, 0.72, 0.62);
    } else if (vX.w > 1.5) {
      albedo = mix(albedo, vec3(0.78, 0.68, 0.34) * vTint, smoothstep(0.5, 1.0, t));
    }`
};

/* ---- 5. Painted Meadow: toon bands + travelling wind brushstrokes ---- */

const painted = {
  id: 'meadow-painted', perM2: 1800,
  geo: () => singleBlade(4),
  palette: { root: 0x14473a, mid: 0x3d9640, tip: 0xc8e05a }, ao: 0.5, trans: 0.0, spec: 0.0,
  place: PLACE_MEADOW + `
  B.w *= 1.15;`,
  fragLight: `
    float ndl = dot(N, L);
    float wrapv = ndl * 0.5 + 0.5;
    float band = smoothstep(0.30, 0.38, wrapv) * 0.45 + smoothstep(0.56, 0.64, wrapv) * 0.55;
    float stream = vnoise(vW.xz * 0.85 - uWindDir * uTime * 0.9);
    float gustLit = smoothstep(0.40, 0.78, stream);
    vec3 shade = albedo * mix(vec3(0.30, 0.42, 0.62), vec3(1.0, 0.96, 0.84), band);
    shade *= mix(0.68, 1.22, gustLit);
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5) * t;
    col = shade * ao * 0.92 + uSunCol * rim * 0.28 * albedo;`
};

export const OURS = [
  {
    id: 'meadow-classic', family: 'ours', name: 'Meadow Classic', tag: 'The shipped blade, thickened',
    blurb: 'Our current meadow, exactly as src/vegetation.js builds it — CPU-placed InstancedMesh, MeshLambertMaterial patched through onBeforeCompile, one radial push from the cat — run here at 1,800 blades/m² (the shipped field is ~10/m²) so it can be compared on equal terms.',
    how: [
      '4-row tapered blade, 3 verts per row + apex (12 tris).',
      'JS loops once per blade: instanceMatrix + 4 per-instance attributes (phase, tint, width, curve).',
      'Wind and push in the vertex stage via onBeforeCompile; Lambert lighting gives shadows and fog for free.',
      'Push is a single circle around the player — no memory, no ripples.'
    ],
    code: `mat.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>', \`
    float w = vT * vT;                       // root pinned
    pos.x += sway * w;  pos.z += sway * 0.5 * w;
    float push = smoothstep(0.95, 0.05, dist);
    pos.xz += dir * push * 0.65 * w;         // lean away
    pos.y  *= 1.0 - push * 0.62 * vT;        // and flatten\`);
};`,
    sources: [['src/vegetation.js', '../src/vegetation.js']],
    gpu: 3, use: 'What every meadow in the game runs today.',
    perM2: CLASSIC_PER_M2, ground: 0x59693a, soil: 0xdfe8d2,
    make: classicMake
  },
  {
    ...zeroAttr, family: 'ours', name: 'Zero-Attribute Meadow', tag: 'No buffers — every blade is a hash',
    blurb: 'The same blade, palette and colour flavours, but nothing is stored per blade. The vertex shader hashes gl_InstanceID into a position, height, lean and tint, so the CPU only sets one number: the grid size. Drops ~90 bytes/blade of buffers and all JS build time.',
    how: [
      'InstancedBufferGeometry with no instanced attributes — only instanceCount.',
      'pcg() integer hash → jittered-grid position, 5 random streams per blade.',
      'fbm patchiness thins clearings and grows thick clumps, as in the game.',
      'Density is a uniform (uGrid), so a quality governor is free.'
    ],
    code: `uint s = pcg(uint(gl_InstanceID) * 2654435761u + seed);
B.root = gridPos(s, id);                    // jittered grid
float n = fbm(B.root * 1.6);                // meadow patchiness
B.h = (0.22 + rnd(s) * 0.24) * (1.0 + smoothstep(.5,.7,n) * 0.8);
B.yaw = rnd(s) * 6.2832;
// JS: geo.instanceCount = G * G;  (that's all)`,
    sources: [['Cinevva — False Earth spikes', 'https://app.cinevva.com/blog/2026-05-14-open-world-browser-part-28-grass-and-occlusion']],
    gpu: 3, use: 'The recommended base for every meadow.',
    ground: 0x59693a, soil: 0xdfe8d2,
    make: ribbonMake(zeroAttr)
  },
  {
    ...tuft, family: 'ours', name: 'Tuft Meadow', tag: 'Five blades per instance',
    blurb: 'Blades are baked into 5-blade tufts that fan outward from a shared root. One hash feeds five blades, so the instance count (and hash cost) drops five-fold while the field reads thicker and more naturally clumped.',
    how: [
      'Tuft geometry: centre blade tallest, four more fanned outward, 3 rows each (25 tris/tuft).',
      'Per-vertex attributes (offset, yaw, lean, height) are baked once and shared by every tuft.',
      'Tuft root/tint/height from the same meadow hash — blades share clump identity.',
      'Per-blade brightness from the blade index keeps tufts from looking stamped.'
    ],
    code: `// build once
const geo = tuftGeometry({ count: 5, rows: 3, spread: 0.042 });
// vertex: tuft root + per-blade offset rotated by tuft yaw
vec2 off = rot(B.yaw) * aBlade.xy;
float yaw = B.yaw + aBlade.z;               // outward fan
float h   = B.h * aShape.x;                 // per-blade height`,
    sources: [['Three.js forum — Grass experiment (clump instancing)', 'https://discourse.threejs.org/t/grass-experiment-injected-meshstandardmaterial-noise-textures-clump-instancing/57598']],
    gpu: 3, use: 'Dense meadow when instance count (not triangles) is the limit.',
    ground: 0x59693a, soil: 0xdfe8d2,
    make: ribbonMake(tuft)
  },
  {
    ...thicket, family: 'ours', name: 'Cat-Eye Thicket', tag: 'Three layers and seed heads',
    blurb: 'Built for the cat’s eye height: each tuft carries dark undergrowth, mid blades and two tall straw-gold stalks (one capped with a seed head), with strong backlight translucency. From above it is a meadow; from the ground it is a forest.',
    how: [
      'One 9-ribbon tuft + a seed-head spindle, classed 0/1/2 by height layer.',
      'Layer class drives colour (dark under, green mid, straw tall) and wind gain (tall stalks sway more).',
      'Seed heads are “tip decor” vertices riding the stalk’s end frame — still one draw call.',
      'Root AO and light bleed make the base dark and the tips glow against the sun.'
    ],
    code: `const st = b.blade({ rows: 6, h: 1.65, w: 0.5, cls: 2 });
const [v, t] = seedHeadDecor(st, 0.05, 0.008);
b.decor(st, v, t, 1);                       // spindle on the stalk tip
// vertex
wv *= 0.7 + aShape.w * 0.55;                // tall stalks sway more
// fragment
if (vY.w > 0.5) albedo = mix(brown, gold, vX.x);   // seed head`,
    sources: [],
    gpu: 3, use: 'Cat-height meadows and the dark tangle at path edges.',
    ground: 0x3d5128, soil: 0xd2dcc2,
    make: ribbonMake(thicket)
  },
  {
    ...painted, family: 'ours', name: 'Painted Meadow', tag: 'Toon bands & wind brushstrokes',
    blurb: 'A Ghibli-leaning take: saturated teal-to-lime ramp, three-band toon lighting and big soft lighter/darker streaks that roll through the field with the wind, like brushstrokes on a painted backdrop. No texture lookups — just value noise in world space.',
    how: [
      'Same hashed blade, repainted: root teal → leaf green → lime tip.',
      'Light is quantised into soft bands (smoothstep, not hard steps) with a cool shadow colour.',
      'World-space value noise scrolls along the wind direction and lifts/lowers the colour — the “gust” you can see.',
      'Rim light on tips separates blades from each other against the white page.'
    ],
    code: `float band = smoothstep(.30,.38,w)*.45 + smoothstep(.56,.64,w)*.55;
float gust = smoothstep(.42,.8, vnoise(vW.xz*.85 - uWindDir*uTime*.9));
vec3 shade = albedo * mix(vec3(.42,.55,.70), vec3(1.12,1.08,.95), band);
shade *= mix(.84, 1.18, gust);              // visible wind fronts`,
    sources: [['GameDev.net — BotW-style toon lighting', 'https://click.gamedev.net/tutorials/programming/graphics/toon-shader-using-unity-r5095']],
    gpu: 2, use: 'Hub meadows, dream sequences, summit clearing.',
    ground: 0x4f7a3c, soil: 0xdde9cc,
    make: ribbonMake(painted)
  }
];
