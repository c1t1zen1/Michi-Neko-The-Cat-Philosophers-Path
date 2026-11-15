// What a kit sky instance reads each frame.
//
// In the game the Sky (src/sky.js) drives its kit instances itself, passing
// `env.sky` (the Sky: sun direction, the resolved palette, weather amounts)
// and `env.center` (the dome centre, i.e. the cat). Anywhere without a Sky —
// the contract test, catalog thumbnails — the same fields are derived from
// `env.hour`, `env.wet` and `env.snow` with the classic sun path and a
// two-palette fallback, so update(dt, t, env) always responds to the world.
import * as THREE from 'three';

const C = (hex) => new THREE.Color(hex);
// The classic day and night palettes (src/sky.js buildPalettes), for pages without a Sky.
const DAY = { top: C(0x5b86c6), mid: C(0xe2b09a), horizon: C(0xffd6a0), warm: C(0xffb264), sun: C(0xffe6b8), hemiSky: C(0x9ab4d6), fog: C(0xf2b98a), cloud: C(0xfff0e0), cloudOpacity: 0.62 };
const NIGHT = { top: C(0x0c1630), mid: C(0x223658), horizon: C(0x384c72), warm: C(0x24355c), sun: C(0x7a90be), hemiSky: C(0x3d5278), fog: C(0x222c3e), cloud: C(0x4a5a76), cloudOpacity: 0.4 };
const KEYS = ['top', 'mid', 'horizon', 'warm', 'sun', 'hemiSky', 'fog', 'cloud'];

/** The classic asymmetric sun path (Sky.updateDayNight): 13.2 h of daylight, leaning south. */
export function sunFromHour(hour, out) {
  const dayStart = 6.0, dayEnd = 19.2;
  const h = ((Number(hour) || 0) % 24 + 24) % 24;
  let angle;
  if (h >= dayStart && h <= dayEnd) angle = ((h - dayStart) / (dayEnd - dayStart)) * Math.PI;
  else {
    const nightT = h < dayStart ? h + 24 - dayEnd : h - dayEnd;
    angle = Math.PI + (nightT / (24 - (dayEnd - dayStart))) * Math.PI;
  }
  return out.set(Math.cos(angle), Math.sin(angle), 0.5).normalize();
}

/** The classic moon placement: opposite the sun, never below 0.18 (Sky.updateDayNight). */
export function moonFromSun(sun, out) {
  return out.set(-sun.x, Math.max(0.18, -sun.y + 0.3), -sun.z).normalize();
}

export function makeSkyState() {
  const pal = {};
  for (const k of KEYS) pal[k] = new THREE.Color();
  return {
    sun: new THREE.Vector3(0, 1, 0), moon: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(),
    pal, cloudOpacity: 0.62, cloudy: 0, rain: 0, snow: 0, mist: 0, storm: 0,
    day: 1, night: 0, golden: 0, hour: 12
  };
}

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Fill `s` (makeSkyState()) from env: the Sky's own state when env.sky is present, else derived from env.hour. */
export function readSky(env, s) {
  const sky = env && env.sky;
  s.hour = env && Number.isFinite(env.hour) ? env.hour : 12;
  if (sky) {
    s.sun.copy(sky.sunDir);
    const p = sky.resolvePalette();
    for (const k of KEYS) s.pal[k].copy(p[k] || p.horizon);
    s.cloudOpacity = p.cloudOpacity;
    s.cloudy = sky.weatherAmount('cloudy');
    s.rain = sky.weatherAmount('rain');
    s.snow = sky.weatherAmount('snow');
    s.mist = sky.weatherAmount('mist');
  } else {
    sunFromHour(s.hour, s.sun);
    const n = 1 - smoothstep(-0.1, 0.18, s.sun.y);
    for (const k of KEYS) s.pal[k].copy(DAY[k]).lerp(NIGHT[k], n);
    s.cloudOpacity = DAY.cloudOpacity + (NIGHT.cloudOpacity - DAY.cloudOpacity) * n;
    s.cloudy = 0;
    s.rain = Math.min(1, Math.max(0, Number(env && env.wet) || 0));
    s.snow = Math.min(1, Math.max(0, Number(env && env.snow) || 0));
    s.mist = 0;
  }
  if (env && env.center && env.center.isVector3) s.center.copy(env.center);
  moonFromSun(s.sun, s.moon);
  const sunY = s.sun.y, sunUp = Math.max(0, sunY);
  s.storm = Math.max(s.cloudy, s.rain, s.snow, s.mist * 0.72);
  s.day = smoothstep(-0.08, 0.14, sunY);
  s.night = Math.min(1, Math.max(0, (-sunY + 0.02) * 5));
  // the classic golden-hour band (Sky.updateDayNight `goldeness`)
  s.golden = Math.min(1, Math.max(0, (0.42 - sunUp) / 0.42)) * Math.min(1, Math.max(0, sunUp / 0.06));
  return s;
}
