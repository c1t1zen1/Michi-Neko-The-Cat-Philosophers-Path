import { defineCharacter, registerCharacterPart, characterPart } from '../character.js?v=20261107a';
import { MICHI_EXTRA_PARTS } from '../parts/michi_extras.js?v=20261107a';

/**
 * The modular Michi: the player cat as swappable parts (lane c2-michi).
 * Same body, coat, face, collar and bell as the classic `MICHI`, plus the
 * dusk `eye-shine` head part (off by day). Used only when the runtime
 * resolves the inventory id `michi` to modular and quality is not `low`
 * (src/player.js); classic builds today's Cat from options, untouched.
 */
for (const p of MICHI_EXTRA_PARTS) if (!characterPart(p.id)) registerCharacterPart(p);

export const MICHI_MODULAR = defineCharacter({
  id: 'michi',
  build: 'michi',
  palette: { fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26, stripes: 1.0 },
  face: { eyes: 0xebb02a, nose: null },
  accessories: [
    { slot: 'collar', part: 'kumihimo', color: 0xd63228 },
    { slot: 'bell', part: 'suzu' },
    { slot: 'head', part: 'eye-shine' }
  ],
  scale: 1,
  personality: null
});

/** Whether the player cat should be the modular one for this runtime. */
export function michiIsModular(assets, quality) {
  return !!assets && quality !== 'low' && assets.setFor('michi') === 'modular';
}
