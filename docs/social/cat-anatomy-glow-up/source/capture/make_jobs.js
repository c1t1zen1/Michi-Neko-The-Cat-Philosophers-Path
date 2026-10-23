// Writes jobs/*.json: every shot the edit needs, per cat version.
const fs = require('fs');
const path = require('path');

const PAL = {
  luna: { fur: 0x22242a, belly: 0x383b44, accent: 0x4f5360, eyeColor: 0xdec056, ribbonColor: 0x2b3d63 },
  mochi: { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, eyeColor: 0xa2ba6e, ribbonColor: 0xc8402a },
  kuro: { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, eyeColor: 0xd8b04a, ribbonColor: 0xc8402a }
};
const cam = (az0, az1, el0, el1, dist0, dist1, extra = {}) => ({ az0, az1, el0, el1, dist0, dist1, ...extra });
const side = (dist = 2.1) => cam(90, 90, 4, 4, dist, dist);
const blendScales = Array.from({ length: 24 }, (_, i) => {
  const t = i / 23;
  return Math.round((0.1 + 0.9 * t * t * (3 - 2 * t)) * 1000) / 1000;
});

const jobs = {
  v09: [
    { name: 'v09_hero', frames: 96, speed: 4.5, cam: cam(28, 72, 12, 6, 2.15, 1.95) },
    { name: 'v09_face', frames: 48, cam: cam(12, 34, 4, 6, 0.72, 0.66, { ty0: 0.62, tz0: 0.3 }) },
    { name: 'v09_side', frames: 96, speed: 4.5, ease: 'linear', cam: side() },
    { name: 'v09_explode', frames: 48, warm: 1.0, explode: true, ease: 'linear', cam: cam(40, 58, 12, 14, 2.2, 2.7) }
  ],
  sep06: [
    { name: 'sep06_hero', frames: 96, speed: 4.5, cam: cam(110, 62, 16, 8, 2.1, 1.95) },
    { name: 'sep06_face', frames: 48, cam: cam(30, 12, 6, 6, 0.72, 0.66, { ty0: 0.62, tz0: 0.3 }) },
    { name: 'sep06_stand_side', frames: 1, cam: side() }
  ],
  sep24: [
    { name: 'sep24_hero', frames: 72, speed: 4.5, cam: cam(75, 35, 8, 12, 2.0, 1.95) },
    { name: 'sep24_stand_side', frames: 1, cam: side() }
  ],
  sep29: [
    { name: 'sep29_collar', frames: 72, cam: cam(8, 32, -4, 4, 0.82, 0.72, { ty0: 0.56, tz0: 0.28 }) },
    { name: 'sep29_hero', frames: 48, speed: 4.5, cam: cam(40, 62, 10, 8, 2.0, 1.95) }
  ],
  oct04: [
    { name: 'oct04_sleep', frames: 72, dt: 1 / 12, events: [{ at: 0, do: 'idle', action: 'sleep' }],
      cam: cam(38, 58, 20, 26, 2.45, 2.3, { ty0: 0.34, ty1: 0.3, tz0: -0.06 }) }
  ],
  now_a: [
    { name: 'now_hook', frames: 72, light: 'golden', speed: 1.4, cam: cam(-35, 25, 4, 10, 1.9, 1.7, { ty0: 0.4, ty1: 0.44 }) },
    { name: 'now_skel', frames: 84, mode: 'clay', speed: 1.4, ease: 'linear', cam: side() },
    { name: 'now_prims', frames: 72, mode: 'prims', assemble: 1, cam: cam(35, 60, 14, 10, 2.0, 1.9) },
    { name: 'now_blend', frames: 24, mode: 'blend', blendScales, cam: cam(60, 60, 10, 10, 1.9, 1.9) },
    { name: 'now_raw_orbit', frames: 48, mode: 'raw', cam: cam(60, 100, 10, 6, 1.9, 1.3, { ty0: 0.42, ty1: 0.5, tz0: 0, tz1: 0.12 }) },
    { name: 'now_wire_orbit', frames: 48, mode: 'rawwire', cam: cam(60, 100, 10, 6, 1.9, 1.3, { ty0: 0.42, ty1: 0.5, tz0: 0, tz1: 0.12 }) },
    { name: 'now_weights', frames: 72, mode: 'weights', speed: 1.4, cam: cam(60, 110, 10, 6, 1.95, 1.95) },
    { name: 'now_face', frames: 72, cam: cam(-25, 30, 3, 7, 0.66, 0.6, { ty0: 0.65, tz0: 0.33 }) }
  ],
  now_b: [
    { name: 'now_walk', frames: 48, speed: 1.4, ease: 'linear', cam: cam(90, 90, 3, 3, 2.0, 2.0) },
    { name: 'now_trot', frames: 36, speed: 4.5, ease: 'linear', cam: cam(90, 90, 3, 3, 2.0, 2.0) },
    { name: 'now_gallop', frames: 36, speed: 7.6, sprint: true, warm: 2, ease: 'linear', cam: cam(90, 90, 3, 3, 2.3, 2.3) },
    { name: 'now_sit', frames: 36, dt: 1 / 20, events: [{ at: 0, do: 'idle', action: 'sit' }], cam: cam(35, 35, 10, 10, 1.7, 1.6) },
    { name: 'now_groom', frames: 36, pre: [{ do: 'idle', action: 'groom' }], settle: 2.5, cam: cam(50, 50, 12, 12, 1.6, 1.55) },
    { name: 'now_stretch', frames: 36, pre: [{ do: 'idle', action: 'stretch' }], settle: 1.0, cam: cam(90, 90, 6, 6, 2.0, 1.95) },
    { name: 'now_startled', frames: 36, events: [{ at: 0, do: 'mood', name: 'startled' }], cam: cam(140, 125, 20, 20, 1.9, 1.9, { ty0: 0.5 }) },
    { name: 'now_yawn', frames: 36, pre: [{ do: 'idle', action: 'yawn' }], settle: 1.2, cam: cam(22, 22, 6, 6, 0.95, 0.9, { ty0: 0.55, tz0: 0.2 }) },
    { name: 'now_jump', frames: 30, events: [{ at: 0, do: 'jump' }], airborne: [0, 14], cam: cam(90, 90, 4, 4, 2.3, 2.3, { ty0: 0.5 }) },
    { name: 'now_sleep', frames: 48, pre: [{ do: 'idle', action: 'sleep' }], settle: 6, cam: cam(45, 70, 38, 38, 1.6, 1.6, { ty0: 0.15 }) },
    { name: 'now_side', frames: 96, speed: 4.5, ease: 'linear', cam: side() }
  ],
  now_c: [
    { name: 'now_michi', frames: 36, cam: cam(38, 48, 12, 12, 2.0, 2.0) },
    { name: 'now_luna', frames: 36, build: 'luna', palette: PAL.luna, cam: cam(38, 48, 12, 12, 2.0, 2.0) },
    { name: 'now_mochi', frames: 36, build: 'mochi', palette: PAL.mochi, cam: cam(38, 48, 12, 12, 2.0, 2.0) },
    { name: 'now_kuro', frames: 36, build: 'kuro', palette: PAL.kuro, cam: cam(38, 48, 12, 12, 2.0, 2.0) },
    { name: 'now_final', frames: 120, light: 'golden', cam: cam(-40, 140, 8, 12, 1.9, 1.8) }
  ]
};

fs.mkdirSync(path.join(__dirname, 'jobs'), { recursive: true });
for (const [name, shots] of Object.entries(jobs)) {
  const ver = name.startsWith('now') ? 'now' : name;
  fs.writeFileSync(path.join(__dirname, 'jobs', name + '.json'), JSON.stringify({ name, ver, w: 1080, h: 1080, shots }, null, 1));
  console.log(name, shots.reduce((a, s) => a + s.frames, 0), 'frames');
}
