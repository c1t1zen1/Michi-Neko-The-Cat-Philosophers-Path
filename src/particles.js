import * as THREE from 'three';

export class Particles {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.time = 0;
    this.buildPetals();
    this.buildFireflies();
    this.buildMotes();
    this.buildRiverPetals();
    this.buildSnow();
    this.buildRain();
  }

  /** Rain streaks: vertical line segments that follow the player. */
  buildRain() {
    const count = 1100;
    this.rainCount = count;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 2 * 3);
    this.rainSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.rainSeeds[i * 3] = Math.random() * 100;
      this.rainSeeds[i * 3 + 1] = 17 + Math.random() * 9;      // fall speed m/s
      this.rainSeeds[i * 3 + 2] = 0.55 + Math.random() * 0.45; // streak length scale
      const x = (Math.random() - 0.5) * 44;
      const y = Math.random() * 16;
      const z = (Math.random() - 0.5) * 44;
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x; pos[i * 6 + 4] = y + 0.4; pos[i * 6 + 5] = z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xaac8e8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true
    });
    this.rain = new THREE.LineSegments(geo, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  updateRain(dt, playerPos, sky) {
    // Rain amount blends between outgoing/incoming weather states
    let rainAmt = 0;
    if (sky) {
      const isR = (w) => (w === 'rain' ? 1 : 0);
      const from = isR(sky.weather);
      const to = isR(sky.targetWeather != null ? sky.targetWeather : sky.weather);
      const b = typeof sky.weatherBlend === 'number' ? sky.weatherBlend : 1;
      rainAmt = from * (1 - b) + to * b;
    }
    const targetOpacity = rainAmt * 0.34;
    this.rainMat.opacity += (targetOpacity - this.rainMat.opacity) * Math.min(1, dt * 2.2);
    this.rain.visible = this.rainMat.opacity > 0.01;
    if (!this.rain.visible) return;

    const sp = this.rain.geometry.attributes.position;
    const cx = playerPos ? playerPos.x : 0;
    const cz = playerPos ? playerPos.z : 0;
    const windX = 2.4;

    for (let i = 0; i < this.rainCount; i++) {
      const speed = this.rainSeeds[i * 3 + 1];
      const lenScale = this.rainSeeds[i * 3 + 2];
      let x = sp.getX(i * 2);
      let y = sp.getY(i * 2);
      let z = sp.getZ(i * 2);

      y -= speed * dt;
      x += windX * dt;

      if (y < 0 || Math.abs(x - cx) > 26 || Math.abs(z - cz) > 26) {
        x = cx + (Math.random() - 0.5) * 46;
        z = cz + (Math.random() - 0.5) * 46;
        y = 12 + Math.random() * 7;
      }
      const len = speed * 0.032 * lenScale;
      sp.setXYZ(i * 2, x, y, z);
      sp.setXYZ(i * 2 + 1, x - windX * 0.02, y + len, z);
    }
    sp.needsUpdate = true;
  }

  buildRiverPetals() {
    const count = 90;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.riverSeeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -55 + Math.random() * 120;
      pos[i * 3 + 1] = 0.05;
      pos[i * 3 + 2] = 29.5 + (Math.random() - 0.5) * 5.5;
      this.riverSeeds[i * 2] = Math.random() * 100;
      this.riverSeeds[i * 2 + 1] = 0.6 + Math.random() * 0.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.petalTexture(),
      size: 0.14,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.riverPetals = new THREE.Points(geo, mat);
    this.riverPetals.frustumCulled = false;
    this.scene.add(this.riverPetals);
  }

  petalTexture() {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(248, 190, 205, 1)';
    ctx.beginPath();
    ctx.ellipse(16, 16, 10, 6, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 225, 235, 0.9)';
    ctx.beginPath();
    ctx.ellipse(14, 14, 6, 3.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  glowTexture(color = '255, 220, 150') {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, `rgba(${color}, 1)`);
    g.addColorStop(0.4, `rgba(${color}, 0.4)`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }

  buildPetals() {
    const count = 350;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.petalSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = Math.random() * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
      this.petalSeeds[i * 3] = Math.random() * 100;
      this.petalSeeds[i * 3 + 1] = 0.4 + Math.random() * 0.7;
      this.petalSeeds[i * 3 + 2] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.petalTexture(),
      size: 0.16,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.petals = new THREE.Points(geo, mat);
    this.petals.frustumCulled = false;
    this.scene.add(this.petals);
  }

  buildFireflies() {
    const count = 70;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.fireflySeeds = new Float32Array(count * 3);
    const zones = [[-24, 14], [10, 26], [0, 31], [26, 4], [0, -26]];
    for (let i = 0; i < count; i++) {
      const [zx, zz] = zones[i % zones.length];
      pos[i * 3] = zx + (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = 0.4 + Math.random() * 1.6;
      pos[i * 3 + 2] = zz + (Math.random() - 0.5) * 12;
      this.fireflySeeds[i * 3] = Math.random() * 100;
      this.fireflySeeds[i * 3 + 1] = 0.5 + Math.random();
      this.fireflySeeds[i * 3 + 2] = pos[i * 3 + 1];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireflyMat = new THREE.PointsMaterial({
      map: this.glowTexture('255, 230, 140'),
      size: 0.28,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.fireflies = new THREE.Points(geo, this.fireflyMat);
    this.fireflies.frustumCulled = false;
    this.scene.add(this.fireflies);
  }

  buildMotes() {
    const count = 140;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.moteSeeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = 0.3 + Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      this.moteSeeds[i * 2] = Math.random() * 100;
      this.moteSeeds[i * 2 + 1] = 0.2 + Math.random() * 0.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.glowTexture('255, 240, 210'),
      size: 0.09,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.motes = new THREE.Points(geo, mat);
    this.motes.frustumCulled = false;
    this.scene.add(this.motes);
  }

  snowTexture() {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 14);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.35, 'rgba(235, 245, 255, 0.7)');
    g.addColorStop(0.8, 'rgba(215, 235, 255, 0.2)');
    g.addColorStop(1, 'rgba(200, 225, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }

  buildSnow() {
    const count = 900;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.snowSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      this.snowSeeds[i * 3] = Math.random() * 100;
      this.snowSeeds[i * 3 + 1] = 0.65 + Math.random() * 0.75; // Soft gentle fall speed (0.65 - 1.4 m/s)
      this.snowSeeds[i * 3 + 2] = 0.6 + Math.random() * 0.8;  // Flutter amp
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snowMat = new THREE.PointsMaterial({
      map: this.snowTexture(),
      color: 0xffffff,
      size: 0.32,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    this.snow = new THREE.Points(geo, this.snowMat);
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  updateSnow(dt, playerPos, sky) {
    const snowing = sky && (sky.weather === 'snow' || (sky.weather === 'cloudy' && sky.weatherBlend > 0.6));
    const target = snowing ? 0.85 : 0;
    this.snowMat.opacity += (target - this.snowMat.opacity) * dt * 1.5;

    const sp = this.snow.geometry.attributes.position;
    const cx = playerPos ? playerPos.x : 0;
    const cz = playerPos ? playerPos.z : 0;
    const t = this.time;

    for (let i = 0; i < sp.count; i++) {
      const seed = this.snowSeeds[i * 3];
      const fallSpeed = this.snowSeeds[i * 3 + 1];
      const amp = this.snowSeeds[i * 3 + 2];

      let x = sp.getX(i) + Math.sin(t * 1.4 + seed) * dt * 0.55 * amp;
      let y = sp.getY(i) - fallSpeed * dt;
      let z = sp.getZ(i) + Math.cos(t * 1.1 + seed * 1.3) * dt * 0.45 * amp;

      if (y < 0.05) {
        y = 18 + Math.random() * 5;
        x = cx + (Math.random() - 0.5) * 75;
        z = cz + (Math.random() - 0.5) * 75;
      }
      sp.setXYZ(i, x, y, z);
    }
    sp.needsUpdate = true;
  }

  update(dt, playerPos, sky = null) {
    this.time += dt;
    const t = this.time;

    this.updateSnow(dt, playerPos, sky);
    this.updateRain(dt, playerPos, sky);

    const sunUp = sky ? Math.max(0, sky.sunDir.y) : 1;
    const raining = sky && sky.weather === 'rain';

    const pp = this.petals.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const seed = this.petalSeeds[i * 3];
      const fall = this.petalSeeds[i * 3 + 1];
      const ph = this.petalSeeds[i * 3 + 2];
      let y = pp.getY(i) - fall * dt;
      let x = pp.getX(i) + Math.sin(t * 1.4 + seed) * dt * 1.1 + dt * 0.35;
      let z = pp.getZ(i) + Math.cos(t * 1.1 + ph) * dt * 0.9;
      if (y < 0.05) {
        y = 9 + Math.random() * 4;
        x = (playerPos ? playerPos.x : 0) + (Math.random() - 0.5) * 60;
        z = (playerPos ? playerPos.z : 0) + (Math.random() - 0.5) * 60;
      }
      pp.setXYZ(i, x, y, z);
    }
    pp.needsUpdate = true;

    const fp = this.fireflies.geometry.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const seed = this.fireflySeeds[i * 3];
      const speed = this.fireflySeeds[i * 3 + 1];
      const baseY = this.fireflySeeds[i * 3 + 2];
      fp.setX(i, fp.getX(i) + Math.sin(t * speed + seed) * dt * 0.7);
      fp.setZ(i, fp.getZ(i) + Math.cos(t * speed * 0.8 + seed * 1.3) * dt * 0.7);
      fp.setY(i, baseY + Math.sin(t * speed * 1.6 + seed * 2) * 0.35);
    }
    fp.needsUpdate = true;
    const nightness = sky ? Math.max(0, 1 - Math.max(0, sky.sunDir.y) * 6) : 0.5;
    this.fireflyMat.opacity = (0.65 + Math.sin(t * 2.4) * 0.3) * nightness * (raining ? 0.2 : 1);

    const rp = this.riverPetals.geometry.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const seed = this.riverSeeds[i * 2];
      const speed = this.riverSeeds[i * 2 + 1];
      let x = rp.getX(i) + dt * speed * 1.2;
      if (x > 65) x = -55;
      rp.setX(i, x);
      rp.setZ(i, rp.getZ(i) + Math.sin(t * 1.8 + seed) * dt * 0.3);
      rp.setY(i, 0.05 + Math.sin(t * 2.2 + seed) * 0.015);
    }
    rp.needsUpdate = true;

    const mp = this.motes.geometry.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const seed = this.moteSeeds[i * 2];
      const speed = this.moteSeeds[i * 2 + 1];
      mp.setX(i, mp.getX(i) + Math.sin(t * speed + seed) * dt * 0.25 + dt * 0.12);
      mp.setY(i, mp.getY(i) + Math.cos(t * speed * 0.7 + seed) * dt * 0.12);
      if (playerPos && mp.getX(i) - playerPos.x > 30) mp.setX(i, playerPos.x - 28);
    }
    mp.needsUpdate = true;
  }
}
