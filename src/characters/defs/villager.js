import { defineCharacter } from '../character.js?v=20261107a';

/**
 * Shared shape of a villager CharacterDef (guide §10, C3). A villager is a
 * Cat body type (luna / mochi / kuro), a coat, a collar in the cord colour the
 * game has always given it, and a personality. The personality carries the
 * whole old `PERSONALITIES` entry: `idle` is read by the Cat, `notice`,
 * `greeting`, `startle` by src/npc.js, `groom` by behaviour/grooming.js.
 */
export function villagerDef({ id, palette, eyes, ribbon, scale = 1, personality }) {
  return defineCharacter({
    id,
    build: id,
    palette,
    face: { eyes, nose: null },
    accessories: [{ slot: 'collar', part: 'kumihimo', color: ribbon }, { slot: 'bell', part: 'suzu' }],
    scale,
    personality
  });
}
