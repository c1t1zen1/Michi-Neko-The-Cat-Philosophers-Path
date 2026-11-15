import { defineCharacter, registerCharacterPart, characterPart } from '../character.js?v=20261114a';
import { MICHI_EXTRA_PARTS } from '../parts/michi_extras.js?v=20261114a';

for (const p of MICHI_EXTRA_PARTS) if (!characterPart(p.id)) registerCharacterPart(p);

/**
 * Chidori, the Roof Road's guide cat (rooftops/js/game.js `guide`, companion.js).
 * The classic Chidori is the Michi sculpt in a smaller grey-and-white coat:
 * fur 0x8f9095, belly 0xf3f1ec, accent 0x55575e, green eyes, a blue ribbon,
 * stripes 0.55, scaled 0.86. The def keeps every one of those and adds what a
 * modular character has: a dusk eye glint (pale green) and a personality that
 * waits, sits and stretches rather than grooms. Nothing the guide code looks up
 * changes: `guide.group` and the Cat methods (update, onJump, onLand,
 * setProwling, setLookTarget, startIdleAction, endIdleAction, idleAction) are
 * the Cat facade's own.
 */
export const CHIDORI = defineCharacter({
  id: 'roof-chidori',
  build: 'michi',
  palette: { fur: 0x8f9095, belly: 0xf3f1ec, accent: 0x55575e, stripes: 0.55 },
  face: { eyes: 0x9fd0a8, nose: null },
  accessories: [{ slot: 'collar', part: 'kumihimo', color: 0x3a6fa8 }, { slot: 'bell', part: 'suzu' },
    { slot: 'head', part: 'eye-shine', color: 0xb6f0c0 }],
  scale: 0.86,
  personality: {
    notice: 10,
    idle: { weights: { sit: 0.5, stretch: 0.25, groom: 0.15, yawn: 0.1 }, interval: [5, 9] },
    greeting: 'slowblink', startle: 'alert'
  }
});
