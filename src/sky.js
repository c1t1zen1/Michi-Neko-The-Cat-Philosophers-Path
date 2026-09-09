import * as THREE from 'three';

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;

    this.dayTime = 9.5;          // 0..24 hour cycle (bright Ghibli morning)
    this.cycleSpeed = 24 / 3600; // 1 full day in 60 minutes (3600s)
    this.sunDir = new THREE.Vector3(-0.55, 0.28, -0.79).normalize();

    this.buildDome();
    this.buildClouds();
    this.buildStars();
    this.buildMoon();
    this.buildLights();

    this.weather = 'clear';
    this.previousWeather = 'clear';
    this.weatherTimer = 450;
    this.weatherBlend = 1;
    this.targetWeather = 'clear';
    this.weatherDurations = { clear: 600, cloudy: 420, snow: 300, mist: 360, rain: 300 };

    this.palettes = this.buildPalettes();
    // Material fog is kept faint and distant: the screen-space atmosphere
    // pass (height fog + sun in-scatter) now paints most of the aerial
    // perspective, and it needs the far ridges to still carry their colour.
    scene.fog = new THREE.Fog(0xf2b98a, 110, 420);

    this.envTimer = 0;
    this.envInterval = 25;
    this.envPaused = false;
    this.pmrem = null;
    this.envScene = null;
  }

  /**
   * Give the sky a renderer so it can bake itself into a prefiltered
   * environment map. Roof tiles, water, lacquer and metal then reflect the
   * real sky gradient and the sun disc instead of a flat ambient term.
   */
  attachRenderer(renderer) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.envScene = new THREE.Scene();
    this.envDome = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), this.makeDomeMaterial(0.72));
    this.envScene.add(this.envDome);
    this.refreshEnvironment();
  }

  refreshEnvironment() {
    if (!this.pmrem || !this.envScene) return;
    const target = this.pmrem.fromScene(this.envScene, 0.04);
    if (this.envTarget) this.envTarget.dispose();
    this.envTarget = target;
    this.scene.environment = target.texture;
  }

  /**
   * True when the sky signature (sun elevation band + weather + blend) has
   * moved far enough from the last environment bake to be worth re-baking.
   */
  envDrifted() {
    const sig = Math.round(this.sunDir.y * 40) + '|' + this.weather + '|' +
      Math.round((this.weatherBlend != null ? this.weatherBlend : 1) * 4);
    if (sig === this._envSig) return false;
    this._envSig = sig;
    return true;
  }

  /**
   * While the cat is inside the tea house the room only needs its own point
   * lights + the hemisphere fill. Tighten the sun's shadow frustum to the
   * room so the shadow pass culls the whole valley (which sits far outside
   * the small ortho box) instead of re-rendering it every frame.
   */
  setInteriorShadowMode(on) {
    if (this._interiorShadow === on) return;
    this._interiorShadow = on;
    const c = this.sun.shadow.camera;
    const s = on ? 10 : 38;
    c.left = -s;
    c.right = s;
    c.top = s;
    c.bottom = -s;
    c.near = on ? 100 : 60;
    c.far = on ? 180 : 240;
    c.updateProjectionMatrix();
    this.sun.shadow.needsUpdate = true;
  }

  makeDomeMaterial(exposure = 1.0) {
    const uniforms = {
      topColor: { value: new THREE.Color(0x4a6a9e) },
      midColor: { value: new THREE.Color(0xc98a7a) },
      horizonColor: { value: new THREE.Color(0xffc98a) },
      warmColor: { value: new THREE.Color(0xffb264) },
      sunDir: { value: this.sunDir },
      sunColor: { value: new THREE.Color(0xffe6b8) },
      uExposure: { value: exposure },
      uTime: { value: 0 }
    };
    if (!this.domeUniforms) this.domeUniforms = [];
    this.domeUniforms.push(uniforms);
    return new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 warmColor;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform float uExposure;
        uniform float uTime;
        varying vec3 vDir;

        float skyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float skyNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), f.x),
                     mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -0.05, 1.0);
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.22, h));
          col = mix(col, topColor, smoothstep(0.18, 0.62, h));

          // Warm golden ring hugging the horizon, strongest toward the sun's
          // azimuth — the staple Ghibli sunset wrap.
          vec2 dxz = normalize(d.xz + vec2(1e-5));
          vec2 sxz = normalize(sunDir.xz + vec2(1e-5));
          float azimuth = max(dot(dxz, sxz), 0.0);
          float band = pow(max(0.0, 1.0 - abs(d.y - 0.02)), 3.0);
          col += warmColor * band * (0.16 + 0.84 * pow(azimuth, 2.2));
          col += warmColor * pow(azimuth, 6.0) * exp(-max(d.y, 0.0) * 3.0) * 0.5;

          // High, thin painted cirrus veil: soft streaks that catch the warm
          // horizon light and give the upper sky a brushed texture.
          float az = atan(d.z, d.x);
          vec2 cp = vec2(az * 3.2 + uTime * 0.004, d.y * 9.0);
          float cirrus = skyNoise(cp) * 0.6 + skyNoise(cp * 2.3 + 7.1) * 0.4;
          cirrus = smoothstep(0.52, 0.85, cirrus) * smoothstep(0.08, 0.35, d.y) * (1.0 - smoothstep(0.55, 0.9, d.y));
          vec3 cirrusCol = mix(topColor * 1.35 + 0.18, warmColor, pow(azimuth, 1.5) * 0.6 + 0.2);
          col = mix(col, cirrusCol, cirrus * 0.32);

          // Sun: hot dense core, tight corona, broad warm haze.
          float sunAmount = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * pow(sunAmount, 900.0) * 3.2;
          col += sunColor * pow(sunAmount, 350.0) * 1.6;
          col += sunColor * pow(sunAmount, 18.0) * 0.35;
          col += sunColor * pow(sunAmount, 4.0) * 0.12;
          gl_FragColor = vec4(col * uExposure, 1.0);
        }
      `
    });
  }

  buildDome() {
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(240, 48, 28), this.makeDomeMaterial(1.0));
    this.scene.add(this.dome);
  }

  buildCloudTexture(seed = 0) {
    // Painterly cumulus puff: a cluster of soft blobs with baked shading —
    // cool mauve belly shadow, cream body, sun-warmed lower rim — so sprites
    // read as volumetric Ghibli clouds instead of single soft dots. `seed`
    // jitters the lobe layout so the sky is not one cloud repeated.
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    const rnd = (i) => { const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
    const puff = (x, y, r, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
      g.addColorStop(0, color.replace('A', alpha.toFixed(3)));
      g.addColorStop(0.55, color.replace('A', (alpha * 0.55).toFixed(3)));
      g.addColorStop(1, color.replace('A', '0'));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    const base = [
      [128, 88, 58], [84, 78, 44], [172, 76, 46], [58, 96, 34], [198, 96, 36],
      [110, 60, 38], [150, 58, 36], [96, 108, 40], [162, 106, 42], [134, 48, 28], [72, 60, 24]
    ];
    const lobes = base.map(([x, y, r], i) => [
      x + (rnd(i) - 0.5) * 26, y + (rnd(i + 30) - 0.5) * 16, r * (0.8 + rnd(i + 60) * 0.45)
    ]);
    // Cool under-shadow pass first (offset slightly down-left)
    for (const [x, y, r] of lobes) puff(x - 4, y + 12, r * 1.02, 'rgba(122, 102, 138, A)', 0.5);
    // Main cream body pass
    for (const [x, y, r] of lobes) puff(x, y, r, 'rgba(255, 244, 230, A)', 0.92);
    // Bright crown highlights
    for (const [x, y, r] of lobes.slice(1, 7)) puff(x + 2, y - 6, r * 0.6, 'rgba(255, 252, 246, A)', 0.85);
    // Golden lower rim (sun-kissed belly)
    for (const [x, y, r] of [lobes[0], lobes[3], lobes[4], lobes[7], lobes[8]]) puff(x + 3, y + 9, r * 0.8, 'rgba(255, 196, 140, A)', 0.55);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildClouds() {
    const texVariants = [this.buildCloudTexture(0), this.buildCloudTexture(1), this.buildCloudTexture(2)];

    this.clouds = [];
    // Clouds are placed by bearing and elevation so they ride ABOVE the
    // backdrop: the canyon head behind the shrine (-z) tops out near 28°,
    // the flank hills near 10°, and the lowland behind the pagoda (+z) is
    // open to the horizon. [bearingDeg (0 = +z pagoda, 180 = -z shrine),
    // elevationDeg, distance, spriteW, spriteH, mirror]
    const defs = [
      // Towering cumulus stacked over the canyon head
      [150, 36, 190, 120, 42, 0], [175, 42, 200, 150, 52, 1], [200, 35, 185, 110, 40, 0],
      [162, 50, 205, 95, 34, 1], [190, 56, 210, 105, 36, 0], [215, 40, 195, 90, 32, 1],
      // Flank cumulus above the eastern and western hills
      [95, 22, 185, 100, 36, 0], [120, 30, 190, 85, 30, 1], [265, 24, 185, 105, 38, 1],
      [240, 31, 195, 90, 32, 0], [75, 16, 180, 80, 28, 1], [285, 17, 180, 78, 26, 0],
      // Big open sky behind the pagoda: low, wide fair-weather clouds
      [0, 12, 195, 140, 46, 0], [22, 20, 190, 110, 38, 1], [-25, 9, 200, 125, 42, 0],
      [45, 15, 185, 95, 32, 1], [-48, 18, 190, 90, 30, 0], [12, 30, 200, 100, 34, 1],
      // Horizon streak bands: very wide, low, thin layers
      [175, 31, 205, 230, 12, 0], [130, 24, 200, 200, 10, 1], [220, 25, 200, 190, 10, 0],
      [5, 4, 215, 240, 11, 1], [-35, 6, 210, 200, 9, 0], [40, 5, 210, 190, 10, 1],
      [95, 12, 205, 180, 9, 0], [265, 13, 205, 180, 9, 1]
    ];
    for (let i = 0; i < defs.length; i++) {
      const [bearing, elevation, dist, w, h, mirror] = defs[i];
      const b = THREE.MathUtils.degToRad(bearing);
      const e = THREE.MathUtils.degToRad(elevation);
      const x = Math.sin(b) * Math.cos(e) * dist;
      const y = Math.sin(e) * dist;
      const z = Math.cos(b) * Math.cos(e) * dist;
      const tex = texVariants[i % texVariants.length];
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
      c.position.set(x, y, z);
      c.scale.set(mirror ? -w : w, h, 1);
      c.material.opacity = 0.55 + Math.random() * 0.3;
      this.scene.add(c);
      this.clouds.push(c);
    }
  }

  buildStars() {
    // Twinkling star field settled on the night dome. Each star has its own
    // phase so the sky glitters instead of pulsing as one sheet.
    const count = 420;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Bias toward the upper hemisphere; keep clear of the horizon haze
      const az = Math.random() * Math.PI * 2;
      const el = Math.asin(0.06 + Math.random() * 0.9);
      const r = 225;
      pos[i * 3] = Math.cos(az) * Math.cos(el) * r;
      pos[i * 3 + 1] = Math.sin(el) * r;
      pos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * r;
      phase[i] = Math.random() * Math.PI * 2;
      const big = Math.random() < 0.08;
      size[i] = big ? 2.6 + Math.random() * 1.2 : 0.9 + Math.random() * 1.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        attribute float aPhase;
        attribute float aSize;
        varying float vTwinkle;
        void main() {
          vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + fract(aPhase) * 1.8) + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (1400.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vTwinkle;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), a * uOpacity * vTwinkle);
        }
      `
    });
    this.stars = new THREE.Points(geo, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  buildMoon() {
    // Soft crescent moon riding opposite the sun through the night sky.
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    glow.addColorStop(0, 'rgba(235, 242, 255, 0.55)');
    glow.addColorStop(0.5, 'rgba(200, 215, 245, 0.18)');
    glow.addColorStop(1, 'rgba(190, 205, 240, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#f2f0e2';
    ctx.beginPath();
    ctx.arc(64, 64, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(76, 58, 23, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.moonMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.moon = new THREE.Sprite(this.moonMat);
    this.moon.scale.set(34, 34, 1);
    this.scene.add(this.moon);
  }

  buildLights() {
    this.sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
    this.sun.position.copy(this.sunDir).multiplyScalar(140);
    this.sun.castShadow = true;
    // Tight shadow frustum that follows the cat: 2-4k texels across ~76 m
    // gives crisp contact shadows under eaves, leaves and paws instead of
    // the old soft 140 m smear.
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 60;
    this.sun.shadow.camera.far = 240;
    this.sun.shadow.camera.left = -38;
    this.sun.shadow.camera.right = 38;
    this.sun.shadow.camera.top = 38;
    this.sun.shadow.camera.bottom = -38;
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x8fa5c9, 0x9a7a55, 0.85);
    this.scene.add(this.hemi);

    this.fill = new THREE.DirectionalLight(0x5a4a78, 0.35);
    this.fill.position.set(40, 30, 60);
    this.scene.add(this.fill);

    // Low warm bounce from the sunward horizon — the golden-hour rim light
    // that edges rooves, foliage, and the cat in amber.
    this.bounce = new THREE.DirectionalLight(0xff9a5a, 0.0);
    this.bounce.position.set(-60, 6, -40);
    this.scene.add(this.bounce);
    this.scene.add(this.bounce.target);
  }

  buildPalettes() {
    const c = (hex) => new THREE.Color(hex);
    return {
      day: {
        top: c(0x5b86c6), mid: c(0xe2b09a), horizon: c(0xffd6a0),
        warm: c(0xffb264), sun: c(0xffe6b8), hemiSky: c(0x9ab4d6), hemiGround: c(0x9a7a55), fog: c(0xf2b98a),
        cloud: c(0xfff0e0), cloudOpacity: 0.62
      },
      sunset: {
        top: c(0x4a5aa6), mid: c(0xd07a7a), horizon: c(0xff9a4c),
        warm: c(0xff8838), sun: c(0xffc27a), hemiSky: c(0x9090c0), hemiGround: c(0x6a5a45), fog: c(0xe8935e),
        cloud: c(0xffc4a2), cloudOpacity: 0.7
      },
      night: {
        top: c(0x0c1630), mid: c(0x223658), horizon: c(0x384c72),
        warm: c(0x24355c), sun: c(0x7a90be), hemiSky: c(0x3d5278), hemiGround: c(0x302824), fog: c(0x222c3e),
        cloud: c(0x4a5a76), cloudOpacity: 0.4
      },
      cloudy: {
        top: c(0x5a6a7a), mid: c(0x8a8a98), horizon: c(0xb2b6bd),
        warm: c(0xc4b2a4), sun: c(0xc0c0d0), hemiSky: c(0x707082), hemiGround: c(0x52524d), fog: c(0x9aa0a8),
        cloud: c(0xd0d5db), cloudOpacity: 0.85
      },
      snow: {
        top: c(0x5c708a), mid: c(0x869cb4), horizon: c(0xbac8d6),
        warm: c(0xc8ccd4), sun: c(0xdde8f2), hemiSky: c(0x8298b0), hemiGround: c(0x606a72), fog: c(0xb0c0ce),
        cloud: c(0xeef4fa), cloudOpacity: 0.75
      },
      mist: {
        top: c(0x6a7a8a), mid: c(0x8a9aa8), horizon: c(0xb0c2c9),
        warm: c(0xc2bbae), sun: c(0xc0d0d8), hemiSky: c(0x7a8a98), hemiGround: c(0x5a6058), fog: c(0xb0c0c8),
        cloud: c(0xd8e0e5), cloudOpacity: 0.5
      },
      rain: {
        top: c(0x3d4a58), mid: c(0x5c6a78), horizon: c(0x76848e),
        warm: c(0x8a8e94), sun: c(0x9aa8b4), hemiSky: c(0x5c6c7c), hemiGround: c(0x44483f), fog: c(0x6e7c86),
        cloud: c(0x8894a0), cloudOpacity: 0.94
      }
    };
  }

  lerpColor(a, b, t, out = new THREE.Color()) {
    return out.copy(a).lerp(b, t);
  }

  getDayPhase() {
    const t = this.dayTime / 24;
    let phase, phaseBlend;
    if (t < 0.20) { phase = 'night'; phaseBlend = t / 0.20; }
    else if (t < 0.30) { phase = 'sunrise'; phaseBlend = (t - 0.20) / 0.10; }
    else if (t < 0.72) { phase = 'day'; phaseBlend = Math.min(1, (t - 0.30) / 0.10); }
    else if (t < 0.83) { phase = 'sunset'; phaseBlend = (t - 0.72) / 0.11; }
    else { phase = 'night2'; phaseBlend = (t - 0.83) / 0.17; }
    return { phase, phaseBlend };
  }

  lerpPalette(a, b, t) {
    const out = {};
    for (const k of ['top','mid','horizon','warm','sun','hemiSky','hemiGround','fog','cloud']) {
      out[k] = this.lerpColor(a[k] || a.horizon, b[k] || b.horizon, t, new THREE.Color());
    }
    out.cloudOpacity = a.cloudOpacity + (b.cloudOpacity - a.cloudOpacity) * t;
    return out;
  }

  resolvePalette() {
    const { phase, phaseBlend } = this.getDayPhase();
    const dayPal = this.palettes.day;
    const sunsetPal = this.palettes.sunset;
    const nightPal = this.palettes.night;

    let base;
    if (phase === 'night' || phase === 'night2') base = nightPal;
    else if (phase === 'sunrise') base = this.lerpPalette(nightPal, dayPal, phaseBlend);
    else if (phase === 'sunset') base = this.lerpPalette(dayPal, sunsetPal, phaseBlend);
    else base = dayPal;

    // Clear weather has no palette of its own: it must resolve to the
    // time-of-day base, not the day palette, or nights never turn blue.
    const weatherPal = this.palettes[this.targetWeather] || base;
    const w = this.weatherBlend;
    const out = {};
    for (const k of ['top','mid','horizon','warm','sun','hemiSky','hemiGround','fog','cloud']) {
      const bc = base[k] || dayPal[k];
      const wc = weatherPal[k] || bc;
      out[k] = this.lerpColor(bc, wc, w, new THREE.Color());
    }
    out.cloudOpacity = base.cloudOpacity + (weatherPal.cloudOpacity - base.cloudOpacity) * w;
    return out;
  }

  setWeather(type) {
    if (this.targetWeather === type) return;
    this.previousWeather = this.weather;
    this.targetWeather = type;
    this.weatherBlend = 0;
  }

  getWeatherTransition() {
    return {
      from: this.previousWeather,
      to: this.targetWeather,
      blend: this.weatherBlend
    };
  }

  updateWeather(dt) {
    this.weatherTimer -= dt;
    if (this.weatherBlend < 1) {
      this.weatherBlend = Math.min(1, this.weatherBlend + dt * 0.4);
      if (this.weatherBlend === 1) {
        this.weather = this.targetWeather;
        this.previousWeather = this.weather;
      }
    } else if (this.weatherTimer <= 0) {
      const types = Object.keys(this.weatherDurations).filter(t => t !== this.weather);
      this.previousWeather = this.weather;
      this.targetWeather = types[Math.floor(Math.random() * types.length)];
      this.weatherBlend = 0;
      this.weatherTimer = this.weatherDurations[this.weather] || 30;
    }
  }

  updateDayNight(dt, playerPos) {
    this.dayTime += dt * this.cycleSpeed;
    if (this.dayTime >= 24) this.dayTime -= 24;

    // Asymmetric sun path: 13.2h of daylight (6:00–19:12), 10.8h of night.
    // This stretches the golden afternoon so the world glows like the
    // reference art instead of plunging into dusk at 16:30.
    const dayStart = 6.0, dayEnd = 19.2;
    let angle;
    if (this.dayTime >= dayStart && this.dayTime <= dayEnd) {
      angle = ((this.dayTime - dayStart) / (dayEnd - dayStart)) * Math.PI;
    } else {
      const nightT = this.dayTime < dayStart ? this.dayTime + 24 - dayEnd : this.dayTime - dayEnd;
      angle = Math.PI + (nightT / (24 - (dayEnd - dayStart))) * Math.PI;
    }
    // The arc leans south (+z) so the north-facing street and shrine
    // facades are front-lit through the afternoon.
    this.sunDir.set(Math.cos(angle), Math.sin(angle), 0.5).normalize();

    if (playerPos) {
      this.dome.position.copy(playerPos);
      this.sun.target.position.copy(playerPos);
      // Shadow-casting direction keeps a minimum elevation so the forest
      // wall does not blanket the whole valley in shadow at golden hour
      const shadowDir = this._shadowDir || (this._shadowDir = new THREE.Vector3());
      shadowDir.copy(this.sunDir);
      if (shadowDir.y > 0 && shadowDir.y < 0.3) shadowDir.y = 0.3;
      shadowDir.normalize();
      this.sun.position.copy(playerPos).addScaledVector(shadowDir, 140);
    }

    const sunY = this.sunDir.y;
    const sunUp = Math.max(0, sunY);
    const moonUp = Math.max(0, -sunY * 1.4);
    // Golden-hour band: full strength while the sun rides low (sunY ≲ 0.35),
    // easing off at the very horizon. The old exp curve died before dusk even
    // began, so the reference-art molten light never appeared.
    const goldeness = THREE.MathUtils.clamp((0.42 - Math.max(0, sunY)) / 0.42, 0, 1)
      * THREE.MathUtils.clamp(Math.max(0, sunY) / 0.06, 0, 1);
    // Power curve keeps the sun strong and warm deep into golden hour instead
    // of collapsing linearly to dusk-dark while it's still above the horizon
    this.sun.intensity = Math.pow(sunUp, 0.55) * 3.1;
    const p = this.resolvePalette();
    this.sun.color.copy(p.sun);
    // Sunset bleed: the nearer the sun grazes the horizon, the deeper its hue
    const lowSun = Math.max(0, 1 - Math.max(0, sunY) * 2.6);
    this.sun.color.lerp(new THREE.Color(0xff6e30), lowSun * 0.55 * (sunUp > 0 ? 1 : 0));

    this.fill.intensity = 0.28 + moonUp * 0.42;
    this.fill.color.setHSL(0.65, 0.32, 0.42 + moonUp * 0.28);

    this.hemi.color.copy(p.hemiSky);
    this.hemi.groundColor.copy(p.hemiGround);
    this.hemi.intensity = 0.55 + Math.pow(sunUp, 0.7) * 0.95 + moonUp * 0.22 + goldeness * 0.35;

    // Warm horizon bounce tracks the sun low across the sky
    const clearish = 1 - (this.targetWeather === 'clear' ? 0 : this.weatherBlend * 0.55);
    this.bounce.intensity = goldeness * 4.2 * clearish;
    this.bounce.color.copy(p.warm);
    this.bounce.position.set(-this.sunDir.x * 90, 5, -this.sunDir.z * 90);
    if (playerPos) this.bounce.target.position.copy(playerPos);

    for (const u of this.domeUniforms) {
      u.topColor.value.copy(p.top);
      u.midColor.value.copy(p.mid);
      u.horizonColor.value.copy(p.horizon);
      u.warmColor.value.copy(p.warm);
      u.sunColor.value.copy(p.sun);
      u.sunDir.value.copy(this.sunDir);
      u.uTime.value = this.time;
    }

    // Re-bake the environment map as the sky palette drifts. The bake is a
    // full cube render + mip chain, so it runs on a long interval and only
    // when the palette has actually drifted since the last bake — and never
    // while inside the tea house, where the sky is out of sight.
    this.envTimer -= dt;
    if (this.envTimer <= 0 && !this.envPaused) {
      if (this.envDrifted()) {
        this.envTimer = this.envInterval;
        this.refreshEnvironment();
      } else {
        this.envTimer = 2; // palette static — re-check again shortly
      }
    }

    // Stars + moon only rise once the sun is properly down — no stars in
    // broad dusk light
    const nightness = THREE.MathUtils.clamp((-sunY + 0.02) * 5.0, 0, 1);
    this.starMat.uniforms.uOpacity.value = nightness * (1 - (this.weather === 'cloudy' || this.weather === 'rain' || this.weather === 'snow' ? this.weatherBlend * 0.85 : 0));
    this.starMat.uniforms.uTime.value = this.time;
    if (playerPos) this.stars.position.copy(playerPos);
    this.moonMat.opacity = nightness * 0.95;
    const moonDir = this._moonDir || (this._moonDir = new THREE.Vector3());
    moonDir.set(-this.sunDir.x, Math.max(0.18, -this.sunDir.y + 0.3), -this.sunDir.z).normalize();
    if (playerPos) this.moon.position.copy(playerPos).addScaledVector(moonDir, 205);

    this.scene.fog.color.copy(p.fog);
    // Material fog only backs up the post-process atmosphere; it thickens a
    // little in weather so sprites and unlit props still recede.
    let fogNear = 110, fogFar = 420;
    if (this.weather === 'mist' && this.weatherBlend > 0.5) { fogNear = 30; fogFar = 140; }
    else if (this.weather === 'snow' && this.weatherBlend > 0.5) { fogNear = 50; fogFar = 220; }
    else if (this.weather === 'rain' && this.weatherBlend > 0.5) { fogNear = 40; fogFar = 180; }
    this.scene.fog.near += (fogNear - this.scene.fog.near) * dt * 0.5;
    this.scene.fog.far += (fogFar - this.scene.fog.far) * dt * 0.5;

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      const dark = this.weather === 'snow' || this.weather === 'cloudy' || this.weather === 'rain';
      c.position.x += dt * ((dark ? 1.4 : 0.6) + i * 0.13);
      if (c.position.x > 230) c.position.x = -230;
      // Clouds on the sun's side of the sky catch fire at golden hour
      const cxz = c.position.x * this.sunDir.x + c.position.z * this.sunDir.z;
      const dist = Math.max(1, Math.hypot(c.position.x, c.position.z));
      const sunSide = (cxz / dist + 1) * 0.5;
      c.material.color.copy(p.cloud).lerp(p.warm, sunSide * goldeness * 1.1);
      c.material.opacity = p.cloudOpacity * (0.9 + Math.sin(this.time * 0.4 + i) * 0.1);
    }
  }

  update(dt, playerPos) {
    this.time += dt;
    this.updateWeather(dt);
    this.updateDayNight(dt, playerPos);
  }
}
