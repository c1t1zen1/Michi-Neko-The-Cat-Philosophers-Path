// The interiors family (Phase 2, wave 2.2a): the tea-house room and the things
// in it. Lab: labs/interiors (lab 21). Classic builders: src/interior.js.
//   tea-interior  the whole room (replaces the classic assembly)
//   tatami, interior-frame, shoji-doors, tokonoma, scroll, bonsai, chabudai,
//   teaware, zabuton, knockables: the same builders as separate ids, for a
//   mixed classic/modular room (a kit parent placing its own copies).
// andon and courtyard-toro belong to the lanterns family; interior-fish and the
// gravel/wall are the room parent's. Static parts are plain merged geometry on
// the interior's own MAT entries and km.bag, so the room merges to a handful of draws.
import { defineAsset } from '../contract.js?v=20261113a';
import { solo } from './common.js?v=20261113a';
import { buildTatami, buildFrame, buildDoor, buildTokonoma, buildScroll, buildChabudai, EARTHS } from './room.js?v=20261113a';
import { buildZabuton, buildBonsai, buildTeaware, buildKnickKnacks, CUSHIONS, FOLIAGE, GLAZES } from './small.js?v=20261113a';
import { buildTeaInterior } from './tea.js?v=20261113a';
import { paperMat, shojiLight } from './common.js?v=20261113a';

const enumOf = (obj, def, label) => ({ type: 'enum', default: def, options: Object.keys(obj), label });

// The classic room's layout (layoutInterior()), as the contract sample: the real, largest layout.
const WALL_H = 3.6;
const ROOM = {
  index: 0, name: 'Tea House Interior', x: 0, y: 0, z: 0, wallH: WALL_H, bind: { fishMesh: 'fish' },
  footprint: { colliders: [], platforms: [], anchors: { eatFishAnchor: [0.3, 0.5, -0.1], napAnchor: [-2.2, 0.1, -1.2], enterAnchor: { at: [0, 0, 2.6], heading: Math.PI, camera: [0, 1.4, 4.6] }, exitZone: { minZ: 1.8, halfX: 1.8, rearmZ: 1.2 } } },
  tatami: { index: 0, x: 0, y: 0, z: 0, mat: { w: 1.25, l: 2.5, h: 0.08 }, mats: [[-1.25, 0.04, -1.25, false], [1.25, 0.04, -1.25, false], [-1.25, 0.04, 1.25, false], [1.25, 0.04, 1.25, false], [-2.5, 0.04, 0, true], [2.5, 0.04, 0, true]], footprint: {} },
  frame: { index: 0, x: 0, y: 0, z: 0, size: [8.4, WALL_H, 7.2], beams: [-3, -1, 1, 3], posts: [-4.1, 4.1, -3.6, 3.6], footprint: {} },
  tokonoma: { index: 0, x: 0, y: 0, z: 0, recess: [0, 0, -3.0], footprint: {} },
  scroll: { index: 0, x: 0, y: 0.8, z: -3.42, footprint: {} },
  bonsai: { index: 0, x: 0.9, y: 0.21, z: -3.0, footprint: {} },
  chabudai: { index: 0, x: 0, y: 0, z: -0.2, top: 0.49, footprint: {} },
  teaware: { index: 0, x: -0.45, y: 0.49, z: -0.25, footprint: {} },
  fish: { index: 0, x: 0.3, y: 0.49, z: 0.1, footprint: {} },
  zabuton: { index: 0, x: -2.2, y: 0, z: -1.2, footprint: { anchors: { napAnchor: [-2.2, 0.1, -1.2] } } },
  andon: { index: 0, x: 2.8, y: 0, z: -2.2, footprint: {} },
  gravel: { index: 0, x: 7.2, y: 0, z: 0, size: [4.0, 0.1, 6.0], footprint: {} },
  toro: { index: 0, x: 7.2, y: 0, z: -1.2, footprint: {} },
  courtyardWall: { index: 0, footprint: {} },
  door: { index: 0, x: 0, y: 0, z: 3.6, footprint: {} }
};

const standalone = (build) => (ctx, layout, p) => {
  const g = build(ctx, layout, ctx.tier, p);
  return solo(g);
};

// the shoji paper follows the hour wherever the door stands (the parent drives the same material)
const doorBuild = (ctx, layout, p) => {
  const g = buildDoor(ctx, layout, ctx.tier);
  const paper = paperMat(ctx);
  shojiLight(paper, 12);
  return { ...solo(g), update: (dt, t, env) => shojiLight(paper, env && env.hour) };
};

// knockables: positions in the room group (the classic path adds the origin twice and hangs them 100 m up)
export const KNICK = [
  { part: 'cup', name: 'Table Knick-knack 1', x: -0.7, z: -0.1, h: 0.09 },
  { part: 'bowl', name: 'Table Knick-knack 2', x: 0.45, z: -0.55, h: 0.07 },
  { part: 'ball', name: 'Table Knick-knack 3', x: 0.6, z: 0.15, h: 0.11 }
];
const TABLE_TOP = 0.49, FLOOR_Y = 0.08;
const knockBuild = (ctx, layout) => {
  const src = (layout && layout.items && layout.items.length) ? layout.items : KNICK;
  const items = src.map((d, i) => { const k = KNICK[i] || KNICK[0]; return { part: d.part || k.part, name: d.name || k.name, at: [k.x, TABLE_TOP + (k.h ?? 0.09) / 2, k.z] }; });
  const { group, parts } = buildKnickKnacks(ctx, items, ctx.tier);
  // gameplay footprint: the same three records in room-group space, resting on the tatami (0.08)
  const footprint = { colliders: [], exclusions: [], anchors: {}, knockables: items.map((d) => ({ part: d.part, rest: d.at, floorY: FLOOR_Y })) };
  return { group, parts, sockets: {}, live: [], footprint };
};

export const assets = [
  defineAsset({
    id: 'tea-interior', family: 'interiors', lab: 'interiors/garden', label: 'Tea-house interior', legacyName: 'Tea House Interior',
    params: {
      cushion: enumOf(CUSHIONS, 'crimson', 'Zabuton'),
      wall_earth: enumOf(EARTHS, 'ochre', 'Alcove wall'),
      lamp_warmth: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.05, label: 'Lamp warmth' }
    },
    floating: ['platter', 'fish'],
    sample: ROOM, build: buildTeaInterior
  }),
  defineAsset({ id: 'tatami', family: 'interiors', lab: 'interiors/tatami', label: 'Tatami floor', legacyName: 'Tatami Floor', params: {}, sample: ROOM.tatami, build: standalone(buildTatami) }),
  defineAsset({ id: 'interior-frame', family: 'interiors', lab: 'interiors/frame', label: 'Room frame', legacyName: 'Room Frame', params: {}, sample: ROOM.frame, build: standalone(buildFrame) }),
  defineAsset({ id: 'shoji-doors', family: 'interiors', lab: 'interiors/shoji', label: 'Shoji entrance', legacyName: 'Exit Door', params: {}, sample: ROOM.door, build: doorBuild }),
  defineAsset({
    id: 'tokonoma', family: 'interiors', lab: 'interiors/tokonoma', label: 'Tokonoma alcove', legacyName: 'Tokonoma Alcove',
    params: { earth: enumOf(EARTHS, 'ochre', 'Wall earth') }, sample: ROOM.tokonoma, build: standalone(buildTokonoma)
  }),
  defineAsset({ id: 'scroll', family: 'interiors', lab: 'interiors/scroll', label: 'Hanging scroll', legacyName: 'Hanging Scroll', params: {}, sample: ROOM.scroll, build: standalone(buildScroll) }),
  defineAsset({
    id: 'bonsai', family: 'interiors', lab: 'interiors/bonsai', label: 'Bonsai pine', legacyName: 'Bonsai',
    params: { foliage: enumOf(FOLIAGE, 'green', 'Foliage') }, sample: ROOM.bonsai, build: standalone(buildBonsai)
  }),
  defineAsset({ id: 'chabudai', family: 'interiors', lab: 'interiors/chabudai', label: 'Chabudai', legacyName: 'Chabudai Table', params: {}, sample: ROOM.chabudai, build: standalone(buildChabudai) }),
  defineAsset({
    id: 'teaware', family: 'interiors', lab: 'interiors/pottery', label: 'Teapot and yunomi', legacyName: 'Tea Set',
    params: { glaze: enumOf(GLAZES, 'celadon', 'Glaze') }, sample: ROOM.teaware, build: standalone(buildTeaware)
  }),
  defineAsset({
    id: 'zabuton', family: 'interiors', lab: 'interiors/zabuton', label: 'Zabuton', legacyName: 'Zabuton Nap Bed',
    params: { cushion: enumOf(CUSHIONS, 'crimson', 'Cushion') }, sample: ROOM.zabuton, build: standalone(buildZabuton)
  }),
  defineAsset({
    id: 'knockables', family: 'interiors', lab: 'interiors/knockables', label: 'Table knick-knacks', legacyName: 'Table Knick-knacks',
    params: {}, floating: ['cup', 'bowl', 'ball'], sample: { index: 0, x: 0, y: 0, z: 0, footprint: { knockables: [] } }, build: knockBuild,
    footprintWaiver: 'the knick-knacks rest and settle in room-group space (table top 0.49, floor 0.08) instead of the classic origin-doubled numbers that hang them 100 m up (f3 handoff §3)'
  })
];
