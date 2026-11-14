// The pagoda family (Phase 2, wave 2.2): lab 08 "Distant pagoda" (gojū-no-tō).
//   distant-pagoda  the five-storey tower beyond the valley's forest
// The builder is general (a measured preset, height, storeys, roof, paint) so
// s3-vista (Yasaka-no-tō over Higashiyama) and r4-festival (Roof Road) import
// `buildTower` with other presets. Geometry is built in real metres and scaled
// by 1 / layout.scale, because Countryside applies the classic 1.232 scale to
// the group: the world height is `height` metres whatever the layout scale.
import { defineAsset } from '../contract.js?v=20261113a';
import { buildPagoda } from './build.js?v=20261113a';
import { PRESETS } from './presets.js?v=20261113a';

export { buildPagoda, PRESETS };

/** Shared by every consumer: the tower as a kit instance for any preset. */
export function buildTower(ctx, layout, p) {
  const T = ctx.THREE;
  const k = (layout && layout.scale) || 1;
  const material = ctx.kitMaterials.bag({ rough: 0.78, brush: 0.05 });
  const base = PRESETS.find((x) => x.key === p.preset) || PRESETS[0];
  const H = base.H * p.height_scale;
  const { group: tower, parts, dims } = buildPagoda({
    preset: p.preset, H: H / k, storeys: p.storeys,
    ...(p.roof !== 'preset' ? { roof: p.roof } : {}),
    ...(p.paint !== 'preset' ? { paint: p.paint } : {}),
    age: p.age
  }, { detail: ctx.tier, material });
  tower.scale.setScalar(1);
  const group = new T.Group();
  group.add(tower);
  group.userData.pagoda = { preset: p.preset, height: H, storeys: dims.n, firstStoreyWidth: dims.W1 * 1 };
  return {
    group, parts, sockets: {}, live: [],
    dims,
    dispose() { tower.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); }
  };
}

export const assets = [
  defineAsset({
    id: 'distant-pagoda', family: 'pagoda', lab: 'pagoda/valley', label: 'Distant pagoda', legacyName: 'Distant Pagoda',
    params: {
      preset: { type: 'enum', default: 'valley', options: ['valley', 'horyuji', 'daigoji', 'yasaka', 'kofukuji', 'ruriko', 'toji', 'ninnaji', 'muroji'], label: 'Tower (measured preset)' },
      height_scale: { type: 'number', default: 1, min: 0.5, max: 2, step: 0.05, label: 'Height scale' },
      storeys: { type: 'number', default: 5, min: 3, max: 5, step: 1, label: 'Storeys' },
      roof: { type: 'enum', default: 'preset', options: ['preset', 'bark', 'tile', 'copper'], label: 'Roof' },
      paint: { type: 'enum', default: 'preset', options: ['preset', 'vermilion', 'game', 'faded', 'ochre', 'natural'], label: 'Paint' },
      age: { type: 'number', default: 0.35, min: 0, max: 1, step: 0.05, label: 'Weathering' }
    },
    sample: { index: 0, x: 0, y: 0, z: 0, scale: 1.232, band: 'rim' },
    build: (ctx, layout, p) => buildTower(ctx, layout, p)
  })
];
