// roof-okuribi: the five Gozan no Okuribi fires of the finale (rooftops/js/sky.js buildFires). The same five
// glyph clouds on the same hillside spots, the same records Sky.update drives (kindle/target, mat.uniforms.uKindle
// and uTime, glow sprite opacity and scale), so the fires light in order on the classic kindle curve and the camera
// move is untouched. What changes is the look: a denser bed (hero: a 4 px grid against 6), a per-point size,
// a hotter white-yellow core, and rising embers that live in the SAME Points as the bed (one draw per fire, as classic).
import { defineAsset } from '../contract.js?v=20261114a';
import { hillHeight, hashCloud, canvas, canvasTex, disposeTree } from './fx.js?v=20261114a';

const FONTS = "'Yu Mincho','Hiragino Mincho ProN','Shippori Mincho','Noto Serif JP','MS Mincho',serif";
const GRID = { hero: 4, mid: 6, far: 9 };
const EMBERS = { hero: 0.35, mid: 0, far: 0 };      // embers per bed point

function sampleGlyph(draw, step, w = 160, h = 160) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  draw(g, w, h);
  const data = g.getImageData(0, 0, w, h).data, pts = [];
  let k = 0;
  const jit = step / 3;
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    if (data[(y * w + x) * 4] > 140) {
      const jx = (Math.sin(++k * 12.9898) * 43758.5453 % 1) * jit, jy = (Math.sin(k * 78.233) * 12543.731 % 1) * jit;
      pts.push([(x + jx) / w - 0.5, 0.5 - (y + jy) / h]);
    }
  }
  return pts;
}

function flameSprite(T) {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,250,225,1)'); grd.addColorStop(0.18, 'rgba(255,214,120,.98)'); grd.addColorStop(0.42, 'rgba(255,150,55,.85)');
  grd.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return canvasTex(c);
}

function buildOkuribi(ctx, layout) {
  const T = ctx.THREE, tier = ctx.tier, step = GRID[tier] || 6, emberRate = EMBERS[tier] || 0;
  const c0 = layout.center, R = layout.ringR, group = new T.Group();
  const glyph = (txt) => sampleGlyph((g, w, h) => {
    g.font = `900 ${Math.floor(h * 0.86)}px ${FONTS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, w / 2, h / 2 + h * 0.03);
  }, step);
  const lw = 9;
  const boat = sampleGlyph((g, w, h) => {
    g.lineWidth = lw;
    g.beginPath(); g.moveTo(w * 0.1, h * 0.55); g.quadraticCurveTo(w * 0.5, h * 0.85, w * 0.9, h * 0.55); g.lineTo(w * 0.1, h * 0.55); g.stroke();
    g.beginPath(); g.moveTo(w * 0.5, h * 0.55); g.lineTo(w * 0.5, h * 0.15); g.stroke();
    g.beginPath(); g.moveTo(w * 0.5, h * 0.18); g.lineTo(w * 0.78, h * 0.46); g.lineTo(w * 0.5, h * 0.46); g.stroke();
  }, step);
  const torii = sampleGlyph((g, w, h) => {
    g.lineWidth = lw;
    g.beginPath(); g.moveTo(w * 0.12, h * 0.22); g.quadraticCurveTo(w * 0.5, h * 0.14, w * 0.88, h * 0.22); g.stroke();
    g.beginPath(); g.moveTo(w * 0.2, h * 0.36); g.lineTo(w * 0.8, h * 0.36); g.stroke();
    g.beginPath(); g.moveTo(w * 0.3, h * 0.2); g.lineTo(w * 0.27, h * 0.9); g.stroke();
    g.beginPath(); g.moveTo(w * 0.7, h * 0.2); g.lineTo(w * 0.73, h * 0.9); g.stroke();
  }, step);
  // Order of lighting (index 0 first); the same angles and sizes as the classic.
  const defs = [
    { name: '大', label: '大 · Daimonji', pts: glyph('大'), ang: 0.32, size: 70 },
    { name: '妙法', label: '妙法 · Myōhō', pts: [...glyph('妙').map(([x, y]) => [x - 0.55, y]), ...glyph('法').map(([x, y]) => [x + 0.55, y])], ang: 0.02, size: 52 },
    { name: '船形', label: '船形 · Funagata', pts: boat, ang: -0.24, size: 56 },
    { name: '左大文字', label: '左大文字 · Hidari Daimonji', pts: glyph('大'), ang: -0.48, size: 54 },
    { name: '鳥居形', label: '鳥居形 · Toriigata', pts: torii, ang: -0.7, size: 48 }
  ];
  const sprite = flameSprite(T);
  const fires = defs.map((def) => {
    const a = def.ang, k = 0.57, rad = R * (1 + k * 0.35);
    const cx = c0.x + Math.cos(a) * rad, cz = c0.z + Math.sin(a) * rad;
    const ground = hillHeight(a) * Math.sin(k * Math.PI * 0.5) * (0.7 + 0.3 * k) + 4;
    const right = new T.Vector3(-Math.sin(a), 0, Math.cos(a));
    const up = new T.Vector3(Math.cos(a) * 0.62, 1, Math.sin(a) * 0.62).normalize();
    const wide = def.name === '妙法', w = wide ? def.size * 0.55 : def.size, wk = wide ? 1.6 : 1;
    const nBed = def.pts.length, nEmber = Math.round(nBed * emberRate), n = nBed + nEmber;
    const pos = new Float32Array(n * 3), order = new Float32Array(n), size = new Float32Array(n), ember = new Float32Array(n);
    def.pts.forEach(([x, y], i) => {
      pos[i * 3] = cx + right.x * x * w * wk + up.x * y * def.size;
      pos[i * 3 + 1] = ground + up.y * y * def.size;
      pos[i * 3 + 2] = cz + right.z * x * w * wk + up.z * y * def.size;
      order[i] = hashCloud(9100 + i * 4.73 + def.ang * 101);
      size[i] = 0.8 + 0.5 * hashCloud(i * 2.3 + def.ang * 17);
    });
    for (let j = 0; j < nEmber; j++) {              // embers start on the glyph and drift up and away
      const i = nBed + j, src = def.pts[Math.floor(hashCloud(j * 5.1 + def.ang * 31) * nBed)];
      pos[i * 3] = cx + right.x * src[0] * w * wk + up.x * src[1] * def.size;
      pos[i * 3 + 1] = ground + up.y * src[1] * def.size;
      pos[i * 3 + 2] = cz + right.z * src[0] * w * wk + up.z * src[1] * def.size;
      order[i] = hashCloud(9100 + i * 4.73 + def.ang * 101) * 0.8;
      size[i] = 0.35 + 0.25 * hashCloud(j * 3.3);
      ember[i] = 1;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aOrder', new T.BufferAttribute(order, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));
    geo.setAttribute('aEmber', new T.BufferAttribute(ember, 1));
    const mat = new T.ShaderMaterial({
      uniforms: { uMap: { value: sprite }, uKindle: { value: 0 }, uTime: { value: 0 }, uSize: { value: step <= 4 ? 15 : 19 }, uRise: { value: def.size * 0.55 } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
      vertexShader: `
        attribute float aOrder, aSize, aEmber; uniform float uKindle, uTime, uSize, uRise; varying float vA; varying float vHot;
        void main(){
          float lit = smoothstep(aOrder, aOrder + 0.25, uKindle * 1.25);
          float fl = 0.75 + 0.25 * sin(uTime * 9.0 + aOrder * 40.0) * sin(uTime * 5.3 + aOrder * 17.0);
          vec3 p = position;
          float cyc = fract(uTime * (0.05 + aOrder * 0.04) + aOrder * 7.0);
          p.y += aEmber * cyc * uRise;
          p.x += aEmber * sin(uTime * 0.8 + aOrder * 30.0) * cyc * 3.0;
          vA = lit * fl * mix(1.0, (1.0 - cyc) * smoothstep(0.0, 0.1, cyc) * 0.9, aEmber);
          vHot = mix(1.0, 0.0, aEmber);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * aSize * (300.0 / -mv.z) * (0.6 + 0.6 * lit);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA; varying float vHot; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(c.rgb * mix(vec3(1.0, 0.7, 0.4), vec3(1.0), vHot), c.a * vA); }`
    });
    const points = new T.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    group.add(points);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: sprite, color: 0xff7b2c, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    glow.position.set(cx, ground + 1.5, cz);
    glow.scale.set(def.size * 1.7, def.size * 0.92, 1);
    glow.renderOrder = 1;
    group.add(glow);
    return {
      name: def.name, label: def.label, points, mat, glow, glowScale: new T.Vector2(def.size * 1.7, def.size * 0.92),
      kindle: 0, target: 0, center: new T.Vector3(cx, ground, cz)
    };
  });
  const parts = {};
  fires.forEach((f, i) => { parts[`fire_${i + 1}`] = f.points; parts[`glow_${i + 1}`] = f.glow; });
  return { group, parts, sockets: {}, live: [], fires, dispose() { disposeTree(group); } };
}

export const okuribiAsset = defineAsset({
  id: 'roof-okuribi', family: 'rooffestival', lab: 'roofroad/okuribi', label: 'Okuribi fires', tiers: ['hero', 'mid', 'far'],
  floating: [1, 2, 3, 4, 5].flatMap((i) => [`fire_${i}`, `glow_${i}`]),
  sample: { x: -13, y: 0, z: -57, ry: 0, index: 0, band: 'near', center: { x: -13, z: -57 }, ringR: 430 },
  build: buildOkuribi
});
