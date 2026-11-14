// The garden family: the shishi-odoshi and the fūrin. Lab: labs/garden (lab 14).
// Offering bells belong to v-shrine (Integrator ruling).
import { defineAsset } from '../contract.js?v=20261113a';
import { buildShishi, buildWindChime } from './build.js?v=20261113a';

export const assets = [
  defineAsset({
    id: 'shishi', family: 'garden', lab: 'garden/shishi', label: 'Shishi-odoshi', legacyName: 'Shishi-Odoshi',
    params: {
      culm_age: { type: 'number', default: 0.3, min: 0, max: 1, step: 0.05, label: 'Bamboo age (green to straw)' },
      pebbles: { type: 'boolean', default: true, label: 'Pebble ring round the basin' }
    },
    sample: { index: 0, x: 0, y: 0, z: 0 },
    build: (ctx, layout, p) => buildShishi(ctx, layout, p)
  }),
  defineAsset({
    id: 'wind-chime', family: 'garden', lab: 'garden/glass', label: 'Fūrin', legacyName: 'Wind Chime',
    params: {
      glass: { type: 'enum', default: 'sky', options: ['sky', 'amber', 'smoke'], label: 'Glass' },
      tanzaku: { type: 'number', default: 0.2, min: 0.12, max: 0.3, step: 0.01, label: 'Paper strip length (m)' }
    },
    sample: { index: 0, x: 0, y: 0, z: 0 },
    build: (ctx, layout, p) => buildWindChime(ctx, layout, p)
  })
];
