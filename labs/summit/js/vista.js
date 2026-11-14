// Lab 09, the view from the meditation seat, kit by kit (lane s3-vista).
// Every tile builds one real asset of the vista family (src/kit/vista) through
// the game's own AssetRuntime, at its contract sample layout, so what you see
// here is what the summit builds when it runs modular. The classic builders
// stay in the "The city, today" tile of the city family.
import * as THREE from 'three';
import { loadKitIndexModule, loadKitRuntimeModule } from '../../shared/game.js';

let KIT = null;
export const loadVistaDeps = async () => {
  const [{ FAMILIES }, { AssetRuntime }] = await Promise.all([loadKitIndexModule(), loadKitRuntimeModule()]);
  KIT = new AssetRuntime({ THREE, quality: 'high', search: '?assets=modular', loadFamilies: async () => ({ vista: FAMILIES.vista }), fetchOverrides: async () => null, logger: { warn() {}, log() {}, error() {} } });
  await KIT.preload();
};

export const VISTA_FAMILY = { key: 'vista', title: 'The view, <em>layer by layer</em>', sub: 'The basin, the pagoda, the bay and the ranges that close it, built the way the summit now builds them. Each is seen from half a kilometre to five, so what carries is silhouette, colour and, at night, light.' };

const ENV = { hour: 14, wind: 0.6, wet: 0, snow: 0, lanternOn: false };

/** Build one vista kit asset at its contract sample; `fit` scales it onto the plinth, `at` places it, `layout` overrides the sample. */
function vistaSpecimen(id, { tier = 'hero', fit = {}, layout = {}, env = ENV, tick = null } = {}) {
  const def = KIT.defs.get(id), sample = typeof def.sample === 'function' ? def.sample() : { ...def.sample };
  const inst = KIT.build(id, { x: 0, y: 0, z: 0, ...sample, ...layout, tier }, () => { throw new Error(`${id}: the kit asset did not build`); });
  const wrap = new THREE.Group(), g = inst.group;
  g.position.set(0, 0, 0); g.rotation.y = 0;
  wrap.add(g);
  wrap.position.set(...(fit.at || [0, 0, 0])); wrap.scale.setScalar(fit.s || 1);
  wrap.traverse((o) => { o.frustumCulled = false; });
  return { group: wrap, noCast: true, update: (t, dt = 0.016) => { if (tick) tick(inst, t); if (inst.update) inst.update(dt, t, env); } };
}

const note = (name) => `${name}: a modular kit asset (src/kit/vista), built through the real AssetRuntime at hero tier.`;
// the vista is built in summit-local metres; the plinth holds a few metres, so each tile scales it down
const city = (extra = {}) => ({ fit: { s: 0.045, at: [0, 0.4, -4.6] }, ...extra });

export const VISTA_SPECIMENS = [
  { id: 'v-city', family: 'vista', name: 'Kyoto from the summit', jp: '京の屋根', tag: 'kyoto-city: roofs, ridges, temple halls, gardens', plinth: 'none', hour: 15, zoom: 0.72, plinthW: 7,
    blurb: note('City') + ' About nine hundred houses on a street grid that keeps the river and the temple sightline clear, each a plaster body under a hipped roof with a ridge along the street, a deep eave, and now and then a long temple hall.',
    how: ['Walls, hipped roofs and eaves are three instanced draws; the colour is per instance, the light is the summit’s.', 'A ridge along the long side is what makes a roof read as a roof at four pixels.'], use: 'The basin below the seat.', sources: ['notes'],
    build() { return vistaSpecimen('kyoto-city', city()); } },
  { id: 'v-city-lit', family: 'vista', name: 'The windows come on', jp: '街の灯', tag: 'kyoto-city: a wave of light from the river', plinth: 'none', hour: 21, zoom: 0.72, plinthW: 7,
    blurb: note('City lights') + ' Each window is one additive point with its own threshold: as the sky darkens the lights rise, and the ones nearest the river come on first.',
    how: ['One Points draw; a per-point weight is the distance from the river.', 'The point shader reads the opacity the sky drives, so the wave needs no clock of its own.'], use: 'Dusk and night from the seat.', sources: ['notes', 'neon'],
    build() { return vistaSpecimen('kyoto-city', city({ tick: (inst, t) => { const m = inst.footprint.anchors.cityLightMat, p = inst.footprint.anchors.cityLights; m.opacity = 0.05 + 0.62 * (0.5 + 0.5 * Math.sin(t * 0.5 - 1.3)); p.visible = true; } })); } },
  { id: 'v-ribbons', family: 'vista', name: 'River and streets', jp: '川と街道', tag: 'vista-terrain: ribbons draped on the basin', plinth: 'none', hour: 15, zoom: 0.72, plinthW: 7,
    blurb: note('Ribbons') + ' The Yodo winds through the basin and widens toward the bay; twelve streets, six long avenues and five cross streets, are one merged draw laid just above the ground.',
    how: ['Every vertex is draped on the summit’s own height function (read-only), so the ribbons never float.', 'The pale streets are what let you see districts at a distance.'], use: 'Under the city.', sources: ['notes'],
    build() { return vistaSpecimen('vista-terrain', city()); } },
  { id: 'v-pagoda', family: 'vista', name: 'The Higashiyama pagoda', jp: '八坂の塔', tag: 'summit-pagoda: the measured Yasaka-no-tō', plinth: 'stone', hour: 16, zoom: 0.9,
    blurb: note('Pagoda') + ' The pagoda family’s measured tower with the Yasaka preset: five storeys that narrow with height, eaves that sweep up at the corners and a sōrin finial. Evening lanterns glow on every storey.',
    how: ['The proportions are the survey’s, not eyeballed; only the height and the paint are chosen.', 'One vertex-coloured mesh, tinted by the summit’s sky palette through three small proxies.'], use: 'The landmark of the basin.', sources: ['notes'],
    build() { return vistaSpecimen('summit-pagoda', { fit: { s: 0.2, at: [0, 0, 0] }, layout: { x: 0, y: 0, z: 0 } }); } },
  { id: 'v-bay', family: 'vista', name: 'The bay and its boats', jp: '海と舟', tag: 'summit-bay: water, sun path, working boats', plinth: 'none', hour: 14, zoom: 0.72, plinthW: 7,
    blurb: note('Bay') + ' A broad sheet of swelling water with a textured sheen, a path of glints under the sun and seven small boats, sailing boats and ferries, that cross the bay.',
    how: ['The swell is in the vertices; the texture scrolls; the glints follow the sun.', 'Each boat is one mesh the summit sails along the bay.'], use: 'Beyond the city, to the horizon.', sources: ['notes'],
    build() { return vistaSpecimen('summit-bay', { fit: { s: 0.012, at: [0, 0.2, -3.6] } }); } },
  { id: 'v-harbour', family: 'vista', name: 'The harbour', jp: '港', tag: 'harbour: a skyline, quay cranes and stacked containers', plinth: 'none', hour: 17, zoom: 0.8, plinthW: 7,
    blurb: note('Harbour') + ' The far shore’s towers with stepped crowns, a wharf, gantry cranes and stacked containers. At night each lit tower is a column of window lights.',
    how: ['Towers are one instanced draw; cranes, containers and crowns are one merged mesh on the same material.', 'The summit’s palette tints the whole skyline at once.'], use: 'Across the bay.', sources: ['notes'],
    build() { return vistaSpecimen('harbour', { fit: { s: 0.025, at: [0, 0.4, -5] } }); } },
  { id: 'v-bridge', family: 'vista', name: 'The bay bridge', jp: '湾の橋', tag: 'bay-bridge: a suspension bridge, deck to cable', plinth: 'none', hour: 15, zoom: 0.8, plinthW: 7,
    blurb: note('Bridge') + ' Two H-frame towers, a deck on a box girder, catenary main cables and hangers, with piers below. Seen from the seat it is a few hairlines against the haze, and that is exactly the read.',
    how: ['Main cables are a chain of thin boxes along a curve; hangers every few metres.', 'The tower height and the cable sag are the two knobs.'], use: 'On the horizon, left of the harbour.', sources: ['notes'],
    build() { return vistaSpecimen('bay-bridge', { fit: { s: 0.045, at: [0, 0.2, 0] } }); } },
  { id: 'v-wheel', family: 'vista', name: 'The Ferris wheel', jp: '観覧車', tag: 'ferris-wheel: it turns, the gondolas hang', plinth: 'stone', hour: 18, zoom: 0.8,
    blurb: note('Wheel') + ' A twin-rim wheel on an A-frame, slowly turning, with gondolas that stay level as it goes round. It glows warm after dark.',
    how: ['The wheel is one mesh that rotates; the gondolas are one instanced mesh whose matrices follow the turn.', 'The frame is static.'], use: 'Harbour, right of the bridge.', sources: ['notes'],
    build() { return vistaSpecimen('ferris-wheel', { fit: { s: 0.22, at: [0, 1.6, 0] } }); } },
  { id: 'v-horizon', family: 'vista', name: 'Three ranges', jp: '遠山', tag: 'horizon: height-field rings, hazed by layer', plinth: 'none', hour: 15, zoom: 0.72, plinthW: 7,
    blurb: note('Horizon') + ' Each range is an arc of the ranges family’s polar height-field, so it is a true surface that curves round the bay. One material a layer lets the sky haze each range separately: the far one is palest.',
    how: ['Reuses the ranges kit’s ridge-ring builder with the summit’s three profiles.', 'Only the arc the seat looks over is kept.'], use: 'Beyond the bay, closing the sky.', sources: ['notes'],
    build() { return vistaSpecimen('horizon', { fit: { s: 0.008, at: [0, 0.2, -3.4] } }); } }
];
