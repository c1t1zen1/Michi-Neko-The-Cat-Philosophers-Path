import { defineCreature } from '../creature.js?v=20261113a';

/** The three nest guardian crows. Circling, swoops and the nudge stay in ambient_life.js. */
export const GUARDIAN_CROW = defineCreature({
  id: 'guardian-crows',
  kind: 'crow',
  label: 'Guardian crow',
  palette: { body: 0x1a1a24, sheen: 0x2a2a3a, wing: 0x222230, beak: 0xe0a020, leg: 0x2a2622, eye: 0xe8e0c8 },
  scale: 1,
  // AmbientLife.registerFootprint binds `wings: ['wing_l', 'wing_r']` (hinges, rotation.z, right is mirrored)
  handles: ['wing_l', 'wing_r']
});
