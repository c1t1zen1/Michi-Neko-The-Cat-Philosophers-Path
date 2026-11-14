// Summit weather particles (天上), split out of src/mountaintop.js:
// summit-local snow and rain (the valley's are hidden on the summit), pollen
// riding the gusts, and the sakura petal drift. The facade's update() moves
// snow, rain and pollen each frame; the petals update here.
// SummitManager (src/mountaintop.js) delegates to these methods with
// `this` = the manager, so the code reads exactly as it did in the class.

import * as THREE from 'three';
import { glowTexture } from '../textures.js?v=20261107a';
import { summitWeatherAmount, summitFootprint } from './common.js?v=20261107a';

export const weatherMethods = {
  // Each build*() is the §3.4 split: a layout step (every this.rng() draw, in
  // the classic order, and the footprint), then placeAsset() with the classic
  // mesh step, mesh*Classic(layout), which builds exactly what it always did.
  // The particle seeds stay on the manager: update() reads them in both sets.

  /**
   * Summit-local snow. The valley's snowfall is a scene child and gets hidden
   * by setValleyVisible(), so a mountain-top 'snow' weather would otherwise
   * render nothing at all. This one lives in the summit group and drifts with
   * the same gusts as the grass.
   */
  buildSummitSnow() {
    const count = 620;
    const pos = new Float32Array(count * 3);
    this._snowSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (this.rng() - 0.5) * 62;
      pos[i * 3 + 1] = this.rng() * 26;
      pos[i * 3 + 2] = (this.rng() - 0.5) * 62;
      this._snowSeeds[i * 3] = this.rng() * 100;              // phase
      this._snowSeeds[i * 3 + 1] = 0.55 + this.rng() * 0.7;   // fall speed
      this._snowSeeds[i * 3 + 2] = 0.6 + this.rng() * 0.9;    // flutter amp
    }
    const layout = {
      index: 0, name: 'Summit Snowfall', x: 0, y: 0, z: 0, positions: pos,
      footprint: summitFootprint(), bind: { snow: 'flakes' }
    };
    return this.placeAsset('summit-snow', layout, () => weatherMethods.meshSummitSnowClassic.call(this, layout));
  },

  meshSummitSnowClassic(layout) {
    const geo = new THREE.BufferGeometry();
    const pos = layout.positions;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 12, 0), 60);
    this.snowMat = new THREE.PointsMaterial({
      map: glowTexture(255, 255, 255, 48),
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.snow = new THREE.Points(geo, this.snowMat);
    this.snow.name = 'Summit Snowfall';
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.group.add(this.snow);
  },

  /** Scatter the live flakes through the column above the cat. */
  reseedSnow() {
    const sp = this.snow.geometry.attributes.position;
    const cx = this._localPlayer.x, cz = this._localPlayer.z;
    for (let i = 0; i < sp.count; i++) {
      sp.setXYZ(
        i,
        cx + (this.rng() - 0.5) * 66,
        this.rng() * 26,
        cz + (this.rng() - 0.5) * 66
      );
    }
    sp.needsUpdate = true;
  },

  makeRainStreakTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 64);
    const fade = ctx.createLinearGradient(0, 0, 0, 64);
    fade.addColorStop(0, 'rgba(210,232,248,0)');
    fade.addColorStop(0.18, 'rgba(210,232,248,0.82)');
    fade.addColorStop(1, 'rgba(167,205,235,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(14, 0, 3, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  /** Summit-local rain; the hidden valley particle system cannot be reused. */
  buildSummitRain() {
    const count = this.previewQuality ? 360 : 760;
    const pos = new Float32Array(count * 3);
    this._rainSeeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (this.rng() - 0.5) * 54;
      pos[i * 3 + 1] = this.rng() * 19;
      pos[i * 3 + 2] = (this.rng() - 0.5) * 54;
      this._rainSeeds[i * 2] = 14 + this.rng() * 11;
      this._rainSeeds[i * 2 + 1] = this.rng() * 100;
    }
    const layout = {
      index: 0, name: 'Summit Rainfall', x: 0, y: 0, z: 0, positions: pos,
      footprint: summitFootprint(), bind: { rain: 'drops' }
    };
    return this.placeAsset('summit-rain', layout, () => weatherMethods.meshSummitRainClassic.call(this, layout));
  },

  meshSummitRainClassic(layout) {
    const geo = new THREE.BufferGeometry();
    const pos = layout.positions;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 9, 0), 52);
    const mat = new THREE.PointsMaterial({
      map: this.makeRainStreakTexture(), color: 0xaacbea,
      size: 0.82, transparent: true, opacity: 0,
      depthWrite: false, sizeAttenuation: true, fog: true
    });
    const rain = new THREE.Points(geo, mat);
    rain.name = 'Summit Rainfall';
    rain.frustumCulled = false;
    rain.visible = false;
    this.group.add(rain);
    this.rain = rain;
    this.rainMat = mat;
  },

  reseedRain() {
    const rp = this.rain.geometry.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      rp.setXYZ(
        i,
        this._localPlayer.x + (this.rng() - 0.5) * 56,
        3 + this.rng() * 19,
        this._localPlayer.z + (this.rng() - 0.5) * 56
      );
    }
    rp.needsUpdate = true;
  },

  buildPollen() {
    // Grass pollen / seeds riding the gusts — visible wind.
    const count = 90;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (this.rng() - 0.5) * 56;
      pos[i * 3 + 1] = 0.15 + this.rng() * 2.6;
      pos[i * 3 + 2] = (this.rng() - 0.5) * 56;
    }
    const layout = {
      index: 0, name: 'Summit Pollen', x: 0, y: 0, z: 0, positions: pos,
      footprint: summitFootprint(), bind: { pollen: 'pollen' }
    };
    return this.placeAsset('summit-pollen', layout, () => weatherMethods.meshPollenClassic.call(this, layout));
  },

  meshPollenClassic(layout) {
    const geo = new THREE.BufferGeometry();
    const pos = layout.positions;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: glowTexture(255, 246, 214, 32),
      size: 0.14, transparent: true, opacity: 0.65,
      depthWrite: false, blending: THREE.AdditiveBlending,
      color: 0xfff3c8
    });
    this.pollen = new THREE.Points(geo, mat);
    this.pollen.name = 'Summit Pollen';
    this.group.add(this.pollen);
  },

  makePetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    const blush = ctx.createRadialGradient(13, 13, 1, 16, 16, 14);
    blush.addColorStop(0, 'rgba(255,249,244,1)');
    blush.addColorStop(0.55, 'rgba(249,185,203,0.96)');
    blush.addColorStop(1, 'rgba(222,116,151,0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.ellipse(16, 16, 7.5, 13, -0.48, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  /** A sparse ribbon of petals blown from the sakura across the clearing. */
  buildSakuraPetals() {
    const count = this.previewQuality ? 26 : 76;
    const positions = new Float32Array(count * 3);
    this._petalSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -12 + this.rng() * 24;
      positions[i * 3 + 1] = 0.22 + this.rng() * 5.6;
      positions[i * 3 + 2] = -4 + this.rng() * 15;
      this._petalSeeds[i * 3] = this.rng() * Math.PI * 2;
      this._petalSeeds[i * 3 + 1] = 0.28 + this.rng() * 0.5;
      this._petalSeeds[i * 3 + 2] = 0.16 + this.rng() * 0.32;
    }
    const layout = {
      index: 0, name: 'Summit Sakura Drift', x: 0, y: 0, z: 0, positions,
      footprint: summitFootprint(), bind: { petals: 'petals' }
    };
    return this.placeAsset('summit-petals', layout, () => weatherMethods.meshSakuraPetalsClassic.call(this, layout));
  },

  meshSakuraPetalsClassic(layout) {
    const geo = new THREE.BufferGeometry();
    const positions = layout.positions;
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2.8, 3.5), 19);
    this.petalMat = new THREE.PointsMaterial({
      map: this.makePetalTexture(), color: 0xffcad8,
      size: 0.16, transparent: true, opacity: 0.7,
      depthWrite: false, sizeAttenuation: true
    });
    this.petals = new THREE.Points(geo, this.petalMat);
    this.petals.name = 'Summit Sakura Drift';
    this.group.add(this.petals);
  },

  updateSakuraPetals(dt, t, sky) {
    if (!this.petals || !this.petalMat) return;
    const targetOpacity = 0.7 * (1 - summitWeatherAmount(sky, 'snow'));
    this.petalMat.opacity += (targetOpacity - this.petalMat.opacity) * Math.min(1, dt * 1.2);
    this.petals.visible = this.petalMat.opacity > 0.01;
    if (!this.petals.visible) return;
    const pos = this.petals.geometry.attributes.position;
    const motion = this._reducedMotion ? 0.2 : 1;
    const gust = (0.52 + 0.16 * Math.sin(t * 0.31) + 0.1 * Math.sin(t * 0.83)) * motion;
    for (let i = 0; i < pos.count; i++) {
      const phase = this._petalSeeds[i * 3];
      const speed = this._petalSeeds[i * 3 + 1];
      const flutter = this._petalSeeds[i * 3 + 2];
      let x = pos.getX(i) + gust * speed * dt;
      let y = pos.getY(i) - (0.045 + speed * 0.035) * dt * motion + Math.sin(t * 1.7 + phase) * dt * flutter * motion;
      let z = pos.getZ(i) + Math.cos(t * 0.74 + phase) * dt * flutter * 0.45 * motion;
      if (x > 13 || y < 0.14 || z > 12.5 || z < -5.5) {
        x = -12.5 - this.rng() * 1.5;
        y = 1.1 + this.rng() * 4.9;
        z = -3.5 + this.rng() * 14;
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }
};
