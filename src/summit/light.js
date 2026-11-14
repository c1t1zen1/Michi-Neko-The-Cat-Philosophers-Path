// Summit lights and the shrine-side beacon (天上), split out of
// src/mountaintop.js. The open-sky and warm rim fills light the clearing; the
// god-rays and ground glow behind the valley shrine mark the unlocked path.
// SummitManager (src/mountaintop.js) delegates to these methods with
// `this` = the manager, so the code reads exactly as it did in the class.

import * as THREE from 'three';
import { glowTexture } from '../textures.js?v=20261113a';
import { summitFootprint } from './common.js?v=20261113a';

export const lightMethods = {
  // Each build*() is the §3.4 split: a layout step (every this.rng() draw, in
  // the classic order, and the footprint), then placeAsset() with the classic
  // mesh step, mesh*Classic(layout), which builds exactly what it always did.

  buildSummitLight() {
    const layout = {
      index: 0, x: 0, y: 0, z: 0, footprint: summitFootprint(),
      bind: { summitSkyFill: 'sky_fill', summitWarmFill: 'warm_fill' }
    };
    return this.placeAsset('summit-light', layout, () => lightMethods.meshSummitLightClassic.call(this, layout));
  },

  meshSummitLightClassic(layout) {
    // A high mountain bounce keeps the meadow readable even when the valley
    // clock is near dawn or dusk.  These do not cast another shadow map; the
    // live sky sun still supplies the moving key and all long shadows.
    const skyFill = new THREE.HemisphereLight(0xbfe5ff, 0x5b6638, 1.15);
    skyFill.name = 'Summit Open Sky Fill';
    this.group.add(skyFill);
    this.summitSkyFill = skyFill;

    const warmFill = new THREE.DirectionalLight(0xffedc2, 1.1);
    warmFill.name = 'Summit Warm Rim Fill';
    warmFill.position.set(-32, 42, -18);
    warmFill.castShadow = false;
    warmFill.target.position.set(5, 0, 18);
    this.group.add(warmFill, warmFill.target);
    this.summitWarmFill = warmFill;
  },

  /**
   * God-rays that bloom behind the valley shrine after the tenth bell —
   * the portal marker. This group lives in valley space (scene root),
   * not in the summit group, so it stays anchored to the shrine.
   */
  buildShrineRays() {
    // The beacon's stream draws, in the classic order: per shaft its width,
    // height, pulse phase and base opacity.
    const rays = [];
    for (let i = 0; i < 9; i++) {
      const w = 1.6 + this.rng() * 2.6;
      const h = 17 + this.rng() * 7;
      const phase = this.rng() * Math.PI * 2;
      const baseOpacity = 0.55 + this.rng() * 0.35;
      rays.push({ w, h, phase, baseOpacity });
    }
    const layout = {
      index: 0, name: 'Shrine Summit Rays', space: 'valley', x: 0, y: 0, z: 0, rays,
      footprint: summitFootprint(), bind: { raysGroup: 'beacon' }
    };
    return this.placeAsset('shrine-rays', layout, () => lightMethods.meshShrineRaysClassic.call(this, layout));
  },

  meshShrineRaysClassic(layout) {
    const g = new THREE.Group();
    g.name = 'Shrine Summit Rays';
    const rayTex = this.makeRayTexture();
    const baseY = 0;
    // Fan of leaning shafts rising from behind the shrine roof — kept inside
    // the parted thicket's gap so the light reads through it.
    for (let i = 0; i < 9; i++) {
      const { w, h, phase, baseOpacity } = layout.rays[i];
      const ray = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          map: rayTex, transparent: true, opacity: 0.0,
          blending: THREE.AdditiveBlending, depthWrite: false,
          side: THREE.DoubleSide, fog: false
        })
      );
      const a = (i / 8 - 0.5) * 1.15;
      ray.position.set(Math.sin(a) * 6.8, baseY + 8.5, -39.4 - Math.abs(a) * 2);
      ray.rotation.z = a * 0.55;
      ray.rotation.y = a * 0.4;
      ray.userData.phase = phase;
      ray.userData.baseOpacity = baseOpacity;
      g.add(ray);
      this._rays = this._rays || [];
      this._rays.push(ray);
    }
    // A soft bloom in the gap — light flooding through, readable against
    // the fog where thin shafts alone would wash out.
    const bloom = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(255, 236, 190, 64), transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    bloom.position.set(0, baseY + 5.2, -38.6);
    bloom.scale.set(15, 10, 1);
    bloom.userData.phase = 1.7;
    bloom.userData.baseOpacity = 0.5;
    g.add(bloom);
    this._rays.push(bloom);
    // Ground glow where the light pools
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 28),
      new THREE.MeshBasicMaterial({
        map: glowTexture(255, 232, 176, 64), transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, baseY + 0.06, -40.4);
    pool.userData.phase = 0;
    pool.userData.baseOpacity = 0.55;
    g.add(pool);
    this._rays.push(pool);

    g.visible = false;
    this.scene.add(g);
    this.raysGroup = g;
  },

  makeRayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gx = ctx.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, 'rgba(255,238,190,0)');
    gx.addColorStop(0.5, 'rgba(255,238,190,0.85)');
    gx.addColorStop(1, 'rgba(255,238,190,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, 64, 256);
    const gy = ctx.createLinearGradient(0, 256, 0, 0);
    gy.addColorStop(0, 'rgba(255,255,255,1)');
    gy.addColorStop(0.75, 'rgba(255,255,255,0.55)');
    gy.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, 64, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
};
