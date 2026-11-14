import { villagerDef } from './villager.js?v=20261107a';

/** Kuro: black, long-limbed, aloof. Sits and watches, warms up slowly; a rare, unhurried wash. */
export const KURO = villagerDef({
  id: 'kuro',
  palette: { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, stripes: 0.0 },
  eyes: 0xd8b04a,
  ribbon: 0xc8402a,
  scale: 1.05,
  personality: {
    notice: 7,
    idle: { weights: { sit: 0.65, groom: 0.15, stretch: 0.1, yawn: 0.1 }, interval: [14, 24] },
    shine: 0xdcef86, // tapetum glint at dusk (behaviour/eyeshine.js)
    greeting: 'wary', startle: 'cautious',
    groom: { bout: [4, 7], pause: [50, 100], chance: 0.4 }
  }
});
