// pieces/paint.js — the Roof Road's painted canvases and its material set M.
//
// Every surface uses the game's painted procedural sets (src/textures.js):
// kawara, plaster, timber, namako, shoji, cobbles; the façade details the
// 256px sets don't cover are small canvases here. makeMaterials() returns M,
// shared by every piece builder. Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import {
  kawaraTextures, plasterTextures, woodTextures, namakoTextures, shojiTextures,
  cobbleTextures, stoneTextures, strawTextures, metalTextures, lacquerTextures,
  dirtTextures, texturedMaterial
} from '../../../src/textures.js?v=20261113a';
import { downtownMaterials } from '../downtown.js';
import { streetPaint } from '../street-paint.js';
import { TAU } from './common.js';

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
    // ShaderMaterial does not add the stock fog uniforms for us. Merge a
    // private copy so WebGLRenderer can refresh fogColor/near/far safely in
    // every browser, including Safari's eager first-frame path.
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uNight: { value: 0 },
        uFlowAxis: { value: flowAlongDepth ? 1 : 0 },
        uDeep: { value: new THREE.Color(0x315f67) },
        uShallow: { value: new THREE.Color(0x72a29a) },
        uSun: { value: new THREE.Color(0xffe0a8) }
      }
    ]),
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
        float bed = sin(flowUv.x * 7.3 + sin(flowUv.y * 12.0)) * sin(flowUv.y * 15.1 + flowUv.x * 3.1);
        float rippleA=sin(flowUv.x*9.0+sin(flowUv.y*17.0-uTime*.7)*1.3-uTime*.8);
        float rippleB=cos(flowUv.x*13.0-flowUv.y*12.0+uTime*.65);
        float caustic=pow(max(0.0,1.0-abs(rippleA+rippleB)*.72),12.0);
        float silt=.5+.5*sin(flowUv.x*1.8+sin(flowUv.y*3.1));
        vec3 N = normalize(vec3(cos(flowUv.x * 37.0 - uTime * 2.4) * .05, 1.0, cos(flowUv.y * 22.0 + uTime) * .08));
        vec3 V = normalize(cameraPosition - vWorld);
        float fresnel = .03 + .65 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
        vec3 col = mix(uDeep, uShallow, 0.32 + depthBand * 0.28);
        col += bed * vec3(.035, .045, .025);
        col=mix(col,vec3(.29,.37,.25),silt*.13);
        col+=vec3(.24,.34,.25)*caustic*.16*(1.0-uNight);
        vec3 reflectedSky = mix(vec3(.55, .70, .74), vec3(.08, .13, .24), uNight);
        float reflectedPosts = pow(max(0.0, sin(flowUv.x * 4.5 + sin(flowUv.y * 28.0 - uTime) * .16)), 16.0);
        col = mix(col, reflectedSky * (1.0 - reflectedPosts * .42), fresnel);
        // Broad, broken brush glints rather than glitter on every pixel.
        float brush=step(.24,fract(sin(floor(flowUv.x*18.0)*17.1+floor(flowUv.y*9.0)*31.7)*4375.5));
        col += uSun * glint * brush * (0.12 + 0.18 * (1.0 - uNight));
        col += vec3(.9, .4, .13) * reflectedPosts * uNight * .12;
        col = mix(col, vec3(0.085, 0.12, 0.22), uNight * 0.48);
        float ripple = band(fract(flowUv.x * 0.23 - uTime * 0.08) - 0.5, 0.035) * 0.08;
        col += vec3(0.72, 0.86, 0.84) * ripple;
        gl_FragColor = vec4(col, 0.88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
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
  M.blossomPale = new THREE.MeshStandardMaterial({ color: 0xf8e1e2, roughness: 0.92, flatShading: true, emissive: 0x32171c, emissiveIntensity: 0.0 });
  M.blossomRose = new THREE.MeshStandardMaterial({ color: 0xe9a9b8, roughness: 0.9, flatShading: true, emissive: 0x421923, emissiveIntensity: 0.0 });
  M.bark = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.95 });
  M.inuyarai = panel(new THREE.MeshStandardMaterial({ map: bambooTex(), roughness: 0.8, side: THREE.DoubleSide }));
  M.bamboo = new THREE.MeshStandardMaterial({ color: 0x8f9a52, roughness: 0.6 });
  M.lanternRed = panel(new THREE.MeshStandardMaterial({ map: lanternTex('#c8402a', '#2a1a12'), emissive: 0xff5a2a, emissiveIntensity: 0.15, roughness: 0.8 }));
  M.lanternRed.emissiveMap = M.lanternRed.map;
  M.lanternWhite = panel(new THREE.MeshStandardMaterial({ map: lanternTex('#f4e6c8', '#2a1a12'), emissive: 0xffc070, emissiveIntensity: 0.15, roughness: 0.8 }));
  M.lanternWhite.emissiveMap = M.lanternWhite.map;
  M.lanternWhite.userData.paper = M.lanternRed.userData.paper = true;
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
  downtownMaterials(M, canvasTex);
  streetPaint(M, canvasTex);
  return M;
}

export { canvasTex, panel, windMaterial, flowWaterMaterial, makeMaterials };
