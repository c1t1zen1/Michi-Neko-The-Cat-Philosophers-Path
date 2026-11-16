// roof-atmosphere: the ambient layers of rooftops/js/atmosphere.js (cherry petals, chimney and stall smoke,
// night fireflies, birds, camera motes). RooftopAtmosphere derives the positions from the level and passes them in
// `layout` (plain data); the landing bursts (ImpactFX) stay classic. The same objects and uniforms the class
// drives (petals/smoke/fireflies .material.uniforms uTime, uNight, uOpacity; the birds' scale and rotation; the
// motes' position and opacity). The look: petals spin, fireflies get a soft bokeh halo, smoke swells as it
// rises, birds have swept wings.
import { defineAsset } from '../contract.js?v=20261116a';
import { canvas, canvasTex, disposeTree } from './fx.js?v=20261116a';

const TAU = Math.PI * 2;
const hash1 = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };   // (level.js hash1 is the classic's; the birds' values below are cosmetic)

function sprite(draw, size = 64) { const [c, g] = canvas(size, size); draw(g, size); return canvasTex(c); }

const petalTexture = () => sprite((g, s) => {
  g.translate(s / 2, s / 2); g.rotate(-0.55);
  const grad = g.createRadialGradient(-6, -5, 1, 0, 0, 25);
  grad.addColorStop(0, 'rgba(255,250,248,1)'); grad.addColorStop(0.55, 'rgba(246,183,202,.96)'); grad.addColorStop(1, 'rgba(211,115,151,0)');
  g.fillStyle = grad; g.beginPath(); g.ellipse(0, 0, 22, 11, 0, 0, TAU); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(21, 0); g.lineTo(27, -4); g.lineTo(27, 4); g.fill();      // the notch
});
const smokeTexture = () => sprite((g, s) => {
  for (const [x, y, r, a] of [[0.46, 0.44, 0.48, 0.72], [0.38, 0.55, 0.3, 0.4], [0.6, 0.4, 0.28, 0.4]]) {
    const grad = g.createRadialGradient(s * x, s * y, 1, s * x, s * y, s * r);
    grad.addColorStop(0, `rgba(236,229,214,${a})`); grad.addColorStop(0.38, `rgba(189,184,176,${a * 0.47})`); grad.addColorStop(1, 'rgba(120,125,130,0)');
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
  }
});
const glowTexture = () => sprite((g, s) => {
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,250,185,1)'); grad.addColorStop(0.2, 'rgba(255,205,82,.9)'); grad.addColorStop(0.5, 'rgba(255,170,40,.18)'); grad.addColorStop(1, 'rgba(255,160,20,0)');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
});

function pointSystem(T, { positions, seeds, texture, color, size, vertexMotion, fragmentAlpha, rotate = false, blending = T.NormalBlending }) {
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new T.Float32BufferAttribute(seeds, 1));
  const mat = new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uMap: { value: texture }, uTime: { value: 0 }, uNight: { value: 0 }, uOpacity: { value: 1 }, uSize: { value: size }, uColor: { value: new T.Color(color) } }]),
    transparent: true, depthWrite: false, blending, fog: true,
    vertexShader: `
      #include <fog_pars_vertex>
      uniform float uTime; uniform float uNight; uniform float uSize; attribute float aSeed; varying float vAlpha; varying float vSeed;
      void main() {
        vec3 p = position;
        float cycle = fract(aSeed + uTime * (0.025 + fract(aSeed * 19.7) * 0.035));
        ${vertexMotion}
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(uSize * (10.0 / max(4.0, -mvPosition.z)), 1.25, uSize * 1.7);
        vSeed = aSeed;
        ${fragmentAlpha ? 'vAlpha = 1.0;' : 'vAlpha = smoothstep(0.0, .12, cycle) * (1.0 - smoothstep(.72, 1.0, cycle));'}
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform float uNight; varying float vAlpha; varying float vSeed;
      #include <fog_pars_fragment>
      void main() {
        vec2 uv = gl_PointCoord;
        ${rotate ? 'float ang = vSeed * 31.0 + uTime * (0.8 + vSeed * 1.6); vec2 q = uv - 0.5; uv = vec2(q.x * cos(ang) - q.y * sin(ang), q.x * sin(ang) + q.y * cos(ang)) + 0.5;' : ''}
        vec4 tex = texture2D(uMap, uv);
        float alpha = tex.a * vAlpha * uOpacity;
        ${fragmentAlpha || ''}
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(tex.rgb * uColor, alpha);
        #include <fog_fragment>
      }`
  });
  const points = new T.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

const TIER = { hero: { f: 1, birds: 8 }, mid: { f: 0.7, birds: 4 }, far: { f: 0.4, birds: 2 } };

function buildAtmosphere(ctx, layout, p) {
  const T = ctx.THREE, tier = TIER[ctx.tier] || TIER.mid, group = new T.Group(), parts = {};
  const take = (d) => { const n = Math.max(1, Math.floor(d.seeds.length * tier.f)); return { positions: d.positions.slice(0, n * 3), seeds: d.seeds.slice(0, n) }; };
  const lp = !!layout.lowPower;
  const petals = pointSystem(T, {
    ...take(layout.petals), texture: petalTexture(), color: 0xffe3eb, size: lp ? 11 : 13, rotate: true,
    vertexMotion: `
      p.y += 1.8 - cycle * 4.4;
      p.x += sin(uTime * .75 + aSeed * 31.0 + cycle * 8.0) * (0.35 + cycle * .55);
      p.z += cos(uTime * .52 + aSeed * 17.0 + cycle * 9.0) * .28;`
  });
  petals.renderOrder = 3;
  const smoke = pointSystem(T, {
    ...take(layout.smoke), texture: smokeTexture(), color: 0xd8d3ca, size: lp ? 40 : 52,
    vertexMotion: `
      p.y += cycle * (3.4 + fract(aSeed * 12.4) * 2.4);
      p.x += sin(aSeed * 29.0 + cycle * 5.5 + uTime * .18) * cycle * 1.15;
      p.z += cos(aSeed * 13.0 + cycle * 3.2) * cycle * .5;`
  });
  smoke.material.uniforms.uOpacity.value = 0.55;
  const fireflies = pointSystem(T, {
    ...take(layout.fireflies), texture: glowTexture(), color: 0xffd766, size: lp ? 18 : 22, blending: T.AdditiveBlending,
    vertexMotion: `
      p.x += sin(uTime * .72 + aSeed * 41.0) * .42;
      p.y += sin(uTime * .91 + aSeed * 23.0) * .28;
      p.z += cos(uTime * .63 + aSeed * 37.0) * .35;`,
    fragmentAlpha: `alpha *= uNight * (0.18 + 0.82 * pow(0.5 + 0.5 * sin(uTime * (2.0 + fract(vSeed * 9.0) * 3.0) + vSeed * 31.0), 5.0));`
  });
  fireflies.renderOrder = 4;
  group.add(petals, smoke, fireflies);
  Object.assign(parts, { petals, smoke, fireflies });

  // birds: a swept two-wing silhouette in the XY plane (Atmosphere.update flaps scale.y)
  const bg = new T.BufferGeometry();
  bg.setAttribute('position', new T.BufferAttribute(new Float32Array([
    -0.46, -0.02, 0, -0.2, 0.09, 0, -0.05, -0.04, 0, -0.2, 0.09, 0, 0, 0.1, 0, -0.05, -0.04, 0,
     0.46, -0.02, 0, 0.05, -0.04, 0, 0.2, 0.09, 0, 0.2, 0.09, 0, 0.05, -0.04, 0, 0, 0.1, 0,
     -0.05, -0.04, 0, 0, 0.1, 0, 0.05, -0.04, 0, 0.0, -0.12, 0, -0.05, -0.04, 0, 0.05, -0.04, 0
  ]), 3));
  bg.computeVertexNormals();
  const bmat = new T.MeshBasicMaterial({ color: 0x25272c, side: T.DoubleSide, transparent: true, opacity: 0.72, fog: true });
  const birds = [];
  const nb = Math.min(tier.birds, layout.birds || 8);
  for (let i = 0; i < nb; i++) {
    const bird = new T.Mesh(bg, bmat);
    bird.userData.seed = hash1(5100 + i * 11.3);
    bird.userData.radius = 76 + bird.userData.seed * 95;
    bird.userData.speed = 0.013 + hash1(i * 3.7) * 0.014;
    bird.userData.height = 19 + hash1(i * 8.2) * 27;
    bird.scale.setScalar(0.7 + hash1(i * 5.1) * 1.25);
    bird.frustumCulled = false;
    birds.push(bird); group.add(bird); parts[`bird_${i + 1}`] = bird;
  }
  const mc = Math.max(8, Math.floor((layout.motes || 64) * tier.f)), mp = new Float32Array(mc * 3);
  for (let i = 0; i < mc; i++) { mp[i * 3] = (hash1(i * 4.17) - 0.5) * 15; mp[i * 3 + 1] = (hash1(i * 7.91 + 2) - 0.2) * 7; mp[i * 3 + 2] = (hash1(i * 2.61 + 8) - 0.5) * 9; }
  const mg = new T.BufferGeometry();
  mg.setAttribute('position', new T.BufferAttribute(mp, 3));
  const motes = new T.Points(mg, new T.PointsMaterial({ color: 0xffe4ae, size: 0.035, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending, fog: true }));
  motes.frustumCulled = false;
  group.add(motes); parts.motes = motes;
  return { group, parts, sockets: {}, live: [], petals, smoke, fireflies, birds, motes, dispose() { disposeTree(group); } };
}

const circ = (n, f) => { const positions = [], seeds = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; positions.push(...f(i, a)); seeds.push(hash1(i * 3.3 + 1)); } return { positions, seeds }; };

export const atmosphereAsset = defineAsset({
  id: 'roof-atmosphere', family: 'rooffestival', lab: 'roofroad/atmosphere', label: 'Roof Road atmosphere', tiers: ['hero', 'mid', 'far'],
  floating: ['petals', 'smoke', 'fireflies', 'motes', ...Array.from({ length: 8 }, (_, i) => `bird_${i + 1}`)],
  sample: () => ({
    x: 0, y: 0, z: 0, ry: 0, index: 0, band: 'near', lowPower: false, birds: 8, motes: 64,
    petals: circ(92, (i, a) => [Math.cos(a) * 30, 6 + (i % 5) * 0.2, Math.sin(a) * 30]),
    smoke: circ(60, (i, a) => [Math.cos(a) * 20, 2, Math.sin(a) * 20]),
    fireflies: circ(72, (i, a) => [Math.cos(a) * 25, 1.5 + (i % 4), Math.sin(a) * 25])
  }),
  build: buildAtmosphere
});
