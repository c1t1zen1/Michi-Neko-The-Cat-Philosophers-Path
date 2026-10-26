// build.js — the Roof Road's meshes, built from level.pieces.
//
// Every surface uses the game's painted procedural sets (src/textures.js):
// kawara, plaster, timber, namako, shoji, cobbles. Each piece is built in its
// own rail frame — local x along the rail (s − sMid), y up, z toward the
// camera (depth d) — then the static meshes are merged one per material, the
// way Countryside._mergeStatics() does it in the valley.
//
// Returns { root, dynamic: {...}, lights: [Vector3], update(t, night) }.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  kawaraTextures, plasterTextures, woodTextures, namakoTextures, shojiTextures,
  cobbleTextures, stoneTextures, strawTextures, metalTextures, lacquerTextures,
  dirtTextures, texturedMaterial, worldScaleBoxUVs
} from '../../src/textures.js?v=20261024c';
import { hash1 } from './level.js';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/*  Small painted canvases (façade details the 256px sets don't cover)  */
/* ------------------------------------------------------------------ */

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/** Kōshi: dark vertical slats over a warm backing that glows at night. */
function koshiTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#5a3a1c'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#d9a867'); grd.addColorStop(1, '#8a5a2c');
    g.fillStyle = grd;
    for (let x = 0; x < w; x += 8) g.fillRect(x + 4, 0, 3, h);
    g.fillStyle = '#2a1a0e';
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 4, h);
    g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); g.fillRect(0, h * 0.5 - 2, w, 4);
  });
}

/** Mushiko-mado: rounded plaster slats in a cream earthen wall. */
function mushikoTex() {
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#e9dfc9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a2d22'; g.fillRect(8, 10, w - 16, h - 20);
    for (let x = 12; x < w - 12; x += 9) {
      const grd = g.createLinearGradient(x, 0, x + 6, 0);
      grd.addColorStop(0, '#cfc3a8'); grd.addColorStop(0.5, '#f4ecd8'); grd.addColorStop(1, '#bfb398');
      g.fillStyle = grd; g.fillRect(x, 10, 6, h - 20);
    }
  });
}

function stripesTex(a, b, n = 6) {
  return canvasTex(64, 64, (g, w, h) => {
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, (i * h) / n, w, h / n + 1); }
  });
}

/** Festival tapestry: red ground, gold roundels, an indigo border. */
function tapestryTex() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#8f1f1a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d2c55'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    g.strokeStyle = '#d9ad4c'; g.lineWidth = 3;
    for (let x = 24; x < w; x += 48) {
      for (let y = 40; y < h - 20; y += 48) {
        g.beginPath(); g.arc(x, y, 14, 0, TAU); g.stroke();
        g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
      }
    }
    g.fillStyle = '#d9ad4c'; g.fillRect(0, 14, w, 3); g.fillRect(0, h - 17, w, 3);
  });
}

/** Layered brocade panels for the hoko's hanging textiles. */
function brocadeTex(base, ink, motif = 0) {
  return canvasTex(192, 192, (g, w, h) => {
    const wash = g.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, base);
    wash.addColorStop(0.52, ink);
    wash.addColorStop(1, base);
    g.fillStyle = wash;
    g.fillRect(0, 0, w, h);

    g.globalAlpha = 0.24;
    g.strokeStyle = '#f1d887';
    g.lineWidth = 3;
    if (motif === 0) {
      // Seigaiha-like overlapping waves, loosened so they feel hand painted.
      for (let y = 24; y < h + 32; y += 32) {
        for (let x = (y / 32) % 2 ? -16 : 0; x < w + 32; x += 32) {
          for (const r of [12, 20, 28]) {
            g.beginPath();
            g.arc(x, y, r, Math.PI, TAU);
            g.stroke();
          }
        }
      }
    } else {
      // Curling cloud bands and small flower roundels.
      for (let y = 30; y < h; y += 48) {
        for (let x = -8; x < w; x += 58) {
          g.beginPath();
          g.moveTo(x, y);
          g.bezierCurveTo(x + 11, y - 13, x + 25, y + 13, x + 38, y);
          g.bezierCurveTo(x + 47, y - 9, x + 55, y + 8, x + 66, y - 2);
          g.stroke();
          g.beginPath();
          g.arc(x + 27, y + 17, 6, 0, TAU);
          g.stroke();
        }
      }
    }
    g.globalAlpha = 1;
    g.fillStyle = '#d9ad4c';
    g.fillRect(0, 0, w, 7);
    g.fillRect(0, h - 7, w, 7);
    g.fillRect(8, 0, 3, h);
    g.fillRect(w - 11, 0, 3, h);
  });
}

/** Sujibei: the five white lines on a temple wall. */
function sujibeiTex() {
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#d9b46a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f6f0e2';
    for (let i = 0; i < 5; i++) g.fillRect(0, 12 + i * 8, w, 3);
  });
}

/** Bamboo slats for the inuyarai. */
function bambooTex() {
  return canvasTex(64, 64, (g, w, h) => {
    for (let x = 0; x < w; x += 4) { g.fillStyle = (x / 4) % 2 ? '#6b5a32' : '#8d7a46'; g.fillRect(x, 0, 4, h); }
    g.fillStyle = 'rgba(40,30,10,0.5)'; g.fillRect(0, h * 0.3, w, 2); g.fillRect(0, h * 0.72, w, 2);
  }, [4, 1]);
}

/** A noren with a white roundel crest. */
function norenTex(color) {
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = w / 3; x < w; x += w / 3) g.fillRect(x - 1, h * 0.25, 2, h);
    g.strokeStyle = '#efe6d2'; g.lineWidth = 4;
    g.beginPath(); g.arc(w / 2, h * 0.42, 11, 0, TAU); g.stroke();
  });
}

/** Paper lantern face: warm paper with a dark top/bottom band. */
function lanternTex(paper, band) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 6; y < h; y += 6) g.fillRect(0, y, w, 1);
    g.fillStyle = band; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
  });
}

/* ------------------------------------------------------------------ */
/*  Materials                                                           */
/* ------------------------------------------------------------------ */

function panel(m) { m.userData.panel = true; return m; }

/** Give paper and laundry a tiny hand-animated breeze without adding meshes. */
function windMaterial(material, amplitude = 0.045, phase = 0) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRoofTime = { value: 0 };
    shader.uniforms.uRoofWind = { value: amplitude };
    shader.vertexShader = `uniform float uRoofTime; uniform float uRoofWind;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float roofEdge = smoothstep(0.18, 0.92, uv.y);
       float roofWave = sin(uRoofTime * 1.75 + position.x * 2.1 + position.z * 1.3 + ${phase.toFixed(3)});
       transformed.z += roofWave * uRoofWind * roofEdge;
       transformed.x += sin(uRoofTime * 1.05 + position.y * 3.0 + ${phase.toFixed(3)}) * uRoofWind * 0.22 * roofEdge;`
    );
    material.userData.windShader = shader;
  };
  material.customProgramCacheKey = () => `roof-wind-${amplitude}-${phase}`;
  material.userData.wind = true;
  return material;
}

/** Painted flowing water: layered current, bank foam, glints and night tint. */
function flowWaterMaterial(flowAlongDepth = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uFlowAxis: { value: flowAlongDepth ? 1 : 0 },
      uDeep: { value: new THREE.Color(0x315f67) },
      uShallow: { value: new THREE.Color(0x72a29a) },
      uSun: { value: new THREE.Color(0xffe0a8) }
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    vertexShader: `
      #include <fog_pars_vertex>
      uniform float uTime;
      uniform float uFlowAxis;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec2 flowUv = mix(uv, uv.yx, uFlowAxis);
        vec3 p = position;
        p.y += sin((flowUv.x + uTime * 0.16) * 13.0) * 0.012;
        p.y += sin((flowUv.x * 1.7 - flowUv.y * 2.4 - uTime * 0.28) * 8.0) * 0.008;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform float uNight;
      uniform float uFlowAxis;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSun;
      varying vec2 vUv;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      float band(float x, float w) { return 1.0 - smoothstep(0.0, w, abs(x)); }
      void main() {
        vec2 flowUv = mix(vUv, vUv.yx, uFlowAxis);
        float current = sin(flowUv.x * 37.0 - uTime * 2.4 + sin(flowUv.y * 9.0) * 1.8);
        float cross = sin(flowUv.x * 17.0 + flowUv.y * 22.0 + uTime * 1.25);
        float glint = pow(max(0.0, current * 0.55 + cross * 0.45), 8.0);
        float depthBand = 0.5 + 0.5 * sin(flowUv.y * 2.4 + 0.7);
        vec3 col = mix(uDeep, uShallow, 0.32 + depthBand * 0.28);
        col += uSun * glint * (0.22 + 0.28 * (1.0 - uNight));
        col = mix(col, vec3(0.085, 0.12, 0.22), uNight * 0.48);
        float ripple = band(fract(flowUv.x * 0.23 - uTime * 0.08) - 0.5, 0.035) * 0.08;
        col += vec3(0.72, 0.86, 0.84) * ripple;
        gl_FragColor = vec4(col, 0.88);
        #include <fog_fragment>
      }`
  });
}

function makeMaterials() {
  const M = {};
  M.roof = texturedMaterial(kawaraTextures(0x5e6872, 3), { color: 0xd4d5d4, roughness: 0.55, normalScale: 0.5, repeat: [0.9, 0.9], envMapIntensity: 0.6 });
  M.ridge = new THREE.MeshStandardMaterial({ color: 0x3a4149, roughness: 0.6 });
  M.plaster = texturedMaterial(plasterTextures(0xf1e8d6, 1), { roughness: 0.95, repeat: [0.45, 0.45] });
  M.plasterWarm = texturedMaterial(plasterTextures(0xe0cfae, 2), { roughness: 0.95, repeat: [0.45, 0.45] });
  M.bengara = texturedMaterial(plasterTextures(0xa4503a, 5), { roughness: 0.92, repeat: [0.45, 0.45] });
  M.timber = texturedMaterial(woodTextures(0x3b2819, 0x1b100a, 2), { roughness: 0.82, normalScale: 0.8, repeat: [0.6, 0.6] });
  M.timberMed = texturedMaterial(woodTextures(0x6e4c30, 0x34210f, 3), { roughness: 0.8, normalScale: 0.8, repeat: [0.6, 0.6] });
  M.namako = texturedMaterial(namakoTextures(), { roughness: 0.62, normalScale: 1.1 });
  M.shoji = panel(texturedMaterial(shojiTextures(4, 6), { emissive: 0xffb060, emissiveIntensity: 0.0, roughness: 0.85, normalScale: 0.6 }));
  M.koshi = panel(new THREE.MeshStandardMaterial({ map: koshiTex(), emissive: 0xff9a3c, emissiveIntensity: 0.0, roughness: 0.85 }));
  M.koshi.emissiveMap = M.koshi.map;
  M.mushiko = panel(new THREE.MeshStandardMaterial({ map: mushikoTex(), roughness: 0.9 }));
  M.cobble = texturedMaterial(cobbleTextures(4), { color: 0xd9d1c2, roughness: 0.86, normalScale: 0.9, repeat: [0.16, 0.16] });
  M.slab = texturedMaterial(stoneTextures(0xb8b2a4, 5), { roughness: 0.9, repeat: [0.35, 0.35] });
  M.stone = texturedMaterial(stoneTextures(0x8f8d85, 6), { roughness: 0.92, repeat: [0.5, 0.5] });
  M.gravel = texturedMaterial(dirtTextures(7), { color: 0xc8c0ae, roughness: 1, repeat: [0.3, 0.3] });
  M.sand = texturedMaterial(dirtTextures(7), { color: 0xe2dccb, roughness: 1, repeat: [0.3, 0.3] });
  M.straw = texturedMaterial(strawTextures(0xc8a96a), { roughness: 1, repeat: [0.8, 0.8] });
  M.bronze = texturedMaterial(metalTextures(0xb28538), { metalness: 0.85, roughness: 0.4, emissive: 0x3a2205, emissiveIntensity: 0.15 });
  M.gold = texturedMaterial(metalTextures(0xd9ad4c), { metalness: 0.9, roughness: 0.3, emissive: 0x6a4808, emissiveIntensity: 0.35 });
  M.lacquer = texturedMaterial(lacquerTextures(), { roughness: 0.35, normalScale: 0.4 });
  M.water = flowWaterMaterial();
  M.kamoWater = flowWaterMaterial(true);
  M.wetStone = texturedMaterial(stoneTextures(0x6d7370, 8), { color: 0xa9b0aa, roughness: 0.48, normalScale: 1.0, repeat: [0.38, 0.38], envMapIntensity: 0.9 });
  M.foam = new THREE.MeshBasicMaterial({ color: 0xd8ece6, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  M.wake = new THREE.MeshBasicMaterial({ color: 0xe8f3ed, transparent: true, opacity: 0.36, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  M.hemp = new THREE.MeshStandardMaterial({ color: 0x9c8256, roughness: 1.0 });
  M.glass = new THREE.MeshStandardMaterial({ color: 0xe9f0e6, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  M.steel = new THREE.MeshStandardMaterial({ color: 0x5d6168, roughness: 0.5, metalness: 0.6 });
  M.clay = new THREE.MeshStandardMaterial({ color: 0x6b6863, roughness: 0.75 });
  M.foliage = new THREE.MeshStandardMaterial({ color: 0x55803e, roughness: 0.9, flatShading: true });
  M.pine = new THREE.MeshStandardMaterial({ color: 0x3b5e34, roughness: 0.9, flatShading: true });
  M.blossom = new THREE.MeshStandardMaterial({ color: 0xf2c4cf, roughness: 0.9, flatShading: true, emissive: 0x3a1a20, emissiveIntensity: 0.0 });
  M.bark = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.95 });
  M.inuyarai = panel(new THREE.MeshStandardMaterial({ map: bambooTex(), roughness: 0.8, side: THREE.DoubleSide }));
  M.bamboo = new THREE.MeshStandardMaterial({ color: 0x8f9a52, roughness: 0.6 });
  M.lanternRed = panel(new THREE.MeshStandardMaterial({ map: lanternTex('#c8402a', '#2a1a12'), emissive: 0xff5a2a, emissiveIntensity: 0.15, roughness: 0.8 }));
  M.lanternRed.emissiveMap = M.lanternRed.map;
  M.lanternWhite = panel(new THREE.MeshStandardMaterial({ map: lanternTex('#f4e6c8', '#2a1a12'), emissive: 0xffc070, emissiveIntensity: 0.15, roughness: 0.8 }));
  M.lanternWhite.emissiveMap = M.lanternWhite.map;
  M.fire = new THREE.MeshBasicMaterial({ color: 0xffd08a });
  M.tapestry = panel(new THREE.MeshStandardMaterial({ map: tapestryTex(), roughness: 0.85 }));
  M.brocade = [
    panel(windMaterial(new THREE.MeshStandardMaterial({ map: brocadeTex('#17355f', '#6e2d31', 0), roughness: 0.82, side: THREE.DoubleSide }), 0.035, 0.7)),
    panel(windMaterial(new THREE.MeshStandardMaterial({ map: brocadeTex('#8d2520', '#3b234c', 1), roughness: 0.82, side: THREE.DoubleSide }), 0.035, 3.2))
  ];
  M.sujibei = panel(new THREE.MeshStandardMaterial({ map: sujibeiTex(), roughness: 0.92 }));
  M.futon = panel(new THREE.MeshStandardMaterial({ map: stripesTex('#e8e2d2', '#5a78a8'), roughness: 0.95 }));
  M.cloth = [0xf2efe6, 0x2f4c78, 0xe6d6a8, 0xd9e2ea, 0xb8584a].map((c, i) =>
    windMaterial(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide }), 0.065, i * 1.71));
  M.noren = {
    indigo: panel(windMaterial(new THREE.MeshStandardMaterial({ map: norenTex('#223652'), roughness: 0.9, side: THREE.DoubleSide }), 0.055, 0.4)),
    crimson: panel(windMaterial(new THREE.MeshStandardMaterial({ map: norenTex('#8f2820'), roughness: 0.9, side: THREE.DoubleSide }), 0.055, 2.1)),
    hemp: panel(windMaterial(new THREE.MeshStandardMaterial({ map: norenTex('#c9b48c'), roughness: 0.9, side: THREE.DoubleSide }), 0.055, 4.0))
  };
  M.ground = new THREE.MeshStandardMaterial({ color: 0x5a5448, roughness: 1 });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x1e1915, roughness: 0.95 });
  M.goods = [0xc9643a, 0xe0b04a, 0x7a9a4a, 0xb8384a, 0xe8dcc2, 0x5a7aa0].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  return M;
}

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (!(mat.userData && mat.userData.panel)) worldScaleBoxUVs(g, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

function cyl(r, len, mat, axis = 'y', seg = 10) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

/**
 * A tiled slope. `eave` is the low edge's midpoint; the slope rises `rise`
 * over `run` toward the ridge, opposite to `yaw` (the down-slope heading:
 * 0 = +z, π = −z, π/2 = +x, −π/2 = −x). `width` runs along the eave.
 */
function slope(g, mat, eave, rise, run, width, yaw, thick = 0.12) {
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const len = Math.hypot(run, rise);
  const b = box(width, thick, len + 0.04, mat);
  b.position.set(eave.x - dx * run / 2, eave.y + rise / 2, eave.z - dz * run / 2);
  b.rotation.set(Math.atan2(rise, run), yaw, 0, 'YXZ');
  g.add(b);
  return b;
}

function triangle(mat, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, az, bx, by, bz, cx, cy, cz], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([az, ay, bz, by, cz, cy].map((v) => v * 0.45), 2));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/** Ridge crest + cap, with onigawara blocks at both ends. */
function ridgeCap(g, M, x0, x1, y, z, alongZ = false) {
  const len = Math.abs(x1 - x0);
  const cx = (x0 + x1) / 2;
  const c = cyl(0.13, len + 0.1, M.ridge, alongZ ? 'z' : 'x', 8);
  const crest = alongZ ? box(0.28, 0.1, len, M.ridge) : box(len, 0.1, 0.28, M.ridge);
  if (alongZ) { c.position.set(z, y + 0.08, cx); crest.position.set(z, y + 0.2, cx); }
  else { c.position.set(cx, y + 0.08, z); crest.position.set(cx, y + 0.2, z); }
  g.add(c, crest);
  for (const e of [x0, x1]) {
    const oni = alongZ ? box(0.4, 0.42, 0.14, M.ridge) : box(0.14, 0.42, 0.4, M.ridge);
    if (alongZ) oni.position.set(z, y + 0.22, e); else oni.position.set(e, y + 0.22, z);
    g.add(oni);
  }
}

/** Hira-iri roof: ridge along x, slopes front (+z) and back (−z). */
function hiraRoof(g, M, x0, x1, zFront, zBack, eave, ridgeTop, oh = 0.35) {
  const ridge = ridgeTop - 0.25;                 // the crest tops out at ridgeTop
  const w = x1 - x0 + oh * 2, xm = (x0 + x1) / 2;
  const zR = (zFront + zBack) / 2;
  const rise = ridge - eave;
  slope(g, M.roof, { x: xm, y: eave, z: zFront + 0.55 }, rise, zFront + 0.55 - zR, w, 0);
  slope(g, M.roof, { x: xm, y: eave, z: zBack - 0.55 }, rise, zR - (zBack - 0.55), w, Math.PI);
  ridgeCap(g, M, x0 - oh, x1 + oh, ridge, zR);
  // Ichimonji eave: the dead-straight dark line along the front edge.
  g.add(box(w, 0.07, 0.08, M.ridge, xm, eave - 0.01, zFront + 0.6));
  for (const x of [x0, x1]) {
    g.add(triangle(M.plaster, x, eave - 0.02, zFront, x, ridge - 0.05, zR, x, eave - 0.02, zBack));
    g.add(box(0.08, 0.08, Math.hypot(zFront - zR, rise) + 0.1, M.timber, x, (eave + ridge) / 2, (zFront + zR) / 2));
  }
}

/** Tsuma-iri roof: gable to the camera; slopes fall to −x and +x. */
function tsumaRoof(g, M, x0, x1, zFront, zBack, eave, ridgeTop, oh = 0.25, roofMat = null) {
  const ridge = ridgeTop - 0.06;                 // the slope surface meets the platform line
  const xm = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 + oh;
  const width = zFront - zBack + 1.1;
  const zm = (zFront + zBack) / 2;
  const mat = roofMat || M.roof;
  slope(g, mat, { x: x0 - oh, y: eave, z: zm }, ridge - eave, half, width, -Math.PI / 2);
  slope(g, mat, { x: x1 + oh, y: eave, z: zm }, ridge - eave, half, width, Math.PI / 2);
  ridgeCap(g, M, zBack - 0.55, zFront + 0.55, ridge - 0.2, xm, true);
  // The gable face toward the street, with its timber frame.
  g.add(triangle(M.plaster, x0, eave, zFront + 0.02, x1, eave, zFront + 0.02, xm, ridge - 0.08, zFront + 0.02));
  g.add(box(x1 - x0 + 0.1, 0.1, 0.1, M.timber, xm, eave + 0.02, zFront + 0.05));
  g.add(box(0.1, ridge - eave - 0.1, 0.1, M.timber, xm, (eave + ridge) / 2 - 0.05, zFront + 0.05));
  g.add(triangle(M.plaster, x1, eave, zBack, x0, eave, zBack, xm, ridge - 0.08, zBack));
}

/** A street-facing façade: kōshi, noren, timber posts, mushiko upstairs. */
function facade(g, M, pc, x0, x1, zF, look) {
  const w = x1 - x0, xm = (x0 + x1) / 2;
  const st = pc.storeys;
  const groundTop = st === 2 ? pc.hisashi : pc.eave;
  g.add(box(0.14, groundTop, 0.16, M.timber, x0 + 0.07, groundTop / 2, zF + 0.04));
  g.add(box(0.14, groundTop, 0.16, M.timber, x1 - 0.07, groundTop / 2, zF + 0.04));
  g.add(box(w, 0.12, 0.16, M.timber, xm, Math.min(2.0, groundTop - 0.08), zF + 0.05));
  // Kōshi across most of the front, a door gap with a noren.
  const doorX = x0 + w * (0.25 + 0.5 * look);
  const lw = Math.max(0.6, w - 1.6);
  const lat = box(lw, 1.55, 0.05, M.koshi, xm, 1.0, zF + 0.06);
  g.add(lat);
  if (pc.noren) {
    const n = box(1.1, 0.55, 0.02, M.noren[pc.noren] || M.noren.indigo, doorX, 1.65, zF + 0.16);
    g.add(n);
  }
  g.add(box(w, 0.22, 0.2, M.stone, xm, 0.11, zF + 0.05));     // plinth
  if (st === 2) {
    // Hisashi: the lower lean-to roof over the street.
    slope(g, M.roof, { x: xm, y: pc.hisashi, z: zF + 0.85 }, 0.42, 0.85, w + 0.2, 0);
    g.add(box(w + 0.2, 0.06, 0.07, M.ridge, xm, pc.hisashi - 0.01, zF + 0.9));
    // Second floor: plaster with mushiko-mado.
    const midY = (pc.hisashi + 0.42 + pc.eave) / 2;
    g.add(box(Math.min(w * 0.62, 3.2), 0.55, 0.04, M.mushiko, xm, midY, zF + 0.03));
  }
}

/** Small things that make a machiya eave believable at cat height. */
function streetEaveDetails(g, M, pc, x0, x1, zF, look) {
  const w = x1 - x0;
  const y = pc.storeys === 2 ? pc.hisashi : pc.eave;
  const z = zF + (pc.storeys === 2 ? 0.91 : 0.64);

  // Exposed rafter tails and round kawara end caps make a readable scalloped
  // edge without needing a unique roof mesh for every building.
  for (let x = x0 + 0.18; x < x1 - 0.1; x += 0.42) {
    g.add(box(0.075, 0.075, 0.48, M.timber, x, y - 0.12, z - 0.18));
    const cap = cyl(0.075, 0.075, M.ridge, 'z', 8);
    cap.position.set(x, y - 0.015, z + 0.055);
    g.add(cap);
  }

  // Dark rain gutter, one downpipe and a small shop board. The choice of side
  // is deterministic so an entire block does not repeat as a kit of clones.
  const gutter = cyl(0.045, w + 0.12, M.bronze, 'x', 7);
  gutter.position.set((x0 + x1) / 2, y - 0.08, z + 0.06);
  g.add(gutter);
  const pipeX = look > 0.5 ? x0 + 0.16 : x1 - 0.16;
  const pipe = cyl(0.032, Math.max(0.4, y - 0.26), M.bronze, 'y', 7);
  pipe.position.set(pipeX, (y - 0.26) / 2 + 0.18, zF + 0.16);
  g.add(pipe);
  if (pc.noren && w > 4.2) {
    const sign = box(0.42, 0.92, 0.055, look > 0.5 ? M.lacquer : M.timberMed,
      look > 0.5 ? x1 - 0.58 : x0 + 0.58, Math.min(1.55, y - 0.52), zF + 0.21);
    sign.rotation.z = (look - 0.5) * 0.025;
    g.add(sign);
    for (let i = 0; i < 3; i++) {
      g.add(box(0.22, 0.026, 0.01, M.plasterWarm, sign.position.x,
        sign.position.y + 0.23 - i * 0.22, zF + 0.244));
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Frames on the rail                                                  */
/* ------------------------------------------------------------------ */

function frameGroup(rail, s) {
  const g = new THREE.Group();
  const p = rail.pointAt(s), t = rail.tangentAt(s);
  g.position.set(p.x, 0, p.z);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(t.x, 0, t.z), UP, new THREE.Vector3(-t.z, 0, t.x));
  g.quaternion.setFromRotationMatrix(m);
  return g;
}

/** A flat ribbon following the rail between depths dA and dB at height y. */
function ribbon(rail, s0, s1, dA, dB, y, mat, uv = 1) {
  const pos = [], uvs = [], idx = [];
  const step = 0.5;
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  const p = { x: 0, z: 0 };
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    for (const d of [dA, dB]) {
      rail.place(s, d, p);
      pos.push(p.x, y, p.z);
      uvs.push(s * uv, d * uv);
    }
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Make sure the face points up whichever way the rail turns.
  const nrm = geo.attributes.normal;
  if (nrm.getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }
  return new THREE.Mesh(geo, mat);
}

/** Open, shallow hull for a historical Takase cargo boat. */
function boatHullGeometry(len = 4.8, width = 1.55, depth = 0.48) {
  const xs = [-len / 2, -len * 0.34, len * 0.34, len / 2];
  const ws = [width * 0.18, width * 0.5, width * 0.5, width * 0.18];
  const bs = [-depth * 0.42, -depth, -depth, -depth * 0.42];
  const pos = [], uv = [];
  const q = (a, b, c, d) => {
    for (const p of [a, b, c, a, c, d]) { pos.push(...p); uv.push(p[0] / len + 0.5, p[2] / width + 0.5); }
  };
  for (let i = 0; i < xs.length - 1; i++) {
    const aL = [xs[i], 0, -ws[i]], aR = [xs[i], 0, ws[i]];
    const bL = [xs[i + 1], 0, -ws[i + 1]], bR = [xs[i + 1], 0, ws[i + 1]];
    const abL = [xs[i], bs[i], -ws[i] * 0.62], abR = [xs[i], bs[i], ws[i] * 0.62];
    const bbL = [xs[i + 1], bs[i + 1], -ws[i + 1] * 0.62], bbR = [xs[i + 1], bs[i + 1], ws[i + 1] * 0.62];
    q(aL, bL, bbL, abL);                 // port side
    q(bR, aR, abR, bbR);                 // starboard side
    q(abL, bbL, bbR, abR);               // shallow bottom
  }
  q([xs[0], 0, ws[0]], [xs[0], 0, -ws[0]], [xs[0], bs[0], -ws[0] * 0.62], [xs[0], bs[0], ws[0] * 0.62]);
  q([xs[3], 0, -ws[3]], [xs[3], 0, ws[3]], [xs[3], bs[3], ws[3] * 0.62], [xs[3], bs[3], -ws[3] * 0.62]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Piece builders                                                      */
/* ------------------------------------------------------------------ */

const B = {};

B.street = (pc, ctx) => {
  const { M, rail } = ctx;
  const d = pc.d;
  if (pc.surface === 'gravel') {
    // The Roof Road opens over the Kamo. Its current runs across the route,
    // unlike the longitudinal Takase and Pontochō water, so it gets a
    // direction-aware copy of the painted water shader. Narrow foam seams
    // make both banks readable beneath the timber bridge.
    const river0 = pc.s0 + 2.2;
    const river1 = pc.s1 - 2.0;
    const waterY = pc.y + 0.055;
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 30, d + 18, pc.y, M.gravel, 0.5));
    ctx.addGlass(ribbon(rail, river0, river1, d - 30, d + 18, waterY, M.kamoWater, 0.2));
    ctx.addGlass(ribbon(rail, river0 + 0.03, river0 + 0.18, d - 29.5, d + 17.5, waterY + 0.018, M.foam, 0.45));
    ctx.addGlass(ribbon(rail, river1 - 0.18, river1 - 0.03, d - 29.5, d + 17.5, waterY + 0.018, M.foam, 0.45));
  } else if (pc.surface === 'bank') {
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 1.6, d + 1.8, pc.y, M.slab, 0.5));
    ctx.add(ribbon(rail, pc.s0, pc.s1, d + 1.8, d + 3.2, -0.15, M.gravel, 0.5));
    ctx.addGlass(ribbon(rail, pc.s0, pc.s1, d + 3.2, d + 30, -0.38, M.water, 0.2));
    ctx.addGlass(ribbon(rail, pc.s0 + 0.15, pc.s1 - 0.15, d + 3.22, d + 3.42, -0.35, M.foam, 0.65));
  } else if (pc.surface === 'market') {
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 2.4, d + 2.4, pc.y, M.slab, 0.5));
    ctx.add(ribbon(rail, pc.s0, pc.s1, d + 2.4, d + 9, pc.y - 0.02, M.cobble, 1));
  } else {
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 2.4, d + 7, pc.y, M.cobble, 1));
  }
};

B.water = (pc, ctx) => {
  const { M, rail } = ctx;
  const waterY = pc.y + 0.18;
  ctx.add(ribbon(rail, pc.s0, pc.s1, pc.d - 1.55, pc.d + 1.65, pc.y - 0.04, M.sand, 0.5));
  ctx.addGlass(ribbon(rail, pc.s0, pc.s1, pc.d - 1.53, pc.d + 1.63, waterY, M.water, 0.24));
  // Soft current lines collect against the dressed-stone banks.
  ctx.addGlass(ribbon(rail, pc.s0 + 0.2, pc.s1 - 0.2, pc.d - 1.48, pc.d - 1.34, waterY + 0.018, M.foam, 0.7));
  ctx.addGlass(ribbon(rail, pc.s0 + 0.2, pc.s1 - 0.2, pc.d + 1.43, pc.d + 1.57, waterY + 0.018, M.foam, 0.7));
  // Kiyamachi's towpath remains the safe ground-level route beside the flow.
  ctx.add(ribbon(rail, pc.s0, pc.s1, pc.d + 1.82, pc.d + 7, 0.0, M.cobble, 1));
};

/** The canal's architectural shell: wet banks, towpath, drains and greenery. */
B.canalQuarter = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const len = pc.s1 - pc.s0;
  const g = frameGroup(rail, sm);
  const zFar = pc.d - 1.68, zNear = pc.d + 1.78;

  // Retaining walls sit in the water, darker below the waterline. Individual
  // cap blocks break the long strip into hand-laid masonry at cat-eye height.
  for (const z of [zFar, zNear]) {
    g.add(box(len, 0.72, 0.38, M.wetStone, 0, -0.12, z));
    for (let x = -len / 2 + 0.55, i = 0; x < len / 2 - 0.2; x += 1.08, i++) {
      const cap = box(0.98, 0.16, 0.52, i % 3 === 0 ? M.slab : M.stone, x, 0.28 + (i % 2) * 0.018, z);
      cap.rotation.y = (i % 3 - 1) * 0.012;
      g.add(cap);
    }
  }

  // A narrow far-bank towpath and its timber edge. It gives the canal depth
  // behind the cat, especially where the route jumps onto the far boughs.
  g.add(box(len, 0.16, 1.35, M.slab, 0, 0.08, zFar - 0.72));
  g.add(box(len, 0.13, 0.12, M.timber, 0, 0.26, zFar + 0.23));

  // Mooring stakes and the thick hand-haul rope used by the takasebune.
  for (const u of [-0.41, -0.18, 0.13, 0.39]) {
    const x = u * len;
    const post = cyl(0.075, 1.05, M.timberMed, 'y', 8);
    post.position.set(x, 0.55, zNear - 0.18);
    g.add(post);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 5, 10), M.steel);
    ring.position.set(x, 0.77, zNear - 0.36);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }

  // A round storm drain, stone lip and trickle on the far wall.
  const drainX = -len * 0.22;
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), M.dark);
  drain.position.set(drainX, -0.04, zFar + 0.205);
  g.add(drain);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.055, 6, 16), M.wetStone);
  rim.position.copy(drain.position);
  g.add(rim);
  const trickle = box(0.13, 0.03, 0.7, M.water, drainX, -0.18, zFar + 0.55);
  trickle.rotation.x = Math.PI / 2;
  g.add(trickle);

  // Kiyamachi details: rain chains, potted nandina and two low paper lamps.
  for (const u of [-0.34, 0.27]) {
    const x = u * len;
    const chain = cyl(0.018, 2.1, M.bronze, 'y', 6);
    chain.position.set(x, 1.15, zFar - 1.37);
    g.add(chain);
    for (let j = 0; j < 4; j++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + j * 0.015, 1), j % 2 ? M.pine : M.foliage);
      leaf.position.set(x + (j - 1.5) * 0.12, 0.48 + j * 0.12, zFar - 1.0 + (j % 2) * 0.1);
      g.add(leaf);
    }
    g.add(cyl(0.18, 0.34, M.clay, 'y', 10));
    g.children[g.children.length - 1].position.set(x, 0.17, zFar - 1.0);
  }
  ctx.add(g);
  ctx.light(rail, pc.s0 + len * 0.28, 1.2, zFar - 0.8);
  ctx.light(rail, pc.s0 + len * 0.72, 1.2, zFar - 0.8);
};

B.steppingStone = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  const geo = new THREE.DodecahedronGeometry(0.55, 0);
  const stone = new THREE.Mesh(geo, ctx.M.wetStone);
  stone.scale.set(w, 0.24 + pc.look * 0.08, 0.78 + pc.look * 0.28);
  stone.rotation.set(0.04 * (pc.look - 0.5), pc.look * 0.7, 0.035 * (pc.look - 0.5));
  stone.position.set(0, pc.y - 0.17, pc.d);
  g.add(stone);
  // A thin moss cap keeps each stone readable against the moving water.
  const moss = new THREE.Mesh(new THREE.CircleGeometry(0.34 + pc.look * 0.12, 9), ctx.M.pine);
  moss.rotation.x = -Math.PI / 2;
  moss.scale.x = 1.25;
  moss.position.set(0.08, pc.y + 0.015, pc.d - 0.04);
  g.add(moss);
  ctx.add(g);
};

B.canalLanding = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const w = pc.s1 - pc.s0;
  g.add(box(w, 0.14, 1.25, M.timberMed, 0, pc.y - 0.07, pc.d));
  for (let i = 0; i < 3; i++) {
    const h = pc.y * (i + 1) / 3;
    const step = box(w * 0.62, 0.12, 0.36, M.wetStone, (i - 1) * w * 0.14, h - 0.06, pc.d + (pc.side === 'near' ? 0.75 + i * 0.28 : -0.75 - i * 0.28));
    g.add(step);
  }
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
    const post = box(0.08, pc.y + 0.48, 0.08, M.timber, x, (pc.y + 0.48) / 2, pc.d + 0.52);
    g.add(post);
  }
  ctx.add(g);
};

B.canalBridge = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const w = pc.s1 - pc.s0;
  // A tiny sori bridge: three gently stepped planks span bank to bank. The
  // collision top stays flat and forgiving while the silhouette reads arched.
  for (let i = -3; i <= 3; i++) {
    const z = pc.d + i * 0.62;
    const y = pc.y - 0.12 + 0.18 * (1 - Math.abs(i) / 3);
    g.add(box(w, 0.15, 0.66, M.timberMed, 0, y, z));
  }
  for (const side of [-1, 1]) {
    const z = pc.d + side * 2.0;
    g.add(box(w, 0.08, 0.08, M.lacquer, 0, pc.y + 0.65, z));
    for (let x = -w / 2 + 0.12; x <= w / 2 - 0.08; x += 0.48) {
      g.add(box(0.06, 0.7, 0.06, M.lacquer, x, pc.y + 0.3, z));
    }
  }
  const plaque = box(0.9, 0.35, 0.05, M.noren.indigo, 0, pc.y + 0.9, pc.d + 2.04);
  g.add(plaque);
  ctx.add(g);
};

B.house = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm;
  const zF = pc.dFront, zB = pc.dFront - pc.depth;
  const look = pc.look;
  const far = pc.row === 'far';
  const wallMat = far && look > 0.55 ? M.bengara : (look > 0.7 ? M.plasterWarm : M.plaster);
  // Body: the walls up to the eave.
  g.add(box(x1 - x0, pc.eave, pc.depth, wallMat, 0, pc.eave / 2, (zF + zB) / 2));
  g.add(box(x1 - x0 + 0.12, 0.12, pc.depth + 0.12, M.timber, 0, pc.eave - 0.06, (zF + zB) / 2));
  facade(g, M, pc, x0, x1, zF, look);
  if (pc.style === 'hira') hiraRoof(g, M, x0, x1, zF, zB, pc.eave, pc.ridge);
  else tsumaRoof(g, M, x0, x1, zF, zB, pc.eave, pc.ridge);
  streetEaveDetails(g, M, pc, x0, x1, zF, look);
  if (pc.kaisho) {
    // The kaisho's second-floor opening onto the plank, curtained in festival red.
    g.add(box(1.4, 1.0, 0.06, M.tapestry, x1 - 0.9, 3.3, zF + 0.05));
  }
  if (pc.deck) {
    const dk = pc.deck;
    const zR = (zF + zB) / 2;
    const zD = zR + 0.9;
    const dx0 = dk.s0 - sm, dx1 = dk.s1 - sm, dxm = (dx0 + dx1) / 2;
    g.add(box(dx1 - dx0, 0.1, 2.0, M.timberMed, dxm, dk.y - 0.05, zD));
    for (const px of [dx0 + 0.1, dx1 - 0.1]) for (const pz of [zD - 0.9, zD + 0.9]) {
      g.add(box(0.1, dk.y - pc.ridge + 0.85, 0.1, M.timber, px, (pc.ridge + dk.y + 0.85) / 2 - 0.05, pz));
    }
    g.add(box(dx1 - dx0, 0.06, 0.06, M.timber, dxm, dk.y + 0.8, zD + 0.95));
    g.add(box(0.06, 0.06, 2.0, M.timber, dx0 + 0.1, dk.y + 0.8, zD));
    g.add(box(0.06, 0.06, 2.0, M.timber, dx1 - 0.1, dk.y + 0.8, zD));
    // A pole of washing over the deck.
    const pole = cyl(0.03, dx1 - dx0, M.bamboo, 'x', 6);
    pole.position.set(dxm, dk.y + 1.45, zD - 0.3);
    g.add(pole);
    for (let x = dx0 + 0.5, i = 0; x < dx1 - 0.4; x += 0.75, i++) {
      const cl = box(0.55, 0.7 + hash1(x + sm) * 0.25, 0.015, M.cloth[(i + Math.floor(look * 5)) % M.cloth.length], x, dk.y + 1.05, zD - 0.3);
      g.add(cl);
    }
    if (pc.futon) {
      const fx0 = pc.futon.s0 - sm, fx1 = pc.futon.s1 - sm, fxm = (fx0 + fx1) / 2, fw = fx1 - fx0;
      const zf = zR + 1.5;
      g.add(box(fw, 0.16, 0.9, M.futon, fxm, pc.futon.y - 0.08, zf));
      g.add(box(fw, 0.75, 0.12, M.futon, fxm, pc.futon.y - 0.45, zf + 0.42));
      g.add(box(fw, 0.75, 0.12, M.futon, fxm, pc.futon.y - 0.45, zf - 0.42));
    }
  }
  // Yoiyama: a pair of lanterns under the eave of the festival-street houses.
  if (pc.lanterns) {
    const ly = (pc.storeys === 2 ? pc.hisashi : pc.eave) - 0.38;
    for (const lx of [x0 + (x1 - x0) * 0.22, x1 - (x1 - x0) * 0.22]) {
      g.add(box(0.02, 0.2, 0.02, M.dark, lx, ly + 0.25, zF + 0.55));
      const l = cyl(0.13, 0.32, look > 0.5 ? M.lanternRed : M.lanternWhite, 'y', 10);
      l.position.set(lx, ly, zF + 0.55);
      g.add(l);
    }
    ctx.light(rail, sm, ly, zF + 0.9);
  }
  // Lit shoji upstairs at night.
  if (pc.storeys === 2 && !pc.covered) {
    g.add(box(Math.min(1.2, (x1 - x0) * 0.3), 0.5, 0.03, M.shoji, x0 + 0.9, (pc.hisashi + pc.eave) / 2 + 0.2, zF + 0.035));
  }
  ctx.add(g);
};

B.kura = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm, w = x1 - x0;
  const zF = pc.dFront, zB = zF - pc.depth, zm = (zF + zB) / 2;
  g.add(box(w, pc.foot, pc.depth, M.plaster, 0, pc.foot / 2, zm));
  g.add(box(w + 0.05, 1.6, pc.depth + 0.05, M.namako, 0, 0.8, zm));
  g.add(box(w + 0.16, 0.22, pc.depth + 0.16, M.timber, 0, pc.foot - 0.11, zm));
  // A small barred window high on the gable side.
  g.add(box(0.8, 0.7, 0.08, M.dark, 0, pc.foot - 1.0, zF + 0.03));
  for (let i = -1; i <= 1; i++) g.add(box(0.05, 0.7, 0.1, M.plaster, i * 0.22, pc.foot - 1.0, zF + 0.05));
  tsumaRoof(g, M, x0, x1, zF, zB, pc.foot, pc.ridge, 0.25);
  ctx.add(g);
};

B.corner = (pc, ctx) => {
  const { M } = ctx;
  const g = new THREE.Group();
  g.position.set(pc.cx, 0, pc.cz);
  g.rotation.y = Math.atan2(-pc.tIn.z, pc.tIn.x);        // local x along the incoming leg
  const h = pc.half, eave = pc.eave;
  g.add(box(h * 2, eave, h * 2, M.plasterWarm, 0, eave / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.16, eave, 0.16, M.timber, sx * (h - 0.08), eave / 2, sz * (h - 0.08)));
  // Hip roof under the deck.
  const roofGeo = new THREE.ConeGeometry((h + 0.45) * Math.SQRT2, 1.0, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, M.roof);
  roof.position.y = eave + 0.5;
  g.add(roof);
  // The drying deck the run crosses, posts down to the roof.
  const top = pc.h, dh = pc.deckHalf;
  g.add(box(dh * 2, 0.12, dh * 2, M.timberMed, 0, top - 0.06, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.12, top - eave, 0.12, M.timber, sx * (dh - 0.1), (top + eave) / 2, sz * (dh - 0.1)));
  g.add(box(dh * 2, 0.06, 0.06, M.timber, 0, top + 0.75, dh - 0.05));
  g.add(box(0.06, 0.06, dh * 2, M.timber, dh - 0.05, top + 0.75, 0));
  for (let i = -2; i <= 2; i++) {
    g.add(box(0.05, 0.75, 0.05, M.timber, i * dh / 2.5, top + 0.37, dh - 0.05));
    g.add(box(0.05, 0.75, 0.05, M.timber, dh - 0.05, top + 0.37, i * dh / 2.5));
  }
  // Façades on the two street sides.
  for (const [rx, rz, ry] of [[0, h + 0.01, 0], [h + 0.01, 0, Math.PI / 2]]) {
    const f = box(h * 1.4, 1.5, 0.05, M.koshi, rx, 1.0, rz);
    f.rotation.y = ry;
    g.add(f);
  }
  ctx.add(g);
};

B.bridge = (pc, ctx) => {
  const { M, rail } = ctx;
  const g = frameGroup(rail, 5.5);

  // Kamo riverbed close-up: long dressed-stone banks, pale gravel shoals and
  // a few water-worn rocks keep the opening vista from reading as one flat
  // rectangle beneath the bridge. All of it is static-merged after framing.
  for (const x of [-3.28, 2.08]) {
    g.add(box(0.44, 0.72, 30, M.wetStone, x, -0.24, -3.8));
    for (let z = -17.0, i = 0; z <= 9.5; z += 2.15, i++) {
      const cap = box(0.62, 0.15, 1.88, i % 3 === 0 ? M.slab : M.stone, x, 0.185 + (i % 2) * 0.012, z);
      cap.rotation.y = (i % 3 - 1) * 0.018;
      g.add(cap);
    }
  }
  for (const [x, z, sx, sz, turn] of [
    [-2.72, -8.8, 0.42, 3.3, -0.12], [1.55, -2.5, 0.34, 2.5, 0.08],
    [-2.62, 5.2, 0.28, 2.0, 0.16], [1.62, 8.0, 0.22, 1.5, -0.09]
  ]) {
    const shoal = new THREE.Mesh(new THREE.CircleGeometry(1, 18), M.sand);
    shoal.rotation.x = -Math.PI / 2;
    shoal.rotation.y = turn;
    shoal.scale.set(sx, sz, 1);
    shoal.position.set(x, -0.525, z);
    g.add(shoal);
  }
  for (const [x, z, size, turn] of [
    [-2.55, -7.4, 0.42, 0.2], [-2.76, -3.4, 0.31, -0.5], [1.47, -1.5, 0.38, 0.7],
    [1.66, 3.8, 0.27, -0.2], [-2.63, 6.1, 0.34, 0.5], [1.55, 8.5, 0.24, -0.7]
  ]) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), M.wetStone);
    stone.scale.set(1.15, 0.38, 1.5);
    stone.rotation.y = turn;
    stone.position.set(x, -0.43, z);
    g.add(stone);
  }

  // Heavy edge beams, visible cross-ties and individual plank seams give the
  // starting deck real joinery while preserving its single forgiving plane.
  g.add(box(11.0, 0.18, 2.7, M.timberMed, 0, pc.deckY - 0.09, 0));
  g.add(box(11.0, 0.16, 2.5, M.timber, 0, pc.deckY - 0.26, 0));
  for (const z of [-1.4, 1.4]) g.add(box(11.25, 0.3, 0.17, M.timber, 0, pc.deckY - 0.34, z));
  for (let x = -5.18, i = 0; x <= 5.18; x += 0.54, i++) {
    g.add(box(0.026, 0.022, 2.5, M.dark, x, pc.deckY + 0.011, 0));
    if (i % 2 === 0) {
      for (const z of [-1.04, 1.04]) {
        const peg = cyl(0.024, 0.026, M.bronze, 'y', 7);
        peg.position.set(x, pc.deckY + 0.025, z);
        g.add(peg);
      }
    }
  }
  for (let x = -4.8; x <= 4.8; x += 1.2) g.add(box(0.18, 0.19, 3.05, M.timber, x, pc.deckY - 0.41, 0));

  // Three masonry piers stand in the flow. Pointed upstream cutwaters split
  // the current; lighter cap stones catch the morning sky beneath the deck.
  const cutwaterGeo = new THREE.ConeGeometry(0.56, 1.45, 4);
  cutwaterGeo.rotateY(Math.PI / 4);
  cutwaterGeo.rotateX(-Math.PI / 2);
  for (const x of [-2.8, 0, 2.0]) {
    g.add(box(0.72, pc.deckY + 0.3, 1.8, M.stone, x, (pc.deckY - 0.6) / 2 - 0.15, 0));
    g.add(box(1.02, 0.18, 2.12, M.slab, x, pc.deckY - 0.28, 0));
    const cutwater = new THREE.Mesh(cutwaterGeo, M.wetStone);
    cutwater.position.set(x, -0.03, -1.5);
    g.add(cutwater);
  }
  const giboshi = new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.12, 0.0), new THREE.Vector2(0.13, 0.05),
    new THREE.Vector2(0.1, 0.1), new THREE.Vector2(0.16, 0.2), new THREE.Vector2(0.15, 0.3),
    new THREE.Vector2(0.08, 0.38), new THREE.Vector2(0.03, 0.46), new THREE.Vector2(0.0, 0.5)
  ], 14);
  for (const z of [-1.25, 1.25]) {
    g.add(box(11.0, 0.08, 0.14, M.timber, 0, 1.62, z));
    g.add(box(11.0, 0.06, 0.1, M.timber, 0, 1.3, z));
    for (const s of [0.2, ...pc.caps, 10.8]) {
      const x = s - 5.5;
      g.add(box(0.2, 0.75, 0.2, M.timber, x, pc.deckY + 0.36, z));
      const collar = cyl(0.13, 0.07, M.bronze, 'y', 10);
      collar.position.set(x, pc.deckY + 0.13, z);
      g.add(collar);
      if (pc.caps.includes(s)) {
        const gb = new THREE.Mesh(giboshi, M.bronze);
        gb.position.set(x, pc.capY - 0.5, z);
        g.add(gb);
      }
    }
  }
  // Ramp down into the city.
  slope(g, M.timberMed, { x: 7.9, y: 0.05, z: 0 }, pc.deckY - 0.05, 2.4, 2.7, Math.PI / 2, 0.14);
  ctx.add(g);
};

B.kido = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const hw = (pc.s1 - pc.s0) / 2;
  for (const x of [-hw + 0.15, hw - 0.15]) g.add(box(0.18, 2.2, 0.18, M.timber, x, 1.1, pc.d));
  g.add(box(hw * 2, 0.16, 0.2, M.timber, 0, 2.1, pc.d));
  slope(g, M.roof, { x: 0, y: 2.15, z: pc.d + 0.55 }, 0.1, 0.55, hw * 2 + 0.3, 0);
  slope(g, M.roof, { x: 0, y: 2.15, z: pc.d - 0.55 }, 0.1, 0.55, hw * 2 + 0.3, Math.PI);
  ridgeCap(g, M, -hw - 0.15, hw + 0.15, pc.y - 0.25, pc.d);
  // The gate leaves stand open.
  for (const sx of [-1, 1]) {
    const leaf = box(0.9, 1.8, 0.06, M.timberMed, sx * (hw - 0.2), 1.0, pc.d - 0.5);
    leaf.rotation.y = sx * 1.2;
    g.add(leaf);
  }
  ctx.add(g);
  ctx.light(rail, sm, 1.9, pc.d + 0.5);
};

B.barrel = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const b = cyl(0.3, 0.8, ctx.M.timberMed, 'y', 12);
  b.position.set(0, 0.4, pc.d);
  g.add(b);
  for (const y of [0.15, 0.65]) { const r = cyl(0.31, 0.05, ctx.M.dark, 'y', 12); r.position.set(0, y, pc.d); g.add(r); }
  ctx.add(g);
};

B.crate = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  g.add(box(w, pc.y * 0.5, 0.7, ctx.M.timberMed, 0, pc.y * 0.25, pc.d));
  g.add(box(w * 0.9, pc.y * 0.5, 0.65, ctx.M.timberMed, 0.03, pc.y * 0.75, pc.d - 0.02));
  ctx.add(g);
};

B.komayose = (pc, ctx) => {
  const { M } = ctx;
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  g.add(box(w, 0.1, 0.16, M.timberMed, 0, pc.y - 0.05, pc.d));
  for (let x = -w / 2 + 0.08; x <= w / 2 - 0.07; x += 0.22) g.add(box(0.08, pc.y - 0.1, 0.08, M.timberMed, x, (pc.y - 0.1) / 2, pc.d));
  ctx.add(g);
};

B.inuyarai = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  const geo = new THREE.CylinderGeometry(0.9, 0.9, w, 12, 1, true, 0, Math.PI / 2);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, ctx.M.inuyarai);
  m.position.set(0, 0, pc.d - 0.4);              // top against the wall, foot out on the street
  g.add(m);
  ctx.add(g);
};

B.toro = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(0.5, 0.15, 0.5, M.stone, 0, 0.08, pc.d));
  const post = cyl(0.11, 0.7, M.stone, 'y', 8); post.position.set(0, 0.5, pc.d); g.add(post);
  g.add(box(0.42, 0.12, 0.42, M.stone, 0, 0.9, pc.d));
  g.add(box(0.3, 0.25, 0.3, M.lanternWhite, 0, 1.08, pc.d));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.25, 4), M.stone);
  roof.rotation.y = Math.PI / 4; roof.position.set(0, 1.33, pc.d);
  g.add(roof);
  ctx.add(g);
  ctx.light(ctx.rail, sm, 1.1, pc.d);
};

B.post = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(0.1, pc.y - 1.4, 0.1, M.timber, 0, 1.4 + (pc.y - 1.4) / 2, pc.d));
  g.add(box(0.3, 0.05, 0.3, M.timber, 0, pc.y - 0.02, pc.d));
  const l = cyl(0.16, 0.4, M.lanternRed, 'y', 10);
  l.position.set(0, pc.y - 0.35, pc.d + 0.25);
  g.add(l);
  ctx.add(g);
  ctx.light(ctx.rail, sm, pc.y - 0.35, pc.d + 0.3);
};

B.steps = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  g.add(box(pc.s1 - pc.s0, 0.3, 4.0, ctx.M.stone, 0, pc.y - 0.15, pc.d));
  ctx.add(g);
};

B.roji = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const w = pc.s1 - pc.s0;
  const g = frameGroup(rail, sm);
  const zFar = pc.d - 5.0;

  // A thumb-width side alley between the first machiya: wet stone, an open
  // drain and deliberately uneven tobi-ishi draw the eye deep into the block.
  g.add(box(w - 0.1, 0.08, 5.55, M.wetStone, 0, 0.04, pc.d - 2.25));
  for (const x of [-w / 2 + 0.09, w / 2 - 0.09]) {
    g.add(box(0.11, 0.055, 5.45, M.dark, x, 0.082, pc.d - 2.25));
  }
  for (let i = 0; i < 7; i++) {
    const slab = box(0.56 + (i % 2) * 0.08, 0.075, 0.42 + (i % 3) * 0.055,
      i % 3 === 0 ? M.slab : M.stone, (i % 3 - 1) * 0.075, 0.125, pc.d + 0.02 - i * 0.7);
    slab.rotation.y = (i % 2 ? -1 : 1) * (0.035 + i * 0.006);
    g.add(slab);
  }

  // Copper rain chain, clay nandina pot and a low tsukubai make the alley a
  // tiny destination rather than a black gap between two façades.
  const chain = cyl(0.018, 2.1, M.bronze, 'y', 6);
  chain.position.set(-w * 0.34, 1.1, pc.d - 0.35);
  g.add(chain);
  const pot = cyl(0.19, 0.3, M.clay, 'y', 10);
  pot.position.set(w * 0.27, 0.18, pc.d - 2.35);
  g.add(pot);
  for (let i = 0; i < 5; i++) {
    const stem = cyl(0.018, 0.48 + i * 0.06, M.bark, 'y', 5);
    stem.rotation.z = (i - 2) * 0.12;
    stem.position.set(w * 0.27 + (i - 2) * 0.035, 0.52, pc.d - 2.35);
    g.add(stem);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + (i % 2) * 0.025, 1), i % 2 ? M.pine : M.foliage);
    leaf.scale.set(0.8, 1.35, 0.65);
    leaf.position.set(w * 0.27 + (i - 2) * 0.075, 0.74 + (i % 2) * 0.1, pc.d - 2.35 + (i % 3 - 1) * 0.08);
    g.add(leaf);
  }
  const basin = cyl(0.29, 0.24, M.wetStone, 'y', 11);
  basin.position.set(-w * 0.22, 0.18, pc.d - 3.35);
  g.add(basin);
  const basinWater = new THREE.Mesh(new THREE.CircleGeometry(0.21, 14), M.glass);
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.set(-w * 0.22, 0.305, pc.d - 3.35);
  g.add(basinWater);
  const spout = cyl(0.028, 0.62, M.bamboo, 'x', 7);
  spout.position.set(-w * 0.02, 0.63, pc.d - 3.35);
  g.add(spout);
  const spoutPost = cyl(0.035, 0.75, M.bamboo, 'y', 7);
  spoutPost.position.set(w * 0.25, 0.42, pc.d - 3.35);
  g.add(spoutPost);

  // A softly lit service door closes the perspective, with a bamboo lintel
  // and short noren that move in the same breeze as the street curtains.
  g.add(box(w - 0.16, 1.72, 0.08, M.timber, 0, 0.86, zFar));
  g.add(box(w - 0.34, 1.38, 0.035, M.shoji, 0, 0.86, zFar + 0.05));
  for (const x of [-w * 0.36, w * 0.36]) g.add(box(0.07, 2.0, 0.07, M.bamboo, x, 1.0, zFar + 0.18));
  const lintel = cyl(0.055, w - 0.12, M.bamboo, 'x', 8);
  lintel.position.set(0, 1.95, zFar + 0.18);
  g.add(lintel);
  g.add(box(w - 0.34, 0.52, 0.018, M.noren.hemp, 0, 1.63, zFar + 0.22));
  const cord = box(0.018, 0.34, 0.018, M.dark, w * 0.25, 1.74, zFar + 0.35);
  g.add(cord);
  const lamp = cyl(0.12, 0.29, M.lanternWhite, 'y', 10);
  lamp.position.set(w * 0.25, 1.47, zFar + 0.35);
  g.add(lamp);

  ctx.add(g);
  ctx.light(rail, sm, 1.47, zFar + 0.38);
};

B.tsuboniwa = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const tr = cyl(0.07, 2.2, M.bark, 'y', 6); tr.position.set(0, 1.1, pc.d - 0.8); g.add(tr);
  const k = hash1(sm);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + 0.14 * hash1(sm + i), 1), k > 0.5 ? M.pine : M.foliage);
    c.position.set((hash1(sm * 3 + i) - 0.5) * 1.1, 1.9 + i * 0.12, pc.d - 1.2 + (hash1(sm + i * 7) - 0.5) * 0.7);
    g.add(c);
  }
  ctx.add(g);
};

B.rope = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  if (pc.style === 'laundry') {
    const pole = cyl(0.045, w + 0.4, M.bamboo, 'x', 8);
    pole.position.set(0, pc.y - 0.04, pc.d);
    g.add(pole);
    for (let x = -w / 2 + 0.45, i = 0; x < w / 2 - 0.3; x += 0.8, i++) {
      g.add(box(0.6, 0.75, 0.015, M.cloth[(i * 2 + Math.floor(sm)) % M.cloth.length], x, pc.y - 0.5, pc.d + 0.02));
    }
  } else if (pc.style === 'tow') {
    // The Takase boats were hauled by hand. A weathered hemp line crosses
    // between two mooring posts and doubles as the upper route's balance beam.
    const line = cyl(0.045, w + 0.36, M.hemp, 'x', 8);
    line.position.set(0, pc.y - 0.045, pc.d);
    line.rotation.x = 0.025;
    g.add(line);
    for (const x of [-w / 2 - 0.08, w / 2 + 0.08]) {
      const post = cyl(0.075, 1.0, M.timberMed, 'y', 8);
      post.position.set(x, pc.y - 0.52, pc.d);
      g.add(post);
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 5, 9), M.hemp);
      knot.position.set(x, pc.y - 0.06, pc.d);
      knot.rotation.y = Math.PI / 2;
      g.add(knot);
    }
  } else {
    const line = cyl(0.02, w + 0.3, M.dark, 'x', 5);
    line.position.set(0, pc.y - 0.03, pc.d);
    g.add(line);
    for (let x = -w / 2 + 0.3, i = 0; x < w / 2 - 0.2; x += 0.55, i++) {
      const l = cyl(0.11, 0.26, i % 3 === 1 ? M.lanternWhite : M.lanternRed, 'y', 10);
      l.position.set(x, pc.y - 0.28, pc.d);
      g.add(l);
    }
    ctx.light(ctx.rail, sm, pc.y - 0.3, pc.d);
  }
  ctx.add(g);
};

B.deck = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  if (pc.style === 'plank') {
    g.add(box(w, 0.08, 0.5, M.timberMed, 0, pc.y - 0.04, pc.d));
    for (const z of [-0.26, 0.26]) g.add(box(w, 0.05, 0.05, M.lacquer, 0, pc.y + 0.55, pc.d + z));
    ctx.add(g);
    return;
  }
  // Yuka: a timber deck on stilts over the riverbank, lanterns and low tables.
  g.add(box(w, 0.12, 2.6, M.timberMed, 0, pc.y - 0.06, pc.d));
  for (let x = -w / 2 + 0.2; x <= w / 2 - 0.15; x += 1.6) {
    for (const z of [pc.d - 1.2, pc.d + 1.2]) g.add(box(0.12, pc.y, 0.12, M.timber, x, pc.y / 2, z));
  }
  g.add(box(w, 0.06, 0.06, M.timber, 0, pc.y + 0.55, pc.d + 1.28));
  for (let x = -w / 2 + 1.2; x < w / 2 - 0.8; x += 2.4) {
    g.add(box(0.9, 0.3, 0.55, M.dark, x, pc.y + 0.15, pc.d - 0.2));
    g.add(box(0.4, 0.06, 0.4, M.goods[3], x - 0.6, pc.y + 0.03, pc.d - 0.2));
    g.add(box(0.4, 0.06, 0.4, M.goods[3], x + 0.6, pc.y + 0.03, pc.d - 0.2));
  }
  ctx.add(g);
};

B.balcony = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const near = pc.d > -1;
  const outer = pc.d + (near ? 0.72 : -0.72);
  const inner = pc.d - (near ? 0.38 : -0.38);
  const deckMat = pc.style === 'awning' ? M.cloth[(Math.floor(pc.look * 7) + 1) % M.cloth.length] : M.timberMed;

  g.add(box(w, pc.style === 'awning' ? 0.07 : 0.11, 1.45, deckMat, 0, pc.y - 0.055, pc.d));
  g.add(box(w, 0.08, 0.1, M.timber, 0, pc.y - 0.13, outer));
  for (let x = -w / 2 + 0.12; x < w / 2; x += 0.78) {
    const brace = box(0.065, Math.max(0.6, pc.y - 0.25), 0.065, M.timber, x,
      (pc.y - 0.25) / 2, inner);
    g.add(brace);
    if (pc.style !== 'awning') g.add(box(0.055, 0.46, 0.055, M.timber, x, pc.y + 0.23, outer));
  }
  if (pc.style !== 'awning') {
    g.add(box(w, 0.055, 0.06, M.timber, 0, pc.y + 0.48, outer));
  } else {
    // A scalloped shop awning: the fringe moves with the same breeze shader as
    // the laundry, while the timber braces explain why a cat can stand on it.
    for (let x = -w / 2 + 0.18, i = 0; x < w / 2 - 0.05; x += 0.36, i++) {
      g.add(box(0.28, 0.16 + (i % 2) * 0.05, 0.018, deckMat, x, pc.y - 0.13, outer + 0.04));
    }
  }
  if (pc.style === 'bridge') {
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
      const rope = cyl(0.018, 2.1, M.hemp, 'y', 5);
      rope.position.set(x, pc.y + 0.98, outer);
      g.add(rope);
    }
  }
  if (pc.look > 0.46) {
    const lantern = cyl(0.105, 0.28, pc.look > 0.72 ? M.lanternRed : M.lanternWhite, 'y', 9);
    lantern.position.set((pc.look - 0.5) * w * 0.75, pc.y - 0.28, outer);
    g.add(lantern);
    ctx.light(ctx.rail, sm, pc.y - 0.25, outer);
  }
  ctx.add(g);
};

B.marketCrossing = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);

  // A narrow bridge slung below the missing canopy bay. The long crossbeams
  // and suspension ropes make the depth change legible from a side camera.
  g.add(box(w, 0.11, 1.2, M.timberMed, 0, pc.y - 0.055, pc.d));
  for (let x = -w / 2 + 0.18; x <= w / 2 - 0.12; x += 0.34) {
    g.add(box(0.07, 0.08, 1.34, M.timber, x, pc.y - 0.12, pc.d));
  }
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    for (const z of [pc.d - 0.52, pc.d + 0.52]) {
      const rope = cyl(0.018, 1.12, M.hemp, 'y', 5);
      rope.position.set(x, pc.y + 0.55, z);
      g.add(rope);
    }
  }
  const toward = pc.side === 'near' ? 1 : -1;
  const crossZ = pc.d - toward * 1.65;
  g.add(box(0.13, 0.1, 4.3, M.steel, 0, pc.y + 1.05, crossZ));
  for (const z of [-1, 0, 1]) {
    const pennant = box(0.42, 0.52, 0.018, M.goods[(z + 3) % M.goods.length], 0,
      pc.y + 0.72, crossZ + z * 0.82);
    pennant.rotation.y = 0.04 * z;
    g.add(pennant);
  }
  const lamp = cyl(0.13, 0.34, M.lanternWhite, 'y', 10);
  lamp.position.set(0, pc.y + 0.42, pc.d + toward * 0.8);
  g.add(lamp);
  ctx.add(g);
  ctx.light(ctx.rail, sm, pc.y + 0.42, pc.d + toward * 0.8);
};

B.cistern = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const tankH = 1.28, radius = Math.min(0.96, w * 0.43);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius, tankH, 16), M.timberMed);
  tank.position.set(0, pc.y - tankH / 2 - 0.06, pc.d);
  g.add(tank);
  for (const y of [pc.y - 0.25, pc.y - 0.66, pc.y - 1.06]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.015, 0.025, 5, 18), M.steel);
    hoop.rotation.x = Math.PI / 2; hoop.position.set(0, y, pc.d); g.add(hoop);
  }
  const lid = cyl(radius * 0.96, 0.1, M.timber, 'y', 16);
  lid.position.set(0, pc.y - 0.05, pc.d); g.add(lid);
  const cap = cyl(0.16, 0.09, M.bronze, 'y', 10);
  cap.position.set(0, pc.y + 0.045, pc.d); g.add(cap);
  // Cross-braced stand and a tiny ladder explain the high cat route.
  for (const x of [-radius * 0.62, radius * 0.62]) {
    g.add(box(0.11, 1.0, 0.11, M.timber, x, pc.y - 1.78, pc.d));
  }
  for (let y = pc.y - 1.95; y < pc.y - 0.78; y += 0.24) {
    g.add(box(0.62, 0.04, 0.05, M.bamboo, radius + 0.16, y, pc.d + 0.74));
  }
  for (const x of [radius - 0.13, radius + 0.45]) {
    g.add(box(0.045, 1.35, 0.045, M.bamboo, x, pc.y - 1.36, pc.d + 0.74));
  }
  ctx.add(g);
};

B.chimney = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const h = 1.55;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.42, h, 8), pc.look > 0.5 ? M.bengara : M.plasterWarm);
  body.position.set(0, pc.y - h / 2 - 0.08, pc.d); g.add(body);
  g.add(box(w * 0.86, 0.13, w * 0.82, M.stone, 0, pc.y - 0.1, pc.d));
  const rainCap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.48, 0.22, 4), M.ridge);
  rainCap.rotation.y = Math.PI / 4; rainCap.position.set(0, pc.y + 0.07, pc.d); g.add(rainCap);
  for (const x of [-w * 0.29, w * 0.29]) g.add(box(0.05, 0.25, 0.05, M.steel, x, pc.y - 0.02, pc.d));
  ctx.add(g);
};

B.futonRack = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(w + 0.18, 0.12, 1.18, M.futon, 0, pc.y - 0.06, pc.d));
  g.add(box(w + 0.12, 0.56, 0.1, M.futon, 0, pc.y - 0.34, pc.d + 0.54));
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    g.add(box(0.08, pc.y, 0.08, M.timber, x, pc.y / 2, pc.d - 0.45));
  }
  for (const x of [-w * 0.28, w * 0.28]) {
    const tie = box(0.055, 0.15, 1.24, pc.look > 0.5 ? M.noren.crimson : M.noren.indigo, x, pc.y - 0.03, pc.d);
    g.add(tie);
  }
  ctx.add(g);
};

B.yatai = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const awning = M.cloth[Math.floor(pc.look * M.cloth.length) % M.cloth.length];

  // A compact festival stall: timber counter, climbable striped awning,
  // noren, trays and one warm chōchin. Each fare has its own silhouette.
  g.add(box(w, 0.08, 1.55, awning, 0, pc.y - 0.04, pc.d));
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    g.add(box(0.09, pc.y - 0.22, 0.09, M.timber, x, (pc.y - 0.22) / 2, pc.d - 0.58));
  }
  g.add(box(w * 0.9, 0.12, 0.72, M.timberMed, 0, 0.86, pc.d + 0.42));
  g.add(box(w * 0.86, 0.72, 0.08, M.noren[pc.look > 0.66 ? 'crimson' : pc.look > 0.33 ? 'indigo' : 'hemp'], 0, 1.42, pc.d + 0.76));
  if (pc.fare === 'yakitori' || pc.fare === 'dango') {
    for (let x = -w * 0.32; x <= w * 0.32; x += 0.25) {
      const skewer = cyl(0.018, 0.78, M.bamboo, 'y', 5); skewer.position.set(x, 1.18, pc.d + 0.62); g.add(skewer);
      for (let y = 1.0; y < 1.32; y += 0.14) {
        const bite = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), M.goods[pc.fare === 'dango' ? 3 : 0]);
        bite.position.set(x, y, pc.d + 0.62); g.add(bite);
      }
    }
  } else if (pc.fare === 'festival masks') {
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) {
      const mask = new THREE.Mesh(new THREE.CircleGeometry(0.105, 10), M.goods[(i + 1) % M.goods.length]);
      mask.position.set(x, 1.48, pc.d + 0.82); g.add(mask);
    }
  } else {
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) {
      const bottle = cyl(0.045, 0.25, M.goods[(i + 4) % M.goods.length], 'y', 7);
      bottle.position.set(x, 1.05, pc.d + 0.58); g.add(bottle);
    }
  }
  const lantern = cyl(0.12, 0.34, pc.look > 0.5 ? M.lanternRed : M.lanternWhite, 'y', 10);
  lantern.position.set(w * 0.36, pc.y - 0.32, pc.d + 0.68); g.add(lantern);
  ctx.add(g);
  ctx.light(ctx.rail, sm + w * 0.28, pc.y - 0.3, pc.d + 0.7);
};

B.cherry = (pc, ctx) => {
  const { M, rail } = ctx;
  const bg = pc.bough;
  const sm = (bg.s0 + bg.s1) / 2;
  const g = frameGroup(rail, sm);
  const bx0 = bg.s0 - sm, bx1 = bg.s1 - sm;
  // Trunk leaning out over the canal from alternating banks. The playable
  // branch zigzags in depth, so this is a real upper-layer route, not scenery.
  const bankDir = pc.bank === 'far' ? -1 : 1;
  const trunk = cyl(0.14, bg.y + 0.9, M.bark, 'y', 7);
  trunk.position.set(bx0 - 0.5, (bg.y - 0.3) / 2, pc.d + bankDir * 1.55);
  trunk.rotation.x = -bankDir * 0.35;
  g.add(trunk);
  const bough = cyl(0.09, bx1 - bx0 + 0.6, M.bark, 'x', 6);
  bough.position.set((bx0 + bx1) / 2, bg.y - 0.09, pc.d);
  g.add(bough);
  // Blossom clumps above and behind the bough, so the cat stays in view.
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 + 0.14 * hash1(sm + i * 3.1), 1), M.blossom);
    const u = i / 15;
    c.position.set(
      bx0 - 0.9 + u * (bx1 - bx0 + 1.8),
      bg.y + 0.3 + 0.45 * hash1(sm + i),
      pc.d - bankDir * (0.18 + 0.95 * hash1(sm * 2 + i))
    );
    g.add(c);
  }
  ctx.add(g);
};

B.boat = (pc, ctx) => {
  const { M } = ctx;
  const g = new THREE.Group();
  const len = pc.len || 4.4;

  // Tapered open hull, dark inside, raised gunwales and visible deck ribs.
  const hull = new THREE.Mesh(boatHullGeometry(len + 0.5, 1.58, 0.5), M.timber);
  hull.position.y = 0.28;
  g.add(hull);
  g.add(box(len - 0.35, 0.07, 1.08, M.timberMed, 0, 0.22, 0));
  for (const z of [-0.76, 0.76]) g.add(box(len + 0.18, 0.12, 0.1, M.timber, 0, 0.34, z));
  for (let x = -len / 2 + 0.45; x < len / 2 - 0.15; x += 0.55) {
    g.add(box(0.065, 0.2, 1.42, M.timberMed, x, 0.24, 0));
  }
  // Curled bow guards give the little boat a memorable animation silhouette.
  for (const sx of [-1, 1]) {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 6, 12, Math.PI * 0.9), M.timber);
    bow.position.set(sx * (len / 2 + 0.12), 0.48, 0);
    bow.rotation.set(Math.PI / 2, 0, sx > 0 ? 0.25 : Math.PI + 0.25);
    g.add(bow);
  }

  // Rice bales are lashed as a climbable cargo island; their crown matches
  // the moving physics platform exactly at pc.y.
  const cargo = [
    [-1.0, 0.57, -0.29], [-0.18, 0.57, -0.29], [0.64, 0.57, -0.29],
    [-1.0, 0.57, 0.29], [-0.18, 0.57, 0.29], [0.64, 0.57, 0.29],
    [-0.62, 1.02, 0.0], [0.18, 1.02, 0.0]
  ];
  for (const [x, y, z] of cargo) {
    const bale = cyl(0.28, 0.76, M.straw, 'x', 10);
    bale.position.set(x, y, z);
    bale.rotation.x = 0.04 * Math.sin(x * 8);
    g.add(bale);
    for (const dx of [-0.23, 0.23]) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.012, 5, 12), M.hemp);
      tie.rotation.y = Math.PI / 2;
      tie.position.set(x + dx, y, z);
      g.add(tie);
    }
  }

  // A small boatman in a woven kasa works the pole. He is intentionally a
  // simple painted silhouette so Michi remains the scene's visual focus.
  const boatman = new THREE.Group();
  const legs = box(0.24, 0.32, 0.2, M.goods[1], 0, 0.16, 0);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.42, 8), M.bengara);
  body.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 7), M.plasterWarm);
  head.position.y = 0.79;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.13, 16), M.straw);
  hat.position.y = 0.91;
  const polePivot = new THREE.Group();
  polePivot.position.set(0.04, 0.66, 0.0);
  const pole = cyl(0.027, 3.8, M.bamboo, 'y', 6);
  pole.position.y = -0.25;
  polePivot.add(pole);
  boatman.add(legs, body, head, hat, polePivot);
  boatman.position.set(1.55, 0.28, -0.24);
  g.add(boatman);

  // A faint V wake and bow ring are live meshes so their strength follows
  // boat speed and reverses correctly at either landing.
  const wake = new THREE.Group();
  for (const z of [-0.36, 0.36]) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.12), M.wake);
    streak.rotation.x = -Math.PI / 2;
    streak.rotation.z = z > 0 ? 0.17 : -0.17;
    streak.position.set(-1.2, -0.205, z);
    wake.add(streak);
  }
  const bowRing = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.39, 20, 1, 0.15, Math.PI * 1.7), M.wake);
  bowRing.rotation.x = -Math.PI / 2;
  bowRing.position.set(len / 2 + 0.2, -0.205, 0);
  wake.add(bowRing);
  g.add(wake);

  ctx.dynamic.boat = { group: g, plat: pc.plat, d: pc.d, boatman, pole: polePivot, wake, bowRing, lastS: null, dir: 1 };
  ctx.addDyn(g);
};

B.canopy = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const R = 3.63, half = Math.asin(2.0 / R);
  const yC = pc.y - R;
  // Translucent vault in sections, skipping the skylights.
  const cuts = [pc.s0, ...pc.gaps.flat(), pc.s1];
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i] - sm, b = cuts[i + 1] - sm;
    const pos = [], idx = [];
    const K = 10;
    for (const x of [a, b]) {
      for (let k = 0; k <= K; k++) {
        const ang = -half + (2 * half * k) / K;
        pos.push(x, yC + Math.cos(ang) * R, pc.d + Math.sin(ang) * R);
      }
    }
    for (let k = 0; k < K; k++) idx.push(k, k + 1, K + 1 + k, k + 1, K + 2 + k, K + 1 + k);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, M.glass));         // pulled out with its world transform in buildWorld()
  }
  // Steel ribs and the side beams the vault springs from.
  for (let x = pc.s0 - sm; x <= pc.s1 - sm + 0.01; x += 2.4) {
    for (let k = 0; k < 6; k++) {
      const a0 = -half + (2 * half * k) / 6, a1 = -half + (2 * half * (k + 1)) / 6;
      const z0 = pc.d + Math.sin(a0) * R, y0 = yC + Math.cos(a0) * R;
      const z1 = pc.d + Math.sin(a1) * R, y1 = yC + Math.cos(a1) * R;
      const seg = box(0.06, 0.08, Math.hypot(z1 - z0, y1 - y0) + 0.02, M.steel, x, (y0 + y1) / 2, (z0 + z1) / 2);
      seg.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
      g.add(seg);
    }
  }
  const len = pc.s1 - pc.s0;
  for (const z of [pc.d - 2.0, pc.d + 2.0]) {
    g.add(box(len, 0.14, 0.14, M.steel, 0, yC + Math.cos(half) * R - 0.05, z));
  }
  // Hanging banners in the market's colours.
  for (let x = pc.s0 - sm + 1.2, i = 0; x < pc.s1 - sm - 0.5; x += 3.6, i++) {
    g.add(box(0.7, 1.0, 0.015, M.goods[i % M.goods.length], x, pc.y - 1.35, pc.d + (i % 2 ? 0.9 : -0.9)));
  }
  ctx.add(g);
  for (let s = pc.s0 + 4; s < pc.s1; s += 9) ctx.light(rail, s, pc.y - 1.0, pc.d);
};

B.vent = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  g.add(box(w, pc.y - 4.95, 1.0, ctx.M.steel, 0, (pc.y + 4.95) / 2, pc.d));
  for (let i = 0; i < 3; i++) g.add(box(w + 0.02, 0.03, 1.02, ctx.M.dark, 0, 5.05 + i * 0.12, pc.d));
  ctx.add(g);
};

B.shopfronts = (pc, ctx) => {
  const { M, rail } = ctx;
  // Covered market stalls along the back of the market street.
  for (let s = pc.s0 + 0.2; s < pc.s1 - 1; s += 3.2) {
    if ((s > 187.6 && s < 192.8) || (s > 203.6 && s < 208.8)) continue;
    const g = frameGroup(rail, s + 1.5);
    const k = hash1(s);
    g.add(box(3.0, 3.6, 4.0, k > 0.5 ? M.plaster : M.plasterWarm, 0, 1.8, -2.0));
    g.add(box(3.0, 0.1, 0.9, M.timberMed, 0, 2.3, 0.4));
    g.add(box(2.6, 0.8, 0.7, M.timberMed, 0, 0.4, 0.4));
    for (let i = 0; i < 5; i++) {
      const goods = box(0.4, 0.18, 0.4, M.goods[(i + Math.floor(k * 6)) % M.goods.length], -1.0 + i * 0.5, 0.9, 0.4 + (i % 2) * 0.1);
      g.add(goods);
    }
    g.add(box(1.0, 0.55, 0.02, M.noren[k > 0.66 ? 'crimson' : k > 0.33 ? 'indigo' : 'hemp'], 0.6, 1.95, 0.05));
    ctx.add(g);
  }
};

B.rack = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  for (const t of pc.tiers) {
    const x0 = t.s0 - sm, x1 = t.s1 - sm;
    g.add(box(x1 - x0, 0.06, 0.12, M.timber, (x0 + x1) / 2, t.y - 0.03, pc.d));
    for (const x of [x0 + 0.04, x1 - 0.04]) g.add(box(0.07, t.y, 0.07, M.timber, x, t.y / 2, pc.d));
    for (let x = x0 + 0.18; x < x1 - 0.1; x += 0.3) {
      const l = cyl(0.11, 0.3, M.lanternWhite, 'y', 10);
      l.position.set(x, t.y - 0.28, pc.d + 0.02);
      g.add(l);
    }
  }
  ctx.add(g);
  ctx.light(rail, sm, 1.6, pc.d + 0.3);
};

B.float = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const z = pc.d;

  // Four person-height spoked wheels, with iron tyres, lacquer hubs and
  // through-axles. The open spokes read far more clearly than solid discs as
  // the camera pulls out for the vertical climb.
  for (const x of [-2.1, 2.1]) for (const dz of [-1.25, 1.25]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.13, 7, 24), M.timberMed);
    rim.position.set(x, 0.95, z + dz);
    g.add(rim);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.955, 0.032, 5, 28), M.steel);
    tyre.position.copy(rim.position);
    g.add(tyre);
    const hub = cyl(0.17, 0.34, M.lacquer, 'z', 10);
    hub.position.copy(rim.position);
    g.add(hub);
    for (let i = 0; i < 8; i++) {
      const spoke = box(1.43, 0.055, 0.065, M.timber, x, 0.95, z + dz);
      spoke.rotation.z = (i * Math.PI) / 8;
      g.add(spoke);
    }
  }
  for (const x of [-2.1, 2.1]) {
    const axle = cyl(0.105, 2.85, M.steel, 'z', 10);
    axle.position.set(x, 0.95, z);
    g.add(axle);
  }

  // Massive undercarriage, visible cross-bracing and the textile-draped
  // lower body. Three separate front panels catch the breeze independently.
  g.add(box(5.8, 0.45, 2.2, M.timber, 0, 1.55, z));
  for (const x of [-2.35, 0, 2.35]) g.add(box(0.18, 1.25, 2.32, M.timberMed, x, 2.05, z));
  g.add(box(5.0, 1.48, 2.34, M.dark, 0, 2.55, z));
  for (let i = 0; i < 3; i++) {
    const x = -1.67 + i * 1.67;
    g.add(box(1.52, 1.42, 0.035, M.brocade[i % 2], x, 2.55, z + 1.19));
  }
  for (const sx of [-1, 1]) g.add(box(0.035, 1.4, 2.12, M.brocade[sx > 0 ? 1 : 0], sx * 2.52, 2.55, z));
  g.add(box(5.2, 0.08, 0.08, M.gold, 0, 3.25, z + 1.23));
  g.add(box(5.2, 0.08, 0.08, M.gold, 0, 1.84, z + 1.23));

  // Lacquer deck, carved brackets and a balustrade at cat height.
  g.add(box(6.0, 0.14, 3.0, M.lacquer, 0, pc.deckY - 0.07, z + 0.2));
  for (const zz of [z - 1.3, z + 1.7]) g.add(box(6.0, 0.06, 0.06, M.gold, 0, pc.deckY + 0.6, zz));
  for (const x of [-2.9, -1.4, 0, 1.4, 2.9]) g.add(box(0.07, 0.6, 0.07, M.lacquer, x, pc.deckY + 0.3, z + 1.7));
  for (const x of [-2.45, -1.65, -0.85, 0, 0.85, 1.65, 2.45]) {
    const bracket = box(0.34, 0.16, 0.28, M.gold, x, pc.deckY - 0.28, z + 1.32);
    bracket.rotation.z = (Math.abs(x) % 1.5 - 0.5) * 0.08;
    g.add(bracket);
  }

  // Pillars to the roof, the lower eave tier and the raised roof.
  for (const x of [-2.4, 2.4]) for (const dz of [-1.0, 1.0]) g.add(box(0.14, pc.eaveY - pc.deckY, 0.14, M.lacquer, x, (pc.eaveY + pc.deckY) / 2, z + dz));
  for (const x of [-2.35, -1.15, 0, 1.15, 2.35]) g.add(box(0.09, pc.eaveY - pc.deckY - 0.2, 0.09, M.timberMed, x, (pc.eaveY + pc.deckY) / 2, z + 1.28));
  g.add(box(5.95, 0.16, 3.0, M.timber, 0, pc.eaveY - 0.11, z));
  g.add(box(5.95, 0.08, 0.1, M.gold, 0, pc.eaveY - 0.01, z + 1.53));
  // A real gabled roof turns the final route from eave to ridge in silhouette.
  slope(g, M.roof, { x: -3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, -Math.PI / 2, 0.15);
  slope(g, M.roof, { x: 3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, Math.PI / 2, 0.15);
  ridgeCap(g, M, z - 1.42, z + 1.42, pc.ridgeY - 0.28, 0, true);

  // Lantern frame on the float (komagata), left side.
  for (const y of [pc.deckY + 0.5, pc.deckY + 0.85]) {
    for (let x = -2.6; x < -1.3; x += 0.28) {
      const l = cyl(0.1, 0.28, M.lanternWhite, 'y', 10);
      l.position.set(x, y, z + 1.4);
      g.add(l);
    }
  }
  g.add(box(1.5, 0.06, 0.12, M.timber, -1.95, 4.7 - 0.03, z));

  // The shingi pole stands just behind the climb; a crossbar of sakaki and a
  // small perch bracket stick out from it toward the street. A crescent tops it.
  const zp = z - 0.75, zc = z - 0.2;
  const pole = cyl(0.11, 10.5, M.timber, 'y', 8);
  pole.position.set(0, pc.ridgeY + 5.25, zp);
  g.add(pole);
  const bar = cyl(0.06, 1.3, M.timber, 'x', 6);
  bar.position.set(0, pc.barY - 0.06, zc);
  g.add(bar);
  g.add(box(0.08, 0.08, zc - zp, M.timber, 0, pc.barY - 0.06, (zc + zp) / 2));
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), M.pine);
    leaf.position.set(sx * 0.58, pc.barY + 0.02, zc - 0.1);
    g.add(leaf);
  }
  const disc = cyl(0.34, 0.06, M.lacquer, 'y', 14);
  disc.position.set(0, pc.perchY - 0.03, zc);
  g.add(disc);
  g.add(box(0.08, 0.08, zc - zp, M.timber, 0, pc.perchY - 0.08, (zc + zp) / 2));
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 18, Math.PI * 1.2), M.gold);
  moon.position.set(0, pc.ridgeY + 10.6, zp);
  moon.rotation.z = 0.9;
  g.add(moon);

  // Shimenawa-like lashings and four guy ropes make the mast feel physically
  // tied into the roof instead of floating above it.
  for (let y = pc.ridgeY + 0.25; y < pc.ridgeY + 0.72; y += 0.12) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.024, 5, 12), M.hemp);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.set(0, y, zp);
    g.add(wrap);
  }
  const ropeBetween = (a, b) => {
    const dir = b.clone().sub(a);
    const rope = cyl(0.018, dir.length(), M.hemp, 'y', 5);
    rope.position.copy(a).add(b).multiplyScalar(0.5);
    rope.quaternion.setFromUnitVectors(UP, dir.normalize());
    g.add(rope);
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ropeBetween(
      new THREE.Vector3(sx * 2.55, pc.eaveY - 0.08, z + sz * 1.1),
      new THREE.Vector3(0, pc.ridgeY + 4.1, zp)
    );
  }

  // Live details stay out of the static merge: tassels and three seated
  // hayashi musicians breathe just enough to keep the parked hoko alive.
  const live = frameGroup(rail, sm);
  const tassels = [];
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(-2.55 + i * 1.02, pc.eaveY - 0.03, z + 1.52);
    const cord = cyl(0.014, 0.42, M.hemp, 'y', 5);
    cord.position.y = -0.21;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), M.gold);
    knot.position.y = -0.43;
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.34, 8), i % 2 ? M.goods[3] : M.goods[1]);
    tassel.position.y = -0.62;
    pivot.add(cord, knot, tassel);
    pivot.userData.phase = i * 0.83;
    live.add(pivot);
    tassels.push(pivot);
  }

  const musicians = [];
  for (let i = 0; i < 3; i++) {
    const person = new THREE.Group();
    person.position.set(-1.25 + i * 1.25, pc.deckY + 0.04, z - 0.34 + (i % 2) * 0.16);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.43, 8), M.goods[[5, 3, 0][i]]);
    body.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 9, 7), M.plasterWarm);
    head.position.y = 0.72;
    const hachimaki = box(0.23, 0.045, 0.16, M.plaster, 0, 0.75, 0);
    const knees = box(0.46, 0.15, 0.24, M.dark, 0, 0.12, 0);
    person.add(body, head, hachimaki, knees);
    if (i === 1) {
      const drum = cyl(0.18, 0.26, M.timberMed, 'z', 10);
      drum.position.set(0.23, 0.38, 0.12);
      person.add(drum);
    } else {
      const flute = cyl(0.022, 0.58, M.bamboo, 'x', 6);
      flute.position.set(0, 0.55, 0.16);
      flute.rotation.z = i ? -0.08 : 0.08;
      person.add(flute);
    }
    person.userData.phase = i * 1.9;
    person.userData.baseY = person.position.y;
    live.add(person);
    musicians.push(person);
  }

  ctx.add(g);
  ctx.addDyn(live);
  ctx.dynamic.float = { group: live, tassels, musicians };
  ctx.light(rail, sm, pc.deckY + 0.7, z + 1.4);
  ctx.light(rail, sm, 2.4, z + 1.6);
};

B.gate = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm;
  const zF = pc.dFront, zB = zF - pc.depth, zm = (zF + zB) / 2;
  for (const x of [x0 + 0.3, x0 + 2.2, x1 - 2.2, x1 - 0.3]) for (const z of [zF - 0.3, zB + 0.3]) {
    g.add(box(0.36, pc.foot, 0.36, M.timber, x, pc.foot / 2, z));
  }
  g.add(box(x1 - x0, 0.4, pc.depth, M.timber, 0, pc.foot - 0.2, zm));
  g.add(box(x1 - x0 - 0.4, 0.6, 0.2, M.timber, 0, pc.foot - 1.0, zF - 0.3));
  g.add(box(2.4, 3.2, 0.1, M.timberMed, 0, 1.6, zm));
  tsumaRoof(g, M, x0, x1, zF, zB, pc.foot, pc.ridge, 0.6);
  ctx.add(g);
};

B.tsuiji = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(w, 1.45, 0.7, M.sujibei, 0, 0.72, pc.d));
  slope(g, M.roof, { x: 0, y: 1.42, z: pc.d + 0.6 }, 0.16, 0.5, w + 0.2, 0, 0.08);
  slope(g, M.roof, { x: 0, y: 1.42, z: pc.d - 0.6 }, 0.16, 0.5, w + 0.2, Math.PI, 0.08);
  ctx.add(g);
};

/* ------------------------------------------------------------------ */
/*  Shōki, treats, the distant city                                     */
/* ------------------------------------------------------------------ */

/** A small clay Shōki: robed body, big head, tall hat, a sword held up. */
export function makeShoki(M) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.2, 8), M.clay);
  body.position.y = 0.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), M.clay);
  head.position.y = 0.25;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.09, 8), M.clay);
  hat.position.y = 0.33;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.03), M.clay);
  brim.position.y = 0.36;
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 0.012), M.steel);
  sword.position.set(0.09, 0.26, 0.02);
  sword.rotation.z = -0.4;
  g.add(body, head, hat, brim, sword);
  return g;
}

function makeTreat(M) {
  const g = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.03, 14), M.plaster);
  dish.position.y = 0.015;
  const fish = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.goods[1]);
  fish.scale.set(1.8, 0.5, 0.6);
  fish.position.y = 0.05;
  g.add(dish, fish);
  return g;
}

/** A sea of low roofs around the route, out to the hills (instanced). */
function buildDistantCity(level, M) {
  const rail = level.rail;
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  houseGeo.translate(0, 0.5, 0);
  const roofGeo = new THREE.ConeGeometry(0.75, 0.5, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.translate(0, 0.25, 0);
  const pts = [];
  // Distance from the rail polyline (cheap: sample the rail every 2 m).
  const samples = [];
  for (let s = 0; s <= level.length; s += 2) samples.push(rail.pointAt(s));
  const nearRail = (x, z, r) => samples.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r);
  for (let x = -230; x <= 200; x += 7) {
    for (let z = -260; z <= 150; z += 7) {
      const h = hash1(x * 0.37 + z * 1.71);
      const jx = x + (h - 0.5) * 3, jz = z + (hash1(x + z * 3.3) - 0.5) * 3;
      if (nearRail(jx, jz, 22)) continue;
      pts.push([jx, jz, h]);
    }
  }
  // Low dark walls under big roofs: from the run it should read as a sea of
  // kawara, not a field of white boxes.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.95 });
  const walls = new THREE.InstancedMesh(houseGeo, wallMat, pts.length);
  const roofs = new THREE.InstancedMesh(roofGeo, M.roof, pts.length);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  pts.forEach(([x, z, h], i) => {
    const w = 4.5 + h * 3, d = 5 + hash1(h * 91) * 4, hh = 1.7 + (h > 0.86 ? 1.5 : 0) + hash1(h * 7) * 0.7;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = 0;
    dummy.scale.set(w, hh, d);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, hh, z);
    dummy.scale.set(w * 1.05, 1.3 + h * 0.6, d * 1.05);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    const k = hash1(h * 53.1);
    roofs.setColorAt(i, tint.setRGB(0.62 + k * 0.25, 0.64 + k * 0.25, 0.68 + k * 0.25));
    walls.setColorAt(i, tint.setRGB(0.85 + k * 0.3, 0.8 + k * 0.3, 0.74 + k * 0.3));
  });
  walls.receiveShadow = true;
  roofs.receiveShadow = true;
  const g = new THREE.Group();
  g.add(walls, roofs);
  return g;
}

/** A five-storey pagoda silhouette (for the skyline). */
function buildPagoda(M, x, z, scale = 1) {
  const g = new THREE.Group();
  let y = 0;
  for (let i = 0; i < 5; i++) {
    const w = (6.2 - i * 0.7) * scale;
    g.add(box(w * 0.62, 3.2 * scale, w * 0.62, M.timber, 0, y + 1.6 * scale, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.1 * scale, 4), M.roof);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = y + 3.4 * scale;
    g.add(roof);
    y += 3.6 * scale;
  }
  const spire = cyl(0.25 * scale, 9 * scale, M.bronze, 'y', 6);
  spire.position.y = y + 4.2 * scale;
  g.add(spire);
  g.position.set(x, 0, z);
  return g;
}

/* ------------------------------------------------------------------ */
/*  Assembly                                                            */
/* ------------------------------------------------------------------ */

function mergeByMaterial(group, castShadow = true) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    let geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((geo.attributes.position.count) * 2), 2));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
    buckets.get(key).geos.push(geo);
  });
  const out = new THREE.Group();
  for (const { mat, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = castShadow && !mat.transparent;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}

export function buildWorld(level, opts = {}) {
  const M = makeMaterials();
  const rail = level.rail;
  const motionScale = opts.reduceMotion ? 0.22 : 1;
  const staticGroup = new THREE.Group();
  const glassGroup = new THREE.Group();
  const root = new THREE.Group();
  const lights = [];
  const dynamic = { boat: null, float: null, shoki: [], treats: [] };
  const ctx = {
    M, rail, dynamic,
    add: (o) => staticGroup.add(o),
    addGlass: (m) => { m.userData.glass = true; glassGroup.add(m); },
    addDyn: (o) => root.add(o),
    light: (r, s, y, d) => { const p = r.place(s, d); lights.push(new THREE.Vector3(p.x, y, p.z)); }
  };
  for (const pc of level.pieces) {
    const fn = B[pc.type];
    if (fn) fn(pc, ctx);
  }
  // Glass meshes were added inside frame groups: pull them out with their
  // world transforms so they merge into the transparent bucket.
  staticGroup.updateMatrixWorld(true);
  const glassFromFrames = [];
  staticGroup.traverse((o) => { if (o.isMesh && o.material === M.glass) glassFromFrames.push(o); });
  for (const m of glassFromFrames) {
    m.updateMatrixWorld(true);
    const c = new THREE.Mesh(m.geometry.clone().applyMatrix4(m.matrixWorld), m.material);
    glassGroup.add(c);
    m.parent.remove(m);
  }
  root.add(mergeByMaterial(staticGroup));
  root.add(mergeByMaterial(glassGroup, false));

  // Ground under everything, the distant roofscape and a pagoda on each side.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.7;
  ground.receiveShadow = true;
  root.add(ground);
  root.add(buildDistantCity(level, M));
  root.add(buildPagoda(M, 150, -78, 1.35));     // east, behind the float streets
  root.add(buildPagoda(M, -40, 150, 1.6));      // south, over the market roofs
  root.add(buildPagoda(M, -170, -30, 1.1));     // west

  // Shōki and treats stay live so they can be greeted.
  for (const k of level.pickups) {
    const p = rail.place(k.s, k.d);
    const t = rail.tangentAt(k.s);
    const obj = k.kind === 'shoki' ? makeShoki(M) : makeTreat(M);
    obj.position.set(p.x, k.y, p.z);
    obj.rotation.y = Math.atan2(-t.z, t.x) + (k.face || 0);   // face the camera, then turn away
    obj.scale.setScalar(k.kind === 'shoki' ? 1.6 : 1.4);
    obj.userData.pickup = k;
    root.add(obj);
    (k.kind === 'shoki' ? dynamic.shoki : dynamic.treats).push(obj);
  }

  return {
    root, dynamic, lights, M,
    /** Advance moving pieces; night ∈ [0,1] kindles lanterns and windows. */
    update(t, night, platOffset, platforms) {
      if (dynamic.boat) {
        const boat = dynamic.boat;
        const p = platforms[boat.plat];
        const off = platOffset(p, t);
        const s = (p.s0 + p.s1) / 2 + off;
        const pos = rail.place(s, boat.d);
        const tg = rail.tangentAt(s);
        const dt = boat.lastT == null ? 1 / 60 : Math.max(1 / 240, t - boat.lastT);
        const velocity = boat.lastS == null ? 0 : (s - boat.lastS) / dt;
        if (Math.abs(velocity) > 0.035) boat.dir = Math.sign(velocity);
        const pace = Math.min(1, Math.abs(velocity) / 3.2);
        boat.group.position.set(pos.x, 0.005 + Math.sin(t * 1.35) * (0.012 + pace * 0.012), pos.z);
        boat.group.rotation.set(Math.sin(t * 0.9) * 0.012 * pace, Math.atan2(-tg.z, tg.x), Math.sin(t * 1.17) * 0.008 * pace);
        boat.wake.scale.x = boat.dir;
        boat.wake.visible = pace > 0.035;
        M.wake.opacity = 0.08 + pace * 0.34;
        boat.boatman.rotation.y = boat.dir < 0 ? Math.PI : 0;
        boat.pole.rotation.z = -0.48 + boat.dir * 0.14 + Math.sin(t * 1.5) * 0.12 * pace;
        boat.boatman.rotation.z = Math.sin(t * 1.5 + 0.7) * 0.035 * pace;
        boat.lastS = s;
        boat.lastT = t;
      }
      if (dynamic.float) {
        const hoko = dynamic.float;
        for (const tassel of hoko.tassels) {
          const u = t * motionScale + tassel.userData.phase;
          tassel.rotation.z = Math.sin(u * 1.35) * 0.055 * motionScale;
          tassel.rotation.x = Math.cos(u * 0.93) * 0.035 * motionScale;
        }
        for (const person of hoko.musicians) {
          const u = t * motionScale + person.userData.phase;
          person.rotation.z = Math.sin(u * 1.7) * 0.018 * motionScale;
          person.position.y = person.userData.baseY + Math.sin(u * 1.7) * 0.008 * motionScale;
        }
      }
      for (const water of [M.water, M.kamoWater]) {
        water.uniforms.uTime.value = t;
        water.uniforms.uNight.value = night;
      }
      for (const mat of [...M.cloth, ...Object.values(M.noren), ...M.brocade]) {
        if (mat.userData.windShader) mat.userData.windShader.uniforms.uRoofTime.value = t;
      }
      M.lanternRed.emissiveIntensity = 0.15 + night * 1.6;
      M.lanternWhite.emissiveIntensity = 0.15 + night * 1.5;
      M.shoji.emissiveIntensity = night * 0.9;
      M.koshi.emissiveIntensity = night * 0.5;
      M.blossom.emissiveIntensity = night * 0.25;
      for (const s of dynamic.shoki) if (s.visible) s.children[0].rotation.y = Math.sin(t * 0.7 + s.position.x) * 0.06;
    }
  };
}
