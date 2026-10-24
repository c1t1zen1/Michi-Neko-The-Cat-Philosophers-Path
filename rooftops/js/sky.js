// sky.js — one summer afternoon that becomes festival night, driven by how
// far along the route the cat is (never by a clock), plus the ring of hills
// around the basin and the five Okuribi fires on them.

import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Keyframes by route progress p ∈ [0, 1].
const KEYS = [
  { p: 0.00, top: 0x78a9d6, hor: 0xf1dcb8, sun: 0xfff0d2, sunI: 2.5, elev: 34, hemiS: 0xcfe2f2, hemiG: 0x8a7a60, hemiI: 0.75, fog: 0xe6d9c2, fogD: 0.0022, exp: 1.0 },
  { p: 0.38, top: 0x7aa0c8, hor: 0xf6cf9e, sun: 0xffd496, sunI: 2.3, elev: 15, hemiS: 0xd8d2c8, hemiG: 0x8a6e50, hemiI: 0.7, fog: 0xeccba2, fogD: 0.0024, exp: 1.0 },
  { p: 0.60, top: 0x56648e, hor: 0xe8a27c, sun: 0xffaa7a, sunI: 1.3, elev: 3, hemiS: 0x9a8aa8, hemiG: 0x6a4a3a, hemiI: 0.62, fog: 0xbf9282, fogD: 0.0026, exp: 1.05 },
  { p: 0.76, top: 0x253058, hor: 0x6c608c, sun: 0x8fa0e0, sunI: 0.4, elev: -6, hemiS: 0x4f5f90, hemiG: 0x2a2430, hemiI: 0.6, fog: 0x3e3f62, fogD: 0.0028, exp: 1.15 },
  { p: 0.90, top: 0x0d1434, hor: 0x2d2d56, sun: 0x9fb4ff, sunI: 0.42, elev: -12, hemiS: 0x3b4878, hemiG: 0x1c1822, hemiI: 0.62, fog: 0x1e2140, fogD: 0.003, exp: 1.2 },
  { p: 1.00, top: 0x0c1232, hor: 0x2c2a54, sun: 0x9fb4ff, sunI: 0.42, elev: -12, hemiS: 0x3b4878, hemiG: 0x1c1822, hemiI: 0.62, fog: 0x1c1f3c, fogD: 0.003, exp: 1.2 }
];

const _a = new THREE.Color(), _b = new THREE.Color();
function lerpHex(out, h0, h1, t) { return out.copy(_a.setHex(h0)).lerp(_b.setHex(h1), t); }

/** Terrain height of the hill ring at angle a (0 = +x, east). */
function hillHeight(a) {
  // East (Higashiyama) and north (Kitayama) high, west lower, south open.
  const east = Math.cos(a);
  const north = -Math.sin(a);
  const base = 26 + 46 * Math.max(0, north) + 40 * Math.max(0, east) + 22 * Math.max(0, -east) * Math.max(0, north + 0.3);
  const south = Math.max(0, Math.sin(a));
  const n = Math.sin(a * 7.0) * 7 + Math.sin(a * 13.0 + 1.3) * 4 + Math.sin(a * 29.0) * 1.6;
  return Math.max(6, (base + n) * (1 - 0.82 * south * south));
}

export class Sky {
  constructor(scene, renderer, opts = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.center = opts.center || new THREE.Vector3(-13, 0, -57);
    this.ringR = opts.ringR || 430;

    this.uniforms = {
      uTop: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color() },
      uNight: { value: 0 }
    };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
        fragmentShader: `
          uniform vec3 uTop, uHor, uSunDir, uSunCol; uniform float uNight; varying vec3 vDir;
          float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
          void main(){
            float y = clamp(vDir.y, -0.2, 1.0);
            vec3 col = mix(uHor, uTop, pow(smoothstep(-0.05, 0.75, y), 0.75));
            float sd = max(0.0, dot(normalize(vDir), normalize(uSunDir)));
            col += uSunCol * (pow(sd, 260.0) * 2.5 + pow(sd, 8.0) * 0.25) * (1.0 - uNight * 0.85);
            // Stars: a hashed grid, only overhead and only at night.
            vec3 cell = floor(vDir * 220.0);
            float star = step(0.9975, h(cell)) * smoothstep(0.05, 0.35, y);
            col += vec3(star) * uNight * 0.9;
            gl_FragColor = vec4(col, 1.0);
          }`
      })
    );
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.dome = dome;
    scene.add(dome);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = !!opts.shadows;
    if (this.sun.castShadow) {
      this.sun.shadow.mapSize.set(1536, 1536);
      const c = this.sun.shadow.camera;
      c.left = -16; c.right = 16; c.top = 16; c.bottom = -16; c.near = 1; c.far = 120;
      this.sun.shadow.bias = -0.0005;
      this.sun.shadow.normalBias = 0.03;
    }
    scene.add(this.sun, this.sun.target);
    scene.fog = new THREE.FogExp2(0xe6d9c2, 0.0022);

    this.buildHills();
    this.buildFires();
    this.setPhase(0);
  }

  buildHills() {
    const seg = 256, rows = 3;
    const pos = [], col = [], idx = [];
    const cNear = new THREE.Color(0x3a4a3c), cFar = new THREE.Color(0x6f7f86);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const h = hillHeight(a);
      for (let r = 0; r <= rows; r++) {
        const k = r / rows;
        const rad = this.ringR * (1 + k * 0.35);
        const y = k === 0 ? -1 : h * (k < 1 ? Math.sin(k * Math.PI * 0.5) : 1) * (0.7 + 0.3 * k);
        pos.push(this.center.x + Math.cos(a) * rad, y, this.center.z + Math.sin(a) * rad);
        const c = cNear.clone().lerp(cFar, k * 0.6);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < seg; i++) {
      for (let r = 0; r < rows; r++) {
        const a = i * (rows + 1) + r, b = a + rows + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.hillMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.hills = new THREE.Mesh(geo, this.hillMat);
    this.scene.add(this.hills);
  }

  /**
   * The five fires, drawn from glyphs (大, 妙法, 大) and two outlines (a boat
   * and a torii), each a cloud of flickering points on a hillside facing the
   * city. Right to left they are lit in the real order: Daimonji first.
   */
  buildFires() {
    const fonts = "'Yu Mincho','Hiragino Mincho ProN','Shippori Mincho','Noto Serif JP','MS Mincho',serif";
    const sampleGlyph = (draw, w = 160, h = 160) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.strokeStyle = '#fff';
      draw(g, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      const pts = [];
      // A sparse grid with a little jitter: each point is one fire bed.
      let k = 0;
      for (let y = 0; y < h; y += 6) for (let x = 0; x < w; x += 6) {
        if (data[(y * w + x) * 4] > 140) {
          const jx = (Math.sin(++k * 12.9898) * 43758.5453 % 1) * 2.0;
          const jy = (Math.sin(k * 78.233) * 12543.731 % 1) * 2.0;
          pts.push([(x + jx) / w - 0.5, 0.5 - (y + jy) / h]);
        }
      }
      return pts;
    };
    const glyph = (txt) => sampleGlyph((g, w, h) => {
      g.font = `900 ${Math.floor(h * 0.86)}px ${fonts}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, w / 2, h / 2 + h * 0.03);
    });
    const boat = sampleGlyph((g, w, h) => {
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(w * 0.1, h * 0.55); g.quadraticCurveTo(w * 0.5, h * 0.85, w * 0.9, h * 0.55); g.lineTo(w * 0.1, h * 0.55); g.stroke();
      g.beginPath(); g.moveTo(w * 0.5, h * 0.55); g.lineTo(w * 0.5, h * 0.15); g.stroke();
      g.beginPath(); g.moveTo(w * 0.5, h * 0.18); g.lineTo(w * 0.78, h * 0.46); g.lineTo(w * 0.5, h * 0.46); g.stroke();
    });
    const torii = sampleGlyph((g, w, h) => {
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(w * 0.12, h * 0.22); g.quadraticCurveTo(w * 0.5, h * 0.14, w * 0.88, h * 0.22); g.stroke();
      g.beginPath(); g.moveTo(w * 0.2, h * 0.36); g.lineTo(w * 0.8, h * 0.36); g.stroke();
      g.beginPath(); g.moveTo(w * 0.3, h * 0.2); g.lineTo(w * 0.27, h * 0.9); g.stroke();
      g.beginPath(); g.moveTo(w * 0.7, h * 0.2); g.lineTo(w * 0.73, h * 0.9); g.stroke();
    });
    // Order of lighting (index 0 first), and where each sits on the ring:
    // the viewer at the float looks east (+x); left of view is north (−z).
    const defs = [
      { name: '大', pts: glyph('大'), ang: 0.32, size: 70 },
      { name: '妙法', pts: [...glyph('妙').map(([x, y]) => [x - 0.55, y]), ...glyph('法').map(([x, y]) => [x + 0.55, y])], ang: 0.02, size: 52 },
      { name: '船形', pts: boat, ang: -0.24, size: 56 },
      { name: '左大文字', pts: glyph('大'), ang: -0.48, size: 54 },
      { name: '鳥居形', pts: torii, ang: -0.7, size: 48 }
    ];
    const sprite = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,240,200,1)'); grd.addColorStop(0.3, 'rgba(255,170,70,0.9)');
      grd.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    this.fires = defs.map((def) => {
      const a = def.ang;
      // Partway up the slope (k = 0.57 of the hill rows), lying back with it.
      const k = 0.57;
      const rad = this.ringR * (1 + k * 0.35);
      const cx = this.center.x + Math.cos(a) * rad, cz = this.center.z + Math.sin(a) * rad;
      const ground = hillHeight(a) * Math.sin(k * Math.PI * 0.5) * (0.7 + 0.3 * k) + 4;
      const right = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      const up = new THREE.Vector3(Math.cos(a) * 0.62, 1, Math.sin(a) * 0.62).normalize();
      const pos = new Float32Array(def.pts.length * 3);
      const order = new Float32Array(def.pts.length);
      def.pts.forEach(([x, y], i) => {
        const w = def.name === '妙法' ? def.size * 0.55 : def.size;
        pos[i * 3] = cx + right.x * x * w * (def.name === '妙法' ? 1.6 : 1) + up.x * y * def.size;
        pos[i * 3 + 1] = ground + up.y * y * def.size;
        pos[i * 3 + 2] = cz + right.z * x * w * (def.name === '妙法' ? 1.6 : 1) + up.z * y * def.size;
        order[i] = Math.random();
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: sprite }, uKindle: { value: 0 }, uTime: { value: 0 }, uSize: { value: 19 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
        vertexShader: `
          attribute float aOrder; uniform float uKindle, uTime, uSize; varying float vA;
          void main(){
            float lit = smoothstep(aOrder, aOrder + 0.25, uKindle * 1.25);
            float fl = 0.75 + 0.25 * sin(uTime * 9.0 + aOrder * 40.0) * sin(uTime * 5.3 + aOrder * 17.0);
            vA = lit * fl;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * (300.0 / -mv.z) * (0.6 + 0.6 * lit);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `uniform sampler2D uMap; varying float vA; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(c.rgb, c.a * vA); }`
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      this.scene.add(pts);
      return { name: def.name, points: pts, mat, kindle: 0, target: 0, center: new THREE.Vector3(cx, ground, cz) };
    });
  }

  /** Light fire i (0 = Daimonji) — it kindles over a couple of seconds. */
  lightFire(i) { if (this.fires[i]) this.fires[i].target = 1; }
  resetFires() { for (const f of this.fires) { f.target = 0; f.kindle = 0; f.mat.uniforms.uKindle.value = 0; } }

  /** p: route progress. Night ∈ [0,1] comes back for lanterns and windows. */
  setPhase(p) {
    p = Math.min(1, Math.max(0, p));
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const A = KEYS[i], Bk = KEYS[i + 1];
    const t = smooth(A.p, Bk.p, p);
    lerpHex(this.uniforms.uTop.value, A.top, Bk.top, t);
    lerpHex(this.uniforms.uHor.value, A.hor, Bk.hor, t);
    lerpHex(this.uniforms.uSunCol.value, A.sun, Bk.sun, t);
    const elev = THREE.MathUtils.degToRad(lerp(A.elev, Bk.elev, t));
    const az = THREE.MathUtils.degToRad(-160);                     // the sun sets in the west (−x)
    this.sunDir = new THREE.Vector3(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az));
    // Below the horizon the "sun" light becomes moonlight from high in the east.
    const night = smooth(0.62, 0.86, p);
    this.night = night;
    const lightDir = this.sunDir.clone();
    if (elev < THREE.MathUtils.degToRad(4)) lightDir.lerp(new THREE.Vector3(0.45, 0.8, 0.3).normalize(), smooth(0.58, 0.8, p)).normalize();
    this.lightDir = lightDir;
    this.uniforms.uSunDir.value.copy(this.sunDir);
    this.uniforms.uNight.value = night;
    lerpHex(this.sun.color, A.sun, Bk.sun, t);
    this.sun.intensity = lerp(A.sunI, Bk.sunI, t);
    lerpHex(this.hemi.color, A.hemiS, Bk.hemiS, t);
    lerpHex(this.hemi.groundColor, A.hemiG, Bk.hemiG, t);
    this.hemi.intensity = lerp(A.hemiI, Bk.hemiI, t);
    lerpHex(this.scene.fog.color, A.fog, Bk.fog, t);
    this.scene.fog.density = lerp(A.fogD, Bk.fogD, t);
    this.renderer.toneMappingExposure = lerp(A.exp, Bk.exp, t);
    const hillTint = new THREE.Color(0xffffff).lerp(new THREE.Color(0x5a6488), night * 0.8);
    this.hillMat.color.copy(hillTint);
    return night;
  }

  /** Keep the sky centred and the shadow box on the cat. */
  update(dt, t, focus) {
    this.dome.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.lightDir, 60);
    this.sun.target.position.copy(focus);
    for (const f of this.fires) {
      f.kindle += (f.target - f.kindle) * Math.min(1, dt * 0.55);
      f.mat.uniforms.uKindle.value = f.kindle;
      f.mat.uniforms.uTime.value = t;
    }
  }
}

export { hillHeight };
