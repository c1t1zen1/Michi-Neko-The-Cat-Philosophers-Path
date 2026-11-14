// The summit-life family (天上, lane s4): weather, wildlife and light for the
// meditation hilltop. Lab: labs/summit (specimens life-*). Builds on the weather
// family's sprite cloud and the critters family's butterflies; every system is
// live (animated, unmerged, one draw like classic).
//
// summit-wildlife is the umbrella row (classic builds nothing of its own: the
// butterflies and birds are routed separately), so it is deferred; see the
// handoff.
import { defineAsset } from '../contract.js?v=20261113a';
import { buildSnow, buildSummitRain, buildPollen, buildPetals, summitBox } from './weather.js?v=20261113a';
import { buildSummitButterflies, buildSummitBirds } from './wildlife.js?v=20261113a';
import { buildSummitLight, buildShrineRays } from './light.js?v=20261113a';

const num = (def, min, max, step, label) => ({ type: 'number', default: def, min, max, step, label });
const FP = { colliders: [], platforms: [], exclusions: [], anchors: {} };

// the classic layouts' volumes and counts (full quality)
const SAMPLE = {
  snow: () => ({ ...summitBox(620, { w: 62, h: 26, d: 62, seed: 41 }), name: 'Summit Snowfall' }),
  rain: () => ({ ...summitBox(760, { w: 54, h: 19, d: 54, seed: 43 }), name: 'Summit Rainfall' }),
  pollen: () => ({ ...summitBox(90, { w: 56, h: 2.6, d: 56, y0: 0.15, seed: 47 }), name: 'Summit Pollen' }),
  petals: () => {
    const l = summitBox(76, { w: 24, h: 5.6, d: 19, y0: 0.22, seed: 53 });
    for (let i = 0; i < 76; i++) { l.positions[i * 3] += 0; l.positions[i * 3 + 2] += 5.5; }
    return { ...l, name: 'Summit Sakura Drift' };
  },
  butterflies: () => {
    const n = 18, positions = new Float32Array(n * 3), colors = new Float32Array(n * 3);
    const pal = [[1, 0.83, 0.31], [0.45, 0.79, 1], [1, 0.57, 0.71], [0.85, 0.95, 0.47], [0.97, 0.94, 0.9]];
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = 1.5 + Math.sqrt((i + 0.5) / n) * 5.6;
      positions.set([Math.cos(a) * r, 0.65 + ((i * 37) % 100) / 100 * 1.15, Math.sin(a) * r], i * 3);
      colors.set(pal[i % 5], i * 3);
    }
    return { index: 0, name: 'Summit Butterfly Visitors', x: 0, y: 0, z: 0, positions, colors, footprint: FP };
  },
  birds: () => ({ index: 0, x: 0, y: 0, z: 0, phases: [0.4, 1.9, 3.3, 5.0], footprint: FP }),
  rays: () => ({
    index: 0, name: 'Shrine Summit Rays', space: 'valley', x: 0, y: 0, z: 0, footprint: FP,
    rays: Array.from({ length: 9 }, (_, i) => ({ w: 1.6 + ((i * 53) % 26) / 10, h: 17 + ((i * 29) % 70) / 10, phase: i * 0.7, baseOpacity: 0.55 + ((i * 17) % 35) / 100 }))
  }),
  light: () => ({ index: 0, x: 0, y: 0, z: 0, footprint: FP })
};

export const assets = [
  defineAsset({
    id: 'summit-snow', family: 'summitlife', lab: 'summit/life-snow', label: 'Summit snowfall', floating: ['flakes'],
    params: { size: num(0.3, 0.15, 0.6, 0.01, 'Flake size'), size_var: num(0.55, 0, 0.9, 0.05, 'Size variety') },
    sample: SAMPLE.snow, build: (ctx, layout, p) => buildSnow(ctx, layout, p)
  }),
  defineAsset({
    id: 'summit-rain', family: 'summitlife', lab: 'summit/life-rain', label: 'Summit rainfall', floating: ['drops'],
    params: { strength: num(1.3, 0.5, 1.8, 0.05, 'Streak strength'), length: num(0.9, 0.4, 1.6, 0.05, 'Streak length') },
    sample: SAMPLE.rain, build: (ctx, layout, p) => buildSummitRain(ctx, layout, p)
  }),
  defineAsset({
    id: 'summit-pollen', family: 'summitlife', lab: 'summit/life-pollen', label: 'Summit pollen', floating: ['pollen'],
    params: { size: num(0.14, 0.06, 0.3, 0.01, 'Mote size'), blink: num(0.4, 0, 1, 0.05, 'Glint') },
    sample: SAMPLE.pollen, build: (ctx, layout, p) => buildPollen(ctx, layout, p)
  }),
  defineAsset({
    id: 'summit-petals', family: 'summitlife', lab: 'summit/life-petals', label: 'Summit sakura petals', floating: ['petals'],
    params: { size: num(0.17, 0.1, 0.35, 0.01, 'Petal size'), tumble: num(1, 0, 1.5, 0.05, 'Tumble') },
    sample: SAMPLE.petals, build: (ctx, layout, p) => buildPetals(ctx, layout, p)
  }),
  defineAsset({
    id: 'summit-butterflies', family: 'summitlife', lab: 'summit/life-butterflies', label: 'Summit butterfly visitors', floating: ['swarm', 'flock'],
    params: { size: num(0.9, 0.5, 1.6, 0.05, 'Wing size'), flutter: num(10, 5, 16, 0.5, 'Flutter rate') },
    sample: SAMPLE.butterflies, build: (ctx, layout, p) => buildSummitButterflies(ctx, layout, p)
  }),
  defineAsset({
    id: 'summit-birds', family: 'summitlife', lab: 'summit/life-birds', label: 'Summit fly-by birds',
    floating: ['bird_1', 'bird_2', 'bird_3', 'bird_4', 'bird_1_wing_l', 'bird_1_wing_r', 'bird_2_wing_l', 'bird_2_wing_r', 'bird_3_wing_l', 'bird_3_wing_r', 'bird_4_wing_l', 'bird_4_wing_r'],
    footprintWaiver: 'footprint.anchors.summitBirds: the four bird records the facade flies (classic sets the same field from its own meshes)',
    params: { size: num(1, 0.7, 1.4, 0.05, 'Size') },
    sample: SAMPLE.birds, build: (ctx, layout, p) => buildSummitBirds(ctx, layout, p)
  }),
  defineAsset({
    id: 'shrine-rays', family: 'summitlife', lab: 'summit/life-rays', label: 'Shrine beacon rays', floating: ['beacon'],
    footprintWaiver: 'footprint.anchors._rays: the pulse list of this instance\'s own shafts (classic sets the same field from its own meshes)',
    params: { width: num(1, 0.6, 1.5, 0.05, 'Shaft width'), fan: num(1, 0.6, 1.4, 0.05, 'Fan spread') },
    sample: SAMPLE.rays, build: (ctx, layout, p) => buildShrineRays(ctx, layout, p)
  }),
  defineAsset({
    id: 'summit-light', family: 'summitlife', lab: 'summit/life-light', label: 'Summit sky and rim lights', floating: ['sky_fill', 'warm_fill'],
    params: { elevation: num(42, 30, 60, 1, 'Rim light height') },
    sample: SAMPLE.light, build: (ctx, layout, p) => buildSummitLight(ctx, layout, p)
  })
];
