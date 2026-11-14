/* dawCAT — sound moments of the Fable kit assets (T3.1/T3.2).
   One row per `env.audio.play(event)` the kit families may call (contract in
   src/kit/audio.js). `template` is the SFX_TEMPLATES id the pack synthesizes
   for it; `audition` is the existing library recipe (media/sfx/<id>.wav) the
   template was matched against; `today` is what the shipped game plays for the
   moment now (null = silent). Pure data + helpers, no DOM. */
import { createPatch } from './patches.js';
import { generateSfxModule } from './export.js';

export const KIT_SOUND_EVENTS = [
  { event: 'garden.shishi.clack', kit: 'shishi', family: 'garden', moment: 'Bamboo tube tips back and knocks the anvil stone', template: 'bamboo-clack', audition: 'bamboo-knock', today: null, hook: 'onClack (instance/layout)' },
  { event: 'garden.chime.ring', kit: 'wind-chime', family: 'garden', moment: 'Clapper strikes the glass bell in a gust (furin)', template: 'furin-glass', audition: 'bell-furin', today: 'AudioManager.startWindChimes (ambient wind chimes, no per-prop hook)', hook: 'env.wind threshold in update()' },
  { event: 'lantern.kindle', kit: 'lanterns (all)', family: 'lanterns', moment: 'A lantern lights as dusk falls (per-lantern onset)', template: 'lantern-kindle', audition: 'fire-lantern', today: null, hook: 'env.lanternOn rising edge' },
  { event: 'shrine.bell.ring', kit: 'offering-bells / shrine bells', family: 'shrine', moment: 'Cat reaches an offering bell; ringBell', template: 'bell', audition: 'bell-suzu', today: 'AudioManager.playCollect + playBell (src/main.js collectible pickup)', hook: 'ringBell()' },
  { event: 'water.stones.flow', kit: 'river stones / weirs', family: 'water', moment: 'Water passes over stones and kame-ishi (looped bed at distance)', template: 'stream-over-stones', audition: 'river-bed', today: 'none per prop (river ambience in AudioManager)', hook: 'proximity in update()' },
  { event: 'water.float.bell', kit: 'float bells', family: 'water', moment: 'A river float bell rocks on the current', template: 'float-bell', audition: 'bell-collar', today: null, hook: 'wave phase peak in update()' },
  { event: 'water.boat.pole', kit: 'boat pole', family: 'water', moment: 'Pole is planted in the bed', template: 'pole-plant', audition: 'water-lap', today: null, hook: 'pole stroke in update()' },
  { event: 'machiya.noren.brush', kit: 'noren', family: 'machiya', moment: 'Cloth parts as the cat passes through', template: 'noren-brush', audition: 'cloth-rustle', today: null, hook: 'cat proximity in update()' },
  { event: 'keepsake.collect', kit: 'keepsakes', family: 'keepsakes', moment: 'A keepsake is picked up', template: 'collect', audition: 'collect-koto', today: 'AudioManager.playCollect', hook: 'game pickup (already played by main.js)' },
  { event: 'nest.settle', kit: 'nest', family: 'nest', moment: 'Cat settles into the nest', template: 'purr', audition: 'cat-purr', today: 'AudioManager.playPurr (rest spots)', hook: 'game rest action (already played)' }
];

export function kitEventSlug(event) { return event.replace(/[^a-z0-9]+/g, '-'); }

/* Patches named by event slug, so playSfx(audio, 'lantern-kindle') works. */
export function kitPatches() {
  return KIT_SOUND_EVENTS.map((e) => createPatch(e.template, { name: e.event }));
}

/* The zero-file pack for the kit events (same route as any dawCAT export). */
export function kitPackModule(opts) { return generateSfxModule(kitPatches(), opts); }

/* Markdown section appended to GAME_AUDIO_CATALOG.md. */
export function kitCatalogMarkdown() {
  let md = '\n## Kit asset sound moments (Fable)\n\nKit files never import `src/audio.js`; they call `env.audio?.play(event, { pos, gain })` (`src/kit/audio.js`). dawCAT maps each event to a synthesized template and exports them through the usual zero-file `sfx-pack.js` (`kitPackModule()` in `src/sfx/kit-events.js`). Events with no shipped sound today are silent until the game installs a sink (see `docs/fable/handoff/t3-audio.md`).\n\n';
  md += '| Event | Kit id | Moment | Today\'s game sound | dawCAT template | Audition |\n|---|---|---|---|---|---|\n';
  for (const e of KIT_SOUND_EVENTS) md += `| \`${e.event}\` | ${e.kit} | ${e.moment} | ${e.today || 'none'} | \`${e.template}\` | ${e.audition} |\n`;
  return md;
}
