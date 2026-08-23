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
    this.buildLights();

    this.weather = 'clear';
    this.previousWeather = 'clear';
    this.weatherTimer = 450;
    this.weatherBlend = 1;
    this.targetWeather = 'clear';
    this.weatherDurations = { clear: 600, cloudy: 420, snow: 300, mist: 360, rain: 300 };

    this.palettes = this.buildPalettes();
    scene.fog = new THREE.Fog(0xf2b98a, 35, 150);
  }

  buildDome() {
    const uniforms = {
      topColor: { value: new THREE.Color(0x4a6a9e) },
      midColor: { value: new THREE.Color(0xc98a7a) },
      horizonColor: { value: new THREE.Color(0xffc98a) },
      sunDir: { value: this.sunDir },
      sunColor: { value: new THREE.Color(0xffe6b8) }
    };
    const mat = new THREE.ShaderMaterial({
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
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, -0.05, 1.0);
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.22, h));
          col = mix(col, topColor, smoothstep(0.18, 0.65, h));
          float sunAmount = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          col += sunColor * pow(sunAmount, 350.0) * 1.6;
          col += sunColor * pow(sunAmount, 18.0) * 0.35;
          col += sunColor * pow(sunAmount, 4.0) * 0.12;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 20), mat);
    this.scene.add(this.dome);
  }

  buildClouds() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 235, 215, 0.85)');
    grad.addColorStop(0.55, 'rgba(255, 215, 190, 0.45)');
    grad.addColorStop(1, 'rgba(255, 205, 180, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);

    this.clouds = [];
    const cloudMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
    const defs = [
      [-80, 42, -140, 90, 22], [-10, 50, -170, 120, 26], [70, 38, -130, 80, 18],
      [-130, 34, -60, 70, 16], [120, 46, -80, 95, 22], [30, 55, -190, 130, 30],
      [-60, 44, 130, 85, 20], [90, 40, 110, 75, 18]
    ];
    for (const [x, y, z, w, h] of defs) {
      const c = new THREE.Sprite(cloudMat.clone());
      c.position.set(x, y, z);
      c.scale.set(w, h, 1);
      c.material.opacity = 0.5 + Math.random() * 0.35;
      this.scene.add(c);
      this.clouds.push(c);
    }
  }

  buildLights() {
    this.sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
    this.sun.position.copy(this.sunDir).multiplyScalar(140);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 320;
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x8fa5c9, 0x9a7a55, 0.85);
    this.scene.add(this.hemi);

    this.fill = new THREE.DirectionalLight(0x5a4a78, 0.35);
    this.fill.position.set(40, 30, 60);
    this.scene.add(this.fill);
  }

  buildPalettes() {
    const c = (hex) => new THREE.Color(hex);
    return {
      day: {
        top: c(0x4a6a9e), mid: c(0xc98a7a), horizon: c(0xffc98a),
        sun: c(0xffe6b8), hemiSky: c(0x8fa5c9), hemiGround: c(0x9a7a55), fog: c(0xf2b98a),
        cloud: c(0xfff0e0), cloudOpacity: 0.55
      },
      sunset: {
        top: c(0x3a4a7a), mid: c(0xb06a6a), horizon: c(0xff8a4a),
        sun: c(0xffc080), hemiSky: c(0x7a8ab0), hemiGround: c(0x6a5a45), fog: c(0xe08a5a),
        cloud: c(0xffc0a0), cloudOpacity: 0.65
      },
      night: {
        top: c(0x101b35), mid: c(0x223658), horizon: c(0x384c72),
        sun: c(0x7a90be), hemiSky: c(0x3d5278), hemiGround: c(0x302824), fog: c(0x222c3e),
        cloud: c(0x506078), cloudOpacity: 0.45
      },
      cloudy: {
        top: c(0x5a6a7a), mid: c(0x8a8a98), horizon: c(0xaab0b8),
        sun: c(0xc0c0d0), hemiSky: c(0x707082), hemiGround: c(0x52524d), fog: c(0x9aa0a8),
        cloud: c(0xd0d5db), cloudOpacity: 0.82
      },
      snow: {
        top: c(0x5c708a), mid: c(0x869cb4), horizon: c(0xbac8d6),
        sun: c(0xdde8f2), hemiSky: c(0x8298b0), hemiGround: c(0x606a72), fog: c(0xb0c0ce),
        cloud: c(0xeef4fa), cloudOpacity: 0.75
      },
      mist: {
        top: c(0x6a7a8a), mid: c(0x8a9aa8), horizon: c(0xaac0c8),
        sun: c(0xc0d0d8), hemiSky: c(0x7a8a98), hemiGround: c(0x5a6058), fog: c(0xb0c0c8),
        cloud: c(0xd8e0e5), cloudOpacity: 0.5
      },
      rain: {
        top: c(0x3d4a58), mid: c(0x5c6a78), horizon: c(0x76848e),
        sun: c(0x9aa8b4), hemiSky: c(0x5c6c7c), hemiGround: c(0x44483f), fog: c(0x6e7c86),
        cloud: c(0x8894a0), cloudOpacity: 0.92
      }
    };
  }

  lerpColor(a, b, t, out = new THREE.Color()) {
    return out.copy(a).lerp(b, t);
  }

  getDayPhase() {
    const t = this.dayTime / 24;
    let phase, phaseBlend;
    if (t < 0.18) { phase = 'night'; phaseBlend = t / 0.18; }
    else if (t < 0.28) { phase = 'sunrise'; phaseBlend = (t - 0.18) / 0.10; }
    else if (t < 0.70) { phase = 'day'; phaseBlend = Math.min(1, (t - 0.28) / 0.10); }
    else if (t < 0.82) { phase = 'sunset'; phaseBlend = (t - 0.70) / 0.12; }
    else { phase = 'night2'; phaseBlend = (t - 0.82) / 0.18; }
    return { phase, phaseBlend };
  }

  lerpPalette(a, b, t) {
    const out = {};
    for (const k of ['top','mid','horizon','sun','hemiSky','hemiGround','fog','cloud']) {
      out[k] = this.lerpColor(a[k], b[k], t, new THREE.Color());
    }
    out.cloudOpacity = a.cloudOpacity + (b.cloudOpacity - a.cloudOpacity) * t;
    return out;
  }

  resolvePalette() {
    const { phase, phaseBlend } = this.getDayPhase();
    const dayPal = this.palettes.day;
    const sunsetPal = this.palettes.sunset;
    const nightPal = this.palettes.night;
    const weatherPal = this.palettes[this.targetWeather] || dayPal;

    let base;
    if (phase === 'night' || phase === 'night2') base = nightPal;
    else if (phase === 'sunrise') base = this.lerpPalette(nightPal, dayPal, phaseBlend);
    else if (phase === 'sunset') base = this.lerpPalette(dayPal, sunsetPal, phaseBlend);
    else base = dayPal;

    const w = this.weatherBlend;
    const out = {};
    for (const k of ['top','mid','horizon','sun','hemiSky','hemiGround','fog','cloud']) {
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

    const angle = (this.dayTime / 24) * Math.PI * 2 - Math.PI / 2;
    this.sunDir.set(Math.cos(angle), Math.sin(angle), -0.55).normalize();

    if (playerPos) {
      this.dome.position.copy(playerPos);
      this.sun.target.position.copy(playerPos);
      this.sun.position.copy(playerPos).addScaledVector(this.sunDir, 140);
    }

    const sunY = this.sunDir.y;
    const sunUp = Math.max(0, sunY);
    const moonUp = Math.max(0, -sunY * 0.6);
    this.sun.intensity = sunUp * 2.6;
    this.sun.color.copy(this.resolvePalette().sun);

    this.fill.intensity = 0.28 + moonUp * 0.42;
    this.fill.color.setHSL(0.65, 0.32, 0.42 + moonUp * 0.28);

    const p = this.resolvePalette();
    this.hemi.color.copy(p.hemiSky);
    this.hemi.groundColor.copy(p.hemiGround);
    this.hemi.intensity = 0.42 + sunUp * 0.75 + moonUp * 0.32;

    this.dome.material.uniforms.topColor.value.copy(p.top);
    this.dome.material.uniforms.midColor.value.copy(p.mid);
    this.dome.material.uniforms.horizonColor.value.copy(p.horizon);
    this.dome.material.uniforms.sunColor.value.copy(p.sun);
    this.dome.material.uniforms.sunDir.value.copy(this.sunDir);

    this.scene.fog.color.copy(p.fog);
    if (this.weather === 'mist' && this.weatherBlend > 0.5) {
      this.scene.fog.near = 15;
      this.scene.fog.far = 65;
    } else if (this.weather === 'snow' && this.weatherBlend > 0.5) {
      this.scene.fog.near = 25;
      this.scene.fog.far = 110;
    } else if (this.weather === 'rain' && this.weatherBlend > 0.5) {
      this.scene.fog.near = 18;
      this.scene.fog.far = 85;
    } else {
      this.scene.fog.near += (35 - this.scene.fog.near) * dt * 0.5;
      this.scene.fog.far += (150 - this.scene.fog.far) * dt * 0.5;
    }

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      const dark = this.weather === 'snow' || this.weather === 'cloudy' || this.weather === 'rain';
      c.position.x += dt * ((dark ? 1.4 : 0.6) + i * 0.13);
      if (c.position.x > 220) c.position.x = -220;
      c.material.color.copy(p.cloud);
      c.material.opacity = p.cloudOpacity * (0.6 + Math.sin(this.time * 0.4 + i) * 0.1);
    }
  }

  update(dt, playerPos) {
    this.time += dt;
    this.updateWeather(dt);
    this.updateDayNight(dt, playerPos);
  }
}
