import { villagerDef } from './villager.js?v=20261107a';

/** Mochi: round and golden, bouncy. Stretches, yawns, bounds up to say hello; short fidgety washes. */
export const MOCHI = villagerDef({
  id: 'mochi',
  palette: { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, stripes: 1.0 },
  eyes: 0xa2ba6e,
  ribbon: 0xc8402a,
  scale: 0.96,
  personality: {
    notice: 11,
    idle: { weights: { stretch: 0.4, yawn: 0.3, groom: 0.15, sit: 0.15 }, interval: [8, 15] },
    shine: 0xc6e87a, // tapetum glint at dusk (behaviour/eyeshine.js)
    greeting: 'playful', startle: 'startled',
    groom: { bout: [3, 5], pause: [40, 80], chance: 0.35 }
  }
});
