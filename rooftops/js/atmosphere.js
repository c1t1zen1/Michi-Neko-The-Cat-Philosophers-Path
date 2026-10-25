// atmosphere.js — small, procedural signs of life for the Roof Road.
//
// Everything here is one of a handful of point draws or shared geometries:
// canal petals, chimney smoke, birds, dust and night fireflies. The scene keeps
// moving like a painted animation cel without turning every decoration into an
// object. No images are downloaded; the point sprites are drawn on tiny canvases.

import * as THREE from 'three';
import { hash1 } from './level.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function spriteTexture(draw, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function petalTexture() {
  return spriteTexture((g, s) => {
    g.translate(s / 2, s / 2);
    g.rotate(-0.55);
    const grad = g.createRadialGradient(-6, -5, 1, 0, 0, 25);
    grad.addColorStop(0, 'rgba(255,250,248,1)');
    grad.addColorStop(0.55, 'rgba(246,183,202,.96)');
    grad.addColorStop(1, 'rgba(211,115,151,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, 22, 11, 0, 0, TAU);
    g.fill();
  });
}

function smokeTexture() {
  return spriteTexture((g, s) => {
    const grad = g.createRadialGradient(s * 0.46, s * 0.44, 1, s / 2, s / 2, s * 0.48);
    grad.addColorStop(0, 'rgba(236,229,214,.72)');
    grad.addColorStop(0.38, 'rgba(189,184,176,.34)');
    grad.addColorStop(1, 'rgba(120,125,130,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
}

function glowTexture() {
  return spriteTexture((g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,250,185,1)');
    grad.addColorStop(0.24, 'rgba(255,205,82,.9)');
    grad.addColorStop(1, 'rgba(255,160,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
}

function pointSystem({ positions, seeds, texture, color, size, vertexMotion, fragmentAlpha, blending = THREE.NormalBlending }) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uNight: { value: 0 },
      uOpacity: { value: 1 },
      uSize: { value: size },
      uColor: { value: new THREE.Color(color) }
    },
    transparent: true,
    depthWrite: false,
    blending,
    fog: true,
    vertexShader: `
      #include <fog_pars_vertex>
      uniform float uTime;
      uniform float uNight;
      uniform float uSize;
      attribute float aSeed;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec3 p = position;
        float cycle = fract(aSeed + uTime * (0.025 + fract(aSeed * 19.7) * 0.035));
        ${vertexMotion}
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uSize * (220.0 / max(1.0, -mvPosition.z));
        vSeed = aSeed;
        ${fragmentAlpha ? 'vAlpha = 1.0;' : 'vAlpha = smoothstep(0.0, .12, cycle) * (1.0 - smoothstep(.72, 1.0, cycle));'}
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uNight;
      varying float vAlpha;
      varying float vSeed;
      #include <fog_pars_fragment>
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float alpha = tex.a * vAlpha * uOpacity;
        ${fragmentAlpha || ''}
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(tex.rgb * uColor, alpha);
        #include <fog_fragment>
      }`
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

/**
 * One pooled impact draw for every tactile beat in the run. Positions, colour,
 * alpha and size are dynamic attributes, so a landing never allocates a mesh.
 */
class ImpactFX {
  constructor(root, opts = {}) {
    this.reduceMotion = !!opts.reduceMotion;
    this.lowPower = !!opts.lowPower;
    this.max = 88;
    this.cursor = 0;
    this.serial = 0;
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    this.size = new Float32Array(this.max);
    this.alpha = new Float32Array(this.max);
    this.vx = new Float32Array(this.max);
    this.vy = new Float32Array(this.max);
    this.vz = new Float32Array(this.max);
    this.life = new Float32Array(this.max);
    this.life0 = new Float32Array(this.max);
    this.gravity = new Float32Array(this.max);
    this.drag = new Float32Array(this.max);
    this.baseSize = new Float32Array(this.max);
    for (let i = 0; i < this.max; i++) this.pos[i * 3 + 1] = -999;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const map = spriteTexture((g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s * 0.48);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,.86)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, s, s);
    }, 48);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map } },
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.NormalBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * (105.0 / max(1.0, -mv.z));
          vColor = color;
          vAlpha = aAlpha;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float a = tex.a * vAlpha;
          if (a < 0.02) discard;
          gl_FragColor = vec4(vColor * tex.rgb, a);
        }`
    });
    this.points = new THREE.Points(geo, mat);
    this.points.name = 'Roof Road impact particles';
    this.points.frustumCulled = false;
    this.points.renderOrder = 7;
    root.add(this.points);
  }

  setLowPower(on = true) { this.lowPower = on; }

  burst(kind, origin, heading = null) {
    const motion = this.reduceMotion ? 0.45 : 1;
    const water = kind === 'water';
    const futon = kind === 'futon';
    const collect = kind === 'shoki' || kind === 'treat';
    const baseCount = water ? 15 : futon ? 13 : collect ? 18 : 9;
    const count = Math.max(4, Math.round(baseCount * (this.lowPower ? 0.55 : 1) * (this.reduceMotion ? 0.65 : 1)));
    const palette = water
      ? [0xdaf5ef, 0x8bc7c8, 0xffffff]
      : futon
        ? [0xf5efe2, 0x8fa9cc, 0xd8e4ef]
        : kind === 'shoki'
          ? [0xffdf72, 0xf09a52, 0xffffff]
          : kind === 'treat'
            ? [0xffc65a, 0xf07a54, 0xffefb0]
            : [0xe6d4b7, 0xbfa47d, 0xf3e5cc];
    const dirX = heading?.x || 0, dirZ = heading?.z || 0;
    const c = new THREE.Color();
    const rand = () => hash1(8200 + (++this.serial) * 6.137);
    for (let n = 0; n < count; n++) {
      const i = this.cursor++ % this.max;
      const a = rand() * TAU;
      const radial = (0.2 + rand() * (water ? 1.15 : collect ? 0.9 : 0.65)) * motion;
      const bias = collect ? 0 : (rand() - 0.28) * 0.45 * motion;
      this.pos[i * 3] = origin.x + (rand() - 0.5) * 0.28;
      this.pos[i * 3 + 1] = origin.y + (water ? 0.06 : 0.03) + rand() * 0.08;
      this.pos[i * 3 + 2] = origin.z + (rand() - 0.5) * 0.28;
      this.vx[i] = Math.cos(a) * radial + dirX * bias;
      this.vz[i] = Math.sin(a) * radial + dirZ * bias;
      this.vy[i] = (water ? 1.15 + rand() * 1.65 : futon ? 0.9 + rand() * 1.35 : collect ? 0.75 + rand() * 1.45 : 0.2 + rand() * 0.55) * motion;
      this.life0[i] = this.life[i] = water ? 0.55 + rand() * 0.42 : futon ? 0.7 + rand() * 0.55 : collect ? 0.78 + rand() * 0.5 : 0.42 + rand() * 0.34;
      this.gravity[i] = water ? 5.2 : futon ? 1.6 : collect ? 1.25 : 1.8;
      this.drag[i] = water ? 1.4 : futon ? 0.7 : collect ? 0.45 : 2.2;
      this.baseSize[i] = water ? 0.55 + rand() * 0.45 : collect ? 0.62 + rand() * 0.48 : 0.72 + rand() * 0.5;
      this.size[i] = this.baseSize[i];
      this.alpha[i] = 0.95;
      c.setHex(palette[Math.floor(rand() * palette.length) % palette.length]);
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    }
    this._dirty();
  }

  update(dt) {
    let changed = false;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      changed = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.life[i] = 0;
        this.alpha[i] = 0;
        this.pos[i * 3 + 1] = -999;
        continue;
      }
      const decay = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= decay; this.vz[i] *= decay;
      this.vy[i] -= this.gravity[i] * dt;
      this.pos[i * 3] += this.vx[i] * dt;
      this.pos[i * 3 + 1] += this.vy[i] * dt;
      this.pos[i * 3 + 2] += this.vz[i] * dt;
      const u = this.life[i] / this.life0[i];
      this.alpha[i] = Math.min(1, (1 - u) * 7) * Math.min(1, u * 2.2);
      this.size[i] = this.baseSize[i] * (0.65 + (1 - u) * 0.75);
    }
    if (changed) this._dirty();
  }

  _dirty() {
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true;
    a.color.needsUpdate = true;
    a.aSize.needsUpdate = true;
    a.aAlpha.needsUpdate = true;
  }
}

export class RooftopAtmosphere {
  constructor(scene, level, opts = {}) {
    this.scene = scene;
    this.level = level;
    this.rail = level.rail;
    this.reduceMotion = !!opts.reduceMotion;
    this.lowPower = !!opts.lowPower;
    this._moteTarget = new THREE.Vector3();
    this.root = new THREE.Group();
    this.root.name = 'Roof Road atmosphere';
    scene.add(this.root);
    this._buildPetals();
    this._buildSmoke();
    this._buildFireflies();
    this._buildBirds();
    this._buildMotes();
    this.impacts = new ImpactFX(this.root, opts);
  }

  _buildPetals() {
    const count = this.lowPower ? 42 : 92;
    const positions = [], seeds = [];
    for (let i = 0; i < count; i++) {
      const seed = hash1(700 + i * 7.17);
      const s = 126.4 + hash1(i * 3.31 + 4) * 32.2;
      const d = 1.1 + hash1(i * 9.73 + 2) * 4.4;
      const p = this.rail.place(s, d);
      positions.push(p.x, 0.4 + hash1(i * 5.13) * 4.3, p.z);
      seeds.push(seed);
    }
    this.petals = pointSystem({
      positions, seeds, texture: petalTexture(), color: 0xffe3eb, size: this.lowPower ? 11 : 13,
      vertexMotion: `
        p.y += 1.8 - cycle * 4.4;
        p.x += sin(uTime * .75 + aSeed * 31.0 + cycle * 8.0) * (0.35 + cycle * .55);
        p.z += cos(uTime * .52 + aSeed * 17.0 + cycle * 9.0) * .28;`
    });
    this.petals.renderOrder = 3;
    this.root.add(this.petals);
  }

  _buildSmoke() {
    const chimneys = [31.5, 69.0, 106.2, 170.5, 203.5, 255.5, 298.0, 307.8];
    const positions = [], seeds = [];
    const per = this.lowPower ? 3 : 5;
    chimneys.forEach((s, ci) => {
      const d = ci % 2 ? -2.8 : -1.2;
      const p = this.rail.place(s, d);
      for (let j = 0; j < per; j++) {
        positions.push(p.x, 3.4 + (ci % 3) * 0.55, p.z);
        seeds.push(hash1(ci * 17 + j * 4.7));
      }
    });
    this.smoke = pointSystem({
      positions, seeds, texture: smokeTexture(), color: 0xd8d3ca, size: this.lowPower ? 40 : 52,
      vertexMotion: `
        p.y += cycle * (3.4 + fract(aSeed * 12.4) * 2.4);
        p.x += sin(aSeed * 29.0 + cycle * 5.5 + uTime * .18) * cycle * 1.15;
        p.z += cos(aSeed * 13.0 + cycle * 3.2) * cycle * .5;`
    });
    this.smoke.material.uniforms.uOpacity.value = 0.55;
    this.root.add(this.smoke);
  }

  _buildFireflies() {
    const count = this.lowPower ? 34 : 72;
    const positions = [], seeds = [];
    for (let i = 0; i < count; i++) {
      const s = 288.5 + hash1(i * 8.19) * 44;
      const d = -2.8 + hash1(i * 2.77 + 9) * 8.2;
      const p = this.rail.place(s, d);
      positions.push(p.x, 0.7 + hash1(i * 6.1) * 4.8, p.z);
      seeds.push(hash1(3000 + i * 4.9));
    }
    this.fireflies = pointSystem({
      positions, seeds, texture: glowTexture(), color: 0xffd766, size: this.lowPower ? 18 : 22,
      blending: THREE.AdditiveBlending,
      vertexMotion: `
        p.x += sin(uTime * .72 + aSeed * 41.0) * .42;
        p.y += sin(uTime * .91 + aSeed * 23.0) * .28;
        p.z += cos(uTime * .63 + aSeed * 37.0) * .35;`,
      fragmentAlpha: `alpha *= uNight * (0.18 + 0.82 * pow(0.5 + 0.5 * sin(uTime * (2.0 + fract(vSeed * 9.0) * 3.0) + vSeed * 31.0), 5.0));`
    });
    this.fireflies.renderOrder = 4;
    this.root.add(this.fireflies);
  }

  _buildBirds() {
    const pos = new Float32Array([
      -0.42, 0, 0, 0, 0.08, 0, -0.05, -0.07, 0,
       0.42, 0, 0, 0.05, -0.07, 0, 0, 0.08, 0
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color: 0x25272c, side: THREE.DoubleSide, transparent: true, opacity: 0.72, fog: true });
    this.birds = [];
    const count = this.lowPower ? 4 : 8;
    for (let i = 0; i < count; i++) {
      const bird = new THREE.Mesh(geo, mat);
      bird.userData.seed = hash1(5100 + i * 11.3);
      bird.userData.radius = 76 + bird.userData.seed * 95;
      bird.userData.speed = 0.013 + hash1(i * 3.7) * 0.014;
      bird.userData.height = 19 + hash1(i * 8.2) * 27;
      bird.scale.setScalar(0.7 + hash1(i * 5.1) * 1.25);
      bird.frustumCulled = false;
      this.birds.push(bird);
      this.root.add(bird);
    }
  }

  _buildMotes() {
    const count = this.lowPower ? 30 : 64;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (hash1(i * 4.17) - 0.5) * 15;
      pos[i * 3 + 1] = (hash1(i * 7.91 + 2) - 0.2) * 7;
      pos[i * 3 + 2] = (hash1(i * 2.61 + 8) - 0.5) * 9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffe4ae, size: 0.035, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
    this.motes = new THREE.Points(geo, mat);
    this.motes.frustumCulled = false;
    this.root.add(this.motes);
  }

  setLowPower(on = true) {
    this.lowPower = on;
    this.petals.visible = !on || !this.reduceMotion;
    this.motes.visible = !on;
    this.impacts.setLowPower(on);
    for (let i = 0; i < this.birds.length; i++) this.birds[i].visible = !on || i < 3;
  }

  burst(kind, position, heading = null) { this.impacts.burst(kind, position, heading); }

  update(dt, time, progress, night, focus) {
    const motion = this.reduceMotion ? 0.22 : 1;
    const t = time * motion;
    for (const points of [this.petals, this.smoke, this.fireflies]) {
      points.material.uniforms.uTime.value = t;
      points.material.uniforms.uNight.value = night;
    }
    this.petals.material.uniforms.uOpacity.value = 0.35 + (1 - night) * 0.45;
    this.smoke.material.uniforms.uOpacity.value = 0.28 + (1 - night) * 0.32;

    // Birds circle the inner city at several depths; wing beats slow whenever
    // they bank, which reads clearly even as a tiny silhouette.
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i], u = b.userData.seed * TAU + t * b.userData.speed;
      const r = b.userData.radius;
      b.position.set(-13 + Math.cos(u) * r, b.userData.height + Math.sin(u * 2.3) * 2.5, -57 + Math.sin(u) * r);
      b.rotation.y = -u + Math.PI / 2;
      b.rotation.z = Math.sin(t * 5.2 + i) * 0.16;
      b.scale.y = 0.35 + Math.abs(Math.sin(t * 4.7 + i * 1.8)) * 0.8;
    }

    // Motes travel with the camera rather than allocating a city-sized cloud.
    this._moteTarget.copy(focus);
    this._moteTarget.y += 1.4;
    this.motes.position.lerp(this._moteTarget, 1 - Math.exp(-dt * 1.2));
    this.motes.rotation.y = t * 0.015;
    this.motes.material.opacity = clamp(0.12 + (1 - night) * 0.28, 0, 0.4);
    this.impacts.update(dt);
  }
}
