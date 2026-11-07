// Everything that moves on or over the water: ripple rings (a uniform pool
// the water shaders read), splash droplets, petals and leaves carried by the
// field, tōrō-nagashi lanterns, fireflies, dawn mist and rain.
import * as THREE from 'three';
import { petalTexture, mapleTexture } from './textures.js';

/* ---------------- ripple rings ---------------- */

export class RipplePool {
  constructor(U) { this.U = U; this.i = 0; this.time = 0; }
  /** strength ~0.3 (a paw) .. 2 (a cannonball). drift = the flow it was born in. */
  add(x, z, strength = 1, drift = null, life = null) {
    const k = this.i++ % 16;
    this.U.uRip.value[k].set(x, z, this.time, strength);
    this.U.uRipV.value[k].set(drift ? drift.x * 0.8 : 0, drift ? drift.z * 0.8 : 0, life ?? 1.4 + strength * 0.7, 0);
  }
  clear() { for (const v of this.U.uRip.value) v.set(0, 0, 0, 0); }
}

/* ---------------- droplets ---------------- */

const DROP_VS = /* glsl */`
attribute float aSize;
attribute float aLife;
varying float vLife;
uniform float uScale;
void main() {
  vLife = aLife;
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DROP_FS = /* glsl */`
uniform vec3 uCol;
varying float vLife;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5 || vLife <= 0.) discard;
  float a = smoothstep(0.5, 0.2, r) * min(1., vLife * 3.);
  vec3 c = uCol * (0.9 + 0.3 * smoothstep(0.3, 0., length(d + vec2(0.12, 0.12))));
  gl_FragColor = vec4(c * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Droplets {
  constructor(n = 600) {
    this.n = n;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3);
    this.life = new Float32Array(n); this.size = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(0.85, 0.92, 1) }, uScale: { value: 300 } },
      vertexShader: DROP_VS, fragmentShader: DROP_FS, transparent: true, premultipliedAlpha: true, depthWrite: false
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.k = 0;
    this.live = 0;
  }
  spawn(x, y, z, vx, vy, vz, size = 0.03, life = 1.6) {
    const i = this.k++ % this.n;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3);
    this.life[i] = life; this.size[i] = size;
  }
  /** A crown splash: drops thrown up and out, more for a harder hit. */
  splash(x, y, z, impact = 1, rnd = Math.random) {
    const n = Math.round(30 + impact * 70);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, out = (0.6 + rnd() * 1.6) * (0.6 + impact * 0.5), up = (1.6 + rnd() * 2.6) * (0.5 + impact * 0.45);
      this.spawn(x + Math.cos(a) * 0.08, y, z + Math.sin(a) * 0.08, Math.cos(a) * out, up, Math.sin(a) * out, 0.02 + rnd() * 0.035, 1.2 + rnd());
    }
  }
  update(dt, waterY, onHit) {
    let live = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      live++;
      this.life[i] -= dt;
      const o = i * 3;
      this.v[o + 1] -= 9.8 * dt;
      this.v[o] *= 1 - 0.4 * dt; this.v[o + 2] *= 1 - 0.4 * dt;
      this.p[o] += this.v[o] * dt; this.p[o + 1] += this.v[o + 1] * dt; this.p[o + 2] += this.v[o + 2] * dt;
      const wy = waterY(this.p[o], this.p[o + 2]);
      if (this.v[o + 1] < 0 && this.p[o + 1] < wy) {
        this.life[i] = 0;
        if (onHit && this.size[i] > 0.035) onHit(this.p[o], this.p[o + 2]);
      }
    }
    this.live = live;
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aLife.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.points.geometry.attributes.aLife.needsUpdate = true; }
}

/* ---------------- petals and leaves on the current ---------------- */

export class Floaters {
  /** kind: 'petal' (sakura, hanaikada) or 'maple' */
  constructor(n = 700, scale = 1) {
    this.n = n;
    this.scale = scale;
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    // a little cup, so petals catch the light
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, (pos.getX(i) ** 2 + pos.getZ(i) ** 2) * 0.25);
    g.computeVertexNormals();
    this.mats = {
      petal: new THREE.MeshStandardMaterial({ map: petalTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }),
      maple: new THREE.MeshStandardMaterial({ map: mapleTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 })
    };
    this.mesh = new THREE.InstancedMesh(g, this.mats.petal, n);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.items = [];
    this.kind = 'petal';
    this.d = new THREE.Object3D();
  }
  setKind(k) { this.kind = k; this.mesh.material = this.mats[k] || this.mats.petal; }
  /** Drop one from the air at (x, y, z). */
  add(x, y, z, rnd = Math.random) {
    if (this.items.length >= this.n) this.items.shift();
    this.items.push({ x, y, z, vx: 0, vz: 0, vy: 0, rot: rnd() * 6.28, spin: (rnd() - 0.5) * 2, tilt: rnd() * 6.28, s: (this.kind === 'maple' ? 0.09 : 0.045) * this.scale * (0.8 + rnd() * 0.4), age: 0, stuck: 0 });
  }
  update(dt, t, { field, level, groundAt, solids, flowScale = 1, wind = 0.5 }) {
    const f = { x: 0, z: 0 };
    let k = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      const gy = groundAt(p.x, p.z), wet = level - gy;
      const surface = Math.max(gy + 0.004, wet > 0 ? level + 0.006 : -99);
      if (p.y > surface + 0.01) {
        // fluttering down
        p.vy = -0.55;
        p.x += Math.sin(t * 2.3 + p.tilt) * 0.25 * dt + wind * 0.15 * dt;
        p.z += Math.cos(t * 1.7 + p.tilt) * 0.2 * dt;
        p.y = Math.max(surface, p.y + p.vy * dt);
        p.rot += p.spin * 3 * dt;
      } else if (wet > 0.005) {
        field.flowAt(p.x, p.z, level, f);
        // inertia: a petal lags the water a little
        p.vx += (f.x * flowScale - p.vx) * Math.min(1, dt * 2.5);
        p.vz += (f.z * flowScale - p.vz) * Math.min(1, dt * 2.5);
        const sp = Math.hypot(p.vx, p.vz);
        if (wet < 0.03) { p.vx *= 0.9; p.vz *= 0.9; p.stuck += dt; }   // they gather in the shallows
        p.x += p.vx * dt + Math.sin(t * 0.9 + p.tilt) * 0.02 * dt;
        p.z += p.vz * dt + Math.cos(t * 1.1 + p.tilt) * 0.02 * dt;
        p.rot += p.spin * (0.2 + sp * 0.8) * dt;
        p.y = level + 0.006;
        for (const s of solids) {
          if (s.kind !== 'stone' && s.kind !== 'post' && s.kind !== 'rock') continue;
          if (s.contains(p.x, p.z) && s.x !== undefined) {
            const dx = p.x - s.x, dz = p.z - s.z, l = Math.hypot(dx, dz) || 1;
            p.x = s.x + (dx / l) * (Math.max(s.rx, s.rz) + 0.02); p.z = s.z + (dz / l) * (Math.max(s.rx, s.rz) + 0.02);
          }
        }
      } else {
        p.y = gy + 0.004;
        p.stuck += dt;
      }
      if (!field.inside(p.x, p.z) || p.age > 160) { this.items.splice(i, 1); continue; }
    }
    for (const p of this.items) {
      this.d.position.set(p.x, p.y, p.z);
      this.d.rotation.set(Math.sin(p.tilt) * 0.2, p.rot, Math.cos(p.tilt) * 0.2);
      this.d.scale.setScalar(p.s);
      this.d.updateMatrix();
      this.mesh.setMatrixAt(k++, this.d.matrix);
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { this.items.length = 0; this.mesh.count = 0; }
}

/* ---------------- tōrō-nagashi ---------------- */

export class FloatingLanterns {
  constructor(max = 10) {
    this.max = max;
    this.group = new THREE.Group();
    this.items = [];
    this.paper = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffa040, emissiveIntensity: 1.6, roughness: 0.7 });
    this.wood = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.8 });
    this.geoPaper = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    this.geoBase = new THREE.BoxGeometry(0.28, 0.04, 0.28);
  }
  add(x, z, level) {
    if (this.items.length >= this.max) { const o = this.items.shift(); this.group.remove(o.g); }
    const g = new THREE.Group();
    const b = new THREE.Mesh(this.geoBase, this.wood), p = new THREE.Mesh(this.geoPaper, this.paper);
    p.position.y = 0.12;
    g.add(b, p);
    g.position.set(x, level + 0.02, z);
    g.rotation.y = Math.random() * 6.28;
    this.group.add(g);
    this.items.push({ g, vx: 0, vz: 0, spin: (Math.random() - 0.5) * 0.4, ph: Math.random() * 6 });
  }
  update(dt, t, { field, level }) {
    const f = { x: 0, z: 0 };
    for (let i = this.items.length - 1; i >= 0; i--) {
      const L = this.items[i], g = L.g;
      field.flowAt(g.position.x, g.position.z, level, f);
      L.vx += (f.x * 0.9 - L.vx) * Math.min(1, dt * 1.2);
      L.vz += (f.z * 0.9 - L.vz) * Math.min(1, dt * 1.2);
      g.position.x += L.vx * dt; g.position.z += L.vz * dt;
      g.position.y = level + 0.02 + Math.sin(t * 1.6 + L.ph) * 0.008;
      g.rotation.y += L.spin * dt;
      g.rotation.z = Math.sin(t * 1.3 + L.ph) * 0.04;
      if (!field.inside(g.position.x, g.position.z)) { this.group.remove(g); this.items.splice(i, 1); }
    }
  }
  /** Light positions for the water's glitter. */
  lights(out) { for (const L of this.items) out.push({ x: L.g.position.x, y: L.g.position.y + 0.12, z: L.g.position.z, i: 0.7 }); return out; }
  setNight(n) { this.paper.emissiveIntensity = 0.2 + n * 1.6; }
  clear() { for (const L of this.items) this.group.remove(L.g); this.items.length = 0; }
}

/* ---------------- fireflies ---------------- */

export class Fireflies {
  constructor(spots, n = 70, rnd = Math.random) {
    this.n = n;
    this.base = new Float32Array(n * 3);
    this.p = new Float32Array(n * 3);
    this.glow = new Float32Array(n);
    this.ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = spots[i % spots.length];
      this.base.set([s.x + (rnd() - 0.5) * 3, s.y + 0.3 + rnd() * 1.2, s.z + (rnd() - 0.5) * 2], i * 3);
      // Kansai Genji fireflies flash about every 2 s; neighbours drift into step
      this.ph[i] = Math.floor(rnd() * 3) * 0.33 + rnd() * 0.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aGlow', new THREE.BufferAttribute(this.glow, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 260 } },
      vertexShader: 'attribute float aGlow; varying float vG; uniform float uScale; void main(){ vG = aGlow; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = (2. + aGlow * 9.) * uScale / max(0.2, -mv.z) * 0.08; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vG; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0., r) * vG; gl_FragColor = vec4(vec3(0.75, 1., 0.35) * a * 1.6, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }
  update(dt, t, on) {
    this.points.visible = on > 0.01;
    if (!this.points.visible) return;
    for (let i = 0; i < this.n; i++) {
      const o = i * 3;
      this.p[o] = this.base[o] + Math.sin(t * 0.3 + i) * 0.4;
      this.p[o + 1] = this.base[o + 1] + Math.sin(t * 0.5 + i * 1.7) * 0.15;
      this.p[o + 2] = this.base[o + 2] + Math.cos(t * 0.27 + i * 0.6) * 0.4;
      const c = ((t / 2 + this.ph[i]) % 1 + 1) % 1;
      this.glow[i] = on * (c < 0.25 ? Math.sin((c / 0.25) * Math.PI) : 0.05);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aGlow.needsUpdate = true;
  }
}

/* ---------------- dawn mist and rain ---------------- */

export class Mist {
  constructor(centre, n = 7) {
    this.group = new THREE.Group();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uA: { value: 0 }, uCol: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform float uTime, uA; uniform vec3 uCol; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
        void main(){ vec2 p = vUv * vec2(4., 1.5) + vec2(uTime * 0.03, 0.); float v = n(p) * 0.6 + n(p * 2.3) * 0.4;
          float e = smoothstep(0., 0.3, vUv.x) * smoothstep(1., 0.7, vUv.x) * smoothstep(0., 0.4, vUv.y) * smoothstep(1., 0.5, vUv.y);
          float a = v * e * uA; gl_FragColor = vec4(uCol * a, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide
    });
    this.planes = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), this.mat);
      m.position.set(centre.x - 12 + i * 4, centre.y + 0.35 + (i % 3) * 0.18, centre.zAt(centre.x - 12 + i * 4) + ((i % 2) - 0.5) * 2);
      m.rotation.y = (i % 2) * 0.3;
      this.planes.push({ m, x0: m.position.x });
      this.group.add(m);
    }
  }
  update(dt, t, amount, col, cam) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uA.value = amount * 0.55;
    this.mat.uniforms.uCol.value.copy(col);
    this.group.visible = amount > 0.01;
    for (const p of this.planes) {
      p.m.position.x = p.x0 + ((t * 0.15) % 4);
      if (cam) p.m.rotation.y = Math.atan2(cam.position.x - p.m.position.x, cam.position.z - p.m.position.z);
    }
  }
}

export class Rain {
  constructor(n = 1400, box = { x: 15, z: 11, h: 7 }) {
    this.n = n; this.box = box;
    this.pos = new Float32Array(n * 6);
    this.seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.seed.set([Math.random(), Math.random(), Math.random()], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc8d4e0, transparent: true, opacity: 0.35, depthWrite: false }));
    this.lines.frustumCulled = false;
    this.lines.visible = false;
  }
  update(dt, t, amount) {
    this.lines.visible = amount > 0.02;
    if (!this.lines.visible) return;
    const { x, z, h } = this.box, n = Math.floor(this.n * amount);
    this.lines.geometry.setDrawRange(0, n * 2);
    for (let i = 0; i < n; i++) {
      const s = i * 3, o = i * 6;
      const px = (this.seed[s] - 0.5) * 2 * x, pz = (this.seed[s + 1] - 0.5) * 2 * z;
      const py = h - ((t * 7 + this.seed[s + 2] * h) % h);
      this.pos[o] = px; this.pos[o + 1] = py; this.pos[o + 2] = pz;
      this.pos[o + 3] = px + 0.02; this.pos[o + 4] = py + 0.22; this.pos[o + 5] = pz;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }
}
