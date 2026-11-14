import { villagerDef } from './villager.js?v=20261113a';

/** Luna: silver smoke-grey, slender, dignified and tidy. Grooms and sits, greets with a slow blink. */
export const LUNA = villagerDef({
  id: 'luna',
  palette: { fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, stripes: 0.3 },
  eyes: 0xdec056,   // moonlit amber
  ribbon: 0x2b3d63, // indigo silk
  scale: 1.0,
  personality: {
    notice: 8,
    idle: { weights: { groom: 0.42, sit: 0.4, stretch: 0.1, yawn: 0.08 }, interval: [9, 16] },
    shine: 0xc6e87a, // tapetum glint at dusk (behaviour/eyeshine.js)
    greeting: 'slowblink', startle: 'alert',
    groom: { bout: [6, 10], pause: [20, 40], chance: 0.7 }
  }
});
