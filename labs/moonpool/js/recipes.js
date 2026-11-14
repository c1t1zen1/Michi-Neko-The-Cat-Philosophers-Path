// Lab 07 tiles: water, moon, pads, lanterns, night life. Tile code = build().
import * as THREE from 'three';
import { loadHiddenPlacesModule, glowTexture } from '../../shared/game.js';
import { V3, TAU, rng, Bag, merge, instances, tube, canvas2d, canvasTexture } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { HASH, NOISE } from '../../shared/glsl.js';
import { PondWater, moonTexture } from '../../shared/water.js';
import { chochin, floatLantern, takeAkari, washiTexture, lanternMaterial } from '../../shared/paperlantern.js';
import { sourceOf } from '../../shared/workshop.js';

let HP = null;
export async function loadDeps() { ({ HiddenPlaces: HP } = await loadHiddenPlacesModule()); }
const stubCity = () => ({ vegetationExclusions: [], waterRects: [], colliders: [], lanternHaloTex: glowTexture(255, 214, 150), addCollider() {} });
export const gameHidden = () => { const scene = new THREE.Group(); return new HP(scene, stubCity()); };

export const SOURCES = {
  gpgpu: ['three.js r160 · webgl_gpgpu_water example', 'https://github.com/mrdoob/three.js/blob/r160/examples/webgl_gpgpu_water.html', 'source'],
  reflector: ['three.js r160 · Reflector.js', 'https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Reflector.js', 'source'],
  water2: ['three.js · Water2 (flow-mapped water)', 'https://app.unpkg.com/three@0.175.0/files/examples/jsm/objects/Water2.js', 'excerpt'],
  clickto: ['Jaume Sánchez · Codevember ripples (three-buffer wave)', 'https://www.clicktorelease.com/code/codevember-2016/11', 'excerpt'],
  skunami: ['skunami.js · heightfield water for Three.js (pipe model, iWave)', 'https://github.com/layshua/skunami.js', 'excerpt'],
  forum: ['three.js forum · GPUComputationRenderer driving a 128×128 sim', 'https://discourse.threejs.org/t/use-gpucomputationrenderer-texture-for-dynamic-instancedmesh-objects-positions/37741', 'excerpt'],
  ws: ['WaterSurface · image-distortion ripples in R3F', 'https://github.com/nhtoby311/watersurface', 'excerpt'],
  translucent: ['three.js · TranslucentShader (GDC 2011 approximation)', 'https://threejs.org/docs/pages/module-SubsurfaceScatteringShader.html', 'docs'],
  shoji: ['Godot Shaders · Shoji (translucency + sun spot)', 'https://godotshaders.com/?p=8017', 'excerpt'],
  toro: ['Toro nagashi (floating lanterns)', 'https://japanese-wiki-corpus.github.io/culture/Toro Nagashi (Floating Lanterns Down a River).html', 'excerpt'],
  arashi: ['Self Guide Japan · Arashiyama Toro Nagashi 2026', 'https://selfguidejapan.com/blog/toro-nagashi-2026', 'excerpt'],
  shinji: ['Moon Pool research notes (shinji-ike, glitter paths)', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'water', title: 'Eight ways <em>to hold still</em>', sub: 'The game’s glassy disc, then the techniques found in the wild: scrolled normals, analytic rings, a real heightfield, and a painted stroke.' },
  { key: 'moon', title: 'The moon <em>on the water</em>', sub: 'A moon on water is not a disc. It is a column of small glints. Compare the game’s sprite with the real thing.' },
  { key: 'pads', title: 'Pads, <em>and what floats</em>', sub: 'Water lilies lie flat with a notch. Lotus lifts its leaves into the air. They are not the same plant.' },
  { key: 'lanterns', title: 'Light through <em>paper and bamboo</em>', sub: 'The glade’s cylinders, then the real thing: ribs, belly glow, a slotted culm, and a lantern set afloat.' },
  { key: 'night', title: 'Small lights <em>after dark</em>', sub: 'Motes and fireflies, which are nearly free and repay it.' }
];

/* a mini pond shader for the tiles, one MODE per recipe */
const TILE_VS = /* glsl */`varying vec3 vP; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const TILE_FS = /* glsl */`
precision highp float; uniform float uTime; varying vec3 vP; varying vec2 vUv;
${HASH}
${NOISE}
vec3 skyc(vec3 R) { float h = pow(clamp(R.y, 0., 1.), .5); return mix(vec3(.05, .09, .2), vec3(.16, .22, .42), h); }
const vec3 M_D = normalize(vec3(-.45, .78, .42)), C_D = normalize(vec3(.6, .8, .6));
float ringsH(vec2 q, out vec2 g) {
  float s = 0.; g = vec2(0.);
  for (int i = 0; i < 6; i++) {
    float t0 = floor(uTime * .7 + float(i) * .3) + float(i) * 17.3; vec2 c = hash22(vec2(t0, 3.1)) * 2.2 - 1.1;
    float age = fract(uTime * .7 + float(i) * .3) / .7;
    float r = length(q - c);
    float w = 1. - smoothstep(.05, 2.4, age);
    float env = exp(-r * 1.1) * exp(-age * 1.1) * smoothstep(0., .25, age);
    float ph = r * 18. - age * 18.;
    s += sin(ph) * env * w;
    g += cos(ph) * 18. * env * w * (q - c) / max(r, .02);
  }
  return s;
}
void main() {
  vec2 q = vP.xz; vec3 n = vec3(0., 1., 0.); vec3 V = normalize(C_D); vec3 col = vec3(.1);
  #if MODE == 0   // the game's glassy disc
    float fres = .05 + .95 * pow(1. - V.y, 5.); col = mix(vec3(.05, .16, .19), skyc(reflect(-V, n)), fres + .12); col += vec3(.6, .9, .95) * smoothstep(.52, .62, fbm2(q * 3. + uTime * .15, 3)) * .25;
  #elif MODE == 1 // scrolled normal
    vec2 a = q * 3. + uTime * vec2(.12, .09), b = q * 5. - uTime * vec2(.11, .13);
    n.xz += (vec2(vnoise2(a + .3) - vnoise2(a - .3), vnoise2(a.yx + 1.3) - vnoise2(a.yx + .7)) + vec2(vnoise2(b + .3) - vnoise2(b - .3), vnoise2(b.yx + 1.3) - vnoise2(b.yx + .7))) * .7; n = normalize(n);
    float f = .04 + .96 * pow(1. - max(dot(V, n), 0.), 5.); col = mix(vec3(.04, .15, .18), skyc(reflect(-V, n)), clamp(f + .1, 0., 1.)); col += pow(max(dot(reflect(-V, n), M_D), 0.), 300.) * vec3(1., .96, .85) * 1.5;
  #elif MODE == 2 // analytic rings
    vec2 g; float h = ringsH(q, g); n = normalize(vec3(-g.x * .05, 1., -g.y * .05));
    float f = .04 + .96 * pow(1. - max(dot(V, n), 0.), 5.); col = mix(vec3(.04, .14, .17), skyc(reflect(-V, n)), clamp(f + .1, 0., 1.)); col += pow(max(dot(reflect(-V, n), M_D), 0.), 240.) * vec3(1., .96, .85) * 1.5;
  #elif MODE == 3 // glitter path
    vec2 q2 = q * 9.; vec2 id = floor(q2); float sp = 0.;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 c = id + vec2(float(i), float(j)); vec2 h2 = hash22(c); float life = fract(uTime * (.2 + h2.x * .3) + h2.y * 6.);
      float d = length((q2 - c - h2) * vec2(1., 2.4));
      sp += exp(-d * d * 22.) * sin(life * 3.14);
    }
    float path = exp(-pow((q.x * .85 + q.y * .55 + .2) / .28, 2.));
    col = mix(vec3(.04, .08, .16), vec3(.1, .16, .32), smoothstep(-1.2, 1.2, q.y)); col += vec3(1., .96, .82) * sp * path * 2.8;
  #elif MODE == 4 // painted water
    float b = sin((q.x * .6 + q.y) * 6. + vnoise2(q * 2.) * 5. + uTime * .5);
    col = mix(vec3(.13, .36, .42), vec3(.28, .54, .55), smoothstep(-.4, .4, b)); col = mix(col, vec3(.86, .94, .9), smoothstep(.93, .985, sin((q.x * .6 + q.y) * 6. + vnoise2(q * 2.) * 5. + uTime * .5)));
  #elif MODE == 5 // depth-tinted, visible bed
    vec2 re = (vec2(vnoise2(q * 4. + uTime * .2), vnoise2(q.yx * 4. - uTime * .2)) - .5) * .08;
    vec3 v = voronoi2((q + re) * 7.);
    vec3 bed = mix(vec3(.46, .4, .3), vec3(.27, .24, .19), smoothstep(.05, .28, v.x)) * (.8 + v.z * .4);
    float depth = smoothstep(1.3, .15, length(q));
    col = mix(bed, vec3(.03, .17, .2), depth * .92); float f = .03 + pow(1. - V.y, 5.); col = mix(col, skyc(reflect(-V, n)), f + .06);
  #elif MODE == 6 // a sprite disc
    col = mix(vec3(.03, .09, .14), skyc(reflect(-V, n)), .2); float d = length(q * vec2(1.05, 1.3) - vec2(.1, -.1)); col += exp(-d * d * 7.) * vec3(.7, .85, 1.) * .55;
  #elif MODE == 7 // a true reflected disc, broken by waves
    vec2 w = vec2(sin(q.y * 15. + uTime * 1.5) * .018 + vnoise2(q * 11. + uTime * .6) * .03, sin(q.x * 14. + uTime * 1.3) * .012);
    vec3 r = reflect(-V, normalize(vec3(w.x * 5., 1., w.y * 5.))); float k = dot(r, M_D); col = mix(vec3(.03, .08, .15), skyc(r), .3); col += smoothstep(.988, .993, k) * vec3(1., .97, .88) * 2.;
  #elif MODE == 8 // crescent reflection
    vec2 p = (q - vec2(.15, -.05)) * 1.4; float dd = length(p), dc = length(p - vec2(.17, -.04));
    float m = smoothstep(.34, .32, dd) * smoothstep(.27, .3, dc);
    vec2 wob = vec2(sin(q.y * 18. + uTime) * .012, 0.);
    p = (q - vec2(.15, -.05) + wob) * 1.4; dd = length(p); dc = length(p - vec2(.17, -.04)); m = smoothstep(.34, .32, dd) * smoothstep(.27, .3, dc);
    col = vec3(.03, .07, .14) + m * vec3(1., .97, .85) * 1.6;
  #endif
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function pondTile(k, mode, { radius = 1.3, rocks = true } = {}) {
  const T = k.THREE, g = new T.Group(), u = { uTime: { value: 0 } };
  const mat = new T.ShaderMaterial({ uniforms: u, defines: { MODE: mode }, vertexShader: TILE_VS, fragmentShader: TILE_FS });
  const w = new T.Mesh(new T.CircleGeometry(radius, 64).rotateX(-Math.PI / 2), mat); w.position.y = 0.02; w.userData.noShadow = true; g.add(w);
  if (rocks) {
    const list = [], r = k.rand;
    for (let i = 0; i < 26; i++) { const a = i / 26 * k.TAU + r() * 0.1, s = 0.11 + r() * 0.1; list.push({ x: Math.cos(a) * (radius + 0.03), y: 0.04, z: Math.sin(a) * (radius + 0.03), sx: s * 1.3, sy: s * 0.7, sz: s, ry: r() * 6 }); }
    g.add(k.instances(new T.DodecahedronGeometry(1, 1), k.M.rock({ a: 0x5e5a52, b: 0x8d877a, moss: 0.5 }), list));
  }
  return { group: g, update: (t) => { u.uTime.value = t; } };
}

/* floating pads: a disc with a notch, a curled rim and veins */
export function padGeometry(r = 0.3, seg = 40, curl = 0.07) {
  const pos = [0, 0, 0], uv = [0.5, 0.5], idx = [], rings = 8, notch = 0.32;
  for (let i = 1; i <= rings; i++) {
    const rr = r * i / rings;
    for (let j = 0; j <= seg; j++) {
      const a = notch + (TAU - 2 * notch) * j / seg;
      pos.push(Math.cos(a) * rr, curl * Math.pow(i / rings, 4), Math.sin(a) * rr);
      uv.push(0.5 + Math.cos(a) * 0.48 * i / rings, 0.5 + Math.sin(a) * 0.48 * i / rings);
    }
  }
  for (let j = 0; j < seg; j++) idx.push(0, j + 2, j + 1);
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < seg; j++) { const a = 1 + i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
let padTex = null;
export function padMaterial() {
  if (!padTex) {
    const [c, x] = canvas2d(256, 256), r = rng(4);
    const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, '#74a04a'); g.addColorStop(0.8, '#3f7238'); g.addColorStop(1, '#a8884c');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(200,230,150,.5)'; x.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, cx = Math.cos(a), cy = Math.sin(a); x.beginPath(); x.moveTo(128, 128); x.quadraticCurveTo(128 + cx * 60 + r() * 8, 128 + cy * 60 + r() * 8, 128 + cx * 122, 128 + cy * 122); x.stroke(); }
    padTex = canvasTexture(c);
  }
  return M.plain(0xffffff, { rough: 0.55, side: THREE.DoubleSide, brush: 0.05 }).clone().copy(new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.5, side: THREE.DoubleSide }));
}
export function lotus(k, petals = 12) {
  const T = k.THREE, g = new T.Group(), petal = new T.SphereGeometry(0.11, 12, 8, 0, TAU, 0, 1.25);
  petal.scale(0.6, 1.5, 0.32).translate(0, 0.02, 0);
  const pm = k.M.plain(0xf8d6e2, { rough: 0.55, brush: 0.06 });
  const n = petals, rows = 3;
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const m = new T.Mesh(petal, pm), a = (i + r * 0.5) / n * TAU;
    m.position.set(Math.cos(a) * 0.05 * (r + 1), 0.02 + r * 0.01, Math.sin(a) * 0.05 * (r + 1));
    m.rotation.set(0.75 - r * 0.32, -a + Math.PI / 2, 0, 'YXZ'); g.add(m);
  }
  const c = new T.Mesh(new T.SphereGeometry(0.05, 12, 8), k.M.plain(0xe7c15a, { rough: 0.8 })); c.position.y = 0.08; g.add(c);
  return g;
}

const fireflyPoints = (n, spread, color = 0xc8ff70) => {
  const pos = new Float32Array(n * 3), phase = new Float32Array(n), r = rng(11);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * spread; pos[i * 3 + 1] = 0.3 + r() * 1.6; pos[i * 3 + 2] = (r() - 0.5) * spread; phase[i] = r() * 6; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const [c, x] = canvas2d(64, 64); const gr = x.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.2, map: canvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  p.frustumCulled = false; p.userData.phase = phase;
  return p;
};
export { fireflyPoints };

const lit = (group, h = 1) => { group.traverse((o) => { if (o.material?.userData?.u?.uGlow) o.material.userData.u.uGlow.value = h; }); return group; };

export const SPECIMENS = [
  /* water */
  { id: 'game-water', family: 'water', original: true, name: 'The Moon Pool, today', jp: '今の月の池', tag: 'A glassy disc and a caustic layer', plinth: 'moss',
    blurb: 'The real buildMoonPool(), lifted out of the valley: a dark disc with low roughness, a drifting caustic, pads and a toro.',
    how: ['MeshStandardMaterial, roughness 0.06, plus an additive caustic sheet.', 'The moon is a sprite pooled on top, so it never breaks up.'],
    use: 'Baseline.', sources: ['shinji'],
    game: () => HP.prototype.buildMoonPool,
    build(k) { const h = gameHidden(); const g = h.poolGroup; g.position.set(0, 0, 0); h.poolWaterMat.opacity = 1; h.causticMat.opacity = 0.14; return g; } },
  { id: 'flat', family: 'water', name: 'Glass and sky', jp: '鏡', tag: 'The same idea, one shader', plinth: 'moss', hour: 22,
    blurb: 'The cheapest baseline: a single shader on one disc, reflecting a gradient sky through Fresnel with a faint caustic.',
    how: ['Fresnel mixes body colour and sky.', 'No textures, no extra pass.'], use: 'Far-off puddles.', sources: ['ws'], also: [pondTile],
    build(k) { return pondTile(k, 0); } },
  { id: 'scroll', family: 'water', name: 'Scrolled normals', jp: 'さざなみ', tag: 'Two noise fields sliding past each other', plinth: 'moss', hour: 22,
    blurb: 'The everyday water trick: two moving normal fields added together. It never repeats and it costs almost nothing.',
    how: ['Finite differences of value noise, at two scales moving in different directions.'], use: 'Wide rivers and paddies, where no one drops anything in.', sources: ['water2', 'ws'], also: [pondTile],
    build(k) { return pondTile(k, 1); } },
  { id: 'rings', family: 'water', name: 'Rain rings, by formula', jp: '波紋', tag: 'Six ripples with no buffer at all', plinth: 'moss', hour: 22,
    blurb: 'Analytic ripples: each ring is a sine in distance and age, summed in the shader. No simulation, so no memory, and nothing to fall behind.',
    how: ['Six hashed centres recycle on a timer.', 'The normal comes from the analytic derivative of the sum.'], use: 'Raindrop rings and anywhere you do not need waves to bounce off the banks.', sources: ['clickto', 'gpgpu'], also: [pondTile],
    build(k) { return pondTile(k, 2); } },
  { id: 'sim', family: 'water', name: 'A real heightfield', jp: '波動', tag: 'The wave equation, stepped on the CPU', plinth: 'moss', hour: 22,
    blurb: 'The stage’s own water, shrunk down: a 96×96 grid, a stone dropped in every second or so, waves bouncing off the rim.',
    how: ['Two height buffers: next = ((L+R+U+D)/2 − previous) × 0.986.', 'At 256² it is 65k cells a frame, still well under a millisecond in JavaScript.'], use: 'The Moon Pool itself, where the player will drop things.', sources: ['clickto', 'skunami', 'forum', 'gpgpu'], also: [PondWater],
    build(k) {
      const w = new PondWater({ renderer: k.lab.renderer, radius: 1.3, res: 96, reflectRes: 4, breeze: 0.1 }); w.U.uHasRefl.value = 0; w.U.uCam.value.set(9, 8, 9); w.U.uSkyTop.value.setRGB(0.16, 0.22, 0.42); w.U.uSkyHor.value.setRGB(0.05, 0.09, 0.2); w.U.uMoonDir.value.set(-0.45, 0.78, 0.42).normalize(); w.U.uMoonCol.value.setRGB(1, 0.97, 0.85); w.U.uLit.value = 0.3;
      w.mesh.position.y = 0.02; w.mesh.userData.noShadow = true;
      let c = 0; return { group: (() => { const g = new k.THREE.Group(); g.add(w.mesh); return g; })(), update: (t, dt) => { w.update(dt, t); if ((c -= dt) < 0) { c = 0.9; const a = Math.sin(t * 2.3) * k.TAU, r = 0.3 + Math.abs(Math.sin(t * 7.1)) * 0.8; w.drop(Math.cos(a) * r, Math.sin(a) * r, 0.1, 3); } } };
    } },
  { id: 'depth', family: 'water', name: 'Depth tint and a bed', jp: '浅瀬', tag: 'See the stones in the shallows', plinth: 'moss', hour: 22,
    blurb: 'Shallow at the rim, dark in the middle, with a pebble bed refracted by a little wobble. The trick for water you can stand in.',
    how: ['A voronoi pebble bed, offset by a tiny noise.', 'The bed fades into a deep colour with distance from the rim.'], use: 'Stream edges and the paddies’ margins.', sources: ['shinji'], also: [pondTile],
    build(k) { return pondTile(k, 5); } },
  { id: 'painted', family: 'water', name: 'A painted surface', jp: '絵の水', tag: 'Bands of colour and a line of light', plinth: 'moss', hour: 22,
    blurb: 'Pure background-art water: bands of colour that drift and a thin white line of light. Nothing physical at all, and a good reminder of how little you need.',
    how: ['A warped sine thresholded twice: once for the wash, once for the highlight.'], use: 'Very far water, or a stylised scene.', sources: ['shinji'], also: [pondTile],
    build(k) { return pondTile(k, 4); } },
  { id: 'glitter', family: 'water', name: 'Moon glitter', jp: '月の道', tag: 'Short-lived glints along a path', plinth: 'moss', hour: 22,
    blurb: 'A column of small sparks, each fading in and out on its own timer, along the path from the moon to you.',
    how: ['Cell noise gives each glint a seed.', 'Each lives on its own slow sine, so nothing pops.'], use: 'Any calm night water.', sources: ['shinji'], also: [pondTile],
    build(k) { return pondTile(k, 3); } },

  /* moon */
  { id: 'game-moon', family: 'moon', original: true, name: 'A moon sprite', jp: '今の月', tag: 'A soft disc laid on the water', plinth: 'moss', hour: 22,
    blurb: 'The game’s moon pooled on the water: a soft additive sprite. It never reacts to anything that happens to the water.',
    how: ['A radial glow sprite at the surface.'], use: 'Baseline.', sources: ['shinji'], also: [pondTile],
    build(k) { return pondTile(k, 6); } },
  { id: 'moon-disc', family: 'moon', name: 'A reflected disc', jp: '水鏡', tag: 'Broken up by the waves', plinth: 'moss', hour: 22,
    blurb: 'Reflect the moon’s real direction through a wobbling normal, then threshold it. The disc splits as the surface moves.',
    how: ['Dot product of the reflected vector and the moon direction, smoothstepped tight.'], use: 'A cheap upgrade from the sprite.', sources: ['reflector', 'water2'], also: [pondTile],
    build(k) { return pondTile(k, 7); } },
  { id: 'moon-phase', family: 'moon', name: 'A real phase', jp: '三日月', tag: 'The terminator reflected too', plinth: 'moss', hour: 22,
    blurb: 'A crescent on the water, drawn with two circles. On the stage the phase dial changes the moon in the sky and in the pond together.',
    how: ['Intersection of two circles for the crescent, offset by the same wobble as the water.'], use: 'Festival nights.', sources: ['shinji'], also: [moonTexture],
    build(k) { return pondTile(k, 8); } },

  /* pads */
  { id: 'game-pad', family: 'pads', original: true, name: 'Our lily pad', jp: '今の葉', tag: 'A circle with a wedge removed', plinth: 'water', hour: 12,
    blurb: 'Taken from the real pool: a flat green circle with a notch, and a cone-petal blossom.',
    how: ['CircleGeometry with thetaStart and thetaLength.'], use: 'Baseline.', sources: ['shinji'],
    build(k) { const h = gameHidden(), g = new k.THREE.Group(); h.poolGroup.traverse((o) => { if (o.geometry?.type === 'CircleGeometry' && o.geometry.parameters.radius === 0.3) { const m = o.clone(); m.position.set(0, 0.02, 0); g.add(m); } }); if (g.children.length) g.children.length = 1; return g; } },
  { id: 'pad-new', family: 'pads', name: 'A pad with a rim', jp: '睡蓮', tag: 'Veins, a curled edge and a lobed notch', plinth: 'water', hour: 12,
    blurb: 'Polar grid with its rim lifted a few millimetres so it catches the light, painted veins radiating from the stem point.',
    how: ['Polar grid with a notch cut out.', 'The rim rises with radius⁴, so it stays flat until the edge.'], use: 'Direct swap for the game’s pads.', sources: ['shinji'], also: [padGeometry],
    build(k) { const g = new k.THREE.Group(); g.add(new k.THREE.Mesh(padGeometry(0.34, 48, 0.05), padMaterial())); g.children[0].position.y = 0.02; const m2 = g.children[0].clone(); m2.position.set(0.5, 0.02, 0.3); m2.scale.setScalar(0.7); m2.rotation.y = 2; g.add(m2); return g; } },
  { id: 'lotus', family: 'pads', name: 'Lotus', jp: '蓮', tag: 'Rows of petals, lifted on a stem', plinth: 'water', hour: 12,
    blurb: 'Lotus is not a water lily: its leaves and flowers stand up out of the water. Three rows of petals around a yellow seed head.',
    how: ['Scaled sphere caps, rotated about their base.'], use: 'A few, near the shore.', sources: ['shinji'],
    build(k) { const g = new k.THREE.Group(); const f = lotus(k); f.position.y = 0.34; g.add(f); const s = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.012, 0.014, 0.4, 8), k.M.plain(0x5f8a4a)); s.position.y = 0.18; g.add(s); return g; } },

  /* lanterns */
  { id: 'game-lamp', family: 'lanterns', original: true, name: 'A glade lantern', jp: '今の提灯', tag: 'A cylinder with a warm emissive', plinth: 'moss', hour: 21,
    blurb: 'Taken from the real glade: a ten-sided cylinder, a dark cap and a glow sprite.',
    how: ['Each lamp has its own material so it can kindle on its own schedule.'], use: 'Baseline.', sources: ['shinji'],
    build(k) { const h = gameHidden(), g = new k.THREE.Group(); const l = h.lanterns[0]; l.mat.emissiveIntensity = 1.2; const lamp = l.lamp.clone(); lamp.position.set(0, 0.6, 0); g.add(lamp); return g; } },
  { id: 'chochin', family: 'lanterns', name: 'Washi and ribs', jp: '提灯', tag: 'Lit from inside the belly', plinth: 'moss', hour: 21, animatedShadow: false,
    blurb: 'A lathed body, painted fibres and the shadows of the bamboo ribs in the emissive, brightest at the belly where the flame is closest.',
    how: ['Rib shadows come from the washi map, multiplied into the emissive.', 'The falloff is a Gaussian in height.'], use: 'Every lantern in the glade.', sources: ['translucent', 'shoji'], also: [lanternMaterial],
    build(k) { const g = chochin({ h: 0.6, belly: 0.2, glow: 1.5 }); g.position.y = 0.75; const w = new k.THREE.Group(); w.add(g); return w; } },
  { id: 'take-akari', family: 'lanterns', name: 'Take-akari', jp: '竹あかり', tag: 'A slotted culm with a light inside', plinth: 'moss', hour: 21, animatedShadow: false,
    blurb: 'Cut bamboo with slots and a flame inside, set along paths at festivals. Each slot shows the warm interior.',
    how: ['Slats are small boxes on the culm with an emissive washi material.'], use: 'Lining the path to the glade.', sources: ['toro'], also: [takeAkari],
    build(k) { const g = new k.THREE.Group(); for (const [x, h] of [[0, 1.05], [0.34, 0.78], [-0.32, 0.92]]) { const t = takeAkari({ h, glow: 1.4 }); t.position.x = x; g.add(t); } return g; } },
  { id: 'float', family: 'lanterns', name: 'Tōrō-nagashi', jp: '灯籠流し', tag: 'A paper box set afloat', plinth: 'water', hour: 21, animatedShadow: false,
    blurb: 'Paper on a wooden tray, as floated at Arashiyama. Square so it reads as a lantern from any side, and its glow doubles in the water.',
    how: ['Stage version bobs on the height field and drifts on a slow current.'], use: 'Float them from the shore on the stage.', sources: ['toro', 'arashi'], also: [floatLantern],
    build(k) { const g = new k.THREE.Group(); for (const [x, z] of [[0, 0], [0.5, 0.3], [-0.4, 0.42]]) { const f = floatLantern({ glow: 1.5 }); f.position.set(x, 0, z); g.add(f); } return g; } },

  /* night */
  { id: 'game-motes', family: 'night', original: true, name: 'Pool motes', jp: '今の光', tag: 'Soft dots rising from the water', plinth: 'moss', hour: 22,
    blurb: 'The real pool’s drifting points, at full opacity.',
    how: ['A Points cloud moved in JavaScript.'], use: 'Baseline.', sources: ['shinji'],
    build(k) { const h = gameHidden(); h.poolMoteMat.opacity = 1; h.updatePoolMotes(1, 1); const g = new k.THREE.Group(); const p = h.poolMotePoints.clone(); g.add(p); p.geometry = h.poolMotePoints.geometry; return { group: g, update: (t, dt) => h.updatePoolMotes(dt, 1), noCast: true }; } },
  { id: 'fireflies', family: 'night', name: 'Fireflies', jp: '蛍', tag: 'Soft pulses in a loose swarm', plinth: 'moss', hour: 22, animatedShadow: false,
    blurb: 'A few dozen points that each pulse on their own phase. Close to the ground, near water, and only after dark.',
    how: ['Additive points; the wander is sine sums seeded per firefly.'], use: 'The glade once the lanterns are lit.', sources: ['toro'],
    build(k) { const p = fireflyPoints(28, 2.2); const g = new k.THREE.Group(); g.add(p); const a = p.geometry.attributes.position, base = a.array.slice(), ph = p.userData.phase; p.material.size = 0.1; return { group: g, noCast: true, update(t) { for (let i = 0; i < a.count; i++) { const f = ph[i]; a.setXYZ(i, base[i * 3] + Math.sin(t * 0.4 + f) * 0.25, base[i * 3 + 1] + Math.sin(t * 0.6 + f * 2) * 0.12, base[i * 3 + 2] + Math.cos(t * 0.35 + f) * 0.25); } a.needsUpdate = true; p.material.opacity = 0.75 + Math.sin(t * 2) * 0.25; } }; } }
];

export const STEPS = [
  { title: 'Hold a mirror to the sky', body: '<p>Draw the scene again from a camera reflected in the water plane, and map that image onto the surface. That is all a reflection is.</p>', code: 'rc.position.y = 2 * waterY - camera.position.y;\nrenderer.setRenderTarget(rt); renderer.render(scene, rc);', phase: 0 },
  { title: 'Let water be two numbers per cell', body: '<p>A cell’s next height is the average of its four neighbours, minus what it was last frame, times a little less than one.</p>', code: 'b[k] = ((a[k-1] + a[k+1] + a[k-n] + a[k+n]) * 0.5 - b[k]) * 0.986;', phase: 1 },
  { title: 'Turn heights into a surface', body: '<p>The shader reads four heights around each pixel and builds a normal. This is the moment the water starts to look like water.</p>', code: 'vec3 n = normalize(vec3((hL - hR) * k, 1., (hD - hU) * k));', phase: 2 },
  { title: 'Bend the reflection', body: '<p>Offset the reflection lookup by the normal. The ring you just dropped now pushes the whole sky aside as it passes.</p>', code: 'suv += n.xz * vec2(.05, .08);', phase: 3 },
  { title: 'Let the moon be a direction', body: '<p>A very tight specular on the moon’s direction gives a small hard glint that widens only when waves tilt the surface toward it.</p>', code: 'float moon = pow(max(dot(R, uMoonDir), 0.), 1800.) * 14.;', phase: 4 },
  { title: 'Light it from inside', body: '<p>Paper does not reflect a flame so much as carry it. Make the glow an emissive, map the ribs and fibres into it, and let it fall off from the belly.</p>', code: 'totalEmissiveRadiance += uGlowCol * (0.5 + 1.6 * bl) * mapTexel * uGlow;', phase: 5 }
];

/** The steps' live model: one pond, gaining a piece at each stage. */
export const ASSEMBLY = {
  radius: 3.2, target: [0, 0.2, 0], shadow: 6,
  build(k) {
    const T = k.THREE, g = new T.Group();
    const w = new PondWater({ renderer: k.lab.renderer, radius: 2.6, res: 128, reflectRes: 4, breeze: 0 }); w.U.uHasRefl.value = 0; w.U.uCam.value.set(9, 8, 9); w.U.uSkyTop.value.setRGB(0.22, 0.32, 0.56); w.U.uSkyHor.value.setRGB(0.7, 0.55, 0.45); w.U.uMoonDir.value.set(-0.45, 0.78, 0.42).normalize(); w.U.uMoonCol.value.setRGB(1, 0.97, 0.85); w.U.uLit.value = 0.6;
    w.mesh.userData.noShadow = true; g.add(w.mesh);
    const lantern = chochin({ h: 0.5, belly: 0.18, glow: 1.5 }); lantern.position.set(1.1, 0.9, 0.3); g.add(lantern);
    const f = floatLantern({ glow: 1.5 }); f.position.set(-0.6, 0.02, 0.5); g.add(f);
    const pad = new T.Mesh(padGeometry(0.4, 48, 0.05), padMaterial()); pad.position.set(0.8, 0.02, -1.1); g.add(pad);
    let c = 0, phase = 0;
    const set = (p) => { phase = p; lantern.visible = p >= 5; f.visible = p >= 5; w.U.uBreeze.value = p >= 1 ? 0.2 : 0; pad.visible = p >= 2; };
    set(0);
    return { group: g, setPhase: set, update(t, dt) { w.update(dt, t); if (phase >= 1 && (c -= dt) < 0) { c = 1.1; const a = Math.sin(t * 1.9) * k.TAU, r = 0.4 + Math.abs(Math.sin(t * 5.3)) * 1.7; w.drop(Math.cos(a) * r, Math.sin(a) * r, 0.12, 4); } } };
  }
};

/* ground, stone and grove specimens (promoted into src/kit/hidden/) */
import { GROUND_FAMILIES, GROUND_SPECIMENS } from './ground.js';
FAMILIES.push(...GROUND_FAMILIES);
SPECIMENS.push(...GROUND_SPECIMENS);
