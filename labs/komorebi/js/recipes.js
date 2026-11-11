// Lab 22 tiles. Tile code = build().
import * as THREE from 'three';
import { vegetationKit, ensureVegetation } from '../../shared/original.js';
import { loadFoliageModule } from '../../shared/game.js';
import { V3, TAU, rng, Bag, instances } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { HASH, NOISE } from '../../shared/glsl.js';
import { makeCoins } from './kit.js';

let ve = null;
export const loadDeps = async () => { ve = (await ensureVegetation()).prototype; };

export const SOURCES = {
  whyy: ['WHYY · See the eclipse using nature’s pinhole camera', 'https://whyy.org/articles/see-the-solar-eclipse-using-natures-pinhole-camera-tree-leaves', 'excerpt'],
  natur: ['The Nature Institute · Shadows and the sun', 'https://natureinstitute.org/in-context-48/henrike-holdrege/shadows-and-the-sun', 'excerpt'],
  orl: ['ClickOrlando · Crescent shapes during the partial eclipse', 'https://clickorlando.com/weather/2023/10/20/crescent-shapes-appeared-during-the-partial-solar-eclipse-what-are-they', 'excerpt'],
  sundial: ['three.js forum · Sundial virtual sun shadows (WebGPU)', 'https://discourse.threejs.org/t/sundial-paged-virtual-sun-shadows-for-three-js-webgpurenderer-mit-on-npm/94912', 'excerpt'],
  shadowF: ['three.js forum · custom colour in the shadow term', 'https://discourse.threejs.org/t/custom-shadow-shader-rainbow-shadows/56766', 'excerpt'],
  notes: ['Komorebi research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'light', title: 'Coins of <em>light</em>', sub: 'The game’s soft blobs, then every other way of faking this that came up, ending with the one that is actually true.' },
  { key: 'petal', title: 'What settles <em>in them</em>', sub: 'Petals are the other half of this entry, and the game currently turns them off.' }
];

const groundTile = (k, frag, extra = {}) => {
  const T = k.THREE, u = { uTime: { value: 0 }, ...extra };
  const m = new T.ShaderMaterial({ uniforms: u, vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }', fragmentShader: `precision highp float; varying vec3 vP; uniform float uTime; ${HASH}${NOISE} void main(){ vec2 q=vP.xz; vec3 c=vec3(.13,.17,.1); ${frag} gl_FragColor=vec4(c,1.); #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }`.replace('#include <tonemapping_fragment>\n #include <colorspace_fragment>', '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n') });
  const g = new T.Group(); const p = new T.Mesh(new T.BoxGeometry(2.6, 0.14, 2.6), [k.M.plain(0x3a3a2e), k.M.plain(0x3a3a2e), m, k.M.plain(0x3a3a2e), k.M.plain(0x3a3a2e), k.M.plain(0x3a3a2e)]); p.position.y = -0.07; g.add(p);
  return { group: g, update: (t) => { u.uTime.value = t; } };
};

export const SPECIMENS = [
  { id: 'game-dapple', family: 'light', original: true, name: 'The game’s dapples', jp: '今の木漏れ日', tag: 'buildDappledLight(), as it stands', plinth: 'moss', hour: 13, game: () => ve.buildDappledLight,
    blurb: 'A small canvas of random soft blobs on an additive sprite, one patch per sakura tree. Soft and pleasant, and it does not move.',
    how: ['A 64 px canvas of radial gradients, one plane per tree.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = vegetationKit(1); kit.buildDappledLight(); const g = kit.scene; g.children[0].material.opacity = 1; g.children[0].position.set(0, 0.02, 0); return g; } },
  { id: 'gobo', family: 'light', name: 'A scrolling gobo', jp: 'ゴボ', tag: 'A texture slid across the ground', plinth: 'none', hour: 13, spin: 0.2, animatedShadow: false,
    blurb: 'The simplest moving version: a painted light-map slid along in world space. A stage lighting trick.',
    how: ['Two scrolled noise layers, multiplied together and thresholded.'], use: 'Cheap: anywhere you just want movement.', sources: ['sundial'],
    build(k) { return groundTile(k, `float a = fbm2(q*1.6+vec2(uTime*.04,0.),4), b = fbm2(q*2.3-vec2(0.,uTime*.05)+4.,4); c += vec3(1.,.9,.65)*smoothstep(.56,.72,a*.6+b*.4)*1.2;`); } },
  { id: 'voronoi', family: 'light', name: 'Voronoi cells', jp: 'ボロノイ', tag: 'Procedural spots', plinth: 'none', hour: 13, spin: 0.2, animatedShadow: false,
    blurb: 'Each cell of a voronoi pattern gets one soft spot, drifting on its own. Spots look round, and everything is the same size.',
    how: ['Distance to the nearest feature point, smoothstepped.'], use: 'A stylised canopy.', sources: ['notes'],
    build(k) { return groundTile(k, `vec3 v = voronoi2(q*3.5 + vec2(sin(uTime*.2)*.3, cos(uTime*.17)*.3)); c += vec3(1.,.92,.68)*smoothstep(.26,.1,v.x)*1.2;`); } },
  { id: 'shadowmap', family: 'light', name: 'Real shadow map', jp: '影', tag: 'A leaf card casting a real shadow', plinth: 'moss', hour: 13, animatedShadow: true,
    blurb: 'Alpha-tested leaf cards cast in the real shadow pass, so they work on anything. Shapes come from the leaves, not the sun.',
    how: ['alphaTest on the cards and a customDepthMaterial for the shadow.', 'Leaf-shaped dapples, not sun-shaped. And expensive at scale.'], use: 'Very close, on the cat.', sources: ['sundial', 'shadowF'],
    build(k) { const T = k.THREE, g = new T.Group(); const tex = (() => { const [c, x] = k.canvas2d(128, 128); x.clearRect(0, 0, 128, 128); x.fillStyle = '#fff'; const r = k.rand; for (let i = 0; i < 30; i++) { x.beginPath(); x.ellipse(r() * 128, r() * 128, 6 + r() * 16, 3 + r() * 7, r() * 3, 0, k.TAU); x.fill(); } return k.canvasTexture(c, { srgb: false }); })(); const mat = new T.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: T.DoubleSide, color: 0x5a7a44 }); const dep = new T.MeshDepthMaterial({ map: tex, alphaTest: 0.4, depthPacking: T.RGBADepthPacking }); const cards = []; for (let i = 0; i < 16; i++) { const m = new T.Mesh(new T.PlaneGeometry(0.5, 0.5), mat); m.customDepthMaterial = dep; m.position.set((k.rand() - 0.5) * 1.4, 1.6 + k.rand() * 0.5, (k.rand() - 0.5) * 1.4); m.rotation.set(1.3, k.rand() * 3, 0); g.add(m); cards.push(m); } return { group: g, update: (t) => { cards.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.8 + i) * 0.12; }); } }; } },
  { id: 'coins', family: 'light', name: 'Images of the sun', jp: '太陽の像', tag: 'Every coin is the sun, through a pinhole', plinth: 'none', hour: 13, spin: 0.2, animatedShadow: false,
    blurb: 'The true version. Each gap projects an image of the sun: a disc whose size depends on the height of the gap, stretched on the ground by the sun’s angle.',
    how: ['1,800 instanced quads, one per gap. Diameter = height × tan(0.53°).', 'Shifted along the sun’s direction by height, ellipse by 1/sin(elevation).'], use: 'The valley. Fold into the ground pass.', sources: ['whyy', 'natur'], also: [makeCoins],
    build(k) { const c = makeCoins({ count: 90, spread: 0.95, heightMin: 3, heightMax: 6 }); c.U.uSunXZ.value.set(0.03, 0.02); c.U.uSinEl.value = 0.75; c.U.uCol.value.set(1, 0.92, 0.72); c.U.uGain.value = 1.1; c.U.uTan.value = Math.tan(0.53 * Math.PI / 180) * 2; const g = new k.THREE.Group(), base = new k.THREE.Mesh(new k.THREE.BoxGeometry(2.6, 0.14, 2.6), k.M.plain(0x3f4a2e)); base.position.y = -0.07; g.add(base, c.mesh); return { group: g, update: (t) => { c.U.uTime.value = t; } }; } },
  { id: 'eclipse', family: 'light', name: 'During an eclipse', jp: '日食', tag: 'The coins turn into crescents', plinth: 'none', hour: 13, spin: 0.2, animatedShadow: false,
    blurb: 'Same coins, with a moon sliding across the sun. Every coin on the ground turns into the same crescent, upside-down, because that’s what they were all along.',
    how: ['The image is a disc minus a second, offset disc.', 'A pinhole inverts the picture, so the crescent faces the opposite way.'], use: 'A once-a-year surprise.', sources: ['whyy', 'orl'], also: [makeCoins],
    build(k) { const c = makeCoins({ count: 90, spread: 0.95, heightMin: 3, heightMax: 6 }); c.U.uSunXZ.value.set(0.03, 0.02); c.U.uSinEl.value = 0.75; c.U.uCol.value.set(1, 0.92, 0.72); c.U.uGain.value = 1.1; c.U.uTan.value = Math.tan(0.53 * Math.PI / 180) * 2; c.U.uSharp.value = 0.9; const g = new k.THREE.Group(), base = new k.THREE.Mesh(new k.THREE.BoxGeometry(2.6, 0.14, 2.6), k.M.plain(0x3f4a2e)); base.position.y = -0.07; g.add(base, c.mesh); return { group: g, update: (t) => { c.U.uTime.value = t; c.U.uEclipse.value = 0.72 + Math.sin(t * 0.5) * 0.18; } }; } },

  { id: 'game-drift', family: 'petal', original: true, name: 'Petal drifts, today', jp: '今の花びら溜り', tag: 'Switched off in the game', plinth: 'moss', hour: 13, game: () => ve.buildPetalDrifts,
    blurb: 'buildPetalDrifts() returns immediately: “Violet/pink flat drift circles removed — falling petals handle it.” So the tile is honestly bare.',
    how: ['The code is still there behind an early return.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); g.add(new k.THREE.Mesh(new k.THREE.BoxGeometry(0.4, 0.02, 0.4), k.M.plain(0x6a7a50))); return g; } },
  { id: 'drift', family: 'petal', name: 'Petals in the light', jp: '花筏', tag: 'Collected, and caught by the coins', plinth: 'moss', hour: 13, animatedShadow: false,
    blurb: 'Instanced petals piled at the foot of a tree, brighter where a coin falls on them.',
    how: ['Instanced circles with a slight tilt; additive coins drawn over the top.'], use: 'Under every cherry tree.', sources: ['notes'],
    build(k) { const r = k.rand, list = []; for (let i = 0; i < 500; i++) { const a = r() * k.TAU, d = Math.pow(r(), 0.5) * 1.1; list.push({ x: Math.cos(a) * d, y: 0.012 + r() * 0.03, z: Math.sin(a) * d, rx: -Math.PI / 2 + (r() - 0.5) * 0.25, rz: r() * 6, s: 0.9 + r() * 0.7, color: r() < 0.3 ? 0xf6cfda : 0xf0b8c8 }); } return k.instances(new k.THREE.CircleGeometry(0.04, 6), k.M.plain(0xffffff, { rough: 0.7, side: k.THREE.DoubleSide, brush: 0 }), list); } }
];

export const STEPS = [
  { title: 'A gap is a pinhole', body: '<p>Light through a small hole forms a picture of its source. The gaps in a canopy are small holes.</p>', phase: 0 },
  { title: 'So the coin is the sun', body: '<p>Its diameter is the height of the gap times the sun’s angular size. A few metres up, that’s a few centimetres.</p>', code: 'R = height * Math.tan(0.53°)', phase: 1 },
  { title: 'Stretch it', body: '<p>A low sun lays the picture out long across the ground, like a shadow in reverse.</p>', code: 'stretch = 1 / sin(elevation)', phase: 2 },
  { title: 'Let the leaves move', body: '<p>Each gap sways a little, and they flicker as leaves pass in front.</p>', phase: 3 },
  { title: 'Slide the moon across', body: '<p>Now the picture is a crescent, and so is every single coin.</p>', code: 'disc - offsetDisc', phase: 4 }
];

export const ASSEMBLY = {
  radius: 2, target: [0, 0.1, 0], shadow: 4,
  build(k) {
    const base = new k.THREE.Mesh(new k.THREE.BoxGeometry(3.4, 0.16, 3.4), k.M.plain(0x3f4a2e)); base.position.y = -0.08;
    const c = makeCoins({ count: 500, spread: 1.6, heightMin: 3, heightMax: 6 }); c.U.uSunXZ.value.set(0.25, 0.1); c.U.uSinEl.value = 1; c.U.uCol.value.set(1, 0.92, 0.72); c.U.uGain.value = 1.4; c.U.uTan.value = Math.tan(0.53 * Math.PI / 180) * 6;
    const g = new k.THREE.Group(); g.add(base, c.mesh);
    let ph = 0;
    return { group: g, setPhase(p) { ph = p; c.U.uSinEl.value = p >= 2 ? 0.45 : 1; c.U.uWind.value = p >= 3 ? 0.6 : 0; c.U.uEclipse.value = p >= 4 ? 0.8 : 0; c.U.uSharp.value = p >= 1 ? 0.6 : 0.3; }, update(t) { c.U.uTime.value = t; if (ph >= 4) c.U.uEclipse.value = 0.74 + Math.sin(t * 0.6) * 0.16; } };
  }
};
